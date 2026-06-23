<template>
  <div class="developer-console-page" data-testid="admin-developer-console-page">
    <header class="page-header">
      <div class="page-copy">
        <h1 class="page-title">{{ activeSectionMeta.heading }}</h1>
        <p class="page-subtitle">{{ activeSectionMeta.description }}</p>
      </div>
      <div class="header-actions">
        <RouterLink to="/api" class="btn-secondary">{{ localize("Open Public API Docs", "打开公开 API 文档") }}</RouterLink>
        <button v-if="activeSection === 'keys-access'" class="btn-primary" @click="openCreateModal">{{ localize("Create API Key", "创建 API Key") }}</button>
      </div>
    </header>

    <div class="kpi-strip">
      <div class="kpi-card">
        <span class="kpi-label">{{ localize("Active API Keys", "活跃 API Key") }}</span>
        <strong class="kpi-value">{{ kpiActiveKeys }}</strong>
        <span class="kpi-help">{{ localize(`${kpiTotalKeys} total`, `共 ${kpiTotalKeys} 个`) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">{{ localize("24h External Calls", "24 小时外部调用") }}</span>
        <strong class="kpi-value">{{ usageSummary.eventCount24h }}</strong>
        <span class="kpi-help">{{ usageSummary.eventsLastHour }} {{ localize("in last hour", "最近 1 小时") }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">{{ localize("Error Rate (24h)", "错误率(24h)") }}</span>
        <strong class="kpi-value" :class="kpiErrorRate > 5 ? 'kpi-warn' : ''">{{ kpiErrorRate.toFixed(1) }}%</strong>
        <span class="kpi-help">{{ localize(`${kpiErrorCount} non-2xx`, `${kpiErrorCount} 次非 2xx`) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">{{ localize("Billed Events", "计费事件") }}</span>
        <strong class="kpi-value">{{ usageSummary.billedRenderCount }}</strong>
        <span class="kpi-help">{{ usageSummary.latestChargeLabel }}</span>
      </div>
      <div class="kpi-card kpi-card--chart">
        <span class="kpi-label">{{ localize("72h Trend", "72 小时趋势") }}</span>
        <svg class="kpi-spark" viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true">
          <polyline :points="trendPolylinePoints" fill="none" stroke="#6366f1" stroke-width="2" />
          <polyline :points="trendAreaPoints" fill="rgba(99,102,241,0.18)" stroke="none" />
        </svg>
        <span class="kpi-help">{{ localize(`Peak ${trendPeak}/h`, `峰值 ${trendPeak}/h`) }}</span>
      </div>
    </div>

    <nav class="workspace-nav">
      <RouterLink
        v-for="item in sectionItems"
        :key="item.key"
        :to="item.to"
        class="workspace-chip"
        :class="{ active: activeSection === item.key }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <main class="console-main">
        <section id="section-keys-access" v-show="activeSection === 'keys-access'" class="section-panel">
          <div class="content-grid content-grid--keys">
            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("API Keys", "API Key") }}</h3>
                <span class="panel-caption">{{ localize("The raw key is shown once.", "原始 Key 仅显示一次。") }}</span>
              </div>
              <div v-if="latestApiKey" class="code-block">
                <div class="code-block-top">
                  <span class="code-block-label">{{ localize("Latest Raw Key", "最新原始 Key") }}</span>
                  <div class="code-block-actions">
                    <button class="code-action" @click="copyLatestKey">{{ latestKeyCopied ? localize("Copied", "已复制") : localize("Copy", "复制") }}</button>
                    <button class="code-action code-action-muted" @click="clearLatestKey">{{ localize("Hide", "隐藏") }}</button>
                  </div>
                </div>
                <pre><code>x-api-key: {{ latestApiKey }}</code></pre>
              </div>
              <p v-if="actionSuccess" class="action-feedback action-feedback-success">{{ actionSuccess }}</p>
              <p v-if="actionError" class="action-feedback action-feedback-error">{{ actionError }}</p>
              <div v-if="apiKeys.length" class="item-list">
                <div v-for="item in apiKeys" :key="item.api_key_id" class="item-row">
                  <div class="item-main">
                    <strong>{{ item.label }}</strong>
                    <p>{{ item.key_prefix }}</p>
                    <span class="item-meta">{{ localize("Created", "创建于") }} {{ formatKeyDate(item.created_at) }}</span>
                  </div>
                  <div class="item-side">
                    <span class="status-pill" :class="String(item.status).toLowerCase()">{{ item.status }}</span>
                    <div class="row-actions">
                      <button
                        class="mini-action"
                        @click="toggleApiKey(item)"
                        :disabled="busyApiKeyId === item.api_key_id"
                      >
                        {{ item.status === "active" ? localize("Disable", "禁用") : localize("Enable", "启用") }}
                      </button>
                      <button
                        class="mini-action mini-action-danger"
                        @click="deleteApiKey(item)"
                        :disabled="busyApiKeyId === item.api_key_id"
                      >
                        {{ localize("Delete", "删除") }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">{{ localize("No API key yet.", "还没有 API Key。") }}</div>
            </section>

            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Access Rules", "访问规则") }}</h3>
                <RouterLink :to="buildSectionLink('docs-flow')" class="inline-link">{{ localize("Open Docs & Flow", "打开文档与流程") }}</RouterLink>
              </div>
              <div class="scope-chips">
                <span v-for="scope in sdkScopes" :key="scope" class="scope-chip">{{ scope }}</span>
                <span v-if="!sdkScopes.length" class="empty-state inline">{{ localize("No scopes granted.", "尚未授予任何范围。") }}</span>
              </div>
              <div class="signal-list inline-space">
                <div class="signal-row">
                  <strong>{{ localize("Authentication", "认证") }}</strong>
                  <p>{{ localize("Third-party integrations use ", "第三方集成仅使用 ") }}<code>x-api-key</code>{{ localize(" only.", "。") }}</p>
                </div>
                <div class="signal-row">
                  <strong>{{ localize("Rate Limits", "限流规则") }}</strong>
                  <p>{{ localize("Default limit is 300 requests per minute per key.", "默认限制为每个 Key 每分钟 300 次请求。") }}</p>
                </div>
              </div>
            </section>

            <section class="panel-card panel-card--integrations">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Integrations & Test", "集成与测试") }}</h3>
                <span class="panel-caption">{{ localize("Download the WordPress plugin and verify your key.", "下载 WordPress 插件并验证你的 Key。") }}</span>
              </div>
              <div class="signal-list inline-space">
                <div class="signal-row">
                  <strong>{{ localize("WordPress Plugin", "WordPress 插件") }}</strong>
                  <p>{{ localize("Bind WooCommerce products with the latest Mockup100 Preview workspace.", "在 WooCommerce 商品中绑定最新的 Mockup100 Preview 工作台。") }}</p>
                  <a :href="pluginDownloadUrl" class="inline-link" download>{{ localize("Download mockup100-pod-customizer-wp.zip", "下载 mockup100-pod-customizer-wp.zip") }}</a>
                </div>
                <div class="signal-row">
                  <strong>{{ localize("Test Connection", "测试连接") }}</strong>
                  <p>{{ localize("Paste a raw API key and we will call ", "粘贴原始 API Key，我们将调用 ") }}<code>/api/v1/external/templates?limit=1</code>{{ localize(" to verify it.", " 进行验证。") }}</p>
                  <form class="test-connection-row" @submit.prevent="runTestConnection">
                    <input
                      v-model.trim="testApiKeyInput"
                      type="password"
                      class="modal-input"
                      :placeholder="localize('mk_xxx... raw key', 'mk_xxx... 原始 Key')"
                      autocomplete="off"
                    />
                    <button type="submit" class="btn-secondary" :disabled="testRunning || !testApiKeyInput">
                      {{ testRunning ? localize("Testing...", "测试中...") : localize("Test Run", "运行测试") }}
                    </button>
                  </form>
                  <p v-if="testResultMessage" class="action-feedback" :class="testResultOk ? 'action-feedback-success' : 'action-feedback-error'">{{ testResultMessage }}</p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="section-usage-activity" v-show="activeSection === 'usage-activity'" class="section-panel">
          <div class="summary-grid secondary">
            <div class="summary-card">
              <span class="summary-label">{{ localize("24h External Events", "24 小时外部事件") }}</span>
              <strong>{{ usageSummary.eventCount24h }}</strong>
              <span class="summary-help">{{ usageSummary.eventsLastHour }} {{ localize("in the last hour", "最近 1 小时") }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">{{ localize("Charge Snapshot", "计费快照") }}</span>
              <strong>{{ usageSummary.latestChargeLabel }}</strong>
              <span class="summary-help">{{ usageSummary.billedRenderCount }} {{ localize("billed external events", "已计费外部事件") }}</span>
            </div>
          </div>
          <div class="content-grid content-grid--usage usage-grid">
            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Recent External API Events", "最近外部 API 事件") }}</h3>
              <span class="panel-caption">{{ localize("Only ", "仅显示 ") }}<code>/api/v1/external/*</code>{{ localize(".", "。") }}</span>
              </div>
              <div v-if="usageEventRows.length" class="item-list">
                <div v-for="event in usageEventRows" :key="event.id" class="item-row">
                  <div>
                    <strong>{{ event.eventType }}</strong>
                    <p>{{ event.summary }}</p>
                  </div>
                  <div class="meta-stack">
                    <span>{{ event.status }} · {{ event.authMode }}</span>
                    <span>{{ event.units }} units</span>
                    <span>{{ formatUsageDateTime(event.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">{{ localize("No usage yet.", "暂无使用记录。") }}</div>
            </section>

            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Recent Runtime Charges", "最近运行时计费") }}</h3>
              </div>
              <div v-if="chargeRows.length" class="item-list">
                <div v-for="charge in chargeRows" :key="charge.id" class="item-row">
                  <div>
                    <strong>{{ charge.pricingKey }}</strong>
                    <p>{{ charge.outputSummary }}</p>
                  </div>
                  <div class="meta-stack">
                    <span>{{ charge.amountLabel }}</span>
                    <span>{{ formatUsageDateTime(charge.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">{{ localize("No billed runtime events.", "暂无已计费运行时事件。") }}</div>
            </section>
          </div>
        </section>

        <section id="section-webhooks" v-show="activeSection === 'webhooks'" class="section-panel">
          <div class="content-grid">
            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Endpoints", "Endpoint 列表") }}</h3>
                <span class="panel-caption">{{ localize("Webhooks signed with HMAC-SHA256.", "使用 HMAC-SHA256 签名。") }}</span>
              </div>
              <div v-if="webhookEndpoints.length" class="item-list">
                <div v-for="item in webhookEndpoints" :key="item.id" class="item-row item-row--webhook">
                  <div class="item-main">
                    <strong>{{ item.url }}</strong>
                    <p class="webhook-events">
                      <span v-for="event in item.events" :key="event" class="webhook-event-chip">{{ event }}</span>
                    </p>
                    <span class="item-meta">{{ localize("Created", "创建于") }} {{ formatUsageDateTime(item.created_at) }}</span>
                    <details class="webhook-secret-block">
                      <summary>{{ localize("Reveal signing secret", "查看签名密钥") }}</summary>
                      <div class="webhook-secret-row">
                        <code>{{ item.secret }}</code>
                        <button class="mini-action" @click="copyWebhookSecret(item)">{{ localize("Copy", "复制") }}</button>
                      </div>
                    </details>
                  </div>
                  <div class="item-side">
                    <span class="status-pill" :class="item.status">{{ item.status }}</span>
                    <div class="row-actions">
                      <button class="mini-action" @click="sendWebhookTest(item)">{{ localize("Send test", "发送测试") }}</button>
                      <button class="mini-action" @click="toggleWebhookEndpointStatus(item.id)">
                        {{ item.status === "active" ? localize("Pause", "暂停") : localize("Resume", "恢复") }}
                      </button>
                      <button class="mini-action mini-action-danger" @click="deleteWebhookEndpoint(item.id)">{{ localize("Delete", "删除") }}</button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">{{ localize("No webhook endpoint yet.", "还没有 webhook endpoint。") }}</div>
            </section>

            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Add Endpoint", "新增 Endpoint") }}</h3>
                <span class="panel-caption">{{ localize("Backend persistence is rolling out next; for now drafts live in your browser.", "后端持久化即将上线;当前草稿保存在浏览器本地。") }}</span>
              </div>
              <label class="modal-label">{{ localize("URL", "URL") }}</label>
              <input v-model.trim="webhookForm.url" type="url" class="modal-input" placeholder="https://your-app.com/hooks/mockup100" />
              <label class="modal-label">{{ localize("Events", "事件") }}</label>
              <div class="webhook-event-grid">
                <button
                  v-for="event in WEBHOOK_EVENT_OPTIONS"
                  :key="event"
                  type="button"
                  class="webhook-event-toggle"
                  :class="{ active: isWebhookEventSelected(event) }"
                  @click="toggleWebhookEvent(event)"
                >{{ event }}</button>
              </div>
              <label class="modal-label">{{ localize("Signing Secret (optional)", "签名密钥(可选)") }}</label>
              <input v-model.trim="webhookForm.secret" type="text" class="modal-input" :placeholder="localize('Auto-generate when blank', '留空自动生成')" />
              <p v-if="webhookFeedback" class="action-feedback" :class="webhookFeedbackOk ? 'action-feedback-success' : 'action-feedback-error'">{{ webhookFeedback }}</p>
              <div class="modal-actions">
                <button class="btn-primary" :disabled="webhookSaving" @click="saveWebhookEndpoint">
                  {{ webhookSaving ? localize("Saving...", "保存中...") : localize("Save Endpoint", "保存 Endpoint") }}
                </button>
              </div>
            </section>

            <section class="panel-card panel-card--full">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Recent Deliveries", "最近投递") }}</h3>
                <span class="panel-caption">{{ webhookDeliveries.length }} {{ localize("attempts", "次尝试") }}</span>
              </div>
              <div v-if="webhookDeliveries.length" class="item-list">
                <div v-for="delivery in webhookDeliveries" :key="delivery.id" class="item-row">
                  <div class="item-main">
                    <strong>{{ delivery.event }}</strong>
                    <p>{{ webhookEndpoints.find((row) => row.id === delivery.endpoint_id)?.url || delivery.endpoint_id }}</p>
                    <span class="item-meta">{{ formatUsageDateTime(delivery.attempted_at) }} · attempt #{{ delivery.attempt }}</span>
                  </div>
                  <div class="item-side">
                    <span class="status-pill" :class="delivery.status">{{ delivery.status }}</span>
                    <span class="webhook-http-status">HTTP {{ delivery.http_status || "-" }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">{{ localize("No deliveries recorded yet.", "暂无投递记录。") }}</div>
            </section>
          </div>
        </section>

        <section id="section-docs-flow" v-show="activeSection === 'docs-flow'" class="section-panel">
          <div class="content-grid content-grid--docs">
            <section class="panel-card">
              <div class="panel-top">
                <h3 class="panel-title">{{ localize("Integration Playbook", "接入操作手册") }}</h3>
                <RouterLink to="/api" class="inline-link">{{ localize("Open public docs", "打开公开文档") }}</RouterLink>
              </div>
              <ol class="flow-list">
                <li>{{ localize("Open ", "打开 ") }}<code>/api</code>{{ localize(", keep the canonical ", "，保留规范的 ") }}<code>template_id</code>{{ localize(", use editor assets for reference display, and submit part images for final output.", "，使用编辑器资源做参考展示，并提交分面图片生成最终输出。") }}</li>
                <li>{{ localize("Create or rotate a key here.", "在这里创建或轮换 Key。") }}</li>
                <li>{{ localize("Enable API in Repository or confirm Marketplace API status.", "在模板库启用 API，或确认 Marketplace API 状态。") }}</li>
                <li>{{ localize("Call the external endpoints from your client.", "从你的客户端调用外部接口。") }}</li>
                <li>{{ localize("Return here to review usage and charges.", "返回这里查看用量与计费。") }}</li>
              </ol>
              <div class="reference-row">
                <span class="reference-label">{{ localize("Reference:", "参考资料：") }}</span>
                <code>repos/mockup-saas-sdk/docs/openapi-template-external.yaml</code>
                <RouterLink to="/admin/billing" class="inline-link">{{ localize("Billing review →", "计费检查 →") }}</RouterLink>
              </div>
            </section>
          </div>
        </section>
      </main>

    <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ localize("Create API key", "创建 API Key") }}</h3>
          <button class="modal-close" @click="closeCreateModal">{{ localize("x", "x") }}</button>
        </div>
        <label class="modal-label" for="api-key-label">{{ localize("Name", "名称") }}</label>
        <input
          id="api-key-label"
          v-model.trim="createLabel"
          type="text"
          class="modal-input"
          maxlength="80"
          :placeholder="localize('e.g. Production API Key', '例如：生产 API Key')"
          @keyup.enter="submitCreateApiKey"
        />
        <p v-if="modalError" class="modal-error">{{ modalError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeCreateModal">{{ localize("Cancel", "取消") }}</button>
          <button class="btn-primary" @click="submitCreateApiKey" :disabled="busyApiKeyId === '__create__'">
            {{ busyApiKeyId === "__create__" ? localize("Creating...", "创建中...") : localize("Create", "创建") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRevealModal" class="modal-backdrop" @click.self="closeRevealModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ revealedKeyTitle }}</h3>
          <button class="modal-close" @click="closeRevealModal">{{ localize("x", "x") }}</button>
        </div>
        <p class="modal-copy">
          {{ localize("Save this API key somewhere safe. For security reasons, you will not be able to see the raw key again from this page.", "请将此 API Key 妥善保存。出于安全原因，你之后将无法在此页面再次看到原始 Key。") }}
        </p>
        <div class="secret-box">{{ revealedKey }}</div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeRevealModal">{{ localize("Close", "关闭") }}</button>
          <button class="btn-primary" @click="copyRevealedKey">{{ revealedKeyCopied ? localize("Copied", "已复制") : localize("Copy", "复制") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { RouterLink, useRoute, useRouter } from "vue-router"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { usePlatformStore } from "../../stores/platform"
import {
  buildApiChargeRows,
  buildApiUsageSummary,
  buildDeveloperEventRows,
  formatUsageDateTime,
  normalizeSdkScopes,
} from "./apiUsageView"

type ConsoleSectionKey = "keys-access" | "usage-activity" | "webhooks" | "docs-flow"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const platformStore = usePlatformStore()

const { entitlements, tenant, authHeaders, isAuthenticated } = storeToRefs(authStore)
const { billingEvents, developerApiKeys, developerLogs, developerMetrics } = storeToRefs(platformStore)

const latestApiKey = ref("")
const latestKeyCopied = ref(false)
const showCreateModal = ref(false)
const showRevealModal = ref(false)
const createLabel = ref("")
const modalError = ref("")
const busyApiKeyId = ref("")
const revealedKey = ref("")
const revealedKeyTitle = ref(localize("Create API key", "创建 API Key"))
const revealedKeyCopied = ref(false)
const actionSuccess = ref("")
const actionError = ref("")
const testApiKeyInput = ref("")
const testRunning = ref(false)
const testResultMessage = ref("")
const testResultOk = ref(false)
const pluginDownloadUrl = "/api/v1/docs/wordpress-plugin/download"
function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const sectionItems: Array<{ key: ConsoleSectionKey; label: string; to: string }> = [
  {
    key: "keys-access",
    label: localize("Keys & Access", "密钥与访问"),
    to: "/admin/developer-console",
  },
  {
    key: "usage-activity",
    label: localize("Usage & Activity", "用量与活动"),
    to: "/admin/developer-console/usage-activity",
  },
  {
    key: "webhooks",
    label: localize("Webhooks", "Webhooks"),
    to: "/admin/developer-console/webhooks",
  },
  {
    key: "docs-flow",
    label: localize("Docs & Flow", "文档与流程"),
    to: "/admin/developer-console/docs-flow",
  },
]

function normalizeSection(value: unknown): ConsoleSectionKey {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === "usage-activity" || raw === "docs-flow" || raw === "webhooks") {
    return raw
  }
  return "keys-access"
}

function resolveActiveSection(path: string, legacySection: unknown): ConsoleSectionKey {
  if (path === "/admin/developer-console/keys-access") return "keys-access"
  if (path === "/admin/developer-console/usage-activity") return "usage-activity"
  if (path === "/admin/developer-console/webhooks") return "webhooks"
  if (path === "/admin/developer-console/docs-flow") return "docs-flow"
  return normalizeSection(legacySection)
}

const activeSection = computed(() => resolveActiveSection(route.path, route.query.section))
const activeSectionMeta = computed(() => {
  if (activeSection.value === "usage-activity") {
    return {
      heading: localize("Usage & Activity", "用量与活动"),
      description: localize("Review external API events, billed runtime activity, and recent usage signals.", "查看外部 API 事件、计费运行时活动和最近的使用信号。"),
    }
  }
  if (activeSection.value === "webhooks") {
    return {
      heading: localize("Webhooks", "Webhooks"),
      description: localize("Subscribe to async events, configure HMAC secrets, and inspect recent deliveries.", "订阅异步事件、配置 HMAC 密钥并查看最近投递记录。"),
    }
  }
  if (activeSection.value === "docs-flow") {
    return {
      heading: localize("Docs & Flow", "文档与流程"),
      description: localize("Follow the integration path, API references, and launch checks for external clients.", "查看外部客户端的接入路径、API 参考和上线检查。"),
    }
  }
  return {
    heading: localize("Keys & Access", "密钥与访问"),
    description: localize(
      "Create API keys, review granted scopes, and confirm external access rules.",
      "创建 API Key、查看已授予范围并确认外部访问规则。",
    ),
  }
})
const sdkScopes = computed(() => normalizeSdkScopes(entitlements.value?.sdk_api_scopes))
const apiKeys = computed(() => developerApiKeys.value)
const usageEventRows = computed(() => buildDeveloperEventRows(developerLogs.value))
const chargeRows = computed(() => buildApiChargeRows(billingEvents.value))
const usageSummary = computed(() =>
  buildApiUsageSummary(sdkScopes.value, developerMetrics.value, developerLogs.value, billingEvents.value),
)

// === KPI strip ===
const kpiTotalKeys = computed(() => apiKeys.value.length)
const kpiActiveKeys = computed(() => apiKeys.value.filter((item) => String(item.status).toLowerCase() === "active").length)

const kpiErrorCount = computed(() => {
  const cutoff = Date.now() - 24 * 3600 * 1000
  return (developerLogs.value || []).filter((log: any) => {
    const ts = log?.created_at ? Date.parse(String(log.created_at)) : 0
    if (!ts || ts < cutoff) return false
    const status = Number(log?.response_status ?? log?.http_status ?? log?.status_code ?? 0)
    return status >= 400
  }).length
})

const kpiErrorRate = computed(() => {
  const total = Number(usageSummary.value?.eventCount24h || 0)
  if (!total) return 0
  return (kpiErrorCount.value / total) * 100
})

// === 72h trend (per-hour bucket of dev logs) ===
const trendBuckets = computed<number[]>(() => {
  const buckets = new Array(72).fill(0)
  const now = Date.now()
  const start = now - 72 * 3600 * 1000
  for (const log of developerLogs.value || []) {
    const ts = log?.created_at ? Date.parse(String((log as any).created_at)) : 0
    if (!ts || ts < start || ts > now) continue
    const idx = Math.min(71, Math.floor((ts - start) / (3600 * 1000)))
    buckets[idx]++
  }
  return buckets
})
const trendPeak = computed(() => Math.max(1, ...trendBuckets.value))
const trendPolylinePoints = computed(() => {
  const peak = trendPeak.value
  return trendBuckets.value
    .map((value, index) => {
      const x = (index / 71) * 200
      const y = 50 - (value / peak) * 46
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
})
const trendAreaPoints = computed(() => `0,50 ${trendPolylinePoints.value} 200,50`)

// === Webhooks (local-storage stub until backend lands) ===
type WebhookEndpoint = {
  id: string
  url: string
  events: string[]
  secret: string
  status: "active" | "paused"
  created_at: string
}
type WebhookDelivery = {
  id: string
  endpoint_id: string
  event: string
  status: "delivered" | "failed" | "pending"
  http_status: number
  attempted_at: string
  attempt: number
}

const WEBHOOK_STORAGE_KEY = "mockup100.webhook.endpoints.v1"
const WEBHOOK_DELIVERY_STORAGE_KEY = "mockup100.webhook.deliveries.v1"
const WEBHOOK_EVENT_OPTIONS = [
  "render.completed",
  "render.failed",
  "artwork.purchased",
  "template.published",
  "key.rotated",
]

const webhookEndpoints = ref<WebhookEndpoint[]>([])
const webhookDeliveries = ref<WebhookDelivery[]>([])
const webhookForm = ref<{ url: string; events: string[]; secret: string }>({ url: "", events: ["render.completed"], secret: "" })
const webhookSaving = ref(false)
const webhookFeedback = ref("")
const webhookFeedbackOk = ref(false)

function loadWebhookStubs() {
  try {
    const rawEndpoints = window.localStorage.getItem(WEBHOOK_STORAGE_KEY)
    webhookEndpoints.value = rawEndpoints ? JSON.parse(rawEndpoints) : []
    const rawDeliveries = window.localStorage.getItem(WEBHOOK_DELIVERY_STORAGE_KEY)
    webhookDeliveries.value = rawDeliveries ? JSON.parse(rawDeliveries) : []
  } catch {
    webhookEndpoints.value = []
    webhookDeliveries.value = []
  }
}

function persistWebhookStubs() {
  try {
    window.localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(webhookEndpoints.value))
    window.localStorage.setItem(WEBHOOK_DELIVERY_STORAGE_KEY, JSON.stringify(webhookDeliveries.value))
  } catch { /* quota errors are benign for the stub */ }
}

function randomSecret() {
  const arr = new Uint8Array(24)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr)
  return "whsec_" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("")
}

const WEBHOOK_ENDPOINT_LIMIT = 20
const PRIVATE_HOST_PATTERN = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|fc00:|fd00:|0\.0\.0\.0)/i

function validateWebhookUrl(raw: string): { ok: boolean; reason: string } {
  let parsed: URL
  try { parsed = new URL(raw) } catch { return { ok: false, reason: "INVALID" } }
  if (parsed.protocol !== "https:") return { ok: false, reason: "NOT_HTTPS" }
  if (PRIVATE_HOST_PATTERN.test(parsed.hostname)) return { ok: false, reason: "PRIVATE_HOST" }
  return { ok: true, reason: "" }
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return "subtle-unavailable"
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(body))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function toggleWebhookEvent(name: string) {
  const list = new Set(webhookForm.value.events)
  if (list.has(name)) list.delete(name)
  else list.add(name)
  webhookForm.value = { ...webhookForm.value, events: Array.from(list) }
}

function isWebhookEventSelected(name: string) {
  return webhookForm.value.events.includes(name)
}

async function saveWebhookEndpoint() {
  webhookFeedback.value = ""
  const validation = validateWebhookUrl(webhookForm.value.url || "")
  if (!validation.ok) {
    if (validation.reason === "NOT_HTTPS") {
      webhookFeedback.value = localize("Endpoint URL must use https://", "URL 必须使用 https://")
    } else if (validation.reason === "PRIVATE_HOST") {
      webhookFeedback.value = localize("Private / loopback hosts are not allowed.", "禁止使用本地回环 / 私网地址。")
    } else {
      webhookFeedback.value = localize("Endpoint URL is invalid.", "URL 格式无效。")
    }
    webhookFeedbackOk.value = false
    return
  }
  if (!webhookForm.value.events.length) {
    webhookFeedback.value = localize("Select at least one event.", "至少选择一个事件。")
    webhookFeedbackOk.value = false
    return
  }
  if (webhookEndpoints.value.length >= WEBHOOK_ENDPOINT_LIMIT) {
    webhookFeedback.value = localize(`Limit reached: ${WEBHOOK_ENDPOINT_LIMIT} endpoints per tenant.`, `已达上限：每租户最多 ${WEBHOOK_ENDPOINT_LIMIT} 个 endpoint。`)
    webhookFeedbackOk.value = false
    return
  }
  webhookSaving.value = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  const next: WebhookEndpoint = {
    id: "wh_" + Math.random().toString(36).slice(2, 10),
    url: webhookForm.value.url.trim(),
    events: [...webhookForm.value.events],
    secret: webhookForm.value.secret || randomSecret(),
    status: "active",
    created_at: new Date().toISOString(),
  }
  webhookEndpoints.value = [next, ...webhookEndpoints.value]
  persistWebhookStubs()
  webhookFeedback.value = localize("Endpoint saved locally. Backend persistence is rolling out next.", "Endpoint 已保存到本地。后端持久化即将上线。")
  webhookFeedbackOk.value = true
  webhookForm.value = { url: "", events: ["render.completed"], secret: "" }
  webhookSaving.value = false
}

function toggleWebhookEndpointStatus(id: string) {
  webhookEndpoints.value = webhookEndpoints.value.map((item) =>
    item.id === id ? { ...item, status: item.status === "active" ? "paused" : "active" } : item,
  )
  persistWebhookStubs()
}

function deleteWebhookEndpoint(id: string) {
  if (!window.confirm(localize("Remove this webhook endpoint?", "确认删除该 webhook endpoint?"))) return
  webhookEndpoints.value = webhookEndpoints.value.filter((item) => item.id !== id)
  webhookDeliveries.value = webhookDeliveries.value.filter((item) => item.endpoint_id !== id)
  persistWebhookStubs()
}

async function sendWebhookTest(item: WebhookEndpoint) {
  const delivery: WebhookDelivery = {
    id: "evt_" + Math.random().toString(36).slice(2, 10),
    endpoint_id: item.id,
    event: item.events[0] || "render.completed",
    status: "pending",
    http_status: 0,
    attempted_at: new Date().toISOString(),
    attempt: 1,
  }
  webhookDeliveries.value = [delivery, ...webhookDeliveries.value].slice(0, 80)
  persistWebhookStubs()
  // 真实 HMAC-SHA256 签名（与文档一致：消费方用 secret 重新计算 hex digest 比对）
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify({
    id: delivery.id,
    event: delivery.event,
    timestamp,
    payload: { hello: "from mockup100", at: delivery.attempted_at, source: "test" },
  })
  let signature = "subtle-unavailable"
  try { signature = await hmacSha256Hex(item.secret, `${timestamp}.${body}`) } catch { /* keep fallback marker */ }
  try {
    const response = await fetch(item.url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
        "X-Mockup100-Event": delivery.event,
        "X-Mockup100-Timestamp": timestamp,
        "X-Mockup100-Signature": `sha256=${signature}`,
      },
      body,
    })
    delivery.http_status = response.status || 0
    delivery.status = response.ok || response.type === "opaque" ? "delivered" : "failed"
  } catch {
    delivery.status = "failed"
    delivery.http_status = 0
  }
  webhookDeliveries.value = [delivery, ...webhookDeliveries.value.filter((row) => row.id !== delivery.id)].slice(0, 80)
  persistWebhookStubs()
}

