<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useUiLocaleStore } from "../../stores/uiLocale"

const props = withDefaults(defineProps<{
  isOpen: boolean
  title: string
  message: string
  details?: string[]
  confirmText?: string
  cancelText?: string
  tone?: "primary" | "danger"
  note?: string
  noteLabel?: string
  notePlaceholder?: string
  noteRequired?: boolean
  loading?: boolean
  loadingText?: string
  errorMessage?: string
  choiceValue?: string
  choiceLabel?: string
  choiceOptions?: Array<{
    value: string
    label: string
    description?: string
  }>
  choiceRequired?: boolean
  showHint?: boolean
  showToneBadge?: boolean
}>(), {
  confirmText: "Confirm",
  cancelText: "Cancel",
  tone: "primary",
  note: "",
  noteLabel: "Note",
  notePlaceholder: "",
  noteRequired: false,
  loading: false,
  loadingText: "",
  errorMessage: "",
  choiceValue: "",
  choiceLabel: "",
  choiceOptions: () => [],
  choiceRequired: false,
  showHint: true,
  showToneBadge: true,
})

const emit = defineEmits<{
  close: []
  confirm: [note: string, choiceValue: string]
  "update:isOpen": [value: boolean]
  "update:note": [value: string]
  "update:choiceValue": [value: string]
}>()

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const ACTION_CONFIRMATION_I18N = {
  en: {
    confirm: "Confirm",
    cancel: "Cancel",
    note: "Note",
    highImpactAction: "High Impact Action",
    workflowConfirmation: "Workflow Confirmation",
    dangerHint: "Please confirm carefully. This action may affect live usage or permanently remove data.",
    primaryHint: "Review the business impact below before you continue.",
    working: "Working...",
    noteRequired: "{label} is required.",
    choiceRequired: "Please choose {label}.",
  },
  zh: {
    confirm: "确认",
    cancel: "取消",
    note: "备注",
    highImpactAction: "高影响操作",
    workflowConfirmation: "流程确认",
    dangerHint: "请谨慎确认，此操作可能影响线上使用或永久删除数据。",
    primaryHint: "继续前请先确认下方业务影响。",
    working: "处理中...",
    noteRequired: "必须填写{label}。",
    choiceRequired: "请选择{label}。",
  },
} as const

function t(key: keyof typeof ACTION_CONFIRMATION_I18N.en) {
  return ACTION_CONFIRMATION_I18N[locale.value][key] || ACTION_CONFIRMATION_I18N.en[key]
}

function formatText(template: string, replacements: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, token) => replacements[token] ?? "")
}

const localNote = ref(props.note)
const localChoiceValue = ref(props.choiceValue)
const validationMessage = ref("")

watch(() => props.note, (value) => {
  localNote.value = value
})

watch(() => props.choiceValue, (value) => {
  localChoiceValue.value = value
})

watch(localNote, (value) => {
  emit("update:note", value)
  if (validationMessage.value && value.trim()) {
    validationMessage.value = ""
  }
})

watch(localChoiceValue, (value) => {
  emit("update:choiceValue", value)
  if (validationMessage.value && value.trim()) {
    validationMessage.value = ""
  }
})

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    validationMessage.value = ""
  }
})

const hasNoteField = computed(() => {
  return props.noteRequired || Boolean(props.notePlaceholder) || Boolean(props.note)
})

const hasChoiceField = computed(() => {
  return Array.isArray(props.choiceOptions) && props.choiceOptions.length > 0
})

const toneLabel = computed(() => {
  return props.tone === "danger" ? t("highImpactAction") : t("workflowConfirmation")
})

const toneHint = computed(() => {
  return props.tone === "danger"
    ? t("dangerHint")
    : t("primaryHint")
})

const resolvedCancelText = computed(() => {
  return props.cancelText || t("cancel")
})

const resolvedConfirmText = computed(() => {
  return props.confirmText || t("confirm")
})

const resolvedNoteLabel = computed(() => {
  return props.noteLabel || t("note")
})

const resolvedLoadingText = computed(() => {
  return props.loadingText || t("working")
})

function handleClose() {
  if (props.loading) return
  validationMessage.value = ""
  emit("update:isOpen", false)
  emit("close")
}

