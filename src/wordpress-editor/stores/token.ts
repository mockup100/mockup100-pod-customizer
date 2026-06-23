import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiFetch } from '../api/client'
import { useAuthStore } from './auth'

export interface TokenBalance {
  tenantId: string
  userId: string
  currentBalance: number
  totalEarned: number
  totalSpent: number
  totalExpired: number
  lastActivityAt: string
  expiresAt: string | null
  isActive: boolean
}

export interface TokenTransaction {
  transactionId: string
  tenantId: string
  userId: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  referenceId: string
  status: string
  createdAt: string
  expiresAt?: string
}

export interface TokenPack {
  packId: string
  name: string
  description: string
  tokens: number
  price: number
  currency: string
  isActive: boolean
  sortOrder: number
  features: string
}

export interface TokenAnalytics {
  tenantId: string
  period: string
  totalTokensEarned: number
  totalTokensSpent: number
  totalTokensExpired: number
  currentBalance: number
  averageDailyUsage: number
  projectedMonthlyUsage: number
  usageBreakdown: Array<{
    category: string
    tokensUsed: number
    percentage: number
    transactionCount: number
  }>
  trends: Array<{
    date: string
    balance: number
    dailyUsage: number
    cumulativeUsage: number
  }>
  metrics: Record<string, number>
}

export interface TokenPurchaseRequest {
  tenantId: string
  userId: string
  packType: string
  amount?: number
  paymentMethod: string
  promoCode?: string
  billingAddress?: string
}

export interface TokenPurchaseResponse {
  transactionId: string
  tenantId: string
  userId: string
  tokensPurchased: number
  totalTokens: number
  amountPaid: number
  currency: string
  paymentMethod: string
  processedAt: string
  expiresAt: string | null
  status: string
  message: string
}

export const useTokenStore = defineStore('token', () => {
  const authStore = useAuthStore()
  
  // State
  const balance = ref<TokenBalance | null>(null)
  const transactions = ref<TokenTransaction[]>([])
  const recentTransactions = ref<TokenTransaction[]>([])
  const availablePacks = ref<TokenPack[]>([])
  const analytics = ref<TokenAnalytics | null>(null)
  const loading = ref(false)
  const error = ref('')
  
  // Computed
  const currentBalance = computed(() => balance.value?.currentBalance || 0)
  const isBalanceLoading = computed(() => loading.value)
  const hasSufficientTokens = computed(() => (amount: number) => currentBalance.value >= amount)
  
  // Actions
  async function fetchBalance() {
    loading.value = true
    error.value = ''
    try {
      const response = await apiFetch<TokenBalance>('/tokens/balance', {
        headers: authStore.authHeaders
      })
      balance.value = response
    } catch (err) {
      error.value = String(err)
      console.error('Failed to fetch token balance:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function fetchTransactionHistory(page = 0, size = 20, type?: string, status?: string) {
    loading.value = true
    error.value = ''
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString()
      })
      if (type) params.append('type', type)
      if (status) params.append('status', status)
      
      const response = await apiFetch<{ content: TokenTransaction[] }>(`/tokens/transactions?${params}`, {
        headers: authStore.authHeaders
      })
      transactions.value = response.content
    } catch (err) {
      error.value = String(err)
      console.error('Failed to fetch transaction history:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function fetchRecentTransactions() {
    loading.value = true
    error.value = ''
    try {
      const response = await apiFetch<{ content: TokenTransaction[] }>('/tokens/transactions?page=0&size=10', {
        headers: authStore.authHeaders
      })
      recentTransactions.value = response.content
    } catch (err) {
      error.value = String(err)
      console.error('Failed to fetch recent transactions:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function fetchAvailablePacks() {
    loading.value = true
    error.value = ''
    try {
      const response = await apiFetch<TokenPack[]>('/tokens/packs')
      availablePacks.value = response.sort((a, b) => a.sortOrder - b.sortOrder)
    } catch (err) {
      error.value = String(err)
      console.error('Failed to fetch token packs:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function fetchAnalytics(period = '30d') {
    loading.value = true
    error.value = ''
    try {
      const response = await apiFetch<TokenAnalytics>(`/tokens/analytics?period=${period}`, {
        headers: authStore.authHeaders
      })
      analytics.value = response
    } catch (err) {
      error.value = String(err)
      console.error('Failed to fetch token analytics:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function purchaseTokens(request: TokenPurchaseRequest) {
    loading.value = true
    error.value = ''
    try {
      const response = await apiFetch<TokenPurchaseResponse>('/tokens/purchase', {
        method: 'POST',
        headers: authStore.authHeaders,
        body: JSON.stringify(request)
      })
      
      // Refresh balance after successful purchase
      if (response.status === 'COMPLETED') {
        await fetchBalance()
        await fetchRecentTransactions()
      }
      
      return response
    } catch (err) {
      error.value = String(err)
      console.error('Failed to purchase tokens:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function recordUsage(amount: number, referenceId: string, description = 'Render usage') {
    loading.value = true
    error.value = ''
    try {
      const response = await apiFetch<TokenTransaction>('/tokens/usage', {
        method: 'POST',
        headers: authStore.authHeaders,
        body: JSON.stringify({
          tenantId: authStore.tenant?.tenant_id,
          userId: authStore.account?.account_id,
          amount,
          description,
          referenceId
        })
      })
      
      // Refresh balance after usage
      await fetchBalance()
      
      return response
    } catch (err) {
      error.value = String(err)
      console.error('Failed to record usage:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  function reset() {
    balance.value = null
    transactions.value = []
    recentTransactions.value = []
    availablePacks.value = []
    analytics.value = null
    loading.value = false
    error.value = ''
  }
  
  return {
    // State
    balance,
    transactions,
    recentTransactions,
    availablePacks,
    analytics,
    loading,
    error,
    
    // Computed
    currentBalance,
    isBalanceLoading,
    hasSufficientTokens,
    
    // Actions
    fetchBalance,
    fetchTransactionHistory,
    fetchRecentTransactions,
    fetchAvailablePacks,
    fetchAnalytics,
    purchaseTokens,
    recordUsage,
    reset
  }
})
