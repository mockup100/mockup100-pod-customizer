<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { gatewayPlatformFetch } from "../../api/client"
import type { ArtworkListItem, ArtworkSubmissionSummary } from "../../api/client"
import { useArtworkStore } from "../../stores/artworks"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import ActionConfirmationModal from "../../components/admin/ActionConfirmationModal.vue"
import CenterArtworkCard from "../../components/admin/CenterArtworkCard.vue"
import { buildCategoryIdSet, findCategoryPath, formatTemplateDate } from "./repositoryView"
import { canReviewSubmission } from "./centerView"
import {
  formatMarketplaceCreatorName,
  buildArtworkCenterStats,
  getListedMarketplaceArtworks,
  normalizeArtworkSubmissionStatus,
  resolveArtworkCenterName,
  resolveArtworkCenterSummary,
} from "./artworkCenterView"
import { useArtworkCenterActions } from "./useArtworkCenterActions"
import { readAdminTenantContextWithStorage } from "./adminTenantContext"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"

const route = useRoute()
const router = useRouter()
const artworkStore = useArtworkStore()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { platformItems, tenantItems, platformCategories, tenantCategories, submissionHistory } = storeToRefs(artworkStore)
const { locale } = storeToRefs(uiLocaleStore)

const ARTWORK_CENTER_I18N = {
  en: {
    confirm: "Confirm",
    cancel: "Cancel",
    artworkCenter: "Artwork Center",
    pageDescAdmin: "Review submissions and listings.",
    pageDescTenant: "Track artwork submissions and listings.",
    tenantContext: "Tenant Context",
    centerSubmissions: "Center Submissions",
    pending: "Pending",
    submitted: "Submitted",
    underReview: "Under Review",
    changesRequested: "Changes Requested",
    approved: "Approved",
    rejected: "Rejected",
    listedArtwork: "Listed Artwork",
    mySubmissions: "My Submissions",
    trackSubmissionStatus: "Track listed artwork after submission.",
    searchArtwork: "Search artwork name, code, category, or tenant",
    reviewSearch: "Search artwork name, code, category, tenant, or reviewer",
    reviewQueue: "Review Queue",
    reviewQueueDesc: "Review listed tenant artwork and update submission status.",
    marketplaceListings: "Marketplace Listings",
    browseApprovedListings: "Browse approved artwork listings.",
    allStatuses: "All Statuses",
    allUsers: "All Users",
    allCommerce: "All Commerce",
    free: "Free",
    paid: "Paid",
    allCategories: "All Categories",
    selectLevel2: "Select Level 2",
    selectLevel3: "Select Level 3",
    uncategorized: "Uncategorized",
    pendingReview: "Pending Review",
    reviewNote: "Review Note",
    reviewNoteRequired: "Review note is required",
    preview: "Preview",
    startReview: "Start Review",
    changes: "Changes",
    approve: "Approve",
    reject: "Reject",
    delist: "Delist",
    delistArtwork: "Delist Artwork",
    delistReason: "Delist Reason",
    delistReasonRequired: "Required reason for delisting this artwork",
    reviewActionMessage: "{action} submission {submissionId} for artwork {artworkName}?",
    delistArtworkMessage: "Delist marketplace listing for artwork {artworkName}?",
    tenantPrefix: "Tenant",
    tenantMissing: "n/a",
    status: "Status",
    hideHistory: "Hide History",
    history: "History",
    system: "system",
    noSubmissionsYet: "No submissions yet.",
    noSubmissionsYetDesc: "List artwork in Artwork Library, then submit it to Artwork Center.",
    noSubmissionsInView: "No submissions in this view.",
    adjustFiltersSubmissions: "Adjust filters to see more submissions.",
    noListedArtwork: "No listed artwork.",
    adjustFiltersListings: "Adjust filters to see more listings.",
    listedOn: "Listed on {date}",
    creatorPrefix: "Creator",
    tokensUnit: "tokens",
  },
  zh: {
    confirm: "确认",
    cancel: "取消",
    artworkCenter: "作品中心",
    pageDescAdmin: "审核投稿与上架列表。",
    pageDescTenant: "跟踪作品投稿与上架状态。",
    tenantContext: "租户上下文",
    centerSubmissions: "中心投稿",
    pending: "待审核",
    submitted: "已提交",
    underReview: "审核中",
    changesRequested: "要求修改",
    approved: "已通过",
    rejected: "已拒绝",
    listedArtwork: "已上架作品",
    mySubmissions: "我的投稿",
    trackSubmissionStatus: "跟踪提交后的上架作品状态。",
    searchArtwork: "搜索作品名称、编码、分类或租户",
    reviewSearch: "搜索作品名称、编码、分类、租户或审核人",
    reviewQueue: "审核队列",
    reviewQueueDesc: "审核租户已上架作品并更新投稿状态。",
    marketplaceListings: "市场上架",
    browseApprovedListings: "浏览已通过审核的作品上架内容。",
    allStatuses: "全部状态",
    allUsers: "全部用户",
    allCommerce: "全部商业类型",
    free: "免费",
    paid: "付费",
    allCategories: "全部分类",
    selectLevel2: "选择二级分类",
    selectLevel3: "选择三级分类",
    uncategorized: "未分类",
    pendingReview: "待审核",
    reviewNote: "审核备注",
    reviewNoteRequired: "审核备注为必填项",
    preview: "预览",
    startReview: "开始审核",
    changes: "要求修改",
    approve: "通过",
    reject: "拒绝",
    delist: "下架",
    delistArtwork: "下架作品",
    delistReason: "下架原因",
    delistReasonRequired: "请填写下架该作品的原因",
    reviewActionMessage: "{action}作品 {artworkName} 的投稿 {submissionId} 吗？",
    delistArtworkMessage: "确定下架作品 {artworkName} 的市场列表吗？",
    tenantPrefix: "租户",
    tenantMissing: "无",
    status: "状态",
    hideHistory: "收起历史",
    history: "历史",
    system: "系统",
    noSubmissionsYet: "还没有投稿。",
    noSubmissionsYetDesc: "先在作品库中上架作品，再提交到作品中心。",
    noSubmissionsInView: "当前视图下没有投稿。",
    adjustFiltersSubmissions: "调整筛选条件以查看更多投稿。",
    noListedArtwork: "暂无已上架作品。",
    adjustFiltersListings: "调整筛选条件以查看更多上架内容。",
    listedOn: "上架时间 {date}",
    creatorPrefix: "作者",
    tokensUnit: "令牌",
  },
} as const

