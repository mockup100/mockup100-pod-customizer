<template>
  <div v-if="isOpen" class="purchase-modal-overlay" @click.self="closeModal">
    <div class="purchase-modal">
      <div class="modal-header">
        <h3>{{ modalTitle }}</h3>
        <button type="button" class="close-btn" @click="closeModal">{{ t('close') }}</button>
      </div>

      <div class="modal-body">
        <div class="purchase-summary-card">
          <strong>{{ summaryTitle }}</strong>
          <p>{{ summaryText }}</p>
        </div>

        <div class="purchase-points">
          <div class="purchase-point">
            <strong>{{ t('freeTokensTitle') }}</strong>
            <span>{{ t('freeTokensDesc') }}</span>
          </div>
          <div class="purchase-point">
            <strong>{{ t('consoleFreeTitle') }}</strong>
            <span>{{ t('consoleFreeDesc') }}</span>
          </div>
          <div class="purchase-point">
            <strong>{{ t('paypalTitle') }}</strong>
            <span>{{ t('paypalDesc') }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn secondary" @click="closeModal">{{ t('cancel') }}</button>
        <button type="button" class="btn primary" @click="openPurchaseWorkspace">
          {{ primaryButtonLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useUiLocaleStore } from '../stores/uiLocale'

interface Props {
  isOpen: boolean
  title?: string
  summaryTitle?: string
  summaryText?: string
  primaryLabel?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'success', result?: { redirected: true }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const TOKEN_PURCHASE_MODAL_I18N = {
  en: {
    close: 'Close',
    cancel: 'Cancel',
    purchaseTokens: 'Purchase Tokens',
    summaryTitle: 'Buy tokens in Tokens Management',
    summaryText: 'Token purchases now use the unified PayPal checkout workspace.',
    openTokensManagement: 'Open Tokens Management',
    signUp: 'Sign Up',
    freeTokensTitle: '500 free tokens',
    freeTokensDesc: 'Granted after signup and verification.',
    consoleFreeTitle: 'Console 512 free',
    consoleFreeDesc: 'Only larger Console outputs and all API outputs use tokens.',
    paypalTitle: 'PayPal checkout',
    paypalDesc: 'Tokens are credited after settlement.',
  },
  zh: {
    close: '关闭',
    cancel: '取消',
    purchaseTokens: '购买 Tokens',
    summaryTitle: '在 Tokens 管理中购买',
    summaryText: 'Token 购买现在统一通过 PayPal 结算工作区完成。',
    openTokensManagement: '打开 Tokens 管理',
    signUp: '注册',
    freeTokensTitle: '500 个免费 Tokens',
    freeTokensDesc: '注册并完成验证后发放。',
    consoleFreeTitle: 'Console 512 免费',
    consoleFreeDesc: '只有更大的 Console 输出和全部 API 输出才会消耗 Tokens。',
    paypalTitle: 'PayPal 结算',
    paypalDesc: '结算完成后会自动入账 Tokens。',
  },
} as const

function t(key: keyof typeof TOKEN_PURCHASE_MODAL_I18N.en) {
  return TOKEN_PURCHASE_MODAL_I18N[locale.value][key] || TOKEN_PURCHASE_MODAL_I18N.en[key]
}

const modalTitle = computed(() => props.title || t('purchaseTokens'))
const summaryTitle = computed(() => props.summaryTitle || t('summaryTitle'))
const summaryText = computed(() => props.summaryText || t('summaryText'))
const primaryButtonLabel = computed(() => (
  props.primaryLabel || (authStore.isAuthenticated ? t('openTokensManagement') : t('signUp'))
))

function closeModal() {
  if (props.isOpen) {
    emit('close')
  }
}

async function openPurchaseWorkspace() {
  emit('success', { redirected: true })
  emit('close')
  if (authStore.isAuthenticated) {
    await router.push({ path: '/admin/tokens-management', hash: '#buy-token-packs' })
    return
  }
  await router.push({ path: '/auth', query: { mode: 'register', redirect: '/admin/tokens-management#buy-token-packs' } })
}
</script>

<style scoped>
.purchase-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1200;
}

.purchase-modal {
  width: min(520px, 100%);
  background: white;
  border-radius: 20px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.modal-header,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

.modal-header {
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.close-btn {
  border: none;
  background: #f8fafc;
  color: #475569;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  font-weight: 600;
}

.modal-body {
  padding: 1.5rem;
}

.purchase-summary-card {
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 1rem 1.1rem;
}

.purchase-summary-card strong {
  display: block;
  color: #1d4ed8;
  margin-bottom: 0.35rem;
}

.purchase-summary-card p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.purchase-points {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
}

.purchase-point {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.95rem 1rem;
  background: #f8fafc;
}

.purchase-point strong {
  display: block;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.purchase-point span {
  color: #64748b;
  line-height: 1.55;
}

.modal-footer {
  border-top: 1px solid #e2e8f0;
}

.btn {
  border: 0;
  border-radius: 12px;
  padding: 0.75rem 1.1rem;
  cursor: pointer;
  font-weight: 700;
}

.btn.primary {
  background: #0ea5e9;
  color: white;
}

.btn.secondary {
  background: #e2e8f0;
  color: #0f172a;
}

@media (max-width: 640px) {
  .modal-header,
  .modal-footer,
  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
