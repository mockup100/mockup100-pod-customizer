<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import { downloadErpGalleryCsv, fetchErpGallery, fetchErpGalleryDetail } from "../api"
import type { ErpGalleryDetail, ErpGalleryListView } from "../types"

const listView = ref<ErpGalleryListView | null>(null)
const selected = ref<ErpGalleryDetail | null>(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref("")

const filters = reactive({
  keyword: "",
  status: "all",
  tag: "all",
})

const visibleAssets = computed(() => listView.value?.assets || [])

async function loadGallery() {
  loading.value = true
  error.value = ""
  try {
    listView.value = await fetchErpGallery(filters)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function openAsset(assetId: string) {
  error.value = ""
  try {
    selected.value = await fetchErpGalleryDetail(assetId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function resetFilters() {
  filters.keyword = ""
  filters.status = "all"
  filters.tag = "all"
  void loadGallery()
}

async function exportGallery() {
  if (!listView.value) return
  exporting.value = true
  error.value = ""
  try {
    const { blob, filename } = await downloadErpGalleryCsv(listView.value.exportEntry.path, filters)
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
    exporting.value = false
  }
}

onMounted(() => {
  void loadGallery()
})
</script>

<template>
  <section class="erp-gallery-page">
    <header class="erp-gallery-page__header">
      <div>
        <p class="erp-gallery-page__eyebrow">ERP Gallery</p>
        <h1>素材中心</h1>
        <p>对标 Gallery 列表，但业务上对应原有 artwork 模块；ERP 侧只保留聚合视图与跳转编排。</p>
      </div>
      <button type="button" :disabled="exporting" @click="exportGallery">
        {{ exporting ? "导出中..." : listView?.exportEntry.label || "导出表格" }}
      </button>
    </header>

    <div class="erp-gallery-page__stats" v-if="listView">
      <article>
        <strong>{{ listView.overview.totalAssets }}</strong>
        <span>素材总数</span>
      </article>
      <article>
        <strong>{{ listView.overview.readyForDesign }}</strong>
        <span>可设计素材</span>
      </article>
      <article>
        <strong>{{ listView.overview.linkedProducts }}</strong>
        <span>已关联商品</span>
      </article>
      <article>
        <strong>{{ listView.overview.highUsageAssets }}</strong>
        <span>高频素材</span>
      </article>
    </div>

    <div class="erp-gallery-page__filters">
      <input v-model="filters.keyword" type="text" placeholder="搜索素材名称、编码、标签">
      <select v-model="filters.status">
        <option v-for="status in listView?.statuses || []" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
      <select v-model="filters.tag">
        <option v-for="tag in listView?.tags || []" :key="tag.value" :value="tag.value">
          {{ tag.label }}
        </option>
      </select>
      <button type="button" @click="loadGallery">Search</button>
      <button type="button" class="erp-gallery-page__button--ghost" @click="resetFilters">Reset</button>
    </div>

    <div v-if="error" class="erp-gallery-page__notice erp-gallery-page__notice--error">{{ error }}</div>

    <div class="erp-gallery-page__grid">
      <article class="erp-gallery-page__panel">
        <ul v-if="!loading" class="erp-gallery-page__list">
          <li v-for="asset in visibleAssets" :key="asset.assetId" @click="openAsset(asset.assetId)">
            <img :src="asset.previewUrl" :alt="asset.assetName">
            <div class="erp-gallery-page__asset-meta">
              <strong>{{ asset.assetName }}</strong>
              <p>{{ asset.assetCode }} · {{ asset.tagLabel }}</p>
              <span>{{ asset.assetStatusLabel }} · {{ asset.fileFormat }} · {{ asset.widthPx }}x{{ asset.heightPx }}</span>
            </div>
            <div class="erp-gallery-page__asset-stats">
              <span>订单 {{ asset.usageOrderCount }}</span>
              <span>商品 {{ asset.linkedProductCount }}</span>
            </div>
          </li>
        </ul>
        <div v-else class="erp-gallery-page__notice">正在加载素材中心...</div>
      </article>

      <article class="erp-gallery-page__panel">
        <template v-if="selected">
          <img class="erp-gallery-page__preview" :src="selected.previewUrl" :alt="selected.assetName">
          <h2>{{ selected.assetName }}</h2>
          <p>{{ selected.assetCode }} · {{ selected.assetStatusLabel }} · {{ selected.tagLabel }}</p>
          <p>
            尺寸 {{ selected.widthPx }}x{{ selected.heightPx }} / {{ selected.fileFormat }} / {{ selected.fileSizeKb }} KB
          </p>
          <p>来源订单：{{ selected.sourceOrderNo || "未绑定订单" }}</p>
          <p>关联商品：{{ selected.linkedProductCodes.length ? selected.linkedProductCodes.join("、") : "暂无" }}</p>

          <div class="erp-gallery-page__action-group">
            <a
              v-for="action in selected.actions"
              :key="action.key"
              :href="action.path"
              class="erp-gallery-page__action-link"
            >
              {{ action.label }}
            </a>
          </div>
        </template>
        <div v-else class="erp-gallery-page__notice">请选择左侧素材查看详情。</div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.erp-gallery-page {
  display: grid;
  gap: 20px;
}
.erp-gallery-page__header,
.erp-gallery-page__filters,
.erp-gallery-page__stats {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.erp-gallery-page__eyebrow {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.erp-gallery-page__header h1,
.erp-gallery-page__header p,
.erp-gallery-page__panel h2,
.erp-gallery-page__panel p {
  margin: 0;
}
.erp-gallery-page__stats article,
.erp-gallery-page__panel,
.erp-gallery-page__notice {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}
.erp-gallery-page__stats article {
  min-width: 160px;
  padding: 18px;
  display: grid;
  gap: 6px;
}
.erp-gallery-page__stats strong {
  font-size: 28px;
}
.erp-gallery-page__grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 20px;
}
.erp-gallery-page__panel,
.erp-gallery-page__notice {
  padding: 18px;
}
.erp-gallery-page__notice--error {
  color: #b91c1c;
  background: #fef2f2;
}
.erp-gallery-page__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}
.erp-gallery-page__list li {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  cursor: pointer;
}
.erp-gallery-page__list img,
.erp-gallery-page__preview {
  width: 100%;
  border-radius: 14px;
  object-fit: cover;
  background: #e2e8f0;
}
.erp-gallery-page__preview {
  max-height: 320px;
  margin-bottom: 16px;
}
.erp-gallery-page__asset-meta,
.erp-gallery-page__asset-stats {
  display: grid;
  gap: 6px;
}
.erp-gallery-page__asset-meta p,
.erp-gallery-page__asset-meta span,
.erp-gallery-page__asset-stats span {
  color: #64748b;
}
.erp-gallery-page__action-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.erp-gallery-page__action-link,
.erp-gallery-page button,
.erp-gallery-page input,
.erp-gallery-page select {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  padding: 0 12px;
  background: #fff;
  color: #0f172a;
}
.erp-gallery-page button {
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
}
.erp-gallery-page__button--ghost {
  background: #fff !important;
  color: #334155 !important;
}
.erp-gallery-page__action-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  background: #eef2ff;
  color: #4338ca;
}
@media (max-width: 1200px) {
  .erp-gallery-page__grid {
    grid-template-columns: 1fr;
  }
  .erp-gallery-page__list li {
    grid-template-columns: 1fr;
  }
}
</style>
