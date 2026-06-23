import { defineStore } from "pinia"

import type { ErpModuleDefinition } from "../types"

export const ERP_SHELL_STORE_ID = "erp-shell"

export const useErpShellStore = defineStore(ERP_SHELL_STORE_ID, {
  state: () => ({
    hydrated: false,
    modules: [] as ErpModuleDefinition[],
  }),
  actions: {
    hydrate(modules: ErpModuleDefinition[] = []) {
      this.modules = modules
      this.hydrated = true
    },
    setModules(modules: ErpModuleDefinition[]) {
      this.modules = modules
    },
  },
})
