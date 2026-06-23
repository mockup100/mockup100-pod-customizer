import { erpFetch } from "../../api/client"
import type {
  ErpProductReviewDecisionPayload,
  ErpProductReviewQueueView,
  ErpReviewStatusOption,
  ErpSupplierReviewDetail,
  ErpSupplierReviewListView,
  ErpSupplierReviewMetrics,
  ErpSupplierReviewSummary,
  ErpSupplierReviewProfile,
  ErpSupplierReviewRound,
  ErpSupplierReviewActivityLog,
  ErpSupplierLatestReviewRecord,
  ErpSupplierProgressNode,
} from "../types"
import type { ErpProductDetail } from "../types/product"

function pickValue<T>(...values: Array<T | null | undefined>) {
  return values.find((value) => value !== undefined && value !== null)
}

function normalizeStatusOptions(value: unknown): ErpReviewStatusOption[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const source = (item || {}) as Record<string, any>
    return {
      value: String(pickValue(source.value, source.key) || ""),
      label: String(pickValue(source.label, source.name, source.value, source.key) || ""),
    }
  })
}

function normalizeMetrics(value: unknown): ErpSupplierReviewMetrics {
  const source = (value || {}) as Record<string, any>
  return {
    totalCount: Number(pickValue(source.totalCount, source.total_count) || 0),
    pendingCount: Number(pickValue(source.pendingCount, source.pending_count) || 0),
    approvedCount: Number(pickValue(source.approvedCount, source.approved_count) || 0),
    rejectedCount: Number(pickValue(source.rejectedCount, source.rejected_count) || 0),
  }
}

function normalizeProfile(profile?: Record<string, any> | null): ErpSupplierReviewProfile {
  const source = profile || {}
  return {
    companyName: String(pickValue(source.companyName, source.company_name) || ""),
    companyType: String(pickValue(source.companyType, source.company_type) || ""),
    contactName: String(pickValue(source.contactName, source.contact_name) || ""),
    contactEmail: String(pickValue(source.contactEmail, source.contact_email) || ""),
    contactPhone: String(pickValue(source.contactPhone, source.contact_phone) || ""),
    countryCode: String(pickValue(source.countryCode, source.country_code) || ""),
    city: String(pickValue(source.city) || ""),
    addressLine1: String(pickValue(source.addressLine1, source.address_line1) || ""),
    addressLine2: String(pickValue(source.addressLine2, source.address_line2) || ""),
    businessLicenseNo: String(pickValue(source.businessLicenseNo, source.business_license_no) || ""),
    websiteUrl: String(pickValue(source.websiteUrl, source.website_url) || ""),
    businessScope: String(pickValue(source.businessScope, source.business_scope) || ""),
    draftSavedAt: (pickValue(source.draftSavedAt, source.draft_saved_at) as string | null | undefined) || null,
  }
}

function normalizeSummary(summary?: Record<string, any> | null): ErpSupplierReviewSummary {
  const source = summary || {}
  return {
    applicationId: String(pickValue(source.applicationId, source.application_id) || ""),
    tenantId: String(pickValue(source.tenantId, source.tenant_id) || ""),
    accountId: String(pickValue(source.accountId, source.account_id) || ""),
    companyName: String(pickValue(source.companyName, source.company_name) || ""),
    companyType: String(pickValue(source.companyType, source.company_type) || ""),
    contactName: String(pickValue(source.contactName, source.contact_name) || ""),
    contactEmail: String(pickValue(source.contactEmail, source.contact_email) || ""),
    applicationStatus: String(pickValue(source.applicationStatus, source.application_status) || ""),
    applicationStatusLabel: String(pickValue(source.applicationStatusLabel, source.application_status_label) || ""),
    reviewStatus: String(pickValue(source.reviewStatus, source.review_status) || ""),
    reviewStatusLabel: String(pickValue(source.reviewStatusLabel, source.review_status_label) || ""),
    currentStatus: String(pickValue(source.currentStatus, source.current_status) || ""),
    currentStatusLabel: String(pickValue(source.currentStatusLabel, source.current_status_label) || ""),
    currentRound: Number(pickValue(source.currentRound, source.current_round) || 0),
    latestReviewNote: (pickValue(source.latestReviewNote, source.latest_review_note) as string | null | undefined) ?? null,
    lastSubmittedAt: (pickValue(source.lastSubmittedAt, source.last_submitted_at) as string | null | undefined) ?? null,
    lastReviewedAt: (pickValue(source.lastReviewedAt, source.last_reviewed_at) as string | null | undefined) ?? null,
    rejectionReason: (pickValue(source.rejectionReason, source.rejection_reason) as string | null | undefined) ?? null,
    updatedAt: (pickValue(source.updatedAt, source.updated_at) as string | null | undefined) ?? null,
  }
}

function normalizeRound(round?: Record<string, any> | null): ErpSupplierReviewRound {
  const source = round || {}
  return {
    round: Number(pickValue(source.round) || 0),
    action: String(pickValue(source.action) || ""),
    actionLabel: String(pickValue(source.actionLabel, source.action_label) || ""),
    applicationStatus: String(pickValue(source.applicationStatus, source.application_status) || ""),
    reviewStatus: String(pickValue(source.reviewStatus, source.review_status) || ""),
    submittedAt: (pickValue(source.submittedAt, source.submitted_at) as string | null | undefined) ?? null,
    reviewNote: (pickValue(source.reviewNote, source.review_note) as string | null | undefined) ?? null,
    submittedProfile: source.submitted_profile || source.submittedProfile ? normalizeProfile(pickValue(source.submittedProfile, source.submitted_profile) as Record<string, any> | null | undefined) : null,
  }
}

