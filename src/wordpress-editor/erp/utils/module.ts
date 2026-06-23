import type { ErpModuleDefinition } from "../types"

export function createErpModuleDefinition(partial: Pick<ErpModuleDefinition, "code" | "name" | "path">): ErpModuleDefinition {
  return {
    ...partial,
    enabled: true,
  }
}
