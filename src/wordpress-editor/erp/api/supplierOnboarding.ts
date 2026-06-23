import { erpFetch } from "../../api/client"
import type { ErpSupplierOnboardingDetail, ErpSupplierOnboardingSaveRequest } from "../types"

function pickValue<T>(...values: Array<T | null | undefined>) {
  return values.find((value) => value !== undefined && value !== null)
}

function normalizeProfile(profile?: Record<string, any> | null) {
  const source = profile || {}
  return {
    companyName: pickValue(source.companyName, source.company_name) || "",
    companyType: pickValue(source.companyType, source.company_type) || "",
    contactName: pickValue(source.contactName, source.contact_name) || "",
    contactEmail: pickValue(source.contactEmail, source.contact_email) || "",
    contactPhone: pickValue(source.contactPhone, source.contact_phone) || "",
    countryCode: pickValue(source.countryCode, source.country_code) || "",
    city: pickValue(source.city) || "",
    addressLine1: pickValue(source.addressLine1, source.address_line1) || "",
    addressLine2: pickValue(source.addressLine2, source.address_line2) || "",
    businessLicenseNo: pickValue(source.businessLicenseNo, source.business_license_no) || "",
    websiteUrl: pickValue(source.websiteUrl, source.website_url) || "",
    businessScope: pickValue(source.businessScope, source.business_scope) || "",
    draftSavedAt: pickValue(source.draftSavedAt, source.draft_saved_at) || null,
  }
}

