<template>
  <div v-if="open" class="grading-modal-overlay" @click.self="handleCancel">
    <div class="grading-modal" @pointerdown.stop @mousedown.stop @click.stop>
      <div class="grading-modal-header">
        <h3 class="grading-modal-title">{{ t("gradingTitle") }}</h3>
        <button type="button" class="grading-modal-close" @click="handleCancel">×</button>
      </div>

      <div class="grading-modal-stepper">
        <span :class="['stepper-item', stage === 'standard' ? 'active' : 'done']">
          <span class="stepper-dot">1</span>
          <span class="stepper-label">{{ t("gradingStepStandard") }}</span>
        </span>
        <span class="stepper-divider"></span>
        <span :class="['stepper-item', stage === 'select' ? 'active' : (stage === 'expanded' ? 'done' : '')]">
          <span class="stepper-dot">2</span>
          <span class="stepper-label">{{ t("gradingStepSelect") }}</span>
        </span>
        <span class="stepper-divider"></span>
        <span :class="['stepper-item', stage === 'expanded' ? 'active' : '']">
          <span class="stepper-dot">3</span>
          <span class="stepper-label">{{ t("gradingStepExpand") }}</span>
        </span>
      </div>

      <div class="grading-modal-body">
        <div v-if="stage === 'standard'" class="grading-stage standard-stage">
          <div v-if="standardLoading" class="grading-state loading-state" data-testid="grading-standard-loading">
            <div class="grading-spinner" />
            <p>{{ t("gradingComposingStandard") }}</p>
          </div>
          <div v-else-if="standardError" class="grading-state error-state" data-testid="grading-standard-error">
            <p class="error-text">{{ standardError }}</p>
          </div>
          <div v-else-if="standardPreviewUrl" class="grading-state preview-state" data-testid="grading-standard-preview">
            <img
              :src="standardThumbnailUrl || standardPreviewUrl"
              :alt="t('gradingStepStandard')"
              class="grading-preview-image"
              @click="openLightbox(standardPreviewUrl, standardOutput?.code || '')"
            />
            <div class="grading-standard-footer">
              <p v-if="standardOutput" class="grading-meta">
                <strong>{{ standardOutput.code }}</strong>
              </p>
              <button
                v-if="standardOutput"
                type="button"
                class="grading-btn ghost grading-download-single"
                :disabled="downloadingCode === standardOutput.code"
                data-testid="grading-download-standard"
                @click="downloadSingle(standardOutput)"
              >
                {{ downloadingCode === standardOutput.code ? t("gradingDownloading") : t("gradingDownloadSingle") }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="stage === 'select'" class="grading-stage select-stage" data-testid="grading-select-stage">
          <div class="grading-select-toolbar">
            <span class="grading-select-summary">
              {{ t("gradingSelectSummary", { selected: String(selectedSizeCodes.length), total: String(otherSizes.length) }) }}
            </span>
            <button
              type="button"
              class="grading-btn ghost"
              data-testid="grading-select-all"
              @click="toggleAllSizes(true)"
            >
              {{ t("gradingSelectAll") }}
            </button>
            <button
              type="button"
              class="grading-btn ghost"
              data-testid="grading-select-none"
              @click="toggleAllSizes(false)"
            >
              {{ t("gradingSelectNone") }}
            </button>
          </div>
          <div class="grading-select-grid">
            <label
              v-for="size in otherSizes"
              :key="size.code"
              class="grading-select-chip"
              :class="{ active: selectedSizesSet.has(size.code) }"
              :data-testid="`grading-select-chip-${size.code}`"
            >
              <input
                type="checkbox"
                :checked="selectedSizesSet.has(size.code)"
                @change="toggleSize(size.code)"
              />
              <span>{{ size.code }}</span>
            </label>
          </div>
          <p v-if="!otherSizes.length" class="grading-meta">
            {{ t("gradingNoOtherSizes") }}
          </p>
        </div>

        <div v-else-if="stage === 'expanded'" class="grading-stage expanded-stage">
          <div v-if="expandLoading" class="grading-state loading-state" data-testid="grading-expand-loading">
            <div class="grading-spinner" />
            <p>{{ t("gradingExpanding") }}</p>
          </div>
          <div v-else-if="expandError" class="grading-state error-state" data-testid="grading-expand-error">
            <p class="error-text">{{ expandError }}</p>
          </div>
          <div v-else>
            <div class="grading-select-toolbar">
              <span class="grading-select-summary">
                {{ t("gradingSelectedForDownload", { selected: String(downloadSelectedCodes.length), total: String(expandedEntries.length) }) }}
              </span>
              <button
                type="button"
                class="grading-btn ghost"
                data-testid="grading-download-select-all"
                @click="toggleAllDownload(true)"
              >
                {{ t("gradingSelectAll") }}
              </button>
              <button
                type="button"
                class="grading-btn ghost"
                data-testid="grading-download-select-none"
                @click="toggleAllDownload(false)"
              >
                {{ t("gradingSelectNone") }}
              </button>
            </div>
            <div class="grading-grid" data-testid="grading-expand-grid">
              <div
                v-for="entry in expandedEntries"
                :key="entry.code"
                class="grading-grid-item"
                :class="{ active: downloadSelectedSet.has(entry.code) }"
                :data-testid="`grading-expand-item-${entry.code}`"
              >
                <label class="grading-grid-checkbox">
                  <input
                    type="checkbox"
                    :checked="downloadSelectedSet.has(entry.code)"
                    @change="toggleDownload(entry.code)"
                  />
                  <span>{{ entry.code }}</span>
                </label>
                <img
                  :src="entry.thumbnailUrl || entry.previewUrl"
                  :alt="entry.code"
                  class="grading-grid-image"
                  @click="openLightbox(entry.previewUrl, entry.code)"
                />
                <div class="grading-grid-meta">
                  <button
                    type="button"
                    class="grading-btn ghost grading-download-single"
                    :disabled="downloadingCode === entry.code"
                    :data-testid="`grading-download-${entry.code}`"
                    @click="downloadSingle({ code: entry.code, public_url: entry.previewUrl })"
                  >
                    {{ downloadingCode === entry.code ? t("gradingDownloading") : t("gradingDownloadSingle") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grading-modal-footer">
        <template v-if="stage === 'standard'">
          <button
            type="button"
            class="grading-btn primary"
            :disabled="standardLoading || !standardOutput || Boolean(standardError)"
            data-testid="grading-goto-select"
            @click="goToSelect"
          >
            {{ t("gradingGoToSelect") }}
          </button>
          <button
            type="button"
            class="grading-btn secondary"
            :disabled="standardLoading"
            data-testid="grading-retry"
            @click="runFullCompose"
          >
            {{ t("gradingRetry") }}
          </button>
          <button type="button" class="grading-btn ghost" data-testid="grading-cancel" @click="handleCancel">
            {{ t("gradingCancel") }}
          </button>
        </template>
        <template v-else-if="stage === 'select'">
          <button
            type="button"
            class="grading-btn primary"
            :disabled="!selectedSizeCodes.length"
            data-testid="grading-confirm-expand"
            @click="confirmExpand"
          >
            {{ t("gradingConfirmExpand") }}
          </button>
          <button
            type="button"
            class="grading-btn secondary"
            data-testid="grading-back-to-standard"
            @click="stage = 'standard'"
          >
            {{ t("gradingBack") }}
          </button>
          <button type="button" class="grading-btn ghost" data-testid="grading-cancel" @click="handleCancel">
            {{ t("gradingCancel") }}
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="grading-btn primary"
            :disabled="batchDownloading || expandLoading || !downloadSelectedCodes.length"
            data-testid="grading-download-selected"
            @click="downloadSelected"
          >
            {{ batchDownloading ? t("gradingDownloading") : t("gradingDownloadSelected", { count: String(downloadSelectedCodes.length) }) }}
          </button>
          <button
            type="button"
            class="grading-btn secondary"
            :disabled="expandLoading || !expandedEntries.length"
            data-testid="grading-retry-expand"
            @click="retryExpand"
          >
            {{ t("gradingRetry") }}
          </button>
          <button
            type="button"
            class="grading-btn ghost"
            data-testid="grading-back-to-select"
            @click="stage = 'select'"
          >
            {{ t("gradingBack") }}
          </button>
          <button type="button" class="grading-btn ghost" data-testid="grading-close" @click="handleCancel">
            {{ t("gradingClose") }}
          </button>
        </template>
      </div>
    </div>
    <div
      v-if="lightboxUrl"
      class="grading-lightbox-overlay"
      data-testid="grading-lightbox"
      @click.self="closeLightbox"
    >
      <button type="button" class="grading-lightbox-close" @click="closeLightbox">×</button>
      <img :src="lightboxUrl" :alt="lightboxAlt" class="grading-lightbox-image" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import JSZip from "jszip"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { gatewayPlatformFetch, ApiRequestError } from "../../api/client"

interface GradingSizeEntry {
  code: string
  isStandard: boolean
  sizeSvgUrl: string
  mappingImageUrl: string
  partMappings: Record<string, string>
}

interface GradingSummaryShape {
  standardSize: string | null
  sizes: GradingSizeEntry[]
}

interface PartPngPayload {
  part_key: string
  blob: Blob
  width: number
  height: number
}

interface PartSvgPayload {
  part_key: string
  svg_xml: string
  content_hash: string
}

interface ComposeOutput {
  code: string
  kind: string
  is_standard: boolean
  public_url: string
  thumbnail_url?: string
  file_path: string
}

interface ComposeResponse {
  template_id: string
  standard_size: string | null
  outputs: ComposeOutput[]
}

interface ExpandedEntry {
  code: string
  previewUrl: string
  thumbnailUrl: string
}

interface Props {
  open: boolean
  grading: GradingSummaryShape
  templateName: string
  templateId?: string
  designSignature?: string
  authHeaders?: HeadersInit
  exportPartPngs: (targetSize?: { width: number; height: number }) => Promise<PartPngPayload[]>
  exportPartSvgs?: (targetSize?: { width: number; height: number }) => Promise<PartSvgPayload[]>
  runtimeBaseUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  runtimeBaseUrl: "",
  templateId: "",
  designSignature: "",
  authHeaders: undefined,
})
const emit = defineEmits<{
  close: []
  // Plan v3 §S2.4：后端返回 GRADING_SUBSCRIPTION_REQUIRED 时兜底通知父级回退到 GateModal。
  paywall: []
}>()

const GRADING_I18N = {
  en: {
    gradingTitle: "Grading workspace",
    gradingStepStandard: "Step 1: Standard size composition",
    gradingStepSelect: "Step 2: Select sizes",
    gradingStepExpand: "Step 3: Expand to other sizes",
    gradingComposingStandard: "Composing standard size on server...",
    gradingExpanding: "Loading expanded size results...",
    gradingGoToSelect: "Next: choose sizes",
    gradingConfirmExpand: "Confirm & view selected sizes",
    gradingBack: "Back",
    gradingRetry: "Retry",
    gradingClose: "Close",
    gradingCancel: "Cancel & close",
    gradingErrorMissingStandard: "No standard size is configured for this template.",
    gradingErrorComposeFailed: "Server-side grading composition failed.",
    gradingErrorNoParts: "No part PNGs to upload.",
    gradingDownloadSingle: "Download",
    gradingDownloadSelected: "Download selected ({count})",
    gradingSelectedForDownload: "Selected {selected} of {total} for download",
    gradingDownloading: "Downloading...",
    gradingDownloadFailed: "Download failed.",
    gradingSelectAll: "Select all",
    gradingSelectNone: "Clear",
    gradingSelectSummary: "Selected {selected} of {total} sizes",
    gradingNoOtherSizes: "This template has no other sizes besides the standard size.",
  },
  zh: {
    gradingTitle: "放码工作台",
    gradingStepStandard: "Step 1: 标准码合成",
    gradingStepSelect: "Step 2: 选择尺码",
    gradingStepExpand: "Step 3: 全尺码扩散",
    gradingComposingStandard: "服务器正在合成标准码...",
    gradingExpanding: "正在加载尺码扩散结果...",
    gradingGoToSelect: "下一步：选择尺码",
    gradingConfirmExpand: "确认并合成所选尺码",
    gradingBack: "返回",
    gradingRetry: "重试",
    gradingClose: "关闭",
    gradingCancel: "取消并关闭",
    gradingErrorMissingStandard: "该模板未配置标准码。",
    gradingErrorComposeFailed: "服务端放码合成失败。",
    gradingErrorNoParts: "没有可上传的 part 渲染图。",
    gradingDownloadSingle: "下载",
    gradingDownloadSelected: "下载所选 ({count})",
    gradingSelectedForDownload: "已选 {selected} / {total} 张待下载",
    gradingDownloading: "下载中...",
    gradingDownloadFailed: "下载失败。",
    gradingSelectAll: "全选",
    gradingSelectNone: "清空",
    gradingSelectSummary: "已选 {selected} / {total} 个尺码",
    gradingNoOtherSizes: "该模板除标准码外没有其他尺码。",
  },
} as const

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

function t(key: keyof typeof GRADING_I18N.en, replacements: Record<string, string> = {}) {
  const dict = GRADING_I18N[locale.value] as Record<string, string>
  const fallback = GRADING_I18N.en as Record<string, string>
  const template = dict[key as string] || fallback[key as string] || (key as string)
  if (!Object.keys(replacements).length) return template
  return template.replace(/\{(\w+)\}/g, (_, token) => replacements[token] ?? "")
}

type Stage = "standard" | "select" | "expanded"

const stage = ref<Stage>("standard")

const standardLoading = ref(false)
const standardError = ref<string | null>(null)
const standardOutput = ref<ComposeOutput | null>(null)
const standardPreviewUrl = ref<string | null>(null)
const standardThumbnailUrl = ref<string | null>(null)

const expandLoading = ref(false)
const expandError = ref<string | null>(null)
const expandedEntries = ref<ExpandedEntry[]>([])

// 完整 compose 响应（一次请求拿到 standard + 其他尺码），confirmExpand 时直接渲染。
const fullResponse = ref<ComposeResponse | null>(null)

// Step 2 用户选择要 expand 的尺码集合（不含标准码）。
const selectedSizeCodes = ref<string[]>([])
const selectedSizesSet = computed(() => new Set(selectedSizeCodes.value))

// Step 3 用户在结果网格中勾选要批量下载的尺码集合。
const downloadSelectedCodes = ref<string[]>([])
const downloadSelectedSet = computed(() => new Set(downloadSelectedCodes.value))

// Lightbox 状态：点击缩略图时显示原图，不影响列表中的 512×512 缩略图。
const lightboxUrl = ref<string | null>(null)
const lightboxAlt = ref<string>("")

function openLightbox(url: string | null | undefined, alt: string) {
  if (!url) return
  lightboxUrl.value = url
  lightboxAlt.value = alt
}

function closeLightbox() {
  lightboxUrl.value = null
  lightboxAlt.value = ""
}

function resetState() {
  stage.value = "standard"
  standardLoading.value = false
  standardError.value = null
  standardOutput.value = null
  standardPreviewUrl.value = null
  standardThumbnailUrl.value = null
  expandLoading.value = false
  expandError.value = null
  expandedEntries.value = []
  fullResponse.value = null
  cachedPartSvgs.value = []
  cachedPartPngs.value = []
  selectedSizeCodes.value = []
  downloadSelectedCodes.value = []
  lightboxUrl.value = null
  lightboxAlt.value = ""
}

const standardEntry = computed<GradingSizeEntry | null>(() => {
  const sizes = props.grading?.sizes || []
  return sizes.find((entry) => entry.isStandard) || null
})

// 除标准码外的其他尺码列表，按 grading.sizes 原有顺序展示。
const otherSizes = computed<GradingSizeEntry[]>(() => {
  const sizes = props.grading?.sizes || []
  return sizes.filter((entry) => !entry.isStandard)
})

// 缓存上一次导出的 part 数据，避免 confirmExpand 时重复跑 fabric 导出；
// 同一组数据触发后端 fingerprint 命中，第二步几乎只跑 expand。
// 优先用 SVG 路径（矢量层在后端按 mapping 像素分辨率重新栅格化，清晰度
// 与前端 1:1）；旧前端无 exportPartSvgs 时退回 PNG 路径。
const cachedPartSvgs = ref<PartSvgPayload[]>([])
const cachedPartPngs = ref<PartPngPayload[]>([])

/**
 * 标准码 part-mapping 在磁盘上的真实像素分辨率。后端 _apply_uv_warp 会把
 * 前端导出的 part PNG 按 nearest 采样到 mapping 像素网格上，如果前端导出
 * 分辨率比 mapping 小（例如 fabric 工作区 1200×1200，mapping 3724×3553），
 * 等同于把图放大 3 倍后再 nearest 取最近像素 → 输出明显糊。
 *
 * 这里在调用 exportPartPngs 之前 GET 第一张 part-mapping 的 natural 尺寸，
 * 然后让 fabric 以匹配的目标分辨率栅格化。命中或失败均不阻断流程。
 */
async function resolveTargetSize(): Promise<{ width: number; height: number } | undefined> {
  const std = standardEntry.value
  if (!std) return undefined
  const mappings = std.partMappings || {}
  const firstUrl = Object.values(mappings).find((u) => !!u)
  if (!firstUrl) return undefined
  return new Promise<{ width: number; height: number } | undefined>((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      } else {
        resolve(undefined)
      }
    }
    img.onerror = () => resolve(undefined)
    img.src = firstUrl
  })
}

