<template>
  <div v-if="showWarning" class="verification-notice">
    <div class="notice-content">
      <div class="notice-icon">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div class="notice-text">
        <span class="notice-title">{{ t('emailNotVerified') }}</span>
        <span class="notice-description">{{ t('checkInbox') }}</span>
      </div>
      <div class="notice-actions">
        <button 
          @click="resendVerification" 
          :disabled="isResending"
          class="resend-link"
        >
          {{ isResending ? t('sending') : t('resend') }}
        </button>
        <button @click="dismissWarning" class="dismiss-link">
          {{ t('dismiss') }}
        </button>
      </div>
    </div>
    
    <!-- Success/Error Message -->
    <div v-if="resendMessage" class="notice-message" :class="resendMessage.type">
      {{ resendMessage.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useUiLocaleStore } from '../stores/uiLocale'

const authStore = useAuthStore()
const { account, verificationWarning } = storeToRefs(authStore)
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const VERIFICATION_WARNING_I18N = {
  en: {
    emailNotVerified: 'Email not verified',
    checkInbox: 'Check your inbox for the verification link',
    sending: 'Sending...',
    resend: 'Resend',
    dismiss: 'Dismiss',
    sentSuccess: 'Verification email sent successfully!',
    sentFailed: 'Failed to send verification email. Please try again later.',
  },
  zh: {
    emailNotVerified: '邮箱未验证',
    checkInbox: '请检查收件箱中的验证链接',
    sending: '发送中...',
    resend: '重新发送',
    dismiss: '关闭',
    sentSuccess: '验证邮件发送成功！',
    sentFailed: '验证邮件发送失败，请稍后重试。',
  },
} as const

function t(key: keyof typeof VERIFICATION_WARNING_I18N.en) {
  return VERIFICATION_WARNING_I18N[locale.value][key] || VERIFICATION_WARNING_I18N.en[key]
}

// State
const showWarning = ref(false)
const isResending = ref(false)
const resendMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

// Methods
const dismissWarning = () => {
  showWarning.value = false
  // Store dismissal preference in localStorage
  localStorage.setItem('verification_warning_dismissed', 'true')
}

const resendVerification = async () => {
  isResending.value = true
  resendMessage.value = null
  
  try {
    await authStore.sendVerificationEmail()
    resendMessage.value = {
      type: 'success',
      text: t('sentSuccess')
    }
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      resendMessage.value = null
    }, 5000)
  } catch (error) {
    console.error('Failed to resend verification:', error)
    resendMessage.value = {
      type: 'error',
      text: t('sentFailed')
    }
    
    // Auto-hide error message after 5 seconds
    setTimeout(() => {
      resendMessage.value = null
    }, 5000)
  } finally {
    isResending.value = false
  }
}

// Check if warning should be shown
const shouldShowWarning = () => {
  // Don't show if user has dismissed it before
  if (localStorage.getItem('verification_warning_dismissed') === 'true') {
    return false
  }
  
  // Show if verification warning is active in store
  return verificationWarning.value
}

// Lifecycle
onMounted(() => {
  // Check if warning should be shown
  if (shouldShowWarning()) {
    // Add a small delay to ensure page is loaded
    setTimeout(() => {
      showWarning.value = true
    }, 1000)
  }
})

// Watch for verification warning changes
watch(verificationWarning, (newValue) => {
  if (newValue && !localStorage.getItem('verification_warning_dismissed')) {
    showWarning.value = true
  } else {
    showWarning.value = false
  }
})
</script>

<style scoped>
.verification-notice {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notice-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.2);
}

.notice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #fef3c7;
  color: #f59e0b;
  border-radius: 50%;
  flex-shrink: 0;
}

.notice-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.notice-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.notice-description {
  color: #6b7280;
  font-size: 0.75rem;
}

.notice-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.resend-link, .dismiss-link {
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.resend-link {
  color: #f59e0b;
}

.resend-link:hover:not(:disabled) {
  background: #fef3c7;
}

.resend-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dismiss-link {
  color: #6b7280;
}

.dismiss-link:hover {
  background: #f3f4f6;
  color: #374151;
}

.notice-message {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  animation: slideInRight 0.3s ease-out;
}

.notice-message.success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.notice-message.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Responsive Design */
@media (max-width: 640px) {
  .verification-notice {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .notice-content {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .notice-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
