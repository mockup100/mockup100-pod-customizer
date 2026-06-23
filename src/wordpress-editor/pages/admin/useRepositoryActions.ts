import { ref, type ComputedRef, type Ref } from "vue"
import type { DeletionPreviewMode, TemplateDeletionPreviewResponse } from "../../api/client"
import { gatewayPlatformFetch } from "../../api/client"
import { useInlineNotice } from "../../composables/useInlineNotice"
import {
  canSubmitStatus,
  hasRuntimeAssets,
  type RepositorySubmissionRecord,
  type RepositoryTemplateItem,
} from "./repositoryView"

type TemplateStoreLike = {
  setTenantApiStatus: (templateId: string, tenantApiStatus: "enabled" | "disabled") => Promise<void>
  setPublishStatus: (
    templateId: string,
    publishStatus: "published" | "draft",
    accessScope?: "public" | "private",
  ) => Promise<void>
  removeRuntime: (templateId: string) => Promise<void>
  previewDeletion: (templateId: string) => Promise<TemplateDeletionPreviewResponse>
  remove: (templateId: string, mode?: DeletionPreviewMode) => Promise<void>
}

type PlatformStoreLike = {
  createSubmission: (payload: {
    auth: Record<string, string>
    template_id: string
    title: string
    description: string
    note: string
    cover_url: string
  }) => Promise<unknown>
  loadSubmissions: (options: {
    auth?: Record<string, string>
    tenantId?: string
    status?: string
  }) => Promise<unknown>
}

export function useRepositoryTemplateActions(options: {
  templateStore: TemplateStoreLike
  platformStore: PlatformStoreLike
  authHeaders: Record<string, string>
  isTenantAdmin: Ref<boolean> | { value: boolean }
  isPlatformAdmin: Ref<boolean> | { value: boolean }
  tenantId: Ref<string | undefined> | { value: string | undefined }
  items: Ref<RepositoryTemplateItem[]>
  submissionByTemplateId: ComputedRef<Record<string, RepositorySubmissionRecord>>
  refreshData: () => Promise<void>
}) {
  const pageNoticeApi = useInlineNotice()

  async function toggleTenantApiStatus(item: Pick<RepositoryTemplateItem, "template_id" | "tenant_api_status" | "publish_status">) {
    if (!options.isTenantAdmin.value && !options.isPlatformAdmin.value) return
    if (item.publish_status !== "published" && item.tenant_api_status !== "enabled") {
      pageNoticeApi.set("danger", `Please publish ${item.template_id} before enabling API.`)
      return
    }
    const next = item.tenant_api_status === "enabled" ? "disabled" : "enabled"
    pageNoticeApi.clear()
    try {
      await options.templateStore.setTenantApiStatus(item.template_id, next as "enabled" | "disabled")
      pageNoticeApi.set("success", `API ${next === "enabled" ? "enabled" : "disabled"} for ${item.template_id}.`)
      await options.refreshData()
    } catch (err) {
      pageNoticeApi.set("danger", String((err as Error).message || err))
    }
  }

  async function togglePublishStatus(
    item: Pick<RepositoryTemplateItem, "template_id" | "publish_status" | "access_scope">,
    accessScope?: "public" | "private",
  ) {
    if (!options.isTenantAdmin.value && !options.isPlatformAdmin.value) return
    const next = item.publish_status === "published" ? "draft" : "published"
    pageNoticeApi.clear()
    try {
      await options.templateStore.setPublishStatus(
        item.template_id,
        next,
        next === "published" ? (accessScope || item.access_scope || "public") : undefined,
      )
      pageNoticeApi.set("success", `${next === "published" ? "Listed" : "Unlisted"} ${item.template_id}.`)
      await options.refreshData()
    } catch (err) {
      pageNoticeApi.set("danger", String((err as Error).message || err))
    }
  }

  async function removeTemplate(
    item: Pick<RepositoryTemplateItem, "template_id" | "cover_url" | "parts_count" | "views_count" | "colors">,
    mode: DeletionPreviewMode = "soft_delete",
  ) {
    const templateId = item.template_id
    pageNoticeApi.clear()
    try {
      await options.templateStore.remove(templateId, mode)
      pageNoticeApi.set("success", "Deleted successfully.")
      await options.refreshData()
    } catch (err) {
      const message = String((err as Error).message || err)
      if (hasRuntimeAssets(item) && /template not found/i.test(message)) {
        try {
          await options.templateStore.removeRuntime(templateId)
          pageNoticeApi.set("success", "Deleted successfully.")
          await options.refreshData()
          return
        } catch {}
      }
      pageNoticeApi.set("danger", message)
    }
  }

  async function submitTemplate(templateId: string, note = "Submitted from Console") {
    if (!options.isTenantAdmin.value || !templateId) return
    const existing = options.submissionByTemplateId.value[templateId]
    if (existing?.status && !canSubmitStatus(existing.status)) return
    const template = options.items.value.find((item) => item.template_id === templateId)
    if (template?.publish_status !== "published") {
      pageNoticeApi.set("danger", `Please publish ${templateId} before submitting.`)
      return
    }
    if (template?.access_scope !== "public") {
      pageNoticeApi.set("danger", `Please switch ${templateId} to public before submitting.`)
      return
    }
    pageNoticeApi.clear()
    try {
      await options.platformStore.createSubmission({
        auth: options.authHeaders,
        template_id: templateId,
        title: template?.display_name || templateId,
        description: template?.description || "",
        note,
        cover_url: template?.cover_url || "",
      })
      pageNoticeApi.set("success", `Template ${templateId} submitted.`)
      if (options.tenantId.value) {
        await options.platformStore.loadSubmissions({
          auth: options.authHeaders,
          tenantId: options.tenantId.value,
          status: "",
        })
      }
    } catch (err) {
      pageNoticeApi.set("danger", String((err as Error).message || err))
    }
  }

  return {
    pageNotice: pageNoticeApi.notice,
    clearPageNotice: pageNoticeApi.clear,
    setPageNotice: pageNoticeApi.set,
    toggleTenantApiStatus,
    togglePublishStatus,
    removeTemplate,
    submitTemplate,
  }
}

