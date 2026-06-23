<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { usePlatformStore } from "../../stores/platform"
import { useAuthStore } from "../../stores/auth"
import { useTemplateStore } from "../../stores/templates"
import { useUiLocaleStore } from "../../stores/uiLocale"
import CategoryTreeNode from "../../components/admin/CategoryTreeNode.vue"
import { categoryPresets as officialCategoryPresets, type PresetCategoryNode } from "../../constants/categoryPresets"

const platformStore = usePlatformStore()
const authStore = useAuthStore()
const templateStore = useTemplateStore()
const uiLocaleStore = useUiLocaleStore()
const { categories } = storeToRefs(platformStore)
const { items } = storeToRefs(templateStore)

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

// Form states
const showCreateForm = ref(false)
const showEditForm = ref(false)
const showImportModal = ref(false)
const editingCategory = ref<any>(null)
const isSubmitting = ref(false)
const isImporting = ref(false)
const searchQuery = ref("")
const usageFilter = ref("all")
const sortMode = ref("usage")
const expandedCategories = ref<Set<string>>(new Set())

// Form data
const categoryForm = ref({
  parent_id: "",
  name: "",
  slug: "",
  sort_order: 0,
  status: "active"
})

// Import data
const importPreview = ref<any[]>([])
const importStep = ref('preview') // 'preview', 'confirm'

// Computed properties
const categoryRoots = computed(() => categories.value)

const categoryOptions = computed(() => {
  const output: Array<{ category_id: string; level: number; category_path: string; name: string; status?: string }> = []
  const walk = (nodes: typeof categoryRoots.value, level = 0) => {
    for (const node of nodes) {
      output.push({
        category_id: node.category_id,
        level: node.level,
        category_path: node.category_path || node.name,
        name: node.name,
        status: node.status,
      })
      if (node.children?.length) {
        walk(node.children, level + 1)
      }
    }
  }
  walk(categoryRoots.value)
  return output
})

const parentCategoryOptions = computed(() => 
  categoryOptions.value.filter((item) => item.level < 3)
)

const filteredCategories = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  const matchesUsageFilter = (node: any) => {
    const usage = getCategoryUsage(node.category_id)
    if (usageFilter.value === "used") return usage > 0
    if (usageFilter.value === "empty") return usage === 0
    return true
  }

  const sortNodes = (nodes: any[]) => {
    return [...nodes].sort((a, b) => {
      if (sortMode.value === "name") {
        return a.name.localeCompare(b.name)
      }
      if (sortMode.value === "level") {
        return a.level - b.level || b.sort_order - a.sort_order
      }
      const usageDiff = getCategoryUsage(b.category_id) - getCategoryUsage(a.category_id)
      if (usageDiff !== 0) return usageDiff
      return a.name.localeCompare(b.name)
    })
  }

  const filterTree = (nodes: any[]): any[] => {
    return sortNodes(nodes).reduce((acc: any[], node) => {
      const filteredChildren = node.children?.length ? filterTree(node.children) : []
      const matchesSearch = !keyword ||
        node.name.toLowerCase().includes(keyword) ||
        (node.category_path && node.category_path.toLowerCase().includes(keyword))
      const matchesCurrentNode = matchesSearch && matchesUsageFilter(node)
      if (matchesCurrentNode || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren
        })
      }
      return acc
    }, [])
  }

  return filterTree(categoryRoots.value)
})

const categoryStats = computed(() => {
  let total = 0
  let active = 0
  let disabled = 0
  
  const count = (nodes: any[]) => {
    nodes.forEach(node => {
      total++
      if (node.status === 'active') active++
      else if (node.status === 'disabled') disabled++
      if (node.children) count(node.children)
    })
  }
  
  count(categoryRoots.value)
  return { total, active, disabled }
})

const categoryUsageMap = computed(() => {
  const usage = new Map<string, { direct: number; total: number }>()
  const parentMap = new Map<string, string | null>()

  const walk = (nodes: any[], parentId: string | null = null) => {
    nodes.forEach(node => {
      parentMap.set(node.category_id, parentId)
      usage.set(node.category_id, { direct: 0, total: 0 })
      if (node.children?.length) walk(node.children, node.category_id)
    })
  }

  walk(categoryRoots.value)

  items.value.forEach(item => {
    if (!item.category_id || !usage.has(item.category_id)) return
    usage.get(item.category_id)!.direct += 1
    let currentId: string | null = item.category_id
    while (currentId) {
      const current = usage.get(currentId)
      if (current) current.total += 1
      currentId = parentMap.get(currentId) || null
    }
  })

  return usage
})

