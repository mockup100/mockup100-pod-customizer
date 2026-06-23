<script setup lang="ts">
import { computed } from "vue"
import { ArrowDown } from "@element-plus/icons-vue"
import { useI18n } from "vue-i18n"
import { useUiLocaleStore, type UiLocale } from "../stores/uiLocale"

const uiLocaleStore = useUiLocaleStore()
const { t, locale } = useI18n()

const localeLabel = computed(() => t(`language.${locale.value}`))

function handleChange(nextLocale: UiLocale) {
  uiLocaleStore.setLocale(nextLocale)
  locale.value = nextLocale
}
</script>

<template>
  <el-dropdown trigger="click" @command="handleChange">
    <button type="button" class="lang-switch">
      <span>{{ localeLabel }}</span>
      <el-icon><ArrowDown /></el-icon>
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="zh">{{ t("language.zh") }}</el-dropdown-item>
        <el-dropdown-item command="en">{{ t("language.en") }}</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.lang-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: #fff;
  color: #101828;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
</style>
