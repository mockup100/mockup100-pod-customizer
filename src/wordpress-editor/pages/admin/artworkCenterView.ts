import type { ArtworkListItem, ArtworkSubmissionSummary } from "../../api/client"

export function resolveArtworkCenterName(
  artworkId: string,
  artworks: ArtworkListItem[],
  fallback = "",
): string {
  return artworks.find((item) => item.artwork_id === artworkId)?.name || fallback || artworkId
}

export function resolveArtworkCenterSummary(
  artworkId: string,
  artworks: ArtworkListItem[],
): ArtworkListItem | null {
  return artworks.find((item) => item.artwork_id === artworkId) || null
}

export function resolveArtworkCenterCategory(
  input: { category_path?: string; artwork_id: string },
  artworks: ArtworkListItem[],
): string {
  if (input.category_path) return input.category_path
  return resolveArtworkCenterSummary(input.artwork_id, artworks)?.category_path || "Uncategorized"
}

export function formatMarketplaceCreatorName(name?: string | null): string {
  const normalized = String(name || "").trim()
  if (!normalized) return ""
  return normalized.replace(/\s+Workspace$/i, "").trim()
}

export function getListedMarketplaceArtworks(items: ArtworkListItem[]): ArtworkListItem[] {
  return items.filter((item) => item.status === "active" && item.visibility_status === "listed")
}

export function normalizeArtworkSubmissionStatus(status?: string | null): string {
  const normalized = String(status || "").trim().toLowerCase()
  if (normalized === "pending") {
    return "submitted"
  }
  return normalized
}

function isArtworkSubmissionVisible(submission: ArtworkSubmissionSummary, listings: ArtworkListItem[]) {
  const artworkStatus = String(submission.artwork_status || "").toLowerCase()
  const visibilityStatus = String(submission.visibility_status || "").toLowerCase()
  if (artworkStatus !== "disabled" && visibilityStatus !== "disabled") {
    return true
  }
  const linkedPlatformId = String(submission.platform_artwork_id || "").trim()
  return listings.some((listing) =>
    listing.artwork_id === linkedPlatformId
      || (String(listing.source_provider || "").toLowerCase() === "tenant_submission"
        && String(listing.source_asset_id || "").trim() === String(submission.artwork_id || "").trim()),
  )
}

export function buildArtworkCenterStats(submissions: ArtworkSubmissionSummary[], listings: ArtworkListItem[]) {
  const visibleSubmissions = submissions.filter((item) => isArtworkSubmissionVisible(item, listings))
  return {
    totalSubmissions: visibleSubmissions.length,
    underReview: visibleSubmissions.filter((item) => ["submitted", "under_review"].includes(normalizeArtworkSubmissionStatus(item.status))).length,
    approved: visibleSubmissions.filter((item) => normalizeArtworkSubmissionStatus(item.status) === "approved").length,
    listedArtworks: getListedMarketplaceArtworks(listings).length,
  }
}
