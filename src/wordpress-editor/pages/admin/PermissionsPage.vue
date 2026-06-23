<template>
  <div class="permissions-page" data-testid="admin-permissions-page">
    <div class="page-header">
      <h1 class="page-title">{{ localize("Permissions Console", "权限管理") }}</h1>
      <p class="page-subtitle">{{ localize("Manually grant or revoke WP Pro and Grading subscriptions for an account.", "为账号手动开通 / 撤销 WP Pro 与 Grading 订阅。") }}</p>
      <p v-if="pageNotice" class="page-notice">{{ pageNotice }}</p>
      <p v-if="pageError" class="page-error">{{ pageError }}</p>
    </div>

    <section class="panel-card lookup-card">
      <h2 class="panel-title">{{ localize("Lookup account", "查询账号") }}</h2>
      <p class="section-copy">{{ localize("Search by accountId or email to load current entitlements.", "通过 accountId 或邮箱查询当前权限状态。") }}</p>
      <div class="lookup-row">
        <label class="form-field">
          <span>{{ localize("Account ID", "账号 ID") }}</span>
          <input v-model="lookupForm.accountId" type="text" :placeholder="localize('account_xxx', 'account_xxx')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Email (optional fallback)", "邮箱（可选回退）") }}</span>
          <input v-model="lookupForm.email" type="email" :placeholder="localize('user@example.com', 'user@example.com')" />
        </label>
        <button class="btn-primary" :disabled="lookupLoading" @click="loadStatus">
          {{ lookupLoading ? localize("Loading...", "加载中...") : localize("Load Status", "查询状态") }}
        </button>
      </div>
    </section>

    <div v-if="statusLoaded" class="grid-2">
      <section class="panel-card">
        <h2 class="panel-title">{{ localize("WP Pro", "WP Pro") }}</h2>
        <div class="status-line">
          <span class="status-chip" :class="statusSummary.wpPro ? 'active' : 'inactive'">
            {{ statusSummary.wpPro ? localize("Active", "已激活") : localize("Inactive", "未激活") }}
          </span>
          <span v-if="statusSummary.wpProAccount" class="status-meta">
            {{ localize("Tier", "层级") }}: {{ wpProAccountTier || "—" }}
            ·
            {{ localize("Expires", "到期") }}: {{ formatExpiry(wpProAccountExpires) }}
          </span>
        </div>
        <div class="form-grid">
          <label class="form-field">
            <span>{{ localize("Tier", "层级") }}</span>
            <input v-model="wpProForm.tier" type="text" :placeholder="localize('pro / studio / enterprise', 'pro / studio / enterprise')" />
          </label>
          <label class="form-field">
            <span>{{ localize("Expires At", "到期时间") }}</span>
            <input v-model="wpProForm.expiresAt" type="text" :placeholder="localize('YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss')" />
          </label>
          <label class="form-field full">
            <span>{{ localize("Note", "备注") }}</span>
            <input v-model="wpProForm.note" type="text" :placeholder="localize('Reason for grant/revoke', '开通 / 撤销原因')" />
          </label>
        </div>
        <div class="action-row">
          <button class="btn-primary" :disabled="!canSubmit || submitting" @click="grantWpPro">
            {{ localize("Grant WP Pro", "开通 WP Pro") }}
          </button>
          <button class="btn-tertiary" :disabled="!canSubmit || submitting" @click="revokeWpPro">
            {{ localize("Revoke WP Pro", "撤销 WP Pro") }}
          </button>
        </div>
      </section>

      <section class="panel-card">
        <h2 class="panel-title">{{ localize("Grading", "Grading 放码") }}</h2>
        <div class="status-line">
          <span class="status-chip" :class="hasGradingActive ? 'active' : 'inactive'">
            {{ hasGradingActive ? localize("Active", "已激活") : localize("Inactive", "未激活") }}
          </span>
          <span v-if="statusSummary.gradingTier" class="status-meta">
            {{ localize("Resolved Tier", "当前档位") }}: {{ statusSummary.gradingTier }}
          </span>
        </div>
        <div class="form-grid">
          <label class="form-field">
            <span>{{ localize("Tier", "档位") }}</span>
            <select v-model="gradingForm.tier" class="unified-select">
              <option value="standard">standard</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <label class="form-field">
            <span>{{ localize("Tenant ID (optional)", "租户 ID（可选）") }}</span>
            <input v-model="gradingForm.tenantId" type="text" :placeholder="localize('tenant_xxx', 'tenant_xxx')" />
          </label>
          <label class="form-field">
            <span>{{ localize("Expires At", "到期时间") }}</span>
            <input v-model="gradingForm.expiresAt" type="text" :placeholder="localize('YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss')" />
          </label>
          <label class="form-field full">
            <span>{{ localize("Note", "备注") }}</span>
            <input v-model="gradingForm.note" type="text" :placeholder="localize('Reason for grant/revoke', '开通 / 撤销原因')" />
          </label>
        </div>
        <div class="action-row">
          <button class="btn-primary" :disabled="!canSubmit || submitting" @click="grantGrading">
            {{ localize("Grant Grading", "开通 Grading") }}
          </button>
          <button class="btn-tertiary" :disabled="!canSubmit || submitting" @click="revokeGrading">
            {{ localize("Revoke Grading", "撤销 Grading") }}
          </button>
        </div>
        <div v-if="gradingHistory.length" class="history-block">
          <h3 class="sub-title">{{ localize("Grading History", "Grading 历史") }}</h3>
          <ul class="history-list">
            <li v-for="(item, idx) in gradingHistory" :key="historyKey(item, idx)">
              <strong>{{ historyTier(item) }}</strong>
              <span>{{ historyStatus(item) }}</span>
              <span>{{ formatExpiry(historyCreatedAt(item)) }} → {{ formatExpiry(historyExpiresAt(item)) }}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { platformFetch } from "../../api/client"

