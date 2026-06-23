<template>
  <div class="tokens-page" data-testid="admin-tokens-management-page">
    <div class="page-header">
      <div>
        <span class="page-eyebrow">{{ localize("Finance Workspace", "财务工作区") }}</span>
        <h1 class="page-title">🪙 {{ localize("Tokens Management", "令牌管理") }}</h1>
        <p class="page-subtitle">{{ localize("Buy token packs and monitor token balance without duplicating billing workspaces.", "购买令牌包并监控令牌余额，无需切换重复的计费工作区。") }}</p>
        <div class="header-badges">
          <span class="header-badge">{{ localize("One-time purchase", "一次性购买") }}</span>
          <span class="header-badge">{{ localize("PayPal checkout", "PayPal 结算") }}</span>
          <span class="header-badge warning">{{ localize("Post-settlement", "结算后入账") }}</span>
        </div>
      </div>
    </div>

    <section class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">{{ localize("Available Tokens", "可用令牌") }}</span>
        <strong>{{ tokenBalance }}</strong>
        <span class="summary-help">{{ localize("Ready to spend", "可立即使用") }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Alert Threshold", "提醒阈值") }}</span>
        <strong>{{ lowTokenThreshold }}</strong>
        <span class="summary-help">{{ localize("Refill point", "建议补充点") }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Tracked Tokens", "已跟踪令牌") }}</span>
        <strong>{{ trackedTokenTotal }}</strong>
        <span class="summary-help">{{ localize("Top-ups loaded into finance tracking", "已纳入财务跟踪的充值") }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ localize("Consumed Tokens", "已消耗令牌") }}</span>
        <strong>{{ totalConsumedTokens }}</strong>
        <span class="summary-help">{{ localize("Usage already charged to this workspace", "已计入当前工作区的使用量") }}</span>
      </div>
    </section>

    <section v-if="showTokenAlert" class="alert-card" :class="{ danger: isTokenDepleted }">
      <div>
        <h2>{{ isTokenDepleted ? localize("Tokens Depleted", "令牌已耗尽") : localize("Low Token Balance", "令牌余额偏低") }}</h2>
        <p>
          {{ isTokenDepleted
            ? localize("Paid renders are blocked until you buy a new pack. Console 512 previews stay free.", "付费渲染已被阻止，请先购买新的令牌包。控制台 512 预览仍然免费。")
            : localize(`Balance is below ${lowTokenThreshold}. Refill soon.`, `余额低于 ${lowTokenThreshold}，请尽快充值。`) }}
        </p>
      </div>
    </section>

    <!--
      Source of Truth: spec lock-mockup100-final-pricing-products-scheme §7.3 — recharge page MUST
      render the three frozen blocks (Token / Grading / WP Pro). Copy and prices are driven by the
      pricing catalog composable; the front-end never hard-codes prices.
    -->
    <section id="grading-subscription" class="grading-anchor" aria-hidden="true"></section>
    <section id="three-products" class="panel-card three-products-panel">
      <div class="panel-head-row">
        <div>
          <h2 class="panel-title">{{ localize("Tokens & Plans", "令牌与订阅") }}</h2>
          <p class="panel-copy">{{ localize("Three independent product lines. Each subscription gates exactly one feature group: Token tops up HD render & premium artwork, Grading unlocks multi-size grading, WP Pro adds bulk export & team management to WordPress.", "三条独立产品线。每个订阅只闸门一个功能组：Token 用于高清渲染与付费素材，Grading 解锁多尺寸放码，WP Pro 为 WordPress 增加批量导出与团队管理。") }}</p>
        </div>
      </div>
      <ThreeProductsBlock
        :loading="{ token: false, grading: subscribingGrading, wpPro: false }"
        @buyToken="scrollToTokenPacks"
        @subscribeGrading="subscribeGrading"
        @buyWpPro="openWpProStorefront"
      />
      <!-- Plan v5 §C.5：trial 进行中的倒计时披露。 -->
      <p v-if="trialDaysRemaining !== null" class="grading-trial-chip" data-testid="tokens-grading-trial-chip">
        {{ localize(`Trial · ${trialDaysRemaining} days remaining`, `试用中 · 剩余 ${trialDaysRemaining} 天`) }}
      </p>
      <!-- Plan v3 §S2.5：30 天免费试用入口（仅在 grading tier=none 且未用过 trial 时展示）。 -->
      <div v-if="canStartGradingTrial" class="grading-trial-card">
        <div class="grading-trial-copy">
          <span class="grading-trial-badge">{{ localize("Free 30-day trial", "免费试用 30 天") }}</span>
          <strong>{{ localize("Try Grading Standard free for 30 days", "免费试用 Grading 标准版 30 天") }}</strong>
          <p>{{ localize("New users can unlock multi-size grading on the web console & WordPress editor for 30 days — no credit card required.", "新用户可免费试用 30 天，解锁 Web 控制台与 WordPress 编辑器中的多尺寸放码，无需信用卡。") }}</p>
        </div>
        <button
          type="button"
          class="btn-primary grading-trial-button"
          :disabled="subscribingGrading"
          @click="startGradingTrial"
        >
          {{ subscribingGrading ? localize("Starting trial...", "正在开启试用...") : localize("Start free trial", "开始免费试用") }}
        </button>
      </div>
      <p v-if="gradingNotice" class="three-products-notice">{{ gradingNotice }}</p>
    </section>

    <section id="buy-token-packs" class="panel-card purchase-panel">
      <div class="panel-head-row">
        <div>
          <h2 class="panel-title">{{ localize("Buy Token Packs", "购买令牌包") }}</h2>
          <p class="panel-copy">{{ localize("Choose a package that matches your current output volume. Tokens are added instantly after PayPal settlement.", "选择适合你当前产出量的套餐。PayPal 结算完成后会立即增加令牌。") }}</p>
        </div>
        <div class="purchase-badges">
          <span class="mini-badge">{{ localize("One-time", "一次性") }}</span>
          <span class="mini-badge">{{ localize("No expiry", "不过期") }}</span>
          <span class="mini-badge">{{ localize("No refunds", "不退款") }}</span>
        </div>
      </div>
      <div v-if="purchaseSuccess" class="success-banner">{{ purchaseSuccess }}</div>
      <div v-if="purchaseError" class="error-banner">{{ purchaseError }}</div>
      <div class="purchase-intro">
        <div class="intro-card">
          <span class="intro-label">{{ localize("Included", "包含") }}</span>
          <strong>{{ localize("Instant token top-up after settlement", "结算后即时到账") }}</strong>
          <p>{{ localize("Each purchase is a one-time payment and the balance stays in your workspace until you use it.", "每次购买都是一次性支付，余额会保留在工作区中，直到被使用。") }}</p>
        </div>
        <div class="intro-card">
          <span class="intro-label">{{ localize("Recommended", "推荐") }}</span>
          <strong>{{ localize("Use larger packs for better effective unit pricing", "购买更大套餐可获得更优单价") }}</strong>
          <p>{{ localize("The more tokens you buy in one payment, the lower the per-token price becomes.", "单次购买的令牌越多，每个令牌的价格越低。") }}</p>
        </div>
      </div>
      <div class="package-grid">
        <div
          v-for="pack in tokenPacks"
          :key="pack.tokens"
          class="package-card"
          :class="{ featured: pack.featured, recommended: selectedPack === String(pack.tokens) }"
        >
          <div class="package-chip-row">
            <span v-if="pack.featured" class="package-chip featured">{{ localize("Most Popular", "最受欢迎") }}</span>
            <span v-if="selectedPack === String(pack.tokens)" class="package-chip selected">{{ localize("Selected", "已选择") }}</span>
          </div>
          <div class="package-topline">
            <strong>{{ pack.tokens.toLocaleString() }} {{ localize("Tokens", "令牌") }}</strong>
            <span class="package-price">${{ (pack.amountCents / 100).toFixed(0) }}</span>
          </div>
          <div class="package-meta">
            <span class="package-unit">{{ pack.unitLabel }}</span>
            <span class="package-caption">{{ pack.caption }}</span>
          </div>
          <ul class="package-features">
            <li v-for="feature in pack.features" :key="feature">{{ feature }}</li>
          </ul>
          <div class="package-footer">
            <div class="package-footer-copy">
              <strong>{{ pack.tokens.toLocaleString() }} tokens</strong>
              <span>{{ localize("One-time payment", "一次性支付") }}</span>
            </div>
            <button
              type="button"
              class="btn-primary package-button"
              :disabled="purchasingPack === pack.tokens"
              @click="buyPack(pack)"
            >
              {{ purchasingPack === pack.tokens ? localize("Redirecting...", "跳转中...") : localize("Buy Now", "立即购买") }}
            </button>
          </div>
        </div>
      </div>
      <div class="purchase-footnote">
        <span>{{ localize("Payments are processed with PayPal.", "支付通过 PayPal 处理。") }}</span>
        <span>{{ localize("Purchased tokens do not expire.", "已购买的令牌不会过期。") }}</span>
        <span>{{ localize("Orders appear in Billing after checkout starts.", "开始结算后，订单会出现在计费页中。") }}</span>
      </div>
    </section>

    <section class="panel-card usage-panel">
      <div class="panel-head-row">
        <div>
          <h2 class="panel-title">{{ localize("Usage Snapshot", "使用快照") }}</h2>
          <p class="panel-copy">{{ localize("This page focuses on token top-ups and render consumption. Artwork sales and earnings stay in Artwork Billing.", "本页聚焦于令牌充值和渲染消耗。作品销售与收益保留在作品计费页面中。") }}</p>
        </div>
        <div class="usage-links">
          <RouterLink to="/admin/billing#usage-ledger" class="btn-secondary">{{ localize("Open Usage Log", "打开使用日志") }}</RouterLink>
          <RouterLink to="/admin/artwork-billing" class="btn-secondary">{{ localize("Open Artwork Billing", "打开作品计费页面") }}</RouterLink>
        </div>
      </div>
      <div v-if="paginatedRenderRows.length" class="list-stack">
        <div v-for="item in paginatedRenderRows" :key="item.id" class="list-item">
          <div>
            <strong>{{ displaySizeLabel(item.size_tier) }}</strong>
            <p>{{ item.channel.toUpperCase() }} · {{ item.template_id || localize("unknown template", "未知模板") }} · {{ item.description }}</p>
          </div>
          <span>{{ item.output_count }} {{ localize("outputs", "个输出") }} · {{ item.tokens_used }} {{ localize("tokens", "令牌") }}</span>
        </div>
      </div>
      <div v-else class="empty-state">{{ localize("No billed outputs.", "暂无已计费输出。") }}</div>
      <PaginationBar
        v-if="renderRows.length"
        v-model:current-page="usagePage"
        :total-pages="usageTotalPages"
        :total-items="renderRows.length"
        :page-size="USAGE_PAGE_SIZE"
      />
      <div class="usage-footnote">
        {{ localize("Artwork usage details are tracked in the artwork commerce and earnings pages, not in token top-up records.", "作品使用明细记录在作品交易与收益页面中，不记录在令牌充值记录里。") }}
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRoute, useRouter } from "vue-router"
import PaginationBar from "../../components/PaginationBar.vue"
import ThreeProductsBlock from "../../components/ThreeProductsBlock.vue"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { usePlatformStore } from "../../stores/platform"
import { usePricingCatalog } from "../../composables/usePricingCatalog"
import { useUserCapabilities, fetchUserCapabilities } from "../../composables/useUserCapabilities"
// Plan v3 §S2.5：grading trial 接线需要 gateway fetch + ApiRequestError + 全局 toast。
import { gatewayPlatformFetch, ApiRequestError } from "../../api/client"
import { globalToast } from "../../composables/useToast"
// Plan v5 §C.3：Grading Subscribe 按钮接 PayPal Subscriptions 收银。
import { useGradingCheckout } from "../../composables/useGradingCheckout"
// Plan v5 §C.5：trial 倒计时披露。
import { useGradingTrialCountdown } from "../../composables/useGradingTrialCountdown"
import { buildBillingSummary, buildRenderRows, displaySizeLabel } from "./billingView"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"

