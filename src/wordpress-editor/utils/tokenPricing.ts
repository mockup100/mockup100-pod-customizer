// Simplified token pricing model with three standard packs.

export interface TokenPack {
  packId: string
  name: string
  tokens: number
  price: number
  currency: string
  isActive: boolean
  sortOrder: number
  features: string
  popular?: boolean
}

export const FREE_TOKENS_ON_SIGNUP = 500
export const CUSTOM_AMOUNT_TOKENS_PER_USD = 200

// Three standard token packs.
export const TOKEN_PACKS: TokenPack[] = [
  {
    packId: 'starter',
    name: 'Starter Pack',
    tokens: 2000,
    price: 5,
    currency: 'USD',
    isActive: true,
    sortOrder: 1,
    features: 'Best for onboarding, quick previews, and small production batches',
    popular: false
  },
  {
    packId: 'basic', 
    name: 'Basic Pack',
    tokens: 10000,
    price: 20,
    currency: 'USD',
    isActive: true,
    sortOrder: 2,
    features: 'Most popular pack for regular listing production and API usage',
    popular: true
  },
  {
    packId: 'pro',
    name: 'Pro Pack', 
    tokens: 50000,
    price: 80,
    currency: 'USD',
    isActive: true,
    sortOrder: 3,
    features: 'Best for large teams, bulk generation, and sustained throughput',
    popular: false
  }
]

// Standard token consumption tiers.
// Spec lock-mockup100-final-pricing-products-scheme §Token Resolution Stair:
// 512=Free, 1024=1, 2048=2, 4096=8. 自定义尺寸按"向上取整到最近一档"计费。
export const TOKEN_RATES = {
  '512': 0,      // 512x512 = Free
  '1024': 1,     // 1024x1024 = 1 token
  '2048': 2,     // 2048x2048 = 2 tokens
  '4096': 8      // 4096x4096 = 8 tokens
}

const STANDARD_TIERS: Array<{ size: number; cost: number }> = [
  { size: 512, cost: 0 },
  { size: 1024, cost: 1 },
  { size: 2048, cost: 2 },
  { size: 4096, cost: 8 },
]

// 解析尺寸字符串为最大边长（支持 "1024" / "1024x1024" / "1024X768" / "1024×768"）
function resolveLongestEdge(size: string): number | null {
  if (!size) return null
  const trimmed = String(size).trim().toLowerCase()
  const aliases: Record<string, number> = {
    '1080': 1024, '1080p': 1024, 'fhd': 1024,
    '2k': 2048, '1440': 2048, '1440p': 2048, 'qhd': 2048,
    '4k': 4096, '2160': 4096, '2160p': 4096, 'uhd': 4096,
  }
  if (aliases[trimmed] !== undefined) return aliases[trimmed]
  const parts = trimmed.split(/[x×*\s,]+/).map((p) => parseInt(p, 10)).filter((n) => Number.isFinite(n) && n > 0)
  if (!parts.length) return null
  return Math.max(...parts)
}

// 将任意尺寸映射到最近的标准档位（向上取整，超过 4096 视为 4096 以上的自定义档拒绝）
export function resolveResolutionTier(size: string): { tierSize: number; cost: number } | null {
  const longest = resolveLongestEdge(size)
  if (longest == null) return null
  for (const tier of STANDARD_TIERS) {
    if (longest <= tier.size) return { tierSize: tier.size, cost: tier.cost }
  }
  return null // 超过 4096 → 不支持
}

// Calculate token cost.
export function calculateTokenCost(size: string, quantity: number): number {
  // 优先精确命中标准档；其次按向上取整策略
  const exact = TOKEN_RATES[size as keyof typeof TOKEN_RATES]
  if (typeof exact === 'number') return exact * quantity
  const tier = resolveResolutionTier(size)
  if (!tier) return 0
  return tier.cost * quantity
}

// Format token count for display.
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`
  }
  return tokens.toString()
}

// Get the best value pack recommendation.
export function getBestValuePack(tokensNeeded: number): TokenPack {
  return TOKEN_PACKS.reduce((best, pack) => {
    const bestCostPerToken = best.price / best.tokens
    const packCostPerToken = pack.price / pack.tokens
    
    return packCostPerToken < bestCostPerToken ? pack : best
  })
}
