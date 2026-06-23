export type ErpReportFilterOption = {
  value: string
  label: string
}

export type ErpReportFilters = {
  applied: {
    startDate: string | null
    endDate: string | null
    shopId: string | null
    platform: string | null
    product: string | null
  }
  shops: ErpReportFilterOption[]
  platforms: ErpReportFilterOption[]
  products: ErpReportFilterOption[]
}

export type ErpReportExportEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpOrderRecord = {
  orderNo: string
  orderStatus: string
  shopLabel: string
  platformLabel: string
  productLabel: string
  amount: number
  currencyCode: string
  placedAt: string
}

export type ErpAppPurchaseRecord = {
  transactionNo: string
  appName: string
  packageLabel: string
  paymentMethod: string
  paymentStatus: string
  amount: number
  currencyCode: string
  purchasedAt: string
}

export type ErpReportOverview = {
  tenantId: string
  generatedAt: string
  cards: Array<{
    key: string
    title: string
    value: number
    unit: string
    description: string
    tone: string
  }>
  trend: Array<{
    date: string
    orderCount: number
    grossAmount: number
    syncedListings: number
  }>
  channelBreakdown: Array<{
    channelCode: string
    channelLabel: string
    activeListings: number
    failedListings: number
    publishEnabledTemplates: number
  }>
  orderRecords: ErpOrderRecord[]
  appPurchaseRecords: ErpAppPurchaseRecord[]
  exportEntries: ErpReportExportEntry[]
  filters: ErpReportFilters
}
