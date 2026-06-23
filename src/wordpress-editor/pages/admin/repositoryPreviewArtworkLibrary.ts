export type PreviewOwnedArtworkLibraryEntry = {
  id: string
  name: string
  src: string
  previewSrc?: string
  createdAt: string
}

export type ArtworkUploadsLibraryRecord = {
  artwork_id?: string
  artworkId?: string
  name?: string
  preview_url?: string
  previewUrl?: string
  original_url?: string
  originalUrl?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

export type ArtworkUrlBackfillEntry = {
  preview_url?: string
  original_url?: string
}

export type PreviewCanvasStateChangeSource = "sync" | "user" | "undo" | "redo" | "restore"

export function normalizeArtworkEntryUrls<T extends ArtworkUrlBackfillEntry>(entry: T): T & {
  preview_url: string
  original_url: string
} {
  const record = entry as T & { previewUrl?: string; originalUrl?: string }
  const previewUrl = String(entry.preview_url || record.previewUrl || entry.original_url || record.originalUrl || "").trim()
  const originalUrl = String(entry.original_url || record.originalUrl || entry.preview_url || record.previewUrl || "").trim()
  return {
    ...entry,
    preview_url: previewUrl,
    original_url: originalUrl,
  }
}

export function mergeOwnedArtworkLibraryEntries(
  existingEntries: PreviewOwnedArtworkLibraryEntry[],
  records: ArtworkUploadsLibraryRecord[],
  resolveUrl: (value: string) => string,
): PreviewOwnedArtworkLibraryEntry[] {
  const normalizedServerEntries = records
    .map((record) => {
      const id = String(record.artwork_id || record.artworkId || "").trim()
      if (!id) return null
      const normalizedUrls = normalizeArtworkEntryUrls(record)
      const resolvedSrc = resolveUrl(normalizedUrls.original_url)
      const resolvedPreviewSrc = resolveUrl(normalizedUrls.preview_url)
      if (!resolvedSrc && !resolvedPreviewSrc) {
        return null
      }
      return {
        id,
        name: String(record.name || "Uploaded artwork"),
        src: resolvedSrc || resolvedPreviewSrc,
        previewSrc: resolvedPreviewSrc || resolvedSrc,
        createdAt: String(record.created_at || record.createdAt || record.updated_at || record.updatedAt || new Date().toISOString()),
      } satisfies PreviewOwnedArtworkLibraryEntry
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const serverEntryIds = new Set(normalizedServerEntries.map((entry) => entry.id))
  const pendingLocalEntries = existingEntries.filter((entry) => entry.id && !serverEntryIds.has(entry.id))
  return [...normalizedServerEntries, ...pendingLocalEntries]
}

export function shouldMarkPreviewDraftDirtyFromCanvasChange(source: PreviewCanvasStateChangeSource) {
  return source !== "sync" && source !== "restore"
}
