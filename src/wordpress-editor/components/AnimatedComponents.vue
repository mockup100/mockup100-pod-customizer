<template>
  <div class="animated-components">
    <!-- Floating Action Button -->
    <div class="fab-container">
      <Transition name="fab-bounce">
        <button
          v-show="showFab"
          class="fab"
          @click="toggleFabMenu"
        >
          <Plus class="w-6 h-6" />
        </button>
      </Transition>
      
      <Transition name="fab-menu">
        <div v-show="fabMenuOpen" class="fab-menu">
          <button
            v-for="action in fabActions"
            :key="action.label"
            class="fab-item"
            :class="action.variant"
            @click="action.handler"
          >
            <component :is="action.icon" class="w-5 h-5" />
            <span class="fab-tooltip">{{ action.label }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Progress Indicators -->
    <div class="progress-showcase">
      <div class="progress-item">
        <div class="progress-header">
          <span>Upload Progress</span>
          <span class="progress-percentage">{{ uploadProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          <div class="progress-glow"></div>
        </div>
      </div>
      
      <div class="progress-item">
        <div class="progress-header">
          <span>Rendering Progress</span>
          <span class="progress-percentage">{{ renderProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill accent" :style="{ width: renderProgress + '%' }"></div>
          <div class="progress-glow accent"></div>
        </div>
      </div>
    </div>

    <!-- Animated Cards -->
    <div class="cards-showcase">
      <div
        v-for="(card, index) in animatedCards"
        :key="card.id"
        class="animated-card"
        :class="card.variant"
        :style="{ animationDelay: index * 100 + 'ms' }"
        @mouseenter="card.hover = true"
        @mouseleave="card.hover = false"
      >
        <div class="card-content">
          <div class="card-icon">
            <component :is="card.icon" class="w-8 h-8" />
          </div>
          <div class="card-info">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </div>
          <div class="card-arrow">
            <ArrowRight class="w-5 h-5" />
          </div>
        </div>
        <div class="card-glow"></div>
        <div class="card-particles">
          <span v-for="i in 6" :key="i" class="particle"></span>
        </div>
      </div>
    </div>

    <!-- Interactive Elements -->
    <div class="interactive-showcase">
      <!-- Morphing Button -->
      <button
        class="morph-button"
        :class="{ active: morphActive }"
        @click="toggleMorph"
      >
        <span class="morph-text">{{ morphActive ? 'Active' : 'Click Me' }}</span>
        <div class="morph-bg"></div>
      </button>

      <!-- Ripple Effect Button -->
      <button
        class="ripple-button"
        @click="createRipple"
      >
        <span>Ripple Effect</span>
        <div
          v-for="ripple in ripples"
          :key="ripple.id"
          class="ripple"
          :style="ripple.style"
        ></div>
      </button>

      <!-- Magnetic Button -->
      <button
        class="magnetic-button"
        @mousemove="handleMagneticMove"
        @mouseleave="handleMagneticLeave"
      >
        <span>Magnetic</span>
        <div class="magnetic-bg" :style="magneticStyle"></div>
      </button>
    </div>

    <!-- Loading Animations -->
    <div class="loading-showcase">
      <div class="loading-item">
        <div class="spinner-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <span>Dots Loader</span>
      </div>
      
      <div class="loading-item">
        <div class="spinner-pulse">
          <div class="pulse-ring"></div>
          <div class="pulse-ring"></div>
          <div class="pulse-ring"></div>
        </div>
        <span>Pulse Loader</span>
      </div>
      
      <div class="loading-item">
        <div class="spinner-wave">
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
        </div>
        <span>Wave Loader</span>
      </div>
    </div>

    <!-- Notification Toast -->
    <Transition name="toast-slide">
      <div v-if="showToast" class="notification-toast" :class="toastVariant">
        <div class="toast-icon">
          <component :is="toastIcon" class="w-5 h-5" />
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toastTitle }}</div>
          <div class="toast-message">{{ toastMessage }}</div>
        </div>
        <button class="toast-close" @click="hideToast">
          <X class="w-4 h-4" />
        </button>
        <div class="toast-progress" :style="{ width: toastProgress + '%' }"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Plus,
  Upload,
  Image,
  Palette,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  Settings
} from 'lucide-vue-next'

// Reactive data
const showFab = ref(false)
const fabMenuOpen = ref(false)
const uploadProgress = ref(0)
const renderProgress = ref(0)
const morphActive = ref(false)
const ripples = ref<Array<{ id: number; style: Record<string, string> }>>([])
const magneticStyle = ref<Record<string, string>>({})
const showToast = ref(false)
const toastVariant = ref('success')
const toastTitle = ref('')
const toastMessage = ref('')
const toastProgress = ref(100)

const fabActions = [
  { label: 'Upload', icon: Upload, variant: 'primary', handler: () => handleFabAction('upload') },
  { label: 'Create', icon: Palette, variant: 'secondary', handler: () => handleFabAction('create') },
  { label: 'Render', icon: Image, variant: 'accent', handler: () => handleFabAction('render') },
  { label: 'Quick', icon: Zap, variant: 'warning', handler: () => handleFabAction('quick') }
]

const animatedCards = ref([
  {
    id: 1,
    title: 'Smart Templates',
    description: 'AI-powered template generation',
    icon: FileText,
    variant: 'primary',
    hover: false
  },
  {
    id: 2,
    title: 'Real-time Rendering',
    description: 'Instant preview and export',
    icon: Image,
    variant: 'secondary',
    hover: false
  },
  {
    id: 3,
    title: 'Advanced Settings',
    description: 'Customize every detail',
    icon: Settings,
    variant: 'accent',
    hover: false
  }
])

// Computed properties
const toastIcon = computed(() => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: AlertCircle
  }
  return icons[toastVariant.value as keyof typeof icons] || CheckCircle
})

