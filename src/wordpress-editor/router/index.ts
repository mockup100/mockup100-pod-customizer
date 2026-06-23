import { createRouter, createWebHistory, type RouteLocationGeneric } from "vue-router"
import {
  getAdminDocumentTitle,
  TEMPLATE_CENTER_LABEL,
  TEMPLATE_EDITOR_LABEL,
  TEMPLATE_PREVIEW_LABEL,
  TEMPLATE_REPOSITORY_LABEL,
  TEMPLATE_UPLOAD_LABEL,
} from "../constants/adminTemplateGovernance"
import { erpPageRoutes } from "../erp/pages"
import {
  hasSupplierMenuScope,
  readSupplierCapabilityFromStorage,
  resolveSupplierEntryRoute,
} from "../erp/supplier"
import { applyRouteSeo } from "../utils/seo"
import { UI_LOCALE_STORAGE_KEY } from "../stores/uiLocale"

type UiLocale = "en" | "zh"

function readUiLocale(): UiLocale {
  if (typeof window === "undefined") return "en"
  const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY)
  if (stored === "zh") return "zh"
  if (stored === "en") return "en"
  // 兼容历史 key (mockup-ui-locale): 仅在新 key 不存在时回退一次。
  return window.localStorage.getItem("mockup-ui-locale") === "zh" ? "zh" : "en"
}

function isGuestAccessiblePreviewRoute(to: RouteLocationGeneric) {
  if (to.path !== "/preview") return false
  const source = typeof to.query.source === "string" ? to.query.source : ""
  return source === "center" || source === "home" || source === "storefront"
}

function localizeRouteLabel(en: string, zh: string) {
  return readUiLocale() === "zh" ? zh : en
}

type AuthRole = "guest" | "platform_admin" | "tenant_admin"

type RouteMetaConfig = {
  requiresAuth?: boolean
  roles?: AuthRole[]
  requiresTenant?: boolean
  requiresSdkAccess?: boolean
  title?: string
  hideShellNavbar?: boolean
  hideShellFooter?: boolean
}

function normalizePublicPath(path: string) {
  if (!path) return "/"
  if (path === "/") return "/"
  return path.replace(/\/+$/, "") || "/"
}

function readStoredAuth(): {
  role: AuthRole
  accessToken: string
  tenantId: string
  sdkApiAccess: boolean
  email: string
  emailVerified: boolean
} {
  if (typeof window === "undefined") return { role: "guest", accessToken: "", tenantId: "", sdkApiAccess: false, email: "", emailVerified: true }
  const raw = window.localStorage.getItem("mockup-console-auth")
  if (!raw) return { role: "guest", accessToken: "", tenantId: "", sdkApiAccess: false, email: "", emailVerified: true }
  try {
    const payload = JSON.parse(raw) as {
      role?: AuthRole
      accessToken?: string
      account?: { email?: string | null; email_verified?: boolean | null } | null
      tenant?: { tenant_id?: string | null; id?: string | null } | null
      entitlements?: { sdk_api_access?: boolean } | null
    }
    const accessToken = payload.accessToken?.trim() || ""
    return {
      role: accessToken ? (payload.role || "guest") : "guest",
      accessToken,
      tenantId: payload.tenant?.tenant_id || payload.tenant?.id || "",
      sdkApiAccess: Boolean(payload.entitlements?.sdk_api_access),
      email: payload.account?.email || "",
      emailVerified: Boolean(payload.account?.email_verified ?? true),
    }
  } catch {
    return { role: "guest", accessToken: "", tenantId: "", sdkApiAccess: false, email: "", emailVerified: true }
  }
}

function resolveAdminHome(role: AuthRole) {
  return role === "platform_admin" ? "/admin/categories" : "/admin/repository"
}

