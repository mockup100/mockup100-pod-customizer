<template>
  <div class="api-page">
    <header class="page-header">
      <div class="header-inner">
        <div class="header-copy">
          <span class="header-kicker">{{ text.header.kicker }}</span>
          <p>{{ text.header.subtitle }}</p>
        </div>
        <nav class="header-nav mobile-nav">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="nav-chip"
            :class="{ active: activeSection === section.id }"
            @click="scrollToSection(section.id)"
          >
            {{ section.label }}
          </button>
        </nav>
      </div>
    </header>

    <div class="page-layout">
      <aside class="page-sidebar">
        <div class="sidebar-card">
          <p class="sidebar-title">{{ text.header.sidebarTitle }}</p>
          <nav class="sidebar-nav">
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              class="sidebar-link"
              :class="{ active: activeSection === section.id }"
              @click="scrollToSection(section.id)"
            >
              {{ section.label }}
            </button>
          </nav>
        </div>
      </aside>

      <main class="page-body">
        <section id="overview" class="hero-section section-anchor">
        <div class="hero-grid">
          <div class="hero-copy">
            <span class="hero-pill">{{ text.hero.pill }}</span>
            <h1>{{ text.hero.title }}</h1>
            <p class="hero-desc">
              {{ text.hero.description }}
            </p>
            <div class="hero-actions">
              <button class="btn btn-primary" type="button" @click="openDeveloperConsole">
                {{ isAuthenticated ? text.hero.primaryAuthenticated : text.hero.primaryGuest }}
              </button>
              <button class="btn btn-secondary" type="button" @click="scrollToSection('quickstart')">{{ text.hero.secondary }}</button>
            </div>
          </div>

          <div class="hero-panel">
            <div class="panel-head">
              <span class="panel-label">{{ text.hero.panelLabel }}</span>
              <button class="copy-btn" type="button" @click="copyCurl">{{ text.hero.copyButton }}</button>
            </div>
            <pre class="code-block"><code>curl -X GET "<span class="code-string">{{ platformPublicBase }}/api/v1/external/templates</span>" \
  -H "<span class="code-string">x-api-key: mkp_your_real_key</span>"</code></pre>
          </div>
        </div>
        </section>

        <section id="quickstart" class="content-section section-anchor">
        <div class="section-head">
          <div>
            <p class="eyebrow">{{ text.quickstart.eyebrow }}</p>
            <h2>{{ text.quickstart.title }}</h2>
          </div>
        </div>

        <div class="steps-grid">
          <article v-for="step in quickSteps" :key="step.title" class="step-card">
            <span class="step-number">{{ step.id }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </article>
        </div>

        <div class="auth-grid">
          <article class="auth-card">
            <h3>{{ text.quickstart.authCards.requestHeader }}</h3>
            <pre class="mini-code"><code>x-api-key: mkp_your_real_key</code></pre>
          </article>
          <article class="auth-card">
            <h3>{{ text.quickstart.authCards.baseUrl }}</h3>
            <pre class="mini-code"><code>{{ platformPublicBase }}/api/v1/external</code></pre>
          </article>
          <article class="auth-card">
            <h3>{{ text.quickstart.authCards.publicSizes }}</h3>
            <pre class="mini-code"><code>512 / 1024 / 2048 / 4096</code></pre>
          </article>
        </div>

        <div class="security-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>{{ text.quickstart.securityNote }}</span>
        </div>

        <div class="quick-rules">
          <article v-for="rule in integrationRules" :key="rule.title" class="rule-card">
            <strong>{{ rule.title }}</strong>
            <span>{{ rule.copy }}</span>
          </article>
        </div>

        <div class="endpoint-list">
          <article v-for="ep in endpoints" :key="ep.name" class="endpoint-row">
            <div class="ep-left">
              <span class="ep-method" :class="`method-${ep.method.toLowerCase()}`">{{ ep.method }}</span>
              <code class="ep-path">{{ ep.path }}</code>
            </div>
            <div class="ep-right">
              <h4>{{ ep.name }}</h4>
              <p>{{ ep.summary }}</p>
              <div class="field-tags">
                <span v-for="field in ep.fields" :key="field" class="field-tag">{{ field }}</span>
              </div>
              <div class="sdk-tabs">
                <div class="sdk-tab-bar">
                  <button
                    v-for="lang in sdkLangs"
                    :key="lang.id"
                    type="button"
                    class="sdk-tab-btn"
                    :class="{ active: (sdkLangActive[ep.path] || 'curl') === lang.id }"
                    @click="setSdkLang(ep.path, lang.id)"
                  >{{ lang.label }}</button>
                  <button type="button" class="sdk-copy" @click="copySdkSnippet(ep)">{{ text.common.copy }}</button>
                </div>
                <pre class="mini-code"><code>{{ sdkSnippet(ep) }}</code></pre>
              </div>
            </div>
          </article>
        </div>

        </section>

        <section id="playground" class="content-section section-anchor">
        <div class="section-head">
          <div>
            <p class="eyebrow">{{ text.playground.eyebrow }}</p>
            <h2>{{ text.playground.title }}</h2>
            <p class="section-desc">{{ text.playground.description }}</p>
          </div>
        </div>

        <form class="playground-card" @submit.prevent="runPlayground">
          <div class="playground-row">
            <label class="playground-label">{{ text.playground.endpointLabel }}</label>
            <select v-model="playgroundEndpoint" class="playground-input">
              <option v-for="ep in endpoints" :key="ep.path" :value="ep.path">{{ ep.method }} {{ ep.path }}</option>
            </select>
          </div>
          <div class="playground-row">
            <label class="playground-label">x-api-key</label>
            <input v-model.trim="playgroundKey" type="password" class="playground-input" placeholder="mkp_your_real_key" autocomplete="off" />
          </div>
          <div class="playground-row" v-if="playgroundShouldShowQuery">
            <label class="playground-label">{{ text.playground.queryLabel }}</label>
            <input v-model.trim="playgroundQuery" type="text" class="playground-input" placeholder="limit=5" />
          </div>
          <div class="playground-row" v-if="playgroundShouldShowBody">
            <label class="playground-label">{{ text.playground.bodyLabel }}</label>
            <textarea v-model="playgroundBody" class="playground-textarea" rows="5" placeholder='{ "limit": 5 }'></textarea>
          </div>
          <div class="playground-actions">
            <button type="submit" class="btn btn-primary" :disabled="playgroundRunning || !playgroundKey">
              {{ playgroundRunning ? text.playground.running : text.playground.run }}
            </button>
            <span v-if="playgroundLatency !== null" class="playground-meta">{{ playgroundLatency }} ms</span>
            <span v-if="playgroundStatus !== null" class="playground-meta" :class="playgroundStatus < 400 ? 'meta-ok' : 'meta-bad'">HTTP {{ playgroundStatus }}</span>
          </div>
          <pre v-if="playgroundResponse" class="code-block playground-response"><code>{{ playgroundResponse }}</code></pre>
          <p class="playground-note">{{ text.playground.note }}</p>
        </form>
        </section>

        <section id="plugins" class="content-section section-anchor">
        <div class="section-head">
          <div>
            <p class="eyebrow">{{ text.plugins.eyebrow }}</p>
            <h2>{{ text.plugins.title }}</h2>
          </div>
        </div>

        <div class="plugin-grid">
          <article id="wordpress-plugin" class="plugin-card">
            <div class="plugin-head">
              <div class="plugin-badge wordpress">W</div>
              <div>
                <h3>WordPress / WooCommerce</h3>
                <p>{{ text.plugins.wordpress.description }}</p>
              </div>
            </div>
            <div class="plugin-meta">
              <span v-if="wooPluginInfo?.version">{{ text.common.version }} {{ wooPluginInfo.version }}</span>
              <span v-if="wooPluginInfo?.filename">{{ wooPluginInfo.filename }}</span>
              <span v-if="wooPluginInfo?.size_bytes">{{ formatSize(wooPluginInfo.size_bytes) }}</span>
            </div>
            <ul class="bullet-list">
              <li v-for="item in text.plugins.wordpress.bullets" :key="item">{{ item }}</li>
            </ul>
            <div class="plugin-actions">
              <a id="wordpress-plugin-download" class="btn btn-primary" :href="wooDownloadUrl">{{ text.common.downloadZip }}</a>
              <a class="btn btn-secondary" :href="wooInstallDocUrl">{{ text.common.setupEntry }}</a>
            </div>
          </article>

          <article id="shopify-plugin" class="plugin-card">
            <div class="plugin-head">
              <div class="plugin-badge shopify">S</div>
              <div>
                <h3>Shopify</h3>
                <p>{{ text.plugins.shopify.description }}</p>
              </div>
            </div>
            <div class="plugin-meta">
              <span v-if="shopifyPluginInfo?.available === false">Coming soon</span>
              <template v-else>
                <span v-if="shopifyPluginInfo?.version">{{ text.common.version }} {{ shopifyPluginInfo.version }}</span>
                <span v-if="shopifyPluginInfo?.filename">{{ shopifyPluginInfo.filename }}</span>
                <span v-if="shopifyPluginInfo?.size_bytes">{{ formatSize(shopifyPluginInfo.size_bytes) }}</span>
              </template>
            </div>
            <ul class="bullet-list">
              <li v-for="item in text.plugins.shopify.bullets" :key="item">{{ item }}</li>
            </ul>
            <div class="plugin-actions">
              <a class="btn btn-primary" :href="shopifyDownloadUrl">{{ text.common.downloadZip }}</a>
              <a class="btn btn-secondary" :href="shopifyInstallDocUrl">{{ text.common.setupEntry }}</a>
            </div>
          </article>

          <article id="wp-pro-plan" class="plugin-card">
            <div class="plugin-head">
              <div class="plugin-badge wordpress">P</div>
              <div>
                <h3>WordPress Pro Add-on</h3>
                <p>One-time lifetime purchase, no recurring fees. Unlocks bulk order export and multi-user team management exclusively for WordPress editor. Multi-size grading is not included and requires an independent cloud subscription.</p>
              </div>
            </div>
            <div class="plugin-meta">
              <span>$49 Single Site</span>
              <span>$99 Unlimited Sites</span>
            </div>
            <div class="plugin-actions">
              <a class="btn btn-primary" href="/pricing#wp-pro">View Plans</a>
            </div>
          </article>

          <article id="grading-plan" class="plugin-card">
            <div class="plugin-head">
              <div class="plugin-badge grading">G</div>
              <div>
                <h3>Cloud Grading Subscription</h3>
                <p>$9 Standard / $19 Enterprise per month, auto-renewable with anytime cancellation. One subscription unlocks multi-size grading on both web console and WordPress editor.</p>
                <!-- Plan v3 §S2.6：API 介绍页 grading 卡补充 30 天免费试用披露。 -->
                <p class="plugin-trial-note">New accounts can start a free 30-day Grading trial — no credit card required.</p>
                <!-- Plan v5 §C.5：trial 进行中倒计时 chip。 -->
                <p
                  v-if="trialDaysRemaining !== null"
                  class="plugin-trial-chip"
                  data-testid="api-grading-trial-chip"
                >
                  Trial · {{ trialDaysRemaining }} days remaining
                </p>
              </div>
            </div>
            <div class="plugin-actions">
              <a class="btn btn-primary" href="/pricing#grading">View Plans</a>
              <a class="btn btn-secondary" :href="gradingTrialHref" data-testid="api-grading-trial-cta">Start free trial</a>
            </div>
          </article>
        </div>
        </section>

        <section id="errors" class="content-section section-anchor">
        <div class="section-head">
          <div>
            <p class="eyebrow">{{ text.errors.eyebrow }}</p>
            <h2>{{ text.errors.title }}</h2>
            <p class="section-desc">{{ text.errors.description }}</p>
          </div>
        </div>

        <div class="errors-grid">
          <article v-for="row in errorRows" :key="row.code" class="error-card">
            <div class="error-card-head">
              <span class="error-code" :class="`error-code-${row.severity}`">{{ row.code }}</span>
              <strong>{{ row.title }}</strong>
            </div>
            <p>{{ row.body }}</p>
            <code class="error-hint">{{ row.hint }}</code>
          </article>
        </div>

        <div class="limits-grid">
          <article class="limit-card">
            <strong>{{ text.errors.rateLimitTitle }}</strong>
            <p>{{ text.errors.rateLimitBody }}</p>
            <pre class="mini-code"><code>X-RateLimit-Limit: 300
X-RateLimit-Remaining: 297
X-RateLimit-Reset: 1735689600</code></pre>
          </article>
          <article class="limit-card">
            <strong>{{ text.errors.payloadTitle }}</strong>
            <p>{{ text.errors.payloadBody }}</p>
          </article>
          <article class="limit-card">
            <strong>{{ text.errors.idempotencyTitle }}</strong>
            <p>{{ text.errors.idempotencyBody }}</p>
            <pre class="mini-code"><code>Idempotency-Key: 84e1d2c8-...</code></pre>
          </article>
          <article class="limit-card limit-card--wide">
            <strong>{{ text.errors.webhookSigTitle }}</strong>
            <p>{{ text.errors.webhookSigBody }}</p>
            <pre class="mini-code"><code>X-Mockup100-Event: render.completed
X-Mockup100-Timestamp: 1735689600
X-Mockup100-Signature: sha256=&lt;hex&gt;</code></pre>
            <pre class="mini-code"><code>{{ webhookSigSnippet }}</code></pre>
          </article>
        </div>
        </section>

        <section id="reference" class="content-section section-anchor">
        <div class="section-head">
          <div>
            <p class="eyebrow">{{ text.reference.eyebrow }}</p>
            <h2>{{ text.reference.title }}</h2>
          </div>
        </div>

        <div class="example-grid">
          <article class="example-card">
            <h3>{{ text.reference.requestExampleTitle }}</h3>
            <pre class="code-block"><code>{
  "template_id": "upload-fix-live-20f83fe7--10faf96c4498",
  "selected_color": "black",
  "selected_view": "001",
  "output_size": "512x512",
  "compose_overrides": {
    "texture_strength": 0.3,
    "shadow_weight": 0.25,
    "highlight_weight": 0.15
  },
  "part_names": "body.png,sleeve.png",
  "part_images": "multipart files"
}</code></pre>
          </article>
          <article class="example-card">
            <h3>{{ text.reference.resultExampleTitle }}</h3>
            <pre class="code-block"><code>{
  "job_id": "f8a0f7d5d044",
  "status": "done",
  "output_count": 1,
  "preview_url": "/api/v1/external/runtime/jobs/f8a0f7d5d044/preview",
  "download_url": "/api/v1/external/runtime/jobs/f8a0f7d5d044/download",
  "archive_download_url": "/api/v1/external/runtime/jobs/f8a0f7d5d044/outputs/archive/download",
  "outputs": [
    {
      "size": "512x512",
      "selected_color": "white",
      "selected_view": "001",
      "output_index": 0,
      "preview_url": "/api/v1/external/runtime/jobs/f8a0f7d5d044/outputs/0/preview",
      "download_url": "/api/v1/external/runtime/jobs/f8a0f7d5d044/outputs/0/download"
    }
  ]
}</code></pre>
          </article>
        </div>

        <div class="reference-grid">
          <a class="reference-card" href="/shared/current/docs/external-template-api-flow.md" target="_blank" rel="noopener">
            <strong>{{ text.reference.cards.integrationGuide.title }}</strong>
            <span>{{ text.reference.cards.integrationGuide.description }}</span>
          </a>
          <a class="reference-card" href="/shared/current/docs/wordpress-plugin-api-flow.md" target="_blank" rel="noopener">
            <strong>{{ text.reference.cards.wordpressBffFlow.title }}</strong>
            <span>{{ text.reference.cards.wordpressBffFlow.description }}</span>
          </a>
          <a class="reference-card" :href="openApiSchemaPath" target="_blank" rel="noopener">
            <strong>{{ text.reference.cards.openApiJson.title }}</strong>
            <span>{{ text.reference.cards.openApiJson.description }}</span>
          </a>
          <a class="reference-card" :href="openApiPath" target="_blank" rel="noopener">
            <strong>{{ text.reference.cards.swaggerUi.title }}</strong>
            <span>{{ text.reference.cards.swaggerUi.description }}</span>
          </a>
        </div>
        </section>

        <section id="billing-contract" class="content-section section-anchor">
          <div class="section-head">
            <div>
              <p class="eyebrow">{{ text.billingContract.eyebrow }}</p>
              <h2>{{ text.billingContract.title }}</h2>
            </div>
          </div>
          <p>{{ text.billingContract.description }}</p>
          <h3>{{ text.billingContract.catalogTitle }}</h3>
          <pre class="code-block"><code>GET /api/pricing/catalog
HTTP/1.1 200 OK
Content-Type: application/json
{
  "token_packs": [
    {"sku":"token_2000","tokens":2000,"amount_cents":500},
    {"sku":"token_10000","tokens":10000,"amount_cents":2000,"featured":true},
    {"sku":"token_50000","tokens":50000,"amount_cents":8000}
  ],
  "grading_subscription": [
    {"sku":"grading_standard","tier":"standard","price_cents":900,"billing_cycle":"monthly"},
    {"sku":"grading_enterprise","tier":"enterprise","price_cents":1900,"billing_cycle":"monthly"}
  ],
  "wp_pro_addon": [
    {"sku":"wp_pro_single","scope":"single","price_cents":4900,"billing_cycle":"lifetime"},
    {"sku":"wp_pro_unlimited","scope":"unlimited","price_cents":9900,"billing_cycle":"lifetime"}
  ]
}</code></pre>
          <h3>{{ text.billingContract.capabilitiesTitle }}</h3>
          <pre class="code-block"><code>GET /api/user/capabilities
Authorization: Bearer &lt;token&gt;
HTTP/1.1 200 OK
{
  "wp_pro_active": false,
  "platform_grading_sub_tier": "none",
  "token_balance": 480
}</code></pre>
          <h3>{{ text.billingContract.insufficientTitle }}</h3>
          <pre class="code-block"><code>HTTP/1.1 402 Payment Required
Content-Type: application/json
{
  "code": "token_insufficient",
  "msg": "Token balance is not enough to render at this resolution. Please top up.",
  "recharge_url": "https://www.mockup100.com/admin/tokens-management"
}</code></pre>
          <h3>{{ text.billingContract.stairTitle }}</h3>
          <table class="ratecard-table">
            <thead><tr><th>{{ text.billingContract.stairResolution }}</th><th>{{ text.billingContract.stairCost }}</th></tr></thead>
            <tbody>
              <tr><td>512×512</td><td>{{ text.billingContract.free }}</td></tr>
              <tr><td>1024×1024</td><td>1 Token</td></tr>
              <tr><td>2048×2048</td><td>2 Tokens</td></tr>
              <tr><td>4096×4096</td><td>8 Tokens</td></tr>
            </tbody>
          </table>
        </section>

        <section id="capability-flags" class="content-section section-anchor">
          <div class="section-head">
            <div>
              <p class="eyebrow">{{ text.capabilityFlags.eyebrow }}</p>
              <h2>{{ text.capabilityFlags.title }}</h2>
            </div>
          </div>
          <p>{{ text.capabilityFlags.description }}</p>
          <div class="capability-grid">
            <article class="capability-card">
              <h3><code>wp_pro_active</code></h3>
              <p>{{ text.capabilityFlags.wpPro.body }}</p>
              <p class="capability-gate">{{ text.capabilityFlags.wpPro.gate }}</p>
            </article>
            <article class="capability-card">
              <h3><code>platform_grading_sub</code></h3>
              <p>{{ text.capabilityFlags.grading.body }}</p>
              <p class="capability-gate">{{ text.capabilityFlags.grading.gate }}</p>
            </article>
            <article class="capability-card">
              <h3><code>token_balance</code></h3>
              <p>{{ text.capabilityFlags.token.body }}</p>
              <p class="capability-gate">{{ text.capabilityFlags.token.gate }}</p>
            </article>
          </div>
        </section>
      </main>
    </div>

    <HomeFooter />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"
import { API_BASE } from "../api/client"
import { useAuthStore } from "../stores/auth"
import HomeFooter from "../components/HomeFooter.vue"
import { useUiLocaleStore } from "../stores/uiLocale"
// Plan v5 §C.5：trial 倒计时披露。
import { useGradingTrialCountdown } from "../composables/useGradingTrialCountdown"

const router = useRouter()
const authStore = useAuthStore()
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)