const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const platformStore = usePlatformStore()
const route = useRoute()
const router = useRouter()
const buySectionHash = "#buy-token-packs"
const { billingEvents, tokenOrders, usage } = storeToRefs(platformStore)
const purchasingPack = ref<number | null>(null)
const purchaseError = ref("")
const purchaseSuccess = ref("")
const usagePage = ref(1)
const subscribingGrading = ref(false)
const gradingNotice = ref("")
const USAGE_PAGE_SIZE = 6

// Spec Task 14：管理员手动充值已迁移至 /admin/offline-orders。

const { fetchPricingCatalog } = usePricingCatalog()
// Plan v3 §S2.5：暴露 gradingTier / hasUsedGradingTrial 用于决定 trial CTA 是否显示及 query 自动开启逻辑。
const { capabilities, gradingTier, hasUsedGradingTrial } = useUserCapabilities()
// Plan v5 §C.3：Grading Subscribe 按钮接 PayPal Subscriptions 收银。
const { startCheckout: startGradingCheckout } = useGradingCheckout()
// Plan v5 §C.5：trial 倒计时披露。
const { daysRemaining: trialDaysRemaining } = useGradingTrialCountdown()

function scrollToTokenPacks() {
  const section = document.getElementById("buy-token-packs")
  if (!section) return
  section.scrollIntoView({ behavior: "smooth", block: "start" })
}

// Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Grading Subscription
function subscribeGrading() {
  if (
    capabilities.value.platform_grading_sub_tier !== "none" &&
    !capabilities.value.grading_is_trial
  ) {
    gradingNotice.value = localize(
      "Your Grading subscription is already active. Multi-size grading is unlocked on web console & WordPress editor.",
      "你的 Grading 订阅已经生效，Web 控制台与 WordPress 编辑器中的多尺寸放码已解锁。",
    )
    return
  }
  // Plan v5 §C.3：直接调 PayPal Subscriptions create-subscription → 重定向 approveUrl
  // → 用户在 PayPal 站点审批 → 回到 /grading/return 自动 activate。
  if (subscribingGrading.value) return
  subscribingGrading.value = true
  startGradingCheckout("standard")
    .catch((error: unknown) => {
      const fallback = localize(
        "Could not start PayPal checkout. Please try again.",
        "无法启动 PayPal 收银，请稍后再试。",
      )
      const msg =
        error instanceof ApiRequestError && typeof error.message === "string" && error.message
          ? error.message
          : fallback
      globalToast.error(msg)
    })
    .finally(() => {
      subscribingGrading.value = false
    })
}

// Plan v3 §S2.5：Grading 30-day self-serve trial。POST /subscriptions/grading/trial（client.ts 白名单
// 映射为 /api/v1/api/subscriptions/grading/trial）；成功后刷新 capabilities 并 toast。
async function startGradingTrial() {
  if (subscribingGrading.value) return
  if (!authStore.isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.assign("/auth?mode=register&redirect=/admin/tokens-management?intent=grading-trial")
    }
    return
  }
  subscribingGrading.value = true
  try {
    await gatewayPlatformFetch<unknown>("/subscriptions/grading/trial", {
      method: "POST",
      headers: { ...authStore.authHeaders },
    })
    await fetchUserCapabilities()
    globalToast.success(
      localize(
        "Trial started — your 30-day Grading access is now active.",
        "试用已开启 —— 你的 30 天 Grading 权限已生效。",
      ),
    )
    gradingNotice.value = localize(
      "Your 30-day Grading trial is active. Multi-size grading is unlocked on web console & WordPress editor.",
      "你的 30 天 Grading 试用已激活。Web 控制台与 WordPress 编辑器的多尺寸放码已解锁。",
    )
  } catch (error) {
    const fallback = localize(
      "Could not start the trial. Please try Subscribe instead.",
      "无法启动试用，请尝试直接订阅。",
    )
    const msg =
      error instanceof ApiRequestError && typeof error.message === "string" && error.message
        ? error.message
        : fallback
    globalToast.error(msg)
  } finally {
    subscribingGrading.value = false
  }
}

