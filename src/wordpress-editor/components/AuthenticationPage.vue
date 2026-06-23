<template>
  <div class="auth-shell">
    <main class="auth-main">
      <div class="auth-card">
        <div class="auth-brand-row">
          <RouterLink to="/" class="brand-home-link">
            <BrandLogo size="auth" />
          </RouterLink>
          <div class="auth-brand-copy">
            <p class="eyebrow">mockup100</p>
          </div>
        </div>

        <div class="auth-card-header">
          <div>
            <h2 class="auth-title">{{ heading.title }}</h2>
            <p v-if="heading.subtitle" class="auth-subtitle">{{ heading.subtitle }}</p>
          </div>
          <RouterLink v-if="showBackToLogin" :to="loginRoute" class="text-link">
            {{ t("backToLogIn") }}
          </RouterLink>
        </div>

        <div v-if="showModeTabs" class="mode-tabs">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: currentMode === 'login' }"
            @click="switchMode('login')"
          >
            {{ t("logIn") }}
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: currentMode === 'register' }"
            @click="switchMode('register')"
          >
            {{ t("signUp") }}
          </button>
        </div>

        <div v-if="helperBanner" class="helper-banner">
          {{ helperBanner }}
        </div>

        <div v-if="authError" class="alert error">
          <strong>{{ t("error") }}</strong>
          <span>{{ authError }}</span>
        </div>

        <div v-if="authSuccess" class="alert success">
          <strong>{{ t("success") }}</strong>
          <span>{{ authSuccess }}</span>
        </div>

        <form class="auth-form" @submit.prevent="handlePrimaryAction">
          <template v-if="currentMode === 'register' || currentMode === 'login' || currentMode === 'forgot'">
            <div class="form-group" v-if="currentMode === 'register'">
              <label class="form-label" for="displayName">{{ t("displayName") }}</label>
              <input
                id="displayName"
                v-model="form.displayName"
                type="text"
                class="form-input"
                :placeholder="t('displayNamePlaceholder')"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="email">{{ t("emailAddress") }}</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-input"
                :class="{ invalid: fieldErrors.email }"
                placeholder="you@mockup100.com"
                autocomplete="email"
              />
              <p v-if="fieldErrors.email" class="form-error">{{ fieldErrors.email }}</p>
            </div>
          </template>

          <template v-if="currentMode === 'login' || currentMode === 'register'">
            <div class="form-group">
              <div class="label-row">
                <label class="form-label" for="password">{{ t("password") }}</label>
                <RouterLink v-if="currentMode === 'login'" :to="forgotPasswordRoute" class="text-link small">
                  {{ t("forgotPassword") }}
                </RouterLink>
              </div>
              <div class="password-row">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-input"
                  :class="{ invalid: fieldErrors.password }"
                  :placeholder="currentMode === 'login' ? t('enterPassword') : t('createPassword')"
                  autocomplete="current-password"
                />
                <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                  {{ showPassword ? t("hide") : t("show") }}
                </button>
              </div>
              <p v-if="fieldErrors.password" class="form-error">{{ fieldErrors.password }}</p>
            </div>
          </template>

          <template v-if="currentMode === 'register' || currentMode === 'reset'">
            <div class="form-group" v-if="currentMode === 'reset'">
              <label class="form-label" for="resetPassword">{{ t("newPassword") }}</label>
              <div class="password-row">
                <input
                  id="resetPassword"
                  v-model="resetForm.password"
                  :type="showResetPassword ? 'text' : 'password'"
                  class="form-input"
                  :class="{ invalid: fieldErrors.resetPassword }"
                  :placeholder="t('enterNewPassword')"
                  autocomplete="new-password"
                />
                <button type="button" class="password-toggle" @click="showResetPassword = !showResetPassword">
                  {{ showResetPassword ? t("hide") : t("show") }}
                </button>
              </div>
              <p v-if="fieldErrors.resetPassword" class="form-error">{{ fieldErrors.resetPassword }}</p>
            </div>

            <div class="form-group" v-if="currentMode === 'register'">
              <label class="form-label" for="confirmPassword">{{ t("confirmPassword") }}</label>
              <div class="password-row">
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="form-input"
                  :class="{ invalid: fieldErrors.confirmPassword }"
                  :placeholder="t('confirmYourPassword')"
                  autocomplete="new-password"
                />
                <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
                  {{ showConfirmPassword ? t("hide") : t("show") }}
                </button>
              </div>
              <p v-if="fieldErrors.confirmPassword" class="form-error">{{ fieldErrors.confirmPassword }}</p>
            </div>

            <div class="form-group" v-if="currentMode === 'reset'">
              <label class="form-label" for="confirmResetPassword">{{ t("confirmNewPassword") }}</label>
              <div class="password-row">
                <input
                  id="confirmResetPassword"
                  v-model="resetForm.confirmPassword"
                  :type="showConfirmResetPassword ? 'text' : 'password'"
                  class="form-input"
                  :class="{ invalid: fieldErrors.confirmResetPassword }"
                  :placeholder="t('confirmYourNewPassword')"
                  autocomplete="new-password"
                />
                <button type="button" class="password-toggle" @click="showConfirmResetPassword = !showConfirmResetPassword">
                  {{ showConfirmResetPassword ? t("hide") : t("show") }}
                </button>
              </div>
              <p v-if="fieldErrors.confirmResetPassword" class="form-error">{{ fieldErrors.confirmResetPassword }}</p>
            </div>
          </template>

          <div class="form-group" v-if="currentMode === 'register'">
            <label class="checkbox-row">
              <input v-model="form.agreeTerms" type="checkbox" />
              <span>
                {{ t("agreeTerms") }}
              </span>
            </label>
            <p v-if="fieldErrors.agreeTerms" class="form-error">{{ fieldErrors.agreeTerms }}</p>
          </div>

          <button type="submit" class="primary-button" :disabled="isSubmitting">
            <span v-if="!isSubmitting">{{ primaryButtonLabel }}</span>
            <span v-else>{{ submittingLabel }}</span>
          </button>
        </form>

        <div v-if="showFooterLinks" class="footer-links">
          <span v-if="currentMode === 'login'">{{ t("dontHaveAccount") }}</span>
          <span v-else-if="currentMode === 'register'">{{ t("alreadyHaveAccount") }}</span>
          <RouterLink
            v-if="currentMode === 'login'"
            :to="registerRoute"
            class="text-link"
          >
            {{ t("createOneNow") }}
          </RouterLink>
          <RouterLink
            v-else-if="currentMode === 'register'"
            :to="loginRoute"
            class="text-link"
          >
            {{ t("logInInstead") }}
          </RouterLink>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ApiRequestError, resolveApiErrorMessage } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { useUiLocaleStore } from '../stores/uiLocale'
