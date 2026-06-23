<template>
  <div class="storefront-page">
    <section class="storefront-hero" :style="heroStyle">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <img v-if="resolvedStoreLogoUrl" :src="resolvedStoreLogoUrl" :alt="t('storeLogo')" class="store-logo" />
        <h1>{{ storefront?.store_name || t("storefront") }}</h1>
        <p>{{ storefront?.store_bio || t("storefrontBioFallback") }}</p>
        <div class="hero-links">
          <a v-if="storefront?.store_website_url" :href="storefront.store_website_url" target="_blank" rel="noreferrer">{{ t("website") }}</a>
          <a v-if="storefront?.store_instagram_url" :href="storefront.store_instagram_url" target="_blank" rel="noreferrer">{{ t("instagram") }}</a>
          <a v-if="storefront?.store_facebook_url" :href="storefront.store_facebook_url" target="_blank" rel="noreferrer">{{ t("facebook") }}</a>
          <a v-if="storefront?.store_tiktok_url" :href="storefront.store_tiktok_url" target="_blank" rel="noreferrer">{{ t("tiktok") }}</a>
          <a v-if="storefront?.store_contact_email" :href="`mailto:${storefront.store_contact_email}`">{{ t("contact") }}</a>
        </div>
      </div>
    </section>

    <section class="storefront-shell">
      <div v-if="error" class="status-card error">{{ error }}</div>
      <div v-else-if="notice" class="status-card success">{{ notice }}</div>
      <div v-if="isAdminPreview" class="status-card info">
        <strong>{{ t("adminPreview") }}</strong>
        <span>{{ adminPreviewMessage }}</span>
      </div>

      <div class="content-section">
        <div class="section-header">
          <div>
            <span class="section-kicker">{{ t("templates") }}</span>
            <h2>{{ t("storefrontTemplatesTitle") }}</h2>
            <p>{{ t("storefrontTemplatesSubtitle") }}</p>
          </div>
        </div>
        <div class="gallery-filters">
          <div class="gallery-filters-left">
            <CategoryCascadeSelector
              v-model="selectedTemplateCategoryId"
              :categories="templateCategories"
              clear-value="all"
              :allow-non-leaf="true"
              :show-clear-button="false"
              :show-recent-options="false"
              :show-selection-summary="false"
              :level1-placeholder="t('allCategories')"
              :level2-placeholder="t('selectLevel2')"
              :level3-placeholder="t('selectLevel3')"
            />
          </div>
          <div class="gallery-filters-right">
            <FilterDropdown
              v-model="selectedTemplateApiStatus"
              :options="listingApiStatusOptions"
            />
            <div class="gallery-search-wrapper">
              <span class="gallery-search-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                v-model="templateSearch"
                class="gallery-search-input"
                :placeholder="t('searchTemplatePlaceholder')"
              />
            </div>
          </div>
        </div>
        <div v-if="filteredTemplateCards.length" class="feature-grid feature-grid--templates">
          <article
            v-for="template in paginatedTemplateCards"
            :key="template.listing_id || template.template_id"
            class="feature-card feature-card--template"
          >
            <div
              class="feature-card-media"
              tabindex="0"
              @mouseenter="setHoveredStorefrontCard(createTemplateHoverDetail(template), $event)"
              @mouseleave="clearHoveredStorefrontCard"
              @focusin="setHoveredStorefrontCard(createTemplateHoverDetail(template), $event)"
              @focusout="clearHoveredStorefrontCard"
            >
              <span
                v-if="shouldShowTemplatePrivateLock(template)"
                class="feature-card-lock-badge"
                :title="t('private')"
                :aria-label="t('private')"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                  <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
                </svg>
              </span>
              <img
                v-if="resolveTemplateCover(template)"
                :src="resolveTemplateCover(template)"
                :alt="resolveTemplateTitle(template)"
              />
              <div v-else class="feature-card-placeholder">
                {{ resolveCardInitial(resolveTemplateTitle(template)) }}
              </div>
            </div>
            <div class="feature-card-body">
              <div class="feature-card-top">
                <h3>{{ resolveTemplateTitle(template) }}</h3>
                <span class="feature-card-badge info">{{ resolveTemplateAccessLabel(template) }}</span>
              </div>
              <div class="feature-card-meta">
                <span v-if="template.template_code">{{ template.template_code }}</span>
                <span v-if="formatMarketplaceCreatorName(template.creator_name)">{{ t("by") }} {{ formatMarketplaceCreatorName(template.creator_name) }}</span>
              </div>
              <div class="feature-card-actions">
                <button type="button" class="next-action primary" @click="openTemplate(template)">
                  {{ t("tryDesign") }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="gallery-empty">{{ t("noPublicTemplates") }}</div>
        <div v-if="filteredTemplateCards.length" class="pagination-bar">
          <span class="pagination-summary">{{ resolvePageSummary(templatePage, TEMPLATE_PAGE_SIZE, filteredTemplateCards.length) }}</span>
          <div class="pagination-actions">
            <button type="button" class="pagination-btn" :disabled="templatePage <= 1" @click="setTemplatePage(templatePage - 1)">{{ t("previous") }}</button>
            <span class="pagination-status">{{ t("page") }} {{ templatePage }} / {{ templateTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="templatePage >= templateTotalPages" @click="setTemplatePage(templatePage + 1)">{{ t("next") }}</button>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <div>
            <span class="section-kicker">{{ t("artwork") }}</span>
            <h2>{{ t("storefrontArtworkTitle") }}</h2>
            <p>{{ t("storefrontArtworkSubtitle") }}</p>
          </div>
        </div>
        <div class="artwork-filters">
          <div class="gallery-filters-left">
            <CategoryCascadeSelector
              v-model="selectedArtworkCategoryId"
              :categories="artworkCategories"
              clear-value="all"
              :allow-non-leaf="true"
              :show-clear-button="false"
              :show-recent-options="false"
              :show-selection-summary="false"
              :level1-placeholder="t('allCategories')"
              :level2-placeholder="t('selectLevel2')"
              :level3-placeholder="t('selectLevel3')"
            />
          </div>
          <div class="gallery-filters-right">
            <div class="gallery-search-wrapper">
              <span class="gallery-search-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                v-model="artworkSearch"
                class="gallery-search-input"
                :placeholder="t('searchArtworkPlaceholder')"
              />
            </div>
          </div>
        </div>
        <div v-if="filteredArtworkCards.length" class="feature-grid feature-grid--artwork">
          <article
            v-for="artwork in paginatedArtworkCards"
            :key="artwork.artwork_id"
            class="feature-card feature-card--artwork"
          >
            <div
              class="feature-card-media feature-card-media--square"
              tabindex="0"
              @mouseenter="setHoveredStorefrontCard(createArtworkHoverDetail(artwork), $event)"
              @mouseleave="clearHoveredStorefrontCard"
              @focusin="setHoveredStorefrontCard(createArtworkHoverDetail(artwork), $event)"
              @focusout="clearHoveredStorefrontCard"
            >
              <span
                v-if="shouldShowArtworkPrivateLock(artwork)"
                class="feature-card-lock-badge"
                :title="t('private')"
                :aria-label="t('private')"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                  <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
                </svg>
              </span>
              <img
                v-if="resolveArtworkCoverUrl(artwork)"
                :src="resolveArtworkCoverUrl(artwork)"
                :alt="artwork.name"
              />
              <div v-else class="feature-card-placeholder">
                {{ resolveCardInitial(artwork.name) }}
              </div>
            </div>
            <div class="feature-card-body">
              <div class="feature-card-top">
                <h3>{{ artwork.name }}</h3>
                <div class="feature-card-badge-group">
                  <span class="feature-card-badge" :class="{ paid: artwork.commerce_type === 'paid', success: artwork.commerce_type !== 'paid' }">
                    {{ artwork.commerce_type === "paid" ? t("paid") : t("free") }}
                  </span>
                  <span v-if="isAdminPreview && resolveArtworkAccessLabel(artwork)" class="feature-card-badge info">
                    {{ resolveArtworkAccessLabel(artwork) }}
                  </span>
                </div>
              </div>
              <div class="feature-card-meta">
                <span v-if="formatMarketplaceCreatorName(artwork.creator_name)">{{ t("by") }} {{ formatMarketplaceCreatorName(artwork.creator_name) }}</span>
                <span>{{ resolveArtworkPriceLabel(artwork) }}</span>
              </div>
              <div class="feature-card-actions">
                <button
                  v-if="showPurchaseButton(artwork)"
                  type="button"
                  class="next-action primary"
                  :disabled="buyingArtworkId === artwork.artwork_id"
                  @click="purchase(artwork.artwork_id)"
                >
                  {{ buyingArtworkId === artwork.artwork_id ? t("processing") : t("unlock") }}
                </button>
                <button
                  v-else-if="canUseInPreview(artwork)"
                  type="button"
                  class="artwork-card-action"
                  @click="goToLibrary(artwork.artwork_id)"
                >
                  {{ t("openPreview") }}
                </button>
                <button v-else type="button" class="artwork-card-action" disabled>
                  {{ t("unavailable") }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="gallery-empty">{{ t("noListedArtwork") }}</div>
        <div v-if="filteredArtworkCards.length" class="pagination-bar">
          <span class="pagination-summary">{{ resolvePageSummary(artworkPage, ARTWORK_PAGE_SIZE, filteredArtworkCards.length) }}</span>
          <div class="pagination-actions">
            <button type="button" class="pagination-btn" :disabled="artworkPage <= 1" @click="setArtworkPage(artworkPage - 1)">{{ t("previous") }}</button>
            <span class="pagination-status">{{ t("page") }} {{ artworkPage }} / {{ artworkTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="artworkPage >= artworkTotalPages" @click="setArtworkPage(artworkPage + 1)">{{ t("next") }}</button>
          </div>
        </div>
      </div>

    </section>

    <teleport to="body">
      <div
        v-if="hoveredStorefrontCard"
        class="home-hover-card"
        :class="hoveredStorefrontCardPlacement"
        :style="hoveredStorefrontCardStyle"
      >
        <div class="home-hover-card-media" :class="{ empty: !hoveredStorefrontCard.imageUrl }">
          <img
            v-if="hoveredStorefrontCard.imageUrl"
            :src="hoveredStorefrontCard.imageUrl"
            :alt="hoveredStorefrontCard.title"
          />
          <div v-else class="home-hover-card-placeholder">
            {{ hoveredStorefrontCard.placeholder }}
          </div>
        </div>
        <div class="home-hover-card-body">
          <div class="home-hover-card-top">
            <div>
              <span class="home-hover-card-eyebrow">{{ hoveredStorefrontCard.kindLabel }}</span>
              <h3>{{ hoveredStorefrontCard.title }}</h3>
            </div>
            <span
              v-if="hoveredStorefrontCard.badgeLabel"
              class="home-hover-card-badge"
              :class="hoveredStorefrontCard.badgeTone"
            >
              {{ hoveredStorefrontCard.badgeLabel }}
            </span>
          </div>
          <div class="home-hover-card-rows">
            <div
              v-for="row in hoveredStorefrontCard.rows"
              :key="`${hoveredStorefrontCard.key}-${row.label}`"
              class="home-hover-card-row"
            >
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </div>
          </div>
          <p v-if="hoveredStorefrontCard.description" class="home-hover-card-copy">
            {{ hoveredStorefrontCard.description }}
          </p>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRoute, useRouter } from "vue-router"
import { resolveApiErrorMessage, resolveAssetUrl } from "../api/client"
import { useAuthStore } from "../stores/auth"
import { useArtworkStore } from "../stores/artworks"
import { useStorefrontStore } from "../stores/storefront"
import { useUiLocaleStore } from "../stores/uiLocale"
import type { CategoryNode } from "../stores/platform"
import type { ArtworkListItem, TemplateCenterListing } from "../api/client"
import CategoryCascadeSelector from "../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../components/FilterDropdown.vue"
import { computeFloatingHoverOverlay } from "../utils/floatingHoverOverlay"
import { formatMarketplaceCreatorName } from "./admin/centerView"
import { buildCategoryIdSet, formatTemplateDate } from "./admin/repositoryView"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const storefrontStore = useStorefrontStore()
const artworkStore = useArtworkStore()
const { storefront, error } = storeToRefs(storefrontStore)
const { locale } = storeToRefs(uiLocaleStore)

const STOREFRONT_I18N = {
  en: {
    storeLogo: "Creative space logo",
    storefront: "Creative Space",
    storefrontBioFallback: "Discover listed templates and artwork from this creative space.",
    website: "Website",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    contact: "Contact",
    adminPreview: "Admin Preview",
    templates: "Templates",
    storefrontTemplatesTitle: "Start With Ready-to-Sell Templates",
    storefrontTemplatesSubtitle: "Pick a polished product canvas, then open preview to test how customers will personalize it.",
    searchTemplatePlaceholder: "Search template name, code, or category",
    allCategories: "All Categories",
    selectLevel2: "Select Level 2",
    selectLevel3: "Select Level 3",
    filterStorefrontTemplates: "Filter creative space templates by category.",
    by: "By",
    tryDesign: "Try Design",
    noPublicTemplates: "No public templates are listed right now.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    artwork: "Artwork",
    storefrontArtworkTitle: "Find Artwork That Sparks New Products",
    storefrontArtworkSubtitle: "Browse listed marketplace artwork, narrow by category, and open preview when something fits your concept.",
    searchArtworkPlaceholder: "Search artwork name, code, creator, or category",
    filterStorefrontArtwork: "Filter creative space artwork by category.",
    paid: "Paid",
    free: "Free",
    processing: "Processing...",
    unlock: "Unlock",
    openPreview: "Open Preview",
    unavailable: "Unavailable",
    noListedArtwork: "No listed artwork is live right now.",
    public: "Public",
    private: "Private",
    pendingReview: "Pending Review",
    needsUpdate: "Needs Update",
    draft: "Draft",
    allAccessStates: "All Access States",
    integrationReady: "Integration Ready",
    catalogOnly: "Catalog Only",
    previewPublicFallbackWithSlug: "Showing the public storefront for slug \"{slug}\" because the admin draft preview is unavailable right now.",
    previewPublicFallback: "Showing the public storefront because the admin draft preview is unavailable right now.",
    previewDraftWithSlug: "Admin preview uses the signed-in tenant draft \"{slug}\". The URL slug \"{routeSlug}\" is only a route marker until a matching tenant context is provided.",
    previewDraft: "Admin preview uses the signed-in tenant draft. The URL slug \"{routeSlug}\" is only a route marker until a matching tenant context is provided.",
    previewCurrentDraft: "Previewing the current storefront draft with its latest saved settings, templates, and artwork.",
    assetReadyBoth: "Logo + Banner ready",
    assetReadyLogo: "Logo ready",
    assetReadyBanner: "Banner ready",
    assetNeeds: "Needs assets",
    notSet: "Not set",
    storeSlug: "Store Slug",
    contactEmail: "Contact Email",
    storeWebsite: "Store Website",
    lastUpdated: "Last Updated",
    untitledTemplate: "Untitled Template",
    uncategorized: "Uncategorized",
    tokens: "Tokens",
    freeToUse: "Free to use",
    artworkUnlocked: "Artwork already unlocked for this tenant.",
    artworkUnlockedBalance: "Artwork unlocked. Remaining balance: {balance} tokens.",
    showingZeroItems: "Showing 0 items",
    showingRange: "Showing {start}-{end} of {total}",
  },
  zh: {
    storeLogo: "创作空间标志",
    storefront: "创作空间",
    storefrontBioFallback: "查看该创作空间已上架的模板与作品。",
    website: "网站",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    contact: "联系",
    adminPreview: "后台预览",
    templates: "模板",
    storefrontTemplatesTitle: "从可直接售卖的模板开始",
    storefrontTemplatesSubtitle: "挑选成熟的产品画布后，打开预览测试客户如何进行个性化设计。",
    searchTemplatePlaceholder: "搜索模板名称、编码或分类",
    allCategories: "全部分类",
    selectLevel2: "选择二级分类",
    selectLevel3: "选择三级分类",
    filterStorefrontTemplates: "按分类筛选创作空间模板。",
    by: "作者",
    tryDesign: "开始设计",
    noPublicTemplates: "当前没有公开上架的模板。",
    previous: "上一页",
    next: "下一页",
    page: "第",
    artwork: "作品",
    storefrontArtworkTitle: "找到能激发新产品灵感的作品",
    storefrontArtworkSubtitle: "浏览已上架的市场作品，按分类筛选，并在合适时进入预览。",
    searchArtworkPlaceholder: "搜索作品名称、编码、作者或分类",
    filterStorefrontArtwork: "按分类筛选创作空间作品。",
    paid: "付费",
    free: "免费",
    processing: "处理中...",
    unlock: "解锁",
    openPreview: "打开预览",
    unavailable: "不可用",
    noListedArtwork: "当前没有已上架作品。",
    public: "公开",
    private: "私有",
    pendingReview: "待审核",
    needsUpdate: "需更新",
    draft: "草稿",
    allAccessStates: "全部访问状态",
    integrationReady: "可用于集成",
    catalogOnly: "仅目录可见",
    previewPublicFallbackWithSlug: "当前后台草稿预览不可用，已改为显示 slug 为“{slug}”的公开店铺。",
    previewPublicFallback: "当前后台草稿预览不可用，已改为显示公开店铺。",
    previewDraftWithSlug: "后台预览使用的是当前登录租户草稿“{slug}”。URL 中的 slug “{routeSlug}”在提供匹配租户上下文前仅作路由标记。",
    previewDraft: "后台预览使用的是当前登录租户草稿。URL 中的 slug “{routeSlug}”在提供匹配租户上下文前仅作路由标记。",
    previewCurrentDraft: "当前展示的是店铺草稿的最新已保存设置、模板与作品。",
    assetReadyBoth: "标志与横幅已就绪",
    assetReadyLogo: "标志已就绪",
    assetReadyBanner: "横幅已就绪",
    assetNeeds: "缺少素材",
    notSet: "未设置",
    storeSlug: "店铺 Slug",
    contactEmail: "联系邮箱",
    storeWebsite: "店铺网站",
    lastUpdated: "最后更新",
    untitledTemplate: "未命名模板",
    uncategorized: "未分类",
    tokens: "令牌",
    freeToUse: "免费使用",
    artworkUnlocked: "该租户已解锁此作品。",
    artworkUnlockedBalance: "作品已解锁，剩余余额：{balance} 令牌。",
    showingZeroItems: "显示 0 项",
    showingRange: "显示 {start}-{end} / 共 {total} 项",
  },
} as const

function t(key: keyof typeof STOREFRONT_I18N.en) {
  return STOREFRONT_I18N[locale.value][key] || STOREFRONT_I18N.en[key]
}

function formatText(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""))
}

const notice = ref("")
const buyingArtworkId = ref("")
const adminPreviewFallbackToPublic = ref(false)
const isAdminPreview = computed(() => String(route.query.admin_view || "") === "1")
const previewTenantId = computed(() => String(route.query.tenant_id || "").trim())
const storefrontStatusLabel = computed(() => {
  const statusValue = String(storefront.value?.store_status || "draft").trim().toLowerCase()
  if (statusValue === "approved" || statusValue === "public") return t("public")
  if (statusValue === "private") return t("private")
  if (statusValue === "pending_review") return t("pendingReview")
  if (statusValue === "rejected") return t("needsUpdate")
  return t("draft")
})
const storefrontStatusTone = computed(() => {
  const statusValue = String(storefront.value?.store_status || "draft").trim().toLowerCase()
  if (statusValue === "approved" || statusValue === "public") return "success"
  if (statusValue === "pending_review") return "paid"
  return "info"
})
const listingApiStatusOptions = [
  { value: "all", label: t("allAccessStates") },
  { value: "enabled", label: t("integrationReady") },
  { value: "disabled", label: t("catalogOnly") },
]

const templateSearch = ref("")
const selectedTemplateApiStatus = ref("all")
const selectedTemplateCategoryId = ref("all")
const artworkSearch = ref("")
const selectedArtworkCategoryId = ref("all")
const templatePage = ref(1)
const artworkPage = ref(1)

type HoverOverlayClass =
  | "home-hover-card--bottom-left"
  | "home-hover-card--bottom-right"
  | "home-hover-card--top-left"
  | "home-hover-card--top-right"

type HoverDetailRow = {
  label: string
  value: string
}

type StorefrontHoverDetail = {
  key: string
  kindLabel: string
  title: string
  imageUrl: string
  placeholder: string
  badgeLabel?: string
  badgeTone?: "info" | "paid" | "success"
  rows: HoverDetailRow[]
  description: string
}

const hoveredStorefrontCard = ref<StorefrontHoverDetail | null>(null)
const hoveredStorefrontCardPlacement = ref<HoverOverlayClass>("home-hover-card--bottom-left")
const hoveredStorefrontCardStyle = ref<Record<string, string>>({})

const HOME_FEATURE_ROWS = 2
const TEMPLATE_GRID_COLUMNS = 5
const ARTWORK_GRID_COLUMNS = 6
const TEMPLATE_PAGE_SIZE = TEMPLATE_GRID_COLUMNS * HOME_FEATURE_ROWS
const ARTWORK_PAGE_SIZE = ARTWORK_GRID_COLUMNS * HOME_FEATURE_ROWS
const adminPreviewMessage = computed(() => {
  const loadedSlug = String(storefront.value?.store_slug || "").trim()
  const routeSlug = String(route.params.slug || "").trim()
  if (adminPreviewFallbackToPublic.value) {
    return routeSlug
      ? formatText(t("previewPublicFallbackWithSlug"), { slug: routeSlug })
      : t("previewPublicFallback")
  }
  if (!previewTenantId.value && routeSlug && routeSlug !== loadedSlug) {
    return loadedSlug
      ? formatText(t("previewDraftWithSlug"), { slug: loadedSlug, routeSlug })
      : formatText(t("previewDraft"), { routeSlug })
  }
  return t("previewCurrentDraft")
})

const listedTemplateCards = computed(() => {
  const items = Array.isArray(storefront.value?.templates) ? storefront.value?.templates : []
  return (items as TemplateCenterListing[]).filter((item) => String(item.marketplace_status || "listed").toLowerCase() === "listed")
})
const listedArtworkCards = computed(() => {
  const items = Array.isArray(storefront.value?.artworks) ? storefront.value?.artworks : []
  return (items as ArtworkListItem[]).filter((item) => String(item.visibility_status || "").toLowerCase() === "listed")
})

const templateCategories = computed(() => buildStorefrontCategoryTree(listedTemplateCards.value))
const artworkCategories = computed(() => buildStorefrontCategoryTree(listedArtworkCards.value))
const selectedTemplateCategoryIdSet = computed(() => buildCategoryIdSet(selectedTemplateCategoryId.value, templateCategories.value))
const selectedArtworkCategoryIdSet = computed(() => buildCategoryIdSet(selectedArtworkCategoryId.value, artworkCategories.value))

const filteredTemplateCards = computed(() => {
  const keyword = normalizeMarketplaceSearch(templateSearch.value)
  const squashedKeyword = squashMarketplaceSearch(templateSearch.value)
  return listedTemplateCards.value.filter((item) => {
    if (selectedTemplateApiStatus.value !== "all" && (item.tenant_api_status || "disabled") !== selectedTemplateApiStatus.value) return false
    if (!matchesMarketplaceSearch(keyword, squashedKeyword, [
      resolveTemplateTitle(item),
      item.template_code,
      item.template_id,
      resolveTemplateCategory(item),
      formatMarketplaceCreatorName(item.creator_name),
      resolveTemplateAccessLabel(item),
    ])) return false
    if (selectedTemplateCategoryId.value === "all") return true
    return selectedTemplateCategoryIdSet.value?.has(resolveTemplateCategoryFilterId(item)) || false
  })
})
const filteredArtworkCards = computed(() => {
  const keyword = normalizeMarketplaceSearch(artworkSearch.value)
  const squashedKeyword = squashMarketplaceSearch(artworkSearch.value)
  return listedArtworkCards.value.filter((item) => {
    if (!matchesMarketplaceSearch(keyword, squashedKeyword, [
      item.name,
      item.artwork_code,
      item.artwork_id,
      resolveArtworkCategory(item),
      formatMarketplaceCreatorName(item.creator_name),
      item.commerce_type === "paid" ? "paid" : "free",
    ])) return false
    if (selectedArtworkCategoryId.value === "all") return true
    return selectedArtworkCategoryIdSet.value?.has(resolveArtworkCategoryFilterId(item)) || false
  })
})

const templateTotalPages = computed(() => resolveTotalPages(filteredTemplateCards.value.length, TEMPLATE_PAGE_SIZE))
const artworkTotalPages = computed(() => resolveTotalPages(filteredArtworkCards.value.length, ARTWORK_PAGE_SIZE))
const paginatedTemplateCards = computed(() => paginateItems(filteredTemplateCards.value, templatePage.value, TEMPLATE_PAGE_SIZE))
const paginatedArtworkCards = computed(() => paginateItems(filteredArtworkCards.value, artworkPage.value, ARTWORK_PAGE_SIZE))

const resolvedStoreLogoUrl = computed(() => resolveAssetUrl(String(storefront.value?.store_logo_url || "")))
const resolvedStoreBannerUrl = computed(() => resolveAssetUrl(String(storefront.value?.store_banner_url || "")))
const heroStyle = computed(() => ({
  backgroundImage: resolvedStoreBannerUrl.value ? `url(${resolvedStoreBannerUrl.value})` : "linear-gradient(135deg, #0f172a, #312e81 55%, #7c3aed)",
}))
const storefrontPreviewLinks = computed(() => {
  const items = [
    { label: t("website"), href: String(storefront.value?.store_website_url || "").trim() },
    { label: t("instagram"), href: String(storefront.value?.store_instagram_url || "").trim() },
    { label: t("facebook"), href: String(storefront.value?.store_facebook_url || "").trim() },
    { label: t("tiktok"), href: String(storefront.value?.store_tiktok_url || "").trim() },
    { label: t("contact"), href: storefront.value?.store_contact_email ? `mailto:${String(storefront.value.store_contact_email).trim()}` : "" },
  ]
  return items.filter((item) => item.href)
})
const storefrontAssetStatus = computed(() => {
  if (resolvedStoreLogoUrl.value && resolvedStoreBannerUrl.value) return t("assetReadyBoth")
  if (resolvedStoreLogoUrl.value) return t("assetReadyLogo")
  if (resolvedStoreBannerUrl.value) return t("assetReadyBanner")
  return t("assetNeeds")
})
const storefrontPreviewDetails = computed(() => {
  const fallback = t("notSet")
  return [
    { label: t("storeSlug"), value: storefront.value?.store_slug || fallback },
    { label: t("contactEmail"), value: storefront.value?.store_contact_email || fallback, href: storefront.value?.store_contact_email ? `mailto:${storefront.value.store_contact_email}` : "" },
    { label: t("storeWebsite"), value: storefront.value?.store_website_url || fallback, href: storefront.value?.store_website_url || "" },
    { label: t("lastUpdated"), value: storefront.value?.store_updated_at ? formatTemplateDate(storefront.value.store_updated_at) : fallback },
  ]
})

function resolveTemplateTitle(template: Partial<TemplateCenterListing>) {
  return String(template.title || template.template_code || template.template_id || t("untitledTemplate"))
}

function resolveTemplateCategory(template: Partial<TemplateCenterListing>) {
  return String(template.category_path || t("uncategorized"))
}

function resolveArtworkCategory(artwork: Partial<ArtworkListItem>) {
  return String(artwork.category_path || t("uncategorized"))
}

function resolveArtworkAccessScope(artwork: Partial<ArtworkListItem>) {
  const normalized = String(artwork.access_scope || "").trim().toLowerCase()
  if (normalized === "private" || normalized === "public") {
    return normalized
  }
  return ""
}

function resolveArtworkAccessLabel(artwork: Partial<ArtworkListItem>) {
  const accessScope = resolveArtworkAccessScope(artwork)
  if (accessScope === "private") return t("private")
  if (accessScope === "public") return t("public")
  return ""
}

function shouldShowTemplatePrivateLock(template: Partial<TemplateCenterListing>) {
  return String(template.access_scope || "").trim().toLowerCase() === "private"
}

function shouldShowArtworkPrivateLock(artwork: Partial<ArtworkListItem>) {
  return resolveArtworkAccessScope(artwork) === "private"
}

function resolveTemplateCover(template: Partial<TemplateCenterListing>) {
  return resolveAssetUrl(String(template.cover_url || ""))
}

function resolveArtworkCoverUrl(artwork: Partial<ArtworkListItem>) {
  return resolveAssetUrl(String(artwork.preview_url || artwork.original_url || ""))
}

function resolveTemplateReference(template: Partial<TemplateCenterListing>) {
  return String(template.listing_id || template.template_code || template.template_id || "").trim()
}

function resolveTemplateAccessLabel(template: Partial<TemplateCenterListing>) {
  return template.tenant_api_status === "enabled" ? t("integrationReady") : t("catalogOnly")
}

function resolveArtworkPriceLabel(artwork: Partial<ArtworkListItem>) {
  return artwork.commerce_type === "paid" ? `${artwork.price_tokens || 0} ${t("tokens")}` : t("freeToUse")
}

function resolveTemplateCategoryFilterId(template: Partial<TemplateCenterListing>) {
  const categoryPath = resolveTemplateCategory(template)
  return String(template.category_id || `path:${categoryPath}`)
}

function resolveArtworkCategoryFilterId(artwork: Partial<ArtworkListItem>) {
  const categoryPath = resolveArtworkCategory(artwork)
  return String(artwork.category_id || `path:${categoryPath}`)
}

function openTemplate(template: Partial<TemplateCenterListing>) {
  const templateReference = resolveTemplateReference(template)
  if (!templateReference) return
  const previewQuery = buildPreviewQuery({ templateId: templateReference })
  if (!authStore.accessToken) {
    router.push({ path: "/auth", query: { mode: "login", redirect: `/preview?${new URLSearchParams(previewQuery).toString()}` } })
    return
  }
  router.push({ path: "/preview", query: previewQuery })
}

function goToLibrary(artworkId?: string) {
  const previewQuery = buildPreviewQuery({ artworkId })
  if (!authStore.accessToken) {
    router.push({ path: "/auth", query: { mode: "login", redirect: `/preview?${new URLSearchParams(previewQuery).toString()}` } })
    return
  }
  router.push({ path: "/preview", query: previewQuery })
}

function buildPreviewQuery(options: { templateId?: string; artworkId?: string }) {
  const query: Record<string, string> = {
    source: "storefront",
  }
  const slug = String(route.params.slug || "").trim()
  if (slug) {
    query.storefront_slug = slug
  }
  if (options.templateId) {
    query.template_id = options.templateId
  }
  if (options.artworkId) {
    query.artwork_id = options.artworkId
  }
  if (isAdminPreview.value) {
    query.admin_view = "1"
    if (previewTenantId.value) {
      query.tenant_id = previewTenantId.value
    }
    const tenantLabel = String(route.query.tenant_label || "").trim()
    if (tenantLabel) {
      query.tenant_label = tenantLabel
    }
  }
  return query
}

function showPurchaseButton(artwork: ArtworkListItem) {
  return artwork.commerce_type === "paid" && Boolean(artwork.can_purchase)
}

function canUseInPreview(artwork: ArtworkListItem) {
  return artwork.commerce_type !== "paid" || Boolean(artwork.unlocked) || Boolean(artwork.purchased)
}

async function purchase(artworkId: string) {
  if (!authStore.accessToken) {
    router.push({ path: "/auth", query: { mode: "login", redirect: route.fullPath } })
    return
  }
  buyingArtworkId.value = artworkId
  notice.value = ""
  try {
    const result = await artworkStore.purchaseArtwork(artworkId)
    await storefrontStore.loadPublicStorefront(String(route.params.slug || ""))
    notice.value = result.already_owned
      ? t("artworkUnlocked")
      : formatText(t("artworkUnlockedBalance"), { balance: result.buyer_remaining_tokens })
  } catch (err) {
    notice.value = resolveApiErrorMessage(err)
  } finally {
    buyingArtworkId.value = ""
  }
}

function normalizeMarketplaceSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function squashMarketplaceSearch(value: string) {
  return normalizeMarketplaceSearch(value).replace(/\s+/g, "")
}

function matchesMarketplaceSearch(keyword: string, squashedKeyword: string, values: Array<string | undefined>) {
  if (!keyword) return true
  return values.some((value) => {
    const normalized = normalizeMarketplaceSearch(value || "")
    const squashed = squashMarketplaceSearch(value || "")
    return normalized.includes(keyword) || (!!squashedKeyword && squashed.includes(squashedKeyword))
  })
}

function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function resolveTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages)
}

function resolvePageSummary(page: number, pageSize: number, totalItems: number): string {
  if (!totalItems) return t("showingZeroItems")
  const start = (page - 1) * pageSize + 1
  const end = Math.min(totalItems, page * pageSize)
  return formatText(t("showingRange"), { start, end, total: totalItems })
}

function setTemplatePage(page: number) {
  templatePage.value = clampPage(page, templateTotalPages.value)
}

function setArtworkPage(page: number) {
  artworkPage.value = clampPage(page, artworkTotalPages.value)
}

function resolveCardInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?"
}

