<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import {
  TEMPLATE_CENTER_LABEL,
} from "../../constants/adminTemplateGovernance"
import { usePlatformStore } from "../../stores/platform"
import { useAuthStore } from "../../stores/auth"
import { useTemplateStore } from "../../stores/templates"
import { gatewayPlatformFetch, resolveRuntimeAssetUrl } from "../../api/client"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import ActionConfirmationModal from "../../components/admin/ActionConfirmationModal.vue"
import CenterTemplateCard from "../../components/admin/CenterTemplateCard.vue"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { buildCategoryIdSet, findCategoryPath, formatSubmissionStatus, formatTemplateDate } from "./repositoryView"
import {
  buildCenterStats,
  canReviewSubmission,
  formatMarketplaceCreatorName,
  getListedMarketplaceTemplates,
  resolveTemplateName,
  resolveTemplateSummary,
} from "./centerView"
import { useCenterActions } from "./useCenterActions"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"

const router = useRouter()
const platformStore = usePlatformStore()
const authStore = useAuthStore()
const templateStore = useTemplateStore()
const uiLocaleStore = useUiLocaleStore()
const { submissions, listings, categories, submissionHistory } = storeToRefs(platformStore)
const { items: runtimeTemplates } = storeToRefs(templateStore)
const { locale } = storeToRefs(uiLocaleStore)

const submissionStatusFilter = ref("all")
const mySubmissionsStatusFilter = ref("all")
const selectedMySubmissionsCategory = ref("all")
const selectedReviewCategory = ref("all")
const selectedListingCategory = ref("all")
const selectedListingApiStatus = ref("all")
const selectedReviewOwner = ref("all")
const selectedListingOwner = ref("all")
const mySubmissionsSearch = ref("")
const reviewSearch = ref("")
const listingSearch = ref("")
const expandedHistory = ref<Record<string, boolean>>({})
const reviewNote = ref("")
const tenantLabels = ref<Record<string, string>>({})
const tenantDirectory = ref<Array<{ tenant_id: string; email?: string; name?: string }>>([])
const confirmModalOpen = ref(false)
const confirmModalLoading = ref(false)
const confirmModalTitle = ref("")
const confirmModalMessage = ref("")
const CENTER_I18N = {
  en: {
    templateCenter: "Template Center",
    pageDescAdmin: "Review submissions and listings.",
    pageDescTenant: "Track template submissions and listings.",
    centerSubmissions: "Center Submissions",
    underReview: "Under Review",
    approved: "Approved",
    approvedHint: "Approved counts review approvals. Marketplace listings counts templates that are currently active and listed, so the numbers may differ after delisting or deletion.",
    listed: "Listed",
    mySubmissions: "My Submissions",
    trackReviewStatus: "Track review status.",
    searchTemplate: "Search template name, code, category, or tenant",
    reviewSearch: "Search template name, code, category, tenant, or reviewer",
    allStatuses: "All Statuses",
    submitted: "Submitted",
    changesRequested: "Changes Requested",
    allUsers: "All Users",
    allApiStates: "All API States",
    apiEnabled: "API Enabled",
    apiDisabled: "API Disabled",
    allCategories: "All Categories",
    selectLevel2: "Select Level 2",
    selectLevel3: "Select Level 3",
    preview: "Preview",
    hideHistory: "Hide History",
    history: "History",
    noSubmissionsYet: "No submissions yet.",
    submittedTemplatesAppearHere: "Submitted templates appear here.",
    reviewQueue: "Review Queue",
    reviewQueueDesc: "Review and update submission status.",
    startReview: "Start Review",
    changes: "Changes",
    approve: "Approve",
    reject: "Reject",
    noSubmissionsInView: "No submissions in this view.",
    adjustFilters: "Adjust filters to see more items.",
    marketplaceListings: "Marketplace Listings",
    browseListedTemplates: "Browse listed templates.",
    delist: "Delist",
    delistTemplate: "Delist Template",
    delistTemplateMessage: "Delist marketplace listing for {name}?",
    delistReason: "Delist Reason",
    confirm: "Confirm",
    cancel: "Cancel",
    reviewNote: "Review Note",
    reviewNoteRequired: "Review note is required",
    uncategorized: "Uncategorized",
    tenantPrefix: "Tenant",
    system: "system",
    listedOn: "Listed on {date}",
    creatorPrefix: "Creator",
    reviewActionMessage: "{action} submission {submissionId} for template {templateName}?",
    delistReasonRequired: "Required reason for delisting this template",
    noListedTemplates: "No listed templates.",
    noListedTemplatesDesc: "Adjust filters to see more listings.",
  },
  zh: {
    templateCenter: "模板中心",
    pageDescAdmin: "审核模板投稿与上架列表。",
    pageDescTenant: "跟踪模板投稿与上架状态。",
    centerSubmissions: "中心投稿",
    underReview: "审核中",
    approved: "已通过",
    approvedHint: "已通过统计的是审核通过；市场上架统计的是当前仍处于上架状态的模板，若后续下架或删除，两者数量可能不同。",
    listed: "已上架",
    mySubmissions: "我的投稿",
    trackReviewStatus: "跟踪审核状态。",
    searchTemplate: "搜索模板名称、编码、分类或租户",
    reviewSearch: "搜索模板名称、编码、分类、租户或审核人",
    allStatuses: "全部状态",
    submitted: "已提交",
    changesRequested: "要求修改",
    allUsers: "全部用户",
    allApiStates: "全部 API 状态",
    apiEnabled: "API 已启用",
    apiDisabled: "API 已禁用",
    allCategories: "全部分类",
    selectLevel2: "选择二级分类",
    selectLevel3: "选择三级分类",
    preview: "预览",
    hideHistory: "收起历史",
    history: "历史",
    noSubmissionsYet: "还没有投稿。",
    submittedTemplatesAppearHere: "已提交的模板会显示在这里。",
    reviewQueue: "审核队列",
    reviewQueueDesc: "审核并更新投稿状态。",
    startReview: "开始审核",
    changes: "要求修改",
    approve: "通过",
    reject: "拒绝",
    noSubmissionsInView: "当前视图下没有投稿。",
    adjustFilters: "调整筛选条件以查看更多内容。",
    marketplaceListings: "市场上架",
    browseListedTemplates: "浏览已上架模板。",
    delist: "下架",
    delistTemplate: "下架模板",
    delistTemplateMessage: "确定下架 {name} 的市场列表吗？",
    delistReason: "下架原因",
    confirm: "确认",
    cancel: "取消",
    reviewNote: "审核备注",
    reviewNoteRequired: "审核备注为必填项",
    uncategorized: "未分类",
    tenantPrefix: "租户",
    system: "系统",
    listedOn: "上架时间 {date}",
    creatorPrefix: "作者",
    reviewActionMessage: "{action}模板 {templateName} 的投稿 {submissionId} 吗？",
    delistReasonRequired: "请填写下架该模板的原因",
    noListedTemplates: "暂无已上架模板。",
    noListedTemplatesDesc: "调整筛选条件以查看更多上架内容。",
  },
} as const

