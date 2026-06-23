<template>
  <div v-if="isOpen" class="upload-modal-overlay" @click.self="closeModal">
    <div class="upload-modal">
      <div class="modal-header">
        <h3>📤 {{ isReupload ? t("reuploadTemplate") : t("uploadTemplate") }}</h3>
        <button type="button" class="close-btn" @click="closeModal">✕</button>
      </div>
      
      <div class="modal-body">
        <!-- Step 1: Basic Information -->
        <div class="form-section">
          <h4>📝 {{ t("templateInformation") }}</h4>
          <div class="form-grid">
            <div class="form-group">
              <label for="templateName">{{ t("templateName") }} *</label>
              <input 
                id="templateName"
                v-model="formData.templateName"
                type="text"
                :placeholder="t('enterTemplateName')"
                :disabled="isUploading"
                required
              />
            </div>
            <div class="form-group">
              <label for="templateCode">{{ t("templateCode") }} *</label>
              <input 
                id="templateCode"
                v-model="formData.templateCode"
                type="text"
                placeholder="template-code"
                :disabled="isUploading || isReupload"
                :readonly="isReupload"
                @blur="handleTemplateCodeBlur"
                required
              />
              <small
                v-if="templateCodeHint"
                :class="['field-hint', templateCodeCheckState]"
              >
                {{ templateCodeHint }}
              </small>
              <small v-if="isReupload" class="field-hint neutral">
                {{ t("reuploadCodeLockedHint") }}
              </small>
            </div>
          </div>
        </div>

        <!-- Step 2: Category Selection -->
        <div class="form-section category-section">
          <h4>🏷️ {{ t("categorySelection") }}</h4>
          <div class="form-group">
            <CategoryCascadeSelector
              v-model="formData.categoryId"
              :categories="categories"
              :inline-clear="true"
              :show-recent-options="false"
              :show-selection-summary="false"
              :helper-text="t('selectTemplateCategory')"
              :disabled="isUploading"
            />
          </div>
        </div>

        <!-- Step 3: File Upload -->
        <div class="form-section">
          <h4>📁 {{ t("templateFile") }}</h4>
          <div 
            class="upload-area"
            :class="{ 
              'drag-over': isDragOver,
              'has-file': selectedFile,
              'uploading': isUploading,
              'error': uploadError
            }"
            @click="triggerFileSelect"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".zip,.tar,.tar.gz,.tgz,.tar.bz2,.tbz2,.tar.xz,.txz,.7z,.rar,application/zip,application/x-tar,application/gzip,application/x-gzip,application/x-7z-compressed,application/vnd.rar,application/x-rar-compressed"
              @change="handleFileSelect"
              :disabled="isUploading"
              style="display: none"
            />
            
            <div v-if="!selectedFile && !isUploading" class="upload-placeholder">
              <div class="upload-icon">📁</div>
              <p>{{ t("browseOrDragArchive") }}</p>
              <small>{{ t("supportedFormats") }}</small>
              <small>{{ t("maxFileSize") }}</small>
            </div>
            
            <div v-else-if="selectedFile && !isUploading" class="file-info">
              <div class="file-icon">📦</div>
              <div class="file-details">
                <strong>{{ selectedFile.name }}</strong>
                <small>{{ formatFileSize(selectedFile.size) }}</small>
              </div>
              <button type="button" class="remove-file" @click="removeFile">✕</button>
            </div>
            
            <div v-else-if="isUploading" class="upload-progress">
              <div class="progress-icon">⏳</div>
              <div class="progress-details">
                <strong>{{ currentUploadStatus?.stage || t("uploading") }}</strong>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: `${(currentUploadStatus?.progress || 0) * 100}%` }"
                  ></div>
                </div>
                <small>{{ formatText(t("percentComplete"), { percent: Math.round((currentUploadStatus?.progress || 0) * 100) }) }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="uploadErrorState" class="workflow-error-panel" data-testid="template-upload-error-panel">
          <div class="workflow-error-header">
            <span class="workflow-error-icon">⚠️</span>
            <h4>{{ t("uploadErrorTitle") }}</h4>
          </div>
          <p class="workflow-error-summary" data-testid="template-upload-error-summary">
            {{ uploadErrorState }}
          </p>
          <button type="button" class="retry-btn" @click="retryUpload">
            🔄 {{ t("retryUpload") }}
          </button>
        </div>

        <!-- Success Display -->
        <div v-else-if="uploadSuccess" class="success-section">
          <h4>{{ t("uploadSuccessfulTitle") }}</h4>
          <div class="success-message">
            {{ t("templateUploadedPrefix") }} <strong>{{ uploadResult?.template_code || formData.templateCode }}</strong> {{ t("templateUploadedSuffix") }}
          </div>
          <div class="success-message preparing-editor-line">
            <span class="prep-spinner" aria-hidden="true"></span>
            <span>{{ t("preparingEditor") }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          type="button" 
          class="btn secondary" 
          @click="closeModal"
          :disabled="isUploading"
        >
          {{ uploadSuccess ? t('close') : t('cancel') }}
        </button>
        
        <button 
          type="button" 
          class="btn primary" 
          @click="startUpload"
          :disabled="!canUpload || isUploading"
        >
          {{ isUploading ? t('uploading') : (isReupload ? t('reuploadTemplate') : t('uploadTemplate')) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useUploadStore } from '../stores/upload'
import { useUiLocaleStore } from '../stores/uiLocale'
import CategoryCascadeSelector from './CategoryCascadeSelector.vue'
import { resolveTemplateWorkflowError } from "../utils/templateWorkflowErrors"
import {
  buildPhysicalDimensionsPayload,
  hydrateUploadPhysicalDimensions,
} from "../utils/templatePhysicalDimensions"

interface Props {
  isOpen: boolean
  categories: any[]
  templateId?: string
  initialTemplateCode?: string
  initialTemplateName?: string
  initialCategoryId?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'success', data: any): void
}

const props = withDefaults(defineProps<Props>(), {
  templateId: "",
  initialTemplateCode: "",
  initialTemplateName: "",
  initialCategoryId: "",
})
const emit = defineEmits<Emits>()

const isReupload = computed(() => Boolean(props.templateId && props.templateId.trim()))

const uploadStore = useUploadStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const TEMPLATE_UPLOAD_I18N = {
  en: {
    uploadTemplate: "Upload Template",
    reuploadTemplate: "Reupload Template",
    reuploadCodeLockedHint: "Template code is locked while reuploading.",
    templateInformation: "Template Information",
    templateName: "Template Name",
    enterTemplateName: "Enter template name",
    templateCode: "Template Code",
    categorySelection: "Category Selection",
    selectTemplateCategory: "Select the appropriate category for your template",
    templateFile: "Template File",
    browseOrDragArchive: "Click to browse or drag and drop your template archive here",
    supportedFormats: "Supported formats: .zip, .tar, .tar.gz, .tgz, .tar.bz2, .tbz2, .tar.xz, .txz, .7z, .rar",
    maxFileSize: "Maximum file size: 200MB",
    uploading: "Uploading...",
    percentComplete: "{percent}% Complete",
    uploadErrorTitle: "Upload Error",
    retryUpload: "Retry Upload",
    uploadSuccessfulTitle: "Upload Successful",
    templateUploadedPrefix: "Template",
    templateUploadedSuffix: "has been uploaded successfully!",
    preparingEditor: "Preparing editor, opening shortly…",
    close: "Close",
    cancel: "Cancel",
    checkAvailabilityBeforeUpload: "Check availability before upload.",
    invalidTemplateCode: "Use 2-64 letters, numbers, `_` or `-`.",
    checkingTemplateCode: "Checking template code...",
    templateCodeAvailable: "Template code is available.",
    templateCodeExists: "Template code already exists.",
    templateCodeExistsAction: "Template code already exists. Please enter a new code and try again.",
    validateTemplateCodeFailed: "Unable to validate template code.",
    archiveStructureError: "The archive structure does not meet the template requirements. Please check ZIP folders, file names, and directory levels, then upload again.",
    uploadFailedRetryMessage: "Upload failed. Please check the network or try again in a moment.",
    unexpectedUploadError: "We could not process this template right now. Please try again in a moment.",
    fileSizeExceeded: "File size exceeds 200MB limit. Selected file: {size}",
    bytes: "Bytes",
  },
  zh: {
    uploadTemplate: "上传模板",
    reuploadTemplate: "重新上传",
    reuploadCodeLockedHint: "重新上传时模板编码不可修改。",
    templateInformation: "模板信息",
    templateName: "模板名称",
    enterTemplateName: "输入模板名称",
    templateCode: "模板编码",
    categorySelection: "分类选择",
    selectTemplateCategory: "为模板选择合适的分类",
    templateFile: "模板文件",
    browseOrDragArchive: "点击选择文件，或将模板压缩包拖拽到这里",
    supportedFormats: "支持格式：.zip、.tar、.tar.gz、.tgz、.tar.bz2、.tbz2、.tar.xz、.txz、.7z、.rar",
    maxFileSize: "最大文件大小：200MB",
    uploading: "上传中...",
    percentComplete: "已完成 {percent}%",
    uploadErrorTitle: "上传错误",
    retryUpload: "重试上传",
    uploadSuccessfulTitle: "上传成功",
    templateUploadedPrefix: "模板",
    templateUploadedSuffix: "上传成功！",
    preparingEditor: "正在准备编辑器，即将打开…",
    close: "关闭",
    cancel: "取消",
    checkAvailabilityBeforeUpload: "上传前请先检查可用性。",
    invalidTemplateCode: "请使用 2-64 位字母、数字、`_` 或 `-`。",
    checkingTemplateCode: "正在检查模板编码...",
    templateCodeAvailable: "模板编码可用。",
    templateCodeExists: "模板编码已存在。",
    templateCodeExistsAction: "模板编码已存在，请更换新的编码后重试。",
    validateTemplateCodeFailed: "无法校验模板编码。",
    archiveStructureError: "模板压缩包结构不符合要求，请检查 ZIP folders、文件命名和目录层级后重新上传。",
    uploadFailedRetryMessage: "上传失败，请检查网络连接或稍后重试。",
    unexpectedUploadError: "当前无法处理该模板，请稍后重试。",
    fileSizeExceeded: "文件大小超过 200MB 限制，当前文件：{size}",
    bytes: "字节",
  },
} as const

function t(key: keyof typeof TEMPLATE_UPLOAD_I18N.en) {
  return TEMPLATE_UPLOAD_I18N[locale.value][key] || TEMPLATE_UPLOAD_I18N.en[key]
}

function formatText(template: string, replacements: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => String(replacements[token] ?? ""))
}

function normalizeTemplateUploadError(raw: unknown) {
  const resolved = resolveTemplateWorkflowError(raw)
  if (resolved.kind === "duplicate_code") {
    return t("templateCodeExistsAction")
  }
  if (resolved.kind === "invalid_structure") {
    return t("archiveStructureError")
  }
  if (resolved.kind === "upload_failed") {
    return t("uploadFailedRetryMessage")
  }
  if (resolved.kind === "validation_failed") {
    return t("validateTemplateCodeFailed")
  }
  if (!resolved.rawMessage) {
    return t("unexpectedUploadError")
  }
  return resolved.isTechnical ? t("unexpectedUploadError") : resolved.rawMessage
}

// Form data
const formData = ref({
  templateName: props.initialTemplateName || '',
  templateCode: props.initialTemplateCode || '',
  categoryId: props.initialCategoryId || ''
})

// File handling
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)

