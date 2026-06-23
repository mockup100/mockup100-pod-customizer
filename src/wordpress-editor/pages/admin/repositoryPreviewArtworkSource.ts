import { resolveAssetUrl } from "@/api/client"

export type ArtworkInsertSourceEntry = {
  artwork_id?: string
  artwork_code?: string
  source_asset_id?: string
  name?: string
  mime_type?: string
  file_ext?: string
  original_url?: string
  preview_url?: string
  source_url?: string
}

export type ArtworkInsertResolution = {
  source: string
  selectedFrom: "original" | "preview"
  reason:
    | "missing"
    | "non_svg"
    | "data_or_blob_svg"
    | "matched_svg"
    | "mismatched_svg_fallback"
    | "fetch_failed_preview_fallback"
    | "invalid_svg_preview_fallback"
    | "fetch_failed"
    | "invalid_svg_response"
}

function normalizeSvgMarkup(svgText: string) {
  return String(svgText || "")
    .replace(/^\uFEFF/, "")
    .replace(/^\s+(?=<\?xml|<svg\b)/i, "")
}

export function normalizeArtworkIdentity(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
}

export function extractSvgIdentityCandidates(svgText: string) {
  const matches = [
    ...svgText.matchAll(/sodipodi:docname="([^"]+)"/gi),
    ...svgText.matchAll(/<title[^>]*>\s*([^<]+?)\s*<\/title>/gi),
  ]
  return Array.from(new Set(matches
    .map((match) => normalizeArtworkIdentity(match[1] || ""))
    .filter(Boolean)))
}

function looksLikeSvgArtwork(entry: ArtworkInsertSourceEntry, candidate: string) {
  const mimeType = String(entry.mime_type || "").toLowerCase()
  const fileExt = String(entry.file_ext || "").toLowerCase()
  const probes = [
    candidate,
    entry.original_url,
    entry.preview_url,
    entry.source_url,
  ]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
  if (mimeType.includes("image/svg+xml")) return true
  if (fileExt === "svg") return true
  return probes.some((item) =>
    item.startsWith("data:image/svg+xml")
    || item.startsWith("blob:")
    || /\.svg(?:$|[?#])/.test(item),
  )
}

export function svgAppearsToMatchArtworkEntry(entry: ArtworkInsertSourceEntry, svgText: string) {
  const expected = normalizeArtworkIdentity(String(entry.name || ""))
  if (!expected) return true
  const candidates = extractSvgIdentityCandidates(svgText)
  if (!candidates.length) return true
  return candidates.some((candidate) => candidate.includes(expected) || expected.includes(candidate))
}

function resolvePreviewFallback(
  entry: ArtworkInsertSourceEntry,
  selectedFrom: ArtworkInsertResolution["selectedFrom"],
  reason: Extract<ArtworkInsertResolution["reason"], "mismatched_svg_fallback" | "fetch_failed_preview_fallback" | "invalid_svg_preview_fallback">,
  logger?: Pick<Console, "warn">,
) {
  const fallbackPreview = resolveAssetUrl(String(entry.preview_url || "").trim())
  if (!fallbackPreview || selectedFrom === "preview") {
    return null
  }
  if (reason === "mismatched_svg_fallback") {
    logger?.warn(
      `[preview-artwork] Fallback to preview asset for mismatched SVG: ${entry.artwork_id || entry.artwork_code || entry.source_asset_id || "unknown"} ${entry.name || ""}`,
    )
  } else {
    logger?.warn(
      `[preview-artwork] Fallback to preview asset after original artwork fetch failed: ${entry.artwork_id || entry.artwork_code || entry.source_asset_id || "unknown"} ${entry.name || ""}`,
    )
  }
  return {
    source: fallbackPreview,
    selectedFrom: "preview" as const,
    reason,
  }
}

export async function resolveArtworkInsertSource(
  entry: ArtworkInsertSourceEntry,
  options?: {
    fetchImpl?: typeof fetch
    logger?: Pick<Console, "warn">
  },
): Promise<ArtworkInsertResolution> {
  const candidate = String(entry.original_url || entry.preview_url || "").trim()
  const selectedFrom = entry.original_url ? "original" : "preview"
  if (!candidate) {
    return { source: "", selectedFrom: "preview", reason: "missing" }
  }
  const fetchCandidate = resolveAssetUrl(candidate)
  const normalizedCandidate = candidate.toLowerCase()
  if (!looksLikeSvgArtwork(entry, candidate)) {
    return { source: fetchCandidate, selectedFrom, reason: "non_svg" }
  }
  if (normalizedCandidate.startsWith("data:image/svg+xml") || normalizedCandidate.startsWith("blob:")) {
    return { source: candidate, selectedFrom, reason: "data_or_blob_svg" }
  }
  const fetchImpl = options?.fetchImpl || fetch
  try {
    const response = await fetchImpl(fetchCandidate, { credentials: "omit" })
    if (!response.ok) {
      const fallback = resolvePreviewFallback(entry, selectedFrom, "fetch_failed_preview_fallback", options?.logger)
      if (fallback) return fallback
      return { source: fetchCandidate, selectedFrom, reason: "fetch_failed" }
    }
    const svgText = normalizeSvgMarkup(await response.text())
    if (!/<svg[\s>]/i.test(svgText)) {
      const fallback = resolvePreviewFallback(entry, selectedFrom, "invalid_svg_preview_fallback", options?.logger)
      if (fallback) return fallback
      return { source: fetchCandidate, selectedFrom, reason: "invalid_svg_response" }
    }
    // 不再基于 name vs sodipodi:docname/<title> 的启发式做降级——OSS 上的 SVG 文件名经过哈希处理，
    // 与 artwork.name 天然不一致，这条规则会误伤合法 SVG。只要响应是有效 SVG 即采用原图。
    return {
      source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`,
      selectedFrom,
      reason: "matched_svg",
    }
  } catch {
    const fallback = resolvePreviewFallback(entry, selectedFrom, "fetch_failed_preview_fallback", options?.logger)
    if (fallback) return fallback
    return { source: fetchCandidate, selectedFrom, reason: "fetch_failed" }
  }
}
