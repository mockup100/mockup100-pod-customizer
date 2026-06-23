export type ErpPopularSearchActionEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpPopularSearchMetricCard = {
  key: string
  label: string
  value: string
  helperText: string
}

export type ErpPopularSearchFilterOption = {
  value: string
  label: string
}

export type ErpPopularSearchRow = {
  termId: string
  serialNumber: number
  hotWord: string
  appletLabel: string
  status: string
  statusLabel: string
  operatorName: string
  sortOrder: number
  updatedAt: string
  actions: ErpPopularSearchActionEntry[]
}

export type ErpPopularSearchDetail = {
  termId: string
  tenantId: string
  hotWord: string
  appletLabel: string
  status: string
  statusLabel: string
  operatorName: string
  sortOrder: number
  updatedAt: string
  updateEntry: ErpPopularSearchActionEntry
}

export type ErpPopularSearchListView = {
  tenantId: string
  metrics: ErpPopularSearchMetricCard[]
  statusOptions: ErpPopularSearchFilterOption[]
  appletOptions: ErpPopularSearchFilterOption[]
  selectedStatus: string
  selectedApplet: string
  rows: ErpPopularSearchRow[]
  pagination: {
    total: number
    page: number
    pageSize: number
  }
  createEntry: ErpPopularSearchActionEntry
}