// Upload state
const isUploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref(false)
const uploadResult = ref<any>(null)
const templateCodeCheckState = ref<"idle" | "checking" | "available" | "blocked">("idle")
const templateCodeHint = ref("")
const lastCheckedTemplateCode = ref("")
let templateCodeCheckTimer: number | null = null

// Computed properties
const canUpload = computed(() => {
  return formData.value.templateName.trim() &&
         formData.value.templateCode.trim() &&
         formData.value.categoryId &&
         selectedFile.value &&
         !uploadError.value &&
         templateCodeCheckState.value !== "blocked" &&
         templateCodeCheckState.value !== "checking"
})
const currentUploadStatus = computed(() => uploadStore.uploadStatus)

const uploadErrorState = computed(() => {
  const normalized = uploadError.value.trim()
  return normalized || ""
})

// Methods
function closeModal() {
  if (!isUploading.value) {
    resetForm()
    emit('close')
  }
}

function resetForm() {
  clearTemplateCodeCheckTimer()
  formData.value = {
    templateName: props.initialTemplateName || '',
    templateCode: props.initialTemplateCode || '',
    categoryId: props.initialCategoryId || ''
  }
  selectedFile.value = null
  uploadError.value = ''
  uploadSuccess.value = false
  uploadResult.value = null
  templateCodeCheckState.value = "idle"
  templateCodeHint.value = ""
  lastCheckedTemplateCode.value = ""
  uploadStore.resetInspection()
}

