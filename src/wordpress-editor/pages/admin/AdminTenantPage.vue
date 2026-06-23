<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { usePlatformStore } from "../../stores/platform"
import { useAuthStore } from "../../stores/auth"
import { useArtworkStore } from "../../stores/artworks"
import { useUiLocaleStore } from "../../stores/uiLocale"
import PaginationBar from "../../components/PaginationBar.vue"
import { getVolumeTierLabel } from "../../utils/billingModel"
import { clampPage, paginateItems, resolveTotalPages } from "../../utils/pagination"
import { buildAdminTenantRoute, readAdminTenantContext } from "./adminTenantContext"

const platformStore = usePlatformStore()
const authStore = useAuthStore()
const artworkStore = useArtworkStore()
const uiLocaleStore = useUiLocaleStore()
const route = useRoute()
const router = useRouter()

const { tenant, tenants, usage, billingEvents, tenantSubscription, tenantEntitlements, submissions, creatorEarnings, billingOrders } = storeToRefs(platformStore)

const email = ref("")
const planCode = ref("")
const quotaTotal = ref(0)
const status = ref("active")
const billingCycle = ref<"trial" | "monthly" | "yearly" | "usage">("usage")
const subscriptionStatus = ref<"inactive" | "trialing" | "active" | "expired" | "cancelled" | "paused">("inactive")
const currentPeriodStartsAt = ref("")
const currentPeriodEndsAt = ref("")
const topUpTokens = ref(1000)
const topUpAmountCents = ref(2000)
const topUpNote = ref("")
const selectedTenantId = ref("")
const switchingTenant = ref(false)
const storefrontFeatureBusy = ref(false)
const storefrontReviewBusy = ref(false)
const storefrontSortOrder = ref(999)
const storefrontReviewNote = ref("")
const storefrontActionNotice = ref("")
const storefrontActionError = ref("")
const artworkSubmissions = ref<Array<{ submission_id: string; artwork_id?: string; artwork_name?: string; status: string; created_at: string }>>([])
const artworkPurchases = ref<Array<Record<string, unknown>>>([])
const tenantDirectoryPage = ref(1)
const submissionActivityPage = ref(1)
const recentActivityPage = ref(1)
const TENANT_DIRECTORY_PAGE_SIZE = 12
const TENANT_ACTIVITY_PAGE_SIZE = 6

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const billingCycleOptions: Array<{ value: "trial" | "monthly" | "yearly" | "usage"; label: string }> = [
  { value: "usage", label: localize("Usage", "按量") },
  { value: "monthly", label: localize("Monthly", "月付") },
  { value: "yearly", label: localize("Yearly", "年付") },
  { value: "trial", label: localize("Trial", "试用") },
]

const tenantStatusOptions = [
  { value: "active", label: localize("Active", "启用") },
  { value: "paused", label: localize("Paused", "暂停") },
  { value: "cancelled", label: localize("Cancelled", "已取消") },
]

const subscriptionStatusOptions: Array<{ value: "inactive" | "trialing" | "active" | "expired" | "cancelled" | "paused"; label: string }> = [
  { value: "trialing", label: localize("Trialing", "试用中") },
  { value: "active", label: localize("Active", "启用") },
  { value: "paused", label: localize("Paused", "暂停") },
  { value: "expired", label: localize("Expired", "已过期") },
  { value: "cancelled", label: localize("Cancelled", "已取消") },
  { value: "inactive", label: localize("Inactive", "未启用") },
]

const isPlatformAdmin = computed(() => authStore.isPlatformAdmin)
const currentTenantId = computed(() => selectedTenantId.value || tenant.value?.tenant_id || authStore.tenant?.tenant_id || "")
const tenantContext = computed(() => readAdminTenantContext(route.query))
const currentTenantLabel = computed(() => {
  const activeTenant = tenantDirectory.value.find((item) => item.id === currentTenantId.value)
  return activeTenant?.name || tenant.value?.name || tenant.value?.email || tenantContext.value.tenantLabel || currentTenantId.value
})
const storefrontPublicUrl = computed(() => {
  if (!tenant.value?.store_slug || tenant.value?.store_status !== "approved") return ""
  return `/store/${encodeURIComponent(String(tenant.value.store_slug))}`
})
const storefrontPreviewUrl = computed(() => {
  if (!tenant.value?.store_slug) return ""
  const query = new URLSearchParams({
    admin_view: "1",
  })
  if (currentTenantId.value) {
    query.set("tenant_id", currentTenantId.value)
  }
  if (currentTenantLabel.value) {
    query.set("tenant_label", currentTenantLabel.value)
  }
  return `/store/${encodeURIComponent(String(tenant.value.store_slug))}?${query.toString()}`
})
const artworkCenterRoute = computed(() =>
  isPlatformAdmin.value ? buildAdminTenantRoute("/admin/artworks/center", currentTenantId.value, currentTenantLabel.value) : "/admin/artworks/center",
)
const templateCenterRoute = computed(() =>
  isPlatformAdmin.value ? buildAdminTenantRoute("/admin/center", currentTenantId.value, currentTenantLabel.value) : "/admin/center",
)
const tokenBalance = computed(() => tenantEntitlements.value?.token_balance ?? tenant.value?.token_balance ?? usage.value?.remaining ?? 0)
const publishLimit = computed(() => Number(tenant.value?.quota_total ?? quotaTotal.value ?? 0))
const volumeTierLabel = computed(() => getVolumeTierLabel(tenantEntitlements.value?.volume_discount_tier))
const verificationLabel = computed(() => {
  const statusValue = String(tenant.value?.verification_status || "pending").trim().toLowerCase()
  if (statusValue === "verified") return localize("Verified", "已验证")
  if (statusValue === "pending_verification") return localize("Pending Verification", "待验证")
  if (!statusValue) return localize("Pending", "待处理")
  return statusValue.replace(/_/g, " ")
})

