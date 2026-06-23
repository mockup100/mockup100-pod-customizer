<template>
  <div class="subscriptions-page" data-testid="admin-subscriptions-page">
    <div class="page-header">
      <h1 class="page-title">{{ $t('subscriptions.pageTitle') }}</h1>
      <p class="page-subtitle">
        {{ $t('subscriptions.pageSubtitle') }}
      </p>
    </div>

    <div class="tab-bar" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'is-active': activeTab === 'grading' }"
        :aria-selected="activeTab === 'grading'"
        data-testid="tab-grading"
        @click="selectTab('grading')"
      >
        {{ $t('subscriptions.grading') }}
      </button>
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'is-active': activeTab === 'wp-pro' }"
        :aria-selected="activeTab === 'wp-pro'"
        data-testid="tab-wp-pro"
        @click="selectTab('wp-pro')"
      >
        {{ $t('subscriptions.wpPro') }}
      </button>
    </div>

    <section v-if="activeTab === 'grading'" class="panel-card licensing-card" data-testid="grading-panel">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ $t('subscriptions.gradingTitle') }}</h2>
          <p class="section-copy">
            {{ $t('subscriptions.gradingDesc', { price: gradingPriceLine }) }}
          </p>
          <!-- Plan v3 §S2.6：Subscriptions & Licensing grading 卡补充 30 天免费试用披露。 -->
          <p v-if="canStartGradingTrial" class="section-copy section-copy--trial" data-testid="grading-trial-note">
            {{ $t('subscriptions.gradingTrialNote') }}
          </p>
          <!-- Plan v5 §C.5：trial 进行中倒计时 chip。 -->
          <p
            v-if="trialDaysRemaining !== null"
            class="grading-trial-chip"
            data-testid="grading-trial-chip"
          >
            {{ $t('upgrade.gradingTrialChip', { days: trialDaysRemaining }) }}
          </p>
        </div>
        <span class="status-chip" :class="gradingActive ? 'settled' : 'pending'">{{ gradingStatusLabel }}</span>
      </div>
      <div class="licensing-actions">
        <button
          type="button"
          class="btn-primary"
          data-testid="grading-subscribe-btn"
          :disabled="subscribingGrading"
          @click="onSubscribeGrading"
        >
          {{ subscribingGrading ? $t('subscriptions.starting') : gradingCtaLabel }}
        </button>
        <button
          v-if="canStartGradingTrial"
          type="button"
          class="btn-secondary"
          data-testid="grading-trial-cta"
          :disabled="startingTrial"
          @click="onStartTrial"
        >
          {{ startingTrial ? $t('subscriptions.starting') : $t('subscriptions.gradingStartTrial') }}
        </button>
      </div>
    </section>

    <section v-else class="panel-card licensing-card" data-testid="wp-pro-panel">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ $t('subscriptions.wpProTitle') }}</h2>
          <p class="section-copy">
            {{ $t('subscriptions.wpProDesc', { price: wpProPriceLine }) }}
          </p>
        </div>
        <span class="status-chip" :class="wpProActive ? 'settled' : 'pending'">{{ wpProStatusLabel }}</span>
      </div>
      <div class="licensing-actions">
        <a class="btn-primary" href="/pricing#wp-pro">{{ wpProCtaLabel }}</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { useUserCapabilities, fetchUserCapabilities } from "../../composables/useUserCapabilities"
import { usePricingCatalog } from "../../composables/usePricingCatalog"
import { useAuthStore } from "../../stores/auth"
// Plan v5 §C.3：Subscribe / Manage 按钮接 PayPal Subscriptions 收银 + Trial 接 /subscriptions/grading/trial。
import { useGradingCheckout } from "../../composables/useGradingCheckout"
// Plan v5 §C.5：trial 倒计时 chip。
import { useGradingTrialCountdown } from "../../composables/useGradingTrialCountdown"
import { gatewayPlatformFetch, ApiRequestError } from "../../api/client"
import { globalToast } from "../../composables/useToast"

type SubscriptionTab = "grading" | "wp-pro"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { wpProActive, gradingActive, gradingTier, hasUsedGradingTrial } = useUserCapabilities()
const { catalog, fetchPricingCatalog } = usePricingCatalog()
const authStore = useAuthStore()
const { startCheckout: startGradingCheckout } = useGradingCheckout()
const { daysRemaining: trialDaysRemaining } = useGradingTrialCountdown()

const subscribingGrading = ref(false)
const startingTrial = ref(false)

// Plan v3 §S2.6：仅未订阅且未用过 trial 时显示 30 天试用披露与 CTA。
const canStartGradingTrial = computed(
  () => gradingTier.value === "none" && !hasUsedGradingTrial.value,
)

async function onSubscribeGrading() {
  if (subscribingGrading.value) return
  if (!authStore.isAuthenticated) {
    void router.push({
      path: "/auth",
      query: { mode: "register", redirect: "/admin/subscriptions-licensing?tab=grading" },
    })
    return
  }
  subscribingGrading.value = true
  try {
    await startGradingCheckout("standard")
  } catch (error) {
    const msg =
      error instanceof ApiRequestError && error.message
        ? error.message
        : t("subscriptions.checkoutFailed")
    globalToast.error(msg)
  } finally {
    subscribingGrading.value = false
  }
}

