import { createApp, defineComponent, h } from "vue"
import { createPinia } from "pinia"
import { setWordPressRouteQuery } from "../router/wordpress/mockRouter"
import { useAuthStore } from "../stores/auth"
import { useUiLocaleStore } from "../stores/uiLocale"
import i18n from "../i18n"
import RepositoryPreviewPage from "../pages/admin/RepositoryPreviewPage.vue"
import "../styles/app.css"

export interface Mockup100EditorConfig {
  container: string | HTMLElement
  restBase: string
  siteUrl: string
  apiKey: string
  productId: number
  templateId: string
  templateCode?: string
  displayName?: string
  source?: string
  variationId?: number
  wcNonce?: string
  returnUrl?: string
  locale?: "en" | "zh"
  wordpressShell?: {
    homeUrl?: string
    siteTitle?: string
    siteLogoUrl?: string
    navItems?: Array<{ label: string; url: string }>
    accountUrl?: string
    loginUrl?: string
    logoutUrl?: string
    isLoggedIn?: boolean
    displayName?: string
    cartUrl?: string
    cartCount?: number
  }
  wordpressUser?: {
    userId?: string
    userLogin?: string
    email?: string
    displayName?: string
    accountId?: string
    siteHost?: string
    siteUrl?: string
  }
  wordpressProductNav?: {
    currentProductId?: number
    currentProduct?: Record<string, unknown> | null
    initialItems?: Array<Record<string, unknown>>
    categories?: Array<Record<string, unknown>>
    restPaths?: {
      products?: string
      categories?: string
    }
  }
}

function normalizeBaseUrl(raw?: string): string {
  if (!raw) return ""
  return raw.endsWith("/") ? raw.slice(0, -1) : raw
}

function overrideGatewayBase(base: string) {
  const normalized = normalizeBaseUrl(base)
  Object.defineProperty(window, "__MOCKUP100_GATEWAY_BASE__", {
    value: normalized,
    writable: true,
    configurable: true,
  })
}

function overrideWordPressApiKey(apiKey: string) {
  Object.defineProperty(window, "__MOCKUP100_WORDPRESS_API_KEY__", {
    value: String(apiKey || "").trim(),
    writable: true,
    configurable: true,
  })
}

function overrideWordPressContext(config: Mockup100EditorConfig) {
  Object.defineProperty(window, "__MOCKUP100_WORDPRESS_CONTEXT__", {
    value: {
      product_id: String(config.productId),
      variation_id: config.variationId ? String(config.variationId) : "",
      template_id: String(config.templateId || "").trim(),
      wp_user_id: String(config.wordpressUser?.userId || "").trim(),
      account_id: String(config.wordpressUser?.accountId || "").trim(),
      site_host: String(config.wordpressUser?.siteHost || "").trim(),
      wc_nonce: String(config.wcNonce || "").trim(),
      shell: config.wordpressShell || null,
      wordpress_user: config.wordpressUser || null,
      product_nav: config.wordpressProductNav || null,
    },
    writable: true,
    configurable: true,
  })
}

function initWordPressAuth(config: Mockup100EditorConfig) {
  const pinia = createPinia()
  const authStore = useAuthStore(pinia)
  authStore.role = "tenant_admin"
  // WP shell 鉴权完全走 x-api-key (见 authHeaders),不能把 apiKey 当作 platform JWT 写入
  // accessToken,否则 refreshSession 会用 Bearer apiKey 调用 /auth/me 直接 401。
  const wordpressUser = config.wordpressUser || {}
  const siteHost = String(wordpressUser.siteHost || new URL(config.siteUrl).host || "").trim()
  const accountId = String(wordpressUser.accountId || "").trim() || `wp:${siteHost || "unknown-site"}:${String(wordpressUser.userId || "guest")}`
  const displayName = String(wordpressUser.displayName || "").trim() || config.displayName || config.templateId
  const email = String(wordpressUser.email || "").trim() || `wordpress@${config.siteUrl.replace(/^https?:\/\//, "")}`
  authStore.account = {
    account_id: accountId,
    email,
    display_name: displayName,
    status: "active",
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  authStore.availableRoles = ["tenant_admin"]
  authStore.activeWorkspace = "platform"

  const uiLocaleStore = useUiLocaleStore(pinia)
  // WP shell: 默认 en, 但要尊重用户上次在 FilterDropdown 切换后写入 localStorage 的选择.
  // hydrate() 会读 localStorage; 若没有则保留 store 默认 en.
  uiLocaleStore.hydrate()
  i18n.global.locale.value = uiLocaleStore.locale
  uiLocaleStore.$subscribe((_mutation, state) => {
    i18n.global.locale.value = state.locale
  })
  return pinia
}

export function createMockup100Editor(config: Mockup100EditorConfig) {
  setWordPressRouteQuery({
    template_id: config.templateId,
    template: config.templateId,
    template_code: config.templateCode,
    display_name: config.displayName,
    source: config.source || "woocommerce",
    product_id: String(config.productId),
    wc_nonce: config.wcNonce,
    return_url: config.returnUrl,
    variation_id: config.variationId ? String(config.variationId) : undefined,
  })

  overrideGatewayBase(config.restBase)
  overrideWordPressApiKey(config.apiKey)
  overrideWordPressContext(config)

  const EditorWrapper = defineComponent({
    name: "Mockup100WordPressEditor",
    render() {
      return h(RepositoryPreviewPage)
    },
  })

  const app = createApp(EditorWrapper)
  const pinia = initWordPressAuth(config)
  app.use(pinia)
  app.use(i18n)

  const container =
    typeof config.container === "string"
      ? (document.querySelector(config.container) as HTMLElement | null)
      : config.container

  if (!container) {
    throw new Error(`[Mockup100Editor] Container not found: ${config.container}`)
  }

  app.mount(container)

  return {
    app,
    pinia,
    destroy: () => {
      app.unmount()
    },
  }
}

declare global {
  interface Window {
    __MOCKUP100_GATEWAY_BASE__?: string
    __MOCKUP100_WORDPRESS_API_KEY__?: string
    __MOCKUP100_WORDPRESS_CONTEXT__?: {
      product_id: string
      variation_id?: string
      template_id?: string
      wp_user_id?: string
      account_id?: string
      site_host?: string
      wc_nonce?: string
      shell?: Mockup100EditorConfig["wordpressShell"] | null
      wordpress_user?: Mockup100EditorConfig["wordpressUser"] | null
      product_nav?: Mockup100EditorConfig["wordpressProductNav"] | null
    }
    createMockup100Editor: (config: Mockup100EditorConfig) => ReturnType<typeof createMockup100Editor>
  }
}

window.createMockup100Editor = createMockup100Editor
