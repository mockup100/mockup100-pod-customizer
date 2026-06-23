<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            ref="modalRef"
            :class="modalClasses"
            @click.stop
          >
            <div v-if="$slots.header || closable" class="modal-header">
              <div v-if="$slots.header" class="modal-title">
                <slot name="header" />
              </div>
              <button
                v-if="closable"
                type="button"
                class="modal-close"
                @click="close"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div v-if="$slots.default" class="modal-body">
              <slot />
            </div>
            
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  isOpen: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  centered?: boolean
  scrollable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
  closeOnEscape: true,
  centered: true,
  scrollable: true
})

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const modalRef = ref<HTMLElement>()

const modalClasses = computed(() => {
  const base = 'modal-content bg-white rounded-lg shadow-xl max-h-full flex flex-col'
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4'
  }
  
  const positions = props.centered ? 'items-center justify-center' : 'items-start justify-start pt-16'
  
  return [base, sizes[props.size]]
})

function close() {
  emit('update:isOpen', false)
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close()
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen && props.closeOnEscape) {
    close()
  }
}

// Handle escape key
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})

// Focus management
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      // Focus first focusable element
      const focusableElements = modalRef.value?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    })
  }
})
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50;
}

.modal-content {
  @apply w-full relative;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.modal-title {
  @apply text-lg font-semibold text-gray-900;
}

.modal-close {
  @apply text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100;
}

.modal-body {
  @apply flex-1 p-6 overflow-y-auto;
}

.modal-footer {
  @apply p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg;
}

/* Size adjustments */
.modal-content.max-w-full {
  @apply h-full;
}

/* Scrollbar styling */
.modal-body::-webkit-scrollbar {
  @apply w-2;
}

.modal-body::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

.modal-body::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
</style>