function resolveHoverOverlay(event: Event): {
  placement: HoverOverlayClass
  style: Record<string, string>
} {
  return computeFloatingHoverOverlay(event, {
    defaultPlacement: "home-hover-card--bottom-left",
    overlayWidth: 320,
    overlayHeight: 520,
    minOverlayWidth: 220,
    minOverlayHeight: 280,
    viewportPadding: 12,
    topSafePadding: 88,
    gap: 10,
  })
}

function setHoveredStorefrontCard(detail: StorefrontHoverDetail, event: Event) {
  const overlay = resolveHoverOverlay(event)
  hoveredStorefrontCard.value = detail
  hoveredStorefrontCardPlacement.value = overlay.placement
  hoveredStorefrontCardStyle.value = overlay.style
}

function clearHoveredStorefrontCard() {
  hoveredStorefrontCard.value = null
  hoveredStorefrontCardStyle.value = {}
}

function createTemplateHoverDetail(item: TemplateCenterListing): StorefrontHoverDetail {
  const creator = formatMarketplaceCreatorName(item.creator_name)
  return {
    key: item.listing_id || item.template_id,
    kindLabel: "Template",
    title: resolveTemplateTitle(item),
    imageUrl: resolveTemplateCover(item),
    placeholder: resolveCardInitial(resolveTemplateTitle(item)),
    badgeLabel: resolveTemplateAccessLabel(item),
    badgeTone: "info",
    rows: [
      item.template_code ? { label: "Code", value: item.template_code } : null,
      creator ? { label: "Creator", value: creator } : null,
      { label: "Category", value: resolveTemplateCategory(item) },
      { label: "Access", value: resolveTemplateAccessLabel(item) },
      item.listed_at ? { label: "Listed", value: formatTemplateDate(item.listed_at) } : null,
    ].filter((row): row is HoverDetailRow => Boolean(row)),
    description: item.description || "A storefront-listed template ready to open in preview and test before customers see it live.",
  }
}