const summaryCards = computed(() => {
  const items = [
    {
      label: localize("Current Tokens", "当前 Tokens"),
      value: String(tokenBalance.value),
      helper: usage.value ? localize(`${usage.value.quota_used} used / ${usage.value.quota_total} tracked`, `已使用 ${usage.value.quota_used} / 已追踪 ${usage.value.quota_total}`) : localize("Ready", "正常"),
    },
    {
      label: localize("Plan", "套餐"),
      value: tenant.value?.plan_code || planCode.value || "trial",
      helper: tenantSubscription.value?.billing_cycle ? tenantSubscription.value.billing_cycle : localize("Not set", "未设置"),
    },
    {
      label: localize("Subscription", "订阅"),
      value: tenantSubscription.value?.status || tenant.value?.subscription_status || subscriptionStatus.value,
      helper: tenantSubscription.value?.current_period_ends_at || localize("No period end", "无周期结束时间"),
    },
    {
      label: localize("Published Limit", "发布上限"),
      value: String(publishLimit.value),
      helper: tenantEntitlements.value?.template_publish_access ? localize("Enabled", "已启用") : localize("Disabled", "已禁用"),
    },
  ]
  return items
})

const overviewItems = computed(() => {
  if (!tenant.value) return []
  return [
    { label: localize("Tenant Name", "租户名称"), value: tenant.value.name || localize("Unnamed tenant", "未命名租户") },
    { label: localize("Owner Email", "拥有者邮箱"), value: tenant.value.email || "-" },
    { label: localize("Tenant ID", "租户 ID"), value: tenant.value.tenant_id || "-", code: true },
    { label: localize("Account Status", "账户状态"), value: tenant.value.status || status.value || "active" },
    { label: localize("Billing Cycle", "计费周期"), value: tenantSubscription.value?.billing_cycle || tenant.value.billing_cycle || billingCycle.value || "usage" },
    { label: localize("Subscription Status", "订阅状态"), value: tenantSubscription.value?.status || tenant.value.subscription_status || subscriptionStatus.value || "inactive" },
    { label: localize("Verification", "验证状态"), value: verificationLabel.value, helper: tenant.value.verified_at || localize("Not verified yet", "尚未验证") },
    { label: localize("Volume Tier", "体量等级"), value: volumeTierLabel.value },
  ]
})

const storefrontStatusLabel = computed(() => {
  const statusValue = String(tenant.value?.store_status || "draft")
  if (statusValue === "approved") return localize("Approved", "已通过")
  if (statusValue === "pending_review") return localize("Pending Review", "等待审核")
  if (statusValue === "rejected") return localize("Rejected", "已拒绝")
  return localize("Draft", "草稿")
})

const storefrontFeatureLabel = computed(() => {
  return tenant.value?.storefront_featured ? localize("Featured On Home", "首页精选中") : localize("Not Featured", "未精选")
})

const storefrontFeatureBlockedMessage = computed(() => {
  if (tenant.value?.store_status !== "approved") {
    return localize("Requires an approved creative space before featuring on home.", "需先有已通过审核的创作空间才能设为首页精选。")
  }
  if (!tenant.value?.store_slug) {
    return localize("Requires a creative space slug before featuring on home.", "需先设置创作空间 slug 才能设为首页精选。")
  }
  return localize("Approved creative space can be featured.", "已通过审核的创作空间可设为首页精选。")
})

const canFeatureStorefront = computed(() => {
  return Boolean(tenant.value?.store_status === "approved" && tenant.value?.store_slug)
})
const canReviewStorefront = computed(() => tenant.value?.store_status === "pending_review")
const rejectReviewBlockedMessage = computed(() => {
  if (!canReviewStorefront.value) return localize("Creative space is not waiting for review.", "创作空间当前不在等待审核。")
  if (storefrontReviewBusy.value) return localize("Saving review decision...", "正在保存审核决定...")
  if (!storefrontReviewNote.value.trim()) return localize("Add a review note before rejecting this creative space.", "拒绝该创作空间前请填写审核备注。")
  return ""
})
const storefrontReviewSummary = computed(() => {
  if (tenant.value?.store_status === "approved") {
    return tenant.value?.store_reviewed_at
      ? localize(`Approved at ${tenant.value.store_reviewed_at}`, `已于 ${tenant.value.store_reviewed_at} 通过审核`)
      : localize("Approved creative space. It can now be featured on the home page.", "创作空间已通过审核，现在可设置首页精选。")
  }
  if (tenant.value?.store_status === "rejected") {
    return tenant.value?.store_review_note || localize("Rejected creative space. Tenant must update and resubmit.", "创作空间已被拒绝，租户需修改后重新提交。")
  }
  if (tenant.value?.store_status === "pending_review") {
    return tenant.value?.store_submitted_at
      ? localize(`Submitted at ${tenant.value.store_submitted_at}`, `已于 ${tenant.value.store_submitted_at} 提交`)
      : localize("Waiting for platform review.", "等待平台审核。")
  }
  return localize("Draft creative space. Tenant needs to submit it for review first.", "创作空间当前为草稿，租户需先提交后才能审核。")
})

const tenantDirectory = computed(() => {
  return tenants.value.map((item) => ({
    id: item.tenant_id,
    name: item.name || item.email || item.tenant_id,
    email: item.email,
    plan: item.plan_code,
    status: item.status,
    tokens: Number(item.token_balance || 0),
  }))
})

const recentActivity = computed(() => {
  return billingEvents.value.slice(0, 5).map((item) => ({
    id: item.billing_event_id,
    title: item.event_type.replace(/_/g, " "),
    tokens: Number(item.meta?.tokens || item.meta?.tokens_used || item.meta?.credit_delta || 0),
    channel: String(item.meta?.channel || "console"),
    createdAt: item.created_at,
    note: String(item.meta?.pricing_rule || item.meta?.note || item.status || ""),
  }))
})

const tenantCommerceOrders = computed(() => billingOrders.value.map((item) => {
  const meta = (item.meta || {}) as Record<string, unknown>
  return {
    ...item,
    resource_type: String(meta.resource_type || item.resource_type || "").toLowerCase(),
    resource_name: String(meta.resource_name || meta.artwork_name || item.item_name || ""),
  }
}))

