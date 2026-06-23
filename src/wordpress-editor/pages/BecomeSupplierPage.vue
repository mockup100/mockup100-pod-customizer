<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { ElMessage, type FormInstance, type FormRules } from "element-plus"
import { gatewayPlatformFetch, resolveApiErrorMessage } from "../api/client"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  mainCategory: "",
  remark: "",
})

const rules = computed<FormRules>(() => ({
  companyName: [{ required: true, message: t("supplier.nameRequired"), trigger: "blur" }],
  contactName: [{ required: true, message: t("supplier.contactRequired"), trigger: "blur" }],
  phone: [{ required: true, message: t("supplier.phoneRequired"), trigger: "blur" }],
  email: [{ required: true, message: t("supplier.emailRequired"), trigger: "blur" }],
}))

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await gatewayPlatformFetch("/api/v1/supplier/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: form.companyName.trim(),
        contact_name: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        main_category: form.mainCategory.trim(),
        remark: form.remark.trim(),
      }),
    })
    ElMessage.success(t("supplier.success"))
    formRef.value?.resetFields()
  } catch (error) {
    ElMessage.error(resolveApiErrorMessage(error) || t("supplier.fail"))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="supplier-apply-page">
    <div class="supplier-apply-page__wrap">
      <header class="supplier-apply-page__header">
        <h2>{{ t("supplier.title") }}</h2>
        <p>{{ t("supplier.desc") }}</p>
      </header>

      <el-card shadow="hover" class="supplier-apply-page__card">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
          <el-form-item :label="t('supplier.companyName')" prop="companyName">
            <el-input v-model="form.companyName" :placeholder="t('common.pleaseInput')" />
          </el-form-item>

          <el-form-item :label="t('supplier.contactName')" prop="contactName">
            <el-input v-model="form.contactName" :placeholder="t('common.pleaseInput')" />
          </el-form-item>

          <el-form-item :label="t('supplier.phone')" prop="phone">
            <el-input v-model="form.phone" :placeholder="t('common.pleaseInput')" />
          </el-form-item>

          <el-form-item :label="t('supplier.email')" prop="email">
            <el-input v-model="form.email" :placeholder="t('common.pleaseInput')" />
          </el-form-item>

          <el-form-item :label="t('supplier.mainCategory')">
            <el-input v-model="form.mainCategory" :placeholder="t('supplier.categoryPlaceholder')" />
          </el-form-item>

          <el-form-item :label="t('supplier.remark')">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="4"
              :placeholder="t('supplier.remarkPlaceholder')"
            />
          </el-form-item>

          <el-form-item class="supplier-apply-page__submit-row">
            <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
              {{ t("supplier.submit") }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.supplier-apply-page {
  min-height: 100vh;
  padding: 88px 20px 48px;
  background: #f5f7fa;
}

.supplier-apply-page__wrap {
  max-width: 700px;
  margin: 0 auto;
}

.supplier-apply-page__header {
  text-align: center;
  margin-bottom: 30px;
}

.supplier-apply-page__header h2 {
  margin: 0 0 8px;
  color: #303133;
  font-size: 24px;
}

.supplier-apply-page__header p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.7;
}

.supplier-apply-page__card {
  border-radius: 18px;
}

:deep(.supplier-apply-page__submit-row .el-form-item__content) {
  justify-content: center;
}

.supplier-apply-page__submit-row {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .supplier-apply-page {
    padding-top: 72px;
  }

  :deep(.el-form) {
    --el-form-label-width: 100px;
  }
}
</style>
