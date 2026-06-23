<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { buildTemplateIdentityKeys, useTemplateStore } from "../../stores/templates"
import { usePlatformStore } from "../../stores/platform"
import { useAuthStore } from "../../stores/auth"
import { useUploadStore, type SuggestedConfig } from "../../stores/upload"
import { useUiLocaleStore } from "../../stores/uiLocale"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../../components/FilterDropdown.vue"
import { resolveTemplateWorkflowError } from "../../utils/templateWorkflowErrors"
import {
  buildPhysicalDimensionsPayload,
  convertCmToUnit,
  convertUnitToCm,
  hydrateUploadPhysicalDimensions,
  normalizePhysicalDimensionsEditor,
  type PhysicalDimensionFormEntry,
  type PhysicalDimensionEditorEntry,
  unitSuffix,
} from "../../utils/templatePhysicalDimensions"
import type { PhysicalDisplayUnit } from "../../api/client"
import { resolveDisplayName } from "../../utils/displayNames"

type PhysicalDimensionEditorState = PhysicalDimensionEditorEntry

const route = useRoute()
const router = useRouter()
const templateStore = useTemplateStore()
const platformStore = usePlatformStore()
const authStore = useAuthStore()
const uploadStore = useUploadStore()
const uiLocaleStore = useUiLocaleStore()
const { items, editPayload, validationPayload } = storeToRefs(templateStore)
const { categories } = storeToRefs(platformStore)
const { inspection, uploadStatus, uploadResult } = storeToRefs(uploadStore)
const physicalUnitOptions = [
  { value: "cm", label: "cm" },
  { value: "mm", label: "mm" },
  { value: "in", label: "in" },
] as const

