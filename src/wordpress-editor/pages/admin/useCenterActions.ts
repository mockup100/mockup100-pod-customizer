import type { Router } from "vue-router"

type AuthStoreLike = {
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
  isAuthenticated: boolean
  authHeaders: Record<string, string>
  tenant?: { tenant_id?: string } | null
}

type TemplateStoreLike = {
  loadRuntime: () => Promise<unknown>
}

type PlatformStoreLike = {
  loadCenter: () => Promise<unknown>
  loadSubmissions: (options: { auth: Record<string, string>; tenantId?: string; status?: string }) => Promise<unknown>
  createSubmission: (payload: {
    auth: Record<string, string>
    template_id: string
    title: string
    description: string
    note: string
  }) => Promise<unknown>
  reviewSubmission: (
    submissionId: string,
    payload: { auth: Record<string, string>; decision: string; note: string },
  ) => Promise<unknown>
  loadSubmissionHistory: (submissionId: string, auth: Record<string, string>) => Promise<unknown>
  delistCenterListing: (payload: {
    auth: Record<string, string>
    templateId: string
    note: string
  }) => Promise<unknown>
}

export function useCenterActions(options: {
  router: Router
  authStore: AuthStoreLike
  templateStore: TemplateStoreLike
  platformStore: PlatformStoreLike
  getSubmissionStatusFilter: () => string
  getSubmissionPayload: () => {
    templateId: string
    title: string
    description: string
    note: string
  }
}) {
  function resolvePreviewSource(status?: string) {
    const normalizedStatus = String(status || "").trim().toLowerCase()
    if (normalizedStatus === "submitted" || normalizedStatus === "under_review") {
      return "admin-center-review"
    }
    return "admin-center"
  }

  async function refreshCenter() {
    await Promise.all([
      options.platformStore.loadCenter(),
      options.templateStore.loadRuntime().catch(() => undefined),
    ])
    const status = options.getSubmissionStatusFilter()
    if (options.authStore.isPlatformAdmin) {
      await options.platformStore.loadSubmissions({
        auth: options.authStore.authHeaders,
        status: status === "all" ? "" : status,
      })
      return
    }
    await options.platformStore.loadSubmissions({
      auth: options.authStore.authHeaders,
      tenantId: options.authStore.tenant?.tenant_id,
      status: status === "all" ? "" : status,
    })
  }

  async function submitTemplate() {
    const payload = options.getSubmissionPayload()
    if (!payload.templateId || !options.authStore.isTenantAdmin) return
    await options.platformStore.createSubmission({
      auth: options.authStore.authHeaders,
      template_id: payload.templateId,
      title: payload.title,
      description: payload.description,
      note: payload.note,
    })
    await refreshCenter()
  }

  async function reviewSubmission(submissionId: string, decision: string, note: string) {
    if (!options.authStore.isPlatformAdmin) return
    await options.platformStore.reviewSubmission(submissionId, {
      auth: options.authStore.authHeaders,
      decision,
      note,
    })
    await options.platformStore.loadSubmissionHistory(submissionId, options.authStore.authHeaders)
    await refreshCenter()
  }

  async function showHistory(submissionId: string) {
    await options.platformStore.loadSubmissionHistory(submissionId, options.authStore.authHeaders)
  }

  async function delistListing(templateId: string, note: string) {
    if (!options.authStore.isPlatformAdmin) return
    await options.platformStore.delistCenterListing({
      auth: options.authStore.authHeaders,
      templateId,
      note,
    })
    await refreshCenter()
  }

  function previewListing(templateId: string, status?: string) {
    if (!templateId) return
    const previewTarget = options.router.resolve({
      path: "/preview",
      query: { template_id: templateId, source: resolvePreviewSource(status) },
    })
    const target = options.authStore.isAuthenticated
      ? previewTarget
      : options.router.resolve({
          path: "/auth",
          query: { mode: "login", redirect: previewTarget.href },
        })
    window.open(target.href, "_blank")
  }

  return {
    refreshCenter,
    submitTemplate,
    reviewSubmission,
    showHistory,
    delistListing,
    previewListing,
  }
}
