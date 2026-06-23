<script lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, defineComponent, h } from "vue"
import type { PropType } from "vue"
import { storeToRefs } from "pinia"
import type { CategoryNode } from "../stores/platform"
import { useUiLocaleStore } from "../stores/uiLocale"

// Recursive tree node component - defined outside setup to avoid circular reference issues
const TreeNode = defineComponent({
  name: "TreeNode",
  props: {
    node: { type: Object as PropType<CategoryNode>, required: true },
    level: { type: Number, default: 1 },
    selectedId: { type: String, default: "" },
    expandedIds: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["select", "toggle"],
  setup(props, { emit }) {
    const hasChildren = computed(() => {
      return props.node.children && props.node.children.length > 0
    })
    const isSelected = computed(() => props.selectedId === props.node.category_id)
    const isExpanded = computed(() => props.expandedIds.includes(props.node.category_id))
    const paddingLeft = computed(() => `${(props.level - 1) * 12 + 12}px`)

    function onClick() {
      emit("select", props.node)
    }

    function onToggle(e: Event) {
      e.stopPropagation()
      emit("toggle", props.node)
    }

    return {
      hasChildren,
      isSelected,
      isExpanded,
      paddingLeft,
      onClick,
      onToggle,
    }
  },
  render() {
    return h("div", { class: "tree-node" }, [
      h(
        "button",
        {
          class: ["tree-node-item", { "is-selected": this.isSelected, "is-leaf": !this.hasChildren }],
          style: { paddingLeft: this.paddingLeft },
          "data-level": this.level,
          onClick: this.onClick,
        },
        [
          this.hasChildren
            ? h(
                "span",
                {
                  class: ["tree-toggle", { "is-expanded": this.isExpanded }],
                  onClick: this.onToggle,
                },
                "▶"
              )
            : h("span", { class: "tree-spacer" }, ""),
          h("span", { class: "tree-label" }, this.node.name),
        ]
      ),
      this.hasChildren && this.isExpanded
        ? h(
            "div",
            { class: "tree-children" },
            this.node.children!.map((child: CategoryNode) =>
              h(TreeNode, {
                node: child,
                level: this.level + 1,
                selectedId: this.selectedId,
                expandedIds: this.expandedIds,
                onSelect: (n: CategoryNode) => this.$emit("select", n),
                onToggle: (n: CategoryNode) => this.$emit("toggle", n),
              })
            )
          )
        : null,
    ])
  },
})
</script>

<script setup lang="ts">

type SelectableCategoryOption = {
  category_id: string
  category_path: string
  name: string
}

type RecentCategoryOption = {
  category_id: string
  category_path: string
  name: string
}

const props = withDefaults(defineProps<{
  categories: CategoryNode[]
  modelValue: string
  disabled?: boolean
  clearValue?: string
  allowNonLeaf?: boolean
  displayMode?: "dropdown" | "panel" | "sidebar"
  inlineClear?: boolean
  showClearButton?: boolean
  showRecentOptions?: boolean
  showSelectionSummary?: boolean
  level1Placeholder?: string
  level2Placeholder?: string
  level3Placeholder?: string
  helperText?: string
  recentStorageKey?: string
}>(), {
  disabled: false,
  clearValue: "",
  allowNonLeaf: false,
  displayMode: "dropdown",
  inlineClear: false,
  showClearButton: true,
  showRecentOptions: true,
  showSelectionSummary: true,
  level1Placeholder: "",
  level2Placeholder: "",
  level3Placeholder: "",
  helperText: "",
  recentStorageKey: "mockup-recent-template-categories",
})

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
}>()

const level1Id = ref(props.clearValue)
const level2Id = ref(props.clearValue)
const level3Id = ref(props.clearValue)
const recentCategoryIds = ref<string[]>([])
const rootRef = ref<HTMLElement | null>(null)
const openMenu = ref<1 | 2 | 3 | null>(null)
const suppressNextClearSync = ref(false)
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

// Sidebar mode: expanded node IDs
const expandedIds = ref<Set<string>>(new Set())

function isExpanded(nodeId: string): boolean {
  return expandedIds.value.has(nodeId)
}

function toggleExpanded(nodeId: string) {
  const next = new Set(expandedIds.value)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  expandedIds.value = next
}

function handleNodeSelect(node: CategoryNode) {
  // If leaf node (level 3 or no children), emit selection
  if (!node.children || node.children.length === 0) {
    selectLeafCategory(node.category_id)
  } else {
    // For non-leaf, just expand/collapse
    toggleExpanded(node.category_id)
  }
}