const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentLocale = computed(() => locale.value === "zh" ? "zh" : "en")
// Plan v5 §C.5：trial 倒计时 chip 数据源。
const { daysRemaining: trialDaysRemaining } = useGradingTrialCountdown()
// Plan v3 §S2.6：API 介绍页 grading 卡 trial CTA 链接，未登录走注册回流。
const gradingTrialHref = computed(() =>
  authStore.isAuthenticated
    ? "/admin/tokens-management?intent=grading-trial#grading-subscription"
    : "/auth?mode=register&redirect=/admin/tokens-management?intent=grading-trial",
)
const API_PAGE_I18N = {
  en: {
    header: {
      kicker: "OpenAPI",
      subtitle: "Connect your storefront or app to Mockup100.",
      sidebarTitle: "Page Navigation",
    },
    hero: {
      pill: "Own The Customer Experience",
      title: "Bring Mockup100 into your own storefront and product flow",
      description: "Keep your brand and checkout flow while Mockup100 handles template data, customization, rendering, and output delivery.",
      primaryAuthenticated: "Open Keys & Access",
      primaryGuest: "Get API Keys",
      secondary: "See Integration Flow",
      panelLabel: "First API Call",
      copyButton: "Copy",
    },
    sections: {
      overview: "Overview",
      quickstart: "Integration Flow",
      playground: "Try It",
      plugins: "Store Plugins",
      errors: "Errors & Limits",
      reference: "Technical Reference",
      billingContract: "Billing Contract (HTTP 402)",
      capabilityFlags: "Capability Flags",
    },
    quickstart: {
      eyebrow: "Integration Flow",
      title: "The fastest path to launch custom product experiences",
      authCards: {
        requestHeader: "Request Header",
        baseUrl: "Base URL",
        publicSizes: "Public Sizes",
      },
      securityNote: "Do not expose API keys in browser-side JavaScript. Your storefront or app should call your own backend first, then forward requests to Mockup100.",
      steps: [
        { id: "01", title: "Create secure access", description: "Create or retrieve your tenant API key." },
        { id: "02", title: "Load sellable products", description: "Read the template catalog for your product list." },
        { id: "03", title: "Load customization data", description: "Fetch colors, views, editable parts, reference assets, output options, and saved physical size data." },
        { id: "04", title: "Load artwork commerce", description: "Read artwork list, categories, license state, and purchase endpoints when your page includes artwork browsing." },
        { id: "05", title: "Render customer designs", description: "Send selected color, selected view, and edited part images from your backend." },
        { id: "06", title: "Return final outputs", description: "Read preview and download URLs from job results." },
      ],
      rules: [
        { title: "Stable ID", copy: "Use `template_id` as the primary identifier across catalog, detail, editor, compose, and job polling." },
        { title: "Recommended Path", copy: "Use `templates` -> `detail` -> `editor` -> `artworks` (optional) -> `editor/compose` -> `results`; do not build customer-facing flows against internal `/runtime/*` routes." },
        { title: "Customization Assets", copy: "Use `parts[].part_name` as editable keys, render `svg_url` first when present, fall back to `cutout_url`, and treat `guide_url` as an optional non-editable overlay only. Keep `template_size` as the pixel canvas size and read real-world measurements from `physical_dimensions_cm.parts.<part>.canvas` and `bbox`." },
        { title: "Output Delivery", copy: "Upload only edited `part_images` to compose, then follow returned `job_status_url`, `job_results_url`, `preview_url`, `download_url`, and `archive_download_url` directly." },
        { title: "Artwork Commerce", copy: "When your storefront includes an artwork browser, use `artworks`, `categories/tree`, `licenses`, and `purchase` from the same external API family instead of mixing private console endpoints." },
        { title: "Compatibility Boundary", copy: "Treat governance fields such as `template_code`, `publish_status`, `tenant_api_status`, `marketplace_status`, and artwork review metadata as compatibility metadata. Keep customer-facing flows driven by the recommended identifiers, editor payload, and render results only." },
        { title: "Physical Size", copy: "`physical_dimensions_cm` stores the confirmed real size in centimeters. `parts.<part>.canvas` is the saved image size used by preview and API consumers, `parts.<part>.bbox` is the product size, and `original.dpi` returns the detected source DPI when available or `72` as the fallback." },
      ],
    },
    plugins: {
      eyebrow: "Store Plugins",
      title: "Use official plugins when you want a faster creative space launch",
      wordpress: {
        description: "Creative-space-ready plugin with product binding, artwork commerce, preview/design submission, cart support, and a WordPress REST BFF that proxies the official Open API.",
        bullets: [
          "Bind repository or marketplace templates to WooCommerce products and variations",
          "Bootstrap the browser with the aggregated workspace route before loading separate artwork browse requests",
          "Keep the tenant API key on the WordPress server and proxy browser requests through `wp-json/mockup100/v1/*`",
          "Proxy template workspace, artwork browse, license, purchase, preview, and prepare-for-cart flows without exposing the API key",
          "Customers personalize products with colors, views, uploads, text, and layered adjustments",
          "Finished design data is written into cart and order item meta before checkout completes",
        ],
      },
      shopify: {
        description: "OAuth install flow, storefront design block, product bindings, and order sync forwarding.",
        bullets: [
          "Ship a theme app block so shoppers design directly on Shopify product pages",
          "Customers personalize products with parts, colors, views, uploads, text, and live refresh",
          "Finished design data is written into Shopify line item properties before add-to-cart",
          "Order webhooks extract design details and forward them to the platform for downstream fulfillment",
        ],
      },
    },
    reference: {
      eyebrow: "Technical Reference",
      title: "Use these assets when your engineering team starts implementation",
      requestExampleTitle: "Validated Request Example",
      resultExampleTitle: "Validated Result Example",
      cards: {
        integrationGuide: {
          title: "Integration Guide",
          description: "Read the verified integration contract, billing notes, and failure handling guidance for implementation teams.",
        },
        wordpressBffFlow: {
          title: "WordPress BFF Flow",
          description: "Review the current WooCommerce proxy routes, workspace aggregation, artwork commerce flow, and cart handoff contract.",
        },
        openApiJson: {
          title: "OpenAPI JSON",
          description: "Use the raw schema for SDK generation, testing, or internal tooling.",
        },
        swaggerUi: {
          title: "Swagger UI",
          description: "Inspect the full endpoint contract in the branded Swagger wrapper page.",
        },
      },
    },
    common: {
      version: "Version",
      downloadZip: "Download ZIP",
      setupEntry: "Setup Entry",
      copy: "Copy",
    },
    playground: {
      eyebrow: "Try It",
      title: "Run a real API call from your browser",
      description: "Pick an endpoint, paste your raw API key, and we will call the production gateway directly. Responses are not stored.",
      endpointLabel: "Endpoint",
      queryLabel: "Query",
      bodyLabel: "JSON Body",
      run: "Send Request",
      running: "Sending...",
      note: "We never log this key on the server. The browser sends it once and forgets it.",
    },
    errors: {
      eyebrow: "Errors & Limits",
      title: "Defensive defaults you can rely on",
      description: "All non-2xx responses include a JSON body with `code`, `message`, and `request_id`. Use the request ID when contacting support.",
      rateLimitTitle: "Rate Limits",
      rateLimitBody: "300 requests per minute per API key by default. Bursting is allowed up to 60 calls / 5 seconds.",
      payloadTitle: "Payload Limits",
      payloadBody: "Per-part image upload max 12 MB. Aggregate compose payload max 60 MB. Archive (.zip/.tar/.7z/.rar) template uploads max 200 MB.",
      idempotencyTitle: "Idempotency",
      idempotencyBody: "Pass an `Idempotency-Key` header on any POST that mutates state. Replays within 24h return the original response.",
      webhookSigTitle: "Webhook Signature",
      webhookSigBody: "Outbound webhook deliveries are signed with HMAC-SHA256(secret, `${timestamp}.${rawBody}`). Verify the signature before trusting the payload.",
    },
    errorRowsList: [
      { code: "400", severity: "warn", title: "Invalid Argument", body: "Required field is missing or fails schema validation.", hint: "Inspect `errors[].path` from the response body." },
      { code: "401", severity: "warn", title: "Missing or Invalid Key", body: "`x-api-key` header is missing, malformed, or revoked.", hint: "Rotate from /admin/developer-console/keys-access." },
      { code: "403", severity: "warn", title: "Scope Denied", body: "Key is valid but lacks the required scope for this endpoint.", hint: "Update scopes in keys-access tab." },
      { code: "404", severity: "warn", title: "Resource Not Found", body: "Template, artwork, or job id does not exist for this tenant.", hint: "Use `template_id` from the catalog response." },
      { code: "409", severity: "warn", title: "Conflict", body: "Another request mutated the same resource. Retry with refreshed state.", hint: "Re-fetch the resource and retry." },
      { code: "422", severity: "warn", title: "Unprocessable Entity", body: "Payload is syntactically valid but business rules rejected it.", hint: "Check `details` array for the rule that failed." },
      { code: "429", severity: "warn", title: "Rate Limited", body: "You exceeded the per-minute quota for this key.", hint: "Honor `Retry-After` header before resending." },
      { code: "500", severity: "bad", title: "Server Error", body: "Unhandled platform error. Mockup100 is investigating automatically.", hint: "Quote `request_id` when contacting support." },
      { code: "503", severity: "bad", title: "Service Unavailable", body: "Render queue is saturated or upstream maintenance is underway.", hint: "Retry with exponential backoff up to 5 attempts." },
    ],
    endpointNames: {
      listTemplates: "List Templates",
      templateDetail: "Template Detail",
      loadEditorPayload: "Load Editor Payload",
      listArtworks: "List Artworks",
      artworkCategories: "Artwork Categories",
      artworkLicenses: "Artwork Licenses",
      purchaseArtwork: "Purchase Artwork",
      composePreview: "Compose Preview",
      readJobStatus: "Read Job Status",
      readJobResults: "Read Job Results",
    },
    endpointSummaries: {
      listTemplates: "Read the sellable template catalog for API-enabled repository templates and listed marketplace templates.",
      templateDetail: "Load template metadata, public output sizes, canonical editor URLs, and saved physical size data before opening the customizer.",
      loadEditorPayload: "Load colors, views, editable parts, reference assets, default state, per-view geometry, and saved physical size data.",
      listArtworks: "Read marketplace or tenant artwork records for the current API key tenant.",
      artworkCategories: "Read the shared artwork category tree used by external artwork browsing.",
      artworkLicenses: "Read the current tenant license and unlock state for artwork commerce flows.",
      purchaseArtwork: "Unlock a paid artwork for the current tenant before inserting it into the editor.",
      composePreview: "Submit only edited `part_images`, selected color, selected view, and output size for rendering.",
      readJobStatus: "Poll the current render state.",
      readJobResults: "Read completed outputs and use the archive URL when you need a ZIP.",
    },
    billingContract: {
      eyebrow: "Billing Contract",
      title: "HTTP 402 — Token-insufficient payment required",
      description: "All cloud rendering and premium artwork endpoints check the caller's token balance before charging. When the balance cannot cover the next request, the API returns HTTP 402 Payment Required with a JSON body that points to the recharge URL. Front-ends MUST gate on the response status; older 422 responses have been retired.",
      catalogTitle: "Pricing catalog",
      capabilitiesTitle: "User capabilities",
      insufficientTitle: "Token-insufficient response",
      stairTitle: "Resolution stair",
      stairResolution: "Resolution",
      stairCost: "Token cost",
      free: "Free",
    },
    capabilityFlags: {
      eyebrow: "Capability Flags",
      title: "Three independent permission flags gate every paid feature",
      description: "Each capability returned by GET /api/user/capabilities gates exactly one product line. Pop-up dialogs MUST never cross-promote a different SKU.",
      wpPro: {
        body: "Bulk order export & team permission management in the WordPress editor.",
        gate: "When a user clicks bulk order export or team management in WP editor, the gate MUST check ONLY wp_pro_active === true.",
      },
      grading: {
        body: "Multi-size grading on Web console & WordPress editor (Standard $9 / Enterprise $19 per month).",
        gate: "When a user triggers multi-size grading on Web console or WordPress editor, the gate MUST check ONLY platform_grading_sub is active.",
      },
      token: {
        body: "HD render (>512 px) and premium artwork purchases.",
        gate: "When a user requests HD render or premium artwork, the gate MUST check ONLY sufficient token_balance per the resolution stair.",
      },
    },
  },
  zh: {
    header: {
      kicker: "OpenAPI",
      subtitle: "将你的店铺或应用接入 Mockup100。",
      sidebarTitle: "页面导航",
    },
    hero: {
      pill: "掌控你的客户体验",
      title: "把 Mockup100 接入你自己的店铺与产品流程",
      description: "保留你的品牌与结账流程，由 Mockup100 负责模板数据、个性化编辑、渲染以及成品交付。",
      primaryAuthenticated: "打开密钥与接入",
      primaryGuest: "获取 API Keys",
      secondary: "查看接入流程",
      panelLabel: "首个 API 调用",
      copyButton: "复制",
    },
    sections: {
      overview: "概览",
      quickstart: "接入流程",
      playground: "在线调试",
      plugins: "店铺插件",
      errors: "错误码与限流",
      reference: "技术参考",
      billingContract: "计费契约 (HTTP 402)",
      capabilityFlags: "能力标志",
    },
    quickstart: {
      eyebrow: "接入流程",
      title: "最快上线定制商品体验的路径",
      authCards: {
        requestHeader: "请求头",
        baseUrl: "基础地址",
        publicSizes: "公开尺寸",
      },
      securityNote: "不要在浏览器端 JavaScript 中暴露 API Key。你的店铺或应用应先调用你自己的后端，再由后端转发请求到 Mockup100。",
      steps: [
        { id: "01", title: "建立安全访问", description: "创建或获取你的租户 API Key。" },
        { id: "02", title: "加载可售商品", description: "读取可用于商品列表的模板目录。" },
        { id: "03", title: "加载定制数据", description: "获取颜色、视图、可编辑部件、参考素材、输出选项，以及已保存的物理尺寸数据。" },
        { id: "04", title: "加载素材商业能力", description: "当页面包含素材浏览时，读取素材列表、分类、授权状态和购买接口。" },
        { id: "05", title: "渲染客户设计", description: "从你的后端提交选中的颜色、视图以及编辑后的部件图片。" },
        { id: "06", title: "返回最终输出", description: "从任务结果中读取预览与下载链接。" },
      ],
      rules: [
        { title: "稳定标识", copy: "在目录、详情、编辑器、合成和任务轮询全链路中，统一使用 `template_id` 作为主标识。" },
        { title: "推荐链路", copy: "建议使用 `templates` -> `detail` -> `editor` -> `artworks`（可选）-> `editor/compose` -> `results`；不要基于内部 `/runtime/*` 路由构建面向客户的流程。" },
        { title: "定制素材", copy: "使用 `parts[].part_name` 作为可编辑键；优先渲染 `svg_url`，缺失时回退到 `cutout_url`，并仅将 `guide_url` 视为可选且不可编辑的叠加引导层。`template_size` 仍表示像素画布尺寸，真实物理尺寸请读取 `physical_dimensions_cm.parts.<part>.canvas` 与 `bbox`。" },
        { title: "输出交付", copy: "向 compose 仅上传已编辑的 `part_images`，然后直接跟进返回的 `job_status_url`、`job_results_url`、`preview_url`、`download_url` 与 `archive_download_url`。" },
        { title: "素材商业能力", copy: "当你的店铺包含素材浏览器时，请使用同一外部 API 家族下的 `artworks`、`categories/tree`、`licenses` 和 `purchase`，不要混用私有控制台接口。" },
        { title: "兼容性边界", copy: "将 `template_code`、`publish_status`、`tenant_api_status`、`marketplace_status` 以及素材审核元数据等治理字段视为兼容性元数据。面向客户的流程应只由推荐标识、编辑器载荷和渲染结果驱动。" },
        { title: "物理尺寸", copy: "`physical_dimensions_cm` 保存确认后的厘米级真实尺寸。`parts.<part>.canvas` 是预览与 API 消费方使用的已保存图像尺寸，`parts.<part>.bbox` 是产品尺寸，而 `original.dpi` 在可用时返回检测到的源 DPI，否则回退为 `72`。" },
      ],
    },
    plugins: {
      eyebrow: "店铺插件",
      title: "需要更快上线店铺时，使用官方插件",
      wordpress: {
        description: "面向店铺上线的插件，包含商品绑定、素材商业化、预览/设计提交、购物车支持，以及代理官方 Open API 的 WordPress REST BFF。",
        bullets: [
          "将仓库模板或市场模板绑定到 WooCommerce 商品与变体",
          "浏览器先通过聚合工作区路由完成初始化，再加载单独的素材浏览请求",
          "将租户 API Key 保存在 WordPress 服务端，并通过 `wp-json/mockup100/v1/*` 代理浏览器请求",
          "在不暴露 API Key 的前提下，代理模板工作区、素材浏览、授权、购买、预览和加入购物车前准备等流程",
          "客户可通过颜色、视图、上传、文字和图层调整完成商品个性化",
          "结账完成前，最终设计数据会写入购物车与订单项元数据",
        ],
      },
      shopify: {
        description: "提供 OAuth 安装流程、店铺前台设计区块、商品绑定与订单同步转发。",
        bullets: [
          "以 theme app block 的形式让顾客直接在 Shopify 商品页完成设计",
          "客户可通过部件、颜色、视图、上传、文字与实时刷新完成商品个性化",
          "加入购物车前，最终设计数据会写入 Shopify line item properties",
          "订单 webhook 会提取设计详情并转发到平台用于后续履约",
        ],
      },
    },
    reference: {
      eyebrow: "技术参考",
      title: "当工程团队开始实施时，可直接使用这些资料",
      requestExampleTitle: "已验证请求示例",
      resultExampleTitle: "已验证结果示例",
      cards: {
        integrationGuide: {
          title: "集成指南",
          description: "查看已验证的集成契约、计费说明以及失败处理建议，供实施团队参考。",
        },
        wordpressBffFlow: {
          title: "WordPress BFF 流程",
          description: "了解当前 WooCommerce 代理路由、工作区聚合、素材商业流程以及购物车交接契约。",
        },
        openApiJson: {
          title: "OpenAPI JSON",
          description: "可将原始 schema 用于 SDK 生成、测试或内部工具链。",
        },
        swaggerUi: {
          title: "Swagger UI",
          description: "在品牌化 Swagger 包装页中查看完整接口契约。",
        },
      },
    },
    common: {
      version: "版本",
      downloadZip: "下载 ZIP",
      setupEntry: "安装入口",
      copy: "复制",
    },
    playground: {
      eyebrow: "在线调试",
      title: "在浏览器里直接发起一次真实调用",
      description: "选择接口、粘贴原始 API Key,我们会直接请求生产网关。响应不会被服务端保存。",
      endpointLabel: "接口",
      queryLabel: "查询参数",
      bodyLabel: "JSON 请求体",
      run: "发送请求",
      running: "发送中...",
      note: "Key 不会写入服务端日志,浏览器仅在发送时使用一次。",
    },
    errors: {
      eyebrow: "错误码与限流",
      title: "可靠的兜底默认值",
      description: "所有非 2xx 响应均会返回带 `code`、`message`、`request_id` 的 JSON 体。联系支持时请附上 request_id。",
      rateLimitTitle: "限流规则",
      rateLimitBody: "默认每个 Key 每分钟 300 次请求。允许 60 次 / 5 秒的突发。",
      payloadTitle: "载荷限制",
      payloadBody: "单个 part 图片最大 12 MB。整体 compose 载荷最大 60 MB。模板归档(.zip/.tar/.7z/.rar)最大 200 MB。",
      idempotencyTitle: "幂等性",
      idempotencyBody: "对任何会变更状态的 POST 请求,请传 `Idempotency-Key` 请求头。24 小时内重放将返回原响应。",
      webhookSigTitle: "Webhook 签名",
      webhookSigBody: "出站 webhook 投递使用 HMAC-SHA256(secret, `${timestamp}.${rawBody}`) 签名。请在信任 payload 前先校验签名。",
    },
    errorRowsList: [
      { code: "400", severity: "warn", title: "参数无效", body: "必填字段缺失或不符合 schema。", hint: "检查响应中的 `errors[].path`。" },
      { code: "401", severity: "warn", title: "Key 无效或缺失", body: "`x-api-key` 头缺失、格式错误或已被吊销。", hint: "在 /admin/developer-console/keys-access 中轮换。" },
      { code: "403", severity: "warn", title: "权限不足", body: "Key 有效但缺少调用此接口所需的 scope。", hint: "在 keys-access 标签页更新 scope。" },
      { code: "404", severity: "warn", title: "资源不存在", body: "当前租户下找不到对应的模板、素材或任务 ID。", hint: "使用目录接口返回的 `template_id`。" },
      { code: "409", severity: "warn", title: "并发冲突", body: "其它请求修改了同一资源,请刷新后重试。", hint: "先重新拉取资源再重试。" },
      { code: "422", severity: "warn", title: "业务校验失败", body: "请求体语法正确但业务规则拒绝。", hint: "检查 `details` 数组指出的具体规则。" },
      { code: "429", severity: "warn", title: "触发限流", body: "已超过当前 Key 的每分钟配额。", hint: "在重发前遵守 `Retry-After` 头。" },
      { code: "500", severity: "bad", title: "服务端错误", body: "未处理的平台错误,Mockup100 已自动告警。", hint: "联系支持时附上 `request_id`。" },
      { code: "503", severity: "bad", title: "服务不可用", body: "渲染队列拥塞或上游维护中。", hint: "请按指数退避重试,最多 5 次。" },
    ],
    endpointNames: {
      listTemplates: "模板列表",
      templateDetail: "模板详情",
      loadEditorPayload: "加载编辑器载荷",
      listArtworks: "素材列表",
      artworkCategories: "素材分类树",
      artworkLicenses: "素材授权状态",
      purchaseArtwork: "购买素材",
      composePreview: "提交预览合成",
      readJobStatus: "读取任务状态",
      readJobResults: "读取任务结果",
    },
    endpointSummaries: {
      listTemplates: "读取可售模板目录，涵盖已启用 API 的仓库模板和已上架的市场模板。",
      templateDetail: "在打开定制器之前，加载模板元数据、公开输出尺寸、规范编辑器地址和已保存的物理尺寸数据。",
      loadEditorPayload: "加载颜色、视图、可编辑部件、参考素材、默认状态、按视图划分的几何数据以及已保存的物理尺寸数据。",
      listArtworks: "读取当前 API Key 所属租户可见的市场素材或租户素材记录。",
      artworkCategories: "读取外部素材浏览共用的素材分类树。",
      artworkLicenses: "读取当前租户在素材商业化流程中的授权与解锁状态。",
      purchaseArtwork: "在将付费素材插入编辑器前，为当前租户完成解锁。",
      composePreview: "仅提交已编辑的 `part_images`、选中颜色、选中视图和输出尺寸进行渲染。",
      readJobStatus: "轮询当前渲染状态。",
      readJobResults: "读取已完成输出；需要 ZIP 时可直接使用 archive URL。",
    },
    billingContract: {
      eyebrow: "计费契约",
      title: "HTTP 402 — Token 不足时要求充值",
      description: "所有云渲染与付费素材接口在扣费前都会检查调用方的 Token 余额。当余额不足以支撑下一次请求时，API 会返回 HTTP 402 Payment Required，响应体中带有充值地址。前端必须基于响应状态进行闸门拦截；旧版 422 响应已停用。",
      catalogTitle: "定价目录",
      capabilitiesTitle: "用户能力",
      insufficientTitle: "Token 不足响应",
      stairTitle: "分辨率阶梯",
      stairResolution: "分辨率",
      stairCost: "Token 消耗",
      free: "免费",
    },
    capabilityFlags: {
      eyebrow: "能力标志",
      title: "三个独立权限标志独立闸门每个付费功能",
      description: "GET /api/user/capabilities 返回的每个能力仅闸门一条产品线。任何弹窗都禁止跨产品交叉引导。",
      wpPro: {
        body: "WordPress 编辑器中的批量订单导出与团队权限管理。",
        gate: "用户在 WP 编辑器点击批量订单导出或团队管理时，闸门只检查 wp_pro_active === true。",
      },
      grading: {
        body: "Web 控制台与 WordPress 编辑器中的多尺寸放码（Standard $9 / Enterprise $19 每月）。",
        gate: "用户在 Web 控制台或 WordPress 编辑器触发多尺寸放码时，闸门只检查 platform_grading_sub 是否启用。",
      },
      token: {
        body: "高清渲染（>512 px）与付费素材购买。",
        gate: "用户请求高清渲染或付费素材时，闸门只按分辨率阶梯检查 token_balance 是否充足。",
      },
    },
  },
} as const
const text = computed(() => API_PAGE_I18N[currentLocale.value])
const platformBase = computed(() => `${API_BASE || ""}`)
const platformPublicBase = computed(() => {
  if (platformBase.value) {
    try {
      return new URL(platformBase.value).origin
    } catch {
      return platformBase.value.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "")
    }
  }
  if (typeof window === "undefined") return ""
  const url = new URL(window.location.origin)
  if (["5173", "5174", "4173"].includes(url.port)) url.port = "8080"
  return url.origin
})
const openApiPath = computed(() => `${platformPublicBase.value}/api/v1/swagger/index.html`)
const openApiSchemaPath = computed(() => `${platformPublicBase.value}/api/v1/openapi`)
const wooInfoUrl = computed(() => `${platformPublicBase.value}/api/v1/docs/wordpress-plugin`)
const shopifyInfoUrl = computed(() => `${platformPublicBase.value}/api/v1/docs/shopify-plugin`)
const wooDownloadUrl = computed(() => `${platformPublicBase.value}/api/v1/docs/wordpress-plugin/download`)
const shopifyDownloadUrl = computed(() => `${platformPublicBase.value}/api/v1/docs/shopify-plugin/download`)

