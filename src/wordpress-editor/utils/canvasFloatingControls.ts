export type CanvasRect = {
  left: number
  top: number
  width: number
  height: number
}

export type FloatingControlName = "clone" | "delete" | "move" | "rotate" | "scale"

export type FloatingDomButtonMetrics = {
  width: number
  height: number
}

export function offsetFloatingDomAnchor(options: {
  control: FloatingControlName
  anchor: { left: number; top: number }
  offsetX: number
  offsetY?: number
}) {
  const offsetY = options.offsetY ?? options.offsetX
  switch (options.control) {
    case "clone":
      return {
        left: options.anchor.left - options.offsetX,
        top: options.anchor.top - offsetY,
      }
    case "delete":
      return {
        left: options.anchor.left + options.offsetX,
        top: options.anchor.top - offsetY,
      }
    case "move":
      return {
        left: options.anchor.left - options.offsetX,
        top: options.anchor.top + offsetY,
      }
    case "scale":
      return {
        left: options.anchor.left + options.offsetX,
        top: options.anchor.top + offsetY,
      }
    case "rotate":
    default:
      return {
        left: options.anchor.left,
        top: options.anchor.top - offsetY,
      }
  }
}

function resolveOverflow(targetBounds: CanvasRect, frameBounds: CanvasRect) {
  const frameRight = frameBounds.left + frameBounds.width
  const frameBottom = frameBounds.top + frameBounds.height
  const targetRight = targetBounds.left + targetBounds.width
  const targetBottom = targetBounds.top + targetBounds.height
  return (
    targetBounds.left < frameBounds.left
    || targetBounds.top < frameBounds.top
    || targetRight > frameRight
    || targetBottom > frameBottom
  )
}

export function computeFloatingControlPosition(options: {
  control: FloatingControlName
  targetBounds: CanvasRect
  frameBounds: CanvasRect
  cornerSize: number
  controlOffset?: number
  framePadding?: number
}) {
  const framePadding = options.framePadding ?? 8
  const controlRadius = options.cornerSize / 2
  const controlOffset = options.controlOffset ?? Math.max(8, controlRadius + 8)
  const frameLeft = options.frameBounds.left
  const frameTop = options.frameBounds.top
  const frameRight = frameLeft + options.frameBounds.width
  const frameBottom = frameTop + options.frameBounds.height
  const targetRight = options.targetBounds.left + options.targetBounds.width
  const targetBottom = options.targetBounds.top + options.targetBounds.height
  const preferredPositions: Record<FloatingControlName, { x: number; y: number }> = {
    clone: {
      x: options.targetBounds.left - controlOffset,
      y: options.targetBounds.top - controlOffset,
    },
    move: {
      x: options.targetBounds.left - controlOffset,
      y: targetBottom + controlOffset,
    },
    rotate: {
      x: options.targetBounds.left + (options.targetBounds.width / 2),
      y: options.targetBounds.top - controlOffset,
    },
    delete: {
      x: targetRight + controlOffset,
      y: options.targetBounds.top - controlOffset,
    },
    scale: {
      x: targetRight + controlOffset,
      y: targetBottom + controlOffset,
    },
  }
  const preferred = preferredPositions[options.control]
  const minX = frameLeft + framePadding + controlRadius
  const maxX = frameRight - framePadding - controlRadius
  const minY = frameTop + framePadding + controlRadius
  const maxY = frameBottom - framePadding - controlRadius
  const clampedX = Math.min(Math.max(preferred.x, minX), maxX)
  const clampedY = Math.min(Math.max(preferred.y, minY), maxY)
  const overflow = resolveOverflow(options.targetBounds, options.frameBounds)
  return {
    x: clampedX,
    y: clampedY,
    pinnedToFrame: overflow || clampedX !== preferred.x || clampedY !== preferred.y,
  }
}

export function computeFloatingDomButtonPosition(options: {
  control: FloatingControlName
  anchor: { left: number; top: number }
  buttonMetrics: FloatingDomButtonMetrics
  overlayBounds: CanvasRect
  gap?: number
}) {
  const gap = options.gap ?? 8
  const anchor = offsetFloatingDomAnchor({
    control: options.control,
    anchor: options.anchor,
    offsetX: (options.buttonMetrics.width / 2) + gap,
    offsetY: (options.buttonMetrics.height / 2) + gap,
  })
  let left = anchor.left - (options.buttonMetrics.width / 2)
  let top = anchor.top - (options.buttonMetrics.height / 2)
  const maxLeft = options.overlayBounds.left + Math.max(options.overlayBounds.width - options.buttonMetrics.width, 0)
  const maxTop = options.overlayBounds.top + Math.max(options.overlayBounds.height - options.buttonMetrics.height, 0)
  return {
    left: Math.min(Math.max(left, options.overlayBounds.left), maxLeft),
    top: Math.min(Math.max(top, options.overlayBounds.top), maxTop),
  }
}