function normalizeActivityLog(log?: Record<string, any> | null): ErpSupplierReviewActivityLog {
  const source = log || {}
  return {
    logId: String(pickValue(source.logId, source.log_id) || ""),
    action: String(pickValue(source.action) || ""),
    actionLabel: String(pickValue(source.actionLabel, source.action_label) || ""),
    description: String(pickValue(source.description) || ""),
    round: (pickValue(source.round) as number | null | undefined) ?? null,
    createdAt: (pickValue(source.createdAt, source.created_at) as string | null | undefined) ?? null,
    operatorAccountId: (pickValue(source.operatorAccountId, source.operator_account_id) as string | null | undefined) ?? null,
    operatorDisplayName: (pickValue(source.operatorDisplayName, source.operator_display_name) as string | null | undefined) ?? null,
    operatorEmail: (pickValue(source.operatorEmail, source.operator_email) as string | null | undefined) ?? null,
  }
}

function normalizeLatestReviewRecord(value?: Record<string, any> | null): ErpSupplierLatestReviewRecord | null {
  if (!value) return null
  const source = value || {}
  return {
    action: String(pickValue(source.action) || ""),
    actionLabel: String(pickValue(source.actionLabel, source.action_label) || ""),
    resultStatus: String(pickValue(source.resultStatus, source.result_status) || ""),
    resultStatusLabel: String(pickValue(source.resultStatusLabel, source.result_status_label) || ""),
    round: (pickValue(source.round) as number | null | undefined) ?? null,
    note: (pickValue(source.note) as string | null | undefined) ?? null,
    occurredAt: (pickValue(source.occurredAt, source.occurred_at) as string | null | undefined) ?? null,
    reviewerAccountId: (pickValue(source.reviewerAccountId, source.reviewer_account_id) as string | null | undefined) ?? null,
    reviewerDisplayName: (pickValue(source.reviewerDisplayName, source.reviewer_display_name) as string | null | undefined) ?? null,
    reviewerEmail: (pickValue(source.reviewerEmail, source.reviewer_email) as string | null | undefined) ?? null,
  }
}

function normalizeProgressNodes(value: unknown): ErpSupplierProgressNode[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const source = (item || {}) as Record<string, any>
    return {
      key: String(pickValue(source.key) || ""),
      label: String(pickValue(source.label) || ""),
      status: String(pickValue(source.status) || "pending"),
      statusLabel: String(pickValue(source.statusLabel, source.status_label) || ""),
      description: String(pickValue(source.description) || ""),
    }
  })
}

function normalizeSupplierReviewListView(value: any): ErpSupplierReviewListView {
  const source = (value || {}) as Record<string, any>
  return {
    items: Array.isArray(source.items) ? source.items.map((item: any) => normalizeSummary(item)) : [],
    metrics: normalizeMetrics(source.metrics),
    applicationStatuses: normalizeStatusOptions(source.applicationStatuses ?? source.application_statuses),
    reviewStatuses: normalizeStatusOptions(source.reviewStatuses ?? source.review_statuses),
  }
}

function normalizeSupplierReviewDetail(value: any): ErpSupplierReviewDetail {
  const source = (value || {}) as Record<string, any>
  return {
    summary: normalizeSummary(pickValue(source.summary) as Record<string, any> | null | undefined),
    profile: normalizeProfile(pickValue(source.profile) as Record<string, any> | null | undefined),
    submissionRounds: Array.isArray(source.submissionRounds ?? source.submission_rounds)
      ? (pickValue(source.submissionRounds, source.submission_rounds) as any[]).map((item) => normalizeRound(item))
      : [],
    activityLogs: Array.isArray(source.activityLogs ?? source.activity_logs)
      ? (pickValue(source.activityLogs, source.activity_logs) as any[]).map((item) => normalizeActivityLog(item))
      : [],
    latestReviewRecord: normalizeLatestReviewRecord(pickValue(source.latestReviewRecord, source.latest_review_record) as Record<string, any> | null | undefined),
    progressNodes: normalizeProgressNodes(pickValue(source.progressNodes, source.progress_nodes)),
  }
}

export async function fetchErpSupplierReviews(filters?: {
  keyword?: string
  applicationStatus?: string
  reviewStatus?: string
}) {
  const response = await erpFetch<ErpSupplierReviewListView>(withQuery("/supplier/reviews", filters, { includeAll: true }))
  return normalizeSupplierReviewListView(response as any)
}

export async function fetchErpSupplierReviewDetail(applicationId: string) {
  const detail = await erpFetch<ErpSupplierReviewDetail>(`/supplier/reviews/${applicationId}`)
  return normalizeSupplierReviewDetail(detail as any)
}

export async function reviewErpSupplierApplication(applicationId: string, payload: {
  decision: "approve" | "reject"
  reviewReason: string
}) {
  const detail = await erpFetch<ErpSupplierReviewDetail>(`/supplier/reviews/${applicationId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return normalizeSupplierReviewDetail(detail as any)
}

export async function fetchErpProductReviewQueue(filters?: {
  keyword?: string
  reviewStatus?: string
  listingStatus?: string
}) {
  return erpFetch<ErpProductReviewQueueView>(withQuery("/products/review-queue", filters))
}

export async function reviewErpQueuedProduct(productId: string, payload: ErpProductReviewDecisionPayload) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

function withQuery(
  path: string,
  filters?: Record<string, string | undefined>,
  options?: { includeAll?: boolean },
) {
  const query = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value && (options?.includeAll || value !== "all")) {
      query.set(key, value)
    }
  })
  const queryString = query.toString()
  return queryString ? `${path}?${queryString}` : path
}
