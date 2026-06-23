<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import { ApiRequestError, gatewayPlatformFetch, resolveAssetUrl, resolveRuntimeAssetUrl, type TemplateSummary } from "../../api/client"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import { buildCategoryIdSet } from "../../pages/admin/repositoryView"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore, type CategoryNode } from "../../stores/platform"
import { buildTemplateIdentityKeys, useTemplateStore } from "../../stores/templates"
import {
  fetchErpProductDetail,
  fetchErpTemplatePermissionDetail,
  fetchNextErpFinishedProductCode,
  saveErpProduct,
} from "../api"
import { getListedMarketplaceTemplates } from "../../pages/admin/centerView"
import {
  buildPlatformPreviewTemplates,
  createTemplatePreviewCatalog,
  filterRepositoryPreviewSharedTemplates,
  resolvePreviewTemplateAccessScope,
  type TemplatePreviewEntry,
} from "../../pages/admin/repositoryPreviewTemplateVisibility"
import {
  readTemplatePermissionTemplateId,
} from "../templatePermissionRouting"
import type { ErpProductDetail, ErpProductDetailField, ErpProductSaveRequest, ErpTemplatePermissionDetail } from "../types"

type ProductTabKey =
  | "basic"
  | "price"
  | "packaging"
  | "customs"
  | "wholesale"
  | "private"

type ProductMatrixRow = {
  key: string
  color: string
  size: string
  customValue: string
  label: string
  sku: string
  purchasePrice: number
  retailPrice: number
  minimumOrderQuantity: number
  packageWeight: number
  length: number
  width: number
  height: number
  declaredName: string
  declaredNameEn: string
  hsCode: string
  specialTransportTag: string
  declaredValue: number
  declaredCurrency: string
  originCountry: string
  declarationMaterial: string
  declarationUsage: string
  wholesaleMinQuantity: number
  wholesalePrice: number
  privateTierName: string
  privateMinQuantity: number
  privatePrice: number
  privateNote: string
}

type ProductFormMeta = {
  templateId: string
  productId?: string
  finishedProductCode: string
  productName: string
  productNameEn: string
  description: string
  productSku: string
  productType: string
  status: string
  defaultCurrency: string
  categoryId: string
  supplierName: string
  supplierSku: string
  supplierSourceUrl: string
  primaryImageUrl: string
  deliveryDays: number
  deliveryTimeText: string
  materialText: string
  materialTextEn: string
  qualityGrade: string
  targetAudience: string
  craftsmanship: string
  salesUnit: string
  packageUnit: string
  declarationUnit: string
  colorOptionsText: string
  sizeOptionsText: string
  customSpecName: string
  customSpecOptionsText: string
  weightUnit: "g" | "lb"
  dimensionUnit: "cm" | "in"
}

type TemplatePickerRow = {
  templateId: string
  templateName: string
  templateCode: string
  categoryId: string
  categoryPath: string
  templateSource: string
  templateVersion: string
  reviewStatusLabel: string
  previewUrl: string
  publishStatus: "draft" | "published"
  pickerScopes: Array<"platform" | "shared">
  accessScope: "public" | "private"
}

type TemplatePickerScope = TemplatePickerRow["pickerScopes"][number]
type PrimaryImageAssetTab = "drafts" | "results"
type PrimaryImageSource = "manual" | "template" | "upload" | "draft" | "result"
type TemplateEditorPreviewPayload = {
  colors?: string[]
  default_color?: string
  default_view?: string
  views?: string[]
  preview_map?: Record<string, string>
}
type DraftGridCellStatus = "idle" | "loading" | "done" | "error"
type DraftGridCell = {
  color: string
  view: string
  entry: PrimaryImageResultEntry | null
  status: DraftGridCellStatus
}
type PrimaryImageDraftEntry = {
  id: string
  draftName: string
  finishedProductCode: string
  previewUrl: string
  previewViewLabel: string
  updatedAt: string
  designJson: string
  preferencesJson: string
}
type PrimaryImageResultEntry = {
  id: string
  url: string
  color: string
  view: string
  size: string
  createdAt: string
  source: "saved" | "live"
}
type ProductImageFormItem = {
  id: string
  imageUrl: string
  altText: string
  sortOrder: number
  primary: boolean
  source: PrimaryImageSource
}

const TEMPLATE_PICKER_PAGE_SIZE = 15
const PRIMARY_IMAGE_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"

const PRODUCT_DETAIL_LABELS = {
  description: "其他说明",
  qualityGrade: "品质等级",
  targetAudience: "适用人群",
  craftsmanship: "工艺",
  salesUnit: "销售单位",
  packageUnit: "包装单位",
  declarationUnit: "报关单位",
  customSpecName: "自定义规格名",
  customSpecValues: "自定义规格值",
} as const

const tabs: Array<{ key: ProductTabKey; labelKey: string }> = [
  { key: "basic", labelKey: "supplierProducts.form.basicTab" },
  { key: "price", labelKey: "supplierProducts.form.priceTab" },
  { key: "packaging", labelKey: "supplierProducts.form.packagingTab" },
  { key: "customs", labelKey: "supplierProducts.form.customsTab" },
  { key: "wholesale", labelKey: "supplierProducts.form.wholesaleTab" },
  { key: "private", labelKey: "supplierProducts.form.privateTab" },
]

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const templateStore = useTemplateStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { categories } = storeToRefs(platformStore)
const { role, tenant } = storeToRefs(authStore)

const activeTab = ref<ProductTabKey>("basic")
const formLoading = ref(false)
const saving = ref(false)
const templateLoading = ref(false)
const templateDetailLoading = ref(false)
const formError = ref("")
const formSuccess = ref("")
const matrixRows = ref<ProductMatrixRow[]>([])
const templateRows = ref<TemplatePickerRow[]>([])
const selectedTemplate = ref<ErpTemplatePermissionDetail | null>(null)
const showColorCreator = ref(false)
const showSizeCreator = ref(false)
const showCustomSpecCreator = ref(false)
const showCraftsmanshipCreator = ref(false)
const templatePickerOpen = ref(false)
const templatePickerKeyword = ref("")
const templatePickerSelectionId = ref("")
const templatePickerScope = ref<TemplatePickerScope>("platform")
const templatePickerCategoryId = ref("all")
const templatePickerPage = ref(1)
const showTemplateCategoryPopover = ref(false)
const templateCategorySyncing = ref(false)
const templatePickerImageFailures = ref<Record<string, true>>({})
const pendingColorText = ref("")
const pendingSizeText = ref("")
const pendingCustomSpecValues = ref("")
const pendingCraftsmanshipText = ref("")
const primaryImageFileInput = ref<HTMLInputElement | null>(null)
const primaryImageUploading = ref(false)
const primaryImageAssetModalOpen = ref(false)
const primaryImageAssetTab = ref<PrimaryImageAssetTab>("drafts")
const primaryImageAssetLoading = ref(false)
const primaryImageAssetError = ref("")
const primaryImageAssetSelectionId = ref("")
const primaryImageAssetSelectionIds = ref<Set<string>>(new Set())
const primaryImageSelectedDraftId = ref("")
const primaryImageSelectionSource = ref<"" | Exclude<PrimaryImageSource, "manual" | "template">>("")
const primaryImageDraftEntries = ref<PrimaryImageDraftEntry[]>([])
const ASSET_PAGE_SIZE = 20
const assetDraftOutputPage = ref(1)
const assetResultPage = ref(1)
const primaryImageDraftOutputEntries = ref<PrimaryImageResultEntry[]>([])
const primaryImageResultEntries = ref<PrimaryImageResultEntry[]>([])
const primaryImageEditorPayload = ref<TemplateEditorPreviewPayload | null>(null)
const primaryImageEditorPayloadTemplateId = ref("")
const draftGridCells = ref<DraftGridCell[]>([])
const draftSelectedColor = ref("")
const draftMainPreviewColor = ref("")
const draftMainPreviewView = ref("")
const productImageItems = ref<ProductImageFormItem[]>([])

const form = reactive<ProductFormMeta>(createDefaultForm())

const fallbackCategories = computed<CategoryNode[]>(() => {
  const apparelName = t("supplierProducts.form.fallbackCategory.apparel")
  const outerwearName = t("supplierProducts.form.fallbackCategory.apparelOuterwear")
  const hoodiesName = t("supplierProducts.form.fallbackCategory.apparelOuterwearHoodies")
  const bagsName = t("supplierProducts.form.fallbackCategory.bagsLuggage")
  const everydayBagsName = t("supplierProducts.form.fallbackCategory.bagsEveryday")
  const toteName = t("supplierProducts.form.fallbackCategory.bagsEverydayTote")
  const drinkwareName = t("supplierProducts.form.fallbackCategory.drinkware")
  const cupsName = t("supplierProducts.form.fallbackCategory.drinkwareCups")
  const ceramicMugName = t("supplierProducts.form.fallbackCategory.drinkwareCupsCeramic")

  return [
    {
      category_id: "apparel",
      level: 1,
      name: apparelName,
      category_path: apparelName,
      status: "active",
      children: [
        {
          category_id: "apparel_outerwear",
          parent_id: "apparel",
          level: 2,
          name: outerwearName,
          category_path: [apparelName, outerwearName].join(" / "),
          status: "active",
          children: [
            {
              category_id: "apparel_outerwear_hoodies",
              parent_id: "apparel_outerwear",
              level: 3,
              name: hoodiesName,
              category_path: [apparelName, outerwearName, hoodiesName].join(" / "),
              status: "active",
              children: [],
            },
          ],
        },
      ],
    },
    {
      category_id: "bags_luggage",
      level: 1,
      name: bagsName,
      category_path: bagsName,
      status: "active",
      children: [
        {
          category_id: "bags_everyday",
          parent_id: "bags_luggage",
          level: 2,
          name: everydayBagsName,
          category_path: [bagsName, everydayBagsName].join(" / "),
          status: "active",
          children: [
            {
              category_id: "bags_everyday_tote",
              parent_id: "bags_everyday",
              level: 3,
              name: toteName,
              category_path: [bagsName, everydayBagsName, toteName].join(" / "),
              status: "active",
              children: [],
            },
          ],
        },
      ],
    },
    {
      category_id: "drinkware",
      level: 1,
      name: drinkwareName,
      category_path: drinkwareName,
      status: "active",
      children: [
        {
          category_id: "drinkware_cups",
          parent_id: "drinkware",
          level: 2,
          name: cupsName,
          category_path: [drinkwareName, cupsName].join(" / "),
          status: "active",
          children: [
            {
              category_id: "drinkware_cups_ceramic",
              parent_id: "drinkware_cups",
              level: 3,
              name: ceramicMugName,
              category_path: [drinkwareName, cupsName, ceramicMugName].join(" / "),
              status: "active",
              children: [],
            },
          ],
        },
      ],
    },
  ]
})
const resolvedCategories = computed(() => categories.value.length ? categories.value : fallbackCategories.value)
const routeTemplateId = computed(() => readTemplatePermissionTemplateId(route.query.templateId))
const routeProductId = computed(() => String(route.query.productId || "").trim())
const routeDuplicateProductId = computed(() => String(route.query.duplicateFromProductId || "").trim())
const isEditMode = computed(() => Boolean(form.productId || routeProductId.value))
const isDuplicateMode = computed(() => Boolean(!isEditMode.value && routeDuplicateProductId.value))
const pageHeadline = computed(() => isEditMode.value ? t("supplierProducts.form.introTitleEdit") : t("supplierProducts.form.introTitleAdd"))
const pageDescription = computed(() => isEditMode.value
  ? t("supplierProducts.form.introDescriptionEdit")
  : isDuplicateMode.value
    ? t("supplierProducts.form.introDescriptionDuplicate")
  : t("supplierProducts.form.introDescriptionAdd"))
const selectableTemplateCount = computed(() => templateRows.value.length)
const selectedTemplateConflict = computed(() => {
  const boundProduct = selectedTemplate.value?.templateOverview.boundProduct
  if (!boundProduct?.enabled) {
    return null
  }
  if (form.productId && boundProduct.productId === form.productId) {
    return null
  }
  return boundProduct
})
const prefersServerLabels = computed(() => locale.value === "zh")
const colorOptions = computed(() => splitTextOptions(form.colorOptionsText))
const sizeOptions = computed(() => splitTextOptions(form.sizeOptionsText))
const customSpecOptions = computed(() => splitTextOptions(form.customSpecOptionsText))
const specGridSizeRows = computed(() => sizeOptions.value.length ? sizeOptions.value : [t("supplierProducts.form.defaultSpec")])
const specGridAttributeColumns = computed(() => customSpecOptions.value)
const craftsmanshipOptions = computed(() => splitTextOptions(form.craftsmanship))
const currentTemplateSummary = computed(() => {
  const currentTemplateId = form.templateId.trim()
  if (!currentTemplateId) {
    return t("supplierProducts.form.templatePlaceholder")
  }
  if (selectedTemplate.value?.templateId === currentTemplateId) {
    return selectedTemplate.value.templateName
  }
  const matched = templateRows.value.find((item) => item.templateId === currentTemplateId)
  return matched?.templateName || currentTemplateId
})
const boundTemplatePickerEntry = computed(() => {
  const currentTemplateId = form.templateId.trim()
  return templateRows.value.find((item) => item.templateId === currentTemplateId) || null
})
const selectedTemplatePickerEntry = computed(() => templateRows.value.find((item) => item.templateId === templatePickerSelectionId.value) || null)
const explicitPrimaryImageUrl = computed(() => productImageItems.value[0]?.imageUrl?.trim() || form.primaryImageUrl.trim())
const effectivePrimaryImageUrl = computed(() => resolveEffectivePrimaryImageUrl())
const effectivePrimaryImagePreviewUrl = computed(() => resolveDisplayImageUrl(effectivePrimaryImageUrl.value))
const primaryImageCurrentSource = computed<PrimaryImageSource | "">(() => {
  if (explicitPrimaryImageUrl.value) {
    return primaryImageSelectionSource.value || "manual"
  }
  return selectedTemplate.value?.printConfig?.effectImageBaseUrl?.trim() ? "template" : ""
})
const primaryImageCurrentSourceLabel = computed(() => {
  const source = primaryImageCurrentSource.value
  return source
    ? t(`supplierProducts.form.primaryImageSource.${source}`)
    : t("supplierProducts.form.primaryImageSourceEmpty")
})
const primaryImageDraftSelection = computed(() => (
  primaryImageDraftEntries.value.find((item) => item.id === primaryImageSelectedDraftId.value) || null
))
const primaryImageDraftOutputSelection = computed(() => (
  primaryImageDraftOutputEntries.value.find((item) => item.id === primaryImageAssetSelectionId.value) || null
))
const primaryImageResultSelection = computed(() => (
  primaryImageResultEntries.value.find((item) => item.id === primaryImageAssetSelectionId.value) || null
))
const selectedPrimaryImageAsset = computed(() => (
  primaryImageAssetTab.value === "drafts"
    ? primaryImageDraftOutputSelection.value
    : primaryImageResultSelection.value
))
const selectedPrimaryImageAssets = computed<PrimaryImageResultEntry[]>(() => {
  const pool = primaryImageAssetTab.value === "drafts"
    ? draftGridCells.value.filter((c) => c.status === "done" && c.entry).map((c) => c.entry!)
    : primaryImageResultEntries.value
  if (primaryImageAssetSelectionIds.value.size) {
    return pool.filter((item) => primaryImageAssetSelectionIds.value.has(item.id))
  }
  return selectedPrimaryImageAsset.value ? [selectedPrimaryImageAsset.value] : []
})
const draftAvailableColors = computed(() => {
  const colors: string[] = []
  for (const cell of draftGridCells.value) {
    if (!colors.includes(cell.color)) colors.push(cell.color)
  }
  return colors
})
const filteredDraftGridCells = computed(() =>
  draftSelectedColor.value
    ? draftGridCells.value.filter((c) => c.color === draftSelectedColor.value)
    : draftGridCells.value,
)
const pagedDraftGridCells = computed(() => {
  const start = (assetDraftOutputPage.value - 1) * ASSET_PAGE_SIZE
  return filteredDraftGridCells.value.slice(start, start + ASSET_PAGE_SIZE)
})
const draftOutputTotalPages = computed(() => Math.max(1, Math.ceil(filteredDraftGridCells.value.length / ASSET_PAGE_SIZE)))
const pagedResultEntries = computed(() => {
  const start = (assetResultPage.value - 1) * ASSET_PAGE_SIZE
  return primaryImageResultEntries.value.slice(start, start + ASSET_PAGE_SIZE)
})
const resultTotalPages = computed(() => Math.max(1, Math.ceil(primaryImageResultEntries.value.length / ASSET_PAGE_SIZE)))
const primaryImageAssetEmptyText = computed(() => (
  primaryImageAssetTab.value === "drafts"
    ? (primaryImageDraftEntries.value.length
        ? (primaryImageSelectedDraftId.value
            ? t("supplierProducts.form.primaryImageDraftOutputsEmpty")
            : t("supplierProducts.form.primaryImageDraftSelectHint"))
        : t("supplierProducts.form.primaryImageDraftEmpty"))
    : t("supplierProducts.form.primaryImageResultEmpty")
))
const primaryImageAssetCount = computed(() => (
  primaryImageAssetTab.value === "drafts"
    ? draftGridCells.value.filter((c) => c.status === "done" && c.entry).length
    : primaryImageResultEntries.value.length
))
const primaryImageDraftOutputSummary = computed(() => {
  if (!primaryImageDraftSelection.value) {
    return t("supplierProducts.form.primaryImageDraftSelectHint")
  }
  const total = draftGridCells.value.length
  const done = draftGridCells.value.filter((c) => c.status === "done" && c.entry).length
  return t("supplierProducts.form.primaryImageDraftOutputsSummary", {
    name: primaryImageDraftSelection.value.draftName,
    count: `${done}/${total}`,
  })
})
const templatePickerScopeOptions = computed(() => ([
  {
    key: "platform" as const,
    label: t("supplierProducts.form.templateScopePlatform"),
    count: templateRows.value.filter((item) => item.pickerScopes.includes("platform")).length,
  },
  {
    key: "shared" as const,
    label: t("supplierProducts.form.templateScopeShared"),
    count: templateRows.value.filter((item) => item.pickerScopes.includes("shared")).length,
  },
]))
const templatePickerActiveCategoryIds = computed(() => buildCategoryIdSet(templatePickerCategoryId.value, resolvedCategories.value))
const scopedTemplateRows = computed(() => templateRows.value.filter((item) => item.pickerScopes.includes(templatePickerScope.value)))
const filteredTemplateRows = computed(() => {
  const query = templatePickerKeyword.value.trim().toLowerCase()
  const categoryIds = templatePickerActiveCategoryIds.value
  return scopedTemplateRows.value.filter((item) => {
    if (categoryIds && (!item.categoryId || !categoryIds.has(item.categoryId))) {
      return false
    }
    if (!query) {
      return true
    }
    return [
      item.templateName,
      item.templateId,
      item.templateCode,
      item.categoryPath,
      item.templateVersion,
      item.templateSource,
      item.reviewStatusLabel,
    ].some((field) => String(field || "").toLowerCase().includes(query))
  })
})
const pagedTemplateRows = computed(() => {
  const start = (templatePickerPage.value - 1) * TEMPLATE_PICKER_PAGE_SIZE
  return filteredTemplateRows.value.slice(start, start + TEMPLATE_PICKER_PAGE_SIZE)
})
const templatePickerTotalPages = computed(() => Math.max(1, Math.ceil(filteredTemplateRows.value.length / TEMPLATE_PICKER_PAGE_SIZE)))
const templatePickerResultSummary = computed(() => t("supplierProducts.form.templateSelectableCount", { count: filteredTemplateRows.value.length }))
const templatePickerEmptyText = computed(() => {
  const hasFilter = Boolean(templatePickerKeyword.value.trim()) || templatePickerCategoryId.value !== "all"
  if (hasFilter) {
    return t("supplierProducts.form.templateFilterEmpty")
  }
  if (templatePickerScope.value === "platform") {
    return t("supplierProducts.form.templatePlatformEmpty")
  }
  return t("supplierProducts.form.templateSharedEmpty")
})

function resolveTemplatePreviewUrl(template: TemplatePickerRow) {
  if (templatePickerImageFailures.value[template.templateId]) {
    return ""
  }
  const previewUrl = template.previewUrl.trim()
  return previewUrl ? resolveAssetUrl(previewUrl) : ""
}

function handleTemplatePreviewError(templateId: string) {
  templatePickerImageFailures.value = {
    ...templatePickerImageFailures.value,
    [templateId]: true,
  }
}

function buildTemplatePickerIdentityKeys(row: Pick<TemplatePickerRow, "templateId" | "templateCode">) {
  return buildTemplateIdentityKeys({
    template_id: row.templateId,
    governance_id: row.templateId,
    runtime_key: row.templateId,
    template_code: row.templateCode,
  })
}

function selectTemplatePickerScope(scope: TemplatePickerScope) {
  templatePickerScope.value = scope
  templatePickerPage.value = 1
  showTemplateCategoryPopover.value = false
}

function updateTemplatePickerKeyword(value: string) {
  templatePickerKeyword.value = value
  templatePickerPage.value = 1
}

function updateTemplatePickerCategory(value: string) {
  templatePickerCategoryId.value = value
  templatePickerPage.value = 1
  if (isTemplatePickerCategorySelectionComplete(value)) {
    showTemplateCategoryPopover.value = false
  }
}