watch(() => [props.isOpen, props.templateId, props.initialTemplateCode, props.initialTemplateName, props.initialCategoryId], () => {
  if (props.isOpen && !isUploading.value) {
    formData.value.templateName = props.initialTemplateName || formData.value.templateName
    formData.value.templateCode = props.initialTemplateCode || formData.value.templateCode
    formData.value.categoryId = props.initialCategoryId || formData.value.categoryId
    if (isReupload.value && formData.value.templateCode.trim()) {
      void ensureTemplateCodeAvailable()
    }
  }
})

function triggerFileSelect() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    validateAndSetFile(file)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    validateAndSetFile(files[0])
  }
}

function stripArchiveExtension(fileName: string) {
  return fileName.replace(/(\.tar\.gz|\.tgz|\.tar\.bz2|\.tbz2|\.tar\.xz|\.txz|\.tar|\.zip|\.7z|\.rar)$/i, "")
}

function isSupportedArchive(fileName: string) {
  return /(\.tar\.gz|\.tgz|\.tar\.bz2|\.tbz2|\.tar\.xz|\.txz|\.tar|\.zip|\.7z|\.rar)$/i.test(fileName)
}

function validateAndSetFile(file: File) {
  // File size validation (200MB max)
  const maxSize = 200 * 1024 * 1024
  if (file.size > maxSize) {
    uploadError.value = formatText(t("fileSizeExceeded"), { size: formatFileSize(file.size) })
    return
  }
  
  // File type validation
  if (!isSupportedArchive(file.name)) {
    uploadError.value = t("supportedFormats")
    return
  }
  
  selectedFile.value = file
  uploadError.value = ''
  
  // Auto-suggest template name and code from filename
  if (!formData.value.templateName.trim()) {
    const nameWithoutExt = stripArchiveExtension(file.name)
    formData.value.templateName = nameWithoutExt
  }
  
  if (!formData.value.templateCode.trim()) {
    const codeWithoutExt = stripArchiveExtension(file.name).toLowerCase().replace(/[^a-z0-9]/g, '-')
    formData.value.templateCode = codeWithoutExt
  }
}

