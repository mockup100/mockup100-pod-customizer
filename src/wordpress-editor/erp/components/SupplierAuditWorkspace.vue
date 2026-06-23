<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"

import {
  fetchErpProductDetail,
  fetchErpProductReviewQueue,
  fetchErpSupplierReviewDetail,
  fetchErpSupplierReviews,
  reviewErpQueuedProduct,
  reviewErpSupplierApplication,
  updateErpProductHomepageRecommendation,
} from "../api"
import { ApiRequestError, resolveApiErrorMessage } from "../../api/client"
import type {
  ErpProductDetail,
  ErpProductSummary,
  ErpSupplierReviewDetail,
  ErpSupplierReviewSummary,
} from "../types"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore } from "../../stores/platform"
import { useUiLocaleStore } from "../../stores/uiLocale"

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiLocaleStore = useUiLocaleStore()
const props = withDefaults(defineProps<{
  section?: "supplier" | "product"
}>(), {
  section: "supplier",
})
const isZh = computed(() => uiLocaleStore.locale === "zh")
const tenantDirectory = ref<Record<string, { email: string; name?: string }>>({})

function containsCjk(value: string) {
  return /[\u4e00-\u9fff]/.test(value)
}

function resolveReviewStatusLabel(status: string, fallbackLabel: string) {
  if (isZh.value) return fallbackLabel
  const trimmed = fallbackLabel.trim()
  if (trimmed && !containsCjk(trimmed)) return trimmed
  const mapping: Record<string, string> = {
    approved: "Approved",
    rejected: "Rejected",
    pending_review: "Pending Review",
    not_started: "Not Started",
    draft: "Draft",
    submitted: "Submitted",
  }
  return mapping[status] || trimmed || status || copy.value.pending
}

function localizeReviewStatusOptions(options: Array<{ value: string; label: string }>) {
  const allLabel = "All"
  const next = options.map((item) => ({
    ...item,
    label: resolveReviewStatusLabel(item.value, item.label || item.value),
  }))
  if (!next.some((item) => item.value === "all")) {
    next.unshift({ value: "all", label: allLabel })
  } else {
    return next.map((item) => (item.value === "all" ? { ...item, label: allLabel } : item))
  }
  return next
}

