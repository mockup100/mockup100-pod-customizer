export type ErpGalleryActionEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpGalleryFilterOption = {
  value: string
  label: string
}

export type ErpGallerySummary = {
  assetId: string
  assetName: string
  assetCode: string
  assetStatus: string
  assetStatusLabel: string
  assetType: string
  tagLabel: string
  widthPx: number
  heightPx: number
  fileFormat: string
  fileSizeKb: number
  usageOrderCount: number
  linkedProductCount: number
  previewUrl: string
  updatedAt: string
}

export type ErpGalleryDetail = {
  assetId: string
  tenantId: string
  assetName: string
  assetCode: string
  assetStatus: string
  assetStatusLabel: string
  assetType: string
  tagLabel: string
  widthPx: number
  heightPx: number
  fileFormat: string
  fileSizeKb: number
  usageOrderCount: number
  linkedProductCount: number
  previewUrl: string
  sourceOrderNo: string | null
  updatedAt: string
  linkedProductCodes: string[]
  actions: ErpGalleryActionEntry[]
}

export type ErpGalleryListView = {
  tenantId: string
  overview: {
    totalAssets: number
    readyForDesign: number
    linkedProducts: number
    highUsageAssets: number
  }
  statuses: ErpGalleryFilterOption[]
  tags: ErpGalleryFilterOption[]
  assets: ErpGallerySummary[]
  exportEntry: ErpGalleryActionEntry
}
