<template>
  <!--
    Source of Truth: spec lock-mockup100-final-pricing-products-scheme §7.2 / §No Cross-promotion +
    Plan v3 §S2.1 differentiated UX. Body MUST mention only the Grading subscription (no Token, no
    WP Pro). Subscribe CTA jumps to the recharge anchor on the Grading Monthly Subscription block.

    差异化策略：
    - SaaS shell（mockup100.com）：显示 Subscribe + Start 30-day free trial + Close 三按钮
    - WP iframe shell：仅显示 Subscribe + Close（trial CTA 不出现，规避 wp.org #7 promotion 红线）
    - 已用过 trial 的账号：trial 按钮消失，仅 Subscribe + Close
  -->
  <Modal :is-open="true" size="sm" @close="emit('close')" @update:isOpen="handleToggle">
    <template #header>
      <h2>{{ t('gradingGate.title') }}</h2>
    </template>
    <div class="grading-gate-body">
      <p>{{ bodyText }}</p>
      <div class="grading-gate-actions">
        <button
          v-if="canStartTrial"
          type="button"
          class="gate-trial"
          data-testid="grading-gate-trial"
          :disabled="trialLoading"
          @click="startTrial"
        >
          {{ trialLoading ? t('gradingGate.trialLoading') : t('gradingGate.startTrial') }}
        </button>
        <button
          v-else-if="isAnonymous && !isWpShell"
          type="button"
          class="gate-trial"
          data-testid="grading-gate-signin-trial"
          @click="startTrial"
        >
          {{ t('gradingGate.signInToStart') }}
        </button>
        <button
          type="button"
          class="gate-primary"
          data-testid="grading-gate-subscribe"
          @click="goToSubscribe"
        >
          {{ t('gradingGate.subscribe') }}
        </button>
        <button type="button" class="gate-secondary" @click="emit('close')">
          {{ t('gradingGate.close') }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import Modal from "./ui/Modal.vue"
import { useAuthStore } from "../stores/auth"
import { useUserCapabilities, fetchUserCapabilities } from "../composables/useUserCapabilities"
import { gatewayPlatformFetch, ApiRequestError } from "../api/client"
import { globalToast } from "../composables/useToast"

const emit = defineEmits<{ close: []; trialStarted: [] }>()

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const { hasUsedGradingTrial, gradingIsTrial, gradingTrialEndsAt } = useUserCapabilities()

const trialLoading = ref(false)

// WP shell 检测：插件 bootstrap 时会在 window 注入 mockup100Config 或 wordpress context flag。
// 任一存在即视为 WP iframe shell；此时 trial CTA 不渲染，避免 wp.org #7 promotion 红线。
const isWpShell = computed(
  () =>
    !!(window as any).mockup100Config?.gradingSubscriptionUrl ||
    !!(window as any).__MOCKUP100_WORDPRESS_CONTEXT__,
)

// Plan v5 §C.4：GateModal 三态文案派发
//   1. isAnonymous（未登录） → bodyAnonymous + signInToStart 按钮
//   2. trialExpired（曾试用过、当前已不在 trial 中）→ bodyTrialExpired，无 trial CTA
//   3. hasUsedGradingTrial 但仍处于 trial 中（理论上不会触发 gate，但兜底）→ bodyTrialUsed
//   4. 默认（fresh user）→ body + Start Trial CTA
const isAnonymous = computed(() => !authStore.isAuthenticated)
const trialExpired = computed(
  () => !isAnonymous.value && hasUsedGradingTrial.value && !gradingIsTrial.value,
)
// 是否可以发起新 trial：登录态 + 未用过 trial + 非 WP shell
const canStartTrial = computed(
  () => !isWpShell.value && !isAnonymous.value && !hasUsedGradingTrial.value,
)
const bodyText = computed(() => {
  if (isAnonymous.value) return t("gradingGate.bodyAnonymous")
  if (trialExpired.value) return t("gradingGate.bodyTrialExpired")
  if (hasUsedGradingTrial.value) return t("gradingGate.bodyTrialUsed")
  return t("gradingGate.body")
})
// 引用 trial 结束时间以避免 unused 警告（可在未来扩展显示）
void gradingTrialEndsAt

function handleToggle(value: boolean) {
  if (!value) emit("close")
}

function goToSubscribe() {
  emit("close")
  if (isWpShell.value) {
    // WP iframe shell：跳外链；URL 由 mockup100Config 注入，兜底用 SSOT。
    const url =
      (window as any).mockup100Config?.gradingSubscriptionUrl ||
      "https://www.mockup100.com/admin/tokens-management#grading-subscription"
    window.open(url, "_blank", "noopener,noreferrer")
    return
  }
  void router.push(
    authStore.isAuthenticated
      ? { path: "/admin/tokens-management", hash: "#grading-subscription" }
      : { path: "/auth", query: { mode: "register", redirect: "/admin/tokens-management#grading-subscription" } },
  )
}

async function startTrial() {
  if (trialLoading.value) return
  if (!authStore.isAuthenticated) {
    // 未登录态：跳注册，redirect 回 tokens-management?intent=grading-trial 让登录后自动开启 trial
    emit("close")
    void router.push({
      path: "/auth",
      query: { mode: "register", redirect: "/admin/tokens-management?intent=grading-trial" },
    })
    return
  }
  trialLoading.value = true
  try {
    await gatewayPlatformFetch<unknown>("/subscriptions/grading/trial", {
      method: "POST",
      headers: { ...authStore.authHeaders },
    })
    // 刷新 capabilities：trial 启动后服务端 Redis cache 已 invalidate，重新拉取得到 tier=standard + is_trial=true。
    await fetchUserCapabilities()
    globalToast.success(t("gradingGate.trialStartedToast"))
    emit("trialStarted")
    emit("close")
  } catch (error) {
    // 后端 unique 约束阻断（已用过 trial）或网络错误：退化为 subscribe 引导。
    const msg =
      error instanceof ApiRequestError && typeof error.message === "string" && error.message
        ? error.message
        : t("gradingGate.trialFailed")
    globalToast.error(msg)
  } finally {
    trialLoading.value = false
  }
}
</script>

<style scoped>
.grading-gate-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grading-gate-body p {
  margin: 0;
  line-height: 1.6;
  color: #1f2937;
}

.grading-gate-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.gate-primary,
.gate-secondary,
.gate-trial {
  border-radius: 0.75rem;
  padding: 0.65rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.gate-trial {
  background: #10b981;
  border: 1px solid #10b981;
  color: #fff;
}

.gate-trial:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gate-primary {
  background: #0ea5e9;
  border: 1px solid #0ea5e9;
  color: #fff;
}

.gate-secondary {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
}
</style>