// WP Pro is sold exclusively on mockup100.com (spec §WP Pro Sold Only Off-store).
function openWpProStorefront() {
  if (typeof window === "undefined") return
  window.open("https://www.mockup100.com/wp-pro", "_blank", "noopener,noreferrer")
}

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const tokenPacks = computed(() => [
  {
    tokens: 2000,
    amountCents: 500,
    unitLabel: localize("$0.0025 per token", "每个 token $0.0025"),
    caption: localize("Best for first live projects and small-volume weekly usage.", "适合首个正式项目和每周小批量使用。"),
    features: [
      localize("Starter package", "入门套餐"),
      localize("Fast top-up", "快速充值"),
      localize("Good for testing production checkout", "适合测试正式结算流程"),
    ],
    featured: false,
  },
  {
    tokens: 10000,
    amountCents: 2000,
    unitLabel: localize("$0.0020 per token", "每个 token $0.0020"),
    caption: localize("Balanced pricing for regular creator and API workloads.", "适合常规创作者和 API 工作负载的平衡定价。"),
    features: [
      localize("Most popular tier", "最受欢迎档位"),
      localize("Better unit price", "更优单价"),
      localize("Great for monthly operations", "适合月度运营"),
    ],
    featured: true,
  },
  {
    tokens: 50000,
    amountCents: 8000,
    unitLabel: localize("$0.0016 per token", "每个 token $0.0016"),
    caption: localize("Lowest unit cost for heavy API usage and batch rendering.", "适合重度 API 使用和批量渲染的最低单价。"),
    features: [
      localize("Lowest effective rate", "最低有效费率"),
      localize("Ideal for batch jobs", "适合批处理任务"),
      localize("Built for sustained production usage", "适合持续生产使用"),
    ],
    featured: false,
  },
])
const selectedPack = computed(() => String(route.query.pack || ""))