const editingTemplateId = ref("")
const editDisplayName = ref("")
const editTemplateCode = ref("")
const editCategoryId = ref("")
const editBaseSizeLabel = ref("")
const editSizeOptionsInput = ref("")
const editDisplayUnit = ref<PhysicalDisplayUnit>("cm")
const editPhysicalDimensions = ref<Record<string, PhysicalDimensionEditorState>>({})
const createDisplayName = ref("")
const createTemplateId = ref("")
const createCategoryId = ref("")
const createBaseSizeLabel = ref("")
const createSizeOptionsInput = ref("")
const selectedFile = ref<File | null>(null)
const createNotice = ref("")
const editNotice = ref("")
const editNoticeTone = ref<"success" | "danger">("success")
const isOpeningEditorAfterUpload = ref(false)
const isLoadingEditorPayload = ref(false)
const isHydratingEditorView = ref(false)
const pendingEditorTemplateId = ref("")
const templateIdTouched = ref(false)
const uploadPhase = ref<"idle" | "uploading" | "inspecting" | "creating" | "done" | "failed">("idle")
const uploadProgress = ref(0)
const editTemplateCodeCheckState = ref<"idle" | "checking" | "available" | "blocked">("idle")
const editTemplateCodeHint = ref("")
const lastCheckedEditTemplateCode = ref("")

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const isMetadataEditMode = computed(() => Boolean(String(route.query.template || route.query.template_id || "").trim()))
const isUploadMode = computed(() => !isMetadataEditMode.value)
const inspectionPassed = computed(() => Boolean(inspection.value?.can_upload && !inspection.value.errors?.length))
const canUpload = computed(() => Boolean(selectedFile.value && createDisplayName.value.trim() && createTemplateId.value.trim() && createCategoryId.value && !uploadStore.loading))
const activeErrors = computed(() => {
  const uploadErrors = uploadStatus.value?.errors || []
  const inspectionErrors = inspection.value?.errors || []
  if (uploadErrors.length) return uploadErrors
  if (inspectionErrors.length) return inspectionErrors
  return uploadStore.error ? [{ code: "UPLOAD_ERROR", message: uploadStore.error }] : []
})
const normalizedUploadErrors = computed(() => {
  const seen = new Set<string>()
  return activeErrors.value
    .map((item) => formatUploadWorkflowError(item))
    .filter((item) => {
      const normalized = item.toLowerCase()
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
})
const progressLabel = computed(() => {
  if (uploadPhase.value === "uploading") return localize("Uploading package", "正在上传包")
  if (uploadPhase.value === "inspecting") return localize("Inspecting package", "正在检查包")
  if (uploadPhase.value === "creating") return localize("Creating Template", "正在创建模板")
  if (uploadPhase.value === "done") return localize("Upload completed", "上传完成")
  if (uploadPhase.value === "failed") return localize("Upload failed", "上传失败")
  return ""
})
const progressPercent = computed(() => Math.max(0, Math.min(100, Math.round(uploadProgress.value))))
const isUploadSuccessful = computed(() => uploadPhase.value === "done" && !activeErrors.value.length)
const isUploadFailed = computed(() => uploadPhase.value === "failed" || Boolean(activeErrors.value.length))
const saveErrorState = computed(() => {
  if (editNoticeTone.value !== "danger") return ""
  return formatSaveWorkflowError(editNotice.value)
})
const uploadProgressSteps = computed(() => [
  { key: "uploading", label: localize("Uploading package", "正在上传包"), active: ["uploading", "inspecting", "creating", "done"].includes(uploadPhase.value) },
  { key: "inspecting", label: localize("Inspecting package", "正在检查包"), active: ["inspecting", "creating", "done"].includes(uploadPhase.value) },
  { key: "creating", label: localize("Creating Template", "正在创建模板"), active: ["creating", "done"].includes(uploadPhase.value) },
])

function slugifyTemplateId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function findCategoryPath(categoryId: string, nodes = categories.value): string {
  for (const node of nodes) {
    if (node.category_id === categoryId) {
      return node.category_path || node.name
    }
    if (node.children?.length) {
      const match = findCategoryPath(categoryId, node.children)
      if (match) return match
    }
  }
  return ""
}

const createCategoryPath = computed(() => findCategoryPath(createCategoryId.value))
const editCategoryPath = computed(() => findCategoryPath(editCategoryId.value) || editPayload.value?.category_path || "")
const currentRouteTemplateId = computed(() => String(route.query.template_id || route.query.template || "").trim())
const recentUploadedTemplateId = computed(() => String(uploadResult.value?.template_id || uploadStatus.value?.template_id || "").trim())
const isEditorTransitionActive = computed(() => (
  !isUploadMode.value
  && (
    isOpeningEditorAfterUpload.value
    || (Boolean(String(route.query.setup_physical_size || "").trim()) && (isLoadingEditorPayload.value || isHydratingEditorView.value))
  )
))
const editorTransitionNotice = computed(() => {
  if (!isEditorTransitionActive.value) return ""
  const templateId = pendingEditorTemplateId.value.trim()
    || currentRouteTemplateId.value
  return templateId
    ? localize(
      `Upload successful. Opening Template Editor for ${templateId} and loading template data. Please wait...`,
      `上传成功。正在为 ${templateId} 打开模板编辑器并加载模板数据，请稍候...`,
    )
    : localize("Upload successful. Opening Template Editor and loading template data. Please wait...", "上传成功。正在打开模板编辑器并加载模板数据，请稍候...")
})
const postUploadInspection = computed(() => {
  if (!String(route.query.setup_physical_size || "").trim()) return null
  if (!inspection.value) return null
  if (!recentUploadedTemplateId.value) return inspection.value
  if (!currentRouteTemplateId.value) return inspection.value
  return recentUploadedTemplateId.value === currentRouteTemplateId.value ? inspection.value : null
})
function resolveEditPartDisplayName(partName: string) {
  return resolveDisplayName(editPayload.value?.part_display_names?.[partName] || partName, partName)
}
function normalizeTreeFolderName(value: unknown) {
  const normalized = String(value || "").trim()
  if (!normalized || normalized === "__MACOSX" || normalized === ".DS_Store") return ""
  return normalized
}
function archiveFolderSortWeight(value: string) {
  const code = resolveArchiveFolderCode(value)
  if (code === "001") return 1
  if (code === "002") return 2
  if (code === "003") return 3
  if (code === "004") return 4
  if (code === "SVG") return 5
  if (code === "grading") return 6
  return 100
}
function resolveArchiveFolderCode(value: unknown) {
  const normalized = normalizeTreeFolderName(value)
  if (!normalized) return ""
  const upper = normalized.toUpperCase()
  if (upper === "SVG" || upper.startsWith("SVG")) return "SVG"
  if (upper.startsWith("001")) return "001"
  if (upper.startsWith("002")) return "002"
  if (upper.startsWith("003")) return "003"
  if (upper.startsWith("004")) return "004"
  if (normalized.toLowerCase() === "grading") return "grading"
  return ""
}
function hasArchiveFolderAlias(bucketAliases: Record<string, unknown>, folderCode: string) {
  return Object.entries(bucketAliases).some(([key, value]) => (
    resolveArchiveFolderCode(key) === folderCode
    || resolveArchiveFolderCode(value) === folderCode
  ))
}
function orderArchiveFolders(values: string[]) {
  const order = ["001", "002", "003", "004", "SVG", "grading"]
  const normalized = new Set(values.filter(Boolean))
  return order.filter((item) => normalized.has(item))
}
function mergeArchiveFolderNames(values: string[]) {
  const unique = Array.from(new Set(values.map(normalizeTreeFolderName).filter(Boolean)))
  return unique.sort((left, right) => {
    const weightDiff = archiveFolderSortWeight(left) - archiveFolderSortWeight(right)
    if (weightDiff !== 0) return weightDiff
    return left.localeCompare(right)
  })
}
function extractValidationFolderNames(input: unknown) {
  if (!input || typeof input !== "object") return []
  const stats = (input as Record<string, unknown>).stats
  if (!stats || typeof stats !== "object") return []
  const statsRecord = stats as Record<string, unknown>
  const bucketAliases = statsRecord.bucket_aliases && typeof statsRecord.bucket_aliases === "object"
    ? (statsRecord.bucket_aliases as Record<string, unknown>)
    : {}
  return orderArchiveFolders([
    statsRecord.has_guide_directory || hasArchiveFolderAlias(bucketAliases, "001") ? "001" : "",
    hasArchiveFolderAlias(bucketAliases, "002") ? "002" : "",
    hasArchiveFolderAlias(bucketAliases, "003") ? "003" : "",
    hasArchiveFolderAlias(bucketAliases, "004") ? "004" : "",
    statsRecord.has_svg_directory || hasArchiveFolderAlias(bucketAliases, "SVG") ? "SVG" : "",
    statsRecord.has_grading_directory ? "grading" : "",
  ])
}
const uploadedArchiveFolders = computed(() => {
  const validationFolders = extractValidationFolderNames(validationPayload.value)
  const inspectionFolders = extractValidationFolderNames(postUploadInspection.value)
  const tree = postUploadInspection.value?.example_tree
  const children = Array.isArray(tree?.children) ? tree.children : []
  const treeFolders = children
      .filter((item) => item?.type === "folder")
      .map((item) => normalizeTreeFolderName(item?.name))
      .filter(Boolean)
  if (treeFolders.length) return mergeArchiveFolderNames(treeFolders)
  return mergeArchiveFolderNames([
    ...validationFolders,
    ...inspectionFolders,
  ])
})
const currentUnitSuffix = computed(() => unitSuffix(editDisplayUnit.value))
const editPhysicalDimensionEntries = computed(() => Object.entries(editPhysicalDimensions.value).map(([partName, item]) => ({
  partName,
  displayName: resolveEditPartDisplayName(partName),
  source: item.source,
  dpi: item.dpi,
  dpiSource: item.dpiSource,
  original: item.original || {},
})))
const sharedEditDpi = computed(() => {
  const firstEntry = editPhysicalDimensionEntries.value.find((entry) => String(entry.dpi || "").trim())
  return firstEntry?.dpi || "72"
})

function buildRepositoryReturnQuery(templateId: string, tone: "success" | "danger", message: string) {
  return {
    selected: templateId,
    notice: message,
    tone,
  }
}

function resolveUploadedTemplateId() {
  const directCandidates = [
    uploadResult.value?.template_id,
    uploadStatus.value?.template_id,
    createTemplateId.value.trim(),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
  const uploadedTemplateCode = String(uploadResult.value?.template_code || uploadStatus.value?.template_code || createTemplateId.value || "")
    .trim()
  const candidateSet = new Set<string>([
    ...directCandidates,
    uploadedTemplateCode,
    uploadedTemplateCode.split("--")[0] || "",
  ].filter(Boolean))
  const matched = items.value.find((item) => buildTemplateIdentityKeys(item).some((key) => candidateSet.has(key)))
  return String(matched?.governance_id || matched?.template_id || directCandidates[0] || "").trim()
}

function normalizePartName(value: unknown) {
  return String(value || "").trim()
}

function normalizePartIdentity(value: unknown) {
  return normalizePartName(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
function buildNormalizedPartEntryMap<T>(record: Record<string, T>) {
  const normalizedEntries = new Map<string, T>()
  for (const [partName, value] of Object.entries(record)) {
    const normalized = normalizePartIdentity(partName)
    if (!normalized || normalizedEntries.has(normalized)) continue
    normalizedEntries.set(normalized, value)
  }
  return normalizedEntries
}
function normalizeTemplateCodeError(raw: unknown) {
  const resolved = resolveTemplateWorkflowError(raw)
  if (resolved.kind === "duplicate_code") {
    return "Template Code already exists. Please enter a new code and try again."
  }
  if (resolved.kind === "validation_failed") {
    return "Unable to validate Template Code right now. Please try again."
  }
  if (!resolved.rawMessage) {
    return "Unable to validate Template Code right now. Please try again."
  }
  return resolved.isTechnical
    ? "Unable to validate Template Code right now. Please try again."
    : resolved.rawMessage
}
function formatUploadWorkflowError(raw: unknown) {
  const resolved = resolveTemplateWorkflowError(raw)
  if (resolved.kind === "duplicate_code") {
    return "Template Code already exists. Please enter a new code and try again."
  }
  if (resolved.kind === "invalid_structure") {
    return "The archive structure does not meet the template requirements. Check ZIP folders, file names, and directory levels, then retry."
  }
  if (resolved.kind === "upload_failed") {
    return "Upload failed. Check the network or retry in a moment."
  }
  if (resolved.kind === "validation_failed") {
    return "We could not validate this template package. Please review the archive and try again."
  }
  if (!resolved.rawMessage) {
    return "Upload failed. Check the network or retry in a moment."
  }
  return resolved.isTechnical
    ? "Upload failed. Check the network or retry in a moment."
    : resolved.rawMessage
}
function formatSaveWorkflowError(raw: unknown) {
  const resolved = resolveTemplateWorkflowError(raw)
  if (resolved.kind === "duplicate_code") {
    return "Template Code already exists. Please enter a new code and try again."
  }
  if (resolved.kind === "save_failed") {
    return "Save failed. Please try again in a moment."
  }
  if (!resolved.rawMessage) {
    return "Save failed. Please try again in a moment."
  }
  return resolved.isTechnical
    ? "Save failed. Please try again in a moment."
    : resolved.rawMessage
}
function resetEditTemplateCodeValidation() {
  editTemplateCodeCheckState.value = "idle"
  editTemplateCodeHint.value = ""
  lastCheckedEditTemplateCode.value = ""
}
function validateEditTemplateCodeLocally() {
  const normalized = editTemplateCode.value.trim()
  if (!normalized) {
    editTemplateCodeCheckState.value = "blocked"
    editTemplateCodeHint.value = "Template Code is required."
    lastCheckedEditTemplateCode.value = ""
    return false
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(normalized)) {
    editTemplateCodeCheckState.value = "blocked"
    editTemplateCodeHint.value = "Use 2-64 letters, numbers, `_` or `-`."
    lastCheckedEditTemplateCode.value = ""
    return false
  }
  return true
}
function handleEditTemplateCodeInput() {
  const normalized = editTemplateCode.value.trim()
  if (!normalized) {
    editTemplateCodeCheckState.value = "blocked"
    editTemplateCodeHint.value = "Template Code is required."
    lastCheckedEditTemplateCode.value = ""
    return
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(normalized)) {
    editTemplateCodeCheckState.value = "blocked"
    editTemplateCodeHint.value = "Use 2-64 letters, numbers, `_` or `-`."
    lastCheckedEditTemplateCode.value = ""
    return
  }
  if (normalized === lastCheckedEditTemplateCode.value && editTemplateCodeCheckState.value === "available") {
    return
  }
  editTemplateCodeCheckState.value = "idle"
  editTemplateCodeHint.value = ""
}
async function ensureEditTemplateCodeAvailable() {
  const currentTemplateCode = editTemplateCode.value.trim()
  if (!validateEditTemplateCodeLocally()) return false
  if (currentTemplateCode === lastCheckedEditTemplateCode.value && editTemplateCodeCheckState.value === "available") {
    return true
  }
  editTemplateCodeCheckState.value = "checking"
  editTemplateCodeHint.value = "Checking Template Code..."
  try {
    const result = await uploadStore.checkTemplateCode(currentTemplateCode, editingTemplateId.value.trim())
    const resolvedTemplateCode = String(result?.template_code || currentTemplateCode).trim()
    if (resolvedTemplateCode && resolvedTemplateCode !== editTemplateCode.value.trim()) {
      editTemplateCode.value = resolvedTemplateCode
    }
    lastCheckedEditTemplateCode.value = resolvedTemplateCode || currentTemplateCode
    if (result?.available) {
      editTemplateCodeCheckState.value = "available"
      editTemplateCodeHint.value = "Template Code is available."
      return true
    }
    editTemplateCodeCheckState.value = "blocked"
    editTemplateCodeHint.value = result?.message || "Template Code already exists."
    return false
  } catch (error) {
    editTemplateCodeCheckState.value = "blocked"
    editTemplateCodeHint.value = normalizeTemplateCodeError(error)
    return false
  }
}
function handleEditTemplateCodeBlur() {
  void ensureEditTemplateCodeAvailable()
}

function parseSizeOptionsInput(value: string) {
  return Array.from(new Set(
    String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ))
}

function stringifySizeOptions(values: string[] | undefined | null) {
  return Array.isArray(values) ? values.filter(Boolean).join(", ") : ""
}

function parsePositiveDimension(value: string | number | undefined | null) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return numeric
}

function createEditorDimensionState(item: PhysicalDimensionEditorEntry): PhysicalDimensionEditorState {
  return { ...item }
}

function resolveCanvasPixelSize(original: PhysicalDimensionEditorEntry["original"]) {
  const svgWidth = parsePositiveDimension(original?.source_svg?.pixel_width)
  const svgHeight = parsePositiveDimension(original?.source_svg?.pixel_height)
  if (svgWidth && svgHeight) {
    return { width: svgWidth, height: svgHeight }
  }
  const source001Width = parsePositiveDimension(original?.source_001?.width_px)
  const source001Height = parsePositiveDimension(original?.source_001?.height_px)
  if (source001Width && source001Height) {
    return { width: source001Width, height: source001Height }
  }
  const canvasWidth = parsePositiveDimension(original?.canvas_px?.width)
  const canvasHeight = parsePositiveDimension(original?.canvas_px?.height)
  if (canvasWidth && canvasHeight) {
    return { width: canvasWidth, height: canvasHeight }
  }
  return null
}

function resolvePhysicalPixelLabel(original: PhysicalDimensionEditorState["original"]) {
  const pixels = resolveCanvasPixelSize(original)
  return `${pixels?.width || 0} × ${pixels?.height || 0}`
}
function resolvePhysicalSourceLabel(entry: { source?: string; original?: PhysicalDimensionEditorState["original"] }) {
  const source = String(entry.source || "").trim().toLowerCase()
  if (source.startsWith("svg")) return "svg"
  if (source.startsWith("png")) return "png"
  if (source.includes("guide")) return "guide"
  if (entry.original?.source_svg) return "svg"
  if (entry.original?.source_001) return "guide"
  return source || "manual"
}

function updateDimensionValue(
  partName: string,
  target: "canvas" | "bbox",
  axis: "width" | "height",
  value: string,
) {
  const current = editPhysicalDimensions.value[partName]
  if (!current) return
  const nextTarget = {
    ...current[target],
    [axis]: value,
  }
  const nextState: PhysicalDimensionEditorState = {
    ...current,
    [target]: nextTarget,
  }
  editPhysicalDimensions.value[partName] = nextState
}

function updateDpiValue(partName: string, value: string) {
  const current = editPhysicalDimensions.value[partName]
  if (!current) return
  editPhysicalDimensions.value[partName] = {
    ...current,
    dpi: value,
    dpiSource: "manual_override",
  }
}

function updateSharedDpiValue(value: string) {
  editPhysicalDimensions.value = Object.fromEntries(
    Object.entries(editPhysicalDimensions.value).map(([partName, current]) => [
      partName,
      {
        ...current,
        dpi: value,
        dpiSource: "manual_override",
      },
    ]),
  )
}

function convertEntryUnit(entry: PhysicalDimensionFormEntry, fromUnit: PhysicalDisplayUnit, toUnit: PhysicalDisplayUnit): PhysicalDimensionFormEntry {
  return {
    ...entry,
    width: String(convertCmToUnit(convertUnitToCm(entry.width, fromUnit), toUnit).toFixed(2)).replace(/\.?0+$/, ""),
    height: String(convertCmToUnit(convertUnitToCm(entry.height, fromUnit), toUnit).toFixed(2)).replace(/\.?0+$/, ""),
  }
}

function remapPhysicalDimensionDisplayUnit(nextUnit: PhysicalDisplayUnit) {
  const previousUnit = editDisplayUnit.value
  if (previousUnit === nextUnit) return
  editPhysicalDimensions.value = Object.fromEntries(
    Object.entries(editPhysicalDimensions.value).map(([partName, item]) => [
      partName,
      {
        ...item,
        canvas: convertEntryUnit(item.canvas, previousUnit, nextUnit),
        bbox: convertEntryUnit(item.bbox, previousUnit, nextUnit),
      },
    ]),
  )
  editDisplayUnit.value = nextUnit
}

function buildEditorQuery(templateId: string) {
  const nextQuery: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(route.query)) {
    if (key === "template" || key === "template_id") continue
    const value = Array.isArray(rawValue) ? rawValue[rawValue.length - 1] : rawValue
    const normalized = String(value || "").trim()
    if (normalized) {
      nextQuery[key] = normalized
    }
  }
  if (templateId) {
    nextQuery.template = templateId
  }
  return nextQuery
}

function serializeQueryRecord(query: Record<string, string>) {
  return Object.entries(query)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")
}

function extractPartNamesFromUnknown(input: unknown, depth = 0): string[] {
  if (depth > 4 || input == null) return []
  if (Array.isArray(input)) {
    return input.flatMap((item) => {
      if (typeof item === "string") return [normalizePartName(item)]
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        return [
          normalizePartName(record.part_name),
          normalizePartName(record.name),
          normalizePartName(record.partName),
          normalizePartName(record.id),
          ...extractPartNamesFromUnknown(record.parts, depth + 1),
        ]
      }
      return []
    }).filter(Boolean)
  }
  if (typeof input !== "object") return []
  const record = input as Record<string, unknown>
  const keysFromPhysicalDimensions = record.physical_dimensions_cm && typeof record.physical_dimensions_cm === "object"
    ? Object.keys(((record.physical_dimensions_cm as Record<string, unknown>).parts || {}) as Record<string, unknown>)
    : []
  return [
    ...extractPartNamesFromUnknown(record.part_names, depth + 1),
    ...extractPartNamesFromUnknown(record.parts, depth + 1),
    ...extractPartNamesFromUnknown(record.stats, depth + 1),
    ...extractPartNamesFromUnknown(record.validation, depth + 1),
    ...extractPartNamesFromUnknown(record.manifest, depth + 1),
    ...keysFromPhysicalDimensions,
  ].map((item) => normalizePartName(item)).filter(Boolean)
}
function hydrateEditPhysicalDimensions() {
  const normalizedDimensions = normalizePhysicalDimensionsEditor(editPayload.value?.physical_dimensions_cm)
  const configured = normalizedDimensions.parts
  const postUploadCandidates = postUploadInspection.value?.physical_dimensions_candidates
  const validationPartNames = extractPartNamesFromUnknown(validationPayload.value)
  const editPayloadPartNames = extractPartNamesFromUnknown(editPayload.value)
  const hydratedUploadDimensions = hydrateUploadPhysicalDimensions({
    candidates: postUploadCandidates,
    configured: configured as any,
  })
  const hydratedUploadDimensionsByIdentity = buildNormalizedPartEntryMap(hydratedUploadDimensions)
  const preferredPartNames = [
    ...Object.keys(configured),
    ...Object.keys(postUploadCandidates || {}),
    ...editPayloadPartNames,
    ...validationPartNames,
  ]
  const seenPartIdentities = new Set<string>()
  const partNames = preferredPartNames.filter((partName) => {
    const normalized = normalizePartIdentity(partName)
    if (!normalized || seenPartIdentities.has(normalized)) return false
    seenPartIdentities.add(normalized)
    return true
  })
  editDisplayUnit.value = normalizedDimensions.default_unit || "cm"
  editPhysicalDimensions.value = Object.fromEntries(partNames.map((partName) => {
    const hydrated = hydratedUploadDimensions[partName]
      || hydratedUploadDimensionsByIdentity.get(normalizePartIdentity(partName))
      || {
      canvas: { width: "0", height: "0", source: "manual" },
      bbox: { width: "0", height: "0", source: "manual" },
      dpi: "72",
      dpiSource: "",
      original: {},
    }
    return [
      partName,
      createEditorDimensionState({
        ...hydrated,
        canvas: convertEntryUnit(hydrated.canvas, "cm", editDisplayUnit.value),
        bbox: convertEntryUnit(hydrated.bbox, "cm", editDisplayUnit.value),
      }),
    ]
  }))
}

watch(editPayload, (payload) => {
  if (!payload) return
  editingTemplateId.value = payload.template_id
  editDisplayName.value = payload.display_name
  editTemplateCode.value = payload.template_code || ""
  resetEditTemplateCodeValidation()
  editCategoryId.value = payload.category_id || ""
  editBaseSizeLabel.value = String(payload.base_size_label || "")
  editSizeOptionsInput.value = stringifySizeOptions(payload.size_options)
  hydrateEditPhysicalDimensions()
})

watch(validationPayload, () => {
  if (!editPayload.value) return
  hydrateEditPhysicalDimensions()
})

watch(postUploadInspection, () => {
  if (!editPayload.value) return
  hydrateEditPhysicalDimensions()
})

watch(createDisplayName, (value) => {
  if (templateIdTouched.value && createTemplateId.value.trim()) return
  createTemplateId.value = slugifyTemplateId(value)
})

watch(inspection, (payload) => {
  if (!payload) {
    return
  }
  if (!payload.suggested_config?.display_name) return
  if (!createDisplayName.value.trim()) {
    createDisplayName.value = payload.suggested_config.display_name
  }
  if (!templateIdTouched.value || !createTemplateId.value.trim()) {
    createTemplateId.value = slugifyTemplateId(payload.suggested_config.display_name)
  }
  if (!createBaseSizeLabel.value.trim() && payload.suggested_config?.base_size_label) {
    createBaseSizeLabel.value = payload.suggested_config.base_size_label
  }
  if (!createSizeOptionsInput.value.trim() && payload.suggested_config?.size_options?.length) {
    createSizeOptionsInput.value = stringifySizeOptions(payload.suggested_config.size_options)
  }
})

watch(uploadStatus, (payload) => {
  if (!payload) return
  if (payload.status === "failed") {
    uploadPhase.value = "failed"
    uploadProgress.value = 100
    return
  }
  if (["queued", "uploading", "validating", "parsing", "materializing"].includes(payload.status)) {
    uploadPhase.value = "creating"
    uploadProgress.value = 65 + (payload.progress || 0) * 35
    return
  }
  if (payload.status === "done") {
    uploadPhase.value = "done"
    uploadProgress.value = 100
  }
})

watch(
  () => [route.query.template, route.query.template_id],
  async () => {
    if (isMetadataEditMode.value) {
      await loadEditor()
    }
  },
)

function syncTemplateQuery(templateId: string) {
  const nextQuery = buildEditorQuery(templateId)
  const currentQuery = buildEditorQuery(String(route.query.template || route.query.template_id || "").trim())
  const hasLegacyTemplateId = Boolean(String(route.query.template_id || "").trim())
  if (!hasLegacyTemplateId && serializeQueryRecord(nextQuery) === serializeQueryRecord(currentQuery)) {
    return
  }
  router.replace({
    path: "/admin/editor",
    query: nextQuery,
  })
}

async function loadEditor(
  templateId = String(route.query.template_id || route.query.template || items.value[0]?.template_id || ""),
) {
  if (!templateId) return
  editingTemplateId.value = templateId
  editNotice.value = ""
  isLoadingEditorPayload.value = true
  isHydratingEditorView.value = true
  const isUploadTransition = isOpeningEditorAfterUpload.value
    && (!pendingEditorTemplateId.value || pendingEditorTemplateId.value === templateId)
  syncTemplateQuery(templateId)
  try {
    // Upload 跳转过来时(?setup_physical_size=1),runtime/DB 可能尚未就绪。
    // 先轮询 ready 端点,避免 /editor /validation 直接命中 404 闪现 + 字段空白。
    const isPostUpload = Boolean(String(route.query.setup_physical_size || "").trim())
    if (isPostUpload) {
      try {
        await uploadStore.waitForUploadReady(templateId, { timeoutMs: 20000, intervalMs: 800 })
      } catch {
        // 超时或异常仍然继续尝试拉取,由下方的 retry 兜底
      }
    }
    let lastErr: unknown = null
    for (let attempt = 0; attempt < (isPostUpload ? 4 : 1); attempt += 1) {
      try {
        await templateStore.loadEditPayload(templateId)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        if (attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500))
        }
      }
    }
    if (lastErr) throw lastErr
    await templateStore.loadValidation(templateId).catch(() => null)
    // Keep the transition state visible until Vue finishes syncing the editor form.
    await nextTick()
    await nextTick()
  } finally {
    isHydratingEditorView.value = false
    isLoadingEditorPayload.value = false
    if (isUploadTransition) {
      isOpeningEditorAfterUpload.value = false
      pendingEditorTemplateId.value = ""
    }
  }
}

