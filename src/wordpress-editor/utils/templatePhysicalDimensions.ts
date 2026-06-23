import type {
  PhysicalDisplayUnit,
  TemplateDimensionValue,
  TemplateDpiValue,
  TemplatePartOriginalInfo,
  TemplatePartPhysicalDimension,
  TemplatePhysicalDimensions,
  TemplatePhysicalDimensionsCandidate,
} from "../api/client"

export type PhysicalDimensionFormEntry = {
  width: string
  height: string
  source?: string
  rawWidth?: string
  rawHeight?: string
  confidence?: string
}

export type PhysicalDimensionEditorEntry = {
  canvas: PhysicalDimensionFormEntry
  bbox: PhysicalDimensionFormEntry
  dpi: string
  dpiSource?: string
  original: TemplatePartOriginalInfo
} & PhysicalDimensionFormEntry

export type PhysicalDimensionPresentation = {
  sourceLabel: string
  sourceTone: "svg" | "manual"
  rawValue: string
  warning: string
}

type PhysicalDimensionPayloadEntry = {
  canvas?: PhysicalDimensionFormEntry
  bbox?: PhysicalDimensionFormEntry
  dpi?: string | number
  dpiSource?: string
  original?: TemplatePartOriginalInfo
}

function resolveSingleDpiValue(dpi?: TemplateDpiValue | null) {
  const x = normalizeFiniteNumber(dpi?.x)
  const y = normalizeFiniteNumber(dpi?.y)
  return x ?? y ?? DEFAULT_DPI_FALLBACK
}

const DEFAULT_DPI_FALLBACK = 72

function normalizeFiniteNumber(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return numeric
}

export function formatDimensionValue(value: unknown, fallback = "0") {
  const numeric = normalizeFiniteNumber(value)
  if (numeric == null) return fallback
  return numeric.toFixed(2).replace(/\.?0+$/, "")
}

export function buildPhysicalDimensionPresentation(
  source?: string,
  rawWidth?: string,
  rawHeight?: string,
  confidence?: string,
): PhysicalDimensionPresentation {
  const normalizedSource = String(source || "")
  return {
    sourceLabel:
      normalizedSource === "svg_detected" || normalizedSource === "svg_explicit_unit"
        ? "SVG"
        : normalizedSource === "png_dpi" || normalizedSource === "png_dpi_bbox_ratio"
          ? "Auto"
          : normalizedSource === "png_dpi_default_72" || normalizedSource === "png_dpi_default_72_bbox_ratio"
            ? "Auto 72"
        : normalizedSource === "manual_override"
          ? "Override"
          : "Manual",
    sourceTone:
      normalizedSource === "svg_detected" || normalizedSource === "svg_explicit_unit"
        ? "svg"
        : normalizedSource.startsWith("png_dpi")
          ? "svg"
        : "manual",
    rawValue: rawWidth || rawHeight ? `${rawWidth || "?"} × ${rawHeight || "?"}` : "",
    warning:
      normalizedSource === "svg_pixel_only"
        ? "SVG only provides px dimensions. Please enter the real cm size manually."
        : normalizedSource === "svg_viewbox_only"
          ? "SVG only provides a viewBox ratio. Please enter the real cm size manually."
          : normalizedSource === "svg_missing_dimension"
            ? "SVG does not contain usable physical size metadata."
            : confidence === "low"
              ? "Auto-detected value may be inaccurate. Please confirm before saving."
            : "",
  }
}

function pickDimensionValue(
  preferred?: TemplateDimensionValue | null,
  fallback?: TemplateDimensionValue | null,
): PhysicalDimensionFormEntry {
  const source = (preferred || fallback || {}) as TemplateDimensionValue
  return {
    width: formatDimensionValue(source.width),
    height: formatDimensionValue(source.height),
    source: String(source.source || "manual"),
    rawWidth: String(source.raw_width || ""),
    rawHeight: String(source.raw_height || ""),
    confidence: String(source.confidence || ""),
  }
}

/**
 * Architecture: bbox is stored as a canvas-relative percentage (bbox_pct).
 * Whenever both the canvas cm and bbox_pct are known, derive bbox cm =
 * canvas cm * pct so that bbox <= canvas is always guaranteed for the
 * editor display, regardless of the source PNG/SVG pixel resolution.
 */
