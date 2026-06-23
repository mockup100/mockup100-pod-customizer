<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue"
import { RouterLink, useRoute, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import { ApiRequestError, resolveApiErrorMessage, resolveAssetUrl, type DeletionPreviewMode } from "../../api/client"
import ActionConfirmationModal from "../../components/admin/ActionConfirmationModal.vue"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import SupplierAuditWorkspace from "../components/SupplierAuditWorkspace.vue"
import SupplierProductForm from "../components/SupplierProductForm.vue"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore } from "../../stores/platform"
import {
  deleteErpSupplierOnboardingDraft,
  fetchErpProductDetail,
  deleteErpProduct,
  fetchErpProductReviewQueue,
  fetchErpSupplierOnboarding,
  fetchErpProducts,
  fetchErpTemplatePermissionDetail,
  listErpProduct,
  previewErpProductDeletion,
  reviewErpProduct,
  saveErpSupplierOnboardingProfile,
  submitErpSupplierOnboardingApplication,
  submitErpProductReview,
  unlistErpProduct,
} from "../api"
import {
  resolveDefaultSupplierCapability,
} from "../supplier"
import {
  buildSupplierProductAddHref,
  buildSupplierProductDuplicateHref,
  buildSupplierProductEditHref,
} from "../templatePermissionRouting"
import { buildCategoryIdSet } from "../../pages/admin/repositoryView"
import type {
  ErpSupplierOnboardingDetail,
  ErpSupplierOnboardingProfile,
  ErpSupplierOnboardingRound,
  ErpSupplierOnboardingSaveRequest,
  ErpProductDetail,
  ErpProductDeletionPreview,
  ErpProductSummary,
  ErpProductTemplateBinding,
  ErpTemplatePermissionDetail,
} from "../types"

type SupplierProductAction =
  | { kind: "list"; row: ErpProductSummary }
  | { kind: "unlist"; row: ErpProductSummary }
  | { kind: "submit"; row: ErpProductSummary }
  | { kind: "review"; row: ErpProductSummary; decision: "approve" | "reject" }
  | { kind: "delete"; row: ErpProductSummary; preview: ErpProductDeletionPreview }
type SupplierWorkspaceAction = SupplierProductAction | { kind: "deleteDraft" }

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const route = useRoute()
const router = useRouter()
const { t, te, locale } = useI18n()
const { role, supplier } = storeToRefs(authStore)
const { categories } = storeToRefs(platformStore)

const supplierSnapshot = computed(() => supplier.value || resolveDefaultSupplierCapability(role.value))
const isOnboardingPage = computed(() => pageKey.value === "supplier-apply" || pageKey.value === "supplier-company")
const requiresOnboardingData = computed(() => !isAdmin.value && isOnboardingPage.value)
const isPending = computed(() => supplierSnapshot.value.application_status === "pending_review" || supplierSnapshot.value.current_status === "pending_review")
const isRejected = computed(() => supplierSnapshot.value.application_status === "rejected" || supplierSnapshot.value.current_status === "rejected")
const isApproved = computed(() => supplierSnapshot.value.can_access_workspace)
const isAdmin = computed(() => supplierSnapshot.value.can_review_suppliers)
const isReadonlyCompany = computed(() => (isPending.value || isApproved.value) && !isAdmin.value)
const canEditOnboarding = computed(() => !isReadonlyCompany.value && !isAdmin.value)
const pageKey = computed(() => String(route.name || ""))
const pageTitle = computed(() => {
  if (isOnboardingPage.value) return t("supplierWorkspace.page.managementTitle")
  if (pageKey.value === "supplier-product-add") return t("supplierProducts.page.addTitle")
  if (pageKey.value === "supplier-product-list") return t("supplierProducts.page.managementTitle")
  return t("supplierWorkspace.page.managementTitle")
})
const pageDescription = computed(() => {
  if (isOnboardingPage.value) {
    if (isAdmin.value) return t("supplierWorkspace.page.managementAdminDescription")
    return canEditOnboarding.value
      ? t("supplierWorkspace.page.onboardingEditableDescription")
      : t("supplierWorkspace.page.onboardingReadonlyDescription")
  }
  if (pageKey.value === "supplier-product-list") return t("supplierProducts.page.managementDescription")
  return t("supplierWorkspace.page.managementDescription")
})
const visibleSupplierOnboardingError = computed(() => {
  const authRequired = t("supplierWorkspace.notice.authRequired")
  return supplierOnboardingError.value === authRequired ? "" : supplierOnboardingError.value
})

const currentStatusLabel = computed(() => {
  const status = supplierOnboarding.value?.application?.currentStatus
    || supplierSnapshot.value.current_status
    || supplierSnapshot.value.application_status
  const fallback = supplierOnboarding.value?.application?.currentStatusLabel
    || supplierSnapshot.value.current_status_label
    || supplierSnapshot.value.application_status_label
  const key = `supplierWorkspace.status.${status || ""}`
  return te(key) ? t(key) : (fallback?.trim() || t("supplierWorkspace.status.unknown"))
})

function createDefaultOnboardingForm(): ErpSupplierOnboardingSaveRequest {
  return {
    companyName: "",
    companyType: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    countryCode: "CN",
    city: "",
    addressLine1: "",
    addressLine2: "",
    businessLicenseNo: "",
    websiteUrl: "",
    businessScope: "",
  }
}

const onboardingForm = reactive<ErpSupplierOnboardingSaveRequest>(createDefaultOnboardingForm())
const supplierOnboardingLoading = ref(false)
const supplierOnboardingError = ref("")
const onboardingActionError = ref("")
const onboardingActionSuccess = ref("")
const onboardingSaving = ref(false)
const onboardingSubmitting = ref(false)
const supplierOnboarding = ref<ErpSupplierOnboardingDetail | null>(null)
const productRows = ref<ErpProductSummary[]>([])
const listKeyword = ref("")
const listStatusFilter = ref("all")
const listCategoryId = ref("all")
const listLoading = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const listError = ref("")
const listSuccess = ref("")
const productListPage = ref(1)
const productListPageSize = ref(20)
const selectedSubmittedRoundNumber = ref<number | null>(null)
const actionModalOpen = ref(false)
const actionModalLoading = ref(false)
const actionModalError = ref("")
const actionModalTitle = ref("")
const actionModalMessage = ref("")
const actionModalConfirmText = ref("")
const actionModalLoadingText = ref(t("common.loading"))
const actionModalTone = ref<"primary" | "danger">("primary")
const actionModalDetails = ref<string[]>([])
const actionModalNote = ref("")
const actionModalChoiceLabel = ref("")
const actionModalChoiceValue = ref("")
const actionModalChoiceRequired = ref(false)
const actionModalChoiceOptions = ref<Array<{ value: string; label: string; description?: string }>>([])
const actionModalNoteLabel = ref("")
const actionModalNotePlaceholder = ref("")
const actionModalNoteRequired = ref(false)
const pendingWorkspaceAction = ref<SupplierWorkspaceAction | null>(null)
const productTemplateBindingCache = new Map<string, ErpProductTemplateBinding>()
const productDetailCache = new Map<string, ErpProductDetail>()
const loadingProductDetailIds = new Set<string>()
const productDeletionPreviewCache = new Map<string, ErpProductDeletionPreview>()
const loadingProductDeletionPreviewIds = new Set<string>()

const PRODUCT_DETAIL_LABELS = {
  customSpecName: "自定义规格名",
  customSpecValues: "自定义规格值",
} as const

function camelizeKey(key: string) {
  return key.replace(/_([a-z0-9])/g, (_, token: string) => token.toUpperCase())
}

function deepCamelize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepCamelize(item)) as T
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    Object.entries(source).forEach(([key, item]) => {
      next[camelizeKey(key)] = deepCamelize(item)
    })
    return next as T
  }
  return value
}

const onboardingSubmitLabel = computed(() => t("supplierWorkspace.action.submit"))
const onboardingSaveDisabled = computed(() => onboardingSaving.value || onboardingSubmitting.value || !canEditOnboarding.value)
const onboardingSubmitDisabled = computed(() => {
  if (onboardingSaving.value || onboardingSubmitting.value || !canEditOnboarding.value) return true
  return supplierOnboarding.value?.application?.canSubmit === false
})

const supplierEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const supplierPhonePattern = /^[0-9+()\-\s]{6,24}$/
const supplierCountryCodePattern = /^[A-Za-z]{2,3}$/
const supplierBusinessLicensePattern = /^[A-Za-z0-9-]{8,32}$/
type OnboardingFieldName =
  | "companyName"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "countryCode"
  | "city"
  | "addressLine1"
  | "businessLicenseNo"
  | "websiteUrl"

type OnboardingValidationIssue = {
  field: OnboardingFieldName
  message: string
}

const onboardingFieldErrors = reactive<Record<OnboardingFieldName, string>>({
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  countryCode: "",
  city: "",
  addressLine1: "",
  businessLicenseNo: "",
  websiteUrl: "",
})
const onboardingFieldRefs = new Map<OnboardingFieldName, HTMLInputElement | HTMLTextAreaElement>()

function normalizeOnboardingPayload(): ErpSupplierOnboardingSaveRequest {
  return {
    companyName: onboardingForm.companyName?.trim() || "",
    companyType: onboardingForm.companyType?.trim() || "",
    contactName: onboardingForm.contactName?.trim() || "",
    contactEmail: onboardingForm.contactEmail?.trim() || "",
    contactPhone: onboardingForm.contactPhone?.trim() || "",
    countryCode: onboardingForm.countryCode?.trim() || "",
    city: onboardingForm.city?.trim() || "",
    addressLine1: onboardingForm.addressLine1?.trim() || "",
    addressLine2: onboardingForm.addressLine2?.trim() || "",
    businessLicenseNo: onboardingForm.businessLicenseNo?.trim() || "",
    websiteUrl: onboardingForm.websiteUrl?.trim() || "",
    businessScope: onboardingForm.businessScope?.trim() || "",
  }
}

function clearOnboardingFieldError(field: OnboardingFieldName) {
  onboardingFieldErrors[field] = ""
}

function clearAllOnboardingFieldErrors() {
  Object.keys(onboardingFieldErrors).forEach((field) => {
    onboardingFieldErrors[field as OnboardingFieldName] = ""
  })
}

function setOnboardingFieldRef(field: OnboardingFieldName, element: unknown) {
  const resolvedElement = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element
    : (typeof element === "object" && element && "$el" in element ? (element as { $el?: unknown }).$el : null)
  if (resolvedElement instanceof HTMLInputElement || resolvedElement instanceof HTMLTextAreaElement) {
    onboardingFieldRefs.set(field, resolvedElement)
    return
  }
  onboardingFieldRefs.delete(field)
}

async function focusOnboardingField(field: OnboardingFieldName) {
  await nextTick()
  onboardingFieldRefs.get(field)?.focus()
}

function applyOnboardingValidationIssue(issue: OnboardingValidationIssue | null) {
  clearAllOnboardingFieldErrors()
  if (!issue) {
    return ""
  }
  onboardingFieldErrors[issue.field] = issue.message
  void focusOnboardingField(issue.field)
  return issue.message
}

function applyServerOnboardingFieldErrors(error: unknown) {
  if (!(error instanceof ApiRequestError) || !error.errors.length) {
    return ""
  }
  clearAllOnboardingFieldErrors()
  const firstMatch = error.errors.find((item) => {
    const field = item.field as OnboardingFieldName | undefined
    return Boolean(field && field in onboardingFieldErrors && item.message)
  })
  if (!firstMatch?.field || !firstMatch.message) {
    return ""
  }
  onboardingFieldErrors[firstMatch.field as OnboardingFieldName] = firstMatch.message
  void focusOnboardingField(firstMatch.field as OnboardingFieldName)
  return firstMatch.message
}

function validateOnboardingFieldFormats(payload: ErpSupplierOnboardingSaveRequest): OnboardingValidationIssue | null {
  if (payload.contactEmail && !supplierEmailPattern.test(payload.contactEmail)) {
    return { field: "contactEmail", message: t("supplierWorkspace.validation.contactEmailInvalid") }
  }
  if (payload.contactPhone && !supplierPhonePattern.test(payload.contactPhone)) {
    return { field: "contactPhone", message: t("supplierWorkspace.validation.contactPhoneInvalid") }
  }
  if (payload.countryCode && !supplierCountryCodePattern.test(payload.countryCode)) {
    return { field: "countryCode", message: t("supplierWorkspace.validation.countryCodeInvalid") }
  }
  if (payload.businessLicenseNo && !supplierBusinessLicensePattern.test(payload.businessLicenseNo)) {
    return { field: "businessLicenseNo", message: t("supplierWorkspace.validation.businessLicenseNoInvalid") }
  }
  if (payload.websiteUrl && !/^https?:\/\//.test(payload.websiteUrl)) {
    return { field: "websiteUrl", message: t("supplierWorkspace.validation.websiteUrlInvalid") }
  }
  return null
}

