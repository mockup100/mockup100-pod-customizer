<template>
  <div class="pricing-plans">
    <div class="pricing-header">
      <h2 class="pricing-title">{{ text.header.title }}</h2>
      <p class="pricing-subtitle">
        {{ text.header.subtitle }}
      </p>

      <div class="billing-toggle">
        <span>{{ text.header.monthly }}</span>
        <button
          :class="{ active: isAnnual }"
          class="toggle-switch"
          @click="isAnnual = !isAnnual"
        >
          <div class="toggle-slider"></div>
        </button>
        <span>{{ text.header.annual }} <Badge variant="success" size="sm">{{ text.header.annualSave }}</Badge></span>
      </div>
    </div>

    <!-- Plan v3 §S2.5：Grading 30 天免费试用通用提示（PricingPlans 未渲染独立 Grading 卡，
         此处用横幅同步告知 30-day trial 入口；CTA 指向 /pricing#grading 详细页）。 -->
    <div class="grading-trial-banner">
      <div class="grading-trial-banner-copy">
        <span class="grading-trial-banner-badge">{{ text.gradingTrial.badge }}</span>
        <strong>{{ text.gradingTrial.headline }}</strong>
        <p>{{ text.gradingTrial.footnote }}</p>
      </div>
      <a class="grading-trial-banner-cta" :href="gradingTrialHref">
        {{ text.gradingTrial.cta }}
      </a>
    </div>

    <div class="pricing-grid">
      <div class="pricing-card free" :class="{ featured: selectedPlan === 'free' }">
        <div class="plan-header">
          <h3 class="plan-name">{{ text.plans.free.name }}</h3>
          <div class="plan-price">
            <span class="price-amount">$0</span>
            <span class="price-period">{{ text.plans.free.pricePeriod }}</span>
          </div>
          <p class="plan-description">{{ text.plans.free.description }}</p>
        </div>

        <div class="plan-features">
          <div v-for="feature in text.plans.free.features" :key="feature.label" class="feature-item" :class="{ disabled: feature.disabled }">
            <Check v-if="!feature.disabled" class="w-5 h-5 text-green-500" />
            <X v-else class="w-5 h-5 text-gray-400" />
            <span>{{ feature.label }}</span>
          </div>
        </div>

        <div class="plan-footer">
          <Button
            variant="outline"
            class="w-full"
            :disabled="currentPlan === 'free'"
            @click="selectPlan('free')"
          >
            {{ currentPlan === 'free' ? text.common.currentPlan : text.plans.free.cta }}
          </Button>
        </div>
      </div>

      <div class="pricing-card starter" :class="{ featured: selectedPlan === 'starter' }">
        <div class="plan-badge">{{ text.plans.starter.badge }}</div>
        <div class="plan-header">
          <h3 class="plan-name">{{ text.plans.starter.name }}</h3>
          <div class="plan-price">
            <span class="price-amount">${{ isAnnual ? "16" : "20" }}</span>
            <span class="price-period">{{ text.common.perMonth }}</span>
          </div>
          <p class="plan-description">{{ text.plans.starter.description }}</p>
        </div>

        <div class="plan-features">
          <div v-for="feature in text.plans.starter.features" :key="feature" class="feature-item">
            <Check class="w-5 h-5 text-green-500" />
            <span>{{ feature }}</span>
          </div>
        </div>

        <div class="plan-footer">
          <Button
            variant="primary"
            class="w-full"
            :disabled="currentPlan === 'starter'"
            @click="selectPlan('starter')"
          >
            {{ currentPlan === 'starter' ? text.common.currentPlan : text.plans.starter.cta }}
          </Button>
        </div>
      </div>

      <div class="pricing-card professional" :class="{ featured: selectedPlan === 'professional' }">
        <div class="plan-header">
          <h3 class="plan-name">{{ text.plans.professional.name }}</h3>
          <div class="plan-price">
            <span class="price-amount">${{ isAnnual ? "64" : "80" }}</span>
            <span class="price-period">{{ text.common.perMonth }}</span>
          </div>
          <p class="plan-description">{{ text.plans.professional.description }}</p>
        </div>

        <div class="plan-features">
          <div v-for="feature in text.plans.professional.features" :key="feature" class="feature-item">
            <Check class="w-5 h-5 text-green-500" />
            <span>{{ feature }}</span>
          </div>
        </div>

        <div class="plan-footer">
          <Button
            variant="primary"
            class="w-full"
            :disabled="currentPlan === 'professional'"
            @click="selectPlan('professional')"
          >
            {{ currentPlan === 'professional' ? text.common.currentPlan : text.plans.professional.cta }}
          </Button>
        </div>
      </div>

      <div class="pricing-card business" :class="{ featured: selectedPlan === 'business' }">
        <div class="plan-header">
          <h3 class="plan-name">{{ text.plans.business.name }}</h3>
          <div class="plan-price">
            <span class="price-amount">${{ isAnnual ? "200" : "250" }}</span>
            <span class="price-period">{{ text.common.perMonth }}</span>
          </div>
          <p class="plan-description">{{ text.plans.business.description }}</p>
        </div>

        <div class="plan-features">
          <div v-for="feature in text.plans.business.features" :key="feature" class="feature-item">
            <Check class="w-5 h-5 text-green-500" />
            <span>{{ feature }}</span>
          </div>
        </div>

        <div class="plan-footer">
          <Button
            variant="primary"
            class="w-full"
            :disabled="currentPlan === 'business'"
            @click="selectPlan('business')"
          >
            {{ currentPlan === 'business' ? text.common.currentPlan : text.plans.business.cta }}
          </Button>
        </div>
      </div>

      <div class="pricing-card enterprise" :class="{ featured: selectedPlan === 'enterprise' }">
        <div class="plan-header">
          <h3 class="plan-name">{{ text.plans.enterprise.name }}</h3>
          <div class="plan-price">
            <span class="price-amount">{{ text.plans.enterprise.priceAmount }}</span>
            <span class="price-period"></span>
          </div>
          <p class="plan-description">{{ text.plans.enterprise.description }}</p>
        </div>

        <div class="plan-features">
          <div v-for="feature in text.plans.enterprise.features" :key="feature" class="feature-item">
            <Check class="w-5 h-5 text-green-500" />
            <span>{{ feature }}</span>
          </div>
        </div>

        <div class="plan-footer">
          <Button variant="outline" class="w-full" @click="contactSales">
            {{ text.plans.enterprise.cta }}
          </Button>
        </div>
      </div>
    </div>

    <div class="token-purchase-section">
      <div class="token-header">
        <h3 class="token-title">{{ text.tokens.title }}</h3>
        <p class="token-subtitle">{{ text.tokens.subtitle }}</p>
      </div>

      <div class="token-plans">
        <div v-for="pack in tokenPacks" :key="pack.packId" class="token-card">
          <div class="token-header">
            <h4>{{ pack.name }}</h4>
            <div class="token-amount">{{ formatNumber(pack.tokens) }} {{ text.tokens.tokenUnit }}</div>
          </div>
          <div class="token-price">
            <span class="price">${{ pack.price }}</span>
            <span class="per-token">${{ formatNumber(pack.price / pack.tokens) }}{{ text.tokens.perToken }}</span>
          </div>
          <Button variant="outline" size="sm" @click="purchaseTokens(pack)">
            {{ text.tokens.buy }}
          </Button>
        </div>
      </div>
    </div>

    <div class="faq-section">
      <h3 class="faq-title">{{ text.faq.title }}</h3>
      <div class="faq-list">
        <div v-for="(faq, index) in text.faq.items" :key="index" class="faq-item">
          <button
            class="faq-question"
            :class="{ active: expandedFaq === index }"
            @click="toggleFaq(index)"
          >
            {{ faq.question }}
            <ChevronDown class="w-5 h-5 transition-transform" :class="{ 'rotate-180': expandedFaq === index }" />
          </button>
          <div v-show="expandedFaq === index" class="faq-answer">
            {{ faq.answer }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, ref } from "vue"
