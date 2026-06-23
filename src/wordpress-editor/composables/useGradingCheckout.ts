import { gatewayPlatformFetch } from "../api/client"
import { useAuthStore } from "../stores/auth"
import { fetchUserCapabilities } from "./useUserCapabilities"

// Plan v5 §C.1：Grading 月订阅 PayPal Subscriptions 收银 composable。
//
// 与 Token Pack 一次性 Checkout（Smart Buttons）不同，订阅走 approve URL 重定向流程：
//   1. createSubscription → 后端调 PayPal 创建 Subscription（PENDING） → 返回 approveUrl
//   2. window.location.href = approveUrl → PayPal 站点完成审批 → 重定向回 /grading/return?subscription_id=...&ba_token=...
//   3. /grading/return 路由调 activate → 后端拉 PayPal 状态 ACTIVE → 写本地 ACTIVE → 失效 capabilities cache
//
// 鉴权：必须登录态；未登录请先跳 /auth?mode=register&redirect=/admin/subscriptions-licensing?tab=grading。

export type GradingTier = "standard" | "enterprise"

type CreateSubscriptionResponse = {
  subscriptionId: string
  approveUrl: string
  planId: string
  tier: GradingTier
}

type ActivateResponse = {
  subscriptionId: string
  status: string
  tier: GradingTier
  currentPeriodEnd: string | null
}

export function useGradingCheckout() {
  const authStore = useAuthStore()

  async function startCheckout(tier: GradingTier): Promise<void> {
    if (!authStore.isAuthenticated) {
      const redirect = encodeURIComponent("/admin/subscriptions-licensing?tab=grading")
      window.location.href = `/auth?mode=register&redirect=${redirect}`
      return
    }
    const resp = await gatewayPlatformFetch<CreateSubscriptionResponse>(
      "/payments/paypal/grading/create-subscription",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authStore.authHeaders },
        body: JSON.stringify({ tier }),
      },
    )
    if (!resp?.approveUrl) {
      throw new Error("PayPal 未返回 approveUrl")
    }
    window.location.href = resp.approveUrl
  }

  async function activate(subscriptionId: string): Promise<ActivateResponse> {
    const resp = await gatewayPlatformFetch<ActivateResponse>(
      "/payments/paypal/grading/activate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authStore.authHeaders },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      },
    )
    await fetchUserCapabilities()
    return resp
  }

  async function cancel(subscriptionId: string, reason?: string): Promise<ActivateResponse> {
    const resp = await gatewayPlatformFetch<ActivateResponse>(
      "/payments/paypal/grading/cancel",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authStore.authHeaders },
        body: JSON.stringify({ subscription_id: subscriptionId, reason: reason ?? "" }),
      },
    )
    await fetchUserCapabilities()
    return resp
  }

  return { startCheckout, activate, cancel }
}