async function callCompose(mode: "standard" | "full", sizeCodes?: string[]): Promise<ComposeResponse> {
  if (!standardEntry.value) {
    throw new Error(t("gradingErrorMissingStandard"))
  }
  const templateId = String(props.templateId || "").trim()
  if (!templateId) {
    throw new Error("templateId prop is empty")
  }
  const formData = new FormData()
  formData.append("mode", mode)

  // SVG 路径（推荐）：矢量层（artwork svg path、Textbox 文字）在前端按 mapping
  // 比例预先栅格化为位图，整体打包成 SVG XML 上传；后端 cairosvg 直接以
  // mapping 像素分辨率重新栅格化，避免前端低分辨率画布被采样放大造成的模糊。
  if (typeof props.exportPartSvgs === "function") {
    let partSvgs = cachedPartSvgs.value
    if (!partSvgs.length) {
      const targetSize = await resolveTargetSize()
      partSvgs = await props.exportPartSvgs(targetSize)
      cachedPartSvgs.value = partSvgs
    }
    if (!partSvgs.length) {
      throw new Error(t("gradingErrorNoParts"))
    }
    for (const part of partSvgs) {
      formData.append("part_keys", part.part_key)
      formData.append("part_svgs", part.svg_xml)
    }
  } else {
    let partPngs = cachedPartPngs.value
    if (!partPngs.length) {
      const targetSize = await resolveTargetSize()
      partPngs = await props.exportPartPngs(targetSize)
      cachedPartPngs.value = partPngs
    }
    if (!partPngs.length) {
      throw new Error(t("gradingErrorNoParts"))
    }
    for (const part of partPngs) {
      formData.append("part_keys", part.part_key)
      // 后端按 part_key 匹配 grading.json 中的 part_mappings；文件名仅用于日志。
      const safeName = part.part_key.replace(/[^A-Za-z0-9_.\-]/g, "_") || "part.png"
      formData.append("part_pngs", part.blob, safeName)
    }
  }

  if (mode === "full" && sizeCodes && sizeCodes.length) {
    for (const code of sizeCodes) {
      formData.append("size_codes", code)
    }
  }
  return gatewayPlatformFetch<ComposeResponse>(
    `/api/v1/runtime/templates/${encodeURIComponent(templateId)}/grading/compose`,
    {
      method: "POST",
      headers: props.authHeaders,
      body: formData,
    },
  )
}

