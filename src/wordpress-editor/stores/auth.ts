import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { ApiRequestError, erpFetch, gatewayPlatformFetch, resolveApiErrorMessage } from "../api/client"
import { normalizeSupplierCapability, type SupplierCapabilitySnapshot } from "../erp/supplier"
import { usePlatformStore } from "./platform"
import { useTemplateStore } from "./templates"

type AuthRole = "guest" | "platform_admin" | "tenant_admin"
type SupplierCapabilityPayload = SupplierCapabilitySnapshot

type AccountPayload = {
  account_id: string
  email: string
  display_name: string
  status: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

type TenantPayload = {
  tenant_id: string
  email: string
  plan_code: string
  quota_total: number
  quota_used: number
  status: string
  api_key_preview?: string
  created_at: string
  updated_at: string
}

type MembershipPayload = {
  membership_id: string
  tenant_id: string
  role: "tenant_admin"
  created_at: string
  updated_at: string
}

type SubscriptionPayload = {
  tenant_id: string
  plan_code: string
  billing_cycle: "trial" | "monthly" | "yearly" | "usage"
  status: "inactive" | "trialing" | "active" | "expired" | "cancelled" | "paused"
  trial_enabled_at?: string | null
  trial_ends_at?: string | null
  current_period_starts_at?: string | null
  current_period_ends_at?: string | null
  source: string
  created_at: string
  updated_at: string
}

type EntitlementsPayload = {
  published_template_limit: number | null
  published_templates_used: number
  draft_template_limit: number | null
  plan_code: string
  template_publish_access: boolean
  sdk_api_access: boolean
  usage_based_billing: boolean
  billing_mode: "tokens"
  token_total: number
  token_used: number
  token_balance: number
  paid_token_balance: number
  starter_token_balance: number
  hard_stop_on_zero_tokens: boolean
  sdk_api_scopes: string[]
  quality_pricing: Record<string, number>
  size_pricing: Record<string, number>
  volume_discount_tier: string
  marketplace_purchase_access: boolean
  marketplace_sell_access: boolean
  preview_512_monthly_quota: number
  preview_512_monthly_used: number
  preview_512_monthly_remaining: number
  preview_cycle_month: string
  trial_requires_manual_activation: boolean
  trial_available: boolean
  trial_started: boolean
  trial_active: boolean
  remaining_days: number
  requires_published_cleanup: boolean
  locked_published_templates: number
}

type AuthSessionPayload = {
  access_token: string
  role: Exclude<AuthRole, "guest">
  available_roles?: string[]
  account: AccountPayload
  tenant?: TenantPayload | null
  membership?: MembershipPayload | null
  subscription?: SubscriptionPayload | null
  entitlements?: EntitlementsPayload | null
  supplier?: SupplierCapabilityPayload | null
}

type LegacyAuthSessionPayload = {
  access_token: string
  role: Exclude<AuthRole, "guest">
  available_roles?: string[]
  account?: Partial<AccountPayload> & { id?: string; display_name?: string; displayName?: string }
  tenant?: (Partial<TenantPayload> & { id?: string; name?: string; plan?: string }) | null
  membership?: MembershipPayload | null
  subscription?: SubscriptionPayload | null
  entitlements?: Partial<EntitlementsPayload> | null
  supplier?: Partial<SupplierCapabilityPayload> | null
}

type AuthTokenIssuePayload = {
  sent: boolean
  token: string
  expires_at: string
  verification_url: string
  available_at: string
  cooldown_remaining_seconds: number
}

type ErpTicketPayload = {
  ticket: string
  expiresAt: string
  audience: string
}

type ErpSessionPayload = {
  accountId: string
  tenantId: string
  email: string
  displayName: string
  role: string
  issuer: string
  audience: string
  expiresAt: string
}

type EmailVerificationResultPayload = {
  verified: boolean
  reward_granted: boolean
  reward_tokens: number
}

const STORAGE_KEY = "mockup-console-auth"

function getSafeStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeErrorMessage(value: string): string {
  return value.trim().toLowerCase()
}

export function isEmailVerificationPendingError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    const structuredCode = error.errors.find((item) => item.code)?.code?.toLowerCase() || ""
    if (structuredCode === "email_not_verified" || structuredCode === "pending_verification") {
      return true
    }
  }

  const normalizedMessage = normalizeErrorMessage(resolveApiErrorMessage(error))
  return normalizedMessage.includes("email not verified")
    || normalizedMessage.includes("not verified")
    || normalizedMessage.includes("pending verification")
}

