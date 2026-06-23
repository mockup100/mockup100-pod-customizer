<template>
  <span :class="badgeClasses">
    <component v-if="icon" :is="icon" class="badge-icon" />
    <span v-if="$slots.default" class="badge-text">
      <slot />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  icon?: any
  rounded?: boolean
  dot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  rounded: false,
  dot: false
})

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-medium'
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-200 text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800'
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm'
  }
  
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  }
  
  const classes = [
    base,
    variants[props.variant],
    props.dot ? dotSizes[props.size] : sizes[props.size]
  ]
  
  if (!props.dot) {
    if (props.rounded) classes.push('rounded-full')
    else classes.push('rounded-md')
  } else {
    classes.push('rounded-full')
  }
  
  return classes.join(' ')
})
</script>

<style scoped>
.badge-icon {
  @apply w-3 h-3 mr-1;
}

.badge-text {
  @apply whitespace-nowrap;
}

/* Dot variant */
.badge-icon:only-child {
  @apply mr-0;
}
</style>
