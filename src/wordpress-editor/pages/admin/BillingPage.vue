<template>
  <div class="billing-page" data-testid="admin-billing-page">
    <div class="page-header">
      <div class="header-copy">
        <h1 class="page-title">💼 {{ localize("Tenant Billing · Templates & Tokens", "租户账单 · 模板与令牌") }}</h1>
        <p class="page-subtitle">{{ pageSubtitle }}</p>
        <p v-if="pageNotice" class="page-notice">{{ pageNotice }}</p>
        <p v-if="pageError" class="page-error">{{ pageError }}</p>
      </div>
      <nav class="related-views" aria-label="Related views">
        <span class="related-views-label">{{ localize("Related views", "相关页面") }}</span>
        <RouterLink to="/admin/artwork-billing">{{ localize("Artwork Billing", "作品计费") }}</RouterLink>
        <RouterLink to="/admin/tokens-management">{{ localize("Tokens", "Tokens") }}</RouterLink>
        <RouterLink v-if="authStore.isPlatformAdmin" to="/admin/offline-orders">{{ localize("Offline Orders", "线下订单") }}</RouterLink>
        <RouterLink to="/admin/audit-logs">{{ localize("Audit Log", "审计日志") }}</RouterLink>
      </nav>
    </div>

    <div class="token-summary-strip">
      <span class="token-balance-pill">🪙 {{ localize("Available Tokens", "可用 Tokens") }}: {{ formatTokenBalance(tokenBalance) }}</span>
      <span aria-hidden="true">·</span>
      <span class="token-consumption-pill">{{ localize("Consumed", "已消耗") }}: {{ formatTokenBalance(totalConsumedTokens) }}</span>
      <RouterLink class="token-manage-link" to="/admin/tokens-management">{{ localize("Manage in Token Wallet →", "在 Token 钱包管理 →") }}</RouterLink>
      <RouterLink v-if="authStore.isPlatformAdmin" class="token-manage-link" to="/admin/offline-orders">{{ localize("Offline Orders →", "线下订单 →") }}</RouterLink>
    </div>

    <section v-if="financeLoading" class="panel-card page-state-card">
      <h2 class="panel-title">{{ localize("Loading billing workspace", "正在加载计费工作台") }}</h2>
      <p class="section-copy">{{ localize("Refreshing tokens, usage, orders, commissions, and payouts.", "正在刷新 tokens、用量、订单、分佣和提现数据。") }}</p>
    </section>
    <section v-else-if="showFinanceEmptyState" class="panel-card page-state-card">
      <h2 class="panel-title">{{ localize("Billing workspace is ready", "计费工作台已就绪") }}</h2>
      <p class="section-copy">{{ localize("No token orders, commission records, payout requests, or usage events yet.", "暂无 token 订单、分佣记录、提现申请或用量事件。") }}</p>
    </section>

    <div class="billing-grid billing-grid-core">
      <section class="panel-card">
        <div class="section-heading">
          <div>
            <h2 class="panel-title">{{ localize("Template Commission Overview", "模板分佣概览") }}</h2>
            <p class="section-copy">{{ localize("Filtered template commission ledger for the current tenant.", "当前租户筛选后的模板分佣台账。") }}</p>
          </div>
          <span class="status-chip neutral">{{ templateCommissionRecords.length }} {{ localize("records", "条记录") }}</span>
        </div>
        <div class="creator-dashboard">
          <div class="summary-card gross">
            <div class="card-label">{{ localize("Charged Usage", "已计费用量") }}</div>
            <div class="card-amount">{{ formatTokenAmount(templateChargedTokens) }}</div>
            <div class="card-subtitle">{{ localize("Charged tokens attributed to templates", "归属模板的已计费 tokens") }}</div>
          </div>
          <div class="summary-card commission">
            <div class="card-label">{{ localize("Net Commission", "净分佣") }}</div>
            <div class="card-amount">{{ formatTokenAmount(templateCommissionTokens) }}</div>
            <div class="card-subtitle">{{ commissionRateLabel }}</div>
          </div>
          <div class="summary-card pending">
            <div class="card-label">{{ localize("Settled · Pending · Reversed", "已结算 · 待处理 · 已冲销") }}</div>
            <div class="card-amount">{{ settledTemplateCommissionCount }} / {{ pendingTemplateCommissionCount }} / {{ formatTokenAmount(templateReversedTokens) }}</div>
            <div class="card-subtitle">{{ localize("Records by status · reversed in tokens", "按状态统计 · 冲销以 tokens 计") }}</div>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-heading">
          <div>
            <h2 class="panel-title">{{ localize("Template Commission Records", "模板分佣记录") }}</h2>
            <p class="section-copy">{{ localize("Template commission entries with resource attribution and status.", "包含资源归属与状态的模板分佣条目。") }}</p>
          </div>
          <div class="section-actions">
            <span class="status-chip neutral">{{ templateCommissionRecords.length }} {{ localize("records", "条记录") }}</span>
            <button class="btn-secondary" :disabled="commissionLoading" @click="loadCommissionRecordsSafely">
              {{ commissionLoading ? localize("Loading...", "加载中...") : localize("Retry", "重试") }}
            </button>
          </div>
        </div>
        <div class="filters-grid commission-filters">
          <label class="form-field">
            <span>{{ localize("Status", "状态") }}</span>
            <select v-model="commissionStatusFilter" class="unified-select">
              <option value="all">{{ localize("All Statuses", "全部状态") }}</option>
              <option value="settled">{{ localize("Settled", "已结算") }}</option>
              <option value="pending">{{ localize("Pending", "待处理") }}</option>
              <option value="reversed">{{ localize("Reversed", "已冲销") }}</option>
            </select>
          </label>
          <div class="filter-summary commission-summary">
            {{ localize("Showing", "显示") }} {{ filteredCommissionRecords.length }} {{ localize("template records", "条模板记录") }} ·
            {{ commissionStatusFilter === "all" ? localize("all statuses", "全部状态") : commissionStatusFilter }}
          </div>
        </div>
        <div v-if="commissionLoading" class="empty-state loading-state">{{ localize("Loading...", "加载中...") }}</div>
        <div v-else-if="commissionError" class="empty-state error-state">
          <strong>{{ localize("Failed to load commission records.", "加载分佣记录失败。") }}</strong>
          <span>{{ commissionError }}</span>
          <button class="btn-secondary" @click="loadCommissionRecordsSafely">{{ localize("Retry", "重试") }}</button>
        </div>
        <div v-else-if="paginatedCommissionRecords.length" class="record-list">
          <div v-for="record in paginatedCommissionRecords" :key="record.record_id" class="record-item">
            <div class="record-main">
              <div class="item-title">{{ resolveCommissionResourceLabel(record) }}</div>
              <div class="record-meta">
                <span>{{ resolveCommissionResourceCode(record) }}</span>
                <span>{{ localize("Job", "任务") }} {{ record.job_id || localize("n/a", "暂无") }}</span>
                <span>{{ localize("Consumer", "消费方") }} {{ record.consumer_tenant_id || localize("n/a", "暂无") }}</span>
              </div>
              <div class="record-meta">
                <span>{{ resolveCommissionResourceType(record) }}</span>
                <span>{{ record.source_type }}</span>
                <span>{{ record.period_key }}</span>
                <span>{{ record.created_at }}</span>
              </div>
            </div>
            <div class="record-side">
              <strong>{{ formatTokenAmount(record.commission_tokens) }} {{ localize("tokens", "tokens") }}</strong>
              <span>{{ formatTokenAmount(record.charged_tokens) }} {{ localize("charged", "已计费") }}</span>
              <span class="status-chip" :class="String(record.status || '').toLowerCase()">{{ ({ settled: '✅', pending: '⏳', reversed: '↩️' } as Record<string, string>)[String(record.status || '').toLowerCase()] || '•' }} {{ record.status }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <strong>📭 {{ localize("No commission records yet.", "暂无分佣记录。") }}</strong>
          <span>{{ localize("Template purchases and charged usage appear here.", "模板购买和已计费的用量会显示在这里。") }}</span>
        </div>
        <PaginationBar
          v-if="filteredCommissionRecords.length"
          v-model:current-page="commissionPage"
          :total-pages="commissionTotalPages"
          :total-items="filteredCommissionRecords.length"
          :page-size="COMMISSION_PAGE_SIZE"
        />
      </section>

      <section class="panel-card">
        <div class="section-heading">
          <div>
            <h2 class="panel-title">{{ localize("Payouts", "提现") }}</h2>
            <p class="section-copy">{{ localize("Send PayPal payouts for settled template earnings.", "为已结算的模板收益发起 PayPal 提现。") }}</p>
          </div>
          <div class="section-actions">
            <span class="status-chip neutral">{{ formatUsd(withdrawableUsd) }} {{ localize("available", "可提现") }}</span>
            <button class="btn-secondary" :disabled="payoutLoading" @click="reloadPayoutSection">
              {{ payoutLoading ? localize("Loading...", "加载中...") : localize("Retry", "重试") }}
            </button>
          </div>
        </div>
        <div class="creator-dashboard">
          <div class="summary-card gross">
            <div class="card-label">{{ localize("Withdrawable USD", "可提现 USD") }}</div>
            <div class="card-amount">{{ formatUsd(withdrawableUsd) }}</div>
            <div class="card-subtitle">{{ localize("Closed cycles available for payout", "可发起提现的已关闭周期") }}</div>
          </div>
          <div class="summary-card commission">
            <div class="card-label">{{ localize("Fee (est.)", "手续费（预估）") }}</div>
            <div class="card-amount">{{ formatUsd(estimatedFeeUsd) }}</div>
            <div class="card-subtitle">{{ localize("Creator bears PayPal payout fee", "创作者承担 PayPal 提现手续费") }}</div>
          </div>
          <div class="summary-card available">
            <div class="card-label">{{ localize("Net (est.)", "净额（预估）") }}</div>
            <div class="card-amount">{{ formatUsd(estimatedNetUsd) }}</div>
            <div class="card-subtitle">{{ localize("Expected payout after fee", "扣除手续费后的预计到账金额") }}</div>
          </div>
        </div>
        <div class="filters-grid">
          <label class="form-field">
            <span>{{ localize("Settlement cycle", "结算周期") }}</span>
            <select v-model="payoutForm.cycleId" class="unified-select">
              <option value="">{{ localize("Select cycle", "选择周期") }}</option>
              <option v-for="cycle in closedPayoutCycles" :key="cycle.cycle_id" :value="cycle.cycle_id">
                {{ cycle.period_key }} · {{ formatUsd(cycle.available_amount_usd) }}
              </option>
            </select>
          </label>
          <label class="form-field">
            <span>{{ localize("Gross USD", "提现总额 USD") }}</span>
            <input v-model="payoutForm.grossAmountUsd" type="number" min="0" step="0.01" :placeholder="localize('10.00', '10.00')" />
          </label>
          <label class="form-field">
            <span>{{ localize("PayPal receiver", "PayPal 收款账号") }}</span>
            <input v-model="payoutForm.paypalReceiver" type="email" :placeholder="localize('PayPal payout email', 'PayPal 提现邮箱')" />
          </label>
        </div>
        <div class="filter-summary">
          {{ localize("Selected cycle", "已选周期") }} {{ selectedPayoutCycle?.period_key || localize("n/a", "暂无") }} ·
          {{ localize("Available", "可提现") }} {{ formatUsd(selectedPayoutCycle?.available_amount_usd || 0) }}
        </div>
        <div
          v-if="Number(payoutForm.grossAmountUsd || 0) > 0 && estimatedNetUsd <= 0"
          class="filter-summary error-text"
        >
          {{ localize("Gross USD must exceed the estimated payout fee.", "提现总额 USD 必须高于预估手续费。") }}
        </div>
        <div v-if="payoutError" class="filter-summary error-text">
          {{ payoutError }}
        </div>
        <button
          class="btn-primary"
          :disabled="!canSubmitPayoutRequest || payoutLoading"
          @click="submitPayoutRequest"
        >
          {{ payoutLoading ? localize("Working...", "处理中...") : localize("Submit Payout Request", "提交提现申请") }}
        </button>
        <div v-if="payoutLoading && !recentPayoutRequests.length" class="empty-state loading-state">{{ localize("Loading...", "加载中...") }}</div>
        <div v-else-if="paginatedPayoutRequests.length" class="record-list record-list-spaced">
          <div v-for="request in paginatedPayoutRequests" :key="request.request_id" class="record-item">
            <div class="record-main">
              <div class="item-title">{{ request.cycle?.period_key || request.cycle_id }}</div>
              <div class="record-meta">
                <span>{{ request.paypal_receiver }}</span>
                <span>{{ request.status }}</span>
                <span>{{ request.created_at }}</span>
              </div>
            </div>
            <div class="record-side">
              <strong>{{ formatUsd(request.gross_amount_usd) }}</strong>
              <span>{{ formatUsd(request.net_amount_usd) }} {{ localize("net", "净额") }}</span>
              <button v-if="canRefreshPayoutRequest(request)" class="btn-secondary" @click="refreshPayoutRequest(request.request_id)">
                {{ localize("Refresh Status", "刷新状态") }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <strong>💸 {{ localize("No payout requests yet.", "暂无提现申请。") }}</strong>
          <span>{{ localize("Close a template commission cycle, then submit a payout request.", "请先完成一个模板分佣周期结算，然后提交提现申请。") }}</span>
        </div>
        <PaginationBar
          v-if="recentPayoutRequests.length"
          v-model:current-page="payoutRequestPage"
          :total-pages="payoutRequestTotalPages"
          :total-items="recentPayoutRequests.length"
          :page-size="PAYOUT_PAGE_SIZE"
        />
      </section>
    </div>

    <section v-if="authStore.isPlatformAdmin" class="panel-card admin-review-card">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ localize("Payout Review", "提现审核") }}</h2>
          <p class="section-copy">{{ localize("Payout request queue.", "提现申请队列。") }}</p>
        </div>
        <span class="status-chip neutral">{{ pendingAdminPayoutRequests.length }} {{ localize("pending", "待处理") }}</span>
      </div>
      <label class="form-field review-note-field">
        <span>{{ localize("Review note", "审核备注") }}</span>
        <input v-model="payoutActionNote" type="text" :placeholder="localize('Optional review note', '可选审核备注')" />
      </label>
      <div v-if="paginatedAdminPayoutRequests.length" class="record-list">
        <div v-for="request in paginatedAdminPayoutRequests" :key="request.request_id" class="record-item">
          <div class="record-main">
            <div class="item-title">{{ request.tenant_id }}</div>
            <div class="record-meta">
              <span>{{ request.paypal_receiver }}</span>
              <span>{{ request.status }}</span>
              <span>{{ request.cycle?.period_key || request.cycle_id }}</span>
            </div>
          </div>
          <div class="record-side">
            <strong>{{ formatUsd(request.gross_amount_usd) }}</strong>
            <button v-if="canRefreshPayoutRequest(request)" class="btn-secondary" @click="refreshPayoutRequest(request.request_id)">{{ localize("Refresh", "刷新") }}</button>
            <button v-if="request.status !== 'payout_pending'" class="btn-secondary" @click="approvePayoutRequest(request.request_id)">{{ localize("Approve", "通过") }}</button>
            <button v-if="request.status !== 'payout_pending'" class="btn-tertiary" @click="rejectPayoutRequest(request.request_id)">{{ localize("Reject", "拒绝") }}</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">📭 {{ localize("No payouts pending review.", "暂无待审核提现。") }}</div>
      <PaginationBar
        v-if="pendingAdminPayoutRequests.length"
        v-model:current-page="adminPayoutPage"
        :total-pages="adminPayoutTotalPages"
        :total-items="pendingAdminPayoutRequests.length"
        :page-size="ADMIN_PAYOUT_PAGE_SIZE"
      />
    </section>

    <section
      id="usage-ledger" class="panel-card">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ localize("Usage Log", "用量日志") }}</h2>
          <p class="section-copy">{{ localize("Tracked render charges tied to token consumption and commission eligibility.", "记录与 token 消耗及分佣资格相关的渲染计费。") }}</p>
        </div>
        <div class="section-actions">
          <button class="btn-secondary" :disabled="financeLoading" @click="loadFinanceSafely">
            {{ financeLoading ? localize("Refreshing...", "刷新中...") : localize("Retry", "重试") }}
          </button>
        </div>
      </div>
      <div class="filters-grid usage-filters">
        <label class="form-field">
          <span>{{ localize("Channel", "渠道") }}</span>
          <select v-model="channelFilter" class="unified-select">
            <option value="all">{{ localize("All Channels", "全部渠道") }}</option>
            <option value="console">{{ localize("Console", "控制台") }}</option>
            <option value="api">API</option>
          </select>
        </label>
        <label class="form-field">
          <span>{{ localize("Size", "尺寸") }}</span>
          <select v-model="sizeFilter" class="unified-select">
            <option value="all">{{ localize("All Sizes", "全部尺寸") }}</option>
            <option value="512">512</option>
            <option value="1024">1024</option>
            <option value="2048">2048</option>
            <option value="4096">4096</option>
          </select>
        </label>
        <label class="form-field">
          <span>{{ localize("Time Range", "时间范围") }}</span>
          <select v-model="timeRangeFilter" class="unified-select">
            <option value="all">{{ localize("All Time", "全部时间") }}</option>
            <option value="24h">{{ localize("Last 24 Hours", "最近 24 小时") }}</option>
            <option value="7d">{{ localize("Last 7 Days", "最近 7 天") }}</option>
            <option value="30d">{{ localize("Last 30 Days", "最近 30 天") }}</option>
          </select>
        </label>
      </div>
      <div class="filter-summary">
        {{ localize("Showing", "显示") }} {{ filteredRenderRows.length }} / {{ renderRows.length }} {{ localize("render records", "条渲染记录") }} ·
        {{ filteredOutputTotal }} {{ localize("outputs", "个输出") }} · {{ filteredTokenTotal }} {{ localize("tokens", "tokens") }}
      </div>
      <div class="table-list" v-if="paginatedRenderRows.length">
        <div v-for="item in paginatedRenderRows" :key="item.id" class="table-row">
          <div class="table-main">
            <strong>{{ displaySizeLabel(item.size_tier) }}</strong>
            <span>{{ item.channel.toUpperCase() }} · {{ item.template_id || localize("unknown template", "未知模板") }}</span>
            <span>{{ item.description }}</span>
          </div>
          <div class="table-side">
            <span>{{ item.output_count }} {{ localize("outputs", "个输出") }}</span>
            <span>{{ item.tokens_used }} {{ localize("tokens", "tokens") }}</span>
            <strong>{{ item.created_at }}</strong>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <strong>📭 {{ renderRowsEmptyMessage }}</strong>
        <span>{{ localize("Render charges will appear here after console or API generation consumes billable tokens.", "控制台或 API 生成消耗可计费 tokens 后，渲染计费将显示在这里。") }}</span>
      </div>
      <PaginationBar
        v-if="filteredRenderRows.length"
        v-model:current-page="usageLogPage"
        :total-pages="usageLogTotalPages"
        :total-items="filteredRenderRows.length"
        :page-size="USAGE_LOG_PAGE_SIZE"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRoute } from "vue-router"
