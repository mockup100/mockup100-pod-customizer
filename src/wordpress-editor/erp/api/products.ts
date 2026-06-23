import type { DeletionPreviewMode } from "../../api/client"
import { erpFetch } from "../../api/client"
import type {
  ErpFinishedProductCode,
  ErpProductDeletionPreview,
  ErpProductDeletionResult,
  ErpProductDetail,
  ErpProductSaveRequest,
  ErpProductSummary,
} from "../types"

export async function fetchErpProducts(filters?: {
  keyword?: string
  status?: string
  productType?: string
}) {
  return erpFetch<ErpProductSummary[]>(withQuery("/products", filters))
}

export async function fetchErpProductDetail(productId: string) {
  return erpFetch<ErpProductDetail>(`/products/${productId}`)
}

export async function saveErpProduct(payload: ErpProductSaveRequest) {
  return erpFetch<ErpProductDetail>("/products/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function updateErpProductPrimaryImage(productId: string, imageId: string) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/primary-image`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageId }),
  })
}

export async function markErpSupplierUploadComplete(productId: string, payload: {
  supplierName?: string
  supplierSku?: string
  supplierSourceUrl?: string
}) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/supplier-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function listErpProduct(productId: string) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/list`, {
    method: "POST",
  })
}

export async function unlistErpProduct(productId: string) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/unlist`, {
    method: "POST",
  })
}

export async function submitErpProductReview(productId: string) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/submit-review`, {
    method: "POST",
  })
}

export async function previewErpProductDeletion(productId: string) {
  return erpFetch<ErpProductDeletionPreview>(`/products/${productId}/deletion-preview`)
}

export async function deleteErpProduct(productId: string, mode?: DeletionPreviewMode) {
  return erpFetch<ErpProductDeletionResult>(withQuery(`/products/${productId}`, { mode }), {
    method: "DELETE",
  })
}

export async function reviewErpProduct(productId: string, payload: {
  decision: "approve" | "reject"
  reviewNote: string
}) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function updateErpProductHomepageRecommendation(productId: string, payload: {
  recommended: boolean
}) {
  return erpFetch<ErpProductDetail>(`/products/${productId}/homepage-recommendation`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function fetchNextErpFinishedProductCode(prefix = "FG") {
  const query = new URLSearchParams({ prefix })
  return erpFetch<ErpFinishedProductCode>(`/products/finished-product-code/next?${query.toString()}`)
}

function withQuery(path: string, filters?: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value && value !== "all") {
      query.set(key, value)
    }
  })
  const queryString = query.toString()
  return queryString ? `${path}?${queryString}` : path
}
