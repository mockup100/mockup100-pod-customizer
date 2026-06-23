import { erpFetch } from "../../api/client"
import type { ErpPopularSearchDetail, ErpPopularSearchListView } from "../types"

export async function fetchErpPopularSearchTerms(filters: {
  keyword?: string
  status?: string
  applet?: string
} = {}) {
  const search = new URLSearchParams()
  if (filters.keyword?.trim()) {
    search.set("keyword", filters.keyword.trim())
  }
  if (filters.status?.trim() && filters.status !== "all") {
    search.set("status", filters.status.trim())
  }
  if (filters.applet?.trim() && filters.applet !== "all") {
    search.set("applet", filters.applet.trim())
  }
  const query = search.toString()
  return erpFetch<ErpPopularSearchListView>(`/settings/popular-search${query ? `?${query}` : ""}`)
}

export async function fetchErpPopularSearchDetail(termId: string) {
  return erpFetch<ErpPopularSearchDetail>(`/settings/popular-search/${termId}`)
}

export async function saveErpPopularSearchTerm(payload: {
  termId?: string
  hotWord: string
  appletLabel: string
  status: string
  operatorName?: string
  sortOrder?: number
}) {
  return erpFetch<ErpPopularSearchDetail>("/settings/popular-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
