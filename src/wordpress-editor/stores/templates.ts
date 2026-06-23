import { ref } from "vue"
import { defineStore } from "pinia"
import {
  gatewayPlatformFetch,
  type DeletionPreviewMode,
  type TemplateDeletionPreviewResponse,
  type TemplatePartPixelBoxes,
  type TemplatePhysicalDimensions,
  type TemplateSummary,
} from "../api/client"
import { useAuthStore } from "./auth"
import type { EditorPayload } from "./editor"

type PageResponse<T> = {
  total: number
  page: number
  size: number
  pages: number
  records: T[]
}

type TemplateConfigPayload = {
  template_id?: string
  template_code?: string
  display_name?: string
  base_size_label?: string
  size_options?: string[]
  export_sizes?: string[]
  compose_params?: Record<string, number>
  input_constraints?: Record<string, unknown>
  physical_dimensions_cm?: TemplatePhysicalDimensions
  part_pixel_boxes?: TemplatePartPixelBoxes
  structure_overrides?: Record<string, unknown>
}

type TemplateIdentity = Pick<TemplateSummary, "template_id" | "governance_id" | "runtime_key" | "template_code">

function normalizeTemplateFamilyToken(item: Partial<TemplateIdentity>): string {
  return String(item.template_code || item.runtime_key || item.template_id || "")
    .trim()
    .split("--")[0]
}

