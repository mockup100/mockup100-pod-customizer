export function stripDisplayFileExtension(value: unknown) {
  const normalized = String(value || "").trim()
  if (!normalized) return ""
  const stripped = normalized.replace(/\.(?:png|jpe?g|webp|svg)$/i, "").trim()
  return stripped || normalized
}

export function resolveDisplayName(value: unknown, fallback = "") {
  const normalized = stripDisplayFileExtension(value)
  if (normalized) return normalized
  return String(fallback || "").trim()
}
