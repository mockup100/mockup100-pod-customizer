import { ERP_API_BASE, erpFetch } from "../../api/client"
import type { ErpReportOverview } from "../types"

export type ErpReportQuery = {
  startDate?: string
  endDate?: string
  shopId?: string
  platform?: string
  product?: string
}

function buildQueryString(query: ErpReportQuery = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      search.set(key, value)
    }
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ""
}

export async function fetchErpReports(query: ErpReportQuery = {}) {
  return erpFetch<ErpReportOverview>(`/reports${buildQueryString(query)}`)
}

export async function downloadErpReportCsv(path: string) {
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
    return "erp-report.csv"
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/)
  return match?.[1] || "erp-report.csv"
}
