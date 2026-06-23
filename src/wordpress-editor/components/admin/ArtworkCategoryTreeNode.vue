<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  category: any
  expandedIds: Set<string>
  usageMap: Map<string, { direct: number; total: number }>
}>()

const emit = defineEmits<{
  (event: "toggle-expand", categoryId: string): void
  (event: "edit", category: any): void
  (event: "remove", category: any): void
}>()

const hasChildren = computed(() => Boolean(props.category.children?.length))
const isExpanded = computed(() => props.expandedIds.has(props.category.category_id))
const totalUsage = computed(() => props.usageMap.get(props.category.category_id)?.total || 0)
const directUsage = computed(() => props.usageMap.get(props.category.category_id)?.direct || 0)

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "badge-success"
    case "disabled":
      return "badge-danger"
    default:
      return "badge-secondary"
  }
}
</script>

<template>
  <div class="category-item" :class="{ 'has-children': hasChildren }">
    <div class="category-header" @click="emit('toggle-expand', category.category_id)">
      <div class="category-info">
        <span class="category-icon">{{ hasChildren ? "📁" : "🎨" }}</span>
        <div class="category-details">
          <h4 class="category-name">{{ category.name }}</h4>
          <p class="category-path">{{ category.category_path }}</p>
        </div>
      </div>
      <div class="category-meta">
        <span class="badge badge-usage">{{ totalUsage }} artworks</span>
        <span v-if="directUsage" class="badge badge-direct">{{ directUsage }} direct</span>
        <span v-else class="badge badge-empty">Empty</span>
        <span :class="['badge', getStatusBadgeClass(category.status)]">
          {{ category.status === "active" ? "Active" : "Disabled" }}
        </span>
        <span class="badge badge-secondary">L{{ category.level }}</span>
      </div>
    </div>

    <div class="category-actions">
      <button class="action-btn edit-btn" @click.stop="emit('edit', category)">Edit</button>
      <button class="action-btn delete-btn" @click.stop="emit('remove', category)">Delete</button>
    </div>

    <div v-if="hasChildren && isExpanded" class="category-children">
      <ArtworkCategoryTreeNode
        v-for="child in category.children"
        :key="child.category_id"
        :category="child"
        :expanded-ids="expandedIds"
        :usage-map="usageMap"
        @toggle-expand="emit('toggle-expand', $event)"
        @edit="emit('edit', $event)"
        @remove="emit('remove', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.category-item {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

.category-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.1rem;
  background: #f8fafc;
  cursor: pointer;
}

.category-info {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  min-width: 0;
}

.category-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  font-size: 1.2rem;
}

.category-details {
  min-width: 0;
}

.category-name {
  margin: 0;
  color: #0f172a;
}

.category-path {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
  word-break: break-word;
}

.category-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.badge {
  padding: 0.32rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.badge-success {
  background: #dcfce7;
  color: #166534;
}

.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-secondary {
  background: #e2e8f0;
  color: #334155;
}

.badge-usage {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-direct {
  background: #ede9fe;
  color: #6d28d9;
}

.badge-empty {
  background: #f8fafc;
  color: #64748b;
}

.category-actions {
  display: flex;
  gap: 0.75rem;
  padding: 0 1.1rem 1rem;
}

.action-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  border-radius: 12px;
  padding: 0.55rem 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.edit-btn {
  color: #1d4ed8;
}

.delete-btn {
  color: #b91c1c;
}

.category-children {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 1rem 1rem 1.5rem;
}
</style>
