import { ref, reactive } from 'vue'

export interface ToastOptions {
  id?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    handler: () => void
  }
  showProgress?: boolean
}

interface Toast extends ToastOptions {
  id: string
  timestamp: number
}

const toasts = ref<Toast[]>([])
const toastIdCounter = ref(0)

export function useToast() {
  const showToast = (options: ToastOptions): string => {
    const id = options.id || `toast-${toastIdCounter.value++}`
    const toast: Toast = {
      ...options,
      id,
      timestamp: Date.now(),
      duration: options.duration ?? 5000,
      showProgress: options.showProgress ?? true
    }
    
    toasts.value.push(toast)
    
    // Auto remove non-persistent toasts after duration
    if (!toast.persistent && toast.duration) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }
    
    return id
  }
  
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const clearAllToasts = () => {
    toasts.value = []
  }
  
  // Convenience methods
  const success = (message: string, title?: string, options?: Partial<ToastOptions>) => {
    return showToast({ ...options, type: 'success', message, title })
  }
  
  const error = (message: string, title?: string, options?: Partial<ToastOptions>) => {
    return showToast({ 
      ...options, 
      type: 'error', 
      message, 
      title,
      duration: 8000, // Errors stay longer
      persistent: options?.persistent ?? false
    })
  }
  
  const warning = (message: string, title?: string, options?: Partial<ToastOptions>) => {
    return showToast({ ...options, type: 'warning', message, title })
  }
  
  const info = (message: string, title?: string, options?: Partial<ToastOptions>) => {
    return showToast({ ...options, type: 'info', message, title })
  }
  
  const persistent = (message: string, title?: string, options?: Partial<ToastOptions>) => {
    return showToast({ 
      ...options, 
      type: 'info', 
      message, 
      title,
      persistent: true,
      showProgress: false
    })
  }
  
  return {
    toasts: toasts.value,
    showToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    persistent
  }
}

// Global toast composable for easy access across the app
export const globalToast = useToast()
