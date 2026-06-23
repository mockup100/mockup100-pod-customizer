<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue"
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useAuthStore } from "./stores/auth"
import { useUiLocaleStore } from "./stores/uiLocale"
import BrandLogo from "./components/BrandLogo.vue"
import FilterDropdown from "./components/FilterDropdown.vue"
import { SHARED_LOCALE_OPTIONS, isUiLocale } from "./utils/pagination"
import { buildAdminNavigationSections, type AdminNavigationSection } from "./layouts/adminNavigation"
import { useUserCapabilities, fetchUserCapabilities } from "./composables/useUserCapabilities"
import { getPlanDisplayName, normalizePlanCode } from "./utils/billingModel"

const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const route = useRoute()
const router = useRouter()
const { account, accessToken, role, subscription, entitlements, tenant } = storeToRefs(authStore)
const { locale } = storeToRefs(uiLocaleStore)
const { tokenBalance, gradingActive, wpProActive } = useUserCapabilities()

const APP_I18N = {
  en: {
    overview: "Overview",
    libraries: "Libraries",
    storefront: "Creative Space",
    orders: "Orders",
    finance: "Finance",
    developer: "Developer",
    account: "Account",
    administration: "Administration",
    adminConsole: "Admin Console",
    templateLibrary: "Template Library",
    artworkCenter: "Artwork Center",
    artworkLibrary: "Artwork Library",
    storefrontLabel: "Creative Space",
    artworkOrders: "Artwork Orders",
    billing: "Billing",
      tenantBilling: "Tenant Billing",
    artworkBilling: "Artwork Billing",
    tokens: "Tokens",
    developerConsole: "Developer Console",
    accountLabel: "Account",
    categories: "Categories",
    artworkCategories: "Artwork Categories",
    tenants: "Tenants",
    home: "Home",
    products: "Products",
    listings: "Listings",
    pricing: "Pricing",
    openApi: "OpenAPI",
    supplier: "Supplier",
    logIn: "Log In",
    signUp: "Sign Up",
    logOut: "Log Out",
    languageLabel: "Language",
    operatedBy: "Operated by",
    quickLinks: "Quick Links",
    dashboard: "Dashboard",
    footerDesc: "Production-ready mockups for custom products",
    footerSlogan: "Mockup API & Free Editor - Production-ready mockups for custom products.",
    footerCompany: "Zhuhai Baifeng Network Technology Co., Ltd.",
    footerProduct: "Product",
    footerCompanyCol: "Company",
    footerLegal: "Legal",
    footerFeatures: "Features",
    footerPricing: "Pricing",
    footerDocs: "Documentation",
    footerApiRef: "API Reference",
    footerAbout: "About Us",
    footerCareers: "Careers",
    footerBlog: "Blog",
    footerContact: "Contact",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    footerCookie: "Cookie Policy",
    footerGdpr: "GDPR Compliance",
    footerCopyright: "All rights reserved.",
    insufficientTokensTitle: "Mockup100 service unavailable",
    insufficientTokensReasonLabel: "Reason:",
    insufficientTokensReasonText: "The platform tenant has run out of tokens. Preview/compose generation and billed APIs are blocked until the balance is topped up.",
    insufficientTokensActionLabel: "What to do:",
    insufficientTokensActionPrefix: "Go to ",
    insufficientTokensActionLink: "Tokens Management",
    insufficientTokensActionSuffix: " to purchase a token package, then try again.",
    insufficientTokensClose: "Got it",
  },
  zh: {
    overview: "概览",
    libraries: "素材库",
    storefront: "创作空间",
    orders: "订单",
    finance: "财务",
    developer: "开发者",
    account: "账户",
    administration: "管理",
    adminConsole: "管理控制台",
    templateLibrary: "模板库",
    artworkCenter: "作品中心",
    artworkLibrary: "作品库",
    storefrontLabel: "创作空间",
    artworkOrders: "作品订单",
    billing: "账单",
      tenantBilling: "租户账单",
    artworkBilling: "作品结算",
    tokens: "令牌",
    developerConsole: "开发者控制台",
    accountLabel: "账户",
    categories: "分类",
    artworkCategories: "作品分类",
    tenants: "租户",
    home: "首页",
    products: "产品",
    listings: "刊登",
    pricing: "价格",
    openApi: "OpenAPI",
    supplier: "成为供应商",
    logIn: "登录",
    signUp: "注册",
    logOut: "退出登录",
    languageLabel: "语言",
    operatedBy: "运营方",
    quickLinks: "快捷入口",
    dashboard: "仪表盘",
    footerDesc: "面向定制商品的生产级 Mockup 平台",
    footerSlogan: "Mockup API 与免费编辑器 - 面向定制商品的生产级 Mockup 平台。",
    footerCompany: "珠海百锋网络科技有限公司",
    footerProduct: "产品",
    footerCompanyCol: "公司",
    footerLegal: "法律",
    footerFeatures: "功能",
    footerPricing: "定价",
    footerDocs: "文档",
    footerApiRef: "API 参考",
    footerAbout: "关于我们",
    footerCareers: "招聘",
    footerBlog: "博客",
    footerContact: "联系我们",
    footerTerms: "服务条款",
    footerPrivacy: "隐私政策",
    footerCookie: "Cookie 政策",
    footerGdpr: "GDPR 合规",
    footerCopyright: "保留所有权利。",
    insufficientTokensTitle: "Mockup100 服务暂不可用",
    insufficientTokensReasonLabel: "原因：",
    insufficientTokensReasonText: "平台租户的 token 余额已耗尽，无法继续生成预览/合成或调用计费接口。",
    insufficientTokensActionLabel: "处理：",
    insufficientTokensActionPrefix: "请前往 ",
    insufficientTokensActionLink: "Tokens 管理",
    insufficientTokensActionSuffix: " 充值 token 包后再试。",
    insufficientTokensClose: "我知道了",
  },
} as const