function resolveSupplierGuardResult(context: { role: AuthRole; accessToken: string }, path: string) {
  const supplier = readSupplierCapabilityFromStorage()
  const normalizedPath = normalizePublicPath(path)

  if (normalizedPath === "/erp/supplier") {
    return true
  }

  if (
    normalizedPath === "/erp/supplier/company"
    || normalizedPath === "/erp/supplier/draft"
    || normalizedPath === "/erp/supplier/submitted"
    || normalizedPath === "/erp/supplier/audit"
    || normalizedPath === "/erp/supplier/audit/suppliers"
  ) {
    if (
      supplier.is_platform_admin
      || supplier.application_status === "draft"
      || supplier.application_status === "pending_review"
      || supplier.current_status === "pending_review"
      || supplier.current_status === "rejected"
      || supplier.current_status === "draft"
      || supplier.application_status === "rejected"
      || supplier.application_status === "approved"
    ) {
      return true
    }
    return resolveSupplierEntryRoute(supplier)
  }

  if (
    normalizedPath === "/erp/supplier/product/add"
    || normalizedPath === "/erp/supplier/product/list"
    || normalizedPath === "/erp/supplier/audit/products"
  ) {
    if (context.role === "platform_admin") {
      return true
    }
    if (!context.accessToken.trim()) {
      return resolveSupplierEntryRoute(supplier)
    }
    return hasSupplierMenuScope(supplier, "supplier_product") && supplier.can_access_workspace
      ? true
      : true
  }

  return true
}

function isTenantWorkspaceLocked(role: AuthRole, path: string, meta: RouteMetaConfig) {
  if (role !== "tenant_admin") {
    return false
  }
  const normalizedPath = normalizePublicPath(path)
  if (
    normalizedPath === "/erp/supplier" || normalizedPath.startsWith("/erp/supplier/")
    || normalizedPath === "/become-supplier"
    || normalizedPath === "/auth"
    || normalizedPath === "/login"
    || normalizedPath === "/register"
    || normalizedPath.startsWith("/verify-email")
  ) {
    return false
  }
  if (!meta.requiresAuth) {
    return false
  }
  const supplier = readSupplierCapabilityFromStorage()
  return supplier.isolated_from_tenant_workspace && supplier.application_status !== "approved"
}

function isVerificationRoute(path: string) {
  return path === "/verify-email/pending" || path === "/verify-email/result"
}

