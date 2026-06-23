<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import CategoryCascadeSelector from "../CategoryCascadeSelector.vue"
import FilterDropdown from "../FilterDropdown.vue"
import PaginationBar from "../PaginationBar.vue"
import ActionConfirmationModal from "./ActionConfirmationModal.vue"
import { canReviewSubmission } from "../../pages/admin/centerView"
import { normalizeArtworkSubmissionStatus } from "../../pages/admin/artworkCenterView"
import { useArtworkStore } from "../../stores/artworks"
import {
  type ArtworkCodeCheckResult,
  resolveApiErrorMessage,
  resolveRuntimeAssetUrl,
  type ArtworkCategoryNode,
  type ArtworkDeletionPreviewResponse,
  type ArtworkImportItem,
  type ArtworkLibrarySummary,
  type ArtworkListItem,
  type ArtworkSubmissionSummary,
  type DeletionPreviewMode,
} from "../../api/client"
import {
  buildArtworkImportStorageKey,
  buildImportPreviewStats,
  buildImportSourceKey,
  dedupeImportItems,
  hashImportManifest,
  normalizeCheckpointMessages,
  normalizeImportManifest,
  parseArtworkImportCheckpoint,
  splitImportIntoBatches,
  type ArtworkImportCheckpoint,
  type ArtworkImportPreviewStats,
} from "../../utils/artworkImport"
import { computeFloatingHoverOverlay } from "../../utils/floatingHoverOverlay"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { readAdminTenantContext } from "../../pages/admin/adminTenantContext"

type HoverOverlayClass =
  | "hover-overlay--bottom-left"
  | "hover-overlay--bottom-right"
  | "hover-overlay--top-left"
  | "hover-overlay--top-right"

const props = defineProps<{
  scope: "platform" | "tenant"
  title: string
  description: string
}>()

const artworkStore = useArtworkStore()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const route = useRoute()
const { submissionHistory } = storeToRefs(artworkStore)
const { locale } = storeToRefs(uiLocaleStore)
const isZh = computed(() => locale.value === "zh")
const text = (en: string, zh: string) => (isZh.value ? zh : en)
const mimeOptions = [
  { label: "JPG", value: "image/jpeg", ext: "jpg" },
  { label: "PNG", value: "image/png", ext: "png" },
  { label: "WEBP", value: "image/webp", ext: "webp" },
  { label: "SVG", value: "image/svg+xml", ext: "svg" },
]
const providerOptions = computed(() => (
  props.scope === "platform"
    ? [
        { label: text("Manual", "手动录入"), value: "manual" },
        { label: "Openclipart", value: "openclipart" },
        { label: "LibreClipArt", value: "libreclipart" },
        { label: text("Met Open Access", "Met Open Access"), value: "met" },
        { label: "Openverse", value: "openverse" },
      ]
    : [
        { label: text("Tenant Upload", "租户上传"), value: "tenant_upload" },
      ]
))

const keyword = ref("")
const categoryId = ref("all")
const statusFilter = ref<"all" | "active" | "disabled">("all")
const page = ref(1)
const pageSize = 12
const saving = ref(false)
const uploading = ref(false)
const error = ref("")
const notice = ref("")
const editingId = ref("")
const importJsonText = ref("")
const importFileName = ref("")
const importPreviewItems = ref<ArtworkImportItem[]>([])
const importMessages = ref<string[]>([])
const importing = ref(false)
const reviewingSubmissionId = ref("")
const loadingSubmissionHistoryId = ref("")
const loadingSubmissions = ref(false)
const expandedHistory = ref<Record<string, boolean>>({})
const submissions = ref<ArtworkSubmissionSummary[]>([])
const tenantModalOpen = ref(false)
const importBatchSize = ref(25)
const importCheckpoint = ref<ArtworkImportCheckpoint | null>(null)
const pendingActionById = ref<Record<string, string>>({})
const reviewDialogOpen = ref(false)
const reviewDialogSubmissionId = ref("")
const reviewDialogAction = ref<"start_review" | "changes_requested" | "approved" | "rejected">("approved")
const reviewDialogNote = ref("")
const reviewDialogError = ref("")
const deleteDialogOpen = ref(false)
const deleteDialogItem = ref<ArtworkListItem | null>(null)
const deleteDialogPreview = ref<ArtworkDeletionPreviewResponse | null>(null)
const deleteDialogMode = ref<DeletionPreviewMode>("soft_delete")
const deleteDialogError = ref("")
const clearDialogOpen = ref(false)
const clearDialogError = ref("")
const listingDialogOpen = ref(false)
const listingDialogItem = ref<ArtworkListItem | null>(null)
const listingDialogChoiceValue = ref<"public" | "private">("private")
const listingDialogMode = ref<"list" | "unlist" | "permission">("list")
const listingDialogError = ref("")
const submissionStatusFilter = ref<"all" | "submitted" | "under_review" | "changes_requested" | "approved" | "rejected" | "pending">("all")
const submissionArtworkFilter = ref("all")
const submissionMineOnly = ref(false)
const debouncedKeyword = ref("")
const selectedArtworkFileName = ref("")
const hoveredTenantArtworkId = ref("")
const hoveredTenantArtworkEntry = ref<ArtworkListItem | null>(null)
const hoveredTenantArtworkPlacement = ref<HoverOverlayClass>("hover-overlay--bottom-left")
const hoveredTenantArtworkStyle = ref<Record<string, string>>({})
const artworkPreviewFallbackById = ref<Record<string, boolean>>({})
let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null
const artworkCodeCheckState = ref<"idle" | "checking" | "available" | "blocked">("idle")
const artworkCodeHint = ref("")
const lastCheckedArtworkCode = ref("")
let artworkCodeCheckTimer: ReturnType<typeof setTimeout> | null = null
let artworkCodeCheckRequestToken = 0

const form = ref({
  artwork_code: "",
  name: "",
  description: "",
  mime_type: "image/png",
  file_ext: "png",
  category_id: "",
  preview_url: "",
  original_url: "",
  creator_name: "",
  license_name: "",
  license_url: "",
  attribution_required: false,
  width: 1200,
  height: 1200,
  source_provider: props.scope === "platform" ? "manual" : "tenant_upload",
  source_asset_id: "",
  source_url: "",
  commerce_type: "free" as "free" | "paid",
  price_tokens: 0,
  access_scope: "private" as "public" | "private",
  api_status: "disabled" as "enabled" | "disabled",
  visibility_status: "draft" as "draft" | "listed" | "disabled",
  status: "active",
})