function validateOnboardingPayload(payload: ErpSupplierOnboardingSaveRequest): OnboardingValidationIssue | null {
  if (!payload.companyName) return { field: "companyName", message: t("supplierWorkspace.validation.companyNameRequired") }
  if (!payload.contactName) return { field: "contactName", message: t("supplierWorkspace.validation.contactNameRequired") }
  if (!payload.contactEmail) return { field: "contactEmail", message: t("supplierWorkspace.validation.contactEmailRequired") }
  if (!payload.contactPhone) return { field: "contactPhone", message: t("supplierWorkspace.validation.contactPhoneRequired") }
  if (!payload.countryCode) return { field: "countryCode", message: t("supplierWorkspace.validation.countryCodeRequired") }
  if (!payload.city) return { field: "city", message: t("supplierWorkspace.validation.cityRequired") }
  if (!payload.addressLine1) return { field: "addressLine1", message: t("supplierWorkspace.validation.addressLine1Required") }
  if (!payload.businessLicenseNo) return { field: "businessLicenseNo", message: t("supplierWorkspace.validation.businessLicenseNoRequired") }
  return validateOnboardingFieldFormats(payload)
}

function resolveSupplierApplicationStatus(detail: ErpSupplierOnboardingDetail) {
  const app = detail.application
  if (
    app.applicationStatus === "approved"
    || app.reviewStatus === "approved"
    || app.currentStatus === "approved"
  ) return "approved"
  if (app.applicationStatus === "pending_review") return "pending_review"
  if (app.applicationStatus === "draft") return "draft"
  if (app.applicationStatus === "rejected") return "rejected"
  if (app.applicationStatus === "not_applied") return "not_applied"
  if (app.reviewStatus === "pending_review" || app.currentStatus === "pending_review") return "pending_review"
  if (app.reviewStatus === "rejected" || app.currentStatus === "rejected") return "rejected"
  return "not_applied"
}

function resolveSupplierReviewStatus(detail: ErpSupplierOnboardingDetail) {
  if (detail.application.reviewStatus === "approved") return "approved"
  if (detail.application.reviewStatus === "pending_review") return "pending_review"
  if (detail.application.reviewStatus === "rejected") return "rejected"
  return "not_started"
}

function resolveAllowedDataDomains(applicationStatus: string) {
  const domains = new Set<string>(["supplier_profile"])
  if (applicationStatus === "approved") domains.add("supplier_products")
  if (supplierSnapshot.value.can_review_suppliers) domains.add("supplier_reviews")
  return Array.from(domains)
}

function syncOnboardingFormFromProfile(profile?: ErpSupplierOnboardingProfile | null) {
  const nextProfile = profile || {}
  onboardingForm.companyName = nextProfile.companyName || ""
  onboardingForm.companyType = nextProfile.companyType || ""
  onboardingForm.contactName = nextProfile.contactName || ""
  onboardingForm.contactEmail = nextProfile.contactEmail || ""
  onboardingForm.contactPhone = nextProfile.contactPhone || ""
  onboardingForm.countryCode = nextProfile.countryCode || "CN"
  onboardingForm.city = nextProfile.city || ""
  onboardingForm.addressLine1 = nextProfile.addressLine1 || ""
  onboardingForm.addressLine2 = nextProfile.addressLine2 || ""
  onboardingForm.businessLicenseNo = nextProfile.businessLicenseNo || ""
  onboardingForm.websiteUrl = nextProfile.websiteUrl || ""
  onboardingForm.businessScope = nextProfile.businessScope || ""
}

function syncOnboardingFormFromDetail(detail: ErpSupplierOnboardingDetail) {
  syncOnboardingFormFromProfile(detail.profile)
}

function syncSupplierCapabilityFromOnboarding(detail: ErpSupplierOnboardingDetail) {
  const applicationStatus = resolveSupplierApplicationStatus(detail)
  authStore.updateSupplierCapability({
    ...supplierSnapshot.value,
    application_status: applicationStatus,
    application_status_label: detail.application.applicationStatusLabel,
    review_status: resolveSupplierReviewStatus(detail),
    review_status_label: detail.application.reviewStatusLabel,
    current_status: detail.application.currentStatus,
    current_status_label: detail.application.currentStatusLabel,
    can_submit_application: detail.application.canSubmit,
    can_access_workspace: applicationStatus === "approved",
    can_review_suppliers: supplierSnapshot.value.can_review_suppliers,
    is_platform_admin: supplierSnapshot.value.is_platform_admin,
    allowed_menu_scopes: supplierSnapshot.value.allowed_menu_scopes,
    allowed_data_domains: resolveAllowedDataDomains(applicationStatus),
    latest_review_note: detail.application.latestReviewNote || null,
    last_submitted_at: detail.application.lastSubmittedAt || null,
    last_reviewed_at: detail.application.lastReviewedAt || null,
    rejection_reason: detail.application.rejectionReason || null,
  })
}

function formatTime(value?: string) {
  if (!value) return "—"
  return new Date(value).toLocaleString(locale.value === "zh" ? "zh-CN" : "en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function formatCurrencyAmount(value?: number | null, currency = "USD") {
  const v = Number(value ?? NaN)
  return Number.isFinite(v) && v >= 0 ? `${currency} ${v.toFixed(2)}` : "—"
}

function readProductField<T = unknown>(row: ErpProductSummary, camelKey: string, snakeKey?: string) {
  const source = row as Record<string, unknown>
  const fallbackKey = snakeKey || camelKey.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
  const value = source[camelKey]
  if (value !== undefined && value !== null) {
    return value as T
  }
  return source[fallbackKey] as T
}

function readProductString(row: ErpProductSummary, camelKey: string, snakeKey?: string) {
  const value = readProductField<string | number | null | undefined>(row, camelKey, snakeKey)
  return String(value ?? "").trim()
}

function readProductNumber(row: ErpProductSummary, camelKey: string, snakeKey?: string) {
  const value = Number(readProductField(row, camelKey, snakeKey))
  return Number.isFinite(value) ? value : undefined
}

function resolveProductId(row: ErpProductSummary) {
  return readProductString(row, "productId")
}

function resolveProductDetail(row: ErpProductSummary) {
  return productDetailCache.get(resolveProductId(row)) || null
}

function collectProductDetailMap(fields?: ErpProductDetail["productDetails"]) {
  const output = new Map<string, string>()
  ;(fields || []).forEach((field) => {
    const label = String(field.label || "").trim()
    const value = String(field.value || "").trim()
    if (label && value) {
      output.set(label, value)
    }
  })
  return output
}

function resolveTemplateId(row: ErpProductSummary) {
  return resolveProductDetail(row)?.templateBinding?.templateId || readProductString(row, "templateId")
}

function resolveProductName(row: ErpProductSummary) {
  return resolveProductDetail(row)?.productName?.trim() || readProductString(row, "productName")
}

function resolveProductNameEn(row: ErpProductSummary) {
  return resolveProductDetail(row)?.productNameEn?.trim() || readProductString(row, "productNameEn")
}

function resolveDisplayProductName(row: ErpProductSummary) {
  const zh = resolveProductName(row)
  const en = resolveProductNameEn(row)
  return locale.value.startsWith("zh") ? (zh || en) : (en || zh)
}

function resolveSupplierSkuValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.workflow?.supplierSku?.trim() || readProductString(row, "supplierSku")
}

function resolveProductSkuValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.productSku?.trim() || readProductString(row, "productSku")
}

function resolveFinishedProductCodeValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.finishedProductCode?.trim() || readProductString(row, "finishedProductCode")
}

function resolvePrimaryImageUrl(row: ErpProductSummary) {
  const detail = resolveProductDetail(row)
  const rawUrl = detail
    ? (
        detail.images
          ?.slice()
          .sort((left, right) => {
            const primaryDiff = Number(right.primary) - Number(left.primary)
            if (primaryDiff !== 0) return primaryDiff
            return Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
          })
          .find((item) => String(item.imageUrl || "").trim())?.imageUrl
        || detail.primaryImageUrl
      )
    : readProductString(row, "primaryImageUrl")
  return rawUrl ? resolveAssetUrl(String(rawUrl || "").trim()) : ""
}

function resolveCategoryPathValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.categoryPath?.trim() || readProductString(row, "categoryPath")
}

function resolveCategoryIdValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.categoryId?.trim() || readProductString(row, "categoryId")
}

function resolveLocalizedCategoryPathValue(row: ErpProductSummary) {
  const preferred = locale.value.startsWith("zh")
    ? readProductString(row, "categoryPath")
    : readProductString(row, "categoryPathEn")
  return preferred || resolveCategoryPathValue(row)
}

function resolveCategorySegments(row: ErpProductSummary) {
  return resolveLocalizedCategoryPathValue(row)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function resolveCategoryLevelValue(row: ErpProductSummary, level: 1 | 2 | 3) {
  return resolveCategorySegments(row)[level - 1] || ""
}

function resolveDefaultCurrencyValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.defaultCurrency?.trim() || readProductString(row, "defaultCurrency") || "USD"
}

function resolvePurchasePriceValue(row: ErpProductSummary) {
  const detailPrice = Number(resolveProductDetail(row)?.purchasePrice)
  return Number.isFinite(detailPrice) ? detailPrice : readProductNumber(row, "purchasePrice")
}

function formatInventoryValue(row: ErpProductSummary) {
  const inventoryLabel = readProductString(row, "inventoryLabel")
  if (inventoryLabel) {
    const matched = inventoryLabel.match(/^-?\d+(?:\.\d+)?/)
    return matched ? `${matched[0]} ${t("supplierProducts.shared.pieceUnit")}` : "—"
  }
  const v = Number(readProductField(row, "inventoryQuantity"))
  return Number.isFinite(v) && v >= 0 ? `${v} ${t("supplierProducts.shared.pieceUnit")}` : "—"
}

function resolveLocalizedLabel(key: string, fallback?: string) {
  if (te(key)) return t(key)
  return fallback?.trim() || "—"
}

function resolveSupplierActivityActionLabel(action?: string, fallback?: string) {
  const normalizedAction = String(action || "").trim()
  if (!normalizedAction) return fallback?.trim() || "—"
  const key = `supplierWorkspace.activity.action.${normalizedAction}`
  if (te(key)) return t(key)
  return fallback?.trim() || normalizedAction
}

function resolveProductUploadStatusLabel(row: Pick<ErpProductSummary, "uploadStatus" | "uploadStatusLabel">) {
  const uploadStatus = readProductString(row as ErpProductSummary, "uploadStatus")
  const uploadStatusLabel = readProductString(row as ErpProductSummary, "uploadStatusLabel")
  return (uploadStatusLabel && resolveLocalizedLabel(`supplierProducts.status.upload.${uploadStatus}`, uploadStatusLabel)) || "—"
}

function resolveProductReviewStatusLabel(row: Pick<ErpProductSummary, "reviewStatus" | "reviewStatusLabel">) {
  const reviewStatus = readProductString(row as ErpProductSummary, "reviewStatus")
  const reviewStatusLabel = readProductString(row as ErpProductSummary, "reviewStatusLabel")
  return (reviewStatusLabel && resolveLocalizedLabel(`supplierProducts.status.review.${reviewStatus}`, reviewStatusLabel)) || "—"
}

function resolveProductReviewStatusValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.workflow?.reviewStatus?.trim() || readProductString(row, "reviewStatus")
}

function resolveProductListingStatusValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.workflow?.listingStatus?.trim() || readProductString(row, "listingStatus")
}

function resolveProductUploadStatusValue(row: ErpProductSummary) {
  return resolveProductDetail(row)?.workflow?.uploadStatus?.trim() || readProductString(row, "uploadStatus")
}

function resolveProductListingStatusLabel(row: Pick<ErpProductSummary, "listingStatus" | "listingStatusLabel">) {
  const listingStatus = readProductString(row as ErpProductSummary, "listingStatus")
  const listingStatusLabel = readProductString(row as ErpProductSummary, "listingStatusLabel")
  return (listingStatusLabel && resolveLocalizedLabel(`supplierProducts.status.listing.${listingStatus}`, listingStatusLabel)) || "—"
}

function resolveProductTypeLabel(productType?: string) {
  return productType?.trim() === "finished_goods" ? t("supplierProducts.status.product.finished_goods") : "—"
}

function resolveProductMaterialValue(row: ErpProductSummary) {
  const detail = resolveProductDetail(row)
  return detail?.materialTextEn?.trim()
    || detail?.materialText?.trim()
    || readProductString(row, "materialTextEn")
    || readProductString(row, "materialText")
}

function normalizeLeadTimeText(value?: string) {
  const next = String(value || "").trim()
  if (!next) return ""
  if (next === "e.g. 3-5 days" || next === "如 3-5天") return ""
  return next
}

function resolveProductLeadTimeValue(row: ErpProductSummary) {
  const detail = resolveProductDetail(row)
  const detailNote = normalizeLeadTimeText(detail?.deliveryTimeText)
  if (detailNote) return detailNote
  const detailDays = Number(detail?.deliveryDays)
  if (Number.isFinite(detailDays) && detailDays > 0) return `${detailDays}d`
  const note = normalizeLeadTimeText(readProductString(row, "deliveryTimeText"))
  if (note) return note
  const days = readProductNumber(row, "deliveryDays")
  return Number.isFinite(days) && days && days > 0 ? `${days}d` : "—"
}

function resolveVariantCountValue(row: ErpProductSummary) {
  const detail = resolveProductDetail(row)
  const detailCount = detail?.variants?.length
  if (typeof detailCount === "number" && detailCount >= 0) {
    return String(detailCount)
  }
  const count = readProductNumber(row, "variantCount")
  return Number.isFinite(count) && count !== undefined ? String(count) : "—"
}

function resolveProductColorSummary(row: ErpProductSummary) {
  const items = resolveProductDetail(row)?.colorOptions || []
  return items.length ? items.join(" / ") : ""
}

function resolveProductSizeSummary(row: ErpProductSummary) {
  const items = resolveProductDetail(row)?.sizeOptions || []
  return items.length ? items.join(" / ") : ""
}