// Spec Task 14：管理员权限管理页面 — 顶部按 accountId/email 搜索 → GET /admin/permissions/{accountId}
// 然后通过 grant/revoke 端点更新 WP Pro / Grading 订阅。
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

type StatusSummary = {
  wpPro?: boolean
  wpProAccount?: Record<string, unknown> | null
  gradingTier?: string | null
  gradingActive?: Record<string, unknown> | null
  gradingHistory?: Array<Record<string, unknown>>
}

const lookupForm = ref({ accountId: "", email: "" })
const lookupLoading = ref(false)
const statusLoaded = ref(false)
const statusSummary = ref<StatusSummary>({})
const submitting = ref(false)
const pageNotice = ref("")
const pageError = ref("")

const wpProForm = ref({ tier: "", expiresAt: "", note: "" })
const gradingForm = ref({ tier: "standard", tenantId: "", expiresAt: "", note: "" })

const canSubmit = computed(() => Boolean(lookupForm.value.accountId.trim()))
const hasGradingActive = computed(() => Boolean(statusSummary.value.gradingActive))
const gradingHistory = computed(() => (statusSummary.value.gradingHistory || []) as Array<Record<string, unknown>>)
const wpProAccountTier = computed(() => {
  const acc = statusSummary.value.wpProAccount as Record<string, unknown> | null | undefined
  return (acc?.wp_pro_tier ?? acc?.wpProTier ?? "") as string
})
const wpProAccountExpires = computed(() => {
  const acc = statusSummary.value.wpProAccount as Record<string, unknown> | null | undefined
  return (acc?.wp_pro_expires_at ?? acc?.wpProExpiresAt ?? "") as string
})

function formatExpiry(value: unknown): string {
  if (!value) return "—"
  return String(value)
}

function historyKey(item: Record<string, unknown>, idx: number) {
  return String(item.subscription_id || item.subscriptionId || idx)
}
function historyTier(item: Record<string, unknown>) {
  return String(item.tier || "—")
}
function historyStatus(item: Record<string, unknown>) {
  return String(item.status || "—")
}
function historyCreatedAt(item: Record<string, unknown>) {
  return item.created_at || item.createdAt || ""
}
function historyExpiresAt(item: Record<string, unknown>) {
  return item.expires_at || item.expiresAt || ""
}

function buildHeaders() {
  return {
    ...authStore.authHeaders,
    "Content-Type": "application/json",
  }
}

async function loadStatus() {
  pageError.value = ""
  pageNotice.value = ""
  const accountId = lookupForm.value.accountId.trim()
  if (!accountId) {
    pageError.value = localize("Please enter accountId.", "请输入 accountId。")
    return
  }
  lookupLoading.value = true
  try {
    const params = new URLSearchParams()
    if (lookupForm.value.email.trim()) params.set("email", lookupForm.value.email.trim())
    const suffix = params.toString() ? `?${params.toString()}` : ""
    const data = await platformFetch<StatusSummary>(`/api/v1/admin/permissions/${encodeURIComponent(accountId)}${suffix}`, {
      headers: { ...authStore.authHeaders },
    })
    statusSummary.value = data || {}
    statusLoaded.value = true
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load status.", "加载状态失败。"))
  } finally {
    lookupLoading.value = false
  }
}

