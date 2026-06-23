<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { resolveRuntimeAssetUrl } from "../../api/client"
import { getDisplayTemplateName } from "../../pages/admin/repositoryView"
import { computeFloatingHoverOverlay } from "../../utils/floatingHoverOverlay"

type BadgeTone = "default" | "info" | "warning" | "success" | "danger"
type HoverOverlayClass =
  | "hover-overlay--bottom-left"
  | "hover-overlay--bottom-right"
  | "hover-overlay--top-left"
  | "hover-overlay--top-right"

const props = withDefaults(defineProps<{
  cardId: string
  title: string
  artworkId: string
  artworkCode?: string
  showArtworkCode?: boolean
  showIdentity?: boolean
  description?: string
  coverUrl?: string
  categoryLabel: string
  dateLabel?: string
  badges?: Array<{ label: string; tone?: BadgeTone }>
  metaChips?: string[]
  hoverDetails?: string[]
}>(), {
  description: "",
  coverUrl: "",
  dateLabel: "",
  artworkCode: "",
  showArtworkCode: true,
  showIdentity: true,
  badges: () => [],
  metaChips: () => [],
  hoverDetails: () => [],
})

const coverLoadFailed = ref(false)
const hoverOpen = ref(false)
const hoverPlacement = ref<HoverOverlayClass>("hover-overlay--bottom-left")
const hoverStyle = ref<Record<string, string>>({})

watch(
  () => props.coverUrl,
  () => {
    coverLoadFailed.value = false
  },
  { immediate: true },
)

const resolvedCoverUrl = computed(() => resolveRuntimeAssetUrl(props.coverUrl))
const secondaryArtworkText = computed(() => (
  props.showArtworkCode
    ? (props.artworkCode || props.artworkId)
    : props.artworkId
))

function handleCoverError() {
  coverLoadFailed.value = true
}

function resolveHoverOverlay(event: Event): {
  placement: HoverOverlayClass
  style: Record<string, string>
} {
  return computeFloatingHoverOverlay(event, {
    defaultPlacement: "hover-overlay--bottom-left",
    overlayWidth: 280,
    overlayHeight: 520,
    minOverlayWidth: 180,
    minOverlayHeight: 220,
    viewportPadding: 12,
    topSafePadding: 12,
    gap: 10,
  })
}

function showPopover(event: Event) {
  const overlay = resolveHoverOverlay(event)
  hoverPlacement.value = overlay.placement
  hoverStyle.value = overlay.style
  hoverOpen.value = true
}

function hidePopover() {
  hoverOpen.value = false
}
</script>

<template>
  <div class="next-template-item" :data-artwork-id="cardId">
    <div
      class="template-thumb"
      tabindex="0"
      @mouseenter="showPopover"
      @mouseleave="hidePopover"
      @focusin="showPopover"
      @focusout="hidePopover"
    >
      <img
        v-if="resolvedCoverUrl && !coverLoadFailed"
        :src="resolvedCoverUrl"
        :alt="title"
        loading="lazy"
        decoding="async"
        @error="handleCoverError"
      />
      <div v-else class="next-template-placeholder">
        <strong>{{ title?.slice(0, 1) || "A" }}</strong>
        <span>{{ categoryLabel || "Artwork" }}</span>
      </div>
    </div>
    <div class="template-body">
      <div class="template-header">
        <div class="template-title-group">
          <strong class="template-name">{{ getDisplayTemplateName(title) }}</strong>
          <span class="next-template-code">{{ secondaryArtworkText }}</span>
          <div v-if="showIdentity" class="template-identity">
            <span class="identity-label">ID</span>
            <code class="template-identity-value">{{ artworkId }}</code>
          </div>
        </div>
        <div v-if="badges.length" class="template-badge-group">
          <span
            v-for="badge in badges"
            :key="`${cardId}-${badge.label}`"
            class="template-badge"
            :class="badge.tone || 'default'"
          >
            {{ badge.label }}
          </span>
        </div>
      </div>
      <p v-if="description" class="template-description">{{ description }}</p>
      <div class="template-meta">
        <span class="next-category-pill">{{ categoryLabel }}</span>
        <span
          v-for="chip in metaChips"
          :key="`${cardId}-${chip}`"
          class="next-owner-pill neutral"
        >
          {{ chip }}
        </span>
        <div v-if="dateLabel" class="template-date">{{ dateLabel }}</div>
      </div>
      <div v-if="$slots.default" class="template-actions">
        <slot />
      </div>
      <div v-if="$slots.extra" class="center-template-extra">
        <slot name="extra" />
      </div>
    </div>
    <div
      v-if="hoverOpen"
      class="template-hover-card hover-overlay"
      :class="hoverPlacement"
      :style="hoverStyle"
    >
      <div class="template-preview-popover-media">
        <img
          v-if="resolvedCoverUrl && !coverLoadFailed"
          :src="resolvedCoverUrl"
          :alt="title"
          loading="lazy"
          decoding="async"
        />
        <div v-else class="template-preview-placeholder">
          <strong>{{ title?.slice(0, 1) || "A" }}</strong>
          <span>{{ categoryLabel || "Artwork" }}</span>
        </div>
      </div>
      <div class="template-preview-popover-copy">
        <strong>{{ getDisplayTemplateName(title) }}</strong>
        <span>{{ secondaryArtworkText }}</span>
        <span>{{ categoryLabel || "Artwork" }}</span>
        <span
          v-for="detail in hoverDetails.slice(0, 3)"
          :key="`${cardId}-popover-${detail}`"
        >
          {{ detail }}
        </span>
        <span v-if="dateLabel">{{ dateLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.next-template-item {
  position: relative;
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.8rem;
  padding: 0.75rem 0.8rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  transition: all 0.2s ease;
}

.next-template-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.template-thumb {
  position: relative;
  width: 140px;
  aspect-ratio: 4 / 3;
  border-radius: 0.8rem;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem;
}

.template-thumb img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  display: block;
  background: #f8fafc;
}

.next-template-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
  color: #6366f1;
  text-align: center;
  padding: 1rem;
}

