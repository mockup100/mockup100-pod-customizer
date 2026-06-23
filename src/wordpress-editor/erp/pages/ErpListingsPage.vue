<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import {
  buildErpListingExportPath,
  downloadErpListingCsv,
  fetchErpListingDetail,
  fetchErpListings,
  syncErpListing,
} from "../api"
import type { ErpListingActionEntry, ErpListingDetail, ErpListingListView, ErpListingSummary } from "../types"
import { useUiLocaleStore } from "../../stores/uiLocale"

const uiLocaleStore = useUiLocaleStore()

const listView = ref<ErpListingListView | null>(null)
const selected = ref<ErpListingDetail | null>(null)
const loading = ref(false)
const syncing = ref(false)
const exporting = ref(false)
const error = ref("")
const keyword = ref("")
const publicNameKeyword = ref("")
const startDate = ref("")
const endDate = ref("")
const channelFilter = ref("all")
const syncStatusFilter = ref("all")
const listingStatusFilter = ref("all")
const shopFilter = ref("all")
const themeFilter = ref("all")
const designerFilter = ref("all")
const exportDecisionFilter = ref("all")
const activeQuickAction = ref<ErpListingActionEntry | null>(null)
const queuedListingIds = ref<string[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const selectedListingIds = ref<string[]>([])

const selectedListingId = computed(() => selected.value?.listingId ?? "")
const queuedListingCount = computed(() => queuedListingIds.value.length)
const selectedIsQueued = computed(() =>
  selected.value ? queuedListingIds.value.includes(selected.value.listingId) : false,
)
const isEnglish = computed(() => uiLocaleStore.locale === "en")

function containsCjk(value: string) {
  return /[\u4e00-\u9fff]/.test(value)
}

function preferEnglishLabel(label: string, fallback: string) {
  if (!isEnglish.value) return label
  if (!label.trim()) return fallback
  return containsCjk(label) ? fallback : label
}

function resolveDesignerLabel(listing: Pick<ErpListingSummary, "designerName" | "designerCode">) {
  return preferEnglishLabel(listing.designerName || "", listing.designerCode || listing.designerName || "-")
}

function resolveThemeLabel(listing: Pick<ErpListingSummary, "themeLabel" | "themeCode">) {
  return preferEnglishLabel(listing.themeLabel || "", listing.themeCode || listing.themeLabel || "-")
}

function resolveShopLabel(listing: Pick<ErpListingDetail, "shopLabel" | "shopId">) {
  return preferEnglishLabel(listing.shopLabel || "", listing.shopId || listing.shopLabel || "-")
}

const designerPills = computed(() => {
  const options = listView.value?.designers || []
  if (options.length) {
    return [
      { value: "all", label: "All" },
      ...options.slice(0, 8).map((item) => ({
        ...item,
        label: preferEnglishLabel(item.label, item.value),
      })),
    ]
  }
  const names = Array.from(new Set((listView.value?.listings || []).map((item) => item.designerName).filter(Boolean)))
  return [{ value: "all", label: "All" }, ...names.slice(0, 8).map((name) => ({ value: name, label: name }))]
})
const shopPills = computed(() => [
  { value: "all", label: "All" },
  ...(listView.value?.shops || []).slice(0, 8).map((item) => ({
    ...item,
    label: preferEnglishLabel(item.label, item.value),
  })),
])
const themePills = computed(() => [
  { value: "all", label: "All" },
  ...(listView.value?.themes || []).slice(0, 8).map((item) => ({
    ...item,
    label: preferEnglishLabel(item.label, item.value),
  })),
])
const filteredListings = computed(() => {
  const keywordText = publicNameKeyword.value.trim().toLowerCase()
  const startAt = startDate.value ? new Date(startDate.value).getTime() : null
  const endAt = endDate.value ? new Date(`${endDate.value}T23:59:59`).getTime() : null

  return (listView.value?.listings || []).filter((listing) => {
    if (designerFilter.value !== "all") {
      const designerMatched = listing.designerCode === designerFilter.value || listing.designerName === designerFilter.value
      if (!designerMatched) return false
    }
    if (shopFilter.value !== "all" && listing.shopId !== shopFilter.value) return false
    if (themeFilter.value !== "all" && listing.themeCode !== themeFilter.value && listing.themeLabel !== themeFilter.value) return false
    if (channelFilter.value !== "all" && listing.channelCode !== channelFilter.value) return false
    if (syncStatusFilter.value !== "all" && listing.syncStatus !== syncStatusFilter.value) return false
    if (listingStatusFilter.value !== "all" && listing.listingStatus !== listingStatusFilter.value) return false
    if (exportDecisionFilter.value === "yes" && !listing.externalListingId) return false
    if (exportDecisionFilter.value === "no" && listing.externalListingId) return false
    if (keywordText) {
      const haystack = [
        listing.productName,
        listing.finishedProductCode,
        listing.themeLabel,
        listing.themeCode,
        listing.channelLabel,
        listing.channelCode,
        listing.shopLabel,
        listing.shopId,
        listing.designerName,
        listing.designerCode,
      ].join(" ").toLowerCase()
      if (!haystack.includes(keywordText)) return false
    }
    if ((startAt || endAt) && listing.lastSyncedAt) {
      const timestamp = new Date(listing.lastSyncedAt).getTime()
      if (startAt && timestamp < startAt) return false
      if (endAt && timestamp > endAt) return false
    }
    return true
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredListings.value.length / pageSize.value)))
const pagedListings = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredListings.value.slice(start, start + pageSize.value)
})
const visibleListingIds = computed(() => pagedListings.value.map((item) => item.listingId))
const allVisibleSelected = computed(() =>
  visibleListingIds.value.length > 0
  && visibleListingIds.value.every((listingId) => selectedListingIds.value.includes(listingId)),
)
const selectedCount = computed(() => selectedListingIds.value.length)