const templateSubmissionStats = computed(() => ({
  total: submissions.value.length,
  pending: submissions.value.filter((item) => item.status === "pending").length,
  approved: submissions.value.filter((item) => item.status === "approved").length,
  rejected: submissions.value.filter((item) => item.status === "rejected").length,
}))

const artworkSubmissionStats = computed(() => ({
  total: artworkSubmissions.value.length,
  pending: artworkSubmissions.value.filter((item) => item.status === "pending").length,
  approved: artworkSubmissions.value.filter((item) => item.status === "approved").length,
  rejected: artworkSubmissions.value.filter((item) => item.status === "rejected").length,
}))

const templateOrderStats = computed(() => ({
  total: tenantCommerceOrders.value.filter((item) => item.resource_type === "template").length,
  paid: tenantCommerceOrders.value.filter((item) => item.resource_type === "template" && item.payment_status === "paid").length,
}))

const artworkOrderStats = computed(() => ({
  total: artworkPurchases.value.length,
  paid: artworkPurchases.value.filter((item) => String(item.status || "") === "completed").length,
}))

const creatorCommerceCards = computed(() => [
  {
    label: localize("Template Earnings", "模板收益"),
    value: formatTokenAmount(creatorEarnings.value?.template_commission_tokens),
    helper: localize(
      `${creatorEarnings.value?.template_record_count || 0} template commission records`,
      `${creatorEarnings.value?.template_record_count || 0} 条模板分成记录`,
    ),
  },
  {
    label: localize("Artwork Earnings", "作品收益"),
    value: formatTokenAmount(creatorEarnings.value?.artwork_commission_tokens),
    helper: localize(
      `${creatorEarnings.value?.artwork_record_count || 0} artwork commission records`,
      `${creatorEarnings.value?.artwork_record_count || 0} 条作品分成记录`,
    ),
  },
  {
    label: localize("Orders", "订单"),
    value: String(templateOrderStats.value.total),
    helper: localize(
      `${templateOrderStats.value.paid} paid orders`,
      `${templateOrderStats.value.paid} 个已支付订单`,
    ),
  },
  {
    label: localize("Artwork Sales", "作品销售"),
    value: String(artworkOrderStats.value.total),
    helper: localize(
      `${artworkOrderStats.value.paid} completed artwork sales`,
      `${artworkOrderStats.value.paid} 笔已完成作品销售`,
    ),
  },
])

const workflowCards = computed(() => [
  {
    lane: localize("Template Workflow", "模板流程"),
    total: templateSubmissionStats.value.total,
    pending: templateSubmissionStats.value.pending,
    approved: templateSubmissionStats.value.approved,
    ctaLabel: localize("Open Template Center", "打开模板中心"),
    ctaTo: templateCenterRoute.value,
  },
  {
    lane: localize("Artwork Workflow", "作品流程"),
    total: artworkSubmissionStats.value.total,
    pending: artworkSubmissionStats.value.pending,
    approved: artworkSubmissionStats.value.approved,
    ctaLabel: localize("Open Artwork Center", "打开作品中心"),
    ctaTo: artworkCenterRoute.value,
  },
])

const recentSubmissionActivity = computed(() => {
  const templateItems = submissions.value.slice(0, 3).map((item) => ({
    id: item.submission_id,
    lane: localize("Template", "模板"),
    title: item.title,
    status: item.status,
    createdAt: item.created_at,
  }))
  const artworkItems = artworkSubmissions.value.slice(0, 3).map((item) => ({
    id: item.submission_id,
    lane: localize("Artwork", "作品"),
    title: item.artwork_name || item.artwork_id || item.submission_id,
    status: item.status,
    createdAt: item.created_at,
  }))
  return [...templateItems, ...artworkItems]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 6)
})
const tenantDirectoryTotalPages = computed(() => resolveTotalPages(tenantDirectory.value.length, TENANT_DIRECTORY_PAGE_SIZE))
const submissionActivityTotalPages = computed(() => resolveTotalPages(recentSubmissionActivity.value.length, TENANT_ACTIVITY_PAGE_SIZE))
const recentActivityTotalPages = computed(() => resolveTotalPages(recentActivity.value.length, TENANT_ACTIVITY_PAGE_SIZE))
const paginatedTenantDirectory = computed(() => paginateItems(tenantDirectory.value, tenantDirectoryPage.value, TENANT_DIRECTORY_PAGE_SIZE))
const paginatedSubmissionActivity = computed(() => paginateItems(recentSubmissionActivity.value, submissionActivityPage.value, TENANT_ACTIVITY_PAGE_SIZE))
const paginatedRecentActivity = computed(() => paginateItems(recentActivity.value, recentActivityPage.value, TENANT_ACTIVITY_PAGE_SIZE))

watch(() => tenantDirectory.value.length, () => {
  tenantDirectoryPage.value = clampPage(tenantDirectoryPage.value, tenantDirectoryTotalPages.value)
})
watch(() => recentSubmissionActivity.value.length, () => {
  submissionActivityPage.value = clampPage(submissionActivityPage.value, submissionActivityTotalPages.value)
})
watch(() => recentActivity.value.length, () => {
  recentActivityPage.value = clampPage(recentActivityPage.value, recentActivityTotalPages.value)
})

function formatTokenAmount(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "0"
  return amount.toFixed(4).replace(/\.?0+$/, "")
}

function syncFormFromLoadedTenant() {
  email.value = tenant.value?.email || authStore.account?.email || ""
  planCode.value = tenantSubscription.value?.plan_code || tenant.value?.plan_code || ""
  quotaTotal.value = Number(tenant.value?.quota_total || 0)
  status.value = tenant.value?.status || "active"
  billingCycle.value = tenantSubscription.value?.billing_cycle || (tenant.value?.billing_cycle as typeof billingCycle.value) || "usage"
  subscriptionStatus.value = tenantSubscription.value?.status || (tenant.value?.subscription_status as typeof subscriptionStatus.value) || "inactive"
  currentPeriodStartsAt.value = tenantSubscription.value?.current_period_starts_at || ""
  currentPeriodEndsAt.value = tenantSubscription.value?.current_period_ends_at || ""
  storefrontSortOrder.value = Number(tenant.value?.storefront_sort_order ?? 999)
}

