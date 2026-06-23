<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { ApiRequestError, resolveApiErrorMessage } from "../../api/client"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore, type CategoryNode } from "../../stores/platform"
import {
  fetchErpProductDetail,
  fetchErpProducts,
  fetchNextErpFinishedProductCode,
  saveErpProduct,
  updateErpProductPrimaryImage,
} from "../api"
import type { ErpProductDetail, ErpProductSaveRequest, ErpProductSummary } from "../types"

type ProductFormState = ErpProductSaveRequest
type SortKey = "online" | "sales" | "weight" | "price" | "packaging"
type SortDirection = "asc" | "desc"
type ProductCardView = ErpProductSummary & {
  orderIndex: number
  imageCount: number
  minPrice: number
  maxPrice: number
  priceLabel: string
  deliveryLabel: string
  weightLabel: string
  packagingWeightLabel: string
  salesScore: number
  channelBadges: string[]
  temuAvailable: boolean
  jitAvailable: boolean
  categoryId: string
  categoryPath: string
  summary: string
  coverUrl: string
}

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const { authHeaders } = storeToRefs(authStore)
const { categories } = storeToRefs(platformStore)

const products = ref<ErpProductSummary[]>([])
const selectedProduct = ref<ErpProductDetail | null>(null)
const detailCache = ref<Record<string, ErpProductDetail>>({})
const loading = ref(false)
const saving = ref(false)
const detailLoading = ref(false)
const previewMode = ref(false)
const error = ref("")
const keyword = ref("")
const statusFilter = ref("all")
const productTypeFilter = ref("all")
const selectedCategoryId = ref("")
const sortKey = ref<SortKey>("online")
const sortDirection = ref<SortDirection>("desc")
const currentPage = ref(1)
const pageSize = ref(12)
const pageInput = ref("1")
const editorVisible = ref(false)

const form = reactive<ProductFormState>({
  templateId: "",
  productName: "",
  productNameEn: "",
  productSku: "",
  productType: "pod_shoes",
  status: "draft",
  defaultCurrency: "USD",
  categoryId: "",
  purchasePrice: 0,
  packagingWeightGram: 0,
  packagingWeightLb: 0,
  deliveryDays: 3,
  deliveryTimeText: "",
  materialText: "",
  materialTextEn: "",
  supportPlatforms: [],
  colorOptions: [],
  sizeOptions: [],
  productDetails: [],
  productSizeRows: [],
  packagingSpecRows: [],
  finishedProductCode: "",
  primaryImageUrl: "",
  variants: [
    {
      sku: "",
      variantName: "",
      status: "active",
      attributesJson: "",
      retailPriceAmount: 0,
    },
  ],
  images: [],
})

const sortOptions = computed<Array<{ key: SortKey; label: string }>>(() => [
  { key: "online", label: t("erpProducts.sortOnline") },
  { key: "sales", label: t("erpProducts.sortSales") },
  { key: "weight", label: t("erpProducts.sortWeight") },
  { key: "price", label: t("erpProducts.sortPrice") },
  { key: "packaging", label: t("erpProducts.sortPackaging") },
])
const pageSizeOptions = [12, 24, 50]

const previewCategoryTree: CategoryNode[] = [
  {
    category_id: "cat-shoes",
    level: 1,
    name: "Shoes",
    category_path: "Shoes",
    status: "active",
    children: [
      {
        category_id: "cat-shoes-casual",
        parent_id: "cat-shoes",
        level: 2,
        name: "Casual Shoes",
        category_path: "Shoes / Casual Shoes",
        status: "active",
        children: [
          {
            category_id: "cat-shoes-casual-low",
            parent_id: "cat-shoes-casual",
            level: 3,
            name: "Low Top",
            category_path: "Shoes / Casual Shoes / Low Top",
            status: "active",
            children: [],
          },
          {
            category_id: "cat-shoes-casual-high",
            parent_id: "cat-shoes-casual",
            level: 3,
            name: "High Top",
            category_path: "Shoes / Casual Shoes / High Top",
            status: "active",
            children: [],
          },
        ],
      },
      {
        category_id: "cat-shoes-sports",
        parent_id: "cat-shoes",
        level: 2,
        name: "Sports Shoes",
        category_path: "Shoes / Sports Shoes",
        status: "active",
        children: [
          {
            category_id: "cat-shoes-sports-running",
            parent_id: "cat-shoes-sports",
            level: 3,
            name: "Running",
            category_path: "Shoes / Sports Shoes / Running",
            status: "active",
            children: [],
          },
          {
            category_id: "cat-shoes-sports-golf",
            parent_id: "cat-shoes-sports",
            level: 3,
            name: "Golf",
            category_path: "Shoes / Sports Shoes / Golf",
            status: "active",
            children: [],
          },
        ],
      },
      {
        category_id: "cat-shoes-boots",
        parent_id: "cat-shoes",
        level: 2,
        name: "Boots",
        category_path: "Shoes / Boots",
        status: "active",
        children: [
          {
            category_id: "cat-shoes-boots-winter",
            parent_id: "cat-shoes-boots",
            level: 3,
            name: "Winter Boots",
            category_path: "Shoes / Boots / Winter Boots",
            status: "active",
            children: [],
          },
          {
            category_id: "cat-shoes-boots-plush",
            parent_id: "cat-shoes-boots",
            level: 3,
            name: "Plush Boots",
            category_path: "Shoes / Boots / Plush Boots",
            status: "active",
            children: [],
          },
        ],
      },
    ],
  },
  {
    category_id: "cat-home",
    level: 1,
    name: "Home Wear",
    category_path: "Home Wear",
    status: "active",
    children: [
      {
        category_id: "cat-home-slippers",
        parent_id: "cat-home",
        level: 2,
        name: "Slippers",
        category_path: "Home Wear / Slippers",
        status: "active",
        children: [
          {
            category_id: "cat-home-slippers-cotton",
            parent_id: "cat-home-slippers",
            level: 3,
            name: "Cotton Slippers",
            category_path: "Home Wear / Slippers / Cotton Slippers",
            status: "active",
            children: [],
          },
          {
            category_id: "cat-home-slippers-plush",
            parent_id: "cat-home-slippers",
            level: 3,
            name: "Plush Slippers",
            category_path: "Home Wear / Slippers / Plush Slippers",
            status: "active",
            children: [],
          },
        ],
      },
      {
        category_id: "cat-home-indoor",
        parent_id: "cat-home",
        level: 2,
        name: "Indoor Shoes",
        category_path: "Home Wear / Indoor Shoes",
        status: "active",
        children: [
          {
            category_id: "cat-home-indoor-light",
            parent_id: "cat-home-indoor",
            level: 3,
            name: "Light Indoor",
            category_path: "Home Wear / Indoor Shoes / Light Indoor",
            status: "active",
            children: [],
          },
          {
            category_id: "cat-home-indoor-warm",
            parent_id: "cat-home-indoor",
            level: 3,
            name: "Warm Indoor",
            category_path: "Home Wear / Indoor Shoes / Warm Indoor",
            status: "active",
            children: [],
          },
        ],
      },
    ],
  },
  {
    category_id: "cat-apparel",
    level: 1,
    name: "Apparel",
    category_path: "Apparel",
    status: "active",
    children: [
      {
        category_id: "cat-apparel-tops",
        parent_id: "cat-apparel",
        level: 2,
        name: "Tops",
        category_path: "Apparel / Tops",
        status: "active",
        children: [
          {
            category_id: "cat-apparel-tops-tshirt",
            parent_id: "cat-apparel-tops",
            level: 3,
            name: "T-Shirt",
            category_path: "Apparel / Tops / T-Shirt",
            status: "active",
            children: [],
          },
          {
            category_id: "cat-apparel-tops-vest",
            parent_id: "cat-apparel-tops",
            level: 3,
            name: "Vest",
            category_path: "Apparel / Tops / Vest",
            status: "active",
            children: [],
          },
        ],
      },
    ],
  },
]

const requestedProductId = computed(() => typeof route.query.productId === "string" ? route.query.productId : "")
const selectedProductId = computed(() => selectedProduct.value?.productId ?? form.productId ?? requestedProductId.value ?? "")
const resolvedCategories = computed(() => categories.value.length ? categories.value : previewCategoryTree)
const leafCategoryOptions = computed(() => collectLeafCategories(resolvedCategories.value))
const selectedCategoryPath = computed(() => findCategoryPath(resolvedCategories.value, selectedCategoryId.value))

const editorHeadline = computed(() => {
  if (selectedProduct.value) return selectedProduct.value.productName
  return t("erpProducts.workspaceTitle")
})
const editorSubline = computed(() => {
  if (detailLoading.value) return t("erpProducts.loadingDetail")
  return form.finishedProductCode || t("erpProducts.autoCodeHint")
})

