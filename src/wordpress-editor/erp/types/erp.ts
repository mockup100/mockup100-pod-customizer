import type { ErpWorkbenchOverview } from "./workbench"

export const ERP_MODULE_CODES = [
  "workbench",
  "gallery",
  "products",
  "design",
  "orders",
  "listings",
  "apps",
  "reports",
  "settings",
] as const

export type ErpModuleCode = typeof ERP_MODULE_CODES[number]

export type ErpModuleDefinition = {
  code: ErpModuleCode
  name: string
  path: string
  description?: string
  enabled?: boolean
}

export type ErpSessionSnapshot = {
  tenantId: string
  email: string
  role: string
  expiresAt: string
}

export type ErpWorkspaceViewProps = {
  overview: ErpWorkbenchOverview | null
  erpSession: ErpSessionSnapshot | null
  loading: boolean
  error: string
}