const copy = computed(() => (isZh.value ? {
  pending: "待处理",
  authRetry: "请先重新登录，再继续处理 Supplier 审核。",
  auditLoadFailed: "Supplier 审核中心加载失败，请稍后重试。",
  supplierReasonRequired: "请填写审核原因",
  supplierApproved: "已通过供应商入驻审核",
  supplierRejected: "已驳回供应商入驻申请",
  productReasonRequired: "请填写商品审核意见",
  productApproved: "已通过商品审核",
  productRejected: "已驳回商品审核",
  homepageOn: "已设为首页推荐",
  homepageOff: "已取消首页推荐",
  supplierHeaderDesc: "供应商审核已独立为左侧导航入口，页面结构与 Product Management 模块保持一致。",
  productHeaderDesc: "产品审核已独立为左侧导航入口，页面结构与 Product Management 模块保持一致。",
  pendingSuppliers: "待审核供应商",
  pendingProducts: "待审核商品",
  keyword: "关键词",
  supplierKeywordPlaceholder: "搜索企业/联系人/企业邮箱/账号ID",
  productKeywordPlaceholder: "搜索商品/模板/SKU",
  reviewStatus: "审核状态",
  listingStatus: "刊登状态",
  refresh: "刷新列表",
  loadingSupplierList: "正在加载供应商审核列表...",
  loadingSupplierDetail: "正在加载供应商详情...",
  loadingProductList: "正在加载产品审核队列...",
  loadingProductDetail: "正在加载商品详情...",
  supplierListTitle: "供应商审核列表",
  supplierDetailTitle: "供应商审核详情",
  emptySupplierCompany: "未填写企业名称",
  emptySupplierList: "当前筛选条件下暂无供应商申请。",
  noRecordCount: "条记录",
  companyName: "公司名称",
  contactName: "联系人",
  contactEmail: "联系邮箱",
  tenantEmail: "企业邮箱",
  accountId: "账号ID",
  updatedAt: "更新时间",
  companyType: "企业类型",
  contactPhone: "联系电话",
  countryCode: "国家代码",
  city: "城市",
  addressLine1: "地址 1",
  addressLine2: "地址 2",
  businessLicenseNo: "营业执照号",
  websiteUrl: "官网",
  businessScope: "业务范围",
  applicationInfo: "申请信息",
  applicationId: "申请单号",
  currentRound: "当前轮次",
  lastSubmittedAt: "最近提交",
  lastReviewedAt: "最近审核",
  rejectionReason: "驳回原因",
  reviewReason: "审核原因",
  reviewReasonPlaceholder: "请填写通过或驳回原因，原因会同步展示给申请方。",
  processing: "处理中...",
  approveSupplier: "审核通过",
  rejectSupplier: "驳回申请",
  pickSupplier: "请选择左侧供应商查看详情。",
  productListTitle: "产品审核列表",
  productListDesc: "按 Product Management 工作台样式展示商品审核队列。",
  productDetailTitle: "产品审核详情",
  productDetailDesc: "查看商品、模板、状态节点与审核备注。",
  emptyProductList: "当前筛选条件下暂无商品。",
  pickProduct: "请选择左侧商品查看审核详情。",
  finishedProductCode: "成品编码",
  productName: "商品名称",
  template: "模板",
  reviewSummary: "审核摘要",
  categoryPath: "叶子类目",
  supplierSku: "供应商 SKU",
  uploadStatus: "上传状态",
  submitTime: "提交时间",
  latestOpinion: "最近意见",
  productReviewNote: "商品审核意见",
  productReviewPlaceholder: "请填写商品通过或驳回原因，便于供应商回改。",
  approveProduct: "商品通过",
  rejectProduct: "商品驳回",
  enableHomepage: "设为首页推荐",
  disableHomepage: "取消首页推荐",
  homepageUpdating: "更新中...",
  statusNodeSupplierReady: "供应商资料完成",
  statusNodeSupplierReadyDesc: "待补齐供应商资料",
  statusNodeListed: "商品已上架",
  statusNodeListedDesc: "未上架",
  statusNodeReview: "平台审核",
  statusNodeReviewDesc: "未提审",
  statusNodeResult: "审核结果",
  statusNodeResultDesc: "等待审核结论",
} : {
  pending: "Pending",
  authRetry: "Please sign in again before continuing the supplier review workflow.",
  auditLoadFailed: "Failed to load the supplier review workspace. Please try again later.",
  supplierReasonRequired: "Please enter a review reason.",
  supplierApproved: "Supplier onboarding has been approved.",
  supplierRejected: "Supplier onboarding has been rejected.",
  productReasonRequired: "Please enter a product review note.",
  productApproved: "Product review approved.",
  productRejected: "Product review rejected.",
  homepageOn: "Set as homepage recommendation.",
  homepageOff: "Removed from homepage recommendation.",
  supplierHeaderDesc: "Supplier review now appears inside the Supplier Management entry, aligned with the Product Management workspace.",
  productHeaderDesc: "Product review now appears inside the Supplier Management entry, aligned with the Product Management workspace.",
  pendingSuppliers: "Pending suppliers",
  pendingProducts: "Pending products",
  keyword: "Keyword",
  supplierKeywordPlaceholder: "Search by company, contact, tenant email, or account id",
  productKeywordPlaceholder: "Search product / template / SKU",
  reviewStatus: "Review Status",
  listingStatus: "Listing Status",
  refresh: "Refresh",
  loadingSupplierList: "Loading supplier review records...",
  loadingSupplierDetail: "Loading supplier review detail...",
  loadingProductList: "Loading product review queue...",
  loadingProductDetail: "Loading product review detail...",
  supplierListTitle: "Supplier Review List",
  supplierDetailTitle: "Supplier Review Detail",
  emptySupplierCompany: "Untitled Company",
  emptySupplierList: "No supplier applications match the current filters.",
  noRecordCount: "records",
  companyName: "Company Name",
  contactName: "Contact",
  contactEmail: "Contact Email",
  tenantEmail: "Tenant Email",
  accountId: "Account ID",
  updatedAt: "Updated",
  companyType: "Company Type",
  contactPhone: "Contact Phone",
  countryCode: "Country Code",
  city: "City",
  addressLine1: "Address 1",
  addressLine2: "Address 2",
  businessLicenseNo: "Business License",
  websiteUrl: "Website",
  businessScope: "Business Scope",
  applicationInfo: "Application Info",
  applicationId: "Application ID",
  currentRound: "Current Round",
  lastSubmittedAt: "Last Submitted",
  lastReviewedAt: "Last Reviewed",
  rejectionReason: "Rejection Reason",
  reviewReason: "Review Reason",
  reviewReasonPlaceholder: "Enter the approval or rejection reason shown to the supplier.",
  processing: "Processing...",
  approveSupplier: "Approve",
  rejectSupplier: "Reject",
  pickSupplier: "Select a supplier record on the left to view its detail.",
  productListTitle: "Product Review List",
  productListDesc: "Product review queue aligned with the Product Management workspace.",
  productDetailTitle: "Product Review Detail",
  productDetailDesc: "View product, template, workflow nodes, and review notes.",
  emptyProductList: "No products match the current filters.",
  pickProduct: "Select a product on the left to review its detail.",
  finishedProductCode: "Finished Product Code",
  productName: "Product Name",
  template: "Template",
  reviewSummary: "Review Summary",
  categoryPath: "Leaf Category",
  supplierSku: "Supplier SKU",
  uploadStatus: "Upload Status",
  submitTime: "Submitted",
  latestOpinion: "Latest Note",
  productReviewNote: "Product Review Note",
  productReviewPlaceholder: "Enter the product approval or rejection reason for supplier follow-up.",
  approveProduct: "Approve Product",
  rejectProduct: "Reject Product",
  enableHomepage: "Set as Homepage Pick",
  disableHomepage: "Remove Homepage Pick",
  homepageUpdating: "Updating...",
  statusNodeSupplierReady: "Supplier Profile Ready",
  statusNodeSupplierReadyDesc: "Supplier profile still needs completion.",
  statusNodeListed: "Listing Live",
  statusNodeListedDesc: "Not listed yet.",
  statusNodeReview: "Platform Review",
  statusNodeReviewDesc: "Not submitted for review yet.",
  statusNodeResult: "Review Result",
  statusNodeResultDesc: "Waiting for the review result.",
}))

