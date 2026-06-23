export type ErpSupplierOnboardingProfile = {
  companyName?: string
  companyType?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  countryCode?: string
  city?: string
  addressLine1?: string
  addressLine2?: string
  businessLicenseNo?: string
  websiteUrl?: string
  businessScope?: string
  draftSavedAt?: string | null
}

export type ErpSupplierOnboardingSaveRequest = {
  companyName?: string
  companyType?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  countryCode?: string
  city?: string
  addressLine1?: string
  addressLine2?: string
  businessLicenseNo?: string
  websiteUrl?: string
  businessScope?: string
}

export type ErpSupplierLatestReviewRecord = {
  action: string
  actionLabel: string
  resultStatus: string
  resultStatusLabel: string
  round?: number | null
  note?: string | null
  occurredAt?: string | null
  reviewerAccountId?: string | null
  reviewerDisplayName?: string | null
  reviewerEmail?: string | null
}

export type ErpSupplierProgressNode = {
  key: string
  label: string
  status: "pending" | "current" | "completed" | string
  statusLabel: string
  description: string
}

export type ErpSupplierOnboardingApplication = {
  applicationStatus: string
  applicationStatusLabel: string
  reviewStatus: string
  reviewStatusLabel: string
  currentStatus: string
  currentStatusLabel: string
  canSubmit: boolean
  currentRound: number
  latestReviewNote?: string | null
  lastSubmittedAt?: string | null
  lastReviewedAt?: string | null
  rejectionReason?: string | null
}

export type ErpSupplierOnboardingRound = {
  round: number
  action: string
  actionLabel: string
  applicationStatus: string
  reviewStatus: string
  submittedAt?: string | null
  reviewNote?: string | null
  submittedProfile?: ErpSupplierOnboardingProfile | null
}

export type ErpSupplierOnboardingActivityLog = {
  logId: string
  action: string
  actionLabel: string
  description: string
  round?: number | null
  createdAt?: string | null
  operatorAccountId?: string | null
  operatorDisplayName?: string | null
  operatorEmail?: string | null
}

export type ErpSupplierOnboardingDetail = {
  profile: ErpSupplierOnboardingProfile
  application: ErpSupplierOnboardingApplication
  submissionRounds: ErpSupplierOnboardingRound[]
  activityLogs: ErpSupplierOnboardingActivityLog[]
  latestReviewRecord?: ErpSupplierLatestReviewRecord | null
  progressNodes: ErpSupplierProgressNode[]
}