const categories = computed<ArtworkCategoryNode[]>(() => (
  props.scope === "platform" ? artworkStore.platformCategories : artworkStore.tenantCategories
))
const items = computed<ArtworkListItem[]>(() => (
  props.scope === "platform" ? artworkStore.platformItems : artworkStore.tenantItems
))
const total = computed(() => (
  props.scope === "platform" ? artworkStore.platformTotal : artworkStore.tenantTotal
))
const summary = computed<ArtworkLibrarySummary | null>(() => (
  props.scope === "platform" ? artworkStore.platformSummary : artworkStore.tenantSummary
))
const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / pageSize)))
const isPlatformMode = computed(() => props.scope === "platform")
const isTenantMode = computed(() => props.scope === "tenant")
const tenantContext = computed(() => readAdminTenantContext(route.query))
const scopedTenantId = computed(() => (
  isTenantMode.value
    ? (authStore.isPlatformAdmin ? (tenantContext.value.tenantId || "") : (authStore.tenant?.tenant_id || ""))
    : ""
))
const requiresScopedTenantSelection = computed(() => isTenantMode.value && authStore.isPlatformAdmin && !scopedTenantId.value)
const categoryOptions = computed(() => flattenCategories(categories.value))
const tenantWorkspaceTitle = computed(() => text("Artwork Workspace", "素材工作台"))
const tenantWorkspaceDescription = computed(() => text("Upload artwork, manage listing state, and track review progress.", "上传素材、管理上架状态，并跟踪审核进度。"))
const totalArtworkCount = computed(() => summary.value?.total_count ?? total.value)
const activeCount = computed(() => summary.value?.active_count ?? items.value.filter((item) => item.status === "active").length)
const disabledCount = computed(() => summary.value?.disabled_count ?? items.value.filter((item) => item.status !== "active").length)
const listedCount = computed(() => summary.value?.listed_count ?? items.value.filter((item) => item.visibility_status === "listed").length)
const draftCount = computed(() => summary.value?.draft_count ?? 0)
const hiddenCount = computed(() => summary.value?.hidden_count ?? 0)
const paidCount = computed(() => summary.value?.paid_count ?? items.value.filter((item) => item.commerce_type === "paid").length)
const freeCount = computed(() => summary.value?.free_count ?? items.value.filter((item) => item.commerce_type !== "paid").length)
const purchaseCount = computed(() => summary.value?.purchase_count ?? 0)
const licenseCount = computed(() => summary.value?.license_count ?? 0)
const pendingReviewCount = computed(() => summary.value?.pending_review_count ?? 0)
const approvedCount = computed(() => summary.value?.approved_count ?? 0)
const rejectedCount = computed(() => summary.value?.rejected_count ?? 0)
const uploadReadyCount = computed(() => items.value.filter((item) => item.preview_url && item.original_url).length)
const uniqueCategoryCount = computed(() => new Set(
  items.value
    .map((item) => item.category_path || item.category_id || "")
    .filter(Boolean),
).size)
const tenantTopCategories = computed(() => {
  const counts = new Map<string, number>()
  for (const item of items.value) {
    const label = item.category_path || item.category_id || text("Uncategorized", "未分类")
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }))
})
const tenantTopCategorySummary = computed(() => {
  if (!tenantTopCategories.value.length) return text("No category coverage on this page yet.", "当前页还没有分类覆盖数据。")
  return tenantTopCategories.value.map((item) => `${item.label} (${item.count})`).join(" · ")
})
const artworkCatalogEmptyState = computed(() => {
  if (requiresScopedTenantSelection.value) {
    return {
      title: text("Select a tenant from Tenant Management first.", "请先在租户管理中选择租户。"),
      description: text("Open Tenant Management, pick a tenant, then reopen this workspace with tenant context to manage their artwork library.", "先打开租户管理并选择租户，再带着租户上下文重新进入此工作台管理其素材库。"),
    }
  }
  if (keyword.value.trim() || categoryId.value !== "all" || statusFilter.value !== "all") {
    return {
      title: text("No artwork matches the current filters.", "没有素材符合当前筛选条件。"),
      description: text("Try a broader keyword, switch status, or clear the category filter.", "可尝试更宽泛的关键词、切换状态，或清除分类筛选。"),
    }
  }
  return {
    title: text("Start your tenant artwork library.", "开始搭建你的租户素材库。"),
    description: text("Upload your first artwork, list it for creative space use, then submit it to platform review when ready.", "先上传第一张素材并上架到创作空间，准备好后再提交到平台审核。"),
  }
})
const importManifestHash = computed(() => (
  importPreviewItems.value.length ? hashImportManifest(importPreviewItems.value) : ""
))
const importStorageKey = computed(() => (
  importManifestHash.value ? buildArtworkImportStorageKey(props.scope, importManifestHash.value) : ""
))
const importPendingItems = computed<ArtworkImportItem[]>(() => (
  dedupeImportItems(importPreviewItems.value, items.value, importCheckpoint.value?.processed_keys || []).items
))
const importPreviewStats = computed<ArtworkImportPreviewStats>(() => (
  buildImportPreviewStats(importPreviewItems.value, items.value, importCheckpoint.value?.processed_keys || [], importBatchSize.value)
))
const tenantSaveDisabled = computed(() => (
  saving.value
  || uploading.value
  || artworkCodeCheckState.value === "checking"
  || artworkCodeCheckState.value === "blocked"
  || !form.value.name.trim()
  || !form.value.category_id
  || !form.value.preview_url
  || !form.value.original_url
))
const platformSaveDisabled = computed(() => (
  saving.value
  || uploading.value
  || artworkCodeCheckState.value === "checking"
  || artworkCodeCheckState.value === "blocked"
))
const tenantUploadSummary = computed(() => {
  if (!form.value.preview_url || !form.value.original_url) return ""
  const detailParts = [
    selectedArtworkFileName.value,
    form.value.file_ext ? form.value.file_ext.toUpperCase() : "",
    form.value.width && form.value.height ? `${form.value.width} x ${form.value.height}` : "",
  ].filter(Boolean)
  return detailParts.join(" · ")
})
const tenantDisplayedPaidCount = computed(() => items.value.filter((item) => item.commerce_type === "paid").length)
const tenantDisplayedFreeCount = computed(() => items.value.filter((item) => item.commerce_type !== "paid").length)
const sortedSubmissions = computed(() => [...submissions.value].sort(sortSubmissionsNewestFirst))
const pendingSubmissions = computed(() => sortedSubmissions.value.filter((item) => {
  const status = normalizeArtworkSubmissionStatus(item.status)
  return ["submitted", "under_review"].includes(status)
}))
const reviewedSubmissions = computed(() => sortedSubmissions.value.filter((item) => {
  const status = normalizeArtworkSubmissionStatus(item.status)
  return !["submitted", "under_review"].includes(status)
}))
const submissionArtworkOptions = computed(() => {
  const seen = new Set<string>()
  return sortedSubmissions.value
    .map((item) => ({
      value: item.artwork_id || "",
      label: `${resolveSubmissionTitle(item)} · ${resolveSubmissionCode(item)}`,
    }))
    .filter((option) => {
      if (!option.value || seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
})
const statusFilterOptions = computed(() => ([
  { value: "all", label: text("Status: All", "状态：全部") },
  { value: "active", label: text("Status: Active", "状态：启用") },
  { value: "disabled", label: text("Status: Disabled", "状态：禁用") },
]))
const submissionStatusOptions = computed(() => ([
  { value: "all", label: text("All Statuses", "全部状态") },
  { value: "submitted", label: text("Submitted", "已提交") },
  { value: "under_review", label: text("Under Review", "审核中") },
  { value: "changes_requested", label: text("Changes Requested", "要求修改") },
  { value: "approved", label: text("Approved", "已通过") },
  { value: "rejected", label: text("Rejected", "已拒绝") },
]))
const reviewDialogDetails = computed(() => (
  reviewDialogSubmissionId.value ? [text("Submission ID", "提交流水号") + `: ${reviewDialogSubmissionId.value}`] : []
))
const deleteDialogLoadingText = computed(() => text("Deleting...", "删除中..."))
const deleteDialogTitle = computed(() => text("Delete Artwork", "删除素材"))
const deleteDialogMessage = computed(() => {
  if (!deleteDialogItem.value) {
    return text("Delete this artwork? This action cannot be undone.", "删除该素材？删除后无法恢复。")
  }
  return text(
    `Delete artwork "${deleteDialogItem.value.name}"? This action cannot be undone.`,
    `删除素材“${deleteDialogItem.value.name}”？删除后无法恢复。`,
  )
})
const deleteDialogDetails = computed(() => [])
const deleteDialogConfirmText = computed(() => text("Delete", "删除"))
const tenantModalFormError = computed(() => isTenantMode.value && tenantModalOpen.value ? error.value : "")
const artworkCodeAutoMode = ref(true)

function syncPriceTokens(commerceType: "free" | "paid") {
  if (commerceType === "free") {
    form.value.price_tokens = 0
    return
  }
  if (!form.value.price_tokens || form.value.price_tokens < 1) {
    form.value.price_tokens = 1
  }
}

function buildArtworkCodeSuggestion(value: string) {
  const normalized = value
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
  return normalized.slice(0, 64)
}

function normalizeArtworkCodeForComparison(value: string) {
  return value.trim().toUpperCase()
}

function isArtworkCodeFormatValid(value: string) {
  return /^[A-Za-z0-9-]{2,64}$/.test(value.trim())
}

function artworkCodeGuidanceText() {
  return text(
    "Use 2-64 letters, numbers, or hyphens. Pure digits like 11 are also allowed.",
    "请使用 2-64 位字母、数字或短横线，纯数字如 11 也允许。",
  )
}

function artworkCodeInvalidText() {
  return text(
    "Artwork Code must use 2-64 letters, numbers, or hyphens. Pure digits like 11 are also allowed.",
    "素材编码需使用 2-64 位字母、数字或短横线，纯数字如 11 也同样允许。",
  )
}

function artworkCodeCheckingText() {
  return text("Checking Artwork Code...", "正在检查素材编码...")
}

function artworkCodeAvailableText(result?: ArtworkCodeCheckResult) {
  if (result?.state === "recoverable_deleted") {
    return text(
      "This Artwork Code belongs to a deleted artwork. Saving now will restore that existing artwork record.",
      "该素材编码对应一个已删除素材；现在保存会恢复这条已有素材记录。",
    )
  }
  return text("Artwork Code is available.", "素材编码可用。")
}

function artworkCodeConflictText() {
  return text(
    "Artwork Code already exists in this workspace. Please change it before creating the artwork.",
    "该素材编码在当前工作区已存在，请先修改后再创建素材。",
  )
}

function artworkCodeCheckFallbackText() {
  return text(
    "Unable to verify Artwork Code right now. The server will check it again when you save.",
    "暂时无法校验素材编码，保存时服务端会再次校验。",
  )
}

function clearArtworkCodeCheckTimer() {
  if (artworkCodeCheckTimer) {
    clearTimeout(artworkCodeCheckTimer)
    artworkCodeCheckTimer = null
  }
}

function resetArtworkCodeCheck() {
  clearArtworkCodeCheckTimer()
  artworkCodeCheckState.value = "idle"
  artworkCodeHint.value = ""
  lastCheckedArtworkCode.value = ""
}

function syncTenantArtworkCode(force = false) {
  if (!isTenantMode.value) return
  if (!force && (!artworkCodeAutoMode.value || editingId.value)) return
  const suggestion = buildArtworkCodeSuggestion(form.value.name || selectedArtworkFileName.value.replace(/\.[^.]+$/, ""))
  form.value.artwork_code = suggestion
}

function handleArtworkCodeInput() {
  if (!isTenantMode.value) return
  artworkCodeAutoMode.value = false
  form.value.artwork_code = buildArtworkCodeSuggestion(form.value.artwork_code)
}

async function handleArtworkCodeBlur() {
  await ensureArtworkCodeReady()
}

async function ensureArtworkCodeReady() {
  const artworkCode = form.value.artwork_code.trim()
  const normalizedArtworkCode = normalizeArtworkCodeForComparison(artworkCode)
  if (!artworkCode) {
    resetArtworkCodeCheck()
    return true
  }
  if (!isArtworkCodeFormatValid(artworkCode)) {
    lastCheckedArtworkCode.value = normalizedArtworkCode
    artworkCodeCheckState.value = "blocked"
    artworkCodeHint.value = artworkCodeInvalidText()
    return false
  }
  if (normalizedArtworkCode === lastCheckedArtworkCode.value) {
    if (artworkCodeCheckState.value === "available") return true
    if (artworkCodeCheckState.value === "blocked") return false
  }
  clearArtworkCodeCheckTimer()
  const requestToken = ++artworkCodeCheckRequestToken
  artworkCodeCheckState.value = "checking"
  artworkCodeHint.value = artworkCodeCheckingText()
  try {
    const result = await artworkStore.checkArtworkCode(
      props.scope,
      artworkCode,
      editingId.value || undefined,
      scopedTenantId.value || undefined,
    )
    if (requestToken !== artworkCodeCheckRequestToken) {
      return false
    }
    lastCheckedArtworkCode.value = normalizeArtworkCodeForComparison(result.artwork_code || artworkCode)
    if (result.available) {
      artworkCodeCheckState.value = "available"
      artworkCodeHint.value = artworkCodeAvailableText(result)
      return true
    }
    artworkCodeCheckState.value = "blocked"
    artworkCodeHint.value = result.message?.includes("artwork code already exists")
      ? artworkCodeConflictText()
      : (result.message || artworkCodeConflictText())
    return false
  } catch (err) {
    if (requestToken !== artworkCodeCheckRequestToken) {
      return false
    }
    const message = resolveApiErrorMessage(err)
    if (message.includes("artwork_code must use")) {
      lastCheckedArtworkCode.value = normalizedArtworkCode
      artworkCodeCheckState.value = "blocked"
      artworkCodeHint.value = artworkCodeInvalidText()
      return false
    }
    artworkCodeCheckState.value = "idle"
    artworkCodeHint.value = artworkCodeCheckFallbackText()
    lastCheckedArtworkCode.value = ""
    return true
  }
}

function resolveArtworkFormErrorMessage(err: unknown) {
  const message = resolveApiErrorMessage(err)
  if (message.includes("artwork_code must use")) {
    return text(
      "Artwork Code must use 2-64 letters, numbers, or hyphens. Pure digits like 11 are also allowed.",
      "素材编码需使用 2-64 位字母、数字或短横线，纯数字如 11 也同样允许。",
    )
  }
  if (message.includes("artwork code already exists in your workspace")) {
    return artworkCodeConflictText()
  }
  if (message.includes("tenant not found")) {
    return text(
      "The selected tenant workspace could not be found. Please reopen the tenant page from the tenant list and try again.",
      "当前选择的租户工作区不存在。请先从租户列表重新进入该租户页面，再重试创建素材。",
    )
  }
  if (message.includes("Conversion = ''")) {
    return text(
      "Some required numeric fields are still empty. Please reselect the artwork category, keep the generated code, and try again.",
      "有必填的数字字段仍然是空值。请重新选择素材分类，保留系统生成的 Artwork Code，然后再试一次。",
    )
  }
  return message
}

function resetForm() {
  editingId.value = ""
  selectedArtworkFileName.value = ""
  artworkCodeAutoMode.value = true
  resetArtworkCodeCheck()
  form.value = {
    artwork_code: "",
    name: "",
    description: "",
    mime_type: "image/png",
    file_ext: "png",
    category_id: "",
    preview_url: "",
    original_url: "",
    creator_name: "",
    license_name: "",
    license_url: "",
    attribution_required: false,
    width: 1200,
    height: 1200,
    source_provider: props.scope === "platform" ? "manual" : "tenant_upload",
    source_asset_id: "",
    source_url: "",
    commerce_type: "free",
    price_tokens: 0,
    access_scope: "private",
    api_status: "disabled",
    visibility_status: "draft",
    status: "active",
  }
}

function openTenantCreateModal() {
  editingId.value = ""
  resetForm()
  error.value = ""
  notice.value = ""
  tenantModalOpen.value = true
}

function closeTenantModal() {
  if (saving.value || uploading.value) return
  tenantModalOpen.value = false
  editingId.value = ""
  error.value = ""
  notice.value = ""
  resetForm()
}

function findCategoryPath(categoryIdValue: string, nodes: ArtworkCategoryNode[]): string {
  for (const node of nodes) {
    if (node.category_id === categoryIdValue) return node.name
    if (node.children?.length) {
      const suffix = findCategoryPath(categoryIdValue, node.children)
      if (suffix) return `${node.name} / ${suffix}`
    }
  }
  return ""
}

function flattenCategories(nodes: ArtworkCategoryNode[], prefix = ""): Array<{ value: string; label: string }> {
  const result: Array<{ value: string; label: string }> = []
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.name}` : node.name
    result.push({ value: node.category_id, label })
    if (node.children?.length) {
      result.push(...flattenCategories(node.children, label))
    }
  }
  return result
}

function applyMimePreset(value: string) {
  form.value.mime_type = value
  const matched = mimeOptions.find((option) => option.value === value)
  if (matched) {
    form.value.file_ext = matched.ext
  }
}

function formatUpdatedAt(value?: string) {
  if (!value) return text("Unknown", "未知")
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(isZh.value ? "zh-CN" : "en-US")
}

function submissionSortValue(item: ArtworkSubmissionSummary) {
  return item.reviewed_at || item.updated_at || item.created_at || ""
}

function sortSubmissionsNewestFirst(left: ArtworkSubmissionSummary, right: ArtworkSubmissionSummary) {
  const leftTime = new Date(submissionSortValue(left)).getTime()
  const rightTime = new Date(submissionSortValue(right)).getTime()
  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0
  if (Number.isNaN(leftTime)) return 1
  if (Number.isNaN(rightTime)) return -1
  return rightTime - leftTime
}

function formatSubmissionStatus(value?: ArtworkSubmissionSummary["status"]) {
  const status = normalizeArtworkSubmissionStatus(value)
  if (status === "submitted") return text("Submitted", "已提交")
  if (status === "under_review") return text("Under Review", "审核中")
  if (status === "changes_requested") return text("Changes Requested", "要求修改")
  if (status === "approved") return text("Approved", "已通过")
  if (status === "rejected") return text("Rejected", "已拒绝")
  return text("Submitted", "已提交")
}

function submissionStatusClass(value?: ArtworkSubmissionSummary["status"]) {
  const status = normalizeArtworkSubmissionStatus(value)
  if (status === "submitted" || status === "under_review") return "status-pending"
  if (status === "changes_requested") return "status-rejected"
  if (status === "approved") return "status-approved"
  if (status === "rejected") return "status-rejected"
  return "status-pending"
}

function resolveSubmissionTitle(item: ArtworkSubmissionSummary) {
  return item.artwork_name || item.title || text("Untitled artwork", "未命名素材")
}

function resolveSubmissionCode(item: ArtworkSubmissionSummary) {
  return item.artwork_code || item.platform_artwork_code || item.artwork_id || text("N/A", "无")
}

function formatHistoryAction(value?: string) {
  if (!value?.trim()) return "updated"
  return value
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function setItemPending(itemId: string, action: string) {
  pendingActionById.value = {
    ...pendingActionById.value,
    [itemId]: action,
  }
}

function clearItemPending(itemId: string) {
  const next = { ...pendingActionById.value }
  delete next[itemId]
  pendingActionById.value = next
}

function itemPendingAction(itemId: string) {
  return pendingActionById.value[itemId] || ""
}

function isItemPending(itemId: string) {
  return Boolean(itemPendingAction(itemId))
}

function buildArtworkUpdatePayload(item: ArtworkListItem, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    artwork_code: item.artwork_code || "",
    name: item.name,
    description: item.description || "",
    mime_type: item.mime_type || "image/png",
    file_ext: item.file_ext || "png",
    category_id: item.category_id || "",
    category_path: item.category_path || "",
    preview_url: item.preview_url || "",
    original_url: item.original_url || "",
    creator_name: item.creator_name || "",
    license_name: item.license_name || "",
    license_url: item.license_url || "",
    attribution_required: Boolean(item.attribution_required),
    width: item.width || 1200,
    height: item.height || 1200,
    source_provider: item.source_provider || (props.scope === "platform" ? "manual" : "tenant_upload"),
    source_asset_id: item.source_asset_id || "",
    source_url: item.source_url || "",
    commerce_type: item.commerce_type || "free",
    price_tokens: item.price_tokens || 0,
    access_scope: item.access_scope || "private",
    api_status: item.api_status || "disabled",
    visibility_status: item.visibility_status || "draft",
    status: item.status || "active",
    ...overrides,
  }
}

function itemActionLabel(item: ArtworkListItem) {
  const current = itemPendingAction(item.artwork_id)
  if (current === "toggle") return item.status === "active" ? text("Deactivating...", "正在停用...") : text("Restoring...", "正在恢复...")
  if (current === "submit") return text("Submitting...", "提交中...")
  if (current === "delete") return text("Deleting...", "移除中...")
  return item.status === "active" ? text("Deactivate", "停用") : text("Restore", "恢复")
}

function listingActionLabel(item: ArtworkListItem) {
  return item.visibility_status === "listed" ? text("Unlist", "取消上架") : text("List", "上架")
}

function listingStateLabel(item: ArtworkListItem) {
  if (item.visibility_status === "listed") return text("Listed", "已上架")
  if (item.status !== "active") return text("Inactive", "未启用")
  return text("Draft", "草稿")
}

function accessScopeLabel(value?: "public" | "private") {
  return value === "private" ? text("Private", "私有") : text("Public", "公开")
}

function accessScopeClass(value?: "public" | "private") {
  return value === "private" ? "private" : "public"
}

function apiStatusLabel(item: ArtworkListItem) {
  if (item.api_status === "enabled") return text("API Enabled", "API 已启用")
  return text("API Disabled", "API 未启用")
}

function canToggleApi(item: ArtworkListItem) {
  return item.visibility_status === "listed" || item.api_status === "enabled"
}

function apiActionLabel(item: ArtworkListItem) {
  const current = itemPendingAction(item.artwork_id)
  if (current === "api") return item.api_status === "enabled" ? text("Disabling API...", "关闭 API 中...") : text("Enabling API...", "启用 API 中...")
  if (item.api_status === "enabled") return text("Disable API", "关闭 API")
  if (canToggleApi(item)) return text("Enable API", "启用 API")
  return text("List Before API", "请先上架")
}

function submitActionLabel(item: ArtworkListItem) {
  const reviewStatus = normalizeArtworkSubmissionStatus(item.review_status)
  if (itemPendingAction(item.artwork_id) === "submit") return text("Submitting...", "提交中...")
  if (reviewStatus === "submitted") return text("Submitted", "已提交")
  if (reviewStatus === "under_review") return text("Under Review", "审核中")
  if (reviewStatus === "changes_requested") return text("Resubmit", "重新提交")
  if (reviewStatus === "approved") return text("Approved", "已通过")
  if (reviewStatus === "rejected") return text("Resubmit", "重新提交")
  if (item.visibility_status !== "listed") return text("List Before Submit", "请先上架再提交")
  if (item.access_scope === "private") return text("Public Only For Review", "公开后才可提审")
  return text("Submit", "提交审核")
}

function canSubmitItem(item: ArtworkListItem) {
  const reviewStatus = normalizeArtworkSubmissionStatus(item.review_status)
  if (isItemPending(item.artwork_id)) return false
  if (["submitted", "under_review", "approved"].includes(reviewStatus)) return false
  return item.visibility_status === "listed" && item.status === "active" && item.access_scope !== "private"
}

function resetListingDialog() {
  listingDialogOpen.value = false
  listingDialogItem.value = null
  listingDialogChoiceValue.value = "private"
  listingDialogMode.value = "list"
  listingDialogError.value = ""
}

function openListingDialog(item: ArtworkListItem) {
  listingDialogItem.value = item
  listingDialogMode.value = item.visibility_status === "listed" ? "unlist" : "list"
  listingDialogChoiceValue.value = item.access_scope === "private"
    ? "private"
    : "public"
  listingDialogError.value = ""
  listingDialogOpen.value = true
}

function openPermissionDialog(item: ArtworkListItem) {
  listingDialogItem.value = item
  listingDialogMode.value = "permission"
  listingDialogChoiceValue.value = item.visibility_status === "listed" && item.access_scope === "public" ? "public" : "private"
  listingDialogError.value = ""
  listingDialogOpen.value = true
}

function resetReviewDialog() {
  reviewDialogOpen.value = false
  reviewDialogSubmissionId.value = ""
  reviewDialogAction.value = "approved"
  reviewDialogNote.value = ""
  reviewDialogError.value = ""
}

function openReviewDialog(submissionId: string, action: "start_review" | "changes_requested" | "approved" | "rejected") {
  reviewDialogSubmissionId.value = submissionId
  reviewDialogAction.value = action
  reviewDialogNote.value = ""
  reviewDialogError.value = ""
  reviewDialogOpen.value = true
}

function resetDeleteDialog() {
  deleteDialogOpen.value = false
  deleteDialogItem.value = null
  deleteDialogPreview.value = null
  deleteDialogMode.value = "soft_delete"
  deleteDialogError.value = ""
}

function resolveDeleteMode(preview: ArtworkDeletionPreviewResponse): DeletionPreviewMode {
  return preview.recommended_mode || "soft_delete"
}

async function openDeleteDialog(item: ArtworkListItem) {
  deleteDialogError.value = ""
  try {
    const preview = props.scope === "platform"
      ? await artworkStore.previewPlatformArtworkDeletion(item.artwork_id)
      : await artworkStore.previewTenantArtworkDeletion(item.artwork_id, scopedTenantId.value || undefined)
    deleteDialogItem.value = item
    deleteDialogPreview.value = preview
    deleteDialogMode.value = resolveDeleteMode(preview)
    deleteDialogOpen.value = true
  } catch (err) {
    const message = resolveApiErrorMessage(err)
    deleteDialogItem.value = item
    deleteDialogPreview.value = null
    deleteDialogMode.value = "soft_delete"
    deleteDialogOpen.value = true
    notice.value = text(
      "Deletion preview is unavailable. Continuing with the standard delete flow.",
      "暂时无法获取删除预览，已切换为标准删除流程。",
    )
    error.value = ""
    deleteDialogError.value = message
  }
}

function resetClearDialog() {
  clearDialogOpen.value = false
  clearDialogError.value = ""
}

function openClearDialog() {
  clearDialogError.value = ""
  clearDialogOpen.value = true
}

function formatDimensions(item: ArtworkListItem) {
  if (!item.width || !item.height) return text("Size N/A", "尺寸未知")
  return `${item.width} x ${item.height}`
}

function priceLabel(item: ArtworkListItem) {
  return item.commerce_type === "paid"
    ? text(`${item.price_tokens || 0} tokens`, `${item.price_tokens || 0} Tokens`)
    : text("Free", "免费")
}

function formatReviewState(value?: string) {
  const status = normalizeArtworkSubmissionStatus(value)
  if (status === "approved") return text("Approved", "已通过")
  if (status === "submitted") return text("Submitted", "已提交")
  if (status === "under_review") return text("Under Review", "审核中")
  if (status === "changes_requested") return text("Changes Requested", "要求修改")
  if (status === "rejected") return text("Rejected", "已拒绝")
  return text("Not Submitted", "未提交")
}

function deriveFileExtFromMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  if (mimeType === "image/svg+xml") return "svg"
  return ""
}

function resolveArtworkCode(item: Pick<ArtworkListItem, "artwork_code" | "artwork_id" | "source_asset_id">) {
  return item.artwork_code || item.artwork_id || item.source_asset_id || "N/A"
}

function appendArtworkVersion(url: string, version: string) {
  if (!url || !version) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${encodeURIComponent(version)}`
}

function resolveArtworkVersionToken(item: Pick<ArtworkListItem, "updated_at" | "artwork_id">) {
  const normalizedUpdatedAt = String(item.updated_at || "").trim()
  if (normalizedUpdatedAt) return normalizedUpdatedAt
  return String(item.artwork_id || "").trim()
}

function resolveArtworkAssetUrl(
  item: Pick<ArtworkListItem, "updated_at" | "artwork_id">,
  source: string,
) {
  const resolvedSource = resolveRuntimeAssetUrl(source)
  return appendArtworkVersion(resolvedSource, resolveArtworkVersionToken(item))
}

function resolveArtworkPreviewUrl(item: Pick<ArtworkListItem, "artwork_id" | "preview_url" | "original_url" | "updated_at">) {
  const useOriginal = artworkPreviewFallbackById.value[item.artwork_id]
  const source = useOriginal
    ? (item.original_url || item.preview_url || "")
    : (item.preview_url || item.original_url || "")
  return resolveArtworkAssetUrl(item, source)
}

function handleArtworkPreviewError(item: Pick<ArtworkListItem, "artwork_id" | "preview_url" | "original_url">) {
  if (!item.artwork_id || !item.original_url || item.original_url === item.preview_url) return
  if (artworkPreviewFallbackById.value[item.artwork_id]) return
  artworkPreviewFallbackById.value = {
    ...artworkPreviewFallbackById.value,
    [item.artwork_id]: true,
  }
}

function resolveHoverOverlay(event: Event): {
  placement: HoverOverlayClass
  style: Record<string, string>
} {
  return computeFloatingHoverOverlay(event, {
    defaultPlacement: "hover-overlay--bottom-left",
    overlayWidth: 280,
    overlayHeight: 520,
    minOverlayWidth: 180,
    minOverlayHeight: 220,
    viewportPadding: 12,
    topSafePadding: 12,
    gap: 10,
  })
}

function setHoveredTenantArtwork(item: ArtworkListItem, event: Event) {
  const overlay = resolveHoverOverlay(event)
  hoveredTenantArtworkId.value = item.artwork_id
  hoveredTenantArtworkEntry.value = item
  hoveredTenantArtworkPlacement.value = overlay.placement
  hoveredTenantArtworkStyle.value = overlay.style
}

function clearHoveredTenantArtwork() {
  hoveredTenantArtworkId.value = ""
  hoveredTenantArtworkEntry.value = null
  hoveredTenantArtworkPlacement.value = "hover-overlay--bottom-left"
  hoveredTenantArtworkStyle.value = {}
}

function clearImportManifest() {
  clearStoredImportCheckpoint()
  importJsonText.value = ""
  importFileName.value = ""
  importPreviewItems.value = []
  importMessages.value = []
}

function readImportStorage() {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function syncImportCheckpointFromStorage() {
  if (!isPlatformMode.value || !importManifestHash.value || !importStorageKey.value) {
    importCheckpoint.value = null
    return
  }
  const storage = readImportStorage()
  importCheckpoint.value = parseArtworkImportCheckpoint(
    storage?.getItem(importStorageKey.value) || null,
    importManifestHash.value,
  )
}

function persistImportCheckpoint(checkpoint: ArtworkImportCheckpoint) {
  if (!importStorageKey.value) return
  importCheckpoint.value = checkpoint
  const storage = readImportStorage()
  storage?.setItem(importStorageKey.value, JSON.stringify(checkpoint))
}

function clearStoredImportCheckpoint() {
  const storage = readImportStorage()
  if (importStorageKey.value) {
    storage?.removeItem(importStorageKey.value)
  }
  importCheckpoint.value = null
}

function parseImportManifest() {
  error.value = ""
  notice.value = ""
  importMessages.value = []
  try {
    const parsed = JSON.parse(importJsonText.value)
    importPreviewItems.value = normalizeImportManifest(parsed)
    syncImportCheckpointFromStorage()
    notice.value = importCheckpoint.value
      ? text(
          `${importPreviewItems.value.length} curated items ready. Found resumable progress for ${importCheckpoint.value.completed_batches} completed batch(es).`,
          `已准备 ${importPreviewItems.value.length} 条精选素材，并发现可续传进度：已完成 ${importCheckpoint.value.completed_batches} 个批次。`,
        )
      : text(
          `${importPreviewItems.value.length} curated items ready for import.`,
          `已准备 ${importPreviewItems.value.length} 条精选素材，可开始导入。`,
        )
  } catch (err) {
    importPreviewItems.value = []
    importCheckpoint.value = null
    error.value = resolveApiErrorMessage(err)
  }
}

async function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return
  try {
    importFileName.value = file.name
    importJsonText.value = await file.text()
    parseImportManifest()
  } finally {
    if (input) {
      input.value = ""
    }
  }
}

async function runCuratedImport() {
  if (!isPlatformMode.value) return
  if (!importPreviewItems.value.length && importJsonText.value.trim()) {
    parseImportManifest()
  }
  if (!importPreviewItems.value.length) {
    error.value = text("Prepare a curated import manifest first.", "请先准备精选导入清单。")
    return
  }
  if (!importManifestHash.value) {
    error.value = text("Unable to compute an import checkpoint for the current manifest.", "无法为当前清单生成导入检查点。")
    return
  }
  if (!importPendingItems.value.length) {
    notice.value = text("Nothing pending. This manifest is already imported, deduplicated, or fully resumed.", "当前没有待处理项，此清单已导入、已去重，或已从检查点全部恢复完成。")
    return
  }
  importing.value = true
  error.value = ""
  notice.value = ""
  importMessages.value = importCheckpoint.value?.messages ? [...importCheckpoint.value.messages] : []
  try {
    const batches = splitImportIntoBatches(importPendingItems.value, importBatchSize.value)
    const checkpoint = importCheckpoint.value || {
      manifest_hash: importManifestHash.value,
      batch_size: importBatchSize.value,
      total_items: importPreviewItems.value.length,
      completed_batches: 0,
      created_count: 0,
      skipped_count: 0,
      failed_count: 0,
      processed_keys: [],
      messages: [],
      updated_at: "",
    }
    const startingCompletedBatches = checkpoint.completed_batches
    const totalBatchCount = startingCompletedBatches + batches.length

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]
      const result = await artworkStore.importPlatformArtwork(batch)
      const batchLabel = `Batch ${startingCompletedBatches + index + 1}/${totalBatchCount}`
      importMessages.value = normalizeCheckpointMessages([
        ...importMessages.value,
        ...((result.messages || []).length
          ? result.messages
          : [text(
              `${batchLabel}: created ${result.created_count}, skipped ${result.skipped_count}.`,
              `${batchLabel}：已创建 ${result.created_count} 条，已跳过 ${result.skipped_count} 条。`,
            )]),
      ])

      if (result.failed_count > 0) {
        checkpoint.failed_count += result.failed_count
        checkpoint.messages = normalizeCheckpointMessages(importMessages.value)
        checkpoint.updated_at = new Date().toISOString()
        persistImportCheckpoint(checkpoint)
        notice.value = text(
          `${batchLabel} returned ${result.failed_count} failed item(s). Fix the manifest and resume from the saved checkpoint.`,
          `${batchLabel} 返回 ${result.failed_count} 条失败记录。请修复清单后从已保存检查点继续。`,
        )
        return
      }

      checkpoint.created_count += result.created_count
      checkpoint.skipped_count += result.skipped_count
      checkpoint.batch_size = importBatchSize.value
      checkpoint.completed_batches += 1
      checkpoint.processed_keys = [...new Set([
        ...checkpoint.processed_keys,
        ...batch.map((item) => buildImportSourceKey(item)).filter(Boolean),
      ])]
      checkpoint.messages = normalizeCheckpointMessages(importMessages.value)
      checkpoint.updated_at = new Date().toISOString()
      persistImportCheckpoint(checkpoint)
    }

    notice.value = text(
      `Import finished. Created ${checkpoint.created_count}, skipped ${checkpoint.skipped_count}, failed ${checkpoint.failed_count}.`,
      `导入完成。已创建 ${checkpoint.created_count} 条，已跳过 ${checkpoint.skipped_count} 条，失败 ${checkpoint.failed_count} 条。`,
    )
    await loadItems()
    await loadSummary()
    clearStoredImportCheckpoint()
  } catch (err) {
    error.value = resolveApiErrorMessage(err)
  } finally {
    importing.value = false
  }
}

