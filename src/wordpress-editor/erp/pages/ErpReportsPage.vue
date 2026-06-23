<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import { downloadErpReportCsv, fetchErpReports } from "../api"
import type { ErpReportExportEntry, ErpReportOverview } from "../types"

const overview = ref<ErpReportOverview | null>(null)
const loading = ref(false)
const exportingKey = ref("")
const error = ref("")
const activeRecordTab = ref<"orders" | "apps">("orders")
const filters = reactive({
  startDate: "",
  endDate: "",
  shopId: "",
  platform: "",
  product: "",
})

const trendPreview = computed(() => overview.value?.trend.slice(-5) || [])
const orderRecords = computed(() => overview.value?.orderRecords || [])
const appPurchaseRecords = computed(() => overview.value?.appPurchaseRecords || [])
const recordExportEntry = computed(() => {
  const key = activeRecordTab.value === "orders" ? "operations_export" : "app_purchase_export"
  return overview.value?.exportEntries.find((entry) => entry.key === key) || null
})
const hasDimensionFilters = computed(() => Boolean(filters.shopId || filters.platform || filters.product))

function buildQuery() {
  return {
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    shopId: filters.shopId || undefined,
    platform: filters.platform || undefined,
    product: filters.product || undefined,
  }
}

function validateFilters() {
  if ((filters.startDate && !filters.endDate) || (!filters.startDate && filters.endDate)) {
    error.value = "开始日期和结束日期需要同时选择。"
    return false
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    error.value = "开始日期不能晚于结束日期。"
    return false
  }
  return true
}

function syncFiltersFromOverview() {
  const applied = overview.value?.filters.applied
  if (!applied) {
    return
  }
  filters.startDate = applied.startDate || ""
  filters.endDate = applied.endDate || ""
  filters.shopId = applied.shopId || ""
  filters.platform = applied.platform || ""
  filters.product = applied.product || ""
}

