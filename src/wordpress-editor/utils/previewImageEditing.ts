export type ReplaceArtworkLibraryScope = "platform" | "tenant" | "licensed" | "owned"

export type ArtworkIntrinsicSize = {
  width: number
  height: number
}

export type EditableMeasurement = {
  width: number
  height: number
}

export type DesignAreaBox = {
  left: number
  top: number
  width: number
  height: number
}

export type ImageSpreadTargetArea = "part-bounds" | "part-canvas"
export type ArtworkLoadCandidate = {
  src?: string | null
  previewSrc?: string | null
}

function normalizePositiveNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function clampBoxToCanvas(box: DesignAreaBox, canvas: { width: number; height: number }) {
  const canvasWidth = normalizePositiveNumber(canvas.width)
  const canvasHeight = normalizePositiveNumber(canvas.height)
  if (!canvasWidth || !canvasHeight) return null
  const rawLeft = Number(box.left || 0)
  const rawTop = Number(box.top || 0)
  const rawWidth = normalizePositiveNumber(box.width)
  const rawHeight = normalizePositiveNumber(box.height)
  if (!rawWidth || !rawHeight) return null

  const left = Math.min(Math.max(rawLeft, 0), canvasWidth)
  const top = Math.min(Math.max(rawTop, 0), canvasHeight)
  const right = Math.min(Math.max(left + rawWidth, left), canvasWidth)
  const bottom = Math.min(Math.max(top + rawHeight, top), canvasHeight)
  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return null

  return {
    left,
    top,
    width,
    height,
  }
}

function resolveResizeFactor(nextValue: string, currentValue: number) {
  const nextNumeric = normalizePositiveNumber(nextValue)
  const currentNumeric = normalizePositiveNumber(currentValue)
  if (!nextNumeric || !currentNumeric) return null
  const factor = nextNumeric / currentNumeric
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) {
    return null
  }
  return factor
}

export function resolveReplaceArtworkLibraryLabelKey(scope: ReplaceArtworkLibraryScope) {
  if (scope === "tenant") return "shared" as const
  if (scope === "owned") return "personal" as const
  return scope
}

export function resolveReplacementImageScale(args: {
  currentScaleX: number
  currentScaleY: number
  currentIntrinsicSize?: ArtworkIntrinsicSize | null
  nextIntrinsicSize?: ArtworkIntrinsicSize | null
}) {
  const currentWidth = normalizePositiveNumber(args.currentIntrinsicSize?.width)
  const currentHeight = normalizePositiveNumber(args.currentIntrinsicSize?.height)
  const nextWidth = normalizePositiveNumber(args.nextIntrinsicSize?.width)
  const nextHeight = normalizePositiveNumber(args.nextIntrinsicSize?.height)
  if (!currentWidth || !currentHeight || !nextWidth || !nextHeight) {
    return {
      scaleX: args.currentScaleX,
      scaleY: args.currentScaleY,
    }
  }

  const displayedWidth = currentWidth * Math.abs(Number(args.currentScaleX || 1))
  const displayedHeight = currentHeight * Math.abs(Number(args.currentScaleY || 1))
  const preserveSignX = Number(args.currentScaleX || 1) < 0 ? -1 : 1
  const preserveSignY = Number(args.currentScaleY || 1) < 0 ? -1 : 1

  return {
    scaleX: (displayedWidth / nextWidth) * preserveSignX,
    scaleY: (displayedHeight / nextHeight) * preserveSignY,
  }
}

