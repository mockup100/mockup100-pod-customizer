export const DEFAULT_TEXT_FONT_FAMILY = "Arial"
export const DEFAULT_TEXT_LINE_HEIGHT = 1.2
export const DEFAULT_IMAGE_OPACITY = 1
export const DEFAULT_NEW_TEXT_CONTENT = "New text"

export const TEXT_FONT_FAMILY_OPTIONS = [
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Verdana", value: "Verdana" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Impact", value: "Impact" },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function normalizeTextFontFamily(value: unknown, fallback = DEFAULT_TEXT_FONT_FAMILY) {
  const normalized = String(value || "").trim()
  return normalized || fallback
}

export function normalizeTextFontSize(value: unknown, fallback = 52) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Number(clamp(numeric, 12, 180).toFixed(2))
}

export function normalizeTextLineHeight(value: unknown, fallback = DEFAULT_TEXT_LINE_HEIGHT) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Number(clamp(numeric, 0.8, 3).toFixed(2))
}

export function normalizeImageOpacity(value: unknown, fallback = DEFAULT_IMAGE_OPACITY) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Number(clamp(numeric, 0, 1).toFixed(2))
}
