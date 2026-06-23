import { erpFetch } from "../../api/client"
import type { ErpTemplatePermissionDetail, ErpTemplatePermissionListView } from "../types"

export async function fetchErpTemplatePermissions() {
  return erpFetch<ErpTemplatePermissionListView>("/template-permissions")
}

export async function fetchErpTemplatePermissionDetail(templateId: string) {
  return erpFetch<ErpTemplatePermissionDetail>(`/template-permissions/${templateId}`)
}

export async function updateErpTemplatePermission(templateId: string, payload: {
  visibilityScope: string
  designerEnabled: boolean
  downloadEnabled: boolean
  publishEnabled: boolean
  erpSelectable: boolean
  note: string
  printAreaName: string
  factoryPrintPath: string
  effectImageBaseUrl: string
  blacklistedTenants: Array<{
    blockedTenantId: string
    blockedTenantLabel: string
    reason: string
  }>
}) {
  return erpFetch<ErpTemplatePermissionDetail>(`/template-permissions/${templateId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
