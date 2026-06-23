<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { fetchErpAppDetail, fetchErpApps } from "../api"
import type { ErpAppsDetail, ErpAppsListView } from "../types"

const keyword = ref("")
const status = ref("all")
const category = ref("all")
const listView = ref<ErpAppsListView | null>(null)
const selected = ref<ErpAppsDetail | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const error = ref("")

const apps = computed(() => listView.value?.apps || [])
const metrics = computed(() => listView.value?.metrics || [])

function formatTime(value?: string) {
  if (!value) {
    return "最近暂无使用记录"
  }
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function loadApps() {
  loading.value = true
  error.value = ""
  try {
    const next = await fetchErpApps({
      keyword: keyword.value,
      status: status.value,
      category: category.value,
    })
    listView.value = next
    status.value = next.selectedStatus
    category.value = next.selectedCategory
    if (!next.apps.length) {
      selected.value = null
      return
    }
    if (!selected.value || !next.apps.some((item) => item.appId === selected.value?.appId)) {
      await openApp(next.apps[0].appId)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function openApp(appId: string) {
  detailLoading.value = true
  error.value = ""
  try {
    selected.value = await fetchErpAppDetail(appId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    detailLoading.value = false
  }
}

function resetFilters() {
  keyword.value = ""
  status.value = "all"
  category.value = "all"
  void loadApps()
}

onMounted(() => {
  void loadApps()
})
</script>

<template>
  <section class="erp-apps-page">
    <header class="erp-apps-page__header">
      <div>
        <p class="erp-apps-page__eyebrow">ERP Apps</p>
        <h1>应用市场</h1>
        <p>{{ listView?.reuseNote || "应用市场只聚合 ERP 独立能力与现有 billing/token 入口。" }}</p>
      </div>
      <a v-if="listView" :href="listView.rechargeEntry.path" class="erp-apps-page__recharge">
        <strong>{{ listView.wallet.balanceLabel }}</strong>
        <span>{{ listView.wallet.rechargeLabel }}</span>
        <small>{{ listView.rechargeEntry.description }}</small>
      </a>
    </header>

    <div v-if="metrics.length" class="erp-apps-page__metrics">
      <article v-for="metric in metrics" :key="metric.key" class="erp-apps-page__metric-card">
        <p>{{ metric.label }}</p>
        <strong>{{ metric.value }}</strong>
        <span>{{ metric.helperText }}</span>
      </article>
    </div>

    <div class="erp-apps-page__toolbar">
      <label>
        <span>应用关键词</span>
        <input v-model="keyword" type="text" placeholder="搜索应用名称或简介">
      </label>
      <label>
        <span>状态</span>
        <select v-model="status">
          <option v-for="option in listView?.statusOptions || []" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        <span>分类</span>
        <select v-model="category">
          <option v-for="option in listView?.categoryOptions || []" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <div class="erp-apps-page__toolbar-actions">
        <button type="button" @click="loadApps">搜索</button>
        <button type="button" class="erp-apps-page__ghost-button" @click="resetFilters">重置</button>
      </div>
    </div>

    <div v-if="error" class="erp-apps-page__notice erp-apps-page__notice--error">{{ error }}</div>

    <div class="erp-apps-page__content">
      <div class="erp-apps-page__panel">
        <div v-if="loading" class="erp-apps-page__notice">正在加载应用市场...</div>
        <div v-else-if="apps.length" class="erp-apps-page__grid">
          <article
            v-for="app in apps"
            :key="app.appId"
            class="erp-apps-page__card"
            :class="{ 'erp-apps-page__card--active': selected?.appId === app.appId }"
            @click="openApp(app.appId)"
          >
            <img :src="app.heroImageUrl" :alt="app.appName">
            <div class="erp-apps-page__card-body">
              <div class="erp-apps-page__card-head">
                <div>
                  <h2>{{ app.appName }}</h2>
                  <p>{{ app.categoryLabel }} · {{ app.statusLabel }}</p>
                </div>
                <span>{{ app.pricingLabel }}</span>
              </div>
              <p>{{ app.shortDescription }}</p>
              <div class="erp-apps-page__card-footer">
                <small>{{ formatTime(app.lastUsedAt) }}</small>
                <a :href="app.primaryAction.path" @click.stop>{{ app.primaryAction.label }}</a>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="erp-apps-page__notice">当前筛选条件下没有应用。</div>
      </div>

      <aside class="erp-apps-page__panel erp-apps-page__panel--detail">
        <div v-if="detailLoading" class="erp-apps-page__notice">正在加载应用详情...</div>
        <template v-else-if="selected">
          <img :src="selected.heroImageUrl" :alt="selected.appName">
          <div>
            <h2>{{ selected.appName }}</h2>
            <p>{{ selected.categoryLabel }} · {{ selected.statusLabel }} · {{ selected.pricingLabel }}</p>
          </div>
          <p>{{ selected.shortDescription }}</p>
          <div class="erp-apps-page__hint">
            <strong>复用边界</strong>
            <p>{{ selected.reuseNote }}</p>
          </div>
          <div>
            <strong>能力亮点</strong>
            <ul>
              <li v-for="item in selected.highlights" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="erp-apps-page__detail-actions">
            <a v-for="action in selected.actions" :key="action.key" :href="action.path">
              <strong>{{ action.label }}</strong>
              <span>{{ action.description }}</span>
            </a>
          </div>
        </template>
        <div v-else class="erp-apps-page__notice">点击左侧应用卡片查看详情。</div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.erp-apps-page {
  display: grid;
  gap: 20px;
}
.erp-apps-page__header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: start;
}
.erp-apps-page__header h1,
.erp-apps-page__header p,
.erp-apps-page__card h2,
.erp-apps-page__card p,
.erp-apps-page__panel h2,
.erp-apps-page__panel p,
.erp-apps-page__metric-card p,
.erp-apps-page__metric-card span {
  margin: 0;
}
.erp-apps-page__eyebrow {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.erp-apps-page__recharge {
  min-width: 280px;
  display: grid;
  gap: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  padding: 16px 18px;
  color: #0f172a;
  text-decoration: none;
}
.erp-apps-page__recharge span {
  color: #4f46e5;
}
.erp-apps-page__recharge small {
  color: #64748b;
}
.erp-apps-page__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.erp-apps-page__metric-card,
.erp-apps-page__panel,
.erp-apps-page__notice {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}
.erp-apps-page__metric-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}
.erp-apps-page__metric-card p,
.erp-apps-page__metric-card span {
  color: #64748b;
}
.erp-apps-page__metric-card strong {
  font-size: 28px;
  color: #0f172a;
}
.erp-apps-page__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(180px, 0.8fr)) auto;
  gap: 12px;
  align-items: end;
}
.erp-apps-page__toolbar label,
.erp-apps-page__toolbar-actions,
.erp-apps-page__detail-actions a,
.erp-apps-page__hint,
.erp-apps-page__panel--detail > div {
  display: grid;
  gap: 8px;
}
.erp-apps-page__toolbar-actions {
  grid-template-columns: repeat(2, auto);
}
.erp-apps-page__content {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 380px;
  gap: 20px;
}
.erp-apps-page__panel {
  padding: 18px;
}
.erp-apps-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.erp-apps-page__card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  cursor: pointer;
}
.erp-apps-page__card--active {
  border-color: #4f46e5;
  box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.16);
}
.erp-apps-page__card img,
.erp-apps-page__panel--detail img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: #e2e8f0;
  border-radius: 14px;
}
.erp-apps-page__card-body,
.erp-apps-page__panel--detail {
  display: grid;
  gap: 14px;
}
.erp-apps-page__card-head,
.erp-apps-page__card-footer {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: start;
}
.erp-apps-page__card-head p,
.erp-apps-page__card-footer small,
.erp-apps-page__detail-actions a span,
.erp-apps-page__hint p,
.erp-apps-page__panel ul {
  color: #64748b;
}
.erp-apps-page__detail-actions {
  display: grid;
  gap: 10px;
}
.erp-apps-page__detail-actions a {
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 14px;
  color: #0f172a;
  text-decoration: none;
}
.erp-apps-page__notice {
  padding: 18px;
}
.erp-apps-page__notice--error {
  background: #fef2f2;
  color: #b91c1c;
}
.erp-apps-page input,
.erp-apps-page select,
.erp-apps-page button,
.erp-apps-page__card-footer a {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  padding: 0 12px;
  background: #fff;
  font: inherit;
}
.erp-apps-page button,
.erp-apps-page__card-footer a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #4f46e5;
  color: #fff;
  text-decoration: none;
}
.erp-apps-page__ghost-button {
  background: #fff !important;
  color: #334155 !important;
}
.erp-apps-page__panel ul {
  margin: 0;
  padding-left: 18px;
}
@media (max-width: 1280px) {
  .erp-apps-page__metrics,
  .erp-apps-page__toolbar,
  .erp-apps-page__content {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .erp-apps-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
