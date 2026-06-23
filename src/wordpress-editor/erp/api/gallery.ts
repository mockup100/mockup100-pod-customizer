import { ERP_API_BASE, erpFetch } from "../../api/client"
import type { ErpGalleryDetail, ErpGalleryListView } from "../types"

export async function fetchErpGallery(params?: {
  keyword?: string
  status?: string
  tag?: string
}) {
  const search = new URLSearchParams()
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim())
  if (params?.status?.trim()) search.set("status", params.status.trim())
  if (params?.tag?.trim()) search.set("tag", params.tag.trim())
  const query = search.toString()
  return erpFetch<ErpGalleryListView>(`/gallery${query ? `?${query}` : ""}`)
}

export async function fetchErpGalleryDetail(assetId: string) {
  return erpFetch<ErpGalleryDetail>(`/gallery/${assetId}`)
}

export async function downloadErpGalleryCsv(path: string, params?: {
  keyword?: string
  status?: string
  tag?: string
}) {
  const search = new URLSearchParams()
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim())
  if (params?.status?.trim()) search.set("status", params.status.trim())
  if (params?.tag?.trim()) search.set("tag", params.tag.trim())
  const query = search.toString()
  const requestUrl = ERP_API_BASE ? `${ERP_API_BASE}${path}${query ? `?${query}` : ""}` : `${path}${query ? `?${query}` : ""}`
  const response = await fetch(requestUrl, {
    credentials: "include",
  })
  if (!response.ok) {
    const message = (await response.text()) || `请求失败: ${response.status}`
    throw new Error(message)
  }
  const match = response.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)
  return {
    blob: await response.blob(),
    filename: match?.[1] || "erp-gallery-assets.csv",
  }
}
