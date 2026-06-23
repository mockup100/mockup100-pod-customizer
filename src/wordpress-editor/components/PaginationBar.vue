<template>
  <div v-if="totalItems > 0" class="pagination-bar">
    <span class="pagination-summary">{{ pageSummary }}</span>
    <div class="pagination-actions">
      <button type="button" class="pagination-btn" :disabled="currentPage <= 1" @click="$emit('update:currentPage', currentPage - 1)">
        {{ paginationCopy.previous }}
      </button>
      <span class="pagination-status">{{ pageStatus }}</span>
      <button type="button" class="pagination-btn" :disabled="currentPage >= totalPages" @click="$emit('update:currentPage', currentPage + 1)">
        {{ paginationCopy.next }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useUiLocaleStore } from "../stores/uiLocale"
import { resolvePageStatus, resolvePageSummary, resolvePaginationCopy } from "../utils/pagination"

const props = defineProps<{
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
}>()

defineEmits<{
  "update:currentPage": [page: number]
}>()

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const paginationCopy = computed(() => resolvePaginationCopy(locale.value))
const pageSummary = computed(() =>
  resolvePageSummary(props.currentPage, props.pageSize, props.totalItems, locale.value),
)
const pageStatus = computed(() =>
  resolvePageStatus(props.currentPage, props.totalPages, locale.value),
)
</script>

<style scoped>
.pagination-bar {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.pagination-summary {
  color: #64748b;
  font-size: 0.88rem;
  font-weight: 700;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.pagination-status {
  color: #334155;
  font-size: 0.88rem;
  font-weight: 700;
}

.pagination-btn {
  min-height: 36px;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.pagination-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 560px) {
  .pagination-bar {
    align-items: stretch;
  }

  .pagination-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
