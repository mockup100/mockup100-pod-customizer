<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import ArtworkCategoryTreeNode from "../../components/admin/ArtworkCategoryTreeNode.vue"
import { useArtworkStore } from "../../stores/artworks"
import { useAuthStore } from "../../stores/auth"
import { useUiLocaleStore } from "../../stores/uiLocale"

const artworkStore = useArtworkStore()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { platformCategories, platformItems, loading } = storeToRefs(artworkStore)

const showCreateForm = ref(false)
const showEditForm = ref(false)
const editingCategory = ref<any>(null)
const isSubmitting = ref(false)
const searchQuery = ref("")
const usageFilter = ref("all")
const sortMode = ref("usage")
const expandedCategories = ref<Set<string>>(new Set())
const pageError = ref("")

function localize(en: string, zh: string) {
  return uiLocaleStore.locale === "zh" ? zh : en
}

const categoryForm = ref({
  parent_id: "",
  name: "",
  slug: "",
  sort_order: 0,
  status: "active",
})

const categoryRoots = computed(() => platformCategories.value)

const categoryOptions = computed(() => {
  const output: Array<{ category_id: string; level: number; category_path: string; name: string; status?: string }> = []
  const walk = (nodes: typeof categoryRoots.value, parentPath = "") => {
    for (const node of nodes) {
      const path = parentPath ? `${parentPath} / ${node.name}` : node.name
      output.push({
        category_id: node.category_id,
        level: node.level,
        category_path: path,
        name: node.name,
        status: node.status,
      })
      if (node.children?.length) {
        walk(node.children, path)
      }
    }
  }
  walk(categoryRoots.value)
  return output
})

const parentCategoryOptions = computed(() => categoryOptions.value.filter((item) => item.level < 3))

const categoryUsageMap = computed(() => {
  const usage = new Map<string, { direct: number; total: number }>()
  const parentMap = new Map<string, string | null>()

  const walk = (nodes: any[], parentId: string | null = null) => {
    nodes.forEach((node) => {
      parentMap.set(node.category_id, parentId)
      usage.set(node.category_id, { direct: 0, total: 0 })
      if (node.children?.length) walk(node.children, node.category_id)
    })
  }

  walk(categoryRoots.value)

  platformItems.value.forEach((item) => {
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

const categoryStats = computed(() => {
  let total = 0
  let active = 0
  let disabled = 0

  const count = (nodes: any[]) => {
    nodes.forEach((node) => {
      total += 1
      if (node.status === "active") active += 1
      else if (node.status === "disabled") disabled += 1
      if (node.children?.length) count(node.children)
    })
  }

  count(categoryRoots.value)
  return { total, active, disabled }
})

const categoryUsageStats = computed(() => {
  let used = 0
  let empty = 0
  let boundArtworks = 0
  categoryUsageMap.value.forEach((value) => {
    boundArtworks += value.direct
    if (value.total > 0) used += 1
    else empty += 1
  })
  return { used, empty, boundArtworks }
})

const filteredCategories = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  const matchesUsageFilter = (node: any) => {
    const usage = categoryUsageMap.value.get(node.category_id)?.total || 0
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
        return a.level - b.level
      }
      const usageDiff = (categoryUsageMap.value.get(b.category_id)?.total || 0) - (categoryUsageMap.value.get(a.category_id)?.total || 0)
      if (usageDiff !== 0) return usageDiff
      return a.name.localeCompare(b.name)
    })
  }

  const filterTree = (nodes: any[], parentPath = ""): any[] => {
    return sortNodes(nodes).reduce((acc: any[], node) => {
      const path = parentPath ? `${parentPath} / ${node.name}` : node.name
      const filteredChildren = node.children?.length ? filterTree(node.children, path) : []
      const matchesSearch = !keyword || node.name.toLowerCase().includes(keyword) || path.toLowerCase().includes(keyword)
      if ((matchesSearch && matchesUsageFilter(node)) || filteredChildren.length > 0) {
        acc.push({
          ...node,
          category_path: path,
          children: filteredChildren,
        })
      }
      return acc
    }, [])
  }

  return filterTree(categoryRoots.value)
})

async function refreshArtworkCategories() {
  if (!authStore.isPlatformAdmin) return
  pageError.value = ""
  try {
    await Promise.all([
      artworkStore.loadCategories("platform"),
      artworkStore.loadLibrary("platform", { page: 1, size: 200, include_disabled: true }),
    ])
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to load artwork categories.", "加载作品分类失败。"))
  }
}

