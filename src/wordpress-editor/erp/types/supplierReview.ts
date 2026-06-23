import type { ErpProductDetail, ErpProductSummary } from "./product"
import type {
  ErpSupplierLatestReviewRecord,
  ErpSupplierProgressNode,
  ErpSupplierOnboardingActivityLog,
  ErpSupplierOnboardingProfile,
  ErpSupplierOnboardingRound,
} from "./supplierOnboarding"

export type ErpReviewStatusOption = {
  value: string
  label: string
}

export type ErpSupplierReviewMetrics = {
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

export type ErpSupplierReviewSummary = {
  applicationId: string
  tenantId: string
  accountId: string
  companyName?: string
  companyType?: string
  contactName?: string
  contactEmail?: string
  applicationStatus: string
  applicationStatusLabel: string
  reviewStatus: string
  reviewStatusLabel: string
  currentStatus: string
  currentStatusLabel: string
  currentRound: number
  latestReviewNote?: string | null
  lastSubmittedAt?: string | null
  lastReviewedAt?: string | null
  rejectionReason?: string | null
  updatedAt?: string | null
}

export type ErpSupplierReviewProfile = ErpSupplierOnboardingProfile
export type ErpSupplierReviewRound = ErpSupplierOnboardingRound
export type ErpSupplierReviewActivityLog = ErpSupplierOnboardingActivityLog

export type ErpSupplierReviewListView = {
  items: ErpSupplierReviewSummary[]
  metrics: ErpSupplierReviewMetrics
  applicationStatuses: ErpReviewStatusOption[]
  reviewStatuses: ErpReviewStatusOption[]
}

export type ErpSupplierReviewDetail = {
  summary: ErpSupplierReviewSummary
  profile: ErpSupplierReviewProfile
  submissionRounds: ErpSupplierReviewRound[]
  activityLogs: ErpSupplierReviewActivityLog[]
  latestReviewRecord?: ErpSupplierLatestReviewRecord | null
  progressNodes: ErpSupplierProgressNode[]
}

export type ErpProductReviewQueueView = {
  items: ErpProductSummary[]
  metrics: ErpSupplierReviewMetrics
  reviewStatuses: ErpReviewStatusOption[]
  listingStatuses: ErpReviewStatusOption[]
}

export type ErpProductReviewDecisionPayload = {
  decision: "approve" | "reject"
  reviewNote: string
}

export type ErpProductReviewDetail = ErpProductDetail