const billingSummary = computed(() => buildBillingSummary({
  tokenOrders: tokenOrders.value,
  billingEvents: billingEvents.value,
  usage: usage.value,
  fallbackTokenBalance: authStore.entitlements?.token_balance ?? 0,
}))
const tokenBalance = computed(() => billingSummary.value.tokenBalance)
const trackedTokenTotal = computed(() => billingSummary.value.trackedTokenTotal)
const totalConsumedTokens = computed(() => billingSummary.value.totalConsumedTokens)
const renderRows = computed(() => buildRenderRows(billingEvents.value))
const usageTotalPages = computed(() => resolveTotalPages(renderRows.value.length, USAGE_PAGE_SIZE))
const paginatedRenderRows = computed(() => paginateItems(renderRows.value, usagePage.value, USAGE_PAGE_SIZE))
const lowTokenThreshold = computed(() => Math.max(0, Math.ceil(billingSummary.value.trackedTokenTotal * 0.1)))
const isTokenDepleted = computed(() => tokenBalance.value <= 0)
const isLowTokenBalance = computed(() => tokenBalance.value > 0 && tokenBalance.value <= lowTokenThreshold.value)
const showTokenAlert = computed(() => !authStore.isPlatformAdmin && (isTokenDepleted.value || isLowTokenBalance.value))
// Plan v3 §S2.5：trial CTA 仅在未订阅且未用过 trial 时显示。
const canStartGradingTrial = computed(() => gradingTier.value === "none" && !hasUsedGradingTrial.value)

onMounted(async () => {
  fetchPricingCatalog().catch(() => undefined)
  const tenantId = authStore.tenant?.tenant_id
  if (!tenantId) return
  await Promise.all([
    authStore.refreshSession().catch(() => undefined),
    platformStore.loadUsage(tenantId, "", "", authStore.authHeaders).catch(() => undefined),
    platformStore.loadBillingEvents({ auth: authStore.authHeaders, tenantId, limit: 200 }).catch(() => undefined),
    platformStore.loadTokenOrders({ auth: authStore.authHeaders, tenantId, limit: 100 }).catch(() => undefined),
  ])
  await handlePayPalReturnFlow()
  await scrollToBuySectionIfNeeded()
  // Plan v3 §S2.5：?intent=grading-trial query 自动开启 trial（仅当登录、tier=none、未用过 trial）。
  await maybeAutoStartGradingTrial()
})

// Plan v3 §S2.5：登录回流后若 query 含 intent=grading-trial，自动调用 startGradingTrial()。
async function maybeAutoStartGradingTrial() {
  if (route.query.intent !== "grading-trial") return
  // 先确保 capabilities 已加载（GateModal 跳转回来的场景，capabilities ref 可能还是 stub）。
  await fetchUserCapabilities().catch(() => undefined)
  if (authStore.isAuthenticated && gradingTier.value === "none" && !hasUsedGradingTrial.value) {
    await startGradingTrial()
  }
  // 滚动到 grading 区块，确保用户能看到 subscribe 引导（trial 失败/已用过时仍可订阅）。
  await nextTick()
  const section = document.getElementById("grading-subscription")
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" })
  // 清理 query，避免刷新重复触发。
  const nextQuery = { ...route.query } as Record<string, string | string[] | null | undefined>
  delete nextQuery.intent
  await router.replace({ path: route.path, query: nextQuery, hash: route.hash })
}

watch(
  () => route.hash,
  () => {
    void scrollToBuySectionIfNeeded()
  },
)