function resolveRouteTitle(path: string, query: Record<string, unknown>): string {
  const normalizedPath = normalizePublicPath(path)
  if (normalizedPath === "/") return localizeRouteLabel("Home", "首页")
  if (normalizedPath === "/products") return localizeRouteLabel("Products", "Products")
  if (normalizedPath.startsWith("/products/")) return localizeRouteLabel("Product Detail", "产品详情")
  if (normalizedPath === "/pricing") return localizeRouteLabel("Pricing", "价格")
  if (normalizedPath === "/become-supplier") return localizeRouteLabel("Supplier", "Supplier")
  if (normalizedPath === "/erp/supplier" || normalizedPath.startsWith("/erp/supplier/")) return localizeRouteLabel("Supplier", "Supplier")
  if (normalizedPath === "/erp") return localizeRouteLabel("ERP Center", "管理中心")
  if (normalizedPath === "/token-pricing") return localizeRouteLabel("Token Pricing", "令牌定价")
  if (normalizedPath === "/api") return localizeRouteLabel("OpenAPI", "OpenAPI")
  if (normalizedPath.startsWith("/store/")) return localizeRouteLabel("Creative Space", "创作空间")
  if (normalizedPath === "/auth") {
    const mode = Array.isArray(query.mode) ? query.mode[0] : query.mode
    if (mode === "register") return localizeRouteLabel("Sign Up", "注册")
    if (mode === "forgot-password") return localizeRouteLabel("Forgot Password", "忘记密码")
    if (mode === "reset-password") return localizeRouteLabel("Reset Password", "重置密码")
    return localizeRouteLabel("Log In", "登录")
  }
  if (normalizedPath === "/verify-email/pending") return localizeRouteLabel("Verify Your Email", "验证你的邮箱")
  if (normalizedPath === "/verify-email/result") return localizeRouteLabel("Email Verification", "邮箱验证")
  if (normalizedPath === "/preview") return localizeRouteLabel(TEMPLATE_PREVIEW_LABEL, "模板预览")
  if (normalizedPath === "/admin/product-store") return localizeRouteLabel("Product Store", "产品店铺")
  if (normalizedPath === "/admin/repository") return localizeRouteLabel(TEMPLATE_REPOSITORY_LABEL, "模板库")
  if (normalizedPath === "/admin/artworks/platform") return localizeRouteLabel("Artwork Library", "作品库")
  if (normalizedPath === "/admin/artworks/tenant") return localizeRouteLabel("Artwork Library", "作品库")
  if (normalizedPath === "/admin/artworks/center") return localizeRouteLabel("Artwork Center", "作品中心")
  if (normalizedPath === "/admin/artwork-billing") return localizeRouteLabel("Artwork Billing", "作品结算")
  if (normalizedPath === "/admin/artwork-orders") return localizeRouteLabel("Artwork Orders", "作品订单")
  if (normalizedPath === "/admin/artwork-categories") return localizeRouteLabel("Artwork Categories", "作品分类")
  if (normalizedPath === "/admin/storefront") return localizeRouteLabel("Creative Space", "创作空间")
  if (normalizedPath === "/admin/center") return localizeRouteLabel(TEMPLATE_CENTER_LABEL, "模板中心")
  if (normalizedPath === "/admin/repository-preview") return localizeRouteLabel(TEMPLATE_PREVIEW_LABEL, "模板预览")
  if (normalizedPath === "/admin/editor" && query.mode === "upload") return localizeRouteLabel(TEMPLATE_UPLOAD_LABEL, "上传模板")
  if (normalizedPath === "/admin/editor") return localizeRouteLabel(TEMPLATE_EDITOR_LABEL, "模板编辑器")
  if (normalizedPath === "/admin/developer-console/keys-access") return localizeRouteLabel("Keys & Access", "密钥与访问")
  if (normalizedPath === "/admin/developer-console/usage-activity") return localizeRouteLabel("Usage & Activity", "用量与活动")
  if (normalizedPath === "/admin/developer-console/docs-flow") return localizeRouteLabel("Docs & Flow", "文档与流程")
  if (normalizedPath === "/admin/developer-console/webhooks") return localizeRouteLabel("Webhooks", "Webhooks")
  if (normalizedPath === "/admin/developer-console") return localizeRouteLabel("Keys & Access", "密钥与访问")
  if (normalizedPath === "/admin/dashboard") return localizeRouteLabel("Dashboard", "仪表盘")
  return localizeRouteLabel("Dashboard", "仪表盘")
}