function toggleTemplateCategoryPopover() {
  showTemplateCategoryPopover.value = !showTemplateCategoryPopover.value
}

function goToTemplatePickerPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), templatePickerTotalPages.value)
  templatePickerPage.value = nextPage
}

function resolveTemplatePickerScope(templateId: string): TemplatePickerScope | null {
  return templateRows.value.find((item) => item.templateId === templateId)?.pickerScopes[0] || null
}

function resolveDefaultTemplatePickerScope(): TemplatePickerScope {
  const selectedScope = resolveTemplatePickerScope(form.templateId.trim())
  if (selectedScope) {
    return selectedScope
  }
  const firstAvailable = templatePickerScopeOptions.value.find((item) => item.count > 0)
  return firstAvailable?.key || "platform"
}

function isTemplatePickerCategorySelectionComplete(categoryId: string) {
  const normalizedId = String(categoryId || "").trim()
  if (!normalizedId || normalizedId === "all") {
    return false
  }
  const chain = findCategoryChain(resolvedCategories.value, normalizedId)
  if (chain.length >= 3) {
    return true
  }
  const selectedNode = chain[chain.length - 1]
  return Boolean(selectedNode && !(selectedNode.children || []).length)
}

function findCategoryChain(nodes: CategoryNode[], targetId: string, parents: CategoryNode[] = []): CategoryNode[] {
  for (const node of nodes) {
    const chain = [...parents, node]
    if (node.category_id === targetId) {
      return chain
    }
    if (node.children?.length) {
      const matched = findCategoryChain(node.children, targetId, chain)
      if (matched.length) {
        return matched
      }
    }
  }
  return []
}

function joinTextOptions(items: string[]) {
  return items.join(", ")
}

function applyPendingColorOptions() {
  form.colorOptionsText = joinTextOptions(splitTextOptions(pendingColorText.value))
  pendingColorText.value = ""
  showColorCreator.value = false
}

function applyPendingSizeOptions() {
  form.sizeOptionsText = joinTextOptions(splitTextOptions(pendingSizeText.value))
  pendingSizeText.value = ""
  showSizeCreator.value = false
}

function openColorEditor() {
  pendingColorText.value = joinTextOptions(colorOptions.value)
  showColorCreator.value = true
}

function openSizeEditor() {
  pendingSizeText.value = joinTextOptions(sizeOptions.value)
  showSizeCreator.value = true
}

function openCustomSpecEditor() {
  pendingCustomSpecValues.value = joinTextOptions(customSpecOptions.value)
  showCustomSpecCreator.value = true
}

function applyPendingCustomSpecOptions() {
  const nextValues = joinTextOptions(splitTextOptions(pendingCustomSpecValues.value))
  form.customSpecName = nextValues ? t("supplierProducts.form.attribute") : ""
  form.customSpecOptionsText = nextValues
  pendingCustomSpecValues.value = ""
  showCustomSpecCreator.value = false
}

function openCraftsmanshipEditor() {
  pendingCraftsmanshipText.value = joinTextOptions(craftsmanshipOptions.value)
  showCraftsmanshipCreator.value = true
}

function applyPendingCraftsmanshipOptions() {
  form.craftsmanship = joinTextOptions(splitTextOptions(pendingCraftsmanshipText.value))
  pendingCraftsmanshipText.value = ""
  showCraftsmanshipCreator.value = false
}

function resolveSpecGridCellRow(size: string, customValue: string) {
  return matrixRows.value.find((row) => row.size === size && row.customValue === customValue)
}

function resolveEffectiveProductSku() {
  return form.productSku.trim() || form.finishedProductCode.trim()
}

function resolveEffectiveSupplierSku() {
  return form.supplierSku.trim() || resolveEffectiveProductSku()
}

function resolveEffectivePrimaryImageUrl() {
  return form.primaryImageUrl.trim() || selectedTemplate.value?.printConfig?.effectImageBaseUrl?.trim() || ""
}

function resolveDisplayImageUrl(value?: string) {
  const next = String(value || "").trim()
  return next ? resolveAssetUrl(next) : ""
}

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

function parseJsonRecord(rawValue?: string) {
  if (!rawValue?.trim()) {
    return {} as Record<string, unknown>
  }
  try {
    const parsed = JSON.parse(rawValue)
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function clearPrimaryImageAssetState() {
  primaryImageAssetSelectionId.value = ""
  primaryImageAssetSelectionIds.value = new Set()
  primaryImageSelectedDraftId.value = ""
  primaryImageAssetError.value = ""
  primaryImageDraftEntries.value = []
  primaryImageDraftOutputEntries.value = []
  draftGridCells.value = []
  draftSelectedColor.value = ""
  draftMainPreviewColor.value = ""
  draftMainPreviewView.value = ""
  primaryImageResultEntries.value = []
  primaryImageEditorPayload.value = null
  primaryImageEditorPayloadTemplateId.value = ""
  assetDraftOutputPage.value = 1
  assetResultPage.value = 1
}

function syncProductImagePrimaryState() {
  productImageItems.value = productImageItems.value.map((item, index) => ({
    ...item,
    sortOrder: index,
    primary: index === 0,
  }))
  form.primaryImageUrl = productImageItems.value[0]?.imageUrl || ""
  primaryImageSelectionSource.value = productImageItems.value[0]?.source === "template" || productImageItems.value[0]?.source === "manual"
    ? ""
    : (productImageItems.value[0]?.source || "")
}

function buildProductImageFormItem(imageUrl: string, source: PrimaryImageSource, options?: {
  altText?: string
  imageId?: string
}) {
  return {
    id: options?.imageId || `${source}:${imageUrl}`,
    imageUrl,
    altText: options?.altText || `${form.productName.trim() || t("supplierProducts.form.defaultProductName")} ${t("supplierProducts.form.primaryImageAlt")}`,
    sortOrder: productImageItems.value.length,
    primary: productImageItems.value.length === 0,
    source,
  } satisfies ProductImageFormItem
}

function upsertProductImage(imageUrl: string, source: PrimaryImageSource, options?: {
  altText?: string
  makePrimary?: boolean
}) {
  const normalizedUrl = String(imageUrl || "").trim()
  if (!normalizedUrl) return
  const existingIndex = productImageItems.value.findIndex((item) => item.imageUrl === normalizedUrl)
  if (existingIndex >= 0) {
    const existing = productImageItems.value[existingIndex]
    const nextItems = productImageItems.value.filter((_, index) => index !== existingIndex)
    const updated = {
      ...existing,
      source,
      altText: options?.altText || existing.altText,
    }
    productImageItems.value = options?.makePrimary
      ? [updated, ...nextItems]
      : [...nextItems.slice(0, existingIndex), updated, ...nextItems.slice(existingIndex)]
  } else if (options?.makePrimary) {
    productImageItems.value = [buildProductImageFormItem(normalizedUrl, source, options), ...productImageItems.value]
  } else {
    productImageItems.value = [...productImageItems.value, buildProductImageFormItem(normalizedUrl, source, options)]
  }
  syncProductImagePrimaryState()
}

function clearPrimaryImageSelection() {
  if (productImageItems.value.length) {
    productImageItems.value = productImageItems.value.slice(1)
    syncProductImagePrimaryState()
  } else {
    form.primaryImageUrl = ""
    primaryImageSelectionSource.value = ""
  }
  primaryImageAssetSelectionId.value = ""
}

function setProductImageAsPrimary(imageId: string) {
  const currentIndex = productImageItems.value.findIndex((item) => item.id === imageId)
  if (currentIndex <= 0) {
    return
  }
  const nextItems = [...productImageItems.value]
  const [selected] = nextItems.splice(currentIndex, 1)
  nextItems.unshift(selected)
  productImageItems.value = nextItems
  syncProductImagePrimaryState()
}

function moveProductImage(imageId: string, direction: "backward" | "forward") {
  const currentIndex = productImageItems.value.findIndex((item) => item.id === imageId)
  if (currentIndex < 0) {
    return
  }
  const nextIndex = direction === "backward" ? currentIndex - 1 : currentIndex + 1
  if (nextIndex < 0 || nextIndex >= productImageItems.value.length) {
    return
  }
  const nextItems = [...productImageItems.value]
  const [selected] = nextItems.splice(currentIndex, 1)
  nextItems.splice(nextIndex, 0, selected)
  productImageItems.value = nextItems
  syncProductImagePrimaryState()
}

function removeProductImage(imageId: string) {
  const nextItems = productImageItems.value.filter((item) => item.id !== imageId)
  productImageItems.value = nextItems
  syncProductImagePrimaryState()
  if (!nextItems.length) {
    primaryImageSelectionSource.value = ""
  }
}

function validatePrimaryImageFile(file: File) {
  const fileName = file.name.toLowerCase()
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".svg"]
  return allowedTypes.includes(file.type) || allowedExts.some((ext) => fileName.endsWith(ext))
}

async function uploadPrimaryImageFile(file: File) {
  if (!validatePrimaryImageFile(file)) {
    throw new Error(t("supplierProducts.form.primaryImageUnsupportedFormat"))
  }
  const requestBody = new FormData()
  requestBody.append("file", file)
  if (role.value === "platform_admin" && String(tenant.value?.tenant_id || "").trim()) {
    requestBody.append("tenant_id", String(tenant.value?.tenant_id || "").trim())
  }
  const uploaded = await gatewayPlatformFetch<{
    artwork_id?: string
    preview_url?: string
    original_url?: string
  }>("/api/v1/artworks/uploads", {
    method: "POST",
    headers: authStore.authHeaders,
    body: requestBody,
  })
  const primaryUrl = resolveAssetUrl(String(uploaded.original_url || uploaded.preview_url || "").trim())
  if (!uploaded.artwork_id || !primaryUrl) {
    throw new Error(t("supplierProducts.form.primaryImageUploadFailed"))
  }
  return primaryUrl
}

function openPrimaryImageUploadDialog() {
  if (saving.value || primaryImageUploading.value) {
    return
  }
  primaryImageFileInput.value?.click()
}

async function handlePrimaryImageFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = input?.files ? Array.from(input.files) : []
  if (!files.length) {
    return
  }
  primaryImageUploading.value = true
  formError.value = ""
  formSuccess.value = ""
  try {
    for (const file of files) {
      const uploadedUrl = await uploadPrimaryImageFile(file)
      upsertProductImage(uploadedUrl, "upload")
    }
    primaryImageAssetSelectionId.value = ""
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error)
  } finally {
    primaryImageUploading.value = false
    if (input) {
      input.value = ""
    }
  }
}

async function ensurePrimaryImageEditorPayload(templateId: string) {
  const normalizedTemplateId = String(templateId || "").trim()
  if (!normalizedTemplateId) {
    return null
  }
  if (primaryImageEditorPayloadTemplateId.value === normalizedTemplateId && primaryImageEditorPayload.value) {
    return primaryImageEditorPayload.value
  }
  const payload = await gatewayPlatformFetch<TemplateEditorPreviewPayload>(
    `/api/v1/runtime/templates/${encodeURIComponent(normalizedTemplateId)}/editor`,
    { headers: authStore.authHeaders },
  )
  primaryImageEditorPayloadTemplateId.value = normalizedTemplateId
  primaryImageEditorPayload.value = {
    colors: Array.isArray(payload.colors) ? payload.colors.map((item) => String(item || "").trim()).filter(Boolean) : [],
    default_color: String(payload.default_color || "").trim(),
    default_view: String(payload.default_view || "").trim(),
    views: Array.isArray(payload.views) ? payload.views.map((item) => String(item || "").trim()).filter(Boolean) : [],
    preview_map: Object.fromEntries(
      Object.entries(payload.preview_map || {}).map(([key, value]) => [key, resolveRuntimeAssetUrl(String(value || "").trim())])
    ),
  }
  return primaryImageEditorPayload.value
}

function resolvePrimaryImageDraftPreview(record: { preferencesJson?: string }, payload: TemplateEditorPreviewPayload | null) {
  const parsedPreferences = parseJsonRecord(record.preferencesJson)
  const previewMap = payload?.preview_map || {}
  const selectedColor = String(parsedPreferences.selectedColor ?? parsedPreferences.selected_color ?? payload?.default_color ?? "").trim()
  const selectedView = String(
    parsedPreferences.mainPreviewView
      ?? parsedPreferences.main_preview_view
      ?? parsedPreferences.selectedView
      ?? parsedPreferences.selected_view
      ?? payload?.default_view
      ?? payload?.views?.[0]
      ?? ""
  ).trim()
  const directPreviewUrl = resolveRuntimeAssetUrl(String(previewMap[`${selectedColor}::${selectedView}`] || "").trim())
  const fallbackPreviewUrl = resolveRuntimeAssetUrl(String(Object.values(previewMap)[0] || "").trim())
  return {
    previewUrl: directPreviewUrl || fallbackPreviewUrl || selectedTemplate.value?.printConfig?.effectImageBaseUrl?.trim() || "",
    previewViewLabel: selectedView || t("supplierProducts.form.primaryImageDraftLabel"),
  }
}

function resolvePrimaryImageDraftRuntimeSelection(preferencesJson?: string, payload?: TemplateEditorPreviewPayload | null) {
  const parsedPreferences = parseJsonRecord(preferencesJson)
  return {
    selectedColor: String(
      parsedPreferences.selectedColor
        ?? parsedPreferences.selected_color
        ?? payload?.default_color
        ?? payload?.colors?.[0]
        ?? ""
    ).trim(),
    selectedView: String(
      parsedPreferences.mainPreviewView
        ?? parsedPreferences.main_preview_view
        ?? parsedPreferences.selectedView
        ?? parsedPreferences.selected_view
        ?? payload?.default_view
        ?? payload?.views?.[0]
        ?? ""
    ).trim(),
  }
}

function resolveDraftMainPreviewSelection(preferencesJson?: string, payload?: TemplateEditorPreviewPayload | null) {
  const parsedPreferences = parseJsonRecord(preferencesJson)
  const availableColors = payload?.colors || []
  const availableViews = payload?.views || []
  const mainColor = String(
    parsedPreferences.mainPreviewColor
      ?? parsedPreferences.main_preview_color
      ?? parsedPreferences.selectedColor
      ?? parsedPreferences.selected_color
      ?? ""
  ).trim()
  const mainView = String(
    parsedPreferences.mainPreviewView
      ?? parsedPreferences.main_preview_view
      ?? parsedPreferences.selectedView
      ?? parsedPreferences.selected_view
      ?? ""
  ).trim()
  return {
    color: mainColor && availableColors.includes(mainColor)
      ? mainColor
      : (payload?.default_color || availableColors[0] || ""),
    view: mainView && availableViews.includes(mainView)
      ? mainView
      : (payload?.default_view || availableViews[0] || ""),
  }
}

function normalizePrimaryImageResultEntry(value: unknown): PrimaryImageResultEntry | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const raw = value as Record<string, unknown>
  const previewUrl = resolveAssetUrl(String(raw.preview_url || raw.previewUrl || raw.url || raw.download_url || raw.downloadUrl || "").trim())
  if (!previewUrl) {
    return null
  }
  return {
    id: String(raw.id || raw.output_id || raw.outputId || previewUrl).trim(),
    url: previewUrl,
    color: String(raw.color || "").trim(),
    view: String(raw.view || "").trim(),
    size: String(raw.size || raw.output_size || "").trim(),
    createdAt: String(raw.created_at || raw.createdAt || "").trim(),
    source: "saved",
  }
}

function buildPrimaryImageDraftFallbackEntries(
  draft: PrimaryImageDraftEntry,
  payload: TemplateEditorPreviewPayload | null,
): PrimaryImageResultEntry[] {
  const previewMap = payload?.preview_map || {}
  const entries = Object.entries(previewMap).reduce<PrimaryImageResultEntry[]>((collection, [key, value]) => {
    const previewUrl = resolveRuntimeAssetUrl(String(value || "").trim())
    if (!previewUrl) {
      return collection
    }
    const [color = "", view = ""] = key.split("::")
    collection.push({
      id: `live:${draft.id}:${color}:${view}`,
      url: previewUrl,
      color: color.trim(),
      view: view.trim(),
      size: "preview",
      createdAt: draft.updatedAt,
      source: "live",
    })
    return collection
  }, [])
  const preferred = resolvePrimaryImageDraftRuntimeSelection(draft.preferencesJson, payload)
  return entries.sort((left, right) => {
    const leftPreferred = Number(left.color === preferred.selectedColor && left.view === preferred.selectedView)
    const rightPreferred = Number(right.color === preferred.selectedColor && right.view === preferred.selectedView)
    if (leftPreferred !== rightPreferred) {
      return rightPreferred - leftPreferred
    }
    return `${left.color}::${left.view}`.localeCompare(`${right.color}::${right.view}`)
  })
}

function syncPrimaryImageAssetSelection() {
  const currentUrl = explicitPrimaryImageUrl.value
  if (!currentUrl) {
    primaryImageAssetSelectionId.value = ""
    return
  }
  const matchedCell = draftGridCells.value.find((c) => c.entry?.url === currentUrl)
  if (matchedCell?.entry) {
    primaryImageAssetSelectionId.value = matchedCell.entry.id
    return
  }
  const matchedDraftOutput = primaryImageDraftOutputEntries.value.find((item) => item.url === currentUrl)
  if (matchedDraftOutput) {
    primaryImageAssetSelectionId.value = matchedDraftOutput.id
    return
  }
  const matchedDraft = primaryImageDraftEntries.value.find((item) => item.previewUrl === currentUrl)
  if (matchedDraft) {
    primaryImageSelectedDraftId.value = matchedDraft.id
    primaryImageAssetSelectionId.value = ""
    return
  }
  const matchedResult = primaryImageResultEntries.value.find((item) => item.url === currentUrl)
  if (matchedResult) {
    primaryImageAssetSelectionId.value = matchedResult.id
    return
  }
  primaryImageAssetSelectionId.value = ""
}

async function loadPrimaryImageDraftEntries(templateId: string) {
  const query = new URLSearchParams({ template_id: templateId })
  const [payload, response] = await Promise.all([
    ensurePrimaryImageEditorPayload(templateId).catch(() => null),
    gatewayPlatformFetch<{ records?: Array<Record<string, unknown>> }>(
      `/api/v1/preview/drafts?${query.toString()}`,
      { headers: authStore.authHeaders },
    ),
  ])
  const records = Array.isArray(response.records) ? response.records : []
  primaryImageDraftEntries.value = records.map((item) => {
    const preview = resolvePrimaryImageDraftPreview({
      preferencesJson: String(item.preferencesJson || item.preferences_json || ""),
    }, payload)
    return {
      id: String(item.draftId || item.draft_id || "").trim(),
      draftName: String(item.draftName || item.draft_name || "").trim() || t("supplierProducts.form.primaryImageDraftLabel"),
      finishedProductCode: String(item.finishedProductCode || item.finished_product_code || "").trim(),
      previewUrl: preview.previewUrl,
      previewViewLabel: preview.previewViewLabel,
      updatedAt: String(item.updatedAt || item.updated_at || "").trim(),
      designJson: String(item.designJson || item.design_json || ""),
      preferencesJson: String(item.preferencesJson || item.preferences_json || ""),
    }
  }).filter((item) => item.id)
}

async function loadPrimaryImageDraftOutputEntries(templateId: string, draft: PrimaryImageDraftEntry) {
  const query = new URLSearchParams({ template_id: templateId, draft_id: draft.id, limit: "240" })
  const [payload, response] = await Promise.all([
    ensurePrimaryImageEditorPayload(templateId).catch(() => null),
    gatewayPlatformFetch<{ records?: Array<Record<string, unknown>> }>(
      `/api/v1/preview/outputs?${query.toString()}`,
      { headers: authStore.authHeaders },
    ),
  ])
  const colors = payload?.colors?.length ? payload.colors : [payload?.default_color || ""].filter(Boolean)
  const views = payload?.views?.length ? payload.views : [payload?.default_view || ""].filter(Boolean)

  const records = Array.isArray(response.records) ? response.records : []
  const savedEntries = records
    .map((item) => normalizePrimaryImageResultEntry(item))
    .filter((item): item is PrimaryImageResultEntry => Boolean(item))

  const savedMap = new Map<string, PrimaryImageResultEntry>()
  for (const entry of savedEntries) {
    savedMap.set(`${entry.color}::${entry.view}`, entry)
  }

  const allCells: DraftGridCell[] = []
  for (const color of colors) {
    for (const view of views) {
      const saved = savedMap.get(`${color}::${view}`)
      allCells.push({
        color,
        view,
        entry: saved || null,
        status: saved ? "done" : "idle",
      })
    }
  }

  draftGridCells.value = allCells
  primaryImageDraftOutputEntries.value = allCells.filter((c) => c.status === "done" && c.entry).map((c) => c.entry!)
  if (!draftSelectedColor.value || !colors.includes(draftSelectedColor.value)) {
    draftSelectedColor.value = colors[0] || ""
  }
  const mainSelection = resolveDraftMainPreviewSelection(draft.preferencesJson, payload)
  draftMainPreviewColor.value = mainSelection.color
  draftMainPreviewView.value = mainSelection.view
}

function buildPreviewUrlForDraft(draft: PrimaryImageDraftEntry, color: string, view: string) {
  const templateId = form.templateId.trim()
  if (!templateId) return ""
  const params = new URLSearchParams({
    template_id: templateId,
    source: "center",
  })
  if (draft.id) params.set("draft_id", draft.id)
  if (color) params.set("preview_color", color)
  if (view) params.set("preview_view", view)
  return `${window.location.origin}/preview?${params.toString()}`
}