function normalizeSupplierOnboardingDetail(detail?: Partial<ErpSupplierOnboardingDetail> | null): ErpSupplierOnboardingDetail {
  const source = (detail || {}) as Record<string, any>
  const profile = (pickValue(source.profile) || {}) as Record<string, any>
  const application = (pickValue(source.application) || {}) as Record<string, any>
  const submissionRounds = pickValue(source.submissionRounds, source.submission_rounds)
  const activityLogs = pickValue(source.activityLogs, source.activity_logs)
  const latestReviewRecord = pickValue(source.latestReviewRecord, source.latest_review_record)
  const progressNodes = pickValue(source.progressNodes, source.progress_nodes)

  return {
    profile: normalizeProfile(profile),
    application: {
      applicationStatus: pickValue(application.applicationStatus, application.application_status) || "not_applied",
      applicationStatusLabel: pickValue(application.applicationStatusLabel, application.application_status_label) || "Not Applied",
      reviewStatus: pickValue(application.reviewStatus, application.review_status) || "not_started",
      reviewStatusLabel: pickValue(application.reviewStatusLabel, application.review_status_label) || "Not Started",
      currentStatus: pickValue(application.currentStatus, application.current_status, application.applicationStatus, application.application_status) || "not_applied",
      currentStatusLabel: pickValue(application.currentStatusLabel, application.current_status_label, application.applicationStatusLabel, application.application_status_label) || "Not Applied",
      canSubmit: Boolean(pickValue(application.canSubmit, application.can_submit)),
      currentRound: Number(pickValue(application.currentRound, application.current_round) || 0),
      latestReviewNote: pickValue(application.latestReviewNote, application.latest_review_note) || null,
      lastSubmittedAt: pickValue(application.lastSubmittedAt, application.last_submitted_at) || null,
      lastReviewedAt: pickValue(application.lastReviewedAt, application.last_reviewed_at) || null,
      rejectionReason: pickValue(application.rejectionReason, application.rejection_reason) || null,
    },
    submissionRounds: Array.isArray(submissionRounds)
      ? submissionRounds.map((item) => {
        const row = item as Record<string, any>
        return {
          round: Number(pickValue(row.round) || 0),
          action: pickValue(row.action) || "",
          actionLabel: pickValue(row.actionLabel, row.action_label) || "",
          applicationStatus: pickValue(row.applicationStatus, row.application_status) || "",
          reviewStatus: pickValue(row.reviewStatus, row.review_status) || "",
          submittedAt: pickValue(row.submittedAt, row.submitted_at) || null,
          reviewNote: pickValue(row.reviewNote, row.review_note) || null,
          submittedProfile: normalizeProfile(pickValue(row.submittedProfile, row.submitted_profile) as Record<string, any> | null | undefined),
        }
      })
      : [],
    activityLogs: Array.isArray(activityLogs)
      ? activityLogs.map((item) => {
        const row = item as Record<string, any>
        return {
          logId: pickValue(row.logId, row.log_id) || "",
          action: pickValue(row.action) || "",
          actionLabel: pickValue(row.actionLabel, row.action_label) || "",
          description: pickValue(row.description) || "",
          round: pickValue(row.round),
          createdAt: pickValue(row.createdAt, row.created_at) || null,
          operatorAccountId: pickValue(row.operatorAccountId, row.operator_account_id) || null,
          operatorDisplayName: pickValue(row.operatorDisplayName, row.operator_display_name) || null,
          operatorEmail: pickValue(row.operatorEmail, row.operator_email) || null,
        }
      })
      : [],
    latestReviewRecord: latestReviewRecord
      ? {
        action: pickValue((latestReviewRecord as Record<string, any>).action) || "",
        actionLabel: pickValue((latestReviewRecord as Record<string, any>).actionLabel, (latestReviewRecord as Record<string, any>).action_label) || "",
        resultStatus: pickValue((latestReviewRecord as Record<string, any>).resultStatus, (latestReviewRecord as Record<string, any>).result_status) || "",
        resultStatusLabel: pickValue((latestReviewRecord as Record<string, any>).resultStatusLabel, (latestReviewRecord as Record<string, any>).result_status_label) || "",
        round: pickValue((latestReviewRecord as Record<string, any>).round),
        note: pickValue((latestReviewRecord as Record<string, any>).note) || null,
        occurredAt: pickValue((latestReviewRecord as Record<string, any>).occurredAt, (latestReviewRecord as Record<string, any>).occurred_at) || null,
        reviewerAccountId: pickValue((latestReviewRecord as Record<string, any>).reviewerAccountId, (latestReviewRecord as Record<string, any>).reviewer_account_id) || null,
        reviewerDisplayName: pickValue((latestReviewRecord as Record<string, any>).reviewerDisplayName, (latestReviewRecord as Record<string, any>).reviewer_display_name) || null,
        reviewerEmail: pickValue((latestReviewRecord as Record<string, any>).reviewerEmail, (latestReviewRecord as Record<string, any>).reviewer_email) || null,
      }
      : null,
    progressNodes: Array.isArray(progressNodes)
      ? progressNodes.map((item) => {
        const row = item as Record<string, any>
        return {
          key: pickValue(row.key) || "",
          label: pickValue(row.label) || "",
          status: pickValue(row.status) || "",
          statusLabel: pickValue(row.statusLabel, row.status_label) || "",
          description: pickValue(row.description) || "",
        }
      })
      : [],
  }
}

export async function fetchErpSupplierOnboarding() {
  const detail = await erpFetch<ErpSupplierOnboardingDetail>("/supplier/onboarding")
  return normalizeSupplierOnboardingDetail(detail)
}

export async function saveErpSupplierOnboardingProfile(payload: ErpSupplierOnboardingSaveRequest) {
  const detail = await erpFetch<ErpSupplierOnboardingDetail>("/supplier/onboarding/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return normalizeSupplierOnboardingDetail(detail)
}

export async function deleteErpSupplierOnboardingDraft() {
  const detail = await erpFetch<ErpSupplierOnboardingDetail>("/supplier/onboarding/profile", {
    method: "DELETE",
  })
  return normalizeSupplierOnboardingDetail(detail)
}

export async function submitErpSupplierOnboardingApplication() {
  const detail = await erpFetch<ErpSupplierOnboardingDetail>("/supplier/onboarding/submit", {
    method: "POST",
  })
  return normalizeSupplierOnboardingDetail(detail)
}
