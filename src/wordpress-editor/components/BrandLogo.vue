<script setup lang="ts">
withDefaults(defineProps<{
  size?: "nav" | "sidebar" | "auth" | "preview"
}>(), {
  size: "nav",
})
</script>

<template>
  <span class="brand-mark" :class="`brand-mark--${size}`">
    <svg class="brand-mark-image" viewBox="0 0 64 64" fill="none" aria-label="mockup100 logo" role="img">
      <defs>
        <linearGradient id="mk_bg" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0EA5E9" />
          <stop offset="1" stop-color="#4F46E5" />
        </linearGradient>
        <linearGradient id="mk_orbit" x1="42" y1="14" x2="52" y2="24" gradientUnits="userSpaceOnUse">
          <stop stop-color="#67E8F9" />
          <stop offset="1" stop-color="#BFDBFE" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#FFFFFF" />
      <rect x="4" y="4" width="56" height="56" rx="16" stroke="#D6E1F5" stroke-width="1.5" />
      <rect x="10" y="10" width="44" height="44" rx="12" fill="url(#mk_bg)" />
      <path d="M18 46V18H23.4L31.6 32.1L39.8 18H45V46H40.4V27.8L33.4 39.4H29.8L22.6 27.8V46H18Z" fill="#FFFFFF" />
      <path d="M42 16C42 13.7909 43.7909 12 46 12H48C50.2091 12 52 13.7909 52 16V18C52 20.2091 50.2091 22 48 22H46C43.7909 22 42 20.2091 42 18V16Z" fill="url(#mk_orbit)" />
    </svg>
  </span>
</template>

<style scoped>
.brand-mark {
  --brand-size: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--brand-size);
  height: var(--brand-size);
  flex: 0 0 auto;
}

.brand-mark--nav {
  --brand-size: 2.625rem;
}

.brand-mark--sidebar {
  --brand-size: 3rem;
}

.brand-mark--auth {
  --brand-size: 3.25rem;
}

.brand-mark--preview {
  --brand-size: 2.75rem;
}

.brand-mark-image {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
