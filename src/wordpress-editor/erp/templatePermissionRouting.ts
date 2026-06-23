import type { ErpTemplatePermissionActionEntry } from "./types"

export const ADMIN_TEMPLATE_PERMISSIONS_PATH = "/admin/repository"
export const SUPPLIER_PRODUCT_ADD_PATH = "/erp/supplier/product/add"
export const SUPPLIER_PRODUCT_LIST_PATH = "/erp/supplier/product/list"
export const TEMPLATE_PERMISSION_TEMPLATE_QUERY_KEY = "templateId"
export const TEMPLATE_PERMISSION_SOURCE_QUERY_KEY = "source"
export const SUPPLIER_PRODUCT_ID_QUERY_KEY = "productId"
export const SUPPLIER_PRODUCT_DUPLICATE_QUERY_KEY = "duplicateFromProductId"
export const ADMIN_REPOSITORY_SELECTED_QUERY_KEY = "selected"
export const ADMIN_REPOSITORY_OPEN_PERMISSION_QUERY_KEY = "openPermission"

export type TemplatePermissionNavigationSource =
  | "supplier-product-add"
  | "supplier-product-list"
  | "admin-repository"

function buildPathWithQuery(path: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    const normalized = String(value || "").trim()
    if (normalized) {
      params.set(key, normalized)
    }
  }

  const suffix = params.toString()
  return suffix ? `${path}?${suffix}` : path
}

export function readTemplatePermissionTemplateId(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim()
  }
  return String(value || "").trim()
}

export function buildTemplatePermissionHref(options?: {
  templateId?: string
  source?: TemplatePermissionNavigationSource
}) {
  return buildPathWithQuery(ADMIN_TEMPLATE_PERMISSIONS_PATH, {
    [ADMIN_REPOSITORY_SELECTED_QUERY_KEY]: options?.templateId,
    [ADMIN_REPOSITORY_OPEN_PERMISSION_QUERY_KEY]: options?.templateId ? "1" : undefined,
    [TEMPLATE_PERMISSION_SOURCE_QUERY_KEY]: options?.source,
  })
}

export function buildSupplierProductAddHref(templateId?: string) {
  return buildPathWithQuery(SUPPLIER_PRODUCT_ADD_PATH, {
    [TEMPLATE_PERMISSION_TEMPLATE_QUERY_KEY]: templateId,
    [TEMPLATE_PERMISSION_SOURCE_QUERY_KEY]: "admin-repository",
  })
}

export function buildSupplierProductEditHref(options?: {
  productId?: string
  templateId?: string
}) {
  return buildPathWithQuery(SUPPLIER_PRODUCT_ADD_PATH, {
    [SUPPLIER_PRODUCT_ID_QUERY_KEY]: options?.productId,
    [TEMPLATE_PERMISSION_TEMPLATE_QUERY_KEY]: options?.templateId,
    [TEMPLATE_PERMISSION_SOURCE_QUERY_KEY]: "admin-repository",
  })
}

export function buildSupplierProductDuplicateHref(options?: {
  productId?: string
  templateId?: string
}) {
  return buildPathWithQuery(SUPPLIER_PRODUCT_ADD_PATH, {
    [SUPPLIER_PRODUCT_DUPLICATE_QUERY_KEY]: options?.productId,
    [TEMPLATE_PERMISSION_TEMPLATE_QUERY_KEY]: options?.templateId,
    [TEMPLATE_PERMISSION_SOURCE_QUERY_KEY]: "admin-repository",
  })
}

export function buildSupplierProductListHref(templateId?: string) {
  return buildPathWithQuery(SUPPLIER_PRODUCT_LIST_PATH, {
    [TEMPLATE_PERMISSION_TEMPLATE_QUERY_KEY]: templateId,
    [TEMPLATE_PERMISSION_SOURCE_QUERY_KEY]: "admin-repository",
  })
}

export function mergeTemplatePermissionActionEntries(
  primary: ErpTemplatePermissionActionEntry[],
  additions: ErpTemplatePermissionActionEntry[],
) {
  const merged: ErpTemplatePermissionActionEntry[] = []
  const seen = new Set<string>()

  for (const entry of [...primary, ...additions]) {
    const signature = `${entry.key}:${entry.path}`
    if (seen.has(signature)) {
      continue
    }
    seen.add(signature)
    merged.push(entry)
  }

  return merged
}

export function createSupplierTemplateActionEntries(templateId?: string): ErpTemplatePermissionActionEntry[] {
  return [
    {
      key: "supplier_product_add_entry",
      label: "打开 Supplier 添加产品",
      path: buildSupplierProductAddHref(templateId),
      method: "GET",
      description: "复用 Supplier 产品页完成模板绑定与新建商品。",
    },
    {
      key: "supplier_product_list_entry",
      label: "查看 Supplier 产品列表",
      path: buildSupplierProductListHref(templateId),
      method: "GET",
      description: "查看当前 Supplier 商品绑定结果，并回到产品列表继续处理。",
    },
  ]
}
