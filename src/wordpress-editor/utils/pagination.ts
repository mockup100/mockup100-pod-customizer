import type { UiLocale } from "../stores/uiLocale"

export const SHARED_LOCALE_OPTIONS: ReadonlyArray<{ value: UiLocale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "zh", label: "ZH" },
] as const

export function isUiLocale(value: string): value is UiLocale {
  return value === "en" || value === "zh"
}

export function resolvePaginationCopy(locale: UiLocale) {
  if (locale === "zh") {
    return {
      previous: "上一页",
      next: "下一页",
      page: "第",
      pageSuffix: "页",
      totalPrefix: "共",
      totalSuffix: "页",
      showingEmpty: "显示 0 项",
      showingPrefix: "显示第",
      showingConnector: "-",
      showingMiddle: "项，共",
      showingSuffix: "项",
    }
  }

  return {
    previous: "Previous",
    next: "Next",
    page: "Page",
    pageSuffix: "",
    totalPrefix: "",
    totalSuffix: "",
    showingEmpty: "Showing 0 items",
    showingPrefix: "Showing ",
    showingConnector: "-",
    showingMiddle: " of ",
    showingSuffix: "",
  }
}

export function resolveTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages)
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function resolvePageSummary(
  page: number,
  pageSize: number,
  totalItems: number,
  locale: UiLocale = "en",
): string {
  const copy = resolvePaginationCopy(locale)
  if (!totalItems) return copy.showingEmpty
  const start = (page - 1) * pageSize + 1
  const end = Math.min(totalItems, page * pageSize)
  return `${copy.showingPrefix}${start}${copy.showingConnector}${end}${copy.showingMiddle}${totalItems}${copy.showingSuffix}`
}

export function resolvePageStatus(currentPage: number, totalPages: number, locale: UiLocale = "en"): string {
  const copy = resolvePaginationCopy(locale)
  if (locale === "zh") {
    return `${copy.page} ${currentPage} ${copy.pageSuffix} / ${copy.totalPrefix} ${totalPages} ${copy.totalSuffix}`
  }
  return `${copy.page} ${currentPage} / ${totalPages}`
}