const previewProducts = computed<ProductCardView[]>(() => {
  const seed = [
    ["preview-1", "FN098", "Plush boots", "winter_boots", "active", 4, 11.13, 11.13, 3, "5-7 days", 88, true, false],
    ["preview-2", "FN061", "Plush boots", "winter_boots", "active", 5, 15.95, 16.95, 4, "5-7 days", 101, false, false],
    ["preview-3", "FN062A", "Golf Shoes with Rotating Buckles", "golf_shoes", "active", 6, 25.14, 28.14, 5, "7 days", 132, true, true],
    ["preview-4", "FN024", "High Top Casual Shoes", "casual_shoes", "active", 3, 12.07, 14.07, 4, "7 days", 104, true, true],
    ["preview-5", "FN057", "Cotton Slippers", "slippers", "active", 2, 7.07, 8.07, 2, "3-5 days", 51, true, false],
    ["preview-6", "FN003A", "Sneaker", "sports_shoes", "active", 5, 9.32, 11.32, 3, "1-3 days", 92, true, true],
    ["preview-7", "FN079A", "Sneaker", "sports_shoes", "active", 5, 11.19, 13.99, 5, "1-3 days", 128, true, true],
    ["preview-8", "FN053", "Casual Shoes", "casual_shoes", "active", 3, 7.34, 8.34, 3, "3-5 days", 85, true, false],
    ["preview-9", "FN093", "Casual Shoes", "casual_shoes", "active", 4, 18.53, 19.53, 4, "5-7 days", 112, false, false],
    ["preview-10", "FN089", "Plush Slippers", "slippers", "active", 4, 7.17, 9.17, 3, "1-3 days", 96, true, true],
    ["preview-11", "FN080", "Casual Shoes White", "casual_shoes", "active", 3, 12.49, 12.49, 3, "3-5 days", 84, true, false],
    ["preview-12", "DG001", "180g pure cotton T-shirt", "apparel", "active", 7, 5.94, 7.24, 4, "7 days", 149, true, false],
  ] as const

  return seed.map((item, index) => {
    const detail = buildPreviewBaseDetail({
      productId: item[0],
      finishedProductCode: item[1],
      productName: item[2],
      productType: item[3],
      status: item[4],
      variantCount: item[5],
      minPrice: item[6],
      maxPrice: item[7],
      imageCount: item[8],
      deliveryLabel: item[9],
      salesScore: item[10],
      temuAvailable: item[11],
      jitAvailable: item[12],
      index,
    })
    return detail
  })
})

const productSource = computed(() => previewMode.value ? previewProducts.value : enrichProducts(products.value))
const productTypeOptions = computed(() => {
  const options = new Set(productSource.value.map((item) => item.productType))
  if (productTypeFilter.value !== "all") options.add(productTypeFilter.value)
  return ["all", ...Array.from(options)]
})

const filteredProducts = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return productSource.value.filter((item) => {
    if (selectedCategoryId.value && item.categoryId !== selectedCategoryId.value) return false
    if (statusFilter.value !== "all" && item.status !== statusFilter.value) return false
    if (productTypeFilter.value !== "all" && item.productType !== productTypeFilter.value) return false
    if (!query) return true
    return (
      item.productName.toLowerCase().includes(query) ||
      item.finishedProductCode.toLowerCase().includes(query) ||
      item.categoryPath.toLowerCase().includes(query)
    )
  })
})

const sortedProducts = computed(() => {
  const rows = [...filteredProducts.value]
  const factor = sortDirection.value === "asc" ? 1 : -1
  rows.sort((left, right) => {
    if (sortKey.value === "price") return (left.minPrice - right.minPrice) * factor
    if (sortKey.value === "sales") return (left.salesScore - right.salesScore) * factor
    if (sortKey.value === "weight") return (parseWeight(left.weightLabel) - parseWeight(right.weightLabel)) * factor
    if (sortKey.value === "packaging") return (parseWeight(left.packagingWeightLabel) - parseWeight(right.packagingWeightLabel)) * factor
    return (left.orderIndex - right.orderIndex) * factor
  })
  return rows
})

const resolvedTotalPages = computed(() => Math.max(1, Math.ceil(sortedProducts.value.length / pageSize.value)))
const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedProducts.value.slice(start, start + pageSize.value)
})
const productWindowLabel = computed(() => {
  if (!sortedProducts.value.length) return t("erpProducts.windowLabel", { start: 0, end: 0, total: 0 })
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, sortedProducts.value.length)
  return t("erpProducts.windowLabel", { start, end, total: sortedProducts.value.length })
})
const catalogCountLabel = computed(() => t("erpProducts.catalogCount", { count: sortedProducts.value.length }))

watch([selectedCategoryId, statusFilter, productTypeFilter, sortKey, sortDirection, pageSize], () => {
  currentPage.value = 1
  pageInput.value = "1"
})

watch(resolvedTotalPages, (nextPages) => {
  if (currentPage.value > nextPages) {
    currentPage.value = nextPages
    pageInput.value = String(nextPages)
  }
})

function createImageUrl(prompt: string, imageSize = "landscape_4_3") {
  return `https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${imageSize}`
}

function collectLeafCategories(nodes: CategoryNode[]): CategoryNode[] {
  const output: CategoryNode[] = []
  for (const node of nodes) {
    if (node.children?.length) {
      output.push(...collectLeafCategories(node.children))
    } else {
      output.push(node)
    }
  }
  return output
}

function findCategoryPath(nodes: CategoryNode[], categoryId: string, parents: string[] = []): string {
  for (const node of nodes) {
    const chain = [...parents, node.name]
    if (node.category_id === categoryId) return chain.join(" / ")
    if (node.children?.length) {
      const nested = findCategoryPath(node.children, categoryId, chain)
      if (nested) return nested
    }
  }
  return ""
}

function findLeafCategory(productType: string, productName: string, index: number) {
  const leaves = collectLeafCategories(resolvedCategories.value)
  const haystack = `${productType} ${productName}`.toLowerCase()
  const rules: Array<{ keywords: string[] }> = [
    { keywords: ["golf"] },
    { keywords: ["boot"] },
    { keywords: ["slipper", "indoor"] },
    { keywords: ["high", "casual"] },
    { keywords: ["sneaker", "sports", "running"] },
    { keywords: ["shirt", "apparel", "vest"] },
  ]
  for (const rule of rules) {
    if (!rule.keywords.some((keywordItem) => haystack.includes(keywordItem))) continue
    const matched = leaves.find((leaf) => {
      const leafText = `${leaf.name} ${leaf.category_path || ""}`.toLowerCase()
      return rule.keywords.some((keywordItem) => leafText.includes(keywordItem))
    })
    if (matched) return matched
  }
  return leaves[index % Math.max(leaves.length, 1)] || {
    category_id: "",
    level: 3,
    name: "Uncategorized",
    category_path: "Uncategorized",
    status: "active",
    children: [],
  }
}

function resolveWeightLabel(productType: string, variantCount: number) {
  const normalized = productType.toLowerCase()
  if (normalized.includes("shoe") || normalized.includes("boot")) return `${(0.92 + variantCount * 0.18).toFixed(2)} kg`
  if (normalized.includes("slipper")) return `${(0.42 + variantCount * 0.1).toFixed(2)} kg`
  return `${(0.3 + variantCount * 0.08).toFixed(2)} kg`
}

function resolvePackagingWeightLabel(weightLabel: string, variantCount: number) {
  return `${(parseWeight(weightLabel) + 0.16 + variantCount * 0.03).toFixed(2)} kg`
}

function resolveDeliveryLabel(status: string, variantCount: number) {
  if (status === "draft") return t("erpProducts.deliveryPending")
  if (status === "archived") return t("erpProducts.deliveryArchived")
  if (variantCount >= 5) return t("erpProducts.deliveryRangeLong")
  if (variantCount >= 3) return t("erpProducts.deliveryRangeMedium")
  return t("erpProducts.deliveryRangeShort")
}

function resolveSalesScore(item: ErpProductSummary, detail?: ErpProductDetail) {
  const pricedVariants = detail?.variants.filter((variant) => Number(variant.retailPriceAmount || 0) > 0).length || 0
  const activeBonus = item.status === "active" ? 22 : item.status === "draft" ? 8 : 2
  return item.variantCount * 12 + pricedVariants * 5 + activeBonus
}

function resolveChannelBadges(item: ErpProductSummary, detail?: ErpProductDetail) {
  const badges = new Set<string>()
  if (item.status === "active") badges.add(t("erpProducts.badgeSellable"))
  if ((detail?.images.length || 0) > 1) badges.add(t("erpProducts.badgeMultiImage"))
  if (item.variantCount >= 3) badges.add(t("erpProducts.badgeMultiVariant"))
  if (item.productType.toLowerCase().includes("shoe")) badges.add(t("erpProducts.badgeFootwear"))
  return Array.from(badges).slice(0, 3)
}

function resolveProductStatusLabel(status: string) {
  if (status === "draft") return t("erpProducts.statusDraft")
  if (status === "active") return t("erpProducts.statusActive")
  if (status === "archived") return t("erpProducts.statusArchived")
  return status
}

function resolveVariantStatusLabel(status: string) {
  if (status === "active") return t("erpProducts.statusActive")
  if (status === "inactive") return t("erpProducts.statusInactive")
  return status
}

function resolveChannelAvailability(type: "temu" | "jit", enabled: boolean) {
  if (type === "temu") return enabled ? t("erpProducts.temuAvailable") : t("erpProducts.temuUnavailable")
  return enabled ? t("erpProducts.jitAvailable") : t("erpProducts.jitUnavailable")
}