const supplierFilters = reactive({
  keyword: "",
  reviewStatus: "all",
})

const productFilters = reactive({
  keyword: "",
  reviewStatus: "pending_review",
  listingStatus: "all",
})

const supplierListLoading = ref(false)
const supplierDetailLoading = ref(false)
const supplierListError = ref("")
const supplierActionError = ref("")
const supplierSuccess = ref("")
const supplierItems = ref<ErpSupplierReviewSummary[]>([])
const supplierMetrics = ref({ totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 })
const supplierReviewStatuses = ref<Array<{ value: string; label: string }>>([{ value: "all", label: "All" }])
const selectedSupplierId = ref("")
const selectedSupplierDetail = ref<ErpSupplierReviewDetail | null>(null)
const supplierReviewReason = ref("")
const supplierReviewSaving = ref(false)

const productQueueLoading = ref(false)
const productDetailLoading = ref(false)
const productQueueError = ref("")
const productActionError = ref("")
const productSuccess = ref("")
const productItems = ref<ErpProductSummary[]>([])
const productMetrics = ref({ totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 })
const productReviewStatuses = ref<Array<{ value: string; label: string }>>([])
const productListingStatuses = ref<Array<{ value: string; label: string }>>([])
const selectedProductId = ref("")
const selectedProductDetail = ref<ErpProductDetail | null>(null)
const productReviewReason = ref("")
const productReviewSaving = ref(false)
const homepageUpdating = ref(false)

const selectedSupplierSummary = computed(() => selectedSupplierDetail.value?.summary || null)
const selectedProductWorkflow = computed(() => selectedProductDetail.value?.workflow || null)
const selectedSupplierTenant = computed(() => {
  const tenantId = selectedSupplierDetail.value?.summary.tenantId || selectedSupplierSummary.value?.tenantId || ""
  return tenantId ? tenantDirectory.value[tenantId] || null : null
})
const enrichedSupplierItems = computed(() => supplierItems.value.map((item) => ({
  ...item,
  tenantEmail: tenantDirectory.value[item.tenantId]?.email || "",
  tenantName: tenantDirectory.value[item.tenantId]?.name || "",
})))
const visibleSupplierItems = computed(() => {
  const keyword = supplierFilters.keyword.trim().toLowerCase()
  if (!keyword) return enrichedSupplierItems.value
  return enrichedSupplierItems.value.filter((item) => [
    item.companyName,
    item.contactName,
    item.contactEmail,
    item.accountId,
    item.tenantId,
    item.tenantEmail,
    item.tenantName,
  ].some((value) => String(value || "").toLowerCase().includes(keyword)))
})
const supplierStatusText = computed(() => {
  const summary = selectedSupplierSummary.value
  if (!summary) return copy.value.pending
  return resolveReviewStatusLabel(summary.reviewStatus || summary.currentStatus, summary.reviewStatusLabel || summary.currentStatusLabel || "")
})
const productStatusText = computed(() => selectedProductWorkflow.value?.reviewStatusLabel || copy.value.pending)
const productStatusNodes = computed(() => {
  const workflow = selectedProductWorkflow.value
  return [
    {
      key: "uploaded",
      label: copy.value.statusNodeSupplierReady,
      active: workflow?.uploadStatus === "uploaded",
      description: workflow?.supplierName || copy.value.statusNodeSupplierReadyDesc,
    },
    {
      key: "listed",
      label: copy.value.statusNodeListed,
      active: workflow?.listingStatus === "listed",
      description: workflow?.listingStatusLabel || copy.value.statusNodeListedDesc,
    },
    {
      key: "review",
      label: copy.value.statusNodeReview,
      active: ["pending_review", "approved", "rejected"].includes(workflow?.reviewStatus || ""),
      description: workflow?.reviewStatusLabel || copy.value.statusNodeReviewDesc,
    },
    {
      key: "result",
      label: copy.value.statusNodeResult,
      active: ["approved", "rejected"].includes(workflow?.reviewStatus || ""),
      description: workflow?.reviewNote || copy.value.statusNodeResultDesc,
    },
  ]
})

function formatTime(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString(isZh.value ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAuditActor(displayName?: string | null, email?: string | null, accountId?: string | null) {
  const primary = displayName?.trim() || email?.trim() || accountId?.trim()
  if (!primary) return "-"
  const secondary = [email?.trim(), accountId?.trim()].filter((item) => item && item !== primary)
  return secondary.length ? `${primary} (${secondary.join(" / ")})` : primary
}

function resolveAuditError(error: unknown) {
  if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
    return copy.value.authRetry
  }
  const message = resolveApiErrorMessage(error).trim()
  return message || copy.value.auditLoadFailed
}

function isErpSessionRecoveryError(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 403)
}

