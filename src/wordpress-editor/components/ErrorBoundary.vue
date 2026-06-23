<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    
    <div v-else class="error-container">
      <div class="error-icon">
        <AlertTriangle class="w-12 h-12" />
      </div>
      
      <div class="error-content">
        <h2 class="error-title">{{ errorTitle }}</h2>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div v-if="showDetails && errorDetails" class="error-details">
          <details>
            <summary class="error-details-toggle">{{ t('errorDetails') }}</summary>
            <pre class="error-details-content">{{ errorDetails }}</pre>
          </details>
        </div>
        
        <div class="error-actions">
          <Button variant="primary" @click="handleRetry">
            <RefreshCw class="w-4 h-4 mr-2" />
            {{ t('retry') }}
          </Button>
          <Button variant="outline" @click="handleReload">
            <RotateCcw class="w-4 h-4 mr-2" />
            {{ t('reloadPage') }}
          </Button>
          <Button variant="ghost" @click="handleReport">
            <Bug class="w-4 h-4 mr-2" />
            {{ t('copyErrorDetails') }}
          </Button>
        </div>
        <p v-if="reportNotice" class="report-notice">{{ reportNotice }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured } from 'vue'
import { storeToRefs } from 'pinia'
import Button from './ui/Button.vue'
import { AlertTriangle, RefreshCw, RotateCcw, Bug } from 'lucide-vue-next'
import { useUiLocaleStore } from '../stores/uiLocale'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  showDetails?: boolean
  onError?: (error: Error, errorInfo: any) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: 'Something went wrong',
  fallbackMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  showDetails: false
})
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const ERROR_BOUNDARY_I18N = {
  en: {
    defaultTitle: 'Something went wrong',
    defaultMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    errorDetails: 'Error Details',
    retry: 'Retry',
    reloadPage: 'Reload Page',
    copyErrorDetails: 'Copy Error Details',
    copiedNotice: 'Error details copied. Paste them into your issue report.',
    clipboardUnavailable: 'Clipboard access is unavailable in this browser.',
    titleLabel: 'Title',
    messageLabel: 'Message',
    detailsLabel: 'Details',
  },
  zh: {
    defaultTitle: '出现异常',
    defaultMessage: '发生了意外错误。请重试；如果问题持续存在，请联系支持团队。',
    errorDetails: '错误详情',
    retry: '重试',
    reloadPage: '重新加载页面',
    copyErrorDetails: '复制错误详情',
    copiedNotice: '错误详情已复制，可直接粘贴到问题反馈中。',
    clipboardUnavailable: '当前浏览器无法访问剪贴板。',
    titleLabel: '标题',
    messageLabel: '消息',
    detailsLabel: '详情',
  },
} as const

function t(key: keyof typeof ERROR_BOUNDARY_I18N.en) {
  return ERROR_BOUNDARY_I18N[locale.value][key] || ERROR_BOUNDARY_I18N.en[key]
}

// Reactive data
const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref<any>(null)
const reportNotice = ref('')

// Computed properties
const errorTitle = computed(() => {
  if (error.value?.name) {
    return `${error.value.name}: ${props.fallbackTitle || t('defaultTitle')}`
  }
  return props.fallbackTitle || t('defaultTitle')
})

const errorMessage = computed(() => {
  return error.value?.message || props.fallbackMessage || t('defaultMessage')
})

const errorDetails = computed(() => {
  if (!error.value) return null
  
  return {
    error: error.value.toString(),
    stack: error.value.stack,
    component: errorInfo.value?.componentName,
    props: errorInfo.value?.props,
    info: errorInfo.value
  }
})

// Methods
function handleError(err: Error, info: any) {
  hasError.value = true
  error.value = err
  errorInfo.value = info
  
  // Log error to console
  console.error('ErrorBoundary caught an error:', err, info)
  
  // Call custom error handler if provided
  if (props.onError) {
    props.onError(err, info)
  }
  
  // Report to error monitoring service
  reportError(err, info)
}

function handleRetry() {
  hasError.value = false
  error.value = null
  errorInfo.value = null
  reportNotice.value = ''
}

function handleReload() {
  window.location.reload()
}

async function handleReport() {
  const payload = [
    `${t('titleLabel')}: ${errorTitle.value}`,
    `${t('messageLabel')}: ${errorMessage.value}`,
    '',
    `${t('detailsLabel')}:`,
    JSON.stringify(errorDetails.value, null, 2),
  ].join('\n')

  try {
    await navigator.clipboard.writeText(payload)
    reportNotice.value = t('copiedNotice')
  } catch {
    reportNotice.value = t('clipboardUnavailable')
  }
}

function reportError(err: Error, info: any) {
  // Send error to monitoring service (e.g., Sentry, LogRocket, etc.)
  try {
    // Example: Sentry.captureException(err, { contexts: { vue: { componentInfo: info } } })
    console.log('Error reported to monitoring service')
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError)
  }
}

// Error capture
onErrorCaptured((err, instance, info) => {
  handleError(err, { instance, info })
  return false // Prevent the error from propagating further
})
</script>

<style scoped>
.error-boundary {
  @apply w-full;
}

.error-container {
  @apply flex flex-col items-center justify-center min-h-[400px] p-8 text-center;
}

.error-icon {
  @apply w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6;
}

.error-content {
  @apply max-w-md space-y-4;
}

.error-title {
  @apply text-2xl font-bold text-gray-900;
}

.error-message {
  @apply text-gray-600 leading-relaxed;
}

.error-details {
  @apply text-left;
}

.error-details-toggle {
  @apply cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 mb-2;
}

.error-details-content {
  @apply bg-gray-100 text-xs p-4 rounded-lg overflow-x-auto text-gray-800;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.error-actions {
  @apply flex flex-col sm:flex-row items-center justify-center gap-3 pt-4;
}

.report-notice {
  @apply text-sm font-medium text-slate-600;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-title {
    @apply text-gray-100;
  }
  
  .error-message {
    @apply text-gray-300;
  }
  
  .error-details-toggle {
    @apply text-blue-400 hover:text-blue-300;
  }
  
  .error-details-content {
    @apply bg-gray-800 text-gray-200;
  }

  .report-notice {
    @apply text-slate-300;
  }
}
</style>
