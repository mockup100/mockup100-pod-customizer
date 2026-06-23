<template>
  <div class="orders-page" data-testid="admin-orders-management-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ localize("Orders", "订单") }}</h1>
        <p class="page-subtitle">{{ localize("Track template purchases, offline recharges, and other token-related orders.", "查看模板购买、线下充值及其它令牌相关订单。") }}</p>
      </div>
    </div>

    <section class="panel-card filters-card">
      <div class="filters-grid">
        <label class="form-field">
          <span>{{ localize("Order Search", "订单搜索") }}</span>
          <input v-model.trim="orderQuery" type="text" :placeholder="localize('Search by order id', '按订单 ID 搜索')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Order Type", "订单类型") }}</span>
          <FilterDropdown v-model="resourceTypeFilter" :options="resourceTypeOptions" />
        </label>
        <label class="form-field">
          <span>{{ localize("Payment Status", "支付状态") }}</span>
          <FilterDropdown v-model="statusFilter" :options="paymentStatusOptions" />
        </label>
        <label class="form-field">
          <span>{{ localize("Item Code", "商品编码") }}</span>
          <input v-model.trim="itemCodeFilter" type="text" :placeholder="localize('TPL-... / TOKEN-...', 'TPL-... / TOKEN-...')" />
        </label>
      </div>
      <div class="filters-actions">
        <button type="button" class="btn-primary" :disabled="platformStore.loading" @click="loadOrders">
          {{ platformStore.loading ? localize("Loading...", "加载中...") : localize("Apply Filters", "应用筛选") }}
        </button>
        <button type="button" class="btn-secondary" @click="resetFilters">{{ localize("Reset", "重置") }}</button>
      </div>
      <p v-if="pageError" class="page-error">{{ pageError }}</p>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">{{ localize("Orders", "订单") }}</span>
        <strong>{{ normalizedOrders.length }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Paid", "已支付") }}</span>
        <strong>{{ paidOrders }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Exceptions", "异常") }}</span>
        <strong>{{ exceptionOrders }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Gross Volume", "总交易额") }}</span>
        <strong>{{ grossVolumeLabel }}</strong>
      </div>
    </section>

    <section class="panel-card orders-feed-card">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ localize("Order Feed", "订单列表") }}</h2>
          <p class="panel-copy">{{ localize("Filtered orders with catalog and settlement context.", "筛选后的订单记录，包含目录和结算上下文。") }}</p>
        </div>
        <span class="status-chip neutral">{{ normalizedOrders.length }} records</span>
      </div>
      <div v-if="paginatedOrders.length" class="list-stack">
        <div v-for="order in paginatedOrders" :key="order.order_id" class="list-item">
          <div class="item-main">
            <div class="item-title-row">
              <strong>{{ order.item_name || order.resource_name || order.order_id }}</strong>
              <span class="status-chip" :class="orderTypeChipClass(order.resource_type)">{{ orderTypeLabel(order.resource_type) }}</span>
            </div>
            <p>{{ order.order_id }} · {{ order.item_type || localize("n/a", "无") }} · {{ order.item_code || localize("n/a", "无") }}</p>
            <p>{{ order.resource_name || localize("Item n/a", "商品未知") }} · {{ order.account_email || localize("unknown user", "未知用户") }}</p>
            <p>${{ (order.amount_cents / 100).toFixed(2) }} · {{ order.payment_method }} · {{ order.payment_status }}</p>
          </div>
          <div class="item-side">
            <span>{{ localize("External", "外部单号") }}: {{ order.external_order_id || localize("n/a", "无") }}</span>
            <span>{{ localize("Created", "创建时间") }}: {{ order.created_at }}</span>
            <span>{{ localize("Paid", "支付时间") }}: {{ order.paid_at || localize("not settled", "未结算") }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ localize("No matching orders.", "没有匹配的订单。") }}</div>
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
import { useUiLocaleStore } from "../../stores/uiLocale"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore, type BillingOrderItem } from "../../stores/platform"
import { resolveAdminScopedTenantId } from "./adminTenantContext"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiLocaleStore = useUiLocaleStore()
const route = useRoute()
const { billingOrders } = storeToRefs(platformStore)
const { locale } = storeToRefs(uiLocaleStore)

function localize(en: string, zh: string) {
  return locale.value === "zh" ? zh : en
}

const orderQuery = ref("")
const statusFilter = ref("")
const itemCodeFilter = ref("")
const resourceTypeFilter = ref("")
const pageError = ref("")
const ordersPage = ref(1)
const ORDERS_PAGE_SIZE = 12
const paymentStatusOptions = computed(() => [
  { value: "", label: localize("All Statuses", "全部状态") },
  { value: "pending_payment", label: localize("Pending Payment", "待支付") },
  { value: "payment_created", label: localize("Payment Created", "已创建支付") },
  { value: "paid", label: localize("Paid", "已支付") },
  { value: "failed", label: localize("Failed", "失败") },
  { value: "cancelled", label: localize("Cancelled", "已取消") },
  { value: "manual_review", label: localize("Manual Review", "人工审核") },
])
const resourceTypeOptions = computed(() => [
  { value: "", label: localize("All Types", "全部类型") },
  { value: "template", label: localize("Template", "模板") },
  { value: "token", label: localize("Token Pack", "令牌包") },
  { value: "wp_pro", label: localize("WP Pro", "WP Pro") },
  { value: "grading", label: localize("Grading", "Grading") },
  { value: "offline", label: localize("Offline Recharge", "线下充值") },
])