function t(key: keyof typeof APP_I18N.en) {
  return APP_I18N[locale.value][key] || APP_I18N.en[key]
}

const localeOptions = SHARED_LOCALE_OPTIONS
function updateLocale(value: string) {
  if (isUiLocale(value)) {
    uiLocaleStore.setLocale(value)
  }
}

const normalizedRoutePath = computed(() => {
  if (!route.path || route.path === "/") return "/"
  return route.path.replace(/\/+$/, "") || "/"
})
const forceEnglishRoutePrefixes = ["/erp/orders", "/erp/listings", "/erp/supplier"]

// Reactive state
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const showUserDropdown = ref(false)

// 0.4.53: 全局 token 余额不足弹窗(402)。所有 requestJson 调用在 402 时都会派发此事件,
// 任何页面无需各自实现 modal。
const insufficientTokensModalOpen = ref(false)
function handleInsufficientTokensEvent(_event: Event) {
  insufficientTokensModalOpen.value = true
}
function closeInsufficientTokensModal() {
  insufficientTokensModalOpen.value = false
}

// Computed state
const isAuthenticated = computed(() => !!accessToken.value.trim())
const showShellNavbar = computed(() => {
  return !["/login", "/register", "/auth", "/verify-email/pending", "/verify-email/result"].includes(normalizedRoutePath.value)
    && !normalizedRoutePath.value.startsWith("/admin")
    && route.meta.hideShellNavbar !== true
})
const showSystemFooter = computed(() => {
  const isAuthPage = ["/login", "/register", "/auth", "/verify-email/pending", "/verify-email/result"].includes(normalizedRoutePath.value)
  return !normalizedRoutePath.value.startsWith("/admin") && !isAuthPage && route.meta.hideShellFooter !== true
})
const userInitials = computed(() => {
  return account?.value?.display_name?.charAt(0)?.toUpperCase() ||
         account?.value?.email?.charAt(0)?.toUpperCase() || '?'
})

const userDisplayName = computed(() => {
  return account?.value?.display_name || account?.value?.email || 'Designer'
})

const userEmail = computed(() => {
  return account?.value?.email || userDisplayName.value
})