type PluginInfo = {
  name: string
  filename: string
  version: string
  download_url: string
  install_doc_url: string
  size_bytes: number
  updated_at: string
  available?: boolean
}

const wooPluginInfo = ref<PluginInfo | null>(null)
const shopifyPluginInfo = ref<PluginInfo | null>(null)
const wooInstallDocUrl = computed(() => "/pricing#wp-free")
const shopifyInstallDocUrl = computed(() => shopifyPluginInfo.value?.install_doc_url || "/api#shopify-plugin")

const sections = computed(() => [
  { id: "overview", label: text.value.sections.overview },
  { id: "quickstart", label: text.value.sections.quickstart },
  { id: "playground", label: text.value.sections.playground },
  { id: "plugins", label: text.value.sections.plugins },
  { id: "errors", label: text.value.sections.errors },
  { id: "reference", label: text.value.sections.reference },
  { id: "billing-contract", label: text.value.sections.billingContract },
  { id: "capability-flags", label: text.value.sections.capabilityFlags },
])

const quickSteps = computed(() => text.value.quickstart.steps)
const integrationRules = computed(() => text.value.quickstart.rules)

type EndpointDefinitionKey = keyof typeof API_PAGE_I18N.en.endpointNames

const endpointDefinitions: Array<{
  key: EndpointDefinitionKey
  method: string
  path: string
  fields?: string[]
}> = [
  {
    key: "listTemplates",
    method: "GET",
    path: "/api/v1/external/templates",
    fields: ["template_id", "display_name", "template_source", "cover_url", "runtime_ready", "template_size"],
  },
  {
    key: "templateDetail",
    method: "GET",
    path: "/api/v1/external/templates/{templateId}",
    fields: ["template_id", "display_name", "template_source", "template_size", "template_config", "physical_dimensions_cm", "editor_payload_url", "editor_compose_url"],
  },
  {
    key: "loadEditorPayload",
    method: "GET",
    path: "/api/v1/external/templates/{templateId}/editor",
    fields: ["template_id", "display_name", "template_source", "physical_dimensions_cm", "colors", "views", "parts[].part_name", "parts[].cutout_url", "parts[].guide_url", "parts[].svg_url", "default_view", "default_output_size", "supported_output_sizes", "view_geometry", "editor_compose_url"],
  },
  {
    key: "listArtworks",
    method: "GET",
    path: "/api/v1/external/artworks",
    fields: ["artwork_id", "name", "library_scope", "category_id", "preview_url", "original_url", "commerce_type", "price_tokens", "unlocked", "can_purchase"],
  },
  {
    key: "artworkCategories",
    method: "GET",
    path: "/api/v1/external/artworks/categories/tree",
    fields: ["category_id", "name", "category_path", "children"],
  },
  {
    key: "artworkLicenses",
    method: "GET",
    path: "/api/v1/external/artworks/licenses",
    fields: ["artwork_id", "purchase_status", "license_name", "granted_at"],
  },
  {
    key: "purchaseArtwork",
    method: "POST",
    path: "/api/v1/external/artworks/{artworkId}/purchase",
    fields: ["purchase_id", "artwork_id", "price_tokens", "buyer_remaining_tokens", "already_owned", "status", "granted_at"],
  },
  {
    key: "composePreview",
    method: "POST",
    path: "/api/v1/external/runtime/editor/compose",
    fields: ["template_id", "selected_color", "selected_view", "output_size", "compose_overrides", "part_names", "part_images", "job_id", "job_status_url", "job_results_url", "tokens_charged"],
  },
  {
    key: "readJobStatus",
    method: "GET",
    path: "/api/v1/external/runtime/jobs/{jobId}",
    fields: ["job_id", "status", "preview_url", "download_url", "job_results_url", "created_at", "updated_at"],
  },
  {
    key: "readJobResults",
    method: "GET",
    path: "/api/v1/external/runtime/jobs/{jobId}/results",
    fields: ["status", "output_count", "outputs", "selected_color", "selected_view", "preview_url", "download_url", "archive_download_url"],
  },
]
const endpoints = computed(() => endpointDefinitions.map((endpoint) => ({
  ...endpoint,
  name: text.value.endpointNames[endpoint.key],
  summary: text.value.endpointSummaries[endpoint.key],
})))