import BrandLogo from './BrandLogo.vue'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const AUTH_I18N = {
  en: {
    backToLogIn: "Back to log in",
    logIn: "Log In",
    signUp: "Sign Up",
    error: "Error",
    success: "Success",
    displayName: "Display name",
    displayNamePlaceholder: "Display name",
    emailAddress: "Email address",
    password: "Password",
    forgotPassword: "Forgot password?",
    enterPassword: "Enter your password",
    createPassword: "Create a password",
    hide: "Hide",
    show: "Show",
    newPassword: "New password",
    enterNewPassword: "Enter a new password",
    confirmPassword: "Confirm password",
    confirmYourPassword: "Confirm your password",
    confirmNewPassword: "Confirm new password",
    confirmYourNewPassword: "Confirm your new password",
    agreeTerms: "I agree to the Terms and Privacy Policy.",
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: "Already have an account?",
    createOneNow: "Create one now",
    logInInstead: "Log in instead",
    createYourAccount: "Create your account",
    forgotYourPassword: "Forgot your password?",
    forgotSubtitle: "Enter your email and we will send a reset link if the account exists.",
    setNewPassword: "Set a new password",
    setNewPasswordSubtitle: "Choose a new password, then log in again.",
    welcomeBack: "Welcome back",
    sendResetEmail: "Send Reset Email",
    resetPassword: "Reset Password",
    creatingAccount: "Creating account...",
    sendingEmail: "Sending email...",
    resettingPassword: "Resetting password...",
    loggingIn: "Logging in...",
    missingResetToken: "This reset link is missing a token. Request a new password reset email.",
    passwordResetCompleted: "Password reset completed successfully. Please log in with your new password.",
    emailRequired: "Email is required.",
    validEmailRequired: "Please enter a valid email address.",
    passwordRequired: "Password is required.",
    passwordMinLength: "Password must be at least 8 characters.",
    confirmPasswordRequired: "Please confirm your password.",
    passwordsDoNotMatch: "Passwords do not match.",
    acceptTermsRequired: "You must accept the terms to continue.",
    invalidResetLink: "This reset link is invalid. Please request a new password reset email.",
    enterNewPasswordRequired: "Please enter a new password.",
    confirmNewPasswordRequired: "Please confirm your new password.",
    loginSuccess: "Login successful. Redirecting...",
    accountCreated: "Account created. Redirecting to email verification...",
    resetEmailSent: "If the account exists, a password reset email will be sent.",
    pendingVerificationError: "This email is already registered but still waiting for verification.",
    pendingVerificationSuccess: "A new verification email has been sent. Please check your inbox.",
    genericError: "Something went wrong. Please try again.",
  },
  zh: {
    backToLogIn: "返回登录",
    logIn: "登录",
    signUp: "注册",
    error: "错误",
    success: "成功",
    displayName: "显示名称",
    displayNamePlaceholder: "显示名称",
    emailAddress: "邮箱地址",
    password: "密码",
    forgotPassword: "忘记密码？",
    enterPassword: "输入密码",
    createPassword: "创建密码",
    hide: "隐藏",
    show: "显示",
    newPassword: "新密码",
    enterNewPassword: "输入新密码",
    confirmPassword: "确认密码",
    confirmYourPassword: "确认你的密码",
    confirmNewPassword: "确认新密码",
    confirmYourNewPassword: "确认你的新密码",
    agreeTerms: "我同意服务条款与隐私政策。",
    dontHaveAccount: "还没有账号？",
    alreadyHaveAccount: "已有账号？",
    createOneNow: "立即创建",
    logInInstead: "改为登录",
    createYourAccount: "创建你的账号",
    forgotYourPassword: "忘记密码？",
    forgotSubtitle: "输入邮箱后，如果账号存在，我们会发送重置链接。",
    setNewPassword: "设置新密码",
    setNewPasswordSubtitle: "设置新密码后，请重新登录。",
    welcomeBack: "欢迎回来",
    sendResetEmail: "发送重置邮件",
    resetPassword: "重置密码",
    creatingAccount: "正在创建账号...",
    sendingEmail: "正在发送邮件...",
    resettingPassword: "正在重置密码...",
    loggingIn: "正在登录...",
    missingResetToken: "当前重置链接缺少令牌，请重新申请密码重置邮件。",
    passwordResetCompleted: "密码已重置成功，请使用新密码登录。",
    emailRequired: "请输入邮箱地址。",
    validEmailRequired: "请输入有效的邮箱地址。",
    passwordRequired: "请输入密码。",
    passwordMinLength: "密码至少需要 8 个字符。",
    confirmPasswordRequired: "请确认密码。",
    passwordsDoNotMatch: "两次输入的密码不一致。",
    acceptTermsRequired: "请先同意条款后再继续。",
    invalidResetLink: "当前重置链接无效，请重新申请密码重置邮件。",
    enterNewPasswordRequired: "请输入新密码。",
    confirmNewPasswordRequired: "请确认你的新密码。",
    loginSuccess: "登录成功，正在跳转...",
    accountCreated: "账号创建成功，正在跳转到邮箱验证页面...",
    resetEmailSent: "如果该账号存在，我们会发送密码重置邮件。",
    pendingVerificationError: "该邮箱已注册，但仍在等待验证。",
    pendingVerificationSuccess: "新的验证邮件已发送，请查收邮箱。",
    genericError: "发生了一些问题，请稍后再试。",
  },
} as const

