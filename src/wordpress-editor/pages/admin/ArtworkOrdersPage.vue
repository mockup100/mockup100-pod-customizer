<template>
  <div class="orders-page" data-testid="admin-artwork-orders-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ localize("Artwork Orders", "作品订单") }}</h1>
        <p class="page-subtitle">{{ pageSubtitle }}</p>
        <span v-if="tenantContext.tenantId" class="header-context">{{ tenantContext.tenantLabel || tenantContext.tenantId }}</span>
        <span v-else-if="authStore.isPlatformAdmin" class="header-context">{{ localize("Platform View · all tenants", "平台视图 · 全部租户") }}</span>
      </div>
    </div>

    <section class="panel-card filters-card">
      <div class="filters-grid">
        <label class="form-field">
          <span>{{ localize("Order Search", "订单搜索") }}</span>
          <input v-model.trim="orderQuery" type="text"  :placeholder="localize('Search order id, artwork, code, or buyer', '搜索订单号、作品、编码或买家')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Purchase Status", "购买状态") }}</span>
          <FilterDropdown v-model="statusFilter" :options="purchaseStatusOptions" />
        </label>
        <label class="form-field">
          <span>{{ localize("Artwork ID", "作品 ID") }}</span>
          <input v-model.trim="artworkIdFilter" type="text"  :placeholder="localize('artwork_...', 'artwork_...')" />
        </label>
      </div>
      <div class="filters-actions">
        <button type="button" class="btn-primary" :disabled="pageLoading" @click="loadOrders">
          {{ pageLoading ? localize("Loading...", "加载中...") : localize("Apply Filters", "应用筛选") }}
        </button>
        <button type="button" class="btn-secondary" @click="resetFilters">{{ localize("Reset", "重置") }}</button>
      </div>
      <p v-if="pageError" class="page-error">{{ pageError }}</p>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">{{ localize("Seller Records", "卖家记录") }}</span>
        <strong>{{ normalizedOrders.length }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Completed", "已完成") }}</span>
        <strong>{{ completedOrders }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Active Grants", "有效授权") }}</span>
        <strong>{{ activeLicenses }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Charged Tokens", "计费令牌") }}</span>
        <strong>{{ grossVolumeLabel }}</strong>
      </div>
    </section>

    <section class="panel-card orders-feed-card">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ localize("Artwork Order Feed", "作品订单列表") }}</h2>
          <p class="panel-copy">{{ localize("Seller purchase records and license grants.", "卖家购买记录与授权发放。") }}</p>
        </div>
        <span class="status-chip neutral">{{ localize(`${normalizedOrders.length} records`, `${normalizedOrders.length} 条记录`) }}</span>
      </div>
      <div v-if="paginatedOrders.length" class="list-stack">
        <div v-for="order in paginatedOrders" :key="order.order_id" class="list-item">
          <div class="item-main">
            <strong>{{ order.artwork_name || order.order_id }}</strong>
            <p>{{ order.order_id }} · {{ order.artwork_code || localize("code n/a", "编码缺失") }}</p>
            <p>{{ order.price_tokens || 0 }} {{ localize("tokens", "令牌") }} · {{ order.commerce_type || localize("n/a", "无") }}</p>
          </div>
          <div class="item-side">
            <span class="status-chip" :class="resolveOrderStatusTone(order.status)">{{ formatOrderStatus(order.status) }}</span>
            <span class="status-chip" :class="resolveLicenseStatusTone(order.license_status)">{{ formatLicenseStatus(order.license_status) }}</span>
            <span>{{ localize("Buyer", "买家") }}: {{ order.buyer_tenant_id || localize("n/a", "无") }}</span>
            <span>{{ localize("Created", "创建时间") }}: {{ order.created_at }}</span>
            <span>{{ localize("Granted", "授权时间") }}: {{ order.granted_at || localize("not granted", "未授权") }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        {{ localize("No matching artwork orders.", "没有匹配的作品订单。") }}
      </div>
      <PaginationBar
        v-if="normalizedOrders.length"
        v-model:current-page="ordersPage"
        :total-pages="orderTotalPages"
        :total-items="normalizedOrders.length"
        :page-size="ORDERS_PAGE_SIZE"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRoute } from "vue-router"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { useArtworkStore } from "../../stores/artworks"
import { readAdminTenantContextWithStorage } from "./adminTenantContext"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"

const authStore = useAuthStore()
const artworkStore = useArtworkStore()
const route = useRoute()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

function localize(en: string, zh: string) {
  return locale.value === "zh" ? zh : en
}

const orderQuery = ref("")
const statusFilter = ref("")
const artworkIdFilter = ref("")
const pageError = ref("")
const pageLoading = ref(false)
const purchaseOrders = ref<Array<Record<string, unknown>>>([])
const ordersPage = ref(1)
const ORDERS_PAGE_SIZE = 12
const purchaseStatusOptions = computed(() => [
  { value: "", label: localize("All Statuses", "全部状态") },
  { value: "completed", label: localize("Completed", "已完成") },
])
const tenantContext = computed(() => readAdminTenantContextWithStorage(route.query))
const scopedTenantId = computed(() => authStore.isPlatformAdmin ? (tenantContext.value.tenantId || authStore.tenant?.tenant_id || "") : (authStore.tenant?.tenant_id || ""))
const isPlatformWideView = computed(() => authStore.isPlatformAdmin && !tenantContext.value.tenantId)

const pageSubtitle = computed(() => (
  isPlatformWideView.value
    ? localize("Review artwork seller purchases across all tenants.", "查看全部租户的作品卖家购买记录。")
    : localize("Review seller-side artwork purchase and license records.", "查看卖家侧作品购买和授权记录。")
))
const normalizedOrders = computed(() => purchaseOrders.value
  .filter((order) => {
    const query = orderQuery.value.trim().toLowerCase()
    if (!query) return true
    return [
      order.purchase_id,
      order.artwork_id,
      order.artwork_code,
      order.artwork_name,
      order.buyer_tenant_id,
    ].some((value) => String(value || "").toLowerCase().includes(query))
  })
  .map((order) => {
  return {
    ...order,
    order_id: String(order.purchase_id || ""),
    resource_type: "artwork",
    artwork_id: String(order.artwork_id || ""),
    artwork_name: String(order.artwork_name || ""),
    artwork_code: String(order.artwork_code || ""),
    commerce_type: String(order.commerce_type || ""),
    buyer_tenant_id: String(order.buyer_tenant_id || ""),
    status: String(order.status || ""),
    license_status: String(order.license_status || ""),
    price_tokens: Number(order.price_tokens || 0),
    created_at: String(order.created_at || ""),
    granted_at: String(order.granted_at || ""),
  }
}))

const completedOrders = computed(() => normalizedOrders.value.filter((item) => item.status === "completed").length)
const activeLicenses = computed(() => normalizedOrders.value.filter((item) => item.license_status === "active").length)
const grossVolumeLabel = computed(() => {
  const total = normalizedOrders.value.reduce((sum, item) => sum + Number(item.price_tokens || 0), 0)
  return localize(`${total} tokens`, `${total} 令牌`)
})
const orderTotalPages = computed(() => resolveTotalPages(normalizedOrders.value.length, ORDERS_PAGE_SIZE))
const paginatedOrders = computed(() => paginateItems(normalizedOrders.value, ordersPage.value, ORDERS_PAGE_SIZE))

watch(() => normalizedOrders.value.length, () => {
  ordersPage.value = clampPage(ordersPage.value, orderTotalPages.value)
})

function formatOrderStatus(value?: string) {
  if (value === "completed") return localize("Completed", "已完成")
  if (value === "pending") return localize("Pending", "待处理")
  if (value === "failed") return localize("Failed", "失败")
  return localize("Status N/A", "状态未知")
}

function resolveOrderStatusTone(value?: string) {
  if (value === "completed") return "completed"
  if (value === "pending") return "pending"
  if (value === "failed") return "failed"
  return "neutral"
}

function formatLicenseStatus(value?: string) {
  if (value === "active") return localize("Active License", "有效授权")
  if (value === "revoked") return localize("Revoked", "已撤销")
  if (value === "expired") return localize("Expired", "已过期")
  return localize("License N/A", "授权未知")
}

function resolveLicenseStatusTone(value?: string) {
  if (value === "active") return "completed"
  if (value === "revoked" || value === "expired") return "failed"
  return "neutral"
}

async function loadOrders() {
  const tenantId = scopedTenantId.value
  pageLoading.value = true
  pageError.value = ""
  try {
    purchaseOrders.value = await artworkStore.listPurchaseRecords({
      tenantId: tenantId || undefined,
      role: "seller",
      limit: 100,
      status: statusFilter.value || undefined,
      artworkId: artworkIdFilter.value || undefined,
    })
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load artwork orders.", "加载作品订单失败。"))
  } finally {
    pageLoading.value = false
  }
}

async function resetFilters() {
  orderQuery.value = ""
  statusFilter.value = ""
  artworkIdFilter.value = ""
  await loadOrders()
}

onMounted(async () => {
  await loadOrders()
})
</script>

<style scoped>
.orders-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.page-title { margin: 0; font-size: 2rem; color: #0f172a; }
.page-subtitle { margin: 0.5rem 0 0; color: #64748b; }
.header-context { display: inline-flex; align-items: center; margin-top: 0.6rem; padding: 0.3rem 0.7rem; border-radius: 999px; background: #eff6ff; color: #1e3a8a; font-size: 0.8rem; font-weight: 600; }
.panel-card, .summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05); }
.filters-card { display: flex; flex-direction: column; gap: 1rem; }
.filters-grid, .summary-grid { display: grid; gap: 1rem; }
.filters-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.form-field { display: flex; flex-direction: column; gap: 0.45rem; color: #475569; }
.form-field :deep(.filter-dropdown) { width: 100%; min-width: 0; }
.form-field input, .form-field select { border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 0.75rem 0.85rem; background: rgba(255,255,255,0.94); }
.unified-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #64748b 50%),
    linear-gradient(135deg, #64748b 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 3px),
    calc(100% - 12px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  min-height: 46px;
  line-height: 1.4;
  color: #0f172a;
  padding-right: 2.6rem;
}
.form-field input:focus, .form-field select:focus { outline: none; border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.28); }
.filters-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.summary-label { display: block; color: #64748b; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.summary-card strong { display: block; margin-top: 0.4rem; font-size: 1.4rem; color: #0f172a; }
.orders-feed-card { min-height: 100%; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid #eef2f7; }
.panel-title { margin: 0; font-size: 1.05rem; color: #0f172a; }
.panel-copy { margin: 0.35rem 0 0; color: #64748b; line-height: 1.5; }
.status-chip { display: inline-flex; align-items: center; justify-content: center; padding: 0.3rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; }
.status-chip.neutral { background: #eef2ff; color: #4338ca; }
.list-stack { display: flex; flex-direction: column; gap: 0.85rem; }
.list-item { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #fff; }
.item-main p, .item-side span { margin: 0.3rem 0 0; color: #64748b; display: block; }
.item-side { text-align: right; }
.page-error { margin: 0; color: #b91c1c; }
.empty-state { color: #94a3b8; font-weight: 600; }
.btn-primary, .btn-secondary { border: 0; border-radius: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; text-decoration: none; font-weight: 700; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.btn-primary { background: #0ea5e9; color: #fff; }
.btn-secondary { background: #f8fafc; color: #1d4ed8; border: 1px solid #cbd5e1; }
.btn-primary:hover, .btn-secondary:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08); }

@media (max-width: 900px) {
  .page-header,
  .list-item { flex-direction: column; }
  .filters-grid,
  .summary-grid { grid-template-columns: 1fr; }
  .item-side { text-align: left; }
}
</style>