function copyWebhookSecret(item: WebhookEndpoint) {
  navigator.clipboard.writeText(item.secret).catch(() => {})
}

function buildSectionLink(section: ConsoleSectionKey) {
  return sectionItems.find((item) => item.key === section)?.to || "/admin/developer-console"
}

function openCreateModal() {
  actionError.value = ""
  actionSuccess.value = ""
  modalError.value = ""
  createLabel.value = ""
  showCreateModal.value = true
}

function closeCreateModal() {
  if (busyApiKeyId.value === "__create__") return
  showCreateModal.value = false
  modalError.value = ""
}

function openRevealModal(title: string, rawKey: string) {
  revealedKeyTitle.value = title
  revealedKey.value = rawKey
  revealedKeyCopied.value = false
  showRevealModal.value = true
}

function closeRevealModal() {
  showRevealModal.value = false
}

async function copyText(value: string) {
  if (!value) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

async function copyLatestKey() {
  latestKeyCopied.value = await copyText(latestApiKey.value)
  if (latestKeyCopied.value) {
    window.setTimeout(() => {
      latestKeyCopied.value = false
    }, 1500)
  }
}

async function copyRevealedKey() {
  revealedKeyCopied.value = await copyText(revealedKey.value)
  if (revealedKeyCopied.value) {
    window.setTimeout(() => {
      revealedKeyCopied.value = false
    }, 1500)
  }
}

function clearLatestKey() {
  latestApiKey.value = ""
  latestKeyCopied.value = false
}

function formatKeyDate(value?: string | null) {
  return value ? formatUsageDateTime(value) : "-"
}

async function submitCreateApiKey() {
  if (!authHeaders.value.Authorization) {
    router.push("/auth?mode=login")
    return
  }
  const label = createLabel.value.trim() || localize(`External API ${new Date().toISOString().slice(0, 16)}`, `外部 API ${new Date().toISOString().slice(0, 16)}`)
  busyApiKeyId.value = "__create__"
  modalError.value = ""
  actionError.value = ""
  actionSuccess.value = ""
  try {
    const response = await platformStore.createDeveloperApiKey(
      {
        label,
        scopes: sdkScopes.value.length ? sdkScopes.value : ["templates:read", "render:write"],
        rate_limit_per_minute: 300,
      },
      authHeaders.value,
    )
    latestApiKey.value = response.api_key
    showCreateModal.value = false
    openRevealModal(localize("Create API key", "创建 API Key"), response.api_key)
    actionSuccess.value = localize("API key created successfully.", "API Key 创建成功。")
    await platformStore.loadDeveloperApiKeys(authHeaders.value).catch(() => undefined)
  } catch (error) {
    modalError.value = String((error as Error).message || error)
  } finally {
    busyApiKeyId.value = ""
  }
}

async function toggleApiKey(item: { api_key_id: string; status: string }) {
  if (!authHeaders.value.Authorization) return
  busyApiKeyId.value = item.api_key_id
  actionError.value = ""
  actionSuccess.value = ""
  try {
    if (item.status === "active") {
      await platformStore.disableDeveloperApiKey(item.api_key_id, authHeaders.value)
      actionSuccess.value = localize("API key disabled.", "API Key 已禁用。")
    } else {
      await platformStore.enableDeveloperApiKey(item.api_key_id, authHeaders.value)
      actionSuccess.value = localize("API key enabled.", "API Key 已启用。")
    }
    await platformStore.loadDeveloperApiKeys(authHeaders.value).catch(() => undefined)
  } catch (error) {
    actionError.value = String((error as Error).message || error)
    throw error
  } finally {
    busyApiKeyId.value = ""
  }
}

async function deleteApiKey(item: { api_key_id: string; label: string }) {
  if (!authHeaders.value.Authorization) return
  const confirmed = window.confirm(localize(`Delete API key "${item.label}"? This action cannot be undone.`, `确定删除 API Key "${item.label}" 吗？此操作不可撤销。`))
  if (!confirmed) return
  busyApiKeyId.value = item.api_key_id
  actionError.value = ""
  actionSuccess.value = ""
  try {
    await platformStore.deleteDeveloperApiKey(item.api_key_id, authHeaders.value)
    if (!apiKeys.value.length) {
      latestApiKey.value = ""
    }
    actionSuccess.value = localize("API key deleted.", "API Key 已删除。")
  } catch (error) {
    actionError.value = String((error as Error).message || error)
    throw error
  } finally {
    busyApiKeyId.value = ""
  }
}

async function runTestConnection() {
  const rawKey = testApiKeyInput.value.trim()
  if (!rawKey) return
  testRunning.value = true
  testResultMessage.value = ""
  testResultOk.value = false
  try {
    const response = await fetch("/api/v1/external/templates?limit=1", {
      method: "GET",
      headers: { "x-api-key": rawKey, Accept: "application/json" },
    })
    const text = await response.text()
    if (response.ok) {
      testResultOk.value = true
      let count: number | null = null
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) count = parsed.length
        else if (Array.isArray(parsed?.records)) count = parsed.records.length
        else if (Array.isArray(parsed?.items)) count = parsed.items.length
      } catch { /* ignore parse error */ }
      testResultMessage.value = localize(
        `Connection OK (HTTP ${response.status}${count !== null ? `, ${count} template${count === 1 ? "" : "s"} returned` : ""}).`,
        `连接成功（HTTP ${response.status}${count !== null ? `，返回 ${count} 个模板` : ""}）。`,
      )
    } else {
      testResultOk.value = false
      const snippet = text ? text.slice(0, 200) : ""
      testResultMessage.value = localize(
        `Connection failed: HTTP ${response.status}${snippet ? ` - ${snippet}` : ""}`,
        `连接失败：HTTP ${response.status}${snippet ? ` - ${snippet}` : ""}`,
      )
    }
  } catch (error) {
    testResultOk.value = false
    testResultMessage.value = localize(
      `Network error: ${(error as Error).message || error}`,
      `网络错误：${(error as Error).message || error}`,
    )
  } finally {
    testRunning.value = false
  }
}

