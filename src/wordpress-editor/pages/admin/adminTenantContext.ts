import type { LocationQuery, RouteLocationRaw } from "vue-router"

function readQueryValue(query: LocationQuery, key: string) {
  const value = query[key]
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0].trim() : ""
  return typeof value === "string" ? value.trim() : ""
}

export type AdminTenantContext = {
  tenantId: string
  tenantLabel: string
}

export function readAdminTenantContext(query: LocationQuery) {
  return {
    tenantId: readQueryValue(query, "tenant_id"),
    tenantLabel: readQueryValue(query, "tenant_label"),
  }
}

export function buildAdminTenantRoute(path: string, tenantId?: string, tenantLabel?: string): RouteLocationRaw {
  if (!tenantId) return path
  const query: Record<string, string> = { tenant_id: tenantId }
  if (tenantLabel) query.tenant_label = tenantLabel
  return { path, query }
}

const ADMIN_TENANT_CONTEXT_STORAGE_KEY = "mockup100_admin_tenant_context"

function readStoredTenantContext(): AdminTenantContext {
  if (typeof window === "undefined") return { tenantId: "", tenantLabel: "" }
  try {
    const raw = window.sessionStorage.getItem(ADMIN_TENANT_CONTEXT_STORAGE_KEY)
    if (!raw) return { tenantId: "", tenantLabel: "" }
    const parsed = JSON.parse(raw) as Partial<AdminTenantContext> | null
    return {
      tenantId: typeof parsed?.tenantId === "string" ? parsed.tenantId.trim() : "",
      tenantLabel: typeof parsed?.tenantLabel === "string" ? parsed.tenantLabel.trim() : "",
    }
  } catch {
    return { tenantId: "", tenantLabel: "" }
  }
}

export function writeStoredAdminTenantContext(context: Partial<AdminTenantContext>) {
  if (typeof window === "undefined") return
  const tenantId = typeof context.tenantId === "string" ? context.tenantId.trim() : ""
  const tenantLabel = typeof context.tenantLabel === "string" ? context.tenantLabel.trim() : ""
  try {
    if (!tenantId) {
      window.sessionStorage.removeItem(ADMIN_TENANT_CONTEXT_STORAGE_KEY)
      return
    }
    const payload: AdminTenantContext = { tenantId, tenantLabel }
    window.sessionStorage.setItem(ADMIN_TENANT_CONTEXT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    return
  }
}

export function readAdminTenantContextWithStorage(query: LocationQuery): AdminTenantContext {
  const fromQuery = readAdminTenantContext(query)
  if (fromQuery.tenantId) {
    writeStoredAdminTenantContext(fromQuery)
    return fromQuery
  }
  return readStoredTenantContext()
}

export function resolveAdminScopedTenantId(options: {
  isPlatformAdmin: boolean
  query: LocationQuery
  fallbackTenantId?: string
}) {
  if (options.isPlatformAdmin) {
    return readAdminTenantContextWithStorage(options.query).tenantId
  }
  return options.fallbackTenantId || ""
}
