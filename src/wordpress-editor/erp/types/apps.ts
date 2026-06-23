export type ErpAppsActionEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpAppsMetricCard = {
  key: string
  label: string
  value: string
  helperText: string
}

export type ErpAppsFilterOption = {
  value: string
  label: string
}

export type ErpAppsCard = {
  appId: string
  appName: string
  appCode: string
  categoryLabel: string
  shortDescription: string
  pricingLabel: string
  heroImageUrl: string
  status: string
  statusLabel: string
  trialEnabled: boolean
  installed: boolean
  lastUsedAt?: string
  primaryAction: ErpAppsActionEntry
}

export type ErpAppsDetail = {
  appId: string
  tenantId: string
  appName: string
  appCode: string
  categoryLabel: string
  shortDescription: string
  pricingLabel: string
  heroImageUrl: string
  status: string
  statusLabel: string
  trialEnabled: boolean
  installed: boolean
  lastUsedAt?: string
  highlights: string[]
  reuseNote: string
  actions: ErpAppsActionEntry[]
}

export type ErpAppsListView = {
  tenantId: string
  wallet: {
    balanceLabel: string
    currencyLabel: string
    rechargeLabel: string
  }
  metrics: ErpAppsMetricCard[]
  statusOptions: ErpAppsFilterOption[]
  categoryOptions: ErpAppsFilterOption[]
  selectedStatus: string
  selectedCategory: string
  reuseNote: string
  apps: ErpAppsCard[]
  rechargeEntry: ErpAppsActionEntry
}