import { RouterLink } from "vue-router"
import PaginationBar from "../../components/PaginationBar.vue"
import { useAuthStore } from "../../stores/auth"
import {
  usePlatformStore,
  type BillingEventItem,
  type CommissionRecordItem,
  type CreatorPayoutCycleItem,
  type CreatorPayoutRequestItem,
} from "../../stores/platform"
import { useUiLocaleStore } from "../../stores/uiLocale"
import {
  buildBillingSummary,
  buildRenderRows,
  displaySizeLabel,
  filterRenderRows,
  type BillingChannelFilter,
  type BillingSizeFilter,
  type BillingTimeRangeFilter,
  type RenderRow,
} from "./billingView"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"
import { resolveAdminScopedTenantId } from "./adminTenantContext"

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiLocaleStore = useUiLocaleStore()
const route = useRoute()
const { billingEvents, tokenOrders, usage, creatorEarnings, commissionRecords, creatorPayoutCycles, creatorPayoutRequests, adminPayoutRequests } = storeToRefs(platformStore)
const scopedTenantId = computed(() => resolveAdminScopedTenantId({
  isPlatformAdmin: authStore.isPlatformAdmin,
  query: route.query,
  fallbackTenantId: authStore.tenant?.tenant_id,
}))
const pageError = ref("")
const pageNotice = ref("")
const financeLoading = ref(false)
const commissionLoading = ref(false)
const payoutLoading = ref(false)
const commissionError = ref("")
const payoutError = ref("")
const payoutForm = ref({
  cycleId: "",
  grossAmountUsd: "",
  paypalReceiver: authStore.account?.email || "",
})
const payoutActionNote = ref("")
const commissionStatusFilter = ref("all")
const commissionPage = ref(1)
const payoutRequestPage = ref(1)
const adminPayoutPage = ref(1)
const usageLogPage = ref(1)
const COMMISSION_PAGE_SIZE = 6
const PAYOUT_PAGE_SIZE = 6
const ADMIN_PAYOUT_PAGE_SIZE = 8
const USAGE_LOG_PAGE_SIZE = 12

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const channelFilter = ref<BillingChannelFilter>("all")
const sizeFilter = ref<BillingSizeFilter>("all")
const timeRangeFilter = ref<BillingTimeRangeFilter>("all")