// Methods
function toggleFabMenu() {
  fabMenuOpen.value = !fabMenuOpen.value
}

function handleFabAction(action: string) {
  fabMenuOpen.value = false
  showNotification('success', 'Action Triggered', `${action} action initiated`)
}

function toggleMorph() {
  morphActive.value = !morphActive.value
}

function createRipple(event: MouseEvent) {
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const ripple = {
    id: Date.now(),
    style: {
      left: x + 'px',
      top: y + 'px'
    }
  }
  
  ripples.value.push(ripple)
  
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== ripple.id)
  }, 600)
}

function handleMagneticMove(event: MouseEvent) {
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2
  
  magneticStyle.value = {
    transform: `translate(${x * 0.3}px, ${y * 0.3}px)`
  }
}

function handleMagneticLeave() {
  magneticStyle.value = {
    transform: 'translate(0, 0)'
  }
}

function showNotification(variant: string, title: string, message: string) {
  toastVariant.value = variant
  toastTitle.value = title
  toastMessage.value = message
  toastProgress.value = 100
  showToast.value = true
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    hideToast()
  }, 3000)
}

function hideToast() {
  showToast.value = false
}

// Simulate progress updates
function simulateProgress() {
  const uploadInterval = setInterval(() => {
    if (uploadProgress.value < 100) {
      uploadProgress.value += Math.random() * 10
      if (uploadProgress.value > 100) uploadProgress.value = 100
    } else {
      uploadProgress.value = 0
    }
  }, 2000)
  
  const renderInterval = setInterval(() => {
    if (renderProgress.value < 100) {
      renderProgress.value += Math.random() * 15
      if (renderProgress.value > 100) renderProgress.value = 100
    } else {
      renderProgress.value = 0
    }
  }, 1500)
  
  return () => {
    clearInterval(uploadInterval)
    clearInterval(renderInterval)
  }
}

// Lifecycle
onMounted(() => {
  // Show FAB after scroll
  const handleScroll = () => {
    showFab.value = window.scrollY > 200
  }
  
  window.addEventListener('scroll', handleScroll)
  
  // Start progress simulation
  const cleanupProgress = simulateProgress()
  
  // Toast progress animation
  const toastInterval = setInterval(() => {
    if (showToast.value && toastProgress.value > 0) {
      toastProgress.value -= 2
    }
  }, 50)
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    cleanupProgress()
    clearInterval(toastInterval)
  })
})
</script>

<style scoped>
.animated-components {
  @apply p-8 space-y-12 max-w-6xl mx-auto;
}

/* FAB Styles */
.fab-container {
  @apply fixed bottom-8 right-8 z-50;
}

.fab {
  @apply w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center;
  @apply hover:scale-110 active:scale-95;
}

.fab-menu {
  @apply absolute bottom-16 right-0 space-y-3;
}

.fab-item {
  @apply relative w-12 h-12 rounded-full flex items-center justify-center text-white transition-all duration-300;
  @apply hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl;
}