async function retryWithFreshErpSession<T>(request: () => Promise<T>) {
  try {
    return await request()
  } catch (error) {
    if (!isErpSessionRecoveryError(error) || !authStore.accessToken.trim()) {
      throw error
    }
    await authStore.enterErpSession()
    return await request()
  }
}

async function loadSupplierReviews(preferredId?: string) {
  supplierListLoading.value = true
  supplierListError.value = ""
  supplierSuccess.value = ""
  try {
    if (authStore.accessToken.trim() && !Object.keys(tenantDirectory.value).length) {
      try {
        const tenants = await platformStore.loadTenants(authStore.authHeaders)
        tenantDirectory.value = Object.fromEntries((tenants || []).map((item) => [
          item.tenant_id,
          { email: item.email || "", name: item.name || "" },
        ]))
      } catch (error) {
        tenantDirectory.value = {}
      }
    }
    const response = await retryWithFreshErpSession(() => fetchErpSupplierReviews({
      applicationStatus: "all",
      reviewStatus: supplierFilters.reviewStatus?.trim() ? supplierFilters.reviewStatus : "all",
    }))
    supplierItems.value = response.items || []
    supplierMetrics.value = response.metrics || supplierMetrics.value
    supplierReviewStatuses.value = localizeReviewStatusOptions(response.reviewStatuses || [])
    const visibleItems = visibleSupplierItems.value
    const nextId = preferredId && visibleItems.some((item) => item.applicationId === preferredId)
      ? preferredId
      : (visibleItems[0]?.applicationId || "")
    selectedSupplierId.value = nextId
    if (!nextId) {
      selectedSupplierDetail.value = null
    }
  } catch (error) {
    supplierItems.value = []
    selectedSupplierId.value = ""
    selectedSupplierDetail.value = null
    supplierListError.value = resolveAuditError(error)
  } finally {
    supplierListLoading.value = false
  }
}

async function loadSupplierDetail(applicationId: string) {
  if (!applicationId) {
    selectedSupplierDetail.value = null
    return
  }
  supplierDetailLoading.value = true
  supplierActionError.value = ""
  try {
    selectedSupplierDetail.value = await retryWithFreshErpSession(() => fetchErpSupplierReviewDetail(applicationId))
  } catch (error) {
    selectedSupplierDetail.value = null
    supplierActionError.value = resolveAuditError(error)
  } finally {
    supplierDetailLoading.value = false
  }
}

async function submitSupplierDecision(decision: "approve" | "reject") {
  if (!selectedSupplierId.value) return
  if (!supplierReviewReason.value.trim()) {
    supplierActionError.value = copy.value.supplierReasonRequired
    return
  }
  supplierReviewSaving.value = true
  supplierActionError.value = ""
  try {
    const detail = await retryWithFreshErpSession(() => reviewErpSupplierApplication(selectedSupplierId.value, {
      decision,
      reviewReason: supplierReviewReason.value.trim(),
    }))
    supplierSuccess.value = decision === "approve" ? copy.value.supplierApproved : copy.value.supplierRejected
    supplierReviewReason.value = ""
    selectedSupplierDetail.value = detail
    await loadSupplierReviews(detail.summary.applicationId)
    await loadSupplierDetail(detail.summary.applicationId)
  } catch (error) {
    supplierActionError.value = error instanceof Error ? error.message : String(error)
  } finally {
    supplierReviewSaving.value = false
  }
}

async function loadProductQueue(preferredId?: string) {
  productQueueLoading.value = true
  productQueueError.value = ""
  productSuccess.value = ""
  try {
    const response = await retryWithFreshErpSession(() => fetchErpProductReviewQueue(productFilters))
    productItems.value = response.items || []
    productMetrics.value = response.metrics || productMetrics.value
    productReviewStatuses.value = response.reviewStatuses || []
    productListingStatuses.value = response.listingStatuses || []
    const nextId = preferredId && productItems.value.some((item) => item.productId === preferredId)
      ? preferredId
      : (productItems.value[0]?.productId || "")
    selectedProductId.value = nextId
    if (!nextId) {
      selectedProductDetail.value = null
    }
  } catch (error) {
    productItems.value = []
    selectedProductId.value = ""
    selectedProductDetail.value = null
    productQueueError.value = resolveAuditError(error)
  } finally {
    productQueueLoading.value = false
  }
}

async function loadProductDetail(productId: string) {
  if (!productId) {
    selectedProductDetail.value = null
    return
  }
  productDetailLoading.value = true
  productActionError.value = ""
  try {
    selectedProductDetail.value = await retryWithFreshErpSession(() => fetchErpProductDetail(productId))
  } catch (error) {
    selectedProductDetail.value = null
    productActionError.value = resolveAuditError(error)
  } finally {
    productDetailLoading.value = false
  }
}

