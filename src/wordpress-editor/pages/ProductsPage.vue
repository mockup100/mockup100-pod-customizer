<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import {
  fetchPublicProductCategories,
  fetchPublicProducts,
  type PublicProductCategoryNode,
  type PublicProductFilterOption,
  type PublicProductSummary,
} from "../api/productsPublic"

const { t, locale } = useI18n()
const router = useRouter()

const loading = ref(false)
const error = ref("")
const products = ref<PublicProductSummary[]>([])
const categories = ref<PublicProductCategoryNode[]>([])
const expandedCategoryIds = ref<string[]>([])
const activeCategory = ref("")
const showMoreFilters = ref(false)
const pageInput = ref("1")
const brokenImageUrls = ref<string[]>([])
const publicFilters = ref({
  purchasePriceRanges: [] as PublicProductFilterOption[],
  packagingWeightRanges: [] as PublicProductFilterOption[],
})
const pagination = ref({
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
})
const filters = ref({
  keyword: "",
  categoryId: "",
  purchasePriceRange: "",
  packagingWeightRange: "",
  sortField: "published_at",
  sortDirection: "desc",
})

const pageSizeOptions = [20, 50, 100]
const priceOptions = computed(() => withAllOption(publicFilters.value.purchasePriceRanges))
const weightOptions = computed(() => withAllOption(publicFilters.value.packagingWeightRanges))
const visibleProducts = computed(() => products.value.filter((item) => String(item.finishedProductCode || "").trim()))
const visiblePages = computed(() => {
  const totalPages = pagination.value.totalPages
  const currentPage = pagination.value.page
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
  const safeStart = Math.max(1, start)
  const end = Math.min(totalPages, safeStart + 4)
  return Array.from({ length: Math.max(0, end - safeStart + 1) }, (_, index) => safeStart + index)
})

watch(
  () => pagination.value.page,
  (value) => {
    pageInput.value = String(value)
  },
  { immediate: true },
)

watch(
  () => [categories.value, filters.value.categoryId] as const,
  ([nodes, categoryId]) => {
    activeCategory.value = categoryId || ""
    if (!nodes.length || !categoryId) return
    expandCategoryPath(categoryId)
  },
  { deep: true, immediate: true },
)

function withAllOption(options: PublicProductFilterOption[]) {
  return [{ key: "", label: t("common.all") }, ...options.filter((item) => item.key !== "all")]
}

async function loadProducts(page = 1) {
  loading.value = true
  error.value = ""
  brokenImageUrls.value = []
  try {
    const [listView, categoryTree] = await Promise.all([
      fetchPublicProducts({
        keyword: filters.value.keyword.trim() || undefined,
        categoryId: filters.value.categoryId || undefined,
        purchasePriceRange: filters.value.purchasePriceRange || undefined,
        packagingWeightRange: filters.value.packagingWeightRange || undefined,
        sortField: filters.value.sortField,
        sortDirection: filters.value.sortDirection,
        page,
        pageSize: pagination.value.pageSize,
      }),
      fetchPublicProductCategories().catch(() => []),
    ])

    products.value = listView.items || []
    categories.value = categoryTree.length ? categoryTree : (listView.categories || [])
    publicFilters.value = {
      purchasePriceRanges: listView.filters?.purchasePriceRanges || [],
      packagingWeightRanges: listView.filters?.packagingWeightRanges || [],
    }
    pagination.value = {
      page: listView.pagination?.page || page,
      pageSize: listView.pagination?.pageSize || pagination.value.pageSize,
      total: listView.pagination?.total || 0,
      totalPages: Math.max(1, listView.pagination?.totalPages || 1),
    }
  } catch (loadError) {
    error.value = String((loadError as Error)?.message || loadError || t("products.empty"))
  } finally {
    loading.value = false
  }
}

function resolveCategoryName(category: PublicProductCategoryNode) {
  return locale.value === "zh"
    ? (category.name || category.nameEn || "")
    : (category.nameEn || category.name || "")
}

function resolveProductName(product: PublicProductSummary) {
  return locale.value === "zh"
    ? (product.finishedProductCode || product.productName || product.productNameEn || "")
    : (product.finishedProductCode || product.productNameEn || product.productName || "")
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-"
  return `$${Number(value).toFixed(2)}`
}