const errorRows = computed(() => text.value.errorRowsList)

type SdkLang = "curl" | "node" | "python" | "php"
const sdkLangs: Array<{ id: SdkLang; label: string }> = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
]
const sdkLangActive = ref<Record<string, SdkLang>>({})
function setSdkLang(path: string, lang: SdkLang) {
  sdkLangActive.value = { ...sdkLangActive.value, [path]: lang }
}

function endpointFullPath(path: string) {
  return `${platformPublicBase.value}${path}`.replace(/\{[^}]+\}/g, (m) => m.replace(/[{}]/g, ""))
}

function sampleQueryFor(method: string, path: string) {
  if (method === "GET" && path === "/api/v1/external/templates") return "?limit=5"
  if (method === "GET" && path === "/api/v1/external/artworks") return "?limit=5"
  return ""
}

function sampleBodyFor(method: string, path: string) {
  if (method !== "POST") return ""
  if (path === "/api/v1/external/runtime/editor/compose") {
    return JSON.stringify({ template_id: "tpl_xxx", selected_color: "black", selected_view: "001", output_size: "1024x1024" }, null, 2)
  }
  if (path.endsWith("/purchase")) return JSON.stringify({ confirm: true }, null, 2)
  return JSON.stringify({}, null, 2)
}

function sdkSnippet(ep: { method: string; path: string }) {
  const lang = sdkLangActive.value[ep.path] || "curl"
  const url = `${endpointFullPath(ep.path)}${sampleQueryFor(ep.method, ep.path)}`
  const bodySample = sampleBodyFor(ep.method, ep.path)
  if (lang === "curl") {
    if (ep.method === "GET") {
      return `curl -X GET "${url}" \\\n  -H "x-api-key: mkp_your_real_key"`
    }
    return `curl -X ${ep.method} "${url}" \\\n  -H "x-api-key: mkp_your_real_key" \\\n  -H "Content-Type: application/json" \\\n  -d '${bodySample.replace(/\n/g, " ")}'`
  }
  if (lang === "node") {
    if (ep.method === "GET") {
      return `const r = await fetch("${url}", {\n  headers: { "x-api-key": process.env.MOCKUP100_KEY }\n});\nconsole.log(await r.json());`
    }
    return `const r = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: {\n    "x-api-key": process.env.MOCKUP100_KEY,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${bodySample})\n});\nconsole.log(await r.json());`
  }
  if (lang === "python") {
    if (ep.method === "GET") {
      return `import os, requests\nr = requests.get("${url}", headers={"x-api-key": os.environ["MOCKUP100_KEY"]})\nprint(r.json())`
    }
    return `import os, requests\nr = requests.${ep.method.toLowerCase()}(\n  "${url}",\n  headers={"x-api-key": os.environ["MOCKUP100_KEY"], "Content-Type": "application/json"},\n  json=${bodySample}\n)\nprint(r.json())`
  }
  // php
  if (ep.method === "GET") {
    return `<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["x-api-key: " . getenv("MOCKUP100_KEY")]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\necho curl_exec($ch);`
  }
  return `<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${ep.method}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n  "x-api-key: " . getenv("MOCKUP100_KEY"),\n  "Content-Type: application/json"\n]);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${bodySample.replace(/\n/g, " ")}));\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\necho curl_exec($ch);`
}

