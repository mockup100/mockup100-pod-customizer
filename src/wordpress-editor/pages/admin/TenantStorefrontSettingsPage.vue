<template>
  <div class="storefront-settings-page">
    <section class="settings-shell">
      <div class="settings-header">
        <div>
          <span class="page-eyebrow">{{ localize("Creative Space Setup", "创作空间设置") }}</span>
          <h1>{{ localize("Creative Space Setup", "创作空间设置") }}</h1>
          <p>{{ localize("Update your creative space details, check review readiness, and preview the space before you send it for platform review.", "更新创作空间信息，检查审核准备情况，并在提交平台审核前预览创作空间。") }}</p>
          <div class="header-badges">
            <span class="header-badge">{{ reviewStatusLabel }}</span>
            <span class="header-badge">{{ listedTemplateCount }} {{ localize("Listed Templates", "已上架模板") }}</span>
            <span class="header-badge">{{ listedArtworkCount }} {{ localize("Listed Artwork", "已上架作品") }}</span>
            <span class="header-badge">{{ form.store_slug.trim() ? `/${form.store_slug.trim()}` : localize("Slug Not Set", "Slug 未设置") }}</span>
          </div>
        </div>
      </div>

      <div v-if="validationError" class="status-banner error">{{ validationError }}</div>
      <div v-else-if="error" class="status-banner error">{{ error }}</div>
      <div v-else-if="notice" class="status-banner success">{{ notice }}</div>
      <form ref="settingsFormRef" class="settings-form" @submit.prevent="save">
        <div class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">{{ localize("Review Status", "审核状态") }}</span>
            <strong>{{ reviewStatusLabel }}</strong>
            <p>{{ reviewStatusHeadline }}</p>
          </article>
          <article class="summary-card">
            <span class="summary-label">{{ localize("Listed Templates", "已上架模板") }}</span>
            <strong>{{ listedTemplateCount }}</strong>
            <p>{{ localize("Templates currently visible inside the creative space catalog.", "当前在创作空间目录中可见的模板。") }}</p>
          </article>
          <article class="summary-card">
            <span class="summary-label">{{ localize("Listed Artwork", "已上架作品") }}</span>
            <strong>{{ listedArtworkCount }}</strong>
            <p>{{ localize("Artwork currently visible inside the creative space catalog.", "当前在创作空间目录中可见的作品。") }}</p>
          </article>
          <article class="summary-card">
            <span class="summary-label">{{ localize("Public Store", "公开店铺") }}</span>
            <strong>{{ publicStoreUrl ? localize("Live", "已上线") : localize("Private", "私有") }}</strong>
            <p>{{ publicStoreUrl || storefrontPreviewBlockedMessage }}</p>
          </article>
        </div>

        <div class="studio-layout">
          <section class="studio-card studio-card--identity">
            <div class="section-head">
              <div>
                <h2>{{ localize("Creative Space Identity", "创作空间信息") }}</h2>
                <p>{{ localize("Set the key information customers see first when they open your creative space.", "设置用户打开创作空间时最先看到的关键信息。") }}</p>
              </div>
            </div>
            <div class="form-grid">
              <label>
                <span class="field-label">{{ localize("Creative Space Name", "创作空间名称") }} <span class="required-badge">{{ localize("Required", "必填") }}</span></span>
                <input v-model="form.store_name" name="store_name" type="text" :placeholder="localize('Mockup100 Studio', 'Mockup100 Studio')" />
              </label>
              <label>
                <span class="field-label">{{ localize("Creative Space Slug", "创作空间 Slug") }} <span class="required-badge">{{ localize("Required", "必填") }}</span></span>
                <input v-model="form.store_slug" name="store_slug" type="text" :placeholder="localize('mockup100-studio', 'mockup100-studio')" />
              </label>
              <label class="full">
                <span class="field-label">{{ localize("Creative Space Bio", "创作空间简介") }} <span class="required-badge">{{ localize("Required", "必填") }}</span></span>
                <textarea v-model="form.store_bio" name="store_bio" rows="4" :placeholder="localize('Describe your creative space, style, and product focus.', '介绍你的创作空间、风格和产品定位。')" />
              </label>
            </div>
          </section>

          <section
            class="studio-card studio-card--review publish-requirements"
            :class="{
              ready: canSubmitStorefront,
              draft: currentStorefrontStatus !== 'approved' && !canSubmitStorefront,
            }"
          >
            <div class="section-head">
              <div>
                <h2>{{ reviewStatusLabel }}</h2>
                <p>{{ reviewStatusHeadline }}</p>
              </div>
            </div>
            <p class="publish-requirements-copy">{{ reviewStatusCopy }}</p>
            <div class="review-details">
              <p v-if="storefront?.store_review_note" class="publish-requirements-copy">
                {{ localize("Review Note", "审核备注") }}: {{ storefront.store_review_note }}
              </p>
              <p v-if="storefront?.store_submitted_at" class="publish-requirements-copy">
                {{ localize("Submitted At", "提交时间") }}: {{ storefront.store_submitted_at }}
              </p>
              <p v-if="storefront?.store_reviewed_at" class="publish-requirements-copy">
                {{ localize("Reviewed At", "审核时间") }}: {{ storefront.store_reviewed_at }}
              </p>
              <p v-if="storefront?.store_reviewer_email" class="publish-requirements-copy">
                {{ localize("Reviewed By", "审核人") }}: {{ storefront.store_reviewer_email }}
              </p>
            </div>
            <div class="publish-requirements-list">
              <span
                v-for="requirement in storefrontRequirements"
                :key="requirement.key"
                class="publish-requirement-chip"
                :class="{
                  complete: requirement.complete,
                  pending: !requirement.complete && currentStorefrontStatus !== 'approved',
                }"
              >
                {{ requirement.complete ? localize("Ready", "已完成") : currentStorefrontStatus === "pending_review" ? localize("Missing", "缺失") : localize("To do", "待完成") }} · {{ requirement.label }}
              </span>
            </div>
          </section>

          <section class="studio-card studio-card--media">
            <div class="section-head">
              <div>
                <h2>{{ localize("Creative Space Media", "创作空间素材") }}</h2>
                <p>{{ localize("Upload a clear logo and banner so your creative space looks consistent in listings and on the public page.", "上传清晰的 Logo 和横幅图，让创作空间在列表和公开页面中保持一致展示。") }}</p>
              </div>
            </div>
            <div class="asset-grid">
              <label class="asset-card">
                <span class="summary-label summary-label--with-badge">{{ localize("Store Logo", "店铺 Logo") }} <span class="required-badge">{{ localize("Required", "必填") }}</span></span>
                <div class="asset-preview" :class="{ empty: !form.store_logo_url }">
                  <img v-if="form.store_logo_url" :src="form.store_logo_url" :alt="localize('Store logo preview', '店铺 Logo 预览')" />
                  <span v-else>{{ localize("No logo uploaded yet.", "暂未上传 Logo。") }}</span>
                </div>
                <div class="file-picker">
                  <input
                    id="storefront-logo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    class="file-picker-input"
                    @change="handleBrandAssetChange('logo', $event)"
                  />
                  <label class="file-picker-control" for="storefront-logo-input">
                    <span class="file-picker-button">{{ logoUploading ? localize("Uploading...", "上传中...") : localize("Upload Logo", "上传 Logo") }}</span>
                    <span class="file-picker-name">{{ logoUploadName || localize("No file chosen", "未选择文件") }}</span>
                  </label>
                </div>
                <span class="asset-hint">{{ localize("Use a square logo for the creative space avatar and identity areas.", "建议使用方形 Logo，用于创作空间头像和标识区域。") }}</span>
                <span v-if="logoUploadError" class="asset-error">{{ logoUploadError }}</span>
              </label>

              <label class="asset-card">
                <span class="summary-label summary-label--with-badge">{{ localize("Store Banner", "店铺横幅") }} <span class="required-badge">{{ localize("Required", "必填") }}</span></span>
                <div class="asset-preview banner" :class="{ empty: !form.store_banner_url }">
                  <img v-if="form.store_banner_url" :src="form.store_banner_url" :alt="localize('Store banner preview', '店铺横幅预览')" />
                  <span v-else>{{ localize("No banner uploaded yet.", "暂未上传横幅图。") }}</span>
                </div>
                <div class="file-picker">
                  <input
                    id="storefront-banner-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    class="file-picker-input"
                    @change="handleBrandAssetChange('banner', $event)"
                  />
                  <label class="file-picker-control" for="storefront-banner-input">
                    <span class="file-picker-button">{{ bannerUploading ? localize("Uploading...", "上传中...") : localize("Upload Banner", "上传横幅") }}</span>
                    <span class="file-picker-name">{{ bannerUploadName || localize("No file chosen", "未选择文件") }}</span>
                  </label>
                </div>
                <span class="asset-hint">{{ localize("Use a wide banner image for the creative space header and featured previews.", "建议使用宽幅横幅图，用于创作空间头图和精选预览。") }}</span>
                <span v-if="bannerUploadError" class="asset-error">{{ bannerUploadError }}</span>
              </label>
            </div>
          </section>

          <section class="studio-card studio-card--contacts">
            <div class="section-head">
              <div>
                <h2>{{ localize("Contact & Social Links", "联系与社交链接") }}</h2>
                <p>{{ localize("Add optional links that help visitors verify the brand without overloading the creative space hero section.", "添加可选链接，帮助访客验证品牌信息，同时避免创作空间头图区过于拥挤。") }}</p>
              </div>
            </div>
            <div class="form-grid">
              <label>
                <span>{{ localize("Contact Email", "联系邮箱") }}</span>
                <input v-model="form.store_contact_email" name="store_contact_email" type="email" :placeholder="localize('store@example.com', 'store@example.com')" />
              </label>
              <label>
                <span>{{ localize("Website URL", "网站链接") }}</span>
                <input v-model="form.store_website_url" name="store_website_url" type="url" :placeholder="localize('https://...', 'https://...')" />
              </label>
              <label>
                <span>{{ localize("Instagram URL", "Instagram 链接") }}</span>
                <input v-model="form.store_instagram_url" name="store_instagram_url" type="url" :placeholder="localize('https://instagram.com/...', 'https://instagram.com/...')" />
              </label>
              <label>
                <span>{{ localize("Facebook URL", "Facebook 链接") }}</span>
                <input v-model="form.store_facebook_url" name="store_facebook_url" type="url" :placeholder="localize('https://facebook.com/...', 'https://facebook.com/...')" />
              </label>
              <label class="full">
                <span>{{ localize("TikTok URL", "TikTok 链接") }}</span>
                <input v-model="form.store_tiktok_url" name="store_tiktok_url" type="url" :placeholder="localize('https://www.tiktok.com/@...', 'https://www.tiktok.com/@...')" />
              </label>
            </div>
          </section>
        </div>

        <input :value="form.store_status" name="store_status" type="hidden" />

        <div class="form-actions">
          <button type="submit" class="primary-btn" :disabled="loading">
            {{ loading ? localize("Saving...", "保存中...") : localize("Save Draft", "保存草稿") }}
          </button>
          <button
            type="button"
            class="preview-link secondary action-link"
            :disabled="!storefrontPreviewUrl"
            :title="!storefrontPreviewUrl ? storefrontPreviewBlockedMessage : undefined"
            @click="openStorefrontPreview"
          >
            {{ localize("Open Creative Space Preview", "打开创作空间预览") }}
          </button>
          <a
            v-if="publicStoreUrl"
            :href="publicStoreUrl"
            class="preview-link secondary"
            target="_blank"
            rel="noreferrer"
          >
            {{ localize("Open Public Creative Space", "打开公开创作空间") }}
          </a>
          <button
            type="button"
            class="preview-link secondary action-link"
            :disabled="loading || submitBusy || currentStorefrontStatus === 'pending_review' || !canSubmitStorefront"
            :title="currentStorefrontStatus === 'pending_review' ? localize('Creative space is already waiting for review.', '该创作空间已在等待审核。') : (!canSubmitStorefront ? submitBlockedMessage : undefined)"
            @click="submitForReview"
          >
            {{ submitBusy ? localize("Submitting...", "提交中...") : localize("Send For Review", "提交审核") }}
          </button>
        </div>
        <p v-if="currentStorefrontStatus === 'pending_review'" class="form-actions-note">
          {{ localize("This creative space is already waiting for platform review.", "该创作空间已在等待平台审核。") }}
        </p>
        <p v-else-if="!canSubmitStorefront" class="form-actions-note">
          {{ submitBlockedMessage }}
        </p>
      </form>

    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { useAuthStore } from "../../stores/auth"