function handleNodeToggle(node: CategoryNode) {
  toggleExpanded(node.category_id)
}

const CATEGORY_SELECTOR_I18N = {
  en: {
    selectLevel1: "Select Level 1",
    selectLevel2: "Select Level 2",
    selectLevel3: "Select Level 3",
    clear: "Clear",
    recent: "Recent",
    secondLevelFinal: "The selected second-level category is already final. No third-level selection is required.",
    firstLevelFinal: "The selected first-level category is already final. No deeper selection is required.",
    noThirdLevel: "This category branch has no third-level options. Use the currently selected category.",
    selectedCount: "{count}/3 selected",
  },
  zh: {
    selectLevel1: "选择一级分类",
    selectLevel2: "选择二级分类",
    selectLevel3: "选择三级分类",
    clear: "清空",
    recent: "最近使用",
    secondLevelFinal: "当前选择的二级分类已是最终分类，无需再选三级分类。",
    firstLevelFinal: "当前选择的一级分类已是最终分类，无需继续向下选择。",
    noThirdLevel: "该分类分支没有三级选项，可直接使用当前已选分类。",
    selectedCount: "已选择 {count}/3",
  },
} as const

function t(key: keyof typeof CATEGORY_SELECTOR_I18N.en, params?: Record<string, string | number>) {
  let message: string = CATEGORY_SELECTOR_I18N[locale.value][key] || CATEGORY_SELECTOR_I18N.en[key]
  if (!params) return message
  for (const [token, value] of Object.entries(params)) {
    message = message.replace(`{${token}}`, String(value))
  }
  return message
}

const resolvedLevel1Placeholder = computed(() => props.level1Placeholder || t("selectLevel1"))
const resolvedLevel2Placeholder = computed(() => props.level2Placeholder || t("selectLevel2"))
const resolvedLevel3Placeholder = computed(() => props.level3Placeholder || t("selectLevel3"))

function isCleared(value: string) {
  return !value || value === props.clearValue
}

function isNodeEnabled(node: CategoryNode) {
  return node.status !== "disabled"
}

function getEnabledChildren(node: CategoryNode | undefined | null) {
  return (node?.children || []).filter(isNodeEnabled)
}

function isLeafNode(node: CategoryNode | undefined | null) {
  return !getEnabledChildren(node).length
}

function findChain(nodes: CategoryNode[], targetId: string, parents: CategoryNode[] = []): CategoryNode[] {
  for (const node of nodes) {
    const chain = [...parents, node]
    if (node.category_id === targetId) {
      return chain
    }
    if (node.children?.length) {
      const match = findChain(node.children, targetId, chain)
      if (match.length) return match
    }
  }
  return []
}

function collectSelectableNodes(nodes: CategoryNode[]): SelectableCategoryOption[] {
  const output: SelectableCategoryOption[] = []
  const walk = (items: CategoryNode[]) => {
    for (const item of items) {
      if (item.status === "disabled") continue
      if (props.allowNonLeaf || item.level === 3 || !item.children?.length) {
        output.push({
          category_id: item.category_id,
          category_path: item.category_path || item.name,
          name: item.name,
        })
      }
      if (item.children?.length) {
        walk(item.children)
      }
    }
  }
  walk(nodes)
  return output
}