.next-template-placeholder strong {
  font-size: 2rem;
  line-height: 1;
}

.next-template-placeholder span {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #475569;
}

.template-hover-card {
  position: fixed;
  z-index: 600;
  width: min(280px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 24px));
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.8rem;
  border: 1px solid #dbe3f0;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
  overflow: auto;
  overscroll-behavior: contain;
}

.hover-overlay {
  pointer-events: none;
}

.hover-overlay--bottom-left {
  transform: translate(0, 0);
}

.hover-overlay--bottom-right {
  transform: translate(-100%, 0);
}

.hover-overlay--top-left {
  transform: translate(0, calc(-100% - 16px));
}

.hover-overlay--top-right {
  transform: translate(-100%, calc(-100% - 16px));
}

.template-preview-popover-media {
  width: 100%;
  max-width: 220px;
  aspect-ratio: 4 / 3;
  border-radius: 0.9rem;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0.75rem;
}

.template-preview-popover-media img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  display: block;
}

.template-preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 0.9rem;
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
  color: #6366f1;
  text-align: center;
  padding: 1rem;
}

.template-preview-placeholder strong {
  font-size: 2rem;
  line-height: 1;
}

.template-preview-placeholder span {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
}

.template-preview-popover-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: left;
}

.template-preview-popover-copy strong {
  font-size: 0.82rem;
  line-height: 1.4;
  color: #0f172a;
}

.template-preview-popover-copy span {
  font-size: 0.75rem;
  line-height: 1.3;
  color: #475569;
  overflow-wrap: anywhere;
}

.template-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.72rem;
  min-width: 0;
}

.template-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.template-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  min-width: 0;
}

.template-name {
  font-size: 1rem;
  color: #1e293b;
  line-height: 1.35;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.template-description {
  margin: 0;
  color: #475569;
  font-size: 0.86rem;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.next-template-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.73rem;
  color: #475569;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.template-identity {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.identity-label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}

.template-identity-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.75rem;
  color: #334155;
  overflow-wrap: anywhere;
}

.template-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem 0.45rem;
  align-items: center;
}

.next-category-pill,
.next-owner-pill,
.template-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.next-category-pill {
  border: 0;
  padding: 0.24rem 0.5rem;
  background: #eef2ff;
  color: #4338ca;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: left;
  justify-content: flex-start;
  line-height: 1.35;
}

.next-owner-pill {
  padding: 0.24rem 0.5rem;
  background: #ecfeff;
  color: #0f766e;
  white-space: nowrap;
}

.next-owner-pill.neutral {
  background: #f1f5f9;
  color: #475569;
}

.template-date {
  display: inline-flex;
  align-items: center;
  padding: 0.24rem 0.5rem;
  border-radius: 999px;
  background: #f8fafc;
  color: #1e293b;
  font-size: 0.74rem;
  font-weight: 600;
}

.template-badge-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
}

.template-badge {
  padding: 0.2rem 0.55rem;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
  color: #334155;
  background: #f8fafc;
}

.template-badge.info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.25);
}

.template-badge.warning {
  background: rgba(245, 158, 11, 0.14);
  color: #92400e;
  border-color: rgba(245, 158, 11, 0.3);
}

.template-badge.success {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.25);
}

.template-badge.danger {
  background: rgba(239, 68, 68, 0.14);
  color: #991b1b;
  border-color: rgba(239, 68, 68, 0.25);
}

:deep(.next-action) {
  padding: 0.4rem 0.62rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.375rem;
  color: #0f172a;
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  flex: 0 0 auto;
}

.template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

:deep(.next-action.primary) {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: white;
}

:deep(.next-action.secondary) {
  background: white;
}

:deep(.next-action.ghost) {
  background: transparent;
}

:deep(.next-action.danger) {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.25);
}

:deep(.next-action:disabled) {
  opacity: 0.55;
  cursor: not-allowed;
}

.center-template-extra {
  width: 100%;
  margin-top: 0.55rem;
}

@media (max-width: 768px) {
  .next-template-item {
    grid-template-columns: 1fr;
  }

  .template-header {
    flex-direction: column;
  }

  .template-badge-group {
    justify-content: flex-start;
  }

  .template-thumb {
    width: 100%;
  }

  .template-preview-popover {
    display: none;
  }
}
</style>