import { useArtworkStore } from "../../stores/artworks"
import { useStorefrontStore } from "../../stores/storefront"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { readAdminTenantContextWithStorage } from "./adminTenantContext"

const route = useRoute()
const authStore = useAuthStore()
const artworkStore = useArtworkStore()
const storefrontStore = useStorefrontStore()
const uiLocaleStore = useUiLocaleStore()
const { storefront, loading, error } = storeToRefs(storefrontStore)
const notice = ref("")
const validationError = ref("")
const logoUploading = ref(false)
const bannerUploading = ref(false)
const logoUploadName = ref("")
const bannerUploadName = ref("")
const logoUploadError = ref("")
const bannerUploadError = ref("")
const syncingForm = ref(false)
const submitBusy = ref(false)
const settingsFormRef = ref<HTMLFormElement | null>(null)
const serverConfirmedStorefront = ref<typeof storefront.value | null>(null)
const STOREFRONT_DRAFT_STORAGE_PREFIX = "mockup100:storefront-draft:"

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const form = reactive({
  store_slug: "",
  store_name: "",
  store_bio: "",
  store_logo_url: "",
  store_banner_url: "",
  store_contact_email: "",
  store_website_url: "",
  store_instagram_url: "",
  store_facebook_url: "",
  store_tiktok_url: "",
  store_status: "draft" as "draft" | "pending_review" | "approved" | "rejected",
})

