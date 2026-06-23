import type { TemplateSummary } from "../../api/client"
import type { TemplateCenterListing, TemplateSubmissionItem } from "../../stores/platform"

export const CENTER_REVIEW_ACTIONS: Record<string, string[]> = {
  submitted: ["start_review", "rejected"],
  under_review: ["changes_requested", "approved", "rejected"],
  changes_requested: [],
  approved: [],
  rejected: [],
}

export function canReviewSubmission(status: string, decision: string): boolean {
  return (CENTER_REVIEW_ACTIONS[status] || []).includes(decision)
}

export function resolveTemplateSummary(
  templateId: string,
  templates: TemplateSummary[],
): TemplateSummary | null {
  return templates.find((item) => item.template_id === templateId) || null
}

export function resolveTemplateName(
  templateId: string,
  templates: TemplateSummary[],
  fallback = "",
): string {
  return resolveTemplateSummary(templateId, templates)?.display_name || fallback || templateId
}

export function resolveTemplateCategory(
  input: { category_path?: string; template_id: string },
  templates: TemplateSummary[],
): string {
  if (input.category_path) return input.category_path
  return resolveTemplateSummary(input.template_id, templates)?.category_path || "Uncategorized"
}

export function formatMarketplaceCreatorName(name?: string | null): string {
  const normalized = String(name || "").trim()
  if (!normalized) return ""
  return normalized.replace(/\s+Workspace$/i, "").trim()
}

export function getListedMarketplaceTemplates(listings: TemplateCenterListing[]): TemplateCenterListing[] {
  return listings.filter((item) => {
    const marketplaceStatus = String((item as TemplateCenterListing & { marketplace_status?: string }).marketplace_status || "")
    if (marketplaceStatus) return marketplaceStatus === "listed"
    const legacyStatus = (item as TemplateCenterListing & { status?: string }).status
    return legacyStatus === "published" || !legacyStatus
  })
}

function getActiveRepositorySubmissions(submissions: TemplateSubmissionItem[]): TemplateSubmissionItem[] {
  return submissions.filter((item) => item.is_active_for_repository !== false)
}

export function buildCenterStats(
  submissions: TemplateSubmissionItem[],
  listings: TemplateCenterListing[],
  options?: {
    ownerTenantId?: string
    resolveListingOwnerId?: (templateId: string) => string
  },
) {
  const activeSubmissions = getActiveRepositorySubmissions(submissions)
  const ownerTenantId = String(options?.ownerTenantId || "").trim()
  const scopedSubmissions = ownerTenantId
    ? activeSubmissions.filter((item) => item.tenant_id === ownerTenantId)
    : activeSubmissions
  const listed = getListedMarketplaceTemplates(listings)
  const scopedListed = ownerTenantId
    ? listed.filter((item) => {
        const directTenantId = String((item as TemplateCenterListing & { tenant_id?: string }).tenant_id || "").trim()
        const resolvedTenantId = directTenantId || String(options?.resolveListingOwnerId?.(item.template_id) || "").trim()
        return resolvedTenantId === ownerTenantId
      })
    : listed
  return {
    totalSubmissions: scopedSubmissions.length,
    underReview: scopedSubmissions.filter((item) => ["submitted", "under_review"].includes(item.status)).length,
    approved: new Set(scopedSubmissions.filter((item) => item.status === "approved").map((item) => item.template_id)).size,
    listedTemplates: scopedListed.length,
  }
}
