export type SupplierApplicationStatus = "not_applied" | "draft" | "pending_review" | "pending" | "rejected" | "approved"
export type SupplierReviewStatus = "not_started" | "pending_review" | "pending" | "rejected" | "approved"
export type SupplierMenuScope =
  | "supplier_apply"
  | "supplier_company"
  | "supplier_draft"
  | "supplier_submitted"
  | "supplier_product"
  | "supplier_audit"

export type SupplierCapabilitySnapshot = {
  application_status: SupplierApplicationStatus
  application_status_label: string
  review_status: SupplierReviewStatus
  review_status_label: string
  current_status?: string
  current_status_label?: string
  entry_route: string
  can_submit_application: boolean
  can_access_workspace: boolean
  can_review_suppliers: boolean
  is_platform_admin: boolean
  isolated_from_tenant_workspace: boolean
  allowed_menu_scopes: SupplierMenuScope[]
  allowed_data_domains: string[]
  latest_review_note?: string | null
  last_submitted_at?: string | null
  last_reviewed_at?: string | null
  rejection_reason?: string | null
}

export type SupplierMenuItem = {
  key: string
  label: string
  to: string
  scope: SupplierMenuScope
  disabled?: boolean
}

type StoredAuthRole = "guest" | "platform_admin" | "tenant_admin"
const SUPPLIER_MENU_SCOPES: SupplierMenuScope[] = [
  "supplier_apply",
  "supplier_company",
  "supplier_draft",
  "supplier_submitted",
  "supplier_product",
  "supplier_audit",
]

type StoredAuthPayload = {
  role?: StoredAuthRole
  accessToken?: string
  supplier?: Partial<SupplierCapabilitySnapshot> | null
}

export function resolveDefaultSupplierCapability(role: StoredAuthRole | string | undefined): SupplierCapabilitySnapshot {
  if (role === "platform_admin") {
    return {
      application_status: "approved",
      application_status_label: "审核通过",
      review_status: "approved",
      review_status_label: "审核通过",
      current_status: "approved",
      current_status_label: "审核通过",
      entry_route: "/erp/supplier",
      can_submit_application: false,
      can_access_workspace: true,
      can_review_suppliers: true,
      is_platform_admin: true,
      isolated_from_tenant_workspace: true,
      allowed_menu_scopes: ["supplier_company", "supplier_product", "supplier_audit"],
      allowed_data_domains: ["supplier_profile", "supplier_products", "supplier_reviews", "tenant_workspace"],
      latest_review_note: null,
      last_submitted_at: null,
      last_reviewed_at: null,
      rejection_reason: null,
    }
  }

  return {
    application_status: "not_applied",
    application_status_label: "未申请",
    review_status: "not_started",
    review_status_label: "未开始",
    current_status: "not_applied",
    current_status_label: "未申请",
    entry_route: "/erp/supplier",
    can_submit_application: true,
    can_access_workspace: false,
    can_review_suppliers: false,
    is_platform_admin: false,
    isolated_from_tenant_workspace: false,
    allowed_menu_scopes: ["supplier_apply"],
    allowed_data_domains: ["supplier_profile"],
    latest_review_note: null,
    last_submitted_at: null,
    last_reviewed_at: null,
    rejection_reason: null,
  }
}

export function normalizeSupplierCapability(
  role: StoredAuthRole | string | undefined,
  supplier?: Partial<SupplierCapabilitySnapshot> | null,
): SupplierCapabilitySnapshot {
  const defaults = resolveDefaultSupplierCapability(role)
  const applicationStatus = normalizeSupplierApplicationStatus(supplier?.application_status ?? defaults.application_status)
  const reviewStatus = normalizeSupplierReviewStatus(supplier?.review_status ?? defaults.review_status)
  const currentStatus = normalizeSupplierCurrentStatus(supplier?.current_status ?? supplier?.application_status ?? defaults.current_status)
  const currentStatusLabel = supplier?.current_status_label ?? supplier?.application_status_label ?? defaults.current_status_label
  const isPlatformAdmin = Boolean(supplier?.is_platform_admin ?? defaults.is_platform_admin)
  const canReviewSuppliers = Boolean(supplier?.can_review_suppliers ?? defaults.can_review_suppliers)
  const canAccessWorkspace = Boolean((supplier?.can_access_workspace ?? defaults.can_access_workspace) || applicationStatus === "approved")
  const normalizedScopes = normalizeSupplierMenuScopes(
    Array.isArray(supplier?.allowed_menu_scopes)
      ? supplier.allowed_menu_scopes
      : defaults.allowed_menu_scopes,
    {
      applicationStatus,
      canAccessWorkspace,
      canReviewSuppliers,
      isPlatformAdmin,
    },
  )

  return {
    application_status: applicationStatus,
    application_status_label: String(supplier?.application_status_label ?? defaults.application_status_label),
    review_status: reviewStatus,
    review_status_label: String(supplier?.review_status_label ?? defaults.review_status_label),
    current_status: currentStatus,
    current_status_label: String(currentStatusLabel ?? defaults.current_status_label),
    entry_route: resolveSupplierEntryRoute({
      ...defaults,
      application_status: applicationStatus,
      review_status: reviewStatus,
      can_access_workspace: canAccessWorkspace,
      can_review_suppliers: canReviewSuppliers,
      is_platform_admin: isPlatformAdmin,
      allowed_menu_scopes: normalizedScopes,
    }),
    can_submit_application: Boolean(supplier?.can_submit_application ?? defaults.can_submit_application),
    can_access_workspace: canAccessWorkspace,
    can_review_suppliers: canReviewSuppliers,
    is_platform_admin: isPlatformAdmin,
    isolated_from_tenant_workspace: Boolean(supplier?.isolated_from_tenant_workspace ?? defaults.isolated_from_tenant_workspace),
    allowed_menu_scopes: normalizedScopes.length ? normalizedScopes : defaults.allowed_menu_scopes,
    allowed_data_domains: Array.isArray(supplier?.allowed_data_domains)
      ? supplier.allowed_data_domains.map((item) => String(item))
      : defaults.allowed_data_domains,
    latest_review_note: supplier?.latest_review_note == null ? defaults.latest_review_note : String(supplier.latest_review_note),
    last_submitted_at: supplier?.last_submitted_at == null ? defaults.last_submitted_at : String(supplier.last_submitted_at),
    last_reviewed_at: supplier?.last_reviewed_at == null ? defaults.last_reviewed_at : String(supplier.last_reviewed_at),
    rejection_reason: supplier?.rejection_reason == null ? defaults.rejection_reason : String(supplier.rejection_reason),
  }
}