const tenantContext = computed(() => readAdminTenantContextWithStorage(route.query))
const scopedTenantId = computed(() =>
  authStore.isPlatformAdmin
    ? (tenantContext.value.tenantId || authStore.tenant?.tenant_id || "")
    : (authStore.tenant?.tenant_id || ""),
)
const currentStorefrontStatus = computed(() => String(storefront.value?.store_status || form.store_status || "draft"))
const isStorefrontApproved = computed(() => currentStorefrontStatus.value === "approved")
const storefrontPreviewUrl = computed(() => {
  const slug = form.store_slug.trim()
  if (!slug) return ""
  const query = new URLSearchParams({
    admin_view: "1",
  })
  if (tenantContext.value.tenantId) {
    query.set("tenant_id", tenantContext.value.tenantId)
  }
  if (tenantContext.value.tenantLabel) {
    query.set("tenant_label", tenantContext.value.tenantLabel)
  }
  const suffix = query.toString()
  return suffix ? `/store/${encodeURIComponent(slug)}?${query.toString()}` : `/store/${encodeURIComponent(slug)}`
})
const storefrontPreviewBlockedMessage = computed(() =>
  form.store_slug.trim() ? "" : localize("Add and save Store Slug first to preview the storefront page.", "请先填写并保存店铺 Slug，再预览店铺页面。"),
)
const publicStoreUrl = computed(() => {
  if (!isStorefrontApproved.value || !form.store_slug.trim()) return ""
  return `/store/${encodeURIComponent(form.store_slug.trim())}`
})
const storefrontDraftStorageKey = computed(() => `${STOREFRONT_DRAFT_STORAGE_PREFIX}${scopedTenantId.value || "self"}`)