function formatDelivery(product: PublicProductSummary) {
  if (product.deliveryTimeText?.trim()) return product.deliveryTimeText.trim()
  if (product.deliveryDays && Number(product.deliveryDays) > 0) return `${product.deliveryDays}-${product.deliveryDays}${t("products.days")}`
  return "-"
}

function openProduct(product: PublicProductSummary) {
  void router.push(`/products/${encodeURIComponent(product.finishedProductCode)}`)
}

function isImageBroken(url: string) {
  return Boolean(url && brokenImageUrls.value.includes(url))
}

function markImageBroken(url: string) {
  if (!url || brokenImageUrls.value.includes(url)) return
  brokenImageUrls.value = [...brokenImageUrls.value, url]
}

function applyFilters() {
  pagination.value.page = 1
  void loadProducts(1)
}

function resetFilters() {
  filters.value = {
    keyword: "",
    categoryId: "",
    purchasePriceRange: "",
    packagingWeightRange: "",
    sortField: "published_at",
    sortDirection: "desc",
  }
  activeCategory.value = ""
  showMoreFilters.value = false
  pagination.value.page = 1
  void loadProducts(1)
}

function selectAllCategories() {
  activeCategory.value = ""
  filters.value.categoryId = ""
  applyFilters()
}

function selectCategory(categoryId: string) {
  activeCategory.value = categoryId
  filters.value.categoryId = categoryId
  expandCategoryPath(categoryId)
  applyFilters()
}

function selectPriceRange(rangeKey: string) {
  filters.value.purchasePriceRange = rangeKey
  applyFilters()
}

function selectWeightRange(rangeKey: string) {
  filters.value.packagingWeightRange = rangeKey
  applyFilters()
}

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > pagination.value.totalPages || nextPage === pagination.value.page) return
  pagination.value.page = nextPage
  void loadProducts(nextPage)
}

function changePageSize(event: Event) {
  const nextSize = Number((event.target as HTMLSelectElement).value || pagination.value.pageSize)
  if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === pagination.value.pageSize) return
  pagination.value.pageSize = nextSize
  pagination.value.page = 1
  void loadProducts(1)
}

function goToPage() {
  const nextPage = Math.max(1, Math.min(pagination.value.totalPages, Number(pageInput.value || "1")))
  pageInput.value = String(nextPage)
  pagination.value.page = nextPage
  void loadProducts(nextPage)
}

function isCategorySelected(categoryId: string) {
  return activeCategory.value === categoryId
}

function isExpanded(categoryId: string) {
  return expandedCategoryIds.value.includes(categoryId)
}

function toggleCategory(categoryId: string) {
  expandedCategoryIds.value = isExpanded(categoryId)
    ? expandedCategoryIds.value.filter((item) => item !== categoryId)
    : [...expandedCategoryIds.value, categoryId]
}

function findCategoryPath(targetId: string, nodes: PublicProductCategoryNode[], ancestors: string[] = []): string[] {
  for (const node of nodes) {
    const path = [...ancestors, node.categoryId]
    if (node.categoryId === targetId) return path
    if (node.children?.length) {
      const matched = findCategoryPath(targetId, node.children, path)
      if (matched.length) return matched
    }
  }
  return []
}

function expandCategoryPath(categoryId: string) {
  if (!categoryId) return
  const path = findCategoryPath(categoryId, categories.value)
  if (!path.length) return
  expandedCategoryIds.value = Array.from(new Set([...expandedCategoryIds.value, ...path.slice(0, -1)]))
}

onMounted(() => {
  void loadProducts(1)
})
</script>

