<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRoute, useRouter } from "vue-router"
import {
  TEMPLATE_CENTER_LABEL,
  TEMPLATE_REPOSITORY_LABEL,
} from "../../constants/adminTemplateGovernance"
import { useTemplateStore } from "../../stores/templates"
import { useUploadStore } from "../../stores/upload"
import { usePlatformStore } from "../../stores/platform"
import { useAuthStore } from "../../stores/auth"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import RepositoryTemplateCard from "../../components/RepositoryTemplateCard.vue"
import TemplateUploadModal from "../../components/TemplateUploadModal.vue"
import ActionConfirmationModal from "../../components/admin/ActionConfirmationModal.vue"
import { gatewayPlatformFetch, type DeletionPreviewMode, type TemplateDeletionPreviewResponse } from "../../api/client"
import { useInlineNotice } from "../../composables/useInlineNotice"
import { useUiLocaleStore } from "../../stores/uiLocale"
import {
  buildPhysicalDimensionsPayload,
  hydrateUploadPhysicalDimensions,
  normalizePhysicalDimensionsEditor,
  type PhysicalDimensionEditorEntry,
} from "../../utils/templatePhysicalDimensions"
import {
  buildCategoryIdSet,
  buildRepositoryAnalytics,
  canPreviewTemplate,
  canSubmitStatus,
  filterRepositoryItems,
  findCategoryPath,
  formatSubmissionStatus,
  getPreviewTooltip,
  getRepositoryRuntimeKey,
  getTemplateCategoryLabel,
  getTemplateMetaChips,
  hasRuntimeAssets,
  type RepositorySortOption,
  type RepositoryStatusFilter,
  type RepositorySubmissionRecord,
  type RepositoryTemplateItem,
} from "./repositoryView"
import { useRepositoryStatsDialog, useRepositoryTemplateActions } from "./useRepositoryActions"
import { paginateItems, resolveTotalPages } from "../../utils/pagination"

const route = useRoute()
const router = useRouter()
const templateStore = useTemplateStore()
const uploadStore = useUploadStore()
const platformStore = usePlatformStore()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { items } = storeToRefs(templateStore)
const { categories, submissions } = storeToRefs(platformStore)
const { entitlements } = storeToRefs(authStore)
const { locale } = storeToRefs(uiLocaleStore)

const templateName = ref("FN028 Sneaker")
const templateCode = ref("fn028-sneaker")
const selectedFile = ref<File | null>(null)
const selectedCategoryId = ref("")
const repoSearch = ref("")
const selectedRepositoryCategory = ref("all")
const selectedOwner = ref("all")
const ownerLabels = ref<Record<string, string>>({})
const tenantDirectory = ref<Array<{ tenant_id: string; email?: string; name?: string }>>([])
const pendingHighlightTemplateId = ref("")
const selectedStatus = ref<RepositoryStatusFilter>("all")
const selectedSort = ref<RepositorySortOption>("updated")
const repositoryPage = ref(1)
const REPOSITORY_PAGE_SIZE = 12
const repositoryFilterStorageKey = "mockup-admin-repository-filters-v2"
const highlightedTemplateId = ref("")
const isUploadModalOpen = ref(false)
const reuploadTemplateId = ref("")
const reuploadInitialCode = ref("")
const reuploadInitialName = ref("")
const reuploadInitialCategoryId = ref("")

function normalizeRouteQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[value.length - 1] || "").trim()
  return String(value || "").trim()
}

const routedSelectedTemplateId = computed(() => normalizeRouteQueryValue(route.query.selected))
const routedNoticeMessage = computed(() => normalizeRouteQueryValue(route.query.notice))
const routedNoticeTone = computed<"success" | "danger">(() => (
  normalizeRouteQueryValue(route.query.tone) === "danger" ? "danger" : "success"
))
const routedOpenPermission = computed(() => normalizeRouteQueryValue(route.query.openPermission) === "1")

