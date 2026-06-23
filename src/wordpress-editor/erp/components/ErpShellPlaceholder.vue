<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: "ERP 模块占位容器",
    description: "后续可在此承接 ERP 子模块导航、筛选区、工作台布局等公共壳层。",
  },
)
</script>

<template>
  <section class="erp-shell-placeholder">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <slot />
  </section>
</template>

<style scoped>
.erp-shell-placeholder {
  padding: 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  background: #f8fafc;
}

.erp-shell-placeholder h2,
.erp-shell-placeholder p {
  margin: 0;
}

.erp-shell-placeholder {
  display: grid;
  gap: 12px;
}
</style>
