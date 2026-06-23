import { UI_LOCALE_STORAGE_KEY, type UiLocale } from "../stores/uiLocale"

export type PreviewShortcutScope = "page" | "canvas"

export type PreviewShortcutBinding = {
  key: string
  alt?: boolean
  shift?: boolean
  ctrl?: boolean
  meta?: boolean
  primary?: boolean
}

export type PreviewShortcutDefinition = {
  id: string
  scope: PreviewShortcutScope
  label: string
  displayKeys: string
  bindings: PreviewShortcutBinding[]
  visibleInModal?: boolean
}

type LocalizedShortcutText = {
  en: string
  zh: string
}

type PreviewShortcutSource = Omit<PreviewShortcutDefinition, "label" | "displayKeys"> & {
  label: LocalizedShortcutText
  displayKeys: LocalizedShortcutText
}

function resolveShortcutLocale(): UiLocale {
  if (typeof document !== "undefined" && document.documentElement.lang === "zh") return "zh"
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(UI_LOCALE_STORAGE_KEY) === "zh" ? "zh" : "en"
  }
  return "en"
}

function localizeShortcutText(text: LocalizedShortcutText, locale = resolveShortcutLocale()): string {
  return locale === "zh" ? text.zh : text.en
}

const PREVIEW_SHORTCUTS: PreviewShortcutSource[] = [
  { id: "move-up", scope: "canvas", label: { en: "Move Up", zh: "向上移动" }, displayKeys: { en: "Up", zh: "上" }, bindings: [{ key: "ArrowUp" }] },
  { id: "move-down", scope: "canvas", label: { en: "Move Down", zh: "向下移动" }, displayKeys: { en: "Down", zh: "下" }, bindings: [{ key: "ArrowDown" }] },
  { id: "move-left", scope: "canvas", label: { en: "Move Left", zh: "向左移动" }, displayKeys: { en: "Left", zh: "左" }, bindings: [{ key: "ArrowLeft" }] },
  { id: "move-right", scope: "canvas", label: { en: "Move Right", zh: "向右移动" }, displayKeys: { en: "Right", zh: "右" }, bindings: [{ key: "ArrowRight" }] },
  { id: "mirror-horizontal", scope: "canvas", label: { en: "Mirror Horizontally", zh: "水平镜像" }, displayKeys: { en: "Alt + V", zh: "Alt + V" }, bindings: [{ key: "v", alt: true }] },
  { id: "mirror-vertical", scope: "canvas", label: { en: "Mirror Vertically", zh: "垂直镜像" }, displayKeys: { en: "Alt + N", zh: "Alt + N" }, bindings: [{ key: "n", alt: true }] },
  { id: "rotate-clockwise", scope: "canvas", label: { en: "Rotate 45° Clockwise", zh: "顺时针旋转 45°" }, displayKeys: { en: "Ctrl + Q", zh: "Ctrl + Q" }, bindings: [{ key: "q", ctrl: true }] },
  { id: "rotate-counterclockwise", scope: "canvas", label: { en: "Rotate 45° Counterclockwise", zh: "逆时针旋转 45°" }, displayKeys: { en: "Alt + W", zh: "Alt + W" }, bindings: [{ key: "w", alt: true }] },
  { id: "amplify", scope: "canvas", label: { en: "Scale Up", zh: "放大" }, displayKeys: { en: "Ctrl + M", zh: "Ctrl + M" }, bindings: [{ key: "m", ctrl: true }] },
  { id: "reduce", scope: "canvas", label: { en: "Scale Down", zh: "缩小" }, displayKeys: { en: "Alt + Z", zh: "Alt + Z" }, bindings: [{ key: "z", alt: true }] },
  { id: "delete", scope: "canvas", label: { en: "Delete", zh: "删除" }, displayKeys: { en: "Delete / Backspace", zh: "Delete / Backspace" }, bindings: [{ key: "Delete" }, { key: "Backspace" }] },
  { id: "save-product", scope: "page", label: { en: "Save Product", zh: "保存产品" }, displayKeys: { en: "Alt + F", zh: "Alt + F" }, bindings: [{ key: "f", alt: true }] },
  { id: "pattern-replication", scope: "canvas", label: { en: "Duplicate Pattern", zh: "复制图案" }, displayKeys: { en: "Shift + C", zh: "Shift + C" }, bindings: [{ key: "c", shift: true }] },
  { id: "maximize-pattern-design", scope: "canvas", label: { en: "Fit to Design Area", zh: "适配设计区域" }, displayKeys: { en: "Ctrl + X", zh: "Ctrl + X" }, bindings: [{ key: "x", ctrl: true }] },
  { id: "spread-design", scope: "canvas", label: { en: "Spread Over Part Bounds", zh: "铺满 part 包围盒" }, displayKeys: { en: "Alt + X", zh: "Alt + X" }, bindings: [{ key: "x", alt: true }] },
  { id: "maximize-pattern-width", scope: "canvas", label: { en: "Fit Width", zh: "适配宽度" }, displayKeys: { en: "Ctrl + B", zh: "Ctrl + B" }, bindings: [{ key: "b", ctrl: true }] },
  { id: "maximize-pattern-height", scope: "canvas", label: { en: "Fit Height", zh: "适配高度" }, displayKeys: { en: "Alt + B", zh: "Alt + B" }, bindings: [{ key: "b", alt: true }] },
  { id: "redesign", scope: "canvas", label: { en: "Reset Transform", zh: "重置变换" }, displayKeys: { en: "Alt + R", zh: "Alt + R" }, bindings: [{ key: "r", alt: true }] },
  { id: "pattern-tile-basic", scope: "canvas", label: { en: "Tile Mode / Basic", zh: "平铺模式 / 基础" }, displayKeys: { en: "Alt + S", zh: "Alt + S" }, bindings: [{ key: "s", alt: true }] },
  { id: "pattern-tile-mirror", scope: "canvas", label: { en: "Tile Mode / Mirror", zh: "平铺模式 / 镜像" }, displayKeys: { en: "Alt + C", zh: "Alt + C" }, bindings: [{ key: "c", alt: true }] },
  { id: "pattern-tile-landscape", scope: "canvas", label: { en: "Tile Mode / Landscape", zh: "平铺模式 / 横向" }, displayKeys: { en: "Alt + T", zh: "Alt + T" }, bindings: [{ key: "t", alt: true }] },
  { id: "pattern-tile-vertical", scope: "canvas", label: { en: "Tile Mode / Vertical", zh: "平铺模式 / 纵向" }, displayKeys: { en: "Alt + Y", zh: "Alt + Y" }, bindings: [{ key: "y", alt: true }] },
  { id: "pattern-tile-non-tile", scope: "canvas", label: { en: "Tile Mode / Single", zh: "平铺模式 / 单张" }, displayKeys: { en: "Alt + E", zh: "Alt + E" }, bindings: [{ key: "e", alt: true }] },
  { id: "undo", scope: "page", label: { en: "Undo", zh: "撤销" }, displayKeys: { en: "Ctrl/Cmd + Z", zh: "Ctrl/Cmd + Z" }, bindings: [{ key: "z", primary: true }] },
  { id: "redo", scope: "page", label: { en: "Redo", zh: "重做" }, displayKeys: { en: "Ctrl/Cmd + Y", zh: "Ctrl/Cmd + Y" }, bindings: [{ key: "y", primary: true }] },
  { id: "horizontally", scope: "canvas", label: { en: "Center Horizontally", zh: "水平居中" }, displayKeys: { en: "Alt + U", zh: "Alt + U" }, bindings: [{ key: "u", alt: true }] },
  { id: "design-middle", scope: "canvas", label: { en: "Center in Design Area", zh: "在设计区域居中" }, displayKeys: { en: "Alt + I", zh: "Alt + I" }, bindings: [{ key: "i", alt: true }] },
  { id: "layer", scope: "page", label: { en: "Open Layers", zh: "打开图层" }, displayKeys: { en: "Alt + L", zh: "Alt + L" }, bindings: [{ key: "l", alt: true }] },
  { id: "background", scope: "page", label: { en: "Open Background", zh: "打开背景" }, displayKeys: { en: "Alt + G", zh: "Alt + G" }, bindings: [{ key: "g", alt: true }] },
  { id: "open-hot-key", scope: "page", label: { en: "Open Hot Key", zh: "打开快捷键说明" }, displayKeys: { en: "?", zh: "?" }, bindings: [{ key: "?" }], visibleInModal: false },
]