function t(key: keyof typeof CENTER_I18N.en) {
  return CENTER_I18N[locale.value][key] || CENTER_I18N.en[key]
}

function formatCenterText(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || "")
}

function formatLocalizedSubmissionStatus(status: string): string {
  if (locale.value !== "zh") {
    return formatSubmissionStatus(status)
  }
  switch (status) {
    case "submitted":
    case "under_review":
      return t("underReview")
    case "changes_requested":
      return t("changesRequested")
    case "approved":
      return t("approved")
    case "rejected":
      return t("reject")
    default:
      return status || t("submitted")
  }
}

const confirmModalConfirmText = ref(t("confirm"))
const confirmModalTone = ref<"primary" | "danger">("primary")
const confirmModalNote = ref("")
const confirmModalNoteLabel = ref(t("reviewNote"))
const confirmModalNotePlaceholder = ref("")
const confirmModalNoteRequired = ref(false)
const confirmModalError = ref("")
const pendingAction = ref<
  | { kind: "review"; submissionId: string; decision: string }
  | { kind: "delist"; templateId: string; title: string }
  | null
>(null)
const mySubmissionsPage = ref(1)
const reviewSubmissionsPage = ref(1)
const listingsPage = ref(1)
const CENTER_PAGE_SIZE = 12
const { refreshCenter, reviewSubmission, showHistory, delistListing, previewListing } = useCenterActions({
  router,
  authStore,
  templateStore,
  platformStore,
  getSubmissionStatusFilter: () => submissionStatusFilter.value,
  getSubmissionPayload: () => ({
    templateId: "",
    title: "",
    description: "",
    note: "",
  }),
})
function canReview(status: string, decision: string) {
  return canReviewSubmission(status, decision)
}

function resolveCurrentTemplateSummary(templateId: string) {
  return resolveTemplateSummary(templateId, runtimeTemplates.value)
}

function resolveCenterCategoryLabel(input: { category_id?: string; category_path?: string; template_id: string }) {
  const runtimeSummary = resolveCurrentTemplateSummary(input.template_id)
  const runtimePath = runtimeSummary?.category_path || ""
  const explicitPath = input.category_path || ""
  const categoryId = input.category_id || runtimeSummary?.category_id || ""
  const visiblePath = [explicitPath, runtimePath].find((value) => value && !/^cat_[a-z0-9]+$/i.test(value)) || ""
  if (visiblePath) return visiblePath
  if (categoryId) {
    return findCategoryPath(categoryId, categories.value) || t("uncategorized")
  }
  return t("uncategorized")
}

function resolveSubmissionCategory(item: { category_id?: string; category_path?: string; template_id: string }) {
  return resolveCenterCategoryLabel(item)
}

function resolveListingCategory(item: { category_id?: string; category_path?: string; template_id: string }) {
  return resolveCenterCategoryLabel(item)
}

function resolveListingTitle(item: { template_id: string; title: string }) {
  return String(item.title || "").trim() || resolveCurrentTemplateName(item.template_id, item.template_id)
}

function resolveCurrentTemplateName(templateId: string, fallback = "") {
  return resolveTemplateName(templateId, runtimeTemplates.value, fallback)
}

function resolveCenterCategoryId(input: { template_id: string; category_id?: string }) {
  return input.category_id || resolveCurrentTemplateSummary(input.template_id)?.category_id || ""
}

