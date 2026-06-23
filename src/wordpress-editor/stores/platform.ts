import { ref } from "vue";
import { defineStore } from "pinia";
import { gatewayPlatformFetch, platformFetch } from "../api/client"
import type { StorefrontReviewStatus } from "../api/client"
import type {
  CommissionRecordItem as ContractsCommissionRecordItem,
  CreatorEarningsSummary as ContractsCreatorEarningsSummary,
  CreatorPayoutCycleItem as ContractsCreatorPayoutCycleItem,
  CreatorPayoutRequestItem as ContractsCreatorPayoutRequestItem,
} from "../../../mockup-SAAS/repos/mockup-saas-contracts/generated/typescript/billing"

export type TenantSummary = {
  tenant_id: string
  name?: string
  email: string
  plan_code: string
  quota_total: number
  quota_used: number
  status: string
  billing_cycle?: string
  subscription_status?: string
  token_balance?: number
  verification_status?: string
  verified_at?: string
  store_slug?: string
  store_status?: StorefrontReviewStatus
  store_submitted_at?: string
  store_reviewed_at?: string
  store_review_note?: string
  store_reviewer_email?: string
  storefront_featured?: boolean
  storefront_sort_order?: number
}

type PageResponse<T> = {
  total: number
  page: number
  size: number
  pages: number
  records: T[]
}

export type StorefrontReviewListItem = {
  tenant_id: string
  name?: string
  email: string
  store_slug?: string
  store_name?: string
  store_status?: StorefrontReviewStatus
  store_submitted_at?: string
  store_reviewed_at?: string
  store_review_note?: string
  store_reviewer_email?: string
  storefront_featured?: boolean
  storefront_sort_order?: number
}

export type UsageSummary = {
  tenant_id: string
  quota_total: number
  quota_used: number
  remaining: number
  billing_mode: "tokens"
  currency: string
  latest_billed_cents: number
  preview_512_monthly_quota: number
  preview_512_monthly_used: number
  preview_512_monthly_remaining: number
  preview_cycle_month: string
  events: Array<{ event_id: string; api_key_id?: string | null; event_type: string; units: number; created_at: string; meta?: Record<string, unknown> }>
}

export type SubscriptionSummary = {
  tenant_id: string
  plan_code: string
  billing_cycle: "trial" | "monthly" | "yearly" | "usage"
  status: "inactive" | "trialing" | "active" | "expired" | "cancelled" | "paused"
  trial_enabled_at?: string | null
  trial_ends_at?: string | null
  current_period_starts_at?: string | null
  current_period_ends_at?: string | null
  source: string
  created_at: string
  updated_at: string
}

export type PlanEntitlements = {
  published_template_limit: number | null
  published_templates_used: number
  draft_template_limit: number | null
  plan_code: string
  template_publish_access: boolean
  sdk_api_access: boolean
  usage_based_billing: boolean
  billing_mode: "tokens"
  token_total: number
  token_used: number
  token_balance: number
  paid_token_balance: number
  starter_token_balance: number
  hard_stop_on_zero_tokens: boolean
  sdk_api_scopes: string[]
  quality_pricing: Record<string, number>
  size_pricing: Record<string, number>
  volume_discount_tier: string
  marketplace_purchase_access: boolean
  marketplace_sell_access: boolean
  preview_512_monthly_quota: number
  preview_512_monthly_used: number
  preview_512_monthly_remaining: number
  preview_cycle_month: string
  trial_requires_manual_activation: boolean
  trial_available: boolean
  trial_started: boolean
  trial_active: boolean
  remaining_days: number
  requires_published_cleanup: boolean
  locked_published_templates: number
}

export type TemplateSubmissionItem = {
  submission_id: string
  template_id: string
  title: string
  description: string
  status: string
  cover_url: string
  review_note: string
  reviewer_email?: string
  reviewed_at?: string | null
  tenant_id: string
  created_at: string
  updated_at: string
  category_id?: string
  category_path?: string
  is_active_for_repository?: boolean
}

export type TemplateSubmissionReviewEvent = {
  review_event_id: string
  submission_id: string
  action: string
  note: string
  actor_email: string
  created_at: string
}

export type TemplateCenterListing = {
  listing_id: string
  template_id: string
  template_code?: string
  title: string
  description: string
  creator_name: string
  listed_at?: string
  marketplace_status: "listed" | "unlisted"
  cover_url: string
  category_id?: string
  category_path?: string
  access_scope?: "public" | "private"
  tenant_api_status?: "enabled" | "disabled"
}

export type CategoryNode = {
  category_id: string
  parent_id?: string | null
  level: number
  name: string
  slug?: string
  sort_order?: number
  status?: string
  category_path?: string
  children: CategoryNode[]
}

export type TemplateCategoryBinding = {
  template_id: string
  category_id: string
  category_path: string
  created_at: string
  updated_at: string
}

export type BillingEventItem = {
  billing_event_id: string
  tenant_id: string
  event_type: string
  amount_cents: number
  currency: string
  status: string
  direction: "debit" | "credit"
  meta: Record<string, unknown>
  created_at: string
}