async function loadHistoryResults(): Promise<boolean> {
  // 打开放码弹窗时优先拉取 /grading/results，命中后直接展示最近一次缓存的
  // standard + 所有已 expand 尺码图片（manifest 由 fingerprint 维护）。
  // 命中返回 true，未命中或失败返回 false 让上层决定是否触发实时 compose。
  const templateId = String(props.templateId || "").trim()
  if (!templateId) return false
  try {
    const resp = await gatewayPlatformFetch<{
      template_id: string
      fingerprint: string | null
      outputs: ComposeOutput[]
    }>(`/api/v1/runtime/templates/${encodeURIComponent(templateId)}/grading/results`, {
      method: "GET",
      headers: props.authHeaders,
    })
    const outputs = Array.isArray(resp?.outputs) ? resp.outputs : []
    const standard = outputs.find((o) => o.is_standard)
    if (!standard) return false
    standardOutput.value = standard
    standardPreviewUrl.value = standard.public_url
    standardThumbnailUrl.value = standard.thumbnail_url || standard.public_url
    fullResponse.value = {
      template_id: templateId,
      standard_size: standard.code,
      outputs,
    }
    // 把历史里已存在的 expanded 尺码也预填进 expandedEntries，方便用户
    // 在 Step 3 直接看到上次结果。downloadSelectedCodes 默认全选。
    const expanded: ExpandedEntry[] = []
    const codeOrder = (props.grading?.sizes || []).map((s) => s.code)
    expanded.push({
      code: standard.code,
      previewUrl: standard.public_url,
      thumbnailUrl: standard.thumbnail_url || standard.public_url,
    })
    for (const code of codeOrder) {
      if (code === standard.code) continue
      const out = outputs.find((o) => o.code === code && !o.is_standard)
      if (out) {
        expanded.push({
          code: out.code,
          previewUrl: out.public_url,
          thumbnailUrl: out.thumbnail_url || out.public_url,
        })
      }
    }
    expandedEntries.value = expanded
    downloadSelectedCodes.value = expanded.map((e) => e.code)
    return true
  } catch (error) {
    // Plan v3 §S2.4：能力快照可能存在缓存假阳性，loadHistoryResults 命中 403 时同样兜底。
    if (error instanceof ApiRequestError && error.responseCode === "GRADING_SUBSCRIPTION_REQUIRED") {
      emit("paywall")
    }
    return false
  }
}

