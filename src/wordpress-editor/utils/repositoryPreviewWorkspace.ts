import { ApiRequestError } from "../api/client"

export type PreviewSourceMode = "default" | "artwork"
export type PreviewAuthRole = "guest" | "platform_admin" | "tenant_admin"
export type PreviewWorkspaceLocale = "en" | "zh"
export type PreviewTemplateScope = "platform" | "shared" | "draft" | "storefront" | "review"
export type PreviewEntryMode = "template-driven" | "artwork-driven" | "context-driven"
export type PreviewTemplateScopeIntent =
  | "user-browse"
  | "template-selection"
  | "workspace-load"
  | "initial-sync"
export type PreviewRuntimeConfigSource = "governance" | "runtime"

export type RestoredPreviewRefreshInput = {
  hasSavedDesign: boolean
  hasArtwork: boolean
  canvasSignature?: string | null
}

export type StoredWorkspaceLayer = {
  layers?: unknown[]
}

export type StoredWorkspaceDesign = {
  activePartKey?: string
  activeLayerId?: string
  parts?: StoredWorkspaceLayer[]
}

export type ArtworkAuthorizationEntry = {
  library_scope: "platform" | "tenant" | "licensed" | "upload"
  access_scope?: "public" | "private"
  visibility_status?: "draft" | "listed" | "disabled"
  commerce_type?: "free" | "paid"
  price_tokens?: number | string | null
  unlocked?: boolean
  purchased?: boolean
  is_platform_owned?: boolean
  can_purchase?: boolean
}

export type ArtworkLicenseLookup = {
  grant_id?: string
  license_status?: string
  is_platform_owned?: boolean
}

export type ArtworkCardAction = "use" | "purchase" | "unavailable"
export type ArtworkCardBadge = "Owned" | "Free"
export type ArtworkCommerceBadgeKind = "owned" | "paid" | "free"
export type PreviewDraftCodeSource = {
  draftId?: string | null
  finishedProductCode?: string | null
  preferencesJson?: string | null
}

export type PreviewDraftRuntimePreferences = {
  selectedColor: string
  selectedView: string
  selectedSize: string
  finishedProductCode: string
}

export type PersistedPreviewOutputIdentity = {
  draftId?: string | null
  designSignature?: string | null
  mode?: string | null
  color?: string | null
  view?: string | null
  size?: string | null
}

export type PersistedPreviewOutputRecord = PersistedPreviewOutputIdentity & {
  createdAt?: string | null
  filePath?: string | null
  url?: string | null
}

const PREVIEW_SCOPE_ORDER: PreviewTemplateScope[] = ["platform", "shared", "draft", "storefront", "review"]
const REVIEW_SOURCES = new Set(["admin-center-review", "submitted", "under_review"])
const DEFAULT_PREVIEW_SOURCE = "repository"
const DEFAULT_PREVIEW_DRAFT_CODE_PREFIX = "DESIGN"
const RUNTIME_CONFIG_SOURCES = new Set(["center", "home", "admin-center", "admin-artwork-center", "storefront"])

type PreviewSourcePolicy = {
  mode: PreviewEntryMode
  defaultScope: PreviewTemplateScope
  allowedFallbackScopes: PreviewTemplateScope[]
  allowEmptyTemplate: boolean
}

const PREVIEW_SOURCE_POLICIES: Record<string, PreviewSourcePolicy> = {
  repository: {
    mode: "template-driven",
    defaultScope: "shared",
    allowedFallbackScopes: ["shared", "draft"],
    allowEmptyTemplate: false,
  },
  center: {
    mode: "template-driven",
    defaultScope: "platform",
    allowedFallbackScopes: ["platform"],
    allowEmptyTemplate: false,
  },
  home: {
    mode: "artwork-driven",
    defaultScope: "platform",
    allowedFallbackScopes: ["platform"],
    allowEmptyTemplate: true,
  },
  "admin-center": {
    mode: "template-driven",
    defaultScope: "platform",
    allowedFallbackScopes: ["platform"],
    allowEmptyTemplate: false,
  },
  "admin-center-review": {
    mode: "template-driven",
    defaultScope: "review",
    allowedFallbackScopes: ["review"],
    allowEmptyTemplate: false,
  },
  "admin-artwork-center": {
    mode: "artwork-driven",
    defaultScope: "platform",
    allowedFallbackScopes: ["platform", "shared", "draft", "review"],
    allowEmptyTemplate: true,
  },
  storefront: {
    mode: "context-driven",
    defaultScope: "storefront",
    allowedFallbackScopes: ["storefront", "platform"],
    allowEmptyTemplate: true,
  },
}

