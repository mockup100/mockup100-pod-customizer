import type {
  ArtworkLicenseRecord as ContractsArtworkLicenseRecord,
  ArtworkPurchaseResponse as ContractsArtworkPurchaseResponse,
  ArtworkSubmissionReviewEvent as ContractsArtworkSubmissionReviewEvent,
  ArtworkSubmissionSummary as ContractsArtworkSubmissionSummary,
} from "../../../mockup-SAAS/repos/mockup-saas-contracts/generated/typescript/billing"
import { UI_LOCALE_STORAGE_KEY } from "../stores/uiLocale"

function normalizeBaseUrl(value?: string): string {
  const next = (value || "").trim()
  if (!next) return ""
  if (
    next === "http://localhost:3000" ||
    next === "http://localhost:3000/" ||
    next === "http://127.0.0.1:3000" ||
    next === "http://127.0.0.1:3000/"
  ) {
    return ""
  }
  return next.replace(/\/$/, "")
}

function resolveGatewayBase(): string {
  if (typeof window !== "undefined") {
    const runtimeBase = normalizeBaseUrl((window as typeof window & { __MOCKUP100_GATEWAY_BASE__?: string }).__MOCKUP100_GATEWAY_BASE__)
    if (runtimeBase) {
      return runtimeBase
    }
  }
  return normalizeBaseUrl(import.meta.env.VITE_GATEWAY_BASE)
}

export const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE)
export const PLATFORM_API_BASE = normalizeBaseUrl(import.meta.env.VITE_PLATFORM_API_BASE)
export function getGatewayBase(): string {
  return resolveGatewayBase()
}

type WordPressPreviewContext = {
  product_id: string
  variation_id?: string
  template_id?: string
  wp_user_id?: string
  account_id?: string
  site_host?: string
  wc_nonce?: string
  designer_products_path?: string
  designer_categories_path?: string
}

function getWordPressPreviewContext(): WordPressPreviewContext | null {
  if (typeof window === "undefined") return null
  const raw = (
    window as typeof window & {
      __MOCKUP100_WORDPRESS_CONTEXT__?: {
        productId?: string | number
        product_id?: string | number
        variationId?: string | number
        variation_id?: string | number
        templateId?: string
        template_id?: string
        wp_user_id?: string | number
        account_id?: string
        site_host?: string
        wc_nonce?: string
        product_nav?: {
          restPaths?: {
            products?: string
            categories?: string
          }
        } | null
      }
    }
  ).__MOCKUP100_WORDPRESS_CONTEXT__
  if (!raw) return null
  const product_id = String(raw.product_id ?? raw.productId ?? "").trim()
  if (!product_id) return null
  const variation_id = String(raw.variation_id ?? raw.variationId ?? "").trim()
  const template_id = String(raw.template_id ?? raw.templateId ?? "").trim()
  const wp_user_id = String(raw.wp_user_id ?? "").trim()
  const account_id = String(raw.account_id ?? "").trim()
  const site_host = String(raw.site_host ?? "").trim()
  const wc_nonce = String(raw.wc_nonce ?? "").trim()
  const designer_products_path = String(raw.product_nav?.restPaths?.products || "").trim()
  const designer_categories_path = String(raw.product_nav?.restPaths?.categories || "").trim()
  return {
    product_id,
    variation_id: variation_id || undefined,
    template_id: template_id || undefined,
    wp_user_id: wp_user_id || undefined,
    account_id: account_id || undefined,
    site_host: site_host || undefined,
    wc_nonce: wc_nonce || undefined,
    designer_products_path: designer_products_path || undefined,
    designer_categories_path: designer_categories_path || undefined,
  }
}

function buildWordPressProductPath(
  context: WordPressPreviewContext,
  suffix: string,
  query?: URLSearchParams,
): string {
  const next = new URLSearchParams(query ? query.toString() : "")
  if (context.variation_id && !next.has("variation_id")) {
    next.set("variation_id", context.variation_id)
  }
  const normalizedSuffix = suffix.startsWith("/") ? suffix : `/${suffix}`
  const search = next.toString()
  return `/wp-json/mockup100/v1/product/${encodeURIComponent(context.product_id)}${normalizedSuffix}${search ? `?${search}` : ""}`
}

function mapWordPressBindingToTemplateSummary(binding: Record<string, unknown>) {
  const templateId = String(binding.template_id ?? binding.templateId ?? "")
  const displayName = String(binding.display_name ?? binding.title ?? binding.template_label ?? templateId)
  const categoryId = String(binding.category_id ?? binding.categoryId ?? "")
  const categoryPath = String(binding.category_path ?? binding.categoryPath ?? "")
  const coverUrl = String(binding.cover_url ?? binding.coverUrl ?? binding.template_snapshot ?? binding.templateSnapshot ?? "")
  return {
    template_id: templateId,
    governance_id: templateId,
    runtime_key: templateId,
    display_name: displayName,
    template_code: String(binding.template_code ?? binding.templateCode ?? ""),
    owner_tenant_id: "",
    category_id: categoryId,
    category_path: categoryPath,
    access_scope: "public" as const,
    tenant_api_status: "enabled" as const,
    publish_status: "published" as const,
    template_size: "",
    cover_url: coverUrl,
    created_at: "",
    updated_at: "",
    colors: [],
    parts_count: 0,
    views_count: 0,
    enabled: true,
    ready: true,
    manifest_present: true,
    status: "active",
    template_source: String(binding.template_source ?? binding.templateSource ?? "woocommerce"),
    title: displayName,
    listing_id: templateId,
    marketplace_status: "listed" as const,
  }
}

function buildWordPressTemplateCategories(bindings: Record<string, unknown>[]) {
  const seen = new Map<string, { category_id: string; name: string; level: number; category_path: string; children: never[] }>()
  bindings.forEach((binding) => {
    const category_id = String(binding.category_id ?? binding.categoryId ?? "").trim()
    if (!category_id || seen.has(category_id)) return
    const category_path = String(binding.category_path ?? binding.categoryPath ?? category_id).trim()
    seen.set(category_id, {
      category_id,
      name: category_path.split("/").pop()?.trim() || category_path,
      level: 1,
      category_path,
      children: [],
    })
  })
  return Array.from(seen.values())
}

async function loadWordPressBindings(init?: RequestInit) {
  const context = getWordPressPreviewContext()
  if (!context) return [] as Record<string, unknown>[]
  const payload = await requestJson<Record<string, unknown>>("", buildWordPressProductPath(context, "/template"), init)
  const bindings = Array.isArray((payload as { bindings?: unknown }).bindings)
    ? ((payload as { bindings: Record<string, unknown>[] }).bindings)
    : []
  return bindings
}

function parseJsonBody(body?: BodyInit | null): Record<string, unknown> {
  if (typeof body !== "string") return {}
  try {
    const parsed = JSON.parse(body) as unknown
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function withJsonBody(init: RequestInit | undefined, payload: Record<string, unknown>): RequestInit {
  const headers = new Headers(init?.headers || {})
  headers.set("Content-Type", "application/json")
  return {
    ...init,
    headers,
    body: JSON.stringify(payload),
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ""
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error("Failed to read blob."))
    reader.onload = () => resolve(String(reader.result || ""))
    reader.readAsDataURL(blob)
  })
}