function resolveCenterThumbnailUrl(input: { template_id: string; cover_url?: string }, fallback = "") {
  const runtimeCover = resolveCurrentTemplateSummary(input.template_id)?.cover_url || fallback
  return resolveRuntimeAssetUrl(input.cover_url || runtimeCover)
}

function resolveCenterOwnerId(input: { template_id: string; tenant_id?: string }) {
  return input.tenant_id || resolveCurrentTemplateSummary(input.template_id)?.owner_tenant_id || ""
}

function resolveTenantLabel(tenantId: string) {
  if (!tenantId) return ""
  return tenantLabels.value[tenantId] || tenantId
}

function normalizeCenterSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function squashCenterSearch(value: string) {
  return normalizeCenterSearch(value).replace(/\s+/g, "")
}

function matchesCenterSearch(keyword: string, squashedKeyword: string, values: Array<string | undefined>) {
  if (!keyword) return true
  return values.some((value) => {
    const normalized = normalizeCenterSearch(value || "")
    const squashed = squashCenterSearch(value || "")
    return normalized.includes(keyword) || (!!squashedKeyword && squashed.includes(squashedKeyword))
  })
}

function resolveSubmissionBadgeTone(status: string): "default" | "info" | "warning" | "success" | "danger" {
  switch (status) {
    case "submitted":
    case "under_review":
      return "info"
    case "changes_requested":
      return "warning"
    case "approved":
      return "success"
    case "rejected":
      return "danger"
    default:
      return "default"
  }
}

function getReviewActionLabel(decision: string) {
  switch (decision) {
    case "start_review":
      return t("startReview")
    case "changes_requested":
      return t("changes")
    case "approved":
      return t("approve")
    case "rejected":
      return t("reject")
    default:
      return t("confirm")
  }
}

function openReviewConfirmation(
  item: { submission_id: string; template_id: string; title: string },
  decision: string,
) {
  if (!authStore.isPlatformAdmin) return
  pendingAction.value = { kind: "review", submissionId: item.submission_id, decision }
  const label = getReviewActionLabel(decision)
  confirmModalTitle.value = label
  confirmModalMessage.value = formatCenterText(t("reviewActionMessage"), {
    action: label,
    submissionId: item.submission_id,
    templateName: resolveCurrentTemplateName(item.template_id, item.title),
  })
  confirmModalConfirmText.value = label
  confirmModalTone.value = decision === "rejected" ? "danger" : "primary"
  confirmModalNote.value = reviewNote.value
  confirmModalNoteLabel.value = t("reviewNote")
  confirmModalNotePlaceholder.value = t("reviewNoteRequired")
  confirmModalNoteRequired.value = true
  confirmModalError.value = ""
  confirmModalOpen.value = true
}

function closeConfirmModal() {
  confirmModalOpen.value = false
  confirmModalError.value = ""
  pendingAction.value = null
}

function openDelistConfirmation(item: { template_id: string; title: string }) {
  if (!authStore.isPlatformAdmin) return
  pendingAction.value = { kind: "delist", templateId: item.template_id, title: item.title }
  const templateName = resolveCurrentTemplateName(item.template_id, item.title)
  confirmModalTitle.value = t("delistTemplate")
  confirmModalMessage.value = formatCenterText(t("delistTemplateMessage"), { name: templateName })
  confirmModalConfirmText.value = t("delist")
  confirmModalTone.value = "danger"
  confirmModalNote.value = ""
  confirmModalNoteLabel.value = t("delistReason")
  confirmModalNotePlaceholder.value = t("delistReasonRequired")
  confirmModalNoteRequired.value = true
  confirmModalError.value = ""
  confirmModalOpen.value = true
}

async function confirmPendingAction(note: string) {
  if (!pendingAction.value) return
  confirmModalLoading.value = true
  confirmModalError.value = ""
  try {
    if (pendingAction.value.kind === "review") {
      reviewNote.value = note
      await reviewSubmission(pendingAction.value.submissionId, pendingAction.value.decision, note)
    } else {
      await delistListing(pendingAction.value.templateId, note)
    }
    closeConfirmModal()
  } catch (err) {
    confirmModalError.value = String((err as Error).message || err)
  } finally {
    confirmModalLoading.value = false
  }
}

