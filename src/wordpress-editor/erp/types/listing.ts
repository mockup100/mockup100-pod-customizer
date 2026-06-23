export type ErpListingActionEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpListingChannelOption = {
  value: string
  label: string
}

export type ErpListingSelectOption = {
  value: string
  label: string
}

export type ErpListingSummary = {
  listingId: string
  productId: string
  finishedProductCode: string
  productName: string
  channelCode: string
  channelLabel: string
  listingStatus: string
  listingStatusLabel: string
  syncStatus: string
  syncStatusLabel: string
  shopId: string
  shopLabel: string
  designerCode: string
  designerName: string
  themeCode: string
  themeLabel: string
  operationStatus: string
  operationStatusLabel: string
  campaignLabel: string
  merchandisingNote: string
  channelHealthLabel: string
  bridgePreviewPath: string
  externalListingId: string
  syncAttempts: number
  lastSyncedAt?: string
  primaryImageUrl: string
  suggestedAction: string
}

export type ErpListingDetail = {
  listingId: string
  tenantId: string
  productId: string
  finishedProductCode: string
  productName: string
  channelCode: string
  channelLabel: string
  listingStatus: string
  listingStatusLabel: string
  syncStatus: string
  syncStatusLabel: string
  shopId: string
  shopLabel: string
  designerCode: string
  designerName: string
  themeCode: string
  themeLabel: string
  operationStatus: string
  operationStatusLabel: string
  campaignLabel: string
  merchandisingNote: string
  channelHealthLabel: string
  bridgePreviewPath: string
  externalListingId: string
  syncAttempts: number
  lastSyncedAt?: string
  primaryImageUrl: string
  syncNote: string
  timeline: Array<{
    occurredAt: string
    title: string
    description: string
    tone: string
  }>
  syncEntry: ErpListingActionEntry
  sourceEntries: ErpListingActionEntry[]
  reuseBoundaryNote: string
}

export type ErpListingListView = {
  tenantId: string
  queueSummary: {
    total: number
    pending: number
    failed: number
    synced: number
  }
  channels: ErpListingChannelOption[]
  shops: ErpListingSelectOption[]
  themes: ErpListingSelectOption[]
  designers: ErpListingSelectOption[]
  operationStatuses: ErpListingSelectOption[]
  listings: ErpListingSummary[]
  quickActions: ErpListingActionEntry[]
  syncEntry: ErpListingActionEntry
  exportEntry: ErpListingActionEntry
  reuseBoundaryNote: string
}
