<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 transform translate-y-2"
    enter-to-class="opacity-100 transform translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 transform translate-y-0"
    leave-to-class="opacity-0 transform translate-y-2"
  >
    <div v-if="visible" :class="toastClasses">
      <div class="toast-icon">
        <component :is="iconComponent" class="w-5 h-5" />
      </div>
      
      <div class="toast-content">
        <h4 v-if="props.toast.title" class="toast-title">{{ props.toast.title }}</h4>
        <p class="toast-message">{{ props.toast.message }}</p>
      </div>
      
      <div class="toast-actions">
        <button
          v-if="props.toast.action"
          @click="handleAction"
          class="toast-action"
        >
          {{ props.toast.action?.label }}
        </button>
        <button
          @click="close"
          class="toast-close"
          :aria-label="closeLabel"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      
      <div
        v-if="props.toast.showProgress"
        class="toast-progress"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useUiLocaleStore } from '../stores/uiLocale'

export interface ToastAction {
  label: string
  handler: () => void
}

export interface ToastOptions {
  id?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  action?: ToastAction
  showProgress?: boolean
}

interface Props {
  toast: ToastOptions
  onClose: (id: string) => void
}

const props = defineProps<Props>()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

// Reactive data
const visible = ref(false)
const progress = ref(100)
let timeoutId: number | null = null
let progressIntervalId: number | null = null

// Computed properties
const toastClasses = computed(() => {
  const classes = [
    'toast',
    `toast-${props.toast.type || 'info'}`
  ]
  
  if (props.toast.persistent) {
    classes.push('toast-persistent')
  }
  
  return classes
})

const iconComponent = computed(() => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }
  
  return icons[props.toast.type || 'info']
})
const closeLabel = computed(() => (locale.value === 'zh' ? '关闭通知' : 'Close notification'))

// Methods
function close() {
  visible.value = false
  clearTimers()
  setTimeout(() => {
    props.onClose(props.toast.id || '')
  }, 200)
}

function handleAction() {
  if (props.toast.action) {
    props.toast.action.handler()
  }
  close()
}

function clearTimers() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  if (progressIntervalId) {
    clearInterval(progressIntervalId)
    progressIntervalId = null
  }
}

function startTimer() {
  if (props.toast.persistent || !props.toast.duration) return
  
  const duration = props.toast.duration
  
  // Auto close timer
  timeoutId = window.setTimeout(() => {
    close()
  }, duration)
  
  // Progress bar animation
  if (props.toast.showProgress) {
    progress.value = 100
    const interval = 50 // Update every 50ms
    const steps = duration / interval
    const decrement = 100 / steps
    
    progressIntervalId = window.setInterval(() => {
      progress.value = Math.max(0, progress.value - decrement)
    }, interval)
  }
}

// Lifecycle
onMounted(() => {
  // Trigger entrance animation
  visible.value = true
  startTimer()
})

onUnmounted(() => {
  clearTimers()
})
</script>

<style scoped>
.toast {
  @apply flex items-start space-x-3 p-4 rounded-lg shadow-lg border max-w-md;
  @apply bg-white border-gray-200;
}

.toast-success {
  @apply border-green-200;
}

.toast-success .toast-icon {
  @apply text-green-600;
}

.toast-error {
  @apply border-red-200;
}

.toast-error .toast-icon {
  @apply text-red-600;
}

.toast-warning {
  @apply border-yellow-200;
}

.toast-warning .toast-icon {
  @apply text-yellow-600;
}

.toast-info {
  @apply border-blue-200;
}

.toast-info .toast-icon {
  @apply text-blue-600;
}

.toast-icon {
  @apply flex-shrink-0 mt-0.5;
}

.toast-content {
  @apply flex-1 min-w-0;
}

.toast-title {
  @apply text-sm font-semibold text-gray-900 mb-1;
}

.toast-message {
  @apply text-sm text-gray-600 break-words;
}

.toast-actions {
  @apply flex items-center space-x-2 flex-shrink-0 ml-4;
}

.toast-action {
  @apply text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200;
  @apply border-none bg-transparent cursor-pointer;
}

.toast-close {
  @apply p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200;
  @apply border-none bg-transparent cursor-pointer rounded;
}

.toast-progress {
  @apply absolute bottom-0 left-0 h-1 bg-blue-600 rounded-b-lg transition-all duration-100;
}

.toast-persistent .toast-progress {
  @apply hidden;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .toast {
    @apply bg-gray-800 border-gray-700;
  }
  
  .toast-title {
    @apply text-gray-100;
  }
  
  .toast-message {
    @apply text-gray-300;
  }
  
  .toast-close {
    @apply text-gray-500 hover:text-gray-300;
  }
}
</style>