<template>
  <div class="products-reference">
    <div class="products-reference__breadcrumb">product/<span>Product List</span></div>
    <div class="products-reference__shell">
      <aside class="products-reference__sidebar">
        <button
          type="button"
          class="products-reference__all-button"
          :class="{ 'is-active': !activeCategory }"
          :aria-pressed="!activeCategory"
          @click="selectAllCategories"
        >
          {{ t("products.allCategories") }}
        </button>

        <div class="products-reference__category-tree">
          <div v-for="level1 in categories" :key="level1.categoryId" class="products-reference__category-group">
            <div class="products-reference__category-row">
              <button
                v-if="level1.children?.length"
                type="button"
                class="products-reference__toggle"
                :class="{ 'is-expanded': isExpanded(level1.categoryId) }"
                @click="toggleCategory(level1.categoryId)"
              >
                ▶
              </button>
              <span v-else class="products-reference__toggle products-reference__toggle--empty" />
              <button
                type="button"
                class="products-reference__category-button products-reference__category-button--level1"
                :class="{ 'is-active': isCategorySelected(level1.categoryId) }"
                :aria-pressed="isCategorySelected(level1.categoryId)"
                @click="selectCategory(level1.categoryId)"
              >
                {{ resolveCategoryName(level1) }}
              </button>
            </div>

            <div v-if="level1.children?.length && isExpanded(level1.categoryId)" class="products-reference__children">
              <div v-for="level2 in level1.children" :key="level2.categoryId" class="products-reference__category-group">
                <div class="products-reference__category-row">
                  <button
                    v-if="level2.children?.length"
                    type="button"
                    class="products-reference__toggle"
                    :class="{ 'is-expanded': isExpanded(level2.categoryId) }"
                    @click="toggleCategory(level2.categoryId)"
                  >
                    ▶
                  </button>
                  <span v-else class="products-reference__toggle products-reference__toggle--empty" />
                  <button
                    type="button"
                    class="products-reference__category-button products-reference__category-button--level2"
                    :class="{ 'is-active': isCategorySelected(level2.categoryId) }"
                    :aria-pressed="isCategorySelected(level2.categoryId)"
                    @click="selectCategory(level2.categoryId)"
                  >
                    {{ resolveCategoryName(level2) }}
                  </button>
                </div>

                <div v-if="level2.children?.length && isExpanded(level2.categoryId)" class="products-reference__children">
                  <button
                    v-for="level3 in level2.children"
                    :key="level3.categoryId"
                    type="button"
                    class="products-reference__category-button products-reference__category-button--level3"
                    :class="{ 'is-active': isCategorySelected(level3.categoryId) }"
                    :aria-pressed="isCategorySelected(level3.categoryId)"
                    @click="selectCategory(level3.categoryId)"
                  >
                    {{ resolveCategoryName(level3) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="products-reference__content">
        <section class="products-reference__filters">
          <div class="products-reference__filter-row">
            <label class="products-reference__filter-label">{{ t("products.purchasePriceLabel") }}</label>
            <div class="products-reference__pills">
              <button
                v-for="option in priceOptions"
                :key="option.key || 'price-all'"
                type="button"
                class="products-reference__pill"
                :class="{ 'is-active': filters.purchasePriceRange === option.key }"
                @click="selectPriceRange(option.key)"
              >
                {{ option.label }}
              </button>
            </div>
            <button type="button" class="products-reference__more" @click="showMoreFilters = !showMoreFilters">
              {{ showMoreFilters ? t("products.packUp") : t("products.more") }}
            </button>
          </div>

          <div v-if="showMoreFilters" class="products-reference__expanded-panel">
            <input type="text" :placeholder="t('products.expandedSearchPlaceholder')">
          </div>

          <div class="products-reference__filter-row">
            <label class="products-reference__filter-label">{{ t("products.packagingWeightLabel") }}</label>
            <div class="products-reference__pills">
              <button
                v-for="option in weightOptions"
                :key="option.key || 'weight-all'"
                type="button"
                class="products-reference__pill"
                :class="{ 'is-active': filters.packagingWeightRange === option.key }"
                @click="selectWeightRange(option.key)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="products-reference__filter-row products-reference__filter-row--search">
            <label class="products-reference__filter-label">{{ t("products.productNameLabel") }}</label>
            <div class="products-reference__search-bar">
              <input
                v-model="filters.keyword"
                type="text"
                :placeholder="t('products.keywordPlaceholder')"
                @keyup.enter="applyFilters"
              >
              <button type="button" class="products-reference__primary-btn" @click="applyFilters">{{ t("common.search") }}</button>
              <button type="button" class="products-reference__secondary-btn" @click="resetFilters">{{ t("common.reset") }}</button>
            </div>
          </div>
        </section>

        <div class="products-reference__table-head">
          <div class="products-reference__table-cell products-reference__table-cell--status">
            <button type="button" class="products-reference__status-button">{{ t("products.online") }}</button>
          </div>
          <div class="products-reference__table-cell">{{ t("products.productColumn") }}</div>
          <div class="products-reference__table-cell">{{ t("products.codeColumn") }}</div>
          <div class="products-reference__table-cell">{{ t("products.purchaseColumn") }}</div>
        </div>

        <div v-if="error" class="products-reference__notice products-reference__notice--error">{{ error }}</div>
        <div v-else-if="loading" class="products-reference__notice">{{ t("products.loadingList") }}</div>
        <div v-else-if="!visibleProducts.length" class="products-reference__notice">{{ t("products.empty") }}</div>

        <div v-else class="products-reference__grid">
          <article
            v-for="product in visibleProducts"
            :key="product.productId"
            class="products-reference__card"
            @click="openProduct(product)"
          >
            <div class="products-reference__card-image-wrap">
              <img
                v-if="product.primaryImageUrl && !isImageBroken(product.primaryImageUrl)"
                :src="product.primaryImageUrl"
                :alt="resolveProductName(product)"
                class="products-reference__card-image"
                @error="markImageBroken(product.primaryImageUrl)"
              >
              <div v-else class="products-reference__card-placeholder">
                <strong>{{ product.finishedProductCode || "P" }}</strong>
                <span>{{ t("products.noImage") }}</span>
              </div>
            </div>
            <div class="products-reference__card-body">
              <strong class="products-reference__card-code">{{ product.finishedProductCode }}</strong>
              <div class="products-reference__card-price">{{ formatMoney(product.purchasePrice) }}</div>
              <div class="products-reference__card-delivery">{{ t("products.deliveryLine") }} {{ formatDelivery(product) }}</div>
            </div>
          </article>
        </div>

        <footer class="products-reference__pagination">
          <span class="products-reference__pagination-total">{{ t("products.totalArticleData", { count: pagination.total }) }}</span>
          <div class="products-reference__pagination-controls">
            <button type="button" class="products-reference__page-btn" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">‹</button>
            <button
              v-for="page in visiblePages"
              :key="page"
              type="button"
              class="products-reference__page-btn"
              :class="{ 'is-active': page === pagination.page }"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
            <button type="button" class="products-reference__page-btn" :disabled="pagination.page >= pagination.totalPages" @click="changePage(pagination.page + 1)">›</button>
            <select class="products-reference__page-size" :value="pagination.pageSize" @change="changePageSize">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} / page</option>
            </select>
            <label class="products-reference__go-to">
              {{ t("products.goTo") }}
              <input v-model="pageInput" type="number" min="1" :max="pagination.totalPages" @keyup.enter="goToPage">
              {{ t("products.pageSuffix") }}
            </label>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.products-reference {
  min-height: 100vh;
  background: #f2f2f2;
  padding: 12px 0 40px;
}

.products-reference__breadcrumb {
  max-width: 1360px;
  margin: 0 auto 8px;
  padding: 0 12px;
  color: #8b8b8b;
  font-size: 12px;
}

.products-reference__breadcrumb span {
  color: #3f86ff;
}

.products-reference__shell {
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.products-reference__sidebar {
  background: #efefef;
  border-right: 1px solid #d7d7d7;
  min-height: calc(100vh - 130px);
}

.products-reference__all-button {
  width: 100%;
  height: 31px;
  border: none;
  background: #2d7df6;
  color: #fff;
  font-size: 12px;
  text-align: left;
  padding: 0 12px;
  cursor: pointer;
}

.products-reference__all-button.is-active {
  background: #2d7df6;
}

.products-reference__category-tree {
  padding: 6px 0;
}

.products-reference__category-group + .products-reference__category-group {
  margin-top: 2px;
}

.products-reference__category-row {
  display: flex;
  align-items: center;
}

.products-reference__children {
  padding-left: 18px;
}

.products-reference__toggle {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #6d6d6d;
  font-size: 10px;
  cursor: pointer;
  transform-origin: center;
}

.products-reference__toggle.is-expanded {
  transform: rotate(90deg);
}

.products-reference__toggle--empty {
  cursor: default;
}

.products-reference__category-button {
  flex: 1;
  border: none;
  background: transparent;
  min-height: 26px;
  padding: 0 6px;
  color: #666;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.products-reference__category-button.is-active {
  color: #2d7df6;
  font-weight: 600;
}

.products-reference__category-button--level1 {
  color: #5d5d5d;
}

.products-reference__content {
  background: transparent;
}

.products-reference__filters {
  background: #f7f7f7;
  border: 1px solid #e2e2e2;
  padding: 12px 12px 10px;
}

.products-reference__filter-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  margin-bottom: 10px;
}

.products-reference__filter-row--search {
  grid-template-columns: 88px minmax(0, 1fr);
  margin-bottom: 0;
}

.products-reference__filter-label {
  color: #5a5a5a;
  font-size: 12px;
  line-height: 28px;
}

.products-reference__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.products-reference__pill,
.products-reference__more,
.products-reference__primary-btn,
.products-reference__secondary-btn,
.products-reference__status-button,
.products-reference__page-btn,
.products-reference__page-size {
  min-height: 28px;
  border-radius: 2px;
  font-size: 12px;
}

.products-reference__pill {
  border: 1px solid #d8d8d8;
  background: #fff;
  color: #666;
  padding: 0 14px;
  cursor: pointer;
}

.products-reference__pill.is-active {
  background: #2d7df6;
  border-color: #2d7df6;
  color: #fff;
}

.products-reference__more,
.products-reference__secondary-btn,
.products-reference__page-btn,
.products-reference__page-size {
  border: 1px solid #d8d8d8;
  background: #fff;
  color: #666;
  padding: 0 12px;
}

.products-reference__expanded-panel {
  margin: -4px 0 10px 96px;
  border: 1px solid #ddd;
  background: #fff;
  padding: 10px;
}

.products-reference__expanded-panel input,
.products-reference__search-bar input,
.products-reference__go-to input {
  width: 100%;
  min-height: 28px;
  border: 1px solid #ddd;
  background: #fff;
  padding: 0 10px;
  font-size: 12px;
  color: #666;
}

.products-reference__search-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.products-reference__search-bar input {
  max-width: 260px;
}

.products-reference__primary-btn,
.products-reference__status-button {
  border: 1px solid #2d7df6;
  background: #2d7df6;
  color: #fff;
  padding: 0 14px;
}

.products-reference__table-head {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 72px 1.2fr 1fr 88px;
  align-items: center;
  min-height: 36px;
  padding: 0 10px;
  border-top: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  color: #a1a1a1;
  font-size: 12px;
}

.products-reference__table-cell--status {
  display: flex;
}

.products-reference__status-button {
  min-width: 58px;
  justify-content: center;
}

.products-reference__notice {
  margin-top: 10px;
  border: 1px solid #ddd;
  background: #fff;
  padding: 18px;
  color: #666;
  font-size: 12px;
}

.products-reference__notice--error {
  color: #b42318;
  background: #fff4f2;
}

.products-reference__grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.products-reference__card {
  border: 1px solid #dbdbdb;
  background: #fff;
  cursor: pointer;
}

.products-reference__card-image-wrap {
  aspect-ratio: 1 / 1;
  background: #fafafa;
  display: grid;
  place-items: center;
}

.products-reference__card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.products-reference__card-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #b6b6b6;
  font-size: 12px;
}