function parseWeight(value: string) {
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function resolveCoverUrl(productName: string, productType: string, explicitUrl?: string) {
  if (explicitUrl) return explicitUrl
  return createImageUrl(`realistic ecommerce product photo of ${productName}, ${productType}, clean studio lighting, neutral background, catalog style`, "portrait_4_3")
}

function buildProductView(item: ErpProductSummary, index: number, detail?: ErpProductDetail, explicit?: Partial<ProductCardView>) {
  const retailPrices = detail?.variants
    .map((variant) => Number(variant.retailPriceAmount || 0))
    .filter((value) => value > 0) || []
  const minPrice = explicit?.minPrice ?? (retailPrices.length ? Math.min(...retailPrices) : 0)
  const maxPrice = explicit?.maxPrice ?? (retailPrices.length ? Math.max(...retailPrices) : minPrice)
  const categoryLeaf = findLeafCategory(item.productType, item.productName, index)
  const weightLabel = explicit?.weightLabel || resolveWeightLabel(item.productType, item.variantCount)
  const packagingWeightLabel = explicit?.packagingWeightLabel || resolvePackagingWeightLabel(weightLabel, item.variantCount)
  const priceLabel = explicit?.priceLabel || `${item.defaultCurrency} ${minPrice.toFixed(2)}${maxPrice > minPrice ? ` - ${maxPrice.toFixed(2)}` : ""}`
  const detailSummary = explicit?.summary || `${item.productName} · ${item.finishedProductCode} · ${categoryLeaf.category_path || categoryLeaf.name}`
  return {
    ...item,
    orderIndex: explicit?.orderIndex ?? index,
    imageCount: explicit?.imageCount ?? (detail?.images.length ?? 0),
    minPrice,
    maxPrice,
    priceLabel,
    deliveryLabel: explicit?.deliveryLabel || resolveDeliveryLabel(item.status, item.variantCount),
    weightLabel,
    packagingWeightLabel,
    salesScore: explicit?.salesScore ?? resolveSalesScore(item, detail),
    channelBadges: explicit?.channelBadges || resolveChannelBadges(item, detail),
    temuAvailable: explicit?.temuAvailable ?? true,
    jitAvailable: explicit?.jitAvailable ?? (item.status === "active"),
    categoryId: explicit?.categoryId || categoryLeaf.category_id,
    categoryPath: explicit?.categoryPath || categoryLeaf.category_path || categoryLeaf.name,
    summary: detailSummary,
    coverUrl: explicit?.coverUrl || resolveCoverUrl(item.productName, item.productType, item.primaryImageUrl),
  }
}

function enrichProducts(rows: ErpProductSummary[]) {
  return rows.map((item, index) => buildProductView(item, index, detailCache.value[item.productId]))
}

function buildPreviewBaseDetail(input: {
  productId: string
  finishedProductCode: string
  productName: string
  productType: string
  status: string
  variantCount: number
  minPrice: number
  maxPrice: number
  imageCount: number
  deliveryLabel: string
  salesScore: number
  temuAvailable: boolean
  jitAvailable: boolean
  index: number
}) {
  const base: ErpProductSummary = {
    productId: input.productId,
    finishedProductCode: input.finishedProductCode,
    productName: input.productName,
    productType: input.productType,
    status: input.status,
    defaultCurrency: "USD",
    primaryImageUrl: "",
    variantCount: input.variantCount,
  }
  return buildProductView(base, input.index, undefined, {
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    deliveryLabel: input.deliveryLabel,
    salesScore: input.salesScore,
    imageCount: input.imageCount,
    temuAvailable: input.temuAvailable,
    jitAvailable: input.jitAvailable,
    channelBadges: [
      resolveChannelAvailability("temu", input.temuAvailable),
      resolveChannelAvailability("jit", input.jitAvailable),
      t("erpProducts.previewTag"),
    ],
    summary: t("erpProducts.previewSummary", { name: input.productName }),
    coverUrl: resolveCoverUrl(input.productName, input.productType),
  })
}

function buildPreviewDetail(card: ProductCardView, payload?: ErpProductSaveRequest): ErpProductDetail {
  const fallbackPayload = payload || {
    productName: card.productName,
    productNameEn: card.productNameEn || card.productName,
    productSku: card.productSku || card.finishedProductCode,
    productType: card.productType,
    status: card.status,
    defaultCurrency: card.defaultCurrency,
    categoryId: card.categoryId,
    purchasePrice: card.purchasePrice,
    packagingWeightGram: card.packagingWeightGram,
    packagingWeightLb: card.packagingWeightLb,
    deliveryDays: card.deliveryDays,
    deliveryTimeText: card.deliveryTimeText,
    materialText: card.materialText,
    materialTextEn: card.materialTextEn,
    supportPlatforms: card.supportPlatforms || [],
    colorOptions: [],
    sizeOptions: [],
    productDetails: [],
    productSizeRows: [],
    packagingSpecRows: [],
    finishedProductCode: card.finishedProductCode,
    primaryImageUrl: card.coverUrl,
    variants: [],
    images: [],
  }
  return {
    productId: card.productId,
    tenantId: "preview-tenant",
    finishedProductCode: card.finishedProductCode,
    productName: fallbackPayload.productName,
    productNameEn: fallbackPayload.productNameEn,
    productSku: fallbackPayload.productSku,
    productType: fallbackPayload.productType,
    status: fallbackPayload.status,
    defaultCurrency: fallbackPayload.defaultCurrency,
    primaryImageUrl: fallbackPayload.primaryImageUrl || card.coverUrl,
    categoryId: fallbackPayload.categoryId,
    categoryPath: findCategoryPath(resolvedCategories.value, fallbackPayload.categoryId || ""),
    purchasePrice: fallbackPayload.purchasePrice,
    packagingWeightGram: fallbackPayload.packagingWeightGram,
    packagingWeightLb: fallbackPayload.packagingWeightLb,
    deliveryDays: fallbackPayload.deliveryDays,
    deliveryTimeText: fallbackPayload.deliveryTimeText,
    materialText: fallbackPayload.materialText,
    materialTextEn: fallbackPayload.materialTextEn,
    supportPlatforms: fallbackPayload.supportPlatforms,
    colorOptions: fallbackPayload.colorOptions,
    sizeOptions: fallbackPayload.sizeOptions,
    productDetails: fallbackPayload.productDetails,
    productSizeRows: fallbackPayload.productSizeRows,
    packagingSpecRows: fallbackPayload.packagingSpecRows,
    variants: (fallbackPayload.variants.length ? fallbackPayload.variants : Array.from({ length: Math.max(card.variantCount, 1) }, (_, index) => ({
      variantId: `${card.productId}-variant-${index + 1}`,
      sku: `${card.finishedProductCode}-${index + 1}`,
      variantName: t("erpProducts.variantNameFallback", { index: index + 1 }),
      status: "active",
      attributesJson: JSON.stringify({ size: 38 + index, color: index % 2 === 0 ? "White" : "Black" }),
      retailPriceAmount: Number((card.minPrice + index * 0.4).toFixed(2)),
    }))).map((variant, index) => ({
      variantId: variant.variantId || `${card.productId}-variant-${index + 1}`,
      sku: variant.sku,
      variantName: variant.variantName,
      status: variant.status,
      attributesJson: variant.attributesJson || "",
      retailPriceAmount: Number(variant.retailPriceAmount || 0),
    })),
    images: (fallbackPayload.images.length ? fallbackPayload.images : Array.from({ length: Math.max(card.imageCount, 1) }, (_, index) => ({
      imageId: `${card.productId}-image-${index + 1}`,
      imageUrl: card.coverUrl,
      altText: `${card.productName} ${index + 1}`,
      sortOrder: index,
      primary: index === 0,
    }))).map((image, index) => ({
      imageId: image.imageId || `${card.productId}-image-${index + 1}`,
      imageUrl: image.imageUrl,
      altText: image.altText || `${card.productName} ${index + 1}`,
      sortOrder: image.sortOrder,
      primary: image.primary,
    })),
  }
}

function resetForm(close = true) {
  selectedProduct.value = null
  if (close) editorVisible.value = false
  Object.assign(form, {
    productId: undefined,
    productName: "",
    productNameEn: "",
    productSku: "",
    productType: "pod_shoes",
    status: "draft",
    defaultCurrency: "USD",
    categoryId: "",
    purchasePrice: 0,
    packagingWeightGram: 0,
    packagingWeightLb: 0,
    deliveryDays: 3,
    deliveryTimeText: "",
    materialText: "",
    materialTextEn: "",
    supportPlatforms: [],
    colorOptions: [],
    sizeOptions: [],
    productDetails: [],
    productSizeRows: [],
    packagingSpecRows: [],
    finishedProductCode: "",
    primaryImageUrl: "",
    variants: [
      {
        sku: "",
        variantName: "",
        status: "active",
        attributesJson: "",
        retailPriceAmount: 0,
      },
    ],
    images: [],
  })
}

function syncForm(detail: ErpProductDetail) {
  detailCache.value = {
    ...detailCache.value,
    [detail.productId]: detail,
  }
  selectedProduct.value = detail
  Object.assign(form, {
    productId: detail.productId,
    productName: detail.productName,
    productNameEn: detail.productNameEn || "",
    productSku: detail.productSku || "",
    productType: detail.productType,
    status: detail.status,
    defaultCurrency: detail.defaultCurrency,
    categoryId: detail.categoryId || "",
    purchasePrice: detail.purchasePrice ?? 0,
    packagingWeightGram: detail.packagingWeightGram ?? 0,
    packagingWeightLb: detail.packagingWeightLb ?? 0,
    deliveryDays: detail.deliveryDays ?? 0,
    deliveryTimeText: detail.deliveryTimeText || "",
    materialText: detail.materialText || "",
    materialTextEn: detail.materialTextEn || "",
    supportPlatforms: detail.supportPlatforms || [],
    colorOptions: detail.colorOptions || [],
    sizeOptions: detail.sizeOptions || [],
    productDetails: detail.productDetails || [],
    productSizeRows: detail.productSizeRows || [],
    packagingSpecRows: detail.packagingSpecRows || [],
    finishedProductCode: detail.finishedProductCode,
    primaryImageUrl: detail.primaryImageUrl,
    variants: detail.variants.map((variant) => ({
      variantId: variant.variantId,
      sku: variant.sku,
      variantName: variant.variantName,
      status: variant.status,
      attributesJson: variant.attributesJson,
      retailPriceAmount: Number(variant.retailPriceAmount || 0),
    })),
    images: detail.images.map((image) => ({
      imageId: image.imageId,
      imageUrl: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
      primary: image.primary,
    })),
  })
}

async function warmDetailCache(rows: ErpProductSummary[]) {
  const missingIds = rows.map((item) => item.productId).filter((productId) => !detailCache.value[productId])
  if (!missingIds.length) return
  const settled = await Promise.allSettled(missingIds.map((productId) => fetchErpProductDetail(productId)))
  const nextCache = { ...detailCache.value }
  settled.forEach((result) => {
    if (result.status === "fulfilled") nextCache[result.value.productId] = result.value
  })
  detailCache.value = nextCache
}

async function loadCategoryTree() {
  try {
    await platformStore.loadTemplateCategories(authHeaders.value)
  } catch {
    // Fallback categories are rendered when the template category API is unavailable.
  }
}

async function loadProducts() {
  loading.value = true
  error.value = ""
  previewMode.value = false
  try {
    const rows = await fetchErpProducts({
      keyword: keyword.value.trim(),
      status: statusFilter.value,
      productType: productTypeFilter.value,
    })
    products.value = rows
    await warmDetailCache(rows)
  } catch (err) {
    if (import.meta.env.DEV) {
      previewMode.value = true
      products.value = []
      error.value = t("erpProducts.loadFallback")
    } else {
      error.value = err instanceof Error ? err.message : String(err)
      products.value = []
    }
  } finally {
    currentPage.value = 1
    pageInput.value = "1"
    loading.value = false
  }
}

async function createDraft() {
  resetForm(false)
  editorVisible.value = true
  try {
    const code = await fetchNextErpFinishedProductCode()
    form.finishedProductCode = code.value
  } catch {
    form.finishedProductCode = `FG-PREVIEW-${Date.now().toString().slice(-6)}`
  }
}

async function openProduct(productId: string) {
  editorVisible.value = true
  if (previewMode.value) {
    const previewItem = previewProducts.value.find((item) => item.productId === productId)
    if (previewItem) syncForm(buildPreviewDetail(previewItem))
    return
  }
  detailLoading.value = true
  error.value = ""
  try {
    const cached = detailCache.value[productId]
    if (cached) syncForm(cached)
    const detail = await fetchErpProductDetail(productId)
    syncForm(detail)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    detailLoading.value = false
  }
}

function addVariant() {
  form.variants.push({
    sku: "",
    variantName: "",
    status: "active",
    attributesJson: JSON.stringify({ color: "", size: "" }),
    retailPriceAmount: 0,
  })
}

function removeVariant(index: number) {
  form.variants = form.variants.filter((_, itemIndex) => itemIndex !== index)
}

function addImage() {
  form.images.push({
    imageUrl: "",
    altText: "",
    sortOrder: form.images.length,
    primary: form.images.length === 0,
  })
}

function removeImage(index: number) {
  const nextImages = form.images.filter((_, itemIndex) => itemIndex !== index)
  const previousPrimaryUrl = form.primaryImageUrl
  let nextPrimaryUrl = previousPrimaryUrl
  if (previousPrimaryUrl && !nextImages.some((image) => image.imageUrl === previousPrimaryUrl)) {
    nextPrimaryUrl = nextImages[0]?.imageUrl || ""
  }
  form.primaryImageUrl = nextPrimaryUrl
  form.images = nextImages.map((image, itemIndex) => ({
    ...image,
    sortOrder: itemIndex,
    primary: Boolean(nextPrimaryUrl) && image.imageUrl === nextPrimaryUrl,
  }))
}

function updateTextList(field: "colorOptions" | "sizeOptions", rawValue: string) {
  form[field] = rawValue
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function toggleSupportPlatform(platform: string, checked: boolean) {
  const current = new Set(form.supportPlatforms || [])
  if (checked) current.add(platform)
  else current.delete(platform)
  form.supportPlatforms = Array.from(current)
}

function addDetailField() {
  form.productDetails = [...(form.productDetails || []), { label: "", value: "" }]
}

function removeDetailField(index: number) {
  form.productDetails = (form.productDetails || []).filter((_, itemIndex) => itemIndex !== index)
}

function addSizeRow() {
  form.productSizeRows = [...(form.productSizeRows || []), { sizeLabel: "", dimensionLabel: "" }]
}

function removeSizeRow(index: number) {
  form.productSizeRows = (form.productSizeRows || []).filter((_, itemIndex) => itemIndex !== index)
}

function parseSizeRowDimension(value?: string) {
  const [overseasSize = "", innerLength = ""] = (value || "")
    .split("|")
    .map((item) => item.trim())
  return { overseasSize, innerLength }
}

function getSizeRowPart(index: number, key: "overseasSize" | "innerLength") {
  const row = form.productSizeRows?.[index]
  if (!row) return ""
  return parseSizeRowDimension(row.dimensionLabel)[key]
}

function updateSizeRowPart(index: number, key: "overseasSize" | "innerLength", value: string) {
  const row = form.productSizeRows?.[index]
  if (!row) return
  const parsed = parseSizeRowDimension(row.dimensionLabel)
  parsed[key] = value.trim()
  row.dimensionLabel = [parsed.overseasSize, parsed.innerLength].filter(Boolean).join(" | ")
}

function addPackagingSpecRow() {
  form.packagingSpecRows = [
    ...(form.packagingSpecRows || []),
    {
      sizeLabel: "",
      packagingSizeCm: "",
      packagingSizeInch: "",
      packagingVolumeCm: "",
      packagingVolumeInch: "",
      packingWeightGram: "",
      packageWeightLb: "",
    },
  ]
}

function removePackagingSpecRow(index: number) {
  form.packagingSpecRows = (form.packagingSpecRows || []).filter((_, itemIndex) => itemIndex !== index)
}

function parseVariantAttributes(attributesJson?: string) {
  if (!attributesJson?.trim()) return {}
  try {
    const parsed = JSON.parse(attributesJson)
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function getVariantAttribute(attributesJson: string | undefined, key: string) {
  const parsed = parseVariantAttributes(attributesJson)
  const value = parsed[key]
  return typeof value === "string" ? value : ""
}

function updateVariantAttribute(index: number, key: string, value: string) {
  const variant = form.variants[index]
  if (!variant) return
  const parsed = parseVariantAttributes(variant.attributesJson)
  if (value.trim()) parsed[key] = value.trim()
  else delete parsed[key]
  variant.attributesJson = Object.keys(parsed).length ? JSON.stringify(parsed) : ""
  const nextName = [parsed.color, parsed.size].filter(Boolean).join(" / ")
  if (nextName) variant.variantName = nextName
}

function splitDimensionTriplet(value?: string) {
  const parts = (value || "")
    .split("*")
    .map((item) => item.trim())
    .filter((item, index) => item || index < 3)
  return [parts[0] || "", parts[1] || "", parts[2] || ""]
}

function updatePackagingDimension(
  rowIndex: number,
  field: "packagingSizeCm" | "packagingSizeInch",
  partIndex: number,
  value: string,
) {
  const row = form.packagingSpecRows?.[rowIndex]
  if (!row) return
  const parts = splitDimensionTriplet(row[field])
  parts[partIndex] = value.trim()
  row[field] = parts.some(Boolean) ? parts.join(" * ") : ""
}

function updatePackagingMetric(
  rowIndex: number,
  field: "packagingVolumeCm" | "packagingVolumeInch" | "packingWeightGram" | "packageWeightLb",
  value: string,
) {
  const row = form.packagingSpecRows?.[rowIndex]
  if (!row) return
  row[field] = value.trim()
}

function resolveSaveErrorMessage(error: unknown) {
  const message = resolveApiErrorMessage(error)
  if (message.includes("erp category id is required")) return t("erpProducts.errorCategoryRequired")
  if (message.includes("erp category does not exist")) return t("erpProducts.errorCategoryMissing")
  if (message.includes("erp leaf category is required")) return t("erpProducts.errorCategoryLeafRequired")
  return message
}

function validateProductForm() {
  if (!form.productName.trim()) return t("erpProducts.validationName")
  if (!form.productNameEn.trim()) return t("erpProducts.validationNameEn")
  if (!form.productSku.trim()) return t("erpProducts.validationSku")
  if (!form.categoryId?.trim()) return t("erpProducts.validationCategory")
  if (!Number.isFinite(Number(form.purchasePrice)) || Number(form.purchasePrice) < 0) return t("erpProducts.validationPrice")
  if (!Number.isFinite(Number(form.deliveryDays)) || Number(form.deliveryDays) < 1) return t("erpProducts.validationDeliveryDays")
  if (!Number.isFinite(Number(form.packagingWeightGram)) || Number(form.packagingWeightGram) < 0) return t("erpProducts.validationWeightGram")
  if (!Number.isFinite(Number(form.packagingWeightLb)) || Number(form.packagingWeightLb) < 0) return t("erpProducts.validationWeightLb")
  if (!(form.supportPlatforms || []).length) return t("erpProducts.validationPlatform")
  if (!(form.sizeOptions || []).length) return t("erpProducts.validationSize")
  if (!(form.packagingSpecRows || []).length) return t("erpProducts.validationPackaging")
  if (!form.images.length || !form.images.some((item) => item.imageUrl.trim())) return t("erpProducts.validationImages")
  if (!form.variants.length || !form.variants.every((item) => item.sku.trim() && item.variantName.trim())) {
    return t("erpProducts.validationVariants")
  }
  return ""
}

function normalizeProductPayload(): ErpProductSaveRequest {
  return {
    ...form,
    productName: form.productName.trim(),
    productNameEn: form.productNameEn.trim(),
    productSku: form.productSku.trim(),
    productType: form.productType.trim(),
    status: form.status.trim(),
    defaultCurrency: form.defaultCurrency.trim(),
    categoryId: form.categoryId?.trim(),
    deliveryTimeText: form.deliveryTimeText?.trim(),
    materialText: form.materialText?.trim(),
    materialTextEn: form.materialTextEn?.trim(),
    supportPlatforms: (form.supportPlatforms || []).filter(Boolean),
    colorOptions: (form.colorOptions || []).map((item) => item.trim()).filter(Boolean),
    sizeOptions: (form.sizeOptions || []).map((item) => item.trim()).filter(Boolean),
    productDetails: (form.productDetails || [])
      .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
      .filter((item) => item.label || item.value),
    productSizeRows: (form.productSizeRows || [])
      .map((item) => ({ sizeLabel: item.sizeLabel.trim(), dimensionLabel: item.dimensionLabel.trim() }))
      .filter((item) => item.sizeLabel || item.dimensionLabel),
    packagingSpecRows: (form.packagingSpecRows || [])
      .map((item) => ({
        sizeLabel: item.sizeLabel.trim(),
        packagingSizeCm: item.packagingSizeCm.trim(),
        packagingSizeInch: item.packagingSizeInch.trim(),
        packagingVolumeCm: item.packagingVolumeCm.trim(),
        packagingVolumeInch: item.packagingVolumeInch.trim(),
        packingWeightGram: item.packingWeightGram.trim(),
        packageWeightLb: item.packageWeightLb.trim(),
      }))
      .filter((item) =>
        item.sizeLabel
        || item.packagingSizeCm
        || item.packagingSizeInch
        || item.packagingVolumeCm
        || item.packagingVolumeInch
        || item.packingWeightGram
        || item.packageWeightLb,
      ),
    variants: form.variants.map((variant) => ({
      ...variant,
      sku: variant.sku.trim(),
      variantName: variant.variantName.trim(),
      status: variant.status.trim(),
      attributesJson: variant.attributesJson?.trim(),
      retailPriceAmount: Number(variant.retailPriceAmount || 0),
    })),
    images: form.images
      .map((image, index) => ({
        ...image,
        imageUrl: image.imageUrl.trim(),
        altText: image.altText?.trim(),
        sortOrder: index,
        primary: image.imageUrl === form.primaryImageUrl || image.primary,
      }))
      .filter((image) => image.imageUrl),
  }
}

async function markPrimary(imageId?: string, imageUrl?: string) {
  if (!imageUrl) return
  if (!form.productId || !imageId) {
    form.primaryImageUrl = imageUrl
    form.images = form.images.map((image) => ({ ...image, primary: image.imageUrl === imageUrl }))
    return
  }
  const detail = await updateErpProductPrimaryImage(form.productId, imageId)
  syncForm(detail)
  await loadProducts()
}

async function saveProductForm() {
  const validationMessage = validateProductForm()
  if (validationMessage) {
    error.value = validationMessage
    return
  }

  saving.value = true
  error.value = ""
  try {
    const payload = normalizeProductPayload()
    const detail = await saveErpProduct(payload)
    syncForm(detail)
    await loadProducts()
  } catch (err) {
    if (err instanceof ApiRequestError) {
      error.value = resolveSaveErrorMessage(err)
    } else if (import.meta.env.DEV) {
      const payload = normalizeProductPayload()
      const priceValues = payload.variants.map((variant) => Number(variant.retailPriceAmount || 0)).filter((value) => value > 0)
      const previewCard = buildProductView({
        productId: payload.productId || `preview-${Date.now()}`,
        finishedProductCode: payload.finishedProductCode || `FG-PREVIEW-${Date.now().toString().slice(-6)}`,
        productName: payload.productName || t("common.noData"),
        productNameEn: payload.productNameEn || t("erpProducts.untitledProduct"),
        productSku: payload.productSku || "",
        productType: payload.productType || "preview_type",
        status: payload.status || "draft",
        defaultCurrency: payload.defaultCurrency || "USD",
        primaryImageUrl: payload.primaryImageUrl || "",
        variantCount: payload.variants.length,
        categoryId: payload.categoryId,
        purchasePrice: payload.purchasePrice,
        packagingWeightGram: payload.packagingWeightGram,
        packagingWeightLb: payload.packagingWeightLb,
        deliveryDays: payload.deliveryDays,
        deliveryTimeText: payload.deliveryTimeText,
        materialText: payload.materialText,
        materialTextEn: payload.materialTextEn,
        supportPlatforms: payload.supportPlatforms,
      }, 0, undefined, {
        minPrice: priceValues.length ? Math.min(...priceValues) : 0,
        maxPrice: priceValues.length ? Math.max(...priceValues) : 0,
        imageCount: payload.images.length,
        categoryId: payload.categoryId || "",
        categoryPath: findCategoryPath(resolvedCategories.value, payload.categoryId || ""),
        channelBadges: [t("erpProducts.previewBadge")],
        summary: t("erpProducts.previewSaved"),
      })
      syncForm(buildPreviewDetail(previewCard, payload))
      error.value = t("erpProducts.previewFallback")
    } else {
      error.value = resolveSaveErrorMessage(err)
    }
  } finally {
    saving.value = false
  }
}

function resetFilters() {
  keyword.value = ""
  statusFilter.value = "all"
  productTypeFilter.value = "all"
  sortKey.value = "online"
  sortDirection.value = "desc"
  selectedCategoryId.value = ""
  void loadProducts()
}

function applyFilters() {
  void loadProducts()
}

function toggleSort(nextKey: SortKey) {
  if (sortKey.value === nextKey) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
  } else {
    sortKey.value = nextKey
    sortDirection.value = nextKey === "online" ? "desc" : "asc"
  }
}

function goToPreviousPage() {
  currentPage.value = Math.max(1, currentPage.value - 1)
  pageInput.value = String(currentPage.value)
}

function goToNextPage() {
  currentPage.value = Math.min(resolvedTotalPages.value, currentPage.value + 1)
  pageInput.value = String(currentPage.value)
}

function changePageSize(nextValue: string) {
  pageSize.value = Number(nextValue)
  currentPage.value = 1
  pageInput.value = "1"
}

function jumpToPage() {
  const target = Number(pageInput.value)
  if (!Number.isFinite(target) || target < 1) {
    pageInput.value = String(currentPage.value)
    return
  }
  currentPage.value = Math.min(resolvedTotalPages.value, Math.floor(target))
  pageInput.value = String(currentPage.value)
}

onMounted(async () => {
  await Promise.all([loadCategoryTree(), loadProducts()])
  if (requestedProductId.value) await openProduct(requestedProductId.value)
})
</script>

<template>
  <section class="erp-products-page">
    <header class="erp-products-page__header">
      <div class="erp-products-page__header-main">
        <p class="erp-products-page__eyebrow">{{ t("erpProducts.eyebrow") }}</p>
        <h1>{{ t("erpProducts.title") }}</h1>
        <p>{{ t("erpProducts.description") }}</p>
      </div>
      <div class="erp-products-page__header-meta">
        <span class="erp-products-page__header-chip">{{ previewMode ? t("erpProducts.localPreview") : t("erpProducts.liveData") }}</span>
        <span class="erp-products-page__header-chip">{{ catalogCountLabel }}</span>
        <span class="erp-products-page__header-chip">{{ t("erpProducts.pageCount", { count: resolvedTotalPages }) }}</span>
      </div>
    </header>

    <div v-if="error" class="erp-products-page__notice" :class="{ 'erp-products-page__notice--error': true }">
      {{ error }}
    </div>

    <div class="erp-products-page__layout">
      <aside class="erp-products-page__sidebar">
        <div class="erp-products-page__panel-title">
          <div>
            <h2>{{ t("erpProducts.categoryTree") }}</h2>
            <p>{{ t("erpProducts.categoryTreeHint") }}</p>
          </div>
          <button v-if="selectedCategoryId" type="button" class="erp-products-page__text-button" @click="selectedCategoryId = ''">
            {{ t("erpProducts.clear") }}
          </button>
        </div>

        <CategoryCascadeSelector
          v-model="selectedCategoryId"
          :categories="resolvedCategories"
          display-mode="sidebar"
          :show-recent-options="false"
          :show-selection-summary="false"
          :level1-placeholder="t('erpProducts.categoryLevel1')"
          :level2-placeholder="t('erpProducts.categoryLevel2')"
          :level3-placeholder="t('erpProducts.categoryLevel3')"
        />

        <div class="erp-products-page__category-summary">
          <span class="erp-products-page__summary-label">{{ t("erpProducts.currentCategory") }}</span>
          <strong>{{ selectedCategoryPath || t("erpProducts.allCategories") }}</strong>
        </div>
      </aside>

      <div class="erp-products-page__main">
        <section class="erp-products-page__filters">
          <div class="erp-products-page__search">
            <input
              v-model="keyword"
              type="text"
              :placeholder="t('erpProducts.searchPlaceholder')"
              @keyup.enter="applyFilters"
            />
            <button type="button" class="erp-products-page__primary" @click="applyFilters">{{ t("common.apply") }}</button>
            <button type="button" class="erp-products-page__secondary" @click="resetFilters">{{ t("common.reset") }}</button>
          </div>

          <div class="erp-products-page__filter-row">
            <label>
              <span>{{ t("erpProducts.status") }}</span>
              <select v-model="statusFilter" @change="applyFilters">
                <option value="all">{{ t("common.all") }}</option>
                <option value="draft">{{ t("erpProducts.statusDraft") }}</option>
                <option value="active">{{ t("erpProducts.statusActive") }}</option>
                <option value="archived">{{ t("erpProducts.statusArchived") }}</option>
              </select>
            </label>

            <label>
              <span>{{ t("erpProducts.type") }}</span>
              <select v-model="productTypeFilter" @change="applyFilters">
                <option v-for="type in productTypeOptions" :key="type" :value="type">
                  {{ type === "all" ? t("common.all") : type }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ t("erpProducts.sortField") }}</span>
              <select v-model="sortKey">
                <option v-for="option in sortOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
              </select>
            </label>

            <label>
              <span>{{ t("erpProducts.sortDirection") }}</span>
              <select v-model="sortDirection">
                <option value="desc">{{ t("erpProducts.sortDesc") }}</option>
                <option value="asc">{{ t("erpProducts.sortAsc") }}</option>
              </select>
            </label>

            <div class="erp-products-page__filter-actions">
              <button type="button" class="erp-products-page__secondary" @click="toggleSort(sortKey)">{{ t("erpProducts.toggleDirection") }}</button>
              <button type="button" class="erp-products-page__primary" @click="createDraft">{{ t("erpProducts.addProduct") }}</button>
            </div>
          </div>

          <div class="erp-products-page__filter-summary">
            <span>{{ selectedCategoryPath || t("erpProducts.allCategories") }}</span>
            <span>{{ sortOptions.find((item) => item.key === sortKey)?.label }} · {{ sortDirection === "desc" ? t("erpProducts.sortDesc") : t("erpProducts.sortAsc") }}</span>
            <span>{{ productWindowLabel }}</span>
          </div>
        </section>

        <section class="erp-products-page__catalog">
          <header class="erp-products-page__catalog-header">
            <div>
              <h2>{{ t("erpProducts.productCards") }}</h2>
              <p>{{ loading ? t("common.loading") : catalogCountLabel }}</p>
            </div>
            <div class="erp-products-page__catalog-meta">
              <span>{{ productWindowLabel }}</span>
              <span>{{ previewMode ? t("erpProducts.localPreview") : t("erpProducts.liveData") }}</span>
            </div>
          </header>

          <div v-if="loading" class="erp-products-page__empty">
            <strong>{{ t("erpProducts.loadingProducts") }}</strong>
            <p>{{ t("erpProducts.loadingProductsHint") }}</p>
          </div>

          <div v-else-if="!pagedProducts.length" class="erp-products-page__empty">
            <strong>{{ t("erpProducts.emptyProducts") }}</strong>
            <p>{{ t("erpProducts.emptyProductsHint") }}</p>
          </div>

          <div v-else class="erp-products-page__grid">
            <article
              v-for="item in pagedProducts"
              :key="item.productId"
              class="erp-product-card"
              :class="{ 'is-active': item.productId === selectedProductId }"
              tabindex="0"
              @click="openProduct(item.productId)"
            >
              <div class="erp-product-card__cover">
                <img :src="item.coverUrl" :alt="item.productName" />
                <span class="erp-product-card__status">{{ resolveProductStatusLabel(item.status) }}</span>
              </div>

              <div class="erp-product-card__body">
                <div class="erp-product-card__head">
                  <div>
                    <h3>{{ item.productName }}</h3>
                    <p>{{ item.finishedProductCode }}</p>
                  </div>
                  <strong>{{ item.priceLabel }}</strong>
                </div>

                <p class="erp-product-card__category">{{ item.categoryPath }}</p>

                <div class="erp-product-card__meta">
                  <span>{{ item.deliveryLabel }}</span>
                  <span>{{ item.weightLabel }}</span>
                  <span>{{ item.packagingWeightLabel }}</span>
                </div>

                <div class="erp-product-card__tags">
                  <span v-for="badge in item.channelBadges" :key="`${item.productId}-${badge}`">{{ badge }}</span>
                </div>
              </div>

              <div class="erp-product-card__hover" aria-hidden="true">
                <strong>{{ t("erpProducts.coreInfo") }}</strong>
                <p>{{ item.summary }}</p>
                <dl>
                  <div>
                    <dt>{{ t("erpProducts.finishedCode") }}</dt>
                    <dd>{{ item.finishedProductCode }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("erpProducts.category") }}</dt>
                    <dd>{{ item.categoryPath }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("erpProducts.delivery") }}</dt>
                    <dd>{{ item.deliveryLabel }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("erpProducts.channels") }}</dt>
                    <dd>{{ resolveChannelAvailability("temu", item.temuAvailable) }} / {{ resolveChannelAvailability("jit", item.jitAvailable) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("erpProducts.variantCount") }}</dt>
                    <dd>{{ item.variantCount }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("erpProducts.sales") }}</dt>
                    <dd>{{ item.salesScore }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>

          <footer class="erp-products-page__pagination">
            <button type="button" class="erp-products-page__secondary" :disabled="currentPage === 1" @click="goToPreviousPage">
              {{ t("erpProducts.previousPage") }}
            </button>

            <div class="erp-products-page__pagination-meta">
              <span>{{ productWindowLabel }}</span>
              <label class="erp-products-page__pagination-label">
                <span>{{ t("erpProducts.perPage") }}</span>
                <select :value="String(pageSize)" @change="changePageSize(($event.target as HTMLSelectElement).value)">
                  <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                </select>
              </label>
              <label class="erp-products-page__pagination-label">
                <span>{{ t("erpProducts.goToPage") }}</span>
                <input v-model="pageInput" type="text" inputmode="numeric" @keyup.enter="jumpToPage" />
              </label>
            </div>

            <button type="button" class="erp-products-page__secondary" :disabled="currentPage === resolvedTotalPages" @click="goToNextPage">
              {{ t("erpProducts.nextPage") }}
            </button>
          </footer>
        </section>
      </div>
    </div>

    <div v-if="editorVisible" class="erp-products-page__workspace-mask" @click.self="editorVisible = false">
      <section class="erp-products-page__workspace">
        <header class="erp-products-page__workspace-header">
          <div>
            <h2>{{ editorHeadline }}</h2>
            <p>{{ editorSubline }}</p>
          </div>
          <div class="erp-products-page__workspace-actions">
            <button type="button" class="erp-products-page__primary" :disabled="saving" @click="saveProductForm">
              {{ saving ? t("erpProducts.saving") : t("erpProducts.saveProduct") }}
            </button>
            <button type="button" class="erp-products-page__secondary" @click="resetForm()">{{ t("erpProducts.close") }}</button>
          </div>
        </header>

        <div class="erp-products-page__form-grid">
          <label>
            <span>{{ t("form.finishedCode") }}</span>
            <input v-model="form.finishedProductCode" type="text" />
          </label>
          <label>
            <span>{{ t("form.name") }}</span>
            <input v-model="form.productName" type="text" />
          </label>
          <label>
            <span>{{ t("form.nameEn") }}</span>
            <input v-model="form.productNameEn" type="text" />
          </label>
          <label>
            <span>{{ t("form.sku") }}</span>
            <input v-model="form.productSku" type="text" />
          </label>
          <label>
            <span>{{ t("erpProducts.productType") }}</span>
            <input v-model="form.productType" type="text" />
          </label>
          <label>
            <span>{{ t("erpProducts.status") }}</span>
            <select v-model="form.status">
              <option value="draft">{{ t("erpProducts.statusDraft") }}</option>
              <option value="active">{{ t("erpProducts.statusActive") }}</option>
              <option value="archived">{{ t("erpProducts.statusArchived") }}</option>
            </select>
          </label>
          <label>
            <span>{{ t("form.currency") }}</span>
            <select v-model="form.defaultCurrency">
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
            </select>
          </label>
          <label>
            <span>{{ t("form.category") }}</span>
            <select v-model="form.categoryId">
              <option value="">{{ t("common.pleaseSelect") }}{{ t("form.category") }}</option>
              <option v-for="item in leafCategoryOptions" :key="item.category_id" :value="item.category_id">
                {{ item.category_path || item.name }}
              </option>
            </select>
          </label>
          <label>
            <span>{{ t("form.price") }}</span>
            <input v-model.number="form.purchasePrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>{{ t("form.deliveryDays") }}</span>
            <input v-model.number="form.deliveryDays" type="number" min="1" step="1" />
          </label>
          <label>
            <span>{{ t("erpProducts.deliveryText") }}</span>
            <input v-model="form.deliveryTimeText" type="text" :placeholder="t('erpProducts.deliveryText')" />
          </label>
          <label>
            <span>{{ t("form.material") }}</span>
            <input v-model="form.materialText" type="text" />
          </label>
          <label>
            <span>{{ t("form.materialEn") }}</span>
            <input v-model="form.materialTextEn" type="text" />
          </label>
          <label>
            <span>{{ t("form.grossWeightGram") }}</span>
            <input v-model.number="form.packagingWeightGram" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>{{ t("form.grossWeightLb") }}</span>
            <input v-model.number="form.packagingWeightLb" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>{{ t("erpProducts.primaryImageUrl") }}</span>
            <input v-model="form.primaryImageUrl" type="text" />
          </label>
        </div>

        <div class="erp-products-page__helper-text">
          {{ t("erpProducts.requiredTips") }}
        </div>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.supportPlatforms") }}</h3>
          </div>
          <div class="erp-products-page__checkbox-row">
            <label class="erp-products-page__checkbox-item">
              <input
                :checked="form.supportPlatforms?.includes('TEMU')"
                type="checkbox"
                @change="toggleSupportPlatform('TEMU', ($event.target as HTMLInputElement).checked)"
              />
              <span>TEMU</span>
            </label>
            <label class="erp-products-page__checkbox-item">
              <input
                :checked="form.supportPlatforms?.includes('JIT')"
                type="checkbox"
                @change="toggleSupportPlatform('JIT', ($event.target as HTMLInputElement).checked)"
              />
              <span>JIT</span>
            </label>
          </div>
        </section>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.colorsAndSizes") }}</h3>
          </div>
          <div class="erp-products-page__form-grid">
            <label>
              <span>{{ t("form.colorOptions") }}</span>
              <textarea
                :value="(form.colorOptions || []).join(', ')"
                rows="3"
                :placeholder="t('erpProducts.colorOptionsPlaceholder')"
                @change="updateTextList('colorOptions', ($event.target as HTMLTextAreaElement).value)"
              />
            </label>
            <label>
              <span>{{ t("form.sizeList") }}</span>
              <textarea
                :value="(form.sizeOptions || []).join(', ')"
                rows="3"
                :placeholder="t('erpProducts.sizeOptionsPlaceholder')"
                @change="updateTextList('sizeOptions', ($event.target as HTMLTextAreaElement).value)"
              />
            </label>
            <div class="erp-products-page__tip-card">
              <strong>{{ t("erpProducts.tipsTitle") }}</strong>
              <p>{{ t("erpProducts.tipsText") }}</p>
            </div>
          </div>
        </section>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.detailFields") }}</h3>
            <button type="button" class="erp-products-page__secondary" @click="addDetailField">{{ t("erpProducts.addField") }}</button>
          </div>
          <div v-if="!(form.productDetails || []).length" class="erp-products-page__helper-text">
            {{ t("erpProducts.detailFieldsHint") }}
          </div>
          <div
            v-for="(detailItem, index) in form.productDetails"
            :key="`detail-${index}`"
            class="erp-products-page__triple-grid"
          >
            <input v-model="detailItem.label" type="text" :placeholder="t('erpProducts.detailFieldLabel')" />
            <input v-model="detailItem.value" type="text" :placeholder="t('erpProducts.detailFieldValue')" />
            <button type="button" class="erp-products-page__secondary" @click="removeDetailField(index)">{{ t("erpProducts.delete") }}</button>
          </div>
        </section>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.sizeRows") }}</h3>
            <button type="button" class="erp-products-page__secondary" @click="addSizeRow">{{ t("erpProducts.addSizeRow") }}</button>
          </div>
          <div v-if="!(form.productSizeRows || []).length" class="erp-products-page__helper-text">
            {{ t("erpProducts.sizeRowsHint") }}
          </div>
          <div
            v-for="(sizeRow, index) in form.productSizeRows"
            :key="`size-${index}`"
            class="erp-products-page__quad-grid"
          >
            <input v-model="sizeRow.sizeLabel" type="text" :placeholder="t('erpProducts.sizePlaceholder')" />
            <input
              :value="getSizeRowPart(index, 'overseasSize')"
              type="text"
              :placeholder="t('erpProducts.overseasSizePlaceholder')"
              @input="updateSizeRowPart(index, 'overseasSize', ($event.target as HTMLInputElement).value)"
            />
            <input
              :value="getSizeRowPart(index, 'innerLength')"
              type="text"
              :placeholder="t('erpProducts.innerLengthPlaceholder')"
              @input="updateSizeRowPart(index, 'innerLength', ($event.target as HTMLInputElement).value)"
            />
            <button type="button" class="erp-products-page__secondary" @click="removeSizeRow(index)">{{ t("erpProducts.delete") }}</button>
          </div>
        </section>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.packaging") }}</h3>
            <button type="button" class="erp-products-page__secondary" @click="addPackagingSpecRow">{{ t("erpProducts.addPackagingRow") }}</button>
          </div>
          <div v-if="!(form.packagingSpecRows || []).length" class="erp-products-page__helper-text">
            {{ t("erpProducts.packagingHint") }}
          </div>
          <div
            v-for="(packagingRow, index) in form.packagingSpecRows"
            :key="`packaging-${index}`"
            class="erp-products-page__packaging-card"
          >
            <div class="erp-products-page__packaging-top">
              <input v-model="packagingRow.sizeLabel" type="text" :placeholder="t('erpProducts.sizePlaceholder')" />
              <button type="button" class="erp-products-page__secondary" @click="removePackagingSpecRow(index)">{{ t("erpProducts.delete") }}</button>
            </div>
            <div class="erp-products-page__dimension-group">
              <span>{{ t("form.packageSizeCm") }}</span>
              <div class="erp-products-page__dimension-grid">
                <input
                  :value="splitDimensionTriplet(packagingRow.packagingSizeCm)[0]"
                  type="text"
                  :placeholder="t('erpProducts.length')"
                  @input="updatePackagingDimension(index, 'packagingSizeCm', 0, ($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="splitDimensionTriplet(packagingRow.packagingSizeCm)[1]"
                  type="text"
                  :placeholder="t('erpProducts.width')"
                  @input="updatePackagingDimension(index, 'packagingSizeCm', 1, ($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="splitDimensionTriplet(packagingRow.packagingSizeCm)[2]"
                  type="text"
                  :placeholder="t('erpProducts.height')"
                  @input="updatePackagingDimension(index, 'packagingSizeCm', 2, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div class="erp-products-page__dimension-group">
              <span>{{ t("form.packageSizeInch") }}</span>
              <div class="erp-products-page__dimension-grid">
                <input
                  :value="splitDimensionTriplet(packagingRow.packagingSizeInch)[0]"
                  type="text"
                  :placeholder="t('erpProducts.length')"
                  @input="updatePackagingDimension(index, 'packagingSizeInch', 0, ($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="splitDimensionTriplet(packagingRow.packagingSizeInch)[1]"
                  type="text"
                  :placeholder="t('erpProducts.width')"
                  @input="updatePackagingDimension(index, 'packagingSizeInch', 1, ($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="splitDimensionTriplet(packagingRow.packagingSizeInch)[2]"
                  type="text"
                  :placeholder="t('erpProducts.height')"
                  @input="updatePackagingDimension(index, 'packagingSizeInch', 2, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div class="erp-products-page__metric-grid">
              <input
                :value="packagingRow.packagingVolumeCm"
                type="text"
                :placeholder="t('erpProducts.volumeCm')"
                @input="updatePackagingMetric(index, 'packagingVolumeCm', ($event.target as HTMLInputElement).value)"
              />
              <input
                :value="packagingRow.packagingVolumeInch"
                type="text"
                :placeholder="t('erpProducts.volumeInch')"
                @input="updatePackagingMetric(index, 'packagingVolumeInch', ($event.target as HTMLInputElement).value)"
              />
              <input
                :value="packagingRow.packingWeightGram"
                type="text"
                :placeholder="t('form.grossWeightGram')"
                @input="updatePackagingMetric(index, 'packingWeightGram', ($event.target as HTMLInputElement).value)"
              />
              <input
                :value="packagingRow.packageWeightLb"
                type="text"
                :placeholder="t('form.grossWeightLb')"
                @input="updatePackagingMetric(index, 'packageWeightLb', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </section>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.variants") }}</h3>
            <button type="button" class="erp-products-page__secondary" @click="addVariant">{{ t("erpProducts.addVariant") }}</button>
          </div>
          <div
            v-for="(variant, index) in form.variants"
            :key="variant.variantId || index"
            class="erp-products-page__variant-card"
          >
            <div class="erp-products-page__variant-grid">
              <input v-model="variant.sku" type="text" :placeholder="t('form.sku')" />
              <input v-model="variant.variantName" type="text" :placeholder="t('erpProducts.variants')" />
              <select v-model="variant.status">
                <option value="active">{{ t("erpProducts.statusActive") }}</option>
                <option value="inactive">{{ t("erpProducts.statusInactive") }}</option>
              </select>
              <input
                :value="getVariantAttribute(variant.attributesJson, 'color')"
                type="text"
                :placeholder="t('erpProducts.variantColor')"
                @input="updateVariantAttribute(index, 'color', ($event.target as HTMLInputElement).value)"
              />
              <input
                :value="getVariantAttribute(variant.attributesJson, 'size')"
                type="text"
                :placeholder="t('erpProducts.variantSize')"
                @input="updateVariantAttribute(index, 'size', ($event.target as HTMLInputElement).value)"
              />
              <input
                v-model.number="variant.retailPriceAmount"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('form.price')"
              />
            </div>
            <div class="erp-products-page__variant-json">{{ variant.attributesJson || '{}' }}</div>
            <div class="erp-products-page__variant-actions">
              <button type="button" class="erp-products-page__secondary" @click="removeVariant(index)">{{ t("erpProducts.delete") }}</button>
              <span>{{ resolveVariantStatusLabel(variant.status) }}</span>
            </div>
          </div>
        </section>

        <section class="erp-products-page__workspace-panel">
          <div class="erp-products-page__workspace-panel-head">
            <h3>{{ t("erpProducts.images") }}</h3>
            <button type="button" class="erp-products-page__secondary" @click="addImage">{{ t("erpProducts.addImage") }}</button>
          </div>
          <div v-for="(image, index) in form.images" :key="image.imageId || index" class="erp-products-page__image-row">
            <div class="erp-products-page__image-fields">
              <input v-model="image.imageUrl" type="text" :placeholder="t('erpProducts.imageUrl')" />
              <input v-model="image.altText" type="text" :placeholder="t('erpProducts.altText')" />
            </div>
            <button type="button" class="erp-products-page__secondary" @click="markPrimary(image.imageId, image.imageUrl)">
              {{ image.primary || image.imageUrl === form.primaryImageUrl ? t("erpProducts.primary") : t("erpProducts.setPrimary") }}
            </button>
            <button type="button" class="erp-products-page__secondary" @click="removeImage(index)">{{ t("erpProducts.delete") }}</button>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
