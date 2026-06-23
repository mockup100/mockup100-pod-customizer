<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <a href="/" class="logo logo-link" @click="closeUserDropdown">
          <BrandLogo :size="sidebarCollapsed ? 'nav' : 'sidebar'" />
        </a>
        <button @click="toggleSidebar" class="sidebar-toggle">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <nav ref="sidebarNavRef" class="sidebar-nav">
        <div v-for="section in navigationSections" :key="section.key" class="nav-section">
          <div v-if="!sidebarCollapsed" class="nav-section-title">{{ section.title }}</div>
          <ul class="nav-list">
            <li v-for="item in section.items" :key="item.key">
              <RouterLink
                :to="item.to"
                class="nav-item"
                :class="{ active: isNavItemActive(item) }"
                :title="sidebarCollapsed ? item.label : undefined"
                :data-nav-key="item.key"
              >
                <span class="nav-icon">{{ item.icon }}</span>
                <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
                <span v-if="!sidebarCollapsed && item.badge" class="nav-badge">{{ item.badge }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Top Header -->
      <header class="top-header">
        <div class="header-left">
          <div class="breadcrumb">
            <span class="breadcrumb-item">{{ currentPageTitle }}</span>
          </div>
        </div>
        
        <div class="header-right">
          <div class="locale-switch">
            <FilterDropdown
              :model-value="locale"
              :options="localeOptions"
              @update:model-value="updateLocale"
            />
          </div>
          <div class="user-dropdown" :class="{ open: showUserDropdown }">
            <button @click="toggleUserDropdown" class="user-menu-trigger" :aria-expanded="showUserDropdown ? 'true' : 'false'">
              <div class="user-avatar">
                {{ userInitials }}
              </div>
              <div class="user-trigger-meta">
                <span class="user-trigger-name">{{ userEmail }}</span>
                <span class="user-trigger-sub">{{ currentPageTitle }} · {{ planName }}</span>
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
                <RouterLink to="/" class="action-button home" @click="closeUserDropdown">
                  <div class="action-icon">🏠</div>
                  <span>{{ $t('admin.publicSite') }}</span>
                </RouterLink>
                
                <button @click="handleLogout" class="action-button logout">
                  <div class="action-icon">🚪</div>
                  <span>{{ $t('admin.signOut') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="page-content">
        <div class="page-content-inner">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { storeToRefs } from 'pinia'
import BrandLogo from '../components/BrandLogo.vue'
import FilterDropdown from '../components/FilterDropdown.vue'
import { SHARED_LOCALE_OPTIONS, isUiLocale } from '../utils/pagination'
import { useUiLocaleStore } from '../stores/uiLocale'
import { useAuthStore } from '../stores/auth'
import { useUserCapabilities, fetchUserCapabilities } from '../composables/useUserCapabilities'
import {
  TEMPLATE_CENTER_LABEL,
  TEMPLATE_EDITOR_LABEL,
  TEMPLATE_PREVIEW_LABEL,
  TEMPLATE_REPOSITORY_LABEL,
  TEMPLATE_UPLOAD_LABEL,
} from '../constants/adminTemplateGovernance'
import { getPlanDisplayName, normalizePlanCode } from '../utils/billingModel'
import { buildAdminTenantRoute, readAdminTenantContext } from '../pages/admin/adminTenantContext'

const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const route = useRoute()
const router = useRouter()
const { role, account, subscription, entitlements, tenant } = storeToRefs(authStore)
const { locale } = storeToRefs(uiLocaleStore)
const { tokenBalance, gradingActive, wpProActive } = useUserCapabilities()

const localeOptions = SHARED_LOCALE_OPTIONS
function updateLocale(value: string) {
  if (isUiLocale(value)) {
    uiLocaleStore.setLocale(value)
  }
}

const isZh = computed(() => locale.value === 'zh')
function tt(en: string, zh: string) {
  return isZh.value ? zh : en
}

// UI State
const sidebarCollapsed = ref(false)
const showUserDropdown = ref(false)
const sidebarNavRef = ref<HTMLElement | null>(null)

type NavigationItem = {
  key: string
  to: RouteLocationRaw
  label: string
  icon: string
  description: string
  badge?: string
}

type NavigationSection = {
  key: string
  title: string
  items: NavigationItem[]
}

const navigationSections = computed((): NavigationSection[] => {
  const isAdmin = role.value === "platform_admin"
  const context = readAdminTenantContext(route.query)
  const tenantScopedKeys = new Set(["billing", "orders-management", "artwork-billing", "artwork-orders", "artworks", "artwork-center", "storefront"])
  const withTenantContext = (key: string, path: string): RouteLocationRaw => {
    if (isAdmin && tenantScopedKeys.has(key) && context.tenantId) {
      return buildAdminTenantRoute(path, context.tenantId, context.tenantLabel)
    }
    return path
  }

  const overviewItems: NavigationItem[] = [
    { key: "dashboard", to: "/admin/dashboard", label: tt("Dashboard", "总览"), icon: "📊", description: tt("Platform overview", "平台总览") },
  ]

  const catalogItems: NavigationItem[] = [
    {
      key: "repository",
      to: "/admin/repository",
      label: tt(TEMPLATE_REPOSITORY_LABEL, "模板库"),
      icon: "📚",
      description: isAdmin
        ? tt("Manage the shared template library and runtime assets", "管理共享模板库与运行时资源")
        : tt("Manage templates in your tenant library workspace", "在租户模板库中管理模板"),
    },
    {
      key: "artworks",
      to: withTenantContext("artworks", isAdmin ? "/admin/artworks/platform" : "/admin/artworks/tenant"),
      label: tt("Artwork Library", "作品库"),
      icon: "🖼️",
      description: isAdmin
        ? tt("Curate shared platform artwork assets", "整理共享平台作品资源")
        : tt("Manage tenant artwork for preview and design", "管理租户作品用于预览与设计"),
    },
  ]

  const publishingItems: NavigationItem[] = [
    {
      key: "center",
      to: "/admin/center",
      label: tt(TEMPLATE_CENTER_LABEL, "模板中心"),
      icon: "🛒",
      description: isAdmin
        ? tt("Review template submissions and maintain listed templates", "审核模板提交并维护已上架模板")
        : tt("Submit templates for review and track listing status", "提交模板审核并追踪上架状态"),
    },
    {
      key: "artwork-center",
      to: withTenantContext("artwork-center", "/admin/artworks/center"),
      label: tt("Artwork Center", "作品中心"),
      icon: "🎨",
      description: isAdmin
        ? tt("Review artwork submissions and maintain listed artwork", "审核作品提交并维护已上架作品")
        : tt("Track artwork review status and listed artwork availability", "追踪作品审核状态与已上架作品可用性"),
    },
    {
      key: "storefront",
      to: withTenantContext("storefront", "/admin/storefront"),
      label: isAdmin ? tt("Creative Space Review", "创意空间审核") : tt("Creative Space Studio", "创意空间工作室"),
      icon: "🏪",
      description: isAdmin
        ? tt("Review tenant creative space submissions and feature approved spaces on the home page", "审核租户创意空间提交并在首页推荐通过的空间")
        : tt("Shape public creative space identity, preview entry points, and catalog visibility", "塑造公开创意空间形象、预览入口与目录可见性"),
    },
  ]

  const orderItems: NavigationItem[] = [
    { key: "orders-management", to: withTenantContext("orders-management", "/admin/orders-management"), label: tt("Orders", "订单"), icon: "🧾", description: tt("Template order timeline and settlement review", "模板订单时间线与结算审核") },
    { key: "artwork-orders", to: withTenantContext("artwork-orders", "/admin/artwork-orders"), label: tt("Artwork Orders", "作品订单"), icon: "🛍️", description: tt("Artwork sales ledger and purchase review", "作品销售账本与购买审核") },
  ]

  const billingTokensItems: NavigationItem[] = [
    { key: "billing", to: withTenantContext("billing", "/admin/billing"), label: tt("Tenant Billing", "租户账单"), icon: "💳", description: tt("Template ledger, invoices, and settlement", "模板账本、发票与结算") },
    { key: "artwork-billing", to: withTenantContext("artwork-billing", "/admin/artwork-billing"), label: tt("Artwork Billing", "作品账单"), icon: "🖼️", description: tt("Artwork earnings, commissions, and payout readiness", "作品收益、佣金与提现准备") },
    { key: "tokens-management", to: "/admin/tokens-management", label: tt("Token Wallet", "Token 钱包"), icon: "🪙", description: tt("Token balance, packs, and billing rules", "Token 余额、套餐与计费规则") },
    { key: 'subscriptions-licensing', to: '/admin/subscriptions', label: tt('Subscriptions & Licensing', '订阅与授权'), icon: '🪪', description: tt('Manage subscriptions and product licensing', '管理订阅与产品授权') },
  ]

  const developerItems: NavigationItem[] = [
    {
      key: "developer-keys-access",
      to: "/admin/developer-console/keys-access",
      label: tt("Keys & Access", "密钥与访问"),
      icon: "🔑",
      description: tt("API keys, scopes, and access readiness", "API 密钥、作用域与接入准备"),
    },
    {
      key: "developer-usage-activity",
      to: "/admin/developer-console/usage-activity",
      label: tt("Usage & Activity", "用量与活动"),
      icon: "📈",
      description: tt("Trusted events, charges, and troubleshooting", "可信事件、扣费与故障排查"),
    },
    {
      key: "developer-docs-flow",
      to: "/admin/developer-console/docs-flow",
      label: tt("Docs & Flow", "文档与流程"),
      icon: "🧾",
      description: tt("Integration path, boundaries, and delivery gaps", "接入路径、边界与交付差距"),
    },
  ]

  const governanceItems: NavigationItem[] = isAdmin
    ? [
        { key: "categories", to: "/admin/categories", label: tt("Template Categories", "模板分类"), icon: "🏷️", description: tt("Manage template categories", "管理模板分类") },
        { key: "artwork-categories", to: "/admin/artwork-categories", label: tt("Artwork Categories", "作品分类"), icon: "🖌️", description: tt("Manage artwork categories", "管理作品分类") },
        { key: "tenants", to: "/admin/tenants", label: tt("Tenants", "租户"), icon: "👥", description: tt("Manage tenants", "管理租户") },
        { key: "permissions", to: "/admin/permissions", label: tt("Permissions", "权限"), icon: "🔐", description: tt("Grant/revoke WP Pro & Grading subscriptions", "授予/撤销 WP Pro 与 Grading 订阅") },
        { key: "offline-orders", to: "/admin/offline-orders", label: tt("Offline Orders", "线下订单"), icon: "🧾", description: tt("Record offline payments and confirm token credit", "记录线下付款并确认 Token 入账") },
        { key: "audit-logs", to: "/admin/audit-logs", label: tt("Audit Log", "审计日志"), icon: "📜", description: tt("Admin operations history", "管理员操作历史") },
      ]
    : []

  const accountItems: NavigationItem[] = [
    { key: "settings", to: "/admin/settings", label: tt("Account", "账户"), icon: "⚙️", description: tt("Profile and password", "个人资料与密码") },
  ]

  const sections: NavigationSection[] = [
    { key: "overview", title: tt("Overview", "总览"), items: overviewItems },
    { key: "catalog", title: tt("Libraries", "资源库"), items: catalogItems },
    { key: "publishing", title: tt("Publishing", "发布"), items: publishingItems },
    { key: "orders", title: tt("Orders", "订单"), items: orderItems },
    { key: "billing-tokens", title: tt("Billing & Tokens", "账单与 Token"), items: billingTokensItems },
    { key: "developer", title: tt("Developer", "开发者"), items: developerItems },
  ]

  if (governanceItems.length) {
    sections.push({ key: "governance", title: tt("Administration", "管理"), items: governanceItems })
  }
  sections.push({ key: "account", title: tt("Account", "账户"), items: accountItems })
  return sections
})

function isNavItemActive(item: NavigationItem) {
  const isPlatformAdmin = role.value === "platform_admin"
  const targetPath = typeof item.to === "string" ? item.to : item.to.path || ""
  if (item.key === 'settings') {
    return route.path === '/admin/settings' || route.path === '/admin/profile'
  }
  if (item.key === 'storefront') {
    return isPlatformAdmin
      ? route.path === '/admin/storefront'
      : route.path === '/admin/storefront'
  }
  const currentSection = Array.isArray(route.query.section) ? route.query.section[0] : route.query.section
  if (item.key === 'developer-keys-access') {
    return route.path === '/admin/developer-console/keys-access'
      || route.path === '/admin/sdk-api-access'
      || (route.path === '/admin/developer-console' && (!currentSection || currentSection === 'keys-access'))
  }
  if (item.key === 'developer-usage-activity') {
    return route.path === '/admin/developer-console/usage-activity'
      || route.path === '/admin/api-usage'
      || (route.path === '/admin/developer-console' && currentSection === 'usage-activity')
  }
  if (item.key === 'developer-docs-flow') {
    return route.path === '/admin/developer-console/docs-flow'
      || (route.path === '/admin/developer-console' && currentSection === 'docs-flow')
  }
  if (item.key === 'tokens-management') {
    return route.path === '/admin/tokens-management'
  }
  if (item.key === 'billing') {
    return route.path === '/admin/billing'
  }
  if (item.key === 'subscriptions-licensing') {
    return route.path === '/admin/subscriptions'
  }
  if (item.key === 'orders-management') {
    return route.path === '/admin/orders-management'
  }
  if (item.key === 'artwork-billing') {
    return route.path === '/admin/artwork-billing'
  }
  if (item.key === 'artwork-orders') {
    return route.path === '/admin/artwork-orders'
  }
  if (item.key === 'artwork-categories') {
    return route.path === '/admin/artwork-categories'
  }
  if (item.key === 'artworks') {
    return route.path === '/admin/artworks/platform' || route.path === '/admin/artworks/tenant'
  }
  if (item.key === 'artwork-center') {
    return route.path === '/admin/artworks/center'
  }
  return route.path === targetPath
}

const currentPageTitle = computed(() => {
  if (route.path === '/admin/repository-preview') return TEMPLATE_PREVIEW_LABEL
  if (route.path === '/admin/billing') return 'Tenant Billing'
  if (route.path === '/admin/artwork-billing') return 'Artwork Billing'
  if (route.path === '/admin/orders-management') return 'Orders'
  if (route.path === '/admin/artwork-orders') return 'Artwork Orders'
  if (route.path === '/admin/subscriptions') return 'Subscriptions & Licensing'
  if (route.path === '/admin/editor' && route.query.mode === 'upload') return TEMPLATE_UPLOAD_LABEL
  if (route.path === '/admin/editor') return TEMPLATE_EDITOR_LABEL
  if (typeof route.meta.title === 'string' && route.meta.title) return route.meta.title
  const allItems = navigationSections.value.flatMap((section) => section.items)
  const currentItem = allItems.find((item) => isNavItemActive(item))
  return currentItem?.label || 'Dashboard'
})

const tenantName = computed(() => {
  const t = tenant.value as (typeof tenant.value & { name?: string }) | null
  return (t?.name as string) || (t?.email as string) || 'Personal'
})

const userInitials = computed(() => {
  return account?.value?.display_name?.charAt(0)?.toUpperCase() || 
         account?.value?.email?.charAt(0)?.toUpperCase() || '?'
})

const userDisplayName = computed(() => {
  return account?.value?.display_name || account?.value?.email || 'User'
})

const userEmail = computed(() => {
  return account?.value?.email || userDisplayName.value
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

// Methods
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

async function scrollActiveNavItemIntoView() {
  await nextTick()
  if (sidebarCollapsed.value) return
  const container = sidebarNavRef.value
  const target = container?.querySelector<HTMLElement>(".nav-item.active")
  if (!container || !target) return
  target.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "auto",
  })
}

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
}

const closeUserDropdown = () => {
  showUserDropdown.value = false
}

const handleLogout = async () => {
  try {
    closeUserDropdown()
    await authStore.logout()
    router.push('/auth?mode=login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.user-dropdown') && !target.closest('.user-menu-trigger')) {
    showUserDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  void scrollActiveNavItemIntoView()
  void fetchUserCapabilities()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => [route.path, JSON.stringify(route.query)],
  () => {
    void scrollActiveNavItemIntoView()
  },
)

watch(sidebarCollapsed, (collapsed) => {
  if (!collapsed) {
    void scrollActiveNavItemIntoView()
  }
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent 28%),
    #f8fafc;
}

/* Sidebar */
.sidebar {
  width: 296px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.97) 34%, rgba(51, 65, 85, 0.95) 100%);
  color: white;
  transition: all 0.3s ease;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 1000;
  box-shadow: 18px 0 40px rgba(15, 23, 42, 0.16);
  border-right: 1px solid rgba(148, 163, 184, 0.14);
  backdrop-filter: blur(18px);
}

.sidebar.collapsed {
  width: 88px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-link {
  text-decoration: none;
  color: inherit;
}

.logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  box-shadow: 0 10px 24px rgba(6, 182, 212, 0.25);
}

.logo-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-text {
  font-size: 1rem;
  font-weight: 700;
  color: white;
}

.logo-domain {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.sidebar-toggle {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 12px;
  padding: 0.5rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* Navigation */
.sidebar-nav {
  padding: 1.1rem 1rem 1.5rem;
  overflow-y: auto;
  height: calc(100vh - 88px);
}

.nav-section {
  margin-bottom: 0.95rem;
  padding: 0.8rem;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.24);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.nav-section-title {
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0.5rem 0.95rem 0.75rem;
}

.sidebar.collapsed .nav-section {
  padding: 0.55rem;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.95rem;
  padding: 0.88rem 0.95rem;
  margin: 0;
  border-radius: 1rem;
  color: rgba(226, 232, 240, 0.84);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(148, 163, 184, 0.18);
  color: white;
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(16, 185, 129, 0.18) 100%);
  color: white;
  border-color: rgba(165, 180, 252, 0.35);
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.18);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0.35rem;
  top: 0.7rem;
  bottom: 0.7rem;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #34d399 0%, #818cf8 100%);
}

.nav-icon {
  font-size: 1.15rem;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.08);
}

