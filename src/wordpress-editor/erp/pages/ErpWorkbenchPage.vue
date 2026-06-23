<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { fetchErpWorkbenchOverview } from "../api"
import type { ErpWorkbenchOverview } from "../types"
import { useAuthStore } from "../../stores/auth"

const authStore = useAuthStore()
const { erpSession, activeWorkspace } = storeToRefs(authStore)
const syncing = ref(false)
const syncError = ref("")
const overview = ref<ErpWorkbenchOverview | null>(null)
const overviewLoading = ref(false)
const overviewError = ref("")

const workspaceLabel = computed(() => activeWorkspace.value === "erp" ? "ERP" : "Platform")
const trendPreview = computed(() => overview.value?.trend.slice(-7) || [])
const focusTopList = computed(() => [...(overview.value?.statusDistribution || [])]
  .sort((left, right) => right.value - left.value)
  .slice(0, 5))
const maxTrendValue = computed(() => Math.max(
  1,
  ...trendPreview.value.flatMap((item) => [item.todayOrders, item.pendingProduction, item.pendingShipment]),
))

async function loadWorkbench() {
  overviewLoading.value = true
  overviewError.value = ""
  try {
    overview.value = await fetchErpWorkbenchOverview()
  } catch (error) {
    overviewError.value = error instanceof Error ? error.message : String(error)
  } finally {
    overviewLoading.value = false
  }
}

async function ensureErpSession() {
  syncing.value = true
  syncError.value = ""
  try {
    await authStore.enterErpSession()
    await loadWorkbench()
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : String(error)
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  if (!erpSession.value) {
    void ensureErpSession()
  } else {
    void loadWorkbench()
  }
})
</script>

<template>
  <section class="erp-workbench-page">
    <header class="erp-workbench-page__hero">
      <div>
        <p class="erp-workbench-page__eyebrow">ERP Workspace</p>
        <h1>Home</h1>
        <p>对标参考站首页驾驶舱，聚合 ERP 独立域的订单、履约和刊登概览，不改原系统业务模块。</p>
      </div>
      <div class="erp-workbench-page__hero-meta">
        <strong>{{ workspaceLabel }}</strong>
        <span>{{ overview?.generatedAt || "waiting for overview" }}</span>
      </div>
    </header>

    <div v-if="syncing" class="erp-workbench-page__notice">正在初始化 ERP 会话...</div>
    <div v-else-if="syncError" class="erp-workbench-page__notice erp-workbench-page__notice--error">{{ syncError }}</div>

    <div v-else-if="erpSession" class="erp-workbench-page__session">
      <p><strong>租户：</strong>{{ erpSession.tenantId }}</p>
      <p><strong>账号：</strong>{{ erpSession.email }}</p>
      <p><strong>角色：</strong>{{ erpSession.role }}</p>
      <p><strong>ERP 会话到期：</strong>{{ erpSession.expiresAt }}</p>
    </div>

    <template v-if="erpSession">
      <div v-if="overviewLoading" class="erp-workbench-page__notice">正在加载 ERP 工作台...</div>
      <div v-else-if="overviewError" class="erp-workbench-page__notice erp-workbench-page__notice--error">{{ overviewError }}</div>

      <template v-else-if="overview">
        <section class="erp-workbench-page__grid erp-workbench-page__grid--metrics">
          <article v-for="metric in overview.metrics" :key="metric.key" class="erp-workbench-page__metric-card" :data-tone="metric.tone">
            <p class="erp-workbench-page__card-label">{{ metric.title }}</p>
            <div class="erp-workbench-page__card-value">
              <strong>{{ metric.value }}</strong>
              <span>{{ metric.unit }}</span>
            </div>
            <p class="erp-workbench-page__card-description">{{ metric.description }}</p>
            <p class="erp-workbench-page__card-trend">{{ metric.trendLabel }}</p>
          </article>
        </section>

        <section class="erp-workbench-page__grid">
          <article class="erp-workbench-page__panel">
            <header class="erp-workbench-page__panel-header">
              <h2>Comprehensive board</h2>
              <span>{{ overview.tenantLabel }}</span>
            </header>
            <ul class="erp-workbench-page__bucket-list">
              <li v-for="bucket in overview.statusDistribution" :key="bucket.key">
                <div class="erp-workbench-page__bucket-copy">
                  <span>{{ bucket.label }}</span>
                  <small>{{ bucket.tone }}</small>
                </div>
                <strong>{{ bucket.value }}</strong>
              </li>
            </ul>
          </article>

          <article class="erp-workbench-page__panel">
            <header class="erp-workbench-page__panel-header">
              <h2>Quick entry</h2>
              <span>{{ overview.generatedAt }}</span>
            </header>
            <ul class="erp-workbench-page__entry-list">
              <li v-for="entry in overview.quickEntries" :key="entry.key">
                <div>
                  <strong>{{ entry.title }}</strong>
                  <p>{{ entry.description }}</p>
                </div>
                <span>{{ entry.badge }}</span>
              </li>
            </ul>
          </article>
        </section>

        <section class="erp-workbench-page__grid">
          <article class="erp-workbench-page__panel">
            <header class="erp-workbench-page__panel-header">
              <h2>Data statistics</h2>
              <span>7 days</span>
            </header>
            <div class="erp-workbench-page__trend-chart">
              <div v-for="point in trendPreview" :key="point.date" class="erp-workbench-page__trend-column">
                <div class="erp-workbench-page__trend-bars">
                  <span
                    class="erp-workbench-page__trend-bar erp-workbench-page__trend-bar--orders"
                    :style="{ height: `${(point.todayOrders / maxTrendValue) * 120}px` }"
                  />
                  <span
                    class="erp-workbench-page__trend-bar erp-workbench-page__trend-bar--production"
                    :style="{ height: `${(point.pendingProduction / maxTrendValue) * 120}px` }"
                  />
                  <span
                    class="erp-workbench-page__trend-bar erp-workbench-page__trend-bar--shipment"
                    :style="{ height: `${(point.pendingShipment / maxTrendValue) * 120}px` }"
                  />
                </div>
                <strong>{{ point.date.slice(5) }}</strong>
              </div>
            </div>
            <div class="erp-workbench-page__legend">
              <span>Orders</span>
              <span>Pending production</span>
              <span>Pending shipment</span>
            </div>
          </article>

          <article class="erp-workbench-page__panel">
            <header class="erp-workbench-page__panel-header">
              <h2>Sales list TOP 5</h2>
              <span>Current focus</span>
            </header>
            <ol class="erp-workbench-page__top-list">
              <li v-for="item in focusTopList" :key="item.key">
                <div>
                  <strong>{{ item.label }}</strong>
                  <p>Current queue weight</p>
                </div>
                <span>{{ item.value }}</span>
              </li>
            </ol>
          </article>
        </section>
      </template>
    </template>
  </section>