function t(key: keyof typeof AUTH_I18N.en) {
  return AUTH_I18N[locale.value][key] || AUTH_I18N.en[key]
}

const currentMode = ref<AuthMode>('login')
const isSubmitting = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showResetPassword = ref(false)
const showConfirmResetPassword = ref(false)
const authError = ref('')
const authSuccess = ref('')
const resetToken = ref('')

const form = reactive({
  email: '',
  password: '',
  displayName: '',
  confirmPassword: '',
  agreeTerms: false,
})

const resetForm = reactive({
  password: '',
  confirmPassword: '',
})

const fieldErrors = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: '',
  resetPassword: '',
  confirmResetPassword: '',
})

const redirectQuery = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') ? redirect : ''
})

const loginRoute = computed(() => {
  return redirectQuery.value
    ? { path: '/auth', query: { mode: 'login', redirect: redirectQuery.value } }
    : { path: '/auth', query: { mode: 'login' } }
})

const registerRoute = computed(() => {
  return redirectQuery.value
    ? { path: '/auth', query: { mode: 'register', redirect: redirectQuery.value } }
    : { path: '/auth', query: { mode: 'register' } }
})

const forgotPasswordRoute = computed(() => {
  const query: Record<string, string> = { mode: 'forgot-password' }
  const email = form.email.trim()
  if (email) query.email = email
  if (redirectQuery.value) query.redirect = redirectQuery.value
  return { path: '/auth', query }
})

