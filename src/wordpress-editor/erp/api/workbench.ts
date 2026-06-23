import { erpFetch } from "../../api/client"
import type { ErpWorkbenchOverview } from "../types"

export async function fetchErpWorkbenchOverview() {
  return erpFetch<ErpWorkbenchOverview>("/workbench/overview")
}
