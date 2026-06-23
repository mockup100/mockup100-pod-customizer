import type { TemplateSummary } from "../../api/client"
import type { PreviewTemplateScope } from "../../utils/repositoryPreviewWorkspace"

export type TemplatePreviewEntry = TemplateSummary & {
  source: PreviewTemplateScope
  scopes: PreviewTemplateScope[]
  listing_id?: string
  creator_name?: string
  listed_at?: string
  review_status?: string
}

type PlatformPreviewSeed = Omit<TemplatePreviewEntry, "scopes"> & Partial<Pick<TemplatePreviewEntry, "scopes">>

type TemplatePreviewIdentity = Partial<Pick<TemplatePreviewEntry, "template_id" | "governance_id" | "runtime_key" | "template_code" | "listing_id">>

function normalizeTemplateReference(reference: string) {
  return String(reference || "").trim()
}

export function buildTemplatePreviewIdentityKeys(template: TemplatePreviewIdentity) {
  const seen = new Set<string>()
  return [
    template.template_id,
    template.governance_id,
    template.runtime_key,
    template.listing_id,
  ]
    .map((value) => normalizeTemplateReference(String(value || "")))
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

export function buildTemplatePreviewReferenceKeys(template: TemplatePreviewIdentity) {
  const seen = new Set<string>()
  return [
    ...buildTemplatePreviewIdentityKeys(template),
    template.template_code,
  ]
    .map((value) => normalizeTemplateReference(String(value || "")))
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

export function isTemplatePublished(template: Pick<TemplateSummary, "publish_status">) {
  return String(template.publish_status || "").trim().toLowerCase() === "published"
}

export function resolveRepositoryTemplateAccessScope(
  template: Pick<TemplateSummary, "publish_status" | "access_scope">,
) {
  if (!isTemplatePublished(template)) {
    return "private" as const
  }
  return String(template.access_scope || "").trim().toLowerCase() === "public"
    ? "public" as const
    : "private" as const
}

export function resolvePreviewTemplateAccessScope(
  template: Pick<TemplateSummary, "publish_status" | "access_scope"> & {
    source?: PreviewTemplateScope
    scopes?: PreviewTemplateScope[]
  },
) {
  if (template.source === "platform") {
    return "public" as const
  }
  if (
    isTemplatePublished(template)
    && !String(template.access_scope || "").trim()
    && Array.isArray(template.scopes)
    && template.scopes.some((scope) => scope === "platform" || scope === "storefront")
  ) {
    return "public" as const
  }
  return resolveRepositoryTemplateAccessScope(template)
}

export function isTemplateUnderReview(template: Pick<TemplateSummary, "status">) {
  const normalizedStatus = String(template.status || "").trim().toLowerCase()
  return normalizedStatus === "submitted" || normalizedStatus === "under_review"
}

export function filterRepositoryPreviewSharedTemplates<T extends Pick<TemplateSummary, "publish_status">>(templates: T[]) {
  return templates.filter((template) => isTemplatePublished(template))
}

export function filterRepositoryPreviewDraftTemplates<T extends Pick<TemplateSummary, "publish_status">>(templates: T[]) {
  return templates.filter((template) => !isTemplatePublished(template))
}

export function countRepositoryPreviewTemplatesByScope<T extends Pick<TemplateSummary, "publish_status">>(templates: T[]) {
  return {
    shared: filterRepositoryPreviewSharedTemplates(templates).length,
    draft: filterRepositoryPreviewDraftTemplates(templates).length,
  }
}

export function filterRepositoryPreviewReviewTemplates<T extends Pick<TemplateSummary, "status">>(templates: T[]) {
  return templates.filter((template) => isTemplateUnderReview(template))
}

export function buildPlatformPreviewTemplates(args: {
  listedTemplates: PlatformPreviewSeed[]
  publishedTemplates: PlatformPreviewSeed[]
  runtimeTemplates: PlatformPreviewSeed[]
}) {
  const runtimeIndex = new Map<string, PlatformPreviewSeed>()
  args.runtimeTemplates.forEach((template) => {
    buildTemplatePreviewReferenceKeys(template).forEach((key) => {
      runtimeIndex.set(key, template)
    })
  })

  const primaryTemplates = args.listedTemplates.length
    ? args.listedTemplates
    : args.publishedTemplates
  const seen = new Set<string>()

  return primaryTemplates
    .map((template) => {
      const runtimeMatch = buildTemplatePreviewReferenceKeys(template)
        .map((key) => runtimeIndex.get(key))
        .find((entry): entry is TemplatePreviewEntry => Boolean(entry))
      return {
        ...runtimeMatch,
        ...template,
        source: "platform" as const,
        runtime_key: runtimeMatch?.runtime_key || template.runtime_key,
        owner_tenant_id: runtimeMatch?.owner_tenant_id || template.owner_tenant_id,
        template_size: runtimeMatch?.template_size || template.template_size,
        cover_url: template.cover_url || runtimeMatch?.cover_url || "",
        colors: template.colors?.length ? template.colors : (runtimeMatch?.colors || []),
        parts_count: template.parts_count || runtimeMatch?.parts_count || 0,
        views_count: template.views_count || runtimeMatch?.views_count || 0,
      }
    })
    .filter((template) => {
      const dedupeKey = String(template.template_id || template.template_code || template.listing_id || "").trim()
      if (!dedupeKey || seen.has(dedupeKey)) return false
      seen.add(dedupeKey)
      return true
    })
}

export function createTemplatePreviewCatalog(
  seeds: Array<{ template: Omit<TemplatePreviewEntry, "source" | "scopes"> & Partial<Pick<TemplatePreviewEntry, "source" | "scopes">>; scope: PreviewTemplateScope }>,
) {
  const catalog: TemplatePreviewEntry[] = []
  const identityMap = new Map<string, TemplatePreviewEntry>()

  for (const { template, scope } of seeds) {
    const normalizedScopes = Array.from(new Set([...(template.scopes || []), scope]))
    const source = template.source || scope
    const nextEntry: TemplatePreviewEntry = {
      ...template,
      source,
      scopes: normalizedScopes,
    }
    const identityKeys = buildTemplatePreviewIdentityKeys(nextEntry)
    if (!identityKeys.length) continue
    const existing = identityKeys
      .map((key) => identityMap.get(key))
      .find((entry): entry is TemplatePreviewEntry => Boolean(entry))
    if (!existing) {
      catalog.push(nextEntry)
      identityKeys.forEach((key) => identityMap.set(key, nextEntry))
      continue
    }
    const merged: TemplatePreviewEntry = {
      ...existing,
      ...nextEntry,
      source: existing.source,
      scopes: Array.from(new Set([...existing.scopes, ...normalizedScopes])),
    }
    const catalogIndex = catalog.indexOf(existing)
    if (catalogIndex >= 0) {
      catalog[catalogIndex] = merged
    }
    buildTemplatePreviewIdentityKeys(merged).forEach((key) => identityMap.set(key, merged))
  }

  return catalog
}

export function listTemplatePreviewEntriesForScope(entries: TemplatePreviewEntry[], scope: PreviewTemplateScope) {
  return entries
    .filter((entry) => entry.scopes.includes(scope))
    .map((entry) => ({
      ...entry,
      source: scope,
    }))
}

export function findTemplatePreviewEntry(
  entries: TemplatePreviewEntry[],
  templateReference: string,
  preferredScopes?: PreviewTemplateScope[],
) {
  const normalizedReference = normalizeTemplateReference(templateReference)
  if (!normalizedReference) return null
  const matches = entries.filter((entry) => buildTemplatePreviewReferenceKeys(entry).includes(normalizedReference))
  if (!matches.length) return null
  if (!preferredScopes?.length) return matches[0] || null
  return (
    preferredScopes
      .flatMap((scope) => matches.filter((entry) => entry.scopes.includes(scope)))
      .find((entry): entry is TemplatePreviewEntry => Boolean(entry))
    || matches[0]
    || null
  )
}

export function resolveTemplatePreviewScope(
  entries: TemplatePreviewEntry[],
  templateReference: string,
  preferredScopes?: PreviewTemplateScope[],
) {
  const entry = findTemplatePreviewEntry(entries, templateReference, preferredScopes)
  if (!entry) return null
  if (!preferredScopes?.length) return entry.scopes[0] || entry.source
  return preferredScopes.find((scope) => entry.scopes.includes(scope)) || entry.scopes[0] || entry.source
}

export function resolveTemplatePreviewPage(
  entries: TemplatePreviewEntry[],
  templateReference: string,
  pageSize: number,
) {
  const normalizedReference = normalizeTemplateReference(templateReference)
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.trunc(pageSize)) : 1
  if (!normalizedReference) return 1
  const matchIndex = entries.findIndex((entry) => buildTemplatePreviewReferenceKeys(entry).includes(normalizedReference))
  if (matchIndex < 0) return 1
  return Math.floor(matchIndex / safePageSize) + 1
}
