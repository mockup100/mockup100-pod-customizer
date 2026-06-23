import { ERP_API_BASE, erpFetch } from "../../api/client"
import type { ErpOrderDetail, ErpOrderListView } from "../types"

export async function fetchErpOrders(filters?: {
  keyword?: string
  status?: string
  shopId?: string
  platform?: string
  riskLevel?: string
  timePreset?: string
}) {
  return erpFetch<ErpOrderListView>(withQuery("/orders", filters))
}

export async function fetchErpOrderDetail(orderId: string) {
  return erpFetch<ErpOrderDetail>(`/orders/${orderId}`)
}

export async function updateErpOrderStatus(orderId: string, nextStatus: string) {
  return erpFetch<ErpOrderDetail>(`/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetStatus: nextStatus }),
  })
}

export async function saveErpShipment(orderId: string, payload: {
  shipmentId?: string
  shipmentNo: string
  shipmentStatus: string
  carrierCode?: string
  trackingNo?: string
}) {
  return erpFetch<ErpOrderDetail>(`/orders/${orderId}/shipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function syncErpOrders() {
  return erpFetch<ErpOrderListView>("/orders/sync", {
    method: "POST",
  })
}

export async function downloadErpOrderCsv(path: string) {
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
    return "erp-orders.csv"
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/)
  return match?.[1] || "erp-orders.csv"
}

export function buildErpOrderExportPath(filters?: {
  keyword?: string
  status?: string
  shopId?: string
  platform?: string
  riskLevel?: string
  timePreset?: string
}) {
  return withQuery("/orders/export", filters)
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