const level1Options = computed(() => props.categories.filter(isNodeEnabled))
const selectedLevel1Node = computed(() => level1Options.value.find((item) => item.category_id === level1Id.value) || null)
const level2Options = computed(() => getEnabledChildren(selectedLevel1Node.value))
const selectedLevel2Node = computed(() => level2Options.value.find((item) => item.category_id === level2Id.value) || null)
const level3Options = computed(() => getEnabledChildren(selectedLevel2Node.value))
const recentCategoryRank = computed(() => {
  const rank = new Map<string, number>()
  recentCategoryIds.value.forEach((categoryId, index) => {
    rank.set(categoryId, index)
  })
  return rank
})
const sortedLevel3Options = computed(() => {
  return [...level3Options.value].sort((left, right) => {
    const leftRank = recentCategoryRank.value.get(left.category_id)
    const rightRank = recentCategoryRank.value.get(right.category_id)
    if (leftRank != null && rightRank != null) return leftRank - rightRank
    if (leftRank != null) return -1
    if (rightRank != null) return 1
    return left.name.localeCompare(right.name, "en")
  })
})
const isPanelMode = computed(() => props.displayMode === "panel")
const isSidebarMode = computed(() => props.displayMode === "sidebar")
const renderedLevel3Options = computed(() => (
  isPanelMode.value ? level3Options.value : sortedLevel3Options.value
))
const selectedLeafPath = computed(() => {
  if (isCleared(props.modelValue)) return ""
  return findChain(props.categories, props.modelValue).map((item) => item.name).join(" / ")
})
const selectedCountLabel = computed(() => [level1Id.value, level2Id.value, level3Id.value].filter((item) => !isCleared(item)).length)
const helperMessage = computed(() => {
  if (selectedLeafPath.value) return selectedLeafPath.value
  if (!isCleared(level2Id.value) && isLeafNode(selectedLevel2Node.value)) {
    return t("secondLevelFinal")
  }
  if (!isCleared(level1Id.value) && isLeafNode(selectedLevel1Node.value)) {
    return t("firstLevelFinal")
  }
  if (!isCleared(level2Id.value) && !level3Options.value.length) {
    return t("noThirdLevel")
  }
  return props.helperText
})
const allLeafOptions = computed(() => collectSelectableNodes(props.categories))
const recentOptions = computed(() => {
  const seenPaths = new Set<string>()
  const output: RecentCategoryOption[] = []
  for (const categoryId of recentCategoryIds.value) {
    const chain = findChain(props.categories, categoryId)
    const leaf = chain[chain.length - 1]
    if (!leaf || chain.length < 3 || !isLeafNode(leaf)) continue
    const categoryPath = chain.map((item) => item.name).join(" / ")
    if (seenPaths.has(categoryPath)) continue
    seenPaths.add(categoryPath)
    output.push({
      category_id: categoryId,
      category_path: categoryPath,
      name: leaf.name,
    })
    if (output.length >= 5) break
  }
  return output
})

function syncSelectionFromModel() {
  if (isCleared(props.modelValue)) {
    if (suppressNextClearSync.value) {
      suppressNextClearSync.value = false
      return
    }
    level1Id.value = props.clearValue
    level2Id.value = props.clearValue
    level3Id.value = props.clearValue
    return
  }
  suppressNextClearSync.value = false
  const chain = findChain(props.categories, props.modelValue)
  level1Id.value = chain[0]?.category_id || props.clearValue
  level2Id.value = chain[1]?.category_id || props.clearValue
  level3Id.value = chain[2]?.category_id || props.clearValue
}

function loadRecentCategoryIds() {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(props.recentStorageKey)
    recentCategoryIds.value = raw ? JSON.parse(raw) : []
  } catch {
    recentCategoryIds.value = []
  }
}

function persistRecentCategory(categoryId: string) {
  if (isCleared(categoryId) || typeof window === "undefined") return
  const nextIds = [categoryId, ...recentCategoryIds.value.filter((item) => item !== categoryId)].slice(0, 5)
  recentCategoryIds.value = nextIds
  window.localStorage.setItem(props.recentStorageKey, JSON.stringify(nextIds))
}

function clearSelection() {
  level1Id.value = props.clearValue
  level2Id.value = props.clearValue
  level3Id.value = props.clearValue
  openMenu.value = null
  emit("update:modelValue", props.clearValue)
}

function selectLeafCategory(categoryId: string) {
  const chain = findChain(props.categories, categoryId)
  level1Id.value = chain[0]?.category_id || props.clearValue
  level2Id.value = chain[1]?.category_id || props.clearValue
  level3Id.value = chain[2]?.category_id || props.clearValue
  openMenu.value = null
  emit("update:modelValue", categoryId)
  persistRecentCategory(categoryId)
}

function handleLevel1Change() {
  level2Id.value = props.clearValue
  level3Id.value = props.clearValue
  const categoryId = level1Id.value || props.clearValue
  if (props.allowNonLeaf) {
    emit("update:modelValue", categoryId)
    persistRecentCategory(categoryId)
    return
  }
  if (isLeafNode(selectedLevel1Node.value)) {
    emit("update:modelValue", categoryId)
    persistRecentCategory(categoryId)
    return
  }
  suppressNextClearSync.value = true
  emit("update:modelValue", props.clearValue)
}