async function runFullCompose() {
  resetState()
  standardLoading.value = true
  try {
    // 显式 Retry 时基于当前画布触发 compose("standard")。后端以 (template_id +
    // part bytes sha256) 为 fingerprint 自动命中缓存：设计稿没变零开销返回，
    // 设计稿改动时 fingerprint 不同→自动重算，不会再展示历史的过期图片。
    const response = await callCompose("standard")
    fullResponse.value = response
    const standard = response.outputs.find((output) => output.is_standard)
    if (!standard) {
      throw new Error(t("gradingErrorComposeFailed"))
    }
    standardOutput.value = standard
    standardPreviewUrl.value = standard.public_url
    standardThumbnailUrl.value = standard.thumbnail_url || standard.public_url
  } catch (error) {
    // Plan v3 §S2.4：standard compose 触发付费墙时兜底回退到 GateModal。
    if (error instanceof ApiRequestError && error.responseCode === "GRADING_SUBSCRIPTION_REQUIRED") {
      emit("paywall")
      return
    }
    const message = error instanceof Error && error.message ? error.message : t("gradingErrorComposeFailed")
    standardError.value = message
  } finally {
    standardLoading.value = false
  }
}

function goToSelect() {
  // 默认全选，用户再按需取消；多数场景用户希望一次性放码全部尺码。
  if (!selectedSizeCodes.value.length) {
    selectedSizeCodes.value = otherSizes.value.map((entry) => entry.code)
  }
  stage.value = "select"
}