function t(key: keyof typeof ARTWORK_CENTER_I18N.en) {
  const currentLocale = locale.value === "zh" ? "zh" : "en"
  return ARTWORK_CENTER_I18N[currentLocale][key]
}

const submissionStatusFilter = ref("all")
const mySubmissionsStatusFilter = ref("all")
const selectedMySubmissionsCategory = ref("all")
const selectedReviewCategory = ref("all")
const selectedListingCategory = ref("all")
const selectedListingCommerceType = ref("all")
const selectedReviewOwner = ref("all")
const selectedListingOwner = ref("all")
const mySubmissionsSearch = ref("")
const reviewSearch = ref("")
const listingSearch = ref("")
const submissions = ref<ArtworkSubmissionSummary[]>([])
const expandedHistory = ref<Record<string, boolean>>({})
const reviewNote = ref("")
const tenantLabels = ref<Record<string, string>>({})
const tenantDirectory = ref<Array<{ tenant_id: string; email?: string; name?: string }>>([])
const confirmModalOpen = ref(false)
const confirmModalLoading = ref(false)
const confirmModalTitle = ref("")
const confirmModalMessage = ref("")
const confirmModalConfirmText = ref(t("confirm"))
const confirmModalTone = ref<"primary" | "danger">("primary")
const confirmModalNote = ref("")
const confirmModalNoteLabel = ref(t("reviewNote"))
const confirmModalNotePlaceholder = ref("")
const confirmModalNoteRequired = ref(false)
const confirmModalError = ref("")
const pendingAction = ref<
  | { kind: "review"; submissionId: string; decision: "start_review" | "changes_requested" | "approved" | "rejected" }
  | { kind: "delist"; artworkId: string; title: string }
  | null
>(null)
const mySubmissionsPage = ref(1)
const reviewSubmissionsPage = ref(1)
const listingsPage = ref(1)
const CENTER_PAGE_SIZE = 12

function formatArtworkCenterText(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || "")
}