const listedListings = computed(() => getListedMarketplaceTemplates(listings.value))
const centerStats = computed(() => {
  const tenantId = authStore.isTenantAdmin ? String(authStore.tenant?.tenant_id || "").trim() : ""
  return buildCenterStats(submissions.value, listings.value, tenantId
    ? {
        ownerTenantId: tenantId,
        resolveListingOwnerId: (templateId) => resolveCenterOwnerId({ template_id: templateId }),
      }
    : undefined)
})
const mySubmissionsCategoryIdSet = computed(() => buildCategoryIdSet(selectedMySubmissionsCategory.value, categories.value))
const reviewCategoryIdSet = computed(() => buildCategoryIdSet(selectedReviewCategory.value, categories.value))
const listingCategoryIdSet = computed(() => buildCategoryIdSet(selectedListingCategory.value, categories.value))
const centerOwnerOptions = computed(() => {
  const ids = tenantDirectory.value.map((item) => item.tenant_id).filter(Boolean)
  if (ids.length) return ids.sort()
  const fallback = new Set<string>()
  submissions.value.forEach((item) => { if (item.tenant_id) fallback.add(item.tenant_id) })
  listings.value.forEach((item) => {
    const ownerId = resolveCenterOwnerId({ template_id: item.template_id })
    if (ownerId) fallback.add(ownerId)
  })
  return Array.from(fallback).sort()
})
const reviewStatusOptions = computed(() => [
  { value: "all", label: t("allStatuses") },
  { value: "submitted", label: t("submitted") },
  { value: "under_review", label: t("underReview") },
  { value: "changes_requested", label: t("changesRequested") },
  { value: "approved", label: t("approved") },
  { value: "rejected", label: t("reject") },
])
const centerOwnerDropdownOptions = computed(() => [
  { value: "all", label: t("allUsers") },
  ...centerOwnerOptions.value.map((owner) => ({
    value: owner,
    label: resolveTenantLabel(owner),
  })),
])
const listingApiStatusOptions = computed(() => [
  { value: "all", label: t("allApiStates") },
  { value: "enabled", label: t("apiEnabled") },
  { value: "disabled", label: t("apiDisabled") },
])
const filteredMySubmissions = computed(() => submissions.value.filter((item) => {
  const myKeyword = normalizeCenterSearch(mySubmissionsSearch.value)
  const mySquashedKeyword = squashCenterSearch(mySubmissionsSearch.value)
  if (mySubmissionsStatusFilter.value !== "all" && item.status !== mySubmissionsStatusFilter.value) return false
  if (!matchesCenterSearch(myKeyword, mySquashedKeyword, [
    resolveCurrentTemplateName(item.template_id, item.title),
    item.template_id,
    resolveSubmissionCategory(item),
    resolveTenantLabel(resolveCenterOwnerId(item)),
  ])) return false
  if (selectedMySubmissionsCategory.value === "all") return true
  const categoryId = resolveCenterCategoryId(item)
  return Boolean(categoryId && mySubmissionsCategoryIdSet.value?.has(categoryId))
}))
const filteredReviewSubmissions = computed(() => submissions.value.filter((item) => {
  const reviewKeyword = normalizeCenterSearch(reviewSearch.value)
  const reviewSquashedKeyword = squashCenterSearch(reviewSearch.value)
  if (selectedReviewOwner.value !== "all" && item.tenant_id !== selectedReviewOwner.value) return false
  if (!matchesCenterSearch(reviewKeyword, reviewSquashedKeyword, [
    resolveCurrentTemplateName(item.template_id, item.title),
    item.template_id,
    resolveSubmissionCategory(item),
    resolveTenantLabel(item.tenant_id || ""),
    item.reviewer_email,
  ])) return false
  if (selectedReviewCategory.value === "all") return true
  const categoryId = resolveCenterCategoryId(item)
  return Boolean(categoryId && reviewCategoryIdSet.value?.has(categoryId))
}))
const filteredListings = computed(() => listedListings.value.filter((item) => {
  const listingKeyword = normalizeCenterSearch(listingSearch.value)
  const listingSquashedKeyword = squashCenterSearch(listingSearch.value)
  const ownerId = resolveCenterOwnerId({ template_id: item.template_id })
  if (selectedListingOwner.value !== "all" && resolveCenterOwnerId({ template_id: item.template_id }) !== selectedListingOwner.value) return false
  if (selectedListingApiStatus.value !== "all" && (item.tenant_api_status || "disabled") !== selectedListingApiStatus.value) return false
  if (!matchesCenterSearch(listingKeyword, listingSquashedKeyword, [
    resolveCurrentTemplateName(item.template_id, item.title),
    item.template_id,
    resolveListingCategory(item),
    resolveTenantLabel(ownerId),
    item.tenant_api_status === "enabled" ? t("apiEnabled") : t("apiDisabled"),
  ])) return false
  if (selectedListingCategory.value === "all") return true
  const categoryId = resolveCenterCategoryId(item)
  return Boolean(categoryId && listingCategoryIdSet.value?.has(categoryId))
}))
const mySubmissionTotalPages = computed(() => resolveTotalPages(filteredMySubmissions.value.length, CENTER_PAGE_SIZE))
const reviewSubmissionTotalPages = computed(() => resolveTotalPages(filteredReviewSubmissions.value.length, CENTER_PAGE_SIZE))
const listingTotalPages = computed(() => resolveTotalPages(filteredListings.value.length, CENTER_PAGE_SIZE))
const paginatedMySubmissions = computed(() => paginateItems(filteredMySubmissions.value, mySubmissionsPage.value, CENTER_PAGE_SIZE))
const paginatedReviewSubmissions = computed(() => paginateItems(filteredReviewSubmissions.value, reviewSubmissionsPage.value, CENTER_PAGE_SIZE))
const paginatedListings = computed(() => paginateItems(filteredListings.value, listingsPage.value, CENTER_PAGE_SIZE))