.nav-label {
  font-weight: 700;
  flex: 1;
  min-width: 0;
}

.nav-badge {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-weight: 700;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 296px;
  transition: margin-left 0.3s ease;
}

.sidebar.collapsed + .main-content {
  margin-left: 88px;
}

/* Top Header */
.top-header {
  background: rgba(248, 250, 252, 0.78);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(14px);
}

.header-left {
  display: flex;
  align-items: center;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.brand-home-link {
  text-decoration: none;
  color: inherit;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.logo-image {
  height: 24px;
  width: auto;
  object-fit: contain;
}

.brand-subtext {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.04em;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-item {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 0 1 auto;
}

.locale-switch {
  flex-shrink: 0;
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

/* Trial Warning */
.trial-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.trial-activate-btn {
  background: white;
  color: #f97316;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trial-activate-btn:hover {
  background: #f3f4f6;
}

/* User Dropdown */
.user-dropdown {
  position: relative;
  min-width: 0;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 16px;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 300px;
  max-width: 420px;
  width: max-content;
}

.user-menu-trigger:hover {
  border-color: #818cf8;
  box-shadow: 0 12px 24px rgba(148, 163, 184, 0.16);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.user-trigger-meta {
  max-width: 300px;
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

.dropdown-link.active {
  background: linear-gradient(135deg, #eef2ff 0%, #eff6ff 100%);
  border-color: #c7d2fe;
  color: #312e81;
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

.dropdown-link.active .dropdown-link-icon {
  background: #dbeafe;
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

/* Page Content */
.page-content {
  flex: 1;
  padding: 1.5rem 2rem;
  min-height: calc(100vh - 73px);
}

.page-content-inner {
  width: min(100%, 1440px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .top-header {
    padding: 1rem;
    align-items: flex-start;
  }
  
  .page-content {
    padding: 1rem;
  }

  .page-content-inner {
    width: 100%;
  }
  
  .trial-warning {
    display: none;
  }
  
  /* Dropdown responsive */
  .dropdown-menu {
    width: min(360px, calc(100vw - 1rem));
  }
  
  .dropdown-footer {
    grid-template-columns: 1fr;
    padding: 0.875rem 1rem 1rem;
  }

  .user-trigger-sub {
    display: none;
  }

  .user-menu-trigger {
    min-width: 0;
    max-width: min(100vw - 2rem, 320px);
  }

  .user-trigger-meta {
    max-width: 180px;
  }
}

@media (max-width: 480px) {
  .dropdown-header {
    padding: 1rem;
  }
  
  .user-avatar-large {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .user-name {
    font-size: 0.875rem;
  }
  
  .user-email {
    font-size: 0.75rem;
  }
  
  .dropdown-body {
    padding: 0.625rem;
  }
  
  .dropdown-link {
    padding: 0.7rem 0.75rem;
  }
  
  .dropdown-link-icon {
    width: 1.85rem;
    height: 1.85rem;
  }
  
  .dropdown-link-label {
    font-size: 0.875rem;
  }
  
  .action-button {
    padding: 0.75rem;
    font-size: 0.8125rem;
  }
}
</style>
