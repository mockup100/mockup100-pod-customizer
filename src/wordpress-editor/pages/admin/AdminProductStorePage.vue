<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"

const router = useRouter()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()

const isPlatformAdmin = computed(() => authStore.isPlatformAdmin)

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

async function openErpProducts() {
  await router.push("/erp/products")
}

async function openLegacyStorefront() {
  await router.push("/admin/storefront")
}

const reviewStages = computed(() => [
  {
    key: "draft",
    label: localize("Draft", "草稿"),
    description: localize("Fill product store identity and qualification information.", "填写产品店铺基础信息与资质说明。"),
  },
  {
    key: "pending",
    label: localize("Pending Review", "等待审核"),
    description: localize("Platform admins review the product store using a creative-space-like workflow.", "平台管理员按参考创作空间的流程审核产品店铺。"),
  },
  {
    key: "approved",
    label: localize("Approved", "已通过"),
    description: localize("After approval, suppliers can continue into ERP product operations.", "通过后再进入 ERP 继续商品上传与管理。"),
  },
])
</script>

<template>
  <div class="product-store-page">
    <section class="product-store-page__hero">
      <div>
        <span class="product-store-page__eyebrow">{{ localize("Product Store", "产品店铺") }}</span>
        <h1>
          {{ isPlatformAdmin
            ? localize("Product store review workspace", "产品店铺审核工作台")
            : localize("Open and manage your product store", "开通并管理你的产品店铺") }}
        </h1>
        <p>
          {{ localize(
            "Product store and creative space are different business concepts. The product store only reuses the creative space opening and review rhythm.",
            "产品店铺与创作空间是两个不同概念。产品店铺只参考创作空间的开通和审核节奏。",
          ) }}
        </p>
      </div>
      <div class="product-store-page__actions">
        <button type="button" class="product-store-page__primary" @click="openErpProducts">
          {{ localize("Open ERP Products", "打开 ERP 商品") }}
        </button>
        <button type="button" class="product-store-page__secondary" @click="openLegacyStorefront">
          {{ localize("Open Creative Space Module", "打开创作空间模块") }}
        </button>
      </div>
    </section>

    <section class="product-store-page__grid">
      <article class="product-store-page__card">
        <h2>{{ isPlatformAdmin ? localize("Review Boundary", "审核边界") : localize("Application Boundary", "申请边界") }}</h2>
        <ul>
          <li>{{ localize("Product store review is separate from product review.", "产品店铺审核与产品审核是两条独立链路。") }}</li>
          <li>{{ localize("Product store review references creative space.", "产品店铺审核参考创作空间。") }}</li>
          <li>{{ localize("Product review references template.", "产品审核参考 template。") }}</li>
        </ul>
      </article>

      <article class="product-store-page__card">
        <h2>{{ localize("Current Flow", "当前流程") }}</h2>
        <div class="product-store-page__stages">
          <div v-for="item in reviewStages" :key="item.key" class="product-store-page__stage">
            <strong>{{ item.label }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>
    </section>

    <section class="product-store-page__card product-store-page__card--full">
      <h2>{{ isPlatformAdmin ? localize("Admin Notes", "管理员说明") : localize("Supplier Notes", "供应商说明") }}</h2>
      <p v-if="isPlatformAdmin">
        {{ localize(
          "This page is the separate review entrance for product stores. It should evolve independently from creative space review, even if the status machine follows the same structure.",
          "这个页面是独立的产品店铺审核入口。即使状态机参考创作空间，它也应与创作空间审核页面独立演进。",
        ) }}
      </p>
      <p v-else>
        {{ localize(
          "Open the product store first. Only after the product store is approved should you continue with ERP product upload and template-aligned product review.",
          "先完成产品店铺开通。只有产品店铺审核通过后，才继续进行 ERP 商品上传和按 template 对齐的商品审核。",
        ) }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.product-store-page {
  display: grid;
  gap: 20px;
}

.product-store-page__hero,
.product-store-page__card {
  border: 1px solid #eaecf0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);
}

.product-store-page__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
}

.product-store-page__eyebrow {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: #e8eefc;
  color: #375dfb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.product-store-page__hero h1 {
  margin: 16px 0 12px;
  color: #101828;
  font-size: 32px;
}

.product-store-page__hero p,
.product-store-page__card p,
.product-store-page__card li {
  margin: 0;
  color: #475467;
  line-height: 1.7;
}

.product-store-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.product-store-page__primary,
.product-store-page__secondary {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}

.product-store-page__primary {
  border: none;
  background: #111827;
  color: #fff;
}

.product-store-page__secondary {
  border: 1px solid #d0d5dd;
  background: #fff;
  color: #101828;
}

.product-store-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.product-store-page__card {
  padding: 24px;
}

.product-store-page__card h2 {
  margin: 0 0 12px;
  color: #101828;
}

.product-store-page__card ul {
  margin: 0;
  padding-left: 18px;
}

.product-store-page__stages {
  display: grid;
  gap: 12px;
}

.product-store-page__stage {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
}

.product-store-page__stage strong {
  display: block;
  margin-bottom: 6px;
  color: #111827;
}

.product-store-page__card--full {
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .product-store-page__hero,
  .product-store-page__grid {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