watch(() => filteredMySubmissions.value.length, () => {
  mySubmissionsPage.value = clampPage(mySubmissionsPage.value, mySubmissionTotalPages.value)
})
watch(() => filteredReviewSubmissions.value.length, () => {
  reviewSubmissionsPage.value = clampPage(reviewSubmissionsPage.value, reviewSubmissionTotalPages.value)
})
watch(() => filteredListings.value.length, () => {
  listingsPage.value = clampPage(listingsPage.value, listingTotalPages.value)
})

async function hydrateTenantLabels() {
  if (!authStore.isPlatformAdmin) return
  try {
    const tenants = await gatewayPlatformFetch<Array<{ tenant_id: string; email?: string; name?: string }>>("/api/v1/tenants", {
      headers: authStore.authHeaders,
    })
    tenantDirectory.value = tenants
    tenantLabels.value = Object.fromEntries(
      tenants.map((item) => [item.tenant_id, item.email || item.name || item.tenant_id]),
    )
  } catch {
    tenantDirectory.value = []
  }
}

async function toggleHistory(submissionId: string) {
  const next = !expandedHistory.value[submissionId]
  expandedHistory.value = { ...expandedHistory.value, [submissionId]: next }
  if (next && !submissionHistory.value[submissionId]?.length) {
    await showHistory(submissionId)
  }
}

onMounted(() => {
  Promise.all([
    refreshCenter().catch(() => undefined),
    platformStore.fetchCategories(authStore.authHeaders).catch(() => undefined),
    hydrateTenantLabels().catch(() => undefined),
  ]).catch(() => undefined)
})
</script>