function deriveBboxFromPercentage(
  canvas: PhysicalDimensionFormEntry,
  bbox: PhysicalDimensionFormEntry,
  original: TemplatePartOriginalInfo,
): PhysicalDimensionFormEntry {
  const pct = (original as Record<string, unknown>).bbox_pct as
    | { width?: unknown; height?: unknown; source?: unknown }
    | undefined
  if (!pct) return bbox
  const pctW = normalizeFiniteNumber(pct.width)
  const pctH = normalizeFiniteNumber(pct.height)
  const canvasW = normalizeFiniteNumber(canvas.width)
  const canvasH = normalizeFiniteNumber(canvas.height)
  if (pctW == null || pctH == null || canvasW == null || canvasH == null) return bbox
  // Clamp so bbox never exceeds canvas due to upstream resolution mismatch.
  const safeW = Math.min(pctW, 1)
  const safeH = Math.min(pctH, 1)
  return {
    width: formatDimensionValue(canvasW * safeW),
    height: formatDimensionValue(canvasH * safeH),
    source: bbox.source || (pct.source ? String(pct.source) : "bbox_pct"),
    rawWidth: bbox.rawWidth,
    rawHeight: bbox.rawHeight,
    confidence: bbox.confidence || "high",
  }
}

function createZeroDimensionEntry(source = "manual"): PhysicalDimensionFormEntry {
  return {
    width: "0",
    height: "0",
    source,
    rawWidth: "",
    rawHeight: "",
    confidence: "",
  }
}

function readDimensionField(source: Record<string, unknown>, camelKey: string, snakeKey: string) {
  const value = source[camelKey] ?? source[snakeKey]
  return value == null ? "" : String(value)
}

function attachCanvasSummary(entry: {
  canvas: PhysicalDimensionFormEntry
  bbox: PhysicalDimensionFormEntry
  dpi: string
  dpiSource?: string
  original: TemplatePartOriginalInfo
}): PhysicalDimensionEditorEntry {
  return {
    ...entry,
    width: entry.canvas.width,
    height: entry.canvas.height,
    source: entry.canvas.source,
    rawWidth: entry.canvas.rawWidth,
    rawHeight: entry.canvas.rawHeight,
    confidence: entry.canvas.confidence,
  }
}

export function ensurePhysicalDimensionEditorEntry(value: unknown): PhysicalDimensionEditorEntry {
  const part = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const canvas = part.canvas && typeof part.canvas === "object"
    ? (part.canvas as Record<string, unknown>)
    : part
  const bbox = part.bbox && typeof part.bbox === "object"
    ? (part.bbox as Record<string, unknown>)
    : {}
  const original = part.original && typeof part.original === "object"
    ? (part.original as TemplatePartOriginalInfo)
    : {}
  const dpi = original.dpi || {}
  const canvasEntry: PhysicalDimensionFormEntry = {
    width: formatDimensionValue(canvas.width),
    height: formatDimensionValue(canvas.height),
    source: canvas.source == null ? "" : String(canvas.source),
    rawWidth: readDimensionField(canvas, "rawWidth", "raw_width"),
    rawHeight: readDimensionField(canvas, "rawHeight", "raw_height"),
    confidence: canvas.confidence == null ? "" : String(canvas.confidence),
  }
  const rawBboxEntry: PhysicalDimensionFormEntry = {
    width: formatDimensionValue(bbox.width),
    height: formatDimensionValue(bbox.height),
    source: bbox.source == null ? "" : String(bbox.source),
    rawWidth: readDimensionField(bbox, "rawWidth", "raw_width"),
    rawHeight: readDimensionField(bbox, "rawHeight", "raw_height"),
    confidence: bbox.confidence == null ? "" : String(bbox.confidence),
  }
  return attachCanvasSummary({
    canvas: canvasEntry,
    bbox: deriveBboxFromPercentage(canvasEntry, rawBboxEntry, original),
    dpi: formatDimensionValue(resolveSingleDpiValue(dpi), String(DEFAULT_DPI_FALLBACK)),
    dpiSource: dpi.source == null ? "" : String(dpi.source),
    original,
  })
}

