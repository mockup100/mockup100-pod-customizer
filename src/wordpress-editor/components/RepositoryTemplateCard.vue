<script setup lang="ts">
import type { TemplateSummary } from "../api/client"
import { computed, ref, watch } from "vue"
import { resolveAssetUrl } from "../api/client"
import {
  formatTemplateDate,
  getDisplayTemplateCode,
  getDisplayTemplateName,
  getRepositoryGovernanceId,
  getRepositoryRuntimeKey,
} from "../pages/admin/repositoryView"
import { resolveRepositoryTemplateAccessScope } from "../pages/admin/repositoryPreviewTemplateVisibility"
import { useUiLocaleStore } from "../stores/uiLocale"
import { storeToRefs } from "pinia"

const props = defineProps<{
  item: TemplateSummary
  highlighted: boolean
  coverUrl: string
  categoryLabel: string
  previewTooltip: string
  metaChips: string[]
  showOwner: boolean
  ownerLabel: string
  selectedCategoryId: string
  showSubmission: boolean
  showSubmitAction?: boolean
  submissionStatus: string
  submissionLabel: string
  canSubmit: boolean
  submitActionLabel: string
  showPreview: boolean
  canPreview: boolean
  showStats: boolean
  canManageApi: boolean
  canToggleApi: boolean
  canManagePublish: boolean
  publishActionLabel: string
  permissionActionLabel?: string
}>()

const emit = defineEmits<{
  applyCategory: [categoryId: string]
  preview: [templateId: string]
  edit: [templateId: string]
  reupload: [item: TemplateSummary]
  stats: [templateId: string]
  togglePublish: [item: TemplateSummary]
  editAccess: [item: TemplateSummary]
  toggleApi: [item: TemplateSummary]
  submit: [templateId: string]
  remove: [item: TemplateSummary]
}>()

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const CARD_I18N = {
  en: {
    template: "Template",
    preview: "Preview",
    stats: "Stats",
    listed: "Listed",
    draft: "Draft",
    publicAccess: "Public",
    privateAccess: "Private",
    apiEnabled: "API Enabled",
    apiDisabled: "API Disabled",
    physicalSizeMissing: "Physical Size Missing",
    edit: "Edit",
    reupload: "Reupload",
    editPermission: "Permission",
    disableApi: "Disable API",
    enableApi: "Enable API",
    listFirst: "List First",
    delete: "Delete",
  },
  zh: {
    template: "模板",
    preview: "预览",
    stats: "统计",
    listed: "已上架",
    draft: "草稿",
    publicAccess: "Public",
    privateAccess: "Private",
    apiEnabled: "API 已启用",
    apiDisabled: "API 已禁用",
    physicalSizeMissing: "缺少物理尺寸",
    edit: "编辑",
    reupload: "重新上传",
    editPermission: "权限",
    disableApi: "禁用 API",
    enableApi: "启用 API",
    listFirst: "先上架",
    delete: "删除",
  },
} as const

function t(key: keyof typeof CARD_I18N.en) {
  return CARD_I18N[locale.value][key] || CARD_I18N.en[key]
}

function onApplyCategory() {
  if (!props.item.category_id) return
  emit("applyCategory", props.item.category_id)
}

function getRuntimeTemplateKey() {
  return getRepositoryRuntimeKey(props.item)
}

function getGovernanceTemplateId() {
  return getRepositoryGovernanceId(props.item)
}

const imageLoadFailed = ref(false)

watch(() => props.coverUrl, () => {
  imageLoadFailed.value = false
}, { immediate: true })

const imageSrc = computed(() => {
  if (imageLoadFailed.value) return ""
  return resolveAssetUrl(String(props.coverUrl || "").trim())
})

function handleImageError() {
  imageLoadFailed.value = true
}

const resolvedAccessScope = computed(() => {
  return resolveRepositoryTemplateAccessScope(props.item)
})

</script>