<template>
  <div class="center-page" data-testid="admin-center-page">
    <div class="center-content">
      <div class="center-card">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">🛒</div>
            <div class="card-text">
              <h1 class="card-title">{{ t("templateCenter") }}</h1>
              <p class="card-description">
                {{ authStore.isPlatformAdmin
                  ? t("pageDescAdmin")
                  : t("pageDescTenant") }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">{{ t("centerSubmissions") }}</span>
          <strong>{{ centerStats.totalSubmissions }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t("underReview") }}</span>
          <strong>{{ centerStats.underReview }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label" :title="t('approvedHint')">{{ t("approved") }}</span>
          <strong>{{ centerStats.approved }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t("listed") }}</span>
          <strong>{{ centerStats.listedTemplates }}</strong>
        </div>
      </div>

      <div class="center-card" v-if="authStore.isTenantAdmin">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">📮</div>
            <div class="card-text">
              <h2 class="card-title">{{ t("mySubmissions") }}</h2>
              <p class="card-description">{{ t("trackReviewStatus") }}</p>
            </div>
          </div>
          <div class="card-header-controls">
            <input
              v-model="mySubmissionsSearch"
              class="center-search-input"
              :placeholder="t('searchTemplate')"
            />
          </div>
        </div>

        <div class="card-content">
          <div class="review-controls">
            <div class="center-filter-dropdowns">
              <FilterDropdown v-model="mySubmissionsStatusFilter" :options="reviewStatusOptions" />
            </div>
            <div class="center-category-toolbar">
              <CategoryCascadeSelector
                v-model="selectedMySubmissionsCategory"
                :categories="categories"
                clear-value="all"
                :allow-non-leaf="true"
                :level1-placeholder="t('allCategories')"
                :level2-placeholder="t('selectLevel2')"
                :level3-placeholder="t('selectLevel3')"
              />
            </div>
          </div>
          <div class="submissions-list">
            <CenterTemplateCard
              v-for="item in paginatedMySubmissions"
              :key="item.submission_id"
              :card-id="item.submission_id"
              :title="resolveCurrentTemplateName(item.template_id, item.title)"
              :template-id="item.template_id"
              :template-code="resolveCurrentTemplateSummary(item.template_id)?.template_code || ''"
              :description="item.description || ''"
              :cover-url="resolveCenterThumbnailUrl(item)"
              :category-label="resolveSubmissionCategory(item)"
              :date-label="formatTemplateDate(item.updated_at || item.created_at)"
              :badges="[{ label: formatLocalizedSubmissionStatus(item.status), tone: resolveSubmissionBadgeTone(item.status) }]"
              :meta-chips="resolveCenterOwnerId(item) ? [`${t('tenantPrefix')}: ${resolveTenantLabel(resolveCenterOwnerId(item))}`] : []"
              :data-testid="`center-submission-${item.submission_id}`"
            >
              <button type="button" class="next-action primary" @click="previewListing(item.template_id, item.status)">{{ t("preview") }}</button>
              <button type="button" class="next-action ghost" @click="toggleHistory(item.submission_id)">
                {{ expandedHistory[item.submission_id] ? t("hideHistory") : t("history") }}
              </button>
              <template #extra>
                <div v-if="expandedHistory[item.submission_id] && submissionHistory[item.submission_id]?.length" class="submission-history">
                  <h4>{{ t("history") }}</h4>
                  <div v-for="entry in submissionHistory[item.submission_id]" :key="entry.review_event_id" class="history-item">
                    <span class="history-action">{{ entry.action }}</span>
                    <span class="history-actor">{{ entry.actor_email || t("system") }}</span>
                    <span class="history-time">{{ entry.created_at }}</span>
                    <span v-if="entry.note" class="history-note">{{ entry.note }}</span>
                  </div>
                </div>
              </template>
            </CenterTemplateCard>
          </div>
          <div v-if="!filteredMySubmissions.length" class="empty-state">
            <strong>{{ t("noSubmissionsYet") }}</strong>
            <span>{{ t("submittedTemplatesAppearHere") }}</span>
          </div>
          <PaginationBar
            v-if="filteredMySubmissions.length"
            v-model:current-page="mySubmissionsPage"
            :total-pages="mySubmissionTotalPages"
            :total-items="filteredMySubmissions.length"
            :page-size="CENTER_PAGE_SIZE"
          />
        </div>
      </div>

      <!-- Review Queue Section -->
      <div class="center-card" v-if="authStore.isPlatformAdmin">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">🔍</div>
            <div class="card-text">
              <h2 class="card-title">{{ t("reviewQueue") }}</h2>
              <p class="card-description">{{ t("reviewQueueDesc") }}</p>
            </div>
          </div>
          <div class="card-header-controls">
            <input
              v-model="reviewSearch"
              class="center-search-input"
              :placeholder="t('reviewSearch')"
            />
          </div>
        </div>
        
        <div class="card-content">
          <div class="review-controls">
            <div class="center-filter-dropdowns">
              <FilterDropdown v-model="submissionStatusFilter" :options="reviewStatusOptions" />
              <FilterDropdown v-model="selectedReviewOwner" :options="centerOwnerDropdownOptions" />
            </div>
            <div class="center-category-toolbar">
              <CategoryCascadeSelector
                v-model="selectedReviewCategory"
                :categories="categories"
                clear-value="all"
                :allow-non-leaf="true"
                :level1-placeholder="t('allCategories')"
                :level2-placeholder="t('selectLevel2')"
                :level3-placeholder="t('selectLevel3')"
              />
            </div>
          </div>
          
          <div class="submissions-list">
            <CenterTemplateCard
              v-for="item in paginatedReviewSubmissions"
              :key="item.submission_id"
              :card-id="item.submission_id"
              :title="resolveCurrentTemplateName(item.template_id, item.title)"
              :template-id="item.template_id"
              :template-code="resolveCurrentTemplateSummary(item.template_id)?.template_code || ''"
              :description="item.description || ''"
              :cover-url="resolveCenterThumbnailUrl(item)"
              :category-label="resolveSubmissionCategory(item)"
              :date-label="formatTemplateDate(item.reviewed_at || item.updated_at || item.created_at)"
              :badges="[{ label: formatLocalizedSubmissionStatus(item.status), tone: resolveSubmissionBadgeTone(item.status) }]"
              :meta-chips="[item.tenant_id ? `${t('tenantPrefix')}: ${resolveTenantLabel(item.tenant_id)}` : ''].filter(Boolean)"
              :data-testid="`center-submission-${item.submission_id}`"
            >
              <button type="button" class="next-action primary" @click="previewListing(item.template_id, item.status)">{{ t("preview") }}</button>
              <button
                type="button"
                class="next-action secondary"
                :data-testid="`center-start-review-${item.submission_id}`"
                :disabled="!canReview(item.status, 'start_review')"
                @click="openReviewConfirmation(item, 'start_review')"
              >
                {{ t("startReview") }}
              </button>
              <button
                type="button"
                class="next-action secondary"
                :data-testid="`center-request-changes-${item.submission_id}`"
                :disabled="!canReview(item.status, 'changes_requested')"
                @click="openReviewConfirmation(item, 'changes_requested')"
              >
                {{ t("changes") }}
              </button>
              <button
                type="button"
                class="next-action primary"
                :data-testid="`center-approve-${item.submission_id}`"
                :disabled="!canReview(item.status, 'approved')"
                @click="openReviewConfirmation(item, 'approved')"
              >
                {{ t("approve") }}
              </button>
              <button
                type="button"
                class="next-action ghost danger"
                :data-testid="`center-reject-${item.submission_id}`"
                :disabled="!canReview(item.status, 'rejected')"
                @click="openReviewConfirmation(item, 'rejected')"
              >
                {{ t("reject") }}
              </button>
              <button type="button" class="next-action ghost" @click="toggleHistory(item.submission_id)">
                {{ expandedHistory[item.submission_id] ? t("hideHistory") : t("history") }}
              </button>
              <template #extra>
                <div v-if="expandedHistory[item.submission_id] && submissionHistory[item.submission_id]?.length" class="submission-history">
                  <h4>{{ t("history") }}</h4>
                  <div v-for="entry in submissionHistory[item.submission_id]" :key="entry.review_event_id" class="history-item">
                    <span class="history-action">{{ entry.action }}</span>
                    <span class="history-actor">{{ entry.actor_email || t("system") }}</span>
                    <span class="history-time">{{ entry.created_at }}</span>
                    <span v-if="entry.note" class="history-note">{{ entry.note }}</span>
                  </div>
                </div>
              </template>
            </CenterTemplateCard>
          </div>
          <div v-if="!filteredReviewSubmissions.length" class="empty-state">
            <strong>{{ t("noSubmissionsInView") }}</strong>
            <span>{{ t("adjustFilters") }}</span>
          </div>
          <PaginationBar
            v-if="filteredReviewSubmissions.length"
            v-model:current-page="reviewSubmissionsPage"
            :total-pages="reviewSubmissionTotalPages"
            :total-items="filteredReviewSubmissions.length"
            :page-size="CENTER_PAGE_SIZE"
          />
        </div>
      </div>

      <!-- Template Center Section -->
      <div class="center-card">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">🏪</div>
            <div class="card-text">
              <h2 class="card-title">{{ t("marketplaceListings") }}</h2>
              <p class="card-description">{{ t("browseListedTemplates") }}</p>
            </div>
          </div>
          <div class="card-header-controls">
            <input
              v-model="listingSearch"
              class="center-search-input"
              :placeholder="t('searchTemplate')"
            />
          </div>
        </div>
        
        <div class="card-content">
          <div class="listing-filter-row">
            <FilterDropdown
              v-if="authStore.isPlatformAdmin"
              v-model="selectedListingOwner"
              :options="centerOwnerDropdownOptions"
            />
            <FilterDropdown
              v-model="selectedListingApiStatus"
              :options="listingApiStatusOptions"
            />
            <div class="center-category-toolbar">
              <CategoryCascadeSelector
                v-model="selectedListingCategory"
                :categories="categories"
                clear-value="all"
                :allow-non-leaf="true"
                :level1-placeholder="t('allCategories')"
                :level2-placeholder="t('selectLevel2')"
                :level3-placeholder="t('selectLevel3')"
              />
            </div>
          </div>
          <div class="listings-grid">
            <CenterTemplateCard
              v-for="item in paginatedListings"
              :key="item.listing_id"
              :card-id="item.listing_id"
              :title="resolveListingTitle(item)"
              :template-id="item.template_id"
              :template-code="item.template_code || resolveCurrentTemplateSummary(item.template_id)?.template_code || ''"
              :show-template-code="false"
              :show-identity="false"
              :description="item.description || ''"
              :cover-url="resolveCenterThumbnailUrl(item)"
              :category-label="resolveListingCategory(item)"
              :date-label="item.listed_at ? formatCenterText(t('listedOn'), { date: formatTemplateDate(item.listed_at) }) : ''"
              :badges="[
                { label: item.tenant_api_status === 'enabled' ? t('apiEnabled') : t('apiDisabled'), tone: item.tenant_api_status === 'enabled' ? 'info' : 'default' },
              ]"
              :meta-chips="[formatMarketplaceCreatorName(item.creator_name) ? `${t('creatorPrefix')}: ${formatMarketplaceCreatorName(item.creator_name)}` : ''].filter(Boolean)"
            >
              <button type="button" class="next-action primary" @click="previewListing(item.template_id)">{{ t("preview") }}</button>
              <button
                v-if="authStore.isPlatformAdmin"
                type="button"
                class="next-action ghost danger"
                @click="openDelistConfirmation(item)"
              >
                {{ t("delist") }}
              </button>
            </CenterTemplateCard>
          </div>
          <div v-if="!filteredListings.length" class="empty-state">
            <strong>{{ t("noListedTemplates") }}</strong>
            <span>{{ t("noListedTemplatesDesc") }}</span>
          </div>
          <PaginationBar
            v-if="filteredListings.length"
            v-model:current-page="listingsPage"
            :total-pages="listingTotalPages"
            :total-items="filteredListings.length"
            :page-size="CENTER_PAGE_SIZE"
          />
        </div>
      </div>
    </div>
  </div>
  <ActionConfirmationModal
    v-model:is-open="confirmModalOpen"
    v-model:note="confirmModalNote"
    :title="confirmModalTitle"
    :message="confirmModalMessage"
    :confirm-text="confirmModalConfirmText"
    :cancel-text="t('cancel')"
    :tone="confirmModalTone"
    :note-label="confirmModalNoteLabel"
    :note-placeholder="confirmModalNotePlaceholder"
    :note-required="confirmModalNoteRequired"
    :loading="confirmModalLoading"
    :error-message="confirmModalError"
    @close="closeConfirmModal"
    @confirm="confirmPendingAction"
  />