function createArtworkHoverDetail(item: ArtworkListItem): StorefrontHoverDetail {
  const creator = formatMarketplaceCreatorName(item.creator_name)
  const licenseName = item.license_name || "Storefront license"
  const sizeLabel = item.width && item.height ? `${item.width} × ${item.height}` : ""
  return {
    key: item.artwork_id,
    kindLabel: "Artwork",
    title: item.name,
    imageUrl: resolveArtworkCoverUrl(item),
    placeholder: resolveCardInitial(item.name),
    badgeLabel: item.commerce_type === "paid" ? "Paid" : "Free",
    badgeTone: item.commerce_type === "paid" ? "paid" : "success",
    rows: [
      creator ? { label: "Creator", value: creator } : null,
      { label: "Category", value: resolveArtworkCategory(item) },
      isAdminPreview.value ? { label: "Access", value: resolveArtworkAccessLabel(item) } : null,
      { label: "Price", value: resolveArtworkPriceLabel(item) },
      { label: "License", value: licenseName },
      sizeLabel ? { label: "Size", value: sizeLabel } : null,
      item.listed_at ? { label: "Listed", value: formatTemplateDate(item.listed_at) } : null,
    ].filter((row): row is HoverDetailRow => Boolean(row)),
    description: item.description || "Storefront artwork ready to preview, unlock, and pair with templates from the same tenant.",
  }
}