const REPOSITORY_I18N = {
  en: {
    templateLibrary: "Template Library",
    allUsers: "All Users",
    allStatuses: "All Statuses",
    platform: "Platform",
    pageDesc: "Manage and govern the templates in your repository.",
    uploadTemplate: "Upload Template",
    totalTemplates: "Total Templates",
    publishedHint: "published",
    drafts: "Drafts",
    draftHint: "draft or unlisted",
    apiCoverage: "API Coverage",
    apiDisabledHint: "API disabled",
    reviewQueue: "Review Queue",
    reviewQueueHint: "changes requested",
    approved: "approved",
    searchPlaceholder: "Search template name or code",
    allCategories: "All Categories",
    selectLevel2: "Select Level 2",
    selectLevel3: "Select Level 3",
    noTemplatesYet: "No templates in {label} yet.",
    noTemplatesTenantYet: "No templates in your {label} yet.",
    uploadToStart: "Upload a template to start building the library.",
    noMatchTitle: "No {label} items match the current filters.",
    clearFiltersDesc: "Clear filters or search to see more templates.",
    templateUploaded: "Template {name} uploaded successfully. Redirecting to Edit Template so you can set each part size in centimeters.",
    confirm: "Confirm",
    note: "Note",
    listTemplate: "List Template",
    unlistTemplate: "Unlist Template",
    listTemplateMessage: "List template \"{id}\" and automatically enable Open API access?",
    unlistTemplateMessage: "Unlist template \"{id}\"?",
    listingAccessScope: "Listing Access",
    publicScopeOption: "Public",
    privateScopeOption: "Private",
    editPermission: "Permission",
    editPermissionTitle: "Edit Permission",
    editPermissionMessage: "Choose the repository permission for template \"{id}\".",
    draftPermissionMessage: "Draft templates stay private until they are listed.",
    publicScopeHint: "Visible in repository and eligible for Template Center review once listed.",
    privateScopeHint: "Kept private after listing and blocked from Template Center review.",
    impact: "Impact",
    scope: "Scope",
    requirement: "Requirement",
    listImpact: "publishing immediately enables Open API access and makes the template eligible for Template Center submission.",
    listScope: "platform modules can use published templates even if API is later disabled. Listing still does not automatically create a marketplace listing in {centerLabel}.",
    unlistImpact: "API access will be disabled if it is currently enabled.",
    unlistScope: "the template remains editable in {repoLabel} but is no longer treated as listed.",
    enableApi: "Enable API",
    disableApi: "Disable API",
    enableApiMessage: "Enable Open API access for template \"{id}\"?",
    disableApiMessage: "Disable Open API access for template \"{id}\"?",
    enableApiRequirement: "the template must already be published before Open API can be enabled.",
    enableApiImpact: "tenant API clients will be able to call this template immediately after the change takes effect.",
    enableApiScope: "this only changes Open API availability in {repoLabel}; published templates remain available inside platform modules and this still does not create a marketplace listing.",
    disableApiImpact: "all Open API requests for this template will stop working immediately after confirmation.",
    disableApiScope: "the template remains usable inside platform modules while it stays published, and its files are preserved until you explicitly delete it.",
    submitForReview: "Submit For Review",
    resubmitForReview: "Resubmit For Review",
    submitMessage: "Submit template \"{id}\" to Template Center for review?",
    resubmitMessage: "Resubmit template \"{id}\" to Template Center for another review round?",
    templateLabel: "Template",
    reviewDestinationNew: "Review destination: a new Template Center submission will be created and routed to the reviewer queue.",
    reviewDestinationExisting: "Review destination: the existing Template Center submission will be reopened and routed back into the reviewer queue.",
    reviewImpact: "reviewers will see the submission note below during the review process, and your template will enter the audit workflow after confirmation.",
    submissionNote: "Submission Note",
    submissionNotePlaceholder: "Optional note for reviewers",
    submittedFromConsole: "Submitted from Console",
    resubmit: "Resubmit",
    submit: "Submit",
    publicOnlyForReview: "Public Only",
    deleteTemplate: "Delete Template",
    deleteMessage: "Delete template \"{id}\"? This action is permanent and cannot be undone.",
    deleteAutoMessage: "Delete template \"{id}\"? This action cannot be undone. Please confirm.",
    irreversibleImpact: "this removes the template record from the platform database and deletes runtime template files, generated assets, and storage content.",
    deleteScope: "category bindings, Template Center listings, submissions, review history, usage-linked records, and related governance data will be deleted together.",
    deleteAutomaticScope: "the system decides whether to hide, soft delete, or purge the template after checking live references and governance records.",
    hideTemplate: "Hide Template",
    softDeleteTemplate: "Soft Delete Template",
    purgeTemplate: "Purge Template",
    hideDeleteMessage: "Template \"{id}\" is still linked to critical usage. Confirm to hide it from active pages only.",
    softDeleteMessage: "Soft delete template \"{id}\"? Non-critical references will be cleaned and the template will be removed from active pages.",
    purgeDeleteMessage: "Purge template \"{id}\"? This will request cleanup and asynchronous resource purge after references are cleared.",
    deletePreviewUsageSummary: "Usage summary",
    deletePreviewUsageCounts: "critical {critical}, non-critical {nonCritical}, transient {transient}",
    deletePreviewWarnings: "Warnings",
    deletePreviewCleanup: "Cleanup plan",
    deleteMode: "Deletion Mode",
    currentVisibility: "Current visibility",
    listedState: "listed",
    draftState: "draft",
    apiEnabledState: "API enabled",
    apiDisabledState: "API disabled",
    marketplaceListings: "Marketplace listings affected",
    categoryBindings: "Category bindings affected",
    submissionRecords: "Submission records",
    runtimePreviewData: "Runtime preview data affected",
    protectedReferences: "Protected references",
    hideDeleteScope: "historical records stay preserved; the template is only hidden from creative space pages and future listings.",
    softDeleteScope: "non-critical preview and governance references will be cleaned before the template enters logical deletion.",
    purgeDeleteScope: "after cleanup, the template will enter the asynchronous purge queue for deeper resource reclamation.",
    delete: "Delete",
    cancel: "Cancel",
    deletingAction: "Deleting...",
    savingAction: "Saving...",
    submittingAction: "Submitting...",
    templateStats: "Template Stats",
    loading: "Loading...",
    totalImages: "Total Images",
    templateSize: "Template Size",
    structure: "Structure",
    runtimeReady: "Runtime Ready",
    yes: "Yes",
    no: "No",
    manifestPresent: "Manifest Present",
    colors: "Colors",
    category: "Category",
    na: "N/A",
    noImagesYet: "No images recorded yet.",
    noImagesDesc: "Generate previews or exports to populate stats.",
    listFirst: "List First",
    unlist: "Unlist",
    list: "List",
    partsViews: "{parts} parts / {views} views",
  },
  zh: {
    templateLibrary: "模板库",
    allUsers: "全部用户",
    allStatuses: "全部状态",
    platform: "平台",
    pageDesc: "管理并治理仓库中的模板。",
    uploadTemplate: "上传模板",
    totalTemplates: "模板总数",
    publishedHint: "已上架",
    drafts: "草稿",
    draftHint: "草稿或未上架",
    apiCoverage: "API 覆盖",
    apiDisabledHint: "API 已禁用",
    reviewQueue: "审核队列",
    reviewQueueHint: "要求修改",
    approved: "已通过",
    searchPlaceholder: "搜索模板名称或编码",
    allCategories: "全部分类",
    selectLevel2: "选择二级分类",
    selectLevel3: "选择三级分类",
    noTemplatesYet: "{label}中还没有模板。",
    noTemplatesTenantYet: "你的{label}中还没有模板。",
    uploadToStart: "上传模板以开始建设模板库。",
    noMatchTitle: "当前筛选条件下没有匹配的{label}项目。",
    clearFiltersDesc: "清空筛选或搜索以查看更多模板。",
    templateUploaded: "模板 {name} 上传成功。正在跳转到编辑页，以便为每个面设置厘米尺寸。",
    confirm: "确认",
    note: "备注",
    listTemplate: "上架模板",
    unlistTemplate: "下架模板",
    listTemplateMessage: "上架模板“{id}”并自动启用 Open API 访问吗？",
    unlistTemplateMessage: "确定下架模板“{id}”吗？",
    listingAccessScope: "上架权限",
    publicScopeOption: "公开",
    privateScopeOption: "私有",
    editPermission: "权限",
    editPermissionTitle: "编辑权限",
    editPermissionMessage: "请选择模板“{id}”的权限。",
    draftPermissionMessage: "未上架模板在上架前只能保持私有。",
    publicScopeHint: "上架后在模板库中标记为 Public，并可继续提交模板中心审核。",
    privateScopeHint: "上架后保持私有，仅在模板库中标记为 Private，不能提交模板中心审核。",
    impact: "影响",
    scope: "范围",
    requirement: "要求",
    listImpact: "发布后会立即启用 Open API 访问，并使模板具备提交到模板中心的资格。",
    listScope: "即使后续禁用 API，平台模块仍可使用已发布模板。上架仍不会自动在{centerLabel}创建市场列表。",
    unlistImpact: "如果当前已启用 API，将同时被禁用。",
    unlistScope: "模板仍可在{repoLabel}中编辑，但不再视为已上架。",
    enableApi: "启用 API",
    disableApi: "禁用 API",
    enableApiMessage: "为模板“{id}”启用 Open API 访问吗？",
    disableApiMessage: "为模板“{id}”禁用 Open API 访问吗？",
    enableApiRequirement: "必须先发布模板，才能启用 Open API。",
    enableApiImpact: "变更生效后，租户 API 客户端将可立即调用该模板。",
    enableApiScope: "这里只改变{repoLabel}中的 Open API 可用性；已发布模板仍可在平台模块内部使用，也不会自动创建市场列表。",
    disableApiImpact: "确认后，所有针对该模板的 Open API 请求都会立即失效。",
    disableApiScope: "模板在保持已发布状态时仍可在平台模块内部使用，文件也会保留，直到你显式删除它。",
    submitForReview: "提交审核",
    resubmitForReview: "重新提交审核",
    submitMessage: "将模板“{id}”提交到模板中心审核吗？",
    resubmitMessage: "将模板“{id}”重新提交到模板中心进行下一轮审核吗？",
    templateLabel: "模板",
    reviewDestinationNew: "审核去向：将创建新的模板中心投稿并进入审核队列。",
    reviewDestinationExisting: "审核去向：现有模板中心投稿将重新打开并返回审核队列。",
    reviewImpact: "审核人员会在流程中看到下面的投稿备注，确认后模板将进入审核工作流。",
    submissionNote: "投稿备注",
    submissionNotePlaceholder: "给审核人员的可选备注",
    submittedFromConsole: "从控制台提交",
    resubmit: "重新提交",
    submit: "提交",
    publicOnlyForReview: "仅公开可提审",
    deleteTemplate: "删除模板",
    deleteMessage: "删除模板“{id}”？此操作不可恢复。",
    deleteAutoMessage: "删除模板“{id}”？删除后无法恢复，请确认。",
    irreversibleImpact: "这会从平台数据库中移除模板记录，并删除运行时模板文件、生成资源和存储内容。",
    deleteScope: "分类绑定、模板中心列表、投稿、审核历史、关联使用记录及相关治理数据都会一并删除。",
    deleteAutomaticScope: "系统会在检查线上引用和治理记录后，自动决定执行隐藏、软删除或资源回收。",
    hideTemplate: "隐藏模板",
    softDeleteTemplate: "软删除模板",
    purgeTemplate: "回收模板",
    hideDeleteMessage: "模板“{id}”仍关联关键使用记录，确认后只会从活跃页面隐藏，不会执行删除回收。",
    softDeleteMessage: "软删除模板“{id}”？会清理非关键引用，并将模板从活跃页面移除。",
    purgeDeleteMessage: "回收模板“{id}”？会先执行清理，再进入异步资源回收队列。",
    deletePreviewUsageSummary: "引用概览",
    deletePreviewUsageCounts: "关键 {critical}，非关键 {nonCritical}，临时 {transient}",
    deletePreviewWarnings: "风险提示",
    deletePreviewCleanup: "清理计划",
    deleteMode: "删除模式",
    currentVisibility: "当前可见性",
    listedState: "已上架",
    draftState: "草稿",
    apiEnabledState: "API 已启用",
    apiDisabledState: "API 已禁用",
    marketplaceListings: "受影响的市场列表",
    categoryBindings: "受影响的分类绑定",
    submissionRecords: "投稿记录",
    runtimePreviewData: "受影响的预览数据",
    protectedReferences: "受保护引用",
    hideDeleteScope: "历史记录会保留，模板只会从创作空间页面和后续列表中隐藏。",
    softDeleteScope: "会先清理非关键预览和治理引用，再进入逻辑删除状态。",
    purgeDeleteScope: "清理完成后，模板会进入异步回收队列，进一步释放资源。",
    delete: "删除",
    cancel: "取消",
    deletingAction: "删除中...",
    savingAction: "保存中...",
    submittingAction: "提交中...",
    templateStats: "模板统计",
    loading: "加载中...",
    totalImages: "图片总数",
    templateSize: "模板尺寸",
    structure: "结构",
    runtimeReady: "运行时就绪",
    yes: "是",
    no: "否",
    manifestPresent: "Manifest 已存在",
    colors: "颜色",
    category: "分类",
    na: "无",
    noImagesYet: "还没有记录到图片。",
    noImagesDesc: "生成预览或导出后会显示统计数据。",
    listFirst: "先上架",
    unlist: "下架",
    list: "上架",
    partsViews: "{parts} 个面 / {views} 个视图",
  },
} as const

