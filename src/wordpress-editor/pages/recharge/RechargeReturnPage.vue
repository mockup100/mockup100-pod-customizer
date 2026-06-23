<template>
  <div class="recharge-return">
    <header class="recharge-return__header">
      <h1>{{ t("recharge.return.title") }}</h1>
    </header>

    <div v-if="loading" class="recharge-return__loading">{{ t("recharge.return.processing") }}</div>

    <div v-else-if="resultKind" class="recharge-return__panel" :class="`recharge-return__panel--${resultKind}`">
      <h2>{{ resultTitle }}</h2>
      <p>{{ resultDesc }}</p>

      <dl v-if="order" class="recharge-return__meta">
        <div><dt>{{ t("recharge.return.orderNo") }}</dt><dd>{{ order.orderNo }}</dd></div>
        <div><dt>{{ t("recharge.return.paypalOrderId") }}</dt><dd>{{ order.paypalOrderId || "-" }}</dd></div>
        <div><dt>{{ t("recharge.return.amount") }}</dt><dd>{{ order.currency }} {{ formatAmount(order.amount) }}</dd></div>
        <div><dt>{{ t("recharge.return.tokens") }}</dt><dd>{{ formatTokens(order.tokensToGrant) }}</dd></div>
        <div><dt>{{ t("recharge.return.status") }}</dt><dd>{{ order.status }}</dd></div>
      </dl>
    </div>

    <div class="recharge-return__actions">
      <RouterLink class="recharge-return__btn recharge-return__btn--ghost" to="/recharge">
        {{ t("recharge.return.backToRecharge") }}
      </RouterLink>
      <RouterLink class="recharge-return__btn" to="/admin/tokens-management">
        {{ t("recharge.return.goTokens") }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, RouterLink } from "vue-router"
import { platformFetch } from "../../api/client"

interface OrderView {
  orderNo: string
  status: string
  paypalOrderId?: string
  paypalCaptureId?: string
  amount?: number | string
  currency?: string
  pkgCode?: string
  tokensToGrant?: number
  approveUrl?: string
  capturedAt?: string
  expiresAt?: string
  errorMessage?: string
}

const { t } = useI18n()
const route = useRoute()

const order = ref<OrderView | null>(null)
const loading = ref<boolean>(true)

const resultKind = computed<"success" | "failed" | "pending" | "">(() => {
  const s = order.value?.status || ""
  if (s === "CAPTURED" || s === "REFUNDED") return "success"
  if (s === "FAILED" || s === "CANCELED" || s === "EXPIRED") return "failed"
  if (s === "CREATED" || s === "APPROVED") return "pending"
  return ""
})

const resultTitle = computed(() => {
  const k = resultKind.value
  if (k === "success") return t("recharge.return.success")
  if (k === "failed") return t("recharge.return.failed")
  if (k === "pending") return t("recharge.return.pending")
  return ""
})

const resultDesc = computed(() => {
  const k = resultKind.value
  if (k === "success") return t("recharge.return.successDesc", { tokens: order.value?.tokensToGrant ?? 0 })
  if (k === "failed") return t("recharge.return.failedDesc")
  if (k === "pending") return t("recharge.return.pendingDesc")
  return ""
})

function formatAmount(value: number | string | undefined): string {
  if (value === undefined || value === null) return "-"
  const n = typeof value === "string" ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : String(value)
}
function formatTokens(value: number | undefined): string {
  return Number(value || 0).toLocaleString()
}

async function poll() {
  const orderNo = String(route.query.orderNo || "").trim()
  if (!orderNo) {
    loading.value = false
    return
  }
  // Poll a few times to wait for webhook capture confirmation when buyer comes
  // back via PayPal redirect and the SPA has not yet captured client-side.
  const attempts = [0, 1500, 3000]
  for (const delay of attempts) {
    if (delay) await new Promise((r) => setTimeout(r, delay))
    try {
      const view = await platformFetch<OrderView>(`/api/payments/paypal/orders/${encodeURIComponent(orderNo)}`)
      order.value = view
      const s = view?.status || ""
      if (s === "CAPTURED" || s === "REFUNDED" || s === "FAILED" || s === "CANCELED" || s === "EXPIRED") break
    } catch (e) {
      console.warn("[recharge-return] poll failed", e)
      break
    }
  }
  loading.value = false
}

onMounted(() => {
  poll()
})
</script>

<style scoped>
.recharge-return {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}
.recharge-return__header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
}
.recharge-return__loading {
  color: #555;
  padding: 24px 0;
}
.recharge-return__panel {
  border-radius: 12px;
  padding: 22px 24px;
  border: 1px solid #e3e6eb;
  background: #fff;
}
.recharge-return__panel h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}
.recharge-return__panel p {
  margin: 0 0 16px;
  color: #444;
  line-height: 1.6;
}
.recharge-return__panel--success {
  border-top: 4px solid #047857;
}
.recharge-return__panel--failed {
  border-top: 4px solid #b91c1c;
}
.recharge-return__panel--pending {
  border-top: 4px solid #2563eb;
}
.recharge-return__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 24px;
  font-size: 13px;
}
.recharge-return__meta div {
  display: flex;
  gap: 8px;
}
.recharge-return__meta dt {
  color: #6b7280;
  min-width: 96px;
}
.recharge-return__meta dd {
  color: #111827;
  margin: 0;
  word-break: break-all;
}
.recharge-return__actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.recharge-return__btn {
  background: #2563eb;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.recharge-return__btn:hover {
  background: #1d4ed8;
}
.recharge-return__btn--ghost {
  background: #fff;
  color: #2563eb;
  border: 1px solid #2563eb;
}
.recharge-return__btn--ghost:hover {
  background: #eff6ff;
}
</style>