const showBackToLogin = computed(() => currentMode.value === 'forgot' || currentMode.value === 'reset')
const showModeTabs = computed(() => currentMode.value === 'login' || currentMode.value === 'register')
const showFooterLinks = computed(() => currentMode.value === 'login' || currentMode.value === 'register')

const heading = computed(() => {
  switch (currentMode.value) {
    case 'register':
      return {
        title: t('createYourAccount'),
        subtitle: '',
      }
    case 'forgot':
      return {
        title: t('forgotYourPassword'),
        subtitle: t('forgotSubtitle'),
      }
    case 'reset':
      return {
        title: t('setNewPassword'),
        subtitle: t('setNewPasswordSubtitle'),
      }
    default:
      return {
        title: t('welcomeBack'),
        subtitle: '',
      }
  }
})

const primaryButtonLabel = computed(() => {
  switch (currentMode.value) {
    case 'register':
      return t('signUp')
    case 'forgot':
      return t('sendResetEmail')
    case 'reset':
      return t('resetPassword')
    default:
      return t('logIn')
  }
})

const submittingLabel = computed(() => {
  switch (currentMode.value) {
    case 'register':
      return t('creatingAccount')
    case 'forgot':
      return t('sendingEmail')
    case 'reset':
      return t('resettingPassword')
    default:
      return t('loggingIn')
  }
})

const helperBanner = computed(() => {
  if (currentMode.value === 'reset' && !resetToken.value) {
    return t('missingResetToken')
  }
  return ''
})

function syncFromRoute() {
  authError.value = ''
  authSuccess.value = ''

  const mode = typeof route.query.mode === 'string' ? route.query.mode : ''
  const email = typeof route.query.email === 'string' ? route.query.email.trim() : ''
  const token = typeof route.query.reset_token === 'string' ? route.query.reset_token.trim() : ''
  const resetSuccess = route.query.reset_success === '1'

  if (email) {
    form.email = email
  }

  if (mode === 'register') {
    currentMode.value = 'register'
  } else if (mode === 'forgot-password') {
    currentMode.value = 'forgot'
  } else if (mode === 'reset-password') {
    currentMode.value = 'reset'
  } else {
    currentMode.value = 'login'
  }

  resetToken.value = token

  if (resetSuccess && currentMode.value === 'login') {
    authSuccess.value = t('passwordResetCompleted')
  }
}

watch(() => route.fullPath, syncFromRoute, { immediate: true })

