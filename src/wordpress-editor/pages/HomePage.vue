<template>
  <div class="home-page">
    <div class="home-hero-wrap">
      <section class="hero-section">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              {{ homeText.hero.titlePrefix }}<span class="hero-highlight">{{ homeText.hero.titleHighlight1 }}</span>{{ homeText.hero.titleMid }}<span class="hero-highlight">{{ homeText.hero.titleHighlight2 }}</span>{{ homeText.hero.titleSuffix }}
            </h1>
            <h2 class="hero-subtitle">
              {{ homeText.hero.subtitle }}
            </h2>
            <div class="hero-actions">
              <RouterLink to="/api" class="btn-primary btn-large">
                {{ homeText.hero.ctaPrimary }}
              </RouterLink>
              <RouterLink to="/admin/repository" class="btn-secondary btn-large">
                {{ homeText.hero.ctaSecondary }}
              </RouterLink>
            </div>
            <div class="hero-features">
              <div class="hero-feature">
                <svg class="hero-feature-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{{ homeText.hero.feature1 }}</span>
              </div>
              <div class="hero-feature">
                <svg class="hero-feature-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{{ homeText.hero.feature2 }}</span>
              </div>
              <div class="hero-feature">
                <svg class="hero-feature-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>{{ homeText.hero.feature3 }}</span>
              </div>
            </div>
          </div>
          <div v-if="heroBannerSlides.length > 0" class="hero-image">
            <div class="hero-carousel">
              <div
                v-for="(slide, idx) in heroBannerSlides"
                :key="`hero-slide-${idx}`"
                class="hero-carousel-slide"
                :class="{ active: idx === heroBannerIndex }"
              >
                <img :src="slide" alt="mockup100 Dashboard" />
              </div>
              <div v-if="heroBannerSlides.length > 1" class="hero-carousel-dots">
                <button
                  v-for="(_, idx) in heroBannerSlides"
                  :key="`hero-dot-${idx}`"
                  type="button"
                  class="hero-carousel-dot"
                  :class="{ active: idx === heroBannerIndex }"
                  :aria-label="`Show slide ${idx + 1}`"
                  @click="setHeroBannerIndex(idx)"
                ></button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Source of Truth: spec consolidate-pod-editor-four-product-matrix §6 「四类标准用户功能组合场景」.
         Four-product Snapshot uses pricingCatalog so prices stay in sync with /api/pricing/catalog. -->
    <section class="snapshot-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">{{ homeText.snapshot.kicker }}</span>
          <h2>{{ homeText.snapshot.title }}</h2>
          <p>{{ homeText.snapshot.subtitle }}</p>
        </div>
        <div class="snapshot-grid">
          <article
            v-for="product in productSnapshots"
            :key="product.key"
            class="snapshot-card"
            :class="`snapshot-card--${product.key}`"
          >
            <span class="snapshot-kicker">{{ product.kicker }}</span>
            <h3 class="snapshot-title">{{ product.title }}</h3>
            <p class="snapshot-subtitle">{{ product.subtitle }}</p>
            <div class="snapshot-price-block">
              <span class="snapshot-price">{{ product.price }}</span>
              <span class="snapshot-price-suffix">{{ product.priceSuffix }}</span>
            </div>
            <RouterLink :to="product.ctaTo" class="snapshot-cta">{{ product.ctaLabel }}</RouterLink>
            <!-- Plan v3 §S2.5：grading 卡片附加 30 天 trial 文案与 CTA。 -->
            <p v-if="product.trialNote" class="snapshot-trial-note">{{ product.trialNote }}</p>
            <RouterLink
              v-if="product.trialCtaTo && product.trialCtaLabel"
              :to="product.trialCtaTo"
              class="snapshot-trial-cta"
              data-testid="home-grading-trial-cta"
            >
              {{ product.trialCtaLabel }}
            </RouterLink>
          </article>
        </div>
        <div class="snapshot-actions">
          <RouterLink to="/pricing" class="snapshot-action snapshot-action--primary">
            {{ homeText.snapshot.seeFullPricing }}
          </RouterLink>
          <RouterLink to="/api" class="snapshot-action snapshot-action--secondary">
            {{ homeText.snapshot.exploreApi }}
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="platform-section">
      <div class="section-container">
        <div class="platform-content">
          <div class="platform-left">
            <h2>{{ homeText.platform.title }}</h2>
          </div>
          <div class="platform-right">
            <div class="platform-tags-wrapper">
              <div class="platform-tag" data-platform="Shopify" title="Shopify">
                <img src="/images/shopify.png" alt="Shopify">
              </div>
              <div class="platform-tag" data-platform="Etsy" title="Etsy">
                <img src="/images/etsy.png" alt="Etsy">
              </div>
              <div class="platform-tag" data-platform="WooCommerce" title="WooCommerce">
                <img src="/images/woo.png" alt="WooCommerce">
              </div>
              <div class="platform-tag" data-platform="WordPress" title="WordPress">
                <img src="/images/wordpress.svg" alt="WordPress">
              </div>
              <div class="platform-tag" data-platform="BigCommerce" title="BigCommerce">
                <img src="/images/bigcommerce.png" alt="BigCommerce">
              </div>
              <div class="platform-tag" data-platform="TikTok Shop" title="TikTok Shop">
                <img src="/images/tiktok.png" alt="TikTok Shop">
              </div>
              <div class="platform-tag platform-tag-more" data-platform="More platforms" title="More platforms">
                ...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="template-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">{{ homeText.templates.kicker }}</span>
          <h2>{{ homeText.templates.title }}</h2>
          <p>{{ homeText.templates.subtitle }}</p>
        </div>
        <div class="gallery-filters">
          <div class="gallery-filters-left">
            <CategoryCascadeSelector
              v-model="selectedCategoryId"
              :categories="galleryCategories"
              clear-value="all"
              :allow-non-leaf="true"
              :show-clear-button="false"
              :show-recent-options="false"
              :show-selection-summary="false"
              level1-placeholder="All Categories"
              level2-placeholder="Select Level 2"
              level3-placeholder="Select Level 3"
              @change="handleCategoryChange"
            />
          </div>
          <div class="gallery-filters-right">
            <FilterDropdown
              v-model="selectedApiStatus"
              :options="listingApiStatusOptions"
            />
            <div class="gallery-search-wrapper">
              <span class="gallery-search-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                v-model="gallerySearch"
                class="gallery-search-input"
                placeholder="Search template name, code, or category"
              />
            </div>
          </div>
        </div>
        <div v-if="galleryError" class="gallery-error">{{ galleryError }}</div>
        <div v-else-if="galleryLoading" class="gallery-loading">Loading templates…</div>
        <div v-else-if="paginatedGallery.length" class="feature-grid feature-grid--templates">
          <article
            v-for="item in paginatedGallery"
            :key="item.listing_id || item.template_id"
            class="feature-card feature-card--template"
          >
            <RouterLink
              class="feature-card-media feature-card-media--clickable"
              :to="resolveTemplatePreviewLink(item)"
              tabindex="0"
              :aria-label="`Open preview for ${item.title || item.template_id}`"
              @mouseenter="setHoveredHomeCard(createTemplateHoverDetail(item), $event)"
              @mouseleave="clearHoveredHomeCard"
              @focusin="setHoveredHomeCard(createTemplateHoverDetail(item), $event)"
              @focusout="clearHoveredHomeCard"
            >
              <img
                v-if="resolveGalleryCoverUrl(item)"
                :src="resolveGalleryCoverUrl(item)"
                :alt="item.title || item.template_id"
              />
              <div v-else class="feature-card-placeholder">
                {{ resolveCardInitial(item.title || item.template_id) }}
              </div>
            </RouterLink>
            <div class="feature-card-body">
              <div class="feature-card-top">
                <h3>{{ item.title || item.template_id }}</h3>
                <span class="feature-card-badge info">{{ resolveTemplateAccessLabel(item) }}</span>
              </div>
              <div class="feature-card-meta">
                <span v-if="item.template_code">{{ item.template_code }}</span>
                <span v-if="formatMarketplaceCreatorName(item.creator_name)">By {{ formatMarketplaceCreatorName(item.creator_name) }}</span>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="gallery-empty">No public templates are listed right now.</div>
        <div v-if="!galleryLoading && !galleryError && filteredGallery.length" class="pagination-bar">
          <span class="pagination-summary">{{ resolvePageSummary(galleryPage, TEMPLATE_PAGE_SIZE, filteredGallery.length) }}</span>
          <div class="pagination-actions">
            <button type="button" class="pagination-btn" :disabled="galleryPage <= 1" @click="setGalleryPage(galleryPage - 1)">Previous</button>
            <span class="pagination-status">Page {{ galleryPage }} / {{ galleryTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="galleryPage >= galleryTotalPages" @click="setGalleryPage(galleryPage + 1)">Next</button>
          </div>
        </div>
      </div>
    </section>

    <section class="artwork-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">{{ homeText.artwork.kicker }}</span>
          <h2>{{ homeText.artwork.title }}</h2>
          <p>{{ homeText.artwork.subtitle }}</p>
        </div>
        <div class="artwork-filters">
          <div class="gallery-filters-left">
            <CategoryCascadeSelector
              v-model="selectedArtworkCategoryId"
              :categories="artworkCategories"
              clear-value="all"
              :allow-non-leaf="true"
              :show-clear-button="false"
              :show-recent-options="false"
              :show-selection-summary="false"
              level1-placeholder="All Categories"
              level2-placeholder="Select Level 2"
              level3-placeholder="Select Level 3"
            />
          </div>
          <div class="gallery-filters-right">
            <div class="gallery-search-wrapper">
              <span class="gallery-search-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                v-model="artworkSearch"
                class="gallery-search-input"
                placeholder="Search artwork name, code, creator, or category"
              />
            </div>
          </div>
        </div>
        <div v-if="artworkError" class="gallery-error">{{ artworkError }}</div>
        <div v-else-if="artworkLoading" class="gallery-loading">Loading artwork…</div>
        <div v-else-if="paginatedArtworkGallery.length" class="feature-grid feature-grid--artwork">
          <article
            v-for="item in paginatedArtworkGallery"
            :key="item.artwork_id"
            class="feature-card feature-card--artwork"
          >
            <button
              type="button"
              class="feature-card-media feature-card-media--square feature-card-media--clickable"
              :aria-label="`Open preview for ${item.name}`"
              @click="openArtworkPreview(item)"
              @mouseenter="setHoveredHomeCard(createArtworkHoverDetail(item), $event)"
              @mouseleave="clearHoveredHomeCard"
              @focusin="setHoveredHomeCard(createArtworkHoverDetail(item), $event)"
              @focusout="clearHoveredHomeCard"
            >
              <img
                v-if="resolveArtworkCoverUrl(item)"
                :src="resolveArtworkCoverUrl(item)"
                :alt="item.name"
              />
              <div v-else class="feature-card-placeholder">
                {{ resolveCardInitial(item.name) }}
              </div>
            </button>
            <div class="feature-card-body">
              <div class="feature-card-top">
                <h3>{{ item.name }}</h3>
                <span class="feature-card-badge" :class="{ paid: item.commerce_type === 'paid' }">
                  {{ item.commerce_type === "paid" ? "Paid" : "Free" }}
                </span>
              </div>
              <div class="feature-card-meta">
                <span v-if="formatMarketplaceCreatorName(item.creator_name)">By {{ formatMarketplaceCreatorName(item.creator_name) }}</span>
                <span v-if="item.commerce_type === 'paid'">{{ resolveArtworkPriceLabel(item) }}</span>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="gallery-empty">No listed artwork is live right now.</div>
        <div v-if="!artworkLoading && !artworkError && filteredArtworkGallery.length" class="pagination-bar">
          <span class="pagination-summary">{{ resolvePageSummary(artworkPage, ARTWORK_PAGE_SIZE, filteredArtworkGallery.length) }}</span>
          <div class="pagination-actions">
            <button type="button" class="pagination-btn" :disabled="artworkPage <= 1" @click="setArtworkPage(artworkPage - 1)">Previous</button>
            <span class="pagination-status">Page {{ artworkPage }} / {{ artworkTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="artworkPage >= artworkTotalPages" @click="setArtworkPage(artworkPage + 1)">Next</button>
          </div>
        </div>
      </div>
    </section>

    <section class="storefront-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">{{ homeText.storefront.kicker }}</span>
          <h2>{{ homeText.storefront.title }}</h2>
          <p>{{ homeText.storefront.subtitle }}</p>
        </div>
        <div v-if="storefrontError" class="gallery-error">{{ storefrontError }}</div>
        <div v-else-if="storefrontLoading" class="gallery-loading">Loading storefronts…</div>
        <div v-else-if="paginatedStorefronts.length" class="feature-grid feature-grid--storefronts">
          <RouterLink
            v-for="store in paginatedStorefronts"
            :key="store.tenant_id"
            :to="`/store/${store.store_slug}`"
            class="feature-card feature-card--storefront feature-card--storefront-link"
          >
            <div class="feature-card-media">
              <img
                v-if="resolveStorefrontCoverUrl(store)"
                :src="resolveStorefrontCoverUrl(store)"
                :alt="store.store_name || store.store_slug || store.tenant_id"
              />
              <div v-else class="feature-card-placeholder">
                {{ resolveCardInitial(store.store_name || store.store_slug || "S") }}
              </div>
            </div>
            <div class="feature-card-body">
              <div class="feature-card-top">
                <h3>{{ store.store_name || store.store_slug || "Tenant Store" }}</h3>
                <span class="feature-card-badge success">Featured Store</span>
              </div>
              <p class="feature-card-subtitle">{{ resolveStorefrontSubtitle(store) }}</p>
              <div class="feature-card-meta">
                <span>{{ store.template_count || 0 }} templates</span>
                <span>{{ store.artwork_count || 0 }} artwork</span>
                <span>{{ resolveStorefrontUpdatedLabel(store) }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
        <div v-else class="gallery-empty">No featured storefronts are live right now.</div>
        <div v-if="!storefrontLoading && !storefrontError && storefrontItems.length" class="pagination-bar">
          <span class="pagination-summary">{{ resolvePageSummary(storefrontPage, STOREFRONT_PAGE_SIZE, storefrontItems.length) }}</span>
          <div class="pagination-actions">
            <button type="button" class="pagination-btn" :disabled="storefrontPage <= 1" @click="setStorefrontPage(storefrontPage - 1)">Previous</button>
            <span class="pagination-status">Page {{ storefrontPage }} / {{ storefrontTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="storefrontPage >= storefrontTotalPages" @click="setStorefrontPage(storefrontPage + 1)">Next</button>
          </div>
        </div>
      </div>
    </section>

    <section class="three-step-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">{{ homeText.steps.kicker }}</span>
          <h2>{{ homeText.steps.title }}</h2>
          <p>{{ homeText.steps.subtitle }}</p>
        </div>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-header">
              <span class="step-number">01</span>
              <div class="step-divider"></div>
            </div>
            <div class="step-content">
              <div class="step-title-wrapper">
                <svg class="step-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <h3>Connect</h3>
              </div>
              <p class="step-description">Get an <strong>API key</strong> in the developer console, or install the <strong>Shopify / WordPress</strong> app in minutes.</p>
              <p class="step-tip">Tip: pick API for full control, or apps for zero-code launch.</p>
              <div class="step-tags">
                <span class="step-tag">API key</span>
                <span class="step-tag">Webhook</span>
                <span class="step-tag">OAuth</span>
              </div>
            </div>
          </div>
          <div class="step-card">
            <div class="step-header">
              <span class="step-number">02</span>
              <div class="step-divider"></div>
            </div>
            <div class="step-content">
              <div class="step-title-wrapper">
                <svg class="step-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
                </svg>
                <h3>List</h3>
              </div>
              <p class="step-description">Pick <strong>templates + artwork</strong>, push them to your storefront with one click. Multi-tenant ready.</p>
              <p class="step-tip">Customize pricing, branding, and SKU mapping per channel.</p>
              <div class="step-tags">
                <span class="step-tag">Templates + Artwork</span>
                <span class="step-tag">1-click sync</span>
                <span class="step-tag">Multi-tenant</span>
              </div>
            </div>
          </div>
          <div class="step-card">
            <div class="step-header">
              <span class="step-number">03</span>
              <div class="step-divider"></div>
            </div>
            <div class="step-content">
              <div class="step-title-wrapper">
                <svg class="step-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <h3>Fulfill</h3>
              </div>
              <p class="step-description">Orders flow back via <strong>webhooks</strong>. We print, ship in 3–5 days, and bill — you keep the brand.</p>
              <p class="step-tip">Tokens-based billing keeps cost predictable across channels.</p>
              <div class="step-tags">
                <span class="step-tag">Tokens billing</span>
                <span class="step-tag">3–5 day global</span>
                <span class="step-tag">Branded packing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 用户好评区域 -->
    <section class="testimonials-section">
      <div class="section-container">
        <div class="testimonials-header">
          <span class="section-kicker">{{ homeText.testimonials.kicker }}</span>
          <h2>{{ homeText.testimonials.title }}</h2>
          <p>{{ homeText.testimonials.subtitle }}</p>
        </div>

        <!-- 好评卡片网格 -->
        <div class="testimonials-grid">
          <!-- 好评卡片 1 -->
          <div class="testimonial-card">
            <div class="testimonial-stars">
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <p class="testimonial-text">
              "Spun up our Shopify-backed POD store in 4 days. The artwork library and template renders look pixel-perfect on production listings."
            </p>
            <div class="testimonial-author">
              <img src="/images/avatar1.jpg" alt="User Avatar" class="author-avatar">
              <div class="author-info">
                <p class="author-name">Sarah M.</p>
                <p class="author-handle">@sarahmakesart</p>
              </div>
            </div>
          </div>

          <!-- 好评卡片 2 -->
          <div class="testimonial-card">
            <div class="testimonial-stars">
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <p class="testimonial-text">
              "We integrated their open API in an afternoon. Multi-channel order sync to Shopify and TikTok just works."
            </p>
            <div class="testimonial-author">
              <img src="/images/avatar2.jpg" alt="User Avatar" class="author-avatar">
              <div class="author-info">
                <p class="author-name">Mike T.</p>
                <p class="author-handle">@mikestees</p>
              </div>
            </div>
          </div>

          <!-- 好评卡片 3 -->
          <div class="testimonial-card">
            <div class="testimonial-stars">
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg class="star" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <p class="testimonial-text">
              "Tokens and billing dashboards make cost forecasting trivial. Margins are healthier than any POD vendor we've used."
            </p>
            <div class="testimonial-author">
              <img src="/images/avatar3.jpg" alt="User Avatar" class="author-avatar">
              <div class="author-info">
                <p class="author-name">Lisa K.</p>
                <p class="author-handle">@lisadesigns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="benefits-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">{{ homeText.benefits.kicker }}</span>
          <h2>{{ homeText.benefits.title }}</h2>
          <p>{{ homeText.benefits.subtitle }}</p>
        </div>
        <div class="testimonials-cta" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <RouterLink to="/api" class="cta-button">
            {{ homeText.benefits.ctaApi }}
            <svg class="cta-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </RouterLink>
        </div>
      </div>
    </section>

    <HomeFooter />

    <teleport to="body">
      <div
        v-if="hoveredHomeCard"
        class="home-hover-card"
        :class="hoveredHomeCardPlacement"
        :style="hoveredHomeCardStyle"
      >
        <div class="home-hover-card-media" :class="{ empty: !hoveredHomeCard.imageUrl }">
          <img
            v-if="hoveredHomeCard.imageUrl"
            :src="hoveredHomeCard.imageUrl"
            :alt="hoveredHomeCard.title"
          />
          <div v-else class="home-hover-card-placeholder">
            {{ hoveredHomeCard.placeholder }}
          </div>
        </div>
        <div class="home-hover-card-body">
          <div class="home-hover-card-top">
            <div>
              <span class="home-hover-card-eyebrow">{{ hoveredHomeCard.kindLabel }}</span>
              <h3>{{ hoveredHomeCard.title }}</h3>
            </div>
            <span
              v-if="hoveredHomeCard.badgeLabel"
              class="home-hover-card-badge"
              :class="hoveredHomeCard.badgeTone"
            >
              {{ hoveredHomeCard.badgeLabel }}
            </span>
          </div>
          <div class="home-hover-card-rows">
            <div
              v-for="row in hoveredHomeCard.rows"
              :key="`${hoveredHomeCard.key}-${row.label}`"
              class="home-hover-card-row"
            >
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </div>
          </div>
          <p v-if="hoveredHomeCard.description" class="home-hover-card-copy">
            {{ hoveredHomeCard.description }}
          </p>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { RouterLink, useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useAuthStore } from "../stores/auth"
import { useUiLocaleStore } from "../stores/uiLocale"
import { usePricingCatalog } from "../composables/usePricingCatalog"
import type { CategoryNode, TemplateCenterListing } from "../stores/platform"
import { gatewayPlatformFetch, resolveAssetUrl } from "../api/client"
import type { ArtworkListItem, TenantStorefrontCardSummary } from "../api/client"
import CategoryCascadeSelector from "../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../components/FilterDropdown.vue"
import HomeFooter from "../components/HomeFooter.vue"
import { computeFloatingHoverOverlay } from "../utils/floatingHoverOverlay"
import { formatMarketplaceCreatorName, getListedMarketplaceTemplates } from "./admin/centerView"
import { buildCategoryIdSet, findCategoryPath, formatTemplateDate } from "./admin/repositoryView"

function resolveGalleryError(err: unknown): string {
  const message = String((err as Error).message || err || "")
  if (message.includes("<!doctype") || message.includes("Unexpected token '<'")) {
    return "Failed to load approved templates. The public marketplace endpoint returned HTML instead of JSON."
  }
  return message || "Failed to load approved templates."
}

function resolveGalleryCoverUrl(item: TemplateCenterListing): string {
  return resolveAssetUrl(item.cover_url || "")
}

function normalizeMarketplaceListing(item: Record<string, unknown>): TemplateCenterListing {
  return {
    listing_id: String(item.listing_id ?? item.listingId ?? ""),
    template_id: String(item.template_id ?? item.templateId ?? ""),
    template_code: item.template_code == null && item.templateCode == null ? undefined : String(item.template_code ?? item.templateCode),
    title: String(item.title ?? item.name ?? item.template_code ?? item.templateCode ?? item.template_id ?? item.templateId ?? ""),
    description: item.description == null ? "" : String(item.description),
    creator_name: item.creator_name == null && item.creatorName == null ? "" : String(item.creator_name ?? item.creatorName),
    listed_at: item.listed_at == null && item.listedAt == null ? undefined : String(item.listed_at ?? item.listedAt),
    marketplace_status: String(item.marketplace_status ?? item.marketplaceStatus ?? "listed") as "listed" | "unlisted",
    cover_url: String(item.cover_url ?? item.coverUrl ?? ""),
    category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
    category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
    tenant_api_status: (
      item.tenant_api_status == null && item.tenantApiStatus == null
        ? undefined
        : String(item.tenant_api_status ?? item.tenantApiStatus)
    ) as "enabled" | "disabled" | undefined,
  }
}

function normalizeMarketplaceListings(payload: unknown): TemplateCenterListing[] {
  const source = Array.isArray(payload) ? payload : []
  const seen = new Set<string>()
  const output: TemplateCenterListing[] = []
  for (const rawItem of source) {
    const item = normalizeMarketplaceListing(rawItem as Record<string, unknown>)
    if (!item.template_id) continue
    const dedupeKey = item.listing_id || item.template_id
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    output.push(item)
  }
  return output
}

function normalizeMarketplaceArtwork(item: Record<string, unknown>): ArtworkListItem {
  return {
    artwork_id: String(item.artwork_id ?? item.artworkId ?? ""),
    artwork_code: item.artwork_code == null && item.artworkCode == null ? undefined : String(item.artwork_code ?? item.artworkCode),
    library_scope: String(item.library_scope ?? item.libraryScope ?? "platform") as "platform" | "tenant",
    owner_tenant_id: item.owner_tenant_id == null && item.ownerTenantId == null ? undefined : String(item.owner_tenant_id ?? item.ownerTenantId),
    source_provider: item.source_provider == null && item.sourceProvider == null ? undefined : String(item.source_provider ?? item.sourceProvider),
    source_asset_id: item.source_asset_id == null && item.sourceAssetId == null ? undefined : String(item.source_asset_id ?? item.sourceAssetId),
    source_url: item.source_url == null && item.sourceUrl == null ? undefined : String(item.source_url ?? item.sourceUrl),
    name: String(item.name ?? item.artwork_name ?? item.artworkName ?? ""),
    description: item.description == null ? "" : String(item.description),
    mime_type: String(item.mime_type ?? item.mimeType ?? "image/*"),
    file_ext: String(item.file_ext ?? item.fileExt ?? ""),
    category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
    category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
    preview_url: String(item.preview_url ?? item.previewUrl ?? item.original_url ?? item.originalUrl ?? ""),
    original_url: String(item.original_url ?? item.originalUrl ?? item.preview_url ?? item.previewUrl ?? ""),
    creator_name: item.creator_name == null && item.creatorName == null ? undefined : String(item.creator_name ?? item.creatorName),
    license_name: item.license_name == null && item.licenseName == null ? undefined : String(item.license_name ?? item.licenseName),
    license_url: item.license_url == null && item.licenseUrl == null ? undefined : String(item.license_url ?? item.licenseUrl),
    attribution_required: Boolean(item.attribution_required ?? item.attributionRequired ?? false),
    width: item.width == null ? undefined : Number(item.width),
    height: item.height == null ? undefined : Number(item.height),
    commerce_type: String(item.commerce_type ?? item.commerceType ?? "free") as "free" | "paid",
    price_tokens: item.price_tokens == null && item.priceTokens == null ? undefined : Number(item.price_tokens ?? item.priceTokens),
    visibility_status: String(item.visibility_status ?? item.visibilityStatus ?? "listed") as "draft" | "listed" | "disabled",
    sale_mode: item.sale_mode == null && item.saleMode == null ? undefined : String(item.sale_mode ?? item.saleMode),
    is_platform_owned: Boolean(item.is_platform_owned ?? item.isPlatformOwned ?? false),
    listed_at: item.listed_at == null && item.listedAt == null ? undefined : String(item.listed_at ?? item.listedAt),
    review_status: item.review_status == null && item.reviewStatus == null
      ? undefined
      : String(item.review_status ?? item.reviewStatus) as "not_required" | "pending" | "approved" | "rejected",
    review_note: item.review_note == null && item.reviewNote == null ? undefined : String(item.review_note ?? item.reviewNote),
    reviewed_by: item.reviewed_by == null && item.reviewedBy == null ? undefined : String(item.reviewed_by ?? item.reviewedBy),
    reviewed_at: item.reviewed_at == null && item.reviewedAt == null ? undefined : String(item.reviewed_at ?? item.reviewedAt),
    purchased: Boolean(item.purchased ?? false),
    unlocked: Boolean(item.unlocked ?? false),
    can_edit: Boolean(item.can_edit ?? item.canEdit ?? false),
    can_purchase: Boolean(item.can_purchase ?? item.canPurchase ?? false),
    status: String(item.status ?? "active"),
    created_at: item.created_at == null && item.createdAt == null ? undefined : String(item.created_at ?? item.createdAt),
    updated_at: item.updated_at == null && item.updatedAt == null ? undefined : String(item.updated_at ?? item.updatedAt),
  }
}

function normalizeMarketplaceArtworkItems(payload: unknown): ArtworkListItem[] {
  const source = Array.isArray(payload) ? payload : []
  const seen = new Set<string>()
  const output: ArtworkListItem[] = []
  for (const rawItem of source) {
    const item = normalizeMarketplaceArtwork(rawItem as Record<string, unknown>)
    if (!item.artwork_id) continue
    if (seen.has(item.artwork_id)) continue
    seen.add(item.artwork_id)
    output.push(item)
  }
  return output
}

function normalizeStorefrontCard(item: Record<string, unknown>): TenantStorefrontCardSummary {
  return {
    tenant_id: String(item.tenant_id ?? item.tenantId ?? ""),
    store_slug: item.store_slug == null && item.storeSlug == null ? undefined : String(item.store_slug ?? item.storeSlug),
    store_name: item.store_name == null && item.storeName == null ? undefined : String(item.store_name ?? item.storeName),
    store_bio: item.store_bio == null && item.storeBio == null ? undefined : String(item.store_bio ?? item.storeBio),
    store_logo_url: item.store_logo_url == null && item.storeLogoUrl == null ? undefined : String(item.store_logo_url ?? item.storeLogoUrl),
    store_banner_url: item.store_banner_url == null && item.storeBannerUrl == null ? undefined : String(item.store_banner_url ?? item.storeBannerUrl),
    store_updated_at: item.store_updated_at == null && item.storeUpdatedAt == null ? undefined : String(item.store_updated_at ?? item.storeUpdatedAt),
    storefront_sort_order: item.storefront_sort_order == null && item.storefrontSortOrder == null ? undefined : Number(item.storefront_sort_order ?? item.storefrontSortOrder),
    template_count: item.template_count == null && item.templateCount == null ? undefined : Number(item.template_count ?? item.templateCount),
    artwork_count: item.artwork_count == null && item.artworkCount == null ? undefined : Number(item.artwork_count ?? item.artworkCount),
  }
}

function normalizeStorefrontCards(payload: unknown): TenantStorefrontCardSummary[] {
  const source = Array.isArray(payload) ? payload : []
  return source
    .map((item) => normalizeStorefrontCard(item as Record<string, unknown>))
    .filter((item) => Boolean(item.tenant_id && item.store_slug))
}

function normalizeCategoryNode(node: Record<string, unknown>, parentPath = ""): CategoryNode {
  const name = String(node.name || "")
  const categoryPath = parentPath ? `${parentPath} / ${name}` : name
  const rawChildren = Array.isArray(node.children) ? node.children : []
  return {
    category_id: String(node.category_id || node.categoryId || ""),
    parent_id: node.parent_id == null ? (node.parentId == null ? null : String(node.parentId)) : String(node.parent_id),
    level: Number(node.level || 0),
    name,
    slug: node.slug == null ? undefined : String(node.slug),
    sort_order: node.sort_order == null ? undefined : Number(node.sort_order),
    status: node.status == null ? undefined : String(node.status),
    category_path: categoryPath,
    children: rawChildren.map((child) => normalizeCategoryNode(child as Record<string, unknown>, categoryPath)),
  }
}

function normalizeCategoryTree(payload: unknown): CategoryNode[] {
  const source = Array.isArray(payload)
    ? payload
    : (payload as { data?: unknown[] } | null)?.data
  if (!Array.isArray(source)) return []
  return source.map((item) => normalizeCategoryNode(item as Record<string, unknown>))
}

const authStore = useAuthStore()
const router = useRouter()
const { accessToken } = storeToRefs(authStore)
const uiLocaleStore = useUiLocaleStore()
const { locale } = storeToRefs(uiLocaleStore)
const isZh = computed(() => locale.value === "zh")
const homeText = computed(() => {
  const zh = isZh.value
  return {
    hero: {
      titlePrefix: zh ? "几天上线，不用几个月，启动你自己的 " : "Launch Your Own ",
      titleHighlight1: zh ? "POD 业务" : "POD Business",
      titleMid: zh ? "，仅需 " : ", In ",
      titleHighlight2: zh ? "数日" : "Days",
      titleSuffix: zh ? "" : " Not Months",
      subtitle: zh
        ? "一站式平台,集成模板、艺术素材、API 与店铺应用。"
        : "One platform for templates, artwork, API, and storefront apps.",
      ctaPrimary: zh ? "获取 API Key" : "Get API Key",
      ctaSecondary: zh ? "浏览模板" : "Browse Templates",
      feature1: zh ? "上架就绪模板" : "List-ready templates",
      feature2: zh ? "已授权艺术素材" : "Licensed artwork included",
      feature3: zh ? "Token 按量付费" : "Token-based pay as you go",
    },
    snapshot: {
      kicker: zh ? "Mockup100 套件" : "Mockup100 Suite",
      title: zh ? "四款产品,一套工作流" : "Four products, one workflow",
      subtitle: zh
        ? "选择符合你这次上新的入口 — 所有套餐与价格皆与目录同步。"
        : "Pick the surface that matches today's launch — every plan and price stays in sync with our catalogue.",
      seeFullPricing: zh ? "查看完整定价" : "See full pricing",
      exploreApi: zh ? "查看 API 与插件" : "Explore API & plugins",
    },
    platform: {
      title: zh ? "可信赖的集成生态" : "Trusted integrations",
    },
    templates: {
      kicker: zh ? "模板" : "Templates",
      title: zh ? "上架就绪模板,开箱即用" : "List-Ready Templates, Out Of The Box",
      subtitle: zh ? "分类清晰、可预览,一键推送到你的店铺。" : "Categorized, previewable, one click to your storefront.",
      loading: zh ? "正在加载模板……" : "Loading templates…",
      empty: zh ? "暂无公开模板。" : "No public templates are listed right now.",
      previous: zh ? "上一页" : "Previous",
      next: zh ? "下一页" : "Next",
    },
    artwork: {
      kicker: zh ? "艺术素材" : "Artwork",
      title: zh ? "已授权素材,即取即售" : "Licensed Artwork, Ready To Resell",
      subtitle: zh ? "每件作品皆已获得商用授权。" : "Every piece is cleared for commercial use.",
      loading: zh ? "正在加载素材……" : "Loading artwork…",
      empty: zh ? "暂无上架素材。" : "No listed artwork is live right now.",
    },
    storefront: {
      kicker: zh ? "创意工作区" : "Creative Workspace",
      title: zh ? "Mockup100 上的活跃工作区" : "Live Workspaces On Mockup100",
      subtitle: zh ? "真实租户,真实上架商品。" : "Real tenants shipping real catalogs.",
      loading: zh ? "正在加载店铺……" : "Loading storefronts…",
      empty: zh ? "暂无精选店铺。" : "No featured storefronts are live right now.",
    },
    steps: {
      kicker: zh ? "工作原理" : "How It Works",
      title: zh ? "对接、上架、履约。" : "Connect. List. Fulfill.",
      subtitle: zh
        ? "API、应用与全球履约一站搞定 — 选择更快上线的路径,无集成成本。"
        : "One stack for API, apps and global fulfillment — pick the route that ships you faster, no integration tax.",
    },
    testimonials: {
      kicker: zh ? "运营方" : "Operators",
      title: zh ? "受规模化 POD 品牌信赖" : "Trusted By Brands Shipping POD At Scale",
      subtitle: zh ? "真实团队正在用 Mockup100 加速发布、上架与履约。" : "Real teams using Mockup100 to launch, list, and fulfill faster.",
    },
    benefits: {
      kicker: zh ? "立即开始" : "Get Started",
      title: zh ? "准备好启动你的 POD 业务了吗?" : "Ready to launch your POD business?",
      subtitle: zh ? "免费起步,按需扩展 — 无集成成本。" : "Start free, scale on demand — no integration tax.",
      ctaApi: zh ? "获取 API Key" : "Get API Key",
    },
  }
})
const { catalog: pricingCatalog, fetchPricingCatalog } = usePricingCatalog()

// Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Four-product Catalogue.
// Frontend MUST NOT invent prices — productSnapshots derives all numbers from the catalog stub.
function formatUsdFromCents(cents: number): string {
  if (!Number.isFinite(cents)) return "$0"
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

function formatTokenCount(value: number): string {
  return value.toLocaleString("en-US")
}

type ProductSnapshot = {
  key: "wp-free" | "wp-pro" | "token" | "grading"
  kicker: string
  title: string
  subtitle: string
  price: string
  priceSuffix: string
  ctaLabel: string
  ctaTo: string
  // Plan v3 §S2.5：grading 卡片可选 30 天免费试用提示与 CTA。
  trialNote?: string
  trialCtaLabel?: string
  trialCtaTo?: string
}

const productSnapshots = computed<ProductSnapshot[]>(() => {
  const tokenPacks = pricingCatalog.value.token_packs
  const tokenEntry = tokenPacks.find((pack) => pack.featured) || tokenPacks[0]
  const wpProEntry = pricingCatalog.value.wp_pro_addon.find((plan) => plan.scope === "single")
    || pricingCatalog.value.wp_pro_addon[0]
  const gradingEntry = pricingCatalog.value.grading_subscription.find((plan) => plan.tier === "standard")
    || pricingCatalog.value.grading_subscription[0]
  const zh = isZh.value

  return [
    {
      key: "wp-free",
      kicker: "WP Free",
      title: zh ? "免费版插件" : "WordPress Free",
      subtitle: zh
        ? "完整基础画布编辑、免费 512px 样机预览、单文件独立导出。"
        : "Full base canvas editing, free 512px mockup preview, single-file standalone export.",
      price: "$0",
      priceSuffix: zh ? "永久免费" : "Forever Free",
      ctaLabel: zh ? "获取 WP Free" : "Get WP Free",
      ctaTo: "/pricing#wp-free",
    },
    {
      key: "wp-pro",
      kicker: "WP Pro",
      title: zh ? "WP Pro 附加插件" : "WordPress Pro Add-on",
      subtitle: zh
        ? "批量订单导出 + 团队子账号权限管理(仅 WordPress 编辑器)。"
        : "Bulk order export plus team sub-account permissions (WordPress editor only).",
      price: wpProEntry ? formatUsdFromCents(wpProEntry.price_cents) : "$49",
      priceSuffix: zh
        ? "一次性买断 · $49 单站 / $99 不限站"
        : "One-time · $49 Single Site / $99 Unlimited",
      ctaLabel: zh ? "管理 WordPress" : "Manage WordPress",
      ctaTo: "/pricing#wp-pro",
    },
    {
      key: "token",
      kicker: "Token Wallet",
      title: zh ? "云端 Token 充值" : "Token Top-up",
      subtitle: zh
        ? "按量付费高清渲染 + 商用艺术素材,Token 永不过期。"
        : "Pay-as-you-go HD renders + commercial artwork. Tokens never expire.",
      price: tokenEntry ? formatUsdFromCents(tokenEntry.amount_cents) : "$20",
      priceSuffix: tokenEntry
        ? (zh
          ? `${formatTokenCount(tokenEntry.tokens)} Tokens · 永不过期`
          : `${formatTokenCount(tokenEntry.tokens)} Tokens · Permanently valid`)
        : (zh ? "永不过期" : "Permanently valid"),
      ctaLabel: zh ? "购买 Tokens" : "Buy Tokens",
      ctaTo: "/pricing#tokens",
    },
    {
      key: "grading",
      kicker: "Grading",
      title: zh ? "放码订阅" : "Grading Subscription",
      subtitle: zh
        ? "全尺码自动放码,Web 与 WordPress 双端同步。"
        : "All-size auto grading with synced Web & WordPress dual-end access.",
      price: gradingEntry ? formatUsdFromCents(gradingEntry.price_cents) : "$9",
      priceSuffix: zh
        ? "Standard $9 / Enterprise $19 每月"
        : "$9 Standard / $19 Enterprise per month",
      ctaLabel: zh ? "立即订阅" : "Subscribe",
      ctaTo: "/pricing#grading",
      // Plan v3 §S2.5：30 天免费试用文案 + CTA（未登录态走注册回流，登录态直接锚到订阅区自动开启 trial）。
      trialNote: zh
        ? "新用户可免费试用 30 天，无需信用卡。"
        : "Free 30-day trial for new users — no credit card required.",
      trialCtaLabel: zh ? "开始免费试用" : "Start free trial",
      trialCtaTo: accessToken.value
        ? "/admin/tokens-management?intent=grading-trial#grading-subscription"
        : "/auth?mode=register&redirect=/admin/tokens-management?intent=grading-trial",
    },
  ]
})

type HoverOverlayClass =
  | "home-hover-card--bottom-left"
  | "home-hover-card--bottom-right"
  | "home-hover-card--top-left"
  | "home-hover-card--top-right"

type HoverDetailRow = {
  label: string
  value: string
}

type HomeHoverDetail = {
  key: string
  kindLabel: string
  title: string
  imageUrl: string
  placeholder: string
  badgeLabel?: string
  badgeTone?: "info" | "paid" | "success"
  rows: HoverDetailRow[]
  description: string
}

const isAuthenticated = computed(() => Boolean(accessToken.value))
const HOME_FEATURE_ROWS = 2
const TEMPLATE_GRID_COLUMNS = 5
const ARTWORK_GRID_COLUMNS = 6
const TEMPLATE_PAGE_SIZE = TEMPLATE_GRID_COLUMNS * HOME_FEATURE_ROWS
const ARTWORK_PAGE_SIZE = ARTWORK_GRID_COLUMNS * HOME_FEATURE_ROWS
const STOREFRONT_PAGE_SIZE = 6

function openPrimaryCta() {
  if (isAuthenticated.value) {
    router.push({ path: "/admin/tokens-management", hash: "#buy-token-packs" })
    return
  }
  router.push("/register")
}

function openDesigner(productType: string) {
  if (isAuthenticated.value) {
    router.push("/admin/editor")
  } else {
    router.push("/register")
  }
}

let carouselAnimationId: number | null = null

function initProductCarousel() {
  const container = document.getElementById('carousel-container')
  const track = document.getElementById('carousel-track')
  
  if (!container || !track) {
    console.log('Carousel elements not found')
    return
  }
  
  const items = track.children
  
  if (items.length === 0) {
    console.log('No carousel items found')
    return
  }
  
  const firstItem = items[0] as HTMLElement
  const rect = firstItem.getBoundingClientRect()
  const itemWidth = rect.width + 24
  
  if (itemWidth <= 24) {
    console.log('Item width not ready yet')
    return
  }
  
  const itemCount = items.length
  
  for (let i = 0; i < itemCount; i++) {
    const clone = items[i].cloneNode(true)
    track.appendChild(clone)
  }
  
  let position = 0
  const speed = 1
  
  function animate() {
    position -= speed
    
    if (position <= -itemWidth * itemCount) {
      position = 0
    }
    
    track.style.transform = `translateX(${position}px)`
    carouselAnimationId = requestAnimationFrame(animate)
  }
  
  function startAnimation() {
    if (!carouselAnimationId) {
      animate()
    }
  }
  
  function stopAnimation() {
    if (carouselAnimationId) {
      cancelAnimationFrame(carouselAnimationId)
      carouselAnimationId = null
    }
  }
  
  startAnimation()
  
  container.addEventListener('mouseenter', stopAnimation)
  container.addEventListener('mouseleave', startAnimation)
}

function startCarouselWithDelay() {
  setTimeout(() => {
    initProductCarousel()
  }, 500)
}
const listingApiStatusOptions = [
  { value: "all", label: "All Access States" },
  { value: "enabled", label: "Integration Ready" },
  { value: "disabled", label: "Catalog Only" },
]

const galleryLoading = ref(false)
const galleryError = ref("")
const galleryItems = ref<TemplateCenterListing[]>([])
const galleryCategories = ref<CategoryNode[]>([])
const gallerySearch = ref("")
const selectedCategoryId = ref("all")
const selectedApiStatus = ref("all")

function handleCategoryChange() {
  // category change handler kept as a no-op hook for v-model + @change wiring
}
const storefrontLoading = ref(false)
const storefrontError = ref("")
const storefrontItems = ref<TenantStorefrontCardSummary[]>([])
const artworkLoading = ref(false)
const artworkError = ref("")
const artworkItems = ref<ArtworkListItem[]>([])
const artworkCategories = ref<CategoryNode[]>([])
const artworkSearch = ref("")
const selectedArtworkCategoryId = ref("all")
const galleryPage = ref(1)
const artworkPage = ref(1)
const storefrontPage = ref(1)
const hoveredHomeCard = ref<HomeHoverDetail | null>(null)
const hoveredHomeCardPlacement = ref<HoverOverlayClass>("home-hover-card--bottom-left")
const hoveredHomeCardStyle = ref<Record<string, string>>({})

function resolveGalleryCategory(item: TemplateCenterListing): string {
  if (item.category_id) {
    const resolved = findCategoryPath(item.category_id, galleryCategories.value)
    if (resolved) return resolved
  }
  if (item.category_path?.includes(" / ")) return item.category_path
  return "Uncategorized"
}

function resolveStorefrontCoverUrl(item: TenantStorefrontCardSummary): string {
  return resolveAssetUrl(item.store_banner_url || item.store_logo_url || "")
}

function resolveStorefrontUpdatedLabel(item: TenantStorefrontCardSummary): string {
  return item.store_updated_at ? `Updated ${formatTemplateDate(item.store_updated_at)}` : "Published Store"
}

function resolveMarketplacePreviewReference(item: TemplateCenterListing): string {
  return item.listing_id || item.template_code || item.template_id
}

function resolveTemplatePreviewLink(item: TemplateCenterListing) {
  const reference = resolveMarketplacePreviewReference(item)
  if (isAuthenticated.value) {
    return { path: "/preview", query: { template_id: reference, source: "center" } }
  }
  return {
    path: "/auth",
    query: {
      mode: "login",
      redirect: `/preview?template_id=${encodeURIComponent(reference)}&source=center`,
    },
  }
}

function resolveArtworkCoverUrl(item: ArtworkListItem): string {
  return resolveAssetUrl(item.preview_url || item.original_url || "")
}

function resolveArtworkGalleryCategory(item: ArtworkListItem): string {
  if (item.category_id) {
    const resolved = findCategoryPath(item.category_id, artworkCategories.value)
    if (resolved) return resolved
  }
  if (item.category_path?.includes(" / ")) return item.category_path
  return "Uncategorized"
}

function resolveArtworkPriceLabel(item: ArtworkListItem): string {
  return item.commerce_type === "paid" ? `${item.price_tokens || 0} Tokens` : "Free to use"
}

function resolveTemplateAccessLabel(item: TemplateCenterListing): string {
  return item.tenant_api_status === "enabled" ? "Integration Ready" : "Catalog Only"
}

function resolveStorefrontSubtitle(item: TenantStorefrontCardSummary): string {
  return item.store_slug ? `@${item.store_slug}` : "Curated public storefront"
}

function openArtworkPreview(item: ArtworkListItem) {
  const query = {
    artwork_id: item.artwork_id,
    source: "home",
  }
  if (!isAuthenticated.value) {
    router.push({ path: "/auth", query: { mode: "login", redirect: `/preview?${new URLSearchParams(query).toString()}` } })
    return
  }
  router.push({ path: "/preview", query })
}

function normalizeMarketplaceSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function squashMarketplaceSearch(value: string) {
  return normalizeMarketplaceSearch(value).replace(/\s+/g, "")
}

function matchesMarketplaceSearch(keyword: string, squashedKeyword: string, values: Array<string | undefined>) {
  if (!keyword) return true
  return values.some((value) => {
    const normalized = normalizeMarketplaceSearch(value || "")
    const squashed = squashMarketplaceSearch(value || "")
    return normalized.includes(keyword) || (!!squashedKeyword && squashed.includes(squashedKeyword))
  })
}

const selectedGalleryCategoryIdSet = computed(() => buildCategoryIdSet(selectedCategoryId.value, galleryCategories.value))
const selectedArtworkCategoryIdSet = computed(() => buildCategoryIdSet(selectedArtworkCategoryId.value, artworkCategories.value))
const filteredGallery = computed(() => {
  const keyword = normalizeMarketplaceSearch(gallerySearch.value)
  const squashedKeyword = squashMarketplaceSearch(gallerySearch.value)
  return getListedMarketplaceTemplates(galleryItems.value).filter((item) => {
    if (selectedApiStatus.value !== "all" && (item.tenant_api_status || "disabled") !== selectedApiStatus.value) return false
    if (!matchesMarketplaceSearch(keyword, squashedKeyword, [
      item.title,
      item.template_code,
      item.template_id,
      resolveGalleryCategory(item),
      item.tenant_api_status === "enabled" ? "Integration Ready" : "Catalog Only",
    ])) return false
    if (selectedCategoryId.value === "all") return true
    return Boolean(item.category_id && selectedGalleryCategoryIdSet.value?.has(item.category_id))
  })
})
const filteredArtworkGallery = computed(() => {
  const keyword = normalizeMarketplaceSearch(artworkSearch.value)
  const squashedKeyword = squashMarketplaceSearch(artworkSearch.value)
  return artworkItems.value.filter((item) => {
    if (!matchesMarketplaceSearch(keyword, squashedKeyword, [
      item.name,
      item.artwork_code,
      item.artwork_id,
      resolveArtworkGalleryCategory(item),
      formatMarketplaceCreatorName(item.creator_name),
      item.commerce_type === "paid" ? "paid" : "free",
    ])) return false
    if (selectedArtworkCategoryId.value === "all") return true
    return Boolean(item.category_id && selectedArtworkCategoryIdSet.value?.has(item.category_id))
  })
})

function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function resolveTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages)
}

function resolvePageSummary(page: number, pageSize: number, totalItems: number): string {
  if (!totalItems) return "Showing 0 items"
  const start = (page - 1) * pageSize + 1
  const end = Math.min(totalItems, page * pageSize)
  return `Showing ${start}-${end} of ${totalItems}`
}

function resolveCardInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?"
}

function resolveHoverOverlay(event: Event): {
  placement: HoverOverlayClass
  style: Record<string, string>
} {
  return computeFloatingHoverOverlay(event, {
    defaultPlacement: "home-hover-card--bottom-left",
    overlayWidth: 420,
    overlayHeight: 620,
    minOverlayWidth: 220,
    minOverlayHeight: 280,
    viewportPadding: 12,
    topSafePadding: 12,
    gap: 10,
  })
}

function setHoveredHomeCard(detail: HomeHoverDetail, event: Event) {
  const overlay = resolveHoverOverlay(event)
  hoveredHomeCard.value = detail
  hoveredHomeCardPlacement.value = overlay.placement
  hoveredHomeCardStyle.value = overlay.style
}

function clearHoveredHomeCard() {
  hoveredHomeCard.value = null
  hoveredHomeCardStyle.value = {}
}

function createTemplateHoverDetail(item: TemplateCenterListing): HomeHoverDetail {
  const creator = formatMarketplaceCreatorName(item.creator_name)
  return {
    key: item.listing_id || item.template_id,
    kindLabel: "Template",
    title: item.title || item.template_id,
    imageUrl: resolveGalleryCoverUrl(item),
    placeholder: resolveCardInitial(item.title || item.template_id),
    badgeLabel: resolveTemplateAccessLabel(item),
    badgeTone: "info",
    rows: [
      item.template_code ? { label: "Code", value: item.template_code } : null,
      creator ? { label: "Creator", value: creator } : null,
      { label: "Category", value: resolveGalleryCategory(item) },
      { label: "Access", value: resolveTemplateAccessLabel(item) },
      item.listed_at ? { label: "Listed", value: formatTemplateDate(item.listed_at) } : null,
    ].filter((row): row is HoverDetailRow => Boolean(row)),
    description: item.description || "A marketplace-ready template you can open in preview and test before publishing.",
  }
}

function createArtworkHoverDetail(item: ArtworkListItem): HomeHoverDetail {
  const creator = formatMarketplaceCreatorName(item.creator_name)
  const licenseName = item.license_name || "Marketplace license"
  const sizeLabel = item.width && item.height ? `${item.width} × ${item.height}` : ""
  return {
    key: item.artwork_id,
    kindLabel: "Artwork",
    title: item.name,
    imageUrl: resolveArtworkCoverUrl(item),
    placeholder: resolveCardInitial(item.name),
    badgeLabel: item.commerce_type === "paid" ? "Paid" : "Free",
    badgeTone: item.commerce_type === "paid" ? "paid" : "success",
    rows: [
      creator ? { label: "Creator", value: creator } : null,
      { label: "Category", value: resolveArtworkGalleryCategory(item) },
      { label: "Price", value: resolveArtworkPriceLabel(item) },
      { label: "License", value: licenseName },
      sizeLabel ? { label: "Size", value: sizeLabel } : null,
      item.listed_at ? { label: "Listed", value: formatTemplateDate(item.listed_at) } : null,
    ].filter((row): row is HoverDetailRow => Boolean(row)),
    description: item.description || "Marketplace artwork ready to preview, test, and pair with your next product launch.",
  }
}

const galleryTotalPages = computed(() => resolveTotalPages(filteredGallery.value.length, TEMPLATE_PAGE_SIZE))
const artworkTotalPages = computed(() => resolveTotalPages(filteredArtworkGallery.value.length, ARTWORK_PAGE_SIZE))
const storefrontTotalPages = computed(() => resolveTotalPages(storefrontItems.value.length, STOREFRONT_PAGE_SIZE))
const paginatedGallery = computed(() => paginateItems(filteredGallery.value, galleryPage.value, TEMPLATE_PAGE_SIZE))
const paginatedArtworkGallery = computed(() => paginateItems(filteredArtworkGallery.value, artworkPage.value, ARTWORK_PAGE_SIZE))
const paginatedStorefronts = computed(() => paginateItems(storefrontItems.value, storefrontPage.value, STOREFRONT_PAGE_SIZE))

const heroBannerSlides = computed<string[]>(() => {
  const source = paginatedGallery.value.length > 0
    ? paginatedGallery.value
    : getListedMarketplaceTemplates(galleryItems.value)
  const covers: string[] = []
  for (const item of source) {
    const cover = resolveGalleryCoverUrl(item)
    if (cover && !covers.includes(cover)) {
      covers.push(cover)
    }
    if (covers.length >= 3) break
  }
  return covers
})

const heroBannerIndex = ref(0)
let heroBannerTimer: ReturnType<typeof setInterval> | null = null

function setHeroBannerIndex(idx: number) {
  if (heroBannerSlides.value.length === 0) return
  heroBannerIndex.value = ((idx % heroBannerSlides.value.length) + heroBannerSlides.value.length) % heroBannerSlides.value.length
  restartHeroBannerTimer()
}

function restartHeroBannerTimer() {
  if (heroBannerTimer) {
    clearInterval(heroBannerTimer)
    heroBannerTimer = null
  }
  if (heroBannerSlides.value.length <= 1) return
  heroBannerTimer = setInterval(() => {
    heroBannerIndex.value = (heroBannerIndex.value + 1) % heroBannerSlides.value.length
  }, 4500)
}

watch(heroBannerSlides, (slides) => {
  if (heroBannerIndex.value >= slides.length) {
    heroBannerIndex.value = 0
  }
  restartHeroBannerTimer()
}, { immediate: false })

function setGalleryPage(page: number) {
  galleryPage.value = clampPage(page, galleryTotalPages.value)
}

function setArtworkPage(page: number) {
  artworkPage.value = clampPage(page, artworkTotalPages.value)
}

function setStorefrontPage(page: number) {
  storefrontPage.value = clampPage(page, storefrontTotalPages.value)
}

watch([gallerySearch, selectedCategoryId, selectedApiStatus], () => {
  galleryPage.value = 1
})

watch([artworkSearch, selectedArtworkCategoryId], () => {
  artworkPage.value = 1
})

watch(() => filteredGallery.value.length, () => {
  galleryPage.value = clampPage(galleryPage.value, galleryTotalPages.value)
})

watch(() => filteredArtworkGallery.value.length, () => {
  artworkPage.value = clampPage(artworkPage.value, artworkTotalPages.value)
})

watch(() => storefrontItems.value.length, () => {
  storefrontPage.value = clampPage(storefrontPage.value, storefrontTotalPages.value)
})

onMounted(async () => {
  fetchPricingCatalog().catch(() => {})
  galleryLoading.value = true
  galleryError.value = ""
  storefrontLoading.value = true
  storefrontError.value = ""
  artworkLoading.value = true
  artworkError.value = ""
  
  startCarouselWithDelay()
  const [templatesResult, categoryTreeResult, storefrontsResult, artworksResult, artworkCategoryTreeResult] = await Promise.allSettled([
    gatewayPlatformFetch<unknown[]>("/marketplace/templates"),
    gatewayPlatformFetch<CategoryNode[]>("/marketplace/categories/tree"),
    gatewayPlatformFetch<unknown[]>("/platform/storefronts"),
    gatewayPlatformFetch<unknown[]>("/marketplace/artworks?size=200"),
    gatewayPlatformFetch<CategoryNode[]>("/artworks/categories/tree"),
  ])

  if (templatesResult.status === "fulfilled" && categoryTreeResult.status === "fulfilled") {
    galleryItems.value = normalizeMarketplaceListings(templatesResult.value)
    galleryCategories.value = normalizeCategoryTree(categoryTreeResult.value)
  } else {
    const galleryFailure = templatesResult.status === "rejected"
      ? templatesResult.reason
      : categoryTreeResult.status === "rejected"
        ? categoryTreeResult.reason
        : new Error("Failed to load marketplace categories.")
    galleryError.value = resolveGalleryError(galleryFailure)
    galleryItems.value = []
    galleryCategories.value = []
  }

  if (storefrontsResult.status === "fulfilled") {
    storefrontItems.value = normalizeStorefrontCards(storefrontsResult.value)
  } else {
    storefrontError.value = String((storefrontsResult.reason as Error)?.message || storefrontsResult.reason || "Failed to load storefronts.")
    storefrontItems.value = []
  }

  if (artworksResult.status === "fulfilled" && artworkCategoryTreeResult.status === "fulfilled") {
    artworkItems.value = normalizeMarketplaceArtworkItems(artworksResult.value)
    artworkCategories.value = normalizeCategoryTree(artworkCategoryTreeResult.value)
  } else {
    const artworkFailure = artworksResult.status === "rejected"
      ? artworksResult.reason
      : artworkCategoryTreeResult.status === "rejected"
        ? artworkCategoryTreeResult.reason
        : new Error("Failed to load marketplace artwork.")
    artworkError.value = String((artworkFailure as Error)?.message || artworkFailure || "Failed to load marketplace artwork.")
    artworkItems.value = []
    artworkCategories.value = []
  }

  galleryLoading.value = false
  storefrontLoading.value = false
  artworkLoading.value = false

  restartHeroBannerTimer()
})

onUnmounted(() => {
  if (heroBannerTimer) {
    clearInterval(heroBannerTimer)
    heroBannerTimer = null
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.home-hero-wrap {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.home-hero-wrap::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%23ffffff" fill-opacity="0.15" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
  background-size: cover;
  pointer-events: none;
}

.hero-section {
  position: relative;
  z-index: 1;
  padding: 5.5rem 2rem 6.5rem;
  background:
    radial-gradient(ellipse 60% 50% at 80% 20%, rgba(129, 140, 248, 0.28), transparent 60%),
    radial-gradient(ellipse 50% 40% at 15% 80%, rgba(192, 132, 252, 0.22), transparent 60%),
    linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #312e81 100%);
  overflow: hidden;
}

.hero-section::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8rem;
  background: linear-gradient(to top, #f8fafc 0%, transparent 100%);
  pointer-events: none;
}

.hero-content {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  position: relative;
  z-index: 2;
}

@media (min-width: 968px) {
  .hero-content {
    grid-template-columns: 1.05fr 1fr;
    align-items: center;
    gap: 4rem;
  }
}

.hero-text {
  color: #fff;
}

.hero-title {
  font-size: clamp(2rem, 4.4vw, 3.25rem);
  font-weight: 800;
  margin-bottom: 1.25rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.hero-highlight {
  background: linear-gradient(135deg, #818cf8, #c084fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-subtitle {
  font-size: clamp(1.05rem, 1.6vw, 1.25rem);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.88);
  margin-bottom: 1.75rem;
  line-height: 1.55;
  max-width: 560px;
}

.hero-actions {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}

.hero-actions .btn-primary.btn-large {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  border: none;
  box-shadow: 0 10px 28px rgba(99, 102, 241, 0.45);
  padding: 0.9rem 2rem;
  font-size: 1.05rem;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.hero-actions .btn-primary.btn-large:hover {
  filter: brightness(1.08);
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(99, 102, 241, 0.55);
}

.hero-actions .btn-secondary.btn-large {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.32);
  padding: 0.9rem 2rem;
  font-size: 1.05rem;
  font-weight: 600;
  backdrop-filter: blur(4px);
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.hero-actions .btn-secondary.btn-large:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
  transform: translateY(-2px);
}

.hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.75rem;
}

.hero-feature {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.95rem;
  font-weight: 500;
  backdrop-filter: blur(2px);
}

.hero-feature-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: #34d399;
  flex-shrink: 0;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-carousel {
  position: relative;
  width: 100%;
  max-width: 460px;
  aspect-ratio: 4 / 3;
}

.hero-carousel-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.7s ease;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-carousel-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.hero-carousel-slide img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.85rem;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.35);
  display: block;
}

.hero-carousel-dots {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}

.hero-carousel-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: background 0.2s ease, width 0.25s ease;
}

.hero-carousel-dot:hover {
  background: rgba(255, 255, 255, 0.75);
}

.hero-carousel-dot.active {
  background: #ffffff;
  width: 18px;
  border-radius: 999px;
}

.hero-image img {
  max-width: 100%;
  max-height: 460px;
  height: auto;
  border-radius: 0.85rem;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.35);
  object-fit: contain;
}

.core-advantages-section {
  padding: 5rem 1.5rem;
  background: #ffffff;
}

.advantages-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .advantages-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.advantage-card {
  text-align: center;
  padding: 2.5rem 2rem;
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.advantage-card:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.advantage-icon-wrapper {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.advantage-icon-wrapper--blue {
  background: #eef2ff;
}

.advantage-icon-wrapper--green {
  background: #dcfce7;
}

.advantage-icon-wrapper--purple {
  background: #f3e8ff;
}

.advantage-icon {
  width: 2rem;
  height: 2rem;
}

.advantage-icon-wrapper--blue .advantage-icon {
  color: #6366f1;
}

.advantage-icon-wrapper--green .advantage-icon {
  color: #16a34a;
}

.advantage-icon-wrapper--purple .advantage-icon {
  color: #4f46e5;
}

.advantage-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem;
}

.advantage-card p {
  font-size: 1rem;
  color: #64748b;
  line-height: 1.7;
  margin: 0;
}

.advantage-card strong {
  color: #0f172a;
  font-weight: 600;
}

.product-showcase-section {
  padding: 5rem 1.5rem;
  background: linear-gradient(135deg, rgba(218, 119, 86, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
}

.carousel-container {
  display: none;
}

@media (min-width: 768px) {
  .carousel-container {
    display: block;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -ms-overflow-style: none;
    scrollbar-width: none;
    padding-bottom: 1.5rem;
  }
  
  .carousel-container::-webkit-scrollbar {
    display: none;
  }
  
  .carousel-track {
    display: flex;
    gap: 1.5rem;
    min-width: max-content;
    position: relative;
  }
  
  .product-card {
    background: #fff;
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    width: 18rem;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }
  
  .product-card:hover {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
  
  .product-image-wrapper {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 16rem;
  }
  
  .product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: all 0.3s ease;
  }
  
  .product-image--base {
    position: relative;
    z-index: 1;
  }
  
  .product-image--overlay {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    opacity: 0;
  }
  
  .product-card:hover .product-image--base {
    transform: scale(1.05);
  }
  
  .product-card:hover .product-image--overlay {
    opacity: 1;
  }
  
  .product-info {
    padding: 1.5rem;
  }
  
  .product-info h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 1rem;
  }
  
  .product-info .btn-primary {
    width: 100%;
    padding: 0.75rem;
    font-weight: 600;
  }
}

.product-grid-mobile {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 768px) {
  .product-grid-mobile {
    display: none;
  }
}

.product-card-mobile {
  background: #fff;
  border-radius: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.product-image-wrapper-mobile {
  width: 100%;
  height: 12rem;
}

.product-image-mobile {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info-mobile {
  padding: 1rem;
}

.product-info-mobile h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.75rem;
}

.product-info-mobile .btn-primary {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.three-step-section {
  padding: 5rem 1.5rem;
  background: #ffffff;
}

.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .steps-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.step-card {
  background: #fff;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.step-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #d1d5db;
}

.step-header {
  display: flex;
  align-items: flex-start;
  padding: 1.5rem 1.5rem 0;
}

.step-number {
  font-size: 2rem;
  font-weight: 300;
  color: #d1d5db;
  line-height: 1;
}

.step-divider {
  width: 2px;
  height: 3rem;
  background: #e5e7eb;
  margin-left: 0.75rem;
  margin-top: 0.25rem;
}

.step-content {
  padding: 0 1.5rem 1.5rem;
}

.step-title-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.step-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #6b7280;
  margin-right: 0.75rem;
}

.step-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.step-description {
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 0.75rem;
}

.step-description strong {
  color: #0f172a;
  font-weight: 600;
}

.step-tip {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1.25rem;
}

.step-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.step-tag {
  font-size: 0.75rem;
  color: #4b5563;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.platform-section {
  padding: 5rem 1.5rem;
  background: #f9fafb;
}

.platform-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
}

@media (min-width: 768px) {
  .platform-content {
    flex-direction: row;
    justify-content: space-between;
  }
}

.platform-left {
  text-align: center;
}

@media (min-width: 768px) {
  .platform-left {
    width: 50%;
    text-align: left;
  }
}

.platform-left h2 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

@media (min-width: 768px) {
  .platform-left h2 {
    font-size: 2.5rem;
  }
}

.platform-link {
  font-size: 0.875rem;
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
}

.platform-link:hover {
  text-decoration: underline;
}

.platform-right {
  width: 100%;
}

@media (min-width: 768px) {
  .platform-right {
    width: 50%;
  }
}

.platform-tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.platform-tag {
  width: 60px;
  height: 60px;
  background-color: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.platform-tag img {
  max-width: 80%;
  max-height: 80%;
}

.platform-tag:hover {
  background-color: #6366f1;
  transform: scale(1.05);
}

.platform-tag-more {
  font-size: 1.5rem;
  color: #1f2937;
}

.template-section,
.artwork-section,
.storefront-section,
.benefits-section,
.testimonials-section {
  padding: 4rem 1.5rem;
}

.testimonials-section {
  background: #f9fafb;
}

.testimonials-header {
  text-align: center;
  margin-bottom: 4rem;
}

.testimonials-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .testimonials-header h2 {
    font-size: 2.5rem;
  }
}

.testimonials-header p {
  font-size: 1.125rem;
  color: #6b7280;
  max-width: 38rem;
  margin: 0 auto;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

@media (min-width: 768px) {
  .testimonials-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .testimonials-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.testimonial-card {
  background: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: box-shadow 0.2s ease;
}

.testimonial-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.testimonial-stars {
  display: flex;
  gap: 0.125rem;
  margin-bottom: 1rem;
}

.testimonial-stars .star {
  color: #fbbf24;
}

.testimonial-text {
  font-size: 0.9375rem;
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.author-handle {
  font-size: 0.8125rem;
  color: #6b7280;
}

.testimonials-cta {
  text-align: center;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: #6366f1;
  color: #ffffff;
  font-weight: 600;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
}

.cta-button:hover {
  background: #4f46e5;
}

.template-section,
.artwork-section,
.storefront-section,
.benefits-section {
  padding: 4rem 1.5rem;
}

.template-section,
.storefront-section {
  background: #ffffff;
}

.artwork-section,
.benefits-section {
  background: #f8fafc;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  padding: 0.36rem 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-header h2 {
  font-size: 2.25rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
}

.section-header p {
  color: #6b7280;
  font-size: 1.05rem;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.benefit-card {
  background: #fff;
  border: 1px solid #ede9fe;
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.08);
}

.benefit-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(99, 102, 241, 0.14);
  border-color: #c4b5fd;
}

.benefit-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 1.4rem;
  font-weight: 900;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
}

.benefit-card h3 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 0.75rem;
}

.benefit-card p {
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.65;
  margin: 0;
}

.gallery-section {
  background: #f9fafb;
  padding: 4rem 1.5rem;
}

.gallery-filters,
.artwork-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.gallery-filters-left {
  flex: 1 1 320px;
  min-width: 0;
  display: flex;
}

.gallery-filters-right {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
  align-items: center;
}

.gallery-search-wrapper {
  position: relative;
  min-width: 200px;
  max-width: 280px;
}

.gallery-search-input {
  width: 100%;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0 0.75rem 0 2.25rem;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.gallery-search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.gallery-search-icon {
  position: absolute;
  left: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.75rem;
}

.gallery-recent-dropdown {
  position: relative;
}

.gallery-recent-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 36px;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: none;
  background: #6366f1;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gallery-recent-btn:hover {
  background: #4f46e5;
}

.gallery-recent-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  width: 14rem;
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  z-index: 100;
}

.gallery-recent-header {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.gallery-recent-header span {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.gallery-recent-empty {
  padding: 1rem 0.75rem;
  font-size: 0.875rem;
  color: #9ca3af;
  text-align: center;
}

.gallery-recent-list {
  max-height: 12rem;
  overflow-y: auto;
}

.gallery-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.gallery-recent-item:hover {
  background-color: #f3f4f6;
}

.gallery-recent-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-recent-badge {
  font-size: 0.75rem;
  color: #6b7280;
  background: #e5e7eb;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

.gallery-recent-btn svg.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}

.gallery-recent-btn svg {
  transition: transform 0.2s ease;
}

.gallery-filters :deep(.filter-dropdown) {
  min-width: 160px;
}

.gallery-filters :deep(.filter-dropdown-trigger) {
  height: 36px;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  background: #fff;
  transition: all 0.2s ease;
  padding: 0 0.75rem;
}

.gallery-filters :deep(.filter-dropdown-trigger:hover) {
  border-color: #9ca3af;
}

.gallery-filters :deep(.filter-dropdown-trigger:focus-within) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.gallery-filters :deep(.category-cascade),
.artwork-filters :deep(.category-cascade) {
  width: 100%;
  gap: 0.5rem;
}

.gallery-filters :deep(.cascade-grid),
.artwork-filters :deep(.cascade-grid) {
  gap: 0.5rem;
}

.gallery-filters :deep(.cascade-select-trigger),
.artwork-filters :deep(.cascade-select-trigger) {
  height: 36px;
  min-height: 36px;
  padding: 0 0.7rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  border-color: #d1d5db;
}

.gallery-filters :deep(.cascade-select-trigger:hover),
.artwork-filters :deep(.cascade-select-trigger:hover) {
  border-color: #9ca3af;
}

.artwork-filters :deep(.filter-dropdown-trigger) {
  height: 36px;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  background: #fff;
  transition: all 0.2s ease;
  padding: 0 0.75rem;
}

.artwork-filters :deep(.filter-dropdown-trigger:hover) {
  border-color: #9ca3af;
}

.artwork-filters :deep(.filter-dropdown-trigger:focus-within) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.gallery-loading,
.gallery-error,
.gallery-empty {
  margin-top: 1rem;
  color: #475569;
  font-weight: 600;
}

.gallery-error {
  color: #ef4444;
}

.feature-grid {
  margin-top: 1.5rem;
  display: grid;
  gap: 1.5rem;
}

.feature-grid--templates {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .feature-grid--templates {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .feature-grid--templates {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .feature-grid--templates {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.feature-grid--artwork {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .feature-grid--artwork {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .feature-grid--artwork {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .feature-grid--artwork {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.feature-grid--storefronts {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .feature-grid--storefronts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .feature-grid--storefronts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.feature-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;
}

.feature-card:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.feature-card--storefront-link {
  color: inherit;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.feature-card--storefront-link:hover,
.feature-card--storefront-link:focus-visible {
  transform: translateY(-3px);
  border-color: #c7d2fe;
  box-shadow: 0 18px 36px rgba(79, 70, 229, 0.14);
}

.feature-card-media {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%);
  cursor: zoom-in;
}

.feature-card-media--clickable {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card-media--clickable img {
  transition: transform 0.3s ease;
}

.feature-card-media--clickable:hover img,
.feature-card-media--clickable:focus-visible img {
  transform: scale(1.04);
}

.feature-card-media--clickable:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.feature-card--storefront-link .feature-card-media {
  cursor: pointer;
}

.feature-card-media--square {
  aspect-ratio: 1 / 1;
}

.feature-card-media img,
.feature-card-placeholder {
  width: 100%;
  height: 100%;
}

.feature-card-media img {
  display: block;
  object-fit: cover;
}

.feature-card--template .feature-card-media,
.feature-card--artwork .feature-card-media {
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}

.feature-card--template .feature-card-media {
  aspect-ratio: 4 / 3;
}

.feature-card--artwork .feature-card-media {
  aspect-ratio: 1 / 1;
  padding: 0;
}

.feature-card--storefront .feature-card-media {
  aspect-ratio: 16 / 9;
}

.feature-card--storefront .feature-card-media img {
  object-fit: cover;
}

.feature-card--template .feature-card-media img,
.feature-card--artwork .feature-card-media img {
  border-radius: 0.6rem;
  object-fit: contain;
}

.feature-card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4338ca;
  font-size: 2rem;
  font-weight: 800;
}

.feature-card-body {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
}

.feature-card-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.75rem;
}

.feature-card-top h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.4;
}

.feature-card-badge,
.artwork-card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
}

.feature-card-badge.info {
  background: #eef2ff;
  color: #4338ca;
}

.feature-card-badge.success {
  background: #ecfdf5;
  color: #047857;
}

.feature-card-badge.paid,
.artwork-card-badge.paid {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.feature-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  color: #6366f1;
  font-size: 0.78rem;
  font-weight: 700;
}

.pagination-bar {
  margin-top: 1rem;
  padding: 1rem 0;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.pagination-summary {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pagination-status {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.pagination-btn {
  min-height: 36px;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #334155;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f9fafb;
}

.pagination-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  background: #fff;
  color: #6366f1;
  border: 2px solid #6366f1;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #6366f1;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35);
}

.btn-large {
  padding: 1.1rem 2.5rem;
  font-size: 1.05rem;
}

.home-hover-card {
  position: fixed;
  z-index: 4000;
  width: min(420px, calc(100vw - 24px));
  max-height: min(620px, calc(100vh - 24px));
  border: 1px solid #dbe3f0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
  overflow: auto;
  overscroll-behavior: contain;
  pointer-events: none;
}

.home-hover-card--bottom-left {
  transform: none;
}

.home-hover-card--bottom-right {
  transform: none;
}

.home-hover-card--top-left {
  transform: none;
}

.home-hover-card--top-right {
  transform: none;
}

.home-hover-card-media {
  aspect-ratio: 16 / 8;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
  overflow: hidden;
}

.home-hover-card-media.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-hover-card-media img,
.home-hover-card-placeholder {
  width: 100%;
  height: 100%;
}

.home-hover-card-media img {
  display: block;
  object-fit: cover;
}

.home-hover-card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4338ca;
  font-size: 2.2rem;
  font-weight: 800;
}

.home-hover-card-body {
  display: grid;
  gap: 0.7rem;
  padding: 0.9rem 0.95rem 1rem;
}

.home-hover-card-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.75rem;
}

.home-hover-card-top h3 {
  margin: 0.2rem 0 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.4;
}

.home-hover-card-eyebrow {
  display: inline-flex;
  color: #6366f1;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-hover-card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.28rem 0.58rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}

.home-hover-card-badge.info {
  background: #eef2ff;
  color: #4338ca;
}

.home-hover-card-badge.paid {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.home-hover-card-badge.success {
  background: #ecfdf5;
  color: #047857;
}

.home-hover-card-rows {
  display: grid;
  gap: 0.55rem;
}

.home-hover-card-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
}

.home-hover-card-row span {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.home-hover-card-row strong {
  color: #0f172a;
  font-size: 0.88rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.home-hover-card-copy {
  margin: 0;
  color: #475569;
  line-height: 1.6;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 3rem 1.25rem 4rem;
  }

  .hero-content {
    gap: 2rem;
  }

  .hero-title {
    font-size: clamp(1.75rem, 6vw, 2.25rem);
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-actions .btn-primary.btn-large,
  .hero-actions .btn-secondary.btn-large {
    width: 100%;
    max-width: 340px;
    padding: 0.85rem 1.75rem;
  }

  .hero-features {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: center;
  }

  .hero-feature {
    font-size: 0.85rem;
    padding: 0.35rem 0.75rem;
  }

  .hero-carousel {
    aspect-ratio: 4 / 3;
  }

  .gallery-filters {
    grid-template-columns: 1fr;
  }

  .artwork-filters {
    grid-template-columns: 1fr;
  }

  .feature-grid--templates,
  .feature-grid--storefronts {
    grid-template-columns: 1fr;
  }

  .feature-grid--artwork {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .feature-grid--artwork {
    grid-template-columns: 1fr;
  }

  .pagination-bar {
    align-items: stretch;
  }

  .pagination-actions {
    width: 100%;
    justify-content: space-between;
  }
}

/* Source of Truth: spec lock-mockup100-final-pricing-products-scheme §Four-product Catalogue (snapshot block) */
.snapshot-section {
  padding: 4rem 1.5rem 3rem;
  background: #ffffff;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.snapshot-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem 1.4rem 1.4rem;
  border: 1px solid #e2e8f0;
  border-radius: 1.15rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.snapshot-card:hover {
  transform: translateY(-4px);
  border-color: #c7d2fe;
  box-shadow: 0 20px 38px rgba(79, 70, 229, 0.12);
}

.snapshot-kicker {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.snapshot-card--token .snapshot-kicker {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.snapshot-card--grading .snapshot-kicker {
  background: #ecfdf5;
  color: #047857;
}

.snapshot-card--wp-pro .snapshot-kicker {
  background: #fef3c7;
  color: #b45309;
}

.snapshot-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.snapshot-subtitle {
  margin: 0;
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.55;
}

.snapshot-price-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: auto;
  padding-top: 0.5rem;
}

.snapshot-price {
  font-size: 1.65rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.snapshot-price-suffix {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
}

.snapshot-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.4rem;
  padding: 0.7rem 1rem;
  border-radius: 0.7rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.snapshot-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.28);
}

/* Plan v3 §S2.5：grading snapshot 卡 30 天 trial 文案与 CTA。 */
.snapshot-trial-note {
  margin: 0.6rem 0 0;
  color: #0e7490;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.5;
}

.snapshot-trial-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.35rem;
  color: #0e7490;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
}

.snapshot-trial-cta:hover {
  text-decoration: underline;
}

.snapshot-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.snapshot-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.75rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.snapshot-action--primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.28);
}

.snapshot-action--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.38);
}

.snapshot-action--secondary {
  background: #fff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}

.snapshot-action--secondary:hover {
  background: #eef2ff;
  transform: translateY(-2px);
}

@media (max-width: 960px) {
  .snapshot-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .snapshot-grid {
    grid-template-columns: 1fr;
  }
}
</style>
