import type { BillingEventItem, DeveloperLogItem, DeveloperMetrics } from "../../stores/platform"

export type ApiUsageEventRow = {
  id: string
  eventType: string
  summary: string
  units: number
  createdAt: string
  status: string
  authMode: string
}

export type ApiChargeRow = {
  id: string
  pricingKey: string
  outputSummary: string
  amountLabel: string
  createdAt: string
}

const EXTERNAL_API_PREFIX = "/api/v1/external/"
const EXTERNAL_CHANNELS = new Set(["api", "external"])

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLowerText(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

function coerceMetaRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function extractExternalPath(text: string): string {
  if (!text) return ""
  const matched = text.match(/\/api\/v1\/external\/[^\s"')]+/i)
  return matched?.[0] || text
}

function resolveEventPath(event: DeveloperLogItem): string {
  const record = event as DeveloperLogItem & Record<string, unknown>
  const meta = coerceMetaRecord(event.meta)
  const candidates = [
    event.request_path,
    meta.request_path,
    meta.path,
    meta.endpoint,
    meta.route,
    record.request_path,
  ]
  for (const candidate of candidates) {
    const normalized = extractExternalPath(normalizeText(candidate))
    if (normalized) return normalized
  }
  return ""
}

function resolveChargePath(item: BillingEventItem): string {
  const meta = coerceMetaRecord(item.meta)
  const candidates = [meta.request_path, meta.path, meta.endpoint, meta.route, meta.preview_url, meta.download_url]
  for (const candidate of candidates) {
    const normalized = extractExternalPath(normalizeText(candidate))
    if (normalized) return normalized
  }
  return ""
}

function isExternalDeveloperLog(event: DeveloperLogItem): boolean {
  const record = event as DeveloperLogItem & Record<string, unknown>
  const meta = coerceMetaRecord(event.meta)
  const requestPath = resolveEventPath(event)
  const authMode = normalizeLowerText(event.auth_mode || meta.auth_mode || record.auth_mode)
  const channel = normalizeLowerText(meta.channel || meta.surface || meta.source)
  return (
    requestPath.startsWith(EXTERNAL_API_PREFIX) ||
    EXTERNAL_CHANNELS.has(channel) ||
    authMode === "api_key" ||
    normalizeText(event.api_key_id).length > 0
  )
}

function isExternalCharge(item: BillingEventItem): boolean {
  if (item.event_type !== "render_charge") return false
  const meta = coerceMetaRecord(item.meta)
  const channel = normalizeLowerText(meta.channel || meta.surface || meta.source)
  return EXTERNAL_CHANNELS.has(channel) || resolveChargePath(item).startsWith(EXTERNAL_API_PREFIX)
}

function resolveStatusLabel(event: DeveloperLogItem): string {
  const record = event as DeveloperLogItem & Record<string, unknown>
  const meta = coerceMetaRecord(event.meta)
  const directStatus = normalizeText(event.status || meta.status || record.status || meta.status_code || record.status_code)
  if (directStatus) return directStatus
  const matchedCode = normalizeText(event.request_path).match(/\b(\d{3})\b/)
  return matchedCode?.[1] || "unknown"
}

function resolveAuthMode(event: DeveloperLogItem): string {
  const record = event as DeveloperLogItem & Record<string, unknown>
  const meta = coerceMetaRecord(event.meta)
  const authMode = normalizeText(event.auth_mode || meta.auth_mode || record.auth_mode)
  if (authMode) return authMode
  return isExternalDeveloperLog(event) ? "api_key" : "unknown"
}

function parseIsoTimestamp(value: string): number {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function countEventsWithin(rows: ApiUsageEventRow[], sinceMs: number): number {
  return rows.filter((item) => parseIsoTimestamp(item.createdAt) >= sinceMs).length
}

function countRowsByStatus(rows: ApiUsageEventRow[], statusCode: string, sinceMs: number): number {
  return rows.filter((item) => item.status === statusCode && parseIsoTimestamp(item.createdAt) >= sinceMs).length
}

export function formatUsageDateTime(value: string): string {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

export function normalizeSdkScopes(scopes: string[] | undefined | null): string[] {
  return Array.from(new Set((scopes || []).map((item) => String(item || "").trim()).filter(Boolean)))
}

export function buildDeveloperEventRows(logs: DeveloperLogItem[] | null | undefined): ApiUsageEventRow[] {
  return (logs || [])
    .filter((event) => isExternalDeveloperLog(event))
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 50)
    .map((event) => ({
      id: event.event_id,
      eventType: event.event_type,
      summary: String(event.meta?.pricing_key || resolveEventPath(event) || "External API event"),
      units: Number(event.units || 0),
      createdAt: event.created_at,
      status: resolveStatusLabel(event),
      authMode: resolveAuthMode(event),
    }))
}

export function buildApiChargeRows(events: BillingEventItem[] | null | undefined): ApiChargeRow[] {
  return (events || [])
    .filter((item) => isExternalCharge(item))
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 20)
    .map((item) => ({
      id: item.billing_event_id,
      pricingKey: String(item.meta?.pricing_key || item.event_type),
      outputSummary: `${String(item.meta?.output_size || item.meta?.size_tier || "size not specified")} · ${Number(item.meta?.output_count || item.meta?.billable_outputs || 0)} outputs`,
      amountLabel: `$${(Number(item.amount_cents || 0) / 100).toFixed(2)}`,
      createdAt: item.created_at,
    }))
}

export function buildApiUsageSummary(
  scopes: string[] | undefined | null,
  metrics: DeveloperMetrics | null | undefined,
  logs: DeveloperLogItem[] | null | undefined,
  billingEvents: BillingEventItem[] | null | undefined,
) {
  const normalizedScopes = normalizeSdkScopes(scopes)
  const rows = buildDeveloperEventRows(logs)
  const charges = buildApiChargeRows(billingEvents)
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
  return {
    scopeCount: normalizedScopes.length,
    eventCount24h: countEventsWithin(rows, twentyFourHoursAgo),
    eventsLastHour: countEventsWithin(rows, oneHourAgo),
    totalUnits: rows.reduce((sum, item) => sum + item.units, 0),
    latestEventType: rows[0]?.eventType || "No recent events",
    latestEventAt: rows[0]?.createdAt || "",
    activeApiKeys: Number(metrics?.active_api_keys || 0),
    rateLimitedEvents: countRowsByStatus(rows, "429", twentyFourHoursAgo),
    scopeDeniedEvents: countRowsByStatus(rows, "403", twentyFourHoursAgo),
    billedRenderCount: charges.length,
    latestChargeLabel: charges[0]?.amountLabel || "$0.00",
  }
}