export function listPreviewShortcuts(scope?: PreviewShortcutScope) {
  const locale = resolveShortcutLocale()
  const localizedShortcuts = PREVIEW_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    label: localizeShortcutText(shortcut.label, locale),
    displayKeys: localizeShortcutText(shortcut.displayKeys, locale),
  }))
  if (!scope) return localizedShortcuts
  return localizedShortcuts.filter((shortcut) => shortcut.scope === scope)
}

export function listVisiblePreviewShortcuts(scope?: PreviewShortcutScope) {
  return listPreviewShortcuts(scope).filter((shortcut) => shortcut.visibleInModal !== false)
}

function normalizeShortcutKey(rawKey: string) {
  return rawKey.length === 1 ? rawKey.toLowerCase() : rawKey
}

function matchesBinding(event: KeyboardEvent, binding: PreviewShortcutBinding) {
  const normalizedEventKey = normalizeShortcutKey(event.key)
  if (normalizedEventKey !== normalizeShortcutKey(binding.key)) return false
  if (event.altKey !== Boolean(binding.alt)) return false
  if (event.shiftKey !== Boolean(binding.shift)) return false
  if (binding.primary) {
    return (event.ctrlKey || event.metaKey) && !binding.ctrl && !binding.meta
  }
  return event.ctrlKey === Boolean(binding.ctrl) && event.metaKey === Boolean(binding.meta)
}

export function findMatchingPreviewShortcut(
  event: KeyboardEvent,
  shortcuts: PreviewShortcutDefinition[],
) {
  return shortcuts.find((shortcut) => shortcut.bindings.some((binding) => matchesBinding(event, binding))) || null
}
