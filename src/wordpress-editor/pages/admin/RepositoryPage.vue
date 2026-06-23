<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useUiLocaleStore } from "../../stores/uiLocale"

const router = useRouter()
const uiLocaleStore = useUiLocaleStore()
const redirectLabel = computed(() => uiLocaleStore.locale === "zh" ? "正在跳转到模板库..." : "Redirecting to template library...")

onMounted(() => {
  router.replace("/admin/repository")
})
</script>

<template>
  <div class="route-redirect">{{ redirectLabel }}</div>
</template>