function copySdkSnippet(ep: { method: string; path: string }) {
  navigator.clipboard.writeText(sdkSnippet(ep)).catch(() => {})
}

const playgroundEndpoint = ref<string>("/api/v1/external/templates")
const playgroundKey = ref("")
const playgroundQuery = ref("limit=5")
const playgroundBody = ref("")
const playgroundResponse = ref("")
const playgroundLatency = ref<number | null>(null)
const playgroundStatus = ref<number | null>(null)
const playgroundRunning = ref(false)
const playgroundEndpointDef = computed(() => endpointDefinitions.find((e) => e.path === playgroundEndpoint.value))
const playgroundShouldShowQuery = computed(() => (playgroundEndpointDef.value?.method || "GET") === "GET")
const playgroundShouldShowBody = computed(() => (playgroundEndpointDef.value?.method || "GET") !== "GET")

async function runPlayground() {
  if (!playgroundKey.value) return
  playgroundRunning.value = true
  playgroundResponse.value = ""
  playgroundLatency.value = null
  playgroundStatus.value = null
  const def = playgroundEndpointDef.value
  if (!def) {
    playgroundRunning.value = false
    return
  }
  // 同源调用：避免裸 fetch 跨域时被 CORS 拦截。
  // 生产 nginx 会把 /api/v1/external/* 反代到 Java 网关；
  // 当页面与网关不同源（本地预览 / 自建私有部署）时自动回退到 platformPublicBase。
  const sameOriginBase = typeof window !== "undefined" ? window.location.origin : ""
  const baseUrl = sameOriginBase || platformPublicBase.value
  const url = `${baseUrl}${def.path.replace(/\{[^}]+\}/g, (m) => m.replace(/[{}]/g, ""))}${def.method === "GET" && playgroundQuery.value ? "?" + playgroundQuery.value.replace(/^\?/, "") : ""}`
  const start = performance.now()
  try {
    const init: RequestInit = {
      method: def.method,
      headers: { "x-api-key": playgroundKey.value, Accept: "application/json" },
    }
    if (def.method !== "GET" && playgroundBody.value.trim()) {
      ;(init.headers as Record<string, string>)["Content-Type"] = "application/json"
      init.body = playgroundBody.value
    }
    const response = await fetch(url, init)
    playgroundLatency.value = Math.round(performance.now() - start)
    playgroundStatus.value = response.status
    const responseText = await response.text()
    try {
      playgroundResponse.value = JSON.stringify(JSON.parse(responseText), null, 2)
    } catch {
      playgroundResponse.value = responseText
    }
  } catch (error) {
    playgroundLatency.value = Math.round(performance.now() - start)
    playgroundStatus.value = 0
    const message = String((error as Error).message || error)
    // CORS / 网络错误时给出可执行提示，避免用户以为 key 错
    playgroundResponse.value = `${message}\n\n// Hint: if this is a cross-origin error, try running this request from your server (curl/Node) instead. The Try-it console only works when the page and gateway share an origin.`
  } finally {
    playgroundRunning.value = false
  }
}