const listedTemplates = computed(() =>
  (storefront.value?.templates || []).filter((item) => String(item.marketplace_status || "listed").toLowerCase() === "listed"),
)
const listedArtworks = computed(() =>
  (storefront.value?.artworks || []).filter((item) => String(item.visibility_status || "").toLowerCase() === "listed"),
)
const listedTemplateCount = computed(() => listedTemplates.value.length)
const listedArtworkCount = computed(() => listedArtworks.value.length)
const storefrontRequirements = computed(() => [
  {
    key: "store_name",
    label: localize("Store Name", "店铺名称"),
    complete: Boolean(form.store_name.trim()),
  },
  {
    key: "store_slug",
    label: localize("Store Slug", "店铺 Slug"),
    complete: Boolean(form.store_slug.trim()),
  },
  {
    key: "store_bio",
    label: localize("Store Bio", "店铺简介"),
    complete: Boolean(form.store_bio.trim()),
  },
  {
    key: "store_logo_url",
    label: localize("Store Logo", "店铺 Logo"),
    complete: Boolean(form.store_logo_url.trim()),
  },
  {
    key: "store_banner_url",
    label: localize("Store Banner", "店铺横幅"),
    complete: Boolean(form.store_banner_url.trim()),
  },
  {
    key: "listed_catalog",
    label: localize("Listed Template or Artwork", "已上架模板或作品"),
    complete: listedTemplateCount.value + listedArtworkCount.value > 0,
  },
])
const missingStorefrontRequirements = computed(() =>
  storefrontRequirements.value.filter((item) => !item.complete).map((item) => item.label),
)
const canSubmitStorefront = computed(() => missingStorefrontRequirements.value.length === 0)
const submitBlockedMessage = computed(() =>
  missingStorefrontRequirements.value.length
    ? localize(
      `Complete the required storefront fields before sending for review: ${missingStorefrontRequirements.value.join(", ")}.`,
      `请先补全以下必填店铺信息后再提交审核：${missingStorefrontRequirements.value.join("、")}。`,
    )
    : localize("This storefront is ready to be sent for review.", "该店铺已可提交审核。"),
)
const reviewStatusLabel = computed(() => {
  if (currentStorefrontStatus.value === "approved") return localize("Approved Storefront", "已通过店铺")
  if (currentStorefrontStatus.value === "pending_review") return localize("Awaiting Review", "等待审核")
  if (currentStorefrontStatus.value === "rejected") return localize("Needs Revision", "需修改")
  return localize("Draft Readiness", "草稿准备度")
})
const reviewStatusHeadline = computed(() => {
  if (currentStorefrontStatus.value === "approved") return localize("Approved and publicly accessible", "已通过审核并可公开访问")
  if (currentStorefrontStatus.value === "pending_review") return localize("Waiting for platform review", "等待平台审核")
  if (currentStorefrontStatus.value === "rejected") return localize("Update the storefront before sending it again", "请更新店铺后再重新提交")
  if (canSubmitStorefront.value) return localize("Ready to send for review", "可提交审核")
  return localize(
    `${missingStorefrontRequirements.value.length} items still need attention`,
    `还有 ${missingStorefrontRequirements.value.length} 项待完善`,
  )
})
const reviewStatusCopy = computed(() => {
  if (currentStorefrontStatus.value === "approved") return localize("This storefront is live now. Platform admins can choose whether it appears in the homepage storefront section.", "该店铺现已上线。平台管理员可决定是否展示在首页店铺区域。")
  if (currentStorefrontStatus.value === "pending_review") {
    return storefront.value?.store_submitted_at
      ? localize(`Submitted on ${storefront.value.store_submitted_at}. Saving new changes will move it back to draft.`, `已于 ${storefront.value.store_submitted_at} 提交。保存新修改后会恢复为草稿。`)
      : localize("This storefront is waiting for platform review. Saving new changes will move it back to draft.", "该店铺正在等待平台审核。保存新修改后会恢复为草稿。")
  }
  if (currentStorefrontStatus.value === "rejected") {
    return storefront.value?.store_review_note
      ? localize("Review the note, update the storefront, and send it for review again.", "请查看审核备注，更新店铺后再次提交审核。")
      : localize("Update the storefront details and send it for review again.", "请更新店铺信息后再次提交审核。")
  }
  if (canSubmitStorefront.value) return localize("All required storefront fields are complete and the store can be sent for review.", "所有必填店铺信息均已完成，可提交审核。")
  return localize("This storefront is saved as a draft. Complete these items before sending it for review.", "该店铺当前保存为草稿。请补全这些项目后再提交审核。")
})
async function handleBrandAssetChange(kind: "logo" | "banner", event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  const isLogo = kind === "logo"
  if (isLogo) {
    logoUploading.value = true
    logoUploadName.value = file.name
    logoUploadError.value = ""
  } else {
    bannerUploading.value = true
    bannerUploadName.value = file.name
    bannerUploadError.value = ""
  }

  try {
    const upload = await artworkStore.uploadArtworkFile("tenant", file, scopedTenantId.value || undefined)
    if (isLogo) {
      form.store_logo_url = upload.preview_url || upload.original_url || ""
    } else {
      form.store_banner_url = upload.original_url || upload.preview_url || ""
    }
  } catch (uploadError) {
    const message = String((uploadError as Error)?.message || uploadError || localize("Failed to upload storefront asset.", "上传店铺素材失败。"))
    if (isLogo) {
      logoUploadError.value = message
    } else {
      bannerUploadError.value = message
    }
  } finally {
    if (input) {
      input.value = ""
    }
    if (isLogo) {
      logoUploading.value = false
    } else {
      bannerUploading.value = false
    }
  }
}