function buildStorefrontCategoryTree(items: Array<{ category_id?: string; category_path?: string }>): CategoryNode[] {
  const roots: CategoryNode[] = []
  const pathIndex = new Map<string, CategoryNode>()
  for (const item of items) {
    const segments = String(item.category_path || "")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
    if (!segments.length) continue
    let parentPath = ""
    let parentNode: CategoryNode | null = null
    for (const [index, segment] of segments.entries()) {
      const currentPath = parentPath ? `${parentPath} / ${segment}` : segment
      const isLeaf = index === segments.length - 1
      const parentCategoryId: string | null = parentNode ? parentNode.category_id : null
      let node = pathIndex.get(currentPath)
      if (!node) {
        node = {
          category_id: isLeaf ? String(item.category_id || `path:${currentPath}`) : `path:${currentPath}`,
          parent_id: parentCategoryId,
          level: index + 1,
          name: segment,
          category_path: currentPath,
          status: "active",
          children: [],
        }
        pathIndex.set(currentPath, node)
        if (parentNode) {
          parentNode.children = [...(parentNode.children || []), node]
        } else {
          roots.push(node)
        }
      } else if (isLeaf && item.category_id && String(node.category_id || "").startsWith("path:")) {
        node.category_id = String(item.category_id)
      }
      parentNode = node
      parentPath = currentPath
    }
  }
  return roots
}

