<script setup lang="ts">
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { useUiLocaleStore } from "../../stores/uiLocale"

defineProps<{ locale?: "en" | "zh" }>()

const router = useRouter()
const uiLocaleStore = useUiLocaleStore()

onMounted(() => {
  router.replace("/admin")
})
</script>

<template>
  <div class="route-redirect">{{ uiLocaleStore.locale === "zh" ? "正在跳转到管理工作区..." : "Redirecting to admin workspace..." }}</div>
</template>