function clearFieldErrors() {
  fieldErrors.email = ''
  fieldErrors.password = ''
  fieldErrors.confirmPassword = ''
  fieldErrors.agreeTerms = ''
  fieldErrors.resetPassword = ''
  fieldErrors.confirmResetPassword = ''
}

function validateEmail(value: string) {
  if (!value.trim()) return t('emailRequired')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t('validEmailRequired')
  return ''
}

function validateLoginOrRegisterForm() {
  clearFieldErrors()
  fieldErrors.email = validateEmail(form.email)

  if (currentMode.value === 'login') {
    if (!form.password) fieldErrors.password = t('passwordRequired')
    return !fieldErrors.email && !fieldErrors.password
  }

  if (!form.password) {
    fieldErrors.password = t('passwordRequired')
  } else if (form.password.length < 8) {
    fieldErrors.password = t('passwordMinLength')
  }

  if (!form.confirmPassword) {
    fieldErrors.confirmPassword = t('confirmPasswordRequired')
  } else if (form.confirmPassword !== form.password) {
    fieldErrors.confirmPassword = t('passwordsDoNotMatch')
  }

  if (!form.agreeTerms) {
    fieldErrors.agreeTerms = t('acceptTermsRequired')
  }

  return !fieldErrors.email && !fieldErrors.password && !fieldErrors.confirmPassword && !fieldErrors.agreeTerms
}

function validateForgotForm() {
  clearFieldErrors()
  fieldErrors.email = validateEmail(form.email)
  return !fieldErrors.email
}

function validateResetForm() {
  clearFieldErrors()
  if (!resetToken.value) {
    authError.value = t('invalidResetLink')
    return false
  }
  if (!resetForm.password) {
    fieldErrors.resetPassword = t('enterNewPasswordRequired')
  } else if (resetForm.password.length < 8) {
    fieldErrors.resetPassword = t('passwordMinLength')
  }

  if (!resetForm.confirmPassword) {
    fieldErrors.confirmResetPassword = t('confirmNewPasswordRequired')
  } else if (resetForm.confirmPassword !== resetForm.password) {
    fieldErrors.confirmResetPassword = t('passwordsDoNotMatch')
  }

  return !fieldErrors.resetPassword && !fieldErrors.confirmResetPassword
}

function resolveAuthenticatedTarget() {
  if (redirectQuery.value) {
    return redirectQuery.value
  }
  return '/admin/dashboard'
}

async function handlePrimaryAction() {
  authError.value = ''
  authSuccess.value = ''

  if (currentMode.value === 'forgot') {
    await handleForgotPassword()
    return
  }
  if (currentMode.value === 'reset') {
    await handleResetPassword()
    return
  }

  if (!validateLoginOrRegisterForm()) {
    return
  }

  isSubmitting.value = true
  try {
    if (currentMode.value === 'login') {
      await authStore.login(form.email, form.password)
      authSuccess.value = t('loginSuccess')
      await router.replace(resolveAuthenticatedTarget())
      return
    } else {
      await authStore.register(form.email, form.password, form.displayName)
      authSuccess.value = t('accountCreated')
      await router.push({
        path: '/verify-email/pending',
        query: {
          email: form.email.trim(),
          ...(redirectQuery.value ? { redirect: redirectQuery.value } : {}),
        },
      })
    }
  } catch (error: unknown) {
    applyAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleForgotPassword() {
  if (!validateForgotForm()) {
    return
  }

  isSubmitting.value = true
  try {
    await authStore.forgotPassword(form.email)
    authSuccess.value = authStore.notice || t('resetEmailSent')
  } catch (error: unknown) {
    applyAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleResetPassword() {
  if (!validateResetForm()) {
    return
  }

  isSubmitting.value = true
  try {
    await authStore.resetPassword(resetToken.value, resetForm.password)
    form.password = ''
    resetForm.password = ''
    resetForm.confirmPassword = ''
    await router.replace({
      path: '/auth',
      query: {
        mode: 'login',
        reset_success: '1',
      },
    })
  } catch (error: unknown) {
    applyAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}

function applyStructuredLoginError(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return false
  }

  const structuredCode = error.errors.find((item) => item.code)?.code?.toLowerCase() || ''
  const preferredMessage = error.errors.find((item) => item.message)?.message || error.message
  const normalizedMessage = preferredMessage.trim().toLowerCase()

  if (structuredCode !== 'authentication_failed' && !normalizedMessage.includes('invalid email or password')) {
    return false
  }

  fieldErrors.password = preferredMessage
  return true
}

function applyAuthError(error: unknown) {
  const rawMessage = resolveApiErrorMessage(error).toLowerCase()
  if (currentMode.value === 'register' && rawMessage.includes('pending verification')) {
    authError.value = t('pendingVerificationError')
    authSuccess.value = t('pendingVerificationSuccess')
    return
  }
  if (currentMode.value === 'login' && applyStructuredLoginError(error)) {
    return
  }
  authError.value = authStore.error || resolveApiErrorMessage(error) || t('genericError')
}

async function switchMode(mode: 'login' | 'register') {
  await router.replace({
    path: '/auth',
    query: {
      mode,
      ...(redirectQuery.value ? { redirect: redirectQuery.value } : {}),
    },
  })
}
</script>

<style scoped>
.brand-home-link {
  text-decoration: none;
}

.auth-shell {
  min-height: 100vh;
  display: block;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.16), transparent 24%),
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.16), transparent 28%),
    #f8fafc;
}