async function loadDeveloperConsoleData() {
  if (!isAuthenticated.value || !tenant.value?.tenant_id || !authHeaders.value.Authorization) return
  await Promise.all([
    platformStore.loadBillingEvents({ auth: authHeaders.value, tenantId: tenant.value.tenant_id, limit: 50 }).catch(() => undefined),
    platformStore.loadDeveloperApiKeys(authHeaders.value).catch(() => undefined),
    platformStore.loadDeveloperLogs(authHeaders.value, 50).catch(() => undefined),
    platformStore.loadDeveloperMetrics(authHeaders.value).catch(() => undefined),
  ])
}

onMounted(() => {
  loadWebhookStubs()
  loadDeveloperConsoleData()
})
</script>

<style scoped>
.developer-console-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  position: sticky;
  top: calc(72px + 0.75rem);
  z-index: 4;
  padding: 0.3rem;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 1rem;
  background: rgba(248, 250, 252, 0.82);
  backdrop-filter: blur(12px);
}

.workspace-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dbe3f0;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.workspace-chip:hover {
  border-color: #bfdbfe;
  color: #1d4ed8;
  transform: translateY(-1px);
}

.workspace-chip.active {
  background: #0f172a;
  color: #f8fafc;
  border-color: #0f172a;
}

.page-header,
.panel-top,
.item-row,
.meta-stack,
.summary-card,
.signal-row {
  display: flex;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.page-copy {
  max-width: 760px;
}

.page-eyebrow {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.page-title {
  margin: 0.55rem 0 0;
  font-size: 2rem;
  color: #0f172a;
}

.page-subtitle {
  margin: 0.5rem 0 0;
  color: #64748b;
  line-height: 1.6;
}

.header-actions,
.scope-chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.panel-card,
.summary-card,
.signal-row {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.console-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-subtitle code,
.flow-list code,
.panel-caption code,
.empty-state code,
.signal-row code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.summary-grid,
.content-grid,
.signal-list {
  display: grid;
  gap: 1rem;
}

.section-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-grid.secondary {
  margin-top: -0.1rem;
}

.summary-card {
  flex-direction: column;
  gap: 0.35rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  min-height: 100%;
}

.summary-label {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-card strong {
  color: #0f172a;
  font-size: 1.35rem;
}

.summary-help {
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.45;
}

.content-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.content-grid--keys {
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
}

.content-grid--usage {
  grid-template-columns: minmax(0, 1.18fr) minmax(300px, 0.82fr);
}

.content-grid--docs {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.content-grid .full-width {
  grid-column: 1 / -1;
}

.usage-grid .panel-card:first-child,
.usage-grid .panel-card:last-child {
  min-height: 100%;
}

.panel-card {
  padding: 1rem;
}

.panel-top {
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid #eef2f7;
}

.panel-title {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.panel-caption {
  color: #64748b;
  font-size: 0.85rem;
}

.signal-list {
  grid-template-columns: 1fr;
}

.text-link,
.inline-link {
  color: #1d4ed8;
  text-decoration: none;
  font-weight: 700;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.signal-row {
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.9rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  background: #f8fafc;
}

.signal-row p {
  margin: 0;
  color: #64748b;
  line-height: 1.55;
}

.test-connection-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.test-connection-row .modal-input {
  flex: 1;
  min-width: 220px;
  margin: 0;
}

.signal-row strong,
.item-row strong {
  color: #0f172a;
}

.inline-space {
  margin-top: 0.85rem;
}

.flow-list {
  margin: 0;
  padding-left: 1.1rem;
  color: #334155;
  line-height: 1.75;
}

.flow-list.compact {
  padding-left: 1rem;
}

.reference-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #eef2f7;
  font-size: 0.88rem;
  color: #475569;
}
.reference-label { font-weight: 700; color: #334155; }
.reference-row code { padding: 0.2rem 0.45rem; background: #f1f5f9; border-radius: 0.35rem; }
.reference-row .inline-link { margin-left: auto; }

.item-row {
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  background: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.item-row:hover {
  transform: translateY(-1px);
  border-color: #cbd5e1;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
}

.item-row p {
  margin: 0.3rem 0 0;
  color: #64748b;
  line-height: 1.5;
}

.item-main {
  min-width: 0;
}

.item-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
}

.item-meta {
  display: inline-flex;
  margin-top: 0.45rem;
  color: #94a3b8;
  font-size: 0.8rem;
}

.meta-stack {
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  min-width: 170px;
  color: #64748b;
  font-size: 0.85rem;
}

.scope-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}

.scope-chip {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
}

.status-pill {
  align-self: center;
  background: #f1f5f9;
  color: #475569;
}

.status-pill.active {
  background: #dcfce7;
  color: #166534;
}

.code-block {
  background: #0f172a;
  border-radius: 0.85rem;
  padding: 0.9rem 1rem;
  overflow: auto;
  margin-bottom: 0.85rem;
}

.code-block-top,
.code-block-actions,
.row-actions,
.modal-actions,
.modal-header {
  display: flex;
}

.code-block-top {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.code-block-label {
  color: #cbd5e1;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.code-block-actions,
.row-actions,
.modal-actions {
  gap: 0.5rem;
}

.code-action,
.mini-action,
.modal-close {
  border: 1px solid transparent;
  border-radius: 0.65rem;
  background: transparent;
  cursor: pointer;
}

.code-action {
  padding: 0.4rem 0.7rem;
  color: #f8fafc;
  background: rgba(148, 163, 184, 0.16);
}

.code-action-muted {
  color: #cbd5e1;
}

.row-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.mini-action {
  padding: 0.42rem 0.68rem;
  background: #f8fafc;
  border-color: #dbe3f0;
  color: #334155;
  font-weight: 700;
  font-size: 0.78rem;
}

.mini-action-danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff5f5;
}

.mini-action:disabled,
.btn-primary:disabled,
.btn-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
  box-shadow: none;
}

.code-block pre {
  margin: 0;
  color: #e2e8f0;
}

.empty-state {
  color: #94a3b8;
  font-weight: 600;
}

.action-feedback {
  margin: 0 0 0.85rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.9rem;
  font-weight: 600;
}

.action-feedback-success {
  background: #ecfdf5;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.action-feedback-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.empty-state.inline {
  display: inline-flex;
}

.btn-primary,
.btn-secondary {
  border: 0;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.btn-primary {
  background: #0ea5e9;
  color: #fff;
}

.btn-secondary {
  background: #f8fafc;
  color: #1d4ed8;
  border: 1px solid #cbd5e1;
}

.btn-primary:hover,
.btn-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
  z-index: 30;
}

.modal-card {
  width: min(100%, 520px);
  background: #fff;
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18);
}

.modal-header {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.85rem;
  color: #111827;
}

.modal-close {
  width: 2.5rem;
  height: 2.5rem;
  color: #475569;
  font-size: 1.2rem;
}

.modal-label {
  display: block;
  margin-bottom: 0.6rem;
  color: #475569;
  font-size: 0.95rem;
  font-weight: 700;
}

.modal-input,
.secret-box {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid #dbe3f0;
  background: #fff;
}

.modal-input {
  padding: 0.95rem 1rem;
  font-size: 1rem;
  color: #0f172a;
}

.modal-copy {
  margin: 0 0 1rem;
  color: #64748b;
  line-height: 1.7;
}

.secret-box {
  margin-bottom: 1.1rem;
  padding: 1rem 1.1rem;
  background: #f8fafc;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  word-break: break-all;
}

.modal-actions {
  justify-content: flex-end;
}

.modal-error {
  margin: 0.85rem 0 0;
  color: #dc2626;
  font-weight: 600;
}

@media (max-width: 1180px) {
  .workspace-nav {
    overflow-x: auto;
    padding-bottom: 0.2rem;
    top: calc(72px + 0.4rem);
  }

  .summary-grid,
  .content-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .summary-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .meta-stack {
    align-items: flex-start;
    min-width: 0;
  }

  .item-row {
    flex-direction: column;
  }

  .item-side,
  .row-actions {
    align-items: flex-start;
    justify-content: flex-start;
  }
}

/* KPI strip */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.kpi-card {
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 0.95rem;
  padding: 0.85rem 0.95rem;
  background: rgba(255, 255, 255, 0.94);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
}

.kpi-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.kpi-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.kpi-value.kpi-warn {
  color: #b91c1c;
}

.kpi-help {
  font-size: 0.78rem;
  color: #94a3b8;
}

.kpi-card--chart {
  grid-column: span 1;
}

.kpi-spark {
  width: 100%;
  height: 50px;
  display: block;
}

/* Webhooks panel-card adjustments */
.panel-card--full {
  grid-column: 1 / -1;
}

.webhook-events {
  margin: 0.3rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.webhook-event-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: 0.4rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.74rem;
  font-weight: 700;
}

.webhook-event-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
}

.webhook-event-toggle {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.webhook-event-toggle.active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.webhook-secret-block {
  margin-top: 0.45rem;
  font-size: 0.78rem;
}

.webhook-secret-block summary {
  cursor: pointer;
  color: #4338ca;
}

.webhook-secret-row {
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.webhook-secret-row code {
  flex: 1;
  background: #f1f5f9;
  padding: 0.35rem 0.55rem;
  border-radius: 0.4rem;
  font-size: 0.76rem;
  color: #0f172a;
  word-break: break-all;
}

.webhook-http-status {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.status-pill.delivered {
  background: #dcfce7;
  color: #166534;
}

.status-pill.failed {
  background: #fee2e2;
  color: #b91c1c;
}

.status-pill.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-pill.paused {
  background: #f1f5f9;
  color: #475569;
}
</style>
