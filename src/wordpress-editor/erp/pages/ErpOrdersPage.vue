<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import {
  buildErpOrderExportPath,
  downloadErpOrderCsv,
  fetchErpOrderDetail,
  fetchErpOrders,
  saveErpShipment,
  syncErpOrders,
  updateErpOrderStatus,
} from "../api"
import type { ErpOrderActionEntry, ErpOrderDetail, ErpOrderSummary } from "../types"

const listView = ref<Awaited<ReturnType<typeof fetchErpOrders>> | null>(null)
const selectedOrder = ref<ErpOrderDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref("")
const orderNumberKeyword = ref("")
const trackingKeyword = ref("")
const skuKeyword = ref("")
const statusFilter = ref("all")
const shopFilter = ref("all")
const platformFilter = ref("all")
const riskFilter = ref("all")
const timePresetFilter = ref("all")
const accountFilter = ref("all")
const markFilter = ref("all")
const ruleFilter = ref("all")
const agingFilter = ref("all")
const showAdvancedFilters = ref(false)
const shipmentNo = ref("")
const trackingNo = ref("")
const carrierCode = ref("ups")
const exporting = ref(false)
const syncingOrders = ref(false)
const selectedOrderIds = ref<string[]>([])
const activeBatchAction = ref<ErpOrderActionEntry | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)

const staticPlatformPills = [
  { value: "all", label: "All" },
  { value: "alibaba", label: "Alibaba E..." },
  { value: "wish", label: "Wish" },
  { value: "lw", label: "LW" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee ..." },
  { value: "lazada", label: "Lazada" },
  { value: "taobao", label: "taobao" },
  { value: "tmall", label: "Tmall" },
  { value: "jumia", label: "Jumia" },
  { value: "shopify", label: "Shopify" },
  { value: "independent", label: "Independ..." },
  { value: "1688", label: "1688" },
  { value: "joom", label: "Joom" },
  { value: "pdd", label: "pdd" },
  { value: "temu", label: "temu" },
  { value: "more", label: "More" },
]
const staticMarkPills = [
  { value: "all", label: "All", tone: "blue" },
  { value: "none", label: "No description", tone: "gray" },
  { value: "domestic", label: "Domestic Y2 Shipme...", tone: "indigo" },
  { value: "none2", label: "No description", tone: "gray" },
  { value: "green1", label: "No tag", tone: "green" },
  { value: "yellow1", label: "No tag", tone: "yellow" },
  { value: "orange1", label: "No tag", tone: "orange" },
  { value: "red1", label: "No tag", tone: "red" },
  { value: "purple1", label: "No tag", tone: "purple" },
  { value: "blue1", label: "No tag", tone: "blue" },
]
const staticRulePills = [{ value: "all", label: "All" }]
const agingPills = [
  { value: "all", label: "All" },
  { value: "6h", label: "<6 hours" },
  { value: "12h", label: "<12 hours" },
  { value: "24h", label: "<24 hours" },
  { value: "custom", label: "Custom" },
]

const selectedOrderId = computed(() => selectedOrder.value?.orderId ?? "")
const allOrders = computed(() => listView.value?.orders || [])
const filteredOrders = computed(() => {
  return allOrders.value.filter((order) => {
    if (statusFilter.value !== "all" && order.orderStatus !== statusFilter.value) return false
    if (shopFilter.value !== "all" && !order.shopLabel.includes(shopFilter.value)) return false
    if (platformFilter.value !== "all" && order.platformLabel.toLowerCase() !== platformFilter.value.toLowerCase()) return false
    if (riskFilter.value !== "all" && order.riskLevel !== riskFilter.value) return false
    if (timePresetFilter.value !== "all") {
      if (timePresetFilter.value === "today" && order.remainingHours > 24) return false
      if (timePresetFilter.value === "7d" && order.remainingHours > 7 * 24) return false
      if (timePresetFilter.value === "30d" && order.remainingHours > 30 * 24) return false
    }
    if (agingFilter.value === "6h" && order.remainingHours >= 6) return false
    if (agingFilter.value === "12h" && order.remainingHours >= 12) return false
    if (agingFilter.value === "24h" && order.remainingHours >= 24) return false
    return true
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize.value)))
const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})
const visibleOrderIds = computed(() => pagedOrders.value.map((order) => order.orderId))
const selectedBatchOrders = computed(() =>
  filteredOrders.value.filter((order) => selectedOrderIds.value.includes(order.orderId)),
)
const selectedOrderCount = computed(() => selectedBatchOrders.value.length)
const allVisibleSelected = computed(() =>
  visibleOrderIds.value.length > 0
  && visibleOrderIds.value.every((orderId) => selectedOrderIds.value.includes(orderId)),
)
const statusTabs = computed(() => {
  const orders = allOrders.value
  const countBy = (predicate: (order: ErpOrderSummary) => boolean) => orders.filter(predicate).length
  return [
    { value: "to_be_edited", label: "to be edited", count: countBy((order) => order.orderStatus === "draft") },
    { value: "pending_payment", label: "Pending payment", count: countBy((order) => order.orderStatus === "pending_payment") },
    { value: "paid", label: "Paid", count: countBy((order) => order.orderStatus === "paid") },
    { value: "in_order", label: "In order", count: countBy((order) => order.orderStatus === "processing") },
    { value: "production_pending", label: "in production", count: countBy((order) => order.orderStatus === "production_pending") },
    { value: "shipped", label: "Shipped", count: countBy((order) => order.orderStatus === "shipped") },
    { value: "cancelled", label: "Cancelled", count: countBy((order) => order.orderStatus === "cancelled") },
    { value: "all", label: "all orders", count: orders.length },
  ]
})
const accountPills = computed(() => {
  const shopOptions = listView.value?.shops || []
  return [
    { value: "all", label: "All" },
    ...shopOptions.slice(0, 2).map((item) => ({ value: item.value, label: item.label.length > 10 ? `${item.label.slice(0, 10)}...` : item.label })),
  ]
})
const shopPills = computed(() => {
  const shopOptions = listView.value?.shops || []
  return [
    { value: "all", label: "All" },
    ...shopOptions.slice(0, 2).map((item) => ({ value: item.value, label: item.label })),
  ]
})