function resetImportProgress() {
  clearStoredImportCheckpoint()
  importMessages.value = []
  notice.value = text("Import checkpoint cleared. The current manifest will start from the first pending batch.", "导入检查点已清除，当前清单将从第一个待处理批次重新开始。")
}

function readImageDimensions(file: File) {
  return new Promise<{ width?: number; height?: number }>((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({})
      return
    }
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({})
    image.src = URL.createObjectURL(file)
  })
}

async function handleArtworkFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return
  selectedArtworkFileName.value = file.name
  uploading.value = true
  try {
    const [uploadResult, dimensions] = await Promise.all([
      artworkStore.uploadArtworkFile(props.scope, file, scopedTenantId.value || undefined),
      readImageDimensions(file),
    ])
    form.value.preview_url = uploadResult.preview_url
    form.value.original_url = uploadResult.original_url
    form.value.mime_type = uploadResult.mime_type || file.type || form.value.mime_type
    form.value.file_ext = uploadResult.file_ext || deriveFileExtFromMime(file.type) || form.value.file_ext
    form.value.width = dimensions.width || form.value.width
    form.value.height = dimensions.height || form.value.height
    if (!form.value.name.trim()) {
      form.value.name = file.name.replace(/\.[^.]+$/, "")
    }
    if (artworkCodeAutoMode.value) {
      syncTenantArtworkCode(true)
    }
    notice.value = text("Artwork file uploaded and linked to the form.", "素材文件已上传并已绑定到表单。")
  } catch (err) {
    error.value = resolveArtworkFormErrorMessage(err)
  } finally {
    uploading.value = false
    if (input) input.value = ""
  }
}

function editItem(item: ArtworkListItem) {
  editingId.value = item.artwork_id
  artworkCodeAutoMode.value = false
  resetArtworkCodeCheck()
  form.value = {
    artwork_code: item.artwork_code || "",
    name: item.name,
    description: item.description || "",
    mime_type: item.mime_type || "image/png",
    file_ext: item.file_ext || "png",
    category_id: item.category_id || "",
    preview_url: item.preview_url || "",
    original_url: item.original_url || "",
    creator_name: item.creator_name || "",
    license_name: item.license_name || "",
    license_url: item.license_url || "",
    attribution_required: Boolean(item.attribution_required),
    width: item.width || 1200,
    height: item.height || 1200,
    source_provider: item.source_provider || (props.scope === "platform" ? "manual" : "tenant_upload"),
    source_asset_id: item.source_asset_id || "",
    source_url: item.source_url || "",
    commerce_type: item.commerce_type || "free",
    price_tokens: item.price_tokens || 0,
    access_scope: item.access_scope || "private",
    api_status: item.api_status || "disabled",
    visibility_status: item.visibility_status || "draft",
    status: item.status || "active",
  }
  notice.value = ""
  error.value = ""
  if (isTenantMode.value) {
    tenantModalOpen.value = true
  }
}

async function loadItems() {
  if (requiresScopedTenantSelection.value) {
    if (props.scope === "tenant") {
      artworkStore.tenantItems = []
      artworkStore.tenantTotal = 0
    }
    return
  }
  await artworkStore.loadLibrary(props.scope, {
    keyword: debouncedKeyword.value,
    category_id: categoryId.value === "all" ? "" : categoryId.value,
    status: statusFilter.value,
    page: page.value,
    size: pageSize,
    include_disabled: statusFilter.value !== "active",
  }, scopedTenantId.value || undefined)
}

async function loadSubmissions() {
  if (isTenantMode.value) {
    submissions.value = []
    return
  }
  loadingSubmissions.value = true
  try {
    submissions.value = await artworkStore.listArtworkSubmissions({
      tenantId: submissionMineOnly.value && authStore.tenant?.tenant_id ? authStore.tenant.tenant_id : undefined,
      artworkId: submissionArtworkFilter.value === "all" ? undefined : submissionArtworkFilter.value,
      status: submissionStatusFilter.value === "all" ? undefined : submissionStatusFilter.value,
      limit: 100,
    })
  } finally {
    loadingSubmissions.value = false
  }
}