function toggleSize(code: string) {
  const set = new Set(selectedSizeCodes.value)
  if (set.has(code)) set.delete(code)
  else set.add(code)
  selectedSizeCodes.value = otherSizes.value
    .map((entry) => entry.code)
    .filter((c) => set.has(c))
}

function toggleAllSizes(selectAll: boolean) {
  selectedSizeCodes.value = selectAll ? otherSizes.value.map((entry) => entry.code) : []
}

function toggleDownload(code: string) {
  const set = new Set(downloadSelectedCodes.value)
  if (set.has(code)) set.delete(code)
  else set.add(code)
  downloadSelectedCodes.value = expandedEntries.value
    .map((entry) => entry.code)
    .filter((c) => set.has(c))
}

function toggleAllDownload(selectAll: boolean) {
  downloadSelectedCodes.value = selectAll ? expandedEntries.value.map((entry) => entry.code) : []
}

async function confirmExpand() {
  if (!selectedSizeCodes.value.length) return
  expandError.value = null
  expandLoading.value = true
  stage.value = "expanded"
  try {
    // 分批请求，每批 4 个尺码，避免单次 HTTP 超过 Cloudflare 100s 上游超时。
    // 后端使用 fingerprint 缓存，重复请求同一批立即命中。
    const BATCH_SIZE = 4
    const allOutputs = new Map<string, ComposeOutput>()
    for (let i = 0; i < selectedSizeCodes.value.length; i += BATCH_SIZE) {
      const batch = selectedSizeCodes.value.slice(i, i + BATCH_SIZE)
      const response = await callCompose("full", batch)
      for (const output of response.outputs) {
        allOutputs.set(output.code, output)
      }
      // 实时回填已完成的尺码，给用户渐进反馈。
      const ordered: ExpandedEntry[] = []
      const codeOrder = (props.grading?.sizes || []).map((s) => s.code)
      const standard = Array.from(allOutputs.values()).find((o) => o.is_standard)
      if (standard) ordered.push({
        code: standard.code,
        previewUrl: standard.public_url,
        thumbnailUrl: standard.thumbnail_url || standard.public_url,
      })
      for (const code of codeOrder) {
        if (standard && code === standard.code) continue
        const out = allOutputs.get(code)
        if (out && !out.is_standard) ordered.push({
          code: out.code,
          previewUrl: out.public_url,
          thumbnailUrl: out.thumbnail_url || out.public_url,
        })
      }
      expandedEntries.value = ordered
      downloadSelectedCodes.value = ordered.map((e) => e.code)
    }
    fullResponse.value = {
      template_id: String(props.templateId || ""),
      standard_size: standardEntry.value?.code || "",
      outputs: Array.from(allOutputs.values()),
    }
  } catch (error) {
    // Plan v3 §S2.4：expand 阶段同样可能触发付费墙，兜底回退到 GateModal。
    if (error instanceof ApiRequestError && error.responseCode === "GRADING_SUBSCRIPTION_REQUIRED") {
      emit("paywall")
      return
    }
    const message = error instanceof Error && error.message ? error.message : t("gradingErrorComposeFailed")
    expandError.value = message
  } finally {
    expandLoading.value = false
  }
}