const categoryUsageStats = computed(() => {
  let used = 0
  let empty = 0
  let boundTemplates = 0

  categoryUsageMap.value.forEach((value) => {
    boundTemplates += value.direct
    if (value.total > 0) used += 1
    else empty += 1
  })

  return { used, empty, boundTemplates }
})

// Methods
async function refreshTemplateCategories() {
  if (!authStore.isPlatformAdmin) return
  try {
    await platformStore.loadTemplateCategories(authStore.authHeaders)
  } catch (error) {
    console.error(localize('Failed to load categories:', '加载分类失败:'), error)
  }
}

function resetForm() {
  categoryForm.value = {
    parent_id: "",
    name: "",
    slug: "",
    sort_order: 0,
    status: "active"
  }
}

function openCreateForm() {
  resetForm()
  showCreateForm.value = true
  showEditForm.value = false
  editingCategory.value = null
}

function openEditForm(category: any) {
  categoryForm.value = {
    parent_id: category.parent_id || "",
    name: category.name,
    slug: category.slug || "",
    sort_order: category.sort_order || 0,
    status: category.status || "active"
  }
  showEditForm.value = true
  showCreateForm.value = false
  editingCategory.value = category
}

function closeForms() {
  showCreateForm.value = false
  showEditForm.value = false
  editingCategory.value = null
  resetForm()
}

async function createCategory() {
  if (!authStore.isPlatformAdmin || !categoryForm.value.name.trim()) return
  
  isSubmitting.value = true
  try {
    await platformStore.createTemplateCategory(authStore.authHeaders, {
      name: categoryForm.value.name.trim(),
      slug: categoryForm.value.slug.trim(),
      parent_id: categoryForm.value.parent_id || null,
      sort_order: categoryForm.value.sort_order,
      status: categoryForm.value.status
    })
    
    closeForms()
    await refreshTemplateCategories()
  } catch (error) {
    console.error(localize('Failed to create category:', '创建分类失败:'), error)
  } finally {
    isSubmitting.value = false
  }
}

async function updateCategory() {
  if (!authStore.isPlatformAdmin || !editingCategory.value) return
  
  isSubmitting.value = true
  try {
    await platformStore.updateTemplateCategory(authStore.authHeaders, editingCategory.value.category_id, {
      name: categoryForm.value.name.trim(),
      slug: categoryForm.value.slug.trim(),
      sort_order: categoryForm.value.sort_order,
      status: categoryForm.value.status
    })
    
    closeForms()
    await refreshTemplateCategories()
  } catch (error) {
    console.error(localize('Failed to update category:', '更新分类失败:'), error)
  } finally {
    isSubmitting.value = false
  }
}

async function toggleCategoryStatus(category: any) {
  if (!authStore.isPlatformAdmin) return
  
  try {
    await platformStore.updateTemplateCategory(authStore.authHeaders, category.category_id, {
      name: category.name,
      slug: category.slug || "",
      sort_order: category.sort_order || 0,
      status: category.status === "disabled" ? "active" : "disabled"
    })
    await refreshTemplateCategories()
  } catch (error) {
    console.error(localize('Failed to toggle category status:', '切换分类状态失败:'), error)
  }
}

async function removeCategory(category: any) {
  if (!authStore.isPlatformAdmin) return
  
  const hasChildren = category.children && category.children.length > 0
  const confirmMessage = hasChildren 
    ? localize(`Category "${category.name}" contains subcategories. Deleting will also remove all subcategories. Are you sure?`, `分类 "${category.name}" 包含子分类。删除后会一并删除所有子分类，确定继续吗？`)
    : localize(`Are you sure you want to delete category "${category.name}"?`, `确定删除分类 "${category.name}" 吗？`)
    
  if (!window.confirm(confirmMessage)) return
  
  try {
    await platformStore.deleteTemplateCategory(authStore.authHeaders, category.category_id)
    await refreshTemplateCategories()
  } catch (error) {
    console.error(localize('Failed to delete category:', '删除分类失败:'), error)
  }
}

function toggleExpand(categoryId: string) {
  const next = new Set(expandedCategories.value)
  if (next.has(categoryId)) next.delete(categoryId)
  else next.add(categoryId)
  expandedCategories.value = next
}

