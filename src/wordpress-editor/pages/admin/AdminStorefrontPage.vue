<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import TenantStorefrontSettingsPage from "./TenantStorefrontSettingsPage.vue"
import FilterDropdown from "../../components/FilterDropdown.vue"
import PaginationBar from "../../components/PaginationBar.vue"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore, type StorefrontReviewListItem } from "../../stores/platform"
import { useUiLocaleStore } from "../../stores/uiLocale"

const PAGE_SIZE = 12

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiLocaleStore = useUiLocaleStore()
const {
  storefrontReviewItems,
  storefrontReviewPage,
  storefrontReviewPages,
  storefrontReviewTotal,
  loading,
  error,
} = storeToRefs(platformStore)

const isPlatformAdmin = computed(() => authStore.isPlatformAdmin)
const searchInput = ref("")
const appliedKeyword = ref("")
const statusFilter = ref<"all" | "draft" | "pending_review" | "approved" | "rejected">("all")
const busyReviewTenantId = ref("")
const busyFeatureTenantId = ref("")
const reviewNotes = reactive<Record<string, string>>({})
const sortOrders = reactive<Record<string, number>>({})
const actionNotices = reactive<Record<string, string>>({})
const actionErrors = reactive<Record<string, string>>({})

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const reviewStatusOptions = computed(() => [
  { value: "all", label: localize("All Review States", "全部审核状态") },
  { value: "draft", label: localize("Draft", "草稿") },
  { value: "pending_review", label: localize("Awaiting Review", "等待审核") },
  { value: "approved", label: localize("Approved", "已通过") },
  { value: "rejected", label: localize("Rejected", "已拒绝") },
])

const hasListItems = computed(() => storefrontReviewItems.value.length > 0)
const pendingCount = computed(() => storefrontReviewItems.value.filter((item) => item.store_status === "pending_review").length)
const approvedCount = computed(() => storefrontReviewItems.value.filter((item) => item.store_status === "approved").length)
const featuredCount = computed(() => storefrontReviewItems.value.filter((item) => item.storefront_featured).length)
const featuredItems = computed(() => storefrontReviewItems.value
  .filter((item) => item.storefront_featured)
  .slice()
  .sort((a, b) => Number(a.storefront_sort_order ?? 999) - Number(b.storefront_sort_order ?? 999)))
const emptyStateText = computed(() => {
  if (appliedKeyword.value.trim()) {
    return localize("No creative space matches the current keyword filter.", "没有创作空间符合当前关键词筛选。")
  }
  if (statusFilter.value === "pending_review") {
    return localize("No spaces awaiting review.", "暂无待审核的创意空间。")
  }
  if (statusFilter.value === "approved") {
    return localize("No approved spaces yet.", "暂无已通过的创意空间。")
  }
  if (statusFilter.value === "rejected") {
    return localize("No rejected spaces.", "暂无已拒绝的创意空间。")
  }
  if (statusFilter.value === "draft") {
    return localize("No draft spaces.", "暂无草稿创意空间。")
  }
  return localize("No creative space has been created yet.", "还没有创建任何创作空间。")
})