.auth-main {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.auth-card {
  width: min(100%, 560px);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe3f0;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.12);
  position: relative;
  overflow: hidden;
}

.auth-brand-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.15rem;
  margin-bottom: 1.35rem;
  border-bottom: 1px solid #eef2f7;
}

.auth-brand-copy {
  display: flex;
  align-items: center;
}

.auth-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 5px;
  background: linear-gradient(90deg, #10b981 0%, #6366f1 100%);
}

.auth-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.2rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6366f1;
}

.auth-title {
  margin: 0;
  font-size: 2rem;
  color: #111827;
}

.auth-subtitle {
  margin: 0.5rem 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.mode-tabs {
  display: inline-flex;
  gap: 0.5rem;
  padding: 0.375rem;
  border-radius: 14px;
  background: #f3f4f6;
  margin-bottom: 1.5rem;
}

.mode-tab {
  border: none;
  background: transparent;
  color: #4b5563;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.mode-tab.active {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}

.helper-banner {
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.92rem;
  line-height: 1.5;
}

.alert {
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  margin-bottom: 1rem;
}

.alert.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.alert.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.auth-form {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: grid;
  gap: 0.45rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.form-label {
  font-size: 0.92rem;
  font-weight: 700;
  color: #374151;
}

.form-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  font-size: 1rem;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-height: 52px;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.form-input.invalid {
  border-color: #ef4444;
}

.password-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
}

.password-toggle {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  border-radius: 12px;
  padding: 0 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.password-toggle:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4338ca;
}

.form-help {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
  line-height: 1.5;
}

.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.85rem;
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  color: #4b5563;
  line-height: 1.55;
}

.checkbox-row input {
  margin-top: 0.2rem;
  accent-color: #4f46e5;
}

.primary-button {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 0.95rem 1.1rem;
  background: linear-gradient(135deg, #10b981 0%, #6366f1 100%);
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  min-height: 52px;
  box-shadow: 0 14px 24px rgba(79, 70, 229, 0.18);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(79, 70, 229, 0.24);
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.footer-links {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 0.92rem;
}

.text-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 700;
}

.text-link:hover {
  text-decoration: underline;
}

.text-link.small {
  font-size: 0.85rem;
}

@media (max-width: 960px) {
  .auth-main {
    padding: 1rem;
  }

  .auth-card {
    padding: 1.5rem;
    border-radius: 20px;
  }
}

@media (max-width: 640px) {
  .auth-brand-row,
  .auth-card-header,
  .label-row,
  .footer-links {
    flex-direction: column;
    align-items: flex-start;
  }

  .password-row {
    grid-template-columns: 1fr;
  }

  .password-toggle {
    min-height: 44px;
  }
}
</style>