async function loadPluginMeta() {
  try {
    const woo = await fetch(wooInfoUrl.value)
    if (woo.ok) wooPluginInfo.value = await woo.json()
  } catch (_) {}
  try {
    const shopify = await fetch(shopifyInfoUrl.value)
    if (shopify.ok) {
      shopifyPluginInfo.value = await shopify.json()
    } else {
      shopifyPluginInfo.value = { available: false } as PluginInfo
    }
  } catch (_) {
    shopifyPluginInfo.value = { available: false } as PluginInfo
  }
}

function formatSize(bytes: number) {
  const kb = bytes / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`
}

const activeSection = ref("overview")

function updateActiveSection() {
  const fromHash = window.location.hash.replace("#", "")
  if (fromHash && sections.value.some((section) => section.id === fromHash)) {
    activeSection.value = fromHash
  }

  let current = "overview"
  for (const section of sections.value) {
    const element = document.getElementById(section.id)
    if (!element) continue
    const top = element.getBoundingClientRect().top
    if (top <= 140) current = section.id
  }
  activeSection.value = current
}

function scrollToSection(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  window.history.replaceState(null, "", `#${id}`)
  element.scrollIntoView({ behavior: "smooth", block: "start" })
  activeSection.value = id
}

function focusWordPressPluginDownload() {
  if (window.location.hash !== "#plugins") return
  const element = document.getElementById("wordpress-plugin-download")
  if (!element) return
  element.scrollIntoView({ behavior: "smooth", block: "center" })
  element.focus({ preventScroll: true })
}