watch(
  () => route.fullPath,
  () => {
    void handlePayPalReturnFlow()
  },
)
watch(() => renderRows.value.length, () => {
  usagePage.value = clampPage(usagePage.value, usageTotalPages.value)
})

async function buyPack(pack: { tokens: number; amountCents: number }) {
  const tenantId = authStore.tenant?.tenant_id
  if (!tenantId) return
  purchasingPack.value = pack.tokens
  purchaseError.value = ""
  purchaseSuccess.value = ""
  try {
    const currentLocation = window.location.origin
    const order = await platformStore.createPayPalTokenOrder({
      auth: authStore.authHeaders,
      tenant_id: tenantId,
      tokens: pack.tokens,
      amount_cents: pack.amountCents,
      pack_type: pack.tokens === 2000 ? "starter" : pack.tokens === 10000 ? "basic" : "pro",
      note: `PayPal checkout for ${pack.tokens} token pack`,
      return_url: `${currentLocation}/admin/tokens-management#buy-token-packs`,
      cancel_url: `${currentLocation}/admin/tokens-management#buy-token-packs`,
    })
    if (!order.approval_url) {
      throw new Error(localize("PayPal approval link is missing.", "缺少 PayPal 审批链接。"))
    }
    purchaseSuccess.value = localize(`Order ${order.order_id} was created. Redirecting to PayPal now.`, `订单 ${order.order_id} 已创建，正在跳转到 PayPal。`)
    const approvalUrl = buildApprovalNavigationUrl(order.approval_url, order.order_id, currentLocation, pack)
    window.location.assign(approvalUrl)
  } catch (error) {
    purchaseError.value = String((error as Error)?.message || error || localize("Failed to create token order.", "创建 token 订单失败。"))
  } finally {
    purchasingPack.value = null
  }
}

async function scrollToBuySectionIfNeeded() {
  if (route.hash !== buySectionHash) return
  await nextTick()
  const section = document.getElementById("buy-token-packs")
  if (!section) return
  section.scrollIntoView({ behavior: "smooth", block: "start" })
}

function buildApprovalNavigationUrl(
  approvalUrl: string,
  orderId: string,
  currentLocation: string,
  pack: { tokens: number; amountCents: number },
) {
  try {
    const parsed = new URL(approvalUrl)
    const isMockCheckout = parsed.searchParams.get("PayerID") === "MOCKPAYER" && parsed.searchParams.get("token")?.startsWith("PAYPAL-MOCK-")
    if (!isMockCheckout) return approvalUrl
    const returnUrl = new URL(`${currentLocation}/admin/tokens-management`)
    returnUrl.searchParams.set("order_id", orderId)
    returnUrl.searchParams.set("token", parsed.searchParams.get("token") || "")
    returnUrl.searchParams.set("PayerID", parsed.searchParams.get("PayerID") || "MOCKPAYER")
    returnUrl.hash = "buy-token-packs"

    const cancelUrl = new URL(`${currentLocation}/admin/tokens-management`)
    cancelUrl.searchParams.set("cancelled_order_id", orderId)
    cancelUrl.hash = "buy-token-packs"

    const mockCheckoutUrl = new URL(`${currentLocation}/paypal/mock-checkout`)
    mockCheckoutUrl.searchParams.set("order_id", orderId)
    mockCheckoutUrl.searchParams.set("token_pack", String(parsed.searchParams.get("token") || ""))
    mockCheckoutUrl.searchParams.set("return_url", returnUrl.toString())
    mockCheckoutUrl.searchParams.set("cancel_url", cancelUrl.toString())
    mockCheckoutUrl.searchParams.set("amount_cents", String(pack.amountCents ?? 0))
    mockCheckoutUrl.searchParams.set("tokens", String(pack.tokens ?? 0))
    return mockCheckoutUrl.toString()
  } catch {
    return approvalUrl
  }
}