function t(key: keyof typeof REPOSITORY_I18N.en) {
  return REPOSITORY_I18N[locale.value][key] || REPOSITORY_I18N.en[key]
}

function formatText(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || "")
}

const repositoryStatusOptions = computed(() => [
  { value: "all" as const, label: t("allStatuses") },
  { value: "api_enabled" as const, label: locale.value === "zh" ? "API 已启用" : "API Enabled" },
  { value: "api_disabled" as const, label: locale.value === "zh" ? "API 已禁用" : "API Disabled" },
  { value: "physical_size_missing" as const, label: locale.value === "zh" ? "缺少物理尺寸" : "Physical Size Missing" },
  { value: "under_review" as const, label: locale.value === "zh" ? "审核中" : "Under Review" },
  { value: "changes_requested" as const, label: locale.value === "zh" ? "要求修改" : "Changes Requested" },
  { value: "approved" as const, label: locale.value === "zh" ? "中心已通过" : "Center Approved" },
  { value: "rejected" as const, label: locale.value === "zh" ? "已拒绝" : "Rejected" },
])

const repositorySortOptions = computed(() => [
  { value: "updated" as const, label: locale.value === "zh" ? "按更新时间排序" : "Sort by Updated" },
  { value: "name" as const, label: locale.value === "zh" ? "按名称排序" : "Sort by Name" },
])

function formatLocalizedSubmissionStatus(status: string): string {
  if (locale.value !== "zh") {
    return formatSubmissionStatus(status)
  }
  switch (status) {
    case "submitted":
    case "under_review":
      return "审核中"
    case "changes_requested":
      return "要求修改"
    case "approved":
      return "中心已通过"
    case "rejected":
      return "已拒绝"
    default:
      return status || "未提交"
  }
}

const submissionByTemplateId = computed(() => {
  const map: Record<string, RepositorySubmissionRecord> = {}
  for (const item of submissions.value || []) {
    if (!item?.template_id) continue
    if (item.is_active_for_repository === false) continue
    map[item.template_id] = item
  }
  return map
})

const categoryRoots = computed(() => categories.value)

const latestCategoryIdSet = computed(() => {
  const ids = new Set<string>()
  const walk = (nodes: any[]) => {
    nodes.forEach((node) => {
      ids.add(node.category_id)
      if (node.children?.length) walk(node.children)
    })
  }
  walk(categoryRoots.value)
  return ids
})

const selectedRepositoryCategoryIdSet = computed(() => {
  return buildCategoryIdSet(selectedRepositoryCategory.value, categoryRoots.value)
})

const visibleRepositoryItems = computed(() => {
  if (authStore.isPlatformAdmin) return items.value
  const tenantId = authStore.tenant?.tenant_id
  if (!tenantId) return []
  return items.value.filter((item) => item.owner_tenant_id === tenantId)
})

const ownerOptions = computed(() => {
  if (!authStore.isPlatformAdmin) {
    const tenantId = authStore.tenant?.tenant_id
    return tenantId ? [tenantId] : []
  }
  const tenantIds = tenantDirectory.value.map((item) => item.tenant_id).filter(Boolean)
  if (tenantIds.length) return tenantIds.sort()
  return Array.from(new Set(items.value.map((item) => item.owner_tenant_id || "platform"))).sort()
})

const ownerDropdownOptions = computed(() => [
  { value: "all", label: t("allUsers") },
  ...ownerOptions.value.map((owner) => ({ value: owner, label: resolveOwnerLabel(owner) })),
])

function resolveOwnerLabel(ownerId: string) {
  if (ownerId === "all") return t("allUsers")
  if (ownerId === "platform") return t("platform")
  return ownerLabels.value[ownerId] || ownerId
}

async function hydrateOwnerLabels() {
  if (!authStore.isPlatformAdmin) return
  try {
    const tenants = await gatewayPlatformFetch<Array<{ tenant_id: string; email?: string; name?: string }>>("/api/v1/tenants", {
      headers: authStore.authHeaders,
    })
    tenantDirectory.value = tenants
    ownerLabels.value = {
      ...ownerLabels.value,
      ...Object.fromEntries(tenants.map((item) => [item.tenant_id, item.email || item.name || item.tenant_id])),
    }
  } catch {
    tenantDirectory.value = []
  }
  const ownerIds = ownerOptions.value.filter((ownerId) => ownerId !== "platform" && !(ownerId in ownerLabels.value))
  if (!ownerIds.length) return
  const pairs = await Promise.all(ownerIds.map(async (ownerId) => {
    try {
      const payload = await gatewayPlatformFetch<{ tenant_id?: string; email?: string; name?: string }>(`/api/v1/tenants/${encodeURIComponent(ownerId)}`, {
        headers: authStore.authHeaders,
      })
      return [ownerId, payload.email || payload.name || ownerId] as const
    } catch {
      return [ownerId, ownerId] as const
    }
  }))
  ownerLabels.value = {
    ...ownerLabels.value,
    ...Object.fromEntries(pairs),
  }
}

