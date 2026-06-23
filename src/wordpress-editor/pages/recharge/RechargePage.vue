<template>
  <div class="recharge-checkout">
    <header class="recharge-checkout__header">
      <h1>{{ t("recharge.checkout.title") }}</h1>
      <p>{{ t("recharge.checkout.subtitle") }}</p>
    </header>

    <section class="recharge-checkout__packages" v-if="packages.length">
      <article
        v-for="pkg in packages"
        :key="pkg.code"
        class="pkg-card"
        :class="{ 'pkg-card--active': selectedCode === pkg.code }"
        @click="selectPackage(pkg.code)"
      >
        <h2 class="pkg-card__name">{{ packageName(pkg) }}</h2>
        <p class="pkg-card__desc">{{ packageDesc(pkg) }}</p>
        <div class="pkg-card__price">
          <span class="pkg-card__amount">{{ pkg.currency }} {{ formatPrice(pkg.price) }}</span>
          <span class="pkg-card__tokens">{{ formatTokens(pkg.tokens) }} {{ t("recharge.checkout.tokensSuffix") }}</span>
        </div>
        <button type="button" class="pkg-card__cta" :class="{ 'pkg-card__cta--active': selectedCode === pkg.code }">
          {{ selectedCode === pkg.code ? t("recharge.checkout.selected") : t("recharge.checkout.selectCta") }}
        </button>
      </article>
    </section>

    <section v-if="selectedCode" class="recharge-checkout__pay">
      <h2>{{ t("recharge.checkout.paySectionTitle") }}</h2>
      <p class="recharge-checkout__pay-hint">{{ t("recharge.checkout.paySectionHint") }}</p>

      <div v-if="payStatus" class="recharge-checkout__status" :class="`recharge-checkout__status--${payStatusKind}`">
        {{ payStatus }}
      </div>

      <div v-if="!sdkReady && !sdkError" class="recharge-checkout__loading">
        {{ t("recharge.checkout.loadingPaypal") }}
      </div>
      <div v-if="sdkError" class="recharge-checkout__loading recharge-checkout__loading--err">
        {{ t("recharge.checkout.paypalUnavailable") }}
      </div>

      <div ref="paypalContainer" class="recharge-checkout__paypal"></div>
    </section>

    <p class="recharge-checkout__back">
      <RouterLink to="/admin/billing">{{ t("recharge.checkout.backToTracks") }}</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter, RouterLink } from "vue-router"
import { platformFetch } from "../../api/client"
import { UI_LOCALE_STORAGE_KEY } from "../../stores/uiLocale"

interface PayPalConfig {
  clientId: string
  mode: string
  ready: boolean
  returnUrl?: string
  cancelUrl?: string
}
interface TokenPkg {
  code: string
  tokens: number
  price: number | string
  currency: string
  i18nNameKey?: string
  sortOrder?: number
}
interface CreateOrderResp {
  orderNo: string
  paypalOrderId: string
  approveUrl: string
  amount: number | string
  currency: string
  tokens: number
}
interface CaptureResp {
  orderNo: string
  status: string
  captureId?: string
  tokensGranted?: number
}

const { t, te } = useI18n()
const router = useRouter()

const config = ref<PayPalConfig | null>(null)
const packages = ref<TokenPkg[]>([])
const selectedCode = ref<string>("")
const sdkReady = ref<boolean>(false)
const sdkError = ref<boolean>(false)
const payStatus = ref<string>("")
const payStatusKind = ref<"info" | "success" | "error">("info")
const paypalContainer = ref<HTMLElement | null>(null)

let buttonsInstance: { close?: () => void } | null = null

const sdkLocale = computed(() => {
  const lang = typeof window === "undefined" ? "en" : window.localStorage.getItem(UI_LOCALE_STORAGE_KEY)
  return lang === "zh" ? "zh_CN" : "en_US"
})

function setStatus(message: string, kind: "info" | "success" | "error" = "info") {
  payStatus.value = message
  payStatusKind.value = kind
}

function packageName(pkg: TokenPkg): string {
  const key = pkg.i18nNameKey && te(pkg.i18nNameKey + ".name") ? pkg.i18nNameKey + ".name" : `recharge.packages.${pkg.code.split("_")[0]}.name`
  return te(key) ? t(key) : pkg.code
}
function packageDesc(pkg: TokenPkg): string {
  const key = pkg.i18nNameKey && te(pkg.i18nNameKey + ".desc") ? pkg.i18nNameKey + ".desc" : `recharge.packages.${pkg.code.split("_")[0]}.desc`
  return te(key) ? t(key) : ""
}
function formatPrice(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : String(value)
}
function formatTokens(value: number): string {
  return Number(value || 0).toLocaleString()
}

