<template>
  <div class="erp-entry-page">
    <RouterView />
  </div>
</template>

<style scoped>
.erp-entry-page {
  width: min(1320px, 100%);
  margin: 0 auto;
  padding: 8px 0 32px;
}

@media (max-width: 640px) {
  .erp-entry-page {
    padding: 8px 0 24px;
  }
}
</style>