const quickActionWorkspace = computed(() => {
  if (!activeQuickAction.value || !selected.value) return null
  if (activeQuickAction.value.key === "listing_edit") {
    return {
      title: "ERP finished product edit entry",
      description: `${selected.value.productName} is now opened in the ERP finished-product editor for further product maintenance.`,
      href: `/erp/products?productId=${selected.value.productId}`,
      helper: "Open ERP Products",
    }
  }
  if (activeQuickAction.value.key === "listing_design") {
    return {
      title: "Reuse design preview entry",
      description: `${selected.value.productName} reuses the existing Design / Preview flow without changing the original template module.`,
      href: activeQuickAction.value.path || "/preview",
      helper: "Open preview entry",
    }
  }
  return {
    title: "ERP queue staging area",
    description: `${selected.value.productName} has been added to the ERP staging queue for the next operational steps.`,
    href: "",
    helper: "",
  }
})

watch([filteredListings, pageSize], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  selectedListingIds.value = selectedListingIds.value.filter((listingId) => filteredListings.value.some((item) => item.listingId === listingId))
})

async function loadListings() {
  loading.value = true
  error.value = ""
  try {
    const nextListView = await fetchErpListings({
      keyword: [keyword.value.trim(), publicNameKeyword.value.trim()].filter(Boolean).join(" "),
      channelCode: channelFilter.value,
      syncStatus: syncStatusFilter.value,
      listingStatus: listingStatusFilter.value,
      shopId: shopFilter.value,
      theme: themeFilter.value,
      designerCode: designerFilter.value,
    })
    listView.value = nextListView
    const nextSelected = selectedListingId.value
      ? nextListView.listings.find((item) => item.listingId === selectedListingId.value)
      : nextListView.listings[0]
    if (nextSelected?.listingId) {
      await openListing(nextSelected.listingId)
    } else {
      selected.value = null
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function openListing(listingId: string) {
  loading.value = true
  error.value = ""
  try {
    selected.value = await fetchErpListingDetail(listingId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function retrySync() {
  if (!selected.value) return
  syncing.value = true
  error.value = ""
  try {
    selected.value = await syncErpListing(selected.value.listingId, "retry from erp ui")
    await loadListings()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    syncing.value = false
  }
}

function findAction(key: string) {
  return listView.value?.quickActions.find((action) => action.key === key) || null
}

function openQuickActionWorkspace(action: ErpListingActionEntry, listing?: ErpListingSummary) {
  if (listing?.listingId && listing.listingId !== selected.value?.listingId) {
    void openListing(listing.listingId)
  }
  const activeListingId = listing?.listingId || selected.value?.listingId
  if (!activeListingId) return
  activeQuickAction.value = action
  if (action.key === "listing_add_to_cart" && !queuedListingIds.value.includes(activeListingId)) {
    queuedListingIds.value = [...queuedListingIds.value, activeListingId]
  }
}

function triggerRowAction(actionKey: string, listing: ErpListingSummary) {
  const action = findAction(actionKey)
  if (!action) return
  openQuickActionWorkspace(action, listing)
}

async function exportListings() {
  exporting.value = true
  error.value = ""
  try {
    const { blob, filename } = await downloadErpListingCsv(buildErpListingExportPath({
      keyword: [keyword.value.trim(), publicNameKeyword.value.trim()].filter(Boolean).join(" "),
      channelCode: channelFilter.value,
      syncStatus: syncStatusFilter.value,
      listingStatus: listingStatusFilter.value,
      shopId: shopFilter.value,
      theme: themeFilter.value,
      designerCode: designerFilter.value,
    }))
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

function resetFilters() {
  keyword.value = ""
  publicNameKeyword.value = ""
  startDate.value = ""
  endDate.value = ""
  channelFilter.value = "all"
  syncStatusFilter.value = "all"
  listingStatusFilter.value = "all"
  shopFilter.value = "all"
  themeFilter.value = "all"
  designerFilter.value = "all"
  exportDecisionFilter.value = "all"
  currentPage.value = 1
  void loadListings()
}

function applyDesigner(value: string) {
  designerFilter.value = value
  currentPage.value = 1
  void loadListings()
}

function applyShop(value: string) {
  shopFilter.value = value
  currentPage.value = 1
  void loadListings()
}

function applyTheme(value: string) {
  themeFilter.value = value
  currentPage.value = 1
  void loadListings()
}

function applyExportDecision(value: string) {
  exportDecisionFilter.value = value
  currentPage.value = 1
}

function toggleListingSelection(listingId: string) {
  if (selectedListingIds.value.includes(listingId)) {
    selectedListingIds.value = selectedListingIds.value.filter((item) => item !== listingId)
  } else {
    selectedListingIds.value = [...selectedListingIds.value, listingId]
  }
}

function toggleAllVisible() {
  if (allVisibleSelected.value) {
    selectedListingIds.value = selectedListingIds.value.filter((listingId) => !visibleListingIds.value.includes(listingId))
  } else {
    selectedListingIds.value = Array.from(new Set([...selectedListingIds.value, ...visibleListingIds.value]))
  }
}

function changePage(nextPage: number) {
  currentPage.value = Math.min(Math.max(1, nextPage), totalPages.value)
}

onMounted(() => {
  void loadListings()
})
</script>

<template>
  <section class="erp-listings-reference">
    <div class="erp-listings-reference__body">
      <div class="erp-listings-reference__crumb">General data/<span>Finished product list</span></div>

      <section class="erp-listings-reference__filters">
        <div class="erp-listings-reference__row">
          <span class="erp-listings-reference__label">designer:</span>
          <div class="erp-listings-reference__pills">
            <button
              v-for="pill in designerPills"
              :key="pill.value"
              type="button"
              class="erp-listings-reference__pill"
              :class="{ 'is-active': designerFilter === pill.value }"
              @click="applyDesigner(pill.value)"
            >
              {{ pill.label }}
            </button>
          </div>
          <button type="button" class="erp-listings-reference__text-link">More</button>
        </div>

        <div class="erp-listings-reference__row">
          <span class="erp-listings-reference__label">export sto:</span>
          <div class="erp-listings-reference__pills">
            <button
              v-for="pill in shopPills"
              :key="pill.value"
              type="button"
              class="erp-listings-reference__pill"
              :class="{ 'is-active': shopFilter === pill.value }"
              @click="applyShop(pill.value)"
            >
              {{ pill.label }}
            </button>
          </div>
          <button type="button" class="erp-listings-reference__text-link">More</button>
        </div>

        <div class="erp-listings-reference__row">
          <span class="erp-listings-reference__label">Whether to export:</span>
          <div class="erp-listings-reference__pills">
            <button
              type="button"
              class="erp-listings-reference__pill"
              :class="{ 'is-active': exportDecisionFilter === 'all' }"
              @click="applyExportDecision('all')"
            >
              All
            </button>
            <button
              type="button"
              class="erp-listings-reference__pill"
              :class="{ 'is-active': exportDecisionFilter === 'yes' }"
              @click="applyExportDecision('yes')"
            >
              Yes
            </button>
            <button
              type="button"
              class="erp-listings-reference__pill"
              :class="{ 'is-active': exportDecisionFilter === 'no' }"
              @click="applyExportDecision('no')"
            >
              No
            </button>
          </div>
        </div>

        <div class="erp-listings-reference__row">
          <span class="erp-listings-reference__label">public name:</span>
          <div class="erp-listings-reference__pills">
            <button
              v-for="pill in themePills"
              :key="pill.value"
              type="button"
              class="erp-listings-reference__pill"
              :class="{ 'is-active': themeFilter === pill.value }"
              @click="applyTheme(pill.value)"
            >
              {{ pill.label }}
            </button>
          </div>
          <button type="button" class="erp-listings-reference__text-link">More</button>
        </div>

        <div class="erp-listings-reference__search-row">
          <label class="erp-listings-reference__search-group is-date">
            <span>design time:</span>
            <input v-model="startDate" type="date">
            <em>to</em>
            <input v-model="endDate" type="date">
          </label>
          <label class="erp-listings-reference__search-group">
            <span>product key:</span>
            <input v-model="keyword" type="text" placeholder="Please enter product / finished code" @keyup.enter="loadListings">
          </label>
          <label class="erp-listings-reference__search-group">
            <span>public name:</span>
            <input v-model="publicNameKeyword" type="text" placeholder="Please enter public display name" @keyup.enter="loadListings">
          </label>
          <div class="erp-listings-reference__search-actions">
            <button type="button" class="erp-listings-reference__btn erp-listings-reference__btn--primary" @click="loadListings">Search</button>
            <button type="button" class="erp-listings-reference__btn" @click="resetFilters">Reset</button>
          </div>
        </div>
      </section>

      <section class="erp-listings-reference__table-panel">
        <div class="erp-listings-reference__toolbar">
          <label class="erp-listings-reference__select-all">
            <input type="checkbox" :checked="allVisibleSelected" @change="toggleAllVisible">
            <span>selected{{ selectedCount }}strip</span>
          </label>
          <button type="button" class="erp-listings-reference__btn" :disabled="selectedCount === 0">batch operation</button>
          <button type="button" class="erp-listings-reference__btn" :disabled="exporting" @click="exportListings">
            {{ exporting ? "Exporting..." : "Universal template export" }}
          </button>
          <button type="button" class="erp-listings-reference__btn erp-listings-reference__btn--primary" :disabled="!selected || syncing" @click="retrySync">
            {{ syncing ? "Syncing..." : "Retry sync" }}
          </button>
          <div class="erp-listings-reference__toolbar-right">recycle bin</div>
        </div>

        <div v-if="error" class="erp-listings-reference__error">{{ error }}</div>

        <div class="erp-listings-reference__table-wrap">
          <table class="erp-listings-reference__table">
            <thead>
              <tr>
                <th class="is-checkbox"><input type="checkbox" :checked="allVisibleSelected" @change="toggleAllVisible"></th>
                <th>Product number</th>
                <th>Finished picture</th>
                <th>main name</th>
                <th>public name</th>
                <th>classification</th>
                <th>designer</th>
                <th>time</th>
                <th>operation</th>
              </tr>
            </thead>
            <tbody v-if="pagedListings.length">
              <tr
                v-for="listing in pagedListings"
                :key="listing.listingId"
                :class="{ 'is-selected': listing.listingId === selectedListingId }"
                @click="openListing(listing.listingId)"
              >
                <td class="is-checkbox" @click.stop>
                  <input
                    :data-listing-id="listing.listingId"
                    type="checkbox"
                    :checked="selectedListingIds.includes(listing.listingId)"
                    @change="toggleListingSelection(listing.listingId)"
                  >
                </td>
                <td>{{ listing.finishedProductCode }}</td>
                <td>
                  <div class="erp-listings-reference__picture">
                    <img v-if="listing.primaryImageUrl" :src="listing.primaryImageUrl" :alt="listing.productName">
                    <span v-else>No image</span>
                    <a href="#" @click.prevent.stop="openListing(listing.listingId)">View SKUs</a>
                  </div>
                </td>
                <td>
                  <div class="erp-listings-reference__name-cell">
                    <strong>name:</strong>
                    <span>{{ listing.productName }}</span>
                    <strong>label:</strong>
                    <span>{{ listing.finishedProductCode }}</span>
                  </div>
                </td>
                <td>{{ resolveThemeLabel(listing) || listing.productName }}</td>
                <td>{{ listing.channelLabel }}</td>
                <td>{{ resolveDesignerLabel(listing) }}</td>
                <td>
                  <div class="erp-listings-reference__time-cell">
                    <span>sync time: {{ listing.lastSyncedAt || "-" }}</span>
                    <span>status: {{ listing.syncStatusLabel }}</span>
                    <span>listed: {{ listing.listingStatusLabel }}</span>
                  </div>
                </td>
                <td>
                  <div class="erp-listings-reference__ops">
                    <button
                      type="button"
                      class="erp-listings-reference__text-link"
                      data-action-key="listing_edit"
                      :data-listing-id="listing.listingId"
                      @click.stop="triggerRowAction('listing_edit', listing)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="erp-listings-reference__text-link"
                      data-action-key="listing_add_to_cart"
                      :data-listing-id="listing.listingId"
                      @click.stop="triggerRowAction('listing_add_to_cart', listing)"
                    >
                      {{ queuedListingIds.includes(listing.listingId) ? "In ERP queue" : "add to the cart" }}
                    </button>
                    <button
                      type="button"
                      class="erp-listings-reference__text-link"
                      data-action-key="listing_design"
                      :data-listing-id="listing.listingId"
                      @click.stop="triggerRowAction('listing_design', listing)"
                    >
                      Design
                    </button>
                    <button type="button" class="erp-listings-reference__text-link" @click.stop="openListing(listing.listingId)">More</button>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="9" class="erp-listings-reference__empty">
                  {{ loading ? "Loading listing data..." : "There is currently no data available" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="erp-listings-reference__pagination">
          <span>total {{ filteredListings.length }} Article data</span>
          <div class="erp-listings-reference__pagination-controls">
            <button type="button" class="erp-listings-reference__page-btn" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">&lt;</button>
            <button type="button" class="erp-listings-reference__page-btn is-current">{{ currentPage }}</button>
            <button type="button" class="erp-listings-reference__page-btn" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">&gt;</button>
            <select v-model.number="pageSize" class="erp-listings-reference__page-size">
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
              <option :value="100">100 / page</option>
            </select>
          </div>
        </footer>
      </section>

      <section v-if="selected" class="erp-listings-reference__detail">
        <div class="erp-listings-reference__detail-head">
          <div>
            <strong>{{ selected.productName }}</strong>
            <p>{{ resolveShopLabel(selected) }} / {{ selected.channelLabel }} / {{ selected.listingStatusLabel }} / {{ selected.syncStatusLabel }}</p>
          </div>
          <span class="erp-listings-reference__queue-badge">ERP queue {{ queuedListingCount }}</span>
        </div>

        <div class="erp-listings-reference__detail-grid">
          <div>
            <span>Finished code</span>
            <strong>{{ selected.finishedProductCode }}</strong>
          </div>
          <div>
            <span>External id</span>
            <strong>{{ selected.externalListingId || "Pending" }}</strong>
          </div>
          <div>
            <span>Designer</span>
            <strong>{{ resolveDesignerLabel(selected) }}</strong>
          </div>
          <div>
            <span>Theme</span>
            <strong>{{ resolveThemeLabel(selected) }}</strong>
          </div>
        </div>

        <section v-if="quickActionWorkspace" class="erp-listings-reference__workspace">
          <div>
            <strong>{{ quickActionWorkspace.title }}</strong>
            <p>{{ quickActionWorkspace.description }}</p>
          </div>
          <a
            v-if="quickActionWorkspace.href"
            class="erp-listings-reference__workspace-link"
            :href="quickActionWorkspace.href"
          >
            {{ quickActionWorkspace.helper }}
          </a>
        </section>

        <section class="erp-listings-reference__note">
          <strong>Sync note</strong>
          <p>{{ selected.syncNote }}</p>
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
.erp-listings-reference {
  min-height: 100%;
  background: #f2f2f3;
  color: #333;
  font-size: 12px;
}

.erp-listings-reference__body {
  padding: 8px 10px 20px;
}

.erp-listings-reference__crumb {
  margin-bottom: 6px;
  color: #666;
}

.erp-listings-reference__crumb span {
  color: #2d7df6;
}

.erp-listings-reference__filters,
.erp-listings-reference__table-panel,
.erp-listings-reference__detail {
  border: 1px solid #e1e5ea;
  background: #f7f7f8;
}

.erp-listings-reference__filters {
  padding: 10px;
}

.erp-listings-reference__row,
.erp-listings-reference__search-row,
.erp-listings-reference__toolbar,
.erp-listings-reference__pagination,
.erp-listings-reference__pagination-controls,
.erp-listings-reference__detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.erp-listings-reference__row {
  margin-bottom: 10px;
}

.erp-listings-reference__label,
.erp-listings-reference__search-group span {
  color: #555;
  white-space: nowrap;
}

.erp-listings-reference__pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.erp-listings-reference__pill,
.erp-listings-reference__btn,
.erp-listings-reference__page-btn {
  min-height: 22px;
  padding: 0 10px;
  border: 1px solid #d6dbe3;
  background: #f7f8fb;
  color: #666;
  cursor: pointer;
  font: inherit;
}

.erp-listings-reference__pill.is-active {
  border-color: #2f80ff;
  background: #2f80ff;
  color: #fff;
}

.erp-listings-reference__btn--primary {
  border-color: #2f80ff;
  background: #2f80ff;
  color: #fff;
}

.erp-listings-reference__text-link {
  border: none;
  background: transparent;
  color: #4d89ff;
  cursor: pointer;
  font: inherit;
}

.erp-listings-reference__search-row {
  align-items: flex-end;
  flex-wrap: wrap;
}

.erp-listings-reference__search-group {
  display: grid;
  gap: 4px;
}

.erp-listings-reference__search-group.is-date {
  grid-template-columns: auto 140px auto 140px;
  align-items: center;
  gap: 6px;
}

.erp-listings-reference__search-group em {
  color: #999;
  font-style: normal;
}

.erp-listings-reference__search-group input,
.erp-listings-reference__page-size {
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid #d6dbe3;
  background: #fff;
  color: #333;
  font: inherit;
}

.erp-listings-reference__search-group:not(.is-date) input {
  width: 230px;
}

.erp-listings-reference__search-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.erp-listings-reference__table-panel {
  margin-top: 8px;
}

.erp-listings-reference__toolbar {
  padding: 10px;
  border-bottom: 1px solid #e1e5ea;
  background: #f7f7f8;
  flex-wrap: wrap;
}

.erp-listings-reference__select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #555;
}

.erp-listings-reference__toolbar-right {
  margin-left: auto;
  color: #4d89ff;
}

.erp-listings-reference__error {
  padding: 8px 10px 0;
  color: #c0392b;
}

.erp-listings-reference__table-wrap {
  overflow-x: auto;
  background: #fff;
}

.erp-listings-reference__table {
  width: 100%;
  min-width: 1160px;
  border-collapse: collapse;
}

.erp-listings-reference__table th,
.erp-listings-reference__table td {
  padding: 8px 6px;
  border: 1px solid #e6e9ef;
  color: #666;
  font-weight: 400;
  text-align: center;
  vertical-align: middle;
}

.erp-listings-reference__table thead th {
  background: #f5f6f9;
}

.erp-listings-reference__table .is-checkbox {
  width: 36px;
}

.erp-listings-reference__picture {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.erp-listings-reference__picture img {
  width: 74px;
  height: 74px;
  object-fit: cover;
  border: 1px solid #ececec;
  background: #fff;
}

.erp-listings-reference__picture a {
  color: #4d89ff;
  text-decoration: none;
}

.erp-listings-reference__name-cell,
.erp-listings-reference__time-cell,
.erp-listings-reference__ops {
  display: grid;
  gap: 4px;
  text-align: left;
}

.erp-listings-reference__name-cell strong,
.erp-listings-reference__time-cell strong {
  color: #555;
  font-weight: 600;
}

.erp-listings-reference__ops {
  justify-items: start;
}

.erp-listings-reference__table tr.is-selected {
  background: #f1f7ff;
}

.erp-listings-reference__empty {
  height: 92px;
  color: #b0b0b0;
}

.erp-listings-reference__pagination {
  justify-content: flex-end;
  padding: 8px 10px;
  border-top: 1px solid #e1e5ea;
  background: #fff;
}

.erp-listings-reference__page-btn.is-current {
  background: #fff;
  color: #333;
}

.erp-listings-reference__detail {
  margin-top: 10px;
  padding: 10px;
}

.erp-listings-reference__detail-head strong,
.erp-listings-reference__detail-grid strong {
  color: #333;
}

.erp-listings-reference__detail-head p,
.erp-listings-reference__note p,
.erp-listings-reference__workspace p {
  margin: 4px 0 0;
  color: #666;
}

.erp-listings-reference__queue-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 10px;
  background: #dce9ff;
  color: #3b6fcf;
}

.erp-listings-reference__detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.erp-listings-reference__detail-grid div,
.erp-listings-reference__workspace,
.erp-listings-reference__note {
  padding: 8px 10px;
  border: 1px solid #e1e5ea;
  background: #fff;
}

.erp-listings-reference__workspace,
.erp-listings-reference__note {
  margin-top: 10px;
}

.erp-listings-reference__workspace-link {
  display: inline-block;
  margin-top: 8px;
  color: #4d89ff;
  text-decoration: none;
}

@media (max-width: 1100px) {
  .erp-listings-reference__detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .erp-listings-reference__search-group.is-date {
    grid-template-columns: 1fr;
  }
}
</style>