const billingSummary = computed(() => buildBillingSummary({
  tokenOrders: tokenOrders.value,
  billingEvents: billingEvents.value,
  usage: usage.value,
  fallbackTokenBalance: authStore.entitlements?.token_balance ?? 0,
}))
const tokenBalance = computed(() => billingSummary.value.tokenBalance)
const totalConsumedTokens = computed(() => billingSummary.value.totalConsumedTokens)
const pageSubtitle = computed(() => authStore.isPlatformAdmin
  ? localize("Template commission, token usage, and payouts. Artwork commissions live in Artwork Billing.", "模板分佣、令牌用量与提现。作品分佣请前往「作品计费」。")
  : localize("Track template commission, token usage, and payouts. For artwork commissions go to Artwork Billing.", "跟踪模板分佣、令牌用量与提现。作品分佣请前往「作品计费」。"))
const templateCommissionRecords = computed(() =>
  (commissionRecords.value as CommissionRecordItem[]).filter((item) => String(item.resource_type || "template").toLowerCase() !== "artwork"),
)
const filteredCommissionRecords = computed(() => {
  if (commissionStatusFilter.value === "all") return templateCommissionRecords.value
  return templateCommissionRecords.value.filter((item) => String(item.status || "").toLowerCase() === commissionStatusFilter.value)
})
const templateChargedTokens = computed(() =>
  templateCommissionRecords.value.reduce((sum, item) => sum + Number(item.charged_tokens || 0), 0),
)
const templateCommissionTokens = computed(() =>
  templateCommissionRecords.value.reduce((sum, item) => sum + Number(item.commission_tokens || 0), 0),
)
const templateReversedTokens = computed(() =>
  templateCommissionRecords.value
    .filter((item) => String(item.status || "").toLowerCase() === "reversed")
    .reduce((sum, item) => sum + Number(item.commission_tokens || 0), 0),
)
const settledTemplateCommissionCount = computed(() =>
  templateCommissionRecords.value.filter((item) => String(item.status || "").toLowerCase() === "settled").length,
)
const pendingTemplateCommissionCount = computed(() =>
  templateCommissionRecords.value.filter((item) => String(item.status || "").toLowerCase() === "pending").length,
)
const closedPayoutCycles = computed(() => (creatorPayoutCycles.value as CreatorPayoutCycleItem[]).filter((item) => ["closed", "partially_paid"].includes(String(item.status || "").toLowerCase()) && Number(item.available_amount_usd || 0) > 0))
const recentPayoutRequests = computed(() => (creatorPayoutRequests.value as CreatorPayoutRequestItem[]))
const pendingAdminPayoutRequests = computed(() => (adminPayoutRequests.value as CreatorPayoutRequestItem[]).filter((item) => ["pending", "failed", "payout_pending"].includes(String(item.status || "").toLowerCase())))
const withdrawableUsd = computed(() => closedPayoutCycles.value.reduce((sum, item) => sum + Number(item.available_amount_usd || 0), 0))
const selectedPayoutCycle = computed(() => (creatorPayoutCycles.value as CreatorPayoutCycleItem[]).find((item) => item.cycle_id === payoutForm.value.cycleId) || null)
const estimatedFeeUsd = computed(() => {
  const gross = Number(payoutForm.value.grossAmountUsd || 0)
  if (!gross) return 0
  return Math.max(0, gross * 0.02 + 0.3)
})
const estimatedNetUsd = computed(() => Math.max(0, Number(payoutForm.value.grossAmountUsd || 0) - estimatedFeeUsd.value))
const canSubmitPayoutRequest = computed(() => {
  const gross = Number(payoutForm.value.grossAmountUsd || 0)
  const available = Number(selectedPayoutCycle.value?.available_amount_usd || 0)
  return Boolean(
    payoutForm.value.cycleId
    && payoutForm.value.paypalReceiver.trim()
    && gross > 0
    && selectedPayoutCycle.value
    && gross <= available
    && estimatedNetUsd.value > 0
  )
})
const commissionRateLabel = computed(() => {
  const rateBps = Number(creatorEarnings.value?.commission_rate_bps || 3000)
  return localize(`Fixed ${Math.round(rateBps / 100)}% creator share`, `固定 ${Math.round(rateBps / 100)}% 创作者分成`)
})