function formatTimestamp(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

watch(storefrontReviewItems, (items) => {
  items.forEach((item) => {
    const tenantId = item.tenant_id
    if (!(tenantId in reviewNotes)) {
      reviewNotes[tenantId] = String(item.store_review_note || "")
    }
    sortOrders[tenantId] = Number(item.storefront_sort_order ?? 999)
  })
}, { immediate: true })

watch(statusFilter, async () => {
  storefrontReviewPage.value = 1
  await loadStorefrontReviewItems(1)
})

function tenantLabel(item: StorefrontReviewListItem) {
  return String(item.name || item.email || item.tenant_id)
}

function storefrontTitle(item: StorefrontReviewListItem) {
  return String(item.store_name || tenantLabel(item))
}

function storefrontStatusLabel(item: StorefrontReviewListItem) {
  const value = String(item.store_status || "draft")
  if (value === "approved") return localize("Approved", "已通过")
  if (value === "pending_review") return localize("Awaiting Review", "等待审核")
  if (value === "rejected") return localize("Rejected", "已拒绝")
  return localize("Draft", "草稿")
}

function storefrontStatusClass(item: StorefrontReviewListItem) {
  return `status-chip--${String(item.store_status || "draft")}`
}

function storefrontStatusIcon(item: StorefrontReviewListItem) {
  const value = String(item.store_status || "draft")
  if (value === "approved") return "✅"
  if (value === "pending_review") return "⏳"
  if (value === "rejected") return "⛔"
  return "📝"
}

function storefrontFeatureIcon(item: StorefrontReviewListItem) {
  return item.storefront_featured ? "⭐" : "·"
}

function storefrontFeatureLabel(item: StorefrontReviewListItem) {
  return item.storefront_featured ? localize("Live On Homepage", "首页展示中") : localize("Homepage Hidden", "首页隐藏")
}

function storefrontReviewSummary(item: StorefrontReviewListItem) {
  const status = String(item.store_status || "draft")
  if (status === "approved") {
    return item.store_reviewed_at
      ? `Approved on ${item.store_reviewed_at}`
      : localize("Creative space approved. You can choose whether it appears on the home page.", "创作空间已通过审核。你可以决定是否展示在首页。")
  }
  if (status === "rejected") {
    return item.store_review_note || localize("Creative space rejected. The tenant needs to update it before resubmitting.", "创作空间已被拒绝，租户需更新后重新提交。")
  }
  if (status === "pending_review") {
    return item.store_submitted_at
      ? `Submitted on ${item.store_submitted_at}`
      : localize("Waiting for a platform review decision.", "等待平台审核决定。")
  }
  return localize("Draft creative space. It is not ready for review until the tenant submits it.", "创作空间当前为草稿，需由租户提交后才能审核。")
}

function resolvePreviewUrl(item: StorefrontReviewListItem) {
  if (!item.store_slug) return ""
  const query = new URLSearchParams({
    admin_view: "1",
    tenant_id: item.tenant_id,
    tenant_label: tenantLabel(item),
  })
  return `/store/${encodeURIComponent(String(item.store_slug))}?${query.toString()}`
}

function resolvePublicUrl(item: StorefrontReviewListItem) {
  if (!item.store_slug || item.store_status !== "approved") return ""
  return `/store/${encodeURIComponent(String(item.store_slug))}`
}

function canReviewStorefront(item: StorefrontReviewListItem) {
  return item.store_status === "pending_review"
}

function canFeatureStorefront(item: StorefrontReviewListItem) {
  return Boolean(item.store_status === "approved" && item.store_slug)
}

function normalizedSortOrder(item: StorefrontReviewListItem) {
  const current = Number(sortOrders[item.tenant_id] ?? item.storefront_sort_order ?? 999)
  if (!Number.isFinite(current)) return 999
  return Math.max(0, Math.trunc(current))
}

function clearActionFeedback(tenantId: string) {
  delete actionNotices[tenantId]
  delete actionErrors[tenantId]
}

async function loadStorefrontReviewItems(page = storefrontReviewPage.value || 1) {
  if (!isPlatformAdmin.value) return
  await platformStore.loadStorefrontReviewItems(
    {
      page,
      size: PAGE_SIZE,
      keyword: appliedKeyword.value.trim(),
      status: statusFilter.value,
    },
    authStore.authHeaders,
  )
}

async function refreshList() {
  await loadStorefrontReviewItems(storefrontReviewPage.value || 1)
}

async function applySearch() {
  appliedKeyword.value = searchInput.value.trim()
  storefrontReviewPage.value = 1
  await loadStorefrontReviewItems(1)
}

async function handlePageChange(page: number) {
  storefrontReviewPage.value = page
  await loadStorefrontReviewItems(page)
}

async function reviewStorefront(item: StorefrontReviewListItem, decision: "approve" | "reject") {
  if (busyReviewTenantId.value || !canReviewStorefront(item)) return
  const tenantId = item.tenant_id
  const note = String(reviewNotes[tenantId] || "").trim()
  clearActionFeedback(tenantId)
  if (decision === "reject" && !note) {
    actionErrors[tenantId] = localize("Add a clear review note before rejecting this creative space.", "拒绝该创作空间前请填写清晰的审核备注。")
    return
  }
  busyReviewTenantId.value = tenantId
  try {
    await platformStore.reviewTenantStorefront(tenantId, decision, note, authStore.authHeaders)
    if (decision === "approve") {
      reviewNotes[tenantId] = ""
    }
    actionNotices[tenantId] = decision === "approve"
      ? localize("Creative space approved. It is now eligible for homepage placement.", "创作空间已通过审核，现在可设置首页展示。")
      : localize("Creative space rejected. The tenant can revise it and submit again.", "创作空间已被拒绝，租户可修改后再次提交。")
    await refreshList()
  } catch (reviewError) {
    actionErrors[tenantId] = String((reviewError as Error)?.message || reviewError || localize("Unable to save the review decision.", "无法保存审核决定。"))
  } finally {
    busyReviewTenantId.value = ""
  }
}

async function toggleStorefrontFeature(item: StorefrontReviewListItem, featured: boolean) {
  if (busyFeatureTenantId.value) return
  const tenantId = item.tenant_id
  clearActionFeedback(tenantId)
  busyFeatureTenantId.value = tenantId
  try {
    const nextSortOrder = normalizedSortOrder(item)
    sortOrders[tenantId] = nextSortOrder
    await platformStore.updateTenantStorefrontFeature(
      tenantId,
      featured,
      nextSortOrder,
      authStore.authHeaders,
    )
    actionNotices[tenantId] = featured
      ? localize("Creative space is now visible in the homepage section.", "创作空间现已显示在首页创作空间区域。")
      : localize("Creative space has been removed from the homepage section.", "创作空间已从首页创作空间区域移除。")
    await refreshList()
  } catch (featureError) {
    actionErrors[tenantId] = String((featureError as Error)?.message || featureError || localize("Unable to update homepage visibility.", "无法更新首页显示状态。"))
  } finally {
    busyFeatureTenantId.value = ""
  }
}

onMounted(() => {
  loadStorefrontReviewItems(1).catch(() => undefined)
})
</script>

<template>
  <TenantStorefrontSettingsPage v-if="!isPlatformAdmin" />
  <div v-else class="storefront-review-page" data-testid="admin-storefront-review-page">
    <section class="page-header">
      <div class="header-copy">
        <span class="page-kicker">{{ localize("Admin", "管理") }}</span>
        <h1 class="page-title">
          <span class="page-emoji" aria-hidden="true">🏪</span>
          {{ localize("Creative Space Review", "创作空间审核") }}
        </h1>
        <p class="page-subtitle">{{ localize("Approve tenant submissions and feature spaces on the home page.", "审核租户提交，挑选要在首页推荐的创作空间。") }}</p>
      </div>
      <div class="header-summary">
        <article class="summary-pill">
          <span>{{ localize("Shown Here", "当前显示") }}</span>
          <strong>{{ storefrontReviewItems.length }}</strong>
        </article>
        <article class="summary-pill">
          <span>{{ localize("Awaiting Review", "等待审核") }}</span>
          <strong>{{ pendingCount }}</strong>
        </article>
        <article class="summary-pill">
          <span>{{ localize("Approved", "已通过") }}</span>
          <strong>{{ approvedCount }}</strong>
        </article>
        <article class="summary-pill">
          <span>{{ localize("Featured", "已精选") }}</span>
          <strong>{{ featuredCount }}</strong>
        </article>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" data-testid="storefront-review-refresh-button" @click="refreshList">
          {{ localize("Refresh", "刷新") }}
        </button>
      </div>
    </section>

    <section class="review-card">
      <div class="card-head">
        <div>
          <h2>{{ localize("Storefront Queue", "店铺队列") }}</h2>
          <p>{{ localize("Search by tenant, store, or slug, filter by review state, and complete moderation from one list.", "按租户、店铺或 slug 搜索，按审核状态筛选，并在一个列表中完成审核操作。") }}</p>
        </div>
      </div>
      <div class="card-body">
        <div class="review-controls">
          <label class="search-field">
            <span>{{ localize("Search", "搜索") }}</span>
            <input
              v-model="searchInput"
              class="form-input"
              data-testid="storefront-review-search-input"
              type="search"
              :placeholder="localize('Search tenant, email, slug, or store name', '搜索租户、邮箱、slug 或店铺名称')"
              @keyup.enter="applySearch"
            />
          </label>
          <button type="button" class="btn-secondary" data-testid="storefront-review-search-button" @click="applySearch">
            {{ localize("Search", "搜索") }}
          </button>
          <div class="status-filter" data-testid="storefront-review-status-filter">
            <span>{{ localize("Status", "状态") }}</span>
            <FilterDropdown v-model="statusFilter" :options="reviewStatusOptions" />
          </div>
        </div>
        <div v-if="error" class="storefront-action-banner error">{{ error }}</div>
        <div v-if="loading && !hasListItems" class="review-loading">{{ localize("Loading storefront review items...", "正在加载店铺审核数据...") }}</div>
        <div v-else-if="!hasListItems" class="review-empty" data-testid="storefront-review-empty">
          {{ emptyStateText }}
        </div>
        <div v-else class="review-list" data-testid="storefront-review-list">
          <article
            v-for="item in storefrontReviewItems"
            :key="item.tenant_id"
            class="review-item"
            data-testid="storefront-review-item"
          >
            <div class="review-item-head">
              <div class="review-item-copy">
                <div class="review-item-title-row">
                  <h3>{{ storefrontTitle(item) }}</h3>
                  <span class="status-chip" :class="storefrontStatusClass(item)">
                    <span class="chip-emoji" aria-hidden="true">{{ storefrontStatusIcon(item) }}</span>
                    {{ storefrontStatusLabel(item) }}
                  </span>
                  <span class="feature-chip" :class="{ active: item.storefront_featured }">
                    <span class="chip-emoji" aria-hidden="true">{{ storefrontFeatureIcon(item) }}</span>
                    {{ storefrontFeatureLabel(item) }}
                  </span>
                </div>
                <p>{{ tenantLabel(item) }} · {{ item.email }}</p>
                <p>{{ item.store_slug ? `/store/${item.store_slug}` : localize("Store slug not configured", "店铺 slug 未设置") }}</p>
              </div>
              <div class="link-actions">
                <a
                  v-if="resolvePreviewUrl(item)"
                  :href="resolvePreviewUrl(item)"
                  class="btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ localize("Open Review Preview", "打开审核预览") }}
                </a>
                <a
                  v-if="resolvePublicUrl(item)"
                  :href="resolvePublicUrl(item)"
                  class="btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ localize("Open Public Store", "打开公开店铺") }}
                </a>
              </div>
            </div>

            <div v-if="actionErrors[item.tenant_id]" class="storefront-action-banner error">
              {{ actionErrors[item.tenant_id] }}
            </div>
            <div v-else-if="actionNotices[item.tenant_id]" class="storefront-action-banner success">
              {{ actionNotices[item.tenant_id] }}
            </div>

            <div class="review-grid">
              <section class="review-panel">
                <span class="panel-label">{{ localize("Review Snapshot", "审核概览") }}</span>
                <strong class="panel-title">{{ storefrontReviewSummary(item) }}</strong>
                <div class="detail-list">
                  <div class="detail-row">
                    <span>{{ localize("Submitted", "提交时间") }}</span>
                    <strong>{{ formatTimestamp(item.store_submitted_at) || localize("Not submitted", "未提交") }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ localize("Reviewed At", "审核时间") }}</span>
                    <strong>{{ formatTimestamp(item.store_reviewed_at) || localize("No review decision yet", "暂无审核结果") }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ localize("Reviewer", "审核人") }}</span>
                    <strong>{{ item.store_reviewer_email || localize("Pending", "待定") }}</strong>
                  </div>
                  <div class="detail-row detail-row--note">
                    <span>{{ localize("Review Note", "审核备注") }}</span>
                    <strong>{{ item.store_review_note || localize("No review note yet", "暂无审核备注") }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ localize("Homepage Status", "首页状态") }}</span>
                    <strong>{{ storefrontFeatureLabel(item) }} · Sort order #{{ normalizedSortOrder(item) }}</strong>
                  </div>
                </div>
              </section>

              <section class="review-panel review-panel--actions">
                <span class="panel-label">{{ localize("Moderation Actions", "审核操作") }}</span>
                <div class="review-actions">
                  <label class="review-field review-note-field">
                    <span>{{ localize("Review Note", "审核备注") }}</span>
                    <input
                      v-model="reviewNotes[item.tenant_id]"
                      type="text"
                      class="form-input"
                      :placeholder="canReviewStorefront(item) ? localize('Add approval context or the reason for rejection', '填写通过说明或拒绝原因') : localize('Review note is only needed while a storefront is awaiting review', '仅在店铺等待审核时需要填写备注')"
                    />
                  </label>
                  <label class="review-field sort-order-field">
                    <span>{{ localize("Homepage Order", "首页排序") }}</span>
                    <input
                      v-model.number="sortOrders[item.tenant_id]"
                      type="number"
                      min="0"
                      step="1"
                      class="form-input"
                    />
                  </label>
                </div>
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-secondary"
                    :disabled="busyReviewTenantId === item.tenant_id || !canReviewStorefront(item)"
                    @click="reviewStorefront(item, 'approve')"
                  >
                    {{ busyReviewTenantId === item.tenant_id ? localize("Saving...", "保存中...") : localize("Approve", "通过") }}
                  </button>
                  <button
                    type="button"
                    class="btn-secondary"
                    :disabled="busyReviewTenantId === item.tenant_id || !canReviewStorefront(item) || !String(reviewNotes[item.tenant_id] || '').trim()"
                    @click="reviewStorefront(item, 'reject')"
                  >
                    {{ busyReviewTenantId === item.tenant_id ? localize("Saving...", "保存中...") : localize("Reject", "拒绝") }}
                  </button>
                  <button
                    type="button"
                    class="btn-secondary"
                    :disabled="busyFeatureTenantId === item.tenant_id || !canFeatureStorefront(item) || Boolean(item.storefront_featured)"
                    @click="toggleStorefrontFeature(item, true)"
                  >
                    {{ busyFeatureTenantId === item.tenant_id && !item.storefront_featured ? localize("Saving...", "保存中...") : localize("Show On Homepage", "显示在首页") }}
                  </button>
                  <button
                    type="button"
                    class="btn-primary"
                    :disabled="busyFeatureTenantId === item.tenant_id || !item.storefront_featured"
                    @click="toggleStorefrontFeature(item, false)"
                  >
                    {{ busyFeatureTenantId === item.tenant_id && item.storefront_featured ? localize("Saving...", "保存中...") : localize("Hide From Homepage", "从首页隐藏") }}
                  </button>
                </div>
              </section>
            </div>
          </article>
        </div>
        <PaginationBar
          v-if="storefrontReviewTotal"
          :current-page="storefrontReviewPage"
          :total-pages="Math.max(storefrontReviewPages, 1)"
          :total-items="storefrontReviewTotal"
          :page-size="PAGE_SIZE"
          @update:current-page="handlePageChange"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.storefront-review-page {
  display: grid;
  gap: 1.5rem;
}

