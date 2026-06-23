<template>
  <div class="recharge-cancel">
    <header class="recharge-cancel__header">
      <h1>{{ t("recharge.cancel.title") }}</h1>
    </header>
    <p class="recharge-cancel__desc">{{ t("recharge.cancel.desc") }}</p>

    <div v-if="orderNo" class="recharge-cancel__order">
      {{ t("recharge.return.orderNo") }}: <code>{{ orderNo }}</code>
    </div>

    <div class="recharge-cancel__actions">
      <RouterLink class="recharge-cancel__btn" to="/recharge">{{ t("recharge.cancel.retry") }}</RouterLink>
      <RouterLink class="recharge-cancel__btn recharge-cancel__btn--ghost" to="/admin/billing">
        {{ t("recharge.cancel.back") }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, RouterLink } from "vue-router"
import { platformFetch } from "../../api/client"

const { t } = useI18n()
const route = useRoute()

const orderNo = computed(() => String(route.query.orderNo || "").trim())

async function notifyCancel() {
  if (!orderNo.value) return
  try {
    await platformFetch("/api/payments/paypal/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNo: orderNo.value }),
    })
  } catch (e) {
    console.warn("[recharge-cancel] notify failed", e)
  }
}

onMounted(() => {
  notifyCancel()
})
</script>

<style scoped>
.recharge-cancel {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}
.recharge-cancel__header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px;
}
.recharge-cancel__desc {
  color: #444;
  line-height: 1.6;
  margin: 0 0 18px;
}
.recharge-cancel__order {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 18px;
}
.recharge-cancel__order code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}
.recharge-cancel__actions {
  display: flex;
  gap: 12px;
}
.recharge-cancel__btn {
  background: #2563eb;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.recharge-cancel__btn:hover {
  background: #1d4ed8;
}
.recharge-cancel__btn--ghost {
  background: #fff;
  color: #2563eb;
  border: 1px solid #2563eb;
}
.recharge-cancel__btn--ghost:hover {
  background: #eff6ff;
}
</style>