export function resolveLayerSizeModalResizeFactors(args: {
  mode: "image" | "text"
  measurement?: EditableMeasurement | null
  draft: { width: string; height: string }
}) {
  const currentWidth = normalizePositiveNumber(args.measurement?.width)
  const currentHeight = normalizePositiveNumber(args.measurement?.height)
  if (!currentWidth || !currentHeight) {
    return {
      widthFactor: null,
      heightFactor: null,
    }
  }

  const rawWidthFactor = resolveResizeFactor(args.draft.width, currentWidth)
  const heightFactor = resolveResizeFactor(args.draft.height, currentHeight)
  if (args.mode === "image") {
    return {
      widthFactor: rawWidthFactor,
      heightFactor,
    }
  }

  // Text content height changes font size, which also changes content width.
  const compensatedWidthFactor = rawWidthFactor
    ? rawWidthFactor / (heightFactor || 1)
    : (heightFactor ? (1 / heightFactor) : null)

  return {
    widthFactor: compensatedWidthFactor && Math.abs(compensatedWidthFactor - 1) >= 0.001
      ? compensatedWidthFactor
      : null,
    heightFactor,
  }
}

export function resolveImageSpreadDesignArea(args: {
  targetArea: ImageSpreadTargetArea
  templateWidth: number
  templateHeight: number
  templateBox?: DesignAreaBox | null
}) {
  const templateWidth = normalizePositiveNumber(args.templateWidth)
  const templateHeight = normalizePositiveNumber(args.templateHeight)
  const fullCanvas = {
    left: 0,
    top: 0,
    width: templateWidth || 0,
    height: templateHeight || 0,
  }
  const normalizedFullCanvas = clampBoxToCanvas(fullCanvas, fullCanvas)
  if (!normalizedFullCanvas) {
    return fullCanvas
  }

  if (args.targetArea === "part-bounds") {
    if (args.templateBox) {
      return {
        left: Number(args.templateBox.left || 0),
        top: Number(args.templateBox.top || 0),
        width: Number(args.templateBox.width || 0),
        height: Number(args.templateBox.height || 0),
      }
    }
    return normalizedFullCanvas
  }

  if (args.templateBox) {
    return {
      left: Number(args.templateBox.left || 0),
      top: Number(args.templateBox.top || 0),
      width: Number(args.templateBox.width || 0),
      height: Number(args.templateBox.height || 0),
    }
  }
  return normalizedFullCanvas
}

export function resolveSpreadToDesignAreaTransform(args: {
  designArea: DesignAreaBox
  sourceWidth: number
  sourceHeight: number
  currentScaleX: number
  currentScaleY: number
}) {
  const designWidth = normalizePositiveNumber(args.designArea.width)
  const designHeight = normalizePositiveNumber(args.designArea.height)
  const safeDesignWidth = designWidth || 0
  const safeDesignHeight = designHeight || 0
  const sourceWidth = normalizePositiveNumber(args.sourceWidth)
  const sourceHeight = normalizePositiveNumber(args.sourceHeight)
  const flipX = Number(args.currentScaleX || 1) < 0 ? -1 : 1
  const flipY = Number(args.currentScaleY || 1) < 0 ? -1 : 1
  if (!designWidth || !designHeight || !sourceWidth || !sourceHeight) {
    return {
      left: Number(args.designArea.left || 0) + (safeDesignWidth / 2),
      top: Number(args.designArea.top || 0) + (safeDesignHeight / 2),
      scaleX: 1 * flipX,
      scaleY: 1 * flipY,
    }
  }

  const stretchScaleX = designWidth / sourceWidth
  const stretchScaleY = designHeight / sourceHeight
  if (!Number.isFinite(stretchScaleX) || stretchScaleX <= 0 || !Number.isFinite(stretchScaleY) || stretchScaleY <= 0) {
    return {
      left: Number(args.designArea.left || 0) + (designWidth / 2),
      top: Number(args.designArea.top || 0) + (designHeight / 2),
      scaleX: 1 * flipX,
      scaleY: 1 * flipY,
    }
  }

  return {
    left: Number(args.designArea.left || 0) + (designWidth / 2),
    top: Number(args.designArea.top || 0) + (designHeight / 2),
    scaleX: stretchScaleX * flipX,
    scaleY: stretchScaleY * flipY,
  }
}

export function resolveArtworkLoadCandidates(input: ArtworkLoadCandidate) {
  const seen = new Set<string>()
  return [input.src, input.previewSrc]
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}
