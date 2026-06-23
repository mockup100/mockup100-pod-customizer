import type { LocationQuery, RouteLocationRaw } from "vue-router"
import { buildAdminTenantRoute, readAdminTenantContextWithStorage } from "../pages/admin/adminTenantContext"

export type AdminNavigationItem = {
  key: string
  to: RouteLocationRaw
  label: string
  icon: string
  description: string
  badge?: string
}

export type AdminNavigationSection = {
  key: string
  title: string
  items: AdminNavigationItem[]
}

export const ADMIN_NAV_I18N = {
  en: {
    dashboard: "Dashboard",
    platformOverview: "Platform overview",
    templateLibrary: "Template Library",
    templateCenter: "Template Center",
    artworkLibrary: "Artwork Library",
    artworkLibraryAdminDesc: "Curate shared platform artwork assets",
    artworkLibraryTenantDesc: "Manage tenant artwork for preview and design",
    repositoryAdminDesc: "Manage the shared template library and runtime assets",
    repositoryTenantDesc: "Manage templates in your tenant library workspace",
    artworkCenter: "Artwork Center",
    artworkCenterAdminDesc: "Review artwork submissions and maintain listed artwork",
    artworkCenterTenantDesc: "Track artwork review status and listed artwork availability",
    templateCenterAdminDesc: "Review template submissions and maintain listed templates",
    templateCenterTenantDesc: "Submit templates for review and track listing status",
    ordersDesc: "Template order timeline and settlement review",
    artworkOrders: "Artwork Orders",
    artworkOrdersDesc: "Artwork sales ledger and purchase review",
    tenantBilling: "Tenant Billing",
    tenantBillingDesc: "Template ledger, invoices, and settlement",
    artworkBilling: "Artwork Billing",
    artworkBillingDesc: "Artwork earnings, commissions, and payout readiness",
    tokens: "Tokens",
    tokensDesc: "Token balance, packs, and billing rules",
    keysAccess: "Keys & Access",
    keysAccessDesc: "API keys, scopes, and access readiness",
    usageActivity: "Usage & Activity",
    usageActivityDesc: "Trusted events, charges, and troubleshooting",
    docsFlow: "Docs & Flow",
    docsFlowDesc: "Integration path, boundaries, and delivery gaps",
    templateCategories: "Template Categories",
    templateCategoriesDesc: "Manage template categories",
    artworkCategories: "Artwork Categories",
    artworkCategoriesDesc: "Manage artwork categories",
    tenants: "Tenants",
    tenantsDesc: "Manage tenants",
    permissions: "Permissions",
    permissionsDesc: "Grant/revoke WP Pro & Grading subscriptions",
    offlineOrders: "Offline Orders",
    offlineOrdersDesc: "Record offline payments and confirm token credit",
    auditLog: "Audit Log",
    auditLogDesc: "Admin operations history",
    storefrontReview: "Creative Space Review",
    storefrontStudio: "Creative Space",
    storefrontReviewDesc: "Review tenant creative space submissions and feature approved spaces on the home page",
    storefrontStudioDesc: "Shape creative space identity, preview entry points, and catalog visibility",
    account: "Account",
    accountDesc: "Profile and password",
    overview: "Overview",
    libraries: "Libraries",
    publishing: "Publishing",
    orders: "Orders",
    finance: "Finance",
    storefront: "Creative Space",
    developer: "Developer",
    administration: "Administration",
    accountSection: "Account",
  },
  zh: {
    dashboard: "仪表盘",
    platformOverview: "平台概览",
    templateLibrary: "模板库",
    templateCenter: "模板中心",
    artworkLibrary: "作品库",
    artworkLibraryAdminDesc: "管理平台共享作品素材",
    artworkLibraryTenantDesc: "管理租户作品素材用于预览与设计",
    repositoryAdminDesc: "管理共享模板库与运行时资源",
    repositoryTenantDesc: "管理租户工作区中的模板",
    artworkCenter: "作品中心",
    artworkCenterAdminDesc: "审核作品投稿并维护已上架作品",
    artworkCenterTenantDesc: "跟踪作品审核状态与上架可用性",
    templateCenterAdminDesc: "审核模板投稿并维护已上架模板",
    templateCenterTenantDesc: "提交模板审核并跟踪上架状态",
    ordersDesc: "模板订单时间线与结算复核",
    artworkOrders: "作品订单",
    artworkOrdersDesc: "作品销售台账与购买记录",
    tenantBilling: "租户账单",
    tenantBillingDesc: "模板台账、发票与结算",
    artworkBilling: "作品结算",
    artworkBillingDesc: "作品收益、分成与打款准备",
    tokens: "令牌",
    tokensDesc: "令牌余额、套餐与计费规则",
    keysAccess: "密钥与访问",
    keysAccessDesc: "API 密钥、权限范围与接入状态",
    usageActivity: "用量与活动",
    usageActivityDesc: "可信事件、费用与排障",
    docsFlow: "文档与流程",
    docsFlowDesc: "集成路径、边界与交付差距",
    templateCategories: "模板分类",
    templateCategoriesDesc: "管理模板分类",
    artworkCategories: "作品分类",
    artworkCategoriesDesc: "管理作品分类",
    tenants: "租户",
    tenantsDesc: "管理租户",
    permissions: "权限管理",
    permissionsDesc: "开通/撤销 WP Pro 与 Grading 订阅",
    offlineOrders: "线下订单",
    offlineOrdersDesc: "录入线下收款并确认令牌入账",
    auditLog: "审计日志",
    auditLogDesc: "管理员操作记录",
    storefrontReview: "创作空间审核",
    storefrontStudio: "创作空间",
    storefrontReviewDesc: "审核租户创作空间投稿并在首页展示已批准空间",
    storefrontStudioDesc: "配置创作空间形象、预览入口与目录可见性",
    account: "账户",
    accountDesc: "资料与密码",
    overview: "概览",
    libraries: "素材库",
    publishing: "发布",
    orders: "订单",
    finance: "财务",
    storefront: "创作空间",
    developer: "开发者",
    administration: "管理",
    accountSection: "账户",
  },
} as const

