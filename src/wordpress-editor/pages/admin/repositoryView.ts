import type { TemplateSummary } from "../../api/client"
import { UI_LOCALE_STORAGE_KEY, type UiLocale } from "../../stores/uiLocale"

export type RepositoryTemplateItem = TemplateSummary

export type RepositoryStatusFilter =
  | "all"
  | "api_enabled"
  | "api_disabled"
  | "physical_size_missing"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"

export type RepositorySortOption = "updated" | "name"

export type RepositoryStatusOption = {
  value: RepositoryStatusFilter
  label: string
}

export type RepositorySortOptionItem = {
  value: RepositorySortOption
  label: string
}

export type RepositoryAnalyticsSummary = {
  total: number
  filtered: number
  listed: number
  draft: number
  apiEnabled: number
  apiDisabled: number
  underReview: number
  changesRequested: number
  approved: number
  rejected: number
  runtimeReady: number
  runtimeAssets: number
  manifestMissing: number
  physicalSizeConfigured: number
  physicalSizeMissing: number
  uniqueCategories: number
  uniqueOwners: number
  updatedRecently: number
  topCategories: Array<{ label: string; count: number }>
}

export type RepositorySubmissionRecord = {
  template_id?: string
  status?: string
  is_active_for_repository?: boolean
}

export type RepositorySubmissionMap = Record<string, RepositorySubmissionRecord | undefined>

export type RepositoryTreeNode = {
  category_id: string
  category_path?: string
  name?: string
  children?: RepositoryTreeNode[]
}

export type RepositoryFilterInput = {
  items: RepositoryTemplateItem[]
  keyword: string
  selectedCategoryId: string
  selectedCategoryIdSet: Set<string> | null
  selectedOwner: string
  selectedStatus: RepositoryStatusFilter
  selectedSort: RepositorySortOption
  isPlatformAdmin: boolean
  submissions: RepositorySubmissionMap
}

function resolveRepositoryLocale(): UiLocale {
  if (typeof document !== "undefined" && document.documentElement.lang === "zh") return "zh"
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(UI_LOCALE_STORAGE_KEY) === "zh" ? "zh" : "en"
  }
  return "en"
}

function localizeRepositoryText(en: string, zh: string, locale = resolveRepositoryLocale()): string {
  return locale === "zh" ? zh : en
}

export const REPOSITORY_STATUS_OPTIONS: RepositoryStatusOption[] = [
  { value: "all", label: localizeRepositoryText("All Status", "全部状态") },
  { value: "api_enabled", label: localizeRepositoryText("API Enabled", "API 已启用") },
  { value: "api_disabled", label: localizeRepositoryText("API Disabled", "API 已禁用") },
  { value: "physical_size_missing", label: localizeRepositoryText("Physical Size Missing", "缺少物理尺寸") },
  { value: "under_review", label: localizeRepositoryText("Under Review", "审核中") },
  { value: "changes_requested", label: localizeRepositoryText("Changes Requested", "要求修改") },
  { value: "approved", label: localizeRepositoryText("Center Approved", "中心已通过") },
  { value: "rejected", label: localizeRepositoryText("Rejected", "已拒绝") },
]

export const REPOSITORY_SORT_OPTIONS: RepositorySortOptionItem[] = [
  { value: "updated", label: localizeRepositoryText("Sort by Updated", "按更新时间排序") },
  { value: "name", label: localizeRepositoryText("Sort by Name", "按名称排序") },
]

export function formatSubmissionStatus(status: string): string {
  switch (status) {
    case "submitted":
    case "under_review":
      return localizeRepositoryText("Under Review", "审核中")
    case "changes_requested":
      return localizeRepositoryText("Changes Requested", "要求修改")
    case "approved":
      return localizeRepositoryText("Center Approved", "中心已通过")
    case "rejected":
      return localizeRepositoryText("Rejected", "已拒绝")
    default:
      return status || localizeRepositoryText("Not Submitted", "未提交")
  }
}

export function canSubmitStatus(status: string): boolean {
  return !status || status === "rejected" || status === "changes_requested"
}

export function hasRuntimeAssets(item: Pick<RepositoryTemplateItem, "cover_url" | "parts_count" | "views_count" | "colors">): boolean {
  return Boolean(item.cover_url || item.parts_count || item.views_count || item.colors?.length)
}

export function canPreviewTemplate(item: RepositoryTemplateItem): boolean {
  return hasRuntimeAssets(item) && item.manifest_present !== false && item.ready !== false
}

export function getPreviewTooltip(item: RepositoryTemplateItem): string {
  if (canPreviewTemplate(item)) return localizeRepositoryText("Open preview workspace", "打开预览工作区")
  if (!hasRuntimeAssets(item)) return localizeRepositoryText("Preview is unavailable for this template", "该模板暂时无法预览")
  if (item.manifest_present === false) return localizeRepositoryText("Preview manifest is missing", "缺少预览清单文件")
  if (item.ready === false) return localizeRepositoryText("Preview assets are not ready yet", "预览资源尚未就绪")
  return localizeRepositoryText("Preview is temporarily unavailable", "预览暂时不可用")
}

