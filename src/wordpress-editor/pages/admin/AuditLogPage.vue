<template>
  <div class="audit-log-page" data-testid="admin-audit-log-page">
    <div class="page-header">
      <h1 class="page-title">{{ localize("Audit Log", "审计日志") }}</h1>
      <p class="page-subtitle">{{ localize("Query platform audit trail by actor / action / target / time window.", "按操作人 / 行为 / 目标 / 时间窗口查询平台审计日志。") }}</p>
      <p v-if="pageError" class="page-error">{{ pageError }}</p>
    </div>

    <section class="panel-card filter-card">
      <div class="filter-row">
        <label class="form-field">
          <span>{{ localize("Action", "行为") }}</span>
          <input v-model="filters.action" type="text" :placeholder="localize('e.g. token.manual_recharge', '例如 token.manual_recharge')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Actor email", "操作人邮箱") }}</span>
          <input v-model="filters.actorEmail" type="text" placeholder="admin@example.com" />
        </label>
        <label class="form-field">
          <span>{{ localize("Target type", "目标类型") }}</span>
          <input v-model="filters.targetType" type="text" :placeholder="localize('e.g. account / order', '如 account / order')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Target ID", "目标 ID") }}</span>
          <input v-model="filters.targetId" type="text" placeholder="acct_xxx / order_xxx" />
        </label>
        <label class="form-field">
          <span>{{ localize("From (ISO)", "起始时间 (ISO)") }}</span>
          <input v-model="filters.from" type="text" placeholder="2026-01-01T00:00:00Z" />
        </label>
        <label class="form-field">
          <span>{{ localize("To (ISO)", "结束时间 (ISO)") }}</span>
          <input v-model="filters.to" type="text" placeholder="2026-12-31T23:59:59Z" />
        </label>
        <label class="form-field">
          <span>{{ localize("Limit", "条数上限") }}</span>
          <input v-model.number="filters.limit" type="number" min="1" max="500" />
        </label>
        <button class="btn-primary" :disabled="loading" @click="reload">
          {{ loading ? localize("Loading...", "加载中...") : localize("Search", "查询") }}
        </button>
      </div>
    </section>

    <section class="panel-card">
      <div class="section-heading">
        <h2 class="panel-title">{{ localize("Records", "记录") }}</h2>
        <span class="status-chip neutral">{{ records.length }} {{ localize("entries", "条") }}</span>
      </div>
      <div v-if="loading && !records.length" class="empty-state">{{ localize("Loading audit log...", "加载审计日志中...") }}</div>
      <div v-else-if="records.length" class="table-list">
        <div v-for="(row, index) in records" :key="rowKey(row, index)" class="table-row">
          <div class="row-main">
            <div class="row-title">
              <strong>{{ actionLabel(row) || "—" }}</strong>
              <span class="status-chip neutral">{{ targetType(row) || "—" }}</span>
              <span class="row-time">{{ createdAt(row) || "—" }}</span>
            </div>
            <div class="row-meta">
              <span>{{ localize("Actor", "操作人") }}: {{ actorEmail(row) || actorId(row) || "—" }}</span>
              <span>{{ localize("Target", "目标") }}: {{ targetId(row) || "—" }}</span>
              <span v-if="ip(row)">{{ localize("IP", "IP") }}: {{ ip(row) }}</span>
            </div>
            <pre v-if="detailText(row)" class="detail-block">{{ detailText(row) }}</pre>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ localize("No audit entries matching the filters.", "没有符合筛选条件的审计记录。") }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"
import { platformFetch } from "../../api/client"

// Spec Task 16：审计日志查询页 — GET /admin/audit-logs?action=&actorEmail=&targetType=&targetId=&from=&to=&limit=
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

type AuditRow = Record<string, unknown>

const filters = ref({
  action: "",
  actorEmail: "",
  targetType: "",
  targetId: "",
  from: "",
  to: "",
  limit: 100,
})
const records = ref<AuditRow[]>([])
const loading = ref(false)
const pageError = ref("")

