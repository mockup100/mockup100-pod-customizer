<template>
  <div class="pricing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">{{ text.heroTitle }}</h1>
        <p class="hero-subtitle">
          {{ text.heroSubtitle }}
        </p>
      </div>
    </section>

    <!-- Pricing Cards (Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Four-product Catalogue) -->
    <section class="pricing-section">
      <div class="pricing-container">
        <div class="pricing-grid four-cards">
          <!-- (1) WP Free -->
          <article id="wp-free" class="pricing-card">
            <div class="card-header">
              <div class="plan-badge">
                <span class="badge-icon">🆓</span>
                <span>{{ text.wpFree.eyebrow }}</span>
              </div>
              <h3 class="plan-name">{{ text.wpFree.name }}</h3>
              <p class="plan-price">{{ wpFreePriceLine }}</p>
              <p class="plan-description">{{ text.wpFree.subtitle }}</p>
            </div>
            <ul class="features-list">
              <li v-for="feature in text.wpFree.features" :key="feature" class="feature-item">
                <span class="check-icon">✓</span><span>{{ feature }}</span>
              </li>
            </ul>
            <RouterLink class="btn-secondary" to="/api#plugins">
              {{ text.wpFree.cta }}
            </RouterLink>
          </article>

          <!-- (2) WP Pro -->
          <article id="wp-pro" class="pricing-card featured">
            <div class="popular-badge"><span>{{ text.wpPro.popularBadge }}</span></div>
            <div class="card-header">
              <div class="plan-badge">
                <span class="badge-icon">🧩</span>
                <span>{{ text.wpPro.eyebrow }}</span>
              </div>
              <h3 class="plan-name">{{ text.wpPro.name }}</h3>
              <p class="plan-price">{{ wpProPriceLine }}</p>
              <p class="plan-description">{{ wpProDescription }}</p>
            </div>
            <ul class="features-list">
              <li v-for="plan in catalog.wp_pro_addon" :key="plan.sku" class="feature-item">
                <span class="check-icon">✓</span>
                <span>{{ formatWpPro(plan) }}</span>
                <span v-if="plan.featured" class="badge-pill">{{ text.wpPro.bestValue }}</span>
              </li>
              <li v-for="feature in text.wpPro.bonusFeatures" :key="feature" class="feature-item">
                <span class="check-icon">✓</span><span>{{ feature }}</span>
              </li>
            </ul>
            <a class="btn-primary" href="https://www.mockup100.com/wp-pro" target="_blank" rel="noopener">
              {{ text.wpPro.cta }}
            </a>
          </article>

          <!-- (3) Token Wallet -->
          <article id="tokens" class="pricing-card">
            <div class="card-header">
              <div class="plan-badge">
                <span class="badge-icon">⚡</span>
                <span>{{ text.token.eyebrow }}</span>
              </div>
              <h3 class="plan-name">{{ text.token.name }}</h3>
              <p class="plan-price">{{ text.token.priceLine(lowestTokenPriceLabel) }}</p>
              <p class="plan-description">{{ tokenDescription }}</p>
            </div>
            <ul class="resolution-table">
              <li v-for="tier in catalog.token_render_tiers" :key="tier.size_px">
                <span>{{ tier.size_px }}×{{ tier.size_px }}</span>
                <span>{{ formatRenderTier(tier) }}</span>
              </li>
            </ul>
            <ul class="features-list">
              <li v-for="pack in catalog.token_packs" :key="pack.sku" class="feature-item">
                <span class="check-icon">✓</span>
                <span>{{ formatTokenPack(pack) }}</span>
                <span v-if="pack.featured" class="badge-pill">{{ text.token.mostPopular }}</span>
              </li>
            </ul>
            <button type="button" class="btn-primary" @click="goBuyTokens">
              {{ text.token.cta }}
            </button>
          </article>

          <!-- (4) Grading Subscription -->
          <article id="grading" class="pricing-card">
            <!-- Plan v3 §S2.5：Grading 卡顶部 30 天免费试用标签。 -->
            <div class="trial-badge"><span>{{ text.grading.trialBadge }}</span></div>
            <div class="card-header">
              <div class="plan-badge">
                <span class="badge-icon">📐</span>
                <span>{{ text.grading.eyebrow }}</span>
              </div>
              <h3 class="plan-name">{{ text.grading.name }}</h3>
              <p class="plan-price">{{ gradingPriceLine }}</p>
              <p class="plan-description">{{ gradingDescription }}</p>
            </div>
            <ul class="features-list">
              <li v-for="plan in catalog.grading_subscription" :key="plan.sku" class="feature-item">
                <span class="check-icon">✓</span>
                <span>{{ formatGrading(plan) }}</span>
                <span v-if="plan.featured" class="badge-pill">{{ text.grading.recommended }}</span>
              </li>
              <li v-for="feature in text.grading.bonusFeatures" :key="feature" class="feature-item">
                <span class="check-icon">✓</span><span>{{ feature }}</span>
              </li>
            </ul>
            <button type="button" class="btn-primary" @click="goSubscribeGrading">
              {{ text.grading.cta }}
            </button>
            <!-- Plan v3 §S2.5：Grading 卡 30 天免费试用 CTA + 脚注。 -->
            <button type="button" class="btn-trial" data-testid="pricing-grading-trial-cta" @click="goStartGradingTrial">
              {{ text.grading.startTrial }}
            </button>
            <p class="trial-footnote">{{ text.grading.trialFootnote }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
      <div class="faq-container">
        <h2 class="faq-title">{{ text.faqTitle }}</h2>
        <div class="faq-list">
          <details v-for="item in text.faqs" :key="item.question" class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-text">{{ item.question }}</span>
              <span class="faq-arrow" aria-hidden="true">▾</span>
            </summary>
            <p class="faq-answer">{{ item.answer }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-container">
        <h2 class="cta-title">{{ text.ctaTitle }}</h2>
        <div class="cta-buttons">
          <button type="button" @click="goBuyTokens" class="btn-primary btn-large">
            {{ authStore.isAuthenticated ? text.token.cta : text.startFree }}
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="enterpriseDialogOpen" class="enterprise-dialog-backdrop" @click.self="closeEnterpriseDialog">
        <div class="enterprise-dialog">
          <div class="enterprise-dialog-header">
            <div>
              <p class="enterprise-dialog-eyebrow">{{ text.enterpriseDialog.eyebrow }}</p>
              <h3>{{ text.enterpriseDialog.title }}</h3>
            </div>
            <button type="button" class="enterprise-dialog-close" @click="closeEnterpriseDialog">{{ text.enterpriseDialog.close }}</button>
          </div>
          <p class="enterprise-dialog-copy">
            {{ text.enterpriseDialog.copy }}
          </p>
          <ul class="enterprise-dialog-list">
            <li v-for="item in text.enterpriseDialog.checklist" :key="item">{{ item }}</li>
          </ul>
          <p v-if="enterpriseCopyNotice" class="enterprise-dialog-notice">{{ enterpriseCopyNotice }}</p>
          <div class="enterprise-dialog-actions">
            <button type="button" class="btn-secondary" @click="copyEnterpriseChecklist">{{ text.enterpriseDialog.copyChecklist }}</button>
            <button type="button" class="btn-primary" @click="continueEnterpriseFlow">
              {{ authStore.isAuthenticated ? text.enterpriseDialog.openSettings : text.enterpriseDialog.continueToAccountSetup }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <HomeFooter />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, nextTick, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from '../stores/auth'
import { useUiLocaleStore } from "../stores/uiLocale"
import HomeFooter from "../components/HomeFooter.vue"
import {
  usePricingCatalog,
  type CatalogTokenPack,
  type CatalogGradingPlan,
  type CatalogWpProPlan,
  type CatalogTokenRenderTier,
} from "../composables/usePricingCatalog"

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const { catalog, fetchPricingCatalog } = usePricingCatalog()
const enterpriseDialogOpen = ref(false)
const enterpriseCopyNotice = ref("")
const currentLocale = computed(() => locale.value === "zh" ? "zh" : "en")
const PRICING_PAGE_I18N = {
  en: {
    heroTitle: "Four products. Independent gates. No cross-subscription.",
    heroSubtitle: "WP Free for visual canvas, WP Pro for bulk export, Token Wallet for HD renders, Grading for multi-size production. Each product is gated by an independent flag.",
    buyTokens: "Buy Tokens",
    startFree: "Start Free",
    wpFree: {
      eyebrow: "WordPress Free",
      name: "WP Free",
      priceLine: "$0 Forever Free",
      subtitle: "Full visual canvas inside any WordPress site. No tokens required for previews.",
      features: [
        "Full visual canvas editor",
        "Unlimited templates",
        "Single-file export",
        "Basic asset library",
        "512px preview free for all users",
      ],
      cta: "Install WP Free",
    },
    wpPro: {
      popularBadge: "🔥 BEST VALUE",
      eyebrow: "WordPress Pro Add-on",
      name: "WP Pro",
      bestValue: "Best Value",
      description: "One-time lifetime purchase with no monthly recurring fees.",
      bonusFeatures: [
        "Bulk order export",
        "Team permission management",
      ],
      planLabel: { single: "Single Site", unlimited: "Unlimited Sites", lifetime: "lifetime" },
      cta: "Buy WP Pro",
    },
    token: {
      eyebrow: "Token Wallet",
      name: "Token Top-up",
      priceLine: (lowest: string) => `From ${lowest} · pay as you go`,
      tokenWord: "Token",
      tokensSuffix: "Tokens",
      free: "Free",
      mostPopular: "Most Popular",
      description: "Tokens never expire for HD renders and premium artwork. 512px preview is free for all users.",
      cta: "Buy Tokens",
    },
    grading: {
      eyebrow: "Grading Monthly Subscription",
      name: "Grading",
      recommended: "Recommended",
      description: "One subscription unlocks multi-size grading on both web console and WordPress editor.",
      tierLabel: { standard: "Standard", enterprise: "Enterprise" },
      perMonth: "/month",
      bonusFeatures: [
        "Multi-size grading on web console",
        "Multi-size grading inside WordPress editor",
      ],
      cta: "Subscribe",
      // Plan v3 §S2.5：30 天免费试用 i18n。
      trialBadge: "Free 30-day trial",
      startTrial: "Start free trial",
      trialFootnote: "New users only — try Grading Standard free for 30 days, no credit card required.",
    },
    faqTitle: "FAQ",
    faqs: [
      {
        question: "What's the difference between WP Free and WP Pro?",
        answer: "WP Free includes the full POD canvas editor, unlimited templates, single-file export, and 512px previews — free forever. WP Pro is an add-on that unlocks bulk order export, team sub-account permission management, and priority email support. WP Pro does not affect Token Wallet or Grading entitlements; each product is gated independently.",
      },
      {
        question: "What are Tokens, and how is billing calculated?",
        answer: "Tokens are a pay-as-you-go credit consumed by HD rendering (512×512 preview is free, 1 Token at 1024, 2 at 2048, 8 at 4096) and premium artwork unlocks. Tokens never expire once topped up, and admins can apply offline credits to a workspace on request — contact csl@mockup100.com.",
      },
      {
        question: "Which payment methods are supported?",
        answer: "Online checkout uses PayPal for one-time Token packs, WP Pro lifetime licenses, and the Grading subscription. For bank transfer, wire, or other offline settlement, email csl@mockup100.com to request manual top-up of Tokens or activation of a license.",
      },
      {
        question: "Do you offer refunds?",
        answer: "Refunds follow PayPal platform rules. Subscriptions can be cancelled at any time and remain active through the end of the paid period. Tokens already consumed are non-refundable; unused Token balances may be reviewed case by case via csl@mockup100.com.",
      },
      {
        question: "How do I upgrade or downgrade my subscription?",
        answer: "Upgrades, downgrades, and cancellations are managed inside the admin console under Billing & Tokens / Subscriptions & Licensing. WP Pro and Grading are independent products — changing one never affects the other.",
      },
      {
        question: "What is your legal entity, and can I get an invoice?",
        answer: "All purchases are issued by Zhuhai Baifeng Network Technology Co., Ltd. For invoices, contracts, or company onboarding documents, email csl@mockup100.com with your billing details.",
      },
    ],
    ctaTitle: "Ready to test your custom product flow?",
    enterpriseDialog: {
      eyebrow: "Enterprise Review",
      title: "Start a manual enterprise onboarding",
      close: "Close",
      copy: "Enterprise access is handled manually. Prepare your company name, output volume, required sizes, marketplace needs, and billing contact before you continue.",
      checklist: [
        "Company or workspace name",
        "Estimated monthly renders and peak volume",
        "Required output sizes and API usage expectations",
        "Billing owner and technical contact",
      ],
      checklistCopyTitle: "Enterprise onboarding checklist",
      copyChecklist: "Copy Checklist",
      copiedNotice: "Checklist copied. Paste it into your onboarding request.",
      clipboardUnavailable: "Clipboard access is unavailable in this browser.",
      openSettings: "Open Settings",
      continueToAccountSetup: "Continue to Account Setup",
    },
  },
  zh: {
    heroTitle: "四款产品，互相独立，不存在交叉订阅",
    heroSubtitle: "WP Free 提供可视化画布，WP Pro 解锁批量导出，Token 钱包按量计费 HD 渲染，Grading 提供多尺寸量产订阅。每个产品由独立权限标志驱动。",
    buyTokens: "购买 Tokens",
    startFree: "免费开始",
    wpFree: {
      eyebrow: "WordPress Free",
      name: "WP Free",
      priceLine: "$0 永久免费",
      subtitle: "在任意 WordPress 站点内提供完整可视化画布，预览无需消耗 Tokens。",
      features: [
        "完整可视化画布编辑器",
        "模板数量不限",
        "单文件导出",
        "基础素材库",
        "512px 预览全员免费",
      ],
      cta: "安装 WP Free",
    },
    wpPro: {
      popularBadge: "🔥 最具性价比",
      eyebrow: "WordPress Pro 插件",
      name: "WP Pro",
      bestValue: "最具价值",
      description: "一次性买断，无月度续费。",
      bonusFeatures: [
        "批量订单导出",
        "团队权限管理",
      ],
      planLabel: { single: "单站点", unlimited: "不限站点", lifetime: "终身" },
      cta: "立即购买 WP Pro",
    },
    token: {
      eyebrow: "Token 钱包",
      name: "Token 充值",
      priceLine: (lowest: string) => `从 ${lowest} 起 · 按量付费`,
      tokenWord: "Token",
      tokensSuffix: "Tokens",
      free: "免费",
      mostPopular: "最受欢迎",
      description: "Token 永不过期，可用于高清渲染与商用艺术素材；512px 预览全员免费。",
      cta: "购买 Tokens",
    },
    grading: {
      eyebrow: "Grading 月度订阅",
      name: "Grading",
      recommended: "推荐",
      description: "一份订阅同时解锁 Web 控制台与 WordPress 编辑器的多尺寸 grading。",
      tierLabel: { standard: "标准版", enterprise: "企业版" },
      perMonth: "/月",
      bonusFeatures: [
        "Web 控制台多尺寸 grading",
        "WordPress 编辑器内多尺寸 grading",
      ],
      cta: "立即订阅",
      // Plan v3 §S2.5：30 天免费试用 i18n。
      trialBadge: "免费试用 30 天",
      startTrial: "开始免费试用",
      trialFootnote: "仅限新用户 —— 免费试用 Grading 标准版 30 天，无需信用卡。",
    },
    faqTitle: "常见问题",
    faqs: [
      {
        question: "WP Free 与 WP Pro 有什么区别？",
        answer: "WP Free 包含完整 POD 画布编辑器、模板数量不限、单文件导出和 512px 预览，永久免费。WP Pro 是附加插件，额外解锁批量订单导出、团队子账号权限管理以及优先邮件支持。WP Pro 不影响 Token 钱包和 Grading 权限，各产品按独立标志授权。",
      },
      {
        question: "Token 是什么？如何计费？",
        answer: "Token 是按量付费的额度，用于高清渲染（512×512 预览免费，1024 消耗 1 Token，2048 消耗 2，4096 消耗 8）和商用艺术素材解锁。充值后的 Token 永不过期；如有需要，管理员可通过线下渠道为工作区充值，请邮件联系 csl@mockup100.com。",
      },
      {
        question: "支持哪些支付方式？",
        answer: "在线支付通过 PayPal 完成 Token 包、WP Pro 终身授权以及 Grading 订阅。如需银行转账、电汇或其他线下结算，请邮件联系 csl@mockup100.com 申请线下入账或人工开通授权。",
      },
      {
        question: "是否支持退款？",
        answer: "退款遵循 PayPal 平台规则。订阅可随时取消，已支付周期内仍保持有效。已消费的 Token 不予退款；未使用的 Token 余额可通过 csl@mockup100.com 单独评估。",
      },
      {
        question: "如何升级或降级订阅？",
        answer: "升级、降级与取消都可在管理后台的「账单与 Token / 订阅与授权」中操作。WP Pro 与 Grading 互相独立，修改一项不会影响另一项。",
      },
      {
        question: "公司主体与发票如何获取？",
        answer: "所有订单均由珠海百风网络科技有限公司（Zhuhai Baifeng Network Technology Co., Ltd.）开具。需要发票、合同或公司接入资料，请邮件联系 csl@mockup100.com 并附上抬头与税务信息。",
      },
    ],
    ctaTitle: "准备好验证你的定制商品流程了吗？",
    enterpriseDialog: {
      eyebrow: "企业评估",
      title: "发起人工企业接入",
      close: "关闭",
      copy: "企业接入采用人工处理。继续之前，请先准备公司名称、输出量级、所需尺寸、市场需求以及结算联系人信息。",
      checklist: [
        "公司或工作区名称",
        "预计月渲染量与峰值规模",
        "所需输出尺寸与 API 使用预期",
        "结算负责人和技术联系人",
      ],
      checklistCopyTitle: "企业接入清单",
      copyChecklist: "复制清单",
      copiedNotice: "清单已复制，可直接粘贴到你的接入申请中。",
      clipboardUnavailable: "当前浏览器无法访问剪贴板。",
      openSettings: "打开设置",
      continueToAccountSetup: "继续创建账号",
    },
  },
} as const
const text = computed(() => PRICING_PAGE_I18N[currentLocale.value])

// Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Four-product Catalogue.
// Catalog formatters render frozen-spec copy; price values come from usePricingCatalog (no hardcoded numbers in features).
const formatTokenPack = (pack: CatalogTokenPack) =>
  `${pack.tokens.toLocaleString()} ${text.value.token.tokensSuffix} · $${pack.amount_cents / 100}`

const formatGrading = (plan: CatalogGradingPlan) =>
  `${plan.tier === 'standard' ? text.value.grading.tierLabel.standard : text.value.grading.tierLabel.enterprise} · $${plan.price_cents / 100}${text.value.grading.perMonth}`

const formatWpPro = (plan: CatalogWpProPlan) =>
  `${plan.scope === 'single' ? text.value.wpPro.planLabel.single : text.value.wpPro.planLabel.unlimited} · $${plan.price_cents / 100} ${text.value.wpPro.planLabel.lifetime}`

const formatRenderTier = (tier: CatalogTokenRenderTier) => {
  if (tier.cost_tokens === 0) return text.value.token.free
  const word = text.value.token.tokenWord
  const suffix = currentLocale.value === 'en' && tier.cost_tokens > 1 ? 's' : ''
  return `${tier.cost_tokens} ${word}${suffix}`
}

const wpFreePriceLine = computed(() => {
  const cents = catalog.value.wp_free.price_cents
  return cents === 0 ? text.value.wpFree.priceLine : `$${cents / 100}`
})

const wpProDescription = computed(() => text.value.wpPro.description)
const tokenDescription = computed(() => text.value.token.description)
const gradingDescription = computed(() => text.value.grading.description)

const wpProPriceLine = computed(() =>
  catalog.value.wp_pro_addon.map(formatWpPro).join(' · '),
)

const gradingPriceLine = computed(() =>
  catalog.value.grading_subscription.map(formatGrading).join(' · '),
)

const lowestTokenPriceLabel = computed(() => {
  const packs = catalog.value.token_packs
  if (!packs.length) return ''
  const lowest = packs.reduce((min, p) => (p.amount_cents < min.amount_cents ? p : min), packs[0])
  return `$${lowest.amount_cents / 100}`
})

function goBuyTokens() {
  const path = '/admin/tokens-management'
  if (authStore.isAuthenticated) {
    router.push({ path, hash: '#buy-token-packs' })
  } else {
    router.push({ path: '/auth', query: { mode: 'register', redirect: `${path}#buy-token-packs` } })
  }
}

function goSubscribeGrading() {
  // Plan v5 §C.3 + SSOT 锚点统一：Grading 订阅入口锚点改为
  // /admin/subscriptions-licensing?tab=grading（兼容旧锚点 hash）
  const path = '/admin/subscriptions-licensing'
  if (authStore.isAuthenticated) {
    router.push({ path, query: { tab: 'grading' } })
  } else {
    router.push({
      path: '/auth',
      query: { mode: 'register', redirect: `${path}?tab=grading` },
    })
  }
}

// Plan v3 §S2.5：Grading 30 天免费试用 CTA。携带 ?intent=grading-trial 让订阅页
// 自动调用 POST /subscriptions/grading/trial。未登录走注册回流。
function goStartGradingTrial() {
  const path = '/admin/subscriptions-licensing'
  if (authStore.isAuthenticated) {
    router.push({ path, query: { tab: 'grading', intent: 'grading-trial' } })
  } else {
    router.push({
      path: '/auth',
      query: { mode: 'register', redirect: `${path}?tab=grading&intent=grading-trial` },
    })
  }
}

function scrollToHash(hash: string) {
  if (!hash) return
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  const target = document.getElementById(id)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeEnterpriseDialog() {
  enterpriseDialogOpen.value = false
  enterpriseCopyNotice.value = ''
}

async function copyEnterpriseChecklist() {
  const checklist = [
    text.value.enterpriseDialog.checklistCopyTitle,
    ...text.value.enterpriseDialog.checklist.map((item) => `- ${item}`),
  ].join("\n")

  try {
    await navigator.clipboard.writeText(checklist)
    enterpriseCopyNotice.value = text.value.enterpriseDialog.copiedNotice
  } catch {
    enterpriseCopyNotice.value = text.value.enterpriseDialog.clipboardUnavailable
  }
}

function continueEnterpriseFlow() {
  enterpriseDialogOpen.value = false
  enterpriseCopyNotice.value = ''
  if (authStore.isAuthenticated) {
    router.push('/admin/settings')
    return
  }
  router.push({ path: '/auth', query: { mode: 'register', plan: 'enterprise' } })
}

// Load spec-locked four-product catalog on mount; resolve hash anchor (#wp-free / #wp-pro / #token / #grading) per spec lock-mockup100-final-pricing-products-scheme §6.1.
onMounted(async () => {
  await fetchPricingCatalog()
  if (route.hash) {
    await nextTick()
    setTimeout(() => scrollToHash(route.hash), 60)
  }
})
</script>

<style scoped>
/* Hero Section */
.pricing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.pricing-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%23ffffff" fill-opacity="0.1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
  background-size: cover;
  pointer-events: none;
}

.hero {
  position: relative;
  z-index: 1;
  padding: 6rem 1.5rem 4rem;
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Pricing Section */
.pricing-section {
  position: relative;
  z-index: 1;
  padding: 4rem 1.5rem;
}

.pricing-container {
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.pricing-grid.four-cards {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

/* Pricing Cards */
.pricing-card {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  scroll-margin-top: 80px;
}

.plan-price {
  margin: 0.5rem 0 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
}

.badge-pill {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}

.resolution-table {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.resolution-table li {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.resolution-table li span:last-child {
  font-weight: 700;
  color: #4338ca;
}

.pricing-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
}

.pricing-card.free-trial {
  border-color: #e5e7eb;
}

.pricing-card.featured {
  border-color: #6366f1;
  transform: scale(1.05);
}

.pricing-card.featured:hover {
  transform: scale(1.05) translateY(-10px);
}

.pricing-card.enterprise {
  border-color: #f59e0b;
}

.popular-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Plan v3 §S2.5：Grading 卡 30 天免费试用样式。 */
.trial-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #06b6d4 0%, #0e7490 100%);
  color: white;
  padding: 0.5rem 1.25rem;
  border-radius: 50px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  box-shadow: 0 12px 26px rgba(6, 182, 212, 0.28);
}

.btn-trial {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.85rem 1.5rem;
  background: white;
  color: #0e7490;
  border: 2px solid #06b6d4;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-trial:hover {
  background: #ecfeff;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(6, 182, 212, 0.22);
}

.trial-footnote {
  margin: 0.65rem 0 0;
  color: #0e7490;
  font-size: 0.82rem;
  line-height: 1.5;
  text-align: center;
}

.card-header {
  text-align: center;
  margin-bottom: 2rem;
}

.plan-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.free-trial .plan-badge {
  background: #ecfdf5;
  color: #065f46;
}

.featured .plan-badge {
  background: #eef2ff;
  color: #4338ca;
}

.enterprise .plan-badge {
  background: #fef3c7;
  color: #92400e;
}

.plan-name {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.plan-description {
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.6;
}

.pricing {
  text-align: center;
  margin-bottom: 2rem;
}

.price-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.price-symbol {
  font-size: 1.5rem;
  font-weight: 600;
  color: #6b7280;
}

.price-amount {
  font-size: 4rem;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

.price-period {
  font-size: 1.25rem;
  color: #6b7280;
}

.price-note {
  color: #6b7280;
  font-size: 0.9rem;
}

.price-savings {
  color: #10b981;
  font-weight: 600;
  font-size: 0.9rem;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #374151;
  font-size: 0.95rem;
}

.feature-item.disabled {
  color: #9ca3af;
  text-decoration: line-through;
}

.check-icon {
  font-weight: bold;
  color: #10b981;
}

.feature-item.disabled .check-icon {
  color: #ef4444;
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  width: 100%;
  padding: 1rem 2rem;
  background: white;
  color: #6366f1;
  border: 2px solid #6366f1;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #6366f1;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.btn-large {
  padding: 1.25rem 2.5rem;
  font-size: 1.1rem;
}

/* FAQ Section */
.faq-section {
  background: white;
  padding: 4rem 1.5rem;
  position: relative;
  z-index: 1;
}

.faq-container {
  max-width: 1200px;
  margin: 0 auto;
}

.faq-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 3rem;
}

.faq-list {
  max-width: 820px;
  margin: 0 auto;
  border-top: 1px solid #e5e7eb;
}

.faq-item {
  background: transparent;
  padding: 0;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid #e5e7eb;
}

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0.25rem;
  cursor: pointer;
  list-style: none;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0;
  transition: color 0.15s ease;
}

.faq-question::-webkit-details-marker {
  display: none;
}

.faq-question:hover {
  color: #4f46e5;
}

.faq-question-text {
  flex: 1;
  min-width: 0;
}

.faq-arrow {
  flex-shrink: 0;
  color: #6366f1;
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.faq-item[open] > .faq-question .faq-arrow {
  transform: rotate(180deg);
}

.faq-answer {
  color: #4b5563;
  line-height: 1.7;
  margin: 0 0 1rem;
  padding: 0 0.25rem;
  font-size: 0.95rem;
}

/* CTA Section */
.cta-section {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  padding: 4rem 1.5rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.cta-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.enterprise-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1200;
}

.enterprise-dialog {
  width: min(560px, 100%);
  background: white;
  border-radius: 22px;
  padding: 1.5rem;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
}

.enterprise-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.enterprise-dialog-eyebrow {
  margin: 0 0 0.35rem;
  color: #6366f1;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.enterprise-dialog-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #0f172a;
}

.enterprise-dialog-close {
  border: none;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.enterprise-dialog-copy {
  margin: 0 0 1rem;
  color: #475569;
  line-height: 1.7;
}

.enterprise-dialog-list {
  margin: 0;
  padding-left: 1.2rem;
  color: #334155;
  line-height: 1.8;
}

.enterprise-dialog-notice {
  margin: 1rem 0 0;
  color: #0ea5e9;
  font-weight: 700;
}

.enterprise-dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  
  .pricing-card.featured {
    transform: scale(1);
  }
  
  .pricing-card.featured:hover {
    transform: scale(1) translateY(-10px);
  }
  
  .cta-buttons {
    flex-direction: column;
    align-items: center;
  }

  .enterprise-dialog-actions {
    justify-content: stretch;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 4rem 1rem 2rem;
  }
  
  .pricing-card {
    padding: 2rem 1.5rem;
  }
  
  .price-amount {
    font-size: 3rem;
  }
}
</style>
