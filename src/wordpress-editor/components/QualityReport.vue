<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  title: string
  summaryFallback: string
  errorLabel: string
  warningLabel: string
  stats?: Record<string, unknown> | null
  errors?: Array<{ code?: string; message?: string }> | null
  warnings?: Array<{ code?: string; message?: string }> | null
  summary?: string | null
}>()

const statEntries = computed(() => Object.entries(props.stats || {}))
const errors = computed(() => props.errors || [])
const warnings = computed(() => props.warnings || [])
</script>

<template>
  <div class="next-card">
    <div class="next-card-head">
      <h4>{{ title }}</h4>
      <p>{{ summary || summaryFallback }}</p>
    </div>
    <div class="next-kv-grid" v-if="statEntries.length">
      <div v-for="[key, value] in statEntries" :key="key" class="next-api-item">
        <strong>{{ key }}</strong>
        <span>{{ String(value) }}</span>
      </div>
    </div>
    <div class="next-status" v-if="errors.length" data-tone="error">
      <strong>{{ errorLabel }}</strong>
      <span v-for="item in errors" :key="item.code || item.message">{{ item.message || item.code }}</span>
    </div>
    <div class="next-status" v-if="warnings.length">
      <strong>{{ warningLabel }}</strong>
      <span v-for="item in warnings" :key="item.code || item.message">{{ item.message || item.code }}</span>
    </div>
  </div>
</template>
