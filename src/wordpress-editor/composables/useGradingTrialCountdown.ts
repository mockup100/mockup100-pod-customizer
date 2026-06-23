import { computed } from "vue"
import { useUserCapabilities } from "./useUserCapabilities"

// Plan v5 §C.5：Grading 30-day trial 倒计时。
//
// 仅在 grading_is_trial=true && trial_ends_at != null 时返回有效 daysRemaining；
// 否则返回 null（前端据此决定是否渲染 "Trial · 还剩 N 天" chip）。

export function useGradingTrialCountdown() {
  const { gradingIsTrial, gradingTrialEndsAt } = useUserCapabilities()

  const daysRemaining = computed<number | null>(() => {
    if (!gradingIsTrial.value || !gradingTrialEndsAt.value) return null
    const ms = new Date(gradingTrialEndsAt.value).getTime() - Date.now()
    return Math.max(0, Math.ceil(ms / 86_400_000))
  })

  const isExpired = computed<boolean>(() => {
    if (!gradingTrialEndsAt.value) return false
    return new Date(gradingTrialEndsAt.value).getTime() < Date.now()
  })

  return { daysRemaining, isExpired, gradingIsTrial, gradingTrialEndsAt }
}
