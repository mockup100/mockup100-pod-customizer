import { createI18n } from "vue-i18n"
import en from "./en"
import zh from "./zh"
import { UI_LOCALE_STORAGE_KEY, type UiLocale } from "../stores/uiLocale"

function readInitialLocale(): UiLocale {
  if (typeof window === "undefined") return "en"
  return window.localStorage.getItem(UI_LOCALE_STORAGE_KEY) === "zh" ? "zh" : "en"
}

const i18n = createI18n({
  legacy: false,
  locale: readInitialLocale(),
  fallbackLocale: "en",
  messages: {
    en,
    zh,
  },
})

export default i18n