function handleHashChange() {
  updateActiveSection()
  window.setTimeout(focusWordPressPluginDownload, 0)
}

function openDeveloperConsole() {
  if (isAuthenticated.value) {
    router.push("/admin/developer-console/keys-access")
    return
  }
  router.push({ path: "/auth", query: { mode: "login", redirect: "/admin/developer-console/keys-access" } })
}

const webhookSigSnippet = `// Node.js verification example
const crypto = require("crypto")
function verify(rawBody, headers, secret) {
  const ts = headers["x-mockup100-timestamp"]
  const sig = (headers["x-mockup100-signature"] || "").replace(/^sha256=/, "")
  const expected = crypto.createHmac("sha256", secret).update(\`\${ts}.\${rawBody}\`).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}`

function copyCurl() {
  const text = `curl -X GET "${platformPublicBase.value}/api/v1/external/templates" -H "x-api-key: mkp_your_real_key"`
  navigator.clipboard.writeText(text).catch(() => {})
}

onMounted(() => {
  loadPluginMeta()
  updateActiveSection()
  window.setTimeout(focusWordPressPluginDownload, 0)
  window.addEventListener("scroll", updateActiveSection, { passive: true })
  window.addEventListener("hashchange", handleHashChange)
})

onUnmounted(() => {
  window.removeEventListener("scroll", updateActiveSection)
  window.removeEventListener("hashchange", handleHashChange)
})
</script>