function normalizeSupplierMenuScopes(
  scopes: unknown[],
  context: {
    applicationStatus: SupplierApplicationStatus
    canAccessWorkspace: boolean
    canReviewSuppliers: boolean
    isPlatformAdmin: boolean
  },
): SupplierMenuScope[] {
  const normalized = new Set(
    scopes
      .map((item) => String(item))
      .filter((item): item is SupplierMenuScope => SUPPLIER_MENU_SCOPES.includes(item as SupplierMenuScope)),
  )

  if (context.applicationStatus === "not_applied") {
    normalized.add("supplier_apply")
  }

  if (
    context.isPlatformAdmin
    || context.applicationStatus === "draft"
    || context.applicationStatus === "pending_review"
    || context.applicationStatus === "pending"
    || context.applicationStatus === "rejected"
    || context.applicationStatus === "approved"
  ) {
    normalized.add("supplier_company")
    normalized.add("supplier_submitted")
  }

  if (
    context.isPlatformAdmin
    || context.applicationStatus === "draft"
    || context.applicationStatus === "rejected"
    || context.canAccessWorkspace
  ) {
    normalized.add("supplier_draft")
  }

  if (context.canAccessWorkspace || context.applicationStatus === "approved") {
    normalized.add("supplier_product")
  }

  if (context.isPlatformAdmin || context.canReviewSuppliers) {
    normalized.add("supplier_audit")
  }

  return Array.from(normalized)
}

export function readSupplierCapabilityFromStorage(): SupplierCapabilitySnapshot {
  if (typeof window === "undefined") {
    return resolveDefaultSupplierCapability("guest")
  }
  try {
    const raw = window.localStorage.getItem("mockup-console-auth")
    if (!raw) return resolveDefaultSupplierCapability("guest")
    const payload = JSON.parse(raw) as StoredAuthPayload
    return normalizeSupplierCapability(payload.role, payload.supplier || null)
  } catch {
    return resolveDefaultSupplierCapability("guest")
  }
}

export function resolveSupplierEntryRoute(supplier: SupplierCapabilitySnapshot): string {
  if (supplier.is_platform_admin) {
    return "/erp/supplier"
  }
  if (supplier.can_access_workspace || hasStartedSupplierApplication(supplier.application_status)) {
    return "/erp/supplier"
  }
  return "/erp/supplier"
}

export function hasSupplierMenuScope(supplier: SupplierCapabilitySnapshot, scope: SupplierMenuScope): boolean {
  if (scope === "supplier_product") {
    return supplier.allowed_menu_scopes.includes("supplier_product")
  }
  return supplier.allowed_menu_scopes.includes(scope)
}

export function buildSupplierMenu(supplier: SupplierCapabilitySnapshot): SupplierMenuItem[] {
  const canOpenProducts = supplier.can_access_workspace
  const canOpenCompany = supplier.is_platform_admin || hasStartedSupplierApplication(supplier.application_status) || supplier.application_status === "not_applied"

  return [
    {
      key: "supplier-management",
      label: "供应商管理",
      to: "/erp/supplier",
      scope: supplier.can_review_suppliers ? "supplier_audit" : "supplier_company",
      disabled: !canOpenCompany,
    },
    {
      key: "product-management",
      label: "产品管理",
      to: "/erp/supplier/product/list",
      scope: "supplier_product",
      disabled: !canOpenProducts,
    },
  ]
}

function normalizeSupplierApplicationStatus(status: string | undefined): SupplierApplicationStatus {
  if (status === "pending") return "pending_review"
  if (status === "draft" || status === "pending_review" || status === "rejected" || status === "approved") {
    return status
  }
  return "not_applied"
}

function normalizeSupplierReviewStatus(status: string | undefined): SupplierReviewStatus {
  if (status === "pending") return "pending_review"
  if (status === "pending_review" || status === "rejected" || status === "approved") {
    return status
  }
  return "not_started"
}

function normalizeSupplierCurrentStatus(status: string | undefined): string {
  if (status === "pending") return "pending_review"
  return status?.trim() || "not_applied"
}

function hasStartedSupplierApplication(status: SupplierApplicationStatus): boolean {
  return status === "draft" || status === "pending_review" || status === "rejected" || status === "approved"
}
