<template>
  <Modal :is-open="true" size="md" @close="emit('close')" @update:isOpen="handleToggle">
    <template #header>
      <h2>{{ locale === 'zh' ? '充值 Tokens' : 'Top Up Tokens' }}</h2>
    </template>
    <TokenPurchaseModal :is-open="true" :token-packs="tokenStore.availablePacks" @close="emit('close')" @success="emit('close')" />
  </Modal>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import Modal from './ui/Modal.vue'
import TokenPurchaseModal from './TokenPurchaseModal.vue'
import { useTokenStore } from '../stores/token'
import { useUiLocaleStore } from '../stores/uiLocale'

const emit = defineEmits<{
  close: []
}>()

const tokenStore = useTokenStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

function handleToggle(value: boolean) {
  if (!value) {
    emit('close')
  }
}

onMounted(() => {
  if (!tokenStore.availablePacks.length) {
    tokenStore.fetchAvailablePacks()
  }
})
</script>
