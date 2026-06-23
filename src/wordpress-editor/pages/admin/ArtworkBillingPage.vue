<template>
  <div class="billing-page" data-testid="admin-artwork-billing-page">
    <div class="page-header">
      <div class="header-copy">
        <h1 class="page-title"><span class="page-emoji" aria-hidden="true">🎨</span> {{ localize("Artwork Billing", "作品计费") }}</h1>
        <p class="page-subtitle">{{ pageSubtitle }}</p>
        <p class="page-hint">{{ localize("Questions about artwork commissions or payouts? Contact csl@mockup100.com — Zhuhai Baifeng Network Technology Co., Ltd.", "对作品佣金或提现有疑问？请联系 csl@mockup100.com — Zhuhai Baifeng Network Technology Co., Ltd.") }}</p>
        <span v-if="tenantContext.tenantId" class="header-context">{{ tenantContext.tenantLabel || tenantContext.tenantId }}</span>
        <span v-else-if="authStore.isPlatformAdmin" class="header-context">{{ localize("Platform View · all tenants", "平台视图 · 全部租户") }}</span>
        <p v-if="pageError" class="page-error">{{ pageError }}</p>
      </div>
      <nav class="related-views" aria-label="Related views">
        <span class="related-views-label">{{ localize("Related views", "相关页面") }}</span>
        <RouterLink to="/admin/billing">{{ localize("Tenant Billing", "租户账单") }}</RouterLink>
        <RouterLink to="/admin/artwork-orders">{{ localize("Artwork Orders", "作品订单") }}</RouterLink>
      </nav>
    </div>

    <section v-if="financeLoading" class="panel-card page-state-card">
      <h2 class="panel-title"><span aria-hidden="true">⏳</span> {{ localize("Loading artwork billing…", "正在加载作品计费…") }}</h2>
      <p class="section-copy">{{ localize("Refreshing artwork commissions, orders, and payouts.", "正在刷新作品佣金、订单和提现数据。") }}</p>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">{{ localize("Artwork Earnings", "作品收益") }}</span>
        <strong>{{ formatTokenAmount(settledArtworkEarnings) }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Total Charged", "总计收费") }}</span>
        <strong>{{ formatTokenAmount(totalChargedTokens) }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Current Period", "当前周期") }}</span>
        <strong>{{ formatTokenAmount(currentPeriodArtworkEarnings) }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Pending / Reversed", "待处理 / 已冲销") }}</span>
        <strong>{{ formatTokenAmount(pendingCommissionTokens) }} / {{ formatTokenAmount(reversedCommissionTokens) }}</strong>
      </div>
    </section>

    <div class="billing-grid">
      <section class="panel-card">
        <div class="section-heading">
          <div>
            <h2 class="panel-title">{{ localize("Artwork Commission Records", "作品佣金记录") }}</h2>
            <p class="section-copy">{{ localize("Seller-side artwork commission entries.", "卖家侧作品佣金记录。") }}</p>
          </div>
          <div class="section-actions">
            <span class="status-chip neutral">{{ filteredCommissionRecords.length }} {{ localize("records", "条记录") }}</span>
            <button class="btn-secondary" :disabled="financeLoading" @click="loadBillingSafely">
              {{ financeLoading ? localize("Refreshing...", "刷新中...") : localize("Retry", "重试") }}
            </button>
          </div>
        </div>
        <div class="filters-grid compact-filters">
          <label class="form-field">
            <span>{{ localize("Commission Status", "佣金状态") }}</span>
            <FilterDropdown v-model="commissionStatusFilter" :options="commissionStatusOptions" />
          </label>
          <div class="filter-summary compact-summary">
            {{ localize("Showing", "显示") }} {{ filteredCommissionRecords.length }} {{ localize("artwork records", "条作品记录") }} ·
            {{ commissionStatusFilter === "all" ? localize("all statuses", "全部状态") : commissionStatusFilter }}
          </div>
        </div>
        <div v-if="paginatedCommissionRecords.length" class="record-list">
          <div v-for="record in paginatedCommissionRecords" :key="record.record_id" class="record-item">
            <div class="record-main">
              <strong>{{ record.artwork_name || record.resource_name || record.artwork_code || record.artwork_id || localize("Artwork", "作品") }}</strong>
              <div class="record-meta">
                <span>{{ record.artwork_code || record.artwork_id || record.resource_id || localize("Artwork ID n/a", "作品 ID 暂无") }}</span>
                <span>{{ record.period_key }}</span>
                <span>{{ record.created_at }}</span>
              </div>
            </div>
            <div class="record-side">
              <strong>{{ formatTokenAmount(record.commission_tokens) }} {{ localize("tokens", "tokens") }}</strong>
              <span>{{ formatTokenAmount(record.charged_tokens) }} {{ localize("charged", "已收费") }}</span>
              <span class="status-chip" :class="String(record.status || '').toLowerCase()">{{ record.status }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state"><span class="empty-emoji" aria-hidden="true">📭</span> {{ localize("No artwork commission records yet.", "暂无作品佣金记录。") }}</div>
        <PaginationBar
          v-if="filteredCommissionRecords.length"
          v-model:current-page="commissionPage"
          :total-pages="commissionTotalPages"
          :total-items="filteredCommissionRecords.length"
          :page-size="COMMISSION_PAGE_SIZE"
        />
      </section>

      <section class="panel-card orders-link-section">
        <div class="section-heading">
          <div>
            <h2 class="panel-title">{{ localize("Artwork Orders", "作品订单") }}</h2>
            <p class="section-copy">{{ artworkOrdersCopy }}</p>
          </div>
          <span class="status-chip neutral">{{ filteredArtworkOrders.length }} {{ localize("orders", "笔订单") }}</span>
        </div>
        <div class="orders-link-row">
          <strong>{{ paidArtworkOrders }}</strong><span>{{ localize("paid", "已支付") }}</span>
          <span>·</span>
          <strong>{{ artworkGrossVolume }}</strong><span>{{ localize("gross tokens", "计费总额") }}</span>
          <RouterLink class="orders-link" to="/admin/artwork-orders">{{ localize("View artwork orders →", "查看作品订单 →") }}</RouterLink>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-heading">
          <div>
            <h2 class="panel-title">{{ localize("Payout Readiness", "提现准备情况") }}</h2>
            <p class="section-copy">{{ payoutReadinessCopy }}</p>
          </div>
          <div class="section-actions">
            <span class="status-chip neutral">{{ recentPayoutRequests.length }} {{ localize("requests", "条申请") }}</span>
            <button class="btn-secondary" :disabled="financeLoading" @click="loadBillingSafely">
              {{ financeLoading ? localize("Refreshing...", "刷新中...") : localize("Retry", "重试") }}
            </button>
          </div>
        </div>
        <div class="summary-inline">
          <div class="summary-chip">
            <span>{{ localize("Available", "可提现") }}</span>
            <strong>{{ formatUsd(withdrawableUsd) }}</strong>
          </div>
          <div class="summary-chip">
            <span>{{ localize("Closed Cycles", "已关闭周期") }}</span>
            <strong>{{ closedCycleCount }}</strong>
          </div>
          <div class="summary-chip">
            <span>{{ localize("Pending Requests", "待处理申请") }}</span>
            <strong>{{ pendingPayoutRequestCount }}</strong>
          </div>
        </div>
        <div v-if="paginatedPayoutRequests.length" class="record-list">
          <div v-for="request in paginatedPayoutRequests" :key="request.request_id" class="record-item">
            <div class="record-main">
              <strong>{{ request.cycle?.period_key || request.cycle_id || localize("Cycle n/a", "周期暂无") }}</strong>
              <p>{{ request.paypal_receiver || localize("PayPal n/a", "PayPal 暂无") }}</p>
              <p>{{ request.status }} · {{ request.created_at || localize("created_at n/a", "创建时间暂无") }}</p>
            </div>
            <div class="record-side">
              <strong>{{ formatUsd(request.gross_amount_usd) }}</strong>
              <span>{{ formatUsd(request.net_amount_usd) }} {{ localize("net", "净额") }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state"><span class="empty-emoji" aria-hidden="true">📭</span> {{ emptyPayoutStateCopy }}</div>
        <PaginationBar
          v-if="recentPayoutRequests.length"
          v-model:current-page="payoutPage"
          :total-pages="payoutTotalPages"
          :total-items="recentPayoutRequests.length"
          :page-size="PAYOUT_PAGE_SIZE"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { storeToRefs } from "pinia"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { usePlatformStore } from "../../stores/platform"
import { useArtworkStore } from "../../stores/artworks"
import { readAdminTenantContextWithStorage } from "./adminTenantContext"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"

const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const platformStore = usePlatformStore()
const artworkStore = useArtworkStore()
const route = useRoute()
const { creatorEarnings, commissionRecords, creatorPayoutCycles, creatorPayoutRequests } = storeToRefs(platformStore)

const financeLoading = ref(false)
const pageError = ref("")
const artworkPurchases = ref<Array<Record<string, unknown>>>([])
const commissionStatusFilter = ref("all")
const orderStatusFilter = ref("all")
const commissionPage = ref(1)
const ordersPage = ref(1)
const payoutPage = ref(1)
const COMMISSION_PAGE_SIZE = 6
const ORDER_PAGE_SIZE = 6
const PAYOUT_PAGE_SIZE = 6

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}
const commissionStatusOptions = computed(() => ([
  { value: "all", label: localize("All Statuses", "全部状态") },
  { value: "settled", label: localize("Settled", "已结算") },
  { value: "pending", label: localize("Pending", "待处理") },
  { value: "reversed", label: localize("Reversed", "已冲销") },
]))
const purchaseStatusOptions = computed(() => ([
  { value: "all", label: localize("All Statuses", "全部状态") },
  { value: "completed", label: localize("Completed", "已完成") },
  { value: "pending", label: localize("Pending", "待处理") },
  { value: "failed", label: localize("Failed", "失败") },
]))
const tenantContext = computed(() => readAdminTenantContextWithStorage(route.query))
const scopedTenantId = computed(() => authStore.isPlatformAdmin ? (tenantContext.value.tenantId || authStore.tenant?.tenant_id || "") : (authStore.tenant?.tenant_id || ""))
const isPlatformWideView = computed(() => authStore.isPlatformAdmin && !tenantContext.value.tenantId)

const pageSubtitle = computed(() => (
  isPlatformWideView.value
    ? localize("Artwork-only seller commissions, orders, and payouts across all tenants. Template billing lives in Tenant Billing.", "全部租户的作品卖家佣金、订单和提现。模板账单请前往「租户账单」。")
    : localize("Artwork-only seller commissions, orders, and payouts. Template billing lives in Tenant Billing.", "作品卖家佣金、订单和提现。模板账单请前往「租户账单」。")
))
const artworkOrdersCopy = computed(() => (
  isPlatformWideView.value
    ? localize("Artwork seller purchase records across all tenants.", "查看全部租户的作品卖家购买记录。")
    : localize("Artwork seller purchase records for this tenant.", "查看当前租户的作品卖家购买记录。")
))
const payoutReadinessCopy = computed(() => (
  isPlatformWideView.value
    ? localize("Closed payout cycles and recent payout requests in the current seller scope.", "当前卖家范围内的已关闭结算周期和最近提现申请。")
    : localize("Closed payout cycles and recent payout requests tied to seller earnings.", "与卖家收益关联的已关闭结算周期和最近提现申请。")
))
const recentCommissionRecords = computed(() =>
  commissionRecords.value.filter((item) => String(item.resource_type || "").toLowerCase() === "artwork"),
)
const currentPeriodKey = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
})
const settledArtworkEarnings = computed(() => {
  const fromBackend = Number(creatorEarnings.value?.artwork_commission_tokens ?? Number.NaN)
  if (Number.isFinite(fromBackend)) return fromBackend
  return recentCommissionRecords.value
    .filter((item) => String(item.status || "").toLowerCase() === "settled")
    .reduce((sum, item) => sum + Number(item.commission_tokens || 0), 0)
})
const settledArtworkRecordCount = computed(() =>
  recentCommissionRecords.value.filter((item) => String(item.status || "").toLowerCase() === "settled").length,
)
const totalChargedTokens = computed(() =>
  recentCommissionRecords.value.reduce((sum, item) => sum + Number(item.charged_tokens || 0), 0),
)
const currentPeriodArtworkEarnings = computed(() =>
  recentCommissionRecords.value
    .filter((item) =>
      String(item.status || "").toLowerCase() === "settled"
      && String(item.period_key || "") === currentPeriodKey.value,
    )
    .reduce((sum, item) => sum + Number(item.commission_tokens || 0), 0),
)
const pendingCommissionTokens = computed(() =>
  recentCommissionRecords.value
    .filter((item) => String(item.status || "").toLowerCase() === "pending")
    .reduce((sum, item) => sum + Number(item.commission_tokens || 0), 0),
)
const reversedCommissionTokens = computed(() =>
  recentCommissionRecords.value
    .filter((item) => String(item.status || "").toLowerCase() === "reversed")
    .reduce((sum, item) => sum + Number(item.commission_tokens || 0), 0),
)
const filteredCommissionRecords = computed(() => {
  if (commissionStatusFilter.value === "all") return recentCommissionRecords.value
  return recentCommissionRecords.value.filter((item) => String(item.status || "").toLowerCase() === commissionStatusFilter.value)
})
const artworkOrders = computed(() => artworkPurchases.value.map((item) => ({
  purchase_id: String(item.purchase_id || ""),
  artwork_id: String(item.artwork_id || ""),
  artwork_name: String(item.artwork_name || ""),
  commerce_type: String(item.commerce_type || ""),
  status: String(item.status || ""),
  license_status: String(item.license_status || ""),
  price_tokens: Number(item.price_tokens || 0),
  created_at: String(item.created_at || ""),
  granted_at: String(item.granted_at || ""),
})))
const filteredArtworkOrders = computed(() => {
  if (orderStatusFilter.value === "all") return artworkOrders.value
  return artworkOrders.value.filter((item) => String(item.status || "").toLowerCase() === orderStatusFilter.value)
})
const paidArtworkOrders = computed(() => filteredArtworkOrders.value.filter((item) => item.status === "completed").length)
const artworkGrossVolume = computed(() => {
  const total = filteredArtworkOrders.value.reduce((sum, item) => sum + Number(item.price_tokens || 0), 0)
  return `${total} ${localize("tokens", "tokens")}`
})
const closedCycleCount = computed(() => creatorPayoutCycles.value
  .filter((item) => ["closed", "partially_paid"].includes(String(item.status || "").toLowerCase()) && Number(item.available_amount_usd || 0) > 0)
  .length)
const withdrawableUsd = computed(() => creatorPayoutCycles.value
  .filter((item) => ["closed", "partially_paid"].includes(String(item.status || "").toLowerCase()))
  .reduce((sum, item) => sum + Number(item.available_amount_usd || 0), 0))
const recentPayoutRequests = computed(() => creatorPayoutRequests.value)
const pendingPayoutRequestCount = computed(() =>
  creatorPayoutRequests.value.filter((item) => ["pending", "payout_pending", "failed"].includes(String(item.status || "").toLowerCase())).length,
)
const emptyPayoutStateCopy = computed(() => (
  isPlatformWideView.value
    ? localize("No payout requests are visible for the current artwork scope.", "当前作品范围内暂无可见的提现申请。")
    : localize("No artwork payout requests yet.", "暂无作品提现申请。")
))
const commissionTotalPages = computed(() => resolveTotalPages(filteredCommissionRecords.value.length, COMMISSION_PAGE_SIZE))
const orderTotalPages = computed(() => resolveTotalPages(filteredArtworkOrders.value.length, ORDER_PAGE_SIZE))
const payoutTotalPages = computed(() => resolveTotalPages(recentPayoutRequests.value.length, PAYOUT_PAGE_SIZE))
const paginatedCommissionRecords = computed(() => paginateItems(filteredCommissionRecords.value, commissionPage.value, COMMISSION_PAGE_SIZE))
const paginatedPayoutRequests = computed(() => paginateItems(recentPayoutRequests.value, payoutPage.value, PAYOUT_PAGE_SIZE))

watch(() => filteredCommissionRecords.value.length, () => {
  commissionPage.value = clampPage(commissionPage.value, commissionTotalPages.value)
})
watch(() => filteredArtworkOrders.value.length, () => {
  ordersPage.value = clampPage(ordersPage.value, orderTotalPages.value)
})
watch(() => recentPayoutRequests.value.length, () => {
  payoutPage.value = clampPage(payoutPage.value, payoutTotalPages.value)
})

function formatTokenAmount(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "0"
  return amount.toFixed(4).replace(/\.?0+$/, "")
}

function formatUsd(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "$0.00"
  return `$${amount.toFixed(2)}`
}

async function loadBilling() {
  const tenantId = scopedTenantId.value
  const requests: Array<Promise<unknown>> = [
    authStore.refreshSession(),
    platformStore.loadCommissionRecords({ auth: authStore.authHeaders, tenantId: tenantId || undefined, resourceType: "artwork", limit: 100 }),
  ]
  if (tenantId) {
    requests.push(
      platformStore.loadCreatorEarnings({ auth: authStore.authHeaders, tenantId }),
      platformStore.loadCreatorPayoutCycles({ auth: authStore.authHeaders, tenantId, limit: 24 }),
      platformStore.loadCreatorPayoutRequests({ auth: authStore.authHeaders, tenantId, limit: 50 }),
    )
  }
  await Promise.all(requests)
  artworkPurchases.value = await artworkStore.listPurchaseRecords({ tenantId: tenantId || undefined, role: "seller", limit: 100 })
}

async function loadBillingSafely() {
  financeLoading.value = true
  pageError.value = ""
  try {
    await loadBilling()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load artwork billing data.", "加载作品计费数据失败。"))
  } finally {
    financeLoading.value = false
  }
}

onMounted(async () => {
  await loadBillingSafely()
})
</script>

<style scoped>
.billing-page { display: flex; flex-direction: column; gap: 1rem; }
.page-header, .billing-grid { display: grid; gap: 1rem; }
.page-header { grid-template-columns: 1fr auto; align-items: start; }
.header-copy {
  max-width: 760px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.page-title { margin: 0; font-size: 1.5rem; color: #111827; display: flex; align-items: center; gap: 0.5rem; }
.page-emoji { font-size: 1.5rem; line-height: 1; }
.page-subtitle { margin: 0.5rem 0 0; color: #6b7280; font-size: 0.9rem; line-height: 1.55; }
.page-hint { margin: 0.35rem 0 0.6rem; color: #9ca3af; font-size: 0.8rem; }
.header-context { display: inline-flex; align-items: center; padding: 0.25rem 0.65rem; border-radius: 999px; background: #eff6ff; color: #1e3a8a; font-size: 0.75rem; font-weight: 600; }
.orders-link-section { background: #fff; }
.orders-link-row { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #e5e7eb; background: #f9fafb; color: #374151; font-size: 0.9rem; }
.orders-link-row strong { color: #111827; font-weight: 700; }
.orders-link { margin-left: auto; color: #4338ca; font-weight: 600; text-decoration: none; font-size: 0.875rem; }
.orders-link:hover { text-decoration: underline; }
.page-error { margin: 0.5rem 0 0; color: #b91c1c; font-size: 0.875rem; }
.related-views {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px dashed #cbd5f5;
  background: #f8fafc;
  font-size: 0.85rem;
  min-width: 180px;
}
.related-views-label { font-weight: 600; color: #475569; }
.related-views a { color: #4338ca; font-weight: 600; text-decoration: none; }
.related-views a:hover { text-decoration: underline; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.summary-card, .panel-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.summary-label { display: block; color: #6b7280; margin-bottom: 0.4rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.summary-card strong { font-size: 1.5rem; color: #111827; display: block; font-weight: 700; }
.billing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
.page-state-card { display: flex; flex-direction: column; gap: 0.5rem; }
.panel-title { margin: 0; font-size: 1.05rem; color: #111827; display: flex; align-items: center; gap: 0.4rem; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid #f3f4f6; }
.section-copy { margin: 0.35rem 0 0; color: #6b7280; font-size: 0.875rem; }
.section-actions { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; justify-content: flex-end; }
.filters-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1rem; }
.compact-filters { align-items: end; }
.form-field { display: flex; flex-direction: column; gap: 0.35rem; color: #374151; font-size: 0.85rem; }
.form-field :deep(.filter-dropdown) { width: 100%; min-width: 0; }
.form-field input,
.form-field select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  background: #ffffff;
  font-size: 0.875rem;
  color: #111827;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.unified-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #6b7280 50%),
    linear-gradient(135deg, #6b7280 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 3px),
    calc(100% - 12px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  min-height: 38px;
  line-height: 1.4;
  color: #111827;
  padding-right: 2.4rem;
}
.status-chip { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; line-height: 1.4; text-transform: capitalize; }
.status-chip.neutral { background: #f3f4f6; color: #374151; }
.status-chip.settled,
.status-chip.completed,
.status-chip.paid { background: #dcfce7; color: #166534; }
.status-chip.pending,
.status-chip.payout_pending { background: #fef3c7; color: #92400e; }
.status-chip.reversed,
.status-chip.refunded,
.status-chip.cancelled,
.status-chip.canceled,
.status-chip.failed { background: #fee2e2; color: #b91c1c; }
.record-list { display: flex; flex-direction: column; gap: 0.75rem; }
.record-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.9rem 1rem;
  background: #ffffff;
  transition: background 0.15s ease;
}
.record-item:hover { background: #f3f4f6; }
.record-main strong { color: #111827; }
.record-main p, .record-side span { margin: 0.25rem 0 0; color: #6b7280; display: block; font-size: 0.85rem; }
.record-meta { display: flex; gap: 0.65rem; flex-wrap: wrap; color: #6b7280; font-size: 0.85rem; margin-top: 0.3rem; }
.record-side { text-align: right; }
.record-side strong { color: #111827; font-size: 0.95rem; }
.summary-inline { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
.summary-chip { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.85rem; background: #f9fafb; }
.summary-chip span { display: block; color: #6b7280; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.summary-chip strong { display: block; margin-top: 0.4rem; color: #111827; font-size: 1.1rem; font-weight: 700; }
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.5rem; color: #6b7280; padding: 2rem 0; text-align: center; font-size: 0.9rem;
}
.empty-emoji { font-size: 1.75rem; }
.btn-secondary {
  background: #ffffff;
  color: #1d4ed8;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn-secondary:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.filter-summary {
  color: #6b7280;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
.compact-summary { margin-bottom: 0; }

@media (max-width: 900px) {
  .page-header { grid-template-columns: 1fr; }
  .summary-grid,
  .billing-grid,
  .summary-inline,
  .filters-grid { grid-template-columns: 1fr; }
  .record-item { flex-direction: column; }
  .record-side { text-align: left; }
}
</style>
