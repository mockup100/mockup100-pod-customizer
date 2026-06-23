export type ErpOrderStatusOption = {
  value: string
  label: string
}

export type ErpOrderSelectOption = {
  value: string
  label: string
}

export type ErpOrderActionEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpOrderSummary = {
  orderId: string
  orderNo: string
  shopLabel: string
  platformLabel: string
  orderStatus: string
  orderStatusLabel: string
  riskLevel: string
  remainingHours: number
  currencyCode: string
  totalAmount: number
  itemCount: number
  shipmentCount: number
  latestShipmentNo: string
  latestShipmentStatus: string
  latestTrackingNo: string
  placedAt: string
  allowedTransitions: ErpOrderStatusOption[]
}

export type ErpOrderItemLine = {
  orderItemId: string
  productId: string
  variantId: string
  skuSnapshot: string
  productNameSnapshot: string
  quantity: number
  unitPriceAmount: number
  discountAmount: number
  taxAmount: number
  lineTotalAmount: number
}

export type ErpShipmentLine = {
  shipmentId: string
  shipmentNo: string
  shipmentStatus: string
  shipmentStatusLabel: string
  carrierCode: string
  trackingNo: string
  shippedAt?: string
  deliveredAt?: string
}

export type ErpOrderListView = {
  tenantId: string
  queueSummary: {
    total: number
    overdue: number
    productionPending: number
    readyToShip: number
  }
  shops: ErpOrderSelectOption[]
  platforms: ErpOrderSelectOption[]
  riskLevels: ErpOrderSelectOption[]
  timePresets: ErpOrderSelectOption[]
  orders: ErpOrderSummary[]
  supportedStatuses: ErpOrderStatusOption[]
  batchActions: ErpOrderActionEntry[]
  exportEntry: ErpOrderActionEntry
  syncEntry: ErpOrderActionEntry
}

export type ErpOrderDetail = {
  orderId: string
  tenantId: string
  orderNo: string
  accountId: string
  shopLabel: string
  platformLabel: string
  orderStatus: string
  orderStatusLabel: string
  riskLevel: string
  remainingHours: number
  currencyCode: string
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  placedAt: string
  items: ErpOrderItemLine[]
  shipments: ErpShipmentLine[]
  allowedTransitions: ErpOrderStatusOption[]
  exportEntry: ErpOrderActionEntry
  syncEntry: ErpOrderActionEntry
}