async function loadSummary() {
  if (requiresScopedTenantSelection.value) {
    if (props.scope === "tenant") {
      artworkStore.tenantSummary = null
    }
    return
  }
  await artworkStore.loadSummary(props.scope, scopedTenantId.value || undefined)
}

async function save() {
  if (requiresScopedTenantSelection.value) return
  saving.value = true
  error.value = ""
  notice.value = ""
  try {
    const artworkCodeReady = await ensureArtworkCodeReady()
    if (!artworkCodeReady) {
      error.value = artworkCodeHint.value || artworkCodeInvalidText()
      return
    }
    const payload = {
      ...form.value,
      artwork_code: form.value.artwork_code.trim(),
      category_id: form.value.category_id || "",
      category_path: form.value.category_id ? findCategoryPath(form.value.category_id, categories.value) : "",
      access_scope: form.value.visibility_status === "listed"
        ? form.value.access_scope
        : "private",
      api_status: form.value.api_status,
      ...(isTenantMode.value
        ? {
            status: "active",
            visibility_status: form.value.visibility_status === "listed" ? "listed" : "draft",
          }
        : {}),
    }
    if (editingId.value) {
      await artworkStore.updateArtwork(props.scope, editingId.value, payload, scopedTenantId.value || undefined)
      notice.value = text("Artwork updated.", "素材已更新。")
    } else {
      await artworkStore.createArtwork(props.scope, payload, scopedTenantId.value || undefined)
      notice.value = text("Artwork created. Next: list it first, then submit it for review.", "素材已创建。下一步请先上架，再提交审核。")
    }
    await loadItems()
    await loadSummary()
    if (isPlatformMode.value) {
      await loadSubmissions()
    }
    if (isTenantMode.value) {
      tenantModalOpen.value = false
    }
    resetForm()
  } catch (err) {
    const rawMessage = resolveApiErrorMessage(err)
    if (editingId.value && /artwork not found/i.test(rawMessage)) {
      editingId.value = ""
      error.value = text(
        "The artwork you were editing no longer exists. The form has switched back to upload mode. Review the current details, then click Create Artwork to save it as a new artwork.",
        "你刚才编辑的素材已不存在。表单已切回上传模式，请检查当前内容，然后点击“创建素材”重新保存。",
      )
      return
    }
    error.value = resolveArtworkFormErrorMessage(err)
  } finally {
    saving.value = false
  }
}

watch(() => form.value.name, () => {
  syncTenantArtworkCode()
})

watch(() => form.value.artwork_code, (value) => {
  clearArtworkCodeCheckTimer()
  const trimmed = value.trim()
  if (!trimmed) {
    resetArtworkCodeCheck()
    return
  }
  const normalized = normalizeArtworkCodeForComparison(trimmed)
  if (normalized !== lastCheckedArtworkCode.value) {
    artworkCodeCheckState.value = "idle"
    artworkCodeHint.value = artworkCodeGuidanceText()
  }
  if (!isArtworkCodeFormatValid(trimmed)) {
    artworkCodeCheckState.value = "blocked"
    artworkCodeHint.value = artworkCodeInvalidText()
    lastCheckedArtworkCode.value = normalized
    return
  }
  if (saving.value || uploading.value) return
  artworkCodeCheckTimer = setTimeout(() => {
    void ensureArtworkCodeReady()
  }, 450)
})

watch(() => tenantModalOpen.value, (isOpen) => {
  if (!isOpen) {
    resetArtworkCodeCheck()
    return
  }
  if (editingId.value) return
  error.value = ""
  notice.value = ""
  syncTenantArtworkCode(true)
})

async function toggleStatus(item: ArtworkListItem) {
  if (requiresScopedTenantSelection.value) return
  if (isItemPending(item.artwork_id)) return
  setItemPending(item.artwork_id, "toggle")
  error.value = ""
  notice.value = ""
  try {
    await artworkStore.toggleArtwork(props.scope, item.artwork_id, item.status === "active" ? "disable" : "enable", scopedTenantId.value || undefined)
    notice.value = item.status === "active"
      ? text("Artwork deactivated.", "素材已停用。")
      : text("Artwork restored.", "素材已恢复。")
    await loadItems()
    await loadSummary()
  } catch (err) {
    error.value = String((err as Error).message || err)
  } finally {
    clearItemPending(item.artwork_id)
  }
}

function toggleListing(item: ArtworkListItem) {
  if (requiresScopedTenantSelection.value) return
  if (isItemPending(item.artwork_id)) return
  openListingDialog(item)
}

async function confirmListingDialog() {
  const item = listingDialogItem.value
  if (!item) return
  if (requiresScopedTenantSelection.value) return
  if (isItemPending(item.artwork_id)) return
  const nextVisibility = listingDialogMode.value === "unlist"
    ? "draft"
    : listingDialogMode.value === "permission"
      ? (item.visibility_status || "draft")
      : "listed"
  const nextAccessScope = listingDialogMode.value === "unlist"
    ? "private"
    : listingDialogMode.value === "permission" && item.visibility_status !== "listed"
      ? "private"
      : listingDialogChoiceValue.value
  const nextApiStatus = listingDialogMode.value === "unlist"
    ? "disabled"
    : item.api_status || "disabled"
  setItemPending(item.artwork_id, "listing")
  error.value = ""
  notice.value = ""
  listingDialogError.value = ""
  try {
    await artworkStore.updateArtwork(props.scope, item.artwork_id, buildArtworkUpdatePayload(item, {
      status: "active",
      visibility_status: nextVisibility,
      access_scope: nextAccessScope,
      api_status: nextApiStatus,
    }), scopedTenantId.value || undefined)
    if (listingDialogMode.value === "permission") {
      notice.value = nextAccessScope === "public"
        ? text("Artwork permission updated to public.", "素材权限已更新为公开。")
        : text("Artwork permission updated to private.", "素材权限已更新为私有。")
    } else {
      notice.value = nextVisibility === "listed"
        ? text("Artwork listed. It can now be submitted to Artwork Center for review.", "素材已上架，现在可以提交到素材中心审核。")
        : text("Artwork moved back to draft and reset to private.", "素材已移回草稿，并重置为私有。")
    }
    await loadItems()
    await loadSummary()
    resetListingDialog()
  } catch (err) {
    const message = String((err as Error).message || err)
    error.value = message
    listingDialogError.value = message
  } finally {
    clearItemPending(item.artwork_id)
  }
}

async function toggleApiStatus(item: ArtworkListItem) {
  if (requiresScopedTenantSelection.value) return
  if (isItemPending(item.artwork_id)) return
  if (!canToggleApi(item)) {
    error.value = text("Please list the artwork before enabling API.", "请先上架素材，再启用 API。")
    return
  }
  setItemPending(item.artwork_id, "api")
  error.value = ""
  notice.value = ""
  try {
    const nextApiStatus = item.api_status === "enabled" ? "disabled" : "enabled"
    await artworkStore.updateArtwork(props.scope, item.artwork_id, buildArtworkUpdatePayload(item, {
      api_status: nextApiStatus,
    }), scopedTenantId.value || undefined)
    notice.value = nextApiStatus === "enabled"
      ? text("Artwork API enabled.", "素材 API 已启用。")
      : text("Artwork API disabled.", "素材 API 已关闭。")
    await loadItems()
    await loadSummary()
  } catch (err) {
    error.value = String((err as Error).message || err)
  } finally {
    clearItemPending(item.artwork_id)
  }
}

async function submitToPlatform(item: ArtworkListItem) {
  if (props.scope !== "tenant") return
  if (requiresScopedTenantSelection.value) return
  if (isItemPending(item.artwork_id)) return
  setItemPending(item.artwork_id, "submit")
  error.value = ""
  notice.value = ""
  try {
    await artworkStore.submitTenantArtwork(item.artwork_id, scopedTenantId.value || undefined)
    notice.value = text("Artwork submitted to Artwork Center for review.", "素材已提交到素材中心审核。")
    await loadItems()
    await loadSummary()
  } catch (err) {
    error.value = String((err as Error).message || err)
  } finally {
    clearItemPending(item.artwork_id)
  }
}

async function toggleSubmissionHistory(submissionId: string) {
  const next = !expandedHistory.value[submissionId]
  expandedHistory.value = {
    ...expandedHistory.value,
    [submissionId]: next,
  }
  if (!next || submissionHistory.value[submissionId]?.length) return
  loadingSubmissionHistoryId.value = submissionId
  try {
    await artworkStore.loadArtworkSubmissionHistory(submissionId)
  } catch (err) {
    error.value = resolveApiErrorMessage(err)
  } finally {
    loadingSubmissionHistoryId.value = ""
  }
}

async function reviewSubmission(
  submissionId: string,
  action: "start_review" | "changes_requested" | "approved" | "rejected",
  reviewNote = "",
) {
  reviewingSubmissionId.value = submissionId
  error.value = ""
  notice.value = ""
  reviewDialogError.value = ""
  try {
    await artworkStore.decideArtworkSubmission(submissionId, action, reviewNote)
    notice.value = action === "start_review"
      ? text("Submission moved to under review.", "提交已进入审核中。")
      : action === "changes_requested"
        ? text("Submission marked as changes requested.", "提交已标记为要求修改。")
        : action === "approved"
          ? text("Submission approved.", "提交已通过。")
          : text("Submission rejected.", "提交已拒绝。")
    await loadSubmissions()
    await loadItems()
    await loadSummary()
    resetReviewDialog()
  } catch (err) {
    const message = String((err as Error).message || err)
    error.value = message
    reviewDialogError.value = message
  } finally {
    reviewingSubmissionId.value = ""
  }
}

function canReviewAction(status?: string, decision?: "start_review" | "changes_requested" | "approved" | "rejected") {
  if (!decision) return false
  return canReviewSubmission(normalizeArtworkSubmissionStatus(status), decision)
}

function reviewActionLabel(action: "start_review" | "changes_requested" | "approved" | "rejected") {
  if (action === "start_review") return text("Start Review", "开始审核")
  if (action === "changes_requested") return text("Changes", "要求修改")
  if (action === "approved") return text("Approve", "通过")
  return text("Reject", "拒绝")
}

async function remove(item: ArtworkListItem, mode: DeletionPreviewMode = deleteDialogMode.value) {
  if (requiresScopedTenantSelection.value) return
  if (isItemPending(item.artwork_id)) return
  error.value = ""
  notice.value = ""
  deleteDialogError.value = ""
  setItemPending(item.artwork_id, "delete")
  try {
    if (props.scope === "platform") {
      await artworkStore.deletePlatformArtwork(item.artwork_id, mode)
    } else {
      await artworkStore.deleteTenantArtwork(item.artwork_id, scopedTenantId.value || undefined, mode)
    }
    notice.value = text("Deleted successfully.", "删除成功。")
    await loadItems()
    await loadSummary()
    if (isPlatformMode.value) {
      await loadSubmissions()
    }
    resetDeleteDialog()
  } catch (err) {
    const message = resolveApiErrorMessage(err)
    if (/not found/i.test(message)) {
      notice.value = text("Artwork was already removed.", "素材已被删除。")
      await loadItems()
      await loadSummary()
      if (isPlatformMode.value) {
        await loadSubmissions()
      }
      resetDeleteDialog()
      return
    }
    error.value = message
    deleteDialogError.value = message
  } finally {
    clearItemPending(item.artwork_id)
  }
}

async function clearPlatformLibrary() {
  if (!isPlatformMode.value) return
  error.value = ""
  notice.value = ""
  clearDialogError.value = ""
  try {
    await artworkStore.clearPlatformArtworkLibrary()
    resetForm()
    notice.value = text("Platform artwork library disabled and cleared from active listings.", "平台素材库已停用，并已从活动上架列表中清空。")
    await loadItems()
    await loadSummary()
    await loadSubmissions()
    resetClearDialog()
  } catch (err) {
    const message = String((err as Error).message || err)
    error.value = message
    clearDialogError.value = message
  }
}

function confirmReviewAction(note: string) {
  if (!reviewDialogSubmissionId.value) return
  void reviewSubmission(reviewDialogSubmissionId.value, reviewDialogAction.value, note)
}

function confirmDeleteAction() {
  if (!deleteDialogItem.value) return
  void remove(deleteDialogItem.value, deleteDialogMode.value)
}

function confirmClearAction() {
  void clearPlatformLibrary()
}

watch(totalPages, (value) => {
  page.value = Math.min(page.value, value)
})

watch(scopedTenantId, async () => {
  if (!isTenantMode.value) return
  page.value = 1
  await loadSummary()
  await loadItems()
})

watch(() => form.value.commerce_type, (value) => {
  syncPriceTokens(value)
})

watch(items, () => {
  artworkPreviewFallbackById.value = {}
}, { deep: true })

onBeforeUnmount(() => {
  clearArtworkCodeCheckTimer()
})

watch(
  () => [debouncedKeyword.value, categoryId.value, statusFilter.value, page.value] as const,
  async () => {
    await loadItems()
  },
)

watch(keyword, (value) => {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer)
  }
  keywordDebounceTimer = setTimeout(() => {
    debouncedKeyword.value = value
    page.value = 1
  }, 350)
}, { immediate: true })

watch(
  () => [submissionStatusFilter.value, submissionArtworkFilter.value, submissionMineOnly.value] as const,
  async () => {
    await loadSubmissions()
  },
)

onMounted(async () => {
  await artworkStore.loadCategories(props.scope)
  await loadSummary()
  await loadItems()
  if (isPlatformMode.value) {
    await loadSubmissions()
  }
})
</script>

