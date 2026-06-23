import { ref } from "vue"

export type InlineNotice = {
  tone: "success" | "danger"
  message: string
}

export function useInlineNotice() {
  const notice = ref<InlineNotice | null>(null)

  function clear() {
    notice.value = null
  }

  function set(tone: InlineNotice["tone"], message: string) {
    notice.value = { tone, message }
  }

  return {
    notice,
    clear,
    set,
  }
}
