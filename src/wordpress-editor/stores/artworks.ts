import { ref } from "vue"
import { defineStore } from "pinia"
import {
  type DeletionPreviewMode,
  type ArtworkCodeCheckResult,
  type ArtworkDeletionPreviewResponse,
  gatewayPlatformFetch,
  type ArtworkCategoryNode,
  type ArtworkImportItem,
  type ArtworkImportResult,
  type ArtworkPurchaseRecord,
  type ArtworkLibrarySummary,
  type ArtworkLicenseRecord,
  type ArtworkListItem,
  type ArtworkPurchaseResponse,
  type ArtworkSubmissionReviewEvent,
  type ArtworkSubmissionSummary,
  type ArtworkUploadResponse,
} from "../api/client"
import { useAuthStore } from "./auth"

type PageResponse<T> = {
  total: number
  page: number
  size: number
  pages: number
  records: T[]
}

type ArtworkLibraryScope = "platform" | "tenant"

type ArtworkQuery = {
  keyword?: string
  category_id?: string
  status?: "all" | "active" | "disabled"
  visibility_status?: "all" | "draft" | "listed" | "disabled"
  page?: number
  size?: number
  include_disabled?: boolean
}

type NormalizedArtworkCategoryNode = ArtworkCategoryNode & {
  category_path?: string
}

function normalizeCategoryNode(
  node: ArtworkCategoryNode | Record<string, unknown>,
  parentPath = "",
): NormalizedArtworkCategoryNode {
  const name = String((node as { name?: unknown }).name ?? "")
  const categoryPath = parentPath ? `${parentPath} / ${name}` : name
  const rawChildren = Array.isArray((node as { children?: unknown }).children)
    ? (node as { children: unknown[] }).children
    : []
  return {
    category_id: String((node as { category_id?: unknown }).category_id ?? (node as { categoryId?: unknown }).categoryId ?? ""),
    name,
    slug: String((node as { slug?: unknown }).slug ?? ""),
    level: Number((node as { level?: unknown }).level ?? 1),
    status: String((node as { status?: unknown }).status ?? "active"),
    category_path: categoryPath,
    children: rawChildren.map((child) => normalizeCategoryNode(child as ArtworkCategoryNode, categoryPath)),
  }
}

function normalizeCategoryTree(payload: ArtworkCategoryNode[]) {
  if (!Array.isArray(payload)) return [] as NormalizedArtworkCategoryNode[]
  return payload.map((item) => normalizeCategoryNode(item))
}

function appendTenantQuery(path: string, scope: ArtworkLibraryScope, tenantId?: string) {
  if (scope !== "tenant" || !tenantId?.trim()) return path
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}tenant_id=${encodeURIComponent(tenantId.trim())}`
}

function appendDeletionMode(path: string, mode?: DeletionPreviewMode) {
  if (!mode) return path
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}mode=${encodeURIComponent(mode)}`
}

