<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useUiLocaleStore } from "../stores/uiLocale"

const router = useRouter()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const redirectText = computed(() => (
  locale.value === "zh" ? "正在跳转到模板库..." : "Redirecting to template library..."
))

onMounted(() => {
  router.replace("/admin/repository")
})
</script>

<template>
  <div class="route-redirect">{{ redirectText }}</div>
</template>
