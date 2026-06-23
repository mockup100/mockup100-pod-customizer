import type { ErpModuleCode } from "../types"

export type ErpApiContext = {
  basePath?: string
}

export function createErpApi(context: ErpApiContext = {}) {
  const basePath = context.basePath || "/erp"

  return {
    getBasePath() {
      return basePath
    },
    buildModulePath(moduleCode: ErpModuleCode) {
      return `${basePath}/modules/${moduleCode}`
    },
  }
}
