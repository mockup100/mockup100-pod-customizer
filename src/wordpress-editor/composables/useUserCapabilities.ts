import { computed, ref } from "vue"
import { gatewayPlatformFetch } from "../api/client"
import { useAuthStore } from "../stores/auth"

// Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Permission Tri-flag Isolation
// (Tasks 2.1 / 2.2). Each capability is a single independent flag and gates ONE product line.
// `platform_grading_sub_tier` MUST never be inferred from token balance or wp pro license.

export type GradingTier = "none" | "standard" | "enterprise"

export type UserCapabilities = {
  wp_pro_active: boolean
  platform_grading_sub_tier: GradingTier
  token_balance: number
  // Plan v2 §S1.5：Grading 30-day trial 元信息
  grading_is_trial: boolean
  grading_trial_ends_at: string | null
  grading_has_used_trial: boolean
}

const STUB_CAPABILITIES: UserCapabilities = {
  wp_pro_active: false,
  platform_grading_sub_tier: "none",
  token_balance: 0,
  grading_is_trial: false,
  grading_trial_ends_at: null,
  grading_has_used_trial: false,
}

const capabilities = ref<UserCapabilities>(STUB_CAPABILITIES)
const loading = ref(false)
const error = ref("")
let inflight: Promise<UserCapabilities> | null = null

export async function fetchUserCapabilities(): Promise<UserCapabilities> {
  if (inflight) return inflight
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    capabilities.value = { ...STUB_CAPABILITIES }
    return capabilities.value
  }
  loading.value = true
  error.value = ""
  inflight = (async () => {
    try {
      // 通过 buildGatewayPlatformPath 白名单映射到真实 /api/v1/api/user/capabilities。
      // 后端 UserCapabilityController 注册 @RequestMapping("/api/user")，叠加 Spring
      // server.servlet.context-path=/api/v1，真实公网路径含双 /api。这里只保留语义化
      // /user/capabilities，由 client.ts 的网关白名单完成实际拼装。
      //
      // 鉴权：本前端登录态使用 Bearer access_token（不是 Cookie），所以必须显式注入
      // authStore.authHeaders（含 Authorization: Bearer ...）；否则后端
      // UserCapabilityController.requireSession 拿不到 token → 401 → catch null →
      // token_balance 兜底 0。
      const payload = await gatewayPlatformFetch<Partial<UserCapabilities> & {
        wpProActive?: boolean
        platformGradingSubTier?: string
        tokenBalance?: number
        gradingIsTrial?: boolean | null
        gradingTrialEndsAt?: string | null
        gradingHasUsedTrial?: boolean | null
      }>("/user/capabilities", {
        headers: { ...authStore.authHeaders },
      }).catch(() => null)
      if (payload) {
        // 后端 UserCapabilitySnapshot record 未声明 @JsonProperty，Jackson 默认输出驼峰
        // (tokenBalance / wpProActive / platformGradingSubTier)，而 spec 与本前端类型用蛇形。
        // 这里两种命名都兼容，避免后续后端补 @JsonProperty 后再次破坏；snake_case 优先（spec 名）。
        const next: UserCapabilities = {
          wp_pro_active: Boolean(payload.wp_pro_active ?? payload.wpProActive),
          platform_grading_sub_tier: normalizeTier(
            payload.platform_grading_sub_tier ?? payload.platformGradingSubTier
          ),
          token_balance: Number(payload.token_balance ?? payload.tokenBalance ?? 0),
          grading_is_trial: Boolean(payload.grading_is_trial ?? payload.gradingIsTrial ?? false),
          grading_trial_ends_at:
            (payload.grading_trial_ends_at ?? payload.gradingTrialEndsAt ?? null) as string | null,
          grading_has_used_trial: Boolean(
            payload.grading_has_used_trial ?? payload.gradingHasUsedTrial ?? false
          ),
        }
        capabilities.value = next
        return next
      }
      const fallback: UserCapabilities = {
        wp_pro_active: false,
        platform_grading_sub_tier: "none",
        token_balance: Number(authStore.entitlements?.token_balance ?? 0),
        grading_is_trial: false,
        grading_trial_ends_at: null,
        grading_has_used_trial: false,
      }
      capabilities.value = fallback
      return fallback
    } catch (err) {
      error.value = String((err as Error)?.message || err)
      const fallback: UserCapabilities = {
        wp_pro_active: false,
        platform_grading_sub_tier: "none",
        token_balance: Number(authStore.entitlements?.token_balance ?? 0),
        grading_is_trial: false,
        grading_trial_ends_at: null,
        grading_has_used_trial: false,
      }
      capabilities.value = fallback
      return fallback
    } finally {
      loading.value = false
      inflight = null
    }
  })()
  return inflight
}

function normalizeTier(value: unknown): GradingTier {
  if (value === "standard" || value === "enterprise") return value
  return "none"
}

export function useUserCapabilities() {
  // Source of Truth: spec lock-mockup100-final-pricing-products-scheme Task 7.4 —
  // 双端关闭入口。`gradingTier` / `hasGradingSubscription` 用于驱动 grading 按钮组件
  // 上的 `:disabled="gradingTier === 'none'"`，按钮点击时父组件应弹出
  // `GradingSubscriptionGateModal` 引导订阅（不交叉推销 Token / WP Pro）。
  const gradingTier = computed<GradingTier>(() => capabilities.value.platform_grading_sub_tier)
  const hasGradingSubscription = computed(() => gradingTier.value !== "none")
  // Source of Truth: spec consolidate-pod-editor-four-product-matrix Task 4.3 —
  // 三维独立 capability ref。禁止合并成单一 paid flag；任一弹窗只能引导其对应的缺失维度。
  const wpProActive = computed<boolean>(() => Boolean(capabilities.value.wp_pro_active))
  const gradingActive = computed<boolean>(() => capabilities.value.platform_grading_sub_tier !== "none")
  const tokenBalance = computed<number>(() => Number(capabilities.value.token_balance ?? 0))
  // Plan v2 §S1.5：30-day trial 元信息暴露给 GateModal / RepositoryPreviewPage。
  const gradingIsTrial = computed<boolean>(() => Boolean(capabilities.value.grading_is_trial))
  const gradingTrialEndsAt = computed<string | null>(
    () => capabilities.value.grading_trial_ends_at ?? null,
  )
  const hasUsedGradingTrial = computed<boolean>(
    () => Boolean(capabilities.value.grading_has_used_trial),
  )
  return {
    capabilities,
    loading,
    error,
    gradingTier,
    hasGradingSubscription,
    wpProActive,
    gradingActive,
    tokenBalance,
    gradingIsTrial,
    gradingTrialEndsAt,
    hasUsedGradingTrial,
    fetchUserCapabilities,
  }
}
