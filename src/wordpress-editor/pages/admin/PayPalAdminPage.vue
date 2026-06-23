<template>
  <!-- 0.4.52 平台管理员 PayPal 配置只读诊断页。
       0.4.53 加入中英文切换(默认英文,跟随全局 ui-locale store)。
       本页只读,不允许在 UI 修改 client_secret 等敏感凭证。
       修改请编辑 platform.env 后重启平台。 -->
  <div class="paypal-admin-page">
    <header class="page-header">
      <h1 class="page-title">{{ tt('pageTitle') }}</h1>
      <p class="page-subtitle">
        {{ tt('pageSubtitlePrefix') }} <code>platform.env</code> {{ tt('pageSubtitleMid') }} <code>platformctl restart</code>{{ tt('pageSubtitleSuffix') }}
      </p>
    </header>

    <section class="panel-card">
      <header class="panel-header">
        <h2 class="panel-title">{{ tt('currentConfig') }}</h2>
        <button type="button" class="button-secondary" :disabled="loading" @click="loadConfig">
          {{ loading ? tt('loading') : tt('refresh') }}
        </button>
      </header>
      <div v-if="loadError" class="alert alert-error">{{ loadError }}</div>
      <div v-else-if="!config" class="alert">{{ tt('clickRefresh') }}</div>
      <table v-else class="config-table">
        <tbody>
          <tr>
            <th>{{ tt('rowEnabled') }}</th>
            <td>
              <span class="badge" :class="config.enabled ? 'ok' : 'warn'">{{ config.enabled ? tt('enabled') : tt('disabled') }}</span>
              <span v-if="config.mock_enabled" class="badge warn" style="margin-left: 8px;">{{ tt('mockMode') }}</span>
            </td>
          </tr>
          <tr>
            <th>{{ tt('rowEnv') }}</th>
            <td><code>{{ config.environment || tt('notSet') }}</code> → <code>{{ config.api_base_url }}</code></td>
          </tr>
          <tr>
            <th>{{ tt('rowReadyOrder') }}</th>
            <td><span class="badge" :class="config.ready ? 'ok' : 'fail'">{{ config.ready ? tt('ready') : tt('notReady') }}</span></td>
          </tr>
          <tr>
            <th>{{ tt('rowReadyPayouts') }}</th>
            <td>
              <span class="badge" :class="config.payouts_enabled ? (config.payouts_ready ? 'ok' : 'fail') : 'muted'">
                {{ config.payouts_enabled ? (config.payouts_ready ? tt('ready') : tt('notReady')) : tt('payoutsDisabled') }}
              </span>
            </td>
          </tr>
          <tr>
            <th>{{ tt('rowClientId') }}</th>
            <td><code>{{ config.client_id_masked || tt('empty') }}</code></td>
          </tr>
          <tr>
            <th>{{ tt('rowClientSecret') }}</th>
            <td>
              <span class="badge" :class="config.client_secret_configured ? 'ok' : 'fail'">
                {{ config.client_secret_configured ? tt('secretConfigured') : tt('secretMissing') }}
              </span>
            </td>
          </tr>
          <tr>
            <th>{{ tt('rowWebhookOrder') }}</th>
            <td><code>{{ config.webhook_id || tt('empty') }}</code></td>
          </tr>
          <tr>
            <th>{{ tt('rowWebhookPayouts') }}</th>
            <td><code>{{ config.payouts_webhook_id || tt('empty') }}</code></td>
          </tr>
          <tr>
            <th>{{ tt('rowReturnUrl') }}</th>
            <td><code>{{ config.return_base_url }}</code></td>
          </tr>
          <tr>
            <th>{{ tt('rowCancelUrl') }}</th>
            <td><code>{{ config.cancel_base_url }}</code></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel-card">
      <header class="panel-header">
        <h2 class="panel-title">{{ tt('diagnostics') }}</h2>
        <button type="button" class="button-primary" :disabled="diagLoading" @click="runDiagnostics">
          {{ diagLoading ? tt('running') : tt('runDiagnostics') }}
        </button>
      </header>
      <p class="hint">{{ tt('diagHint') }}</p>
      <div v-if="diagError" class="alert alert-error">{{ diagError }}</div>
      <div v-if="diag" class="diag-results">
        <div class="diag-row" :class="probeOk(diag.token_probe) ? 'ok' : 'fail'">
          <strong>{{ tt('probeToken') }}</strong>
          <span class="diag-status">{{ probeOk(diag.token_probe) ? tt('passed') : tt('failed') }}</span>
          <p class="diag-message">{{ diag.token_probe?.message }}</p>
        </div>
        <div class="diag-row" :class="probeOk(diag.payment_webhook_probe) ? 'ok' : 'fail'">
          <strong>{{ tt('probePaymentWebhook') }}</strong>
          <span class="diag-status">{{ probeOk(diag.payment_webhook_probe) ? tt('passed') : tt('failed') }}</span>
          <p class="diag-message">{{ diag.payment_webhook_probe?.message }}</p>
          <p v-if="diag.payment_webhook_probe?.webhook_url" class="diag-detail">
            URL: <code>{{ diag.payment_webhook_probe.webhook_url }}</code>
          </p>
        </div>
        <div class="diag-row" :class="probeOk(diag.payouts_webhook_probe) ? 'ok' : 'fail'">
          <strong>{{ tt('probePayoutsWebhook') }}</strong>
          <span class="diag-status">{{ probeOk(diag.payouts_webhook_probe) ? tt('passed') : tt('failed') }}</span>
          <p class="diag-message">{{ diag.payouts_webhook_probe?.message }}</p>
          <p v-if="diag.payouts_webhook_probe?.webhook_url" class="diag-detail">
            URL: <code>{{ diag.payouts_webhook_probe.webhook_url }}</code>
          </p>
        </div>
      </div>
    </section>

    <section class="panel-card help-card">
      <h2 class="panel-title">{{ tt('helpTitle') }}</h2>
      <ol class="help-list">
        <li>{{ tt('helpStep1Prefix') }} <code>/www/wwwroot/mockup100/mockup100/shared/config/platform.env</code></li>
        <li>{{ tt('helpStep2') }}
          <ul>
            <li><code>PAYPAL_ENABLED</code> / <code>PAYPAL_MOCK_ENABLED</code> / <code>PAYPAL_ENVIRONMENT</code></li>
            <li><code>PAYPAL_CLIENT_ID</code> / <code>PAYPAL_CLIENT_SECRET</code></li>
            <li><code>PAYPAL_WEBHOOK_ID</code> / <code>PAYPAL_PAYOUTS_ENABLED</code> / <code>PAYPAL_PAYOUTS_WEBHOOK_ID</code></li>
            <li><code>PAYPAL_RETURN_BASE_URL</code> / <code>PAYPAL_CANCEL_BASE_URL</code></li>
          </ul>
        </li>
        <li>{{ tt('helpStep3Prefix') }} <code>bash /www/wwwroot/mockup100/mockup100/shared/run/platformctl.sh restart</code></li>
        <li>{{ tt('helpStep4') }}</li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { platformFetch } from "../../api/client"