watch([tenant, tenantSubscription], () => {
  syncFormFromLoadedTenant()
}, { immediate: true })

watch(tenant, (currentTenant) => {
  storefrontActionNotice.value = ""
  storefrontActionError.value = ""
  storefrontReviewNote.value = currentTenant?.store_status === "rejected"
    ? String(currentTenant.store_review_note || "")
    : ""
})

async function loadTenantData(tenantId = currentTenantId.value) {
  if (!tenantId) return
  const templateSubmissionPromise = platformStore.loadSubmissions({ auth: authStore.authHeaders, tenantId })
  const artworkSubmissionPromise = artworkStore.listArtworkSubmissions({ tenantId, limit: 100 })
  const artworkPurchasePromise = artworkStore.listPurchaseRecords({ tenantId, role: "seller", limit: 100 })
  await Promise.all([
    platformStore.loadTenant(tenantId, "", "", authStore.authHeaders),
    platformStore.loadTenantSubscription(tenantId, "", "", authStore.authHeaders),
    platformStore.loadUsage(tenantId, "", "", authStore.authHeaders),
    platformStore.loadBillingEvents({ auth: authStore.authHeaders, tenantId, limit: 5 }),
    platformStore.loadCreatorEarnings({ auth: authStore.authHeaders, tenantId }),
    platformStore.loadBillingOrders({ auth: authStore.authHeaders, tenantId, limit: 100 }),
    templateSubmissionPromise,
    artworkSubmissionPromise,
    artworkPurchasePromise,
  ])
  artworkSubmissions.value = (await artworkSubmissionPromise) as typeof artworkSubmissions.value
  artworkPurchases.value = await artworkPurchasePromise
}

async function initializePage() {
  if (isPlatformAdmin.value) {
    await platformStore.loadTenants(authStore.authHeaders)
    const routeTenantId = typeof route.query.tenant_id === "string" ? route.query.tenant_id : ""
    const fallbackTenantId = routeTenantId || tenants.value[0]?.tenant_id || authStore.tenant?.tenant_id || ""
    selectedTenantId.value = fallbackTenantId
    if (fallbackTenantId) {
      await loadTenantData(fallbackTenantId)
    }
    return
  }

  selectedTenantId.value = authStore.tenant?.tenant_id || ""
  await loadTenantData(selectedTenantId.value)
}

async function handleTenantChange(tenantId: string) {
  if (!tenantId || tenantId === currentTenantId.value) return
  switchingTenant.value = true
  try {
    selectedTenantId.value = tenantId
    const nextTenantLabel = tenantDirectory.value.find((item) => item.id === tenantId)?.name || tenantId
    await router.replace({
      query: {
        ...route.query,
        tenant_id: tenantId,
        tenant_label: nextTenantLabel,
      },
    })
    await loadTenantData(tenantId)
  } finally {
    switchingTenant.value = false
  }
}

async function updateSubscription() {
  if (!isPlatformAdmin.value) return
  const tenantId = currentTenantId.value
  if (!tenantId) return
  await platformStore.updateTenantSubscription(tenantId, {
    auth: authStore.authHeaders,
    plan_code: planCode.value,
    billing_cycle: billingCycle.value,
    status: subscriptionStatus.value,
    tenant_status: status.value as "active" | "paused" | "cancelled",
    quota_total: Math.round(quotaTotal.value),
    current_period_starts_at: currentPeriodStartsAt.value || null,
    current_period_ends_at: currentPeriodEndsAt.value || null,
    source: "manual",
  })
  if (isPlatformAdmin.value) {
    await platformStore.loadTenants(authStore.authHeaders)
  }
}

async function applyTokenTopUp() {
  const tenantId = currentTenantId.value
  if (!tenantId) return
  await platformStore.createTokenTopUp({
    auth: authStore.authHeaders,
    tenant_id: isPlatformAdmin.value ? tenantId : undefined,
    tokens: topUpTokens.value,
    amount_cents: topUpAmountCents.value,
    note: topUpNote.value || `Tenant console top-up: ${topUpTokens.value} tokens`,
  })
  await Promise.all([
    loadTenantData(tenantId),
    authStore.refreshSession(),
    isPlatformAdmin.value ? platformStore.loadTenants(authStore.authHeaders) : Promise.resolve([]),
  ])
}

async function refreshCurrentTenant() {
  await loadTenantData(currentTenantId.value)
  if (isPlatformAdmin.value) {
    await platformStore.loadTenants(authStore.authHeaders)
  }
}

async function toggleStorefrontFeature(featured: boolean) {
  if (!isPlatformAdmin.value || !tenant.value || storefrontFeatureBusy.value) return
  storefrontActionNotice.value = ""
  storefrontActionError.value = ""
  storefrontFeatureBusy.value = true
  try {
    const nextSortOrder = Number.isFinite(storefrontSortOrder.value) ? Math.max(0, Math.trunc(storefrontSortOrder.value)) : 999
    storefrontSortOrder.value = nextSortOrder
    await platformStore.updateTenantStorefrontFeature(
      tenant.value.tenant_id,
      featured,
      nextSortOrder,
      authStore.authHeaders,
    )
    await loadTenantData(tenant.value.tenant_id)
    storefrontActionNotice.value = featured
      ? localize("Creative space featured on the home page.", "创作空间已设为首页精选。")
      : localize("Creative space removed from the home page.", "创作空间已从首页移除。")
  } catch (featureError) {
    storefrontActionError.value = String((featureError as Error)?.message || featureError || localize("Failed to update creative space feature state.", "更新创作空间精选状态失败。"))
  } finally {
    storefrontFeatureBusy.value = false
  }
}