export function normalizePreviewSource(source: string) {
  const normalized = String(source || "").trim().toLowerCase()
  return normalized || DEFAULT_PREVIEW_SOURCE
}

export function resolvePreviewSourcePolicy(source: string) {
  const normalizedSource = normalizePreviewSource(source)
  const sourceKey = REVIEW_SOURCES.has(normalizedSource) ? "admin-center-review" : normalizedSource
  const resolvedPolicy = PREVIEW_SOURCE_POLICIES[sourceKey] || PREVIEW_SOURCE_POLICIES[DEFAULT_PREVIEW_SOURCE]
  return {
    source: normalizedSource,
    policyKey: sourceKey,
    ...resolvedPolicy,
  }
}

export function resolvePreviewRuntimeConfigSource(args: {
  source: string
  publishedOnly?: boolean
}): PreviewRuntimeConfigSource {
  const sourcePolicy = resolvePreviewSourcePolicy(args.source)
  if (args.publishedOnly || RUNTIME_CONFIG_SOURCES.has(sourcePolicy.policyKey)) {
    return "runtime"
  }
  return "governance"
}

export function parseStoredWorkspaceDesign(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredWorkspaceDesign
    return Array.isArray(parsed?.parts) ? parsed : null
  } catch {
    return null
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parsePreviewDraftPreferences(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function normalizePreviewDraftFinishedProductCode(value: unknown) {
  return String(value || "").trim().toUpperCase()
}

export function extractPreviewDraftRuntimePreferences(input: unknown): PreviewDraftRuntimePreferences {
  if (!input) {
    return {
      selectedColor: "",
      selectedView: "",
      selectedSize: "",
      finishedProductCode: "",
    }
  }
  if (typeof input === "string") {
    return extractPreviewDraftRuntimePreferences(parsePreviewDraftPreferences(input))
  }
  if (typeof input !== "object") {
    return {
      selectedColor: "",
      selectedView: "",
      selectedSize: "",
      finishedProductCode: "",
    }
  }
  const record = input as Record<string, unknown>
  return {
    selectedColor: String(record.selectedColor ?? record.selected_color ?? "").trim(),
    selectedView: String(record.selectedView ?? record.selected_view ?? "").trim(),
    selectedSize: String(record.selectedSize ?? record.selected_size ?? "").trim(),
    finishedProductCode: extractPreviewDraftFinishedProductCode(record),
  }
}

export function resolvePreviewDraftRuntimeSelection(
  input: unknown,
  defaults?: Partial<Omit<PreviewDraftRuntimePreferences, "finishedProductCode">>,
): PreviewDraftRuntimePreferences {
  const preferences = extractPreviewDraftRuntimePreferences(input)
  return {
    ...preferences,
    selectedColor: preferences.selectedColor || String(defaults?.selectedColor || "").trim(),
    selectedView: preferences.selectedView || String(defaults?.selectedView || "").trim(),
    selectedSize: preferences.selectedSize || String(defaults?.selectedSize || "").trim(),
  }
}

export function extractPreviewDraftFinishedProductCode(input: unknown) {
  if (!input) return ""
  if (typeof input === "string") {
    return extractPreviewDraftFinishedProductCode(parsePreviewDraftPreferences(input))
  }
  if (typeof input !== "object") return ""
  const record = input as Record<string, unknown>
  return normalizePreviewDraftFinishedProductCode(
    record.finishedProductCode
    ?? record.finished_product_code
    ?? record.productCode
    ?? record.product_code
    ?? "",
  )
}

export function resolvePreviewDraftFinishedProductCodePrefix(templateCode: string, templateId = "") {
  const normalizedTemplateCode = normalizePreviewDraftFinishedProductCode(templateCode)
  if (normalizedTemplateCode) return normalizedTemplateCode
  const normalizedTemplateId = normalizePreviewDraftFinishedProductCode(templateId)
  return normalizedTemplateId || DEFAULT_PREVIEW_DRAFT_CODE_PREFIX
}

export function buildPreviewDraftFinishedProductCode(templateCode: string, sequence: number, templateId = "") {
  const prefix = resolvePreviewDraftFinishedProductCodePrefix(templateCode, templateId)
  const normalizedSequence = Number.isFinite(sequence) ? Math.max(1, Math.trunc(sequence)) : 1
  return `${prefix}-${String(normalizedSequence).padStart(3, "0")}`
}

export function resolveNextPreviewDraftFinishedProductCode(args: {
  templateCode: string
  templateId?: string
  records?: PreviewDraftCodeSource[]
}) {
  const prefix = resolvePreviewDraftFinishedProductCodePrefix(args.templateCode, args.templateId)
  const sequencePattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i")
  const maxSequence = (args.records || []).reduce((currentMax, record) => {
    const normalizedCode = normalizePreviewDraftFinishedProductCode(
      record.finishedProductCode || extractPreviewDraftFinishedProductCode(record.preferencesJson || ""),
    )
    const match = normalizedCode.match(sequencePattern)
    if (!match) return currentMax
    const sequence = Number(match[1])
    return Number.isFinite(sequence) ? Math.max(currentMax, sequence) : currentMax
  }, 0)
  return buildPreviewDraftFinishedProductCode(prefix, maxSequence + 1)
}

export function resolvePreviewDraftFinishedProductCodeMap(args: {
  templateCode: string
  templateId?: string
  records?: PreviewDraftCodeSource[]
}) {
  const records = Array.isArray(args.records) ? args.records : []
  const prefix = resolvePreviewDraftFinishedProductCodePrefix(args.templateCode, args.templateId)
  const sequencePattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i")
  const codesByDraftId: Record<string, string> = {}
  let maxSequence = 0

  records.forEach((record) => {
    const draftId = String(record.draftId || "").trim()
    if (!draftId) return
    const normalizedCode = normalizePreviewDraftFinishedProductCode(
      record.finishedProductCode || extractPreviewDraftRuntimePreferences(record.preferencesJson || "").finishedProductCode,
    )
    if (!normalizedCode) return
    codesByDraftId[draftId] = normalizedCode
    const match = normalizedCode.match(sequencePattern)
    if (!match) return
    const sequence = Number(match[1])
    if (Number.isFinite(sequence)) {
      maxSequence = Math.max(maxSequence, sequence)
    }
  })

  records.forEach((record) => {
    const draftId = String(record.draftId || "").trim()
    if (!draftId || codesByDraftId[draftId]) return
    maxSequence += 1
    codesByDraftId[draftId] = buildPreviewDraftFinishedProductCode(prefix, maxSequence)
  })

  return codesByDraftId
}

export function hasPersistableWorkspaceDesign(state: StoredWorkspaceDesign | null | undefined) {
  return Boolean(state?.parts?.some((part) => Array.isArray(part.layers) && part.layers.length > 0))
}

export function getPreviewSignature(
  mode: PreviewSourceMode,
  canvasSignature: string,
  backgroundSignature = "",
) {
  return mode === "artwork"
    ? `${canvasSignature || "__artwork__"}::${backgroundSignature || "__background__"}`
    : "__default__"
}

export function buildPersistedPreviewOutputKey(input: PersistedPreviewOutputIdentity) {
  return [
    String(input.draftId || "").trim(),
    String(input.designSignature || "").trim(),
    String(input.mode || "").trim(),
    String(input.color || "").trim(),
    String(input.view || "").trim(),
    String(input.size || "").trim(),
  ].join("::")
}

export function isPersistedPreviewOutputReusable(
  record: PersistedPreviewOutputIdentity | null | undefined,
  identity: PersistedPreviewOutputIdentity,
) {
  if (!record) return false
  const targetKey = buildPersistedPreviewOutputKey(identity)
  if (!targetKey.replace(/:/g, "").trim()) return false
  return buildPersistedPreviewOutputKey(record) === targetKey
}

export function pickLatestReusablePreviewOutputs(
  records: PersistedPreviewOutputRecord[],
  identity: Pick<PersistedPreviewOutputIdentity, "draftId" | "designSignature">,
) {
  const latestByKey = new Map<string, PersistedPreviewOutputRecord>()
  ;(records || []).forEach((record) => {
    if (!isPersistedPreviewOutputReusable(record, {
      draftId: identity.draftId,
      designSignature: identity.designSignature,
      mode: record.mode,
      color: record.color,
      view: record.view,
      size: record.size,
    })) {
      return
    }
    const nextKey = buildPersistedPreviewOutputKey(record)
    const previous = latestByKey.get(nextKey)
    if (!previous) {
      latestByKey.set(nextKey, record)
      return
    }
    const nextTime = Date.parse(String(record.createdAt || ""))
    const previousTime = Date.parse(String(previous.createdAt || ""))
    if (Number.isNaN(previousTime) || (!Number.isNaN(nextTime) && nextTime >= previousTime)) {
      latestByKey.set(nextKey, record)
    }
  })
  return Array.from(latestByKey.values())
}

export function resolveRestorePreviewMode(input: RestoredPreviewRefreshInput): PreviewSourceMode | null {
  if (!input.hasSavedDesign) return null
  if (input.hasArtwork) return "artwork"
  return String(input.canvasSignature || "").trim() ? "default" : null
}

export function resolvePreviewTemplateScopeConfig(args: {
  role: PreviewAuthRole
  source: string
  hasStorefrontContext?: boolean
}) {
  const sourcePolicy = resolvePreviewSourcePolicy(args.source)
  const visibleScopeSet = new Set<PreviewTemplateScope>(
    args.role === "platform_admin" ? ["platform", "review"] : ["platform", "shared", "draft"],
  )
  if (args.hasStorefrontContext) {
    visibleScopeSet.add("storefront")
  }
  if (sourcePolicy.defaultScope === "review") {
    visibleScopeSet.add("review")
  }

  const visibleScopes = PREVIEW_SCOPE_ORDER.filter((scope) => visibleScopeSet.has(scope))
  const preferredScopes = sourcePolicy.allowedFallbackScopes.filter((scope) => visibleScopeSet.has(scope))
  const defaultScope = preferredScopes[0] || visibleScopes[0] || "platform"

  return {
    source: sourcePolicy.source,
    entryMode: sourcePolicy.mode,
    allowEmptyTemplate: sourcePolicy.allowEmptyTemplate,
    visibleScopes,
    defaultScope,
    fallbackScopes: preferredScopes.length
      ? preferredScopes
      : [defaultScope, ...visibleScopes.filter((scope) => scope !== defaultScope)],
  }
}

export function resolveInitialPreviewTemplateScope(args: {
  role: PreviewAuthRole
  source: string
  hasStorefrontContext?: boolean
}) {
  return resolvePreviewTemplateScopeConfig(args).defaultScope
}

export function resolvePreviewTemplateScopeState(args: {
  currentScope: PreviewTemplateScope
  nextScope: PreviewTemplateScope
  pinnedByUser: boolean
  intent: PreviewTemplateScopeIntent
}) {
  const { currentScope, nextScope, pinnedByUser, intent } = args
  if (intent === "user-browse") {
    return {
      scope: nextScope,
      pinnedByUser: true,
    }
  }
  if (intent === "template-selection") {
    return {
      scope: nextScope,
      pinnedByUser: false,
    }
  }
  if (pinnedByUser) {
    return {
      scope: currentScope,
      pinnedByUser: true,
    }
  }
  return {
    scope: nextScope,
    pinnedByUser: false,
  }
}

export function isPublishedTemplateScope(scope: PreviewTemplateScope) {
  return scope === "platform" || scope === "storefront"
}

export function hasGrantedArtworkLicense(
  entry: ArtworkAuthorizationEntry,
  authRole: string,
) {
  return Boolean(
    (entry.library_scope === "platform" || entry.library_scope === "licensed")
    && (
      authRole === "platform_admin"
      || entry.commerce_type !== "paid"
      || entry.unlocked
      || entry.purchased
    ),
  )
}

export function isArtworkLicenseGrantedByLookup(license: ArtworkLicenseLookup | null | undefined) {
  return Boolean(license?.grant_id || license?.license_status === "active")
}

export function getUnauthorizedArtworkMessage(
  entryName: string,
  hasTenant: boolean,
  canPurchase: boolean,
  locale: PreviewWorkspaceLocale = "zh",
) {
  if (locale === "en") {
    if (canPurchase) {
      return `Artwork "${entryName}" is locked. Unlock it before inserting it into the current design.`
    }
    return hasTenant
      ? `Artwork "${entryName}" is locked. The current account does not have permission to unlock it.`
      : `Artwork "${entryName}" is locked. The current account is not linked to a tenant that can unlock it.`
  }
  if (canPurchase) {
    return `素材 "${entryName}" 尚未解锁，解锁后即可插入当前设计。`
  }
  return hasTenant
    ? `素材 "${entryName}" 尚未解锁，当前账号没有解锁权限。`
    : `素材 "${entryName}" 尚未解锁，当前账号未绑定可解锁租户。`
}

export function resolveArtworkAccessScope(entry: ArtworkAuthorizationEntry) {
  if (entry.library_scope === "platform") {
    return "public" as const
  }
  if (entry.library_scope === "licensed" || entry.library_scope === "upload") {
    return "private" as const
  }
  return entry.access_scope === "private" ? "private" as const : "public" as const
}

export function getArtworkCardBadgeLabel(
  badge: ArtworkCardBadge,
  locale: PreviewWorkspaceLocale = "en",
) {
  if (locale === "zh") {
    return badge === "Owned" ? "已拥有" : "免费"
  }
  return badge
}

export function resolveArtworkCardAction(
  entry: ArtworkAuthorizationEntry,
  authRole: string,
  hasTenant: boolean,
): ArtworkCardAction {
  if (entry.library_scope !== "platform") {
    return "use"
  }
  if (hasGrantedArtworkLicense(entry, authRole)) {
    return "use"
  }
  return entry.can_purchase !== false && hasTenant ? "purchase" : "unavailable"
}

export function resolveArtworkCardBadges(
  entry: ArtworkAuthorizationEntry,
  authRole: string,
): ArtworkCardBadge[] {
  const badges = new Set<ArtworkCardBadge>()
  // "Owned" only represents purchased/licensed access, not general usability.
  if (entry.library_scope === "licensed" || entry.purchased) {
    badges.add("Owned")
  }
  if (entry.library_scope === "platform" && hasGrantedArtworkLicense(entry, authRole) && entry.commerce_type === "free") {
    badges.add("Free")
  }
  return Array.from(badges)
}

export function resolveArtworkCommerceBadgeKind(
  entry: ArtworkAuthorizationEntry,
  authRole: string,
): ArtworkCommerceBadgeKind | null {
  if (entry.library_scope === "upload") {
    return null
  }
  if (entry.library_scope === "licensed" || entry.purchased) {
    return "owned"
  }
  if (entry.commerce_type === "paid") {
    return "paid"
  }
  if (entry.library_scope === "platform" || entry.library_scope === "tenant") {
    return "free"
  }
  if (resolveArtworkCardBadges(entry, authRole).includes("Free")) {
    return "free"
  }
  return null
}

export function isInsufficientArtworkTokensError(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return false
  }
  const message = (error.errors.find((item) => item.message)?.message || error.message || "").toLowerCase()
  return error.status === 409 && message.includes("not enough tokens")
}

export function resolvePageCount(totalItems: number, pageSize: number) {
  const safeTotal = Number.isFinite(totalItems) ? Math.max(0, Math.trunc(totalItems)) : 0
  const safeSize = Number.isFinite(pageSize) ? Math.max(1, Math.trunc(pageSize)) : 1
  return Math.max(1, Math.ceil(safeTotal / safeSize))
}

export function clampPage(page: number, totalPages: number) {
  const safePage = Number.isFinite(page) ? Math.trunc(page) : 1
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.trunc(totalPages)) : 1
  return Math.min(Math.max(safePage, 1), safeTotalPages)
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = resolvePageCount(items.length, pageSize)
  const normalizedPage = clampPage(page, totalPages)
  const safeSize = Number.isFinite(pageSize) ? Math.max(1, Math.trunc(pageSize)) : 1
  const start = (normalizedPage - 1) * safeSize
  return items.slice(start, start + safeSize)
}

export function resolvePreviewTemplateBadgeCount(items: unknown[]) {
  return Array.isArray(items) ? items.length : 0
}