async function loadConfigAndPackages() {
  try {
    const [cfg, pkgs] = await Promise.all([
      platformFetch<PayPalConfig>("/api/payments/paypal/config"),
      platformFetch<TokenPkg[]>("/api/payments/paypal/packages"),
    ])
    config.value = cfg
    packages.value = (pkgs || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    if (!selectedCode.value && packages.value.length) {
      selectedCode.value = packages.value[0].code
    }
  } catch (e) {
    console.error("[recharge] load config failed", e)
    sdkError.value = true
  }
}

function loadPayPalSdk(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"))
      return
    }
    const w = window as typeof window & { paypal?: unknown }
    if (w.paypal) {
      resolve()
      return
    }
    const existing = document.querySelector('script[data-recharge-paypal-sdk="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("sdk load error")), { once: true })
      return
    }
    const url = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&locale=${sdkLocale.value}`
    const script = document.createElement("script")
    script.src = url
    script.async = true
    script.dataset.rechargePaypalSdk = "1"
    script.addEventListener("load", () => resolve(), { once: true })
    script.addEventListener("error", () => reject(new Error("sdk load error")), { once: true })
    document.head.appendChild(script)
  })
}

function selectPackage(code: string) {
  if (selectedCode.value === code) return
  selectedCode.value = code
}

async function ensureButtons() {
  if (typeof window === "undefined") return
  const w = window as typeof window & { paypal?: { Buttons?: (opts: Record<string, unknown>) => { render: (el: Element) => Promise<void>; close?: () => void } } }
  if (!w.paypal || !w.paypal.Buttons || !paypalContainer.value || !selectedCode.value) return
  if (buttonsInstance && typeof buttonsInstance.close === "function") {
    try { buttonsInstance.close() } catch { /* noop */ }
    buttonsInstance = null
  }
  paypalContainer.value.innerHTML = ""
  const instance = w.paypal.Buttons({
    style: { layout: "vertical", shape: "rect", label: "paypal" },
    createOrder: async () => {
      setStatus(t("recharge.checkout.orderCreating"), "info")
      try {
        const resp = await platformFetch<CreateOrderResp>("/api/payments/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageCode: selectedCode.value, locale: sdkLocale.value }),
        })
        setStatus("", "info")
        return resp.paypalOrderId
      } catch (e) {
        const msg = (e as Error)?.message || ""
        setStatus(t("recharge.checkout.orderFailed", { message: msg }), "error")
        throw e
      }
    },
    onApprove: async (data: { orderID: string }) => {
      setStatus(t("recharge.checkout.captureProcessing"), "info")
      try {
        const orderNo = await resolveOrderNoByPaypalId(data.orderID)
        if (!orderNo) {
          throw new Error("order_no missing")
        }
        const resp = await platformFetch<CaptureResp>("/api/payments/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo }),
        })
        setStatus(t("recharge.checkout.captureSuccess", { tokens: resp.tokensGranted ?? 0 }), "success")
        router.push({ path: "/recharge/return", query: { orderNo: resp.orderNo } })
      } catch (e) {
        const msg = (e as Error)?.message || ""
        setStatus(t("recharge.checkout.captureFailed", { message: msg }), "error")
      }
    },
    onCancel: async (data: { orderID?: string }) => {
      setStatus(t("recharge.checkout.cancelled"), "info")
      const orderNo = data?.orderID ? await resolveOrderNoByPaypalId(data.orderID) : ""
      if (orderNo) {
        try {
          await platformFetch("/api/payments/paypal/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNo }),
          })
        } catch (e) {
          console.warn("[recharge] cancel failed", e)
        }
        router.push({ path: "/recharge/cancel", query: { orderNo } })
      }
    },
    onError: (err: unknown) => {
      console.error("[recharge] paypal error", err)
      setStatus(t("recharge.checkout.paypalUnavailable"), "error")
    },
  })
  buttonsInstance = instance
  await instance.render(paypalContainer.value)
}

const paypalIdToOrderNo = new Map<string, string>()

async function resolveOrderNoByPaypalId(paypalOrderId: string): Promise<string> {
  if (paypalIdToOrderNo.has(paypalOrderId)) {
    return paypalIdToOrderNo.get(paypalOrderId) || ""
  }
  return ""
}

// Wrap createOrder so we can also remember mapping for onApprove/onCancel.
async function bootstrap() {
  await loadConfigAndPackages()
  if (!config.value || !config.value.clientId || !config.value.ready) {
    sdkError.value = true
    return
  }
  try {
    await loadPayPalSdk(config.value.clientId)
    sdkReady.value = true
    await ensureButtons()
  } catch (e) {
    console.error("[recharge] sdk load fail", e)
    sdkError.value = true
  }
}

watch(selectedCode, async () => {
  if (sdkReady.value) {
    await ensureButtons()
  }
})

onMounted(() => {
  bootstrap()
})

// Patch: re-define createOrder to capture orderNo mapping. We monkey-patch
// the platformFetch result via a wrapper used inside `ensureButtons` above.
// Because ensureButtons captures `selectedCode`, we instead override the
// createOrder closure by tracking the latest mapping.
async function trackedCreateOrder(): Promise<string> {
  const resp = await platformFetch<CreateOrderResp>("/api/payments/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageCode: selectedCode.value, locale: sdkLocale.value }),
  })
  paypalIdToOrderNo.set(resp.paypalOrderId, resp.orderNo)
  return resp.paypalOrderId
}

// Replace ensureButtons closure to use trackedCreateOrder by reassigning
// after first definition. We patch by re-rendering with a fresh Buttons
// when the SDK is ready in bootstrap → done in ensureButtonsV2.
async function ensureButtonsV2() {
  if (typeof window === "undefined") return
  const w = window as typeof window & { paypal?: { Buttons?: (opts: Record<string, unknown>) => { render: (el: Element) => Promise<void>; close?: () => void } } }
  if (!w.paypal || !w.paypal.Buttons || !paypalContainer.value || !selectedCode.value) return
  if (buttonsInstance && typeof buttonsInstance.close === "function") {
    try { buttonsInstance.close() } catch { /* noop */ }
    buttonsInstance = null
  }
  paypalContainer.value.innerHTML = ""
  const instance = w.paypal.Buttons({
    style: { layout: "vertical", shape: "rect", label: "paypal" },
    createOrder: async () => {
      setStatus(t("recharge.checkout.orderCreating"), "info")
      try {
        const id = await trackedCreateOrder()
        setStatus("", "info")
        return id
      } catch (e) {
        const msg = (e as Error)?.message || ""
        setStatus(t("recharge.checkout.orderFailed", { message: msg }), "error")
        throw e
      }
    },
    onApprove: async (data: { orderID: string }) => {
      setStatus(t("recharge.checkout.captureProcessing"), "info")
      const orderNo = paypalIdToOrderNo.get(data.orderID) || ""
      if (!orderNo) {
        setStatus(t("recharge.checkout.captureFailed", { message: "order_no missing" }), "error")
        return
      }
      try {
        const resp = await platformFetch<CaptureResp>("/api/payments/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo }),
        })
        setStatus(t("recharge.checkout.captureSuccess", { tokens: resp.tokensGranted ?? 0 }), "success")
        router.push({ path: "/recharge/return", query: { orderNo: resp.orderNo } })
      } catch (e) {
        const msg = (e as Error)?.message || ""
        setStatus(t("recharge.checkout.captureFailed", { message: msg }), "error")
      }
    },
    onCancel: async (data: { orderID?: string }) => {
      setStatus(t("recharge.checkout.cancelled"), "info")
      const orderNo = data?.orderID ? paypalIdToOrderNo.get(data.orderID) || "" : ""
      if (orderNo) {
        try {
          await platformFetch("/api/payments/paypal/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNo }),
          })
        } catch (e) {
          console.warn("[recharge] cancel failed", e)
        }
        router.push({ path: "/recharge/cancel", query: { orderNo } })
      }
    },
    onError: (err: unknown) => {
      console.error("[recharge] paypal error", err)
      setStatus(t("recharge.checkout.paypalUnavailable"), "error")
    },
  })
  buttonsInstance = instance
  await instance.render(paypalContainer.value)
}

// Override ensureButtons references with v2 in lifecycle hooks above.
// (Use after-bootstrap monkey-replace is unnecessary — re-export here.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ensureButtonsActive = ensureButtonsV2
</script>

<style scoped>
.recharge-checkout {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}
.recharge-checkout__header h1 {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 6px;
}
.recharge-checkout__header p {
  margin: 0 0 24px;
  color: #555;
}
.recharge-checkout__packages {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.pkg-card {
  border: 1px solid #e3e6eb;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pkg-card:hover {
  border-color: #2563eb;
}
.pkg-card--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.pkg-card__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.pkg-card__desc {
  margin: 0;
  color: #555;
  font-size: 13px;
  line-height: 1.5;
  min-height: 38px;
}
.pkg-card__price {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}
.pkg-card__amount {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}
.pkg-card__tokens {
  font-size: 13px;
  color: #4b5563;
}
.pkg-card__cta {
  margin-top: 8px;
  align-self: flex-start;
  border: 1px solid #2563eb;
  background: #fff;
  color: #2563eb;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}
.pkg-card__cta--active {
  background: #2563eb;
  color: #fff;
}
.recharge-checkout__pay h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px;
}
.recharge-checkout__pay-hint {
  color: #555;
  margin: 0 0 14px;
}
.recharge-checkout__loading {
  color: #555;
  margin-bottom: 12px;
}
.recharge-checkout__loading--err {
  color: #b91c1c;
}
.recharge-checkout__status {
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 14px;
}
.recharge-checkout__status--info {
  background: #eff6ff;
  color: #1d4ed8;
}
.recharge-checkout__status--success {
  background: #ecfdf5;
  color: #047857;
}
.recharge-checkout__status--error {
  background: #fef2f2;
  color: #b91c1c;
}
.recharge-checkout__paypal {
  min-height: 50px;
}
.recharge-checkout__back {
  margin-top: 28px;
  font-size: 13px;
}
.recharge-checkout__back a {
  color: #2563eb;
  text-decoration: none;
}
.recharge-checkout__back a:hover {
  text-decoration: underline;
}
</style>
