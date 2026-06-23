<template>
  <div class="token-dashboard">
    <div class="dashboard-header">
      <h2>{{ t('tokenBalance') }}</h2>
      <div class="header-actions">
        <button class="btn primary" @click="showPurchaseModal = true">
          <i class="icon">+</i> {{ t('getMoreTokens') }}
        </button>
        <button class="btn secondary" @click="refreshData">
          <i class="icon">refresh</i> {{ t('refresh') }}
        </button>
      </div>
    </div>

    <!-- Balance Overview -->
    <div class="balance-section">
      <div class="balance-card main">
        <div class="balance-info">
          <h3>{{ t('currentBalance') }}</h3>
          <div class="balance-amount">
            <span class="value">{{ formatNumber(tokenBalance.currentBalance) }}</span>
            <span class="currency">{{ t('tokenUnit') }}</span>
          </div>
          <div class="balance-meta">
            <span class="expires">{{ t('expires') }} {{ formatDate(tokenBalance.expiresAt) }}</span>
            <span class="status" :class="{ active: tokenBalance.isActive }">
              {{ tokenBalance.isActive ? t('active') : t('inactive') }}
            </span>
          </div>
        </div>
        <div class="balance-chart">
          <canvas ref="balanceChart"></canvas>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon earned">+</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(tokenBalance.totalEarned) }}</div>
            <div class="stat-label">{{ t('totalEarned') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon spent">-</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(tokenBalance.totalSpent) }}</div>
            <div class="stat-label">{{ t('totalSpent') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon expired">×</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(tokenBalance.totalExpired) }}</div>
            <div class="stat-label">{{ t('expired') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Token Pricing Display -->
    <div class="pricing-section">
      <h3>{{ t('tokenPricingPlans') }}</h3>
      <div class="pricing-grid">
        <div 
          v-for="pack in tokenPacks" 
          :key="pack.packId"
          class="pricing-card"
          :class="{ 
            recommended: pack.packId === 'basic',
            bestvalue: pack.packId === 'professional'
          }"
        >
          <div class="pricing-header">
            <h4>{{ pack.name }}</h4>
            <span v-if="pack.packId === 'basic'" class="recommended-badge">{{ t('mostPopular') }}</span>
            <span v-if="pack.packId === 'professional'" class="bestvalue-badge">{{ t('bestValue') }}</span>
          </div>
          
          <div class="pricing-tokens">
            <div class="tokens-amount">{{ formatNumber(pack.tokens) }}</div>
            <div class="tokens-label">{{ t('tokensTitle') }}</div>
          </div>
          
          <div class="pricing-price">
            <div class="price-amount">${{ pack.price }}</div>
            <div class="price-per-token">${{ formatNumber(pack.price / pack.tokens) }}{{ t('perToken') }}</div>
            <div class="price-discount">{{ formatPackDiscount(pack) }}</div>
          </div>
          
          <div class="pricing-features">
            <div v-for="feature in pack.features.split(',')" :key="feature" class="feature-item">
              {{ feature.trim() }}
            </div>
          </div>
          
          <button 
            class="purchase-btn"
            @click="purchasePack(pack)"
          >
            {{ t('purchase') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Usage Analytics -->
    <div class="analytics-section">
      <h3>{{ t('usageAnalytics') }}</h3>
      <div class="period-selector">
        <button 
          v-for="period in periods" 
          :key="period.value"
          :class="{ active: selectedPeriod === period.value }"
          @click="selectedPeriod = period.value"
        >
          {{ period.label }}
        </button>
      </div>
      
      <div class="analytics-grid">
        <div class="analytics-card">
          <h4>{{ t('dailyAverage') }}</h4>
          <div class="analytics-value">{{ formatNumber(analytics.averageDailyUsage) }}</div>
          <div class="analytics-trend" :class="getTrendClass(analytics.averageDailyUsage)">
            {{ getTrendIcon(analytics.averageDailyUsage) }}
          </div>
        </div>
        <div class="analytics-card">
          <h4>{{ t('projectedMonthly') }}</h4>
          <div class="analytics-value">{{ formatNumber(analytics.projectedMonthlyUsage) }}</div>
          <div class="analytics-trend" :class="getTrendClass(analytics.projectedMonthlyUsage)">
            {{ getTrendIcon(analytics.projectedMonthlyUsage) }}
          </div>
        </div>
      </div>

      <div class="usage-breakdown">
        <h4>{{ t('usageByCategory') }}</h4>
        <div class="breakdown-list">
          <div 
            v-for="item in analytics.usageBreakdown" 
            :key="item.category"
            class="breakdown-item"
          >
            <div class="category-name">{{ item.category }}</div>
            <div class="category-usage">{{ formatNumber(item.tokensUsed) }}</div>
            <div class="category-percentage">{{ item.percentage }}%</div>
            <div class="category-bar">
              <div class="bar-fill" :style="{ width: item.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="transactions-section">
      <div class="section-header">
        <h3>{{ t('recentTransactions') }}</h3>
        <button class="btn secondary" @click="viewAllTransactions">
          {{ t('viewAll') }}
        </button>
      </div>
      
      <div class="transaction-list">
        <div 
          v-for="transaction in recentTransactions" 
          :key="transaction.transactionId"
          class="transaction-item"
          :class="transaction.type.toLowerCase()"
        >
          <div class="transaction-icon">
            {{ getTransactionIcon(transaction.type) }}
          </div>
          <div class="transaction-details">
            <div class="transaction-description">{{ transaction.description }}</div>
            <div class="transaction-meta">
              {{ formatDate(transaction.createdAt) }} · {{ transaction.status }}
            </div>
          </div>
          <div class="transaction-amount" :class="getAmountClass(transaction.type)">
            {{ formatTransactionAmount(transaction) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Purchase Modal -->
    <TokenPurchaseModal 
      :is-open="showPurchaseModal"
      :token-packs="tokenPacks"
      @close="showPurchaseModal = false"
      @success="handlePurchaseSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '../stores/token'
import { useUiLocaleStore } from '../stores/uiLocale'
import type { TokenAnalytics, TokenBalance, TokenPack } from '../stores/token'
import TokenPurchaseModal from './TokenPurchaseModal.vue'
import { formatNumber, formatDate } from '../utils/format'

const tokenStore = useTokenStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const TOKEN_DASHBOARD_I18N = {
  en: {
    tokenBalance: 'Token Balance',
    getMoreTokens: 'Get More Tokens',
    refresh: 'Refresh',
    currentBalance: 'Current Balance',
    tokenUnit: 'tokens',
    expires: 'Expires:',
    active: 'Active',
    inactive: 'Inactive',
    totalEarned: 'Total Earned',
    totalSpent: 'Total Spent',
    expired: 'Expired',
    tokenPricingPlans: 'Token Pricing Plans',
    mostPopular: 'Most Popular',
    bestValue: 'Best Value',
    tokensTitle: 'Tokens',
    perToken: '/token',
    purchase: 'Purchase',
    usageAnalytics: 'Usage Analytics',
    dailyAverage: 'Daily Average',
    projectedMonthly: 'Projected Monthly',
    usageByCategory: 'Usage by Category',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    customPricing: 'Custom pricing',
    mostPopularRate: 'Most popular',
    standardRate: 'Standard rate',
    days7: '7 Days',
    days30: '30 Days',
    days90: '90 Days',
    year1: '1 Year',
  },
  zh: {
    tokenBalance: 'Token 余额',
    getMoreTokens: '获取更多 Tokens',
    refresh: '刷新',
    currentBalance: '当前余额',
    tokenUnit: 'Tokens',
    expires: '到期时间：',
    active: '启用中',
    inactive: '未启用',
    totalEarned: '累计获得',
    totalSpent: '累计消耗',
    expired: '已过期',
    tokenPricingPlans: 'Token 价格方案',
    mostPopular: '最受欢迎',
    bestValue: '最优价格',
    tokensTitle: 'Tokens',
    perToken: '/Token',
    purchase: '购买',
    usageAnalytics: '使用分析',
    dailyAverage: '日均使用',
    projectedMonthly: '预计月使用量',
    usageByCategory: '按分类统计',
    recentTransactions: '最近交易',
    viewAll: '查看全部',
    customPricing: '自定义价格',
    mostPopularRate: '最受欢迎',
    standardRate: '标准费率',
    days7: '7 天',
    days30: '30 天',
    days90: '90 天',
    year1: '1 年',
  },
} as const

function t(key: keyof typeof TOKEN_DASHBOARD_I18N.en) {
  return TOKEN_DASHBOARD_I18N[locale.value][key] || TOKEN_DASHBOARD_I18N.en[key]
}

// Reactive data
const showPurchaseModal = ref(false)
const selectedPeriod = ref('30d')
const balanceChart = ref<HTMLCanvasElement>()

const periods = computed(() => [
  { label: t('days7'), value: '7d' },
  { label: t('days30'), value: '30d' },
  { label: t('days90'), value: '90d' },
  { label: t('year1'), value: '1y' }
])

// Computed properties
const emptyBalance: TokenBalance = {
  tenantId: '',
  userId: '',
  currentBalance: 0,
  totalEarned: 0,
  totalSpent: 0,
  totalExpired: 0,
  lastActivityAt: '',
  expiresAt: '',
  isActive: false,
}
const emptyAnalytics: TokenAnalytics = {
  tenantId: '',
  period: '30d',
  totalTokensEarned: 0,
  totalTokensSpent: 0,
  totalTokensExpired: 0,
  currentBalance: 0,
  averageDailyUsage: 0,
  projectedMonthlyUsage: 0,
  usageBreakdown: [],
  trends: [],
  metrics: {},
}

const tokenBalance = computed(() => tokenStore.balance || emptyBalance)
const analytics = computed(() => tokenStore.analytics || emptyAnalytics)
const recentTransactions = computed(() => tokenStore.recentTransactions)
const tokenPacks = computed(() => tokenStore.availablePacks)

// Methods
function refreshData() {
  tokenStore.fetchBalance()
  tokenStore.fetchAnalytics(selectedPeriod.value)
  tokenStore.fetchRecentTransactions()
  tokenStore.fetchAvailablePacks()
}

function viewAllTransactions() {
  // Navigate to full transaction history page
}

function handlePurchaseSuccess(result: any) {
  refreshData()
  showPurchaseModal.value = false
}

function purchasePack(pack: any) {
  // Direct purchase from dashboard
  console.log('Purchase pack:', pack.packId)
  showPurchaseModal.value = true
}

function formatPackDiscount(pack: TokenPack) {
  if (!pack.tokens || !pack.price) return t('customPricing')
  return pack.packId === 'basic' ? t('mostPopularRate') : t('standardRate')
}

function getTransactionIcon(type: string) {
  const icons = {
    purchase: '+',
    usage: '-',
    refund: '×',
    bonus: '×',
    expiration: '×',
    transfer_in: '×',
    transfer_out: '×',
    adjustment: '±'
  }
  return icons[type as keyof typeof icons] || '×'
}

function getAmountClass(type: string) {
  const positive = ['purchase', 'refund', 'bonus', 'transfer_in']
  return positive.includes(type) ? 'positive' : 'negative'
}

function formatTransactionAmount(transaction: any) {
  const amount = transaction.amount
  const prefix = getAmountClass(transaction.type) === 'positive' ? '+' : '-'
  return `${prefix}${formatNumber(Math.abs(amount))}`
}

function getTrendClass(value: number) {
  return value > 0 ? 'increasing' : 'decreasing'
}

function getTrendIcon(value: number) {
  return value > 0 ? '×' : '×'
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.token-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn.primary:hover {
  background: #0ea5e9;
  border-color: #0ea5e9;
}

.btn.secondary {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.btn.secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.balance-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.balance-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.balance-card.main {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 2rem;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 1rem 0;
}

.currency {
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
}

.value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
}

.balance-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #64748b;
}

.status.active {
  color: #10b981;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.stat-icon.earned {
  background: #dcfce7;
  color: #166534;
}

.stat-icon.spent {
  background: #fee2e2;
  color: #dc2626;
}

.stat-icon.expired {
  background: #f3f4f6;
  color: #6b7280;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
}

.pricing-section {
  margin-bottom: 2rem;
}

.pricing-section h3 {
  margin-bottom: 1.5rem;
  color: #1e293b;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.pricing-card {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  border: 2px solid #e2e8f0;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.pricing-card.recommended {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}

.pricing-card.bestvalue {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5, #ffffff);
}

.pricing-header {
  margin-bottom: 1.5rem;
}

.pricing-header h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.recommended-badge,
.bestvalue-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.recommended-badge {
  background: #3b82f6;
  color: white;
}

.bestvalue-badge {
  background: #10b981;
  color: white;
}

.pricing-tokens {
  margin-bottom: 1.5rem;
}

.tokens-amount {
  font-size: 3rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.tokens-label {
  font-size: 1rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.pricing-price {
  margin-bottom: 1.5rem;
}

.price-amount {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.price-per-token {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.price-discount {
  font-size: 0.875rem;
  color: #10b981;
  font-weight: 600;
  margin-top: 0.5rem;
}

.pricing-features {
  margin-bottom: 2rem;
  min-height: 80px;
}

.feature-item {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.feature-item::before {
  content: '×';
  color: #10b981;
  font-weight: 600;
}

.purchase-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.purchase-btn:hover {
  background: #0ea5e9;
}

.analytics-section {
  margin-bottom: 2rem;
}

.analytics-section h3 {
  margin-bottom: 1rem;
  color: #1e293b;
}

.period-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.period-selector button {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-selector button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.analytics-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.analytics-card h4 {
  margin: 0 0 0.5rem 0;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

.analytics-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.analytics-trend {
  margin-top: 0.5rem;
  font-size: 1rem;
}

.analytics-trend.increasing {
  color: #10b981;
}

.analytics-trend.decreasing {
  color: #ef4444;
}

.usage-breakdown h4 {
  margin-bottom: 1rem;
  color: #1e293b;
}

.breakdown-list {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
}

.breakdown-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.breakdown-item:last-child {
  border-bottom: none;
}

.category-name {
  font-weight: 500;
  color: #374151;
}

.category-usage {
  text-align: right;
  font-weight: 600;
  color: #1e293b;
}

.category-percentage {
  text-align: right;
  color: #64748b;
}

.category-bar {
  grid-column: 1 / -1;
  height: 0.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
}

.transactions-section {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  color: #1e293b;
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.transaction-item:hover {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.transaction-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  background: #f1f5f9;
  color: #64748b;
}

.transaction-item.purchase .transaction-icon {
  background: #dcfce7;
  color: #166534;
}

.transaction-item.usage .transaction-icon {
  background: #fee2e2;
  color: #dc2626;
}

.transaction-details {
  flex: 1;
}

.transaction-description {
  font-weight: 500;
  color: #1e293b;
}

.transaction-meta {
  font-size: 0.875rem;
  color: #64748b;
}

.transaction-amount {
  font-weight: 600;
  font-size: 1rem;
}

.transaction-amount.positive {
  color: #10b981;
}

.transaction-amount.negative {
  color: #dc2626;
}

@media (max-width: 768px) {
  .balance-section {
    grid-template-columns: 1fr;
  }
  
  .balance-card.main {
    grid-template-columns: 1fr;
  }
  
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  
  .breakdown-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .category-usage,
  .category-percentage {
    text-align: left;
  }
}
</style>
