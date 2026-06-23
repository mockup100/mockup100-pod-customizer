import { erpFetch } from "./client"

export type PublicProductCategoryNode = {
  categoryId: string
  parentId?: string | null
  name: string
  nameEn: string
  slug: string
  level: number
  sortOrder: number
  children?: PublicProductCategoryNode[]
}

export type PublicProductFilterOption = {
  key: string
  label: string
}

export type PublicProductSummary = {
  productId: string
  finishedProductCode: string
  productName: string
  productNameEn: string
  productSku: string
  primaryImageUrl: string
  supplierName: string
  categoryId: string
  categoryPath: string
  categoryPathEn: string
  purchasePrice: number | null
  packagingWeightGram: number | null
  packagingWeightLb: number | null
  deliveryDays: number | null
  deliveryTimeText: string
  materialText: string
  materialTextEn: string
  supportPlatforms: string[]
  salesCount: number
  publishedAt?: string
  homepageRecommended: boolean
}

export type PublicProductListView = {
  items: PublicProductSummary[]
  filters: {
    purchasePriceRanges: PublicProductFilterOption[]
    packagingWeightRanges: PublicProductFilterOption[]
  }
  categories: PublicProductCategoryNode[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type PublicProductDetail = {
  productId: string
  finishedProductCode: string
  productName: string
  productNameEn: string
  productSku: string
  supplierName: string
  categoryId: string
  categoryPath: string
  categoryPathEn: string
  purchasePrice: number | null
  priceLabel: string
  minimumOrderQuantity: number | null
  packagingWeightGram: number | null
  packagingWeightLb: number | null
  deliveryDays: number | null
  deliveryTimeText: string
  materialText: string
  materialTextEn: string
  supportPlatforms: string[]
  colorOptions: string[]
  sizeOptions: string[]
  primaryImageUrl: string
  images: Array<{
    imageId: string
    imageUrl: string
    altText: string
    sortOrder: number
    primary: boolean
  }>
  productDetails: Array<{
    label: string
    value: string
  }>
  productSizeRows: Array<{
    sizeLabel: string
    dimensionLabel: string
  }>
  packagingSpecRows: Array<{
    sizeLabel: string
    packagingSizeCm: string
    packagingSizeInch: string
    packagingVolumeCm: string
    packagingVolumeInch: string
    packingWeightGram: string
    packageWeightLb: string
  }>
  variants: Array<{
    variantId: string
    variantName: string
    sku: string
    color: string
    size: string
    customSpecName: string
    customValue: string
    purchasePrice: number | null
    retailPriceAmount: number | null
    minimumOrderQuantity: number | null
    packagingSizeCm: string
    packagingSizeInch: string
    packagingVolumeCm: string
    packagingVolumeInch: string
    packagingWeightGram: number | null
    packagingWeightLb: number | null
  }>
  homepageRecommended: boolean
  publishedAt?: string
}

type RawRecord = Record<string, unknown>

export async function fetchPublicProducts(filters?: {
  keyword?: string
  categoryId?: string
  purchasePriceRange?: string
  packagingWeightRange?: string
  supplier?: string
  sortField?: string
  sortDirection?: string
  page?: number
  pageSize?: number
}) {
  const payload = await erpFetch<unknown>(withQuery("/public/products", filters))
  return normalizeListView(payload)
}

export async function fetchPublicProductCategories() {
  const payload = await erpFetch<unknown>("/public/products/categories")
  return toArray(payload).map(normalizeCategoryNode)
}

export async function fetchPublicProductDetail(productCode: string) {
  const payload = await erpFetch<unknown>(`/public/products/${encodeURIComponent(productCode)}`)
  return normalizeDetail(payload)
}

function normalizeListView(payload: unknown): PublicProductListView {
  const source = toRecord(payload)
  return {
    items: toArray(pick(source, "items")).map(normalizeSummary),
    filters: {
      purchasePriceRanges: toArray(pick(source, "purchasePriceRanges", "purchase_price_ranges", "filters.purchasePriceRanges", "filters.purchase_price_ranges")).map(normalizeFilterOption),
      packagingWeightRanges: toArray(pick(source, "packagingWeightRanges", "packaging_weight_ranges", "filters.packagingWeightRanges", "filters.packaging_weight_ranges")).map(normalizeFilterOption),
    },
    categories: toArray(pick(source, "categories")).map(normalizeCategoryNode),
    pagination: normalizePagination(pick(source, "pagination")),
  }
}

function normalizePagination(value: unknown) {
  const source = toRecord(value)
  return {
    page: readNumber(source, 1, "page"),
    pageSize: readNumber(source, 50, "pageSize", "page_size"),
    total: readNumber(source, 0, "total"),
    totalPages: readNumber(source, 1, "totalPages", "total_pages"),
  }
}

function normalizeFilterOption(value: unknown): PublicProductFilterOption {
  const source = toRecord(value)
  return {
    key: readString(source, "key"),
    label: readString(source, "label"),
  }
}

function normalizeCategoryNode(value: unknown): PublicProductCategoryNode {
  const source = toRecord(value)
  return {
    categoryId: readString(source, "categoryId", "category_id"),
    parentId: readNullableString(source, "parentId", "parent_id"),
    name: readString(source, "name"),
    nameEn: readString(source, "nameEn", "name_en"),
    slug: readString(source, "slug"),
    level: readNumber(source, 0, "level"),
    sortOrder: readNumber(source, 0, "sortOrder", "sort_order"),
    children: toArray(pick(source, "children")).map(normalizeCategoryNode),
  }
}

function normalizeSummary(value: unknown): PublicProductSummary {
  const source = toRecord(value)
  return {
    productId: readString(source, "productId", "product_id"),
    finishedProductCode: readString(source, "finishedProductCode", "finished_product_code"),
    productName: readString(source, "productName", "product_name"),
    productNameEn: readString(source, "productNameEn", "product_name_en"),
    productSku: readString(source, "productSku", "product_sku"),
    primaryImageUrl: readString(source, "primaryImageUrl", "primary_image_url"),
    supplierName: readString(source, "supplierName", "supplier_name"),
    categoryId: readString(source, "categoryId", "category_id"),
    categoryPath: readString(source, "categoryPath", "category_path"),
    categoryPathEn: readString(source, "categoryPathEn", "category_path_en"),
    purchasePrice: readNullableNumber(source, "purchasePrice", "purchase_price"),
    packagingWeightGram: readNullableNumber(source, "packagingWeightGram", "packaging_weight_gram"),
    packagingWeightLb: readNullableNumber(source, "packagingWeightLb", "packaging_weight_lb"),
    deliveryDays: readNullableNumber(source, "deliveryDays", "delivery_days"),
    deliveryTimeText: readString(source, "deliveryTimeText", "delivery_time_text"),
    materialText: readString(source, "materialText", "material_text"),
    materialTextEn: readString(source, "materialTextEn", "material_text_en"),
    supportPlatforms: readStringArray(source, "supportPlatforms", "support_platforms"),
    salesCount: readNumber(source, 0, "salesCount", "sales_count"),
    publishedAt: readOptionalString(source, "publishedAt", "published_at"),
    homepageRecommended: readBoolean(source, "homepageRecommended", "homepage_recommended"),
  }
}

function normalizeDetail(value: unknown): PublicProductDetail {
  const source = toRecord(value)
  return {
    productId: readString(source, "productId", "product_id"),
    finishedProductCode: readString(source, "finishedProductCode", "finished_product_code"),
    productName: readString(source, "productName", "product_name"),
    productNameEn: readString(source, "productNameEn", "product_name_en"),
    productSku: readString(source, "productSku", "product_sku"),
    supplierName: readString(source, "supplierName", "supplier_name"),
    categoryId: readString(source, "categoryId", "category_id"),
    categoryPath: readString(source, "categoryPath", "category_path"),
    categoryPathEn: readString(source, "categoryPathEn", "category_path_en"),
    purchasePrice: readNullableNumber(source, "purchasePrice", "purchase_price"),
    priceLabel: readString(source, "priceLabel", "price_label"),
    minimumOrderQuantity: readNullableNumber(source, "minimumOrderQuantity", "minimum_order_quantity"),
    packagingWeightGram: readNullableNumber(source, "packagingWeightGram", "packaging_weight_gram"),
    packagingWeightLb: readNullableNumber(source, "packagingWeightLb", "packaging_weight_lb"),
    deliveryDays: readNullableNumber(source, "deliveryDays", "delivery_days"),
    deliveryTimeText: readString(source, "deliveryTimeText", "delivery_time_text"),
    materialText: readString(source, "materialText", "material_text"),
    materialTextEn: readString(source, "materialTextEn", "material_text_en"),
    supportPlatforms: readStringArray(source, "supportPlatforms", "support_platforms"),
    colorOptions: readStringArray(source, "colorOptions", "color_options"),
    sizeOptions: readStringArray(source, "sizeOptions", "size_options"),
    primaryImageUrl: readString(source, "primaryImageUrl", "primary_image_url"),
    images: toArray(pick(source, "images")).map((item) => {
      const entry = toRecord(item)
      return {
        imageId: readString(entry, "imageId", "image_id"),
        imageUrl: readString(entry, "imageUrl", "image_url"),
        altText: readString(entry, "altText", "alt_text"),
        sortOrder: readNumber(entry, 0, "sortOrder", "sort_order"),
        primary: readBoolean(entry, "primary"),
      }
    }),
    productDetails: toArray(pick(source, "productDetails", "product_details")).map((item) => {
      const entry = toRecord(item)
      return {
        label: readString(entry, "label"),
        value: readString(entry, "value"),
      }
    }),
    productSizeRows: toArray(pick(source, "productSizeRows", "product_size_rows")).map((item) => {
      const entry = toRecord(item)
      return {
        sizeLabel: readString(entry, "sizeLabel", "size_label"),
        dimensionLabel: readString(entry, "dimensionLabel", "dimension_label"),
      }
    }),
    packagingSpecRows: toArray(pick(source, "packagingSpecRows", "packaging_spec_rows")).map((item) => {
      const entry = toRecord(item)
      return {
        sizeLabel: readString(entry, "sizeLabel", "size_label"),
        packagingSizeCm: readString(entry, "packagingSizeCm", "packaging_size_cm"),
        packagingSizeInch: readString(entry, "packagingSizeInch", "packaging_size_inch"),
        packagingVolumeCm: readString(entry, "packagingVolumeCm", "packaging_volume_cm"),
        packagingVolumeInch: readString(entry, "packagingVolumeInch", "packaging_volume_inch"),
        packingWeightGram: readString(entry, "packingWeightGram", "packing_weight_gram"),
        packageWeightLb: readString(entry, "packageWeightLb", "package_weight_lb"),
      }
    }),
    variants: toArray(pick(source, "variants")).map((item) => {
      const entry = toRecord(item)
      return {
        variantId: readString(entry, "variantId", "variant_id"),
        variantName: readString(entry, "variantName", "variant_name"),
        sku: readString(entry, "sku"),
        color: readString(entry, "color"),
        size: readString(entry, "size"),
        customSpecName: readString(entry, "customSpecName", "custom_spec_name"),
        customValue: readString(entry, "customValue", "custom_value"),
        purchasePrice: readNullableNumber(entry, "purchasePrice", "purchase_price"),
        retailPriceAmount: readNullableNumber(entry, "retailPriceAmount", "retail_price_amount"),
        minimumOrderQuantity: readNullableNumber(entry, "minimumOrderQuantity", "minimum_order_quantity"),
        packagingSizeCm: readString(entry, "packagingSizeCm", "packaging_size_cm"),
        packagingSizeInch: readString(entry, "packagingSizeInch", "packaging_size_inch"),
        packagingVolumeCm: readString(entry, "packagingVolumeCm", "packaging_volume_cm"),
        packagingVolumeInch: readString(entry, "packagingVolumeInch", "packaging_volume_inch"),
        packagingWeightGram: readNullableNumber(entry, "packagingWeightGram", "packaging_weight_gram"),
        packagingWeightLb: readNullableNumber(entry, "packagingWeightLb", "packaging_weight_lb"),
      }
    }),
    homepageRecommended: readBoolean(source, "homepageRecommended", "homepage_recommended"),
    publishedAt: readOptionalString(source, "publishedAt", "published_at"),
  }
}

function pick(source: RawRecord, ...keys: string[]) {
  for (const key of keys) {
    if (!key.includes(".")) {
      if (source[key] !== undefined) return source[key]
      continue
    }
    const segments = key.split(".")
    let current: unknown = source
    for (const segment of segments) {
      current = current && typeof current === "object" ? (current as RawRecord)[segment] : undefined
    }
    if (current !== undefined) return current
  }
  return undefined
}

function toRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {}
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readString(source: RawRecord, ...keys: string[]) {
  const value = pick(source, ...keys)
  return value === null || value === undefined ? "" : String(value)
}

function readOptionalString(source: RawRecord, ...keys: string[]) {
  const value = pick(source, ...keys)
  if (value === null || value === undefined || String(value).trim() === "") return undefined
  return String(value)
}

function readNullableString(source: RawRecord, ...keys: string[]) {
  const value = pick(source, ...keys)
  if (value === null || value === undefined || String(value).trim() === "") return null
  return String(value)
}

function readNumber(source: RawRecord, fallback: number, ...keys: string[]) {
  const value = Number(pick(source, ...keys))
  return Number.isFinite(value) ? value : fallback
}

function readNullableNumber(source: RawRecord, ...keys: string[]) {
  const value = pick(source, ...keys)
  if (value === null || value === undefined || value === "") return null
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function readBoolean(source: RawRecord, ...keys: string[]) {
  const value = pick(source, ...keys)
  return value === true || value === "true" || value === 1
}

function readStringArray(source: RawRecord, ...keys: string[]) {
  return toArray(pick(source, ...keys))
    .map((item) => String(item || "").trim())
    .filter(Boolean)
}

function withQuery(path: string, filters?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value))
    }
  })
  const queryString = query.toString()
  return queryString ? `${path}?${queryString}` : path
}
