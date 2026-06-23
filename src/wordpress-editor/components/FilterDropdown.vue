<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

type DropdownOption = {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: ReadonlyArray<DropdownOption>
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const open = ref(false)
const menuRect = ref<{ left: number; top: number; width: number } | null>(null)
const menuMaxHeight = ref(320)

const selectedLabel = computed(() => {
  return props.options.find((item) => item.value === props.modelValue)?.label || props.options[0]?.label || ""
})

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    updateMenuRect()
  }
}

function selectOption(value: string) {
  emit("update:modelValue", value)
  open.value = false
}

function handleDocumentPointer(event: MouseEvent) {
  if (!(event.target instanceof Node)) return
  if (rootRef.value?.contains(event.target)) return
  if (menuRef.value?.contains(event.target)) return
  open.value = false
}

function updateMenuRect() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const nextTop = rect.bottom + 6
  menuRect.value = { left: rect.left, top: nextTop, width: rect.width }
  menuMaxHeight.value = Math.max(180, Math.round(window.innerHeight - nextTop - 16))
}

function handleViewportChange() {
  if (!open.value) return
  updateMenuRect()
}

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentPointer)
  window.addEventListener("scroll", handleViewportChange, true)
  window.addEventListener("resize", handleViewportChange)
})

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentPointer)
  window.removeEventListener("scroll", handleViewportChange, true)
  window.removeEventListener("resize", handleViewportChange)
})
</script>

<template>
  <div ref="rootRef" class="filter-dropdown">
    <button ref="triggerRef" type="button" class="filter-dropdown-trigger" :disabled="disabled" @click="toggle">
      <span>{{ selectedLabel }}</span>
      <svg class="filter-dropdown-caret" :class="{ open: open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <teleport to="body">
      <div
        v-if="open && menuRect"
        ref="menuRef"
        class="filter-dropdown-menu"
        :style="{ left: `${menuRect.left}px`, top: `${menuRect.top}px`, width: `${menuRect.width}px`, maxHeight: `${menuMaxHeight}px` }"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="filter-dropdown-option"
          :class="{ active: option.value === modelValue }"
          @click="selectOption(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.filter-dropdown {
  position: relative;
  min-width: 180px;
}

.filter-dropdown-trigger {
  width: 100%;
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  padding: 0 0.85rem;
  background: white;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: pointer;
}

.filter-dropdown-trigger:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.filter-dropdown-caret {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: transform 0.3s ease;
}

.filter-dropdown-caret.open {
  transform: rotate(180deg);
}

.filter-dropdown-menu {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: white;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
  overflow: auto;
}

.filter-dropdown-option {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.62rem 0.7rem;
  border-radius: 10px;
  color: #334155;
  cursor: pointer;
}

.filter-dropdown-option:hover,
.filter-dropdown-option.active {
  background: #eff6ff;
  color: #1d4ed8;
}
</style>