function resolveProductCustomSpecSummary(row: ErpProductSummary) {
  const detail = resolveProductDetail(row)
  if (!detail) return ""
  const detailMap = collectProductDetailMap(detail.productDetails)
  const name = detailMap.get(PRODUCT_DETAIL_LABELS.customSpecName) || ""
  const values = detailMap.get(PRODUCT_DETAIL_LABELS.customSpecValues) || ""
  if (!values) return ""
  return name ? `${name}: ${values}` : values
}

function resolveWorkflowStatusLabel(status?: string) {
  const normalized = String(status || "").trim()
  if (!normalized || normalized === "all") return t("supplierProducts.shared.all")
  if (normalized === "pending_review") return t("supplierProducts.page.filterStatusPending")
  if (normalized === "on_sale") return t("supplierProducts.page.filterStatusOnSale")
  if (normalized === "off_shelved") return t("supplierProducts.page.filterStatusOffShelved")
  if (normalized === "approved") return t("supplierProducts.page.filterStatusApproved")
  if (normalized === "rejected") return t("supplierProducts.page.filterStatusRejected")
  if (normalized === "draft") return t("supplierProducts.page.filterStatusDraft")
  return normalized
}

function isDraftProduct(row: ErpProductSummary) {
  return resolveListWorkflowStatus(row) === "draft"
    || resolveProductListingStatusValue(row) === "draft"
    || readProductString(row, "status") === "draft"
    || resolveProductReviewStatusValue(row) === "draft"
}

function resolveDeletionUsageCount(preview: ErpProductDeletionPreview) {
  return Number(preview.impactSummary?.criticalCount || 0)
    + Number(preview.impactSummary?.nonCriticalCount || 0)
    + Number(preview.impactSummary?.transientCount || 0)
}

function hasDeletionUsageRecords(preview: ErpProductDeletionPreview) {
  return preview.hasProtectedReferences
    || resolveDeletionUsageCount(preview) > 0
    || preview.criticalUsages.length > 0
    || preview.nonCriticalUsages.length > 0
    || preview.transientUsages.length > 0
}

function resolvePreferredDeleteMode(preview: ErpProductDeletionPreview): DeletionPreviewMode {
  if (preview.allowedModes.includes("purge")) {
    return "purge"
  }
  if (preview.allowedModes.includes("soft_delete")) {
    return "soft_delete"
  }
  return preview.recommendedMode
}

function validateProductSubmissionDetail(detail: ErpProductDetail) {
  const templateId = detail.templateBinding?.templateId?.trim()
  if (!templateId) return t("supplierProducts.validation.templateRequired")
  if (!detail.finishedProductCode?.trim()) return t("supplierProducts.validation.finishedCodeRequired")
  if (!detail.productName?.trim()) return t("supplierProducts.validation.productNameRequired")
  if (!detail.productSku?.trim()) return t("supplierProducts.validation.skuRequired")
  if (!detail.categoryId?.trim()) return t("supplierProducts.validation.categoryRequired")
  const hasPrimaryImage = Boolean(
    detail.primaryImageUrl?.trim()
    || detail.images?.some((item) => String(item.imageUrl || "").trim()),
  )
  if (!hasPrimaryImage) return t("supplierProducts.validation.imageRequired")
  if (!(detail.colorOptions || []).length) return t("supplierProducts.validation.colorRequired")
  if (!(detail.sizeOptions || []).length) return t("supplierProducts.validation.sizeRequired")
  if (!(detail.variants || []).length) return t("supplierProducts.validation.matrixRequired")
  const seenSkus = new Set<string>()
  for (const variant of detail.variants || []) {
    const sku = String(variant.sku || "").trim()
    if (!sku) {
      return t("supplierProducts.validation.rowSkuRequired")
    }
    const normalizedSku = sku.toUpperCase()
    if (seenSkus.has(normalizedSku)) {
      return t("supplierProducts.validation.rowSkuDuplicate")
    }
    seenSkus.add(normalizedSku)
  }
  return ""
}

function resolveCachedDeletionPreview(row: ErpProductSummary) {
  return productDeletionPreviewCache.get(resolveProductId(row)) || null
}

function isDeletionPreviewLoading(row: ErpProductSummary) {
  return loadingProductDeletionPreviewIds.has(resolveProductId(row))
}

const canDeleteDraft = computed(() =>
  canEditOnboarding.value
  && supplierOnboarding.value?.application?.applicationStatus === "draft"
  && Boolean(supplierOnboarding.value?.profile?.draftSavedAt),
)

const latestDraftSavedText = computed(() => {
  const savedAt = supplierOnboarding.value?.profile?.draftSavedAt
  if (!savedAt) return ""
  return t("supplierWorkspace.records.latestDraftSaved", { time: formatTime(savedAt) })
})

function resolveActivityActionLabel(action?: string, fallback?: string) {
  const normalized = String(action || "").trim()
  const key = `supplierWorkspace.activity.action.${normalized}`
  if (normalized && te(key)) return t(key)
  return fallback?.trim() || normalized || "—"
}

const reviewHistoryRows = computed(() => {
  const logs = (supplierOnboarding.value?.activityLogs || [])
    .filter((item) => item.action === "approve" || item.action === "reject")
    .map((item) => ({
      key: item.logId,
      round: item.round,
      actionLabel: resolveActivityActionLabel(item.action, item.actionLabel),
      tone: item.action === "reject" ? "danger" : "success",
      reviewer: item.operatorDisplayName || item.operatorEmail || item.operatorAccountId || "—",
      occurredAt: item.createdAt || null,
      note: item.description || "",
    }))

  if (logs.length) {
    return logs
  }

  const latestReviewRecord = supplierOnboarding.value?.latestReviewRecord
  if (!latestReviewRecord || !["approve", "reject"].includes(latestReviewRecord.action)) {
    return []
  }

  return [{
    key: `latest-review-${latestReviewRecord.round || "current"}`,
    round: latestReviewRecord.round,
    actionLabel: resolveActivityActionLabel(latestReviewRecord.action, latestReviewRecord.actionLabel),
    tone: latestReviewRecord.action === "reject" ? "danger" : "success",
    reviewer: latestReviewRecord.reviewerDisplayName || latestReviewRecord.reviewerEmail || latestReviewRecord.reviewerAccountId || "—",
    occurredAt: latestReviewRecord.occurredAt || null,
    note: latestReviewRecord.note || "",
  }]
})

function resolveSubmittedRoundStatusLabel(round: ErpSupplierOnboardingRound) {
  const isLatestRound = supplierOnboarding.value?.application.currentRound === round.round
  if (isLatestRound) {
    const fallback = supplierOnboarding.value?.application.reviewStatusLabel
      || supplierOnboarding.value?.application.currentStatusLabel
    const latestKey = `supplierWorkspace.status.${supplierOnboarding.value?.application.reviewStatus || supplierOnboarding.value?.application.currentStatus || ""}`
    if (te(latestKey)) return t(latestKey)
    if (fallback?.trim()) return fallback.trim()
  }
  const key = `supplierWorkspace.status.${round.reviewStatus || ""}`
  return te(key) ? t(key) : (round.reviewStatus || "—")
}

const submittedApplicationRows = computed(() =>
  (supplierOnboarding.value?.submissionRounds || [])
    .slice()
    .sort((left, right) => right.round - left.round)
    .map((round) => ({
      ...round,
      companyName: round.submittedProfile?.companyName || t("supplierWorkspace.records.untitledCompany"),
      submittedAtLabel: formatTime(round.submittedAt || undefined),
      statusLabel: resolveSubmittedRoundStatusLabel(round),
    })),
)

const selectedSubmittedRound = computed(() => {
  if (!selectedSubmittedRoundNumber.value) {
    return submittedApplicationRows.value[0] || null
  }
  return submittedApplicationRows.value.find((item) => item.round === selectedSubmittedRoundNumber.value) || null
})

function syncOnboardingFormForCurrentRoute(detail: ErpSupplierOnboardingDetail) {
  const editRound = Number(route.query.editRound || "")
  if (isOnboardingPage.value && Number.isFinite(editRound) && editRound > 0 && canEditOnboarding.value) {
    const targetRound = detail.submissionRounds.find((item) => item.round === editRound)
    const draftSavedAt = Date.parse(detail.profile?.draftSavedAt || "")
    const roundSubmittedAt = Date.parse(targetRound?.submittedAt || "")
    const hasNewerDraft = Number.isFinite(draftSavedAt) && (!Number.isFinite(roundSubmittedAt) || draftSavedAt >= roundSubmittedAt)
    if (targetRound?.submittedProfile && !hasNewerDraft) {
      syncOnboardingFormFromProfile(targetRound.submittedProfile)
      return
    }
  }
  syncOnboardingFormFromDetail(detail)
}

async function clearEditRoundQuery() {
  if (!("editRound" in route.query)) return
  const nextQuery = { ...route.query }
  delete nextQuery.editRound
  await router.replace({ path: route.path, query: nextQuery })
}

function buildSupplierSubmittedEditHref(round: number) {
  return `/erp/supplier?editRound=${encodeURIComponent(String(round))}`
}

function selectSubmittedRound(round: number) {
  selectedSubmittedRoundNumber.value = round
}

function resolveListWorkflowStatus(row: ErpProductSummary) {
  const templateReviewStatus = resolveTemplateReviewStatus(row)
  const templateVisibilityScope = resolveTemplateVisibilityScope(row)
  const templatePublishEnabled = resolveTemplatePublishEnabled(row)
  const reviewStatus = readProductString(row, "reviewStatus")
  const listingStatus = readProductString(row, "listingStatus")
  const status = readProductString(row, "status")
  if (reviewStatus === "pending_review") return "pending_review"
  if (reviewStatus === "rejected") return "rejected"
  if (status === "draft" || reviewStatus === "draft") return "draft"
  if (reviewStatus === "approved" && templatePublishEnabled === false) return "off_shelved"
  if (listingStatus === "listed") {
    if (
      templateVisibilityScope === "public"
      && templatePublishEnabled !== false
      && !["pending_review", "rejected"].includes(templateReviewStatus)
    ) {
      return "on_sale"
    }
    return "off_shelved"
  }
  if (listingStatus === "unlisted") return "off_shelved"
  if (listingStatus === "draft") return "draft"
  if (reviewStatus === "approved") return "approved"
  return "all"
}

function resolveRawTemplateBinding(row: ErpProductSummary) {
  const source = row as Record<string, unknown>
  return (source.templateBinding || source.template_binding) as ErpProductSummary["templateBinding"]
}

function buildFallbackTemplateBinding(row: ErpProductSummary): ErpProductTemplateBinding | null {
  const templateId = resolveTemplateId(row)
  const templateName = readProductString(row, "templateName") || templateId
  if (!templateId && !templateName) {
    return null
  }
  return {
    templateId: templateId || "",
    templateName: templateName || templateId || "",
    templateSource: "platform",
    visibilityScope: "public",
    publishEnabled: true,
    erpSelectable: true,
    permissionStatus: "auto_fallback",
    reviewStatus: "approved",
  }
}

function resolveRowTemplateBinding(row: ErpProductSummary) {
  return resolveRawTemplateBinding(row) || buildFallbackTemplateBinding(row)
}

function resolveTemplateVisibilityScope(row: ErpProductSummary) {
  const templateBinding = resolveRowTemplateBinding(row) as Record<string, unknown> | null
  return String(templateBinding?.visibilityScope ?? templateBinding?.visibility_scope ?? "").trim().toLowerCase()
}

function resolveTemplateReviewStatus(row: ErpProductSummary) {
  const templateBinding = resolveRowTemplateBinding(row) as Record<string, unknown> | null
  return String(templateBinding?.reviewStatus ?? templateBinding?.review_status ?? "").trim().toLowerCase()
}

function resolveTemplatePublishEnabled(row: ErpProductSummary) {
  const templateBinding = resolveRowTemplateBinding(row) as Record<string, unknown> | null
  const value = templateBinding?.publishEnabled ?? templateBinding?.publish_enabled
  return typeof value === "boolean" ? value : undefined
}

function resolveTemplateSelectable(row: ErpProductSummary) {
  const templateBinding = resolveRowTemplateBinding(row) as Record<string, unknown> | null
  const value = templateBinding?.erpSelectable ?? templateBinding?.erp_selectable
  return value !== false
}

function resolveTemplateVisibilityLabel(row: ErpProductSummary) {
  const scope = resolveTemplateVisibilityScope(row)
  if (scope === "public") return resolveLocalizedLabel("supplierProducts.status.visibilityScope.public")
  if (scope) return resolveLocalizedLabel("supplierProducts.status.visibilityScope.private")
  return resolveLocalizedLabel("supplierProducts.status.visibilityScope.default")
}

function resolveTemplatePublishLabel(row: ErpProductSummary) {
  const publishEnabled = resolveTemplatePublishEnabled(row)
  if (publishEnabled === false) return t("supplierProducts.status.publish.disabled")
  if (publishEnabled === true) return t("supplierProducts.status.publish.enabled")
  return "—"
}

function resolveTemplateReviewLabel(row: ErpProductSummary) {
  const templateBinding = resolveRowTemplateBinding(row) as Record<string, unknown> | null
  const status = resolveTemplateReviewStatus(row)
  const reviewStatusLabel = String(templateBinding?.reviewStatusLabel ?? templateBinding?.review_status_label ?? "").trim()
  if (status) {
    return resolveLocalizedLabel(`supplierProducts.status.templateReview.${status}`, reviewStatusLabel)
  }
  return reviewStatusLabel || t("supplierProducts.status.templateReview.default")
}