.erp-products-page {
  display: grid;
  gap: 16px;
}

.erp-products-page__header,
.erp-products-page__notice,
.erp-products-page__sidebar,
.erp-products-page__filters,
.erp-products-page__catalog,
.erp-products-page__workspace {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.erp-products-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
}

.erp-products-page__header h1,
.erp-products-page__header p,
.erp-products-page__panel-title h2,
.erp-products-page__panel-title p,
.erp-products-page__catalog-header h2,
.erp-products-page__catalog-header p,
.erp-products-page__workspace-header h2,
.erp-products-page__workspace-header p,
.erp-products-page__workspace-panel-head h3,
.erp-product-card__head h3,
.erp-product-card__head p,
.erp-product-card__hover p {
  margin: 0;
}

.erp-products-page__eyebrow {
  margin: 0 0 6px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.erp-products-page__header-main {
  display: grid;
  gap: 4px;
}

.erp-products-page__header-main h1 {
  font-size: 24px;
  color: #111827;
}

.erp-products-page__header-main p {
  color: #6b7280;
  font-size: 13px;
}

.erp-products-page__header-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.erp-products-page__header-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.erp-products-page__notice {
  padding: 14px 18px;
  font-size: 14px;
}

.erp-products-page__notice--error {
  background: #fef2f2;
  color: #b91c1c;
}

.erp-products-page__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.erp-products-page__sidebar,
.erp-products-page__filters,
.erp-products-page__catalog {
  padding: 16px;
}

.erp-products-page__sidebar {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 12px;
}

.erp-products-page__panel-title,
.erp-products-page__catalog-header,
.erp-products-page__workspace-header,
.erp-products-page__workspace-panel-head,
.erp-products-page__pagination,
.erp-products-page__workspace-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.erp-products-page__panel-title {
  align-items: flex-start;
}

.erp-products-page__panel-title p,
.erp-products-page__category-summary,
.erp-products-page__catalog-header p,
.erp-products-page__catalog-meta,
.erp-product-card__category,
.erp-product-card__meta,
.erp-products-page label span {
  color: #6b7280;
}

.erp-products-page__text-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  font-weight: 700;
  cursor: pointer;
}