watch([filteredOrders, pageSize], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  reconcileSelectedOrders(filteredOrders.value.map((item) => item.orderId))
})

async function loadOrders() {
  loading.value = true
  error.value = ""
  try {
    const keyword = [orderNumberKeyword.value.trim(), trackingKeyword.value.trim(), skuKeyword.value.trim()]
      .filter(Boolean)
      .join(" ")
      .trim()
    const nextListView = await fetchErpOrders({
      keyword,
      status: statusFilter.value,
      shopId: shopFilter.value,
      platform: platformFilter.value,
      riskLevel: riskFilter.value,
      timePreset: timePresetFilter.value,
    })
    listView.value = nextListView
    const nextSelected = selectedOrderId.value
      ? nextListView.orders.find((item) => item.orderId === selectedOrderId.value)
      : nextListView.orders[0]
    if (nextSelected?.orderId && nextSelected.orderId !== selectedOrder.value?.orderId) {
      await openOrder(nextSelected.orderId)
    } else if (!nextSelected) {
      selectedOrder.value = null
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

function reconcileSelectedOrders(nextOrderIds: string[]) {
  const visibleIdSet = new Set(nextOrderIds)
  selectedOrderIds.value = selectedOrderIds.value.filter((orderId) => visibleIdSet.has(orderId))
  if (activeBatchAction.value && selectedOrderIds.value.length === 0) {
    activeBatchAction.value = null
  }
}

async function openOrder(orderId: string) {
  loading.value = true
  error.value = ""
  try {
    selectedOrder.value = await fetchErpOrderDetail(orderId)
    shipmentNo.value = selectedOrder.value.shipments[0]?.shipmentNo || ""
    trackingNo.value = selectedOrder.value.shipments[0]?.trackingNo || ""
    carrierCode.value = selectedOrder.value.shipments[0]?.carrierCode || "ups"
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function changeStatus(orderId: string, nextStatus: string) {
  saving.value = true
  error.value = ""
  try {
    selectedOrder.value = await updateErpOrderStatus(orderId, nextStatus)
    await loadOrders()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    saving.value = false
  }
}

async function saveShipmentForSelected() {
  if (!selectedOrder.value) return
  saving.value = true
  error.value = ""
  try {
    selectedOrder.value = await saveErpShipment(selectedOrder.value.orderId, {
      shipmentId: selectedOrder.value.shipments[0]?.shipmentId,
      shipmentNo: shipmentNo.value,
      shipmentStatus: "shipped",
      carrierCode: carrierCode.value,
      trackingNo: trackingNo.value,
    })
    await loadOrders()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    saving.value = false
  }
}

async function exportOrders() {
  exporting.value = true
  error.value = ""
  try {
    const keyword = [orderNumberKeyword.value.trim(), trackingKeyword.value.trim(), skuKeyword.value.trim()].filter(Boolean).join(" ")
    const { blob, filename } = await downloadErpOrderCsv(buildErpOrderExportPath({
      keyword,
      status: statusFilter.value,
      shopId: shopFilter.value,
      platform: platformFilter.value,
      riskLevel: riskFilter.value,
      timePreset: timePresetFilter.value,
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

async function syncOrdersFromPlatform() {
  syncingOrders.value = true
  error.value = ""
  try {
    listView.value = await syncErpOrders()
    await loadOrders()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    syncingOrders.value = false
  }
}

function toggleOrderSelection(orderId: string) {
  if (selectedOrderIds.value.includes(orderId)) {
    selectedOrderIds.value = selectedOrderIds.value.filter((currentId) => currentId !== orderId)
  } else {
    selectedOrderIds.value = [...selectedOrderIds.value, orderId]
  }
  if (activeBatchAction.value && selectedOrderIds.value.length === 0) {
    activeBatchAction.value = null
  }
}

function toggleAllVisibleOrders() {
  if (allVisibleSelected.value) {
    selectedOrderIds.value = selectedOrderIds.value.filter((orderId) => !visibleOrderIds.value.includes(orderId))
  } else {
    selectedOrderIds.value = Array.from(new Set([...selectedOrderIds.value, ...visibleOrderIds.value]))
  }
}

function openBatchWorkspace(action: ErpOrderActionEntry) {
  if (selectedOrderCount.value === 0) return
  activeBatchAction.value = action
}

function closeBatchWorkspace() {
  activeBatchAction.value = null
}

function applyStatusTab(nextStatus: string) {
  statusFilter.value = nextStatus
  currentPage.value = 1
  void loadOrders()
}

function applyPlatform(nextPlatform: string) {
  platformFilter.value = nextPlatform
  void loadOrders()
}

function changePage(nextPage: number) {
  currentPage.value = Math.min(Math.max(1, nextPage), totalPages.value)
}

function resetFilters() {
  orderNumberKeyword.value = ""
  trackingKeyword.value = ""
  skuKeyword.value = ""
  statusFilter.value = "all"
  shopFilter.value = "all"
  platformFilter.value = "all"
  riskFilter.value = "all"
  timePresetFilter.value = "all"
  accountFilter.value = "all"
  markFilter.value = "all"
  ruleFilter.value = "all"
  agingFilter.value = "all"
  currentPage.value = 1
  void loadOrders()
}

onMounted(() => {
  void loadOrders()
})
</script>

<template>
  <section class="erp-orders-reference">
    <div class="erp-orders-reference__body">
      <div class="erp-orders-reference__crumb">order/<span>All Orders</span></div>

      <section class="erp-orders-reference__filters">
        <div class="erp-orders-reference__row">
          <span class="erp-orders-reference__label">Plat:</span>
          <div class="erp-orders-reference__pills">
            <button
              v-for="pill in staticPlatformPills"
              :key="pill.value"
              type="button"
              class="erp-orders-reference__pill"
              :class="{ 'is-active': platformFilter === pill.value }"
              @click="pill.value === 'more' ? (showAdvancedFilters = !showAdvancedFilters) : applyPlatform(pill.value)"
            >
              {{ pill.label }}
            </button>
          </div>
        </div>

        <div class="erp-orders-reference__row">
          <span class="erp-orders-reference__label">Account:</span>
          <div class="erp-orders-reference__pills">
            <button
              v-for="pill in accountPills"
              :key="pill.value"
              type="button"
              class="erp-orders-reference__pill"
              :class="{ 'is-active': accountFilter === pill.value }"
              @click="accountFilter = pill.value"
            >
              {{ pill.label }}
            </button>
          </div>
        </div>

        <div class="erp-orders-reference__row">
          <span class="erp-orders-reference__label">Shop:</span>
          <div class="erp-orders-reference__pills">
            <button
              v-for="pill in shopPills"
              :key="pill.value"
              type="button"
              class="erp-orders-reference__pill"
              :class="{ 'is-active': shopFilter === pill.value }"
              @click="shopFilter = pill.value; loadOrders()"
            >
              {{ pill.label }}
            </button>
          </div>
        </div>

        <div class="erp-orders-reference__row">
          <span class="erp-orders-reference__label">Mark:</span>
          <div class="erp-orders-reference__pills">
            <button
              v-for="pill in staticMarkPills"
              :key="pill.value"
              type="button"
              class="erp-orders-reference__pill"
              :class="[`tone-${pill.tone}`, { 'is-active': markFilter === pill.value }]"
              @click="markFilter = pill.value"
            >
              {{ pill.label }}
            </button>
            <button type="button" class="erp-orders-reference__linkish">More</button>
            <button type="button" class="erp-orders-reference__linkish">Edit mark</button>
          </div>
        </div>

        <div class="erp-orders-reference__row">
          <span class="erp-orders-reference__label">Order Rule :</span>
          <div class="erp-orders-reference__pills">
            <button
              v-for="pill in staticRulePills"
              :key="pill.value"
              type="button"
              class="erp-orders-reference__pill"
              :class="{ 'is-active': ruleFilter === pill.value }"
              @click="ruleFilter = pill.value"
            >
              {{ pill.label }}
            </button>
            <button type="button" class="erp-orders-reference__linkish">Add Rule</button>
          </div>
        </div>

        <div class="erp-orders-reference__search-row">
          <label>
            <span>order number:</span>
            <input v-model="orderNumberKeyword" type="text" placeholder="Multiple order numbers are" @keyup.enter="loadOrders">
          </label>
          <label>
            <span>tracking numbe</span>
            <input v-model="trackingKeyword" type="text" placeholder="Multiple logistics order numbers" @keyup.enter="loadOrders">
          </label>
          <label>
            <span>SKU:</span>
            <input v-model="skuKeyword" type="text" placeholder="please enterSKU" @keyup.enter="loadOrders">
          </label>
          <div class="erp-orders-reference__search-actions">
            <button type="button" class="erp-orders-reference__btn erp-orders-reference__btn--primary" @click="loadOrders">Search</button>
            <button type="button" class="erp-orders-reference__btn" @click="resetFilters">Reset</button>
            <button type="button" class="erp-orders-reference__btn erp-orders-reference__btn--primary" @click="showAdvancedFilters = !showAdvancedFilters">Unfold</button>
          </div>
        </div>
      </section>

      <section class="erp-orders-reference__aging">
        <span class="erp-orders-reference__aging-title">remaining delivery ti</span>
        <button
          v-for="pill in agingPills"
          :key="pill.value"
          type="button"
          class="erp-orders-reference__pill"
          :class="{ 'is-active': agingFilter === pill.value, 'is-danger': pill.value === '6h' }"
          @click="agingFilter = pill.value"
        >
          {{ pill.label }}
        </button>
        <input v-if="agingFilter === 'custom'" type="text" placeholder="Please ente..." class="erp-orders-reference__aging-input">
        <span v-if="agingFilter === 'custom'" class="erp-orders-reference__aging-unit">Hour</span>
      </section>

      <section class="erp-orders-reference__status-panel">
        <div class="erp-orders-reference__status-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            class="erp-orders-reference__status-tab"
            :class="{ 'is-active': statusFilter === tab.value }"
            @click="applyStatusTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="erp-orders-reference__status-note">Description Waybill generation failed(0)</div>
      </section>

      <section v-if="activeBatchAction && selectedBatchOrders.length" class="erp-orders-reference__batch-workspace">
        <div>
          <strong>{{ activeBatchAction.label }}</strong>
          <p>{{ activeBatchAction.description }}</p>
        </div>
        <button type="button" class="erp-orders-reference__btn" @click="closeBatchWorkspace">Close</button>
      </section>

      <section class="erp-orders-reference__table-panel">
        <div class="erp-orders-reference__toolbar">
          <label class="erp-orders-reference__select-all">
            <input type="checkbox" :checked="allVisibleSelected" @change="toggleAllVisibleOrders">
            <span>selected{{ selectedOrderCount }}</span>
          </label>
          <button type="button" class="erp-orders-reference__btn" :disabled="selectedOrderCount === 0">batch operation</button>
          <button
            v-for="action in listView?.batchActions || []"
            :key="action.key"
            type="button"
            class="erp-orders-reference__btn erp-orders-reference__btn--primary"
            :data-action-key="action.key"
            :disabled="selectedOrderCount === 0"
            @click="openBatchWorkspace(action)"
          >
            {{ action.key === "bulk_ship" ? "Import table" : action.label }}
          </button>
          <button type="button" class="erp-orders-reference__btn erp-orders-reference__btn--green" :disabled="syncingOrders" @click="syncOrdersFromPlatform">
            {{ syncingOrders ? "Synchronizing..." : "Synchronization order" }}
          </button>
          <button type="button" class="erp-orders-reference__btn" :disabled="exporting" @click="exportOrders">
            {{ exporting ? "Exporting..." : "Export" }}
          </button>
          <div class="erp-orders-reference__toolbar-right">
            <span>List of current collation:</span>
            <strong>operation time</strong>
          </div>
        </div>

        <div v-if="error" class="erp-orders-reference__error">{{ error }}</div>

        <div class="erp-orders-reference__table-wrap">
          <table class="erp-orders-reference__table">
            <thead>
              <tr>
                <th class="is-checkbox"><input type="checkbox" :checked="allVisibleSelected" @change="toggleAllVisibleOrders"></th>
                <th>commodity information</th>
                <th>Sales totaled<br><span>Change display currency</span></th>
                <th>Total payment for goo<br>ds</th>
                <th>recipients</th>
                <th>operation time <span>sort</span></th>
                <th>logistics mode</th>
                <th>status</th>
                <th>operation</th>
              </tr>
            </thead>
            <tbody v-if="pagedOrders.length">
              <tr
                v-for="order in pagedOrders"
                :key="order.orderId"
                :class="{ 'is-selected': selectedOrderId === order.orderId }"
                @click="openOrder(order.orderId)"
              >
                <td class="is-checkbox" @click.stop>
                  <input
                    :data-order-id="order.orderId"
                    type="checkbox"
                    :checked="selectedOrderIds.includes(order.orderId)"
                    @change="toggleOrderSelection(order.orderId)"
                  >
                </td>
                <td>
                  <div class="erp-orders-reference__commodity">
                    <strong>{{ order.orderNo }}</strong>
                    <span>{{ order.shopLabel }} / {{ order.platformLabel }}</span>
                    <span>{{ order.itemCount }} items · {{ order.latestTrackingNo || "No tracking" }}</span>
                  </div>
                </td>
                <td>{{ order.currencyCode }} {{ Number(order.totalAmount).toFixed(2) }}</td>
                <td>{{ order.currencyCode }} {{ Number(order.totalAmount).toFixed(2) }}</td>
                <td>{{ order.shopLabel }}</td>
                <td>{{ order.placedAt }}</td>
                <td>{{ order.latestShipmentStatus || "operation time" }}</td>
                <td><span class="erp-orders-reference__status-text">{{ order.orderStatusLabel }}</span></td>
                <td>
                  <button type="button" class="erp-orders-reference__text-btn" @click.stop="openOrder(order.orderId)">Open</button>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="9" class="erp-orders-reference__empty">
                  {{ loading ? "Loading orders..." : "There is currently no data available" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="erp-orders-reference__pagination">
          <span>total {{ filteredOrders.length }} Article data</span>
          <div class="erp-orders-reference__pagination-controls">
            <button type="button" class="erp-orders-reference__page-btn" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">&lt;</button>
            <button type="button" class="erp-orders-reference__page-btn is-current">{{ currentPage }}</button>
            <button type="button" class="erp-orders-reference__page-btn" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">&gt;</button>
            <select v-model.number="pageSize" class="erp-orders-reference__page-size">
              <option :value="10">10 / page</option>
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
            </select>
          </div>
        </footer>
      </section>

      <section v-if="selectedOrder" class="erp-orders-reference__detail">
        <header class="erp-orders-reference__detail-header">
          <div>
            <strong>{{ selectedOrder.orderNo }}</strong>
            <p>{{ selectedOrder.shopLabel }} / {{ selectedOrder.platformLabel }} / {{ selectedOrder.orderStatusLabel }}</p>
          </div>
          <div class="erp-orders-reference__detail-actions">
            <button
              v-for="status in selectedOrder.allowedTransitions"
              :key="status.value"
              type="button"
              class="erp-orders-reference__btn"
              :disabled="saving"
              @click="changeStatus(selectedOrder.orderId, status.value)"
            >
              {{ status.label }}
            </button>
          </div>
        </header>
        <div class="erp-orders-reference__detail-grid">
          <div>
            <span>Risk</span>
            <strong>{{ selectedOrder.riskLevel }}</strong>
          </div>
          <div>
            <span>Remaining SLA</span>
            <strong>{{ selectedOrder.remainingHours }}h</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{{ selectedOrder.currencyCode }} {{ selectedOrder.totalAmount }}</strong>
          </div>
          <div>
            <span>Placed At</span>
            <strong>{{ selectedOrder.placedAt }}</strong>
          </div>
        </div>
        <div class="erp-orders-reference__shipment">
          <input v-model="shipmentNo" type="text" placeholder="Shipment No">
          <input v-model="trackingNo" type="text" placeholder="Tracking No">
          <input v-model="carrierCode" type="text" placeholder="Carrier">
          <button type="button" class="erp-orders-reference__btn erp-orders-reference__btn--primary" :disabled="saving" @click="saveShipmentForSelected">
            {{ saving ? "Saving..." : "Save shipment" }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.erp-orders-reference {
  min-height: 100%;
  background: #f1f2f4;
  color: #333;
  font-size: 12px;
}

.erp-orders-reference__body {
  padding: 8px 10px 20px;
}

.erp-orders-reference__crumb {
  margin-bottom: 6px;
  color: #666;
}

.erp-orders-reference__crumb span {
  color: #2d7df6;
}

.erp-orders-reference__filters,
.erp-orders-reference__aging,
.erp-orders-reference__status-panel,
.erp-orders-reference__table-panel,
.erp-orders-reference__detail,
.erp-orders-reference__batch-workspace {
  border: 1px solid #e1e5ea;
  background: #f7f7f8;
}

.erp-orders-reference__filters {
  padding: 10px 10px 12px;
}

.erp-orders-reference__row,
.erp-orders-reference__aging,
.erp-orders-reference__toolbar,
.erp-orders-reference__detail-header,
.erp-orders-reference__shipment,
.erp-orders-reference__search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.erp-orders-reference__row {
  margin-bottom: 10px;
}

.erp-orders-reference__label,
.erp-orders-reference__aging-title,
.erp-orders-reference__search-row label span {
  color: #555;
  white-space: nowrap;
}

.erp-orders-reference__pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.erp-orders-reference__pill,
.erp-orders-reference__btn,
.erp-orders-reference__page-btn {
  min-height: 22px;
  padding: 0 10px;
  border: 1px solid #d6dbe3;
  background: #f7f8fb;
  color: #666;
  cursor: pointer;
  font: inherit;
}

.erp-orders-reference__pill.is-active,
.erp-orders-reference__status-tab.is-active {
  border-color: #2f80ff;
  background: #2f80ff;
  color: #fff;
}

.erp-orders-reference__pill.is-danger {
  color: #ff4d4f;
}

.erp-orders-reference__pill.tone-blue { background: #4b83f5; color: #fff; border-color: #4b83f5; }
.erp-orders-reference__pill.tone-indigo { background: #5f8bf8; color: #fff; border-color: #5f8bf8; }
.erp-orders-reference__pill.tone-gray { background: #efefef; color: #999; }
.erp-orders-reference__pill.tone-green { background: #62c83c; color: #fff; border-color: #62c83c; }
.erp-orders-reference__pill.tone-yellow { background: #ffcc38; color: #fff; border-color: #ffcc38; }
.erp-orders-reference__pill.tone-orange { background: #ff9b32; color: #fff; border-color: #ff9b32; }
.erp-orders-reference__pill.tone-red { background: #ff6e61; color: #fff; border-color: #ff6e61; }
.erp-orders-reference__pill.tone-purple { background: #bb78e1; color: #fff; border-color: #bb78e1; }

.erp-orders-reference__linkish,
.erp-orders-reference__text-btn {
  border: none;
  background: transparent;
  color: #4d89ff;
  cursor: pointer;
  font: inherit;
}

.erp-orders-reference__search-row {
  align-items: flex-end;
  flex-wrap: wrap;
}

.erp-orders-reference__search-row label {
  display: grid;
  gap: 4px;
}

.erp-orders-reference__search-row input,
.erp-orders-reference__aging-input,
.erp-orders-reference__shipment input,
.erp-orders-reference__page-size {
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid #d6dbe3;
  background: #fff;
  font: inherit;
  color: #333;
}

.erp-orders-reference__search-row input {
  width: 190px;
}

.erp-orders-reference__search-actions,
.erp-orders-reference__toolbar-right,
.erp-orders-reference__pagination,
.erp-orders-reference__pagination-controls,
.erp-orders-reference__detail-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.erp-orders-reference__btn--primary {
  background: #2f80ff;
  color: #fff;
  border-color: #2f80ff;
}

.erp-orders-reference__btn--green {
  background: #69bf3e;
  color: #fff;
  border-color: #69bf3e;
}

.erp-orders-reference__aging {
  margin-top: 8px;
  padding: 6px 10px;
}

.erp-orders-reference__aging-input {
  width: 90px;
}

.erp-orders-reference__aging-unit {
  color: #666;
}

.erp-orders-reference__status-panel {
  margin-top: 8px;
  padding: 10px 10px 0;
}

.erp-orders-reference__status-tabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

.erp-orders-reference__status-tab {
  min-height: 28px;
  padding: 0 14px;
  border: 1px solid transparent;
  background: #efefef;
  color: #888;
  cursor: pointer;
  font: inherit;
}

.erp-orders-reference__status-note {
  padding: 8px 0 10px;
  text-align: right;
  color: #ff6e61;
}

.erp-orders-reference__batch-workspace {
  margin-top: 8px;
  padding: 10px;
  justify-content: space-between;
}

.erp-orders-reference__batch-workspace p {
  margin: 4px 0 0;
  color: #666;
}

.erp-orders-reference__table-panel {
  margin-top: 8px;
  padding: 0;
}

.erp-orders-reference__toolbar {
  padding: 10px;
  background: #f7f7f8;
  border-bottom: 1px solid #e1e5ea;
  flex-wrap: wrap;
}

.erp-orders-reference__select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #555;
}

.erp-orders-reference__toolbar-right {
  margin-left: auto;
  color: #666;
}

.erp-orders-reference__error {
  padding: 8px 10px 0;
  color: #c0392b;
}

.erp-orders-reference__table-wrap {
  overflow-x: auto;
  background: #fff;
}

.erp-orders-reference__table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.erp-orders-reference__table th,
.erp-orders-reference__table td {
  padding: 9px 8px;
  border: 1px solid #e6e9ef;
  color: #666;
  font-weight: 400;
  text-align: center;
  vertical-align: middle;
}

.erp-orders-reference__table thead th {
  background: #f5f6f9;
}

.erp-orders-reference__table thead th span {
  color: #4b8fff;
}

.erp-orders-reference__table .is-checkbox {
  width: 42px;
}

.erp-orders-reference__commodity {
  display: grid;
  gap: 3px;
  text-align: left;
}

.erp-orders-reference__commodity strong {
  color: #3a3a3a;
}

.erp-orders-reference__status-text {
  color: #5b6f92;
}

.erp-orders-reference__table tr.is-selected {
  background: #f1f7ff;
}

.erp-orders-reference__empty {
  height: 92px;
  color: #b0b0b0;
}

.erp-orders-reference__pagination {
  justify-content: flex-end;
  padding: 8px 10px;
  border-top: 1px solid #e1e5ea;
  background: #fff;
}

.erp-orders-reference__page-btn.is-current {
  background: #fff;
  color: #333;
}

.erp-orders-reference__detail {
  margin-top: 10px;
  padding: 10px;
}

.erp-orders-reference__detail-header strong,
.erp-orders-reference__detail-grid strong {
  color: #333;
}

.erp-orders-reference__detail-header p {
  margin: 4px 0 0;
  color: #666;
}

.erp-orders-reference__detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.erp-orders-reference__detail-grid div {
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid #e1e5ea;
  background: #fff;
}

.erp-orders-reference__shipment {
  margin-top: 10px;
  flex-wrap: wrap;
}

.erp-orders-reference__shipment input {
  width: 170px;
}

@media (max-width: 1100px) {
  .erp-orders-reference__detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
