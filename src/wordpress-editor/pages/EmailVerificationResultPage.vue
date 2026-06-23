<template>
  <div class="verification-result-page">
    <div class="verification-result-card">
      <div class="result-icon" :class="status">
        <span v-if="status === 'loading'">...</span>
        <span v-else-if="status === 'success'">✓</span>
        <span v-else>!</span>
      </div>

      <h1 class="result-title">{{ title }}</h1>
      <p class="result-description">{{ description }}</p>

      <div v-if="detailMessage" class="result-detail" :class="status">
        {{ detailMessage }}
      </div>

      <div class="result-actions">
        <button
          v-if="status === 'success' && isAuthenticated"
          type="button"
          class="primary-button"
          @click="goToWorkspace"
        >
          {{ t("continueToWorkspace") }}
        </button>
        <RouterLink
          v-else-if="status === 'success'"
          :to="loginLink"
          class="primary-button link-button"
        >
          {{ t("logIn") }}
        </RouterLink>
        <RouterLink
          v-if="status === 'error'"
          :to="pendingLink"
          class="secondary-button link-button"
        >
          {{ t("verificationHelp") }}
        </RouterLink>
        <button
          v-if="status === 'error' && token"
          type="button"
          class="primary-button"
          @click="verifyToken"
        >
          {{ t("tryAgain") }}
        </button>
      </div>

      <div class="link-row">
        <RouterLink :to="loginLink" class="text-link">{{ t("backToLogin") }}</RouterLink>
        <RouterLink v-if="status !== 'error'" :to="registerLink" class="text-link">{{ t("createAnotherAccount") }}</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { resolveApiErrorMessage } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { useUiLocaleStore } from '../stores/uiLocale'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { role, account, isAuthenticated } = storeToRefs(authStore)
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const EMAIL_VERIFICATION_RESULT_I18N = {
  en: {
    continueToWorkspace: "Continue To Workspace",
    logIn: "Log In",
    verificationHelp: "Verification Help",
    tryAgain: "Try Again",
    backToLogin: "Back to log in",
    createAnotherAccount: "Create another account",
    titleLoading: "Verifying your email",
    titleSuccess: "Email verified",
    titleError: "Verification failed",
    descriptionLoading: "Checking your verification link.",
    descriptionSuccess: "Your email is verified.",
    descriptionError: "This verification link is invalid, expired, or already used.",
    missingToken: "Missing token.",
    rewardGranted: "{tokens} free tokens have been added to your workspace.",
    successFallback: "You can log in and continue.",
    verifyFailed: "Unable to verify this link.",
  },
  zh: {
    continueToWorkspace: "进入工作区",
    logIn: "登录",
    verificationHelp: "验证帮助",
    tryAgain: "重试",
    backToLogin: "返回登录",
    createAnotherAccount: "创建另一个账号",
    titleLoading: "正在验证邮箱",
    titleSuccess: "邮箱验证成功",
    titleError: "验证失败",
    descriptionLoading: "正在检查你的验证链接。",
    descriptionSuccess: "你的邮箱已验证成功。",
    descriptionError: "该验证链接无效、已过期，或已经被使用。",
    missingToken: "缺少验证令牌。",
    rewardGranted: "已向你的工作区发放 {tokens} 个免费令牌。",
    successFallback: "现在可以登录并继续使用。",
    verifyFailed: "无法验证该链接。",
  },
} as const

function t(key: keyof typeof EMAIL_VERIFICATION_RESULT_I18N.en) {
  return EMAIL_VERIFICATION_RESULT_I18N[locale.value][key] || EMAIL_VERIFICATION_RESULT_I18N.en[key]
}

function formatText(template: string, replacements: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(replacements[token] ?? ""))
}

const status = ref<'loading' | 'success' | 'error'>('loading')
const detailMessage = ref('')

const token = computed(() => {
  return typeof route.query.token === 'string' ? route.query.token.trim() : ''
})

