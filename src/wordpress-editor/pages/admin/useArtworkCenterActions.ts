import type { Router } from "vue-router"

type AuthStoreLike = {
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
  isAuthenticated: boolean
  authHeaders: Record<string, string>
  tenant?: { tenant_id?: string } | null
}

type ArtworkStoreLike = {
  loadLibrary: (
    scope: "platform" | "tenant",
    query?: {
      status?: "all" | "active" | "disabled"
      visibility_status?: "all" | "draft" | "listed" | "disabled"
      size?: number
      include_disabled?: boolean
    },
  ) => Promise<unknown>
  listArtworkSubmissions: (options: { tenantId?: string; artworkId?: string; status?: string; limit?: number }) => Promise<unknown>
  loadArtworkSubmissionHistory: (submissionId: string) => Promise<unknown>
  decideArtworkSubmission: (
    submissionId: string,
    action: "start_review" | "under_review" | "changes_requested" | "approved" | "rejected" | "approve" | "reject",
    reviewNote?: string,
  ) => Promise<unknown>
  delistPlatformArtwork: (artworkId: string, reviewNote: string) => Promise<unknown>
}

export function useArtworkCenterActions(options: {
  router: Router
  authStore: AuthStoreLike
  artworkStore: ArtworkStoreLike
  getSubmissionStatusFilter: () => string
}) {
  async function refreshCenter() {
    await Promise.all([
      options.artworkStore.loadLibrary("platform", {
        status: "active",
        visibility_status: "listed",
        size: 200,
      }),
      options.artworkStore.loadLibrary("tenant", {
        status: "all",
        size: 200,
        include_disabled: true,
      }).catch(() => undefined),
    ])
    const status = options.getSubmissionStatusFilter()
    if (options.authStore.isPlatformAdmin) {
      await options.artworkStore.listArtworkSubmissions({
        status: status === "all" ? "" : status,
        limit: 200,
      })
      return
    }
    await options.artworkStore.listArtworkSubmissions({
      tenantId: options.authStore.tenant?.tenant_id,
      status: status === "all" ? "" : status,
      limit: 200,
    })
  }

  async function reviewSubmission(
    submissionId: string,
    decision: "start_review" | "changes_requested" | "approved" | "rejected" | "approve" | "reject",
    note: string,
  ) {
    if (!options.authStore.isPlatformAdmin) return
    await options.artworkStore.decideArtworkSubmission(submissionId, decision, note)
    await options.artworkStore.loadArtworkSubmissionHistory(submissionId)
    await refreshCenter()
  }

  async function showHistory(submissionId: string) {
    await options.artworkStore.loadArtworkSubmissionHistory(submissionId)
  }

  async function delistListing(artworkId: string, note: string) {
    if (!options.authStore.isPlatformAdmin) return
    await options.artworkStore.delistPlatformArtwork(artworkId, note)
    await refreshCenter()
  }

  function previewListing(artworkId: string) {
    if (!artworkId) return
    const previewTarget = options.router.resolve({
      path: "/preview",
      query: { artwork_id: artworkId, source: "admin-artwork-center" },
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
    reviewSubmission,
    showHistory,
    delistListing,
    previewListing,
  }
}