async function postPermission(path: string, body: Record<string, unknown>, successText: string) {
  pageError.value = ""
  pageNotice.value = ""
  submitting.value = true
  try {
    await platformFetch(path, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })
    pageNotice.value = successText
    await loadStatus()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Operation failed.", "操作失败。"))
  } finally {
    submitting.value = false
  }
}

async function grantWpPro() {
  await postPermission(
    "/api/v1/admin/permissions/wp-pro/grant",
    {
      accountId: lookupForm.value.accountId.trim(),
      tier: wpProForm.value.tier.trim() || null,
      expiresAt: wpProForm.value.expiresAt.trim() || null,
      note: wpProForm.value.note.trim() || null,
    },
    localize("WP Pro granted.", "WP Pro 已开通。"),
  )
}

async function revokeWpPro() {
  await postPermission(
    "/api/v1/admin/permissions/wp-pro/revoke",
    {
      accountId: lookupForm.value.accountId.trim(),
      reason: wpProForm.value.note.trim() || null,
    },
    localize("WP Pro revoked.", "WP Pro 已撤销。"),
  )
}

async function grantGrading() {
  await postPermission(
    "/api/v1/admin/permissions/grading/grant",
    {
      accountId: lookupForm.value.accountId.trim(),
      tenantId: gradingForm.value.tenantId.trim() || null,
      tier: gradingForm.value.tier,
      expiresAt: gradingForm.value.expiresAt.trim() || null,
      note: gradingForm.value.note.trim() || null,
    },
    localize("Grading granted.", "Grading 已开通。"),
  )
}

async function revokeGrading() {
  await postPermission(
    "/api/v1/admin/permissions/grading/revoke",
    {
      accountId: lookupForm.value.accountId.trim(),
      reason: gradingForm.value.note.trim() || null,
    },
    localize("Grading revoked.", "Grading 已撤销。"),
  )
}
</script>

<style scoped>
.permissions-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header {
  padding: 1.25rem 1.4rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.page-title { margin: 0; font-size: 1.65rem; }
.page-subtitle { margin: 0.4rem 0 0; color: #64748b; }
.page-notice { margin: 0.6rem 0 0; color: #047857; font-size: 0.92rem; }
.page-error { margin: 0.6rem 0 0; color: #b91c1c; font-size: 0.92rem; }
.panel-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 1.2rem 1.4rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}
.panel-title { margin: 0 0 0.5rem; font-size: 1.05rem; }
.section-copy { margin: 0 0 1rem; color: #64748b; }
.lookup-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.85rem;
  align-items: end;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 0.85rem;
}
.form-field { display: flex; flex-direction: column; gap: 0.4rem; color: #475569; min-width: 0; }
.form-field.full { grid-column: 1 / -1; }
.form-field input, .form-field select {
  border: 1px solid #cbd5e1;
  border-radius: 0.78rem;
  padding: 0.7rem 0.85rem;
  background: #fff;
}
.form-field input:focus, .form-field select:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.unified-select { appearance: none; }
.action-row { display: flex; gap: 0.6rem; margin-top: 1rem; flex-wrap: wrap; }
.btn-primary, .btn-tertiary {
  border: 0;
  border-radius: 0.78rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary { background: #0ea5e9; color: #fff; }
.btn-tertiary { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.btn-primary:disabled, .btn-tertiary:disabled { opacity: 0.6; cursor: not-allowed; }
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
.status-line { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.6rem; }
.status-meta { color: #64748b; font-size: 0.9rem; }
.status-chip {
  display: inline-flex; padding: 0.25rem 0.65rem; border-radius: 999px;
  font-size: 0.78rem; font-weight: 700;
}
.status-chip.active { background: #dcfce7; color: #166534; }
.status-chip.inactive { background: #f1f5f9; color: #475569; }
.history-block { margin-top: 1rem; }
.sub-title { margin: 0 0 0.5rem; font-size: 0.95rem; color: #0f172a; }
.history-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.45rem; }
.history-list li {
  display: flex; gap: 0.65rem; flex-wrap: wrap; padding: 0.55rem 0.7rem;
  border: 1px solid #e2e8f0; border-radius: 0.6rem; color: #475569; font-size: 0.88rem;
}
@media (max-width: 720px) {
  .grid-2 { grid-template-columns: 1fr; }
  .lookup-row, .form-grid { grid-template-columns: 1fr; }
}
</style>