async function retryExpand() {
  // Step 3 Retry：基于当前画布对当前展示的尺码集合（standard + expanded 中
  // 的非标准码）重新合成。清 part 缓存强制重新导出当前画布；后端按
  // fingerprint 自动命中或重算。
  if (expandLoading.value) return
  // 优先用 selectedSizeCodes（用户经 Step 2 选过的）；若直接从历史加载进入
  // 此阶段，selectedSizeCodes 可能为空，则取当前 expandedEntries 中除标准
  // 码外的全部尺码。
  let codesToExpand = selectedSizeCodes.value.slice()
  if (!codesToExpand.length) {
    const stdCode = standardOutput.value?.code || ""
    codesToExpand = expandedEntries.value
      .map((e) => e.code)
      .filter((c) => c !== stdCode)
  }
  if (!codesToExpand.length) return
  selectedSizeCodes.value = codesToExpand
  cachedPartSvgs.value = []
  cachedPartPngs.value = []
  await confirmExpand()
}

function handleCancel() {
  emit("close")
}

// 下载相关状态：downloadingCode 标记当前正在下载的单张 code，避免重复点击。
const downloadingCode = ref<string | null>(null)
const batchDownloading = ref(false)

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 立即 revoke 在部分浏览器上会让下载提前中断，延后释放更稳。
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function downloadSingle(target: { code: string; public_url: string }) {
  if (!target?.public_url || !target.code) return
  if (downloadingCode.value) return
  downloadingCode.value = target.code
  try {
    // 单张直接走 OSS public URL；OSS 默认有 CORS，fetch→blob 后触发浏览器下载。
    const response = await fetch(target.public_url, { credentials: "omit" })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    triggerBrowserDownload(blob, `${target.code}.jpg`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    window.alert(`${t("gradingDownloadFailed")} ${message}`)
  } finally {
    downloadingCode.value = null
  }
}

async function downloadSelected() {
  if (batchDownloading.value) return
  const codes = downloadSelectedCodes.value
  if (!codes.length) return
  batchDownloading.value = true
  try {
    // 串行抓取每个 code 对应的 OSS JPG，统一打包为 zip 后单次浏览器下载。
    // 串行（而非 Promise.all）以避免对 OSS 触发并发限流；典型 16 张 ~30MB
    // 总抓取耗时几秒可接受。
    const urlByCode = new Map(expandedEntries.value.map((entry) => [entry.code, entry.previewUrl]))
    const zip = new JSZip()
    const failed: string[] = []
    for (const code of codes) {
      const publicUrl = urlByCode.get(code)
      if (!publicUrl) {
        failed.push(code)
        continue
      }
      try {
        const resp = await fetch(publicUrl, { credentials: "omit" })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        zip.file(`${code}.jpg`, blob)
      } catch {
        failed.push(code)
      }
    }
    const successCount = codes.length - failed.length
    if (successCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const templateId = String(props.templateId || "grading")
      triggerBrowserDownload(zipBlob, `${templateId}-grading.zip`)
    }
    if (failed.length) {
      window.alert(`${t("gradingDownloadFailed")} ${failed.join(", ")}`)
    }
  } finally {
    batchDownloading.value = false
  }
}

watch(
  () => props.open,
  async (next) => {
    if (next) {
      // 默认加载之前合成的图片：先尝试 GET /grading/results 命中缓存 manifest。
      // 命中：直接展示历史 standard + 已 expand 尺码，不触发 compose（不传图层）。
      // 未命中：自动 fallback 到 runFullCompose，基于当前画布合成新的标准码。
      // 用户点击 Retry 按钮（已绑定 runFullCompose）即可强制重新合成。
      resetState()
      standardLoading.value = true
      const hit = await loadHistoryResults()
      standardLoading.value = false
      if (!hit) {
        await runFullCompose()
      }
    } else {
      resetState()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  resetState()
})
</script>

<style scoped>
.grading-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.grading-modal {
  background: #fff;
  border-radius: 12px;
  width: min(880px, 92vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.grading-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid #e5e7eb;
}

.grading-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #101828;
}

.grading-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: #475467;
  cursor: pointer;
}

.grading-modal-close:hover {
  background: #f2f4f7;
}

.grading-modal-stepper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 22px;
  border-bottom: 1px solid #f2f4f7;
  background: #fafbfc;
}