const renderRows = computed<RenderRow[]>(() => buildRenderRows(billingEvents.value as BillingEventItem[]))

const filteredRenderRows = computed(() =>
  filterRenderRows(renderRows.value, channelFilter.value, sizeFilter.value, timeRangeFilter.value),
)
const commissionTotalPages = computed(() => resolveTotalPages(filteredCommissionRecords.value.length, COMMISSION_PAGE_SIZE))
const payoutRequestTotalPages = computed(() => resolveTotalPages(recentPayoutRequests.value.length, PAYOUT_PAGE_SIZE))
const adminPayoutTotalPages = computed(() => resolveTotalPages(pendingAdminPayoutRequests.value.length, ADMIN_PAYOUT_PAGE_SIZE))
const usageLogTotalPages = computed(() => resolveTotalPages(filteredRenderRows.value.length, USAGE_LOG_PAGE_SIZE))
const paginatedCommissionRecords = computed(() => paginateItems(filteredCommissionRecords.value, commissionPage.value, COMMISSION_PAGE_SIZE))
const paginatedPayoutRequests = computed(() => paginateItems(recentPayoutRequests.value, payoutRequestPage.value, PAYOUT_PAGE_SIZE))
const paginatedAdminPayoutRequests = computed(() => paginateItems(pendingAdminPayoutRequests.value, adminPayoutPage.value, ADMIN_PAYOUT_PAGE_SIZE))
const paginatedRenderRows = computed(() => paginateItems(filteredRenderRows.value, usageLogPage.value, USAGE_LOG_PAGE_SIZE))
const filteredOutputTotal = computed(() => filteredRenderRows.value.reduce((sum, item) => sum + item.output_count, 0))
const filteredTokenTotal = computed(() => filteredRenderRows.value.reduce((sum, item) => sum + item.tokens_used, 0))
const renderRowsEmptyMessage = computed(() => authStore.isPlatformAdmin
  ? localize("No render billing records yet.", "暂无渲染计费记录。")
  : localize("No matching render records.", "没有匹配的渲染记录。"))
