<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { fetchPublicProductDetail, type PublicProductDetail } from "../api/productsPublic"

type DetailSectionKey = "details" | "size" | "packaging"

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const loading = ref(false)
const error = ref("")
const product = ref<PublicProductDetail | null>(null)
const currentImage = ref("")
const activeColor = ref("")
const activeSize = ref("")
const activeSection = ref<DetailSectionKey>("details")
const brokenImageUrls = ref<string[]>([])

const productCode = computed(() => String(route.params.productCode || "").trim())
const galleryImages = computed(() => {
  const detail = product.value
  if (!detail) return []
  const images = detail.images?.map((item) => item.imageUrl).filter(Boolean) || []
  const merged = images.length ? images : (detail.primaryImageUrl ? [detail.primaryImageUrl] : [])
  return Array.from(new Set(merged))
})
const displayName = computed(() => {
  const detail = product.value
  if (!detail) return ""
  return locale.value === "zh"
    ? (detail.finishedProductCode || detail.productName || detail.productNameEn || "")
    : (detail.finishedProductCode || detail.productNameEn || detail.productName || "")
})
const currentPrice = computed(() => selectedVariant.value?.purchasePrice ?? product.value?.purchasePrice ?? null)
const currentMinimumOrder = computed(() => selectedVariant.value?.minimumOrderQuantity ?? product.value?.minimumOrderQuantity ?? 1)
const currentWeightText = computed(() => {
  const variant = selectedVariant.value
  const gram = variant?.packagingWeightGram ?? product.value?.packagingWeightGram ?? null
  if (gram === null || gram === undefined || Number.isNaN(Number(gram))) return "-"
  return `${Number(gram).toFixed(1)}g`
})
const currentMaterialText = computed(() => {
  const detail = product.value
  if (!detail) return ""
  return locale.value === "zh"
    ? (detail.materialText || detail.materialTextEn || "")
    : (detail.materialTextEn || detail.materialText || "")
})
const variants = computed(() => (product.value?.variants || []).map((item) => ({
  ...item,
  color: String(item.color || "").trim(),
  size: String(item.size || "").trim(),
})))
const availableColors = computed(() => {
  if (variants.value.some((item) => item.color)) {
    return Array.from(new Set(variants.value.map((item) => item.color).filter(Boolean)))
  }
  return Array.from(new Set((product.value?.colorOptions || []).map((item) => String(item || "").trim()).filter(Boolean)))
})
const availableSizes = computed(() => {
  if (variants.value.some((item) => item.size)) {
    const scoped = activeColor.value
      ? variants.value.filter((item) => !item.color || item.color === activeColor.value)
      : variants.value
    const sizes = Array.from(new Set(scoped.map((item) => item.size).filter(Boolean)))
    if (sizes.length) return sizes
  }
  return Array.from(new Set((product.value?.sizeOptions || []).map((item) => String(item || "").trim()).filter(Boolean)))
})
const selectedVariant = computed(() => {
  if (!variants.value.length) return null
  const exact = variants.value.find((item) => {
    const colorMatched = !activeColor.value || !item.color || item.color === activeColor.value
    const sizeMatched = !activeSize.value || !item.size || item.size === activeSize.value
    return colorMatched && sizeMatched
  })
  return exact || variants.value[0] || null
})
const productDetailRows = computed(() => {
  const detail = product.value
  if (!detail) return []
  const description = detail.productDetails?.find((item) => /other descriptions|其他说明/i.test(item.label))?.value || "-"
  return [
    { label: t("detail.productNameCn"), value: detail.productName || detail.productNameEn || "-" },
    { label: t("detail.skuLabel"), value: detail.finishedProductCode || "-" },
    { label: t("detail.material"), value: currentMaterialText.value || "-" },
    { label: t("detail.description"), value: description || "-" },
  ]
})
const productSizeRows = computed(() => {
  const detail = product.value
  if (!detail) return []
  if (detail.productSizeRows?.length) {
    return detail.productSizeRows.map((item, index) => ({
      key: `${item.sizeLabel}-${index}`,
      size: item.sizeLabel || "-",
      dimension: item.dimensionLabel || "-",
    }))
  }
  return availableSizes.value.map((size, index) => ({
    key: `${size}-${index}`,
    size,
    dimension: size,
  }))
})
const packagingRows = computed(() => {
  const detail = product.value
  if (!detail) return []
  if (detail.packagingSpecRows?.length) {
    return detail.packagingSpecRows.map((item, index) => ({
      key: `${item.sizeLabel}-${index}`,
      size: item.sizeLabel || "-",
      sizeCm: item.packagingSizeCm || "-",
      sizeInch: item.packagingSizeInch || "-",
      volumeCm: item.packagingVolumeCm || "-",
      volumeInch: item.packagingVolumeInch || "-",
      weightGram: item.packingWeightGram || "-",
      weightLb: item.packageWeightLb || "-",
    }))
  }
  if (selectedVariant.value) {
    return [{
      key: selectedVariant.value.variantId || "default",
      size: selectedVariant.value.variantName || [selectedVariant.value.color, selectedVariant.value.size].filter(Boolean).join(" / ") || "-",
      sizeCm: selectedVariant.value.packagingSizeCm || "-",
      sizeInch: selectedVariant.value.packagingSizeInch || "-",
      volumeCm: selectedVariant.value.packagingVolumeCm || "-",
      volumeInch: selectedVariant.value.packagingVolumeInch || "-",
      weightGram: selectedVariant.value.packagingWeightGram === null || selectedVariant.value.packagingWeightGram === undefined ? "-" : String(selectedVariant.value.packagingWeightGram),
      weightLb: selectedVariant.value.packagingWeightLb === null || selectedVariant.value.packagingWeightLb === undefined ? "-" : String(selectedVariant.value.packagingWeightLb),
    }]
  }
  return []
})