.erp-products-page__category-summary {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
}

.erp-products-page__summary-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.erp-products-page__main {
  display: grid;
  gap: 16px;
}

.erp-products-page__filters {
  display: grid;
  gap: 12px;
}

.erp-products-page__search,
.erp-products-page__filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: end;
}

.erp-products-page__search input {
  flex: 1;
  min-width: 240px;
}

.erp-products-page__filter-row label {
  display: grid;
  gap: 8px;
  min-width: 140px;
  font-size: 13px;
}

.erp-products-page__filter-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
  flex-wrap: wrap;
}

.erp-products-page__filter-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  color: #64748b;
}

.erp-products-page__filter-summary span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f8fafc;
}

.erp-products-page__catalog {
  display: grid;
  gap: 14px;
}

.erp-products-page__catalog-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
}

.erp-products-page__catalog-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f8fafc;
}

.erp-products-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.erp-product-card {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.erp-product-card:hover,
.erp-product-card:focus-within {
  transform: translateY(-1px);
  border-color: #94a3b8;
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.1);
}

.erp-product-card.is-active {
  border-color: #111827;
}

.erp-product-card__cover {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background: #f3f4f6;
  aspect-ratio: 4 / 3;
}

.erp-product-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.erp-product-card__status {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.82);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.erp-product-card__body {
  display: grid;
  gap: 8px;
}