const showFinanceEmptyState = computed(() => (
  !financeLoading.value
  && !tokenOrders.value.length
  && !billingEvents.value.length
  && !commissionRecords.value.length
  && !creatorPayoutRequests.value.length
  && !adminPayoutRequests.value.length
))
watch(() => filteredCommissionRecords.value.length, () => {
  commissionPage.value = clampPage(commissionPage.value, commissionTotalPages.value)
})
watch(() => recentPayoutRequests.value.length, () => {
  payoutRequestPage.value = clampPage(payoutRequestPage.value, payoutRequestTotalPages.value)
})
watch(() => pendingAdminPayoutRequests.value.length, () => {
  adminPayoutPage.value = clampPage(adminPayoutPage.value, adminPayoutTotalPages.value)
})
watch(() => filteredRenderRows.value.length, () => {
  usageLogPage.value = clampPage(usageLogPage.value, usageLogTotalPages.value)
})

async function loadFinance() {
  const tenantId = scopedTenantId.value
  if (!tenantId) return
  commissionLoading.value = true
  payoutLoading.value = true
  try {
    await Promise.all([
      authStore.refreshSession(),
      platformStore.loadUsage(tenantId, "", "", authStore.authHeaders),
      platformStore.loadBillingEvents({ auth: authStore.authHeaders, tenantId, limit: 200 }),
      platformStore.loadTokenOrders({ auth: authStore.authHeaders, tenantId, limit: 100 }),
      platformStore.loadCreatorEarnings({ auth: authStore.authHeaders, tenantId }),
      loadCommissionRecords(),
      platformStore.loadCreatorPayoutCycles({ auth: authStore.authHeaders, tenantId, limit: 24 }),
      platformStore.loadCreatorPayoutRequests({ auth: authStore.authHeaders, tenantId, limit: 50 }),
      ...(authStore.isPlatformAdmin ? [platformStore.loadAdminPayoutRequests({ auth: authStore.authHeaders, limit: 100 })] : []),
    ])
  } finally {
    commissionLoading.value = false
    payoutLoading.value = false
  }
}