.fab-item.primary {
  @apply bg-blue-600;
}

.fab-item.secondary {
  @apply bg-green-600;
}

.fab-item.accent {
  @apply bg-purple-600;
}

.fab-item.warning {
  @apply bg-yellow-600;
}

.fab-tooltip {
  @apply absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-200;
}

.fab-item:hover .fab-tooltip {
  @apply opacity-100;
}

/* Progress Styles */
.progress-showcase {
  @apply space-y-4;
}

.progress-item {
  @apply bg-white rounded-lg p-4 shadow-sm;
}

.progress-header {
  @apply flex justify-between items-center mb-2;
}

.progress-percentage {
  @apply text-sm font-medium text-blue-600;
}

.progress-bar {
  @apply relative h-2 bg-gray-200 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-600 rounded-full transition-all duration-500 ease-out;
}

.progress-fill.accent {
  @apply bg-purple-600;
}

.progress-glow {
  @apply absolute inset-0 bg-blue-400 opacity-20 blur-sm;
}

.progress-glow.accent {
  @apply bg-purple-400;
}

/* Animated Cards */
.cards-showcase {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}

.animated-card {
  @apply relative bg-white rounded-xl p-6 shadow-lg cursor-pointer overflow-hidden;
  @apply transition-all duration-300 hover:shadow-xl hover:scale-105;
  animation: cardSlideIn 0.6s ease-out forwards;
  opacity: 0;
}

.animated-card.primary {
  @apply border-2 border-blue-100;
}

.animated-card.secondary {
  @apply border-2 border-green-100;
}

.animated-card.accent {
  @apply border-2 border-purple-100;
}

.card-content {
  @apply relative z-10 flex items-center space-x-4;
}

.card-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center;
}

.animated-card.primary .card-icon {
  @apply bg-blue-100 text-blue-600;
}

.animated-card.secondary .card-icon {
  @apply bg-green-100 text-green-600;
}

.animated-card.accent .card-icon {
  @apply bg-purple-100 text-purple-600;
}

.card-info {
  @apply flex-1;
}

.card-info h3 {
  @apply font-semibold text-gray-900 mb-1;
}

.card-info p {
  @apply text-sm text-gray-600;
}

.card-arrow {
  @apply text-gray-400 transition-colors duration-300;
}

.animated-card:hover .card-arrow {
  @apply text-blue-600;
}

.card-glow {
  @apply absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300;
}

.animated-card.primary .card-glow {
  @apply bg-blue-400 blur-md;
}

.animated-card.secondary .card-glow {
  @apply bg-green-400 blur-md;
}

.animated-card.accent .card-glow {
  @apply bg-purple-400 blur-md;
}

.animated-card:hover .card-glow {
  @apply opacity-20;
}

.card-particles {
  @apply absolute inset-0 pointer-events-none;
}

.particle {
  @apply absolute w-1 h-1 bg-blue-400 rounded-full opacity-0;
  animation: particleFloat 3s ease-in-out infinite;
}

.particle:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
.particle:nth-child(2) { top: 50%; left: 80%; animation-delay: 0.5s; }
.particle:nth-child(3) { top: 80%; left: 20%; animation-delay: 1s; }
.particle:nth-child(4) { top: 30%; left: 70%; animation-delay: 1.5s; }
.particle:nth-child(5) { top: 70%; left: 60%; animation-delay: 2s; }
.particle:nth-child(6) { top: 10%; left: 40%; animation-delay: 2.5s; }

.animated-card:hover .particle {
  @apply opacity-60;
}

/* Interactive Elements */
.interactive-showcase {
  @apply flex flex-wrap gap-4 items-center;
}

.morph-button {
  @apply relative px-6 py-3 bg-blue-600 text-white rounded-lg overflow-hidden transition-all duration-300;
  @apply hover:shadow-lg active:scale-95;
}

.morph-button.active {
  @apply bg-green-600;
}

.morph-text {
  @apply relative z-10;
}

.morph-bg {
  @apply absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500;
}

.morph-button.active .morph-bg {
  @apply from-green-600 to-teal-600;
}

.ripple-button {
  @apply relative px-6 py-3 bg-purple-600 text-white rounded-lg overflow-hidden transition-all duration-300;
  @apply hover:shadow-lg active:scale-95;
}

.ripple {
  @apply absolute bg-white rounded-full opacity-30 pointer-events-none;
  animation: rippleEffect 0.6s ease-out;
}