.stepper-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #98a2b3;
  font-size: 13px;
}

.stepper-item.active {
  color: #1d4ed8;
  font-weight: 600;
}

.stepper-item.done {
  color: #16a34a;
}

.stepper-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #475467;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.stepper-item.active .stepper-dot {
  background: #1d4ed8;
  color: #fff;
}

.stepper-item.done .stepper-dot {
  background: #16a34a;
  color: #fff;
}

.stepper-divider {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.grading-modal-body {
  padding: 22px;
  overflow: auto;
  flex: 1;
  min-height: 240px;
}

.grading-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  color: #475467;
  text-align: center;
}

.grading-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #1d4ed8;
  animation: grading-spin 0.9s linear infinite;
}

@keyframes grading-spin {
  to {
    transform: rotate(360deg);
  }
}

.grading-preview-image {
  max-width: 100%;
  max-height: 420px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background:
    linear-gradient(45deg, #f2f4f7 25%, transparent 25%),
    linear-gradient(-45deg, #f2f4f7 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f2f4f7 75%),
    linear-gradient(-45deg, transparent 75%, #f2f4f7 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  cursor: zoom-in;
}

.grading-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #475467;
  font-size: 13px;
}

.error-text {
  color: #b42318;
}

.grading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.grading-grid-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grading-grid-item.active {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.15);
}

.grading-grid-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
  user-select: none;
}