async function handlePayPalReturnFlow() {
  const tenantId = authStore.tenant?.tenant_id
  if (!tenantId) return
  const hashQuery = route.hash.includes("?") ? route.hash.slice(route.hash.indexOf("?") + 1) : ""
  const legacyHashParams = new URLSearchParams(hashQuery)
  const cancelledOrderId = String(route.query.cancelled_order_id || legacyHashParams.get("cancelled_order_id") || "")
  const orderId = String(route.query.order_id || legacyHashParams.get("order_id") || "")
  const externalOrderId = String(route.query.token || legacyHashParams.get("token") || "")
  const payerId = String(route.query.PayerID || legacyHashParams.get("PayerID") || "")
  if (!cancelledOrderId && (!orderId || !externalOrderId)) {
    return
  }

  try {
    if (cancelledOrderId) {
      await platformStore.cancelBillingOrder(cancelledOrderId, {
        auth: authStore.authHeaders,
        reason: "buyer_cancelled",
      })
      purchaseError.value = localize(`Order ${cancelledOrderId} was cancelled before settlement.`, `订单 ${cancelledOrderId} 已在结算前取消。`)
    } else {
      const order = await platformStore.confirmPayPalOrder(orderId, {
        auth: authStore.authHeaders,
        payer_id: payerId,
        external_order_id: externalOrderId,
      })
      purchaseSuccess.value = localize(`Order ${order.order_id} is now ${order.payment_status || order.status}. Tokens are credited only after real settlement succeeds.`, `订单 ${order.order_id} 当前状态为 ${order.payment_status || order.status}。只有真实结算成功后令牌才会到账。`)
    }
  } catch (error) {
    purchaseError.value = String((error as Error)?.message || error || localize("Failed to confirm PayPal order.", "确认 PayPal 订单失败。"))
  } finally {
    await Promise.all([
      platformStore.loadBillingEvents({ auth: authStore.authHeaders, tenantId, limit: 200 }).catch(() => undefined),
      platformStore.loadTokenOrders({ auth: authStore.authHeaders, tenantId, limit: 100 }).catch(() => undefined),
    ])
    const nextQuery = { ...route.query } as Record<string, string | string[] | null | undefined>
    delete nextQuery.cancelled_order_id
    delete nextQuery.order_id
    delete nextQuery.token
    delete nextQuery.PayerID
    await router.replace({ path: route.path, query: nextQuery, hash: buySectionHash })
  }
}
</script>