const { reviewSubmission, showHistory, delistListing, previewListing } = useArtworkCenterActions({
  router,
  authStore,
  artworkStore,
  getSubmissionStatusFilter: () => submissionStatusFilter.value,
})

const categories = computed(() => authStore.isPlatformAdmin ? platformCategories.value : tenantCategories.value)
const runtimeArtworks = computed(() => authStore.isPlatformAdmin ? platformItems.value : tenantItems.value)
const tenantContext = computed(() => readAdminTenantContextWithStorage(route.query))
const scopedTenantId = computed(() => authStore.isPlatformAdmin ? (tenantContext.value.tenantId || "") : (authStore.tenant?.tenant_id || ""))
const scopedSubmissions = computed(() => {
  if (!scopedTenantId.value) return submissions.value
  return submissions.value.filter((item) => item.tenant_id === scopedTenantId.value)
})
const scopedPlatformItems = computed(() => {
  if (!scopedTenantId.value) return platformItems.value
  return platformItems.value.filter((item) => item.owner_tenant_id === scopedTenantId.value)
})
const listedListings = computed(() => getListedMarketplaceArtworks(scopedPlatformItems.value))
const centerStats = computed(() => buildArtworkCenterStats(scopedSubmissions.value, scopedPlatformItems.value))
const mySubmissionsCategoryIdSet = computed(() => buildCategoryIdSet(selectedMySubmissionsCategory.value, categories.value))
const reviewCategoryIdSet = computed(() => buildCategoryIdSet(selectedReviewCategory.value, categories.value))
const listingCategoryIdSet = computed(() => buildCategoryIdSet(selectedListingCategory.value, categories.value))
const centerOwnerOptions = computed(() => {
  const ids = tenantDirectory.value.map((item) => item.tenant_id).filter(Boolean)
  if (ids.length) return ids.sort()
  const fallback = new Set<string>()
  submissions.value.forEach((item) => { if (item.tenant_id) fallback.add(item.tenant_id) })
  platformItems.value.forEach((item) => { if (item.owner_tenant_id) fallback.add(item.owner_tenant_id) })
  return Array.from(fallback).sort()
})
const reviewStatusOptions = computed(() => [
  { value: "all", label: t("allStatuses") },
  { value: "submitted", label: t("submitted") },
  { value: "under_review", label: t("underReview") },
  { value: "changes_requested", label: t("changesRequested") },
  { value: "approved", label: t("approved") },
  { value: "rejected", label: t("rejected") },
])
const centerOwnerDropdownOptions = computed(() => [
  { value: "all", label: t("allUsers") },
  ...centerOwnerOptions.value.map((owner) => ({
    value: owner,
    label: resolveTenantLabel(owner),
  })),
])
const listingCommerceOptions = computed(() => [
  { value: "all", label: t("allCommerce") },
  { value: "free", label: t("free") },
  { value: "paid", label: t("paid") },
])

function resolveCurrentArtworkSummary(artworkId: string) {
  return resolveArtworkCenterSummary(artworkId, runtimeArtworks.value)
}

function resolveCenterCategoryLabel(input: { category_id?: string; category_path?: string; artwork_id: string }) {
  const runtimeSummary = resolveCurrentArtworkSummary(input.artwork_id)
  const runtimePath = runtimeSummary?.category_path || ""
  const explicitPath = input.category_path || ""
  const categoryId = input.category_id || runtimeSummary?.category_id || ""
  const visiblePath = [explicitPath, runtimePath].find((value) => value && !/^art_[a-z0-9]+$/i.test(value)) || ""
  if (visiblePath) return visiblePath
  if (categoryId) {
    return findCategoryPath(categoryId, categories.value) || t("uncategorized")
  }
  return t("uncategorized")
}

function resolveSubmissionCategory(item: { category_id?: string; category_path?: string; artwork_id: string }) {
  return resolveCenterCategoryLabel(item)
}

function resolveListingCategory(item: { category_id?: string; category_path?: string; artwork_id: string }) {
  return resolveCenterCategoryLabel(item)
}

function isSubmissionVisible(item: ArtworkSubmissionSummary) {
  if (String(item.artwork_status || "").toLowerCase() !== "disabled"
    && String(item.visibility_status || "").toLowerCase() !== "disabled") {
    return true
  }
  return Boolean(resolveSubmissionLinkedListing(item))
}