function openStorefrontPreview() {
  if (!storefrontPreviewUrl.value || typeof window === "undefined") return
  window.open(storefrontPreviewUrl.value, "_blank", "noopener,noreferrer")
}

function syncForm(source = storefront.value) {
  syncingForm.value = true
  form.store_slug = source?.store_slug || ""
  form.store_name = source?.store_name || ""
  form.store_bio = source?.store_bio || ""
  form.store_logo_url = source?.store_logo_url || ""
  form.store_banner_url = source?.store_banner_url || ""
  form.store_contact_email = source?.store_contact_email || ""
  form.store_website_url = source?.store_website_url || ""
  form.store_instagram_url = source?.store_instagram_url || ""
  form.store_facebook_url = source?.store_facebook_url || ""
  form.store_tiktok_url = source?.store_tiktok_url || ""
  form.store_status = (source?.store_status || "draft") as typeof form.store_status
  syncingForm.value = false
}

function resolveSavedField(savedValue: string | undefined, draftValue: string) {
  if (savedValue == null) return draftValue
  if (!savedValue.trim() && draftValue.trim()) return draftValue
  return savedValue
}

function mergeSavedStorefrontDraft(
  draft: typeof form,
  savedStorefront: typeof storefront.value,
) {
  return {
    ...(savedStorefront || {}),
    tenant_id: savedStorefront?.tenant_id || storefront.value?.tenant_id || scopedTenantId.value || "",
    store_slug: resolveSavedField(savedStorefront?.store_slug, draft.store_slug),
    store_name: resolveSavedField(savedStorefront?.store_name, draft.store_name),
    store_bio: resolveSavedField(savedStorefront?.store_bio, draft.store_bio),
    store_logo_url: resolveSavedField(savedStorefront?.store_logo_url, draft.store_logo_url),
    store_banner_url: resolveSavedField(savedStorefront?.store_banner_url, draft.store_banner_url),
    store_contact_email: resolveSavedField(savedStorefront?.store_contact_email, draft.store_contact_email),
    store_website_url: resolveSavedField(savedStorefront?.store_website_url, draft.store_website_url),
    store_instagram_url: resolveSavedField(savedStorefront?.store_instagram_url, draft.store_instagram_url),
    store_facebook_url: resolveSavedField(savedStorefront?.store_facebook_url, draft.store_facebook_url),
    store_tiktok_url: resolveSavedField(savedStorefront?.store_tiktok_url, draft.store_tiktok_url),
    store_status: savedStorefront?.store_status || "draft",
    templates: savedStorefront?.templates || storefront.value?.templates || [],
    artworks: savedStorefront?.artworks || storefront.value?.artworks || [],
  }
}