.erp-product-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.erp-product-card__head h3 {
  font-size: 15px;
  color: #111827;
}

.erp-product-card__head p {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.erp-product-card__head strong {
  color: #111827;
  font-size: 15px;
  white-space: nowrap;
}

.erp-product-card__category {
  font-size: 13px;
  line-height: 1.5;
}

.erp-product-card__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
}

.erp-product-card__meta span,
.erp-product-card__tags span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f8fafc;
}

.erp-product-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.erp-product-card__tags span {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.erp-product-card__hover {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.94);
  color: #ffffff;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.26);
  backdrop-filter: blur(6px);
}

.erp-product-card:hover .erp-product-card__hover,
.erp-product-card:focus-within .erp-product-card__hover {
  opacity: 1;
  transform: translateY(0);
}

.erp-product-card__hover strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.erp-product-card__hover p {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.5;
}

.erp-product-card__hover dl {
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.erp-product-card__hover dt,
.erp-product-card__hover dd {
  margin: 0;
  font-size: 12px;
}

.erp-product-card__hover dt {
  color: rgba(255, 255, 255, 0.65);
}

.erp-product-card__hover dd {
  margin-top: 3px;
  color: #ffffff;
  font-weight: 700;
}

.erp-products-page__empty {
  display: grid;
  gap: 6px;
  justify-items: start;
  padding: 32px 0;
}

.erp-products-page__pagination {
  flex-wrap: wrap;
}

.erp-products-page__pagination-meta {
  display: grid;
  grid-auto-flow: column;
  gap: 12px;
  align-items: center;
}

.erp-products-page__pagination-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 13px;
}