<style scoped>
.tokens-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.page-eyebrow { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.35rem 0.7rem; background: #eef2ff; color: #4338ca; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.page-title { margin: 0; font-size: 2rem; color: #0f172a; }
.page-subtitle { margin: 0.5rem 0 0; color: #64748b; }
.header-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.85rem; }
.header-badge { display: inline-flex; align-items: center; padding: 0.38rem 0.72rem; border-radius: 999px; background: #f8fafc; border: 1px solid #dbe3f0; color: #475569; font-size: 0.78rem; font-weight: 700; }
.header-badge.warning { background: #fff7ed; border-color: #fdba74; color: #c2410c; }
.header-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.summary-grid,
.package-grid { display: grid; gap: 1rem; }
.summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.package-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.summary-card,
.panel-card,
.alert-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05); }
.summary-label { display: block; color: #64748b; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.summary-card strong { display: block; margin-top: 0.45rem; font-size: 1.4rem; color: #0f172a; }
.summary-help { display: block; margin-top: 0.4rem; color: #64748b; font-size: 0.88rem; }
.alert-card { display: flex; justify-content: space-between; align-items: center; gap: 1rem; background: #eff6ff; border-color: #bfdbfe; }
.alert-card.danger { background: #fef2f2; border-color: #fecaca; }
.alert-card h2 { margin: 0 0 0.35rem; font-size: 1.05rem; color: #0f172a; }
.alert-card p { margin: 0; color: #64748b; }
.panel-title { margin: 0 0 0.9rem; font-size: 1.05rem; color: #0f172a; }
.panel-head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.9rem; }
.panel-head-row.compact { margin-bottom: 0.75rem; }
.panel-copy { margin: 0.35rem 0 0; color: #64748b; line-height: 1.5; }
.usage-links { display: flex; flex-wrap: wrap; gap: 0.65rem; }
.purchase-panel { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
#buy-token-packs { scroll-margin-top: 96px; }
.three-products-panel { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
.three-products-notice { margin: 1rem 0 0; padding: 0.65rem 0.85rem; border-radius: 0.65rem; background: #ecfeff; color: #0e7490; font-weight: 600; }
/* Plan v3 §S2.5：grading trial 入口卡片样式。 */
.grading-trial-card { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; margin-top: 1rem; padding: 1rem 1.1rem; border-radius: 0.85rem; background: linear-gradient(180deg, #ecfeff 0%, #ffffff 100%); border: 1px solid #a5f3fc; }
.grading-trial-copy { display: flex; flex-direction: column; gap: 0.35rem; }
.grading-trial-copy strong { color: #0f172a; font-size: 1rem; }
.grading-trial-copy p { margin: 0; color: #475569; line-height: 1.55; font-size: 0.92rem; }
.grading-trial-badge { display: inline-flex; align-self: flex-start; padding: 0.25rem 0.6rem; border-radius: 999px; background: #cffafe; color: #0e7490; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.grading-trial-button { min-width: 180px; }
/* Plan v5 §C.5：trial 倒计时 chip */
.grading-trial-chip { display: inline-block; margin: 0.85rem 0 0; padding: 0.3rem 0.75rem; border-radius: 999px; background: #ecfdf5; border: 1px solid #6ee7b7; color: #047857; font-size: 0.85rem; font-weight: 700; }
.grading-anchor { padding: 0; margin: 0; height: 0; scroll-margin-top: 96px; }
.purchase-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.mini-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.35rem 0.75rem; background: #eef2ff; color: #4338ca; font-size: 0.78rem; font-weight: 700; }
.success-banner, .error-banner { border-radius: 0.85rem; padding: 0.85rem 1rem; margin-bottom: 1rem; font-weight: 600; }
.success-banner { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.error-banner { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.purchase-intro {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.intro-card {
  border: 1px solid #dbe3f0;
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  background: #ffffff;
}

.intro-label {
  display: inline-flex;
  margin-bottom: 0.55rem;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #4f46e5;
}

.intro-card strong {
  display: block;
  color: #0f172a;
  font-size: 1rem;
}

.intro-card p {
  margin: 0.45rem 0 0;
  color: #64748b;
  line-height: 1.6;
}

.package-card {
  border: 1px solid #e2e8f0;
  border-radius: 1.2rem;
  padding: 1.15rem;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
}

.package-chip-row {
  display: flex;
  gap: 0.5rem;
  min-height: 1.9rem;
}

.package-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.74rem;
  font-weight: 800;
}

.package-chip.featured {
  background: #ede9fe;
  color: #6d28d9;
}

.package-chip.selected {
  background: #dcfce7;
  color: #166534;
}

.package-topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.package-topline strong { font-size: 1.15rem; color: #0f172a; line-height: 1.35; }

.package-price {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  color: #111827;
}

.package-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #64748b;
  font-size: 0.92rem;
}

.package-unit {
  color: #0ea5e9;
  font-size: 1rem;
  font-weight: 800;
}

.package-caption {
  line-height: 1.6;
}

.package-features {
  margin: 0;
  padding-left: 1.05rem;
  color: #334155;
  line-height: 1.7;
}

.package-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
}

.package-footer-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.package-footer-copy strong {
  color: #0f172a;
  font-size: 0.92rem;
}

.package-footer-copy span {
  color: #64748b;
  font-size: 0.85rem;
}

.package-button {
  min-width: 132px;
}

.package-card.featured {
  border-color: #818cf8;
  background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%);
}
.package-card.recommended { box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18); }
.list-stack { display: flex; flex-direction: column; gap: 0.75rem; }
.purchase-footnote {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1.1rem;
  margin-top: 1rem;
  color: #64748b;
  font-size: 0.88rem;
}
.list-item { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: 0.9rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.85rem; background: #fff; }
.list-item p { margin: 0.3rem 0 0; color: #64748b; line-height: 1.5; }
.empty-state { color: #94a3b8; font-weight: 600; }
.usage-panel { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
.usage-footnote {
  margin-top: 0.9rem;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.55;
}
.btn-primary,
.btn-secondary { border: 0; border-radius: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; text-decoration: none; font-weight: 700; }
.btn-primary { background: #0ea5e9; color: #fff; }
.btn-secondary { background: #f8fafc; color: #1d4ed8; border: 1px solid #cbd5e1; }

@media (max-width: 1080px) {
  .summary-grid,
  .package-grid { grid-template-columns: 1fr 1fr; }

  .purchase-intro {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .summary-grid,
  .package-grid { grid-template-columns: 1fr; }
  .alert-card { flex-direction: column; align-items: stretch; }
  .panel-head-row { flex-direction: column; }
  .list-item { flex-direction: column; }
  .package-footer { flex-direction: column; align-items: stretch; }
  .package-button { width: 100%; }
}
</style>
