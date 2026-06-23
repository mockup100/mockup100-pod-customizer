<template>
  <div :class="containerClasses">
    <div class="spinner-container">
      <div class="spinner" :style="spinnerStyles">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
    </div>
    
    <div v-if="showText" class="loading-text">
      <span>{{ text }}</span>
      <div class="loading-dots">
        <span class="dot">.</span>
        <span class="dot">.</span>
        <span class="dot">.</span>
      </div>
    </div>
    
    <div v-if="showProgress" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  text?: string
  showText?: boolean
  progress?: number
  showProgress?: boolean
  centered?: boolean
  fullScreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
  showText: false,
  progress: 0,
  showProgress: false,
  centered: true,
  fullScreen: false
})

const containerClasses = computed(() => {
  const classes = ['loading-spinner']
  
  if (props.centered) classes.push('centered')
  if (props.fullScreen) classes.push('fullscreen')
  if (props.showText || props.showProgress) classes.push('with-text')
  
  return classes
})

const spinnerStyles = computed(() => {
  const sizes = {
    sm: { width: '20px', height: '20px' },
    md: { width: '32px', height: '32px' },
    lg: { width: '48px', height: '48px' },
    xl: { width: '64px', height: '64px' }
  }
  
  return sizes[props.size]
})
</script>

<style scoped>
.loading-spinner {
  @apply flex flex-col items-center;
}

.loading-spinner.centered {
  @apply justify-center min-h-[200px];
}

.loading-spinner.fullscreen {
  @apply fixed inset-0 bg-white bg-opacity-90 z-50;
}

.loading-spinner.with-text {
  @apply space-y-4;
}

.spinner-container {
  @apply relative;
}

.spinner {
  @apply relative;
  animation: spin 1.2s linear infinite;
}

.spinner-ring {
  @apply absolute border-4 border-transparent rounded-full;
  border-top-color: currentColor;
  animation: spin-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  @apply inset-0;
  animation-delay: -0.45s;
}

.spinner-ring:nth-child(2) {
  @apply inset-2;
  animation-delay: -0.3s;
}

.spinner-ring:nth-child(3) {
  @apply inset-4;
  animation-delay: -0.15s;
}

.spinner-ring:nth-child(4) {
  @apply inset-6;
  animation-delay: 0s;
}

/* Color variants */
.loading-spinner:has(.spinner-ring) {
  @apply text-blue-600;
}

.loading-spinner[color="secondary"]:has(.spinner-ring) {
  @apply text-gray-600;
}

.loading-spinner[color="white"]:has(.spinner-ring) {
  @apply text-white;
}

.loading-spinner[color="gray"]:has(.spinner-ring) {
  @apply text-gray-400;
}

.loading-text {
  @apply flex items-center text-sm font-medium text-gray-600;
}

.loading-dots {
  @apply flex ml-1;
}

.dot {
  @apply animate-pulse;
  animation-delay: calc(var(--i) * 0.2s);
}

.dot:nth-child(1) {
  --i: 0;
}

.dot:nth-child(2) {
  --i: 1;
}

.dot:nth-child(3) {
  --i: 2;
}

.progress-container {
  @apply flex items-center space-x-3 w-full max-w-xs;
}

.progress-bar {
  @apply flex-1 bg-gray-200 rounded-full h-2 overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-600 rounded-full transition-all duration-300 ease-out;
}

.progress-text {
  @apply text-sm font-medium text-gray-600 min-w-[3rem] text-right;
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .loading-spinner.fullscreen {
    @apply bg-gray-900 bg-opacity-90;
  }
  
  .loading-text {
    @apply text-gray-300;
  }
  
  .progress-bar {
    @apply bg-gray-700;
  }
  
  .progress-text {
    @apply text-gray-300;
  }
}
</style>