.erp-products-page__workspace-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.38);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 60;
}

.erp-products-page__workspace {
  width: min(1120px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 20px;
  display: grid;
  gap: 18px;
}

.erp-products-page__workspace-panel {
  display: grid;
  gap: 12px;
}

.erp-products-page__form-grid,
.erp-products-page__image-fields,
.erp-products-page__triple-grid,
.erp-products-page__packaging-grid,
.erp-products-page__dimension-grid,
.erp-products-page__metric-grid,
.erp-products-page__variant-grid {
  display: grid;
  gap: 12px;
}

.erp-products-page__form-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.erp-products-page__triple-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
}

.erp-products-page__quad-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 12px;
}

.erp-products-page__packaging-grid {
  grid-template-columns: repeat(7, minmax(120px, 1fr)) auto;
}

.erp-products-page__dimension-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.erp-products-page__metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.erp-products-page__variant-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.erp-products-page__image-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
}

.erp-products-page__packaging-card,
.erp-products-page__variant-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #f8fafc;
}

.erp-products-page__packaging-top {
  display: grid;
  grid-template-columns: minmax(0, 220px) auto;
  gap: 12px;
  align-items: center;
}

.erp-products-page__dimension-group {
  display: grid;
  gap: 8px;
}

.erp-products-page__dimension-group span,
.erp-products-page__variant-json {
  color: #64748b;
  font-size: 12px;
}