export const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../pages/HomePage.vue"),
    meta: { requiresAuth: false, hideShellFooter: true } satisfies RouteMetaConfig,
  },
  {
    path: "/products",
    name: "products-public",
    component: () => import("../pages/ProductsPage.vue"),
    meta: { requiresAuth: false, title: "Products" } satisfies RouteMetaConfig,
  },
  {
    path: "/products/:productCode",
    name: "products-public-detail",
    component: () => import("../pages/ProductDetailPage.vue"),
    meta: { requiresAuth: false, title: "Product Detail" } satisfies RouteMetaConfig,
  },
  {
    path: "/store/:slug",
    name: "storefront",
    component: () => import("../pages/StorefrontPage.vue"),
    meta: { requiresAuth: false, title: "Creative Space" } satisfies RouteMetaConfig,
  },
  {
    path: "/dashboard",
    name: "dashboard",
    redirect: "/admin/dashboard",
  },
  {
    path: "/templates",
    name: "templates",
    redirect: "/admin/repository",
  },
  {
    path: "/templates/:id",
    name: "template-detail",
    redirect: (to: { params: { id?: string | string[] } }) => ({
      path: "/preview",
      query: {
        template_id: Array.isArray(to.params.id) ? to.params.id[0] : to.params.id || "",
        source: "center",
      },
    }),
  },
  {
    path: "/preview",
    name: "standalone-preview",
    component: () => import("../pages/admin/RepositoryPreviewPage.vue"),
    meta: {
      requiresAuth: true,
      roles: ["platform_admin", "tenant_admin"],
      requiresTenant: true,
      title: TEMPLATE_PREVIEW_LABEL,
      hideShellNavbar: true,
      hideShellFooter: true,
    } satisfies RouteMetaConfig,
  },
  {
    path: "/templates/:id/edit",
    name: "template-edit",
    redirect: (to: { params: { id?: string | string[] } }) => ({
      path: "/admin/editor",
      query: { template_id: Array.isArray(to.params.id) ? to.params.id[0] : to.params.id || "" },
    }),
  },
  {
    path: "/settings",
    name: "settings",
    redirect: "/admin/settings",
  },
  {
    path: "/billing",
    name: "billing",
    redirect: "/admin/billing",
  },
  {
    path: "/token-pricing",
    name: "token-pricing",
    component: () => import("../pages/TokenPricingPage.vue"),
    meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true } satisfies RouteMetaConfig,
  },
  {
    path: "/recharge",
    name: "recharge",
    component: () => import("../pages/recharge/RechargePage.vue"),
    meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Recharge" } satisfies RouteMetaConfig,
  },
  {
    path: "/recharge/return",
    name: "recharge-return",
    component: () => import("../pages/recharge/RechargeReturnPage.vue"),
    meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Recharge Result" } satisfies RouteMetaConfig,
  },
  {
    path: "/recharge/cancel",
    name: "recharge-cancel",
    component: () => import("../pages/recharge/RechargeCancelPage.vue"),
    meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Recharge Cancelled" } satisfies RouteMetaConfig,
  },
  {
    // Plan v5 §C.2：PayPal Grading 订阅 approve 后的回跳路由。
    path: "/grading/return",
    name: "grading-return",
    component: () => import("../pages/grading/GradingReturnPage.vue"),
    meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Grading Subscription" } satisfies RouteMetaConfig,
  },
  {
    path: "/grading/cancel",
    name: "grading-cancel",
    redirect: "/admin/subscriptions-licensing?tab=grading",
  },
  {
    path: "/login",
    name: "login",
    redirect: (to: RouteLocationGeneric) => ({
      path: "/auth",
      query: {
        ...to.query,
        mode: "login",
      },
    }),
  },
  {
    path: "/register",
    name: "register",
    redirect: (to: RouteLocationGeneric) => ({
      path: "/auth",
      query: {
        ...to.query,
        mode: "register",
      },
    }),
  },
  {
    path: "/verify-email/pending",
    name: "verify-email-pending",
    component: () => import("../pages/EmailVerificationPendingPage.vue"),
    meta: { requiresAuth: false, title: "Verify Your Email" } satisfies RouteMetaConfig,
  },
  {
    path: "/verify-email/result",
    name: "verify-email-result",
    component: () => import("../pages/EmailVerificationResultPage.vue"),
    meta: { requiresAuth: false, title: "Email Verification" } satisfies RouteMetaConfig,
  },
  {
    path: "/pricing",
    name: "pricing",
    component: () => import("../pages/PricingPage.vue"),
    meta: { requiresAuth: false, hideShellFooter: true } satisfies RouteMetaConfig,
  },
  {
    path: "/api",
    name: "api",
    component: () => import("../pages/ApiPage.vue"),
    meta: { requiresAuth: false, title: "OpenAPI", hideShellFooter: true } satisfies RouteMetaConfig,
  },
  {
    path: "/become-supplier",
    name: "become-supplier",
    redirect: "/erp/supplier",
  },
  {
    path: "/wp-free",
    name: "wp-free-redirect",
    redirect: "/pricing#wp-free",
  },
  {
    path: "/wp-pro",
    name: "wp-pro-redirect",
    redirect: "/pricing#wp-pro",
  },
  {
    path: "/paypal/mock-checkout",
    name: "paypal-mock-checkout",
    component: () => import("../pages/MockPayPalCheckoutPage.vue"),
    meta: { requiresAuth: false, title: "Mock PayPal Checkout", hideShellNavbar: true } satisfies RouteMetaConfig,
  },
  {
    path: "/auth",
    name: "auth",
    component: () => import("../components/AuthenticationPage.vue"),
    meta: { requiresAuth: false } satisfies RouteMetaConfig,
  },
  {
    path: "/admin",
    component: () => import("../layouts/AdminLayout.vue"),
    meta: { requiresAuth: true } satisfies RouteMetaConfig,
    children: [
      {
        path: "",
        redirect: "/admin/dashboard"
      },
      {
        path: "product-store",
        name: "admin-product-store",
        component: () => import("../pages/admin/AdminProductStorePage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Product Store" } satisfies RouteMetaConfig,
      },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: () => import("../pages/admin/DashboardPage.vue"),
        meta: { requiresAuth: true, title: "Dashboard" } satisfies RouteMetaConfig,
      },
      {
        path: "billing",
        name: "admin-billing",
        component: () => import("../pages/admin/BillingPage.vue"),
        meta: { requiresAuth: true, title: "Tenant Billing" } satisfies RouteMetaConfig,
        beforeEnter: (to: RouteLocationGeneric) => {
          const section = Array.isArray(to.query.section) ? to.query.section[0] : to.query.section
          if (section === "grading" || section === "wp-pro") {
            const { section: _section, ...rest } = to.query
            return { path: "/admin/subscriptions", query: { ...rest, tab: section } }
          }
          return true
        },
      },
      {
        path: "subscriptions",
        name: "admin-subscriptions",
        component: () => import("../pages/admin/SubscriptionsLicensingPage.vue"),
        meta: { requiresAuth: true, title: "Subscriptions & Licensing" } satisfies RouteMetaConfig,
      },
      {
      path: "billing/paypal",
      name: "admin-billing-paypal",
      component: () => import("../pages/admin/PayPalAdminPage.vue"),
      meta: {
        requiresAuth: true,
        roles: ["platform_admin"],
        title: "PayPal Configuration",
      } satisfies RouteMetaConfig,
    },
      {
        path: "developer-console",
        name: "admin-developer-console",
        redirect: "/admin/developer-console/keys-access",
      },
      {
        path: "developer-console/keys-access",
        name: "admin-developer-keys-access",
        component: () => import("../pages/admin/DeveloperConsolePage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Keys & Access",
        } satisfies RouteMetaConfig,
      },
      {
        path: "developer-console/usage-activity",
        name: "admin-developer-usage-activity",
        component: () => import("../pages/admin/DeveloperConsolePage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Usage & Activity",
        } satisfies RouteMetaConfig,
      },
      {
        path: "developer-console/docs-flow",
        name: "admin-developer-docs-flow",
        component: () => import("../pages/admin/DeveloperConsolePage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Docs & Flow",
        } satisfies RouteMetaConfig,
      },
      {
        path: "developer-console/webhooks",
        name: "admin-developer-webhooks",
        component: () => import("../pages/admin/DeveloperConsolePage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Webhooks",
        } satisfies RouteMetaConfig,
      },
      {
        path: "api-usage",
        name: "admin-api-usage",
        redirect: "/admin/developer-console/usage-activity",
      },
      {
        path: "sdk-api-access",
        name: "admin-sdk-api-access",
        redirect: "/admin/developer-console/keys-access",
      },
      {
        path: "developer-workspace",
        name: "admin-developer-workspace",
        redirect: "/admin/developer-console/keys-access",
      },
      {
        path: "orders-management",
        name: "admin-orders-management",
        component: () => import("../pages/admin/OrdersManagementPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
      title: "Orders",
        } satisfies RouteMetaConfig,
      },
      {
        path: "artwork-billing",
        name: "admin-artwork-billing",
        component: () => import("../pages/admin/ArtworkBillingPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Artwork Billing",
        } satisfies RouteMetaConfig,
      },
      {
        path: "artwork-orders",
        name: "admin-artwork-orders",
        component: () => import("../pages/admin/ArtworkOrdersPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Artwork Orders",
        } satisfies RouteMetaConfig,
      },
      {
        path: "tokens-management",
        name: "admin-tokens-management",
        component: () => import("../pages/admin/TokensManagementPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Tokens",
        } satisfies RouteMetaConfig,
      },
      {
        path: "token-overview",
        name: "admin-token-overview",
        redirect: "/admin/tokens-management",
      },
      // Spec Task 14/15/16：管理后台权限管理 / 线下订单 / 审计日志
      {
        path: "permissions",
        name: "admin-permissions",
        component: () => import("../pages/admin/PermissionsPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin"], title: "Permissions" } satisfies RouteMetaConfig,
      },
      {
        path: "offline-orders",
        name: "admin-offline-orders",
        component: () => import("../pages/admin/OfflineOrdersPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin"], title: "Offline Orders" } satisfies RouteMetaConfig,
      },
      {
        path: "audit-logs",
        name: "admin-audit-logs",
        component: () => import("../pages/admin/AuditLogPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin"], title: "Audit Log" } satisfies RouteMetaConfig,
      },
      {
        path: "categories",
        name: "admin-categories",
        component: () => import("../pages/admin/AdminCategoryPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin"], title: "Template Categories" } satisfies RouteMetaConfig,
      },
      {
        path: "artwork-categories",
        name: "admin-artwork-categories",
        component: () => import("../pages/admin/AdminArtworkCategoryPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin"], title: "Artwork Categories" } satisfies RouteMetaConfig,
      },
      {
        path: "repository",
        name: "admin-repository",
        component: () => import("../pages/admin/AdminRepositoryPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: TEMPLATE_REPOSITORY_LABEL,
        } satisfies RouteMetaConfig,
      },
      {
        path: "artworks/platform",
        name: "admin-platform-artworks",
        component: () => import("../pages/admin/AdminPlatformArtworkPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin"],
          title: "Artwork Library",
        } satisfies RouteMetaConfig,
      },
      {
        path: "artworks/tenant",
        name: "admin-tenant-artworks",
        component: () => import("../pages/admin/AdminTenantArtworkPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Artwork Library",
        } satisfies RouteMetaConfig,
      },
      {
        path: "repository-preview",
        name: "admin-repository-preview",
        redirect: (to: RouteLocationGeneric) => ({
          path: "/preview",
          query: to.query,
        }),
      },
      {
        path: "templates",
        name: "admin-templates",
        redirect: "/admin/repository",
      },
      {
        path: "advanced-editor",
        name: "admin-advanced-editor",
        redirect: "/admin/editor",
      },
      {
        path: "editor",
        name: "admin-editor",
        component: () => import("../pages/admin/AdminEditorPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: TEMPLATE_EDITOR_LABEL,
        } satisfies RouteMetaConfig,
      },
      {
        path: "tenants",
        name: "admin-tenants",
        component: () => import("../pages/admin/AdminTenantPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Tenants" } satisfies RouteMetaConfig,
      },
      {
        path: "center",
        name: "admin-center",
        component: () => import("../pages/admin/AdminCenterPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: TEMPLATE_CENTER_LABEL,
        } satisfies RouteMetaConfig,
      },
      {
        path: "artworks/center",
        name: "admin-artwork-center",
        component: () => import("../pages/admin/AdminArtworkCenterPage.vue"),
        meta: {
          requiresAuth: true,
          roles: ["platform_admin", "tenant_admin"],
          requiresTenant: true,
          title: "Artwork Center",
        } satisfies RouteMetaConfig,
      },
      {
        path: "storefront",
        name: "admin-storefront",
        component: () => import("../pages/admin/AdminStorefrontPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Creative Space" } satisfies RouteMetaConfig,
      },
      {
        path: "settings",
        name: "admin-settings",
        component: () => import("../pages/admin/SettingsPage.vue"),
        meta: { requiresAuth: true, roles: ["platform_admin", "tenant_admin"], requiresTenant: true, title: "Account" } satisfies RouteMetaConfig,
      },
      {
        path: "profile",
        name: "admin-profile",
        redirect: "/admin/settings",
      },
    ],
  },
  ...erpPageRoutes,
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 80, behavior: "smooth" }
    if (to.path === from.path) return false
    return { left: 0, top: 0, behavior: "smooth" }
  },
})