function getCategoryUsage(categoryId: string) {
  return categoryUsageMap.value.get(categoryId)?.total || 0
}

// Import functions
function openImportModal() {
  showImportModal.value = true
  importStep.value = 'preview'
  importPreview.value = flattenPresetPreview(officialCategoryPresets).slice(0, 24)
}

function closeImportModal() {
  showImportModal.value = false
  importStep.value = 'preview'
  importPreview.value = []
}

function flattenPresetPreview(nodes: PresetCategoryNode[], parent = "", level = 1): any[] {
  return nodes.flatMap((node) => {
    const current = [{ name: node.name, parent, level, slug: node.slug }]
    const children = node.children?.length ? flattenPresetPreview(node.children, node.name, level + 1) : []
    return [...current, ...children]
  })
}

function findCategoryNode(nodes: any[], name: string, parentId: string | null): any | null {
  for (const node of nodes) {
    if (node.name === name && (node.parent_id || null) === parentId) {
      return node
    }
    if (node.children?.length) {
      const match = findCategoryNode(node.children, name, parentId)
      if (match) return match
    }
  }
  return null
}

function hasMissingPresetNodes(nodes: PresetCategoryNode[], parentId: string | null = null): boolean {
  for (const node of nodes) {
    const existing = findCategoryNode(categories.value, node.name, parentId)
    if (!existing) {
      return true
    }
    if (node.children?.length && hasMissingPresetNodes(node.children, existing.category_id)) {
      return true
    }
  }
  return false
}

async function ensurePresetNodes(nodes: PresetCategoryNode[], parentId: string | null = null) {
  for (const [index, node] of nodes.entries()) {
    let existing = findCategoryNode(categories.value, node.name, parentId)
    if (!existing) {
      await platformStore.createTemplateCategory(authStore.authHeaders, {
        name: node.name,
        slug: node.slug,
        parent_id: parentId,
        sort_order: index + 1,
        status: "active",
      })
      await refreshTemplateCategories()
      existing = findCategoryNode(categories.value, node.name, parentId)
    }
    if (existing && node.children?.length) {
      await ensurePresetNodes(node.children, existing.category_id)
    }
  }
}

async function ensureOfficialCategoryPresets() {
  if (!authStore.isPlatformAdmin) return
  const isLatestMissing = hasMissingPresetNodes(officialCategoryPresets)
  if (!isLatestMissing) return
  await ensurePresetNodes(officialCategoryPresets)
  await refreshTemplateCategories()
}

function collectExpandableCategoryIds(nodes: any[]): string[] {
  return nodes.flatMap((node) => {
    const current = node.children?.length ? [node.category_id] : []
    const children = node.children?.length ? collectExpandableCategoryIds(node.children) : []
    return [...current, ...children]
  })
}

function expandAllCategories() {
  expandedCategories.value = new Set(collectExpandableCategoryIds(filteredCategories.value))
}

function collapseAllCategories() {
  expandedCategories.value = new Set()
}

function confirmImport() {
  importStep.value = 'confirm'
}

async function executeImport() {
  isImporting.value = true
  try {
    await ensurePresetNodes(officialCategoryPresets)
    closeImportModal()
    await refreshTemplateCategories()
  } catch (error) {
    console.error('Failed to import categories:', error)
  } finally {
    isImporting.value = false
  }
}

async function syncOfficialCatalog() {
  if (!authStore.isPlatformAdmin) return
  isSubmitting.value = true
  try {
    await ensurePresetNodes(officialCategoryPresets)
    await refreshTemplateCategories()
  } catch (error) {
    console.error('Failed to sync official category tree:', error)
  } finally {
    isSubmitting.value = false
  }
}

async function resetToOfficialCategories() {
  if (!authStore.isPlatformAdmin) return
  const confirmed = window.confirm(localize("This will delete legacy categories, uncategorized templates, and templates bound to old categories, then rebuild the official 3-level category tree. Continue?", "这会删除旧分类、未分类模板以及绑定到旧分类的模板，然后重建官方三级分类树。确定继续吗？"))
  if (!confirmed) return
  isSubmitting.value = true
  try {
    await platformStore.resetOfficialTemplateCategories(authStore.authHeaders)
    await Promise.all([
      refreshTemplateCategories(),
      templateStore.load().catch(() => undefined),
    ])
    collapseAllCategories()
  } catch (error) {
    console.error("Failed to reset official categories:", error)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  ;(async () => {
    await refreshTemplateCategories()
    await ensureOfficialCategoryPresets()
    if (authStore.isAuthenticated) {
      await templateStore.load().catch(() => undefined)
    }
  })().catch(() => undefined)
})
</script>