.erp-products-page__variant-json {
  padding: 10px 12px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px dashed #d1d5db;
  word-break: break-all;
}

.erp-products-page__variant-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 12px;
}

.erp-products-page__checkbox-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.erp-products-page__checkbox-item {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
}

.erp-products-page__checkbox-item input {
  min-height: auto;
  padding: 0;
}

.erp-products-page__helper-text,
.erp-products-page__tip-card p {
  color: #64748b;
  font-size: 13px;
}

.erp-products-page__helper-text {
  margin-top: -4px;
}

.erp-products-page__tip-card {
  padding: 14px;
  border: 1px dashed #d1d5db;
  border-radius: 14px;
  background: #f8fafc;
}

.erp-products-page__tip-card strong,
.erp-products-page__tip-card p {
  margin: 0;
}

.erp-products-page label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: #334155;
}

.erp-products-page input,
.erp-products-page textarea,
.erp-products-page select,
.erp-products-page button {
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  font: inherit;
  padding: 10px 14px;
}

.erp-products-page textarea {
  min-height: 88px;
  resize: vertical;
}

.erp-products-page__primary {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
  font-weight: 700;
}

.erp-products-page__secondary {
  background: #f8fafc;
  color: #111827;
  font-weight: 600;
}

@media (max-width: 1280px) {
  .erp-products-page__layout {
    grid-template-columns: 1fr;
  }

  .erp-products-page__sidebar {
    position: static;
  }

  .erp-products-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .erp-products-page__form-grid,
  .erp-products-page__triple-grid,
  .erp-products-page__quad-grid,
  .erp-products-page__packaging-grid,
  .erp-products-page__dimension-grid,
  .erp-products-page__metric-grid,
  .erp-products-page__variant-grid,
  .erp-products-page__image-row {
    grid-template-columns: 1fr;
  }

  .erp-products-page__packaging-top {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .erp-products-page__header,
  .erp-products-page__catalog-header,
  .erp-products-page__workspace-header,
  .erp-products-page__pagination,
  .erp-products-page__search,
  .erp-products-page__filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .erp-products-page__grid {
    grid-template-columns: 1fr;
  }

  .erp-products-page__pagination-meta {
    grid-auto-flow: row;
  }

  .erp-product-card__hover dl {
    grid-template-columns: 1fr;
  }
}
</style>
