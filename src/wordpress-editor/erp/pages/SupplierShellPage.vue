<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, RouterView, useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import { useAuthStore } from "../../stores/auth"
import {
  buildSupplierMenu,
  resolveDefaultSupplierCapability,
} from "../supplier"

const authStore = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const { role, supplier } = storeToRefs(authStore)

const supplierSnapshot = computed(() => supplier.value || resolveDefaultSupplierCapability(role.value))
const supplierMenu = computed(() => buildSupplierMenu(supplierSnapshot.value).map((item) => ({
  ...item,
  label: t(`supplierWorkspace.shell.menu.${item.key}`),
})))

const productMenuItem = computed(() => supplierMenu.value.find((item) => item.key === "product-management") || null)
const supplierMenuItem = computed(() => supplierMenu.value.find((item) => item.key === "supplier-management") || null)
const isProductMenuActive = computed(() => route.path.startsWith("/erp/supplier/product"))
const productMenuOpen = ref(true)

watch(isProductMenuActive, (active) => {
  if (active) {
    productMenuOpen.value = true
  }
}, { immediate: true })

const productSubMenu = computed(() => ([
  {
    key: "product-add",
    to: "/erp/supplier/product/add",
    label: t("supplierWorkspace.shell.menu.product-add"),
    disabled: productMenuItem.value?.disabled ?? true,
  },
  {
    key: "product-list",
    to: "/erp/supplier/product/list",
    label: t("supplierWorkspace.shell.menu.product-list"),
    disabled: productMenuItem.value?.disabled ?? true,
  },
]))

function isActive(itemKey: string, path: string) {
  if (itemKey === "supplier-management") {
    return route.path === "/erp/supplier" || route.path === "/erp/supplier/company" || route.path.startsWith("/erp/supplier/audit") || route.path === "/erp/supplier/draft" || route.path === "/erp/supplier/submitted"
  }
  if (itemKey === "product-management") {
    return route.path.startsWith("/erp/supplier/product")
  }
  if (itemKey === "product-add") {
    return route.path === "/erp/supplier/product/add"
  }
  if (itemKey === "product-list") {
    return route.path === "/erp/supplier/product/list"
  }
  return route.path === path
}
</script>

<template>
  <section class="supplier-shell">
    <div class="supplier-shell__layout">
      <aside class="supplier-shell__sidebar">
        <nav class="supplier-shell__menu">
          <template v-if="supplierMenuItem">
            <RouterLink
              v-if="!supplierMenuItem.disabled"
              :to="supplierMenuItem.to"
              class="supplier-shell__menu-item"
              :class="{ 'supplier-shell__menu-item--active': isActive(supplierMenuItem.key, supplierMenuItem.to) }"
            >
              {{ supplierMenuItem.label }}
            </RouterLink>
            <span v-else class="supplier-shell__menu-item supplier-shell__menu-item--disabled">
              {{ supplierMenuItem.label }}
            </span>
          </template>

          <div v-if="productMenuItem" class="supplier-shell__submenu">
            <button
              type="button"
              class="supplier-shell__menu-item supplier-shell__submenu-toggle"
              :class="{
                'supplier-shell__menu-item--active': isProductMenuActive,
                'supplier-shell__menu-item--disabled': productMenuItem.disabled,
              }"
              :disabled="productMenuItem.disabled"
              @click="productMenuOpen = !productMenuOpen"
            >
              <span>{{ productMenuItem.label }}</span>
              <span class="supplier-shell__submenu-caret" :class="{ 'supplier-shell__submenu-caret--open': productMenuOpen }" aria-hidden="true">▾</span>
            </button>
            <div v-if="productMenuOpen" class="supplier-shell__submenu-items">
              <template v-for="child in productSubMenu" :key="child.key">
                <RouterLink
                  v-if="!child.disabled"
                  :to="child.to"
                  class="supplier-shell__menu-item supplier-shell__submenu-item"
                  :class="{ 'supplier-shell__menu-item--active': isActive(child.key, child.to) }"
                >
                  {{ child.label }}
                </RouterLink>
                <span
                  v-else
                  class="supplier-shell__menu-item supplier-shell__submenu-item supplier-shell__menu-item--disabled"
                >
                  {{ child.label }}
                </span>
              </template>
            </div>
          </div>
        </nav>
      </aside>

      <div class="supplier-shell__content">
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style scoped>
.supplier-shell {
  min-height: 100vh;
  padding: 10px 20px 56px;
  background: #f5f7fb;
}

.supplier-shell__layout {
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.supplier-shell__sidebar {
  background: #efefef;
  border-right: 1px solid #d7d7d7;
  min-height: calc(100vh - 130px);
}

.supplier-shell__content {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
  padding: 18px;
  min-height: calc(100vh - 148px);
  min-width: 0;
}

.supplier-shell__menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
}

.supplier-shell__menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 31px;
  padding: 0 12px;
  border-radius: 0;
  text-decoration: none;
  font-weight: 600;
  font-size: 12px;
  color: #5d5d5d;
  border: none;
  background: transparent;
  transition: all 0.15s ease;
}

.supplier-shell__menu-item:hover {
  background: #f4f4f4;
}

.supplier-shell__menu-item--active {
  color: #ffffff;
  background: #1d4ed8;
  font-weight: 700;
  box-shadow: inset 4px 0 0 #93c5fd;
}

.supplier-shell__menu-item--disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.supplier-shell__menu-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.supplier-shell__submenu-item.supplier-shell__menu-item--active {
  background: #dbeafe;
  color: #1d4ed8;
  box-shadow: inset 4px 0 0 #1d4ed8;
}

.supplier-shell__submenu-item:hover {
  background: #e5e7eb;
}

.supplier-shell__submenu {
  display: grid;
}

.supplier-shell__submenu-toggle {
  width: 100%;
  text-align: left;
}

.supplier-shell__submenu-caret {
  font-size: 11px;
  color: inherit;
  transition: transform 0.15s ease;
}

.supplier-shell__submenu-caret--open {
  transform: rotate(180deg);
}

.supplier-shell__submenu-items {
  display: grid;
  gap: 2px;
  padding: 2px 0 4px;
}

.supplier-shell__submenu-item {
  padding-left: 28px;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .supplier-shell__layout {
    grid-template-columns: 1fr;
  }
}
</style>
