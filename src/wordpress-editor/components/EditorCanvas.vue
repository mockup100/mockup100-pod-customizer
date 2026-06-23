<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { Canvas, FabricImage, FabricObject, Line, Rect, Textbox, loadSVGFromString, loadSVGFromURL, util } from "fabric"
import {
  DEFAULT_NEW_TEXT_CONTENT,
  DEFAULT_IMAGE_OPACITY,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_LINE_HEIGHT,
  normalizeImageOpacity,
  normalizeTextFontSize,
  normalizeTextFontFamily,
  normalizeTextLineHeight,
} from "../utils/editorLayerStyles"
import {
  buildHorizontalRulerTicks,
  buildVerticalRulerTicks,
  convertTemplatePixelsToDisplayUnit,
  formatUnitNumber,
  resolveCanvasPhysicalDimension,
  type DisplayPhysicalMeasurement,
  type PhysicalDimensionsValue,
  type ViewGeometryValue,
} from "../utils/physicalRuler"
import { resolveAssetUrl, type PhysicalDisplayUnit, type TemplatePartPixelBoxes, type TemplatePixelBox } from "../api/client"
import { resolveDisplayName } from "../utils/displayNames"
import {
  boxesNearlyEqual,
  buildFrameAlignedBox,
  buildReferenceTransform,
  resolveAlphaBounds,
  type AlignmentBox,
  type AlignmentBounds,
} from "../utils/referenceAlignment"
import { buildImageTilePlacements, type TilePlacementMode } from "../utils/tilePlacement"
import { findMatchingPreviewShortcut, listPreviewShortcuts } from "../utils/previewShortcuts"
import {
  resolveArtworkLoadCandidates,
  resolveImageSpreadDesignArea,
  resolveSpreadToDesignAreaTransform,
  type ImageSpreadTargetArea,
} from "../utils/previewImageEditing"
import { computeFloatingDomButtonPosition } from "../utils/canvasFloatingControls"

const props = defineProps<{
  imageUrl?: string
  svgUrl?: string
  guideUrl?: string
  cutoutUrl?: string
  selectedPartKey?: string
  parts?: EditorPart[]
  templateSize?: string
  physicalDimensionsCm?: PhysicalDimensionsValue
  partPixelBoxes?: TemplatePartPixelBoxes
  displayUnit?: PhysicalDisplayUnit
  locale?: "en" | "zh"
  viewGeometry?: ViewGeometryValue
  selectedColor?: string
  selectedView?: string
  stageBackgroundColor?: string
  partBackgroundColors?: Record<string, string>
  zoomLevel?: number
  showGrid?: boolean
}>()
const previewCanvasShortcuts = listPreviewShortcuts("canvas")
const emit = defineEmits<{
  selectionChange: [payload: {
    partKey: string
    hasObject: boolean
    layerId: string
    layerCount: number
    layerKind: CanvasLayerKind | ""
    selectionSource: SelectionSource
    selectionAction: SelectionAction
    openTextInspector: boolean
    openLayersInspector: boolean
    textState: TextLayerState | null
    imageState: ImageLayerState | null
  }]
  stateChange: [payload: {
    signature: string
    hasArtwork: boolean
    canUndo: boolean
    canRedo: boolean
    source: StateChangeSource
    suppressAutoPreview?: boolean
  }]
  imageContextMenu: [payload: {
    left: number
    top: number
    partKey: string
    layerId: string
    layerKind: CanvasLayerKind
  } | null]
  // 0.4.66: image layer 资源加载失败时（OSS 资源被 TTL 清理后客户端缓存仍引用），
  // 通知父组件清理该 layer 在 localStorage / IndexedDB 中的持久化引用，
  // 避免下次进入再次触发同一份 404，并让本次导出 / 渲染跳过该层而不是整体失败。
  artworkLoadFailure: [payload: {
    partKey: string
    layerId: string
    src: string
    previewSrc?: string
    stage: "draw" | "export"
  }]
}>()

type CanvasLayerKind = "image" | "text"
type SelectionSource = "canvas" | "layers" | "programmatic"
type SelectionAction =
  | "canvas-click-image"
  | "canvas-click-text"
  | "canvas-dblclick-text"
  | "layers-select"
  | "programmatic"
type StateChangeSource = "sync" | "user" | "undo" | "redo" | "restore"

type TextLayerState = {
  text: string
  fontSize: number
  fill: string
  fontWeight: string
  fontStyle: string
  textAlign: "left" | "center" | "right"
  fontFamily: string
  lineHeight: number
}

type PixelDimensionMeasurement = {
  width: number
  height: number
  label: string
}

type DimensionAnchor = {
  left: number
  top: number
}

type DomOverlayButtonKey = "clone" | "delete" | "move" | "rotate" | "scale"

type DomOverlayButtonAnchors = Record<DomOverlayButtonKey, DimensionAnchor | null>

type DomOverlayButtonMetrics = {
  width: number
  height: number
}

type SelectionOutlineAnchors = {
  topLeft: DimensionAnchor
  topRight: DimensionAnchor
  bottomLeft: DimensionAnchor
  bottomRight: DimensionAnchor
  topCenter: DimensionAnchor
}

type DomOverlayDragMode = "move" | "rotate" | "scale"

type DomOverlayDragState = {
  key: DomOverlayButtonKey
  mode: DomOverlayDragMode
  target: ActiveCanvasObject
  startPointer: DimensionAnchor
  startCenter: DimensionAnchor
  startAngle: number
  startPointerAngle: number
  startScaleX: number
  startScaleY: number
  startUniformImageScale: number
  startDistance: number
  startLocalPointer: DimensionAnchor
  moved: boolean
}

type CanvasSelectionBounds = {
  left: number
  top: number
  width: number
  height: number
}

type CanvasLayerGeometryState = {
  boundingBoxPx: PixelDimensionMeasurement | null
  boundingBoxDisplay: DisplayPhysicalMeasurement | null
  anchorTopLeft: DimensionAnchor | null
  anchorTopRight: DimensionAnchor | null
  canvasBounds: CanvasSelectionBounds | null
}

type SvgFillLayerState = {
  id: string
  label: string
  tagName: string
  originalFill: string
  currentFill: string
  source: "style" | "attr"
}

type ImageTileMode = "single" | "tile-basic" | "tile-horizontal" | "tile-vertical" | "tile-mirror"

type ImageLayerState = {
  opacity: number
  tileMode: ImageTileMode
  geometry: CanvasLayerGeometryState | null
  imageBoxPx: PixelDimensionMeasurement | null
  imageBoxDisplay: DisplayPhysicalMeasurement | null
  rulerBoxPx: PixelDimensionMeasurement | null
  rulerBoxDisplay: DisplayPhysicalMeasurement | null
  isSvg: boolean
  svgFill: string | null
  svgLayers: SvgFillLayerState[]
  activeSvgLayerId: string | null
}

type TextContentMetricsState = {
  px: PixelDimensionMeasurement | null
  display: DisplayPhysicalMeasurement | null
}

type TextMetricsState = {
  geometry: CanvasLayerGeometryState | null
  textboxPx: PixelDimensionMeasurement | null
  textboxDisplay: DisplayPhysicalMeasurement | null
  rulerBoxPx: PixelDimensionMeasurement | null
  rulerBoxDisplay: DisplayPhysicalMeasurement | null
  textContent: TextContentMetricsState | null
  textContentGeometry: CanvasLayerGeometryState | null
}

type BaseLayer = {
  id: string
  kind: CanvasLayerKind
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
}

type ImageLayer = BaseLayer & {
  kind: "image"
  src: string
  previewSrc?: string
  svgMarkup?: string
  svgFill?: string
  svgLayers?: SvgFillLayerState[]
  name?: string
  libraryScope?: "owned" | "platform" | "tenant" | "licensed"
  artworkId?: string
  hidden?: boolean
  opacity: number
  tileMode?: ImageTileMode
}

type TextLayer = Omit<BaseLayer, "src"> & {
  kind: "text"
  hidden?: boolean
  name?: string
  text: string
  styles?: unknown
  fontSize: number
  fill: string
  fontWeight: string
  fontStyle: string
  textAlign: "left" | "center" | "right"
  fontFamily: string
  lineHeight: number
  width: number
}

type OverlayLayer = ImageLayer | TextLayer
type SerializableCanvasState = {
  version: 1
  activePartKey: string
  activeLayerId: string
  parts: Array<{
    partKey: string
    layers: OverlayLayer[]
  }>
}

const CANVAS_I18N = {
  en: {
    text: "Text",
    uploadArtworkHint: "Upload artwork and edit the active part here",
    boundingBoxSize: "Bounding Box Size",
    imageSize: "Image Size (Actual)",
    textContentSize: "Text Content Size (Actual)",
  },
  zh: {
    text: "文字",
    uploadArtworkHint: "在这里上传图片并编辑当前面",
    boundingBoxSize: "包围盒尺寸",
    imageSize: "图片尺寸（真实尺寸）",
    textContentSize: "文字内容尺寸（真实尺寸）",
  },
} as const

function canvasText(key: keyof typeof CANVAS_I18N.en) {
  const locale = props.locale === "zh" ? "zh" : "en"
  return CANVAS_I18N[locale][key] || CANVAS_I18N.en[key]
}

type ActiveCanvasObject = (FabricImage | Textbox) & {
  partKey?: string
  layerId?: string
  layerKind?: CanvasLayerKind
  isTileClone?: boolean
}

type FabricCanvasLike = {
  getZoom?: () => number
  getObjects: () => unknown[]
  getActiveObject: () => unknown
  calcOffset: () => void
  requestRenderAll?: () => void
}

const GOOGLE_FONT_URL_MAP: Record<string, Record<string, string>> = {
  VT323: {
    normal: "url(https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJXUdVNF.woff2)",
  },
  Pacifico: {
    normal: "url(https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6H6MmBp0u-.woff2)",
  },
  Lato: {
    "100": "url(https://fonts.gstatic.com/s/lato/v24/S6u8w4BMUTPHh30AXC-qNiXg7Q.woff2)",
    "900": "url(https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2)",
  },
}

const loadedCanvasFontFaces = new Set<string>()

function resolveGoogleFontWeightKey(fontFamily: string, fontWeight: string) {
  if (fontFamily !== "Lato") {
    return "normal"
  }
  const normalized = (fontWeight || "").toLowerCase()
  if (normalized.includes("900") || normalized === "bold") {
    return "900"
  }
  if (normalized.includes("100")) {
    return "100"
  }
  return "100"
}

async function ensureCanvasFontLoaded(fontFamily: string, fontWeight: string) {
  if (typeof window === "undefined") return
  if (typeof FontFace === "undefined") return
  if (!document?.fonts) return

  const family = String(fontFamily || "").trim()
  if (!family || !(family in GOOGLE_FONT_URL_MAP)) return

  const weightKey = resolveGoogleFontWeightKey(family, fontWeight)
  const url = GOOGLE_FONT_URL_MAP[family]?.[weightKey]
  if (!url) return

  const cacheKey = `${family}:${weightKey}`
  if (loadedCanvasFontFaces.has(cacheKey)) {
    return
  }

  const fontFace = new FontFace(family, url, {
    style: "normal",
    weight: weightKey === "normal" ? "normal" : weightKey,
  })
  await fontFace.load()
  document.fonts.add(fontFace)
  loadedCanvasFontFaces.add(cacheKey)
  await document.fonts.load(`${weightKey === "normal" ? "normal" : weightKey} 16px "${family}"`)
}

async function preloadCanvasFonts(layers: OverlayLayer[]) {
  const tasks: Array<Promise<void>> = []
  const seen = new Set<string>()
  for (const layer of layers) {
    if (layer.kind !== "text") continue
    const family = String(layer.fontFamily || "").trim()
    if (!family || !(family in GOOGLE_FONT_URL_MAP)) continue
    const weightKey = resolveGoogleFontWeightKey(family, layer.fontWeight || "")
    const cacheKey = `${family}:${weightKey}`
    if (seen.has(cacheKey)) continue
    seen.add(cacheKey)
    tasks.push(ensureCanvasFontLoaded(family, layer.fontWeight || ""))
  }
  await Promise.all(tasks)
}

type StageFrame = {
  left: number
  top: number
  width: number
  height: number
  templateWidth: number
  templateHeight: number
  displayScale: number
}

type EditorPart = {
  part_name: string
  cutout_url: string
  guide_url: string
  svg_url?: string
  part_display_name?: string
}

type PartReferenceAlignment = {
  kind: "identity" | "transformed"
  previewBox: AlignmentBox
  templateBox: AlignmentBox
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLDivElement | null>(null)
const fabricCanvas = ref<Canvas | null>(null)
const overlayState = new Map<string, OverlayLayer[]>()
const partBlobExportCache = new Map<string, { blob: Blob; signature: string }>()
const undoStack: SerializableCanvasState[] = []
const redoStack: SerializableCanvasState[] = []
const activePartKey = ref("")
const activeLayerId = ref("")
const svgObjectUrlCache = new Map<string, string>()
const guideAlphaBoundsCache = new Map<string, Promise<{ bounds: AlignmentBounds; width: number; height: number } | null>>()
const partAlignmentState = new Map<string, PartReferenceAlignment>()
let drawSceneToken = 0
let stageResizeObserver: ResizeObserver | null = null
let pointerOffsetRaf = 0
let canvasPointerDownListener: ((event: Event) => void) | null = null
let canvasPointerMoveListener: ((event: Event) => void) | null = null
let canvasContextMenuListener: ((event: MouseEvent) => void) | null = null
let documentPointerDownListener: ((event: Event) => void) | null = null
let domOverlayPointerMoveListener: ((event: Event) => void) | null = null
let domOverlayPointerUpListener: ((event: Event) => void) | null = null
const activeImageMetrics = ref<ImageLayerState | null>(null)
const activeTextMetrics = ref<(TextLayerState & TextMetricsState) | null>(null)
const overlayControlAnchors = ref<{ image: DimensionAnchor | null; text: DimensionAnchor | null; size: DimensionAnchor | null; rotation: DimensionAnchor | null }>({
  image: null,
  text: null,
  size: null,
  rotation: null,
})
function createEmptyDomOverlayButtonAnchors(): DomOverlayButtonAnchors {
  return {
    clone: null,
    delete: null,
    move: null,
    rotate: null,
    scale: null,
  }
}

function createDefaultDomOverlayButtonMetrics(): Record<DomOverlayButtonKey, DomOverlayButtonMetrics> {
  return {
    clone: { width: 34, height: 34 },
    delete: { width: 34, height: 34 },
    move: { width: 34, height: 34 },
    rotate: { width: 34, height: 34 },
    scale: { width: 34, height: 34 },
  }
}

const domOverlayButtonAnchors = ref<DomOverlayButtonAnchors>(createEmptyDomOverlayButtonAnchors())
const domOverlayButtonMetrics = ref<Record<DomOverlayButtonKey, DomOverlayButtonMetrics>>(createDefaultDomOverlayButtonMetrics())
const domOverlayDragState = ref<DomOverlayDragState | null>(null)
const domOverlaySuppressedClickKey = ref<DomOverlayButtonKey | null>(null)
const domOverlaySelectionState = ref<{
  visible: boolean
  partKey: string
  layerId: string
  layerKind: CanvasLayerKind | ""
}>({
  visible: false,
  partKey: "",
  layerId: "",
  layerKind: "",
})
const domOverlayButtons = [
  { key: "clone", title: "Duplicate current object" },
  { key: "delete", title: "Delete current object" },
  { key: "move", title: "Move current object" },
  { key: "rotate", title: "Rotate current object" },
  { key: "scale", title: "Scale current object" },
] as const
const domOverlayPointButtons = domOverlayButtons.filter((button) => button.key === "rotate")
const FRAME_MAX_SIZE = 580
const RULER_SIZE = 28
const STAGE_PADDING = 14
const FRAME_OFFSET = RULER_SIZE + STAGE_PADDING
const CANVAS_SIZE = FRAME_MAX_SIZE + FRAME_OFFSET + STAGE_PADDING
const DOM_OVERLAY_BUTTON_SIZE = 34
const DOM_OVERLAY_BUTTON_GAP = 1.6
const DOM_OVERLAY_DRAG_THRESHOLD = 3
const DOM_OVERLAY_POINT_SIZE = 10
const canvasSize = computed(() => CANVAS_SIZE)
const editorStageStyle = computed(() => ({
  width: `${canvasSize.value}px`,
  height: `${canvasSize.value}px`,
  minWidth: `${canvasSize.value}px`,
  minHeight: `${canvasSize.value}px`,
  flex: `0 0 ${canvasSize.value}px`,
  aspectRatio: "1 / 1",
  "--editor-frame-left": `${stageFrame.value.left}px`,
  "--editor-frame-top": `${stageFrame.value.top}px`,
  "--editor-frame-width": `${stageFrame.value.width}px`,
  "--editor-frame-height": `${stageFrame.value.height}px`,
}))
const domOverlayStyle = computed(() => ({
  left: "0px",
  top: "0px",
  width: `${canvasSize.value}px`,
  height: `${canvasSize.value}px`,
}))
function buildDomOverlayButtonStyle(anchor: DimensionAnchor | null, key: DomOverlayButtonKey): Record<string, string> {
  if (!anchor) return { display: "none" }
  const frame = stageFrame.value
  const overlayBounds = {
    left: Number(frame.left || 0),
    top: Number(frame.top || 0),
    width: Number(frame.width || CANVAS_SIZE),
    height: Number(frame.height || CANVAS_SIZE),
  }
  const metrics = domOverlayButtonMetrics.value[key] || { width: DOM_OVERLAY_BUTTON_SIZE, height: DOM_OVERLAY_BUTTON_SIZE }
  const position = computeFloatingDomButtonPosition({
    control: key,
    anchor,
    buttonMetrics: metrics,
    overlayBounds,
    gap: DOM_OVERLAY_BUTTON_GAP,
  })
  return {
    left: `${position.left}px`,
    top: `${position.top}px`,
  }
}

function buildDomOverlayPointStyle(anchor: DimensionAnchor | null): Record<string, string> {
  if (!anchor) return { display: "none" }
  return {
    left: `${anchor.left - (DOM_OVERLAY_POINT_SIZE / 2)}px`,
    top: `${anchor.top - (DOM_OVERLAY_POINT_SIZE / 2)}px`,
  }
}

const domOverlayButtonStyles = computed<Record<DomOverlayButtonKey, Record<string, string>>>(() => ({
  clone: buildDomOverlayButtonStyle(domOverlayButtonAnchors.value.clone, "clone"),
  delete: buildDomOverlayButtonStyle(domOverlayButtonAnchors.value.delete, "delete"),
  move: buildDomOverlayButtonStyle(domOverlayButtonAnchors.value.move, "move"),
  rotate: buildDomOverlayButtonStyle(domOverlayButtonAnchors.value.rotate, "rotate"),
  scale: buildDomOverlayButtonStyle(domOverlayButtonAnchors.value.scale, "scale"),
}))
const domOverlayPointStyles = computed<Record<DomOverlayButtonKey, Record<string, string>>>(() => ({
  clone: buildDomOverlayPointStyle(domOverlayButtonAnchors.value.clone),
  delete: buildDomOverlayPointStyle(domOverlayButtonAnchors.value.delete),
  move: buildDomOverlayPointStyle(domOverlayButtonAnchors.value.move),
  rotate: buildDomOverlayPointStyle(domOverlayButtonAnchors.value.rotate),
  scale: buildDomOverlayPointStyle(domOverlayButtonAnchors.value.scale),
}))
const ARTWORK_FIT_RATIO = 0.82
const GRID_DIVISIONS = 8
const HISTORY_LIMIT = 100

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getActiveOverlay(targetRef?: { layerId?: string; partKey?: string }) {
  const canvas = fabricCanvas.value
  const target = canvas?.getActiveObject() as ActiveCanvasObject | undefined
  if (target) return target
  const fallbackLayerId = String(targetRef?.layerId || activeLayerId.value || "").trim()
  const fallbackPartKey = String(targetRef?.partKey || activePartKey.value || props.selectedPartKey || "").trim()
  return findVisibleOverlay(fallbackLayerId, fallbackPartKey) || null
}

function findVisibleOverlay(layerId: string, partKey?: string) {
  const canvas = fabricCanvas.value
  if (!canvas || !layerId) return null
  const target = canvas.getObjects().find((item) => {
    const candidate = item as ActiveCanvasObject
    return candidate.layerId === layerId
      && !candidate.isTileClone
      && (!partKey || candidate.partKey === partKey)
  }) as ActiveCanvasObject | undefined
  return target || null
}

function getCurrentLayer(partKey: string, layerId: string) {
  return (overlayState.get(partKey) || []).find((item) => item.id === layerId) || null
}

function emitImageContextMenu(target: ActiveCanvasObject | null, event: MouseEvent) {
  if (!target?.layerId || !target?.layerKind) {
    emit("imageContextMenu", null)
    return
  }
  emit("imageContextMenu", {
    left: Number(event.clientX || 0),
    top: Number(event.clientY || 0),
    partKey: String(target.partKey || props.selectedPartKey || activePartKey.value || ""),
    layerId: String(target.layerId || activeLayerId.value || ""),
    layerKind: target.layerKind,
  })
}

function signatureToken(value: string | undefined) {
  const normalized = String(value || "")
  let hash = 2166136261
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `len:${normalized.length}:h:${(hash >>> 0).toString(16)}`
}

function buildTextState(layer: TextLayer): TextLayerState {
  return {
    text: layer.text,
    fontSize: layer.fontSize,
    fill: layer.fill,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    textAlign: layer.textAlign,
    fontFamily: layer.fontFamily,
    lineHeight: layer.lineHeight,
  }
}

function buildImageState(layer: ImageLayer): ImageLayerState {
  const svgLayers = resolveSvgFillLayers(layer)
  return {
    opacity: layer.opacity,
    tileMode: resolveImageTileMode(layer),
    geometry: null,
    imageBoxPx: null,
    imageBoxDisplay: null,
    rulerBoxPx: null,
    rulerBoxDisplay: null,
    isSvg: Boolean(layer.svgMarkup || isSvgAsset(layer.src)),
    svgFill: svgLayers[0]?.currentFill || layer.svgFill || null,
    svgLayers,
    activeSvgLayerId: svgLayers[0]?.id || null,
  }
}

function roundMeasurement(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0
  return Number(value.toFixed(2))
}

function buildPixelMeasurement(width: number, height: number): PixelDimensionMeasurement | null {
  const safeWidth = roundMeasurement(width)
  const safeHeight = roundMeasurement(height)
  if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight)) return null
  return {
    width: safeWidth,
    height: safeHeight,
    label: `${formatUnitNumber(safeWidth)} × ${formatUnitNumber(safeHeight)} px`,
  }
}