async function loadReports() {
  if (!validateFilters()) {
    return
  }
  loading.value = true
  error.value = ""
  try {
    overview.value = await fetchErpReports(buildQuery())
    syncFiltersFromOverview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function handleExport(entry: ErpReportExportEntry) {
  exportingKey.value = entry.key
  error.value = ""
  try {
    const { blob, filename } = await downloadErpReportCsv(entry.path)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    exportingKey.value = ""
  }
}

function resetFilters() {
  filters.startDate = ""
  filters.endDate = ""
  filters.shopId = ""
  filters.platform = ""
  filters.product = ""
  void loadReports()
}

onMounted(() => {
  void loadReports()
})

function formatDateTime(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("zh-CN", { hour12: false })
}
</script>

<template>
  <section class="erp-report-page">
    <header class="erp-report-page__header">
      <div>
        <p class="erp-report-page__eyebrow">ERP Reports</p>
        <h1>报表导出</h1>
      </div>
      <span v-if="overview">{{ overview.generatedAt }}</span>
    </header>

    <div v-if="error" class="erp-report-page__notice erp-report-page__notice--error">{{ error }}</div>
    <div v-else-if="loading" class="erp-report-page__notice">正在加载 ERP 报表...</div>

    <template v-else-if="overview">
      <article class="erp-report-page__panel">
        <div class="erp-report-page__panel-header">
          <div>
            <h2>筛选条件</h2>
            <p>支持按时间、店铺、平台、商品维度过滤概览与导出结果。</p>
          </div>
          <div class="erp-report-page__actions">
            <button type="button" class="erp-report-page__button erp-report-page__button--ghost" @click="resetFilters">
              重置
            </button>
            <button type="button" class="erp-report-page__button" @click="loadReports">
              应用筛选
            </button>
          </div>
        </div>
        <div class="erp-report-page__filters">
          <label class="erp-report-page__field">
            <span>开始日期</span>
            <input v-model="filters.startDate" type="date">
          </label>
          <label class="erp-report-page__field">
            <span>结束日期</span>
            <input v-model="filters.endDate" type="date">
          </label>
          <label class="erp-report-page__field">
            <span>店铺</span>
            <select v-model="filters.shopId">
              <option value="">全部店铺</option>
              <option v-for="shop in overview.filters.shops" :key="shop.value" :value="shop.value">
                {{ shop.label }}
              </option>
            </select>
          </label>
          <label class="erp-report-page__field">
            <span>平台</span>
            <select v-model="filters.platform">
              <option value="">全部平台</option>
              <option v-for="platformOption in overview.filters.platforms" :key="platformOption.value" :value="platformOption.value">
                {{ platformOption.label }}
              </option>
            </select>
          </label>
          <label class="erp-report-page__field">
            <span>商品</span>
            <select v-model="filters.product">
              <option value="">全部商品</option>
              <option v-for="productOption in overview.filters.products" :key="productOption.value" :value="productOption.value">
                {{ productOption.label }}
              </option>
            </select>
          </label>
        </div>
      </article>

      <section class="erp-report-page__grid erp-report-page__grid--cards">
        <article v-for="card in overview.cards" :key="card.key" class="erp-report-page__panel">
          <strong>{{ card.title }}</strong>
          <p>{{ card.value }} {{ card.unit }}</p>
          <span>{{ card.description }}</span>
        </article>
      </section>

      <section class="erp-report-page__grid">
        <article class="erp-report-page__panel">
          <h2>渠道拆分</h2>
          <ul class="erp-report-page__list">
            <li v-for="channel in overview.channelBreakdown" :key="channel.channelCode">
              <strong>{{ channel.channelLabel }}</strong>
              <span>active {{ channel.activeListings }} / failed {{ channel.failedListings }}</span>
            </li>
          </ul>
        </article>

        <article class="erp-report-page__panel">
          <h2>导出入口</h2>
          <ul class="erp-report-page__list">
            <li v-for="entry in overview.exportEntries" :key="entry.key">
              <div class="erp-report-page__list-head">
                <strong>{{ entry.label }}</strong>
                <button
                  type="button"
                  class="erp-report-page__button"
                  :disabled="exportingKey === entry.key"
                  @click="handleExport(entry)"
                >
                  {{ exportingKey === entry.key ? "导出中..." : "下载 CSV" }}
                </button>
              </div>
              <span>{{ entry.description }}</span>
            </li>
          </ul>
        </article>
      </section>

      <article class="erp-report-page__panel">
        <div class="erp-report-page__panel-header">
          <div>
            <h2>记录中心</h2>
            <p>对标参考站补充订单记录与应用购买记录两类只读视图。</p>
          </div>
          <div class="erp-report-page__record-actions">
            <div class="erp-report-page__tabs">
              <button
                type="button"
                class="erp-report-page__button"
                :class="{ 'erp-report-page__button--ghost': activeRecordTab !== 'orders' }"
                @click="activeRecordTab = 'orders'"
              >
                订单记录
              </button>
              <button
                type="button"
                class="erp-report-page__button"
                :class="{ 'erp-report-page__button--ghost': activeRecordTab !== 'apps' }"
                @click="activeRecordTab = 'apps'"
              >
                应用购买记录
              </button>
            </div>
            <button
              v-if="recordExportEntry"
              type="button"
              class="erp-report-page__button"
              :disabled="exportingKey === recordExportEntry.key"
              @click="handleExport(recordExportEntry)"
            >
              {{ exportingKey === recordExportEntry.key ? "导出中..." : `导出${activeRecordTab === "orders" ? "订单记录" : "应用购买记录"}` }}
            </button>
          </div>
        </div>
        <div class="erp-report-page__record-summary">
          <span class="erp-report-page__tag">
            {{ activeRecordTab === "orders" ? `当前 ${orderRecords.length} 条订单记录` : `当前 ${appPurchaseRecords.length} 条应用购买记录` }}
          </span>
          <span
            v-if="activeRecordTab === 'apps'"
            class="erp-report-page__tag erp-report-page__tag--muted"
          >
            仅支持时间范围筛选，作为 ERP 只读视图展示，不改 billing/payment 主流程
          </span>
          <span
            v-else-if="hasDimensionFilters"
            class="erp-report-page__tag erp-report-page__tag--muted"
          >
            当前店铺、平台、商品筛选已作用于订单记录视图
          </span>
        </div>

        <div v-if="activeRecordTab === 'orders'" class="erp-report-page__table">
          <div class="erp-report-page__table-head">
            <span>Order No</span>
            <span>Store / Platform</span>
            <span>Product</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Time</span>
          </div>
          <div v-for="row in orderRecords" :key="row.orderNo" class="erp-report-page__table-row">
            <span>{{ row.orderNo }}</span>
            <span>{{ row.shopLabel }} / {{ row.platformLabel }}</span>
            <span>{{ row.productLabel }}</span>
            <span>{{ row.currencyCode }} {{ row.amount }}</span>
            <span>{{ row.orderStatus }}</span>
            <span>{{ formatDateTime(row.placedAt) }}</span>
          </div>
          <div v-if="!orderRecords.length" class="erp-report-page__table-empty">当前筛选条件下暂无订单记录。</div>
        </div>

        <div v-else class="erp-report-page__table">
          <div class="erp-report-page__table-head">
            <span>Transaction No</span>
            <span>App</span>
            <span>Package</span>
            <span>Payment</span>
            <span>Amount</span>
            <span>Time</span>
          </div>
          <div v-for="row in appPurchaseRecords" :key="row.transactionNo" class="erp-report-page__table-row">
            <span>{{ row.transactionNo }}</span>
            <span>{{ row.appName }}</span>
            <span>{{ row.packageLabel }}</span>
            <span>{{ row.paymentMethod }} / {{ row.paymentStatus }}</span>
            <span>{{ row.currencyCode }} {{ row.amount }}</span>
            <span>{{ formatDateTime(row.purchasedAt) }}</span>
          </div>
          <div v-if="!appPurchaseRecords.length" class="erp-report-page__table-empty">当前时间范围下暂无应用购买记录。</div>
        </div>
      </article>

      <article class="erp-report-page__panel">
        <h2>趋势预览</h2>
        <div class="erp-report-page__grid erp-report-page__grid--trend">
          <div v-for="point in trendPreview" :key="point.date" class="erp-report-page__trend">
            <strong>{{ point.date }}</strong>
            <p>订单 {{ point.orderCount }}</p>
            <p>GMV {{ point.grossAmount }}</p>
            <p>已同步刊登 {{ point.syncedListings }}</p>
          </div>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.erp-report-page {
  display: grid;
  gap: 20px;
}
.erp-report-page__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.erp-report-page__eyebrow {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.erp-report-page__header h1,
.erp-report-page__panel h2,
.erp-report-page__panel p {
  margin: 0;
}
.erp-report-page__panel-header,
.erp-report-page__list-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.erp-report-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.erp-report-page__filters {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.erp-report-page__grid--cards {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.erp-report-page__grid--trend {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.erp-report-page__panel,
.erp-report-page__notice {
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}
.erp-report-page__notice--error {
  background: #fef2f2;
  color: #b91c1c;
}
.erp-report-page__field {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #334155;
}
.erp-report-page__field input,
.erp-report-page__field select {
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
}
.erp-report-page__list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.erp-report-page__list li,
.erp-report-page__trend {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
}
.erp-report-page__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.erp-report-page__tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.erp-report-page__record-actions,
.erp-report-page__record-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.erp-report-page__record-summary {
  margin-top: 16px;
}
.erp-report-page__tag {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 13px;
  font-weight: 600;
}
.erp-report-page__tag--muted {
  background: #f8fafc;
  color: #475569;
}
.erp-report-page__button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.erp-report-page__button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.erp-report-page__button--ghost {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}
.erp-report-page__table {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.erp-report-page__table-head,
.erp-report-page__table-row {
  display: grid;
  gap: 12px;
  grid-template-columns: 1.1fr 1.3fr 1.6fr 0.9fr 0.9fr 1.2fr;
  align-items: center;
}
.erp-report-page__table-head {
  padding: 0 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.erp-report-page__table-row {
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
}
.erp-report-page__table-empty {
  padding: 14px 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  text-align: center;
}
@media (max-width: 1200px) {
  .erp-report-page__table-head,
  .erp-report-page__table-row {
    grid-template-columns: 1fr;
  }
}
</style>