async function submitProductDecision(decision: "approve" | "reject") {
  if (!selectedProductId.value) return
  if (!productReviewReason.value.trim()) {
    productActionError.value = copy.value.productReasonRequired
    return
  }
  productReviewSaving.value = true
  productActionError.value = ""
  try {
    const detail = await retryWithFreshErpSession(() => reviewErpQueuedProduct(selectedProductId.value, {
      decision,
      reviewNote: productReviewReason.value.trim(),
    }))
    productSuccess.value = decision === "approve" ? copy.value.productApproved : copy.value.productRejected
    productReviewReason.value = ""
    selectedProductDetail.value = detail
    await loadProductQueue(detail.productId)
    await loadProductDetail(detail.productId)
  } catch (error) {
    productActionError.value = error instanceof Error ? error.message : String(error)
  } finally {
    productReviewSaving.value = false
  }
}

async function toggleHomepageRecommendation() {
  if (!selectedProductDetail.value) return
  const productId = selectedProductDetail.value.productId
  homepageUpdating.value = true
  productActionError.value = ""
  try {
    const detail = await retryWithFreshErpSession(() => updateErpProductHomepageRecommendation(productId, {
      recommended: !Boolean(selectedProductWorkflow.value?.homepageRecommended),
    }))
    selectedProductDetail.value = detail
    productSuccess.value = detail.workflow?.homepageRecommended ? copy.value.homepageOn : copy.value.homepageOff
    await loadProductQueue(detail.productId)
  } catch (error) {
    productActionError.value = error instanceof Error ? error.message : String(error)
  } finally {
    homepageUpdating.value = false
  }
}

watch(selectedSupplierId, (value) => {
  void loadSupplierDetail(value)
}, { immediate: true })

watch(selectedProductId, (value) => {
  void loadProductDetail(value)
}, { immediate: true })

watch(visibleSupplierItems, (items) => {
  if (!items.some((item) => item.applicationId === selectedSupplierId.value)) {
    selectedSupplierId.value = items[0]?.applicationId || ""
  }
  if (!items.length) {
    selectedSupplierDetail.value = null
  }
}, { immediate: true })

async function initializeSection(section: "supplier" | "product") {
  if (section === "supplier") {
    await loadSupplierReviews(selectedSupplierId.value || undefined)
    return
  }
  await loadProductQueue(selectedProductId.value || undefined)
}

watch(() => props.section, (section) => {
  void initializeSection(section)
})

onMounted(async () => {
  try {
    if (authStore.accessToken.trim()) {
      await authStore.enterErpSession()
    }
    await initializeSection(props.section)
  } catch (error) {
    const message = resolveAuditError(error)
    if (props.section === "supplier") {
      supplierListError.value = message
    } else {
      productQueueError.value = message
    }
  }
})
</script>