async function renderDraftGridCell(draft: PrimaryImageDraftEntry, color: string, view: string) {
  const templateId = form.templateId.trim()
  if (!templateId) return

  const cellIndex = draftGridCells.value.findIndex((c) => c.color === color && c.view === view)
  if (cellIndex === -1) return

  const cell = draftGridCells.value[cellIndex]
  if (cell.status === "loading" || cell.status === "done") return

  // 蒙版渲染需要 canvas 上传 design 各部分图层；ERP 弹窗无 canvas，
  // 因此跳转到 Preview 页面让用户完成首次渲染（生成的图通过后端持久化，
  // 关闭后回到 ERP 弹窗刷新即可看到新图）。
  const url = buildPreviewUrlForDraft(draft, color, view)
  if (!url) return
  window.open(url, "_blank", "noopener")
}

function renderAllDraftGridCells(draft: PrimaryImageDraftEntry) {
  const url = buildPreviewUrlForDraft(draft, "", "")
  if (!url) return
  window.open(url, "_blank", "noopener")
}

async function loadPrimaryImageResultEntries(templateId: string) {
  const query = new URLSearchParams({ template_id: templateId, limit: "120" })
  const response = await gatewayPlatformFetch<{ records?: Array<Record<string, unknown>> }>(
    `/api/v1/preview/outputs?${query.toString()}`,
    { headers: authStore.authHeaders },
  )
  const records = Array.isArray(response.records) ? response.records : []
  primaryImageResultEntries.value = records
    .map((item) => normalizePrimaryImageResultEntry(item))
    .filter((item): item is PrimaryImageResultEntry => Boolean(item))
}

async function selectPrimaryImageDraft(draftId: string) {
  const normalizedDraftId = String(draftId || "").trim()
  primaryImageSelectedDraftId.value = normalizedDraftId
  primaryImageAssetSelectionId.value = ""
  primaryImageAssetSelectionIds.value = new Set()
  assetDraftOutputPage.value = 1
  draftSelectedColor.value = ""
  draftMainPreviewColor.value = ""
  draftMainPreviewView.value = ""
  if (!normalizedDraftId || !form.templateId.trim()) {
    primaryImageDraftOutputEntries.value = []
    draftGridCells.value = []
    return
  }
  const draft = primaryImageDraftEntries.value.find((item) => item.id === normalizedDraftId)
  if (!draft) {
    primaryImageDraftOutputEntries.value = []
    draftGridCells.value = []
    return
  }
  primaryImageAssetLoading.value = true
  primaryImageAssetError.value = ""
  try {
    await loadPrimaryImageDraftOutputEntries(form.templateId.trim(), draft)
    syncPrimaryImageAssetSelection()
  } catch (error) {
    primaryImageDraftOutputEntries.value = []
    draftGridCells.value = []
    primaryImageAssetError.value = error instanceof Error ? error.message : String(error)
  } finally {
    primaryImageAssetLoading.value = false
  }
}

async function refreshPrimaryImageAssets(targetTab = primaryImageAssetTab.value) {
  const templateId = form.templateId.trim()
  if (!templateId) {
    primaryImageAssetError.value = t("supplierProducts.form.primaryImageTemplateRequiredHint")
    return
  }
  primaryImageAssetLoading.value = true
  primaryImageAssetError.value = ""
  try {
    if (targetTab === "drafts") {
      await loadPrimaryImageDraftEntries(templateId)
      if (!primaryImageDraftEntries.value.length) {
        primaryImageSelectedDraftId.value = ""
        primaryImageDraftOutputEntries.value = []
      } else {
        const nextDraftId = primaryImageDraftEntries.value.some((item) => item.id === primaryImageSelectedDraftId.value)
          ? primaryImageSelectedDraftId.value
          : primaryImageDraftEntries.value[0].id
        primaryImageSelectedDraftId.value = nextDraftId
        await loadPrimaryImageDraftOutputEntries(
          templateId,
          primaryImageDraftEntries.value.find((item) => item.id === nextDraftId)!,
        )
      }
    } else {
      await loadPrimaryImageResultEntries(templateId)
    }
    syncPrimaryImageAssetSelection()
  } catch (error) {
    primaryImageAssetError.value = error instanceof Error ? error.message : String(error)
  } finally {
    primaryImageAssetLoading.value = false
  }
}

async function openPrimaryImageAssetPicker(tab: PrimaryImageAssetTab) {
  if (!form.templateId.trim()) {
    activeTab.value = "basic"
    formError.value = t("supplierProducts.validation.templateRequired")
    return
  }
  primaryImageAssetTab.value = tab
  primaryImageAssetModalOpen.value = true
  primaryImageAssetSelectionId.value = ""
  primaryImageAssetSelectionIds.value = new Set()
  assetDraftOutputPage.value = 1
  assetResultPage.value = 1
  await refreshPrimaryImageAssets(tab)
}

async function selectPrimaryImageAssetTab(tab: PrimaryImageAssetTab) {
  if (primaryImageAssetTab.value === tab) {
    return
  }
  primaryImageAssetTab.value = tab
  primaryImageAssetSelectionId.value = ""
  primaryImageAssetSelectionIds.value = new Set()
  assetDraftOutputPage.value = 1
  assetResultPage.value = 1
  await refreshPrimaryImageAssets(tab)
}

function toggleAssetSelection(id: string) {
  const next = new Set(primaryImageAssetSelectionIds.value)
  if (next.has(id)) {
    next.delete(id)
    primaryImageAssetSelectionIds.value = next
    if (primaryImageAssetSelectionId.value === id) {
      primaryImageAssetSelectionId.value = ""
    }
  } else {
    next.add(id)
    primaryImageAssetSelectionIds.value = next
    primaryImageAssetSelectionId.value = id
  }
}

function selectAllCurrentPageAssets() {
  const pool = primaryImageAssetTab.value === "drafts"
    ? pagedDraftGridCells.value.filter((c) => c.status === "done" && c.entry).map((c) => c.entry!)
    : pagedResultEntries.value
  const next = new Set(primaryImageAssetSelectionIds.value)
  pool.forEach((item) => next.add(item.id))
  primaryImageAssetSelectionIds.value = next
}

function deselectAllAssets() {
  primaryImageAssetSelectionIds.value = new Set()
  primaryImageAssetSelectionId.value = ""
}

function formatAssetDate(value: string) {
  const ts = Date.parse(value || "")
  if (!ts) return ""
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function colorSwatch(color: string) {
  const trimmed = String(color || "").trim()
  const compact = trimmed.toLowerCase().replace(/[\s_-]+/g, "")
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return trimmed
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)) return trimmed
  if (typeof CSS !== "undefined" && CSS.supports("color", trimmed)) return trimmed
  const map: Record<string, string> = {
    white: "#ffffff", black: "#000000", red: "#ef4444", blue: "#3b82f6",
    green: "#22c55e", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
    pink: "#ec4899", gray: "#6b7280", grey: "#6b7280", brown: "#92400e",
    navy: "#1e3a8a", teal: "#14b8a6", cyan: "#06b6d4", indigo: "#6366f1",
    lightblue: "#60a5fa", darkblue: "#1d4ed8", lightgray: "#d1d5db", darkgray: "#4b5563",
    beige: "#d4b483", cream: "#fefce8", khaki: "#bdb76b", olive: "#6b7c3f",
    silver: "#c0c0c0", gold: "#fbbf24", rose: "#f43f5e", sky: "#0ea5e9",
  }
  return map[compact] || "#9ca3af"
}

function applySelectedPrimaryImageAsset() {
  const assets = selectedPrimaryImageAssets.value
  if (!assets.length) {
    return
  }
  const source = primaryImageAssetTab.value === "drafts" ? "draft" : "result"
  assets.forEach((asset, index) => {
    upsertProductImage(asset.url, source, {
      makePrimary: index === 0 && !productImageItems.value.length,
    })
  })
  primaryImageSelectionSource.value = source
  primaryImageAssetModalOpen.value = false
  formError.value = ""
}

function resolveEffectiveDeliveryTimeText() {
  return form.deliveryTimeText.trim() || String(form.deliveryDays || "").trim()
}

function resolveEffectiveMaterialTextEn() {
  return form.materialTextEn.trim() || form.materialText.trim()
}

function resolveVariantSku(row: ProductMatrixRow, index: number) {
  const rowSku = row.sku.trim()
  const seed = resolveEffectiveProductSku() || form.finishedProductCode.trim() || "SKU"
  if (!rowSku || rowSku.startsWith("SKU-")) {
    return `${seed}-${String(index + 1).padStart(2, "0")}`
  }
  return rowSku
}

function createDefaultForm(): ProductFormMeta {
  return {
    templateId: "",
    finishedProductCode: "",
    productName: "",
    productNameEn: "",
    description: "",
    productSku: "",
    productType: "finished_goods",
    status: "draft",
    defaultCurrency: "USD",
    categoryId: "",
    supplierName: role.value === "platform_admin"
      ? t("supplierProducts.form.platformAdmin")
      : t("supplierProducts.form.supplierWorkspace"),
    supplierSku: "",
    supplierSourceUrl: "",
    primaryImageUrl: "",
    deliveryDays: 3,
    deliveryTimeText: "",
    materialText: "",
    materialTextEn: "",
    qualityGrade: "A",
    targetAudience: "",
    craftsmanship: "",
    salesUnit: t("supplierProducts.shared.pieceUnit"),
    packageUnit: t("supplierProducts.shared.pieceUnit"),
    declarationUnit: "pcs",
    colorOptionsText: "",
    sizeOptionsText: "",
    customSpecName: "",
    customSpecOptionsText: "",
    weightUnit: "g",
    dimensionUnit: "cm",
  }
}

function createDefaultRow(index = 0, partial?: Partial<ProductMatrixRow>): ProductMatrixRow {
  return {
    key: partial?.key || `default-${index}`,
    color: partial?.color || t("supplierProducts.form.defaultColor"),
    size: partial?.size || t("supplierProducts.form.defaultSpec"),
    customValue: partial?.customValue || "",
    label: partial?.label || t("supplierProducts.form.defaultSpec"),
    sku: partial?.sku || buildDefaultSku(index),
    purchasePrice: partial?.purchasePrice ?? 0,
    retailPrice: partial?.retailPrice ?? 0,
    minimumOrderQuantity: partial?.minimumOrderQuantity ?? 0,
    packageWeight: partial?.packageWeight ?? 0,
    length: partial?.length ?? 0,
    width: partial?.width ?? 0,
    height: partial?.height ?? 0,
    declaredName: partial?.declaredName || "",
    declaredNameEn: partial?.declaredNameEn || "",
    hsCode: partial?.hsCode || "",
    specialTransportTag: partial?.specialTransportTag || "",
    declaredValue: partial?.declaredValue ?? 0,
    declaredCurrency: partial?.declaredCurrency || "USD",
    originCountry: partial?.originCountry || "CN",
    declarationMaterial: partial?.declarationMaterial || "",
    declarationUsage: partial?.declarationUsage || "",
    wholesaleMinQuantity: partial?.wholesaleMinQuantity ?? 0,
    wholesalePrice: partial?.wholesalePrice ?? 0,
    privateTierName: partial?.privateTierName || t("supplierProducts.form.vipTier"),
    privateMinQuantity: partial?.privateMinQuantity ?? 0,
    privatePrice: partial?.privatePrice ?? 0,
    privateNote: partial?.privateNote || "",
  }
}

function buildDefaultSku(index: number) {
  const seed = (form.productSku || form.finishedProductCode || "SKU").trim() || "SKU"
  return `${seed}-${String(index + 1).padStart(2, "0")}`
}

function splitTextOptions(rawValue: string) {
  return rawValue
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeSpecValue(value: string, fallback: string) {
  const trimmed = value.trim()
  return trimmed || fallback
}

function buildRowLabel(color: string, size: string, customValue: string) {
  return [color, size, customValue].filter(Boolean).join(" / ") || t("supplierProducts.form.defaultSpec")
}

function buildRowKey(color: string, size: string, customValue: string) {
  return [color || "default-color", size || "default-size", customValue || "default-custom"]
    .map((item) => item.replace(/\s+/g, "_"))
    .join("__")
}

function rebuildMatrixRows(preserveExisting = true) {
  const currentMap = new Map(matrixRows.value.map((row) => [row.key, row]))
  const colors = splitTextOptions(form.colorOptionsText)
  const sizes = splitTextOptions(form.sizeOptionsText)
  const customs = splitTextOptions(form.customSpecOptionsText)
  const normalizedColors = colors.length ? colors : [t("supplierProducts.form.defaultColor")]
  const normalizedSizes = sizes.length ? sizes : [t("supplierProducts.form.defaultSpec")]
  const normalizedCustoms = form.customSpecName.trim()
    ? (customs.length ? customs : [t("supplierProducts.form.defaultCustomValue")])
    : [""]
  const nextRows: ProductMatrixRow[] = []

  normalizedColors.forEach((color) => {
    normalizedSizes.forEach((size) => {
      normalizedCustoms.forEach((customValue) => {
        const normalizedColor = normalizeSpecValue(color, t("supplierProducts.form.defaultColor"))
        const normalizedSize = normalizeSpecValue(size, t("supplierProducts.form.defaultSpec"))
        const normalizedCustom = normalizeSpecValue(customValue, "")
        const key = buildRowKey(normalizedColor, normalizedSize, normalizedCustom)
        const previous = preserveExisting ? currentMap.get(key) : null
        nextRows.push(createDefaultRow(nextRows.length, {
          ...previous,
          key,
          color: normalizedColor,
          size: normalizedSize,
          customValue: normalizedCustom,
          label: buildRowLabel(normalizedColor, normalizedSize, normalizedCustom),
          sku: previous?.sku || buildDefaultSku(nextRows.length),
        }))
      })
    })
  })

  matrixRows.value = nextRows.length ? nextRows : [createDefaultRow()]
}

function collectDetailMap(detailFields?: ErpProductDetailField[]) {
  const output = new Map<string, string>()
  for (const item of detailFields || []) {
    output.set(item.label, item.value)
  }
  return output
}

function parseNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseVariantMeta(attributesJson?: string) {
  if (!attributesJson?.trim()) {
    return {}
  }
  try {
    const parsed = JSON.parse(attributesJson)
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, any> : {}
  } catch {
    return {}
  }
}

function parsePackagingDimension(value?: string, unitFallback = "cm") {
  const normalized = String(value || "")
    .replace(new RegExp(`\\s*${unitFallback}$`, "i"), "")
    .trim()
  const parts = normalized
    .split("*")
    .map((item) => parseNumber(item.trim()))
  return {
    length: parts[0] || 0,
    width: parts[1] || 0,
    height: parts[2] || 0,
  }
}

function resolveWeightFromDetail(detail: ErpProductDetail) {
  if ((detail.packagingWeightGram ?? 0) > 0) {
    return { unit: "g" as const, value: Number(detail.packagingWeightGram || 0) }
  }
  if ((detail.packagingWeightLb ?? 0) > 0) {
    return { unit: "lb" as const, value: Number(detail.packagingWeightLb || 0) }
  }
  return { unit: "g" as const, value: 0 }
}

function syncFormFromDetail(detail: ErpProductDetail) {
  const detailMap = collectDetailMap(detail.productDetails)
  const packagingMap = new Map((detail.packagingSpecRows || []).map((item) => [item.sizeLabel, item]))
  const weightFromDetail = resolveWeightFromDetail(detail)
  const customSpecOptions = detailMap.get(PRODUCT_DETAIL_LABELS.customSpecValues) || ""
  const rows = detail.variants.map((variant, index) => {
    const meta = parseVariantMeta(variant.attributesJson)
    const variantKey = String(meta.variantKey || packagingMap.get(variant.variantName)?.sizeLabel || `row-${index}`)
    const packaging = packagingMap.get(variantKey)
    const packagingMetric = form.dimensionUnit === "cm"
      ? parsePackagingDimension(packaging?.packagingSizeCm, "cm")
      : parsePackagingDimension(packaging?.packagingSizeInch, "in")
    const logistics = meta.logistics || {}
    const wholesale = meta.wholesale || {}
    const privatePrice = meta.privatePrice || {}
    return createDefaultRow(index, {
      key: variantKey,
      color: String(meta.color || t("supplierProducts.form.defaultColor")),
      size: String(meta.size || t("supplierProducts.form.defaultSpec")),
      customValue: String(meta.customValue || ""),
      label: variant.variantName || buildRowLabel(String(meta.color || ""), String(meta.size || ""), String(meta.customValue || "")),
      sku: variant.sku,
      purchasePrice: parseNumber(meta.purchasePrice),
      retailPrice: parseNumber(variant.retailPriceAmount),
      minimumOrderQuantity: parseNumber(meta.minimumOrderQuantity ?? meta.moq),
      packageWeight: form.weightUnit === "g"
        ? parseNumber(packaging?.packingWeightGram ?? meta.packaging?.weight)
        : parseNumber(packaging?.packageWeightLb ?? meta.packaging?.weight),
      length: packagingMetric.length,
      width: packagingMetric.width,
      height: packagingMetric.height,
      declaredName: String(logistics.declaredNameCn || logistics.declaredName || ""),
      declaredNameEn: String(logistics.declaredNameEn || ""),
      hsCode: String(logistics.hsCode || ""),
      specialTransportTag: String(logistics.specialTransportTag || ""),
      declaredValue: parseNumber(logistics.declaredValue),
      declaredCurrency: String(logistics.declaredCurrency || detail.defaultCurrency || "USD"),
      originCountry: String(logistics.originCountry || "CN"),
      declarationMaterial: String(logistics.material || ""),
      declarationUsage: String(logistics.usage || ""),
      wholesaleMinQuantity: parseNumber(wholesale.minQuantity),
      wholesalePrice: parseNumber(wholesale.price),
      privateTierName: String(privatePrice.tierName || t("supplierProducts.form.vipTier")),
      privateMinQuantity: parseNumber(privatePrice.minQuantity),
      privatePrice: parseNumber(privatePrice.price),
      privateNote: String(privatePrice.note || ""),
    })
  })

  form.productId = detail.productId
  form.templateId = detail.templateBinding?.templateId || form.templateId
  form.finishedProductCode = detail.finishedProductCode || ""
  form.productName = detail.productName || ""
  form.productNameEn = detail.productNameEn || ""
  form.description = detailMap.get(PRODUCT_DETAIL_LABELS.description) || ""
  form.productSku = detail.productSku || ""
  form.productType = detail.productType || "finished_goods"
  form.status = detail.status || "draft"
  form.defaultCurrency = detail.defaultCurrency || "USD"
  form.categoryId = detail.categoryId || ""
  form.supplierName = detail.workflow?.supplierName || form.supplierName
  form.supplierSku = detail.workflow?.supplierSku || detail.productSku || ""
  form.supplierSourceUrl = detail.workflow?.supplierSourceUrl || ""
  const normalizedImages = (detail.images || [])
    .slice()
    .sort((left, right) => {
      const primaryDiff = Number(right.primary) - Number(left.primary)
      if (primaryDiff !== 0) {
        return primaryDiff
      }
      return Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    })
    .map((item, index) => ({
      id: item.imageId || `saved:${item.imageUrl}:${index}`,
      imageUrl: String(item.imageUrl || "").trim(),
      altText: String(item.altText || "").trim()
        || `${detail.productName || t("supplierProducts.form.defaultProductName")} ${t("supplierProducts.form.primaryImageAlt")}`,
      sortOrder: Number(item.sortOrder || index),
      primary: Boolean(item.primary) || index === 0,
      source: "manual" as const,
    }))
    .filter((item) => item.imageUrl)
  productImageItems.value = normalizedImages.length
    ? normalizedImages
    : (detail.primaryImageUrl
        ? [buildProductImageFormItem(detail.primaryImageUrl, "manual")]
        : [])
  syncProductImagePrimaryState()
  primaryImageSelectionSource.value = ""
  primaryImageAssetSelectionId.value = ""
  form.deliveryDays = Number(detail.deliveryDays || 3)
  form.deliveryTimeText = detail.deliveryTimeText || ""
  form.materialText = detail.materialText || ""
  form.materialTextEn = detail.materialTextEn || ""
  form.qualityGrade = detailMap.get(PRODUCT_DETAIL_LABELS.qualityGrade) || "A"
  form.targetAudience = detailMap.get(PRODUCT_DETAIL_LABELS.targetAudience) || ""
  form.craftsmanship = detailMap.get(PRODUCT_DETAIL_LABELS.craftsmanship) || ""
  form.salesUnit = detailMap.get(PRODUCT_DETAIL_LABELS.salesUnit) || t("supplierProducts.shared.pieceUnit")
  form.packageUnit = detailMap.get(PRODUCT_DETAIL_LABELS.packageUnit) || t("supplierProducts.shared.pieceUnit")
  form.declarationUnit = detailMap.get(PRODUCT_DETAIL_LABELS.declarationUnit) || "pcs"
  form.colorOptionsText = (detail.colorOptions || []).join(", ")
  form.sizeOptionsText = (detail.sizeOptions || []).join(", ")
  form.customSpecName = detailMap.get(PRODUCT_DETAIL_LABELS.customSpecName) || ""
  form.customSpecOptionsText = customSpecOptions
  form.weightUnit = weightFromDetail.unit
  form.dimensionUnit = (detail.packagingSpecRows || []).some((item) => item.packagingSizeInch?.trim())
    && !(detail.packagingSpecRows || []).some((item) => item.packagingSizeCm?.trim())
    ? "in"
    : "cm"
  matrixRows.value = rows.length ? rows : [createDefaultRow()]
}

function resetForm() {
  Object.assign(form, createDefaultForm())
  form.templateId = routeTemplateId.value
  form.productId = undefined
  selectedTemplate.value = null
  templatePickerSelectionId.value = routeTemplateId.value
  templatePickerKeyword.value = ""
  templatePickerOpen.value = false
  formError.value = ""
  formSuccess.value = ""
  activeTab.value = "basic"
  matrixRows.value = [createDefaultRow()]
  productImageItems.value = []
  primaryImageSelectionSource.value = ""
  clearPrimaryImageAssetState()
}

function formatNumber(value: number, digits = 2) {
  return Number(value || 0).toFixed(digits)
}

function formatInlineList(items: string[]) {
  return items.join(locale.value === "zh" ? "、" : ", ")
}

function convertWeight(value: number, nextUnit: "g" | "lb") {
  const numeric = parseNumber(value)
  if (nextUnit === form.weightUnit) {
    return numeric
  }
  if (nextUnit === "lb") {
    return Number((numeric / 453.59237).toFixed(2))
  }
  return Number((numeric * 453.59237).toFixed(2))
}

function convertDimension(value: number, nextUnit: "cm" | "in") {
  const numeric = parseNumber(value)
  if (nextUnit === form.dimensionUnit) {
    return numeric
  }
  if (nextUnit === "in") {
    return Number((numeric / 2.54).toFixed(2))
  }
  return Number((numeric * 2.54).toFixed(2))
}

function switchWeightUnit(nextUnit: "g" | "lb") {
  if (nextUnit === form.weightUnit) {
    return
  }
  matrixRows.value = matrixRows.value.map((row) => ({
    ...row,
    packageWeight: convertWeight(row.packageWeight, nextUnit),
  }))
  form.weightUnit = nextUnit
}

function switchDimensionUnit(nextUnit: "cm" | "in") {
  if (nextUnit === form.dimensionUnit) {
    return
  }
  matrixRows.value = matrixRows.value.map((row) => ({
    ...row,
    length: convertDimension(row.length, nextUnit),
    width: convertDimension(row.width, nextUnit),
    height: convertDimension(row.height, nextUnit),
  }))
  form.dimensionUnit = nextUnit
}

function applyBatchValues(fields: Array<keyof ProductMatrixRow>, values: Partial<ProductMatrixRow>) {
  matrixRows.value = matrixRows.value.map((row) => {
    const nextRow = { ...row }
    fields.forEach((field) => {
      const incoming = values[field]
      if (incoming !== undefined) {
        nextRow[field] = incoming as never
      }
    })
    return nextRow
  })
}

function ensureSpecRows() {
  if (!matrixRows.value.length) {
    rebuildMatrixRows()
  }
}

function validateNonNegativeRows() {
  const duplicateSkus = new Set<string>()
  for (const row of matrixRows.value) {
    if (!row.sku.trim()) {
      return t("supplierProducts.validation.rowSkuRequired")
    }
    const normalizedSku = row.sku.trim().toUpperCase()
    if (duplicateSkus.has(normalizedSku)) {
      return t("supplierProducts.validation.rowSkuDuplicate")
    }
    duplicateSkus.add(normalizedSku)
    const numericFields: Array<[string, number]> = [
      [t("supplierProducts.validation.purchasePrice"), row.purchasePrice],
      [t("supplierProducts.validation.retailPrice"), row.retailPrice],
      [t("supplierProducts.validation.minimumOrderQuantity"), row.minimumOrderQuantity],
      [t("supplierProducts.validation.packageWeight"), row.packageWeight],
      [t("supplierProducts.validation.length"), row.length],
      [t("supplierProducts.validation.width"), row.width],
      [t("supplierProducts.validation.height"), row.height],
      [t("supplierProducts.validation.declaredValue"), row.declaredValue],
      [t("supplierProducts.validation.wholesaleMinQuantity"), row.wholesaleMinQuantity],
      [t("supplierProducts.validation.wholesalePrice"), row.wholesalePrice],
      [t("supplierProducts.validation.privateMinQuantity"), row.privateMinQuantity],
      [t("supplierProducts.validation.privatePrice"), row.privatePrice],
    ]
    for (const [label, value] of numericFields) {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) {
        return t("supplierProducts.validation.rowNumberNonNegative", { row: row.label, label })
      }
    }
  }
  return ""
}