function resolveLoginErrorMessage(error: unknown): string {
  const rawMessage = resolveApiErrorMessage(error)
  const normalizedMessage = normalizeErrorMessage(rawMessage)
  const structuredCode = error instanceof ApiRequestError
    ? error.errors.find((item) => item.code)?.code?.toLowerCase()
    : ""

  if (structuredCode === "authentication_failed") {
    return "Invalid email or password. Please try again."
  }
  if (normalizedMessage.includes("invalid credentials")) {
    return "Invalid email or password. Please try again."
  }
  if (normalizedMessage.includes("invalid email or password")) {
    return "Invalid email or password. Please try again."
  }
  if (isEmailVerificationPendingError(error)) {
    return "Email not verified. Please check your inbox and verify your email before signing in."
  }
  if (normalizedMessage.includes("not found") || normalizedMessage.includes("doesn't exist")) {
    return "No account found with this email. Please check your email or register for a new account."
  }
  if (normalizedMessage.includes("invalid") && normalizedMessage.includes("email")) {
    return "Please enter a valid email address."
  }
  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "Network error. Please check your connection and try again."
  }
  if (structuredCode === "unauthorized" || normalizedMessage.includes("unauthorized") || normalizedMessage.includes("401")) {
    return "Invalid email or password. Please try again."
  }
  return rawMessage
}

function resolveAvailableRoles(nextRole: string | undefined, payload?: string[] | null): string[] {
  if (Array.isArray(payload) && payload.length > 0) {
    return Array.from(new Set(payload.map((item) => String(item).trim()).filter(Boolean)))
  }
  if (nextRole === "platform_admin") {
    return ["platform_admin", "tenant_admin", "supplier"]
  }
  if (nextRole === "tenant_admin") {
    return ["tenant_admin"]
  }
  return []
}

function resolveSupplierCapability(
  nextRole: string | undefined,
  payload?: Partial<SupplierCapabilityPayload> | null,
): SupplierCapabilityPayload {
  return normalizeSupplierCapability(nextRole, payload)
}