export type TokenTopUpResponse = {
  tenant: TenantSummary
  billing_event: BillingEventItem
}

export type TokenOrderItem = {
  order_id: string
  tenant_id: string
  tokens: number
  amount_cents: number
  currency: string
  payment_method: string
  status: string
  payment_status?: string
  note: string
  meta: Record<string, unknown>
  external_order_id?: string
  external_payment_id?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export type BillingOrderItem = {
  order_id: string
  tenant_id: string
  account_id?: string
  account_email?: string
  item_type: string
  item_code: string
  item_name: string
  quantity: number
  token_amount: number
  amount_cents: number
  currency: string
  payment_method: string
  status: string
  payment_status: string
  external_order_id?: string
  external_payment_id?: string
  payer_id?: string
  approval_url?: string
  status_reason?: string
  note: string
  meta: Record<string, unknown>
  resource_type?: string
  artwork_id?: string
  paid_at?: string
  fulfilled_at?: string
  created_at: string
  updated_at: string
  mock_mode?: boolean
}

export type PaymentTransactionItem = {
  payment_transaction_id: string
  order_id: string
  tenant_id: string
  amount_cents: number
  currency: string
  payment_method: string
  status: string
  gateway_reference: string
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  invoice_id: string
  order_id: string
  tenant_id: string
  amount_cents: number
  currency: string
  status: string
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

type BillingInvoiceSummary = {
  invoiceId: string
  description: string
  amountUsd: number
  status: string
  issuedAt: string
}

export type RefundTransactionItem = {
  refund_transaction_id: string
  order_id: string
  tenant_id: string
  payment_transaction_id: string
  invoice_id: string
  amount_cents: number
  currency: string
  reason: string
  status: string
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CommissionRecordItem = ContractsCommissionRecordItem

export type CreatorEarningsSummary = ContractsCreatorEarningsSummary

export type CreatorPayoutCycleItem = ContractsCreatorPayoutCycleItem

export type CreatorPayoutRequestItem = ContractsCreatorPayoutRequestItem

export type ApiKeySummary = {
  api_key_id: string
  label: string
  key_prefix: string
  status: "active" | "disabled"
  scopes: string[]
  rate_limit_per_minute: number
  last_used_at?: string | null
  created_at: string
}

export type DeveloperMetrics = {
  tenant_id: string
  total_events_24h: number
  events_last_hour: number
  events_by_type: Record<string, number>
  events_by_api_key: Record<string, number>
  active_api_keys: number
  rate_limited_events_24h: number
  scope_denied_events_24h: number
  latest_event_at?: string | null
}

export type DeveloperLogItem = {
  event_id: string
  api_key_id?: string | null
  event_type: string
  units: number
  created_at: string
  request_path: string
  auth_mode: string
  status: string
  meta: Record<string, unknown>
}

type SyncResponse = {
  tenant: TenantSummary
  api_key: string | null
  billing_cycle?: SubscriptionSummary["billing_cycle"] | null
  subscription_status?: SubscriptionSummary["status"] | null
  current_period_starts_at?: string | null
  current_period_ends_at?: string | null
  created: boolean
}

type TenantSubscriptionUpdateResponse = {
  tenant: TenantSummary
  subscription: SubscriptionSummary
  entitlements: PlanEntitlements
}

function resolveAuthHeaders(auth: string | Record<string, string>) {
  if (typeof auth === "string") {
    return { "x-platform-secret": auth }
  }
  return auth
}

function resolveScopedHeaders(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string }) {
  return {
    ...(options.auth || {}),
    ...(options.secret ? { "x-platform-secret": options.secret } : {}),
    ...(options.apiKeyHeader ? { "x-api-key": options.apiKeyHeader } : {}),
  }
}

export const usePlatformStore = defineStore("platform", () => {
  const loading = ref(false)
  const error = ref("")
  const tenant = ref<TenantSummary | null>(null)
  const tenants = ref<TenantSummary[]>([])
  const storefrontReviewItems = ref<StorefrontReviewListItem[]>([])
  const storefrontReviewPage = ref(1)
  const storefrontReviewPages = ref(0)
  const storefrontReviewTotal = ref(0)
  const usage = ref<UsageSummary | null>(null)
  const tenantSubscription = ref<SubscriptionSummary | null>(null)
  const tenantEntitlements = ref<PlanEntitlements | null>(null)
  const apiKey = ref("")
  const submissions = ref<TemplateSubmissionItem[]>([])
  const listings = ref<TemplateCenterListing[]>([])
  const categories = ref<CategoryNode[]>([])
  const templateCategoryBindings = ref<Record<string, TemplateCategoryBinding>>({})
  const billingEvents = ref<BillingEventItem[]>([])
  const tokenOrders = ref<TokenOrderItem[]>([])
  const billingOrders = ref<BillingOrderItem[]>([])
  const paymentTransactions = ref<PaymentTransactionItem[]>([])
  const invoices = ref<InvoiceItem[]>([])
  const refundTransactions = ref<RefundTransactionItem[]>([])
  const commissionRecords = ref<CommissionRecordItem[]>([])
  const creatorEarnings = ref<CreatorEarningsSummary | null>(null)
  const creatorPayoutCycles = ref<CreatorPayoutCycleItem[]>([])
  const creatorPayoutRequests = ref<CreatorPayoutRequestItem[]>([])
  const adminPayoutRequests = ref<CreatorPayoutRequestItem[]>([])
  const developerApiKeys = ref<ApiKeySummary[]>([])
  const developerLogs = ref<DeveloperLogItem[]>([])
  const developerMetrics = ref<DeveloperMetrics | null>(null)
  const submissionHistory = ref<Record<string, TemplateSubmissionReviewEvent[]>>({})

  function resetState() {
    error.value = ""
    tenant.value = null
    tenants.value = []
    storefrontReviewItems.value = []
    storefrontReviewPage.value = 1
    storefrontReviewPages.value = 0
    storefrontReviewTotal.value = 0
    usage.value = null
    tenantSubscription.value = null
    tenantEntitlements.value = null
    apiKey.value = ""
    submissions.value = []
    listings.value = []
    categories.value = []
    templateCategoryBindings.value = {}
    billingEvents.value = []
    tokenOrders.value = []
    billingOrders.value = []
    paymentTransactions.value = []
    invoices.value = []
    refundTransactions.value = []
    commissionRecords.value = []
    creatorEarnings.value = null
    creatorPayoutCycles.value = []
    creatorPayoutRequests.value = []
    adminPayoutRequests.value = []
    developerApiKeys.value = []
    developerLogs.value = []
    developerMetrics.value = null
    submissionHistory.value = {}
  }

  function normalizeCategoryNode(
    node: Record<string, unknown>,
    parentId: string | null = null,
    parentPath = "",
  ): CategoryNode {
    const categoryId = String(node.category_id ?? node.categoryId ?? "")
    const name = String(node.name ?? "")
    const slug = node.slug == null ? undefined : String(node.slug)
    const categoryPath = parentPath ? `${parentPath} / ${name}` : name
    const children = Array.isArray(node.children) ? node.children : []
    const normalizedChildren = children.map((child) =>
      normalizeCategoryNode(child as Record<string, unknown>, categoryId, categoryPath),
    )
    return {
      category_id: categoryId,
      parent_id: parentId,
      level: Number(node.level ?? 1),
      name,
      slug,
      sort_order: node.sort_order == null ? (node.sortOrder == null ? undefined : Number(node.sortOrder)) : Number(node.sort_order),
      status: node.status == null ? undefined : String(node.status),
      category_path: categoryPath,
      children: normalizedChildren,
    }
  }

  function normalizeCategoryTree(payload: unknown): CategoryNode[] {
    const items =
      payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)
        ? (payload as { data?: unknown }).data
        : payload
    if (!Array.isArray(items)) {
      return []
    }
    return items.map((item) => normalizeCategoryNode(item as Record<string, unknown>))
  }

  async function loadTenant(tenantId: string, secret = "", apiKeyHeader = "", auth: Record<string, string> = {}) {
    loading.value = true
    error.value = ""
    try {
      tenant.value = await gatewayPlatformFetch<TenantSummary>(`/platform/tenants/${encodeURIComponent(tenantId)}`, {
        headers: {
          ...resolveScopedHeaders({ auth, secret, apiKeyHeader }),
        },
      })
      return tenant.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadCurrentTenant(auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      tenant.value = await gatewayPlatformFetch<TenantSummary>("/platform/tenant", {
        headers: auth,
      })
      return tenant.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadTenants(auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      tenants.value = await gatewayPlatformFetch<TenantSummary[]>("/platform/tenants", {
        headers: auth,
      })
      return tenants.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadStorefrontReviewItems(
    options: {
      page?: number
      size?: number
      keyword?: string
      status?: StorefrontReviewStatus | "all"
    },
    auth: Record<string, string>,
  ) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      query.set("page", String(Math.max(1, options.page || 1)))
      query.set("size", String(Math.max(1, options.size || 12)))
      if (options.keyword?.trim()) query.set("keyword", options.keyword.trim())
      if (options.status && options.status !== "all") query.set("status", options.status)
      const response = await gatewayPlatformFetch<PageResponse<StorefrontReviewListItem>>(
        `/platform/admin/storefronts?${query.toString()}`,
        {
          headers: auth,
        },
      )
      storefrontReviewItems.value = response.records || []
      storefrontReviewPage.value = response.page || 1
      storefrontReviewPages.value = response.pages || 0
      storefrontReviewTotal.value = response.total || 0
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadUsage(tenantId: string, secret = "", apiKeyHeader = "", auth: Record<string, string> = {}) {
    loading.value = true
    error.value = ""
    try {
      usage.value = await gatewayPlatformFetch<UsageSummary>(`/platform/tenants/${encodeURIComponent(tenantId)}/usage`, {
        headers: {
          ...resolveScopedHeaders({ auth, secret, apiKeyHeader }),
        },
      })
      return usage.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadTenantSubscription(
    tenantId: string,
    secret = "",
    apiKeyHeader = "",
    auth: Record<string, string> = {},
  ) {
    loading.value = true
    error.value = ""
    try {
      tenantSubscription.value = await gatewayPlatformFetch<SubscriptionSummary>(
        `/platform/tenants/${encodeURIComponent(tenantId)}/subscription`,
        {
          headers: {
            ...resolveScopedHeaders({ auth, secret, apiKeyHeader }),
          },
        },
      )
      return tenantSubscription.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTenantSubscription(tenantId: string, payload: {
    auth?: Record<string, string>
    secret?: string
    plan_code: SubscriptionSummary["plan_code"]
    billing_cycle: SubscriptionSummary["billing_cycle"]
    status: SubscriptionSummary["status"]
    tenant_status: TenantSummary["status"]
    quota_total: number
    trial_enabled_at?: string | null
    trial_ends_at?: string | null
    current_period_starts_at?: string | null
    current_period_ends_at?: string | null
    source?: SubscriptionSummary["source"]
  }) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<TenantSubscriptionUpdateResponse>(
        `/platform/tenants/${encodeURIComponent(tenantId)}/subscription`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...resolveScopedHeaders({ auth: payload.auth, secret: payload.secret }),
          },
          body: JSON.stringify({
            plan_code: payload.plan_code,
            billing_cycle: payload.billing_cycle,
            status: payload.status,
            tenant_status: payload.tenant_status,
            quota_total: payload.quota_total,
            trial_enabled_at: payload.trial_enabled_at || null,
            trial_ends_at: payload.trial_ends_at || null,
            current_period_starts_at: payload.current_period_starts_at || null,
            current_period_ends_at: payload.current_period_ends_at || null,
            source: payload.source || "manual",
          }),
        },
      )
      tenant.value = response.tenant
      tenantSubscription.value = response.subscription
      tenantEntitlements.value = response.entitlements
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTenantStorefrontFeature(
    tenantId: string,
    featured: boolean,
    storefrontSortOrder: number,
    auth: Record<string, string>,
  ) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<{ tenant: TenantSummary }>(
        `/platform/tenants/${encodeURIComponent(tenantId)}/storefront/feature`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...auth,
          },
          body: JSON.stringify({ featured, storefront_sort_order: storefrontSortOrder }),
        },
      )
      tenant.value = response.tenant
      tenants.value = tenants.value.map((item) => item.tenant_id === tenantId ? response.tenant : item)
      storefrontReviewItems.value = storefrontReviewItems.value.map((item) =>
        item.tenant_id === tenantId
          ? {
              ...item,
              store_status: response.tenant.store_status,
              store_review_note: response.tenant.store_review_note,
              store_reviewed_at: response.tenant.store_reviewed_at,
              store_reviewer_email: response.tenant.store_reviewer_email,
              storefront_featured: response.tenant.storefront_featured,
              storefront_sort_order: response.tenant.storefront_sort_order,
            }
          : item,
      )
      return response.tenant
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function reviewTenantStorefront(
    tenantId: string,
    decision: "approve" | "reject",
    note: string,
    auth: Record<string, string>,
  ) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<{ tenant: TenantSummary }>(
        `/platform/tenants/${encodeURIComponent(tenantId)}/storefront/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...auth,
          },
          body: JSON.stringify({ decision, note }),
        },
      )
      tenant.value = response.tenant
      tenants.value = tenants.value.map((item) => item.tenant_id === tenantId ? response.tenant : item)
      storefrontReviewItems.value = storefrontReviewItems.value.map((item) =>
        item.tenant_id === tenantId
          ? {
              ...item,
              store_status: response.tenant.store_status,
              store_review_note: response.tenant.store_review_note,
              store_reviewed_at: response.tenant.store_reviewed_at,
              store_reviewer_email: response.tenant.store_reviewer_email,
              storefront_featured: response.tenant.storefront_featured,
              storefront_sort_order: response.tenant.storefront_sort_order,
            }
          : item,
      )
      return response.tenant
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createSubmission(payload: {
    auth: Record<string, string>
    template_id: string
    title: string
    description: string
    note?: string
    category_id?: string
    category_path?: string
    cover_url?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<TemplateSubmissionItem>("/platform/templates/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...payload.auth,
        },
        body: JSON.stringify({
          template_id: payload.template_id,
          title: payload.title,
          description: payload.description,
          note: payload.note ?? "",
          category_id: payload.category_id ?? "",
          category_path: payload.category_path ?? "",
          cover_url: payload.cover_url ?? "",
        }),
      })
      submissions.value = [item, ...submissions.value]
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadSubmissions(options: { auth?: Record<string, string>; apiKeyHeader?: string; secret?: string; tenantId?: string; status?: string }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      // Enforce tenant-level access: tenant_admin can only see their own submissions
      if (options.tenantId) {
        query.set("tenant_id", options.tenantId)
      }
      if (options.status) query.set("status", options.status)
      submissions.value = await gatewayPlatformFetch<TemplateSubmissionItem[]>(
        `/platform/templates/submissions${query.toString() ? `?${query.toString()}` : ""}`,
        {
          headers: {
            ...(options.auth || {}),
            ...(options.secret ? { "x-platform-secret": options.secret } : {}),
            ...(options.apiKeyHeader ? { "x-api-key": options.apiKeyHeader } : {}),
          },
        },
      )
      return submissions.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function reviewSubmission(submissionId: string, payload: { auth?: Record<string, string>; secret?: string; decision: string; note: string }) {
    loading.value = true
    error.value = ""
    try {
      // Platform admin permission check will be enforced on backend
      const item = await gatewayPlatformFetch<TemplateSubmissionItem>(
        `/platform/templates/submissions/${encodeURIComponent(submissionId)}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(payload.auth || {}),
            ...(payload.secret ? { "x-platform-secret": payload.secret } : {}),
          },
          body: JSON.stringify({ decision: payload.decision, note: payload.note }),
        },
      )
      submissions.value = submissions.value.map((entry) => (entry.submission_id === item.submission_id ? item : entry))
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadCenter() {
    loading.value = true
    error.value = ""
    try {
      listings.value = await gatewayPlatformFetch<TemplateCenterListing[]>("/platform/templates/center")
      return listings.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function delistCenterListing(payload: { auth: Record<string, string>; templateId: string; note: string }) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<{ delisted: boolean; template_id: string; note: string }>(
        `/platform/templates/center/${encodeURIComponent(payload.templateId)}/delist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...payload.auth,
          },
          body: JSON.stringify({ note: payload.note }),
        },
      )
      listings.value = listings.value.filter((item) => item.template_id !== payload.templateId)
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadTemplateCategories(auth: string | Record<string, string>, status = "") {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (status) query.set("status", status)
      const response = await gatewayPlatformFetch<unknown>(
        `/platform/template-categories/tree${query.toString() ? `?${query.toString()}` : ""}`,
        {
          headers: resolveAuthHeaders(auth),
        },
      )
      categories.value = normalizeCategoryTree(response)
      return categories.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories(auth: string | Record<string, string> = {}) {
    return await loadTemplateCategories(auth)
  }

  async function createTemplateCategory(auth: string | Record<string, string>, payload: {
    name: string
    slug?: string
    parent_id?: string | null
    sort_order?: number
    status?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<CategoryNode>("/platform/template-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveAuthHeaders(auth),
        },
        body: JSON.stringify(payload),
      })
      await loadTemplateCategories(auth)
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTemplateCategory(auth: string | Record<string, string>, categoryId: string, payload: {
    name: string
    slug?: string
    sort_order?: number
    status?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<CategoryNode>(`/platform/template-categories/${encodeURIComponent(categoryId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...resolveAuthHeaders(auth),
        },
        body: JSON.stringify(payload),
      })
      await loadTemplateCategories(auth)
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteTemplateCategory(auth: string | Record<string, string>, categoryId: string) {
    loading.value = true
    error.value = ""
    try {
      await gatewayPlatformFetch(`/platform/template-categories/${encodeURIComponent(categoryId)}`, {
        method: "DELETE",
        headers: resolveAuthHeaders(auth),
      })
      await loadTemplateCategories(auth)
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function resetOfficialTemplateCategories(auth: string | Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      const result = await gatewayPlatformFetch<{
        deleted_templates: string[]
        deleted_template_count: number
        preserved_template_count: number
        category_count: number
        root_categories: string[]
      }>("/platform/template-categories/reset-official", {
        method: "POST",
        headers: resolveAuthHeaders(auth),
      })
      await loadTemplateCategories(auth)
      return result
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadTemplateCategoryBinding(auth: string | Record<string, string>, templateId: string) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<TemplateCategoryBinding>(`/platform/templates/${encodeURIComponent(templateId)}/category`, {
        headers: resolveAuthHeaders(auth),
      })
      templateCategoryBindings.value = {
        ...templateCategoryBindings.value,
        [templateId]: item,
      }
      return item
    } catch (err) {
      const message = String((err as Error).message || err)
      if (message.includes("404") || message.includes("template category binding not found")) {
        const next = { ...templateCategoryBindings.value }
        delete next[templateId]
        templateCategoryBindings.value = next
        return null
      }
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function bindTemplateCategory(auth: string | Record<string, string>, templateId: string, categoryId: string) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<TemplateCategoryBinding>(`/platform/templates/${encodeURIComponent(templateId)}/category`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...resolveAuthHeaders(auth),
        },
        body: JSON.stringify({ category_id: categoryId }),
      })
      templateCategoryBindings.value = {
        ...templateCategoryBindings.value,
        [templateId]: item,
      }
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadBillingEvents(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      billingEvents.value = await gatewayPlatformFetch<BillingEventItem[]>(
        `/platform/billing/events${query.toString() ? `?${query.toString()}` : ""}`,
        {
          headers: {
            ...resolveScopedHeaders(options),
          },
        },
      )
      return billingEvents.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createTokenTopUp(payload: {
    auth?: Record<string, string>
    secret?: string
    tenant_id?: string
    tokens: number
    amount_cents?: number
    currency?: string
    note?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<TokenTopUpResponse>("/platform/tokens/top-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveScopedHeaders({ auth: payload.auth, secret: payload.secret }),
        },
        body: JSON.stringify({
          tenant_id: payload.tenant_id || null,
          tokens: payload.tokens,
          amount_cents: payload.amount_cents || 0,
          currency: payload.currency || "USD",
          note: payload.note || "",
        }),
      })
      tenant.value = response.tenant
      billingEvents.value = [response.billing_event, ...billingEvents.value]
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createPayPalTokenOrder(payload: {
    auth?: Record<string, string>
    secret?: string
    tenant_id?: string
    tokens: number
    amount_cents: number
    currency?: string
    pack_type?: string
    note?: string
    return_url?: string
    cancel_url?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<BillingOrderItem>("/platform/billing/orders/paypal/token-packs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveScopedHeaders({ auth: payload.auth, secret: payload.secret }),
        },
        body: JSON.stringify({
          tenant_id: payload.tenant_id || null,
          tokens: payload.tokens,
          amount_cents: payload.amount_cents,
          currency: payload.currency || "USD",
          pack_type: payload.pack_type || "custom",
          note: payload.note || "",
          return_url: payload.return_url || "",
          cancel_url: payload.cancel_url || "",
        }),
      })
      billingOrders.value = [response, ...billingOrders.value.filter((item) => item.order_id !== response.order_id)]
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function confirmPayPalOrder(orderId: string, payload: {
    auth?: Record<string, string>
    secret?: string
    payer_id?: string
    external_order_id?: string
  } = {}) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<BillingOrderItem>(`/platform/billing/orders/${encodeURIComponent(orderId)}/paypal/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveScopedHeaders({ auth: payload.auth, secret: payload.secret }),
        },
        body: JSON.stringify({
          payer_id: payload.payer_id || "",
          external_order_id: payload.external_order_id || "",
        }),
      })
      billingOrders.value = [response, ...billingOrders.value.filter((item) => item.order_id !== response.order_id)]
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function cancelBillingOrder(orderId: string, payload: {
    auth?: Record<string, string>
    secret?: string
    reason?: string
  } = {}) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<BillingOrderItem>(`/platform/billing/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveScopedHeaders({ auth: payload.auth, secret: payload.secret }),
        },
        body: JSON.stringify({
          reason: payload.reason || "buyer_cancelled",
        }),
      })
      billingOrders.value = [response, ...billingOrders.value.filter((item) => item.order_id !== response.order_id)]
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadTokenOrders(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      tokenOrders.value = await gatewayPlatformFetch<TokenOrderItem[]>(
        `/platform/billing/tokens/orders${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return tokenOrders.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadBillingOrders(options: {
    auth?: Record<string, string>
    secret?: string
    apiKeyHeader?: string
    tenantId?: string
    limit?: number
    status?: string
    orderQuery?: string
    itemType?: string
    resourceType?: string
    itemCode?: string
    artworkId?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      if (options.status) query.set("status", options.status)
      if (options.orderQuery) query.set("order_query", options.orderQuery)
      if (options.itemType) query.set("item_type", options.itemType)
      if (options.resourceType) query.set("resource_type", options.resourceType)
      if (options.itemCode) query.set("item_code", options.itemCode)
      if (options.artworkId) query.set("artwork_id", options.artworkId)
      billingOrders.value = await gatewayPlatformFetch<BillingOrderItem[]>(
        `/platform/billing/orders${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return billingOrders.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadPaymentTransactions(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      paymentTransactions.value = await gatewayPlatformFetch<PaymentTransactionItem[]>(
        `/platform/billing/payments${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return paymentTransactions.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadInvoices(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      const response = await gatewayPlatformFetch<BillingInvoiceSummary[]>(
        `/platform/billing/invoices${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      invoices.value = response.map((item) => ({
        invoice_id: item.invoiceId,
        order_id: "",
        tenant_id: options.tenantId || tenant.value?.tenant_id || "",
        amount_cents: item.amountUsd * 100,
        currency: "USD",
        status: item.status,
        meta: { description: item.description },
        created_at: item.issuedAt,
        updated_at: item.issuedAt,
      }))
      return invoices.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createRefundTransaction(payload: {
    auth?: Record<string, string>
    secret?: string
    tenant_id?: string
    order_id: string
    amount_cents: number
    reason: string
    note?: string
  }) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<RefundTransactionItem>("/platform/billing/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveScopedHeaders({ auth: payload.auth, secret: payload.secret }),
        },
        body: JSON.stringify({
          tenant_id: payload.tenant_id || null,
          order_id: payload.order_id,
          amount_cents: payload.amount_cents,
          reason: payload.reason,
          note: payload.note || "",
        }),
      })
      refundTransactions.value = [response, ...refundTransactions.value.filter((item) => item.refund_transaction_id !== response.refund_transaction_id)]
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadRefundTransactions(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      refundTransactions.value = await gatewayPlatformFetch<RefundTransactionItem[]>(
        `/platform/billing/refunds${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return refundTransactions.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadCommissionRecords(options: {
    auth?: Record<string, string>
    secret?: string
    apiKeyHeader?: string
    tenantId?: string
    templateId?: string
    artworkId?: string
    jobId?: string
    resourceType?: string
    status?: string
    limit?: number
  }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.templateId) query.set("template_id", options.templateId)
      if (options.artworkId) query.set("artwork_id", options.artworkId)
      if (options.jobId) query.set("job_id", options.jobId)
      if (options.resourceType) query.set("resource_type", options.resourceType)
      if (options.status) query.set("status", options.status)
      if (options.limit) query.set("limit", String(options.limit))
      commissionRecords.value = await gatewayPlatformFetch<CommissionRecordItem[]>(
        `/platform/billing/commissions/records${query.toString() ? `?${query.toString()}` : ""}`,
        {
          headers: {
            ...resolveScopedHeaders(options),
          },
        },
      )
      return commissionRecords.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadCreatorEarnings(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      creatorEarnings.value = await gatewayPlatformFetch<CreatorEarningsSummary>(
        `/platform/billing/creator/earnings${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return creatorEarnings.value
    } finally {
      loading.value = false
    }
  }

  async function loadCreatorPayoutCycles(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      creatorPayoutCycles.value = await gatewayPlatformFetch<CreatorPayoutCycleItem[]>(
        `/platform/billing/creator/payout-cycles${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return creatorPayoutCycles.value
    } finally {
      loading.value = false
    }
  }

  async function loadCreatorPayoutRequests(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; tenantId?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.tenantId) query.set("tenant_id", options.tenantId)
      if (options.limit) query.set("limit", String(options.limit))
      creatorPayoutRequests.value = await gatewayPlatformFetch<CreatorPayoutRequestItem[]>(
        `/platform/billing/creator/payout-requests${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return creatorPayoutRequests.value
    } finally {
      loading.value = false
    }
  }

  async function createCreatorPayoutRequest(options: { auth?: Record<string, string>; tenantId?: string; cycleId: string; grossAmountUsd: number; paypalReceiver: string }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<CreatorPayoutRequestItem>("/platform/billing/creator/payout-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...resolveScopedHeaders(options),
        },
        body: JSON.stringify({
          tenant_id: options.tenantId,
          cycle_id: options.cycleId,
          gross_amount_usd: options.grossAmountUsd,
          paypal_receiver: options.paypalReceiver,
        }),
      })
      creatorPayoutRequests.value = [item, ...creatorPayoutRequests.value.filter((current) => current.request_id !== item.request_id)]
      return item
    } finally {
      loading.value = false
    }
  }

  async function refreshCreatorPayoutRequest(requestId: string, options: { auth?: Record<string, string> }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<CreatorPayoutRequestItem>(
        `/platform/billing/creator/payout-requests/${encodeURIComponent(requestId)}/refresh`,
        {
          method: "POST",
          headers: {
            ...resolveScopedHeaders(options),
          },
        },
      )
      creatorPayoutRequests.value = creatorPayoutRequests.value.map((current) => current.request_id === item.request_id ? item : current)
      adminPayoutRequests.value = adminPayoutRequests.value.map((current) => current.request_id === item.request_id ? item : current)
      return item
    } finally {
      loading.value = false
    }
  }

  async function loadAdminPayoutRequests(options: { auth?: Record<string, string>; secret?: string; apiKeyHeader?: string; status?: string; limit?: number }) {
    loading.value = true
    error.value = ""
    try {
      const query = new URLSearchParams()
      if (options.status) query.set("status", options.status)
      if (options.limit) query.set("limit", String(options.limit))
      adminPayoutRequests.value = await gatewayPlatformFetch<CreatorPayoutRequestItem[]>(
        `/platform/billing/admin/payout-requests${query.toString() ? `?${query.toString()}` : ""}`,
        { headers: { ...resolveScopedHeaders(options) } },
      )
      return adminPayoutRequests.value
    } finally {
      loading.value = false
    }
  }

  async function approveCreatorPayoutRequest(requestId: string, options: { auth?: Record<string, string>; reviewedNote?: string }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<CreatorPayoutRequestItem>(
        `/platform/billing/admin/payout-requests/${encodeURIComponent(requestId)}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...resolveScopedHeaders(options),
          },
          body: JSON.stringify({
            reviewed_note: options.reviewedNote ?? "",
          }),
        },
      )
      adminPayoutRequests.value = adminPayoutRequests.value.map((current) => current.request_id === item.request_id ? item : current)
      creatorPayoutRequests.value = creatorPayoutRequests.value.map((current) => current.request_id === item.request_id ? item : current)
      return item
    } finally {
      loading.value = false
    }
  }

  async function rejectCreatorPayoutRequest(requestId: string, options: { auth?: Record<string, string>; reviewedNote?: string }) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<CreatorPayoutRequestItem>(
        `/platform/billing/admin/payout-requests/${encodeURIComponent(requestId)}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...resolveScopedHeaders(options),
          },
          body: JSON.stringify({
            reviewed_note: options.reviewedNote ?? "",
          }),
        },
      )
      adminPayoutRequests.value = adminPayoutRequests.value.map((current) => current.request_id === item.request_id ? item : current)
      creatorPayoutRequests.value = creatorPayoutRequests.value.map((current) => current.request_id === item.request_id ? item : current)
      return item
    } finally {
      loading.value = false
    }
  }

  async function loadDeveloperApiKeys(auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      developerApiKeys.value = await gatewayPlatformFetch<ApiKeySummary[]>("/developer/api-keys", {
        headers: auth,
      })
      return developerApiKeys.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createDeveloperApiKey(payload: { label: string; scopes: string[]; rate_limit_per_minute: number }, auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<{ api_key: string; item: ApiKeySummary }>("/developer/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth,
        },
        body: JSON.stringify(payload),
      })
      developerApiKeys.value = [response.item, ...developerApiKeys.value]
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function disableDeveloperApiKey(apiKeyId: string, auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<ApiKeySummary>(`/developer/api-keys/${encodeURIComponent(apiKeyId)}/disable`, {
        method: "POST",
        headers: auth,
      })
      developerApiKeys.value = developerApiKeys.value.map((current) => (current.api_key_id === item.api_key_id ? item : current))
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function enableDeveloperApiKey(apiKeyId: string, auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      const item = await gatewayPlatformFetch<ApiKeySummary>(`/developer/api-keys/${encodeURIComponent(apiKeyId)}/enable`, {
        method: "POST",
        headers: auth,
      })
      developerApiKeys.value = developerApiKeys.value.map((current) => (current.api_key_id === item.api_key_id ? item : current))
      return item
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function rotateDeveloperApiKey(apiKeyId: string, auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      const response = await gatewayPlatformFetch<{ api_key: string; item: ApiKeySummary }>(`/developer/api-keys/${encodeURIComponent(apiKeyId)}/rotate`, {
        method: "POST",
        headers: auth,
      })
      developerApiKeys.value = developerApiKeys.value.map((current) => (current.api_key_id === response.item.api_key_id ? response.item : current))
      return response
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteDeveloperApiKey(apiKeyId: string, auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      await gatewayPlatformFetch(`/developer/api-keys/${encodeURIComponent(apiKeyId)}`, {
        method: "DELETE",
        headers: auth,
      })
      developerApiKeys.value = developerApiKeys.value.filter((item) => item.api_key_id !== apiKeyId)
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadDeveloperLogs(auth: Record<string, string>, limit = 50) {
    loading.value = true
    error.value = ""
    try {
      developerLogs.value = await gatewayPlatformFetch<DeveloperLogItem[]>(`/developer/logs?limit=${encodeURIComponent(String(limit))}`, {
        headers: auth,
      })
      return developerLogs.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadDeveloperMetrics(auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      developerMetrics.value = await gatewayPlatformFetch<DeveloperMetrics>("/developer/metrics", {
        headers: auth,
      })
      return developerMetrics.value
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadSubmissionHistory(submissionId: string, auth: Record<string, string>) {
    loading.value = true
    error.value = ""
    try {
      const items = await gatewayPlatformFetch<TemplateSubmissionReviewEvent[]>(
        `/platform/templates/submissions/${encodeURIComponent(submissionId)}/history`,
        { headers: auth },
      )
      submissionHistory.value = {
        ...submissionHistory.value,
        [submissionId]: items,
      }
      return items
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    resetState,
    tenant,
    tenants,
    storefrontReviewItems,
    storefrontReviewPage,
    storefrontReviewPages,
    storefrontReviewTotal,
    usage,
    tenantSubscription,
    tenantEntitlements,
    apiKey,
    submissions,
    listings,
    categories,
    templateCategoryBindings,
    billingEvents,
    tokenOrders,
    billingOrders,
    paymentTransactions,
    invoices,
    refundTransactions,
    commissionRecords,
    creatorEarnings,
    creatorPayoutCycles,
    creatorPayoutRequests,
    adminPayoutRequests,
    developerApiKeys,
    developerLogs,
    developerMetrics,
    submissionHistory,
    loadCurrentTenant,
    loadTenants,
    loadStorefrontReviewItems,
    loadTenant,
    loadUsage,
    loadTenantSubscription,
    updateTenantSubscription,
    updateTenantStorefrontFeature,
    reviewTenantStorefront,
    createSubmission,
    loadSubmissions,
    reviewSubmission,
    loadCenter,
    delistCenterListing,
    loadTemplateCategories,
    fetchCategories,
    createTemplateCategory,
    updateTemplateCategory,
    deleteTemplateCategory,
    resetOfficialTemplateCategories,
    loadTemplateCategoryBinding,
    bindTemplateCategory,
    loadBillingEvents,
    createTokenTopUp,
    createPayPalTokenOrder,
    confirmPayPalOrder,
    cancelBillingOrder,
    loadTokenOrders,
    loadBillingOrders,
    loadPaymentTransactions,
    loadInvoices,
    createRefundTransaction,
    loadRefundTransactions,
    loadCommissionRecords,
    loadCreatorEarnings,
    loadCreatorPayoutCycles,
    loadCreatorPayoutRequests,
    createCreatorPayoutRequest,
    refreshCreatorPayoutRequest,
    loadAdminPayoutRequests,
    approveCreatorPayoutRequest,
    rejectCreatorPayoutRequest,
    loadDeveloperApiKeys,
    createDeveloperApiKey,
    disableDeveloperApiKey,
    enableDeveloperApiKey,
    rotateDeveloperApiKey,
    deleteDeveloperApiKey,
    loadDeveloperLogs,
    loadDeveloperMetrics,
    loadSubmissionHistory,
  }
})