watch([templateSearch, selectedTemplateApiStatus, selectedTemplateCategoryId], () => {
  templatePage.value = 1
})

watch([artworkSearch, selectedArtworkCategoryId], () => {
  artworkPage.value = 1
})

watch(() => filteredTemplateCards.value.length, () => {
  templatePage.value = clampPage(templatePage.value, templateTotalPages.value)
})

watch(() => filteredArtworkCards.value.length, () => {
  artworkPage.value = clampPage(artworkPage.value, artworkTotalPages.value)
})

async function loadStorefrontPageData() {
  storefront.value = null
  adminPreviewFallbackToPublic.value = false
  if (isAdminPreview.value) {
    try {
      await storefrontStore.loadCurrentStorefront(previewTenantId.value || undefined)
    } catch (err) {
      const slug = String(route.params.slug || "").trim()
      if (slug) {
        await storefrontStore.loadPublicStorefront(slug).catch(() => undefined)
        adminPreviewFallbackToPublic.value = true
      } else {
        throw err
      }
    }
  } else {
    await storefrontStore.loadPublicStorefront(String(route.params.slug || ""))
  }
}

watch(
  [
    () => String(route.params.slug || "").trim(),
    () => String(route.query.admin_view || ""),
    () => String(route.query.tenant_id || "").trim(),
  ],
  async () => {
    await loadStorefrontPageData()
  },
  { immediate: true },
)
</script>

