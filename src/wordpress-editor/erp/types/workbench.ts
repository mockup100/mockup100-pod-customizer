export type ErpWorkbenchMetricCard = {
  key: string
  title: string
  value: number
  unit: string
  description: string
  trendLabel: string
  tone: string
}

export type ErpWorkbenchStatusBucket = {
  key: string
  label: string
  value: number
  tone: string
}

export type ErpWorkbenchQuickEntry = {
  key: string
  title: string
  description: string
  path: string
  badge: string
}

export type ErpWorkbenchTrendPoint = {
  date: string
  todayOrders: number
  pendingProduction: number
  pendingShipment: number
}

export type ErpWorkbenchOverview = {
  tenantId: string | null
  tenantLabel: string
  generatedAt: string
  metrics: ErpWorkbenchMetricCard[]
  statusDistribution: ErpWorkbenchStatusBucket[]
  quickEntries: ErpWorkbenchQuickEntry[]
  trend: ErpWorkbenchTrendPoint[]
}