async function saveTemplate() {
  if (!editingTemplateId.value || !editCategoryId.value) return
  editNotice.value = ""
  templateStore.error = ""
  const templateCodeReady = await ensureEditTemplateCodeAvailable()
  if (!templateCodeReady) {
    editNoticeTone.value = "danger"
    editNotice.value = editTemplateCodeHint.value || "Please fix Template Code and try again."
    return
  }
  const currentPayload = editPayload.value
  try {
    await templateStore.updateTemplate(editingTemplateId.value, {
      template_code: editTemplateCode.value.trim() || undefined,
      display_name: editDisplayName.value.trim(),
      base_size_label: editBaseSizeLabel.value.trim(),
      size_options: parseSizeOptionsInput(editSizeOptionsInput.value),
      category_id: editCategoryId.value,
      category_path: editCategoryPath.value,
      export_sizes: Array.isArray(currentPayload?.export_sizes) ? currentPayload.export_sizes : [],
      compose_params: currentPayload?.compose_params || {},
      input_constraints: currentPayload?.input_constraints || {},
      physical_dimensions_cm: buildPhysicalDimensionsPayload({
        default_unit: editDisplayUnit.value,
        display_unit: editDisplayUnit.value,
        parts: editPhysicalDimensions.value,
      }),
    })
    const successMessage = localize(
      `Template ${editingTemplateId.value} saved successfully.`,
      `模板 ${editingTemplateId.value} 保存成功。`,
    )
    editNoticeTone.value = "success"
    await router.replace({
      path: "/admin/repository",
      query: buildRepositoryReturnQuery(editingTemplateId.value, "success", successMessage),
    })
  } catch (error) {
    editNoticeTone.value = "danger"
    editNotice.value = templateStore.error || String((error as Error).message || error)
  }
}