async function loadCommissionRecords() {
  const tenantId = scopedTenantId.value
  if (!tenantId) return
  await platformStore.loadCommissionRecords({
    auth: authStore.authHeaders,
    tenantId,
    resourceType: "template",
    status: commissionStatusFilter.value === "all" ? "" : commissionStatusFilter.value,
    limit: 100,
  })
}

async function loadCommissionRecordsSafely() {
  commissionLoading.value = true
  commissionError.value = ""
  try {
    await loadCommissionRecords()
  } catch (error) {
    commissionError.value = String((error as Error)?.message || error || localize("Failed to load commission records.", "加载分佣记录失败。"))
  } finally {
    commissionLoading.value = false
  }
}

async function reloadPayoutSection() {
  const tenantId = scopedTenantId.value
  if (!tenantId) return
  payoutLoading.value = true
  payoutError.value = ""
  try {
    await Promise.all([
      platformStore.loadCreatorPayoutCycles({ auth: authStore.authHeaders, tenantId, limit: 24 }),
      platformStore.loadCreatorPayoutRequests({ auth: authStore.authHeaders, tenantId, limit: 50 }),
      ...(authStore.isPlatformAdmin ? [platformStore.loadAdminPayoutRequests({ auth: authStore.authHeaders, limit: 100 })] : []),
    ])
  } catch (error) {
    payoutError.value = String((error as Error)?.message || error || localize("Failed to load payout data.", "加载提现数据失败。"))
  } finally {
    payoutLoading.value = false
  }
}

function formatTokenAmount(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "0"
  return amount.toFixed(4).replace(/\.?0+$/, "")
}

function formatTokenBalance(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "0"
  return Math.round(amount).toLocaleString("en-US")
}