</template>

<style scoped>
/* Page Layout */
.center-page {
  padding: 0;
}

.center-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
}

.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-height: 88px;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.stat-label {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-card strong {
  color: #0f172a;
  font-size: 1.25rem;
}

.submission-preview,
.listing-preview {
  margin: 0.9rem 0;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #f8fafc;
  width: 136px;
  height: 102px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submission-preview img,
.listing-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.history-note {
  color: #334155;
}

/* Cards */
.center-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.2rem 1rem;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.card-header-main {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 0;
  flex: 1;
}

.card-header-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 1 420px;
  min-width: 280px;
}

.page-links {
  gap: 0.75rem;
  flex-wrap: wrap;
}

.center-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 0.95rem;
  border-radius: 0.7rem;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid #2563eb;
}

.center-link-btn.secondary {
  background: #fff;
  color: #1d4ed8;
  border-color: #cbd5e1;
}

.repo-owner-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card-icon {
  font-size: 1.2rem;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #0ea5e9);
  border-radius: 0.6rem;
  color: white;
  flex: 0 0 auto;
}

.card-text {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.card-description {
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.center-search-input {
  width: 100%;
  max-width: 460px;
  flex: 0 1 460px;
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  padding: 0 0.85rem;
  background: white;
}

.center-search-input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.35);
}

