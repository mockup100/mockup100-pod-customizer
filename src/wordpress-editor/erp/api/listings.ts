import { ERP_API_BASE, erpFetch } from "../../api/client"
import type { ErpListingDetail, ErpListingListView } from "../types"

export async function fetchErpListings(filters?: {
  keyword?: string
  channelCode?: string
  syncStatus?: string
  listingStatus?: string
  shopId?: string
  theme?: string
  designerCode?: string
  operationStatus?: string
}) {
  return erpFetch<ErpListingListView>(withQuery("/listings", filters))
}

export async function fetchErpListingDetail(listingId: string) {
  return erpFetch<ErpListingDetail>(`/listings/${listingId}`)
}

export async function syncErpListing(listingId: string, syncNote: string) {
  return erpFetch<ErpListingDetail>(`/listings/${listingId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "retry", note: syncNote }),
  })
}

export async function downloadErpListingCsv(path: string) {
  const requestUrl = ERP_API_BASE ? `${ERP_API_BASE}${path}` : path
  const response = await fetch(requestUrl, {
    credentials: "include",
  })
  if (!response.ok) {
    const message = (await response.text()) || `请求失败: ${response.status}`
    throw new Error(message)
  }
  const filename = readFilename(response.headers.get("content-disposition"))
  return {
    blob: await response.blob(),
    filename,
  }
}

function readFilename(contentDisposition: string | null) {
  if (!contentDisposition) {
    return "erp-listings.csv"
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/)
  return match?.[1] || "erp-listings.csv"
}

export function buildErpListingExportPath(filters?: {
  keyword?: string
  channelCode?: string
  syncStatus?: string
  listingStatus?: string
  shopId?: string
  theme?: string
  designerCode?: string
  operationStatus?: string
}) {
  return withQuery("/listings/export", filters)
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