<template>
  <div class="artwork-admin-page">
    <template v-if="isTenantMode">
      <article class="next-card tenant-hero-card">
        <div class="next-card-head repo-header tenant-hero-head">
          <div class="repo-header-copy tenant-hero-copy">
            <h3>{{ tenantWorkspaceTitle }}</h3>
            <p>{{ tenantWorkspaceDescription }}</p>
          </div>
          <div class="repo-header-actions tenant-hero-actions tenant-hero-actions--single">
            <button type="button" class="next-btn primary" @click="openTenantCreateModal">
              {{ text("Upload Artwork", "上传素材") }}
            </button>
          </div>
        </div>
        <div v-if="tenantContext.tenantId" class="context-banner">
          <strong>{{ text("Tenant Context", "租户上下文") }}</strong>
          <span>{{ tenantContext.tenantLabel || tenantContext.tenantId }}</span>
        </div>

        <div class="next-stats-grid tenant-analytics-grid">
          <div class="next-summary-card active">
            <span class="next-summary-label">{{ text("Total Artwork", "素材总数") }}</span>
            <strong>{{ totalArtworkCount }}</strong>
            <span class="next-summary-hint">{{ text(`${activeCount} active · ${disabledCount} disabled`, `${activeCount} 条启用 · ${disabledCount} 条停用`) }}</span>
          </div>
          <div class="next-summary-card">
            <span class="next-summary-label">{{ text("Listing Coverage", "上架覆盖") }}</span>
            <strong>{{ listedCount }}</strong>
            <span class="next-summary-hint">{{ text(`${draftCount} draft · ${hiddenCount} hidden`, `${draftCount} 草稿 · ${hiddenCount} 隐藏`) }}</span>
          </div>
          <div class="next-summary-card warning">
            <span class="next-summary-label">{{ text("Review Queue", "审核队列") }}</span>
            <strong>{{ pendingReviewCount }}</strong>
            <span class="next-summary-hint">{{ text(`${approvedCount} approved · ${rejectedCount} rejected`, `${approvedCount} 通过 · ${rejectedCount} 拒绝`) }}</span>
          </div>
          <div class="next-summary-card success">
            <span class="next-summary-label">{{ text("Commerce Mix", "销售组合") }}</span>
            <strong>{{ text(`${tenantDisplayedPaidCount} paid / ${tenantDisplayedFreeCount} free`, `${tenantDisplayedPaidCount} 付费 / ${tenantDisplayedFreeCount} 免费`) }}</strong>
            <span class="next-summary-hint">{{ text(`${purchaseCount} sales · ${licenseCount} licenses`, `${purchaseCount} 销量 · ${licenseCount} 授权`) }}</span>
          </div>
          <div class="next-summary-card success">
            <span class="next-summary-label">{{ text("Upload Ready", "可上传") }}</span>
            <strong>{{ uploadReadyCount }}</strong>
                <span class="next-summary-hint">{{ text(`${activeCount} active records`, `${activeCount} 条启用记录`) }}</span>
          </div>
          <div class="next-summary-card">
            <span class="next-summary-label">{{ text("Category Spread", "分类覆盖") }}</span>
            <strong>{{ uniqueCategoryCount }}</strong>
            <span class="next-summary-hint">{{ tenantTopCategorySummary }}</span>
          </div>
        </div>
      </article>

      <article class="next-card">
        <div class="next-card-head repo-header">
          <div class="repo-header-copy">
            <h3>{{ text("Artwork Library", "素材库") }}</h3>
            <p>{{ text("Browse tenant artwork, list it, then submit it to Artwork Center for review.", "浏览租户素材，先上架，再提交到素材中心审核。") }}</p>
          </div>
          <div class="repo-header-search">
            <input
              v-model="keyword"
              type="text"
              class="toolbar-input repo-search-input"
              :placeholder="text('Search artwork name, code, ID, creator, or description', '搜索素材名称、编码、ID、作者或描述')"
            />
          </div>
        </div>

        <div class="repo-toolbar">
          <div class="repo-toolbar-main repo-toolbar-main-single">
            <div class="repo-toolbar-filters tenant-toolbar-filters">
              <div class="repo-toolbar-category repo-toolbar-control">
                  <FilterDropdown
                    v-model="statusFilter"
                    :options="statusFilterOptions"
                  />
              </div>
            </div>
            <div class="repo-toolbar-category">
              <CategoryCascadeSelector
                :model-value="categoryId"
                :categories="categories"
                clear-value="all"
                :allow-non-leaf="true"
                :level1-placeholder="text('All Categories', '全部分类')"
                :level2-placeholder="text('Level 2', '二级分类')"
                :level3-placeholder="text('Level 3', '三级分类')"
                :helper-text="text('Filter by artwork category.', '按素材分类筛选。')"
                recent-storage-key="mockup-admin-artwork-categories"
                @update:model-value="categoryId = $event; page = 1"
              />
            </div>
          </div>
        </div>

        <div class="next-status error" v-if="error">{{ error }}</div>
        <div class="next-status success" v-else-if="notice">{{ notice }}</div>

        <div class="tenant-catalog-grid">
          <article v-for="item in items" :key="item.artwork_id" class="tenant-artwork-card">
            <div
              class="tenant-artwork-media"
              tabindex="0"
              @mouseenter="setHoveredTenantArtwork(item, $event)"
              @mouseleave="clearHoveredTenantArtwork"
              @focusin="setHoveredTenantArtwork(item, $event)"
              @focusout="clearHoveredTenantArtwork"
            >
              <div class="tenant-artwork-image-frame">
                <img
                  class="tenant-artwork-image"
                  :src="resolveArtworkPreviewUrl(item)"
                  :alt="item.name"
                  @error="handleArtworkPreviewError(item)"
                />
              </div>
              <div class="tenant-artwork-badges">
                <span class="status-badge" :class="{ muted: item.visibility_status !== 'listed' }">{{ listingStateLabel(item) }}</span>
                <span class="status-badge" :class="accessScopeClass(item.access_scope)">{{ accessScopeLabel(item.access_scope) }}</span>
                <span class="meta-chip neutral">{{ formatReviewState(item.review_status) }}</span>
              </div>
            </div>
            <div class="tenant-artwork-content">
              <div class="tenant-artwork-head">
                <div class="item-title-stack">
                  <strong>{{ item.name }}</strong>
                  <span class="item-code">{{ resolveArtworkCode(item) }}</span>
                </div>
              </div>
              <p class="item-description">{{ item.description || text("No description yet.", "暂无描述。") }}</p>

              <div class="item-meta">
                <span class="meta-chip">{{ item.category_path || text("Uncategorized", "未分类") }}</span>
                <span v-if="item.creator_name" class="meta-chip">{{ item.creator_name }}</span>
                <span class="meta-chip">{{ formatDimensions(item) }}</span>
                <span class="meta-chip">{{ priceLabel(item) }}</span>
              </div>
              <div class="item-meta secondary">
                <span class="meta-chip neutral">{{ apiStatusLabel(item) }}</span>
                <span class="meta-chip neutral">{{ item.file_ext.toUpperCase() }}</span>
                <span class="meta-chip neutral">{{ formatUpdatedAt(item.updated_at) }}</span>
              </div>

              <div class="tenant-card-actions">
                <button type="button" class="next-btn secondary small" :disabled="isItemPending(item.artwork_id)" @click="editItem(item)">{{ text("Edit", "编辑") }}</button>
                <button type="button" class="next-btn secondary small" :disabled="isItemPending(item.artwork_id)" @click="openPermissionDialog(item)">
                  {{ text("Permission", "权限") }}
                </button>
                <button type="button" class="next-btn secondary small" :disabled="isItemPending(item.artwork_id)" @click="toggleListing(item)">
                  {{ itemPendingAction(item.artwork_id) === "listing" ? (item.visibility_status === "listed" ? text("Unlisting...", "取消上架中...") : text("Listing...", "上架中...")) : listingActionLabel(item) }}
                </button>
                <button
                  type="button"
                  class="next-btn secondary small"
                  :data-testid="item.api_status === 'enabled' ? `artwork-disable-api-${item.artwork_id}` : `artwork-enable-api-${item.artwork_id}`"
                  :disabled="isItemPending(item.artwork_id) || (!canToggleApi(item) && item.api_status !== 'enabled')"
                  @click="toggleApiStatus(item)"
                >
                  {{ apiActionLabel(item) }}
                </button>
                <button
                  type="button"
                  class="next-btn primary small"
                  :disabled="!canSubmitItem(item)"
                  @click="submitToPlatform(item)"
                >
                  {{ submitActionLabel(item) }}
                </button>
                <button type="button" class="next-btn danger small" :disabled="isItemPending(item.artwork_id)" @click="openDeleteDialog(item)">
                  {{ itemPendingAction(item.artwork_id) === "delete" ? text("Deleting...", "移除中...") : text("Remove", "移除") }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <div
          v-if="hoveredTenantArtworkEntry"
          class="template-hover-card hover-overlay"
          :class="hoveredTenantArtworkPlacement"
          :style="hoveredTenantArtworkStyle"
        >
          <div class="template-hover-preview">
            <img
              :src="resolveArtworkPreviewUrl(hoveredTenantArtworkEntry)"
              :alt="hoveredTenantArtworkEntry.name"
              @error="handleArtworkPreviewError(hoveredTenantArtworkEntry)"
            />
          </div>
          <div class="template-hover-body">
            <strong class="template-hover-title">{{ hoveredTenantArtworkEntry.name }}</strong>
            <span class="template-hover-meta"><b>{{ text("Code", "编码") }}</b>{{ resolveArtworkCode(hoveredTenantArtworkEntry) }}</span>
            <span class="template-hover-meta"><b>{{ text("Category", "分类") }}</b>{{ hoveredTenantArtworkEntry.category_path || text("Uncategorized", "未分类") }}</span>
            <span class="template-hover-meta"><b>{{ text("Status", "状态") }}</b>{{ listingStateLabel(hoveredTenantArtworkEntry) }} · {{ formatReviewState(hoveredTenantArtworkEntry.review_status) }}</span>
            <span class="template-hover-meta"><b>{{ text("Access", "访问") }}</b>{{ accessScopeLabel(hoveredTenantArtworkEntry.access_scope) }}</span>
            <span class="template-hover-meta"><b>{{ text("API", "API") }}</b>{{ apiStatusLabel(hoveredTenantArtworkEntry) }}</span>
            <span class="template-hover-meta"><b>{{ text("Price", "价格") }}</b>{{ priceLabel(hoveredTenantArtworkEntry) }}</span>
            <span class="template-hover-meta"><b>{{ text("Size", "尺寸") }}</b>{{ formatDimensions(hoveredTenantArtworkEntry) }}</span>
            <span class="template-hover-meta"><b>{{ text("Time", "时间") }}</b>{{ formatUpdatedAt(hoveredTenantArtworkEntry.updated_at) }}</span>
          </div>
        </div>

        <div v-if="!items.length" class="next-empty-state tenant-empty-state">
          <strong>{{ artworkCatalogEmptyState.title }}</strong>
          <span>{{ artworkCatalogEmptyState.description }}</span>
        </div>

        <PaginationBar
          v-if="total > 0"
          v-model:current-page="page"
          :total-pages="totalPages"
          :total-items="total"
          :page-size="pageSize"
        />
      </article>

    </template>

    <template v-else>
      <article class="next-card">
        <div class="next-card-head repo-header">
          <div class="repo-header-copy">
            <h3>{{ title }}</h3>
            <p>{{ description }}</p>
          </div>
          <div class="repo-header-actions">
            <button type="button" class="next-btn secondary" @click="resetForm">
              {{ editingId ? text("Cancel Edit", "取消编辑") : text("Reset Form", "重置表单") }}
            </button>
          </div>
        </div>
        <div v-if="tenantContext.tenantId" class="context-banner">
          <strong>{{ text("Tenant Context", "租户上下文") }}</strong>
          <span>{{ tenantContext.tenantLabel || tenantContext.tenantId }}</span>
        </div>

        <div class="next-stats-grid">
          <div class="next-summary-card active">
            <span class="next-summary-label">{{ text("Total Assets", "素材总量") }}</span>
            <strong>{{ totalArtworkCount }}</strong>
            <span class="next-summary-hint">{{ text(`${activeCount} active · ${disabledCount} disabled`, `${activeCount} 条启用 · ${disabledCount} 条停用`) }}</span>
          </div>
          <div class="next-summary-card">
            <span class="next-summary-label">{{ text("Active Assets", "启用素材") }}</span>
            <strong>{{ activeCount }}</strong>
            <span class="next-summary-hint">{{ text(`${disabledCount} disabled`, `${disabledCount} 条已禁用`) }}</span>
          </div>
          <div class="next-summary-card warning">
            <span class="next-summary-label">{{ text("Listed Assets", "已上架素材") }}</span>
            <strong>{{ listedCount }}</strong>
            <span class="next-summary-hint">{{ text(`${draftCount} draft · ${hiddenCount} hidden`, `${draftCount} 草稿 · ${hiddenCount} 隐藏`) }}</span>
          </div>
          <div class="next-summary-card success">
            <span class="next-summary-label">{{ text("Commerce Mix", "销售组合") }}</span>
            <strong>{{ text(`${paidCount} paid / ${freeCount} free`, `${paidCount} 付费 / ${freeCount} 免费`) }}</strong>
            <span class="next-summary-hint">{{ text(`${purchaseCount} sales · ${licenseCount} licenses`, `${purchaseCount} 销量 · ${licenseCount} 授权`) }}</span>
          </div>
          <div class="next-summary-card">
            <span class="next-summary-label">{{ text("Review Queue", "审核队列") }}</span>
            <strong>{{ text(`${pendingReviewCount} pending`, `${pendingReviewCount} 待审核`) }}</strong>
            <span class="next-summary-hint">{{ text(`${approvedCount} approved · ${rejectedCount} rejected`, `${approvedCount} 通过 · ${rejectedCount} 拒绝`) }}</span>
          </div>
          <div class="next-summary-card success">
            <span class="next-summary-label">{{ text("Formats", "格式") }}</span>
            <strong>JPG / PNG / WEBP / SVG</strong>
            <span class="next-summary-hint">{{ text("Supported upload pipeline", "支持的上传链路") }}</span>
          </div>
        </div>
      </article>

      <article class="next-card">
        <div class="next-card-head repo-header">
          <div class="repo-header-copy">
            <h3>{{ text("Platform Artwork Management", "平台素材管理") }}</h3>
            <p>{{ text("Manage curated platform artwork, imports, pricing, listing state, and platform library reviews.", "管理精选平台素材、导入、定价、上架状态和平台素材库审核。") }}</p>
          </div>
          <div class="repo-header-actions catalog-actions">
            <div class="page-badge">{{ text(`${total} Total`, `共 ${total} 条`) }}</div>
            <button type="button" class="next-btn danger small" @click="openClearDialog">
              {{ text("Clear Platform Library", "清空平台素材库") }}
            </button>
          </div>
        </div>

        <div class="repo-toolbar">
          <div class="repo-toolbar-main">
            <div class="repo-toolbar-filters">
              <input v-model="keyword" type="text" class="toolbar-input" :placeholder="text('Search artwork name, code, ID, creator, or description', '搜索素材名称、编码、ID、作者或描述')" />
              <select v-model="statusFilter" class="toolbar-select">
                <option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>
            <div class="repo-toolbar-category">
              <CategoryCascadeSelector
                :model-value="categoryId"
                :categories="categories"
                clear-value="all"
                :allow-non-leaf="true"
                :level1-placeholder="text('All Categories', '全部分类')"
                :level2-placeholder="text('Level 2', '二级分类')"
                :level3-placeholder="text('Level 3', '三级分类')"
                :helper-text="text('Filter by artwork category.', '按素材分类筛选。')"
                recent-storage-key="mockup-admin-artwork-categories"
                @update:model-value="categoryId = $event; page = 1"
              />
            </div>
          </div>
        </div>

        <div class="next-status error" v-if="error">{{ error }}</div>
        <div class="next-status success" v-else-if="notice">{{ notice }}</div>

        <div class="artwork-layout">
          <form class="artwork-editor-panel" @submit.prevent="save">
            <section class="curated-import">
              <div class="panel-header">
                <div>
                  <h4>{{ text("Curated Import", "精选导入") }}</h4>
                  <p>{{ text("Paste a reviewed JSON manifest or upload a JSON file from approved free artwork sources.", "粘贴已审核的 JSON 清单，或上传来自已批准免费素材源的 JSON 文件。") }}</p>
                </div>
              </div>

              <div class="import-actions">
                <label class="import-batch-field">
                  <span>{{ text("Batch Size", "批大小") }}</span>
                  <input v-model.number="importBatchSize" type="number" min="1" max="200" class="toolbar-input small" />
                </label>
                <input type="file" accept=".json,application/json" class="import-file-input" @change="handleImportFileChange" />
                <button type="button" class="next-btn secondary small" @click="parseImportManifest">{{ text("Preview Manifest", "预览清单") }}</button>
                <button type="button" class="next-btn primary small" :disabled="importing || !importJsonText.trim()" @click="runCuratedImport">
                  {{ importing ? text("Importing...", "导入中...") : (importCheckpoint ? text("Resume Import", "继续导入") : text("Run Import", "开始导入")) }}
                </button>
                <button v-if="importCheckpoint" type="button" class="next-btn secondary small" :disabled="importing" @click="resetImportProgress">
                  {{ text("Reset Progress", "重置进度") }}
                </button>
                <button type="button" class="next-btn secondary small" :disabled="importing" @click="clearImportManifest">{{ text("Clear", "清空") }}</button>
              </div>

              <div v-if="importFileName" class="import-file-name">{{ text("Loaded file", "已载入文件") }}: {{ importFileName }}</div>

              <div v-if="importCheckpoint" class="import-checkpoint-card">
                <div class="import-summary-grid">
                  <div class="import-summary-item">
                    <span>{{ text("Completed Batches", "已完成批次") }}</span>
                    <strong>{{ importCheckpoint.completed_batches }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Created", "已创建") }}</span>
                    <strong>{{ importCheckpoint.created_count }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Skipped", "已跳过") }}</span>
                    <strong>{{ importCheckpoint.skipped_count }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Checkpoint Keys", "检查点键数") }}</span>
                    <strong>{{ importCheckpoint.processed_keys.length }}</strong>
                  </div>
                  <div class="import-summary-item wide">
                    <span>{{ text("Updated", "更新时间") }}</span>
                    <strong>{{ formatUpdatedAt(importCheckpoint.updated_at) }}</strong>
                  </div>
                </div>
              </div>

              <textarea
                v-model="importJsonText"
                class="import-textarea"
                rows="8"
                placeholder='{"items":[{"artwork_code":"LCA-851","source_provider":"libreclipart","source_asset_id":"851","source_url":"https://libreclipart.org/en/download/851/svg/0","name":"Abstract geometric pattern","mime_type":"image/svg+xml","file_ext":"svg","category_id":"art_abstract_patterns_geometric","category_path":"Abstract & Graphics / Patterns & Textures / Geometric Patterns","preview_url":"https://oss.mockup100.com/artworks/libreclipart/thumbs/851.jpg","original_url":"https://oss.mockup100.com/artworks/libreclipart/851.svg","license_name":"CC0","license_url":"https://creativecommons.org/publicdomain/zero/1.0/","attribution_required":false}]}'
              />

              <div v-if="importPreviewItems.length" class="import-preview-card">
                <div class="import-summary-grid">
                  <div class="import-summary-item">
                    <span>{{ text("Items", "条目数") }}</span>
                    <strong>{{ importPreviewStats.total }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Unique Pending", "唯一待处理") }}</span>
                    <strong>{{ importPreviewStats.unique }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Batches", "批次数") }}</span>
                    <strong>{{ importPreviewStats.batchCount }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Manifest Duplicates", "清单重复") }}</span>
                    <strong>{{ importPreviewStats.manifestDuplicates }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Library Duplicates", "库内重复") }}</span>
                    <strong>{{ importPreviewStats.libraryDuplicates }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Resume Duplicates", "续传重复") }}</span>
                    <strong>{{ importPreviewStats.checkpointDuplicates }}</strong>
                  </div>
                  <div class="import-summary-item">
                    <span>{{ text("Est. Duplicates", "预估重复") }}</span>
                    <strong>{{ importPreviewStats.estimatedDuplicates }}</strong>
                  </div>
                  <div class="import-summary-item wide">
                    <span>{{ text("Providers", "来源提供方") }}</span>
                    <strong>{{ importPreviewStats.providerSummary || text("N/A", "无") }}</strong>
                  </div>
                </div>

                <div class="import-sample-list">
                  <article v-for="item in importPreviewStats.sample" :key="`${item.source_provider}-${item.source_asset_id || item.source_url || item.name}`" class="import-sample-item">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.artwork_code || item.source_asset_id || text("No code", "无编码") }}</span>
                    <span>{{ item.source_provider }} | {{ item.license_name || text("No license", "无授权") }}</span>
                    <span>{{ item.category_path || text("Uncategorized", "未分类") }}</span>
                    <span>{{ item.file_ext.toUpperCase() }} | {{ item.mime_type }}</span>
                  </article>
                </div>
              </div>

              <div v-if="importMessages.length" class="import-messages">
                <div v-for="message in importMessages" :key="message" class="import-message">
                  {{ message }}
                </div>
              </div>
            </section>

            <div class="panel-header">
              <div>
                <h4>{{ editingId ? text("Edit Artwork", "编辑素材") : text("New Artwork", "新建素材") }}</h4>
                <p>{{ editingId ? text("Adjust metadata, pricing, review, and visibility settings.", "调整元数据、定价、审核和可见性设置。") : text("Create or curate a platform artwork record, including import-ready metadata.", "创建或整理平台素材记录，并补齐可导入元数据。") }}</p>
              </div>
            </div>

            <div class="panel-section">
              <span class="panel-section-title">{{ text("Core", "核心信息") }}</span>
              <div class="form-grid">
                <label>
                  <span>{{ text("Artwork Code", "素材编码") }}</span>
                  <input
                    v-model="form.artwork_code"
                    type="text"
                    placeholder="LCA-860, TEN-XXXX, or 11"
                    @blur="handleArtworkCodeBlur"
                  />
                  <small v-if="artworkCodeHint" class="field-hint" :class="`field-hint--${artworkCodeCheckState}`">
                    {{ artworkCodeHint }}
                  </small>
                </label>
                <label>
                  <span>{{ text("Name", "名称") }}</span>
                  <input v-model="form.name" type="text" required />
                </label>
                <label class="full">
                  <span>{{ text("Upload File", "上传文件") }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" @change="handleArtworkFileChange" />
                </label>
                <label class="full">
                  <span>{{ text("Category", "分类") }}</span>
                  <select v-model="form.category_id">
                    <option value="">{{ text("Uncategorized", "未分类") }}</option>
                    <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label>
                  <span>{{ text("Preview URL", "预览 URL") }}</span>
                  <input v-model="form.preview_url" type="url" required />
                </label>
                <label>
                  <span>{{ text("Original URL", "原始 URL") }}</span>
                  <input v-model="form.original_url" type="url" required />
                </label>
                <label>
                  <span>{{ text("Status", "状态") }}</span>
                  <select v-model="form.status">
                    <option value="active">{{ text("active", "启用") }}</option>
                    <option value="disabled">{{ text("disabled", "禁用") }}</option>
                  </select>
                </label>
                <label>
                  <span>{{ text("Format", "格式") }}</span>
                  <select :value="form.mime_type" @change="applyMimePreset(($event.target as HTMLSelectElement).value)">
                    <option v-for="option in mimeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div class="panel-section">
              <span class="panel-section-title">{{ text("Ownership & License", "归属与授权") }}</span>
              <div class="form-grid">
                <label>
                  <span>{{ text("Commerce", "销售方式") }}</span>
                  <select v-model="form.commerce_type">
                    <option value="free">{{ text("Free", "免费") }}</option>
                    <option value="paid">{{ text("Paid", "付费") }}</option>
                  </select>
                </label>
                <label>
                  <span>{{ text("Price Tokens", "价格 Tokens") }}</span>
                  <select v-model.number="form.price_tokens" :disabled="form.commerce_type !== 'paid'">
                    <option :value="0">0</option>
                    <option v-for="price in [1,2,3,4,5,6,7,8,9,10]" :key="price" :value="price">{{ price }}</option>
                  </select>
                </label>
                <label v-if="!isTenantMode">
                  <span>{{ text("Visibility", "可见性") }}</span>
                  <select v-model="form.visibility_status">
                    <option value="draft">{{ text("draft", "草稿") }}</option>
                    <option value="listed">{{ text("listed", "已上架") }}</option>
                    <option value="disabled">{{ text("disabled", "禁用") }}</option>
                  </select>
                </label>
                <label>
                  <span>{{ text("Creator", "作者") }}</span>
                  <input v-model="form.creator_name" type="text" />
                </label>
                <label>
                  <span>{{ text("Source Provider", "来源提供方") }}</span>
                  <select v-model="form.source_provider">
                    <option v-for="option in providerOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label>
                  <span>{{ text("License", "授权协议") }}</span>
                  <input v-model="form.license_name" type="text" />
                </label>
                <label>
                  <span>{{ text("License URL", "授权 URL") }}</span>
                  <input v-model="form.license_url" type="url" />
                </label>
              </div>
            </div>

            <div class="panel-section">
              <span class="panel-section-title">{{ text("Asset Details", "素材详情") }}</span>
              <div class="form-grid">
                <label>
                  <span>{{ text("Width", "宽度") }}</span>
                  <input v-model.number="form.width" type="number" min="1" />
                </label>
                <label>
                  <span>{{ text("Height", "高度") }}</span>
                  <input v-model.number="form.height" type="number" min="1" />
                </label>
                <label>
                  <span>{{ text("Source Asset ID", "来源素材 ID") }}</span>
                  <input v-model="form.source_asset_id" type="text" />
                </label>
                <label>
                  <span>{{ text("Source URL", "来源 URL") }}</span>
                  <input v-model="form.source_url" type="url" />
                </label>
                <label class="full">
                  <span>{{ text("Description", "描述") }}</span>
                  <textarea v-model="form.description" rows="3" />
                </label>
              </div>
              <label class="checkbox-row">
                <input v-model="form.attribution_required" type="checkbox" />
                <span>{{ text("Attribution Required", "需要署名") }}</span>
              </label>
            </div>

            <div class="panel-actions">
              <button type="submit" class="next-btn primary" :disabled="platformSaveDisabled">
                {{ saving ? text("Saving...", "保存中...") : uploading ? text("Uploading...", "上传中...") : (editingId ? text("Update Artwork", "更新素材") : text("Create Artwork", "创建素材")) }}
              </button>
              <button type="button" class="next-btn secondary" @click="resetForm">{{ text("Reset", "重置") }}</button>
            </div>
          </form>

          <div class="artwork-list-panel">
            <div class="panel-header">
              <div>
                <h4>{{ text("Listed Assets", "已列出素材") }}</h4>
                <p>{{ text("Reference the same moderation and catalog rhythm as the repository view.", "沿用与仓库视图相同的审核与目录节奏。") }}</p>
              </div>
              <div class="page-counter">{{ page }} / {{ totalPages }}</div>
            </div>

            <div class="artwork-items">
              <article v-for="item in items" :key="item.artwork_id" class="artwork-item">
                <div class="artwork-thumb-wrap">
                  <img
                    class="thumb"
                    :src="resolveArtworkPreviewUrl(item)"
                    :alt="item.name"
                    @error="handleArtworkPreviewError(item)"
                  />
                </div>
                <div class="item-body">
                  <div class="item-head">
                    <div class="item-title-stack">
                      <strong>{{ item.name }}</strong>
                      <span class="item-code">{{ resolveArtworkCode(item) }}</span>
                    </div>
                    <span class="status-badge" :class="{ muted: item.status !== 'active' }">{{ item.status === "active" ? text("active", "启用") : text("disabled", "禁用") }}</span>
                  </div>
                  <p class="item-description">{{ item.description || text("No description yet.", "暂无描述。") }}</p>
                  <div class="item-meta">
                    <span class="meta-chip">{{ item.category_path || text("Uncategorized", "未分类") }}</span>
                    <span v-if="item.creator_name" class="meta-chip">{{ item.creator_name }}</span>
                    <span class="meta-chip">{{ formatDimensions(item) }}</span>
                    <span class="meta-chip">{{ priceLabel(item) }}</span>
                    <span class="meta-chip">{{ item.visibility_status || text("draft", "草稿") }}</span>
                    <span class="meta-chip" :class="accessScopeClass(item.access_scope)">{{ accessScopeLabel(item.access_scope) }}</span>
                  </div>
                  <div class="item-meta secondary">
                    <span class="meta-chip neutral">{{ apiStatusLabel(item) }}</span>
                    <span class="meta-chip neutral">{{ item.review_status || text("not_required", "无需审核") }}</span>
                    <span class="meta-chip neutral">{{ formatUpdatedAt(item.updated_at) }}</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button type="button" class="next-btn secondary small" :disabled="isItemPending(item.artwork_id)" @click="editItem(item)">{{ text("Edit", "编辑") }}</button>
                  <button type="button" class="next-btn secondary small" :disabled="isItemPending(item.artwork_id)" @click="openPermissionDialog(item)">{{ text("Permission", "权限") }}</button>
                  <button type="button" class="next-btn secondary small" :disabled="isItemPending(item.artwork_id)" @click="toggleStatus(item)">
                    {{ itemActionLabel(item) }}
                  </button>
                  <button
                    type="button"
                    class="next-btn secondary small"
                    :data-testid="item.api_status === 'enabled' ? `artwork-disable-api-${item.artwork_id}` : `artwork-enable-api-${item.artwork_id}`"
                    :disabled="isItemPending(item.artwork_id) || (!canToggleApi(item) && item.api_status !== 'enabled')"
                    @click="toggleApiStatus(item)"
                  >
                    {{ apiActionLabel(item) }}
                  </button>
                  <button type="button" class="next-btn danger small" :disabled="isItemPending(item.artwork_id)" @click="openDeleteDialog(item)">
                    {{ itemPendingAction(item.artwork_id) === "delete" ? text("Deleting...", "删除中...") : text("Delete", "删除") }}
                  </button>
                </div>
              </article>
              <div v-if="!items.length" class="repo-empty">
                <strong>{{ text("No artwork records found.", "未找到素材记录。") }}</strong>
                <span>{{ text("Try a different category or search keyword.", "可尝试其他分类或搜索关键词。") }}</span>
              </div>
            </div>

            <div class="pager" v-if="totalPages > 1">
              <button type="button" class="next-btn secondary small" :disabled="page <= 1" @click="page -= 1">{{ text("Prev", "上一页") }}</button>
              <button type="button" class="next-btn secondary small" :disabled="page >= totalPages" @click="page += 1">{{ text("Next", "下一页") }}</button>
            </div>

            <section class="submission-panel">
              <div class="panel-header">
                <div>
                  <h4>{{ text("Artwork Center Review", "素材中心审核") }}</h4>
                  <p>{{ text("Review listed tenant artwork before it enters the shared platform library.", "在租户已上架素材进入共享平台素材库前进行审核。") }}</p>
                </div>
              </div>
              <div class="submission-toolbar">
                <select v-model="submissionStatusFilter" class="toolbar-select submission-select" :disabled="loadingSubmissions">
                  <option v-for="option in submissionStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <select v-model="submissionArtworkFilter" class="toolbar-select submission-select" :disabled="loadingSubmissions">
                  <option value="all">{{ text("All Artwork", "全部素材") }}</option>
                  <option v-for="option in submissionArtworkOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <label class="submission-checkbox">
                  <input v-model="submissionMineOnly" type="checkbox" :disabled="loadingSubmissions || !authStore.tenant?.tenant_id" />
                  <span>{{ text("My Tenant Only", "仅看我的租户") }}</span>
                </label>
              </div>
              <div v-if="loadingSubmissions" class="submission-loading">{{ text("Loading submissions...", "正在加载提交流程...") }}</div>
              <div v-if="pendingSubmissions.length" class="submission-group">
                <div class="submission-group-title">{{ text("Pending Review", "待审核") }}</div>
                <div class="submission-list">
                  <article v-for="submission in pendingSubmissions" :key="submission.submission_id" class="submission-item">
                    <div class="submission-body">
                      <div class="submission-head">
                        <div class="submission-title-stack">
                          <strong>{{ resolveSubmissionTitle(submission) }}</strong>
                          <span class="item-code">{{ resolveSubmissionCode(submission) }}</span>
                          <span class="item-id">{{ submission.submission_id }}</span>
                        </div>
                        <span class="status-badge" :class="submissionStatusClass(submission.status)">{{ formatSubmissionStatus(submission.status) }}</span>
                      </div>
                      <p>{{ submission.description || text("No description provided.", "未提供描述。") }}</p>
                      <div class="item-meta">
                        <span class="meta-chip neutral">{{ submission.tenant_id }}</span>
                        <span class="meta-chip neutral">{{ submission.visibility_status || text("draft", "草稿") }}</span>
                        <span class="meta-chip neutral">{{ text("Submitted", "已提交") }} {{ formatUpdatedAt(submission.created_at) }}</span>
                        <span v-if="submission.platform_artwork_code" class="meta-chip neutral">{{ text("Platform Copy", "平台副本") }} {{ submission.platform_artwork_code }}</span>
                        <span v-if="submission.platform_purchase_count !== undefined" class="meta-chip neutral">{{ text(`${submission.platform_purchase_count} platform purchases`, `${submission.platform_purchase_count} 次平台购买`) }}</span>
                      </div>
                      <p v-if="submission.review_note" class="submission-note"><strong>{{ text("Review Note:", "审核备注：") }}</strong> {{ submission.review_note }}</p>
                      <div class="submission-history-actions">
                        <button type="button" class="next-btn secondary small" :disabled="loadingSubmissionHistoryId === submission.submission_id" @click="toggleSubmissionHistory(submission.submission_id)">
                          {{ expandedHistory[submission.submission_id] ? text("Hide History", "隐藏历史") : loadingSubmissionHistoryId === submission.submission_id ? text("Loading...", "加载中...") : text("History", "历史记录") }}
                        </button>
                      </div>
                      <div v-if="expandedHistory[submission.submission_id] && submissionHistory[submission.submission_id]?.length" class="submission-history">
                        <div v-for="entry in submissionHistory[submission.submission_id]" :key="entry.review_event_id" class="history-item">
                          <span class="history-action">{{ formatHistoryAction(entry.action || entry.decision) }}</span>
                          <span class="history-actor">{{ entry.actor_email || text("system", "系统") }}</span>
                          <span class="history-time">{{ formatUpdatedAt(entry.created_at) }}</span>
                          <span v-if="entry.note" class="history-note">{{ entry.note }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="submission-actions">
                      <button
                        v-if="canReviewAction(submission.status, 'start_review')"
                        type="button"
                        class="next-btn primary small"
                        :disabled="reviewingSubmissionId === submission.submission_id"
                        @click="openReviewDialog(submission.submission_id, 'start_review')"
                      >
                        {{ reviewingSubmissionId === submission.submission_id && reviewDialogAction === "start_review" ? text("Starting review...", "开始审核中...") : text("Start Review", "开始审核") }}
                      </button>
                      <button
                        v-if="canReviewAction(submission.status, 'changes_requested')"
                        type="button"
                        class="next-btn secondary small"
                        :disabled="reviewingSubmissionId === submission.submission_id"
                        @click="openReviewDialog(submission.submission_id, 'changes_requested')"
                      >
                        {{ reviewingSubmissionId === submission.submission_id && reviewDialogAction === "changes_requested" ? text("Submitting changes request...", "要求修改提交中...") : text("Changes", "要求修改") }}
                      </button>
                      <button
                        v-if="canReviewAction(submission.status, 'approved')"
                        type="button"
                        class="next-btn primary small"
                        :disabled="reviewingSubmissionId === submission.submission_id"
                        @click="openReviewDialog(submission.submission_id, 'approved')"
                      >
                        {{ reviewingSubmissionId === submission.submission_id && reviewDialogAction === "approved" ? text("Approving...", "通过中...") : text("Approve", "通过") }}
                      </button>
                      <button
                        v-if="canReviewAction(submission.status, 'rejected')"
                        type="button"
                        class="next-btn danger small"
                        :disabled="reviewingSubmissionId === submission.submission_id"
                        @click="openReviewDialog(submission.submission_id, 'rejected')"
                      >
                        {{ reviewingSubmissionId === submission.submission_id && reviewDialogAction === "rejected" ? text("Rejecting...", "拒绝中...") : text("Reject", "拒绝") }}
                      </button>
                    </div>
                  </article>
                </div>
              </div>
              <div v-if="reviewedSubmissions.length" class="submission-group">
                <div class="submission-group-title">{{ text("Recent Decisions", "最近决定") }}</div>
                <div class="submission-list">
                  <article v-for="submission in reviewedSubmissions" :key="submission.submission_id" class="submission-item">
                    <div class="submission-body">
                      <div class="submission-head">
                        <div class="submission-title-stack">
                          <strong>{{ resolveSubmissionTitle(submission) }}</strong>
                          <span class="item-code">{{ resolveSubmissionCode(submission) }}</span>
                          <span class="item-id">{{ submission.submission_id }}</span>
                        </div>
                        <span class="status-badge" :class="submissionStatusClass(submission.status)">{{ formatSubmissionStatus(submission.status) }}</span>
                      </div>
                      <p>{{ submission.description || text("No description provided.", "未提供描述。") }}</p>
                      <div class="item-meta">
                        <span class="meta-chip neutral">{{ submission.tenant_id }}</span>
                        <span class="meta-chip neutral">{{ submission.visibility_status || text("draft", "草稿") }}</span>
                        <span class="meta-chip neutral">{{ text("Submitted", "已提交") }} {{ formatUpdatedAt(submission.created_at) }}</span>
                        <span v-if="submission.reviewed_at" class="meta-chip neutral">{{ text("Reviewed", "已审核") }} {{ formatUpdatedAt(submission.reviewed_at) }}</span>
                        <span v-if="submission.reviewed_by" class="meta-chip neutral">{{ submission.reviewed_by }}</span>
                        <span v-if="submission.platform_artwork_code" class="meta-chip neutral">{{ text("Platform Copy", "平台副本") }} {{ submission.platform_artwork_code }}</span>
                        <span v-if="submission.platform_purchase_count !== undefined" class="meta-chip neutral">{{ text(`${submission.platform_purchase_count} platform purchases`, `${submission.platform_purchase_count} 次平台购买`) }}</span>
                      </div>
                      <p v-if="submission.review_note" class="submission-note"><strong>{{ text("Review Note:", "审核备注：") }}</strong> {{ submission.review_note }}</p>
                      <div class="submission-history-actions">
                        <button type="button" class="next-btn secondary small" :disabled="loadingSubmissionHistoryId === submission.submission_id" @click="toggleSubmissionHistory(submission.submission_id)">
                          {{ expandedHistory[submission.submission_id] ? text("Hide History", "隐藏历史") : loadingSubmissionHistoryId === submission.submission_id ? text("Loading...", "加载中...") : text("History", "历史记录") }}
                        </button>
                      </div>
                      <div v-if="expandedHistory[submission.submission_id] && submissionHistory[submission.submission_id]?.length" class="submission-history">
                        <div v-for="entry in submissionHistory[submission.submission_id]" :key="entry.review_event_id" class="history-item">
                          <span class="history-action">{{ formatHistoryAction(entry.action || entry.decision) }}</span>
                          <span class="history-actor">{{ entry.actor_email || text("system", "系统") }}</span>
                          <span class="history-time">{{ formatUpdatedAt(entry.created_at) }}</span>
                          <span v-if="entry.note" class="history-note">{{ entry.note }}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
              <div v-if="!submissions.length" class="repo-empty compact">
                <strong>{{ text("No submissions in this view.", "当前视图没有提交流程。") }}</strong>
                <span>{{ text("Listed tenant artwork appears here after submission.", "租户素材上架并提交后会显示在这里。") }}</span>
              </div>
            </section>
          </div>
        </div>
      </article>
    </template>

    <div v-if="isTenantMode && tenantModalOpen" class="next-modal-overlay" @click.self="closeTenantModal">
      <div class="next-modal tenant-modal">
        <div class="next-modal-head">
          <strong>{{ editingId ? text("Edit Artwork", "编辑素材") : text("Upload Artwork", "上传素材") }}</strong>
          <button type="button" class="next-btn secondary small" :disabled="saving || uploading" @click="closeTenantModal">{{ text("Close", "关闭") }}</button>
        </div>
        <form class="next-modal-body tenant-modal-body" @submit.prevent="save">
          <div v-if="tenantModalFormError" class="next-status error tenant-modal-status">{{ tenantModalFormError }}</div>

          <div class="panel-section compact first">
            <span class="panel-section-title">{{ text("Core", "核心信息") }}</span>
            <div class="form-grid">
              <label>
                <span>{{ text("Artwork Name", "素材名称") }}</span>
                <input v-model="form.name" type="text" required />
              </label>
              <label>
                <span>{{ text("Artwork Code", "素材编码") }}</span>
                <input
                  v-model="form.artwork_code"
                  type="text"
                  placeholder="TEN-001 or 11"
                  @input="handleArtworkCodeInput"
                  @blur="handleArtworkCodeBlur"
                />
                <small v-if="artworkCodeHint" class="field-hint" :class="`field-hint--${artworkCodeCheckState}`">
                  {{ artworkCodeHint }}
                </small>
              </label>
              <label class="full">
                <span>{{ text("Upload File", "上传文件") }}</span>
                <div class="file-picker">
                  <input
                    id="tenant-artwork-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    class="file-picker-input"
                    @change="handleArtworkFileChange"
                  />
                  <label class="file-picker-control" for="tenant-artwork-file-input">
                    <span class="file-picker-button">{{ uploading ? text("Uploading...", "上传中...") : text("Choose File", "选择文件") }}</span>
                    <span class="file-picker-name">{{ selectedArtworkFileName || text("No file chosen", "未选择文件") }}</span>
                  </label>
                </div>
              </label>
              <div v-if="tenantUploadSummary" class="tenant-upload-summary full">
                <span class="meta-chip">{{ tenantUploadSummary }}</span>
              </div>
              <label class="full">
                <span>{{ text("Category", "分类") }}</span>
                <CategoryCascadeSelector
                  v-model="form.category_id"
                  :categories="categories"
                  clear-value=""
                  :inline-clear="true"
                  :show-recent-options="false"
                  :show-selection-summary="false"
                  :disabled="saving || uploading"
                  :level1-placeholder="text('Select Category', '选择分类')"
                  :level2-placeholder="text('Select Level 2', '选择二级分类')"
                  :level3-placeholder="text('Select Level 3', '选择三级分类')"
                />
              </label>
            </div>
          </div>

          <div class="panel-section compact">
            <span class="panel-section-title">{{ text("Pricing", "定价") }}</span>
            <div class="form-grid">
              <label>
                <span>{{ text("Commerce", "销售方式") }}</span>
                <select v-model="form.commerce_type">
                  <option value="free">{{ text("Free", "免费") }}</option>
                  <option value="paid">{{ text("Paid", "付费") }}</option>
                </select>
              </label>
              <label>
                <span>{{ text("Price Tokens", "价格 Tokens") }}</span>
                <select v-model.number="form.price_tokens" :disabled="form.commerce_type !== 'paid'">
                  <option :value="0">0</option>
                  <option v-for="price in [1,2,3,4,5,6,7,8,9,10]" :key="price" :value="price">{{ price }}</option>
                </select>
              </label>
              <label>
                <span>{{ text("Description", "描述") }}</span>
                <input v-model="form.description" type="text" :placeholder="text('Optional short description', '可选的简短描述')" />
              </label>
            </div>
          </div>

          <div class="panel-actions tenant-modal-actions">
            <button type="button" class="next-btn secondary" :disabled="saving || uploading" @click="closeTenantModal">{{ text("Cancel", "取消") }}</button>
            <button type="submit" class="next-btn primary" :disabled="tenantSaveDisabled">
              {{ saving ? text("Saving...", "保存中...") : uploading ? text("Uploading...", "上传中...") : (editingId ? text("Update Artwork", "更新素材") : text("Create Artwork", "创建素材")) }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <ActionConfirmationModal
      :is-open="listingDialogOpen"
      :title="listingDialogMode === 'permission'
        ? text('Edit Artwork Permission', '编辑素材权限')
        : listingDialogMode === 'unlist'
          ? text('Unlist Artwork', '取消上架素材')
          : text('List Artwork', '上架素材')"
      :message="listingDialogMode === 'permission'
        ? (listingDialogItem?.visibility_status === 'listed'
            ? text('Choose the creative space permission for this artwork.', '请选择该素材在创作空间中的访问权限。')
            : text('Draft artwork stays private until it is listed.', '草稿素材在上架前只能保持私有。'))
        : listingDialogMode === 'unlist'
          ? text('Move this artwork back to draft. It will also reset to private.', '将该素材移回草稿，并同时重置为私有。')
          : text('Choose the creative space permission before listing this artwork.', '请先选择创作空间访问权限，再上架该素材。')"
      :details="listingDialogItem ? [
        `${text('Artwork', '素材')}: ${listingDialogItem.name}`,
        `${text('Code', '编码')}: ${resolveArtworkCode(listingDialogItem)}`,
      ] : []"
      :confirm-text="listingDialogMode === 'permission'
        ? text('Save Permission', '保存权限')
        : listingDialogMode === 'unlist'
          ? text('Unlist Artwork', '取消上架')
          : text('List Artwork', '上架素材')"
      :cancel-text="text('Cancel', '取消')"
      tone="primary"
      :choice-label="text('Access Scope', '访问范围')"
      :choice-value="listingDialogChoiceValue"
      :choice-required="listingDialogMode !== 'unlist'"
      :choice-options="listingDialogMode === 'unlist'
        ? []
        : listingDialogMode === 'permission' && listingDialogItem?.visibility_status !== 'listed'
          ? [{ value: 'private', label: text('Private', '私有'), description: text('Draft artwork stays private until listed.', '草稿素材在上架前只能保持私有。') }]
          : [
              { value: 'public', label: text('Public', '公开'), description: text('Visible to all creative space visitors after listing.', '上架后所有创作空间访问者都可见。') },
              { value: 'private', label: text('Private', '私有'), description: text('Visible only to your own tenant in creative space.', '在创作空间中仅你自己的租户可见。') },
            ]"
      :loading="Boolean(listingDialogItem && itemPendingAction(listingDialogItem.artwork_id) === 'listing')"
      :loading-text="text('Saving...', '保存中...')"
      :error-message="listingDialogError"
      @update:is-open="(value) => { if (!value) resetListingDialog() }"
      @update:choice-value="listingDialogChoiceValue = ($event === 'public' ? 'public' : 'private')"
      @confirm="confirmListingDialog"
      @close="resetListingDialog"
    />
    <ActionConfirmationModal
      :is-open="reviewDialogOpen"
      :title="reviewDialogAction === 'start_review'
        ? text('Start Artwork Review', '开始素材审核')
        : reviewDialogAction === 'changes_requested'
          ? text('Request Artwork Changes', '要求素材修改')
          : reviewDialogAction === 'approved'
            ? text('Approve Artwork Submission', '通过素材提交')
            : text('Reject Artwork Submission', '拒绝素材提交')"
      :message="reviewDialogAction === 'start_review'
        ? text('Move this tenant artwork submission into active review.', '将该租户素材提交置为审核中。')
        : reviewDialogAction === 'changes_requested'
          ? text('Request changes for this tenant artwork submission and record review guidance.', '将该租户素材提交标记为要求修改，并记录审核建议。')
          : reviewDialogAction === 'approved'
            ? text('Approve this tenant artwork and publish a platform copy for downstream licensing and purchase tracking.', '通过该租户素材，并发布一个平台副本用于后续授权和购买跟踪。')
            : text('Reject this tenant artwork submission and record a review note for the creator.', '拒绝该租户素材提交，并为创作者记录审核备注。')"
      :details="reviewDialogDetails"
      :confirm-text="reviewActionLabel(reviewDialogAction)"
      :cancel-text="text('Cancel', '取消')"
      :tone="reviewDialogAction === 'rejected' ? 'danger' : 'primary'"
      :note="reviewDialogNote"
      :note-label="text('Review Note', '审核备注')"
      :note-placeholder="reviewDialogAction === 'start_review'
        ? text('Optional review kickoff note', '可选的审核启动备注')
        : reviewDialogAction === 'changes_requested'
          ? text('Required changes request note', '必填的修改要求备注')
          : reviewDialogAction === 'approved'
            ? text('Optional approval note', '可选的通过备注')
            : text('Required rejection reason', '必填的拒绝原因')"
      :note-required="reviewDialogAction === 'changes_requested' || reviewDialogAction === 'rejected'"
      :loading="Boolean(reviewingSubmissionId)"
      :loading-text="text('Submitting...', '提交中...')"
      :error-message="reviewDialogError"
      @update:is-open="(value) => { if (!value) resetReviewDialog() }"
      @update:note="reviewDialogNote = $event"
      @confirm="confirmReviewAction"
      @close="resetReviewDialog"
    />
    <ActionConfirmationModal
      :is-open="deleteDialogOpen"
      :title="deleteDialogTitle"
      :message="deleteDialogMessage"
      :details="deleteDialogDetails"
      :show-hint="false"
      :show-tone-badge="false"
      :confirm-text="deleteDialogConfirmText"
      :cancel-text="text('Cancel', '取消')"
      tone="danger"
      :loading="deleteDialogItem ? itemPendingAction(deleteDialogItem.artwork_id) === 'delete' : false"
      :loading-text="deleteDialogLoadingText"
      :error-message="deleteDialogError"
      @update:is-open="(value) => { if (!value) resetDeleteDialog() }"
      @confirm="confirmDeleteAction"
      @close="resetDeleteDialog"
    />
    <ActionConfirmationModal
      :is-open="clearDialogOpen"
      :title="text('Disable Platform Library', '停用平台素材库')"
      :message="text('Disable all platform artwork records from active listings. Existing history remains available for governance and billing audit.', '将所有平台素材记录从活动上架中停用。现有历史仍会保留，用于治理和计费审计。')"
      :details="[
        text('This action now soft-disables the library instead of hard deleting records.', '该操作会软停用素材库，而不是硬删除记录。'),
        text('You can re-enable individual artwork later if needed.', '如有需要，之后可重新启用单个素材。'),
      ]"
      :confirm-text="text('Disable Library', '停用素材库')"
      :cancel-text="text('Cancel', '取消')"
      tone="danger"
      :loading="false"
      :loading-text="text('Saving...', '保存中...')"
      :error-message="clearDialogError"
      @update:is-open="(value) => { if (!value) resetClearDialog() }"
      @confirm="confirmClearAction"
      @close="resetClearDialog"
    />
  </div>
</template>

<style scoped>
.artwork-admin-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.next-card,
.artwork-editor-panel,
.artwork-list-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.next-card {
  padding: 1rem 1.1rem;
}

.next-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.tenant-upload-callout {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.6;
}

.tenant-hero-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.tenant-hero-head {
  align-items: flex-start;
}

.tenant-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.section-kicker {
  display: inline-flex;
  width: fit-content;
  padding: 0.24rem 0.6rem;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tenant-hero-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.context-banner {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1e3a8a;
}

.tenant-analytics-grid {
  margin-top: 1.1rem;
}

.tenant-breakdown {
  margin-top: 1rem;
}
.repo-header-copy h3 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
  color: #0f172a;
}
.repo-header-copy p {
  margin: 0;
  color: #64748b;
  line-height: 1.55;
}

.repo-header-actions,
.page-badge {
  flex-shrink: 0;
}

.page-badge {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
}

.page-badge.subtle {
  background: #f1f5f9;
  color: #475569;
}

.repo-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.repo-toolbar-main {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
  gap: 0.85rem;
  align-items: stretch;
}

.repo-toolbar-main.repo-toolbar-main-single {
  grid-template-columns: 1fr;
}

.repo-toolbar-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.repo-toolbar-category {
  min-width: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.repo-toolbar-control {
  min-width: 220px;
}

.repo-toolbar-category :deep(.category-cascade) {
  gap: 0.45rem;
}

.repo-toolbar-category :deep(.cascade-grid) {
  gap: 0.55rem;
}

.repo-toolbar-category :deep(.cascade-select-trigger),
.repo-toolbar-category :deep(.cascade-clear) {
  padding: 0.62rem 0.78rem;
  border-radius: 10px;
  font-size: 0.88rem;
}

.repo-toolbar-control :deep(.filter-dropdown) {
  min-width: 100%;
}

.repo-toolbar-control :deep(.filter-dropdown-trigger) {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0 0.85rem;
  background: #fff;
  color: #0f172a;
}

.repo-toolbar-control :deep(.filter-dropdown-menu) {
  border-color: #dbe3f0;
  border-radius: 12px;
}

.toolbar-input,
.toolbar-select,
.form-grid input,
.form-grid select,
.form-grid textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0.72rem 0.85rem;
  font: inherit;
}

.toolbar-input {
  flex: 1 1 260px;
}

.repo-header-search {
  flex: 0 1 360px;
}

.repo-search-input {
  width: 100%;
}

.toolbar-select {
  flex: 0 0 180px;
}

.toolbar-select-cascade {
  border: 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
  color: #0f172a;
  min-height: 40px;
}

.next-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.next-summary-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0.95rem 1rem;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.next-summary-card.active {
  border-color: #818cf8;
  background: #eef2ff;
}

.next-summary-card.warning {
  border-color: #facc15;
  background: #fefce8;
}

.next-summary-card.success {
  border-color: #86efac;
  background: #f0fdf4;
}

.next-summary-label {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.next-summary-card strong {
  color: #0f172a;
  font-size: 1.2rem;
}

.next-summary-hint {
  color: #64748b;
  font-size: 0.83rem;
  line-height: 1.45;
}

.next-status {
  margin-top: 1rem;
  border-radius: 12px;
  padding: 0.78rem 0.95rem;
  font-weight: 600;
}

.next-status.success {
  background: #ecfdf5;
  color: #047857;
}

.next-status.error {
  background: #fef2f2;
  color: #b91c1c;
}

.repository-analytics-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.repository-analytics-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.repository-analytics-row span {
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 700;
}

.repository-analytics-row strong {
  color: #0f172a;
  font-size: 0.92rem;
  line-height: 1.55;
  text-align: right;
}

.artwork-layout {
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.artwork-layout.tenant-only {
  grid-template-columns: 1fr;
}

.artwork-editor-panel,
.artwork-list-panel {
  padding: 1rem;
}

.panel-header,
.panel-actions,
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-header h4 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: #0f172a;
}

.panel-header p {
  margin: 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.5;
}

.curated-import {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

.import-batch-field {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 600;
}

.import-batch-field .toolbar-input.small {
  width: 92px;
}

.import-file-input,
.import-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0.72rem 0.85rem;
  font: inherit;
  background: #fff;
}

.import-file-input {
  padding: 0.55rem 0.75rem;
}

.import-textarea {
  min-height: 170px;
  resize: vertical;
}

.import-file-name {
  color: #475569;
  font-size: 0.84rem;
  font-weight: 600;
}

.import-checkpoint-card {
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.import-preview-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.9rem;
  background: #f8fafc;
}

.import-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.import-summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.import-summary-item span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.import-summary-item strong {
  color: #0f172a;
  font-size: 0.96rem;
  line-height: 1.4;
}

.import-sample-list,
.import-messages {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.import-sample-item,
.import-message {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.import-sample-item strong {
  color: #0f172a;
  font-size: 0.93rem;
}

.import-sample-item span,
.import-message {
  color: #475569;
  font-size: 0.84rem;
  line-height: 1.45;
}

.page-counter {
  color: #475569;
  font-size: 0.86rem;
  font-weight: 700;
}

.submission-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.95rem;
  align-items: center;
}

.submission-select {
  flex: 1 1 220px;
}

.submission-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: #475569;
  font-size: 0.88rem;
  font-weight: 600;
}

.submission-checkbox input {
  accent-color: #2563eb;
}

.submission-loading {
  margin-top: 0.85rem;
  color: #475569;
  font-size: 0.88rem;
  font-weight: 600;
}

.panel-section {
  margin-top: 1rem;
  padding-top: 0.95rem;
  border-top: 1px solid #e2e8f0;
}

.panel-section.compact {
  margin-top: 0.85rem;
}

.panel-section.first {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.panel-section-title {
  display: inline-flex;
  margin-bottom: 0.7rem;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}
.form-grid label,
.checkbox-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: #334155;
  font-size: 0.92rem;
}
.form-grid label.full {
  grid-column: 1 / -1;
}

.field-hint {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.45;
}

.field-hint--checking {
  color: #2563eb;
}

.field-hint--available {
  color: #047857;
}

.field-hint--blocked {
  color: #b91c1c;
}

.checkbox-row {
  margin-top: 0.8rem;
}

.tenant-upload-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tenant-toolbar-filters {
  justify-content: flex-start;
}

.tenant-catalog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.tenant-artwork-card {
  position: relative;
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  align-items: start;
  gap: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  padding: 0.75rem 0.8rem;
  min-height: 100%;
}

.tenant-artwork-media {
  position: relative;
  width: 140px;
  aspect-ratio: 1;
  align-self: center;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.tenant-artwork-image-frame {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.tenant-artwork-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  background: #f8fafc;
  position: relative;
  z-index: 1;
}

.tenant-artwork-hover-line {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.tenant-artwork-card:hover {
  z-index: 12;
}

.template-hover-card {
  position: fixed;
  z-index: 600;
  width: min(280px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 24px));
  padding: 0.45rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 0.45rem;
  overflow: auto;
  overscroll-behavior: contain;
}

.hover-overlay {
  pointer-events: none;
}

.hover-overlay--bottom-left {
  transform: translate(0, 0);
}

.hover-overlay--bottom-right {
  transform: translate(-100%, 0);
}

.hover-overlay--top-left {
  transform: translate(0, calc(-100% - 16px));
}

.hover-overlay--top-right {
  transform: translate(-100%, calc(-100% - 16px));
}

.template-hover-preview {
  display: flex;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  position: relative;
}

.template-hover-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #ffffff;
}

.template-hover-body {
  display: grid;
  gap: 0.2rem;
  text-align: left;
}

.template-hover-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.template-hover-meta {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 0.35rem;
  align-items: start;
  font-size: 0.72rem;
  color: #475569;
  line-height: 1.3;
}

.template-hover-meta b {
  color: #0f172a;
  font-weight: 700;
}

.tenant-artwork-badges {
  position: absolute;
  top: 0.8rem;
  left: 0.8rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  z-index: 3;
}

.tenant-artwork-content {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.tenant-artwork-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.tenant-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.tenant-card-actions .next-btn {
  flex: 0 0 auto;
}

.tenant-card-link {
  text-decoration: none;
}

.tenant-empty-state {
  margin-top: 1rem;
}

.tenant-empty-state.compact {
  margin-top: 0.9rem;
}

.tenant-pager {
  margin-top: 1rem;
}

.artwork-items {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.artwork-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.75rem;
}

.artwork-thumb-wrap {
  display: flex;
  align-items: flex-start;
}

.thumb {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: cover;
  background: #f8fafc;
}
.item-body {
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
  min-width: 0;
}
.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}
.item-body span {
  color: #64748b;
  font-size: 0.88rem;
}

.item-title-stack {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
}

.item-title-stack strong {
  color: #0f172a;
  font-size: 0.98rem;
  line-height: 1.35;
}

.item-code,
.item-id {
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.73rem;
}

.item-code {
  color: #4338ca;
  font-weight: 700;
}

.item-description {
  margin: 0;
  color: #475569;
  font-size: 0.86rem;
  line-height: 1.5;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
}

.item-meta.secondary {
  gap: 0.45rem 0.65rem;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.24rem 0.6rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 700;
}

.meta-chip.neutral {
  background: #f1f5f9;
  color: #475569;
}

.meta-chip.public,
.status-badge.public {
  background: #dbeafe;
  color: #1d4ed8;
}

.meta-chip.private,
.status-badge.private {
  background: #f3e8ff;
  color: #7e22ce;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: capitalize;
}
.status-badge.muted {
  background: #e2e8f0;
  color: #475569;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
}

.next-btn {
  border: 0;
  border-radius: 12px;
  padding: 0.68rem 0.95rem;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.next-btn.small {
  padding: 0.55rem 0.78rem;
  font-size: 0.84rem;
}

.next-btn.primary {
  background: #2563eb;
  color: #fff;
}

.next-btn.secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.next-btn.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.next-empty-state {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1.15rem;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  color: #475569;
  text-align: center;
}

.repo-empty {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: #64748b;
  padding: 1rem 0.15rem;
}

.repo-empty.compact {
  padding: 0.2rem 0;
}

.next-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 1.5rem 1rem;
  z-index: 1600;
}

.next-modal {
  width: min(760px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: white;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
}

.next-modal-head {
  padding: 1rem 1.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.next-modal-body {
  padding: 1rem 1.1rem 1.15rem;
}

.tenant-modal-status {
  margin-top: 0.9rem;
}

.tenant-modal-actions {
  margin-top: 1rem;
}

.file-picker {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.file-picker-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.file-picker-control {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 48px;
  padding: 0.72rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
}

.file-picker-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.42rem 0.78rem;
  border-radius: 10px;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
}

.file-picker-name {
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-panel {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.submission-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.submission-group + .submission-group {
  margin-top: 1rem;
}

.submission-group-title {
  color: #334155;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.submission-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  background: #f8fafc;
}

.submission-item p {
  margin: 0.35rem 0 0.5rem;
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.5;
}

.submission-body {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.55rem;
}

.submission-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.submission-title-stack {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.18rem;
}

.submission-title-stack strong {
  color: #0f172a;
  font-size: 0.96rem;
  line-height: 1.35;
}

.submission-note {
  margin: 0;
  color: #334155;
  font-size: 0.84rem;
}

.submission-history-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.submission-history {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-top: 1px dashed #cbd5e1;
  padding-top: 0.75rem;
}

.history-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  border-radius: 12px;
  background: #fff;
  padding: 0.7rem 0.8rem;
  border: 1px solid #e2e8f0;
}

.history-action {
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 700;
}

.history-actor,
.history-time,
.history-note {
  color: #475569;
  font-size: 0.8rem;
}

.submission-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
  flex-shrink: 0;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #b45309;
}

.status-badge.status-approved {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 1080px) {
  .repo-toolbar-main,
  .artwork-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .tenant-catalog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .repo-toolbar-filters,
  .next-card-head,
  .panel-header,
  .panel-actions,
  .import-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .artwork-item {
    grid-template-columns: 1fr;
  }

  .item-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .submission-item,
  .submission-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .tenant-artwork-media {
    width: 100%;
    max-width: 180px;
  }


  .tenant-hero-actions,
  .tenant-toolbar-filters,
  .tenant-card-actions,
  .repository-analytics-row {
    flex-direction: column;
    align-items: stretch;
  }

  .repository-analytics-row strong {
    text-align: left;
  }

  .tenant-artwork-card {
    grid-template-columns: 1fr;
  }

  .next-modal {
    width: calc(100vw - 1rem);
    max-height: calc(100vh - 1rem);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .import-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