function validateForm() {
  if (!form.templateId.trim()) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.templateRequired")
  }
  if (selectedTemplateConflict.value) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.templateConflict", { name: selectedTemplateConflict.value.productName })
  }
  if (!form.finishedProductCode.trim()) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.finishedCodeRequired")
  }
  if (!form.productName.trim()) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.productNameRequired")
  }
  if (!resolveEffectiveProductSku()) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.skuRequired")
  }
  if (!form.categoryId.trim()) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.categoryRequired")
  }
  if (!resolveEffectivePrimaryImageUrl()) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.imageRequired")
  }
  if (!colorOptions.value.length) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.colorRequired")
  }
  if (!sizeOptions.value.length) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.sizeRequired")
  }
  ensureSpecRows()
  if (!matrixRows.value.length) {
    activeTab.value = "basic"
    return t("supplierProducts.validation.matrixRequired")
  }
  return validateNonNegativeRows()
}

function buildProductDetailsPayload(): ErpProductDetailField[] {
  const details: ErpProductDetailField[] = [
    { label: PRODUCT_DETAIL_LABELS.description, value: form.description.trim() },
    { label: PRODUCT_DETAIL_LABELS.qualityGrade, value: form.qualityGrade.trim() },
    { label: PRODUCT_DETAIL_LABELS.targetAudience, value: form.targetAudience.trim() },
    { label: PRODUCT_DETAIL_LABELS.craftsmanship, value: form.craftsmanship.trim() },
    { label: PRODUCT_DETAIL_LABELS.salesUnit, value: form.salesUnit.trim() },
    { label: PRODUCT_DETAIL_LABELS.packageUnit, value: form.packageUnit.trim() },
    { label: PRODUCT_DETAIL_LABELS.declarationUnit, value: form.declarationUnit.trim() },
    { label: PRODUCT_DETAIL_LABELS.customSpecName, value: form.customSpecName.trim() },
    { label: PRODUCT_DETAIL_LABELS.customSpecValues, value: splitTextOptions(form.customSpecOptionsText).join(", ") },
  ]
  return details.filter((item) => item.value)
}

function buildPackagingValue(length: number, width: number, height: number, unit: "cm" | "in") {
  return `${formatNumber(length)} * ${formatNumber(width)} * ${formatNumber(height)} ${unit}`
}

function buildPackagingVolume(length: number, width: number, height: number) {
  return formatNumber(length * width * height, 2)
}

function resolveRowVolume(row: ProductMatrixRow) {
  const unit = form.dimensionUnit === "cm" ? "cm3" : "in3"
  return `${buildPackagingVolume(row.length, row.width, row.height)} ${unit}`
}

function normalizePayload(): ErpProductSaveRequest {
  ensureSpecRows()
  const colors = splitTextOptions(form.colorOptionsText)
  const sizes = splitTextOptions(form.sizeOptionsText)
  const minPurchasePrice = matrixRows.value.length
    ? Math.min(...matrixRows.value.map((row) => Number(row.purchasePrice || 0)))
    : 0
  const minPackageWeight = matrixRows.value.length
    ? Math.min(...matrixRows.value.map((row) => Number(row.packageWeight || 0)))
    : 0
  const primaryImageUrl = resolveEffectivePrimaryImageUrl()
  const productSku = resolveEffectiveProductSku()
  const supplierSku = resolveEffectiveSupplierSku()
  const templateName = selectedTemplate.value?.templateName || boundTemplatePickerEntry.value?.templateName || form.templateId.trim()
  const templateSource = boundTemplatePickerEntry.value?.templateSource || "platform"
  const templateCoverUrl = selectedTemplate.value?.printConfig?.effectImageBaseUrl?.trim()
    || (boundTemplatePickerEntry.value ? resolveTemplatePreviewUrl(boundTemplatePickerEntry.value) : "")

  return {
    productId: form.productId,
    templateId: form.templateId.trim(),
    templateName,
    templateSource,
    templateCoverUrl,
    finishedProductCode: form.finishedProductCode.trim(),
    productName: form.productName.trim(),
    productNameEn: form.productNameEn.trim() || form.productName.trim(),
    productSku,
    productType: form.productType.trim(),
    status: form.status.trim(),
    defaultCurrency: form.defaultCurrency.trim(),
    categoryId: form.categoryId.trim(),
    supplierName: form.supplierName.trim(),
    supplierSku,
    supplierSourceUrl: form.supplierSourceUrl.trim(),
    purchasePrice: Number(minPurchasePrice.toFixed(2)),
    packagingWeightGram: form.weightUnit === "g"
      ? Number(minPackageWeight.toFixed(2))
      : Number((minPackageWeight * 453.59237).toFixed(2)),
    packagingWeightLb: form.weightUnit === "lb"
      ? Number(minPackageWeight.toFixed(2))
      : Number((minPackageWeight / 453.59237).toFixed(2)),
    deliveryDays: Number(form.deliveryDays || 0),
    deliveryTimeText: resolveEffectiveDeliveryTimeText(),
    materialText: form.materialText.trim(),
    materialTextEn: resolveEffectiveMaterialTextEn(),
    supportPlatforms: ["TEMU", "JIT"],
    colorOptions: colors,
    sizeOptions: sizes.length ? sizes : [t("supplierProducts.form.defaultSpec")],
    productDetails: buildProductDetailsPayload(),
    productSizeRows: matrixRows.value.map((row) => ({
      sizeLabel: row.label,
      dimensionLabel: form.customSpecName.trim() && row.customValue
        ? `${form.customSpecName.trim()} | ${row.customValue}`
        : row.size,
    })),
    packagingSpecRows: matrixRows.value.map((row) => {
      const lengthCm = form.dimensionUnit === "cm" ? row.length : Number((row.length * 2.54).toFixed(2))
      const widthCm = form.dimensionUnit === "cm" ? row.width : Number((row.width * 2.54).toFixed(2))
      const heightCm = form.dimensionUnit === "cm" ? row.height : Number((row.height * 2.54).toFixed(2))
      const lengthIn = form.dimensionUnit === "in" ? row.length : Number((row.length / 2.54).toFixed(2))
      const widthIn = form.dimensionUnit === "in" ? row.width : Number((row.width / 2.54).toFixed(2))
      const heightIn = form.dimensionUnit === "in" ? row.height : Number((row.height / 2.54).toFixed(2))
      const weightGram = form.weightUnit === "g" ? row.packageWeight : Number((row.packageWeight * 453.59237).toFixed(2))
      const weightLb = form.weightUnit === "lb" ? row.packageWeight : Number((row.packageWeight / 453.59237).toFixed(2))
      return {
        sizeLabel: row.key,
        packagingSizeCm: buildPackagingValue(lengthCm, widthCm, heightCm, "cm"),
        packagingSizeInch: buildPackagingValue(lengthIn, widthIn, heightIn, "in"),
        packagingVolumeCm: buildPackagingVolume(lengthCm, widthCm, heightCm),
        packagingVolumeInch: buildPackagingVolume(lengthIn, widthIn, heightIn),
        packingWeightGram: formatNumber(weightGram),
        packageWeightLb: formatNumber(weightLb),
      }
    }),
    primaryImageUrl,
    variants: matrixRows.value.map((row, index) => ({
      sku: resolveVariantSku(row, index),
      variantName: row.label,
      status: "active",
      attributesJson: JSON.stringify({
        variantKey: row.key,
        color: row.color,
        size: row.size,
        customSpecName: form.customSpecName.trim(),
        customValue: row.customValue,
        purchasePrice: row.purchasePrice,
        minimumOrderQuantity: row.minimumOrderQuantity,
        packaging: {
          weight: row.packageWeight,
          weightUnit: form.weightUnit,
          length: row.length,
          width: row.width,
          height: row.height,
          dimensionUnit: form.dimensionUnit,
          packageUnit: form.packageUnit.trim(),
        },
        logistics: {
          declaredName: row.declaredName,
          declaredNameCn: row.declaredName,
          declaredNameEn: row.declaredNameEn,
          hsCode: row.hsCode,
          specialTransportTag: row.specialTransportTag,
          declaredValue: row.declaredValue,
          declaredCurrency: row.declaredCurrency,
          declarationUnit: form.declarationUnit.trim(),
          originCountry: row.originCountry,
          material: row.declarationMaterial,
          usage: row.declarationUsage,
        },
        wholesale: {
          minQuantity: row.wholesaleMinQuantity,
          price: row.wholesalePrice,
          currency: form.defaultCurrency.trim(),
        },
        privatePrice: {
          tierName: row.privateTierName,
          minQuantity: row.privateMinQuantity,
          price: row.privatePrice,
          currency: form.defaultCurrency.trim(),
          note: row.privateNote,
        },
      }),
      retailPriceAmount: Number(row.retailPrice || 0),
    })),
    images: productImageItems.value.length
      ? productImageItems.value.map((item, index) => ({
          imageId: item.id,
          imageUrl: item.imageUrl,
          altText: item.altText,
          sortOrder: index,
          primary: index === 0,
        }))
      : (primaryImageUrl
          ? [{
              imageUrl: primaryImageUrl,
              altText: `${form.productName.trim() || t("supplierProducts.form.defaultProductName")} ${t("supplierProducts.form.primaryImageAlt")}`,
              sortOrder: 0,
              primary: true,
            }]
          : []),
  }
}

function resolveServerOrLocalLabel(key: string, fallback?: string) {
  if (prefersServerLabels.value && fallback?.trim()) {
    return fallback.trim()
  }
  return t(key)
}

function resolveTemplateReviewStatusLabel(status?: string, fallback?: string) {
  const normalized = String(status || "").trim()
  if (normalized) {
    return resolveServerOrLocalLabel(`supplierProducts.status.templateReview.${normalized}`, fallback)
  }
  if (fallback?.trim()) {
    return fallback.trim()
  }
  return t("supplierProducts.shared.notReturned")
}

function resolveTemplateSupplierStatusLabel(status?: string, fallback?: string) {
  const normalized = String(status || "").trim()
  if (normalized) {
    return resolveServerOrLocalLabel(`supplierProducts.status.supplier.${normalized}`, fallback)
  }
  if (fallback?.trim()) {
    return fallback.trim()
  }
  return t("supplierProducts.shared.notReturned")
}

function resolveVisibilityScopeLabel(scope?: string) {
  const normalized = String(scope || "").trim()
  if (!normalized) {
    return t("supplierProducts.status.visibilityScope.default")
  }
  return t(`supplierProducts.status.visibilityScope.${normalized}`)
}

function resolvePermissionStatusLabel(status?: string) {
  const normalized = String(status || "").trim()
  if (!normalized) {
    return t("supplierProducts.status.permissionStatus.default")
  }
  return t(`supplierProducts.status.permissionStatus.${normalized}`)
}

async function loadTemplateOptions() {
  templateLoading.value = true
  try {
    await templateStore.load()
    const tenantId = String(tenant.value?.tenant_id || "").trim()
    const tenantWorkspaceTemplates = templateStore.items.filter((item) => {
      const ownerTenantId = String(item.owner_tenant_id || "").trim()
      return Boolean(tenantId) && Boolean(ownerTenantId) && ownerTenantId === tenantId
    })
    const workspaceTemplates = filterRepositoryPreviewSharedTemplates(tenantWorkspaceTemplates)
    const publicTemplates = await fetchPreviewPlatformTemplates()
    const templateCatalog = createTemplatePreviewCatalog([
      ...publicTemplates.map((item) => ({
        template: {
          ...item,
          source: "platform" as const,
          scopes: ["platform" as const],
        },
        scope: "platform" as const,
      })),
      ...workspaceTemplates.map((item) => ({
        template: {
          ...item,
          source: "shared" as const,
          scopes: ["shared" as const],
        },
        scope: "shared" as const,
      })),
    ])
    templateRows.value = dedupeTemplatePickerRows(templateCatalog.map((item) => mapTemplateSummaryToPickerRow(item)))
    templatePickerScope.value = resolveDefaultTemplatePickerScope()
    templatePickerImageFailures.value = {}
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error)
  } finally {
    templateLoading.value = false
  }
}

function normalizeTemplateSummaryRecord(item: Record<string, unknown>): TemplateSummary {
  const legacyPublish = String(item.publish_status ?? item.publishStatus ?? "draft")
  const explicitAccessScope = item.access_scope ?? item.accessScope
  const explicitTenantApi = item.tenant_api_status ?? item.tenantApiStatus
  return {
    template_id: String(item.template_id ?? item.templateId ?? ""),
    governance_id: item.governance_id == null && item.governanceId == null ? undefined : String(item.governance_id ?? item.governanceId),
    runtime_key: item.runtime_key == null && item.runtimeKey == null ? undefined : String(item.runtime_key ?? item.runtimeKey),
    display_name: String(item.display_name ?? item.displayName ?? item.template_name ?? item.name ?? item.template_id ?? ""),
    owner_tenant_id: String(item.owner_tenant_id ?? item.ownerTenantId ?? ""),
    template_code: item.template_code == null && item.templateCode == null ? undefined : String(item.template_code ?? item.templateCode),
    description: item.description == null ? undefined : String(item.description),
    category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
    category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
    access_scope: (
      explicitAccessScope == null
        ? ((legacyPublish === "published" || explicitTenantApi === "enabled") ? "public" : "private")
        : explicitAccessScope
    ) as "public" | "private",
    tenant_api_status: (
      explicitTenantApi == null
        ? (legacyPublish === "published" ? "enabled" : "disabled")
        : explicitTenantApi
    ) as "enabled" | "disabled" | undefined,
    publish_status: legacyPublish as "draft" | "published",
    template_size: String(item.template_size ?? item.templateSize ?? ""),
    cover_url: String(item.cover_url ?? item.coverUrl ?? item.template_snapshot ?? item.templateSnapshot ?? ""),
    created_at: item.created_at == null && item.createdAt == null ? undefined : String(item.created_at ?? item.createdAt),
    updated_at: String(item.updated_at ?? item.updatedAt ?? item.created_at ?? item.createdAt ?? ""),
    colors: Array.isArray(item.colors) ? item.colors.map((color) => String(color)) : [],
    parts_count: Number(item.parts_count ?? item.partsCount ?? 0),
    views_count: Number(item.views_count ?? item.viewsCount ?? 0),
    physical_size_configured: item.physical_size_configured == null && item.physicalSizeConfigured == null
      ? undefined
      : Boolean(item.physical_size_configured ?? item.physicalSizeConfigured),
    downloads: item.downloads == null ? undefined : Number(item.downloads),
    renders: item.renders == null ? undefined : Number(item.renders),
    enabled: item.enabled == null ? String(item.status ?? "") !== "disabled" : Boolean(item.enabled),
    status: String(item.status ?? ""),
    ready: item.ready == null ? undefined : Boolean(item.ready),
    manifest_present: item.manifest_present == null && item.manifestPresent == null ? undefined : Boolean(item.manifest_present ?? item.manifestPresent),
  }
}

async function fetchPreviewPlatformTemplates() {
  const [marketplaceResponse, publishedResponse, runtimeResponse] = await Promise.all([
    gatewayPlatformFetch<Array<Record<string, unknown>>>("/marketplace/templates").catch(() => [] as Array<Record<string, unknown>>),
    gatewayPlatformFetch<Array<Record<string, unknown>> | { records?: Array<Record<string, unknown>> }>("/api/v1/templates?status=published", {
      headers: authStore.authHeaders,
    }).catch(() => [] as Array<Record<string, unknown>>),
    gatewayPlatformFetch<Array<Record<string, unknown>>>("/api/v1/runtime/templates", {
      headers: authStore.authHeaders,
    }).catch(() => [] as Array<Record<string, unknown>>),
  ])
  const publishedRecords = Array.isArray(publishedResponse)
    ? publishedResponse
    : (Array.isArray(publishedResponse?.records) ? publishedResponse.records : [])
  const listedTemplates = getListedMarketplaceTemplates((Array.isArray(marketplaceResponse) ? marketplaceResponse : []).map((item) => ({
    listing_id: String(item.listing_id ?? item.listingId ?? item.template_id ?? item.templateId ?? ""),
    template_id: String(item.template_id ?? item.templateId ?? ""),
    template_code: item.template_code == null && item.templateCode == null ? undefined : String(item.template_code ?? item.templateCode),
    title: String(item.title ?? item.name ?? item.template_code ?? item.templateCode ?? item.template_id ?? item.templateId ?? ""),
    description: item.description == null ? "" : String(item.description),
    creator_name: item.creator_name == null && item.creatorName == null ? "" : String(item.creator_name ?? item.creatorName),
    listed_at: item.listed_at == null && item.listedAt == null ? undefined : String(item.listed_at ?? item.listedAt),
    marketplace_status: String(item.marketplace_status ?? item.marketplaceStatus ?? "listed") === "unlisted" ? "unlisted" : "listed",
    cover_url: String(item.cover_url ?? item.coverUrl ?? ""),
    category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
    category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
    tenant_api_status: (
      item.tenant_api_status == null && item.tenantApiStatus == null
        ? undefined
        : String(item.tenant_api_status ?? item.tenantApiStatus)
    ) as "enabled" | "disabled" | undefined,
  })))
  const listedTemplateSeeds: TemplatePreviewEntry[] = listedTemplates.map((item) => ({
    listing_id: item.listing_id,
    template_id: item.template_id,
    governance_id: item.template_id,
    runtime_key: item.template_id,
    template_code: item.template_code,
    display_name: item.title || item.template_id,
    owner_tenant_id: "",
    description: item.description,
    category_id: item.category_id,
    category_path: item.category_path,
    access_scope: item.access_scope,
    tenant_api_status: item.tenant_api_status,
    cover_url: item.cover_url,
    publish_status: "published",
    template_size: "",
    created_at: item.listed_at,
    updated_at: item.listed_at || "",
    colors: [],
    parts_count: 0,
    views_count: 0,
    status: "",
    source: "platform",
    scopes: ["platform"],
    creator_name: item.creator_name,
    listed_at: item.listed_at,
  }))
  const publishedTemplateSeeds: TemplatePreviewEntry[] = publishedRecords.map((item) => ({
    ...normalizeTemplateSummaryRecord(item),
    source: "platform",
    scopes: ["platform"],
  }))
  const runtimeTemplateSeeds: TemplatePreviewEntry[] = runtimeResponse.map((item) => ({
    ...normalizeTemplateSummaryRecord(item),
    source: "platform",
    scopes: ["platform"],
  }))
  return buildPlatformPreviewTemplates({
    listedTemplates: listedTemplateSeeds,
    publishedTemplates: publishedTemplateSeeds,
    runtimeTemplates: runtimeTemplateSeeds,
  }).map((item) => {
    const listedMatch = listedTemplateSeeds.find((entry) => entry.template_id === item.template_id || entry.template_code === item.template_code)
    return {
      ...item,
      cover_url: item.cover_url || listedMatch?.cover_url || "",
      category_path: item.category_path || listedMatch?.category_path,
    }
  })
}