const redirectQuery = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') ? redirect : ''
})

const verificationEmail = computed(() => {
  const queryEmail = typeof route.query.email === 'string' ? route.query.email.trim() : ''
  return account.value?.email || queryEmail
})

const pendingLink = computed(() => {
  const query: Record<string, string> = {}
  if (verificationEmail.value) {
    query.email = verificationEmail.value
  }
  if (redirectQuery.value) {
    query.redirect = redirectQuery.value
  }
  return {
    path: '/verify-email/pending',
    query: Object.keys(query).length ? query : undefined,
  }
})

const workspaceTarget = computed(() => {
  if (redirectQuery.value) {
    return redirectQuery.value
  }
  return role.value === 'platform_admin' ? '/admin/categories' : '/admin/repository'
})

const loginLink = computed(() => {
  const query: Record<string, string> = {}
  query.mode = 'login'
  if (verificationEmail.value) {
    query.email = verificationEmail.value
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
  return redirectQuery.value
    ? { path: '/auth', query: { mode: 'register', redirect: redirectQuery.value } }
    : { path: '/auth', query: { mode: 'register' } }
})

const title = computed(() => {
  if (status.value === 'loading') return t('titleLoading')
  if (status.value === 'success') return t('titleSuccess')
  return t('titleError')
})

const description = computed(() => {
  if (status.value === 'loading') {
    return t('descriptionLoading')
  }
  if (status.value === 'success') {
    return t('descriptionSuccess')
  }
  return t('descriptionError')
})

const goToWorkspace = () => {
  router.push(workspaceTarget.value)
}

const verifyToken = async () => {
  if (!token.value) {
    status.value = 'error'
    detailMessage.value = t('missingToken')
    return
  }

  status.value = 'loading'
  detailMessage.value = ''
  try {
    const payload = await authStore.verifyEmailToken(token.value)
    status.value = 'success'
    detailMessage.value = payload.reward_granted
      ? formatText(t('rewardGranted'), { tokens: payload.reward_tokens })
      : t('successFallback')
  } catch (error: unknown) {
    status.value = 'error'
    detailMessage.value = resolveApiErrorMessage(error) || t('verifyFailed')
  }
}

onMounted(() => {
  void verifyToken()
})
</script>

<style scoped>
.verification-result-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: radial-gradient(circle at top, #dbeafe 0%, #f8fafc 52%, #eef2ff 100%);
}

.verification-result-card {
  width: 100%;
  max-width: 560px;
  padding: 2.5rem;
  border-radius: 1.5rem;
  background: white;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  text-align: center;
}

.result-icon {
  width: 4.5rem;
  height: 4.5rem;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
}

.result-icon.loading {
  background: #e0e7ff;
  color: #4338ca;
}

.result-icon.success {
  background: #dcfce7;
  color: #166534;
}

.result-icon.error {
  background: #fee2e2;
  color: #b91c1c;
}

.result-title {
  margin: 1.25rem 0 0;
  color: #0f172a;
  font-size: 2rem;
  line-height: 1.2;
}

.result-description {
  margin: 1rem 0 0;
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
}

.result-detail {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: 1rem;
  font-size: 0.95rem;
  line-height: 1.6;
}

.result-detail.loading {
  background: #eef2ff;
  color: #4338ca;
}

.result-detail.success {
  background: #f0fdf4;
  color: #166534;
}

.result-detail.error {
  background: #fff7ed;
  color: #9a3412;
}

.result-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 0.85rem;
}

.primary-button,
.secondary-button,
.link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0.85rem 1.2rem;
  border-radius: 0.9rem;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
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

.secondary-button:hover {
  background: #f8fafc;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-row {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1.25rem;
}

.text-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}

.text-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .verification-result-page {
    padding: 1rem;
  }

  .verification-result-card {
    padding: 1.5rem;
  }

  .result-title {
    font-size: 1.65rem;
  }

  .result-actions,
  .link-row {
    flex-direction: column;
  }
}
</style>