const tenantName = computed(() => {
  const t = tenant.value as (typeof tenant.value & { name?: string }) | null
  return (t?.name as string) || (t?.email as string) || 'Personal'
})

const planName = computed(() => {
  if (role.value === 'platform_admin') return 'Administrator'
  return getPlanDisplayName(subscription.value?.plan_code || entitlements.value?.plan_code)
})

const planClass = computed(() => {
  if (role.value === 'platform_admin') return 'plan-admin'
  if (normalizePlanCode(subscription.value?.plan_code || entitlements.value?.plan_code) === 'enterprise') return 'plan-admin'
  if (normalizePlanCode(subscription.value?.plan_code || entitlements.value?.plan_code) === 'tokens') return 'plan-pro'
  if (entitlements.value?.sdk_api_access) return 'plan-trial'
  return 'plan-free'
})

const adminDropdownSections = computed((): AdminNavigationSection[] => buildAdminNavigationSections({
  locale: locale.value as "en" | "zh",
  role: role.value || undefined,
  query: route.query,
}) as AdminNavigationSection[])

const navItems = computed(() => {
  const publicItems = [
    { to: "/", label: t("home"), key: "home" },
    { to: "/products", label: t("products"), key: "products" },
    { to: "/pricing", label: t("pricing"), key: "pricing" },
    { to: "/api", label: t("openApi"), key: "api" },
  ]

  if (!isAuthenticated.value) {
    return publicItems
  }

  return [
    ...publicItems.slice(0, 2),
    { to: "/erp/orders", label: t("orders"), key: "orders" },
    { to: "/erp/listings", label: t("listings"), key: "listings" },
    ...publicItems.slice(2),
    { to: "/become-supplier", label: t("supplier"), key: "supplier" },
  ]
})

function isNavItemActive(path: string) {
  if (path === "/") {
    return normalizedRoutePath.value === "/"
  }
  if (path === "/products") {
    return normalizedRoutePath.value === "/products" || normalizedRoutePath.value.startsWith("/products/")
  }
  if (path === "/pricing") {
    return normalizedRoutePath.value === "/pricing"
  }
  if (path === "/api") {
    return normalizedRoutePath.value === "/api"
  }
  if (path === "/erp/orders") {
    return normalizedRoutePath.value === "/erp/orders" || normalizedRoutePath.value.startsWith("/erp/orders/")
  }
  if (path === "/erp/listings") {
    return normalizedRoutePath.value === "/erp/listings" || normalizedRoutePath.value.startsWith("/erp/listings/")
  }
  if (path === "/become-supplier") {
    return normalizedRoutePath.value === "/become-supplier" || normalizedRoutePath.value === "/erp/supplier" || normalizedRoutePath.value.startsWith("/erp/supplier/")
  }
  return normalizedRoutePath.value === path
}

const authRedirectTarget = computed(() => {
  const current = route.fullPath || "/"
  if (!current.startsWith("/")) return "/"
  if (current === "/auth" || current === "/login" || current === "/register") return "/"
  return current
})

const loginLink = computed(() => ({
  path: "/auth",
  query: {
    mode: "login",
    redirect: authRedirectTarget.value,
  },
}))

const registerLink = computed(() => ({
  path: "/auth",
  query: {
    mode: "register",
    redirect: authRedirectTarget.value,
  },
}))

// Scroll handling
const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

// Mobile menu handling
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// User dropdown handling
const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
}

const closeUserDropdown = () => {
  showUserDropdown.value = false
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    closeUserDropdown()
    if (normalizedRoutePath.value === "/erp/supplier" || normalizedRoutePath.value.startsWith("/erp/supplier/") || normalizedRoutePath.value.startsWith("/erp/")) {
      await router.replace("/")
    }
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.user-dropdown')) {
    showUserDropdown.value = false
  }
  if (!target.closest('.mobile-nav-menu') && !target.closest('.mobile-menu-toggle')) {
    isMobileMenuOpen.value = false
  }
}