const filteredRepository = computed(() => {
  return filterRepositoryItems({
    items: visibleRepositoryItems.value,
    keyword: repoSearch.value,
    selectedCategoryId: selectedRepositoryCategory.value,
    selectedCategoryIdSet: selectedRepositoryCategoryIdSet.value,
    selectedOwner: selectedOwner.value,
    selectedStatus: selectedStatus.value,
    selectedSort: selectedSort.value,
    isPlatformAdmin: authStore.isPlatformAdmin,
    submissions: submissionByTemplateId.value,
  })
})

const repositoryAnalytics = computed(() => {
  return buildRepositoryAnalytics(
    visibleRepositoryItems.value,
    filteredRepository.value,
    submissionByTemplateId.value,
  )
})
const repositoryTotalPages = computed(() => resolveTotalPages(filteredRepository.value.length, REPOSITORY_PAGE_SIZE))
const paginatedRepository = computed(() => paginateItems(filteredRepository.value, repositoryPage.value, REPOSITORY_PAGE_SIZE))

const repositoryEmptyState = computed(() => {
  const templateLibraryLabel = locale.value === "zh" ? t("templateLibrary") : t("templateLibrary").toLowerCase()
  if (!visibleRepositoryItems.value.length) {
    return {
      title: authStore.isPlatformAdmin
        ? formatText(t("noTemplatesYet"), { label: t("templateLibrary") })
        : formatText(t("noTemplatesTenantYet"), { label: templateLibraryLabel }),
      description: t("uploadToStart"),
    }
  }
  return {
    title: formatText(t("noMatchTitle"), { label: templateLibraryLabel }),
    description: t("clearFiltersDesc"),
  }
})

const {
  pageNotice,
  clearPageNotice,
  setPageNotice,
  togglePublishStatus,
  toggleTenantApiStatus,
  removeTemplate,
  submitTemplate,
} = useRepositoryTemplateActions({
  templateStore,
  platformStore: platformStore as Parameters<typeof useRepositoryTemplateActions>[0]["platformStore"],
  authHeaders: authStore.authHeaders,
  isTenantAdmin: computed(() => authStore.isTenantAdmin),
  isPlatformAdmin: computed(() => authStore.isPlatformAdmin),
  tenantId: computed(() => authStore.tenant?.tenant_id),
  items,
  submissionByTemplateId,
  refreshData,
})

const {
  statsModalOpen,
  statsLoading,
  statsNotice,
  statsTemplateId,
  statsTotal,
  statsBySize,
  statsSummary,
  openTemplateStats,
  closeTemplateStats,
} = useRepositoryStatsDialog(authStore.authHeaders)

const confirmModalOpen = ref(false)
const confirmModalLoading = ref(false)
const confirmModalTitle = ref("")
const confirmModalMessage = ref("")
const confirmModalConfirmText = ref("Confirm")
const confirmModalLoadingText = ref<string>(t("savingAction"))
const confirmModalTone = ref<"primary" | "danger">("primary")
const confirmModalDetails = ref<string[]>([])
const confirmModalShowHint = ref(true)
const confirmModalShowToneBadge = ref(true)
const confirmModalNote = ref("")
const confirmModalNoteLabel = ref("Note")
const confirmModalNotePlaceholder = ref("")
const confirmModalNoteRequired = ref(false)
const confirmModalError = ref("")
const confirmModalDeleteMode = ref<DeletionPreviewMode>("soft_delete")
const confirmModalChoiceLabel = ref("")
const confirmModalChoiceValue = ref("")
const confirmModalChoiceRequired = ref(false)
const confirmModalChoiceOptions = ref<Array<{ value: string; label: string; description?: string }>>([])
const pendingRepositoryAction = ref<
  | { kind: "toggle-publish"; item: Pick<RepositoryTemplateItem, "template_id" | "publish_status" | "access_scope"> }
  | { kind: "toggle-access"; item: Pick<RepositoryTemplateItem, "template_id" | "publish_status" | "access_scope"> }
  | { kind: "toggle-api"; item: Pick<RepositoryTemplateItem, "template_id" | "tenant_api_status" | "publish_status"> }
  | { kind: "submit"; templateId: string }
  | {
      kind: "remove"
      item: Pick<RepositoryTemplateItem, "template_id" | "template_code" | "display_name" | "cover_url" | "parts_count" | "views_count" | "colors">
      mode: DeletionPreviewMode
    }
  | null
>(null)

async function refreshData() {
  await Promise.all([
    templateStore.load(),
    platformStore.loadTemplateCategories(authStore.authHeaders).catch(() => []),
    platformStore.loadSubmissions({
      auth: authStore.authHeaders,
      tenantId: authStore.isPlatformAdmin ? undefined : authStore.tenant?.tenant_id,
      status: "",
    }).catch(() => []),
  ])
  await hydrateOwnerLabels()
}

function resetRepositoryFiltersForUpload() {
  repoSearch.value = ""
  selectedRepositoryCategory.value = "all"
  selectedOwner.value = "all"
  selectedStatus.value = "all"
  selectedSort.value = "updated"
}

function resetRepositoryFiltersForDeepLink() {
  resetRepositoryFiltersForUpload()
}