<style scoped>
.storefront-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 40%);
}

.storefront-hero {
  position: relative;
  min-height: 320px;
  background-size: cover;
  background-position: center;
  color: #fff;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(79, 70, 229, 0.56));
}

.hero-content {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: 4rem 1.25rem 3rem;
}

.store-logo {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 22px;
  margin-bottom: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.hero-content h1 {
  margin: 0.85rem 0 0.5rem;
  font-size: clamp(2rem, 4vw, 3.5rem);
}

.hero-content p {
  max-width: 720px;
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
}

.hero-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.25rem;
}

.hero-links a {
  color: #fff;
  text-decoration: none;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.storefront-shell {
  max-width: 1280px;
  margin: -2.5rem auto 0;
  position: relative;
  z-index: 1;
  padding: 0 1.25rem 3rem;
}

.status-card {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 20px 35px -30px rgba(15, 23, 42, 0.55);
}

.status-card.success {
  background: #ecfdf5;
  color: #166534;
}

.status-card.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-card.error {
  background: #fef2f2;
  color: #b91c1c;
}

.content-section {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 1.4rem;
  padding: 1.35rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 18px 40px -32px rgba(15, 23, 42, 0.45);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  color: #0f172a;
}

.section-header p,
.section-copy {
  margin: 0.35rem 0 0;
  color: #475569;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0.4rem;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6366f1;
}

.storefront-admin-preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 1rem;
}