async function onStartTrial() {
  if (startingTrial.value) return
  if (!authStore.isAuthenticated) {
    void router.push({
      path: "/auth",
      query: {
        mode: "register",
        redirect: "/admin/subscriptions-licensing?tab=grading&intent=grading-trial",
      },
    })
    return
  }
  startingTrial.value = true
  try {
    await gatewayPlatformFetch<unknown>("/subscriptions/grading/trial", {
      method: "POST",
      headers: { ...authStore.authHeaders },
    })
    await fetchUserCapabilities()
    globalToast.success(t("gradingGate.trialStartedToast"))
  } catch (error) {
    const msg =
      error instanceof ApiRequestError && error.message
        ? error.message
        : t("gradingGate.trialFailed")
    globalToast.error(msg)
  } finally {
    startingTrial.value = false
  }
}

const activeTab = computed<SubscriptionTab>(() => {
  const value = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
  return value === "wp-pro" ? "wp-pro" : "grading"
})

function selectTab(next: SubscriptionTab) {
  if (activeTab.value === next) return
  void router.replace({ query: { ...route.query, tab: next } })
}

const gradingPriceLine = computed(() => {
  const standard = catalog.value.grading_subscription.find((plan) => plan.tier === "standard")
  const enterprise = catalog.value.grading_subscription.find((plan) => plan.tier === "enterprise")
  const standardUsd = formatUsd(standard?.price_cents)
  const enterpriseUsd = formatUsd(enterprise?.price_cents)
  return `${standardUsd} Standard / ${enterpriseUsd} Enterprise`
})

const wpProPriceLine = computed(() => {
  const single = catalog.value.wp_pro_addon.find((plan) => plan.scope === "single")
  const unlimited = catalog.value.wp_pro_addon.find((plan) => plan.scope === "unlimited")
  const singleUsd = formatUsd(single?.price_cents)
  const unlimitedUsd = formatUsd(unlimited?.price_cents)
  return `${singleUsd} single site / ${unlimitedUsd} unlimited sites`
})

const gradingStatusLabel = computed(() =>
  gradingActive.value ? `Active · ${gradingTier.value}` : "Not Subscribed",
)
const gradingCtaLabel = computed(() => (gradingActive.value ? "Manage" : "Subscribe"))
const wpProStatusLabel = computed(() => (wpProActive.value ? "Active" : "Not Activated"))
const wpProCtaLabel = computed(() => (wpProActive.value ? "Manage" : "Buy"))

function formatUsd(cents: number | undefined) {
  const amount = Number(cents || 0) / 100
  if (!Number.isFinite(amount)) return "$0"
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`
}

onMounted(() => {
  void fetchPricingCatalog()
  void fetchUserCapabilities()
})
</script>

<style scoped>
.subscriptions-page { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header {
  padding: 1.5rem 1.6rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.page-title { margin: 0; font-size: 1.85rem; letter-spacing: -0.01em; }
.page-subtitle { margin: 0.45rem 0 0; color: #64748b; line-height: 1.55; }

.tab-bar {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.3rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  align-self: flex-start;
}
.tab-button {
  border: 0;
  background: transparent;
  color: #475569;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.tab-button:hover { color: #0f172a; }
.tab-button.is-active {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.panel-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 1.25rem 1.4rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}
.licensing-card { scroll-margin-top: 8rem; }
.panel-title { margin: 0; font-size: 1.05rem; }
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.95rem;
  border-bottom: 1px solid #eef2f7;
}
.section-heading > div { min-width: 0; }
.section-copy { margin: 0.35rem 0 0; color: #64748b; line-height: 1.55; }

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
}
.status-chip.settled { background: #dcfce7; color: #166534; }
.status-chip.pending { background: #fef3c7; color: #92400e; }

.licensing-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.btn-primary {
  border: 0;
  border-radius: 0.82rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  background: #0ea5e9;
  color: #fff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08); }

/* Plan v3 §S2.6：30 天免费 Grading 试用 CTA 与披露文案样式。 */
.btn-secondary {
  border: 1px solid #10b981;
  border-radius: 0.82rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  background: #ecfdf5;
  color: #047857;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.btn-secondary:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.18); }
.section-copy--trial { color: #047857; font-weight: 500; }
/* Plan v5 §C.5：trial 倒计时 chip。 */
.grading-trial-chip { display: inline-block; margin: 0.5rem 0 0; padding: 0.3rem 0.75rem; border-radius: 999px; background: #ecfdf5; border: 1px solid #6ee7b7; color: #047857; font-size: 0.85rem; font-weight: 700; }

@media (max-width: 720px) {
  .page-header { padding: 1.2rem 1.1rem; }
  .section-heading { flex-direction: column; align-items: flex-start; }
}
</style>
