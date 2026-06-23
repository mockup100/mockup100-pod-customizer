<!-- @deprecated: 使用 /admin/tokens-management 替代，路由已 redirect -->
<template>
  <div class="token-overview-page" data-testid="admin-token-overview-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t("tokenOverview.pageTitle") }}</h1>
        <p class="page-subtitle">{{ t("tokenOverview.pageSubtitle") }}</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="reload(true)">{{ t("tokenOverview.refresh") }}</button>
        <button type="button" class="btn-primary" @click="goRecharge">{{ t("tokenOverview.rechargeCta") }}</button>
      </div>
    </header>

    <p v-if="loadError" class="error-banner">{{ t("tokenOverview.loadFailed") }}</p>

    <section class="summary-grid">
      <div class="summary-card balance-card">
        <span class="summary-label">{{ t("tokenOverview.balanceLabel") }}</span>
        <strong>{{ tokenBalance.toLocaleString() }}</strong>
        <span class="summary-help">{{ t("tokenOverview.balanceUnit") }}</span>
      </div>
    </section>

    <section class="panel-card">
      <h2 class="panel-title">{{ t("tokenOverview.recentOrdersTitle") }}</h2>
      <table v-if="recentOrders.length" class="data-table">
        <thead>
          <tr>
            <th>{{ t("tokenOverview.columnOrderId") }}</th>
            <th>{{ t("tokenOverview.columnAmount") }}</th>
            <th>{{ t("tokenOverview.columnTokens") }}</th>
            <th>{{ t("tokenOverview.columnStatus") }}</th>
            <th>{{ t("tokenOverview.columnCreatedAt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in recentOrders" :key="String(order.order_id || order.id || order.created_at)">
            <td>{{ String(order.order_id || order.id || "—") }}</td>
            <td>{{ formatAmount(order) }}</td>
            <td>{{ Number(order.tokens || 0).toLocaleString() }}</td>
            <td>{{ String(order.status || "—") }}</td>
            <td>{{ formatTime(order.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">{{ t("tokenOverview.recentOrdersEmpty") }}</p>
    </section>

    <section class="panel-card">
      <h2 class="panel-title">{{ t("tokenOverview.consumptionByTypeTitle") }}</h2>
      <table v-if="consumptionByType.length" class="data-table">
        <thead>
          <tr>
            <th>{{ t("tokenOverview.columnType") }}</th>
            <th>{{ t("tokenOverview.columnTokens") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in consumptionByType" :key="row.type">
            <td>{{ row.type }}</td>
            <td>{{ row.tokens.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">{{ t("tokenOverview.consumptionByTypeEmpty") }}</p>
    </section>

    <section class="panel-card">
      <h2 class="panel-title">{{ t("tokenOverview.consumptionLogTitle") }}</h2>
      <table v-if="paginatedLog.length" class="data-table">
        <thead>
          <tr>
            <th>{{ t("tokenOverview.columnCreatedAt") }}</th>
            <th>{{ t("tokenOverview.columnType") }}</th>
            <th>{{ t("tokenOverview.columnTokens") }}</th>
            <th>{{ t("tokenOverview.columnRequestId") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in paginatedLog" :key="entry.id">
            <td>{{ formatTime(entry.createdAt) }}</td>
            <td>{{ entry.type }}</td>
            <td>{{ entry.tokens.toLocaleString() }}</td>
            <td>{{ entry.requestId }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">{{ t("tokenOverview.consumptionLogEmpty") }}</p>
      <div v-if="totalLogPages > 1" class="pagination">
        <button type="button" :disabled="logPage <= 1" @click="logPage = Math.max(1, logPage - 1)">‹</button>
        <span>{{ logPage }} / {{ totalLogPages }}</span>
        <button type="button" :disabled="logPage >= totalLogPages" @click="logPage = Math.min(totalLogPages, logPage + 1)">›</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore } from "../../stores/platform"
import { gatewayPlatformFetch } from "../../api/client"

interface TokenBalanceResponse {
  balance?: number
  current_tokens?: number
  tokens?: number
  updated_at?: string
}

interface ConsumptionLogEntry {
  id: string
  createdAt: string
  type: string
  tokens: number
  requestId: string
}

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const { tokenOrders, billingEvents } = storeToRefs(platformStore)

const balanceFromApi = ref<number | null>(null)
const consumptionLog = ref<ConsumptionLogEntry[]>([])
const loadError = ref(false)
const logPage = ref(1)
const LOG_PAGE_SIZE = 10

const tokenBalance = computed(() => {
  if (balanceFromApi.value !== null) return balanceFromApi.value
  return Number(authStore.entitlements?.token_balance ?? 0)
})

const recentOrders = computed(() => {
  return [...tokenOrders.value].slice(0, 10)
})

const consumptionByType = computed(() => {
  const totals = new Map<string, number>()
  for (const entry of consumptionLog.value) {
    totals.set(entry.type, (totals.get(entry.type) || 0) + entry.tokens)
  }
  if (totals.size === 0) {
    // Fallback: aggregate from billingEvents (render_charge etc.)
    for (const event of billingEvents.value) {
      const eventType = String((event as Record<string, unknown>).event_type || "")
      if (!eventType) continue
      const detailRaw = (event as Record<string, unknown>).detail_json
      let tokens = 0
      try {
        const detail = typeof detailRaw === "string" ? JSON.parse(detailRaw) : (detailRaw as Record<string, unknown>) || {}
        tokens = Number(detail.tokens || 0)
      } catch {
        tokens = 0
      }
      if (tokens <= 0) continue
      totals.set(eventType, (totals.get(eventType) || 0) + tokens)
    }
  }
  return [...totals.entries()]
    .map(([type, tokens]) => ({ type, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
})

const totalLogPages = computed(() => Math.max(1, Math.ceil(consumptionLog.value.length / LOG_PAGE_SIZE)))
const paginatedLog = computed(() => {
  const start = (logPage.value - 1) * LOG_PAGE_SIZE
  return consumptionLog.value.slice(start, start + LOG_PAGE_SIZE)
})

function formatAmount(order: Record<string, unknown>): string {
  const cents = Number(order.amount_cents || order.amountCents || 0)
  const currency = String(order.currency || "USD")
  if (!cents) return "—"
  return `${(cents / 100).toFixed(2)} ${currency}`
}

function formatTime(value: unknown): string {
  if (!value) return "—"
  const text = String(value)
  const ts = Date.parse(text)
  if (Number.isNaN(ts)) return text
  return new Date(ts).toLocaleString()
}

function goRecharge() {
  router.push({ path: "/recharge" })
}

async function loadBalance() {
  try {
    const data = await gatewayPlatformFetch<TokenBalanceResponse>("/user/token-balance", {
      headers: { ...authStore.authHeaders },
    })
    const next = Number(data?.balance ?? data?.current_tokens ?? data?.tokens ?? 0)
    balanceFromApi.value = Number.isFinite(next) ? next : 0
  } catch {
    balanceFromApi.value = null
  }
}

async function loadConsumptionLog() {
  try {
    const raw = await gatewayPlatformFetch<unknown>("/admin/tokens/consumption-log?limit=200", {
      headers: { ...authStore.authHeaders },
    })
    const records: Array<Record<string, unknown>> = Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : Array.isArray((raw as Record<string, unknown>)?.records)
        ? ((raw as Record<string, unknown>).records as Array<Record<string, unknown>>)
        : []
    consumptionLog.value = records.map((row, index) => ({
      id: String(row.log_id || row.id || `${index}`),
      createdAt: String(row.created_at || row.createdAt || ""),
      type: String(row.type || row.event_type || ""),
      tokens: Number(row.tokens || 0),
      requestId: String(row.request_id || row.requestId || ""),
    }))
  } catch {
    consumptionLog.value = []
  }
}

async function reload(showError = false) {
  loadError.value = false
  const tenantId = authStore.tenant?.tenant_id || ""
  try {
    await Promise.all([
      loadBalance(),
      loadConsumptionLog(),
      tenantId
        ? platformStore.loadTokenOrders({ auth: authStore.authHeaders, tenantId, limit: 50 }).catch(() => undefined)
        : Promise.resolve(),
      tenantId
        ? platformStore.loadBillingEvents({ auth: authStore.authHeaders, tenantId, limit: 200 }).catch(() => undefined)
        : Promise.resolve(),
    ])
  } catch {
    if (showError) loadError.value = true
  }
}

onMounted(() => {
  reload(false)
})
</script>

<style scoped>
.token-overview-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
}
.page-subtitle {
  margin: 0;
  color: #555;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-secondary {
  background: #fff;
  color: #1f2937;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background: #f3f4f6;
}
.error-banner {
  padding: 10px 14px;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  margin: 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.summary-card strong {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}
.summary-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.summary-help {
  font-size: 12px;
  color: #6b7280;
}
.panel-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table th,
.data-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
}
.data-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}
.empty-state {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
}
.pagination button {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