export function adminNavT(locale: "en" | "zh", key: keyof typeof ADMIN_NAV_I18N.en) {
  return ADMIN_NAV_I18N[locale][key] || ADMIN_NAV_I18N.en[key]
}

export function buildAdminNavigationSections(options: {
  locale: "en" | "zh"
  role?: string
  query: LocationQuery
}): AdminNavigationSection[] {
  const isAdmin = options.role === "platform_admin"
  const context = readAdminTenantContextWithStorage(options.query)
  const tenantScopedKeys = new Set([
    "billing",
    "orders-management",
    "artwork-billing",
    "artwork-orders",
    "artworks",
    "artwork-center",
    "storefront",
  ])
  const withTenantContext = (key: string, path: string): RouteLocationRaw => {
    if (isAdmin && tenantScopedKeys.has(key) && context.tenantId) {
      return buildAdminTenantRoute(path, context.tenantId, context.tenantLabel)
    }
    return path
  }

  const t = (key: keyof typeof ADMIN_NAV_I18N.en) => adminNavT(options.locale, key)

  const overviewItems: AdminNavigationItem[] = [
    { key: "dashboard", to: "/admin/dashboard", label: t("dashboard"), icon: "📊", description: t("platformOverview") },
  ]

  const catalogItems: AdminNavigationItem[] = [
    {
      key: "repository",
      to: "/admin/repository",
      label: t("templateLibrary"),
      icon: "📚",
      description: isAdmin ? t("repositoryAdminDesc") : t("repositoryTenantDesc"),
    },
    {
      key: "artworks",
      to: withTenantContext("artworks", isAdmin ? "/admin/artworks/platform" : "/admin/artworks/tenant"),
      label: t("artworkLibrary"),
      icon: "🖼️",
      description: isAdmin ? t("artworkLibraryAdminDesc") : t("artworkLibraryTenantDesc"),
    },
  ]

  const publishingItems: AdminNavigationItem[] = [
    {
      key: "center",
      to: "/admin/center",
      label: t("templateCenter"),
      icon: "🛒",
      description: isAdmin ? t("templateCenterAdminDesc") : t("templateCenterTenantDesc"),
    },
    {
      key: "artwork-center",
      to: withTenantContext("artwork-center", "/admin/artworks/center"),
      label: t("artworkCenter"),
      icon: "🎨",
      description: isAdmin ? t("artworkCenterAdminDesc") : t("artworkCenterTenantDesc"),
    },
  ]

  const orderItems: AdminNavigationItem[] = [
    {
      key: "orders-management",
      to: withTenantContext("orders-management", "/admin/orders-management"),
      label: t("orders"),
      icon: "🧾",
      description: t("ordersDesc"),
    },
    {
      key: "artwork-orders",
      to: withTenantContext("artwork-orders", "/admin/artwork-orders"),
      label: t("artworkOrders"),
      icon: "🛍️",
      description: t("artworkOrdersDesc"),
    },
  ]

  const financeItems: AdminNavigationItem[] = [
    {
      key: "billing",
      to: withTenantContext("billing", "/admin/billing"),
      label: t("tenantBilling"),
      icon: "💳",
      description: t("tenantBillingDesc"),
    },
    {
      key: "artwork-billing",
      to: withTenantContext("artwork-billing", "/admin/artwork-billing"),
      label: t("artworkBilling"),
      icon: "🖼️",
      description: t("artworkBillingDesc"),
    },
    { key: "tokens-management", to: "/admin/tokens-management", label: t("tokens"), icon: "🪙", description: t("tokensDesc") },
  ]

  const developerItems: AdminNavigationItem[] = [
    { key: "developer-keys-access", to: "/admin/developer-console/keys-access", label: t("keysAccess"), icon: "🔑", description: t("keysAccessDesc") },
    { key: "developer-usage-activity", to: "/admin/developer-console/usage-activity", label: t("usageActivity"), icon: "📈", description: t("usageActivityDesc") },
    { key: "developer-docs-flow", to: "/admin/developer-console/docs-flow", label: t("docsFlow"), icon: "🧾", description: t("docsFlowDesc") },
  ]

  const governanceItems: AdminNavigationItem[] = isAdmin
    ? [
        { key: "categories", to: "/admin/categories", label: t("templateCategories"), icon: "🏷️", description: t("templateCategoriesDesc") },
        { key: "artwork-categories", to: "/admin/artwork-categories", label: t("artworkCategories"), icon: "🖌️", description: t("artworkCategoriesDesc") },
        { key: "tenants", to: "/admin/tenants", label: t("tenants"), icon: "👥", description: t("tenantsDesc") },
        { key: "permissions", to: "/admin/permissions", label: t("permissions"), icon: "🔐", description: t("permissionsDesc") },
        { key: "offline-orders", to: "/admin/offline-orders", label: t("offlineOrders"), icon: "🧾", description: t("offlineOrdersDesc") },
        { key: "audit-logs", to: "/admin/audit-logs", label: t("auditLog"), icon: "📜", description: t("auditLogDesc") },
      ]
    : []

  const storefrontItems: AdminNavigationItem[] = [
    {
      key: "storefront",
      to: withTenantContext("storefront", "/admin/storefront"),
      label: isAdmin ? t("storefrontReview") : t("storefrontStudio"),
      icon: "🏪",
      description: isAdmin ? t("storefrontReviewDesc") : t("storefrontStudioDesc"),
    },
  ]

  const accountItems: AdminNavigationItem[] = [
    { key: "settings", to: "/admin/settings", label: t("account"), icon: "⚙️", description: t("accountDesc") },
  ]
  // 0.4.52 仅平台管理员可见 PayPal 收款配置(只读诊断),挂在 Account section 下
  if (isAdmin) {
    accountItems.push({
      key: "billing-paypal",
      to: "/admin/billing/paypal",
      label: options.locale === "zh" ? "PayPal 收款配置" : "PayPal Receivables",
      icon: "💸",
      description: options.locale === "zh" ? "查看与诊断 PayPal 凭证(只读)" : "Read-only diagnostics for PayPal credentials",
    })
  }

  const sections: AdminNavigationSection[] = [
    { key: "overview", title: t("overview"), items: overviewItems },
    { key: "catalog", title: t("libraries"), items: catalogItems },
    { key: "publishing", title: t("publishing"), items: publishingItems },
    { key: "orders", title: t("orders"), items: orderItems },
    { key: "finance", title: t("finance"), items: financeItems },
    { key: "storefront", title: t("storefront"), items: storefrontItems },
    { key: "developer", title: t("developer"), items: developerItems },
  ]

  if (governanceItems.length) {
    sections.push({ key: "governance", title: t("administration"), items: governanceItems })
  }
  sections.push({ key: "account", title: t("accountSection"), items: accountItems })

  return sections.filter((section) => section.items.length > 0)
}
