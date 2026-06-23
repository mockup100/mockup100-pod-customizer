<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-content">
        <div class="welcome-section">
          <h1 v-if="isPlatformAdmin" class="welcome-title">
            <span class="welcome-emoji" aria-hidden="true">📊</span>
            {{ localize("Platform Dashboard", "平台总览") }}
          </h1>
          <h1 v-else class="welcome-title">{{ localize("Welcome back,", "欢迎回来，") }} {{ userDisplayName }}!</h1>
          <p class="welcome-subtitle">
            <template v-if="isPlatformAdmin">{{ localize("Real-time KPIs and quick links", "实时关键指标与快捷入口") }}</template>
            <template v-else>{{ welcomeSubtitle }}</template>
          </p>
        </div>
        <div class="subscription-status-card" :class="subscriptionStatusClass">
          <div class="status-header">
            <div class="plan-badge" :class="planBadgeClass">
              {{ currentPlanName }}
            </div>
            <div class="status-icon">{{ subscriptionStatusIcon }}</div>
          </div>
          <div class="status-details">
            <div class="status-timeline">
              <span class="free-timeline">
                {{ subscriptionTimelineLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isPlatformAdmin" class="metrics-grid">
      <div
        v-for="card in platformSetupCards"
        :key="card.label"
        class="metric-card"
        :class="{ primary: card.primary }"
      >
        <div class="metric-header">
          <div class="metric-icon">{{ card.icon }}</div>
          <div class="metric-label">{{ card.label }}</div>
        </div>
        <div class="metric-content">
          <div class="metric-number">{{ card.value }}</div>
          <div class="metric-subtitle">{{ card.subtitle }}</div>
        </div>
      </div>
    </div>

    <section v-if="isPlatformAdmin" class="quick-links-section">
      <div class="section-header quick-links-header">
        <h2 class="section-title">{{ localize("Quick Links", "快捷入口") }}</h2>
        <p class="section-subtitle">{{ localize("Jump straight into the most common admin workflows.", "直达最常用的管理工作流。") }}</p>
      </div>
      <div class="quick-links-grid">
        <RouterLink to="/admin/billing" class="quick-link-card">
          <div class="quick-link-icon" aria-hidden="true">💳</div>
          <div class="quick-link-body">
            <div class="quick-link-title">{{ localize("Billing", "计费") }}</div>
            <div class="quick-link-desc">{{ localize("Plans, invoices, and revenue", "套餐、账单与收入") }}</div>
          </div>
        </RouterLink>
        <RouterLink to="/admin/tokens-management" class="quick-link-card">
          <div class="quick-link-icon" aria-hidden="true">🪙</div>
          <div class="quick-link-body">
            <div class="quick-link-title">{{ localize("Tokens", "Token 管理") }}</div>
            <div class="quick-link-desc">{{ localize("Grants, packs, and balances", "赠送、Token 包与余额") }}</div>
          </div>
        </RouterLink>
        <RouterLink to="/admin/offline-orders" class="quick-link-card">
          <div class="quick-link-icon" aria-hidden="true">📦</div>
          <div class="quick-link-body">
            <div class="quick-link-title">{{ localize("Offline Orders", "线下订单") }}</div>
            <div class="quick-link-desc">{{ localize("Review and reconcile manual orders", "审核与对账手工订单") }}</div>
          </div>
        </RouterLink>
        <RouterLink to="/admin/orders-management" class="quick-link-card">
          <div class="quick-link-icon" aria-hidden="true">🧾</div>
          <div class="quick-link-body">
            <div class="quick-link-title">{{ localize("Orders", "订单管理") }}</div>
            <div class="quick-link-desc">{{ localize("All platform purchase orders", "全平台购买订单") }}</div>
          </div>
        </RouterLink>
        <RouterLink to="/admin/permissions" class="quick-link-card">
          <div class="quick-link-icon" aria-hidden="true">🔐</div>
          <div class="quick-link-body">
            <div class="quick-link-title">{{ localize("Permissions", "权限") }}</div>
            <div class="quick-link-desc">{{ localize("Roles, members, and access", "角色、成员与访问控制") }}</div>
          </div>
        </RouterLink>
        <RouterLink to="/admin/audit-logs" class="quick-link-card">
          <div class="quick-link-icon" aria-hidden="true">📜</div>
          <div class="quick-link-body">
            <div class="quick-link-title">{{ localize("Audit Logs", "审计日志") }}</div>
            <div class="quick-link-desc">{{ localize("Trace every sensitive action", "追踪每个敏感操作") }}</div>
          </div>
        </RouterLink>
      </div>
    </section>

    <div v-else class="tenant-token-summary">
      <div class="token-summary-card">
        <div class="token-summary-icon">💳</div>
        <div class="token-summary-body">
          <div class="token-summary-label">{{ localize("Available Tokens", "可用 Tokens") }}</div>
          <div class="token-summary-value">{{ availableTokens }}</div>
          <div class="token-summary-meta">{{ localize(`${consumedTokens.toLocaleString()} used · ${usageRateLabel} usage`, `${consumedTokens.toLocaleString()} 已使用 · ${usageRateLabel} 使用率`) }}</div>
        </div>
        <RouterLink to="/admin/billing" class="token-summary-link">{{ localize("Open Billing →", "前往计费 →") }}</RouterLink>
      </div>
    </div>

    <div v-if="showTokenAlert" class="token-alert-banner" :class="{ danger: isTokenDepleted }">
      <div>
        <strong>{{ isTokenDepleted ? localize("Token exhausted", "Token 已耗尽") : localize("Token running low", "Token 余额偏低") }}</strong>
        <p>
          {{ isTokenDepleted
            ? localize("Paid generation is blocked until you buy another token package. 512×512 generation (Console + API) remains free.", "付费生成已被阻止，请先购买新的 token 包。512×512 生图（控制台 + API）始终免费。")
            : localize(`Below ${lowTokenThreshold} tokens. Refill soon.`, `低于 ${lowTokenThreshold} tokens，请尽快充值。`) }}
        </p>
      </div>
      <RouterLink :to="{ path: '/admin/tokens-management', hash: '#buy-token-packs' }" class="subscription-button primary">{{ localize("Buy Tokens", "购买 Tokens") }}</RouterLink>
    </div>

    <section v-if="dashboardLoading" class="state-card">
      <h2 class="section-title">{{ localize("Loading dashboard", "正在加载仪表盘") }}</h2>
      <p class="section-subtitle">{{ localize("Refreshing templates, artwork, usage, and earnings.", "正在刷新模板、作品、使用量和收益。") }}</p>
    </section>
    <section v-else-if="dashboardError" class="state-card error">
      <h2 class="section-title">{{ localize("Dashboard refresh needs attention", "仪表盘刷新需要关注") }}</h2>
      <p class="section-subtitle">{{ dashboardError }}</p>
      <p class="state-note">{{ localize("Use the admin navigation while this source recovers.", "在数据源恢复期间，请先通过后台导航继续操作。") }}</p>
    </section>

    <section class="commerce-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">{{ isPlatformAdmin ? localize("Creator Commerce Mix", "创作者商业构成") : localize("Creator Earnings Snapshot", "创作者收益快照") }}</h2>
          <p class="section-subtitle">
            {{ localize("Template and artwork commission mix.", "模板和作品的佣金构成。") }}
          </p>
        </div>
      </div>
      <div v-if="commerceLoading" class="state-card compact">
        <p class="section-subtitle">{{ localize("Loading creator commission mix...", "正在加载创作者佣金构成...") }}</p>
      </div>
      <div v-else-if="commerceError" class="state-card compact error">
        <p class="section-subtitle">{{ commerceError }}</p>
        <p class="state-note">{{ localize("Detailed billing and artwork records remain available from the admin navigation once the data source is back.", "数据源恢复后，仍可通过后台导航查看详细账单和作品记录。") }}</p>
      </div>
      <div v-else-if="showCommerceEmptyState" class="state-card compact">
        <p class="section-subtitle">{{ localize("No creator earnings yet.", "暂无创作者收益。") }}</p>
        <p class="state-note">{{ localize("Template or artwork activity appears here.", "模板或作品活动会显示在这里。") }}</p>
      </div>
      <div v-else class="commerce-grid">
        <div class="commerce-card">
          <span class="commerce-label">{{ localize("Template Commission", "模板佣金") }}</span>
          <strong class="commerce-value">{{ formatTokenAmount(creatorEarnings?.template_commission_tokens) }}</strong>
          <span class="commerce-subtitle">{{ creatorEarnings?.template_record_count || 0 }} {{ localize("records", "条") }}</span>
        </div>
        <div class="commerce-card">
          <span class="commerce-label">{{ localize("Artwork Commission", "作品佣金") }}</span>
          <strong class="commerce-value">{{ formatTokenAmount(creatorEarnings?.artwork_commission_tokens) }}</strong>
          <span class="commerce-subtitle">{{ creatorEarnings?.artwork_record_count || 0 }} {{ localize("records", "条") }}</span>
        </div>
        <div class="commerce-card">
          <span class="commerce-label">{{ localize("Latest Source Mix", "最新来源构成") }}</span>
          <strong class="commerce-value">{{ latestCommissionResourceLabel }}</strong>
          <span class="commerce-subtitle">{{ latestCommissionResourceAt }}</span>
        </div>
      </div>
    </section>

    <section class="quality-section">
      <div class="section-header">
        <h2 class="section-title">{{ qualitySectionTitle }}</h2>
        <p class="section-subtitle">{{ qualitySectionSubtitle }}</p>
      </div>
      <div class="quality-grid">
        <div v-for="card in qualityCards" :key="card.tier" class="quality-card">
          <div class="quality-header">
            <div class="quality-icon">{{ card.icon }}</div>
            <div class="quality-info">
              <h3 class="quality-name">{{ card.label }}</h3>
            </div>
          </div>
          <div v-if="!isPlatformAdmin" class="quality-stats">
            <div class="stat-item">
              <span class="stat-number">{{ card.totalOutputs }}</span>
              <span class="stat-label">{{ localize("total outputs", "总输出") }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ card.tokenUsage }}</span>
              <span class="stat-label">{{ localize("tokens billed", "已计费 tokens") }}</span>
            </div>
          </div>
          <div class="quality-footnote">{{ card.footnote }}</div>
        </div>
      </div>
    </section>

    <div v-if="!isPlatformAdmin" class="subscription-section">
      <div class="subscription-card">
        <div class="subscription-copy">
          <div class="section-eyebrow">{{ billingSetupEyebrow }}</div>
          <h2 class="subscription-title">{{ billingSetupTitle }}</h2>
          <p class="subscription-text">{{ billingSetupDescription }}</p>
        </div>
        <div class="subscription-summary">
          <div class="summary-pill" :class="planBadgeClass">{{ billingSetupBadge }}</div>
          <div v-if="trackedTokenTotal === 0" class="summary-line">{{ tokenSourceEmptyMessage }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import { useUiLocaleStore } from '../../stores/uiLocale'
import { usePlatformStore } from '../../stores/platform'
import { useTemplateStore } from '../../stores/templates'
import { getPlanDisplayName, normalizePlanCode } from '../../utils/billingModel'
import { officialCategoryRootNames } from '../../constants/categoryPresets'
import { buildBillingSummary } from './billingView'
import type { CommissionRecordItem } from '../../stores/platform'

const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const platformStore = usePlatformStore()
const templatesStore = useTemplateStore()
const { role, account, entitlements, subscription } = storeToRefs(authStore)
const { items } = storeToRefs(templatesStore)
const { tenant, usage, billingEvents, tokenOrders, categories, developerApiKeys, creatorEarnings, commissionRecords } = storeToRefs(platformStore)
const dashboardLoading = ref(false)
const dashboardError = ref("")
const commerceLoading = ref(false)
const commerceError = ref("")

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

// Computed Properties
const userDisplayName = computed(() => {
  return account?.value?.display_name || account?.value?.email || localize('User', '用户')
})

const isPlatformAdmin = computed(() => role.value === 'platform_admin')
const welcomeSubtitle = computed(() => isPlatformAdmin.value
  ? localize("Review platform signals", "查看平台信号")
  : localize("Review workspace signals", "查看工作区信号"))

const renderBillingEvents = computed(() => billingEvents.value.filter((item) => item.event_type === 'render_charge'))
const totalCategoryCount = computed(() => {
  const walk = (nodes: typeof categories.value): number => nodes.reduce((sum, node) => {
    const children = Array.isArray(node.children) ? node.children : []
    return sum + 1 + walk(children)
  }, 0)
  return walk(categories.value)
})
const leafCategoryCount = computed(() => {
  const walk = (nodes: typeof categories.value): number => nodes.reduce((sum, node) => {
    const children = Array.isArray(node.children) ? node.children : []
    if (!children.length) return sum + 1
    return sum + walk(children)
  }, 0)
  return walk(categories.value)
})
const topLevelCategoryCount = computed(() => categories.value.length)

const availableTokens = computed(() => {
  if (usage.value?.remaining != null) return Math.max(0, Number(usage.value.remaining) || 0)
  if (isPlatformAdmin.value) return Math.max(0, entitlements.value?.token_balance || 0)
  return Math.max(0, entitlements.value?.token_balance || 0)
})

const billingSummary = computed(() => buildBillingSummary({
  tokenOrders: tokenOrders.value,
  billingEvents: billingEvents.value,
  usage: usage.value,
  fallbackTokenBalance: entitlements.value?.token_balance ?? 0,
}))
const consumedTokens = computed(() => billingSummary.value.totalConsumedTokens)
const trackedTokenTotal = computed(() => billingSummary.value.trackedTokenTotal)
const usageRate = computed(() => billingSummary.value.usageRate)
const usageRateLabel = computed(() => {
  const percent = usageRate.value * 100
  return percent >= 10 ? `${Math.round(percent)}%` : `${percent.toFixed(1)}%`
})
const lowTokenThreshold = computed(() => Math.max(100, Math.ceil(trackedTokenTotal.value * 0.1)))
const isTokenDepleted = computed(() => availableTokens.value <= 0)
const isLowTokenBalance = computed(() => availableTokens.value > 0 && availableTokens.value <= lowTokenThreshold.value)
const showTokenAlert = computed(() => !isPlatformAdmin.value && (isTokenDepleted.value || isLowTokenBalance.value))
const billingSetupEyebrow = computed(() => isPlatformAdmin.value ? localize('Billing Setup', '计费设置') : localize('Token Sources', 'Token 来源'))
const billingSetupTitle = computed(() => isPlatformAdmin.value
  ? localize('Review billing readiness', '查看计费准备情况')
  : localize('Review token sources', '查看 token 来源'))
const billingSetupDescription = computed(() => isPlatformAdmin.value
  ? localize('Check grants, orders, and usage.', '查看赠送、订单和使用情况。')
  : localize('Tracked tokens come from grants, paid orders, and adjustments.', '跟踪中的 tokens 来自赠送、付费订单和手动调整。'))
const billingSetupBadge = computed(() => isPlatformAdmin.value
  ? localize(`Billing Ready ${trackedTokenTotal.value}`, `计费就绪 ${trackedTokenTotal.value}`)
  : localize(`Tracked Total ${trackedTokenTotal.value}`, `已跟踪总量 ${trackedTokenTotal.value}`))
const tokenSourceEmptyMessage = computed(() => isPlatformAdmin.value
  ? localize('No token grants, purchases, or usage records yet.', '暂时还没有 token 赠送、购买或使用记录。')
  : localize('No token grants, purchases, or usage records yet.', '暂时还没有 token 赠送、购买或使用记录。'))
const qualitySectionTitle = computed(() => isPlatformAdmin.value ? localize('Billing Rules', '计费规则') : localize('Token Usage Breakdown', 'Token 使用拆分'))
const qualitySectionSubtitle = computed(() => isPlatformAdmin.value
  ? localize('Review the active billing model.', '查看当前启用的计费模型。')
  : previewAllowanceSummary.value)
const qualityCards = computed(() => isPlatformAdmin.value ? [
  {
    tier: 'free-512',
    icon: '🆓',
    label: localize('512×512 (Free)', '512×512（免费）'),
    totalOutputs: 0,
    tokenUsage: 0,
    footnote: localize('Free for everyone (Console + API). Does not consume tokens.', '全部免费（控制台 + API），不消耗 tokens。'),
  },
  {
    tier: 'tier-1024',
    icon: '📱',
    label: '1024×1024',
    totalOutputs: 0,
    tokenUsage: 0,
    footnote: localize('1 token per output (Console + API).', '每张输出 1 token（控制台 + API）。'),
  },
  {
    tier: 'tier-2048',
    icon: '🖥️',
    label: '2048×2048',
    totalOutputs: 0,
    tokenUsage: 0,
    footnote: localize('2 tokens per output (Console + API).', '每张输出 2 tokens（控制台 + API）。'),
  },
  {
    tier: 'tier-4096',
    icon: '🎬',
    label: '4096×4096',
    totalOutputs: 0,
    tokenUsage: 0,
    footnote: localize('8 tokens per output. Non-standard sizes round up to the nearest tier.', '每张输出 8 tokens。非标准尺寸按向上取整到最近一档计费。'),
  },
] : sizeCards.value)
const platformSetupCards = computed(() => [
  {
    label: localize('Categories Ready', '分类已就绪'),
    value: totalCategoryCount.value.toLocaleString(),
    subtitle: localize(
      `${topLevelCategoryCount.value || officialCategoryRootNames.length} top-level · ${leafCategoryCount.value.toLocaleString()} leaf`,
      `${topLevelCategoryCount.value || officialCategoryRootNames.length} 个一级分类 · ${leafCategoryCount.value.toLocaleString()} 个叶子分类`,
    ),
    icon: '🏷️',
    primary: true,
  },
  {
    label: localize('Templates', '模板'),
    value: items.value.length.toLocaleString(),
    subtitle: items.value.length ? localize('Ready for review', '可供审核') : localize('No templates', '暂无模板'),
    icon: '📚',
    primary: false,
  },
  {
    label: localize('API Keys', 'API 密钥'),
    value: developerApiKeys.value.length.toLocaleString(),
    subtitle: developerApiKeys.value.length ? localize('Keys ready', '密钥已就绪') : localize('No keys', '暂无密钥'),
    icon: '🧪',
    primary: false,
  },
  {
    label: localize('Billing Rules', '计费规则'),
    value: localize('Ready', '已就绪'),
    subtitle: localize('512×512 is free for everyone (Console + API). 1024 / 2048 / 4096 are billed at 1 / 2 / 8 tokens.', '512×512 全部免费（控制台 + API）。1024 / 2048 / 4096 分别按 1 / 2 / 8 tokens 计费。'),
    icon: '💳',
    primary: false,
  },
])
const latestCommissionRecord = computed(() => commissionRecords.value[0] || null)

function resolveCommissionResourceLabel(record: CommissionRecordItem | null) {
  if (!record) return localize("No earnings", "暂无收益")
  const resourceType = String(record.resource_type || "template").toLowerCase()
  if (resourceType === 'artwork') {
    return record.artwork_name || record.resource_name || record.artwork_code || record.artwork_id || localize('Artwork', '作品')
  }
  return record.template_name || record.resource_name || record.template_id || localize('Template', '模板')
}

const latestCommissionResourceLabel = computed(() => resolveCommissionResourceLabel(latestCommissionRecord.value))
const latestCommissionResourceAt = computed(() => {
  const formatted = formatDateLabel(latestCommissionRecord.value?.created_at)
  return formatted || localize('No commission activity yet', '暂无佣金活动')
})
const showCommerceEmptyState = computed(() => (
  !commerceLoading.value
  && !commerceError.value
  && !commissionRecords.value.length
  && !Number(creatorEarnings.value?.record_count || 0)
))

function formatDateLabel(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function deriveTierFromOutputSize(outputSize: string) {
  const value = String(outputSize || "").trim().toLowerCase()
  if (!value) return "512"
  const parts = value.includes("x") ? value.split("x", 2) : [value, value]
  const w = parseInt(String(parts[0]).replace(/[^0-9]/g, ""), 10) || 0
  const h = parseInt(String(parts[1]).replace(/[^0-9]/g, ""), 10) || 0
  const maxDim = Math.max(w, h)
  if (!maxDim) return "512"
  let tier = 512
  while (tier < maxDim) tier *= 2
  if (tier > 4096) tier = 4096
  return String(tier)
}

const sizeCards = computed(() => {
  const totals: Record<string, { outputs: number; tokens: number }> = {}
  for (const item of renderBillingEvents.value) {
    const tier = deriveTierFromOutputSize(String(item.meta?.output_size || item.meta?.size_tier || "512"))
    const outputs = Number(item.meta?.outputs || item.meta?.billable_outputs || item.meta?.output_count || 0)
    const tokens = Number(item.meta?.tokens || 0)
    totals[tier] = {
      outputs: (totals[tier]?.outputs || 0) + outputs,
      tokens: (totals[tier]?.tokens || 0) + tokens,
    }
  }
  return [
    {
      tier: '512',
      icon: '⚡',
      label: '512×512',
      totalOutputs: totals["512"]?.outputs || 0,
      tokenUsage: totals["512"]?.tokens || 0,
      footnote: localize('512×512 is free for everyone (Console + API).', '512×512 全部免费（控制台 + API）。'),
    },
    {
      tier: '1024',
      icon: '📱',
      label: '1024×1024',
      totalOutputs: totals["1024"]?.outputs || 0,
      tokenUsage: totals["1024"]?.tokens || 0,
      footnote: localize('All 1024 outputs are billed by size and output count.', '所有 1024 输出均按尺寸和输出数量计费。'),
    },
    {
      tier: '2048',
      icon: '🖥️',
      label: '2048×2048',
      totalOutputs: totals["2048"]?.outputs || 0,
      tokenUsage: totals["2048"]?.tokens || 0,
      footnote: localize('High-resolution exports for detail views and marketing.', '适用于细节展示和营销场景的高分辨率输出。'),
    },
    {
      tier: '4096',
      icon: '🎬',
      label: '4096×4096',
      totalOutputs: totals["4096"]?.outputs || 0,
      tokenUsage: totals["4096"]?.tokens || 0,
      footnote: localize('Large exports for campaigns and premium deliverables.', '适用于营销活动和高规格交付的大尺寸输出。'),
    },
  ]
})

const currentPlanName = computed(() => {
  if (isPlatformAdmin.value) return localize('Platform Admin', '平台管理员')
  return getPlanDisplayName(entitlements.value?.plan_code)
})

const planBadgeClass = computed(() => {
  if (isPlatformAdmin.value) return 'badge-pro'
  if (normalizePlanCode(entitlements.value?.plan_code) !== 'starter') return 'badge-pro'
  return 'badge-free'
})

const subscriptionStatusClass = computed(() => {
  if (isPlatformAdmin.value) return 'status-pro'
  if (normalizePlanCode(entitlements.value?.plan_code) !== 'starter') return 'status-pro'
  return 'status-free'
})

const subscriptionStatusIcon = computed(() => {
  if (isPlatformAdmin.value) return '🛡️'
  if (normalizePlanCode(entitlements.value?.plan_code) === 'enterprise') return '🏆'
  if (normalizePlanCode(entitlements.value?.plan_code) === 'tokens') return '⭐'
  return '🌱'
})

const subscriptionTimelineLabel = computed(() => {
  if (isPlatformAdmin.value) return localize('Platform-wide administration', '平台级管理权限')
  if (subscription.value?.status === 'trialing' && subscription.value.trial_ends_at) {
    return localize(
      `Trial access until ${formatDateLabel(subscription.value.trial_ends_at)}`,
      `试用权限至 ${formatDateLabel(subscription.value.trial_ends_at)}`,
    )
  }
  if (subscription.value?.billing_cycle === 'usage') {
    return localize('Usage-based access', '按用量访问')
  }
  if (subscription.value?.current_period_ends_at) {
    return localize(
      `${subscription.value.billing_cycle} cycle ends ${formatDateLabel(subscription.value.current_period_ends_at)}`,
      `${subscription.value.billing_cycle} 周期结束于 ${formatDateLabel(subscription.value.current_period_ends_at)}`,
    )
  }
  return localize('Subscription details from your tenant profile', '订阅详情来自你的租户资料')
})

const publishedTemplates = computed(() => {
  return items.value?.filter((t) => t.tenant_api_status === 'enabled').length || 0
})

const previewAllowanceSummary = computed(() => {
  if (isPlatformAdmin.value) return localize('512×512 is free for everyone (Console + API). 1024 / 2048 / 4096 are billed at 1 / 2 / 8 tokens; non-standard sizes are rounded up to the nearest tier.', '512×512 全部免费（控制台 + API）。1024 / 2048 / 4096 分别按 1 / 2 / 8 tokens 计费；非标准尺寸按向上取整到最近一档计费。')
  return localize('512×512 is free for everyone (Console + API). 1024 / 2048 / 4096 are billed at 1 / 2 / 8 tokens; non-standard sizes are rounded up to the nearest tier.', '512×512 全部免费（控制台 + API）。1024 / 2048 / 4096 分别按 1 / 2 / 8 tokens 计费；非标准尺寸按向上取整到最近一档计费。')
})

function formatTokenAmount(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "0"
  return amount.toFixed(4).replace(/\.?0+$/, "")
}

async function loadDashboardSafely() {
  dashboardLoading.value = true
  dashboardError.value = ""
  commerceError.value = ""
  try {
    await templatesStore.load()
    if (authStore.authHeaders.Authorization && authStore.tenant?.tenant_id) {
      const tenantId = authStore.tenant.tenant_id
      commerceLoading.value = true
      const results = await Promise.allSettled([
        platformStore.loadCurrentTenant(authStore.authHeaders),
        platformStore.loadUsage(tenantId, "", "", authStore.authHeaders),
        platformStore.loadBillingEvents({ auth: authStore.authHeaders, tenantId, limit: 200 }),
        platformStore.loadTokenOrders({ auth: authStore.authHeaders, tenantId, limit: 100 }),
        platformStore.loadCreatorEarnings({ auth: authStore.authHeaders, tenantId }),
        platformStore.loadCommissionRecords({ auth: authStore.authHeaders, tenantId, limit: 20 }),
        platformStore.loadTemplateCategories(authStore.authHeaders),
        platformStore.loadDeveloperApiKeys(authStore.authHeaders),
        platformStore.loadDeveloperMetrics(authStore.authHeaders),
        authStore.refreshSession(),
      ])
      const failures = results
        .filter((item): item is PromiseRejectedResult => item.status === "rejected")
        .map((item) => String(item.reason || localize("Unknown error", "未知错误")))
      if (failures.length) {
        dashboardError.value = failures[0]
      }
      if (results[4]?.status === "rejected" || results[5]?.status === "rejected") {
        commerceError.value = failures[0] || localize("Failed to load creator earnings.", "加载创作者收益失败。")
      }
      commerceLoading.value = false
    }
  } catch (error) {
    dashboardError.value = String((error as Error)?.message || error || localize("Failed to load dashboard.", "加载仪表盘失败。"))
  } finally {
    dashboardLoading.value = false
    commerceLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadDashboardSafely()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Console Header */
.dashboard-header {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.welcome-section h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.welcome-emoji {
  display: inline-block;
  margin-right: 0.4rem;
}

/* Platform admin quick links */
.quick-links-section {
  margin-bottom: 1.5rem;
}

.quick-links-header {
  text-align: left;
  margin-bottom: 1rem;
}

.quick-links-header .section-title {
  font-size: 1.15rem;
  margin-bottom: 0.25rem;
}

.quick-links-header .section-subtitle {
  font-size: 0.9rem;
}

.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.quick-link-card:hover {
  border-color: #6366f1;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.12);
}

.quick-link-icon {
  font-size: 1.5rem;
  min-width: 32px;
  text-align: center;
}

.quick-link-title {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.98rem;
  margin-bottom: 0.15rem;
}

.quick-link-desc {
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.35;
}

.welcome-subtitle {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.6;
}

.subscription-status-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  min-width: 280px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.plan-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-trial { background: #f59e0b; color: white; }
.badge-pro { background: #10b981; color: white; }
.badge-free { background: #6b7280; color: white; }

.status-icon {
  font-size: 1.5rem;
}

.plan-description {
  color: #0f172a;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.status-timeline {
  font-size: 0.875rem;
  color: #64748b;
}

/* Tenant token summary (compact card with link) */
.tenant-token-summary { margin-bottom: 1.5rem; }
.token-summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
  border: 1px solid #c7d2fe;
  border-radius: 0.85rem;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.1);
}
.token-summary-icon { font-size: 1.6rem; }
.token-summary-body { flex: 1; min-width: 0; }
.token-summary-label { color: #4338ca; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.token-summary-value { font-size: 1.65rem; font-weight: 800; color: #0f172a; line-height: 1.1; margin-top: 0.15rem; }
.token-summary-meta { color: #64748b; font-size: 0.85rem; margin-top: 0.2rem; }
.token-summary-link { color: #4338ca; font-weight: 700; text-decoration: none; padding: 0.55rem 0.9rem; border: 1px solid #c7d2fe; border-radius: 999px; background: #fff; white-space: nowrap; }
.token-summary-link:hover { background: #eef2ff; }

/* Core SAAS Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.metric-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  border-color: #bfdbfe;
}

.metric-card.primary {
  border-color: #6366f1;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.metric-card.metric-disabled {
  opacity: 0.6;
}

.token-alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  margin-bottom: 2rem;
}

.token-alert-banner.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.token-alert-banner p {
  margin: 0.35rem 0 0 0;
  color: #475569;
}

.state-card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.1rem 1.25rem;
  border-radius: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.state-card.compact {
  margin-top: 1rem;
}

.state-card.error {
  background: #fff7f7;
  border-color: #fecaca;
}

.state-note {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.5;
}

.state-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.commerce-section {
  margin-bottom: 2rem;
}

.commerce-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.commerce-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.commerce-label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.commerce-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: #1f2937;
  line-height: 1.1;
}

.commerce-subtitle {
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.5;
}

.commerce-note {
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.5;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.metric-icon {
  font-size: 1.4rem;
  min-width: 28px;
}

.metric-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.85rem;
}

.metric-number {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 0.35rem;
}

.metric-subtitle {
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 0;
}

.metric-progress {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  transition: width 0.3s ease;
}

.progress-fill.progress-warning {
  background: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
}

.metric-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  transition: all 0.3s ease;
}

.status-indicator.active {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}

.subscription-section {
  margin-bottom: 3rem;
}

.subscription-card {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffffff 0%, #eef2ff 100%);
  border: 1px solid #dbe3f0;
  box-shadow: 0 18px 40px rgba(99, 102, 241, 0.08);
}

.subscription-copy,
.subscription-summary,
.subscription-features {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6366f1;
}

.subscription-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #1f2937;
}

.subscription-text,
.summary-line {
  color: #4b5563;
  line-height: 1.6;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.subscription-features {
  grid-column: 1 / -1;
  flex-direction: row;
  flex-wrap: wrap;
}

.feature-chip {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: white;
  border: 1px solid #dbe3f0;
  color: #334155;
  font-weight: 600;
}

.feature-chip.disabled {
  opacity: 0.55;
}

.subscription-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.subscription-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.2rem;
  border-radius: 14px;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  font-weight: 700;
}

.subscription-button.primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.subscription-button.secondary {
  background: white;
  color: #4f46e5;
  border: 1px solid #c7d2fe;
}

/* Actions Grid */
.actions-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  position: relative;
}

.action-card:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.15);
}

.action-icon {
  font-size: 1.5rem;
  min-width: 32px;
}

.action-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.action-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.action-arrow {
  margin-left: auto;
  font-size: 1.25rem;
  color: #6366f1;
  transition: transform 0.3s ease;
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
}

/* Features Section */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  border-color: #6366f1;
}

.feature-item.feature-disabled {
  opacity: 0.5;
}

.feature-icon {
  font-weight: 700;
  min-width: 24px;
  font-size: 1.125rem;
}

.feature-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.feature-description {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Trial Banner */
.trial-banner {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 3rem;
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.banner-icon {
  font-size: 3rem;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
}

.banner-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.banner-description {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.trial-button {
  background: white;
  color: #6366f1;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.trial-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(255, 255, 255, 0.3);
}

.trial-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Activity Section */
.activity-section {
  margin-bottom: 3rem;
}

.activity-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1rem;
}

.activity-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.activity-card:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.15);
}

.activity-icon {
  font-size: 1.5rem;
  min-width: 32px;
}

.activity-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.activity-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.activity-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Quality Breakdown Section */
.quality-section {
  margin-bottom: 3rem;
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.section-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 0;
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.quality-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
}

.quality-card:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.15);
}

.quality-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.quality-icon {
  font-size: 2rem;
  min-width: 48px;
}

.quality-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.quality-price {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.quality-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.quality-footnote {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.85rem;
  color: #64748b;
}

/* API Section */
.api-section {
  margin-bottom: 3rem;
}

.api-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

.api-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.api-status.api-enabled {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #22c55e;
}

.api-status.api-disabled {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #ef4444;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  transition: all 0.3s ease;
}

.status-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.status-text {
  flex: 1;
}

.status-text h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.status-text p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.status-actions {
  display: flex;
  gap: 0.5rem;
}

.api-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 2rem;
}

/* Tokens Section */
.tokens-section {
  margin-bottom: 3rem;
}

.tokens-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.tokens-purchase h3,
.tokens-history h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.credit-packages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.package-item {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.package-item:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.15);
}

.package-item.featured {
  border-color: #6366f1;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.package-badge {
  position: absolute;
  top: -10px;
  right: 1rem;
  background: #6366f1;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.package-tokens {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.package-price {
  font-size: 1.25rem;
  font-weight: 600;
  color: #6366f1;
}

.package-desc {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.activity-icon {
  font-size: 1.25rem;
  min-width: 24px;
}

.activity-details {
  flex: 1;
}

.activity-details h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.activity-details p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.activity-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.activity-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: white;
  color: #6366f1;
  border: 2px solid #6366f1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover:not(:disabled) {
  background: #6366f1;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
  }

  .tokens-grid {
    grid-template-columns: 1fr;
  }
  
  .quality-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .section-title {
    font-size: 1.5rem;
  }
  
  .quality-header {
    flex-direction: column;
    text-align: center;
  }
  
  .api-status {
    flex-direction: column;
    text-align: center;
  }
  
  .status-actions {
    margin-top: 1rem;
  }
  
  .api-features {
    grid-template-columns: 1fr;
  }
  
  .activity-item {
    flex-direction: column;
    text-align: center;
  }
  
  .activity-meta {
    align-items: center;
  }
}
</style>
