import type {
  BillingEventItem,
  TokenOrderItem,
  UsageSummary,
} from "../../stores/platform"
import { formatSizeLabel } from "../../utils/renderPricing"

export type BillingTimeRangeFilter = "all" | "24h" | "7d" | "30d"
export type BillingSizeFilter = "all" | "512" | "1024" | "2048" | "4096"
export type BillingChannelFilter = "all" | "console" | "api"

export type RenderRow = {
  id: string
  channel: string
  template_id: string
  size_tier: string
  output_count: number
  tokens_used: number
  description: string
  created_at: string
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function displaySizeLabel(size: unknown): string {
  return formatSizeLabel(String(size || "1024"))
}

export function describeBillingMode(item: BillingEventItem): string {
  const sizeTier = String(item.meta?.size_tier || item.meta?.output_size || "1024")
  const outputs = Number(item.meta?.outputs || item.meta?.billable_outputs || item.meta?.output_count || 0)
  const tokens = Number(item.meta?.tokens || 0)
  const channel = String(item.meta?.channel || "console")
  return `${channel} · ${outputs} outputs · ${tokens} tokens · ${formatSizeLabel(sizeTier)}`
}

export function buildRenderRows(events: BillingEventItem[]): RenderRow[] {
  return events
    .filter((item) => item.event_type === "render_charge")
    .map((item) => {
      const sizeTier = String(item.meta?.size_tier || item.meta?.output_size || "1024").match(/(\d+)/)?.[1] || "1024"
      const outputs = Number(item.meta?.outputs || item.meta?.billable_outputs || item.meta?.output_count || 0)
      const tokens = Number(item.meta?.tokens || 0)
      const channel = String(item.meta?.channel || "console")
      return {
        id: item.billing_event_id,
        channel,
        template_id: String(item.meta?.template_id || ""),
        size_tier: sizeTier,
        output_count: outputs,
        tokens_used: tokens,
        description: describeBillingMode(item),
        created_at: item.created_at,
      }
    })
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
}

export function filterRenderRows(
  rows: RenderRow[],
  channelFilter: BillingChannelFilter,
  sizeFilter: BillingSizeFilter,
  timeRangeFilter: BillingTimeRangeFilter,
  now = Date.now(),
): RenderRow[] {
  return rows.filter((item) => {
    if (channelFilter !== "all" && item.channel !== channelFilter) return false
    if (sizeFilter !== "all" && item.size_tier !== sizeFilter) return false
    if (timeRangeFilter === "all") return true

    const createdAt = new Date(item.created_at).getTime()
    const rangeMs = timeRangeFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : timeRangeFilter === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000
    return createdAt >= now - rangeMs
  })
}

export function buildBillingSummary(input: {
  tokenOrders: TokenOrderItem[]
  billingEvents: BillingEventItem[]
  usage: UsageSummary | null
  fallbackTokenBalance: number
}) {
  const settledStatuses = new Set(["paid", "completed", "captured"])
  const signupBonusTokens = input.billingEvents
    .filter((item) => item.event_type === "signup_bonus")
    .reduce((sum, item) => sum + Number(item.meta?.tokens || item.meta?.token_delta || 0), 0)
  const topUpEventTokens = input.billingEvents
    .filter((item) => item.event_type === "token_top_up")
    .reduce((sum, item) => sum + Number(item.meta?.tokens || item.meta?.token_delta || 0), 0)
  const totalPurchasedTokens = input.tokenOrders
    .filter((item) => settledStatuses.has(String(item.status || "").toLowerCase()))
    .reduce((sum, item) => sum + Number(item.tokens || 0), 0)
  const renderChargeTokens = input.billingEvents
    .filter((item) => item.event_type === "render_charge")
    .reduce((sum, item) => sum + Number(item.meta?.tokens || 0), 0)
  const sandboxCapturedTokens = input.tokenOrders
    .filter((item) => String(item.status || "").toLowerCase() === "sandbox_captured")
    .reduce((sum, item) => sum + Number(item.tokens || 0), 0)
  const creditedPurchasedTokens = Math.max(totalPurchasedTokens, topUpEventTokens)
  const trackedSourceTotal = signupBonusTokens + creditedPurchasedTokens
  const normalizedSignupBonusTokens = signupBonusTokens > 0
    ? signupBonusTokens
    : (creditedPurchasedTokens === 0 ? 500 : 0)
  const trustedTokenTotal = Math.max(trackedSourceTotal, normalizedSignupBonusTokens)
  const rawTrackedTotal = Math.max(Number(input.usage?.quota_total || 0), trackedSourceTotal, 0)
  const totalConsumedTokens = Math.max(Number(input.usage?.quota_used || 0), renderChargeTokens, 0)
  const usageRemaining = Number(input.usage?.remaining)
  const hasUsageRemaining = Number.isFinite(usageRemaining) && usageRemaining >= 0
  const explicitTokenBalance = hasUsageRemaining
    ? usageRemaining
    : Math.max(Number(input.fallbackTokenBalance || 0), 0)
  const likelySandboxPolluted = sandboxCapturedTokens > 0 && rawTrackedTotal >= trustedTokenTotal + sandboxCapturedTokens
  const trackedTokenTotal = likelySandboxPolluted
    ? Math.max(trustedTokenTotal, explicitTokenBalance + totalConsumedTokens)
    : Math.max(rawTrackedTotal, trustedTokenTotal, explicitTokenBalance + totalConsumedTokens)
  const tokenBalance = hasUsageRemaining
    ? Math.max(usageRemaining, 0)
    : Math.max(explicitTokenBalance, trackedTokenTotal - totalConsumedTokens, 0)
  const otherGrantedTokens = Math.max(trackedTokenTotal - normalizedSignupBonusTokens - creditedPurchasedTokens, 0)
  const usageRate = trackedTokenTotal > 0 ? totalConsumedTokens / trackedTokenTotal : 0

  return {
    tokenBalance,
    signupBonusTokens: normalizedSignupBonusTokens,
    totalPurchasedTokens: creditedPurchasedTokens,
    otherGrantedTokens,
    totalConsumedTokens,
    trackedTokenTotal,
    usageRate,
  }
}