function onTemplateIdInput(event: Event) {
  templateIdTouched.value = true
  createTemplateId.value = slugifyTemplateId((event.target as HTMLInputElement).value)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  createNotice.value = ""
  isOpeningEditorAfterUpload.value = false
  isLoadingEditorPayload.value = false
  isHydratingEditorView.value = false
  pendingEditorTemplateId.value = ""
  uploadStore.resetInspection()
  uploadPhase.value = "idle"
  uploadProgress.value = 0
  if (selectedFile.value && !createDisplayName.value.trim()) {
    createDisplayName.value = selectedFile.value.name.replace(/\.[^.]+$/, "")
  }
  if (selectedFile.value) {
    void inspectSelectedFile()
  }
}

function retryUpload() {
  if (!canUpload.value) return
  handleUpload().catch(() => undefined)
}

async function handleUpload() {
  if (!selectedFile.value || !createDisplayName.value.trim() || !createTemplateId.value.trim() || !createCategoryId.value) return
  createNotice.value = ""
  isOpeningEditorAfterUpload.value = false
  isLoadingEditorPayload.value = false
  isHydratingEditorView.value = false
  pendingEditorTemplateId.value = ""
  try {
    const inspectionReady = await inspectSelectedFile(true)
    if (!inspectionReady || uploadStore.error || !inspectionPassed.value) {
      uploadPhase.value = "failed"
      uploadProgress.value = 100
      createNotice.value = uploadStore.error || inspection.value?.summary || localize("Package inspection failed. Please fix the errors and try again.", "包检查失败，请修复错误后重试。")
      return
    }
    const suggestedConfig: SuggestedConfig = inspection.value?.suggested_config || {
      display_name: createDisplayName.value.trim(),
      base_size_label: createBaseSizeLabel.value.trim(),
      size_options: parseSizeOptionsInput(createSizeOptionsInput.value),
      structure_overrides: { bucket_aliases: {}, view_aliases: {}, part_aliases: {} },
      compose_params: {},
      input_constraints: {},
      physical_dimensions_cm: { parts: {} },
    }
    suggestedConfig.base_size_label = createBaseSizeLabel.value.trim()
    suggestedConfig.size_options = parseSizeOptionsInput(createSizeOptionsInput.value)
    suggestedConfig.physical_dimensions_cm = buildPhysicalDimensionsPayload({
      default_unit: "cm",
      parts: hydrateUploadPhysicalDimensions({
        candidates: inspection.value?.physical_dimensions_candidates,
        configured: (suggestedConfig.physical_dimensions_cm?.parts || {}) as any,
      }),
    })
    uploadPhase.value = "creating"
    uploadProgress.value = 65
    await uploadStore.upload(
      selectedFile.value,
      createDisplayName.value.trim(),
      createTemplateId.value.trim(),
      createCategoryId.value,
      suggestedConfig,
      inspection.value?.inspect_job_id || "",
    )
    if (uploadStore.error || uploadStatus.value?.status === "failed") {
      uploadPhase.value = "failed"
      uploadProgress.value = 100
      createNotice.value = uploadStore.error || uploadStatus.value?.error || localize("Upload failed. Please review the errors below.", "上传失败，请查看下方错误信息。")
      return
    }
    uploadPhase.value = "done"
    uploadProgress.value = 100
    await templateStore.load()
    const newTemplateId = resolveUploadedTemplateId()
    pendingEditorTemplateId.value = newTemplateId
    isOpeningEditorAfterUpload.value = true
    createNotice.value = localize("Upload successful. Redirecting to Template Editor...", "上传成功，正在跳转到模板编辑器...")
    await router.replace({ path: "/admin/editor", query: { template: newTemplateId, setup_physical_size: "1" } })
  } catch (error) {
    uploadPhase.value = "failed"
    uploadProgress.value = 100
    isOpeningEditorAfterUpload.value = false
    isLoadingEditorPayload.value = false
    isHydratingEditorView.value = false
    pendingEditorTemplateId.value = ""
    createNotice.value = uploadStore.error || String((error as Error).message || error)
    return
  }
}

