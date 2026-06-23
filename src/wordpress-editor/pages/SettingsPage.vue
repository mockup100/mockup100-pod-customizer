<script setup lang="ts">
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { useUiLocaleStore } from "../stores/uiLocale"

const router = useRouter()
const uiLocaleStore = useUiLocaleStore()

onMounted(() => {
  router.replace("/admin/settings")
})
</script>

<template>
  <div class="route-redirect">{{ uiLocaleStore.locale === "zh" ? "正在跳转到账户设置..." : "Redirecting to settings..." }}</div>
</template>