async function reviewStorefront(decision: "approve" | "reject") {
  if (!isPlatformAdmin.value || !tenant.value || storefrontReviewBusy.value || !canReviewStorefront.value) return
  storefrontActionNotice.value = ""
  storefrontActionError.value = ""
  if (decision === "reject" && !storefrontReviewNote.value.trim()) {
    storefrontActionError.value = localize("Add a review note before rejecting this creative space.", "拒绝该创作空间前请填写审核备注。")
    return
  }
  storefrontReviewBusy.value = true
  try {
    await platformStore.reviewTenantStorefront(
      tenant.value.tenant_id,
      decision,
      storefrontReviewNote.value.trim(),
      authStore.authHeaders,
    )
    await loadTenantData(tenant.value.tenant_id)
    storefrontActionNotice.value = decision === "approve"
      ? localize("Storefront approved. It can now be featured on the home page.", "店铺已通过审核，现在可设为首页精选。")
      : localize("Storefront rejected. The tenant must update it and submit again.", "店铺已被拒绝，租户需修改后再次提交。")
    storefrontReviewNote.value = ""
  } catch (reviewError) {
    storefrontActionError.value = String((reviewError as Error)?.message || reviewError || localize("Failed to review storefront.", "审核店铺失败。"))
  } finally {
    storefrontReviewBusy.value = false
  }
}

onMounted(() => {
  initializePage().catch(() => undefined)
})
</script>