async function inspectSelectedFile(force = false) {
  if (!selectedFile.value || !createDisplayName.value.trim() || !createTemplateId.value.trim()) {
    return false
  }
  if (!force && inspection.value?.suggested_config) {
    return inspectionPassed.value
  }
  uploadPhase.value = "inspecting"
  uploadProgress.value = 25
  await nextTick()
  await uploadStore.inspect(selectedFile.value, createDisplayName.value.trim(), createTemplateId.value.trim())
  if (uploadStore.error || !inspection.value) {
    uploadPhase.value = "failed"
    uploadProgress.value = 100
    return false
  }
  uploadPhase.value = "idle"
  uploadProgress.value = 0
  return inspectionPassed.value
}

onMounted(async () => {
  await platformStore.loadTemplateCategories(authStore.authHeaders)
  if (isMetadataEditMode.value) {
    await templateStore.load()
    await loadEditor()
  } else {
    templateStore.error = ""
  }
})
</script>

<template>
  <div class="editor-page" :class="{ 'upload-mode': isUploadMode }" :data-testid="isUploadMode ? 'admin-editor-upload-page' : 'admin-editor-page'">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-text">
          <h1 v-if="isUploadMode" class="page-title">{{ localize("Upload Template", "上传模板") }}</h1>
          <h1 v-else class="page-title">{{ localize("Edit Template", "编辑模板") }}</h1>
          <p v-if="isUploadMode" class="page-subtitle">{{ localize("Upload one template ZIP. We inspect it, create the template, then open Edit.", "上传一个模板 ZIP。系统会先检查、创建模板，然后自动打开编辑页。") }}</p>
        </div>
        <div class="header-actions">
          <button
            v-if="!isUploadMode"
            type="button"
            class="btn-primary btn-save-template"
            :disabled="!editingTemplateId || !editCategoryId"
            @click="saveTemplate"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12l5 5L20 7" />
            </svg>
            <span>{{ localize("Save Template & Close", "保存模板并关闭") }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="editor-content">
      <div class="editor-card">
        <!-- Upload Mode -->
        <div v-if="isUploadMode" class="card-section upload-card-section">
          <div class="form-grid upload-form-grid">
            <div class="form-group">
              <label class="form-label">{{ localize("Template Name *", "模板名称 *") }}</label>
              <input v-model="createDisplayName" :placeholder="localize('Enter template name', '输入模板名称')" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">{{ localize("Template Code *", "模板编码 *") }}</label>
              <input :value="createTemplateId" :placeholder="localize('Enter template code', '输入模板编码')" class="form-input" required @input="onTemplateIdInput" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ localize("Category", "分类") }}</label>
              <CategoryCascadeSelector
                v-model="createCategoryId"
                :categories="categories"
                :show-recent-options="false"
                :show-selection-summary="false"
                :helper-text="localize('Used for product classification up to 3 levels', '用于最多 3 级的产品分类')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ localize("Base Size", "基础尺码") }}</label>
              <input
                v-model="createBaseSizeLabel"
                :placeholder="localize('e.g. 41', '例如 41')"
                class="form-input"
              />
            </div>
            <div class="form-group full-width">
              <label class="form-label">{{ localize("Available Sizes", "可用尺码") }}</label>
              <input
                v-model="createSizeOptionsInput"
                :placeholder="localize('e.g. 39, 40, 41, 42', '例如 39, 40, 41, 42')"
                class="form-input"
              />
            </div>
            <div class="form-group full-width">
              <label class="form-label">{{ localize("Template Archive", "模板压缩包") }}</label>
              <div class="file-upload">
                <input type="file" accept=".zip,.tar,.tar.gz,.tgz,.tar.bz2,.tbz2,.tar.xz,.txz,.7z,.rar,application/zip,application/x-tar,application/gzip,application/x-gzip,application/x-7z-compressed,application/vnd.rar,application/x-rar-compressed" @change="onFileChange" class="file-input" data-testid="editor-upload-file-input" />
                <div class="file-upload-label">
                  <span class="upload-icon">📁</span>
                  <span class="upload-text">{{ selectedFile?.name || localize('Choose archive file...', '选择压缩包文件...') }}</span>
                </div>
              </div>
            </div>
            <div v-if="createCategoryPath" class="form-group full-width">
              <label class="form-label">{{ localize("Category Path", "分类路径") }}</label>
              <input :value="createCategoryPath" readonly class="form-input readonly" />
            </div>
            <div class="form-group full-width">
              <div class="physical-panel">
                <div class="physical-panel-header">
                  <div>
                    <label class="form-label">{{ localize("Part Sizes", "部件尺寸") }}</label>
                    <p class="physical-copy">{{ localize("After upload, Edit opens so you can confirm each detected part size in cm.", "上传后会自动打开编辑页，供你确认每个检测到的部件尺寸（cm）。") }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn-secondary compact"
                    :disabled="!selectedFile || uploadStore.loading"
                    @click="inspectSelectedFile(true)"
                  >
                    {{ inspection ? localize("Refresh Inspection", "刷新检查结果") : localize("Inspect Archive", "检查压缩包") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="card-section edit-card-section">
          <div class="edit-workbench-shell">
            <div
              v-if="editorTransitionNotice"
              class="editor-transition-overlay"
              data-testid="editor-transition-overlay"
              role="status"
              aria-live="polite"
            >
              <div class="editor-transition-dialog">
                <div class="status-icon spinner-icon editor-transition-spinner" aria-hidden="true"></div>
                <div class="editor-transition-copy">
                  <strong>{{ localize("Opening Template Editor", "正在打开模板编辑器") }}</strong>
                  <span data-testid="editor-transition-notice">{{ editorTransitionNotice }}</span>
                  <small>{{ localize("Template metadata and detected part sizes are loading. This message disappears automatically when loading finishes.", "模板元数据和检测到的部件尺寸正在加载中。加载完成后此提示会自动消失。") }}</small>
                </div>
              </div>
            </div>
          <div class="setup-workbench" :class="{ 'is-transition-loading': isEditorTransitionActive }" :aria-busy="isEditorTransitionActive ? 'true' : 'false'">
            <section class="setup-overview">
              <div class="setup-meta-card">
                <label class="form-label">{{ localize("Template", "模板") }}</label>
                <div v-if="uploadedArchiveFolders.length" class="setup-folder-summary">
                  <span class="setup-folder-label">{{ localize("ZIP folders", "ZIP 文件夹") }}</span>
                  <div class="setup-folder-list">
                    <span v-for="folder in uploadedArchiveFolders" :key="folder" class="setup-folder-chip">{{ folder }}</span>
                  </div>
                </div>
                <div class="setup-meta-grid compact">
                  <div class="form-group">
                    <label class="form-label">{{ localize("Template Name", "模板名称") }}</label>
                    <input v-model="editDisplayName" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Template Code</label>
                    <input
                      v-model="editTemplateCode"
                      class="form-input"
                      :class="{ invalid: editTemplateCodeCheckState === 'blocked' }"
                      @input="handleEditTemplateCodeInput"
                      @blur="handleEditTemplateCodeBlur"
                    />
                    <small
                      v-if="editTemplateCodeHint"
                      class="field-hint"
                      :class="editTemplateCodeCheckState"
                      data-testid="edit-template-code-hint"
                    >
                      {{ editTemplateCodeHint }}
                    </small>
                  </div>
                  <div class="form-group full-width editor-category-group">
                    <label class="form-label">{{ localize("Category", "分类") }}</label>
                    <CategoryCascadeSelector
                      v-model="editCategoryId"
                      :categories="categories"
                      display-mode="panel"
                      :show-recent-options="false"
                      :show-selection-summary="false"
                      :helper-text="localize('Select a category path up to Level 3.', '选择最多 3 级的分类路径。')"
                    />
                  </div>
                </div>
              </div>
            </section>
            <section class="setup-dimensions">
              <div class="physical-panel physical-panel--workbench">
                <div class="physical-panel-header compact">
                  <div class="physical-panel-heading">
                    <label class="form-label">Part Sizes</label>
                  </div>
                  <div class="physical-panel-controls">
                    <div class="form-group compact shared-physical-control-group">
                      <label class="form-label">Base Size</label>
                      <input
                        v-model="editBaseSizeLabel"
                        class="form-input compact shared-physical-control-input"
                        placeholder="e.g. 41"
                      />
                    </div>
                    <div class="form-group compact shared-physical-control-group global-dpi-group">
                      <label class="form-label">DPI</label>
                      <input
                        :value="sharedEditDpi"
                        type="number"
                        min="0"
                        step="0.01"
                        class="form-input compact shared-physical-control-input global-dpi-input"
                        @input="updateSharedDpiValue(($event.target as HTMLInputElement).value)"
                      />
                    </div>
                    <div class="form-group compact shared-physical-control-group unit-select-group">
                      <label class="form-label">Unit</label>
                      <div class="editor-unit-dropdown">
                        <FilterDropdown
                          :model-value="editDisplayUnit"
                          :options="physicalUnitOptions"
                          @update:model-value="remapPhysicalDimensionDisplayUnit($event as PhysicalDisplayUnit)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="editPhysicalDimensionEntries.length" class="physical-grid-scroller">
                  <div class="physical-grid physical-grid--compact">
                    <div v-for="entry in editPhysicalDimensionEntries" :key="entry.partName" class="physical-card compact">
                      <div class="physical-head">
                        <div class="physical-head-copy">
                          <strong>{{ entry.displayName }}</strong>
                        </div>
                      </div>
                      <div class="physical-readonly">
                        <small class="physical-raw">source: {{ resolvePhysicalSourceLabel(entry) }} | px: {{ resolvePhysicalPixelLabel(entry.original) }}</small>
                      </div>
                      <div class="physical-row compact physical-row-stack">
                        <div class="physical-block">
                          <div class="physical-subhead">
                            <strong>{{ localize("Image Size", "图像尺寸") }}</strong>
                          </div>
                          <div class="physical-row compact">
                            <div class="form-group compact">
                              <label class="form-label">{{ localize("Width", "宽度") }} ({{ currentUnitSuffix }})</label>
                              <input
                                :value="editPhysicalDimensions[entry.partName].canvas.width"
                                type="number"
                                min="0"
                                step="0.01"
                                class="form-input compact"
                                @input="updateDimensionValue(entry.partName, 'canvas', 'width', ($event.target as HTMLInputElement).value)"
                              />
                            </div>
                            <div class="form-group compact">
                              <label class="form-label">{{ localize("Height", "高度") }} ({{ currentUnitSuffix }})</label>
                              <input
                                :value="editPhysicalDimensions[entry.partName].canvas.height"
                                type="number"
                                min="0"
                                step="0.01"
                                class="form-input compact"
                                @input="updateDimensionValue(entry.partName, 'canvas', 'height', ($event.target as HTMLInputElement).value)"
                              />
                            </div>
                          </div>
                        </div>
                        <div class="physical-block">
                          <div class="physical-subhead">
                            <strong>{{ localize("Product Size", "产品尺寸") }}</strong>
                          </div>
                          <div class="physical-row compact">
                            <div class="form-group compact">
                              <label class="form-label">{{ localize("Width", "宽度") }} ({{ currentUnitSuffix }})</label>
                              <input
                                :value="editPhysicalDimensions[entry.partName].bbox.width"
                                type="number"
                                min="0"
                                step="0.01"
                                class="form-input compact"
                                @input="updateDimensionValue(entry.partName, 'bbox', 'width', ($event.target as HTMLInputElement).value)"
                              />
                            </div>
                            <div class="form-group compact">
                              <label class="form-label">{{ localize("Height", "高度") }} ({{ currentUnitSuffix }})</label>
                              <input
                                :value="editPhysicalDimensions[entry.partName].bbox.height"
                                type="number"
                                min="0"
                                step="0.01"
                                class="form-input compact"
                                @input="updateDimensionValue(entry.partName, 'bbox', 'height', ($event.target as HTMLInputElement).value)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="physical-note">{{ localize("Detected part sizes are still loading. Please wait...", "检测到的部件尺寸仍在加载中，请稍候...") }}</div>
              </div>
            </section>
          </div>
          </div>
        </div>

        <!-- Progress Section -->
        <div v-if="progressLabel" class="progress-section">
          <div class="progress-header">
            <h3 class="progress-title">{{ progressLabel }}</h3>
            <span class="progress-percent">{{ progressPercent }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <div class="progress-steps">
            <span
              v-for="step in uploadProgressSteps"
              :key="step.key"
              class="progress-step"
              :class="{ active: step.active }"
            >
              {{ step.label }}
            </span>
          </div>
        </div>

        <!-- Status Banners -->
        <div v-if="isUploadSuccessful" class="status-banner success" data-testid="editor-upload-success">
          <div class="status-icon">✅</div>
          <div class="status-content">
            <strong>{{ localize("Template created successfully", "模板创建成功") }}</strong>
            <span>{{ localize("The package passed validation and template was created.", "压缩包已通过校验，模板已创建。") }}</span>
          </div>
        </div>
        <div v-else-if="isUploadFailed" class="status-banner error" data-testid="editor-upload-failed">
          <div class="status-icon">❌</div>
          <div class="status-content">
            <strong>{{ localize("Upload failed", "上传失败") }}</strong>
            <span>{{ localize("Please review the error details below, then retry with the current ZIP package.", "请先查看下方错误详情，再使用当前 ZIP 压缩包重试。") }}</span>
            <button type="button" class="btn-secondary" :disabled="!canUpload || uploadStore.loading" @click="retryUpload">
              {{ localize("Retry Upload", "重新上传") }}
            </button>
          </div>
        </div>

        <!-- Error Panel -->
        <div v-if="normalizedUploadErrors.length" class="workflow-error-panel" data-testid="editor-upload-error-panel">
          <div class="workflow-error-header">
            <span class="workflow-error-icon">⚠️</span>
            <strong>Upload Error</strong>
          </div>
          <div class="workflow-error-list">
            <p
              v-for="item in normalizedUploadErrors"
              :key="item"
              class="workflow-error-item"
              data-testid="editor-upload-error-item"
            >
              {{ item }}
            </p>
          </div>
        </div>

        <div v-if="saveErrorState" class="workflow-error-panel" data-testid="editor-save-error-panel">
          <div class="workflow-error-header">
            <span class="workflow-error-icon">⚠️</span>
            <strong>Save Error</strong>
          </div>
          <p class="workflow-error-item">{{ saveErrorState }}</p>
        </div>

        <!-- Actions -->
        <div class="form-actions" :class="{ sticky: isUploadMode }">
          <button
            v-if="isUploadMode"
            type="button"
            class="btn-primary"
            :disabled="!canUpload"
            @click="handleUpload"
            data-testid="editor-upload-submit"
          >
            <span v-if="uploadStore.loading" class="loading-spinner"></span>
            {{ uploadStore.loading ? progressLabel || localize('Uploading...', '正在上传...') : localize('Upload Template', '上传模板') }}
          </button>
          <span
            v-if="templateStore.error && isUploadMode && !normalizedUploadErrors.length"
            class="notice-message danger"
          >
            {{ formatUploadWorkflowError(templateStore.error) }}
          </span>
          <span
            v-else-if="isUploadMode && createNotice && !isUploadFailed"
            class="notice-message"
            data-testid="editor-upload-notice"
          >
            {{ createNotice }}
          </span>
          <span
            v-else-if="!isUploadMode && editNotice && editNoticeTone === 'success'"
            class="notice-message success"
            data-testid="editor-save-notice"
          >
            {{ editNotice }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Page Layout */
.editor-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.editor-page.upload-mode {
  gap: 0.6rem;
}

.page-header {
  background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
  border-radius: 0.9rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid #dbe4ef;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.upload-mode .page-header {
  padding: 0.55rem 0.75rem;
  border-radius: 0.8rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.upload-mode .header-content {
  gap: 0.75rem;
}

.header-text h1 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.upload-mode .header-text h1 {
  font-size: 1.2rem;
  margin-bottom: 0.15rem;
}

.header-text p {
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.45;
  margin: 0;
}

.upload-mode .header-text p {
  font-size: 0.84rem;
  line-height: 1.35;
}

.header-actions {
  display: flex;
  align-items: center;
}

.btn-save-template {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.78rem 1.2rem;
  border: 1px solid rgba(14, 116, 144, 0.2);
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e 0%, #0f9a8f 52%, #0ea5a4 100%);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.22);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.btn-save-template svg {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.btn-save-template:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(15, 118, 110, 0.28);
  filter: brightness(1.03);
}

.btn-save-template:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
  filter: none;
}

.editor-content {
  width: 100%;
}

.editor-card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.upload-mode .editor-card {
  border-radius: 0.7rem;
}

.card-section {
  padding: 0.8rem;
}

.upload-card-section {
  padding: 0.7rem;
}

.edit-card-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-workbench-shell {
  position: relative;
}

.setup-physical-size-mode {
  padding-top: 0.85rem;
}

/* Form Layout */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.upload-form-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.upload-mode .form-group {
  gap: 0.3rem;
}

.form-group.compact {
  gap: 0.35rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.upload-mode .form-label {
  font-size: 0.82rem;
  margin-bottom: 0.15rem;
}

.form-input {
  padding: 0.65rem 0.85rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.upload-mode .form-input {
  padding: 0.55rem 0.75rem;
  font-size: 0.84rem;
  line-height: 1.2;
}

.form-input.compact {
  padding: 0.65rem 0.8rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.invalid {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
}

.form-input.readonly {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #6b7280;
}

.form-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Courier New', monospace;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.size-preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.size-preview-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid #dbeafe;
  border-radius: 0.75rem;
  background: #eff6ff;
}

.size-preview-item span {
  color: #475569;
}

.receipt-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid #dbeafe;
  border-radius: 0.85rem;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.receipt-header,
.receipt-line {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.receipt-header span,
.receipt-line p {
  margin: 0.2rem 0 0;
  color: #64748b;
}

.receipt-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.receipt-metric {
  border: 1px solid #dbeafe;
  border-radius: 0.75rem;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.9);
}

.receipt-metric span {
  display: block;
  color: #64748b;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.receipt-lines {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.receipt-line {
  align-items: center;
  border-top: 1px solid #dbeafe;
  padding-top: 0.65rem;
}

.receipt-line-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

/* File Upload */
.file-upload {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.file-upload-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-mode .file-upload-label {
  gap: 0.6rem;
  padding: 0.65rem 0.75rem;
}

.file-upload-label:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.physical-panel {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.upload-mode .physical-panel {
  gap: 0.55rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.65rem;
}

.setup-workbench {
  display: grid;
  grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
  gap: 0.8rem;
  align-items: start;
}

.setup-workbench.is-transition-loading {
  pointer-events: none;
  user-select: none;
  filter: saturate(0.72);
  opacity: 0.45;
}

.editor-transition-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 1rem;
  background: rgba(248, 250, 252, 0.78);
  backdrop-filter: blur(5px);
}

.editor-transition-dialog {
  width: min(100%, 460px);
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1rem 1.1rem;
  border: 1px solid #93c5fd;
  border-radius: 1rem;
  background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.12);
}

.editor-transition-spinner {
  flex: 0 0 auto;
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.1rem;
}

.editor-transition-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.editor-transition-copy strong {
  color: #1e3a8a;
}

.editor-transition-copy span {
  color: #1e293b;
  line-height: 1.5;
}

.editor-transition-copy small {
  color: #475569;
  line-height: 1.45;
}

.setup-overview {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  position: sticky;
  top: 0.5rem;
}

.setup-meta-card {
  padding: 0.8rem 0.85rem;
  border: 1px solid #d7e1ec;
  border-radius: 1rem;
  background: linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.035);
}

.setup-meta-copy {
  margin: 0.35rem 0 0;
  color: #64748b;
  line-height: 1.5;
}

.setup-folder-summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.55rem;
  padding: 0.6rem 0.75rem 0.7rem;
  border: 1px solid #dbe7f3;
  border-radius: 0.9rem;
  background: #f8fbff;
}

.setup-folder-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #64748b;
}

.setup-folder-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.setup-folder-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  background: #e8f1ff;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 700;
}

.field-hint {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.82rem;
  color: #64748b;
}

.field-hint.checking {
  color: #0ea5e9;
}

.field-hint.available {
  color: #047857;
}

.field-hint.blocked {
  color: #dc2626;
}

.editor-category-group :deep(.category-cascade) {
  gap: 0.55rem;
}

.editor-category-group :deep(.cascade-panel-grid) {
  min-height: 250px;
  grid-template-columns: minmax(94px, 1.15fr) minmax(94px, 1.15fr) minmax(92px, 0.95fr);
  border-radius: 0.9rem;
  border-color: #d9e2ec;
}

.editor-category-group :deep(.cascade-panel-column) {
  max-height: 250px;
  overflow-x: hidden;
  overflow-y: auto;
}

.editor-category-group :deep(.cascade-panel-option) {
  min-height: 56px;
  height: auto;
  padding: 0.55rem 0.65rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  font-size: 0.8rem;
  align-items: start;
  line-height: 1.45;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  flex: 0 0 auto;
}

.editor-category-group :deep(.cascade-panel-option span) {
  display: block;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.editor-category-group :deep(.cascade-panel-arrow) {
  margin-top: 0.1rem;
  align-self: start;
}

.editor-category-group :deep(.cascade-panel-grid) {
  align-items: stretch;
}

.editor-category-group :deep(.cascade-panel-empty) {
  padding: 0.75rem;
  font-size: 0.8rem;
}

.setup-meta-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.8rem;
}

.setup-meta-grid.compact {
  gap: 0.7rem;
}

.physical-note {
  display: block;
  margin-top: 0.4rem;
  color: #92400e;
  font-size: 0.78rem;
  line-height: 1.45;
}

.setup-dimensions {
  min-width: 0;
}

.physical-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.physical-panel-header.compact {
  align-items: center;
}

.physical-panel-heading {
  display: flex;
  align-items: center;
}

.physical-panel-controls {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.shared-physical-control-group,
.unit-select-group,
.global-dpi-group {
  width: 120px;
  flex: 0 0 auto;
}

.physical-panel-controls .form-group.compact {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.35rem;
}

.physical-panel-controls .form-label {
  text-align: center;
}

.shared-physical-control-input,
.global-dpi-input {
  text-align: center;
  height: 38px;
}

.editor-unit-dropdown {
  width: 100%;
}

.editor-unit-dropdown :deep(.filter-dropdown) {
  min-width: 0;
}

.editor-unit-dropdown :deep(.filter-dropdown-trigger) {
  height: 38px;
  border-radius: 12px;
  border-color: #d7e0ee;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  justify-content: center;
  padding: 0 2rem 0 0.9rem;
  position: relative;
  font-weight: 700;
}

.editor-unit-dropdown :deep(.filter-dropdown-trigger span) {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.editor-unit-dropdown :deep(.filter-dropdown-caret) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.editor-unit-dropdown :deep(.filter-dropdown-caret.open) {
  transform: translateY(-50%) rotate(180deg);
}

.physical-copy {
  margin: 0.35rem 0 0;
  color: #64748b;
  line-height: 1.5;
}

.upload-mode .physical-copy {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  line-height: 1.35;
}

.physical-panel--workbench {
  gap: 0.7rem;
  padding: 0.8rem;
  border-color: #d9e2ec;
  background: linear-gradient(180deg, #f7f9fd 0%, #eef3fa 100%);
}

.physical-grid-scroller {
  max-height: min(62vh, 900px);
  overflow: auto;
  padding-right: 0.15rem;
}

.physical-grid {
  display: grid;
  gap: 0.7rem;
}

.physical-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
}

.physical-card {
  padding: 0.875rem;
  border: 1px solid #dbe4f0;
  border-radius: 0.75rem;
  background: white;
}

.physical-card.compact {
  padding: 0.75rem;
  border-color: #d9e2ec;
  border-radius: 0.95rem;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.physical-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.3rem;
}

.physical-head-copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.physical-head-copy strong {
  color: #0f172a;
  line-height: 1.35;
}

.physical-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.physical-row.compact {
  gap: 0.6rem;
}

.physical-raw {
  display: block;
  margin-bottom: 0.35rem;
  color: #64748b;
}

.physical-readonly {
  display: grid;
  gap: 0.2rem;
  margin-bottom: 0.55rem;
}

.physical-row-stack {
  align-items: start;
  grid-template-columns: 1fr;
}

.physical-block {
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  background: #f8fbff;
}

.physical-subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  margin-bottom: 0.4rem;
}

.physical-subhead strong {
  color: #0f172a;
  font-size: 0.86rem;
}

.btn-secondary.compact {
  padding: 0.6rem 0.9rem;
  white-space: nowrap;
}

.upload-mode .btn-secondary.compact {
  padding: 0.5rem 0.75rem;
  font-size: 0.82rem;
}

.upload-icon {
  font-size: 1.5rem;
}

.upload-mode .upload-icon {
  font-size: 1.2rem;
}

.upload-text {
  font-size: 0.875rem;
  color: #64748b;
}

.upload-mode .upload-text {
  font-size: 0.82rem;
}

/* Progress Section */
.progress-section {
  padding: 0.8rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.upload-mode .progress-section {
  padding: 0.65rem 0.75rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.upload-mode .progress-header {
  margin-bottom: 0.65rem;
}

.progress-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.upload-mode .progress-title,
.upload-mode .progress-percent {
  font-size: 0.98rem;
}

.progress-percent {
  font-size: 1.125rem;
  font-weight: 700;
  color: #3b82f6;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #0ea5e9);
  transition: width 0.3s ease;
}

.progress-steps {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.upload-mode .progress-steps {
  gap: 0.35rem;
  margin-top: 0.7rem;
  flex-wrap: wrap;
}

.progress-step {
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.upload-mode .progress-step {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.72rem;
}

.progress-step.active {
  background: #3b82f6;
  color: white;
}

.form-actions.sticky {
  position: sticky;
  bottom: 0;
  z-index: 3;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, #ffffff 35%);
  border-top: 1px solid #e5e7eb;
  backdrop-filter: blur(8px);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
}

.upload-mode .form-actions {
  padding: 0.7rem 0.75rem;
}

.notice-message {
  color: #475569;
  line-height: 1.5;
}

.notice-message.success {
  color: #047857;
}

.notice-message.danger {
  color: #b91c1c;
}

/* Status Banners */
.status-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin: 0.75rem 0;
  border-radius: 0.5rem;
}

.upload-mode .status-banner {
  gap: 0.75rem;
  padding: 0.75rem;
  margin: 0.6rem 0;
}

.status-banner.success {
  background: #ecfdf5;
  border: 1px solid #10b981;
}

.status-banner.info {
  background: #eff6ff;
  border: 1px solid #60a5fa;
}

.status-banner.error {
  background: #fef2f2;
  border: 1px solid #ef4444;
}

.workflow-error-panel {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin: 0.75rem 0;
  padding: 0.9rem 1rem;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  background: #fef2f2;
}

.workflow-error-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #b91c1c;
}

.workflow-error-icon {
  flex: 0 0 auto;
}

.workflow-error-list {
  display: grid;
  gap: 0.45rem;
}

.workflow-error-item {
  margin: 0;
  color: #991b1b;
  line-height: 1.5;
}

.status-icon {
  font-size: 1.5rem;
}

.spinner-icon {
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid rgba(37, 99, 235, 0.18);
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: editor-spin 0.8s linear infinite;
}

.next-error-panel p {
  margin: 0.2rem 0;
  line-height: 1.5;
}

@keyframes editor-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .upload-form-grid {
    grid-template-columns: 1fr;
  }

  .setup-workbench,
  .setup-stats-grid,
  .physical-panel-header,
  .physical-row {
    grid-template-columns: 1fr;
    display: grid;
  }

  .setup-overview {
    position: static;
  }

  .editor-transition-overlay {
    padding: 0.35rem 0;
  }

  .editor-transition-dialog {
    width: 100%;
  }

  .physical-head,
  .physical-head-actions,
  .physical-subhead {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
