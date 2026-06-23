import type { PhysicalDisplayUnit } from "../api/client"

export type PhysicalDimensionValue = {
  left?: number
  top?: number
  width: number
  height: number
  source?: string
}

export type PhysicalDimensionPartValue = PhysicalDimensionValue & {
  canvas?: PhysicalDimensionValue
  bbox?: PhysicalDimensionValue
}

export type PhysicalDimensionsValue = {
  default_unit?: PhysicalDisplayUnit
  parts?: Record<string, PhysicalDimensionPartValue>
}

export type ViewGeometryPixelBox = {
  x?: number
  y?: number
  width?: number
  height?: number
}

export type ViewGeometryNormalizedBox = {
  x?: number
  y?: number
  width?: number
  height?: number
}

export type ViewGeometryEntry = {
  part_name?: string
  pixel_box?: ViewGeometryPixelBox
  normalized_box?: ViewGeometryNormalizedBox
}

export type ViewGeometryValue = Record<string, ViewGeometryEntry[]>

export type RulerFrame = {
  left: number
  top: number
  width: number
  height: number
}

export type RulerTick = {
  index: number
  major: boolean
  label: string
  left?: number
  top?: number
}

export type DisplayPhysicalMeasurement = {
  width: number
  height: number
  unit: PhysicalDisplayUnit
  label: string
}

function normalizePhysicalDimensionPartKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findPhysicalDimensionPart(
  parts: Record<string, PhysicalDimensionValue>,
  selectedPartKey: string,
) {
  const exactMatch = parts[selectedPartKey] as PhysicalDimensionValue & {
    canvas?: PhysicalDimensionValue
  }
  if (exactMatch) return exactMatch
  const normalizedSelected = normalizePhysicalDimensionPartKey(selectedPartKey)
  if (!normalizedSelected) return null
  const matchedEntry = Object.entries(parts).find(([partKey]) => (
    normalizePhysicalDimensionPartKey(partKey) === normalizedSelected
  ))
  return (matchedEntry?.[1] as PhysicalDimensionValue & { canvas?: PhysicalDimensionValue }) || null
}

export function resolvePartPhysicalDimensionByTarget(
  dimensions?: PhysicalDimensionsValue,
  selectedPartKey?: string,
  target: "canvas" | "bbox" = "canvas",
): PhysicalDimensionValue | null {
  const parts = (dimensions?.parts || {}) as Record<string, PhysicalDimensionPartValue>
  const pickTargetDimension = (value?: PhysicalDimensionPartValue | null) => {
    if (!value) return null
    const candidate = target === "bbox" ? (value.bbox || null) : (value.canvas || value)
    if (candidate && Number(candidate.width) > 0 && Number(candidate.height) > 0) {
      return candidate
    }
    if (candidate && Number(candidate.width) === 0 && Number(candidate.height) === 0) {
      return {
        width: 0,
        height: 0,
        source: candidate.source,
      }
    }
    return null
  }

  if (selectedPartKey) {
    return pickTargetDimension(findPhysicalDimensionPart(parts, selectedPartKey))
  }

  for (const item of Object.values(parts)) {
    const resolved = pickTargetDimension(item)
    if (resolved && Number(resolved.width) > 0 && Number(resolved.height) > 0) {
      return resolved
    }
  }

  return null
}

export function resolveCurrentPhysicalDimension(
  dimensions?: PhysicalDimensionsValue,
  selectedPartKey?: string,
): PhysicalDimensionValue | null {
  const parts = dimensions?.parts || {}
  const first = Object.values(parts)
    .map((item) => ((item as PhysicalDimensionValue & { canvas?: PhysicalDimensionValue }).canvas || item))
    .find((item) => Number(item.width) > 0 && Number(item.height) > 0)
  if (selectedPartKey) {
    const rawSelected = findPhysicalDimensionPart(parts, selectedPartKey)
    const selected = rawSelected?.canvas || rawSelected
    if (selected && Number(selected.width) > 0 && Number(selected.height) > 0) {
      return selected
    }
    if (selected && Number(selected.width) === 0 && Number(selected.height) === 0) {
      return {
        width: 0,
        height: 0,
        source: selected.source,
      }
    }
    return null
  }
  return first || null
}

export function resolveCanvasPhysicalDimension(args: {
  dimensions?: PhysicalDimensionsValue
  selectedPartKey?: string
  viewGeometry?: ViewGeometryValue
  selectedColor?: string
  selectedView?: string
  templateSize?: string
}) {
  const { dimensions, selectedPartKey } = args
  const physical = resolveCurrentPhysicalDimension(dimensions, selectedPartKey)
  if (!physical) return null
  return physical
}

export function convertFromCm(value: number | undefined, unit: PhysicalDisplayUnit) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return 0
  if (unit === "mm") return numeric * 10
  if (unit === "in") return numeric / 2.54
  return numeric
}

