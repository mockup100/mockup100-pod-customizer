export const SIZE_LABELS: Record<string, string> = {
  '512': 'Quick Preview',
  '1024': 'Standard Listing',
  '2048': 'HD Detail',
  '4096': 'Ultra Marketing',
}

export const SIZE_DIMENSIONS: Record<string, string> = {
  '512': '512×512',
  '1024': '1024×1024',
  '2048': '2048×2048',
  '4096': '4096×4096',
}

// 计费档位（与后端 PricingCatalogProperties 单一可信源保持一致）：
// 512×512 永久免费 / 1024×1024 1 token / 2048×2048 2 tokens / 4096×4096 8 tokens
export const TOKEN_PRICES: Record<string, { tokens: number; displayRate: string }> = {
  '512': { tokens: 0, displayRate: 'Free' },
  '1024': { tokens: 1, displayRate: '1 token' },
  '2048': { tokens: 2, displayRate: '2 tokens' },
  '4096': { tokens: 8, displayRate: '8 tokens' },
}

// Token purchase packages - based on final pricing strategy
export const TOKEN_PACKS = {
  starter: { tokens: 2000, price: 5, bonus: 0, displayName: 'Starter Pack' },
  basic: { tokens: 10000, price: 20, bonus: 0, displayName: 'Basic Pack' },
  professional: { tokens: 50000, price: 80, bonus: 0, displayName: 'Professional Pack' },
  commercial: { tokens: 200000, price: 250, bonus: 0, displayName: 'Commercial Pack' },
  enterprise: { tokens: 1000000, price: 1000, bonus: 0, displayName: 'Enterprise Pack' },
}

export function sizeTokenToTier(size?: string | null) {
  if (!size) return '1024'
  const match = String(size).match(/(\d+)/)
  const numeric = Number(match?.[1] || 1024)
  if (numeric <= 512) return '512'
  if (numeric <= 1024) return '1024'
  if (numeric <= 2048) return '2048'
  return '4096'
}

export function formatSizeLabel(size?: string | null) {
  const tier = sizeTokenToTier(size)
  return `${SIZE_LABELS[tier]} · ${SIZE_DIMENSIONS[tier]}`
}

export function formatSizePrice(size?: string | null) {
  return formatTokenPrice(size)
}

// New token-focused pricing display
export function formatTokenPrice(size?: string | null) {
  const pricing = TOKEN_PRICES[sizeTokenToTier(size)]
  return `${pricing.displayRate}`
}

export function calculateTokenCost(size?: string | null, quantity: number = 1) {
  const tier = sizeTokenToTier(size)
  const pricing = TOKEN_PRICES[tier]
  return pricing.tokens * quantity
}

type QuotaLike = {
  preview_512_monthly_remaining?: number
}

export type RenderReceiptLine = {
  tier: string
  label: string
  outputs: number
  free_outputs: number
  paid_outputs: number
  tokens: number
}

export type RenderReceiptSummary = {
  total_outputs: number
  free_outputs: number
  paid_outputs: number
  free_512_outputs: number
  tokens: number
  lines: RenderReceiptLine[]
}

type RenderChargeOptions = {
  allowFreeQuota?: boolean
}

type RenderReceiptOptions = {
  allowFreeQuota?: boolean
}

export function describeCurrentRenderCharge(
  size: string | null | undefined,
  quota: QuotaLike | null | undefined,
  options: RenderChargeOptions = {},
) {
  const tier = sizeTokenToTier(size)
  const allowFreeQuota = options.allowFreeQuota ?? true
  if (allowFreeQuota && tier === '512' && (quota?.preview_512_monthly_remaining ?? 0) > 0) {
    return { mode: 'free', text: 'This render is covered by your available token allowance for 512 output' }
  }
  return { mode: 'paid', text: `This render uses ${formatSizeLabel(size)}: ${formatTokenPrice(size)}` }
}

export function buildRenderReceiptSummary(
  sizes: Array<string | null | undefined>,
  quota: QuotaLike | null | undefined,
  options: RenderReceiptOptions = {},
): RenderReceiptSummary {
  const counts = new Map<string, number>()
  sizes.forEach((size) => {
    const tier = sizeTokenToTier(size)
    counts.set(tier, (counts.get(tier) || 0) + 1)
  })

  const allowFreeQuota = options.allowFreeQuota ?? true
  let remaining512 = allowFreeQuota ? quota?.preview_512_monthly_remaining ?? 0 : 0
  const orderedTiers = ['512', '1024', '2048', '4096']
  const lines: RenderReceiptLine[] = []

  orderedTiers.forEach((tier) => {
    const outputs = counts.get(tier) || 0
    if (!outputs) return
    let free_outputs = 0
    if (tier === '512') {
      free_outputs = Math.min(outputs, remaining512)
      remaining512 -= free_outputs
    }
    const paid_outputs = Math.max(0, outputs - free_outputs)
    const tokenPrice = TOKEN_PRICES[tier]
    lines.push({
      tier,
      label: formatSizeLabel(tier),
      outputs,
      free_outputs,
      paid_outputs,
      tokens: Number((paid_outputs * tokenPrice.tokens).toFixed(0)),
    })
  })
  
  return {
    total_outputs: lines.reduce((sum, item) => sum + item.outputs, 0),
    free_outputs: lines.reduce((sum, item) => sum + item.free_outputs, 0),
    paid_outputs: lines.reduce((sum, item) => sum + item.paid_outputs, 0),
    free_512_outputs: lines.find((item) => item.tier === '512')?.free_outputs || 0,
    tokens: Number(lines.reduce((sum, item) => sum + item.tokens, 0).toFixed(0)),
    lines,
  }
}