.page-header,
.review-card {
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.06);
}

.page-header {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 1fr) auto;
  align-items: start;
  gap: 1rem 1.25rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #f6f8ff 100%);
}

.page-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.page-title {
  margin: 0.7rem 0 0.35rem;
  font-size: 2rem;
  line-height: 1.05;
  color: #0f172a;
}

.page-emoji {
  display: inline-block;
  margin-right: 0.4rem;
}

.chip-emoji {
  margin-right: 0.3rem;
}

.page-subtitle {
  margin: 0;
  max-width: 620px;
  color: #475569;
}

.header-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-pill {
  border: 1px solid #dbe3f0;
  border-radius: 18px;
  padding: 0.9rem 1rem;
  background: rgba(255, 255, 255, 0.88);
  display: grid;
  gap: 0.25rem;
}

.summary-pill span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-pill strong {
  color: #0f172a;
  font-size: 1.35rem;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.2rem 1.4rem 0;
}

.card-head h2 {
  margin: 0;
  font-size: 1.1rem;
}

.card-head p {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.card-body {
  display: grid;
  gap: 1.1rem;
  padding: 1.2rem 1.4rem 1.5rem;
}

.review-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.9rem;
}

.search-field,
.status-filter,
.review-field {
  display: grid;
  gap: 0.4rem;
}