export function hydrateUploadPhysicalDimensions(args: {
  candidates?: Record<string, TemplatePhysicalDimensionsCandidate>
  configured?: Record<string, TemplatePartPhysicalDimension>
}): Record<string, PhysicalDimensionEditorEntry> {
  const candidates = args.candidates || {}
  const configured = args.configured || {}
  const partNames = Array.from(new Set([...Object.keys(candidates), ...Object.keys(configured)]))
  const next: Record<string, PhysicalDimensionEditorEntry> = {}
  for (const partName of partNames) {
    const configuredPart = configured[partName] || {}
    const candidate = candidates[partName] || {}
    const configuredCanvas =
      configuredPart.canvas ||
      ((Number.isFinite(Number(configuredPart.width)) || Number.isFinite(Number(configuredPart.height)))
        ? {
            width: configuredPart.width,
            height: configuredPart.height,
            source: configuredPart.source,
            raw_width: configuredPart.raw_width,
            raw_height: configuredPart.raw_height,
            confidence: configuredPart.confidence,
          }
        : undefined)
    const configuredBbox = configuredPart.bbox
    const candidateCanvas = candidate.canvas || (
      candidate.normalized_cm
        ? {
            width: candidate.normalized_cm.width,
            height: candidate.normalized_cm.height,
            source: candidate.source,
            raw_width: candidate.raw_width,
            raw_height: candidate.raw_height,
            confidence: candidate.confidence,
          }
        : undefined
    )
    const candidateBbox = candidate.bbox
    const original = configuredPart.original || candidate.original || {}
    const dpi = original.dpi || {}
    const canvasEntry = pickDimensionValue(
      configuredCanvas,
      candidateCanvas ? {
        ...candidateCanvas,
        source: candidate.source === "svg_explicit_unit" ? "svg_detected" : candidateCanvas.source,
      } : null,
    )
    const rawBboxEntry = pickDimensionValue(configuredBbox, candidateBbox)
    next[partName] = {
      ...attachCanvasSummary({
      canvas: canvasEntry,
      bbox: deriveBboxFromPercentage(canvasEntry, rawBboxEntry, original),
      dpi: formatDimensionValue(resolveSingleDpiValue(dpi), String(DEFAULT_DPI_FALLBACK)),
      dpiSource: String(dpi.source || ""),
      original,
      }),
    }
    if (!next[partName].canvas.width) next[partName].canvas = createZeroDimensionEntry(next[partName].canvas.source || "manual")
    if (!next[partName].bbox.width) next[partName].bbox = createZeroDimensionEntry(next[partName].bbox.source || "manual")
    next[partName] = attachCanvasSummary(next[partName])
  }
  return next
}

export function resetUploadPhysicalDimensionsToManual(
  entries: Record<string, PhysicalDimensionEditorEntry>,
): Record<string, PhysicalDimensionEditorEntry> {
  return Object.fromEntries(
    Object.entries(entries || {}).map(([partName, entry]) => {
      const normalized = ensurePhysicalDimensionEditorEntry(entry)
      const nextCanvas = normalized.canvas.width
        ? {
            ...normalized.canvas,
          }
        : createZeroDimensionEntry(normalized.canvas.source || "manual")
      return [
        partName,
        attachCanvasSummary({
          canvas: nextCanvas,
          bbox: createZeroDimensionEntry("manual_override"),
          dpi: normalized.dpi || String(DEFAULT_DPI_FALLBACK),
          dpiSource: normalized.dpiSource || "",
          original: normalized.original || {},
        }),
      ]
    }),
  )
}

