<template>
  <!--
    Source of Truth:
      - spec lock-mockup100-final-pricing-products-scheme §No Cross-promotion in Popups
      - spec consolidate-pod-editor-four-product-matrix Task 4.1 / §7 Fixed Copy
    每种 kind 只渲染对应购买入口，严格不展示其他两类。
  -->
  <Modal :is-open="true" size="sm" @close="emit('close')" @update:isOpen="handleToggle">
    <template #header>
      <h2>{{ title }}</h2>
    </template>
    <div class="upgrade-modal-body" :data-kind="kind">
      <p v-if="kind === 'wp-pro'" data-testid="upgrade-copy-wp-pro">{{ t('upgrade.wpProBody') }}</p>
      <p v-else-if="kind === 'tokens'" data-testid="upgrade-copy-tokens">{{ t('upgrade.tokensBody') }}</p>
      <p v-else data-testid="upgrade-copy-grading">{{ t('upgrade.gradingBody') }}</p>
      <!-- Plan v5 §C.5：trial 进行中显示 "Trial · 还剩 N 天" chip -->
      <p
        v-if="kind === 'grading' && trialDaysRemaining !== null"
        class="upgrade-trial-chip"
        data-testid="upgrade-grading-trial-chip"
      >
        {{ t('upgrade.gradingTrialChip', { days: trialDaysRemaining }) }}
      </p>
      <!-- Plan v3 §S2.6：UpgradeModal grading 分支补 30 天免费试用披露（不跨产品推广，仍只渲染 grading 自己的 CTA）。 -->
      <p
        v-if="kind === 'grading' && canStartGradingTrial"
        class="upgrade-trial-note"
        data-testid="upgrade-grading-trial-note"
      >
        {{ t('upgrade.gradingTrialNote') }}
      </p>
      <div class="upgrade-actions">
        <button
          type="button"
          class="upgrade-primary"
          :data-testid="ctaTestId"
          @click="goToPricing"
        >
          {{ ctaLabel }}
        </button>
        <button
          v-if="kind === 'grading' && canStartGradingTrial"
          type="button"
          class="upgrade-trial"
          data-testid="upgrade-grading-trial-cta"
          @click="goToTrial"
        >
          {{ t('upgrade.gradingStartTrial') }}
        </button>
        <button type="button" class="upgrade-secondary" @click="emit('close')">{{ t('upgrade.close') }}</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Modal from './ui/Modal.vue'
import { useUserCapabilities } from '../composables/useUserCapabilities'
import { useGradingTrialCountdown } from '../composables/useGradingTrialCountdown'
import { useAuthStore } from '../stores/auth'

export type UpgradeModalKind = 'wp-pro' | 'tokens' | 'grading'

const props = defineProps<{
  kind: UpgradeModalKind
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { gradingTier, hasUsedGradingTrial } = useUserCapabilities()
const { daysRemaining: trialDaysRemaining } = useGradingTrialCountdown()

// Plan v3 §S2.6：仅 kind=grading 且未订阅且未用过 trial 时才显示 30 天试用入口。
const canStartGradingTrial = computed(
  () => gradingTier.value === 'none' && !hasUsedGradingTrial.value,
)

const title = computed(() => {
  switch (props.kind) {
    case 'wp-pro':
      return t('upgrade.wpProTitle')
    case 'grading':
      return t('upgrade.gradingTitle')
    case 'tokens':
    default:
      return t('upgrade.tokensTitle')
  }
})

const ctaLabel = computed(() => {
  switch (props.kind) {
    case 'wp-pro':
      return t('upgrade.wpProCta')
    case 'grading':
      return t('upgrade.gradingCta')
    case 'tokens':
    default:
      return t('upgrade.tokensCta')
  }
})

const ctaTestId = computed(() => {
  switch (props.kind) {
    case 'wp-pro':
      return 'upgrade-cta-wp-pro'
    case 'grading':
      return 'upgrade-cta-grading'
    case 'tokens':
    default:
      return 'upgrade-cta-tokens'
  }
})

const pricingHash = computed(() => {
  switch (props.kind) {
    case 'wp-pro':
      return '#wp-pro'
    case 'grading':
      return '#grading'
    case 'tokens':
    default:
      return '#tokens'
  }
})

function handleToggle(value: boolean) {
  if (!value) {
    emit('close')
  }
}

function goToPricing() {
  emit('close')
  void router.push({ path: '/pricing', hash: pricingHash.value })
}

// Plan v3 §S2.6：grading kind 内 trial CTA。未登录跳注册回流，登录态锚到订阅区由 ?intent=grading-trial 自动启动。
function goToTrial() {
  emit('close')
  if (authStore.isAuthenticated) {
    void router.push({
      path: '/admin/tokens-management',
      query: { intent: 'grading-trial' },
      hash: '#grading-subscription',
    })
  } else {
    void router.push({
      path: '/auth',
      query: {
        mode: 'register',
        redirect: '/admin/tokens-management?intent=grading-trial',
      },
    })
  }
}
</script>

<style scoped>
.upgrade-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upgrade-modal-body p {
  margin: 0;
  line-height: 1.6;
  color: #1f2937;
}

.upgrade-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.upgrade-primary,
.upgrade-secondary {
  border-radius: 0.75rem;
  padding: 0.65rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.upgrade-primary {
  background: #0ea5e9;
  border: 1px solid #0ea5e9;
  color: #fff;
}

.upgrade-secondary {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
}

/* Plan v3 §S2.6：grading kind 内 trial CTA 与 trial 披露文案样式。 */
.upgrade-trial {
  background: #10b981;
  border: 1px solid #10b981;
  color: #fff;
}

.upgrade-trial-note {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #047857;
}

/* Plan v5 §C.5：trial 倒计时 chip。 */
.upgrade-trial-chip {
  margin: 0;
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
  color: #047857;
  font-size: 0.8125rem;
  font-weight: 600;
}
</style>