function createDraftSnapshot(source = form): typeof form {
  return {
    store_slug: source.store_slug || "",
    store_name: source.store_name || "",
    store_bio: source.store_bio || "",
    store_logo_url: source.store_logo_url || "",
    store_banner_url: source.store_banner_url || "",
    store_contact_email: source.store_contact_email || "",
    store_website_url: source.store_website_url || "",
    store_instagram_url: source.store_instagram_url || "",
    store_facebook_url: source.store_facebook_url || "",
    store_tiktok_url: source.store_tiktok_url || "",
    store_status: source.store_status || "draft",
  }
}

function persistDraftSnapshot(source = form) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storefrontDraftStorageKey.value, JSON.stringify(createDraftSnapshot(source)))
}

function readDraftSnapshot(): typeof form | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storefrontDraftStorageKey.value)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<typeof form>
    return {
      ...createDraftSnapshot(),
      ...parsed,
      store_status: "draft",
    }
  } catch {
    return null
  }
}

function mergeStorefrontWithDraft(
  savedStorefront: typeof storefront.value,
  draftSnapshot: ReturnType<typeof readDraftSnapshot>,
) {
  if (!draftSnapshot) return savedStorefront
  return mergeSavedStorefrontDraft(draftSnapshot, savedStorefront)
}

function setServerConfirmedStorefront(source: typeof storefront.value) {
  serverConfirmedStorefront.value = source
    ? {
        ...source,
        templates: source.templates || [],
        artworks: source.artworks || [],
      }
    : null
}

function normalizeComparableValue(value: string | undefined) {
  return String(value || "").trim()
}

function storefrontContainsDraft(
  source: typeof storefront.value,
  draftSnapshot: typeof form,
) {
  const fieldNames: Array<keyof typeof form> = [
    "store_slug",
    "store_name",
    "store_bio",
    "store_logo_url",
    "store_banner_url",
    "store_contact_email",
    "store_website_url",
    "store_instagram_url",
    "store_facebook_url",
    "store_tiktok_url",
  ]
  return fieldNames.every((fieldName) => {
    const draftValue = normalizeComparableValue(draftSnapshot[fieldName])
    if (!draftValue) return true
    return normalizeComparableValue(source?.[fieldName]) === draftValue
  })
}

function hydrateFormFromDom() {
  const formEl = settingsFormRef.value
  if (!formEl) return

  const readField = (fieldName: keyof typeof form) => {
    const element = formEl.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${fieldName}"]`,
    )
    return typeof element?.value === "string" ? element.value : ""
  }

  form.store_slug = readField("store_slug")
  form.store_name = readField("store_name")
  form.store_bio = readField("store_bio")
  form.store_contact_email = readField("store_contact_email")
  form.store_website_url = readField("store_website_url")
  form.store_instagram_url = readField("store_instagram_url")
  form.store_facebook_url = readField("store_facebook_url")
  form.store_tiktok_url = readField("store_tiktok_url")
  form.store_status = (storefront.value?.store_status || "draft") as typeof form.store_status
}