<template>
  <section class="audit-workspace">
    <div class="audit-workspace__header">
      <div>
        <h3>{{ props.section === "supplier" ? "Supplier Audit Management" : "Product Audit Management" }}</h3>
      </div>
      <div class="audit-workspace__summary">
        <article v-if="props.section === 'supplier'">
          <strong>{{ supplierMetrics.pendingCount }}</strong>
          <span>{{ copy.pendingSuppliers }}</span>
        </article>
        <article v-else>
          <strong>{{ productMetrics.pendingCount }}</strong>
          <span>{{ copy.pendingProducts }}</span>
        </article>
      </div>
    </div>

    <div v-if="props.section === 'supplier'" class="audit-panel">
      <div class="audit-panel__toolbar">
        <label class="audit-panel__filter">
            <span>{{ copy.keyword }}</span>
            <input v-model="supplierFilters.keyword" type="text" :placeholder="copy.supplierKeywordPlaceholder" @keyup.enter="loadSupplierReviews(selectedSupplierId)">
        </label>
        <label class="audit-panel__filter">
          <span>{{ copy.reviewStatus }}</span>
          <select v-model="supplierFilters.reviewStatus" @change="loadSupplierReviews(selectedSupplierId)">
            <option v-for="item in supplierReviewStatuses" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <div class="audit-panel__toolbar-actions">
          <button type="button" @click="loadSupplierReviews(selectedSupplierId)">{{ copy.refresh }}</button>
        </div>
      </div>

      <div v-if="supplierListError" class="audit-panel__notice audit-panel__notice--error">{{ supplierListError }}</div>
      <div v-else-if="supplierSuccess" class="audit-panel__notice audit-panel__notice--success">{{ supplierSuccess }}</div>
      <div v-else-if="supplierListLoading" class="audit-panel__notice">{{ copy.loadingSupplierList }}</div>

      <div class="audit-panel__layout">
        <div class="audit-panel__table-wrap">
          <div class="audit-panel__section-head">
            <div>
              <strong>{{ copy.supplierListTitle }}</strong>
            </div>
            <span>{{ visibleSupplierItems.length }} {{ copy.noRecordCount }}</span>
          </div>
          <table v-if="visibleSupplierItems.length" class="audit-panel__table">
            <thead>
              <tr>
                <th>{{ copy.companyName }}</th>
                <th>{{ copy.contactName }}</th>
                <th>{{ copy.contactEmail }}</th>
                <th>{{ copy.tenantEmail }}</th>
                <th>{{ copy.accountId }}</th>
                <th>{{ copy.reviewStatus }}</th>
                <th>{{ copy.updatedAt }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in visibleSupplierItems"
                :key="item.applicationId"
                :class="{ 'is-active': selectedSupplierId === item.applicationId }"
                @click="selectedSupplierId = item.applicationId"
              >
                <td>{{ item.companyName || copy.emptySupplierCompany }}</td>
                <td>{{ item.contactName || "-" }}</td>
                <td>{{ item.contactEmail || "-" }}</td>
                <td>{{ item.tenantEmail || "-" }}</td>
                <td>{{ item.accountId || "-" }}</td>
                <td>{{ resolveReviewStatusLabel(item.reviewStatus || item.currentStatus, item.reviewStatusLabel || item.currentStatusLabel || "") }}</td>
                <td>{{ formatTime(item.updatedAt) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="audit-panel__notice">{{ copy.emptySupplierList }}</div>
        </div>

        <section class="audit-panel__detail">
          <div class="audit-panel__detail-head">
            <div>
              <strong>{{ copy.supplierDetailTitle }}</strong>
            </div>
            <span v-if="selectedSupplierSummary" class="audit-panel__badge">{{ supplierStatusText }}</span>
          </div>

          <div v-if="supplierActionError" class="audit-panel__notice audit-panel__notice--error">{{ supplierActionError }}</div>
          <div v-else-if="supplierDetailLoading" class="audit-panel__notice">{{ copy.loadingSupplierDetail }}</div>
          <template v-else-if="selectedSupplierDetail">
            <div class="audit-panel__detail-grid">
              <article>
                <strong>{{ selectedSupplierDetail.profile.companyName || copy.emptySupplierCompany }}</strong>
                <p>{{ copy.companyType }}: {{ selectedSupplierDetail.profile.companyType || "-" }}</p>
                <p>{{ copy.contactName }}: {{ selectedSupplierDetail.profile.contactName || "-" }}</p>
                <p>{{ copy.contactEmail }}: {{ selectedSupplierDetail.profile.contactEmail || "-" }}</p>
                <p>{{ copy.contactPhone }}: {{ selectedSupplierDetail.profile.contactPhone || "-" }}</p>
                <p>{{ copy.tenantEmail }}: {{ selectedSupplierTenant?.email || "-" }}</p>
                <p>{{ copy.countryCode }}: {{ selectedSupplierDetail.profile.countryCode || "-" }}</p>
                <p>{{ copy.city }}: {{ selectedSupplierDetail.profile.city || "-" }}</p>
                <p>{{ copy.addressLine1 }}: {{ selectedSupplierDetail.profile.addressLine1 || "-" }}</p>
                <p>{{ copy.addressLine2 }}: {{ selectedSupplierDetail.profile.addressLine2 || "-" }}</p>
                <p>{{ copy.businessLicenseNo }}: {{ selectedSupplierDetail.profile.businessLicenseNo || "-" }}</p>
                <p>{{ copy.websiteUrl }}: {{ selectedSupplierDetail.profile.websiteUrl || "-" }}</p>
                <p>{{ copy.businessScope }}: {{ selectedSupplierDetail.profile.businessScope || "-" }}</p>
              </article>
              <article>
                <strong>{{ copy.applicationInfo }}</strong>
                <p>{{ copy.applicationId }}: {{ selectedSupplierDetail.summary.applicationId }}</p>
                <p>{{ copy.accountId }}: {{ selectedSupplierDetail.summary.accountId || "-" }}</p>
                <p>{{ copy.currentRound }}: {{ selectedSupplierDetail.summary.currentRound }}</p>
                <p>{{ copy.reviewStatus }}: {{ supplierStatusText }}</p>
                <p>{{ copy.lastSubmittedAt }}: {{ formatTime(selectedSupplierDetail.summary.lastSubmittedAt) }}</p>
                <p>{{ copy.lastReviewedAt }}: {{ formatTime(selectedSupplierDetail.summary.lastReviewedAt) }}</p>
                <p v-if="selectedSupplierDetail.summary.rejectionReason">{{ copy.rejectionReason }}: {{ selectedSupplierDetail.summary.rejectionReason }}</p>
              </article>
            </div>

            <label class="audit-panel__field">
              <span>{{ copy.reviewReason }}</span>
              <textarea
                v-model="supplierReviewReason"
                rows="4"
                :placeholder="copy.reviewReasonPlaceholder"
              />
            </label>
            <div class="audit-panel__actions">
              <button type="button" :disabled="supplierReviewSaving" @click="submitSupplierDecision('approve')">
                {{ supplierReviewSaving ? copy.processing : copy.approveSupplier }}
              </button>
              <button type="button" class="audit-panel__danger" :disabled="supplierReviewSaving" @click="submitSupplierDecision('reject')">
                {{ supplierReviewSaving ? copy.processing : copy.rejectSupplier }}
              </button>
            </div>
          </template>
          <div v-else class="audit-panel__notice">{{ copy.pickSupplier }}</div>
        </section>
      </div>
    </div>

    <div v-else class="audit-panel">
      <div class="audit-panel__toolbar">
        <label class="audit-panel__filter">
          <span>{{ copy.keyword }}</span>
          <input v-model="productFilters.keyword" type="text" :placeholder="copy.productKeywordPlaceholder" @keyup.enter="loadProductQueue(selectedProductId)">
        </label>
        <label class="audit-panel__filter">
          <span>{{ copy.reviewStatus }}</span>
          <select v-model="productFilters.reviewStatus" @change="loadProductQueue(selectedProductId)">
            <option v-for="item in productReviewStatuses" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="audit-panel__filter">
          <span>{{ copy.listingStatus }}</span>
          <select v-model="productFilters.listingStatus" @change="loadProductQueue(selectedProductId)">
            <option v-for="item in productListingStatuses" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <div class="audit-panel__toolbar-actions">
          <button type="button" @click="loadProductQueue(selectedProductId)">{{ copy.refresh }}</button>
        </div>
      </div>

      <div v-if="productQueueError" class="audit-panel__notice audit-panel__notice--error">{{ productQueueError }}</div>
      <div v-else-if="productSuccess" class="audit-panel__notice audit-panel__notice--success">{{ productSuccess }}</div>
      <div v-else-if="productQueueLoading" class="audit-panel__notice">{{ copy.loadingProductList }}</div>

      <div class="audit-panel__layout">
        <div class="audit-panel__table-wrap">
          <div class="audit-panel__section-head">
            <div>
              <strong>{{ copy.productListTitle }}</strong>
            </div>
            <span>{{ productMetrics.totalCount }} {{ copy.noRecordCount }}</span>
          </div>
          <table v-if="productItems.length" class="audit-panel__table">
            <thead>
              <tr>
                <th>{{ copy.finishedProductCode }}</th>
                <th>{{ copy.productName }}</th>
                <th>{{ copy.template }}</th>
                <th>Supplier SKU</th>
                <th>{{ copy.listingStatus }}</th>
                <th>{{ copy.reviewStatus }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in productItems"
                :key="item.productId"
                :class="{ 'is-active': selectedProductId === item.productId }"
                @click="selectedProductId = item.productId"
              >
                <td>{{ item.finishedProductCode || "-" }}</td>
                <td>{{ item.productName }}</td>
                <td>{{ item.templateName || item.templateId || "-" }}</td>
                <td>{{ item.supplierSku || item.productSku || "-" }}</td>
                <td>{{ item.listingStatusLabel || item.listingStatus || "-" }}</td>
                <td>{{ item.reviewStatusLabel || item.reviewStatus || "-" }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="audit-panel__notice">{{ copy.emptyProductList }}</div>
        </div>

        <section class="audit-panel__detail">
          <div class="audit-panel__detail-head">
            <div>
              <strong>{{ copy.productDetailTitle }}</strong>
            </div>
            <span v-if="selectedProductWorkflow" class="audit-panel__badge">{{ productStatusText }}</span>
          </div>

          <div v-if="productActionError" class="audit-panel__notice audit-panel__notice--error">{{ productActionError }}</div>
          <div v-else-if="productDetailLoading" class="audit-panel__notice">{{ copy.loadingProductDetail }}</div>
          <template v-else-if="selectedProductDetail">
            <div class="audit-panel__detail-grid">
              <article>
                <strong>{{ selectedProductDetail.productName }}</strong>
                <p>{{ copy.finishedProductCode }}: {{ selectedProductDetail.finishedProductCode }}</p>
                <p>{{ copy.template }}: {{ selectedProductDetail.templateBinding?.templateName || selectedProductDetail.templateBinding?.templateId || "-" }}</p>
                <p>{{ copy.categoryPath }}: {{ selectedProductDetail.categoryPath || "-" }}</p>
                <p>{{ copy.supplierSku }}: {{ selectedProductWorkflow?.supplierSku || selectedProductDetail.productSku || "-" }}</p>
              </article>
              <article>
                <strong>{{ copy.reviewSummary }}</strong>
                <p>{{ copy.uploadStatus }}: {{ selectedProductWorkflow?.uploadStatusLabel || "-" }}</p>
                <p>{{ copy.listingStatus }}: {{ selectedProductWorkflow?.listingStatusLabel || "-" }}</p>
                <p>{{ copy.reviewStatus }}: {{ selectedProductWorkflow?.reviewStatusLabel || "-" }}</p>
                <p>{{ copy.submitTime }}: {{ formatTime(selectedProductWorkflow?.submittedAt) }}</p>
                <p>{{ copy.latestOpinion }}: {{ selectedProductWorkflow?.reviewNote || "-" }}</p>
              </article>
            </div>

            <div class="audit-panel__timeline audit-panel__timeline--nodes">
              <article v-for="node in productStatusNodes" :key="node.key" :class="{ 'is-highlight': node.active }">
                <strong>{{ node.label }}</strong>
                <p>{{ node.description }}</p>
              </article>
            </div>

            <label class="audit-panel__field">
              <span>{{ copy.productReviewNote }}</span>
              <textarea
                v-model="productReviewReason"
                rows="4"
                :placeholder="copy.productReviewPlaceholder"
              />
            </label>
            <div class="audit-panel__actions">
              <button type="button" :disabled="productReviewSaving" @click="submitProductDecision('approve')">
                {{ productReviewSaving ? copy.processing : copy.approveProduct }}
              </button>
              <button type="button" class="audit-panel__danger" :disabled="productReviewSaving" @click="submitProductDecision('reject')">
                {{ productReviewSaving ? copy.processing : copy.rejectProduct }}
              </button>
              <button
                v-if="selectedProductWorkflow?.reviewStatus === 'approved'"
                type="button"
                class="audit-panel__ghost"
                :disabled="homepageUpdating"
                @click="toggleHomepageRecommendation"
              >
                {{ homepageUpdating ? copy.homepageUpdating : (selectedProductWorkflow?.homepageRecommended ? copy.disableHomepage : copy.enableHomepage) }}
              </button>
            </div>
          </template>
          <div v-else class="audit-panel__notice">{{ copy.pickProduct }}</div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.audit-workspace {
  display: grid;
  gap: 20px;
}

.audit-workspace__header,
.audit-panel {
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.audit-workspace__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.audit-workspace__header h3,
.audit-workspace__header p,
.audit-panel p,
.audit-panel strong,
.audit-panel span {
  margin: 0;
}

.audit-workspace__header h3 {
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

.audit-workspace__header p {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.6;
}

.audit-workspace__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(140px, 1fr));
  gap: 12px;
}

.audit-workspace__summary article {
  display: grid;
  gap: 6px;
  min-width: 140px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.audit-workspace__summary strong {
  font-size: 24px;
  color: #0f172a;
}

.audit-workspace__summary span,
.audit-panel__detail-head p,
.audit-panel__detail-grid p,
.audit-panel__timeline p {
  color: #64748b;
}

.audit-panel__detail-grid p,
.audit-panel__detail-grid strong {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.audit-panel__detail-grid p {
  white-space: normal;
}

.audit-panel {
  display: grid;
  gap: 14px;
}

.audit-panel__toolbar,
.audit-panel__toolbar-actions,
.audit-panel__actions,
.audit-panel__detail-head {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.audit-panel__filter {
  display: grid;
  gap: 6px;
  min-width: 220px;
  flex: 1 1 220px;
}

.audit-panel__filter span {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.audit-panel__filter input,
.audit-panel__filter select,
.audit-panel__field textarea,
.audit-panel__toolbar-actions button,
.audit-panel__actions button,
.audit-panel__ghost {
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font: inherit;
}

.audit-panel__filter input,
.audit-panel__filter select,
.audit-panel__field textarea {
  width: 100%;
  padding: 9px 12px;
  box-sizing: border-box;
  background: #ffffff;
}

.audit-panel__toolbar-actions button,
.audit-panel__actions button,
.audit-panel__ghost {
  min-height: 34px;
  padding: 0 12px;
  background: #ffffff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.audit-panel__toolbar-actions {
  margin-left: auto;
}

.audit-panel__toolbar {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.audit-panel__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  gap: 18px;
  align-items: start;
}

.audit-panel__table-wrap,
.audit-panel__detail {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
}

.audit-panel__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.audit-panel__section-head strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.audit-panel__section-head p {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.audit-panel__section-head span {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.audit-panel__notice {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.audit-panel__notice--error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.audit-panel__notice--success {
  border-color: #86efac;
  background: #f0fdf4;
  color: #166534;
}

.audit-panel__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.audit-panel__table th,
.audit-panel__table td {
  padding: 12px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  vertical-align: top;
}

.audit-panel__table th {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  background: #f9fafb;
}

.audit-panel__table tbody tr {
  cursor: pointer;
}

.audit-panel__table tbody tr.is-active {
  background: #eff6ff;
}

.audit-panel__detail {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.audit-panel__detail-head {
  justify-content: space-between;
}

.audit-panel__badge {
  padding: 6px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 700;
}

.audit-panel__detail-grid,
.audit-panel__timeline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.audit-panel__detail-grid article,
.audit-panel__timeline article {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.audit-panel__timeline--nodes article.is-highlight {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.audit-panel__field {
  display: grid;
  gap: 8px;
}

.audit-panel__field span {
  font-weight: 700;
  color: #334155;
}

.audit-panel__field textarea {
  min-height: 112px;
  resize: vertical;
}

.audit-panel__actions button,
.audit-panel__toolbar-actions button {
  background: #ffffff;
  color: #334155;
}

.audit-panel__actions button:first-child {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  font-weight: 700;
}

.audit-panel__danger {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
  color: #ffffff !important;
}

@media (max-width: 1100px) {
  .audit-workspace__header,
  .audit-panel__layout,
  .audit-panel__detail-grid,
  .audit-panel__timeline {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .audit-workspace__summary {
    width: 100%;
  }

  .audit-panel__toolbar-actions {
    margin-left: 0;
  }

  .audit-panel__section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
