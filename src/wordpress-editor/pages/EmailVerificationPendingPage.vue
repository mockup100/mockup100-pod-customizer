<template>
  <div class="verification-page">
    <div class="verification-card">
      <div class="verification-badge">{{ t("badge") }}</div>
      <h1 class="verification-title">{{ t("title") }}</h1>
      <p class="verification-description">
        {{ t("sentPrefix") }}
        <strong>{{ displayEmail }}</strong>.
        {{ t("sentSuffix") }}
      </p>

      <div v-if="feedback" class="feedback-banner" :class="feedback.type">
        {{ feedback.text }}
      </div>

      <div class="action-group">
        <button
          type="button"
          class="primary-button"
          :disabled="checkingStatus"
          @click="handlePrimaryAction"
        >
          {{ primaryActionLabel }}
        </button>
        <button
          type="button"
          class="secondary-button"
          :disabled="resendLoading || !canResend"
          @click="handleResend"
        >
          {{ resendLoading ? t("sending") : t("resendVerificationEmail") }}
        </button>
      </div>

      <div class="link-row">
        <button type="button" class="text-link text-link-button" @click="goToSignIn">{{ t("backToLogin") }}</button>
        <button type="button" class="text-link text-link-button" @click="useAnotherEmail">{{ t("useAnotherEmail") }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { resolveApiErrorMessage } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { useUiLocaleStore } from '../stores/uiLocale'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { account, role, isAuthenticated, isEmailVerificationPending } = storeToRefs(authStore)
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const EMAIL_VERIFICATION_PENDING_I18N = {
  en: {
    badge: "Email Verification",
    title: "Check your inbox",
    sentPrefix: "We sent a verification link to",
    sentSuffix: "Verify your email before accessing the workspace.",
    sending: "Sending...",
    resendVerificationEmail: "Resend Verification Email",
    backToLogin: "Back to log in",
    useAnotherEmail: "Use another email",
    fallbackEmail: "your email address",
    loginToContinue: "Log In to Continue",
    checking: "Checking...",
    verifiedAction: "I've Verified My Email",
    resendSuccess: "A new verification email has been sent. Please check your inbox.",
    resendCooldown: "Your latest verification link is still active. Please wait {seconds}s before requesting another email.",
    sendFailed: "Failed to send verification email.",
    resendFailed: "Failed to resend verification email.",
    stillPending: "Email verification is still pending. Please use the link from your inbox.",
    refreshFailed: "Failed to refresh verification status.",
  },
  zh: {
    badge: "邮箱验证",
    title: "请检查收件箱",
    sentPrefix: "我们已向",
    sentSuffix: "发送验证链接，请先完成邮箱验证后再进入工作区。",
    sending: "发送中...",
    resendVerificationEmail: "重新发送验证邮件",
    backToLogin: "返回登录",
    useAnotherEmail: "使用其他邮箱",
    fallbackEmail: "你的邮箱地址",
    loginToContinue: "登录后继续",
    checking: "检查中...",
    verifiedAction: "我已完成邮箱验证",
    resendSuccess: "新的验证邮件已发送，请检查你的收件箱。",
    resendCooldown: "最近一封验证邮件仍然有效，请等待 {seconds} 秒后再重新发送。",
    sendFailed: "发送验证邮件失败。",
    resendFailed: "重新发送验证邮件失败。",
    stillPending: "邮箱验证仍未完成，请使用收件箱中的验证链接。",
    refreshFailed: "刷新验证状态失败。",
  },
} as const

function t(key: keyof typeof EMAIL_VERIFICATION_PENDING_I18N.en) {
  return EMAIL_VERIFICATION_PENDING_I18N[locale.value][key] || EMAIL_VERIFICATION_PENDING_I18N.en[key]
}

function formatText(template: string, replacements: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(replacements[token] ?? ""))
}

const resendLoading = ref(false)
const checkingStatus = ref(false)
const feedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const resendAvailableAtMs = ref(0)
let cooldownTimer: number | null = null

const redirectQuery = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') ? redirect : ''
})

const pendingEmail = computed(() => {
  const queryEmail = typeof route.query.email === 'string' ? route.query.email.trim() : ''
  return queryEmail || account.value?.email || ''
})

const displayEmail = computed(() => {
  return pendingEmail.value || t('fallbackEmail')
})

const redirectTarget = computed(() => {
  if (redirectQuery.value) {
    return redirectQuery.value
  }
  return role.value === 'platform_admin' ? '/admin/categories' : '/admin/repository'
})

const canResend = computed(() => {
  if (!isAuthenticated.value) {
    return false
  }
  if (!account.value?.email) {
    return false
  }
  const queryEmail = typeof route.query.email === 'string' ? route.query.email.trim() : ''
  if (queryEmail && queryEmail !== account.value.email) {
    return false
  }
  return resendAvailableAtMs.value <= Date.now()
})

const loginLink = computed(() => {
  const query: Record<string, string> = {}
  query.mode = 'login'
  if (pendingEmail.value) {
    query.email = pendingEmail.value
  }
  if (redirectQuery.value) {
    query.redirect = redirectQuery.value
  }
  return {
    path: '/auth',
    query: Object.keys(query).length ? query : undefined,
  }
})

