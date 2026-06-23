<script setup lang="ts">
import { onMounted } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

onMounted(() => {
  router.replace("/admin")
})
</script>

<template>
  <div class="route-redirect">Redirecting to admin workspace...</div>
</template>