export function formatCountLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
  zhLabel?: string,
): string {
  if (resolveRepositoryLocale() === "zh") {
    return `${count} ${zhLabel || singular}`
  }
  return `${count} ${count === 1 ? singular : plural}`
}

export function getTemplateMetaChips(item: RepositoryTemplateItem): string[] {
  const chips: string[] = []
  if (item.colors?.length) chips.push(formatCountLabel(item.colors.length, "color", "colors", "色"))
  if (item.parts_count > 0) chips.push(formatCountLabel(item.parts_count, "part", "parts", "部件"))
  if (item.views_count > 0) chips.push(formatCountLabel(item.views_count, "view", "views", "视图"))
  return chips
}

export function findCategoryPath(categoryId: string, nodes: RepositoryTreeNode[]): string {
  for (const node of nodes) {
    if (node.category_id === categoryId) {
      return node.category_path || node.name || ""
    }
    if (node.children?.length) {
      const match = findCategoryPath(categoryId, node.children)
      if (match) return match
    }
  }
  return ""
}

export function findCategoryNodeById(categoryId: string, nodes: RepositoryTreeNode[]): RepositoryTreeNode | null {
  for (const node of nodes) {
    if (node.category_id === categoryId) return node
    if (node.children?.length) {
      const match = findCategoryNodeById(categoryId, node.children)
      if (match) return match
    }
  }
  return null
}

export function collectCategoryIds(node: RepositoryTreeNode | null, output: Set<string>) {
  if (!node) return
  output.add(node.category_id)
  if (node.children?.length) {
    node.children.forEach((child) => collectCategoryIds(child, output))
  }
}

export function buildCategoryIdSet(selectedCategoryId: string, nodes: RepositoryTreeNode[]): Set<string> | null {
  if (!selectedCategoryId || selectedCategoryId === "all") return null
  const node = findCategoryNodeById(selectedCategoryId, nodes)
  const output = new Set<string>()
  if (node) {
    collectCategoryIds(node, output)
    return output
  }
  output.add(selectedCategoryId)
  return output
}

export function getTemplateCategoryLabel(
  item: RepositoryTemplateItem,
  latestCategoryIdSet: Set<string>,
  categoryRoots: RepositoryTreeNode[],
): string {
  if (item.category_id && latestCategoryIdSet.has(item.category_id)) {
    return findCategoryPath(item.category_id, categoryRoots) || item.category_path || localizeRepositoryText("Uncategorized", "未分类")
  }
  if (item.category_path) return item.category_path
  return localizeRepositoryText("Uncategorized", "未分类")
}

export function getDisplayTemplateName(name: string): string {
  return name.replace(/\s+smoke$/i, "").trim()
}

export function getDisplayTemplateCode(templateCode: string, templateId?: string): string {
  const raw = (templateCode || templateId || "").replace(/-smoke$/i, "")
  return raw.replace(/--[0-9a-f]{12}$/i, "")
}

export function getRepositoryGovernanceId(item: RepositoryTemplateItem): string {
  return String((item as RepositoryTemplateItem & { governance_id?: string }).governance_id || item.template_id || "")
}

export function getRepositoryRuntimeKey(item: RepositoryTemplateItem): string {
  return String((item as RepositoryTemplateItem & { runtime_key?: string }).runtime_key || item.template_id || "")
}

export function formatTemplateDate(value?: string): string {
  if (!value) return localizeRepositoryText("unknown", "未知")
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : value
}

function normalizeRepositoryKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function squashRepositoryKeyword(value: string): string {
  return normalizeRepositoryKeyword(value).replace(/\s+/g, "")
}

function getActiveSubmissionStatus(record?: RepositorySubmissionRecord): string {
  if (!record || record.is_active_for_repository === false) return ""
  return record.status || ""
}

function matchesStatus(item: RepositoryTemplateItem, selectedStatus: RepositoryStatusFilter, submissions: RepositorySubmissionMap): boolean {
  const submissionStatus = getActiveSubmissionStatus(submissions[item.template_id])
  switch (selectedStatus) {
    case "all":
      return true
    case "api_enabled":
      return item.tenant_api_status === "enabled"
    case "api_disabled":
      return item.tenant_api_status !== "enabled"
    case "physical_size_missing":
      return item.physical_size_configured !== true
    case "under_review":
      return submissionStatus === "submitted" || submissionStatus === "under_review"
    case "changes_requested":
      return submissionStatus === "changes_requested"
    case "approved":
      return submissionStatus === "approved"
    case "rejected":
      return submissionStatus === "rejected"
    default:
      return true
  }
}