export function useRepositoryStatsDialog(authHeaders: Record<string, string>) {
  const OFFICIAL_RENDER_SIZES = ["512x512", "1024x1024", "2048x2048", "4096x4096"] as const
  const noticeApi = useInlineNotice()
  const statsModalOpen = ref(false)
  const statsLoading = ref(false)
  const statsTemplateId = ref("")
  const statsSummary = ref<Record<string, unknown> | null>(null)
  const statsTotal = ref(0)
  const statsBySize = ref<Record<string, number>>({})

  async function openTemplateStats(templateId: string) {
    if (!templateId) return
    statsModalOpen.value = true
    statsLoading.value = true
    noticeApi.clear()
    statsTemplateId.value = templateId
    statsSummary.value = null
    statsTotal.value = 0
    statsBySize.value = {}
    try {
      const [summaryPayload, payload] = await Promise.all([
        gatewayPlatformFetch<Record<string, unknown>>(`/api/v1/runtime/templates/${encodeURIComponent(templateId)}/summary`, {
          headers: authHeaders,
        }).catch(() => null),
        gatewayPlatformFetch<{ total: number; by_size: Record<string, number> }>(
          `/api/v1/runtime/templates/${encodeURIComponent(templateId)}/render-stats`,
          { headers: authHeaders },
        ),
      ])
      statsSummary.value = summaryPayload
      const rawBySize = payload.by_size || {}
      const normalizedBySize = Object.fromEntries(
        OFFICIAL_RENDER_SIZES
          .map((size) => [size, Number(rawBySize[size] || 0)] as const)
          .filter(([, count]) => count > 0),
      )
      statsBySize.value = normalizedBySize
      statsTotal.value = Object.values(normalizedBySize).reduce((sum, count) => sum + Number(count || 0), 0)
    } catch (err) {
      noticeApi.set("danger", String((err as Error).message || err))
    } finally {
      statsLoading.value = false
    }
  }

  function closeTemplateStats() {
    if (statsLoading.value) return
    statsModalOpen.value = false
  }

  return {
    statsModalOpen,
    statsLoading,
    statsNotice: noticeApi.notice,
    statsTemplateId,
    statsSummary,
    statsTotal,
    statsBySize,
    clearStatsNotice: noticeApi.clear,
    openTemplateStats,
    closeTemplateStats,
  }
}
