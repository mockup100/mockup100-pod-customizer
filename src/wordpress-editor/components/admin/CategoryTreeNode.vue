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
  (event: "toggle-status", category: any): void
  (event: "remove", category: any): void
}>()

const hasChildren = computed(() => Boolean(props.category.children?.length))
const isExpanded = computed(() => props.expandedIds.has(props.category.category_id))
const totalUsage = computed(() => props.usageMap.get(props.category.category_id)?.total || 0)
const directUsage = computed(() => props.usageMap.get(props.category.category_id)?.direct || 0)

function getCategoryIcon(category: any) {
  if (category.status === "disabled") return "🔒"
  if (category.children && category.children.length > 0) return "📁"
  return "📄"
}

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
        <span class="category-icon">{{ getCategoryIcon(category) }}</span>
        <div class="category-details">
          <h4 class="category-name">{{ category.name }}</h4>
          <p class="category-path">{{ category.category_path }}</p>
        </div>
      </div>
      <div class="category-meta">
        <span class="badge badge-usage">
          {{ totalUsage }} templates
        </span>
        <span v-if="directUsage" class="badge badge-direct">
          {{ directUsage }} direct
        </span>
        <span v-else class="badge badge-empty">
          Empty
        </span>
        <span :class="['badge', getStatusBadgeClass(category.status)]">
          {{ category.status === 'active' ? 'Active' : 'Disabled' }}
        </span>
        <span class="badge badge-secondary">
          L{{ category.level }}
        </span>
        <button v-if="hasChildren" class="expand-btn" :class="{ expanded: isExpanded }">
          <svg class="expand-caret" :class="{ open: isExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    <div class="category-actions">
      <button class="action-btn edit-btn" @click.stop="emit('edit', category)">
        ✏️ Edit
      </button>
      <button class="action-btn" :class="category.status === 'disabled' ? 'enable-btn' : 'disable-btn'" @click.stop="emit('toggle-status', category)">
        {{ category.status === 'disabled' ? '✅ Enable' : '🔒 Disable' }}
      </button>
      <button class="action-btn delete-btn" @click.stop="emit('remove', category)">
        🗑️ Delete
      </button>
    </div>

    <div v-if="hasChildren && isExpanded" class="category-children">
      <CategoryTreeNode
        v-for="child in category.children"
        :key="child.category_id"
        :category="child"
        :expanded-ids="expandedIds"
        :usage-map="usageMap"
        @toggle-expand="emit('toggle-expand', $event)"
        @edit="emit('edit', $event)"
        @toggle-status="emit('toggle-status', $event)"
        @remove="emit('remove', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.category-item {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.category-item:hover {
  border-color: #667eea;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  cursor: pointer;
  background: #f8f9fa;
  transition: background 0.3s ease;
}

.category-header:hover {
  background: #f0f2f5;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.category-icon {
  font-size: 1.5rem;
  min-width: 32px;
}

.category-details {
  flex: 1;
  min-width: 0;
}

.category-name {
  margin: 0 0 6px 0;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: 600;
}

.category-path {
  margin: 0;
  color: #6c757d;
  font-size: 0.95rem;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-word;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-danger {
  background: #f8d7da;
  color: #721c24;
}

.badge-secondary {
  background: #e2e3e5;
  color: #383d41;
}

.badge-usage {
  background: #e0f2fe;
  color: #075985;
}

.badge-direct {
  background: #ede9fe;
  color: #5b21b6;
}

.badge-empty {
  background: #f8fafc;
  color: #64748b;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.expand-caret {
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: transform 0.3s ease;
  transform: rotate(90deg); /* points right initially */
}

.expand-caret.open {
  transform: rotate(180deg); /* points down when open */
}

.expand-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.category-actions {
  padding: 20px 25px;
  background: #fff;
  border-top: 1px solid #e1e5e9;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: 500;
}

.edit-btn {
  background: #007bff;
  color: white;
}

.edit-btn:hover {
  background: #0056b3;
}

.enable-btn {
  background: #28a745;
  color: white;
}

.enable-btn:hover {
  background: #1e7e34;
}

.disable-btn {
  background: #ffc107;
  color: #212529;
}

.disable-btn:hover {
  background: #e0a800;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.category-children {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .category-actions {
    justify-content: center;
  }

  .action-btn {
    flex: 1;
    min-width: 120px;
  }
}
</style>