<template>
  <div class="tenant-page" data-testid="admin-tenant-page">
    <section class="page-header">
      <div class="header-copy">
        <span class="page-kicker">{{ localize("Admin", "管理") }}</span>
        <h1 class="page-title">{{ localize("Tenant Management", "租户管理") }}</h1>
        <p class="page-subtitle">{{ localize("Review tenant accounts and key workspace settings from one place.", "在一个页面中查看租户账户和关键工作区设置。") }}</p>
      </div>
      <div class="header-actions">
        <RouterLink v-if="authStore.isTenantAdmin" to="/admin/storefront" class="btn-secondary">
          <span class="btn-icon">🏪</span>
          {{ localize("Storefront Manager", "店铺管理") }}
        </RouterLink>
        <RouterLink v-if="authStore.isTenantAdmin" to="/admin/artworks/center" class="btn-secondary">
          <span class="btn-icon">🎨</span>
          {{ localize("Artwork Center", "作品中心") }}
        </RouterLink>
        <RouterLink v-if="authStore.isTenantAdmin" to="/admin/artwork-billing" class="btn-secondary">
          <span class="btn-icon">💳</span>
          {{ localize("Artwork Billing", "作品计费") }}
        </RouterLink>
        <button type="button" class="btn-secondary" data-testid="tenant-refresh-button" @click="refreshCurrentTenant">
          <span class="btn-icon">🔄</span>
          {{ localize("Refresh", "刷新") }}
        </button>
      </div>
    </section>

    <div class="tenant-layout" :class="{ compact: !isPlatformAdmin }">
      <aside v-if="isPlatformAdmin" class="tenant-sidebar">
        <section class="sidebar-card">
          <div class="sidebar-head">
            <div>
              <h2>{{ localize("Tenants", "租户") }}</h2>
              <p>{{ tenantDirectory.length }} {{ localize("accounts", "个账户") }}</p>
            </div>
          </div>
          <div class="tenant-list">
            <button
              v-for="item in paginatedTenantDirectory"
              :key="item.id"
              type="button"
              class="tenant-list-item"
              :class="{ active: item.id === currentTenantId }"
              :disabled="switchingTenant"
              @click="handleTenantChange(item.id)"
            >
              <div class="tenant-list-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.email || item.id }}</span>
              </div>
              <div class="tenant-list-meta">
                <span class="tenant-chip">{{ item.plan || "trial" }}</span>
                <span class="tenant-balance">{{ item.tokens }} {{ localize("tokens", "令牌") }}</span>
              </div>
            </button>
          </div>
          <PaginationBar
            v-if="tenantDirectory.length"
            v-model:current-page="tenantDirectoryPage"
            :total-pages="tenantDirectoryTotalPages"
            :total-items="tenantDirectory.length"
            :page-size="TENANT_DIRECTORY_PAGE_SIZE"
          />
        </section>
      </aside>

      <main class="tenant-main">
        <section class="tenant-card hero-card" v-if="tenant">
          <div class="hero-top">
            <div>
              <span class="hero-badge">{{ tenant.status || "active" }}</span>
              <h2>{{ tenant.name || tenant.email || tenant.tenant_id }}</h2>
              <p>{{ tenant.email }}</p>
            </div>
            <div class="hero-side">
              <span class="hero-side-label">{{ localize("Selected Tenant", "当前租户") }}</span>
              <code>{{ tenant.tenant_id }}</code>
            </div>
          </div>
          <div class="summary-grid">
            <article v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-label">{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <p>{{ card.helper }}</p>
            </article>
          </div>
        </section>

        <section class="tenant-card">
          <div class="card-head">
            <div>
              <h2>{{ localize("Account Overview", "账户概览") }}</h2>
              <p>{{ localize("Core tenant account details.", "租户账户核心信息。") }}</p>
            </div>
          </div>
          <div class="overview-grid" v-if="tenant">
            <article v-for="item in overviewItems" :key="item.label" class="overview-card">
              <span class="overview-label">{{ item.label }}</span>
              <strong :class="{ code: item.code }">{{ item.value }}</strong>
              <p v-if="item.helper">{{ item.helper }}</p>
            </article>
          </div>
        </section>

        <section class="tenant-card">
          <div class="card-head">
            <div>
              <h2>{{ localize("Commerce Mix", "商业构成") }}</h2>
              <p>{{ localize("Template and artwork contribution for the selected tenant.", "当前租户的模板与作品贡献情况。") }}</p>
            </div>
          </div>
          <div class="overview-grid" data-testid="tenant-commerce-mix">
            <article v-for="card in creatorCommerceCards" :key="card.label" class="overview-card">
              <span class="overview-label">{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <p>{{ card.helper }}</p>
            </article>
          </div>
        </section>

        <section class="tenant-card">
          <div class="card-head">
            <div>
              <h2>{{ localize("Submission Workflow", "提交流程") }}</h2>
              <p>{{ localize("Template and artwork review status.", "模板和作品的审核状态。") }}</p>
            </div>
          </div>
          <div class="workflow-grid" data-testid="tenant-workflow-grid">
            <article v-for="item in workflowCards" :key="item.lane" class="workflow-card">
              <span class="overview-label">{{ item.lane }}</span>
              <strong>{{ item.total }}</strong>
              <p>{{ item.pending }} {{ localize("pending", "待处理") }} · {{ item.approved }} {{ localize("approved", "已通过") }}</p>
              <RouterLink class="inline-link" :to="item.ctaTo">{{ item.ctaLabel }}</RouterLink>
            </article>
          </div>
          <div v-if="paginatedSubmissionActivity.length" class="activity-list submission-activity-list">
            <article v-for="item in paginatedSubmissionActivity" :key="`${item.lane}-${item.id}`" class="activity-item">
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.lane }} · {{ item.status }}</p>
              </div>
              <div class="activity-meta">
                <span>{{ item.createdAt }}</span>
              </div>
            </article>
          </div>
          <PaginationBar
            v-if="recentSubmissionActivity.length"
            v-model:current-page="submissionActivityPage"
            :total-pages="submissionActivityTotalPages"
            :total-items="recentSubmissionActivity.length"
            :page-size="TENANT_ACTIVITY_PAGE_SIZE"
          />
        </section>

        <div class="management-grid">
          <section class="tenant-card">
            <div class="card-head">
              <div>
                <h2>{{ localize("Access Profile", "访问配置") }}</h2>
                <p>{{ localize("Core subscription and publish settings.", "核心订阅和发布设置。") }}</p>
              </div>
            </div>
            <div class="card-body">
              <div class="form-grid">
                <label class="form-field">
                  <span>{{ localize("Email", "邮箱") }}</span>
                  <input v-model="email" class="form-input" data-testid="tenant-email-input" :placeholder="localize('Tenant owner email', '租户拥有者邮箱')" disabled />
                </label>
                <label class="form-field">
                  <span>{{ localize("Plan", "套餐") }}</span>
                  <input v-model="planCode" class="form-input" :placeholder="localize('starter_tokens / tokens / enterprise', 'starter_tokens / tokens / enterprise')" :disabled="!isPlatformAdmin" />
                </label>
                <label class="form-field">
                  <span>{{ localize("Published Template Limit", "模板发布上限") }}</span>
                  <input v-model.number="quotaTotal" type="number" min="0" step="1" class="form-input" :disabled="!isPlatformAdmin" />
                </label>
                <label class="form-field">
                  <span>{{ localize("Tenant Status", "租户状态") }}</span>
                  <select v-model="status" class="form-input" :disabled="!isPlatformAdmin">
                    <option v-for="option in tenantStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>{{ localize("Billing Cycle", "计费周期") }}</span>
                  <select v-model="billingCycle" class="form-input" :disabled="!isPlatformAdmin">
                    <option v-for="option in billingCycleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>{{ localize("Subscription Status", "订阅状态") }}</span>
                  <select v-model="subscriptionStatus" class="form-input" :disabled="!isPlatformAdmin">
                    <option v-for="option in subscriptionStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>{{ localize("Period Start", "周期开始") }}</span>
                  <input v-model="currentPeriodStartsAt" class="form-input" :placeholder="localize('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')" :disabled="!isPlatformAdmin" />
                </label>
                <label class="form-field">
                  <span>{{ localize("Period End", "周期结束") }}</span>
                  <input v-model="currentPeriodEndsAt" class="form-input" :placeholder="localize('2026-02-01T00:00:00Z', '2026-02-01T00:00:00Z')" :disabled="!isPlatformAdmin" />
                </label>
              </div>
              <div class="form-actions" v-if="isPlatformAdmin">
                <button type="button" class="btn-primary" data-testid="tenant-update-plan-button" @click="updateSubscription">
                  <span class="btn-icon">📝</span>
                  {{ localize("Save Access Profile", "保存访问配置") }}
                </button>
              </div>
            </div>
          </section>

          <section class="tenant-card">
            <div class="card-head">
              <div>
                <h2>{{ localize("Token Top-Up", "令牌充值") }}</h2>
                <p>{{ localize("Add a manual token balance adjustment.", "手动增加令牌余额。") }}</p>
              </div>
            </div>
            <div class="card-body">
              <div class="form-grid compact-grid">
                <label class="form-field">
                  <span>{{ localize("Tokens", "令牌") }}</span>
                  <input v-model.number="topUpTokens" type="number" min="1" class="form-input" />
                </label>
                <label class="form-field">
                  <span>{{ localize("Amount (cents)", "金额（分）") }}</span>
                  <input v-model.number="topUpAmountCents" type="number" min="0" class="form-input" />
                </label>
                <label class="form-field full-width">
                  <span>{{ localize("Note", "备注") }}</span>
                  <input v-model="topUpNote" class="form-input" :placeholder="localize('Manual top-up or adjustment reason', '手动充值或调整原因')" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-primary" @click="applyTokenTopUp">
                  <span class="btn-icon">💳</span>
                  {{ localize("Apply Token Top-Up", "执行令牌充值") }}
                </button>
              </div>
            </div>
          </section>

          <section v-if="tenant" class="tenant-card">
            <div class="card-head">
              <div>
                <h2>{{ localize("Storefront Review & Home Curation", "店铺审核与首页精选") }}</h2>
                <p>{{ localize("Review tenant storefront publishing status before featuring it on the home page.", "在设为首页精选前先审核租户店铺的发布状态。") }}</p>
              </div>
            </div>
            <div class="card-body">
              <div v-if="storefrontActionError" class="storefront-action-banner error">{{ storefrontActionError }}</div>
              <div v-else-if="storefrontActionNotice" class="storefront-action-banner success">{{ storefrontActionNotice }}</div>
              <div class="overview-grid storefront-overview-grid">
                <article class="overview-card">
                  <span class="overview-label">{{ localize("Storefront Status", "店铺状态") }}</span>
                  <strong>{{ storefrontStatusLabel }}</strong>
                  <p>{{ tenant.store_slug ? `/store/${tenant.store_slug}` : localize("Store slug not configured", "店铺 slug 未设置") }}</p>
                </article>
                <article class="overview-card">
                  <span class="overview-label">{{ localize("Review Status", "审核状态") }}</span>
                  <strong>{{ storefrontStatusLabel }}</strong>
                  <p>{{ storefrontReviewSummary }}</p>
                </article>
                <article class="overview-card">
                  <span class="overview-label">{{ localize("Reviewer", "审核人") }}</span>
                  <strong>{{ tenant.store_reviewer_email || localize("Pending", "待定") }}</strong>
                  <p>{{ tenant.store_reviewed_at || localize("No review decision yet", "暂无审核结果") }}</p>
                </article>
                <article class="overview-card">
                  <span class="overview-label">{{ localize("Homepage Curation", "首页精选") }}</span>
                  <strong>{{ storefrontFeatureLabel }}</strong>
                  <p>{{ storefrontFeatureBlockedMessage }}</p>
                </article>
                <article class="overview-card">
                  <span class="overview-label">{{ localize("Home Sort Order", "首页排序") }}</span>
                  <strong>#{{ Number(tenant.storefront_sort_order ?? storefrontSortOrder) }}</strong>
                  <p>{{ localize("Lower numbers appear earlier.", "数字越小越靠前。") }}</p>
                </article>
              </div>
              <div class="form-actions storefront-link-actions" v-if="tenant.store_slug">
                <a :href="storefrontPreviewUrl" class="btn-secondary" target="_blank" rel="noreferrer">
                  {{ localize("Preview Storefront", "预览店铺") }}
                </a>
                <a v-if="storefrontPublicUrl" :href="storefrontPublicUrl" class="btn-secondary" target="_blank" rel="noreferrer">
                  {{ localize("View Public Store", "查看公开店铺") }}
                </a>
              </div>
              <div class="form-actions" v-if="isPlatformAdmin">
                <label class="storefront-sort-field storefront-note-field">
                  <span>{{ localize("Review Note", "审核备注") }}</span>
                  <input
                    v-model="storefrontReviewNote"
                    type="text"
                    :placeholder="canReviewStorefront ? localize('Approval note or required rejection reason', '填写通过备注或拒绝原因') : localize('No pending storefront review', '当前没有待审核店铺')"
                  />
                </label>
                <label class="storefront-sort-field">
                  <span>{{ localize("Sort Order", "排序") }}</span>
                  <input v-model.number="storefrontSortOrder" type="number" min="0" step="1" />
                </label>
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="storefrontReviewBusy || !canReviewStorefront"
                  @click="reviewStorefront('approve')"
                >
                  {{ storefrontReviewBusy ? localize("Saving...", "保存中...") : localize("Approve Storefront", "通过店铺") }}
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="storefrontReviewBusy || !canReviewStorefront || !storefrontReviewNote.trim()"
                  :title="rejectReviewBlockedMessage || undefined"
                  @click="reviewStorefront('reject')"
                >
                  {{ storefrontReviewBusy ? localize("Saving...", "保存中...") : localize("Reject Storefront", "拒绝店铺") }}
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="storefrontFeatureBusy || !canFeatureStorefront || Boolean(tenant.storefront_featured)"
                  :title="!canFeatureStorefront ? storefrontFeatureBlockedMessage : undefined"
                  @click="toggleStorefrontFeature(true)"
                >
                  {{ storefrontFeatureBusy && !tenant.storefront_featured ? localize("Saving...", "保存中...") : localize("Feature On Home", "设为首页精选") }}
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="storefrontFeatureBusy || !tenant.storefront_featured"
                  @click="toggleStorefrontFeature(false)"
                >
                  {{ storefrontFeatureBusy && tenant.storefront_featured ? localize("Saving...", "保存中...") : localize("Remove From Home", "从首页移除") }}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section class="tenant-card">
          <div class="card-head split-head">
            <div>
              <h2>{{ localize("Recent Activity", "最近活动") }}</h2>
              <p>{{ localize("Recent operational events.", "最近的操作事件。") }}</p>
            </div>
          </div>
          <div class="activity-list" v-if="paginatedRecentActivity.length">
            <article v-for="item in paginatedRecentActivity" :key="item.id" class="activity-item">
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.note || localize("Recent account activity", "最近账户活动") }}</p>
              </div>
              <div class="activity-meta">
                <span>{{ item.channel }}</span>
                <span>{{ item.tokens }} {{ localize("tokens", "令牌") }}</span>
                <span>{{ item.createdAt }}</span>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <span class="empty-icon">🧾</span>
            <p>{{ localize("No recent activity yet.", "暂无最近活动。") }}</p>
          </div>
          <PaginationBar
            v-if="recentActivity.length"
            v-model:current-page="recentActivityPage"
            :total-pages="recentActivityTotalPages"
            :total-items="recentActivity.length"
            :page-size="TENANT_ACTIVITY_PAGE_SIZE"
          />
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.tenant-page {
  display: grid;
  gap: 1.25rem;
}