function removeFile() {
  selectedFile.value = null
  uploadError.value = ''
}

function clearTemplateCodeCheckTimer() {
  if (templateCodeCheckTimer != null) {
    window.clearTimeout(templateCodeCheckTimer)
    templateCodeCheckTimer = null
  }
}

watch(() => formData.value.templateCode, (value) => {
  clearTemplateCodeCheckTimer()
  const normalized = value.trim()
  if (!normalized) {
    templateCodeCheckState.value = "idle"
    templateCodeHint.value = ""
    lastCheckedTemplateCode.value = ""
    return
  }
  if (normalized !== lastCheckedTemplateCode.value) {
    templateCodeCheckState.value = "idle"
    templateCodeHint.value = t("checkAvailabilityBeforeUpload")
    if (/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(normalized) && !isUploading.value) {
      templateCodeCheckTimer = window.setTimeout(() => {
        void ensureTemplateCodeAvailable()
      }, 450)
    }
  }
})

onBeforeUnmount(() => {
  clearTemplateCodeCheckTimer()
})

async function handleTemplateCodeBlur() {
  const templateCode = formData.value.templateCode.trim()
  if (!templateCode || isUploading.value) return
  await ensureTemplateCodeAvailable()
}

async function ensureTemplateCodeAvailable() {
  const templateCode = formData.value.templateCode.trim()
  if (!templateCode) return false
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(templateCode)) {
    templateCodeCheckState.value = "blocked"
    templateCodeHint.value = t("invalidTemplateCode")
    return false
  }
  if (templateCode === lastCheckedTemplateCode.value && templateCodeCheckState.value === "available") {
    return true
  }
  templateCodeCheckState.value = "checking"
  templateCodeHint.value = t("checkingTemplateCode")
  try {
    const result = await uploadStore.checkTemplateCode(templateCode, props.templateId || "")
    const resolvedTemplateCode = result.template_code || templateCode
    if (resolvedTemplateCode !== templateCode) {
      formData.value.templateCode = resolvedTemplateCode
    }
    lastCheckedTemplateCode.value = resolvedTemplateCode
    if (result.available) {
      templateCodeCheckState.value = "available"
      templateCodeHint.value = t("templateCodeAvailable")
      return true
    }
    templateCodeCheckState.value = "blocked"
    templateCodeHint.value = result.message || t("templateCodeExists")
    return false
  } catch (error) {
    templateCodeCheckState.value = "blocked"
    templateCodeHint.value = normalizeTemplateUploadError(error)
    return false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return `0 ${t("bytes")}`
  const k = 1024
  const sizes = [t("bytes"), 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function startUpload() {
  if (!canUpload.value) return
  
  isUploading.value = true
  uploadError.value = ''
  uploadSuccess.value = false
  
  try {
    const templateCodeReady = await ensureTemplateCodeAvailable()
    if (!templateCodeReady) {
      isUploading.value = false
      uploadError.value = templateCodeHint.value || t("templateCodeExists")
      return
    }
    // First inspect the file
    await uploadStore.inspect(selectedFile.value!, formData.value.templateName, formData.value.templateCode, props.templateId || "")
    if (uploadStore.error) {
      uploadError.value = normalizeTemplateUploadError(uploadStore.error)
      isUploading.value = false
      return
    }

    // Then upload with suggested config
    const suggestedConfig = uploadStore.inspection?.suggested_config || {
      display_name: formData.value.templateName,
      structure_overrides: { bucket_aliases: {}, view_aliases: {}, part_aliases: {} },
      compose_params: {},
      input_constraints: {},
      physical_dimensions_cm: { parts: {} },
    }
    suggestedConfig.physical_dimensions_cm = buildPhysicalDimensionsPayload({
      parts: hydrateUploadPhysicalDimensions({
        candidates: uploadStore.inspection?.physical_dimensions_candidates,
        configured: (uploadStore.inspection?.suggested_config?.physical_dimensions_cm?.parts || {}) as any,
      }),
    })
    
    await uploadStore.upload(
      selectedFile.value!,
      formData.value.templateName,
      formData.value.templateCode,
      formData.value.categoryId,
      suggestedConfig,
      uploadStore.inspection?.inspect_job_id || "",
      props.templateId || "",
    )
    
    if (uploadStore.error) {
      uploadError.value = normalizeTemplateUploadError(uploadStore.error)
      isUploading.value = false
      return
    }
    uploadResult.value = uploadStore.uploadResult
    uploadSuccess.value = true
    isUploading.value = false
    emit('success', uploadStore.uploadResult)
  } catch (error) {
    uploadError.value = normalizeTemplateUploadError(error)
    isUploading.value = false
  }
}

function retryUpload() {
  uploadError.value = ''
  startUpload()
}
</script>

<style scoped>
.upload-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.upload-modal {
  background: white;
  border-radius: 1rem;
  width: 90%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #374151;
}

.modal-body {
  padding: 1.15rem 1.25rem 1.25rem;
}

.form-section {
  margin-bottom: 1.15rem;
}

.category-section {
  position: relative;
  z-index: 30;
}

.category-section :deep(.category-cascade) {
  z-index: 40;
}

.category-section :deep(.cascade-select-shell),
.category-section :deep(.cascade-menu) {
  z-index: 50;
}

.category-section :deep(.category-cascade) {
  gap: 0.45rem;
}

.category-section :deep(.cascade-grid) {
  gap: 0.55rem;
}

.category-section :deep(.cascade-select-trigger) {
  min-height: 40px;
  padding: 0.65rem 0.8rem;
}

.category-section :deep(.cascade-clear--inline) {
  min-width: 76px;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
}

.form-section h4 {
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.field-hint {
  margin-top: 0.4rem;
  font-size: 0.82rem;
  color: #64748b;
}

.field-hint.checking {
  color: #0ea5e9;
}

.field-hint.available {
  color: #047857;
}

.field-hint.blocked {
  color: #dc2626;
}

.field-hint.neutral {
  color: #64748b;
}

.physical-grid {
  display: grid;
  gap: 0.875rem;
}

.physical-card {
  padding: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.physical-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.physical-source {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #334155;
}

.physical-source.svg {
  background: #dbeafe;
  color: #1d4ed8;
}

.physical-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.physical-raw {
  display: block;
  margin-bottom: 0.5rem;
  color: #64748b;
}

.form-group label {
  margin-bottom: 0.35rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 0.65rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 124px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.upload-area.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-area.has-file {
  border-color: #10b981;
  border-style: solid;
  background: #ecfdf5;
}

.upload-area.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.upload-placeholder {
  color: #64748b;
}

.upload-icon {
  font-size: 2.35rem;
  margin-bottom: 0.65rem;
}

.upload-progress {
  width: 100%;
}

.progress-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-details {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 0.25rem;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.file-icon {
  font-size: 2rem;
}

.file-details {
  flex: 1;
  text-align: left;
}

.remove-file {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.workflow-error-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.95rem 1rem;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  background: #fef2f2;
}

.workflow-error-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.workflow-error-icon {
  flex: 0 0 auto;
}

.workflow-error-header h4 {
  margin: 0;
  color: #b91c1c;
}

.workflow-error-summary {
  margin: 0;
  color: #991b1b;
  line-height: 1.5;
}

.success-section {
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.success-section h4 {
  color: #166534;
  margin: 0 0 0.5rem 0;
}

.success-message {
  color: #166534;
}

.preparing-editor-line {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #0f5132;
  font-size: 0.85rem;
}

.prep-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #bbf7d0;
  border-top-color: #166534;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.25rem 1.15rem;
  border-top: 1px solid #e2e8f0;
  background: #f9fafb;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn.primary:hover:not(:disabled) {
  background: #0ea5e9;
  border-color: #0ea5e9;
}

.btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #f3f4f6;
}

.btn.secondary:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #e5e7eb;
}

.retry-btn {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.retry-btn:hover {
  background: #d97706;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .upload-modal {
    width: 95%;
    margin: 1rem;
  }
}
</style>