import { useUiLocaleStore } from "../../stores/uiLocale"

interface PayPalConfig {
  enabled: boolean
  mock_enabled: boolean
  environment: string
  client_id_masked: string
  client_secret_configured: boolean
  webhook_id: string
  payouts_enabled: boolean
  payouts_webhook_id: string
  api_base_url: string
  return_base_url: string
  cancel_base_url: string
  ready: boolean
  payouts_ready: boolean
}

interface ProbeResult {
  ok?: boolean
  message?: string
  webhook_url?: string
  event_types?: unknown
}

interface Diagnostics {
  environment: string
  api_base_url: string
  token_probe?: ProbeResult
  payment_webhook_probe?: ProbeResult
  payouts_webhook_probe?: ProbeResult
}

// 0.4.53 双语字典。默认 en(uiLocale store 默认即 "en")。
const I18N = {
  en: {
    pageTitle: "PayPal Receivables",
    pageSubtitlePrefix: "Read-only diagnostics for platform admins. To edit credentials, edit the server's",
    pageSubtitleMid: "and run",
    pageSubtitleSuffix: ".",
    currentConfig: "Current configuration",
    refresh: "Refresh",
    loading: "Loading…",
    clickRefresh: "Click \"Refresh\" to load the current configuration.",
    rowEnabled: "Enabled",
    rowEnv: "Environment",
    rowReadyOrder: "Ready (orders)",
    rowReadyPayouts: "Ready (Payouts)",
    rowClientId: "Client ID",
    rowClientSecret: "Client Secret",
    rowWebhookOrder: "Webhook ID (orders)",
    rowWebhookPayouts: "Webhook ID (Payouts)",
    rowReturnUrl: "Return URL",
    rowCancelUrl: "Cancel URL",
    enabled: "enabled",
    disabled: "disabled",
    mockMode: "mock mode",
    notSet: "(not set)",
    ready: "ready",
    notReady: "NOT ready",
    payoutsDisabled: "disabled",
    empty: "(empty)",
    secretConfigured: "Configured (hidden)",
    secretMissing: "Not configured",
    diagnostics: "Connectivity diagnostics",
    runDiagnostics: "Run diagnostics",
    running: "Running…",
    diagHint:
      "On click, the server will request a fresh OAuth2 token from PayPal with the current credentials and look up both webhook registrations. Live requests really hit paypal.com but produce no funds movement or order rows.",
    probeToken: "OAuth2 token",
    probePaymentWebhook: "Payment webhook",
    probePayoutsWebhook: "Payouts webhook",
    passed: "✓ Passed",
    failed: "✗ Failed",
    helpTitle: "How to change PayPal credentials?",
    helpStep1Prefix: "SSH into the server and edit",
    helpStep2: "Adjust the following variables (leave empty to disable the feature):",
    helpStep3Prefix: "Run",
    helpStep4: "Return to this page, click \"Refresh\" and \"Run diagnostics\" to verify.",
    loadFailed: "Failed to load configuration",
    diagFailed: "Diagnostics failed",
  },
  zh: {
    pageTitle: "PayPal 收款配置",
    pageSubtitlePrefix: "平台管理员只读诊断面板。如需修改凭证,请编辑服务器",
    pageSubtitleMid: "后执行",
    pageSubtitleSuffix: "。",
    currentConfig: "当前配置",
    refresh: "刷新",
    loading: "加载中…",
    clickRefresh: "点击 “刷新” 加载当前配置。",
    rowEnabled: "启用状态",
    rowEnv: "环境",
    rowReadyOrder: "就绪状态(支付订单)",
    rowReadyPayouts: "就绪状态(Payouts 打款)",
    rowClientId: "Client ID",
    rowClientSecret: "Client Secret",
    rowWebhookOrder: "Webhook ID(支付订单)",
    rowWebhookPayouts: "Webhook ID(Payouts)",
    rowReturnUrl: "付款回跳 URL",
    rowCancelUrl: "取消回跳 URL",
    enabled: "已启用",
    disabled: "已停用",
    mockMode: "mock 模式",
    notSet: "(未设置)",
    ready: "ready",
    notReady: "NOT ready",
    payoutsDisabled: "未启用",
    empty: "(空)",
    secretConfigured: "已配置(不显示)",
    secretMissing: "未配置",
    diagnostics: "联通诊断",
    runDiagnostics: "运行诊断",
    running: "运行中…",
    diagHint:
      "点击后服务端会用当前凭证向 PayPal 发起一次 OAuth2 token 请求,并查询两个 webhook 的注册信息。Live 环境的请求会真实命中 paypal.com,但不产生任何资金或订单流水。",
    probeToken: "OAuth2 Token",
    probePaymentWebhook: "支付订单 Webhook",
    probePayoutsWebhook: "Payouts Webhook",
    passed: "✓ 通过",
    failed: "✗ 失败",
    helpTitle: "如何修改 PayPal 凭证?",
    helpStep1Prefix: "SSH 登录服务器,编辑",
    helpStep2: "调整以下变量(留空表示不启用对应功能):",
    helpStep3Prefix: "执行",
    helpStep4: "回到本页点击 “刷新” + “运行诊断” 验证。",
    loadFailed: "加载配置失败",
    diagFailed: "诊断失败",
  },
} as const

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const dict = computed(() => I18N[locale.value] ?? I18N.en)
const tt = (key: keyof typeof I18N.en) => dict.value[key]

