import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { gatewayPlatformFetch, resolveRuntimeAssetUrl } from "../api/client"
import { useAuthStore } from "./auth"
import type { TemplatePartPixelBoxes, TemplatePhysicalDimensions } from "../api/client"
import type { ViewGeometryValue } from "../utils/physicalRuler"
import { resolvePreviewRuntimeConfigSource } from "../utils/repositoryPreviewWorkspace"

export type EditorPart = {
  part_name: string
  part_display_name?: string
  cutout_url: string
  guide_url: string
  svg_url?: string
}

export type EditorPayload = {
  template_id: string
  template_code?: string
  display_name?: string
  base_size_label?: string
  size_options?: string[]
  template_source?: string
  publish_status?: "draft" | "published"
  tenant_api_status?: "enabled" | "disabled"
  marketplace_status?: "listed" | "private"
  runtime_ready?: boolean
  template_size: string
  colors: string[]
  default_color: string
  views: string[]
  default_view?: string
  export_sizes: string[]
  supported_output_sizes?: string[]
  preview_map: Record<string, string>
  parts: EditorPart[]
  default_output_size: string
  compose_params: Record<string, number>
  input_constraints?: Record<string, unknown>
  physical_dimensions_cm?: TemplatePhysicalDimensions
  part_pixel_boxes?: TemplatePartPixelBoxes
  structure_overrides?: Record<string, unknown>
  view_geometry?: ViewGeometryValue
  editor_compose_url?: string
}

type TemplateConfigPayload = {
  template_id?: string
  base_size_label?: string
  size_options?: string[]
  physical_dimensions_cm?: TemplatePhysicalDimensions
  part_pixel_boxes?: TemplatePartPixelBoxes
}

export const useEditorStore = defineStore("editor", () => {
  const authStore = useAuthStore()
  const payload = ref<EditorPayload | null>(null)
  const loading = ref(false)
  const error = ref("")

  const colorCount = computed(() => payload.value?.colors.length ?? 0)
  const viewCount = computed(() => payload.value?.views.length ?? 0)

  function normalizePayload(payload: EditorPayload): EditorPayload {
    return {
      ...payload,
      preview_map: Object.fromEntries(
        Object.entries(payload.preview_map || {}).map(([key, value]) => [key, resolveRuntimeAssetUrl(value)])
      ),
      parts: (payload.parts || []).map((part) => ({
        ...part,
        cutout_url: resolveRuntimeAssetUrl(part.cutout_url),
        guide_url: resolveRuntimeAssetUrl(part.guide_url),
        svg_url: part.svg_url ? resolveRuntimeAssetUrl(part.svg_url) : "",
      })),
    }
  }

  function hasPhysicalDimensionParts(value: unknown) {
    if (!value || typeof value !== "object") return false
    const parts = (value as { parts?: Record<string, unknown> }).parts
    return !!parts && typeof parts === "object" && Object.keys(parts).length > 0
  }

  function mergeEditorPayloadSources(runtimePayload: EditorPayload, governanceConfig: TemplateConfigPayload | null): EditorPayload {
    return {
      ...runtimePayload,
      base_size_label: governanceConfig?.base_size_label || runtimePayload.base_size_label || "",
      size_options:
        Array.isArray(governanceConfig?.size_options) && governanceConfig.size_options.length
          ? governanceConfig.size_options
          : (Array.isArray(runtimePayload.size_options) ? runtimePayload.size_options : []),
      physical_dimensions_cm:
        hasPhysicalDimensionParts(governanceConfig?.physical_dimensions_cm)
          ? governanceConfig?.physical_dimensions_cm
          : (runtimePayload.physical_dimensions_cm || governanceConfig?.physical_dimensions_cm || { parts: {} }),
      part_pixel_boxes:
        runtimePayload.part_pixel_boxes
        || governanceConfig?.part_pixel_boxes
        || { parts: {} },
    }
  }

  async function loadGovernanceConfig(templateId: string) {
    if (!templateId) return null
    try {
      return await gatewayPlatformFetch<TemplateConfigPayload>(`/api/v1/templates/${encodeURIComponent(templateId)}/config`, {
        headers: authStore.authHeaders,
      })
    } catch {
      return null
    }
  }

  async function loadRuntimeConfig(
    templateId: string,
    options?: {
      publishedOnly?: boolean
      storefrontSlug?: string
    },
  ) {
    if (!templateId) return null
    const query = new URLSearchParams()
    if (options?.publishedOnly) query.set("published_only", "true")
    if (String(options?.storefrontSlug || "").trim()) {
      query.set("storefront_slug", String(options?.storefrontSlug || "").trim())
    }
    const suffix = query.toString() ? `?${query.toString()}` : ""
    try {
      return await gatewayPlatformFetch<TemplateConfigPayload>(`/api/v1/runtime/templates/${encodeURIComponent(templateId)}/config${suffix}`, {
        headers: authStore.authHeaders,
      })
    } catch {
      return null
    }
  }

  async function loadEditorPayload(
    templateId: string,
    options?: {
      publishedOnly?: boolean
      storefrontSlug?: string
      previewSource?: string
    },
  ) {
    const publishedOnly = Boolean(options?.publishedOnly)
    const storefrontSlug = String(options?.storefrontSlug || "").trim()
    const query = new URLSearchParams()
    if (publishedOnly) query.set("published_only", "true")
    if (storefrontSlug) query.set("storefront_slug", storefrontSlug)
    const suffix = query.toString() ? `?${query.toString()}` : ""
    const runtimePayload = await gatewayPlatformFetch<EditorPayload>(
      `/api/v1/runtime/templates/${encodeURIComponent(templateId)}/editor${suffix}`,
      {
        headers: authStore.authHeaders,
      },
    )
    const resolvedTemplateId = runtimePayload.template_id || templateId
    const configSource = resolvePreviewRuntimeConfigSource({
      source: String(options?.previewSource || ""),
      publishedOnly,
    })
    const templateConfig = configSource === "runtime"
      ? await loadRuntimeConfig(resolvedTemplateId, { publishedOnly, storefrontSlug })
      : await loadGovernanceConfig(resolvedTemplateId)
    return normalizePayload(mergeEditorPayloadSources(runtimePayload, templateConfig))
  }

  async function load(templateId: string, options?: { previewSource?: string }) {
    if (!templateId) return
    loading.value = true
    error.value = ""
    payload.value = null
    try {
      payload.value = await loadEditorPayload(templateId, {
        publishedOnly: false,
        previewSource: options?.previewSource,
      })
    } catch (err) {
      payload.value = null
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  async function loadPublished(templateId: string, storefrontSlug?: string, options?: { previewSource?: string }) {
    if (!templateId) return
    loading.value = true
    error.value = ""
    payload.value = null
    try {
      payload.value = await loadEditorPayload(templateId, {
        publishedOnly: true,
        storefrontSlug,
        previewSource: options?.previewSource,
      })
    } catch (err) {
      payload.value = null
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  return { payload, loading, error, colorCount, viewCount, load, loadPublished }
})