function mapTemplateSummaryToPickerRow(item: TemplateSummary & { scopes?: string[]; source?: string }): TemplatePickerRow {
  const publishStatus = item.publish_status === "published" ? "published" : "draft"
  const pickerScopes = Array.from(new Set(
    (Array.isArray(item.scopes) ? item.scopes : [item.source])
      .filter((scope): scope is TemplatePickerScope => scope === "platform" || scope === "shared")
  ))
  const accessScope = resolvePreviewTemplateAccessScope({
    source: (item.source === "platform" || item.source === "shared" || item.source === "draft" || item.source === "storefront" || item.source === "review")
      ? item.source
      : undefined,
    scopes: (Array.isArray(item.scopes) ? item.scopes : [])
      .filter((scope): scope is "platform" | "shared" | "draft" | "storefront" | "review" => (
        scope === "platform" || scope === "shared" || scope === "draft" || scope === "storefront" || scope === "review"
      )),
    publish_status: item.publish_status,
    access_scope: item.access_scope,
  })
  return {
    templateId: String(item.template_id || "").trim(),
    templateName: String(item.display_name || item.template_id || "").trim(),
    templateCode: String(item.template_code || "").trim(),
    categoryId: String(item.category_id || "").trim(),
    categoryPath: String(item.category_path || "").trim(),
    templateSource: String(item.source || pickerScopes[0] || "platform").trim(),
    templateVersion: "",
    reviewStatusLabel: String(item.status || "").trim(),
    previewUrl: String(item.cover_url || "").trim(),
    publishStatus,
    pickerScopes: pickerScopes.length ? pickerScopes : ["platform"],
    accessScope,
  }
}

function buildFallbackTemplatePermissionDetail(templateId: string): ErpTemplatePermissionDetail | null {
  const matched = templateRows.value.find((item) => item.templateId === templateId)
  if (!matched) {
    return null
  }
  const templateSource = matched.pickerScopes.includes("platform") ? "platform" : "shared"
  return {
    templateId: matched.templateId,
    tenantId: String(tenant.value?.tenant_id || "").trim(),
    templateName: matched.templateName || matched.templateId,
    templateVersion: matched.templateVersion || "runtime",
    ownerType: templateSource,
    visibilityScope: templateSource === "platform" ? "public" : "tenant_only",
    designerEnabled: true,
    downloadEnabled: templateSource === "platform",
    publishEnabled: true,
    erpSelectable: true,
    templateOverview: {
      templateSource,
      supplierStatus: "connected",
      supplierStatusLabel: t("supplierProducts.shared.notReturned"),
      reviewStatus: matched.publishStatus === "published" ? "approved" : "pending_review",
      reviewStatusLabel: resolveTemplateReviewStatusLabel(
        matched.publishStatus === "published" ? "approved" : "pending_review",
        matched.reviewStatusLabel,
      ),
      boundProductCount: 0,
      boundProduct: null,
      companyName: "",
    },
    blacklistedTenants: [],
    printConfig: {
      printAreaName: null,
      factoryPrintPath: null,
      effectImageBaseUrl: matched.previewUrl || null,
    },
    permissionStatus: "auto_fallback",
    note: "",
    allowedRoles: [],
    reuseBoundaryNote: "",
    sourceEntries: [],
    erpExtensionTips: [],
    updatedAt: new Date().toISOString(),
    updateEntry: {
      key: "noop",
      label: "",
      path: "",
      method: "GET",
      description: "",
    },
  }
}

function dedupeTemplatePickerRows(rows: TemplatePickerRow[]) {
  const output: TemplatePickerRow[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const identityKeys = buildTemplateIdentityKeys({
      template_id: row.templateId,
      governance_id: row.templateId,
      runtime_key: row.templateId,
      template_code: row.templateCode,
    })
    const hasSeen = identityKeys.some((key) => seen.has(key))
    if (hasSeen || !row.templateId) {
      continue
    }
    identityKeys.forEach((key) => seen.add(key))
    output.push(row)
  }
  return output
}

async function loadSelectedTemplate(templateId: string) {
  if (!templateId.trim()) {
    selectedTemplate.value = null
    return
  }
  templateDetailLoading.value = true
  try {
    selectedTemplate.value = deepCamelize(
      await retryWithFreshErpSession(() => fetchErpTemplatePermissionDetail(templateId)),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/erp template permission not found|404/i.test(message)) {
      selectedTemplate.value = buildFallbackTemplatePermissionDetail(templateId)
      return
    }
    selectedTemplate.value = null
    if (!/erp template permission not found/i.test(message)) {
      formError.value = message
    }
  } finally {
    templateDetailLoading.value = false
  }
}

async function syncCategoryFromTemplate(templateId: string) {
  if (!templateId.trim()) {
    return
  }
  templateCategorySyncing.value = true
  try {
    const binding = await platformStore.loadTemplateCategoryBinding(authStore.authHeaders, templateId)
    if (binding?.category_id?.trim()) {
      form.categoryId = binding.category_id.trim()
    }
  } catch {
    // Keep manual category selection when template binding data is unavailable.
  } finally {
    templateCategorySyncing.value = false
  }
}

function openTemplatePicker() {
  templatePickerSelectionId.value = form.templateId.trim()
  templatePickerKeyword.value = ""
  templatePickerCategoryId.value = "all"
  templatePickerPage.value = 1
  templatePickerScope.value = resolveDefaultTemplatePickerScope()
  showTemplateCategoryPopover.value = false
  templatePickerOpen.value = true
}

async function applyTemplateBinding(templateId = templatePickerSelectionId.value) {
  const nextTemplateId = String(templateId || "").trim()
  if (!nextTemplateId) {
    formError.value = t("supplierProducts.validation.templateRequired")
    return
  }
  form.templateId = nextTemplateId
  templatePickerSelectionId.value = nextTemplateId
  templatePickerOpen.value = false
  await loadSelectedTemplate(nextTemplateId)
  await syncCategoryFromTemplate(nextTemplateId)
}

async function ensureFinishedProductCode() {
  if (form.finishedProductCode.trim()) {
    return
  }
  try {
    const code = await fetchNextErpFinishedProductCode()
    form.finishedProductCode = code.value
  } catch {
    form.finishedProductCode = `FG-${Date.now().toString().slice(-6)}`
  }
}

async function loadCategoryTree() {
  try {
    await platformStore.loadTemplateCategories(authStore.authHeaders)
  } catch {
    // Fallback categories keep the Supplier product editor usable in isolated environments.
  }
}

async function loadEditDetail(productId: string) {
  if (!productId.trim()) {
    return
  }
  formLoading.value = true
  try {
    const detail = deepCamelize(await retryWithFreshErpSession(() => fetchErpProductDetail(productId)))
    syncFormFromDetail(detail)
    if (detail.templateBinding?.templateId) {
      await loadSelectedTemplate(detail.templateBinding.templateId)
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error)
  } finally {
    formLoading.value = false
  }
}

async function loadDuplicateDetail(productId: string) {
  if (!productId.trim()) {
    return
  }
  formLoading.value = true
  try {
    const detail = deepCamelize(await retryWithFreshErpSession(() => fetchErpProductDetail(productId)))
    syncFormFromDetail(detail)
    form.productId = undefined
    form.status = "draft"
    form.finishedProductCode = ""
    form.productSku = detail.productSku ? `${detail.productSku}-COPY` : form.productSku
    form.productName = `${detail.productName} ${t("supplierProducts.form.duplicateSuffix")}`.trim()
    form.productNameEn = detail.productNameEn ? `${detail.productNameEn} Copy`.trim() : form.productNameEn
    await ensureFinishedProductCode()
    if (detail.templateBinding?.templateId) {
      await loadSelectedTemplate(detail.templateBinding.templateId)
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error)
  } finally {
    formLoading.value = false
  }
}

async function initialize() {
  formError.value = ""
  formSuccess.value = ""
  resetForm()
  await Promise.all([loadCategoryTree(), loadTemplateOptions()])
  if (routeTemplateId.value) {
    form.templateId = routeTemplateId.value
  }
  if (routeProductId.value) {
    await loadEditDetail(routeProductId.value)
  } else if (routeDuplicateProductId.value) {
    await loadDuplicateDetail(routeDuplicateProductId.value)
  } else {
    await ensureFinishedProductCode()
  }
  if (form.templateId.trim()) {
    await loadSelectedTemplate(form.templateId)
    if (!form.categoryId.trim()) {
      await syncCategoryFromTemplate(form.templateId)
    }
  }
  ensureSpecRows()
}

