<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    
    <div v-if="$slots.default" class="card-body">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'outlined' | 'elevated' | 'flat' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  rounded: 'md',
  shadow: 'md',
  hover: false,
  clickable: false
})

const cardClasses = computed(() => {
  const base = 'transition-all duration-200'
  
  const variants = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-white border-2 border-gray-300',
    elevated: 'bg-white border border-gray-100',
    flat: 'bg-transparent',
    glass: 'bg-white/80 backdrop-blur-md border border-white/20 shadow-xl'
  }
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }
  
  const roundeds = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  }
  
  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }
  
  const classes = [
    base,
    variants[props.variant],
    paddings[props.padding],
    roundeds[props.rounded],
    shadows[props.shadow]
  ]
  
  if (props.hover) classes.push('hover:shadow-lg hover:border-gray-300')
  if (props.clickable) classes.push('cursor-pointer hover:scale-[1.02]')
  
  return classes.join(' ')
})
</script>

<style scoped>
.card-header {
  @apply border-b border-gray-200 pb-4 mb-4;
}

.card-body {
  @apply flex-1;
}

.card-footer {
  @apply border-t border-gray-200 pt-4 mt-4;
}
</style>