function handleLevel2Change() {
  level3Id.value = props.clearValue
  const categoryId = level2Id.value || props.clearValue
  if (props.allowNonLeaf) {
    emit("update:modelValue", categoryId)
    persistRecentCategory(categoryId)
    return
  }
  if (isLeafNode(selectedLevel2Node.value)) {
    emit("update:modelValue", categoryId)
    persistRecentCategory(categoryId)
    return
  }
  suppressNextClearSync.value = true
  emit("update:modelValue", props.clearValue)
}

function handleLevel3Change() {
  const categoryId = level3Id.value || props.clearValue
  openMenu.value = null
  emit("update:modelValue", categoryId)
  persistRecentCategory(categoryId)
}

function getOptionLabel(level: 1 | 2 | 3) {
  if (level === 1) {
    return selectedLevel1Node.value?.name || resolvedLevel1Placeholder.value
  }
  if (level === 2) {
    return selectedLevel2Node.value?.name || resolvedLevel2Placeholder.value
  }
  return level3Options.value.find((item) => item.category_id === level3Id.value)?.name || resolvedLevel3Placeholder.value
}

function hasChildren(node: CategoryNode | undefined | null) {
  return getEnabledChildren(node).length > 0
}

function toggleMenu(level: 1 | 2 | 3) {
  if (props.disabled) return
  if (level === 2 && isCleared(level1Id.value)) return
  if (level === 3 && (isCleared(level2Id.value) || !level3Options.value.length)) return
  openMenu.value = openMenu.value === level ? null : level
}

function selectLevel1(categoryId: string) {
  level1Id.value = categoryId
  handleLevel1Change()
  if (props.allowNonLeaf || isLeafNode(level1Options.value.find((item) => item.category_id === categoryId) || null)) {
    openMenu.value = null
  } else {
    openMenu.value = 2
  }
}

function selectLevel2(categoryId: string) {
  level2Id.value = categoryId
  handleLevel2Change()
  if (props.allowNonLeaf || isLeafNode(level2Options.value.find((item) => item.category_id === categoryId) || null)) {
    openMenu.value = null
  } else {
    openMenu.value = 3
  }
}

function selectLevel3(categoryId: string) {
  level3Id.value = categoryId
  handleLevel3Change()
}

function handleDocumentPointer(event: MouseEvent) {
  if (!rootRef.value) return
  if (!(event.target instanceof Node)) return
  if (rootRef.value.contains(event.target)) return
  openMenu.value = null
}

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentPointer)
})

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentPointer)
})

watch(() => [props.modelValue, props.categories], syncSelectionFromModel, { immediate: true, deep: true })
watch(() => props.recentStorageKey, loadRecentCategoryIds, { immediate: true })
</script>

