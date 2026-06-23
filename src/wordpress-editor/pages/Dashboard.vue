<script setup lang="ts">
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { useUiLocaleStore } from "../stores/uiLocale"

const router = useRouter()
const uiLocaleStore = useUiLocaleStore()

onMounted(() => {
  router.replace("/admin/dashboard")
})
</script>

<template>
  <div class="route-redirect">{{ uiLocaleStore.locale === "zh" ? "正在跳转到仪表盘..." : "Redirecting to dashboard..." }}</div>
</template>