watch(normalizedRoutePath, (path) => {
  if (forceEnglishRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    if (locale.value !== "en") {
      uiLocaleStore.setLocale("en")
    }
  }
}, { immediate: true })

watch(isAuthenticated, (authed) => {
  if (authed) void fetchUserCapabilities()
})

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('mockup100:insufficient-tokens', handleInsufficientTokensEvent)
  handleScroll() // Initial check
  if (isAuthenticated.value) {
    void fetchUserCapabilities()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('mockup100:insufficient-tokens', handleInsufficientTokensEvent)
})
</script>

<template>
  <div class="app">
    <!-- Fixed top navigation -->
    <header v-if="showShellNavbar" class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
      <div class="nav-container">
        <!-- Logo -->
        <div class="nav-brand">
          <RouterLink to="/" class="brand-link">
            <BrandLogo size="nav" />
          </RouterLink>
        </div>
        
        <!-- Desktop navigation -->
        <nav class="nav-menu">
          <RouterLink
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="nav-link"
            :class="{ active: isNavItemActive(item.to) }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
        
        <!-- User actions -->
        <div class="nav-actions">
          <div class="locale-switch">
            <FilterDropdown
              :model-value="locale"
              :options="localeOptions"
              @update:model-value="updateLocale"
            />
          </div>

          <!-- Unauthenticated state -->
          <template v-if="!isAuthenticated">
            <RouterLink :to="loginLink" class="btn-secondary">{{ t("logIn") }}</RouterLink>
            <RouterLink :to="registerLink" class="btn-primary">{{ t("signUp") }}</RouterLink>
          </template>

          <!-- Authenticated state -->
          <template v-else>
            <div class="user-dropdown" :class="{ open: showUserDropdown }">
              <button class="user-menu-trigger" type="button" @click="toggleUserDropdown" :aria-expanded="showUserDropdown ? 'true' : 'false'">
                <div class="user-avatar">
                  {{ userInitials }}
                </div>
                <div class="user-trigger-meta">
                  <span class="user-trigger-name">{{ userEmail }}</span>
                  <span class="user-trigger-sub">{{ planName }}</span>
                </div>
                <span class="user-caret" :class="{ open: showUserDropdown }" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none">
                    <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>

              <div class="dropdown-menu">
                <div class="dropdown-header">
                  <div class="user-info">
                    <div class="user-avatar-large">
                      {{ userInitials }}
                    </div>
                    <div class="user-details">
                      <div class="user-name">{{ userDisplayName }}</div>
                      <div class="user-email">{{ account?.email }}</div>
                      <div class="user-meta-row">
                        <span class="user-plan" :class="planClass">{{ planName }}</span>
                        <span class="user-tenant" :title="tenantName">{{ tenantName }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="dropdown-divider"></div>

                <div class="dropdown-body">
                  <div class="dropdown-section">
                    <div class="dropdown-section-title">{{ $t('admin.accountSettings') }}</div>
                    <div class="dropdown-section-list">
                      <RouterLink to="/admin/settings" class="dropdown-link" @click="closeUserDropdown">
                        <span class="dropdown-link-icon">⚙️</span>
                        <span class="dropdown-link-label">{{ $t('admin.account') }}</span>
                      </RouterLink>
                      <RouterLink to="/admin/developer-console/keys-access" class="dropdown-link" @click="closeUserDropdown">
                        <span class="dropdown-link-icon">🔑</span>
                        <span class="dropdown-link-label">{{ $t('admin.apiKeys') }}</span>
                      </RouterLink>
                    </div>
                  </div>

                  <div class="dropdown-section">
                    <div class="dropdown-section-title">{{ $t('admin.subscriptionsSnapshot') }}</div>
                    <div class="subscriptions-snapshot">
                      <div class="snapshot-row">
                        <span class="snapshot-label">{{ $t('admin.tokenBalance') }}</span>
                        <span class="snapshot-badge active">{{ tokenBalance }}</span>
                        <RouterLink to="/admin/tokens-management" class="snapshot-cta" @click="closeUserDropdown">{{ $t('admin.topUp') }}</RouterLink>
                      </div>
                      <div class="snapshot-row">
                        <span class="snapshot-label">{{ $t('admin.grading') }}</span>
                        <span class="snapshot-badge" :class="gradingActive ? 'active' : 'inactive'">{{ gradingActive ? $t('admin.active') : $t('admin.inactive') }}</span>
                        <RouterLink to="/admin/subscriptions?tab=grading" class="snapshot-cta" @click="closeUserDropdown">{{ $t('admin.manage') }}</RouterLink>
                      </div>
                      <div class="snapshot-row">
                        <span class="snapshot-label">{{ $t('admin.wpPro') }}</span>
                        <span class="snapshot-badge" :class="wpProActive ? 'active' : 'inactive'">{{ wpProActive ? $t('admin.active') : $t('admin.inactive') }}</span>
                        <RouterLink to="/admin/subscriptions?tab=wp-pro" class="snapshot-cta" @click="closeUserDropdown">{{ $t('admin.manage') }}</RouterLink>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="dropdown-divider"></div>

                <div class="dropdown-footer">
                  <RouterLink to="/admin" class="action-button home" @click="closeUserDropdown">
                    <div class="action-icon">🛠️</div>
                    <span>{{ $t('admin.dashboard') }}</span>
                  </RouterLink>
                  <button class="action-button logout" type="button" @click="handleLogout">
                    <div class="action-icon">🚪</div>
                    <span>{{ $t('admin.signOut') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </template>
          
          <!-- Mobile menu button -->
          <button class="mobile-menu-toggle" type="button" @click="toggleMobileMenu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      
      <!-- Mobile navigation -->
      <div class="mobile-nav-menu" :class="{ 'menu-open': isMobileMenuOpen }">
        <nav class="mobile-nav">
          <RouterLink
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="mobile-nav-link"
            :class="{ active: isNavItemActive(item.to) }"
            @click="closeMobileMenu"
          >
            {{ item.label }}
          </RouterLink>
          
          <!-- Mobile user menu -->
          <template v-if="isAuthenticated">
            <div class="mobile-divider"></div>
            <template v-for="section in adminDropdownSections" :key="`mobile-${section.key}`">
              <div class="mobile-section-title">{{ section.title }}</div>
              <RouterLink
                v-for="item in section.items"
                :key="`mobile-${section.key}-${item.key}`"
                :to="item.to"
                class="mobile-nav-link"
                @click="closeMobileMenu"
              >
                <span class="item-icon">{{ item.icon }}</span>
                {{ item.label }}
              </RouterLink>
            </template>
            <button class="mobile-nav-link logout-link" type="button" @click="handleLogout(); closeMobileMenu()">
              <span class="item-icon">🚪</span>
              {{ t("logOut") }}
            </button>
          </template>
          
          <template v-else>
            <div class="mobile-divider"></div>
            <RouterLink :to="loginLink" class="mobile-nav-link" @click="closeMobileMenu">
              {{ t("logIn") }}
            </RouterLink>
            <RouterLink :to="registerLink" class="mobile-nav-link primary" @click="closeMobileMenu">
              {{ t("signUp") }}
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Main content -->
    <main class="main-content" :class="{ 'no-shell-navbar': !showShellNavbar }">
      <RouterView />
    </main>

    <footer v-if="showSystemFooter" class="site-footer">
      <div class="footer-container">
        <div class="footer-main">
          <div class="footer-brand">
            <div class="footer-logo">
              <img src="/images/logo-new.svg" alt="mockup100" class="footer-logo-img" />
              <span class="footer-logo-text">mockup100</span>
            </div>
            <p class="footer-slogan">{{ t("footerSlogan") }}</p>
            <div class="footer-company-info">
              <p class="footer-company-label">{{ t("operatedBy") }}</p>
              <p class="footer-company-name">{{ t("footerCompany") }}</p>
            </div>
          </div>
          <div class="footer-links-container">
            <div class="footer-column">
              <h4 class="footer-column-title">{{ t("footerProduct") }}</h4>
              <ul class="footer-column-list">
                <li><a href="#" class="footer-link">{{ t("footerFeatures") }}</a></li>
                <li><RouterLink to="/pricing" class="footer-link">{{ t("footerPricing") }}</RouterLink></li>
                <li><a href="#" class="footer-link">{{ t("footerDocs") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerApiRef") }}</a></li>
              </ul>
            </div>
            <div class="footer-column">
              <h4 class="footer-column-title">{{ t("footerCompanyCol") }}</h4>
              <ul class="footer-column-list">
                <li><a href="#" class="footer-link">{{ t("footerAbout") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerCareers") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerBlog") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerContact") }}</a></li>
              </ul>
            </div>
            <div class="footer-column">
              <h4 class="footer-column-title">{{ t("footerLegal") }}</h4>
              <ul class="footer-column-list">
                <li><a href="#" class="footer-link">{{ t("footerTerms") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerPrivacy") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerCookie") }}</a></li>
                <li><a href="#" class="footer-link">{{ t("footerGdpr") }}</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="footer-copyright">&copy; {{ new Date().getFullYear() }} mockup100. {{ t("footerCopyright") }}</p>
          <div class="footer-social">
            <a href="#" class="footer-social-link" aria-label="Twitter">
              <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="#" class="footer-social-link" aria-label="GitHub">
              <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a href="#" class="footer-social-link" aria-label="LinkedIn">
              <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="#" class="footer-social-link" aria-label="Instagram">
              <svg class="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>

    <!-- 0.4.53: 全局 token 余额不足弹窗。任何页面/组件触发 402 都会显示此弹窗。 -->
    <div
      v-if="insufficientTokensModalOpen"
      class="mockup100-insufficient-tokens-backdrop"
      @click.self="closeInsufficientTokensModal"
    >
      <div class="mockup100-insufficient-tokens-modal" role="dialog" aria-modal="true">
        <header><h3>{{ t("insufficientTokensTitle") }}</h3></header>
        <div class="body">
          <p><strong>{{ t("insufficientTokensReasonLabel") }}</strong>{{ t("insufficientTokensReasonText") }}</p>
          <p>
            <strong>{{ t("insufficientTokensActionLabel") }}</strong>{{ t("insufficientTokensActionPrefix") }}
            <a href="/admin/tokens-management" target="_blank" rel="noopener">{{ t("insufficientTokensActionLink") }}</a>{{ t("insufficientTokensActionSuffix") }}
          </p>
        </div>
        <footer>
          <button type="button" class="action-button" @click="closeInsufficientTokensModal">{{ t("insufficientTokensClose") }}</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 0.4.53: 全局 token 余额不足弹窗样式(与 RepositoryPreviewPage 内嵌版本视觉一致) */
.mockup100-insufficient-tokens-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.mockup100-insufficient-tokens-modal {
  background: #fff;
  border-radius: 12px;
  width: min(520px, 100%);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.mockup100-insufficient-tokens-modal header {
  padding: 18px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #fef2f2;
}
.mockup100-insufficient-tokens-modal header h3 {
  margin: 0;
  font-size: 17px;
  color: #b91c1c;
  font-weight: 700;
}
.mockup100-insufficient-tokens-modal .body {
  padding: 20px 24px;
}
.mockup100-insufficient-tokens-modal .body p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}
.mockup100-insufficient-tokens-modal .body a {
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
}
.mockup100-insufficient-tokens-modal .body a:hover {
  text-decoration: underline;
}
.mockup100-insufficient-tokens-modal footer {
  padding: 14px 24px 20px;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}
.mockup100-insufficient-tokens-modal .action-button {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 22px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mockup100-insufficient-tokens-modal .action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.28);
}

/* Base styles */
.app {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
}

.site-footer {
  background-color: #F9FAFB;
  border-top: 1px solid #E5E7EB;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-main {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 3rem 0;
}

@media (min-width: 768px) {
  .footer-main {
    flex-direction: row;
  }
}

.footer-brand {
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .footer-brand {
    width: 33.333%;
  }
}

.footer-logo {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.footer-logo-img {
  height: 3rem;
  margin-right: 0.5rem;
}

.footer-logo-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1F2937;
}

.footer-slogan {
  font-size: 0.875rem;
  color: #6B7280;
  margin-bottom: 1.5rem;
}

.footer-company-info {
  margin-top: 1.5rem;
}

.footer-company-label,
.footer-company-name {
  font-size: 0.75rem;
  color: #6B7280;
}

.footer-links-container {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 2rem;
}

@media (min-width: 768px) {
  .footer-links-container {
    width: 66.666%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
  }
}

.footer-column-title {
  font-size: 0.875rem;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 1rem;
}

.footer-column-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-link {
  font-size: 0.875rem;
  color: #4B5563;
  text-decoration: none;
  transition: color 200ms;
}

.footer-link:hover {
  color: #000000;
}

.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 0;
  border-top: 1px solid #E5E7EB;
}

@media (min-width: 768px) {
  .footer-bottom {
    flex-direction: row;
  }
}

.footer-copyright {
  font-size: 0.875rem;
  color: #6B7280;
}

.footer-social {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

@media (min-width: 768px) {
  .footer-social {
    margin-top: 0;
  }
}

.footer-social-link {
  color: #6B7280;
  transition: color 200ms;
}

.footer-social-link:hover {
  color: #000000;
}

.footer-social-icon {
  width: 1.5rem;
  height: 1.5rem;
}

/* Navigation */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e2e8f0;
  z-index: 1000;
  transition: all 0.3s ease;
}

.navbar.navbar-scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.nav-container {
  max-width: 1380px;
  margin: 0 auto;
  padding: 0.85rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

/* Logo */
.nav-brand {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 40px;
}

.logo-image {
  height: 40px;
  width: auto;
  object-fit: contain;
}

.brand-link:hover .brand-logo {
  transform: scale(1.05);
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.02em;
}

/* Desktop navigation */
.nav-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1 1 auto;
  justify-content: center;
  min-width: 0;
}

.nav-link {
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.nav-link.active {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1rem;
  left: 50%;
  transform: translateX(-50%);
  width: 2rem;
  height: 3px;
  gap: 0.5rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex: 0 0 auto;
  min-width: 220px;
}

.shell-lang-switch {
  flex: 0 0 auto;
}

.locale-switch {
  min-width: 76px;
}

.locale-switch :deep(.filter-dropdown) {
  min-width: 76px;
}

.locale-switch :deep(.filter-dropdown-trigger) {
  height: 38px;
  border-radius: 0.75rem;
  border-color: #dbe3f0;
  background: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0 0.65rem;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  text-decoration: none;
  padding: 0.625rem 1.25rem;
  border-radius: 0.65rem;
  font-weight: 700;
  font-size: 0.875rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(99, 102, 241, 0.2);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: transparent;
  color: #6366f1;
  text-decoration: none;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: 2px solid #6366f1;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover {
  background: #6366f1;
  color: white;
  transform: translateY(-1px);
}

/* User dropdown */
.user-dropdown {
  position: relative;
  flex: 0 1 auto;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.85rem 0.5rem 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  max-width: 320px;
  min-width: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.user-menu-trigger:hover {
  border-color: #6366f1;
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.12);
  transform: translateY(-1px);
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.user-trigger-meta {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
  min-width: 0;
}

.user-trigger-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  max-width: 100%;
}

.user-trigger-sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  max-width: 100%;
}

.user-caret {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  background: rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.user-caret svg {
  width: 18px;
  height: 18px;
}

.user-caret.open {
  transform: rotate(180deg);
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(229, 231, 235, 0.8);
  width: min(520px, calc(100vw - 2rem));
  max-height: min(78vh, 760px);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.user-dropdown.open .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-header {
  padding: 1.25rem 1.25rem 1rem;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
  font-size: 1rem;
  word-break: break-word;
}

.user-email {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.user-plan {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.user-meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.user-tenant {
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.2rem 0.6rem;
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-trial {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.plan-pro {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
}

.plan-free {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #374151;
}

.plan-admin {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #5b21b6;
}

.dropdown-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(229, 231, 235, 0.5) 50%, transparent 100%);
  margin: 0;
}

.dropdown-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem;
}

.dropdown-section + .dropdown-section {
  margin-top: 0.875rem;
}

.dropdown-section-title {
  padding: 0 0.5rem 0.35rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}

.dropdown-section-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.dropdown-link {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border-radius: 14px;
  text-decoration: none;
  color: #334155;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, color 0.18s ease;
  border: 1px solid transparent;
}

.dropdown-link:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  transform: translateX(2px);
}

.dropdown-link-icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  font-size: 1rem;
  flex-shrink: 0;
}

.dropdown-link-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: inherit;
}

.subscriptions-snapshot {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.snapshot-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.snapshot-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snapshot-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}

.snapshot-badge.active {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.snapshot-badge.inactive {
  background: #f1f5f9;
  color: #64748b;
  border-color: #e2e8f0;
}

.snapshot-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.snapshot-cta:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.dropdown-footer {
  padding: 1rem 1.25rem 1.25rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  flex: 0 0 auto;
  background: #ffffff;
  position: sticky;
  bottom: 0;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem 1rem;
  border: none;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease, box-shadow 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
}

.action-button.home {
  background: #eff6ff;
  color: #1d4ed8;
  border: 2px solid #bfdbfe;
}

.action-button.home:hover {
  background: #dbeafe;
}

.action-button.logout {
  background: #f8fafc;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.action-button.logout:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.action-icon {
  font-size: 1.125rem;
}

.item-icon {
  font-size: 1rem;
  width: 1.2rem;
  text-align: center;
  flex-shrink: 0;
}

.mobile-section-title {
  padding: 0.6rem 0.85rem 0.25rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(226, 232, 240, 0.9);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Mobile menu button */
.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.mobile-menu-toggle:hover {
  background: #f1f5f9;
}

.mobile-menu-toggle span {
  width: 1.25rem;
  height: 2px;
  background: #374151;
  margin: 2px 0;
  transition: all 0.3s ease;
}

/* Mobile navigation */
.mobile-nav-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.mobile-nav-menu.menu-open {
  opacity: 1;
  visibility: visible;
}

.mobile-nav {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  padding: 5rem 1.5rem 2rem;
  overflow-y: auto;
}

.mobile-nav-menu.menu-open .mobile-nav {
  transform: translateX(0);
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  color: #374151;
  text-decoration: none;
  font-weight: 500;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.3s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.mobile-nav-link:hover {
  color: #6366f1;
}

.mobile-nav-link.active {
  color: #6366f1;
}

.mobile-nav-link.logout-link {
  color: #ef4444;
}

.mobile-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 1rem 0;
}

/* Main content */
.main-content {
  padding-top: 5rem; /* Reserve space for the fixed navigation */
  min-height: 100vh;
}

.main-content.no-shell-navbar {
  padding-top: 0;
}

/* Responsive layout */
@media (max-width: 768px) {
  .nav-container {
    padding: 1rem;
  }
  
  .nav-menu {
    display: none;
  }
  
  .user-name {
    display: none;
  }

  .nav-actions {
    min-width: auto;
    gap: 0.5rem;
  }

  .locale-switch {
    min-width: 112px;
  }

  .user-trigger-meta {
    display: none;
  }

  .user-menu-trigger {
    padding: 0.4rem;
  }

  .mobile-menu-toggle {
    display: flex;
  }
  
  .main-content {
    padding-top: 4rem;
  }

  .main-content.no-shell-navbar {
    padding-top: 0;
  }
}

@media (max-width: 480px) {
  .nav-container {
    padding: 0.75rem 1rem;
  }
  
  .brand-text {
    font-size: 1.25rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .nav-actions {
    gap: 0.4rem;
  }

  .locale-switch {
    min-width: 104px;
  }
  
  .mobile-nav {
    width: 100%;
    padding: 4rem 1.5rem 2rem;
  }
}
</style>
