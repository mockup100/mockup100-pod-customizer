import { ref } from "vue"
import { defineStore } from "pinia"
import { gatewayPlatformFetch, type StorefrontReviewStatus, type TenantStorefrontSummary } from "../api/client"
import { useAuthStore } from "./auth"

type TenantStorefrontUpdatePayload = {
  store_slug?: string
  store_name?: string
  store_bio?: string
  store_logo_url?: string
  store_banner_url?: string
  store_contact_email?: string
  store_website_url?: string
  store_instagram_url?: string
  store_facebook_url?: string
  store_tiktok_url?: string
  store_status?: StorefrontReviewStatus
}

type TenantStorefrontUpdateRequestBody = {
  storeSlug?: string
  storeName?: string
  storeBio?: string
  storeLogoUrl?: string
  storeBannerUrl?: string
  storeContactEmail?: string
  storeWebsiteUrl?: string
  storeInstagramUrl?: string
  storeFacebookUrl?: string
  storeTiktokUrl?: string
  storeStatus?: StorefrontReviewStatus
}

function toTenantStorefrontUpdateRequestBody(payload: TenantStorefrontUpdatePayload): TenantStorefrontUpdateRequestBody {
  return {
    storeSlug: payload.store_slug,
    storeName: payload.store_name,
    storeBio: payload.store_bio,
    storeLogoUrl: payload.store_logo_url,
    storeBannerUrl: payload.store_banner_url,
    storeContactEmail: payload.store_contact_email,
    storeWebsiteUrl: payload.store_website_url,
    storeInstagramUrl: payload.store_instagram_url,
    storeFacebookUrl: payload.store_facebook_url,
    storeTiktokUrl: payload.store_tiktok_url,
    storeStatus: payload.store_status,
  }
}

export const useStorefrontStore = defineStore("storefront", () => {
  const authStore = useAuthStore()
  const storefront = ref<TenantStorefrontSummary | null>(null)
  const loading = ref(false)
  const error = ref("")

  async function loadCurrentStorefront(tenantId?: string) {
    loading.value = true
    error.value = ""
    try {
      const query = tenantId?.trim() ? `?tenant_id=${encodeURIComponent(tenantId.trim())}` : ""
      storefront.value = await gatewayPlatformFetch<TenantStorefrontSummary>(`/platform/tenant/storefront${query}`, {
        headers: authStore.authHeaders,
      })
      return storefront.value
    } catch (err) {
      storefront.value = null
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateCurrentStorefront(payload: TenantStorefrontUpdatePayload, tenantId?: string) {
    loading.value = true
    error.value = ""
    try {
      const query = tenantId?.trim() ? `?tenant_id=${encodeURIComponent(tenantId.trim())}` : ""
      storefront.value = await gatewayPlatformFetch<TenantStorefrontSummary>(`/platform/tenant/storefront${query}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authStore.authHeaders,
        },
        body: JSON.stringify(toTenantStorefrontUpdateRequestBody(payload)),
      })
      return storefront.value
    } catch (err) {
      storefront.value = null
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadPublicStorefront(slug: string) {
    loading.value = true
    error.value = ""
    try {
      storefront.value = await gatewayPlatformFetch<TenantStorefrontSummary>(`/platform/storefront/${encodeURIComponent(slug)}`, {
        headers: authStore.authHeaders,
      })
      return storefront.value
    } catch (err) {
      storefront.value = null
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function submitCurrentStorefront(tenantId?: string) {
    loading.value = true
    error.value = ""
    try {
      const query = tenantId?.trim() ? `?tenant_id=${encodeURIComponent(tenantId.trim())}` : ""
      storefront.value = await gatewayPlatformFetch<TenantStorefrontSummary>(`/platform/tenant/storefront/submit${query}`, {
        method: "POST",
        headers: authStore.authHeaders,
      })
      return storefront.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    storefront,
    loading,
    error,
    loadCurrentStorefront,
    updateCurrentStorefront,
    loadPublicStorefront,
    submitCurrentStorefront,
  }
})