function resetForm() {
  categoryForm.value = {
    parent_id: "",
    name: "",
    slug: "",
    sort_order: 0,
    status: "active",
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
    status: category.status || "active",
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
  pageError.value = ""
  try {
    await artworkStore.createCategory({
      name: categoryForm.value.name.trim(),
      slug: categoryForm.value.slug.trim(),
      parent_id: categoryForm.value.parent_id || null,
      sort_order: categoryForm.value.sort_order,
      status: categoryForm.value.status,
    })
    closeForms()
    await refreshArtworkCategories()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to create artwork category.", "创建作品分类失败。"))
  } finally {
    isSubmitting.value = false
  }
}

async function updateCategory() {
  if (!authStore.isPlatformAdmin || !editingCategory.value) return
  isSubmitting.value = true
  pageError.value = ""
  try {
    await artworkStore.updateCategory(editingCategory.value.category_id, {
      name: categoryForm.value.name.trim(),
      slug: categoryForm.value.slug.trim(),
      parent_id: categoryForm.value.parent_id || null,
      sort_order: categoryForm.value.sort_order,
      status: categoryForm.value.status,
    })
    closeForms()
    await refreshArtworkCategories()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to update artwork category.", "更新作品分类失败。"))
  } finally {
    isSubmitting.value = false
  }
}

async function removeCategory(category: any) {
  if (!authStore.isPlatformAdmin) return
  if (!window.confirm(localize(`Delete artwork category "${category.name}"?`, `确定删除作品分类 "${category.name}" 吗？`))) return
  pageError.value = ""
  try {
    await artworkStore.deleteCategory(category.category_id)
    await refreshArtworkCategories()
  } catch (error) {
    pageError.value = String((error as Error)?.message || error || localize("Failed to delete artwork category.", "删除作品分类失败。"))
  }
}

function toggleExpanded(categoryId: string) {
  const next = new Set(expandedCategories.value)
  if (next.has(categoryId)) next.delete(categoryId)
  else next.add(categoryId)
  expandedCategories.value = next
}

onMounted(async () => {
  await refreshArtworkCategories()
})
</script>

<template>
  <div class="admin-category-page" data-testid="admin-artwork-categories-page">
    <div class="page-header">
      <div>
        <span class="page-eyebrow">{{ localize("Admin Workspace", "管理工作区") }}</span>
        <h1 class="page-title">{{ localize("Artwork Categories", "作品分类") }}</h1>
        <p class="page-subtitle">{{ localize("Manage the artwork category tree, coverage, and lifecycle rules.", "管理作品分类树、覆盖范围和生命周期规则。") }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" data-testid="artwork-categories-new-button" @click="openCreateForm">{{ localize("New Artwork Category", "新建作品分类") }}</button>
        <button class="btn-secondary" :disabled="loading" @click="refreshArtworkCategories">
          {{ loading ? localize("Refreshing...", "刷新中...") : localize("Refresh", "刷新") }}
        </button>
      </div>
    </div>

    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">{{ localize("Categories", "分类数") }}</span>
        <strong>{{ categoryStats.total }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">{{ localize("Active", "启用") }}</span>
        <strong>{{ categoryStats.active }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">{{ localize("Used", "已使用") }}</span>
        <strong>{{ categoryUsageStats.used }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">{{ localize("Bound Artworks", "绑定作品") }}</span>
        <strong>{{ categoryUsageStats.boundArtworks }}</strong>
      </div>
    </section>

    <section class="panel-card filters-card">
      <div class="filters-grid">
        <label class="form-field">
          <span>{{ localize("Search", "搜索") }}</span>
          <input v-model.trim="searchQuery" data-testid="artwork-categories-search-input" type="text" :placeholder="localize('Search categories', '搜索分类')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Usage", "使用情况") }}</span>
          <select v-model="usageFilter">
            <option value="all">{{ localize("All", "全部") }}</option>
            <option value="used">{{ localize("Used", "已使用") }}</option>
            <option value="empty">{{ localize("Empty", "空分类") }}</option>
          </select>
        </label>
        <label class="form-field">
          <span>{{ localize("Sort", "排序") }}</span>
          <select v-model="sortMode">
            <option value="usage">{{ localize("Usage", "按使用量") }}</option>
            <option value="name">{{ localize("Name", "按名称") }}</option>
            <option value="level">{{ localize("Level", "按层级") }}</option>
          </select>
        </label>
      </div>
      <p v-if="pageError" class="page-error">{{ pageError }}</p>
    </section>

    <section v-if="showCreateForm || showEditForm" class="panel-card form-card" data-testid="artwork-categories-form-modal">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ showCreateForm ? localize("Create Artwork Category", "创建作品分类") : localize("Edit Artwork Category", "编辑作品分类") }}</h2>
          <p class="section-copy">{{ localize("Use the same governance standards as the template category tree.", "使用与模板分类树相同的治理标准。") }}</p>
        </div>
      </div>
      <div class="form-grid">
        <label class="form-field">
          <span>{{ localize("Name", "名称") }}</span>
          <input v-model.trim="categoryForm.name" data-testid="artwork-categories-name-input" type="text" :placeholder="localize('Category name', '分类名称')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Slug", "Slug") }}</span>
          <input v-model.trim="categoryForm.slug" type="text" :placeholder="localize('category-slug', 'category-slug')" />
        </label>
        <label class="form-field">
          <span>{{ localize("Parent", "父级") }}</span>
          <select v-model="categoryForm.parent_id">
            <option value="">{{ localize("Root", "根级") }}</option>
            <option v-for="item in parentCategoryOptions" :key="item.category_id" :value="item.category_id">
              {{ item.category_path }}
            </option>
          </select>
        </label>
        <label class="form-field">
          <span>{{ localize("Sort Order", "排序值") }}</span>
          <input v-model.number="categoryForm.sort_order" type="number" min="0" />
        </label>
        <label class="form-field">
          <span>{{ localize("Status", "状态") }}</span>
          <select v-model="categoryForm.status">
            <option value="active">{{ localize("Active", "启用") }}</option>
            <option value="disabled">{{ localize("Disabled", "禁用") }}</option>
          </select>
        </label>
      </div>
      <div class="form-actions">
        <button class="btn-secondary" @click="closeForms">{{ localize("Cancel", "取消") }}</button>
        <button
          class="btn-primary"
          data-testid="artwork-categories-submit-button"
          :disabled="isSubmitting"
          @click="showCreateForm ? createCategory() : updateCategory()"
        >
          {{ isSubmitting ? localize("Saving...", "保存中...") : showCreateForm ? localize("Create Category", "创建分类") : localize("Save Changes", "保存修改") }}
        </button>
      </div>
    </section>

    <section class="panel-card tree-card">
      <div class="section-heading">
        <div>
          <h2 class="panel-title">{{ localize("Artwork Category Tree", "作品分类树") }}</h2>
          <p class="section-copy">{{ localize("Expand category groups to review usage and maintenance actions.", "展开分类组以查看使用情况和维护操作。") }}</p>
        </div>
      </div>
      <div v-if="filteredCategories.length" class="tree-stack">
        <ArtworkCategoryTreeNode
          v-for="category in filteredCategories"
          :key="category.category_id"
          :category="category"
          :expanded-ids="expandedCategories"
          :usage-map="categoryUsageMap"
          @toggle-expand="toggleExpanded"
          @edit="openEditForm"
          @remove="removeCategory"
        />
      </div>
      <div v-else class="empty-state">{{ localize("No artwork categories match the current filters.", "当前筛选条件下没有匹配的作品分类。") }}</div>
    </section>
  </div>