function clampAnchor(anchor: DimensionAnchor): DimensionAnchor {
  return {
    left: Math.max(32, Math.min(anchor.left, CANVAS_SIZE - 32)),
    top: Math.max(56, Math.min(anchor.top, CANVAS_SIZE - 12)),
  }
}

function isFiniteAnchor(anchor: Partial<DimensionAnchor> | null | undefined): anchor is DimensionAnchor {
  if (!anchor) return false
  return Number.isFinite(anchor.left) && Number.isFinite(anchor.top)
}

function buildAnchorFromCoords(point: { x?: number; y?: number } | null | undefined) {
  if (!point) return null
  const nextAnchor = {
    left: Number(point.x),
    top: Number(point.y),
  }
  return isFiniteAnchor(nextAnchor) ? clampAnchor(nextAnchor) : null
}

function buildMidpointAnchor(left: DimensionAnchor, right: DimensionAnchor) {
  return clampAnchor({
    left: (left.left + right.left) / 2,
    top: (left.top + right.top) / 2,
  })
}

function resolveTargetOutlineAnchors(target: ActiveCanvasObject): SelectionOutlineAnchors | null {
  target.setCoords()
  const controlCoords = (target as ActiveCanvasObject & {
    oCoords?: Partial<Record<"tl" | "tr" | "bl" | "br" | "mt", { x?: number; y?: number }>>
  }).oCoords
  const topLeft = buildAnchorFromCoords(controlCoords?.tl)
  const topRight = buildAnchorFromCoords(controlCoords?.tr)
  const bottomLeft = buildAnchorFromCoords(controlCoords?.bl)
  const bottomRight = buildAnchorFromCoords(controlCoords?.br)
  const topCenter = buildAnchorFromCoords(controlCoords?.mt)
    || (topLeft && topRight ? buildMidpointAnchor(topLeft, topRight) : null)
  if (topLeft && topRight && bottomLeft && bottomRight && topCenter) {
    return {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      topCenter,
    }
  }
  const halfWidth = Math.max(Number(target.width || 0) / 2, 0)
  const halfHeight = Math.max(Number(target.height || 0) / 2, 0)
  const matrix = target.calcTransformMatrix()
  const corners = {
    topLeft: util.transformPoint({ x: -halfWidth, y: -halfHeight }, matrix),
    topRight: util.transformPoint({ x: halfWidth, y: -halfHeight }, matrix),
    bottomLeft: util.transformPoint({ x: -halfWidth, y: halfHeight }, matrix),
    bottomRight: util.transformPoint({ x: halfWidth, y: halfHeight }, matrix),
    topCenter: util.transformPoint({ x: 0, y: -halfHeight }, matrix),
  }
  const resolvedTopLeft = buildAnchorFromCoords(corners.topLeft)
  const resolvedTopRight = buildAnchorFromCoords(corners.topRight)
  const resolvedBottomLeft = buildAnchorFromCoords(corners.bottomLeft)
  const resolvedBottomRight = buildAnchorFromCoords(corners.bottomRight)
  const resolvedTopCenter = buildAnchorFromCoords(corners.topCenter)
  if (!resolvedTopLeft || !resolvedTopRight || !resolvedBottomLeft || !resolvedBottomRight || !resolvedTopCenter) {
    return null
  }
  return {
    topLeft: resolvedTopLeft,
    topRight: resolvedTopRight,
    bottomLeft: resolvedBottomLeft,
    bottomRight: resolvedBottomRight,
    topCenter: resolvedTopCenter,
  }
}

function buildDisplayMeasurement(widthPx: number, heightPx: number, frame: StageFrame) {
  return convertTemplatePixelsToDisplayUnit({
    widthPx,
    heightPx,
    physical: canvasPhysicalDimension.value,
    templateWidthPx: frame.templateWidth,
    templateHeightPx: frame.templateHeight,
    unit: props.displayUnit || "cm",
  })
}

function buildGeometryState(target: ActiveCanvasObject, frame: StageFrame): CanvasLayerGeometryState | null {
  const bounds = target.getBoundingRect()
  const outline = resolveTargetOutlineAnchors(target)
  const templateWidth = bounds.width / frame.displayScale
  const templateHeight = bounds.height / frame.displayScale
  return {
    boundingBoxPx: buildPixelMeasurement(templateWidth, templateHeight),
    boundingBoxDisplay: buildDisplayMeasurement(templateWidth, templateHeight, frame),
    anchorTopLeft: outline?.topLeft || clampAnchor({ left: bounds.left, top: bounds.top }),
    anchorTopRight: outline?.topRight || clampAnchor({ left: bounds.left + bounds.width, top: bounds.top }),
    canvasBounds: {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    },
  }
}

function buildObjectMeasurement(target: ActiveCanvasObject, frame: StageFrame) {
  const baseWidth = Number(target.width || 0) * Math.abs(Number(target.scaleX || 1))
  const baseHeight = Number(target.height || 0) * Math.abs(Number(target.scaleY || 1))
  const templateWidth = baseWidth / frame.displayScale
  const templateHeight = baseHeight / frame.displayScale
  return {
    px: buildPixelMeasurement(templateWidth, templateHeight),
    display: buildDisplayMeasurement(templateWidth, templateHeight, frame),
  }
}

type TextContentLocalMeasurement = {
  localBounds: { xMin: number; yMin: number; xMax: number; yMax: number } | null
}

function measureTextContentLocal(target: Textbox): TextContentLocalMeasurement {
  const text = String(target.text || "")
  if (!text.trim()) {
    return { localBounds: null }
  }
  ;(target as Textbox & { initDimensions?: () => void }).initDimensions?.()
  const textTarget = target as Textbox & {
    _getLeftOffset?: () => number
    _getTopOffset?: () => number
    _getLineLeftOffset?: (lineIndex: number) => number
    getLineWidth?: (lineIndex: number) => number
    calcTextHeight?: () => number
    _textLines?: string[][]
  }
  const lineCount = Array.isArray(textTarget._textLines) ? textTarget._textLines.length : 0
  if (!lineCount || typeof textTarget._getLeftOffset !== "function" || typeof textTarget._getTopOffset !== "function") {
    return { localBounds: null }
  }
  const leftBase = Number(textTarget._getLeftOffset() || 0)
  const topBase = Number(textTarget._getTopOffset() || 0)
  let minLineLeft = 0
  let maxLineRight = 0
  for (let index = 0; index < lineCount; index += 1) {
    const lineWidth = Number(textTarget.getLineWidth?.(index) || 0)
    const lineLeft = Number(textTarget._getLineLeftOffset?.(index) || 0)
    const lineRight = lineLeft + lineWidth
    if (index === 0) {
      minLineLeft = lineLeft
      maxLineRight = lineRight
    } else {
      minLineLeft = Math.min(minLineLeft, lineLeft)
      maxLineRight = Math.max(maxLineRight, lineRight)
    }
  }
  const contentHeight = Number(textTarget.calcTextHeight?.() || 0)
  return {
    localBounds: {
      xMin: leftBase + minLineLeft,
      yMin: topBase,
      xMax: leftBase + maxLineRight,
      yMax: topBase + contentHeight,
    },
  }
}

function buildTextContentMetrics(target: Textbox, frame: StageFrame): TextContentMetricsState | null {
  const measured = measureTextContentLocal(target)
  if (!measured.localBounds) {
    return {
      px: buildPixelMeasurement(0, 0),
      display: buildDisplayMeasurement(0, 0, frame),
    }
  }
  const localWidth = Math.max(0, measured.localBounds.xMax - measured.localBounds.xMin)
  const localHeight = Math.max(0, measured.localBounds.yMax - measured.localBounds.yMin)
  const scaledWidth = localWidth * Math.abs(Number(target.scaleX || 1))
  const scaledHeight = localHeight * Math.abs(Number(target.scaleY || 1))
  const templateWidth = scaledWidth / frame.displayScale
  const templateHeight = scaledHeight / frame.displayScale
  return {
    px: buildPixelMeasurement(templateWidth, templateHeight),
    display: buildDisplayMeasurement(templateWidth, templateHeight, frame),
  }
}

function buildTextContentGeometryState(target: Textbox, frame: StageFrame): CanvasLayerGeometryState | null {
  const measured = measureTextContentLocal(target)
  const center = target.getCenterPoint()
  const outline = resolveTargetOutlineAnchors(target)
  if (!measured.localBounds) {
    return {
      boundingBoxPx: buildPixelMeasurement(0, 0),
      boundingBoxDisplay: buildDisplayMeasurement(0, 0, frame),
      anchorTopLeft: outline?.topLeft || clampAnchor({ left: center.x, top: center.y }),
      anchorTopRight: outline?.topRight || clampAnchor({ left: center.x, top: center.y }),
      canvasBounds: {
        left: center.x,
        top: center.y,
        width: 0,
        height: 0,
      },
    }
  }
  const { xMin, yMin, xMax, yMax } = measured.localBounds
  const matrix = target.calcTransformMatrix()
  const corners = [
    { x: xMin, y: yMin },
    { x: xMax, y: yMin },
    { x: xMax, y: yMax },
    { x: xMin, y: yMax },
  ].map((point) => util.transformPoint(point, matrix))
  const bounds = util.makeBoundingBoxFromPoints(corners)
  const templateWidth = bounds.width / frame.displayScale
  const templateHeight = bounds.height / frame.displayScale
  return {
    boundingBoxPx: buildPixelMeasurement(templateWidth, templateHeight),
    boundingBoxDisplay: buildDisplayMeasurement(templateWidth, templateHeight, frame),
    anchorTopLeft: outline?.topLeft || clampAnchor({ left: bounds.left, top: bounds.top }),
    anchorTopRight: outline?.topRight || clampAnchor({ left: bounds.left + bounds.width, top: bounds.top }),
    canvasBounds: {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    },
  }
}

function updateActiveSelectionMetrics() {
  const target = getActiveOverlay()
  const frame = stageFrame.value
  activeImageMetrics.value = null
  activeTextMetrics.value = null
  if (!target) return
  const partKey = target.partKey || activePartKey.value || props.selectedPartKey || ""
  const layerId = target.layerId || activeLayerId.value || ""
  const currentLayer = partKey && layerId ? getCurrentLayer(partKey, layerId) : null
  if (!currentLayer) return
  const geometry = buildGeometryState(target, frame)
  if (currentLayer.kind === "image") {
    const objectMeasurement = buildObjectMeasurement(target, frame)
    activeImageMetrics.value = {
      ...buildImageState(currentLayer),
      geometry,
      imageBoxPx: objectMeasurement.px,
      imageBoxDisplay: objectMeasurement.display,
      rulerBoxPx: geometry?.boundingBoxPx || null,
      rulerBoxDisplay: geometry?.boundingBoxDisplay || null,
    }
    return
  }
  const textState = buildTextState(currentLayer)
  const objectMeasurement = buildObjectMeasurement(target, frame)
  const textContentGeometry = target instanceof Textbox ? buildTextContentGeometryState(target, frame) : null
  activeTextMetrics.value = {
    ...textState,
    geometry,
    textboxPx: objectMeasurement.px,
    textboxDisplay: objectMeasurement.display,
    rulerBoxPx: textContentGeometry?.boundingBoxPx || null,
    rulerBoxDisplay: textContentGeometry?.boundingBoxDisplay || null,
    textContent: target instanceof Textbox ? buildTextContentMetrics(target, frame) : null,
    textContentGeometry,
  }
}

function cloneLayer(layer: OverlayLayer): OverlayLayer {
  if (layer.kind === "image") {
    return {
      ...layer,
      svgLayers: Array.isArray(layer.svgLayers)
        ? layer.svgLayers.map((item) => ({ ...item }))
        : undefined,
    }
  }
  return { ...layer }
}

function cloneSerializableState(state: SerializableCanvasState): SerializableCanvasState {
  return {
    version: 1,
    activePartKey: state.activePartKey,
    activeLayerId: state.activeLayerId,
    parts: state.parts.map((entry) => ({
      partKey: entry.partKey,
      layers: entry.layers.map((layer) => cloneLayer(layer)),
    })),
  }
}

function hasArtworkLayers() {
  return Array.from(overlayState.values()).some((layers) => layers.length > 0)
}

function normalizeTextAlign(value: unknown): "left" | "center" | "right" {
  return value === "left" || value === "right" ? value : "center"
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeImageTileMode(value: unknown): ImageTileMode {
  return value === "tile-basic"
    || value === "tile-horizontal"
    || value === "tile-vertical"
    || value === "tile-mirror"
    ? value
    : "single"
}

function resolveImageTileMode(layer: ImageLayer | null | undefined): ImageTileMode {
  return normalizeImageTileMode(layer?.tileMode)
}

function buildSerializableState(): SerializableCanvasState {
  return {
    version: 1,
    activePartKey: activePartKey.value,
    activeLayerId: activeLayerId.value,
    parts: Array.from(overlayState.entries())
      .filter(([, layers]) => layers.length > 0)
      .map(([partKey, layers]) => ({
        partKey,
        layers: layers.map((layer) => cloneLayer(layer)),
      })),
  }
}

function applySerializableState(state: SerializableCanvasState) {
  overlayState.clear()
  state.parts.forEach((entry) => {
    overlayState.set(entry.partKey, entry.layers.map((layer) => cloneLayer(layer)))
  })
  activePartKey.value = state.activePartKey
  activeLayerId.value = state.activeLayerId
}

function snapshotState() {
  return cloneSerializableState(buildSerializableState())
}

function trimHistoryStack(stack: SerializableCanvasState[]) {
  if (stack.length > HISTORY_LIMIT) {
    stack.splice(0, stack.length - HISTORY_LIMIT)
  }
}

function isSameSerializableState(left: SerializableCanvasState, right: SerializableCanvasState) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function canUndo() {
  return undoStack.length > 0
}

function canRedo() {
  return redoStack.length > 0
}

function clearHistory() {
  undoStack.length = 0
  redoStack.length = 0
}

function recordHistoryChange(before: SerializableCanvasState, after: SerializableCanvasState) {
  if (isSameSerializableState(before, after)) {
    return false
  }
  const previous = cloneSerializableState(before)
  const lastUndo = undoStack[undoStack.length - 1]
  if (!lastUndo || !isSameSerializableState(lastUndo, previous)) {
    undoStack.push(previous)
    trimHistoryStack(undoStack)
  }
  redoStack.length = 0
  return true
}

function emitStateChange(source: StateChangeSource = "sync", suppressAutoPreview = false) {
  emit("stateChange", {
    signature: getStateSignature(),
    hasArtwork: hasArtworkLayers(),
    canUndo: canUndo(),
    canRedo: canRedo(),
    source,
    suppressAutoPreview,
  })
}

function sanitizeOverlayLayer(value: unknown): OverlayLayer | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Record<string, unknown>
  const id = String(candidate.id || "").trim()
  if (!id) return null
  const kind = candidate.kind
  if (kind === "image") {
    const src = String(candidate.src || "").trim()
    if (!src) return null
    const libraryScopeRaw = String(candidate.libraryScope || "").trim()
    const libraryScope = libraryScopeRaw === "platform"
      || libraryScopeRaw === "tenant"
      || libraryScopeRaw === "licensed"
      || libraryScopeRaw === "owned"
      ? (libraryScopeRaw as "owned" | "platform" | "tenant" | "licensed")
      : undefined
    const artworkId = String(candidate.artworkId || "").trim() || undefined
    const svgMarkup = typeof candidate.svgMarkup === "string" ? candidate.svgMarkup : undefined
    const svgFill = typeof candidate.svgFill === "string" ? candidate.svgFill : undefined
    const svgLayers = Array.isArray(candidate.svgLayers)
      ? candidate.svgLayers
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => {
          const layer = entry as Record<string, unknown>
          return {
            id: String(layer.id || "").trim(),
            label: String(layer.label || "").trim(),
            tagName: String(layer.tagName || "").trim(),
            originalFill: String(layer.originalFill || "").trim(),
            currentFill: String(layer.currentFill || "").trim(),
            source: layer.source === "attr" ? "attr" : "style",
          } as SvgFillLayerState
        })
        .filter((entry) => entry.id && entry.tagName)
      : undefined
    return {
      id,
      kind: "image",
      src,
      previewSrc: typeof candidate.previewSrc === "string" ? candidate.previewSrc : undefined,
      svgMarkup,
      svgFill,
      svgLayers: svgLayers?.length ? svgLayers : undefined,
      name: typeof candidate.name === "string" ? candidate.name : undefined,
      libraryScope,
      artworkId,
      hidden: Boolean(candidate.hidden),
      left: normalizeNumber(candidate.left),
      top: normalizeNumber(candidate.top),
      scaleX: normalizeNumber(candidate.scaleX, 1),
      scaleY: normalizeNumber(candidate.scaleY, 1),
      angle: normalizeNumber(candidate.angle),
      opacity: normalizeImageOpacity(candidate.opacity),
      tileMode: normalizeImageTileMode(candidate.tileMode),
    }
  }
  if (kind === "text") {
    return {
      id,
      kind: "text",
      hidden: Boolean(candidate.hidden),
      name: typeof candidate.name === "string" ? candidate.name : undefined,
      text: String(candidate.text || ""),
      styles: candidate.styles && typeof candidate.styles === "object" ? candidate.styles : undefined,
      fontSize: Math.max(12, normalizeNumber(candidate.fontSize, 52)),
      fill: typeof candidate.fill === "string" ? candidate.fill : "#111827",
      fontWeight: typeof candidate.fontWeight === "string" ? candidate.fontWeight : "700",
      fontStyle: typeof candidate.fontStyle === "string" ? candidate.fontStyle : "normal",
      textAlign: normalizeTextAlign(candidate.textAlign),
      fontFamily: normalizeTextFontFamily(candidate.fontFamily),
      lineHeight: normalizeTextLineHeight(candidate.lineHeight),
      width: Math.max(1, normalizeNumber(candidate.width, 340)),
      left: normalizeNumber(candidate.left),
      top: normalizeNumber(candidate.top),
      scaleX: normalizeNumber(candidate.scaleX, 1),
      scaleY: normalizeNumber(candidate.scaleY, 1),
      angle: normalizeNumber(candidate.angle),
    }
  }
  return null
}

function sanitizeSerializableState(value: unknown) {
  const validPartKeys = new Set((props.parts || []).map((part) => part.part_name).filter(Boolean))
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : null
  const rawParts = Array.isArray(candidate?.parts) ? candidate.parts : []
  const parts = rawParts
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const partCandidate = entry as Record<string, unknown>
      const partKey = String(partCandidate.partKey || "").trim()
      if (!partKey || (validPartKeys.size > 0 && !validPartKeys.has(partKey))) return null
      const rawLayers = Array.isArray(partCandidate.layers) ? partCandidate.layers : []
      const layers = rawLayers
        .map((layer) => sanitizeOverlayLayer(layer))
        .filter((layer): layer is OverlayLayer => Boolean(layer))
      if (!layers.length) return null
      return {
        partKey,
        layers,
      }
    })
    .filter((entry): entry is { partKey: string; layers: OverlayLayer[] } => Boolean(entry))
  const candidateActivePartKey = typeof candidate?.activePartKey === "string"
    ? candidate.activePartKey.trim()
    : ""
  const nextActivePartKey = candidateActivePartKey
    && (
      validPartKeys.size > 0
        ? validPartKeys.has(candidateActivePartKey)
        : parts.some((part) => part.partKey === candidateActivePartKey)
    )
    ? candidateActivePartKey
    : parts[0]?.partKey || props.selectedPartKey || props.parts?.[0]?.part_name || ""
  const activePart = parts.find((part) => part.partKey === nextActivePartKey)
  const nextActiveLayerId = typeof candidate?.activeLayerId === "string"
    && activePart?.layers.some((layer) => layer.id === candidate.activeLayerId)
    ? candidate.activeLayerId
    : activePart?.layers[activePart.layers.length - 1]?.id || ""
  return {
    activePartKey: nextActivePartKey,
    activeLayerId: nextActiveLayerId,
    parts,
  }
}

async function restoreSerializableState(value: unknown) {
  const normalized = sanitizeSerializableState(value)
  applySerializableState({
    version: 1,
    activePartKey: normalized.activePartKey,
    activeLayerId: normalized.activeLayerId,
    parts: normalized.parts,
  })
  clearHistory()
  await drawScene("restore", { suppressAutoPreview: true })
}