watch(
  () => product.value,
  (detail) => {
    brokenImageUrls.value = []
    currentImage.value = detail?.primaryImageUrl || galleryImages.value[0] || ""
    activeColor.value = availableColors.value[0] || ""
    activeSize.value = availableSizes.value[0] || ""
  },
)

watch(
  () => galleryImages.value,
  (images) => {
    if (!images.length) {
      currentImage.value = ""
      return
    }
    if (!images.includes(currentImage.value)) {
      currentImage.value = images[0]
    }
  },
)

watch(
  () => availableColors.value,
  (colors) => {
    if (colors.length && !colors.includes(activeColor.value)) {
      activeColor.value = colors[0]
    }
  },
)

watch(
  () => availableSizes.value,
  (sizes) => {
    if (sizes.length && !sizes.includes(activeSize.value)) {
      activeSize.value = sizes[0]
    }
  },
)

watch(
  () => productCode.value,
  () => {
    void loadDetail()
  },
)

async function loadDetail() {
  if (!productCode.value) {
    product.value = null
    error.value = t("products.detailNotFound")
    return
  }
  loading.value = true
  error.value = ""
  try {
    product.value = await fetchPublicProductDetail(productCode.value)
  } catch (loadError) {
    product.value = null
    error.value = String((loadError as Error)?.message || loadError || t("products.detailNotFound"))
  } finally {
    loading.value = false
  }
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-"
  return `$${Number(value).toFixed(2)}`
}

function formatMinimumOrder(value: number | null | undefined) {
  const quantity = Number(value || 1)
  if (locale.value === "zh") return `${quantity}件起`
  return `${quantity}piece+`
}

function formatDeliveryText() {
  if (product.value?.deliveryTimeText?.trim()) return product.value.deliveryTimeText.trim()
  if (product.value?.deliveryDays) return `${product.value.deliveryDays}${t("products.days")}`
  return "-"
}

function resolveSwatchColor(color: string) {
  const value = String(color || "").trim()
  if (!value) return "transparent"
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value
  if (/^[a-z\s-]+$/i.test(value)) return value
  return "transparent"
}

function selectColor(color: string) {
  activeColor.value = color
}

function selectSize(size: string) {
  activeSize.value = size
}

function isImageBroken(url: string) {
  return Boolean(url && brokenImageUrls.value.includes(url))
}

function markImageBroken(url: string) {
  if (!url || brokenImageUrls.value.includes(url)) return
  brokenImageUrls.value = [...brokenImageUrls.value, url]
  if (currentImage.value === url) {
    currentImage.value = galleryImages.value.find((item) => item && !brokenImageUrls.value.includes(item)) || ""
  }
}