<template>
  <div class="admin-category-page" data-testid="admin-categories-page">
    <!-- Premium Header -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1>{{ localize("Template Categories", "模板分类") }}</h1>
          <p>{{ localize("Manage the platform template category tree.", "管理平台模板分类树。") }}</p>
        </div>
        <div class="header-actions">
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-number">{{ categoryStats.total }}</div>
              <div class="stat-label">{{ localize("Total Categories", "分类总数") }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ categoryStats.active }}</div>
              <div class="stat-label">{{ localize("Active", "启用") }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ categoryStats.disabled }}</div>
              <div class="stat-label">{{ localize("Disabled", "禁用") }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ categoryUsageStats.used }}</div>
              <div class="stat-label">{{ localize("Used Categories", "已使用分类") }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ categoryUsageStats.empty }}</div>
              <div class="stat-label">{{ localize("Empty Categories", "空分类") }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ categoryUsageStats.boundTemplates }}</div>
              <div class="stat-label">{{ localize("Bound Templates", "绑定模板") }}</div>
            </div>
          </div>
          <div class="action-buttons">
            <button 
              v-if="authStore.isPlatformAdmin"
              class="btn btn-secondary"
              @click="syncOfficialCatalog"
            >
              <span class="btn-icon">👗</span>
              {{ localize("Sync Category Tree", "同步分类树") }}
            </button>
            <button 
              v-if="authStore.isPlatformAdmin"
              class="btn btn-secondary"
              data-testid="categories-import-button"
              @click="openImportModal"
            >
              <span class="btn-icon">📥</span>
              {{ localize("Preview Category Tree", "预览分类树") }}
            </button>
            <button
              v-if="authStore.isPlatformAdmin"
              class="btn btn-danger"
              data-testid="categories-reset-official-button"
              @click="resetToOfficialCategories"
            >
              <span class="btn-icon">♻️</span>
              {{ localize("Reset Category Tree", "重置分类树") }}
            </button>
            <button 
              v-if="authStore.isPlatformAdmin"
              class="btn btn-primary"
              data-testid="categories-new-button"
              @click="openCreateForm"
            >
              <span class="btn-icon">➕</span>
              {{ localize("New Category", "新建分类") }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="search-section" v-if="authStore.isPlatformAdmin">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="localize('Search categories by name or path...', '按名称或路径搜索分类...')"
          class="search-input"
          data-testid="categories-search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-toolbar">
        <div class="filter-chips">
          <button type="button" class="filter-chip" :class="{ active: usageFilter === 'all' }" @click="usageFilter = 'all'">{{ localize("All", "全部") }}</button>
          <button type="button" class="filter-chip" :class="{ active: usageFilter === 'used' }" @click="usageFilter = 'used'">{{ localize("Used Only", "仅已使用") }}</button>
          <button type="button" class="filter-chip" :class="{ active: usageFilter === 'empty' }" @click="usageFilter = 'empty'">{{ localize("Empty Only", "仅空分类") }}</button>
        </div>
        <div class="toolbar-actions">
          <select v-model="sortMode" class="sort-select unified-select">
            <option value="usage">{{ localize("Sort by usage", "按使用量排序") }}</option>
            <option value="name">{{ localize("Sort by name", "按名称排序") }}</option>
            <option value="level">{{ localize("Sort by level", "按层级排序") }}</option>
          </select>
          <button type="button" class="filter-chip" @click="expandAllCategories">{{ localize("Expand All", "展开全部") }}</button>
          <button type="button" class="filter-chip" @click="collapseAllCategories">{{ localize("Collapse All", "收起全部") }}</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form -->
    <div v-if="showCreateForm || showEditForm" class="form-overlay">
      <div class="form-modal" data-testid="categories-form-modal">
        <div class="modal-header">
          <h3>{{ showCreateForm ? localize('Create Category', '创建分类') : localize('Edit Category', '编辑分类') }}</h3>
          <button class="close-btn" @click="closeForms">✕</button>
        </div>
        <form @submit.prevent="showCreateForm ? createCategory() : updateCategory()" class="category-form">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ localize("Parent Category", "父级分类") }}</label>
              <select v-model="categoryForm.parent_id" class="form-control unified-select">
                <option value="">{{ localize("Top Level Category", "顶级分类") }}</option>
                <option 
                  v-for="item in parentCategoryOptions" 
                  :key="item.category_id" 
                  :value="item.category_id"
                >
                  {{ '　'.repeat(item.level) }}{{ item.category_path }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ localize("Category Name", "分类名称") }} *</label>
              <input
                v-model="categoryForm.name"
                type="text"
                class="form-control"
                data-testid="categories-name-input"
                :placeholder="localize('Enter category name', '输入分类名称')"
                required
              />
            </div>
            <div class="form-group">
              <label>{{ localize("Category Slug", "分类 Slug") }}</label>
              <input
                v-model="categoryForm.slug"
                type="text"
                class="form-control"
                :placeholder="localize('Category URL identifier (optional)', '分类 URL 标识（可选）')"
              />
            </div>
            <div class="form-group">
              <label>{{ localize("Sort Order", "排序值") }}</label>
              <input
                v-model.number="categoryForm.sort_order"
                type="number"
                class="form-control"
                min="0"
              />
            </div>
            <div class="form-group">
              <label>{{ localize("Status", "状态") }}</label>
              <select v-model="categoryForm.status" class="form-control unified-select">
                <option value="active">{{ localize("Active", "启用") }}</option>
                <option value="disabled">{{ localize("Disabled", "禁用") }}</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn btn-primary"
              data-testid="categories-submit-button"
              :disabled="isSubmitting || !categoryForm.name.trim()"
            >
              <span v-if="isSubmitting" class="loading-spinner"></span>
                  {{ isSubmitting ? localize('Processing...', '处理中...') : (showCreateForm ? localize('Create Category', '创建分类') : localize('Save Changes', '保存修改')) }}
            </button>
            <button 
              type="button" 
              class="btn btn-secondary"
              data-testid="categories-cancel-button"
              @click="closeForms"
            >
              {{ localize("Cancel", "取消") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="form-overlay">
      <div class="import-modal">
        <div class="modal-header">
          <h3>{{ localize("Apply Official Category Tree", "应用官方分类树") }}</h3>
          <button class="close-btn" @click="closeImportModal">✕</button>
        </div>

        <!-- Preview Step -->
        <div v-if="importStep === 'preview'" class="import-step">
          <div class="import-content">
            <h4>{{ localize("Official Category Tree Preview", "官方分类树预览") }}</h4>
            <p>{{ localize("This action syncs the built-in three-level category tree used by the platform. It does not import arbitrary JSON or CSV files.", "该操作会同步平台内置的三级分类树，不会导入任意 JSON 或 CSV 文件。") }}</p>
            <div class="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>{{ localize("Category Name", "分类名称") }}</th>
                    <th>{{ localize("Parent", "父级") }}</th>
                    <th>{{ localize("Level", "层级") }}</th>
                    <th>{{ localize("Slug", "Slug") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in importPreview" :key="item.slug">
                    <td>{{ item.name }}</td>
                    <td>{{ item.parent }}</td>
                    <td>L{{ item.level }}</td>
                    <td><code>{{ item.slug }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>{{ localize(`Showing the first ${importPreview.length} rows from the official category preview.`, `显示官方分类预览中的前 ${importPreview.length} 行。`) }}</p>
            <div class="preview-actions">
              <button class="btn btn-secondary" @click="closeImportModal">
                {{ localize("Close", "关闭") }}
              </button>
              <button class="btn btn-primary" @click="confirmImport">
                {{ localize("Apply Category Tree", "应用分类树") }}
              </button>
            </div>
          </div>
        </div>

        <!-- Confirm Step -->
        <div v-if="importStep === 'confirm'" class="import-step">
          <div class="import-content">
            <div class="confirm-content">
              <div class="confirm-icon">⚠️</div>
              <h4>{{ localize("Confirm Category Tree Sync", "确认同步分类树") }}</h4>
              <p>{{ localize("This will create any missing categories from the official tree and keep existing matching nodes. This action does not read local files.", "该操作会创建官方分类树中缺失的分类，并保留现有匹配节点；不会读取本地文件。") }}</p>
              <div class="confirm-actions">
                <button class="btn btn-secondary" @click="importStep = 'preview'">
                  {{ localize("Back", "返回") }}
                </button>
                <button 
                  class="btn btn-primary"
                  :disabled="isImporting"
                  @click="executeImport"
                >
                  <span v-if="isImporting" class="loading-spinner"></span>
                  {{ isImporting ? localize('Applying...', '应用中...') : localize('Apply Category Tree', '应用分类树') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category List -->
    <main class="category-content" v-if="authStore.isPlatformAdmin">
      <div v-if="filteredCategories.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>{{ localize("No Categories Found", "未找到分类") }}</h3>
        <p>{{ searchQuery ? localize('No categories match your search criteria', '没有分类匹配当前搜索条件') : localize('Click "New Category" to create your first category', '点击“新建分类”创建你的第一个分类') }}</p>
      </div>
      
      <div v-else class="category-tree">
        <CategoryTreeNode
          v-for="category in filteredCategories" 
          :key="category.category_id"
          :category="category"
          :expanded-ids="expandedCategories"
          :usage-map="categoryUsageMap"
          @toggle-expand="toggleExpand"
          @edit="openEditForm"
          @toggle-status="toggleCategoryStatus"
          @remove="removeCategory"
        />
      </div>
    </main>

    <!-- Access Denied -->
    <div v-else class="access-denied">
      <div class="denied-content">
        <div class="denied-icon">🔒</div>
        <h2>{{ localize("Access Restricted", "访问受限") }}</h2>
        <p>{{ localize("Only platform administrators can manage category system.", "只有平台管理员可以管理分类系统。") }}</p>
        <p>{{ localize("Please contact your platform administrator for access.", "如需访问权限，请联系平台管理员。") }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-category-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Console Header */
.page-header {
  background: #fff;
  color: #0f172a;
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 30px;
  position: relative;
  z-index: 1;
}

.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.header-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.stats-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  text-align: center;
  border: 1px solid #e2e8f0;
  min-width: 120px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Search Section */
.search-section {
  margin-bottom: 1rem;
}

.search-container {
  position: relative;
  max-width: 500px;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 16px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-chip {
  border: 1px solid #dbe3f0;
  background: white;
  color: #475569;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  border-color: #667eea;
  color: #4f46e5;
}

.filter-chip.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.sort-select {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  padding: 10px 14px;
  background: white;
  color: #334155;
  min-width: 180px;
  font-size: 0.95rem;
}

.search-input {
  width: 100%;
  padding: 15px 50px 15px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 1.2rem;
}

/* Form Overlay */
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.form-modal, .import-modal {
  background: white;
  border-radius: 16px;
  padding: 0;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  border-bottom: 1px solid #e1e5e9;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 8px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

/* Category Form */
.category-form {
  padding: 30px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 0.95rem;
}

.form-control {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

/* Import Styles */
.import-step {
  padding: 30px;
}

.import-content h4 {
  margin: 0 0 20px 0;
  font-size: 1.3rem;
  color: #2c3e50;
  font-weight: 600;
}

.upload-area {
  text-align: center;
  padding: 40px;
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  background: #f8f9fa;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.upload-area h4 {
  margin: 0 0 10px 0;
  color: #495057;
}

.upload-area p {
  margin: 0 0 20px 0;
  color: #6c757d;
}

.file-input {
  margin-bottom: 20px;
}

.preview-table {
  margin: 20px 0;
  overflow-x: auto;
}

.preview-table table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.preview-table th,
.preview-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.preview-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.preview-table code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.preview-actions,
.confirm-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.confirm-content {
  text-align: center;
  padding: 20px;
}

.confirm-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}
/* Button Styles */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1.1rem;
}

/* Category List */
.category-content {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6c757d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 1.5rem;
}

.category-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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
  background: #e9ecef;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.category-icon {
  font-size: 1.6rem;
}

.category-details {
  flex: 1;
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
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 10px;
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
  font-size: 0.9rem;
}

.expand-btn:hover {
  background: #e9ecef;
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

/* Access Denied */
.access-denied {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.denied-content {
  max-width: 500px;
  margin: 0 auto;
}

.denied-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.denied-content h2 {
  margin: 0 0 15px 0;
  color: #dc3545;
  font-size: 1.8rem;
}

.denied-content p {
  margin: 0 0 10px 0;
  color: #6c757d;
  font-size: 1.1rem;
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-category-page {
    padding: 15px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }
  
  .stats-cards {
    justify-content: center;
  }

  .filter-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-select {
    min-width: 0;
    width: 100%;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
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