async function save() {
  notice.value = ""
  validationError.value = ""
  error.value = ""
  hydrateFormFromDom()
  persistDraftSnapshot()
  const draft = { ...form }
  const previousStatus = currentStorefrontStatus.value
  try {
    const savedStorefront = await storefrontStore.updateCurrentStorefront(draft, scopedTenantId.value || undefined)
    const confirmedStorefront = await storefrontStore.loadCurrentStorefront(scopedTenantId.value || undefined)
    setServerConfirmedStorefront(confirmedStorefront || savedStorefront)
    const mergedStorefront = mergeSavedStorefrontDraft(draft, confirmedStorefront || savedStorefront)
    storefront.value = mergedStorefront
    syncForm(mergedStorefront)
    persistDraftSnapshot(mergedStorefront)
    if (!storefrontContainsDraft(confirmedStorefront || savedStorefront, draft)) {
      validationError.value = localize("Storefront save could not be confirmed yet. The latest draft is kept in this browser. Please refresh once and save again.", "暂时无法确认店铺保存结果。最新草稿已保存在当前浏览器，请刷新后再保存一次。")
      return
    }
    notice.value = previousStatus === "pending_review" || previousStatus === "approved"
      ? localize("Storefront updated and moved back to draft. Send it again when you are ready for another review.", "店铺已更新并恢复为草稿。准备好后可再次提交审核。")
      : localize("Storefront draft saved.", "店铺草稿已保存。")
  } catch (saveError) {
    const message = String((saveError as Error)?.message || saveError || localize("Failed to save storefront settings.", "保存店铺设置失败。"))
    validationError.value = message ? message.charAt(0).toUpperCase() + message.slice(1) : localize("Failed to save storefront settings.", "保存店铺设置失败。")
  }
}

async function persistCurrentDraftForReview() {
  const draft = { ...form }
  if (storefrontContainsDraft(serverConfirmedStorefront.value, draft)) {
    return true
  }
  const savedStorefront = await storefrontStore.updateCurrentStorefront(draft, scopedTenantId.value || undefined)
  const confirmedStorefront = await storefrontStore.loadCurrentStorefront(scopedTenantId.value || undefined)
  setServerConfirmedStorefront(confirmedStorefront || savedStorefront)
  const mergedStorefront = mergeSavedStorefrontDraft(draft, confirmedStorefront || savedStorefront)
  storefront.value = mergedStorefront
  syncForm(mergedStorefront)
  persistDraftSnapshot(mergedStorefront)
  if (!storefrontContainsDraft(confirmedStorefront || savedStorefront, draft)) {
    validationError.value = localize("Storefront save could not be confirmed yet. The latest draft is kept in this browser. Please refresh once and save again.", "暂时无法确认店铺保存结果。最新草稿已保存在当前浏览器，请刷新后再保存一次。")
    return false
  }
  return true
}

async function submitForReview() {
  if (submitBusy.value) return
  validationError.value = ""
  notice.value = ""
  error.value = ""
  hydrateFormFromDom()
  persistDraftSnapshot()
  if (!canSubmitStorefront.value) {
    validationError.value = submitBlockedMessage.value
    return
  }
  submitBusy.value = true
  try {
    const draftReady = await persistCurrentDraftForReview()
    if (!draftReady) return
    await storefrontStore.submitCurrentStorefront(scopedTenantId.value || undefined)
    const submittedStorefront = await storefrontStore.loadCurrentStorefront(scopedTenantId.value || undefined)
    setServerConfirmedStorefront(submittedStorefront || storefront.value)
    syncForm(storefront.value)
    notice.value = localize("Storefront sent for platform review.", "店铺已提交平台审核。")
  } catch (submitError) {
    const message = String((submitError as Error)?.message || submitError || localize("Failed to submit storefront for review.", "提交店铺审核失败。"))
    validationError.value = message ? message.charAt(0).toUpperCase() + message.slice(1) : localize("Failed to submit storefront for review.", "提交店铺审核失败。")
  } finally {
    submitBusy.value = false
  }
}

onMounted(async () => {
  const loadedStorefront = await storefrontStore.loadCurrentStorefront(scopedTenantId.value || undefined)
  setServerConfirmedStorefront(loadedStorefront || storefront.value)
  const mergedStorefront = mergeStorefrontWithDraft(storefront.value, readDraftSnapshot())
  if (mergedStorefront) {
    storefront.value = mergedStorefront
  }
  syncForm(mergedStorefront || storefront.value)
})