import { Check, ChevronDown, X } from "lucide-vue-next"
import { useTokenStore } from "../stores/token"
import { useUiLocaleStore } from "../stores/uiLocale"
import { useAuthStore } from "../stores/auth"
import Badge from "./ui/Badge.vue"
import Button from "./ui/Button.vue"

interface Props {
  currentPlan?: string
}

const PRICING_PLANS_I18N = {
  en: {
    header: {
      title: "Choose Your Plan",
      subtitle: "Start with our free tier, then upgrade as you grow. All plans include core features.",
      monthly: "Monthly",
      annual: "Annual",
      annualSave: "Save 20%",
    },
    common: {
      currentPlan: "Current Plan",
      perMonth: "/month",
    },
    plans: {
      free: {
        name: "Starter",
        pricePeriod: "forever",
        description: "Perfect for getting started",
        cta: "Get Started",
        features: [
          { label: "100 free renders", disabled: false },
          { label: "Basic templates library", disabled: false },
          { label: "512x512 resolution", disabled: false },
          { label: "Email support", disabled: false },
          { label: "API access", disabled: true },
          { label: "Custom branding", disabled: true },
        ],
      },
      starter: {
        badge: "Most Popular",
        name: "Pro",
        description: "Perfect for professionals",
        cta: "Upgrade to Starter",
        features: [
          "1,000 renders per month",
          "Advanced templates",
          "Up to 2048x2048 resolution",
          "Priority email support",
          "API access (1,000 calls/month)",
          "Basic analytics",
        ],
      },
      professional: {
        name: "Professional",
        description: "Perfect for growing businesses",
        cta: "Upgrade to Professional",
        features: [
          "10,000 renders per month",
          "All templates + exclusive",
          "Up to 4096x4096 resolution",
          "Priority support (24h)",
          "API access (10,000 calls/month)",
          "Custom branding",
          "Advanced analytics",
        ],
      },
      business: {
        name: "Business",
        description: "For teams and agencies",
        cta: "Upgrade to Business",
        features: [
          "100,000 renders per month",
          "Custom template creation",
          "Up to 4096x4096 resolution",
          "Dedicated support (4h)",
          "Unlimited API calls",
          "White-label options",
          "Team collaboration",
          "Custom integrations",
        ],
      },
      enterprise: {
        name: "Enterprise",
        priceAmount: "Custom",
        description: "Tailored solutions for large organizations",
        cta: "Contact Sales",
        features: [
          "Unlimited renders",
          "Custom resolution support",
          "24/7 dedicated support",
          "Unlimited everything",
          "SLA guarantee",
          "On-premise deployment",
          "Custom development",
        ],
      },
    },
    tokens: {
      title: "Need More Flexibility?",
      subtitle: "Purchase tokens for pay-as-you-go rendering without monthly commitments",
      tokenUnit: "Tokens",
      perToken: "/token",
      buy: "Buy Tokens",
    },
    // Plan v3 §S2.5：Grading 30-day trial 提示。
    gradingTrial: {
      badge: "Free 30-day trial",
      headline: "Try Grading Standard free for 30 days",
      footnote: "New users only — no credit card required.",
      cta: "Start free trial",
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          question: "Can I change plans anytime?",
          answer: "Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the next billing cycle.",
        },
        {
          question: "What happens if I exceed my render limit?",
          answer: "You can purchase additional tokens to continue rendering, or upgrade to a higher plan for more monthly renders.",
        },
        {
          question: "Do unused renders roll over?",
          answer: "Monthly render limits reset each billing period. However, purchased tokens never expire and can be used anytime.",
        },
        {
          question: "Is there a free trial for paid plans?",
          answer: "We offer a 14-day free trial for all paid plans. No credit card required to start your trial.",
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards, PayPal, and wire transfers for enterprise customers.",
        },
      ],
    },
  },
  zh: {
    header: {
      title: "选择适合你的套餐",
      subtitle: "先从免费层开始，随着业务增长再升级。所有套餐都包含核心功能。",
      monthly: "按月",
      annual: "按年",
      annualSave: "省 20%",
    },
    common: {
      currentPlan: "当前套餐",
      perMonth: "/月",
    },
    plans: {
      free: {
        name: "Starter",
        pricePeriod: "永久",
        description: "适合刚开始使用",
        cta: "开始使用",
        features: [
          { label: "100 次免费渲染", disabled: false },
          { label: "基础模板库", disabled: false },
          { label: "512x512 分辨率", disabled: false },
          { label: "邮件支持", disabled: false },
          { label: "API 访问", disabled: true },
          { label: "自定义品牌", disabled: true },
        ],
      },
      starter: {
        badge: "最受欢迎",
        name: "Pro",
        description: "适合专业用户",
        cta: "升级到 Starter",
        features: [
          "每月 1,000 次渲染",
          "高级模板",
          "最高 2048x2048 分辨率",
          "优先邮件支持",
          "API 访问（每月 1,000 次）",
          "基础分析",
        ],
      },
      professional: {
        name: "Professional",
        description: "适合成长中的企业",
        cta: "升级到 Professional",
        features: [
          "每月 10,000 次渲染",
          "全部模板 + 独家模板",
          "最高 4096x4096 分辨率",
          "优先支持（24 小时）",
          "API 访问（每月 10,000 次）",
          "自定义品牌",
          "高级分析",
        ],
      },
      business: {
        name: "Business",
        description: "适合团队与代理机构",
        cta: "升级到 Business",
        features: [
          "每月 100,000 次渲染",
          "自定义模板创建",
          "最高 4096x4096 分辨率",
          "专属支持（4 小时）",
          "不限量 API 调用",
          "白标选项",
          "团队协作",
          "自定义集成",
        ],
      },
      enterprise: {
        name: "Enterprise",
        priceAmount: "定制",
        description: "为大型组织提供定制化方案",
        cta: "联系销售",
        features: [
          "不限量渲染",
          "自定义分辨率支持",
          "7x24 专属支持",
          "全部能力不限量",
          "SLA 保障",
          "私有化部署",
          "定制开发",
        ],
      },
    },
    tokens: {
      title: "需要更灵活的方式？",
      subtitle: "购买 Tokens，按量渲染，无需月度承诺",
      tokenUnit: "Tokens",
      perToken: "/Token",
      buy: "购买 Tokens",
    },
    // Plan v3 §S2.5：Grading 30 天免费试用提示。
    gradingTrial: {
      badge: "免费试用 30 天",
      headline: "免费试用 Grading 标准版 30 天",
      footnote: "仅限新用户，无需信用卡。",
      cta: "开始免费试用",
    },
    faq: {
      title: "常见问题",
      items: [
        {
          question: "我可以随时更改套餐吗？",
          answer: "可以。你可以随时升级、降级或取消订阅，变更会在下一个计费周期生效。",
        },
        {
          question: "如果超出渲染额度会怎样？",
          answer: "你可以购买额外 Tokens 继续渲染，或者升级到更高套餐以获得更多月度渲染额度。",
        },
        {
          question: "未使用的渲染额度会结转吗？",
          answer: "月度渲染额度会在每个计费周期重置；但购买的 Tokens 永不过期，可随时使用。",
        },
        {
          question: "付费套餐有免费试用吗？",
          answer: "我们为所有付费套餐提供 14 天免费试用，开始试用无需信用卡。",
        },
        {
          question: "支持哪些付款方式？",
          answer: "我们支持主要信用卡、PayPal，以及面向企业客户的电汇。",
        },
      ],
    },
  },
} as const

