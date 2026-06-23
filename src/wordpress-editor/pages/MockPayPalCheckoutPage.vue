<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import BrandLogo from "../components/BrandLogo.vue"
import { useUiLocaleStore } from "../stores/uiLocale"

const route = useRoute()
const uiLocaleStore = useUiLocaleStore()

const orderId = computed(() => String(route.query.order_id || ""))
const tokens = computed(() => Number(route.query.tokens || 0))
const amountUsd = computed(() => (Number(route.query.amount_cents || 0) / 100).toFixed(2))
const returnUrl = computed(() => String(route.query.return_url || "/admin/tokens-management"))
const cancelUrl = computed(() => String(route.query.cancel_url || "/admin/tokens-management"))

const MOCK_PAYPAL_I18N = {
  en: {
    eyebrow: "Mock PayPal Checkout",
    title: "Review and approve the token purchase",
    order: "Order",
    tokens: "Tokens",
    amount: "Amount",
    fallbackOrder: "n/a",
    sandboxTitle: "Sandbox shortcut",
    sandboxDescription: "This local mock page replaces the real PayPal approval screen in development mode.",
    cancel: "Cancel payment",
    approve: "Approve and return",
  },
  zh: {
    eyebrow: "模拟 PayPal 结账",
    title: "确认并批准本次令牌购买",
    order: "订单",
    tokens: "令牌",
    amount: "金额",
    fallbackOrder: "无",
    sandboxTitle: "沙箱快捷页",
    sandboxDescription: "这个本地模拟页面会在开发模式下替代真实的 PayPal 批准页面。",
    cancel: "取消支付",
    approve: "批准并返回",
  },
} as const

function t(key: keyof typeof MOCK_PAYPAL_I18N.en) {
  return MOCK_PAYPAL_I18N[uiLocaleStore.locale === "zh" ? "zh" : "en"][key]
}

function approvePayment() {
  window.location.assign(returnUrl.value)
}

function cancelPayment() {
  window.location.assign(cancelUrl.value)
}
</script>

<template>
  <div class="mock-paypal-shell">
    <div class="mock-paypal-card">
      <div class="brand-row">
        <BrandLogo size="auth" />
        <div>
          <p class="eyebrow">{{ t("eyebrow") }}</p>
          <h1>{{ t("title") }}</h1>
        </div>
      </div>

      <div class="summary-grid">
        <article class="summary-item">
          <span>{{ t("order") }}</span>
          <strong>{{ orderId || t("fallbackOrder") }}</strong>
        </article>
        <article class="summary-item">
          <span>{{ t("tokens") }}</span>
          <strong>{{ tokens.toLocaleString() }}</strong>
        </article>
        <article class="summary-item">
          <span>{{ t("amount") }}</span>
          <strong>${{ amountUsd }}</strong>
        </article>
      </div>

      <div class="mock-note">
        <strong>{{ t("sandboxTitle") }}</strong>
        <p>{{ t("sandboxDescription") }}</p>
      </div>

      <div class="action-row">
        <button type="button" class="btn-secondary" @click="cancelPayment">{{ t("cancel") }}</button>
        <button type="button" class="btn-primary" @click="approvePayment">{{ t("approve") }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-paypal-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.18), transparent 34%),
    #f8fafc;
}

.mock-paypal-card {
  width: min(100%, 680px);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe3f0;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 1.25rem;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #0ea5e9;
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 1.9rem;
  color: #0f172a;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.summary-item {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.summary-item span {
  display: block;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-item strong {
  display: block;
  margin-top: 0.45rem;
  font-size: 1.2rem;
  color: #0f172a;
  word-break: break-word;
}

.mock-note {
  border-radius: 18px;
  padding: 1rem 1.1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.mock-note strong {
  display: block;
  margin-bottom: 0.3rem;
  color: #1d4ed8;
}

.mock-note p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  border: 0;
  border-radius: 14px;
  padding: 0.85rem 1.15rem;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary {
  color: #fff;
  background: linear-gradient(90deg, #10b981 0%, #6366f1 100%);
}

.btn-secondary {
  color: #334155;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

@media (max-width: 768px) {
  .mock-paypal-card {
    padding: 1.25rem;
  }

  .brand-row,
  .action-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .action-row > * {
    width: 100%;
  }
}
</style>