.products-reference__card-placeholder strong {
  color: #9c9c9c;
  font-size: 22px;
  font-weight: 700;
}

.products-reference__card-body {
  padding: 10px 8px 12px;
}

.products-reference__card-code {
  display: block;
  color: #454545;
  font-size: 14px;
  font-weight: 700;
}

.products-reference__card-price {
  margin-top: 6px;
  color: #f2a437;
  font-size: 13px;
  font-weight: 700;
}

.products-reference__card-delivery {
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.products-reference__pagination {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  align-items: center;
  color: #666;
  font-size: 12px;
}

.products-reference__pagination-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.products-reference__page-btn.is-active {
  border-color: #2d7df6;
  color: #2d7df6;
  background: #f4f8ff;
}

.products-reference__page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.products-reference__page-size {
  min-width: 78px;
}

.products-reference__go-to {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.products-reference__go-to input {
  width: 52px;
}

@media (max-width: 1280px) {
  .products-reference__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .products-reference__shell {
    grid-template-columns: 1fr;
  }

  .products-reference__sidebar {
    min-height: auto;
  }

  .products-reference__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .products-reference {
    padding-inline: 10px;
  }

  .products-reference__filter-row,
  .products-reference__filter-row--search {
    grid-template-columns: 1fr;
  }

  .products-reference__expanded-panel {
    margin-left: 0;
  }

  .products-reference__search-bar {
    flex-wrap: wrap;
  }

  .products-reference__search-bar input {
    max-width: none;
  }

  .products-reference__table-head,
  .products-reference__pagination {
    display: block;
  }

  .products-reference__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