async function applySerializableStateWithHistory(
  value: unknown,
  options?: {
    source?: Exclude<StateChangeSource, "restore">
    suppressAutoPreview?: boolean
  },
) {
  const normalized = sanitizeSerializableState(value)
  const nextState: SerializableCanvasState = {
    version: 1,
    activePartKey: normalized.activePartKey,
    activeLayerId: normalized.activeLayerId,
    parts: normalized.parts,
  }
  const before = snapshotState()
  if (isSameSerializableState(before, nextState)) {
    return false
  }
  applySerializableState(nextState)
  recordHistoryChange(before, snapshotState())
  await drawScene(options?.source || "user", {
    suppressAutoPreview: Boolean(options?.suppressAutoPreview),
  })
  return true
}

function getSerializableState() {
  return buildSerializableState()
}

async function resolveImageSource(src: string) {
  const normalized = String(src || "").trim()
  if (!normalized || normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return normalized
  }
  const resolved = normalized
  if (!isSvgAsset(resolved)) {
    return resolved
  }
  const cached = svgObjectUrlCache.get(resolved)
  if (cached) {
    return cached
  }
  try {
    const response = await fetch(resolved, { credentials: "omit" })
    if (!response.ok) return resolved
    const svgText = stripExternalSvgImageRefs(normalizeSvgMarkup(await response.text()))
    if (!/<svg[\s>]/i.test(svgText)) return resolved
    const objectUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }))
    svgObjectUrlCache.set(resolved, objectUrl)
    return objectUrl
  } catch {
    return resolved
  }
}

async function loadImage(src: string) {
  const resolvedSrc = await resolveImageSource(src)
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = resolvedSrc
  })
}

function isSvgAsset(src: string) {
  const normalized = String(src || "").toLowerCase()
  return normalized.includes(".svg") || normalized.startsWith("data:image/svg+xml") || normalized.startsWith("blob:")
}

function normalizeSvgMarkup(svgText: string) {
  return String(svgText || "")
    .replace(/^\uFEFF/, "")
    .replace(/^\s+(?=<\?xml|<svg\b)/i, "")
}

const SVG_FILL_LAYER_ATTR = "data-mockup-fill-layer-id"
const SVG_NON_PAINTABLE_TAGS = new Set([
  "svg",
  "defs",
  "symbol",
  "clipPath",
  "mask",
  "pattern",
  "filter",
  "style",
  "script",
  "title",
  "desc",
  "metadata",
  "linearGradient",
  "radialGradient",
  "stop",
])

function normalizeSvgColorValue(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  if (!normalized || /^(none|transparent|currentColor)$/i.test(normalized) || /^url\(/i.test(normalized)) {
    return ""
  }
  return normalized
}

function readStyleFill(styleText: string | null | undefined) {
  const match = String(styleText || "").match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i)
  return normalizeSvgColorValue(match?.[1] || "")
}

function readSvgElementFill(element: Element) {
  const styleFill = readStyleFill(element.getAttribute("style"))
  if (styleFill) {
    return {
      fill: styleFill,
      source: "style" as const,
    }
  }
  const attrFill = normalizeSvgColorValue(element.getAttribute("fill"))
  if (!attrFill) return null
  return {
    fill: attrFill,
    source: "attr" as const,
  }
}

