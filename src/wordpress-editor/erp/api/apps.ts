import { erpFetch } from "../../api/client"
import type { ErpAppsDetail, ErpAppsListView } from "../types"

export async function fetchErpApps(filters: {
  keyword?: string
  status?: string
  category?: string
} = {}) {
  const search = new URLSearchParams()
  if (filters.keyword?.trim()) {
    search.set("keyword", filters.keyword.trim())
  }
  if (filters.status?.trim() && filters.status !== "all") {
    search.set("status", filters.status.trim())
  }
  if (filters.category?.trim() && filters.category !== "all") {
    search.set("category", filters.category.trim())
  }
  const query = search.toString()
  return erpFetch<ErpAppsListView>(`/apps${query ? `?${query}` : ""}`)
}

export async function fetchErpAppDetail(appId: string) {
  return erpFetch<ErpAppsDetail>(`/apps/${appId}`)
}