.search-field {
  flex: 1 1 320px;
}

.status-filter {
  min-width: 220px;
}

.search-field span,
.status-filter span,
.review-field span {
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
}

.form-input {
  min-height: 44px;
  width: 100%;
  padding: 0.72rem 0.9rem;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
}

.review-loading,
.review-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
  padding: 1rem 1.1rem;
  background: #f8fafc;
  color: #475569;
}

.review-list {
  display: grid;
  gap: 1.1rem;
}

.review-item {
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  padding: 1.15rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  display: grid;
  gap: 1rem;
}

.review-item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.review-item-copy {
  display: grid;
  gap: 0.42rem;
}

.review-item-copy h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.review-item-copy p {
  margin: 0;
  color: #475569;
  word-break: break-word;
}

.review-item-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.75rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-chip--pending_review {
  background: #fef3c7;
  color: #92400e;
}

.status-chip--approved {
  background: #dcfce7;
  color: #166534;
}

.status-chip--rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.status-chip--draft {
  background: #e2e8f0;
  color: #334155;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.75rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.78rem;
  font-weight: 700;
}

.feature-chip.active {
  background: #ecfdf5;
  color: #047857;
}

.link-actions,
.review-actions,
.header-actions,
.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.review-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 1rem;
}

.review-panel {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1rem;
  background: #fff;
  display: grid;
  gap: 0.85rem;
}

