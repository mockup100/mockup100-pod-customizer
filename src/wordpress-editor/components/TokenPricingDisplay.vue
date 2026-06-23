<template>
  <div class="token-pricing-display">
    <div class="pricing-header">
      <h3>{{ t('title') }}</h3>
      <p class="pricing-subtitle">{{ t('subtitle') }}</p>
    </div>

    <div class="pricing-benefits">
      <div class="benefit-card">
        <strong>{{ freeTokens }}</strong>
        <span>{{ t('grantedOnSignup') }}</span>
      </div>
      <div class="benefit-card">
        <strong>{{ t('consoleFreeTitle') }}</strong>
        <span>{{ t('consoleFreeDesc') }}</span>
      </div>
      <div class="benefit-card">
        <strong>{{ t('neverExpires') }}</strong>
        <span>{{ t('neverExpiresDesc') }}</span>
      </div>
    </div>
    
    <div class="pricing-grid">
      <div 
        v-for="rate in tokenRates" 
        :key="rate.size"
        class="pricing-item"
      >
        <div class="size-info">
          <div class="dimensions">{{ rate.dimensions }}</div>
          <div class="description">{{ rate.description }}</div>
        </div>
        <div class="token-info">
          <div class="token-count">{{ rate.tokens }} {{ t('tokenUnit') }}</div>
          <div class="usage-type">{{ rate.usage }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { FREE_TOKENS_ON_SIGNUP, TOKEN_RATES } from '../utils/tokenPricing'
import { useUiLocaleStore } from '../stores/uiLocale'

interface TokenRate {
  size: string
  dimensions: string
  tokens: number
  description: string
  usage: string
}

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const TOKEN_PRICING_I18N = {
  en: {
    title: 'Token Consumption Rules',
    subtitle: 'Simple, predictable pricing for every render size',
    grantedOnSignup: 'Granted on signup',
    consoleFreeTitle: 'Console 512 Free',
    consoleFreeDesc: 'Only Console 512 previews are free; larger Console sizes and all API sizes are billed',
    neverExpires: 'Never Expires',
    neverExpiresDesc: 'Use tokens when needed with no monthly subscription',
    tokenUnit: 'Token',
    freeTokensSuffix: 'Free Tokens',
    quickPreview: 'Quick preview',
    usage512: 'Free in Console preview, billed in API',
    standardOutput: 'Standard output',
    usage1024: 'Best for product galleries and storefront listings',
    highDetail: 'High detail',
    usage2048: 'Best for detailed hero images and print-ready exports',
    ultraMarketing: 'Ultra marketing',
    usage4096: 'Best for large-format campaign and high-resolution exports',
  },
  zh: {
    title: 'Token 消耗规则',
    subtitle: '每种渲染尺寸都采用简单、透明的计费方式',
    grantedOnSignup: '注册即送',
    consoleFreeTitle: 'Console 512 免费',
    consoleFreeDesc: '只有 Console 512 预览免费；更大的 Console 尺寸和全部 API 尺寸都会计费',
    neverExpires: '永久有效',
    neverExpiresDesc: '无需月费订阅，按需使用 Tokens',
    tokenUnit: 'Token',
    freeTokensSuffix: '免费 Tokens',
    quickPreview: '快速预览',
    usage512: 'Console 预览免费，API 调用计费',
    standardOutput: '标准输出',
    usage1024: '适合商品图库和店铺展示',
    highDetail: '高细节',
    usage2048: '适合细节主图和可打印导出',
    ultraMarketing: '营销超清',
    usage4096: '适合大幅营销图和高分辨率导出',
  },
} as const

function t(key: keyof typeof TOKEN_PRICING_I18N.en) {
  return TOKEN_PRICING_I18N[locale.value][key] || TOKEN_PRICING_I18N.en[key]
}

const tokenRates = computed<TokenRate[]>(() => [
  {
    size: '512',
    dimensions: '512×512',
    tokens: TOKEN_RATES['512'],
    description: t('quickPreview'),
    usage: t('usage512')
  },
  {
    size: '1024',
    dimensions: '1024×1024',
    tokens: TOKEN_RATES['1024'],
    description: t('standardOutput'),
    usage: t('usage1024')
  },
  {
    size: '2048',
    dimensions: '2048×2048',
    tokens: TOKEN_RATES['2048'],
    description: t('highDetail'),
    usage: t('usage2048')
  },
  {
    size: '4096',
    dimensions: '4096×4096',
    tokens: TOKEN_RATES['4096'],
    description: t('ultraMarketing'),
    usage: t('usage4096')
  }
])
const freeTokens = computed(() => `${FREE_TOKENS_ON_SIGNUP} ${t('freeTokensSuffix')}`)
</script>

<style scoped>
.token-pricing-display {
  @apply bg-white rounded-lg p-6 shadow-sm;
}

.pricing-header {
  @apply mb-6 text-center;
}

.pricing-benefits {
  @apply mb-6 grid grid-cols-1 md:grid-cols-3 gap-3;
}

.benefit-card {
  @apply rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-center;
}

.benefit-card strong {
  @apply block text-sm font-bold text-blue-700;
}

.benefit-card span {
  @apply mt-1 block text-xs text-blue-900;
}

.pricing-header h3 {
  @apply text-lg font-semibold text-gray-900 mb-2;
}

.pricing-subtitle {
  @apply text-gray-600;
}

.pricing-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-4;
}

.pricing-item {
  @apply border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200;
}

.size-info {
  @apply mb-3;
}

.dimensions {
  @apply text-lg font-bold text-gray-900 mb-1;
}

.description {
  @apply text-sm text-gray-600 mb-2;
}

.token-info {
  @apply flex justify-between items-center;
}

.token-count {
  @apply text-xl font-bold text-blue-600;
}

.usage-type {
  @apply text-sm text-gray-500;
}

@media (max-width: 768px) {
  .pricing-grid {
    @apply grid-cols-1;
  }
}
</style>
