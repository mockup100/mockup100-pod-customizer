export function normalizePlanCode(planCode?: string | null): "starter" | "tokens" | "enterprise" {
  const normalized = String(planCode || "").trim().toLowerCase()
  if (!normalized || normalized === "starter" || normalized === "trial" || normalized === "free_trial" || normalized === "free_tokens") {
    return "starter"
  }
  if (normalized === "enterprise") {
    return "enterprise"
  }
  return "tokens"
}

export type BillingLocale = "en" | "zh"

function normalizeBillingLocale(locale?: string | null): BillingLocale {
  return locale === "zh" ? "zh" : "en"
}

export function getPlanDisplayName(planCode?: string | null, locale?: BillingLocale): string {
  const normalized = normalizePlanCode(planCode)
  const resolvedLocale = normalizeBillingLocale(locale)
  if (resolvedLocale === "zh") {
    if (normalized === "enterprise") return "企业合约"
    if (normalized === "tokens") return "令牌钱包"
    return "入门令牌"
  }
  if (normalized === "enterprise") return "Enterprise Contract"
  if (normalized === "tokens") return "Tokens Wallet"
  return "Starter Tokens"
}

export function getVolumeTierLabel(tier?: string | null, locale?: BillingLocale): string {
  const resolvedLocale = normalizeBillingLocale(locale)
  switch (tier) {
    case "volume_50_499":
      return resolvedLocale === "zh" ? "50-499 次输出 · 95 折" : "50-499 outputs · 5% off"
    case "volume_500_4999":
      return resolvedLocale === "zh" ? "500-4999 次输出 · 9 折" : "500-4999 outputs · 10% off"
    case "enterprise_volume_5000_plus":
      return resolvedLocale === "zh" ? "企业级 5000+ 输出量" : "Enterprise 5000+ volume"
    case "enterprise_contract":
      return resolvedLocale === "zh" ? "企业合约定价" : "Enterprise contract pricing"
    case "enterprise_contract_required":
      return resolvedLocale === "zh" ? "5000+ 次输出需企业定价" : "5000+ outputs require enterprise pricing"
    default:
      return resolvedLocale === "zh" ? "1-49 次输出 · 标准费率" : "1-49 outputs · standard rate"
  }
}

export function getUsdAmount(input?: { amount_cents?: number; meta?: Record<string, unknown> | null }): number {
  const micros = Number(input?.meta?.amount_micros ?? input?.meta?.charge_amount_micros ?? 0)
  if (Number.isFinite(micros) && micros > 0) return micros / 1_000_000
  return Number(input?.amount_cents || 0) / 100
}
