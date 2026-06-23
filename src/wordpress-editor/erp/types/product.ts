import type { DeletionPreviewMode } from "../../api/client"

export type ErpProductTemplateBinding = {
  templateId: string
  templateName: string
  templateSource?: string
  coverUrl?: string
  visibilityScope?: string
  publishEnabled?: boolean
  erpSelectable?: boolean
  permissionStatus?: string
  supplierStatus?: string
  supplierStatusLabel?: string
  reviewStatus?: string
  reviewStatusLabel?: string
}

export type ErpProductSummary = {
  productId: string
  finishedProductCode: string
  templateId?: string
  templateName?: string
  templateBinding?: ErpProductTemplateBinding | null
  productName: string
  productNameEn?: string
  productSku?: string
  productType: string
  status: string
  defaultCurrency: string
  primaryImageUrl: string
  variantCount: number
  categoryId?: string
  categoryPath?: string
  categoryPathEn?: string
  supplierName?: string
  supplierSku?: string
  purchasePrice?: number | null
  packagingWeightGram?: number | null
  packagingWeightLb?: number | null
  deliveryDays?: number | null
  deliveryTimeText?: string
  materialText?: string
  materialTextEn?: string
  supportPlatforms?: string[]
  uploadStatus?: string
  uploadStatusLabel?: string
  listingStatus?: string
  listingStatusLabel?: string
  reviewStatus?: string
  reviewStatusLabel?: string
  inventoryQuantity?: number | null
  inventoryLabel?: string
  homepageRecommended?: boolean
}

export type ErpProductImageItem = {
  imageId: string
  imageUrl: string
  altText: string
  sortOrder: number
  primary: boolean
}

export type ErpProductVariantItem = {
  variantId: string
  sku: string
  variantName: string
  status: string
  attributesJson: string
  retailPriceAmount: number
}

export type ErpProductDetail = {
  productId: string
  tenantId: string
  finishedProductCode: string
  templateBinding?: ErpProductTemplateBinding | null
  productName: string
  productNameEn?: string
  productSku?: string
  productType: string
  status: string
  defaultCurrency: string
  primaryImageUrl: string
  categoryId?: string
  categoryPath?: string
  categoryPathEn?: string
  purchasePrice?: number | null
  packagingWeightGram?: number | null
  packagingWeightLb?: number | null
  deliveryDays?: number | null
  deliveryTimeText?: string
  materialText?: string
  materialTextEn?: string
  supportPlatforms?: string[]
  colorOptions?: string[]
  sizeOptions?: string[]
  productDetails?: ErpProductDetailField[]
  productSizeRows?: ErpProductSizeRow[]
  packagingSpecRows?: ErpPackagingSpecRow[]
  images: ErpProductImageItem[]
  variants: ErpProductVariantItem[]
  workflow?: ErpProductWorkflowSnapshot
}

export type ErpProductDetailField = {
  label: string
  value: string
}

export type ErpProductSizeRow = {
  sizeLabel: string
  dimensionLabel: string
}

export type ErpPackagingSpecRow = {
  sizeLabel: string
  packagingSizeCm: string
  packagingSizeInch: string
  packagingVolumeCm: string
  packagingVolumeInch: string
  packingWeightGram: string
  packageWeightLb: string
}

export type ErpProductWorkflowAction = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpProductWorkflowSnapshot = {
  supplierName?: string
  supplierSku?: string
  supplierSourceUrl?: string
  uploadStatus?: string
  uploadStatusLabel?: string
  listingStatus?: string
  listingStatusLabel?: string
  reviewStatus?: string
  reviewStatusLabel?: string
  homepageRecommended?: boolean
  submittedAt?: string
  reviewedAt?: string
  recommendedAt?: string
  reviewNote?: string
  availableActions?: ErpProductWorkflowAction[]
}

export type ErpDeletionImpactSummary = {
  criticalCount: number
  nonCriticalCount: number
  transientCount: number
}

export type ErpDeletionUsage = {
  key: string
  label: string
  description: string
  blocking: boolean
}

export type ErpDeletionCleanupStep = {
  step: number
  code: string
  description: string
  destructive: boolean
}

export type ErpProductDeletionPreview = {
  resourceType: string
  resourceId: string
  resourceName: string
  ownerTenantId: string
  recommendedMode: DeletionPreviewMode
  allowedModes: DeletionPreviewMode[]
  hasProtectedReferences: boolean
  impactSummary: ErpDeletionImpactSummary
  warnings: string[]
  criticalUsages: ErpDeletionUsage[]
  nonCriticalUsages: ErpDeletionUsage[]
  transientUsages: ErpDeletionUsage[]
  cleanupPlan: ErpDeletionCleanupStep[]
}

export type ErpProductDeletionResult = {
  resourceType: string
  resourceId: string
  resourceName: string
  mode: DeletionPreviewMode
  hidden: boolean
  softDeleted: boolean
  purged: boolean
  warnings: string[]
}

export type ErpFinishedProductCode = {
  prefix: string
  sequence: number
  value: string
}

export type ErpProductSaveRequest = {
  productId?: string
  finishedProductCode?: string
  templateId: string
  templateName?: string
  templateSource?: string
  templateCoverUrl?: string
  productName: string
  productNameEn: string
  productSku: string
  productType: string
  status: string
  defaultCurrency: string
  categoryId?: string
  supplierName?: string
  supplierSku?: string
  supplierSourceUrl?: string
  purchasePrice?: number | null
  packagingWeightGram?: number | null
  packagingWeightLb?: number | null
  deliveryDays?: number | null
  deliveryTimeText?: string
  materialText?: string
  materialTextEn?: string
  supportPlatforms?: string[]
  colorOptions?: string[]
  sizeOptions?: string[]
  productDetails?: ErpProductDetailField[]
  productSizeRows?: ErpProductSizeRow[]
  packagingSpecRows?: ErpPackagingSpecRow[]
  primaryImageUrl?: string
  variants: Array<{
    variantId?: string
    sku: string
    variantName: string
    status: string
    attributesJson?: string
    retailPriceAmount: number
  }>
  images: Array<{
    imageId?: string
    imageUrl: string
    altText?: string
    sortOrder: number
    primary: boolean
  }>
}
