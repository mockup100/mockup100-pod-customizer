export type AlignmentBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type AlignmentBox = {
  left: number
  top: number
  width: number
  height: number
}

function isFinitePositive(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
}

export function resolveAlphaBounds(imageData: ImageData, alphaThreshold = 1): AlignmentBounds | null {
  const width = Number(imageData?.width || 0)
  const height = Number(imageData?.height || 0)
  if (!isFinitePositive(width) || !isFinitePositive(height)) {
    return null
  }
  const data = imageData.data
  if (!data?.length) {
    return null
  }
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[((y * width) + x) * 4 + 3]
      if (alpha < alphaThreshold) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) {
    return null
  }
  return {
    x: minX,
    y: minY,
    width: (maxX - minX) + 1,
    height: (maxY - minY) + 1,
  }
}

export function buildFrameAlignedBox(args: {
  bounds: AlignmentBounds
  sourceWidth: number
  sourceHeight: number
  frame: AlignmentBox
}): AlignmentBox | null {
  const { bounds, sourceWidth, sourceHeight, frame } = args
  if (
    !isFinitePositive(bounds.width) ||
    !isFinitePositive(bounds.height) ||
    !isFinitePositive(sourceWidth) ||
    !isFinitePositive(sourceHeight) ||
    !isFinitePositive(frame.width) ||
    !isFinitePositive(frame.height)
  ) {
    return null
  }
  return {
    left: frame.left + ((bounds.x / sourceWidth) * frame.width),
    top: frame.top + ((bounds.y / sourceHeight) * frame.height),
    width: (bounds.width / sourceWidth) * frame.width,
    height: (bounds.height / sourceHeight) * frame.height,
  }
}

export function buildReferenceTransform(args: {
  sourceWidth: number
  sourceHeight: number
  targetBox: AlignmentBox
}): AlignmentBox | null {
  const { sourceWidth, sourceHeight, targetBox } = args
  if (
    !isFinitePositive(sourceWidth) ||
    !isFinitePositive(sourceHeight) ||
    !isFinitePositive(targetBox.width) ||
    !isFinitePositive(targetBox.height)
  ) {
    return null
  }
  return {
    left: targetBox.left,
    top: targetBox.top,
    width: targetBox.width,
    height: targetBox.height,
  }
}

export function boxesNearlyEqual(left: AlignmentBox, right: AlignmentBox, epsilon = 0.5) {
  return (
    Math.abs(left.left - right.left) <= epsilon &&
    Math.abs(left.top - right.top) <= epsilon &&
    Math.abs(left.width - right.width) <= epsilon &&
    Math.abs(left.height - right.height) <= epsilon
  )
}
