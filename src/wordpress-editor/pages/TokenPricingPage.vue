<template>
  <div class="pricing-page">
    <div class="page-header">
      <h1>{{ t("title") }}</h1>
      <p>{{ t("subtitle") }}</p>
    </div>

    <div class="pricing-content">
      <!-- Token consumption rules -->
      <section class="section">
        <h2>{{ t("consumptionRules") }}</h2>
        <div class="rates-grid">
          <div 
            v-for="rate in tokenRates" 
            :key="rate.size"
            class="rate-card"
          >
            <div class="rate-header">
              <div class="dimensions">{{ rate.dimensions }}</div>
              <div class="tokens">{{ rate.tokens }} {{ t("tokenUnit") }}</div>
            </div>
            <div class="rate-description">
              {{ rate.description }}
            </div>
            <div class="rate-example">
              <span class="example-label">{{ t("example") }}:</span>
              <span class="example-text">{{ rate.example }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Token pack pricing -->
      <section class="section">
        <h2>{{ t("packPricing") }}</h2>
        <div class="packs-grid">
          <div 
            v-for="pack in tokenPacks" 
            :key="pack.packId"
            class="pack-card"
            :class="{ featured: pack.popular }"
          >
            <div class="pack-header">
              <div class="pack-name">{{ pack.name }}</div>
              <div class="pack-price">${{ pack.price }}</div>
            </div>
            <div class="pack-tokens">{{ formatNumber(pack.tokens) }} {{ t("tokens") }}</div>
            <div class="pack-rate">${{ formatRate(pack) }}/Token</div>
            <div v-if="pack.popular" class="popular-badge">{{ t("mostPopular") }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { TOKEN_RATES, TOKEN_PACKS } from '../utils/tokenPricing'
import { useUiLocaleStore } from "../stores/uiLocale"

interface TokenRate {
  size: string
  dimensions: string
  tokens: number
  description: string
  example: string
}

interface TokenPack {
  packId: string
  name: string
  tokens: number
  price: number
  popular?: boolean
}

const uiLocaleStore = useUiLocaleStore()
const currentLocale = computed(() => (uiLocaleStore.locale === "zh" ? "zh" : "en"))
const TOKEN_PRICING_I18N = {
  en: {
    title: "Token Pricing",
    subtitle: "Get 500 free tokens on signup, pay by output size, and use token packs that never expire.",
    consumptionRules: "Token Consumption Rules",
    packPricing: "Token Pack Pricing",
    tokenUnit: "Token",
    tokens: "Tokens",
    example: "Example",
    mostPopular: "Most Popular",
    quickPreview: "Quick preview",
    quickPreviewExample: "Free in Console preview and billed in API",
    standardOutput: "Standard output",
    standardOutputExample: "Product galleries and storefront listing images",
    highDetail: "High detail",
    highDetailExample: "Hero images, zoom views, and print-ready exports",
    ultraMarketing: "Ultra marketing",
    ultraMarketingExample: "Campaign visuals and large-format exports",
  },
  zh: {
    title: "令牌定价",
    subtitle: "注册即送 500 个免费令牌，按输出尺寸计费，令牌包永久有效。",
    consumptionRules: "令牌消耗规则",
    packPricing: "令牌包定价",
    tokenUnit: "令牌",
    tokens: "令牌",
    example: "示例",
    mostPopular: "最受欢迎",
    quickPreview: "快速预览",
    quickPreviewExample: "控制台预览免费，API 调用时计费",
    standardOutput: "标准输出",
    standardOutputExample: "适用于商品图库和店铺列表图片",
    highDetail: "高细节",
    highDetailExample: "适用于主图、缩放视图和可打印导出",
    ultraMarketing: "营销级超清",
    ultraMarketingExample: "适用于活动视觉和大尺寸导出",
  },
} as const

function t(key: keyof typeof TOKEN_PRICING_I18N.en) {
  return TOKEN_PRICING_I18N[currentLocale.value][key]
}

const tokenRates: TokenRate[] = [
  {
    size: '512',
    dimensions: '512×512',
    tokens: TOKEN_RATES['512'],
    description: t('quickPreview'),
    example: t('quickPreviewExample'),
  },
  {
    size: '1024',
    dimensions: '1024×1024',
    tokens: TOKEN_RATES['1024'],
    description: t('standardOutput'),
    example: t('standardOutputExample'),
  },
  {
    size: '2048',
    dimensions: '2048×2048',
    tokens: TOKEN_RATES['2048'],
    description: t('highDetail'),
    example: t('highDetailExample'),
  },
  {
    size: '4096',
    dimensions: '4096×4096',
    tokens: TOKEN_RATES['4096'],
    description: t('ultraMarketing'),
    example: t('ultraMarketingExample'),
  }
]

const tokenPacks: TokenPack[] = TOKEN_PACKS

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatRate(pack: TokenPack): string {
  return (pack.price / pack.tokens).toFixed(4)
}
</script>

<style scoped>
.pricing-page {
  @apply max-w-6xl mx-auto p-6;
}

.page-header {
  @apply text-center mb-12;
}

.page-header h1 {
  @apply text-3xl font-bold text-gray-900 mb-4;
}

.page-header p {
  @apply text-lg text-gray-600;
}

.pricing-content {
  @apply space-y-12;
}

.section {
  @apply bg-white rounded-lg shadow-sm p-8;
}

.section h2 {
  @apply text-2xl font-semibold text-gray-900 mb-6;
}

.rates-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}

.rate-card {
  @apply border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors duration-200;
}

.rate-header {
  @apply flex justify-between items-center mb-4;
}

.dimensions {
  @apply text-lg font-bold text-gray-900;
}

.tokens {
  @apply text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded;
}

.rate-description {
  @apply text-gray-700 mb-3;
}

.rate-example {
  @apply text-sm text-gray-600;
}

.example-label {
  @apply font-medium;
}

.example-text {
  @apply text-gray-800;
}

.packs-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}

.pack-card {
  @apply border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors duration-200 relative;
}

.pack-card.featured {
  @apply border-blue-500 bg-blue-50;
}

.pack-header {
  @apply flex justify-between items-center mb-4;
}

.pack-name {
  @apply text-lg font-semibold text-gray-900;
}

.pack-price {
  @apply text-2xl font-bold text-green-600;
}

.pack-tokens {
  @apply text-xl font-medium text-gray-700 mb-2;
}

.pack-rate {
  @apply text-sm text-gray-600;
}

.popular-badge {
  @apply absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded;
}

@media (max-width: 768px) {
  .rates-grid,
  .packs-grid {
    @apply grid-cols-1;
  }
}
</style>
