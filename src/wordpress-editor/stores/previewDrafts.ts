import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { ApiRequestError, gatewayPlatformFetch, resolveApiErrorMessage } from "../api/client"
import { useAuthStore } from "./auth"

export const DEFAULT_PREVIEW_DRAFT_NAME = "Untitled Design"

export type DraftReferenceConflictReasonType =
  | "ACTIVE_TEMPLATE_STATE"
  | "ACTIVE_TEMPLATE_OUTPUT"
  | "DRAFT_RESOURCE_REF"
  | "OUTPUT_RESOURCE_REF"
  | string

export type DraftReferenceConflictReason = {
  type: DraftReferenceConflictReasonType
  count: number
  sampleIds: string[]
}

export class DraftReferenceConflictError extends Error {
  reasons: DraftReferenceConflictReason[]

  constructor(reasons: DraftReferenceConflictReason[]) {
    super("DRAFT_HAS_REFERENCES")
    this.name = "DraftReferenceConflictError"
    this.reasons = reasons
  }
}

function normalizeDraftReferenceConflictReasons(raw: unknown): DraftReferenceConflictReason[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const type = String(record.type || "")
      if (!type) return null
      const countRaw = record.count
      const count = typeof countRaw === "number" ? countRaw : Number(countRaw || 0)
      const sampleIdsRaw = (record.sampleIds ?? record.sample_ids) as unknown
      const sampleIds = Array.isArray(sampleIdsRaw)
        ? sampleIdsRaw.map((entry) => String(entry || "")).filter(Boolean)
        : []
      return {
        type,
        count: Number.isFinite(count) ? count : 0,
        sampleIds,
      } as DraftReferenceConflictReason
    })
    .filter((item): item is DraftReferenceConflictReason => Boolean(item))
}

function tryBuildDraftReferenceConflictError(error: unknown): DraftReferenceConflictError | null {
  if (!(error instanceof ApiRequestError) || error.status !== 422) return null
  const payload = error.payload
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  if (String(record.error || "") !== "DRAFT_HAS_REFERENCES") return null
  return new DraftReferenceConflictError(normalizeDraftReferenceConflictReasons(record.reasons))
}