async function saveProductForm() {
  formError.value = ""
  formSuccess.value = ""
  const validationMessage = validateForm()
  if (validationMessage) {
    formError.value = validationMessage
    return
  }
  saving.value = true
  try {
    const payload = normalizePayload()
    const detail = await saveErpProduct(payload)
    syncFormFromDetail(detail)
    formSuccess.value = isEditMode.value
      ? t("supplierProducts.result.saveUpdated", { name: detail.productName })
      : t("supplierProducts.result.saveCreated", {
          name: detail.productName,
          template: detail.templateBinding?.templateName || payload.templateId,
        })
    await router.replace({
      path: "/erp/supplier/product/add",
      query: {
        templateId: detail.templateBinding?.templateId || payload.templateId,
        productId: detail.productId,
        source: "admin-repository",
      },
    })
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}

watch(() => form.templateId, (templateId) => {
  formSuccess.value = ""
  templatePickerSelectionId.value = templateId.trim()
  clearPrimaryImageAssetState()
  if (!templateId.trim()) {
    selectedTemplate.value = null
    return
  }
  void loadSelectedTemplate(templateId)
})

watch(
  () => [form.colorOptionsText, form.sizeOptionsText, form.customSpecName, form.customSpecOptionsText],
  () => {
    formSuccess.value = ""
    rebuildMatrixRows()
  },
)

watch(() => form.productSku, (nextSku, previousSku) => {
  const nextSeed = nextSku.trim()
  const previousSeed = previousSku?.trim() || ""
  matrixRows.value = matrixRows.value.map((row, index) => {
    const normalizedSku = row.sku.trim()
    const shouldRefresh = !normalizedSku
      || normalizedSku.startsWith("SKU-")
      || (previousSeed && normalizedSku.startsWith(`${previousSeed}-`))
    if (!shouldRefresh) {
      return row
    }
    return {
      ...row,
      sku: nextSeed ? `${nextSeed}-${String(index + 1).padStart(2, "0")}` : buildDefaultSku(index),
    }
  })
})

watch(() => form.finishedProductCode, (nextCode, previousCode) => {
  if (form.productSku.trim()) {
    return
  }
  const nextSeed = nextCode.trim()
  const previousSeed = previousCode?.trim() || ""
  matrixRows.value = matrixRows.value.map((row, index) => {
    const normalizedSku = row.sku.trim()
    const shouldRefresh = !normalizedSku
      || normalizedSku.startsWith("SKU-")
      || (previousSeed && normalizedSku.startsWith(`${previousSeed}-`))
    if (!shouldRefresh) {
      return row
    }
    return {
      ...row,
      sku: nextSeed ? `${nextSeed}-${String(index + 1).padStart(2, "0")}` : buildDefaultSku(index),
    }
  })
})

watch(routeTemplateId, (templateId) => {
  if (templateId && form.templateId !== templateId) {
    form.templateId = templateId
    if (!form.categoryId.trim()) {
      void syncCategoryFromTemplate(templateId)
    }
  }
})

watch(routeProductId, (productId, previousProductId) => {
  if (productId && productId !== previousProductId) {
    void loadEditDetail(productId)
  }
})

watch(
  () => [form.colorOptionsText, form.sizeOptionsText, form.customSpecName, form.customSpecOptionsText],
  () => {
    rebuildMatrixRows()
  },
)

watch(templatePickerTotalPages, (totalPages) => {
  if (templatePickerPage.value > totalPages) {
    templatePickerPage.value = totalPages
  }
})

onMounted(() => {
  void initialize()
})
</script>

<template>
  <section class="supplier-product-form">
    <div class="supplier-product-form__header">
      <div class="supplier-product-form__header-left">
        <span class="supplier-product-form__breadcrumb">{{ t("supplierProducts.form.erpBreadcrumb") }}</span>
      </div>
      <div class="supplier-product-form__header-right">
        <strong>{{ form.finishedProductCode || t("supplierProducts.form.pendingCode") }}</strong>
      </div>
    </div>

    <div class="supplier-product-form__tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="supplier-product-form__tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <div v-if="formError" class="supplier-product-form__notice supplier-product-form__notice--error">
      <strong>{{ t("supplierProducts.form.saveFailed") }}</strong>
      <p>{{ formError }}</p>
    </div>

    <div v-if="formSuccess" class="supplier-product-form__notice supplier-product-form__notice--success">
      <strong>{{ t("supplierProducts.form.actionSuccess") }}</strong>
      <p>{{ formSuccess }}</p>
    </div>

    <div v-if="formLoading" class="supplier-product-form__notice">
      <strong>{{ t("supplierProducts.form.loadingDetailTitle") }}</strong>
      <p>{{ t("supplierProducts.form.loadingDetailHint") }}</p>
    </div>

    <div class="supplier-product-form__panel">
      <template v-if="activeTab === 'basic'">
        <section class="supplier-product-form__erp-section">
          <header class="supplier-product-form__section-title">{{ t("supplierProducts.form.categoryInfoTitle") }}</header>
          <div class="supplier-product-form__field-table">
            <label class="supplier-product-form__field-row supplier-product-form__field-row--stack">
              <span class="supplier-product-form__field-label">{{ t("supplierProducts.form.template") }}</span>
              <div class="supplier-product-form__field-control">
                <div class="supplier-product-form__bind-row">
                  <input :value="currentTemplateSummary" type="text" readonly />
                  <button type="button" class="supplier-product-form__mini-button" :disabled="templateLoading || saving" @click="openTemplatePicker">
                    {{ t("supplierProducts.form.bindTemplate") }}
                  </button>
                </div>
                <small>{{ t("supplierProducts.form.templateSelectableCount", { count: selectableTemplateCount }) }}</small>
              </div>
            </label>
            <label class="supplier-product-form__field-row supplier-product-form__field-row--stack">
              <span class="supplier-product-form__field-label">{{ t("supplierProducts.form.leafCategory") }}</span>
              <div class="supplier-product-form__field-control supplier-product-form__field-control--category">
                <CategoryCascadeSelector
                  v-model="form.categoryId"
                  :categories="resolvedCategories"
                  :disabled="templateCategorySyncing || saving"
                  display-mode="dropdown"
                  :show-clear-button="false"
                  :show-recent-options="false"
                  :show-selection-summary="false"
                  :level1-placeholder="t('supplierProducts.form.categoryLevel1')"
                  :level2-placeholder="t('supplierProducts.form.categoryLevel2')"
                  :level3-placeholder="t('supplierProducts.form.categoryLevel3')"
                />
                <small v-if="templateCategorySyncing">{{ t("supplierProducts.form.categorySyncing") }}</small>
              </div>
            </label>
          </div>
        </section>

        <section class="supplier-product-form__erp-section">
          <header class="supplier-product-form__section-title">{{ t("supplierProducts.form.primaryImageSectionTitle") }}</header>
          <div class="supplier-product-form__primary-image-panel">
            <div class="supplier-product-form__primary-image-preview">
              <img
                v-if="effectivePrimaryImagePreviewUrl"
                :src="effectivePrimaryImagePreviewUrl"
                :alt="`${form.productName || t('supplierProducts.form.defaultProductName')} ${t('supplierProducts.form.primaryImageAlt')}`"
                crossorigin="anonymous"
              />
              <span v-else class="supplier-product-form__primary-image-placeholder">{{ t("supplierProducts.form.primaryImageEmpty") }}</span>
            </div>
            <div class="supplier-product-form__primary-image-side">
              <div class="supplier-product-form__primary-image-copy">
                <strong>{{ t("supplierProducts.form.primaryImageTitle") }}</strong>
                <span>{{ t("supplierProducts.form.primaryImageHint") }}</span>
                <small>{{ t("supplierProducts.form.primaryImageCurrentSource", { source: primaryImageCurrentSourceLabel }) }}</small>
                <small v-if="!form.templateId.trim()">{{ t("supplierProducts.form.primaryImageTemplateRequiredHint") }}</small>
              </div>
              <div class="supplier-product-form__primary-image-actions">
                <button type="button" class="supplier-product-form__mini-button" :disabled="saving || primaryImageUploading" @click="openPrimaryImageUploadDialog">
                  {{ primaryImageUploading ? t("supplierProducts.form.primaryImageUploading") : t("supplierProducts.form.primaryImageUploadAction") }}
                </button>
                <button type="button" class="supplier-product-form__mini-button" :disabled="saving || !form.templateId.trim()" @click="openPrimaryImageAssetPicker('drafts')">
                  {{ t("supplierProducts.form.primaryImageChooseFromTemplate") }}
                </button>
                <button type="button" class="supplier-product-form__mini-button" :disabled="saving || !explicitPrimaryImageUrl" @click="clearPrimaryImageSelection">
                  {{ t("supplierProducts.form.primaryImageRemove") }}
                </button>
              </div>

            </div>
          </div>
          <input
            ref="primaryImageFileInput"
            class="supplier-product-form__hidden-input"
            type="file"
            :accept="PRIMARY_IMAGE_FILE_ACCEPT"
            multiple
            @change="handlePrimaryImageFileChange"
          />
          <div class="supplier-product-form__gallery-panel">
            <div class="supplier-product-form__gallery-copy">
              <strong>{{ t("supplierProducts.form.primaryImageGalleryTitle") }}</strong>
              <span>{{ t("supplierProducts.form.primaryImageGalleryHint", { count: productImageItems.length }) }}</span>
            </div>
            <div v-if="productImageItems.length" class="supplier-product-form__gallery-list">
              <article
                v-for="(image, index) in productImageItems"
                :key="image.id"
                class="supplier-product-form__gallery-card"
              >
                <span class="supplier-product-form__gallery-thumb">
                  <img :src="resolveDisplayImageUrl(image.imageUrl)" :alt="image.altText" loading="lazy" decoding="async" crossorigin="anonymous" />
                  <span v-if="image.primary" class="supplier-product-form__gallery-primary-badge" :title="t('supplierProducts.form.primaryImagePrimaryBadge')">
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="11" height="11">
                      <path d="M8 1.5l1.854 3.756 4.146.603-3 2.925.708 4.133L8 10.968l-3.708 1.949.708-4.133-3-2.925 4.146-.603L8 1.5z"/>
                    </svg>
                  </span>
                </span>
                <span class="supplier-product-form__gallery-meta">
                  <strong>{{ image.primary ? t("supplierProducts.form.primaryImagePrimaryBadge") : `${index + 1}` }}</strong>
                  <span>{{ t(`supplierProducts.form.primaryImageSource.${image.source}`) }}</span>
                </span>
                <div class="supplier-product-form__gallery-actions">
                  <button type="button" class="supplier-product-form__mini-button" :disabled="image.primary" @click="setProductImageAsPrimary(image.id)">
                    {{ t("supplierProducts.form.primaryImageSetPrimary") }}
                  </button>
                  <button type="button" class="supplier-product-form__mini-button" :disabled="index === 0" @click="moveProductImage(image.id, 'backward')">
                    {{ t("supplierProducts.form.primaryImageMoveLeft") }}
                  </button>
                  <button
                    type="button"
                    class="supplier-product-form__mini-button"
                    :disabled="index >= productImageItems.length - 1"
                    @click="moveProductImage(image.id, 'forward')"
                  >
                    {{ t("supplierProducts.form.primaryImageMoveRight") }}
                  </button>
                  <button type="button" class="supplier-product-form__mini-button" @click="removeProductImage(image.id)">
                    {{ t("supplierProducts.form.primaryImageRemoveEntry") }}
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="tool-empty">
              {{ t("supplierProducts.form.primaryImageGalleryEmpty") }}
            </div>
          </div>
        </section>

        <section class="supplier-product-form__erp-section">
          <header class="supplier-product-form__section-title">{{ t("supplierProducts.form.detailSectionTitle") }}</header>
          <div class="supplier-product-form__clone-table">
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.productName") }}：</span>
              <div class="supplier-product-form__clone-control"><input v-model="form.productName" type="text" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.finishedCode") }}：</span>
              <div class="supplier-product-form__clone-control"><input v-model="form.finishedProductCode" type="text" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.qualityGrade") }}：</span>
              <div class="supplier-product-form__clone-control"><input v-model="form.qualityGrade" type="text" :placeholder="t('supplierProducts.form.qualityGradePlaceholder')" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.targetAudience") }}：</span>
              <div class="supplier-product-form__clone-control"><input v-model="form.targetAudience" type="text" :placeholder="t('supplierProducts.form.targetAudiencePlaceholder')" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.deliveryDaysLegacy") }}：</span>
              <div class="supplier-product-form__clone-control supplier-product-form__clone-control--short"><input v-model.number="form.deliveryDays" type="number" min="1" step="1" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.materialTextLegacy") }}：</span>
              <div class="supplier-product-form__clone-control"><input v-model="form.materialText" type="text" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.salesUnitLegacy") }}：</span>
              <div class="supplier-product-form__clone-control supplier-product-form__clone-control--short"><input v-model="form.salesUnit" type="text" :placeholder="t('supplierProducts.form.salesUnitPlaceholder')" /></div>
            </label>
            <label class="supplier-product-form__clone-row">
              <span class="supplier-product-form__clone-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.craftsmanshipLegacy") }}：</span>
              <div class="supplier-product-form__clone-control supplier-product-form__clone-control--stack">
                <div class="supplier-product-form__clone-spec-values supplier-product-form__clone-spec-values--legacy">
                  <span v-for="item in craftsmanshipOptions" :key="`craft-${item}`" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy">{{ item }}</span>
                  <span v-if="!craftsmanshipOptions.length" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy supplier-product-form__clone-chip--muted">{{ t("supplierProducts.shared.hyphen") }}</span>
                  <button type="button" class="supplier-product-form__clone-link supplier-product-form__clone-link--legacy" @click="openCraftsmanshipEditor">{{ t("supplierProducts.form.editOption") }}</button>
                </div>
                <div v-if="showCraftsmanshipCreator" class="supplier-product-form__clone-inline-editor supplier-product-form__clone-inline-editor--legacy supplier-product-form__clone-inline-editor--flush">
                  <input v-model="pendingCraftsmanshipText" type="text" :placeholder="t('supplierProducts.form.craftsmanshipPlaceholder')" />
                  <button type="button" class="supplier-product-form__mini-button" @click="applyPendingCraftsmanshipOptions">{{ t("supplierProducts.form.confirmInline") }}</button>
                  <button type="button" class="supplier-product-form__mini-button" @click="showCraftsmanshipCreator = false">{{ t("supplierProducts.form.cancelInline") }}</button>
                </div>
              </div>
            </label>
            <label class="supplier-product-form__clone-row supplier-product-form__clone-row--textarea">
              <span class="supplier-product-form__clone-label">{{ t("supplierProducts.form.descriptionLegacy") }}：</span>
              <div class="supplier-product-form__clone-control">
                <textarea v-model="form.description" rows="4" :placeholder="t('supplierProducts.form.descriptionPlaceholder')" />
              </div>
            </label>
          </div>
        </section>

        <section class="supplier-product-form__erp-section">
          <header class="supplier-product-form__section-title">{{ t("supplierProducts.form.specSectionTitle") }}</header>
          <div class="supplier-product-form__clone-spec-panel supplier-product-form__clone-spec-panel--legacy">
            <div class="supplier-product-form__clone-spec-line supplier-product-form__clone-spec-line--legacy">
              <span class="supplier-product-form__clone-spec-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.color") }}：</span>
              <div class="supplier-product-form__clone-spec-values supplier-product-form__clone-spec-values--legacy">
                <span v-for="color in colorOptions" :key="`color-${color}`" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy">{{ color }}</span>
                <span v-if="!colorOptions.length" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy supplier-product-form__clone-chip--muted">{{ t("supplierProducts.shared.hyphen") }}</span>
                <button type="button" class="supplier-product-form__clone-link supplier-product-form__clone-link--legacy" @click="openColorEditor">{{ t("supplierProducts.form.editOption") }}</button>
              </div>
            </div>
            <div v-if="showColorCreator" class="supplier-product-form__clone-inline-editor supplier-product-form__clone-inline-editor--legacy">
              <input v-model="pendingColorText" type="text" :placeholder="t('supplierProducts.form.colorPlaceholder')" />
              <button type="button" class="supplier-product-form__mini-button" @click="applyPendingColorOptions">{{ t("supplierProducts.form.confirmInline") }}</button>
              <button type="button" class="supplier-product-form__mini-button" @click="showColorCreator = false">{{ t("supplierProducts.form.cancelInline") }}</button>
            </div>
            <div class="supplier-product-form__clone-spec-line supplier-product-form__clone-spec-line--legacy">
              <span class="supplier-product-form__clone-spec-label"><span class="supplier-product-form__clone-required">*</span>{{ t("supplierProducts.form.size") }}：</span>
              <div class="supplier-product-form__clone-spec-values supplier-product-form__clone-spec-values--legacy">
                <span v-for="size in sizeOptions" :key="`size-${size}`" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy">{{ size }}</span>
                <span v-if="!sizeOptions.length" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy supplier-product-form__clone-chip--muted">{{ t("supplierProducts.shared.hyphen") }}</span>
                <button type="button" class="supplier-product-form__clone-link supplier-product-form__clone-link--legacy" @click="openSizeEditor">{{ t("supplierProducts.form.editOption") }}</button>
              </div>
            </div>
            <div v-if="showSizeCreator" class="supplier-product-form__clone-inline-editor supplier-product-form__clone-inline-editor--legacy">
              <input v-model="pendingSizeText" type="text" :placeholder="t('supplierProducts.form.sizePlaceholder')" />
              <button type="button" class="supplier-product-form__mini-button" @click="applyPendingSizeOptions">{{ t("supplierProducts.form.confirmInline") }}</button>
              <button type="button" class="supplier-product-form__mini-button" @click="showSizeCreator = false">{{ t("supplierProducts.form.cancelInline") }}</button>
            </div>
            <div class="supplier-product-form__clone-spec-line supplier-product-form__clone-spec-line--legacy">
              <span class="supplier-product-form__clone-spec-label">{{ t("supplierProducts.form.attribute") }}：</span>
              <div class="supplier-product-form__clone-spec-values supplier-product-form__clone-spec-values--legacy">
                <span v-for="item in customSpecOptions" :key="`custom-${item}`" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy">{{ item }}</span>
                <span v-if="!customSpecOptions.length" class="supplier-product-form__clone-chip supplier-product-form__clone-chip--legacy supplier-product-form__clone-chip--muted">{{ t("supplierProducts.shared.hyphen") }}</span>
                <button type="button" class="supplier-product-form__clone-link supplier-product-form__clone-link--legacy" @click="openCustomSpecEditor">{{ t("supplierProducts.form.editOption") }}</button>
              </div>
            </div>
            <div v-if="showCustomSpecCreator" class="supplier-product-form__clone-inline-editor supplier-product-form__clone-inline-editor--legacy">
              <input v-model="pendingCustomSpecValues" type="text" :placeholder="t('supplierProducts.form.customSpecValuesPlaceholder')" />
              <button type="button" class="supplier-product-form__mini-button" @click="applyPendingCustomSpecOptions">{{ t("supplierProducts.form.confirmInline") }}</button>
              <button type="button" class="supplier-product-form__mini-button" @click="showCustomSpecCreator = false">{{ t("supplierProducts.form.cancelInline") }}</button>
            </div>
          </div>
          <div class="supplier-product-form__clone-spec-grid-wrap">
            <table class="supplier-product-form__clone-spec-grid">
              <thead>
                <tr>
                  <th class="supplier-product-form__clone-spec-grid-name">{{ t("supplierProducts.form.defaultSpecHeader") }}</th>
                  <th v-for="column in specGridAttributeColumns" :key="`attr-head-${column}`" class="supplier-product-form__clone-spec-grid-heading">{{ column }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="size in specGridSizeRows" :key="`size-row-${size}`">
                  <td class="supplier-product-form__clone-spec-grid-name">
                    <div>{{ size || t("supplierProducts.shared.hyphen") }}</div>
                  </td>
                  <td v-for="column in specGridAttributeColumns" :key="`cell-${size}-${column}`" class="supplier-product-form__clone-spec-grid-input">
                    <input v-if="resolveSpecGridCellRow(size, column)" v-model.number="resolveSpecGridCellRow(size, column)!.length" type="number" min="0" step="0.01" />
                    <input v-else type="text" disabled />
                  </td>
                </tr>
                <tr v-if="!matrixRows.length">
                  <td class="supplier-product-form__clone-spec-grid-empty" :colspan="Math.max(specGridAttributeColumns.length + 1, 1)">{{ t("supplierProducts.shared.hyphen") }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="activeTab === 'price'">
        <div class="supplier-product-form__table-caption">
          <span>{{ form.productName || t("supplierProducts.shared.hyphen") }}</span>
          <span>{{ t("supplierProducts.form.finishedCode") }}：{{ form.finishedProductCode || t("supplierProducts.shared.hyphen") }}</span>
          <div class="supplier-product-form__inline-actions">
            <select v-model="form.defaultCurrency">
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
            </select>
            <button
              type="button"
              class="supplier-product-form__mini-button"
              @click="applyBatchValues(['purchasePrice', 'retailPrice', 'minimumOrderQuantity'], { purchasePrice: 9.9, retailPrice: 19.9, minimumOrderQuantity: 1 })"
            >
              {{ t("supplierProducts.form.fillExample") }}
            </button>
          </div>
        </div>
        <div class="supplier-product-form__table-wrap">
          <table class="supplier-product-form__table supplier-product-form__table--erp">
            <thead>
              <tr>
                <th>{{ t("supplierProducts.form.tableColor") }}</th>
                <th>{{ t("supplierProducts.form.tableSizeLabel") }}</th>
                <th>{{ t("supplierProducts.form.tableSupplierCostPrice") }}</th>
                <th>{{ t("form.currency") }}</th>
                <th>{{ t("supplierProducts.form.tableRetailPrice") }}</th>
                <th>{{ t("supplierProducts.form.tableSku") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrixRows" :key="row.key">
                <td>{{ row.color || t("supplierProducts.shared.hyphen") }}</td>
                <td>{{ row.size || t("supplierProducts.shared.hyphen") }}</td>
                <td><input v-model.number="row.purchasePrice" type="number" min="0" step="0.01" /></td>
                <td>{{ form.defaultCurrency }}</td>
                <td><input v-model.number="row.retailPrice" type="number" min="0" step="0.01" /></td>
                <td><input v-model="row.sku" type="text" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'packaging'">
        <div class="supplier-product-form__table-caption">
          <span>{{ t("supplierProducts.form.packagingTitle") }}</span>
          <div class="supplier-product-form__inline-actions">
            <button type="button" class="supplier-product-form__mini-button" :class="{ 'is-active': form.weightUnit === 'g' }" @click="switchWeightUnit('g')">g</button>
            <button type="button" class="supplier-product-form__mini-button" :class="{ 'is-active': form.weightUnit === 'lb' }" @click="switchWeightUnit('lb')">lb</button>
            <button type="button" class="supplier-product-form__mini-button" :class="{ 'is-active': form.dimensionUnit === 'cm' }" @click="switchDimensionUnit('cm')">cm</button>
            <button type="button" class="supplier-product-form__mini-button" :class="{ 'is-active': form.dimensionUnit === 'in' }" @click="switchDimensionUnit('in')">in</button>
          </div>
        </div>
        <div class="supplier-product-form__table-wrap">
          <table class="supplier-product-form__table supplier-product-form__table--erp">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t("supplierProducts.form.tableSizeLabel") }}</th>
                <th>{{ t("supplierProducts.form.tableWeight", { unit: form.weightUnit }) }}</th>
                <th>{{ t("supplierProducts.form.tableLength", { unit: form.dimensionUnit }) }}</th>
                <th>{{ t("supplierProducts.form.tableWidth", { unit: form.dimensionUnit }) }}</th>
                <th>{{ t("supplierProducts.form.tableHeight", { unit: form.dimensionUnit }) }}</th>
                <th>{{ t("supplierProducts.form.tableVolume", { unit: form.dimensionUnit === 'cm' ? 'cm3' : 'in3' }) }}</th>
                <th>{{ t("supplierProducts.form.tablePackageUnit") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in matrixRows" :key="row.key">
                <td>{{ String(index + 1).padStart(3, "0") }}</td>
                <td>{{ row.size || row.label }}</td>
                <td><input v-model.number="row.packageWeight" type="number" min="0" step="0.01" /></td>
                <td><input v-model.number="row.length" type="number" min="0" step="0.01" /></td>
                <td><input v-model.number="row.width" type="number" min="0" step="0.01" /></td>
                <td><input v-model.number="row.height" type="number" min="0" step="0.01" /></td>
                <td>{{ resolveRowVolume(row) }}</td>
                <td><input v-model="form.packageUnit" type="text" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'customs'">
        <div class="supplier-product-form__field-table supplier-product-form__field-table--compact">
          <label class="supplier-product-form__field-row">
            <span class="supplier-product-form__field-label">{{ t("supplierProducts.form.declarationUnit") }}</span>
            <div class="supplier-product-form__field-control supplier-product-form__field-control--short">
              <input v-model="form.declarationUnit" type="text" :placeholder="t('supplierProducts.form.declarationUnitPlaceholder')" />
            </div>
          </label>
        </div>
        <div class="supplier-product-form__table-wrap">
          <table class="supplier-product-form__table supplier-product-form__table--erp">
            <thead>
              <tr>
                <th>{{ t("supplierProducts.form.tableColor") }}</th>
                <th>{{ t("supplierProducts.form.tableSizeLabel") }}</th>
                <th>{{ t("supplierProducts.form.tableDeclaredNameCn") }}</th>
                <th>{{ t("supplierProducts.form.tableDeclaredNameEn") }}</th>
                <th>{{ t("supplierProducts.form.tableHsCode") }}</th>
                <th>{{ t("supplierProducts.form.tableDeclaredValue") }}</th>
                <th>{{ t("supplierProducts.form.tableLogisticsRemark") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrixRows" :key="row.key">
                <td>{{ row.color || t("supplierProducts.shared.hyphen") }}</td>
                <td>{{ row.size || t("supplierProducts.shared.hyphen") }}</td>
                <td><input v-model="row.declaredName" type="text" /></td>
                <td><input v-model="row.declaredNameEn" type="text" /></td>
                <td><input v-model="row.hsCode" type="text" /></td>
                <td><input v-model.number="row.declaredValue" type="number" min="0" step="0.01" /></td>
                <td><textarea v-model="row.specialTransportTag" rows="2" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'wholesale'">
        <div class="supplier-product-form__table-wrap">
          <table class="supplier-product-form__table supplier-product-form__table--erp">
            <thead>
              <tr>
                <th>{{ t("supplierProducts.form.tableColor") }}</th>
                <th>{{ t("supplierProducts.form.tableSizeLabel") }}</th>
                <th>{{ t("supplierProducts.form.wholesaleMinQuantity") }}</th>
                <th>{{ t("supplierProducts.form.wholesalePrice") }}</th>
                <th>{{ t("form.currency") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrixRows" :key="row.key">
                <td>{{ row.color || t("supplierProducts.shared.hyphen") }}</td>
                <td>{{ row.size || t("supplierProducts.shared.hyphen") }}</td>
                <td><input v-model.number="row.wholesaleMinQuantity" type="number" min="0" step="1" /></td>
                <td><input v-model.number="row.wholesalePrice" type="number" min="0" step="0.01" /></td>
                <td>{{ form.defaultCurrency }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'private'">
        <div class="supplier-product-form__matrix-summary supplier-product-form__matrix-summary--erp">
          <span>{{ t("supplierProducts.form.privateHiddenHint") }}</span>
        </div>
        <div class="supplier-product-form__table-wrap">
          <table class="supplier-product-form__table supplier-product-form__table--erp">
            <thead>
              <tr>
                <th>{{ t("supplierProducts.form.tableColor") }}</th>
                <th>{{ t("supplierProducts.form.tableSizeLabel") }}</th>
                <th>{{ t("supplierProducts.form.privateTierName") }}</th>
                <th>{{ t("supplierProducts.form.privateMinQuantity") }}</th>
                <th>{{ t("supplierProducts.form.privatePrice") }}</th>
                <th>{{ t("supplierProducts.form.privateNote") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrixRows" :key="row.key">
                <td>{{ row.color || t("supplierProducts.shared.hyphen") }}</td>
                <td>{{ row.size || t("supplierProducts.shared.hyphen") }}</td>
                <td><input v-model="row.privateTierName" type="text" /></td>
                <td><input v-model.number="row.privateMinQuantity" type="number" min="0" step="1" /></td>
                <td><input v-model.number="row.privatePrice" type="number" min="0" step="0.01" /></td>
                <td><input v-model="row.privateNote" type="text" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <div v-if="selectedTemplateConflict" class="supplier-product-form__notice supplier-product-form__notice--warning">
      <strong>{{ t("supplierProducts.form.bindingLimitTitle") }}</strong>
      <p>{{ t("supplierProducts.form.bindingLimitHint", { name: selectedTemplateConflict.productName }) }}</p>
    </div>

    <div class="supplier-product-form__footer">
      <div class="supplier-product-form__actions">
        <button type="button" class="supplier-product-form__secondary-button" @click="resetForm">{{ t("supplierProducts.form.resetForm") }}</button>
        <button type="button" class="supplier-product-form__primary-button" :disabled="saving" @click="saveProductForm">
          {{ saving ? t("supplierProducts.form.saving") : t("supplierProducts.form.save") }}
        </button>
      </div>
    </div>

    <div v-if="templatePickerOpen" class="workspace-modal-backdrop" @click.self="templatePickerOpen = false">
      <div class="workspace-modal workspace-modal--replace-artwork supplier-product-form__template-modal" role="dialog" aria-modal="true" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <div class="replace-artwork-header-copy">
            <h3 class="workspace-modal-title">{{ t("supplierProducts.form.bindTemplateTitle") }}</h3>
          </div>
          <button type="button" class="workspace-modal-close" @click="templatePickerOpen = false">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--replace-artwork">
          <div class="segment-switch supplier-product-form__template-scope-switch">
            <button
              v-for="scope in templatePickerScopeOptions"
              :key="scope.key"
              type="button"
              class="segment-switch-item"
              :class="{ active: templatePickerScope === scope.key }"
              @click="selectTemplatePickerScope(scope.key)"
            >
              {{ scope.label }} ({{ scope.count }})
            </button>
          </div>
          <div class="template-library-filters template-library-filters--replace-artwork">
            <div class="template-filter-row template-filter-row--replace-artwork">
              <input
                :value="templatePickerKeyword"
                type="text"
                class="template-search-input replace-artwork-search-input"
                :placeholder="t('supplierProducts.form.searchTemplatePlaceholder')"
                @input="updateTemplatePickerKeyword(($event.target as HTMLInputElement).value)"
              />
              <div class="template-category-popover replace-artwork-category-popover" :class="{ open: showTemplateCategoryPopover }">
                <button
                  type="button"
                  class="template-filter-icon-btn"
                  :class="{ active: templatePickerCategoryId !== 'all' }"
                  :title="t('supplierProducts.form.filterTemplateCategories')"
                  @click.stop="toggleTemplateCategoryPopover"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                </button>
                <div v-if="showTemplateCategoryPopover" class="template-category-panel replace-artwork-category-panel">
                  <CategoryCascadeSelector
                    :model-value="templatePickerCategoryId"
                    :categories="resolvedCategories"
                    clear-value="all"
                    :allow-non-leaf="true"
                    display-mode="panel"
                    :level1-placeholder="t('supplierProducts.form.allTemplateCategories')"
                    :level2-placeholder="t('supplierProducts.form.categoryLevel2')"
                    :level3-placeholder="t('supplierProducts.form.categoryLevel3')"
                    :helper-text="t('supplierProducts.form.filterTemplateCategories')"
                    recent-storage-key="mockup-supplier-product-template-categories"
                    @update:model-value="updateTemplatePickerCategory"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="replace-artwork-library-meta">
            <span>{{ templatePickerResultSummary }}</span>
            <span v-if="selectedTemplatePickerEntry">{{ selectedTemplatePickerEntry.templateId }}</span>
          </div>
          <div v-if="pagedTemplateRows.length" class="workspace-scroll-area template-library-scroll-area supplier-product-form__template-library-scroll">
            <div class="library-grid library-grid--templates">
              <button
                v-for="template in pagedTemplateRows"
                :key="template.templateId"
                type="button"
                class="library-tile library-tile--template"
                :class="{ active: templatePickerSelectionId === template.templateId }"
                :title="template.templateName"
                @click="templatePickerSelectionId = template.templateId"
              >
                <span class="library-tile-thumb">
                  <img
                    v-if="resolveTemplatePreviewUrl(template)"
                    :src="resolveTemplatePreviewUrl(template)"
                    :alt="template.templateName"
                    loading="lazy"
                    decoding="async"
                    @error="handleTemplatePreviewError(template.templateId)"
                  />
                  <span v-else>{{ template.templateName.slice(0, 1).toUpperCase() }}</span>
                  <span
                    v-if="template.accessScope === 'private'"
                    class="library-tile-scope-badge library-tile-scope-badge--private"
                    :title="t('supplierProducts.form.templatePrivateAccess')"
                    :aria-label="t('supplierProducts.form.templatePrivateAccess')"
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                      <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
                    </svg>
                  </span>
                </span>
                <span class="library-tile-copy">
                  <strong class="library-tile-title">{{ template.templateName }}</strong>
                  <span class="library-tile-meta">{{ template.templateCode || template.templateId }}</span>
                  <span class="library-tile-meta">{{ template.categoryPath || t("supplierProducts.form.categoryNone") }}</span>
                </span>
              </button>
            </div>
          </div>
          <div v-if="filteredTemplateRows.length > 0" class="pagination-bar">
            <button type="button" class="pagination-btn" :disabled="templatePickerPage <= 1" @click="goToTemplatePickerPage(templatePickerPage - 1)">
              {{ t("common.previous") }}
            </button>
            <span class="pagination-status">{{ templatePickerPage }} / {{ templatePickerTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="templatePickerPage >= templatePickerTotalPages" @click="goToTemplatePickerPage(templatePickerPage + 1)">
              {{ t("common.next") }}
            </button>
          </div>
          <div v-else class="tool-empty">
            {{ templatePickerEmptyText }}
          </div>
        </div>
        <div class="workspace-modal-footer replace-artwork-modal-footer">
          <button type="button" class="action-button secondary" @click="templatePickerOpen = false">
            {{ t("supplierProducts.form.cancelInline") }}
          </button>
          <button type="button" class="action-button primary" :disabled="!templatePickerSelectionId" @click="applyTemplateBinding()">
            {{ t("supplierProducts.form.bindTemplate") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="primaryImageAssetModalOpen" class="workspace-modal-backdrop" @click.self="primaryImageAssetModalOpen = false">
      <div class="workspace-modal workspace-modal--replace-artwork supplier-product-form__asset-modal" role="dialog" aria-modal="true" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <div class="replace-artwork-header-copy">
            <h3 class="workspace-modal-title">{{ t("supplierProducts.form.primaryImageAssetTitle") }}</h3>
          </div>
          <button type="button" class="workspace-modal-close" @click="primaryImageAssetModalOpen = false">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--replace-artwork">
          <div class="segment-switch supplier-product-form__template-scope-switch">
            <button
              type="button"
              class="segment-switch-item"
              :class="{ active: primaryImageAssetTab === 'drafts' }"
              @click="selectPrimaryImageAssetTab('drafts')"
            >
              {{ t("supplierProducts.form.primaryImageChooseDrafts") }} ({{ primaryImageDraftEntries.length }})
            </button>
            <button
              type="button"
              class="segment-switch-item"
              :class="{ active: primaryImageAssetTab === 'results' }"
              @click="selectPrimaryImageAssetTab('results')"
            >
              {{ t("supplierProducts.form.primaryImageChooseResults") }} ({{ primaryImageResultEntries.length }})
            </button>
          </div>
          <div class="replace-artwork-library-meta">
            <span>{{ t("supplierProducts.form.primaryImageAssetSummary", { count: primaryImageAssetCount }) }}</span>
            <span v-if="selectedPrimaryImageAsset">{{ selectedPrimaryImageAsset.id }}</span>
          </div>
          <div v-if="primaryImageAssetLoading && primaryImageAssetTab !== 'drafts'" class="tool-empty">
            {{ t("supplierProducts.form.primaryImageLoadingAssets") }}
          </div>
          <div v-else-if="primaryImageAssetError" class="tool-empty">
            {{ primaryImageAssetError }}
          </div>
          <div v-else-if="primaryImageAssetTab === 'drafts' && primaryImageDraftEntries.length" class="supplier-product-form__draft-picker">
            <div class="workspace-scroll-area supplier-product-form__draft-list">
              <div class="supplier-product-form__draft-list-grid">
                <button
                  v-for="draft in primaryImageDraftEntries"
                  :key="draft.id"
                  type="button"
                  class="supplier-product-form__draft-mini-card"
                  :class="{ active: primaryImageSelectedDraftId === draft.id }"
                  @click="selectPrimaryImageDraft(draft.id)"
                >
                  <span class="supplier-product-form__draft-mini-thumb">
                    <img v-if="draft.previewUrl" :src="draft.previewUrl" :alt="draft.draftName" loading="lazy" decoding="async" />
                    <span v-else class="supplier-product-form__draft-mini-initial">{{ draft.draftName.slice(0, 1).toUpperCase() }}</span>
                  </span>
                  <span class="supplier-product-form__draft-mini-name">{{ draft.draftName }}</span>
                </button>
              </div>
            </div>
            <div class="supplier-product-form__draft-results">
              <div v-if="primaryImageAssetLoading && primaryImageAssetTab === 'drafts'" class="supplier-product-form__draft-results-loading">
                <span class="supplier-product-form__render-spinner"></span>
                <span>{{ t("supplierProducts.form.primaryImageLoadingAssets") }}</span>
              </div>
              <template v-else>
              <div v-if="draftAvailableColors.length > 1" class="supplier-product-form__draft-color-switch">
                <button
                  v-for="color in draftAvailableColors"
                  :key="color"
                  type="button"
                  class="supplier-product-form__color-chip"
                  :class="{ active: draftSelectedColor === color }"
                  :title="color"
                  @click="draftSelectedColor = color; assetDraftOutputPage = 1"
                >
                  <span class="supplier-product-form__color-swatch" :style="{ background: colorSwatch(color) }"></span>
                  <span class="supplier-product-form__color-name">{{ color }}</span>
                </button>
              </div>
              <div class="supplier-product-form__asset-toolbar">
                <span class="supplier-product-form__asset-toolbar-summary">{{ primaryImageDraftOutputSummary }}</span>
                <div class="supplier-product-form__asset-toolbar-actions">
                  <button
                    v-if="primaryImageDraftSelection && draftGridCells.some((c) => c.status !== 'done' && c.status !== 'loading')"
                    type="button"
                    class="supplier-product-form__toolbar-btn supplier-product-form__toolbar-btn--primary"
                    @click="renderAllDraftGridCells(primaryImageDraftSelection!)"
                  >{{ t("supplierProducts.form.renderAll") }}</button>
                  <button type="button" class="supplier-product-form__toolbar-btn" @click="selectAllCurrentPageAssets">{{ t("supplierProducts.form.selectAll") }}</button>
                  <button type="button" class="supplier-product-form__toolbar-btn" @click="deselectAllAssets">{{ t("supplierProducts.form.deselectAll") }}</button>
                  <span class="supplier-product-form__selection-count" v-if="primaryImageAssetSelectionIds.size">{{ t("supplierProducts.form.selectedCount", { count: primaryImageAssetSelectionIds.size }) }}</span>
                </div>
              </div>
              <div v-if="draftGridCells.length" class="workspace-scroll-area supplier-product-form__asset-scroll">
                <div class="supplier-product-form__asset-grid">
                  <template v-for="cell in pagedDraftGridCells" :key="`${cell.color}::${cell.view}`">
                    <button
                      v-if="cell.status === 'done' && cell.entry"
                      type="button"
                      class="supplier-product-form__asset-card"
                      :class="{
                        active: primaryImageAssetSelectionId === cell.entry.id || primaryImageAssetSelectionIds.has(cell.entry.id),
                        'is-main': cell.color === draftMainPreviewColor && cell.view === draftMainPreviewView
                      }"
                      :title="primaryImageAssetSelectionIds.has(cell.entry.id) || primaryImageAssetSelectionId === cell.entry.id
                        ? t('supplierProducts.form.assetClickToDeselect')
                        : t('supplierProducts.form.assetClickToSelect')"
                      @click="toggleAssetSelection(cell.entry.id)"
                    >
                      <span class="supplier-product-form__asset-check" :class="{ checked: primaryImageAssetSelectionIds.has(cell.entry.id) || primaryImageAssetSelectionId === cell.entry.id }">
                        <span class="supplier-product-form__asset-check-tick">✓</span>
                        <span class="supplier-product-form__asset-check-cross">✕</span>
                      </span>
                      <span class="supplier-product-form__asset-thumb">
                        <span
                          v-if="cell.color === draftMainPreviewColor && cell.view === draftMainPreviewView"
                          class="supplier-product-form__asset-main-badge"
                          :title="t('supplierProducts.form.draftMainBadge')"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="11" height="11">
                            <path d="M8 1.5l1.854 3.756 4.146.603-3 2.925.708 4.133L8 10.968l-3.708 1.949.708-4.133-3-2.925 4.146-.603L8 1.5z"/>
                          </svg>
                          <span class="supplier-product-form__asset-main-badge-label">{{ t("supplierProducts.form.draftMainBadge") }}</span>
                        </span>
                        <img :src="cell.entry.url" :alt="`${cell.color}-${cell.view}`" loading="lazy" decoding="async" />
                      </span>
                      <span class="supplier-product-form__asset-copy">
                        <strong>{{ cell.view }}</strong>
                        <span v-if="draftAvailableColors.length > 1">{{ cell.color }}</span>
                        <span v-if="cell.entry.source === 'live'" class="supplier-product-form__asset-badge--live">{{ t("supplierProducts.form.primaryImageLiveBadge") }}</span>
                        <span v-else-if="cell.entry.createdAt" class="supplier-product-form__asset-date">{{ formatAssetDate(cell.entry.createdAt) }}</span>
                      </span>
                    </button>
                    <button
                      v-else
                      type="button"
                      class="supplier-product-form__asset-card supplier-product-form__asset-card--empty"
                      :class="{
                        'is-loading': cell.status === 'loading',
                        'is-error': cell.status === 'error',
                        'is-main': cell.color === draftMainPreviewColor && cell.view === draftMainPreviewView
                      }"
                      :disabled="cell.status === 'loading'"
                      @click="primaryImageDraftSelection && renderDraftGridCell(primaryImageDraftSelection, cell.color, cell.view)"
                    >
                      <span class="supplier-product-form__asset-thumb supplier-product-form__asset-thumb--mask">
                        <span
                          v-if="cell.color === draftMainPreviewColor && cell.view === draftMainPreviewView"
                          class="supplier-product-form__asset-main-badge"
                          :title="t('supplierProducts.form.draftMainBadge')"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="11" height="11">
                            <path d="M8 1.5l1.854 3.756 4.146.603-3 2.925.708 4.133L8 10.968l-3.708 1.949.708-4.133-3-2.925 4.146-.603L8 1.5z"/>
                          </svg>
                          <span class="supplier-product-form__asset-main-badge-label">{{ t("supplierProducts.form.draftMainBadge") }}</span>
                        </span>
                        <span class="supplier-product-form__mask-overlay">
                          <span v-if="cell.status === 'loading'" class="supplier-product-form__mask-content">
                            <span class="supplier-product-form__render-spinner"></span>
                            <span class="supplier-product-form__mask-label">{{ t("supplierProducts.form.rendering") }}</span>
                            <span class="supplier-product-form__mask-hint">{{ t("supplierProducts.form.renderingHint") }}</span>
                          </span>
                          <span v-else-if="cell.status === 'error'" class="supplier-product-form__mask-content supplier-product-form__mask-content--error">
                            <span class="supplier-product-form__mask-retry-icon">↺</span>
                            <span class="supplier-product-form__mask-label">{{ t("supplierProducts.form.renderRetry") }}</span>
                            <span class="supplier-product-form__mask-hint">{{ t("supplierProducts.form.renderRetryHint") }}</span>
                          </span>
                          <span v-else class="supplier-product-form__mask-content">
                            <svg class="supplier-product-form__mask-camera" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <span class="supplier-product-form__mask-badge">{{ t("supplierProducts.form.renderEmptyBadge") }}</span>
                            <span class="supplier-product-form__mask-label">{{ t("supplierProducts.form.renderGenerate") }}</span>
                            <span class="supplier-product-form__mask-hint">{{ t("supplierProducts.form.renderClickHint") }}</span>
                          </span>
                        </span>
                      </span>
                      <span class="supplier-product-form__asset-copy">
                        <strong>{{ cell.view }}</strong>
                      </span>
                    </button>
                  </template>
                </div>
              </div>
              <div v-else class="tool-empty">{{ primaryImageAssetEmptyText }}</div>
              <div v-if="draftOutputTotalPages > 1" class="pagination-bar supplier-product-form__asset-pagination">
                <button type="button" class="pagination-btn" :disabled="assetDraftOutputPage <= 1" @click="assetDraftOutputPage--">‹</button>
                <span class="pagination-status">{{ assetDraftOutputPage }} / {{ draftOutputTotalPages }}</span>
                <button type="button" class="pagination-btn" :disabled="assetDraftOutputPage >= draftOutputTotalPages" @click="assetDraftOutputPage++">›</button>
              </div>
              </template>
            </div>
          </div>
          <div v-else-if="primaryImageAssetTab === 'results' && primaryImageResultEntries.length">
            <div class="supplier-product-form__asset-toolbar">
              <span class="supplier-product-form__asset-toolbar-summary">{{ t("supplierProducts.form.primaryImageAssetSummary", { count: primaryImageResultEntries.length }) }}</span>
              <div class="supplier-product-form__asset-toolbar-actions">
                <button type="button" class="supplier-product-form__toolbar-btn" @click="selectAllCurrentPageAssets">{{ t("supplierProducts.form.selectAll") }}</button>
                <button type="button" class="supplier-product-form__toolbar-btn" @click="deselectAllAssets">{{ t("supplierProducts.form.deselectAll") }}</button>
                <span class="supplier-product-form__selection-count" v-if="primaryImageAssetSelectionIds.size">{{ t("supplierProducts.form.selectedCount", { count: primaryImageAssetSelectionIds.size }) }}</span>
              </div>
            </div>
            <div class="workspace-scroll-area supplier-product-form__asset-scroll">
              <div class="supplier-product-form__asset-grid">
                <button
                  v-for="result in pagedResultEntries"
                  :key="result.id"
                  type="button"
                  class="supplier-product-form__asset-card"
                  :class="{
                    active: primaryImageAssetSelectionId === result.id || primaryImageAssetSelectionIds.has(result.id)
                  }"
                  :title="primaryImageAssetSelectionIds.has(result.id) || primaryImageAssetSelectionId === result.id
                    ? t('supplierProducts.form.assetClickToDeselect')
                    : t('supplierProducts.form.assetClickToSelect')"
                  @click="toggleAssetSelection(result.id)"
                >
                  <span class="supplier-product-form__asset-check" :class="{ checked: primaryImageAssetSelectionIds.has(result.id) || primaryImageAssetSelectionId === result.id }">
                    <span class="supplier-product-form__asset-check-tick">✓</span>
                    <span class="supplier-product-form__asset-check-cross">✕</span>
                  </span>
                  <span class="supplier-product-form__asset-thumb">
                    <img :src="result.url" :alt="`${result.color}-${result.view}-${result.size}`" loading="lazy" decoding="async" />
                  </span>
                  <span class="supplier-product-form__asset-copy">
                    <strong>{{ result.view || t("supplierProducts.form.primaryImageResultLabel") }}</strong>
                    <span>{{ result.color || t("supplierProducts.shared.hyphen") }}</span>
                    <span>{{ result.size || t("supplierProducts.shared.hyphen") }}</span>
                    <span v-if="result.createdAt" class="supplier-product-form__asset-date">{{ formatAssetDate(result.createdAt) }}</span>
                  </span>
                </button>
              </div>
            </div>
            <div v-if="resultTotalPages > 1" class="pagination-bar supplier-product-form__asset-pagination">
              <button type="button" class="pagination-btn" :disabled="assetResultPage <= 1" @click="assetResultPage--">‹</button>
              <span class="pagination-status">{{ assetResultPage }} / {{ resultTotalPages }}</span>
              <button type="button" class="pagination-btn" :disabled="assetResultPage >= resultTotalPages" @click="assetResultPage++">›</button>
            </div>
          </div>
          <div v-else class="tool-empty">
            {{ primaryImageAssetEmptyText }}
          </div>
        </div>
        <div class="workspace-modal-footer replace-artwork-modal-footer">
          <button type="button" class="action-button secondary" @click="primaryImageAssetModalOpen = false">
            {{ t("supplierProducts.form.cancelInline") }}
          </button>
          <button type="button" class="action-button primary" :disabled="!selectedPrimaryImageAssets.length" @click="applySelectedPrimaryImageAsset">
            {{ selectedPrimaryImageAssets.length > 1
              ? t("supplierProducts.form.primaryImageUseSelectedMulti", { count: selectedPrimaryImageAssets.length })
              : t("supplierProducts.form.primaryImageUseSelected") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.supplier-product-form {
  display: grid;
  gap: 10px;
  color: #2f3b4c;
  font-size: 12px;
  line-height: 1.45;
}

.supplier-product-form__header,
.supplier-product-form__panel,
.supplier-product-form__notice,
.supplier-product-form__footer,
.supplier-product-form__tab-bar {
  border: 1px solid #dcdfe6;
  background: #fff;
}

.supplier-product-form__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 8px 12px;
  border-top: 3px solid #2d7df6;
}

.supplier-product-form__breadcrumb {
  color: #2d7df6;
  font-size: 12px;
  font-weight: 600;
}

.supplier-product-form__header strong,
.supplier-product-form__notice strong,
.supplier-product-form__notice p,
.supplier-product-form__header span {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.supplier-product-form__intro p {
  color: #6b7280;
}

.supplier-product-form__intro-meta {
  display: grid;
  gap: 2px;
  justify-items: end;
  color: #6b7280;
}

.supplier-product-form__intro-meta strong {
  color: #2d7df6;
  font-size: 13px;
}

.supplier-product-form__tab-bar {
  display: flex;
  gap: 0;
  padding: 0 10px;
  overflow-x: auto;
}

.supplier-product-form__tab,
.supplier-product-form__secondary-button,
.supplier-product-form__primary-button,
.supplier-product-form__mini-button {
  border: 1px solid #d8dde6;
  background: #f6f6f6;
  color: #4b5563;
  font: inherit;
  cursor: pointer;
}

.supplier-product-form__tab {
  min-width: 92px;
  height: 31px;
  margin: 8px 6px 0 0;
  padding: 0 12px;
  border-bottom: none;
}

.supplier-product-form__tab.is-active {
  background: #fff;
  color: #2d7df6;
  font-weight: 600;
}

.supplier-product-form__notice {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
}

.supplier-product-form__notice--error {
  border-color: #efb8b8;
  background: #fff7f7;
}

.supplier-product-form__notice--success {
  border-color: #b8dfc1;
  background: #f5fff7;
}

.supplier-product-form__notice--warning {
  border-color: #ead7a1;
  background: #fffcef;
}

.supplier-product-form__panel {
  display: grid;
  gap: 12px;
  padding: 10px;
  background: #f7f7f7;
}

.supplier-product-form__erp-section {
  border: 1px solid #dcdfe6;
  background: #fff;
}

.supplier-product-form__section-title {
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  margin: 0;
  background: #eef2f6;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
}

.supplier-product-form__field-table {
  display: grid;
}

.supplier-product-form__field-table--compact {
  border: 1px solid #dcdfe6;
  background: #fff;
}

.supplier-product-form__field-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  min-height: 38px;
  border-top: 1px solid #ececec;
}

.supplier-product-form__field-row:first-child {
  border-top: none;
}

.supplier-product-form__field-row--stack {
  align-items: stretch;
}

.supplier-product-form__field-label {
  display: flex;
  align-items: center;
  min-height: 100%;
  padding: 8px 10px;
  color: #5f6b7a;
  background: #fbfbfb;
}

.supplier-product-form__field-control,
.supplier-product-form__field-value {
  padding: 6px 8px;
}

.supplier-product-form__field-control--short {
  max-width: 240px;
}

.supplier-product-form__field-control--category {
  padding-top: 10px;
}

.supplier-product-form__bind-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.supplier-product-form__primary-image-panel {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  padding: 12px;
}

.supplier-product-form__primary-image-preview,
.supplier-product-form__asset-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9dde5;
  background: #f8fafc;
  overflow: hidden;
}

.supplier-product-form__primary-image-preview {
  min-height: 220px;
}

.supplier-product-form__primary-image-preview img,
.supplier-product-form__asset-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.supplier-product-form__primary-image-placeholder {
  color: #94a3b8;
  text-align: center;
  padding: 16px;
}

.supplier-product-form__primary-image-side {
  display: grid;
  gap: 10px;
  align-content: start;
}

.supplier-product-form__primary-image-copy {
  display: grid;
  gap: 4px;
  color: #5f6b7a;
}

.supplier-product-form__primary-image-copy strong {
  color: #374151;
  font-size: 13px;
}

.supplier-product-form__primary-image-copy small {
  color: #8a94a6;
}

.supplier-product-form__primary-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.supplier-product-form__primary-image-url input {
  background: #f8fafc;
}

.supplier-product-form__gallery-panel {
  display: grid;
  gap: 10px;
}

.supplier-product-form__gallery-copy {
  display: grid;
  gap: 4px;
  color: #667085;
}

.supplier-product-form__gallery-copy strong {
  color: #374151;
  font-size: 13px;
}

.supplier-product-form__gallery-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.supplier-product-form__gallery-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #d9dde5;
  background: #fff;
}

.supplier-product-form__gallery-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: 1px solid #d9dde5;
  background: #f8fafc;
  overflow: hidden;
  position: relative;
}

.supplier-product-form__gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.supplier-product-form__gallery-primary-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.18);
  pointer-events: none;
  z-index: 1;
}

.supplier-product-form__draft-color-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0 6px;
}

.supplier-product-form__color-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.supplier-product-form__color-chip:hover {
  border-color: rgba(37, 99, 235, 0.5);
  transform: translateY(-1px);
}

.supplier-product-form__color-chip.active {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.supplier-product-form__color-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.16);
  flex: none;
}

.supplier-product-form__color-name {
  white-space: nowrap;
  text-transform: capitalize;
}

.supplier-product-form__gallery-meta {
  display: grid;
  gap: 3px;
  color: #667085;
}

.supplier-product-form__gallery-meta strong {
  color: #374151;
}

.supplier-product-form__gallery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.supplier-product-form__hidden-input {
  display: none;
}

.supplier-product-form__asset-modal {
  width: min(980px, calc(100vw - 48px));
}

.supplier-product-form__draft-picker {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.supplier-product-form__draft-list {
  max-height: 420px;
}

.supplier-product-form__draft-list-grid {
  display: grid;
  gap: 12px;
}

.supplier-product-form__draft-results {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.supplier-product-form__asset-scroll {
  max-height: 420px;
}

.supplier-product-form__asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.supplier-product-form__asset-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #d9dde5;
  background: #fff;
  cursor: pointer;
  text-align: left;
  position: relative;
}

.supplier-product-form__asset-card.active {
  border-color: #2d7df6;
  box-shadow: 0 0 0 1px rgba(45, 125, 246, 0.18);
}

.supplier-product-form__asset-card.is-main {
  border-color: #f59e0b;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.28);
}

.supplier-product-form__asset-card.is-main.active {
  border-color: #2d7df6;
  box-shadow: 0 0 0 1px rgba(45, 125, 246, 0.32), 0 0 0 3px rgba(245, 158, 11, 0.18);
}

.supplier-product-form__asset-main-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px 2px 5px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  z-index: 2;
  pointer-events: none;
  line-height: 1;
}

.supplier-product-form__asset-main-badge-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.supplier-product-form__asset-thumb {
  aspect-ratio: 1;
}

.supplier-product-form__asset-copy {
  display: grid;
  gap: 3px;
  color: #667085;
}

.supplier-product-form__asset-copy strong {
  color: #374151;
  font-size: 12px;
}

.supplier-product-form__asset-copy span {
  font-size: 12px;
  line-height: 1.4;
}

.supplier-product-form__asset-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #d1d5db;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: transparent;
  transition: all 0.15s;
  pointer-events: none;
  z-index: 3;
}

.supplier-product-form__asset-check-tick,
.supplier-product-form__asset-check-cross {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: opacity 0.15s, color 0.15s;
}

.supplier-product-form__asset-check-cross {
  opacity: 0;
  color: #fff;
}

.supplier-product-form__asset-check.checked {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.supplier-product-form__asset-card:hover .supplier-product-form__asset-check.checked {
  background: #ef4444;
  border-color: #ef4444;
}

.supplier-product-form__asset-card:hover .supplier-product-form__asset-check.checked .supplier-product-form__asset-check-tick {
  opacity: 0;
}

.supplier-product-form__asset-card:hover .supplier-product-form__asset-check.checked .supplier-product-form__asset-check-cross {
  opacity: 1;
}

.supplier-product-form__asset-date {
  font-size: 11px !important;
  color: #9ca3af !important;
  margin-top: 2px;
}

.supplier-product-form__asset-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
  margin-bottom: 6px;
}

.supplier-product-form__asset-toolbar-summary {
  font-size: 12px;
  color: #6b7280;
}

.supplier-product-form__asset-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.supplier-product-form__toolbar-btn {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;
}

.supplier-product-form__toolbar-btn:hover {
  background: #e5e7eb;
}

.supplier-product-form__selection-count {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  padding: 2px 8px;
  background: #eff6ff;
  border-radius: 9999px;
}

.supplier-product-form__asset-pagination {
  margin-top: 8px;
}

.supplier-product-form__draft-mini-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;
}

.supplier-product-form__draft-mini-card:hover {
  border-color: #93c5fd;
  background: #f0f9ff;
}

.supplier-product-form__draft-mini-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.supplier-product-form__draft-mini-thumb {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.supplier-product-form__draft-mini-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.supplier-product-form__draft-mini-initial {
  font-size: 14px;
  font-weight: 700;
  color: #9ca3af;
}

.supplier-product-form__draft-mini-name {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.supplier-product-form__asset-card--empty {
  background: #f8fafc;
  border-style: dashed;
  border-color: #cbd5e1;
  opacity: 0.9;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s;
}

.supplier-product-form__asset-card--empty:not(:disabled):hover {
  border-color: #3b82f6;
  background: #eff6ff;
  opacity: 1;
}

.supplier-product-form__asset-card--empty.is-loading {
  opacity: 0.6;
  cursor: default;
}

.supplier-product-form__asset-card--empty.is-error {
  border-color: #fca5a5;
  background: #fff1f2;
}

.supplier-product-form__asset-thumb--mask {
  aspect-ratio: 1;
  display: flex;
  align-items: stretch;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 40%, #e2e8f0 100%);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.supplier-product-form__mask-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(2px);
  border-radius: 4px;
  transition: background 0.15s;
}

.supplier-product-form__asset-card--empty:not(:disabled):hover .supplier-product-form__mask-overlay {
  background: rgba(37, 99, 235, 0.52);
}

.supplier-product-form__mask-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: #fff;
  text-align: center;
  padding: 8px;
}

.supplier-product-form__mask-content--error {
  color: #fca5a5;
}

.supplier-product-form__mask-camera {
  width: 28px;
  height: 28px;
  color: rgba(255,255,255,0.9);
  flex: none;
}

.supplier-product-form__mask-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.32);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.supplier-product-form__draft-results-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  color: #6b7280;
  font-size: 13px;
}

.supplier-product-form__mask-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
  color: #fff;
}

.supplier-product-form__mask-hint {
  font-size: 10px;
  color: rgba(255,255,255,0.72);
  line-height: 1.2;
}

.supplier-product-form__mask-retry-icon {
  font-size: 22px;
  line-height: 1;
  color: #fca5a5;
}

.supplier-product-form__render-icon {
  font-size: 24px;
  color: #94a3b8;
  font-weight: 300;
  line-height: 1;
}

.supplier-product-form__render-retry {
  font-size: 22px;
  color: #ef4444;
}

.supplier-product-form__render-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #bfdbfe;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin-asset 0.8s linear infinite;
}

@keyframes spin-asset {
  to { transform: rotate(360deg); }
}

.supplier-product-form__asset-hint {
  font-size: 11px !important;
  color: #94a3b8 !important;
}

.supplier-product-form__asset-badge--live {
  font-size: 11px !important;
  color: #10b981 !important;
  font-weight: 600 !important;
}

.supplier-product-form__toolbar-btn--primary {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
  font-weight: 600;
}

.supplier-product-form__field-control small {
  display: block;
  margin-top: 4px;
  color: #8a94a6;
}

.supplier-product-form__clone-table {
  display: grid;
  background: #fff;
}

.supplier-product-form__clone-row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: center;
  min-height: 38px;
  border-top: 1px solid #ececec;
}

