import type { RouteRecordRaw } from "vue-router"
import type { ErpModuleDefinition } from "../types"
import { createErpModuleDefinition } from "../utils"

export const erpEntryPage = () => import("./ErpEntryPage.vue")
export const erpGalleryPage = () => import("./ErpGalleryPage.vue")
export const erpProductsPage = () => import("./ErpProductsPage.vue")
export const erpDesignPage = () => import("./ErpDesignPage.vue")
export const erpOrdersPage = () => import("./ErpOrdersPage.vue")
export const erpListingsPage = () => import("./ErpListingsPage.vue")
export const erpAppsPage = () => import("./ErpAppsPage.vue")
export const erpReportsPage = () => import("./ErpReportsPage.vue")
export const erpSettingsPage = () => import("./ErpSettingsPage.vue")
export const supplierShellPage = () => import("./SupplierShellPage.vue")
export const supplierWorkspacePage = () => import("./SupplierWorkspacePage.vue")

const ERP_ROUTE_META = {
  requiresAuth: true,
  roles: ["platform_admin", "tenant_admin"],
  requiresTenant: true,
  hideShellNavbar: false,
  hideShellFooter: false,
} as const

function createErpPageRoute(
  path: string,
  name: string,
  component: RouteRecordRaw["component"],
  title: string,
): RouteRecordRaw {
  const pageComponent = component as Exclude<RouteRecordRaw["component"], undefined | null>
  return {
    path,
    component: erpEntryPage,
    meta: ERP_ROUTE_META,
    children: [
      {
        path: "",
        name,
        component: pageComponent,
        meta: { title },
      },
    ],
  }
}

export const erpModuleDefinitions: ErpModuleDefinition[] = [
  createErpModuleDefinition({
    code: "gallery",
    name: "素材中心",
    path: "/erp/gallery",
  }),
  createErpModuleDefinition({
    code: "products",
    name: "商品管理",
    path: "/erp/products",
  }),
  createErpModuleDefinition({
    code: "design",
    name: "设计中心",
    path: "/erp/design",
  }),
  createErpModuleDefinition({
    code: "orders",
    name: "订单管理",
    path: "/erp/orders",
  }),
  createErpModuleDefinition({
    code: "listings",
    name: "刊登管理",
    path: "/erp/listings",
  }),
  createErpModuleDefinition({
    code: "apps",
    name: "应用市场",
    path: "/erp/apps",
  }),
  createErpModuleDefinition({
    code: "reports",
    name: "报表导出",
    path: "/erp/reports",
  }),
  createErpModuleDefinition({
    code: "settings",
    name: "基础设置",
    path: "/erp/settings",
  }),
]

export const erpPageRoutes: RouteRecordRaw[] = [
  createErpPageRoute("/erp/gallery", "erp-gallery", erpGalleryPage, "Gallery"),
  createErpPageRoute("/erp/products", "erp-products", erpProductsPage, "Products"),
  createErpPageRoute("/erp/design", "erp-design", erpDesignPage, "Design"),
  createErpPageRoute("/erp/orders", "erp-orders", erpOrdersPage, "Orders"),
  createErpPageRoute("/erp/listings", "erp-listings", erpListingsPage, "Listings"),
  createErpPageRoute("/erp/apps", "erp-apps", erpAppsPage, "Apps"),
  createErpPageRoute("/erp/reports", "erp-reports", erpReportsPage, "Reports"),
  createErpPageRoute("/erp/settings", "erp-settings", erpSettingsPage, "Settings"),
  {
    path: "/erp/supplier",
    component: supplierShellPage,
    meta: {
      requiresAuth: true,
      roles: ["platform_admin", "tenant_admin"],
      requiresTenant: true,
      hideShellNavbar: false,
      hideShellFooter: true,
    },
    children: [
      {
        path: "",
        name: "supplier-apply",
        component: supplierWorkspacePage,
        meta: { title: "Supplier Apply" },
      },
      {
        path: "company",
        redirect: "/erp/supplier",
      },
      {
        path: "draft",
        redirect: "/erp/supplier/company",
      },
      {
        path: "submitted",
        redirect: "/erp/supplier/company",
      },
      {
        path: "product/add",
        name: "supplier-product-add",
        component: supplierWorkspacePage,
        meta: { title: "Supplier Product Add" },
      },
      {
        path: "product/list",
        name: "supplier-product-list",
        component: supplierWorkspacePage,
        meta: { title: "Supplier Product List" },
      },
      {
        path: "audit",
        redirect: "/erp/supplier",
      },
      {
        path: "audit/suppliers",
        redirect: "/erp/supplier",
      },
      {
        path: "audit/products",
        redirect: "/erp/supplier/product/list",
      },
    ],
  },
]
