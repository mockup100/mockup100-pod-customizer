export type ErpTemplatePermissionActionEntry = {
  key: string
  label: string
  path: string
  method: string
  description: string
}

export type ErpTemplatePermissionMetricCard = {
  key: string
  label: string
  value: string
  helperText: string
}

export type ErpTemplatePermissionListView = {
  tenantId: string
  metrics: ErpTemplatePermissionMetricCard[]
  reuseBoundaryNote: string
  reuseEntries: ErpTemplatePermissionActionEntry[]
  supportedVisibilityScopes: Array<{
    value: string
    label: string
  }>
  templates: ErpTemplatePermissionSummary[]
}

export type ErpTemplatePermissionSummary = {
  templateId: string
  templateName: string
  templateVersion: string
  ownerType: string
  templateSource: string
  visibilityScope: string
  designerEnabled: boolean
  downloadEnabled: boolean
  publishEnabled: boolean
  erpSelectable: boolean
  supplierStatus: string
  supplierStatusLabel: string
  reviewStatus: string
  reviewStatusLabel: string
  boundProductCount: number
  blockedTenantCount: number
  printConfig: {
    printAreaName: string | null
    factoryPrintPath: string | null
    effectImageBaseUrl: string | null
  }
  permissionStatus: string
  updatedAt: string
}

export type ErpTemplatePermissionDetail = {
  templateId: string
  tenantId: string
  templateName: string
  templateVersion: string
  ownerType: string
  visibilityScope: string
  designerEnabled: boolean
  downloadEnabled: boolean
  publishEnabled: boolean
  erpSelectable: boolean
  templateOverview: {
    templateSource: string
    supplierStatus: string
    supplierStatusLabel: string
    reviewStatus: string
    reviewStatusLabel: string
    boundProductCount: number
    boundProduct: {
      productId: string
      productName: string
      enabled: boolean
    } | null
    companyName: string
  }
  blacklistedTenants: Array<{
    blockedTenantId: string
    blockedTenantLabel: string
    reason: string | null
  }>
  printConfig: {
    printAreaName: string | null
    factoryPrintPath: string | null
    effectImageBaseUrl: string | null
  }
  permissionStatus: string
  note: string
  allowedRoles: string[]
  reuseBoundaryNote: string
  sourceEntries: ErpTemplatePermissionActionEntry[]
  erpExtensionTips: string[]
  updatedAt: string
  updateEntry: ErpTemplatePermissionActionEntry
}