async function buildWordPressComposePayload(
  body: BodyInit | null | undefined,
  context: WordPressPreviewContext,
): Promise<Record<string, unknown>> {
  if (!(body instanceof FormData)) {
    const parsed = parseJsonBody(body)
    return {
      ...parsed,
      template_id: String(parsed.template_id ?? context.template_id ?? "").trim(),
      variation_id: String(parsed.variation_id ?? context.variation_id ?? "").trim() || undefined,
    }
  }
  const partNames = String(body.get("part_names") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const partFiles = body.getAll("part_images").filter((item): item is File => item instanceof File)
  const parts = await Promise.all(partFiles.map(async (file, index) => ({
    name: partNames[index] || file.name.replace(/\.[^.]+$/, ""),
    data_url: await blobToDataUrl(file),
  })))
  const composeOverridesRaw = String(body.get("compose_overrides") || "{}")
  let compose_overrides: Record<string, unknown> | unknown[] = {}
  try {
    compose_overrides = JSON.parse(composeOverridesRaw)
  } catch {
    compose_overrides = {}
  }
  return {
    template_id: String(body.get("template_id") || context.template_id || "").trim(),
    variation_id: String(body.get("variation_id") || context.variation_id || "").trim() || undefined,
    selected_color: String(body.get("selected_color") || "").trim(),
    selected_view: String(body.get("selected_view") || "").trim(),
    output_size: String(body.get("output_size") || "").trim(),
    compose_overrides,
    parts,
  }
}

async function requestWordPressProxy<T>(path: string, init?: RequestInit): Promise<T | null> {
  const context = getWordPressPreviewContext()
  if (!context) return null

  const [pathname, search = ""] = path.split("?", 2)
  const query = new URLSearchParams(search)

  if (pathname === "/api/v1/preview/context") {
    const template_id = String(query.get("template_id") || context.template_id || "").trim()
    return {
      template_id,
      default_preview_template_id: template_id,
    } as T
  }

  if (pathname === "/api/v1/wordpress/designer/products") {
    const next = new URLSearchParams(search)
    if (!next.has("current_product_id")) {
      next.set("current_product_id", context.product_id)
    }
    const basePath = context.designer_products_path || "/wp-json/mockup100/v1/designer/products"
    const resolvedPath = `${basePath}${next.toString() ? `?${next.toString()}` : ""}`
    return await requestJson<T>("", resolvedPath, init)
  }

  if (pathname === "/api/v1/wordpress/designer/product-categories") {
    const basePath = context.designer_categories_path || "/wp-json/mockup100/v1/designer/product-categories"
    return await requestJson<T>("", basePath, init)
  }

  if (
    pathname === "/marketplace/templates"
    || pathname === "/api/v1/templates"
    || pathname === "/api/v1/runtime/templates"
  ) {
    const bindings = await loadWordPressBindings(init)
    const items = bindings.map((binding) => mapWordPressBindingToTemplateSummary(binding))
    return items as T
  }

  if (pathname === "/platform/template-categories/tree") {
    const bindings = await loadWordPressBindings(init)
    return buildWordPressTemplateCategories(bindings) as T
  }

  const runtimeEditorMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/editor$/)
  const runtimeConfigMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/config$/)
  const governanceConfigMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/config$/)
  if (runtimeEditorMatch || runtimeConfigMatch || governanceConfigMatch) {
    const template_id = decodeURIComponent(
      runtimeEditorMatch?.[1]
      || runtimeConfigMatch?.[1]
      || governanceConfigMatch?.[1]
      || context.template_id
      || "",
    ).trim()
    const response = await requestJson<Record<string, unknown>>(
      "",
      buildWordPressProductPath(context, "/editor", new URLSearchParams(template_id ? { template_id } : undefined)),
      init,
    )
    return ((response as { editor?: unknown }).editor || response) as T
  }

  if (pathname === "/platform/artworks/platform" || pathname === "/platform/artworks/tenant") {
    const next = new URLSearchParams()
    next.set("scope", pathname.endsWith("/tenant") ? "tenant" : "platform")
      ;["page", "size", "keyword", "category_id"].forEach((key) => {
        if (query.has(key)) next.set(key, query.get(key) || "")
      })
    return await requestJson<T>("", buildWordPressProductPath(context, "/artworks", next), init)
  }

  if (
    pathname === "/platform/artworks/platform/categories/tree"
    || pathname === "/platform/artworks/tenant/categories/tree"
    || pathname === "/platform/artworks/categories/tree"
    || pathname === "/artworks/categories/tree"
  ) {
    const response = await requestJson<Record<string, unknown>>("", buildWordPressProductPath(context, "/artworks/categories/tree"), init)
    return (((response as { records?: unknown }).records) || response) as T
  }

  if (pathname === "/platform/artworks/licenses") {
    const response = await requestJson<Record<string, unknown>>("", buildWordPressProductPath(context, "/artworks/licenses"), init)
    return (((response as { records?: unknown }).records) || response) as T
  }

  const artworkLicenseMatch = pathname.match(/^\/platform\/artworks\/licenses\/([^/]+)$/)
  if (artworkLicenseMatch) {
    return await requestJson<T>(
      "",
      buildWordPressProductPath(context, `/artworks/licenses/${artworkLicenseMatch[1]}`),
      init,
    )
  }

  const artworkPurchaseMatch = pathname.match(/^\/platform\/artworks\/([^/]+)\/purchase$/)
  if (artworkPurchaseMatch) {
    return await requestJson<T>(
      "",
      buildWordPressProductPath(context, `/artworks/${artworkPurchaseMatch[1]}/purchase`),
      init,
    )
  }

  if (pathname === "/api/v1/artworks/uploads") {
    return await requestJson<T>(
      "",
      buildWordPressProductPath(context, "/uploaded-artworks", new URLSearchParams(search)),
      init,
    )
  }

  const uploadArtworkMatch = pathname.match(/^\/api\/v1\/artworks\/uploads\/([^/]+)$/)
  if (uploadArtworkMatch) {
    return await requestJson<T>(
      "",
      buildWordPressProductPath(context, `/uploaded-artworks/${uploadArtworkMatch[1]}`),
      init,
    )
  }

  if (pathname === "/api/v1/preview/drafts") {
    const next = new URLSearchParams()
    if (query.has("template_id")) next.set("template_id", query.get("template_id") || "")
    const response = await requestJson<Record<string, unknown>>("", buildWordPressProductPath(context, "/drafts", next), init)
    return (((response as { drafts?: unknown }).drafts) || response) as T
  }

  const previewDraftMatch = pathname.match(/^\/api\/v1\/preview\/drafts\/([^/]+)$/)
  if (previewDraftMatch) {
    const response = await requestJson<Record<string, unknown>>(
      "",
      buildWordPressProductPath(context, `/drafts/${previewDraftMatch[1]}`),
      init,
    )
    return (((response as { draft?: unknown }).draft) || response) as T
  }

  if (pathname === "/api/v1/preview/outputs") {
    if ((init?.method || "GET").toUpperCase() === "GET") {
      const next = new URLSearchParams()
      if (query.has("template_id")) next.set("template_id", query.get("template_id") || "")
      if (query.has("limit")) next.set("limit", query.get("limit") || "")
      const response = await requestJson<Record<string, unknown>>("", buildWordPressProductPath(context, "/results", next), init)
      return (((response as { results?: unknown }).results) || response) as T
    }
    const response = await requestJson<Record<string, unknown>>("", buildWordPressProductPath(context, "/results"), init)
    return (((response as { result?: unknown }).result) || response) as T
  }

  const previewOutputMatch = pathname.match(/^\/api\/v1\/preview\/outputs\/([^/]+)$/)
  if (previewOutputMatch) {
    const response = await requestJson<Record<string, unknown>>(
      "",
      buildWordPressProductPath(context, `/results/${previewOutputMatch[1]}`),
      init,
    )
    return (((response as { result?: unknown }).result) || response) as T
  }

  if (pathname === "/api/v1/runtime/editor/compose") {
    const payload = await buildWordPressComposePayload(init?.body, context)
    const rawResponse = await requestJson<Record<string, unknown>>(
      "",
      buildWordPressProductPath(context, "/preview"),
      withJsonBody(init, payload),
    )
    const response = (rawResponse as { response?: Record<string, unknown> }).response || rawResponse
    const compose = (response as { compose?: Record<string, unknown> }).compose || {}
    const jobResults = (response as { job_results?: Record<string, unknown> }).job_results || {}
    const outputs = Array.isArray(jobResults.outputs)
      ? jobResults.outputs
      : (Array.isArray(compose.outputs) ? compose.outputs : [])
    return {
      job_id: String(compose.job_id ?? response.job_id ?? ""),
      outputs,
    } as T
  }

  if (pathname === "/api/v1/preview/drafts" || pathname === "/api/v1/preview/outputs") {
    return null
  }

  return null
}
// ERP pages should hit the dedicated `/erp-api` gateway by default so dev/prod
// can share the same request path convention.
export const ERP_API_BASE = normalizeBaseUrl(import.meta.env.VITE_ERP_API_BASE || "/erp-api")
export const RUNTIME_ASSET_BASE = normalizeBaseUrl(import.meta.env.VITE_RENDER_ENGINE_URL)
// 运行时资产 OSS 公网访问基址（含 bucket 路径前缀），例如 https://oss.mockup100.com/mockup-saas
// 当 filePath 形如 render-files/... runtime-assets/... render-archives/... 时，
// 直接走 OSS 公网域名而不是 /render/file?path= （后者只服务于 JOB_ROOT 本地文件）。
export const RUNTIME_OSS_PUBLIC_BASE = (() => {
  const explicit = normalizeBaseUrl(import.meta.env.VITE_RUNTIME_OSS_PUBLIC_BASE)
  if (explicit) return explicit
  return "https://oss.mockup100.com/mockup-saas"
})()

function resolveArtworkProxyUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null
  try {
    const parsed = new URL(value)
    if (String(parsed.host || "").toLowerCase() !== "oss.mockup100.com") return null
    const match = parsed.pathname.match(/^\/artworks\/(upload|tenant|platform)\/(\d{4})\/(\d{2})\/([^/?#]+)$/)
    if (!match) return null
    const apiBase = API_BASE || "/api/v1"
    return `${apiBase}/artworks/files/${match[1]}/${match[2]}/${match[3]}/${match[4]}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

function shouldProxyWordPressRuntimeAsset(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const parsed = new URL(value)
    const host = String(parsed.host || "").toLowerCase()
    const pathname = String(parsed.pathname || "")
    const isMockupHost = host === "oss.mockup100.com" || host.endsWith(".mockup100.com") || host === "www.mockup100.com"
    if (!isMockupHost) return false
    // 平台 external API 暴露的 compose outputs 走 /api/v1/external/runtime/jobs/.../outputs/N/preview|download,
    // 受 x-api-key 保护,前端无法直读,必须走插件代理(代理内附加 API key)。
    if (pathname.includes("/api/v1/external/runtime/jobs/")) {
      return true
    }
    // 其它 *.mockup100.com 子域(包括 oss/cdn 等)命中受保护/跨域限制路径,均走代理
    return (
      pathname.includes("/runtime-assets/") ||
      pathname.includes("/render-files/") ||
      pathname.includes("/render-archives/") ||
      pathname.startsWith("/artworks/")
    )
  } catch {
    return false
  }
}

export function resolveRuntimeAssetUrl(value?: string): string {
  const next = (value || "").trim()
  if (!next) return ""
  // 防御历史 DB 数据：preview_url 可能落库为 ".../render/file?path=undefined"，
  // 直接拒绝以免 WP shell 把死链转成 /runtime-asset?url= 代理后仍然 404。
  if (/[?&]path=(undefined|null|)\b/i.test(next)) return ""
  let resolved = next
  // 历史 DB 数据里的 preview_url/download_url 可能是 /render/file?path=render-files/... 或
  // https://www.mockup100.com/render/file?path=render-files/... 这种形态；在生产环境 /render/file
  // 仅服务于 JOB_ROOT 本地路径，对 OSS 资产会返回 403。所以这里统一拆出 path 参数并改写为 OSS 公网 URL。
  const renderFileMatch = /^(?:https?:\/\/[^/]+)?\/render\/file\?(.+)$/i.exec(resolved)
  if (renderFileMatch && RUNTIME_OSS_PUBLIC_BASE) {
    try {
      const params = new URLSearchParams(renderFileMatch[1])
      const inner = String(params.get("path") || "").trim().replace(/^\/+/, "")
      const ossInner = /^(runtime-assets|render-files|render-archives)\/.+$/.exec(inner)
      if (inner && ossInner) {
        resolved = `${RUNTIME_OSS_PUBLIC_BASE}/${inner}`
      }
    } catch {
      // ignore
    }
  }
  if (!/^https?:\/\//i.test(resolved) && !resolved.startsWith("data:")) {
    if (resolved.startsWith("/runtime-assets/") && RUNTIME_ASSET_BASE) {
      resolved = `${RUNTIME_ASSET_BASE}${resolved}`
    } else {
      // 形如 render-files/... runtime-assets/... 没带前导 / 的相对路径，直接走 OSS 公网。
      const stripped = resolved.replace(/^\/+/, "")
      const ossRel = /^(runtime-assets|render-files|render-archives)\/.+$/.exec(stripped)
      if (ossRel && RUNTIME_OSS_PUBLIC_BASE) {
        resolved = `${RUNTIME_OSS_PUBLIC_BASE}/${stripped}`
      }
    }
  }
  const wordpressContext = getWordPressPreviewContext()
  if (wordpressContext && shouldProxyWordPressRuntimeAsset(resolved)) {
    return buildWordPressProductPath(
      wordpressContext,
      "/runtime-asset",
      new URLSearchParams({ url: resolved }),
    )
  }
  return resolved
}

export type PhysicalDisplayUnit = "cm" | "mm" | "in"

export type TemplateDimensionValue = {
  left?: number
  top?: number
  width: number
  height: number
  source?: string
  raw_width?: string
  raw_height?: string
  confidence?: string
}

export type TemplatePixelBox = {
  left: number
  top: number
  width: number
  height: number
  source?: string
}

export type TemplatePartPixelBoxEntry = {
  canvas?: TemplatePixelBox
  bbox?: TemplatePixelBox
}

export type TemplatePartPixelBoxes = {
  parts: Record<string, TemplatePartPixelBoxEntry>
}

export type TemplatePixelSize = {
  width: number
  height: number
}

export type TemplateDpiValue = {
  x?: number
  y?: number
  source?: string
}

export type TemplateSvgSourceInfo = {
  width?: string
  height?: string
  view_box?: string
  unit?: string
  pixel_width?: number
  pixel_height?: number
  source?: string
  confidence?: string
}

export type TemplatePngSourceInfo = {
  width_px?: number
  height_px?: number
}

export type TemplatePartOriginalInfo = {
  canvas_px?: TemplatePixelSize
  bbox_px?: TemplatePixelSize & {
    source?: string
    confidence?: string
  }
  dpi?: TemplateDpiValue
  source_001?: TemplatePngSourceInfo
  source_svg?: TemplateSvgSourceInfo
}

export type TemplatePartPhysicalDimension = {
  width: number
  height: number
  source?: string
  raw_width?: string
  raw_height?: string
  confidence?: string
  canvas?: TemplateDimensionValue
  bbox?: TemplateDimensionValue
  original?: TemplatePartOriginalInfo
}

export type TemplatePhysicalDimensions = {
  default_unit?: PhysicalDisplayUnit
  parts: Record<string, TemplatePartPhysicalDimension>
}

export type TemplatePhysicalDimensionsCandidate = {
  raw_width?: string
  raw_height?: string
  normalized_cm?: {
    width: number
    height: number
  }
  source?: string
  confidence?: string
  canvas?: TemplateDimensionValue
  bbox?: TemplateDimensionValue
  original?: TemplatePartOriginalInfo
}

export type TemplateSummary = {
  template_id: string
  governance_id?: string
  runtime_key?: string
  display_name: string
  base_size_label?: string
  size_options?: string[]
  owner_tenant_id: string
  template_code?: string
  description?: string
  category_id?: string
  category_path?: string
  access_scope?: "public" | "private"
  tenant_api_status?: "enabled" | "disabled"
  publish_status?: "draft" | "published"
  template_size: string
  cover_url: string
  created_at?: string
  updated_at: string
  colors: string[]
  parts_count: number
  views_count: number
  physical_size_configured?: boolean
  downloads?: number
  renders?: number
  enabled?: boolean
  status: string
  ready?: boolean
  manifest_present?: boolean
  physical_dimensions_cm?: TemplatePhysicalDimensions
  part_pixel_boxes?: TemplatePartPixelBoxes
}

export type DeletionPreviewMode = "hide_only" | "soft_delete" | "purge"

export type TemplateDeletionImpactSummary = {
  category_binding_count: number
  center_listing_count: number
  submission_count: number
  active_submission_count: number
  submission_review_count: number
  runtime_preview_state_count: number
  runtime_preview_draft_count: number
  runtime_preview_output_count: number
  usage_record_count: number
  commission_record_count: number
  published: boolean
  api_enabled: boolean
}

export type TemplateDeletionPreviewResponse = {
  template_id: string
  display_name: string
  owner_tenant_id: string
  recommended_mode: DeletionPreviewMode
  allowed_modes: DeletionPreviewMode[]
  has_protected_references: boolean
  impact_summary: TemplateDeletionImpactSummary
  warnings: string[]
}

export type ArtworkDeletionSummary = {
  submission_count: number
  pending_submission_count: number
  purchase_count: number
  license_count: number
  linked_platform_copy_count: number
}

export type ArtworkDeletionPreviewResponse = {
  artwork_id: string
  artwork_code?: string
  library_scope: "upload" | "platform" | "tenant"
  name: string
  recommended_mode: DeletionPreviewMode
  allowed_modes: DeletionPreviewMode[]
  has_key_references: boolean
  summary: ArtworkDeletionSummary
}

export type ArtworkCodeCheckResult = {
  artwork_code: string
  available: boolean
  state?: "available" | "conflict_active" | "conflict_deleted" | "recoverable_deleted"
  message?: string
  existing_artwork_id?: string
}

export type TemplateCenterListing = {
  listing_id: string
  template_id: string
  template_code?: string
  title: string
  description?: string
  category_id?: string
  category_path?: string
  creator_name?: string
  listed_at?: string
  marketplace_status?: string
  cover_url?: string
  access_scope?: "public" | "private"
  tenant_api_status?: "enabled" | "disabled"
}

export type ArtworkCategoryNode = {
  category_id: string
  parent_id?: string | null
  name: string
  slug: string
  level: number
  status: string
  sort_order?: number
  children: ArtworkCategoryNode[]
}

export type ArtworkListItem = {
  artwork_id: string
  artwork_code?: string
  library_scope: "platform" | "tenant"
  owner_tenant_id?: string | null
  source_provider?: string
  source_asset_id?: string
  source_url?: string
  name: string
  description?: string
  mime_type: string
  file_ext: string
  category_id?: string
  category_path?: string
  preview_url: string
  original_url: string
  creator_name?: string
  license_name?: string
  license_url?: string
  attribution_required?: boolean
  width?: number
  height?: number
  commerce_type?: "free" | "paid"
  price_tokens?: number
  access_scope?: "public" | "private"
  api_status?: "enabled" | "disabled"
  visibility_status?: "draft" | "listed" | "disabled"
  sale_mode?: string
  is_platform_owned?: boolean
  listed_at?: string
  review_status?: "not_required" | "submitted" | "under_review" | "changes_requested" | "approved" | "rejected" | "pending"
  review_note?: string
  reviewed_by?: string
  reviewed_at?: string
  purchased?: boolean
  unlocked?: boolean
  can_edit?: boolean
  can_purchase?: boolean
  status: string
  created_at?: string
  updated_at?: string
}

export type ArtworkLibrarySummary = {
  library_scope: "platform" | "tenant"
  owner_tenant_id?: string | null
  total_count: number
  active_count: number
  disabled_count: number
  listed_count: number
  draft_count: number
  hidden_count: number
  pending_review_count: number
  approved_count: number
  rejected_count: number
  paid_count: number
  free_count: number
  purchase_count: number
  license_count: number
}

export type ArtworkSubmissionSummary = ContractsArtworkSubmissionSummary

export type ArtworkSubmissionReviewEvent = ContractsArtworkSubmissionReviewEvent

export type ArtworkPurchaseResponse = ContractsArtworkPurchaseResponse

export type ArtworkLicenseRecord = ContractsArtworkLicenseRecord

export type ArtworkPurchaseRecord = {
  purchase_id: string
  artwork_id: string
  artwork_code?: string
  artwork_name?: string
  buyer_tenant_id?: string
  seller_tenant_id?: string
  source_type?: string
  commerce_type?: string
  price_tokens?: number
  creator_commission_tokens?: number
  platform_revenue_tokens?: number
  asset_code?: string
  commission_record_id?: string
  license_grant_id?: string
  license_status?: string
  status: string
  is_platform_owned?: boolean
  created_at?: string
  updated_at?: string
  granted_at?: string
  preview_url?: string
  creator_name?: string
  owner_tenant_id?: string
  resource_type?: string
}

export type ArtworkUploadResponse = {
  preview_url: string
  original_url: string
  mime_type: string
  file_ext: string
  file_size: number
}

export type StorefrontReviewStatus = "draft" | "pending_review" | "approved" | "rejected"

export type TenantStorefrontSummary = {
  tenant_id: string
  store_slug?: string
  store_name?: string
  store_bio?: string
  store_logo_url?: string
  store_banner_url?: string
  store_contact_email?: string
  store_website_url?: string
  store_instagram_url?: string
  store_facebook_url?: string
  store_tiktok_url?: string
  store_status?: StorefrontReviewStatus
  store_submitted_at?: string
  store_reviewed_at?: string
  store_review_note?: string
  store_reviewer_email?: string
  store_updated_at?: string
  templates: TemplateCenterListing[]
  artworks: ArtworkListItem[]
}

export type TenantStorefrontCardSummary = {
  tenant_id: string
  store_slug?: string
  store_name?: string
  store_bio?: string
  store_logo_url?: string
  store_banner_url?: string
  store_updated_at?: string
  storefront_sort_order?: number
  template_count?: number
  artwork_count?: number
}

export type ArtworkImportItem = {
  artwork_code?: string
  source_provider: "openclipart" | "met" | "openverse" | "libreclipart"
  source_asset_id?: string
  source_url?: string
  upstream_source_name?: string
  upstream_license_verified?: boolean
  name: string
  description?: string
  mime_type: string
  file_ext: string
  category_id?: string
  category_path?: string
  preview_url: string
  original_url: string
  creator_name?: string
  license_name: string
  license_url?: string
  attribution_required?: boolean
  width?: number
  height?: number
  status?: string
}

export type ArtworkImportResult = {
  created_count: number
  skipped_count: number
  failed_count: number
  messages: string[]
}

export type ApiFieldError = {
  field?: string
  code?: string
  message?: string
}

export class ApiRequestError extends Error {
  status: number
  responseCode?: number | string
  errors: ApiFieldError[]
  payload: unknown

  constructor(params: {
    status: number
    message: string
    responseCode?: number | string
    errors?: ApiFieldError[]
    payload?: unknown
  }) {
    super(params.message)
    this.name = "ApiRequestError"
    this.status = params.status
    this.responseCode = params.responseCode
    this.errors = params.errors || []
    this.payload = params.payload
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toResponseCode(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") {
    return value
  }
  return undefined
}

function toApiFieldErrors(value: unknown): ApiFieldError[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter(isRecord)
    .map((item) => ({
      field: toNonEmptyString(item.field),
      code: toNonEmptyString(item.code),
      message: toNonEmptyString(item.message),
    }))
    .filter((item) => item.field || item.code || item.message)
}

function readStructuredErrorCandidate(value: unknown): {
  responseCode?: number | string
  message?: string
  errors: ApiFieldError[]
} | null {
  if (!isRecord(value)) {
    return null
  }

  const errors = toApiFieldErrors(value.errors)
  const detail = toNonEmptyString(value.detail)
  const message = toNonEmptyString(value.message)
  const error = toNonEmptyString(value.error)
  const responseCode = toResponseCode(value.code)

  if (!errors.length && !detail && !message && !error && responseCode === undefined) {
    return null
  }

  return {
    responseCode,
    message: detail || message || error,
    errors,
  }
}

function collectStructuredErrorCandidates(value: unknown): Array<{
  responseCode?: number | string
  message?: string
  errors: ApiFieldError[]
}> {
  const queue: unknown[] = [value]
  const seen = new Set<object>()
  const candidates: Array<{
    responseCode?: number | string
    message?: string
    errors: ApiFieldError[]
  }> = []

  while (queue.length) {
    const current = queue.shift()
    const candidate = readStructuredErrorCandidate(current)
    if (candidate) {
      candidates.push(candidate)
    }

    if (!isRecord(current)) {
      continue
    }

    for (const nested of [current.error, current.data]) {
      if (isRecord(nested) && !seen.has(nested)) {
        seen.add(nested)
        queue.push(nested)
      }
    }
  }

  return candidates
}

function buildApiRequestError(response: Response, payload: string): ApiRequestError {
  if (!payload) {
    return new ApiRequestError({
      status: response.status,
      message: `Request failed: ${response.status}`,
    })
  }

  try {
    const parsed = JSON.parse(payload) as unknown
    const candidates = collectStructuredErrorCandidates(parsed)
    const fieldMessage = candidates.flatMap((item) => item.errors).find((item) => item.message)?.message
    const candidateWithErrors = candidates.find((item) => item.errors.length)
    const fallbackCandidate = candidates.find((item) => item.message || item.responseCode !== undefined)
    const message = fieldMessage || fallbackCandidate?.message || payload

    return new ApiRequestError({
      status: response.status,
      message,
      responseCode: candidateWithErrors?.responseCode ?? fallbackCandidate?.responseCode,
      errors: candidateWithErrors?.errors || [],
      payload: parsed,
    })
  } catch {
    return new ApiRequestError({
      status: response.status,
      message: payload,
    })
  }
}

export function resolveApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.find((item) => item.message)?.message || error.message
  }
  return String((error as Error).message || error)
}

function toSnakeKey(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
}

function normalizePayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePayload(item)) as T
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>
    if ("data" in source && Object.keys(source).some((key) => ["code", "message", "timestamp", "traceId", "trace_id", "errors"].includes(key))) {
      return normalizePayload(source.data as T)
    }
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(source)) {
      next[toSnakeKey(key)] = normalizePayload(item)
    }
    return next as T
  }
  return value
}

function buildGatewayRuntimePath(path: string): string | null {
  const [pathname, search = ""] = path.split("?", 2)
  const query = new URLSearchParams(search)
  if (pathname === "/api/v1/runtime/templates") {
    const suffix = query.toString()
    return `/runtime/templates${suffix ? `?${suffix}` : ""}`
  }
  const runtimeTemplateEditorMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/editor$/)
  if (runtimeTemplateEditorMatch) {
    if (query.get("published_only") === "true") {
      const next = new URLSearchParams()
      next.set("template_id", runtimeTemplateEditorMatch[1])
      if (query.has("storefront_slug")) next.set("storefront_slug", query.get("storefront_slug") || "")
      return `/preview/runtime-editor?${next.toString()}`
    }
    const suffix = query.toString()
    return `/runtime/templates/${runtimeTemplateEditorMatch[1]}/editor${suffix ? `?${suffix}` : ""}`
  }
  const runtimeTemplateConfigMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/config$/)
  if (runtimeTemplateConfigMatch) {
    const suffix = query.toString()
    return `/runtime/templates/${runtimeTemplateConfigMatch[1]}/config${suffix ? `?${suffix}` : ""}`
  }
  const runtimeTemplateValidationMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/validation$/)
  if (runtimeTemplateValidationMatch) {
    return `/runtime/templates/${runtimeTemplateValidationMatch[1]}/validation`
  }
  const runtimeTemplateRenderStatsMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/render-stats$/)
  if (runtimeTemplateRenderStatsMatch) {
    return `/runtime/templates/${runtimeTemplateRenderStatsMatch[1]}/render-stats`
  }
  const runtimeTemplateSummaryMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/summary$/)
  if (runtimeTemplateSummaryMatch) {
    return `/runtime/templates/${runtimeTemplateSummaryMatch[1]}/summary`
  }
  const runtimeTemplateGradingComposeMatch = pathname.match(/^\/api\/v1\/runtime\/templates\/([^/]+)\/grading\/compose$/)
  if (runtimeTemplateGradingComposeMatch) {
    return `/runtime/templates/${runtimeTemplateGradingComposeMatch[1]}/grading/compose`
  }
  if (pathname === "/api/v1/runtime/editor/compose") {
    return "/runtime/editor/compose"
  }
  if (pathname === "/api/v1/runtime/compose") {
    const suffix = query.toString()
    return `/runtime/compose${suffix ? `?${suffix}` : ""}`
  }
  const runtimeJobMatch = pathname.match(/^\/api\/v1\/runtime\/jobs\/([^/]+)$/)
  if (runtimeJobMatch) {
    return `/runtime/jobs/${runtimeJobMatch[1]}`
  }
  const runtimeJobDownloadMatch = pathname.match(/^\/api\/v1\/runtime\/jobs\/([^/]+)\/download$/)
  if (runtimeJobDownloadMatch) {
    return `/runtime/jobs/${runtimeJobDownloadMatch[1]}/download`
  }
  if (pathname === "/api/v1/templates") {
    const next = new URLSearchParams()
    if (query.has("owner_tenant_id")) next.set("owner_tenant_id", query.get("owner_tenant_id") || "")
    if (query.has("published_only")) next.set("published_only", query.get("published_only") || "true")
    const suffix = next.toString()
    return `/templates${suffix ? `?${suffix}` : ""}`
  }
  const editorMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/editor$/)
  if (editorMatch) {
    const suffix = query.toString()
    return `/templates/${editorMatch[1]}/editor${suffix ? `?${suffix}` : ""}`
  }
  const configMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/config$/)
  if (configMatch) {
    if (query.get("published_only") === "true") {
      const next = new URLSearchParams()
      next.set("published_only", "true")
      if (query.has("storefront_slug")) next.set("storefront_slug", query.get("storefront_slug") || "")
      return `/runtime/templates/${configMatch[1]}/config?${next.toString()}`
    }
    const suffix = query.toString()
    return `/templates/${configMatch[1]}/config${suffix ? `?${suffix}` : ""}`
  }
  const renderStatsMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/render-stats$/)
  if (renderStatsMatch) {
    return `/templates/${renderStatsMatch[1]}/render-stats`
  }
  const validationMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/validation$/)
  if (validationMatch) {
    return `/templates/${validationMatch[1]}/validation`
  }
  const toggleMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/(enable|disable)$/)
  if (toggleMatch) {
    return `/templates/${toggleMatch[1]}/${toggleMatch[2]}`
  }
  const templateActionMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)\/(publish|unpublish|api-enable|api-disable)$/)
  if (templateActionMatch) {
    return `/templates/${templateActionMatch[1]}/${templateActionMatch[2]}`
  }
  const templateMatch = pathname.match(/^\/api\/v1\/templates\/([^/]+)$/)
  if (templateMatch) {
    return `/templates/${templateMatch[1]}`
  }
  const uploadStatusMatch = pathname.match(/^\/api\/v1\/templates\/uploads\/([^/]+)$/)
  if (uploadStatusMatch) {
    return `/api/v1/templates/uploads/${uploadStatusMatch[1]}`
  }
  if (pathname === "/api/v1/templates/uploads/check-code") {
    const suffix = query.toString()
    return `/api/v1/templates/uploads/check-code${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/api/v1/templates/uploads/inspect") {
    return "/api/v1/templates/uploads/inspect"
  }
  if (pathname === "/api/v1/templates/uploads/chunk/init") {
    return "/api/v1/templates/uploads/chunk/init"
  }
  if (pathname === "/api/v1/templates/uploads/chunk/part") {
    return "/api/v1/templates/uploads/chunk/part"
  }
  if (pathname === "/api/v1/templates/uploads/chunk/inspect") {
    return "/api/v1/templates/uploads/chunk/inspect"
  }
  if (pathname === "/api/v1/templates/uploads") {
    return "/api/v1/templates/uploads"
  }
  if (pathname === "/api/v1/render/editor/compose") {
    return "/render/editor/compose"
  }
  if (pathname === "/render/files/archive") {
    return "/render/files/archive"
  }
  if (pathname === "/render/file") {
    const suffix = query.toString()
    return `/render/file${suffix ? `?${suffix}` : ""}`
  }
  return null
}

function buildGatewayPlatformPath(path: string): string | null {
  const [pathname, search = ""] = path.split("?", 2)
  const query = new URLSearchParams(search)
  if (pathname === "/auth/me") {
    return "/api/v1/auth/me"
  }
  if (pathname === "/auth/register") {
    return "/api/v1/auth/register"
  }
  if (pathname === "/auth/login") {
    return "/api/v1/auth/login"
  }
  if (pathname === "/auth/logout") {
    return "/api/v1/auth/logout"
  }
  if (pathname === "/auth/trial/enable") {
    return "/api/v1/auth/trial/enable"
  }
  if (pathname === "/auth/email/send-verification") {
    return "/api/v1/auth/email/send-verification"
  }
  if (pathname === "/auth/email/verify") {
    return "/api/v1/auth/email/verify"
  }
  if (pathname === "/auth/password/forgot") {
    return "/api/v1/auth/password/forgot"
  }
  if (pathname === "/auth/password/reset") {
    return "/api/v1/auth/password/reset"
  }
  if (pathname === "/auth/password/change") {
    return "/api/v1/auth/password/change"
  }
  if (pathname === "/auth/erp/tickets") {
    return "/api/v1/auth/erp/tickets"
  }
  if (pathname === "/auth/profile") {
    return "/api/v1/auth/profile"
  }
  if (pathname === "/user/capabilities") {
    // 后端 UserCapabilityController 注册 @RequestMapping("/api/user")，叠加 Spring
    // server.servlet.context-path=/api/v1，真实路径是 /api/v1/api/user/capabilities。
    // 不加这条映射时 gatewayPlatformFetch 会落到 PLATFORM_API_BASE 直发 /user/capabilities，
    // 被前置 nginx 的 SPA fallback 当作静态资源返回 index.html，
    // 触发 useUserCapabilities catch null → token_balance 兜底到 0，
    // 最终右上角 Subscriptions Snapshot Token Balance 永远显示 0。
    return "/api/v1/api/user/capabilities"
  }
  if (pathname === "/subscriptions/grading/trial") {
    // Plan v3 §S2.1：Grading 30-day self-serve trial。后端
    // GradingSubscriptionController 注册 @RequestMapping("/api/subscriptions/grading")，
    // 叠加 server.servlet.context-path=/api/v1，真实路径 /api/v1/api/subscriptions/grading/trial。
    return "/api/v1/api/subscriptions/grading/trial"
  }
  // Plan v5 §B.3 / §C.1：PayPal Grading 月订阅 4 端点。后端
  // PayPalGradingController @RequestMapping("/api/payments/paypal/grading")，
  // 叠加 context-path=/api/v1，真实路径 /api/v1/api/payments/paypal/grading/*。
  if (pathname === "/payments/paypal/grading/create-subscription") {
    return "/api/v1/api/payments/paypal/grading/create-subscription"
  }
  if (pathname === "/payments/paypal/grading/activate") {
    return "/api/v1/api/payments/paypal/grading/activate"
  }
  if (pathname === "/payments/paypal/grading/cancel") {
    return "/api/v1/api/payments/paypal/grading/cancel"
  }
  if (pathname === "/platform/tenant") {
    return "/api/v1/tenant"
  }
  if (pathname === "/platform/admin/storefronts") {
    const suffix = query.toString()
    return `/api/v1/admin/storefronts${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/tenants") {
    return "/api/v1/tenants"
  }
  if (pathname === "/marketplace/templates") {
    const suffix = query.toString()
    return `/api/v1/marketplace/templates${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/marketplace/artworks") {
    const suffix = query.toString()
    return `/api/v1/marketplace/artworks${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/marketplace/categories/tree") {
    return "/api/v1/marketplace/categories/tree"
  }
  if (pathname === "/artworks/categories/tree") {
    return "/api/v1/artworks/categories/tree"
  }
  if (pathname === "/artworks/platform/categories/tree") {
    return "/api/v1/artworks/platform/categories/tree"
  }
  if (pathname === "/artworks/tenant/categories/tree") {
    return "/api/v1/artworks/tenant/categories/tree"
  }
  if (pathname === "/artworks/platform") {
    const suffix = query.toString()
    return `/api/v1/artworks/platform${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/artworks/platform/import") {
    return "/api/v1/artworks/platform/import"
  }
  if (pathname === "/artworks/tenant") {
    const suffix = query.toString()
    return `/api/v1/artworks/tenant${suffix ? `?${suffix}` : ""}`
  }
  const usageMatch = pathname.match(/^\/platform\/tenants\/([^/]+)\/usage$/)
  if (usageMatch) {
    return `/api/v1/tenants/${usageMatch[1]}/usage`
  }
  const tenantSubscriptionMatch = pathname.match(/^\/platform\/tenants\/([^/]+)\/subscription$/)
  if (tenantSubscriptionMatch) {
    return `/api/v1/tenants/${tenantSubscriptionMatch[1]}/subscription`
  }
  const tenantStorefrontFeatureMatch = pathname.match(/^\/platform\/tenants\/([^/]+)\/storefront\/feature$/)
  if (tenantStorefrontFeatureMatch) {
    return `/api/v1/tenants/${tenantStorefrontFeatureMatch[1]}/storefront/feature`
  }
  const tenantStorefrontReviewMatch = pathname.match(/^\/platform\/tenants\/([^/]+)\/storefront\/review$/)
  if (tenantStorefrontReviewMatch) {
    return `/api/v1/tenants/${tenantStorefrontReviewMatch[1]}/storefront/review`
  }
  const tenantMatch = pathname.match(/^\/platform\/tenants\/([^/]+)$/)
  if (tenantMatch) {
    return `/api/v1/tenants/${tenantMatch[1]}`
  }
  if (pathname === "/developer/metrics") {
    return "/api/v1/developer/metrics"
  }
  if (pathname === "/developer/logs") {
    const suffix = query.toString()
    return `/api/v1/developer/logs${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/developer/api-keys") {
    return "/api/v1/developer/api-keys"
  }
  const apiKeyDisableMatch = pathname.match(/^\/developer\/api-keys\/([^/]+)\/disable$/)
  if (apiKeyDisableMatch) {
    return `/api/v1/developer/api-keys/${apiKeyDisableMatch[1]}/disable`
  }
  const apiKeyEnableMatch = pathname.match(/^\/developer\/api-keys\/([^/]+)\/enable$/)
  if (apiKeyEnableMatch) {
    return `/api/v1/developer/api-keys/${apiKeyEnableMatch[1]}/enable`
  }
  const apiKeyRotateMatch = pathname.match(/^\/developer\/api-keys\/([^/]+)\/rotate$/)
  if (apiKeyRotateMatch) {
    return `/api/v1/developer/api-keys/${apiKeyRotateMatch[1]}/rotate`
  }
  const apiKeyMatch = pathname.match(/^\/developer\/api-keys\/([^/]+)$/)
  if (apiKeyMatch) {
    return `/api/v1/developer/api-keys/${apiKeyMatch[1]}`
  }
  if (pathname === "/platform/templates/center") {
    return "/api/v1/template/center"
  }
  const platformTemplateCenterDelistMatch = pathname.match(/^\/platform\/templates\/center\/([^/]+)\/delist$/)
  if (platformTemplateCenterDelistMatch) {
    return `/api/v1/template/center/${platformTemplateCenterDelistMatch[1]}/delist`
  }
  if (pathname === "/platform/marketplace/templates") {
    const suffix = query.toString()
    return `/api/v1/marketplace/templates${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/artworks/categories/tree") {
    return "/api/v1/artworks/categories/tree"
  }
  if (pathname === "/platform/artworks/platform/categories/tree") {
    return "/api/v1/artworks/platform/categories/tree"
  }
  if (pathname === "/platform/artworks/tenant/categories/tree") {
    return "/api/v1/artworks/tenant/categories/tree"
  }
  if (pathname === "/platform/artworks/platform") {
    const suffix = query.toString()
    return `/api/v1/artworks/platform${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/artworks/platform/summary") {
    return "/api/v1/artworks/platform/summary"
  }
  if (pathname === "/platform/artworks/platform/import") {
    return "/api/v1/artworks/platform/import"
  }
  if (pathname === "/platform/artworks/platform/upload") {
    return "/api/v1/artworks/platform/upload"
  }
  if (pathname === "/platform/artworks/tenant") {
    const suffix = query.toString()
    return `/api/v1/artworks/tenant${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/artworks/tenant/summary") {
    return "/api/v1/artworks/tenant/summary"
  }
  if (pathname === "/platform/artworks/tenant/upload") {
    return "/api/v1/artworks/tenant/upload"
  }
  if (pathname === "/platform/artworks/check-code") {
    const suffix = query.toString()
    return `/api/v1/artworks/check-code${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/artworks/submissions") {
    const suffix = query.toString()
    return `/api/v1/artworks/submissions${suffix ? `?${suffix}` : ""}`
  }
  const platformArtworkSubmissionHistoryMatch = pathname.match(/^\/platform\/artworks\/submissions\/([^/]+)\/history$/)
  if (platformArtworkSubmissionHistoryMatch) {
    return `/api/v1/artworks/submissions/${platformArtworkSubmissionHistoryMatch[1]}/history`
  }
  const platformArtworkSubmissionReviewMatch = pathname.match(/^\/platform\/artworks\/submissions\/([^/]+)\/review$/)
  if (platformArtworkSubmissionReviewMatch) {
    return `/api/v1/artworks/submissions/${platformArtworkSubmissionReviewMatch[1]}/review`
  }
  if (pathname === "/platform/tenant/storefront") {
    return "/api/v1/tenant/storefront"
  }
  if (pathname === "/platform/tenant/storefront/submit") {
    const suffix = query.toString()
    return `/api/v1/tenant/storefront/submit${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/storefronts") {
    return "/api/v1/storefronts"
  }
  if (pathname === "/platform/admin/storefronts") {
    const suffix = query.toString()
    return `/api/v1/admin/storefronts${suffix ? `?${suffix}` : ""}`
  }
  const storefrontMatch = pathname.match(/^\/platform\/storefront\/([^/]+)$/)
  if (storefrontMatch) {
    return `/api/v1/storefront/${storefrontMatch[1]}`
  }
  const platformArtworkStatusMatch = pathname.match(/^\/platform\/artworks\/(platform|tenant)\/([^/]+)\/(enable|disable)$/)
  if (platformArtworkStatusMatch) {
    return `/api/v1/artworks/${platformArtworkStatusMatch[1]}/${platformArtworkStatusMatch[2]}/${platformArtworkStatusMatch[3]}`
  }
  const platformArtworkDelistMatch = pathname.match(/^\/platform\/artworks\/platform\/([^/]+)\/delist$/)
  if (platformArtworkDelistMatch) {
    return `/api/v1/artworks/platform/${platformArtworkDelistMatch[1]}/delist`
  }
  const platformArtworkDeletionPreviewMatch = pathname.match(/^\/platform\/artworks\/(platform|tenant)\/([^/]+)\/deletion-preview$/)
  if (platformArtworkDeletionPreviewMatch) {
    const suffix = query.toString()
    return `/api/v1/artworks/${platformArtworkDeletionPreviewMatch[1]}/${platformArtworkDeletionPreviewMatch[2]}/deletion-preview${suffix ? `?${suffix}` : ""}`
  }
  const platformArtworkSubmitMatch = pathname.match(/^\/platform\/artworks\/tenant\/([^/]+)\/submit$/)
  if (platformArtworkSubmitMatch) {
    return `/api/v1/artworks/tenant/${platformArtworkSubmitMatch[1]}/submit`
  }
  const platformArtworkSubmissionDecisionMatch = pathname.match(/^\/platform\/artworks\/submissions\/([^/]+)\/(approve|reject)$/)
  if (platformArtworkSubmissionDecisionMatch) {
    return `/api/v1/artworks/submissions/${platformArtworkSubmissionDecisionMatch[1]}/${platformArtworkSubmissionDecisionMatch[2]}`
  }
  const platformArtworkPurchaseMatch = pathname.match(/^\/platform\/artworks\/([^/]+)\/purchase$/)
  if (platformArtworkPurchaseMatch) {
    return `/api/v1/artworks/${platformArtworkPurchaseMatch[1]}/purchase`
  }
  if (pathname === "/platform/artworks/licenses") {
    return "/api/v1/artworks/licenses"
  }
  if (pathname === "/platform/artworks/commerce/purchases") {
    return "/api/v1/artworks/commerce/purchases"
  }
  const platformArtworkLicenseMatch = pathname.match(/^\/platform\/artworks\/licenses\/([^/]+)$/)
  if (platformArtworkLicenseMatch) {
    return `/api/v1/artworks/licenses/${platformArtworkLicenseMatch[1]}`
  }
  const platformArtworkItemMatch = pathname.match(/^\/platform\/artworks\/(platform|tenant)\/([^/]+)$/)
  if (platformArtworkItemMatch) {
    const suffix = query.toString()
    return `/api/v1/artworks/${platformArtworkItemMatch[1]}/${platformArtworkItemMatch[2]}${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/runtime/editor/compose") {
    return "/api/v1/runtime/editor/compose"
  }
  if (pathname === "/platform/templates") {
    const suffix = query.toString()
    return `/api/v1/template${suffix ? `?${suffix}` : ""}`
  }
  const platformTemplateConfigMatch = pathname.match(/^\/platform\/templates\/([^/]+)\/config$/)
  if (platformTemplateConfigMatch) {
    return `/api/v1/template/${platformTemplateConfigMatch[1]}/config`
  }
  const platformTemplateDeletionPreviewMatch = pathname.match(/^\/platform\/templates\/([^/]+)\/deletion-preview$/)
  if (platformTemplateDeletionPreviewMatch) {
    return `/api/v1/templates/${platformTemplateDeletionPreviewMatch[1]}/deletion-preview`
  }
  const tenantApiStatusMatch = pathname.match(/^\/platform\/templates\/([^/]+)\/(api-enable|api-disable)$/)
  if (tenantApiStatusMatch) {
    return `/api/v1/templates/${tenantApiStatusMatch[1]}/${tenantApiStatusMatch[2]}`
  }
  const platformTemplateActionMatch = pathname.match(/^\/platform\/templates\/([^/]+)\/(enable|disable|publish|unpublish)$/)
  if (platformTemplateActionMatch) {
    return `/api/v1/template/${platformTemplateActionMatch[1]}/${platformTemplateActionMatch[2]}`
  }
  if (pathname === "/platform/templates/submissions") {
    const suffix = query.toString()
    return `/api/v1/template/submissions${suffix ? `?${suffix}` : ""}`
  }
  const submissionReviewMatch = pathname.match(/^\/platform\/templates\/submissions\/([^/]+)\/review$/)
  if (submissionReviewMatch) {
    return `/api/v1/template/submissions/${submissionReviewMatch[1]}/review`
  }
  const submissionHistoryMatch = pathname.match(/^\/platform\/templates\/submissions\/([^/]+)\/history$/)
  if (submissionHistoryMatch) {
    return `/api/v1/template/submissions/${submissionHistoryMatch[1]}/history`
  }
  if (pathname === "/platform/template-categories/tree") {
    const suffix = query.toString()
    return `/api/v1/template/categories/tree${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/template-categories") {
    return "/api/v1/template/categories"
  }
  const templateCategoryMatch = pathname.match(/^\/platform\/template-categories\/([^/]+)$/)
  if (templateCategoryMatch) {
    return `/api/v1/template/categories/${templateCategoryMatch[1]}`
  }
  if (pathname === "/platform/template-categories/reset-official") {
    return "/api/v1/template/categories/reset-official"
  }
  const templateBindingMatch = pathname.match(/^\/platform\/templates\/([^/]+)\/category$/)
  if (templateBindingMatch) {
    return `/api/v1/template/${templateBindingMatch[1]}/category`
  }
  const platformTemplateMutationMatch = pathname.match(/^\/platform\/templates\/([^/]+)$/)
  if (platformTemplateMutationMatch) {
    return `/api/v1/template/${platformTemplateMutationMatch[1]}`
  }
  if (pathname === "/platform/billing/events") {
    const suffix = query.toString()
    return `/api/v1/billing/events${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/tokens/top-up") {
    return "/api/v1/billing/tokens/top-up"
  }
  if (pathname === "/platform/billing/orders") {
    const suffix = query.toString()
    return `/api/v1/billing/orders${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/billing/orders/paypal/token-packs") {
    return "/api/v1/billing/orders/paypal/token-packs"
  }
  const billingOrderConfirmMatch = pathname.match(/^\/platform\/billing\/orders\/([^/]+)\/paypal\/confirm$/)
  if (billingOrderConfirmMatch) {
    return `/api/v1/billing/orders/${billingOrderConfirmMatch[1]}/paypal/confirm`
  }
  const billingOrderCancelMatch = pathname.match(/^\/platform\/billing\/orders\/([^/]+)\/cancel$/)
  if (billingOrderCancelMatch) {
    return `/api/v1/billing/orders/${billingOrderCancelMatch[1]}/cancel`
  }
  if (pathname === "/platform/tokens/orders" || pathname === "/platform/billing/tokens/orders") {
    const suffix = query.toString()
    return `/api/v1/billing/tokens/orders${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/payments" || pathname === "/platform/billing/payments") {
    const suffix = query.toString()
    return `/api/v1/billing/payments${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/invoices" || pathname === "/platform/billing/invoices") {
    const suffix = query.toString()
    return `/api/v1/billing/invoices${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/refunds" || pathname === "/platform/billing/refunds") {
    const suffix = query.toString()
    return `/api/v1/billing/refunds${suffix ? `?${suffix}` : ""}`
  }
  if (
    pathname === "/platform/commissions/records"
    || pathname === "/platform/billing/commissions/records"
    || pathname === "/platform/commissions/statements"
    || pathname === "/platform/billing/commissions/statements"
  ) {
    const suffix = query.toString()
    return `/api/v1/billing/commissions/records${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/billing/creator/earnings" || pathname === "/platform/billing/creator/dashboard") {
    const suffix = query.toString()
    return `/api/v1/billing/creator/earnings${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/billing/creator/payout-cycles") {
    const suffix = query.toString()
    return `/api/v1/billing/creator/payout-cycles${suffix ? `?${suffix}` : ""}`
  }
  if (pathname === "/platform/billing/creator/payout-requests") {
    const suffix = query.toString()
    return `/api/v1/billing/creator/payout-requests${suffix ? `?${suffix}` : ""}`
  }
  const payoutRefreshMatch = pathname.match(/^\/platform\/billing\/creator\/payout-requests\/([^/]+)\/refresh$/)
  if (payoutRefreshMatch) {
    return `/api/v1/billing/creator/payout-requests/${payoutRefreshMatch[1]}/refresh`
  }
  if (pathname === "/platform/billing/admin/payout-requests") {
    const suffix = query.toString()
    return `/api/v1/billing/admin/payout-requests${suffix ? `?${suffix}` : ""}`
  }
  const payoutApproveMatch = pathname.match(/^\/platform\/billing\/admin\/payout-requests\/([^/]+)\/approve$/)
  if (payoutApproveMatch) {
    return `/api/v1/billing/admin/payout-requests/${payoutApproveMatch[1]}/approve`
  }
  const payoutRejectMatch = pathname.match(/^\/platform\/billing\/admin\/payout-requests\/([^/]+)\/reject$/)
  if (payoutRejectMatch) {
    return `/api/v1/billing/admin/payout-requests/${payoutRejectMatch[1]}/reject`
  }
  return null
}

async function requestJson<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {})
  if (!headers.has("Accept-Language")) {
    const locale = typeof window === "undefined"
      ? "en"
      : (window.localStorage.getItem(UI_LOCALE_STORAGE_KEY) === "zh" ? "zh" : "en")
    headers.set("Accept-Language", locale)
  }
  if (!headers.has("X-WP-Nonce")) {
    const wordpressContext = getWordPressPreviewContext()
    const requestPath = `${base}${path}`
    if (wordpressContext?.wc_nonce && requestPath.includes("/wp-json/mockup100/v1/")) {
      headers.set("X-WP-Nonce", wordpressContext.wc_nonce)
    }
  }
  let response = await fetch(`${base}${path}`, {
    credentials: "include",
    ...init,
    headers,
  })
  if (response.status === 401 && headers.has("Authorization")) {
    const retryHeaders = new Headers(headers)
    retryHeaders.delete("Authorization")
    response = await fetch(`${base}${path}`, {
      credentials: "include",
      ...init,
      headers: retryHeaders,
    })
  }
  if (!response.ok) {
    const err = buildApiRequestError(response, await response.text())
    // 0.4.53: 全局拦截 402(token 余额不足),派发事件给 App.vue 弹窗。
    // 局部页面如已自行处理,会同时设置自己的 modal —— 不冲突。
    if (response.status === 402 && typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("mockup100:insufficient-tokens", {
          detail: { message: err.message, path },
        }))
      } catch {
        // ignore: 旧浏览器不支持 CustomEvent 时忽略
      }
    }
    throw err
  }
  return normalizePayload((await response.json()) as T)
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(API_BASE, path, init)
}

export async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(PLATFORM_API_BASE, path, init)
}

export async function gatewayPlatformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const wordpressResponse = await requestWordPressProxy<T>(path, init)
  if (wordpressResponse !== null) {
    return wordpressResponse
  }
  const gatewayPath = buildGatewayPlatformPath(path)
  if (gatewayPath) {
    return requestJson<T>(getGatewayBase(), gatewayPath, init)
  }
  return requestJson<T>(PLATFORM_API_BASE, path, init)
}

export async function erpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(ERP_API_BASE, path, init)
}

export function createErpClient(basePath = "") {
  return {
    fetch<T>(path: string, init?: RequestInit) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`
      const prefix = basePath ? (basePath.startsWith("/") ? basePath : `/${basePath}`) : ""
      return erpFetch<T>(`${prefix}${normalizedPath}`, init)
    },
  }
}

export async function runtimeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const wordpressResponse = await requestWordPressProxy<T>(path, init)
  if (wordpressResponse !== null) {
    return wordpressResponse
  }
  const gatewayPath = buildGatewayRuntimePath(path)
  if (gatewayPath) {
    return requestJson<T>(getGatewayBase(), gatewayPath, init)
  }
  return requestJson<T>(PLATFORM_API_BASE, path, init)
}

export function resolveRuntimeRenderFileUrl(path: string, download = false): string {
  // 防御 undefined/null/空字符串：历史 DB 输出或本地缓存里偶发 file_path 为空，
  // 直接返回 "" 避免拼出 /render/file?path=undefined 的死链请求。
  const safePath = String(path ?? "").trim()
  if (!safePath || safePath === "undefined" || safePath === "null") return ""
  if (/^https?:\/\//i.test(safePath)) {
    // 在 WP shell 中,直传的 OSS 公网 URL 也需要走插件 runtime-asset 代理,
    // 避免 OSS 私有 bucket 公网直读返回 403/404。
    return resolveRuntimeAssetUrl(safePath)
  }
  // 优先识别 OSS 公网资产路径（render-files/* runtime-assets/* render-archives/*）。
  // 这类资源已上传到阿里云 OSS，直接访问公网 URL，避免命中 /render/file?path= 后端
  // 因 path 不在本地 JOB_ROOT 下而返回 403。
  const trimmed = safePath.replace(/^\/+/, "")
  const ossMatch = /^(runtime-assets|render-files|render-archives)\/(.+)$/.exec(trimmed)
  if (ossMatch && RUNTIME_OSS_PUBLIC_BASE) {
    // 经 resolveRuntimeAssetUrl 走一遍,保证 WP shell 自动转 runtime-asset 代理。
    return resolveRuntimeAssetUrl(`${RUNTIME_OSS_PUBLIC_BASE}/${trimmed}`)
  }
  const query = new URLSearchParams({ path: safePath })
  if (download) query.set("download", "1")
  const gatewayPath = buildGatewayRuntimePath(`/render/file?${query.toString()}`)
  const gatewayBase = getGatewayBase()
  if (gatewayPath) {
    return gatewayBase ? `${gatewayBase}${gatewayPath}` : gatewayPath
  }
  return `/render/file?${query.toString()}`
}

export interface AdminManualOrderPayload {
  email: string
  tokens: number
  amountCents: number
  currency: "USD" | "CNY"
  paymentMethod: "bank_transfer" | "alipay" | "wechat" | "cash" | "contract" | "other"
  gatewayReference?: string
  note?: string
}

export interface AdminManualOrderResponse {
  orderId: string
  tenantId: string
  tokensAdded: number
  newBalance: number
}

export async function adminCreateManualOrder(payload: AdminManualOrderPayload): Promise<AdminManualOrderResponse> {
  const raw = await requestJson<{
    order_id?: string
    orderId?: string
    tenant_id?: string
    tenantId?: string
    tokens_added?: number
    tokensAdded?: number
    new_balance?: number
    newBalance?: number
  }>(getGatewayBase(), "/api/v1/admin/billing/orders/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return {
    orderId: String(raw.order_id ?? raw.orderId ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    tokensAdded: Number(raw.tokens_added ?? raw.tokensAdded ?? 0),
    newBalance: Number(raw.new_balance ?? raw.newBalance ?? 0),
  }
}

export async function archiveRuntimeRenderFiles(filePaths: string[]): Promise<{ file_path: string }> {
  const path = buildGatewayRuntimePath("/render/files/archive") || "/render/files/archive"
  const base = path.startsWith("/api/gateway/") ? getGatewayBase() : ""
  return requestJson<{ file_path: string }>(base, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_paths: filePaths }),
  })
}

export function resolveAssetUrl(path: string): string {
  const next = (path || "").trim()
  if (!next) return ""
  const artworkProxyUrl = resolveArtworkProxyUrl(next)
  if (artworkProxyUrl) return artworkProxyUrl
  const runtimeAssetUrl = resolveRuntimeAssetUrl(next)
  if (runtimeAssetUrl !== next || /^https?:\/\//i.test(next) || next.startsWith("data:")) {
    return runtimeAssetUrl
  }
  return `${API_BASE}${next}`
}
