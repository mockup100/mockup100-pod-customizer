import { ref } from "vue"
import { defineStore } from "pinia"

export type UiLocale = "en" | "zh"

export const UI_LOCALE_STORAGE_KEY = "mockup100_lang"
// 旧 key (0.4.x 之前): 仅在新 key 不存在时回退读取一次, 之后写入新 key.
const LEGACY_UI_LOCALE_STORAGE_KEY = "mockup-ui-locale"

function normalizeLocale(value: unknown): UiLocale {
  return value === "zh" ? "zh" : "en"
}

function readStoredLocale(): UiLocale {
  if (typeof window === "undefined") return "en"
  const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY)
  if (stored !== null) return normalizeLocale(stored)
  const legacy = window.localStorage.getItem(LEGACY_UI_LOCALE_STORAGE_KEY)
  return normalizeLocale(legacy)
}

export const useUiLocaleStore = defineStore("ui-locale", () => {
  const locale = ref<UiLocale>("en")

  function hydrate() {
    if (typeof window === "undefined") return
    locale.value = readStoredLocale()
    document.documentElement.lang = locale.value
  }

  function setLocale(value: UiLocale) {
    locale.value = normalizeLocale(value)
    if (typeof window === "undefined") return
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale.value)
    document.documentElement.lang = locale.value
  }

  return {
    locale,
    hydrate,
    setLocale,
  }
})