</template>

<style scoped>
.admin-category-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.page-eyebrow { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.35rem 0.7rem; background: #eef2ff; color: #4338ca; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.page-title { margin: 0; font-size: 2rem; color: #0f172a; }
.page-subtitle { margin: 0.5rem 0 0; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; }
.stat-card, .panel-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.85rem; padding: 1rem; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05); }
.stat-label { display: block; color: #64748b; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-card strong { display: block; margin-top: 0.45rem; color: #0f172a; font-size: 1.4rem; }
.filters-card, .tree-card, .form-card { display: flex; flex-direction: column; gap: 1rem; }
.filters-grid, .form-grid { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.form-field { display: flex; flex-direction: column; gap: 0.45rem; color: #475569; }
.form-field input, .form-field select { border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 0.75rem 0.85rem; background: rgba(255,255,255,0.94); }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.panel-title { margin: 0; color: #0f172a; }
.section-copy { margin: 0.35rem 0 0; color: #64748b; }
.tree-stack { display: flex; flex-direction: column; gap: 0.85rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
.page-error { margin: 0; color: #b91c1c; }
.empty-state { color: #94a3b8; font-weight: 600; }
.btn-primary, .btn-secondary { border: 0; border-radius: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; text-decoration: none; font-weight: 700; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.btn-primary { background: #0ea5e9; color: #fff; }
.btn-secondary { background: #f8fafc; color: #1d4ed8; border: 1px solid #cbd5e1; }

@media (max-width: 900px) {
  .page-header,
  .stats-grid,
  .filters-grid,
  .form-grid { grid-template-columns: 1fr; }
}
</style>