export function formatUnitNumber(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0"
  const rounded = Number(value.toFixed(1))
  if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
    return String(Math.round(rounded))
  }
  return rounded.toFixed(1).replace(/\.0$/, "")
}

export function unitSuffix(unit: PhysicalDisplayUnit) {
  if (unit === "mm") return "mm"
  if (unit === "in") return "in"
  return "cm"
}

export function formatPhysicalSizeLabel(width: number, height: number, unit: PhysicalDisplayUnit = "cm") {
  return `${formatUnitNumber(width)} × ${formatUnitNumber(height)} ${unitSuffix(unit)}`
}

export function convertTemplatePixelsToDisplayUnit(args: {
  widthPx: number
  heightPx: number
  physical: PhysicalDimensionValue | null
  templateWidthPx: number
  templateHeightPx: number
  unit?: PhysicalDisplayUnit
}): DisplayPhysicalMeasurement | null {
  const { widthPx, heightPx, physical, templateWidthPx, templateHeightPx, unit = "cm" } = args
  if (!physical) return null
  const safeTemplateWidth = Number(templateWidthPx)
  const safeTemplateHeight = Number(templateHeightPx)
  const safeWidthPx = Number(widthPx)
  const safeHeightPx = Number(heightPx)
  if (!Number.isFinite(safeTemplateWidth) || safeTemplateWidth <= 0 || !Number.isFinite(safeTemplateHeight) || safeTemplateHeight <= 0) {
    return null
  }
  if (!Number.isFinite(safeWidthPx) || safeWidthPx < 0 || !Number.isFinite(safeHeightPx) || safeHeightPx < 0) {
    return null
  }
  const widthCm = (safeWidthPx / safeTemplateWidth) * Number(physical.width || 0)
  const heightCm = (safeHeightPx / safeTemplateHeight) * Number(physical.height || 0)
  const displayWidth = convertFromCm(widthCm, unit)
  const displayHeight = convertFromCm(heightCm, unit)
  return {
    width: displayWidth,
    height: displayHeight,
    unit,
    label: formatPhysicalSizeLabel(displayWidth, displayHeight, unit),
  }
}

function resolveTickConfig(total: number, unit: PhysicalDisplayUnit) {
  if (unit === "mm") {
    return {
      minor: total > 500 ? 50 : 10,
      major: total > 500 ? 100 : 50,
    }
  }
  if (unit === "in") {
    return {
      minor: 0.5,
      major: 1,
    }
  }
  return {
    minor: 1,
    major: total > 40 ? 10 : 5,
  }
}

function buildTicks(
  total: number,
  startOffset: number,
  pixelSpan: number,
  unit: PhysicalDisplayUnit,
  axis: "horizontal" | "vertical",
): RulerTick[] {
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(pixelSpan) || pixelSpan <= 0) return []
  const { minor, major } = resolveTickConfig(total, unit)
  const pxPerUnit = total === 0 ? 0 : pixelSpan / total
  if (!Number.isFinite(pxPerUnit) || pxPerUnit <= 0) return []
  const ticks: RulerTick[] = []
  const epsilon = 0.0001
  for (let value = 0, index = 0; value <= total + epsilon; value = Number((value + minor).toFixed(4)), index += 1) {
    const majorTick = Math.abs((value / major) - Math.round(value / major)) < epsilon
    const offset = startOffset + value * pxPerUnit
    ticks.push({
      index,
      major: majorTick,
      label: majorTick ? formatUnitNumber(value) : "",
      ...(axis === "horizontal" ? { left: offset } : { top: offset }),
    })
  }
  if (!ticks.length || Math.abs(total - Number(formatUnitNumber(total))) > epsilon) {
    ticks.push({
      index: ticks.length + 1,
      major: true,
      label: formatUnitNumber(total),
      ...(axis === "horizontal" ? { left: startOffset + pixelSpan } : { top: startOffset + pixelSpan }),
    })
  }
  return ticks
}

export function buildHorizontalRulerTicks(
  frame: RulerFrame,
  physical: PhysicalDimensionValue | null,
  unit: PhysicalDisplayUnit = "cm",
): RulerTick[] {
  if (!physical) return []
  return buildTicks(convertFromCm(physical.width, unit), frame.left, frame.width, unit, "horizontal")
}

export function buildVerticalRulerTicks(
  frame: RulerFrame,
  physical: PhysicalDimensionValue | null,
  unit: PhysicalDisplayUnit = "cm",
): RulerTick[] {
  if (!physical) return []
  return buildTicks(convertFromCm(physical.height, unit), frame.top, frame.height, unit, "vertical")
}

export function buildPhysicalSummaryLabel(physical: PhysicalDimensionValue | null, unit: PhysicalDisplayUnit = "cm") {
  if (!physical) return "Physical size not configured"
  return `${formatUnitNumber(convertFromCm(physical.width, unit))} ${unitSuffix(unit)} × ${formatUnitNumber(convertFromCm(physical.height, unit))} ${unitSuffix(unit)}`
}
