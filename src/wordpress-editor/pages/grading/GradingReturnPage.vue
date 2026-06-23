<template>
  <div class="grading-return">
    <header class="grading-return__header">
      <h1>{{ t("gradingReturn.title") }}</h1>
    </header>

    <div v-if="loading" class="grading-return__loading">{{ t("gradingReturn.processing") }}</div>

    <div v-else-if="errorMessage" class="grading-return__panel grading-return__panel--failed">
      <h2>{{ t("gradingReturn.failed") }}</h2>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else class="grading-return__panel grading-return__panel--success">
      <h2>{{ t("gradingReturn.success") }}</h2>
      <p>{{ t("gradingReturn.successDesc") }}</p>
    </div>

    <div class="grading-return__actions">
      <RouterLink class="grading-return__btn grading-return__btn--ghost" to="/admin/subscriptions-licensing?tab=grading">
        {{ t("gradingReturn.goSubscriptions") }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter, RouterLink } from "vue-router"
import { useGradingCheckout } from "../../composables/useGradingCheckout"
import { globalToast } from "../../composables/useToast"

// Plan v5 §C.2：PayPal Subscription approve 后回跳路由。
//   1. PayPal 重定向至 /grading/return?subscription_id=...&ba_token=...
//   2. 调 activate(subscriptionId) 让后端拉 PayPal 状态 -> ACTIVE
//   3. 成功 toast + 自动跳订阅管理页

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { activate } = useGradingCheckout()

const loading = ref(true)
const errorMessage = ref("")

onMounted(async () => {
  const subscriptionId = String(route.query.subscription_id || route.query.subscriptionId || "").trim()
  if (!subscriptionId) {
    errorMessage.value = t("gradingReturn.missingSubscriptionId")
    loading.value = false
    return
  }
  try {
    const resp = await activate(subscriptionId)
    if (resp.status === "ACTIVE") {
      globalToast.success(t("gradingReturn.activatedToast"))
      setTimeout(() => {
        router.replace("/admin/subscriptions-licensing?tab=grading")
      }, 1200)
    } else {
      errorMessage.value = t("gradingReturn.notActiveYet", { status: resp.status })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errorMessage.value = msg
    globalToast.error(msg)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.grading-return {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}
.grading-return__header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
}
.grading-return__loading {
  color: #555;
  padding: 24px 0;
}
.grading-return__panel {
  border-radius: 12px;
  padding: 22px 24px;
  border: 1px solid #e3e6eb;
  background: #fff;
}
.grading-return__panel h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}
.grading-return__panel p {
  margin: 0 0 16px;
  color: #444;
  line-height: 1.6;
}
.grading-return__panel--success {
  border-top: 4px solid #047857;
}
.grading-return__panel--failed {
  border-top: 4px solid #b91c1c;
}
.grading-return__actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.grading-return__btn {
  background: #2563eb;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.grading-return__btn:hover {
  background: #1d4ed8;
}
.grading-return__btn--ghost {
  background: #fff;
  color: #2563eb;
  border: 1px solid #2563eb;
}
.grading-return__btn--ghost:hover {
  background: #eff6ff;
}
</style>