<style scoped>
.api-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.18), transparent 26%),
    linear-gradient(180deg, #eef2ff 0%, #f8fafc 24%, #ffffff 100%);
  color: #0f172a;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.82);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.header-inner,
.page-body,
.footer-inner {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
}

.header-inner {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.header-copy p {
  margin: 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.45;
}

.header-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.7rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.mobile-nav {
  display: none;
}

.nav-chip {
  min-height: 38px;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.72);
  color: #475569;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-chip:hover,
.nav-chip.active {
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.page-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-layout {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 1.25rem 0 3.5rem;
  display: grid;
  grid-template-columns: minmax(188px, 220px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.page-sidebar {
  position: sticky;
  top: 94px;
  min-width: 0;
}

.sidebar-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
  padding: 1rem;
}

.sidebar-title {
  margin: 0 0 0.75rem;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sidebar-link {
  min-height: 42px;
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 0.92rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4338ca;
}

.section-anchor {
  scroll-margin-top: 110px;
}

.hero-section,
.content-section {
  border: 1px solid #e2e8f0;
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.07);
  overflow: hidden;
}

.hero-section {
  background: linear-gradient(135deg, #312e81 0%, #4338ca 38%, #7c3aed 100%);
  color: #fff;
}

.hero-grid {
  padding: 2rem 2.1rem;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1.15rem;
  align-items: stretch;
}

.hero-pill,
.eyebrow,
.panel-label,
.footer-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 0.85rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-pill {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.hero-copy h1 {
  margin: 0.85rem 0 0.9rem;
  font-size: clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1.04;
  letter-spacing: -0.04em;
}

.hero-desc {
  max-width: 42rem;
  font-size: 0.98rem;
  line-height: 1.68;
  color: rgba(255, 255, 255, 0.84);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.step-card,
.auth-card,
.example-card,
.reference-card {
  border-radius: 22px;
  border: 1px solid #e2e8f0;
}

.hero-panel {
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.panel-label {
  background: rgba(255, 255, 255, 0.12);
}

.copy-btn {
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.content-section {
  background: rgba(255, 255, 255, 0.92);
  padding: 1.65rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.eyebrow,
.footer-kicker {
  background: #eef2ff;
  color: #4f46e5;
}

.section-head h2,
.footer-copy h2 {
  margin: 0.55rem 0 0;
  font-size: 1.6rem;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.section-desc,
.footer-copy p {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
  max-width: 40rem;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}

.step-card,
.auth-card,
.example-card,
.reference-card {
  background: #fff;
  padding: 1.2rem;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.04);
}

.compact-steps {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.step-number {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 0.84rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.step-card h3,
.auth-card h3,
.example-card h3 {
  margin: 0 0 0.65rem;
  font-size: 1rem;
  color: #0f172a;
}

.step-card p,
.auth-card p,
.reference-card span {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.auth-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.mini-code,
.code-block {
  margin: 0;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  overflow-x: auto;
  background: #0f172a;
  color: #e2e8f0;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.84rem;
  line-height: 1.7;
}

.code-comment {
  color: #64748b;
}

.code-string {
  color: #86efac;
}

.security-note {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 18px;
  padding: 1rem 1.1rem;
  color: #4338ca;
  line-height: 1.65;
  font-weight: 600;
}

.security-note svg {
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.quick-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.rule-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 1rem 1.1rem;
}

.rule-card strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #0f172a;
}

.rule-card span {
  display: block;
  color: #64748b;
  line-height: 1.6;
}

.endpoint-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  overflow: hidden;
}

.endpoint-row {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 1rem;
  padding: 1.1rem 1.2rem;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
  align-items: start;
}

.endpoint-row:last-child {
  border-bottom: none;
}

.ep-left {
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem;
  min-width: 0;
}

.ep-method {
  min-width: 56px;
  text-align: center;
  padding: 0.28rem 0.55rem;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  font-family: "JetBrains Mono", "Fira Code", monospace;
}

.method-get {
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.method-post {
  background: #dbeafe;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
}

.ep-path {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  color: #334155;
  font-size: 0.83rem;
  font-family: "JetBrains Mono", "Fira Code", monospace;
}

.ep-right {
  min-width: 0;
}

.ep-right h4 {
  margin: 0 0 0.35rem;
  color: #0f172a;
}

.ep-right p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.field-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.85rem;
}

.field-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.7rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 700;
  font-family: "JetBrains Mono", "Fira Code", monospace;
}

.example-grid,
.reference-grid,
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.bullet-list {
  margin: 0;
  padding-left: 1.15rem;
  color: #64748b;
  line-height: 1.8;
}

.launch-bullets {
  margin-top: 0.85rem;
  color: #475569;
}

.reference-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  text-decoration: none;
  color: inherit;
  background: #f8fafc;
  border-color: #e5e7eb;
  box-shadow: none;
}

.reference-card strong {
  color: #0f172a;
}

.reference-card:hover {
  border-color: #c7d2fe;
  background: #f5f7ff;
}

.plugin-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.plugin-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  padding: 1.35rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.plugin-card::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8));
}

.plugin-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
}

.plugin-head {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
}

.plugin-head h3 {
  margin: 0 0 0.4rem;
  color: #0f172a;
}

.plugin-head p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.plugin-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 900;
  flex-shrink: 0;
}

.plugin-badge.wordpress {
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
}

.plugin-badge.shopify {
  background: linear-gradient(135deg, #16a34a 0%, #65a30d 100%);
}

.plugin-badge.grading {
  background: linear-gradient(135deg, #ea580c 0%, #f59e0b 100%);
}

.plugin-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.plugin-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #dbe4f0;
  color: #334155;
  font-size: 0.76rem;
  font-weight: 700;
}

.plugin-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Plan v3 §S2.6：API 介绍页 grading 卡 30 天免费试用披露样式。 */
.plugin-trial-note {
  margin: 0.4rem 0 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #047857;
}
/* Plan v5 §C.5：trial 倒计时 chip。 */
.plugin-trial-chip {
  display: inline-block;
  margin: 0.5rem 0 0;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
  color: #047857;
  font-size: 0.8125rem;
  font-weight: 700;
}

.plugin-footnote {
  margin: 0;
  color: #475569;
  line-height: 1.65;
  font-size: 0.88rem;
}

.page-footer {
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  margin-top: 1rem;
}

.footer-inner {
  padding: 3rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.footer-copy h2,
.footer-copy p,
.footer-kicker {
  color: #fff;
}

.footer-kicker {
  background: rgba(255, 255, 255, 0.12);
}

.footer-copy p {
  max-width: 40rem;
  color: rgba(255, 255, 255, 0.72);
}

.footer-actions {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.btn {
  min-height: 44px;
  padding: 0 1.15rem;
  border-radius: 14px;
  border: 0;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow: 0 14px 30px rgba(99, 102, 241, 0.24);
}

.btn-secondary {
  background: #fff;
  color: #4f46e5;
  border: 1px solid #d6d3ff;
}

.btn-small {
  min-height: 38px;
  font-size: 0.82rem;
}

.footer-btn {
  background: transparent;
  color: #fff;
  border-color: rgba(255, 255, 255, 0.22);
}

@media (max-width: 1080px) {
  .header-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .mobile-nav {
    display: flex;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 0.15rem;
  }

  .page-layout {
    width: min(1180px, calc(100% - 32px));
    grid-template-columns: 1fr;
  }

  .page-sidebar {
    display: none;
  }

  .hero-grid,
  .steps-grid,
  .auth-grid,
  .quick-rules,
  .example-grid,
  .reference-grid,
  .plugin-grid {
    grid-template-columns: 1fr;
  }

  .compact-steps {
    grid-template-columns: 1fr;
  }

  .section-head,
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .endpoint-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .header-inner,
  .page-layout,
  .footer-inner {
    width: min(100%, calc(100% - 24px));
  }

  .hero-grid,
  .content-section {
    padding: 1.2rem;
  }

  .hero-copy h1 {
    font-size: 2rem;
  }

  .header-actions,
  .hero-actions,
  .footer-actions {
    width: 100%;
  }

  .btn {
    width: 100%;
  }
}

.section-desc {
  margin: 0.4rem 0 0;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.55;
}

/* SDK tabs (inline inside endpoint card) */
.sdk-tabs {
  margin-top: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  overflow: hidden;
  background: #0f172a;
}

.sdk-tab-bar {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.sdk-tab-btn {
  padding: 0.3rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  background: transparent;
  color: #cbd5e1;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.sdk-tab-btn.active {
  background: #6366f1;
  color: #fff;
}

.sdk-copy {
  margin-left: auto;
  padding: 0.3rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid #475569;
  background: transparent;
  color: #e2e8f0;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.sdk-tabs .mini-code {
  margin: 0;
  border-radius: 0;
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.85rem 1rem;
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre;
  overflow-x: auto;
}

/* Playground */
.playground-card {
  margin-top: 1.1rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
}

.playground-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.playground-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.playground-input,
.playground-textarea {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.88rem;
  font-family: inherit;
  background: #f8fafc;
  color: #0f172a;
}

.playground-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  resize: vertical;
}

.playground-actions {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  flex-wrap: wrap;
}

.playground-meta {
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
  padding: 0.25rem 0.55rem;
  border-radius: 0.4rem;
  background: #eef2ff;
}

.playground-meta.meta-ok {
  background: #dcfce7;
  color: #166534;
}

.playground-meta.meta-bad {
  background: #fee2e2;
  color: #b91c1c;
}

.playground-response {
  margin: 0;
  max-height: 320px;
  overflow: auto;
}

.playground-note {
  margin: 0;
  font-size: 0.78rem;
  color: #94a3b8;
}

/* Errors & limits */
.errors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.85rem;
}

.error-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.95rem 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
}

.error-card-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.error-code {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.55rem;
  border-radius: 0.4rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.error-code-warn {
  background: #fef3c7;
  color: #92400e;
}

.error-code-bad {
  background: #fee2e2;
  color: #b91c1c;
}

.error-card p {
  margin: 0;
  color: #475569;
  font-size: 0.86rem;
  line-height: 1.5;
}

.error-hint {
  font-size: 0.78rem;
  color: #1d4ed8;
  background: #eef2ff;
  padding: 0.35rem 0.5rem;
  border-radius: 0.4rem;
}

.limits-grid {
  margin-top: 1.1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.85rem;
}

.limit-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(255, 255, 255, 1));
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.limit-card strong {
  font-size: 0.95rem;
  color: #0f172a;
}

.limit-card p {
  margin: 0;
  color: #475569;
  font-size: 0.86rem;
  line-height: 1.5;
}

.limit-card--wide {
  grid-column: 1 / -1;
}

.ratecard-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.92rem;
}
.ratecard-table th,
.ratecard-table td {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  text-align: left;
}
.ratecard-table th {
  background: #f8fafc;
  color: #0f172a;
  font-weight: 600;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.capability-card {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.capability-card h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}
.capability-card .capability-gate {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #475569;
}
</style>
