<script setup lang="ts">
import { computed } from "vue"
import type { TemplateStructureNode } from "../stores/upload"

const props = defineProps<{
  tree: TemplateStructureNode | null | undefined
}>()

function buildLines(node: TemplateStructureNode, prefix = "", isLast = true): string[] {
  const marker = prefix ? `${isLast ? "└─ " : "├─ "}` : ""
  const icon = node.type === "folder" ? "📁 " : "📄 "
  const line = `${prefix}${marker}${icon}${node.name}`
  const children = node.children || []
  const childPrefix = prefix ? `${prefix}${isLast ? "   " : "│  "}` : ""
  const childLines = children.flatMap((child, index) => buildLines(child, childPrefix, index === children.length - 1))
  return [line, ...childLines]
}

const lines = computed(() => {
  if (!props.tree) return []
  return buildLines(props.tree)
})
</script>

<template>
  <pre v-if="lines.length" class="template-tree">{{ lines.join("\n") }}</pre>
</template>

<style scoped>
.template-tree {
  margin: 0;
  padding: 1rem 1.125rem;
  border-radius: 14px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}
</style>