const registerLink = computed(() => {
  const query: Record<string, string> = {}
  if (redirectQuery.value) {
    query.redirect = redirectQuery.value
  }
  return {
    path: '/auth',
    query: Object.keys(query).length ? query : undefined,
  }
})

const primaryActionLabel = computed(() => {
  if (!isAuthenticated.value) {
    return t('loginToContinue')
  }
  return checkingStatus.value ? t('checking') : t('verifiedAction')
})

const syncCooldown = () => {
  if (!resendAvailableAtMs.value) {
    return
  }
  if (resendAvailableAtMs.value <= Date.now() && cooldownTimer !== null) {
    window.clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

const ensureCooldownTimer = () => {
  syncCooldown()
  if (cooldownTimer !== null || resendAvailableAtMs.value <= Date.now()) {
    return
  }
  cooldownTimer = window.setInterval(() => {
    syncCooldown()
  }, 1000)
}

const applyVerificationPayload = (payload: {
  available_at?: string
  cooldown_remaining_seconds?: number
}) => {
  const cooldownMs = Math.max(payload.cooldown_remaining_seconds || 0, 0) * 1000
  if (cooldownMs > 0) {
    resendAvailableAtMs.value = Date.now() + Math.max(payload.cooldown_remaining_seconds || 0, 0) * 1000
  } else {
    const availableAtMs = payload.available_at ? Date.parse(payload.available_at) : Number.NaN
    resendAvailableAtMs.value = Number.isFinite(availableAtMs) ? availableAtMs : 0
  }
  ensureCooldownTimer()
}

const sendVerificationEmail = async (showFeedback = false) => {
  if (!isAuthenticated.value || !account.value || account.value.email_verified) {
    return
  }
  try {
    const payload = await authStore.sendVerificationEmail()
    applyVerificationPayload(payload)
    if (showFeedback) {
      feedback.value = payload.sent
        ? {
            type: 'success',
            text: t('resendSuccess'),
          }
        : {
            type: 'success',
            text: formatText(t('resendCooldown'), {
              seconds: Math.max(payload.cooldown_remaining_seconds || 0, 0),
            }),
          }
    }
  } catch (error: unknown) {
    if (showFeedback) {
      feedback.value = {
        type: 'error',
        text: resolveApiErrorMessage(error) || t('sendFailed'),
      }
    }
  }
}

const handleResend = async () => {
  if (!canResend.value) {
    return
  }
  resendLoading.value = true
  feedback.value = null
  try {
    await sendVerificationEmail(true)
  } catch (error: unknown) {
    feedback.value = {
      type: 'error',
      text: resolveApiErrorMessage(error) || t('resendFailed'),
    }
  } finally {
    resendLoading.value = false
  }
}

const handlePrimaryAction = async () => {
  if (!isAuthenticated.value) {
    await router.push(loginLink.value)
    return
  }
  await handleRefreshStatus()
}

const handleRefreshStatus = async () => {
  checkingStatus.value = true
  feedback.value = null
  try {
    const session = await authStore.refreshSession()
    if (session?.account?.email_verified) {
      router.push(redirectTarget.value)
      return
    }
    feedback.value = {
      type: 'error',
      text: t('stillPending'),
    }
  } catch (error: unknown) {
    feedback.value = {
      type: 'error',
      text: resolveApiErrorMessage(error) || t('refreshFailed'),
    }
  } finally {
    checkingStatus.value = false
  }
}

const goToSignIn = async () => {
  if (isAuthenticated.value) {
    await authStore.logout()
  }
  await router.push(loginLink.value)
}

const useAnotherEmail = async () => {
  if (isAuthenticated.value) {
    await authStore.logout()
  }
  await router.push(registerLink.value)
}

onMounted(() => {
  if (isAuthenticated.value && account.value?.email_verified) {
    router.replace(redirectTarget.value)
  }
})

onUnmounted(() => {
  if (cooldownTimer !== null) {
    window.clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})
</script>

<style scoped>
.verification-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: radial-gradient(circle at top, #e0e7ff 0%, #f8fafc 55%, #eef2ff 100%);
}

.verification-card {
  width: 100%;
  max-width: 640px;
  padding: 2.5rem;
  border-radius: 1.5rem;
  background: white;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.verification-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: #e0e7ff;
  color: #4338ca;
  font-size: 0.8rem;
  font-weight: 700;
}

.verification-title {
  margin: 1rem 0 0;
  font-size: 2rem;
  line-height: 1.2;
  color: #0f172a;
}

.verification-description {
  margin: 1rem 0 0;
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
}

.feedback-banner {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  font-size: 0.95rem;
  line-height: 1.5;
}

.feedback-banner.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.feedback-banner.error {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
}

.action-group {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.85rem;
}

.primary-button,
.secondary-button {
  flex: 1;
  min-height: 3rem;
  border-radius: 0.9rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-button {
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.24);
}

.secondary-button {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
}

.secondary-button:hover:not(:disabled) {
  background: #f8fafc;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.link-row {
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.text-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}

.text-link-button {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 1rem;
}

.text-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .verification-page {
    padding: 1rem;
  }

  .verification-card {
    padding: 1.5rem;
  }

  .verification-title {
    font-size: 1.65rem;
  }

  .action-group,
  .link-row {
    flex-direction: column;
  }
}
</style>