const props = withDefaults(defineProps<Props>(), {
  currentPlan: "free",
})

const emit = defineEmits<{
  planSelected: [plan: string]
  tokenPurchase: [pack: any]
  contactSales: []
}>()

const tokenStore = useTokenStore()
const uiLocaleStore = useUiLocaleStore()
const authStore = useAuthStore()
const { locale } = storeToRefs(uiLocaleStore)
const isAnnual = ref(false)
const selectedPlan = ref(props.currentPlan)
const expandedFaq = ref<number | null>(null)

const currentPlan = computed(() => props.currentPlan)
const currentLocale = computed(() => (locale.value === "zh" ? "zh" : "en"))
const text = computed(() => PRICING_PLANS_I18N[currentLocale.value])
const tokenPacks = computed(() => tokenStore.availablePacks || [])
// Plan v3 §S2.5：Grading 30 天 trial 入口（未登录走注册回流，登录态直接进入 trial 自动开启）。
const gradingTrialHref = computed(() =>
  authStore.isAuthenticated
    ? "/admin/tokens-management?intent=grading-trial#grading-subscription"
    : "/auth?mode=register&redirect=/admin/tokens-management?intent=grading-trial",
)

function selectPlan(plan: string) {
  selectedPlan.value = plan
  emit("planSelected", plan)
}