function formatUsd(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "$0.00"
  const sign = amount < 0 ? "-" : ""
  return `${sign}$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function resolveCommissionResourceType(record: CommissionRecordItem) {
  return String(record.resource_type || "template").toLowerCase()
}

function resolveCommissionResourceLabel(record: CommissionRecordItem) {
  if (resolveCommissionResourceType(record) === "artwork") {
    return record.artwork_name || record.resource_name || record.artwork_code || record.artwork_id || record.resource_id || localize("Artwork", "作品")
  }
  return record.template_name || record.resource_name || record.template_id || record.resource_id || localize("Template", "模板")
}

function resolveCommissionResourceCode(record: CommissionRecordItem) {
  if (resolveCommissionResourceType(record) === "artwork") {
    return record.artwork_code || record.artwork_id || record.resource_id || localize("Artwork ID n/a", "作品 ID 暂无")
  }
  return record.template_id || record.resource_id || localize("Template ID n/a", "模板 ID 暂无")
}

async function submitPayoutRequest() {
  const tenantId = scopedTenantId.value
  if (!tenantId || !payoutForm.value.cycleId || !payoutForm.value.paypalReceiver.trim()) return
  pageError.value = ""
  pageNotice.value = ""
  payoutError.value = ""
  payoutLoading.value = true
  try {
    await platformStore.createCreatorPayoutRequest({
      auth: authStore.authHeaders,
      tenantId,
      cycleId: payoutForm.value.cycleId,
      grossAmountUsd: Number(payoutForm.value.grossAmountUsd || 0),
      paypalReceiver: payoutForm.value.paypalReceiver.trim(),
    })
    payoutForm.value.grossAmountUsd = ""
    await Promise.all([
      platformStore.loadCreatorPayoutCycles({ auth: authStore.authHeaders, tenantId, limit: 24 }),
      platformStore.loadCreatorPayoutRequests({ auth: authStore.authHeaders, tenantId, limit: 50 }),
    ])
    pageNotice.value = localize("Payout request submitted.", "提现申请已提交。")
  } catch (error) {
    const message = String((error as Error)?.message || error || localize("Failed to submit payout request.", "提交提现申请失败。"))
    pageError.value = message
    payoutError.value = message
  } finally {
    payoutLoading.value = false
  }
}

async function approvePayoutRequest(requestId: string) {
  pageError.value = ""
  pageNotice.value = ""
  payoutError.value = ""
  payoutLoading.value = true
  try {
    await platformStore.approveCreatorPayoutRequest(requestId, {
      auth: authStore.authHeaders,
      reviewedNote: payoutActionNote.value,
    })
    await platformStore.loadAdminPayoutRequests({ auth: authStore.authHeaders, limit: 100 })
    pageNotice.value = localize("Payout request approved.", "提现申请已通过。")
  } catch (error) {
    const message = String((error as Error)?.message || error || localize("Failed to approve payout request.", "通过提现申请失败。"))
    pageError.value = message
    payoutError.value = message
  } finally {
    payoutLoading.value = false
  }
}

async function rejectPayoutRequest(requestId: string) {
  pageError.value = ""
  pageNotice.value = ""
  payoutError.value = ""
  payoutLoading.value = true
  try {
    await platformStore.rejectCreatorPayoutRequest(requestId, {
      auth: authStore.authHeaders,
      reviewedNote: payoutActionNote.value,
    })
    await platformStore.loadAdminPayoutRequests({ auth: authStore.authHeaders, limit: 100 })
    pageNotice.value = localize("Payout request rejected.", "提现申请已拒绝。")
  } catch (error) {
    const message = String((error as Error)?.message || error || localize("Failed to reject payout request.", "拒绝提现申请失败。"))
    pageError.value = message
    payoutError.value = message
  } finally {
    payoutLoading.value = false
  }
}

function canRefreshPayoutRequest(request: { status?: string; paypal_batch_id?: string | null; paypal_item_id?: string | null }) {
  const status = String(request.status || "").toLowerCase()
  return ["payout_pending", "failed"].includes(status) && (!!request.paypal_batch_id || !!request.paypal_item_id)
}

async function refreshPayoutRequest(requestId: string) {
  const tenantId = scopedTenantId.value
  pageError.value = ""
  pageNotice.value = ""
  payoutError.value = ""
  payoutLoading.value = true
  try {
    await platformStore.refreshCreatorPayoutRequest(requestId, {
      auth: authStore.authHeaders,
    })
    await Promise.all([
      tenantId ? platformStore.loadCreatorPayoutCycles({ auth: authStore.authHeaders, tenantId, limit: 24 }) : Promise.resolve(),
      tenantId ? platformStore.loadCreatorPayoutRequests({ auth: authStore.authHeaders, tenantId, limit: 50 }) : Promise.resolve(),
      authStore.isPlatformAdmin ? platformStore.loadAdminPayoutRequests({ auth: authStore.authHeaders, limit: 100 }) : Promise.resolve(),
    ])
    pageNotice.value = localize("Payout status refreshed.", "提现状态已刷新。")
  } catch (error) {
    const message = String((error as Error)?.message || error || localize("Failed to refresh payout request.", "刷新提现申请失败。"))
    pageError.value = message
    payoutError.value = message
  } finally {
    payoutLoading.value = false
  }
}

async function loadFinanceSafely() {
  financeLoading.value = true
  pageError.value = ""
  pageNotice.value = ""
  commissionError.value = ""
  payoutError.value = ""
  try {
    await loadFinance()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load billing data.", "加载计费数据失败。"))
  } finally {
    financeLoading.value = false
  }
}

onMounted(async () => {
  await loadFinanceSafely()
})

watch(commissionStatusFilter, async () => {
  await loadCommissionRecordsSafely()
})

watch(scopedTenantId, async () => {
  await loadFinanceSafely()
})
</script>

<style scoped>
.billing-page { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header {
  padding: 1.5rem 1.6rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.header-copy { max-width: 760px; min-width: 0; }
.page-title { margin: 0; font-size: 1.85rem; letter-spacing: -0.01em; }
.page-subtitle { margin: 0.45rem 0 0; color: #64748b; line-height: 1.55; }
.page-notice { margin: 0.6rem 0 0; color: #047857; font-size: 0.92rem; }
.page-error { margin: 0.6rem 0 0; color: #b91c1c; font-size: 0.92rem; }
.related-views {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.85rem;
  margin: 0.85rem 0 0;
  padding: 0.55rem 0.75rem;
  border-radius: 0.65rem;
  border: 1px dashed #cbd5f5;
  background: #f8fafc;
  font-size: 0.85rem;
}
.related-views-label { font-weight: 600; color: #475569; }
.related-views a { color: #4338ca; font-weight: 600; text-decoration: none; }
.related-views a:hover { text-decoration: underline; }
.token-summary-strip {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  padding: 0.65rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.92rem;
}
.token-balance-pill, .token-consumption-pill {
  font-weight: 600;
  color: #0f172a;
}
.token-manage-link {
  margin-left: auto;
  color: #4338ca;
  font-weight: 600;
  text-decoration: none;
}
.token-manage-link:hover { text-decoration: underline; }
.page-state-card { display: flex; flex-direction: column; gap: 0.75rem; }
.panel-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 1.25rem 1.4rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}
.billing-grid { display: grid; gap: 1.25rem; grid-template-columns: 1fr; }
.billing-grid-orders { grid-template-columns: 1fr; }
.billing-grid-core { grid-template-columns: 1fr; align-items: stretch; }
.panel-title { margin: 0 0 0.85rem; font-size: 1.05rem; }
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.95rem;
  border-bottom: 1px solid #eef2f7;
}
.section-heading > div { min-width: 0; }
.section-heading .panel-title { margin: 0; }
.section-copy { margin: 0.35rem 0 0; color: #64748b; line-height: 1.55; }
.section-actions { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; justify-content: flex-end; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
.filters-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.9rem; margin-bottom: 1rem; }
.usage-filters { grid-template-columns: repeat(3, minmax(190px, 1fr)); align-items: end; }
.commission-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; }
.form-field { display: flex; flex-direction: column; gap: 0.45rem; color: #475569; }
.usage-filters .form-field { min-width: 0; }
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
.usage-filters .form-field select.unified-select {
  width: 100%;
  padding-right: 2.2rem;
  background-position: right 0.72rem center;
}
.review-note-field { margin-bottom: 1rem; }
.form-field input, .form-field select {
  border: 1px solid #cbd5e1;
  border-radius: 0.85rem;
  padding: 0.78rem 0.9rem;
  background: rgba(255,255,255,0.95);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-field input:focus, .form-field select:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.filter-summary {
  color: #64748b;
  margin-bottom: 0.75rem;
  font-size: 0.92rem;
  padding: 0.78rem 0.9rem;
  border-radius: 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.commission-summary {
  margin-bottom: 0;
}
.loading-state {
  color: #475569;
}
.error-text {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}
.full-width { grid-column: 1 / -1; }
.form-actions { margin-top: 1rem; display: flex; justify-content: flex-end; }
.btn-primary, .btn-secondary, .btn-tertiary {
  border: 0;
  border-radius: 0.82rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.btn-primary { background: #0ea5e9; color: #fff; }
.btn-secondary { background: #e2e8f0; color: #0f172a; }
.btn-tertiary { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.btn-primary:hover, .btn-secondary:hover, .btn-tertiary:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08); }
.btn-primary:disabled, .btn-secondary:disabled, .btn-tertiary:disabled { opacity: 0.58; cursor: not-allowed; transform: none; box-shadow: none; }
.list-stack, .table-list { display: flex; flex-direction: column; gap: 0; overflow-x: auto; }
.list-item, .table-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.95rem 0; border-bottom: 1px solid #edf2f7; }
.list-item:last-child, .table-row:last-child { border-bottom: 0; }
.item-title { font-weight: 600; }
.item-meta { color: #64748b; font-size: 0.92rem; margin-top: 0.2rem; }
.item-actions { display: flex; gap: 0.5rem; align-items: center; }
.item-side { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end; color: #475569; }
.table-main, .table-side { display: flex; flex-direction: column; gap: 0.2rem; }
.table-side { align-items: flex-end; }
.empty-state { color: #64748b; padding: 0.5rem 0; }
.record-list { display: flex; flex-direction: column; gap: 0; }
.record-list-spaced { margin-top: 1rem; }
.empty-actions { display: flex; gap: 0.65rem; flex-wrap: wrap; margin-top: 0.8rem; }
.error-state { align-items: flex-start; }
.record-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0.25rem;
  border-bottom: 1px solid #eef2f7;
  background: transparent;
  transition: background 0.15s ease;
}
.record-item:hover { background: #f8fafc; }
.record-item:last-child { border-bottom: 0; }
.record-main, .record-side { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
.record-side { align-items: flex-end; text-align: right; color: #475569; }
.record-meta { display: flex; gap: 0.65rem; flex-wrap: wrap; color: #64748b; font-size: 0.88rem; }
.status-chip { display: inline-flex; align-items: center; justify-content: center; padding: 0.3rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; text-transform: capitalize; }
.status-chip.neutral { background: #eef2ff; color: #4338ca; }
.status-chip.settled { background: #dcfce7; color: #166534; }
.status-chip.pending { background: #fef3c7; color: #92400e; }
.status-chip.reversed { background: #fee2e2; color: #b91c1c; }
.creator-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
  margin: 0 0 1rem;
}
.summary-card {
  position: relative;
  min-width: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
  text-align: left;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}
.summary-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, #94a3b8, #cbd5e1);
}
.summary-card.gross::before { background: linear-gradient(90deg, #10b981, #34d399); }
.summary-card.commission::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.summary-card.available::before { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
.summary-card.pending::before { background: linear-gradient(90deg, #6366f1, #818cf8); }
.card-label { font-size: 0.78rem; color: #64748b; margin: 0 0 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.card-amount { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin-bottom: 0.3rem; line-height: 1.2; overflow-wrap: anywhere; word-break: break-word; }
.card-amount--wrap { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.card-subtitle { font-size: 0.8rem; color: #64748b; line-height: 1.45; }
.admin-review-card { scroll-margin-top: 8rem; }

@media (max-width: 720px) {
  .page-header { padding: 1.2rem 1.1rem; }
  .billing-grid, .form-grid, .filters-grid { grid-template-columns: 1fr; }
  .creator-dashboard { grid-template-columns: 1fr; }
  .section-heading, .record-item { flex-direction: column; align-items: flex-start; }
  .record-side { align-items: flex-start; text-align: left; }
}
</style>