function buildUploadPhysicalDimensionsFromInspection() {
  return buildPhysicalDimensionsPayload({
    parts: hydrateUploadPhysicalDimensions({
      candidates: uploadStore.inspection?.physical_dimensions_candidates,
      configured: (uploadStore.inspection?.suggested_config?.physical_dimensions_cm?.parts || {}) as any,
    }),
  })
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

function openUploadModal() {
  if (!categoryRoots.value.length) {
    void platformStore.loadTemplateCategories(authStore.authHeaders)
      .catch(() => [])
  }
  reuploadTemplateId.value = ""
  reuploadInitialCode.value = ""
  reuploadInitialName.value = ""
  reuploadInitialCategoryId.value = ""
  isUploadModalOpen.value = true
}

function openReuploadModal(item: RepositoryTemplateItem) {
  if (!item?.template_id) return
  if (!categoryRoots.value.length) {
    void platformStore.loadTemplateCategories(authStore.authHeaders)
      .catch(() => [])
  }
  reuploadTemplateId.value = item.template_id
  reuploadInitialCode.value = String(item.template_code || "").trim()
  reuploadInitialName.value = String(item.display_name || "").trim()
  reuploadInitialCategoryId.value = String(item.category_id || "").trim()
  isUploadModalOpen.value = true
}

function closeUploadModal() {
  isUploadModalOpen.value = false
  reuploadTemplateId.value = ""
  reuploadInitialCode.value = ""
  reuploadInitialName.value = ""
  reuploadInitialCategoryId.value = ""
}

async function handleUploadSuccess(result: any) {
  const templateId = String(result?.template_id || "").trim()
  resetRepositoryFiltersForUpload()
  setPageNotice("success", formatText(t("templateUploaded"), {
    name: String(result?.template_code || result?.display_name || t("templateLabel")),
  }))
  if (!templateId) {
    closeUploadModal()
    await templateStore.load().catch(() => undefined)
    return
  }
  pendingHighlightTemplateId.value = templateId
  void templateStore.load().catch(() => undefined)
  // 关闭 Modal 之前等待 runtime 资源 + DB 字段就绪,
  // 防止 editor 进入后立即出现 /editor /validation 404 闪现 + 字段空白。
  // 即使最终未就绪也跳转过去,由 editor 端的 skeleton/重试兜底。
  try {
    await uploadStore.waitForUploadReady(templateId, { timeoutMs: 30000, intervalMs: 800 })
  } catch {
    // 忽略,无论如何尝试跳转
  }
  closeUploadModal()
  await router.replace({ path: "/admin/editor", query: { template: templateId, setup_physical_size: "1" } })
}

function openTemplateEditor(templateId: string) {
  if (!templateId) return
  const item = items.value.find((entry) =>
    entry.runtime_key === templateId || entry.template_id === templateId || entry.template_code === templateId,
  ) || null
  const governanceTemplateId = item?.template_id || templateId
  router.push({ path: "/admin/editor", query: { template: governanceTemplateId } })
}

function previewTemplate(templateId: string) {
  router.push({ path: "/preview", query: { template_id: templateId, source: "repository" } })
}

function openRepositoryConfirmModal(config: {
  title: string
  message: string
  details?: string[]
  confirmText: string
  loadingText?: string
  tone?: "primary" | "danger"
  note?: string
  noteLabel?: string
  notePlaceholder?: string
  noteRequired?: boolean
  showHint?: boolean
  showToneBadge?: boolean
  choiceLabel?: string
  choiceValue?: string
  choiceRequired?: boolean
  choiceOptions?: Array<{ value: string; label: string; description?: string }>
}) {
  confirmModalTitle.value = config.title
  confirmModalMessage.value = config.message
  confirmModalConfirmText.value = config.confirmText
  confirmModalLoadingText.value = config.loadingText || t("savingAction")
  confirmModalTone.value = config.tone || "primary"
  confirmModalDetails.value = config.details || []
  confirmModalShowHint.value = config.showHint ?? true
  confirmModalShowToneBadge.value = config.showToneBadge ?? true
  confirmModalNote.value = config.note || ""
  confirmModalNoteLabel.value = config.noteLabel || t("note")
  confirmModalNotePlaceholder.value = config.notePlaceholder || ""
  confirmModalNoteRequired.value = Boolean(config.noteRequired)
  confirmModalChoiceLabel.value = config.choiceLabel || ""
  confirmModalChoiceValue.value = config.choiceValue || ""
  confirmModalChoiceRequired.value = Boolean(config.choiceRequired)
  confirmModalChoiceOptions.value = config.choiceOptions || []
  confirmModalError.value = ""
  confirmModalOpen.value = true
}

function resolveTemplateDeletionMode(preview: TemplateDeletionPreviewResponse): DeletionPreviewMode {
  return preview.recommended_mode || "soft_delete"
}

function buildTemplateDeletionModalConfig(
  item: Pick<RepositoryTemplateItem, "template_id" | "template_code" | "display_name" | "cover_url" | "parts_count" | "views_count" | "colors">,
  preview: TemplateDeletionPreviewResponse,
) {
  const mode = resolveTemplateDeletionMode(preview)
  const templateCode = String(item.template_code || "").trim()
  const displayName = String(item.display_name || "").trim()
  const details = [
    `${t("templateLabel")}: ${item.template_id}`,
    templateCode ? `Code: ${templateCode}` : "",
    displayName ? `Name: ${displayName}` : "",
  ].filter(Boolean)
  return {
    mode,
    title: t("deleteTemplate"),
    message: formatText(t("deleteAutoMessage"), { id: item.template_id }),
    details,
    confirmText: t("delete"),
    loadingText: t("deletingAction"),
    tone: "danger" as const,
    showHint: false,
    showToneBadge: false,
  }
}

function requestTogglePublishStatus(item: Pick<RepositoryTemplateItem, "template_id" | "publish_status" | "access_scope">) {
  pendingRepositoryAction.value = { kind: "toggle-publish", item }
  const isPublishing = item.publish_status !== "published"
  openRepositoryConfirmModal({
    title: isPublishing ? t("listTemplate") : t("unlistTemplate"),
    message: isPublishing
      ? formatText(t("listTemplateMessage"), { id: item.template_id })
      : formatText(t("unlistTemplateMessage"), { id: item.template_id }),
    details: isPublishing
      ? [
          `${t("templateLabel")}: ${item.template_id}`,
          `${t("impact")}: ${t("listImpact")}`,
          `${t("scope")}: ${formatText(t("listScope"), { centerLabel: TEMPLATE_CENTER_LABEL })}`,
        ]
      : [
          `${t("templateLabel")}: ${item.template_id}`,
          `${t("impact")}: ${t("unlistImpact")}`,
          `${t("scope")}: ${formatText(t("unlistScope"), { repoLabel: TEMPLATE_REPOSITORY_LABEL })}`,
        ],
    confirmText: isPublishing ? t("listTemplate") : t("unlistTemplate"),
    loadingText: t("savingAction"),
    tone: isPublishing ? "primary" : "danger",
    choiceLabel: isPublishing ? t("listingAccessScope") : "",
    choiceValue: isPublishing ? (item.access_scope || "public") : "",
    choiceRequired: isPublishing,
    choiceOptions: isPublishing
      ? [
          {
            value: "public",
            label: t("publicScopeOption"),
            description: t("publicScopeHint"),
          },
          {
            value: "private",
            label: t("privateScopeOption"),
            description: t("privateScopeHint"),
          },
        ]
      : [],
  })
}

function requestEditAccessScope(item: Pick<RepositoryTemplateItem, "template_id" | "publish_status" | "access_scope">) {
  const isPublished = item.publish_status === "published"
  pendingRepositoryAction.value = { kind: "toggle-access", item }
  openRepositoryConfirmModal({
    title: t("editPermissionTitle"),
    message: isPublished
      ? formatText(t("editPermissionMessage"), { id: item.template_id })
      : t("draftPermissionMessage"),
    confirmText: t("confirm"),
    loadingText: t("savingAction"),
    tone: "primary",
    choiceLabel: t("listingAccessScope"),
    choiceValue: isPublished
      ? (item.access_scope === "public" ? "public" : "private")
      : "private",
    choiceRequired: true,
    choiceOptions: isPublished
      ? [
          {
            value: "public",
            label: t("publicScopeOption"),
            description: t("publicScopeHint"),
          },
          {
            value: "private",
            label: t("privateScopeOption"),
            description: t("privateScopeHint"),
          },
        ]
      : [
          {
            value: "private",
            label: t("privateScopeOption"),
            description: t("privateScopeHint"),
          },
        ],
  })
}

function requestToggleTenantApiStatus(item: Pick<RepositoryTemplateItem, "template_id" | "tenant_api_status" | "publish_status">) {
  pendingRepositoryAction.value = { kind: "toggle-api", item }
  const isEnabling = item.tenant_api_status !== "enabled"
  openRepositoryConfirmModal({
    title: isEnabling ? t("enableApi") : t("disableApi"),
    message: isEnabling
      ? formatText(t("enableApiMessage"), { id: item.template_id })
      : formatText(t("disableApiMessage"), { id: item.template_id }),
    details: isEnabling
      ? [
          `${t("templateLabel")}: ${item.template_id}`,
          `${t("requirement")}: ${t("enableApiRequirement")}`,
          `${t("impact")}: ${t("enableApiImpact")}`,
          `${t("scope")}: ${formatText(t("enableApiScope"), { repoLabel: TEMPLATE_REPOSITORY_LABEL })}`,
        ]
      : [
          `${t("templateLabel")}: ${item.template_id}`,
          `${t("impact")}: ${t("disableApiImpact")}`,
          `${t("scope")}: ${t("disableApiScope")}`,
        ],
    confirmText: isEnabling ? t("enableApi") : t("disableApi"),
    loadingText: t("savingAction"),
    tone: isEnabling ? "primary" : "danger",
  })
}

function requestSubmitTemplate(templateId: string) {
  const submission = submissionByTemplateId.value[templateId]
  const isResubmission = Boolean(submission?.status)
  pendingRepositoryAction.value = { kind: "submit", templateId }
  openRepositoryConfirmModal({
    title: isResubmission ? t("resubmitForReview") : t("submitForReview"),
    message: isResubmission
      ? formatText(t("resubmitMessage"), { id: templateId })
      : formatText(t("submitMessage"), { id: templateId }),
    details: [
      `${t("templateLabel")}: ${templateId}`,
      isResubmission
        ? t("reviewDestinationExisting")
        : t("reviewDestinationNew"),
      t("reviewImpact"),
    ],
    confirmText: isResubmission ? t("resubmit") : t("submit"),
    loadingText: t("submittingAction"),
    note: t("submittedFromConsole"),
    noteLabel: t("submissionNote"),
    notePlaceholder: t("submissionNotePlaceholder"),
  })
}

async function requestRemoveTemplate(item: Pick<RepositoryTemplateItem, "template_id" | "template_code" | "display_name" | "cover_url" | "parts_count" | "views_count" | "colors">) {
  clearPageNotice()
  try {
    const preview = await templateStore.previewDeletion(item.template_id)
    const modalConfig = buildTemplateDeletionModalConfig(item, preview)
    confirmModalDeleteMode.value = modalConfig.mode
    pendingRepositoryAction.value = { kind: "remove", item, mode: modalConfig.mode }
    openRepositoryConfirmModal(modalConfig)
  } catch (err) {
    setPageNotice("danger", String((err as Error).message || err))
  }
}

function closeRepositoryConfirmModal() {
  confirmModalOpen.value = false
  confirmModalError.value = ""
  confirmModalDeleteMode.value = "soft_delete"
  confirmModalLoadingText.value = t("savingAction")
  confirmModalChoiceLabel.value = ""
  confirmModalChoiceValue.value = ""
  confirmModalChoiceRequired.value = false
  confirmModalChoiceOptions.value = []
  confirmModalShowHint.value = true
  confirmModalShowToneBadge.value = true
  pendingRepositoryAction.value = null
}

async function confirmRepositoryAction(note: string, choiceValue: string) {
  if (!pendingRepositoryAction.value) return
  confirmModalLoading.value = true
  confirmModalError.value = ""
  try {
    if (pendingRepositoryAction.value.kind === "toggle-publish") {
      await togglePublishStatus(
        pendingRepositoryAction.value.item,
        (choiceValue || confirmModalChoiceValue.value || pendingRepositoryAction.value.item.access_scope || "public") as "public" | "private",
      )
    } else if (pendingRepositoryAction.value.kind === "toggle-access") {
      await templateStore.setAccessScope(
        pendingRepositoryAction.value.item.template_id,
        ((choiceValue || confirmModalChoiceValue.value || "private") === "public" ? "public" : "private"),
      )
    } else if (pendingRepositoryAction.value.kind === "toggle-api") {
      await toggleTenantApiStatus(pendingRepositoryAction.value.item)
    } else if (pendingRepositoryAction.value.kind === "submit") {
      await submitTemplate(pendingRepositoryAction.value.templateId, note)
    } else {
      await removeTemplate(pendingRepositoryAction.value.item, pendingRepositoryAction.value.mode || confirmModalDeleteMode.value)
    }
    closeRepositoryConfirmModal()
  } catch (err) {
    confirmModalError.value = String((err as Error).message || err)
  } finally {
    confirmModalLoading.value = false
  }
}

function applyRecentCategoryFilter(categoryId: string) {
  selectedRepositoryCategory.value = categoryId
}

function saveFilters() {
  localStorage.setItem(repositoryFilterStorageKey, JSON.stringify({
    search: repoSearch.value,
    category: selectedRepositoryCategory.value,
    owner: selectedOwner.value,
    status: selectedStatus.value,
    sort: selectedSort.value,
  }))
}

function loadFilters() {
  try {
    const saved = localStorage.getItem(repositoryFilterStorageKey)
    if (!saved) return
    const parsed = JSON.parse(saved)
    repoSearch.value = parsed.search || ""
    selectedRepositoryCategory.value = parsed.category || "all"
    selectedOwner.value = parsed.owner || "all"
    selectedStatus.value = parsed.status || "all"
    selectedSort.value = parsed.sort || "updated"
  } catch (err) {
    console.error("failed to load repository filters", err)
  }
}

function syncRepositoryPageToSelectedTemplate(templateId: string) {
  if (!templateId) return
  const selectedIndex = filteredRepository.value.findIndex((item) => (
    item.template_id === templateId
    || item.template_code === templateId
    || item.runtime_key === templateId
  ))
  if (selectedIndex >= 0) {
    repositoryPage.value = Math.floor(selectedIndex / REPOSITORY_PAGE_SIZE) + 1
  }
}

function clearFeedbackRouteQuery() {
  const handledQueryKeys = ["selected", "notice", "tone", "openPermission", "source"]
  const hasFeedbackQuery = handledQueryKeys.some((key) => normalizeRouteQueryValue(route.query[key]))
  if (!hasFeedbackQuery) return
  const nextQuery = Object.fromEntries(
    Object.entries(route.query)
      .filter(([key]) => !handledQueryKeys.includes(key))
      .map(([key, value]) => [key, normalizeRouteQueryValue(value)])
      .filter(([, value]) => Boolean(value)),
  )
  router.replace({ path: "/admin/repository", query: nextQuery })
}

watch([repoSearch, selectedRepositoryCategory, selectedOwner, selectedStatus, selectedSort], () => {
  saveFilters()
  repositoryPage.value = 1
})

onMounted(async () => {
  loadFilters()
  if (routedSelectedTemplateId.value) {
    resetRepositoryFiltersForDeepLink()
  }
  await refreshData()
  if (routedNoticeMessage.value) {
    setPageNotice(routedNoticeTone.value, routedNoticeMessage.value)
  }
  if (routedSelectedTemplateId.value) {
    pendingHighlightTemplateId.value = routedSelectedTemplateId.value
    syncRepositoryPageToSelectedTemplate(routedSelectedTemplateId.value)
  }
  if (routedOpenPermission.value && routedSelectedTemplateId.value) {
    const matchedTemplate = items.value.find((item) => (
      item.template_id === routedSelectedTemplateId.value
      || item.template_code === routedSelectedTemplateId.value
      || item.runtime_key === routedSelectedTemplateId.value
    ))
    if (matchedTemplate) {
      requestEditAccessScope(matchedTemplate)
    }
  }
  clearFeedbackRouteQuery()
  if (pendingHighlightTemplateId.value) {
    highlightedTemplateId.value = pendingHighlightTemplateId.value
    pendingHighlightTemplateId.value = ""
    nextTick(() => {
      const el = document.querySelector(`[data-template-id="${highlightedTemplateId.value}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }
})

function resolvedCoverUrl(item: any) {
  return item.cover_url || ""
}
</script>

<template>
  <div class="next-page-header">
    <div class="next-page-title">
      <h1>{{ t("templateLibrary") }}</h1>
      <p>{{ t("pageDesc") }}</p>
    </div>
    <div class="next-page-actions">
      <button type="button" class="next-action primary" @click="openUploadModal">
        {{ t("uploadTemplate") }}
      </button>
    </div>
  </div>

  <div v-if="pageNotice" class="next-status" :class="pageNotice.tone">
    {{ pageNotice.message }}
  </div>

  <article class="next-summary-row">
    <div class="next-stats-grid">
      <div class="next-summary-card">
        <span class="next-summary-label">{{ t("totalTemplates") }}</span>
        <strong>{{ repositoryAnalytics.total }}</strong>
        <span class="next-stat-hint">{{ repositoryAnalytics.listed }} {{ t("publishedHint") }}</span>
      </div>
      <div class="next-summary-card">
        <span class="next-summary-label">{{ t("drafts") }}</span>
        <strong>{{ repositoryAnalytics.draft }}</strong>
        <span class="next-stat-hint">{{ repositoryAnalytics.draft }} {{ t("draftHint") }}</span>
      </div>
      <div class="next-summary-card">
        <span class="next-summary-label">{{ t("apiCoverage") }}</span>
        <strong>{{ repositoryAnalytics.apiEnabled }}</strong>
        <span class="next-stat-hint">{{ repositoryAnalytics.apiDisabled }} {{ t("apiDisabledHint") }}</span>
      </div>
      <div class="next-summary-card">
        <span class="next-summary-label">{{ t("reviewQueue") }}</span>
        <strong>{{ repositoryAnalytics.underReview }}</strong>
        <span class="next-stat-hint">{{ repositoryAnalytics.changesRequested }} {{ t("reviewQueueHint") }} · {{ repositoryAnalytics.approved }} {{ t("approved") }}</span>
      </div>
    </div>
  </article>

  <article class="next-card">
    <div class="repo-toolbar">
      <div class="repo-toolbar-main repo-toolbar-main-single">
        <div class="repo-toolbar-filters">
          <input
            v-model="repoSearch"
            class="repo-search-input repo-search-input-compact"
            :placeholder="t('searchPlaceholder')"
            data-testid="repository-search-input"
          />
          <div v-if="authStore.isPlatformAdmin" class="repo-header-user-select">
            <FilterDropdown v-model="selectedOwner" :options="ownerDropdownOptions" />
          </div>
          <FilterDropdown v-model="selectedStatus" :options="repositoryStatusOptions" />
          <FilterDropdown v-model="selectedSort" :options="repositorySortOptions" />
        </div>
        <div class="repo-toolbar-category">
        <CategoryCascadeSelector
          v-model="selectedRepositoryCategory"
          :categories="categoryRoots"
          clear-value="all"
          :allow-non-leaf="true"
          :level1-placeholder="t('allCategories')"
          :level2-placeholder="t('selectLevel2')"
          :level3-placeholder="t('selectLevel3')"
        />
        </div>
      </div>
    </div>
    <div class="next-template-list">
      <RepositoryTemplateCard
        v-for="item in paginatedRepository"
        :key="item.template_id"
        :item="item"
        :highlighted="highlightedTemplateId === item.template_id"
        :cover-url="resolvedCoverUrl(item)"
        :category-label="getTemplateCategoryLabel(item, latestCategoryIdSet, categoryRoots)"
        :preview-tooltip="getPreviewTooltip(item)"
        :meta-chips="getTemplateMetaChips(item)"
        :show-owner="authStore.isPlatformAdmin"
        :owner-label="resolveOwnerLabel(item.owner_tenant_id || 'platform')"
        :selected-category-id="selectedRepositoryCategory"
        :show-submission="authStore.isTenantAdmin"
        :show-submit-action="item.publish_status !== 'published' || item.access_scope === 'public'"
        :submission-status="submissionByTemplateId[item.template_id]?.status || ''"
        :submission-label="formatLocalizedSubmissionStatus(submissionByTemplateId[item.template_id]?.status || '')"
        :can-submit="item.publish_status === 'published' && item.access_scope === 'public' && (!submissionByTemplateId[item.template_id]?.status || canSubmitStatus(submissionByTemplateId[item.template_id]?.status || ''))"
        :submit-action-label="item.publish_status !== 'published' ? t('listFirst') : (item.access_scope !== 'public' ? t('publicOnlyForReview') : (submissionByTemplateId[item.template_id]?.status ? t('resubmit') : t('submit')))"
        :show-preview="hasRuntimeAssets(item)"
        :can-preview="canPreviewTemplate(item)"
        :show-stats="hasRuntimeAssets(item)"
        :can-manage-api="authStore.isTenantAdmin || authStore.isPlatformAdmin"
        :can-toggle-api="item.publish_status === 'published' || item.tenant_api_status === 'enabled'"
        :can-manage-publish="authStore.isTenantAdmin || authStore.isPlatformAdmin"
        :publish-action-label="item.publish_status === 'published' ? t('unlist') : t('list')"
        :permission-action-label="t('editPermission')"
        @apply-category="applyRecentCategoryFilter"
        @preview="previewTemplate"
        @stats="openTemplateStats"
        @edit="openTemplateEditor"
        @reupload="openReuploadModal"
        @edit-access="requestEditAccessScope"
        @toggle-publish="requestTogglePublishStatus"
        @toggle-api="requestToggleTenantApiStatus"
        @submit="requestSubmitTemplate"
        @remove="requestRemoveTemplate"
      />
    </div>
    <div v-if="!filteredRepository.length" class="next-empty-state">
      <strong>{{ repositoryEmptyState.title }}</strong>
      <span>{{ repositoryEmptyState.description }}</span>
    </div>
    <PaginationBar
      v-if="filteredRepository.length"
      v-model:current-page="repositoryPage"
      :total-pages="repositoryTotalPages"
      :total-items="filteredRepository.length"
      :page-size="REPOSITORY_PAGE_SIZE"
    />
  </article>

  <!-- Template Upload Modal -->
  <TemplateUploadModal
    :is-open="isUploadModalOpen"
    :categories="categoryRoots"
    :template-id="reuploadTemplateId"
    :initial-template-code="reuploadInitialCode"
    :initial-template-name="reuploadInitialName"
    :initial-category-id="reuploadInitialCategoryId"
    @close="closeUploadModal"
    @success="handleUploadSuccess"
  />

  <div v-if="statsModalOpen" class="next-modal-overlay" @click.self="closeTemplateStats">
    <div class="next-modal">
      <div class="next-modal-head">
        <strong>{{ t("templateStats") }} · {{ statsTemplateId }}</strong>
        <button type="button" class="next-action ghost" :disabled="statsLoading" @click="closeTemplateStats">✕</button>
      </div>
      <div class="next-modal-body">
        <div v-if="statsLoading">{{ t("loading") }}</div>
        <div v-else-if="statsNotice" class="next-status" :class="statsNotice.tone">{{ statsNotice.message }}</div>
        <div v-else>
          <div class="next-stats-grid">
            <div class="next-summary-card active">
              <span class="next-summary-label">{{ t("totalImages") }}</span>
              <strong>{{ statsTotal }}</strong>
            </div>
            <div v-if="statsSummary" class="next-summary-card">
              <span class="next-summary-label">{{ t("templateSize") }}</span>
              <strong>{{ statsSummary.template_size || t("na") }}</strong>
            </div>
            <div v-if="statsSummary" class="next-summary-card">
              <span class="next-summary-label">{{ t("structure") }}</span>
              <strong>{{ formatText(t("partsViews"), { parts: String(statsSummary.parts_count || 0), views: String(statsSummary.views_count || 0) }) }}</strong>
            </div>
            <div v-if="statsSummary" class="next-summary-card success">
              <span class="next-summary-label">{{ t("runtimeReady") }}</span>
              <strong>{{ statsSummary.ready ? t("yes") : t("no") }}</strong>
            </div>
          </div>
          <div v-if="statsSummary" class="next-stats-breakdown">
            <div class="next-stats-row">
              <span>{{ t("manifestPresent") }}</span>
              <strong>{{ statsSummary.manifest_present ? t("yes") : t("no") }}</strong>
            </div>
            <div v-if="statsSummary.colors" class="next-stats-row">
              <span>{{ t("colors") }}</span>
              <strong>{{ Array.isArray(statsSummary.colors) && statsSummary.colors.length ? statsSummary.colors.join(", ") : t("na") }}</strong>
            </div>
            <div v-if="statsSummary.category_path || statsSummary.category_id" class="next-stats-row">
              <span>{{ t("category") }}</span>
              <strong>{{ statsSummary.category_path || statsSummary.category_id }}</strong>
            </div>
          </div>
          <div v-if="Object.keys(statsBySize).length" class="next-stats-breakdown">
            <div v-for="(count, size) in statsBySize" :key="size" class="next-stats-row">
              <span>{{ size }}</span>
              <strong>{{ count }}</strong>
            </div>
          </div>
          <div v-else class="next-empty-state">
            <strong>{{ t("noImagesYet") }}</strong>
            <span>{{ t("noImagesDesc") }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ActionConfirmationModal
    v-model:is-open="confirmModalOpen"
    v-model:note="confirmModalNote"
    v-model:choice-value="confirmModalChoiceValue"
    :title="confirmModalTitle"
    :message="confirmModalMessage"
    :details="confirmModalDetails"
    :show-hint="confirmModalShowHint"
    :show-tone-badge="confirmModalShowToneBadge"
    :confirm-text="confirmModalConfirmText"
    :tone="confirmModalTone"
    :note-label="confirmModalNoteLabel"
    :note-placeholder="confirmModalNotePlaceholder"
    :note-required="confirmModalNoteRequired"
    :choice-label="confirmModalChoiceLabel"
    :choice-options="confirmModalChoiceOptions"
    :choice-required="confirmModalChoiceRequired"
    :loading="confirmModalLoading"
    :loading-text="confirmModalLoadingText"
    :error-message="confirmModalError"
    :cancel-text="t('cancel')"
    @close="closeRepositoryConfirmModal"
    @confirm="confirmRepositoryAction"
  />
</template>

<style scoped>
.repository-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.repository-page-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.repository-page-notice {
  margin-top: 1rem;
}

.cleanup-warning {
  margin-top: 1rem;
}

.next-entitlement-banner {
  margin: 1rem 0 0;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
}

.next-entitlement-info h4 {
  margin-bottom: 0.75rem;
  color: #1e293b;
  font-weight: 600;
  font-size: 0.95rem;
}

.next-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.next-stat-item {
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.next-stat-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.next-stat-item.published {
  grid-column: span 2;
}

.next-stat-label {
  display: block;
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.next-stat-value-large {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.next-stat-separator {
  font-size: 1.5rem;
  color: #94a3b8;
}

.next-stat-limit {
  font-size: 1.25rem;
  color: #64748b;
}

.next-stat-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.next-stat-value.active {
  color: #10b981;
}

.next-stat-value.inactive {
  color: #ef4444;
}

.next-stat-value.trial {
  color: #f59e0b;
}

.next-progress-bar {
  width: 100%;
  height: 0.75rem;
  background: #e2e8f0;
  border-radius: 0.375rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.next-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.5s ease;
  border-radius: 0.375rem;
}

.next-progress-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.next-stat-hint {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.repository-analytics-grid {
  margin-top: 1rem;
}

.next-template-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 0;
}

.repo-header-user-select {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.repo-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;
}

.repo-toolbar-main {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.8fr);
  gap: 1rem;
  align-items: start;
}

.repo-toolbar-main-single {
  grid-template-columns: 1fr;
}

.repo-toolbar-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.repo-header-user-select {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.repo-search-input {
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  padding: 0 0.85rem;
  background: white;
  min-width: 180px;
  width: 100%;
}

.repo-search-input-compact {
  margin-top: 0;
}

.repo-search-input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.35);
}

.repo-toolbar-category {
  min-width: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  background: #f8fafc;
  position: relative;
  overflow: visible;
}

.repo-toolbar-category :deep(.category-cascade) {
  gap: 0.45rem;
  z-index: auto;
}

.repo-toolbar-category :deep(.cascade-grid) {
  gap: 0.55rem;
}

.repo-toolbar-category :deep(.cascade-select-trigger) {
  padding: 0.62rem 0.75rem;
  font-size: 0.88rem;
  border-radius: 10px;
}

.repo-toolbar-category :deep(.cascade-clear) {
  padding: 0.62rem 0.78rem;
  border-radius: 10px;
}

.next-template-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 0;
  position: relative;
  z-index: 1;
}

.next-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.next-summary-card {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-height: 88px;
  justify-content: center;
}

.next-summary-card.active {
  border-color: #818cf8;
  background: #eef2ff;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.12);
}

.next-summary-label {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.next-stat-hint {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.next-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
}

.next-status.success {
  background: #dcfce7;
  color: #166534;
}

.next-status.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.next-empty-state {
  margin-top: 1rem;
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #475569;
  text-align: center;
}
.next-action {
  padding: 0.55rem 0.85rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

@media (min-width: 1800px) {
  .next-template-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .next-template-list {
    grid-template-columns: 1fr;
  }
}

.next-action:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.next-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.next-action.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.next-action.primary:hover:not(:disabled) {
  background: #0ea5e9;
  border-color: #0ea5e9;
}

.next-action.secondary {
  background: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
}

.next-action.secondary:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.next-action.ghost {
  background: transparent;
  color: #64748b;
  border-color: transparent;
}

.next-action.ghost:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.next-action.ghost.danger {
  color: #ef4444;
}

.next-action.ghost.danger:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.next-action.publish {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.next-action.publish:hover:not(:disabled) {
  background: #059669;
  border-color: #059669;
}

.next-action.unpublish {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.next-action.unpublish:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
}

.next-action.trial {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}

.next-action.trial:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706, #b45309);
}

.next-action.disabled {
  background: #e2e8f0;
  color: #94a3b8;
  border-color: #e2e8f0;
  cursor: not-allowed;
}

.next-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4.5rem 1rem 1.5rem;
  overflow-y: auto;
  z-index: 2000;
}

.next-modal {
  width: min(560px, calc(100vw - 2rem));
  background: white;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  max-height: calc(100vh - 6rem);
  overflow: auto;
}

.next-modal-head {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
}

.next-modal-body {
  padding: 1.25rem;
}
.next-stats-breakdown {
  margin-top: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}

.next-stats-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.next-stats-row:last-child {
  border-bottom: none;
}

@media (min-width: 1800px) {
  .next-template-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .next-template-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .repo-header-user-select {
    width: 100%;
  }

  .repo-toolbar-filters {
    width: 100%;
  }

  .repo-toolbar-main {
    grid-template-columns: 1fr;
  }

  .next-stats-grid {
    grid-template-columns: 1fr;
  }

  .next-template-list {
    grid-template-columns: 1fr;
  }
}
</style>