</template>

<style scoped>
.erp-workbench-page {
  display: grid;
  gap: 24px;
}

.erp-workbench-page__hero,
.erp-workbench-page__session,
.erp-workbench-page__notice,
.erp-workbench-page__panel,
.erp-workbench-page__metric-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.erp-workbench-page__hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
}

.erp-workbench-page__hero-meta {
  display: grid;
  gap: 6px;
  justify-items: end;
  color: #475569;
}

.erp-workbench-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.erp-workbench-page__grid--metrics {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.erp-workbench-page__grid--trend {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.erp-workbench-page__notice--error {
  background: #fef2f2;
  color: #b91c1c;
}

.erp-workbench-page__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4f46e5;
}

.erp-workbench-page__hero h1,
.erp-workbench-page__hero p {
  margin: 0;
}

.erp-workbench-page__hero p {
  max-width: 720px;
  color: #475569;
}

.erp-workbench-page__panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.erp-workbench-page__panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.erp-workbench-page__panel-header span,
.erp-workbench-page__card-description,
.erp-workbench-page__card-trend,
.erp-workbench-page__entry-list p,
.erp-workbench-page__top-list p,
.erp-workbench-page__legend {
  color: #64748b;
}

.erp-workbench-page__bucket-list,
.erp-workbench-page__entry-list,
.erp-workbench-page__top-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.erp-workbench-page__bucket-list li,
.erp-workbench-page__entry-list li,
.erp-workbench-page__top-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
}

.erp-workbench-page__bucket-copy {
  display: grid;
  gap: 4px;
}

.erp-workbench-page__bucket-copy small {
  color: #94a3b8;
}

.erp-workbench-page__card-label {
  margin: 0 0 8px;
  color: #475569;
  font-size: 13px;
}

.erp-workbench-page__card-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.erp-workbench-page__card-value strong {
  font-size: 28px;
  line-height: 1;
}

.erp-workbench-page__metric-card[data-tone="primary"] {
  background: linear-gradient(135deg, #eef2ff, #ffffff);
}

.erp-workbench-page__metric-card[data-tone="warning"] {
  background: linear-gradient(135deg, #fff7ed, #ffffff);
}

.erp-workbench-page__metric-card[data-tone="accent"] {
  background: linear-gradient(135deg, #f5f3ff, #ffffff);
}

.erp-workbench-page__card-description,
.erp-workbench-page__card-trend,
.erp-workbench-page__entry-list p,
.erp-workbench-page__top-list p {
  margin: 0;
}

.erp-workbench-page__entry-list strong,
.erp-workbench-page__top-list strong {
  display: block;
  margin-bottom: 6px;
}

.erp-workbench-page__trend-chart {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 12px;
  align-items: end;
}

.erp-workbench-page__trend-column {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.erp-workbench-page__trend-bars {
  min-height: 128px;
  width: 100%;
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 6px;
}

.erp-workbench-page__trend-bar {
  width: 14px;
  min-height: 4px;
  border-radius: 999px 999px 0 0;
}

.erp-workbench-page__trend-bar--orders {
  background: #4f46e5;
}

.erp-workbench-page__trend-bar--production {
  background: #f59e0b;
}

.erp-workbench-page__trend-bar--shipment {
  background: #0ea5e9;
}

.erp-workbench-page__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
}
</style>
