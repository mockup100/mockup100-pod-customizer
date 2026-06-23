import { ref } from "vue"
import { gatewayPlatformFetch } from "../api/client"

// Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Four-product Catalogue / §7.3.
// Frontend is FORBIDDEN from inventing prices. The catalog below is a stub that mirrors the
// frozen prices in the spec; once GET /api/pricing/catalog (Task 1.2) ships, the runtime fetch
// replaces this stub. Copy strings are §7.3 verbatim and MUST NOT be paraphrased.

export type TokenPackSku = "token_2000" | "token_10000" | "token_50000"
export type GradingPlanSku = "grading_standard" | "grading_enterprise"
export type WpProSku = "wp_pro_single" | "wp_pro_unlimited"
export type RenderSizePx = 512 | 1024 | 2048 | 4096

export type CatalogTokenPack = {
  sku: TokenPackSku
  tokens: number
  amount_cents: number
  featured?: boolean
}

export type CatalogGradingPlan = {
  sku: GradingPlanSku
  tier: "standard" | "enterprise"
  price_cents: number
  billing_cycle: "monthly"
  featured?: boolean
  // Plan v3 §S2.5：每个 grading plan 暴露免费试用时长（天），目前固定 30 天。
  trialDurationDays?: number
}

export type CatalogWpProPlan = {
  sku: WpProSku
  scope: "single" | "unlimited"
  price_cents: number
  billing_cycle: "lifetime"
  featured?: boolean
}

export type CatalogWpFreePlan = {
  sku: "wp_free"
  price_cents: 0
  billing_cycle: "free"
}

export type CatalogTokenRenderTier = {
  size_px: RenderSizePx
  cost_tokens: number
}

export type PricingCatalog = {
  wp_free: CatalogWpFreePlan
  token_packs: CatalogTokenPack[]
  token_render_tiers: CatalogTokenRenderTier[]
  grading_subscription: CatalogGradingPlan[]
  wp_pro_addon: CatalogWpProPlan[]
  copy: {
    token_topup: string
    grading_subscription: string
    wp_pro_addon: string
  }
}

// TODO(spec lock-mockup100-final-pricing-products-scheme Task 1.2): replace stub with
// gatewayPlatformFetch("/api/pricing/catalog") response when backend endpoint ships.
const STUB_CATALOG: PricingCatalog = {
  wp_free: { sku: "wp_free", price_cents: 0, billing_cycle: "free" },
  token_packs: [
    { sku: "token_2000", tokens: 2000, amount_cents: 500 },
    { sku: "token_10000", tokens: 10000, amount_cents: 2000, featured: true },
    { sku: "token_50000", tokens: 50000, amount_cents: 8000 },
  ],
  token_render_tiers: [
    { size_px: 512, cost_tokens: 0 },
    { size_px: 1024, cost_tokens: 1 },
    { size_px: 2048, cost_tokens: 2 },
    { size_px: 4096, cost_tokens: 8 },
  ],
  grading_subscription: [
    // Plan v3 §S2.5：trialDurationDays=30 与后端 GradingSubscriptionController 30 天 trial 对齐。
    { sku: "grading_standard", tier: "standard", price_cents: 900, billing_cycle: "monthly", trialDurationDays: 30 },
    { sku: "grading_enterprise", tier: "enterprise", price_cents: 1900, billing_cycle: "monthly", featured: true, trialDurationDays: 30 },
  ],
  wp_pro_addon: [
    { sku: "wp_pro_single", scope: "single", price_cents: 4900, billing_cycle: "lifetime" },
    { sku: "wp_pro_unlimited", scope: "unlimited", price_cents: 9900, billing_cycle: "lifetime", featured: true },
  ],
  copy: {
    token_topup:
      "Tokens never expire for HD renders and premium artwork. 512px preview is free for all users.",
    grading_subscription:
      "One subscription unlocks multi-size grading on both web console and WordPress editor.",
    wp_pro_addon:
      "One-time lifetime purchase with no monthly recurring fees.",
  },
}

const catalog = ref<PricingCatalog>(STUB_CATALOG)
const loading = ref(false)
const error = ref("")
let inflight: Promise<PricingCatalog> | null = null

export async function fetchPricingCatalog(): Promise<PricingCatalog> {
  if (inflight) return inflight
  loading.value = true
  error.value = ""
  inflight = (async () => {
    try {
      const payload = await gatewayPlatformFetch<Partial<PricingCatalog>>("/pricing/catalog")
      const next: PricingCatalog = {
        wp_free: payload.wp_free && typeof payload.wp_free.price_cents === "number"
          ? payload.wp_free
          : STUB_CATALOG.wp_free,
        token_packs: Array.isArray(payload.token_packs) && payload.token_packs.length
          ? payload.token_packs
          : STUB_CATALOG.token_packs,
        token_render_tiers: Array.isArray(payload.token_render_tiers) && payload.token_render_tiers.length
          ? payload.token_render_tiers
          : STUB_CATALOG.token_render_tiers,
        grading_subscription: Array.isArray(payload.grading_subscription) && payload.grading_subscription.length
          ? payload.grading_subscription
          : STUB_CATALOG.grading_subscription,
        wp_pro_addon: Array.isArray(payload.wp_pro_addon) && payload.wp_pro_addon.length
          ? payload.wp_pro_addon
          : STUB_CATALOG.wp_pro_addon,
        copy: {
          token_topup: payload.copy?.token_topup || STUB_CATALOG.copy.token_topup,
          grading_subscription: payload.copy?.grading_subscription || STUB_CATALOG.copy.grading_subscription,
          wp_pro_addon: payload.copy?.wp_pro_addon || STUB_CATALOG.copy.wp_pro_addon,
        },
      }
      catalog.value = next
      return next
    } catch (err) {
      // Falls back to the spec-locked stub so the UI is never broken when the endpoint is offline.
      error.value = String((err as Error)?.message || err)
      catalog.value = STUB_CATALOG
      return STUB_CATALOG
    } finally {
      loading.value = false
      inflight = null
    }
  })()
  return inflight
}

export function usePricingCatalog() {
  return { catalog, loading, error, fetchPricingCatalog }
}