export function filterRepositoryItems(input: RepositoryFilterInput): RepositoryTemplateItem[] {
  const keyword = normalizeRepositoryKeyword(input.keyword)
  const squashedKeyword = squashRepositoryKeyword(input.keyword)
  return input.items
    .filter((item) => {
      const displayName = normalizeRepositoryKeyword(item.display_name || "")
      const templateCode = normalizeRepositoryKeyword(item.template_code || "")
      const templateId = normalizeRepositoryKeyword(item.template_id || "")
      const categoryPath = normalizeRepositoryKeyword(item.category_path || "")
      const squashedDisplayName = squashRepositoryKeyword(item.display_name || "")
      const squashedTemplateCode = squashRepositoryKeyword(item.template_code || "")
      const squashedTemplateId = squashRepositoryKeyword(item.template_id || "")
      const squashedCategoryPath = squashRepositoryKeyword(item.category_path || "")
      const keywordMatch = !keyword
        || displayName.includes(keyword)
        || templateCode.includes(keyword)
        || templateId.includes(keyword)
        || categoryPath.includes(keyword)
        || (!!squashedKeyword && (
          squashedDisplayName.includes(squashedKeyword)
          || squashedTemplateCode.includes(squashedKeyword)
          || squashedTemplateId.includes(squashedKeyword)
          || squashedCategoryPath.includes(squashedKeyword)
        ))
      const categoryMatch = input.selectedCategoryId === "all"
        || (item.category_id && input.selectedCategoryIdSet?.has(item.category_id))
      const ownerMatch = !input.isPlatformAdmin
        || input.selectedOwner === "all"
        || (item.owner_tenant_id || "platform") === input.selectedOwner
      return keywordMatch && categoryMatch && ownerMatch && matchesStatus(item, input.selectedStatus, input.submissions)
    })
    .slice()
    .sort((left, right) => {
      if (input.selectedSort === "name") {
        return left.display_name.localeCompare(right.display_name)
      }
      return (right.updated_at || "").localeCompare(left.updated_at || "")
    })
}

export function buildRepositoryStats(items: RepositoryTemplateItem[], submissions: RepositorySubmissionMap) {
  const countBySubmission = (status: string) => items.filter((item) => getActiveSubmissionStatus(submissions[item.template_id]) === status).length
  return {
    total: items.length,
    apiEnabled: items.filter((item) => item.tenant_api_status === "enabled").length,
    apiDisabled: items.filter((item) => item.tenant_api_status !== "enabled").length,
    underReview: items.filter((item) => ["submitted", "under_review"].includes(getActiveSubmissionStatus(submissions[item.template_id]))).length,
    changesRequested: countBySubmission("changes_requested"),
    approved: countBySubmission("approved"),
    rejected: countBySubmission("rejected"),
  }
}

export function buildRepositoryAnalytics(
  items: RepositoryTemplateItem[],
  filteredItems: RepositoryTemplateItem[],
  submissions: RepositorySubmissionMap,
): RepositoryAnalyticsSummary {
  const countBySubmission = (statuses: string[]) => items.filter((item) => statuses.includes(getActiveSubmissionStatus(submissions[item.template_id]))).length
  const runtimeReady = items.filter((item) => canPreviewTemplate(item)).length
  const runtimeAssets = items.filter((item) => hasRuntimeAssets(item)).length
  const manifestMissing = items.filter((item) => item.manifest_present === false).length
  const physicalSizeConfigured = items.filter((item) => item.physical_size_configured === true).length
  const physicalSizeMissing = items.filter((item) => item.physical_size_configured !== true).length
  const uniqueCategories = new Set(
    items
      .map((item) => item.category_id || item.category_path || "")
      .filter(Boolean),
  ).size
  const uniqueOwners = new Set(
    items
      .map((item) => item.owner_tenant_id || "platform")
      .filter(Boolean),
  ).size
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const updatedRecently = items.filter((item) => {
    const timestamp = item.updated_at ? Date.parse(item.updated_at) : Number.NaN
    return Number.isFinite(timestamp) && now - timestamp <= sevenDaysMs
  }).length

  const categoryCounts = new Map<string, number>()
  for (const item of items) {
    const label = item.category_path || item.category_id || localizeRepositoryText("Uncategorized", "未分类")
    categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1)
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }))

  return {
    total: items.length,
    filtered: filteredItems.length,
    listed: items.filter((item) => item.publish_status === "published").length,
    draft: items.filter((item) => item.publish_status !== "published").length,
    apiEnabled: items.filter((item) => item.tenant_api_status === "enabled").length,
    apiDisabled: items.filter((item) => item.tenant_api_status !== "enabled").length,
    underReview: countBySubmission(["submitted", "under_review"]),
    changesRequested: countBySubmission(["changes_requested"]),
    approved: countBySubmission(["approved"]),
    rejected: countBySubmission(["rejected"]),
    runtimeReady,
    runtimeAssets,
    manifestMissing,
    physicalSizeConfigured,
    physicalSizeMissing,
    uniqueCategories,
    uniqueOwners,
    updatedRecently,
    topCategories,
  }
}