// 处理新版本部署后旧客户端持有过期 chunk hash 的 404 / 加载失败:
// Vite 每次构建会生成新的 chunk hash, 老 SPA 仍引用旧 chunk 名,
// 路由懒加载会抛出 ChunkLoadError / "Failed to fetch dynamically imported module"。
// 此时强制硬刷,让浏览器拉到最新 index.html 与新 chunk hash。
const CHUNK_RELOAD_KEY = "mockup-chunk-reload-at"
router.onError((error, to) => {
  const message = String((error as Error)?.message || "")
  const isChunkError =
    message.includes("Failed to fetch dynamically imported module")
    || message.includes("Importing a module script failed")
    || message.includes("error loading dynamically imported module")
    || message.includes("ChunkLoadError")
  if (!isChunkError || typeof window === "undefined") return
  // 节流:同一次会话短时间内只硬刷一次,避免循环刷新
  try {
    const now = Date.now()
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (now - last < 5000) return
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
  } catch {
    // 忽略 sessionStorage 不可用的情况
  }
  const target = to?.fullPath || window.location.pathname + window.location.search + window.location.hash
  window.location.replace(target)
})

router.beforeEach(async (to) => {
  const { role, accessToken, tenantId, sdkApiAccess, email, emailVerified } = readStoredAuth()
  const meta = to.meta as RouteMetaConfig
  const authMode = typeof to.query.mode === "string" ? to.query.mode : ""
  const allowsGuestAuthFlow = to.path === "/auth" && (authMode === "forgot-password" || authMode === "reset-password")
  const guestAccessiblePreview = isGuestAccessiblePreviewRoute(to)
  const isAuthEntryRoute =
    to.path === "/login" ||
    to.path === "/register" ||
    (to.path === "/auth" && (authMode === "login" || authMode === "register" || authMode === ""))
  const allowsDevErpPreview = import.meta.env.DEV && to.path.startsWith("/erp")
  
  // If accessing admin root
  if (to.path === "/admin") {
    if (role === "guest") {
      return { path: "/auth", query: { ...to.query, mode: "login" } }
    }
    return resolveAdminHome(role)
  }

  if (isAuthEntryRoute && accessToken && !emailVerified) {
    const redirect = typeof to.query.redirect === "string" ? to.query.redirect : ""
    return {
      path: "/verify-email/pending",
      query: {
        email,
        ...(redirect.startsWith("/") ? { redirect } : {}),
      },
    }
  }

  if (to.path === "/auth" && accessToken && !allowsGuestAuthFlow) {
    const redirect = typeof to.query.redirect === "string" ? to.query.redirect : ""
    return redirect.startsWith("/") ? redirect : resolveAdminHome(role)
  }

  if (!guestAccessiblePreview && meta.requiresAuth && accessToken && !emailVerified && !isVerificationRoute(to.path)) {
    return {
      path: "/verify-email/pending",
      query: {
        email,
        redirect: to.fullPath,
      },
    }
  }

  if (guestAccessiblePreview) {
    return true
  }

  if (allowsDevErpPreview && meta.requiresAuth && !accessToken) {
    return true
  }

  if (to.path === "/erp/supplier" || to.path.startsWith("/erp/supplier/")) {
    const supplierGuardResult = resolveSupplierGuardResult({ role, accessToken }, to.path)
    if (supplierGuardResult !== true) {
      return supplierGuardResult
    }
  }

  if (isTenantWorkspaceLocked(role, to.path, meta)) {
    return resolveSupplierEntryRoute(readSupplierCapabilityFromStorage())
  }

  // Check authentication requirements
  if (meta.requiresAuth && !accessToken) {
    return { path: "/auth", query: { mode: "login", redirect: to.fullPath } }
  }
  
  // Check role requirements
  if (meta.roles && !meta.roles.includes(role)) {
    return role === "guest" ? { path: "/auth", query: { mode: "login", redirect: to.fullPath } } : "/admin"
  }
  
  // Check tenant requirements
  if (meta.requiresTenant && !tenantId) {
    if (role === "platform_admin") {
      return true
    }
    return { path: "/auth", query: { mode: "login", redirect: to.fullPath } }
  }
  
  if (meta.requiresSdkAccess && role === "tenant_admin" && !sdkApiAccess) {
    return "/admin/repository"
  }
  
  // Allow access
  return true
})

router.afterEach((to) => {
  if (typeof document === "undefined") return
  const metaTitle = typeof (to.meta as RouteMetaConfig).title === "string"
    ? String((to.meta as RouteMetaConfig).title)
    : ""
  const resolvedTitle = resolveRouteTitle(to.path, to.query)
  const title = resolvedTitle || metaTitle
  applyRouteSeo(to, getAdminDocumentTitle(title))
})