export const useArtworkStore = defineStore("artworks", () => {
  const authStore = useAuthStore()
  const platformCategories = ref<NormalizedArtworkCategoryNode[]>([])
  const tenantCategories = ref<NormalizedArtworkCategoryNode[]>([])
  const platformItems = ref<ArtworkListItem[]>([])
  const tenantItems = ref<ArtworkListItem[]>([])
  const licenses = ref<ArtworkLicenseRecord[]>([])
  const platformSummary = ref<ArtworkLibrarySummary | null>(null)
  const tenantSummary = ref<ArtworkLibrarySummary | null>(null)
  const platformTotal = ref(0)
  const tenantTotal = ref(0)
  const submissionHistory = ref<Record<string, ArtworkSubmissionReviewEvent[]>>({})
  const loading = ref(false)
  const error = ref("")
  const pendingLibraryRequestCount = ref(0)
  const platformLibraryRequestToken = ref(0)
  const tenantLibraryRequestToken = ref(0)

  async function loadCategories(scope: ArtworkLibraryScope) {
    const path = scope === "platform" ? "/platform/artworks/platform/categories/tree" : "/platform/artworks/tenant/categories/tree"
    const result = normalizeCategoryTree(await gatewayPlatformFetch<ArtworkCategoryNode[]>(path, {
      headers: authStore.authHeaders,
    }))
    if (scope === "platform") {
      platformCategories.value = result
    } else {
      tenantCategories.value = result
    }
    return result
  }

  async function createCategory(payload: {
    name: string
    slug?: string
    parent_id?: string | null
    sort_order?: number
    status?: string
  }) {
    const item = await gatewayPlatformFetch<ArtworkCategoryNode>("/platform/artworks/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify(payload),
    })
    await loadCategories("platform")
    return item
  }

  async function updateCategory(categoryId: string, payload: {
    name: string
    slug?: string
    parent_id?: string | null
    sort_order?: number
    status?: string
  }) {
    const item = await gatewayPlatformFetch<ArtworkCategoryNode>(`/platform/artworks/categories/${encodeURIComponent(categoryId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify(payload),
    })
    await loadCategories("platform")
    return item
  }

  async function deleteCategory(categoryId: string) {
    await gatewayPlatformFetch(`/platform/artworks/categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE",
      headers: authStore.authHeaders,
    })
    await loadCategories("platform")
  }

  async function loadLibrary(scope: ArtworkLibraryScope, query: ArtworkQuery = {}, tenantId?: string) {
    const requestToken = scope === "platform"
      ? (++platformLibraryRequestToken.value)
      : (++tenantLibraryRequestToken.value)
    pendingLibraryRequestCount.value += 1
    loading.value = pendingLibraryRequestCount.value > 0
    error.value = ""
    try {
      const params = new URLSearchParams()
      if (query.keyword?.trim()) params.set("keyword", query.keyword.trim())
      if (query.category_id?.trim()) params.set("category_id", query.category_id.trim())
      if (query.status && query.status !== "all") params.set("status", query.status)
      if (query.visibility_status && query.visibility_status !== "all") {
        params.set("visibility_status", query.visibility_status)
      }
      params.set("page", String(query.page || 1))
      params.set("size", String(query.size || 12))
      if (query.include_disabled) params.set("include_disabled", "true")
      const path = appendTenantQuery(`/platform/artworks/${scope}${params.toString() ? `?${params.toString()}` : ""}`, scope, tenantId)
      const response = await gatewayPlatformFetch<PageResponse<ArtworkListItem>>(path, {
        headers: authStore.authHeaders,
      })
      const isLatestRequest = scope === "platform"
        ? requestToken === platformLibraryRequestToken.value
        : requestToken === tenantLibraryRequestToken.value
      if (!isLatestRequest) return response
      if (scope === "platform") {
        platformItems.value = response.records || []
        platformTotal.value = response.total || 0
      } else {
        tenantItems.value = response.records || []
        tenantTotal.value = response.total || 0
      }
      return response
    } catch (err) {
      const isLatestRequest = scope === "platform"
        ? requestToken === platformLibraryRequestToken.value
        : requestToken === tenantLibraryRequestToken.value
      if (isLatestRequest) {
        error.value = String((err as Error).message || err)
        if (scope === "platform") {
          platformItems.value = []
          platformTotal.value = 0
        } else {
          tenantItems.value = []
          tenantTotal.value = 0
        }
      }
      throw err
    } finally {
      pendingLibraryRequestCount.value = Math.max(0, pendingLibraryRequestCount.value - 1)
      loading.value = pendingLibraryRequestCount.value > 0
    }
  }

  async function loadSummary(scope: ArtworkLibraryScope, tenantId?: string) {
    const response = await gatewayPlatformFetch<ArtworkLibrarySummary>(appendTenantQuery(`/platform/artworks/${scope}/summary`, scope, tenantId), {
      headers: authStore.authHeaders,
    })
    if (scope === "platform") {
      platformSummary.value = response
    } else {
      tenantSummary.value = response
    }
    return response
  }

  async function createArtwork(scope: ArtworkLibraryScope, payload: Record<string, unknown>, tenantId?: string) {
    return gatewayPlatformFetch<ArtworkListItem>(appendTenantQuery(`/platform/artworks/${scope}`, scope, tenantId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify(payload),
    })
  }

  async function checkArtworkCode(
    scope: ArtworkLibraryScope,
    artworkCode: string,
    currentArtworkId?: string,
    tenantId?: string,
  ) {
    const query = new URLSearchParams({
      artwork_code: artworkCode.trim(),
      scope,
    })
    if (currentArtworkId?.trim()) {
      query.set("current_artwork_id", currentArtworkId.trim())
    }
    if (scope === "tenant" && tenantId?.trim()) {
      query.set("tenant_id", tenantId.trim())
    }
    return gatewayPlatformFetch<ArtworkCodeCheckResult>(`/platform/artworks/check-code?${query.toString()}`, {
      headers: authStore.authHeaders,
    })
  }

  async function updateArtwork(scope: ArtworkLibraryScope, artworkId: string, payload: Record<string, unknown>, tenantId?: string) {
    return gatewayPlatformFetch<ArtworkListItem>(appendTenantQuery(`/platform/artworks/${scope}/${encodeURIComponent(artworkId)}`, scope, tenantId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify(payload),
    })
  }

  async function toggleArtwork(scope: ArtworkLibraryScope, artworkId: string, action: "enable" | "disable", tenantId?: string) {
    return gatewayPlatformFetch<ArtworkListItem>(appendTenantQuery(`/platform/artworks/${scope}/${encodeURIComponent(artworkId)}/${action}`, scope, tenantId), {
      method: "POST",
      headers: authStore.authHeaders,
    })
  }

  async function previewPlatformArtworkDeletion(artworkId: string) {
    return gatewayPlatformFetch<ArtworkDeletionPreviewResponse>(`/platform/artworks/platform/${encodeURIComponent(artworkId)}/deletion-preview`, {
      headers: authStore.authHeaders,
    })
  }

  async function previewTenantArtworkDeletion(artworkId: string, tenantId?: string) {
    return gatewayPlatformFetch<ArtworkDeletionPreviewResponse>(
      appendTenantQuery(`/platform/artworks/tenant/${encodeURIComponent(artworkId)}/deletion-preview`, "tenant", tenantId),
      {
        headers: authStore.authHeaders,
      },
    )
  }

  async function deleteTenantArtwork(artworkId: string, tenantId?: string, mode?: DeletionPreviewMode) {
    return gatewayPlatformFetch(
      appendTenantQuery(appendDeletionMode(`/platform/artworks/tenant/${encodeURIComponent(artworkId)}`, mode), "tenant", tenantId),
      {
        method: "DELETE",
        headers: authStore.authHeaders,
      },
    )
  }

  async function deletePlatformArtwork(artworkId: string, mode?: DeletionPreviewMode) {
    return gatewayPlatformFetch(appendDeletionMode(`/platform/artworks/platform/${encodeURIComponent(artworkId)}`, mode), {
      method: "DELETE",
      headers: authStore.authHeaders,
    })
  }

  async function clearPlatformArtworkLibrary() {
    return gatewayPlatformFetch("/platform/artworks/platform", {
      method: "DELETE",
      headers: authStore.authHeaders,
    })
  }

  async function importPlatformArtwork(items: ArtworkImportItem[]) {
    return gatewayPlatformFetch<ArtworkImportResult>("/platform/artworks/platform/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify({ items }),
    })
  }

  async function submitTenantArtwork(artworkId: string, tenantId?: string) {
    return gatewayPlatformFetch<ArtworkSubmissionSummary>(appendTenantQuery(`/platform/artworks/tenant/${encodeURIComponent(artworkId)}/submit`, "tenant", tenantId), {
      method: "POST",
      headers: authStore.authHeaders,
    })
  }

  async function listArtworkSubmissions(options: { tenantId?: string; artworkId?: string; status?: string; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (options.tenantId?.trim()) params.set("tenant_id", options.tenantId.trim())
    if (options.artworkId?.trim()) params.set("artwork_id", options.artworkId.trim())
    if (options.status?.trim()) params.set("status", options.status.trim())
    params.set("limit", String(options.limit ?? 100))
    return gatewayPlatformFetch<ArtworkSubmissionSummary[]>(`/platform/artworks/submissions?${params.toString()}`, {
      headers: authStore.authHeaders,
    })
  }

  async function listPurchaseRecords(options: {
    tenantId?: string
    role?: "buyer" | "seller"
    artworkId?: string
    status?: string
    limit?: number
  } = {}) {
    const params = new URLSearchParams()
    if (options.tenantId?.trim()) params.set("tenant_id", options.tenantId.trim())
    if (options.role?.trim()) params.set("role", options.role.trim())
    if (options.artworkId?.trim()) params.set("artwork_id", options.artworkId.trim())
    if (options.status?.trim()) params.set("status", options.status.trim())
    params.set("limit", String(options.limit ?? 100))
    return gatewayPlatformFetch<ArtworkPurchaseRecord[]>(`/platform/artworks/commerce/purchases?${params.toString()}`, {
      headers: authStore.authHeaders,
    })
  }

  async function loadArtworkSubmissionHistory(submissionId: string) {
    const items = await gatewayPlatformFetch<ArtworkSubmissionReviewEvent[]>(
      `/platform/artworks/submissions/${encodeURIComponent(submissionId)}/history`,
      { headers: authStore.authHeaders },
    )
    submissionHistory.value = {
      ...submissionHistory.value,
      [submissionId]: items,
    }
    return items
  }

  async function decideArtworkSubmission(
    submissionId: string,
    action: "start_review" | "under_review" | "changes_requested" | "approved" | "rejected" | "approve" | "reject",
    reviewNote = "",
  ) {
    const decision = action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : action
    return gatewayPlatformFetch<ArtworkSubmissionSummary>(`/platform/artworks/submissions/${encodeURIComponent(submissionId)}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify({
        decision,
        action: decision,
        note: reviewNote,
        review_note: reviewNote,
      }),
    })
  }

  async function delistPlatformArtwork(artworkId: string, reviewNote: string) {
    return gatewayPlatformFetch<ArtworkListItem>(`/platform/artworks/platform/${encodeURIComponent(artworkId)}/delist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify({ review_note: reviewNote }),
    })
  }

  async function purchaseArtwork(artworkId: string) {
    const response = await gatewayPlatformFetch<ArtworkPurchaseResponse>(`/platform/artworks/${encodeURIComponent(artworkId)}/purchase`, {
      method: "POST",
      headers: authStore.authHeaders,
    })
    await loadLicenses().catch(() => [])
    return response
  }

  async function loadLicenses() {
    const response = await gatewayPlatformFetch<ArtworkLicenseRecord[]>("/platform/artworks/licenses", {
      headers: authStore.authHeaders,
    })
    licenses.value = response
    return response
  }

  async function getArtworkLicense(artworkId: string) {
    return gatewayPlatformFetch<ArtworkLicenseRecord>(`/platform/artworks/licenses/${encodeURIComponent(artworkId)}`, {
      headers: authStore.authHeaders,
    })
  }

  async function uploadArtworkFile(scope: ArtworkLibraryScope, file: File, tenantId?: string) {
    const formData = new FormData()
    formData.append("file", file)
    return gatewayPlatformFetch<ArtworkUploadResponse>(appendTenantQuery(`/platform/artworks/${scope}/upload`, scope, tenantId), {
      method: "POST",
      headers: authStore.authHeaders,
      body: formData,
    })
  }

  return {
    platformCategories,
    tenantCategories,
    platformItems,
    tenantItems,
    licenses,
    platformSummary,
    tenantSummary,
    platformTotal,
    tenantTotal,
    submissionHistory,
    loading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    loadLibrary,
    loadSummary,
    createArtwork,
    checkArtworkCode,
    updateArtwork,
    toggleArtwork,
    previewPlatformArtworkDeletion,
    previewTenantArtworkDeletion,
    deleteTenantArtwork,
    deletePlatformArtwork,
    clearPlatformArtworkLibrary,
    importPlatformArtwork,
    submitTenantArtwork,
    listArtworkSubmissions,
    listPurchaseRecords,
    loadArtworkSubmissionHistory,
    decideArtworkSubmission,
    delistPlatformArtwork,
    purchaseArtwork,
    loadLicenses,
    getArtworkLicense,
    uploadArtworkFile,
  }
})
