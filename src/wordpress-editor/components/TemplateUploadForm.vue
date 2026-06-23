<template>
  <div class="upload-form">
    <div class="upload-steps">
      <div class="step-indicator">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          :class="{ active: currentStep === index, completed: currentStep > index }"
          class="step"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-label">{{ step.label }}</div>
        </div>
      </div>
    </div>

    <!-- Step 1: Template Information -->
    <div v-show="currentStep === 0" class="step-content">
      <h3 class="step-title">{{ t('templateInformation') }}</h3>
      <div class="form-grid">
        <Input
          v-model="formData.name"
          :label="t('templateName')"
          :placeholder="t('enterTemplateName')"
          required
        />
        <Input
          v-model="formData.code"
          :label="t('templateCode')"
          :placeholder="t('templateCodePlaceholder')"
          required
        />
        <div class="form-group full">
          <label class="form-label">{{ t('category') }}</label>
          <CategoryCascadeSelector
            v-model="formData.categoryId"
            :categories="categories"
            :show-recent-options="false"
            :show-selection-summary="false"
            :level1-placeholder="t('selectCategory')"
            :level2-placeholder="t('selectLevel2')"
            :level3-placeholder="t('selectLevel3')"
          />
        </div>
        <div class="form-group full">
          <label class="form-label">{{ t('description') }}</label>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            :placeholder="t('describeTemplate')"
            rows="3"
          />
        </div>
      </div>
    </div>

    <!-- Step 2: File Upload -->
    <div v-show="currentStep === 1" class="step-content">
      <h3 class="step-title">{{ t('uploadTemplateFile') }}</h3>
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
          <div class="upload-icon">
            <UploadCloud class="w-12 h-12" />
          </div>
          <h4>{{ t('dropTemplateFile') }}</h4>
          <p>{{ t('orClickToBrowse') }}</p>
          <small>{{ t('supportedArchives') }}</small>
        </div>
        
        <div v-else-if="selectedFile && !isUploading" class="file-info">
          <div class="file-preview">
            <FileArchive class="w-8 h-8" />
          </div>
          <div class="file-details">
            <h4>{{ selectedFile.name }}</h4>
            <p>{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button type="button" class="remove-file" @click="removeFile">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div v-else-if="isUploading" class="upload-progress">
          <div class="progress-animation">
            <div class="spinner"></div>
          </div>
          <h4>{{ uploadStatus?.stage || t('uploading') }}</h4>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(uploadStatus?.progress || 0) * 100}%` }"
            ></div>
          </div>
          <p>{{ t('percentComplete', { percent: Math.round((uploadStatus?.progress || 0) * 100) }) }}</p>
        </div>
      </div>

      <div v-if="uploadError" class="error-message">
        <AlertCircle class="w-5 h-5" />
        <span>{{ uploadError }}</span>
      </div>
    </div>

    <!-- Step 3: Preview & Confirm -->
    <div v-show="currentStep === 2" class="step-content">
      <h3 class="step-title">{{ t('reviewAndConfirm') }}</h3>
      <div class="review-section">
        <div class="review-item">
          <h4>{{ t('templateDetails') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">{{ t('nameLabel') }}</span>
              <span class="value">{{ formData.name }}</span>
            </div>
            <div class="detail-item">
              <span class="label">{{ t('codeLabel') }}</span>
              <span class="value">{{ formData.code }}</span>
            </div>
            <div class="detail-item">
              <span class="label">{{ t('categoryLabel') }}</span>
              <span class="value">{{ getCategoryName(formData.categoryId) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">{{ t('fileLabel') }}</span>
              <span class="value">{{ selectedFile?.name }}</span>
            </div>
          </div>
        </div>

        <div v-if="inspectionResult" class="review-item">
          <h4>{{ t('templateAnalysis') }}</h4>
          <div class="analysis-grid">
            <div class="analysis-item">
              <div class="analysis-icon success">
                <Check class="w-5 h-5" />
              </div>
              <div class="analysis-content">
                <h5>{{ t('structureValid') }}</h5>
                <p>{{ t('structureValidDesc') }}</p>
              </div>
            </div>
            <div class="analysis-item">
              <div class="analysis-icon info">
                <Info class="w-5 h-5" />
              </div>
              <div class="analysis-content">
                <h5>{{ t('filesFound', { count: inspectionResult.stats?.totalFiles || 0 }) }}</h5>
                <p>{{ t('filesFoundDesc') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step Actions -->
    <div class="step-actions">
      <Button 
        variant="outline" 
        @click="previousStep"
        :disabled="currentStep === 0"
      >
        {{ t('previous') }}
      </Button>
      
      <div class="action-spacer"></div>
      
      <Button 
        variant="ghost" 
        @click="$emit('cancel')"
      >
        {{ t('cancel') }}
      </Button>
      
      <Button 
        v-if="currentStep < steps.length - 1"
        @click="nextStep"
        :disabled="!canProceed"
      >
        {{ t('next') }}
      </Button>
      
      <Button 
        v-if="currentStep === steps.length - 1"
        variant="primary"
        @click="submitUpload"
        :disabled="!canSubmit || isUploading"
        :loading="isUploading"
      >
        {{ isUploading ? t('uploading') : t('uploadTemplate') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUploadStore } from '../stores/upload'
import { usePlatformStore } from '../stores/platform'
import { useUiLocaleStore } from '../stores/uiLocale'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import CategoryCascadeSelector from './CategoryCascadeSelector.vue'
import {
  UploadCloud,
  FileArchive,
  X,
  AlertCircle,
  Check,
  Info
} from 'lucide-vue-next'
import {
  buildPhysicalDimensionsPayload,
  hydrateUploadPhysicalDimensions,
} from "../utils/templatePhysicalDimensions"

interface Props {
  categories: any[]
}

interface Emits {
  (e: 'success'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const uploadStore = useUploadStore()
const platformStore = usePlatformStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const TEMPLATE_UPLOAD_FORM_I18N = {
  en: {
    templateInformation: 'Template Information',
    templateName: 'Template Name',
    enterTemplateName: 'Enter template name',
    templateCode: 'Template Code',
    templateCodePlaceholder: 'template-code',
    category: 'Category',
    selectCategory: 'Select a category',
    selectLevel2: 'Select Level 2',
    selectLevel3: 'Select Level 3',
    description: 'Description',
    describeTemplate: 'Describe your template',
    uploadTemplateFile: 'Upload Template File',
    dropTemplateFile: 'Drop your template file here',
    orClickToBrowse: 'or click to browse',
    supportedArchives: 'Supports .zip, .tar, .tar.gz, .tgz, .tar.bz2, .tbz2, .tar.xz, .txz, .7z, .rar up to 200MB',
    uploading: 'Uploading...',
    percentComplete: '{percent}% Complete',
    reviewAndConfirm: 'Review & Confirm',
    templateDetails: 'Template Details',
    nameLabel: 'Name:',
    codeLabel: 'Code:',
    categoryLabel: 'Category:',
    fileLabel: 'File:',
    templateAnalysis: 'Template Analysis',
    structureValid: 'Structure Valid',
    structureValidDesc: 'Template structure is properly organized',
    filesFound: '{count} Files Found',
    filesFoundDesc: 'Includes all necessary template files',
    previous: 'Previous',
    cancel: 'Cancel',
    next: 'Next',
    uploadTemplate: 'Upload Template',
    information: 'Information',
    uploadFile: 'Upload File',
    review: 'Review',
    fileSizeExceeded: 'File size exceeds 200MB limit. Selected file: {size}',
    supportedFormats: 'Supported formats: .zip, .tar, .tar.gz, .tgz, .tar.bz2, .tbz2, .tar.xz, .txz, .7z, .rar',
    bytes: 'Bytes',
    unknownCategory: 'Unknown Category',
  },
  zh: {
    templateInformation: '模板信息',
    templateName: '模板名称',
    enterTemplateName: '输入模板名称',
    templateCode: '模板编码',
    templateCodePlaceholder: 'template-code',
    category: '分类',
    selectCategory: '选择分类',
    selectLevel2: '选择二级分类',
    selectLevel3: '选择三级分类',
    description: '描述',
    describeTemplate: '描述你的模板',
    uploadTemplateFile: '上传模板文件',
    dropTemplateFile: '将模板文件拖拽到这里',
    orClickToBrowse: '或点击浏览',
    supportedArchives: '支持 .zip、.tar、.tar.gz、.tgz、.tar.bz2、.tbz2、.tar.xz、.txz、.7z、.rar，最大 200MB',
    uploading: '上传中...',
    percentComplete: '已完成 {percent}%',
    reviewAndConfirm: '检查并确认',
    templateDetails: '模板详情',
    nameLabel: '名称：',
    codeLabel: '编码：',
    categoryLabel: '分类：',
    fileLabel: '文件：',
    templateAnalysis: '模板分析',
    structureValid: '结构有效',
    structureValidDesc: '模板结构组织正确',
    filesFound: '共找到 {count} 个文件',
    filesFoundDesc: '包含所需的模板文件',
    previous: '上一步',
    cancel: '取消',
    next: '下一步',
    uploadTemplate: '上传模板',
    information: '信息',
    uploadFile: '上传文件',
    review: '确认',
    fileSizeExceeded: '文件大小超过 200MB 限制，当前文件：{size}',
    supportedFormats: '支持格式：.zip、.tar、.tar.gz、.tgz、.tar.bz2、.tbz2、.tar.xz、.txz、.7z、.rar',
    bytes: '字节',
    unknownCategory: '未知分类',
  },
} as const

function t(key: keyof typeof TEMPLATE_UPLOAD_FORM_I18N.en, params?: Record<string, string | number>) {
  let message: string = TEMPLATE_UPLOAD_FORM_I18N[locale.value][key] || TEMPLATE_UPLOAD_FORM_I18N.en[key]
  if (!params) return message
  for (const [token, value] of Object.entries(params)) {
    message = message.replace(`{${token}}`, String(value))
  }
  return message
}

// Reactive data
const currentStep = ref(0)
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadError = ref('')
const inspectionResult = ref<any>(null)

const steps = computed(() => [
  { label: t('information') },
  { label: t('uploadFile') },
  { label: t('review') }
])

const formData = ref({
  name: '',
  code: '',
  categoryId: '',
  description: ''
})

// Computed properties
const uploadStatus = computed(() => uploadStore.uploadStatus)
const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return formData.value.name.trim() && 
           formData.value.code.trim() && 
           formData.value.categoryId
  }
  if (currentStep.value === 1) {
    return selectedFile.value && !uploadError.value
  }
  return true
})

const canSubmit = computed(() => {
  return formData.value.name.trim() && 
         formData.value.code.trim() && 
         formData.value.categoryId && 
         selectedFile.value && 
         !uploadError.value
})

// Methods
function nextStep() {
  if (canProceed.value) {
    if (currentStep.value === 1 && selectedFile.value) {
      inspectFile()
    }
        currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

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
    uploadError.value = t('fileSizeExceeded', { size: formatFileSize(file.size) })
    return
  }
  
  // File type validation
  if (!isSupportedArchive(file.name)) {
    uploadError.value = t('supportedFormats')
    return
  }
  
  selectedFile.value = file
  uploadError.value = ''
  
  // Auto-suggest template name and code from filename
  if (!formData.value.name.trim()) {
    const nameWithoutExt = stripArchiveExtension(file.name)
    formData.value.name = nameWithoutExt
  }
  
  if (!formData.value.code.trim()) {
    const codeWithoutExt = stripArchiveExtension(file.name).toLowerCase().replace(/[^a-z0-9]/g, '-')
    formData.value.code = codeWithoutExt
  }
}

function removeFile() {
  selectedFile.value = null
  uploadError.value = ''
  inspectionResult.value = null
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return `0 ${t('bytes')}`
  const k = 1024
  const sizes = [t('bytes'), 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function inspectFile() {
  if (!selectedFile.value) return
  
  try {
    await uploadStore.inspect(selectedFile.value, formData.value.name, formData.value.code)
    inspectionResult.value = uploadStore.inspection
    uploadError.value = ''
  } catch (error) {
    uploadError.value = String(error)
  }
}

async function submitUpload() {
  if (!canSubmit.value) return
  
  isUploading.value = true
  uploadError.value = ''
  
  try {
    const suggestedConfig = inspectionResult.value?.suggested_config || {
      display_name: formData.value.name,
      structure_overrides: { bucket_aliases: {}, view_aliases: {}, part_aliases: {} },
      compose_params: {},
      input_constraints: {},
      physical_dimensions_cm: { parts: {} },
    }
    suggestedConfig.physical_dimensions_cm = buildPhysicalDimensionsPayload({
      parts: hydrateUploadPhysicalDimensions({
        candidates: inspectionResult.value?.physical_dimensions_candidates,
        configured: (inspectionResult.value?.suggested_config?.physical_dimensions_cm?.parts || {}) as any,
      }),
    })
    await uploadStore.upload(
      selectedFile.value!,
      formData.value.name,
      formData.value.code,
      formData.value.categoryId,
      suggestedConfig
    )
    
    emit('success')
  } catch (error) {
    uploadError.value = String(error)
  } finally {
    isUploading.value = false
  }
}

function getCategoryName(categoryId: string): string {
  // Helper function to get category name from ID
  const findCategory = (categories: any[], id: string): any => {
    for (const category of categories) {
      if (category.category_id === id) return category
      if (category.children) {
        const found = findCategory(category.children, id)
        if (found) return found
      }
    }
    return null
  }
  
  const category = findCategory(props.categories, categoryId)
  return category?.name || t('unknownCategory')
}

// Watch for file changes
watch(selectedFile, (newFile) => {
  if (newFile && currentStep.value === 1) {
    inspectionResult.value = null
  }
})
</script>

<style scoped>
.upload-form {
  @apply space-y-6;
}

.upload-steps {
  @apply mb-8;
}

.step-indicator {
  @apply flex items-center justify-between;
}

.step {
  @apply flex items-center space-x-2;
}

.step-number {
  @apply w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-500 transition-all duration-200;
}

.step.active .step-number {
  @apply border-blue-600 bg-blue-600 text-white;
}

.step.completed .step-number {
  @apply border-green-600 bg-green-600 text-white;
}

.step-label {
  @apply text-sm font-medium text-gray-600;
}

.step.active .step-label {
  @apply text-blue-600;
}

.step.completed .step-label {
  @apply text-green-600;
}

.step-content {
  @apply bg-gray-50 rounded-lg p-6;
}

.step-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.form-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.form-group {
  @apply space-y-2;
}

.form-group.full {
  @apply md:col-span-2;
}

.form-label {
  @apply block text-sm font-medium text-gray-700;
}

.form-textarea {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.upload-area {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-all duration-200;
}

.upload-area:hover {
  @apply border-blue-400 bg-blue-50;
}

.upload-area.drag-over {
  @apply border-blue-600 bg-blue-100;
}

.upload-area.has-file {
  @apply border-green-600 bg-green-50;
}

.upload-area.error {
  @apply border-red-600 bg-red-50;
}

.upload-placeholder {
  @apply space-y-4;
}

.upload-icon {
  @apply mx-auto text-gray-400;
}

.upload-placeholder h4 {
  @apply text-lg font-medium text-gray-900;
}

.upload-placeholder p {
  @apply text-gray-600;
}

.file-info {
  @apply flex items-center justify-between;
}

.file-preview {
  @apply p-3 bg-white rounded-lg border border-gray-200;
}

.file-details h4 {
  @apply font-medium text-gray-900;
}

.file-details p {
  @apply text-sm text-gray-600;
}

.remove-file {
  @apply p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200;
}

.upload-progress {
  @apply space-y-4;
}

.progress-animation {
  @apply flex justify-center;
}

.spinner {
  @apply w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-2 overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-600 transition-all duration-300 ease-out;
}

.error-message {
  @apply flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg;
}

.review-section {
  @apply space-y-6;
}

.review-item {
  @apply bg-white p-6 rounded-lg border border-gray-200;
}

.review-item h4 {
  @apply font-semibold text-gray-900 mb-4;
}

.detail-grid {
  @apply space-y-3;
}

.detail-item {
  @apply flex justify-between py-2 border-b border-gray-100 last:border-0;
}

.detail-item .label {
  @apply font-medium text-gray-600;
}

.detail-item .value {
  @apply text-gray-900;
}

.analysis-grid {
  @apply space-y-4;
}

.analysis-item {
  @apply flex items-start space-x-3;
}

.analysis-icon {
  @apply p-2 rounded-lg flex-shrink-0;
}

.analysis-icon.success {
  @apply bg-green-100 text-green-600;
}

.analysis-icon.info {
  @apply bg-blue-100 text-blue-600;
}

.analysis-content h5 {
  @apply font-medium text-gray-900 mb-1;
}

.analysis-content p {
  @apply text-sm text-gray-600;
}

.step-actions {
  @apply flex items-center justify-between pt-6 border-t border-gray-200;
}

.action-spacer {
  @apply flex-1;
}
</style>