function writeSvgElementFill(element: Element, fillColor: string, source: "style" | "attr") {
  const normalizedFill = normalizeSvgColorValue(fillColor)
  if (!normalizedFill) return
  if (source === "style") {
    const tokens = String(element.getAttribute("style") || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter((entry) => !/^fill\s*:/i.test(entry))
    tokens.push(`fill:${normalizedFill}`)
    element.setAttribute("style", tokens.join(";"))
    return
  }
  element.setAttribute("fill", normalizedFill)
}

function buildSvgLayerLabel(element: Element, index: number) {
  const explicit = String(
    element.getAttribute("data-name")
    || element.getAttribute("id")
    || element.getAttribute("inkscape:label")
    || element.getAttribute("aria-label")
    || "",
  ).trim()
  if (explicit) return explicit
  return `${element.tagName.toUpperCase()} ${index + 1}`
}

function parseSvgMarkupLayers(svgText: string) {
  const normalizedMarkup = normalizeSvgMarkup(svgText)
  if (!normalizedMarkup) {
    return {
      markup: "",
      layers: [] as SvgFillLayerState[],
    }
  }
  try {
    const parser = new DOMParser()
    const documentNode = parser.parseFromString(normalizedMarkup, "image/svg+xml")
    if (documentNode.querySelector("parsererror")) {
      return {
        markup: normalizedMarkup,
        layers: [] as SvgFillLayerState[],
      }
    }
    const svgRoot = documentNode.documentElement
    const fillLayers: SvgFillLayerState[] = []
    let layerIndex = 0
    svgRoot.querySelectorAll("*").forEach((node) => {
      const tagName = node.tagName
      if (SVG_NON_PAINTABLE_TAGS.has(tagName)) return
      const fillInfo = readSvgElementFill(node)
      if (!fillInfo) return
      const layerId = String(node.getAttribute(SVG_FILL_LAYER_ATTR) || `svg_fill_${layerIndex + 1}`).trim()
      node.setAttribute(SVG_FILL_LAYER_ATTR, layerId)
      fillLayers.push({
        id: layerId,
        label: buildSvgLayerLabel(node, layerIndex),
        tagName,
        originalFill: fillInfo.fill,
        currentFill: fillInfo.fill,
        source: fillInfo.source,
      })
      layerIndex += 1
    })
    return {
      markup: new XMLSerializer().serializeToString(svgRoot),
      layers: fillLayers,
    }
  } catch {
    return {
      markup: normalizedMarkup,
      layers: [] as SvgFillLayerState[],
    }
  }
}

function resolveSvgFillLayers(layer: ImageLayer) {
  if (!layer.svgMarkup) return [] as SvgFillLayerState[]
  const parsed = parseSvgMarkupLayers(layer.svgMarkup)
  if (parsed.markup && parsed.markup !== layer.svgMarkup) {
    layer.svgMarkup = parsed.markup
  }
  const existing = Array.isArray(layer.svgLayers) ? layer.svgLayers : []
  const merged = parsed.layers.map((item) => {
    const current = existing.find((entry) => entry.id === item.id)
    return current
      ? { ...item, currentFill: normalizeSvgColorValue(current.currentFill) || item.originalFill }
      : item
  })
  layer.svgLayers = merged
  layer.svgFill = merged[0]?.currentFill || undefined
  return merged
}

async function resolveSvgMarkup(src: string) {
  const normalized = String(src || "").trim()
  if (!normalized || !isSvgAsset(normalized)) return ""
  if (normalized.startsWith("data:image/svg+xml")) {
    const commaIndex = normalized.indexOf(",")
    if (commaIndex < 0) return ""
    const payload = normalized.slice(commaIndex + 1)
    const isBase64 = /;base64/i.test(normalized.slice(0, commaIndex))
    try {
      const decoded = isBase64
        ? atob(payload)
        : decodeURIComponent(payload)
      return normalizeSvgMarkup(decoded)
    } catch {
      return ""
    }
  }
  try {
    const response = await fetch(normalized, { credentials: "omit" })
    if (!response.ok) return ""
    return normalizeSvgMarkup(await response.text())
  } catch {
    return ""
  }
}

function inferSvgFill(svgMarkup: string) {
  return parseSvgMarkupLayers(svgMarkup).layers[0]?.currentFill || ""
}

function applySvgLayerFills(svgMarkup: string, svgLayers: SvgFillLayerState[]) {
  const normalizedMarkup = normalizeSvgMarkup(svgMarkup)
  if (!normalizedMarkup) return normalizedMarkup
  if (!svgLayers.length) return normalizedMarkup
  try {
    const parser = new DOMParser()
    const documentNode = parser.parseFromString(normalizedMarkup, "image/svg+xml")
    if (documentNode.querySelector("parsererror")) return normalizedMarkup
    const svgRoot = documentNode.documentElement
    svgLayers.forEach((layer) => {
      const target = svgRoot.querySelector(`[${SVG_FILL_LAYER_ATTR}="${CSS.escape(layer.id)}"]`)
      if (!target) return
      writeSvgElementFill(target, layer.currentFill || layer.originalFill, layer.source)
    })
    return new XMLSerializer().serializeToString(svgRoot)
  } catch {
    return normalizedMarkup
  }
}

function parseSizeToken(token: string | undefined) {
  const match = String(token || "").match(/^\s*(\d+)\s*x\s*(\d+)\s*$/i)
  if (!match) {
    return null
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  }
}

function createStageFrame(): StageFrame {
  const templateSize = parseSizeToken(props.templateSize)
  const templateWidth = Math.max(templateSize?.width || FRAME_MAX_SIZE, 1)
  const templateHeight = Math.max(templateSize?.height || FRAME_MAX_SIZE, 1)
  const displayScale = Math.min(FRAME_MAX_SIZE / templateWidth, FRAME_MAX_SIZE / templateHeight)
  const width = Math.max(templateWidth * displayScale, 1)
  const height = Math.max(templateHeight * displayScale, 1)
  return {
    left: FRAME_OFFSET + ((FRAME_MAX_SIZE - width) / 2),
    top: FRAME_OFFSET + ((FRAME_MAX_SIZE - height) / 2),
    width,
    height,
    templateWidth,
    templateHeight,
    displayScale,
  }
}

const stageFrame = computed(() => createStageFrame())

const canvasPhysicalDimension = computed(() => resolveCanvasPhysicalDimension({
  dimensions: props.physicalDimensionsCm,
  selectedPartKey: props.selectedPartKey,
  viewGeometry: props.viewGeometry,
  selectedColor: props.selectedColor,
  selectedView: props.selectedView,
  templateSize: props.templateSize,
}))

const horizontalRulerTicks = computed(() => buildHorizontalRulerTicks(stageFrame.value, canvasPhysicalDimension.value, props.displayUnit || "cm"))

const verticalRulerTicks = computed(() => buildVerticalRulerTicks(stageFrame.value, canvasPhysicalDimension.value, props.displayUnit || "cm"))

const rulerTopStyle = computed(() => ({
  left: `${stageFrame.value.left}px`,
  top: `${Math.max(stageFrame.value.top - RULER_SIZE, 0)}px`,
  width: `${stageFrame.value.width}px`,
  height: "28px",
}))

const rulerLeftStyle = computed(() => ({
  left: `${Math.max(stageFrame.value.left - RULER_SIZE, 0)}px`,
  top: `${stageFrame.value.top}px`,
  width: "28px",
  height: `${stageFrame.value.height}px`,
}))

function handleRulerMouseMove(_e: MouseEvent) {
  // Mouse following disabled per user request
}

function handleRulerMouseLeave() {
  // Mouse following disabled per user request
}

function refreshOverlayControlAnchors() {
  const target = getActiveOverlay()
  if (!target) {
    overlayControlAnchors.value = { image: null, text: null, size: null, rotation: null }
    return
  }
  const outline = resolveTargetOutlineAnchors(target)
  if (!outline) {
    overlayControlAnchors.value = { image: null, text: null, size: null, rotation: null }
    return
  }
  if (target.layerKind === "image") {
    overlayControlAnchors.value = {
      image: outline.topCenter,
      text: null,
      size: outline.topCenter,
      rotation: outline.topCenter,
    }
    return
  }
  if (target.layerKind === "text") {
    overlayControlAnchors.value = {
      image: null,
      text: outline.topCenter,
      size: outline.topCenter,
      rotation: outline.topCenter,
    }
    return
  }
  overlayControlAnchors.value = { image: null, text: null, size: outline.topCenter, rotation: outline.topCenter }
}

function refreshDomOverlayButtonAnchors() {
  const target = getActiveOverlay()
  if (!target) {
    domOverlayButtonAnchors.value = createEmptyDomOverlayButtonAnchors()
    return
  }
  const outline = resolveTargetOutlineAnchors(target)
  if (!outline) {
    domOverlayButtonAnchors.value = createEmptyDomOverlayButtonAnchors()
    return
  }
  domOverlayButtonAnchors.value = {
    clone: outline.topLeft,
    delete: outline.topRight,
    move: outline.bottomLeft,
    rotate: outline.topCenter,
    scale: outline.bottomRight,
  }
}

function setDomOverlayButtonRef(key: DomOverlayButtonKey, element: Element | null) {
  if (!(element instanceof HTMLButtonElement)) return
  const width = Math.max(Math.ceil(element.offsetWidth || 0), DOM_OVERLAY_BUTTON_SIZE)
  const height = Math.max(Math.ceil(element.offsetHeight || 0), DOM_OVERLAY_BUTTON_SIZE)
  const current = domOverlayButtonMetrics.value[key]
  if (current?.width === width && current?.height === height) return
  domOverlayButtonMetrics.value[key] = { width, height }
}

function isDomOverlayButtonDisabled() {
  const target = getActiveOverlay()
  return !target || (target instanceof Textbox && target.isEditing)
}

function resolveClientPoint(event: Event) {
  const pointerEvent = event as PointerEvent
  if (Number.isFinite(pointerEvent.clientX) && Number.isFinite(pointerEvent.clientY)) {
    return {
      left: Number(pointerEvent.clientX),
      top: Number(pointerEvent.clientY),
    }
  }
  const touchEvent = event as TouchEvent
  const touch = touchEvent.touches?.[0] || touchEvent.changedTouches?.[0]
  if (!touch) return null
  return {
    left: Number(touch.clientX),
    top: Number(touch.clientY),
  }
}

function resolveStagePoint(event: Event) {
  const clientPoint = resolveClientPoint(event)
  if (!clientPoint) return null
  const bounds = stageRef.value?.getBoundingClientRect()
  return {
    left: clientPoint.left - Number(bounds?.left || 0),
    top: clientPoint.top - Number(bounds?.top || 0),
  }
}

function applyDomOverlayDragPreview(target: ActiveCanvasObject) {
  if (target instanceof Textbox) {
    ;(target as Textbox & { initDimensions?: () => void }).initDimensions?.()
    target.dirty = true
  }
  target.setCoords()
  syncTargetInteractionState(target)
  fabricCanvas.value?.renderAll()
  refreshSelectionOverlayPositions()
  updateActiveSelectionMetrics()
}

function beginDomOverlayDrag(key: Extract<DomOverlayButtonKey, "move" | "rotate" | "scale">, event: Event) {
  const target = getActiveOverlay() as ActiveCanvasObject | null
  if (!target) return
  const startPointer = resolveStagePoint(event)
  if (!startPointer) return
  const center = target.getCenterPoint()
  const startCenter = {
    left: Number(center.x || 0),
    top: Number(center.y || 0),
  }
  const startRotation = -(Number(target.angle || 0) * Math.PI / 180)
  const startLocalPointer = projectDomOverlayPointerToLocal(startPointer, startCenter, startRotation)
  const nextDragState: DomOverlayDragState = {
    key,
    mode: key,
    target,
    startPointer,
    startCenter,
    startAngle: Number(target.angle || 0),
    startPointerAngle: Math.atan2(startPointer.top - startCenter.top, startPointer.left - startCenter.left),
    startScaleX: Number(target.scaleX || 1),
    startScaleY: Number(target.scaleY || 1),
    startUniformImageScale: target.layerKind === "image"
      ? Math.max(
        Math.abs(Number(target.scaleX || 1)),
        Math.abs(Number(target.scaleY || 1)),
        0.05,
      )
      : 1,
    startDistance: Math.max(Math.hypot(startPointer.left - startCenter.left, startPointer.top - startCenter.top), 1),
    startLocalPointer,
    moved: false,
  }
  domOverlayDragState.value = nextDragState
  domOverlaySuppressedClickKey.value = null
}

function handleDomOverlayButtonPointerDown(key: DomOverlayButtonKey, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (isDomOverlayButtonDisabled()) return
  if (key === "move" || key === "rotate" || key === "scale") {
    beginDomOverlayDrag(key, event)
  }
}

function projectDomOverlayPointerToLocal(
  pointer: DimensionAnchor,
  center: DimensionAnchor,
  angleRadians: number,
): DimensionAnchor {
  const offsetLeft = pointer.left - center.left
  const offsetTop = pointer.top - center.top
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  return {
    left: (offsetLeft * cos) - (offsetTop * sin),
    top: (offsetLeft * sin) + (offsetTop * cos),
  }
}

async function handleDomOverlayButtonClick(key: DomOverlayButtonKey) {
  if (domOverlaySuppressedClickKey.value === key) {
    domOverlaySuppressedClickKey.value = null
    return
  }
  if (isDomOverlayButtonDisabled()) return
  switch (key) {
    case "clone":
      await duplicateActive()
      return
    case "move":
      return
    case "delete":
      await removeActive()
      return
    case "rotate":
      await rotateActive(45)
      return
    case "scale":
      await scaleActive(1.1)
      return
    default:
      return
  }
}

function refreshSelectionOverlayPositions() {
  refreshOverlayControlAnchors()
  refreshDomOverlayButtonAnchors()
}

function buildOverlayStyle(anchor: DimensionAnchor | null) {
  if (!anchor) return null
  return {
    left: `${anchor.left}px`,
    top: `${anchor.top}px`,
    transform: "translate(calc(-100% - 12px), calc(-100% - 10px))",
  }
}

function buildRotationOverlayStyle(anchor: DimensionAnchor | null) {
  if (!anchor) return null
  const metrics = domOverlayButtonMetrics.value.rotate || { width: DOM_OVERLAY_BUTTON_SIZE, height: DOM_OVERLAY_BUTTON_SIZE }
  const position = computeFloatingDomButtonPosition({
    control: "rotate",
    anchor,
    buttonMetrics: metrics,
    overlayBounds: {
      left: Number(stageFrame.value.left || 0),
      top: Number(stageFrame.value.top || 0),
      width: Number(stageFrame.value.width || CANVAS_SIZE),
      height: Number(stageFrame.value.height || CANVAS_SIZE),
    },
    gap: DOM_OVERLAY_BUTTON_GAP,
  })
  return {
    left: `${position.left + (metrics.width / 2)}px`,
    top: `${position.top}px`,
    transform: "translate(-50%, calc(-100% - 8px))",
  }
}

function formatRotationAngleLabel(angle: number) {
  let normalized = ((Number(angle || 0) + 180) % 360 + 360) % 360 - 180
  normalized = Math.round(normalized * 10) / 10
  if (Object.is(normalized, -0)) normalized = 0
  if (normalized > 0) {
    return `+${normalized.toFixed(normalized % 1 === 0 ? 0 : 1)}°`
  }
  return `${normalized.toFixed(normalized % 1 === 0 ? 0 : 1)}°`
}

const activeImageOverlayLabels = computed(() => {
  const anchor = overlayControlAnchors.value.size || overlayControlAnchors.value.image
  if (!anchor) return []
  const label = activeImageMetrics.value?.imageBoxDisplay?.label || ""
  return label
    ? [{ key: "actual", text: label, style: buildOverlayStyle(anchor) }]
    : []
})

const activeTextOverlayLabels = computed(() => {
  const anchor = overlayControlAnchors.value.size || overlayControlAnchors.value.text
  if (!anchor) return []
  const label = activeTextMetrics.value?.textContent?.display?.label || ""
  return label
    ? [{ key: "actual", text: label, style: buildOverlayStyle(anchor) }]
    : []
})

const activeRotationOverlayLabels = computed(() => {
  const target = getActiveOverlay()
  const anchor = overlayControlAnchors.value.rotation
  if (!target || !anchor) return []
  return [{
    key: "rotation",
    text: formatRotationAngleLabel(Number(target.angle || 0)),
    style: buildRotationOverlayStyle(anchor),
  }]
})

const activeRulerSelectionHint = computed(() => {
  const imageGeometry = activeImageMetrics.value?.geometry || null
  const textGeometry = activeTextMetrics.value?.textContentGeometry || null
  const geometry = imageGeometry || textGeometry
  const measurement = activeImageMetrics.value?.rulerBoxDisplay
    || activeTextMetrics.value?.textContentGeometry?.boundingBoxDisplay
    || activeTextMetrics.value?.rulerBoxDisplay
    || null
  const bounds = geometry?.canvasBounds || null
  if (!measurement || !bounds) return null
  const relativeLeft = Math.max(0, Math.min(bounds.left - stageFrame.value.left, stageFrame.value.width))
  const relativeTop = Math.max(0, Math.min(bounds.top - stageFrame.value.top, stageFrame.value.height))
  const width = Math.max(0, Math.min(bounds.width, stageFrame.value.width - relativeLeft))
  const height = Math.max(0, Math.min(bounds.height, stageFrame.value.height - relativeTop))
  return {
    tone: imageGeometry ? "image" : "text",
    horizontalStyle: {
      left: `${relativeLeft}px`,
      width: `${width}px`,
    },
    horizontalLabelStyle: {
      left: `${relativeLeft + (width / 2)}px`,
    },
    horizontalText: `${formatUnitNumber(measurement.width)} ${measurement.unit}`,
    verticalStyle: {
      top: `${relativeTop}px`,
      height: `${height}px`,
    },
    verticalLabelStyle: {
      top: `${relativeTop + (height / 2)}px`,
    },
    verticalText: `${formatUnitNumber(measurement.height)} ${measurement.unit}`,
  }
})

function buildFrameBox(left: number, top: number, width: number, height: number): AlignmentBox {
  return { left, top, width, height }
}

function buildIdentityAlignment(frame: StageFrame): PartReferenceAlignment {
  return {
    kind: "identity",
    previewBox: buildFrameBox(frame.left, frame.top, frame.width, frame.height),
    templateBox: buildFrameBox(0, 0, frame.templateWidth, frame.templateHeight),
  }
}

function applyObjectToBox(object: ActiveCanvasObject, targetBox: AlignmentBox) {
  const transform = buildReferenceTransform({
    sourceWidth: Number(object.width || 0),
    sourceHeight: Number(object.height || 0),
    targetBox,
  })
  if (!transform) {
    return false
  }
  object.set({
    left: transform.left,
    top: transform.top,
    scaleX: transform.width / Number(object.width || 1),
    scaleY: transform.height / Number(object.height || 1),
  })
  return true
}

async function resolveGuideAlphaInfo(src: string) {
  const normalized = String(src || "").trim()
  if (!normalized) return null
  const cached = guideAlphaBoundsCache.get(normalized)
  if (cached) {
    return await cached
  }
  const pending = (async () => {
    try {
      const image = await loadImage(normalized)
      const width = Number(image.naturalWidth || image.width || 0)
      const height = Number(image.naturalHeight || image.height || 0)
      if (!width || !height) return null
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d", { willReadFrequently: true })
      if (!context) return null
      context.drawImage(image, 0, 0, width, height)
      const bounds = resolveAlphaBounds(context.getImageData(0, 0, width, height))
      if (!bounds) return null
      return { bounds, width, height }
    } catch {
      return null
    }
  })()
  guideAlphaBoundsCache.set(normalized, pending)
  const resolved = await pending
  if (!resolved) {
    guideAlphaBoundsCache.delete(normalized)
  }
  return resolved
}

async function resolvePartAlignment(part: EditorPart | null | undefined, frame: StageFrame): Promise<PartReferenceAlignment> {
  const identity = buildIdentityAlignment(frame)
  if (!part?.guide_url) {
    return identity
  }
  const guideAlpha = await resolveGuideAlphaInfo(part.guide_url)
  if (!guideAlpha) {
    return identity
  }
  const previewBox = buildFrameAlignedBox({
    bounds: guideAlpha.bounds,
    sourceWidth: guideAlpha.width,
    sourceHeight: guideAlpha.height,
    frame: identity.previewBox,
  })
  const templateBox = buildFrameAlignedBox({
    bounds: guideAlpha.bounds,
    sourceWidth: guideAlpha.width,
    sourceHeight: guideAlpha.height,
    frame: identity.templateBox,
  })
  if (!previewBox || !templateBox) {
    return identity
  }
  if (boxesNearlyEqual(previewBox, identity.previewBox) && boxesNearlyEqual(templateBox, identity.templateBox)) {
    return identity
  }
  return {
    kind: "transformed",
    previewBox,
    templateBox,
  }
}

function templateToCanvasPoint(left: number, top: number, frame: StageFrame, alignment?: PartReferenceAlignment) {
  if (alignment?.kind === "transformed") {
    return {
      left: alignment.previewBox.left + (left - alignment.templateBox.left) * frame.displayScale,
      top: alignment.previewBox.top + (top - alignment.templateBox.top) * frame.displayScale,
    }
  }
  return {
    left: frame.left + (left * frame.displayScale),
    top: frame.top + (top * frame.displayScale),
  }
}

function canvasToTemplatePoint(left: number, top: number, frame: StageFrame, alignment?: PartReferenceAlignment) {
  if (alignment?.kind === "transformed") {
    return {
      left: alignment.templateBox.left + (left - alignment.previewBox.left) / frame.displayScale,
      top: alignment.templateBox.top + (top - alignment.previewBox.top) / frame.displayScale,
    }
  }
  return {
    left: (left - frame.left) / frame.displayScale,
    top: (top - frame.top) / frame.displayScale,
  }
}

function fitObjectToFrame(object: ActiveCanvasObject, frame: StageFrame) {
  object.set({
    left: frame.left,
    top: frame.top,
  })
  object.scaleToWidth(frame.width)
  object.scaleToHeight(frame.height)
}

function stripExternalSvgImageRefs(svgText: string) {
  // Part guide SVGs occasionally embed a low-opacity reference raster via
  // <image xlink:href="Right-shoe-tongue-1.png">. The href is a relative
  // sibling that does not exist under the runtime asset prefix, so the
  // browser resolves it against the site origin and triggers a 404.
  // The actual cutout outline lives in the <path>, so we drop any external
  // <image> node before handing the markup to fabric.
  if (!svgText.includes("<image")) return svgText
  try {
    const parser = new DOMParser()
    const documentNode = parser.parseFromString(svgText, "image/svg+xml")
    if (documentNode.querySelector("parsererror")) return svgText
    let mutated = false
    documentNode.querySelectorAll("image").forEach((node) => {
      const href = node.getAttribute("href") || node.getAttributeNS("http://www.w3.org/1999/xlink", "href") || ""
      if (!href || /^(data:|blob:)/i.test(href)) return
      node.parentNode?.removeChild(node)
      mutated = true
    })
    if (!mutated) return svgText
    return new XMLSerializer().serializeToString(documentNode.documentElement)
  } catch {
    return svgText
  }
}

async function loadGuideOverlay(src: string) {
  const resolvedSrc = await resolveImageSource(src)
  if (isSvgAsset(resolvedSrc)) {
    const response = await fetch(resolvedSrc)
    if (!response.ok) {
      throw new Error(`Failed to load guide SVG: ${response.status}`)
    }
    const svgText = stripExternalSvgImageRefs(normalizeSvgMarkup(await response.text()))
    if (!/<svg[\s>]/i.test(svgText)) {
      throw new Error("Invalid guide SVG payload")
    }
    const parsed = await loadSVGFromString(svgText)
    const objects = parsed.objects.filter((item): item is NonNullable<typeof item> => Boolean(item))
    return util.groupSVGElements(objects, parsed.options) as ActiveCanvasObject
  }
  const image = await loadImage(resolvedSrc)
  return new FabricImage(image, { crossOrigin: "anonymous" }) as ActiveCanvasObject
}

async function loadSvgArtworkOverlay(src: string) {
  const resolvedSrc = await resolveImageSource(src)
  const response = await fetch(resolvedSrc)
  if (!response.ok) {
    throw new Error(`Failed to load SVG artwork: ${response.status}`)
  }
  const svgText = normalizeSvgMarkup(await response.text())
  if (!/<svg[\s>]/i.test(svgText)) {
    throw new Error("Invalid SVG artwork payload")
  }
  const parsed = await loadSVGFromString(svgText)
  const objects = parsed.objects.filter((item): item is NonNullable<typeof item> => Boolean(item))
  return util.groupSVGElements(objects, parsed.options) as ActiveCanvasObject
}

async function loadSvgArtworkOverlayFromMarkup(svgMarkup: string) {
  const parsed = await loadSVGFromString(normalizeSvgMarkup(svgMarkup))
  const objects = parsed.objects.filter((item): item is NonNullable<typeof item> => Boolean(item))
  return util.groupSVGElements(objects, parsed.options) as ActiveCanvasObject
}

async function loadArtworkOverlay(src: string, previewSrc?: string) {
  const candidates = resolveArtworkLoadCandidates({ src, previewSrc })
  let lastError: unknown = null
  for (const candidate of candidates) {
    try {
      const resolvedSrc = await resolveImageSource(candidate)
      if (isSvgAsset(resolvedSrc)) {
        return await loadSvgArtworkOverlay(resolvedSrc)
      }
      const image = await loadImage(resolvedSrc)
      return new FabricImage(image, { crossOrigin: "anonymous" }) as ActiveCanvasObject
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to load artwork overlay")
}

function getCanvasZoomFactor(canvas: FabricCanvasLike | null | undefined) {
  const zoom = Number(canvas?.getZoom?.() || 1)
  if (!Number.isFinite(zoom) || zoom <= 0) {
    return 1
  }
  return zoom
}

function getControlCornerSize(canvas: FabricCanvasLike | null | undefined) {
  return Math.max(18, 24 / getCanvasZoomFactor(canvas))
}

function syncTargetInteractionState(target: ActiveCanvasObject | null | undefined) {
  if (!target) return
  const canvas = (target as ActiveCanvasObject & { canvas?: FabricCanvasLike | null }).canvas || fabricCanvas.value
  const cornerSize = getControlCornerSize(canvas)
  const isTextLayer = target.layerKind === "text"
  target.set({
    transparentCorners: true,
    cornerStyle: "rect",
    cornerColor: "rgba(255, 255, 255, 0)",
    cornerStrokeColor: "rgba(255, 255, 255, 0)",
    borderColor: isTextLayer ? "rgba(37, 99, 235, 0.96)" : "rgba(109, 40, 217, 0.96)",
    borderDashArray: isTextLayer ? [8, 6] : undefined,
    borderScaleFactor: 1.2,
    padding: 0,
    cornerSize,
    touchCornerSize: Math.max(cornerSize, 24),
  })
  target.setCoords()
  canvas?.requestRenderAll?.()
}

function syncCanvasControlTargets(canvas: FabricCanvasLike | null | undefined) {
  if (!canvas) return
  canvas.getObjects().forEach((item) => {
    const target = item as ActiveCanvasObject
    if (!target.layerId) return
    syncTargetInteractionState(target)
  })
  const activeTarget = canvas.getActiveObject() as ActiveCanvasObject | undefined
  if (activeTarget) {
    syncTargetInteractionState(activeTarget)
  }
  canvas.calcOffset()
  canvas.requestRenderAll?.()
}

function applyOverlaySelectionStyle(target: ActiveCanvasObject) {
  target.set({
    hasBorders: true,
    hasControls: false,
  })
  syncTargetInteractionState(target)
}

function resetDomOverlaySelectionState() {
  domOverlaySelectionState.value = {
    visible: false,
    partKey: "",
    layerId: "",
    layerKind: "",
  }
  domOverlayButtonAnchors.value = createEmptyDomOverlayButtonAnchors()
}

function syncDomOverlaySelectionState(target: ActiveCanvasObject | null | undefined) {
  const partKey = target?.partKey || ""
  const layerId = target?.layerId || ""
  const layerKind = target?.layerKind || ""
  if (!target || !partKey || !layerId || !layerKind) {
    resetDomOverlaySelectionState()
    return
  }
  domOverlaySelectionState.value = {
    visible: true,
    partKey,
    layerId,
    layerKind,
  }
}

function openTextboxEditing(
  target: Textbox,
  canvas: {
    getActiveObject: () => unknown
    setActiveObject: (object: ActiveCanvasObject) => unknown
    renderAll: () => void
  },
) {
  window.setTimeout(() => {
    if (fabricCanvas.value !== canvas) return
    const activeTarget = canvas.getActiveObject()
    if (activeTarget !== target || target.isEditing) return
    canvas.setActiveObject(target)
    target.enterEditing()
    ;(target as Textbox & { selectAll?: () => void }).selectAll?.()
    target.hiddenTextarea?.focus()
    canvas.renderAll()
  }, 0)
}

function queueCanvasSelectionSync(
  canvas: {
    getActiveObject: () => unknown
    setActiveObject: (object: ActiveCanvasObject) => unknown
    renderAll: () => void
  },
  target: ActiveCanvasObject,
  options?: {
    enterTextEditing?: boolean
  },
) {
  window.setTimeout(() => {
    if (fabricCanvas.value !== canvas) return
    if (canvas.getActiveObject() !== target) {
      canvas.setActiveObject(target)
    }
    if (canvas.getActiveObject() !== target) return
    const resolvedKind = (() => {
      const partKey = target.partKey || ""
      const layerId = target.layerId || ""
      if (partKey && layerId) {
        return getCurrentLayer(partKey, layerId)?.kind || ""
      }
      if (target instanceof Textbox) return "text"
      return ""
    })()
    const selectionAction = resolvedKind === "text"
      ? "canvas-click-text"
      : resolvedKind === "image"
        ? "canvas-click-image"
        : "programmatic"
    syncSelection({
      openTextInspector: resolvedKind === "text",
      openLayersInspector: resolvedKind === "image",
      selectionSource: "canvas",
      selectionAction,
    })
    if (options?.enterTextEditing && target instanceof Textbox) {
      openTextboxEditing(target, canvas)
    }
  }, 0)
}

function resolveCanvasSelectionEventPayload(
  event: { selected?: unknown[]; target?: unknown; e?: Event | null } | undefined,
) {
  const selectedTarget = Array.isArray(event?.selected) ? event?.selected?.[0] : undefined
  const target = (selectedTarget || event?.target || getActiveOverlay()) as ActiveCanvasObject | undefined
  if (!event?.e || !target) {
    return {
      selectionAction: "programmatic" as SelectionAction,
      openTextInspector: true,
      openLayersInspector: true,
    }
  }
  const resolvedKind = (() => {
    const partKey = target.partKey || ""
    const layerId = target.layerId || ""
    if (partKey && layerId) {
      return getCurrentLayer(partKey, layerId)?.kind || ""
    }
    if (target instanceof Textbox) return "text"
    return ""
  })()
  if (resolvedKind === "text") {
    return {
      selectionAction: "canvas-click-text" as SelectionAction,
      openTextInspector: true,
      openLayersInspector: false,
    }
  }
  if (resolvedKind === "image") {
    return {
      selectionAction: "canvas-click-image" as SelectionAction,
      openTextInspector: false,
      openLayersInspector: true,
    }
  }
  return {
    selectionAction: "programmatic" as SelectionAction,
    openTextInspector: true,
    openLayersInspector: true,
  }
}

function syncSelection(options?: {
  openTextInspector?: boolean
  openLayersInspector?: boolean
  selectionSource?: SelectionSource
  selectionAction?: SelectionAction
}) {
  const target = getActiveOverlay()
  const partKey = target?.partKey || activePartKey.value || props.selectedPartKey || ""
  const layerId = target?.layerId || activeLayerId.value || ""
  activePartKey.value = partKey
  activeLayerId.value = layerId
  syncDomOverlaySelectionState(target)
  updateActiveSelectionMetrics()
  refreshSelectionOverlayPositions()
  const layerCount = partKey ? overlayState.get(partKey)?.length || 0 : 0
  const currentLayer = partKey && layerId ? getCurrentLayer(partKey, layerId) : null
  emit("selectionChange", {
    partKey,
    hasObject: Boolean(target),
    layerId,
    layerCount,
    layerKind: currentLayer?.kind || "",
    selectionSource: options?.selectionSource || "programmatic",
    selectionAction: options?.selectionAction || "programmatic",
    openTextInspector: Boolean(options?.openTextInspector && currentLayer?.kind === "text"),
    openLayersInspector: Boolean(options?.openLayersInspector && currentLayer?.kind === "image"),
    textState: currentLayer?.kind === "text" && activeTextMetrics.value
      ? activeTextMetrics.value
      : null,
    imageState: currentLayer?.kind === "image" && activeImageMetrics.value
      ? activeImageMetrics.value
      : null,
  })
}

function getStateSignature() {
  const entries = Array.from(overlayState.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([partKey, layers]) => ({
      partKey,
      layers: layers.map((layer) => ({
        id: layer.id,
        left: Number(layer.left.toFixed(2)),
        top: Number(layer.top.toFixed(2)),
        scaleX: Number(layer.scaleX.toFixed(4)),
        scaleY: Number(layer.scaleY.toFixed(4)),
        angle: Number(layer.angle.toFixed(2)),
        hidden: Boolean(layer.hidden),
        kind: layer.kind,
        srcToken: layer.kind === "image" ? signatureToken(layer.src) : "",
        opacity: layer.kind === "image" ? layer.opacity : 1,
        tileMode: layer.kind === "image" ? resolveImageTileMode(layer) : "single",
        svgFillSignature: layer.kind === "image"
          ? (layer.svgLayers || []).map((item) => `${item.id}:${item.currentFill}`).join("|")
          : "",
        text: layer.kind === "text" ? layer.text : "",
        // 0.4.58: 把 name 纳入签名,确保重命名后 Place Order 弹窗 computed 能感知重算
        name: String(layer.name || ""),
        fontSize: layer.kind === "text" ? layer.fontSize : 0,
        fill: layer.kind === "text" ? layer.fill : "",
        fontFamily: layer.kind === "text" ? layer.fontFamily : "",
        lineHeight: layer.kind === "text" ? layer.lineHeight : 0,
        fontWeight: layer.kind === "text" ? layer.fontWeight : "",
        fontStyle: layer.kind === "text" ? layer.fontStyle : "",
        textAlign: layer.kind === "text" ? layer.textAlign : "",
        width: layer.kind === "text" ? Number(layer.width.toFixed(2)) : 0,
      })),
    }))
  return JSON.stringify(entries)
}

function buildPartExportSignature(
  part: EditorPart,
  layers: OverlayLayer[],
  partBackgroundColor: string,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  const payload = {
    partName: part.part_name,
    cutout: signatureToken(part.cutout_url),
    guide: signatureToken(part.guide_url),
    svg: signatureToken(part.svg_url),
    background: partBackgroundColor,
    width,
    height,
    sourceWidth,
    sourceHeight,
    layers: layers.map((layer) => (
      layer.kind === "image"
        ? {
            id: layer.id,
            kind: layer.kind,
            left: Number(layer.left.toFixed(2)),
            top: Number(layer.top.toFixed(2)),
            scaleX: Number(layer.scaleX.toFixed(4)),
            scaleY: Number(layer.scaleY.toFixed(4)),
            angle: Number(layer.angle.toFixed(2)),
            hidden: Boolean(layer.hidden),
            src: signatureToken(layer.src),
            opacity: layer.opacity,
            tileMode: resolveImageTileMode(layer),
            svgFill: (layer.svgLayers || []).map((item) => `${item.id}:${item.currentFill}`).join("|"),
          }
        : {
            id: layer.id,
            kind: layer.kind,
            left: Number(layer.left.toFixed(2)),
            top: Number(layer.top.toFixed(2)),
            scaleX: Number(layer.scaleX.toFixed(4)),
            scaleY: Number(layer.scaleY.toFixed(4)),
            angle: Number(layer.angle.toFixed(2)),
            hidden: Boolean(layer.hidden),
            text: layer.text,
            styles: signatureToken(JSON.stringify(layer.styles || null)),
            fontSize: layer.fontSize,
            fill: layer.fill,
            fontFamily: layer.fontFamily,
            fontWeight: layer.fontWeight,
            fontStyle: layer.fontStyle,
            lineHeight: layer.lineHeight,
            textAlign: layer.textAlign,
            width: Number(layer.width.toFixed(2)),
          }
    )),
  }
  return signatureToken(JSON.stringify(payload))
}

async function buildExportObject(
  layer: OverlayLayer,
  width: number,
  height: number,
  baseWidth: number,
  baseHeight: number,
) {
  const xScale = width / baseWidth
  const yScale = height / baseHeight
  if (layer.kind === "image") {
    const overlay = layer.svgMarkup
      ? await loadSvgArtworkOverlayFromMarkup(applySvgLayerFills(layer.svgMarkup, resolveSvgFillLayers(layer)))
      : await loadArtworkOverlay(layer.src, layer.previewSrc)
    overlay.set({
      left: layer.left * xScale,
      top: layer.top * yScale,
      angle: layer.angle,
      scaleX: layer.scaleX * xScale,
      scaleY: layer.scaleY * yScale,
      originX: "center",
      originY: "center",
      opacity: layer.opacity,
      selectable: false,
      evented: false,
    })
    return overlay
  }
  return new Textbox(layer.text, {
    left: layer.left * xScale,
    top: layer.top * yScale,
    angle: layer.angle,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    width: layer.width * xScale,
    fontSize: layer.fontSize * yScale,
    styles: layer.styles as any,
    fill: layer.fill,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    textAlign: layer.textAlign,
    fontFamily: layer.fontFamily,
    lineHeight: layer.lineHeight,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    editable: false,
  }) as ActiveCanvasObject
}

async function buildExportSceneObjects(
  layer: OverlayLayer,
  width: number,
  height: number,
  baseWidth: number,
  baseHeight: number,
  frameBox: Pick<StageFrame, "left" | "top" | "width" | "height">,
) {
  const overlay = await buildExportObject(layer, width, height, baseWidth, baseHeight)
  if (layer.kind !== "image") {
    return [overlay]
  }
  const expanded = await expandImageLayerObjects(layer, overlay, frameBox)
  return expanded.objects
}

function buildTilePlacements(
  source: ActiveCanvasObject,
  mode: ImageTileMode,
  frameBox: Pick<StageFrame, "left" | "top" | "width" | "height">,
) {
  if (mode === "single") return [] as Array<{ left: number; top: number; scaleX: number; scaleY: number }>
  source.setCoords()
  const bounds = source.getBoundingRect()
  return buildImageTilePlacements({
    mode,
    frameBox,
    baseLeft: Number(source.left || 0),
    baseTop: Number(source.top || 0),
    baseScaleX: Number(source.scaleX || 1),
    baseScaleY: Number(source.scaleY || 1),
    angle: Number(source.angle || 0),
    objectWidth: Number(source.width || bounds.width || 1),
    objectHeight: Number(source.height || bounds.height || 1),
    boundsWidth: Math.max(Number(bounds.width || 0), 1),
    boundsHeight: Math.max(Number(bounds.height || 0), 1),
  })
}

async function expandImageLayerObjects(
  layer: ImageLayer,
  source: ActiveCanvasObject,
  frameBox: Pick<StageFrame, "left" | "top" | "width" | "height">,
) {
  const mode = resolveImageTileMode(layer)
  source.isTileClone = false
  const placements = buildTilePlacements(source, mode, frameBox)
  if (!placements.length) {
    return {
      primary: source,
      objects: [source],
    }
  }
  const clones = await Promise.all(placements.map(async (placement) => {
    const clone = await source.clone() as ActiveCanvasObject
    clone.set({
      left: placement.left,
      top: placement.top,
      scaleX: placement.scaleX,
      scaleY: placement.scaleY,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      hoverCursor: "default",
      moveCursor: "default",
    })
    clone.partKey = source.partKey
    clone.layerId = source.layerId
    clone.layerKind = source.layerKind
    clone.isTileClone = true
    return clone
  }))
  return {
    primary: source,
    objects: [source, ...clones],
  }
}

async function drawScene(source: StateChangeSource = "sync", options?: { suppressAutoPreview?: boolean }) {
  if (!fabricCanvas.value) return
  const canvas = fabricCanvas.value
  const currentToken = ++drawSceneToken
  const isCurrentDraw = () => currentToken === drawSceneToken && fabricCanvas.value === canvas
  resetDomOverlaySelectionState()
  refreshSelectionOverlayPositions()
  const visiblePartKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  const visiblePart = props.parts?.find((part) => part.part_name === visiblePartKey) || props.parts?.[0] || null
  const frame = stageFrame.value
  const sceneObjects: any[] = [
    new Rect({
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      rx: 18,
      ry: 18,
      fill: props.stageBackgroundColor || props.partBackgroundColors?.[visiblePartKey] || "#f8fafc",
      strokeWidth: 0,
      selectable: false,
      evented: false,
    }),
  ]
  if (props.showGrid) {
    const stepX = frame.width / GRID_DIVISIONS
    const stepY = frame.height / GRID_DIVISIONS
    for (let index = 1; index < GRID_DIVISIONS; index += 1) {
      const verticalX = frame.left + (stepX * index)
      const horizontalY = frame.top + (stepY * index)
      const isCenterLine = index === GRID_DIVISIONS / 2
      sceneObjects.push(new Line([verticalX, frame.top, verticalX, frame.top + frame.height], {
        stroke: isCenterLine ? "rgba(79, 70, 229, 0.32)" : "rgba(148, 163, 184, 0.22)",
        strokeWidth: isCenterLine ? 1.2 : 1,
        selectable: false,
        evented: false,
      }))
      sceneObjects.push(new Line([frame.left, horizontalY, frame.left + frame.width, horizontalY], {
        stroke: isCenterLine ? "rgba(79, 70, 229, 0.32)" : "rgba(148, 163, 184, 0.22)",
        strokeWidth: isCenterLine ? 1.2 : 1,
        selectable: false,
        evented: false,
      }))
    }
  }
  // Keep the product base silhouette on the bottom using the 001 cutout PNG,
  // or the SVG guide when provided, then draw the 002 guide PNG above editable layers.
  const partAlignment = await resolvePartAlignment(visiblePart, frame)
  if (visiblePart?.part_name) {
    partAlignmentState.set(visiblePart.part_name, partAlignment)
  }
  const bottomReferenceAssetUrl = visiblePart?.svg_url || visiblePart?.cutout_url || props.svgUrl || props.cutoutUrl
  if (bottomReferenceAssetUrl) {
    try {
      const guide = await loadGuideOverlay(bottomReferenceAssetUrl)
      if (!isCurrentDraw()) return
      guide.set({
        selectable: false,
        evented: false,
        opacity: 0.28,
      })
      const applied = isSvgAsset(bottomReferenceAssetUrl)
        ? applyObjectToBox(guide, partAlignment.previewBox)
        : false
      if (!applied) {
        fitObjectToFrame(guide, frame)
      }
      sceneObjects.push(guide)
    } catch {
      // ignore guide overlay failures and keep editor usable
    }
  } else {
    sceneObjects.push(
      new Textbox(canvasText("uploadArtworkHint"), {
        left: frame.left + (frame.width * 0.14),
        top: frame.top + (frame.height * 0.45),
        width: frame.width * 0.72,
        fontSize: 22,
        fill: "#94a3b8",
        textAlign: "center",
        selectable: false,
      }),
    )
  }
  const visibleLayers = visiblePartKey ? overlayState.get(visiblePartKey) || [] : []
  await preloadCanvasFonts(visibleLayers)
  let activeObjectToSelect: ActiveCanvasObject | null = null
  let topMaskOverlay: ActiveCanvasObject | null = null
  for (const layer of visibleLayers) {
    if (layer.hidden) continue
    if (layer.kind === "image") {
      try {
        const svgLayers = resolveSvgFillLayers(layer)
        const overlay = layer.svgMarkup
          ? await loadSvgArtworkOverlayFromMarkup(applySvgLayerFills(layer.svgMarkup, svgLayers))
          : await loadArtworkOverlay(layer.src, layer.previewSrc)
        if (!isCurrentDraw()) return
        const position = templateToCanvasPoint(layer.left, layer.top, frame, partAlignment)
        overlay.set({
          left: position.left,
          top: position.top,
          angle: layer.angle,
          scaleX: layer.scaleX * frame.displayScale,
          scaleY: layer.scaleY * frame.displayScale,
          opacity: layer.opacity,
          originX: "center",
          originY: "center",
        })
        applyOverlaySelectionStyle(overlay)
        overlay.partKey = visiblePartKey
        overlay.layerId = layer.id
        overlay.layerKind = layer.kind
        overlay.isTileClone = false
        const expanded = await expandImageLayerObjects(layer, overlay, frame)
        sceneObjects.push(...expanded.objects)
        if (activeLayerId.value && activeLayerId.value === layer.id) {
          activeObjectToSelect = expanded.primary
        }
      } catch {
        // 0.4.66: image layer 资源 404 时，向父组件上报，由父组件将该 layer 从
        // localStorage / IndexedDB 持久化中剔除，避免下次进入再次触发同一份 404。
        emit("artworkLoadFailure", {
          partKey: visiblePartKey,
          layerId: layer.id,
          src: String(layer.src || ""),
          previewSrc: layer.previewSrc ? String(layer.previewSrc) : undefined,
          stage: "draw",
        })
      }
      continue
    }
    const overlay = new Textbox(layer.text, {
      left: templateToCanvasPoint(layer.left, layer.top, frame, partAlignment).left,
      top: templateToCanvasPoint(layer.left, layer.top, frame, partAlignment).top,
      angle: layer.angle,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      width: layer.width * frame.displayScale,
      fontSize: layer.fontSize * frame.displayScale,
      styles: layer.styles as any,
      fill: layer.fill,
      fontWeight: layer.fontWeight,
      fontStyle: layer.fontStyle,
      textAlign: layer.textAlign,
      fontFamily: layer.fontFamily,
      lineHeight: layer.lineHeight,
      originX: "center",
      originY: "center",
      editable: true,
    }) as ActiveCanvasObject
    applyOverlaySelectionStyle(overlay)
    overlay.partKey = visiblePartKey
    overlay.layerId = layer.id
    overlay.layerKind = layer.kind
    sceneObjects.push(overlay)
    if (activeLayerId.value && activeLayerId.value === layer.id) {
      activeObjectToSelect = overlay
    }
  }
  const topMaskAssetUrl = visiblePart?.guide_url || props.guideUrl
  if (topMaskAssetUrl) {
    try {
      const maskOverlay = await loadGuideOverlay(topMaskAssetUrl)
      if (!isCurrentDraw()) return
      maskOverlay.set({
        selectable: false,
        evented: false,
        opacity: 1,
      })
      fitObjectToFrame(maskOverlay, frame)
      sceneObjects.push(maskOverlay)
      topMaskOverlay = maskOverlay
    } catch {
      // ignore mask overlay failures and keep editor usable
    }
  }
  if (!isCurrentDraw()) return
  canvas.clear()
  canvas.backgroundColor = "#ffffff"
  sceneObjects.forEach((item) => canvas.add(item))
  if (topMaskOverlay) {
    canvas.remove(topMaskOverlay)
    canvas.add(topMaskOverlay)
  }
  canvas.getObjects().forEach((item) => {
    item.setCoords()
  })
  if (activeObjectToSelect && isCurrentDraw()) {
    canvas.setActiveObject(activeObjectToSelect)
    activeObjectToSelect.setCoords()
  }
  if (topMaskOverlay) {
    canvas.remove(topMaskOverlay)
    canvas.add(topMaskOverlay)
    topMaskOverlay.setCoords()
  }
  syncCanvasControlTargets(canvas)
  if (!isCurrentDraw()) return
  canvas.renderAll()
  refreshPointerOffsets()
  syncSelection()
  emitStateChange(source, Boolean(options?.suppressAutoPreview))
}

async function addArtwork(file: File) {
  const src = await readFileAsDataUrl(file)
  await addArtworkSource(src, file.name, undefined, { libraryScope: "owned" })
}

async function addArtworkSource(
  src: string,
  name?: string,
  previewSrc?: string,
  options?: {
    libraryScope?: "owned" | "platform" | "tenant" | "licensed"
    artworkId?: string
  },
) {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  if (!partKey) return
  const frame = stageFrame.value
  const stablePreviewSrc = String(previewSrc || "").trim() || String(src || "").trim()
  const rawSvgMarkup = await resolveSvgMarkup(src)
  const parsedSvg = parseSvgMarkupLayers(rawSvgMarkup)
  let initialScale = 0.45
  try {
    const image = await loadImage(src)
    const maxWidth = frame.templateWidth * ARTWORK_FIT_RATIO
    const maxHeight = frame.templateHeight * ARTWORK_FIT_RATIO
    const fitScale = Math.min(maxWidth / Math.max(image.width, 1), maxHeight / Math.max(image.height, 1), 1)
    if (Number.isFinite(fitScale) && fitScale > 0) {
      initialScale = fitScale
    }
  } catch {
    // Keep the previous fallback if the browser cannot probe the uploaded image size.
  }
  const layer: OverlayLayer = {
    id: `${partKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    kind: "image",
    src,
    previewSrc: stablePreviewSrc || undefined,
    svgMarkup: parsedSvg.markup || undefined,
    svgFill: parsedSvg.layers[0]?.currentFill || undefined,
    svgLayers: parsedSvg.layers.length ? parsedSvg.layers : undefined,
    name,
    libraryScope: options?.libraryScope,
    artworkId: options?.artworkId,
    left: frame.templateWidth / 2,
    top: frame.templateHeight / 2,
    scaleX: initialScale,
    scaleY: initialScale,
    angle: 0,
    hidden: false,
    opacity: DEFAULT_IMAGE_OPACITY,
    tileMode: "single",
  }
  const before = snapshotState()
  overlayState.set(partKey, [...(overlayState.get(partKey) || []), layer])
  activePartKey.value = partKey
  activeLayerId.value = layer.id
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

async function addText(text = DEFAULT_NEW_TEXT_CONTENT) {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  if (!partKey) return
  const frame = stageFrame.value
  const existingTextCount = (overlayState.get(partKey) || []).filter((item) => item.kind === "text").length
  const layer: TextLayer = {
    id: `${partKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    kind: "text",
    name: `${canvasText("text")} ${existingTextCount + 1}`,
    left: frame.templateWidth / 2,
    top: frame.templateHeight / 2,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    text,
    fontSize: 52 / frame.displayScale,
    fill: "#111827",
    fontWeight: "700",
    fontStyle: "normal",
    textAlign: "center",
    fontFamily: DEFAULT_TEXT_FONT_FAMILY,
    lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
    width: 340 / frame.displayScale,
    hidden: false,
  }
  const before = snapshotState()
  overlayState.set(partKey, [...(overlayState.get(partKey) || []), layer])
  activePartKey.value = partKey
  activeLayerId.value = layer.id
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

function stopTextEditing() {
  const canvas = fabricCanvas.value
  const target = getActiveOverlay()
  if (!canvas || !(target instanceof Textbox) || !target.isEditing) return false
  target.exitEditing()
  target.hiddenTextarea?.blur()
  canvas.renderAll()
  return true
}

function cloneTextStyles(value: unknown) {
  if (!value || typeof value !== "object") return undefined
  try {
    return JSON.parse(JSON.stringify(value)) as unknown
  } catch {
    return undefined
  }
}

async function applyActiveTextScript(kind: "superscript" | "subscript" | "clear") {
  const canvas = fabricCanvas.value
  const target = getActiveOverlay()
  if (!canvas || !(target instanceof Textbox)) return false
  if (!target.isEditing) {
    target.enterEditing()
    target.hiddenTextarea?.focus()
  }
  const text = String(target.text || "")
  const selectionStart = Number((target as unknown as { selectionStart?: unknown }).selectionStart || 0)
  const selectionEnd = Number((target as unknown as { selectionEnd?: unknown }).selectionEnd || selectionStart)
  const rawStart = Math.max(0, Math.min(selectionStart, text.length))
  const rawEnd = Math.max(0, Math.min(selectionEnd, text.length))
  const start = rawStart === rawEnd ? rawStart : Math.min(rawStart, rawEnd)
  const end = rawStart === rawEnd ? Math.min(rawEnd + 1, text.length) : Math.max(rawStart, rawEnd)
  if (start >= end) return false
  const apply = target as unknown as {
    setSuperscript?: (s: number, e: number) => void
    setSubscript?: (s: number, e: number) => void
    setSelectionStyles?: (style: Record<string, unknown>, s: number, e: number) => void
    styles?: unknown
    partKey?: string
    layerId?: string
  }
  if (kind === "superscript") {
    if (typeof apply.setSuperscript !== "function") return false
    apply.setSuperscript(start, end)
  } else if (kind === "subscript") {
    if (typeof apply.setSubscript !== "function") return false
    apply.setSubscript(start, end)
  } else {
    if (typeof apply.setSelectionStyles !== "function") return false
    apply.setSelectionStyles({ fontSize: undefined, deltaY: undefined }, start, end)
  }
  canvas.requestRenderAll?.() ?? canvas.renderAll()
  const partKey = apply.partKey || props.selectedPartKey || activePartKey.value
  const layerId = apply.layerId || activeLayerId.value
  const layers = partKey ? overlayState.get(partKey) || [] : []
  const current = layers.find((item): item is TextLayer => item.id === layerId && item.kind === "text")
  if (!partKey || !current) return true
  const before = snapshotState()
  current.styles = cloneTextStyles(apply.styles)
  overlayState.set(partKey, layers.map((item) => (item.id === current.id ? current : item)))
  syncSelection()
  recordHistoryChange(before, snapshotState())
  emitStateChange("user", true)
  return true
}

async function applyTextSuperscript() {
  return await applyActiveTextScript("superscript")
}

async function applyTextSubscript() {
  return await applyActiveTextScript("subscript")
}

async function clearTextScript() {
  return await applyActiveTextScript("clear")
}

async function updateActiveOverlay(mutator: (state: OverlayLayer) => void) {
  const target = getActiveOverlay()
  const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
  const layerId = target?.layerId || activeLayerId.value
  const layers = partKey ? overlayState.get(partKey) || [] : []
  const current = layers.find((item) => item.id === layerId)
  if (!partKey || !current) return
  const before = snapshotState()
  mutator(current)
  overlayState.set(partKey, layers.map((item) => (item.id === current.id ? current : item)))
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

async function updateActiveText(patch: Partial<TextLayerState>) {
  if (patch.fontFamily != null || patch.fontWeight != null) {
    const target = getActiveOverlay()
    const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
    const layerId = target?.layerId || activeLayerId.value
    const layers = partKey ? overlayState.get(partKey) || [] : []
    const current = layers.find((item): item is TextLayer => item.id === layerId && item.kind === "text") || null
    const currentFontFamily = current?.fontFamily || DEFAULT_TEXT_FONT_FAMILY
    const currentFontWeight = current?.fontWeight || "normal"
    const nextFontFamily = patch.fontFamily != null
      ? normalizeTextFontFamily(patch.fontFamily, currentFontFamily)
      : currentFontFamily
    const nextFontWeight = patch.fontWeight != null
      ? String(patch.fontWeight)
      : currentFontWeight
    await ensureCanvasFontLoaded(nextFontFamily, nextFontWeight)
  }
  if (renderImmediateOverlayChange((state) => {
    if (state.kind !== "text") return
    if (patch.text != null) {
      state.text = patch.text
      state.styles = undefined
    }
    if (patch.fontSize != null) state.fontSize = normalizeTextFontSize(patch.fontSize, state.fontSize)
    if (patch.fill != null) state.fill = patch.fill
    if (patch.fontWeight != null) state.fontWeight = patch.fontWeight
    if (patch.fontStyle != null) state.fontStyle = patch.fontStyle
    if (patch.textAlign != null) state.textAlign = patch.textAlign
    if (patch.fontFamily != null) state.fontFamily = normalizeTextFontFamily(patch.fontFamily, state.fontFamily)
    if (patch.lineHeight != null) state.lineHeight = normalizeTextLineHeight(patch.lineHeight, state.lineHeight)
  }, (target, state) => {
    if (!(target instanceof Textbox) || state.kind !== "text") return
    target.set({
      text: state.text,
      fontSize: state.fontSize * stageFrame.value.displayScale,
      fill: state.fill,
      fontWeight: state.fontWeight,
      fontStyle: state.fontStyle,
      textAlign: state.textAlign,
      fontFamily: state.fontFamily,
      lineHeight: state.lineHeight,
    })
    if (patch.text != null) {
      ;(target as unknown as { styles?: unknown }).styles = {}
    }
    ;(target as Textbox & { initDimensions?: () => void }).initDimensions?.()
    target.dirty = true
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    if (state.kind !== "text") return
    if (patch.text != null) {
      state.text = patch.text
      state.styles = undefined
    }
    if (patch.fontSize != null) state.fontSize = normalizeTextFontSize(patch.fontSize, state.fontSize)
    if (patch.fill != null) state.fill = patch.fill
    if (patch.fontWeight != null) state.fontWeight = patch.fontWeight
    if (patch.fontStyle != null) state.fontStyle = patch.fontStyle
    if (patch.textAlign != null) state.textAlign = patch.textAlign
    if (patch.fontFamily != null) state.fontFamily = normalizeTextFontFamily(patch.fontFamily, state.fontFamily)
    if (patch.lineHeight != null) state.lineHeight = normalizeTextLineHeight(patch.lineHeight, state.lineHeight)
  })
}

async function updateActiveImage(patch: Partial<ImageLayerState>) {
  const target = getActiveOverlay()
  const canvas = fabricCanvas.value
  const hasOnlyOpacityPatch = patch.opacity != null && Object.keys(patch).length === 1
  if (
    hasOnlyOpacityPatch
    && canvas
    && target
    && target.layerKind === "image"
  ) {
    const partKey = target.partKey || props.selectedPartKey || activePartKey.value
    const layerId = target.layerId || activeLayerId.value
    const layers = partKey ? overlayState.get(partKey) || [] : []
    const current = layers.find((item): item is ImageLayer => item.id === layerId && item.kind === "image")
    if (!partKey || !current) return
    const nextOpacity = normalizeImageOpacity(patch.opacity, current.opacity)
    if (Math.abs(nextOpacity - current.opacity) < 0.001) return
    const before = snapshotState()
    current.opacity = nextOpacity
    overlayState.set(partKey, layers.map((item) => (item.id === current.id ? current : item)))
    const relatedTargets = (canvas.getObjects() as ActiveCanvasObject[]).filter((item) => (
      item.partKey === partKey
      && item.layerId === current.id
      && item.layerKind === "image"
    ))
    relatedTargets.forEach((item) => {
      item.set("opacity", nextOpacity)
      syncTargetInteractionState(item)
    })
    canvas.renderAll()
    syncSelection()
    recordHistoryChange(before, snapshotState())
    emitStateChange("user", true)
    return
  }
  const nextSvgFill = normalizeSvgColorValue(patch.svgFill || "")
  const nextSvgLayerId = String(patch.activeSvgLayerId || "").trim()
  if (nextSvgFill && nextSvgLayerId) {
    const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
    const layerId = target?.layerId || activeLayerId.value
    const layers = partKey ? overlayState.get(partKey) || [] : []
    const current = layers.find((item): item is ImageLayer => item.id === layerId && item.kind === "image")
    if (!partKey || !current?.svgMarkup) return
    const svgLayers = resolveSvgFillLayers(current)
    const editableLayer = svgLayers.find((item) => item.id === nextSvgLayerId)
    if (!editableLayer) return
    if (nextSvgFill === editableLayer.currentFill) return
    const before = snapshotState()
    current.svgLayers = svgLayers.map((item) => (
      item.id === nextSvgLayerId
        ? { ...item, currentFill: nextSvgFill }
        : { ...item }
    ))
    current.svgFill = current.svgLayers[0]?.currentFill || nextSvgFill
    overlayState.set(partKey, layers.map((item) => (item.id === current.id ? current : item)))
    recordHistoryChange(before, snapshotState())
    await drawScene("user", { suppressAutoPreview: true })
    return
  }
  await updateActiveOverlay((state) => {
    if (state.kind !== "image") return
    if (patch.opacity != null) state.opacity = normalizeImageOpacity(patch.opacity, state.opacity)
    if (patch.tileMode != null) state.tileMode = normalizeImageTileMode(patch.tileMode)
  })
}

async function setActiveImageTileMode(mode: ImageTileMode) {
  await updateActiveOverlay((state) => {
    if (state.kind !== "image") return
    state.tileMode = normalizeImageTileMode(mode)
  })
}

function renderImmediateOverlayChange(
  mutator: (state: OverlayLayer) => void,
  applyToTarget: (target: ActiveCanvasObject, state: OverlayLayer, frame: StageFrame, alignment?: PartReferenceAlignment) => void,
  options?: { suppressAutoPreview?: boolean },
) {
  const target = getActiveOverlay()
  const canvas = fabricCanvas.value
  const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
  const layerId = target?.layerId || activeLayerId.value
  const layers = partKey ? overlayState.get(partKey) || [] : []
  const current = layers.find((item) => item.id === layerId)
  if (!canvas || !target || !partKey || !current) return false
  const before = snapshotState()
  mutator(current)
  overlayState.set(partKey, layers.map((item) => (item.id === current.id ? current : item)))
  const alignment = partAlignmentState.get(partKey)
  applyToTarget(target, current, stageFrame.value, alignment)
  syncTargetInteractionState(target)
  canvas.renderAll()
  canvas.calcOffset()
  syncSelection()
  recordHistoryChange(before, snapshotState())
  emitStateChange("user", Boolean(options?.suppressAutoPreview))
  return true
}

async function exportPartBlobs(outputSize?: string) {
  if (!props.parts?.length) {
    return [] as Array<{ partName: string; blob: Blob }>
  }
  const explicitSize = parseSizeToken(outputSize)
  const fallbackSize = parseSizeToken(props.templateSize)
  const sourceWidth = fallbackSize?.width || 1200
  const sourceHeight = fallbackSize?.height || 1200
  const width = explicitSize?.width || sourceWidth
  const height = explicitSize?.height || sourceHeight
  const entries: Array<{ partName: string; blob: Blob }> = []
  const activeCacheKeys = new Set<string>()
  const exportFrame = {
    left: 0,
    top: 0,
    width: sourceWidth,
    height: sourceHeight,
    templateWidth: sourceWidth,
    templateHeight: sourceHeight,
    displayScale: 1,
  } satisfies StageFrame
  for (const part of props.parts) {
    const layers = overlayState.get(part.part_name) || []
    const partBackgroundColor = String(props.partBackgroundColors?.[part.part_name] || "")
    if (!layers?.length && !partBackgroundColor) {
      continue
    }
    const cacheKey = `${part.part_name}:${width}x${height}`
    const signature = buildPartExportSignature(
      part,
      layers,
      partBackgroundColor,
      width,
      height,
      sourceWidth,
      sourceHeight,
    )
    activeCacheKeys.add(cacheKey)
    const cached = partBlobExportCache.get(cacheKey)
    if (cached && cached.signature === signature) {
      entries.push({ partName: part.part_name, blob: cached.blob })
      continue
    }
    const exportBackgroundColor = partBackgroundColor || "transparent"
    const partAlignment = partAlignmentState.get(part.part_name) || await resolvePartAlignment(part, exportFrame)
    const offscreen = document.createElement("canvas")
    offscreen.width = width
    offscreen.height = height
    const fillExportBackground = () => {
      const context = offscreen.getContext("2d")
      if (!context) return
      context.clearRect(0, 0, width, height)
      if (!partBackgroundColor) return
      context.fillStyle = partBackgroundColor
      context.fillRect(0, 0, width, height)
    }
    const baseWidth = sourceWidth
    const baseHeight = sourceHeight
    let blob: Blob | null = null
    let exportCanvas: Canvas | null = null
    let alignedCanvas: Canvas | null = null
    try {
      if (partAlignment.kind === "transformed") {
        const scaledTargetBox = buildFrameAlignedBox({
          bounds: {
            x: partAlignment.templateBox.left,
            y: partAlignment.templateBox.top,
            width: partAlignment.templateBox.width,
            height: partAlignment.templateBox.height,
          },
          sourceWidth,
          sourceHeight,
          frame: buildFrameBox(0, 0, width, height),
        })
        if (scaledTargetBox) {
          const alignedCanvasElement = document.createElement("canvas")
          alignedCanvasElement.width = Math.max(1, Math.round(scaledTargetBox.width))
          alignedCanvasElement.height = Math.max(1, Math.round(scaledTargetBox.height))
          alignedCanvas = new Canvas(alignedCanvasElement, {
            width: alignedCanvasElement.width,
            height: alignedCanvasElement.height,
            renderOnAddRemove: false,
            backgroundColor: "transparent",
            selection: false,
          })
          for (const layer of layers) {
            if (layer.hidden) continue
            try {
              const overlays = await buildExportSceneObjects(layer, width, height, baseWidth, baseHeight, exportFrame)
              overlays.forEach((overlay) => {
                overlay.set({
                  left: Number(overlay.left || 0) - scaledTargetBox.left,
                  top: Number(overlay.top || 0) - scaledTargetBox.top,
                })
                alignedCanvas?.add(overlay)
              })
            } catch {
              // Keep rendering the remaining layers so preview export can still succeed.
            }
          }
          alignedCanvas.renderAll()
          const context = offscreen.getContext("2d")
          if (context) {
            fillExportBackground()
            context.drawImage(
              alignedCanvasElement,
              scaledTargetBox.left,
              scaledTargetBox.top,
              scaledTargetBox.width,
              scaledTargetBox.height,
            )
          }
        }
      }
      if (!alignedCanvas) {
        exportCanvas = new Canvas(offscreen, {
          width,
          height,
          renderOnAddRemove: false,
          backgroundColor: exportBackgroundColor,
          selection: false,
        })
        for (const layer of layers) {
          if (layer.hidden) {
            continue
          }
          try {
            const overlays = await buildExportSceneObjects(layer, width, height, baseWidth, baseHeight, exportFrame)
            overlays.forEach((overlay) => {
              exportCanvas?.add(overlay)
            })
          } catch {
            // Keep rendering the remaining layers so preview export can still succeed.
          }
        }
        exportCanvas.renderAll()
      }
      blob = await new Promise<Blob | null>((resolve) => offscreen.toBlob(resolve, "image/png"))
    } finally {
      exportCanvas?.dispose()
      alignedCanvas?.dispose()
    }
    if (blob) {
      partBlobExportCache.set(cacheKey, { blob, signature })
      entries.push({ partName: part.part_name, blob })
    }
  }
  for (const key of Array.from(partBlobExportCache.keys())) {
    if (!activeCacheKeys.has(key)) {
      partBlobExportCache.delete(key)
    }
  }
  return entries
}

// 与 RepositoryPreviewPage.vue 中 hashSignatureToHex 行为完全一致的 FNV-1a 64-bit
// 二轮实现（32 hex），仅用于 part SVG 的 content_hash 计算，避免引入新哈希算法。
function hashSignatureToHexLocal(input: string): string {
  const text = String(input == null ? "" : input)
  if (!text) return ""
  const fnv = (seedHi: number, seedLo: number) => {
    let hi = seedHi >>> 0
    let lo = seedLo >>> 0
    for (let i = 0; i < text.length; i += 1) {
      const c = text.charCodeAt(i) & 0xff
      lo ^= c
      const a = Math.imul(lo, 0x01000193)
      const b = Math.imul(hi, 0x01000193)
      lo = a >>> 0
      hi = (b + ((Math.imul(c, 0x01000193) >>> 16) & 0xffff)) >>> 0
    }
    return ((hi >>> 0).toString(16).padStart(8, "0") + (lo >>> 0).toString(16).padStart(8, "0"))
  }
  const head = fnv(0x811c9dc5, 0xcbf29ce4)
  const tail = fnv(0x9e3779b9, 0x85ebca6b)
  return head + tail
}

async function exportPartSvgs(
  _targetSize?: { width: number; height: number },
): Promise<Array<{ part_key: string; svg_xml: string; content_hash: string }>> {
  if (!props.parts?.length) {
    return []
  }
  const fallbackSize = parseSizeToken(props.templateSize)
  const sourceWidth = fallbackSize?.width || 1200
  const sourceHeight = fallbackSize?.height || 1200
  // 004 模式：SVG 作为"design canvas"在 base 设计稿尺寸（1200×1200）上栅格化，
  // 后端 _apply_uv_warp 用 part-mapping PNG 的 R/G 通道作为 UV 从 design 采样
  // 到 mapping 网格。SVG 必须保持 base 尺寸——用户在编辑器里定义的 transform
  // 就在 base 坐标系内，强拉到 mapping 分辨率会让所有几何全部错位。
  const width = sourceWidth
  const height = sourceHeight
  const exportFrame = {
    left: 0,
    top: 0,
    width: sourceWidth,
    height: sourceHeight,
    templateWidth: sourceWidth,
    templateHeight: sourceHeight,
    displayScale: 1,
  } satisfies StageFrame
  const entries: Array<{ part_key: string; svg_xml: string; content_hash: string }> = []
  for (const part of props.parts) {
    const partKey = part.part_name
    const layers = overlayState.get(partKey) || []
    const partBackgroundColor = String(props.partBackgroundColors?.[partKey] || "")
    const exportBackgroundColor = partBackgroundColor || "transparent"
    const offscreen = document.createElement("canvas")
    offscreen.width = width
    offscreen.height = height
    let exportCanvas: Canvas | null = null
    try {
      exportCanvas = new Canvas(offscreen, {
        width,
        height,
        renderOnAddRemove: false,
        backgroundColor: exportBackgroundColor,
        selection: false,
      })
      for (const layer of layers) {
        if (layer.hidden) continue
        let overlays: Awaited<ReturnType<typeof buildExportSceneObjects>>
        try {
          overlays = await buildExportSceneObjects(layer, width, height, sourceWidth, sourceHeight, exportFrame)
        } catch {
          // 0.4.66: 单个 image layer 加载失败（OSS 资源 404）时跳过该层而不是
          // 让整个 part 导出失败。同时通知父组件清理本地缓存中的孤儿引用。
          if (layer.kind === "image") {
            emit("artworkLoadFailure", {
              partKey,
              layerId: layer.id,
              src: String(layer.src || ""),
              previewSrc: layer.previewSrc ? String(layer.previewSrc) : undefined,
              stage: "export",
            })
          }
          continue
        }
        for (const overlay of overlays) {
          // 文字层：在前端栅格化为位图（FabricImage 嵌入 base64 PNG），替代
          // 原 Textbox。这样 Canvas.toSVG() 输出 <image> 而不是 <text>，
          // 后端 cairosvg 不再依赖系统字体（避免字形/度量与前端不一致）。
          // overlay 已被 buildExportSceneObjects 按 mapping 比例放大，
          // multiplier=1 即可拿到 mapping 分辨率位图。
          if (layer.kind === "text") {
            try {
              const rasterized = rasterizeTextOverlay(overlay, 1)
              if (rasterized) {
                exportCanvas.add(rasterized)
                continue
              }
            } catch {
              // 栅格化失败时退回原 Textbox（cairosvg 可能字体回退）。
            }
          }
          exportCanvas.add(overlay)
        }
      }
      exportCanvas.renderAll()
      const svgXml = exportCanvas.toSVG()
      const contentHash = hashSignatureToHexLocal(svgXml)
      entries.push({ part_key: partKey, svg_xml: svgXml, content_hash: contentHash })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`exportPartSvgs failed for part "${partKey}": ${message}`)
    } finally {
      exportCanvas?.dispose()
    }
  }
  return entries
}

/**
 * 把一个 Textbox（或其它矢量对象）按指定倍率栅格化为 FabricImage，保持
 * 原始 left/top/angle/originX/originY，scale = 1/multiplier 让显示尺寸不变。
 *
 * 用 ``withoutTransform: true`` 让 toCanvasElement 输出未旋转的画布，旋转
 * 由替换后的 FabricImage 自身 angle 还原；这样旋转角度不会丢失精度。
 */
function rasterizeTextOverlay(source: any, multiplier: number): any | null {
  if (!source || typeof source.toCanvasElement !== "function") return null
  const canvasEl = source.toCanvasElement({
    multiplier,
    withoutTransform: true,
    withoutShadow: false,
    enableRetinaScaling: false,
  })
  if (!canvasEl || !canvasEl.width || !canvasEl.height) return null
  const replacement: any = new FabricImage(canvasEl, { crossOrigin: "anonymous" })
  replacement.set({
    left: source.left,
    top: source.top,
    angle: source.angle || 0,
    originX: source.originX || "center",
    originY: source.originY || "center",
    scaleX: 1 / multiplier,
    scaleY: 1 / multiplier,
    opacity: source.opacity ?? 1,
    selectable: false,
    evented: false,
  })
  replacement.partKey = source.partKey
  replacement.layerId = source.layerId
  replacement.layerKind = source.layerKind
  return replacement
}

/**
 * 与 {@link exportPartSvgs} 对应的 PNG 版本：在 fabric 离屏 canvas 上渲染
 * part 的全部图层（背景色、用户上传图、artwork、文字……）后导出 image/png
 * Blob。后端 grading 合成需要这种"已栅格化"的 part 像素，避免在 server 端
 * 渲染 SVG 引入额外依赖（cairo 等）。
 *
 * 当 grading 合成需要更高分辨率时（例如 part-mapping 实际是 3724×3553，
 * 而 fabric 工作区只有 1200×1200），调用方可以传入 ``targetSize`` 让 fabric
 * **直接在目标分辨率画布上栅格化**矢量层，避免后端 nearest 采样把小图放大
 * 造成的明显模糊。注意：不能用 ``toCanvasElement(multiplier)``——它本质上
 * 是把已栅格化的 lowerCanvas drawImage 拉伸放大，等同于双线性插值，矢量层
 * 不会重新走光栅化路径。
 */
async function exportPartPngs(
  targetSize?: { width: number; height: number },
): Promise<Array<{ part_key: string; blob: Blob; width: number; height: number }>> {
  if (!props.parts?.length) {
    return []
  }
  const fallbackSize = parseSizeToken(props.templateSize)
  const baseWidth = fallbackSize?.width || 1200
  const baseHeight = fallbackSize?.height || 1200
  // 目标画布尺寸：若指定 targetSize，按其与 base 的最大比值统一缩放（保持
  // 宽高比与 base 一致）；上限 8x 防内存爆炸。直接在高分辨率画布上让 fabric
  // 重新栅格化，矢量层（artwork SVG path、Textbox 文字）会按目标 DPI 重新光栅化。
  let scale = 1
  if (targetSize && targetSize.width > 0 && targetSize.height > 0) {
    scale = Math.max(targetSize.width / baseWidth, targetSize.height / baseHeight)
    scale = Math.max(1, Math.min(scale, 8))
  }
  const width = Math.round(baseWidth * scale)
  const height = Math.round(baseHeight * scale)
  const exportFrame = {
    left: 0,
    top: 0,
    width,
    height,
    templateWidth: width,
    templateHeight: height,
    displayScale: 1,
  } satisfies StageFrame
  const entries: Array<{ part_key: string; blob: Blob; width: number; height: number }> = []
  for (const part of props.parts) {
    const partKey = part.part_name
    const layers = overlayState.get(partKey) || []
    const partBackgroundColor = String(props.partBackgroundColors?.[partKey] || "")
    const exportBackgroundColor = partBackgroundColor || "transparent"
    const offscreen = document.createElement("canvas")
    offscreen.width = width
    offscreen.height = height
    let exportCanvas: Canvas | null = null
    try {
      exportCanvas = new Canvas(offscreen, {
        width,
        height,
        renderOnAddRemove: false,
        backgroundColor: exportBackgroundColor,
        selection: false,
        // 关闭 retina scaling，避免 fabric 内部又乘 devicePixelRatio。
        enableRetinaScaling: false,
      })
      // buildExportObject 内部会按 width/baseWidth、height/baseHeight 缩放
      // 各层；这里传 width 与 baseWidth 即可让矢量层在高分辨率上重新栅格化。
      for (const layer of layers) {
        if (layer.hidden) continue
        let overlays: Awaited<ReturnType<typeof buildExportSceneObjects>>
        try {
          overlays = await buildExportSceneObjects(layer, width, height, baseWidth, baseHeight, exportFrame)
        } catch {
          // 0.4.66: 单个 image layer 加载失败（OSS 资源 404）时跳过该层而不是
          // 让整个 part 导出失败。
          if (layer.kind === "image") {
            emit("artworkLoadFailure", {
              partKey,
              layerId: layer.id,
              src: String(layer.src || ""),
              previewSrc: layer.previewSrc ? String(layer.previewSrc) : undefined,
              stage: "export",
            })
          }
          continue
        }
        overlays.forEach((overlay) => {
          exportCanvas?.add(overlay)
        })
      }
      exportCanvas.renderAll()
      // 不能直接用 offscreen.toBlob:fabric 会用 wrapperEl + 独立 lowerCanvas,
      // offscreen 这个 element 上其实什么也没画。改用 fabric 官方的 toCanvasElement()
      // 拿到真正的栅格化 canvas,再 toBlob。multiplier=1：画布本身已是高分辨率，
      // multiplier>1 会再做一次 drawImage 拉伸 → 模糊。
      const rasterCanvas = exportCanvas.toCanvasElement(1)
      const blob = await new Promise<Blob | null>((resolve) => {
        rasterCanvas.toBlob((b) => resolve(b), "image/png")
      })
      if (!blob) {
        throw new Error("toBlob returned null")
      }
      entries.push({
        part_key: partKey,
        blob,
        width: rasterCanvas.width,
        height: rasterCanvas.height,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`exportPartPngs failed for part "${partKey}": ${message}`)
    } finally {
      exportCanvas?.dispose()
    }
  }
  return entries
}

async function scaleActive(factor: number) {
  if (renderImmediateOverlayChange((state) => {
    state.scaleX = Math.max(0.1, state.scaleX * factor)
    state.scaleY = Math.max(0.1, state.scaleY * factor)
  }, (target, state, frame) => {
    target.set({
      scaleX: state.kind === "image" ? state.scaleX * frame.displayScale : state.scaleX,
      scaleY: state.kind === "image" ? state.scaleY * frame.displayScale : state.scaleY,
    })
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    state.scaleX = Math.max(0.1, state.scaleX * factor)
    state.scaleY = Math.max(0.1, state.scaleY * factor)
  })
}

async function resizeActiveImage(axis: "width" | "height", factor: number) {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) return
  if (renderImmediateOverlayChange((state) => {
    if (state.kind !== "image") return
    if (axis === "width") {
      state.scaleX = Math.max(0.1, state.scaleX * factor)
      return
    }
    state.scaleY = Math.max(0.1, state.scaleY * factor)
  }, (target, state, frame) => {
    if (state.kind !== "image") return
    target.set({
      scaleX: state.scaleX * frame.displayScale,
      scaleY: state.scaleY * frame.displayScale,
    })
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    if (state.kind !== "image") return
    if (axis === "width") {
      state.scaleX = Math.max(0.1, state.scaleX * factor)
      return
    }
    state.scaleY = Math.max(0.1, state.scaleY * factor)
  })
}

async function resizeActiveTextbox(axis: "width" | "height", factor: number) {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) return
  if (renderImmediateOverlayChange((state) => {
    if (state.kind !== "text") return
    if (axis === "width") {
      state.scaleX = Math.max(0.1, state.scaleX * factor)
      return
    }
    state.scaleY = Math.max(0.1, state.scaleY * factor)
  }, (target, state) => {
    if (!(target instanceof Textbox) || state.kind !== "text") return
    target.set({
      scaleX: state.scaleX,
      scaleY: state.scaleY,
    })
    ;(target as Textbox & { initDimensions?: () => void }).initDimensions?.()
    target.dirty = true
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    if (state.kind !== "text") return
    if (axis === "width") {
      state.scaleX = Math.max(0.1, state.scaleX * factor)
      return
    }
    state.scaleY = Math.max(0.1, state.scaleY * factor)
  })
}

async function resizeActiveTextContent(axis: "width" | "height", factor: number) {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) return
  if (renderImmediateOverlayChange((state) => {
    if (state.kind !== "text") return
    if (axis === "width") {
      state.scaleX = Math.max(0.1, state.scaleX * factor)
      return
    }
    state.fontSize = normalizeTextFontSize(state.fontSize * factor, state.fontSize)
  }, (target, state) => {
    if (!(target instanceof Textbox) || state.kind !== "text") return
    target.set({
      scaleX: state.scaleX,
      fontSize: state.fontSize * stageFrame.value.displayScale,
    })
    ;(target as Textbox & { initDimensions?: () => void }).initDimensions?.()
    target.dirty = true
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    if (state.kind !== "text") return
    if (axis === "width") {
      state.scaleX = Math.max(0.1, state.scaleX * factor)
      return
    }
    state.fontSize = normalizeTextFontSize(state.fontSize * factor, state.fontSize)
  })
}

async function flipActive(axis: "x" | "y") {
  if (renderImmediateOverlayChange((state) => {
    if (axis === "x") {
      state.scaleX *= -1
      return
    }
    state.scaleY *= -1
  }, (target, state, frame) => {
    target.set({
      scaleX: state.kind === "image" ? state.scaleX * frame.displayScale : state.scaleX,
      scaleY: state.kind === "image" ? state.scaleY * frame.displayScale : state.scaleY,
    })
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    if (axis === "x") {
      state.scaleX *= -1
      return
    }
    state.scaleY *= -1
  })
}

async function rotateActive(delta: number) {
  if (renderImmediateOverlayChange((state) => {
    state.angle += delta
  }, (target, state) => {
    target.set({ angle: state.angle })
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    state.angle += delta
  })
}

async function nudgeActive(deltaX: number, deltaY: number) {
  if (renderImmediateOverlayChange((state) => {
    state.left += deltaX
    state.top += deltaY
  }, (target, state, frame, alignment) => {
    const position = templateToCanvasPoint(state.left, state.top, frame, alignment)
    target.set({
      left: position.left,
      top: position.top,
    })
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    state.left += deltaX
    state.top += deltaY
  })
}

async function centerActive() {
  const frame = stageFrame.value
  if (renderImmediateOverlayChange((state) => {
    state.left = frame.templateWidth / 2
    state.top = frame.templateHeight / 2
  }, (target, state, currentFrame, alignment) => {
    const position = templateToCanvasPoint(state.left, state.top, currentFrame, alignment)
    target.set({
      left: position.left,
      top: position.top,
    })
  }, { suppressAutoPreview: true })) return
  await updateActiveOverlay((state) => {
    state.left = frame.templateWidth / 2
    state.top = frame.templateHeight / 2
  })
}

function normalizeViewGeometryPartKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizePartPixelBox(box?: TemplatePixelBox | null) {
  const width = Number(box?.width || 0)
  const height = Number(box?.height || 0)
  if (width <= 0 || height <= 0) return null
  return {
    left: Number(box?.left || 0),
    top: Number(box?.top || 0),
    width,
    height,
  }
}

function resolveConfiguredPartPixelBox(
  partKey: string,
  target: "canvas" | "bbox",
) {
  const normalizedPartKey = normalizeViewGeometryPartKey(partKey)
  if (!normalizedPartKey || !props.partPixelBoxes?.parts) return null
  const matchedEntry = Object.entries(props.partPixelBoxes.parts).find(([partName]) => (
    normalizeViewGeometryPartKey(partName) === normalizedPartKey
  ))
  const pixelBoxEntry = matchedEntry?.[1]
  if (!pixelBoxEntry) return null
  if (target === "bbox") {
    return normalizePartPixelBox(pixelBoxEntry.bbox || null)
  }
  return normalizePartPixelBox(pixelBoxEntry.canvas || null)
}

function resolveImageSpreadTargetArea(
  target: ActiveCanvasObject & { partKey?: string },
  targetArea: ImageSpreadTargetArea,
  frame: StageFrame,
) {
  const partKey = target.partKey || props.selectedPartKey || activePartKey.value
  const templateCanvasBox = partKey ? resolveConfiguredPartPixelBox(partKey, "canvas") : null
  const templateBox = targetArea === "part-bounds"
    ? (partKey ? (resolveConfiguredPartPixelBox(partKey, "bbox") || templateCanvasBox) : null)
    : templateCanvasBox
  return resolveImageSpreadDesignArea({
    targetArea,
    templateWidth: frame.templateWidth,
    templateHeight: frame.templateHeight,
    templateBox,
  })
}

async function stretchActiveImageToTargetArea(
  targetArea: ImageSpreadTargetArea,
  targetRef?: { layerId?: string; partKey?: string },
) {
  const target = getActiveOverlay(targetRef)
  if (!target || target.layerKind !== "image") return
  const imageTarget = target as FabricImage & ActiveCanvasObject
  const sourceWidth = Math.max(Number(target.width || 0), 1)
  const sourceHeight = Math.max(Number(target.height || 0), 1)
  const frame = stageFrame.value
  const designArea = resolveImageSpreadTargetArea(imageTarget, targetArea, frame)
  const nextTransform = resolveSpreadToDesignAreaTransform({
    designArea,
    sourceWidth,
    sourceHeight,
    currentScaleX: Number(target.scaleX || 1),
    currentScaleY: Number(target.scaleY || 1),
  })
  if (!nextTransform) return

  const partKey = String(target.partKey || targetRef?.partKey || props.selectedPartKey || activePartKey.value || "").trim()
  const layerId = String(target.layerId || targetRef?.layerId || activeLayerId.value || "").trim()
  const layers = partKey ? overlayState.get(partKey) || [] : []
  const current = layers.find((item) => item.id === layerId)
  if (!partKey || !layerId || !current) return
  const before = snapshotState()
  if (current.kind === "image") {
    current.left = nextTransform.left
    current.top = nextTransform.top
    current.scaleX = nextTransform.scaleX
    current.scaleY = nextTransform.scaleY
    current.angle = 0
  }
  overlayState.set(partKey, layers.map((item) => (item.id === current.id ? current : item)))
  activePartKey.value = partKey
  activeLayerId.value = layerId
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

async function duplicateActive() {
  const target = getActiveOverlay()
  const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
  const layerId = target?.layerId || activeLayerId.value
  const layers = partKey ? [...(overlayState.get(partKey) || [])] : []
  const current = layers.find((item) => item.id === layerId)
  if (!partKey || !current) return
  const before = snapshotState()
  const nextLayer = current.kind === "image"
    ? {
        ...current,
        id: `${partKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        left: current.left + 24,
        top: current.top + 24,
      }
    : {
        ...current,
        id: `${partKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        left: current.left + 24,
        top: current.top + 24,
      }
  overlayState.set(partKey, [...layers, nextLayer])
  activeLayerId.value = nextLayer.id
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

async function reorderActive(direction: "forward" | "backward") {
  const target = getActiveOverlay()
  const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
  const layerId = target?.layerId || activeLayerId.value
  if (!partKey || !layerId) return
  const layers = [...(overlayState.get(partKey) || [])]
  const index = layers.findIndex((item) => item.id === layerId)
  if (index < 0) return
  const before = snapshotState()
  const nextIndex = direction === "forward"
    ? Math.min(index + 1, layers.length - 1)
    : Math.max(index - 1, 0)
  if (nextIndex === index) return
  const [current] = layers.splice(index, 1)
  layers.splice(nextIndex, 0, current)
  overlayState.set(partKey, layers)
  activeLayerId.value = layerId
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

async function removeActive() {
  const target = getActiveOverlay()
  const partKey = target?.partKey || props.selectedPartKey || activePartKey.value
  const layerId = target?.layerId || activeLayerId.value
  if (!partKey || !layerId) return
  const before = snapshotState()
  const next = (overlayState.get(partKey) || []).filter((item) => item.id !== layerId)
  if (next.length) {
    overlayState.set(partKey, next)
    activeLayerId.value = next[next.length - 1].id
  } else {
    overlayState.delete(partKey)
    activeLayerId.value = ""
  }
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

function listLayers(partKey: string) {
  const resolveCanvasLayerPreview = (layerId: string) => {
    const canvas = fabricCanvas.value
    if (!canvas) return ""
    const target = (canvas.getObjects() as ActiveCanvasObject[]).find((item) => (
      item.partKey === partKey && item.layerId === layerId
    ))
    const toDataURL = (target as unknown as {
      toDataURL?: (options?: Record<string, unknown>) => string
    } | null)?.toDataURL
    if (!target || typeof toDataURL !== "function") return ""
    try {
      return String(toDataURL.call(target, {
        format: "png",
        enableRetinaScaling: false,
        withoutTransform: false,
      }) || "")
    } catch {
      return ""
    }
  }
  // 0.4.58: text label 与 RepositoryPreviewPage.resolveTextLayerDisplayName 保持一致
  // 优先 layer.name → 截断 text → 索引兜底,确保非空且与 Place Order 弹窗显示一致
  const textLayerCount = (overlayState.get(partKey) || []).filter((entry) => entry.kind === "text").length
  let textFallbackCursor = textLayerCount
  return [...(overlayState.get(partKey) || [])].reverse().map((item, index) => {
    let textLabel = ""
    if (item.kind === "text") {
      const named = String(item.name || "").trim()
      if (named) {
        textLabel = named
      } else {
        const rawText = String(item.text || "").trim()
        if (rawText) {
          textLabel = rawText.length > 24 ? rawText.slice(0, 24) + "…" : rawText
        } else {
          textFallbackCursor -= 1
          textLabel = `${canvasText("text")} ${Math.max(1, textFallbackCursor + 1)}`
        }
      }
    }
    return {
      id: item.id,
      kind: item.kind,
      label: item.kind === "text"
        ? textLabel
        : resolveDisplayName(item.name, `${partKey} #${index + 1}`),
      preview: item.kind === "image"
        ? (resolveCanvasLayerPreview(item.id) || item.previewSrc || item.src || "")
        : "",
      previewFallback: item.kind === "image" ? (item.src || item.previewSrc || "") : "",
      hidden: Boolean(item.hidden),
    }
  })
}

async function toggleLayerVisibility(layerId: string) {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  if (!partKey) return
  const layers = overlayState.get(partKey) || []
  const target = layers.find((item) => item.id === layerId)
  if (!target) return
  const before = snapshotState()
  target.hidden = !target.hidden
  overlayState.set(partKey, [...layers])
  recordHistoryChange(before, snapshotState())
  await drawScene("user")
}

async function removeLayer(layerId: string) {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  if (!partKey) return
  activeLayerId.value = layerId
  await removeActive()
}

async function reorderLayer(layerId: string, direction: "forward" | "backward") {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  if (!partKey) return
  activeLayerId.value = layerId
  await reorderActive(direction)
}

function renameLayer(layerId: string, name: string) {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  if (!partKey) return false
  const layers = overlayState.get(partKey) || []
  const target = layers.find((item) => item.id === layerId)
  if (!target) return false
  const trimmed = String(name || "").trim()
  const before = snapshotState()
  target.name = trimmed
  overlayState.set(partKey, [...layers])
  recordHistoryChange(before, snapshotState())
  // 0.4.58: 重命名后必须 emit state-change,父级 canvasSignature 更新驱动 Place Order label 重算
  emitStateChange("user", true)
  return true
}

async function selectLayer(
  layerId: string,
  selectionSource: SelectionSource = "layers",
  options?: {
    enterTextEditing?: boolean
  },
) {
  const partKey = props.selectedPartKey || activePartKey.value || props.parts?.[0]?.part_name || ""
  activeLayerId.value = layerId
  const target = findVisibleOverlay(layerId, partKey)
  if (target && fabricCanvas.value) {
    activePartKey.value = partKey
    fabricCanvas.value.setActiveObject(target)
    syncTargetInteractionState(target)
    fabricCanvas.value.renderAll()
    syncSelection({
      selectionSource,
      selectionAction: selectionSource === "layers" ? "layers-select" : "programmatic",
      openTextInspector: true,
      openLayersInspector: true,
    })
    if (options?.enterTextEditing && target instanceof Textbox) {
      openTextboxEditing(target, fabricCanvas.value)
    }
    return
  }
  await drawScene()
}

function isTextEditing() {
  const target = getActiveOverlay()
  return target instanceof Textbox && target.isEditing
}

function refreshPointerOffsets() {
  const canvas = fabricCanvas.value
  if (!canvas) return
  canvas.calcOffset()
  if (typeof canvas.requestRenderAll === "function") {
    canvas.requestRenderAll()
    return
  }
  canvas.renderAll()
}

function schedulePointerOffsetRefresh() {
  if (pointerOffsetRaf) return
  pointerOffsetRaf = window.requestAnimationFrame(() => {
    pointerOffsetRaf = 0
    refreshPointerOffsets()
  })
}

function handleViewportChange() {
  schedulePointerOffsetRefresh()
}

async function undo() {
  const previous = undoStack.pop()
  if (!previous) return false
  redoStack.push(snapshotState())
  trimHistoryStack(redoStack)
  applySerializableState(previous)
  await drawScene("undo")
  return true
}

async function redo() {
  const next = redoStack.pop()
  if (!next) return false
  undoStack.push(snapshotState())
  trimHistoryStack(undoStack)
  applySerializableState(next)
  await drawScene("redo")
  return true
}

async function runPresetAction(
  action: "pattern-replication" | "maximize-pattern-design" | "spread-design" | "spread-part-bounds" | "spread-part-canvas" | "maximize-pattern-width" | "maximize-pattern-height" | "redesign",
  targetRef?: { layerId?: string; partKey?: string },
) {
  switch (action) {
    case "pattern-replication":
      await duplicateActive()
      return
    case "maximize-pattern-design":
      await resizeActiveImage("width", 1.05)
      await resizeActiveImage("height", 1.05)
      return
    case "spread-design":
    case "spread-part-bounds":
      await stretchActiveImageToTargetArea("part-bounds", targetRef)
      return
    case "spread-part-canvas":
      await stretchActiveImageToTargetArea("part-canvas", targetRef)
      return
    case "maximize-pattern-width":
      await resizeActiveImage("width", 1.05)
      return
    case "maximize-pattern-height":
      await resizeActiveImage("height", 1.05)
      return
    case "redesign":
      await updateActiveOverlay((state) => {
        state.angle = 0
        state.scaleX = 1
        state.scaleY = 1
      })
      return
  }
}

defineExpose({
  addArtwork,
  addArtworkSource,
  addText,
  stopTextEditing,
  applyTextSuperscript,
  applyTextSubscript,
  clearTextScript,
  scaleActive,
  resizeActiveImage,
  resizeActiveTextbox,
  resizeActiveTextContent,
  setActiveImageTileMode,
  flipActive,
  rotateActive,
  nudgeActive,
  centerActive,
  duplicateActive,
  reorderActive,
  removeActive,
  removeLayer,
  updateActiveText,
  updateActiveImage,
  exportPartBlobs,
  exportPartSvgs,
  exportPartPngs,
  listLayers,
  selectLayer,
  toggleLayerVisibility,
  reorderLayer,
  renameLayer,
  getStateSignature,
  getSerializableState,
  applySerializableStateWithHistory,
  restoreSerializableState,
  runPresetAction,
  canUndo,
  canRedo,
  undo,
  redo,
  isTextEditing,
  refreshPointerOffsets,
})

function commitCanvasTargetState(target: ActiveCanvasObject | null | undefined) {
  const partKey = target?.partKey
  const layerId = target?.layerId
  if (!target || !partKey || !layerId || !overlayState.has(partKey)) return
  const frame = stageFrame.value
  const alignment = partAlignmentState.get(partKey)
  const templatePoint = canvasToTemplatePoint(target.getCenterPoint().x || 0, target.getCenterPoint().y || 0, frame, alignment)
  const before = snapshotState()
  overlayState.set(partKey, (overlayState.get(partKey) || []).map((item) => (
    item.id === layerId
      ? {
          ...item,
          left: templatePoint.left,
          top: templatePoint.top,
          scaleX: item.kind === "image" ? ((target.scaleX || frame.displayScale) / frame.displayScale) : (target.scaleX || 1),
          scaleY: item.kind === "image" ? ((target.scaleY || frame.displayScale) / frame.displayScale) : (target.scaleY || 1),
          angle: target.angle || 0,
          ...(item.kind === "text" ? {
            width: target instanceof Textbox ? ((target.width || (item.width * frame.displayScale)) / frame.displayScale) : item.width,
            text: target instanceof Textbox ? (target.text || item.text) : item.text,
            styles: target instanceof Textbox ? cloneTextStyles((target as unknown as { styles?: unknown }).styles) : item.styles,
          } : {}),
        }
      : item
  )))
  activeLayerId.value = layerId
  syncTargetInteractionState(target)
  syncSelection({ selectionSource: "canvas", selectionAction: "programmatic", openTextInspector: true, openLayersInspector: true })
  recordHistoryChange(before, snapshotState())
  emitStateChange("user")
}

function updateDomOverlayDrag(event: Event) {
  const dragState = domOverlayDragState.value
  if (!dragState) return
  const dragTarget = dragState.target as ActiveCanvasObject
  const nextPoint = resolveStagePoint(event)
  if (!nextPoint) return
  const deltaLeft = nextPoint.left - dragState.startPointer.left
  const deltaTop = nextPoint.top - dragState.startPointer.top
  if (!dragState.moved && Math.hypot(deltaLeft, deltaTop) >= DOM_OVERLAY_DRAG_THRESHOLD) {
    dragState.moved = true
  }
  if (dragState.mode === "move") {
    dragTarget.set({
      left: dragState.startCenter.left + deltaLeft,
      top: dragState.startCenter.top + deltaTop,
    })
    applyDomOverlayDragPreview(dragTarget)
    return
  }
  const pointerAngle = Math.atan2(nextPoint.top - dragState.startCenter.top, nextPoint.left - dragState.startCenter.left)
  if (dragState.mode === "rotate") {
    dragTarget.set({
      angle: dragState.startAngle + ((pointerAngle - dragState.startPointerAngle) * 180 / Math.PI),
    })
    applyDomOverlayDragPreview(dragTarget)
    return
  }
  const nextDistance = Math.max(
    Math.hypot(nextPoint.left - dragState.startCenter.left, nextPoint.top - dragState.startCenter.top),
    1,
  )
  const localPointer = projectDomOverlayPointerToLocal(
    nextPoint,
    dragState.startCenter,
    -(dragState.startAngle * Math.PI / 180),
  )
  const factorX = Math.max(
    Math.abs(localPointer.left) / Math.max(Math.abs(dragState.startLocalPointer.left), 1),
    0.05,
  )
  const factorY = Math.max(
    Math.abs(localPointer.top) / Math.max(Math.abs(dragState.startLocalPointer.top), 1),
    0.05,
  )
  if (dragTarget.layerKind === "image") {
    const uniformFactor = Math.max(nextDistance / Math.max(dragState.startDistance, 1), 0.05)
    const nextScale = Math.max(dragState.startUniformImageScale * uniformFactor, 0.05)
    dragTarget.set({
      scaleX: Math.sign(dragState.startScaleX || 1) * nextScale,
      scaleY: Math.sign(dragState.startScaleY || 1) * nextScale,
    })
    applyDomOverlayDragPreview(dragTarget)
    return
  }
  dragTarget.set({
    scaleX: Math.sign(dragState.startScaleX || 1) * Math.max(Math.abs(dragState.startScaleX || 1) * factorX, 0.05),
    scaleY: Math.sign(dragState.startScaleY || 1) * Math.max(Math.abs(dragState.startScaleY || 1) * factorY, 0.05),
  })
  applyDomOverlayDragPreview(dragTarget)
}

function finishDomOverlayDrag() {
  const dragState = domOverlayDragState.value
  if (!dragState) return
  const dragTarget = dragState.target as ActiveCanvasObject
  domOverlayDragState.value = null
  if (!dragState.moved) {
    domOverlaySuppressedClickKey.value = null
    return
  }
  domOverlaySuppressedClickKey.value = dragState.key
  commitCanvasTargetState(dragTarget)
}

function registerCanvasEvents() {
  const canvas = fabricCanvas.value
  if (!canvas) return
  canvas.on("mouse:dblclick", (event) => {
    const rawTarget = event.target as ActiveCanvasObject | undefined
    const activeTarget = canvas.getActiveObject()
    const target = rawTarget instanceof Textbox
      ? rawTarget
      : activeTarget instanceof Textbox
        ? activeTarget
        : null
    if (!target) return
    queueCanvasSelectionSync(canvas, target, { enterTextEditing: true })
  })
  canvas.on("text:editing:entered", () => {
    syncSelection({
      selectionSource: "canvas",
      selectionAction: "canvas-dblclick-text",
      openTextInspector: true,
    })
  })
  canvas.on("mouse:up", () => {
    syncTargetInteractionState(getActiveOverlay())
    refreshSelectionOverlayPositions()
    refreshPointerOffsets()
  })
  canvas.on("selection:created", (event) => {
    syncTargetInteractionState((Array.isArray((event as { selected?: unknown[] })?.selected)
      ? (event as { selected?: unknown[] }).selected?.[0]
      : (event as { target?: unknown }).target) as ActiveCanvasObject | undefined)
    const resolved = resolveCanvasSelectionEventPayload(event as { selected?: unknown[]; target?: unknown; e?: Event | null })
    syncSelection({
      selectionSource: "canvas",
      selectionAction: resolved.selectionAction,
      openTextInspector: resolved.openTextInspector,
      openLayersInspector: resolved.openLayersInspector,
    })
  })
  canvas.on("selection:updated", (event) => {
    syncTargetInteractionState((Array.isArray((event as { selected?: unknown[] })?.selected)
      ? (event as { selected?: unknown[] }).selected?.[0]
      : (event as { target?: unknown }).target) as ActiveCanvasObject | undefined)
    const resolved = resolveCanvasSelectionEventPayload(event as { selected?: unknown[]; target?: unknown; e?: Event | null })
    syncSelection({
      selectionSource: "canvas",
      selectionAction: resolved.selectionAction,
      openTextInspector: resolved.openTextInspector,
      openLayersInspector: resolved.openLayersInspector,
    })
  })
  canvas.on("selection:cleared", () => {
    canvas.requestRenderAll?.()
    syncSelection({ selectionSource: "canvas", selectionAction: "programmatic" })
  })
  const refreshOverlayDuringTransform = () => {
    refreshSelectionOverlayPositions()
  }
  canvas.on("object:moving", refreshOverlayDuringTransform)
  canvas.on("object:scaling", refreshOverlayDuringTransform)
  canvas.on("object:rotating", refreshOverlayDuringTransform)
  canvas.on("object:modified", refreshOverlayDuringTransform)
  canvas.on("text:changed", () => {
    const target = getActiveOverlay()
    const partKey = target?.partKey
    const layerId = target?.layerId
    if (!target || target.layerKind !== "text" || !partKey || !layerId || !overlayState.has(partKey)) return
    const frame = stageFrame.value
    const before = snapshotState()
    overlayState.set(partKey, (overlayState.get(partKey) || []).map((item) => (
      item.id === layerId && item.kind === "text"
        ? {
            ...item,
            text: target instanceof Textbox ? (target.text || "") : item.text,
            width: (target.width || (item.width * frame.displayScale)) / frame.displayScale,
            styles: target instanceof Textbox ? cloneTextStyles((target as unknown as { styles?: unknown }).styles) : item.styles,
          }
        : item
    )))
    syncSelection({ selectionSource: "canvas", selectionAction: "programmatic", openTextInspector: true })
    recordHistoryChange(before, snapshotState())
    emitStateChange("user")
  })
  canvas.on("object:modified", () => {
    commitCanvasTargetState(getActiveOverlay())
  })
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target.isContentEditable
    || Boolean(target.closest("[contenteditable='true']"))
}

async function onKeydown(event: KeyboardEvent) {
  const target = getActiveOverlay()
  if (!target) return
  if (isEditableShortcutTarget(event.target) || isEditableShortcutTarget(document.activeElement)) return
  if (target instanceof Textbox && target.isEditing) return
  const matchedShortcut = findMatchingPreviewShortcut(event, previewCanvasShortcuts)
  if (!matchedShortcut) return
  event.preventDefault()
  switch (matchedShortcut.id) {
    case "delete":
      await removeActive()
      return
    case "move-up":
      await nudgeActive(0, event.shiftKey ? -16 : -4)
      return
    case "move-down":
      await nudgeActive(0, event.shiftKey ? 16 : 4)
      return
    case "move-left":
      await nudgeActive(event.shiftKey ? -16 : -4, 0)
      return
    case "move-right":
      await nudgeActive(event.shiftKey ? 16 : 4, 0)
      return
    case "mirror-horizontal":
      await flipActive("x")
      return
    case "mirror-vertical":
      await flipActive("y")
      return
    case "rotate-clockwise":
      await rotateActive(45)
      return
    case "rotate-counterclockwise":
      await rotateActive(-45)
      return
    case "amplify":
      await scaleActive(1.1)
      return
    case "reduce":
      await scaleActive(0.9)
      return
    case "pattern-replication":
      await duplicateActive()
      return
    case "maximize-pattern-design":
      await resizeActiveImage("width", 1.05)
      await resizeActiveImage("height", 1.05)
      return
    case "spread-design":
    case "spread-part-bounds":
      await stretchActiveImageToTargetArea("part-bounds")
      return
    case "spread-part-canvas":
      await stretchActiveImageToTargetArea("part-canvas")
      return
    case "maximize-pattern-width":
      await resizeActiveImage("width", 1.05)
      return
    case "maximize-pattern-height":
      await resizeActiveImage("height", 1.05)
      return
    case "redesign":
      await updateActiveOverlay((state) => {
        state.angle = 0
        state.scaleX = 1
        state.scaleY = 1
      })
      return
    case "pattern-tile-basic":
      await setActiveImageTileMode("tile-basic")
      return
    case "pattern-tile-landscape":
      await setActiveImageTileMode("tile-horizontal")
      return
    case "pattern-tile-vertical":
      await setActiveImageTileMode("tile-vertical")
      return
    case "pattern-tile-mirror":
      await setActiveImageTileMode("tile-mirror")
      return
    case "pattern-tile-non-tile":
      await setActiveImageTileMode("single")
      return
    case "horizontally":
      await updateActiveOverlay((state) => {
        state.left = stageFrame.value.templateWidth / 2
      })
      return
    case "design-middle":
      await centerActive()
      return
    default:
      return
  }
}

onMounted(async () => {
  if (!canvasRef.value) return
  try {
    ;(FabricObject.prototype as FabricObject & { rotatingPointOffset?: number }).rotatingPointOffset = 28
  } catch {
    // ignore if the fabric version doesn't expose the prototype property
  }
  fabricCanvas.value = markRaw(new Canvas(canvasRef.value, {
    backgroundColor: "#ffffff",
    width: canvasSize.value,
    height: canvasSize.value,
    preserveObjectStacking: true,
  }))
  fabricCanvas.value.set({
    defaultCursor: "default",
    notAllowedCursor: "not-allowed",
  })
  registerCanvasEvents()
  canvasPointerDownListener = () => {
    fabricCanvas.value?.calcOffset()
  }
  canvasPointerMoveListener = () => {
    schedulePointerOffsetRefresh()
  }
  fabricCanvas.value.upperCanvasEl?.addEventListener("pointerdown", canvasPointerDownListener, true)
  fabricCanvas.value.upperCanvasEl?.addEventListener("mousedown", canvasPointerDownListener, true)
  fabricCanvas.value.upperCanvasEl?.addEventListener("touchstart", canvasPointerDownListener, true)
  fabricCanvas.value.upperCanvasEl?.addEventListener("pointermove", canvasPointerMoveListener, true)
  fabricCanvas.value.upperCanvasEl?.addEventListener("mousemove", canvasPointerMoveListener, true)
  fabricCanvas.value.upperCanvasEl?.addEventListener("touchmove", canvasPointerMoveListener, true)
  canvasContextMenuListener = (event) => {
    event.preventDefault()
    const canvas = fabricCanvas.value
    if (!canvas) {
      emit("imageContextMenu", null)
      return
    }
    const target = (canvas as unknown as {
      findTarget?: (input: MouseEvent) => unknown
      setActiveObject?: (input: ActiveCanvasObject) => void
      requestRenderAll?: () => void
      renderAll: () => void
    }).findTarget?.(event) as ActiveCanvasObject | null
    if (!target) {
      emit("imageContextMenu", null)
      return
    }
    if (typeof (canvas as unknown as { setActiveObject?: (input: ActiveCanvasObject) => void }).setActiveObject === "function") {
      ;(canvas as unknown as { setActiveObject: (input: ActiveCanvasObject) => void }).setActiveObject(target)
    }
    syncTargetInteractionState(target)
    canvas.requestRenderAll?.() ?? canvas.renderAll()
    if (target.layerKind === "image") {
      syncSelection({
        selectionSource: "canvas",
        selectionAction: "canvas-click-image",
        openLayersInspector: true,
      })
    } else if (target.layerKind === "text") {
      syncSelection({
        selectionSource: "canvas",
        selectionAction: "canvas-click-text",
        openTextInspector: true,
      })
    }
    emitImageContextMenu(target, event)
  }
  fabricCanvas.value.upperCanvasEl?.addEventListener("contextmenu", canvasContextMenuListener)
  documentPointerDownListener = (event) => {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const upper = canvas.upperCanvasEl
    if (!upper) return
    const target = event.target
    if (!(target instanceof Node)) return
    if (!upper.contains(target)) return
    canvas.calcOffset()
  }
  document.addEventListener("pointerdown", documentPointerDownListener, true)
  document.addEventListener("mousedown", documentPointerDownListener, true)
  document.addEventListener("touchstart", documentPointerDownListener, true)
  domOverlayPointerMoveListener = (event) => {
    updateDomOverlayDrag(event)
  }
  domOverlayPointerUpListener = () => {
    finishDomOverlayDrag()
  }
  window.addEventListener("pointermove", domOverlayPointerMoveListener, true)
  window.addEventListener("mousemove", domOverlayPointerMoveListener, true)
  window.addEventListener("touchmove", domOverlayPointerMoveListener, true)
  window.addEventListener("pointerup", domOverlayPointerUpListener, true)
  window.addEventListener("mouseup", domOverlayPointerUpListener, true)
  window.addEventListener("touchend", domOverlayPointerUpListener, true)
  window.addEventListener("touchcancel", domOverlayPointerUpListener, true)
  window.addEventListener("keydown", onKeydown)
  window.addEventListener("resize", handleViewportChange)
  window.addEventListener("scroll", handleViewportChange, true)
  if (stageRef.value && typeof ResizeObserver !== "undefined") {
    stageResizeObserver = new ResizeObserver(() => {
      schedulePointerOffsetRefresh()
    })
    stageResizeObserver.observe(stageRef.value)
  }
  await drawScene()
  refreshPointerOffsets()
})

onBeforeUnmount(() => {
  finishDomOverlayDrag()
  window.removeEventListener("keydown", onKeydown)
  window.removeEventListener("resize", handleViewportChange)
  window.removeEventListener("scroll", handleViewportChange, true)
  if (domOverlayPointerMoveListener) {
    window.removeEventListener("pointermove", domOverlayPointerMoveListener, true)
    window.removeEventListener("mousemove", domOverlayPointerMoveListener, true)
    window.removeEventListener("touchmove", domOverlayPointerMoveListener, true)
    domOverlayPointerMoveListener = null
  }
  if (domOverlayPointerUpListener) {
    window.removeEventListener("pointerup", domOverlayPointerUpListener, true)
    window.removeEventListener("mouseup", domOverlayPointerUpListener, true)
    window.removeEventListener("touchend", domOverlayPointerUpListener, true)
    window.removeEventListener("touchcancel", domOverlayPointerUpListener, true)
    domOverlayPointerUpListener = null
  }
  if (canvasPointerDownListener) {
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("pointerdown", canvasPointerDownListener, true)
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("mousedown", canvasPointerDownListener, true)
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("touchstart", canvasPointerDownListener, true)
    canvasPointerDownListener = null
  }
  if (canvasPointerMoveListener) {
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("pointermove", canvasPointerMoveListener, true)
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("mousemove", canvasPointerMoveListener, true)
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("touchmove", canvasPointerMoveListener, true)
    canvasPointerMoveListener = null
  }
  if (canvasContextMenuListener) {
    fabricCanvas.value?.upperCanvasEl?.removeEventListener("contextmenu", canvasContextMenuListener)
    canvasContextMenuListener = null
  }
  if (documentPointerDownListener) {
    document.removeEventListener("pointerdown", documentPointerDownListener, true)
    document.removeEventListener("mousedown", documentPointerDownListener, true)
    document.removeEventListener("touchstart", documentPointerDownListener, true)
    documentPointerDownListener = null
  }
  if (pointerOffsetRaf) {
    window.cancelAnimationFrame(pointerOffsetRaf)
    pointerOffsetRaf = 0
  }
  stageResizeObserver?.disconnect()
  stageResizeObserver = null
  try {
    fabricCanvas.value?.dispose()
  } catch {
  }
  fabricCanvas.value = null
  for (const objectUrl of svgObjectUrlCache.values()) {
    URL.revokeObjectURL(objectUrl)
  }
  svgObjectUrlCache.clear()
})

watch(() => [props.guideUrl], async () => {
  await drawScene()
})

watch(() => [props.svgUrl], async () => {
  await drawScene()
})

watch(() => [props.cutoutUrl], async () => {
  await drawScene()
})

watch(() => props.stageBackgroundColor, async () => {
  await drawScene()
})

watch(() => props.partBackgroundColors, async () => {
  await drawScene()
}, { deep: true })

watch(() => props.showGrid, async () => {
  await drawScene()
})

watch(() => [props.displayUnit, props.physicalDimensionsCm], () => {
  syncSelection()
}, { deep: true })

watch(() => props.selectedPartKey, async (partKey) => {
  activePartKey.value = partKey || ""
  const layers = partKey ? overlayState.get(partKey) || [] : []
  activeLayerId.value = layers[layers.length - 1]?.id || ""
  await drawScene()
}, { immediate: true })

watch(() => props.selectedView, async () => {
  await drawScene()
})
</script>

<template>
  <div ref="stageRef" class="editor-stage" :style="editorStageStyle">
    <div
      v-if="canvasPhysicalDimension"
      class="editor-ruler ruler-top"
      :style="rulerTopStyle"
      @mousemove="handleRulerMouseMove"
      @mouseleave="handleRulerMouseLeave"
    >
      <div
        v-for="tick in horizontalRulerTicks"
        :key="`x-${tick.index}`"
        class="ruler-tick"
        :class="{ major: tick.major }"
        :style="{ left: `${(tick.left || 0) - stageFrame.left}px` }"
      >
        <span v-if="tick.label" class="ruler-label">{{ tick.label }}</span>
      </div>
      <div
        v-if="activeRulerSelectionHint"
        class="ruler-selection"
        :class="`ruler-selection--${activeRulerSelectionHint.tone}`"
      >
        <div class="ruler-selection-line" :style="activeRulerSelectionHint.horizontalStyle"></div>
        <div class="ruler-selection-label" :style="activeRulerSelectionHint.horizontalLabelStyle">
          {{ activeRulerSelectionHint.horizontalText }}
        </div>
      </div>
    </div>
    <div v-if="canvasPhysicalDimension" class="editor-ruler ruler-left" :style="rulerLeftStyle">
      <div
        v-for="tick in verticalRulerTicks"
        :key="`y-${tick.index}`"
        class="ruler-tick vertical"
        :class="{ major: tick.major }"
        :style="{ top: `${(tick.top || 0) - stageFrame.top}px` }"
      >
        <span v-if="tick.label" class="ruler-label vertical">{{ tick.label }}</span>
      </div>
      <div
        v-if="activeRulerSelectionHint"
        class="ruler-selection"
        :class="`ruler-selection--${activeRulerSelectionHint.tone}`"
      >
        <div class="ruler-selection-line vertical" :style="activeRulerSelectionHint.verticalStyle"></div>
        <div class="ruler-selection-label vertical" :style="activeRulerSelectionHint.verticalLabelStyle">
          {{ activeRulerSelectionHint.verticalText }}
        </div>
      </div>
    </div>
    <canvas ref="canvasRef"></canvas>
    <div
      v-if="domOverlaySelectionState.visible"
      class="editor-dom-overlay"
      :class="domOverlaySelectionState.layerKind ? `editor-dom-overlay--${domOverlaySelectionState.layerKind}` : ''"
      :style="domOverlayStyle"
      :data-part-key="domOverlaySelectionState.partKey"
      :data-layer-id="domOverlaySelectionState.layerId"
      :data-layer-kind="domOverlaySelectionState.layerKind"
    >
      <span
        v-for="button in domOverlayPointButtons"
        :key="`point-${button.key}`"
        class="editor-dom-overlay__point"
        :class="`editor-dom-overlay__point--${button.key}`"
        :style="domOverlayPointStyles[button.key]"
        aria-hidden="true"
      ></span>
      <button
        v-for="button in domOverlayButtons"
        :key="button.key"
        type="button"
        class="editor-dom-overlay__button"
        :class="`editor-dom-overlay__button--${button.key}`"
        :ref="(element) => setDomOverlayButtonRef(button.key, element as Element | null)"
        :style="domOverlayButtonStyles[button.key]"
        :title="button.title"
        :aria-label="button.title"
        :disabled="isDomOverlayButtonDisabled()"
        @pointerdown="handleDomOverlayButtonPointerDown(button.key, $event)"
        @click="handleDomOverlayButtonClick(button.key)"
      >
        <svg
          class="editor-dom-overlay__button-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <template v-if="button.key === 'clone'">
            <rect x="8" y="8" width="9" height="9" rx="2.25" stroke="currentColor" stroke-width="1.8" />
            <path d="M6.75 14.75H6.4C5.6268 14.75 5 14.1232 5 13.35V6.4C5 5.6268 5.6268 5 6.4 5H13.35C14.1232 5 14.75 5.6268 14.75 6.4V6.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </template>
          <template v-else-if="button.key === 'delete'">
            <path d="M8 8.25H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M9.5 8.25V6.9C9.5 6.1268 10.1268 5.5 10.9 5.5H13.1C13.8732 5.5 14.5 6.1268 14.5 6.9V8.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 10.25V15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 10.25V15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M15 10.25V15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M7.25 8.25L8 17.1C8.06 17.81 8.65 18.35 9.36 18.35H14.64C15.35 18.35 15.94 17.81 16 17.1L16.75 8.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </template>
          <template v-else-if="button.key === 'move'">
            <path d="M12 5.25V18.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M5.25 12H18.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 5.25L9.75 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 5.25L14.25 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 18.75L9.75 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 18.75L14.25 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M5.25 12L7.5 9.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M5.25 12L7.5 14.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M18.75 12L16.5 9.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M18.75 12L16.5 14.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </template>
          <template v-else-if="button.key === 'scale'">
            <path d="M8.25 15.75L15.75 8.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M8.25 11.25V15.75H12.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.75 12.75V8.25H11.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.25 17.75H10.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.72" />
            <path d="M13.75 6.25H17.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.72" />
          </template>
          <template v-else>
            <path d="M18.5 12C18.5 15.5899 15.5899 18.5 12 18.5C8.41015 18.5 5.5 15.5899 5.5 12C5.5 8.41015 8.41015 5.5 12 5.5C14.07 5.5 15.9139 6.46775 17.1055 7.97486" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M17.5 4.75V8.5H21.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </template>
        </svg>
      </button>
    </div>
    <div v-if="activeImageOverlayLabels.length || activeTextOverlayLabels.length || activeRotationOverlayLabels.length" class="editor-dimension-overlays">
      <div
        v-for="badge in activeImageOverlayLabels"
        :key="`image-${badge.key}`"
        class="dimension-badge dimension-badge--image"
        :style="badge.style || undefined"
      >
        {{ badge.text }}
      </div>
      <div
        v-for="badge in activeRotationOverlayLabels"
        :key="`rotation-${badge.key}`"
        class="dimension-badge dimension-badge--rotation"
        :style="badge.style || undefined"
      >
        {{ badge.text }}
      </div>
      <div
        v-for="badge in activeTextOverlayLabels"
        :key="`text-${badge.key}`"
        class="dimension-badge dimension-badge--text"
        :style="badge.style || undefined"
      >
        {{ badge.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-stage {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  isolation: isolate;
  border-radius: 12px;
  overflow: visible;
  border: none;
  outline: none;
  background: #ffffff;
  box-shadow: none;
}

.editor-stage :deep(.canvas-container) {
  position: absolute;
  left: var(--editor-frame-left, 0);
  top: var(--editor-frame-top, 0);
  width: var(--editor-frame-width, 100%);
  height: var(--editor-frame-height, 100%);
  overflow: visible;
  z-index: 2;
  pointer-events: auto !important;
}

.editor-stage :deep(.lower-canvas) {
  position: absolute !important;
  left: calc(-1 * var(--editor-frame-left, 0px)) !important;
  top: calc(-1 * var(--editor-frame-top, 0px)) !important;
  z-index: 2;
  pointer-events: auto !important;
}

.editor-stage :deep(.upper-canvas) {
  position: absolute !important;
  left: calc(-1 * var(--editor-frame-left, 0px)) !important;
  top: calc(-1 * var(--editor-frame-top, 0px)) !important;
  z-index: 3 !important;
  pointer-events: auto !important;
}

.editor-ruler,
.editor-dom-overlay,
.editor-dimension-overlays {
  z-index: 10020;
}

.editor-dom-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none !important;
  z-index: 10030;
}

.editor-dom-overlay__point {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(109, 40, 217, 0.92);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9),
    0 8px 18px rgba(76, 29, 149, 0.14);
  transform: rotate(45deg);
}

.editor-dom-overlay__point--rotate {
  border-radius: 999px;
  transform: none;
}

.editor-dom-overlay__button {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #6d28d9;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  pointer-events: auto;
  cursor: pointer;
  isolation: isolate;
  box-shadow:
    0 10px 22px rgba(76, 29, 149, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.84) inset;
  backdrop-filter: blur(10px);
  transition:
    transform 120ms ease,
    color 120ms ease,
    opacity 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease;
}

.editor-dom-overlay__button--delete {
  color: #dc2626;
  border-color: rgba(248, 113, 113, 0.24);
}

.editor-dom-overlay__button:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.02);
  opacity: 1;
  color: #5b21b6;
  border-color: rgba(109, 40, 217, 0.26);
  box-shadow:
    0 14px 28px rgba(76, 29, 149, 0.16),
    0 0 0 1px rgba(255, 255, 255, 0.88) inset;
}

.editor-dom-overlay__button--delete:hover:not(:disabled) {
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.26);
}

.editor-dom-overlay__button:focus-visible {
  outline: 2px solid rgba(109, 40, 217, 0.22);
  outline-offset: 2px;
}

.editor-dom-overlay__button-icon {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  overflow: visible;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.38));
}

.editor-dom-overlay__button:disabled {
  cursor: default;
  opacity: 0.72;
  box-shadow: none;
}

.editor-dimension-overlays {
  position: absolute;
  inset: 0;
  pointer-events: none !important;
  z-index: 10040;
}

.dimension-badge {
  position: absolute;
  z-index: 10041;
  padding: 0.24rem 0.5rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
}

.dimension-badge--text {
  background: rgba(79, 70, 229, 0.88);
}

.dimension-badge--rotation {
  background: rgba(37, 99, 235, 0.92);
}

.editor-ruler {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none !important;
  z-index: 10020;
  border: none;
  outline: none;
  box-shadow: none;
}

.ruler-top {
  background: rgba(248, 250, 252, 0.98);
  border: none;
  border-radius: 10px 10px 0 0;
}

.ruler-left {
  background: rgba(248, 250, 252, 0.98);
  border: none;
  border-radius: 10px 0 0 10px;
}

.ruler-tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 8px;
  background: rgba(100, 116, 139, 0.45);
}

.ruler-tick.major {
  height: 14px;
  background: rgba(51, 65, 85, 0.8);
}

.ruler-tick.vertical {
  left: 0;
  right: 0;
  top: 0;
  width: 8px;
  height: 1px;
}

.ruler-tick.vertical.major {
  width: 14px;
}

.ruler-label {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #475569;
}

.ruler-label.vertical {
  left: 2px;
  top: -6px;
}

.ruler-selection {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ruler-selection-line {
  position: absolute;
  bottom: 3px;
  height: 3px;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.75);
  box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.18);
}

.ruler-selection-line.vertical {
  left: 3px;
  bottom: auto;
  width: 3px;
}

.ruler-selection-label {
  position: absolute;
  bottom: 8px;
  transform: translateX(-50%);
  padding: 0.12rem 0.36rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.ruler-selection-label.vertical {
  left: 8px;
  bottom: auto;
  transform: translateY(-50%);
}

.ruler-selection--text .ruler-selection-line {
  background: rgba(79, 70, 229, 0.75);
}

.ruler-selection--text .ruler-selection-label {
  background: rgba(79, 70, 229, 0.92);
}

.physical-dimension-chip {
  position: absolute;
  right: 12px;
  z-index: 25;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.physical-dimension-chip {
  bottom: 12px;
}

.physical-dimension-chip.muted {
  background: rgba(100, 116, 139, 0.72);
}
</style>
