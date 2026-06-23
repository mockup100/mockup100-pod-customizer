<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import {
  fetchErpPopularSearchDetail,
  fetchErpPopularSearchTerms,
  saveErpPopularSearchTerm,
} from "../api"
import type { ErpPopularSearchDetail, ErpPopularSearchListView, ErpPopularSearchRow } from "../types"

const keyword = ref("")
const status = ref("all")
const applet = ref("all")
const listView = ref<ErpPopularSearchListView | null>(null)
const selected = ref<ErpPopularSearchDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const togglingTermId = ref("")
const error = ref("")

const metrics = computed(() => listView.value?.metrics || [])

const form = reactive({
  termId: "",
  hotWord: "",
  appletLabel: "",
  status: "active",
  operatorName: "ERP Operator",
  sortOrder: 100,
})

function formatTime(value?: string) {
  if (!value) {
    return "-"
  }
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function loadTerms() {
  loading.value = true
  error.value = ""
  try {
    const next = await fetchErpPopularSearchTerms({
      keyword: keyword.value,
      status: status.value,
      applet: applet.value,
    })
    listView.value = next
    status.value = next.selectedStatus
    applet.value = next.selectedApplet
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  keyword.value = ""
  status.value = "all"
  applet.value = "all"
  void loadTerms()
}

async function openTerm(termId: string) {
  error.value = ""
  try {
    selected.value = await fetchErpPopularSearchDetail(termId)
    form.termId = selected.value.termId
    form.hotWord = selected.value.hotWord
    form.appletLabel = selected.value.appletLabel
    form.status = selected.value.status
    form.operatorName = selected.value.operatorName
    form.sortOrder = selected.value.sortOrder
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function startCreate() {
  selected.value = null
  form.termId = ""
  form.hotWord = ""
  form.appletLabel = ""
  form.status = "active"
  form.operatorName = "ERP Operator"
  form.sortOrder = 100
}

async function saveTerm() {
  saving.value = true
  error.value = ""
  try {
    const saved = await saveErpPopularSearchTerm({
      termId: form.termId || undefined,
      hotWord: form.hotWord,
      appletLabel: form.appletLabel,
      status: form.status,
      operatorName: form.operatorName,
      sortOrder: form.sortOrder,
    })
    await loadTerms()
    await openTerm(saved.termId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    saving.value = false
  }
}

async function toggleRow(row: ErpPopularSearchRow) {
  togglingTermId.value = row.termId
  error.value = ""
  try {
    const nextStatus = row.status === "active" ? "disabled" : "active"
    await saveErpPopularSearchTerm({
      termId: row.termId,
      hotWord: row.hotWord,
      appletLabel: row.appletLabel,
      status: nextStatus,
      operatorName: row.operatorName,
      sortOrder: row.sortOrder,
    })
    await loadTerms()
    if (selected.value?.termId === row.termId) {
      await openTerm(row.termId)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    togglingTermId.value = ""
  }
}

onMounted(() => {
  void loadTerms()
})
</script>

<template>
  <section class="erp-settings-page">
    <header class="erp-settings-page__header">
      <div>
        <p class="erp-settings-page__eyebrow">ERP Settings</p>
        <h1>热搜运营配置</h1>
        <p>ERP 只管理热门搜索词的运营编排、启停和排序，不改原系统其他设置主体。</p>
      </div>
      <button type="button" @click="startCreate">{{ listView?.createEntry.label || "新增热搜词" }}</button>
    </header>

    <div v-if="metrics.length" class="erp-settings-page__metrics">
      <article v-for="metric in metrics" :key="metric.key" class="erp-settings-page__metric-card">
        <p>{{ metric.label }}</p>
        <strong>{{ metric.value }}</strong>
        <span>{{ metric.helperText }}</span>
      </article>
    </div>

    <div class="erp-settings-page__filters">
      <label>
        <span>热搜词</span>
        <input v-model="keyword" type="text" placeholder="请输入热搜词关键词">
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
        <span>小程序</span>
        <select v-model="applet">
          <option v-for="option in listView?.appletOptions || []" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <div class="erp-settings-page__filter-actions">
        <button type="button" @click="loadTerms">搜索</button>
        <button type="button" class="erp-settings-page__button--ghost" @click="resetFilters">重置</button>
      </div>
    </div>

    <div v-if="error" class="erp-settings-page__notice erp-settings-page__notice--error">{{ error }}</div>

    <div class="erp-settings-page__content">
      <article class="erp-settings-page__panel">
        <table v-if="!loading && listView">
          <thead>
            <tr>
              <th>序号</th>
              <th>热搜词</th>
              <th>小程序</th>
              <th>状态</th>
              <th>排序</th>
              <th>操作人</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody v-if="listView.rows.length">
            <tr v-for="row in listView.rows" :key="row.termId">
              <td>{{ row.serialNumber }}</td>
              <td>{{ row.hotWord }}</td>
              <td>{{ row.appletLabel }}</td>
              <td>{{ row.statusLabel }}</td>
              <td>{{ row.sortOrder }}</td>
              <td>{{ row.operatorName }}</td>
              <td>{{ formatTime(row.updatedAt) }}</td>
              <td>
                <div class="erp-settings-page__table-actions">
                  <button type="button" class="erp-settings-page__table-button" @click="openTerm(row.termId)">
                    编辑
                  </button>
                  <button
                    type="button"
                    class="erp-settings-page__table-button"
                    :disabled="togglingTermId === row.termId"
                    @click="toggleRow(row)"
                  >
                    {{ togglingTermId === row.termId ? "处理中..." : row.actions[1]?.label || "快速切换" }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="!loading" class="erp-settings-page__empty">当前没有热搜词数据。</div>
        <div v-else class="erp-settings-page__empty">加载中...</div>
        <div v-if="listView" class="erp-settings-page__pagination">
          <span>共 {{ listView.pagination.total }} 条</span>
          <span>第 {{ listView.pagination.page }} 页</span>
          <span>每页 {{ listView.pagination.pageSize }} 条</span>
        </div>
      </article>

      <article class="erp-settings-page__form-panel">
        <div>
          <h2>{{ selected ? "编辑热搜词" : "新增热搜词" }}</h2>
          <p v-if="selected">最近更新：{{ formatTime(selected.updatedAt) }}</p>
        </div>
        <label>
          <span>热搜词</span>
          <input v-model="form.hotWord" type="text" placeholder="请输入热搜词">
        </label>
        <label>
          <span>小程序</span>
          <input v-model="form.appletLabel" type="text" placeholder="请输入小程序名称">
        </label>
        <label>
          <span>状态</span>
          <select v-model="form.status">
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
        </label>
        <label>
          <span>操作人</span>
          <input v-model="form.operatorName" type="text" placeholder="ERP Operator">
        </label>
        <label>
          <span>排序值</span>
          <input v-model.number="form.sortOrder" type="number" min="0">
        </label>
        <button type="button" :disabled="saving" @click="saveTerm">
          {{ saving ? "保存中..." : selected?.updateEntry.label || "保存热搜词" }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.erp-settings-page {
  display: grid;
  gap: 18px;
}
.erp-settings-page__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}
.erp-settings-page__eyebrow {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.erp-settings-page__header h1,
.erp-settings-page__header p,
.erp-settings-page__metric-card p,
.erp-settings-page__metric-card span,
.erp-settings-page__form-panel h2,
.erp-settings-page__form-panel p {
  margin: 0;
}
.erp-settings-page__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.erp-settings-page__metric-card,
.erp-settings-page__panel,
.erp-settings-page__form-panel,
.erp-settings-page__notice {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}
.erp-settings-page__metric-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}
.erp-settings-page__metric-card p,
.erp-settings-page__metric-card span {
  color: #64748b;
}
.erp-settings-page__metric-card strong {
  font-size: 28px;
}
.erp-settings-page__filters {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(180px, 0.8fr)) auto;
  gap: 12px;
  align-items: end;
}
.erp-settings-page__filters label,
.erp-settings-page__form-panel label {
  display: grid;
  gap: 8px;
}
.erp-settings-page__filter-actions,
.erp-settings-page__pagination,
.erp-settings-page__table-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.erp-settings-page__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
}
.erp-settings-page__panel,
.erp-settings-page__form-panel,
.erp-settings-page__notice {
  padding: 18px;
}
.erp-settings-page table {
  width: 100%;
  border-collapse: collapse;
}
.erp-settings-page th,
.erp-settings-page td {
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  padding: 12px 10px;
  vertical-align: top;
}
.erp-settings-page input,
.erp-settings-page select,
.erp-settings-page button {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  padding: 0 12px;
  background: #fff;
  font: inherit;
}
.erp-settings-page button {
  background: #4f46e5;
  color: #fff;
}
.erp-settings-page__button--ghost,
.erp-settings-page__table-button {
  background: #fff !important;
  color: #334155 !important;
}
.erp-settings-page__form-panel {
  display: grid;
  gap: 14px;
  align-content: start;
}
.erp-settings-page__empty {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #64748b;
}
.erp-settings-page__notice--error {
  background: #fef2f2;
  color: #b91c1c;
}
@media (max-width: 1200px) {
  .erp-settings-page__metrics,
  .erp-settings-page__filters,
  .erp-settings-page__content {
    grid-template-columns: 1fr;
  }
}
</style>