.store-preview-card {
  border-radius: 1.25rem;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
  overflow: hidden;
}

.store-preview-card-body,
.store-preview-panel {
  padding: 1rem 1.05rem;
}

.store-preview-banner {
  position: relative;
  min-height: 220px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 1rem;
}

.store-preview-banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.72));
}

.store-preview-logo {
  position: relative;
  z-index: 1;
  width: 88px;
  height: 88px;
  border-radius: 24px;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.24);
}

.store-preview-logo--placeholder {
  display: grid;
  place-items: center;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
}

.store-preview-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.9rem;
}

.store-preview-label {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6366f1;
}

.store-preview-heading h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.35rem;
}

.store-preview-heading p {
  margin: 0.45rem 0 0;
  color: #475569;
  line-height: 1.6;
}

.store-preview-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.store-preview-stat {
  padding: 0.85rem 0.95rem;
  border-radius: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.store-preview-stat span {
  display: block;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.store-preview-stat strong {
  display: block;
  margin-top: 0.45rem;
  color: #0f172a;
  font-size: 1rem;
}

.store-preview-card--details {
  display: grid;
  gap: 0;
}

.store-preview-card--details .store-preview-panel + .store-preview-panel {
  border-top: 1px solid #e2e8f0;
}

.store-preview-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.store-preview-link-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
  text-decoration: none;
}

.store-preview-link-chip.muted {
  background: #f8fafc;
  color: #64748b;
}

.store-preview-details {
  display: grid;
  gap: 0.75rem;
}

.store-preview-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.store-preview-detail-row span {
  color: #64748b;
  font-size: 0.84rem;
}

.store-preview-detail-row strong,
.store-preview-detail-row a {
  color: #0f172a;
  font-size: 0.9rem;
  text-align: right;
  word-break: break-word;
}

.store-preview-detail-row a {
  text-decoration: none;
}

.store-preview-assets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.store-preview-asset {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  text-decoration: none;
  color: #0f172a;
}

.store-preview-asset img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.gallery-filters,
.artwork-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.gallery-filters-left {
  flex: 1 1 320px;
  min-width: 0;
  display: flex;
}

.gallery-filters-right {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
  align-items: center;
}

.gallery-search-wrapper {
  position: relative;
  min-width: 200px;
  max-width: 280px;
}

.gallery-search-icon {
  position: absolute;
  left: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.75rem;
}

.gallery-search-input {
  width: 100%;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0 0.75rem 0 2.25rem;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.gallery-search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.gallery-filters :deep(.filter-dropdown) {
  min-width: 160px;
}

.gallery-filters :deep(.filter-dropdown-trigger),
.artwork-filters :deep(.filter-dropdown-trigger) {
  height: 36px;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  background: #fff;
  transition: all 0.2s ease;
  padding: 0 0.75rem;
}

.gallery-filters :deep(.filter-dropdown-trigger:hover),
.artwork-filters :deep(.filter-dropdown-trigger:hover) {
  border-color: #9ca3af;
}

.gallery-filters :deep(.filter-dropdown-trigger:focus-within),
.artwork-filters :deep(.filter-dropdown-trigger:focus-within) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.gallery-filters :deep(.category-cascade),
.artwork-filters :deep(.category-cascade) {
  width: 100%;
  gap: 0.5rem;
}

.gallery-filters :deep(.cascade-grid),
.artwork-filters :deep(.cascade-grid) {
  gap: 0.5rem;
}

.gallery-filters :deep(.cascade-select-trigger),
.artwork-filters :deep(.cascade-select-trigger) {
  height: 36px;
  min-height: 36px;
  padding: 0 0.7rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 0.875rem;
}

.gallery-filters :deep(.cascade-select-trigger:hover),
.artwork-filters :deep(.cascade-select-trigger:hover) {
  border-color: #9ca3af;
}

.feature-grid {
  display: grid;
  gap: 1rem;
}

.feature-grid--templates {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.feature-grid--artwork {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.feature-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 1.2rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 18px 40px -34px rgba(15, 23, 42, 0.4);
}

.feature-card-media {
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  cursor: pointer;
}

.feature-card-lock-badge {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(6px);
}

.feature-card-lock-badge svg {
  width: 0.9rem;
  height: 0.9rem;
  display: block;
}

.feature-card-media--square {
  aspect-ratio: 1 / 1;
}

.feature-card-media img,
.feature-card-placeholder {
  width: 100%;
  display: block;
}

.feature-card-media img {
  height: 100%;
  object-fit: cover;
}

.feature-card--template .feature-card-media {
  aspect-ratio: 4 / 5;
}

.feature-card--artwork .feature-card-media {
  aspect-ratio: 1 / 1;
}

.feature-card-placeholder {
  min-height: 100%;
  aspect-ratio: inherit;
  display: grid;
  place-items: center;
  font-size: 2rem;
  font-weight: 800;
  color: #475569;
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
}

.feature-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  flex: 1;
}

.feature-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.feature-card-badge-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
}

.feature-card-top h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
  color: #0f172a;
}