<template>
  <div
    class="next-template-item"
    :class="{ highlighted }"
    :data-template-id="item.template_id"
    :data-testid="`repository-template-${item.template_id}`"
  >
    <div class="template-thumb" :class="{ interactive: showPreview || showStats }">
      <img v-if="imageSrc" :src="imageSrc" :alt="item.display_name" loading="lazy" decoding="async" @error="handleImageError" />
      <div v-else class="next-template-placeholder">
        <strong>{{ item.display_name?.slice(0, 1) || "T" }}</strong>
        <span>{{ item.category_path || t("template") }}</span>
      </div>
      <div v-if="showPreview || showStats" class="template-thumb-actions">
        <button
          v-if="showPreview"
          type="button"
          class="thumb-action primary"
          :disabled="!canPreview"
          :title="previewTooltip"
          @click="emit('preview', getRuntimeTemplateKey())"
        >
          {{ t("preview") }}
        </button>
        <button
          v-if="showStats"
          type="button"
          class="thumb-action"
          @click="emit('stats', getRuntimeTemplateKey())"
        >
          {{ t("stats") }}
        </button>
      </div>
    </div>
    <div class="template-body template-flow">
      <div class="template-head">
        <strong class="template-name">{{ getDisplayTemplateName(item.display_name) }}</strong>
        <span class="next-template-code">{{ getDisplayTemplateCode(item.template_code || "", item.template_id) }}</span>
        <span class="next-template-id">{{ item.template_id }}</span>
      </div>

      <div class="template-summary-grid">
        <div class="summary-field">
          <button
            v-if="item.category_id"
            type="button"
            class="next-category-pill interactive"
            :class="{ active: selectedCategoryId === item.category_id }"
            @click="onApplyCategory"
          >
            {{ categoryLabel }}
          </button>
          <span v-else class="next-category-pill">{{ categoryLabel }}</span>
        </div>
        <div class="summary-field">
          <span class="summary-value">{{ formatTemplateDate(item.updated_at) }}</span>
        </div>
      </div>

      <div class="template-pill-row">
        <span class="publish-status" :class="item.publish_status === 'published' ? 'published' : 'draft'">
          {{ item.publish_status === "published" ? t("listed") : t("draft") }}
        </span>
        <span class="access-scope" :class="resolvedAccessScope">
          <svg
            v-if="resolvedAccessScope === 'private'"
            class="access-scope-icon"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
          </svg>
          <span>{{ resolvedAccessScope === "public" ? t("publicAccess") : t("privateAccess") }}</span>
        </span>
        <span class="tenant-api-status" :class="item.tenant_api_status === 'enabled' ? 'enabled' : 'disabled'">
          {{ item.tenant_api_status === "enabled" ? t("apiEnabled") : t("apiDisabled") }}
        </span>
        <span v-if="item.physical_size_configured !== true" class="next-owner-pill warning">{{ t("physicalSizeMissing") }}</span>
        <span v-if="showSubmission" class="submission-status" :class="submissionStatus || 'none'">
          {{ submissionLabel }}
        </span>
        <span v-if="showOwner" class="next-owner-pill">{{ ownerLabel }}</span>
        <span v-for="chip in metaChips" :key="`${item.template_id}-${chip}`" class="next-owner-pill neutral">{{ chip }}</span>
      </div>

      <div class="template-actions">
        <button type="button" class="next-action secondary" @click="emit('edit', getRuntimeTemplateKey())">
          {{ t("edit") }}
        </button>
        <button type="button" class="next-action secondary" @click="emit('reupload', item)">
          {{ t("reupload") }}
        </button>
        <button type="button" class="next-action secondary" @click="emit('editAccess', item)">
          {{ permissionActionLabel || t("editPermission") }}
        </button>
        <button
          v-if="canManagePublish"
          type="button"
          class="next-action secondary"
          @click="emit('togglePublish', item)"
        >
          {{ publishActionLabel }}
        </button>
        <button
          v-if="canManageApi"
          type="button"
          class="next-action secondary"
          :disabled="!canToggleApi"
          :data-testid="item.tenant_api_status === 'enabled' ? `repository-disable-api-${item.template_id}` : `repository-enable-api-${item.template_id}`"
          @click="emit('toggleApi', item)"
        >
          {{ item.tenant_api_status === "enabled" ? t("disableApi") : canToggleApi ? t("enableApi") : t("listFirst") }}
        </button>
        <button
          v-if="showSubmission && showSubmitAction !== false"
          type="button"
          class="next-action secondary"
          :disabled="!canSubmit"
          @click="emit('submit', getGovernanceTemplateId())"
        >
          {{ submitActionLabel }}
        </button>
        <button type="button" class="next-action ghost danger" @click="emit('remove', item)">{{ t("delete") }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.next-template-item {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.8rem;
  padding: 0.75rem 0.8rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  transition: all 0.2s ease;
}

.next-template-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.next-template-item.highlighted {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18), 0 14px 28px rgba(99, 102, 241, 0.18);
}