function purchaseTokens(pack: any) {
  emit("tokenPurchase", pack)
}

function contactSales() {
  emit("contactSales")
}

function toggleFaq(index: number) {
  expandedFaq.value = expandedFaq.value === index ? null : index
}

function formatNumber(num: number): string {
  return num.toLocaleString(currentLocale.value === "zh" ? "zh-CN" : "en-US")
}
</script>

<style scoped>
.pricing-plans {
  @apply space-y-12;
}

.pricing-header {
  @apply text-center max-w-3xl mx-auto;
}

.pricing-title {
  @apply text-3xl font-bold text-gray-900 mb-4;
}

.pricing-subtitle {
  @apply text-lg text-gray-600 mb-8;
}

.billing-toggle {
  @apply flex items-center justify-center space-x-4;
}

/* Plan v3 §S2.5：Grading 30 天免费试用横幅。 */
.grading-trial-banner {
  @apply max-w-4xl mx-auto flex flex-col gap-4 rounded-xl border border-cyan-200 bg-cyan-50 p-6 sm:flex-row sm:items-center sm:justify-between;
}

.grading-trial-banner-copy {
  @apply flex flex-col gap-1;
}

.grading-trial-banner-badge {
  @apply self-start rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-700;
}

.grading-trial-banner-copy strong {
  @apply text-base font-bold text-gray-900;
}

