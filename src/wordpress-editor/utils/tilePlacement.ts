export type TilePlacementMode =
  | "single"
  | "tile-basic"
  | "tile-horizontal"
  | "tile-vertical"
  | "tile-mirror"

export type TilePlacementFrame = {
  left: number
  top: number
  width: number
  height: number
}

export type TilePlacement = {
  left: number
  top: number
  scaleX: number
  scaleY: number
}

function resolveRepeatReach(
  frameBox: TilePlacementFrame,
  boundsWidth: number,
  boundsHeight: number,
  stepLength: number,
) {
  if (!Number.isFinite(stepLength) || stepLength <= 0) {
    return 0
  }
  const frameDiagonal = Math.hypot(Math.max(frameBox.width, 0), Math.max(frameBox.height, 0))
  const boundsDiagonal = Math.hypot(Math.max(boundsWidth, 0), Math.max(boundsHeight, 0))
  return Math.max(1, Math.ceil((frameDiagonal + boundsDiagonal) / stepLength) + 1)
}

export function buildImageTilePlacements(args: {
  mode: TilePlacementMode
  frameBox: TilePlacementFrame
  baseLeft: number
  baseTop: number
  baseScaleX: number
  baseScaleY: number
  angle: number
  objectWidth: number
  objectHeight: number
  boundsWidth: number
  boundsHeight: number
}) {
  const {
    mode,
    frameBox,
    baseLeft,
    baseTop,
    baseScaleX,
    baseScaleY,
    angle,
    objectWidth,
    objectHeight,
    boundsWidth,
    boundsHeight,
  } = args
  if (mode === "single") return [] as TilePlacement[]
  const tileWidth = Math.max(Math.abs(objectWidth * baseScaleX), 1)
  const tileHeight = Math.max(Math.abs(objectHeight * baseScaleY), 1)
  const radians = (Number(angle || 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const columnVector = {
    left: tileWidth * cos,
    top: tileWidth * sin,
  }
  const rowVector = {
    left: tileHeight * -sin,
    top: tileHeight * cos,
  }
  const maxColumns = mode === "tile-vertical"
    ? 0
    : resolveRepeatReach(frameBox, boundsWidth, boundsHeight, Math.hypot(columnVector.left, columnVector.top))
  const maxRows = mode === "tile-horizontal"
    ? 0
    : resolveRepeatReach(frameBox, boundsWidth, boundsHeight, Math.hypot(rowVector.left, rowVector.top))
  const placements: TilePlacement[] = []
  for (let row = -maxRows; row <= maxRows; row += 1) {
    for (let col = -maxColumns; col <= maxColumns; col += 1) {
      if (row === 0 && col === 0) continue
      if (mode === "tile-horizontal" && row !== 0) continue
      if (mode === "tile-vertical" && col !== 0) continue
      const left = baseLeft + (col * columnVector.left) + (row * rowVector.left)
      const top = baseTop + (col * columnVector.top) + (row * rowVector.top)
      const objectLeft = left - (boundsWidth / 2)
      const objectTop = top - (boundsHeight / 2)
      const intersectsFrame = objectLeft <= frameBox.left + frameBox.width
        && objectLeft + boundsWidth >= frameBox.left
        && objectTop <= frameBox.top + frameBox.height
        && objectTop + boundsHeight >= frameBox.top
      if (!intersectsFrame) continue
      placements.push({
        left,
        top,
        scaleX: mode === "tile-mirror" && Math.abs(col) % 2 === 1 ? baseScaleX * -1 : baseScaleX,
        scaleY: mode === "tile-mirror" && Math.abs(row) % 2 === 1 ? baseScaleY * -1 : baseScaleY,
      })
    }
  }
  return placements
}