function orderTypeLabel(value?: string) {
  const key = String(value || "").toLowerCase()
  switch (key) {
    case "template": return localize("Template", "模板")
    case "token": return localize("Token", "令牌")
    case "wp_pro": return localize("WP Pro", "WP Pro")
    case "grading":
    case "grading_standard":
    case "grading_enterprise":
      return localize("Grading", "Grading")
    case "offline":
    case "manual_offline":
    case "bank_transfer":
      return localize("Offline", "线下")
    default: return key || localize("Other", "其他")
  }
}
function orderTypeChipClass(value?: string) {
  const key = String(value || "").toLowerCase()
  if (key === "template") return "template"
  if (key === "offline" || key === "manual_offline" || key === "bank_transfer") return "offline"
  return "neutral"
}

const normalizedOrders = computed(() => (billingOrders.value as BillingOrderItem[])
  .map((order) => {
    const meta = (order.meta || {}) as Record<string, unknown>
    const sourceType = String(meta.source_type || (order as Record<string, unknown>).source_type || "").toLowerCase()
    const rawResourceType = String(meta.resource_type || order.resource_type || "").toLowerCase()
    const resolvedType = sourceType.includes("offline")
      ? "offline"
      : (rawResourceType || String(order.item_type || "").toLowerCase())
    return {
      ...order,
      resource_type: resolvedType,
      resource_id: String(meta.resource_id || order.item_code || ""),
      resource_name: String(meta.resource_name || order.item_name || ""),
    }
  })
  .filter((order) => {
    if (!resourceTypeFilter.value) return true
    return order.resource_type === resourceTypeFilter.value
  }))
const paidOrders = computed(() => normalizedOrders.value.filter((item) => item.payment_status === "paid").length)
const exceptionOrders = computed(() =>
  normalizedOrders.value.filter((item) => ["failed", "cancelled", "manual_review"].includes(item.payment_status)).length,
)
const grossVolumeLabel = computed(() => {
  const total = normalizedOrders.value.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0)
  return `$${(total / 100).toFixed(2)}`
})
const orderTotalPages = computed(() => resolveTotalPages(normalizedOrders.value.length, ORDERS_PAGE_SIZE))
const paginatedOrders = computed(() => paginateItems(normalizedOrders.value, ordersPage.value, ORDERS_PAGE_SIZE))
const scopedTenantId = computed(() => resolveAdminScopedTenantId({
  isPlatformAdmin: authStore.isPlatformAdmin,
  query: route.query,
  fallbackTenantId: authStore.tenant?.tenant_id,
}))

watch(() => normalizedOrders.value.length, () => {
  ordersPage.value = clampPage(ordersPage.value, orderTotalPages.value)
})

async function loadOrders() {
  const tenantId = scopedTenantId.value
  pageError.value = ""
  try {
    await platformStore.loadBillingOrders({
      auth: authStore.authHeaders,
      tenantId: tenantId || undefined,
      limit: 100,
      status: statusFilter.value || undefined,
      orderQuery: orderQuery.value || undefined,
      itemCode: itemCodeFilter.value || undefined,
      resourceType: resourceTypeFilter.value && resourceTypeFilter.value !== "offline" ? resourceTypeFilter.value : undefined,
    })
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load orders.", "加载订单失败。"))
  }
}

async function resetFilters() {
  orderQuery.value = ""
  statusFilter.value = ""
  itemCodeFilter.value = ""
  resourceTypeFilter.value = ""
  await loadOrders()
}

onMounted(async () => {
  await loadOrders()
})

watch(resourceTypeFilter, async () => {
  await loadOrders()
})

watch(scopedTenantId, async () => {
  await loadOrders()
})
</script>

<style scoped>
.orders-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.page-title { margin: 0; font-size: 2rem; color: #0f172a; }
.page-subtitle { margin: 0.5rem 0 0; color: #64748b; }
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
.item-title-row { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
.orders-feed-card { min-height: 100%; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid #eef2f7; }
.panel-title { margin: 0; font-size: 1.05rem; color: #0f172a; }
.panel-copy { margin: 0.35rem 0 0; color: #64748b; line-height: 1.5; }
.status-chip { display: inline-flex; align-items: center; justify-content: center; padding: 0.3rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; text-transform: lowercase; }
.status-chip.neutral { background: #eef2ff; color: #4338ca; text-transform: none; }
.status-chip.template { background: #dbeafe; color: #1d4ed8; text-transform: none; }
.status-chip.offline { background: #fef3c7; color: #92400e; text-transform: none; }
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
.btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

@media (max-width: 900px) {
  .page-header,
  .list-item { flex-direction: column; }
  .filters-grid,
  .summary-grid { grid-template-columns: 1fr; }
  .item-side { text-align: left; }
}
</style>
