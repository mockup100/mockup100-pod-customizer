<template>
  <div class="settings-page">
    <div class="settings-content">
      <div class="settings-grid">
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon">👤</div>
            <div class="card-text">
              <h2 class="card-title">{{ t('profileTitle') }}</h2>
              <p class="card-description">{{ t('profileDescription') }}</p>
            </div>
          </div>
          <form class="settings-form" @submit.prevent="updateProfile">
            <div class="form-group">
              <label class="form-label">{{ t('displayName') }}</label>
              <input v-model="profileForm.displayName" class="form-input" :placeholder="t('displayNamePlaceholder')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('email') }}</label>
              <input :value="profileForm.email" class="form-input readonly" readonly />
              <p class="form-help">{{ t('emailReadonly') }}</p>
            </div>
            <div class="form-actions">
              <button type="submit" class="button-primary" :disabled="isUpdatingProfile">
                <span v-if="isUpdatingProfile" class="loading-spinner"></span>
                {{ isUpdatingProfile ? t('saving') : t('saveProfile') }}
              </button>
            </div>
          </form>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon">🔐</div>
            <div class="card-text">
              <h2 class="card-title">{{ t('passwordTitle') }}</h2>
              <p class="card-description">{{ t('passwordDescription') }}</p>
            </div>
          </div>
          <form class="settings-form" @submit.prevent="updatePassword">
            <div class="form-group">
              <label class="form-label">{{ t('currentPassword') }}</label>
              <div class="password-input">
                <input
                  v-model="passwordForm.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  class="form-input"
                  autocomplete="current-password"
                  :placeholder="t('currentPasswordPlaceholder')"
                />
                <button type="button" class="password-toggle" @click="showCurrentPassword = !showCurrentPassword">
                  {{ showCurrentPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('newPassword') }}</label>
              <div class="password-input">
                <input
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="form-input"
                  autocomplete="new-password"
                  :placeholder="t('newPasswordPlaceholder')"
                />
                <button type="button" class="password-toggle" @click="showNewPassword = !showNewPassword">
                  {{ showNewPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <p class="form-help">{{ t('passwordRequirement') }}</p>
              <p v-if="passwordForm.newPassword" class="form-help">{{ t('strength') }}: {{ passwordStrength.text }}</p>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('confirmNewPassword') }}</label>
              <div class="password-input">
                <input
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="form-input"
                  autocomplete="new-password"
                  :placeholder="t('confirmNewPasswordPlaceholder')"
                />
                <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
                  {{ showConfirmPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <p v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="form-help">
                {{ t('passwordsDoNotMatch') }}
              </p>
            </div>
            <div class="form-actions">
              <button type="submit" :disabled="!isPasswordFormValid || isUpdatingPassword" class="button-primary">
                <span v-if="isUpdatingPassword" class="loading-spinner"></span>
                {{ isUpdatingPassword ? t('updating') : t('changePassword') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useUiLocaleStore } from '../../stores/uiLocale'

const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { account } = storeToRefs(authStore)

const SETTINGS_I18N = {
  en: {
    profileTitle: 'Profile',
    profileDescription: 'Update account details.',
    displayName: 'Display Name',
    displayNamePlaceholder: 'Enter your display name',
    email: 'Email',
    emailReadonly: 'Email cannot be changed here.',
    saving: 'Saving...',
    saveProfile: 'Save Profile',
    passwordTitle: 'Password',
    passwordDescription: 'Change password.',
    currentPassword: 'Current Password',
    currentPasswordPlaceholder: 'Enter current password',
    newPassword: 'New Password',
    newPasswordPlaceholder: 'Enter new password',
    confirmNewPassword: 'Confirm New Password',
    confirmNewPasswordPlaceholder: 'Confirm new password',
    passwordRequirement: 'At least 8 characters.',
    strength: 'Strength',
    passwordsDoNotMatch: 'Passwords do not match.',
    updating: 'Updating...',
    changePassword: 'Change Password',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    profileUpdated: 'Profile updated successfully.',
    profileUpdateFailed: 'Failed to update profile.',
    passwordChanged: 'Password changed successfully.',
    passwordUpdateFailed: 'Failed to update password.',
  },
  zh: {
    profileTitle: '个人资料',
    profileDescription: '更新账号信息。',
    displayName: '显示名称',
    displayNamePlaceholder: '请输入显示名称',
    email: '邮箱',
    emailReadonly: '这里不能修改邮箱。',
    saving: '保存中...',
    saveProfile: '保存资料',
    passwordTitle: '密码',
    passwordDescription: '修改密码。',
    currentPassword: '当前密码',
    currentPasswordPlaceholder: '请输入当前密码',
    newPassword: '新密码',
    newPasswordPlaceholder: '请输入新密码',
    confirmNewPassword: '确认新密码',
    confirmNewPasswordPlaceholder: '请再次输入新密码',
    passwordRequirement: '至少 8 个字符。',
    strength: '强度',
    passwordsDoNotMatch: '两次输入的密码不一致。',
    updating: '更新中...',
    changePassword: '修改密码',
    weak: '弱',
    medium: '中',
    strong: '强',
    profileUpdated: '资料更新成功。',
    profileUpdateFailed: '资料更新失败。',
    passwordChanged: '密码修改成功。',
    passwordUpdateFailed: '密码修改失败。',
  },
} as const

function t(key: keyof typeof SETTINGS_I18N.en) {
  return SETTINGS_I18N[uiLocaleStore.locale === 'zh' ? 'zh' : 'en'][key]
}

const profileForm = ref({
  displayName: '',
  email: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const isUpdatingProfile = ref(false)
const isUpdatingPassword = ref(false)

const passwordStrength = computed(() => {
  const password = passwordForm.value.newPassword
  if (!password) return { text: '' }

  let strength = 0
  if (password.length >= 8) strength += 1
  if (password.length >= 12) strength += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1

  const levels = [t('weak'), t('weak'), t('medium'), t('medium'), t('strong'), t('strong')]
  return { text: levels[strength] || t('weak') }
})

const isPasswordFormValid = computed(() => {
  return passwordForm.value.currentPassword &&
    passwordForm.value.newPassword.length >= 8 &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword
})

const updateProfile = async () => {
  isUpdatingProfile.value = true
  try {
    await authStore.updateProfile(profileForm.value.displayName)
    ElMessage.success(authStore.notice || t('profileUpdated'))
  } catch {
    ElMessage.error(authStore.error || t('profileUpdateFailed'))
  } finally {
    isUpdatingProfile.value = false
  }
}

const updatePassword = async () => {
  if (!isPasswordFormValid.value) return

  isUpdatingPassword.value = true
  try {
    await authStore.changePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword)
    ElMessage.success(authStore.notice || t('passwordChanged'))
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch {
    ElMessage.error(authStore.error || t('passwordUpdateFailed'))
  } finally {
    isUpdatingPassword.value = false
  }
}

onMounted(() => {
  if (account.value) {
    profileForm.value = {
      displayName: account.value.display_name || '',
      email: account.value.email || ''
    }
  }
})

watch(account, (newAccount) => {
  if (newAccount) {
    profileForm.value = {
      displayName: newAccount.display_name || '',
      email: newAccount.email || ''
    }
  }
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-content {
  width: 100%;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1rem;
}

.settings-card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.card-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 0.75rem;
  color: white;
}

.card-text {
  flex: 1;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem;
}

.card-description {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.settings-form {
  padding: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-input.readonly {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.password-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.password-toggle:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.form-help {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
  line-height: 1.4;
}

.button-primary,
.button-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-decoration: none;
}

.button-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
}

.button-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.button-secondary {
  background: white;
  color: #6366f1;
  border: 2px solid #6366f1;
}

.button-secondary:hover:not(:disabled) {
  background: #6366f1;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.button-primary:disabled,
.button-secondary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 1rem;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .card-header,
  .settings-form {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .button-primary,
  .button-secondary {
    width: 100%;
  }
}
</style>
