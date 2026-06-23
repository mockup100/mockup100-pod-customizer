export function normalizeSizeDraftValue(rawValue: string) {
  const normalized = String(rawValue || "").replace(/,/g, ".").replace(/[^\d.]/g, "")
  if (!normalized) return ""
  const firstDotIndex = normalized.indexOf(".")
  if (firstDotIndex < 0) {
    return normalized
  }
  return `${normalized.slice(0, firstDotIndex + 1)}${normalized.slice(firstDotIndex + 1).replace(/\./g, "")}`
}

export function isPendingSizeDraftValue(value: string) {
  const trimmed = String(value || "").trim()
  return !trimmed || trimmed === "." || trimmed.endsWith(".")
}

export function parseCommittedSizeValue(value: string) {
  const trimmed = String(value || "").trim()
  if (isPendingSizeDraftValue(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}