.feature-card-badge,
.next-action,
.artwork-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border-radius: 999px;
}

.feature-card-badge {
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  white-space: nowrap;
  background: #e2e8f0;
  color: #334155;
}

.feature-card-badge.info {
  background: #e0e7ff;
  color: #4338ca;
}

.feature-card-badge.success {
  background: #dcfce7;
  color: #166534;
}

.feature-card-badge.paid {
  background: #fef3c7;
  color: #92400e;
}

.feature-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.6rem;
  color: #64748b;
  font-size: 0.82rem;
}

.feature-card-actions {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.next-action,
.artwork-card-action {
  border: none;
  padding: 0.72rem 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  text-decoration: none;
  font-size: 0.92rem;
}

.next-action.primary {
  background: linear-gradient(135deg, #2563eb, #4338ca);
  color: #fff;
  box-shadow: 0 18px 32px -22px rgba(37, 99, 235, 0.9);
}

.next-action.secondary,
.artwork-card-action {
  background: #fff;
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.next-action:hover:not(:disabled),
.artwork-card-action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.next-action:disabled,
.artwork-card-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.gallery-empty {
  padding: 1rem 0.25rem 0.2rem;
  color: #64748b;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
}

.pagination-summary,
.pagination-status {
  color: #475569;
  font-size: 0.9rem;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pagination-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.home-hover-card {
  position: fixed;
  z-index: 4000;
  width: min(320px, calc(100vw - 24px));
  overflow: hidden;
  border-radius: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 28px 60px -28px rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(18px);
  pointer-events: none;
}

.home-hover-card--bottom-left,
.home-hover-card--bottom-right,
.home-hover-card--top-left,
.home-hover-card--top-right {
  transform: none;
}

.home-hover-card-media {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
}

.home-hover-card-media.empty {
  aspect-ratio: 4 / 2.6;
}

.home-hover-card-media img,
.home-hover-card-placeholder {
  width: 100%;
  height: 100%;
}

.home-hover-card-media img {
  object-fit: cover;
  display: block;
}

.home-hover-card-placeholder {
  display: grid;
  place-items: center;
  font-size: 2.3rem;
  font-weight: 800;
  color: #475569;
}

.home-hover-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem 1rem 1.05rem;
}

.home-hover-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.home-hover-card-top h3 {
  margin: 0.2rem 0 0;
  font-size: 1rem;
  line-height: 1.35;
  color: #0f172a;
}

.home-hover-card-eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6366f1;
}

.home-hover-card-badge {
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
}

.home-hover-card-badge.info {
  background: #e0e7ff;
  color: #4338ca;
}

.home-hover-card-badge.paid {
  background: #fef3c7;
  color: #92400e;
}

.home-hover-card-badge.success {
  background: #dcfce7;
  color: #166534;
}

.home-hover-card-rows {
  display: grid;
  gap: 0.55rem;
}

.home-hover-card-row {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}

.home-hover-card-row span {
  color: #64748b;
  font-size: 0.8rem;
}

.home-hover-card-row strong {
  color: #0f172a;
  font-size: 0.82rem;
  text-align: right;
  word-break: break-word;
}

.home-hover-card-copy {
  margin: 0;
  color: #475569;
  font-size: 0.84rem;
  line-height: 1.55;
}

@media (max-width: 1280px) {
  .feature-grid--templates {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .feature-grid--artwork {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .storefront-shell {
    padding-inline: 1rem;
  }

  .gallery-filters,
  .artwork-filters,
  .pagination-bar,
  .section-header {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .feature-grid--templates,
  .feature-grid--artwork {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .storefront-admin-preview-grid,
  .store-preview-stats,
  .store-preview-assets {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-content {
    padding: 3rem 1rem 2.5rem;
  }

  .content-section {
    padding: 1rem;
  }

  .feature-grid--templates,
  .feature-grid--artwork {
    grid-template-columns: 1fr;
  }

  .pagination-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