watch(
  form,
  () => {
    if (syncingForm.value) return
    persistDraftSnapshot()
    notice.value = ""
    validationError.value = ""
    error.value = ""
  },
  { deep: true },
)
</script>

<style scoped>
.storefront-settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-shell {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.07);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.15rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eef2f7;
}

.action-link {
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
}

.page-eyebrow {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #0f172a;
}

.settings-header p {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.header-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #dbe3f0;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
}

.preview-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}

.preview-link.secondary {
  background: #fff;
  color: #334155;
  border: 1px solid #dbe3f0;
}

.status-banner {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-size: 0.95rem;
}

.status-banner.error {
  background: #fff1f2;
  color: #be123c;
}

.status-banner.success {
  background: #ecfeff;
  color: #0f766e;
}

.status-banner.context {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  background: #eff6ff;
  color: #1d4ed8;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-actions-note {
  margin: -0.35rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

.summary-grid,
.asset-grid {
  display: grid;
  gap: 1rem;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.studio-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 1rem;
}

.studio-card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 1.1rem;
  display: grid;
  gap: 1rem;
}

.studio-card--identity,
.studio-card--media {
  grid-column: 1 / 2;
}

.studio-card--review,
.studio-card--contacts {
  grid-column: 2 / 3;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.section-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.08rem;
}

.section-head p {
  margin: 0.35rem 0 0;
  color: #64748b;
  line-height: 1.55;
}

.summary-card,
.asset-card {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #f8fafc;
}

.summary-card,
.asset-card {
  padding: 1rem;
}

.summary-label {
  display: block;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-label--with-badge,
.field-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.required-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}

.summary-card strong,
.asset-card strong {
  display: block;
  margin-top: 0.45rem;
  color: #0f172a;
  font-size: 1.18rem;
}

.summary-card p,
.asset-card p {
  margin: 0.45rem 0 0;
  color: #64748b;
}

.asset-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.92rem;
  color: #334155;
}

.form-grid label.full {
  grid-column: 1 / -1;
}

.form-grid input,
.asset-card input,
.form-grid textarea,
.form-grid select {
  width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 14px;
  padding: 0.8rem 0.95rem;
  font: inherit;
  color: #0f172a;
  background: #fff;
}

.asset-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  margin-top: 0.75rem;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  color: #64748b;
  text-align: center;
}

.asset-preview.banner {
  min-height: 160px;
}

.asset-preview.empty {
  padding: 1rem;
}

.asset-preview img {
  display: block;
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.file-picker {
  margin-top: 0.75rem;
}

.file-picker-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-picker-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid #dbe3f0;
  border-radius: 14px;
  background: #fff;
  padding: 0.75rem 0.85rem;
  cursor: pointer;
}

.file-picker-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-weight: 700;
  padding: 0.55rem 0.9rem;
  white-space: nowrap;
}

.file-picker-name {
  color: #475569;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-hint {
  display: block;
  margin-top: 0.65rem;
  margin-bottom: 0.45rem;
  color: #64748b;
  font-size: 0.88rem;
}

.asset-error {
  display: block;
  margin-top: 0.45rem;
  color: #b91c1c;
  font-size: 0.88rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.publish-requirements {
  border: 1px solid #fecaca;
  border-radius: 18px;
  background: #fff7f7;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.publish-requirements.ready {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.publish-requirements.draft {
  border-color: #dbe3f0;
  background: #f8fafc;
}

.publish-requirements-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.publish-requirements-head strong {
  display: block;
  margin-top: 0.45rem;
  color: #0f172a;
  font-size: 1rem;
}

.publish-requirements-copy {
  margin: 0;
  color: #475569;
  line-height: 1.55;
}

.review-details {
  display: grid;
  gap: 0.35rem;
}

.publish-requirements-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.publish-requirement-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.42rem 0.75rem;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.8rem;
  font-weight: 700;
}

.publish-requirement-chip.complete {
  background: #eff6ff;
  color: #1d4ed8;
}

.publish-requirement-chip.pending {
  background: #eef2f7;
  color: #475569;
}

.primary-btn {
  border: none;
  border-radius: 999px;
  padding: 0.8rem 1.2rem;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 760px) {
  .settings-header {
    flex-direction: column;
  }

  .studio-layout {
    grid-template-columns: 1fr;
  }

  .studio-card--identity,
  .studio-card--media,
  .studio-card--review,
  .studio-card--contacts {
    grid-column: auto;
  }

  .summary-grid,
  .asset-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