<template>
  <div ref="rootRef" class="category-cascade">
    <div v-if="!isPanelMode && showClearButton && selectedLeafPath && !inlineClear" class="cascade-topbar">
      <button type="button" class="cascade-clear" :disabled="disabled" @click="clearSelection">{{ t("clear") }}</button>
    </div>
    <div
      v-if="!isPanelMode"
      class="cascade-grid"
      :class="{ 'cascade-grid--inline-clear': inlineClear && selectedLeafPath }"
    >
      <div class="cascade-select-shell">
        <button type="button" class="cascade-select-trigger" :disabled="disabled" @click="toggleMenu(1)">
          <span>{{ getOptionLabel(1) }}</span>
          <svg class="cascade-caret" :class="{ open: openMenu === 1 }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="openMenu === 1" class="cascade-menu">
          <button type="button" class="cascade-option" @click="selectLevel1(clearValue)">{{ resolvedLevel1Placeholder }}</button>
          <button v-for="item in level1Options" :key="item.category_id" type="button" class="cascade-option" @click="selectLevel1(item.category_id)">
            {{ item.name }}
          </button>
        </div>
      </div>
      <div class="cascade-select-shell">
        <button type="button" class="cascade-select-trigger" :disabled="disabled || isCleared(level1Id)" @click="toggleMenu(2)">
          <span>{{ getOptionLabel(2) }}</span>
          <svg class="cascade-caret" :class="{ open: openMenu === 2 }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="openMenu === 2" class="cascade-menu">
          <button type="button" class="cascade-option" @click="selectLevel2(clearValue)">{{ resolvedLevel2Placeholder }}</button>
          <button v-for="item in level2Options" :key="item.category_id" type="button" class="cascade-option" @click="selectLevel2(item.category_id)">
            {{ item.name }}
          </button>
        </div>
      </div>
      <div class="cascade-select-shell">
        <button type="button" class="cascade-select-trigger" :disabled="disabled || isCleared(level2Id) || !level3Options.length" @click="toggleMenu(3)">
          <span>{{ getOptionLabel(3) }}</span>
          <svg class="cascade-caret" :class="{ open: openMenu === 3 }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="openMenu === 3" class="cascade-menu">
          <button type="button" class="cascade-option" @click="selectLevel3(clearValue)">{{ resolvedLevel3Placeholder }}</button>
          <button v-for="item in level3Options" :key="item.category_id" type="button" class="cascade-option" @click="selectLevel3(item.category_id)">
            {{ item.name }}
          </button>
        </div>
      </div>
      <button
        v-if="showClearButton && inlineClear && selectedLeafPath"
        type="button"
        class="cascade-clear cascade-clear--inline"
        :disabled="disabled"
        @click="clearSelection"
      >
        {{ t("clear") }}
      </button>
    </div>
    <div v-else-if="isSidebarMode" class="cascade-sidebar">
      <div class="cascade-sidebar-tree">
        <TreeNode
          v-for="item in level1Options"
          :key="item.category_id"
          :node="item"
          :level="1"
          :selected-id="modelValue"
          :expanded-ids="Array.from(expandedIds)"
          @select="handleNodeSelect"
          @toggle="handleNodeToggle"
        />
      </div>
    </div>
    <div v-else class="cascade-panel-grid">
      <div class="cascade-panel-column">
        <button
          type="button"
          class="cascade-panel-option"
          :class="{ active: isCleared(level1Id) }"
          @click="clearSelection"
        >
          <span>{{ resolvedLevel1Placeholder }}</span>
        </button>
        <button
          v-for="item in level1Options"
          :key="item.category_id"
          type="button"
          class="cascade-panel-option"
          :class="{ active: level1Id === item.category_id }"
          @click="selectLevel1(item.category_id)"
        >
          <span>{{ item.name }}</span>
          <svg v-if="hasChildren(item)" class="cascade-panel-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div class="cascade-panel-column">
        <template v-if="level2Options.length">
          <button
            v-for="item in level2Options"
            :key="item.category_id"
            type="button"
            class="cascade-panel-option"
            :class="{ active: level2Id === item.category_id }"
            @click="selectLevel2(item.category_id)"
          >
            <span>{{ item.name }}</span>
            <svg v-if="hasChildren(item)" class="cascade-panel-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </template>
        <div v-else class="cascade-panel-empty">
          {{ resolvedLevel2Placeholder }}
        </div>
      </div>
      <div class="cascade-panel-column">
        <template v-if="renderedLevel3Options.length">
          <button
            v-for="item in renderedLevel3Options"
            :key="item.category_id"
            type="button"
            class="cascade-panel-option"
            :class="{ active: level3Id === item.category_id }"
            @click="selectLevel3(item.category_id)"
          >
            <span>{{ item.name }}</span>
          </button>
        </template>
        <div v-else class="cascade-panel-empty">
          {{ resolvedLevel3Placeholder }}
        </div>
      </div>
    </div>
    <div v-if="!isPanelMode && showRecentOptions && recentOptions.length" class="recent-section">
      <span class="recent-label">{{ t('recent') }}</span>
      <div class="recent-list">
        <button
          v-for="item in recentOptions"
          :key="item.category_id"
          type="button"
          class="recent-chip"
          @click="selectLeafCategory(item.category_id)"
        >
          {{ item.name }}
        </button>
      </div>
    </div>
    <div v-if="!isPanelMode && showSelectionSummary && helperMessage" class="cascade-summary">
      <span>{{ helperMessage }}</span>
      <span v-if="selectedLeafPath" class="cascade-count">{{ t('selectedCount', { count: selectedCountLabel }) }}</span>
    </div>
  </div>
</template>

<style scoped>
.category-cascade {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  position: relative;
  z-index: 20;
}

.cascade-topbar {
  display: flex;
  justify-content: flex-end;
}

.cascade-clear,
.recent-chip {
  border: 0;
  cursor: pointer;
}

.cascade-clear {
  border-radius: 12px;
  padding: 0.78rem 0.95rem;
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 700;
}

.cascade-clear--inline {
  min-width: 84px;
  justify-self: stretch;
  align-self: stretch;
  white-space: nowrap;
}

.recent-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.55rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.recent-list::-webkit-scrollbar {
  display: none;
}