.supplier-product-form__clone-row:first-child {
  border-top: none;
}

.supplier-product-form__clone-row--textarea {
  align-items: stretch;
}

.supplier-product-form__clone-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  min-height: 100%;
  padding: 8px 12px;
  background: #fbfbfb;
  color: #5f6b7a;
  white-space: nowrap;
}

.supplier-product-form__clone-required {
  color: #e11d48;
  font-weight: 600;
}

.supplier-product-form__clone-control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
}

.supplier-product-form__clone-control--short {
  max-width: 240px;
}

.supplier-product-form__clone-control--stack {
  display: grid;
  gap: 6px;
}

.supplier-product-form__clone-control input,
.supplier-product-form__clone-control textarea,
.supplier-product-form__clone-inline-editor input,
.supplier-product-form__clone-spec-table input {
  width: 100%;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid #d6d9df;
  background: #fff;
  box-sizing: border-box;
  font: inherit;
  color: #374151;
}

.supplier-product-form__clone-control textarea {
  resize: vertical;
}

.supplier-product-form__clone-link {
  border: none;
  background: transparent;
  color: #2d7df6;
  cursor: pointer;
  font: inherit;
  padding: 0;
  white-space: nowrap;
}

.supplier-product-form__clone-spec-panel {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #ececec;
  background: #fff;
}