const config = ref<PayPalConfig | null>(null)
const loading = ref(false)
const loadError = ref("")

const diag = ref<Diagnostics | null>(null)
const diagLoading = ref(false)
const diagError = ref("")

function probeOk(probe: ProbeResult | undefined): boolean {
  return Boolean(probe && probe.ok)
}

async function loadConfig() {
  loading.value = true
  loadError.value = ""
  try {
    config.value = await platformFetch<PayPalConfig>("/api/v1/billing/admin/paypal/config")
  } catch (error) {
    const message = (error as Error).message || String(error)
    loadError.value = `${tt("loadFailed")}: ${message}`
  } finally {
    loading.value = false
  }
}

async function runDiagnostics() {
  diagLoading.value = true
  diagError.value = ""
  try {
    diag.value = await platformFetch<Diagnostics>("/api/v1/billing/admin/paypal/diagnostics", {
      method: "POST",
    })
  } catch (error) {
    const message = (error as Error).message || String(error)
    diagError.value = `${tt("diagFailed")}: ${message}`
  } finally {
    diagLoading.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.paypal-admin-page {
  padding: 24px 32px;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-size: 14px;
  color: #1f2937;
}
.page-header { padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 6px; }
.page-subtitle { margin: 0; color: #6b7280; line-height: 1.6; }
.page-subtitle code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
.panel-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.panel-title { font-size: 16px; font-weight: 600; margin: 0; }
.config-table { width: 100%; border-collapse: collapse; }
.config-table th { width: 220px; text-align: left; font-weight: 500; color: #6b7280; padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
.config-table td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; word-break: break-all; }
.config-table code { background: #f9fafb; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge.ok { background: #d1fae5; color: #065f46; }
.badge.warn { background: #fef3c7; color: #92400e; }
.badge.fail { background: #fee2e2; color: #991b1b; }
.badge.muted { background: #f3f4f6; color: #6b7280; }
.button-primary, .button-secondary {
  padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; border: 1px solid transparent;
}
.button-primary { background: #2563eb; color: #fff; }
.button-primary:disabled { background: #93c5fd; cursor: not-allowed; }
.button-secondary { background: #fff; color: #1f2937; border-color: #d1d5db; }
.button-secondary:disabled { color: #9ca3af; cursor: not-allowed; }
.alert { padding: 10px 12px; border-radius: 6px; background: #f3f4f6; color: #6b7280; }
.alert-error { background: #fee2e2; color: #991b1b; }
.hint { color: #6b7280; line-height: 1.6; margin: 0 0 12px; }
.diag-results { display: flex; flex-direction: column; gap: 10px; }
.diag-row { padding: 12px 14px; border-radius: 6px; border-left: 4px solid #d1d5db; background: #f9fafb; }
.diag-row.ok { border-left-color: #10b981; background: #ecfdf5; }
.diag-row.fail { border-left-color: #ef4444; background: #fef2f2; }
.diag-row strong { font-size: 13px; }
.diag-status { float: right; font-weight: 500; font-size: 12px; }
.diag-row.ok .diag-status { color: #065f46; }
.diag-row.fail .diag-status { color: #991b1b; }
.diag-message { margin: 6px 0 0; color: #4b5563; font-size: 13px; line-height: 1.5; }
.diag-detail { margin: 4px 0 0; font-size: 12px; color: #6b7280; word-break: break-all; }
.help-list { margin: 0; padding-left: 20px; line-height: 1.8; color: #4b5563; }
.help-list code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
.help-list ul { padding-left: 18px; }
</style>