function handleConfirm() {
  const trimmedNote = localNote.value.trim()
  if (props.noteRequired && !trimmedNote) {
    validationMessage.value = formatText(t("noteRequired"), { label: resolvedNoteLabel.value })
    return
  }
  if (props.choiceRequired && !String(localChoiceValue.value || "").trim()) {
    validationMessage.value = formatText(t("choiceRequired"), { label: props.choiceLabel || resolvedNoteLabel.value })
    return
  }
  validationMessage.value = ""
  emit("confirm", trimmedNote, String(localChoiceValue.value || "").trim())
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="confirm-overlay"
      data-testid="action-confirmation-modal"
      @click.self="handleClose"
    >
      <div class="confirm-dialog">
        <div class="confirm-dialog-head">
          <div class="confirm-header">
            <span v-if="showToneBadge" class="confirm-tone-badge" :class="tone">{{ toneLabel }}</span>
            <strong>{{ title }}</strong>
          </div>
          <button
            type="button"
            class="confirm-close"
            :disabled="loading"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <div class="confirm-dialog-body">
          <div class="confirm-body">
            <div class="confirm-summary" :class="tone">
              <p class="confirm-message">{{ message }}</p>
              <p v-if="showHint" class="confirm-hint">{{ toneHint }}</p>
            </div>
            <ul v-if="details?.length" class="confirm-details">
              <li v-for="detail in details" :key="detail">{{ detail }}</li>
            </ul>
            <label v-if="hasChoiceField" class="confirm-field">
              <span>{{ choiceLabel }}</span>
              <div class="confirm-choice-group">
                <label
                  v-for="option in choiceOptions"
                  :key="option.value"
                  class="confirm-choice-option"
                  :class="{ active: localChoiceValue === option.value }"
                >
                  <input
                    v-model="localChoiceValue"
                    type="radio"
                    class="confirm-choice-input"
                    name="action-confirmation-choice"
                    :value="option.value"
                    :disabled="loading"
                  />
                  <span class="confirm-choice-copy">
                    <strong>{{ option.label }}</strong>
                    <small v-if="option.description">{{ option.description }}</small>
                  </span>
                </label>
              </div>
            </label>
            <label v-if="hasNoteField" class="confirm-field">
              <span>{{ resolvedNoteLabel }}</span>
              <textarea
                v-model="localNote"
                class="confirm-textarea"
                rows="4"
                :placeholder="notePlaceholder"
                :disabled="loading"
                data-testid="action-confirmation-note"
              />
            </label>
            <p v-if="validationMessage" class="confirm-error">{{ validationMessage }}</p>
            <p v-else-if="errorMessage" class="confirm-error">{{ errorMessage }}</p>
          </div>
        </div>

        <div class="confirm-dialog-footer">
          <div class="confirm-actions">
            <button
              type="button"
              class="confirm-button secondary"
              :disabled="loading"
              data-testid="action-confirmation-cancel"
              @click="handleClose"
            >
              {{ resolvedCancelText }}
            </button>
            <button
              type="button"
              class="confirm-button"
              :class="tone"
              :disabled="loading"
              data-testid="action-confirmation-confirm"
              @click="handleConfirm"
            >
              {{ loading ? resolvedLoadingText : resolvedConfirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: min(100%, 720px);
  max-height: calc(100vh - 3rem);
  background: white;
  border-radius: 1rem;
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.confirm-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.35rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.confirm-dialog-body {
  padding: 1.35rem 1.5rem;
  overflow-y: auto;
}

.confirm-dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.confirm-close {
  border: 0;
  background: transparent;
  font-size: 1.1rem;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
  padding: 0.35rem;
  border-radius: 0.5rem;
}

.confirm-close:hover:not(:disabled) {
  background: #f1f5f9;
  color: #334155;
}

.confirm-close:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.confirm-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.confirm-tone-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.confirm-tone-badge.primary {
  background: #dbeafe;
  color: #1d4ed8;
}

.confirm-tone-badge.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.confirm-summary {
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%);
}

.confirm-summary.danger {
  border-color: #fecaca;
  background: linear-gradient(180deg, #fef2f2 0%, #fff7f7 100%);
}

.confirm-message {
  margin: 0;
  color: #0f172a;
  font-weight: 700;
  line-height: 1.6;
}

.confirm-hint {
  margin: 0.45rem 0 0;
  color: #475569;
  line-height: 1.5;
  font-size: 0.92rem;
}

.confirm-details {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.confirm-details li {
  margin-left: 1rem;
  line-height: 1.5;
}

.confirm-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.confirm-field span {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
}

.confirm-choice-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.confirm-choice-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid #dbe2ea;
  border-radius: 0.85rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.confirm-choice-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.confirm-choice-input {
  margin-top: 0.2rem;
  accent-color: #2563eb;
}

.confirm-choice-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.confirm-choice-copy strong {
  color: #0f172a;
  font-size: 0.92rem;
}

.confirm-choice-copy small {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.4;
}

.confirm-textarea {
  width: 100%;
  border: 1px solid #dbe2ea;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  font: inherit;
  color: #0f172a;
  resize: vertical;
  min-height: 112px;
}

.confirm-textarea:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.35);
}

.confirm-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.85rem;
  font-weight: 600;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.confirm-button {
  border: 1px solid transparent;
  border-radius: 0.75rem;
  padding: 0.7rem 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-button.secondary {
  background: white;
  border-color: #dbe2ea;
  color: #334155;
}

.confirm-button.primary {
  background: #0ea5e9;
  color: white;
}

.confirm-button.danger {
  background: #dc2626;
  color: white;
}
</style>