function resolveSubmissionLinkedListing(item: ArtworkSubmissionSummary) {
  const linkedPlatformId = String(item.platform_artwork_id || "").trim()
  return listedListings.value.find((listing) =>
    listing.artwork_id === linkedPlatformId
      || (String(listing.source_provider || "").toLowerCase() === "tenant_submission"
        && String(listing.source_asset_id || "").trim() === String(item.artwork_id || "").trim()),
  ) || null
}

function resolveListingTitle(item: ArtworkListItem) {
  return String(item.name || "").trim() || resolveCurrentArtworkName(item.artwork_id, item.artwork_id)
}

function resolveCurrentArtworkName(artworkId: string, fallback = "") {
  return resolveArtworkCenterName(artworkId, runtimeArtworks.value, fallback)
}

function resolveCenterCategoryId(input: { artwork_id: string; category_id?: string }) {
  return input.category_id || resolveCurrentArtworkSummary(input.artwork_id)?.category_id || ""
}

function resolveCenterThumbnailUrl(
  input: {
    artwork_id: string
    preview_url?: string
    platform_artwork_id?: string
    tenant_id?: string
    owner_tenant_id?: string | null
  },
  fallback = "",
) {
  if (input.preview_url) return input.preview_url
  const runtimePreview = resolveCurrentArtworkSummary(input.artwork_id)?.preview_url
  if (runtimePreview) return runtimePreview
  const linkedListing = "platform_artwork_id" in input
    ? resolveSubmissionLinkedListing(input as ArtworkSubmissionSummary)
    : null
  return linkedListing?.preview_url || fallback
}