.grading-trial-banner-copy p {
  @apply text-sm text-gray-600;
}

.grading-trial-banner-cta {
  @apply inline-flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white no-underline transition-colors hover:bg-cyan-700;
}

.toggle-switch {
  @apply relative w-12 h-6 bg-gray-200 rounded-full transition-colors duration-200;
}

.toggle-switch.active {
  @apply bg-blue-600;
}

.toggle-slider {
  @apply absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200;
}

.toggle-switch.active .toggle-slider {
  @apply transform translate-x-6;
}

.pricing-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6;
}

.pricing-card {
  @apply bg-white border border-gray-200 rounded-xl p-6 relative transition-all duration-200 hover:shadow-lg;
}

.pricing-card.featured {
  @apply border-blue-500 shadow-xl ring-2 ring-blue-500 ring-opacity-50;
}

.plan-badge {
  @apply absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium;
}

.plan-header {
  @apply text-center mb-6;
}

.plan-name {
  @apply text-xl font-bold text-gray-900 mb-2;
}

.plan-price {
  @apply items-baseline mb-2;
}

.price-amount {
  @apply text-4xl font-bold text-gray-900;
}

.price-period {
  @apply text-gray-600 ml-1;
}

.plan-description {
  @apply text-gray-600;
}

.plan-features {
  @apply space-y-3 mb-6;
}

.feature-item {
  @apply flex items-center space-x-3;
}

.feature-item.disabled {
  @apply opacity-50;
}

.plan-footer {
  @apply mt-auto;
}

.token-purchase-section {
  @apply bg-gray-50 rounded-xl p-8;
}

.token-header {
  @apply text-center mb-6;
}

.token-title {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.token-subtitle {
  @apply text-gray-600;
}

.token-plans {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.token-card {
  @apply bg-white border border-gray-200 rounded-lg p-4 text-center;
}

.token-header h4 {
  @apply font-semibold text-gray-900 mb-1;
}

.token-amount {
  @apply text-lg font-bold text-blue-600 mb-2;
}

.token-price {
  @apply space-y-1 mb-4;
}

.token-price .price {
  @apply text-xl font-bold text-gray-900;
}

.token-price .per-token {
  @apply text-sm text-gray-600;
}

.faq-section {
  @apply max-w-3xl mx-auto;
}

.faq-title {
  @apply text-2xl font-bold text-gray-900 text-center mb-8;
}

.faq-list {
  @apply space-y-4;
}

.faq-item {
  @apply bg-white border border-gray-200 rounded-lg;
}

.faq-question {
  @apply w-full flex items-center justify-between p-4 text-left font-medium text-gray-900 hover:bg-gray-50 transition-colors duration-200;
}

.faq-question.active {
  @apply bg-blue-50 text-blue-900;
}

.faq-answer {
  @apply p-4 pt-0 text-gray-600;
}

@media (max-width: 1024px) {
  .pricing-grid {
    @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
  }
  
  .pricing-card:last-child {
    @apply lg:col-span-3;
  }
}

@media (max-width: 768px) {
  .pricing-grid {
    @apply grid-cols-1;
  }
  
  .billing-toggle {
    @apply flex-col space-y-2 space-x-0;
  }
  
  .token-plans {
    @apply grid-cols-1;
  }
}
</style>