export function normalizePhysicalDimensionsEditor(value: unknown): {
  default_unit: PhysicalDisplayUnit
  parts: Record<string, PhysicalDimensionEditorEntry>
} {
  const source =
    value && typeof value === "object" && "parts" in value && value.parts && typeof value.parts === "object"
      ? (value.parts as Record<string, unknown>)
      : {}
  const defaultUnit = value && typeof value === "object" && "default_unit" in value
    ? String((value as Record<string, unknown>).default_unit || "cm")
    : "cm"
  return {
    default_unit: defaultUnit === "mm" || defaultUnit === "in" ? defaultUnit : "cm",
    parts: Object.fromEntries(
      Object.entries(source).map(([partName, raw]) => {
        const part = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
        const canvas = part.canvas && typeof part.canvas === "object"
          ? (part.canvas as Record<string, unknown>)
          : part
        const bbox = part.bbox && typeof part.bbox === "object"
          ? (part.bbox as Record<string, unknown>)
          : {}
        const original = part.original && typeof part.original === "object"
          ? (part.original as TemplatePartOriginalInfo)
          : {}
        const dpi = original.dpi || {}
        return [
          partName,
          ensurePhysicalDimensionEditorEntry({
            canvas: {
              width: canvas.width,
              height: canvas.height,
              source: canvas.source,
              rawWidth: readDimensionField(canvas, "rawWidth", "raw_width"),
              rawHeight: readDimensionField(canvas, "rawHeight", "raw_height"),
              confidence: canvas.confidence,
            },
            bbox: {
              width: bbox.width,
              height: bbox.height,
              source: bbox.source,
              rawWidth: readDimensionField(bbox, "rawWidth", "raw_width"),
              rawHeight: readDimensionField(bbox, "rawHeight", "raw_height"),
              confidence: bbox.confidence,
            },
            original,
          }),
        ]
      }),
    ),
  }
}

export function buildPhysicalDimensionsPayload(value: {
  default_unit?: PhysicalDisplayUnit
  display_unit?: PhysicalDisplayUnit
  parts: Record<string, PhysicalDimensionPayloadEntry>
}): TemplatePhysicalDimensions {
  const displayUnit = value.display_unit || "cm"
  return {
    default_unit: value.default_unit || "cm",
    parts: Object.fromEntries(
      Object.entries(value.parts || {})
        .map(([partName, item]) => {
          const canvasWidth = convertUnitToCm(normalizeFiniteNumber(item.canvas?.width) ?? 0, displayUnit)
          const canvasHeight = convertUnitToCm(normalizeFiniteNumber(item.canvas?.height) ?? 0, displayUnit)
          const bboxWidth = convertUnitToCm(normalizeFiniteNumber(item.bbox?.width) ?? 0, displayUnit)
          const bboxHeight = convertUnitToCm(normalizeFiniteNumber(item.bbox?.height) ?? 0, displayUnit)
          const dpi = normalizeFiniteNumber(item.dpi)
          return [
            partName,
            {
              width: canvasWidth,
              height: canvasHeight,
              source: item.canvas?.source || "manual",
              raw_width: item.canvas?.rawWidth || undefined,
              raw_height: item.canvas?.rawHeight || undefined,
              confidence: item.canvas?.confidence || undefined,
              canvas: {
                width: canvasWidth,
                height: canvasHeight,
                source: item.canvas?.source || "manual",
                raw_width: item.canvas?.rawWidth || undefined,
                raw_height: item.canvas?.rawHeight || undefined,
                confidence: item.canvas?.confidence || undefined,
              },
              bbox: {
                width: bboxWidth,
                height: bboxHeight,
                source: item.bbox?.source || "manual",
                raw_width: item.bbox?.rawWidth || undefined,
                raw_height: item.bbox?.rawHeight || undefined,
                confidence: item.bbox?.confidence || undefined,
              },
              original: {
                ...(item.original || {}),
                dpi: {
                  ...(item.original?.dpi || {}),
                  x: dpi ?? undefined,
                  y: dpi ?? undefined,
                  source: item.dpiSource || item.original?.dpi?.source || undefined,
                } as TemplateDpiValue,
              },
            },
          ]
        }) as Array<[string, TemplatePartPhysicalDimension]>,
    ),
  }
}

export function convertCmToUnit(value: unknown, unit: PhysicalDisplayUnit) {
  const numeric = normalizeFiniteNumber(value) ?? 0
  if (unit === "mm") return numeric * 10
  if (unit === "in") return numeric / 2.54
  return numeric
}

export function convertUnitToCm(value: unknown, unit: PhysicalDisplayUnit) {
  const numeric = normalizeFiniteNumber(value) ?? 0
  if (unit === "mm") return numeric / 10
  if (unit === "in") return numeric * 2.54
  return numeric
}

export function formatUnitDimension(valueCm: unknown, unit: PhysicalDisplayUnit) {
  return formatDimensionValue(convertCmToUnit(valueCm, unit))
}

export function unitSuffix(unit: PhysicalDisplayUnit) {
  if (unit === "mm") return "mm"
  if (unit === "in") return "in"
  return "cm"
}