function resolveCenterOwnerId(input: { artwork_id: string; tenant_id?: string; owner_tenant_id?: string | null }) {
  return input.tenant_id || input.owner_tenant_id || resolveCurrentArtworkSummary(input.artwork_id)?.owner_tenant_id || ""
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
  switch (normalizeArtworkSubmissionStatus(status)) {
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

function resolveSubmissionBadgeLabel(status: string) {
  switch (normalizeArtworkSubmissionStatus(status)) {
    case "submitted":
      return t("submitted")
    case "under_review":
      return t("underReview")
    case "changes_requested":
      return t("changesRequested")
    case "approved":
      return t("approved")
    case "rejected":
      return t("rejected")
    default:
      return t("pendingReview")
  }
}

function getReviewActionLabel(decision: "start_review" | "changes_requested" | "approved" | "rejected") {
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

function canReview(status: string, decision: "start_review" | "changes_requested" | "approved" | "rejected") {
  return canReviewSubmission(normalizeArtworkSubmissionStatus(status), decision)
}

function openReviewConfirmation(
  item: { submission_id: string; artwork_id: string; title: string },
  decision: "start_review" | "changes_requested" | "approved" | "rejected",
) {
  if (!authStore.isPlatformAdmin) return
  pendingAction.value = { kind: "review", submissionId: item.submission_id, decision }
  const label = getReviewActionLabel(decision)
  confirmModalTitle.value = label
  confirmModalMessage.value = formatArtworkCenterText(t("reviewActionMessage"), {
    action: label,
    submissionId: item.submission_id,
    artworkName: resolveCurrentArtworkName(item.artwork_id, item.title),
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

function openDelistConfirmation(
  item: { artwork_id: string; name?: string },
) {
  if (!authStore.isPlatformAdmin) return
  pendingAction.value = { kind: "delist", artworkId: item.artwork_id, title: resolveListingTitle(item as ArtworkListItem) }
  confirmModalTitle.value = t("delistArtwork")
  confirmModalMessage.value = formatArtworkCenterText(t("delistArtworkMessage"), {
    artworkName: resolveListingTitle(item as ArtworkListItem),
  })
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
      await loadSubmissions()
    } else {
      await delistListing(pendingAction.value.artworkId, note)
    }
    closeConfirmModal()
  } catch (err) {
    confirmModalError.value = String((err as Error).message || err)
  } finally {
    confirmModalLoading.value = false
  }
}

const filteredMySubmissions = computed(() => submissions.value.filter((item) => {
  if (!isSubmissionVisible(item)) return false
  const keyword = normalizeCenterSearch(mySubmissionsSearch.value)
  const squashedKeyword = squashCenterSearch(mySubmissionsSearch.value)
  if (scopedTenantId.value && item.tenant_id !== scopedTenantId.value) return false
  if (mySubmissionsStatusFilter.value !== "all" && item.status !== mySubmissionsStatusFilter.value) return false
  if (!matchesCenterSearch(keyword, squashedKeyword, [
    resolveCurrentArtworkName(item.artwork_id, item.title),
    item.artwork_id,
    item.artwork_code,
    resolveSubmissionCategory(item),
    resolveTenantLabel(resolveCenterOwnerId(item)),
  ])) return false
  if (selectedMySubmissionsCategory.value === "all") return true
  const categoryId = resolveCenterCategoryId(item)
  return Boolean(categoryId && mySubmissionsCategoryIdSet.value?.has(categoryId))
}))

const filteredReviewSubmissions = computed(() => submissions.value.filter((item) => {
  if (!isSubmissionVisible(item)) return false
  const keyword = normalizeCenterSearch(reviewSearch.value)
  const squashedKeyword = squashCenterSearch(reviewSearch.value)
  if (scopedTenantId.value && item.tenant_id !== scopedTenantId.value) return false
  if (submissionStatusFilter.value !== "all" && item.status !== submissionStatusFilter.value) return false
  if (selectedReviewOwner.value !== "all" && item.tenant_id !== selectedReviewOwner.value) return false
  if (!matchesCenterSearch(keyword, squashedKeyword, [
    resolveCurrentArtworkName(item.artwork_id, item.title),
    item.artwork_id,
    item.artwork_code,
    resolveSubmissionCategory(item),
    resolveTenantLabel(item.tenant_id || ""),
    item.reviewed_by,
  ])) return false
  if (selectedReviewCategory.value === "all") return true
  const categoryId = resolveCenterCategoryId(item)
  return Boolean(categoryId && reviewCategoryIdSet.value?.has(categoryId))
}))

const filteredListings = computed(() => listedListings.value.filter((item) => {
  const keyword = normalizeCenterSearch(listingSearch.value)
  const squashedKeyword = squashCenterSearch(listingSearch.value)
  const ownerId = resolveCenterOwnerId(item)
  if (scopedTenantId.value && ownerId !== scopedTenantId.value) return false
  if (selectedListingOwner.value !== "all" && ownerId !== selectedListingOwner.value) return false
  if (selectedListingCommerceType.value !== "all" && (item.commerce_type || "free") !== selectedListingCommerceType.value) return false
  if (!matchesCenterSearch(keyword, squashedKeyword, [
    resolveListingTitle(item),
    item.artwork_id,
    item.artwork_code,
    resolveListingCategory(item),
    resolveTenantLabel(ownerId),
    item.commerce_type === "paid" ? t("paid") : t("free"),
    item.creator_name,
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

async function loadSubmissions() {
  submissions.value = await artworkStore.listArtworkSubmissions({
    tenantId: authStore.isPlatformAdmin ? (scopedTenantId.value || undefined) : authStore.tenant?.tenant_id,
    status: authStore.isPlatformAdmin && submissionStatusFilter.value !== "all" ? submissionStatusFilter.value : undefined,
    limit: 200,
  }) as ArtworkSubmissionSummary[]
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
    artworkStore.loadCategories(authStore.isPlatformAdmin ? "platform" : "tenant").catch(() => undefined),
    artworkStore.loadLibrary("platform", {
      status: "active",
      visibility_status: "listed",
      size: 200,
    }).catch(() => undefined),
    loadSubmissions().catch(() => undefined),
    hydrateTenantLabels().catch(() => undefined),
  ]).catch(() => undefined)
})
</script>

<template>
  <div class="center-page" data-testid="admin-artwork-center-page">
    <div class="center-content">
      <div class="center-card">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">🖼️</div>
            <div class="card-text">
              <h1 class="card-title">{{ t("artworkCenter") }}</h1>
              <p class="card-description">
                {{ authStore.isPlatformAdmin
                  ? t("pageDescAdmin")
                  : t("pageDescTenant") }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="tenantContext.tenantId" class="context-banner">
        <strong>{{ t("tenantContext") }}</strong>
        <span>{{ tenantContext.tenantLabel || tenantContext.tenantId }}</span>
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
          <span class="stat-label">{{ t("approved") }}</span>
          <strong>{{ centerStats.approved }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t("listedArtwork") }}</span>
          <strong>{{ centerStats.listedArtworks }}</strong>
        </div>
      </div>

      <div class="center-card" v-if="authStore.isTenantAdmin">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">📮</div>
            <div class="card-text">
              <h2 class="card-title">{{ t("mySubmissions") }}</h2>
              <p class="card-description">{{ t("trackSubmissionStatus") }}</p>
            </div>
          </div>
          <div class="card-header-controls">
            <input
              v-model="mySubmissionsSearch"
              class="center-search-input"
              :placeholder="t('searchArtwork')"
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
            <CenterArtworkCard
              v-for="item in paginatedMySubmissions"
              :key="item.submission_id"
              :card-id="item.submission_id"
              :title="resolveCurrentArtworkName(item.artwork_id, item.title)"
              :artwork-id="item.artwork_id"
              :artwork-code="item.artwork_code || ''"
              :description="item.description || ''"
              :cover-url="resolveCenterThumbnailUrl(item)"
              :category-label="resolveSubmissionCategory(item)"
              :date-label="formatTemplateDate(item.updated_at || item.created_at)"
              :badges="[{ label: resolveSubmissionBadgeLabel(item.status), tone: resolveSubmissionBadgeTone(item.status) }]"
              :meta-chips="resolveCenterOwnerId(item) ? [`${t('tenantPrefix')}: ${resolveTenantLabel(resolveCenterOwnerId(item))}`] : []"
              :hover-details="[
                resolveSubmissionCategory(item),
                item.artwork_code || item.artwork_id,
                `${t('status')}: ${resolveSubmissionBadgeLabel(item.status)}`,
              ]"
            >
              <button type="button" class="next-action ghost" @click="previewListing(item.artwork_id)">
                {{ t("preview") }}
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
            </CenterArtworkCard>
          </div>
          <div v-if="!filteredMySubmissions.length" class="empty-state">
            <strong>{{ t("noSubmissionsYet") }}</strong>
            <span>{{ t("noSubmissionsYetDesc") }}</span>
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
            <CenterArtworkCard
              v-for="item in paginatedReviewSubmissions"
              :key="item.submission_id"
              :card-id="item.submission_id"
              :title="resolveCurrentArtworkName(item.artwork_id, item.title)"
              :artwork-id="item.artwork_id"
              :artwork-code="item.artwork_code || ''"
              :description="item.description || ''"
              :cover-url="resolveCenterThumbnailUrl(item)"
              :category-label="resolveSubmissionCategory(item)"
              :date-label="formatTemplateDate(item.reviewed_at || item.updated_at || item.created_at)"
              :badges="[{ label: resolveSubmissionBadgeLabel(item.status), tone: resolveSubmissionBadgeTone(item.status) }]"
              :meta-chips="[item.tenant_id ? `${t('tenantPrefix')}: ${resolveTenantLabel(item.tenant_id)}` : ''].filter(Boolean)"
              :hover-details="[
                resolveSubmissionCategory(item),
                item.artwork_code || item.artwork_id,
                item.tenant_id ? `${t('tenantPrefix')}: ${resolveTenantLabel(item.tenant_id)}` : `${t('tenantPrefix')}: ${t('tenantMissing')}`,
              ]"
            >
              <button type="button" class="next-action ghost" @click="previewListing(item.artwork_id)">
                {{ t("preview") }}
              </button>
              <button
                type="button"
                class="next-action primary"
                v-if="canReview(item.status, 'start_review')"
                @click="openReviewConfirmation(item, 'start_review')"
              >
                {{ t("startReview") }}
              </button>
              <button
                type="button"
                class="next-action ghost"
                v-if="canReview(item.status, 'changes_requested')"
                @click="openReviewConfirmation(item, 'changes_requested')"
              >
                {{ t("changes") }}
              </button>
              <button
                type="button"
                class="next-action primary"
                v-if="canReview(item.status, 'approved')"
                @click="openReviewConfirmation(item, 'approved')"
              >
                {{ t("approve") }}
              </button>
              <button
                type="button"
                class="next-action ghost danger"
                v-if="canReview(item.status, 'rejected')"
                @click="openReviewConfirmation(item, 'rejected')"
              >
                {{ t("reject") }}
              </button>
              <button
                v-if="resolveSubmissionLinkedListing(item)"
                type="button"
                class="next-action ghost danger"
                @click="openDelistConfirmation(resolveSubmissionLinkedListing(item)!)"
              >
                {{ t("delist") }}
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
            </CenterArtworkCard>
          </div>
          <div v-if="!filteredReviewSubmissions.length" class="empty-state">
            <strong>{{ t("noSubmissionsInView") }}</strong>
            <span>{{ t("adjustFiltersSubmissions") }}</span>
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

      <div class="center-card">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-icon">🏪</div>
            <div class="card-text">
              <h2 class="card-title">{{ t("marketplaceListings") }}</h2>
              <p class="card-description">{{ t("browseApprovedListings") }}</p>
            </div>
          </div>
          <div class="card-header-controls">
            <input
              v-model="listingSearch"
              class="center-search-input"
              :placeholder="t('searchArtwork')"
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
              v-model="selectedListingCommerceType"
              :options="listingCommerceOptions"
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
            <CenterArtworkCard
              v-for="item in paginatedListings"
              :key="item.artwork_id"
              :card-id="item.artwork_id"
              :title="resolveListingTitle(item)"
              :artwork-id="item.artwork_id"
              :artwork-code="item.artwork_code || ''"
              :show-artwork-code="false"
              :show-identity="false"
              :description="item.description || ''"
              :cover-url="resolveCenterThumbnailUrl(item)"
              :category-label="resolveListingCategory(item)"
              :date-label="item.listed_at ? formatArtworkCenterText(t('listedOn'), { date: formatTemplateDate(item.listed_at) }) : ''"
              :badges="[
                { label: item.commerce_type === 'paid' ? t('paid') : t('free'), tone: item.commerce_type === 'paid' ? 'info' : 'default' },
              ]"
              :meta-chips="[formatMarketplaceCreatorName(item.creator_name) ? `${t('creatorPrefix')}: ${formatMarketplaceCreatorName(item.creator_name)}` : ''].filter(Boolean)"
              :hover-details="[
                resolveListingCategory(item),
                item.artwork_code || item.artwork_id,
                item.commerce_type === 'paid' ? `${item.price_tokens || 0} ${t('tokensUnit')}` : t('free'),
              ]"
            >
              <button type="button" class="next-action ghost" @click="previewListing(item.artwork_id)">
                {{ t("preview") }}
              </button>
              <button
                v-if="authStore.isPlatformAdmin"
                type="button"
                class="next-action ghost danger"
                @click="openDelistConfirmation(item)"
              >
                {{ t("delist") }}
              </button>
            </CenterArtworkCard>
          </div>
          <div v-if="!filteredListings.length" class="empty-state">
            <strong>{{ t("noListedArtwork") }}</strong>
            <span>{{ t("adjustFiltersListings") }}</span>
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

.context-banner {
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

.context-link {
  color: #1d4ed8;
  font-weight: 700;
  text-decoration: none;
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

.history-note {
  color: #334155;
}

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

.review-controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: start;
  justify-content: stretch;
  margin-bottom: 1rem;
}

.center-filter-dropdowns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
}

.center-category-toolbar {
  width: 100%;
  min-width: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  background: #f8fafc;
  position: relative;
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

.submissions-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.listings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.listing-filter-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.listing-filter-row > * {
  min-width: 0;
}

.submission-history {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.8rem;
  border-radius: 0.85rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.submission-history h4 {
  margin: 0;
  color: #0f172a;
  font-size: 0.9rem;
}

.history-item {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, max-content));
  gap: 0.55rem 0.9rem;
  align-items: center;
  font-size: 0.82rem;
  color: #475569;
}

.history-action {
  font-weight: 700;
  color: #1d4ed8;
}

.history-time {
  color: #64748b;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px dashed #cbd5e1;
  border-radius: 0.85rem;
  color: #64748b;
  background: #f8fafc;
}

@media (max-width: 900px) {
  .card-header {
    flex-direction: column;
  }

  .card-header-controls {
    width: 100%;
    min-width: 0;
  }

  .listing-filter-row {
    grid-template-columns: 1fr;
  }

  .submissions-list,
  .listings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .center-content {
    gap: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .history-item {
    grid-template-columns: 1fr;
  }
}
</style>
