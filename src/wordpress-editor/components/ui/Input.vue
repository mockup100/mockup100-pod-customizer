<template>
  <div class="input-wrapper">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <div class="input-container">
      <div v-if="$slots.prefix" class="input-prefix">
        <slot name="prefix" />
      </div>
      
      <input
        :id="inputId"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :class="inputClasses"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      
      <div v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix" />
      </div>
      
      <div v-if="showClearButton" class="input-clear" @click="clearInput">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
    </div>
    
    <div v-if="helperText || error" class="input-helper">
      <span v-if="error" class="error-text">{{ error }}</span>
      <span v-else-if="helperText" class="helper-text">{{ helperText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
  label?: string
  placeholder?: string
  helperText?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  size: 'md',
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  input: [event: Event]
  change: [event: Event]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  clear: []
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const inputClasses = computed(() => {
  const base = 'w-full transition-all duration-200 focus:outline-none'
  
  const variants = {
    default: 'border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    filled: 'bg-gray-100 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500',
    outlined: 'border-2 border-gray-300 focus:border-blue-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base'
  }
  
  const states = []
  if (props.disabled) states.push('bg-gray-50 cursor-not-allowed')
  if (props.readonly) states.push('bg-gray-50 cursor-default')
  if (props.error) states.push('border-red-500 focus:border-red-500 focus:ring-red-500')
  if (isFocused.value && !props.disabled && !props.readonly) states.push('ring-1 ring-blue-500 ring-offset-0')
  
  return [
    base,
    variants[props.variant],
    sizes[props.size],
    ...states
  ].join(' ')
})

const showClearButton = computed(() => {
  return props.clearable && props.modelValue && !props.disabled && !props.readonly
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

function handleChange(event: Event) {
  emit('change', event)
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  emit('blur', event)
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event)
}

function clearInput() {
  emit('update:modelValue', '')
  emit('clear')
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// Expose methods for parent components
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select()
})
</script>

<style scoped>
.input-wrapper {
  @apply w-full;
}

.input-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.required-mark {
  @apply text-red-500 ml-1;
}

.input-container {
  @apply relative;
}

.input-prefix,
.input-suffix {
  @apply absolute inset-y-0 flex items-center pointer-events-none;
}

.input-prefix {
  @apply left-0 pl-3;
}

.input-suffix {
  @apply right-0 pr-3;
}

.input-clear {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer pointer-events-auto;
}

input {
  @apply block;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  @apply appearance-none;
  margin: 0;
}

.input-helper {
  @apply mt-1 text-xs;
}

.error-text {
  @apply text-red-600;
}

.helper-text {
  @apply text-gray-500;
}

/* Variant adjustments */
.input-container:has(.input-prefix) input {
  @apply pl-10;
}

.input-container:has(.input-suffix) input {
  @apply pr-10;
}

.input-container:has(.input-clear) input {
  @apply pr-10;
}
</style>
