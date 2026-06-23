<template>
  <div class="recharge-page">
    <header class="recharge-page__header">
      <h1>{{ t("recharge.pageTitle") }}</h1>
      <p>{{ t("recharge.pageSubtitle") }}</p>
    </header>

    <section class="recharge-page__cards">
      <article class="recharge-card recharge-card--cloud">
        <h2 class="recharge-card__title">{{ t("recharge.cloudTokensTitle") }}</h2>
        <p class="recharge-card__desc">{{ t("recharge.cloudTokensDesc") }}</p>
        <button type="button" class="recharge-card__cta" @click="goCloudTokens">
          {{ t("recharge.cloudTokensCta") }}
        </button>
      </article>

      <article class="recharge-card recharge-card--pro">
        <h2 class="recharge-card__title">{{ t("recharge.proPluginTitle") }}</h2>
        <p class="recharge-card__desc">{{ t("recharge.proPluginDesc") }}</p>
        <button type="button" class="recharge-card__cta" @click="goProPlugin">
          {{ t("recharge.proPluginCta") }}
        </button>
      </article>
    </section>

    <p class="recharge-page__disclaimer">{{ t("recharge.disclaimer") }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()

function goCloudTokens() {
  router.push({ path: "/admin/tokens-management" })
}

function goProPlugin() {
  if (typeof window !== "undefined") {
    window.open("https://mockup100.com/pro", "_blank", "noopener")
  }
}
</script>

<style scoped>
.recharge-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}
.recharge-page__header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
}
.recharge-page__header p {
  margin: 0 0 24px;
  color: #555;
}
.recharge-page__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}
.recharge-card {
  border: 1px solid #e3e6eb;
  border-radius: 12px;
  padding: 24px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.recharge-card--cloud {
  border-top: 4px solid #2563eb;
}
.recharge-card--pro {
  border-top: 4px solid #9333ea;
}
.recharge-card__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.recharge-card__desc {
  margin: 0;
  color: #444;
  line-height: 1.6;
  flex: 1;
}
.recharge-card__cta {
  align-self: flex-start;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  cursor: pointer;
  font-weight: 600;
}
.recharge-card__cta:hover {
  background: #374151;
}
.recharge-page__disclaimer {
  margin-top: 24px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}
</style>