function getTemplateRuntimeTimestamp(item?: Partial<TemplateSummary>): number {
  const raw = String(item?.updated_at || item?.created_at || "").trim()
  if (!raw) return 0
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function pickPreferredRuntimeItem(
  current: TemplateSummary | undefined,
  candidate: TemplateSummary,
): TemplateSummary {
  if (!current) return candidate

  const currentReady = current.ready === true
  const candidateReady = candidate.ready === true
  if (candidateReady !== currentReady) {
    return candidateReady ? candidate : current
  }

  const currentManifest = current.manifest_present !== false
  const candidateManifest = candidate.manifest_present !== false
  if (candidateManifest !== currentManifest) {
    return candidateManifest ? candidate : current
  }

  const currentCover = Boolean(String(current.cover_url || "").trim())
  const candidateCover = Boolean(String(candidate.cover_url || "").trim())
  if (candidateCover !== currentCover) {
    return candidateCover ? candidate : current
  }

  const currentTimestamp = getTemplateRuntimeTimestamp(current)
  const candidateTimestamp = getTemplateRuntimeTimestamp(candidate)
  if (candidateTimestamp !== currentTimestamp) {
    return candidateTimestamp > currentTimestamp ? candidate : current
  }

  return String(candidate.template_id || "") > String(current.template_id || "") ? candidate : current
}

export function buildTemplateIdentityKeys(item: Partial<TemplateIdentity>): string[] {
  const seen = new Set<string>()
  const familyToken = normalizeTemplateFamilyToken(item)
  const keys = [item.template_id, item.governance_id, item.runtime_key, item.template_code, familyToken]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
  return keys.filter((key) => {
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function mergeTemplateCatalog(
  governanceItems: TemplateSummary[],
  runtimeItems: TemplateSummary[],
): TemplateSummary[] {
  const runtimeMap = new Map<string, TemplateSummary>()
  for (const runtimeItem of runtimeItems) {
    for (const key of buildTemplateIdentityKeys(runtimeItem)) {
      runtimeMap.set(key, pickPreferredRuntimeItem(runtimeMap.get(key), runtimeItem))
    }
  }

  return governanceItems
    .map((item) => {
      const runtimeItem = buildTemplateIdentityKeys(item)
        .map((key) => runtimeMap.get(key))
        .find((candidate): candidate is TemplateSummary => Boolean(candidate))
      const runtimeKey = runtimeItem?.runtime_key || runtimeItem?.template_id || item.runtime_key || item.template_id
      if (!runtimeItem) {
        return {
          ...item,
          governance_id: item.governance_id || item.template_id,
          runtime_key: runtimeKey,
        }
      }
      return {
        ...item,
        governance_id: item.governance_id || item.template_id,
        runtime_key: runtimeKey,
        cover_url: runtimeItem.cover_url || item.cover_url,
        colors: runtimeItem.colors?.length ? runtimeItem.colors : item.colors,
        parts_count: runtimeItem.parts_count || item.parts_count,
        views_count: runtimeItem.views_count || item.views_count,
        physical_size_configured: item.physical_size_configured ?? runtimeItem.physical_size_configured,
        ready: runtimeItem.ready ?? item.ready,
        manifest_present: runtimeItem.manifest_present ?? item.manifest_present,
        status: runtimeItem.status || item.status,
        template_size: runtimeItem.template_size || item.template_size,
      }
    })
    .map((item) => ({
      ...item,
      governance_id: item.governance_id || item.template_id,
      runtime_key: item.runtime_key || item.template_id,
    }))
}

export const useTemplateStore = defineStore("templates", () => {
  const authStore = useAuthStore()
  const items = ref<TemplateSummary[]>([])
  const loading = ref(false)
  const error = ref("")

  const validationPayload = ref<Record<string, unknown> | null>(null)
  const editPayload = ref<{
    template_id: string
    template_code?: string
    display_name: string
    base_size_label?: string
    size_options?: string[]
    category_id?: string
    category_path?: string
    access_scope?: "public" | "private"
    tenant_api_status?: "enabled" | "disabled"
    template_size: string
    export_sizes: string[]
    compose_params: Record<string, number>
    input_constraints: Record<string, unknown>
    physical_dimensions_cm?: TemplatePhysicalDimensions
    part_pixel_boxes?: TemplatePartPixelBoxes
    part_names?: string[]
    part_display_names?: Record<string, string>
    structure_overrides: Record<string, unknown>
  } | null>(null)

  function resetState() {
    items.value = []
    loading.value = false
    error.value = ""
    validationPayload.value = null
    editPayload.value = null
  }

  function normalizeTemplateSummary(item: Record<string, unknown>, options?: { deriveTenantApi?: boolean }): TemplateSummary {
    const deriveTenantApi = options?.deriveTenantApi ?? true
    const legacyPublish = String(item.publish_status ?? item.publishStatus ?? "draft")
    const explicitTenantApi = item.tenant_api_status ?? item.tenantApiStatus
    const explicitAccessScope = item.access_scope ?? item.accessScope
    return {
      template_id: String(item.template_id ?? item.templateId ?? ""),
      display_name: String(item.display_name ?? item.displayName ?? ""),
      owner_tenant_id: String(item.owner_tenant_id ?? item.ownerTenantId ?? ""),
      template_code: item.template_code == null && item.templateCode == null ? undefined : String(item.template_code ?? item.templateCode),
      description: item.description == null ? undefined : String(item.description),
      category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
      category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
      access_scope: (
        explicitAccessScope == null
          ? ((legacyPublish === "published" || explicitTenantApi === "enabled") ? "public" : "private")
          : explicitAccessScope
      ) as "public" | "private",
      tenant_api_status: (
        explicitTenantApi == null
          ? (deriveTenantApi ? (legacyPublish === "published" ? "enabled" : "disabled") : undefined)
          : explicitTenantApi
      ) as "enabled" | "disabled" | undefined,
      publish_status: (legacyPublish || "draft") as "draft" | "published",
      template_size: String(item.template_size ?? item.templateSize ?? ""),
      cover_url: String(item.cover_url ?? item.coverUrl ?? item.template_snapshot ?? item.templateSnapshot ?? ""),
      created_at: item.created_at == null && item.createdAt == null ? undefined : String(item.created_at ?? item.createdAt),
      updated_at: String(item.updated_at ?? item.updatedAt ?? ""),
      colors: Array.isArray(item.colors) ? item.colors.map((color) => String(color)) : [],
      parts_count: Number(item.parts_count ?? item.partsCount ?? 0),
      views_count: Number(item.views_count ?? item.viewsCount ?? 0),
      physical_size_configured: item.physical_size_configured == null && item.physicalSizeConfigured == null
        ? undefined
        : Boolean(item.physical_size_configured ?? item.physicalSizeConfigured),
      downloads: item.downloads == null ? undefined : Number(item.downloads),
      renders: item.renders == null ? undefined : Number(item.renders),
      enabled: item.enabled == null ? String(item.status ?? "") !== "disabled" : Boolean(item.enabled),
      status: String(item.status ?? ""),
      ready: item.ready == null ? undefined : Boolean(item.ready),
      manifest_present: item.manifest_present == null && item.manifestPresent == null ? undefined : Boolean(item.manifest_present ?? item.manifestPresent),
      governance_id: item.governance_id == null && item.governanceId == null ? undefined : String(item.governance_id ?? item.governanceId),
      runtime_key: item.runtime_key == null && item.runtimeKey == null ? undefined : String(item.runtime_key ?? item.runtimeKey),
    }
  }

  function hasOwnEntries(value: unknown) {
    return !!value && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0
  }

  function hasPhysicalDimensionParts(value: unknown) {
    if (!value || typeof value !== "object") return false
    const parts = (value as { parts?: Record<string, unknown> }).parts
    return !!parts && typeof parts === "object" && Object.keys(parts).length > 0
  }

  function findTemplateByReference(templateReference: string) {
    const normalizedReference = String(templateReference || "").trim()
    if (!normalizedReference) return undefined
    return items.value.find((item) => buildTemplateIdentityKeys(item).includes(normalizedReference))
  }

  async function resolveTemplateRequestIds(templateReference: string) {
    let templateItem = findTemplateByReference(templateReference)
    if (!templateItem || !String(templateItem.template_code || "").trim()) {
      await load().catch(() => undefined)
      templateItem = findTemplateByReference(templateReference)
    }
    return {
      runtimeItem: templateItem,
      governanceTemplateId: templateItem?.template_id || templateReference,
      runtimeTemplateId: templateItem?.runtime_key || templateItem?.template_id || templateReference,
    }
  }

  function mergeEditPayloadSources(args: {
    requestedTemplateId: string
    runtimeItem?: TemplateSummary
    runtimePayload: EditorPayload
    governanceConfig: TemplateConfigPayload | null
  }) {
    const { requestedTemplateId, runtimeItem, runtimePayload, governanceConfig } = args
    return {
      template_id:
        runtimePayload.template_id ||
        governanceConfig?.template_id ||
        runtimeItem?.template_id ||
        requestedTemplateId,
      template_code:
        governanceConfig?.template_code ||
        runtimePayload.template_code ||
        runtimeItem?.template_code ||
        "",
      display_name:
        governanceConfig?.display_name ||
        runtimeItem?.display_name ||
        runtimePayload.display_name ||
        runtimePayload.template_id ||
        requestedTemplateId,
      base_size_label:
        governanceConfig?.base_size_label ||
        runtimePayload.base_size_label ||
        "",
      size_options:
        Array.isArray(governanceConfig?.size_options) && governanceConfig.size_options.length
          ? governanceConfig.size_options
          : (Array.isArray(runtimePayload.size_options) ? runtimePayload.size_options : []),
      category_id: runtimeItem?.category_id,
      category_path: runtimeItem?.category_path,
      access_scope: runtimeItem?.access_scope,
      template_size: runtimePayload.template_size || runtimeItem?.template_size || "",
      export_sizes:
        Array.isArray(runtimePayload.export_sizes) && runtimePayload.export_sizes.length
          ? runtimePayload.export_sizes
          : Array.isArray(governanceConfig?.export_sizes)
            ? governanceConfig.export_sizes
            : [],
      compose_params:
        hasOwnEntries(runtimePayload.compose_params)
          ? runtimePayload.compose_params
          : (governanceConfig?.compose_params || {}),
      input_constraints:
        hasOwnEntries(runtimePayload.input_constraints)
          ? (runtimePayload.input_constraints || {})
          : (governanceConfig?.input_constraints || {}),
      physical_dimensions_cm:
        hasPhysicalDimensionParts(governanceConfig?.physical_dimensions_cm)
          ? governanceConfig?.physical_dimensions_cm
          : (runtimePayload.physical_dimensions_cm || governanceConfig?.physical_dimensions_cm || { parts: {} }),
      part_pixel_boxes:
        runtimePayload.part_pixel_boxes
        || governanceConfig?.part_pixel_boxes
        || { parts: {} },
      part_names: (runtimePayload.parts || []).map((part) => part.part_name).filter(Boolean),
      part_display_names: Object.fromEntries(
        (runtimePayload.parts || [])
          .map((part) => [String(part.part_name || "").trim(), String(part.part_display_name || part.part_name || "").trim()] as const)
          .filter(([key]) => Boolean(key))
      ),
      structure_overrides:
        hasOwnEntries(runtimePayload.structure_overrides)
          ? (runtimePayload.structure_overrides || {})
          : (governanceConfig?.structure_overrides || {}),
    }
  }

  async function load() {
    loading.value = true
    error.value = ""
    try {
      const [governanceResponse, runtimeResponse] = await Promise.all([
        gatewayPlatformFetch<TemplateSummary[] | PageResponse<TemplateSummary>>("/api/v1/templates", {
          headers: authStore.authHeaders,
        }),
        gatewayPlatformFetch<TemplateSummary[]>("/api/v1/runtime/templates", {
          headers: authStore.authHeaders,
        }).catch(() => []),
      ])
      const governanceRecords = Array.isArray(governanceResponse) ? governanceResponse : governanceResponse.records || []
      const governanceItems = governanceRecords.map((item) => normalizeTemplateSummary(item as Record<string, unknown>))
      const runtimeItems = runtimeResponse.map((item) => normalizeTemplateSummary(item as Record<string, unknown>, { deriveTenantApi: false }))
      items.value = mergeTemplateCatalog(governanceItems, runtimeItems)
    } catch (err) {
      items.value = []
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  async function loadPublished() {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<TemplateSummary[] | PageResponse<TemplateSummary>>("/api/v1/templates?status=published", {
        headers: authStore.authHeaders,
      })
      const records = Array.isArray(response) ? response : response.records || []
      items.value = records.map((item) => normalizeTemplateSummary(item as Record<string, unknown>))
    } catch (err) {
      items.value = []
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  async function loadRuntime() {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<TemplateSummary[]>("/api/v1/runtime/templates", {
        headers: authStore.authHeaders,
      })
      items.value = response.map((item) => normalizeTemplateSummary(item as Record<string, unknown>, { deriveTenantApi: false }))
    } catch (err) {
      items.value = []
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(payload: Record<string, unknown>) {
    const created = await gatewayPlatformFetch<TemplateSummary>("/api/v1/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify(payload),
    })
    await load()
    return created
  }

  async function loadValidation(templateId: string) {
    const { runtimeTemplateId } = await resolveTemplateRequestIds(templateId)
    validationPayload.value = await gatewayPlatformFetch<Record<string, unknown>>(`/api/v1/runtime/templates/${encodeURIComponent(runtimeTemplateId)}/validation`, {
      headers: authStore.authHeaders,
    })
    return validationPayload.value
  }

  async function toggleStatus(templateId: string, action: "enable" | "disable") {
    await gatewayPlatformFetch(`/api/v1/templates/${encodeURIComponent(templateId)}/${action}`, {
      method: "POST",
      headers: authStore.authHeaders,
    })
    await load()
  }

  async function previewDeletion(templateId: string) {
    return gatewayPlatformFetch<TemplateDeletionPreviewResponse>(`/platform/templates/${encodeURIComponent(templateId)}/deletion-preview`, {
      headers: authStore.authHeaders,
    })
  }

  async function remove(templateId: string, mode?: DeletionPreviewMode) {
    const params = new URLSearchParams()
    if (mode) {
      params.set("mode", mode)
    }
    const path = `/api/v1/templates/${encodeURIComponent(templateId)}${params.toString() ? `?${params.toString()}` : ""}`
    await gatewayPlatformFetch(path, {
      method: "DELETE",
      headers: authStore.authHeaders,
    })
    await load()
  }

  async function removeRuntime(templateId: string) {
    await remove(templateId)
  }

  async function enableTemplate(templateId: string) {
    await toggleStatus(templateId, "enable")
  }

  async function disableTemplate(templateId: string) {
    await toggleStatus(templateId, "disable")
  }

  async function fetchItems() {
    await load()
  }

  async function loadEditPayload(templateId: string) {
    const {
      runtimeItem,
      governanceTemplateId,
      runtimeTemplateId,
    } = await resolveTemplateRequestIds(templateId)
    const normalizedRuntimeTemplateId = encodeURIComponent(runtimeTemplateId)
    const normalizedGovernanceTemplateId = encodeURIComponent(governanceTemplateId)
    try {
      const [runtimePayload, governanceConfig] = await Promise.all([
        gatewayPlatformFetch<EditorPayload>(`/api/v1/runtime/templates/${normalizedRuntimeTemplateId}/editor`, {
          headers: authStore.authHeaders,
        }),
        gatewayPlatformFetch<TemplateConfigPayload>(`/api/v1/templates/${normalizedGovernanceTemplateId}/config`, {
          headers: authStore.authHeaders,
        }).catch(() => null),
      ])
      editPayload.value = mergeEditPayloadSources({
        requestedTemplateId: templateId,
        runtimeItem,
        runtimePayload,
        governanceConfig,
      })
      return editPayload.value
    } catch {
      editPayload.value = await gatewayPlatformFetch<typeof editPayload.value>(`/api/v1/templates/${normalizedGovernanceTemplateId}/config`, {
        headers: authStore.authHeaders,
      }).catch(async () => gatewayPlatformFetch<typeof editPayload.value>(`/api/v1/runtime/templates/${normalizedRuntimeTemplateId}/config`, {
        headers: authStore.authHeaders,
      }))
    }
    return editPayload.value
  }

  async function updateTemplate(templateId: string, payload: {
    template_code?: string
    display_name: string
    base_size_label?: string
    size_options?: string[]
    category_id?: string
    category_path?: string
    export_sizes: string[]
    compose_params: Record<string, number>
    input_constraints: Record<string, unknown>
    physical_dimensions_cm?: TemplatePhysicalDimensions
  }) {
    const normalizedTemplateId = encodeURIComponent(templateId)
    const updated = await gatewayPlatformFetch(`/api/v1/templates/${normalizedTemplateId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify(payload),
    })
    await load()
    await loadEditPayload(templateId)
    return updated
  }

  async function setTenantApiStatus(templateId: string, tenantApiStatus: "enabled" | "disabled") {
    await gatewayPlatformFetch(`/api/v1/templates/${encodeURIComponent(templateId)}/${tenantApiStatus === "enabled" ? "api-enable" : "api-disable"}`, {
      method: "POST",
      headers: authStore.authHeaders,
    })
    await load()
    await loadEditPayload(templateId)
  }

  async function setPublishStatus(
    templateId: string,
    publishStatus: "published" | "draft",
    accessScope?: "public" | "private",
  ) {
    const payload = publishStatus === "published" && accessScope
      ? { access_scope: accessScope }
      : undefined
    await gatewayPlatformFetch(`/api/v1/templates/${encodeURIComponent(templateId)}/${publishStatus === "published" ? "publish" : "unpublish"}`, {
      method: "POST",
      headers: payload
        ? {
            "Content-Type": "application/json",
            ...authStore.authHeaders,
          }
        : authStore.authHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
    })
    await load()
    await loadEditPayload(templateId)
  }

  async function setAccessScope(templateId: string, accessScope: "public" | "private") {
    await gatewayPlatformFetch(`/api/v1/templates/${encodeURIComponent(templateId)}/access-scope`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authStore.authHeaders,
      },
      body: JSON.stringify({ access_scope: accessScope }),
    })
    await load()
    await loadEditPayload(templateId)
  }

  return {
    items,
    loading,
    error,
    resetState,
    validationPayload,
    editPayload,
    load,
    loadPublished,
    loadRuntime,
    createTemplate,
    loadValidation,
    toggleStatus,
    enableTemplate,
    disableTemplate,
    previewDeletion,
    remove,
    removeRuntime,
    loadEditPayload,
    updateTemplate,
    setTenantApiStatus,
    setPublishStatus,
    setAccessScope,
    fetchItems,
  }
})