.magnetic-button {
  @apply relative px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg overflow-hidden transition-all duration-300;
  @apply hover:shadow-lg active:scale-95;
}

.magnetic-bg {
  @apply absolute inset-0 bg-gradient-to-r from-pink-600 to-orange-600 transition-transform duration-200;
}

/* Loading Animations */
.loading-showcase {
  @apply flex flex-wrap gap-8 items-center;
}

.loading-item {
  @apply flex flex-col items-center space-y-3;
}

.spinner-dots {
  @apply flex space-x-1;
}

.spinner-dots .dot {
  @apply w-3 h-3 bg-blue-600 rounded-full;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.spinner-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.spinner-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

.spinner-pulse {
  @apply relative w-12 h-12;
}

.pulse-ring {
  @apply absolute inset-0 border-4 border-blue-600 rounded-full;
  animation: pulseRing 2s ease-out infinite;
}

.pulse-ring:nth-child(2) {
  animation-delay: 0.5s;
}

.pulse-ring:nth-child(3) {
  animation-delay: 1s;
}

.spinner-wave {
  @apply flex space-x-1;
}

.wave-bar {
  @apply w-1 h-8 bg-blue-600 rounded-full;
  animation: waveBar 1.2s ease-in-out infinite;
}

.wave-bar:nth-child(2) { animation-delay: 0.1s; }
.wave-bar:nth-child(3) { animation-delay: 0.2s; }
.wave-bar:nth-child(4) { animation-delay: 0.3s; }
.wave-bar:nth-child(5) { animation-delay: 0.4s; }

/* Toast Notification */
.notification-toast {
  @apply fixed top-4 right-4 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden;
  @apply flex items-start space-x-3 p-4 z-50;
}

.notification-toast.success {
  @apply border-l-4 border-l-green-500;
}

.notification-toast.error {
  @apply border-l-4 border-l-red-500;
}

.notification-toast.warning {
  @apply border-l-4 border-l-yellow-500;
}

.notification-toast.info {
  @apply border-l-4 border-l-blue-500;
}

.toast-icon {
  @apply flex-shrink-0 mt-0.5;
}

.notification-toast.success .toast-icon {
  @apply text-green-600;
}

.notification-toast.error .toast-icon {
  @apply text-red-600;
}

.notification-toast.warning .toast-icon {
  @apply text-yellow-600;
}

.notification-toast.info .toast-icon {
  @apply text-blue-600;
}

.toast-content {
  @apply flex-1 min-w-0;
}

.toast-title {
  @apply font-semibold text-gray-900 text-sm;
}

.toast-message {
  @apply text-gray-600 text-sm mt-1;
}

.toast-close {
  @apply flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200;
}

.toast-progress {
  @apply absolute bottom-0 left-0 h-1 bg-blue-600 transition-all duration-100;
}

.notification-toast.success .toast-progress {
  @apply bg-green-600;
}

.notification-toast.error .toast-progress {
  @apply bg-red-600;
}

.notification-toast.warning .toast-progress {
  @apply bg-yellow-600;
}

/* Animations */
@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes particleFloat {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 1;
  }
}

@keyframes rippleEffect {
  from {
    width: 0;
    height: 0;
    opacity: 0.3;
  }
  to {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

@keyframes dotPulse {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  30% {
    transform: scale(1.3);
    opacity: 0.5;
  }
}

@keyframes pulseRing {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

@keyframes waveBar {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* Transitions */
.fab-bounce-enter-active,
.fab-bounce-leave-active {
  transition: all 0.3s ease;
}

.fab-bounce-enter-from {
  opacity: 0;
  transform: scale(0);
}

.fab-bounce-leave-to {
  opacity: 0;
  transform: scale(0);
}

.fab-menu-enter-active,
.fab-menu-leave-active {
  transition: all 0.3s ease;
}

.fab-menu-enter-from .fab-item,
.fab-menu-leave-to .fab-item {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.fab-menu-enter-active .fab-item {
  transition: all 0.3s ease;
}

.fab-menu-enter-active .fab-item:nth-child(1) { transition-delay: 0ms; }
.fab-menu-enter-active .fab-item:nth-child(2) { transition-delay: 50ms; }
.fab-menu-enter-active .fab-item:nth-child(3) { transition-delay: 100ms; }
.fab-menu-enter-active .fab-item:nth-child(4) { transition-delay: 150ms; }

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