.supplier-product-form__clone-spec-panel--legacy {
  gap: 7px;
  padding: 10px 12px 8px;
  border-top: 1px solid #d9dde5;
  background: #f8f8f8;
}

.supplier-product-form__clone-spec-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.supplier-product-form__clone-spec-line--legacy {
  gap: 10px;
  min-height: 24px;
}

.supplier-product-form__clone-spec-label {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 72px;
  color: #556273;
  font-size: 12px;
  white-space: nowrap;
}

.supplier-product-form__clone-spec-values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.supplier-product-form__clone-spec-values--legacy {
  gap: 5px;
  min-height: 24px;
  flex: 1;
}

.supplier-product-form__clone-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid #d6d9df;
  background: #f5f5f5;
  color: #4b5563;
}

.supplier-product-form__clone-chip--muted {
  color: #9aa1ad;
}

.supplier-product-form__clone-chip--legacy {
  min-height: 19px;
  padding: 0 6px;
  border-color: #c9ced8;
  background: #f1f1f1;
  color: #4b5563;
  font-size: 12px;
  line-height: 17px;
}

.supplier-product-form__clone-inline-editor {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-left: 72px;
}

.supplier-product-form__clone-inline-editor--legacy {
  padding-left: 74px;
  padding-bottom: 2px;
}

.supplier-product-form__clone-inline-editor--flush {
  padding-left: 0;
}

.supplier-product-form__clone-table-wrap {
  overflow-x: auto;
  border-top: 1px solid #ececec;
  background: #fff;
}

.supplier-product-form__clone-spec-grid-wrap {
  border-top: 1px solid #d9dde5;
  border-bottom: 1px solid #d9dde5;
  background: #fff;
}

.supplier-product-form__clone-spec-grid-heading {
  padding: 0 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  background: #efefef;
  border: 1px solid #e3e6eb;
}

.supplier-product-form__clone-spec-grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.supplier-product-form__clone-spec-grid td {
  height: 32px;
  border: 1px solid #e3e6eb;
  padding: 0 6px;
  vertical-align: middle;
}

.supplier-product-form__clone-spec-grid-name {
  width: 104px;
  color: #4b5563;
  background: #f6f6f6;
  white-space: nowrap;
}

.supplier-product-form__clone-spec-grid-input {
  width: auto;
}

.supplier-product-form__clone-spec-grid-input input {
  height: 22px;
  min-height: 22px;
  padding: 0 6px;
  border: 1px solid #d7dbe2;
  background: #fff;
}

.supplier-product-form__clone-spec-grid-empty {
  text-align: center;
  color: #9aa1ad;
}

.supplier-product-form__clone-link--legacy {
  font-size: 12px;
  line-height: 18px;
  color: #2d7df6;
}

@media (max-width: 960px) {
}

.supplier-product-form__clone-spec-table {
  width: 100%;
  border-collapse: collapse;
}

.supplier-product-form__clone-spec-table th,
.supplier-product-form__clone-spec-table td {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: middle;
}

.supplier-product-form__clone-spec-table th {
  background: #f3f4f6;
  color: #667085;
  font-weight: 600;
}

.supplier-product-form__field-control input,
.supplier-product-form__field-control select,
.supplier-product-form__field-control textarea,
.supplier-product-form__table input,
.supplier-product-form__table select,
.supplier-product-form__table textarea,
.supplier-product-form__inline-actions select,
.supplier-product-form__inline-actions input {
  width: 100%;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid #d6d9df;
  background: #fff;
  box-sizing: border-box;
  font: inherit;
  color: #374151;
}

.supplier-product-form__field-control textarea,
.supplier-product-form__table textarea {
  resize: vertical;
}

.supplier-product-form__field-control input:focus,
.supplier-product-form__field-control select:focus,
.supplier-product-form__field-control textarea:focus,
.supplier-product-form__table input:focus,
.supplier-product-form__table select:focus,
.supplier-product-form__table textarea:focus,
.supplier-product-form__inline-actions select:focus,
.supplier-product-form__inline-actions input:focus {
  outline: none;
  border-color: #2d7df6;
}

.supplier-product-form__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.supplier-product-form__chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid #d6d9df;
  background: #f7f9fc;
  color: #4b5563;
}

.supplier-product-form__chip--muted {
  color: #9aa1ad;
}

.supplier-product-form__matrix-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.supplier-product-form__matrix-summary--erp {
  padding: 0;
}

.supplier-product-form__matrix-summary span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid #d6d9df;
  background: #fff;
  color: #5f6b7a;
}

.supplier-product-form__inline-actions,
.supplier-product-form__footer,
.supplier-product-form__actions,
.supplier-product-form__table-caption {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.supplier-product-form__table-caption {
  padding: 0 2px;
  color: #6b7280;
}

.supplier-product-form__secondary-button,
.supplier-product-form__primary-button {
  min-width: 108px;
  height: 32px;
  padding: 0 14px;
}

.supplier-product-form__primary-button {
  border-color: #2d7df6;
  background: #2d7df6;
  color: #fff;
}

.supplier-product-form__mini-button {
  min-width: 52px;
  height: 26px;
  padding: 0 8px;
}

.supplier-product-form__mini-button.is-active,
.supplier-product-form__secondary-button.is-active {
  border-color: #2d7df6;
  background: #2d7df6;
  color: #fff;
}

.supplier-product-form__table-wrap {
  overflow-x: auto;
  border: 1px solid #dcdfe6;
  background: #fff;
}

.supplier-product-form__table {
  width: 100%;
  border-collapse: collapse;
}

.supplier-product-form__table--erp th,
.supplier-product-form__table--erp td {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  vertical-align: middle;
  text-align: left;
  white-space: nowrap;
}

.supplier-product-form__table--erp th {
  background: #edf3ff;
  color: #667085;
  font-weight: 600;
}

.supplier-product-form__table--erp td:first-child,
.supplier-product-form__table--erp th:first-child {
  text-align: center;
}

.supplier-product-form__template-summary {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  padding: 10px;
}

.supplier-product-form__template-summary article {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid #e1e5eb;
  background: #fafafa;
}

.supplier-product-form__footer {
  padding: 10px 12px;
}

.supplier-product-form__actions {
  justify-content: flex-end;
}

.tool-empty,
.workspace-scroll-area {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.tool-empty {
  padding: 1.4rem 1rem;
  border: 1px dashed #dbe3f0;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

.workspace-scroll-area {
  overflow: auto;
}

.action-button {
  min-width: 108px;
  height: 38px;
  padding: 0 0.95rem;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.action-button.primary {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(124, 58, 237, 0.22);
}

.action-button.primary:hover {
  border-color: #6d28d9;
  background: #6d28d9;
}

.action-button.secondary {
  background: #ffffff;
  color: #334155;
}

.action-button:disabled,
.workspace-modal-close:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.workspace-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow: auto;
  background: rgba(15, 23, 42, 0.46);
}

.workspace-modal {
  width: min(760px, 100%);
  max-height: calc(100vh - 3rem);
  position: relative;
  z-index: 20001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dbe3f0;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
}

.workspace-modal--replace-artwork {
  width: min(1120px, 100%);
  overflow: visible;
}

.workspace-modal-header,
.workspace-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid #e2e8f0;
}

.workspace-modal-footer {
  border-top: 1px solid #e2e8f0;
  border-bottom: none;
  justify-content: flex-end;
}

.workspace-modal-title {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.workspace-modal-close {
  width: 36px;
  height: 36px;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.workspace-modal-body {
  padding: 1rem 1.1rem 1.1rem;
  overflow: auto;
}

.replace-artwork-header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.workspace-modal-body--replace-artwork {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  overflow: visible;
}

.segment-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0.24rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #f8fafc;
}

.supplier-product-form__template-scope-switch {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.segment-switch-item {
  min-height: 32px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment-switch-item.active {
  background: #ffffff;
  color: #4338ca;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.template-library-filters--replace-artwork {
  z-index: 260;
}

.template-filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.template-filter-row--replace-artwork {
  align-items: stretch;
}

.template-category-popover {
  position: relative;
}

.template-category-popover.open {
  z-index: 210;
}

.replace-artwork-category-popover.open {
  z-index: 320;
}

.template-filter-icon-btn {
  width: 38px;
  height: 38px;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-filter-icon-btn:hover,
.template-filter-icon-btn.active,
.template-category-popover.open .template-filter-icon-btn {
  border-color: #c7d2fe;
  color: #4338ca;
  background: #f5f3ff;
}

.template-filter-icon-btn svg {
  width: 18px;
  height: 18px;
}

.template-category-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  right: auto;
  z-index: 220;
  width: min(700px, calc(100vw - 220px));
  padding: 0.42rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.replace-artwork-category-panel {
  left: auto;
  right: 0;
  width: min(700px, calc(100vw - 48px));
  max-width: min(700px, calc(100vw - 48px));
  z-index: 360;
  max-height: min(62vh, 560px);
  overflow: auto;
}

.template-category-panel :deep(.category-cascade) {
  width: 100%;
}

.template-category-panel :deep(.cascade-panel-grid) {
  min-height: 320px;
  border-radius: 10px;
}

.template-search-input {
  width: 100%;
  height: 38px;
  padding: 0 0.72rem;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.79rem;
}

.template-search-input::placeholder {
  color: #94a3b8;
  font-size: 0.74rem;
}

.template-search-input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.28);
}

.replace-artwork-search-input {
  height: 42px;
}

.replace-artwork-library-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.15rem 0.1rem 0;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
}

.template-library-scroll-area {
  flex: 1;
}

.supplier-product-form__template-library-scroll {
  min-height: 280px;
  max-height: min(52vh, 560px);
  padding: 0.75rem 0.55rem 0.3rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  overflow-y: scroll;
  overflow-x: hidden;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.library-grid--templates {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.45rem;
}

.library-tile {
  width: 100%;
  padding: 0.26rem;
  position: relative;
  overflow: visible;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.library-tile:hover {
  transform: translateY(-1px);
  border-color: #c7d2fe;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
  z-index: 120;
}

.library-tile.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  z-index: 110;
}

.library-tile-thumb {
  display: flex;
  width: 100%;
  aspect-ratio: 0.78;
  min-height: 132px;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.library-tile-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-grid--templates .library-tile-thumb img {
  object-fit: contain;
  padding: 4px;
  background: transparent;
}

.library-tile-scope-badge {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0.95rem;
  min-height: 0.95rem;
  padding: 0.12rem;
  border-radius: 999px;
  border: 1px solid transparent;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(6px);
  z-index: 2;
}

.library-tile-scope-badge--private {
  background: rgba(249, 115, 22, 0.92);
  color: #ffffff;
}

.library-tile-scope-badge svg {
  width: 0.78rem;
  height: 0.78rem;
}

.library-tile-copy {
  display: grid;
  gap: 0.12rem;
  padding: 0.38rem 0.12rem 0.08rem;
  text-align: left;
}

.library-tile-title {
  color: #0f172a;
  font-size: 0.67rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.library-tile-meta {
  color: #64748b;
  font-size: 0.58rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.18rem 0;
}

.pagination-btn {
  min-height: 30px;
  padding: 0 0.7rem;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination-status {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 700;
}

.replace-artwork-modal-footer {
  flex-wrap: wrap;
}

.supplier-product-form__primary-button:disabled,
.supplier-product-form__secondary-button:disabled,
.supplier-product-form__mini-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .supplier-product-form__intro,
  .supplier-product-form__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .supplier-product-form__intro-meta {
    justify-items: start;
  }

  .supplier-product-form__field-row {
    grid-template-columns: 1fr;
  }

  .supplier-product-form__field-label {
    border-bottom: 1px solid #ececec;
  }

  .supplier-product-form__clone-row {
    grid-template-columns: 1fr;
  }

  .supplier-product-form__clone-label {
    justify-content: flex-start;
    border-bottom: 1px solid #ececec;
  }

  .supplier-product-form__clone-inline-editor {
    padding-left: 0;
    flex-wrap: wrap;
  }

  .supplier-product-form__clone-spec-line {
    flex-direction: column;
  }

  .supplier-product-form__bind-row {
    grid-template-columns: 1fr;
  }

  .workspace-modal-backdrop {
    padding: 0.9rem;
  }

  .workspace-modal {
    max-height: calc(100vh - 1.8rem);
  }

  .workspace-modal-header,
  .workspace-modal-footer {
    padding: 0.85rem 0.9rem;
  }

  .workspace-modal-body {
    padding: 0.9rem;
  }

  .supplier-product-form__template-scope-switch {
    grid-template-columns: 1fr;
  }

  .supplier-product-form__template-library-scroll {
    padding-left: 0.5rem;
  }

  .library-grid,
  .library-grid--templates {
    grid-template-columns: 1fr;
  }
}
</style>
