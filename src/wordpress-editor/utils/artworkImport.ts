import type { ArtworkImportItem, ArtworkListItem } from "../api/client"

export type ArtworkImportPreviewStats = {
  total: number
  unique: number
  manifestDuplicates: number
  libraryDuplicates: number
  checkpointDuplicates: number
  estimatedDuplicates: number
  providerSummary: string
  batchCount: number
  sample: ArtworkImportItem[]
}

export type ArtworkImportDeduplicationResult = {
  items: ArtworkImportItem[]
  manifestDuplicates: number
  libraryDuplicates: number
  checkpointDuplicates: number
}

export type ArtworkImportCheckpoint = {
  manifest_hash: string
  batch_size: number
  total_items: number
  completed_batches: number
  created_count: number
  skipped_count: number
  failed_count: number
  processed_keys: string[]
  messages: string[]
  updated_at: string
}

type ArtworkImportSourceLike = Pick<ArtworkImportItem, "source_provider" | "source_asset_id" | "source_url">
  | Pick<ArtworkListItem, "source_provider" | "source_asset_id" | "source_url">

const MAX_CHECKPOINT_MESSAGES = 50

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined
}

function deriveFileExtFromMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  if (mimeType === "image/svg+xml") return "svg"
  return ""
}

function clampBatchSize(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

export function normalizeImportEntry(raw: unknown): ArtworkImportItem {
  if (!isRecord(raw)) {
    throw new Error("Each import item must be an object.")
  }

  const sourceProvider = readOptionalString(raw.source_provider).toLowerCase() as ArtworkImportItem["source_provider"]
  const mimeType = readOptionalString(raw.mime_type).toLowerCase()
  const fileExt = readOptionalString(raw.file_ext).replace(/^\./, "").toLowerCase() || deriveFileExtFromMime(mimeType)
  const name = readOptionalString(raw.name)
  const previewUrl = readOptionalString(raw.preview_url)
  const originalUrl = readOptionalString(raw.original_url)
  const licenseName = readOptionalString(raw.license_name)

  if (!sourceProvider) {
    throw new Error("source_provider is required for each import item.")
  }
  if (!name) {
    throw new Error("name is required for each import item.")
  }
  if (!mimeType) {
    throw new Error(`mime_type is required for "${name}".`)
  }
  if (!fileExt) {
    throw new Error(`file_ext is required for "${name}".`)
  }
  if (!previewUrl) {
    throw new Error(`preview_url is required for "${name}".`)
  }
  if (!originalUrl) {
    throw new Error(`original_url is required for "${name}".`)
  }
  if (!licenseName) {
    throw new Error(`license_name is required for "${name}".`)
  }

  return {
    artwork_code: readOptionalString(raw.artwork_code) || undefined,
    source_provider: sourceProvider,
    source_asset_id: readOptionalString(raw.source_asset_id) || undefined,
    source_url: readOptionalString(raw.source_url) || undefined,
    upstream_source_name: readOptionalString(raw.upstream_source_name) || undefined,
    upstream_license_verified: readOptionalBoolean(raw.upstream_license_verified),
    name,
    description: readOptionalString(raw.description) || undefined,
    mime_type: mimeType,
    file_ext: fileExt,
    category_id: readOptionalString(raw.category_id) || undefined,
    category_path: readOptionalString(raw.category_path) || undefined,
    preview_url: previewUrl,
    original_url: originalUrl,
    creator_name: readOptionalString(raw.creator_name) || undefined,
    license_name: licenseName,
    license_url: readOptionalString(raw.license_url) || undefined,
    attribution_required: readOptionalBoolean(raw.attribution_required) ?? false,
    width: readOptionalNumber(raw.width),
    height: readOptionalNumber(raw.height),
    status: readOptionalString(raw.status) || "active",
  }
}

export function normalizeImportManifest(raw: unknown) {
  const entries = Array.isArray(raw)
    ? raw
    : (isRecord(raw) && Array.isArray(raw.items) ? raw.items : null)

  if (!entries?.length) {
    throw new Error("Import manifest must be an array or an object with an items array.")
  }

  return entries.map((entry) => normalizeImportEntry(entry))
}

export function buildImportSourceKey(item: ArtworkImportSourceLike) {
  const provider = String(item.source_provider || "").trim().toLowerCase()
  const sourceAssetId = String(item.source_asset_id || "").trim()
  const sourceUrl = String(item.source_url || "").trim()
  if (!provider) return ""
  return sourceAssetId ? `${provider}::${sourceAssetId}` : (sourceUrl ? `${provider}::${sourceUrl}` : "")
}

export function hashImportManifest(items: ArtworkImportItem[]) {
  const normalized = items.map((item) => ({
    artwork_code: item.artwork_code || "",
    source_provider: item.source_provider || "",
    source_asset_id: item.source_asset_id || "",
    source_url: item.source_url || "",
    name: item.name || "",
    preview_url: item.preview_url || "",
    original_url: item.original_url || "",
  }))
  const serialized = JSON.stringify(normalized)
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `artwork-import-${(hash >>> 0).toString(16)}`
}

export function dedupeImportItems(
  importItems: ArtworkImportItem[],
  currentItems: ArtworkListItem[] = [],
  processedKeys: string[] = [],
): ArtworkImportDeduplicationResult {
  const currentKeys = new Set(currentItems.map((item) => buildImportSourceKey(item)).filter(Boolean))
  const checkpointKeys = new Set(processedKeys.filter(Boolean))
  const seenManifestKeys = new Set<string>()
  const items: ArtworkImportItem[] = []
  let manifestDuplicates = 0
  let libraryDuplicates = 0
  let checkpointDuplicates = 0

  for (const item of importItems) {
    const key = buildImportSourceKey(item)
    if (key) {
      if (seenManifestKeys.has(key)) {
        manifestDuplicates += 1
        continue
      }
      seenManifestKeys.add(key)

      if (checkpointKeys.has(key)) {
        checkpointDuplicates += 1
        continue
      }

      if (currentKeys.has(key)) {
        libraryDuplicates += 1
        continue
      }
    }

    items.push(item)
  }

  return {
    items,
    manifestDuplicates,
    libraryDuplicates,
    checkpointDuplicates,
  }
}

export function buildImportPreviewStats(
  importItems: ArtworkImportItem[],
  currentItems: ArtworkListItem[] = [],
  processedKeys: string[] = [],
  batchSize = 25,
): ArtworkImportPreviewStats {
  const providerCounts = new Map<string, number>()
  for (const item of importItems) {
    providerCounts.set(item.source_provider, (providerCounts.get(item.source_provider) || 0) + 1)
  }

  const deduped = dedupeImportItems(importItems, currentItems, processedKeys)
  const providerSummary = [...providerCounts.entries()]
    .map(([provider, count]) => `${provider}: ${count}`)
    .join(" | ")

  return {
    total: importItems.length,
    unique: deduped.items.length,
    manifestDuplicates: deduped.manifestDuplicates,
    libraryDuplicates: deduped.libraryDuplicates,
    checkpointDuplicates: deduped.checkpointDuplicates,
    estimatedDuplicates: deduped.manifestDuplicates + deduped.libraryDuplicates + deduped.checkpointDuplicates,
    providerSummary,
    batchCount: deduped.items.length ? Math.ceil(deduped.items.length / clampBatchSize(batchSize)) : 0,
    sample: deduped.items.slice(0, 6),
  }
}

export function splitImportIntoBatches(items: ArtworkImportItem[], batchSize: number) {
  const normalizedBatchSize = clampBatchSize(batchSize)
  const batches: ArtworkImportItem[][] = []
  for (let index = 0; index < items.length; index += normalizedBatchSize) {
    batches.push(items.slice(index, index + normalizedBatchSize))
  }
  return batches
}

export function buildArtworkImportStorageKey(scope: "platform" | "tenant", manifestHash: string) {
  return `mockup:${scope}:artwork-import:${manifestHash}`
}

export function normalizeCheckpointMessages(messages: string[] = []) {
  return messages
    .map((message) => String(message || "").trim())
    .filter(Boolean)
    .slice(-MAX_CHECKPOINT_MESSAGES)
}

export function parseArtworkImportCheckpoint(raw: string | null, manifestHash: string): ArtworkImportCheckpoint | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return null
    if (readOptionalString(parsed.manifest_hash) !== manifestHash) return null

    return {
      manifest_hash: manifestHash,
      batch_size: clampBatchSize(Number(parsed.batch_size) || 1),
      total_items: Math.max(0, Math.floor(Number(parsed.total_items) || 0)),
      completed_batches: Math.max(0, Math.floor(Number(parsed.completed_batches) || 0)),
      created_count: Math.max(0, Math.floor(Number(parsed.created_count) || 0)),
      skipped_count: Math.max(0, Math.floor(Number(parsed.skipped_count) || 0)),
      failed_count: Math.max(0, Math.floor(Number(parsed.failed_count) || 0)),
      processed_keys: Array.isArray(parsed.processed_keys)
        ? parsed.processed_keys.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
      messages: normalizeCheckpointMessages(Array.isArray(parsed.messages) ? parsed.messages.map((item) => String(item || "")) : []),
      updated_at: readOptionalString(parsed.updated_at) || "",
    }
  } catch {
    return null
  }
}