function actionLabel(row: AuditRow) {
  return String(row.action ?? row.action_name ?? "")
}
function actorEmail(row: AuditRow) {
  return String(row.actor_email ?? row.actorEmail ?? "")
}
function actorId(row: AuditRow) {
  return String(row.actor_id ?? row.actorId ?? "")
}
function targetType(row: AuditRow) {
  return String(row.target_type ?? row.targetType ?? "")
}
function targetId(row: AuditRow) {
  return String(row.target_id ?? row.targetId ?? "")
}
function createdAt(row: AuditRow) {
  return String(row.created_at ?? row.createdAt ?? "")
}
function ip(row: AuditRow) {
  return String(row.ip ?? row.ip_address ?? row.ipAddress ?? "")
}
function detailText(row: AuditRow) {
  const detail = row.detail_json ?? row.detailJson ?? row.detail ?? row.metadata
  if (detail == null) return ""
  if (typeof detail === "string") return detail
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}
function rowKey(row: AuditRow, index: number) {
  return String(row.id ?? row.audit_id ?? row.auditId ?? `${createdAt(row)}-${index}`)
}

async function reload() {
  loading.value = true
  pageError.value = ""
  try {
    const params = new URLSearchParams()
    if (filters.value.action.trim()) params.set("action", filters.value.action.trim())
    if (filters.value.actorEmail.trim()) params.set("actorEmail", filters.value.actorEmail.trim())
    if (filters.value.targetType.trim()) params.set("targetType", filters.value.targetType.trim())
    if (filters.value.targetId.trim()) params.set("targetId", filters.value.targetId.trim())
    if (filters.value.from.trim()) params.set("from", filters.value.from.trim())
    if (filters.value.to.trim()) params.set("to", filters.value.to.trim())
    const limit = Math.max(1, Math.min(500, Number(filters.value.limit) || 100))
    params.set("limit", String(limit))
    const data = await platformFetch<{ records?: AuditRow[]; total?: number }>(
      `/api/v1/admin/audit-logs?${params.toString()}`,
      { headers: { ...authStore.authHeaders } },
    )
    records.value = Array.isArray(data?.records) ? data.records : []
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load audit log.", "加载审计日志失败。"))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void reload()
})
</script>

<style scoped>
.audit-log-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header {
  padding: 1.25rem 1.4rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.page-title { margin: 0; font-size: 1.65rem; }
.page-subtitle { margin: 0.4rem 0 0; color: #64748b; }
.page-error { margin: 0.6rem 0 0; color: #b91c1c; font-size: 0.92rem; }
.panel-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 1.2rem 1.4rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}
.panel-title { margin: 0; font-size: 1.05rem; }
.section-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.filter-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 0.85rem;
  align-items: end;
}
.form-field { display: flex; flex-direction: column; gap: 0.4rem; color: #475569; min-width: 0; }
.form-field input {
  border: 1px solid #cbd5e1;
  border-radius: 0.78rem;
  padding: 0.7rem 0.85rem;
  background: #fff;
}
.form-field input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.btn-primary {
  border: 0;
  border-radius: 0.78rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  font-weight: 600;
  background: #0ea5e9;
  color: #fff;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.table-list { display: flex; flex-direction: column; gap: 0; }
.table-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0.25rem;
  border-bottom: 1px solid #eef2f7;
}
.table-row:last-child { border-bottom: 0; }
.row-main { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; width: 100%; }
.row-title { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; }
.row-time { color: #64748b; font-size: 0.85rem; }
.row-meta { display: flex; gap: 0.85rem; flex-wrap: wrap; color: #64748b; font-size: 0.88rem; }
.detail-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.55rem;
  padding: 0.65rem 0.85rem;
  margin: 0;
  font-size: 0.82rem;
  color: #334155;
  overflow-x: auto;
  max-height: 220px;
}
.status-chip {
  display: inline-flex; padding: 0.25rem 0.65rem; border-radius: 999px;
  font-size: 0.75rem; font-weight: 700; text-transform: capitalize;
}
.status-chip.neutral { background: #eef2ff; color: #4338ca; }
.empty-state { color: #64748b; padding: 0.75rem 0; }
@media (max-width: 720px) {
  .filter-row { grid-template-columns: 1fr; }
}
</style>