function openSection(section: DetailSectionKey) {
  activeSection.value = section
}

function goBack() {
  void router.push("/products")
}

function handleCustomDesign() {
  void router.push({
    path: "/auth",
    query: { mode: "register", redirect: route.fullPath },
  })
}

function handleOrderNow() {
  void router.push("/become-supplier")
}

onMounted(() => {
  void loadDetail()
})
</script>

<template>
  <div class="product-reference-detail">
    <div class="product-reference-detail__breadcrumb">product/Product List/<span>product details</span></div>
    <div class="product-reference-detail__panel">
      <div v-if="loading" class="product-reference-detail__notice">{{ t("products.loadingDetail") }}</div>
      <div v-else-if="error" class="product-reference-detail__notice product-reference-detail__notice--error">{{ error }}</div>

      <template v-else-if="product">
        <section class="product-reference-detail__hero">
          <div class="product-reference-detail__gallery-column">
            <div class="product-reference-detail__thumbs">
              <button
                v-for="image in galleryImages"
                :key="image"
                type="button"
                class="product-reference-detail__thumb"
                :class="{ 'is-active': currentImage === image }"
                @click="currentImage = image"
              >
                <img v-if="!isImageBroken(image)" :src="image" :alt="displayName" @error="markImageBroken(image)">
                <span v-else class="product-reference-detail__thumb-placeholder">{{ displayName.slice(0, 1) || "P" }}</span>
              </button>
            </div>
            <div class="product-reference-detail__main-image-wrap">
              <img
                v-if="currentImage && !isImageBroken(currentImage)"
                :src="currentImage"
                :alt="displayName"
                class="product-reference-detail__main-image"
                @error="markImageBroken(currentImage)"
              >
              <div v-else class="product-reference-detail__image-empty">{{ displayName.slice(0, 1) || "P" }}</div>
            </div>
          </div>

          <div class="product-reference-detail__summary">
            <h1 class="product-reference-detail__title">{{ displayName }}</h1>
            <div class="product-reference-detail__price">{{ formatMoney(currentPrice) }}</div>
            <div class="product-reference-detail__moq">{{ formatMinimumOrder(currentMinimumOrder) }}</div>

            <div class="product-reference-detail__facts">
              <div>
                <strong>{{ formatDeliveryText() }}</strong>
                <span>{{ t("detail.deliveryTime") }}</span>
              </div>
              <div>
                <strong>{{ currentWeightText }}</strong>
                <span>{{ t("detail.weightWithPackaging") }}</span>
              </div>
              <div>
                <strong>{{ currentMaterialText || "-" }}</strong>
                <span>{{ t("detail.material") }}</span>
              </div>
            </div>

            <div v-if="availableColors.length" class="product-reference-detail__selector-row">
              <span class="product-reference-detail__selector-label">{{ t("detail.color") }}:</span>
              <div class="product-reference-detail__color-list">
                <button
                  v-for="color in availableColors"
                  :key="color"
                  type="button"
                  class="product-reference-detail__color-button"
                  :class="{ 'is-active': activeColor === color }"
                  :title="color"
                  @click="selectColor(color)"
                >
                  <span class="product-reference-detail__color-swatch" :style="{ background: resolveSwatchColor(color) }" />
                </button>
              </div>
            </div>

            <div v-if="availableSizes.length" class="product-reference-detail__selector-row">
              <span class="product-reference-detail__selector-label">{{ t("detail.size") }}:</span>
              <div class="product-reference-detail__size-list">
                <button
                  v-for="size in availableSizes"
                  :key="size"
                  type="button"
                  class="product-reference-detail__size-button"
                  :class="{ 'is-active': activeSize === size }"
                  @click="selectSize(size)"
                >
                  {{ size }}
                </button>
              </div>
            </div>

            <div class="product-reference-detail__actions">
              <button type="button" class="product-reference-detail__primary-btn" @click="handleCustomDesign">{{ t("detail.customizedDesign") }}</button>
              <button type="button" class="product-reference-detail__secondary-btn" @click="handleOrderNow">{{ t("detail.orderNow") }}</button>
            </div>
          </div>
        </section>

        <section class="product-reference-detail__tabs-strip">
          <button type="button" class="product-reference-detail__tab" :class="{ 'is-active': activeSection === 'details' }" @click="openSection('details')">{{ t("detail.tabDetail") }}</button>
          <button type="button" class="product-reference-detail__tab" :class="{ 'is-active': activeSection === 'size' }" @click="openSection('size')">{{ t("detail.tabSize") }}</button>
          <button type="button" class="product-reference-detail__tab" :class="{ 'is-active': activeSection === 'packaging' }" @click="openSection('packaging')">{{ t("detail.tabPackagingSpecs") }}</button>
        </section>

        <section class="product-reference-detail__sections">
          <section class="product-reference-detail__section">
            <div class="product-reference-detail__section-badge">{{ t("detail.tabDetail") }}</div>
            <div class="product-reference-detail__detail-lines">
              <p v-for="row in productDetailRows" :key="row.label"><strong>{{ row.label }}:</strong> {{ row.value }}</p>
            </div>
          </section>

          <section class="product-reference-detail__section">
            <div class="product-reference-detail__section-badge">{{ t("detail.tabSize") }}</div>
            <div class="product-reference-detail__table-wrap">
              <table class="product-reference-detail__table">
                <thead>
                  <tr>
                    <th>{{ t("detail.size") }}</th>
                    <th>{{ t("detail.dimensionLabel") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in productSizeRows" :key="row.key">
                    <td>{{ row.size }}</td>
                    <td>{{ row.dimension }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="product-reference-detail__section">
            <div class="product-reference-detail__section-badge">{{ t("detail.tabPackagingSpecs") }}</div>
            <div class="product-reference-detail__table-wrap">
              <table class="product-reference-detail__table product-reference-detail__table--packaging">
                <thead>
                  <tr>
                    <th>{{ t("detail.size") }}</th>
                    <th>{{ t("detail.packagingSizeCm") }}</th>
                    <th>{{ t("detail.packagingSizeIn") }}</th>
                    <th>{{ t("detail.packagingVolumeCm") }}</th>
                    <th>{{ t("detail.packagingVolumeIn") }}</th>
                    <th>{{ t("detail.packingWeightG") }}</th>
                    <th>{{ t("detail.packageWeightLb") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in packagingRows" :key="row.key">
                    <td>{{ row.size }}</td>
                    <td>{{ row.sizeCm }}</td>
                    <td>{{ row.sizeInch }}</td>
                    <td>{{ row.volumeCm }}</td>
                    <td>{{ row.volumeInch }}</td>
                    <td>{{ row.weightGram }}</td>
                    <td>{{ row.weightLb }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <div class="product-reference-detail__footer">
          <button type="button" class="product-reference-detail__close-btn" @click="goBack">closure</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.product-reference-detail {
  min-height: 100vh;
  background: #f2f2f2;
  padding: 12px 12px 30px;
}

.product-reference-detail__breadcrumb {
  max-width: 1360px;
  margin: 0 auto 8px;
  color: #8b8b8b;
  font-size: 12px;
}

.product-reference-detail__breadcrumb span {
  color: #3f86ff;
}

.product-reference-detail__panel {
  max-width: 1360px;
  margin: 0 auto;
  border: 1px solid #dfdfdf;
  background: #f7f7f7;
  padding: 12px;
}

.product-reference-detail__hero {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 28px;
  padding: 10px 6px 16px;
}

.product-reference-detail__gallery-column {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 10px;
}

.product-reference-detail__thumbs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-reference-detail__thumb {
  width: 50px;
  height: 50px;
  padding: 0;
  border: 1px solid #d8d8d8;
  background: #fff;
  cursor: pointer;
}

.product-reference-detail__thumb.is-active {
  border-color: #3f86ff;
}

.product-reference-detail__thumb-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #a9a9a9;
  font-size: 18px;
  font-weight: 700;
}

.product-reference-detail__thumb img,
.product-reference-detail__main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-reference-detail__main-image-wrap {
  border: 1px solid #d8d8d8;
  background: #fff;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
}

.product-reference-detail__image-empty {
  color: #bbb;
  font-size: 48px;
  font-weight: 700;
}

.product-reference-detail__summary {
  padding-top: 8px;
}

.product-reference-detail__title {
  margin: 0;
  color: #3f3f3f;
  font-size: 22px;
  line-height: 1.2;
}

.product-reference-detail__price {
  margin-top: 12px;
  color: #f3a22f;
  font-size: 16px;
  font-weight: 700;
}

.product-reference-detail__moq {
  margin-top: 2px;
  color: #8a8a8a;
  font-size: 12px;
}

.product-reference-detail__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e5e5e5;
}

.product-reference-detail__facts strong {
  display: block;
  color: #555;
  font-size: 13px;
  font-weight: 500;
}

.product-reference-detail__facts span {
  display: block;
  margin-top: 8px;
  color: #8d8d8d;
  font-size: 12px;
}

.product-reference-detail__selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

.product-reference-detail__selector-label {
  color: #555;
  font-size: 13px;
}

.product-reference-detail__color-list,
.product-reference-detail__size-list,
.product-reference-detail__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.product-reference-detail__color-button,
.product-reference-detail__size-button,
.product-reference-detail__primary-btn,
.product-reference-detail__secondary-btn,
.product-reference-detail__tab,
.product-reference-detail__close-btn {
  border-radius: 2px;
  font-size: 12px;
  cursor: pointer;
}

.product-reference-detail__color-button {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid #86b4ff;
  background: #fff;
}

.product-reference-detail__color-button.is-active {
  box-shadow: 0 0 0 1px #2d7df6 inset;
}

.product-reference-detail__color-swatch {
  display: block;
  width: 100%;
  height: 100%;
}

.product-reference-detail__size-button {
  min-width: 82px;
  min-height: 28px;
  border: 1px solid #9fc3ff;
  background: #fff;
  color: #2d7df6;
  padding: 0 12px;
}

.product-reference-detail__size-button.is-active {
  background: #eff5ff;
}

.product-reference-detail__actions {
  margin-top: 30px;
}

.product-reference-detail__primary-btn,
.product-reference-detail__secondary-btn {
  min-height: 30px;
  padding: 0 16px;
}

.product-reference-detail__primary-btn {
  border: 1px solid #2d7df6;
  background: #2d7df6;
  color: #fff;
}

.product-reference-detail__secondary-btn {
  border: 1px solid #d8d8d8;
  background: #fff;
  color: #666;
}

.product-reference-detail__tabs-strip {
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 44px;
  border: 1px solid #e4e4e4;
  background: #fafafa;
  padding: 0 10px;
}

.product-reference-detail__tab {
  border: none;
  background: transparent;
  color: #666;
  min-height: 36px;
  padding: 0 10px;
}

.product-reference-detail__tab.is-active {
  color: #2d7df6;
  border-bottom: 2px solid #2d7df6;
}

.product-reference-detail__sections {
  background: #fff;
  border: 1px solid #ededed;
  border-top: none;
  padding: 18px 14px;
}

.product-reference-detail__section + .product-reference-detail__section {
  margin-top: 22px;
  border-top: 1px solid #f0f0f0;
  padding-top: 18px;
}

.product-reference-detail__section-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 14px;
  background: #2d7df6;
  color: #fff;
  font-size: 12px;
  border-radius: 2px;
}

.product-reference-detail__detail-lines {
  margin-top: 12px;
  color: #5d5d5d;
  font-size: 12px;
  line-height: 1.7;
}

.product-reference-detail__detail-lines p {
  margin: 0;
}

.product-reference-detail__table-wrap {
  margin-top: 12px;
  overflow-x: auto;
}

.product-reference-detail__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #666;
}

.product-reference-detail__table th,
.product-reference-detail__table td {
  border: 1px solid #e6eaf2;
  padding: 10px 12px;
  text-align: center;
}

.product-reference-detail__table th {
  background: #eef3fb;
  color: #4f4f4f;
  font-weight: 600;
}

.product-reference-detail__footer {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

.product-reference-detail__close-btn {
  min-width: 48px;
  min-height: 24px;
  border: 1px solid #d8d8d8;
  background: #f8f8f8;
  color: #666;
}

.product-reference-detail__notice {
  border: 1px solid #ddd;
  background: #fff;
  padding: 18px;
  color: #666;
  font-size: 12px;
}

.product-reference-detail__notice--error {
  background: #fff5f5;
  color: #b42318;
}

@media (max-width: 960px) {
  .product-reference-detail__hero {
    grid-template-columns: 1fr;
  }

  .product-reference-detail__facts {
    grid-template-columns: 1fr;
  }
}
</style>