.card-content {
  padding: 1rem 1.25rem 1.25rem;
}

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.form-input {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
}

/* Review Controls */
.review-controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: start;
  justify-content: stretch;
  margin-bottom: 1rem;
  padding: 0;
  background: transparent;
  border-radius: 0;
  border: 0;
}

.center-filter-dropdowns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
}

.control-group {
  flex: 1;
  min-width: 200px;
}

.control-group-category {
  min-width: 340px;
}

.center-category-toolbar {
  width: 100%;
  max-width: none;
  margin-left: 0;
  min-width: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  background: #f8fafc;
  position: relative;
  z-index: 5;
  overflow: visible;
}

.center-category-toolbar :deep(.category-cascade) {
  gap: 0.45rem;
}

.center-category-toolbar :deep(.cascade-grid) {
  gap: 0.55rem;
}

.center-category-toolbar :deep(.cascade-select-trigger) {
  padding: 0.62rem 0.75rem;
  font-size: 0.88rem;
  border-radius: 10px;
}

.center-category-toolbar :deep(.cascade-clear) {
  padding: 0.62rem 0.78rem;
  border-radius: 10px;
}

.control-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
}

/* Submissions List */
.submissions-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.submission-item {
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 0.8rem;
  background: white;
  transition: all 0.2s ease;
}

.submission-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.submission-title {
  font-size: 0.98rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.35;
}

.submission-status {
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.submission-status.submitted {
  background: #fef3c7;
  color: #92400e;
}

.submission-status.under_review {
  background: #dbeafe;
  color: #1e40af;
}

.submission-status.changes_requested {
  background: #fee2e2;
  color: #991b1b;
}

.submission-status.approved {
  background: #d1fae5;
  color: #065f46;
}

.submission-status.rejected {
  background: #f3f4f6;
  color: #374151;
}

.submission-main,
.listing-main {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  margin-bottom: 0.75rem;
}

.submission-content,
.listing-content {
  min-width: 0;
}

.submission-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.6rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.detail-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-value {
  font-size: 0.82rem;
  color: #1f2937;
  line-height: 1.4;
  word-break: break-word;
}

.submission-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.submission-history {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #e2e8f0;
}

.submission-history h4 {
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(90px, auto) minmax(120px, auto) minmax(140px, auto) 1fr;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid #eef2f7;
  align-items: start;
}

.history-item:last-child {
  border-bottom: none;
}

.history-action,
.history-actor,
.history-time,
.history-note {
  font-size: 0.82rem;
  color: #475569;
  word-break: break-word;
}

.history-action {
  font-weight: 700;
  color: #1f2937;
}

/* Listings Grid */
.center-filter-card {
  margin-bottom: 1.5rem;
}

.center-filter-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.center-filter-copy {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #64748b;
}

.center-filter-copy strong {
  color: #111827;
  font-size: 0.98rem;
}

.center-filter-control {
  flex: 1;
  min-width: 320px;
}

.empty-state {
  margin-top: 1rem;
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: center;
  color: #475569;
  background: #f8fafc;
}

.empty-state.compact {
  margin-top: 1.5rem;
}

.listings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.listing-item {
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 0.8rem;
  background: white;
  transition: all 0.2s ease;
}

.listing-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.listing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.listing-title {
  font-size: 0.98rem;
  font-weight: 600;
  color: #1f2937;
}

.listing-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.6rem;
}

.listing-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.listing-filter-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: start;
}

.listing-filter-row > * {
  min-width: 0;
}

.listing-filter-control {
  justify-self: end;
}

@media (max-width: 900px) {
  .card-header {
    flex-direction: column;
  }

  .card-header-controls {
    width: 100%;
    min-width: 0;
    justify-content: flex-start;
  }

  .center-filter-content {
    flex-direction: column;
  }

  .center-filter-control {
    width: 100%;
    min-width: 0;
  }

  .listing-filter-row {
    grid-template-columns: 1fr;
  }

  .listing-filter-control,
  .control-group-category,
  .center-category-toolbar,
  .center-filter-dropdowns {
    width: 100%;
    min-width: 0;
    max-width: none;
  }

  .center-category-toolbar {
    margin-left: 0;
  }

  .submission-main,
  .listing-main {
    grid-template-columns: 1fr;
  }

  .submissions-list,
  .listings-grid {
    grid-template-columns: 1fr;
  }

  .history-item {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .submission-preview,
  .listing-preview {
    width: 100%;
    max-width: 180px;
  }
}

/* Buttons */
.listing-filter-control {
  flex: 1;
  min-width: 320px;
  max-width: 760px;
}
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #0ea5e9);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0ea5e9, #1d4ed8);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #d1d5db;
  background: #f8fafc;
}

.btn-secondary.danger {
  color: #dc2626;
  border-color: #fecaca;
}

.btn-secondary.danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #f87171;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-ghost:hover:not(:disabled) {
  background: #f8fafc;
  color: #374151;
}

.btn-icon {
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .center-page {
    padding: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .review-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    min-width: auto;
  }
  
  .submission-actions {
    flex-direction: column;
  }
  
  .listings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