.grading-select-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.grading-select-summary {
  margin-right: auto;
  font-size: 13px;
  color: #475467;
}

.grading-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.grading-select-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 13px;
  color: #1f2937;
  background: #fff;
  cursor: pointer;
  user-select: none;
}

.grading-select-chip.active {
  border-color: #1d4ed8;
  color: #1d4ed8;
  background: #eff4ff;
}

.grading-grid-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: 6px;
  background: #f8fafc;
  cursor: zoom-in;
}

.grading-grid-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #475467;
}

.grading-download-single {
  /* 卡片/预览内的小号下载按钮 */
  padding: 4px 10px;
  font-size: 12px;
  margin-top: 8px;
}

.grading-standard-footer {
  /* Step 1 标准码图片下方的元信息 + 下载按钮，按钮右对齐 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 8px;
  gap: 12px;
}

.grading-standard-footer .grading-download-single {
  margin-top: 0;
  margin-left: auto;
}

.grading-modal-footer {
  display: flex;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  justify-content: flex-end;
}

.grading-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
}

.grading-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.grading-btn.primary {
  background: #1d4ed8;
  color: #fff;
}

.grading-btn.primary:hover:not(:disabled) {
  background: #1d3eb5;
}

.grading-btn.secondary {
  background: #fff;
  border-color: #d0d5dd;
  color: #1d4ed8;
}

.grading-btn.secondary:hover:not(:disabled) {
  background: #eff4ff;
}

.grading-btn.ghost {
  background: transparent;
  color: #475467;
}

.grading-btn.ghost:hover:not(:disabled) {
  background: #f2f4f7;
}

.grading-lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.grading-lightbox-image {
  max-width: 96vw;
  max-height: 92vh;
  object-fit: contain;
  background: #fff;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.grading-lightbox-close {
  position: absolute;
  top: 14px;
  right: 18px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #101828;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.grading-lightbox-close:hover {
  background: #fff;
}
</style>
