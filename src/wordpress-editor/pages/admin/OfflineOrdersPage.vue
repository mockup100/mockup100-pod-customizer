<template>
  <div class="offline-orders-page" data-testid="admin-offline-orders-page">
    <div class="page-header">
      <h1 class="page-title"><span class="page-emoji" aria-hidden="true">💸</span> {{ localize("Offline Orders", "线下订单") }}</h1>
      <p class="page-subtitle">{{ localize("Record offline payments (bank transfer / Wise / check). After review, tokens are credited or WP Pro / Grading is activated for the buyer account.", "录入线下收款（银行转账 / Wise / 支票），确认后将给账号充入 token 或开通 WP Pro / Grading。") }}</p>
      <p class="page-hint">{{ localize("Need help with reconciliation? Contact csl@mockup100.com — Zhuhai Baifeng Network Technology Co., Ltd.", "对账如有疑问，请联系 csl@mockup100.com — Zhuhai Baifeng Network Technology Co., Ltd.") }}</p>
      <div class="header-actions">
        <button type="button" class="btn-primary" @click="openManualModal">
          ＋ {{ localize("Create Manual Order", "新建线下订单") }}
        </button>
      </div>
      <p v-if="pageNotice" class="page-notice">{{ pageNotice }}</p>
      <p v-if="pageError" class="page-error">
        {{ pageError }}
        <button type="button" class="btn-link" @click="reload">{{ localize("Retry", "重试") }}</button>
      </p>
    </div>

    <section class="panel-card filter-card">
      <div class="filter-row">
        <label class="form-field">
          <span>{{ localize("Source Type", "来源类型") }}</span>
          <select v-model="filters.sourceType" class="unified-select">
            <option value="all">{{ localize("All", "全部") }}</option>
            <option value="offline">{{ localize("offline (manual)", "offline（手工）") }}</option>
            <option value="paypal">paypal</option>
            <option value="alipay">alipay</option>
          </select>
        </label>
        <label class="form-field">
          <span>{{ localize("Status", "状态") }}</span>
          <select v-model="filters.status" class="unified-select">
            <option value="all">{{ localize("All", "全部") }}</option>
            <option value="pending_confirm">pending_confirm</option>
            <option value="paid">paid</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
        <label class="form-field">
          <span>{{ localize("Tenant ID (optional)", "租户 ID（可选）") }}</span>
          <input v-model="filters.tenantId" type="text" :placeholder="localize('tenant_xxx', 'tenant_xxx')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Limit", "条数上限") }}</span>
          <input v-model.number="filters.limit" type="number" min="1" max="500" />
        </label>
        <button class="btn-primary" :disabled="loading" @click="reload">
          {{ loading ? localize("Loading...", "加载中...") : localize("Refresh", "刷新") }}
        </button>
      </div>
    </section>

    <section class="panel-card">
      <div class="section-heading">
        <h2 class="panel-title">{{ localize("Order list", "订单列表") }}</h2>
        <span class="status-chip neutral">{{ records.length }} {{ localize("records", "条记录") }}</span>
      </div>
      <div v-if="loading && !records.length" class="empty-state">
        <span class="empty-emoji" aria-hidden="true">⏳</span>
        {{ localize("Loading orders...", "加载订单中...") }}
      </div>
      <div v-else-if="records.length" class="table-list">
        <div v-for="row in records" :key="orderId(row)" class="table-row">
          <div class="row-main">
            <div class="row-title">
              <strong>{{ orderId(row) }}</strong>
              <span class="status-chip" :class="statusClass(orderStatus(row))">{{ orderStatus(row) || "—" }}</span>
              <span class="status-chip neutral">{{ sourceType(row) || "—" }}</span>
            </div>
            <div class="row-meta">
              <span>{{ localize("Tenant", "租户") }}: {{ tenantId(row) || "—" }}</span>
              <span>{{ localize("Email", "邮箱") }}: {{ email(row) || "—" }}</span>
              <span>{{ localize("Tokens", "令牌") }}: {{ tokens(row) }}</span>
              <span>{{ localize("Amount", "金额") }}: {{ amountLabel(row) }}</span>
              <span>{{ localize("Payment", "支付方式") }}: {{ paymentMethod(row) || "—" }}</span>
              <span>{{ localize("Reference", "凭据号") }}: {{ gatewayReference(row) || "—" }}</span>
              <span>{{ localize("PayPal Order ID", "PayPal 订单号") }}: {{ paypalOrderId(row) || "—" }}</span>
              <span>{{ localize("Receipt URL", "票据链接") }}: {{ receiptUrl(row) || "—" }}</span>
              <span>{{ localize("Entry Type", "入账类型") }}: {{ entryType(row) || "—" }}</span>
              <span>{{ localize("Created", "创建时间") }}: {{ createdAt(row) || "—" }}</span>
              <span>{{ localize("Reviewer", "审核人") }}: {{ reviewer(row) || "—" }}</span>
              <span>{{ localize("Reviewed At", "审核时间") }}: {{ reviewedAt(row) || "—" }}</span>
            </div>
            <div v-if="note(row)" class="row-note">{{ localize("Note", "备注") }}: {{ note(row) }}</div>
          </div>
          <div class="row-side">
            <button
              v-if="canConfirm(row)"
              class="btn-primary"
              :disabled="confirming === orderId(row)"
              @click="confirmOrder(row)"
            >
              {{ confirming === orderId(row) ? localize("Confirming...", "确认中...") : localize("Approve & Settle", "审核通过") }}
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <span class="empty-emoji" aria-hidden="true">📭</span>
        {{ localize("No orders matching the filters.", "没有符合筛选条件的订单。") }}
      </div>
    </section>

    <!-- F4: Create Manual Order modal -->
    <div v-if="manualModalOpen" class="modal-backdrop" @click.self="closeManualModal">
      <div class="modal-card" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2 class="modal-title">{{ localize("Create Manual Offline Order", "新建线下订单") }}</h2>
          <button type="button" class="modal-close" @click="closeManualModal" aria-label="Close">×</button>
        </header>
        <div class="modal-body">
          <label class="form-field">
            <span>{{ localize("Buyer Email", "买家邮箱") }} <em>*</em></span>
            <input v-model="manualForm.email" type="email" required :placeholder="localize('user@example.com', 'user@example.com')" />
          </label>
          <label class="form-field">
            <span>{{ localize("Product Type", "产品类型") }} <em>*</em></span>
            <select v-model="manualForm.productType" class="unified-select">
              <option value="token">{{ localize("Token Top-up", "Token 充值") }}</option>
              <option value="wp_pro">{{ localize("WP Pro (lifetime)", "WP Pro（终身）") }}</option>
              <option value="grading_standard">{{ localize("Grading Standard (monthly)", "Grading 标准版（月度）") }}</option>
              <option value="grading_enterprise">{{ localize("Grading Enterprise (monthly)", "Grading 企业版（月度）") }}</option>
            </select>
          </label>
          <label v-if="manualForm.productType === 'token'" class="form-field">
            <span>{{ localize("Tokens", "令牌数") }} <em>*</em></span>
            <input v-model.number="manualForm.tokens" type="number" min="1" required />
          </label>
          <label class="form-field">
            <span>{{ localize("Amount (USD)", "金额（USD）") }} <em>*</em></span>
            <input v-model.number="manualForm.amountUsd" type="number" step="0.01" min="0" required />
          </label>
          <label class="form-field">
            <span>{{ localize("Payment Method", "支付方式") }}</span>
            <select v-model="manualForm.paymentMethod" class="unified-select">
              <option value="bank_transfer">bank_transfer</option>
              <option value="wise">wise</option>
              <option value="check">check</option>
              <option value="cash">cash</option>
              <option value="other">other</option>
            </select>
          </label>
          <label class="form-field">
            <span>{{ localize("Reference / Receipt No.", "凭据号 / 票据号") }}</span>
            <input v-model="manualForm.gatewayReference" type="text" />
          </label>
          <label class="form-field form-field-wide">
            <span>{{ localize("Note", "备注") }}</span>
            <textarea v-model="manualForm.note" rows="2"></textarea>
          </label>
          <p v-if="manualError" class="page-error">{{ manualError }}</p>
        </div>
        <footer class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeManualModal">{{ localize("Cancel", "取消") }}</button>
          <button type="button" class="btn-primary" :disabled="manualSubmitting" @click="submitManualOrder">
            {{ manualSubmitting ? localize("Submitting...", "提交中...") : localize("Submit", "提交") }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { platformFetch } from "../../api/client"

// Spec Task 15：管理后台线下订单确认页 — GET /admin/billing/orders 列表 + POST /{id}/confirm。
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

type OrderRow = Record<string, unknown>

const filters = ref({
  sourceType: "offline",
  status: "pending_confirm",
  tenantId: "",
  limit: 100,
})
const records = ref<OrderRow[]>([])
const loading = ref(false)
const confirming = ref<string>("")
const pageNotice = ref("")
const pageError = ref("")

function orderId(row: OrderRow) {
  return String(row.order_id ?? row.orderId ?? "")
}
function tenantId(row: OrderRow) {
  return String(row.tenant_id ?? row.tenantId ?? "")
}
function email(row: OrderRow) {
  return String(row.email ?? row.account_email ?? row.accountEmail ?? "")
}
function tokens(row: OrderRow) {
  return Number(row.tokens ?? row.token_amount ?? 0)
}
function amountLabel(row: OrderRow) {
  const cents = Number(row.amount_cents ?? row.amountCents ?? 0)
  const currency = String(row.currency ?? row.amount_currency ?? "USD")
  if (!cents) return "—"
  return `${(cents / 100).toFixed(2)} ${currency}`
}
function paymentMethod(row: OrderRow) {
  return String(row.payment_method ?? row.paymentMethod ?? "")
}
function gatewayReference(row: OrderRow) {
  return String(row.gateway_reference ?? row.gatewayReference ?? "")
}
function note(row: OrderRow) {
  return String(row.note ?? "")
}
function sourceType(row: OrderRow) {
  return String(row.source_type ?? row.sourceType ?? "")
}
function orderStatus(row: OrderRow) {
  return String(row.status ?? row.payment_status ?? "")
}
function createdAt(row: OrderRow) {
  return String(row.created_at ?? row.createdAt ?? "")
}
function paypalOrderId(row: OrderRow) {
  return String(row.paypal_order_id ?? row.paypalOrderId ?? "")
}
function receiptUrl(row: OrderRow) {
  return String(row.receipt_url ?? row.receiptUrl ?? "")
}
function entryType(row: OrderRow) {
  return String(row.entry_type ?? row.entryType ?? "")
}
function reviewer(row: OrderRow) {
  return String(row.reviewer ?? row.reviewed_by ?? row.reviewedBy ?? "")
}
function reviewedAt(row: OrderRow) {
  return String(row.reviewed_at ?? row.reviewedAt ?? "")
}
function statusClass(status: string) {
  const lower = status.toLowerCase()
  if (lower === "paid") return "settled"
  if (lower === "pending_confirm" || lower === "pending") return "pending"
  if (lower === "cancelled" || lower === "failed") return "reversed"
  return "neutral"
}

const canConfirm = computed(() => (row: OrderRow) => {
  return orderStatus(row).toLowerCase() === "pending_confirm"
})

async function reload() {
  loading.value = true
  pageError.value = ""
  pageNotice.value = ""
  try {
    const params = new URLSearchParams()
    if (filters.value.sourceType && filters.value.sourceType !== "all") params.set("sourceType", filters.value.sourceType)
    if (filters.value.status && filters.value.status !== "all") params.set("status", filters.value.status)
    if (filters.value.tenantId.trim()) params.set("tenantId", filters.value.tenantId.trim())
    const limit = Math.max(1, Math.min(500, Number(filters.value.limit) || 100))
    params.set("limit", String(limit))
    const data = await platformFetch<{ records?: OrderRow[]; total?: number }>(
      `/api/v1/admin/billing/orders?${params.toString()}`,
      { headers: { ...authStore.authHeaders } },
    )
    records.value = Array.isArray(data?.records) ? data.records : []
  } catch (error) {
    // F3: 500 fallback — show empty state instead of crashing the page
    records.value = []
    const msg = String((error as Error)?.message || error || "")
    pageError.value = msg
      ? localize(`Failed to load orders: ${msg}`, `加载订单失败：${msg}`)
      : localize("Failed to load orders. Please retry.", "加载订单失败，请重试。")
  } finally {
    loading.value = false
  }
}

// F4: Create Manual Order
const manualModalOpen = ref(false)
const manualSubmitting = ref(false)
const manualError = ref("")
const manualForm = ref({
  email: "",
  productType: "token" as "token" | "wp_pro" | "grading_standard" | "grading_enterprise",
  tokens: 0,
  amountUsd: 0,
  paymentMethod: "bank_transfer",
  gatewayReference: "",
  note: "",
})

function openManualModal() {
  manualForm.value = {
    email: "",
    productType: "token",
    tokens: 0,
    amountUsd: 0,
    paymentMethod: "bank_transfer",
    gatewayReference: "",
    note: "",
  }
  manualError.value = ""
  manualModalOpen.value = true
}

function closeManualModal() {
  if (manualSubmitting.value) return
  manualModalOpen.value = false
}

async function submitManualOrder() {
  if (manualSubmitting.value) return
  manualError.value = ""
  const form = manualForm.value
  if (!form.email.trim()) {
    manualError.value = localize("Buyer email is required.", "请填写买家邮箱。")
    return
  }
  if (form.productType === "token" && (!form.tokens || form.tokens <= 0)) {
    manualError.value = localize("Tokens must be greater than 0 for token top-up.", "Token 充值的令牌数必须大于 0。")
    return
  }
  if (form.amountUsd < 0) {
    manualError.value = localize("Amount must be non-negative.", "金额不能为负。")
    return
  }
  manualSubmitting.value = true
  try {
    const amountCents = Math.round(Number(form.amountUsd || 0) * 100)
    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      productType: form.productType,
      amountCents,
      currency: "USD",
      paymentMethod: form.paymentMethod,
      gatewayReference: form.gatewayReference,
      note: form.note,
      sourceType: "manual_offline",
    }
    if (form.productType === "token") {
      payload.tokens = Number(form.tokens)
    }
    await platformFetch("/api/v1/admin/billing/orders/manual", {
      method: "POST",
      headers: { ...authStore.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    pageNotice.value = localize(
      "Manual offline order created. Please review pending entry below.",
      "线下订单已创建，请在下方列表中审核。",
    )
    manualModalOpen.value = false
    await reload()
  } catch (error) {
    manualError.value = String((error as Error)?.message || error || localize("Failed to create order.", "创建订单失败。"))
  } finally {
    manualSubmitting.value = false
  }
}

async function confirmOrder(row: OrderRow) {
  const id = orderId(row)
  if (!id) return
  confirming.value = id
  pageError.value = ""
  pageNotice.value = ""
  try {
    await platformFetch(`/api/v1/admin/billing/orders/${encodeURIComponent(id)}/confirm`, {
      method: "POST",
      headers: { ...authStore.authHeaders, "Content-Type": "application/json" },
    })
    pageNotice.value = localize(`Order ${id} confirmed and tokens credited.`, `订单 ${id} 已确认并完成 token 兑现。`)
    await reload()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to confirm order.", "确认订单失败。"))
  } finally {
    confirming.value = ""
  }
}

onMounted(() => {
  void reload()
})

watch(
  () => [filters.value.sourceType, filters.value.status],
  () => {
    void reload()
  },
)
</script>

<style scoped>
.offline-orders-page { display: flex; flex-direction: column; gap: 1rem; }
.page-header {
  padding: 1.25rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.page-title { margin: 0; font-size: 1.5rem; color: #111827; display: flex; align-items: center; gap: 0.5rem; }
.page-emoji { font-size: 1.5rem; line-height: 1; }
.page-subtitle { margin: 0.4rem 0 0; color: #6b7280; font-size: 0.9rem; line-height: 1.55; }
.page-hint { margin: 0.35rem 0 0; color: #9ca3af; font-size: 0.8rem; }
.page-notice { margin: 0.6rem 0 0; color: #047857; font-size: 0.875rem; }
.page-error { margin: 0.6rem 0 0; color: #b91c1c; font-size: 0.875rem; }
.panel-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.panel-title { margin: 0; font-size: 1.05rem; color: #111827; }
.section-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.filter-card { padding: 1rem 1.25rem; }
.filter-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 0.85rem;
  align-items: end;
}
.form-field { display: flex; flex-direction: column; gap: 0.35rem; color: #374151; min-width: 0; font-size: 0.85rem; }
.form-field input, .form-field select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  background: #fff;
  font-size: 0.875rem;
  color: #111827;
}
.form-field input:focus, .form-field select:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.unified-select { appearance: none; }
.btn-primary {
  border: 0;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  background: #0ea5e9;
  color: #fff;
  transition: background 0.15s ease;
}
.btn-primary:hover:not(:disabled) { background: #0284c7; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.table-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.table-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  transition: background 0.15s ease;
}
.table-row:hover { background: #f3f4f6; }
.table-row:last-child { border-bottom: 0; }
.row-main { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
.row-title { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; color: #111827; }
.row-meta { display: flex; gap: 0.85rem; flex-wrap: wrap; color: #6b7280; font-size: 0.85rem; }
.row-note { color: #374151; font-size: 0.85rem; }
.row-side { display: flex; align-items: flex-start; gap: 0.5rem; }
.status-chip {
  display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px;
  font-size: 0.75rem; font-weight: 600; text-transform: capitalize;
  line-height: 1.4;
}
.status-chip.neutral { background: #f3f4f6; color: #374151; }
.status-chip.pending { background: #fef3c7; color: #92400e; }
.status-chip.settled { background: #dcfce7; color: #166534; }
.status-chip.reversed { background: #fee2e2; color: #b91c1c; }
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.5rem; color: #6b7280; padding: 2rem 0; text-align: center;
}
.empty-emoji { font-size: 1.75rem; }
.header-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.6rem; }
.btn-secondary {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
}
.btn-secondary:hover { background: #f3f4f6; }
.btn-link {
  margin-left: 0.5rem;
  background: transparent;
  border: 0;
  color: #1d4ed8;
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  font-size: inherit;
}

/* F4 Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; padding: 1.5rem;
}
.modal-card {
  background: #fff; border-radius: 16px;
  width: min(560px, 100%); max-height: calc(100vh - 4rem);
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.25);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb;
}
.modal-title { margin: 0; font-size: 1.05rem; color: #111827; }
.modal-close {
  background: transparent; border: 0; font-size: 1.5rem;
  line-height: 1; color: #6b7280; cursor: pointer; padding: 0 0.25rem;
}
.modal-body {
  padding: 1.25rem; display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.85rem; overflow-y: auto;
}
.modal-body .form-field-wide { grid-column: 1 / -1; }
.modal-body .form-field span em { color: #dc2626; font-style: normal; margin-left: 0.15rem; }
.modal-body textarea {
  border: 1px solid #d1d5db; border-radius: 8px;
  padding: 0.5rem 0.75rem; font-size: 0.875rem; font-family: inherit;
  resize: vertical;
}
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  padding: 0.85rem 1.25rem; border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}
@media (max-width: 600px) {
  .modal-body { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .filter-row { grid-template-columns: 1fr; }
  .table-row { flex-direction: column; align-items: flex-start; }
}
</style>