function resolveTemplateStatusTone(row: ErpProductSummary) {
  const reviewStatus = resolveTemplateReviewStatus(row)
  if (reviewStatus === "approved" && resolveTemplatePublishEnabled(row) !== false) return "success"
  if (reviewStatus === "pending_review") return "warning"
  if (reviewStatus === "rejected") return "danger"
  if (resolveTemplatePublishEnabled(row) === false) return "neutral"
  return "neutral"
}

function resolveProductPublicName(row: ErpProductSummary) {
  return resolveProductNameEn(row) || resolveProductName(row) || "—"
}

function resolveTemplateDisplayName(row: ErpProductSummary) {
  const templateBinding = resolveRowTemplateBinding(row) as Record<string, unknown> | null
  if (!templateBinding) return "—"
  return String(templateBinding.templateName ?? templateBinding.template_name ?? templateBinding.templateId ?? templateBinding.template_id ?? "").trim() || "—"
}

function resolveTemplateDisplayId(row: ErpProductSummary) {
  return resolveTemplateId(row) || "—"
}

function shouldEnrichTemplateBinding(row: ErpProductSummary) {
  const templateId = resolveTemplateId(row)
  if (!templateId) return false
  const binding = resolveRawTemplateBinding(row) as Record<string, unknown> | null
  return !binding
    || ((binding.visibilityScope ?? binding.visibility_scope) == null)
    || ((binding.publishEnabled ?? binding.publish_enabled) == null)
    || !String(binding.reviewStatus ?? binding.review_status ?? "").trim()
}

function mergeResolvedTemplateBinding(
  row: ErpProductSummary,
  templateBinding: ErpProductTemplateBinding,
): ErpProductSummary {
  const current = resolveRawTemplateBinding(row) as Record<string, unknown> | null
  return {
    ...row,
    templateBinding: {
      ...(current || {}),
      ...templateBinding,
    },
  }
}

function buildResolvedTemplateBinding(
  detail: ErpTemplatePermissionDetail,
  row: ErpProductSummary,
): ErpProductTemplateBinding {
  return {
    templateId: detail.templateId || resolveTemplateId(row) || "",
    templateName: detail.templateName || readProductString(row, "templateName") || resolveTemplateId(row) || "",
    templateSource: detail.templateOverview?.templateSource || "platform",
    coverUrl: detail.printConfig?.effectImageBaseUrl || "",
    visibilityScope: detail.visibilityScope || "public",
    publishEnabled: detail.publishEnabled !== false,
    erpSelectable: detail.erpSelectable !== false,
    permissionStatus: detail.permissionStatus || "granted",
    supplierStatus: detail.templateOverview?.supplierStatus || "",
    supplierStatusLabel: detail.templateOverview?.supplierStatusLabel || "",
    reviewStatus: detail.templateOverview?.reviewStatus || "approved",
    reviewStatusLabel: detail.templateOverview?.reviewStatusLabel || "",
  }
}

async function enrichProductRowsWithTemplateBindings(rows: ErpProductSummary[]) {
  const templateIds = Array.from(new Set(
    rows
      .filter((row) => shouldEnrichTemplateBinding(row))
      .map((row) => resolveTemplateId(row))
      .filter(Boolean),
  ))
  if (!templateIds.length) {
    return rows.map((row) => {
      const templateId = resolveTemplateId(row)
      const cached = templateId ? productTemplateBindingCache.get(templateId) : null
      return cached ? mergeResolvedTemplateBinding(row, cached) : row
    })
  }
  await Promise.allSettled(templateIds.map(async (templateId) => {
    if (productTemplateBindingCache.has(templateId)) return
    const matchedRow = rows.find((row) => resolveTemplateId(row) === templateId)
    if (!matchedRow) return
    try {
        const detail = deepCamelize(
          await retryWithFreshErpSession(() => fetchErpTemplatePermissionDetail(templateId)),
        )
        productTemplateBindingCache.set(templateId, buildResolvedTemplateBinding(detail, matchedRow))
    } catch {
      const fallback = buildFallbackTemplateBinding(matchedRow)
      if (fallback) {
        productTemplateBindingCache.set(templateId, fallback)
      }
    }
  }))
  return rows.map((row) => {
    const templateId = resolveTemplateId(row)
    const cached = templateId ? productTemplateBindingCache.get(templateId) : null
    return cached ? mergeResolvedTemplateBinding(row, cached) : row
  })
}

async function loadProductCategories() {
  try {
    await platformStore.loadTemplateCategories(authStore.authHeaders)
  } catch {
    // Keep the list available even if category metadata is temporarily unavailable.
  }
}

async function loadVisibleProductDetails(rows: ErpProductSummary[]) {
  const targetIds = rows
    .map((row) => resolveProductId(row))
    .filter((productId) => productId && !productDetailCache.has(productId) && !loadingProductDetailIds.has(productId))
  for (const productId of targetIds) {
    loadingProductDetailIds.add(productId)
    try {
      const detail = deepCamelize(await retryWithFreshErpSession(() => fetchErpProductDetail(productId)))
      productDetailCache.set(productId, detail)
      productRows.value = productRows.value.slice()
    } catch {
      // Keep summary data as fallback if detail loading fails.
    } finally {
      loadingProductDetailIds.delete(productId)
    }
  }
}

async function loadVisibleDeletionPreviews(rows: ErpProductSummary[]) {
  const targetIds = rows
    .filter((row) => !isDraftProduct(row) && resolveProductListingStatusValue(row) === "unlisted")
    .map((row) => resolveProductId(row))
    .filter((productId) => productId && !productDeletionPreviewCache.has(productId) && !loadingProductDeletionPreviewIds.has(productId))
  for (const productId of targetIds) {
    loadingProductDeletionPreviewIds.add(productId)
    try {
      const preview = deepCamelize(await retryWithFreshErpSession(() => previewErpProductDeletion(productId)))
      productDeletionPreviewCache.set(productId, preview)
      productRows.value = productRows.value.slice()
    } catch {
      // Keep the delete action disabled if usage records cannot be resolved yet.
    } finally {
      loadingProductDeletionPreviewIds.delete(productId)
    }
  }
}

const activeListCategoryIds = computed(() => buildCategoryIdSet(
  listCategoryId.value,
  categories.value as Parameters<typeof buildCategoryIdSet>[1],
))

const filteredProductRows = computed(() => {
  const keyword = listKeyword.value.trim().toLowerCase()
  return productRows.value.filter((row) => {
    if (listStatusFilter.value !== "all" && resolveListWorkflowStatus(row) !== listStatusFilter.value) {
      return false
    }
    const rowCategoryId = resolveCategoryIdValue(row)
    if (activeListCategoryIds.value && (!rowCategoryId || !activeListCategoryIds.value.has(rowCategoryId))) {
      return false
    }
    if (!keyword) return true
    return [
      resolveFinishedProductCodeValue(row),
      resolveProductName(row),
      resolveProductNameEn(row),
      resolveProductSkuValue(row),
      resolveSupplierSkuValue(row),
      resolveTemplateDisplayName(row),
      resolveLocalizedCategoryPathValue(row),
      resolveProductColorSummary(row),
      resolveProductSizeSummary(row),
      resolveProductCustomSpecSummary(row),
      resolveProductMaterialValue(row),
      resolveProductLeadTimeValue(row),
      resolveCategoryLevelValue(row, 1),
      resolveCategoryLevelValue(row, 2),
      resolveCategoryLevelValue(row, 3),
    ].some((item) => String(item || "").toLowerCase().includes(keyword))
  })
})

const productStatusOptions = computed(() => {
  const values = ["all", "draft", "pending_review", "approved", "on_sale", "rejected", "off_shelved"] as const
  return values.map((value) => ({
    value,
    label: value === "all"
      ? t("supplierProducts.shared.all")
      : t(`supplierProducts.page.filterStatus${value === "pending_review"
        ? "Pending"
        : value === "on_sale"
          ? "OnSale"
          : value === "off_shelved"
            ? "OffShelved"
            : value === "approved"
              ? "Approved"
              : value === "rejected"
                ? "Rejected"
                : "Draft"}`),
    count: value === "all"
      ? productRows.value.length
      : productRows.value.filter((row) => resolveListWorkflowStatus(row) === value).length,
  }))
})

const productListTotalPages = computed(() => Math.max(1, Math.ceil(filteredProductRows.value.length / productListPageSize.value)))
const pagedProductRows = computed(() => {
  const start = (productListPage.value - 1) * productListPageSize.value
  return filteredProductRows.value.slice(start, start + productListPageSize.value)
})
const hasActiveProductFilters = computed(() =>
  Boolean(listKeyword.value.trim())
  || listStatusFilter.value !== "all"
  || listCategoryId.value !== "all",
)

function resetProductFilters() {
  listKeyword.value = ""
  listStatusFilter.value = "all"
  listCategoryId.value = "all"
}

