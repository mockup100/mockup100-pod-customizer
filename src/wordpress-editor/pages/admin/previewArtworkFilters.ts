import type { CategoryNode } from "../../stores/platform"
import { buildCategoryIdSet } from "./repositoryView"

export type PreviewArtworkLibraryTab = "platform" | "tenant" | "licensed" | "owned"

export type PreviewArtworkCategoryState = {
  platform: string
  tenant: string
  licensed: string
  owned: string
}

export type PreviewArtworkCategoryTrees = {
  platform: CategoryNode[]
  tenant: CategoryNode[]
}

export type PreviewArtworkFilterEntry = {
  name?: string
  artwork_code?: string
  artwork_id?: string
  category_id?: string
  category_path?: string
}

export type PreviewArtworkIdentityEntry = {
  artwork_id?: string
}

export type PreviewArtworkHydrationState = {
  platformHydrated?: boolean
  tenantHydrated?: boolean
  platformPendingCount?: number
  tenantPendingCount?: number
}

export function countPreviewArtworkEntriesByTab(counts: {
  platform?: number
  tenant?: number
  licensed?: number
  owned?: number
}) {
  return {
    platform: Number(counts.platform || 0),
    tenant: Number(counts.tenant || 0),
    licensed: Number(counts.licensed || 0),
    owned: Number(counts.owned || 0),
  }
}

export function shouldHydratePreviewArtworkLibraryTab(
  tab: PreviewArtworkLibraryTab,
  state: PreviewArtworkHydrationState,
) {
  if (tab === "platform") {
    return !state.platformHydrated && Number(state.platformPendingCount || 0) === 0
  }
  if (tab === "tenant") {
    return !state.tenantHydrated && Number(state.tenantPendingCount || 0) === 0
  }
  return false
}

export function resolvePreviewArtworkLibraryTab(
  artworkId: string,
  options: {
    isStorefrontPreview?: boolean
    isMarketplaceArtworkPreviewSource?: boolean
    platformEntries?: PreviewArtworkIdentityEntry[]
    tenantEntries?: PreviewArtworkIdentityEntry[]
    licensedEntries?: PreviewArtworkIdentityEntry[]
    ownedEntries?: PreviewArtworkIdentityEntry[]
  },
): PreviewArtworkLibraryTab {
  if (!artworkId) {
    return options.isStorefrontPreview ? "tenant" : "platform"
  }
  if ((options.ownedEntries || []).some((item) => item.artwork_id === artworkId)) {
    return "owned"
  }
  if ((options.licensedEntries || []).some((item) => item.artwork_id === artworkId)) {
    return "licensed"
  }
  if (options.isStorefrontPreview) {
    return "tenant"
  }
  if ((options.platformEntries || []).some((item) => item.artwork_id === artworkId)) {
    return "platform"
  }
  if ((options.tenantEntries || []).some((item) => item.artwork_id === artworkId)) {
    return "tenant"
  }
  if (options.isMarketplaceArtworkPreviewSource) {
    return "platform"
  }
  return "tenant"
}

export function resolveArtworkCategoriesForTab(
  tab: PreviewArtworkLibraryTab,
  trees: PreviewArtworkCategoryTrees,
): CategoryNode[] {
  if (tab === "platform") return trees.platform
  if (tab === "tenant" || tab === "licensed") return trees.tenant
  return []
}

export function resolveArtworkCategoryIdForTab(
  tab: PreviewArtworkLibraryTab,
  state: PreviewArtworkCategoryState,
): string {
  if (tab === "platform") return state.platform
  if (tab === "tenant") return state.tenant
  if (tab === "licensed") return state.licensed
  return state.owned
}

export function buildArtworkCategoryIdSetForTab(
  tab: PreviewArtworkLibraryTab,
  state: PreviewArtworkCategoryState,
  trees: PreviewArtworkCategoryTrees,
): Set<string> | null {
  return buildCategoryIdSet(
    resolveArtworkCategoryIdForTab(tab, state),
    resolveArtworkCategoriesForTab(tab, trees),
  )
}

export function normalizePreviewArtworkSearch(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
}

export function squashPreviewArtworkSearch(value: string) {
  return normalizePreviewArtworkSearch(value).replace(/\s+/g, "")
}

export function matchesPreviewArtworkSearch(keyword: string, squashedKeyword: string, values: Array<string | undefined>) {
  if (!keyword) return true
  return values.some((value) => {
    const normalized = normalizePreviewArtworkSearch(value || "")
    const squashed = squashPreviewArtworkSearch(value || "")
    return normalized.includes(keyword) || (!!squashedKeyword && squashed.includes(squashedKeyword))
  })
}

export function filterPreviewArtworkEntries<T extends PreviewArtworkFilterEntry>(
  entries: T[],
  options: {
    keywordInput: string
    selectedCategoryId: string
    categoryTree: CategoryNode[]
  },
) {
  const keyword = normalizePreviewArtworkSearch(options.keywordInput)
  const squashedKeyword = squashPreviewArtworkSearch(options.keywordInput)
  const selectedCategoryIdSet = buildCategoryIdSet(options.selectedCategoryId, options.categoryTree)
  return entries.filter((item) => {
    const keywordMatch = matchesPreviewArtworkSearch(keyword, squashedKeyword, [
      item.name,
      item.artwork_code,
      item.artwork_id,
      item.category_path,
    ])
    const categoryMatch = options.selectedCategoryId === "all"
      || Boolean(item.category_id && selectedCategoryIdSet?.has(item.category_id))
    return keywordMatch && categoryMatch
  })
}