export type PreviewDraftRecord = {
  draftId: string
  tenantId: string
  templateId: string
  draftName: string
  finishedProductCode?: string
  designJson: string
  preferencesJson: string
  previewUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export type PreviewDraftPartSvg = {
  partKey: string
  svgXml: string
  contentHash: string
}

export type PreviewDraftContent = {
  designJson: string
  preferencesJson: string
  signature: string
  finishedProductCode?: string
  previewUrl?: string
  partsSvg?: PreviewDraftPartSvg[]
}

export type PreviewDraftSaveMode = "overwrite" | "create"

function normalizeServerDraftRecord(raw: Record<string, unknown>): PreviewDraftRecord {
  return {
    draftId: String(raw.draftId || raw.draft_id || ""),
    tenantId: String(raw.tenantId || raw.tenant_id || ""),
    templateId: String(raw.templateId || raw.template_id || ""),
    draftName: String(raw.draftName || raw.draft_name || ""),
    finishedProductCode: String(raw.finishedProductCode || raw.finished_product_code || ""),
    designJson: String(raw.designJson || raw.design_json || ""),
    preferencesJson: String(raw.preferencesJson || raw.preferences_json || ""),
    previewUrl: String(raw.previewUrl || raw.preview_url || ""),
    status: String(raw.status || ""),
    createdAt: String(raw.createdAt || raw.created_at || ""),
    updatedAt: String(raw.updatedAt || raw.updated_at || ""),
  }
}

export const usePreviewDraftStore = defineStore("previewDrafts", () => {
  const authStore = useAuthStore()

  const templateId = ref("")
  const draftRecords = ref<PreviewDraftRecord[]>([])
  const activeDraftId = ref("")
  const lastServerSavedSignature = ref("")
  const serverSaveDirty = ref(false)
  const isSavingDraftToServer = ref(false)
  const draftsLoading = ref(false)
  const lastDraftsError = ref("")

  const draftsModalOpen = ref(false)
  const saveDraftModalOpen = ref(false)
  const saveDraftMode = ref<PreviewDraftSaveMode>("overwrite")
  const saveDraftName = ref("")
  const saveDraftError = ref("")

  const renamingDraftId = ref("")
  const renameDraftValue = ref("")
  const renameDraftError = ref("")

  const deleteDraftId = ref("")
  const deleteDraftModalOpen = ref(false)

  const pendingSwitchDraftId = ref("")
  const switchDraftModalOpen = ref(false)

  const activeDraftRecord = computed(
    () => draftRecords.value.find((item) => item.draftId === activeDraftId.value) || null,
  )

  const pendingDeleteDraftRecord = computed(
    () => draftRecords.value.find((item) => item.draftId === deleteDraftId.value) || null,
  )

  const pendingSwitchDraftRecord = computed(
    () => draftRecords.value.find((item) => item.draftId === pendingSwitchDraftId.value) || null,
  )

  const activeDraftName = computed(() => {
    const normalized = String(activeDraftRecord.value?.draftName || "").trim()
    return normalized || DEFAULT_PREVIEW_DRAFT_NAME
  })

  function resetDialogState() {
    draftsModalOpen.value = false
    saveDraftModalOpen.value = false
    saveDraftMode.value = "overwrite"
    saveDraftName.value = ""
    saveDraftError.value = ""
    renamingDraftId.value = ""
    renameDraftValue.value = ""
    renameDraftError.value = ""
    deleteDraftId.value = ""
    deleteDraftModalOpen.value = false
    pendingSwitchDraftId.value = ""
    switchDraftModalOpen.value = false
  }

  function resetState() {
    templateId.value = ""
    draftRecords.value = []
    activeDraftId.value = ""
    lastServerSavedSignature.value = ""
    serverSaveDirty.value = false
    isSavingDraftToServer.value = false
    draftsLoading.value = false
    lastDraftsError.value = ""
    resetDialogState()
  }

  function beginTemplateSession(nextTemplateId: string) {
    templateId.value = String(nextTemplateId || "").trim()
    draftRecords.value = []
    activeDraftId.value = ""
    lastServerSavedSignature.value = ""
    serverSaveDirty.value = false
    isSavingDraftToServer.value = false
    draftsLoading.value = false
    lastDraftsError.value = ""
    resetDialogState()
  }

  function getDraftById(draftId: string) {
    return draftRecords.value.find((item) => item.draftId === draftId) || null
  }

  function resolveLoadedActiveDraftId(
    records: PreviewDraftRecord[],
    serverActiveDraftId?: string,
    fallbackDraftId?: string,
  ) {
    const normalizedServerActiveDraftId = String(serverActiveDraftId || "").trim()
    if (normalizedServerActiveDraftId && records.some((item) => item.draftId === normalizedServerActiveDraftId)) {
      return normalizedServerActiveDraftId
    }
    const normalizedFallbackDraftId = String(fallbackDraftId || "").trim()
    if (normalizedFallbackDraftId && records.some((item) => item.draftId === normalizedFallbackDraftId)) {
      return normalizedFallbackDraftId
    }
    return records[0]?.draftId || ""
  }

  function resolveAdjacentDraftId(records: PreviewDraftRecord[], removedDraftId: string) {
    const removedIndex = records.findIndex((item) => item.draftId === removedDraftId)
    if (removedIndex < 0) return ""
    return records[removedIndex + 1]?.draftId || records[removedIndex - 1]?.draftId || ""
  }

  function syncDirtySignature(signature: string) {
    if (!templateId.value) {
      serverSaveDirty.value = false
      return
    }
    serverSaveDirty.value = Boolean(signature && signature !== lastServerSavedSignature.value)
  }

  function markSaved(signature: string) {
    lastServerSavedSignature.value = signature
    serverSaveDirty.value = false
  }

  function normalizeDraftName(value: string) {
    return String(value || "").trim()
  }

  function isDuplicateDraftName(name: string, excludeDraftId = "") {
    const normalized = normalizeDraftName(name).toLocaleLowerCase()
    if (!normalized) return false
    return draftRecords.value.some((item) => {
      if (!item.draftId || item.draftId === excludeDraftId) return false
      return normalizeDraftName(item.draftName).toLocaleLowerCase() === normalized
    })
  }

  function validateDraftName(name: string, excludeDraftId = "") {
    const normalized = normalizeDraftName(name)
    if (!normalized) {
      return "Design name is required."
    }
    if (isDuplicateDraftName(normalized, excludeDraftId)) {
      return "Design name already exists."
    }
    return ""
  }

  function buildSuggestedDraftName(baseName?: string, excludeDraftId = "") {
    const base = normalizeDraftName(baseName || DEFAULT_PREVIEW_DRAFT_NAME) || DEFAULT_PREVIEW_DRAFT_NAME
    if (!isDuplicateDraftName(base, excludeDraftId)) {
      return base
    }
    for (let index = 2; index <= 999; index += 1) {
      const candidate = `${base} ${index}`
      if (!isDuplicateDraftName(candidate, excludeDraftId)) {
        return candidate
      }
    }
    return `${base} ${Date.now()}`
  }

  async function loadServerDrafts(nextTemplateId = templateId.value) {
    const normalizedTemplateId = String(nextTemplateId || "").trim()
    if (!normalizedTemplateId) {
      draftRecords.value = []
      activeDraftId.value = ""
      return
    }
    templateId.value = normalizedTemplateId
    draftsLoading.value = true
    const previousActiveDraftId = activeDraftId.value
    try {
      const previousOrder = new Map(draftRecords.value.map((item, index) => [item.draftId, index]))
      const query = new URLSearchParams({ template_id: normalizedTemplateId })
      const response = await gatewayPlatformFetch<{
        template_id: string
        active_draft_id: string
        records: Array<Record<string, unknown>>
      }>(`/api/v1/preview/drafts?${query.toString()}`, { headers: authStore.authHeaders })
      const records = Array.isArray(response?.records)
        ? response.records.map((item) => normalizeServerDraftRecord(item)).filter((item) => item.draftId)
        : []
      records.sort((a, b) => {
        const aIndex = previousOrder.get(a.draftId)
        const bIndex = previousOrder.get(b.draftId)
        const resolvedA = aIndex === undefined ? Number.MAX_SAFE_INTEGER : aIndex
        const resolvedB = bIndex === undefined ? Number.MAX_SAFE_INTEGER : bIndex
        return resolvedA - resolvedB
      })
      draftRecords.value = records
      const active = String(response?.active_draft_id || "").trim()
      activeDraftId.value = resolveLoadedActiveDraftId(records, active, previousActiveDraftId)
      lastDraftsError.value = ""
      return true
    } catch (error) {
      draftRecords.value = []
      activeDraftId.value = ""
      lastDraftsError.value = resolveApiErrorMessage(error)
      return false
    } finally {
      draftsLoading.value = false
    }
  }

  async function createServerDraft(payload: {
    templateId: string
    draftName?: string
    finishedProductCode?: string
    designJson?: string
    preferencesJson?: string
    previewUrl?: string
    sourceDraftId?: string
    partsSvg?: PreviewDraftPartSvg[]
  }) {
    const response = await gatewayPlatformFetch<{ draft_id: string; finished_product_code?: string; preview_url?: string }>(
      "/api/v1/preview/drafts",
      {
        method: "POST",
        headers: { ...authStore.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: payload.templateId,
          draft_name: payload.draftName || "",
          finished_product_code: payload.finishedProductCode || "",
          design_json: payload.designJson || "",
          preferences_json: payload.preferencesJson || "",
          preview_url: payload.previewUrl || "",
          source_draft_id: payload.sourceDraftId || "",
          ...(payload.partsSvg
            ? {
                parts_svg: payload.partsSvg.map((item) => ({
                  part_key: item.partKey,
                  svg_xml: item.svgXml,
                  content_hash: item.contentHash,
                })),
              }
            : {}),
        }),
      },
    )
    return {
      draftId: String(response?.draft_id || ""),
      finishedProductCode: String(response?.finished_product_code || ""),
      previewUrl: String(response?.preview_url || ""),
    }
  }

  async function updateServerDraft(draftId: string, payload: {
    draftName?: string
    finishedProductCode?: string
    designJson?: string
    preferencesJson?: string
    previewUrl?: string
    setActive?: boolean
    partsSvg?: PreviewDraftPartSvg[]
  }) {
    if (!draftId) return
    const response = await gatewayPlatformFetch<{ finished_product_code?: string; preview_url?: string }>(
      `/api/v1/preview/drafts/${encodeURIComponent(draftId)}`,
      {
        method: "PUT",
        headers: { ...authStore.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_name: payload.draftName ?? undefined,
          finished_product_code: payload.finishedProductCode ?? undefined,
          design_json: payload.designJson ?? undefined,
          preferences_json: payload.preferencesJson ?? undefined,
          preview_url: payload.previewUrl ?? undefined,
          set_active: payload.setActive ? "true" : "false",
          ...(payload.partsSvg
            ? {
                parts_svg: payload.partsSvg.map((item) => ({
                  part_key: item.partKey,
                  svg_xml: item.svgXml,
                  content_hash: item.contentHash,
                })),
              }
            : {}),
        }),
      },
    )
    return String(response?.finished_product_code || "")
  }

  async function deleteServerDraft(draftId: string, options?: { force?: boolean }) {
    if (!draftId) return ""
    const force = Boolean(options?.force)
    const path = force
      ? `/api/v1/preview/drafts/${encodeURIComponent(draftId)}?force=true`
      : `/api/v1/preview/drafts/${encodeURIComponent(draftId)}`
    try {
      const response = await gatewayPlatformFetch<{ active_draft_id?: string }>(
        path,
        {
          method: "DELETE",
          headers: authStore.authHeaders,
        },
      )
      return String(response?.active_draft_id || "")
    } catch (error) {
      const conflict = tryBuildDraftReferenceConflictError(error)
      if (conflict) throw conflict
      throw error
    }
  }

  async function ensureDefaultDraft(content: PreviewDraftContent) {
    if (!templateId.value) return null
    if (draftRecords.value.length) {
      return activeDraftRecord.value || draftRecords.value[0] || null
    }
    const created = await createServerDraft({
      templateId: templateId.value,
      draftName: DEFAULT_PREVIEW_DRAFT_NAME,
      finishedProductCode: content.finishedProductCode,
      designJson: content.designJson,
      preferencesJson: content.preferencesJson,
      previewUrl: content.previewUrl,
      partsSvg: content.partsSvg,
    })
    await loadServerDrafts(templateId.value)
    if (created.draftId) {
      activeDraftId.value = created.draftId
    }
    return getDraftById(activeDraftId.value) || draftRecords.value[0] || null
  }

  async function ensureTemplateSession(nextTemplateId = templateId.value, options?: { forceReload?: boolean }) {
    const normalizedTemplateId = String(nextTemplateId || "").trim()
    if (!normalizedTemplateId) {
      resetState()
      return false
    }
    const requiresSessionSync = templateId.value !== normalizedTemplateId
    if (requiresSessionSync) {
      beginTemplateSession(normalizedTemplateId)
    }
    if (options?.forceReload || requiresSessionSync || !draftRecords.value.length) {
      return await loadServerDrafts(normalizedTemplateId)
    }
    return true
  }

  function openDraftsModal() {
    draftsModalOpen.value = true
  }

  function closeDraftsModal() {
    draftsModalOpen.value = false
  }

  function openSaveDraftModal(preferredMode?: PreviewDraftSaveMode) {
    const hasActiveDraft = Boolean(activeDraftId.value)
    const nextMode = preferredMode || (hasActiveDraft ? "overwrite" : "create")
    saveDraftMode.value = nextMode
    saveDraftName.value = nextMode === "overwrite"
      ? activeDraftName.value
      : buildSuggestedDraftName(hasActiveDraft ? activeDraftName.value : DEFAULT_PREVIEW_DRAFT_NAME)
    saveDraftError.value = ""
    saveDraftModalOpen.value = true
  }

  function closeSaveDraftModal() {
    saveDraftModalOpen.value = false
    saveDraftMode.value = "overwrite"
    saveDraftName.value = ""
    saveDraftError.value = ""
  }

  function setSaveDraftMode(mode: PreviewDraftSaveMode) {
    saveDraftMode.value = mode
    saveDraftError.value = ""
    saveDraftName.value = mode === "overwrite"
      ? activeDraftName.value
      : buildSuggestedDraftName(activeDraftName.value, mode === "create" ? activeDraftId.value : "")
  }

  async function overwriteActiveDraft(content: PreviewDraftContent, nextDraftName?: string) {
    const draftId = activeDraftId.value
    if (!templateId.value || !draftId) {
      return { saved: false, draftId: "" }
    }
    const normalizedName = normalizeDraftName(nextDraftName || activeDraftName.value)
    const validationError = validateDraftName(normalizedName, draftId)
    if (validationError) {
      saveDraftError.value = validationError
      return { saved: false, draftId: "" }
    }
    isSavingDraftToServer.value = true
    try {
      const resolvedFinishedProductCode = await updateServerDraft(draftId, {
        draftName: normalizedName,
        finishedProductCode: content.finishedProductCode,
        designJson: content.designJson,
        preferencesJson: content.preferencesJson,
        previewUrl: content.previewUrl,
        setActive: true,
        partsSvg: content.partsSvg,
      })
      const synced = await loadServerDrafts(templateId.value)
      activeDraftId.value = draftId
      if (!synced) {
        draftRecords.value = draftRecords.value.map((item) => (
          item.draftId === draftId
            ? {
                ...item,
                draftName: normalizedName,
                finishedProductCode: resolvedFinishedProductCode || content.finishedProductCode || item.finishedProductCode,
                designJson: content.designJson,
                preferencesJson: content.preferencesJson,
                previewUrl: String(content.previewUrl || item.previewUrl || ""),
              }
            : item
        ))
      }
      markSaved(content.signature)
      return { saved: true, draftId }
    } finally {
      isSavingDraftToServer.value = false
    }
  }

  async function createIndependentDraft(
    content: PreviewDraftContent,
    nextDraftName: string,
    options?: { sourceDraftId?: string },
  ) {
    if (!templateId.value) {
      return { saved: false, draftId: "" }
    }
    const normalizedName = normalizeDraftName(nextDraftName)
    const validationError = validateDraftName(normalizedName)
    if (validationError) {
      saveDraftError.value = validationError
      return { saved: false, draftId: "" }
    }
    isSavingDraftToServer.value = true
    try {
      const created = await createServerDraft({
        templateId: templateId.value,
        draftName: normalizedName,
        finishedProductCode: content.finishedProductCode,
        designJson: content.designJson,
        preferencesJson: content.preferencesJson,
        previewUrl: content.previewUrl,
        sourceDraftId: options?.sourceDraftId,
        partsSvg: content.partsSvg,
      })
      const synced = await loadServerDrafts(templateId.value)
      if (created.draftId) {
        activeDraftId.value = created.draftId
      }
      if (!synced && created.draftId) {
        draftRecords.value = [
          {
            draftId: created.draftId,
            tenantId: authStore.tenant?.tenant_id || "",
            templateId: templateId.value,
            draftName: normalizedName,
            finishedProductCode: created.finishedProductCode || content.finishedProductCode || "",
            designJson: content.designJson,
            preferencesJson: content.preferencesJson,
            previewUrl: String(created.previewUrl || content.previewUrl || ""),
            status: "active",
            createdAt: "",
            updatedAt: "",
          },
          ...draftRecords.value.filter((item) => item.draftId !== created.draftId),
        ]
      }
      markSaved(content.signature)
      return { saved: Boolean(created.draftId), draftId: created.draftId }
    } finally {
      isSavingDraftToServer.value = false
    }
  }

  // 0.4.58: View Preview "Set as Main Image" 自动 persist。
  // 仅增量更新主图相关字段(mainPreviewView/mainPreviewColor + preview_url),
  // 在服务端 record.preferencesJson 基础上 patch 主图 key,避免覆盖
  // 用户当前未保存的其他偏好/画布改动,因此不影响 dirty 签名状态。
  async function persistActiveDraftMainPreviewSelection(args: {
    draftId?: string
    mainPreviewView: string
    mainPreviewColor: string
    previewUrl: string
  }) {
    const draftId = String(args.draftId || activeDraftId.value || "").trim()
    if (!templateId.value || !draftId) return false
    const activeRecord = draftRecords.value.find((item) => item.draftId === draftId)
    if (!activeRecord) return false
    const parsedPreferences = (() => {
      try {
        return activeRecord.preferencesJson ? JSON.parse(activeRecord.preferencesJson) : {}
      } catch {
        return {}
      }
    })() as Record<string, unknown>
    const nextPreferences: Record<string, unknown> = {
      ...parsedPreferences,
      mainPreviewView: args.mainPreviewView,
      mainPreviewColor: args.mainPreviewColor,
    }
    const nextPreferencesJson = JSON.stringify(nextPreferences)
    const nextPreviewUrl = String(args.previewUrl || "")
    try {
      await updateServerDraft(draftId, {
        preferencesJson: nextPreferencesJson,
        previewUrl: nextPreviewUrl,
      })
    } catch {
      return false
    }
    draftRecords.value = draftRecords.value.map((item) => (
      item.draftId === draftId
        ? {
            ...item,
            preferencesJson: nextPreferencesJson,
            previewUrl: nextPreviewUrl || item.previewUrl,
          }
        : item
    ))
    return true
  }

  async function confirmSaveDraft(content: PreviewDraftContent, options?: { sourceDraftId?: string }) {
    saveDraftError.value = ""
    const shouldCreateDraft = saveDraftMode.value === "create" || !activeDraftId.value
    const result = shouldCreateDraft
      ? await createIndependentDraft(content, saveDraftName.value, {
        sourceDraftId: options?.sourceDraftId,
      })
      : await overwriteActiveDraft(content, saveDraftName.value)
    if (result.saved) {
      closeSaveDraftModal()
    }
    return result
  }

  function beginRenameDraft(draft: PreviewDraftRecord) {
    renamingDraftId.value = draft.draftId
    renameDraftValue.value = draft.draftName || ""
    renameDraftError.value = ""
  }

  function cancelRenameDraft() {
    renamingDraftId.value = ""
    renameDraftValue.value = ""
    renameDraftError.value = ""
  }

  async function confirmRenameDraft() {
    const draftId = renamingDraftId.value
    if (!templateId.value || !draftId) {
      return false
    }
    const validationError = validateDraftName(renameDraftValue.value, draftId)
    if (validationError) {
      renameDraftError.value = validationError
      return false
    }
    renameDraftError.value = ""
    isSavingDraftToServer.value = true
    try {
      await updateServerDraft(draftId, { draftName: normalizeDraftName(renameDraftValue.value) })
      await loadServerDrafts(templateId.value)
      cancelRenameDraft()
      return true
    } finally {
      isSavingDraftToServer.value = false
    }
  }

  function requestSwitchDraft(draftId: string, hasUnsavedChanges = serverSaveDirty.value) {
    if (!draftId || draftId === activeDraftId.value) {
      return false
    }
    if (hasUnsavedChanges) {
      pendingSwitchDraftId.value = draftId
      switchDraftModalOpen.value = true
      return false
    }
    return true
  }

  function closeSwitchDraftModal() {
    pendingSwitchDraftId.value = ""
    switchDraftModalOpen.value = false
  }

  async function activateDraftOnServer(draftId: string) {
    if (!templateId.value || !draftId) return null
    isSavingDraftToServer.value = true
    try {
      await updateServerDraft(draftId, { setActive: true })
      await loadServerDrafts(templateId.value)
      activeDraftId.value = draftId
      closeSwitchDraftModal()
      return getDraftById(draftId) || null
    } finally {
      isSavingDraftToServer.value = false
    }
  }

  function beginDeleteDraft(draftId: string) {
    deleteDraftId.value = draftId
    deleteDraftModalOpen.value = true
  }

  function cancelDeleteDraft() {
    deleteDraftId.value = ""
    deleteDraftModalOpen.value = false
  }

  async function confirmDeleteDraft(
    _buildFallbackContent?: () => Promise<PreviewDraftContent> | PreviewDraftContent,
    options?: { force?: boolean },
  ) {
    const draftId = deleteDraftId.value
    if (!templateId.value || !draftId) {
      return { deleted: false, deletedActive: false, activeRecord: null as PreviewDraftRecord | null }
    }
    const deletedActive = draftId === activeDraftId.value
    const previousActiveDraftId = activeDraftId.value
    const adjacentDraftId = deletedActive ? resolveAdjacentDraftId(draftRecords.value, draftId) : ""
    isSavingDraftToServer.value = true
    try {
      const serverActiveDraftId = await deleteServerDraft(draftId, { force: options?.force })
      await loadServerDrafts(templateId.value)
      let nextActiveDraftId = resolveLoadedActiveDraftId(
        draftRecords.value,
        serverActiveDraftId,
        deletedActive ? adjacentDraftId : previousActiveDraftId,
      )
      if (
        deletedActive
        && adjacentDraftId
        && getDraftById(adjacentDraftId)
        && nextActiveDraftId !== adjacentDraftId
      ) {
        await updateServerDraft(adjacentDraftId, { setActive: true })
        await loadServerDrafts(templateId.value)
        nextActiveDraftId = resolveLoadedActiveDraftId(draftRecords.value, adjacentDraftId, adjacentDraftId)
      }
      activeDraftId.value = nextActiveDraftId
      cancelDeleteDraft()
      return {
        deleted: true,
        deletedActive,
        activeRecord: getDraftById(activeDraftId.value) || draftRecords.value[0] || null,
      }
    } finally {
      isSavingDraftToServer.value = false
    }
  }

  return {
    templateId,
    draftRecords,
    activeDraftId,
    activeDraftRecord,
    activeDraftName,
    lastServerSavedSignature,
    serverSaveDirty,
    isSavingDraftToServer,
    draftsLoading,
    lastDraftsError,
    draftsModalOpen,
    saveDraftModalOpen,
    saveDraftMode,
    saveDraftName,
    saveDraftError,
    renamingDraftId,
    renameDraftValue,
    renameDraftError,
    deleteDraftId,
    deleteDraftModalOpen,
    pendingDeleteDraftRecord,
    pendingSwitchDraftId,
    pendingSwitchDraftRecord,
    switchDraftModalOpen,
    resetState,
    beginTemplateSession,
    getDraftById,
    syncDirtySignature,
    markSaved,
    validateDraftName,
    loadServerDrafts,
    ensureDefaultDraft,
    ensureTemplateSession,
    openDraftsModal,
    closeDraftsModal,
    openSaveDraftModal,
    closeSaveDraftModal,
    setSaveDraftMode,
    confirmSaveDraft,
    overwriteActiveDraft,
    createIndependentDraft,
    persistActiveDraftMainPreviewSelection,
    beginRenameDraft,
    cancelRenameDraft,
    confirmRenameDraft,
    requestSwitchDraft,
    closeSwitchDraftModal,
    activateDraftOnServer,
    beginDeleteDraft,
    cancelDeleteDraft,
    confirmDeleteDraft,
  }
})