function resolveWorkflowBadgeTone(status: string | undefined) {
  if (status === "approved" || status === "on_sale") return "success"
  if (status === "pending_review") return "warning"
  if (status === "rejected") return "danger"
  return "neutral"
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`
  }
  return text
}

function triggerTextDownload(filename: string, content: string, mimeType = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") {
    return
  }
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function openSupplierImportPicker() {
  importFileInput.value?.click()
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

function parseCsvContent(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    return { headers: [] as string[], rows: [] as Array<Record<string, string>> }
  }
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] || ""
      return accumulator
    }, {})
  })
  return { headers, rows }
}

function validateSupplierImportRows(rows: Array<Record<string, string>>) {
  const issues: string[] = []
  rows.forEach((row, index) => {
    const rowNumber = index + 2
    if (!row.templateId?.trim()) issues.push(t("supplierProducts.page.importIssueTemplateId", { row: rowNumber }))
    if (!row.productName?.trim()) issues.push(t("supplierProducts.page.importIssueProductName", { row: rowNumber }))
    if (!row.finishedProductCode?.trim()) issues.push(t("supplierProducts.page.importIssueFinishedCode", { row: rowNumber }))
    if (!row.categoryId?.trim()) issues.push(t("supplierProducts.page.importIssueCategoryId", { row: rowNumber }))
    if (row.supplierCostPrice?.trim() && Number.isNaN(Number(row.supplierCostPrice))) {
      issues.push(t("supplierProducts.page.importIssueSupplierCostPrice", { row: rowNumber }))
    }
    if (row.retailPrice?.trim() && Number.isNaN(Number(row.retailPrice))) {
      issues.push(t("supplierProducts.page.importIssueRetailPrice", { row: rowNumber }))
    }
    if (row.hsCode?.trim() && !/^[0-9A-Za-z-]{6,16}$/.test(row.hsCode.trim())) {
      issues.push(t("supplierProducts.page.importIssueHsCode", { row: rowNumber }))
    }
  })
  return issues
}

async function handleSupplierImportChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) {
    return
  }
  listError.value = ""
  listSuccess.value = ""
  if (!/\.csv$/i.test(file.name)) {
    listError.value = t("supplierProducts.page.importCsvOnly")
    input.value = ""
    return
  }
  const content = await file.text()
  const { rows } = parseCsvContent(content)
  if (!rows.length) {
    listError.value = t("supplierProducts.page.importEmpty")
    input.value = ""
    return
  }
  const issues = validateSupplierImportRows(rows)
  if (issues.length) {
    listError.value = `${t("supplierProducts.page.bulkImportValidationFailed", { count: issues.length })} ${issues.slice(0, 3).join("；")}`
    input.value = ""
    return
  }
  listSuccess.value = t("supplierProducts.page.bulkImportValidated", { count: rows.length })
  input.value = ""
}

function exportSupplierProducts() {
  const rows = filteredProductRows.value
  const header = [
    t("supplierProducts.list.tableFinishedCode"),
    t("supplierProducts.list.tableProductName"),
    t("supplierProducts.list.tableTemplate"),
    t("supplierProducts.list.tableCategory"),
    t("supplierProducts.list.tablePurchasePrice"),
    t("supplierProducts.list.tableUploadStatus"),
    t("supplierProducts.list.tableReviewStatus"),
    t("supplierProducts.list.tableListingStatus"),
    t("supplierProducts.list.tableInventory"),
  ]
  const csv = [
    header.map(escapeCsvValue).join(","),
    ...rows.map((row) => [
      row.finishedProductCode,
      row.productName,
      row.templateName || row.templateId || "",
      row.categoryPath || "",
      formatCurrencyAmount(row.purchasePrice, row.defaultCurrency),
      resolveProductUploadStatusLabel(row),
      resolveProductReviewStatusLabel(row),
      resolveProductListingStatusLabel(row),
      formatInventoryValue(row),
    ].map(escapeCsvValue).join(",")),
  ].join("\n")
  triggerTextDownload("supplier-products-export.csv", csv, "text/csv;charset=utf-8")
  listSuccess.value = t("supplierProducts.page.exportSuccess", { count: rows.length })
}

function downloadSupplierImportTemplate() {
  const rows = [
    [
      "templateId",
      "productName",
      "productNameEn",
      "finishedProductCode",
      "productSku",
      "categoryId",
      "colorOptions",
      "sizeOptions",
      "supplierCostPrice",
      "retailPrice",
      "hsCode",
      "declaredNameCn",
      "declaredNameEn",
    ],
    [
      "tpl_demo_tote",
      "帆布袋",
      "Canvas Tote",
      "FG-1002",
      "SUP-TOTE-001",
      "bags_everyday_tote",
      "Black|White",
      "M|L",
      "12.50",
      "19.90",
      "4202220000",
      "帆布袋",
      "Canvas Tote",
    ],
  ].map((line) => line.map(escapeCsvValue).join(",")).join("\n")
  triggerTextDownload("supplier-products-import-template.csv", rows, "text/csv;charset=utf-8")
  listSuccess.value = t("supplierProducts.page.templateDownloaded")
}

async function loadSupplierProducts() {
  listLoading.value = true
  listError.value = ""
  productDetailCache.clear()
  loadingProductDetailIds.clear()
  productDeletionPreviewCache.clear()
  loadingProductDeletionPreviewIds.clear()
  try {
    if (isAdmin.value) {
      const queue = await retryWithFreshErpSession(() => fetchErpProductReviewQueue())
      productRows.value = await enrichProductRowsWithTemplateBindings(queue.items)
    } else {
      const rows = await retryWithFreshErpSession(() => fetchErpProducts())
      productRows.value = await enrichProductRowsWithTemplateBindings(rows)
    }
  } catch (error) {
    listError.value = error instanceof Error ? error.message : String(error)
    productRows.value = []
  } finally {
    listLoading.value = false
  }
}

async function loadSupplierOnboarding() {
  if (role.value === "guest") {
    supplierOnboardingError.value = t("supplierWorkspace.notice.authRequired")
    supplierOnboarding.value = null
    return
  }
  if (!authStore.erpSession && authStore.accessToken.trim()) {
    try {
      await authStore.enterErpSession()
    } catch (error) {
      supplierOnboardingError.value = resolveSupplierOnboardingError(error)
      supplierOnboarding.value = null
      return
    }
  }
  supplierOnboardingLoading.value = true
  supplierOnboardingError.value = ""
  clearAllOnboardingFieldErrors()
  try {
    const detail = await retryWithFreshErpSession(async () => {
      try {
        return await fetchErpSupplierOnboarding()
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 500 && authStore.accessToken.trim()) {
          await authStore.enterErpSession()
          return await fetchErpSupplierOnboarding()
        }
        throw error
      }
    })
    supplierOnboarding.value = detail
    syncOnboardingFormForCurrentRoute(detail)
    syncSupplierCapabilityFromOnboarding(detail)
    if (!selectedSubmittedRoundNumber.value && detail.submissionRounds.length) {
      selectedSubmittedRoundNumber.value = detail.submissionRounds[0]?.round || null
    }
  } catch (error) {
    supplierOnboarding.value = null
    supplierOnboardingError.value = resolveSupplierOnboardingError(error)
  } finally {
    supplierOnboardingLoading.value = false
  }
}

async function initializeCurrentPage() {
  if (requiresOnboardingData.value) {
    onboardingActionError.value = ""
    onboardingActionSuccess.value = ""
  }
  if (requiresOnboardingData.value) {
    await loadSupplierOnboarding()
  }
  if (pageKey.value === "supplier-product-list") {
    await loadProductCategories()
    await loadSupplierProducts()
  }
}

function isErpSessionRecoveryError(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 403)
}

async function retryWithFreshErpSession<T>(request: () => Promise<T>) {
  try {
    return await request()
  } catch (error) {
    if (!isErpSessionRecoveryError(error)) {
      throw error
    }
    if (!authStore.accessToken.trim()) {
      throw error
    }
    await authStore.enterErpSession()
    return await request()
  }
}

async function saveSupplierOnboardingDraft() {
  if (!canEditOnboarding.value) return
  if (role.value === "guest") {
    onboardingActionError.value = t("supplierWorkspace.notice.authRequired")
    onboardingActionSuccess.value = ""
    return
  }
  onboardingSaving.value = true
  onboardingActionError.value = ""
  onboardingActionSuccess.value = ""
  try {
    const payload = normalizeOnboardingPayload()
    const validationMessage = applyOnboardingValidationIssue(validateOnboardingFieldFormats(payload))
    if (validationMessage) {
      onboardingActionError.value = validationMessage
      return
    }
    const detail = await retryWithFreshErpSession(() => saveErpSupplierOnboardingProfile(payload))
    supplierOnboarding.value = detail
    await clearEditRoundQuery()
    syncOnboardingFormForCurrentRoute(detail)
    syncSupplierCapabilityFromOnboarding(detail)
    onboardingActionSuccess.value = t("supplierWorkspace.action.saveDraftSuccess")
  } catch (error) {
    onboardingActionError.value = applyServerOnboardingFieldErrors(error) || resolveSupplierOnboardingError(error)
  } finally {
    onboardingSaving.value = false
  }
}

async function submitSupplierOnboarding() {
  if (!canEditOnboarding.value) return
  if (role.value === "guest") {
    onboardingActionError.value = t("supplierWorkspace.notice.authRequired")
    onboardingActionSuccess.value = ""
    return
  }
  const payload = normalizeOnboardingPayload()
  const validationMessage = applyOnboardingValidationIssue(validateOnboardingPayload(payload))
  if (validationMessage) {
    onboardingActionError.value = validationMessage
    onboardingActionSuccess.value = ""
    return
  }
  onboardingSubmitting.value = true
  onboardingActionError.value = ""
  onboardingActionSuccess.value = ""
  try {
    await retryWithFreshErpSession(() => saveErpSupplierOnboardingProfile(payload))
    const detail = await retryWithFreshErpSession(() => submitErpSupplierOnboardingApplication())
    supplierOnboarding.value = detail
    await clearEditRoundQuery()
    syncOnboardingFormForCurrentRoute(detail)
    syncSupplierCapabilityFromOnboarding(detail)
    onboardingActionSuccess.value = t("supplierWorkspace.action.submitSuccess")
  } catch (error) {
    onboardingActionError.value = applyServerOnboardingFieldErrors(error) || resolveSupplierOnboardingError(error)
  } finally {
    onboardingSubmitting.value = false
  }
}

function resolveSupplierOnboardingError(error: unknown) {
  if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
    return t("supplierWorkspace.notice.authRequired")
  }
  const message = resolveApiErrorMessage(error).trim()
  return message || t("supplierWorkspace.notice.actionFailed")
}

function resetActionModal() {
  actionModalOpen.value = false
  actionModalLoading.value = false
  actionModalError.value = ""
  actionModalTitle.value = ""
  actionModalMessage.value = ""
  actionModalConfirmText.value = ""
  actionModalLoadingText.value = t("common.loading")
  actionModalTone.value = "primary"
  actionModalDetails.value = []
  actionModalNote.value = ""
  actionModalChoiceLabel.value = ""
  actionModalChoiceValue.value = ""
  actionModalChoiceRequired.value = false
  actionModalChoiceOptions.value = []
  actionModalNoteLabel.value = ""
  actionModalNotePlaceholder.value = ""
  actionModalNoteRequired.value = false
  pendingWorkspaceAction.value = null
}

function clearListNotice() {
  listError.value = ""
  listSuccess.value = ""
}

function openActionModal(config: {
  title: string; message: string; confirmText: string; loadingText?: string
  tone?: "primary" | "danger"; details?: string[]
  noteLabel?: string; notePlaceholder?: string; noteRequired?: boolean
  choiceLabel?: string; choiceValue?: string; choiceRequired?: boolean
  choiceOptions?: Array<{ value: string; label: string; description?: string }>
}) {
  actionModalTitle.value = config.title
  actionModalMessage.value = config.message
  actionModalConfirmText.value = config.confirmText
  actionModalLoadingText.value = config.loadingText || t("common.loading")
  actionModalTone.value = config.tone || "primary"
  actionModalDetails.value = config.details || []
  actionModalNoteLabel.value = config.noteLabel || ""
  actionModalNotePlaceholder.value = config.notePlaceholder || ""
  actionModalNoteRequired.value = Boolean(config.noteRequired)
  actionModalChoiceLabel.value = config.choiceLabel || ""
  actionModalChoiceValue.value = config.choiceValue || ""
  actionModalChoiceRequired.value = Boolean(config.choiceRequired)
  actionModalChoiceOptions.value = config.choiceOptions || []
  actionModalError.value = ""
  actionModalOpen.value = true
}

function canListProduct(row: ErpProductSummary) {
  return !isAdmin.value
    && Boolean(resolveTemplateId(row))
    && resolveProductListingStatusValue(row) !== "listed"
    && resolveProductUploadStatusValue(row) === "uploaded"
    && resolveTemplateSelectable(row)
    && resolveTemplatePublishEnabled(row) !== false
    && !["pending_review", "rejected"].includes(resolveTemplateReviewStatus(row))
    && resolveTemplateVisibilityScope(row) !== "private"
}

function canUnlistProduct(row: ErpProductSummary) {
  return !isAdmin.value && resolveProductListingStatusValue(row) === "listed"
}

function canSubmitProductReview(row: ErpProductSummary) {
  return !isAdmin.value
    && Boolean(resolveTemplateId(row))
    && resolveProductListingStatusValue(row) === "listed"
    && resolveProductUploadStatusValue(row) === "uploaded"
    && !["pending_review", "approved"].includes(resolveProductReviewStatusValue(row))
    && resolveTemplateSelectable(row)
    && !["pending_review", "rejected"].includes(resolveTemplateReviewStatus(row))
}

function canDeleteProduct(row: ErpProductSummary) {
  if (isAdmin.value) return false
  if (resolveProductListingStatusValue(row) === "listed") return false
  if (isDraftProduct(row)) return true
  if (resolveProductListingStatusValue(row) !== "unlisted") return false
  const preview = resolveCachedDeletionPreview(row)
  if (!preview) return false
  return !hasDeletionUsageRecords(preview)
}

function canApproveProductReview(row: ErpProductSummary) {
  return isAdmin.value && readProductString(row, "reviewStatus") === "pending_review"
}

function canRejectProductReview(row: ErpProductSummary) {
  return isAdmin.value && readProductString(row, "reviewStatus") === "pending_review"
}

function requestListProduct(row: ErpProductSummary) {
  pendingWorkspaceAction.value = { kind: "list", row }
  openActionModal({
    title: t("supplierProducts.action.listTitle"),
    message: t("supplierProducts.action.listMessage", { name: resolveProductName(row) }),
    confirmText: t("supplierProducts.action.listConfirm"),
    loadingText: t("supplierProducts.action.listing"),
    tone: "primary",
    details: [
      `${t("supplierProducts.action.templateLabel")}: ${readProductString(row, "templateName") || resolveTemplateId(row) || "—"}`,
      t("supplierProducts.action.listHint"),
    ],
  })
}

function requestUnlistProduct(row: ErpProductSummary) {
  pendingWorkspaceAction.value = { kind: "unlist", row }
  openActionModal({
    title: t("supplierProducts.action.unlistTitle"),
    message: t("supplierProducts.action.unlistMessage", { name: resolveProductName(row) }),
    confirmText: t("supplierProducts.action.unlistConfirm"),
    loadingText: t("supplierProducts.action.unlisting"),
    tone: "danger",
    details: [
      `${t("supplierProducts.action.templateLabel")}: ${readProductString(row, "templateName") || resolveTemplateId(row) || "—"}`,
      t("supplierProducts.action.unlistHint"),
    ],
  })
}

async function requestSubmitProductReview(row: ErpProductSummary) {
  clearListNotice()
  try {
    const detail = deepCamelize(
      await retryWithFreshErpSession(() => fetchErpProductDetail(resolveProductId(row))),
    )
    productDetailCache.set(resolveProductId(row), detail)
    productRows.value = productRows.value.slice()
    const validationMessage = validateProductSubmissionDetail(detail)
    if (validationMessage) {
      listError.value = validationMessage
      return
    }
    const isResubmission = resolveProductReviewStatusValue(row) === "rejected"
    pendingWorkspaceAction.value = { kind: "submit", row }
    openActionModal({
      title: isResubmission ? t("supplierProducts.action.resubmitTitle") : t("supplierProducts.action.submitTitle"),
      message: isResubmission
        ? t("supplierProducts.action.resubmitMessage", { name: resolveProductName(row) })
        : t("supplierProducts.action.submitMessage", { name: resolveProductName(row) }),
      confirmText: isResubmission ? t("supplierProducts.action.resubmitConfirm") : t("supplierProducts.action.submitConfirm"),
      loadingText: t("supplierProducts.action.submitting"),
      tone: "primary",
      details: [
        `${t("supplierProducts.action.templateLabel")}: ${readProductString(row, "templateName") || resolveTemplateId(row) || "—"}`,
        isResubmission ? t("supplierProducts.action.resubmitHint") : t("supplierProducts.action.submitHint"),
        t("supplierProducts.action.submitValidationHint"),
      ],
    })
  } catch (error) {
    listError.value = error instanceof Error ? error.message : String(error)
  }
}

function requestApproveProductReview(row: ErpProductSummary) {
  pendingWorkspaceAction.value = { kind: "review", row, decision: "approve" }
  openActionModal({
    title: t("supplierProducts.action.approveTitle"),
    message: t("supplierProducts.action.approveMessage", { name: resolveProductName(row) }),
    confirmText: t("supplierProducts.action.approveConfirm"),
    loadingText: t("supplierProducts.action.approving"),
    tone: "primary",
    noteLabel: t("supplierProducts.action.reviewNote"),
    notePlaceholder: t("supplierProducts.action.approveNotePlaceholder"),
    details: [
      `${t("supplierProducts.action.templateLabel")}: ${readProductString(row, "templateName") || resolveTemplateId(row) || "—"}`,
      `${t("supplierProducts.action.reviewStatus")}: ${resolveProductReviewStatusLabel(row)}`,
    ],
  })
}

function requestRejectProductReview(row: ErpProductSummary) {
  pendingWorkspaceAction.value = { kind: "review", row, decision: "reject" }
  openActionModal({
    title: t("supplierProducts.action.rejectTitle"),
    message: t("supplierProducts.action.rejectMessage", { name: resolveProductName(row) }),
    confirmText: t("supplierProducts.action.rejectConfirm"),
    loadingText: t("supplierProducts.action.rejecting"),
    tone: "danger",
    noteLabel: t("supplierProducts.action.reviewNote"),
    notePlaceholder: t("supplierProducts.action.rejectNotePlaceholder"),
    noteRequired: true,
    details: [
      `${t("supplierProducts.action.templateLabel")}: ${readProductString(row, "templateName") || resolveTemplateId(row) || "—"}`,
      `${t("supplierProducts.action.reviewStatus")}: ${resolveProductReviewStatusLabel(row)}`,
    ],
  })
}

async function requestDeleteProduct(row: ErpProductSummary) {
  clearListNotice()
  const listingStatus = resolveProductListingStatusValue(row)
  if (listingStatus === "listed") {
    listError.value = t("supplierProducts.action.deleteListedBlocked")
    return
  }
  try {
    const preview = resolveCachedDeletionPreview(row)
      || deepCamelize(await retryWithFreshErpSession(() => previewErpProductDeletion(resolveProductId(row))))
    productDeletionPreviewCache.set(resolveProductId(row), preview)
    const draftProduct = isDraftProduct(row)
    if (!draftProduct && hasDeletionUsageRecords(preview)) {
      listError.value = t("supplierProducts.action.deleteUsageBlocked")
      return
    }
    pendingWorkspaceAction.value = { kind: "delete", row, preview }
    const preferredMode = resolvePreferredDeleteMode(preview)
    openActionModal({
      title: t("supplierProducts.action.deleteTitle"),
      message: draftProduct
        ? t("supplierProducts.action.deleteDraftMessage", { name: resolveProductName(row) })
        : t("supplierProducts.action.deleteUnlistedMessage", { name: resolveProductName(row) }),
      confirmText: t("supplierProducts.action.deleteConfirm"),
      loadingText: t("supplierProducts.action.deleting"),
      tone: "danger",
      details: [
        `${t("supplierProducts.action.recommendedMode")}: ${t(`supplierProducts.status.deletionMode.${preferredMode}`)}`,
        draftProduct
          ? t("supplierProducts.action.deleteDraftHint")
          : t("supplierProducts.action.deleteIrreversibleHint"),
        ...preview.warnings.slice(0, 4),
        ...preview.cleanupPlan.slice(0, 3).map((item) => `${item.step}. ${item.description}`),
      ],
      choiceValue: preferredMode,
    })
  } catch (error) {
    listError.value = error instanceof Error ? error.message : String(error)
  }
}

function requestDeleteSupplierDraft() {
  pendingWorkspaceAction.value = { kind: "deleteDraft" }
  openActionModal({
    title: t("supplierWorkspace.records.deleteDraftTitle"),
    message: t("supplierWorkspace.records.deleteDraftMessage"),
    confirmText: t("supplierWorkspace.records.deleteDraftConfirm"),
    loadingText: t("supplierWorkspace.records.deletingDraft"),
    tone: "danger",
    details: [t("supplierWorkspace.records.deleteDraftHint")],
  })
}

async function confirmWorkspaceAction(note = "", choiceValue = "") {
  if (!pendingWorkspaceAction.value) return
  actionModalLoading.value = true
  actionModalError.value = ""
  clearListNotice()
  try {
    const pending = pendingWorkspaceAction.value
    if (pending.kind === "list") {
      await retryWithFreshErpSession(() => listErpProduct(resolveProductId(pending.row)))
      listSuccess.value = t("supplierProducts.action.listSuccess", { name: resolveProductName(pending.row) })
    } else if (pending.kind === "unlist") {
      await retryWithFreshErpSession(() => unlistErpProduct(resolveProductId(pending.row)))
      listSuccess.value = t("supplierProducts.action.unlistSuccess", { name: resolveProductName(pending.row) })
    } else if (pending.kind === "submit") {
      await retryWithFreshErpSession(() => submitErpProductReview(resolveProductId(pending.row)))
      listSuccess.value = (
        resolveProductReviewStatusValue(pending.row) === "rejected"
          ? t("supplierProducts.action.resubmitSuccess", { name: resolveProductName(pending.row) })
          : t("supplierProducts.action.submitSuccess", { name: resolveProductName(pending.row) })
      )
    } else if (pending.kind === "review") {
      await retryWithFreshErpSession(() => reviewErpProduct(resolveProductId(pending.row), {
        decision: pending.decision,
        reviewNote: note.trim(),
      }))
      listSuccess.value = pending.decision === "approve"
        ? t("supplierProducts.action.approveSuccess", { name: resolveProductName(pending.row) })
        : t("supplierProducts.action.rejectSuccess", { name: resolveProductName(pending.row) })
    } else if (pending.kind === "delete") {
      await retryWithFreshErpSession(() => deleteErpProduct(
        resolveProductId(pending.row),
        (choiceValue || actionModalChoiceValue.value || resolvePreferredDeleteMode(pending.preview)) as DeletionPreviewMode,
      ))
      listSuccess.value = t("supplierProducts.action.deleteSuccess", { name: resolveProductName(pending.row) })
    } else {
      const detail = await retryWithFreshErpSession(() => deleteErpSupplierOnboardingDraft())
      supplierOnboarding.value = detail
      syncOnboardingFormForCurrentRoute(detail)
      syncSupplierCapabilityFromOnboarding(detail)
      onboardingActionSuccess.value = t("supplierWorkspace.action.deleteDraftSuccess")
    }
    if (pageKey.value === "supplier-product-list") {
      await loadSupplierProducts()
    }
    resetActionModal()
  } catch (error) {
    actionModalError.value = error instanceof Error ? error.message : String(error)
  } finally {
    actionModalLoading.value = false
  }
}

watch(pageKey, () => { void initializeCurrentPage() }, { immediate: true })
watch(() => route.query.editRound, () => {
  if (supplierOnboarding.value && isOnboardingPage.value) {
    syncOnboardingFormForCurrentRoute(supplierOnboarding.value)
  }
})
watch(submittedApplicationRows, (rows) => {
  if (!rows.length) {
    selectedSubmittedRoundNumber.value = null
    return
  }
  if (!selectedSubmittedRoundNumber.value || !rows.some((item) => item.round === selectedSubmittedRoundNumber.value)) {
    selectedSubmittedRoundNumber.value = rows[0].round
  }
})
watch([filteredProductRows, productListPageSize], () => {
  if (productListPage.value > productListTotalPages.value) {
    productListPage.value = productListTotalPages.value
  }
  if (productListPage.value < 1) {
    productListPage.value = 1
  }
})
watch(pagedProductRows, (rows) => {
  if (pageKey.value === "supplier-product-list" && rows.length) {
    void loadVisibleProductDetails(rows)
    void loadVisibleDeletionPreviews(rows)
  }
}, { immediate: true })
</script>

<template>
  <div class="supplier-page">

    <div v-if="isOnboardingPage" class="supplier-page__onboarding">
      <div class="supplier-page__header">
        <div>
          <h2 class="supplier-page__title">{{ pageTitle }}</h2>
        </div>
        <span
          v-if="!isAdmin"
          class="supplier-page__status-badge"
          :class="{
            'supplier-page__status-badge--pending': isPending,
            'supplier-page__status-badge--rejected': isRejected,
            'supplier-page__status-badge--approved': isApproved,
          }"
        >
          {{ currentStatusLabel }}
        </span>
      </div>

      <SupplierAuditWorkspace
        v-if="isOnboardingPage && isAdmin"
        section="supplier"
      />

      <template v-else>
        <div v-if="visibleSupplierOnboardingError" class="supplier-page__alert supplier-page__alert--error">
          {{ visibleSupplierOnboardingError }}
        </div>
        <div v-else-if="supplierOnboardingLoading" class="supplier-page__alert">
          {{ t("supplierWorkspace.notice.loadingTitle") }}
        </div>

        <div v-if="!visibleSupplierOnboardingError && onboardingActionError" class="supplier-page__alert supplier-page__alert--error">
          {{ onboardingActionError }}
        </div>
        <div v-else-if="!visibleSupplierOnboardingError && onboardingActionSuccess" class="supplier-page__alert supplier-page__alert--success">
          {{ onboardingActionSuccess }}
        </div>

        <div v-if="isRejected && supplierOnboarding?.application?.rejectionReason" class="supplier-page__alert supplier-page__alert--warning">
          {{ t("supplierWorkspace.notice.rejectionReason") }}{{ supplierOnboarding.application.rejectionReason }}
        </div>

        <div class="supplier-page__form">
          <div class="supplier-page__form-row">
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.companyName }">
              <span>{{ t("supplierWorkspace.form.companyName") }} *</span>
              <input v-model="onboardingForm.companyName" :disabled="!canEditOnboarding" :ref="(el) => setOnboardingFieldRef('companyName', el)" @input="clearOnboardingFieldError('companyName')" />
              <small v-if="onboardingFieldErrors.companyName" class="supplier-page__field-error">{{ onboardingFieldErrors.companyName }}</small>
            </label>
            <label>
              <span>{{ t("supplierWorkspace.form.companyType") }}</span>
              <input v-model="onboardingForm.companyType" :disabled="!canEditOnboarding" :placeholder="t('supplierWorkspace.form.companyTypePlaceholder')" />
            </label>
          </div>
          <div class="supplier-page__form-row">
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.contactName }">
              <span>{{ t("supplierWorkspace.form.contactName") }} *</span>
              <input v-model="onboardingForm.contactName" :disabled="!canEditOnboarding" :ref="(el) => setOnboardingFieldRef('contactName', el)" @input="clearOnboardingFieldError('contactName')" />
              <small v-if="onboardingFieldErrors.contactName" class="supplier-page__field-error">{{ onboardingFieldErrors.contactName }}</small>
            </label>
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.contactEmail }">
              <span>{{ t("supplierWorkspace.form.contactEmail") }} *</span>
              <input v-model="onboardingForm.contactEmail" :disabled="!canEditOnboarding" :ref="(el) => setOnboardingFieldRef('contactEmail', el)" @input="clearOnboardingFieldError('contactEmail')" />
              <small v-if="onboardingFieldErrors.contactEmail" class="supplier-page__field-error">{{ onboardingFieldErrors.contactEmail }}</small>
            </label>
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.contactPhone }">
              <span>{{ t("supplierWorkspace.form.contactPhone") }} *</span>
              <input v-model="onboardingForm.contactPhone" :disabled="!canEditOnboarding" :ref="(el) => setOnboardingFieldRef('contactPhone', el)" @input="clearOnboardingFieldError('contactPhone')" />
              <small v-if="onboardingFieldErrors.contactPhone" class="supplier-page__field-error">{{ onboardingFieldErrors.contactPhone }}</small>
            </label>
          </div>
          <div class="supplier-page__form-row">
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.countryCode }">
              <span>{{ t("supplierWorkspace.form.countryCode") }}</span>
              <input v-model="onboardingForm.countryCode" :disabled="!canEditOnboarding" placeholder="CN" :ref="(el) => setOnboardingFieldRef('countryCode', el)" @input="clearOnboardingFieldError('countryCode')" />
              <small v-if="onboardingFieldErrors.countryCode" class="supplier-page__field-error">{{ onboardingFieldErrors.countryCode }}</small>
            </label>
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.city }">
              <span>{{ t("supplierWorkspace.form.city") }}</span>
              <input v-model="onboardingForm.city" :disabled="!canEditOnboarding" :placeholder="t('supplierWorkspace.form.cityPlaceholder')" :ref="(el) => setOnboardingFieldRef('city', el)" @input="clearOnboardingFieldError('city')" />
              <small v-if="onboardingFieldErrors.city" class="supplier-page__field-error">{{ onboardingFieldErrors.city }}</small>
            </label>
            <label class="supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.businessLicenseNo }">
              <span>{{ t("supplierWorkspace.form.businessLicenseNo") }} *</span>
              <input v-model="onboardingForm.businessLicenseNo" :disabled="!canEditOnboarding" :ref="(el) => setOnboardingFieldRef('businessLicenseNo', el)" @input="clearOnboardingFieldError('businessLicenseNo')" />
              <small v-if="onboardingFieldErrors.businessLicenseNo" class="supplier-page__field-error">{{ onboardingFieldErrors.businessLicenseNo }}</small>
            </label>
          </div>
          <label class="supplier-page__form-full supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.addressLine1 }">
            <span>{{ t("supplierWorkspace.form.addressLine1") }} *</span>
            <input v-model="onboardingForm.addressLine1" :disabled="!canEditOnboarding" :placeholder="t('supplierWorkspace.form.addressLine1Placeholder')" :ref="(el) => setOnboardingFieldRef('addressLine1', el)" @input="clearOnboardingFieldError('addressLine1')" />
            <small v-if="onboardingFieldErrors.addressLine1" class="supplier-page__field-error">{{ onboardingFieldErrors.addressLine1 }}</small>
          </label>
          <label class="supplier-page__form-full">
            <span>{{ t("supplierWorkspace.form.addressLine2") }}</span>
            <input v-model="onboardingForm.addressLine2" :disabled="!canEditOnboarding" :placeholder="t('supplierWorkspace.form.addressLine2Placeholder')" />
          </label>
          <label class="supplier-page__form-full supplier-page__field" :class="{ 'supplier-page__field--error': onboardingFieldErrors.websiteUrl }">
            <span>{{ t("supplierWorkspace.form.websiteUrl") }}</span>
            <input v-model="onboardingForm.websiteUrl" :disabled="!canEditOnboarding" placeholder="https://" :ref="(el) => setOnboardingFieldRef('websiteUrl', el)" @input="clearOnboardingFieldError('websiteUrl')" />
            <small v-if="onboardingFieldErrors.websiteUrl" class="supplier-page__field-error">{{ onboardingFieldErrors.websiteUrl }}</small>
          </label>
          <label class="supplier-page__form-full">
            <span>{{ t("supplierWorkspace.form.businessScope") }}</span>
            <textarea v-model="onboardingForm.businessScope" rows="3" :disabled="!canEditOnboarding" :placeholder="t('supplierWorkspace.form.businessScopePlaceholder')" />
          </label>

          <div v-if="canEditOnboarding" class="supplier-page__form-actions">
            <button type="button" class="supplier-page__btn-secondary" :disabled="onboardingSaveDisabled" @click="saveSupplierOnboardingDraft">
              {{ onboardingSaving ? t("supplierWorkspace.action.savingDraft") : t("supplierWorkspace.action.saveDraft") }}
            </button>
            <button type="button" :disabled="onboardingSubmitDisabled" class="supplier-page__btn-primary" @click="submitSupplierOnboarding">
              {{ onboardingSubmitting ? t("supplierWorkspace.action.submitting") : onboardingSubmitLabel }}
            </button>
          </div>
          <div v-if="canEditOnboarding" class="supplier-page__form-help">
            {{ t("supplierWorkspace.form.draftHelper") }}
          </div>
          <div v-if="latestDraftSavedText" class="supplier-page__form-meta">
            {{ latestDraftSavedText }}
          </div>
        </div>

        <section class="supplier-page__management-block">
          <div class="supplier-page__panel-head">
            <div>
              <strong>{{ t("supplierWorkspace.history.combinedTitle") }}</strong>
            </div>
            <button
              v-if="canDeleteDraft"
              type="button"
              class="supplier-page__danger-btn supplier-page__head-action"
              @click="requestDeleteSupplierDraft"
            >
              {{ t("supplierWorkspace.records.deleteDraft") }}
            </button>
          </div>
          <div class="supplier-page__subsection-head">
            <strong>{{ t("supplierWorkspace.history.submissionRoundsTitle") }}</strong>
          </div>

          <div v-if="submittedApplicationRows.length" class="supplier-page__records-layout">
            <div class="supplier-page__table-wrap">
              <table class="supplier-page__table">
                <thead>
                  <tr>
                    <th>{{ t("supplierWorkspace.records.companyName") }}</th>
                    <th>{{ t("supplierWorkspace.records.submittedTime") }}</th>
                    <th>{{ t("supplierWorkspace.records.reviewStatus") }}</th>
                    <th>{{ t("supplierWorkspace.records.actions") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in submittedApplicationRows"
                    :key="row.round"
                    :class="{ 'supplier-page__table-row--active': selectedSubmittedRound?.round === row.round }"
                  >
                    <td>{{ row.companyName }}</td>
                    <td>{{ row.submittedAtLabel }}</td>
                    <td>
                      <span class="supplier-page__inline-badge" :class="`supplier-page__inline-badge--${resolveWorkflowBadgeTone(row.reviewStatus)}`">
                        {{ row.statusLabel }}
                      </span>
                    </td>
                    <td class="supplier-page__table-actions">
                      <button type="button" @click="selectSubmittedRound(row.round)">{{ t("supplierWorkspace.records.viewDetail") }}</button>
                      <RouterLink
                        v-if="row.reviewStatus === 'rejected'"
                        :to="buildSupplierSubmittedEditHref(row.round)"
                      >
                        {{ t("supplierWorkspace.records.reedit") }}
                      </RouterLink>
                      <RouterLink
                        v-else-if="row.reviewStatus === 'approved' && isApproved"
                        to="/erp/supplier/product/list"
                      >
                        {{ t("supplierWorkspace.records.goProducts") }}
                      </RouterLink>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="selectedSubmittedRound" class="supplier-page__record-detail">
              <div class="supplier-page__record-detail-head">
                <strong>{{ t("supplierWorkspace.records.detailTitle", { round: selectedSubmittedRound.round }) }}</strong>
                <span class="supplier-page__inline-badge" :class="`supplier-page__inline-badge--${resolveWorkflowBadgeTone(selectedSubmittedRound.reviewStatus)}`">
                  {{ selectedSubmittedRound.statusLabel }}
                </span>
              </div>
              <div class="supplier-page__record-detail-grid">
                <div>
                  <span>{{ t("supplierWorkspace.records.companyName") }}</span>
                  <strong>{{ selectedSubmittedRound.companyName }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.submittedTime") }}</span>
                  <strong>{{ selectedSubmittedRound.submittedAtLabel }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.reviewStatus") }}</span>
                  <strong>{{ selectedSubmittedRound.statusLabel }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.contactName") }}</span>
                  <strong>{{ selectedSubmittedRound.submittedProfile?.contactName || "—" }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.contactEmail") }}</span>
                  <strong>{{ selectedSubmittedRound.submittedProfile?.contactEmail || "—" }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.contactPhone") }}</span>
                  <strong>{{ selectedSubmittedRound.submittedProfile?.contactPhone || "—" }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.businessLicenseNo") }}</span>
                  <strong>{{ selectedSubmittedRound.submittedProfile?.businessLicenseNo || "—" }}</strong>
                </div>
                <div>
                  <span>{{ t("supplierWorkspace.records.contactAddress") }}</span>
                  <strong>{{ selectedSubmittedRound.submittedProfile?.addressLine1 || "—" }}</strong>
                </div>
              </div>
              <p v-if="selectedSubmittedRound.reviewNote" class="supplier-page__record-note">
                {{ selectedSubmittedRound.reviewNote }}
              </p>
            </div>
          </div>
          <div v-else class="supplier-page__alert">{{ t("supplierWorkspace.records.submittedEmpty") }}</div>

          <div class="supplier-page__subsection-head supplier-page__subsection-head--spaced">
            <strong>{{ t("supplierWorkspace.review.historyTitle") }}</strong>
          </div>

          <div v-if="reviewHistoryRows.length" class="supplier-page__review-list">
            <article v-for="row in reviewHistoryRows" :key="row.key" class="supplier-page__review-card">
              <div class="supplier-page__review-card-head">
                <strong>{{ row.actionLabel }}</strong>
                <span class="supplier-page__inline-badge" :class="`supplier-page__inline-badge--${row.tone}`">
                  {{ row.round ? t("supplierWorkspace.review.roundLabel", { round: row.round, time: formatTime(row.occurredAt || undefined) }) : formatTime(row.occurredAt || undefined) }}
                </span>
              </div>
              <div class="supplier-page__review-meta">
                <span>{{ t("supplierWorkspace.records.reviewer") }}: {{ row.reviewer }}</span>
                <span>{{ t("supplierWorkspace.records.reviewedTime") }}: {{ formatTime(row.occurredAt || undefined) }}</span>
              </div>
              <p v-if="row.note" class="supplier-page__record-note">{{ row.note }}</p>
            </article>
          </div>
          <div v-else class="supplier-page__alert">{{ t("supplierWorkspace.review.historyEmpty") }}</div>
        </section>
      </template>
    </div>

    <div v-else-if="pageKey === 'supplier-product-add'" class="supplier-page__product-form supplier-page__content-shell">
      <SupplierProductForm />
    </div>

    <div v-else-if="pageKey === 'supplier-product-list'" class="supplier-page__product-list supplier-page__content-shell">
      <div class="supplier-page__panel-head">
        <div>
          <strong>{{ pageTitle }}</strong>
        </div>
        <RouterLink v-if="!isAdmin" to="/erp/supplier/product/add" class="supplier-page__link">{{ t("supplierProducts.page.goToAdd") }}</RouterLink>
      </div>

      <div v-if="listError" class="supplier-page__alert supplier-page__alert--error">{{ listError }}</div>
      <div v-else-if="listSuccess" class="supplier-page__alert supplier-page__alert--success">{{ listSuccess }}</div>
      <input
        ref="importFileInput"
        class="supplier-page__hidden-file-input"
        type="file"
        accept=".csv"
        @change="handleSupplierImportChange"
      />

      <div class="supplier-page__list-toolbar">
        <div class="supplier-page__list-status-tabs">
          <button
            v-for="option in productStatusOptions"
            :key="option.value"
            type="button"
            class="supplier-page__status-tab"
            :class="{ 'supplier-page__status-tab--active': listStatusFilter === option.value }"
            @click="listStatusFilter = option.value"
          >
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>
        <div class="supplier-page__list-toolbar-meta">
          <div class="supplier-page__list-filter-grid">
            <label class="supplier-page__list-filter supplier-page__list-filter--keyword">
              <input v-model="listKeyword" type="text" :placeholder="t('supplierProducts.page.filterKeywordPlaceholder')" />
            </label>
            <div class="supplier-page__list-category-group">
              <CategoryCascadeSelector
                v-model="listCategoryId"
                :categories="categories"
                clear-value="all"
                :allow-non-leaf="true"
                display-mode="dropdown"
                :show-clear-button="false"
                :show-recent-options="false"
                :show-selection-summary="true"
                :level1-placeholder="t('supplierProducts.shared.all')"
                :level2-placeholder="t('supplierProducts.shared.all')"
                :level3-placeholder="t('supplierProducts.shared.all')"
              />
            </div>
          </div>
          <div class="supplier-page__list-toolbar-side">
            <div v-if="!isAdmin" class="supplier-page__list-toolbar-actions">
              <button v-if="hasActiveProductFilters" type="button" @click="resetProductFilters">
                {{ t("supplierProducts.page.resetFilters") }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="listLoading" class="supplier-page__alert">{{ t("common.loading") }}</div>
      <div v-else-if="!filteredProductRows.length" class="supplier-page__alert">
        <strong>{{ t("supplierProducts.page.emptyTitle") }}</strong>
      </div>

      <div v-else class="supplier-product-reference">
        <div class="supplier-product-reference__table-wrap">
          <table class="supplier-product-reference__table">
            <thead>
              <tr>
                <th>{{ t("supplierProducts.list.tableImage") }}</th>
                <th>{{ t("supplierProducts.list.tableProductInfo") }}</th>
                <th>{{ t("supplierProducts.list.tableTemplate") }}</th>
                <th>{{ t("supplierProducts.list.tableActions") }}</th>
              </tr>
            </thead>
            <tbody v-if="pagedProductRows.length">
              <tr v-for="row in pagedProductRows" :key="resolveProductId(row)">
                <td>
                  <div class="supplier-product-reference__picture">
                    <RouterLink
                      v-if="resolvePrimaryImageUrl(row)"
                      class="supplier-product-reference__picture-link"
                      :to="buildSupplierProductEditHref({ productId: resolveProductId(row), templateId: resolveTemplateId(row) })"
                    >
                      <img :src="resolvePrimaryImageUrl(row)" :alt="resolveProductName(row)" crossorigin="anonymous">
                    </RouterLink>
                    <span v-else>{{ t("supplierProducts.list.noImage") }}</span>
                  </div>
                </td>
                <td>
                  <div class="supplier-product-reference__detail-cell">
                    <strong>{{ resolveDisplayProductName(row) || "—" }}</strong>
                    <span>{{ resolveFinishedProductCodeValue(row) || "—" }}</span>
                    <div class="supplier-product-reference__badge-row">
                      <span class="supplier-product-reference__badge" :class="`supplier-product-reference__badge--${resolveWorkflowBadgeTone(resolveListWorkflowStatus(row))}`">
                        {{ resolveWorkflowStatusLabel(resolveListWorkflowStatus(row)) }}
                      </span>
                    </div>
                    <div class="supplier-product-reference__value-row">
                      <span class="supplier-product-reference__value-pill">{{ formatCurrencyAmount(resolvePurchasePriceValue(row), resolveDefaultCurrencyValue(row)) }}</span>
                      <span v-if="resolveProductColorSummary(row)" class="supplier-product-reference__value-pill">{{ resolveProductColorSummary(row) }}</span>
                      <span v-if="resolveProductSizeSummary(row)" class="supplier-product-reference__value-pill">{{ resolveProductSizeSummary(row) }}</span>
                      <span v-if="resolveProductCustomSpecSummary(row)" class="supplier-product-reference__value-pill">{{ resolveProductCustomSpecSummary(row) }}</span>
                      <span v-else-if="resolveVariantCountValue(row) !== '—'" class="supplier-product-reference__value-pill">{{ resolveVariantCountValue(row) }}</span>
                    </div>
                    <div class="supplier-product-reference__value-row supplier-product-reference__value-row--muted">
                      <span v-if="resolveProductSkuValue(row)">{{ resolveProductSkuValue(row) }}</span>
                      <span v-if="resolveProductMaterialValue(row)">{{ resolveProductMaterialValue(row) }}</span>
                      <span v-if="resolveProductLeadTimeValue(row) && resolveProductLeadTimeValue(row) !== '—'">{{ resolveProductLeadTimeValue(row) }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="supplier-product-reference__status-cell">
                    <strong>{{ resolveTemplateDisplayName(row) }}</strong>
                    <span>{{ readProductString(row, "templateName") || "—" }}</span>
                    <div class="supplier-product-reference__value-row supplier-product-reference__value-row--muted">
                      <span>{{ resolveTemplateDisplayId(row) }}</span>
                    </div>
                    <div class="supplier-product-reference__badge-row">
                      <span class="supplier-product-reference__badge supplier-product-reference__badge--neutral">
                        {{ resolveTemplateVisibilityLabel(row) }}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="supplier-product-reference__ops">
                    <template v-if="isAdmin">
                      <button
                        type="button"
                        class="supplier-product-reference__text-link"
                        :disabled="!canApproveProductReview(row)"
                        @click.stop="requestApproveProductReview(row)"
                      >
                        {{ t("supplierProducts.list.actionApprove") }}
                      </button>
                      <button
                        type="button"
                        class="supplier-product-reference__text-link supplier-product-reference__text-link--danger"
                        :disabled="!canRejectProductReview(row)"
                        @click.stop="requestRejectProductReview(row)"
                      >
                        {{ t("supplierProducts.list.actionReject") }}
                      </button>
                    </template>
                    <template v-else>
                      <RouterLink class="supplier-product-reference__action-btn" :to="buildSupplierProductEditHref({ productId: resolveProductId(row), templateId: resolveTemplateId(row) })">
                        {{ t("supplierProducts.list.actionEdit") }}
                      </RouterLink>
                      <button type="button" class="supplier-product-reference__action-btn" :disabled="!canSubmitProductReview(row)" @click.stop="requestSubmitProductReview(row)">
                        {{ t("supplierProducts.list.actionSubmitReview") }}
                      </button>
                      <button
                        type="button"
                        class="supplier-product-reference__action-btn"
                        :disabled="readProductString(row, 'listingStatus') === 'listed' ? !canUnlistProduct(row) : !canListProduct(row)"
                        @click.stop="readProductString(row, 'listingStatus') === 'listed' ? requestUnlistProduct(row) : requestListProduct(row)"
                      >
                        {{ readProductString(row, "listingStatus") === "listed" ? t("supplierProducts.list.actionUnlist") : t("supplierProducts.list.actionList") }}
                      </button>
                      <button
                        type="button"
                        class="supplier-product-reference__action-btn supplier-product-reference__action-btn--danger"
                        :disabled="!canDeleteProduct(row)"
                        @click.stop="requestDeleteProduct(row)"
                      >
                        {{ t("supplierProducts.list.actionDelete") }}
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="4" class="supplier-product-reference__empty">{{ t("supplierProducts.page.emptyTitle") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="supplier-product-reference__pagination">
          <div class="supplier-product-reference__pagination-controls">
            <button type="button" class="supplier-product-reference__page-btn" :disabled="productListPage <= 1" @click="productListPage -= 1">&lt;</button>
            <button type="button" class="supplier-product-reference__page-btn is-current">{{ productListPage }}</button>
            <button type="button" class="supplier-product-reference__page-btn" :disabled="productListPage >= productListTotalPages" @click="productListPage += 1">&gt;</button>
            <select v-model.number="productListPageSize" class="supplier-product-reference__page-size">
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
              <option :value="100">100 / page</option>
            </select>
          </div>
        </footer>
      </div>
    </div>

    <ActionConfirmationModal
      v-model:is-open="actionModalOpen"
      v-model:note="actionModalNote"
      v-model:choice-value="actionModalChoiceValue"
      :title="actionModalTitle"
      :message="actionModalMessage"
      :details="actionModalDetails"
      :confirm-text="actionModalConfirmText"
      :loading-text="actionModalLoadingText"
      :tone="actionModalTone"
      :loading="actionModalLoading"
      :error-message="actionModalError"
      :note-label="actionModalNoteLabel"
      :note-placeholder="actionModalNotePlaceholder"
      :note-required="actionModalNoteRequired"
      :choice-label="actionModalChoiceLabel"
      :choice-required="actionModalChoiceRequired"
      :choice-options="actionModalChoiceOptions"
      :show-hint="true"
      @close="resetActionModal"
      @confirm="confirmWorkspaceAction"
    />
  </div>
</template>

<style scoped>
.supplier-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.supplier-page__onboarding {
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
}

.supplier-page__content-shell {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
}

.supplier-page__list-toolbar,
.supplier-page__list-toolbar-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: end;
}

.supplier-page__list-toolbar {
  margin-top: 16px;
  flex-direction: column;
  align-items: stretch;
}

.supplier-page__management-block {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
}

.supplier-page__list-status-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.supplier-page__status-tab {
  min-width: 120px;
  padding: 12px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.supplier-page__status-tab strong {
  font-size: 16px;
  color: #0f172a;
}

.supplier-page__status-tab--active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.supplier-page__hidden-file-input {
  display: none;
}

.supplier-page__list-filter {
  display: grid;
  gap: 6px;
  min-width: 220px;
  flex: 1 1 220px;
}

.supplier-page__list-filter-grid {
  display: grid;
  gap: 14px;
  flex: 1 1 760px;
  min-width: min(760px, 100%);
}

.supplier-page__list-filter--keyword {
  grid-template-columns: 1fr;
}

.supplier-page__list-toolbar-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.supplier-page__list-summary {
  color: #4b5563;
  font-size: 12px;
}

.supplier-page__list-toolbar-side {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.supplier-page__list-category-group {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.supplier-page__list-filter input,
.supplier-page__list-filter select {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: #111827;
  font: inherit;
}

.supplier-page__list-filter input:focus,
.supplier-page__list-filter select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.supplier-product-reference {
  margin-top: 18px;
}

.supplier-product-reference__table-wrap {
  overflow: auto;
  border: 1px solid #d9dde3;
  background: #fff;
}

.supplier-product-reference__table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 12px;
  color: #333;
}

.supplier-product-reference__table th,
.supplier-product-reference__table td {
  padding: 10px 12px;
  border-bottom: 1px solid #eceff3;
  text-align: left;
  vertical-align: top;
}

.supplier-product-reference__table th {
  background: #f7f8fa;
  color: #616874;
  font-weight: 600;
  white-space: nowrap;
}

.supplier-product-reference__picture {
  display: grid;
  gap: 6px;
  width: 116px;
}

.supplier-product-reference__picture img {
  width: 116px;
  height: 116px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.supplier-product-reference__picture span,
.supplier-product-reference__picture a {
  font-size: 12px;
}

.supplier-product-reference__picture-link {
  display: block;
}

.supplier-product-reference__picture a,
.supplier-product-reference__text-link {
  color: #2d7df6;
  text-decoration: none;
}

.supplier-product-reference__detail-cell,
.supplier-product-reference__status-cell {
  display: grid;
  gap: 8px;
}

.supplier-product-reference__detail-cell > strong,
.supplier-product-reference__status-cell > strong {
  color: #111827;
  font-weight: 600;
  font-size: 14px;
}

.supplier-product-reference__detail-cell > span,
.supplier-product-reference__detail-cell small,
.supplier-product-reference__status-cell > span {
  color: #4b5563;
  line-height: 1.5;
}

.supplier-product-reference__badge-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.supplier-product-reference__value-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.supplier-product-reference__value-row--muted {
  color: #6b7280;
}

.supplier-product-reference__value-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #334155;
  font-weight: 500;
}

.supplier-product-reference__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
}

.supplier-product-reference__badge {
  font-weight: 600;
}

.supplier-product-reference__badge--success {
  background: #ecfdf5;
  color: #047857;
}

.supplier-product-reference__badge--warning {
  background: #fffbeb;
  color: #b45309;
}

.supplier-product-reference__badge--danger {
  background: #fef2f2;
  color: #b91c1c;
}

.supplier-product-reference__badge--neutral {
  background: #f3f4f6;
  color: #4b5563;
}

.supplier-product-reference__ops {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 200px;
}

.supplier-product-reference__text-link {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}

.supplier-product-reference__text-link--danger {
  color: #dc2626;
}

.supplier-product-reference__text-link:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.supplier-product-reference__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #dbe2ea;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.supplier-product-reference__action-btn:disabled {
  color: #9ca3af;
  border-color: #e5e7eb;
  background: #f8fafc;
  cursor: not-allowed;
}

.supplier-product-reference__action-btn--danger {
  color: #dc2626;
  border-color: #fecaca;
  background: #fff5f5;
}

.supplier-product-reference__empty {
  padding: 28px 16px;
  text-align: center;
  color: #64748b;
}

.supplier-product-reference__pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 0 0;
  color: #4b5563;
  font-size: 12px;
}

.supplier-product-reference__pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.supplier-product-reference__page-btn,
.supplier-product-reference__page-size {
  min-height: 30px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
}

.supplier-product-reference__page-btn {
  min-width: 32px;
  cursor: pointer;
}

.supplier-product-reference__page-btn.is-current {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

@media (max-width: 1024px) {
  .supplier-page__list-toolbar-meta {
    align-items: stretch;
  }

  .supplier-page__list-toolbar-side {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .supplier-page__list-category-group {
    grid-template-columns: 1fr;
  }

  .supplier-product-reference__table {
    min-width: 860px;
  }
}

.supplier-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.supplier-page__title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.supplier-page__subtitle {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}

.supplier-page__status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #cbd5e1;
  color: #475569;
  background: #ffffff;
  white-space: nowrap;
}

.supplier-page__status-badge--pending {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.supplier-page__status-badge--rejected {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.supplier-page__status-badge--approved {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.supplier-page__alert {
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #475569;
}

.supplier-page__alert--error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.supplier-page__alert--success {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.supplier-page__alert--warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.supplier-page__readonly-hint {
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 13px;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.supplier-page__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
}

.supplier-page__form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.supplier-page__form-full {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.supplier-page__form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.supplier-page__field-error {
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
}

.supplier-page__form input,
.supplier-page__form textarea,
.supplier-page__form select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
  box-sizing: border-box;
}

.supplier-page__form input:focus,
.supplier-page__form textarea:focus,
.supplier-page__form select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.supplier-page__form textarea {
  min-height: 104px;
  resize: vertical;
}

.supplier-page__form input[disabled],
.supplier-page__form textarea[disabled] {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.supplier-page__field--error input,
.supplier-page__field--error textarea {
  border-color: #f87171;
  background: #fff5f5;
}

.supplier-page__form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.supplier-page__form-help,
.supplier-page__form-meta {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.supplier-page__form-actions button {
  min-height: 42px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.supplier-page__btn-secondary {
  background: #ffffff;
  border-color: #d1d5db;
  color: #374151;
}

.supplier-page__form-actions button:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.supplier-page__btn-primary {
  background: #2563eb !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
}

.supplier-page__btn-primary:disabled {
  background: #93c5fd !important;
  border-color: #93c5fd !important;
  color: #ffffff !important;
}

.supplier-page__panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.supplier-page__panel-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.supplier-page__subsection-head {
  margin-bottom: 14px;
}

.supplier-page__subsection-head--spaced {
  margin-top: 18px;
}

.supplier-page__link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.supplier-page__head-action {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
}

.supplier-page__table-wrap {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.supplier-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.supplier-page__table--orders th,
.supplier-page__table--orders td {
  padding-top: 12px;
  padding-bottom: 12px;
}

.supplier-page__table th,
.supplier-page__table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.supplier-page__table th {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  background: #f9fafb;
}

.supplier-page__table-row--active {
  background: #eff6ff;
}

.supplier-page__table td > strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
}

.supplier-page__table td > small {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.supplier-page__product-cell {
  display: grid;
  gap: 4px;
}

.supplier-page__muted {
  color: #64748b !important;
}

.supplier-page__status-stack {
  display: grid;
  gap: 4px;
}

.supplier-page__inline-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #dbe2ea;
  background: #f8fafc;
  color: #475569;
}

.supplier-page__inline-badge--success {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.supplier-page__inline-badge--warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.supplier-page__inline-badge--danger {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.supplier-page__inline-badge--neutral {
  color: #475569;
  background: #f8fafc;
  border-color: #cbd5e1;
}

.supplier-page__table-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.supplier-page__table-actions button,
.supplier-page__table-actions a {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.supplier-page__table-actions button:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.supplier-page__danger-btn {
  color: #dc2626 !important;
  border-color: #fecaca !important;
}

.supplier-page__records-layout {
  display: grid;
  gap: 16px;
}

.supplier-page__record-detail {
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.supplier-page__record-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: #0f172a;
}

.supplier-page__record-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.supplier-page__record-detail-grid div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
}

.supplier-page__record-detail-grid span {
  font-size: 12px;
  color: #64748b;
}

.supplier-page__record-detail-grid strong {
  color: #0f172a;
  font-size: 14px;
  word-break: break-word;
}

.supplier-page__record-note {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  line-height: 1.6;
}

.supplier-page__review-list {
  display: grid;
  gap: 14px;
}

.supplier-page__review-card {
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.supplier-page__review-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #0f172a;
}

.supplier-page__review-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 768px) {
  .supplier-page__header {
    flex-direction: column;
  }
  .supplier-page__form-row {
    grid-template-columns: 1fr;
  }
  .supplier-page__record-detail-grid {
    grid-template-columns: 1fr;
  }
  .supplier-page__review-card-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .supplier-page__status-tab {
    min-width: calc(50% - 8px);
  }
}
</style>