.template-thumb {
  width: 140px;
  aspect-ratio: 4 / 3;
  border-radius: 0.8rem;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  position: relative;
}

.template-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #ffffff;
}

.next-template-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
  color: #6366f1;
  text-align: center;
  padding: 1rem;
}

.next-template-placeholder strong {
  font-size: 2rem;
  line-height: 1;
}

.next-template-placeholder span {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #475569;
}

.template-thumb.interactive:hover .template-thumb-actions,
.template-thumb.interactive:focus-within .template-thumb-actions {
  opacity: 1;
  transform: translateY(0);
}

.template-thumb-actions {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.7rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.82) 100%);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  z-index: 1;
}

.thumb-action {
  padding: 0.36rem 0.62rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.14);
  color: white;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  backdrop-filter: blur(10px);
}

.thumb-action.primary {
  background: rgba(14, 165, 233, 0.92);
  border-color: rgba(14, 165, 233, 0.92);
}

.thumb-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.template-body {
  display: flex;
  min-width: 0;
}

.template-flow {
  flex-direction: column;
  align-items: stretch;
  align-content: stretch;
  gap: 0.65rem;
  min-width: 0;
}

.template-head {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
}

.template-name {
  font-size: 0.96rem;
  color: #1e293b;
  line-height: 1.35;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  flex: 0 1 auto;
}

.next-template-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.73rem;
  color: #475569;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.next-template-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.72rem;
  color: #94a3b8;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.identity-label,
.summary-label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}

.template-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 0.75rem;
}

.summary-field {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  justify-content: center;
}

.summary-value {
  font-size: 0.82rem;
  color: #1e293b;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.template-date {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0;
  color: #1e293b;
  font-size: 0.74rem;
  font-weight: 600;
}

.next-category-pill,
.next-owner-pill,
.submission-status,
.tenant-api-status,
.publish-status,
.access-scope {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.next-category-pill {
  border: 0;
  padding: 0.24rem 0.5rem;
  background: #eef2ff;
  color: #4338ca;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: left;
  justify-content: flex-start;
  line-height: 1.35;
}

.next-category-pill.interactive {
  cursor: pointer;
}

.next-category-pill.interactive:hover {
  background: #dbeafe;
  color: #1d4ed8;
}

.next-category-pill.interactive.active {
  background: #4338ca;
  color: white;
}

.next-owner-pill {
  padding: 0.24rem 0.5rem;
  background: #ecfeff;
  color: #0f766e;
  white-space: nowrap;
}

.next-owner-pill.neutral {
  background: #f1f5f9;
  color: #475569;
}

.next-owner-pill.warning {
  background: #fff7ed;
  color: #c2410c;
}

.template-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.submission-status,
.tenant-api-status,
.publish-status,
.access-scope {
  padding: 0.2rem 0.55rem;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.access-scope {
  gap: 0.25rem;
}

.access-scope-icon {
  width: 0.8rem;
  height: 0.8rem;
  flex: 0 0 auto;
}

.submission-status {
  color: #334155;
  background: #f8fafc;
}

.submission-status.submitted,
.submission-status.under_review {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.25);
}

.submission-status.changes_requested {
  background: rgba(245, 158, 11, 0.14);
  color: #92400e;
  border-color: rgba(245, 158, 11, 0.3);
}

.submission-status.approved {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.25);
}

.submission-status.rejected {
  background: rgba(239, 68, 68, 0.14);
  color: #991b1b;
  border-color: rgba(239, 68, 68, 0.25);
}

.submission-status.none {
  background: #f8fafc;
  color: #64748b;
}

.tenant-api-status {
  font-weight: 800;
}

.publish-status.published {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  border-color: rgba(14, 165, 233, 0.25);
}

.publish-status.draft {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border-color: rgba(148, 163, 184, 0.25);
}

.access-scope.public {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
  border-color: rgba(99, 102, 241, 0.24);
}

.access-scope.private {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.24);
}

.tenant-api-status.enabled {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.25);
}

.tenant-api-status.disabled {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border-color: rgba(148, 163, 184, 0.25);
}

.next-action {
  padding: 0.4rem 0.62rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.375rem;
  color: #0f172a;
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  flex: 0 0 auto;
}

.next-action.primary {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: white;
}

.next-action.secondary {
  background: white;
}

.next-action.ghost {
  background: transparent;
}

.next-action.danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.25);
}

.next-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .next-template-item {
    grid-template-columns: 1fr;
  }

  .template-thumb {
    width: 100%;
  }

  .template-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
