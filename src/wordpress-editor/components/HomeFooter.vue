<template>
  <footer class="home-footer">
    <div class="home-footer-inner">
      <div class="home-footer-grid">
        <div class="home-footer-col home-footer-col--company">
          <h4 class="home-footer-heading">{{ text.company }}</h4>
          <p class="home-footer-brand-name">Zhuhai Baifeng Network Technology Co., Ltd.</p>
          <p class="home-footer-brand-tagline">{{ text.tagline }}</p>
        </div>
        <div class="home-footer-col">
          <h4 class="home-footer-heading">{{ text.product }}</h4>
          <ul class="home-footer-list">
            <li><RouterLink to="/pricing#wp-free">WP Free</RouterLink></li>
            <li><RouterLink to="/pricing#wp-pro">WP Pro</RouterLink></li>
            <li><RouterLink to="/pricing#tokens">{{ text.linkTokenWallet }}</RouterLink></li>
            <li><RouterLink to="/pricing#grading">{{ text.linkGrading }}</RouterLink></li>
          </ul>
        </div>
        <div class="home-footer-col">
          <h4 class="home-footer-heading">{{ text.resources }}</h4>
          <ul class="home-footer-list">
            <li><RouterLink to="/pricing">{{ text.linkPricing }}</RouterLink></li>
            <li><RouterLink to="/api">{{ text.linkApi }}</RouterLink></li>
          </ul>
        </div>
        <div class="home-footer-col home-footer-col--contact">
          <h4 class="home-footer-heading">{{ text.contact }}</h4>
          <div class="home-footer-contact-row">
            <span class="home-footer-contact-icon" aria-hidden="true">✉️</span>
            <a class="home-footer-email" href="mailto:csl@mockup100.com">csl@mockup100.com</a>
            <button
              type="button"
              class="home-footer-copy"
              :class="{ 'is-copied': contactEmailCopied }"
              :aria-label="contactEmailCopied ? text.copied : text.copy"
              @click="copyContactEmail"
            >
              <span class="home-footer-copy-icon" aria-hidden="true">{{ contactEmailCopied ? '✅' : '📋' }}</span>
              <span class="home-footer-copy-label">{{ contactEmailCopied ? text.copied : text.copy }}</span>
            </button>
          </div>
          <div class="home-footer-contact-row">
            <span class="home-footer-contact-icon" aria-hidden="true">🌐</span>
            <a
              class="home-footer-site"
              href="https://www.mockup100.com"
              target="_blank"
              rel="noopener noreferrer"
            >www.mockup100.com</a>
          </div>
        </div>
      </div>
      <div class="home-footer-bottom">
        <span>© {{ year }} Mockup100 · Zhuhai Baifeng Network Technology Co., Ltd. {{ text.rightsReserved }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import { storeToRefs } from "pinia"
import { RouterLink } from "vue-router"
import { useUiLocaleStore } from "../stores/uiLocale"

const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const isZh = computed(() => locale.value === "zh")

const text = computed(() => {
  const zh = isZh.value
  return {
    contact: zh ? "联系我们" : "Contact",
    company: zh ? "公司" : "Company",
    product: zh ? "产品" : "Product",
    resources: zh ? "资源" : "Resources",
    copy: zh ? "复制" : "Copy",
    copied: zh ? "已复制" : "Copied",
    tagline: zh ? "AI 驱动的样机平台" : "AI-powered mockup platform",
    rightsReserved: zh ? "保留所有权利。" : "All rights reserved.",
    linkPricing: zh ? "定价" : "Pricing",
    linkApi: zh ? "API 文档" : "API Docs",
    linkTokenWallet: zh ? "Token 钱包" : "Token Wallet",
    linkGrading: zh ? "Grading 订阅" : "Grading",
  }
})

const year = new Date().getFullYear()

const contactEmailCopied = ref(false)
let contactEmailCopyTimer: ReturnType<typeof setTimeout> | null = null

async function copyContactEmail() {
  const email = "csl@mockup100.com"
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(email)
    }
  } catch (_err) {
    // Clipboard API unavailable or rejected; still surface the visual feedback so the user knows the action fired.
  }
  contactEmailCopied.value = true
  if (contactEmailCopyTimer) {
    clearTimeout(contactEmailCopyTimer)
  }
  contactEmailCopyTimer = setTimeout(() => {
    contactEmailCopied.value = false
    contactEmailCopyTimer = null
  }, 1500)
}

onBeforeUnmount(() => {
  if (contactEmailCopyTimer) {
    clearTimeout(contactEmailCopyTimer)
    contactEmailCopyTimer = null
  }
})
</script>

<style scoped>
.home-footer {
  margin-top: 80px;
  padding: 56px 24px 28px;
  background:
    radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.08), transparent 55%),
    radial-gradient(circle at 90% 90%, rgba(139, 92, 246, 0.08), transparent 55%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 1) 100%);
  border-top: 1px solid #e5e7eb;
}
.home-footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.home-footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1.4fr;
  gap: 32px;
  align-items: start;
}
.home-footer-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.home-footer-heading {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #475569;
}
.home-footer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.home-footer-list a {
  color: #334155;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s ease;
}
.home-footer-list a:hover {
  color: #4f46e5;
}
.home-footer-brand-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.5;
}
.home-footer-brand-tagline {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.55;
}
.home-footer-contact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.home-footer-contact-icon {
  font-size: 15px;
  flex-shrink: 0;
}
.home-footer-email {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.01em;
  transition: color 0.15s ease;
}
.home-footer-email:hover {
  color: #6366f1;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.home-footer-site {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.15s ease;
}
.home-footer-site:hover {
  color: #6366f1;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.home-footer-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  margin-left: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.home-footer-copy:hover {
  border-color: #c7d2fe;
  color: #4f46e5;
  background: #eef2ff;
}
.home-footer-copy.is-copied {
  border-color: #bbf7d0;
  color: #047857;
  background: #ecfdf5;
}
.home-footer-copy-icon {
  font-size: 12px;
}
.home-footer-bottom {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  letter-spacing: 0.02em;
}
@media (max-width: 900px) {
  .home-footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
}
@media (max-width: 480px) {
  .home-footer {
    padding: 40px 16px 24px;
  }
  .home-footer-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .home-footer-email {
    font-size: 14px;
  }
}
</style>