.page-header,
.tenant-card,
.sidebar-card {
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.4rem 1.5rem;
}

.page-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.page-title {
  margin: 0.7rem 0 0.35rem;
  font-size: 2rem;
  line-height: 1.05;
  color: #0f172a;
}

.page-subtitle {
  margin: 0;
  max-width: 52rem;
  color: #64748b;
  line-height: 1.7;
}

.tenant-layout {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.tenant-sidebar,
.tenant-main,
.sidebar-card,
.tenant-card,
.card-head,
.card-body,
.summary-card,
.overview-card,
.workflow-card,
.activity-item,
.form-field,
.tenant-list-item,
.header-copy,
.hero-side,
.hero-top > div {
  min-width: 0;
}

.tenant-layout.compact {
  grid-template-columns: 1fr;
}

.tenant-sidebar {
  position: sticky;
  top: 94px;
}

.sidebar-card {
  padding: 1rem;
}

.sidebar-head h2,
.card-head h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.sidebar-head p,
.card-head p {
  margin: 0.35rem 0 0;
  color: #64748b;
  line-height: 1.6;
}

.tenant-list {
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
}

.tenant-list-item {
  display: grid;
  gap: 0.7rem;
  padding: 0.95rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tenant-list-item:hover,
.tenant-list-item.active {
  border-color: #c7d2fe;
  background: #f8faff;
  box-shadow: 0 12px 26px rgba(79, 70, 229, 0.08);
}

.tenant-list-main,
.tenant-list-meta,
.hero-top,
.form-actions,
.activity-item,
.activity-meta,
.split-head {
  display: flex;
}

.tenant-list-main,
.header-copy,
.hero-side,
.summary-card,
.overview-card,
.form-field,
.activity-item {
  flex-direction: column;
}

.tenant-list-main strong,
.hero-top h2,
.summary-card strong,
.overview-card strong {
  color: #0f172a;
}

.tenant-list-main span,
.tenant-balance,
.summary-card p,
.overview-card p,
.activity-item p,
.activity-meta,
.hero-top p,
.hero-side-label {
  color: #64748b;
}

.tenant-list-meta {
  gap: 0.6rem;
  flex-wrap: wrap;
}

.tenant-chip,
.hero-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.7rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 800;
}

.tenant-main {
  display: grid;
  gap: 1.25rem;
}

.card-link-group {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.hero-card {
  padding: 1.4rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.hero-top {
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.hero-top h2,
.hero-top p,
.hero-side code,
.hero-side-label,
.summary-card,
.summary-card strong,
.summary-card p,
.hero-badge {
  color: #fff;
}

.hero-top p,
.summary-card p,
.hero-side-label {
  color: rgba(255, 255, 255, 0.74);
}

.hero-side {
  gap: 0.35rem;
  align-items: flex-end;
}

.hero-side code {
  font-size: 0.84rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
}

.summary-grid,
.overview-grid,
.management-grid,
.form-grid {
  display: grid;
  gap: 1rem;
}

.summary-grid {
  margin-top: 1.1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.summary-card {
  padding: 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  gap: 0.35rem;
}

.summary-label,
.overview-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.summary-card strong,
.overview-card strong {
  font-size: 1.15rem;
  line-height: 1.25;
}

.card-head,
.card-body {
  padding: 1.25rem 1.35rem;
}

.card-head {
  border-bottom: 1px solid #e2e8f0;
}

.overview-grid {
  padding: 1.25rem 1.35rem 1.35rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.workflow-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  padding: 1.25rem 1.35rem 0;
}

.overview-card {
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  gap: 0.35rem;
}

.overview-card strong.code {
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}

.workflow-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.workflow-card strong {
  font-size: 1.35rem;
  color: #0f172a;
}

.management-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.form-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.compact-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.form-field {
  gap: 0.45rem;
}

.form-field span {
  font-size: 0.84rem;
  font-weight: 700;
  color: #334155;
}

.form-input {
  min-height: 46px;
  padding: 0 0.95rem;
  border-radius: 14px;
  border: 1px solid #dbe4f0;
  background: #fff;
  font-size: 0.92rem;
  color: #0f172a;
}

.form-input:focus {
  outline: none;
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.full-width {
  grid-column: 1 / -1;
}

.form-actions {
  margin-top: 1rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.storefront-sort-field {
  display: grid;
  gap: 0.35rem;
  min-width: min(100%, 10rem);
}

.storefront-sort-field span {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
}

.storefront-sort-field input {
  width: 100%;
  border: 1px solid #dbe4f0;
  border-radius: 0.85rem;
  padding: 0.7rem 0.85rem;
  font: inherit;
}

.btn-primary,
.btn-secondary,
.inline-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 1rem;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  border: 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
}

.btn-secondary,
.inline-link {
  border: 1px solid #dbe4f0;
  background: #fff;
  color: #334155;
}

.btn-icon {
  margin-right: 0.4rem;
}

.page-header,
.header-actions,
.card-head,
.split-head,
.hero-top,
.form-actions,
.storefront-link-actions {
  flex-wrap: wrap;
}

.tenant-list-main strong,
.tenant-list-main span,
.summary-card strong,
.overview-card strong,
.workflow-card strong,
.activity-item strong,
.activity-item p,
.card-head p,
.hero-top h2,
.hero-top p,
.hero-side code {
  overflow-wrap: anywhere;
}

.activity-list {
  display: grid;
  gap: 0.85rem;
  padding: 1.25rem 1.35rem 1.35rem;
}

.submission-activity-list {
  padding-top: 1rem;
}

.activity-item {
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.05rem;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #f8fafc;
}

.activity-item strong {
  color: #0f172a;
  text-transform: capitalize;
}

.activity-item p {
  margin: 0.35rem 0 0;
  line-height: 1.55;
}

.activity-meta {
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  font-size: 0.82rem;
}

.empty-state {
  padding: 2rem 1.35rem 2.2rem;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  display: block;
  margin-bottom: 0.6rem;
  font-size: 2rem;
}

@media (max-width: 1180px) {
  .tenant-layout,
  .management-grid,
  .summary-grid,
  .overview-grid,
  .workflow-grid {
    grid-template-columns: 1fr;
  }

  .tenant-sidebar {
    position: static;
  }
}

@media (max-width: 768px) {
  .page-header,
  .hero-top,
  .split-head,
  .activity-item,
  .activity-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid,
  .compact-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 1.7rem;
  }
}
</style>
