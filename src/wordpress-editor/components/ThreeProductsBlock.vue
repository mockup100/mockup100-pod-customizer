<template>
  <!--
    Source of Truth: spec lock-mockup100-final-pricing-products-scheme §7.3 (Recharge page three-block copy).
    The three subtitles are FROZEN English copy and must be rendered verbatim. The price chips
    are derived from the GET /api/pricing/catalog payload (Tasks 1.2 / 6.1) — front-end MUST NOT
    hard-code price values. When the endpoint is unavailable, the catalog composable falls back
    to a spec-mirroring stub so this component still renders the correct figures.
  -->
  <section class="three-products" data-testid="three-products-block">
    <!-- (1) Cloud Token One-Time Top-up -->
    <article class="product-card" data-product="token">
      <header class="product-head">
        <span class="product-eyebrow">(1) Cloud Token One-Time Top-up</span>
        <h2 class="product-title">Cloud Token One-Time Top-up</h2>
        <p class="product-copy">{{ catalog.copy.token_topup }}</p>
      </header>
      <ul class="tier-grid">
        <li
          v-for="pack in catalog.token_packs"
          :key="pack.sku"
          class="tier-card"
          :class="{ featured: pack.featured }"
        >
          <div class="tier-head">
            <strong>{{ pack.tokens.toLocaleString() }} Tokens</strong>
            <span class="tier-price">${{ formatUsd(pack.amount_cents) }}</span>
          </div>
          <span v-if="pack.featured" class="tier-chip">Most Popular</span>
        </li>
      </ul>
      <div class="product-cta">
        <button
          type="button"
          class="cta-primary"
          :disabled="loading.token"
          data-testid="token-buy-cta"
          @click="emit('buyToken')"
        >
          {{ loading.token ? 'Redirecting...' : 'Buy Tokens' }}
        </button>
      </div>
    </article>

    <!-- (2) Grading Monthly Subscription -->
    <article class="product-card" data-product="grading">
      <header class="product-head">
        <span class="product-eyebrow">(2) Grading Monthly Subscription</span>
        <h2 class="product-title">Grading Monthly Subscription</h2>
        <p class="product-copy">{{ catalog.copy.grading_subscription }}</p>
        <!-- Plan v3 §S2.5：30 天免费试用提示，文案与 trial CTA 协同。 -->
        <p class="product-trial-note">Free 30-day trial for new users — no credit card required.</p>
      </header>
      <ul class="tier-grid">
        <li
          v-for="plan in catalog.grading_subscription"
          :key="plan.sku"
          class="tier-card"
          :class="{ featured: plan.featured }"
        >
          <div class="tier-head">
            <strong>{{ tierLabel(plan.tier) }}</strong>
            <span class="tier-price">${{ formatUsd(plan.price_cents) }}/month</span>
          </div>
          <span v-if="plan.featured" class="tier-chip">Recommended</span>
        </li>
      </ul>
      <div class="product-cta">
        <button
          type="button"
          class="cta-primary"
          :disabled="loading.grading"
          data-testid="grading-subscribe-cta"
          @click="emit('subscribeGrading')"
        >
          {{ loading.grading ? 'Redirecting...' : 'Subscribe' }}
        </button>
        <!-- Plan v3 §S2.5：Grading 30 天免费试用入口（未登录跳注册回流，登录后跳 trial 自动开启）。 -->
        <a class="cta-trial-link" :href="gradingTrialHref" data-testid="grading-trial-cta">
          Free 30-day trial · Start free trial
        </a>
      </div>
    </article>

    <!-- (3) WordPress Pro Add-on -->
    <article v-if="!hideWpPro" class="product-card" data-product="wp-pro">
      <header class="product-head">
        <span class="product-eyebrow">(3) WordPress Pro Add-on</span>
        <h2 class="product-title">WordPress Pro Add-on</h2>
        <p class="product-copy">{{ catalog.copy.wp_pro_addon }}</p>
      </header>
      <ul class="tier-grid">
        <li
          v-for="plan in catalog.wp_pro_addon"
          :key="plan.sku"
          class="tier-card"
          :class="{ featured: plan.featured }"
        >
          <div class="tier-head">
            <strong>{{ scopeLabel(plan.scope) }}</strong>
            <span class="tier-price">${{ formatUsd(plan.price_cents) }} lifetime</span>
          </div>
          <span v-if="plan.featured" class="tier-chip">Best Value</span>
        </li>
      </ul>
      <div class="product-cta">
        <button
          type="button"
          class="cta-primary"
          :disabled="loading.wpPro"
          data-testid="wp-pro-cta"
          @click="emit('buyWpPro')"
        >
          {{ loading.wpPro ? 'Redirecting...' : 'Get WP Pro' }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import { usePricingCatalog } from "../composables/usePricingCatalog"
import { useAuthStore } from "../stores/auth"

interface Props {
  hideWpPro?: boolean
  loading?: { token?: boolean; grading?: boolean; wpPro?: boolean }
}

const props = withDefaults(defineProps<Props>(), {
  hideWpPro: false,
  loading: () => ({ token: false, grading: false, wpPro: false }),
})

const emit = defineEmits<{
  buyToken: []
  subscribeGrading: []
  buyWpPro: []
}>()

const { catalog, fetchPricingCatalog } = usePricingCatalog()
const authStore = useAuthStore()

// Plan v3 §S2.5：未登录态走注册回流（登录后回到 tokens-management 自动启动 trial），
// 登录态直接锚到订阅区，由页面内的 trial CTA 触发 POST /subscriptions/grading/trial。
const gradingTrialHref = computed(() =>
  authStore.isAuthenticated
    ? "/admin/tokens-management?intent=grading-trial#grading-subscription"
    : "/auth?mode=register&redirect=/admin/tokens-management?intent=grading-trial",
)

onMounted(() => {
  void fetchPricingCatalog()
})

function formatUsd(amountCents: number): string {
  if (!Number.isFinite(amountCents)) return "0"
  const value = amountCents / 100
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
}

function tierLabel(tier: "standard" | "enterprise"): string {
  return tier === "enterprise" ? "Enterprise" : "Standard"
}

function scopeLabel(scope: "single" | "unlimited"): string {
  return scope === "unlimited" ? "Unlimited Site" : "Single Site"
}

void props // referenced for template binding; keep for explicitness
</script>

<style scoped>
.three-products {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
}

.product-eyebrow {
  display: inline-flex;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.product-title {
  margin: 0.55rem 0 0.4rem;
  font-size: 1.1rem;
  color: #0f172a;
}

.product-copy {
  margin: 0;
  color: #475569;
  line-height: 1.55;
  font-size: 0.92rem;
}

/* Plan v3 §S2.5：grading 区 30 天 trial 提示文案。 */
.product-trial-note {
  margin: 0.4rem 0 0;
  color: #0e7490;
  font-weight: 700;
  font-size: 0.85rem;
}

/* Plan v3 §S2.5：grading 卡 trial 链接。 */
.cta-trial-link {
  display: block;
  margin-top: 0.55rem;
  color: #0e7490;
  text-align: center;
  font-weight: 700;
  font-size: 0.88rem;
  text-decoration: none;
}

.cta-trial-link:hover {
  text-decoration: underline;
}

.tier-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tier-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.tier-card.featured {
  border-color: #818cf8;
  background: linear-gradient(180deg, #eef2ff 0%, #ffffff 100%);
}

.tier-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.tier-price {
  font-weight: 800;
  color: #0f172a;
}

.tier-chip {
  align-self: flex-start;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
  font-size: 0.7rem;
  font-weight: 700;
}

.product-cta {
  margin-top: auto;
}

.cta-primary {
  width: 100%;
  border: 0;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  background: #0ea5e9;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.cta-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 1080px) {
  .three-products {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .three-products {
    grid-template-columns: 1fr;
  }
}
</style>