export const useAuthStore = defineStore("auth", () => {
  const role = ref<AuthRole>("guest")
  const accessToken = ref("")
  const platformSecret = ref("")
  const apiKey = ref("")
  const account = ref<AccountPayload | null>(null)
  const tenant = ref<TenantPayload | null>(null)
  const membership = ref<MembershipPayload | null>(null)
  const subscription = ref<SubscriptionPayload | null>(null)
  const entitlements = ref<EntitlementsPayload | null>(null)
  const availableRoles = ref<string[]>([])
  const supplier = ref<SupplierCapabilityPayload | null>(null)
  const activeWorkspace = ref<"platform" | "erp">("platform")
  const erpSession = ref<ErpSessionPayload | null>(null)
  const loading = ref(false)
  const error = ref("")
  const notice = ref("")

  function updateSupplierCapability(payload?: Partial<SupplierCapabilityPayload> | null) {
    supplier.value = resolveSupplierCapability(role.value, payload)
    persist()
  }

  function persist() {
    const storage = getSafeStorage()
    if (!storage) return
    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          role: role.value,
          accessToken: accessToken.value,
          platformSecret: platformSecret.value,
          apiKey: apiKey.value,
          account: account.value,
          tenant: tenant.value,
          membership: membership.value,
          subscription: subscription.value,
          entitlements: entitlements.value,
          availableRoles: availableRoles.value,
          supplier: supplier.value,
          activeWorkspace: activeWorkspace.value,
          erpSession: erpSession.value,
        }),
      )
    } catch {
      // Keep the in-memory session usable even if storage is unavailable.
    }
  }

  function clearState() {
    const platformStore = usePlatformStore()
    const templateStore = useTemplateStore()
    role.value = "guest"
    accessToken.value = ""
    platformSecret.value = ""
    apiKey.value = ""
    account.value = null
    tenant.value = null
    membership.value = null
    subscription.value = null
    entitlements.value = null
    availableRoles.value = []
    supplier.value = null
    activeWorkspace.value = "platform"
    erpSession.value = null
    platformStore.resetState()
    templateStore.resetState()
  }

  function normalizeSession(payload: LegacyAuthSessionPayload): AuthSessionPayload {
    const accountPayload = payload.account || ({} as LegacyAuthSessionPayload["account"])
    const tenantPayload = payload.tenant || null
    const entitlementPayload = payload.entitlements || null
    return {
      access_token: payload.access_token,
      role: payload.role,
      available_roles: resolveAvailableRoles(payload.role, payload.available_roles || null),
      account: {
        account_id: String(accountPayload?.account_id || accountPayload?.id || ""),
        email: String(accountPayload?.email || ""),
        display_name: String(accountPayload?.display_name || accountPayload?.displayName || ""),
        status: String(accountPayload?.status || "active"),
        email_verified: Boolean(accountPayload?.email_verified ?? true),
        created_at: String(accountPayload?.created_at || ""),
        updated_at: String(accountPayload?.updated_at || ""),
      },
      tenant: tenantPayload
        ? {
            tenant_id: String(tenantPayload.tenant_id || tenantPayload.id || ""),
            email: String(tenantPayload.email || ""),
            plan_code: String(tenantPayload.plan_code || tenantPayload.plan || ""),
            quota_total: Number(tenantPayload.quota_total || 0),
            quota_used: Number(tenantPayload.quota_used || 0),
            status: String(tenantPayload.status || "active"),
            api_key_preview: tenantPayload.api_key_preview,
            created_at: String(tenantPayload.created_at || ""),
            updated_at: String(tenantPayload.updated_at || ""),
          }
        : null,
      membership: payload.membership || null,
      subscription: payload.subscription || null,
      entitlements: entitlementPayload
        ? {
            published_template_limit: entitlementPayload.published_template_limit ?? null,
            published_templates_used: Number(entitlementPayload.published_templates_used ?? 0),
            draft_template_limit: entitlementPayload.draft_template_limit ?? null,
            plan_code: String(entitlementPayload.plan_code ?? ""),
            template_publish_access: Boolean(entitlementPayload.template_publish_access),
            sdk_api_access: Boolean(entitlementPayload.sdk_api_access),
            usage_based_billing: Boolean(entitlementPayload.usage_based_billing),
            billing_mode: "tokens",
            token_total: Number(entitlementPayload.token_total ?? 0),
            token_used: Number(entitlementPayload.token_used ?? 0),
            token_balance: Number(entitlementPayload.token_balance ?? 0),
            paid_token_balance: Number(entitlementPayload.paid_token_balance ?? 0),
            starter_token_balance: Number(entitlementPayload.starter_token_balance ?? 0),
            hard_stop_on_zero_tokens: Boolean(entitlementPayload.hard_stop_on_zero_tokens),
            sdk_api_scopes: Array.isArray(entitlementPayload.sdk_api_scopes) ? entitlementPayload.sdk_api_scopes : [],
            quality_pricing: entitlementPayload.quality_pricing ?? {},
            size_pricing: entitlementPayload.size_pricing ?? {},
            volume_discount_tier: String(entitlementPayload.volume_discount_tier ?? ""),
            marketplace_purchase_access: Boolean(entitlementPayload.marketplace_purchase_access),
            marketplace_sell_access: Boolean(entitlementPayload.marketplace_sell_access),
            preview_512_monthly_quota: Number(entitlementPayload.preview_512_monthly_quota ?? 0),
            preview_512_monthly_used: Number(entitlementPayload.preview_512_monthly_used ?? 0),
            preview_512_monthly_remaining: Number(entitlementPayload.preview_512_monthly_remaining ?? 0),
            preview_cycle_month: String(entitlementPayload.preview_cycle_month ?? ""),
            trial_requires_manual_activation: Boolean(entitlementPayload.trial_requires_manual_activation),
            trial_available: Boolean(entitlementPayload.trial_available),
            trial_started: Boolean(entitlementPayload.trial_started),
            trial_active: Boolean(entitlementPayload.trial_active),
            remaining_days: Number(entitlementPayload.remaining_days ?? 0),
            requires_published_cleanup: Boolean(entitlementPayload.requires_published_cleanup),
            locked_published_templates: Number(entitlementPayload.locked_published_templates ?? 0),
          }
        : null,
      supplier: resolveSupplierCapability(payload.role, payload.supplier || null),
    }
  }

  function applySession(payload: LegacyAuthSessionPayload) {
    const normalized = normalizeSession(payload)
    role.value = normalized.role
    accessToken.value = normalized.access_token?.trim() ? normalized.access_token : accessToken.value
    platformSecret.value = ""
    apiKey.value = ""
    account.value = normalized.account
    tenant.value = normalized.tenant || null
    membership.value = normalized.membership || null
    subscription.value = normalized.subscription || null
    entitlements.value = normalized.entitlements || null
    availableRoles.value = normalized.available_roles || []
    supplier.value = normalized.supplier || null
    persist()
  }

  function hydrate() {
    const storage = getSafeStorage()
    if (!storage) return
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as {
        role?: AuthRole
        accessToken?: string
        platformSecret?: string
        apiKey?: string
        account?: AccountPayload | null
        tenant?: TenantPayload | null
        membership?: MembershipPayload | null
        subscription?: SubscriptionPayload | null
        entitlements?: EntitlementsPayload | null
        availableRoles?: string[] | null
        supplier?: SupplierCapabilityPayload | null
        activeWorkspace?: "platform" | "erp"
        erpSession?: ErpSessionPayload | null
      }
      // 完整性校验:有 role≠guest 但缺少 accessToken 视为损坏数据,直接清空,
      // 防止 SPA 启动 hydrate 后陷入 guard 循环或 refreshSession 401 误清新会话。
      const storedRole = payload.role || "guest"
      const storedToken = (payload.accessToken || "").trim()
      if (storedRole !== "guest" && !storedToken) {
        storage.removeItem(STORAGE_KEY)
        return
      }
      if (storedRole === "guest" && storedToken) {
        storage.removeItem(STORAGE_KEY)
        return
      }
      role.value = payload.role || "guest"
      accessToken.value = payload.accessToken || ""
      platformSecret.value = payload.platformSecret || ""
      apiKey.value = payload.apiKey || ""
      account.value = payload.account || null
      tenant.value = payload.tenant || null
      membership.value = payload.membership || null
      subscription.value = payload.subscription || null
      availableRoles.value = resolveAvailableRoles(payload.role, payload.availableRoles || null)
      supplier.value = resolveSupplierCapability(payload.role, payload.supplier || null)
      activeWorkspace.value = payload.activeWorkspace === "erp" ? "erp" : "platform"
      erpSession.value = payload.erpSession || null
      entitlements.value = normalizeSession({
        access_token: payload.accessToken || "",
        role: payload.role === "guest" ? "tenant_admin" : (payload.role || "tenant_admin"),
        available_roles: payload.availableRoles || undefined,
        account: payload.account || undefined,
        tenant: payload.tenant || undefined,
        membership: payload.membership || undefined,
        subscription: payload.subscription || undefined,
        entitlements: payload.entitlements || undefined,
        supplier: payload.supplier || undefined,
      }).entitlements || null
    } catch {
      storage.removeItem(STORAGE_KEY)
    }
  }

  const isPlatformAdmin = computed(() => role.value === "platform_admin")
  const isTenantAdmin = computed(() => role.value === "tenant_admin")
  const isAuthenticated = computed(() => role.value !== "guest" && Boolean(accessToken.value.trim()))
  const authSession = computed(() => ({
    role: role.value,
    availableRoles: availableRoles.value,
    supplier: supplier.value,
    account: account.value,
    tenant: tenant.value,
    membership: membership.value,
    subscription: subscription.value,
    entitlements: entitlements.value,
  }))
  const authHeaders = computed<Record<string, string>>(() => {
    const headers: Record<string, string> = {}
    const wordpressApiKey = typeof window === "undefined"
      ? ""
      : String((window as typeof window & { __MOCKUP100_WORDPRESS_API_KEY__?: string }).__MOCKUP100_WORDPRESS_API_KEY__ || "").trim()
    if (wordpressApiKey) {
      headers["x-api-key"] = wordpressApiKey
      return headers
    }
    if (accessToken.value.trim()) {
      headers.Authorization = `Bearer ${accessToken.value.trim()}`
    }
    return headers
  })

  const publishedQuotaLabel = computed(() => {
    const used = entitlements.value?.published_templates_used ?? 0
    return `${used} / Unlimited`
  })
  const cleanupWarning = computed(() => {
    return ""
  })

  const isEmailVerified = computed(() => Boolean(account.value?.email_verified))
  const isEmailVerificationPending = computed(() => Boolean(account.value && !account.value.email_verified))
  const verificationWarning = computed(() => {
    if (!account.value || account.value.email_verified) return ""
    return "Email not verified yet."
  })

  async function refreshSession() {
    const requestedToken = accessToken.value.trim()
    if (!requestedToken) return null
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch<AuthSessionPayload>("/auth/me", {
        headers: { Authorization: `Bearer ${requestedToken}` },
      })
      // 期间若发生过 login(),accessToken 已被新会话覆盖,丢弃这次旧响应,避免覆盖新会话。
      if (accessToken.value.trim() !== requestedToken) {
        return null
      }
      applySession(payload)
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        // 关键:若期间发生过 login(),accessToken 已是新 token,不可基于旧 token 的 401 清空新会话。
        if (accessToken.value.trim() === requestedToken) {
          clearState()
          persist()
        }
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, displayName = "") {
    loading.value = true
    error.value = ""
    try {
      // Basic client-side validation
      if (!email.trim()) {
        throw new Error("Email address is required")
      }
      if (!password.trim()) {
        throw new Error("Password is required")
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long")
      }
      if (!email.includes("@") || !email.includes(".")) {
        throw new Error("Please enter a valid email address")
      }
      
      const payload = await gatewayPlatformFetch<AuthSessionPayload>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, display_name: displayName.trim() }),
      })
      applySession(payload)
      return payload
    } catch (err) {
      const errorMessage = String((err as Error).message || err)
      
      // Provide more user-friendly error messages
      if (errorMessage.includes("pending verification")) {
        error.value = "This email is already registered but still waiting for verification. A new verification email has been sent. Please check your inbox."
      } else if (errorMessage.includes("already registered")) {
        error.value = "This email is already registered. Please log in or reset your password."
      } else if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        error.value = "An account with this email already exists. Please log in instead."
      } else if (errorMessage.includes("invalid") && errorMessage.includes("email")) {
        error.value = "Please enter a valid email address."
      } else if (errorMessage.includes("password") && errorMessage.includes("short")) {
        error.value = "Password must be at least 6 characters long."
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        error.value = "Network error. Please check your connection and try again."
      } else {
        error.value = errorMessage
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      // Basic client-side validation
      if (!email.trim()) {
        throw new Error("Email address is required")
      }
      if (!password.trim()) {
        throw new Error("Password is required")
      }
      if (!email.includes("@") || !email.includes(".")) {
        throw new Error("Please enter a valid email address")
      }
      
      const payload = await gatewayPlatformFetch<AuthSessionPayload>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      applySession(payload)
      return payload
    } catch (err) {
      error.value = resolveLoginErrorMessage(err)
      if (err instanceof ApiRequestError) {
        throw new ApiRequestError({
          status: err.status,
          message: error.value,
          responseCode: err.responseCode,
          errors: err.errors,
          payload: err.payload,
        })
      }
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function enableTrial() {
    if (!accessToken.value.trim()) throw new Error("No active session")
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch<{ subscription: SubscriptionPayload; entitlements: EntitlementsPayload }>("/auth/trial/enable", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken.value.trim()}` },
      })
      subscription.value = payload.subscription
      entitlements.value = normalizeSession({
        access_token: accessToken.value,
        role: role.value === "guest" ? "tenant_admin" : role.value,
        account: account.value || undefined,
        tenant: tenant.value || undefined,
        membership: membership.value || undefined,
        subscription: payload.subscription,
        entitlements: payload.entitlements,
      }).entitlements || null
      persist()
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function sendVerificationEmail() {
    if (!accessToken.value.trim()) throw new Error("No active session")
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch<AuthTokenIssuePayload>("/auth/email/send-verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken.value.trim()}` },
      })
      notice.value = payload.sent
        ? "Verification email has been sent."
        : `Please wait ${Math.max(payload.cooldown_remaining_seconds, 0)} seconds before requesting another email.`
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyEmailToken(token: string) {
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch<EmailVerificationResultPayload>("/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      await refreshSession()
      notice.value = payload.reward_granted
        ? `Email verified. ${payload.reward_tokens} free tokens have been added to your workspace.`
        : "Email verified successfully."
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function forgotPassword(email: string) {
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      await gatewayPlatformFetch("/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      notice.value = "If the account exists, a password reset email has been sent. Please check your inbox and use the newest email to set a new password."
      return
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(token: string, newPassword: string) {
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch("/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      })
      notice.value = "Password reset completed."
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!accessToken.value.trim()) throw new Error("No active session")
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch("/auth/password/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.value.trim()}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      notice.value = "Password changed successfully."
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(displayName: string) {
    if (!accessToken.value.trim()) throw new Error("No active session")
    loading.value = true
    error.value = ""
    notice.value = ""
    try {
      const payload = await gatewayPlatformFetch("/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.value.trim()}`,
        },
        body: JSON.stringify({ display_name: displayName }),
      })
      await refreshSession()
      notice.value = "Profile updated successfully."
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginAsPlatform(secret: string) {
    loading.value = true
    error.value = ""
    try {
      await gatewayPlatformFetch("/platform/template-categories/tree", {
        headers: { "x-platform-secret": secret.trim() },
      })
      clearState()
      role.value = "platform_admin"
      platformSecret.value = secret.trim()
      persist()
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginAsTenant(nextApiKey: string) {
    loading.value = true
    error.value = ""
    try {
      const payload = await gatewayPlatformFetch<TenantPayload>("/platform/tenant", {
        headers: { "x-api-key": nextApiKey.trim() },
      })
      clearState()
      role.value = "tenant_admin"
      apiKey.value = nextApiKey.trim()
      tenant.value = payload
      persist()
      return payload
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      if (erpSession.value) {
        await erpFetch("/auth/sessions/current", {
          method: "DELETE",
        })
      }
      if (accessToken.value.trim()) {
        await gatewayPlatformFetch("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken.value.trim()}` },
        })
      }
    } catch {
    } finally {
      clearState()
      error.value = ""
      notice.value = ""
      persist()
    }
  }

  async function enterErpSession() {
    if (!accessToken.value.trim()) {
      throw new Error("No active platform session")
    }
    const ticket = await gatewayPlatformFetch<ErpTicketPayload>("/auth/erp/tickets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken.value.trim()}` },
    })
    const session = await erpFetch<ErpSessionPayload>("/auth/sso/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: ticket.ticket }),
    })
    erpSession.value = session
    activeWorkspace.value = "erp"
    persist()
    return session
  }

  async function leaveErpSession() {
    try {
      if (erpSession.value) {
        await erpFetch("/auth/sessions/current", {
          method: "DELETE",
        })
      }
    } finally {
      erpSession.value = null
      activeWorkspace.value = "platform"
      persist()
    }
  }

  return {
    role,
    accessToken,
    platformSecret,
    apiKey,
    account,
    tenant,
    membership,
    subscription,
    entitlements,
    availableRoles,
    supplier,
    activeWorkspace,
    erpSession,
    loading,
    error,
    notice,
    authSession,
    isAuthenticated,
    isPlatformAdmin,
    isTenantAdmin,
    authHeaders,
    publishedQuotaLabel,
    cleanupWarning,
    isEmailVerified,
    isEmailVerificationPending,
    verificationWarning,
    hydrate,
    refreshSession,
    register,
    login,
    enableTrial,
    sendVerificationEmail,
    verifyEmailToken,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    updateSupplierCapability,
    loginAsPlatform,
    loginAsTenant,
    enterErpSession,
    leaveErpSession,
    logout,
  }
})