.review-panel--actions {
  align-content: start;
}

.panel-label {
  color: #64748b;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800;
}

.panel-title {
  color: #0f172a;
  font-size: 1rem;
  line-height: 1.55;
}

.detail-list {
  display: grid;
  gap: 0.7rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid #eef2f7;
}

.detail-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detail-row span {
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 700;
}

.detail-row strong {
  color: #0f172a;
  font-size: 0.9rem;
  text-align: right;
  word-break: break-word;
}

.detail-row--note strong {
  max-width: 70%;
}

.review-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: 0.9rem;
  align-items: end;
}

.review-note-field {
  min-width: 0;
}

.sort-order-field {
  width: 100%;
}

.storefront-action-banner {
  border-radius: 14px;
  padding: 0.9rem 1rem;
  font-weight: 600;
}

.storefront-action-banner.success {
  background: #ecfdf5;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.storefront-action-banner.error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  text-decoration: none;
  cursor: pointer;
}

.btn-primary {
  background: #4f46e5;
  color: #fff;
}

.btn-secondary {
  background: #fff;
  color: #0f172a;
  border-color: #cbd5e1;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 960px) {
  .page-header,
  .review-item-head,
  .review-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    grid-template-columns: 1fr;
  }

  .review-actions {
    grid-template-columns: 1fr;
  }

  .header-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .header-summary {
    grid-template-columns: 1fr;
  }

  .detail-row,
  .review-item-head {
    flex-direction: column;
  }

  .detail-row strong {
    text-align: left;
  }

  .detail-row--note strong {
    max-width: none;
  }
}
</style>