.recent-chip {
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.84rem;
  line-height: 1.4;
}

.recent-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.recent-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #64748b;
  text-transform: uppercase;
}

.cascade-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.cascade-grid--inline-clear {
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  align-items: stretch;
}

.cascade-panel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  min-height: 160px;
  max-height: min(56vh, 360px);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.cascade-panel-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
  overflow-x: hidden;
  overflow-y: auto;
}

.cascade-panel-column:last-child {
  border-right: none;
}

.cascade-panel-option {
  border: 0;
  background: transparent;
  min-height: 42px;
  padding: 0.58rem 0.75rem;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  text-align: left;
  color: #1f2937;
  font-size: 0.88rem;
  line-height: 1.2;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
  white-space: normal;
  word-break: break-word;
}

.cascade-panel-option:hover {
  background: #f8fafc;
}

.cascade-panel-option.active {
  background: #e0f2fe;
  color: #0f172a;
}

.cascade-panel-arrow {
  width: 14px;
  height: 14px;
  color: #6b7280;
  flex-shrink: 0;
}

.cascade-panel-empty {
  padding: 0.85rem 0.75rem;
  color: #94a3b8;
  font-size: 0.82rem;
  line-height: 1.3;
}

.cascade-select-shell {
  position: relative;
  min-width: 0;
}

.cascade-select-trigger {
  width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  padding: 0.78rem 0.9rem;
  background: white;
  color: #334155;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: pointer;
}

.cascade-caret {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: transform 0.3s ease;
}

.cascade-caret.open {
  transform: rotate(180deg);
}

.cascade-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: white;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
  max-height: min(50vh, 320px);
  overflow-y: auto;
}

.cascade-option {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.62rem 0.7rem;
  border-radius: 10px;
  color: #334155;
  cursor: pointer;
}

.cascade-option:hover {
  background: #eff6ff;
}

.cascade-select-trigger:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.cascade-helper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 12px;
  padding: 0.72rem 0.85rem;
  background: #f8fafc;
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.5;
}

.cascade-count {
  color: #6366f1;
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .cascade-grid {
    grid-template-columns: 1fr;
  }

  .cascade-panel-grid {
    grid-template-columns: 1fr;
    min-height: auto;
    max-height: none;
  }

  .cascade-panel-column {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .cascade-panel-column:last-child {
    border-bottom: none;
  }

  .cascade-helper {
  align-items: stretch;
  flex-direction: column;
}

/* Sidebar Tree Mode */
.cascade-sidebar {
  width: 100%;
  max-height: 100%;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.cascade-sidebar-tree {
  display: flex;
  flex-direction: column;
}

.tree-node {
  display: flex;
  flex-direction: column;
}

.tree-node-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  color: #334155;
  transition: background 0.15s ease;
}

.tree-node-item:hover {
  background: #f1f5f9;
}

.tree-node-item.is-selected {
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 600;
}

.tree-node-item.is-leaf {
  padding-left: 1.5rem;
}

.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 0.7rem;
  color: #64748b;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.tree-toggle.is-expanded {
  transform: rotate(90deg);
}

.tree-spacer {
  width: 16px;
  height: 16px;
}

.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-children {
  display: flex;
  flex-direction: column;
}

/* 参考 Element Plus 竖向菜单样式 */
.cascade-sidebar {
  width: 240px;
  border-right: none;
  height: 100%;
  overflow-y: auto;
  padding: 0.5rem 0;
}

/* 一级分类样式 */
.tree-node-item[data-level="1"] {
  font-weight: 600;
  color: #303133;
}

/* 二级分类样式 */
.tree-node-item[data-level="2"] {
  color: #606266;
}

/* 三级分类样式 */
.tree-node-item[data-level="3"] {
  color: #909399;
}

/* 层级缩进：逐级加大左边距 */
.tree-node-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  transition: all 0.15s ease;
  border-radius: 4px;
  margin: 2px 8px;
}

/* 选中项高亮 - 参考 Element Plus */
.tree-node-item.is-selected {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

/* 悬停效果 */
.tree-node-item:hover {
  background-color: #f5f7fa;
}

.tree-node-item.is-selected:hover {
  background-color: #ecf5ff;
}

/* 展开/折叠图标样式 */
.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 0.7rem;
  color: #909399;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.tree-toggle.is-expanded {
  transform: rotate(90deg);
  color: #409eff;
}

.tree-spacer {
  width: 16px;
  height: 16px;
}

.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
}
</style>
