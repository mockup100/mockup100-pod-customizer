<template>
  <div class="preview-page" :class="{ 'preview-page--wp-shell': isWordPressShell }">
    <div class="preview-topbar">
      <div class="hero-nav">
        <a
          v-if="isWordPressShell && wordpressShell"
          class="wordpress-shell-brand"
          :href="wordpressShell.homeUrl || '/'"
        >
          <img
            v-if="wordpressShell.siteLogoUrl"
            class="wordpress-shell-brand-logo"
            :src="wordpressShell.siteLogoUrl"
            :alt="wordpressShell.siteTitle || 'WordPress site'"
          >
          <span class="wordpress-shell-brand-title">{{ wordpressShell.siteTitle || 'WordPress' }}</span>
        </a>
        <button v-else type="button" class="back-btn" @click="handleBackLinkClick">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>{{ backLinkLabel }}</span>
        </button>
        <RouterLink v-if="!isWordPressShell" to="/" class="preview-brand-link">
          <BrandLogo size="preview" />
        </RouterLink>
        <div class="product-actions">
          <!-- Bug 2-2: WordPress shell 模式下隐藏 Export 与 Results 入口 -->
          <button v-if="!isWordPressShell" type="button" class="action-btn secondary" @click="exportModalOpen = true">
            {{ t("export") }}
          </button>
          <button v-if="!isWordPressShell" type="button" class="action-btn secondary" @click="resultsModalOpen = true" data-testid="preview-open-results">
            {{ t("results") }}
            <span class="action-btn-badge">{{ resultsBadgeCount }}</span>
          </button>
          <button type="button" class="action-btn secondary" :disabled="!selectedTemplateId || isReadOnlyPreview" @click="openDraftsPanel">
            {{ t("drafts") }}
            <span class="action-btn-badge">{{ draftsBadgeCount }}</span>
          </button>
          <button
            v-if="!isWordPressShell"
            type="button"
            class="action-btn secondary"
            :disabled="!canOpenGrading"
            :title="editorLoading || canOpenGrading ? undefined : t('gradingMissing')"
            data-testid="preview-open-grading"
            @click="openGradingModal"
          >
            {{ t("grading") }}
          </button>
          <button
            type="button"
            class="action-btn secondary"
            :disabled="isSavingTemplate || isSavingDraftToServer || isReadOnlyPreview || !selectedTemplateId"
            @click="requestNewBlankWorkspace"
          >
            {{ t("newDraftWorkspace") }}
          </button>
          <button
            type="button"
            class="action-btn primary"
            :class="{ saved: Boolean(saveNotice) }"
            :disabled="isSavingTemplate || isSavingDraftToServer || isReadOnlyPreview"
            @click="saveTemplate"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {{ (isSavingTemplate || isSavingDraftToServer) ? t("saving") : (saveNotice || t("save")) }}
          </button>
          <button
            type="button"
            class="action-btn secondary"
            :disabled="isSavingTemplate || isSavingDraftToServer || isReadOnlyPreview || !selectedTemplateId"
            @click="saveAsTemplate"
          >
            {{ t("saveAs") }}
          </button>
          <div class="locale-select" :aria-label="t('language')">
            <FilterDropdown
              :model-value="selectedLocale"
              :options="localeOptions"
              @update:model-value="updateLocale"
            />
          </div>
          <button
            v-if="isWordPressShell && wordpressCurrentProduct"
            type="button"
            class="wordpress-place-order-btn"
            :title="t('placeOrderShort')"
            :aria-label="t('placeOrderShort')"
            :disabled="!wordpressCurrentProduct"
            @click="openPlaceOrderModal"
          >
            <!-- Bug 4: 下单按钮换成钱袋$ buy 图标，避免与购物车/剪贴板混淆 -->
            <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 1v22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </button>
          <div v-if="isWordPressShell && wordpressShell" class="wordpress-shell-nav">
            <a
              v-if="wordpressShell.cartUrl"
              class="wordpress-shell-icon-link"
              :href="wordpressShell.cartUrl"
              :title="t('cart')"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4zM7 13l-1 5h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <span v-if="Number(wordpressShell.cartCount || 0) > 0" class="wordpress-shell-cart-badge">{{ wordpressShell.cartCount }}</span>
            </a>
            <a
              v-if="wordpressShell.accountUrl || wordpressShell.loginUrl"
              class="wordpress-shell-icon-link"
              :href="wordpressShell.accountUrl || wordpressShell.loginUrl || '#'"
              :title="t('account')"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 14a4 4 0 10-8 0m8 0a4 4 0 01-8 0m8 0v1a3 3 0 01-3 3H11a3 3 0 01-3-3v-1m8 0H8" />
              </svg>
            </a>
          </div>
          <div v-else class="user-dropdown" :class="{ open: showUserDropdown }">
            <button class="user-menu-trigger" type="button" @click.stop="toggleUserDropdown">
              <div class="user-avatar">
                <span>{{ userInitials }}</span>
              </div>
              <span class="user-name">{{ userDisplayName }}</span>
              <svg class="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div class="dropdown-menu">
              <div class="dropdown-header">
                <div class="dropdown-user-info">
                  <div class="dropdown-user-name">{{ userDisplayName }}</div>
                  <div class="dropdown-user-email">{{ authAccount?.email }}</div>
                </div>
              </div>

              <div class="dropdown-divider"></div>
              <div class="dropdown-body">
                <div v-for="section in previewDropdownSections" :key="section.key" class="dropdown-section">
                  <div class="dropdown-section-title">{{ section.title }}</div>
                  <button
                    v-for="item in section.items"
                    :key="item.key"
                    class="dropdown-item"
                    :class="{ active: isPreviewDropdownItemActive(item.to) }"
                    type="button"
                    @click="navigateFromDropdown(item.to)"
                  >
                    <span class="item-icon">{{ item.icon }}</span>
                    <span>{{ item.label }}</span>
                  </button>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-footer">
                <button class="dropdown-item" type="button" @click="navigateFromDropdown('/')">
                  <span class="item-icon">🏠</span>
                  <span>{{ t("publicSite") }}</span>
                </button>
                <button class="dropdown-item logout-item" type="button" @click="handleLogout">
                  <span class="item-icon">🚪</span>
                  <span>{{ t("signOut") }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isRendering || isBatchExporting || isBatchDownloading" class="progress-banner">
      <div class="progress-content">
        <div class="progress-indicator">
          <div class="progress-spinner"></div>
          <div class="progress-copy">
            <strong class="progress-title">
              {{
                isRendering
                  ? t("renderingMockups")
                  : (isBatchDownloading ? t("preparingZipDownload") : t("exportingResults"))
              }}
            </strong>
            <span class="progress-text">
              {{
                isRendering
                  ? t("renderingHint")
                  : (isBatchDownloading ? t("preparingZipHint") : t("exportingResultsHint"))
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-container">
      <aside class="workspace-nav">
        <button
          v-for="tab in sidebarTabs"
          :key="tab.key"
          type="button"
          class="workspace-nav-item"
          :class="{ active: activeSidebarTab === tab.key }"
          @click="setActiveSidebarTab(tab.key)"
        >
          <span class="workspace-nav-icon" aria-hidden="true">
            <svg v-if="tab.key === 'products'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M8 13h8" /></svg>
            <svg v-else-if="tab.key === 'product-details'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
            <svg v-else-if="tab.key === 'template'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7l8-4 8 4-8 4-8-4zm0 5l8 4 8-4m-16 5l8 4 8-4" /></svg>
            <svg v-else-if="tab.key === 'artwork'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <svg v-else-if="tab.key === 'text'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 5h10M12 5v14M9 19h6" /></svg>
            <svg v-else-if="tab.key === 'layers'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4l8 4-8 4-8-4 8-4zm0 8l8 4-8 4-8-4 8-4z" /></svg>
            <svg v-else-if="tab.key === 'svg'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7l8-4 8 4-8 4-8-4zM4 17l8 4 8-4M12 11v10" /></svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428A8 8 0 118.572 4.572a8 8 0 0110.856 10.856z" /></svg>
          </span>
          <span class="workspace-nav-label">{{ tab.label }}</span>
        </button>
      </aside>

      <aside class="workspace-sidebar workspace-sidebar--tools">
        <section class="sidebar-panel sidebar-panel--workspace sidebar-panel--tools">
          <div class="panel-header panel-header--compact">
            <div>
              <h3 class="panel-title">{{ activeSidebarTitle }}</h3>
            </div>
            <span v-if="activeSidebarBadge" class="panel-badge">{{ activeSidebarBadge }}</span>
          </div>

          <div v-if="activeSidebarTab === 'products' && isWordPressShell" class="workspace-panel-content workspace-panel-content--products">
            <div class="template-library-filters wordpress-product-filters">
              <div class="template-filter-row template-filter-row--products">
                <input
                  :value="wordpressProductSearch"
                  type="text"
                  class="template-search-input"
                  :placeholder="t('searchProducts')"
                  @input="updateWordPressProductSearch(($event.target as HTMLInputElement).value)"
                />
                <div class="template-category-popover" :class="{ open: showWordPressProductCategoryPopover }">
                  <button
                    type="button"
                    class="template-filter-icon-btn"
                    :class="{ active: wordpressProductCategoryId !== '' }"
                    :title="t('filterCategories')"
                    @click.stop="toggleWordPressProductCategoryPopover($event)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18M6 12h12M10 19h4" />
                    </svg>
                  </button>
                  <Teleport to="body">
                    <div
                      v-if="showWordPressProductCategoryPopover"
                      class="template-category-panel template-category-panel--floating"
                      :style="categoryPopoverPosition ? { top: categoryPopoverPosition.top + 'px', left: categoryPopoverPosition.left + 'px', width: categoryPopoverPosition.width + 'px' } : undefined"
                      @click.stop
                    >
                      <CategoryCascadeSelector
                        :model-value="wordpressProductCategoryId || ''"
                        :categories="wordpressProductCategoryTree"
                        clear-value=""
                        :allow-non-leaf="true"
                        display-mode="panel"
                        :level1-placeholder="t('allCategories')"
                        :level2-placeholder="t('selectLevel2')"
                        :level3-placeholder="t('selectLevel3')"
                        :helper-text="t('filterTemplatesByCategory')"
                        recent-storage-key="mockup-wordpress-product-categories"
                        @update:model-value="updateWordPressProductCategory"
                      />
                    </div>
                  </Teleport>
                </div>
              </div>
            </div>

            <div class="workspace-scroll-area wordpress-product-scroll-area">
              <section class="wordpress-product-panel">
                <div v-if="wordpressProductError" class="status-message error">{{ wordpressProductError }}</div>
                <div v-else-if="wordpressProductLoading && !wordpressProductItems.length" class="wordpress-product-empty">
                  {{ t("loadingProducts") }}
                </div>
                <div v-else-if="wordpressProductItems.length">
                  <div class="library-grid library-grid--templates">
                    <button
                      v-for="product in wordpressProductItems"
                      :key="product.product_id"
                      type="button"
                      class="library-tile library-tile--template"
                      :class="{ active: product.product_id === currentWordPressProductId }"
                      :title="product.name"
                      @click="switchWordPressProduct(product)"
                    >
                      <span class="library-tile-thumb">
                        <img
                          v-if="product.image_url"
                          :src="product.image_url"
                          :alt="product.name"
                        />
                        <span v-else>{{ product.name.slice(0, 1).toUpperCase() }}</span>
                        <span class="library-tile-name">{{ product.name }}</span>
                      </span>
                    </button>
                  </div>
                </div>
                <div v-else class="wordpress-product-empty">{{ t("noProductsMatch") }}</div>
              </section>
            </div>

            <div v-if="wordpressProductTotalPages > 1" class="pagination-controls wordpress-product-pagination">
              <button type="button" class="pagination-btn" :disabled="wordpressProductPage <= 1" @click="goToWordPressProductPage(wordpressProductPage - 1)">
                {{ t("prev") }}
              </button>
              <span class="pagination-status">{{ wordpressProductPage }} / {{ wordpressProductTotalPages }}</span>
              <button type="button" class="pagination-btn" :disabled="wordpressProductPage >= wordpressProductTotalPages" @click="goToWordPressProductPage(wordpressProductPage + 1)">
                {{ t("next") }}
              </button>
            </div>
          </div>

          <div v-else-if="activeSidebarTab === 'product-details' && isWordPressShell" class="workspace-panel-content workspace-panel-content--products">
            <div class="workspace-scroll-area wordpress-product-scroll-area">
              <section class="wordpress-product-panel">
                <div v-if="wordpressCurrentProduct" class="wordpress-current-product">
                  <div class="wordpress-current-product-card">
                    <div class="wordpress-current-product-thumb">
                      <img
                        v-if="wordpressCurrentProduct.image_url"
                        :src="wordpressCurrentProduct.image_url"
                        :alt="wordpressCurrentProduct.name"
                      >
                      <div v-else class="wordpress-current-product-thumb wordpress-current-product-thumb--empty">{{ t("productDetails") }}</div>
                    </div>
                    <div class="wordpress-current-product-body">
                      <div class="wordpress-current-product-name">{{ wordpressCurrentProduct.name }}</div>
                      <div
                        v-if="wordpressCurrentProduct.price_html"
                        class="wordpress-current-product-price"
                        v-html="wordpressCurrentProduct.price_html"
                      ></div>
                      <div v-if="wordpressCurrentProductCategories" class="wordpress-current-product-meta">
                        {{ wordpressCurrentProductCategories }}
                      </div>
                    </div>
                  </div>
                  <div class="wordpress-product-details-card">
                    <div class="wordpress-product-details-header">{{ t("productDetails") }}</div>
                    <div v-if="wordpressCurrentProductAttributes.length" class="wordpress-product-detail-block">
                      <div class="wordpress-product-details-label">{{ t("attributes") }}</div>
                      <div class="wordpress-product-chip-list">
                        <span
                          v-for="attribute in wordpressCurrentProductAttributes"
                          :key="`${attribute.name}:${attribute.options.join('|')}`"
                          class="wordpress-product-chip"
                        >
                          {{ attribute.name }}: {{ attribute.options.join(" / ") }}
                        </span>
                      </div>
                    </div>
                    <div v-if="wordpressCurrentProduct.tag_names.length" class="wordpress-product-detail-block">
                      <div class="wordpress-product-details-label">{{ t("tags") }}</div>
                      <div class="wordpress-product-chip-list">
                        <span
                          v-for="tag in wordpressCurrentProduct.tag_names"
                          :key="tag"
                          class="wordpress-product-chip wordpress-product-chip--muted"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                    <div v-if="wordpressCurrentProductGallery.length" class="wordpress-product-detail-block">
                      <div class="wordpress-product-details-label">{{ t("gallery") }}</div>
                      <div class="wordpress-product-gallery">
                        <img
                          v-for="(image, index) in wordpressCurrentProductGallery"
                          :key="`${image}:${index}`"
                          :src="image"
                          :alt="`${wordpressCurrentProduct.name} ${index + 1}`"
                        >
                      </div>
                    </div>
                    <div v-if="wordpressCurrentProduct.description" class="wordpress-product-detail-block">
                      <div class="wordpress-product-details-label">{{ t("description") }}</div>
                      <div class="wordpress-product-details-text">{{ wordpressCurrentProduct.description }}</div>
                    </div>
                    <a
                      v-if="wordpressCurrentProduct.permalink"
                      class="wordpress-product-link"
                      :href="wordpressCurrentProduct.permalink"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ t("openProductPage") }}
                    </a>
                  </div>
                </div>
                <div v-else class="wordpress-product-empty">{{ t("noProductsMatch") }}</div>
              </section>
            </div>
          </div>

          <div v-else-if="activeSidebarTab === 'template'" class="workspace-panel-content workspace-panel-content--template">
            <div class="segment-switch">
              <button
                v-for="scope in visibleTemplateScopes"
                :key="scope"
                type="button"
                class="segment-switch-item"
                :class="{ active: templateLibraryScope === scope }"
                @click="browseTemplateLibraryTab(scope)"
              >
                {{ resolveTemplateScopeLabel(scope) }}
              </button>
            </div>
            <div class="template-library-filters">
              <div class="template-filter-row">
                <input
                  :value="templateSearchState[templateLibraryScope]"
                  type="text"
                  class="template-search-input"
                  :placeholder="t('searchNameCode')"
                  @input="updateTemplateSearch(($event.target as HTMLInputElement).value)"
                />
                <div class="template-category-popover" :class="{ open: showTemplateCategoryPopover }">
                  <button
                    type="button"
                    class="template-filter-icon-btn"
                    :class="{ active: currentTemplateCategoryId !== 'all' }"
                    :title="t('filterCategories')"
                    @click.stop="toggleTemplateCategoryPopover($event)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18M6 12h12M10 19h4" />
                    </svg>
                  </button>
                  <Teleport to="body">
                    <div
                      v-if="showTemplateCategoryPopover"
                      class="template-category-panel template-category-panel--floating"
                      :style="categoryPopoverPosition ? { top: categoryPopoverPosition.top + 'px', left: categoryPopoverPosition.left + 'px', width: categoryPopoverPosition.width + 'px' } : undefined"
                      @click.stop
                    >
                      <CategoryCascadeSelector
                        :model-value="currentTemplateCategoryId"
                        :categories="templateCategories"
                        clear-value="all"
                        :allow-non-leaf="true"
                        display-mode="panel"
                        :level1-placeholder="t('allCategories')"
                        :level2-placeholder="t('selectLevel2')"
                        :level3-placeholder="t('selectLevel3')"
                        :helper-text="t('filterTemplatesByCategory')"
                        recent-storage-key="mockup-preview-template-categories"
                        @update:model-value="updateTemplateCategoryFilter"
                      />
                    </div>
                  </Teleport>
                </div>
              </div>
            </div>
            <div v-if="visibleTemplateEntries.length" ref="templateLibraryScrollRef" class="workspace-scroll-area template-library-scroll-area" @scroll="clearHoveredTemplate">
              <div class="library-grid library-grid--templates">
                <button
                  v-for="template in pagedTemplateEntries"
                  :key="`${template.source}-${template.template_id}`"
                  type="button"
                  class="library-tile library-tile--template"
                  :class="{ active: isTemplateActive(template) }"
                  :title="template.display_name"
                  @mouseenter="setHoveredTemplate(template, $event)"
                  @mouseleave="clearHoveredTemplate"
                  @focus="setHoveredTemplate(template, $event)"
                  @blur="clearHoveredTemplate"
                  @click="selectWorkspaceTemplate(template)"
                >
                  <span class="library-tile-thumb">
                    <img
                      v-if="resolveTemplateCoverUrl(template)"
                      :src="resolveTemplateCoverUrl(template)"
                      :alt="template.display_name"
                      @error="handleTemplateCardImageError(template)"
                    />
                    <span v-else>{{ template.display_name.slice(0, 1).toUpperCase() }}</span>
                    <span
                      v-if="resolveTemplateAccessScope(template) === 'private'"
                      class="library-tile-scope-badge library-tile-scope-badge--private"
                      :title="t('privateAccess')"
                      :aria-label="t('privateAccess')"
                    >
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                        <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
                      </svg>
                    </span>
                    <span class="library-tile-name">{{ template.display_name }}</span>
                  </span>
                </button>
              </div>
            </div>
            <div v-if="!visibleTemplateEntries.length" class="tool-empty">
              {{ templateLibraryEmptyState }}
            </div>
            <div v-else-if="templateTotalPages > 1" class="pagination-bar">
              <button type="button" class="pagination-btn" :disabled="templatePage <= 1" @click="goToTemplatePage(templatePage - 1)">
                {{ t("prev") }}
              </button>
              <span class="pagination-status">{{ templatePage }} / {{ templateTotalPages }}</span>
              <button type="button" class="pagination-btn" :disabled="templatePage >= templateTotalPages" @click="goToTemplatePage(templatePage + 1)">
                {{ t("next") }}
              </button>
            </div>
            <teleport to="body">
              <div
                v-if="hoveredTemplateEntry"
                class="template-hover-card hover-overlay"
                :class="hoveredTemplatePlacement"
                :style="hoveredTemplateStyle"
              >
                <div class="template-hover-preview">
                  <img
                    v-if="resolveTemplateCoverUrl(hoveredTemplateEntry)"
                    :src="resolveTemplateCoverUrl(hoveredTemplateEntry)"
                    :alt="hoveredTemplateEntry.display_name"
                    @error="handleTemplateCardImageError(hoveredTemplateEntry)"
                  />
                  <span v-else>{{ hoveredTemplateEntry.display_name.slice(0, 1).toUpperCase() }}</span>
                </div>
                <div class="template-hover-body">
                  <strong class="template-hover-title">{{ hoveredTemplateEntry.display_name }}</strong>
                  <span v-if="resolveTemplateAccessScope(hoveredTemplateEntry) === 'private'" class="template-hover-chip-row">
                    <span class="template-hover-chip template-hover-chip--private">
                      {{ resolveTemplateAccessScopeLabel(hoveredTemplateEntry) }}
                    </span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("code") }}</b>
                    <span class="template-hover-meta-value">{{ hoveredTemplateEntry.template_code || hoveredTemplateEntry.template_id || "N/A" }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("category") }}</b>
                    <span class="template-hover-meta-value">{{ resolveTemplateCategory(hoveredTemplateEntry) }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("time") }}</b>
                    <span class="template-hover-meta-value">{{ resolveTemplateTime(hoveredTemplateEntry) }}</span>
                  </span>
                  <span v-if="hoveredTemplateEntry.source !== 'shared' && hoveredTemplateEntry.source !== 'draft' && resolveTemplateCreator(hoveredTemplateEntry)" class="template-hover-meta">
                    <b>{{ t("creator") }}</b>
                    <span class="template-hover-meta-value">{{ resolveTemplateCreator(hoveredTemplateEntry) }}</span>
                  </span>
                </div>
              </div>
            </teleport>
          </div>

          <div v-else-if="activeSidebarTab === 'artwork'" class="workspace-panel-content workspace-panel-content--artwork">
            <div class="workspace-primary-actions workspace-primary-actions--stack">
              <button type="button" class="tool-btn primary" @click="openArtworkPicker" data-testid="preview-upload-image">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {{ t("upload") }}
              </button>
            </div>
            <input
              ref="artworkInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
              class="sr-only"
              data-testid="preview-artwork-input"
              @change="handleArtworkSelected"
            />
            <div class="segment-switch segment-switch--artwork">
              <button type="button" class="segment-switch-item" :class="{ active: artworkLibraryTab === 'platform' }" @click="artworkLibraryTab = 'platform'">
                {{ resolveArtworkLibraryTabLabel("platform") }}
              </button>
              <button type="button" class="segment-switch-item" :class="{ active: artworkLibraryTab === 'tenant' }" @click="artworkLibraryTab = 'tenant'">
                {{ resolveArtworkLibraryTabLabel("tenant") }}
              </button>
              <button type="button" class="segment-switch-item" :class="{ active: artworkLibraryTab === 'licensed' }" @click="artworkLibraryTab = 'licensed'">
                {{ resolveArtworkLibraryTabLabel("licensed") }}
              </button>
              <button type="button" class="segment-switch-item" :class="{ active: artworkLibraryTab === 'owned' }" @click="artworkLibraryTab = 'owned'">
                {{ resolveArtworkLibraryTabLabel("owned") }}
              </button>
            </div>
            <div class="template-library-filters">
              <div class="template-filter-row">
                <input
                  :value="currentArtworkSearch"
                  type="text"
                  class="template-search-input"
                  :placeholder="artworkLibraryTab === 'owned' ? t('searchPersonalImage') : artworkLibraryTab === 'licensed' ? t('searchPurchasedArtwork') : t('searchNameCode')"
                  @input="updateArtworkSearch(($event.target as HTMLInputElement).value)"
                />
                <div v-if="artworkLibraryTab !== 'owned'" class="template-category-popover" :class="{ open: showArtworkCategoryPopover }">
                  <button
                    type="button"
                    class="template-filter-icon-btn"
                    :class="{ active: currentArtworkCategoryId !== 'all' }"
                    :title="t('filterArtworkCategories')"
                    @click.stop="toggleArtworkCategoryPopover($event)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18M6 12h12M10 19h4" />
                    </svg>
                  </button>
                  <Teleport to="body">
                    <div
                      v-if="showArtworkCategoryPopover"
                      class="template-category-panel template-category-panel--floating"
                      :style="categoryPopoverPosition ? { top: categoryPopoverPosition.top + 'px', left: categoryPopoverPosition.left + 'px', width: categoryPopoverPosition.width + 'px' } : undefined"
                      @click.stop
                    >
                      <CategoryCascadeSelector
                        :model-value="currentArtworkCategoryId"
                        :categories="currentArtworkCategories"
                        clear-value="all"
                        :allow-non-leaf="true"
                        display-mode="panel"
                        :level1-placeholder="t('allArtwork')"
                        :level2-placeholder="t('selectLevel2')"
                        :level3-placeholder="t('selectLevel3')"
                        :helper-text="t('filterArtworkByContentCategory')"
                        recent-storage-key="mockup-preview-artwork-categories"
                        @update:model-value="updateArtworkCategoryFilter"
                      />
                    </div>
                  </Teleport>
                </div>
              </div>
            </div>
            <div v-if="artworkFeedbackMessage" class="status-message" :class="artworkFeedbackTone">
              <span>{{ artworkFeedbackMessage }}</span>
              <button
                v-if="pendingArtworkPurchaseEntry"
                type="button"
                class="tool-btn primary inline-action-btn"
                :disabled="buyingArtworkId === pendingArtworkPurchaseEntry.artwork_id"
                @click="purchasePendingArtwork"
              >
                {{ buyingArtworkId === pendingArtworkPurchaseEntry.artwork_id
                  ? t("unlocking")
                  : resolveArtworkUnlockButtonLabel(pendingArtworkPurchaseEntry.price_tokens) }}
              </button>
            </div>
            <div
              v-if="currentArtworkEntries.length"
              ref="artworkLibraryScrollRef"
              class="workspace-scroll-area artwork-library-scroll-area"
              @scroll="clearHoveredArtwork"
            >
              <div class="library-grid library-grid--artwork" :key="`${artworkLibraryTab}:${currentArtworkPage}`">
                <button
                  v-for="artwork in currentArtworkEntries"
                  :key="artworkKey(artwork)"
                  type="button"
                  class="library-tile"
                  :class="{ active: selectedArtworkId === artwork.artwork_id }"
                  :title="resolveArtworkDisplayName(artwork)"
                  :aria-label="getArtworkTileAriaLabel(artwork)"
                  @mouseenter="setHoveredArtwork(artwork, $event)"
                  @mouseleave="scheduleHoveredArtworkClear()"
                  @focus="setHoveredArtwork(artwork, $event)"
                  @blur="scheduleHoveredArtworkClear()"
                  @click="handleArtworkTileAction(artwork)"
                >
                  <span class="library-tile-thumb">
                    <img :src="resolveAssetUrl(artwork.preview_url)" :alt="resolveArtworkDisplayName(artwork)" />
                    <span
                      v-if="resolveArtworkAccessScopeLabel(artwork)"
                      class="library-tile-scope-badge library-tile-scope-badge--private"
                      :title="resolveArtworkAccessScopeLabel(artwork)"
                      :aria-label="resolveArtworkAccessScopeLabel(artwork)"
                    >
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                        <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
                      </svg>
                    </span>
                    <span
                      v-if="shouldShowArtworkTileBadge(artwork)"
                      class="library-tile-cta"
                      :class="getArtworkTileBadgeClass(artwork)"
                      data-testid="preview-artwork-use-indicator"
                    >
                      <span class="library-tile-cta-primary">{{ getArtworkTileBadgeLabel(artwork) }}</span>
                      <span v-if="getArtworkTileBadgeSecondaryLabel(artwork)" class="library-tile-cta-secondary">
                        {{ getArtworkTileBadgeSecondaryLabel(artwork) }}
                      </span>
                    </span>
                    <span class="library-tile-name">{{ resolveArtworkDisplayName(artwork) }}</span>
                  </span>
                </button>
              </div>
            </div>
            <div v-if="artworkLibraryTab === 'owned' && !ownedArtworkLibrary.length" class="tool-empty">{{ t("uploadImageToStartLibrary") }}</div>
            <div v-else-if="artworkLibraryTab === 'licensed' && !licensedArtworkEntries.length" class="tool-empty">{{ t("licensedLibraryEmpty") }}</div>
            <div v-else-if="!currentArtworkEntries.length" class="tool-empty">
              {{ artworkLibraryEmptyState }}
            </div>
            <div v-if="currentArtworkTotalPages > 1" class="pagination-bar">
              <button type="button" class="pagination-btn" :disabled="currentArtworkPage <= 1" @click="goToArtworkPage(currentArtworkPage - 1)">
                {{ t("prev") }}
              </button>
              <span class="pagination-status">{{ currentArtworkPage }} / {{ currentArtworkTotalPages }}</span>
              <button type="button" class="pagination-btn" :disabled="currentArtworkPage >= currentArtworkTotalPages" @click="goToArtworkPage(currentArtworkPage + 1)">
                {{ t("next") }}
              </button>
            </div>
            <TokenPurchaseModal
              :is-open="showArtworkTokenPurchaseModal"
              :title="t('notEnoughTokens')"
              :summary-title="t('buyTokensBeforeUnlockingArtwork')"
              :summary-text="artworkTokenPurchaseSummary"
              :primary-label="t('openTokensManagement')"
              @close="showArtworkTokenPurchaseModal = false"
            />
            <teleport to="body">
              <div
                v-if="hoveredArtworkEntry"
                class="template-hover-card hover-overlay hover-overlay--interactive"
                :class="hoveredArtworkPlacement"
                :style="hoveredArtworkStyle"
                @mouseenter="cancelHoveredArtworkClear()"
                @mouseleave="clearHoveredArtwork()"
              >
                <div class="template-hover-preview">
                  <img :src="resolveAssetUrl(hoveredArtworkEntry.preview_url)" :alt="resolveArtworkDisplayName(hoveredArtworkEntry)" />
                </div>
                <div class="template-hover-body">
                  <strong class="template-hover-title">{{ resolveArtworkDisplayName(hoveredArtworkEntry) }}</strong>
                  <span v-if="resolveArtworkAccessScopeLabel(hoveredArtworkEntry) || getArtworkTilePrimaryLabel(hoveredArtworkEntry)" class="template-hover-chip-row">
                    <span
                      v-if="getArtworkTilePrimaryLabel(hoveredArtworkEntry)"
                      class="template-hover-chip"
                      :class="getArtworkHoverChipClass(hoveredArtworkEntry)"
                    >
                      {{ getArtworkTilePrimaryLabel(hoveredArtworkEntry) }}
                      <template v-if="getArtworkTileSecondaryLabel(hoveredArtworkEntry)">
                        · {{ getArtworkTileSecondaryLabel(hoveredArtworkEntry) }}
                      </template>
                    </span>
                    <span v-if="resolveArtworkAccessScopeLabel(hoveredArtworkEntry)" class="template-hover-chip template-hover-chip--private">
                      {{ resolveArtworkAccessScopeLabel(hoveredArtworkEntry) }}
                    </span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("code") }}</b>
                    <span class="template-hover-meta-value">{{ resolveArtworkCode(hoveredArtworkEntry) }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("category") }}</b>
                    <span class="template-hover-meta-value">{{ resolveArtworkCategory(hoveredArtworkEntry) }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("status") }}</b>
                    <span class="template-hover-meta-value">{{ getArtworkTilePrimaryLabel(hoveredArtworkEntry) }}</span>
                  </span>
                  <span v-if="getArtworkHoverPriceLabel(hoveredArtworkEntry)" class="template-hover-meta">
                    <b>{{ t("price") }}</b>
                    <span class="template-hover-meta-value">{{ getArtworkHoverPriceLabel(hoveredArtworkEntry) }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("click") }}</b>
                    <span class="template-hover-meta-value">{{ getArtworkTileClickHint(hoveredArtworkEntry) }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("time") }}</b>
                    <span class="template-hover-meta-value">{{ resolveArtworkTime(hoveredArtworkEntry) }}</span>
                  </span>
                  <span class="template-hover-meta">
                    <b>{{ t("creator") }}</b>
                    <span class="template-hover-meta-value">{{ resolveArtworkCreator(hoveredArtworkEntry) }}</span>
                  </span>
                </div>
                <div v-if="canRemoveArtworkEntry(hoveredArtworkEntry)" class="template-hover-actions">
                  <button
                    type="button"
                    class="tool-btn danger template-hover-action-btn"
                    @click.stop="removeArtworkCatalogEntry(hoveredArtworkEntry)"
                  >
                    {{ t("delete") }}
                  </button>
                </div>
              </div>
            </teleport>
          </div>

          <div v-else-if="activeSidebarTab === 'text'" class="workspace-panel-content workspace-panel-content--text">
            <div class="workspace-primary-actions workspace-primary-actions--stack">
              <button type="button" class="tool-btn primary" @click="addTextLayer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 5h10M12 5v14M9 19h6" />
                </svg>
                {{ t("addText") }}
              </button>
            </div>
            <div v-if="canEditText" class="text-tools text-tools--simple">
              <div class="tool-panel-card tool-panel-card--simple">
                <label class="tool-field tool-field--stack">
                  <span>{{ t("text") }}</span>
                  <textarea
                    v-model="textDraft"
                    rows="3"
                    class="tool-input tool-textarea"
                    :disabled="!canEditText"
                    @keydown.stop
                    @keyup.stop
                    @input="applyTextSettings"
                  />
                </label>
                <div class="text-toolbar text-toolbar--grid text-toolbar--compact">
                  <label class="tool-field compact">
                    <span>{{ t("size") }}</span>
                    <ElInputNumber
                      :model-value="textFontSize"
                      :min="12"
                      :max="180"
                      :step="1"
                      :precision="1"
                      controls-position="right"
                      class="tool-input-number"
                      :disabled="!canEditText"
                      @keydown.stop
                      @keyup.stop
                      @update:model-value="updateTextFontSizeValue"
                      @change="handleTextFontSizeChange"
                    />
                  </label>
                  <label class="tool-field compact tool-field--wide">
                    <span>{{ t("font") }}</span>
                    <div class="preview-unit-select-wrap">
                      <FilterDropdown
                        :model-value="textFontFamily"
                        :options="textFontFamilyOptions"
                        :menu-min-width="320"
                        :disabled="!canEditText"
                        @update:model-value="updateTextFontFamilyValue"
                      />
                    </div>
                  </label>
                  <label class="tool-field compact tool-field--color">
                    <span>{{ t("color") }}</span>
                    <input
                      v-model="textColor"
                      type="color"
                      class="tool-color"
                      :disabled="!canEditText"
                      :aria-label="t('textColor')"
                      @input="applyTextSettings"
                    />
                  </label>
                  <label class="tool-field compact">
                    <span>{{ t("lineHeight") }}</span>
                    <ElInputNumber
                      :model-value="textLineHeight"
                      :min="0.8"
                      :max="3"
                      :step="0.05"
                      :precision="2"
                      controls-position="right"
                      class="tool-input-number"
                      :disabled="!canEditText"
                      @keydown.stop
                      @keyup.stop
                      @update:model-value="updateTextLineHeightValue"
                      @change="handleTextLineHeightChange"
                    />
                  </label>
                </div>
                <div class="text-format-grid">
                  <button type="button" class="tool-btn text-format-btn" :class="{ active: textWeight === '700' }" :disabled="!canEditText" @click="textWeight = textWeight === '700' ? '400' : '700'; applyTextSettings()">{{ t("bold") }}</button>
                  <button type="button" class="tool-btn text-format-btn" :class="{ active: textStyle === 'italic' }" :disabled="!canEditText" @click="textStyle = textStyle === 'italic' ? 'normal' : 'italic'; applyTextSettings()">{{ t("italic") }}</button>
                  <button type="button" class="tool-btn text-format-btn" :class="{ active: textAlign === 'left' }" :disabled="!canEditText" @click="textAlign = 'left'; applyTextSettings()">{{ t("left") }}</button>
                  <button type="button" class="tool-btn text-format-btn" :class="{ active: textAlign === 'center' }" :disabled="!canEditText" @click="textAlign = 'center'; applyTextSettings()">{{ t("center") }}</button>
                  <button type="button" class="tool-btn text-format-btn" :class="{ active: textAlign === 'right' }" :disabled="!canEditText" @click="textAlign = 'right'; applyTextSettings()">{{ t("right") }}</button>
                </div>
              </div>
            </div>
            <div v-else class="tool-empty tool-empty--minimal"></div>
          </div>

          <div v-else-if="activeSidebarTab === 'layers'" class="workspace-panel-content workspace-panel-content--layers">
            <div ref="layersScrollRef" class="workspace-scroll-area layers-scroll-area">
              <div class="layer-stack">
                <div
                  v-for="layer in layerOptions"
                  :key="layer.id"
                  :data-layer-id="layer.id"
                  class="layer-chip"
                  :class="{ active: activeLayerId === layer.id }"
                >
                  <button
                    type="button"
                    class="layer-main"
                    :title="layer.label"
                    @click="canvasRef?.selectLayer(layer.id, 'layers')"
                    @dblclick="handleLayerRowDblClick(layer)"
                  >
                    <span v-if="layer.kind === 'image' && layer.preview" class="layer-preview-thumb">
                      <img
                        :src="resolveAssetUrl(layer.preview)"
                        :alt="layer.label"
                        @error="handleLayerThumbnailError($event, layer)"
                      />
                    </span>
                    <span v-else class="layer-chip-kind">{{ layer.kind === "text" ? "T" : "IMG" }}</span>
                    <span class="layer-main-content">
                      <span class="layer-chip-label">{{ layer.label }}</span>
                    </span>
                  </button>
                  <div class="layer-actions">
                    <button
                      type="button"
                      class="layer-action-btn"
                      :title="layer.hidden ? t('showLayer') : t('hideLayer')"
                      :aria-label="layer.hidden ? t('showLayer') : t('hideLayer')"
                      @click="toggleLayerVisibility(layer.id)"
                    >
                      <svg v-if="layer.hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3l18 18" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.73 5.08A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7-1.02 2.29-2.67 4.14-4.69 5.35M6.61 6.62C4.32 7.97 2.53 9.76 1 12c1.73 3.89 6 7 11 7a10.8 10.8 0 004.08-.79" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.88 9.88A3 3 0 0014.12 14.12" />
                      </svg>
                      <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M1 12c1.73-4.89 6-8 11-8s9.27 3.11 11 8c-1.73 4.89-6 8-11 8S2.73 16.89 1 12z" />
                        <circle cx="12" cy="12" r="3" stroke-width="1.8" />
                      </svg>
                    </button>
                    <button type="button" class="layer-action-btn" :title="t('renameLayer')" :aria-label="t('renameLayer')" @click="renameLayerEntry(layer)">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button type="button" class="layer-action-btn" :title="t('moveForward')" :aria-label="t('moveForward')" @click="moveLayerEntry(layer.id, 'forward')">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14m0-14l-5 5m5-5l5 5" />
                      </svg>
                    </button>
                    <button type="button" class="layer-action-btn" :title="t('moveBackward')" :aria-label="t('moveBackward')" @click="moveLayerEntry(layer.id, 'backward')">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 19V5m0 14l-5-5m5 5l5-5" />
                      </svg>
                    </button>
                    <button type="button" class="layer-action-btn danger" :title="t('deleteLayer')" :aria-label="t('deleteLayer')" @click="removeLayerEntry(layer.id)">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div v-if="!layerOptions.length" class="tool-empty">{{ t("noLayers") }}</div>
              </div>
            </div>
          </div>

          <div v-else-if="activeSidebarTab === 'background'" class="workspace-panel-content">
            <div class="background-editor background-editor--simple">
              <div class="tool-panel-card tool-panel-card--background tool-panel-card--simple">
                <div class="background-color-row">
                  <label class="background-color-field">
                    <span>{{ t("color") }}</span>
                    <input :value="stageBackgroundColor || '#ffffff'" type="color" class="background-color-input" @input="setBackgroundColor(($event.target as HTMLInputElement).value)" />
                  </label>
                  <button type="button" class="tool-btn subtle background-clear-btn" :class="{ active: !stageBackgroundColor }" @click="clearBackgroundColor">{{ t("clear") }}</button>
                </div>
                <div class="background-swatches">
                  <button type="button" class="background-swatch" :class="{ active: stageBackgroundColor === '#ffffff' }" style="--swatch:#ffffff" :title="t('white')" @click="setBackgroundColor('#ffffff')"></button>
                  <button type="button" class="background-swatch" :class="{ active: stageBackgroundColor === '#f8fafc' }" style="--swatch:#f8fafc" :title="t('mist')" @click="setBackgroundColor('#f8fafc')"></button>
                  <button type="button" class="background-swatch" :class="{ active: stageBackgroundColor === '#fee2e2' }" style="--swatch:#fee2e2" :title="t('blush')" @click="setBackgroundColor('#fee2e2')"></button>
                  <button type="button" class="background-swatch" :class="{ active: stageBackgroundColor === '#dbeafe' }" style="--swatch:#dbeafe" :title="t('sky')" @click="setBackgroundColor('#dbeafe')"></button>
                  <button type="button" class="background-swatch" :class="{ active: stageBackgroundColor === '#dcfce7' }" style="--swatch:#dcfce7" :title="t('mint')" @click="setBackgroundColor('#dcfce7')"></button>
                  <button type="button" class="background-swatch" :class="{ active: stageBackgroundColor === '#111827' }" style="--swatch:#111827" :title="t('ink')" @click="setBackgroundColor('#111827')"></button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="workspace-panel-content workspace-panel-content--svg">
            <div v-if="canEditSvg" class="svg-tools">
              <div class="tool-panel-card tool-panel-card--simple">
                <div class="svg-editor-panel">
                  <div class="svg-editor-section svg-editor-section--layers">
                    <div class="svg-editor-section-header">
                      <strong>{{ t("layers") }}</strong>
                    </div>
                    <div class="svg-layer-list-scroll">
                      <div class="svg-layer-list">
                        <button
                          v-for="svgLayer in activeImageMetrics?.svgLayers || []"
                          :key="svgLayer.id"
                          type="button"
                          class="svg-layer-item"
                          :class="{ active: selectedSvgLayerId === svgLayer.id }"
                          @click="selectSvgLayer(svgLayer.id)"
                        >
                          <span class="svg-layer-swatch" :style="{ '--svg-layer-color': svgLayer.currentFill }"></span>
                          <span class="svg-layer-copy">
                            <strong>{{ svgLayer.label }}</strong>
                            <span>{{ svgLayer.tagName }}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="svg-editor-section svg-editor-section--color">
                    <div class="svg-editor-section-header">
                      <strong>{{ t("color") }}</strong>
                    </div>
                    <div v-if="selectedSvgLayer" class="svg-editor-stack">
                      <label class="tool-field tool-field--stack tool-field--color-full">
                        <span>{{ t("fillColor") }}</span>
                        <input
                          v-model="svgFillColor"
                          type="color"
                          class="tool-color tool-color--full"
                          :aria-label="t('svgFillColor')"
                          @input="applySvgFillSettings"
                        />
                      </label>
                      <div class="svg-editor-meta">
                        <span class="svg-editor-meta-label">{{ selectedSvgLayer.label }}</span>
                        <span class="svg-editor-meta-value">{{ selectedSvgLayer.currentFill }}</span>
                      </div>
                      <div class="svg-editor-actions">
                        <button type="button" class="tool-btn subtle" @click="restoreSelectedSvgLayerColor">{{ t("clear") }}</button>
                      </div>
                    </div>
                    <div v-else class="tool-empty tool-empty--minimal">{{ t("noEditableSvgLayers") }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="tool-empty tool-empty--minimal"></div>
          </div>
        </section>
      </aside>

      <main class="workbench-main workbench-main--editor">
        <div v-if="loadError" class="status-message error">{{ loadError }}</div>

        <section class="editor-shell">
          <div class="editor-shell-header">
            <div class="editor-shell-start">
                <div class="zoom-controls">
                  <button type="button" class="zoom-btn" @click="zoomOut">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
                  <button type="button" class="zoom-btn" @click="zoomIn">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
            </div>
            <div class="editor-shell-actions">
                <div class="editor-history-tools">
                  <button type="button" class="tool-icon-btn" :title="t('shortcuts')" :aria-label="t('shortcuts')" @click="shortcutsModalOpen = true">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11h.01M12 11h.01M16 11h.01M8 15h8" />
                    </svg>
                  </button>
                  <div class="topbar-menu topbar-menu--inline">
                    <button
                      type="button"
                      class="tool-icon-btn"
                      :class="{ active: clearMenuOpen }"
                      :title="t('clear')"
                      :aria-label="t('clear')"
                      @click.stop="clearMenuOpen = !clearMenuOpen"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12h6l1-12M10 11v5m4-5v5" />
                      </svg>
                    </button>
                    <div v-if="clearMenuOpen" class="topbar-popover">
                      <button type="button" class="topbar-popover-item" :disabled="!hasArtwork" @click="clearCurrentPart">
                        {{ t("clearCurrentPart") }}
                      </button>
                      <button type="button" class="topbar-popover-item danger" :disabled="!hasArtwork" @click="clearAllParts">
                        {{ t("clearAllParts") }}
                      </button>
                    </div>
                  </div>
                  <button type="button" class="tool-icon-btn" :disabled="!canUndoHistory" :title="t('undo')" :aria-label="t('undo')" @click="undoCanvas">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h11a4 4 0 110 8h-1" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6l-4 4 4 4" />
                    </svg>
                  </button>
                  <button type="button" class="tool-icon-btn" :disabled="!canRedoHistory" :title="t('redo')" :aria-label="t('redo')" @click="redoCanvas">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H10a4 4 0 100 8h1" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 6l4 4-4 4" />
                    </svg>
                  </button>
                </div>
                <div class="editor-quick-tools">
                  <button type="button" class="tool-icon-btn" :title="t('uploadArtwork')" :aria-label="t('uploadArtwork')" @click="openArtworkPicker">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </button>
                  <button type="button" class="tool-icon-btn" :title="t('addText')" :aria-label="t('addText')" @click="addTextLayer">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 5h10M12 5v14M9 19h6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="tool-icon-btn"
                    :disabled="!selectedPartKey || !partHasArtwork(selectedPartKey)"
                    :title="t('copyCurrentPart')"
                    :aria-label="t('copyCurrentPart')"
                    @click="openCopyPartModal"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 8V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2M8 8H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2M8 8h8v8H8V8z" />
                    </svg>
                  </button>
                </div>
            </div>
            <div class="preview-unit-actions">
              <button type="button" class="tool-icon-btn" :class="{ active: showGrid }" :title="t('toggleGrid')" :aria-label="t('toggleGrid')" @click="toggleGrid">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <label v-if="hasPhysicalDimensions" class="tool-field compact preview-unit-field">
                <div class="preview-unit-select-wrap">
                  <FilterDropdown v-model="selectedDisplayUnit" :options="displayUnitDropdownOptions" />
                </div>
              </label>
            </div>
          </div>

          <div class="editor-workbench">
            <aside class="editor-part-rail">
              <div class="part-rail">
                <button
                  v-for="part in partOptions"
                  :key="part.part_name"
                  type="button"
                  class="part-rail-item"
                  :class="{ active: selectedPartKey === part.part_name }"
                  :title="resolvePartDisplayName(part)"
                  @click="handlePartSelection(part.part_name)"
                >
                  <span class="part-option-thumb">
                    <img
                      v-if="getPartGuidePreviewAsset(part)"
                      :src="getPartGuidePreviewAsset(part)"
                      :alt="resolvePartDisplayName(part)"
                      class="part-option-image"
                      @error="handlePartPreviewError(part)"
                    />
                    <span v-else class="part-option-placeholder">{{ resolvePartDisplayName(part).slice(0, 1).toUpperCase() }}</span>
                    <span class="part-thumb-badge" :class="{ active: partHasArtwork(part.part_name) }">
                      {{ partLayerCount(part.part_name) }}
                    </span>
                  </span>
                </button>
              </div>
            </aside>
            <section class="editor-stage-panel">
              <div v-if="editorPayload && currentCanvasMetaTitle" class="canvas-meta-banner">
                <span class="canvas-meta-title">{{ currentCanvasMetaTitle }}</span>
              </div>
              <div class="canvas-container">
                <div class="canvas-scroll-area">
                  <div class="canvas-stage-viewport" :style="canvasStageViewportStyle">
                    <div class="canvas-stage" :style="canvasStageStyle">
                    <EditorCanvas
                      v-if="editorPayload"
                      ref="canvasRef"
                      :svg-url="currentPart?.svg_url"
                      :guide-url="currentPart?.guide_url"
                      :cutout-url="currentPart?.cutout_url"
                      :selected-part-key="selectedPartKey"
                      :parts="partOptions"
                      :template-size="editorPayload?.template_size"
                      :physical-dimensions-cm="editorPayload?.physical_dimensions_cm"
                      :part-pixel-boxes="editorPayload?.part_pixel_boxes"
                      :display-unit="selectedDisplayUnit"
                      :locale="selectedLocale"
                      :view-geometry="editorPayload?.view_geometry"
                      :selected-color="selectedColor"
                      :selected-view="selectedView"
                      :stage-background-color="stageBackgroundColor"
                      :part-background-colors="partBackgroundColors"
                      :zoom-level="zoomLevel"
                      :show-grid="showGrid"
                      @selection-change="updateSelectionState"
                      @state-change="handleCanvasStateChange"
                      @image-context-menu="handleImageContextMenu"
                      @artwork-load-failure="handleArtworkLoadFailure"
                    />
                    <div v-else class="canvas-placeholder">
                      <div class="canvas-placeholder-inner">{{ t("loadingEditor") }}</div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>

      <aside class="live-sidebar live-sidebar--output">
        <section class="sidebar-panel preview-panel sidebar-panel--output">
          <div class="preview-image-container">
            <button
              type="button"
              class="preview-nav prev"
              :disabled="isPreviewRendering || availableViews.length <= 1"
              @click="goToAdjacentView(-1)"
            >
              ‹
            </button>
            <button
              v-if="currentPreviewImage"
              type="button"
              class="preview-image-button"
              :aria-label="t('openViewPreviewDialog')"
              @click="openViewPreviewDialog"
            >
              <img
                :src="currentPreviewImage"
                :alt="`${selectedColor}-${selectedView}`"
                class="preview-image"
                @load="cachePreviewImageNaturalSize(currentPreviewCacheKey, $event)"
              />
            </button>
            <div v-else class="preview-placeholder">
              <div class="placeholder-content">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ workspaceLoading || isPreviewImageLoading ? t("loadingPreview") : t("noPreviewAvailable") }}</span>
              </div>
            </div>
            <button
              type="button"
              class="preview-nav next"
              :disabled="isPreviewRendering || availableViews.length <= 1"
              @click="goToAdjacentView(1)"
            >
              ›
            </button>
            <div v-if="isPreviewRendering" class="preview-loading">{{ t("updating") }}</div>
            <button
              v-if="selectedView"
              type="button"
              class="preview-view-chip"
              :aria-label="t('openViewPreviewDialog')"
              @click="openViewPreviewDialog"
            >
              {{ selectedView }}
            </button>
          </div>
          <div class="preview-toolbar">
            <div class="preview-toolbar-slot preview-toolbar-slot--start">
              <div class="topbar-menu topbar-menu--inline preview-refresh-menu">
                <button
                  type="button"
                  class="tool-icon-btn preview-refresh-icon"
                  :class="{ active: previewRefreshMenuOpen }"
                  :disabled="isPreviewRendering || !editorPayload || !selectedTemplateId || !selectedColor || !selectedView"
                  :title="t('refresh')"
                  :aria-label="t('refresh')"
                  @click.stop="previewRefreshMenuOpen = !previewRefreshMenuOpen"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 9a8 8 0 00-14.12-3.36L4 10M4 15a8 8 0 0014.12 3.36L20 14" />
                  </svg>
                </button>
                <div v-if="previewRefreshMenuOpen" class="topbar-popover">
                  <button type="button" class="topbar-popover-item" @click="refreshCurrentViewPreview(); previewRefreshMenuOpen = false">
                    {{ t("refreshPreviewNow") }}
                  </button>
                </div>
              </div>
            </div>
            <div class="preview-toolbar-slot preview-toolbar-slot--center">
              <div v-if="availableViews.length > 1" class="preview-dots">
                <button
                  v-for="view in availableViews"
                  :key="`dot-${view}`"
                  type="button"
                  class="preview-dot"
                  :class="{ active: selectedView === view }"
                  :aria-label="formatPreviewMessage('switchToView', { view })"
                  :disabled="isPreviewRendering"
                  @click="handleViewSelection(view)"
                ></button>
              </div>
            </div>
            <div class="preview-toolbar-slot preview-toolbar-slot--end">
              <button
                type="button"
                class="tool-icon-btn preview-launch-btn"
                :title="t('openPreview')"
                :aria-label="t('openPreview')"
                :disabled="!selectedTemplateId || !availableViews.length"
                @click="openViewPreviewDialog"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1.5 12s3.75-6 10.5-6 10.5 6 10.5 6-3.75 6-10.5 6S1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" stroke-width="2" />
                </svg>
              </button>
            </div>
          </div>

          <div class="selector-section">
            <div class="color-options compact">
              <button
                v-for="color in availableColors"
                :key="color"
                type="button"
                class="color-option compact"
                :class="{ active: selectedColor === color }"
                @click="selectedColor = color"
              >
                <div class="color-swatch" :style="{ background: colorSwatch(color) }"></div>
                <span class="color-name">{{ color }}</span>
              </button>
            </div>
          </div>

        </section>

        <section v-if="hasActiveLayer" class="sidebar-panel edit-sidebar-panel sidebar-panel--inspect">
          <div v-if="canEditImage" class="image-edit-panel">
            <div v-if="activeImageMetrics?.rulerBoxDisplay || activeImageMetrics?.imageBoxDisplay" class="dimension-summary-grid">
              <div v-if="activeImageMetrics?.rulerBoxDisplay" class="dimension-summary-card">
                <span class="dimension-summary-label">{{ t("boundingBoxSize") }}</span>
                <span class="dimension-summary-value">{{ activeImageMetrics.rulerBoxDisplay.label }}</span>
              </div>
              <div v-if="activeImageMetrics?.imageBoxDisplay" class="dimension-summary-card">
                <span class="dimension-summary-label">{{ t("imageSize") }}</span>
                <div class="dimension-summary-inputs">
                    <ElInputNumber
                      :model-value="draftNumberValue(imageSizeDraft.width)"
                      :min="0.1"
                      :step="0.1"
                      :precision="1"
                      controls-position="right"
                      class="tool-input-number tool-input-number--inline"
                      @focus="beginSizeInput('image')"
                      @update:model-value="updateImageSizeDraftNumber('width', $event)"
                      @keydown.stop
                      @keyup.stop
                      @blur="applyImageSizeInput('width')"
                      @change="applyImageSizeInput('width')"
                    />
                    <button
                      type="button"
                      class="dimension-summary-lock"
                      :class="{ 'is-locked': imageSizeAspectLocked }"
                      :title="imageSizeAspectLocked ? t('aspectUnlock') : t('aspectLock')"
                      :aria-label="imageSizeAspectLocked ? t('aspectUnlock') : t('aspectLock')"
                      :aria-pressed="imageSizeAspectLocked"
                      @click="imageSizeAspectLocked = !imageSizeAspectLocked"
                    >
                      <svg v-if="imageSizeAspectLocked" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11V7a4 4 0 118 0v4M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
                      </svg>
                      <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11V7a4 4 0 018 0M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
                      </svg>
                    </button>
                    <span class="dimension-summary-separator">×</span>
                    <ElInputNumber
                      :model-value="draftNumberValue(imageSizeDraft.height)"
                      :min="0.1"
                      :step="0.1"
                      :precision="1"
                      controls-position="right"
                      class="tool-input-number tool-input-number--inline"
                      @focus="beginSizeInput('image')"
                      @update:model-value="updateImageSizeDraftNumber('height', $event)"
                      @keydown.stop
                      @keyup.stop
                      @blur="applyImageSizeInput('height')"
                      @change="applyImageSizeInput('height')"
                    />
                    <span class="dimension-summary-unit">{{ activeImageMetrics.imageBoxDisplay.unit }}</span>
                </div>
              </div>
            </div>
            <label class="tool-field">
              <span>{{ t("opacity") }}</span>
              <div class="tool-range-row">
                <input
                  :value="Math.round(imageOpacity * 100)"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="tool-range"
                  @input="updateImageOpacityPercent(Number(($event.target as HTMLInputElement).value))"
                />
                <ElInputNumber
                  :model-value="Math.round(imageOpacity * 100)"
                  :min="0"
                  :max="100"
                  :step="1"
                  :precision="0"
                  controls-position="right"
                  class="tool-input-number tool-input-number--inline"
                  @update:model-value="handleImageOpacityInput"
                  @change="handleImageOpacityInput"
                />
                <span class="tool-range-value">{{ Math.round(imageOpacity * 100) }}%</span>
              </div>
            </label>
            <div class="tool-field tool-field--tile-mode">
              <div class="icon-tool-grid icon-tool-grid--tile-mode" role="group" aria-label="Tile layout options">
                <button
                  v-for="option in imageTileModeOptions"
                  :key="option.value"
                  type="button"
                  class="tool-icon-btn tool-icon-btn--tile-mode"
                  :class="[
                    `tool-icon-btn--${option.value}`,
                    { active: imageTileMode === option.value },
                  ]"
                  :title="formatTileModeOptionTitle(option)"
                  :aria-label="formatTileModeOptionAriaLabel(option)"
                  @click="applyImageTileMode(option.value)"
                >
                  <span class="tile-mode-visual" aria-hidden="true">
                    <span class="tile-mode-visual-cell"></span>
                    <span class="tile-mode-visual-cell"></span>
                    <span class="tile-mode-visual-cell"></span>
                    <span class="tile-mode-visual-cell"></span>
                  </span>
                  <span class="sr-only">{{ option.label }}</span>
                </button>
              </div>
            </div>
            <div class="icon-tool-grid">
              <button type="button" class="tool-icon-btn" :title="t('scaleUp')" :aria-label="t('scaleUp')" @click="scaleActive(1.1)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('scaleDown')" :aria-label="t('scaleDown')" @click="scaleActive(0.9)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('rotateLeft')" :aria-label="t('rotateLeft')" @click="rotateActive(-15)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4v5h5M6 9a9 9 0 0111.5 2.5" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('rotateRight')" :aria-label="t('rotateRight')" @click="rotateActive(15)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 20v-5h-5M18 15a9 9 0 01-11.5-2.5" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn tool-icon-btn--danger" :title="t('delete')" :aria-label="t('delete')" @click="removeActive">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('duplicateLayer')" :aria-label="t('duplicateLayer')" @click="duplicateActive">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 8V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2M8 8H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2M8 8h8v8H8V8z" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('center')" :aria-label="t('center')" @click="centerActive">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v18M3 12h18M7 7h10v10H7V7z" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('flipHorizontal')" :aria-label="t('flipHorizontal')" @click="flipActive('x')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16M7 8l-4 4 4 4M17 8l4 4-4 4" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('flipVertical')" :aria-label="t('flipVertical')" @click="flipActive('y')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16M8 7l4-4 4 4M8 17l4 4 4-4" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('bringFront')" :aria-label="t('bringFront')" @click="moveLayer('forward')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 13h10M7 17h10M7 7h10M5 9l2-2 2 2" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('sendBack')" :aria-label="t('sendBack')" @click="moveLayer('backward')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 11h10M7 17h10M9 15l-2 2-2-2" />
                </svg>
              </button>
            </div>
            <div class="nudge-pad">
              <button type="button" class="nudge-btn" @click="nudgeActive(0, -8)">↑</button>
              <div class="nudge-middle">
                <button type="button" class="nudge-btn" @click="nudgeActive(-8, 0)">←</button>
                <button type="button" class="nudge-btn" @click="nudgeActive(8, 0)">→</button>
              </div>
              <button type="button" class="nudge-btn" @click="nudgeActive(0, 8)">↓</button>
            </div>
          </div>

          <div v-else-if="canEditText" class="text-edit-panel">
            <div v-if="activeTextMetrics?.textContent?.display" class="dimension-summary-grid">
              <div v-if="activeTextMetrics?.textContent?.display" class="dimension-summary-card">
                <span class="dimension-summary-label">{{ t("textContentSize") }}</span>
                <div class="dimension-summary-inputs">
                  <ElInputNumber
                    :model-value="draftNumberValue(textContentSizeDraft.width)"
                    :min="0.1"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    class="tool-input-number tool-input-number--inline"
                    @focus="beginSizeInput('textContent')"
                    @update:model-value="updateTextSizeDraftNumber('content', 'width', $event)"
                    @keydown.stop
                    @keyup.stop
                    @blur="applyTextSizeInput('content', 'width')"
                    @change="applyTextSizeInput('content', 'width')"
                  />
                  <button
                    type="button"
                    class="dimension-summary-lock"
                    :class="{ 'is-locked': textContentSizeAspectLocked }"
                    :title="textContentSizeAspectLocked ? t('aspectUnlock') : t('aspectLock')"
                    :aria-label="textContentSizeAspectLocked ? t('aspectUnlock') : t('aspectLock')"
                    :aria-pressed="textContentSizeAspectLocked"
                    @click="textContentSizeAspectLocked = !textContentSizeAspectLocked"
                  >
                    <svg v-if="textContentSizeAspectLocked" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11V7a4 4 0 118 0v4M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
                    </svg>
                    <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11V7a4 4 0 018 0M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
                    </svg>
                  </button>
                  <span class="dimension-summary-separator">×</span>
                  <ElInputNumber
                    :model-value="draftNumberValue(textContentSizeDraft.height)"
                    :min="0.1"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    class="tool-input-number tool-input-number--inline"
                    @focus="beginSizeInput('textContent')"
                    @update:model-value="updateTextSizeDraftNumber('content', 'height', $event)"
                    @keydown.stop
                    @keyup.stop
                    @blur="applyTextSizeInput('content', 'height')"
                    @change="applyTextSizeInput('content', 'height')"
                  />
                  <span class="dimension-summary-unit">{{ activeTextMetrics.textContent.display.unit }}</span>
                </div>
              </div>
            </div>
            <div class="icon-tool-grid">
              <button type="button" class="tool-icon-btn" :title="t('scaleUp')" :aria-label="t('scaleUp')" @click="scaleActive(1.1)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('scaleDown')" :aria-label="t('scaleDown')" @click="scaleActive(0.9)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('rotateLeft')" :aria-label="t('rotateLeft')" @click="rotateActive(-15)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4v5h5M6 9a9 9 0 0111.5 2.5" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('rotateRight')" :aria-label="t('rotateRight')" @click="rotateActive(15)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 20v-5h-5M18 15a9 9 0 01-11.5-2.5" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn tool-icon-btn--danger" :title="t('delete')" :aria-label="t('delete')" @click="removeActive">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('duplicateLayer')" :aria-label="t('duplicateLayer')" @click="duplicateActive">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 8V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2M8 8H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2M8 8h8v8H8V8z" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('center')" :aria-label="t('center')" @click="centerActive">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v18M3 12h18M7 7h10v10H7V7z" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('flipHorizontal')" :aria-label="t('flipHorizontal')" @click="flipActive('x')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16M7 8l-4 4 4 4M17 8l4 4-4 4" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('flipVertical')" :aria-label="t('flipVertical')" @click="flipActive('y')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16M8 7l4-4 4 4M8 17l4 4 4-4" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('bringFront')" :aria-label="t('bringFront')" @click="moveLayer('forward')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 13h10M7 17h10M7 7h10M5 9l2-2 2 2" />
                </svg>
              </button>
              <button type="button" class="tool-icon-btn" :title="t('sendBack')" :aria-label="t('sendBack')" @click="moveLayer('backward')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 11h10M7 17h10M9 15l-2 2-2-2" />
                </svg>
              </button>
            </div>
            <div class="nudge-pad">
              <button type="button" class="nudge-btn" @click="nudgeActive(0, -8)">↑</button>
              <div class="nudge-middle">
                <button type="button" class="nudge-btn" @click="nudgeActive(-8, 0)">←</button>
                <button type="button" class="nudge-btn" @click="nudgeActive(8, 0)">→</button>
              </div>
              <button type="button" class="nudge-btn" @click="nudgeActive(0, 8)">↓</button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <aside v-if="draftsModalOpen" class="drafts-floating-panel">
      <section class="sidebar-panel drafts-side-panel">
        <div class="workspace-modal-header drafts-side-panel-header">
          <h3 class="workspace-modal-title">{{ t("drafts") }}</h3>
          <button type="button" class="workspace-modal-close" @click="previewDraftStore.closeDraftsModal()">×</button>
        </div>
        <div class="drafts-side-panel-body">
          <div v-if="draftPanelEntries.length" class="drafts-panel-layout">
            <section class="drafts-section">
              <div class="drafts-section-header">
                <div class="drafts-section-kicker">{{ t("drafts") }}</div>
                <strong>{{ draftPanelEntries.length }}</strong>
              </div>
              <div v-if="draftPanelEntries.length" class="outputs-grid outputs-grid--compact drafts-grid">
                <div
                  v-for="draft in draftPanelEntries"
                  :key="draft.draftId"
                  class="output-item output-item--compact output-item--draft"
                  :class="{
                    active: draft.isActive,
                    'output-item--draft-renaming': renamingDraftId === draft.draftId,
                  }"
                >
                  <div class="output-item--draft-body">
                    <div class="output-preview-stack output-preview-stack--draft">
                      <div class="output-preview output-preview--draft">
                        <img
                          v-if="draft.previewUrl"
                          :src="draft.previewUrl"
                          :alt="`${draft.draftName || DEFAULT_PREVIEW_DRAFT_NAME}-${draft.previewViewLabel}`"
                        />
                        <span v-else class="output-preview-placeholder">{{ draft.previewViewLabel }}</span>
                      </div>
                      <div class="recent-actions-inline recent-actions-inline--drafts recent-actions-inline--draft-card">
                        <button
                          v-if="!draft.isActive"
                          type="button"
                          class="download-link"
                          @click="activateDraft(draft.draftId)"
                        >
                          {{ t("switch") }}
                        </button>
                        <button v-else type="button" class="download-link" disabled>{{ t("active") }}</button>
                        <button type="button" class="download-link" @click="beginRenameDraft(draft)">{{ t("rename") }}</button>
                        <button type="button" class="remove-link" @click="deleteDraft(draft.draftId)">{{ t("delete") }}</button>
                      </div>
                    </div>
                    <div class="output-info output-info--draft">
                      <div class="draft-item-heading">
                        <h4 class="output-size">
                          {{ draft.draftName || DEFAULT_PREVIEW_DRAFT_NAME }}
                        </h4>
                        <span v-if="draft.isActive" class="draft-active-badge">{{ t("active") }}</span>
                      </div>
                      <p class="draft-meta-line">
                        <span class="draft-meta-label">{{ t("finishedProductCode") }}:</span>
                        <span class="draft-meta-value">{{ draft.finishedProductCodeLabel }}</span>
                      </p>
                      <p class="output-view">{{ formatDraftUpdatedAt(draft.updatedAt || draft.createdAt) }}</p>
                    </div>
                  </div>
                  <div v-if="renamingDraftId === draft.draftId" class="field drafts-rename-field drafts-rename-field--card">
                    <input v-model="renameDraftValue" class="template-search-input" :placeholder="t('draftName')" />
                    <p v-if="renameDraftError" class="field-error">{{ renameDraftError }}</p>
                    <div class="field-actions drafts-rename-actions">
                      <button type="button" class="field-action-button" @click="cancelRenameDraft">{{ t("cancel") }}</button>
                      <button type="button" class="field-action-button" @click="confirmRenameDraft">{{ t("save") }}</button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state empty-state--drafts">{{ t("noDraftsYet") }}</div>
            </section>
          </div>
          <div v-else class="empty-state">{{ t("noDraftsYet") }}</div>
        </div>
      </section>
    </aside>

    <input
      ref="replaceArtworkInputRef"
      type="file"
      accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
      class="sr-only"
      data-testid="preview-replace-artwork-input"
      @change="handleReplaceArtworkSelected"
    />
    <div v-if="exportModalOpen && !isWordPressShell" class="workspace-modal-backdrop" @click.self="exportModalOpen = false">
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("export") }}</h3>
          <button type="button" class="workspace-modal-close" @click="exportModalOpen = false">×</button>
        </div>
        <div class="workspace-modal-body">
          <div class="field">
            <span class="control-label">Batch Colors</span>
            <div class="field-actions">
              <button type="button" class="field-action-button" @click="selectAllBatchColors">{{ t("selectAll") }}</button>
              <button type="button" class="field-action-button" @click="resetBatchColors">{{ t("reset") }}</button>
            </div>
            <div class="chip-group">
              <button
                v-for="color in availableColors"
                :key="`modal-color-${color}`"
                type="button"
                class="chip-button"
                :class="{ active: selectedBatchColors.includes(color) }"
                @click="toggleBatchColor(color)"
              >
                {{ color }}
              </button>
            </div>
          </div>
          <div class="field">
            <span class="control-label">{{ t("batchViews") }}</span>
            <div class="field-actions">
              <button type="button" class="field-action-button" @click="selectAllBatchViews">{{ t("selectAll") }}</button>
              <button type="button" class="field-action-button" @click="resetBatchViews">{{ t("reset") }}</button>
            </div>
            <div class="chip-group">
              <button
                v-for="view in availableViews"
                :key="`modal-view-${view}`"
                type="button"
                class="chip-button"
                :class="{ active: selectedBatchViews.includes(view) }"
                @click="toggleBatchView(view)"
              >
                {{ view }}
              </button>
            </div>
          </div>
          <div class="field">
            <span class="control-label">{{ t("batchExportSize") }}</span>
            <div class="field-actions">
              <button type="button" class="field-action-button" @click="selectAllBatchSizes">{{ t("selectAll") }}</button>
              <button type="button" class="field-action-button" @click="resetBatchSizes">{{ t("reset") }}</button>
            </div>
            <div class="chip-group">
              <button
                v-for="size in availableSizes"
                :key="`modal-size-${size}`"
                type="button"
                class="chip-button"
                :class="{ active: selectedBatchSizes.includes(size) }"
                :aria-pressed="selectedBatchSizes.includes(size)"
                @click="toggleBatchSize(size)"
              >
                {{ formatOutputSizeChipLabel(size) }}
              </button>
            </div>
            <div class="size-input-row">
              <input
                v-model="batchCustomSizeDraft"
                type="text"
                class="size-input"
                :placeholder="t('customSizePlaceholder')"
                @keydown.enter.prevent="applyBatchCustomSize"
              />
              <button type="button" class="field-action-button" @click="applyBatchCustomSize">{{ t("addCustomSize") }}</button>
            </div>
            <div class="field-hint">{{ batchSizeHint }}</div>
          </div>
          <div v-if="renderError" class="status-message error">{{ renderError }}</div>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="exportModalOpen = false">{{ t("close") }}</button>
          <button
            type="button"
            class="action-button secondary"
            :disabled="isBatchExporting || isBatchDownloading || !selectedBatchSizes.length || !selectedBatchViews.length || !selectedBatchColors.length"
            @click="exportBatchToResults()"
          >
            {{ isBatchExporting ? t("exporting") : t("export") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="saveDraftModalOpen" class="workspace-modal-backdrop" @click.self="previewDraftStore.closeSaveDraftModal()">
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("saveAs") }}</h3>
          <button type="button" class="workspace-modal-close" @click="previewDraftStore.closeSaveDraftModal()">×</button>
        </div>
        <div class="workspace-modal-body">
          <div class="field">
            <label class="field-label">{{ t("newDraftName") }}</label>
            <input
              v-model="saveDraftName"
              class="template-search-input"
              :placeholder="t('enterDraftName')"
            />
            <p v-if="saveDraftError" class="field-error">{{ saveDraftError }}</p>
          </div>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="previewDraftStore.closeSaveDraftModal()">{{ t("cancel") }}</button>
          <button type="button" class="action-button" :disabled="isSavingDraftToServer" @click="confirmSaveDraftModal">
            {{ isSavingDraftToServer ? t("saving") : t("confirmSave") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="leaveWorkspaceModalOpen" class="workspace-modal-backdrop" @click.self="cancelLeaveWorkspace">
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("unsavedChanges") }}</h3>
          <button type="button" class="workspace-modal-close" @click="cancelLeaveWorkspace">×</button>
        </div>
        <div class="workspace-modal-body">
          <p class="workspace-modal-copy">{{ t("saveBeforeLeaving") }}</p>
          <p class="workspace-modal-copy">{{ t("leavePageHint") }}</p>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" :disabled="isSavingTemplate || isSavingDraftToServer" @click="confirmLeaveWithoutSaving">{{ t("dontSave") }}</button>
          <button type="button" class="action-button" :disabled="isSavingTemplate || isSavingDraftToServer" @click="confirmLeaveWithSave">{{ (isSavingTemplate || isSavingDraftToServer) ? t("saving") : t("save") }}</button>
        </div>
      </div>
    </div>

    <div v-if="switchDraftModalOpen" class="workspace-modal-backdrop" @click.self="cancelSwitchDraft">
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("unsavedChanges") }}</h3>
          <button type="button" class="workspace-modal-close" @click="cancelSwitchDraft">×</button>
        </div>
        <div class="workspace-modal-body">
          <p class="workspace-modal-copy">
            {{ t("unsavedChangesPromptBefore") }}
            <strong>{{ pendingSwitchDraftRecord?.draftName || DEFAULT_PREVIEW_DRAFT_NAME }}</strong>
            {{ t("unsavedChangesPromptAfter") }}
          </p>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="cancelSwitchDraft">{{ t("cancel") }}</button>
          <button type="button" class="action-button secondary" :disabled="isSavingDraftToServer" @click="confirmSwitchDraftDiscard">
            {{ t("discardAndSwitch") }}
          </button>
          <button type="button" class="action-button" :disabled="isSavingDraftToServer" @click="confirmSwitchDraftSave">
            {{ t("saveAndSwitch") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="newWorkspaceModalOpen" class="workspace-modal-backdrop" @click.self="cancelNewWorkspace">
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("unsavedChanges") }}</h3>
          <button type="button" class="workspace-modal-close" @click="cancelNewWorkspace">×</button>
        </div>
        <div class="workspace-modal-body">
          <p class="workspace-modal-copy">{{ t("unsavedChangesBeforeNewWorkspace") }}</p>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="cancelNewWorkspace">{{ t("cancel") }}</button>
          <button type="button" class="action-button secondary" :disabled="isSavingDraftToServer" @click="confirmNewWorkspaceDiscard">
            {{ t("discardAndNew") }}
          </button>
          <button type="button" class="action-button" :disabled="isSavingDraftToServer" @click="confirmNewWorkspaceSave">
            {{ t("saveAndNew") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="deleteDraftModalOpen" class="workspace-modal-backdrop" @click.self="cancelDeleteDraftModal">
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("deleteDraft") }}</h3>
          <button type="button" class="workspace-modal-close" @click="cancelDeleteDraftModal">×</button>
        </div>
        <div class="workspace-modal-body">
          <p class="workspace-modal-copy">
            {{ t("delete") }}
            <strong>{{ pendingDeleteDraftRecord?.draftName || DEFAULT_PREVIEW_DRAFT_NAME }}</strong>
            {{ t("permanentlyQuestion") }}
          </p>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="cancelDeleteDraftModal">{{ t("cancel") }}</button>
          <button type="button" class="action-button danger" :disabled="isSavingDraftToServer" @click="confirmDeleteDraft">
            {{ t("delete") }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="deleteDraftConflictModalOpen"
      class="workspace-modal-backdrop"
      @click.self="closeDeleteDraftConflictModal"
    >
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("deleteCascadeTitle") }}</h3>
          <button type="button" class="workspace-modal-close" @click="closeDeleteDraftConflictModal">×</button>
        </div>
        <div class="workspace-modal-body">
          <p class="workspace-modal-copy">
            {{ t("deleteCascadeIntro") }}
            <strong>{{ deleteDraftConflictDraftName || DEFAULT_PREVIEW_DRAFT_NAME }}</strong>
            {{ t("deleteCascadeListLead") }}
          </p>
          <ul class="workspace-modal-copy" style="padding-left: 1.25em; margin: 0.5em 0 0;">
            <li
              v-for="(reason, index) in deleteDraftConflictReasons"
              :key="`${reason.type}-${index}`"
              style="margin-bottom: 0.4em; word-break: break-all;"
            >
              {{ formatDeleteDraftConflictReason(reason) }}
            </li>
          </ul>
          <p class="workspace-modal-copy" style="margin-top: 0.75em;">
            {{ t("deleteCascadeWarning") }}
          </p>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="closeDeleteDraftConflictModal">
            {{ t("deleteCascadeCancel") }}
          </button>
          <button
            type="button"
            class="action-button danger"
            :disabled="isSavingDraftToServer"
            @click="confirmForceDeleteDraft"
          >
            {{ t("deleteCascadeConfirm") }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="deleteDraftErrorModalOpen"
      class="workspace-modal-backdrop"
      @click.self="closeDeleteDraftErrorModal"
    >
      <div class="workspace-modal" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("deleteDraftErrorTitle") }}</h3>
          <button type="button" class="workspace-modal-close" @click="closeDeleteDraftErrorModal">×</button>
        </div>
        <div class="workspace-modal-body">
          <p class="workspace-modal-copy">{{ deleteDraftErrorMessage }}</p>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="closeDeleteDraftErrorModal">
            {{ t("close") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="shortcutsModalOpen" class="workspace-modal-backdrop" @click.self="shortcutsModalOpen = false">
      <div class="workspace-modal workspace-modal--shortcuts" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("shortcuts") }}</h3>
          <button type="button" class="workspace-modal-close" @click="shortcutsModalOpen = false">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--shortcuts">
          <div class="shortcuts-grid">
            <div v-for="shortcut in shortcutEntries" :key="shortcut.key" class="shortcut-item">
              <span class="shortcut-label">{{ shortcut.label }}</span>
              <code class="shortcut-key">{{ shortcut.keys }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="copyPartModalOpen" class="workspace-modal-backdrop" @click.self="closeCopyPartModal">
      <div class="workspace-modal workspace-modal--copy-part" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("copyCurrentPartTitle") }}</h3>
          <button type="button" class="workspace-modal-close" @click="closeCopyPartModal">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--copy-part">
          <div class="copy-part-select-all">
            <label class="copy-part-checkbox">
              <input
                :checked="copyPartAllSelected"
                type="checkbox"
                @change="toggleCopyPartSelectAll(($event.target as HTMLInputElement).checked)"
              />
              <span>{{ t("selectAll") }}</span>
            </label>
          </div>
          <div class="copy-part-grid">
            <label v-for="part in copyPartTargetOptions" :key="part.part_name" class="copy-part-checkbox">
              <input
                :checked="copyPartSelectedTargets.includes(part.part_name)"
                type="checkbox"
                @change="toggleCopyPartTarget(part.part_name, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ resolvePartDisplayName(part) }}</span>
            </label>
          </div>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" @click="closeCopyPartModal">{{ t("close") }}</button>
          <button
            type="button"
            class="action-button"
            :disabled="!copyPartSelectedTargets.length"
            @click="confirmCopyCurrentPart"
          >
            {{ t("confirm") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="resultsModalOpen && !isWordPressShell" class="workspace-modal-backdrop" @click.self="resultsModalOpen = false">
      <div class="workspace-modal workspace-modal--results" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("results") }}</h3>
          <button type="button" class="workspace-modal-close" @click="resultsModalOpen = false">×</button>
        </div>
        <div class="workspace-modal-body">
          <div class="recent-actions">
            <button type="button" class="action-button secondary" :disabled="!resultsDisplayOutputs.length" @click="toggleSelectAllResults">
              {{ allResultsSelected ? t("clearSelection") : t("selectAll") }}
            </button>
            <button type="button" class="action-button" :disabled="!selectedResultCount" @click="downloadSelectedResults" data-testid="preview-download-selected">
              {{ t("download") }}<span v-if="selectedResultCount"> ({{ selectedResultCount }})</span>
            </button>
          </div>
          <div class="results-panel">
            <div v-if="resultsDisplayOutputs.length" class="outputs-grid">
              <div
                v-for="output in resultsDisplayOutputs"
                :key="output.id"
                class="output-item"
                :class="{ 'output-item--selected': selectedResultIds.has(output.id) }"
              >
                <label class="output-select-checkbox" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedResultIds.has(output.id)"
                    @change="toggleResultSelection(output.id)"
                  />
                </label>
                <div class="output-preview" @click="openResultLightbox(output)">
                  <img :src="output.url" :alt="`${output.color}-${output.view}-${output.size}`" @error="handleResultImageError($event, output)" />
                </div>
                <div class="output-info">
                  <div class="output-header">
                    <h4 class="output-size">{{ formatOutputSizeChipLabel(output.size) }}</h4>
                    <span class="results-source-badge" :class="`results-source-badge--${output.source || 'export'}`">
                      {{ resolveOutputSourceLabel(output.source) }}
                    </span>
                  </div>
                  <p class="output-view">{{ t("color") }}: {{ output.color || "-" }}</p>
                  <p class="output-view">{{ t("viewLabel") }}: {{ output.view || "-" }}</p>
                  <p class="output-view output-view--time">{{ t("generatedAt") }}: {{ formatResultGeneratedAt(output.createdAt) }}</p>
                  <div class="recent-actions-inline">
                    <a class="download-link" :href="renderFileUrl(output.filePath, true)" @click.prevent="downloadOutput(output.filePath)">{{ t("download") }}</a>
                    <button type="button" class="remove-link" @click="deleteOutputRecord(output.id)">{{ t("delete") }}</button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">{{ t("noOutputsGeneratedYet") }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="resultLightboxOutput" class="workspace-modal-backdrop workspace-modal-backdrop--preview" @click.self="closeResultLightbox">
      <div class="workspace-modal workspace-modal--result-lightbox" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">
            {{ resultLightboxOutput.color || "-" }} · {{ resultLightboxOutput.view || "-" }} · {{ formatOutputSizeChipLabel(resultLightboxOutput.size) }}
          </h3>
          <button type="button" class="workspace-modal-close" @click="closeResultLightbox">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--result-lightbox">
          <img class="result-lightbox-image" :src="resultLightboxOutput.url" :alt="`${resultLightboxOutput.color}-${resultLightboxOutput.view}-${resultLightboxOutput.size}`" />
        </div>
      </div>
    </div>
    <div v-if="viewPreviewModalOpen" class="workspace-modal-backdrop workspace-modal-backdrop--preview" @click.self="closeViewPreviewDialog">
      <div class="workspace-modal workspace-modal--preview-view" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <h3 class="workspace-modal-title">{{ t("previewDialogTitle") }}</h3>
          <div class="workspace-modal-header-actions">
            <div v-if="availableColors.length" class="preview-dialog-color-options preview-dialog-color-options--header">
              <button
                v-for="color in availableColors"
                :key="color"
                type="button"
                class="preview-dialog-color-chip preview-dialog-color-chip--labeled"
                :class="{ active: activePreviewDialogColor === color }"
                :aria-pressed="activePreviewDialogColor === color"
                :title="color"
                @click="handleDialogColorSelection(color)"
              >
                <span class="preview-dialog-color-swatch" :style="{ background: colorSwatch(color) }"></span>
                <span class="preview-dialog-color-name">{{ color }}</span>
              </button>
            </div>
            <button
              type="button"
              class="preview-main-image-button preview-main-image-button--header"
              :class="{ 'preview-main-image-button--active': activePreviewDialogIsDraftMainImage }"
              :disabled="!canSetActivePreviewAsDraftMainImage"
              @click="setSelectedPreviewAsDraftMainImage"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1.5l1.854 3.756 4.146.603-3 2.925.708 4.133L8 10.968l-3.708 1.949.708-4.133-3-2.925 4.146-.603L8 1.5z" fill="currentColor" />
              </svg>
              <span>{{ activePreviewDialogIsDraftMainImage ? t("draftMainImageSelected") : t("setDraftMainImage") }}</span>
            </button>
            <button type="button" class="workspace-modal-close" @click="closeViewPreviewDialog">×</button>
          </div>
        </div>
        <div class="workspace-modal-body workspace-modal-body--preview-view">
          <div class="preview-dialog-meta preview-dialog-meta--header preview-dialog-meta--viewer">
            <div class="preview-dialog-meta-primary">
              <strong>{{ activePreviewDialogView || "-" }}</strong>
              <span>{{ activePreviewDialogColor || "-" }}</span>
            </div>
            <div class="preview-dialog-meta-secondary">
              <span>{{ openPreviewSizeLabel }}</span>
              <span v-if="activePreviewDialogIsDraftMainImage" class="preview-dialog-main-view-chip">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1.5l1.854 3.756 4.146.603-3 2.925.708 4.133L8 10.968l-3.708 1.949.708-4.133-3-2.925 4.146-.603L8 1.5z" fill="currentColor" />
                </svg>
                {{ t("draftMainImageBadge") }}
              </span>
            </div>
          </div>
          <div class="preview-dialog-layout preview-dialog-layout--viewer">
            <section class="preview-dialog-main">
              <div class="preview-dialog-stage">
                <button
                  type="button"
                  class="preview-nav prev"
                  :disabled="availableViews.length <= 1"
                  @click="goToAdjacentView(-1)"
                >
                  ‹
                </button>
                <div class="preview-dialog-media">
                  <div v-if="isActivePreviewDialogLoading" class="preview-dialog-loading">
                    <div class="preview-dialog-loading-panel">
                      <span class="preview-dialog-loading-badge">{{ t("renderingPreviewBadge") }}</span>
                      <div class="progress-spinner preview-dialog-loading-spinner"></div>
                      <strong class="preview-dialog-loading-title">
                        {{ formatPreviewMessage("renderingPreviewTitle", { view: activePreviewDialogView || "-" }) }}
                      </strong>
                      <span class="preview-dialog-loading-text">{{ t("renderingPreviewHint") }}</span>
                    </div>
                  </div>
                  <img
                    v-else-if="previewDialogImage && !previewDialogFailedEntries.has(activePreviewDialogLoadKey)"
                    :src="previewDialogImage"
                    :alt="`${activePreviewDialogColor}-${activePreviewDialogView}`"
                    class="preview-dialog-image"
                    :style="activePreviewDialogImageStyle"
                    @load="cachePreviewImageNaturalSize(activePreviewDialogLoadKey, $event)"
                    @error="markPreviewDialogEntryLoaded(activePreviewDialogLoadKey, { failed: true })"
                  />
                  <div v-else class="preview-placeholder preview-placeholder--dialog">
                    <div class="placeholder-content">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{{ workspaceLoading || isPreviewImageLoading ? t("loadingPreview") : t("noPreviewAvailable") }}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="preview-nav next"
                  :disabled="availableViews.length <= 1"
                  @click="goToAdjacentView(1)"
                >
                  ›
                </button>
              </div>
            </section>
            <aside v-if="previewDialogEntries.length" class="preview-dialog-sidebar preview-dialog-sidebar--viewer">
              <div class="preview-dialog-sidebar-header">
                <strong>{{ t("batchViews") }}</strong>
                <span>{{ t("openPreview") }}</span>
              </div>
              <div class="preview-dialog-strip preview-dialog-strip--sidebar preview-dialog-strip--viewer">
                <button
                  v-for="entry in previewDialogEntries"
                  :key="entry.loadKey"
                  type="button"
                  class="preview-dialog-thumb"
                  :class="{
                    active: entry.view === activePreviewDialogView,
                    'preview-dialog-thumb--main': isPreviewDialogMainView(entry.view),
                  }"
                  :aria-pressed="entry.view === activePreviewDialogView"
                  @click="handleDialogViewSelection(entry.view)"
                >
                  <img
                    v-if="entry.url && !previewDialogFailedEntries.has(entry.loadKey)"
                    :src="entry.url"
                    :alt="`${activePreviewDialogColor}-${entry.view}`"
                    class="preview-dialog-thumb-image"
                  />
                  <span
                    v-else
                    class="preview-dialog-thumb-placeholder"
                    :class="{ 'preview-dialog-thumb-placeholder--loading': entry.view === activePreviewDialogView && isActivePreviewDialogLoading }"
                  >
                    {{ entry.view }}
                  </span>
                  <span
                    v-if="isPreviewDialogMainView(entry.view)"
                    class="preview-dialog-thumb-main-badge"
                    :title="t('draftMainImageBadge')"
                  >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 1.5l1.854 3.756 4.146.603-3 2.925.708 4.133L8 10.968l-3.708 1.949.708-4.133-3-2.925 4.146-.603L8 1.5z" fill="currentColor" />
                    </svg>
                  </span>
                  <span class="preview-dialog-thumb-copy">
                    <span class="preview-dialog-thumb-label">{{ entry.view }}</span>
                    <span v-if="entry.view === activePreviewDialogView" class="preview-dialog-thumb-status">{{ t("currentSelection") }}</span>
                  </span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="previewResultsSelectionModalOpen"
      class="workspace-modal-backdrop"
      :class="{ 'workspace-modal-backdrop--locked': isAddingPreviewResults }"
      @click.self="closePreviewResultsSelectionModal()"
    >
      <div
        class="workspace-modal workspace-modal--preview-results-select"
        :aria-busy="isAddingPreviewResults"
        @pointerdown.stop
        @mousedown.stop
        @click.stop
      >
        <div class="workspace-modal-header">
          <div>
            <h3 class="workspace-modal-title">{{ t("addPreviewToResults") }}</h3>
            <p class="workspace-modal-copy">{{ t("previewResultsSelectionHint") }}</p>
          </div>
          <button type="button" class="workspace-modal-close" :disabled="isAddingPreviewResults" @click="closePreviewResultsSelectionModal()">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--preview-results-select">
          <div class="preview-results-selection-summary">
            <span>{{ formatPreviewMessage("previewResultsSelectedCount", { count: String(selectedPreviewResultViews.length) }) }}</span>
            <span>{{ selectedColor || "-" }}</span>
          </div>
          <div
            v-if="isAddingPreviewResults || previewResultsActionNotice"
            class="preview-results-selection-feedback"
            :class="{ 'is-busy': isAddingPreviewResults }"
            role="status"
            aria-live="polite"
          >
            <span>{{ isAddingPreviewResults ? t("previewResultsAddingHint") : previewResultsActionNotice }}</span>
            <strong v-if="isAddingPreviewResults" class="preview-results-selection-warning">
              {{ t("previewResultsDoNotClose") }}
            </strong>
          </div>
          <div class="preview-results-selection-grid">
            <label
              v-for="entry in previewResultsSelectionEntries"
              :key="`preview-result-${entry.view}`"
              class="preview-results-selection-card"
              :class="{
                active: selectedPreviewResultViews.includes(entry.view),
                disabled: !entry.selectable || isAddingPreviewResults,
                current: entry.view === selectedView,
              }"
            >
              <input
                type="checkbox"
                class="sr-only"
                :checked="selectedPreviewResultViews.includes(entry.view)"
                :disabled="!entry.selectable || isAddingPreviewResults"
                @change="togglePreviewResultSelection(entry.view)"
              />
              <span class="preview-results-selection-check" :class="{ active: selectedPreviewResultViews.includes(entry.view) }" />
              <img
                v-if="entry.url && !previewDialogFailedEntries.has(entry.loadKey)"
                :src="entry.url"
                :alt="`${selectedColor}-${entry.view}`"
                class="preview-results-selection-image"
              />
              <span v-else class="preview-results-selection-placeholder">{{ entry.view }}</span>
              <span class="preview-results-selection-copy">
                <strong>{{ entry.view }}</strong>
                <span>{{ entry.statusText }}</span>
              </span>
            </label>
          </div>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" :disabled="isAddingPreviewResults" @click="closePreviewResultsSelectionModal()">
            {{ t("cancel") }}
          </button>
          <button type="button" class="action-button primary" :disabled="!canConfirmPreviewResultsSelection" @click="confirmPreviewResultsSelection">
            {{ isAddingPreviewResults ? t("addingToResults") : t("confirm") }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="replaceArtworkModalOpen" class="workspace-modal-backdrop" @click.self="closeReplaceArtworkModal()">
      <div class="workspace-modal workspace-modal--replace-artwork" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <div class="replace-artwork-header-copy">
            <h3 class="workspace-modal-title">{{ t("replacePictureDialogTitle") }}</h3>
            <p class="replace-artwork-header-text">{{ t("replacePictureDialogHint") }}</p>
          </div>
          <button type="button" class="workspace-modal-close" @click="closeReplaceArtworkModal()">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--replace-artwork">
          <div class="replace-artwork-summary">
            <div class="replace-artwork-summary-copy">
              <span class="replace-artwork-summary-label">{{ t("replacePictureScopeLabel") }}</span>
              <strong>{{ replaceArtworkScopeText }}</strong>
            </div>
            <div v-if="replaceArtworkTargetText" class="replace-artwork-summary-copy replace-artwork-summary-copy--target">
              <span class="replace-artwork-summary-label">{{ t("replacePictureTargetLabel") }}</span>
              <strong>{{ replaceArtworkTargetText }}</strong>
            </div>
          </div>
          <div class="segment-switch segment-switch--artwork replace-artwork-tabs">
            <button
              v-for="scope in replaceArtworkLibraryTabs"
              :key="scope.key"
              type="button"
              class="segment-switch-item"
              :class="{ active: artworkLibraryTab === scope.key }"
              @click="artworkLibraryTab = scope.key"
            >
              {{ scope.label }}
            </button>
          </div>
          <div class="template-library-filters template-library-filters--replace-artwork">
            <div class="template-filter-row template-filter-row--replace-artwork">
              <input
                :value="currentArtworkSearch"
                type="text"
                class="template-search-input replace-artwork-search-input"
                :placeholder="artworkLibraryTab === 'owned' ? t('searchPersonalImage') : artworkLibraryTab === 'licensed' ? t('searchPurchasedArtwork') : t('searchNameCode')"
                @input="updateArtworkSearch(($event.target as HTMLInputElement).value)"
              />
              <div
                v-if="artworkLibraryTab !== 'owned'"
                class="template-category-popover replace-artwork-category-popover"
                :class="{ open: showArtworkCategoryPopover }"
              >
                <button
                  type="button"
                  class="template-filter-icon-btn"
                  :class="{ active: currentArtworkCategoryId !== 'all' }"
                  :title="t('filterArtworkCategories')"
                  @click.stop="toggleArtworkCategoryPopover($event)"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                </button>
                <Teleport to="body">
                  <div
                    v-if="showArtworkCategoryPopover"
                    class="template-category-panel replace-artwork-category-panel template-category-panel--floating"
                    :style="categoryPopoverPosition ? { top: categoryPopoverPosition.top + 'px', left: categoryPopoverPosition.left + 'px', width: categoryPopoverPosition.width + 'px' } : undefined"
                    @click.stop
                  >
                    <CategoryCascadeSelector
                      :model-value="currentArtworkCategoryId"
                      :categories="currentArtworkCategories"
                      clear-value="all"
                      :allow-non-leaf="true"
                      display-mode="panel"
                      :level1-placeholder="t('allArtwork')"
                      :level2-placeholder="t('selectLevel2')"
                      :level3-placeholder="t('selectLevel3')"
                      :helper-text="t('filterArtworkByContentCategory')"
                      recent-storage-key="mockup-preview-artwork-categories"
                      @update:model-value="updateArtworkCategoryFilter"
                    />
                  </div>
                </Teleport>
              </div>
            </div>
          </div>
          <div class="replace-artwork-library-meta">
            <span>{{ replaceArtworkResultSummary }}</span>
            <span v-if="artworkLibraryTab !== 'owned'">{{ replaceArtworkCategorySummary }}</span>
          </div>
          <div v-if="artworkFeedbackMessage" class="status-message" :class="artworkFeedbackTone">
            <span>{{ artworkFeedbackMessage }}</span>
            <button
              v-if="pendingArtworkPurchaseEntry"
              type="button"
              class="tool-btn primary inline-action-btn"
              :disabled="buyingArtworkId === pendingArtworkPurchaseEntry.artwork_id || isApplyingArtworkReplacement"
              @click="purchasePendingArtwork"
            >
              {{ buyingArtworkId === pendingArtworkPurchaseEntry.artwork_id
                ? t("unlocking")
                : resolveArtworkUnlockButtonLabel(pendingArtworkPurchaseEntry.price_tokens) }}
            </button>
          </div>
          <div
            v-if="currentArtworkEntries.length"
            class="workspace-scroll-area artwork-library-scroll-area replace-artwork-library-scroll-area"
          >
            <div class="library-grid library-grid--artwork" :key="`replace:${artworkLibraryTab}:${currentArtworkPage}`">
              <button
                v-for="artwork in currentArtworkEntries"
                :key="`replace-${artworkKey(artwork)}`"
                type="button"
                class="library-tile"
                :class="{ active: replaceArtworkSelectionId === artwork.artwork_id }"
                :title="resolveArtworkDisplayName(artwork)"
                :aria-label="getArtworkTileAriaLabel(artwork)"
                @mouseenter="setHoveredArtwork(artwork, $event)"
                @mouseleave="scheduleHoveredArtworkClear()"
                @focus="setHoveredArtwork(artwork, $event)"
                @blur="scheduleHoveredArtworkClear()"
                @click="handleReplaceArtworkTileSelection(artwork)"
              >
                <span class="library-tile-thumb">
                  <img :src="resolveAssetUrl(artwork.preview_url)" :alt="resolveArtworkDisplayName(artwork)" />
                  <span
                    v-if="resolveArtworkAccessScopeLabel(artwork)"
                    class="library-tile-scope-badge library-tile-scope-badge--private"
                    :title="resolveArtworkAccessScopeLabel(artwork)"
                    :aria-label="resolveArtworkAccessScopeLabel(artwork)"
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M6.75 8V6.75a3.25 3.25 0 1 1 6.5 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                      <rect x="4.75" y="8" width="10.5" height="7.75" rx="2" stroke="currentColor" stroke-width="1.6" />
                    </svg>
                  </span>
                  <span
                    v-if="shouldShowArtworkTileBadge(artwork)"
                    class="library-tile-cta"
                    :class="getArtworkTileBadgeClass(artwork)"
                  >
                    <span class="library-tile-cta-primary">{{ getArtworkTileBadgeLabel(artwork) }}</span>
                    <span v-if="getArtworkTileBadgeSecondaryLabel(artwork)" class="library-tile-cta-secondary">
                      {{ getArtworkTileBadgeSecondaryLabel(artwork) }}
                    </span>
                  </span>
                  <span class="library-tile-name">{{ resolveArtworkDisplayName(artwork) }}</span>
                </span>
              </button>
            </div>
          </div>
          <div v-if="artworkLibraryTab === 'owned' && !ownedArtworkLibrary.length" class="tool-empty">{{ t("uploadImageToStartLibrary") }}</div>
          <div v-else-if="artworkLibraryTab === 'licensed' && !licensedArtworkEntries.length" class="tool-empty">{{ t("licensedLibraryEmpty") }}</div>
          <div v-else-if="!currentArtworkEntries.length" class="tool-empty">
            {{ artworkLibraryEmptyState }}
          </div>
          <div v-if="currentArtworkTotalPages > 1" class="pagination-bar">
            <button type="button" class="pagination-btn" :disabled="currentArtworkPage <= 1 || isApplyingArtworkReplacement" @click="goToArtworkPage(currentArtworkPage - 1)">
              {{ t("prev") }}
            </button>
            <span class="pagination-status">{{ currentArtworkPage }} / {{ currentArtworkTotalPages }}</span>
            <button type="button" class="pagination-btn" :disabled="currentArtworkPage >= currentArtworkTotalPages || isApplyingArtworkReplacement" @click="goToArtworkPage(currentArtworkPage + 1)">
              {{ t("next") }}
            </button>
          </div>
        </div>
        <div class="workspace-modal-footer replace-artwork-modal-footer">
          <button type="button" class="action-button secondary" :disabled="isApplyingArtworkReplacement" @click="closeReplaceArtworkModal()">
            {{ t("cancel") }}
          </button>
          <button type="button" class="action-button secondary" :disabled="isApplyingArtworkReplacement" @click="triggerReplaceArtworkUpload()">
            {{ t("uploadNewArtwork") }}
          </button>
          <button type="button" class="action-button primary" :disabled="!canConfirmReplaceArtwork" @click="confirmReplaceArtworkSelection">
            {{ isApplyingArtworkReplacement ? t("replacingArtwork") : replaceArtworkConfirmLabel }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="duplicateLayerCountModalOpen" class="workspace-modal-backdrop" @click.self="closeDuplicateLayerCountModal()">
      <div class="workspace-modal workspace-modal--duplicate-count" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <div>
            <h3 class="workspace-modal-title">{{ t("duplicateLayerCountTitle") }}</h3>
            <p class="workspace-modal-copy">{{ duplicateLayerCountHint }}</p>
          </div>
          <button type="button" class="workspace-modal-close" @click="closeDuplicateLayerCountModal()">×</button>
        </div>
        <div class="workspace-modal-body">
          <label class="field-label" for="duplicate-layer-count-input">{{ t("duplicateLayerCountLabel") }}</label>
          <input
            id="duplicate-layer-count-input"
            v-model="duplicateLayerCountDraft"
            type="number"
            min="1"
            max="50"
            step="1"
            class="template-search-input duplicate-count-input"
            @keydown.enter.prevent="confirmDuplicateLayerCount"
          />
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" :disabled="isApplyingDuplicateLayerCount" @click="closeDuplicateLayerCountModal()">
            {{ t("cancel") }}
          </button>
          <button type="button" class="action-button primary" :disabled="!canConfirmDuplicateLayerCount" @click="confirmDuplicateLayerCount">
            {{ isApplyingDuplicateLayerCount ? t("duplicatingLayerCount") : t("confirm") }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="layerSizeModalOpen" class="workspace-modal-backdrop" @click.self="closeLayerSizeModal()">
      <div class="workspace-modal workspace-modal--layer-size" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="workspace-modal-header">
          <div class="layer-size-modal-copy">
            <h3 class="workspace-modal-title">{{ layerSizeModalTitle }}</h3>
            <p class="workspace-modal-copy">{{ layerSizeModalHint }}</p>
          </div>
          <button type="button" class="workspace-modal-close" @click="closeLayerSizeModal()">×</button>
        </div>
        <div class="workspace-modal-body workspace-modal-body--layer-size">
          <div v-if="layerSizeMeasurement" class="layer-size-current">
            <span class="layer-size-current-label">{{ t("currentSize") }}</span>
            <strong>{{ layerSizeMeasurement.label }}</strong>
          </div>
          <div class="layer-size-form">
            <span class="field-label">{{ t("width") }}</span>
            <ElInputNumber
              id="layer-size-width-input"
              :model-value="layerSizeDraftWidth"
              :min="0.1"
              :step="0.1"
              :precision="1"
              controls-position="right"
              class="tool-input-number layer-size-input"
              :aria-label="t('width')"
              @focus="beginSizeInput(layerSizeDraftKey)"
              @update:model-value="updateLayerSizeDraftNumber('width', $event)"
            />
            <span class="field-label">{{ t("height") }}</span>
            <ElInputNumber
              id="layer-size-height-input"
              :model-value="layerSizeDraftHeight"
              :min="0.1"
              :step="0.1"
              :precision="1"
              controls-position="right"
              class="tool-input-number layer-size-input"
              :aria-label="t('height')"
              @focus="beginSizeInput(layerSizeDraftKey)"
              @update:model-value="updateLayerSizeDraftNumber('height', $event)"
            />
            <span v-if="layerSizeUnit" class="layer-size-unit">{{ layerSizeUnit }}</span>
          </div>
        </div>
        <div class="workspace-modal-footer">
          <button type="button" class="action-button secondary" :disabled="isApplyingLayerSize" @click="closeLayerSizeModal()">
            {{ t("cancel") }}
          </button>
          <button type="button" class="action-button primary" :disabled="!canConfirmLayerSize" @click="confirmLayerSizeModal">
            {{ isApplyingLayerSize ? t("saving") : t("confirm") }}
          </button>
        </div>
      </div>
    </div>
    <teleport to="body">
      <div
        v-if="imageContextMenu"
        ref="imageContextMenuRef"
        class="canvas-context-menu"
        :style="imageContextMenuStyle"
        @click.stop
      >
        <div class="canvas-context-menu-title">{{ activeImageContextMenuTitle }}</div>
        <button
          v-for="item in activeImageContextMenuItems"
          :key="item.action"
          type="button"
          class="canvas-context-menu-item"
          :class="{ danger: item.danger }"
          @click="runImageContextMenuAction(item.action)"
        >
          {{ item.label }}
        </button>
      </div>
    </teleport>
    <div v-if="placeOrderModalOpen" class="place-order-modal-overlay" @click.self="closePlaceOrderModal">
      <div class="place-order-modal">
        <header class="place-order-modal-header">
          <h2>{{ t('placeOrderModalTitle') }}</h2>
          <button type="button" class="place-order-modal-close" :aria-label="t('close')" @click="closePlaceOrderModal">×</button>
        </header>
        <div class="place-order-modal-body">
          <!-- Bug 2-3/2-4: 顶部紧凑布局 — 80x80 缩略图 + 标题/价格,去除左侧空白栏 -->
          <div class="place-order-modal-summary">
            <img class="place-order-modal-main-image" :src="placeOrderHeroImage" :alt="placeOrderActiveView" />
            <div class="place-order-modal-summary-info">
              <div class="po-product-name">{{ wordpressCurrentProduct?.name }}</div>
              <div
                v-if="wordpressCurrentProduct?.price_html"
                class="po-product-price"
                v-html="wordpressCurrentProduct.price_html"
              />
              <!-- 0.4.44: 设计稿下拉框始终显示;若无 draft 则显示 disabled 占位项,而不是直接消失 -->
              <!-- 0.4.46: native <select> 的 popup 在弹窗内会"向上展开"挡住控件,改为自定义下拉强制下方展开 -->
              <div class="po-design-switcher">
                <span class="po-design-switcher-label">{{ t('drafts') }}:</span>
                <div
                  class="po-design-switcher-dropdown"
                  :class="{ 'is-open': isPlaceOrderDraftDropdownOpen, 'is-disabled': !placeOrderDraftOptions.length || isAddingToCart }"
                >
                  <button
                    type="button"
                    class="po-design-switcher-trigger"
                    :disabled="!placeOrderDraftOptions.length || isAddingToCart"
                    @click="togglePlaceOrderDraftDropdown"
                  >
                    <span class="po-design-switcher-trigger-text">{{ placeOrderDraftDropdownLabel }}</span>
                    <svg class="po-design-switcher-caret" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <ul
                    v-if="isPlaceOrderDraftDropdownOpen && placeOrderDraftOptions.length"
                    class="po-design-switcher-panel"
                    role="listbox"
                  >
                    <li
                      v-for="opt in placeOrderDraftOptions"
                      :key="opt.draftId"
                      class="po-design-switcher-option"
                      :class="{ 'is-active': opt.draftId === activeDraftId }"
                      role="option"
                      :aria-selected="opt.draftId === activeDraftId"
                      @click.stop="handlePlaceOrderDraftPick(opt.draftId)"
                    >{{ opt.label }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div class="place-order-modal-form">
            <div class="po-rows">
              <div
                v-for="(row, rowIndex) in placeOrderRows"
                :key="row.id"
                class="po-requirement-row"
              >
                <!-- 0.4.42: 编号与字段同行展示，删除行头独立行 -->
                <div class="po-requirement-fields">
                  <div class="po-requirement-row-index">{{ rowIndex + 1 }}.</div>
                  <div class="po-field">
                    <span class="po-field-label">{{ t('placeOrderColorLabel') }}</span>
                    <!-- 0.4.42: color 在弹窗内可切换，主图随第一行 color 联动 -->
                    <!-- 0.4.47: 改为自定义下拉,与 designs 风格一致,强制下方展开 -->
                    <!-- 0.4.56: 由 <label> 改为 <div>,避免 li 点击被 label 语义同步派发到 trigger button 上重新打开下拉 -->
                    <div
                      class="po-field-dropdown"
                      :class="{ 'is-open': openPoRowDropdown === `${row.id}::color`, 'is-disabled': isAddingToCart }"
                    >
                      <button
                        type="button"
                        class="po-field-trigger"
                        :disabled="isAddingToCart"
                        @click="togglePoRowDropdown(`${row.id}::color`)"
                      >
                        <span class="po-field-trigger-text">{{ (placeOrderColors.find(o => o.value === row.color) || { label: row.color }).label || '—' }}</span>
                        <svg class="po-field-caret" viewBox="0 0 12 12" aria-hidden="true">
                          <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <ul
                        v-if="openPoRowDropdown === `${row.id}::color`"
                        class="po-field-panel"
                        role="listbox"
                      >
                        <li
                          v-for="opt in placeOrderColors"
                          :key="opt.value"
                          class="po-field-option"
                          :class="{ 'is-active': opt.value === row.color }"
                          role="option"
                          :aria-selected="opt.value === row.color"
                          @click.stop="pickPoRowOption(() => { row.color = opt.value })"
                        >{{ opt.label }}</li>
                      </ul>
                    </div>
                  </div>
                  <div v-if="placeOrderSizeOptions.length" class="po-field">
                    <span class="po-field-label">{{ placeOrderSizeAttributeName || t('size') }}</span>
                    <div
                      class="po-field-dropdown"
                      :class="{ 'is-open': openPoRowDropdown === `${row.id}::size`, 'is-disabled': isAddingToCart }"
                    >
                      <button
                        type="button"
                        class="po-field-trigger"
                        :disabled="isAddingToCart"
                        @click="togglePoRowDropdown(`${row.id}::size`)"
                      >
                        <span class="po-field-trigger-text">{{ row.attributes[placeOrderSizeAttributeName] || '—' }}</span>
                        <svg class="po-field-caret" viewBox="0 0 12 12" aria-hidden="true">
                          <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <ul
                        v-if="openPoRowDropdown === `${row.id}::size`"
                        class="po-field-panel"
                        role="listbox"
                      >
                        <li
                          v-for="opt in placeOrderSizeOptions"
                          :key="opt"
                          class="po-field-option"
                          :class="{ 'is-active': opt === row.attributes[placeOrderSizeAttributeName] }"
                          role="option"
                          :aria-selected="opt === row.attributes[placeOrderSizeAttributeName]"
                          @click.stop="pickPoRowOption(() => { row.attributes[placeOrderSizeAttributeName] = opt })"
                        >{{ opt }}</li>
                      </ul>
                    </div>
                  </div>
                  <div
                    v-for="attr in placeOrderNonSizeAttributes"
                    :key="`${row.id}-${attr.name}`"
                    class="po-field"
                  >
                    <span class="po-field-label">{{ attr.name }}</span>
                    <div
                      class="po-field-dropdown"
                      :class="{ 'is-open': openPoRowDropdown === `${row.id}::attr::${attr.name}`, 'is-disabled': isAddingToCart }"
                    >
                      <button
                        type="button"
                        class="po-field-trigger"
                        :disabled="isAddingToCart"
                        @click="togglePoRowDropdown(`${row.id}::attr::${attr.name}`)"
                      >
                        <span class="po-field-trigger-text">{{ row.attributes[attr.name] || '—' }}</span>
                        <svg class="po-field-caret" viewBox="0 0 12 12" aria-hidden="true">
                          <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <ul
                        v-if="openPoRowDropdown === `${row.id}::attr::${attr.name}`"
                        class="po-field-panel"
                        role="listbox"
                      >
                        <li
                          v-for="opt in attr.options"
                          :key="opt"
                          class="po-field-option"
                          :class="{ 'is-active': opt === row.attributes[attr.name] }"
                          role="option"
                          :aria-selected="opt === row.attributes[attr.name]"
                          @click.stop="pickPoRowOption(() => { row.attributes[attr.name] = opt })"
                        >{{ opt }}</li>
                      </ul>
                    </div>
                  </div>
                  <div class="po-field">
                    <span class="po-field-label">{{ t('placeOrderQuantityLabel') }}</span>
                    <div
                      class="po-field-dropdown"
                      :class="{ 'is-open': openPoRowDropdown === `${row.id}::qty`, 'is-disabled': isAddingToCart }"
                    >
                      <button
                        type="button"
                        class="po-field-trigger"
                        :disabled="isAddingToCart"
                        @click="togglePoRowDropdown(`${row.id}::qty`)"
                      >
                        <span class="po-field-trigger-text">{{ row.quantity }}</span>
                        <svg class="po-field-caret" viewBox="0 0 12 12" aria-hidden="true">
                          <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <ul
                        v-if="openPoRowDropdown === `${row.id}::qty`"
                        class="po-field-panel"
                        role="listbox"
                      >
                        <li
                          v-for="n in placeOrderQuantityOptions"
                          :key="n"
                          class="po-field-option"
                          :class="{ 'is-active': n === row.quantity }"
                          role="option"
                          :aria-selected="n === row.quantity"
                          @click.stop="pickPoRowOption(() => { row.quantity = n })"
                        >{{ n }}</li>
                      </ul>
                    </div>
                  </div>
                  <!-- 0.4.64: 每行 variation 单价(不同 size/color 价格不同) -->
                  <div class="po-field po-field--price">
                    <span class="po-field-label">{{ t('placeOrderPriceLabel' as any) || 'Price' }}</span>
                    <span class="po-field-price-display" v-html="getRowPriceHtml(row) || '—'"></span>
                  </div>
                  <label
                    v-for="(layer, idx) in placeOrderTextLayers"
                    :key="`${row.id}-text-${layer.id}`"
                    class="po-field po-field--text"
                  >
                    <span class="po-field-label">#{{ idx + 1 }} {{ layer.label }}</span>
                    <input class="po-field-select" type="text" v-model="row.textOverrides[layer.id]" />
                  </label>
                  <button
                    v-if="placeOrderRows.length > 1"
                    type="button"
                    class="po-row-remove"
                    :aria-label="t('close')"
                    @click="removePlaceOrderRow(row.id)"
                  >×</button>
                </div>
              </div>
            </div>
            <!-- 0.4.42: Total Qty 移到所有需求列表的最下方 -->
            <div class="po-total-summary">
              <span>{{ t('placeOrderTotalQuantity') }}</span>
              <strong>{{ placeOrderTotalQuantity }}</strong>
            </div>
            <button type="button" class="po-add-row" @click="addPlaceOrderRow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{{ t('placeOrderAddRow') }}</span>
            </button>
            <div v-if="placeOrderTotalDisplay" class="po-total">
              <span>{{ t('placeOrderTotalLabel' as any) }}</span>
              <strong>{{ placeOrderTotalDisplay }}</strong>
            </div>
            <button
              type="button"
              class="po-submit"
              :disabled="isAddingToCart || !placeOrderDraftOptions.length"
              @click="submitPlaceOrder"
            >
              {{ isAddingToCart ? t('placeOrderProcessing') : t('placeOrderAddToCart') }}
            </button>
            <p v-if="!placeOrderDraftOptions.length" class="po-no-draft-tip">
              {{ t('placeOrderSaveDraftFirst') }}
            </p>
            <p v-if="placeOrderError" class="po-error">{{ placeOrderError }}</p>
          </div>
        </div>
      </div>
    </div>
    <!-- 0.4.51: 平台租户 token 余额不足弹窗。WP shell + console 同时复用,
         消息面向"站点/租户管理员",因为计费由平台租户承担,与 WP 终端用户无关。 -->
    <div
      v-if="insufficientTokensModalOpen"
      class="mockup100-insufficient-tokens-backdrop"
      @click.self="insufficientTokensModalOpen = false"
    >
      <div class="mockup100-insufficient-tokens-modal" role="dialog" aria-modal="true">
        <header><h3>{{ t("insufficientTokensTitle") }}</h3></header>
        <div class="body">
          <p><strong>{{ t("insufficientTokensReasonLabel") }}</strong>{{ t("insufficientTokensReasonText") }}</p>
          <p>
            <strong>{{ t("insufficientTokensActionLabel") }}</strong>{{ t("insufficientTokensActionPrefix") }}
            <a href="https://www.mockup100.com/admin/tokens-management" target="_blank" rel="noopener">{{ t("insufficientTokensActionLink") }}</a>{{ t("insufficientTokensActionSuffix") }}
          </p>
        </div>
        <footer>
          <button type="button" class="action-button" @click="insufficientTokensModalOpen = false">{{ t("insufficientTokensClose") }}</button>
        </footer>
      </div>
    </div>
    <GradingWorkspaceModal
      :open="gradingModalOpen"
      :grading="templateGradingSummary"
      :template-name="gradingTemplateName"
      :template-id="selectedTemplateId"
      :design-signature="gradingDesignSignature"
      :auth-headers="authStore.authHeaders"
      :export-part-pngs="exportPartPngsHandler"
      :export-part-svgs="exportPartSvgsHandler"
      runtime-base-url=""
      @close="gradingModalOpen = false"
      @paywall="onGradingPaywall"
    />
    <!-- Plan v3 §S2.3：未订阅用户预拦截或 WorkspaceModal 内兜底回退弹出的订阅引导。 -->
    <GradingSubscriptionGateModal
      v-if="gradingGateOpen"
      @close="gradingGateOpen = false"
      @trialStarted="onGradingTrialStarted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from "vue"
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter, type RouteLocationRaw } from "vue-router"
import { storeToRefs } from "pinia"
import { ElInputNumber } from "element-plus"
import "element-plus/es/components/input-number/style/css"
import BrandLogo from "../../components/BrandLogo.vue"
import CategoryCascadeSelector from "../../components/CategoryCascadeSelector.vue"
import FilterDropdown from "../../components/FilterDropdown.vue"
const EditorCanvas = defineAsyncComponent(() => import("../../components/EditorCanvas.vue"))
import GradingWorkspaceModal from "../../components/preview/GradingWorkspaceModal.vue"
import GradingSubscriptionGateModal from "../../components/GradingSubscriptionGateModal.vue"
import TokenPurchaseModal from "../../components/TokenPurchaseModal.vue"
import { useUserCapabilities, fetchUserCapabilities } from "../../composables/useUserCapabilities"
import { useAuthStore } from "../../stores/auth"
import { usePlatformStore, type CategoryNode, type TemplateCenterListing, type TemplateSubmissionItem } from "../../stores/platform"
import { useArtworkStore } from "../../stores/artworks"
import { useStorefrontStore } from "../../stores/storefront"
import { buildTemplateIdentityKeys, useTemplateStore } from "../../stores/templates"
import { useEditorStore } from "../../stores/editor"
import {
  DEFAULT_PREVIEW_DRAFT_NAME,
  DraftReferenceConflictError,
  usePreviewDraftStore,
  type DraftReferenceConflictReason,
  type PreviewDraftContent,
} from "../../stores/previewDrafts"
import { useUiLocaleStore } from "../../stores/uiLocale"
import {
  ApiRequestError,
  type ArtworkCategoryNode,
  type ArtworkLicenseRecord,
  type ArtworkListItem,
  archiveRuntimeRenderFiles,
  gatewayPlatformFetch,
  resolveAssetUrl,
  resolveApiErrorMessage,
  resolveRuntimeAssetUrl,
  resolveRuntimeRenderFileUrl,
  type PhysicalDisplayUnit,
  type TemplateSummary,
} from "../../api/client"
import { isTechnicalTemplateWorkflowMessage } from "../../utils/templateWorkflowErrors"
import {
  DEFAULT_NEW_TEXT_CONTENT,
  DEFAULT_IMAGE_OPACITY,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_LINE_HEIGHT,
  TEXT_FONT_FAMILY_OPTIONS,
  normalizeImageOpacity,
  normalizeTextFontSize,
  normalizeTextLineHeight,
} from "../../utils/editorLayerStyles"
import {
  findMatchingPreviewShortcut,
  listPreviewShortcuts,
  listVisiblePreviewShortcuts,
} from "../../utils/previewShortcuts"
import {
  buildPersistedPreviewOutputKey,
  clampPage,
  extractPreviewDraftFinishedProductCode,
  getPreviewSignature,
  isPublishedTemplateScope,
  isPersistedPreviewOutputReusable,
  pickLatestReusablePreviewOutputs,
  resolveInitialPreviewTemplateScope,
  resolvePreviewDraftFinishedProductCodeMap,
  resolvePreviewDraftRuntimeSelection,
  resolvePreviewTemplateScopeConfig,
  resolvePreviewTemplateScopeState,
  resolveRestorePreviewMode,
  hasGrantedArtworkLicense,
  hasPersistableWorkspaceDesign,
  isArtworkLicenseGrantedByLookup,
  isInsufficientArtworkTokensError,
  paginateItems,
  parseStoredWorkspaceDesign,
  resolveArtworkAccessScope,
  resolveArtworkCardAction,
  resolveArtworkCardBadges,
  resolveArtworkCommerceBadgeKind,
  resolvePageCount,
  type PreviewAuthRole,
  type PreviewTemplateScope,
} from "../../utils/repositoryPreviewWorkspace"
import { SIZE_DIMENSIONS, formatSizeLabel, formatTokenPrice, sizeTokenToTier } from "../../utils/renderPricing"
import { resolveDisplayName, stripDisplayFileExtension } from "../../utils/displayNames"
import {
  resolveLayerSizeModalResizeFactors,
  resolveReplaceArtworkLibraryLabelKey,
  resolveReplacementImageScale,
} from "../../utils/previewImageEditing"
import { formatMarketplaceCreatorName, getListedMarketplaceTemplates } from "./centerView"
import { buildAdminTenantRoute, readAdminTenantContext } from "./adminTenantContext"
import {
  buildPlatformPreviewTemplates,
  buildTemplatePreviewIdentityKeys,
  buildTemplatePreviewReferenceKeys,
  countRepositoryPreviewTemplatesByScope,
  createTemplatePreviewCatalog,
  filterRepositoryPreviewDraftTemplates,
  filterRepositoryPreviewReviewTemplates,
  filterRepositoryPreviewSharedTemplates,
  findTemplatePreviewEntry,
  listTemplatePreviewEntriesForScope,
  resolvePreviewTemplateAccessScope,
  resolveRepositoryTemplateAccessScope,
  resolveTemplatePreviewPage,
  resolveTemplatePreviewScope,
  type TemplatePreviewEntry,
} from "./repositoryPreviewTemplateVisibility"
import { buildCategoryIdSet, findCategoryPath, formatTemplateDate } from "./repositoryView"
import {
  buildArtworkCategoryIdSetForTab,
  countPreviewArtworkEntriesByTab,
  filterPreviewArtworkEntries,
  matchesPreviewArtworkSearch,
  normalizePreviewArtworkSearch,
  resolveArtworkCategoriesForTab,
  resolveArtworkCategoryIdForTab,
  resolvePreviewArtworkLibraryTab,
  shouldHydratePreviewArtworkLibraryTab,
  squashPreviewArtworkSearch,
  type PreviewArtworkCategoryState,
  type PreviewArtworkCategoryTrees,
} from "./previewArtworkFilters"
import {
  mergeOwnedArtworkLibraryEntries,
  normalizeArtworkEntryUrls,
  shouldMarkPreviewDraftDirtyFromCanvasChange,
  type PreviewCanvasStateChangeSource,
} from "./repositoryPreviewArtworkLibrary"
import { resolveArtworkInsertSource } from "./repositoryPreviewArtworkSource"
import { computeFloatingHoverOverlay } from "../../utils/floatingHoverOverlay"
import { resolveCurrentPhysicalDimension, type PhysicalDimensionsValue } from "../../utils/physicalRuler"

type RenderOutputEntry = {
  id: string
  mode?: PreviewSourceMode
  color: string
  view: string
  size: string
  filePath: string
  url: string
  createdAt: string
  draftId?: string
  designSignature?: string
  source?: "preview" | "export" | "draft_save" | "download_zip"
}

type PreviewSourceMode = "default" | "artwork"
type LayerKind = "image" | "text"
type SidebarTabKey = "products" | "product-details" | "template" | "artwork" | "text" | "layers" | "background" | "svg"
type PreviewLocale = "en" | "zh"
type ImageTileMode = "single" | "tile-basic" | "tile-horizontal" | "tile-vertical" | "tile-mirror"
type PreviewSizeOption = {
  value: string
  label: string
  helper: string
  isOriginal?: boolean
  isCustom?: boolean
}
type ImageContextMenuPayload = {
  left: number
  top: number
  partKey: string
  layerId: string
  layerKind: LayerKind
}
type LayerSizeModalMode = "image" | "text"
type ArtworkLibraryTabKey = "platform" | "tenant" | "licensed" | "owned"
type ArtworkReplacementLibraryScope = "owned" | "platform" | "tenant" | "licensed"
type ImageContextAction =
  | "replace-current"
  | "replace-name-part"
  | "replace-name-all"
  | "duplicate"
  | "duplicate-count"
  | "edit-size"
  | "spread-part-bounds"
  | "spread-part-canvas"
  | "refresh-preview"
  | "edit-text"
  | "rotate-left"
  | "rotate-right"
  | "delete"
  | "flip-x"
  | "flip-y"
  | "bring-front"
  | "send-back"
type ImageTileShortcutId =
  | "pattern-tile-non-tile"
  | "pattern-tile-basic"
  | "pattern-tile-landscape"
  | "pattern-tile-vertical"
  | "pattern-tile-mirror"
type ShortcutEntry = {
  key: string
  label: string
  keys: string
}
type SerializableCanvasState = {
  version: number
  persistedAt?: number
  activePartKey?: string
  activeLayerId?: string
  parts: Array<{
    partKey: string
    layers: Array<Record<string, unknown>>
  }>
}
type ArtworkUploadResult = {
  id: string
  name: string
  src: string
  previewSrc: string
}
type ArtworkReplacementAsset = ArtworkUploadResult & {
  libraryScope: ArtworkReplacementLibraryScope
}
type OutputSizeValue = {
  width: number
  height: number
  normalized: string
}
type CanvasTextState = {
  text: string
  fontSize: number
  fill: string
  fontWeight: string
  fontStyle: string
  textAlign: "left" | "center" | "right"
  fontFamily: string
  lineHeight: number
  textboxDisplay?: {
    width: number
    height: number
    unit: PhysicalDisplayUnit
    label: string
  } | null
  rulerBoxDisplay?: {
    width: number
    height: number
    unit: PhysicalDisplayUnit
    label: string
  } | null
  textContent?: {
    display?: {
      width: number
      height: number
      unit: PhysicalDisplayUnit
      label: string
    } | null
  } | null
}

type CanvasImageState = {
  opacity: number
  tileMode: ImageTileMode
  rulerBoxDisplay?: {
    width: number
    height: number
    unit: PhysicalDisplayUnit
    label: string
  } | null
  imageBoxDisplay?: {
    width: number
    height: number
    unit: PhysicalDisplayUnit
    label: string
  } | null
  isSvg: boolean
  svgFill: string | null
  svgLayers: Array<{
    id: string
    label: string
    tagName: string
    originalFill: string
    currentFill: string
  }>
  activeSvgLayerId: string | null
}

type ComposeResponse = {
  job_id: string
  outputs: Array<{ size: string; file_path: string; preview_url?: string; download_url?: string }>
}

type TemplateCatalogEntry = TemplateSummary & {
  source: PreviewTemplateScope
  listing_id?: string
  creator_name?: string
  listed_at?: string
  review_status?: string
}

type ArtworkLibraryEntry = {
  id: string
  name: string
  src: string
  previewSrc?: string
  createdAt: string
}

type ArtworkCatalogEntry = {
  artwork_id: string
  artwork_code?: string
  library_scope: "platform" | "tenant" | "licensed" | "upload"
  access_scope?: "public" | "private"
  visibility_status?: "draft" | "listed" | "disabled"
  owner_tenant_id?: string | null
  source_provider?: string
  source_asset_id?: string
  source_url?: string
  name: string
  description?: string
  mime_type: string
  file_ext: string
  category_id?: string
  category_path?: string
  preview_url: string
  original_url: string
  creator_name?: string
  license_name?: string
  license_url?: string
  attribution_required?: boolean
  width?: number
  height?: number
  commerce_type?: "free" | "paid"
  price_tokens?: number
  purchased?: boolean
  unlocked?: boolean
  can_purchase?: boolean
  is_platform_owned?: boolean
  status: string
  created_at?: string
  updated_at?: string
}

type HoverOverlayClass =
  | "hover-overlay--bottom-left"
  | "hover-overlay--bottom-right"
  | "hover-overlay--top-left"
  | "hover-overlay--top-right"

const PREVIEW_I18N = {
  en: {
    undo: "Undo",
    redo: "Redo",
    clear: "Clear",
    clearCurrentPart: "Clear Current Part",
    clearAllParts: "Clear All Parts",
    shortcuts: "Shortcuts",
    export: "Export",
    results: "Results",
    drafts: "Designs",
    save: "Save",
    saveAs: "Save As",
    saving: "Saving...",
    refresh: "Refresh",
    language: "Language",
    uploadArtwork: "Upload artwork",
    addText: "Add text",
    toggleGrid: "Toggle grid",
    font: "Font",
    color: "Color",
    viewLabel: "View",
    textColor: "Text color",
    lineHeight: "Line Height",
    bold: "Bold",
    italic: "Italic",
    left: "Left",
    center: "Center",
    right: "Right",
    showLayer: "Show layer",
    hideLayer: "Hide layer",
    moveForward: "Move forward",
    moveBackward: "Move backward",
    renameLayer: "Rename layer",
    renameLayerPrompt: "Rename layer",
    noLayers: "No layers on this part.",
    fillColor: "Fill Color",
    svgFillColor: "SVG fill color",
    noEditableSvgLayers: "No editable SVG layers.",
    batchViews: "Batch Views",
    batchExportSize: "Batch Export Size",
    selectAll: "Select All",
    confirm: "Confirm",
    reset: "Reset",
    close: "Close",
    exporting: "Exporting...",
    downloading: "Downloading...",
    downloadZip: "Download ZIP",
    downloadBundle: "Download Bundle",
    downloadSelected: "Download Selected",
    clearSelection: "Clear",
    selectedCount: "{count} selected",
    generatedAt: "Generated",
    saveDraft: "Save Design",
    finishedProductCode: "Finished Product Code",
    newDraftWorkspace: "New",
    overwriteCurrentDraft: "Overwrite Current Design",
    createNewDraft: "Create New Design",
    cancel: "Cancel",
    currentDraftName: "Current design name",
    currentDraft: "Current Design",
    newDraftName: "New design name",
    enterDraftName: "Enter design name",
    confirmSave: "Confirm Save",
    switch: "Switch",
    active: "Active",
    lastUpdated: "Last updated",
    otherDrafts: "Other Designs",
    rename: "Rename",
    delete: "Delete",
    draftName: "Design name",
    noDraftsYet: "No designs yet.",
    unsavedChanges: "Unsaved Changes",
    unsavedChangesPromptBefore: "Current changes are not saved. Switch to",
    unsavedChangesPromptAfter: "after saving or discarding changes.",
    discardChanges: "Discard Changes",
    saveChanges: "Save Changes",
    saveAndSwitch: "Save And Switch",
    discardAndSwitch: "Discard And Switch",
    saveAndNew: "Save And New",
    discardAndNew: "Discard And New",
    unsavedChangesBeforeNewWorkspace: "Current changes are not saved. Create a new blank design after saving or discarding changes.",
    deleteDraft: "Delete Design",
    permanentlyQuestion: "permanently?",
    deleteCascadeTitle: "Delete this design and related data",
    deleteCascadeIntro: "Deleting design",
    deleteCascadeListLead: "will also remove the following related data:",
    deleteCascadeReasonActiveTemplateState: "Active template binding for {count} template(s){sample}",
    deleteCascadeReasonActiveTemplateOutput: "{count} active output file(s){sample}",
    deleteCascadeReasonDraftResourceRef: "{count} draft resource reference(s){sample}",
    deleteCascadeReasonOutputResourceRef: "{count} output resource reference(s){sample}",
    deleteCascadeReasonGeneric: "{type} ({count}){sample}",
    deleteCascadeWarning: "This cannot be undone. Continue?",
    deleteCascadeConfirm: "I understand, delete everything",
    deleteCascadeCancel: "Cancel",
    deleteDraftErrorTitle: "Failed to delete draft",
    deleteDraftErrorInUse: "This draft is still bound to a template's active revision. Please switch the template to another draft first, then delete it.",
    deleteDraftErrorMissing: "This draft no longer exists. Please refresh the page.",
    deleteDraftErrorGeneric: "Could not delete this draft. Please try again later or contact support if the issue persists.",
    openPreview: "Open Preview",
    setDraftMainImage: "Set As Main Image",
    draftMainImageSelected: "Main Image Selected",
    draftMainImageBadge: "Main",
    setDraftMainImageSuccess: "Main view updated for the current design. Save to sync the Designs thumbnail.",
    currentSelection: "Current",
    replacePictureDialogTitle: "Replace Picture",
    replacePictureDialogHint: "Choose artwork from the library tabs below, or upload a new file to replace the current image layer.",
    replacePictureScopeLabel: "Replacement Scope",
    replacePictureTargetLabel: "Target Layer",
    replacePictureScopeCurrent: "Current layer only",
    replacePictureScopeSameNamePart: "Same name on the current side",
    replacePictureScopeSameNameAll: "Same name on all sides",
    tenantShared: "Tenant / Shared",
    ownedPersonal: "Owned / Personal",
    uploadNewArtwork: "Upload New",
    replacingArtwork: "Replacing...",
    replaceCurrentLayer: "Replace Current Layer",
    replaceSameNamePart: "Replace Current Side",
    replaceSameNameAll: "Replace All Sides",
    replaceSelectArtworkFirst: "Select an artwork before replacing.",
    quickPreview: "Quick Preview",
    originalSize: "Original Size",
    customSize: "Custom Size",
    customSizePlaceholder: "For example 3000x2400",
    applyCustomSize: "Apply",
    addCustomSize: "Add Custom Size",
    customSizeInvalid: "Enter size as widthxheight, for example 3000x2400.",
    customSizeTokenHint: "Tokens are billed by the longest edge tier.",
    refreshPreviewNow: "Refresh preview now",
    addPreviewToResults: "Add To Results",
    addingToResults: "Adding...",
    previewResultsSelectionHint: "Select one or more views to add to Results.",
    previewResultsAddingHint: "Adding selected views to Results. Please wait...",
    previewResultsDoNotClose: "Do not close this page until the add operation finishes.",
    previewResultsSelectedCount: "{count} view(s) selected",
    previewResultsAddedCount: "{count} view(s) added to Results",
    previewResultsReady: "Ready to add",
    previewResultsUnavailable: "Preview unavailable",
    previewResultsAlreadyAdded: "Already in Results",
    previewResultsCurrentView: "Current view",
    duplicateLayerCountTitle: "Duplicate Layer Count",
    duplicateLayerCountLabel: "Copy count",
    duplicateLayerCountHint: "Enter how many copies to create for the selected {target}. Maximum 50.",
    duplicateLayerCountImageTarget: "image layer",
    duplicateLayerCountTextTarget: "text layer",
    duplicatingLayerCount: "Duplicating...",
    editImageSizeDialogTitle: "Modify Image Width and Height",
    editImageSizeDialogHint: "Adjust the current image layer size and confirm to apply the changes on canvas.",
    editTextSizeDialogTitle: "Modify Text Width and Height",
    editTextSizeDialogHint: "Adjust the current text content size and confirm to apply the changes on canvas.",
    currentSize: "Current Size",
    width: "Width",
    height: "Height",
    replaceArtworkResultsSummary: "{count} item(s) · page {page}/{total}",
    replaceArtworkCategorySummary: "Category: {category}",
    previewSizeFreeHint: "512 preview stays free in console.",
    previewSizeBilledAs: "Billed as",
    previewSizeOriginalHint: "Original size billed as",
    baseCode: "Base Code",
    currentPartLabel: "Current Part",
    copyCurrentPart: "Copy Current Part",
    copyCurrentPartTitle: "Copy current design to selected sides",
    duplicateLayer: "Duplicate Layer",
    deleteLayer: "Delete Layer",
    editText: "Edit Text",
    boundingBoxSize: "Bounding Box Size",
    imageSize: "Image Size (Actual)",
    aspectLock: "Lock aspect ratio",
    aspectUnlock: "Unlock aspect ratio",
    opacity: "Opacity",
    scaleUp: "Scale Up",
    scaleDown: "Scale Down",
    rotateLeft: "Rotate Left",
    rotateRight: "Rotate Right",
    flipHorizontal: "Flip Horizontal",
    flipVertical: "Flip Vertical",
    bringFront: "Bring Front",
    sendBack: "Send Back",
    centerLayer: "Center Layer",
    flipHorizontalMenu: "Flip Horizontally",
    flipVerticalMenu: "Flip Vertically",
    bringForward: "Bring Forward",
    sendBackward: "Send Backward",
    white: "White",
    mist: "Mist",
    blush: "Blush",
    sky: "Sky",
    mint: "Mint",
    ink: "Ink",
    switchToView: "Switch to {view}",
    template: "Template",
    artwork: "Artwork",
    text: "Text",
    layers: "Layers",
    background: "Background",
    overview: "Overview",
    libraries: "Libraries",
    publishing: "Publishing",
    orders: "Orders",
    finance: "Finance",
    storefront: "Creative Space",
    developer: "Developer",
    administration: "Administration",
    account: "Account",
    dashboard: "Dashboard",
    templateLibrary: "Template Library",
    artworkLibrary: "Artwork Library",
    templateCenter: "Template Center",
    artworkCenter: "Artwork Center",
    artworkOrders: "Artwork Orders",
    tenantBilling: "Tenant Billing",
    artworkBilling: "Artwork Billing",
    tokens: "Tokens",
    storefrontReview: "Creative Space Review",
    storefrontStudio: "Creative Space",
    keysAccess: "Keys & Access",
    usageActivity: "Usage & Activity",
    docsFlow: "Docs & Flow",
    templateCategories: "Template Categories",
    artworkCategories: "Artwork Categories",
    tenants: "Tenants",
    publicSite: "Public Site",
    signOut: "Sign Out",
    backToHome: "Back to Home",
    backToCenter: "Back to Center",
    backToStorefrontManager: "Back to Creative Space Manager",
    backToStore: "Back to Creative Space",
    backToTemplateLibrary: "Back to Template Library",
    accessScope: "Access",
    publicAccess: "Public",
    privateAccess: "Private",
    renderingMockups: "Rendering Mockups",
    preparingZipDownload: "Preparing ZIP Download",
    renderingHint: "Please keep this page open while new previews are being rendered.",
    preparingZipHint: "Your files are being archived and the download will start automatically.",
    prev: "Prev",
    next: "Next",
    upload: "Upload",
    platform: "Platform",
    shared: "Shared",
    draft: "Draft",
    review: "Review",
    licensed: "Licensed",
    personal: "Personal",
    searchNameCode: "Search name / code",
    searchPersonalImage: "Search personal image",
    searchPurchasedArtwork: "Search purchased artwork",
    filterCategories: "Filter categories",
    filterArtworkCategories: "Filter artwork categories",
    allCategories: "All Categories",
    selectLevel2: "Select Level 2",
    selectLevel3: "Select Level 3",
    filterTemplatesByCategory: "Filter templates by category.",
    tileMode: "Tile Mode",
    tileModeShortcutGroup: "Tile Mode",
    shortcutLabel: "Shortcut",
    shortcutMoveUp: "Move Up",
    shortcutMoveDown: "Move Down",
    shortcutMoveLeft: "Move Left",
    shortcutMoveRight: "Move Right",
    shortcutMirrorHorizontal: "Mirror Horizontally",
    shortcutMirrorVertical: "Mirror Vertically",
    shortcutRotateClockwise: "Rotate 45° Clockwise",
    shortcutRotateCounterclockwise: "Rotate 45° Counterclockwise",
    shortcutAmplify: "Scale Up",
    shortcutReduce: "Scale Down",
    shortcutDelete: "Delete",
    shortcutSaveProduct: "Save Product",
    shortcutPatternReplication: "Duplicate Pattern",
    shortcutMaximizePatternDesign: "Fit to Design Area",
    shortcutSpreadDesign: "Spread Over Part Bounds",
    shortcutMaximizePatternWidth: "Fit Width",
    shortcutMaximizePatternHeight: "Fit Height",
    shortcutRedesign: "Reset Transform",
    shortcutUndoAction: "Undo",
    shortcutRedoAction: "Redo",
    shortcutHorizontally: "Center Horizontally",
    shortcutDesignMiddle: "Center in Design Area",
    shortcutLayerPanel: "Open Layers",
    shortcutBackgroundPanel: "Open Background",
    tileModeSingle: "Single",
    tileModeBasic: "Basic",
    tileModeLandscape: "Landscape",
    tileModeVertical: "Vertical",
    tileModeMirror: "Mirror",
    tileModeSingleDescription: "Keep a single artwork instance without any repeated tiles.",
    tileModeBasicDescription: "Repeat the artwork in both directions using the current spacing.",
    tileModeLandscapeDescription: "Repeat only across the horizontal axis.",
    tileModeVerticalDescription: "Repeat only across the vertical axis.",
    tileModeMirrorDescription: "Repeat in both directions and mirror alternating tiles.",
    openViewPreviewDialog: "Open view preview",
    previewDialogTitle: "View Preview",
    previewDialogColorsLabel: "Colors",
    renderingPreview: "Rendering preview...",
    renderingPreviewBadge: "Preparing",
    renderingPreviewTitle: "{view} preview is being prepared",
    renderingPreviewHint: "Cached views open immediately. Missing views are generated only when needed.",
    templateName: "Template Name",
    templateCode: "Template Code",
    canvasActions: "Canvas Actions",
    imageLayerActions: "Image Layer Actions",
    textLayerActions: "Text Layer Actions",
    spreadPartBounds: "Spread over part bounds",
    spreadPartCanvas: "Spread over part canvas",
    loadingPreview: "Loading preview...",
    loadingArtworkLibrary: "Loading artwork...",
    noPreviewAvailable: "No preview available",
    updating: "Updating",
    textContentSize: "Text Content Size (Actual)",
    noTemplatesMatch: "No templates match the current filters.",
    noSharedTemplatesYet: "No shared templates yet.",
    noPlatformTemplatesAvailable: "No platform templates available.",
    noDraftTemplatesAvailable: "No draft templates available.",
    noStorefrontTemplatesAvailable: "No creative space templates available.",
    noReviewTemplatesAvailable: "No review templates available.",
    noArtworkMatches: "No artwork matches the current filters.",
    noPlatformArtworkAvailable: "No platform artwork available.",
    noTenantArtworkAvailable: "No tenant artwork available.",
    noPurchasedArtworkAvailable: "No purchased artwork available.",
    uploadImageToStartLibrary: "Upload an image to start your library.",
    licensedLibraryEmpty: "Unlock artwork to build your licensed library.",
    download: "Download",
    owned: "Owned",
    paid: "Paid",
    free: "Free",
    use: "Use",
    clickToUnlock: "Click to unlock",
    unavailableToInsert: "Unavailable to insert",
    clickToInsert: "Click to insert",
    loginToUnlock: "Login To Unlock",
    click: "Click",
    status: "Status",
    price: "Price",
    size: "Size",
    unlocking: "Unlocking...",
    unlock: "Unlock",
    personalUpload: "Personal Upload",
    code: "Code",
    category: "Category",
    time: "Time",
    creator: "Creator",
    openShortcuts: "Open Shortcuts",
    saveBeforeSwitch: "You have unsaved changes. Save before switching templates?",
    discardContinue: "Discard unsaved changes and continue?",
    products: "Products",
    loadingProducts: "Loading products...",
    currentProduct: "Current Product",
    switchProduct: "Switch Product",
    searchProducts: "Search products",
    boundTemplate: "Bound Template",
    noTemplateBound: "No template bound",
    productDetails: "Product Details",
    openProductPage: "Open Product Page",
    placeOrderNow: "Place Order Now",
    placeOrderShort: "Place Order",
    placeOrderModalTitle: "Place Order",
    placeOrderColorLabel: "Color",
    placeOrderViewLabel: "View",
    placeOrderQuantityLabel: "Quantity",
    placeOrderTotalLabel: "Total",
    placeOrderTextLabel: "Text on design",
    placeOrderTextHint: "Edit the text content that will be printed on this design.",
    placeOrderAddToCart: "Add to Cart",
    placeOrderProcessing: "Adding to cart...",
    placeOrderFailed: "Failed to add to cart",
    placeOrderVariationNotFound: "No matching product variation for the selected attributes. Please adjust your selection.",
    placeOrderSaveDraftFirst: "Please save a design draft before placing this order.",
    placeOrderAddRow: "Add",
    placeOrderRemoveRow: "Remove",
    placeOrderRowTitle: "",
    placeOrderTotalQuantity: "Total Qty",
    attributes: "Attributes",
    tags: "Tags",
    gallery: "Gallery",
    description: "Description",
    sku: "SKU",
    slug: "Slug",
    productType: "Product Type",
    stockStatus: "Stock Status",
    stockQuantity: "Stock Quantity",
    catalogVisibility: "Catalog Visibility",
    regularPrice: "Regular Price",
    salePrice: "Sale Price",
    templateId: "Template ID",
    cart: "Cart",
    noProductsMatch: "No products match the current filters.",
    productNavLoadFailed: "Failed to load products.",
    saveBeforeLeaving: "You have unsaved changes. Save before leaving?",
    discardLeave: "Discard unsaved changes and leave?",
    leavePageHint: "Save to keep the latest canvas changes and preview snapshots.",
    dontSave: "Do not save",
    stayOnPage: "Stay",
    removedLicensedArtwork: "Removed from this account's licensed list view.",
    removedPersonalArtwork: "Removed from your personal artwork library.",
    saved: "Saved",
    saveFailed: "Save failed",
    nothingToSave: "Nothing to save",
    readOnly: "Read-only",
    noPartSelected: "No part selected",
    designer: "Designer",
    unknown: "Unknown",
    loadingEditor: "Loading editor...",
    exportingResults: "Exporting Results",
    exportingResultsHint: "Generating selected outputs and saving them to results.",
    allArtwork: "All Artwork",
    filterArtworkByContentCategory: "Filter artwork by content category.",
    notEnoughTokens: "Not Enough Tokens",
    buyTokensBeforeUnlockingArtwork: "Buy tokens before unlocking this artwork",
    needMoreTokensBeforeUnlockingArtwork: "You need more tokens before unlocking this artwork.",
    openTokensManagement: "Open Tokens Management",
    unsupportedImageFormat: "Unsupported image format. Use JPG, PNG, WEBP, or SVG.",
    uploadFailedRetry: "Upload failed. Please try again.",
    imageLayersMustBeUploaded: "Image layers must be uploaded before saving. Please re-upload the image and try again.",
    artworkResourceMissingCleaned: "Some artwork resources are no longer available and have been removed from this draft. Please re-upload them if needed.",
    noOutputsGeneratedYet: "No outputs generated yet.",
    alreadyUnlockedInserting: "\"{name}\" is already unlocked and is being inserted now.",
    unlockedSuccessfullyInserting: "\"{name}\" unlocked successfully. {tokens} Tokens remaining. Inserting now.",
    artworkNotUnlockedPurchasable: "Artwork \"{name}\" is locked. Unlock it before inserting it into the current design.",
    artworkNotUnlockedNoPermission: "Artwork \"{name}\" is locked. The current account does not have permission to unlock it.",
    artworkNotUnlockedNoTenant: "Artwork \"{name}\" is locked. The current account is not linked to a tenant that can unlock it.",
    selectedTemplateNotFound: "Selected template was not found in the current workspace.",
    selectedTemplateRuntimeMissing: "Selected template exists in platform records, but runtime preview data is missing.",
    selectedTemplateRuntimeUnavailable: "Selected template is not available in runtime preview data.",
    uncategorized: "Uncategorized",
    insufficientTokensTitle: "Mockup100 service unavailable",
    insufficientTokensReasonLabel: "Reason:",
    insufficientTokensReasonText: "The platform tenant has run out of tokens. Preview/compose generation is blocked until the balance is topped up.",
    insufficientTokensActionLabel: "What to do:",
    insufficientTokensActionPrefix: "Please ask the site administrator to top up tokens at the ",
    insufficientTokensActionLink: "Mockup100 console",
    insufficientTokensActionSuffix: ", then try again.",
    insufficientTokensClose: "Got it",
    grading: "Grading",
    gradingMissing: "No grading assets uploaded for this template",
    requestTimedOutRetry: "Request timed out. Please try again.",
  },
  zh: {
    undo: "撤销",
    redo: "重做",
    clear: "清除",
    clearCurrentPart: "清除当前面",
    clearAllParts: "清除全部面",
    shortcuts: "快捷键",
    export: "导出",
    results: "结果",
    drafts: "设计稿",
    save: "保存",
    saveAs: "另存为",
    saving: "保存中...",
    refresh: "刷新",
    language: "语言",
    uploadArtwork: "上传作品",
    addText: "添加文字",
    toggleGrid: "切换网格",
    font: "字体",
    color: "颜色",
    viewLabel: "视角",
    textColor: "文字颜色",
    lineHeight: "行高",
    bold: "加粗",
    italic: "斜体",
    left: "左对齐",
    center: "居中",
    right: "右对齐",
    showLayer: "显示图层",
    hideLayer: "隐藏图层",
    moveForward: "上移一层",
    moveBackward: "下移一层",
    renameLayer: "重命名图层",
    renameLayerPrompt: "请输入图层名称",
    noLayers: "当前面没有图层。",
    fillColor: "填充颜色",
    svgFillColor: "SVG 填充颜色",
    noEditableSvgLayers: "没有可编辑的 SVG 图层。",
    batchViews: "批量视图",
    batchExportSize: "批量导出尺寸",
    selectAll: "全选",
    confirm: "确认",
    reset: "重置",
    close: "关闭",
    exporting: "导出中...",
    downloading: "下载中...",
    downloadZip: "下载 ZIP",
    downloadBundle: "下载打包文件",
    downloadSelected: "下载选中",
    clearSelection: "清空选择",
    selectedCount: "已选 {count}",
    generatedAt: "生成于",
    saveDraft: "保存设计稿",
    finishedProductCode: "成品编码",
    newDraftWorkspace: "New",
    overwriteCurrentDraft: "覆盖当前设计稿",
    createNewDraft: "新建设计稿",
    cancel: "取消",
    currentDraftName: "当前设计稿名称",
    currentDraft: "当前设计稿",
    newDraftName: "新设计稿名称",
    enterDraftName: "输入设计稿名称",
    confirmSave: "确认保存",
    switch: "切换",
    active: "当前使用",
    lastUpdated: "最近更新",
    otherDrafts: "其他设计稿",
    rename: "重命名",
    delete: "删除",
    draftName: "设计稿名称",
    noDraftsYet: "还没有设计稿。",
    unsavedChanges: "未保存更改",
    unsavedChangesPromptBefore: "当前更改尚未保存，是否切换到",
    unsavedChangesPromptAfter: "，并在切换前保存或丢弃更改。",
    discardChanges: "丢弃更改",
    saveChanges: "保存更改",
    saveAndSwitch: "保存并切换",
    discardAndSwitch: "不保存直接切换",
    saveAndNew: "保存并新建",
    discardAndNew: "不保存直接新建",
    unsavedChangesBeforeNewWorkspace: "当前更改尚未保存，是否先保存当前设计稿再新建空白设计？",
    deleteDraft: "删除设计稿",
    permanentlyQuestion: "吗？此操作不可恢复。",
    deleteCascadeTitle: "删除该设计稿及关联数据",
    deleteCascadeIntro: "删除设计稿",
    deleteCascadeListLead: "时，以下关联数据也会一并删除：",
    deleteCascadeReasonActiveTemplateState: "{count} 个模板的当前激活稿绑定{sample}",
    deleteCascadeReasonActiveTemplateOutput: "{count} 个有效输出文件{sample}",
    deleteCascadeReasonDraftResourceRef: "{count} 处草稿资源引用{sample}",
    deleteCascadeReasonOutputResourceRef: "{count} 处输出资源引用{sample}",
    deleteCascadeReasonGeneric: "{type}（共 {count} 处）{sample}",
    deleteCascadeWarning: "此操作不可恢复，是否继续？",
    deleteCascadeConfirm: "我已知悉风险，全部删除",
    deleteCascadeCancel: "取消",
    deleteDraftErrorTitle: "删除草稿失败",
    deleteDraftErrorInUse: "该草稿仍被某个模板的当前激活版本占用，请先把模板切换到其他草稿后再删除。",
    deleteDraftErrorMissing: "该草稿已不存在，请刷新页面重试。",
    deleteDraftErrorGeneric: "无法删除该草稿，请稍后重试，若问题仍存在请联系支持。",
    openPreview: "打开预览",
    setDraftMainImage: "设置主图",
    draftMainImageSelected: "当前视角已是主图",
    draftMainImageBadge: "主图",
    setDraftMainImageSuccess: "已将当前视角设为当前设计稿主图，保存后会同步更新 designs 缩略图。",
    currentSelection: "当前视角",
    replacePictureDialogTitle: "替换图片",
    replacePictureDialogHint: "从下方 artwork 分组中选择素材，或上传新图片来替换当前图片图层。",
    replacePictureScopeLabel: "替换范围",
    replacePictureTargetLabel: "目标图层",
    replacePictureScopeCurrent: "仅当前图层",
    replacePictureScopeSameNamePart: "当前面同名图层",
    replacePictureScopeSameNameAll: "所有面同名图层",
    tenantShared: "租户 / 共享",
    ownedPersonal: "已拥有 / 个人",
    uploadNewArtwork: "上传新图片",
    replacingArtwork: "替换中...",
    replaceCurrentLayer: "替换当前图层",
    replaceSameNamePart: "替换当前面同名图层",
    replaceSameNameAll: "替换所有面同名图层",
    replaceSelectArtworkFirst: "请先选择一个素材再执行替换。",
    quickPreview: "Quick Preview",
    originalSize: "原始尺寸",
    customSize: "自定义尺寸",
    customSizePlaceholder: "例如 3000x2400",
    applyCustomSize: "应用",
    addCustomSize: "添加自定义尺寸",
    customSizeInvalid: "请输入宽x高格式，例如 3000x2400。",
    customSizeTokenHint: "令牌按最长边对应的档位计费。",
    refreshPreviewNow: "立即刷新预览",
    addPreviewToResults: "加入结果",
    addingToResults: "加入中...",
    previewResultsSelectionHint: "选择一个或多个视角加入 Results。",
    previewResultsAddingHint: "正在将所选视角加入 Results，请稍候...",
    previewResultsDoNotClose: "加入完成前请不要关闭页面。",
    previewResultsSelectedCount: "已选择 {count} 个视角",
    previewResultsAddedCount: "已加入 {count} 个视角到 Results",
    previewResultsReady: "可加入结果",
    previewResultsUnavailable: "预览暂不可用",
    previewResultsAlreadyAdded: "已在 Results 中",
    previewResultsCurrentView: "当前视角",
    duplicateLayerCountTitle: "复制图层数量",
    duplicateLayerCountLabel: "复制数量",
    duplicateLayerCountHint: "输入要为当前{target}创建的副本数量，最多 50 个。",
    duplicateLayerCountImageTarget: "图片图层",
    duplicateLayerCountTextTarget: "文字图层",
    duplicatingLayerCount: "复制中...",
    editImageSizeDialogTitle: "修改图片宽高",
    editImageSizeDialogHint: "调整当前图片图层尺寸，并在确认后应用到画布。",
    editTextSizeDialogTitle: "修改文字宽高",
    editTextSizeDialogHint: "调整当前文字内容尺寸，并在确认后应用到画布。",
    currentSize: "当前尺寸",
    width: "宽度",
    height: "高度",
    replaceArtworkResultsSummary: "{count} 个素材 · 第 {page}/{total} 页",
    replaceArtworkCategorySummary: "分类：{category}",
    previewSizeFreeHint: "控制台 512 预览免费。",
    previewSizeBilledAs: "计费档位",
    previewSizeOriginalHint: "原始尺寸计费按",
    baseCode: "基本码",
    currentPartLabel: "Part 名称",
    copyCurrentPart: "复制当前面",
    copyCurrentPartTitle: "将当前设计复制到选中的面",
    duplicateLayer: "复制图层",
    deleteLayer: "删除图层",
    editText: "编辑文字",
    boundingBoxSize: "包围盒尺寸",
    imageSize: "图片尺寸（真实尺寸）",
    aspectLock: "锁定等比缩放",
    aspectUnlock: "解锁等比缩放",
    opacity: "透明度",
    scaleUp: "放大",
    scaleDown: "缩小",
    rotateLeft: "向左旋转",
    rotateRight: "向右旋转",
    flipHorizontal: "水平翻转",
    flipVertical: "垂直翻转",
    bringFront: "上移到前面",
    sendBack: "下移到后面",
    centerLayer: "图层居中",
    flipHorizontalMenu: "水平翻转图层",
    flipVerticalMenu: "垂直翻转图层",
    bringForward: "上移一层",
    sendBackward: "下移一层",
    white: "白色",
    mist: "雾白",
    blush: "浅粉",
    sky: "天蓝",
    mint: "薄荷",
    ink: "墨黑",
    switchToView: "切换到 {view}",
    template: "模板",
    artwork: "作品",
    text: "文字",
    layers: "图层",
    background: "背景",
    overview: "概览",
    libraries: "素材库",
    publishing: "发布",
    orders: "订单",
    finance: "财务",
    storefront: "创作空间",
    developer: "开发者",
    administration: "管理",
    account: "账户",
    dashboard: "仪表盘",
    templateLibrary: "模板库",
    artworkLibrary: "作品库",
    templateCenter: "模板中心",
    artworkCenter: "作品中心",
    artworkOrders: "作品订单",
    tenantBilling: "租户账单",
    artworkBilling: "作品结算",
    tokens: "令牌",
    storefrontReview: "创作空间审核",
    storefrontStudio: "创作空间",
    keysAccess: "密钥与访问",
    usageActivity: "用量与活动",
    docsFlow: "文档与流程",
    templateCategories: "模板分类",
    artworkCategories: "作品分类",
    tenants: "租户",
    publicSite: "前台站点",
    signOut: "退出登录",
    backToHome: "返回首页",
    backToCenter: "返回中心",
    backToStorefrontManager: "返回创作空间管理",
    backToStore: "返回创作空间",
    backToTemplateLibrary: "返回模板库",
    accessScope: "权限",
    publicAccess: "Public",
    privateAccess: "Private",
    renderingMockups: "正在渲染 Mockup",
    preparingZipDownload: "正在准备 ZIP 下载",
    renderingHint: "正在生成新的预览，请保持当前页面打开。",
    preparingZipHint: "文件正在归档，下载会自动开始。",
    prev: "上一页",
    next: "下一页",
    upload: "上传",
    platform: "平台",
    shared: "共享",
    draft: "草稿",
    review: "审核",
    licensed: "已购",
    personal: "个人",
    searchNameCode: "搜索名称 / 编码",
    searchPersonalImage: "搜索个人图片",
    searchPurchasedArtwork: "搜索已购素材",
    filterCategories: "筛选分类",
    filterArtworkCategories: "筛选素材分类",
    allCategories: "全部分类",
    selectLevel2: "选择二级分类",
    selectLevel3: "选择三级分类",
    filterTemplatesByCategory: "按分类筛选模板。",
    tileMode: "平铺模式",
    tileModeShortcutGroup: "平铺模式",
    shortcutLabel: "快捷键",
    shortcutMoveUp: "向上移动",
    shortcutMoveDown: "向下移动",
    shortcutMoveLeft: "向左移动",
    shortcutMoveRight: "向右移动",
    shortcutMirrorHorizontal: "水平镜像",
    shortcutMirrorVertical: "垂直镜像",
    shortcutRotateClockwise: "顺时针旋转 45°",
    shortcutRotateCounterclockwise: "逆时针旋转 45°",
    shortcutAmplify: "放大",
    shortcutReduce: "缩小",
    shortcutDelete: "删除",
    shortcutSaveProduct: "保存产品",
    shortcutPatternReplication: "复制图案",
    shortcutMaximizePatternDesign: "适配设计区域",
    shortcutSpreadDesign: "铺满 part 包围盒",
    shortcutMaximizePatternWidth: "适配宽度",
    shortcutMaximizePatternHeight: "适配高度",
    shortcutRedesign: "重置变换",
    shortcutUndoAction: "撤销",
    shortcutRedoAction: "重做",
    shortcutHorizontally: "水平居中",
    shortcutDesignMiddle: "在设计区居中",
    shortcutLayerPanel: "打开图层",
    shortcutBackgroundPanel: "打开背景",
    tileModeSingle: "单张",
    tileModeBasic: "基础",
    tileModeLandscape: "横向",
    tileModeVertical: "纵向",
    tileModeMirror: "镜像",
    tileModeSingleDescription: "仅保留一张图案，不做任何平铺复制。",
    tileModeBasicDescription: "按当前间距在横向和纵向同时重复平铺图案。",
    tileModeLandscapeDescription: "只沿水平方向重复平铺图案。",
    tileModeVerticalDescription: "只沿垂直方向重复平铺图案。",
    tileModeMirrorDescription: "在横纵两个方向重复平铺，并对相邻块做镜像翻转。",
    openViewPreviewDialog: "打开视角预览",
    previewDialogTitle: "视角预览",
    previewDialogColorsLabel: "颜色",
    renderingPreview: "正在渲染预览图...",
    renderingPreviewBadge: "视角预览准备中",
    renderingPreviewTitle: "正在准备 {view} 视角预览图",
    renderingPreviewHint: "已生成的视角会直接复用，仅在当前视角缺失时补充生成。",
    templateName: "Template Name",
    templateCode: "Template Code",
    canvasActions: "画布操作",
    imageLayerActions: "图片图层操作",
    textLayerActions: "文字图层操作",
    spreadPartBounds: "铺满 part 包围盒",
    spreadPartCanvas: "铺满 part 所在画布",
    loadingPreview: "预览加载中...",
    loadingArtworkLibrary: "正在加载中",
    noPreviewAvailable: "暂无预览图",
    updating: "更新中",
    textContentSize: "文字内容尺寸（真实尺寸）",
    noTemplatesMatch: "没有符合当前筛选条件的模板。",
    noSharedTemplatesYet: "暂无共享模板。",
    noPlatformTemplatesAvailable: "暂无平台模板。",
    noDraftTemplatesAvailable: "暂无草稿模板。",
    noStorefrontTemplatesAvailable: "暂无创作空间模板。",
    noReviewTemplatesAvailable: "暂无审核模板。",
    noArtworkMatches: "没有符合当前筛选条件的素材。",
    noPlatformArtworkAvailable: "暂无平台素材。",
    noTenantArtworkAvailable: "暂无共享素材。",
    noPurchasedArtworkAvailable: "暂无已购素材。",
    uploadImageToStartLibrary: "上传图片后即可建立你的素材库。",
    licensedLibraryEmpty: "先解锁素材，再建立你的已购素材库。",
    download: "下载",
    owned: "已拥有",
    paid: "付费",
    free: "免费",
    use: "使用",
    clickToUnlock: "点击解锁",
    unavailableToInsert: "当前不可插入",
    clickToInsert: "点击插入",
    loginToUnlock: "登录后解锁",
    click: "点击",
    status: "状态",
    price: "价格",
    size: "尺寸",
    unlocking: "解锁中...",
    unlock: "解锁",
    personalUpload: "个人上传",
    code: "编码",
    category: "分类",
    time: "时间",
    creator: "作者",
    openShortcuts: "打开快捷键",
    saveBeforeSwitch: "当前有未保存更改，切换模板前是否先保存？",
    discardContinue: "确认丢弃未保存更改并继续？",
    products: "产品",
    loadingProducts: "正在加载商品...",
    currentProduct: "当前商品",
    switchProduct: "切换商品",
    searchProducts: "搜索商品",
    boundTemplate: "绑定模板",
    noTemplateBound: "未绑定模板",
    productDetails: "产品详情",
    openProductPage: "打开商品详情页",
    placeOrderNow: "立即下单",
    placeOrderShort: "立即下单",
    placeOrderModalTitle: "立即下单",
    placeOrderColorLabel: "颜色",
    placeOrderViewLabel: "视角",
    placeOrderQuantityLabel: "数量",
    placeOrderPriceLabel: "单价",
    placeOrderTotalLabel: "合计",
    placeOrderTextLabel: "设计稿文字",
    placeOrderTextHint: "编辑该设计稿要印制的文字内容。",
    placeOrderAddToCart: "加入购物车",
    placeOrderProcessing: "正在加入购物车...",
    placeOrderFailed: "加入购物车失败",
    placeOrderVariationNotFound: "未找到匹配所选属性的商品变体,请调整属性后重试。",
    placeOrderSaveDraftFirst: "请先保存一份设计稿后再下单。",
    placeOrderAddRow: "添加",
    placeOrderRemoveRow: "删除",
    placeOrderRowTitle: "",
    placeOrderTotalQuantity: "合计件数",
    attributes: "属性",
    tags: "标签",
    gallery: "图库",
    description: "详情描述",
    sku: "SKU",
    slug: "Slug",
    productType: "产品类型",
    stockStatus: "库存状态",
    stockQuantity: "库存数量",
    catalogVisibility: "目录可见性",
    regularPrice: "原价",
    salePrice: "售价",
    templateId: "模板 ID",
    cart: "购物车",
    noProductsMatch: "没有符合当前筛选条件的商品。",
    productNavLoadFailed: "商品加载失败。",
    saveBeforeLeaving: "当前有未保存更改，离开前是否先保存？",
    discardLeave: "确认丢弃未保存更改并离开？",
    leavePageHint: "保存后会保留最新画布修改与 designs 预览缩略图。",
    dontSave: "不保存",
    stayOnPage: "留在当前页",
    removedLicensedArtwork: "已从当前账号的已购素材列表中移除。",
    removedPersonalArtwork: "已从你的个人素材库中移除。",
    saved: "已保存",
    saveFailed: "保存失败",
    nothingToSave: "没有可保存的内容",
    readOnly: "只读",
    noPartSelected: "未选择面",
    designer: "设计师",
    unknown: "未知",
    loadingEditor: "编辑器加载中...",
    exportingResults: "正在导出结果",
    exportingResultsHint: "正在生成所选效果图并保存到结果列表。",
    allArtwork: "全部素材",
    filterArtworkByContentCategory: "按内容分类筛选素材。",
    notEnoughTokens: "令牌不足",
    buyTokensBeforeUnlockingArtwork: "解锁该素材前请先购买令牌",
    needMoreTokensBeforeUnlockingArtwork: "当前令牌不足，无法解锁该素材。",
    openTokensManagement: "打开令牌管理",
    unsupportedImageFormat: "不支持的图片格式，请使用 JPG、PNG、WEBP 或 SVG。",
    uploadFailedRetry: "上传失败，请重试。",
    imageLayersMustBeUploaded: "保存前必须先上传图片图层，请重新上传后再试。",
    artworkResourceMissingCleaned: "部分图片素材已不可访问，已从当前草稿中移除。如需要请重新上传。",
    noOutputsGeneratedYet: "还没有生成结果。",
    alreadyUnlockedInserting: "\"{name}\" 已解锁，正在立即插入。",
    unlockedSuccessfullyInserting: "\"{name}\" 解锁成功，剩余 {tokens} 个令牌，正在立即插入。",
    artworkNotUnlockedPurchasable: "素材 \"{name}\" 尚未解锁，解锁后即可插入当前设计。",
    artworkNotUnlockedNoPermission: "素材 \"{name}\" 尚未解锁，当前账号没有解锁权限。",
    artworkNotUnlockedNoTenant: "素材 \"{name}\" 尚未解锁，当前账号未绑定可解锁租户。",
    selectedTemplateNotFound: "当前工作区中未找到所选模板。",
    selectedTemplateRuntimeMissing: "平台记录中存在该模板，但缺少运行时预览数据。",
    selectedTemplateRuntimeUnavailable: "该模板当前没有可用的运行时预览数据。",
    uncategorized: "未分类",
    insufficientTokensTitle: "Mockup100 服务暂不可用",
    insufficientTokensReasonLabel: "原因：",
    insufficientTokensReasonText: "平台租户的 token 余额已耗尽，无法继续生成预览/合成。",
    insufficientTokensActionLabel: "处理：",
    insufficientTokensActionPrefix: "请联系站点管理员前往 ",
    insufficientTokensActionLink: "Mockup100 控制台",
    insufficientTokensActionSuffix: " 充值 token 包后再试。",
    insufficientTokensClose: "我知道了",
    grading: "放码",
    gradingMissing: "该模板未上传放码资源",
    requestTimedOutRetry: "请求超时，请重试。",
  },
} as const

const TEMPLATE_PAGE_SIZE = 10
const ARTWORK_PAGE_SIZE = 10
const WORDPRESS_PRODUCT_PAGE_SIZE = 12
const COLOR_NAME_MAP: Record<string, string> = {
  white: "#ffffff",
  白色: "#ffffff",
  black: "#111827",
  黑色: "#111827",
  red: "#ef4444",
  红色: "#ef4444",
  blue: "#2563eb",
  蓝色: "#2563eb",
  green: "#16a34a",
  绿色: "#16a34a",
  navy: "#1e3a8a",
  pink: "#ec4899",
  粉色: "#ec4899",
  gray: "#6b7280",
  grey: "#6b7280",
  灰色: "#6b7280",
  silver: "#94a3b8",
  beige: "#d6c1a3",
  purple: "#7c3aed",
  紫色: "#7c3aed",
  yellow: "#eab308",
  黄色: "#eab308",
  orange: "#f97316",
  橙色: "#f97316",
  brown: "#92400e",
  棕色: "#92400e",
  cream: "#f5f5dc",
  ivory: "#fffff0",
  khaki: "#b45309",
  cyan: "#06b6d4",
  teal: "#0f766e",
  magenta: "#d946ef",
}

type LayerListEntry = {
  id: string
  kind: LayerKind
  label: string
  preview?: string
  hidden?: boolean
}

type TemplatePageResponse = {
  records?: Array<Record<string, unknown>>
}

type WordPressProductBindingSummary = {
  template_id?: string
  template_code?: string
  template_label?: string
  template_snapshot?: string
}

type WordPressProductAttribute = {
  name: string
  options: string[]
  visible?: boolean
  variation?: boolean
  // 0.4.43: PHP 端注入的真实属性 key（taxonomy slug 或 sanitize_title(label)）,前端 add_to_cart 时用此 key
  raw_name?: string
  attribute_key?: string
}

// 0.4.43: 可变商品的 variation 矩阵项
type WordPressProductVariation = {
  variation_id: number
  attributes: Record<string, string>
  is_in_stock?: boolean
  is_purchasable?: boolean
  // 0.4.64: variation 单价 — 不同 size/color 价格不同
  price?: string
  regular_price?: string
  price_html?: string
}

type WordPressBoundProduct = {
  product_id: number
  name: string
  slug?: string
  permalink?: string
  image_url?: string
  gallery_images: string[]
  sku?: string
  product_type?: string
  catalog_visibility?: string
  stock_status?: string
  stock_quantity?: number
  price?: string
  regular_price?: string
  sale_price?: string
  price_html?: string
  description?: string
  short_description?: string
  category_ids: string[]
  category_names: string[]
  category_slugs: string[]
  tag_names: string[]
  attributes: WordPressProductAttribute[]
  // 0.4.43: 可变商品 variations 矩阵,用于前端按所选属性匹配 variation_id 后再 add_to_cart
  variations?: WordPressProductVariation[]
  has_template_binding?: boolean
  design_enabled?: boolean
  binding: WordPressProductBindingSummary
}

type WordPressProductCategory = {
  category_id: string
  name: string
  slug?: string
  parent_id?: string
  count: number
}

type WordPressProductNavConfig = {
  currentProductId?: number
  currentProduct?: Record<string, unknown> | null
  initialItems?: Array<Record<string, unknown>>
  categories?: Array<Record<string, unknown>>
}

type LeaveWorkspaceDecision = "save" | "discard" | "cancel"
type PendingLeaveAction = "reload" | "none"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const artworkStore = useArtworkStore()
const storefrontStore = useStorefrontStore()
const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const previewDraftStore = usePreviewDraftStore()
const uiLocaleStore = useUiLocaleStore()
const { items } = storeToRefs(templateStore)
const { locale: globalLocale } = storeToRefs(uiLocaleStore)
const { storefront: storefrontContext } = storeToRefs(storefrontStore)
const { categories: templateCategories, submissions: reviewSubmissions } = storeToRefs(platformStore)
const {
  platformCategories: artworkPlatformCategories,
  tenantCategories: artworkTenantCategories,
  platformItems: platformArtworkItems,
  tenantItems: tenantArtworkItems,
  licenses: licensedArtworkRecords,
  platformTotal: platformArtworkTotal,
  tenantTotal: tenantArtworkTotal,
} = storeToRefs(artworkStore)
const platformArtworkLibraryPendingCount = ref(0)
const tenantArtworkLibraryPendingCount = ref(0)
const platformArtworkLibraryHydrated = ref(false)
const tenantArtworkLibraryHydrated = ref(false)
const { payload, loading: editorLoading } = storeToRefs(editorStore)
const { account: authAccount, role: authRole } = storeToRefs(authStore)
const {
  templateId: previewDraftTemplateId,
  draftRecords,
  activeDraftId,
  serverSaveDirty,
  isSavingDraftToServer,
  draftsModalOpen,
  saveDraftModalOpen,
  saveDraftName,
  saveDraftError,
  renamingDraftId,
  renameDraftValue,
  renameDraftError,
  deleteDraftModalOpen,
  pendingDeleteDraftRecord,
  switchDraftModalOpen,
  pendingSwitchDraftRecord,
} = storeToRefs(previewDraftStore)

const canvasRef = ref<InstanceType<typeof EditorCanvas> | null>(null)
const artworkInputRef = ref<HTMLInputElement | null>(null)
const replaceArtworkInputRef = ref<HTMLInputElement | null>(null)
const reopenDraftsPanelAfterBlockingModal = ref(false)
const leaveWorkspaceModalOpen = ref(false)
const pendingLeaveAction = ref<PendingLeaveAction>("none")
const selectedTemplateId = ref("")
const selectedPartKey = ref("")
const newWorkspaceModalOpen = ref(false)
const currentFinishedProductCode = ref("")
const selectedColor = ref("")
const selectedView = ref("")
const activeSidebarTab = ref<SidebarTabKey>(
  // WordPress 插件场景下隐藏了 template 导航项,初始值直接落在 products,
  // 避免页面加载阶段中间面板短暂渲染出 Template 模板库内容。
  (typeof window !== "undefined" && (window as typeof window & {
    __MOCKUP100_WORDPRESS_CONTEXT__?: { shell?: unknown }
  }).__MOCKUP100_WORDPRESS_CONTEXT__?.shell)
    ? "products"
    : "template",
)
const manualSidebarTabOverride = ref<SidebarTabKey | null>(null)
const selectedSize = ref("")
const selectedBatchColors = ref<string[]>([])
const selectedBatchViews = ref<string[]>([])
const selectedBatchSizes = ref<string[]>([])
const renderOutputs = ref<RenderOutputEntry[]>([])
const renderError = ref("")
// 0.4.51: 平台租户 token 余额不足弹窗状态(402)。WP shell + console 复用,面向"租户/站点管理员"。
const insufficientTokensModalOpen = ref(false)
function handlePreviewError(error: unknown, fallback: (message: string) => void) {
  if (error instanceof ApiRequestError && error.status === 402) {
    insufficientTokensModalOpen.value = true
    return
  }
  fallback(resolvePreviewRequestErrorMessage(error))
}
const isRendering = ref(false)
const isBatchExporting = ref(false)
const isBatchDownloading = ref(false)
const canUndoHistory = ref(false)
const canRedoHistory = ref(false)
const activeLayerId = ref("")
const activeLayerKind = ref<LayerKind | "">("")
const layerCount = ref(0)
const layerOptions = ref<LayerListEntry[]>([])
const hasArtwork = ref(false)
const textDraft = ref("New text")
const textFontSize = ref(52)
const textColor = ref("#111827")
const textWeight = ref("700")
const textStyle = ref("normal")
const textAlign = ref<"left" | "center" | "right">("center")
const textFontFamily = ref(DEFAULT_TEXT_FONT_FAMILY)
const textLineHeight = ref(DEFAULT_TEXT_LINE_HEIGHT)
const loadError = ref("")
const wordpressProductSearch = ref("")
const wordpressProductCategoryId = ref("")
const wordpressProductPage = ref(1)
const wordpressProductItems = ref<WordPressBoundProduct[]>([])
const wordpressCurrentProduct = ref<WordPressBoundProduct | null>(null)
const wordpressProductCategories = ref<WordPressProductCategory[]>([])
const wordpressProductTotal = ref(0)
const wordpressProductLoading = ref(false)
const wordpressProductError = ref("")
// Place Order Modal state
const placeOrderModalOpen = ref(false)
const placeOrderActiveView = ref("")
// 多需求列表：每条独立 color/attributes/textOverrides/quantity
type PlaceOrderRow = {
  id: string
  color: string
  attributes: Record<string, string>
  textOverrides: Record<string, string>
  quantity: number
}
const placeOrderRows = ref<PlaceOrderRow[]>([])
const isAddingToCart = ref(false)
const placeOrderError = ref("")
const zoomLevel = ref(1)
const showGrid = ref(false)
const selectedLocale = computed<PreviewLocale>({
  get: () => globalLocale.value,
  set: (value) => uiLocaleStore.setLocale(value),
})
const localeOptions = computed(() => [
  { value: "en" as const, label: "EN" },
  { value: "zh" as const, label: "ZH" },
])
const selectedDisplayUnit = ref<PhysicalDisplayUnit>("cm")
const displayUnitDropdownOptions = [
  { value: "cm", label: "cm" },
  { value: "mm", label: "mm" },
  { value: "in", label: "in" },
]
const unavailableTemplateKeys = ref<string[]>([])
const CANVAS_STAGE_BASE_SIZE = 636
const exportModalOpen = ref(false)
let leaveWorkspaceDecisionResolver: ((decision: LeaveWorkspaceDecision) => void) | null = null
const resultsModalOpen = ref(false)
const gradingModalOpen = ref(false)
// Plan v3 §S2.3：未订阅用户点击 Grading 按钮时弹出的订阅引导模态。
// 与 gradingModalOpen 互斥：none → 弹 GateModal；non-none → 直接进 WorkspaceModal。
const gradingGateOpen = ref(false)
// Plan v3 §S2.3：通过用户能力快照预拦截，避免点 Grading 按钮后再向后端请求才弹付费墙。
const { gradingTier } = useUserCapabilities()
onMounted(() => { void fetchUserCapabilities() })
const PREVIEW_OUTPUTS_INITIAL_LIMIT = 120
const serverOutputsLoadedKey = ref("")
let serverOutputsRequestKey = ""
let serverOutputsLoadPromise: Promise<RenderOutputEntry[]> | null = null
const shortcutsModalOpen = ref(false)
const copyPartModalOpen = ref(false)
const viewPreviewModalOpen = ref(false)
const previewResultsSelectionModalOpen = ref(false)
const replaceArtworkModalOpen = ref(false)
const replaceArtworkSelectionId = ref("")
const isApplyingArtworkReplacement = ref(false)
const selectedPreviewResultViews = ref<string[]>([])
const isAddingPreviewResults = ref(false)
const previewResultsActionNotice = ref("")
const duplicateLayerCountModalOpen = ref(false)
const duplicateLayerCountDraft = ref("1")
const duplicateLayerCountTarget = ref<ImageContextMenuPayload | null>(null)
const isApplyingDuplicateLayerCount = ref(false)
const layerSizeModalOpen = ref(false)
const layerSizeModalMode = ref<LayerSizeModalMode | "">("")
const layerSizeModalTarget = ref<ImageContextMenuPayload | null>(null)
const isApplyingLayerSize = ref(false)
const previewDialogLoadedEntries = ref<Set<string>>(new Set())
const previewDialogFailedEntries = ref<Set<string>>(new Set())
const previewImageNaturalSizes = ref<Record<string, { width: number; height: number }>>({})
const artworkNaturalSizeCache = new Map<string, Promise<{ width: number; height: number } | null>>()
const draftPreviewImageMap = ref<Record<string, string>>({})
const draftMainPreviewViewOverrides = ref<Record<string, string>>({})
const draftMainPreviewColorOverrides = ref<Record<string, string>>({})
const lastServerActiveDraftId = ref("")
// 0.4.59: 与 selectedView/Color(用户当前编辑视角)解耦的"主图"状态。
// 让 mall 嵌入式 reload 路径下,即使 activeDraftId 被 restoreBlankWorkspace 暂时清空,
// View Preview 弹窗里的"主图标志"也能从持久化的 preferences 准确还原。
const mainPreviewView = ref("")
const mainPreviewColor = ref("")
const previewDialogView = ref("")
const previewDialogColor = ref("")
const copyPartSelectedTargets = ref<string[]>([])
const clearMenuOpen = ref(false)
const imageContextMenu = ref<ImageContextMenuPayload | null>(null)
const imageContextMenuRef = ref<HTMLElement | null>(null)
const imageContextMenuStyle = ref<Record<string, string>>({})
const skipBeforeUnloadUntil = ref(0)
// 0.4.60: WP shell 模式下用户在 mall 嵌入式编辑器的"未保存编辑"标志。
// 平台 preview 走 serverSaveDirty(依赖 isTenantAdmin),WP shell 不满足该条件,
// 用单独 flag 在 markPreviewDirty 时设 true,在 submitPlaceOrder 成功后置 false。
const wpShellEditorDirty = ref(false)
const previewOutputs = ref<Record<string, { url: string; filePath: string; mode: PreviewSourceMode; signature: string }>>({})
const previewRequestStateByKey = ref<Record<string, "idle" | "rendering" | "fresh" | "stale" | "failed">>({})
const previewLastResolvedSignatureByKey = ref<Record<string, string>>({})
const isPreviewRendering = ref(false)
const previewMode = ref<PreviewSourceMode>("default")
const canvasSignature = ref("")
const workspaceLoading = ref(false)
const displayPreviewImage = ref("")
const partPreviewFailures = ref<Record<string, true>>({})
const partLayerCounts = ref<Record<string, number>>({})
const publicTemplates = ref<TemplateCatalogEntry[]>([])
const ownedArtworkLibrary = ref<ArtworkLibraryEntry[]>([])
const partBackgroundColors = ref<Record<string, string>>({})
const stageBackgroundColor = computed(() => {
  const partKey = selectedPartKey.value || ""
  return partKey ? (partBackgroundColors.value[partKey] || "") : ""
})
const hasBackgroundOverrides = computed(() => Object.values(partBackgroundColors.value).some((value) => Boolean(String(value || "").trim())))
const hasPreviewOverrides = computed(() => hasArtwork.value || hasBackgroundOverrides.value)
const templateLibraryScope = ref<PreviewTemplateScope>("shared")
const templateLibraryScopePinnedByUser = ref(false)
const templateSearchState = ref<Record<PreviewTemplateScope, string>>({
  platform: "",
  shared: "",
  draft: "",
  storefront: "",
  review: "",
})
const templateCategoryState = ref<Record<PreviewTemplateScope, string>>({
  platform: "all",
  shared: "all",
  draft: "all",
  storefront: "all",
  review: "all",
})
const showTemplateCategoryPopover = ref(false)
const showWordPressProductCategoryPopover = ref(false)
// 三级分类弹窗的固定定位坐标（teleport 到 body 后使用 position: fixed 避免被滚动容器/overflow 裁剪）
const categoryPopoverPosition = ref<{ top: number; left: number; width: number } | null>(null)
const templatePageState = ref<Record<PreviewTemplateScope, number>>({
  platform: 1,
  shared: 1,
  draft: 1,
  storefront: 1,
  review: 1,
})
const templateLibraryScrollRef = ref<HTMLElement | null>(null)
const artworkLibraryScrollRef = ref<HTMLElement | null>(null)
const layersScrollRef = ref<HTMLElement | null>(null)
const hoveredTemplateKey = ref("")
const hoveredArtworkKey = ref("")
const hoveredTemplateEntry = ref<TemplatePreviewEntry | null>(null)
const hoveredArtworkEntry = ref<ArtworkCatalogEntry | null>(null)
const hoveredTemplatePlacement = ref<HoverOverlayClass>("hover-overlay--bottom-left")
const hoveredArtworkPlacement = ref<HoverOverlayClass>("hover-overlay--bottom-left")
const hoveredTemplateStyle = ref<Record<string, string>>({})
const hoveredArtworkStyle = ref<Record<string, string>>({})
let hoveredArtworkClearTimer: number | null = null
const artworkLibraryTab = ref<ArtworkLibraryTabKey>("platform")
const selectedArtworkId = ref("")
const ownedArtworkSearch = ref("")
const platformArtworkSearch = ref("")
const tenantArtworkSearch = ref("")
const licensedArtworkSearch = ref("")
const ownedArtworkCategoryId = ref("all")
const platformArtworkCategoryId = ref("all")
const tenantArtworkCategoryId = ref("all")
const licensedArtworkCategoryId = ref("all")
const showArtworkCategoryPopover = ref(false)
const artworkFeedbackMessage = ref("")
const artworkFeedbackTone = ref<"info" | "success" | "error">("info")
const pendingArtworkPurchaseId = ref("")
const buyingArtworkId = ref("")
const showArtworkTokenPurchaseModal = ref(false)
const artworkTokenPurchaseContext = ref<{ name: string; priceTokens?: number; shortfallTokens?: number; currentBalance?: number } | null>(null)
const hiddenOwnedArtworkIds = ref<string[]>([])
const hiddenLicensedArtworkIds = ref<string[]>([])
const imageOpacity = ref(DEFAULT_IMAGE_OPACITY)
const imageTileMode = ref<ImageTileMode>("single")
const svgFillColor = ref("#111827")
const selectedSvgLayerId = ref("")
const activeImageMetrics = ref<CanvasImageState | null>(null)
const activeTextMetrics = ref<CanvasTextState | null>(null)
const imageSizeDraft = ref({ width: "", height: "" })
const textboxSizeDraft = ref({ width: "", height: "" })
const textContentSizeDraft = ref({ width: "", height: "" })
const imageSizeAspectLocked = ref(true)
const textContentSizeAspectLocked = ref(true)
const previewCustomSizeDraft = ref("")
const batchCustomSizeDraft = ref("")
const saveNotice = ref("")
const deleteDraftConflictReasons = ref<DraftReferenceConflictReason[]>([])
const deleteDraftConflictModalOpen = ref(false)
const deleteDraftConflictDraftName = ref("")
const deleteDraftConflictDraftId = ref("")
const deleteDraftErrorModalOpen = ref(false)
const deleteDraftErrorMessage = ref("")
const isSavingTemplate = ref(false)
const activeSizeDraftKey = ref<SizeDraftKey | "">("")
const previewRefreshMenuOpen = ref(false)
const pendingImageReplaceAction = ref<"" | "replace-current" | "replace-name-part" | "replace-name-all">("")
const pendingImageReplaceTarget = ref<ImageContextMenuPayload | null>(null)
const ownedArtworkPage = ref(1)
const platformArtworkPage = ref(1)
const tenantArtworkPage = ref(1)
const licensedArtworkPage = ref(1)
const pendingArtworkInsertId = ref("")
let previewImageLoader: HTMLImageElement | null = null
let previewDialogPreloadToken = 0
let previewDialogWarmToken = 0
const previewPartImageSnapshotCache = new Map<string, Promise<PreviewPartImage[]>>()
const previewComposeRequestCache = new Map<string, Promise<PreviewComposeResult | null>>()
const PREVIEW_SIZE = "512x512"
const OPEN_PREVIEW_SIZE = PREVIEW_SIZE
const OPEN_PREVIEW_THUMB_SIZE = "256x256"
const STANDARD_BATCH_SIZES = ["512x512", "1024x1024", "2048x2048", "4096x4096"] as const
const imageTileModeOptionSeeds: Array<{
  value: ImageTileMode
  shortcutId: ImageTileShortcutId
  labelKey: keyof typeof PREVIEW_I18N.en
  descriptionKey: keyof typeof PREVIEW_I18N.en
}> = [
  { value: "single", shortcutId: "pattern-tile-non-tile", labelKey: "tileModeSingle", descriptionKey: "tileModeSingleDescription" },
  { value: "tile-basic", shortcutId: "pattern-tile-basic", labelKey: "tileModeBasic", descriptionKey: "tileModeBasicDescription" },
  { value: "tile-horizontal", shortcutId: "pattern-tile-landscape", labelKey: "tileModeLandscape", descriptionKey: "tileModeLandscapeDescription" },
  { value: "tile-vertical", shortcutId: "pattern-tile-vertical", labelKey: "tileModeVertical", descriptionKey: "tileModeVerticalDescription" },
  { value: "tile-mirror", shortcutId: "pattern-tile-mirror", labelKey: "tileModeMirror", descriptionKey: "tileModeMirrorDescription" },
]
const workspacePreferenceStorageKey = "mockup-repository-preview-workspace"
const workspaceDesignStorageKey = "mockup-repository-preview-design"
const workspaceDiscardedSnapshotStorageKey = "mockup-repository-preview-discarded-snapshot"
const artworkLibraryStorageKey = "mockup-preview-artwork-library"
const artworkLibraryEntryStorageKeyPrefix = "mockup-preview-artwork-library:item:"
const artworkLibraryDatabaseName = "mockup-preview-artwork-library-db"
const artworkLibraryObjectStoreName = "entries"
const hiddenOwnedArtworkStorageKey = "mockup-preview-artwork-hidden-owned"
const hiddenLicensedArtworkStorageKey = "mockup-preview-artwork-hidden-licensed"
let previewRequestToken = 0
let activePreviewRenderToken = 0
let previewRefreshQueued = false
let previewQueuedForce = false
const previewDirty = ref(false)
// 把 auto check 缩到 1.2 秒，避免画布改完后右上角预览图最长滞后 5 秒才刷新
const PREVIEW_AUTO_CHECK_INTERVAL_MS = 1200
// auto-render 之间最少间隔 800ms，既避免连点合成多次又能让用户感到"几乎实时"
const PREVIEW_RENDER_COOLDOWN_MS = 800
const PREVIEW_RENDER_TIMEOUT_MS = 30000
const PREVIEW_VIEW_SWITCH_DEBOUNCE_MS = 180

const canvasStageViewportStyle = computed(() => ({
  width: `${CANVAS_STAGE_BASE_SIZE}px`,
  height: `${CANVAS_STAGE_BASE_SIZE}px`,
  minWidth: `${CANVAS_STAGE_BASE_SIZE}px`,
  minHeight: `${CANVAS_STAGE_BASE_SIZE}px`,
  flex: `0 0 ${CANVAS_STAGE_BASE_SIZE}px`,
  aspectRatio: "1 / 1",
  overflow: zoomLevel.value > 1 ? "visible" : "hidden",
}))

const canvasStageStyle = computed(() => ({
  width: `${CANVAS_STAGE_BASE_SIZE}px`,
  height: `${CANVAS_STAGE_BASE_SIZE}px`,
  minWidth: `${CANVAS_STAGE_BASE_SIZE}px`,
  minHeight: `${CANVAS_STAGE_BASE_SIZE}px`,
  flex: `0 0 ${CANVAS_STAGE_BASE_SIZE}px`,
  aspectRatio: "1 / 1",
  transform: `scale(${zoomLevel.value})`,
  transformOrigin: "center center",
}))
let isInitializingWorkspace = false
let previewTimer: number | null = null
let previewAutoCheckTimer: number | null = null
let saveNoticeTimer: number | null = null
let draftAutosaveTimer: number | null = null
let draftAutosavePending = false
let previewCooldownUntil = 0
type SizeDraftKey = "image" | "textbox" | "textContent"
type PreviewRefreshReason = "manual" | "auto" | "view-switch" | "restore"

function t(key: keyof typeof PREVIEW_I18N.en) {
  const dict = PREVIEW_I18N[selectedLocale.value] as Record<string, string>
  const fallback = PREVIEW_I18N.en as Record<string, string>
  return dict[key as string] || fallback[key as string]
}

function resolveUnknownErrorMessage(error: unknown) {
  return String((error as Error)?.message || error || "").trim()
}

function isAbortLikeError(error: unknown) {
  const name = typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name || "")
    : ""
  const message = resolveUnknownErrorMessage(error).toLowerCase()
  return name === "AbortError"
    || message.includes("signal is aborted")
    || message.includes("aborted without reason")
    || message.includes("request aborted")
}

function resolvePreviewRequestErrorMessage(error: unknown) {
  if (isAbortLikeError(error)) {
    return t("requestTimedOutRetry")
  }
  return resolveUnknownErrorMessage(error)
}

function normalizeArtworkUploadError(raw: unknown) {
  const message = resolveApiErrorMessage(raw).trim()
  const normalized = message.toLowerCase()
  if (!message) return t("uploadFailedRetry")
  if (
    normalized.includes("unsupported image format")
    || normalized.includes("unsupported media type")
    || normalized.includes("invalid image")
  ) {
    return t("unsupportedImageFormat")
  }
  if (
    normalized.includes("file too large")
    || normalized.includes("payload too large")
    || normalized.includes("request entity too large")
    || normalized.includes("max size")
  ) {
    return t("uploadFailedRetry")
  }
  return isTechnicalTemplateWorkflowMessage(message) ? t("uploadFailedRetry") : message
}

function parseOutputSizeValue(value: string | null | undefined): OutputSizeValue | null {
  const normalized = String(value || "").trim().toLowerCase().replace(/[×*]/g, "x").replace(/\s+/g, "")
  const match = normalized.match(/^(\d{2,5})x(\d{2,5})$/)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return {
    width,
    height,
    normalized: `${width}x${height}`,
  }
}

function normalizeOutputSize(value: string | null | undefined) {
  return parseOutputSizeValue(value)?.normalized || ""
}

function normalizeLooseOutputSize(value: string | null | undefined) {
  const raw = String(value || "").trim()
  const normalized = normalizeOutputSize(raw)
  if (normalized) return normalized
  const squareMatch = raw.match(/^(\d{2,5})$/)
  if (!squareMatch) return ""
  const edge = Number(squareMatch[1])
  if (!Number.isFinite(edge) || edge <= 0) return ""
  return `${edge}x${edge}`
}

function resolveOutputSizeTier(value: string | null | undefined) {
  const parsed = parseOutputSizeValue(value)
  const longestEdge = Math.max(parsed?.width || 0, parsed?.height || 0)
  if (longestEdge <= 512) return "512"
  if (longestEdge <= 1024) return "1024"
  if (longestEdge <= 2048) return "2048"
  return "4096"
}

function isStandardOutputSize(value: string | null | undefined) {
  const normalized = normalizeOutputSize(value)
  return STANDARD_BATCH_SIZES.includes(normalized as typeof STANDARD_BATCH_SIZES[number])
}

function isOriginalOutputSize(value: string | null | undefined) {
  const normalized = normalizeOutputSize(value)
  return Boolean(normalized && originalPreviewSize.value && normalized === originalPreviewSize.value)
}

function isCustomOutputSize(value: string | null | undefined) {
  const normalized = normalizeOutputSize(value)
  return Boolean(normalized) && !isStandardOutputSize(normalized) && !isOriginalOutputSize(normalized)
}

function formatOutputSizeValue(value: string | null | undefined) {
  const parsed = parseOutputSizeValue(value)
  if (!parsed) return ""
  return `${parsed.width}×${parsed.height}`
}

function formatOutputSizeChipLabel(value: string | null | undefined) {
  const normalized = normalizeOutputSize(value)
  if (!normalized) return formatSizeLabel(value)
  if (isOriginalOutputSize(normalized)) {
    return `${t("originalSize")} · ${formatOutputSizeValue(normalized)}`
  }
  if (isCustomOutputSize(normalized)) {
    return `${t("customSize")} · ${formatOutputSizeValue(normalized)}`
  }
  return formatOutputSizeValue(normalized)
}

function formatOutputSizeHelper(value: string | null | undefined, isOriginal = false) {
  const normalized = normalizeOutputSize(value)
  const tier = resolveOutputSizeTier(normalized)
  const billedAs = SIZE_DIMENSIONS[tier]
  const tokenText = formatTokenPrice(tier)
  if (tier === "512") {
    return `${t("previewSizeFreeHint")} ${t("customSizeTokenHint")}`
  }
  if (isOriginal) {
    return `${t("previewSizeOriginalHint")} ${billedAs} · ${tokenText}`
  }
  return `${t("previewSizeBilledAs")} ${billedAs} · ${tokenText}`
}

function formatPreviewMessage(
  key: keyof typeof PREVIEW_I18N.en,
  values: Record<string, string | number>,
) {
  let message = String(t(key))
  for (const [token, value] of Object.entries(values)) {
    message = message.split(`{${token}}`).join(String(value))
  }
  return message
}

function getLocalizedUnauthorizedArtworkMessage(entryName: string, hasTenant: boolean, canPurchase: boolean) {
  if (canPurchase) {
    return formatPreviewMessage("artworkNotUnlockedPurchasable", { name: entryName })
  }
  return hasTenant
    ? formatPreviewMessage("artworkNotUnlockedNoPermission", { name: entryName })
    : formatPreviewMessage("artworkNotUnlockedNoTenant", { name: entryName })
}

function resolveArtworkUnlockButtonLabel(priceTokens: number | string | null | undefined) {
  const tokens = Number(priceTokens || 0)
  if (!Number.isFinite(tokens) || tokens <= 0) return t("unlock")
  return `${t("unlock")} (${tokens} ${t("tokens")})`
}

const artworkTokenPurchaseSummary = computed(() => {
  const context = artworkTokenPurchaseContext.value
  if (!context) return t("needMoreTokensBeforeUnlockingArtwork")
  if (selectedLocale.value === "zh") {
    return `解锁“${context.name}”需要 ${context.priceTokens || 0} ${t("tokens")}，你当前有 ${context.currentBalance || 0} ${t("tokens")}，还差 ${context.shortfallTokens || 0} ${t("tokens")}。`
  }
  return `Unlocking "${context.name}" costs ${context.priceTokens || 0} ${t("tokens")}. Your current balance is ${context.currentBalance || 0} ${t("tokens")}, so you need ${context.shortfallTokens || 0} more ${t("tokens")}.`
})

function formatEditableSizeValue(value: number | undefined) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return ""
  return numeric.toFixed(1).replace(/\.0$/, "")
}

function draftNumberValue(value: string) {
  const numeric = Number(String(value || "").trim())
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
}

function draftNumberText(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : ""
}

function syncSizeDraft(
  target: typeof imageSizeDraft,
  measurement?: { width: number; height: number } | null,
) {
  target.value = {
    width: formatEditableSizeValue(measurement?.width),
    height: formatEditableSizeValue(measurement?.height),
  }
}

function beginSizeInput(key: SizeDraftKey) {
  activeSizeDraftKey.value = key
}

function endSizeInput(key: SizeDraftKey) {
  if (activeSizeDraftKey.value === key) {
    activeSizeDraftKey.value = ""
  }
}

async function runCanvasMutationWithPreview(
  action: () => Promise<unknown> | unknown,
  _previewDelay = 220,
) {
  const previousSignature = canvasSignature.value
  await action()
  if (canvasSignature.value !== previousSignature) {
    markPreviewDirty()
    return true
  }
  return false
}

async function clearCurrentPart() {
  clearMenuOpen.value = false
  const currentState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  if (!currentState || !selectedPartKey.value) return
  const nextState: SerializableCanvasState = {
    ...currentState,
    activePartKey: selectedPartKey.value,
    activeLayerId: "",
    parts: currentState.parts.filter((entry) => entry.partKey !== selectedPartKey.value),
  }
  await canvasRef.value?.restoreSerializableState?.(nextState)
  refreshLayerOptions()
  refreshPartLayerCounts()
}

async function clearAllParts() {
  clearMenuOpen.value = false
  const currentState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  if (!currentState) return
  await canvasRef.value?.restoreSerializableState?.({
    version: 1,
    activePartKey: selectedPartKey.value || currentState.activePartKey || "",
    activeLayerId: "",
    parts: [],
  })
  refreshLayerOptions()
  refreshPartLayerCounts()
}

function cloneSerializableLayers(layers: Array<Record<string, unknown>>) {
  return layers.map((layer) => JSON.parse(JSON.stringify(layer)) as Record<string, unknown>)
}

function openCopyPartModal() {
  if (!selectedPartKey.value || !partHasArtwork(selectedPartKey.value)) return
  copyPartSelectedTargets.value = []
  copyPartModalOpen.value = true
}

function closeCopyPartModal() {
  copyPartModalOpen.value = false
  copyPartSelectedTargets.value = []
}

function toggleCopyPartTarget(partKey: string, checked: boolean) {
  const next = new Set(copyPartSelectedTargets.value)
  if (checked) next.add(partKey)
  else next.delete(partKey)
  copyPartSelectedTargets.value = copyPartTargetOptions.value
    .map((part) => part.part_name)
    .filter((partName): partName is string => next.has(partName))
}

function toggleCopyPartSelectAll(checked: boolean) {
  copyPartSelectedTargets.value = checked
    ? copyPartTargetOptions.value.map((part) => part.part_name).filter((partName): partName is string => Boolean(partName))
    : []
}

async function confirmCopyCurrentPart() {
  const sourcePartKey = selectedPartKey.value
  const targetPartKeys = copyPartSelectedTargets.value.filter((partKey) => partKey !== sourcePartKey)
  const currentState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  if (!sourcePartKey || !targetPartKeys.length || !currentState) return
  const sourceEntry = currentState.parts.find((entry) => entry.partKey === sourcePartKey)
  if (!sourceEntry?.layers?.length) {
    closeCopyPartModal()
    return
  }
  const copiedLayers = cloneSerializableLayers(sourceEntry.layers)
  const preservedParts = currentState.parts.filter((entry) => !targetPartKeys.includes(entry.partKey))
  const orderedTargetEntries = partOptions.value
    .map((part) => part.part_name)
    .filter((partName): partName is string => targetPartKeys.includes(partName))
    .map((partKey) => ({
      partKey,
      layers: cloneSerializableLayers(copiedLayers),
    }))
  await runCanvasMutationWithPreview(() => canvasRef.value?.applySerializableStateWithHistory?.({
    ...currentState,
    activePartKey: sourcePartKey,
    activeLayerId: currentState.activeLayerId || "",
    parts: [...preservedParts, ...orderedTargetEntries],
  }, {
    source: "user",
    suppressAutoPreview: true,
  }), 280)
  refreshLayerOptions()
  refreshPartLayerCounts()
  closeCopyPartModal()
}

function cloneSerializableState(state: SerializableCanvasState) {
  return JSON.parse(JSON.stringify(state)) as SerializableCanvasState
}

function generateSerializableLayerId(partKey: string) {
  return `${partKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function applyArtworkReplacementToLayer(layer: Record<string, unknown>, uploaded: ArtworkReplacementAsset) {
  layer.src = uploaded.src
  layer.previewSrc = uploaded.previewSrc || uploaded.src
  layer.name = uploaded.name
  layer.libraryScope = uploaded.libraryScope
  layer.artworkId = uploaded.id
  delete layer.svgMarkup
  delete layer.svgFill
  delete layer.svgLayers
}

async function probeArtworkNaturalSize(src: string) {
  const normalized = resolveAssetUrl(String(src || "").trim())
  if (!normalized) return null
  const cached = artworkNaturalSizeCache.get(normalized)
  if (cached) return await cached
  const pending = new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      const width = Number(image.naturalWidth || image.width || 0)
      const height = Number(image.naturalHeight || image.height || 0)
      if (!width || !height) {
        resolve(null)
        return
      }
      resolve({ width, height })
    }
    image.onerror = () => resolve(null)
    image.src = normalized
  })
  artworkNaturalSizeCache.set(normalized, pending)
  const resolved = await pending
  if (!resolved) {
    artworkNaturalSizeCache.delete(normalized)
  }
  return resolved
}

function openReplaceArtworkPicker(
  mode: "" | "replace-current" | "replace-name-part" | "replace-name-all",
  target: ImageContextMenuPayload | null = imageContextMenu.value,
) {
  if (!target || !mode) return
  pendingImageReplaceAction.value = mode
  pendingImageReplaceTarget.value = { ...target }
  replaceArtworkSelectionId.value = ""
  clearArtworkFeedback()
  showArtworkCategoryPopover.value = false
  replaceArtworkModalOpen.value = true
}

async function applyImageReplacement(mode: "" | "replace-current" | "replace-name-part" | "replace-name-all", uploaded: ArtworkReplacementAsset) {
  const target = pendingImageReplaceTarget.value
  const currentState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  if (!target || !currentState || target.layerKind !== "image") return
  const nextState = cloneSerializableState(currentState)
  const targetPart = nextState.parts.find((entry) => entry.partKey === target.partKey)
  const targetLayer = targetPart?.layers.find((layer) => String(layer.id || "") === target.layerId)
  if (!targetPart || !targetLayer) return
  const targetName = String(targetLayer.name || "").trim()
  nextState.parts.forEach((part) => {
    const samePart = part.partKey === target.partKey
    part.layers.forEach((layer) => {
      if (String(layer.kind || "") !== "image") return
      const sameLayer = samePart && String(layer.id || "") === target.layerId
      const sameName = targetName && String(layer.name || "").trim() === targetName
      const shouldReplace = mode === "replace-current"
        ? sameLayer
        : mode === "replace-name-part"
          ? (samePart && (sameName || sameLayer))
          : (sameName || sameLayer)
      if (!shouldReplace) return
      applyArtworkReplacementToLayer(layer, uploaded)
    })
  })
  await runCanvasMutationWithPreview(() => canvasRef.value?.applySerializableStateWithHistory?.({
    ...nextState,
    activePartKey: target.partKey,
    activeLayerId: target.layerId,
  }, {
    source: "user",
    suppressAutoPreview: true,
  }), 280)
  await canvasRef.value?.selectLayer?.(target.layerId, "programmatic")
  await persistWorkspaceDesign()
  refreshLayerOptions()
  refreshPartLayerCounts()
  hasArtwork.value = true
  previewMode.value = "default"
}

function closeReplaceArtworkModal(resetPending = true) {
  replaceArtworkModalOpen.value = false
  replaceArtworkSelectionId.value = ""
  showArtworkCategoryPopover.value = false
  if (resetPending) {
    pendingImageReplaceAction.value = ""
    pendingImageReplaceTarget.value = null
  }
}

function triggerReplaceArtworkUpload() {
  clearArtworkFeedback()
  artworkLibraryTab.value = "owned"
  ownedArtworkSearch.value = ""
  ownedArtworkPage.value = 1
  replaceArtworkInputRef.value?.click()
}

async function handleReplaceArtworkTileSelection(artwork: ArtworkCatalogEntry) {
  replaceArtworkSelectionId.value = artwork.artwork_id
  clearArtworkFeedback()
  const action = resolveArtworkTileAction(artwork)
  if (artworkLibraryTab.value === "owned" || action === "use") return
  if (action === "purchase") {
    await purchaseArtworkEntry(artwork)
    return
  }
  if (!isPreviewAuthenticated.value) {
    await router.push({
      path: "/auth",
      query: { mode: "login", redirect: route.fullPath },
    })
    return
  }
  setArtworkFeedback(
    getLocalizedUnauthorizedArtworkMessage(artwork.name, Boolean(currentTenantId.value), false),
    "error",
  )
}

async function resolveArtworkReplacementAsset(entry: ArtworkCatalogEntry | null): Promise<ArtworkReplacementAsset | null> {
  if (!entry) return null
  if (artworkLibraryTab.value === "owned") {
    const ownedEntry = ownedArtworkLibrary.value.find((item) => item.id === entry.artwork_id)
    if (!ownedEntry) return null
    return {
      id: ownedEntry.id,
      name: ownedEntry.name,
      src: ownedEntry.src,
      previewSrc: ownedEntry.previewSrc || ownedEntry.src,
      libraryScope: "owned",
    }
  }
  if (!(await ensureArtworkAuthorized(entry))) return null
  const resolution = await resolveArtworkInsertSource(entry, { logger: console })
  if (!resolution.source) {
    setArtworkFeedback(t("noPreviewAvailable"), "error")
    return null
  }
  return {
    id: entry.artwork_id,
    name: entry.name,
    src: resolution.source,
    previewSrc: resolveAssetUrl(String(entry.preview_url || entry.original_url || resolution.source).trim()),
    libraryScope: artworkLibraryTab.value as Exclude<ArtworkReplacementLibraryScope, "owned">,
  }
}

async function confirmReplaceArtworkSelection() {
  const mode = pendingImageReplaceAction.value
  const entry = selectedReplaceArtworkEntry.value
  if (!mode || !pendingImageReplaceTarget.value || !entry) {
    setArtworkFeedback(t("replaceSelectArtworkFirst"), "error")
    return
  }
  isApplyingArtworkReplacement.value = true
  try {
    const replacement = await resolveArtworkReplacementAsset(entry)
    if (!replacement) return
    await applyImageReplacement(mode, replacement)
    clearArtworkFeedback()
    closeReplaceArtworkModal()
  } catch (error) {
    setArtworkFeedback(resolveApiErrorMessage(error), "error")
  } finally {
    isApplyingArtworkReplacement.value = false
  }
}

async function handleReplaceArtworkSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const mode = pendingImageReplaceAction.value
  if (!file) {
    input.value = ""
    return
  }
  if (!mode || !pendingImageReplaceTarget.value) {
    closeReplaceArtworkModal()
    input.value = ""
    return
  }
  isApplyingArtworkReplacement.value = true
  try {
    const uploaded = await uploadArtworkFile(file)
    upsertArtworkLibraryEntry({
      id: uploaded.id,
      name: uploaded.name,
      src: uploaded.src,
      previewSrc: uploaded.previewSrc,
      createdAt: new Date().toISOString(),
    })
    await loadUploadArtworkLibrary()
    await applyImageReplacement(mode, { ...uploaded, libraryScope: "owned" })
    clearArtworkFeedback()
    closeReplaceArtworkModal()
  } catch (error) {
    setArtworkFeedback(normalizeArtworkUploadError(error), "error")
  } finally {
    isApplyingArtworkReplacement.value = false
    input.value = ""
  }
}

async function duplicateActiveByCount(count: number, targetOverride?: ImageContextMenuPayload | null) {
  const target = targetOverride || imageContextMenu.value
  const currentState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  if (!target || !currentState || count <= 0) return
  const nextState = cloneSerializableState(currentState)
  const targetPart = nextState.parts.find((entry) => entry.partKey === target.partKey)
  const targetLayer = targetPart?.layers.find((layer) => String(layer.id || "") === target.layerId)
  if (!targetPart || !targetLayer) return
  const copies = Array.from({ length: count }, (_, index) => ({
    ...JSON.parse(JSON.stringify(targetLayer)) as Record<string, unknown>,
    id: generateSerializableLayerId(target.partKey),
    left: Number(targetLayer.left || 0) + (24 * (index + 1)),
    top: Number(targetLayer.top || 0) + (24 * (index + 1)),
  }))
  targetPart.layers = [...targetPart.layers, ...copies]
  await runCanvasMutationWithPreview(() => canvasRef.value?.applySerializableStateWithHistory?.({
    ...nextState,
    activePartKey: target.partKey,
    activeLayerId: String(copies[copies.length - 1]?.id || target.layerId),
  }, {
    source: "user",
    suppressAutoPreview: true,
  }), 280)
  refreshLayerOptions()
  refreshPartLayerCounts()
}

function resolveDimensionResizeFactor(
  axis: "width" | "height",
  draft: { width: string; height: string },
  measurement?: { width: number; height: number } | null,
) {
  if (!measurement) return null
  const nextValue = Number(draft[axis])
  const currentValue = axis === "width" ? Number(measurement.width) : Number(measurement.height)
  if (!Number.isFinite(nextValue) || nextValue <= 0 || !Number.isFinite(currentValue) || currentValue <= 0) {
    return null
  }
  const factor = nextValue / currentValue
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) {
    return null
  }
  return factor
}

async function applyImageSizeInput(axis: "width" | "height") {
  if (!canEditImage.value) return
  const measurement = activeImageMetrics.value?.imageBoxDisplay || null
  const factor = resolveDimensionResizeFactor(axis, imageSizeDraft.value, measurement)
  if (!factor) {
    syncSizeDraft(imageSizeDraft, measurement)
    endSizeInput("image")
    return
  }
  if (imageSizeAspectLocked.value) {
    await runCanvasMutationWithPreview(async () => {
      await canvasRef.value?.resizeActiveImage?.("width", factor)
      await canvasRef.value?.resizeActiveImage?.("height", factor)
    })
  } else {
    await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveImage?.(axis, factor))
  }
  syncSizeDraft(imageSizeDraft, activeImageMetrics.value?.imageBoxDisplay || measurement)
  endSizeInput("image")
}

async function applyTextSizeInput(target: "textbox" | "content", axis: "width" | "height") {
  const sizeKey = target === "textbox" ? "textbox" : "textContent"
  if (!canEditText.value) return
  const measurement = target === "textbox"
    ? activeTextMetrics.value?.textboxDisplay || null
    : activeTextMetrics.value?.textContent?.display || null
  const draft = target === "textbox" ? textboxSizeDraft.value : textContentSizeDraft.value
  const factor = resolveDimensionResizeFactor(axis, draft, measurement)
  if (!factor) {
    if (target === "textbox") {
      syncSizeDraft(textboxSizeDraft, measurement)
    } else {
      syncSizeDraft(textContentSizeDraft, measurement)
    }
    endSizeInput(sizeKey)
    return
  }
  if (target === "textbox") {
    await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveTextbox?.(axis, factor))
  } else if (textContentSizeAspectLocked.value) {
    await runCanvasMutationWithPreview(async () => {
      await canvasRef.value?.resizeActiveTextContent?.("width", factor)
      await canvasRef.value?.resizeActiveTextContent?.("height", factor)
    })
  } else {
    await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveTextContent?.(axis, factor))
  }
  if (target === "textbox") {
    syncSizeDraft(textboxSizeDraft, activeTextMetrics.value?.textboxDisplay || measurement)
  } else {
    syncSizeDraft(textContentSizeDraft, activeTextMetrics.value?.textContent?.display || measurement)
  }
  endSizeInput(sizeKey)
}

function updateTextFontSizeValue(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return
  textFontSize.value = value
}

function handleTextFontSizeChange(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return
  textFontSize.value = value
  applyTextSettings()
}

function updateTextLineHeightValue(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return
  textLineHeight.value = value
}

function handleTextLineHeightChange(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return
  textLineHeight.value = value
  applyTextSettings()
}

function handleImageSizeDraftInput(axis: "width" | "height", rawValue: string) {
  imageSizeDraft.value = {
    ...imageSizeDraft.value,
    [axis]: rawValue,
  }
}

function updateImageSizeDraftNumber(axis: "width" | "height", value: number | undefined) {
  handleImageSizeDraftInput(axis, draftNumberText(value))
}

function handleTextSizeDraftInput(target: "textbox" | "content", axis: "width" | "height", rawValue: string) {
  if (target === "textbox") {
    textboxSizeDraft.value = {
      ...textboxSizeDraft.value,
      [axis]: rawValue,
    }
    return
  }
  textContentSizeDraft.value = {
    ...textContentSizeDraft.value,
    [axis]: rawValue,
  }
}

async function adjustTextSizeByStep(target: "textbox" | "content", axis: "width" | "height", direction: -1 | 1) {
  if (!canEditText.value) return
  const factor = direction > 0 ? 1.05 : (1 / 1.05)
  if (target === "textbox") {
    await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveTextbox?.(axis, factor), 280)
    syncSizeDraft(textboxSizeDraft, activeTextMetrics.value?.textboxDisplay || null)
    return
  }
  await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveTextContent?.(axis, factor), 280)
  syncSizeDraft(textContentSizeDraft, activeTextMetrics.value?.textContent?.display || null)
}

function updateTextSizeDraftNumber(target: "textbox" | "content", axis: "width" | "height", value: number | undefined) {
  handleTextSizeDraftInput(target, axis, draftNumberText(value))
}

function handleImageOpacityInput(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return
  updateImageOpacityPercent(value)
}

async function applyImageTileMode(mode: ImageTileMode) {
  if (!canEditImage.value || imageTileMode.value === mode) return
  imageTileMode.value = mode
  await runCanvasMutationWithPreview(() => canvasRef.value?.setActiveImageTileMode?.(mode), 280)
}

const editorPayload = computed(() => payload.value)
const partOptions = computed(() => editorPayload.value?.parts || [])
const currentPart = computed(() => partOptions.value.find((item) => item.part_name === selectedPartKey.value) || partOptions.value[0] || null)
const copyPartTargetOptions = computed(() => partOptions.value.filter((part) => part.part_name !== selectedPartKey.value))
const copyPartAllSelected = computed(() => (
  copyPartTargetOptions.value.length > 0 && copyPartSelectedTargets.value.length === copyPartTargetOptions.value.length
))
const currentTemplateMetaEntry = computed(() => {
  const references = [
    String(editorPayload.value?.template_id || ""),
    String((editorPayload.value as any)?.template_code || ""),
    String(selectedTemplateId.value || ""),
    String(route.query.template_id || route.query.template || ""),
    String(route.query.template_code || ""),
  ]
    .map((value) => value.trim())
    .filter(Boolean)

  for (const reference of references) {
    const catalogMatch = resolveTemplateEntryByReference(reference)
    if (catalogMatch) return catalogMatch
    const itemMatch = items.value.find((item) => buildTemplateIdentityKeys(item).includes(reference))
    if (itemMatch) return itemMatch
  }

  return null
})
const currentTemplateDisplayName = computed(() => {
  const payload = editorPayload.value as any
  const catalogName = String(currentTemplateMetaEntry.value?.display_name || "").trim()
  const name = String(payload?.display_name || payload?.name || payload?.template_name || catalogName || route.query.display_name || "").trim()
  return name
})
const currentTemplateNumber = computed(() => {
  const payload = editorPayload.value as any
  const catalogCode = String(currentTemplateMetaEntry.value?.template_code || "").trim()
  const code = String(
    payload?.template_code
    || catalogCode
    || route.query.template_code
    || "",
  ).trim()
  return code
})
const currentTemplateBaseCode = computed(() => {
  const payload = editorPayload.value as any
  return String(
    payload?.base_size_label
    || "",
  ).trim()
})
const templateGradingSummary = computed<{ standardSize: any; sizes: any[] }>(() => {
  const normalizeGradingSize = (raw: any) => {
    if (!raw || typeof raw !== "object") return null
    const partMappingsRaw = raw.partMappings ?? raw.part_mappings ?? {}
    const partMappings: Record<string, string> = {}
    if (partMappingsRaw && typeof partMappingsRaw === "object") {
      for (const [k, v] of Object.entries(partMappingsRaw)) {
        partMappings[String(k)] = String(v ?? "")
      }
    }
    return {
      code: String(raw.code ?? ""),
      isStandard: Boolean(raw.isStandard ?? raw.is_standard ?? false),
      sizeSvgUrl: String(raw.sizeSvgUrl ?? raw.size_svg_url ?? ""),
      mappingImageUrl: String(raw.mappingImageUrl ?? raw.mapping_image_url ?? ""),
      partMappings,
    }
  }
  const normalizeGrading = (raw: any) => {
    if (!raw || typeof raw !== "object") return null
    const standardSize = raw.standardSize ?? raw.standard_size ?? null
    const rawSizes = Array.isArray(raw.sizes) ? raw.sizes : []
    const sizes = rawSizes.map(normalizeGradingSize).filter(Boolean) as any[]
    return { standardSize: standardSize || null, sizes }
  }
  const payload = editorPayload.value as any
  const fromPayload = normalizeGrading(payload?.grading)
  if (fromPayload && (fromPayload.standardSize || fromPayload.sizes.length)) {
    return fromPayload
  }
  const fromMeta = normalizeGrading((currentTemplateMetaEntry.value as any)?.grading)
  if (fromMeta && (fromMeta.standardSize || fromMeta.sizes.length)) {
    return fromMeta
  }
  return { standardSize: null, sizes: [] }
})
const canOpenGrading = computed(() => (
  !!templateGradingSummary.value.standardSize
  && Array.isArray(templateGradingSummary.value.sizes)
  && templateGradingSummary.value.sizes.length > 0
))
const gradingTemplateName = computed(() => {
  const display = String(currentTemplateDisplayName.value || "").trim()
  if (display) return display
  const code = String(currentTemplateNumber.value || "").trim()
  if (code) return code
  return String(selectedTemplateId.value || "template")
})
const gradingDesignSignature = computed(() => {
  try {
    return String(buildCurrentPreviewCacheDesignSignature() || "").trim()
  } catch {
    return ""
  }
})
function openGradingModal() {
  if (!canOpenGrading.value) return
  // Plan v3 §S2.3：用户尚未订阅 Grading 时拦截，弹出 GateModal 引导订阅或试用。
  if (gradingTier.value === "none") {
    gradingGateOpen.value = true
    return
  }
  gradingModalOpen.value = true
}
// Plan v3 §S2.3：30 天 trial 启动成功后，关闭 GateModal 并直接进入 WorkspaceModal。
function onGradingTrialStarted() {
  gradingGateOpen.value = false
  gradingModalOpen.value = true
}
// Plan v3 §S2.3：WorkspaceModal 兜底捕获 GRADING_SUBSCRIPTION_REQUIRED 时回退到 GateModal。
function onGradingPaywall() {
  gradingModalOpen.value = false
  gradingGateOpen.value = true
}
const exportPartPngsHandler = (targetSize?: { width: number; height: number }) => (
  canvasRef.value?.exportPartPngs?.(targetSize) ?? Promise.resolve([])
)
const exportPartSvgsHandler = (targetSize?: { width: number; height: number }) => (
  canvasRef.value?.exportPartSvgs?.(targetSize) ?? Promise.resolve([])
)
const currentSelectedPartLabel = computed(() => {
  const partCode = String(currentPart.value?.part_name || "").trim()
  const partDisplayName = resolvePartDisplayName(currentPart.value)
  return stripDisplayFileExtension(partDisplayName || partCode || t("noPartSelected"))
})
const currentCanvasMetaTitle = computed(() => {
  const segments: string[] = []
  const displayName = String(currentTemplateDisplayName.value || "").trim()
  const templateCode = String(currentTemplateNumber.value || "").trim()
  const baseCode = String(currentTemplateBaseCode.value || "").trim()
  const partName = currentSelectedPartLabel.value !== t("noPartSelected")
    ? String(currentSelectedPartLabel.value || "").trim()
    : ""

  if (displayName) {
    segments.push(templateCode && templateCode !== displayName ? `${displayName} (${templateCode})` : displayName)
  } else if (templateCode) {
    segments.push(templateCode)
  }
  if (baseCode) segments.push(baseCode)
  if (partName) segments.push(partName)

  return segments.join(" ").trim()
})
const currentTenantId = computed(() => authStore.tenant?.tenant_id || "")
const currentTokenBalance = computed(() => Number(authStore.entitlements?.token_balance ?? 0))
const draftsBadgeCount = computed(() => draftRecords.value.length)
// results 列表只保留 export / download_zip 输出，过滤掉 preview / draft_save 等 Quick Preview 类条目
const resultsDisplayOutputs = computed(() => renderOutputs.value.filter((output) => isResultsOutputSource(output.source)))
const resultsBadgeCount = computed(() => resultsDisplayOutputs.value.length)
const availableViews = computed(() => editorPayload.value?.views || [])
const availableColors = computed(() => editorPayload.value?.colors || [])
const originalPreviewSize = computed(() => {
  return normalizeOutputSize(String(editorPayload.value?.template_size || editorPayload.value?.default_output_size || "").trim())
})
const availableSizes = computed(() => {
  const values = new Set<string>(STANDARD_BATCH_SIZES)
  if (originalPreviewSize.value) values.add(originalPreviewSize.value)
  const previewDraft = normalizeOutputSize(previewCustomSizeDraft.value)
  const batchDraft = normalizeOutputSize(batchCustomSizeDraft.value)
  const selectedPreviewSize = normalizeOutputSize(selectedSize.value)
  if (previewDraft) values.add(previewDraft)
  if (batchDraft) values.add(batchDraft)
  if (selectedPreviewSize) values.add(selectedPreviewSize)
  selectedBatchSizes.value.map((size) => normalizeOutputSize(size)).filter(Boolean).forEach((size) => values.add(size))
  return Array.from(values)
})
const previewSizeOptions = computed<PreviewSizeOption[]>(() => {
  return availableSizes.value.map((value) => {
    const normalizedValue = normalizeOutputSize(value)
    const isOriginal = isOriginalOutputSize(normalizedValue)
    const isCustom = isCustomOutputSize(normalizedValue)
    return {
      value: normalizedValue,
      label: formatOutputSizeChipLabel(normalizedValue),
      helper: formatOutputSizeHelper(normalizedValue, isOriginal),
      isOriginal,
      isCustom,
    }
  }).sort((left, right) => {
    const leftTier = Number(resolveOutputSizeTier(left.value))
    const rightTier = Number(resolveOutputSizeTier(right.value))
    if (leftTier !== rightTier) return leftTier - rightTier
    return left.value.localeCompare(right.value)
  })
})
const previewSize = computed(() => {
  const next = normalizeOutputSize(selectedSize.value)
  return previewSizeOptions.value.some((option) => option.value === next) ? next : PREVIEW_SIZE
})
const currentViewIndex = computed(() => {
  const targetView = viewPreviewModalOpen.value ? activePreviewDialogView.value : selectedView.value
  return availableViews.value.findIndex((view) => view === targetView)
})
const previewShortcutKeysById = Object.fromEntries(
  listVisiblePreviewShortcuts().map((shortcut) => [shortcut.id, shortcut.displayKeys]),
) as Record<string, string>
const shortcutLabelKeysById = {
  "move-up": "shortcutMoveUp",
  "move-down": "shortcutMoveDown",
  "move-left": "shortcutMoveLeft",
  "move-right": "shortcutMoveRight",
  "mirror-horizontal": "shortcutMirrorHorizontal",
  "mirror-vertical": "shortcutMirrorVertical",
  "rotate-clockwise": "shortcutRotateClockwise",
  "rotate-counterclockwise": "shortcutRotateCounterclockwise",
  amplify: "shortcutAmplify",
  reduce: "shortcutReduce",
  delete: "shortcutDelete",
  "save-product": "shortcutSaveProduct",
  "pattern-replication": "shortcutPatternReplication",
  "maximize-pattern-design": "shortcutMaximizePatternDesign",
  "spread-design": "shortcutSpreadDesign",
  "maximize-pattern-width": "shortcutMaximizePatternWidth",
  "maximize-pattern-height": "shortcutMaximizePatternHeight",
  redesign: "shortcutRedesign",
  undo: "shortcutUndoAction",
  redo: "shortcutRedoAction",
  horizontally: "shortcutHorizontally",
  "design-middle": "shortcutDesignMiddle",
  layer: "shortcutLayerPanel",
  background: "shortcutBackgroundPanel",
} as const satisfies Partial<Record<string, keyof typeof PREVIEW_I18N.en>>
const imageTileModeOptions = computed<Array<{
  value: ImageTileMode
  label: string
  shortcutId: ImageTileShortcutId
  description: string
  shortcutKeys: string
}>>(() => imageTileModeOptionSeeds.map((option) => ({
  value: option.value,
  label: t(option.labelKey),
  shortcutId: option.shortcutId,
  description: t(option.descriptionKey),
  shortcutKeys: previewShortcutKeysById[option.shortcutId] || "",
})))
const activeImageTileModeOption = computed(() => imageTileModeOptions.value.find((option) => option.value === imageTileMode.value) || null)
const sharedLayerContextMenuItems = [
  { action: "duplicate" as const, label: "Duplicate" },
  { action: "duplicate-count" as const, label: "Duplicate Layer Count" },
  { action: "edit-size" as const, label: "Modify Width and Height" },
  { action: "bring-front" as const, label: "Move Up" },
  { action: "send-back" as const, label: "Move Down" },
  { action: "rotate-right" as const, label: "Rotate 45° Clockwise" },
  { action: "rotate-left" as const, label: "Rotate 45° Counterclockwise" },
  { action: "flip-x" as const, label: "Horizontal Mirror" },
  { action: "flip-y" as const, label: "Vertical Mirror" },
]
const activeImageContextMenuTitle = computed(() => (
  imageContextMenu.value?.layerKind === "text" ? t("textLayerActions") : t("imageLayerActions")
))
const activeImageContextMenuItems = computed<Array<{
  action: ImageContextAction
  label: string
  danger?: boolean
}>>(() => {
  if (imageContextMenu.value?.layerKind === "text") {
    return [
      { action: "edit-text", label: "Edit Text" },
      ...sharedLayerContextMenuItems,
      { action: "refresh-preview", label: "Refresh Preview" },
      { action: "delete", label: "Delete", danger: true },
    ]
  }
  return [
    { action: "replace-current", label: "Replace Picture" },
    { action: "replace-name-part", label: "Replace the picture with the same name" },
    { action: "replace-name-all", label: "Replace all sides of the picture with the same name" },
    ...sharedLayerContextMenuItems,
    { action: "spread-part-bounds", label: t("spreadPartBounds") },
    { action: "spread-part-canvas", label: t("spreadPartCanvas") },
    { action: "refresh-preview", label: "Refresh Preview" },
    { action: "delete", label: "Delete", danger: true },
  ]
})
const tileModeShortcutLabelsById = computed<Record<string, string>>(() => Object.fromEntries(
  imageTileModeOptions.value.map((option) => [option.shortcutId, `${t("tileModeShortcutGroup")} / ${option.label}`]),
))
const localizedShortcutLabelsById = computed<Record<string, string>>(() => Object.fromEntries(
  Object.entries(shortcutLabelKeysById).map(([shortcutId, labelKey]) => [shortcutId, t(labelKey)]),
))
type UnifiedPreviewImageEntry = {
  view: string
  color: string
  size: string
  mode: PreviewSourceMode
  url: string
  filePath: string
  cacheKey: string
  loadKey: string
  status: "idle" | "rendering" | "fresh" | "stale" | "failed"
}

type PreviewPartImage = {
  partName: string
  blob: Blob
}

type PreviewComposeResult = {
  response: ComposeResponse
  url: string
  filePath: string
  signature: string
}

const shouldUseDefaultPreviewFallback = computed(() => previewSize.value === PREVIEW_SIZE)
function resolvePreviewOutputEntry(
  color: string,
  view: string,
  size: string,
  mode: PreviewSourceMode,
  allowDefaultModeFallback = true,
) {
  const activeEntry = previewOutputs.value[previewKey(color, view, size, mode)]
  if (activeEntry) return activeEntry
  if (!allowDefaultModeFallback || mode === "default") return null
  return previewOutputs.value[previewKey(color, view, size, "default")] || null
}
function resolvePreviewRequestState(
  color: string,
  view: string,
  size: string,
  mode: PreviewSourceMode,
  allowDefaultModeFallback = true,
) {
  const directKey = previewKey(color, view, size, mode)
  const directState = previewRequestStateByKey.value[directKey]
  const directEntry = previewOutputs.value[directKey]
  const currentSignature = previewSignature(mode)
  if (directState === "rendering") return "rendering" as const
  if (directEntry?.signature === currentSignature) return "fresh" as const
  if (directEntry?.url) return "stale" as const
  if (!allowDefaultModeFallback || mode === "default") {
    return directState === "failed" ? "failed" : "idle"
  }
  const fallbackKey = previewKey(color, view, size, "default")
  const fallbackState = previewRequestStateByKey.value[fallbackKey]
  const fallbackEntry = previewOutputs.value[fallbackKey]
  if (fallbackState === "rendering") return "rendering" as const
  if (fallbackEntry?.signature === previewSignature("default")) return "fresh" as const
  if (fallbackEntry?.url) return "stale" as const
  return fallbackState === "failed" ? "failed" : "idle"
}
function resolveTemplatePreviewFallback(color: string, view: string) {
  return resolveRuntimeAssetUrl(editorPayload.value?.preview_map?.[`${color}::${view}`] || "")
}
function resolvePreviewImageForView(
  view: string,
  size = previewSize.value,
  options?: {
    color?: string
    mode?: PreviewSourceMode
    allowDefaultModeFallback?: boolean
    allowTemplateFallback?: boolean
  },
) {
  const color = options?.color ?? selectedColor.value
  const mode = options?.mode ?? previewMode.value
  const cachedEntry = resolvePreviewOutputEntry(
    color,
    view,
    size,
    mode,
    options?.allowDefaultModeFallback ?? true,
  )
  if (cachedEntry?.url) return cachedEntry.url
  if (!options?.allowTemplateFallback) return ""
  return resolveTemplatePreviewFallback(color, view)
}
function resolvePreviewFilePathForView(
  view: string,
  size: string,
  options?: {
    color?: string
    mode?: PreviewSourceMode
    allowDefaultModeFallback?: boolean
  },
) {
  const color = options?.color ?? selectedColor.value
  const mode = options?.mode ?? previewMode.value
  const cachedEntry = resolvePreviewOutputEntry(
    color,
    view,
    size,
    mode,
    options?.allowDefaultModeFallback ?? true,
  )
  if (cachedEntry?.filePath) return cachedEntry.filePath
  return ""
}

function resolveCurrentSessionDraftId() {
  return activeDraftId.value || lastServerActiveDraftId.value || draftRecords.value[0]?.draftId || ""
}

function resolveCurrentSessionDraftRecord() {
  const draftId = resolveCurrentSessionDraftId()
  return draftRecords.value.find((draft) => draft.draftId === draftId) || null
}

function resolveMainPreviewSelection(record?: {
  draftId?: string
  preferencesJson?: string
} | null) {
  const draftRecord = record ?? resolveCurrentSessionDraftRecord()
  const mainView = mainPreviewView.value || resolveDraftMainPreviewView(draftRecord) || selectedView.value || availableViews.value[0] || ""
  const mainColor = mainPreviewColor.value || resolveDraftMainPreviewColor(draftRecord) || selectedColor.value || editorPayload.value?.default_color || availableColors.value[0] || ""
  return { view: mainView, color: mainColor }
}

function resolvePreviewImageEntry(
  view: string,
  options?: {
    color?: string
    size?: string
    mode?: PreviewSourceMode
    allowDefaultModeFallback?: boolean
    allowTemplateFallback?: boolean
  },
): UnifiedPreviewImageEntry {
  const color = options?.color ?? selectedColor.value ?? editorPayload.value?.default_color ?? availableColors.value[0] ?? ""
  const size = options?.size ?? previewSize.value
  const mode = options?.mode ?? previewMode.value
  const allowDefaultModeFallback = options?.allowDefaultModeFallback ?? true
  const allowTemplateFallback = options?.allowTemplateFallback ?? shouldUseDefaultPreviewFallback.value
  const url = resolvePreviewImageForView(view, size, {
    color,
    mode,
    allowDefaultModeFallback,
    allowTemplateFallback,
  })
  const filePath = resolvePreviewFilePathForView(view, size, {
    color,
    mode,
    allowDefaultModeFallback,
  })
  const cacheKey = `${color}::${view}::${size}::${mode}`
  const status = resolvePreviewRequestState(color, view, size, mode, allowDefaultModeFallback)
  return {
    view,
    color,
    size,
    mode,
    url,
    filePath,
    cacheKey,
    loadKey: `${cacheKey}::${url || "missing"}`,
    status,
  }
}

function resolvePreviewImageEntries(options?: {
  color?: string
  size?: string
  mode?: PreviewSourceMode
  allowDefaultModeFallback?: boolean
  allowTemplateFallback?: boolean
}) {
  return availableViews.value.map((view) => resolvePreviewImageEntry(view, options))
}

function resolvePreviewDialogDisplayEntry(view: string, size: string): UnifiedPreviewImageEntry {
  const entry = resolvePreviewImageEntry(view, {
    color: activePreviewDialogColor.value,
    size,
    mode: openPreviewMode.value,
    allowDefaultModeFallback: openPreviewMode.value !== "artwork",
    allowTemplateFallback: true,
  })
  if (entry.status !== "stale" && entry.status !== "rendering") {
    return entry
  }
  const fallbackUrl = resolveTemplatePreviewFallback(entry.color, entry.view)
  if (!fallbackUrl || fallbackUrl === entry.url) {
    return entry
  }
  return {
    ...entry,
    url: fallbackUrl,
    loadKey: `${entry.cacheKey}::${fallbackUrl}`,
  }
}

function resolveMainPreviewImage(options?: {
  draft?: { draftId?: string; preferencesJson?: string } | null
  size?: string
  mode?: PreviewSourceMode
  allowDefaultModeFallback?: boolean
  allowTemplateFallback?: boolean
}) {
  const selection = resolveMainPreviewSelection(options?.draft)
  if (!selection.view) return ""
  const entry = resolvePreviewImageEntry(selection.view, {
    color: selection.color,
    size: options?.size,
    mode: options?.mode,
    allowDefaultModeFallback: options?.allowDefaultModeFallback,
    allowTemplateFallback: options?.allowTemplateFallback,
  })
  return entry.url
}

const currentPreviewEntry = computed(() => resolvePreviewImageEntry(selectedView.value || availableViews.value[0] || "", {
  color: selectedColor.value || editorPayload.value?.default_color || availableColors.value[0] || "",
  size: previewSize.value,
  mode: activePreviewMode(),
  allowDefaultModeFallback: activePreviewMode() !== "artwork",
  allowTemplateFallback: shouldUseDefaultPreviewFallback.value,
}))
const currentPreviewCacheKey = computed(() => currentPreviewEntry.value.cacheKey)
const currentPreviewRequestState = computed(() => resolvePreviewRequestState(
  selectedColor.value || editorPayload.value?.default_color || availableColors.value[0] || "",
  selectedView.value || availableViews.value[0] || "",
  previewSize.value,
  activePreviewMode(),
  activePreviewMode() !== "artwork",
))
const activePreviewDialogColor = computed(() => (
  previewDialogColor.value || selectedColor.value || editorPayload.value?.default_color || availableColors.value[0] || ""
))
const activePreviewDialogView = computed(() => (
  previewDialogView.value || selectedView.value || availableViews.value[0] || ""
))
const currentPreviewImage = computed(() => {
  const mode = activePreviewMode()
  // 优先使用 previewOutputs 缓存中的最新合成图；只在“没有任何缓存图”时回退到模板原图。
  // 这样在用户编辑画布触发重新渲染期间，右上角始终显示上一次有效的合成图，
  // 而不是闪回模版自带图片造成“非最新效果”的错觉。
  const cachedUrl = resolvePreviewImageEntry(selectedView.value || availableViews.value[0] || "", {
    color: selectedColor.value || editorPayload.value?.default_color || availableColors.value[0] || "",
    size: previewSize.value,
    mode,
    allowDefaultModeFallback: mode !== "artwork",
    allowTemplateFallback: false,
  }).url
  if (cachedUrl) return cachedUrl
  // 0.4.58: 关闭页面再进入(reload)后,previewOutputs 缓存为空,
  // 此时若当前 selectedView/Color 仍指向用户持久化的"主图",优先使用
  // draftPreviewImageMap[activeDraftId] 中已落库的主图渲染 URL,
  // 让右上角大图与 Designs 卡片缩略图保持一致。
  // 一旦用户主动切换 view/color,selectedViewIsDraftMainImage 变为 false,
  // 就会自然回退到下面的合成图/模板图分支,不会"卡住"在主图上。
  if (selectedViewIsDraftMainImage.value && activeDraftId.value) {
    const persistedMainPreview = draftPreviewImageMap.value[activeDraftId.value]
    if (persistedMainPreview) return persistedMainPreview
  }
  if ((currentPreviewRequestState.value === "stale" || currentPreviewRequestState.value === "rendering") && displayPreviewImage.value) {
    return displayPreviewImage.value
  }
  return currentPreviewEntry.value.url
})
const isPreviewImageLoading = computed(() => Boolean(currentPreviewImage.value) && displayPreviewImage.value !== currentPreviewImage.value)
const openPreviewMode = computed<PreviewSourceMode>(() => activePreviewMode())
const openPreviewSizeLabel = computed(() => formatOutputSizeValue(OPEN_PREVIEW_SIZE) || OPEN_PREVIEW_SIZE.replace("x", "×"))
const artworkTabCounts = computed(() => countPreviewArtworkEntriesByTab({
  platform: platformArtworkTotal.value,
  tenant: tenantArtworkTotal.value,
  licensed: filteredLicensedArtworkEntries.value.length,
  owned: filteredOwnedArtworkEntries.value.length,
}))
function resolveArtworkLibraryTabLabel(tab: ArtworkLibraryTabKey) {
  const label = tab === "platform"
    ? t("platform")
    : tab === "tenant"
      ? t("shared")
      : tab === "licensed"
        ? t("licensed")
        : t("personal")
  return `${label} (${artworkTabCounts.value[tab] || 0})`
}
function resolveReplaceArtworkLibraryTabLabel(tab: ArtworkReplacementLibraryScope) {
  const label = t(resolveReplaceArtworkLibraryLabelKey(tab))
  return `${label} (${artworkTabCounts.value[tab] || 0})`
}
const replaceArtworkLibraryTabs = computed(() => ([
  { key: "platform" as const, label: resolveReplaceArtworkLibraryTabLabel("platform") },
  { key: "tenant" as const, label: resolveReplaceArtworkLibraryTabLabel("tenant") },
  { key: "licensed" as const, label: resolveReplaceArtworkLibraryTabLabel("licensed") },
  { key: "owned" as const, label: resolveReplaceArtworkLibraryTabLabel("owned") },
]))
const previewDialogEntries = computed(() => (
  availableViews.value.map((view) => resolvePreviewDialogDisplayEntry(view, OPEN_PREVIEW_THUMB_SIZE))
))
const previewDialogPersistEntries = computed(() => resolvePreviewImageEntries({
  color: activePreviewDialogColor.value,
  size: OPEN_PREVIEW_SIZE,
  mode: openPreviewMode.value,
  allowDefaultModeFallback: openPreviewMode.value !== "artwork",
  allowTemplateFallback: true,
}))
const hasViewPreviewEntries = computed(() => (
  Boolean(activePreviewDialogEntry.value?.url) || previewDialogEntries.value.some((entry) => Boolean(entry.url))
))
const isPreviewDialogLoading = computed(() => {
  if (!viewPreviewModalOpen.value) return false
  const activeEntry = activePreviewDialogEntry.value
  if (!activeEntry) return false
  return activeEntry.status === "rendering"
})
const activePreviewDialogEntry = computed(() => {
  const view = activePreviewDialogView.value || previewDialogEntries.value[0]?.view || availableViews.value[0] || ""
  if (!view) return null
  return resolvePreviewDialogDisplayEntry(view, OPEN_PREVIEW_SIZE)
})
const activePreviewDialogKey = computed(() => activePreviewDialogEntry.value?.cacheKey || "")
const activePreviewDialogLoadKey = computed(() => activePreviewDialogEntry.value?.loadKey || "")
const previewDialogImage = computed(() => activePreviewDialogEntry.value?.url || "")
const isActivePreviewDialogLoading = computed(() => {
  if (!viewPreviewModalOpen.value) return false
  if (activePreviewDialogLoadKey.value && previewDialogFailedEntries.value.has(activePreviewDialogLoadKey.value)) return false
  return isPreviewDialogLoading.value
})
const previewResultsSelectionEntries = computed(() => previewDialogEntries.value.map((entry) => {
  const resultEntry = resolvePreviewResultEntry(entry.view)
  const exists = resultEntry ? hasExistingRenderOutput(resultEntry) : false
  const selectable = Boolean(resultEntry) && !exists
  let statusText = selectable ? t("previewResultsReady") : t("previewResultsUnavailable")
  if (exists) {
    statusText = t("previewResultsAlreadyAdded")
  } else if (entry.view === activePreviewDialogView.value && selectable) {
    statusText = t("previewResultsCurrentView")
  }
  return {
    ...entry,
    selectable,
    statusText,
  }
}))
const canSetSelectedPreviewAsDraftMainImage = computed(() => Boolean(resolveCurrentSessionDraftId() && selectedView.value))
const canSetActivePreviewAsDraftMainImage = computed(() => Boolean(resolveCurrentSessionDraftId() && activePreviewDialogView.value))
const selectedViewIsDraftMainImage = computed(() => {
  if (!selectedView.value) return false
  const currentSessionDraft = resolveCurrentSessionDraftRecord()
  const targetView = mainPreviewView.value || resolveDraftMainPreviewView(currentSessionDraft)
  if (selectedView.value !== targetView) return false
  const targetColor = mainPreviewColor.value || resolveDraftMainPreviewColor(currentSessionDraft)
  if (!targetColor) return true
  return selectedColor.value === targetColor
})
const activePreviewDialogIsDraftMainImage = computed(() => {
  const view = activePreviewDialogView.value
  if (!view) return false
  const currentSessionDraft = resolveCurrentSessionDraftRecord()
  const targetView = mainPreviewView.value || resolveDraftMainPreviewView(currentSessionDraft)
  if (view !== targetView) return false
  const targetColor = mainPreviewColor.value || resolveDraftMainPreviewColor(currentSessionDraft)
  if (!targetColor) return true
  return activePreviewDialogColor.value === targetColor
})
const canOpenPreviewResultsSelection = computed(() => previewResultsSelectionEntries.value.length > 0)
const canConfirmPreviewResultsSelection = computed(() => (
  !isAddingPreviewResults.value
  && (
  selectedPreviewResultViews.value.some((view) => (
    previewResultsSelectionEntries.value.some((entry) => entry.view === view && entry.selectable)
  ))
  )
))
const duplicateLayerCountHint = computed(() => formatPreviewMessage("duplicateLayerCountHint", {
  target: t(duplicateLayerCountTarget.value?.layerKind === "text" ? "duplicateLayerCountTextTarget" : "duplicateLayerCountImageTarget"),
}))
const canConfirmDuplicateLayerCount = computed(() => {
  const count = Number(duplicateLayerCountDraft.value || "")
  return Boolean(
    duplicateLayerCountTarget.value
    && Number.isFinite(count)
    && count > 0
    && count <= 50
    && !isApplyingDuplicateLayerCount.value,
  )
})
const replaceArtworkScopeText = computed(() => {
  if (pendingImageReplaceAction.value === "replace-name-part") return t("replacePictureScopeSameNamePart")
  if (pendingImageReplaceAction.value === "replace-name-all") return t("replacePictureScopeSameNameAll")
  return t("replacePictureScopeCurrent")
})
const replaceArtworkConfirmLabel = computed(() => {
  if (pendingImageReplaceAction.value === "replace-name-part") return t("replaceSameNamePart")
  if (pendingImageReplaceAction.value === "replace-name-all") return t("replaceSameNameAll")
  return t("replaceCurrentLayer")
})
const replaceArtworkTargetText = computed(() => {
  const target = pendingImageReplaceTarget.value
  if (!target) return ""
  const currentState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  const targetPart = currentState?.parts.find((entry) => entry.partKey === target.partKey)
  const targetLayer = targetPart?.layers.find((layer) => String(layer.id || "") === target.layerId)
  const partMeta = editorPayload.value?.parts.find((part) => part.part_name === target.partKey)
  const partLabel = resolvePartDisplayName(partMeta || { part_name: target.partKey })
  const layerLabel = resolveDisplayName(String(targetLayer?.name || "").trim(), target.layerId)
  return [partLabel, layerLabel].filter(Boolean).join(" · ")
})
const selectedReplaceArtworkEntry = computed<ArtworkCatalogEntry | null>(() => {
  const selectedId = replaceArtworkSelectionId.value
  if (!selectedId) return null
  if (artworkLibraryTab.value === "owned") {
    return ownedArtworkEntries.value.find((entry) => entry.artwork_id === selectedId) || null
  }
  if (artworkLibraryTab.value === "licensed") {
    return licensedArtworkEntries.value.find((entry) => entry.artwork_id === selectedId) || null
  }
  return currentArtworkEntries.value.find((entry) => entry.artwork_id === selectedId) || null
})
const canConfirmReplaceArtwork = computed(() => {
  if (isApplyingArtworkReplacement.value || !pendingImageReplaceAction.value || !pendingImageReplaceTarget.value) return false
  const entry = selectedReplaceArtworkEntry.value
  if (!entry) return false
  if (artworkLibraryTab.value === "owned") return true
  return resolveArtworkTileAction(entry) === "use"
})
const previewSizeHint = computed(() => formatOutputSizeHelper(previewSize.value, isOriginalOutputSize(previewSize.value)))
const batchSizeHint = computed(() => {
  const customSize = normalizeOutputSize(batchCustomSizeDraft.value)
  if (customSize) {
    return `${formatOutputSizeChipLabel(customSize)} · ${formatOutputSizeHelper(customSize, isOriginalOutputSize(customSize))}`
  }
  return t("customSizeTokenHint")
})
const defaultDraftPreviewImage = computed(() => {
  const fallbackView = selectedView.value || availableViews.value[0] || ""
  const templatePreview = fallbackView
    ? resolveRuntimeAssetUrl(editorPayload.value?.preview_map?.[`${selectedColor.value}::${fallbackView}`] || "")
    : ""
  return templatePreview || displayPreviewImage.value || currentPreviewImage.value || ""
})

function resolveDraftMainPreviewView(record: {
  draftId?: string
  preferencesJson?: string
} | null | undefined) {
  const availableDraftViews = editorPayload.value?.views || []
  const draftId = String(record?.draftId || "").trim()
  const overrideView = draftId ? String(draftMainPreviewViewOverrides.value[draftId] || "").trim() : ""
  if (overrideView && availableDraftViews.includes(overrideView)) {
    return overrideView
  }
  const parsedPreferences = parseJsonValue<Record<string, unknown>>(record?.preferencesJson || "", {})
  const persistedView = String(parsedPreferences.mainPreviewView ?? parsedPreferences.main_preview_view ?? "").trim()
  const persistedSelectedView = String(parsedPreferences.selectedView ?? parsedPreferences.selected_view ?? "").trim()
  // 0.4.69: 用户上次浏览的是 selectedView。若历史 preferences 把 mainPreviewView
  // 错误地写成 views[0](buildDraftPreferencesPayload 旧版的脏数据),且与 selectedView 不一致,
  // 说明这是脏数据,优先 selectedView,避免 cart 主图被锁死成第一个视角。
  if (persistedSelectedView && availableDraftViews.includes(persistedSelectedView)) {
    if (!persistedView || persistedView === availableDraftViews[0]) {
      if (persistedSelectedView !== persistedView) {
        return persistedSelectedView
      }
    }
  }
  if (persistedView && availableDraftViews.includes(persistedView)) {
    return persistedView
  }
  if (persistedSelectedView && availableDraftViews.includes(persistedSelectedView)) {
    return persistedSelectedView
  }
  return availableDraftViews[0] || ""
}

function resolveDraftMainPreviewColor(record: {
  draftId?: string
  preferencesJson?: string
} | null | undefined) {
  const availableDraftColors = editorPayload.value?.colors || []
  const draftId = String(record?.draftId || "").trim()
  const overrideColor = draftId ? String(draftMainPreviewColorOverrides.value[draftId] || "").trim() : ""
  if (overrideColor && availableDraftColors.includes(overrideColor)) {
    return overrideColor
  }
  const parsedPreferences = parseJsonValue<Record<string, unknown>>(record?.preferencesJson || "", {})
  const persistedColor = String(
    parsedPreferences.mainPreviewColor
      ?? parsedPreferences.main_preview_color
      ?? parsedPreferences.selectedColor
      ?? parsedPreferences.selected_color
      ?? "",
  ).trim()
  if (persistedColor && availableDraftColors.includes(persistedColor)) {
    return persistedColor
  }
  return editorPayload.value?.default_color || availableDraftColors[0] || ""
}

function resolveActiveDraftMainPreviewView() {
  const activeRecord = draftRecords.value.find((draft) => draft.draftId === activeDraftId.value) || null
  return resolveDraftMainPreviewView(activeRecord)
}

function resolveActiveDraftMainPreviewColor() {
  const activeRecord = draftRecords.value.find((draft) => draft.draftId === activeDraftId.value) || null
  return resolveDraftMainPreviewColor(activeRecord)
}

function isPreviewDialogMainView(view: string) {
  if (!view) return false
  const currentSessionDraft = resolveCurrentSessionDraftRecord()
  const targetView = mainPreviewView.value || resolveDraftMainPreviewView(currentSessionDraft)
  if (view !== targetView) return false
  const targetColor = mainPreviewColor.value || resolveDraftMainPreviewColor(currentSessionDraft)
  if (!targetColor) return true
  return activePreviewDialogColor.value === targetColor
}

const draftFinishedProductCodeMap = computed(() => resolvePreviewDraftFinishedProductCodeMap({
  templateCode: currentTemplateNumber.value,
  templateId: selectedTemplateId.value,
  records: draftRecords.value.map((draft) => ({
    draftId: draft.draftId,
    finishedProductCode: draft.finishedProductCode,
    preferencesJson: draft.preferencesJson,
  })),
}))
type DraftPanelEntry = typeof draftRecords.value[number] & {
  isActive: boolean
  isBlank?: boolean
  previewUrl: string
  previewViewLabel: string
  finishedProductCodeLabel: string
}

function resolveDraftPanelPreviewDefaults(draft: typeof draftRecords.value[number]) {
  const defaults = resolvePreviewDraftRuntimeSelection(draft.preferencesJson, {
    selectedColor: editorPayload.value?.default_color || editorPayload.value?.colors?.[0] || "",
    selectedView: editorPayload.value?.views?.[0] || "",
    selectedSize: PREVIEW_SIZE,
  })
  const draftView = resolveDraftMainPreviewView(draft) || defaults.selectedView
  const draftColor = resolveDraftMainPreviewColor(draft) || defaults.selectedColor
  const previewViewLabel = draftView || t("drafts")
  const templatePreview = draftView
    ? resolveRuntimeAssetUrl(editorPayload.value?.preview_map?.[`${draftColor}::${draftView}`] || "")
    : ""
  // 防御历史 DB / localStorage 数据：cachedPreview 可能为 ".../render/file?path=undefined" 死链，
  // 这里如果是死链(比如 path=undefined)我们依旧要过滤，但如果是当前 session 刚写入的临时 job URL，
  // 我们应该允许在内存 UI 级别展示，以便 "Set as Main Image" 能够立刻更新 Designs 卡片的缩略图。
  const cachedPreview = draftPreviewImageMap.value[draft.draftId] || ""
  const isInvalidDeadLink = /[?&]path=(undefined|null|)\b/i.test(cachedPreview)
  const usableCachedPreview = isInvalidDeadLink ? "" : cachedPreview
  
  let activeSessionPreview = ""
  const currentSessionDraftId = resolveCurrentSessionDraftId()
  if (draft.draftId === currentSessionDraftId) {
    activeSessionPreview = resolveMainPreviewImage({
      draft,
      size: previewSize.value,
      mode: activePreviewMode(),
      allowDefaultModeFallback: activePreviewMode() !== "artwork",
      allowTemplateFallback: shouldUseDefaultPreviewFallback.value,
    }) || currentPreviewImage.value || displayPreviewImage.value || ""
    if (/[?&]path=(undefined|null|)\b/i.test(activeSessionPreview)) {
      activeSessionPreview = ""
    }
  }

  return {
    previewUrl: activeSessionPreview || usableCachedPreview || templatePreview || "",
    previewViewLabel,
  }
}

function resolveDraftFinishedProductCodeLabel(record: {
  draftId?: string
  finishedProductCode?: string
  preferencesJson?: string
} | null | undefined) {
  const draftId = String(record?.draftId || "").trim()
  if (draftId && draftFinishedProductCodeMap.value[draftId]) {
    return draftFinishedProductCodeMap.value[draftId]
  }
  return resolveDraftFinishedProductCode(record)
}

const draftPanelEntries = computed<DraftPanelEntry[]>(() => draftRecords.value.map((draft) => {
  const isActive = draft.draftId === activeDraftId.value
  const draftPreviewDefaults = resolveDraftPanelPreviewDefaults(draft)
  const finishedProductCodeLabel = resolveDraftFinishedProductCodeLabel(draft) || "--"
  return {
    ...draft,
    isActive,
    previewUrl: draftPreviewDefaults.previewUrl,
    previewViewLabel: draftPreviewDefaults.previewViewLabel,
    finishedProductCodeLabel,
  }
}))
const activePreviewDialogImageStyle = computed(() => {
  const naturalSize = previewImageNaturalSizes.value[activePreviewDialogLoadKey.value]
  if (!naturalSize) return {}
  const isPortrait = naturalSize.height > naturalSize.width * 1.1
  const isPanorama = naturalSize.width > naturalSize.height * 1.8
  const maxWidth = isPortrait ? 560 : (isPanorama ? 1100 : 920)
  const maxHeight = isPortrait ? 820 : 680
  const scale = Math.min(1, maxWidth / naturalSize.width, maxHeight / naturalSize.height)
  return {
    width: `${Math.max(1, Math.round(naturalSize.width * scale))}px`,
    height: `${Math.max(1, Math.round(naturalSize.height * scale))}px`,
  }
})
const hasActiveLayer = computed(() => Boolean(activeLayerId.value))
const canEditImage = computed(() => activeLayerKind.value === "image" && hasActiveLayer.value)
const canEditText = computed(() => activeLayerKind.value === "text" && hasActiveLayer.value)
const canEditSvg = computed(() => Boolean(canEditImage.value && activeImageMetrics.value?.isSvg))
const layerSizeMeasurement = computed(() => {
  if (layerSizeModalMode.value === "image") return activeImageMetrics.value?.imageBoxDisplay || null
  if (layerSizeModalMode.value === "text") return activeTextMetrics.value?.textContent?.display || null
  return null
})
const layerSizeDraftKey = computed<SizeDraftKey>(() => (
  layerSizeModalMode.value === "image" ? "image" : "textContent"
))
const layerSizeDraftWidth = computed(() => (
  layerSizeModalMode.value === "image"
    ? draftNumberValue(imageSizeDraft.value.width)
    : draftNumberValue(textContentSizeDraft.value.width)
))
const layerSizeDraftHeight = computed(() => (
  layerSizeModalMode.value === "image"
    ? draftNumberValue(imageSizeDraft.value.height)
    : draftNumberValue(textContentSizeDraft.value.height)
))
const layerSizeUnit = computed(() => layerSizeMeasurement.value?.unit || "")
const layerSizeModalTitle = computed(() => (
  layerSizeModalMode.value === "text"
    ? t("editTextSizeDialogTitle")
    : t("editImageSizeDialogTitle")
))
const layerSizeModalHint = computed(() => (
  layerSizeModalMode.value === "text"
    ? t("editTextSizeDialogHint")
    : t("editImageSizeDialogHint")
))
const canConfirmLayerSize = computed(() => (
  layerSizeModalOpen.value
  && !isApplyingLayerSize.value
  && Boolean(layerSizeMeasurement.value)
))
const selectedSvgLayer = computed(() => {
  const layers = activeImageMetrics.value?.svgLayers || []
  if (!layers.length) return null
  return layers.find((item) => item.id === selectedSvgLayerId.value) || layers[0] || null
})
const previewSource = computed(() => String(route.query.source || "repository").trim().toLowerCase())
watch(() => activeImageMetrics.value?.imageBoxDisplay, (measurement) => {
  if (activeSizeDraftKey.value === "image") return
  syncSizeDraft(imageSizeDraft, measurement || null)
}, { immediate: true, deep: true })
watch(() => activeImageMetrics.value, (state) => {
  const layers = state?.svgLayers || []
  const preferredLayerId = layers.find((item) => item.id === selectedSvgLayerId.value)?.id
    || state?.activeSvgLayerId
    || layers[0]?.id
    || ""
  selectedSvgLayerId.value = preferredLayerId
  svgFillColor.value = layers.find((item) => item.id === preferredLayerId)?.currentFill || String(state?.svgFill || "#111827")
  if (!state?.isSvg && activeSidebarTab.value === "svg") {
    activeSidebarTab.value = "layers"
  }
}, { immediate: true, deep: true })
watch(selectedSvgLayer, (layer) => {
  if (!layer) return
  svgFillColor.value = layer.currentFill
}, { immediate: true, deep: true })

watch(() => activeTextMetrics.value?.textboxDisplay, (measurement) => {
  if (activeSizeDraftKey.value === "textbox") return
  syncSizeDraft(textboxSizeDraft, measurement || null)
}, { immediate: true, deep: true })

watch(() => activeTextMetrics.value?.textContent?.display, (measurement) => {
  if (activeSizeDraftKey.value === "textContent") return
  syncSizeDraft(textContentSizeDraft, measurement || null)
}, { immediate: true, deep: true })

watch(editorPayload, (value) => {
  const nextUnit = value?.physical_dimensions_cm?.default_unit
  selectedDisplayUnit.value = nextUnit === "mm" || nextUnit === "in" ? nextUnit : "cm"
}, { immediate: true })
const storefrontSlug = computed(() => String(route.query.storefront_slug || route.query.store_slug || "").trim())
const storefrontAdminContext = computed(() => readAdminTenantContext(route.query))
const previewTemplateScopeConfig = computed(() => resolvePreviewTemplateScopeConfig({
  role: (authRole.value || "guest") as PreviewAuthRole,
  source: previewSource.value,
  hasStorefrontContext: Boolean(storefrontSlug.value),
}))
const visibleTemplateScopes = computed(() => previewTemplateScopeConfig.value.visibleScopes)
templateLibraryScope.value = resolveInitialPreviewTemplateScope({
  role: (authRole.value || "guest") as PreviewAuthRole,
  source: previewSource.value,
  hasStorefrontContext: Boolean(storefrontSlug.value),
})
const hasPhysicalDimensions = computed(() => {
  const dimensions = editorPayload.value?.physical_dimensions_cm as unknown as PhysicalDimensionsValue | undefined
  if (!dimensions) return false
  if (selectedPartKey.value) {
    return Boolean(resolveCurrentPhysicalDimension(dimensions, selectedPartKey.value))
  }
  return Boolean(resolveCurrentPhysicalDimension(dimensions))
})
const tenantWorkspaceTemplates = computed(() => (
  items.value.filter((item) => !currentTenantId.value || item.owner_tenant_id === currentTenantId.value)
))
const repositoryTemplateScopeCounts = computed(() => (
  countRepositoryPreviewTemplatesByScope(tenantWorkspaceTemplates.value)
))
const sharedTemplateOptions = computed(() => (
  filterRepositoryPreviewSharedTemplates(tenantWorkspaceTemplates.value).map((item: TemplateSummary) => ({
    ...item,
    source: "shared" as const,
  }))
))
const draftTemplateOptions = computed(() => (
  filterRepositoryPreviewDraftTemplates(tenantWorkspaceTemplates.value).map((item: TemplateSummary) => ({
    ...item,
    source: "draft" as const,
  }))
))
const platformTemplateOptions = computed(() => publicTemplates.value)
const storefrontPublicTemplates = computed<TemplateCatalogEntry[]>(() => {
  const templates = Array.isArray(storefrontContext.value?.templates) ? storefrontContext.value.templates : []
  return templates.map((item) => normalizeTemplateSummary({
    listing_id: item.listing_id,
    template_id: item.template_id,
    template_code: item.template_code,
    display_name: item.title,
    description: item.description,
    category_id: item.category_id,
    category_path: item.category_path,
    access_scope: item.access_scope,
    tenant_api_status: item.tenant_api_status,
    cover_url: item.cover_url,
    creator_name: item.creator_name,
    listed_at: item.listed_at,
    publish_status: "published",
  }, "storefront"))
})
const reviewTemplateOptions = computed<TemplateCatalogEntry[]>(() => (
  filterRepositoryPreviewReviewTemplates(reviewSubmissions.value as TemplateSubmissionItem[])
    .map((item: TemplateSubmissionItem) => {
      const governanceMatch = tenantWorkspaceTemplates.value.find((entry) => entry.template_id === item.template_id)
        || items.value.find((entry) => entry.template_id === item.template_id)
      return normalizeTemplateSummary({
        ...governanceMatch,
        ...item,
        template_id: item.template_id,
        display_name: item.title || governanceMatch?.display_name || item.template_id,
        owner_tenant_id: governanceMatch?.owner_tenant_id || item.tenant_id,
        template_code: governanceMatch?.template_code,
        description: item.description || governanceMatch?.description,
        category_id: item.category_id || governanceMatch?.category_id,
        category_path: item.category_path || governanceMatch?.category_path,
        publish_status: governanceMatch?.publish_status || "draft",
        template_size: governanceMatch?.template_size || "",
        cover_url: item.cover_url || governanceMatch?.cover_url || "",
        created_at: governanceMatch?.created_at || item.created_at,
        updated_at: item.updated_at || governanceMatch?.updated_at || item.created_at,
        colors: governanceMatch?.colors || [],
        parts_count: governanceMatch?.parts_count || 0,
        views_count: governanceMatch?.views_count || 0,
        status: item.status,
        runtime_key: governanceMatch?.runtime_key,
        governance_id: governanceMatch?.governance_id,
      }, "review")
    })
))
const templateCatalogEntries = computed<TemplatePreviewEntry[]>(() => createTemplatePreviewCatalog([
  ...sharedTemplateOptions.value.map((template) => ({ scope: "shared" as const, template })),
  ...draftTemplateOptions.value.map((template) => ({ scope: "draft" as const, template })),
  ...platformTemplateOptions.value.map((template) => ({ scope: "platform" as const, template })),
  ...storefrontPublicTemplates.value.map((template) => ({ scope: "storefront" as const, template })),
  ...reviewTemplateOptions.value.map((template) => ({ scope: "review" as const, template })),
]))
const templateEntriesByScope = computed(() => ({
  platform: listTemplatePreviewEntriesForScope(templateCatalogEntries.value, "platform"),
  shared: listTemplatePreviewEntriesForScope(templateCatalogEntries.value, "shared"),
  draft: listTemplatePreviewEntriesForScope(templateCatalogEntries.value, "draft"),
  storefront: listTemplatePreviewEntriesForScope(templateCatalogEntries.value, "storefront"),
  review: listTemplatePreviewEntriesForScope(templateCatalogEntries.value, "review"),
}))
const filteredTemplateEntriesByScope = computed(() => ({
  platform: filterTemplateEntries(
    templateEntriesByScope.value.platform.filter((item) => !isUnavailableTemplate(item)),
    templateSearchState.value.platform,
    templateCategoryState.value.platform,
    buildCategoryIdSet(templateCategoryState.value.platform, templateCategories.value),
  ),
  shared: filterTemplateEntries(
    templateEntriesByScope.value.shared.filter((item) => !isUnavailableTemplate(item)),
    templateSearchState.value.shared,
    templateCategoryState.value.shared,
    buildCategoryIdSet(templateCategoryState.value.shared, templateCategories.value),
  ),
  draft: filterTemplateEntries(
    templateEntriesByScope.value.draft.filter((item) => !isUnavailableTemplate(item)),
    templateSearchState.value.draft,
    templateCategoryState.value.draft,
    buildCategoryIdSet(templateCategoryState.value.draft, templateCategories.value),
  ),
  storefront: filterTemplateEntries(
    templateEntriesByScope.value.storefront.filter((item) => !isUnavailableTemplate(item)),
    templateSearchState.value.storefront,
    templateCategoryState.value.storefront,
    buildCategoryIdSet(templateCategoryState.value.storefront, templateCategories.value),
  ),
  review: filterTemplateEntries(
    templateEntriesByScope.value.review.filter((item) => !isUnavailableTemplate(item)),
    templateSearchState.value.review,
    templateCategoryState.value.review,
    buildCategoryIdSet(templateCategoryState.value.review, templateCategories.value),
  ),
}))
const visibleTemplateEntries = computed(() => (
  filteredTemplateEntriesByScope.value[templateLibraryScope.value] || []
))
const templateTotalPages = computed(() => resolvePageCount(visibleTemplateEntries.value.length, TEMPLATE_PAGE_SIZE))
const templatePage = computed(() => templatePageState.value[templateLibraryScope.value] || 1)
const pagedTemplateEntries = computed(() => paginateItems(visibleTemplateEntries.value, templatePage.value, TEMPLATE_PAGE_SIZE))
const normalizedPlatformArtworkEntries = computed<ArtworkCatalogEntry[]>(() => (
  (platformArtworkItems.value as ArtworkCatalogEntry[]).map((item) => normalizeArtworkEntryUrls({
    ...item,
    access_scope: item.access_scope === "private" ? "private" : "public",
    visibility_status: item.visibility_status,
  }))
))
const normalizedTenantArtworkEntries = computed<ArtworkCatalogEntry[]>(() => (
  (tenantArtworkItems.value as ArtworkCatalogEntry[]).map((item) => normalizeArtworkEntryUrls({
    ...item,
    access_scope: item.access_scope,
    visibility_status: item.visibility_status,
  }))
))
const ownedArtworkEntries = computed<ArtworkCatalogEntry[]>(() => ownedArtworkLibrary.value.map((item) => ({
  artwork_id: item.id,
  artwork_code: deriveLocalArtworkCode(item.id),
  library_scope: "upload",
  access_scope: "private",
  visibility_status: "draft",
  name: item.name,
  mime_type: "image/*",
  file_ext: item.name.split(".").pop()?.toLowerCase() || "",
  preview_url: item.previewSrc || item.src,
  original_url: item.src,
  status: "active",
  created_at: item.createdAt,
  updated_at: item.createdAt,
})))
const licensedArtworkEntries = computed<ArtworkCatalogEntry[]>(() => (
  licensedArtworkRecords.value.map((item: ArtworkLicenseRecord) => ({
    artwork_id: item.artwork_id,
    artwork_code: item.artwork_code,
    library_scope: "licensed",
    access_scope: "private",
    visibility_status: "listed",
    name: item.name || item.artwork_code || item.artwork_id,
    description: item.description,
    mime_type: item.mime_type || "image/*",
    file_ext: item.file_ext || "",
    category_id: item.category_id,
    category_path: item.category_path,
    preview_url: item.preview_url || item.original_url || "",
    original_url: item.original_url || item.preview_url || "",
    creator_name: item.creator_name,
    status: "active",
    created_at: item.purchased_at || item.granted_at,
    updated_at: item.license_updated_at || item.granted_at,
  }))
))
const storefrontTenantArtworkEntries = computed<ArtworkCatalogEntry[]>(() => {
  const entries = Array.isArray(storefrontContext.value?.artworks) ? storefrontContext.value.artworks : []
  return entries.map((item) => normalizeArtworkEntryUrls({
    artwork_id: item.artwork_id,
    artwork_code: item.artwork_code,
    library_scope: "tenant" as const,
    access_scope: item.access_scope === "private" ? "private" : "public",
    visibility_status: item.visibility_status,
    owner_tenant_id: storefrontContext.value?.tenant_id || null,
    source_provider: item.source_provider,
    source_asset_id: item.source_asset_id,
    source_url: item.source_url,
    name: item.name || item.artwork_code || item.artwork_id,
    description: item.description,
    mime_type: item.mime_type || "image/*",
    file_ext: item.file_ext || "",
    category_id: item.category_id,
    category_path: item.category_path,
    preview_url: item.preview_url || item.original_url || "",
    original_url: item.original_url || item.preview_url || "",
    creator_name: item.creator_name,
    license_name: item.license_name,
    license_url: item.license_url,
    attribution_required: item.attribution_required,
    width: item.width,
    height: item.height,
    commerce_type: item.commerce_type,
    price_tokens: item.price_tokens,
    purchased: item.purchased,
    unlocked: item.unlocked,
    can_purchase: item.can_purchase,
    is_platform_owned: item.is_platform_owned,
    status: item.status || "active",
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))
})
const knownArtworkEntries = computed<ArtworkCatalogEntry[]>(() => [
  ...normalizedPlatformArtworkEntries.value,
  ...normalizedTenantArtworkEntries.value,
  ...licensedArtworkEntries.value,
  ...ownedArtworkEntries.value,
])
const artworkCategoryState = computed<PreviewArtworkCategoryState>(() => ({
  platform: platformArtworkCategoryId.value,
  tenant: tenantArtworkCategoryId.value,
  licensed: licensedArtworkCategoryId.value,
  owned: ownedArtworkCategoryId.value,
}))
const artworkCategoryTrees = computed<PreviewArtworkCategoryTrees>(() => ({
  platform: artworkPlatformCategories.value as CategoryNode[],
  tenant: artworkTenantCategories.value as CategoryNode[],
}))
const currentArtworkCategoryId = computed(() => (
  resolveArtworkCategoryIdForTab(artworkLibraryTab.value, artworkCategoryState.value)
))
const currentArtworkCategories = computed(() => (
  resolveArtworkCategoriesForTab(artworkLibraryTab.value, artworkCategoryTrees.value)
))
const currentArtworkSearch = computed(() => (
  artworkLibraryTab.value === "platform"
    ? platformArtworkSearch.value
    : artworkLibraryTab.value === "tenant"
      ? tenantArtworkSearch.value
      : artworkLibraryTab.value === "licensed"
        ? licensedArtworkSearch.value
      : ownedArtworkSearch.value
))
const filteredOwnedArtworkEntries = computed<ArtworkCatalogEntry[]>(() => {
  return filterPreviewArtworkEntries(ownedArtworkEntries.value, {
    keywordInput: ownedArtworkSearch.value,
    selectedCategoryId: ownedArtworkCategoryId.value,
    categoryTree: [],
  }).filter((item) => !hiddenOwnedArtworkIds.value.includes(item.artwork_id))
})
const selectedLicensedArtworkCategoryIdSet = computed(() => buildArtworkCategoryIdSetForTab(
  "licensed",
  artworkCategoryState.value,
  artworkCategoryTrees.value,
))
const filteredLicensedArtworkEntries = computed<ArtworkCatalogEntry[]>(() => {
  return licensedArtworkEntries.value.filter((item) => {
    if (hiddenLicensedArtworkIds.value.includes(item.artwork_id)) {
      return false
    }
    const keyword = normalizePreviewArtworkSearch(licensedArtworkSearch.value)
    const squashedKeyword = squashPreviewArtworkSearch(licensedArtworkSearch.value)
    const keywordMatch = matchesPreviewArtworkSearch(keyword, squashedKeyword, [
      item.name,
      item.artwork_code,
      item.artwork_id,
      item.category_path,
    ])
    const categoryMatch = !selectedLicensedArtworkCategoryIdSet.value
      || (!!item.category_id && selectedLicensedArtworkCategoryIdSet.value.has(item.category_id))
      || (!item.category_id && licensedArtworkCategoryId.value === "all")
    return keywordMatch && categoryMatch
  })
})
const currentArtworkEntries = computed<ArtworkCatalogEntry[]>(() => {
  if (artworkLibraryTab.value === "platform") return normalizedPlatformArtworkEntries.value
  if (artworkLibraryTab.value === "tenant") return normalizedTenantArtworkEntries.value
  if (artworkLibraryTab.value === "licensed") return paginateItems(filteredLicensedArtworkEntries.value, licensedArtworkPage.value, ARTWORK_PAGE_SIZE)
  return paginateItems(filteredOwnedArtworkEntries.value, ownedArtworkPage.value, ARTWORK_PAGE_SIZE)
})
const pendingArtworkPurchaseEntry = computed<ArtworkCatalogEntry | null>(() => (
  knownArtworkEntries.value.find((item) => item.artwork_id === pendingArtworkPurchaseId.value) || null
))
const isPreviewAuthenticated = computed(() => authStore.isAuthenticated)
const ownedArtworkTotalPages = computed(() => resolvePageCount(filteredOwnedArtworkEntries.value.length, ARTWORK_PAGE_SIZE))
const licensedArtworkTotalPages = computed(() => resolvePageCount(filteredLicensedArtworkEntries.value.length, ARTWORK_PAGE_SIZE))
const currentArtworkPage = computed(() => (
  artworkLibraryTab.value === "platform"
    ? platformArtworkPage.value
    : artworkLibraryTab.value === "tenant"
      ? tenantArtworkPage.value
      : artworkLibraryTab.value === "licensed"
        ? licensedArtworkPage.value
        : ownedArtworkPage.value
))
const currentArtworkTotalPages = computed(() => {
  if (artworkLibraryTab.value === "platform") return resolvePageCount(platformArtworkTotal.value || 0, ARTWORK_PAGE_SIZE)
  if (artworkLibraryTab.value === "tenant") return resolvePageCount(tenantArtworkTotal.value || 0, ARTWORK_PAGE_SIZE)
  if (artworkLibraryTab.value === "licensed") return licensedArtworkTotalPages.value
  return ownedArtworkTotalPages.value
})
const currentArtworkTotalCount = computed(() => {
  if (artworkLibraryTab.value === "platform") return Number(platformArtworkTotal.value || currentArtworkEntries.value.length || 0)
  if (artworkLibraryTab.value === "tenant") return Number(tenantArtworkTotal.value || currentArtworkEntries.value.length || 0)
  if (artworkLibraryTab.value === "licensed") return filteredLicensedArtworkEntries.value.length
  return filteredOwnedArtworkEntries.value.length
})
const replaceArtworkResultSummary = computed(() => formatPreviewMessage("replaceArtworkResultsSummary", {
  count: String(currentArtworkTotalCount.value),
  page: String(currentArtworkPage.value),
  total: String(Math.max(currentArtworkTotalPages.value, 1)),
}))
const replaceArtworkCategorySummary = computed(() => {
  const category = currentArtworkCategoryId.value === "all"
    ? t("allArtwork")
    : (findCategoryPath(currentArtworkCategoryId.value, currentArtworkCategories.value as never) || t("uncategorized"))
  return formatPreviewMessage("replaceArtworkCategorySummary", { category })
})
function resolveTemplateScopeForReference(templateReference: string, preferredScopes = previewTemplateScopeConfig.value.fallbackScopes) {
  return resolveTemplatePreviewScope(templateCatalogEntries.value, templateReference, preferredScopes)
}
const currentTemplateScope = computed<PreviewTemplateScope>(() => (
  resolveTemplateScopeForReference(selectedTemplateId.value || resolveTemplateId()) || templateLibraryScope.value
))
const templateLibraryEmptyState = computed(() => {
  const currentScope = templateLibraryScope.value
  const hasFilter = Boolean(templateSearchState.value[currentScope]?.trim()) || templateCategoryState.value[currentScope] !== "all"
  if (hasFilter) return t("noTemplatesMatch")
  if (currentScope === "platform") return t("noPlatformTemplatesAvailable")
  if (currentScope === "draft") return t("noDraftTemplatesAvailable")
  if (currentScope === "storefront") return t("noStorefrontTemplatesAvailable")
  if (currentScope === "review") return t("noReviewTemplatesAvailable")
  return t("noSharedTemplatesYet")
})
const artworkLibraryEmptyState = computed(() => {
  if (currentArtworkLibraryLoading.value) return t("loadingArtworkLibrary")
  const hasFilter = artworkLibraryTab.value === "owned"
    ? Boolean(ownedArtworkSearch.value.trim())
    : currentArtworkCategoryId.value !== "all" || Boolean(currentArtworkSearch.value.trim())
  if (hasFilter) return t("noArtworkMatches")
  if (artworkLibraryTab.value === "platform") return t("noPlatformArtworkAvailable")
  if (artworkLibraryTab.value === "tenant") return t("noTenantArtworkAvailable")
  if (artworkLibraryTab.value === "licensed") return t("noPurchasedArtworkAvailable")
  return t("uploadImageToStartLibrary")
})
const currentArtworkLibraryLoading = computed(() => {
  if (artworkLibraryTab.value === "platform") {
    return platformArtworkLibraryPendingCount.value > 0 || !platformArtworkLibraryHydrated.value
  }
  if (artworkLibraryTab.value === "tenant") {
    return tenantArtworkLibraryPendingCount.value > 0 || !tenantArtworkLibraryHydrated.value
  }
  return false
})
const currentTemplateCategoryId = computed(() => (
  templateCategoryState.value[templateLibraryScope.value]
))
const templateScopeCounts = computed<Record<PreviewTemplateScope, number>>(() => ({
  platform: platformTemplateOptions.value.length,
  shared: repositoryTemplateScopeCounts.value.shared,
  draft: repositoryTemplateScopeCounts.value.draft,
  storefront: storefrontPublicTemplates.value.length,
  review: reviewTemplateOptions.value.length,
}))
function resolveTemplateScopeLabel(scope: PreviewTemplateScope) {
  const label = scope === "platform"
    ? t("platform")
    : scope === "shared"
      ? t("shared")
      : scope === "draft"
        ? t("draft")
        : scope === "storefront"
          ? t("storefront")
          : t("review")
  return `${label} (${templateScopeCounts.value[scope] || 0})`
}
function resolvePartDisplayName(part: { part_name?: string; part_display_name?: string } | null | undefined) {
  return resolveDisplayName(part?.part_display_name || part?.part_name, t("noPartSelected"))
}

const showUserDropdown = ref(false)
type WordPressShellConfig = {
  homeUrl?: string
  siteTitle?: string
  siteLogoUrl?: string
  navItems?: Array<{ label: string; url: string }>
  accountUrl?: string
  loginUrl?: string
  logoutUrl?: string
  isLoggedIn?: boolean
  displayName?: string
  cartUrl?: string
  cartCount?: number
  // 0.4.43: WC AJAX 端点 + nonce — 让 add_to_cart 通过主题安全插件 / Wordfence 拦截
  wcAjaxUrl?: string
  wcAjaxNonce?: string
}
const wordpressShell = computed<WordPressShellConfig | null>(() => {
  if (typeof window === "undefined") return null
  return ((window as typeof window & {
    __MOCKUP100_WORDPRESS_CONTEXT__?: {
      shell?: WordPressShellConfig | null
    }
  }).__MOCKUP100_WORDPRESS_CONTEXT__?.shell) || null
})
const isWordPressShell = computed(() => Boolean(wordpressShell.value))
const wordpressProductNavConfig = computed<WordPressProductNavConfig | null>(() => {
  if (typeof window === "undefined") return null
  return ((window as typeof window & {
    __MOCKUP100_WORDPRESS_CONTEXT__?: {
      product_nav?: WordPressProductNavConfig | null
    }
  }).__MOCKUP100_WORDPRESS_CONTEXT__?.product_nav) || null
})
const currentWordPressProductId = computed(() => {
  const routeProductId = Number(route.query.product_id || 0)
  if (routeProductId > 0) return routeProductId
  const configProductId = Number(wordpressProductNavConfig.value?.currentProductId || 0)
  if (configProductId > 0) return configProductId
  return Number(wordpressCurrentProduct.value?.product_id || 0)
})
const wordpressProductCategoryOptions = computed(() => ([
  { value: "", label: t("allCategories") },
  ...wordpressProductCategories.value.map((category) => ({
    value: category.category_id,
    label: `${category.name} (${category.count || 0})`,
  })),
]))
// 三级级联组件需要的树结构(category_id/name/level/children)
const wordpressProductCategoryTree = computed(() => {
  type Node = { category_id: string; name: string; level: number; count: number; children: Node[] }
  const map = new Map<string, Node>()
  wordpressProductCategories.value.forEach((category) => {
    map.set(category.category_id, {
      category_id: category.category_id,
      name: category.name,
      level: 1,
      count: category.count || 0,
      children: [],
    })
  })
  const roots: Node[] = []
  wordpressProductCategories.value.forEach((category) => {
    const node = map.get(category.category_id)
    if (!node) return
    const parentId = (category.parent_id || "").trim()
    const parent = parentId ? map.get(parentId) : null
    if (parent) {
      parent.children.push(node)
    } else {
      // parent_id 存在但父节点未在数据集中(后端未补全祖先) → 视为孤儿，挂到 roots
      roots.push(node)
    }
  })
  // 通过 DFS 计算 level，避免遍历顺序导致 level 计算错误
  const assignLevel = (node: Node, level: number) => {
    node.level = Math.min(3, level)
    node.children.forEach((child) => assignLevel(child, level + 1))
  }
  roots.forEach((root) => assignLevel(root, 1))
  return roots
})
const wordpressProductTotalPages = computed(() => resolvePageCount(wordpressProductTotal.value, WORDPRESS_PRODUCT_PAGE_SIZE))
const wordpressCurrentProductCategories = computed(() => {
  const names = wordpressCurrentProduct.value?.category_names || []
  // 过滤 Uncategorized + 去重，避免重复或冗余分类标签
  const filtered: string[] = []
  const seen = new Set<string>()
  names.forEach((raw) => {
    const name = String(raw || "").trim()
    if (!name) return
    if (/^uncategorized$/i.test(name)) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    filtered.push(name)
  })
  return filtered.join(" / ")
})
const wordpressCurrentProductAttributes = computed(() => {
  return (wordpressCurrentProduct.value?.attributes || []).filter((attribute) => attribute.options.length > 0)
})
const wordpressCurrentProductGallery = computed(() => {
  const current = wordpressCurrentProduct.value
  if (!current) return []
  // 剔除主图，避免顶部 thumb 与下方 gallery 重复展示
  const mainImage = String(current.image_url || "").trim()
  const values = (current.gallery_images || [])
    .map((item) => String(item || "").trim())
    .filter((item) => item && item !== mainImage)
  return Array.from(new Set(values))
})
// Place Order Modal computed
const placeOrderColorAttribute = computed(() => {
  return wordpressCurrentProductAttributes.value.find(
    (a) => /color|颜色|colour/i.test(a.name),
  ) || null
})
const placeOrderColors = computed(() => {
  if (placeOrderColorAttribute.value) {
    return placeOrderColorAttribute.value.options.map((v) => ({ value: v, label: v }))
  }
  return availableColors.value.map((v) => ({ value: v, label: v }))
})
const placeOrderOtherAttributes = computed(() => {
  const colorName = placeOrderColorAttribute.value?.name
  return wordpressCurrentProductAttributes.value.filter((a) => a.name !== colorName)
})
// Bug 5: 把 size 类属性单独抽出，作为弹窗中的横排下拉框
const placeOrderSizeAttribute = computed(() => {
  return placeOrderOtherAttributes.value.find((a) => /size|尺码|尺寸|码/i.test(a.name)) || null
})
const placeOrderSizeAttributeName = computed(() => placeOrderSizeAttribute.value?.name || "")
const placeOrderSizeOptions = computed<string[]>(() => placeOrderSizeAttribute.value?.options || [])
const placeOrderNonSizeAttributes = computed(() => {
  const sizeName = placeOrderSizeAttribute.value?.name
  if (!sizeName) return placeOrderOtherAttributes.value
  return placeOrderOtherAttributes.value.filter((a) => a.name !== sizeName)
})
const placeOrderQuantityOptions = [1, 2, 3, 4, 5, 10, 20, 50, 100]
const placeOrderViewEntries = computed(() =>
  availableViews.value.map((view) => ({
    view,
    url: resolvePreviewImageForView(view, OPEN_PREVIEW_SIZE, {
      mode: "default",
      color: selectedColor.value,
      allowDefaultModeFallback: true,
      allowTemplateFallback: true,
    }),
    fallback: resolveRuntimeAssetUrl(
      editorPayload.value?.preview_map?.[`${selectedColor.value}::${view}`] || "",
    ),
  })),
)
const placeOrderActiveImage = computed(() => {
  const entry = placeOrderViewEntries.value.find((e) => e.view === placeOrderActiveView.value)
  return entry?.url || entry?.fallback || displayPreviewImage.value
})
// 0.4.43: 弹窗主图 = 当前激活设计稿的最新主图（draftPreviewImageMap[activeDraftId]）;
// 缺省回退到右上角"当前主图" currentPreviewImage,再回退到 color/view 缓存或模板默认图。
const placeOrderHeroImage = computed(() => {
  // 1) 当前激活设计稿持久化的主图（用户在该稿最新一次"设为主图"的结果）
  if (activeDraftId.value) {
    const draftMain = draftPreviewImageMap.value[activeDraftId.value] || ""
    if (draftMain && isPersistentPreviewStorageValue(draftMain)) return draftMain
    if (draftMain) return draftMain
  }
  // 2) 画布右上角的当前主图（包含本次会话最新合成结果）
  if (currentPreviewImage.value) return currentPreviewImage.value
  // 3) 第一行 color/view 对应的缓存合成图
  const firstRow = placeOrderRows.value[0]
  const heroColor = firstRow?.color || selectedColor.value
  const heroView = placeOrderActiveView.value || selectedView.value || availableViews.value[0] || ""
  if (heroColor && heroView) {
    const cached = resolvePreviewImageForView(heroView, previewSize.value, {
      color: heroColor,
      mode: "default",
      allowDefaultModeFallback: true,
      allowTemplateFallback: true,
    })
    if (cached) return cached
    const fallbackMap = resolveRuntimeAssetUrl(
      editorPayload.value?.preview_map?.[`${heroColor}::${heroView}`] || "",
    )
    if (fallbackMap) return fallbackMap
  }
  return placeOrderActiveImage.value || displayPreviewImage.value
})
// 0.4.58: 统一 Text 图层显示名解析逻辑,确保 Place Order / 图层面板取名行为一致
// 优先用户重命名(layer.name) → imageName/fileName/metadata.name → 截断后的 text 内容 → `Text n` 兜底
function resolveTextLayerDisplayName(layer: any, fallbackIndex: number): string {
  const name = String(layer?.name || "").trim()
  if (name) return name
  const imageName = String(layer?.imageName || layer?.fileName || layer?.metadata?.name || "").trim()
  if (imageName) return imageName
  const text = String(layer?.text || "").trim()
  if (text) return text.length > 24 ? text.slice(0, 24) + "…" : text
  return `Text ${fallbackIndex + 1}`
}
const placeOrderTextLayers = computed(() => {
  // 0.4.58: 显式依赖 canvasSignature,确保图层重命名 / 增删后弹窗 label 同步重算
  void canvasSignature.value
  const state = canvasRef.value?.getSerializableState?.()
  if (!state) return [] as Array<{ id: string; partKey: string; partName: string; text: string; name: string; label: string }>
  const list: Array<{ id: string; partKey: string; partName: string; text: string; name: string; label: string }> = []
  let textIdx = 0
  state.parts.forEach((part) => {
    part.layers.forEach((layer) => {
      if (layer.kind === "text") {
        // 0.4.58: 统一通过 helper 解析 Text 名称,确保非空且优先用户重命名值
        const partMeta = editorPayload.value?.parts.find((p) => p.part_name === part.partKey)
        const partName = resolvePartDisplayName(partMeta || { part_name: part.partKey }) || part.partKey
        const textName = resolveTextLayerDisplayName(layer, textIdx)
        const label = `${partName} / ${textName}`
        list.push({ id: layer.id, partKey: part.partKey, partName, text: layer.text, name: textName, label })
        textIdx += 1
      }
    })
  })
  return list
})
const placeOrderUnitPrice = computed(() => {
  const raw = wordpressCurrentProduct.value?.sale_price
    || wordpressCurrentProduct.value?.price
    || wordpressCurrentProduct.value?.regular_price
    || ""
  const num = parseFloat(String(raw).replace(/[^\d.]/g, ""))
  return Number.isFinite(num) ? num : 0
})
const placeOrderTotalQuantity = computed(() =>
  placeOrderRows.value.reduce((sum, r) => sum + Math.max(1, Number(r.quantity) || 1), 0),
)
// 0.4.65: Total 按每行 variation 单价 × qty 求和(不同 size/color 价格不同)
function getRowUnitPriceNumber(row: PlaceOrderRow): number {
  const product = wordpressCurrentProduct.value
  if (!product) return 0
  const variations = product.variations || []
  let raw = ""
  if (variations.length) {
    const colorAttrName = placeOrderColorAttribute.value?.name || ""
    const merged: Record<string, string> = { ...row.attributes }
    if (row.color && colorAttrName) merged[colorAttrName] = row.color
    const { variation } = matchVariationId(merged)
    if (variation) raw = String(variation.price ?? variation.regular_price ?? "")
  }
  if (!raw) {
    raw = String(product.sale_price || product.price || product.regular_price || "")
  }
  const num = parseFloat(String(raw).replace(/[^\d.]/g, ""))
  return Number.isFinite(num) ? num : 0
}
const placeOrderTotalDisplay = computed(() => {
  const total = placeOrderRows.value.reduce((sum, r) => {
    const qty = Math.max(1, Number(r.quantity) || 1)
    return sum + getRowUnitPriceNumber(r) * qty
  }, 0)
  if (!total) return ""
  return total.toFixed(2)
})
// 0.4.43: 弹窗内"图片右侧"显示当前激活设计稿名称,可切换不同设计稿
const placeOrderDraftOptions = computed(() =>
  draftRecords.value.map((d) => ({
    draftId: d.draftId,
    label: d.draftName || DEFAULT_PREVIEW_DRAFT_NAME,
  })),
)
function createPlaceOrderRow(defaults?: { color?: string; size?: string; quantity?: number }): PlaceOrderRow {
  // 0.4.42: 默认填充“当前设计稿 + 当前颜色”;color 在弹窗内可切换
  const colorOption = defaults?.color ?? (selectedColor.value || placeOrderColors.value[0]?.value || "")
  const attrs: Record<string, string> = {}
  placeOrderOtherAttributes.value.forEach((a) => {
    attrs[a.name] = a.options[0] || ""
  })
  // 0.4.42: 默认 size 优先采用页面 selectedSize,其次保留 size 属性首项
  const sizeName = placeOrderSizeAttributeName.value
  if (sizeName) {
    const desiredSize = defaults?.size || selectedSize.value || ""
    if (desiredSize && placeOrderSizeOptions.value.includes(desiredSize)) {
      attrs[sizeName] = desiredSize
    }
  }
  const overrides: Record<string, string> = {}
  placeOrderTextLayers.value.forEach((layer) => {
    overrides[layer.id] = layer.text
  })
  return {
    id: `po-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    color: colorOption,
    attributes: attrs,
    textOverrides: overrides,
    quantity: Math.max(1, Number(defaults?.quantity) || 1),
  }
}
function addPlaceOrderRow() {
  placeOrderRows.value = [...placeOrderRows.value, createPlaceOrderRow()]
}
function removePlaceOrderRow(id: string) {
  if (placeOrderRows.value.length <= 1) return
  placeOrderRows.value = placeOrderRows.value.filter((r) => r.id !== id)
}
const userInitials = computed(() => {
  return authAccount.value?.display_name?.charAt(0)?.toUpperCase()
    || authAccount.value?.email?.charAt(0)?.toUpperCase()
    || "?"
})
const userDisplayName = computed(() => authAccount.value?.display_name || authAccount.value?.email || t("designer"))
const previewDropdownSections = computed(() => {
  const isAdmin = authRole.value === "platform_admin"
  const context = readAdminTenantContext(route.query)
  const withTenantContext = (key: string, path: string) => {
    const tenantScopedKeys = new Set(["billing", "orders-management", "artwork-billing", "artwork-orders", "artworks", "artwork-center", "storefront"])
    if (isAdmin && tenantScopedKeys.has(key) && context.tenantId) {
      return buildAdminTenantRoute(path, context.tenantId, context.tenantLabel)
    }
    return path
  }
  const sections = [
    {
      key: "overview",
      title: t("overview"),
      items: [
        { key: "dashboard", to: "/admin/dashboard", label: t("dashboard"), icon: "📊" },
      ],
    },
    {
      key: "libraries",
      title: t("libraries"),
      items: [
        { key: "repository", to: "/admin/repository", label: t("templateLibrary"), icon: "📚" },
        { key: "artworks", to: withTenantContext("artworks", isAdmin ? "/admin/artworks/platform" : "/admin/artworks/tenant"), label: t("artworkLibrary"), icon: "🖼️" },
      ],
    },
    {
      key: "publishing",
      title: t("publishing"),
      items: [
        { key: "center", to: "/admin/center", label: t("templateCenter"), icon: "🛒" },
        { key: "artwork-center", to: withTenantContext("artwork-center", "/admin/artworks/center"), label: t("artworkCenter"), icon: "🎨" },
      ],
    },
    {
      key: "orders",
      title: t("orders"),
      items: [
        { key: "orders-management", to: withTenantContext("orders-management", "/admin/orders-management"), label: t("orders"), icon: "🧾" },
        { key: "artwork-orders", to: withTenantContext("artwork-orders", "/admin/artwork-orders"), label: t("artworkOrders"), icon: "🛍️" },
      ],
    },
    {
      key: "finance",
      title: t("finance"),
      items: [
        { key: "billing", to: withTenantContext("billing", "/admin/billing"), label: t("tenantBilling"), icon: "💳" },
        { key: "artwork-billing", to: withTenantContext("artwork-billing", "/admin/artwork-billing"), label: t("artworkBilling"), icon: "🖼️" },
        { key: "tokens-management", to: "/admin/tokens-management", label: t("tokens"), icon: "🪙" },
      ],
    },
    {
      key: "storefront",
      title: t("storefront"),
      items: [
        { key: "storefront", to: withTenantContext("storefront", "/admin/storefront"), label: isAdmin ? t("storefrontReview") : t("storefrontStudio"), icon: "🏪" },
      ],
    },
    {
      key: "developer",
      title: t("developer"),
      items: [
        { key: "developer-keys-access", to: "/admin/developer-console/keys-access", label: t("keysAccess"), icon: "🔑" },
        { key: "developer-usage-activity", to: "/admin/developer-console/usage-activity", label: t("usageActivity"), icon: "📈" },
        { key: "developer-docs-flow", to: "/admin/developer-console/docs-flow", label: t("docsFlow"), icon: "🧾" },
      ],
    },
  ]
  if (isAdmin) {
    sections.push({
      key: "administration",
      title: t("administration"),
      items: [
        { key: "categories", to: "/admin/categories", label: t("templateCategories"), icon: "🏷️" },
        { key: "artwork-categories", to: "/admin/artwork-categories", label: t("artworkCategories"), icon: "🖌️" },
        { key: "tenants", to: "/admin/tenants", label: t("tenants"), icon: "👥" },
      ],
    })
  }
  sections.push({
    key: "account",
    title: t("account"),
    items: [
      { key: "settings", to: "/admin/settings", label: t("account"), icon: "⚙️" },
    ],
  })
  return sections
})
const textFontFamilyOptions = TEXT_FONT_FAMILY_OPTIONS
const sidebarTabs = computed<Array<{ key: SidebarTabKey; label: string }>>(() => {
  const tabs: Array<{ key: SidebarTabKey; label: string }> = []
  if (isWordPressShell.value) {
    tabs.push({ key: "products", label: t("products") })
    tabs.push({ key: "product-details", label: t("productDetails") })
  }
  // WordPress 插件场景下隐藏 template 导航项(模板由商品绑定决定,无需手动切换)
  if (!isWordPressShell.value) {
    tabs.push({ key: "template", label: t("template") })
  }
  tabs.push(
    { key: "artwork", label: t("artwork") },
    { key: "text", label: t("text") },
    { key: "layers", label: t("layers") },
    { key: "background", label: t("background") },
  )
  if (canEditSvg.value) {
    tabs.push({ key: "svg", label: "SVG" })
  }
  return tabs
})

function setActiveSidebarTab(tab: SidebarTabKey) {
  activeSidebarTab.value = tab
  manualSidebarTabOverride.value = tab
}
const activeSidebarTitle = computed(() => {
  if (activeSidebarTab.value === "products") return t("products")
  if (activeSidebarTab.value === "product-details") return t("productDetails")
  if (activeSidebarTab.value === "template") return t("template")
  if (activeSidebarTab.value === "artwork") return t("artwork")
  if (activeSidebarTab.value === "text") return t("text")
  if (activeSidebarTab.value === "layers") return t("layers")
  if (activeSidebarTab.value === "svg") return "SVG"
  return t("background")
})
const shortcutsButtonLabel = t("shortcuts")
const previewPageShortcuts = listPreviewShortcuts("page")
const shortcutEntries = computed<ShortcutEntry[]>(() => listVisiblePreviewShortcuts().map((shortcut) => ({
  key: shortcut.id,
  label: tileModeShortcutLabelsById.value[shortcut.id] || localizedShortcutLabelsById.value[shortcut.id] || shortcut.label,
  keys: shortcut.displayKeys,
})))
const activeSidebarBadge = computed(() => {
  if (activeSidebarTab.value === "products") return String(wordpressProductTotal.value || wordpressProductItems.value.length || "")
  if (activeSidebarTab.value === "product-details") return wordpressCurrentProduct.value ? "1" : ""
  if (activeSidebarTab.value === "template") return String(visibleTemplateEntries.value.length || "")
  if (activeSidebarTab.value === "artwork") {
    if (artworkLibraryTab.value === "platform") return String(platformArtworkTotal.value || currentArtworkEntries.value.length || "")
    if (artworkLibraryTab.value === "tenant") return String(tenantArtworkTotal.value || currentArtworkEntries.value.length || "")
    if (artworkLibraryTab.value === "licensed") return String(filteredLicensedArtworkEntries.value.length || "")
    return String(filteredOwnedArtworkEntries.value.length || "")
  }
  if (activeSidebarTab.value === "layers") return String(layerOptions.value.length || "")
  if (activeSidebarTab.value === "text") {
    return String(layerOptions.value.filter((item) => item.kind === "text").length || "")
  }
  return ""
})
const isPublicCenterPreview = computed(() => previewSource.value === "center")
const isAdminCenterPreview = computed(() => (
  previewSource.value === "admin-center"
  || previewSource.value === "admin-center-review"
  || previewSource.value === "admin-artwork-center"
))
const shouldResolvePublishedPreview = computed(() => (
  isPublicCenterPreview.value
  || previewSource.value === "admin-center"
  || isStorefrontPreview.value
))
const isMarketplaceArtworkPreviewSource = computed(() => (
  previewSource.value === "center"
  || previewSource.value === "home"
  || previewSource.value === "admin-center"
  || previewSource.value === "admin-artwork-center"
))
const isStorefrontPreview = computed(() => previewSource.value === "storefront")
const isStorefrontAdminPreview = computed(() => isStorefrontPreview.value && String(route.query.admin_view || "") === "1")
const backLinkTarget = computed(() => {
  if (isPublicCenterPreview.value) return "/admin/center"
  if (isAdminCenterPreview.value) return "/admin/center"
  if (isStorefrontAdminPreview.value) {
    return buildAdminTenantRoute(
      "/admin/storefront",
      storefrontAdminContext.value.tenantId,
      storefrontAdminContext.value.tenantLabel,
    )
  }
  if (isStorefrontPreview.value && storefrontSlug.value) return `/store/${encodeURIComponent(storefrontSlug.value)}`
  return "/admin/repository"
})
const backLinkLabel = computed(() => {
  if (isPublicCenterPreview.value) return t("backToCenter")
  if (isAdminCenterPreview.value) return t("backToCenter")
  if (isStorefrontAdminPreview.value) return t("backToStorefrontManager")
  if (isStorefrontPreview.value) return t("backToStore")
  return t("backToTemplateLibrary")
})

function partLayerCount(partName: string) {
  return partLayerCounts.value[partName] || 0
}

function partHasArtwork(partName: string) {
  return partLayerCount(partName) > 0
}

function updateLocale(value: string) {
  const nextLocale = String(value || "en")
  if (nextLocale === "zh" || nextLocale === "en") {
    selectedLocale.value = nextLocale
  }
}

function normalizeWordPressProduct(raw: Record<string, unknown> | null | undefined): WordPressBoundProduct | null {
  if (!raw) return null
  const productId = Number(raw.product_id || 0)
  if (!Number.isFinite(productId) || productId <= 0) return null
  const bindingRaw = (raw.binding && typeof raw.binding === "object") ? raw.binding as Record<string, unknown> : {}
  return {
    product_id: productId,
    name: String(raw.name || "").trim(),
    slug: String(raw.slug || "").trim() || undefined,
    permalink: String(raw.permalink || "").trim() || undefined,
    image_url: String(raw.image_url || "").trim() || undefined,
    gallery_images: Array.isArray(raw.gallery_images) ? raw.gallery_images.map((item) => String(item || "").trim()).filter(Boolean) : [],
    sku: String(raw.sku || "").trim() || undefined,
    product_type: String(raw.product_type || "").trim() || undefined,
    catalog_visibility: String(raw.catalog_visibility || "").trim() || undefined,
    stock_status: String(raw.stock_status || "").trim() || undefined,
    stock_quantity: Number.isFinite(Number(raw.stock_quantity)) ? Number(raw.stock_quantity) : undefined,
    price: String(raw.price || "").trim() || undefined,
    regular_price: String(raw.regular_price || "").trim() || undefined,
    sale_price: String(raw.sale_price || "").trim() || undefined,
    price_html: String(raw.price_html || "").trim() || undefined,
    description: String(raw.description || "").trim() || undefined,
    short_description: String(raw.short_description || "").trim() || undefined,
    category_ids: Array.isArray(raw.category_ids) ? raw.category_ids.map((item) => String(item || "").trim()).filter(Boolean) : [],
    category_names: Array.isArray(raw.category_names) ? raw.category_names.map((item) => String(item || "").trim()).filter(Boolean) : [],
    category_slugs: Array.isArray(raw.category_slugs) ? raw.category_slugs.map((item) => String(item || "").trim()).filter(Boolean) : [],
    tag_names: Array.isArray(raw.tag_names) ? raw.tag_names.map((item) => String(item || "").trim()).filter(Boolean) : [],
    attributes: Array.isArray(raw.attributes)
      ? raw.attributes.map((item) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {}
        return {
          name: String(value.name || "").trim(),
          options: Array.isArray(value.options) ? value.options.map((option) => String(option || "").trim()).filter(Boolean) : [],
          visible: Boolean(value.visible),
          variation: Boolean(value.variation),
          raw_name: String(value.raw_name || "").trim() || undefined,
          attribute_key: String(value.attribute_key || "").trim() || undefined,
        } satisfies WordPressProductAttribute
      }).filter((item) => item.name || item.options.length)
      : [],
    // 0.4.43: 透传 variations 矩阵
    variations: Array.isArray(raw.variations)
      ? raw.variations.map((item) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {}
        const attrs = (value.attributes && typeof value.attributes === "object")
          ? value.attributes as Record<string, unknown>
          : {}
        const normalizedAttrs: Record<string, string> = {}
        for (const [k, v] of Object.entries(attrs)) {
          normalizedAttrs[String(k).toLowerCase()] = String(v ?? "")
        }
        return {
          variation_id: Number(value.variation_id || 0) || 0,
          attributes: normalizedAttrs,
          is_in_stock: value.is_in_stock !== false,
          is_purchasable: value.is_purchasable !== false,
          // 0.4.64: 透传 variation 价格
          price: String(value.price ?? ""),
          regular_price: String(value.regular_price ?? ""),
          price_html: String(value.price_html ?? ""),
        } satisfies WordPressProductVariation
      }).filter((item) => item.variation_id > 0)
      : [],
    has_template_binding: Boolean(raw.has_template_binding),
    design_enabled: Boolean(raw.design_enabled),
    binding: {
      template_id: String(bindingRaw.template_id || "").trim() || undefined,
      template_code: String(bindingRaw.template_code || "").trim() || undefined,
      template_label: String(bindingRaw.template_label || "").trim() || undefined,
      template_snapshot: String(bindingRaw.template_snapshot || "").trim() || undefined,
    },
  }
}

function normalizeWordPressProductCategory(raw: Record<string, unknown> | null | undefined): WordPressProductCategory | null {
  if (!raw) return null
  const categoryId = String(raw.category_id || "").trim()
  if (!categoryId) return null
  return {
    category_id: categoryId,
    name: String(raw.name || "").trim() || categoryId,
    slug: String(raw.slug || "").trim() || undefined,
    parent_id: String(raw.parent_id || "").trim() || undefined,
    count: Number(raw.count || 0) || 0,
  }
}

function applyInitialWordPressProductNavState() {
  const config = wordpressProductNavConfig.value
  if (!config) return
  wordpressCurrentProduct.value = normalizeWordPressProduct((config.currentProduct || null) as Record<string, unknown> | null)
  wordpressProductItems.value = Array.isArray(config.initialItems)
    ? config.initialItems.map((item) => normalizeWordPressProduct(item)).filter((item): item is WordPressBoundProduct => Boolean(item))
    : []
  wordpressProductCategories.value = Array.isArray(config.categories)
    ? config.categories.map((item) => normalizeWordPressProductCategory(item)).filter((item): item is WordPressProductCategory => Boolean(item))
    : []
  if (!wordpressProductTotal.value) {
    wordpressProductTotal.value = wordpressProductItems.value.length
  }
}

let wordpressProductRequestToken = 0
let wordpressProductSearchTimer: number | null = null

async function loadWordPressProductCategories() {
  if (!isWordPressShell.value) return
  try {
    const response = await gatewayPlatformFetch<{ records?: Array<Record<string, unknown>> }>("/api/v1/wordpress/designer/product-categories")
    const records = Array.isArray(response?.records) ? response.records : []
    wordpressProductCategories.value = records
      .map((item) => normalizeWordPressProductCategory(item))
      .filter((item): item is WordPressProductCategory => Boolean(item))
  } catch {
  }
}

async function loadWordPressProducts() {
  if (!isWordPressShell.value) return
  const requestToken = ++wordpressProductRequestToken
  wordpressProductLoading.value = true
  wordpressProductError.value = ""
  try {
    const query = new URLSearchParams()
    if (currentWordPressProductId.value > 0) {
      query.set("current_product_id", String(currentWordPressProductId.value))
    }
    if (wordpressProductCategoryId.value) {
      query.set("category_id", wordpressProductCategoryId.value)
    }
    const keyword = wordpressProductSearch.value.trim()
    if (keyword) {
      query.set("keyword", keyword)
    }
    query.set("page", String(wordpressProductPage.value))
    query.set("size", String(WORDPRESS_PRODUCT_PAGE_SIZE))
    const response = await gatewayPlatformFetch<{
      current?: Record<string, unknown> | null
      items?: Array<Record<string, unknown>>
      total?: number
      page?: number
      size?: number
    }>(`/api/v1/wordpress/designer/products?${query.toString()}`)
    if (requestToken !== wordpressProductRequestToken) return
    const items = Array.isArray(response?.items) ? response.items : []
    wordpressProductItems.value = items
      .map((item) => normalizeWordPressProduct(item))
      .filter((item): item is WordPressBoundProduct => Boolean(item))
    wordpressProductTotal.value = Number(response?.total || wordpressProductItems.value.length || 0)
    const currentFromResponse = normalizeWordPressProduct((response?.current || null) as Record<string, unknown> | null)
    if (currentFromResponse && currentFromResponse.product_id === currentWordPressProductId.value) {
      wordpressCurrentProduct.value = currentFromResponse
    } else {
      const matchedCurrent = wordpressProductItems.value.find((item) => item.product_id === currentWordPressProductId.value)
      if (matchedCurrent) {
        wordpressCurrentProduct.value = matchedCurrent
      }
    }
  } catch (error) {
    if (requestToken !== wordpressProductRequestToken) return
    wordpressProductError.value = resolveApiErrorMessage(error) || t("productNavLoadFailed")
  } finally {
    if (requestToken === wordpressProductRequestToken) {
      wordpressProductLoading.value = false
    }
  }
}

function updateWordPressProductSearch(value: string) {
  wordpressProductSearch.value = value
  wordpressProductPage.value = 1
  if (wordpressProductSearchTimer !== null) {
    window.clearTimeout(wordpressProductSearchTimer)
  }
  wordpressProductSearchTimer = window.setTimeout(() => {
    loadWordPressProducts().catch(() => undefined)
  }, 220)
}

function updateWordPressProductCategory(value: string) {
  wordpressProductCategoryId.value = String(value || "")
  wordpressProductPage.value = 1
  loadWordPressProducts().catch(() => undefined)
}

function goToWordPressProductPage(page: number) {
  const nextPage = clampPage(page, wordpressProductTotalPages.value)
  if (nextPage === wordpressProductPage.value) return
  wordpressProductPage.value = nextPage
  loadWordPressProducts().catch(() => undefined)
}

function resolveWordPressProductSwitchUrl(productId: number) {
  if (typeof window === "undefined") return ""
  const target = new URL(window.location.href)
  target.searchParams.set("product_id", String(productId))
  ;[
    "variation_id",
    "variation",
    "template_id",
    "template",
    "template_code",
    "display_name",
    "artwork_id",
    "artwork",
  ].forEach((key) => target.searchParams.delete(key))
  return target.toString()
}

async function switchWordPressProduct(entry: WordPressBoundProduct) {
  if (!entry.product_id || entry.product_id === currentWordPressProductId.value) return
  await flushWorkspaceEditingState()
  if (serverSaveDirty.value && isTenantAdmin.value) {
    const shouldSave = window.confirm(t("saveBeforeSwitch"))
    if (shouldSave) {
      const saved = await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
      if (!saved) return
    } else {
      const discard = window.confirm(t("discardContinue"))
      if (!discard) return
    }
  }
  const nextUrl = resolveWordPressProductSwitchUrl(entry.product_id)
  if (!nextUrl) return
  skipBeforeUnloadUntil.value = Date.now() + 4000
  window.location.assign(nextUrl)
}

function isTemplateActive(template: { template_id: string; runtime_key?: string; source?: string }) {
  if (template.source !== templateLibraryScope.value) return false
  return buildTemplatePreviewIdentityKeys(template).includes(String(selectedTemplateId.value || "").trim())
}

function templateKey(template: { source: PreviewTemplateScope; template_id: string; runtime_key?: string }) {
  return `${template.source}:${template.template_id || template.runtime_key || ""}`
}

function resolveTemplateIdentityKeys(template: Partial<TemplateCatalogEntry>) {
  return buildTemplatePreviewIdentityKeys(template)
}

function resolveTemplateReferenceKeys(template: Partial<TemplateCatalogEntry>) {
  return buildTemplatePreviewReferenceKeys(template)
}

function normalizeTemplateFamilyToken(template: Partial<TemplateCatalogEntry>) {
  return String(template.template_code || template.runtime_key || template.template_id || "")
    .trim()
    .split("--")[0]
    .toLowerCase()
}

function parseTemplateSeriesHint(template: Partial<TemplateCatalogEntry>) {
  const token = normalizeTemplateFamilyToken(template)
  const match = token.match(/^([a-z]+)(\d+)/i)
  if (!match) {
    return {
      prefix: token,
      sequence: Number.NaN,
    }
  }
  return {
    prefix: match[1].toLowerCase(),
    sequence: Number(match[2]),
  }
}

function isUnavailableTemplate(template: Partial<TemplateCatalogEntry>) {
  const unavailable = new Set(unavailableTemplateKeys.value)
  return resolveTemplateIdentityKeys(template).some((key) => unavailable.has(key))
}

function markTemplateUnavailable(template: Partial<TemplateCatalogEntry> | null | undefined) {
  if (!template) return
  const next = new Set(unavailableTemplateKeys.value)
  resolveTemplateIdentityKeys(template).forEach((key) => next.add(key))
  unavailableTemplateKeys.value = Array.from(next)
}

function resolveFallbackTemplateEntry(scope: PreviewTemplateScope, excludedTemplateId: string) {
  const scopeQueue = [scope, ...previewTemplateScopeConfig.value.fallbackScopes.filter((entryScope) => entryScope !== scope)]
  for (const candidateScope of scopeQueue) {
    const entries = templateEntriesByScope.value[candidateScope] || []
    const excludedEntry = entries.find((entry: TemplateCatalogEntry) => (
      entry.template_id === excludedTemplateId || entry.runtime_key === excludedTemplateId
    )) || null
    const excludedSeries = parseTemplateSeriesHint(excludedEntry || {
      template_id: excludedTemplateId,
      runtime_key: excludedTemplateId,
    })
    const candidates = entries
      .filter((entry: TemplateCatalogEntry) => (
        !isUnavailableTemplate(entry)
        && entry.template_id !== excludedTemplateId
        && entry.runtime_key !== excludedTemplateId
      ))
      .map((entry: TemplateCatalogEntry, index: number) => {
        const series = parseTemplateSeriesHint(entry)
        const sameOwner = Boolean(excludedEntry?.owner_tenant_id) && entry.owner_tenant_id === excludedEntry?.owner_tenant_id
        const sameCategory = Boolean(excludedEntry?.category_id) && entry.category_id === excludedEntry?.category_id
        const samePrefix = Boolean(excludedSeries.prefix) && series.prefix === excludedSeries.prefix
        const sequenceDistance = samePrefix && Number.isFinite(excludedSeries.sequence) && Number.isFinite(series.sequence)
          ? Math.abs(series.sequence - excludedSeries.sequence)
          : Number.POSITIVE_INFINITY
        const hasPreviewCover = Boolean(resolveTemplateCoverUrl(entry))
        const score = (
          (sameOwner ? 400 : 0)
          + (sameCategory ? 200 : 0)
          + (samePrefix ? 100 : 0)
          + (hasPreviewCover ? 25 : 0)
        )
        return {
          entry,
          index,
          score,
          sequenceDistance,
        }
      })
      .sort((left: { score: number; sequenceDistance: number; index: number }, right: { score: number; sequenceDistance: number; index: number }) => {
        if (right.score !== left.score) return right.score - left.score
        if (left.sequenceDistance !== right.sequenceDistance) return left.sequenceDistance - right.sequenceDistance
        return left.index - right.index
      })
    if (candidates[0]?.entry) {
      return candidates[0].entry
    }
  }
  return null
}

async function replacePreviewTemplateQuery(templateId: string) {
  const nextQuery = {
    ...route.query,
    template_id: templateId,
  }
  if ("template" in nextQuery) {
    delete nextQuery.template
  }
  await router.replace({ query: nextQuery })
}

function resolveTemplateCoverUrl(template: Pick<TemplateCatalogEntry, "cover_url" | "runtime_key" | "template_id">) {
  return resolveAssetUrl(String(template.cover_url || "").trim())
}

function handleTemplateCardImageError(template: Pick<TemplateCatalogEntry, "cover_url" | "runtime_key" | "template_id">) {
  // Stop guessing /runtime-assets/ paths which cause 404s.
  // If the cover_url fails, we just let it show the placeholder (the first letter of the name).
  const target = visibleTemplateEntries.value.find((entry) => (
    entry.template_id === template.template_id || entry.runtime_key === template.runtime_key
  ))
  if (target) {
    target.cover_url = ""
  }
  if (
    hoveredTemplateEntry.value
    && (hoveredTemplateEntry.value.template_id === template.template_id || hoveredTemplateEntry.value.runtime_key === template.runtime_key)
  ) {
    hoveredTemplateEntry.value = {
      ...hoveredTemplateEntry.value,
      cover_url: "",
    }
  }
}

function scrollWorkspacePanelToTop(target: HTMLElement | null) {
  if (!target) return
  target.scrollTo({ top: 0, behavior: "auto" })
}

function resetTemplatePanelPosition() {
  nextTick(() => scrollWorkspacePanelToTop(templateLibraryScrollRef.value))
}

function applyTemplateLibraryTab(scope: PreviewTemplateScope, intent: "user-browse" | "template-selection" | "workspace-load" | "initial-sync") {
  const nextState = resolvePreviewTemplateScopeState({
    currentScope: templateLibraryScope.value,
    nextScope: scope,
    pinnedByUser: templateLibraryScopePinnedByUser.value,
    intent,
  })
  templateLibraryScope.value = nextState.scope
  templateLibraryScopePinnedByUser.value = nextState.pinnedByUser
}

function browseTemplateLibraryTab(scope: PreviewTemplateScope) {
  applyTemplateLibraryTab(scope, "user-browse")
}

function resetArtworkPanelPosition() {
  nextTick(() => scrollWorkspacePanelToTop(artworkLibraryScrollRef.value))
}

function resolveHoverOverlay(event: Event): {
  placement: HoverOverlayClass
  style: Record<string, string>
} {
  return computeFloatingHoverOverlay(event, {
    defaultPlacement: "hover-overlay--bottom-left",
    overlayWidth: 248,
    overlayHeight: 360,
    minOverlayWidth: 180,
    minOverlayHeight: 220,
    viewportPadding: 12,
    topSafePadding: 88,
    gap: 10,
  })
}

function setHoveredTemplate(template: TemplatePreviewEntry, event: Event) {
  const overlay = resolveHoverOverlay(event)
  hoveredTemplateKey.value = templateKey(template)
  hoveredTemplateEntry.value = template
  hoveredTemplatePlacement.value = overlay.placement
  hoveredTemplateStyle.value = overlay.style
}

function clearHoveredTemplate() {
  hoveredTemplateKey.value = ""
  hoveredTemplateEntry.value = null
  hoveredTemplatePlacement.value = "hover-overlay--bottom-left"
  hoveredTemplateStyle.value = {}
}

function artworkKey(artwork: { artwork_id: string; library_scope: "platform" | "tenant" | "licensed" | "upload" }) {
  return `${artwork.library_scope}:${artwork.artwork_id}`
}

function setHoveredArtwork(artwork: ArtworkCatalogEntry, event: Event) {
  cancelHoveredArtworkClear()
  const overlay = resolveHoverOverlay(event)
  hoveredArtworkKey.value = artworkKey(artwork)
  hoveredArtworkEntry.value = artwork
  hoveredArtworkPlacement.value = overlay.placement
  hoveredArtworkStyle.value = overlay.style
}

function cancelHoveredArtworkClear() {
  if (hoveredArtworkClearTimer) {
    window.clearTimeout(hoveredArtworkClearTimer)
    hoveredArtworkClearTimer = null
  }
}

function scheduleHoveredArtworkClear(delay = 120) {
  cancelHoveredArtworkClear()
  hoveredArtworkClearTimer = window.setTimeout(() => {
    hoveredArtworkClearTimer = null
    clearHoveredArtwork()
  }, delay)
}

function clearHoveredArtwork() {
  cancelHoveredArtworkClear()
  hoveredArtworkKey.value = ""
  hoveredArtworkEntry.value = null
  hoveredArtworkPlacement.value = "hover-overlay--bottom-left"
  hoveredArtworkStyle.value = {}
}

function normalizeTemplateSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function squashTemplateSearch(value: string) {
  return normalizeTemplateSearch(value).replace(/\s+/g, "")
}

function matchesTemplateSearch(keyword: string, squashedKeyword: string, values: Array<string | undefined>) {
  if (!keyword) return true
  return values.some((value) => {
    const normalized = normalizeTemplateSearch(value || "")
    const squashed = squashTemplateSearch(value || "")
    return normalized.includes(keyword) || (!!squashedKeyword && squashed.includes(squashedKeyword))
  })
}

function resolveTemplateCategory(item: TemplateCatalogEntry) {
  if (item.category_id) {
    const resolved = findCategoryPath(item.category_id, templateCategories.value)
    if (resolved) return resolved
  }
  if (item.category_path) return item.category_path
  return t("uncategorized")
}

function resolveTemplateTime(item: TemplateCatalogEntry) {
  const value = isPublishedTemplateScope(item.source)
    ? (item.listed_at || item.updated_at || item.created_at)
    : (item.updated_at || item.created_at)
  return value ? formatTemplateDate(value) : t("unknown")
}

function resolveTemplateCreator(item: TemplateCatalogEntry) {
  return formatMarketplaceCreatorName(item.creator_name)
}

function resolveTemplateAccessScope(
  template: Partial<TemplateCatalogEntry> & { scopes?: PreviewTemplateScope[] },
) {
  return resolvePreviewTemplateAccessScope({
    source: template.source,
    scopes: template.scopes,
    publish_status: template.publish_status,
    access_scope: template.access_scope,
  })
}

function resolveTemplateAccessScopeLabel(template: Partial<TemplateCatalogEntry>) {
  return resolveTemplateAccessScope(template) === "private" ? t("privateAccess") : ""
}

function resolveArtworkCategory(item: ArtworkCatalogEntry) {
  if (item.category_id) {
    const resolved = findCategoryPath(item.category_id, currentArtworkCategories.value as never)
    if (resolved) return resolved
  }
  if (item.category_path) return item.category_path
  return t("uncategorized")
}

function resolveArtworkCode(item: ArtworkCatalogEntry) {
  if (item.artwork_code?.trim()) return item.artwork_code.trim()
  if (item.library_scope === "upload") return deriveLocalArtworkCode(item.artwork_id)
  if (item.source_asset_id?.trim()) return item.source_asset_id.trim().toUpperCase()
  return "N/A"
}

function resolveArtworkDisplayName(item: Pick<ArtworkCatalogEntry, "name" | "artwork_code">) {
  return resolveDisplayName(item.name, item.artwork_code || "Untitled artwork")
}

function resolveArtworkTime(item: ArtworkCatalogEntry) {
  const value = item.updated_at || item.created_at
  return value ? formatTemplateDate(value) : "unknown"
}

function resolveArtworkCreator(item: ArtworkCatalogEntry) {
  if (item.library_scope === "upload") return t("personalUpload")
  return item.creator_name || t("unknown")
}

function deriveLocalArtworkCode(id: string) {
  const normalized = String(id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const suffix = normalized.length <= 8 ? normalized : normalized.slice(-8)
  return `LOCAL-${suffix || "UPLOAD"}`
}

function updateArtworkSearch(value: string) {
  if (artworkLibraryTab.value === "platform") {
    platformArtworkSearch.value = value
    platformArtworkPage.value = 1
  } else if (artworkLibraryTab.value === "tenant") {
    tenantArtworkSearch.value = value
    tenantArtworkPage.value = 1
  } else if (artworkLibraryTab.value === "licensed") {
    licensedArtworkSearch.value = value
    licensedArtworkPage.value = 1
  } else {
    ownedArtworkSearch.value = value
    ownedArtworkPage.value = 1
  }
  clearHoveredArtwork()
  resetArtworkPanelPosition()
}

function updateArtworkCategoryFilter(value: string) {
  if (artworkLibraryTab.value === "platform") {
    platformArtworkCategoryId.value = value
    platformArtworkPage.value = 1
  } else if (artworkLibraryTab.value === "tenant") {
    tenantArtworkCategoryId.value = value
    tenantArtworkPage.value = 1
  } else if (artworkLibraryTab.value === "licensed") {
    licensedArtworkCategoryId.value = value
    licensedArtworkPage.value = 1
  }
  clearHoveredArtwork()
  resetArtworkPanelPosition()
}

function toggleArtworkCategoryPopover(event?: Event) {
  showArtworkCategoryPopover.value = !showArtworkCategoryPopover.value
  if (showArtworkCategoryPopover.value && event) {
    setCategoryPopoverPositionFromEvent(event)
  }
}

function toggleWordPressProductCategoryPopover(event?: Event) {
  showWordPressProductCategoryPopover.value = !showWordPressProductCategoryPopover.value
  if (showWordPressProductCategoryPopover.value && event) {
    setCategoryPopoverPositionFromEvent(event)
  }
}

/** 根据触发按钮坐标计算 popover 在 viewport 中的固定定位（用于 Teleport 到 body 后使用 position: fixed） */
function setCategoryPopoverPositionFromEvent(event: Event, opts?: { align?: "left" | "right"; preferredWidth?: number }) {
  const target = (event.currentTarget || event.target) as Element | null
  if (!target || !(target as HTMLElement).getBoundingClientRect) {
    categoryPopoverPosition.value = null
    return
  }
  const rect = (target as HTMLElement).getBoundingClientRect()
  const preferred = opts?.preferredWidth ?? Math.min(700, window.innerWidth - 48)
  const width = Math.min(preferred, window.innerWidth - 24)
  let left = rect.left
  if (opts?.align === "right") {
    left = Math.max(12, rect.right - width)
  } else {
    left = Math.min(left, window.innerWidth - width - 12)
    left = Math.max(12, left)
  }
  const top = rect.bottom + 6
  categoryPopoverPosition.value = { top, left, width }
}

async function loadArtworkLibrary(scope: "platform" | "tenant") {
  const isPlatformScope = scope === "platform"
  if (isPlatformScope) {
    platformArtworkLibraryPendingCount.value += 1
  } else {
    tenantArtworkLibraryPendingCount.value += 1
  }
  if (scope === "platform") {
    platformArtworkLibraryHydrated.value = false
  } else if (!tenantArtworkLibraryHydrated.value) {
    tenantArtworkLibraryHydrated.value = false
  }
  if (scope === "tenant" && isStorefrontPreview.value) {
    try {
      const filtered = filterPreviewArtworkEntries(storefrontTenantArtworkEntries.value, {
        keywordInput: tenantArtworkSearch.value,
        selectedCategoryId: tenantArtworkCategoryId.value,
        categoryTree: artworkCategoryTrees.value.tenant,
      })
      tenantArtworkTotal.value = filtered.length
      const start = (tenantArtworkPage.value - 1) * ARTWORK_PAGE_SIZE
      tenantArtworkItems.value = filtered.slice(start, start + ARTWORK_PAGE_SIZE) as never
      return
    } finally {
      tenantArtworkLibraryPendingCount.value = Math.max(0, tenantArtworkLibraryPendingCount.value - 1)
      tenantArtworkLibraryHydrated.value = true
    }
  }
  try {
    await artworkStore.loadLibrary(scope, {
      keyword: scope === "platform" ? platformArtworkSearch.value : tenantArtworkSearch.value,
      category_id: (scope === "platform" ? platformArtworkCategoryId.value : tenantArtworkCategoryId.value) === "all"
        ? ""
        : (scope === "platform" ? platformArtworkCategoryId.value : tenantArtworkCategoryId.value),
      visibility_status: scope === "platform" ? "listed" : "all",
      page: scope === "platform" ? platformArtworkPage.value : tenantArtworkPage.value,
      size: ARTWORK_PAGE_SIZE,
      include_disabled: false,
    })
  } finally {
    if (isPlatformScope) {
      platformArtworkLibraryPendingCount.value = Math.max(0, platformArtworkLibraryPendingCount.value - 1)
      platformArtworkLibraryHydrated.value = true
    } else {
      tenantArtworkLibraryPendingCount.value = Math.max(0, tenantArtworkLibraryPendingCount.value - 1)
      tenantArtworkLibraryHydrated.value = true
    }
  }
}

async function ensureActiveArtworkLibraryHydrated() {
  if (shouldHydratePreviewArtworkLibraryTab(artworkLibraryTab.value, {
    platformHydrated: platformArtworkLibraryHydrated.value,
    tenantHydrated: tenantArtworkLibraryHydrated.value,
    platformPendingCount: platformArtworkLibraryPendingCount.value,
    tenantPendingCount: tenantArtworkLibraryPendingCount.value,
  }) && (artworkLibraryTab.value === "platform" || artworkLibraryTab.value === "tenant")) {
    await loadArtworkLibrary(artworkLibraryTab.value).catch(() => undefined)
    return
  }
  if (artworkLibraryTab.value === "licensed" && !licensedArtworkEntries.value.length) {
    await artworkStore.loadLicenses().catch(() => [] as ArtworkLicenseRecord[])
    return
  }
  if (artworkLibraryTab.value === "owned" && !ownedArtworkLibrary.value.length) {
    await loadUploadArtworkLibrary().catch(() => undefined)
  }
}

async function loadUploadArtworkLibrary() {
  try {
    const adminContext = readAdminTenantContext(route.query)
    const query = new URLSearchParams({ page: "1", size: "500" })
    if (authStore.role === "platform_admin" && adminContext.tenantId) {
      query.set("tenant_id", adminContext.tenantId)
    }
    const response = await gatewayPlatformFetch<{
      records: Array<{
        artwork_id: string
        name: string
        preview_url?: string
        original_url?: string
        created_at?: string
        updated_at?: string
      }>
    }>(`/api/v1/artworks/uploads?${query.toString()}`, {
      headers: authStore.authHeaders,
    })
    const records = Array.isArray(response?.records) ? response.records : []
    ownedArtworkLibrary.value = mergeOwnedArtworkLibraryEntries(
      ownedArtworkLibrary.value,
      records,
      resolveAssetUrl,
    )
  } catch {
    // Keep the optimistic personal library entries visible when the refresh request fails or lags behind.
  }
}

function filterTemplateEntries<T extends TemplateCatalogEntry>(
  entries: T[],
  keywordInput: string,
  selectedCategoryId: string,
  selectedCategoryIdSet: Set<string> | null,
) {
  const keyword = normalizeTemplateSearch(keywordInput)
  const squashedKeyword = squashTemplateSearch(keywordInput)
  return entries.filter((item) => {
    const categoryLabel = resolveTemplateCategory(item)
    const keywordMatch = matchesTemplateSearch(keyword, squashedKeyword, [
      item.display_name,
      item.template_code,
      item.template_id,
      categoryLabel,
    ])
    const categoryMatch = selectedCategoryId === "all"
      || Boolean(item.category_id && selectedCategoryIdSet?.has(item.category_id))
    return keywordMatch && categoryMatch
  })
}

function updateTemplateSearch(value: string) {
  templateSearchState.value[templateLibraryScope.value] = value
  templatePageState.value[templateLibraryScope.value] = 1
  clearHoveredTemplate()
  resetTemplatePanelPosition()
}

function updateTemplateCategoryFilter(value: string) {
  templateCategoryState.value[templateLibraryScope.value] = value
  templatePageState.value[templateLibraryScope.value] = 1
  clearHoveredTemplate()
  resetTemplatePanelPosition()
}

function toggleTemplateCategoryPopover(event?: Event) {
  showTemplateCategoryPopover.value = !showTemplateCategoryPopover.value
  if (showTemplateCategoryPopover.value && event) {
    setCategoryPopoverPositionFromEvent(event)
  }
}

function goToTemplatePage(page: number) {
  const nextPage = clampPage(page, templateTotalPages.value)
  templatePageState.value[templateLibraryScope.value] = nextPage
  clearHoveredTemplate()
  resetTemplatePanelPosition()
}

function getPartPreviewAsset(part: { part_name: string; guide_url?: string; svg_url?: string; cutout_url?: string }) {
  const candidates = [
    part.guide_url || "",
    part.cutout_url || "",
    part.svg_url || "",
  ].filter(Boolean)
  return candidates.find((asset) => !partPreviewFailures.value[`${part.part_name}::${asset}`]) || ""
}

function handlePartPreviewError(part: { part_name: string; guide_url?: string; svg_url?: string; cutout_url?: string }) {
  const failedAsset = getPartPreviewAsset(part)
  if (!failedAsset) return
  partPreviewFailures.value = {
    ...partPreviewFailures.value,
    [`${part.part_name}::${failedAsset}`]: true,
  }
}

function getPartGuidePreviewAsset(part: { part_name: string; guide_url?: string; svg_url?: string; cutout_url?: string }) {
  return part.guide_url || getPartPreviewAsset(part)
}

function normalizeTemplateSummary(item: Record<string, unknown>, source: PreviewTemplateScope): TemplateCatalogEntry {
  const legacyPublish = String(item.publish_status ?? item.publishStatus ?? "draft")
  const explicitAccessScope = item.access_scope ?? item.accessScope
  return {
    listing_id: item.listing_id == null && item.listingId == null ? undefined : String(item.listing_id ?? item.listingId),
    template_id: String(item.template_id ?? item.templateId ?? ""),
    governance_id: item.governance_id == null && item.governanceId == null ? undefined : String(item.governance_id ?? item.governanceId),
    runtime_key: item.runtime_key == null && item.runtimeKey == null ? undefined : String(item.runtime_key ?? item.runtimeKey),
    display_name: String(item.display_name ?? item.displayName ?? item.template_id ?? ""),
    owner_tenant_id: String(item.owner_tenant_id ?? item.ownerTenantId ?? ""),
    template_code: item.template_code == null && item.templateCode == null ? undefined : String(item.template_code ?? item.templateCode),
    description: item.description == null ? undefined : String(item.description),
    category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
    category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
    access_scope: explicitAccessScope == null
      ? undefined
      : (String(explicitAccessScope).trim().toLowerCase() === "private" ? "private" : "public"),
    tenant_api_status: (item.tenant_api_status ?? item.tenantApiStatus) as "enabled" | "disabled" | undefined,
    publish_status: legacyPublish as "draft" | "published",
    template_size: String(item.template_size ?? item.templateSize ?? ""),
    cover_url: resolveAssetUrl(String(item.cover_url ?? item.coverUrl ?? "")),
    creator_name: item.creator_name == null && item.creatorName == null ? undefined : String(item.creator_name ?? item.creatorName),
    listed_at: item.listed_at == null && item.listedAt == null ? undefined : String(item.listed_at ?? item.listedAt),
    created_at: item.created_at == null && item.createdAt == null ? undefined : String(item.created_at ?? item.createdAt),
    updated_at: String(item.updated_at ?? item.updatedAt ?? ""),
    colors: Array.isArray(item.colors) ? item.colors.map((color) => String(color)) : [],
    parts_count: Number(item.parts_count ?? item.partsCount ?? 0),
    views_count: Number(item.views_count ?? item.viewsCount ?? 0),
    downloads: item.downloads == null ? undefined : Number(item.downloads),
    renders: item.renders == null ? undefined : Number(item.renders),
    enabled: item.enabled == null ? undefined : Boolean(item.enabled),
    status: String(item.status ?? ""),
    ready: item.ready == null ? undefined : Boolean(item.ready),
    manifest_present: item.manifest_present == null && item.manifestPresent == null ? undefined : Boolean(item.manifest_present ?? item.manifestPresent),
    source,
  }
}

async function fetchPublicTemplates() {
  try {
    const [marketplaceResponse, publishedResponse, runtimeResponse] = await Promise.all([
      gatewayPlatformFetch<Array<Record<string, unknown>>>("/marketplace/templates").catch(() => [] as Array<Record<string, unknown>>),
      gatewayPlatformFetch<Array<Record<string, unknown>> | { records?: Array<Record<string, unknown>> }>("/api/v1/templates?status=published", {
        headers: authStore.authHeaders,
      }).catch(() => [] as Array<Record<string, unknown>>),
      gatewayPlatformFetch<Array<Record<string, unknown>>>("/api/v1/runtime/templates", {
        headers: authStore.authHeaders,
      }).catch(() => [] as Array<Record<string, unknown>>),
    ])
    const runtimeIndex = new Map<string, TemplateCatalogEntry>()
    runtimeResponse
      .map((item: Record<string, unknown>) => normalizeTemplateSummary(item, "platform"))
      .forEach((item) => {
        buildTemplateIdentityKeys(item).forEach((key) => {
          runtimeIndex.set(key, item)
        })
      })
    const listings = getListedMarketplaceTemplates((Array.isArray(marketplaceResponse) ? marketplaceResponse : []).map((item) => ({
      listing_id: String(item.listing_id ?? item.listingId ?? item.template_id ?? item.templateId ?? ""),
      template_id: String(item.template_id ?? item.templateId ?? ""),
      template_code: item.template_code == null && item.templateCode == null ? undefined : String(item.template_code ?? item.templateCode),
      title: String(item.title ?? item.name ?? item.template_code ?? item.templateCode ?? item.template_id ?? item.templateId ?? ""),
      description: item.description == null ? "" : String(item.description),
      creator_name: item.creator_name == null && item.creatorName == null ? "" : String(item.creator_name ?? item.creatorName),
      listed_at: item.listed_at == null && item.listedAt == null ? undefined : String(item.listed_at ?? item.listedAt),
      marketplace_status: String(item.marketplace_status ?? item.marketplaceStatus ?? "listed") as TemplateCenterListing["marketplace_status"],
      cover_url: String(item.cover_url ?? item.coverUrl ?? ""),
      category_id: item.category_id == null && item.categoryId == null ? undefined : String(item.category_id ?? item.categoryId),
      category_path: item.category_path == null && item.categoryPath == null ? undefined : String(item.category_path ?? item.categoryPath),
      tenant_api_status: (
        item.tenant_api_status == null && item.tenantApiStatus == null
          ? undefined
          : String(item.tenant_api_status ?? item.tenantApiStatus)
      ) as "enabled" | "disabled" | undefined,
    })))
    const listingIndex = new Map<string, TemplateCenterListing>()
    listings.forEach((item) => {
      resolveTemplateIdentityKeys({
        listing_id: item.listing_id,
        template_id: item.template_id,
        template_code: item.template_code,
      }).forEach((key) => {
        listingIndex.set(key, item)
      })
    })
    const publishedRecords = Array.isArray(publishedResponse)
      ? publishedResponse
      : (Array.isArray(publishedResponse?.records) ? publishedResponse.records : [])
    const publishedTemplates = publishedRecords.map((item) => normalizeTemplateSummary(item, "platform"))
    const listedTemplates = listings.map((item) => normalizeTemplateSummary({
      listing_id: item.listing_id,
      template_id: item.template_id,
      template_code: item.template_code,
      display_name: item.title,
      description: item.description,
      category_id: item.category_id,
      category_path: item.category_path,
      access_scope: item.access_scope,
      tenant_api_status: item.tenant_api_status,
      creator_name: item.creator_name,
      listed_at: item.listed_at,
      publish_status: "published",
    }, "platform"))
    const runtimeTemplates = Array.from(new Set(runtimeIndex.values()))
    publicTemplates.value = buildPlatformPreviewTemplates({
      listedTemplates,
      publishedTemplates,
      runtimeTemplates,
    }).map((item) => {
      const listing = resolveTemplateIdentityKeys(item)
        .map((key) => listingIndex.get(key))
        .find((entry): entry is TemplateCenterListing => Boolean(entry))
      return normalizeTemplateSummary({
        ...item,
        listing_id: listing?.listing_id || item.listing_id,
        template_code: item.template_code || listing?.template_code,
        display_name: listing?.title || item.display_name,
        description: listing?.description || item.description,
        category_id: listing?.category_id || item.category_id,
        category_path: listing?.category_path || item.category_path,
        tenant_api_status: listing?.tenant_api_status || item.tenant_api_status,
        cover_url: item.cover_url || listing?.cover_url,
        creator_name: listing?.creator_name || item.creator_name,
        listed_at: listing?.listed_at || item.listed_at,
        publish_status: "published",
      }, "platform")
    })
  } catch {
    publicTemplates.value = []
  }
}

function readArtworkLibrary() {
  if (typeof window === "undefined") return [] as ArtworkLibraryEntry[]
  try {
    const raw = window.localStorage.getItem(artworkLibraryStorageKey)
    const parsed = raw ? JSON.parse(raw) as ArtworkLibraryEntry[] : []
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.src) : []
  } catch {
    return []
  }
}

function openArtworkLibraryDatabase() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null as IDBDatabase | null)
  }
  return new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = window.indexedDB.open(artworkLibraryDatabaseName, 1)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(artworkLibraryObjectStoreName)) {
          database.createObjectStore(artworkLibraryObjectStoreName)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function readArtworkLibraryFromIndexedDb() {
  return await readIndexedDbValue<ArtworkLibraryEntry[]>(artworkLibraryStorageKey, [])
}

async function readArtworkLibraryEntryRecordsFromIndexedDb() {
  const database = await openArtworkLibraryDatabase()
  if (!database) return [] as ArtworkLibraryEntry[]
  return await new Promise<ArtworkLibraryEntry[]>((resolve) => {
    try {
      const transaction = database.transaction(artworkLibraryObjectStoreName, "readonly")
      const store = transaction.objectStore(artworkLibraryObjectStoreName)
      const entries: ArtworkLibraryEntry[] = []
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve(entries)
          return
        }
        const key = String(cursor.key || "")
        const value = cursor.value as ArtworkLibraryEntry | undefined
        if (
          key.startsWith(artworkLibraryEntryStorageKeyPrefix)
          && value?.id
          && value?.src
        ) {
          entries.push(value)
        }
        cursor.continue()
      }
      request.onerror = () => resolve(entries)
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => database.close()
      transaction.onabort = () => database.close()
    } catch {
      database.close()
      resolve([])
    }
  })
}
async function readIndexedDbValue<T>(key: string, fallback: T) {
  const database = await openArtworkLibraryDatabase()
  if (!database) return fallback
  return await new Promise<T>((resolve) => {
    try {
      const transaction = database.transaction(artworkLibraryObjectStoreName, "readonly")
      const store = transaction.objectStore(artworkLibraryObjectStoreName)
      const request = store.get(key)
      request.onsuccess = () => {
        const value = request.result
        resolve((value as T | undefined) ?? fallback)
      }
      request.onerror = () => resolve(fallback)
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => database.close()
      transaction.onabort = () => database.close()
    } catch {
      database.close()
      resolve(fallback)
    }
  })
}

async function writeIndexedDbValue<T>(key: string, value: T) {
  const database = await openArtworkLibraryDatabase()
  if (!database) return
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(artworkLibraryObjectStoreName, "readwrite")
      const store = transaction.objectStore(artworkLibraryObjectStoreName)
      store.put(value, key)
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => {
        database.close()
        resolve()
      }
      transaction.onabort = () => {
        database.close()
        resolve()
      }
    } catch {
      database.close()
      resolve()
    }
  })
}

async function removeIndexedDbValue(key: string) {
  const database = await openArtworkLibraryDatabase()
  if (!database) return
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(artworkLibraryObjectStoreName, "readwrite")
      const store = transaction.objectStore(artworkLibraryObjectStoreName)
      store.delete(key)
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => {
        database.close()
        resolve()
      }
      transaction.onabort = () => {
        database.close()
        resolve()
      }
    } catch {
      database.close()
      resolve()
    }
  })
}

async function writeArtworkLibraryToIndexedDb(entries: ArtworkLibraryEntry[]) {
  await writeIndexedDbValue(artworkLibraryStorageKey, entries)
}

async function writeArtworkLibraryEntryToIndexedDb(entry: ArtworkLibraryEntry) {
  const key = `${artworkLibraryEntryStorageKeyPrefix}${entry.id || entry.src || ""}`
  if (!entry?.id || !entry?.src || !key.trim()) return
  await writeIndexedDbValue(key, entry)
}

async function readPersistedArtworkLibrary() {
  const localEntries = readArtworkLibrary()
  const [indexedDbEntries, indexedDbRecordEntries] = await Promise.all([
    readArtworkLibraryFromIndexedDb(),
    readArtworkLibraryEntryRecordsFromIndexedDb(),
  ])
  const merged = new Map<string, ArtworkLibraryEntry>()
  for (const entry of [...localEntries, ...indexedDbEntries, ...indexedDbRecordEntries]) {
    const key = entry.id || entry.src
    if (!key) continue
    merged.set(key, entry)
  }
  return Array.from(merged.values()).sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || "") || 0
    const rightTime = Date.parse(right.createdAt || "") || 0
    return rightTime - leftTime
  })
}

function readHiddenLicensedArtworkIds() {
  if (typeof window === "undefined") return [] as string[]
  try {
    const raw = window.localStorage.getItem(`${hiddenLicensedArtworkStorageKey}:${resolveWorkspaceStorageNamespace()}`)
    const parsed = raw ? JSON.parse(raw) as string[] : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : []
  } catch {
    return []
  }
}

function readHiddenOwnedArtworkIds() {
  if (typeof window === "undefined") return [] as string[]
  try {
    const raw = window.localStorage.getItem(`${hiddenOwnedArtworkStorageKey}:${resolveWorkspaceStorageNamespace()}`)
    const parsed = raw ? JSON.parse(raw) as string[] : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : []
  } catch {
    return []
  }
}

function safeLocalStorageSetItem(key: string, value: string) {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function isPersistentPreviewStorageValue(value: string) {
  const normalized = String(value || "").trim()
  if (!normalized) return false
  if (normalized.startsWith("data:") || normalized.startsWith("blob:")) return false
  // 历史 DB 数据里偶发把 file_path === "undefined" 的输出落库为
  // ".../render/file?path=undefined"，需要从 designs 弹窗预览源中剔除，避免拼出死链。
  if (/[?&]path=(undefined|null|)\b/i.test(normalized)) return false
  
  // 0.4.67: WP 插件的代理接口 (/wp-json/mockup100/v1/product/.../runtime-asset) 现在在后端支持了物理文件缓存，
  // 哪怕它包裹的是临时 job URL，在 WP 环境下它也已经是持久化的(永久独立存在 WP Media/Cache 里)。
  if (/\/wp-json\/mockup100\/v1\/product\/\d+\/runtime-asset/i.test(normalized)) {
    return true
  }

  // 0.4.66: /api/v1/external/runtime/jobs/{jobId}/outputs/{i}/preview 是 job 级临时 URL,
  // job 在 executor 里有 TTL,一旦过期再访问就会 404。绝不能作为主图持久化。
  // 这类 URL 应当只用作即时回填,真正持久化的是 OSS-backed file_path / runtime-asset 路径。
  let decoded = normalized
  try { decoded = decodeURIComponent(normalized) } catch {}
  if (/\/external\/runtime\/jobs\/[^/]+\/outputs\//i.test(decoded)) return false
  return true
}

function writeArtworkLibrary() {
  if (typeof window === "undefined") return
  safeLocalStorageSetItem(artworkLibraryStorageKey, JSON.stringify(ownedArtworkLibrary.value))
  void writeArtworkLibraryToIndexedDb(ownedArtworkLibrary.value)
}

function writeHiddenLicensedArtworkIds() {
  if (typeof window === "undefined") return
  safeLocalStorageSetItem(
    `${hiddenLicensedArtworkStorageKey}:${resolveWorkspaceStorageNamespace()}`,
    JSON.stringify(hiddenLicensedArtworkIds.value),
  )
}

function writeHiddenOwnedArtworkIds() {
  if (typeof window === "undefined") return
  safeLocalStorageSetItem(
    `${hiddenOwnedArtworkStorageKey}:${resolveWorkspaceStorageNamespace()}`,
    JSON.stringify(hiddenOwnedArtworkIds.value),
  )
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function upsertArtworkLibraryEntry(entry: ArtworkLibraryEntry) {
  ownedArtworkLibrary.value = [
    entry,
    ...ownedArtworkLibrary.value.filter((item) => item.id !== entry.id),
  ]
  ownedArtworkPage.value = 1
}

function removeArtworkLibraryEntry(entryId: string) {
  if (!entryId) return
  const nextVisibleEntries = filteredOwnedArtworkEntries.value.filter((item) => item.artwork_id !== entryId)
  if (!hiddenOwnedArtworkIds.value.includes(entryId)) {
    hiddenOwnedArtworkIds.value = [...hiddenOwnedArtworkIds.value, entryId]
    writeHiddenOwnedArtworkIds()
  }
  if (selectedArtworkId.value === entryId) {
    selectedArtworkId.value = nextVisibleEntries[0]?.artwork_id || ""
  }
  ownedArtworkPage.value = clampPage(ownedArtworkPage.value, resolvePageCount(nextVisibleEntries.length, ARTWORK_PAGE_SIZE))
}

function canRemoveArtworkEntry(entry: ArtworkCatalogEntry | null | undefined) {
  return entry?.library_scope === "upload" || entry?.library_scope === "licensed"
}

function hideLicensedArtworkEntry(entryId: string) {
  if (!entryId) return
  if (!hiddenLicensedArtworkIds.value.includes(entryId)) {
    hiddenLicensedArtworkIds.value = [...hiddenLicensedArtworkIds.value, entryId]
    writeHiddenLicensedArtworkIds()
  }
  if (selectedArtworkId.value === entryId) {
    selectedArtworkId.value = ""
  }
  setArtworkFeedback(t("removedLicensedArtwork"), "success")
}

function removeArtworkCatalogEntry(entry: ArtworkCatalogEntry) {
  if (entry.library_scope === "upload") {
    void deleteOwnedUploadFromServer(entry.artwork_id).catch(() => undefined)
    removeArtworkLibraryEntry(entry.artwork_id)
    clearHoveredArtwork()
    setArtworkFeedback(t("removedPersonalArtwork"), "success")
    return
  }
  if (entry.library_scope === "licensed") {
    hideLicensedArtworkEntry(entry.artwork_id)
    clearHoveredArtwork()
  }
}

function clearArtworkFeedback() {
  artworkFeedbackMessage.value = ""
  artworkFeedbackTone.value = "info"
  pendingArtworkPurchaseId.value = ""
}

function setArtworkFeedback(message: string, tone: "info" | "success" | "error", purchaseArtworkId = "") {
  artworkFeedbackMessage.value = message
  artworkFeedbackTone.value = tone
  pendingArtworkPurchaseId.value = purchaseArtworkId
}

function shouldGateArtworkInsertion(entry: ArtworkCatalogEntry) {
  if (entry.library_scope === "platform") {
    return resolveArtworkTileAction(entry) !== "use"
  }
  return isStorefrontPreview.value && entry.library_scope === "tenant" && entry.commerce_type === "paid"
}

function hasOwnedArtworkBadge(entry: ArtworkCatalogEntry) {
  return entry.library_scope === "upload" || entry.library_scope === "licensed" || Boolean(entry.purchased)
}

function hasArtworkImmediateAccess(entry: ArtworkCatalogEntry) {
  if (entry.library_scope === "upload" || entry.library_scope === "licensed") {
    return true
  }
  if (entry.library_scope === "platform") {
    return hasGrantedArtworkLicense(entry, authRole.value)
  }
  return isStorefrontPreview.value
    && entry.library_scope === "tenant"
    && entry.commerce_type === "paid"
    && (Boolean(entry.unlocked) || Boolean(entry.purchased))
}

function isOwnedArtworkEntry(entry: ArtworkCatalogEntry) {
  return hasOwnedArtworkBadge(entry)
}

function canPurchaseArtworkEntry(entry: ArtworkCatalogEntry) {
  return resolveArtworkTileAction(entry) === "purchase"
}

function getArtworkTilePrimaryLabel(entry: ArtworkCatalogEntry) {
  const badgeKind = resolveArtworkCommerceBadgeKind(entry, authRole.value)
  if (badgeKind === "owned") return t("owned")
  if (badgeKind === "paid") return t("paid")
  if (badgeKind === "free") return t("free")
  return ""
}

function getArtworkTileBadgeLabel(entry: ArtworkCatalogEntry) {
  if (resolveArtworkCommerceBadgeKind(entry, authRole.value) === "paid" && entry.price_tokens) {
    return `${entry.price_tokens} ${t("tokens")}`
  }
  return getArtworkTilePrimaryLabel(entry)
}

function getArtworkTileSecondaryLabel(entry: ArtworkCatalogEntry) {
  if (entry.commerce_type !== "paid" || isOwnedArtworkEntry(entry) || !entry.price_tokens) return ""
  return `${entry.price_tokens} ${t("tokens")}`
}

function getArtworkTileBadgeSecondaryLabel(entry: ArtworkCatalogEntry) {
  if (resolveArtworkCommerceBadgeKind(entry, authRole.value) === "paid") return ""
  return getArtworkTileSecondaryLabel(entry)
}

function shouldShowArtworkTileBadge(entry: ArtworkCatalogEntry) {
  return Boolean(getArtworkTileBadgeLabel(entry) || getArtworkTileBadgeSecondaryLabel(entry))
}

function getArtworkHoverPriceLabel(entry: ArtworkCatalogEntry) {
  if (entry.commerce_type !== "paid" || !entry.price_tokens) return ""
  return `${entry.price_tokens} ${t("tokens")}`
}

function getArtworkTileClickHint(entry: ArtworkCatalogEntry) {
  const action = resolveArtworkTileAction(entry)
  if (action === "purchase") return t("clickToUnlock")
  if (action === "unavailable") return t("unavailableToInsert")
  return t("clickToInsert")
}

function getArtworkTileAriaLabel(entry: ArtworkCatalogEntry) {
  const access = resolveArtworkAccessScopeLabel(entry)
  const status = getArtworkTilePrimaryLabel(entry)
  const price = getArtworkTileSecondaryLabel(entry)
  const action = getArtworkTileClickHint(entry)
  return [entry.name, access, status, price, action].filter(Boolean).join(", ")
}

function getArtworkTileBadgeClass(entry: ArtworkCatalogEntry) {
  const badgeKind = resolveArtworkCommerceBadgeKind(entry, authRole.value)
  if (badgeKind === "owned") return "library-tile-cta--owned"
  if (badgeKind === "paid") return "library-tile-cta--paid"
  return "library-tile-cta--free"
}

function getArtworkHoverChipClass(entry: ArtworkCatalogEntry) {
  const badgeKind = resolveArtworkCommerceBadgeKind(entry, authRole.value)
  if (badgeKind === "owned") return "template-hover-chip--owned"
  if (badgeKind === "paid") return "template-hover-chip--paid"
  return "template-hover-chip--free"
}

function resolveArtworkAccessScopeLabel(entry: ArtworkCatalogEntry) {
  return resolveArtworkAccessScope(entry) === "private" ? t("privateAccess") : ""
}

async function ensureArtworkAuthorized(entry: ArtworkCatalogEntry) {
  if (!shouldGateArtworkInsertion(entry)) return true
  if (hasArtworkImmediateAccess(entry)) {
    clearArtworkFeedback()
    return true
  }
  try {
    const license = await artworkStore.getArtworkLicense(entry.artwork_id)
    if (isArtworkLicenseGrantedByLookup(license)) {
      clearArtworkFeedback()
      return true
    }
  } catch (error) {
    if (!(error instanceof ApiRequestError) || ![400, 403, 404].includes(error.status)) {
      setArtworkFeedback(resolveApiErrorMessage(error), "error")
      return false
    }
  }
  if (canPurchaseArtworkEntry(entry)) {
    setArtworkFeedback(
      getLocalizedUnauthorizedArtworkMessage(entry.name, Boolean(currentTenantId.value), true),
      "error",
      entry.artwork_id,
    )
    return false
  }
  setArtworkFeedback(
    getLocalizedUnauthorizedArtworkMessage(entry.name, Boolean(currentTenantId.value), false),
    "error",
  )
  return false
}

async function insertArtworkFromLibrary(entry: ArtworkLibraryEntry) {
  activeSidebarTab.value = "artwork"
  selectedArtworkId.value = entry.id
  clearArtworkFeedback()
  await canvasRef.value?.addArtworkSource?.(
    entry.src,
    entry.name,
    entry.previewSrc || entry.src,
    { libraryScope: "owned", artworkId: entry.id },
  )
  await persistWorkspaceDesign()
  refreshLayerOptions()
  refreshPartLayerCounts()
  hasArtwork.value = true
  previewMode.value = "default"
}

async function insertSelectedArtwork() {
  if (!selectedArtworkId.value) return
  if (artworkLibraryTab.value === "owned") {
    const entry = ownedArtworkLibrary.value.find((item) => item.id === selectedArtworkId.value)
    if (entry) {
      await insertArtworkFromLibrary(entry)
    }
    return
  }
  const entry = currentArtworkEntries.value.find((item) => item.artwork_id === selectedArtworkId.value)
  if (!entry) return
  if (!(await ensureArtworkAuthorized(entry))) return
  activeSidebarTab.value = "artwork"
  const resolution = await resolveArtworkInsertSource(entry, { logger: console })
  if (!resolution.source) return
  await canvasRef.value?.addArtworkSource?.(
    resolution.source,
    entry.name,
    resolveAssetUrl(String(entry.preview_url || entry.original_url || resolution.source).trim()),
    {
      libraryScope: artworkLibraryTab.value,
      artworkId: entry.artwork_id,
    },
  )
  await persistWorkspaceDesign()
  refreshLayerOptions()
  refreshPartLayerCounts()
  hasArtwork.value = true
  previewMode.value = "default"
  clearArtworkFeedback()
}

async function selectWorkspaceTemplate(entry: TemplatePreviewEntry) {
  await flushWorkspaceEditingState()
  if (serverSaveDirty.value && isTenantAdmin.value) {
    const shouldSave = window.confirm(t("saveBeforeSwitch"))
    if (shouldSave) {
      const saved = await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
      if (!saved) return
    } else {
      const discard = window.confirm(t("discardContinue"))
      if (!discard) return
    }
  }
  applyTemplateLibraryTab(entry.source, "template-selection")
  const nextTemplateId = entry.runtime_key || entry.template_id
  if (!nextTemplateId) return
  await router.replace({
    query: {
      ...route.query,
      template_id: nextTemplateId,
    },
  })
  await loadWorkspace(nextTemplateId)
}

function resolveTemplateId() {
  return String(route.query.template_id || route.query.template || "")
}

function resolveArtworkId() {
  return String(route.query.artwork_id || route.query.artwork || "")
}

function resolveArtworkLibraryTab(artworkId: string) {
  return resolvePreviewArtworkLibraryTab(artworkId, {
    isStorefrontPreview: isStorefrontPreview.value,
    isMarketplaceArtworkPreviewSource: isMarketplaceArtworkPreviewSource.value,
    platformEntries: platformArtworkItems.value as ArtworkCatalogEntry[],
    tenantEntries: tenantArtworkItems.value as ArtworkCatalogEntry[],
    licensedEntries: licensedArtworkEntries.value,
    ownedEntries: ownedArtworkEntries.value,
  })
}

function resolveArtworkPage(entries: Array<{ artwork_id: string }>, artworkId: string) {
  const index = entries.findIndex((item) => item.artwork_id === artworkId)
  return index >= 0 ? Math.floor(index / ARTWORK_PAGE_SIZE) + 1 : 1
}

function syncArtworkRouteSelection(artworkId: string) {
  if (!artworkId) return
  const nextTab = resolveArtworkLibraryTab(artworkId)
  if (nextTab === "platform") {
    platformArtworkPage.value = resolveArtworkPage(platformArtworkItems.value as ArtworkCatalogEntry[], artworkId)
  } else if (nextTab === "licensed") {
    licensedArtworkPage.value = resolveArtworkPage(filteredLicensedArtworkEntries.value, artworkId)
  } else if (nextTab === "owned") {
    ownedArtworkPage.value = resolveArtworkPage(filteredOwnedArtworkEntries.value, artworkId)
  } else if (isStorefrontPreview.value) {
    const storefrontArtworks = storefrontTenantArtworkEntries.value
    tenantArtworkPage.value = resolveArtworkPage(storefrontArtworks, artworkId)
  } else {
    tenantArtworkPage.value = resolveArtworkPage(tenantArtworkItems.value as ArtworkCatalogEntry[], artworkId)
  }
  activeSidebarTab.value = "artwork"
  artworkLibraryTab.value = nextTab
  selectedArtworkId.value = artworkId
  pendingArtworkInsertId.value = artworkId
}

function syncTemplateRouteSelection(
  templateReference: string,
  intent: "template-selection" | "workspace-load" | "initial-sync",
) {
  const normalizedReference = String(templateReference || "").trim()
  if (!normalizedReference) return
  const nextScope = resolveTemplateScopeForReference(normalizedReference, previewTemplateScopeConfig.value.fallbackScopes)
    || previewTemplateScopeConfig.value.defaultScope
  const filteredEntries = filteredTemplateEntriesByScope.value[nextScope] || []
  const hasVisibleMatch = filteredEntries.some((entry) => resolveTemplateReferenceKeys(entry).includes(normalizedReference))
  if (!hasVisibleMatch) {
    templateSearchState.value[nextScope] = ""
    templateCategoryState.value[nextScope] = "all"
  }
  const scopeEntries = filteredTemplateEntriesByScope.value[nextScope] || []
  templatePageState.value[nextScope] = resolveTemplatePreviewPage(scopeEntries, normalizedReference, TEMPLATE_PAGE_SIZE)
  applyTemplateLibraryTab(nextScope, intent)
}

function resolveTemplateEntryByReference(
  templateReference: string,
  preferredScopes = previewTemplateScopeConfig.value.fallbackScopes,
) {
  return findTemplatePreviewEntry(templateCatalogEntries.value, templateReference, preferredScopes)
}

function resolveTemplateRuntimeReference(
  templateReference: string,
  preferredScopes = previewTemplateScopeConfig.value.fallbackScopes,
) {
  const match = resolveTemplateEntryByReference(templateReference, preferredScopes)
  return match?.runtime_key || match?.template_id || ""
}

function previewKey(color: string, view: string, size: string, mode: PreviewSourceMode) {
  return `${mode}::${color}::${view}::${size}`
}

function activePreviewMode(): PreviewSourceMode {
  return hasArtwork.value ? "artwork" : "default"
}

function shouldUsePublishedRuntime() {
  return isPublishedTemplateScope(currentTemplateScope.value)
}

function resolveFirstAvailableTemplateId(scopes = previewTemplateScopeConfig.value.fallbackScopes) {
  for (const scope of scopes) {
    const entry = (templateEntriesByScope.value[scope] || []).find((item) => !isUnavailableTemplate(item))
    if (entry) {
      return entry.runtime_key || entry.template_id || ""
    }
  }
  return ""
}

async function applyPendingArtworkInsert() {
  if (!pendingArtworkInsertId.value || !selectedTemplateId.value) return
  const artworkId = pendingArtworkInsertId.value
  if (!currentArtworkEntries.value.some((item) => item.artwork_id === artworkId)) {
    return
  }
  selectedArtworkId.value = artworkId
  pendingArtworkInsertId.value = ""
  await insertSelectedArtwork()
}

function previewSignature(mode: PreviewSourceMode) {
  const backgroundSignature = Object.entries(partBackgroundColors.value)
    .filter(([, value]) => String(value || "").trim())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([partKey, value]) => `${partKey}:${value}`)
    .join("|")
  return getPreviewSignature(mode, canvasSignature.value, backgroundSignature)
}

function setPreviewRequestState(
  color: string,
  view: string,
  size: string,
  mode: PreviewSourceMode,
  state: "idle" | "rendering" | "fresh" | "stale" | "failed",
  signature = "",
) {
  const key = previewKey(color, view, size, mode)
  previewRequestStateByKey.value = {
    ...previewRequestStateByKey.value,
    [key]: state,
  }
  if (signature) {
    previewLastResolvedSignatureByKey.value = {
      ...previewLastResolvedSignatureByKey.value,
      [key]: signature,
    }
  }
}

function buildPreviewPartImageSnapshotKey(mode: PreviewSourceMode, size: string) {
  return `${mode}::${size}::${previewSignature(mode)}`
}

async function exportPreviewPartImages(mode: PreviewSourceMode, size: string): Promise<PreviewPartImage[]> {
  if (mode !== "artwork" || !hasArtwork.value) return []
  const snapshotKey = buildPreviewPartImageSnapshotKey(mode, size)
  const cached = previewPartImageSnapshotCache.get(snapshotKey)
  if (cached) return await cached
  const nextPromise = (async () => {
    const targetSize = normalizeLooseOutputSize(size)
    const parsedTargetSize = targetSize ? parseOutputSizeValue(targetSize) : null
    const partPngs = await Promise.race([
      canvasRef.value?.exportPartPngs?.(parsedTargetSize ? { width: parsedTargetSize.width, height: parsedTargetSize.height } : undefined),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Preview export timed out.")), PREVIEW_RENDER_TIMEOUT_MS)
      }),
    ])
    if (partPngs?.length) {
      return partPngs.map((item) => ({
        partName: item.part_key,
        blob: item.blob,
      }))
    }
    const partBlobs = await (canvasRef.value?.exportPartBlobs?.(size) || Promise.resolve([]))
    return partBlobs.map((item) => ({
      partName: item.partName,
      blob: item.blob,
    }))
  })()
  previewPartImageSnapshotCache.set(snapshotKey, nextPromise)
  try {
    return await nextPromise
  } catch (error) {
    previewPartImageSnapshotCache.delete(snapshotKey)
    throw error
  }
}

function buildPreviewComposeFormData(args: {
  color: string
  view: string
  size: string
  mode: PreviewSourceMode
  partImages: PreviewPartImage[]
}) {
  const form = new FormData()
  form.append("template_id", selectedTemplateId.value)
  form.append("selected_color", args.color)
  form.append("selected_view", args.view)
  form.append("output_size", args.size)
  form.append("is_preview", "true")
  if (shouldUsePublishedRuntime()) {
    form.append("published_only", "true")
    if (isStorefrontPreview.value && storefrontSlug.value) {
      form.append("storefront_slug", storefrontSlug.value)
    }
  }
  form.append("compose_overrides", JSON.stringify(editorPayload.value?.compose_params || {}))
  if (args.partImages.length) {
    form.append("part_names", args.partImages.map((item) => item.partName).join(","))
    args.partImages.forEach((item) => {
      form.append("part_images", new File([item.blob], `${item.partName}.png`, { type: "image/png" }))
    })
  }
  return form
}

async function requestPreviewCompose(args: {
  color: string
  view: string
  size: string
  mode: PreviewSourceMode
}) {
  if (!selectedTemplateId.value || !editorPayload.value || !args.color || !args.view) return null
  const signature = previewSignature(args.mode)
  const requestKey = `${previewKey(args.color, args.view, args.size, args.mode)}::${signature}`
  const pending = previewComposeRequestCache.get(requestKey)
  if (pending) return await pending
  setPreviewRequestState(args.color, args.view, args.size, args.mode, "rendering", signature)
  const nextPromise = (async () => {
    const partImages = await exportPreviewPartImages(args.mode, args.size)
    if (args.mode === "artwork" && hasArtwork.value && !partImages.length) {
      setPreviewRequestState(args.color, args.view, args.size, args.mode, "failed", signature)
      return null
    }
    const form = buildPreviewComposeFormData({ ...args, partImages })
    const controller = new AbortController()
    const timeoutId = window.setTimeout(
      () => controller.abort(new Error(t("requestTimedOutRetry"))),
      PREVIEW_RENDER_TIMEOUT_MS,
    )
    try {
      const response = await gatewayPlatformFetch<ComposeResponse>("/api/v1/runtime/editor/compose", {
        method: "POST",
        headers: authStore.authHeaders,
        body: form,
        signal: controller.signal,
      })
      const output = response.outputs[0]
      const composeFilePath = resolveComposeOutputFilePath(output)
      if (!composeFilePath) {
        setPreviewRequestState(args.color, args.view, args.size, args.mode, "failed", signature)
        console.warn("[preview] compose returned no usable file_path/preview_url", response)
        return null
      }
      const url = renderFileUrl(composeFilePath)
      return {
        response,
        url,
        filePath: composeFilePath,
        signature,
      } satisfies PreviewComposeResult
    } catch (error) {
      setPreviewRequestState(args.color, args.view, args.size, args.mode, "failed", signature)
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  })()
  previewComposeRequestCache.set(requestKey, nextPromise)
  try {
    return await nextPromise
  } finally {
    if (previewComposeRequestCache.get(requestKey) === nextPromise) {
      previewComposeRequestCache.delete(requestKey)
    }
  }
}

function commitPreviewComposeResult(args: {
  color: string
  view: string
  size: string
  mode: PreviewSourceMode
  url: string
  filePath: string
  signature: string
}) {
  setPreviewOutput(args.color, args.view, args.size, args.url, args.filePath, args.mode, args.signature)
  setPreviewRequestState(args.color, args.view, args.size, args.mode, "fresh", args.signature)
}

function resolvePreviewWarmViewOrder(views: string[], priorityView: string) {
  const normalizedViews = Array.from(new Set(views.map((view) => String(view || "").trim()).filter(Boolean)))
  const priorityIndex = normalizedViews.indexOf(priorityView)
  if (priorityIndex < 0) return normalizedViews
  const ordered = [priorityView]
  for (let offset = 1; offset < normalizedViews.length; offset += 1) {
    const right = normalizedViews[priorityIndex + offset]
    const left = normalizedViews[priorityIndex - offset]
    if (right) ordered.push(right)
    if (left) ordered.push(left)
  }
  return ordered
}

async function ensurePreviewEntryComposed(args: {
  color: string
  view: string
  size: string
  mode: PreviewSourceMode
  expectedSignature?: string
}) {
  const expectedSignature = args.expectedSignature || previewSignature(args.mode)
  if (expectedSignature !== previewSignature(args.mode)) return null
  const state = resolvePreviewRequestState(
    args.color,
    args.view,
    args.size,
    args.mode,
    args.mode !== "artwork",
  )
  if (state === "fresh" || state === "rendering") return null
  try {
    const result = await requestPreviewCompose({
      color: args.color,
      view: args.view,
      size: args.size,
      mode: args.mode,
    })
    if (!result) return null
    if (result.signature !== expectedSignature || expectedSignature !== previewSignature(args.mode)) return null
    commitPreviewComposeResult({
      color: args.color,
      view: args.view,
      size: args.size,
      mode: args.mode,
      url: result.url,
      filePath: result.filePath,
      signature: result.signature,
    })
    return result
  } catch (error) {
    console.warn("[preview] ensurePreviewEntryComposed failed", error)
    return null
  }
}

async function warmPreviewEntries(args: {
  color: string
  size: string
  mode: PreviewSourceMode
  priorityView: string
  views: string[]
  expectedSignature?: string
}) {
  const expectedSignature = args.expectedSignature || previewSignature(args.mode)
  const runToken = ++previewDialogWarmToken
  const orderedViews = resolvePreviewWarmViewOrder(args.views, args.priorityView)
    .filter((view) => view !== args.priorityView)
    .filter((view) => {
      const state = resolvePreviewRequestState(args.color, view, args.size, args.mode, args.mode !== "artwork")
      return state === "idle" || state === "stale"
    })
  if (!orderedViews.length) {
    if (viewPreviewModalOpen.value) {
      await persistOpenPreviewEntriesIfNeeded()
    }
    return
  }
  let nextIndex = 0
  const workerCount = 1
  const workers = Array.from({ length: workerCount }, () => (async () => {
    while (nextIndex < orderedViews.length) {
      if (runToken !== previewDialogWarmToken) return
      if (expectedSignature !== previewSignature(args.mode)) return
      const view = orderedViews[nextIndex]
      nextIndex += 1
      await ensurePreviewEntryComposed({
        color: args.color,
        view,
        size: args.size,
        mode: args.mode,
        expectedSignature,
      })
    }
  })())
  await Promise.allSettled(workers)
  if (runToken !== previewDialogWarmToken) return
  if (expectedSignature !== previewSignature(args.mode)) return
  if (!viewPreviewModalOpen.value) return
  await persistOpenPreviewEntriesIfNeeded()
}

function sanitizeStorageKeySegment(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "_")
}

function resolveWorkspaceStorageNamespace() {
  const roleKey = sanitizeStorageKeySegment(authStore.role || "guest")
  const tenantKey = sanitizeStorageKeySegment(
    authStore.role === "platform_admin"
      ? (readAdminTenantContext(route.query).tenantId || "")
      : (authStore.tenant?.tenant_id || ""),
  )
  const sourceKey = sanitizeStorageKeySegment(previewSource.value || "repository")
  const storefrontKey = sanitizeStorageKeySegment(storefrontSlug.value || "")
  return [roleKey, tenantKey, sourceKey, storefrontKey].filter((item) => item).join("|") || "default"
}

function resolveWorkspaceStorageSlot(draftId = activeDraftId.value) {
  return sanitizeStorageKeySegment(draftId || "blank") || "blank"
}

function getLegacyWorkspacePreferenceStorageKey(templateId: string) {
  return `${workspacePreferenceStorageKey}:${resolveWorkspaceStorageNamespace()}:${templateId}`
}

function getWorkspacePreferenceStorageKey(templateId: string, draftId = activeDraftId.value) {
  return `${workspacePreferenceStorageKey}:${resolveWorkspaceStorageNamespace()}:${templateId}:${resolveWorkspaceStorageSlot(draftId)}`
}

function getLegacyWorkspaceDesignStorageKey(templateId: string) {
  return `${workspaceDesignStorageKey}:${resolveWorkspaceStorageNamespace()}:${templateId}`
}

function getWorkspaceDesignStorageKey(templateId: string, draftId = activeDraftId.value) {
  return `${workspaceDesignStorageKey}:${resolveWorkspaceStorageNamespace()}:${templateId}:${resolveWorkspaceStorageSlot(draftId)}`
}

function getDraftPreviewImageStorageKey(templateId: string) {
  return `mockup-preview-draft-images:${resolveWorkspaceStorageNamespace()}:${templateId}`
}

function getWorkspaceDiscardedSnapshotKey() {
  return `${workspaceDiscardedSnapshotStorageKey}:${resolveWorkspaceStorageNamespace()}`
}

function buildWorkspaceDiscardedSnapshotMarker(templateId: string, draftId = activeDraftId.value) {
  return `${templateId}:${resolveWorkspaceStorageSlot(draftId)}`
}

function markDiscardedWorkspaceSnapshot(templateId: string, draftId = activeDraftId.value) {
  if (!templateId || typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      getWorkspaceDiscardedSnapshotKey(),
      buildWorkspaceDiscardedSnapshotMarker(templateId, draftId),
    )
  } catch {
    // Ignore storage failures and fall back to the browser-native leave prompt only.
  }
}

function consumeDiscardedWorkspaceSnapshot(templateId: string, draftId = activeDraftId.value) {
  if (!templateId || typeof window === "undefined") return false
  const storageKey = getWorkspaceDiscardedSnapshotKey()
  try {
    const marker = window.sessionStorage.getItem(storageKey)
    const expectedMarker = buildWorkspaceDiscardedSnapshotMarker(templateId, draftId)
    if (marker !== expectedMarker) return false
    window.sessionStorage.removeItem(storageKey)
    return true
  } catch {
    return false
  }
}

async function clearPersistedWorkspaceSnapshot(templateId: string, draftId = activeDraftId.value) {
  if (!templateId || typeof window === "undefined") return
  window.localStorage.removeItem(getWorkspacePreferenceStorageKey(templateId, draftId))
  window.localStorage.removeItem(getWorkspaceDesignStorageKey(templateId, draftId))
  window.localStorage.removeItem(getLegacyWorkspacePreferenceStorageKey(templateId))
  window.localStorage.removeItem(getLegacyWorkspaceDesignStorageKey(templateId))
  await removeIndexedDbValue(getWorkspaceDesignStorageKey(templateId, draftId))
}

function readWorkspacePreferences(templateId: string, draftId = activeDraftId.value) {
  if (!templateId || typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(getWorkspacePreferenceStorageKey(templateId, draftId))
      || window.localStorage.getItem(getLegacyWorkspacePreferenceStorageKey(templateId))
    return raw ? JSON.parse(raw) as {
      selectedColor?: string
      selectedView?: string
      selectedSize?: string
      activeSidebarTab?: SidebarTabKey
      templateLibraryScope?: PreviewTemplateScope
      templateLibraryScopePinnedByUser?: boolean
      artworkLibraryTab?: "platform" | "tenant" | "licensed" | "owned"
      backgroundColor?: string
      backgroundColors?: Record<string, string>
      batchColors?: string[]
      batchViews?: string[]
      batchSizes?: string[]
      mainPreviewView?: string
      mainPreviewColor?: string
      main_preview_view?: string
      main_preview_color?: string
      outputs?: RenderOutputEntry[]
    } : null
  } catch {
    return null
  }
}

function readDraftPreviewImages(templateId: string) {
  if (!templateId || typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(getDraftPreviewImageStorageKey(templateId))
    const parsed = raw ? JSON.parse(raw) as Record<string, string> : {}
    return Object.fromEntries(
      Object.entries(parsed || {}).filter(([draftId, url]) => (
        draftId
        && typeof url === "string"
        && url.trim()
        && isPersistentPreviewStorageValue(url)
      )),
    )
  } catch {
    return {}
  }
}

function writeDraftPreviewImages() {
  if (!selectedTemplateId.value || typeof window === "undefined") return
  const persistedImages = Object.fromEntries(
    Object.entries(draftPreviewImageMap.value).filter(([draftId, url]) => draftId && isPersistentPreviewStorageValue(url)),
  )
  safeLocalStorageSetItem(
    getDraftPreviewImageStorageKey(selectedTemplateId.value),
    JSON.stringify(persistedImages),
  )
}

function resolveCurrentDraftPreviewImage() {
  const resolvedUrl = resolveRuntimeAssetUrl(resolveMainPreviewImage({
    size: previewSize.value,
    mode: activePreviewMode(),
    allowDefaultModeFallback: activePreviewMode() !== "artwork",
    allowTemplateFallback: shouldUseDefaultPreviewFallback.value,
  }) || currentPreviewImage.value || displayPreviewImage.value || "")
  return isPersistentPreviewStorageValue(resolvedUrl) ? resolvedUrl : ""
}

async function renderPreviewForView(
  view: string,
  size: string,
  mode: PreviewSourceMode,
  color?: string,
) {
  if (!selectedTemplateId.value || !selectedColor.value || !view || !editorPayload.value) return ""
  const requestColor = color || selectedColor.value
  try {
    const result = await requestPreviewCompose({
      color: requestColor,
      view,
      size,
      mode,
    })
    if (!result) return ""
    commitPreviewComposeResult({
      color: requestColor,
      view,
      size,
      mode,
      url: result.url,
      filePath: result.filePath,
      signature: result.signature,
    })
    return result.url
  } catch {
    return ""
  }
}

async function ensurePreviewReadyForDraftSnapshot() {
  if (!selectedTemplateId.value || !selectedColor.value || !selectedView.value || !editorPayload.value) return
  const timeoutAt = Date.now() + 8000
  while (isPreviewRendering.value && Date.now() < timeoutAt) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
  }
  if (previewDirty.value && !isPreviewRendering.value) {
    await refreshVariantPreview({
      force: true,
      reason: "manual",
      queueIfBusy: false,
    })
  }
}

function setDraftPreviewImage(draftId: string, previewUrl: string) {
  const normalizedDraftId = String(draftId || "").trim()
  const normalizedPreviewUrl = String(previewUrl || "").trim()
  // 0.4.66.1: 允许在内存中临时记录 job URL (isPersistentPreviewStorageValue=false)，
  // 以便在当前 session 中 "Set as Main Image" 后能立即更新 Designs 卡片的缩略图。
  // writeDraftPreviewImages 会自动过滤掉非持久化 URL，不会写入 localStorage 污染下次加载。
  if (!normalizedDraftId || !normalizedPreviewUrl) {
    return
  }
  if (draftPreviewImageMap.value[normalizedDraftId] === normalizedPreviewUrl) return
  draftPreviewImageMap.value = {
    ...draftPreviewImageMap.value,
    [normalizedDraftId]: normalizedPreviewUrl,
  }
  writeDraftPreviewImages()
}

// 0.4.69: 立即对当前激活设计稿的主图重新渲染一次,把最新结果写入
// draftPreviewImageMap[activeDraftId],驱动 Designs 卡片缩略图 / Place Order 主图响应式刷新。
// 仅当 activeDraftId 存在且能解析出 mainPreviewView 时执行。失败仅打 warn,不阻塞 UI。
async function refreshActiveDraftMainPreviewSilently() {
  const draftId = String(activeDraftId.value || "").trim()
  if (!draftId || !selectedTemplateId.value || !editorPayload.value) return
  const mainView = String(mainPreviewView.value || "").trim()
    || resolveActiveDraftMainPreviewView()
    || selectedView.value
  const mainColor = String(mainPreviewColor.value || "").trim()
    || resolveActiveDraftMainPreviewColor()
    || selectedColor.value
  if (!mainView || !mainColor) return
  try {
    const renderedUrl = await renderPreviewForView(mainView, PREVIEW_SIZE, activePreviewMode(), mainColor)
    if (renderedUrl) {
      setDraftPreviewImage(draftId, renderedUrl)
    }
  } catch (e) {
    console.warn("[preview] refreshActiveDraftMainPreviewSilently failed", e)
  }
}

async function resolveDraftSnapshotPreviewImage(draftId: string, preferencesJson: string, fallbackPreviewUrl: string) {
  const mainView = resolveDraftMainPreviewView({ draftId, preferencesJson })
  const mainColor = resolveDraftMainPreviewColor({ draftId, preferencesJson }) || selectedColor.value
  const fallbackMainPreview = mainView
    ? resolveRuntimeAssetUrl(resolvePreviewImageForView(mainView, PREVIEW_SIZE, {
      mode: activePreviewMode(),
      allowDefaultModeFallback: true,
      allowTemplateFallback: false,
      color: mainColor,
    }))
    : ""
  if (!mainView) {
    return fallbackMainPreview || fallbackPreviewUrl
  }
  if (mainView === selectedView.value && mainColor === selectedColor.value) {
    return resolveCurrentDraftPreviewImage() || fallbackMainPreview || fallbackPreviewUrl
  }
  const renderedMainPreview = await renderPreviewForView(mainView, PREVIEW_SIZE, activePreviewMode(), mainColor)
  return renderedMainPreview || fallbackMainPreview || fallbackPreviewUrl
}

async function persistDraftContentSnapshot(args: {
  templateId?: string
  draftId?: string
  content?: Pick<PreviewDraftContent, "designJson" | "preferencesJson"> | null
  previewUrl?: string
}) {
  const templateId = String(args.templateId || "").trim()
  const draftId = String(args.draftId || "").trim()
  const content = args.content
  if (!templateId || !draftId || !content || typeof window === "undefined") return

  const parsedPreferences = parseJsonValue(content.preferencesJson, {})
  safeLocalStorageSetItem(
    getWorkspacePreferenceStorageKey(templateId, draftId),
    JSON.stringify(parsedPreferences),
  )

  const parsedDesign = parseStoredWorkspaceDesign(content.designJson) as SerializableCanvasState | null
  const { state } = normalizePersistableWorkspaceDesign(parsedDesign)
  const storageKey = getWorkspaceDesignStorageKey(templateId, draftId)
  if (!hasPersistableWorkspaceDesign(state)) {
    window.localStorage.removeItem(storageKey)
    await removeIndexedDbValue(storageKey)
  } else {
    const serializableState = state as SerializableCanvasState
    const persistedState: SerializableCanvasState = {
      version: serializableState.version,
      activePartKey: serializableState.activePartKey,
      activeLayerId: serializableState.activeLayerId,
      parts: serializableState.parts,
      persistedAt: Date.now(),
    }
    const serializedState = JSON.stringify(persistedState)
    try {
      window.localStorage.setItem(storageKey, serializedState)
    } catch {
      // Keep the IndexedDB snapshot even if localStorage quota is exhausted.
    }
    await writeIndexedDbValue(storageKey, persistedState)
  }

  const previewUrl = String(args.previewUrl || "").trim()
  if (previewUrl) {
    setDraftPreviewImage(draftId, previewUrl)
  }
}

function writeWorkspacePreferences() {
  if (!selectedTemplateId.value || typeof window === "undefined") return
  const persistedOutputs = isTenantAdmin.value
    ? []
    : renderOutputs.value.filter((entry) => isPersistentPreviewStorageValue(String(entry?.url || "")))
  // 0.4.63: WP shell 路径下 draftRecords 永远为空,resolveActiveDraftMainPreviewView()
  // 会回退到 views[0] 把"第一个 view"误写入 localStorage,导致用户 Set as Primary
  // 后关闭页面再进入,主图被还原成第一个 view。优先用 mainPreviewView/Color ref —
  // 这两个 ref 在 setSelectedPreviewAsDraftMainImage 中已被同步为用户选中的 view/color。
  const mainViewRefValue = String(mainPreviewView.value || "").trim()
  const mainColorRefValue = String(mainPreviewColor.value || "").trim()
  const persistedMainView = mainViewRefValue || resolveActiveDraftMainPreviewView()
  const persistedMainColor = mainColorRefValue || resolveActiveDraftMainPreviewColor()
  safeLocalStorageSetItem(getWorkspacePreferenceStorageKey(selectedTemplateId.value), JSON.stringify({
    selectedColor: selectedColor.value,
    selectedView: selectedView.value,
    selectedSize: selectedSize.value,
    mainPreviewView: persistedMainView,
    mainPreviewColor: persistedMainColor,
    activeSidebarTab: activeSidebarTab.value,
    templateLibraryScope: templateLibraryScope.value,
    templateLibraryScopePinnedByUser: templateLibraryScopePinnedByUser.value,
    artworkLibraryTab: artworkLibraryTab.value,
    backgroundColor: stageBackgroundColor.value,
    backgroundColors: partBackgroundColors.value,
    batchColors: selectedBatchColors.value,
    batchViews: selectedBatchViews.value,
    batchSizes: selectedBatchSizes.value,
    outputs: persistedOutputs,
  }))
}

function readWorkspaceDesign(templateId: string, draftId = activeDraftId.value) {
  if (!templateId || typeof window === "undefined") return null
  const raw = window.localStorage.getItem(getWorkspaceDesignStorageKey(templateId, draftId))
    || window.localStorage.getItem(getLegacyWorkspaceDesignStorageKey(templateId))
  return parseStoredWorkspaceDesign(raw) as SerializableCanvasState | null
}

async function readPersistedWorkspaceDesign(templateId: string, draftId = activeDraftId.value) {
  const storageKey = getWorkspaceDesignStorageKey(templateId, draftId)
  const localDesign = readWorkspaceDesign(templateId, draftId)
  const indexedDbDesign = parseStoredWorkspaceDesign(JSON.stringify(
    await readIndexedDbValue<SerializableCanvasState | null>(storageKey, null),
  )) as SerializableCanvasState | null
  const localValid = hasPersistableWorkspaceDesign(localDesign)
  const indexedValid = hasPersistableWorkspaceDesign(indexedDbDesign)
  if (localValid && indexedValid) {
    const localTimestamp = Number(localDesign?.persistedAt || 0)
    const indexedTimestamp = Number(indexedDbDesign?.persistedAt || 0)
    if (localTimestamp !== indexedTimestamp) {
      return localTimestamp >= indexedTimestamp ? localDesign : indexedDbDesign
    }
    const countLayers = (state: SerializableCanvasState | null | undefined) => (
      (state?.parts || []).reduce((total, part) => total + (Array.isArray(part.layers) ? part.layers.length : 0), 0)
    )
    return countLayers(localDesign) >= countLayers(indexedDbDesign) ? localDesign : indexedDbDesign
  }
  if (localValid) return localDesign
  if (indexedValid) return indexedDbDesign
  return indexedDbDesign
}

function isTransientImageSource(value: unknown) {
  const normalized = String(value || "").trim()
  return normalized.startsWith("blob:") || normalized.startsWith("data:")
}

function resolvePersistableLayerSources(layer: Record<string, unknown>) {
  const currentSrc = String(layer.src || "").trim()
  const currentPreviewSrc = String(layer.previewSrc || "").trim()
  let resolvedSrc = isTransientImageSource(currentSrc) ? "" : currentSrc
  let resolvedPreviewSrc = isTransientImageSource(currentPreviewSrc) ? "" : currentPreviewSrc

  const artworkId = String(layer.artworkId || "").trim()
  const layerName = String(layer.name || "").trim()
  const libraryMatchById = artworkId
    ? ownedArtworkLibrary.value.find((entry) => entry.id === artworkId) || null
    : null
  const libraryMatchesByName = !libraryMatchById && layerName
    ? ownedArtworkLibrary.value.filter((entry) => String(entry.name || "").trim() === layerName)
    : []
  const libraryMatch = libraryMatchById || (libraryMatchesByName.length === 1 ? libraryMatchesByName[0] : null)
  const matchedSrc = String(libraryMatch?.src || "").trim()
  const matchedPreviewSrc = String(libraryMatch?.previewSrc || libraryMatch?.src || "").trim()

  if (!resolvedSrc) {
    resolvedSrc = matchedSrc || matchedPreviewSrc || resolvedPreviewSrc
  }
  if (!resolvedPreviewSrc) {
    resolvedPreviewSrc = matchedPreviewSrc || resolvedSrc
  }

  if (!resolvedSrc && !resolvedPreviewSrc) {
    return null
  }
  return {
    src: resolvedSrc || resolvedPreviewSrc,
    previewSrc: resolvedPreviewSrc || resolvedSrc || undefined,
  }
}

function normalizePersistableWorkspaceDesign(state: SerializableCanvasState | null | undefined) {
  if (!state?.parts?.length) {
    return { state: state || null, changed: false }
  }
  let changed = false
  const normalizedParts = state.parts.map((part) => ({
    ...part,
    layers: part.layers.map((layer) => {
      if (!layer || typeof layer !== "object" || layer.kind !== "image") {
        return layer
      }
      const imageLayer = layer as Record<string, unknown>
      const currentSrc = String(imageLayer.src || "").trim()
      const currentPreviewSrc = String(imageLayer.previewSrc || "").trim()
      const nextSources = resolvePersistableLayerSources(imageLayer)
      if (!nextSources) {
        return layer
      }
      if (nextSources.src !== currentSrc || String(nextSources.previewSrc || "") !== currentPreviewSrc) {
        changed = true
        return {
          ...layer,
          src: nextSources.src,
          previewSrc: nextSources.previewSrc,
        }
      }
      return layer
    }),
  }))
  if (!changed) {
    return { state, changed: false }
  }
  return {
    state: {
      ...state,
      parts: normalizedParts,
    },
    changed: true,
  }
}

function hasUnpersistableImageSources(state: SerializableCanvasState | null | undefined) {
  if (!state?.parts?.length) return false
  for (const part of state.parts) {
    if (!Array.isArray(part?.layers)) continue
    for (const layer of part.layers as Array<Record<string, unknown>>) {
      if (layer?.kind !== "image") continue
      const src = String(layer.src || layer.previewSrc || "").trim()
      if (isTransientImageSource(src)) {
        return true
      }
    }
  }
  return false
}

async function persistWorkspaceDesign(templateId = selectedTemplateId.value) {
  if (!templateId || typeof window === "undefined") return
  const rawState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  const { state, changed } = normalizePersistableWorkspaceDesign(rawState)
  const storageKey = getWorkspaceDesignStorageKey(templateId)
  if (!hasPersistableWorkspaceDesign(state)) {
    window.localStorage.removeItem(storageKey)
    await removeIndexedDbValue(storageKey)
    return
  }
  if (hasUnpersistableImageSources(state)) {
    loadError.value = t("imageLayersMustBeUploaded")
    return
  }
  if (!state) return
  const serializableState = state as SerializableCanvasState
  const persistedState: SerializableCanvasState = {
    version: serializableState.version,
    activePartKey: serializableState.activePartKey,
    activeLayerId: serializableState.activeLayerId,
    parts: serializableState.parts,
    persistedAt: Date.now(),
  }
  const serializedState = JSON.stringify(persistedState)
  try {
    window.localStorage.setItem(storageKey, serializedState)
  } catch {
    // Uploaded image layers can exceed localStorage quota; keep the design in IndexedDB.
  }
  await writeIndexedDbValue(storageKey, persistedState)
  if (changed) {
    loadError.value = ""
  }
}

function writeWorkspaceDesign() {
  void persistWorkspaceDesign()
}

function extractUploadArtworkEntriesFromDesign(state: SerializableCanvasState | null | undefined) {
  if (!state?.parts?.length) return [] as ArtworkLibraryEntry[]
  const derivedEntries = new Map<string, ArtworkLibraryEntry>()
  for (const part of state.parts) {
    if (!Array.isArray(part?.layers)) continue
    for (const layer of part.layers as Array<Record<string, unknown>>) {
      if (layer?.kind !== "image") continue
      const libraryScope = String(layer.libraryScope || "").trim().toLowerCase()
      if (libraryScope && libraryScope !== "owned") continue
      const src = String(layer.src || layer.previewSrc || "").trim()
      if (!src.startsWith("data:image/")) continue
      const id = String(layer.id || "").trim() || src
      derivedEntries.set(src, {
        id,
        name: String(layer.name || "Uploaded artwork").trim() || "Uploaded artwork",
        src,
        createdAt: new Date().toISOString(),
      })
    }
  }
  return Array.from(derivedEntries.values())
}

function mergeArtworkLibraryEntries(
  currentEntries: ArtworkLibraryEntry[],
  derivedEntries: ArtworkLibraryEntry[],
) {
  if (!derivedEntries.length) return currentEntries
  const merged = new Map<string, ArtworkLibraryEntry>()
  const existingSources = new Set<string>()
  for (const entry of currentEntries) {
    const key = entry.id || entry.src
    if (!key) continue
    merged.set(key, entry)
    if (entry.src) {
      existingSources.add(entry.src)
    }
  }
  for (const entry of derivedEntries) {
    const key = entry.id || entry.src
    const sourceKey = String(entry.src || "").trim()
    if (
      !key
      || merged.has(key)
      || hiddenOwnedArtworkIds.value.includes(key)
      || (!!sourceKey && existingSources.has(sourceKey))
    ) continue
    merged.set(key, entry)
    if (sourceKey) {
      existingSources.add(sourceKey)
    }
  }
  return Array.from(merged.values()).sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || "") || 0
    const rightTime = Date.parse(right.createdAt || "") || 0
    return rightTime - leftTime
  })
}

async function restoreWorkspaceDesign(templateId: string, overrideDesign?: SerializableCanvasState | null) {
  const rawSavedDesign = overrideDesign === undefined
    ? await readPersistedWorkspaceDesign(templateId)
    : overrideDesign
  const { state: savedDesign } = normalizePersistableWorkspaceDesign(rawSavedDesign)
  const hasSavedDesign = hasPersistableWorkspaceDesign(savedDesign)
  const restorablePartKey = savedDesign?.activePartKey
  if (restorablePartKey && partOptions.value.some((part) => part.part_name === restorablePartKey)) {
    selectedPartKey.value = restorablePartKey
  }
  await nextTick()
  await canvasRef.value?.restoreSerializableState?.(savedDesign)
  refreshLayerOptions()
  refreshPartLayerCounts()
  return {
    hasSavedDesign,
  }
}

function createOutputId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `output-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDraftUpdatedAt(value: string) {
  const timestamp = Date.parse(value || "")
  if (!timestamp) return "-"
  return new Date(timestamp).toLocaleString()
}

function resolveOutputSourceLabel(source?: RenderOutputEntry["source"]) {
  if (source === "preview" || source === "draft_save") return t("quickPreview")
  if (source === "download_zip") return t("downloadZip")
  return t("export")
}

function normalizeRenderOutputSource(rawSource: unknown): RenderOutputEntry["source"] {
  const normalized = String(rawSource || "").trim().toLowerCase()
  if (!normalized) return "export"
  if (normalized === "preview" || normalized === "open-preview") return "preview"
  if (normalized === "draft_save" || normalized === "draft-save" || normalized === "preview_cache") return "draft_save"
  if (normalized === "download_zip" || normalized === "download-zip" || normalized === "zip") return "download_zip"
  return "export"
}

function isPreviewCacheOutputSource(source?: RenderOutputEntry["source"]) {
  return source === "preview" || source === "draft_save"
}

function isResultsOutputSource(source?: RenderOutputEntry["source"]) {
  return source === "export" || source === "download_zip"
}

function resolvePreviewResultEntry(view: string): RenderOutputEntry | null {
  const normalizedSize = normalizeOutputSize(OPEN_PREVIEW_SIZE) || PREVIEW_SIZE
  const filePath = resolvePreviewFilePathForView(view, normalizedSize, {
    mode: openPreviewMode.value,
    allowDefaultModeFallback: openPreviewMode.value !== "artwork",
  })
  const url = resolvePreviewImageForView(view, normalizedSize, {
    mode: openPreviewMode.value,
    allowDefaultModeFallback: openPreviewMode.value !== "artwork",
    allowTemplateFallback: false,
  })
  if (!url || !filePath) return null
  return {
    id: createOutputId(),
    color: selectedColor.value,
    view,
    size: normalizedSize,
    filePath,
    url,
    createdAt: new Date().toISOString(),
    // 用户从 View Preview 主动 "Add to Results" 的条目应被视为正式 results（export 源），
    // 否则会被 setRenderOutputs 的 isResultsOutputSource 过滤掉，导致 results 始终是 0。
    source: "export",
  }
}

function hasExistingRenderOutput(entry: Pick<RenderOutputEntry, "source" | "color" | "view" | "size" | "filePath">) {
  const nextKey = buildRenderOutputKey(entry)
  return renderOutputs.value.some((item) => buildRenderOutputKey(item) === nextKey)
}

async function confirmPreviewResultsSelection() {
  if (isAddingPreviewResults.value) return
  const entries = selectedPreviewResultViews.value
    .map((view) => resolvePreviewResultEntry(view))
    .filter((entry): entry is RenderOutputEntry => Boolean(entry))
    .filter((entry) => !hasExistingRenderOutput(entry))
  if (!entries.length) {
    closePreviewResultsSelectionModal()
    return
  }
  isAddingPreviewResults.value = true
  previewResultsActionNotice.value = t("previewResultsAddingHint")
  await nextTick()
  try {
    await mergeOutputs(entries, { waitForPersistence: true })
    previewResultsActionNotice.value = formatPreviewMessage("previewResultsAddedCount", { count: String(entries.length) })
    closePreviewResultsSelectionModal(true)
  } finally {
    isAddingPreviewResults.value = false
  }
}

function resolveRenderOutputSize(raw: Record<string, unknown>) {
  const candidateKeys = [
    "size",
    "output_size",
    "outputSize",
    "requested_size",
    "requestedSize",
    "render_size",
    "renderSize",
    "target_size",
    "targetSize",
    "final_size",
    "finalSize",
    "template_size",
    "templateSize",
  ] as const
  for (const key of candidateKeys) {
    const normalized = normalizeLooseOutputSize(String(raw[key] || "").trim())
    if (normalized) return normalized
  }
  const width = Number(
    raw.width
    || raw.output_width
    || raw.outputWidth
    || raw.rendered_width
    || raw.renderedWidth
    || raw.final_width
    || raw.finalWidth
    || 0,
  )
  const height = Number(
    raw.height
    || raw.output_height
    || raw.outputHeight
    || raw.rendered_height
    || raw.renderedHeight
    || raw.final_height
    || raw.finalHeight
    || 0,
  )
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return `${Math.round(width)}x${Math.round(height)}`
  }
  return ""
}

function normalizeRenderOutputEntry(value: unknown): RenderOutputEntry | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const filePath = String(raw.filePath || raw.file_path || "").trim()
  const rawUrl = String(raw.url || raw.previewUrl || raw.preview_url || "").trim()
  // 防御历史 DB 数据：file_path === "undefined" / 空字符串、或 url 为
  // ".../render/file?path=undefined" 这种死链 → 直接丢弃，避免 designs 弹窗渲染空图。
  if (!filePath || filePath === "undefined" || filePath === "null") {
    return null
  }
  // Bug 3 加固：rawUrl 解析失败时回退到 filePath，避免 export 结果因 url 为空被丢弃
  let resolvedUrl = rawUrl ? resolveAssetUrl(rawUrl) : renderFileUrl(filePath)
  // 0.4.66: 历史落库的 outputs 数据可能带有过期的 runtime job 临时 URL (例如 ea7ed9811387)。
  // 如果 resolvedUrl 是不该持久化的临时 URL,应当强制回退到 filePath (因为此时文件已经在 OSS)。
  // 这能自动"修复"前端显示时遇到的 job 404 问题。
  if (resolvedUrl && !isPersistentPreviewStorageValue(resolvedUrl)) {
    resolvedUrl = renderFileUrl(filePath)
    // 0.4.66.1: WP shell 下以前可能把 job url 兜底存进了 file_path。
    // 如果回退后的 resolvedUrl 还是不持久的 job url，则直接丢弃这个 output，让前端重新渲染。
    if (resolvedUrl && !isPersistentPreviewStorageValue(resolvedUrl)) {
      resolvedUrl = ""
    }
  }
  if (!resolvedUrl) {
    resolvedUrl = renderFileUrl(filePath)
    if (resolvedUrl && !isPersistentPreviewStorageValue(resolvedUrl)) {
      resolvedUrl = ""
    }
  }
  const normalizedSize = resolveRenderOutputSize(raw) || PREVIEW_SIZE
  if (!resolvedUrl) {
    return null
  }
  const resolvedSource = normalizeRenderOutputSource(raw.output_source || raw.source)
  return {
    id: String(raw.id || raw.outputId || raw.output_id || createOutputId()),
    mode: String(raw.mode || "").trim() === "artwork" ? "artwork" : "default",
    color: String(raw.color || "").trim(),
    view: String(raw.view || "").trim(),
    size: normalizedSize,
    filePath,
    url: resolvedUrl,
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
    draftId: String(raw.draftId || raw.draft_id || "").trim(),
    designSignature: String(raw.designSignature || raw.design_signature || "").trim(),
    source: resolvedSource,
  }
}

function buildRenderOutputKey(entry: Pick<RenderOutputEntry, "source" | "color" | "view" | "size" | "filePath"> & { id?: string }) {
  // results 类输出（export / download_zip）每条独立保存（按 id 区分），
  // 避免相同视角重复导出时被合并；preview / draft_save 仍按内容去重。
  const source = String(entry.source || "export").trim()
  if (source === "export" || source === "download_zip") {
    const id = String((entry as { id?: string }).id || "").trim()
    if (id) return `${source}::id::${id}`
  }
  return [
    source,
    String(entry.color || "").trim(),
    String(entry.view || "").trim(),
    normalizeLooseOutputSize(entry.size) || String(entry.size || "").trim() || PREVIEW_SIZE,
    String(entry.filePath || "").trim(),
  ].join("::")
}

function dedupeRenderOutputs(entries: unknown[]) {
  const seen = new Set<string>()
  const normalized: RenderOutputEntry[] = []
  entries.forEach((entry) => {
    const next = normalizeRenderOutputEntry(entry)
    if (!next) return
    const key = buildRenderOutputKey(next)
    if (!key || seen.has(key)) return
    seen.add(key)
    normalized.push(next)
  })
  return normalized
}

function setRenderOutputs(entries: unknown[]) {
  renderOutputs.value = dedupeRenderOutputs(entries)
  writeWorkspacePreferences()
}

function resolveWorkspaceOutputs(raw: unknown) {
  if (!raw || typeof raw !== "object") return [] as RenderOutputEntry[]
  const outputs = (raw as { outputs?: unknown }).outputs
  return Array.isArray(outputs) ? dedupeRenderOutputs(outputs) : []
}

const isTenantAdmin = computed(() => authRole.value === "tenant_admin")
const isReadOnlyPreview = computed(() => !isTenantAdmin.value)

function parseJsonValue<T>(raw: string, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function buildDraftPreferencesPayload() {
  // 0.4.69: 仅当用户显式 "Set as Main Image" (mainPreviewView/Color ref 非空)
  // 才把它写入 preferences;否则置空,让 resolveDraftMainPreviewView fallback 到
  // selectedView,避免 cart 主图被锁死成第一个视角。
  const explicitMainView = String(mainPreviewView.value || "").trim()
  const explicitMainColor = String(mainPreviewColor.value || "").trim()
  return {
    selectedColor: selectedColor.value,
    selectedView: selectedView.value,
    selectedSize: selectedSize.value,
    mainPreviewView: explicitMainView,
    mainPreviewColor: explicitMainColor,
    finishedProductCode: currentFinishedProductCode.value,
    activeSidebarTab: activeSidebarTab.value,
    templateLibraryScope: templateLibraryScope.value,
    templateLibraryScopePinnedByUser: templateLibraryScopePinnedByUser.value,
    artworkLibraryTab: artworkLibraryTab.value,
    backgroundColors: partBackgroundColors.value,
    batchColors: selectedBatchColors.value,
    batchViews: selectedBatchViews.value,
    batchSizes: selectedBatchSizes.value,
  }
}

function buildCurrentServerSaveSignature() {
  return `${canvasSignature.value}::${JSON.stringify(buildDraftPreferencesPayload())}`
}

// 用于 dirty 检测的签名:仅包含"真正影响设计稿保存内容"的字段。
// 排除纯 UI 切换状态(activeSidebarTab / templateLibraryScope* / artworkLibraryTab /
// selectedColor / selectedView / selectedSize / batchColors / batchViews / batchSizes),
// 避免用户仅切换视角/颜色/侧边栏 tab 即被误报 "Unsaved Changes"。
function buildDirtyDetectionSignature() {
  const explicitMainView = String(mainPreviewView.value || "").trim()
  const explicitMainColor = String(mainPreviewColor.value || "").trim()
  const dirtyPayload = {
    mainPreviewView: explicitMainView,
    mainPreviewColor: explicitMainColor,
    finishedProductCode: currentFinishedProductCode.value,
    backgroundColors: partBackgroundColors.value,
  }
  return `${canvasSignature.value}::${JSON.stringify(dirtyPayload)}`
}

function buildCurrentPreviewCacheDesignSignature() {
  const backgroundSignature = Object.entries(partBackgroundColors.value)
    .filter(([, value]) => String(value || "").trim())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([partKey, value]) => `${partKey}:${value}`)
    .join("|")
  const raw = [
    String(canvasSignature.value || "").trim() || "__canvas__",
    backgroundSignature || "__background__",
  ].join("::")
  // 任何拼接后的签名都通过哈希压缩到定长 hex，彻底规避 DB 列长度问题
  return hashSignatureToHex(raw)
}

// 统一的签名哈希：FNV-1a 64bit 二轮（同步、无外部依赖、64 hex 定长），
// 避免设计稿任意字段拼接导致 design_signature/dedupe_key 超过列长度上限
function hashSignatureToHex(input: string): string {
  const text = String(input == null ? "" : input)
  if (!text) return ""
  // 二轮 FNV-1a：分别用不同 seed 拼成 128-bit 抗碰撞 hex（32 chars）
  const fnv = (seedHi: number, seedLo: number) => {
    let hi = seedHi >>> 0
    let lo = seedLo >>> 0
    for (let i = 0; i < text.length; i += 1) {
      const c = text.charCodeAt(i) & 0xff
      lo ^= c
      // 64bit FNV prime: 0x100000001b3 ≈ (lo*0x1b3 + hi*low part) ...
      // 用 32x32 拆分实现：multiplier = 0x01000193 (32-bit FNV prime)
      const a = Math.imul(lo, 0x01000193)
      const b = Math.imul(hi, 0x01000193)
      lo = a >>> 0
      hi = (b + ((Math.imul(c, 0x01000193) >>> 16) & 0xffff)) >>> 0
    }
    return ((hi >>> 0).toString(16).padStart(8, "0") + (lo >>> 0).toString(16).padStart(8, "0"))
  }
  const head = fnv(0x811c9dc5, 0xcbf29ce4)
  const tail = fnv(0x9e3779b9, 0x85ebca6b)
  return head + tail
}

async function buildCurrentDraftContentPayload(): Promise<PreviewDraftContent | null> {
  const rawState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
  const { state } = normalizePersistableWorkspaceDesign(rawState)
  if (hasUnpersistableImageSources(state)) {
    loadError.value = t("imageLayersMustBeUploaded")
    return null
  }
  // 按 Part 导出独立 SVG（Fabric 原生 toSVG）。任一 Part 失败 → throw 终止保存，
  // 上层调用者捕获后通过 showSaveNotice 弹出含 part_key 的中文错误，且不发起后端请求。
  let partsSvg: PreviewDraftContent["partsSvg"] | undefined
  if (typeof canvasRef.value?.exportPartSvgs === "function") {
    try {
      const exported = await canvasRef.value.exportPartSvgs()
      partsSvg = Array.isArray(exported)
        ? exported.map((item) => ({
            partKey: String(item.part_key || ""),
            svgXml: String(item.svg_xml || ""),
            contentHash: String(item.content_hash || ""),
          }))
        : []
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const partKeyMatch = message.match(/part "([^"]+)"/)
      const partKey = partKeyMatch ? partKeyMatch[1] : ""
      const noticeMessage = partKey
        ? `导出 Part ${partKey} 失败：${message}`
        : `导出 Part SVG 失败：${message}`
      loadError.value = noticeMessage
      showSaveNotice(noticeMessage)
      throw error
    }
  }
  return {
    designJson: JSON.stringify(state || {}),
    preferencesJson: JSON.stringify(buildDraftPreferencesPayload()),
    signature: buildCurrentServerSaveSignature(),
    finishedProductCode: currentFinishedProductCode.value,
    previewUrl: resolveCurrentDraftPreviewImage() || (activeDraftId.value ? draftPreviewImageMap.value[activeDraftId.value] : ""),
    ...(partsSvg ? { partsSvg } : {}),
  }
}

async function buildNewDraftContentPayload(): Promise<PreviewDraftContent | null> {
  const content = await buildCurrentDraftContentPayload()
  if (!content) return null
  const nextPreferences = parseJsonValue<Record<string, unknown>>(content.preferencesJson, {})
  nextPreferences.finishedProductCode = ""
  return {
    ...content,
    preferencesJson: JSON.stringify(nextPreferences),
    finishedProductCode: "",
  }
}

function isBlankDraftContent(content: PreviewDraftContent | null | undefined) {
  if (!content) return true
  const design = parseJsonValue<SerializableCanvasState | null>(content.designJson || "", null)
  if (hasPersistableWorkspaceDesign(design)) return false
  const preferences = parseJsonValue<Record<string, unknown>>(content.preferencesJson || "", {})
  const backgroundColors = preferences.backgroundColors && typeof preferences.backgroundColors === "object"
    ? preferences.backgroundColors as Record<string, unknown>
    : {}
  const hasBackgroundColor = Object.values(backgroundColors).some((value) => String(value || "").trim())
  return !String(content.finishedProductCode || preferences.finishedProductCode || "").trim()
    && !String(preferences.mainPreviewView || "").trim()
    && !String(preferences.mainPreviewColor || "").trim()
    && !hasBackgroundColor
}

function markServerDraftDirty() {
  if (isInitializingWorkspace) return
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  previewDraftStore.syncDirtySignature(buildDirtyDetectionSignature())
}

async function flushWorkspaceEditingState() {
  canvasRef.value?.stopTextEditing?.()
  writeWorkspacePreferences()
  writeWorkspaceDesign()
  await nextTick()
  markServerDraftDirty()
}

function applyDraftPreferences(raw: unknown) {
  if (!raw || typeof raw !== "object") return
  const prefs = raw as Record<string, unknown>
  currentFinishedProductCode.value = extractPreviewDraftFinishedProductCode(prefs)
  const nextSidebarTab = String(prefs.active_sidebar_tab || prefs.activeSidebarTab || "").trim()
  if (nextSidebarTab && ["products", "template", "artwork", "text", "layers", "background", "svg"].includes(nextSidebarTab)) {
    activeSidebarTab.value = nextSidebarTab as SidebarTabKey
  }
  const nextTemplateScope = String(prefs.template_library_scope || prefs.templateLibraryScope || "").trim()
  if (nextTemplateScope && visibleTemplateScopes.value.includes(nextTemplateScope as PreviewTemplateScope)) {
    templateLibraryScope.value = nextTemplateScope as PreviewTemplateScope
  }
  if (typeof (prefs.template_library_scope_pinned_by_user ?? prefs.templateLibraryScopePinnedByUser) === "boolean") {
    templateLibraryScopePinnedByUser.value = Boolean(prefs.template_library_scope_pinned_by_user ?? prefs.templateLibraryScopePinnedByUser)
  }
  const nextArtworkTab = String(prefs.artwork_library_tab || prefs.artworkLibraryTab || "").trim()
  if (nextArtworkTab && ["platform", "tenant", "licensed", "owned"].includes(nextArtworkTab)) {
    artworkLibraryTab.value = nextArtworkTab as never
  }
  const nextColor = String(prefs.selected_color || prefs.selectedColor || "").trim()
  if (nextColor && editorPayload.value?.colors?.includes(nextColor)) {
    selectedColor.value = nextColor
  }
  const nextView = String(prefs.selected_view || prefs.selectedView || "").trim()
  if (nextView && editorPayload.value?.views?.includes(nextView)) {
    selectedView.value = nextView
  }
  const nextSize = String(prefs.selected_size || prefs.selectedSize || "").trim()
  if (nextSize) {
    selectedSize.value = nextSize
  }
  // 0.4.59: 反哺 mainPreviewView/Color ref,使 View Preview 主图标志在
  // reload / 切换 draft 后基于持久化的 preferences,而非默认 view[0]。
  const nextMainPreviewView = String(prefs.mainPreviewView ?? prefs.main_preview_view ?? "").trim()
  if (nextMainPreviewView && editorPayload.value?.views?.includes(nextMainPreviewView)) {
    mainPreviewView.value = nextMainPreviewView
  }
  const nextMainPreviewColor = String(prefs.mainPreviewColor ?? prefs.main_preview_color ?? "").trim()
  if (nextMainPreviewColor && editorPayload.value?.colors?.includes(nextMainPreviewColor)) {
    mainPreviewColor.value = nextMainPreviewColor
  }
  const rawBackgroundColors = prefs.background_colors ?? prefs.backgroundColors
  if (rawBackgroundColors && typeof rawBackgroundColors === "object") {
    partBackgroundColors.value = Object.fromEntries(
      Object.entries(rawBackgroundColors as Record<string, unknown>)
        .filter(([partKey, value]) => partKey && typeof value === "string")
        .map(([partKey, value]) => [partKey, value as string] as const),
    )
  }
  const rawBatchColors = Array.isArray(prefs.batch_colors) ? prefs.batch_colors : (Array.isArray(prefs.batchColors) ? prefs.batchColors : null)
  if (rawBatchColors && editorPayload.value?.colors?.length) {
    const allowed = new Set(editorPayload.value.colors)
    const next = rawBatchColors.map((item) => String(item || "").trim()).filter((item) => allowed.has(item))
    if (next.length) {
      selectedBatchColors.value = Array.from(new Set(next))
    }
  }
  const rawBatchViews = Array.isArray(prefs.batch_views) ? prefs.batch_views : (Array.isArray(prefs.batchViews) ? prefs.batchViews : null)
  if (rawBatchViews && editorPayload.value?.views?.length) {
    const allowed = new Set(editorPayload.value.views)
    const next = rawBatchViews.map((item) => String(item || "").trim()).filter((item) => allowed.has(item))
    if (next.length) {
      selectedBatchViews.value = Array.from(new Set(next))
    }
  }
  const rawBatchSizes = Array.isArray(prefs.batch_sizes) ? prefs.batch_sizes : (Array.isArray(prefs.batchSizes) ? prefs.batchSizes : null)
  if (rawBatchSizes) {
    const next = rawBatchSizes.map((item) => String(item || "").trim()).filter((item) => item)
    if (next.length) {
      selectedBatchSizes.value = Array.from(new Set(next))
    }
  }
}

function resolveDraftFinishedProductCode(record: {
  draftId?: string
  finishedProductCode?: string
  preferencesJson?: string
} | null | undefined) {
  return extractPreviewDraftFinishedProductCode(record?.finishedProductCode || record?.preferencesJson || "")
}

async function ensurePreviewDraftSessionLoaded(options?: { forceReload?: boolean }) {
  if (!selectedTemplateId.value) return false
  return previewDraftStore.ensureTemplateSession(selectedTemplateId.value, options)
}

function resolvePreviewDraftFailureMessage(fallbackMessage: string) {
  return previewDraftStore.lastDraftsError || loadError.value || fallbackMessage
}

async function ensurePreviewDraftSessionReady(options?: {
  forceReload?: boolean
  allowDraftlessFallback?: boolean
  showNotice?: boolean
}) {
  if (!selectedTemplateId.value) return false
  const loaded = await ensurePreviewDraftSessionLoaded({ forceReload: options?.forceReload })
  if (loaded) return true
  const message = resolvePreviewDraftFailureMessage(t("saveFailed"))
  loadError.value = message
  if (options?.showNotice) {
    showSaveNotice(message)
  }
  return Boolean(options?.allowDraftlessFallback && !activeDraftId.value)
}

function syncCurrentFinishedProductCodeFromDraft(draftId: string) {
  if (!draftId) return
  const record = draftRecords.value.find((item) => item.draftId === draftId)
  const finishedProductCode = resolveDraftFinishedProductCode(record)
  if (!finishedProductCode) return
  currentFinishedProductCode.value = finishedProductCode
  previewDraftStore.markSaved(buildDirtyDetectionSignature())
}

function beginRenameDraft(draft: { draftId: string; draftName: string }) {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  previewDraftStore.beginRenameDraft({
    draftId: draft.draftId,
    tenantId: "",
    templateId: selectedTemplateId.value,
    draftName: draft.draftName || "",
    designJson: "",
    preferencesJson: "",
    previewUrl: "",
    status: "",
    createdAt: "",
    updatedAt: "",
  })
}

function cancelRenameDraft() {
  previewDraftStore.cancelRenameDraft()
}

async function confirmRenameDraft() {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  await previewDraftStore.confirmRenameDraft()
}

async function openDraftsPanel() {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  if (!await ensurePreviewDraftSessionReady({ showNotice: true })) return
  if (draftsModalOpen.value) {
    previewDraftStore.closeDraftsModal()
    await nextTick()
  }
  previewDraftStore.openDraftsModal()
  // 0.4.68: 每次打开 Designs 弹窗时强制从服务端重新拉取一次 drafts,
  // 把每条 record 最新落库的 previewUrl 同步到 draftPreviewImageMap,
  // 保证用户在另一处"Set as Main Image"或重新渲染后,卡片缩略图立即可见最新主图。
  if (selectedTemplateId.value) {
    try {
      // 0.4.69: 保留当前 workspace 的实际激活态。mall 嵌入式 reload 默认进入空白工作区
      // (activeDraftId 为空); loadServerDrafts() 会用服务端 active_draft_id 覆盖回 activeDraftId,
      // 导致 Designs 卡片把上一次的 draft 错误地显示成 "active",按钮禁用,无法点 Switch 切换。
      // 这里在重拉后强制还原本地真实激活态。
      const previousActiveDraftId = activeDraftId.value
      await previewDraftStore.loadServerDrafts(selectedTemplateId.value)
      if (activeDraftId.value) {
        lastServerActiveDraftId.value = activeDraftId.value
      }
      if (activeDraftId.value !== previousActiveDraftId) {
        activeDraftId.value = previousActiveDraftId
      }
      draftRecords.value.forEach((record) => {
        if (record.draftId && record.previewUrl) {
          setDraftPreviewImage(record.draftId, record.previewUrl)
        }
      })
    } catch (e) {
      console.warn("[preview] openDraftsPanel reload server drafts failed", e)
    }
  }
}

async function restoreDraftRecord(record: typeof draftRecords.value[number] | null) {
  if (!record || !selectedTemplateId.value) {
    return { hasSavedDesign: false }
  }
  const previousInitializingWorkspace = isInitializingWorkspace
  let restoreResult: { hasSavedDesign: boolean } = { hasSavedDesign: false }
  let shouldRefreshSelectedViewPreview = false
  isInitializingWorkspace = true
  try {
    activeDraftId.value = record.draftId
    previewOutputs.value = {}
    // 0.4.56: 服务端 record.previewUrl 是上次保存时用户最后选择的"主图",
    // reload 时优先回填到 draftPreviewImageMap,避免主图被默认 view/color 缩略图覆盖。
    if (record.previewUrl) {
      setDraftPreviewImage(record.draftId, record.previewUrl)
    }
    const discardUnsavedSnapshot = consumeDiscardedWorkspaceSnapshot(selectedTemplateId.value, record.draftId)
    if (discardUnsavedSnapshot) {
      await clearPersistedWorkspaceSnapshot(selectedTemplateId.value, record.draftId)
    }
    const storedPreferences = discardUnsavedSnapshot
      ? null
      : readWorkspacePreferences(selectedTemplateId.value, record.draftId)
    const serverPreferences = record.preferencesJson ? parseJsonValue(record.preferencesJson, {}) : {}
    const preferences = {
      ...serverPreferences,
      ...(storedPreferences || {}),
    }
    const persistedDesign = discardUnsavedSnapshot
      ? null
      : await readPersistedWorkspaceDesign(selectedTemplateId.value, record.draftId)
    const serverDesign = record.designJson
      ? (parseStoredWorkspaceDesign(record.designJson) as SerializableCanvasState | null)
      : null
    const overrideDesign = hasPersistableWorkspaceDesign(persistedDesign) ? persistedDesign : serverDesign
    applyDraftPreferences(preferences)
    const restoredMainPreviewView = resolveDraftMainPreviewView({
      draftId: record.draftId,
      preferencesJson: JSON.stringify(preferences),
    })
    const restoredMainPreviewColor = resolveDraftMainPreviewColor({
      draftId: record.draftId,
      preferencesJson: JSON.stringify(preferences),
    })
    if (restoredMainPreviewView && editorPayload.value?.views?.includes(restoredMainPreviewView)) {
      selectedView.value = restoredMainPreviewView
    }
    if (restoredMainPreviewColor && editorPayload.value?.colors?.includes(restoredMainPreviewColor)) {
      selectedColor.value = restoredMainPreviewColor
    }
    // 0.4.59: 切换 draft 时显式将 mainPreviewView/Color ref 同步到当前 record 的解析结果,
    // 避免老 draft 的 preferences 没有 mainPreview 字段时,ref 残留上一个 draft 的值。
    if (restoredMainPreviewView && editorPayload.value?.views?.includes(restoredMainPreviewView)) {
      mainPreviewView.value = restoredMainPreviewView
    }
    if (restoredMainPreviewColor && editorPayload.value?.colors?.includes(restoredMainPreviewColor)) {
      mainPreviewColor.value = restoredMainPreviewColor
    }
    restoreResult = await restoreWorkspaceDesign(selectedTemplateId.value, overrideDesign)
    if (!currentFinishedProductCode.value) {
      currentFinishedProductCode.value = resolveDraftFinishedProductCodeLabel(record)
    }
    const currentPreviewCacheSignature = buildCurrentPreviewCacheDesignSignature()
    previewDraftStore.markSaved(buildDirtyDetectionSignature())
    await loadDraftPreviewCacheOutputs(record.draftId, currentPreviewCacheSignature, {
      syncResults: true,
    })
    const restorePreviewMode = resolveRestorePreviewMode({
      hasSavedDesign: restoreResult.hasSavedDesign,
      hasArtwork: hasArtwork.value,
      canvasSignature: canvasSignature.value,
    })
    if (restorePreviewMode) {
      previewMode.value = restorePreviewMode
      shouldRefreshSelectedViewPreview = !isPreviewCurrent(
        selectedColor.value,
        selectedView.value,
        previewSize.value,
        restorePreviewMode,
      )
    }
  } finally {
    isInitializingWorkspace = previousInitializingWorkspace
  }
  // 0.4.56: deserialize 期间 selectedColor/selectedView/finishedProductCode 的变化会触发
  // `buildDraftPreferencesPayload` watch -> markServerDraftDirty。该 watch 异步 flush,
  // 可能在 isInitializingWorkspace 已经重置后才执行,导致激活 draft 后立即被误判为 Unsaved。
  // 这里 nextTick 后用最新签名再次 markSaved,把 watch 误触发的 dirty 重置回去。
  await nextTick()
  previewDraftStore.markSaved(buildDirtyDetectionSignature())
  if (shouldRefreshSelectedViewPreview) {
    scheduleSelectedViewPreview(50, { reason: "restore" })
  }
  return restoreResult
}

async function saveCurrentDraftChanges(options?: { showNotice?: boolean; draftName?: string }) {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return false
  if (!selectedTemplateId.value || !activeDraftId.value) return false
  await flushWorkspaceEditingState()
  await ensurePreviewReadyForDraftSnapshot()
  let content: PreviewDraftContent | null
  try {
    content = await buildCurrentDraftContentPayload()
  } catch {
    // exportPartSvgs 抛错时 buildCurrentDraftContentPayload 已弹出 Toast，此处终止保存即可。
    return false
  }
  if (!content) {
    if (options?.showNotice && loadError.value) showSaveNotice(loadError.value)
    return false
  }
  // 0.4.56: 在调用 overwriteActiveDraft 之前先解析出当前激活设计稿的"主图"（mainPreviewView/Color），
  // 把它作为 content.previewUrl 写入服务端 payload,确保关闭页面再次打开同一 draft 时主图能从服务端回填。
  const resolvedPreviewUrl = await resolveDraftSnapshotPreviewImage(
    activeDraftId.value,
    content.preferencesJson,
    resolveCurrentDraftPreviewImage(),
  )
  if (resolvedPreviewUrl) {
    content.previewUrl = resolvedPreviewUrl
  }
  const result = await previewDraftStore.overwriteActiveDraft(
    content,
    options?.draftName || (previewDraftStore.activeDraftRecord?.draftName || DEFAULT_PREVIEW_DRAFT_NAME),
  )
  if (result.saved) {
    // store 内部 markSaved 用的是 content.signature(包含全部 preferences),
    // 这里再用 buildDirtyDetectionSignature 覆盖 baseline,保证后续 UI-only 切换不会被误判 dirty。
    previewDraftStore.markSaved(buildDirtyDetectionSignature())
    closeSaveRelatedDialogs()
    // 立即把当前主图写入 draftPreviewImageMap,让 Designs 卡片缩略图 +
    // Place Order 主图(均依赖该字典)即时响应式刷新,无需等待 resolveDraftSnapshotPreviewImage。
    const immediatePreviewUrl = resolveCurrentDraftPreviewImage()
    if (immediatePreviewUrl) {
      setDraftPreviewImage(result.draftId, immediatePreviewUrl)
    }
    if (resolvedPreviewUrl) {
      setDraftPreviewImage(result.draftId, resolvedPreviewUrl)
    }
    await persistDraftContentSnapshot({
      templateId: selectedTemplateId.value,
      draftId: result.draftId,
      content,
      previewUrl: resolvedPreviewUrl,
    })
    await renderAndPersistDraftOutputs({
      draftId: result.draftId,
      finishedProductCode: currentFinishedProductCode.value,
      // 0.4.69 (Plan §1.2): 强制渲染主图视角/颜色,确保 server record.preview_url
      // 在保存后立即指向稳定 OSS runtime-assets URL,Designs/Place Order 弹窗下次打开
      // 直接读 record.preview_url 而不需要现场 compose。
      specificColors: resolveActiveDraftMainPreviewColor() ? [resolveActiveDraftMainPreviewColor()] : undefined,
      specificViews: resolveActiveDraftMainPreviewView() ? [resolveActiveDraftMainPreviewView()] : undefined,
    }).catch(() => undefined)
  }
  if (options?.showNotice) {
    showSaveNotice(result.saved ? t("saved") : t("saveFailed"))
  }
  return result.saved
}

function buildAutoDraftName() {
  const base = DEFAULT_PREVIEW_DRAFT_NAME
  const existing = new Set(
    draftRecords.value.map((item) => String(item.draftName || "").trim().toLocaleLowerCase()).filter(Boolean),
  )
  if (!existing.has(base.toLocaleLowerCase())) {
    return base
  }
  for (let index = 2; index <= draftRecords.value.length + 2; index += 1) {
    const next = `${base} ${index}`
    if (!existing.has(next.toLocaleLowerCase())) {
      return next
    }
  }
  return `${base} ${Date.now()}`
}

async function saveCurrentWorkspaceBeforeTransition(options?: { showNotice?: boolean }) {
  if (!isTenantAdmin.value || isReadOnlyPreview.value || !selectedTemplateId.value) return false
  if (activeDraftId.value) {
    return saveCurrentDraftChanges(options)
  }
  if (!await ensurePreviewDraftSessionReady({
    allowDraftlessFallback: true,
    showNotice: options?.showNotice,
  })) return false
  await flushWorkspaceEditingState()
  await ensurePreviewReadyForDraftSnapshot()
  let content: PreviewDraftContent | null
  try {
    content = await buildNewDraftContentPayload()
  } catch {
    return false
  }
  if (!content) {
    if (options?.showNotice && loadError.value) showSaveNotice(loadError.value)
    return false
  }
  if (isBlankDraftContent(content)) {
    previewDraftStore.markSaved(buildDirtyDetectionSignature())
    return true
  }
  const result = await previewDraftStore.createIndependentDraft(content, buildAutoDraftName())
  if (result.saved) {
    closeSaveRelatedDialogs()
    syncCurrentFinishedProductCodeFromDraft(result.draftId)
    // 立即把当前主图写入 draftPreviewImageMap,让 Designs 卡片缩略图 +
    // Place Order 主图(均依赖该字典)即时响应式刷新。
    const immediatePreviewUrl = resolveCurrentDraftPreviewImage()
    if (immediatePreviewUrl) {
      setDraftPreviewImage(result.draftId, immediatePreviewUrl)
    }
    const previewUrl = await resolveDraftSnapshotPreviewImage(
      result.draftId,
      content.preferencesJson,
      resolveCurrentDraftPreviewImage(),
    )
    await persistDraftContentSnapshot({
      templateId: selectedTemplateId.value,
      draftId: result.draftId,
      content,
      previewUrl,
    })
    await renderAndPersistDraftOutputs({
      draftId: result.draftId,
      finishedProductCode: content.finishedProductCode,
    }).catch(() => undefined)
  }
  if (options?.showNotice) {
    showSaveNotice(result.saved ? t("saved") : t("saveFailed"))
  }
  return result.saved
}

function clearDraftAutosaveTimer() {
  if (!draftAutosaveTimer) return
  window.clearTimeout(draftAutosaveTimer)
  draftAutosaveTimer = null
}

function canAutosaveCurrentWorkspace() {
  return Boolean(
    isTenantAdmin.value
    && !isReadOnlyPreview.value
    && selectedTemplateId.value
    && serverSaveDirty.value
    && !saveDraftModalOpen.value
    && !switchDraftModalOpen.value
    && !deleteDraftModalOpen.value
    && !leaveWorkspaceModalOpen.value
  )
}

async function autosaveCurrentWorkspaceDraft() {
  if (!canAutosaveCurrentWorkspace()) return
  if (previewDraftStore.isSavingDraftToServer) {
    draftAutosavePending = true
    return
  }
  const saved = await saveCurrentWorkspaceBeforeTransition()
  if (!saved && serverSaveDirty.value) {
    draftAutosavePending = true
  }
  if (!draftAutosavePending || !serverSaveDirty.value) return
  draftAutosavePending = false
  if (!canAutosaveCurrentWorkspace()) return
  void autosaveCurrentWorkspaceDraft().catch(() => undefined)
}

function scheduleDraftAutosave() {
  clearDraftAutosaveTimer()
  if (!canAutosaveCurrentWorkspace()) return
  draftAutosaveTimer = window.setTimeout(() => {
    draftAutosaveTimer = null
    void autosaveCurrentWorkspaceDraft().catch(() => undefined)
  }, 1800)
}

async function confirmSaveDraftModal() {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  if (!await ensurePreviewDraftSessionReady({
    allowDraftlessFallback: true,
    showNotice: true,
  })) return
  await flushWorkspaceEditingState()
  await ensurePreviewReadyForDraftSnapshot()
  let content: PreviewDraftContent | null
  try {
    content = await buildNewDraftContentPayload()
  } catch {
    return
  }
  if (!content) {
    showSaveNotice(loadError.value || t("saveFailed"))
    return
  }
  // 0.4.56: Save As 也要把当前主图写入 content.previewUrl,通过 createIndependentDraft 持久化到服务端,
  // 重进时才能从 record.previewUrl 还原。
  const resolvedSavePreviewUrl = await resolveDraftSnapshotPreviewImage(
    activeDraftId.value || "",
    content.preferencesJson,
    resolveCurrentDraftPreviewImage(),
  )
  if (resolvedSavePreviewUrl) {
    content.previewUrl = resolvedSavePreviewUrl
  }
  const sourceDraftId = activeDraftId.value
  const sourceDraftRecord = sourceDraftId
    ? draftRecords.value.find((draft) => draft.draftId === sourceDraftId) || null
    : null
  let result: { saved: boolean; draftId: string }
  try {
    result = await previewDraftStore.createIndependentDraft(content, saveDraftName.value, {
      sourceDraftId: sourceDraftId || undefined,
    })
  } catch {
    showSaveNotice(resolvePreviewDraftFailureMessage(t("saveFailed")))
    return
  }
  if (!result.saved) {
    showSaveNotice(resolvePreviewDraftFailureMessage(t("saveFailed")))
    return
  }
  // 保存成功:立即关闭 Save As 弹窗,UI 不再等待后续异步任务。
  // store 内部 markSaved 用的是 content.signature(包含全部 preferences);
  // 这里再用 buildDirtyDetectionSignature 覆盖 baseline,避免后续切 view/color/sidebar tab 被误判 dirty。
  previewDraftStore.markSaved(buildDirtyDetectionSignature())
  closeSaveRelatedDialogs()
  syncCurrentFinishedProductCodeFromDraft(result.draftId)
  showSaveNotice(t("saved"))

  // 立即把当前主图写入 draftPreviewImageMap[newDraftId],
  // Designs 卡片缩略图 + Place Order 主图(均依赖该字典)即时刷新。
  const immediatePreviewUrl = resolveCurrentDraftPreviewImage()
  if (immediatePreviewUrl) {
    setDraftPreviewImage(result.draftId, immediatePreviewUrl)
  }

  // 后续 snapshot 持久化 + 渲染图任务 fire-and-forget:不阻塞主流程,内部 try/catch 兜底,
  // 渲染图完成后会通过 persistDraftContentSnapshot 再次写回 draftPreviewImageMap 触发响应式刷新。
  void (async () => {
    try {
      const previewUrl = await resolveDraftSnapshotPreviewImage(
        result.draftId,
        content.preferencesJson,
        immediatePreviewUrl,
      )
      if (previewUrl) {
        setDraftPreviewImage(result.draftId, previewUrl)
      }
      await persistDraftContentSnapshot({
        templateId: selectedTemplateId.value,
        draftId: result.draftId,
        content,
        previewUrl,
      })
      if (sourceDraftRecord) {
        await persistDraftContentSnapshot({
          templateId: selectedTemplateId.value,
          draftId: sourceDraftRecord.draftId,
          content: {
            designJson: sourceDraftRecord.designJson,
            preferencesJson: sourceDraftRecord.preferencesJson,
          },
          previewUrl: draftPreviewImageMap.value[sourceDraftRecord.draftId] || "",
        })
      }
      await renderAndPersistDraftOutputs({
        draftId: result.draftId,
        finishedProductCode: content.finishedProductCode,
      })
    } catch (error) {
      if (typeof console !== "undefined") {
        console.warn("[preview] confirmSaveDraftModal background tasks failed:", error)
      }
    }
  })()
}

async function applyDraftActivation(draftId: string) {
  const record = await previewDraftStore.activateDraftOnServer(draftId)
  if (!record) return
  await restoreDraftRecord(record)
}

async function activateDraft(draftId: string) {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  if (!draftId || !selectedTemplateId.value) return
  await flushWorkspaceEditingState()
  reopenDraftsPanelAfterBlockingModal.value = Boolean(draftsModalOpen.value && serverSaveDirty.value)
  const canProceedImmediately = previewDraftStore.requestSwitchDraft(draftId, serverSaveDirty.value)
  if (!canProceedImmediately) {
    return
  }
  reopenDraftsPanelAfterBlockingModal.value = false
  await applyDraftActivation(draftId)
}

function reopenDraftsPanelIfNeeded() {
  if (!reopenDraftsPanelAfterBlockingModal.value) return
  reopenDraftsPanelAfterBlockingModal.value = false
  previewDraftStore.openDraftsModal()
}

function closeSaveRelatedDialogs() {
  reopenDraftsPanelAfterBlockingModal.value = false
  if (saveDraftModalOpen.value) {
    previewDraftStore.closeSaveDraftModal()
  }
  if (draftsModalOpen.value) {
    previewDraftStore.closeDraftsModal()
  }
}

async function confirmSwitchDraftSave() {
  const targetDraftId = pendingSwitchDraftRecord.value?.draftId || ""
  if (!targetDraftId) return
  const saved = await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
  if (!saved) return
  await applyDraftActivation(targetDraftId)
  reopenDraftsPanelIfNeeded()
}

async function confirmSwitchDraftDiscard() {
  const targetDraftId = pendingSwitchDraftRecord.value?.draftId || ""
  if (!targetDraftId) return
  await applyDraftActivation(targetDraftId)
  reopenDraftsPanelIfNeeded()
}

function cancelSwitchDraft() {
  previewDraftStore.closeSwitchDraftModal()
  reopenDraftsPanelIfNeeded()
}

function runPendingLeaveAction() {
  if (pendingLeaveAction.value !== "reload") return
  pendingLeaveAction.value = "none"
  skipBeforeUnloadUntil.value = Date.now() + 4000
  window.location.reload()
}

function resolveLeaveWorkspaceDecision(decision: LeaveWorkspaceDecision) {
  leaveWorkspaceModalOpen.value = false
  const resolver = leaveWorkspaceDecisionResolver
  leaveWorkspaceDecisionResolver = null
  resolver?.(decision)
}

function requestLeaveWorkspaceDecision(action: PendingLeaveAction = "none") {
  if (leaveWorkspaceDecisionResolver) {
    return Promise.resolve<LeaveWorkspaceDecision>("cancel")
  }
  pendingLeaveAction.value = action
  leaveWorkspaceModalOpen.value = true
  return new Promise<LeaveWorkspaceDecision>((resolve) => {
    leaveWorkspaceDecisionResolver = resolve
  })
}

function cancelLeaveWorkspace() {
  pendingLeaveAction.value = "none"
  resolveLeaveWorkspaceDecision("cancel")
}

async function discardUnsavedWorkspaceSnapshot(templateId = selectedTemplateId.value, draftId = activeDraftId.value) {
  if (!templateId) return
  markDiscardedWorkspaceSnapshot(templateId, draftId)
  await clearPersistedWorkspaceSnapshot(templateId, draftId)
}

async function confirmLeaveWithoutSaving() {
  await discardUnsavedWorkspaceSnapshot()
  resolveLeaveWorkspaceDecision("discard")
  runPendingLeaveAction()
}

async function confirmLeaveWithSave() {
  const saved = await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
  if (!saved) return
  resolveLeaveWorkspaceDecision("save")
  runPendingLeaveAction()
}

function buildBlankDraftContent(): PreviewDraftContent {
  const emptyState: SerializableCanvasState = {
    version: 1,
    activePartKey: selectedPartKey.value || editorPayload.value?.parts[0]?.part_name || "",
    activeLayerId: "",
    parts: [],
  }
  currentFinishedProductCode.value = ""
  return {
    designJson: JSON.stringify(emptyState),
    preferencesJson: JSON.stringify(buildDraftPreferencesPayload()),
    signature: "",
    finishedProductCode: "",
  }
}

async function restoreBlankWorkspace(options?: { useStoredBlank?: boolean }) {
  if (!selectedTemplateId.value) {
    return { hasSavedDesign: false }
  }
  const blankContent = buildBlankDraftContent()
  const discardUnsavedSnapshot = consumeDiscardedWorkspaceSnapshot(selectedTemplateId.value, "")
  if (discardUnsavedSnapshot) {
    await clearPersistedWorkspaceSnapshot(selectedTemplateId.value, "")
  }
  const storedPreferences = options?.useStoredBlank && !discardUnsavedSnapshot
    ? readWorkspacePreferences(selectedTemplateId.value, "")
    : null
  const storedDesign = options?.useStoredBlank && !discardUnsavedSnapshot
    ? await readPersistedWorkspaceDesign(selectedTemplateId.value, "")
    : null
  activeDraftId.value = ""
  const blankPreferences = parseJsonValue(blankContent.preferencesJson, {})
  const preferences = {
    ...blankPreferences,
    ...(storedPreferences || {}),
  }
  applyDraftPreferences(preferences)
  renderOutputs.value = resolveWorkspaceOutputs(preferences)
  const restoreResult = await restoreWorkspaceDesign(
    selectedTemplateId.value,
    hasPersistableWorkspaceDesign(storedDesign)
      ? storedDesign
      : (parseStoredWorkspaceDesign(blankContent.designJson) as SerializableCanvasState | null),
  )
  previewDraftStore.markSaved(buildDirtyDetectionSignature())
  return restoreResult
}

function cancelNewWorkspace() {
  newWorkspaceModalOpen.value = false
}

async function startNewBlankWorkspace() {
  await restoreBlankWorkspace({ useStoredBlank: false })
  newWorkspaceModalOpen.value = false
}

async function requestNewBlankWorkspace() {
  if (!isTenantAdmin.value || isReadOnlyPreview.value || !selectedTemplateId.value) return
  await flushWorkspaceEditingState()
  if (serverSaveDirty.value) {
    newWorkspaceModalOpen.value = true
    return
  }
  void startNewBlankWorkspace()
}

async function confirmNewWorkspaceSave() {
  newWorkspaceModalOpen.value = false
  const saved = await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
  if (!saved) {
    newWorkspaceModalOpen.value = true
    return
  }
  await startNewBlankWorkspace()
}

async function confirmNewWorkspaceDiscard() {
  newWorkspaceModalOpen.value = false
  await startNewBlankWorkspace()
}

function deleteDraft(draftId: string) {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  reopenDraftsPanelAfterBlockingModal.value = Boolean(draftsModalOpen.value)
  previewDraftStore.beginDeleteDraft(draftId)
}

function cancelDeleteDraftModal() {
  previewDraftStore.cancelDeleteDraft()
  reopenDraftsPanelIfNeeded()
}

function closeDeleteDraftConflictModal() {
  deleteDraftConflictModalOpen.value = false
  deleteDraftConflictReasons.value = []
  deleteDraftConflictDraftName.value = ""
  deleteDraftConflictDraftId.value = ""
}

function formatDeleteDraftConflictReason(reason: DraftReferenceConflictReason): string {
  const sample = reason.sampleIds.slice(0, 3).join(selectedLocale.value === "zh" ? "、" : ", ")
  const sampleText = sample ? (selectedLocale.value === "zh" ? `：${sample}` : `: ${sample}`) : ""
  let template: string
  switch (reason.type) {
    case "ACTIVE_TEMPLATE_STATE":
      template = t("deleteCascadeReasonActiveTemplateState")
      break
    case "ACTIVE_TEMPLATE_OUTPUT":
      template = t("deleteCascadeReasonActiveTemplateOutput")
      break
    case "DRAFT_RESOURCE_REF":
      template = t("deleteCascadeReasonDraftResourceRef")
      break
    case "OUTPUT_RESOURCE_REF":
      template = t("deleteCascadeReasonOutputResourceRef")
      break
    default:
      template = t("deleteCascadeReasonGeneric")
  }
  return template
    .replace("{count}", String(reason.count))
    .replace("{sample}", sampleText)
    .replace("{type}", String(reason.type || ""))
}

async function deleteOwnedUploadFromServer(artworkId: string) {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  if (!artworkId) return
  await gatewayPlatformFetch(
    `/api/v1/artworks/uploads/${encodeURIComponent(artworkId)}`,
    {
      method: "DELETE",
      headers: authStore.authHeaders,
    },
  )
}

async function applyDraftDeletionAftermath(
  deletedDraftId: string,
  result: Awaited<ReturnType<typeof previewDraftStore.confirmDeleteDraft>>,
) {
  if (deletedDraftId && draftPreviewImageMap.value[deletedDraftId]) {
    const { [deletedDraftId]: _deletedPreview, ...remainingPreviews } = draftPreviewImageMap.value
    draftPreviewImageMap.value = remainingPreviews
    writeDraftPreviewImages()
  }
  if (deletedDraftId && draftMainPreviewViewOverrides.value[deletedDraftId]) {
    const { [deletedDraftId]: _deletedMainView, ...remainingMainViews } = draftMainPreviewViewOverrides.value
    draftMainPreviewViewOverrides.value = remainingMainViews
  }
  if (deletedDraftId && draftMainPreviewColorOverrides.value[deletedDraftId]) {
    const { [deletedDraftId]: _deletedMainColor, ...remainingMainColors } = draftMainPreviewColorOverrides.value
    draftMainPreviewColorOverrides.value = remainingMainColors
  }
  if (result.deletedActive) {
    if (result.activeRecord) {
      await restoreDraftRecord(result.activeRecord)
    } else {
      await restoreBlankWorkspace({ useStoredBlank: false })
    }
  }
  reopenDraftsPanelIfNeeded()
}

async function confirmDeleteDraft() {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  const deletedDraftId = pendingDeleteDraftRecord.value?.draftId || ""
  // 关联引用直接级联删除,不再弹确认窗;统一带 force=true,后端级联软删
  let result: Awaited<ReturnType<typeof previewDraftStore.confirmDeleteDraft>>
  try {
    result = await previewDraftStore.confirmDeleteDraft(buildBlankDraftContent, { force: true })
  } catch (error) {
    showDeleteDraftError(error)
    return
  }
  await applyDraftDeletionAftermath(deletedDraftId, result)
}

async function confirmForceDeleteDraft() {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return
  const draftId = deleteDraftConflictDraftId.value
  if (!draftId) {
    closeDeleteDraftConflictModal()
    return
  }
  // 重新打开删除流程并以 force=true 走级联软删
  previewDraftStore.beginDeleteDraft(draftId)
  let result: Awaited<ReturnType<typeof previewDraftStore.confirmDeleteDraft>>
  try {
    result = await previewDraftStore.confirmDeleteDraft(buildBlankDraftContent, { force: true })
  } catch (error) {
    previewDraftStore.cancelDeleteDraft()
    closeDeleteDraftConflictModal()
    showDeleteDraftError(error)
    return
  }
  closeDeleteDraftConflictModal()
  await applyDraftDeletionAftermath(draftId, result)
}

function showDeleteDraftError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error || "")
  // 屏蔽英文 SQL/堆栈,统一向用户呈现可读原因
  const lowered = detail.toLowerCase()
  let message: string
  if (lowered.includes("active_draft_id") || lowered.includes("preview_template_state")) {
    message = t("deleteDraftErrorInUse")
  } else if (lowered.includes("not found") || lowered.includes("404")) {
    message = t("deleteDraftErrorMissing")
  } else {
    message = t("deleteDraftErrorGeneric")
  }
  deleteDraftErrorMessage.value = message
  deleteDraftErrorModalOpen.value = true
}

function closeDeleteDraftErrorModal() {
  deleteDraftErrorModalOpen.value = false
  deleteDraftErrorMessage.value = ""
}

async function loadServerOutputs(
  templateId: string,
  options?: {
    limit?: number
    draftId?: string
    syncResults?: boolean
  },
) {
  if (!templateId) return [] as RenderOutputEntry[]
  try {
    const query = new URLSearchParams({
      template_id: templateId,
      limit: String(options?.limit ?? PREVIEW_OUTPUTS_INITIAL_LIMIT),
    })
    const draftId = String(options?.draftId || "").trim()
    if (draftId) query.set("draft_id", draftId)
    const response = await gatewayPlatformFetch<{ records?: Array<Record<string, unknown>>, results?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
      `/api/v1/preview/outputs?${query.toString()}`,
      { headers: authStore.authHeaders },
    )
    let records: Array<Record<string, unknown>> = []
    if (Array.isArray(response)) {
      records = response
    } else if (response && Array.isArray(response.records)) {
      records = response.records
    } else if (response && Array.isArray(response.results)) {
      records = response.results
    }
    const normalized = dedupeRenderOutputs(records)
    if (options?.syncResults && selectedTemplateId.value === templateId) {
      const merged = dedupeRenderOutputs([...renderOutputs.value, ...normalized])
      renderOutputs.value = merged
      writeWorkspacePreferences()
    }
    return normalized
  } catch (error) {
    if (typeof console !== "undefined") {
      // 把失败原因打到 console.warn,便于在 WP shell 中诊断 results 列表不显示的根因
      console.warn("[preview] loadServerOutputs failed:", error)
    }
    return [] as RenderOutputEntry[]
  }
}

function buildServerOutputsLoadKey(templateId: string, draftId = "") {
  const normalizedTemplateId = String(templateId || "").trim()
  const normalizedDraftId = String(draftId || "").trim()
  return `${normalizedTemplateId}::${normalizedDraftId || "__template__"}`
}

async function ensureServerOutputsLoaded(
  templateId: string,
  options?: {
    force?: boolean
    limit?: number
    draftId?: string
  },
) {
  // Bug 5: WP shell 中 isTenantAdmin=false,但 export 结果同样落库,results modal 重新打开时
  // 需要从服务端拉取并合并到 renderOutputs,否则刚 export 的图也看不到。
  if ((!isTenantAdmin.value && !isWordPressShell.value) || !templateId) return [] as RenderOutputEntry[]
  const requestKey = buildServerOutputsLoadKey(templateId, options?.draftId)
  if (!options?.force && serverOutputsLoadedKey.value === requestKey) {
    return renderOutputs.value
  }
  if (!options?.force && serverOutputsLoadPromise && serverOutputsRequestKey === requestKey) {
    return await serverOutputsLoadPromise
  }
  serverOutputsRequestKey = requestKey
  const nextPromise = loadServerOutputs(templateId, {
    limit: options?.limit ?? PREVIEW_OUTPUTS_INITIAL_LIMIT,
    draftId: options?.draftId,
    syncResults: true,
  })
    .then((outputs) => {
      if (serverOutputsRequestKey === requestKey) {
        serverOutputsLoadedKey.value = requestKey
      }
      return outputs
    })
    .finally(() => {
      if (serverOutputsRequestKey === requestKey) {
        serverOutputsLoadPromise = null
      }
    })
  serverOutputsLoadPromise = nextPromise
  return await nextPromise
}

async function persistOutputToServer(
  entry: RenderOutputEntry,
  options?: {
    draftId?: string
    finishedProductCode?: string
    designSignature?: string
    syncResults?: boolean
  },
) {
  // WP shell 中 isTenantAdmin = false，但 export/results 类输出仍需要持久化到服务端
  // （后端会根据 mode 字段挂上当前 WP 用户标识，重新打开 results modal 才能拉到这条记录）。
  if (!selectedTemplateId.value) return
  if (!isTenantAdmin.value && !isWordPressShell.value) return
  // 把绝对 OSS URL / gateway URL 还原回相对 runtime-asset 路径，
  // 避免后端 isValidRuntimeAssetPath 因 http(s):// 前缀拒绝 (400)。
  const toRuntimeRelativePath = (value: string): string => {
    const raw = String(value || "").trim()
    if (!raw) return ""
    if (/^(data:|blob:)/i.test(raw)) return raw
    if (!/^https?:\/\//i.test(raw)) return raw
    let pathname = raw
    let search = ""
    try {
      const parsed = new URL(raw)
      pathname = parsed.pathname || ""
      search = parsed.search || ""
    } catch {
      // ignore
    }
    // gateway 形态：/api/gateway/runtime/render/file?path=runtime-assets/xxx
    const gatewayMatch = /[?&]path=([^&]+)/.exec(search)
    if (gatewayMatch) {
      try {
        return decodeURIComponent(gatewayMatch[1])
      } catch {
        return gatewayMatch[1]
      }
    }
    // OSS 公网形态：https://oss.mockup100.com/mockup-saas/render-files/...
    const ossMatch = /^\/?[^/]+\/((?:runtime-assets|render-files|render-archives)\/.+)$/.exec(pathname)
    if (ossMatch) return ossMatch[1]
    // 退一步：直接匹配 runtime-asset 关键字段
    const fallback = /(runtime-assets|render-files|render-archives)\/[^?#]+/.exec(pathname)
    if (fallback) return fallback[0]
    return raw
  }
  const rawFilePath = String(entry.filePath || "").trim()
  const normalizedFilePath = toRuntimeRelativePath(rawFilePath)
  const normalizedColor = String(entry.color || selectedColor.value || "").trim()
  const normalizedView = String(entry.view || selectedView.value || "").trim()
  const normalizedSize = normalizeLooseOutputSize(String(entry.size || "").trim())
    || normalizeOutputSize(selectedSize.value)
    || PREVIEW_SIZE
  if (!normalizedFilePath || !normalizedColor || !normalizedView || !normalizedSize) {
    return
  }
  // OSS guard：拒绝 data:/blob: 等临时 URL，避免污染运行时输出
  if (/^(data:|blob:)/i.test(normalizedFilePath)) {
    if (typeof console !== "undefined") {
      console.warn("[preview] skip persistOutputToServer: non-runtime file_path", normalizedFilePath)
    }
    return
  }
  if (entry.url && /^(data:|blob:)/i.test(String(entry.url))) {
    if (typeof console !== "undefined") {
      console.warn("[preview] skip persistOutputToServer: non-runtime entry.url")
    }
    return
  }
  const resolvePublicOutputUrl = (value: string) => {
    const normalized = String(value || "").trim()
    if (!normalized) return ""
    if (/^https?:\/\//i.test(normalized)) return normalized
    if (typeof window === "undefined") return normalized
    try {
      return new URL(normalized, window.location.origin).toString()
    } catch {
      return normalized
    }
  }
  const runtimePreviewUrl = resolvePublicOutputUrl(renderFileUrl(normalizedFilePath))
  const runtimeDownloadUrl = resolvePublicOutputUrl(renderFileUrl(normalizedFilePath, true))
  const response = await gatewayPlatformFetch<{ output_id?: string; outputId?: string }>(
    "/api/v1/preview/outputs",
    {
      method: "POST",
      headers: { ...authStore.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: selectedTemplateId.value,
        mode: entry.mode || activePreviewMode(),
        color: normalizedColor,
        view: normalizedView,
        size: normalizedSize,
        source: entry.source || "export",
        file_path: normalizedFilePath,
        preview_url: runtimePreviewUrl,
        download_url: runtimeDownloadUrl,
        draft_id: String(options?.draftId || "").trim(),
        design_signature: String(options?.designSignature || entry.designSignature || "").trim(),
        finished_product_code: String(options?.finishedProductCode || "").trim(),
      }),
    },
  )
  const savedOutputId = String(response?.output_id || response?.outputId || "").trim()
  if (!savedOutputId) return
  if (options?.syncResults === false) return
  setRenderOutputs(renderOutputs.value.map((item) => (
    item.id === entry.id
      ? { ...item, id: savedOutputId }
      : item
  )))
}

function resolveDraftOutputColors() {
  const colors = selectedBatchColors.value.length
    ? selectedBatchColors.value
    : [selectedColor.value]
  return Array.from(new Set(colors.map((item) => String(item || "").trim()).filter(Boolean)))
}

function resolveDraftOutputViews() {
  const views = selectedBatchViews.value.length
    ? selectedBatchViews.value
    : [selectedView.value]
  return Array.from(new Set(views.map((item) => String(item || "").trim()).filter(Boolean)))
}

async function renderAndPersistDraftOutputs(args: {
  draftId?: string
  finishedProductCode?: string
  specificColors?: string[]
  specificViews?: string[]
  // 0.4.70 (cart 主图严格化): forceFresh=true 时跳过 previewOutputs 缓存,
  // 强制调用 renderView 重新合成。Place Order 加购路径使用,确保 cart 主图就是
  // 用户点"加入购物车"瞬间的最新渲染图,而不是更早 session 里的备份。
  forceFresh?: boolean
}) {
  const draftId = String(args.draftId || "").trim()
  // 在 WP 买家端（isTenantAdmin=false）加购时，也需要能执行独立渲染，所以去掉 isTenantAdmin.value 的强校验。
  // 但是 draftId 可能为空（买家端没有 draftId），所以 draftId 的校验改为如果需要存服务端记录时再校验。
  if (!selectedTemplateId.value) return
  const mode = activePreviewMode()
  const designSignature = buildCurrentPreviewCacheDesignSignature()
  const currentSignature = previewSignature(mode)
  const colors = args.specificColors?.length ? args.specificColors : resolveDraftOutputColors()
  const views = args.specificViews?.length ? args.specificViews : resolveDraftOutputViews()
  if (!colors.length || !views.length || !designSignature) return

  const collected: RenderOutputEntry[] = []
  for (const color of colors) {
    for (const view of views) {
      const reusableEntry = args.forceFresh
        ? null
        : resolvePreviewOutputEntry(color, view, PREVIEW_SIZE, mode, true)
      if (reusableEntry?.filePath && reusableEntry.signature === currentSignature) {
        collected.push({
          id: createOutputId(),
          mode,
          color,
          view,
          size: PREVIEW_SIZE,
          filePath: reusableEntry.filePath,
          url: reusableEntry.url,
          createdAt: new Date().toISOString(),
          draftId,
          designSignature,
          source: "draft_save",
        })
        continue
      }
      const result = await requestPreviewCompose({
        color,
        view,
        size: PREVIEW_SIZE,
        mode,
      })
      if (!result) continue
      if (result.signature !== currentSignature || currentSignature !== previewSignature(mode)) {
        continue
      }
      commitPreviewComposeResult({
        color,
        view,
        size: PREVIEW_SIZE,
        mode,
        url: result.url,
        filePath: result.filePath,
        signature: result.signature,
      })
      collected.push({
        id: createOutputId(),
        mode,
        color,
        view,
        size: PREVIEW_SIZE,
        filePath: result.filePath,
        url: result.url,
        createdAt: new Date().toISOString(),
        draftId,
        designSignature,
        source: "draft_save",
      })
    }
  }

  if (!collected.length) return collected
  await Promise.allSettled(collected.map((entry) => persistOutputToServer(entry, {
    draftId,
    designSignature,
    finishedProductCode: String(args.finishedProductCode || currentFinishedProductCode.value || "").trim(),
    syncResults: false,
  })))
  return collected
}

async function deleteOutputFromServer(outputId: string) {
  if (!isTenantAdmin.value) return
  await gatewayPlatformFetch(
    `/api/v1/preview/outputs/${encodeURIComponent(outputId)}`,
    { method: "DELETE", headers: authStore.authHeaders },
  )
}

function setPreviewOutput(color: string, view: string, size: string, url: string, filePath: string, mode: PreviewSourceMode, signature: string) {
  previewOutputs.value = {
    ...previewOutputs.value,
    [previewKey(color, view, size, mode)]: { url, filePath, mode, signature },
  }
  setPreviewRequestState(color, view, size, mode, "fresh", signature)
}

// WP shell 下平台 external API 在 normalizeOutputs 中显式移除了 file_path,
// 仅返回 preview_url / download_url(WP 插件已在 controller 内补回 file_path,但保留兜底)。
// 这里统一从 file_path → preview_url → download_url 取一个非空值,确保 setPreviewOutput
// 在 isWordPressShell 与平台分支下都能写入 previewOutputs 缓存。
function resolveComposeOutputFilePath(output: ComposeResponse["outputs"][number] | undefined): string {
  if (!output) return ""
  const candidates = [
    String((output as Record<string, unknown>).file_path || "").trim(),
    String((output as Record<string, unknown>).preview_url || "").trim(),
    String((output as Record<string, unknown>).download_url || "").trim(),
  ]
  return candidates.find((value) => value.length > 0) || ""
}

function hydratePreviewCacheOutputs(
  entries: RenderOutputEntry[],
  identity: {
    draftId: string
    designSignature: string
  },
) {
  const reusableEntries = pickLatestReusablePreviewOutputs(
    entries.filter((entry) => isPreviewCacheOutputSource(entry.source) && entry.size === PREVIEW_SIZE),
    identity,
  )
  reusableEntries.forEach((entry) => {
    const mode = entry.mode === "artwork" ? "artwork" : "default"
    if (!entry.color || !entry.view || !entry.size || !entry.filePath || !entry.url) return
    if (!isPersistedPreviewOutputReusable(entry, {
      draftId: identity.draftId,
      designSignature: identity.designSignature,
      mode,
      color: entry.color,
      view: entry.view,
      size: entry.size,
    })) {
      return
    }
    setPreviewOutput(
      entry.color,
      entry.view,
      entry.size,
      entry.url,
      entry.filePath,
      mode,
      previewSignature(mode),
    )
  })
}

async function loadDraftPreviewCacheOutputs(
  draftId: string,
  designSignature: string,
  options?: {
    syncResults?: boolean
  },
) {
  const normalizedDraftId = String(draftId || "").trim()
  const normalizedSignature = String(designSignature || "").trim()
  if (!isTenantAdmin.value || !selectedTemplateId.value || !normalizedDraftId || !normalizedSignature) return
  const serverEntries = await loadServerOutputs(selectedTemplateId.value, {
    draftId: normalizedDraftId,
    limit: PREVIEW_OUTPUTS_INITIAL_LIMIT * 4,
    syncResults: options?.syncResults,
  })
  hydratePreviewCacheOutputs(serverEntries, {
    draftId: normalizedDraftId,
    designSignature: normalizedSignature,
  })
}

async function persistOpenPreviewEntriesIfNeeded() {
  const draftId = String(activeDraftId.value || "").trim()
  const designSignature = buildCurrentPreviewCacheDesignSignature()
  if (!isTenantAdmin.value || !selectedTemplateId.value || !draftId || !designSignature) return
  const entries = previewDialogPersistEntries.value
    .filter((entry) => entry.status === "fresh" && entry.filePath && entry.url && entry.view)
  if (!entries.length) return
  const finishedProductCode = String(currentFinishedProductCode.value || "").trim()
  await Promise.allSettled(entries.map((entry) => persistOutputToServer({
    id: createOutputId(),
    mode: openPreviewMode.value,
    color: entry.color,
    view: entry.view,
    size: OPEN_PREVIEW_SIZE,
    filePath: entry.filePath,
    url: entry.url,
    createdAt: new Date().toISOString(),
    draftId,
    designSignature,
    source: "preview",
  }, {
    draftId,
    designSignature,
    finishedProductCode,
    syncResults: false,
  })))
}

function isPreviewCurrent(
  color = selectedColor.value,
  view = selectedView.value,
  size = previewSize.value,
  mode = activePreviewMode(),
) {
  const entry = previewOutputs.value[previewKey(color, view, size, mode)]
  if (!entry) return false
  return entry.signature === previewSignature(mode)
}

function renderFileUrl(filePath: string, download = false) {
  return resolveRuntimeRenderFileUrl(filePath, download)
}

function triggerDownload(url: string) {
  if (typeof window === "undefined") return
  skipBeforeUnloadUntil.value = Date.now() + 4000
  const link = document.createElement("a")
  link.href = url
  link.download = ""
  link.rel = "noopener"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function colorSwatch(color: string) {
  const trimmed = String(color || "").trim()
  const normalized = trimmed.toLowerCase()
  const compact = normalized.replace(/[\s_-]+/g, "")
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return trimmed
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)) return trimmed
  if (typeof CSS !== "undefined" && CSS.supports("color", trimmed)) return trimmed
  if (COLOR_NAME_MAP[compact]) return COLOR_NAME_MAP[compact]
  if (normalized.includes("light blue")) return "#60a5fa"
  if (normalized.includes("dark blue")) return "#1d4ed8"
  if (normalized.includes("light green")) return "#4ade80"
  if (normalized.includes("dark green")) return "#166534"
  if (normalized.includes("light pink")) return "#f9a8d4"
  if (normalized.includes("dark pink")) return "#be185d"
  if (normalized.includes("light gray") || normalized.includes("light grey")) return "#d1d5db"
  if (normalized.includes("dark gray") || normalized.includes("dark grey")) return "#374151"
  if (normalized.includes("white")) return "#ffffff"
  if (normalized.includes("black")) return "#111827"
  if (normalized.includes("red")) return "#ef4444"
  if (normalized.includes("blue")) return "#2563eb"
  if (normalized.includes("green")) return "#16a34a"
  if (normalized.includes("yellow")) return "#eab308"
  if (normalized.includes("orange")) return "#f97316"
  if (normalized.includes("purple")) return "#7c3aed"
  if (normalized.includes("pink")) return "#ec4899"
  const tokens = normalized.split(/[\s/_-]+/).filter(Boolean)
  for (const token of tokens) {
    if (typeof CSS !== "undefined" && CSS.supports("color", token)) return token
    if (COLOR_NAME_MAP[token]) return COLOR_NAME_MAP[token]
  }
  return "#6366f1"
}

async function loadWorkspace(templateId: string) {
  if (!templateId) return
  clearAutoPreviewTimer()
  previewRequestToken += 1
  previewRefreshQueued = false
  isPreviewRendering.value = false
  isInitializingWorkspace = true
  workspaceLoading.value = true
  loadError.value = ""
  renderError.value = ""
  const resolvedScope = resolveTemplateScopeForReference(templateId) || previewTemplateScopeConfig.value.defaultScope
  const usesPublishedCatalog = isPublishedTemplateScope(resolvedScope)
  const selectedEntry = resolveTemplateEntryByReference(templateId, [resolvedScope]) || resolveTemplateEntryByReference(templateId)
  const resolvedTemplateId = selectedEntry?.runtime_key || selectedEntry?.template_id || templateId
  if (!resolvedTemplateId) {
    selectedTemplateId.value = ""
    workspaceLoading.value = false
    isInitializingWorkspace = false
    loadError.value = t("selectedTemplateNotFound")
    return
  }
  selectedTemplateId.value = resolvedTemplateId
  try {
    if (usesPublishedCatalog) {
      await editorStore.loadPublished(
        resolvedTemplateId,
        resolvedScope === "storefront" ? storefrontSlug.value : undefined,
        { previewSource: previewSource.value },
      )
    } else {
      await editorStore.load(resolvedTemplateId, { previewSource: previewSource.value })
    }
  } finally {
    workspaceLoading.value = false
  }
  if (!editorPayload.value) {
    const existsInCatalog = Boolean(resolveTemplateEntryByReference(resolvedTemplateId))
    const nextLoadError = editorStore.error || (
      existsInCatalog
        ? t("selectedTemplateRuntimeMissing")
        : t("selectedTemplateRuntimeUnavailable")
    )
    loadError.value = nextLoadError
    if (/temporarily unavailable|runtime preview data is missing|not available in runtime preview data/i.test(nextLoadError)) {
      markTemplateUnavailable(selectedEntry || {
        template_id: templateId,
        runtime_key: resolvedTemplateId,
      })
      const fallbackEntry = resolveFallbackTemplateEntry(resolvedScope, resolvedTemplateId)
      const fallbackTemplateId = fallbackEntry?.runtime_key || fallbackEntry?.template_id || ""
      if (fallbackTemplateId && fallbackTemplateId !== resolvedTemplateId) {
        await replacePreviewTemplateQuery(fallbackTemplateId)
        isInitializingWorkspace = false
        await loadWorkspace(fallbackTemplateId)
        return
      }
    }
    isInitializingWorkspace = false
    return
  }
  selectedTemplateId.value = editorPayload.value.template_id || resolvedTemplateId
  syncTemplateRouteSelection(editorPayload.value.template_id || resolvedTemplateId, "workspace-load")
  selectedColor.value = editorPayload.value.default_color || editorPayload.value.colors[0] || ""
  selectedView.value = editorPayload.value.views[0] || ""
  const resolvedPreviewSize = PREVIEW_SIZE
  selectedSize.value = resolvedPreviewSize
  previewCustomSizeDraft.value = resolvedPreviewSize
  batchCustomSizeDraft.value = resolvedPreviewSize
  draftPreviewImageMap.value = readDraftPreviewImages(selectedTemplateId.value)
  draftMainPreviewViewOverrides.value = {}
  draftMainPreviewColorOverrides.value = {}
  // 0.4.59: 切换模板时重置 main preview ref,避免上一个模板的 view/color 名字被错误带到新模板。
  mainPreviewView.value = ""
  mainPreviewColor.value = ""
  selectedBatchColors.value = editorPayload.value.colors[0] ? [editorPayload.value.colors[0]] : []
  selectedBatchViews.value = editorPayload.value.views[0] ? [editorPayload.value.views[0]] : []
  selectedBatchSizes.value = [resolvedPreviewSize]
  selectedPartKey.value = editorPayload.value.parts[0]?.part_name || ""
  selectedArtworkId.value = ""
  setRenderOutputs([])
  serverOutputsLoadedKey.value = ""
  serverOutputsRequestKey = ""
  serverOutputsLoadPromise = null
  resultsModalOpen.value = false
  exportModalOpen.value = false
  renderError.value = ""
  hasArtwork.value = false
  partPreviewFailures.value = {}
  activeLayerId.value = ""
  layerCount.value = 0
  previewOutputs.value = {}
  previewMode.value = "default"
  canvasSignature.value = ""
  partBackgroundColors.value = {}
  const savedPreferences = readWorkspacePreferences(templateId, "")
  if (savedPreferences) {
    if (savedPreferences.activeSidebarTab && ["products", "template", "artwork", "text", "layers", "background", "svg"].includes(savedPreferences.activeSidebarTab)) {
      // WordPress 插件已隐藏 template 导航,旧偏好若停留在 template,统一回退到 products(WP)/ artwork(默认)
      if (savedPreferences.activeSidebarTab === "template" && isWordPressShell.value) {
        activeSidebarTab.value = "products"
      } else {
        activeSidebarTab.value = savedPreferences.activeSidebarTab
      }
    } else if (isWordPressShell.value) {
      activeSidebarTab.value = "products"
    }
    if (savedPreferences.templateLibraryScope && visibleTemplateScopes.value.includes(savedPreferences.templateLibraryScope)) {
      templateLibraryScope.value = savedPreferences.templateLibraryScope
    }
    if (typeof savedPreferences.templateLibraryScopePinnedByUser === "boolean") {
      templateLibraryScopePinnedByUser.value = savedPreferences.templateLibraryScopePinnedByUser
    }
    if (savedPreferences.artworkLibraryTab && ["platform", "tenant", "licensed", "owned"].includes(savedPreferences.artworkLibraryTab)) {
      artworkLibraryTab.value = savedPreferences.artworkLibraryTab
    }
    if (savedPreferences.selectedColor && editorPayload.value.colors.includes(savedPreferences.selectedColor)) {
      selectedColor.value = savedPreferences.selectedColor
    }
    if (savedPreferences.selectedView && editorPayload.value.views.includes(savedPreferences.selectedView)) {
      selectedView.value = savedPreferences.selectedView
    }
    const persistedMainView = String(savedPreferences.mainPreviewView ?? savedPreferences.main_preview_view ?? "").trim()
    if (persistedMainView && editorPayload.value.views.includes(persistedMainView)) {
      mainPreviewView.value = persistedMainView
    }
    const persistedMainColor = String(savedPreferences.mainPreviewColor ?? savedPreferences.main_preview_color ?? "").trim()
    if (persistedMainColor && editorPayload.value.colors.includes(persistedMainColor)) {
      mainPreviewColor.value = persistedMainColor
    }
    if (savedPreferences.backgroundColors && typeof savedPreferences.backgroundColors === "object") {
      partBackgroundColors.value = Object.fromEntries(
        Object.entries(savedPreferences.backgroundColors).filter(([partKey, value]) => partKey && typeof value === "string"),
      )
    } else if (typeof savedPreferences.backgroundColor === "string" && selectedPartKey.value) {
      partBackgroundColors.value = {
        [selectedPartKey.value]: savedPreferences.backgroundColor,
      }
    }
    if (!isTenantAdmin.value && savedPreferences.outputs?.length) {
      setRenderOutputs(savedPreferences.outputs)
    }
  }
  selectedSize.value = selectedSize.value || resolvedPreviewSize
  previewCustomSizeDraft.value = selectedSize.value
  selectedBatchColors.value = editorPayload.value.colors[0] ? [editorPayload.value.colors[0]] : []
  selectedBatchViews.value = editorPayload.value.views[0] ? [editorPayload.value.views[0]] : []
  selectedBatchSizes.value = [selectedSize.value]
  let restoreResult: { hasSavedDesign: boolean } = { hasSavedDesign: false }
  if (isTenantAdmin.value) {
    previewDraftStore.beginTemplateSession(selectedTemplateId.value)
    const serverOutputsPromise = ensureServerOutputsLoaded(selectedTemplateId.value)
    await previewDraftStore.loadServerDrafts(selectedTemplateId.value)
    lastServerActiveDraftId.value = activeDraftId.value
    // 0.4.56: 把每条服务端 record 上次保存的"主图"(record.previewUrl)合并到 draftPreviewImageMap,
    // 让 Designs 面板缩略图与 Place Order 主图在用户尚未激活该 draft 之前就能反映用户最后选择的图。
    draftRecords.value.forEach((record) => {
      if (record.draftId && record.previewUrl) {
        setDraftPreviewImage(record.draftId, record.previewUrl)
      }
    })
    // 0.4.59: 缓存 server activeDraft 的 main preview prefs。
    // restoreBlankWorkspace 会把 activeDraftId 清空,并通过 applyDraftPreferences(blank prefs)
    // 把 mainPreviewView/Color ref 临时覆盖为 view[0]。这里先抓取真实持久化值,
    // 在 restoreBlankWorkspace 之后再反哺 ref,保证 View Preview 主图标志稳定指向上次保存的 view/color。
    const initialActiveRecord = draftRecords.value.find((record) => record.draftId === activeDraftId.value) || null
    const initialPrefs = initialActiveRecord?.preferencesJson
      ? parseJsonValue<Record<string, unknown>>(initialActiveRecord.preferencesJson, {})
      : null
    // Entering a template should start from a blank workspace. Drafts are restored
    // only after the user explicitly activates one from the drafts panel.
    restoreResult = await restoreBlankWorkspace({ useStoredBlank: false })
    if (initialPrefs) {
      const persistedMainView = String(initialPrefs.mainPreviewView ?? initialPrefs.main_preview_view ?? "").trim()
      if (persistedMainView && editorPayload.value?.views?.includes(persistedMainView)) {
        mainPreviewView.value = persistedMainView
      }
      const persistedMainColor = String(initialPrefs.mainPreviewColor ?? initialPrefs.main_preview_color ?? "").trim()
      if (persistedMainColor && editorPayload.value?.colors?.includes(persistedMainColor)) {
        mainPreviewColor.value = persistedMainColor
      }
    }
    const localOutputs = renderOutputs.value.slice()
    void serverOutputsPromise.then((serverOutputs) => {
      if (!serverOutputs.length && localOutputs.length) {
        localOutputs.forEach((entry) => {
          void persistOutputToServer(entry).catch(() => undefined)
        })
      }
    }).catch(() => undefined)
  } else {
    restoreResult = await restoreWorkspaceDesign(templateId)
    // Bug 5: WP shell 进入 workspace 时主动拉取服务端 export 历史,否则 results modal 第一次打开是空的
    if (isWordPressShell.value && selectedTemplateId.value) {
      void ensureServerOutputsLoaded(selectedTemplateId.value).catch(() => undefined)
    }
  }
  // 把当前(空白)workspace 的签名作为已保存基线写入,避免 watcher 在初始化结束后
  // 立刻把"空白"误判为脏并触发 autosave -> 在 designs 列表里多出一条空白 draft。
  if (isTenantAdmin.value && !isReadOnlyPreview.value) {
    previewDraftStore.markSaved(buildDirtyDetectionSignature())
  }
  isInitializingWorkspace = false
  const restorePreviewMode = resolveRestorePreviewMode({
    hasSavedDesign: restoreResult.hasSavedDesign,
    hasArtwork: hasArtwork.value,
    canvasSignature: canvasSignature.value,
  })
  if (restorePreviewMode) {
    previewMode.value = restorePreviewMode
    scheduleSelectedViewPreview(50, { reason: "restore" })
  } else if (isWordPressShell.value) {
    // Bug 6: WP shell 进入模板时即使没有 saved design,也要触发一次实时 compose,
    // 让右上角预览窗口立刻显示当前合成图(色彩/视图变体),而非模板自带原图。
    scheduleSelectedViewPreview(50, { reason: "restore" })
  }
}

watch(
  resultsModalOpen,
  (open) => {
    if (!open || !selectedTemplateId.value) return
    void ensureServerOutputsLoaded(selectedTemplateId.value, {
      draftId: activeDraftId.value,
    }).catch(() => undefined)
  },
)

watch(
  () => [
    serverSaveDirty.value,
    selectedTemplateId.value,
    activeDraftId.value,
    saveDraftModalOpen.value,
    switchDraftModalOpen.value,
    deleteDraftModalOpen.value,
    leaveWorkspaceModalOpen.value,
  ],
  ([dirty]) => {
    if (!dirty) {
      draftAutosavePending = false
      clearDraftAutosaveTimer()
      return
    }
    scheduleDraftAutosave()
  },
)

watch(
  currentPreviewImage,
  (nextUrl) => {
    const resolvedNextUrl = resolveRuntimeAssetUrl(nextUrl)
    if (!resolvedNextUrl) {
      displayPreviewImage.value = ""
      return
    }
    if (displayPreviewImage.value === resolvedNextUrl) return
    if (previewImageLoader) {
      previewImageLoader.onload = null
      previewImageLoader.onerror = null
    }
    const loader = new Image()
    previewImageLoader = loader
    loader.onload = () => {
      if (previewImageLoader !== loader) return
      displayPreviewImage.value = resolvedNextUrl
    }
    loader.onerror = () => {
      if (previewImageLoader !== loader) return
      displayPreviewImage.value = resolvedNextUrl
    }
    loader.src = resolvedNextUrl
  },
  { immediate: true },
)

async function openArtworkPicker() {
  activeSidebarTab.value = "artwork"
  artworkInputRef.value?.click()
}

function refreshLayerOptions() {
  layerOptions.value = canvasRef.value?.listLayers?.(selectedPartKey.value) || []
}

function handleLayerThumbnailError(event: Event, layer: { preview?: string; previewFallback?: string }) {
  const element = event.target as HTMLImageElement | null
  if (!element) return
  const fallback = resolveAssetUrl(String(layer.previewFallback || "").trim())
  if (!fallback || element.dataset.fallbackApplied === "true" || element.currentSrc === fallback) {
    return
  }
  element.dataset.fallbackApplied = "true"
  element.src = fallback
}

function refreshPartLayerCounts() {
  const next: Record<string, number> = {}
  partOptions.value.forEach((part) => {
    next[part.part_name] = canvasRef.value?.listLayers?.(part.part_name)?.length || 0
  })
  partLayerCounts.value = next
}

function clearPreviewTimer() {
  if (!previewTimer) return
  window.clearTimeout(previewTimer)
  previewTimer = null
}

function clearAutoPreviewTimer() {
  clearPreviewTimer()
}

function clearInteractionPreviewTimer() {
  clearPreviewTimer()
}

function clearPreviewAutoCheckTimer() {
  if (!previewAutoCheckTimer) return
  window.clearInterval(previewAutoCheckTimer)
  previewAutoCheckTimer = null
}

function markPreviewDirty() {
  if (isInitializingWorkspace) return
  previewDirty.value = true
  // 0.4.60: WP shell 编辑(mall 嵌入式)用户改一笔 → 设 dirty,beforeunload 拦截
  if (isWordPressShell.value) {
    wpShellEditorDirty.value = true
  }
  // canvas 一变更就尽快触发 recompose，让右上角预览图实时跟手；
  // scheduleSelectedViewPreview 内部带 debounce，连续编辑会被合并为最后一次。
  scheduleSelectedViewPreview(PREVIEW_VIEW_SWITCH_DEBOUNCE_MS, {
    reason: "auto",
    queueIfBusy: true,
  })
}

function setPreviewCooldown() {
  previewCooldownUntil = Date.now() + PREVIEW_RENDER_COOLDOWN_MS
}

function scheduleSelectedViewPreview(
  delay = PREVIEW_VIEW_SWITCH_DEBOUNCE_MS,
  options?: {
    force?: boolean
    reason?: PreviewRefreshReason
    queueIfBusy?: boolean
  },
) {
  clearPreviewTimer()
  if (!selectedTemplateId.value || !selectedColor.value || !selectedView.value || !editorPayload.value) {
    return
  }
  previewTimer = window.setTimeout(() => {
    previewTimer = null
    refreshVariantPreview({
      force: Boolean(options?.force),
      reason: options?.reason || "view-switch",
      queueIfBusy: Boolean(options?.queueIfBusy),
    }).catch(() => undefined)
  }, Math.max(delay, 0))
}

function startPreviewAutoCheckTimer() {
  clearPreviewAutoCheckTimer()
  if (typeof window === "undefined") return
  previewAutoCheckTimer = window.setInterval(() => {
    if (!previewDirty.value) return
    if (Date.now() < previewCooldownUntil) return
    void refreshVariantPreview({
      reason: "auto",
      queueIfBusy: false,
    }).catch(() => undefined)
  }, PREVIEW_AUTO_CHECK_INTERVAL_MS)
}

function clearSaveNoticeTimer() {
  if (saveNoticeTimer) {
    window.clearTimeout(saveNoticeTimer)
    saveNoticeTimer = null
  }
}

function showSaveNotice(message: string) {
  saveNotice.value = message
  clearSaveNoticeTimer()
  saveNoticeTimer = window.setTimeout(() => {
    saveNoticeTimer = null
    saveNotice.value = ""
  }, 1400)
}

async function composeVariantPreview(mode: PreviewSourceMode, reason: PreviewRefreshReason) {
  if (!selectedTemplateId.value || !selectedColor.value || !selectedView.value) return
  previewRefreshQueued = false
  previewQueuedForce = false
  const requestColor = selectedColor.value
  const requestView = selectedView.value
  const requestSize = previewSize.value
  const requestSignature = previewSignature(mode)
  const renderToken = ++activePreviewRenderToken
  isPreviewRendering.value = true
  try {
    const response = await requestPreviewCompose({
      color: requestColor,
      view: requestView,
      size: requestSize,
      mode,
    })
    if (!response) {
      if (mode === "artwork" && hasArtwork.value) {
        previewMode.value = "default"
        return await composeVariantPreview("default", reason)
      }
      return
    }
    if (requestSignature !== previewSignature(mode)) return
    commitPreviewComposeResult({
      color: requestColor,
      view: requestView,
      size: requestSize,
      mode,
      url: response.url,
      filePath: response.filePath,
      signature: response.signature,
    })
    const isActiveRequest = (
      requestColor === selectedColor.value
      && requestView === selectedView.value
      && requestSize === previewSize.value
    )
    if (isActiveRequest) {
      previewMode.value = mode
      previewDirty.value = false
    }
    if (isActiveRequest && (reason === "manual" || reason === "auto")) {
      setPreviewCooldown()
    }
  } catch (error) {
    const isActiveRequest = (
      requestColor === selectedColor.value
      && requestView === selectedView.value
      && requestSize === previewSize.value
    )
    if (isActiveRequest) {
      handlePreviewError(error, (msg) => { renderError.value = msg })
    }
    if (mode === "artwork" && isActiveRequest) {
      previewMode.value = "default"
    }
  } finally {
    if (renderToken === activePreviewRenderToken) {
      isPreviewRendering.value = false
      if (previewRefreshQueued) {
        const queuedForce = previewQueuedForce
        previewRefreshQueued = false
        previewQueuedForce = false
        window.setTimeout(() => {
          refreshVariantPreview({
            force: queuedForce,
            reason: "view-switch",
            queueIfBusy: false,
          }).catch(() => undefined)
        }, 0)
      }
    }
  }
}

async function refreshVariantPreview(options?: {
  force?: boolean
  reason?: PreviewRefreshReason
  queueIfBusy?: boolean
}) {
  if (!selectedTemplateId.value || !selectedColor.value || !selectedView.value || !editorPayload.value) return
  if (isPreviewRendering.value) {
    if (options?.queueIfBusy) {
      previewRefreshQueued = true
      previewQueuedForce = previewQueuedForce || Boolean(options?.force)
    }
    return
  }
  const mode = activePreviewMode()
  if (!options?.force && resolvePreviewRequestState(selectedColor.value, selectedView.value, previewSize.value, mode, mode !== "artwork") === "fresh") {
    previewMode.value = mode
    previewDirty.value = false
    return
  }
  await composeVariantPreview(mode, options?.reason || "view-switch")
}

async function applyArtworkPreview() {
  if (!hasArtwork.value) return
  renderError.value = ""
  previewMode.value = "artwork"
  await composeVariantPreview("artwork", "manual")
}

async function refreshCurrentViewPreview() {
  clearPreviewTimer()
  await refreshVariantPreview({
    force: true,
    reason: "manual",
    queueIfBusy: false,
  })
}

async function handleArtworkSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  clearArtworkFeedback()
  activeSidebarTab.value = "artwork"
  artworkLibraryTab.value = "owned"
  ownedArtworkSearch.value = ""
  ownedArtworkPage.value = 1
  try {
    const uploadedResult = await uploadArtworkFile(file)
    const entry = {
      id: uploadedResult.id,
      name: uploadedResult.name,
      src: uploadedResult.src,
      previewSrc: uploadedResult.previewSrc,
      createdAt: new Date().toISOString(),
    } satisfies ArtworkLibraryEntry
    upsertArtworkLibraryEntry(entry)
    selectedArtworkId.value = entry.id
    await canvasRef.value?.addArtworkSource?.(entry.src, entry.name, entry.previewSrc || entry.src, {
      libraryScope: "owned",
      artworkId: entry.id,
    })
    await loadUploadArtworkLibrary()
  } catch (error) {
    loadError.value = normalizeArtworkUploadError(error)
    input.value = ""
    return
  }
  await persistWorkspaceDesign()
  refreshLayerOptions()
  refreshPartLayerCounts()
  hasArtwork.value = true
  previewMode.value = "default"
  input.value = ""
}

function validateArtworkFile(file: File) {
  const fileName = file.name.toLowerCase()
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".svg"]
  const hasAllowedExt = allowedExts.some((ext) => fileName.endsWith(ext))
  return allowedTypes.includes(file.type) || hasAllowedExt
}

async function uploadArtworkFile(file: File): Promise<ArtworkUploadResult> {
  if (!validateArtworkFile(file)) {
    throw new Error(t("unsupportedImageFormat"))
  }
  const form = new FormData()
  form.append("file", file)
  const adminContext = readAdminTenantContext(route.query)
  if (authStore.role === "platform_admin" && adminContext.tenantId) {
    form.append("tenant_id", adminContext.tenantId)
  }
  const uploaded = await gatewayPlatformFetch<{
    artwork_id: string
    name: string
    preview_url?: string
    original_url?: string
    created_at?: string
    updated_at?: string
  }>("/api/v1/artworks/uploads", {
    method: "POST",
    headers: authStore.authHeaders,
    body: form,
  })
  const normalizedUrls = normalizeArtworkEntryUrls(uploaded)
  const src = resolveAssetUrl(normalizedUrls.original_url)
  if (!uploaded.artwork_id || !src) {
    throw new Error("Upload failed.")
  }
  return {
    id: uploaded.artwork_id,
    name: String(uploaded.name || stripDisplayFileExtension(file.name) || "Uploaded artwork"),
    src,
    previewSrc: resolveAssetUrl(normalizedUrls.preview_url || normalizedUrls.original_url),
  }
}

async function addTextLayer() {
  canvasRef.value?.stopTextEditing?.()
  activeSidebarTab.value = "text"
  resetTextEditorDraft()
  await canvasRef.value?.addText?.(textDraft.value)
  refreshLayerOptions()
  refreshPartLayerCounts()
}

// Place Order Modal methods
function slugifyAttributeName(name: string) {
  return String(name || "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

// 0.4.43: 根据属性 label → key 的映射,优先使用 PHP 注入的 attribute_key
function resolveAttributeKey(label: string): string {
  const attr = (wordpressCurrentProduct.value?.attributes || []).find((a) => a.name === label)
  if (attr?.attribute_key) return attr.attribute_key
  if (attr?.raw_name) return `attribute_${attr.raw_name.toLowerCase()}`
  return `attribute_${slugifyAttributeName(label)}`
}

// 0.4.43: 根据已选属性匹配 variation（可变商品必须传 variation_id,否则 Woo 返回 error）
// 0.4.45: 同时返回完整 variation,以便提交 add_to_cart 时注入命中 variation 的全部 attributes
//         (Woo 在 form-handler 阶段会用 attribute_pa_xxx / attribute_xxx 二次校验,只发用户选的部分会失败)
function matchVariationId(selectedAttrs: Record<string, string>): { id: number; variation?: WordPressProductVariation } {
  const variations = wordpressCurrentProduct.value?.variations || []
  if (!variations.length) return { id: 0 }
  // 把 selectedAttrs（label → value）规范成 attribute_key → value
  const normalized: Record<string, string> = {}
  for (const [label, value] of Object.entries(selectedAttrs)) {
    if (!value) continue
    const key = resolveAttributeKey(label).toLowerCase()
    normalized[key] = String(value).toLowerCase()
  }
  const matched = variations.find((v) => {
    if (!v.is_purchasable) return false
    // Woo variation attribute 允许 value 为空（表示 "any"）,空值视为匹配
    return Object.entries(v.attributes).every(([k, expected]) => {
      const expLower = String(expected || "").toLowerCase()
      if (expLower === "") return true
      const actual = normalized[k.toLowerCase()] || ""
      return actual === expLower || actual === expected
    })
  })
  return { id: matched?.variation_id || 0, variation: matched }
}

// 0.4.64: 按 row 选择的 color/size/attrs 取对应 variation price_html。
// 不命中或无 variations(simple product)时回退到 product price_html。
function getRowPriceHtml(row: PlaceOrderRow): string {
  const product = wordpressCurrentProduct.value
  if (!product) return ""
  const variations = product.variations || []
  if (!variations.length) {
    return String(product.price_html || product.price || "")
  }
  const colorAttrName = placeOrderColorAttribute.value?.name || ""
  const merged: Record<string, string> = { ...row.attributes }
  if (row.color && colorAttrName) merged[colorAttrName] = row.color
  const { variation } = matchVariationId(merged)
  if (variation && (variation.price_html || variation.price)) {
    return String(variation.price_html || variation.price || "")
  }
  return String(product.price_html || product.price || "")
}

function openPlaceOrderModal() {
  if (!wordpressCurrentProduct.value) return
  // 0.4.64: Place Order 弹窗主图同步设计页面"已设为主图"的 view —
  // mainPreviewView/Color 已被 Set as Primary 写入,优先使用,确保弹窗主图与详情页一致。
  const primaryView = String(mainPreviewView.value || "").trim() || resolveActiveDraftMainPreviewView() || selectedView.value || availableViews.value[0] || ""
  const primaryColor = String(mainPreviewColor.value || "").trim() || resolveActiveDraftMainPreviewColor() || selectedColor.value
  placeOrderActiveView.value = primaryView
  // 第一行默认 = 当前设计稿主图颜色 + 当前页面 size
  placeOrderRows.value = [createPlaceOrderRow({
    color: primaryColor,
    size: selectedSize.value,
    quantity: 1,
  })]
  placeOrderError.value = ""
  placeOrderModalOpen.value = true
  // 0.4.69 (Plan §2.2): 打开 Place Order 弹窗时从服务端重新拉取一次 drafts,
  // 把每条 record 的最新 previewUrl 写回 draftPreviewImageMap,
  // 确保弹窗里的主图(resolvePlaceOrderActiveImage 依赖 draftPreviewImageMap[activeDraftId])
  // 始终是 server 最新落库的主图,而不是上次 session 缓存。
  // 0.4.72: 弹窗显示过程中先自动保存当前设计稿(包括主图渲染并落库),
  // 再 reload server drafts,确保 Place Order 主图就是最新渲染图,
  // 用户无需手动点 "Save Design" 即可看到最新主图。
  if (selectedTemplateId.value) {
    void (async () => {
      try {
        if (activeDraftId.value && isTenantAdmin.value && !isReadOnlyPreview.value) {
          await saveCurrentDraftChanges({ showNotice: false })
        }
      } catch (e) {
        console.warn("[preview] openPlaceOrderModal autosave failed", e)
      }
      try {
        await previewDraftStore.loadServerDrafts(selectedTemplateId.value)
        draftRecords.value.forEach((record) => {
          if (record.draftId && record.previewUrl) {
            setDraftPreviewImage(record.draftId, record.previewUrl)
          }
        })
      } catch (e) {
        console.warn("[preview] openPlaceOrderModal reload server drafts failed", e)
      }
    })()
  }
}

function closePlaceOrderModal() {
  if (isAddingToCart.value) return
  placeOrderModalOpen.value = false
  isPlaceOrderDraftDropdownOpen.value = false
}

// 0.4.46: 自定义下拉(替换 native select,避免向上展开挡住控件)
const isPlaceOrderDraftDropdownOpen = ref(false)
const placeOrderDraftDropdownLabel = computed(() => {
  if (!placeOrderDraftOptions.value.length) return t("noDraftsYet")
  const current = placeOrderDraftOptions.value.find((o) => o.draftId === activeDraftId.value)
  return current?.label || placeOrderDraftOptions.value[0]?.label || ""
})
function togglePlaceOrderDraftDropdown() {
  if (!placeOrderDraftOptions.value.length || isAddingToCart.value) return
  isPlaceOrderDraftDropdownOpen.value = !isPlaceOrderDraftDropdownOpen.value
  // 打开 design 下拉时,关闭所有 row 内下拉,保证只一个面板可见
  if (isPlaceOrderDraftDropdownOpen.value) openPoRowDropdown.value = ""
}
async function handlePlaceOrderDraftPick(draftId: string) {
  isPlaceOrderDraftDropdownOpen.value = false
  await onPlaceOrderDraftChange(draftId)
}
function onPlaceOrderDraftDropdownOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (isPlaceOrderDraftDropdownOpen.value && !target?.closest(".po-design-switcher-dropdown")) {
    isPlaceOrderDraftDropdownOpen.value = false
  }
  // 0.4.47: row 内自定义下拉的 outside-click 处理
  if (openPoRowDropdown.value && !target?.closest(".po-field-dropdown")) {
    openPoRowDropdown.value = ""
  }
}
onMounted(() => {
  document.addEventListener("click", onPlaceOrderDraftDropdownOutsideClick)
})
onBeforeUnmount(() => {
  document.removeEventListener("click", onPlaceOrderDraftDropdownOutsideClick)
})

// 0.4.47: row 内自定义下拉(color/size/attribute/quantity) — 与 designs 风格一致
// key 形如 `${row.id}::color` / `${row.id}::size` / `${row.id}::attr::<name>` / `${row.id}::qty`
const openPoRowDropdown = ref("")
function togglePoRowDropdown(key: string) {
  if (isAddingToCart.value) return
  openPoRowDropdown.value = openPoRowDropdown.value === key ? "" : key
  if (openPoRowDropdown.value) isPlaceOrderDraftDropdownOpen.value = false
}
function pickPoRowOption(apply: () => void) {
  apply()
  openPoRowDropdown.value = ""
}

// 0.4.43: 在 Place Order 弹窗内切换设计稿 — 复用 activateDraft 流程,加购前应用对应设计稿
async function onPlaceOrderDraftChange(draftId: string) {
  if (!draftId || draftId === activeDraftId.value) return
  if (isAddingToCart.value) return
  await activateDraft(draftId)
  // 切换后刷新弹窗的颜色/属性默认值,避免沿用上一稿的旧选择
  if (placeOrderModalOpen.value) {
    placeOrderRows.value = [createPlaceOrderRow({
      color: selectedColor.value,
      size: selectedSize.value,
      quantity: placeOrderRows.value[0]?.quantity || 1,
    })]
  }
}

async function submitPlaceOrder() {
  if (isAddingToCart.value) return
  if (!wordpressCurrentProduct.value || !wordpressShell.value) return
  if (!placeOrderRows.value.length) return
  isAddingToCart.value = true
  placeOrderError.value = ""
  try {
    const productId = wordpressCurrentProduct.value.product_id
    const productType = String(wordpressCurrentProduct.value.product_type || "").toLowerCase()
    const isVariable = productType === "variable" || (wordpressCurrentProduct.value.variations || []).length > 0
    const siteUrl = String(wordpressShell.value.homeUrl || "").replace(/\/$/, "")
    // 0.4.43: 优先使用 PHP 注入的 wcAjaxUrl,缺省回退 ?wc-ajax=add_to_cart
    const wcAjaxUrl = String(wordpressShell.value.wcAjaxUrl || `${siteUrl}/?wc-ajax=add_to_cart`)
    const wcAjaxNonce = String(wordpressShell.value.wcAjaxNonce || "")
    const colorAttrName = placeOrderColorAttribute.value?.name || ""
    const activeDraft = draftRecords.value.find((d) => d.draftId === activeDraftId.value) || null
    const draftName = activeDraft?.draftName || DEFAULT_PREVIEW_DRAFT_NAME
    const sizeAttrName = placeOrderSizeAttributeName.value
    const canvasState = canvasRef.value?.getSerializableState?.()
    const cloneParts = ((canvasState?.parts || []) as Array<{ partKey: string; layers: Array<Record<string, unknown>> }>).map((p) => {
      const partMeta = editorPayload.value?.parts.find((em) => em.part_name === p.partKey)
      const partName = resolvePartDisplayName(partMeta || { part_name: p.partKey }) || p.partKey
      let textIdx = 0
      return {
        part_key: p.partKey,
        part_name: partName,
        layers: (p.layers || []).filter((l) => l?.kind === "text").map((l) => {
          const layerName = resolveTextLayerDisplayName(l, textIdx)
          textIdx += 1
          return {
            name: layerName,
            text: String(l?.text || ""),
            font_family: String(l?.fontFamily || ""),
            font_size: String(l?.fontSize ?? ""),
            fill: String(l?.fill || ""),
            color: String(l?.fill || (l as any)?.color || ""),
          }
        }),
      }
    })
    // 0.4.65: 多 Requirement 在 cart 独立展示 —— 按 row 循环逐次 add_to_cart,
    // 每行生成独立 cart line item。unique_key 加 row.id 后缀避免 WC 合并。
    // 0.4.70: cart 主图严格 = 主图视角 + 用户选择颜色的最新渲染图。
    // 主图视角缺失任何颜色都强制现场 renderView 重渲(forceFresh)并落库 OSS,
    // 不再回退到其他视角的同色图、也不退到模板默认图。
    const distinctRowColors = Array.from(new Set(
      placeOrderRows.value.map((r) => String(r.color || "").trim()).filter(Boolean),
    ))
    if (distinctRowColors.length && placeOrderActiveView.value) {
      try {
        await renderAndPersistDraftOutputs({
          specificColors: distinctRowColors,
          specificViews: [placeOrderActiveView.value],
          forceFresh: true,
        })
      } catch (e) {
        console.warn("[preview] Place order pre-render all colors failed", e)
      }
    }
    for (const row of placeOrderRows.value) {
      const rowMergedAttrs: Record<string, string> = { ...row.attributes }
      if (row.color && colorAttrName) {
        rowMergedAttrs[colorAttrName] = row.color
      }
      const rowVariationMatch = isVariable ? matchVariationId(rowMergedAttrs) : { id: 0 }
      const rowVariationId = rowVariationMatch.id
      if (isVariable && !rowVariationId) {
        throw new Error(t("placeOrderVariationNotFound") || "No matching product variation for the selected attributes.")
      }
      const rowQuantity = Math.max(1, Number(row.quantity) || 1)
      // 0.4.70: cart 主图严格规则 — 永远是 (placeOrderActiveView=主图视角, row.color)。
      // 缓存命中即用,缺失则现场 renderView 强制合成 + OSS 持久化。绝不退到其他视角。
      // 0.4.71 修复: previewOutputs 写入时用 activePreviewMode()(画布有 artwork 时是 "artwork"),
      // 这里若硬编码 mode:"default" 会查不到桶 → 走兜底到主图颜色,与用户选择不符。
      // 改用 activePreviewMode() 主查 + allowDefaultModeFallback 后备 default 桶。
      const previewLookupMode = activePreviewMode()
      let rowPreviewUrl = ""
      if (row.color && placeOrderActiveView.value) {
        rowPreviewUrl = resolvePreviewImageForView(placeOrderActiveView.value, previewSize.value, {
          color: row.color,
          mode: previewLookupMode,
          allowDefaultModeFallback: true,
          allowTemplateFallback: false,
        })
      }
      // 仍空 → 强制现场重渲(主图视角 + 用户颜色),并写入 previewOutputs / OSS
      if (!rowPreviewUrl && row.color && placeOrderActiveView.value) {
        try {
          const outputs = await renderAndPersistDraftOutputs({
            specificColors: [row.color],
            specificViews: [placeOrderActiveView.value],
            forceFresh: true,
          })
          if (outputs?.length) {
            rowPreviewUrl = outputs[0].url || outputs[0].filePath || ""
          }
          if (!rowPreviewUrl) {
            // renderAndPersistDraftOutputs 返回成功后,resolvePreviewImageForView 应能命中
            rowPreviewUrl = resolvePreviewImageForView(placeOrderActiveView.value, previewSize.value, {
              color: row.color,
              mode: previewLookupMode,
              allowDefaultModeFallback: true,
              allowTemplateFallback: false,
            })
          }
        } catch (e) {
          console.warn("[preview] Place order strict re-render failed", e)
        }
      }
      // 兜底:若上述步骤全部失败,使用主图(主图视角+主图颜色) — 视角永远正确,
      // 仅在极端 render 异常下避免 cart 主图为空
      if (!rowPreviewUrl) rowPreviewUrl = placeOrderActiveImage.value
      // 0.4.67: 为了保证购物车主图与其他颜色变体图片独立存储，且不因后续设计稿更改而变化，
      // 我们在 WP 买家端加购时强制将当前需要的所有颜色(包含主图颜色和其他行颜色)对应的商品图片
      // 通过 renderAndPersistDraftOutputs 渲染并持久化到 OSS。
      if (rowPreviewUrl && !isPersistentPreviewStorageValue(rowPreviewUrl)) {
        try {
          // 这里可以获取 row.color 所有的 view（或者只渲染当前主图 view），由于需求说"主图对应的其他颜色图片（与主图视角相同）"，所以我们渲染 active view
          const outputs = await renderAndPersistDraftOutputs({
            specificColors: [row.color],
            specificViews: [placeOrderActiveView.value],
          })
          if (outputs?.length) {
            rowPreviewUrl = outputs[0].url || outputs[0].filePath || ""
          }
        } catch (e) {
          console.warn("[preview] Place order persist output failed", e)
        }
      }

      if (rowPreviewUrl && !isPersistentPreviewStorageValue(rowPreviewUrl)) {
        rowPreviewUrl = draftPreviewImageMap.value[activeDraftId.value] || ""
        if (rowPreviewUrl && !isPersistentPreviewStorageValue(rowPreviewUrl)) {
          rowPreviewUrl = ""
        }
        if (!rowPreviewUrl) {
          rowPreviewUrl = resolveRuntimeAssetUrl(editorPayload.value?.preview_map?.[`${row.color}::${placeOrderActiveView.value}`] || "")
        }
      }
      // 0.4.69 (Plan §3.1): cart 独立备份 — 把稳定的 OSS runtime-assets URL
      // 通过 WP 插件 REST 拷贝到 cart-snapshots/{unique_key}/{color}_{view}.png 独立目录,
      // 避免后续设计稿编辑时覆盖该 cart line 的图片。
      // 拷贝完成后用 snapshot URL 替换 rowPreviewUrl。
      const rowUniqueKey = `${selectedTemplateId.value}|${activeDraftId.value || "default"}|${row.id}`
      if (rowPreviewUrl && /^https?:\/\//i.test(rowPreviewUrl) && row.color && placeOrderActiveView.value) {
        try {
          const wpContext = (window as typeof window & {
            __MOCKUP100_WORDPRESS_CONTEXT__?: { wc_nonce?: string }
          }).__MOCKUP100_WORDPRESS_CONTEXT__ || {}
          const wpNonce = String(wpContext.wc_nonce || "")
          const snapshotResp = await fetch(`${siteUrl}/wp-json/mockup100/v1/cart-snapshots`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(wpNonce ? { "X-WP-Nonce": wpNonce } : {}),
            },
            body: JSON.stringify({
              unique_key: rowUniqueKey,
              items: [{ color: row.color, view: placeOrderActiveView.value, source_url: rowPreviewUrl }],
            }),
          })
          if (snapshotResp.ok) {
            const data = await snapshotResp.json().catch(() => ({})) as { snapshots?: Array<{ url?: string }> }
            const snapshotUrl = String(data?.snapshots?.[0]?.url || "").trim()
            if (snapshotUrl) {
              rowPreviewUrl = snapshotUrl
            }
          }
        } catch (e) {
          console.warn("[preview] cart-snapshots clone failed", e)
        }
      }
      // 0.4.68: 强制把最终 cart-meta preview_url 包装为 WP 代理路径
      // (/wp-json/.../runtime-asset?url=...);避免任何回退分支把裸 OSS / 平台 API URL 写入 cart,
      // 否则 cart 页公网直读 OSS 私有 bucket 会 403。
      rowPreviewUrl = resolveRuntimeAssetUrl(rowPreviewUrl)
      
      const rowUnitPrice = getRowUnitPriceNumber(row)
      const payloadRow = {
        id: row.id,
        color: row.color,
        attributes: rowMergedAttrs,
        text_overrides: row.textOverrides,
        quantity: rowQuantity,
        variation_id: rowVariationId,
        preview_url: rowPreviewUrl,
        unit_price: rowUnitPrice,
      }
      const designPayload: Record<string, unknown> = {
        template_id: selectedTemplateId.value,
        template_source: editorPayload.value?.template_source || "",
        selected_color: row.color,
        selected_view: placeOrderActiveView.value,
        output_size: previewSize.value,
        job_id: "",
        preview_url: rowPreviewUrl,
        download_url: "",
        design_summary: {
          draft_name: draftName,
          // 0.4.65: unique_key 加 row.id —— 让 WC 把每个 Requirement 当独立 cart line
          unique_key: `${selectedTemplateId.value}|${activeDraftId.value || "default"}|${row.id}`,
          attributes: rowMergedAttrs,
          text_overrides: row.textOverrides,
          text_layers: placeOrderTextLayers.value,
          quantity: rowQuantity,
        },
        // 0.4.65: placeOrderRows 仅含当前 row,后端 cart-meta 按单行渲染摘要
        placeOrderRows: [payloadRow],
        part_layers: placeOrderTextLayers.value,
      }
      const placeOrderClone = {
        product: {
          name: wordpressCurrentProduct.value?.name || "",
          sku: wordpressCurrentProduct.value?.sku || "",
          primary_variation_id: rowVariationId,
        },
        pricing: {
          price_html: wordpressCurrentProduct.value?.price_html || "",
          price_raw: wordpressCurrentProduct.value?.price || "",
          currency: String((wordpressCurrentProduct.value as any)?.currency || ""),
          unit_price: rowUnitPrice,
        },
        quantity: {
          rows: [{
            id: row.id,
            color: row.color,
            size: sizeAttrName ? (row.attributes[sizeAttrName] || "") : "",
            qty: rowQuantity,
            attrs: { ...(row.attributes || {}) },
          }],
          total: rowQuantity,
        },
        design: {
          name: activeDraft?.draftName || "",
          thumbnail_url: resolveRuntimeAssetUrl(draftPreviewImageMap.value[activeDraftId.value] || "") || rowPreviewUrl,
          draft_id: activeDraftId.value || "",
        },
        template: {
          name: currentTemplateDisplayName.value || "",
          code: currentTemplateNumber.value || "",
          id: selectedTemplateId.value || "",
        },
        parts: cloneParts,
      }
      designPayload.placeOrderClone = placeOrderClone

      const form = new FormData()
      form.append("product_id", String(productId))
      form.append("quantity", String(rowQuantity))
      if (rowVariationId > 0) {
        form.append("variation_id", String(rowVariationId))
      }
      if (rowVariationMatch.variation) {
        for (const [attrKey, attrVal] of Object.entries(rowVariationMatch.variation.attributes)) {
          if (!attrVal) continue
          form.set(attrKey, String(attrVal))
        }
      }
      Object.entries(rowMergedAttrs).forEach(([name, value]) => {
        if (!value) return
        const key = resolveAttributeKey(name)
        if (form.has(key)) return
        form.append(key, String(value))
      })
      if (wcAjaxNonce) {
        form.append("security", wcAjaxNonce)
        form.append("_wpnonce", wcAjaxNonce)
        form.append("woocommerce-add-to-cart-nonce", wcAjaxNonce)
      }
      form.append("mockup100_design_payload", JSON.stringify(designPayload))

      const res = await fetch(wcAjaxUrl, {
        method: "POST",
        body: form,
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          ...(wcAjaxNonce ? { "X-WC-Nonce": wcAjaxNonce } : {}),
        },
      })
      const rawText = await res.text()
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 200)}`)
      }
      let data: { error?: boolean; error_message?: string; notices?: unknown } | null = null
      try { data = rawText ? JSON.parse(rawText) : null } catch { data = null }
      if (data && data.error) {
        const noticeText = typeof data.notices === "string"
          ? data.notices.replace(/<[^>]+>/g, " ").trim()
          : ""
        throw new Error(String(data.error_message || noticeText || rawText.slice(0, 200) || t("placeOrderFailed")))
      }
    }
    if (wordpressShell.value.cartUrl) {
      // 0.4.60: 跳 cart 前清 wp shell dirty + 暂时跳过 beforeunload(避免自身导航也被拦)
      wpShellEditorDirty.value = false
      skipBeforeUnloadUntil.value = Date.now() + 4000
      window.location.href = wordpressShell.value.cartUrl
      return
    }
  } catch (err) {
    placeOrderError.value = String((err as Error)?.message || err || t("placeOrderFailed"))
  } finally {
    isAddingToCart.value = false
  }
}

async function ensureOpenPreviewEntries() {
  if (!viewPreviewModalOpen.value || !selectedTemplateId.value) return
  const color = activePreviewDialogColor.value
  const view = activePreviewDialogView.value
  if (!color || !view) return
  previewDialogWarmToken += 1
  const expectedColor = color
  const expectedView = view
  const mode = openPreviewMode.value
  const expectedSignature = previewSignature(mode)
  await ensurePreviewEntryComposed({
    color,
    view,
    size: OPEN_PREVIEW_SIZE,
    mode,
    expectedSignature,
  })
  if (!viewPreviewModalOpen.value) return
  if (expectedSignature !== previewSignature(mode)) return
  if (activePreviewDialogColor.value !== expectedColor || activePreviewDialogView.value !== expectedView) return
  await persistOpenPreviewEntriesIfNeeded()
  void ensurePreviewEntryComposed({
    color,
    view,
    size: OPEN_PREVIEW_THUMB_SIZE,
    mode,
    expectedSignature,
  })
  void warmPreviewEntries({
    color,
    size: OPEN_PREVIEW_THUMB_SIZE,
    mode,
    priorityView: view,
    views: availableViews.value,
    expectedSignature,
  })
}

function openViewPreviewDialog() {
  if (!selectedTemplateId.value || !availableViews.value.length) return
  const mainSelection = resolveMainPreviewSelection()
  previewDialogColor.value = selectedColor.value || mainSelection.color || editorPayload.value?.default_color || availableColors.value[0] || ""
  previewDialogView.value = selectedView.value || mainSelection.view || availableViews.value[0] || ""
  previewDialogPreloadToken += 1
  previewDialogWarmToken += 1
  viewPreviewModalOpen.value = true
  void ensureOpenPreviewEntries()
}

function closeViewPreviewDialog() {
  previewDialogPreloadToken += 1
  previewDialogWarmToken += 1
  viewPreviewModalOpen.value = false
}

async function setSelectedPreviewAsDraftMainImage() {
  const targetDraftId = resolveCurrentSessionDraftId()
  const targetView = activePreviewDialogView.value
  const targetColor = activePreviewDialogColor.value
  if (!targetDraftId || !targetView) return
  draftMainPreviewViewOverrides.value = {
    ...draftMainPreviewViewOverrides.value,
    [targetDraftId]: targetView,
  }
  if (targetColor) {
    draftMainPreviewColorOverrides.value = {
      ...draftMainPreviewColorOverrides.value,
      [targetDraftId]: targetColor,
    }
  }
  // 0.4.59: 同步 mainPreviewView/Color ref,确保 View Preview 弹窗里的
  // 主图标志立即更新到当前 selectedView/Color(不依赖 activeDraftId 的可见性)。
  mainPreviewView.value = targetView
  mainPreviewColor.value = targetColor || ""
  const dialogPreviewUrl = String(resolvePreviewImageForView(targetView, OPEN_PREVIEW_SIZE, {
    color: targetColor,
    mode: openPreviewMode.value,
    allowDefaultModeFallback: openPreviewMode.value !== "artwork",
    allowTemplateFallback: true,
  }) || activePreviewDialogEntry.value?.url || previewDialogImage.value || "").trim()
  const fallbackTemplatePreview = targetView
    ? resolveRuntimeAssetUrl(editorPayload.value?.preview_map?.[`${targetColor}::${targetView}`] || "")
    : ""
  const nextPreviewUrl = dialogPreviewUrl || fallbackTemplatePreview
  // 0.4.66.1: 在内存中立即写入 nextPreviewUrl (哪怕是临时的 job URL)，让当前 session 的卡片缩略图即时更新
  if (nextPreviewUrl) {
    setDraftPreviewImage(targetDraftId, nextPreviewUrl)
  }
  // 0.4.66: 但持久化到服务端的 preview_url 必须是稳定 URL(非 job-output 临时 URL),
  // 避免下次进入页面时从服务端回填一个已经过期的 jobs/{jobId}/outputs/{i}/preview 导致 404。
  let persistableNextPreviewUrl = isPersistentPreviewStorageValue(nextPreviewUrl) ? nextPreviewUrl : ""
  // 0.4.69 (Plan §1.1): 当 nextPreviewUrl 不是稳定 OSS URL(典型场景: View Preview 弹窗
  // 里 dialogPreviewUrl 是 job-output 临时 URL),主动触发当前主图视角/颜色的
  // renderAndPersistDraftOutputs,等 OSS 落库后用稳定 runtime-assets URL 持久化到 server,
  // 让 Designs 弹窗 / Place Order 弹窗下次打开都能读到最新主图。
  if (!persistableNextPreviewUrl && targetView && targetColor) {
    try {
      const outputs = await renderAndPersistDraftOutputs({
        draftId: targetDraftId,
        specificColors: [targetColor],
        specificViews: [targetView],
      })
      const persisted = outputs?.find((o) => o.color === targetColor && o.view === targetView)
      if (persisted?.url && isPersistentPreviewStorageValue(persisted.url)) {
        persistableNextPreviewUrl = persisted.url
        // 同步更新 draftPreviewImageMap,Designs 卡片缩略图立即用稳定 URL
        setDraftPreviewImage(targetDraftId, persisted.url)
      }
    } catch (e) {
      console.warn("[preview] setSelectedPreviewAsDraftMainImage persist failed", e)
    }
  }

  // 0.4.58: "Set as Main Image" 操作必须立即落库,避免用户关闭页面再进入时主图回退到第一个 view。
  // 这里只增量 PUT 主图相关字段(mainPreviewView/Color + preview_url),不写 design_json,
  // 因此不会把当前未保存的画布改动一起发到服务端,也不会改变 dirty 状态。
  if (isTenantAdmin.value && !isReadOnlyPreview.value) {
    void previewDraftStore.persistActiveDraftMainPreviewSelection({
      draftId: targetDraftId,
      mainPreviewView: targetView,
      mainPreviewColor: targetColor || "",
      previewUrl: persistableNextPreviewUrl,
    })
  } else if (isWordPressShell.value) {
    writeWorkspacePreferences()
  }
  showSaveNotice(t("setDraftMainImageSuccess"))
}

function openPreviewResultsSelectionModal() {
  const selectableViews = previewResultsSelectionEntries.value
    .filter((entry) => entry.selectable)
    .map((entry) => entry.view)
  previewResultsActionNotice.value = ""
  selectedPreviewResultViews.value = selectableViews.includes(selectedView.value)
    ? [selectedView.value]
    : (selectableViews[0] ? [selectableViews[0]] : [])
  previewResultsSelectionModalOpen.value = true
}

function closePreviewResultsSelectionModal(force = false) {
  if (isAddingPreviewResults.value && !force) return
  previewResultsSelectionModalOpen.value = false
  selectedPreviewResultViews.value = []
}

function togglePreviewResultSelection(view: string) {
  if (isAddingPreviewResults.value) return
  const selectable = previewResultsSelectionEntries.value.some((entry) => entry.view === view && entry.selectable)
  if (!selectable) return
  const next = new Set(selectedPreviewResultViews.value)
  if (next.has(view)) {
    next.delete(view)
  } else {
    next.add(view)
  }
  selectedPreviewResultViews.value = previewDialogEntries.value
    .map((entry) => entry.view)
    .filter((entryView) => next.has(entryView))
}

function openDuplicateLayerCountModal(target: ImageContextMenuPayload | null = imageContextMenu.value) {
  if (!target) return
  duplicateLayerCountTarget.value = { ...target }
  duplicateLayerCountDraft.value = "1"
  duplicateLayerCountModalOpen.value = true
}

function closeDuplicateLayerCountModal() {
  duplicateLayerCountModalOpen.value = false
  duplicateLayerCountDraft.value = "1"
  duplicateLayerCountTarget.value = null
}

function openLayerSizeModal(target: ImageContextMenuPayload | null = imageContextMenu.value) {
  if (!target) return
  layerSizeModalTarget.value = { ...target }
  layerSizeModalMode.value = target.layerKind === "text" ? "text" : "image"
  if (layerSizeModalMode.value === "image") {
    syncSizeDraft(imageSizeDraft, activeImageMetrics.value?.imageBoxDisplay || null)
  } else {
    syncSizeDraft(textContentSizeDraft, activeTextMetrics.value?.textContent?.display || null)
  }
  layerSizeModalOpen.value = true
}

function closeLayerSizeModal() {
  layerSizeModalOpen.value = false
  layerSizeModalTarget.value = null
  layerSizeModalMode.value = ""
  isApplyingLayerSize.value = false
  activeSizeDraftKey.value = ""
}

function updateLayerSizeDraftNumber(axis: "width" | "height", value: number | undefined) {
  if (layerSizeModalMode.value === "image") {
    updateImageSizeDraftNumber(axis, value)
    return
  }
  updateTextSizeDraftNumber("content", axis, value)
}

async function confirmLayerSizeModal() {
  if (!canConfirmLayerSize.value) return
  isApplyingLayerSize.value = true
  try {
    if (layerSizeModalMode.value === "image") {
      const measurement = activeImageMetrics.value?.imageBoxDisplay || null
      const factors = resolveLayerSizeModalResizeFactors({
        mode: "image",
        measurement,
        draft: imageSizeDraft.value,
      })
      if (factors.widthFactor) {
        const widthFactor = factors.widthFactor
        await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveImage?.("width", widthFactor))
      }
      if (factors.heightFactor) {
        const heightFactor = factors.heightFactor
        await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveImage?.("height", heightFactor))
      }
      syncSizeDraft(imageSizeDraft, activeImageMetrics.value?.imageBoxDisplay || measurement)
    } else if (layerSizeModalMode.value === "text") {
      const measurement = activeTextMetrics.value?.textContent?.display || null
      const factors = resolveLayerSizeModalResizeFactors({
        mode: "text",
        measurement,
        draft: textContentSizeDraft.value,
      })
      if (factors.heightFactor) {
        const heightFactor = factors.heightFactor
        await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveTextContent?.("height", heightFactor))
      }
      if (factors.widthFactor) {
        const widthFactor = factors.widthFactor
        await runCanvasMutationWithPreview(() => canvasRef.value?.resizeActiveTextContent?.("width", widthFactor))
      }
      syncSizeDraft(textContentSizeDraft, activeTextMetrics.value?.textContent?.display || measurement)
    }
    closeLayerSizeModal()
  } finally {
    isApplyingLayerSize.value = false
  }
}

async function confirmDuplicateLayerCount() {
  const target = duplicateLayerCountTarget.value
  const count = Math.min(50, Math.floor(Number(duplicateLayerCountDraft.value || "")))
  if (!target || !Number.isFinite(count) || count <= 0) return
  isApplyingDuplicateLayerCount.value = true
  try {
    await duplicateActiveByCount(count, target)
    closeDuplicateLayerCountModal()
  } finally {
    isApplyingDuplicateLayerCount.value = false
  }
}

async function handlePreviewSizeSelection(size: string) {
  const normalizedSize = normalizeOutputSize(size)
  if (!normalizedSize || normalizedSize === previewSize.value) return
  selectedSize.value = normalizedSize
  previewCustomSizeDraft.value = normalizedSize
  markPreviewDirty()
  await refreshCurrentViewPreview()
}

async function applyCustomPreviewSize() {
  const normalizedSize = normalizeOutputSize(previewCustomSizeDraft.value)
  if (!normalizedSize) {
    loadError.value = t("customSizeInvalid")
    return
  }
  loadError.value = ""
  await handlePreviewSizeSelection(normalizedSize)
}

function applyBatchCustomSize() {
  const normalizedSize = normalizeOutputSize(batchCustomSizeDraft.value)
  if (!normalizedSize) {
    loadError.value = t("customSizeInvalid")
    return
  }
  loadError.value = ""
  if (!selectedBatchSizes.value.includes(normalizedSize)) {
    selectedBatchSizes.value = [...selectedBatchSizes.value, normalizedSize]
  }
  batchCustomSizeDraft.value = normalizedSize
}

function markPreviewDialogEntryLoaded(loadKey: string, result?: { width?: number; height?: number; failed?: boolean }) {
  if (!loadKey) return
  const width = Number(result?.width || 0)
  const height = Number(result?.height || 0)
  if (width > 0 && height > 0) {
    const current = previewImageNaturalSizes.value[loadKey]
    if (current?.width !== width || current?.height !== height) {
      previewImageNaturalSizes.value = {
        ...previewImageNaturalSizes.value,
        [loadKey]: { width, height },
      }
    }
  }
  if (result?.failed) {
    previewDialogFailedEntries.value = new Set([...previewDialogFailedEntries.value, loadKey])
  }
  previewDialogLoadedEntries.value = new Set([...previewDialogLoadedEntries.value, loadKey])
}

async function preloadPreviewDialogEntries(entries: Array<{ loadKey: string; url: string }>) {
  const pendingEntries = entries.filter((entry) => entry.url && !previewDialogLoadedEntries.value.has(entry.loadKey))
  if (!pendingEntries.length) return
  const runToken = ++previewDialogPreloadToken
  await Promise.all(pendingEntries.map((entry) => new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => {
      if (runToken !== previewDialogPreloadToken) {
        resolve()
        return
      }
      markPreviewDialogEntryLoaded(entry.loadKey, {
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      resolve()
    }
    image.onerror = () => {
      if (runToken !== previewDialogPreloadToken) {
        resolve()
        return
      }
      markPreviewDialogEntryLoaded(entry.loadKey, { failed: true })
      resolve()
    }
    image.src = entry.url
  })))
}

function cachePreviewImageNaturalSize(loadKey: string, event: Event) {
  const image = event.target
  if (!(image instanceof HTMLImageElement)) return
  markPreviewDialogEntryLoaded(loadKey, {
    width: image.naturalWidth,
    height: image.naturalHeight,
  })
}

function resolveContextMenuPosition(left: number, top: number) {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0
  const menu = imageContextMenuRef.value
  const menuWidth = menu?.offsetWidth || 208
  const menuHeight = menu?.offsetHeight || 392
  const clampedLeft = Math.max(12, Math.min(left, Math.max(12, viewportWidth - menuWidth - 12)))
  const clampedTop = Math.max(12, Math.min(top, Math.max(12, viewportHeight - menuHeight - 12)))
  return {
    left: `${clampedLeft}px`,
    top: `${clampedTop}px`,
  }
}

function closeImageContextMenu() {
  imageContextMenu.value = null
  imageContextMenuStyle.value = {}
}

function formatTileModeOptionTitle(option: {
  label: string
  description: string
  shortcutKeys: string
}) {
  const lines = [option.label, option.description]
  if (option.shortcutKeys) {
    lines.push(`${t("shortcutLabel")}: ${option.shortcutKeys}`)
  }
  return lines.join("\n")
}

function formatTileModeOptionAriaLabel(option: {
  label: string
  description: string
  shortcutKeys: string
}) {
  const segments = [option.label, option.description]
  if (option.shortcutKeys) {
    segments.push(`${t("shortcutLabel")} ${option.shortcutKeys}`)
  }
  return segments.join(", ")
}

async function handleImageContextMenu(payload: ImageContextMenuPayload | null) {
  if (!payload) {
    closeImageContextMenu()
    return
  }
  imageContextMenu.value = payload
  await nextTick()
  imageContextMenuStyle.value = resolveContextMenuPosition(payload.left, payload.top)
}

const orphanLayerCleanupBuffer = new Map<string, Set<string>>()
let orphanLayerCleanupTimer: number | null = null
let orphanLayerCleanupRunning = false

async function handleArtworkLoadFailure(payload: {
  partKey: string
  layerId: string
  src: string
  previewSrc?: string
  stage: "draw" | "export"
}) {
  if (!payload?.partKey || !payload?.layerId) return
  let bucket = orphanLayerCleanupBuffer.get(payload.partKey)
  if (!bucket) {
    bucket = new Set<string>()
    orphanLayerCleanupBuffer.set(payload.partKey, bucket)
  }
  bucket.add(payload.layerId)
  if (typeof window === "undefined") return
  if (orphanLayerCleanupTimer !== null) {
    window.clearTimeout(orphanLayerCleanupTimer)
  }
  orphanLayerCleanupTimer = window.setTimeout(() => {
    orphanLayerCleanupTimer = null
    void flushOrphanLayerCleanup()
  }, 250)
}

function stripOrphanLayersFromState(
  state: SerializableCanvasState | null | undefined,
  victims: Map<string, Set<string>>,
) {
  if (!state || !Array.isArray(state.parts)) return { state, removed: 0 }
  let removed = 0
  const nextParts = state.parts.map((part) => {
    const targets = victims.get(part.partKey)
    if (!targets || !targets.size || !Array.isArray(part.layers)) return part
    const filteredLayers = part.layers.filter((layer) => {
      const layerId = String((layer as Record<string, unknown>)?.id || "")
      if (layerId && targets.has(layerId)) {
        removed += 1
        return false
      }
      return true
    })
    if (filteredLayers.length === part.layers.length) return part
    return { ...part, layers: filteredLayers }
  })
  if (!removed) return { state, removed: 0 }
  const nextState: SerializableCanvasState = {
    ...state,
    parts: nextParts,
    persistedAt: Date.now(),
  }
  return { state: nextState, removed }
}

async function flushOrphanLayerCleanup() {
  if (orphanLayerCleanupRunning) return
  if (!orphanLayerCleanupBuffer.size) return
  const templateId = selectedTemplateId.value
  if (!templateId || typeof window === "undefined") {
    orphanLayerCleanupBuffer.clear()
    return
  }
  orphanLayerCleanupRunning = true
  const victims = new Map<string, Set<string>>()
  for (const [partKey, ids] of orphanLayerCleanupBuffer.entries()) {
    victims.set(partKey, new Set(ids))
  }
  orphanLayerCleanupBuffer.clear()
  try {
    const draftId = activeDraftId.value
    const storageKey = getWorkspaceDesignStorageKey(templateId, draftId)
    const localDesign = readWorkspaceDesign(templateId, draftId)
    const indexedDesign = parseStoredWorkspaceDesign(JSON.stringify(
      await readIndexedDbValue<SerializableCanvasState | null>(storageKey, null),
    )) as SerializableCanvasState | null
    let totalRemoved = 0
    if (localDesign) {
      const { state: nextLocal, removed } = stripOrphanLayersFromState(localDesign, victims)
      if (removed > 0) {
        totalRemoved += removed
        if (hasPersistableWorkspaceDesign(nextLocal)) {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(nextLocal))
          } catch {
            // localStorage write may fail under quota pressure; IndexedDB still acts as the durable mirror.
          }
        } else {
          window.localStorage.removeItem(storageKey)
        }
      }
    }
    if (indexedDesign) {
      const { state: nextIndexed, removed } = stripOrphanLayersFromState(indexedDesign, victims)
      if (removed > 0) {
        totalRemoved += removed
        if (hasPersistableWorkspaceDesign(nextIndexed)) {
          await writeIndexedDbValue(storageKey, nextIndexed)
        } else {
          await removeIndexedDbValue(storageKey)
        }
      }
    }
    const liveState = canvasRef.value?.getSerializableState?.() as SerializableCanvasState | undefined
    if (liveState) {
      const { state: nextLive, removed } = stripOrphanLayersFromState(liveState, victims)
      if (removed > 0) {
        totalRemoved += removed
        await canvasRef.value?.restoreSerializableState?.(nextLive)
      }
    }
    if (totalRemoved > 0) {
      saveNotice.value = t("artworkResourceMissingCleaned")
      if (saveNoticeTimer) {
        window.clearTimeout(saveNoticeTimer)
      }
      saveNoticeTimer = window.setTimeout(() => {
        saveNoticeTimer = null
        saveNotice.value = ""
      }, 6000)
    }
  } finally {
    orphanLayerCleanupRunning = false
    if (orphanLayerCleanupBuffer.size) {
      orphanLayerCleanupTimer = window.setTimeout(() => {
        orphanLayerCleanupTimer = null
        void flushOrphanLayerCleanup()
      }, 250)
    }
  }
}

async function focusImageContextTarget(target: ImageContextMenuPayload | null) {
  if (!target) return false
  if (selectedPartKey.value !== target.partKey) {
    selectedPartKey.value = target.partKey
    await nextTick()
  }
  await canvasRef.value?.selectLayer?.(target.layerId, "programmatic")
  return true
}

async function runImageContextMenuAction(action: ImageContextAction) {
  const target = imageContextMenu.value
  if (!target) return
  await focusImageContextTarget(target)
  const menuTarget = { ...target }
  closeImageContextMenu()
  switch (action) {
    case "replace-current":
      openReplaceArtworkPicker("replace-current", menuTarget)
      return
    case "replace-name-part":
      openReplaceArtworkPicker("replace-name-part", menuTarget)
      return
    case "replace-name-all":
      openReplaceArtworkPicker("replace-name-all", menuTarget)
      return
    case "duplicate-count":
      openDuplicateLayerCountModal(menuTarget)
      return
    case "duplicate":
      await duplicateActive()
      return
    case "edit-size":
      openLayerSizeModal(menuTarget)
      return
    case "spread-part-bounds":
      await runCanvasMutationWithPreview(
        () => canvasRef.value?.runPresetAction?.("spread-part-bounds", {
          layerId: menuTarget.layerId,
          partKey: menuTarget.partKey,
        }),
        280,
      )
      return
    case "spread-part-canvas":
      await runCanvasMutationWithPreview(
        () => canvasRef.value?.runPresetAction?.("spread-part-canvas", {
          layerId: menuTarget.layerId,
          partKey: menuTarget.partKey,
        }),
        280,
      )
      return
    case "refresh-preview":
      await refreshCurrentViewPreview()
      return
    case "edit-text":
      setActiveSidebarTab("text")
      await canvasRef.value?.selectLayer?.(target.layerId, "programmatic", { enterTextEditing: true })
      return
    case "rotate-left":
      await rotateActive(-45)
      return
    case "rotate-right":
      await rotateActive(45)
      return
    case "delete":
      await removeActive()
      return
    case "flip-x":
      await flipActive("x")
      return
    case "flip-y":
      await flipActive("y")
      return
    case "bring-front":
      await moveLayer("forward")
      return
    case "send-back":
      await moveLayer("backward")
      return
    default:
      return
  }
}

function scrollActiveLayerIntoView() {
  nextTick(() => {
    const container = layersScrollRef.value
    if (!container || !activeLayerId.value) return
    const target = container.querySelector<HTMLElement>(`.layer-chip[data-layer-id="${CSS.escape(activeLayerId.value)}"]`)
    target?.scrollIntoView({ block: "nearest", inline: "nearest" })
  })
}

function handlePartSelection(partKey: string) {
  if (!partKey || partKey === selectedPartKey.value) return
  canvasRef.value?.stopTextEditing?.()
  closeImageContextMenu()
  activeLayerId.value = ""
  activeLayerKind.value = ""
  activeTextMetrics.value = null
  activeImageMetrics.value = null
  imageTileMode.value = "single"
  selectedPartKey.value = partKey
  nextTick(() => {
    refreshLayerOptions()
    refreshPartLayerCounts()
  })
}

function applyTextSettings() {
  if (!canEditText.value) return
  canvasRef.value?.updateActiveText?.({
    text: textDraft.value,
    fontSize: normalizeTextFontSize(textFontSize.value),
    fill: textColor.value,
    fontWeight: textWeight.value,
    fontStyle: textStyle.value,
    textAlign: textAlign.value,
    fontFamily: textFontFamily.value,
    lineHeight: normalizeTextLineHeight(textLineHeight.value),
  })
  markPreviewDirty()
}

function applySvgFillSettings() {
  const activeSvgLayer = selectedSvgLayer.value
  if (!canEditSvg.value || !activeSvgLayer) return
  void runCanvasMutationWithPreview(() => canvasRef.value?.updateActiveImage?.({
    isSvg: true,
    activeSvgLayerId: activeSvgLayer.id,
    svgFill: svgFillColor.value,
  }), 220)
}

function selectSvgLayer(layerId: string) {
  selectedSvgLayerId.value = layerId
}

function restoreSelectedSvgLayerColor() {
  if (!selectedSvgLayer.value) return
  svgFillColor.value = selectedSvgLayer.value.originalFill
  applySvgFillSettings()
}

function updateTextFontFamilyValue(value: string) {
  textFontFamily.value = value
  applyTextSettings()
}

function stepTextFontSize(delta: number) {
  if (!canEditText.value) return
  textFontSize.value = normalizeTextFontSize(textFontSize.value + delta, textFontSize.value)
  applyTextSettings()
}

function updateImageOpacityPercent(value: number) {
  imageOpacity.value = normalizeImageOpacity(value / 100)
  if (!canEditImage.value) return
  canvasRef.value?.updateActiveImage?.({
    opacity: imageOpacity.value,
  })
  markPreviewDirty()
}

async function scaleActive(factor: number) {
  await runCanvasMutationWithPreview(() => canvasRef.value?.scaleActive?.(factor))
}

async function rotateActive(delta: number) {
  await runCanvasMutationWithPreview(() => canvasRef.value?.rotateActive?.(delta))
}

async function flipActive(axis: "x" | "y") {
  await runCanvasMutationWithPreview(() => canvasRef.value?.flipActive?.(axis))
}

async function nudgeActive(deltaX: number, deltaY: number) {
  await runCanvasMutationWithPreview(() => canvasRef.value?.nudgeActive?.(deltaX, deltaY))
}

async function centerActive() {
  await runCanvasMutationWithPreview(() => canvasRef.value?.centerActive?.())
}

async function duplicateActive() {
  await runCanvasMutationWithPreview(() => canvasRef.value?.duplicateActive?.(), 300)
  window.setTimeout(() => {
    refreshLayerOptions()
    refreshPartLayerCounts()
  }, 0)
}

async function moveLayer(direction: "forward" | "backward") {
  await runCanvasMutationWithPreview(() => canvasRef.value?.reorderActive?.(direction), 300)
  window.setTimeout(() => refreshLayerOptions(), 0)
}

async function removeActive() {
  await runCanvasMutationWithPreview(() => canvasRef.value?.removeActive?.(), 300)
  refreshLayerOptions()
  refreshPartLayerCounts()
}

function goToAdjacentView(step: number) {
  if (!availableViews.value.length) return
  const currentIndex = currentViewIndex.value >= 0 ? currentViewIndex.value : 0
  const nextIndex = (currentIndex + step + availableViews.value.length) % availableViews.value.length
  selectedView.value = availableViews.value[nextIndex]
  if (viewPreviewModalOpen.value) {
    void ensureOpenPreviewEntries()
  }
}

function handleViewSelection(view: string) {
  selectedView.value = view
}

function handleDialogViewSelection(view: string) {
  if (!view || activePreviewDialogView.value === view) return
  previewDialogWarmToken += 1
  previewDialogView.value = view
  if (viewPreviewModalOpen.value) {
    void ensureOpenPreviewEntries()
  }
}

function handleDialogColorSelection(color: string) {
  if (!color || activePreviewDialogColor.value === color) return
  if (!availableColors.value.includes(color)) return
  previewDialogWarmToken += 1
  previewDialogColor.value = color
  if (viewPreviewModalOpen.value) {
    void ensureOpenPreviewEntries()
  }
}

function zoomIn() {
  zoomLevel.value = Math.min(Number((zoomLevel.value + 0.1).toFixed(2)), 1.8)
}

function zoomOut() {
  zoomLevel.value = Math.max(Number((zoomLevel.value - 0.1).toFixed(2)), 0.7)
}

function toggleGrid() {
  showGrid.value = !showGrid.value
}

async function clearBackgroundColor() {
  if (!selectedPartKey.value) return
  const next = { ...partBackgroundColors.value }
  delete next[selectedPartKey.value]
  partBackgroundColors.value = next
  clearInteractionPreviewTimer()
  clearAutoPreviewTimer()
  await nextTick()
  markPreviewDirty()
}

async function setBackgroundColor(color: string) {
  if (!selectedPartKey.value) return
  if (partBackgroundColors.value[selectedPartKey.value] === color) return
  partBackgroundColors.value = {
    ...partBackgroundColors.value,
    [selectedPartKey.value]: color,
  }
  clearInteractionPreviewTimer()
  clearAutoPreviewTimer()
  await nextTick()
  markPreviewDirty()
}

function resolveArtworkTileAction(artwork: ArtworkCatalogEntry) {
  return resolveArtworkCardAction(artwork, authRole.value, Boolean(currentTenantId.value))
}

function resolveArtworkActionLabel(artwork: ArtworkCatalogEntry) {
  const action = resolveArtworkTileAction(artwork)
  if (action === "use") {
    if (artwork.library_scope === "licensed" || artwork.purchased || artwork.unlocked) {
      return t("owned")
    }
    return artwork.commerce_type === "free" ? t("free") : t("use")
  }
  if (action === "purchase") {
    return artwork.price_tokens ? `${t("unlock")} ${artwork.price_tokens} ${t("tokens")}` : t("unlock")
  }
  return isPreviewAuthenticated.value ? t("unavailableToInsert") : t("loginToUnlock")
}

function resolveArtworkMetaLabel(artwork: ArtworkCatalogEntry) {
  if (artwork.library_scope === "upload") return t("personal")
  if (artwork.library_scope === "licensed") return t("owned")
  if (artwork.library_scope === "tenant") return t("shared")
  if (artwork.commerce_type === "free") return t("free")
  return artwork.price_tokens ? `${artwork.price_tokens} ${t("tokens")}` : t("paid")
}

function resolveArtworkBadges(artwork: ArtworkCatalogEntry) {
  return resolveArtworkCardBadges(artwork, authRole.value)
}

function openArtworkTokenPurchaseModal(entry: ArtworkCatalogEntry) {
  const priceTokens = Number(entry.price_tokens ?? 0)
  const currentBalance = Math.max(0, currentTokenBalance.value)
  artworkTokenPurchaseContext.value = {
    name: entry.name,
    priceTokens,
    shortfallTokens: Math.max(0, priceTokens - currentBalance),
    currentBalance,
  }
  showArtworkTokenPurchaseModal.value = true
}

async function handleArtworkTileAction(artwork: ArtworkCatalogEntry) {
  const action = resolveArtworkTileAction(artwork)
  selectedArtworkId.value = artwork.artwork_id
  if (action === "use") {
    await insertSelectedArtwork()
    return
  }
  if (action === "purchase") {
    await purchaseArtworkEntry(artwork)
    return
  }
  if (!isPreviewAuthenticated.value) {
    await router.push({
      path: "/auth",
      query: { mode: "login", redirect: route.fullPath },
    })
    return
  }
  setArtworkFeedback(
    getLocalizedUnauthorizedArtworkMessage(artwork.name, Boolean(currentTenantId.value), false),
    "error",
  )
}

function goToArtworkPage(page: number) {
  const nextPage = clampPage(page, currentArtworkTotalPages.value)
  if (artworkLibraryTab.value === "platform") {
    platformArtworkPage.value = nextPage
  } else if (artworkLibraryTab.value === "tenant") {
    tenantArtworkPage.value = nextPage
  } else if (artworkLibraryTab.value === "licensed") {
    licensedArtworkPage.value = nextPage
  } else {
    ownedArtworkPage.value = nextPage
  }
  clearHoveredArtwork()
  resetArtworkPanelPosition()
}

function toggleLayerVisibility(layerId: string) {
  canvasRef.value?.toggleLayerVisibility?.(layerId)
  window.setTimeout(() => {
    refreshLayerOptions()
    refreshPartLayerCounts()
  }, 0)
}

function removeLayerEntry(layerId: string) {
  canvasRef.value?.removeLayer?.(layerId)
  window.setTimeout(() => {
    refreshLayerOptions()
    refreshPartLayerCounts()
  }, 0)
}

function moveLayerEntry(layerId: string, direction: "forward" | "backward") {
  canvasRef.value?.reorderLayer?.(layerId, direction)
  window.setTimeout(() => refreshLayerOptions(), 0)
}

function renameLayerEntry(layer: LayerListEntry) {
  const next = window.prompt(t("renameLayerPrompt"), layer.label || "")
  if (next === null) return
  const trimmed = String(next || "").trim()
  if (!trimmed) return
  if (trimmed === layer.label) return
  const ok = canvasRef.value?.renameLayer?.(layer.id, trimmed)
  if (ok) refreshLayerOptions()
}

function handleLayerRowDblClick(layer: LayerListEntry) {
  if (layer.kind !== "text") return
  setActiveSidebarTab("text")
  canvasRef.value?.selectLayer?.(layer.id, "layers", { enterTextEditing: true })
}

async function renderView(view: string, size: string, color = selectedColor.value) {
  const result = await requestPreviewCompose({
    color,
    view,
    size,
    mode: activePreviewMode(),
  })
  if (!result) {
    return { outputs: [] } as ComposeResponse
  }
  commitPreviewComposeResult({
    color,
    view,
    size,
    mode: activePreviewMode(),
    url: result.url,
    filePath: result.filePath,
    signature: result.signature,
  })
  return result.response
}

async function mergeOutputs(entries: RenderOutputEntry[], options?: { waitForPersistence?: boolean }) {
  setRenderOutputs([...entries.slice().reverse(), ...renderOutputs.value])
  // 在 WP shell 下 isTenantAdmin=false，但 export 依然需要落库以便 results modal 重新打开后可见。
  // 这里改为只要是 results 类来源（export / download_zip）就持久化，绕过 isTenantAdmin 限制。
  const shouldPersist = isTenantAdmin.value
    || isWordPressShell.value
    || entries.some((entry) => isResultsOutputSource(entry.source))
  if (shouldPersist) {
    const persistTasks = entries.map((entry) => persistOutputToServer(entry).catch((error) => {
      // 不再静默吞错；把失败原因 surface 到 renderError，便于 WP shell 中诊断 results 不显示问题
      const message = String((error as Error)?.message || error || "")
      if (message && !renderError.value) {
        renderError.value = `Persist export result failed: ${message}`
      }
      if (typeof console !== "undefined") {
        console.warn("[preview] persistOutputToServer failed:", error)
      }
      return undefined
    }))
    if (options?.waitForPersistence) {
      await Promise.allSettled(persistTasks)
    }
  }
}

async function exportBatchToResults(options?: { downloadZip?: boolean }) {
  if (!selectedTemplateId.value || !selectedBatchViews.value.length || !selectedBatchSizes.value.length || !selectedBatchColors.value.length) return
  exportModalOpen.value = false
  isBatchExporting.value = !options?.downloadZip
  isBatchDownloading.value = Boolean(options?.downloadZip)
  renderError.value = ""
  try {
    const filePaths: string[] = []
    const collected: RenderOutputEntry[] = []
    const exportSource: RenderOutputEntry["source"] = options?.downloadZip ? "download_zip" : "export"
    for (const color of selectedBatchColors.value) {
      for (const view of selectedBatchViews.value) {
        for (const size of selectedBatchSizes.value) {
          // 优先复用 View Preview / 右上角预览同源缓存（同 color/view/size + 当前画布模式），避免重复 compose。
          const normalizedSize = normalizeOutputSize(size) || size
          const mode = activePreviewMode()
          const cachedFilePath = resolvePreviewFilePathForView(view, normalizedSize, {
            color,
            mode,
            allowDefaultModeFallback: mode !== "artwork",
          })
          const cachedUrl = resolvePreviewImageForView(view, normalizedSize, {
            color,
            mode,
            allowDefaultModeFallback: mode !== "artwork",
            allowTemplateFallback: false,
          })
          if (cachedFilePath && cachedUrl) {
            filePaths.push(cachedFilePath)
            collected.push({
              id: createOutputId(),
              color,
              view,
              size: normalizedSize,
              filePath: cachedFilePath,
              url: cachedUrl,
              createdAt: new Date().toISOString(),
              source: exportSource,
            })
            continue
          }
          const response = await renderView(view, size, color)
          response.outputs.forEach((item) => {
            const itemFilePath = resolveComposeOutputFilePath(item)
            if (!itemFilePath) {
              console.warn("[preview] exportBatch missing file_path/preview_url", item)
              return
            }
            const itemSize = normalizeLooseOutputSize(String(item.size || (item as Record<string, unknown>).output_size || size).trim())
              || normalizeOutputSize(size)
              || size
            const itemUrl = renderFileUrl(itemFilePath)
            setPreviewOutput(color, view, itemSize, itemUrl, itemFilePath, mode, previewSignature(mode))
            filePaths.push(itemFilePath)
            collected.push({
              id: createOutputId(),
              color,
              view,
              size: itemSize,
              filePath: itemFilePath,
              url: itemUrl,
              createdAt: new Date().toISOString(),
              source: exportSource,
            })
          })
        }
      }
    }
    await mergeOutputs(collected, { waitForPersistence: true })
    // export 完毕后,从服务端同步最新 results,避免本地临时 id 与服务端落库后 id 不一致导致重复显示
    if (selectedTemplateId.value) {
      await loadServerOutputs(selectedTemplateId.value, { syncResults: true })
    }
    // export 成功后立即打开 results 弹窗,让用户能直接看到刚导出的结果
    if (collected.length && !options?.downloadZip) {
      resultsModalOpen.value = true
    }
    if (options?.downloadZip) {
      const payload = await archiveRuntimeRenderFiles(filePaths)
      triggerDownload(renderFileUrl(payload.file_path, true))
    }
    writeWorkspacePreferences()
    await authStore.refreshSession()
  } catch (error) {
    renderError.value = resolvePreviewRequestErrorMessage(error)
  } finally {
    isBatchExporting.value = false
    isBatchDownloading.value = false
  }
}

async function downloadAllOutputs() {
  if (!renderOutputs.value.length) return
  try {
    // results 已迁 OSS：把相对路径展开为 OSS 公网 URL，archive 接口会自动下载并打包
    const filePaths = renderOutputs.value.map((item) => resolveRuntimeAssetUrl(item.filePath) || item.filePath)
    const payload = await archiveRuntimeRenderFiles(filePaths)
    triggerDownload(renderFileUrl(payload.file_path, true))
  } catch (error) {
    renderError.value = resolvePreviewRequestErrorMessage(error)
  }
}

function downloadOutput(filePath: string) {
  triggerDownload(renderFileUrl(filePath, true))
}

const selectedResultIds = ref<Set<string>>(new Set())
const resultLightboxOutput = ref<RenderOutputEntry | null>(null)
function openResultLightbox(output: RenderOutputEntry) {
  resultLightboxOutput.value = output
}
function closeResultLightbox() {
  resultLightboxOutput.value = null
}
function toggleResultSelection(outputId: string) {
  const next = new Set(selectedResultIds.value)
  if (next.has(outputId)) next.delete(outputId)
  else next.add(outputId)
  selectedResultIds.value = next
}
function clearResultSelection() {
  if (selectedResultIds.value.size === 0) return
  selectedResultIds.value = new Set()
}
function selectAllResults() {
  selectedResultIds.value = new Set(resultsDisplayOutputs.value.map((item) => item.id))
}
const selectedResultCount = computed(() => selectedResultIds.value.size)
const allResultsSelected = computed(() => {
  return resultsDisplayOutputs.value.length > 0 && selectedResultIds.value.size === resultsDisplayOutputs.value.length
})
function toggleSelectAllResults() {
  if (allResultsSelected.value) clearResultSelection()
  else selectAllResults()
}
async function downloadSelectedResults() {
  if (!selectedResultIds.value.size) return
  const selected = renderOutputs.value.filter((item) => selectedResultIds.value.has(item.id))
  if (!selected.length) return
  try {
    // 展开为 OSS 公网 URL，executor archive 接口会自动下载远程文件并打包成 zip
    const filePaths = selected.map((item) => resolveRuntimeAssetUrl(item.filePath) || item.filePath)
    const payload = await archiveRuntimeRenderFiles(filePaths)
    triggerDownload(renderFileUrl(payload.file_path, true))
  } catch (error) {
    handlePreviewError(error, (msg) => { renderError.value = msg })
  }
}
function formatResultGeneratedAt(value: string | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const resultImageRetryAttempts = new Map<string, number>()
function handleResultImageError(event: Event, output: RenderOutputEntry) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  const id = String(output.id || "")
  const attempts = resultImageRetryAttempts.get(id) || 0
  if (attempts >= 2) return
  resultImageRetryAttempts.set(id, attempts + 1)
  const baseUrl = output.url.split("?")[0]
  const cacheBust = `cb=${Date.now()}_${attempts + 1}`
  // 通过追加查询串触发浏览器重新拉取，规避 OSS 偶发的 ERR_CONTENT_LENGTH_MISMATCH
  setTimeout(() => {
    img.src = `${baseUrl}?${cacheBust}`
  }, 80)
}

function deleteOutputRecord(outputId: string) {
  if (isTenantAdmin.value) {
    void deleteOutputFromServer(outputId).catch(() => undefined)
  }
  renderOutputs.value = renderOutputs.value.filter((item) => item.id !== outputId)
  if (selectedResultIds.value.has(outputId)) {
    const next = new Set(selectedResultIds.value)
    next.delete(outputId)
    selectedResultIds.value = next
  }
  writeWorkspacePreferences()
}

function updateSelectionState(payload: {
  partKey: string
  layerId: string
  layerCount: number
  layerKind: LayerKind | ""
  selectionSource?: "canvas" | "layers" | "programmatic"
  selectionAction?: "canvas-click-image" | "canvas-click-text" | "canvas-dblclick-text" | "layers-select" | "programmatic"
  openTextInspector?: boolean
  openLayersInspector?: boolean
  textState: CanvasTextState | null
  imageState: CanvasImageState | null
}) {
  const previousLayerId = activeLayerId.value
  const shouldKeepTextDraft = previousLayerId === payload.layerId && isSidebarTextEditorActiveElement()
  if (payload.partKey && payload.partKey !== selectedPartKey.value) {
    selectedPartKey.value = payload.partKey
  }
  activeLayerId.value = payload.layerId
  layerCount.value = payload.layerCount
  activeLayerKind.value = payload.layerKind
  activeTextMetrics.value = payload.textState
  activeImageMetrics.value = payload.imageState
  const isCanvasNativeSelection = payload.selectionSource === "canvas"
    && (
      payload.selectionAction === "canvas-click-text"
      || payload.selectionAction === "canvas-click-image"
      || payload.selectionAction === "canvas-dblclick-text"
    )
  if (isCanvasNativeSelection) {
    manualSidebarTabOverride.value = null
  }
  const shouldPreserveManualSidebarTab = Boolean(manualSidebarTabOverride.value && !isCanvasNativeSelection)
  const shouldOpenTextInspector = isCanvasNativeSelection
    && (
      payload.openTextInspector
      || payload.selectionAction === "canvas-click-text"
      || payload.selectionAction === "canvas-dblclick-text"
      || payload.layerKind === "text"
    )
  const shouldOpenLayersInspector = isCanvasNativeSelection
    && (
      payload.openLayersInspector
      || payload.selectionAction === "canvas-click-image"
      || payload.layerKind === "image"
    )
  if (!shouldPreserveManualSidebarTab && shouldOpenTextInspector) {
    activeSidebarTab.value = "text"
  }
  if (!shouldPreserveManualSidebarTab && shouldOpenLayersInspector) {
    activeSidebarTab.value = payload.imageState?.isSvg ? "svg" : "layers"
    scrollActiveLayerIntoView()
  }
  if (payload.textState) {
    if (!shouldKeepTextDraft) {
      textDraft.value = payload.textState.text
      textFontSize.value = payload.textState.fontSize
      textColor.value = payload.textState.fill
      textWeight.value = payload.textState.fontWeight
      textStyle.value = payload.textState.fontStyle
      textAlign.value = payload.textState.textAlign
      textFontFamily.value = payload.textState.fontFamily
      textLineHeight.value = payload.textState.lineHeight
    }
  }
  if (payload.imageState) {
    imageOpacity.value = payload.imageState.opacity
    imageTileMode.value = payload.imageState.tileMode
  } else {
    imageOpacity.value = DEFAULT_IMAGE_OPACITY
    imageTileMode.value = "single"
  }
  refreshLayerOptions()
  refreshPartLayerCounts()
}

async function purchasePendingArtwork() {
  const entry = pendingArtworkPurchaseEntry.value
  if (!entry) return
  await purchaseArtworkEntry(entry)
}

async function purchaseArtworkEntry(entry: ArtworkCatalogEntry) {
  buyingArtworkId.value = entry.artwork_id
  try {
    const result = await artworkStore.purchaseArtwork(entry.artwork_id)
    setArtworkFeedback(
      result.already_owned
        ? formatPreviewMessage("alreadyUnlockedInserting", { name: entry.name })
        : formatPreviewMessage("unlockedSuccessfullyInserting", {
          name: entry.name,
          tokens: result.buyer_remaining_tokens,
        }),
      "success",
    )
    await loadArtworkLibrary("platform").catch(() => undefined)
    await insertSelectedArtwork()
  } catch (error) {
    setArtworkFeedback(resolveApiErrorMessage(error), "error", entry.artwork_id)
    if (isInsufficientArtworkTokensError(error)) {
      openArtworkTokenPurchaseModal(entry)
    }
  } finally {
    buyingArtworkId.value = ""
  }
}

function updateCanvasState(payload: { hasArtwork: boolean }) {
  hasArtwork.value = payload.hasArtwork
}

function isTextInputLikeTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target.isContentEditable
    || Boolean(target.closest("[contenteditable='true']"))
}

function isSidebarTextEditorActiveElement() {
  const target = document.activeElement
  if (!(target instanceof HTMLElement)) return false
  if (!target.closest(".text-tools")) return false
  return isTextInputLikeTarget(target)
}

function resetTextEditorDraft() {
  textDraft.value = DEFAULT_NEW_TEXT_CONTENT
  textFontSize.value = 52
  textColor.value = "#111827"
  textWeight.value = "700"
  textStyle.value = "normal"
  textAlign.value = "center"
  textFontFamily.value = DEFAULT_TEXT_FONT_FAMILY
  textLineHeight.value = DEFAULT_TEXT_LINE_HEIGHT
}

async function undoCanvas() {
  if (!canUndoHistory.value) return
  await canvasRef.value?.undo?.()
  markPreviewDirty()
}

async function redoCanvas() {
  if (!canRedoHistory.value) return
  await canvasRef.value?.redo?.()
  markPreviewDirty()
}

async function handleEditorHotkeys(event: KeyboardEvent) {
  const reloadShortcut = event.key === "F5"
    || ((event.metaKey || event.ctrlKey) && !event.altKey && String(event.key || "").toLowerCase() === "r")
  if (reloadShortcut) {
    if (!isTenantAdmin.value || isReadOnlyPreview.value) return
    await flushWorkspaceEditingState()
    if (!serverSaveDirty.value) return
    event.preventDefault()
    event.stopPropagation()
    await requestLeaveWorkspaceDecision("reload")
    return
  }
  if (isTextInputLikeTarget(event.target) || canvasRef.value?.isTextEditing?.()) return
  const matchedShortcut = findMatchingPreviewShortcut(event, previewPageShortcuts)
  if (!matchedShortcut) return
  event.preventDefault()
  event.stopPropagation()
  switch (matchedShortcut.id) {
    case "undo":
      await undoCanvas()
      return
    case "redo":
      await redoCanvas()
      return
    case "save-product":
      await saveTemplate()
      return
    case "background":
      setActiveSidebarTab("background")
      return
    case "layer":
      setActiveSidebarTab("layers")
      return
    case "open-hot-key":
      shortcutsModalOpen.value = true
      return
    default:
      return
  }
}

function toggleUserDropdown() {
  showUserDropdown.value = !showUserDropdown.value
}

function closeUserDropdown() {
  showUserDropdown.value = false
}

function isPreviewDropdownItemActive(target: RouteLocationRaw) {
  const resolved = router.resolve(target)
  const path = resolved.path
  if (path === "/admin/settings") {
    return route.path === "/admin/settings" || route.path === "/admin/profile"
  }
  return route.path === path
}

async function navigateFromDropdown(path: RouteLocationRaw) {
  closeUserDropdown()
  if (route.fullPath === router.resolve(path).fullPath) return
  await router.push(path)
}

async function handleBackLinkClick() {
  const target = backLinkTarget.value
  if (route.fullPath === router.resolve(target).fullPath) return
  if (!isTenantAdmin.value || isReadOnlyPreview.value) {
    await router.push(target)
    return
  }
  await flushWorkspaceEditingState()
  if (!serverSaveDirty.value) {
    await router.push(target)
    return
  }
  const decision = await requestLeaveWorkspaceDecision()
  if (decision === "cancel") return
  await router.push(target)
}

async function handleLogout() {
  try {
    closeUserDropdown()
    await authStore.logout()
    await router.push("/auth?mode=login")
  } catch (error) {
    console.error("Logout failed:", error)
  }
}

function handleClickOutside(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest(".user-dropdown")) {
    closeUserDropdown()
  }
  if (!target.closest(".topbar-menu")) {
    clearMenuOpen.value = false
    previewRefreshMenuOpen.value = false
  }
  if (!target.closest(".template-category-popover")) {
    showTemplateCategoryPopover.value = false
    showArtworkCategoryPopover.value = false
    showWordPressProductCategoryPopover.value = false
  }
  if (!target.closest(".canvas-context-menu")) {
    closeImageContextMenu()
  }
}

function handleCanvasStateChange(payload: {
  signature: string
  hasArtwork: boolean
  canUndo: boolean
  canRedo: boolean
  source: PreviewCanvasStateChangeSource
  suppressAutoPreview?: boolean
}) {
  const signatureChanged = canvasSignature.value !== payload.signature
  canvasSignature.value = payload.signature
  canUndoHistory.value = payload.canUndo
  canRedoHistory.value = payload.canRedo
  updateCanvasState(payload)
  refreshPartLayerCounts()
  writeWorkspaceDesign()
  if (shouldMarkPreviewDraftDirtyFromCanvasChange(payload.source)) {
    markServerDraftDirty()
  }
  if (signatureChanged) {
    previewRequestToken += 1
    if (payload.source === "user" || !payload.suppressAutoPreview) {
      markPreviewDirty()
    }
  }
  if (payload.suppressAutoPreview) {
    clearAutoPreviewTimer()
  }
  if (!payload.hasArtwork) {
    previewMode.value = "default"
    return
  }
}

function selectAllBatchColors() {
  selectedBatchColors.value = [...availableColors.value]
}

function resetBatchColors() {
  selectedBatchColors.value = availableColors.value[0] ? [availableColors.value[0]] : []
}

function clearBatchColors() {
  resetBatchColors()
}

function toggleBatchColor(color: string) {
  if (selectedBatchColors.value.includes(color)) {
    if (selectedBatchColors.value.length === 1) return
    selectedBatchColors.value = selectedBatchColors.value.filter((item) => item !== color)
    return
  }
  selectedBatchColors.value = [...selectedBatchColors.value, color]
}

function selectAllBatchViews() {
  selectedBatchViews.value = [...availableViews.value]
}

function resetBatchViews() {
  selectedBatchViews.value = availableViews.value[0] ? [availableViews.value[0]] : []
}

function clearBatchViews() {
  resetBatchViews()
}

function toggleBatchView(view: string) {
  if (selectedBatchViews.value.includes(view)) {
    if (selectedBatchViews.value.length === 1) return
    selectedBatchViews.value = selectedBatchViews.value.filter((item) => item !== view)
    return
  }
  selectedBatchViews.value = [...selectedBatchViews.value, view]
}

function toggleBatchSize(size: string) {
  const normalizedSize = normalizeOutputSize(size)
  if (!normalizedSize) return
  if (selectedBatchSizes.value.includes(normalizedSize)) {
    if (selectedBatchSizes.value.length === 1) return
    selectedBatchSizes.value = selectedBatchSizes.value.filter((item) => item !== normalizedSize)
    return
  }
  selectedBatchSizes.value = [...selectedBatchSizes.value, normalizedSize]
}

function selectAllBatchSizes() {
  selectedBatchSizes.value = [...availableSizes.value.map((size) => normalizeOutputSize(size)).filter(Boolean)]
}

function resetBatchSizes() {
  selectedBatchSizes.value = [PREVIEW_SIZE]
}

function clearBatchSizes() {
  resetBatchSizes()
}

async function saveTemplate() {
  if (isSavingTemplate.value) return
  if (!selectedTemplateId.value) {
    showSaveNotice(t("nothingToSave"))
    return
  }
  if (isReadOnlyPreview.value) {
    showSaveNotice(t("readOnly"))
    return
  }
  isSavingTemplate.value = true
  try {
    await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
  } catch (error) {
    console.error("Save workspace failed:", error)
    showSaveNotice(resolveApiErrorMessage(error) || resolvePreviewDraftFailureMessage(t("saveFailed")))
  } finally {
    isSavingTemplate.value = false
  }
}

async function saveAsTemplate() {
  if (isSavingTemplate.value) return
  if (!selectedTemplateId.value) {
    showSaveNotice(t("nothingToSave"))
    return
  }
  if (isReadOnlyPreview.value) {
    showSaveNotice(t("readOnly"))
    return
  }
  isSavingTemplate.value = true
  try {
    if (!await ensurePreviewDraftSessionReady({ allowDraftlessFallback: true, showNotice: true })) return
    await flushWorkspaceEditingState()
    previewDraftStore.openSaveDraftModal("create")
  } catch (error) {
    console.error("Save As workspace failed:", error)
    showSaveNotice(resolveApiErrorMessage(error) || resolvePreviewDraftFailureMessage(t("saveFailed")))
  } finally {
    isSavingTemplate.value = false
  }
}

watch(
  () => JSON.stringify(buildDraftPreferencesPayload()),
  () => {
    markServerDraftDirty()
  },
)

watch(
  () => [saveDraftModalOpen.value, switchDraftModalOpen.value, newWorkspaceModalOpen.value, deleteDraftModalOpen.value, leaveWorkspaceModalOpen.value].some(Boolean),
  (hasBlockingModal) => {
    if (hasBlockingModal && draftsModalOpen.value) {
      previewDraftStore.closeDraftsModal()
    }
  },
)

watch(
  () => [route.query.template_id, route.query.template],
  async () => {
    const nextTemplateId = resolveTemplateId()
    if (nextTemplateId && nextTemplateId !== selectedTemplateId.value) {
      await flushWorkspaceEditingState()
      if (serverSaveDirty.value && isTenantAdmin.value) {
        const shouldSave = window.confirm(t("saveBeforeSwitch"))
        if (shouldSave) {
          const saved = await saveCurrentWorkspaceBeforeTransition({ showNotice: true })
          if (!saved) return
        } else {
          const discard = window.confirm(t("discardContinue"))
          if (!discard) return
        }
      }
      syncTemplateRouteSelection(nextTemplateId, "template-selection")
      await loadWorkspace(nextTemplateId)
      await applyPendingArtworkInsert()
    }
  },
)

watch(
  () => [route.query.artwork_id, route.query.artwork],
  async () => {
    const nextArtworkId = resolveArtworkId()
    if (!nextArtworkId) return
    if (!licensedArtworkRecords.value.length) {
      await artworkStore.loadLicenses().catch(() => [] as ArtworkLicenseRecord[])
    }
    const nextTab = resolveArtworkLibraryTab(nextArtworkId)
    syncArtworkRouteSelection(nextArtworkId)
    if (nextTab === "platform") {
      await loadArtworkLibrary("platform").catch(() => undefined)
    } else if (nextTab === "tenant") {
      await loadArtworkLibrary("tenant").catch(() => undefined)
    }
    await applyPendingArtworkInsert()
  },
)

watch(partOptions, (parts) => {
  if (!parts.length) return
  if (!selectedPartKey.value || !parts.some((item) => item.part_name === selectedPartKey.value)) {
    selectedPartKey.value = parts[0].part_name
  }
})

watch(selectedPartKey, () => {
  window.setTimeout(() => {
    refreshLayerOptions()
    refreshPartLayerCounts()
  }, 0)
})

watch(
  () => canvasRef.value,
  async (instance) => {
    if (!instance) return
    await nextTick()
    refreshLayerOptions()
    refreshPartLayerCounts()
  },
  { flush: "post" },
)

watch(currentArtworkTotalPages, (totalPages) => {
  if (artworkLibraryTab.value === "platform") {
    platformArtworkPage.value = clampPage(platformArtworkPage.value, totalPages)
  } else if (artworkLibraryTab.value === "tenant") {
    tenantArtworkPage.value = clampPage(tenantArtworkPage.value, totalPages)
  } else if (artworkLibraryTab.value === "licensed") {
    licensedArtworkPage.value = clampPage(licensedArtworkPage.value, totalPages)
  } else {
    ownedArtworkPage.value = clampPage(ownedArtworkPage.value, totalPages)
  }
})

watch(templateTotalPages, (totalPages) => {
  templatePageState.value[templateLibraryScope.value] = clampPage(
    templatePageState.value[templateLibraryScope.value] || 1,
    totalPages,
  )
})

watch(templateLibraryScope, () => {
  templatePageState.value[templateLibraryScope.value] = 1
  clearHoveredTemplate()
  showTemplateCategoryPopover.value = false
  resetTemplatePanelPosition()
})

watch(
  activeSidebarTab,
  async (tab) => {
    if (tab !== "artwork") return
    await Promise.all([
      ensureActiveArtworkLibraryHydrated(),
      !licensedArtworkRecords.value.length
        ? artworkStore.loadLicenses().catch(() => [] as ArtworkLicenseRecord[])
        : Promise.resolve([] as ArtworkLicenseRecord[]),
      !ownedArtworkLibrary.value.length
        ? loadUploadArtworkLibrary().catch(() => undefined)
        : Promise.resolve(undefined),
    ])
  },
)

watch(
  artworkLibraryTab,
  async (tab) => {
    if (tab === "platform") {
      platformArtworkPage.value = 1
    } else if (tab === "tenant") {
      tenantArtworkPage.value = 1
    } else if (tab === "licensed") {
      licensedArtworkPage.value = 1
    } else {
      ownedArtworkPage.value = 1
    }
    clearHoveredArtwork()
    showArtworkCategoryPopover.value = false
    selectedArtworkId.value = ""
    clearArtworkFeedback()
    resetArtworkPanelPosition()
    if (tab === "platform") {
      await loadArtworkLibrary("platform").catch(() => undefined)
    } else if (tab === "tenant") {
      await loadArtworkLibrary("tenant").catch(() => undefined)
    } else if (tab === "licensed") {
      await artworkStore.loadLicenses().catch(() => [] as ArtworkLicenseRecord[])
    } else if (tab === "owned") {
      await loadUploadArtworkLibrary().catch(() => undefined)
    }
    if (!isInitializingWorkspace) {
      writeWorkspacePreferences()
    }
  },
)

watch(
  () => [activeSidebarTab.value, templateLibraryScope.value, templateLibraryScopePinnedByUser.value] as const,
  () => {
    if (isInitializingWorkspace) return
    writeWorkspacePreferences()
  },
)

watch(
  () => [platformArtworkSearch.value, platformArtworkCategoryId.value, platformArtworkPage.value] as const,
  async () => {
    if (artworkLibraryTab.value !== "platform") return
    await loadArtworkLibrary("platform").catch(() => undefined)
  },
)

watch(
  () => [tenantArtworkSearch.value, tenantArtworkCategoryId.value, tenantArtworkPage.value] as const,
  async () => {
    if (artworkLibraryTab.value !== "tenant") return
    await loadArtworkLibrary("tenant").catch(() => undefined)
  },
)

watch(partBackgroundColors, () => {
  if (isInitializingWorkspace) return
  writeWorkspacePreferences()
  markPreviewDirty()
}, { deep: true })

watch(zoomLevel, async () => {
  await nextTick()
  canvasRef.value?.refreshPointerOffsets?.()
})

watch(
  () => [selectedColor.value, selectedView.value],
  ([color, view]) => {
    if (!color || !view || !selectedTemplateId.value || !editorPayload.value) return
    if (isInitializingWorkspace) {
      return
    }
    if (isPreviewCurrent(color, view)) {
      previewMode.value = activePreviewMode()
      return
    }
    previewRequestToken += 1
    scheduleSelectedViewPreview(PREVIEW_VIEW_SWITCH_DEBOUNCE_MS, {
      reason: "view-switch",
      queueIfBusy: true,
    })
  },
)

watch(
  () => viewPreviewModalOpen.value
    ? [
      ...previewDialogEntries.value.map((entry) => `${entry.cacheKey}:${entry.url}`),
      activePreviewDialogEntry.value ? `${activePreviewDialogEntry.value.cacheKey}:${activePreviewDialogEntry.value.url}` : "",
    ].join("|")
    : "",
  (signature) => {
    if (!viewPreviewModalOpen.value || !signature) return
    const preloadEntries = [
      ...previewDialogEntries.value,
      ...(activePreviewDialogEntry.value ? [{
        loadKey: activePreviewDialogEntry.value.loadKey,
        url: activePreviewDialogEntry.value.url,
      }] : []),
    ]
    void preloadPreviewDialogEntries(preloadEntries)
  },
  { immediate: true },
)

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (Date.now() < skipBeforeUnloadUntil.value) return
  // 0.4.60: 平台 preview 走 serverSaveDirty;WP shell(mall)走 wpShellEditorDirty。
  // 任意一边为 true 即拦截,与平台 preview 行为一致。
  if (!serverSaveDirty.value && !wpShellEditorDirty.value) return
  event.preventDefault()
  event.returnValue = ""
}

function handlePageHide() {
  if (Date.now() < skipBeforeUnloadUntil.value) return
  if (!isTenantAdmin.value || isReadOnlyPreview.value || !serverSaveDirty.value || !selectedTemplateId.value) return
  markDiscardedWorkspaceSnapshot(selectedTemplateId.value, activeDraftId.value)
}

onBeforeRouteLeave(async () => {
  if (!isTenantAdmin.value || isReadOnlyPreview.value) return true
  await flushWorkspaceEditingState()
  if (!serverSaveDirty.value) return true
  const decision = await requestLeaveWorkspaceDecision()
  if (decision === "save") return true
  if (decision === "discard") return true
  return false
})

watch(resultsModalOpen, async (isOpen) => {
  if (!isOpen || !selectedTemplateId.value) return
  // 打开 results modal 时从服务端加载最新的 results 类输出，确保不会显示 0
  await loadServerOutputs(selectedTemplateId.value, { syncResults: true })
})

onMounted(async () => {
  startPreviewAutoCheckTimer()
  document.addEventListener("click", handleClickOutside)
  document.addEventListener("keydown", handleEditorHotkeys)
  window.addEventListener("beforeunload", handleBeforeUnload)
  window.addEventListener("pagehide", handlePageHide)
  applyInitialWordPressProductNavState()
  if (isWordPressShell.value) {
    loadWordPressProductCategories().catch(() => undefined)
    loadWordPressProducts().catch(() => undefined)
  }
  let initialTemplateId = resolveTemplateId()
  const initialArtworkId = resolveArtworkId()
  let initialTemplateResolvedByContext = false
  await loadUploadArtworkLibrary()
  hiddenOwnedArtworkIds.value = readHiddenOwnedArtworkIds()
  hiddenLicensedArtworkIds.value = readHiddenLicensedArtworkIds()
  if (isStorefrontAdminPreview.value) {
    await storefrontStore.loadCurrentStorefront(storefrontAdminContext.value.tenantId || undefined).catch(() => undefined)
  } else if (isStorefrontPreview.value && storefrontSlug.value) {
    await storefrontStore.loadPublicStorefront(storefrontSlug.value).catch(() => undefined)
  }
  const loadDeferredSidebarData = async () => {
    await Promise.all([
    platformStore.fetchCategories().catch(() => [] as CategoryNode[]),
    artworkStore.loadCategories("platform").catch(() => [] as ArtworkCategoryNode[]),
    artworkStore.loadCategories("tenant").catch(() => [] as ArtworkCategoryNode[]),
    artworkStore.loadLicenses().catch(() => [] as ArtworkLicenseRecord[]),
    loadArtworkLibrary("platform").catch(() => undefined),
    loadArtworkLibrary("tenant").catch(() => undefined),
    ])
    const deferredArtworkId = resolveArtworkId()
    if (deferredArtworkId) {
      syncArtworkRouteSelection(deferredArtworkId)
    }
  }
  await Promise.all([
    templateStore.load(),
    fetchPublicTemplates(),
    authRole.value === "platform_admin"
      ? platformStore.loadSubmissions({ auth: authStore.authHeaders }).catch(() => [] as TemplateSubmissionItem[])
      : Promise.resolve([] as TemplateSubmissionItem[]),
  ])

  if (!initialTemplateId || isPublishedTemplateScope(previewTemplateScopeConfig.value.defaultScope)) {
    try {
      const query = new URLSearchParams()
      query.set("source", String(previewSource.value || "repository"))
      if (initialTemplateId) {
        query.set("template_id", initialTemplateId)
      }
      if (storefrontSlug.value) {
        query.set("storefront_slug", storefrontSlug.value)
      }
      const context = await gatewayPlatformFetch<{
        template_id?: string
        default_preview_template_id?: string
      }>(`/api/v1/preview/context?${query.toString()}`, {
        headers: authStore.authHeaders,
      })
      const resolved = String(context?.template_id || context?.default_preview_template_id || "").trim()
      if (resolved) {
        initialTemplateResolvedByContext = true
        initialTemplateId = resolved
        await router.replace({
          query: {
            ...route.query,
            template_id: resolved,
          },
        })
      }
    } catch {
    }
  }
  const initialScope = initialTemplateId
    ? (resolveTemplateScopeForReference(initialTemplateId, previewTemplateScopeConfig.value.fallbackScopes) || previewTemplateScopeConfig.value.defaultScope)
    : previewTemplateScopeConfig.value.defaultScope
  if (initialTemplateId) {
    syncTemplateRouteSelection(initialTemplateId, "initial-sync")
  } else {
    applyTemplateLibraryTab(
      initialScope,
      "initial-sync",
    )
  }
  if (templateStore.error) {
    loadError.value = templateStore.error
  }
  if (initialArtworkId) {
    await artworkStore.loadLicenses().catch(() => [] as ArtworkLicenseRecord[])
    syncArtworkRouteSelection(initialArtworkId)
  }
  if (initialTemplateId) {
    await loadWorkspace(initialTemplateId)
    await applyPendingArtworkInsert()
    loadDeferredSidebarData().catch(() => undefined)
    return
  }
  const fallbackTemplateId = resolveFirstAvailableTemplateId()
  if (fallbackTemplateId) {
    syncTemplateRouteSelection(fallbackTemplateId, "initial-sync")
    await loadWorkspace(fallbackTemplateId)
    await applyPendingArtworkInsert()
  }
  loadDeferredSidebarData().catch(() => undefined)
})

onBeforeUnmount(() => {
  cancelHoveredArtworkClear()
  clearAutoPreviewTimer()
  clearInteractionPreviewTimer()
  clearPreviewAutoCheckTimer()
  clearDraftAutosaveTimer()
  clearSaveNoticeTimer()
  if (wordpressProductSearchTimer !== null) {
    window.clearTimeout(wordpressProductSearchTimer)
  }
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
  document.removeEventListener("keydown", handleEditorHotkeys)
  window.removeEventListener("beforeunload", handleBeforeUnload)
  window.removeEventListener("pagehide", handlePageHide)
})
</script>

<style scoped>
/* 0.4.51: 平台租户 token 余额不足弹窗样式 */
.mockup100-insufficient-tokens-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.mockup100-insufficient-tokens-modal {
  background: #fff;
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
  color: #0f172a;
  font-size: 14px;
  line-height: 1.6;
}
.mockup100-insufficient-tokens-modal header h3 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #b91c1c;
}
.mockup100-insufficient-tokens-modal .body p {
  margin: 8px 0;
}
.mockup100-insufficient-tokens-modal .body a {
  color: #2563eb;
  text-decoration: underline;
}
.mockup100-insufficient-tokens-modal footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.mockup100-insufficient-tokens-modal .action-button {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  cursor: pointer;
  font-weight: 600;
}
.mockup100-insufficient-tokens-modal .action-button:hover {
  background: #1d4ed8;
}

.preview-page {
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
  color: #0f172a;
}

.preview-topbar {
  width: 100%;
  padding: 0.85rem 1.1rem 0;
}

/* Bug 2-1: WordPress shell 模式去掉顶部 padding,避免顶栏上方空白 */
.preview-page--wp-shell .preview-topbar {
  padding-top: 0;
}

.hero-nav {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.85rem;
  position: relative;
  min-height: 68px;
  width: 100%;
}

.preview-brand-link {
  text-decoration: none;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  justify-self: start;
  padding: 0.8rem 1rem;
  border: 1px solid #d9e2f1;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  transition: all 0.2s ease;
}

.wordpress-shell-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  justify-self: start;
  min-width: 0;
  color: #111827;
  text-decoration: none;
}

.wordpress-shell-brand-logo {
  display: block;
  width: auto;
  height: 32px;
  max-width: 160px;
  object-fit: contain;
}

.wordpress-shell-brand-title {
  color: #111827;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.back-btn:hover {
  transform: translateY(-1px);
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.back-btn svg,
.action-btn svg,
.tool-btn svg,
.zoom-btn svg,
.toggle-btn svg {
  width: 16px;
  height: 16px;
}

.product-actions {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  justify-self: end;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.locale-select {
  display: inline-flex;
  align-items: center;
  min-width: 76px;
}

.locale-select :deep(.filter-dropdown) {
  min-width: 76px;
}

.locale-select :deep(.filter-dropdown-trigger) {
  height: 2.15rem;
  border-radius: 999px;
  border-color: rgba(203, 213, 225, 0.95);
  background: rgba(255, 255, 255, 0.92);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0 0.58rem;
}

.topbar-menu {
  position: relative;
}

.topbar-menu .action-btn.active {
  border-color: rgba(37, 99, 235, 0.35);
  background: rgba(37, 99, 235, 0.08);
}

.topbar-popover {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 30;
  min-width: 180px;
  padding: 0.4rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
}

.topbar-popover-item {
  display: flex;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  color: #0f172a;
  font-size: 0.92rem;
  text-align: left;
  cursor: pointer;
}

.topbar-popover-item:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.05);
}

.topbar-popover-item.danger {
  color: #dc2626;
}

.user-dropdown {
  position: relative;
}

.wordpress-shell-nav {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  margin-left: 0.35rem;
  flex-wrap: wrap;
}

.wordpress-shell-icon-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: #374151;
  text-decoration: none;
}

.wordpress-place-order-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.85rem;
  height: 2.2rem;
  margin-left: 0.45rem;
  border: none;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.wordpress-place-order-btn svg {
  width: 1.05rem;
  height: 1.05rem;
  fill: none;
  stroke: currentColor;
}

.wordpress-place-order-btn:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(29, 78, 216, 0.32);
}

.wordpress-place-order-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.wordpress-place-order-label {
  white-space: nowrap;
}

.po-rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.po-requirement-row {
  /* Bug 5: 多行需求纵向堆叠，行内属性横向 */
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 0.4.42: 编号与字段同行展示 — 紧凑、与下拉框底对齐 */
.po-requirement-row-index {
  flex: 0 0 auto;
  width: 24px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
  align-self: flex-end;
  padding-bottom: 0.45rem;
}

.po-requirement-fields {
  /* color / size / quantity / 其他属性 横向排列，一行展示 */
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.6rem 0.75rem;
}

.po-field {
  display: flex;
  flex-direction: column;
  min-width: 100px;
  gap: 0.25rem;
}

.po-field--text {
  /* 设计稿文字输入项可吸收剩余空间 */
  flex: 1 1 12rem;
  min-width: 12rem;
}

.po-field-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.po-field-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 14px;
  background: #fff;
  min-width: 100px;
  outline: none;
}

.po-field-select:focus {
  border-color: #3b82f6;
}

.po-field-select[disabled] {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.po-row-remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.4rem;
  border-radius: 0.25rem;
  line-height: 1;
  /* 0.4.42: 移除按钮在 fields 行末贴底,避免高度顶到首行 */
  align-self: flex-end;
  margin-left: auto;
  padding-bottom: 0.4rem;
}
.po-row-remove:hover {
  background: #fef2f2;
}

.po-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.po-row > label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  flex: 0 0 auto;
  min-width: 5.5rem;
}
.po-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
}
.po-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.po-chip-list > button {
  background: #f3f4f6;
  border: 1px solid transparent;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  color: #4b5563;
  cursor: pointer;
}
.po-chip-list > button.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}
.po-row > select,
.po-text-row > input,
.po-row > input {
  padding: 0.4rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.9rem;
  outline: none;
}
.po-row > select:focus,
.po-text-row > input:focus,
.po-row > input:focus {
  border-color: #3b82f6;
}
.po-text-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.po-text-row > label {
  font-size: 0.8rem;
  color: #4b5563;
  width: 3rem;
  flex-shrink: 0;
}
.po-text-row > input {
  flex: 1;
  min-width: 0;
}
.po-add-row {
  /* Bug 5: 加号图标按钮 */
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  align-self: flex-start;
  margin-top: 0.5rem;
  background: #eef2ff;
  border: 1px dashed #6366f1;
  color: #4338ca;
  padding: 0.45rem 0.9rem;
  border-radius: 0.4rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}
.po-add-row svg {
  width: 16px;
  height: 16px;
}
.po-add-row:hover {
  background: #e0e7ff;
  border-color: #4f46e5;
}
.po-total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}
.po-total-row > span {
  font-size: 0.85rem;
  color: #4b5563;
}
.po-total-row > strong {
  font-size: 1.1rem;
  color: #111827;
}
/* 0.4.44: Total Qty 单独一行,强制右对齐(提升 specificity + !important 防主题/CDN 旧 CSS 干扰) */
.place-order-modal .place-order-modal-form .po-total-summary,
.place-order-modal-form .po-total-summary {
  display: flex !important;
  justify-content: flex-end !important;
  align-items: baseline !important;
  gap: 0.5rem !important;
  margin-top: 0.75rem !important;
  margin-left: auto !important;
  padding: 0.45rem 0.85rem !important;
  background: #f9fafb !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 0.4rem !important;
  font-size: 0.82rem !important;
  color: #4b5563 !important;
  text-align: right !important;
  width: fit-content !important;
  max-width: 100% !important;
}
.place-order-modal .place-order-modal-form .po-total-summary > span,
.place-order-modal-form .po-total-summary > span {
  color: #6b7280 !important;
  font-weight: 500 !important;
}
.place-order-modal .place-order-modal-form .po-total-summary > strong,
.place-order-modal-form .po-total-summary > strong {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: #111827 !important;
}
/* 0.4.43: 弹窗顶部"当前设计稿"切换器 */
.po-design-switcher {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #6b7280;
}
.po-design-switcher-label {
  font-weight: 600;
  color: #374151;
}
.po-design-switcher-select {
  flex: 0 1 auto;
  max-width: 220px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.35rem;
  background: #ffffff;
  font-size: 0.8rem;
  color: #111827;
  cursor: pointer;
}
.po-design-switcher-select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}
/* 0.4.46: 自定义下拉(强制下方展开) */
.po-design-switcher-dropdown {
  position: relative;
  flex: 0 1 auto;
  max-width: 240px;
  min-width: 140px;
}
.po-design-switcher-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.3rem 0.55rem;
  border: 1px solid #d1d5db;
  border-radius: 0.35rem;
  background: #ffffff;
  font-size: 0.8rem;
  color: #111827;
  cursor: pointer;
  gap: 0.4rem;
}
.po-design-switcher-trigger:hover:not(:disabled) {
  border-color: #9ca3af;
}
.po-design-switcher-dropdown.is-open .po-design-switcher-trigger {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.po-design-switcher-trigger:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}
.po-design-switcher-trigger-text {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.po-design-switcher-caret {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.15s ease;
}
.po-design-switcher-dropdown.is-open .po-design-switcher-caret {
  transform: rotate(180deg);
}
.po-design-switcher-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  z-index: 50;
}
.po-design-switcher-option {
  padding: 6px 12px;
  font-size: 0.8rem;
  color: #111827;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.po-design-switcher-option:hover {
  background: #f3f4f6;
}
.po-design-switcher-option.is-active {
  background: #e0ecff;
  color: #1d4ed8;
  font-weight: 600;
}
/* 0.4.47: row 内自定义下拉(color/size/attr/qty) — 与 designs 风格一致 */
.po-field-dropdown {
  position: relative;
  flex: 1 1 auto;
  min-width: 96px;
}
.po-field-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.3rem 0.55rem;
  border: 1px solid #d1d5db;
  border-radius: 0.35rem;
  background: #ffffff;
  font-size: 0.8rem;
  color: #111827;
  cursor: pointer;
  gap: 0.4rem;
}
.po-field-trigger:hover:not(:disabled) {
  border-color: #9ca3af;
}
.po-field-dropdown.is-open .po-field-trigger {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.po-field-trigger:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}
.po-field-trigger-text {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.po-field-caret {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.15s ease;
}
.po-field-dropdown.is-open .po-field-caret {
  transform: rotate(180deg);
}
.po-field-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  z-index: 50;
}
.po-field-option {
  padding: 6px 12px;
  font-size: 0.8rem;
  color: #111827;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.po-field-option:hover {
  background: #f3f4f6;
}
.po-field-option.is-active {
  background: #e0ecff;
  color: #1d4ed8;
  font-weight: 600;
}
/* 0.4.46: 无 draft 时下方提示 */
.po-no-draft-tip {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.75rem;
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 0.35rem;
  font-size: 0.8rem;
  color: #9a3412;
  text-align: center;
}
.po-total {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.po-total > span {
  font-size: 0.9rem;
  color: #4b5563;
}
.po-total > strong {
  font-size: 1.25rem;
  color: #111827;
}
.po-total > strong::before {
  content: "$";
  font-size: 0.9rem;
  margin-right: 0.1rem;
}

.place-order-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.place-order-modal {
  width: min(960px, 100%);
  max-height: 90vh;
  background: #ffffff;
  border-radius: 0.85rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}

.place-order-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.place-order-modal-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #111827;
}

.place-order-modal-close {
  border: none;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 0.4rem;
}

.place-order-modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.place-order-modal-body {
  /* Bug 2-3: 单列垂直布局,顶部缩略图 + 表单,去除左侧空白栏 */
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem 1.25rem;
  overflow: auto;
}

.place-order-modal-summary {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.place-order-modal-summary-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.place-order-modal-images {
  display: flex;
  flex-direction: column;
}

.place-order-modal-main-image {
  /* Bug 5: 主图缩小为缩略图尺寸 */
  width: 80px;
  height: 80px;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  object-fit: cover;
}

.place-order-modal-thumbs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.place-order-modal-thumbs button {
  width: 72px;
  padding: 0.25rem;
  border-radius: 0.4rem;
  border: 1px solid #d1d5db;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  color: #4b5563;
}

.place-order-modal-thumbs button.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
  color: #1d4ed8;
}

.place-order-modal-thumbs img {
  width: 100%;
  height: auto;
}

.place-order-modal-form {
  display: flex;
  flex-direction: column;
}

.po-product-name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.4rem;
}

.po-product-price {
  font-size: 1.1rem;
  color: #2563eb;
  margin-bottom: 0.85rem;
}

.po-row {
  margin-bottom: 0;
}

.po-row label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0;
}

.po-hint {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.po-chip-list {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.po-chip-list button {
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  cursor: pointer;
  font-size: 0.8rem;
  color: #374151;
}

.po-chip-list button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.po-text-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.po-text-row span {
  font-size: 0.75rem;
  color: #6b7280;
  min-width: 6.5rem;
}

.po-text-row input,
.po-row select,
.po-row input[type="number"] {
  flex: 1 1 8rem;
  min-width: 6rem;
  padding: 0.4rem 0.55rem;
  border-radius: 0.4rem;
  border: 1px solid #d1d5db;
  font-size: 0.85rem;
  color: #111827;
  background: #ffffff;
}

.po-total {
  margin: 1rem 0;
  padding-top: 0.75rem;
  border-top: 1px dashed #e5e7eb;
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  color: #111827;
}

.po-submit {
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 0.55rem;
  background: #16a34a;
  color: #ffffff;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s ease;
}

.po-submit:hover:not(:disabled) {
  background: #15803d;
}

.po-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.po-error {
  margin-top: 0.6rem;
  color: #dc2626;
  font-size: 0.8rem;
}

@media (max-width: 720px) {
  .place-order-modal-body {
    padding: 0.85rem 0.85rem 1rem;
  }
}

.wordpress-shell-icon-link svg {
  width: 1.05rem;
  height: 1.05rem;
}

.wordpress-shell-cart-badge {
  position: absolute;
  top: -0.2rem;
  right: -0.28rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.22rem;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
}

.user-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.8rem 0.5rem 0.55rem;
  border: 1px solid rgba(219, 234, 254, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #1f2937;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transition: all 0.2s ease;
}

.user-menu-trigger:hover {
  border-color: #bfdbfe;
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
}

.user-avatar {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1f2937;
  max-width: 156px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.user-dropdown.open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  width: 280px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 1rem;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.14);
  padding: 0.75rem;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s ease;
  z-index: 30;
}

.user-dropdown.open .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-header {
  padding: 0.4rem 0.35rem 0.25rem;
}

.dropdown-user-info {
  text-align: center;
}

.dropdown-user-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  word-break: break-word;
}

.dropdown-user-email {
  font-size: 0.75rem;
  color: #6b7280;
  word-break: break-word;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.5rem 0;
}

.dropdown-body {
  display: grid;
  gap: 0.55rem;
  max-height: min(56vh, 460px);
  overflow-y: auto;
  padding-right: 0.2rem;
}

.dropdown-section {
  display: grid;
  gap: 0.2rem;
}

.dropdown-section-title {
  padding: 0 0.35rem 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #64748b;
  text-transform: uppercase;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  color: #374151;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  border-radius: 12px;
  margin-bottom: 0.25rem;
  white-space: normal;
}

.dropdown-item.active {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-weight: 600;
}

.dropdown-item.active:hover {
  background: rgba(99, 102, 241, 0.15);
  color: #4f46e5;
}

.dropdown-item:hover {
  background: #f8fafc;
}

.dropdown-item.logout-item {
  color: #ef4444;
}

.dropdown-item.logout-item:hover {
  background: #fef2f2;
}

.dropdown-footer {
  display: grid;
  gap: 0.25rem;
}

.item-icon {
  font-size: 1rem;
  width: 1.2rem;
  text-align: center;
  flex-shrink: 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  padding: 0.56rem 0.82rem;
  border-radius: 12px;
  border: 1px solid transparent;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

.action-btn.primary {
  background: #ffffff;
  color: #2563eb;
  border-color: #dbeafe;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.12);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  border-color: rgba(203, 213, 225, 0.95);
}

.action-btn.primary:hover {
  transform: translateY(-1px);
}

.action-btn.secondary:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #cbd5f5;
  color: #1e293b;
}

.action-btn-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.66rem;
  font-weight: 800;
}

.progress-banner {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  width: min(560px, calc(100vw - 32px));
  pointer-events: none;
}

.progress-content {
  padding: 0;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border-radius: 18px;
  padding: 0.95rem 1.05rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.92) 100%);
  color: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(14px);
}

.progress-spinner {
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: spin 1s linear infinite;
  flex: 0 0 auto;
}

.progress-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.progress-title {
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.progress-text {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.8rem;
  line-height: 1.45;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-container {
  max-width: 1680px;
  margin: 0 auto;
  width: 100%;
  padding: 0.85rem 0.9rem 1rem;
  display: grid;
  grid-template-columns: 82px 228px minmax(0, 1fr) 278px;
  gap: 0.72rem;
  align-items: start;
  flex: 1;
  min-height: 0;
  overflow: visible;
}

.workspace-nav,
.workspace-sidebar,
.live-sidebar,
.workbench-main {
  min-width: 0;
}

.workspace-nav {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.2rem;
  border-radius: 20px;
  border: 1px solid #dbe3f0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.96) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.workspace-nav-item {
  min-height: 76px;
  padding: 0.45rem 0.1rem;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.workspace-nav-item:hover {
  color: #4f46e5;
}

.workspace-nav-item.active {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  color: #5b21b6;
}

.workspace-nav-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.workspace-nav-icon svg {
  width: 28px;
  height: 28px;
}

.workspace-nav-label {
  display: block;
  text-align: center;
  letter-spacing: 0.02em;
  line-height: 1.05;
  font-size: 0.7rem;
  max-width: 100%;
  word-break: break-word;
}

.workspace-sidebar,
.live-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}

.workbench-main,
.live-sidebar {
  height: 100%;
  overflow: auto;
  padding-right: 0.18rem;
  margin-right: -0.18rem;
}

.workspace-sidebar--tools,
.live-sidebar--output,
.workbench-main--editor {
  position: relative;
}

.workspace-sidebar--tools {
  z-index: 20;
}

.wordpress-product-panel {
  margin-bottom: 0.9rem;
}

.wordpress-current-product {
  margin-bottom: 0.8rem;
}

.wordpress-current-product-label {
  margin-bottom: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wordpress-current-product-card,
.wordpress-product-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 0.7rem;
  width: 100%;
  border: 1px solid #dbe4f0;
  border-radius: 16px;
  background: #fff;
}

.wordpress-current-product-card {
  padding: 0.75rem;
}

.wordpress-product-card {
  padding: 0.65rem;
  text-align: left;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.wordpress-product-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 10px 28px rgba(79, 70, 229, 0.12);
  transform: translateY(-1px);
}

.wordpress-product-card.active {
  border-color: #4f46e5;
  box-shadow: 0 14px 30px rgba(79, 70, 229, 0.16);
}

.wordpress-current-product-thumb,
.wordpress-product-card-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 0.7rem;
  text-align: center;
}

.wordpress-current-product-thumb img,
.wordpress-product-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wordpress-current-product-thumb--empty,
.wordpress-product-card-thumb--empty {
  padding: 0.35rem;
}

.wordpress-current-product-body,
.wordpress-product-card-body {
  min-width: 0;
}

.wordpress-current-product-name,
.wordpress-product-card-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
}

.wordpress-current-product-price,
.wordpress-product-card-price {
  margin-top: 0.28rem;
  color: #0f766e;
  font-weight: 700;
  font-size: 0.86rem;
}

.wordpress-current-product-meta,
.wordpress-product-card-meta {
  margin-top: 0.3rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.35;
}

.wordpress-current-product-binding,
.wordpress-product-card-binding {
  margin-top: 0.36rem;
  color: #4338ca;
  font-size: 0.78rem;
  font-weight: 700;
}

.wordpress-current-product-binding span {
  margin-right: 0.35rem;
  color: #64748b;
  font-weight: 600;
}

.wordpress-current-product-description {
  margin: 0.42rem 0 0;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.5;
}

.wordpress-product-details-card {
  margin-top: 0.65rem;
  padding: 0.75rem;
  border: 1px solid #dbe4f0;
  border-radius: 16px;
  background: #f8fbff;
}

.wordpress-product-details-header {
  font-size: 0.84rem;
  font-weight: 700;
  color: #0f172a;
}

.wordpress-product-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.65rem;
}

.wordpress-product-details-item,
.wordpress-product-detail-block {
  min-width: 0;
}

.wordpress-product-detail-block {
  margin-top: 0.7rem;
}

.wordpress-product-details-label {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.wordpress-product-details-value,
.wordpress-product-details-text {
  margin-top: 0.2rem;
  color: #0f172a;
  font-size: 0.82rem;
  line-height: 1.5;
  word-break: break-word;
}

.wordpress-product-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.wordpress-product-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 0.76rem;
  font-weight: 600;
}

.wordpress-product-chip--muted {
  background: #e2e8f0;
  color: #334155;
}

.wordpress-product-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.4rem;
}

.wordpress-product-gallery img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid #dbe4f0;
  background: #fff;
}

.wordpress-product-link {
  display: inline-flex;
  align-items: center;
  margin-top: 0.7rem;
  color: #4338ca;
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.wordpress-product-link:hover {
  text-decoration: underline;
}

.wordpress-product-card-binding--muted {
  color: #94a3b8;
}

.wordpress-product-filters {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
  /* 关键: 让三级分类弹窗能溢出过滤栏并浮在卡片上方 */
  position: relative;
  z-index: 600;
}

.wordpress-product-filters .template-category-popover {
  z-index: 620;
}

.wordpress-product-filters .template-category-panel {
  z-index: 640;
}

.wordpress-product-empty {
  padding: 0.9rem 0.4rem;
  color: #64748b;
  font-size: 0.84rem;
  text-align: center;
}

.wordpress-product-pagination {
  margin-top: 0.8rem;
}

.wordpress-product-category-menu {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem;
  min-width: 220px;
  max-height: 320px;
  overflow: auto;
}

.wordpress-product-category-option {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.62rem 0.7rem;
  border-radius: 10px;
  color: #334155;
  cursor: pointer;
}

.wordpress-product-category-option:hover,
.wordpress-product-category-option.active {
  background: #eff6ff;
  color: #1d4ed8;
}

.workbench-main--editor {
  z-index: 1;
}

.sidebar-actions-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.sidebar-panel,
.editor-shell {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: none;
}

.sidebar-panel {
  padding: 0.58rem;
}

.sidebar-panel--tools,
.sidebar-panel--output,
.sidebar-panel--inspect,
.sidebar-actions-panel--output {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: none;
}

.sidebar-panel.preview-panel {
  padding-bottom: 0.82rem;
}

.sidebar-panel--workspace {
  min-height: 600px;
  height: min(760px, calc(100vh - 132px));
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.panel-header--compact {
  align-items: center;
  margin-bottom: 0.65rem;
}

.panel-header--bare {
  justify-content: flex-end;
  margin-bottom: 0.55rem;
}

.panel-header > div,
.panel-header--compact > div {
  min-width: 0;
}

.panel-eyebrow,
.summary-label {
  margin: 0;
  color: #6366f1;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.panel-title,
.workspace-title,
.tool-title {
  margin: 0.18rem 0 0;
  color: #0f172a;
  font-size: 0.98rem;
  font-weight: 800;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.74rem;
  font-weight: 800;
}

.workspace-summary-copy p,
.tool-empty,
.empty-state,
.output-view {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.55;
}

.part-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.1rem 0.1rem 0.15rem;
  scrollbar-width: thin;
  min-height: 0;
}

.part-rail-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  min-width: 58px;
  height: 58px;
  padding: 0.3rem;
  border: 1px solid #d7e3f0;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.part-rail-item:hover,
.layer-chip:hover,
.chip-button:hover,
.field-action-button:hover,
.tool-btn:hover:not(:disabled),
.color-option:hover,
.view-option:hover {
  transform: translateY(-1px);
  border-color: #c7d2fe;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.part-rail-item.active,
.layer-chip.active,
.tool-btn.active,
.chip-button.active,
.color-option.active,
.view-option.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #5b21b6;
}

.part-option-thumb {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  border: 1px solid #dbe3f0;
  background: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 auto;
  position: relative;
}

.part-option-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.part-option-placeholder {
  color: #94a3b8;
  font-size: 1rem;
  font-weight: 800;
}

.part-thumb-badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.part-thumb-badge.active {
  background: #16a34a;
}

.workspace-panel-content {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
  flex: 1;
}

.workspace-panel-content--layers {
  overflow: hidden;
}

.workspace-panel-content--artwork,
.workspace-panel-content--template {
  overflow: visible;
}

.workspace-panel-content--products {
  overflow: hidden;
}

.workspace-panel-content--text {
  overflow: visible;
}

.workspace-scroll-area {
  min-height: 0;
  overflow: auto;
  padding-right: 0.18rem;
  margin-right: -0.18rem;
}

.layers-scroll-area {
  flex: 1;
}

.template-library-scroll-area,
.artwork-library-scroll-area,
.wordpress-product-scroll-area {
  flex: 1;
}

.segment-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0.24rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #f8fafc;
}

.segment-switch--artwork {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.replace-artwork-tabs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.segment-switch-item {
  min-height: 32px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment-switch-item-label {
  display: block;
}

.segment-switch-item-meta {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
}

.icon-tool-grid--tile-mode {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.42rem;
  margin-top: 0.42rem;
}

.tool-icon-btn--tile-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 44px;
  min-width: 44px;
  padding: 0.22rem;
  text-align: center;
  border: 1px solid #dbe3f0;
  overflow: hidden;
}

.tool-icon-btn--tile-mode:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(99, 102, 241, 0.16);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.tool-icon-btn--tile-mode:focus-visible {
  outline: none;
  border-color: rgba(79, 70, 229, 0.4);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.16);
}

.tile-mode-visual {
  width: 100%;
  max-width: 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.12rem;
}

.tile-mode-visual-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  background: rgba(99, 102, 241, 0.16);
  border: 1px solid rgba(99, 102, 241, 0.18);
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
}

.tool-icon-btn--single .tile-mode-visual-cell:nth-child(n + 2) {
  opacity: 0.18;
}

.tool-icon-btn--tile-basic .tile-mode-visual-cell {
  opacity: 1;
}

.tool-icon-btn--tile-horizontal .tile-mode-visual-cell:nth-child(1),
.tool-icon-btn--tile-horizontal .tile-mode-visual-cell:nth-child(2) {
  opacity: 1;
}

.tool-icon-btn--tile-horizontal .tile-mode-visual-cell:nth-child(3),
.tool-icon-btn--tile-horizontal .tile-mode-visual-cell:nth-child(4) {
  opacity: 0.18;
}

.tool-icon-btn--tile-vertical .tile-mode-visual-cell:nth-child(1),
.tool-icon-btn--tile-vertical .tile-mode-visual-cell:nth-child(3) {
  opacity: 1;
}

.tool-icon-btn--tile-vertical .tile-mode-visual-cell:nth-child(2),
.tool-icon-btn--tile-vertical .tile-mode-visual-cell:nth-child(4) {
  opacity: 0.18;
}

.tool-icon-btn--tile-mirror .tile-mode-visual-cell:nth-child(1),
.tool-icon-btn--tile-mirror .tile-mode-visual-cell:nth-child(4) {
  transform: scaleX(-1);
}

.tool-icon-btn--tile-mirror .tile-mode-visual-cell:nth-child(2),
.tool-icon-btn--tile-mirror .tile-mode-visual-cell:nth-child(3) {
  background: rgba(129, 140, 248, 0.22);
}

.segment-switch-item.active {
  background: #ffffff;
  color: #4338ca;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.tool-icon-btn--tile-mode.active {
  border-color: rgba(99, 102, 241, 0.28);
  background: linear-gradient(180deg, #ffffff 0%, #eef2ff 100%);
  box-shadow:
    0 10px 24px rgba(79, 70, 229, 0.14),
    inset 0 0 0 1px rgba(255, 255, 255, 0.65);
}

.tool-icon-btn--tile-mode.active::after {
  content: "";
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: #4f46e5;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
}

.tool-icon-btn--tile-mode.active .tile-mode-visual-cell {
  background: rgba(99, 102, 241, 0.26);
  border-color: rgba(99, 102, 241, 0.32);
}

.segment-switch-item.active .segment-switch-item-label {
  color: #312e81;
}

.segment-switch-item.active .segment-switch-item-meta {
  color: #6366f1;
}

.tile-mode-summary {
  margin-top: 0.45rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.tile-mode-summary strong {
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 700;
}

.tile-mode-summary span {
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.45;
}

.tile-mode-summary-shortcut {
  color: #4338ca !important;
  font-weight: 700;
}

.template-library-filters {
  position: relative;
  z-index: 200;
}

.template-library-filters--replace-artwork {
  z-index: 260;
}

.template-filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.template-filter-row--replace-artwork {
  align-items: stretch;
}

.template-filter-row--products {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
}

.template-search-input {
  width: 100%;
  height: 38px;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  padding: 0 0.72rem;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.79rem;
}

.template-search-input::placeholder {
  color: #94a3b8;
  font-size: 0.74rem;
}

.template-search-input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.28);
}

.template-category-popover {
  position: relative;
}

.template-category-popover.open {
  z-index: 210;
}

.replace-artwork-category-popover.open {
  z-index: 320;
}

.template-filter-icon-btn {
  width: 38px;
  height: 38px;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-filter-icon-btn:hover,
.template-filter-icon-btn.active,
.template-category-popover.open .template-filter-icon-btn {
  border-color: #c7d2fe;
  color: #4338ca;
  background: #f5f3ff;
}

.template-filter-icon-btn svg {
  width: 18px;
  height: 18px;
}

.template-category-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  right: auto;
  z-index: 220;
  width: min(700px, calc(100vw - 220px));
  padding: 0.42rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

/* Teleport 到 body 后使用 viewport 固定坐标，避免被 overflow:hidden 容器裁剪 */
.template-category-panel--floating {
  position: fixed !important;
  top: 0;
  left: 0;
  right: auto;
  z-index: 99999 !important;
}

.replace-artwork-category-panel {
  left: auto;
  right: 0;
  width: min(700px, calc(100vw - 48px));
  max-width: min(700px, calc(100vw - 48px));
  z-index: 360;
  max-height: min(62vh, 560px);
  overflow: auto;
}

.template-category-panel :deep(.category-cascade) {
  width: 100%;
}

.template-category-panel :deep(.cascade-panel-grid) {
  min-height: 240px;
  border-radius: 10px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.library-grid--templates {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.library-grid--artwork {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.library-tile {
  width: 100%;
  padding: 0.32rem;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  position: relative;
  overflow: visible;
  cursor: pointer;
  transition: all 0.2s ease;
}

.library-tile:hover {
  transform: translateY(-1px);
  border-color: #c7d2fe;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
  z-index: 120;
}

.library-tile.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  z-index: 110;
}

.library-tile-thumb {
  display: flex;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  position: relative;
}

.library-tile-thumb--button {
  padding: 0;
  cursor: pointer;
}

.library-tile-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-grid--artwork .library-tile-thumb img,
.library-grid--artwork .template-hover-preview img {
  object-fit: contain;
  background: #ffffff;
}

.library-grid--templates .library-tile-thumb img,
.template-hover-preview img {
  object-fit: contain;
  background: #ffffff;
}

.library-tile-name {
  position: absolute;
  left: 0.28rem;
  right: 0.28rem;
  bottom: 0.28rem;
  padding: 0.26rem 0.38rem;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.68);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(4px);
}

.library-tile-scope-badge {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0.95rem;
  min-height: 0.95rem;
  padding: 0.12rem;
  border-radius: 999px;
  font-size: 0.31rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(6px);
  z-index: 2;
}

.library-tile-scope-badge--private {
  background: rgba(249, 115, 22, 0.92);
  color: #ffffff;
}

.library-tile-scope-badge svg {
  width: 0.48rem;
  height: 0.48rem;
  display: block;
}

.library-tile-cta {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.08rem;
  min-width: 0;
  max-width: calc(100% - 2.3rem);
  padding: 0.16rem 0.28rem;
  border-radius: 7px;
  background: rgba(79, 70, 229, 0.94);
  color: #ffffff;
  line-height: 1.1;
  box-shadow: 0 5px 13px rgba(79, 70, 229, 0.24);
  pointer-events: none;
  z-index: 2;
}

.library-tile-cta-primary {
  font-size: 0.4rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.library-tile-cta-secondary {
  font-size: 0.35rem;
  font-weight: 700;
  opacity: 0.92;
}

.library-tile-cta--free {
  background: rgba(37, 99, 235, 0.94);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24);
}

.library-tile-cta--paid {
  background: rgba(124, 58, 237, 0.94);
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.24);
}

.library-tile-cta--owned {
  background: rgba(5, 150, 105, 0.94);
  box-shadow: 0 8px 20px rgba(5, 150, 105, 0.24);
}

.artwork-tile-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  backdrop-filter: blur(8px);
}

.artwork-tile-badge.success {
  background: rgba(5, 150, 105, 0.88);
}

.artwork-tile-badge.info {
  background: rgba(37, 99, 235, 0.88);
}

.library-tile--actionable .library-tile-thumb--button:hover {
  border-color: #c7d2fe;
}

.artwork-tile-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.1rem 0.1rem;
}

.artwork-tile-meta {
  min-width: 0;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
}

.artwork-tile-action {
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.artwork-tile-action:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f1f5f9;
}

.artwork-tile-action.primary {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.artwork-tile-action.primary:hover:not(:disabled) {
  border-color: #6d28d9;
  background: #6d28d9;
}

.artwork-tile-action.disabled,
.artwork-tile-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.template-hover-card {
  position: fixed;
  z-index: 4000;
  width: min(248px, calc(100vw - 24px));
  max-height: min(360px, calc(100vh - 24px));
  padding: 0.45rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 0.45rem;
  overflow: auto;
  overscroll-behavior: contain;
}

.hover-overlay {
  pointer-events: none;
}

.hover-overlay--interactive {
  pointer-events: auto;
}

.hover-overlay--bottom-left {
  transform: none;
}

.hover-overlay--bottom-right {
  transform: none;
}

.hover-overlay--top-left {
  transform: none;
}

.hover-overlay--top-right {
  transform: none;
}

.template-hover-actions {
  display: flex;
  justify-content: flex-end;
}

.template-hover-action-btn {
  min-height: 30px;
  padding: 0 0.8rem;
  font-size: 0.74rem;
}

.template-hover-preview {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-weight: 700;
}

.template-hover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-hover-body {
  display: grid;
  gap: 0.2rem;
  text-align: left;
  min-width: 0;
}

.template-hover-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.15rem;
}

.template-hover-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
}

.template-hover-chip--public {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
  border-color: rgba(99, 102, 241, 0.24);
}

.template-hover-chip--private {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.24);
}

.template-hover-chip--free {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.24);
}

.template-hover-chip--paid {
  background: rgba(124, 58, 237, 0.12);
  color: #6d28d9;
  border-color: rgba(124, 58, 237, 0.24);
}

.template-hover-chip--owned {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.28);
}

.template-hover-title {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.25;
}

.template-hover-meta {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 0.35rem;
  align-items: start;
  min-width: 0;
  color: #475569;
  font-size: 0.72rem;
  line-height: 1.3;
}

.template-hover-meta b {
  display: block;
  min-width: 0;
  color: #0f172a;
  font-weight: 700;
}

.template-hover-meta-value {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.selection-caption {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-height: 36px;
  padding: 0.55rem 0.65rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.selection-caption strong {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-caption span {
  color: #64748b;
  font-size: 0.74rem;
}

.selection-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.18rem 0;
}

.pagination-btn {
  min-height: 30px;
  padding: 0 0.7rem;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination-status {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 700;
}

.library-placeholder {
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
  background: rgba(255, 255, 255, 0.7);
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.55;
}

.background-editor {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-top: 0.22rem;
}

.background-color-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.42rem;
  min-width: 0;
  flex: 1;
}

.background-color-field span {
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 700;
}

.background-color-input {
  width: 100%;
  height: 42px;
  padding: 0;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #ffffff;
}

.background-color-row {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
}

.background-swatches {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.45rem;
}

.background-swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  border: 1px solid #dbe3f0;
  background: var(--swatch);
  cursor: pointer;
}

.background-swatch.active {
  border-color: #7c3aed;
  box-shadow: inset 0 0 0 2px #ffffff, 0 0 0 1px #7c3aed;
}

.background-state {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 700;
  padding-left: 0.1rem;
}

.background-clear-btn {
  min-width: 88px;
}

.workspace-primary-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0;
}

.workspace-primary-actions--stack {
  grid-template-columns: 1fr;
  margin-top: 0;
}

.artwork-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.74rem;
  font-weight: 800;
  white-space: nowrap;
}

.artwork-status.ready {
  background: #dcfce7;
  color: #166534;
}

.layer-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0;
}

.layer-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  width: 100%;
  padding: 0.52rem 0.56rem;
  border-radius: 14px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  text-align: left;
  transition: all 0.2s ease;
}

.layer-main {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0;
  cursor: pointer;
}

.layer-main-content {
  min-width: 0;
  flex: 1;
}

.layer-preview-thumb {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #dbe3f0;
  overflow: hidden;
  background: #ffffff;
  flex: 0 0 auto;
}

.layer-preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #ffffff;
}

.layer-chip-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  padding: 0.22rem 0.5rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.68rem;
  font-weight: 800;
}

.layer-chip-label {
  flex: 1;
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 700;
}

.layer-actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 0.18rem;
  flex: 0 0 auto;
}

.layer-action-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #dbe3f0;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-action-btn:hover {
  border-color: #c7d2fe;
  color: #4338ca;
  background: #eef2ff;
}

.layer-action-btn svg {
  width: 12px;
  height: 12px;
}

.layer-action-btn.danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff1f2;
}

.layer-action-btn.danger:hover {
  border-color: #fca5a5;
  color: #991b1b;
  background: #ffe4e6;
}

.workbench-main {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.editor-shell {
  padding: 0.52rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: none;
}

.editor-shell-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.45rem;
  padding: 0 0.15rem;
}

.editor-shell-start {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  grid-column: 1;
  justify-self: start;
}

.editor-shell-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  grid-column: 2;
  justify-self: center;
}

.editor-history-tools {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.workspace-hover-banner {
  position: sticky;
  top: 0.45rem;
  z-index: 60;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem 0.8rem;
  width: fit-content;
  max-width: min(100%, 860px);
  margin: 0 auto 0.65rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgba(219, 227, 240, 0.96);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.workspace-hover-banner-title {
  max-width: 100%;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 800;
}

.workspace-hover-banner-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
  min-width: 0;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.workspace-hover-banner-meta b {
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.workspace-hover-banner-meta-value {
  color: #0f172a;
  font-weight: 800;
}

.workspace-title {
  font-size: 1rem;
}

.editor-workbench {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 0.3rem;
  align-items: start;
  padding: 0.08rem 0 0;
  border-radius: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.editor-part-rail {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 720px;
  overflow: hidden;
  padding: 0.26rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.editor-stage-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.canvas-meta-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 0.5rem;
  padding: 0.15rem 0.2rem;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

.canvas-meta-title {
  max-width: 100%;
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-toolbar,
.editor-footer,
.tool-title-row,
.selector-header,
.field-actions,
.recent-actions,
.recent-actions-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.editor-toolbar {
  justify-content: space-between;
  padding: 0 0 0.35rem;
  margin-bottom: 0.05rem;
  border-bottom: 1px solid #edf2f7;
}

.zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.48rem;
  border-radius: 999px;
  border: 1px solid #dbe3f0;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.12);
}

.editor-quick-tools {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.tool-icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-icon-btn:hover {
  border-color: #c7d2fe;
  color: #4338ca;
}

.tool-icon-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.tool-icon-btn svg {
  width: 16px;
  height: 16px;
}

.zoom-btn,
.toggle-btn,
.field-action-button,
.chip-button,
.tool-btn,
.action-button,
.color-option,
.view-option {
  font: inherit;
}

.zoom-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.zoom-level {
  min-width: 2.8rem;
  text-align: center;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 700;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.58rem 0.82rem;
  border-radius: 999px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.toggle-btn--full {
  width: 100%;
  justify-content: center;
}

.toggle-btn.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.canvas-container {
  width: min(100%, 820px);
  aspect-ratio: 1 / 1;
  min-height: 580px;
  min-width: 0;
  margin-top: 0;
  align-self: center;
  padding: 0.5rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.canvas-scroll-area {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.canvas-stage-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;
  flex: none;
}

.canvas-stage {
  width: 100%;
  height: 100%;
  flex: none;
  border-radius: 14px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  transform-origin: center center;
}

.canvas-placeholder {
  width: 100%;
  min-height: 520px;
  border-radius: 18px;
  border: 2px dashed #cbd5e1;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-placeholder-inner {
  color: #64748b;
  font-weight: 800;
}

.editor-dock {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.transform-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.65rem;
}

.tool-chip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.55rem;
}

.nudge-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.65rem;
}

.nudge-middle {
  display: flex;
  gap: 0.45rem;
}

.nudge-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #d7e0ee;
  background: #ffffff;
  color: #334155;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nudge-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #c7d2fe;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.nudge-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-tool-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.28rem;
  margin-top: 0.28rem;
}

.icon-tool-grid .tool-icon-btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
}

.tool-icon-btn--danger {
  color: #dc2626;
  border-color: #fecaca;
  background: #fff5f5;
}

.tool-icon-btn--danger:hover {
  border-color: #fca5a5;
  color: #b91c1c;
}

.dimension-summary-grid {
  display: grid;
  gap: 0.28rem;
  margin-top: 0.22rem;
}

.dimension-summary-card {
  padding: 0.52rem 0.56rem;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #ffffff;
  box-shadow: none;
}

.dimension-summary-label {
  display: block;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.dimension-summary-value {
  display: block;
  margin-top: 0.2rem;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.35;
}

.dimension-summary-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto minmax(0, 1fr) auto;
  gap: 0.22rem;
  align-items: center;
  margin-top: 0.15rem;
}

.dimension-summary-lock {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.dimension-summary-lock:hover {
  color: #2563eb;
  border-color: #93c5fd;
}

.dimension-summary-lock.is-locked {
  color: #2563eb;
  border-color: #2563eb;
  background: #eff6ff;
}

.dimension-summary-lock svg {
  width: 14px;
  height: 14px;
}

.dimension-summary-input-group {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 28px;
  gap: 0.25rem;
  align-items: center;
}

.dimension-summary-input {
  min-width: 0;
  width: 100%;
  padding: 0.3rem 0.36rem;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.76rem;
  font-weight: 700;
}

.dimension-summary-separator,
.dimension-summary-unit {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
}

.text-tools {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.28rem;
}

.text-tools--simple {
  gap: 0.5rem;
}

.edit-sidebar-panel .transform-tools,
.edit-sidebar-panel .tool-chip-grid,
.edit-sidebar-panel .icon-tool-grid,
.edit-sidebar-panel .nudge-pad,
.edit-sidebar-panel .image-edit-panel,
.edit-sidebar-panel .text-edit-panel {
  margin-top: 0.22rem;
}

.text-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.text-toolbar--grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.48rem;
}

.text-toolbar--compact {
  gap: 0.42rem;
}

.text-toolbar--actions {
  gap: 0.42rem;
}

.tool-panel-card {
  display: flex;
  flex-direction: column;
  gap: 0.58rem;
  padding: 0.78rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 12px 28px rgba(148, 163, 184, 0.12);
}

.tool-panel-card--simple {
  gap: 0.48rem;
  padding: 0.72rem;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(148, 163, 184, 0.08);
}

.tool-section-header {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.tool-section-header strong {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 800;
}

.tool-section-header span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.45;
}

.tool-field--stack {
  gap: 0.5rem;
}

.tool-field--tile-mode {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-field.compact {
  min-width: 0;
}

.tool-field--wide {
  grid-column: span 1;
}

.tool-field--color {
  max-width: none;
}

.tool-field--color-full {
  width: 100%;
}

.tool-color--full {
  width: 100%;
  min-width: 0;
}

.svg-tools {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.28rem;
}

.text-format-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.38rem;
}

.text-format-btn {
  width: 100%;
  min-width: 0;
  justify-content: center;
}

.background-editor--simple {
  margin-top: 0.28rem;
}

.svg-layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}

.svg-editor-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 0.7rem;
}

.svg-editor-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 0.45rem;
}

.svg-editor-section--layers {
  flex: 1;
  min-height: 0;
}

.svg-editor-section--color {
  padding-top: 0.7rem;
  border-top: 1px solid #e2e8f0;
}

.svg-editor-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.svg-editor-section-header strong {
  color: #0f172a;
  font-size: 0.83rem;
  font-weight: 800;
}

.svg-layer-list-scroll {
  max-height: 260px;
  overflow-y: auto;
  padding-right: 0.14rem;
}

.svg-layer-list-scroll::-webkit-scrollbar {
  width: 8px;
}

.svg-layer-list-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.55);
  border-radius: 999px;
}

.svg-layer-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 0.55rem;
  align-items: center;
  width: 100%;
  padding: 0.58rem 0.62rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.svg-layer-item:hover,
.svg-layer-item.active {
  border-color: rgba(99, 102, 241, 0.3);
  background: #f8faff;
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.08);
}

.svg-layer-swatch {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: var(--svg-layer-color, #111827);
}

.svg-layer-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.svg-layer-copy strong {
  min-width: 0;
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.svg-layer-copy span {
  color: #64748b;
  font-size: 0.73rem;
  font-weight: 600;
  text-transform: uppercase;
}

.svg-editor-stack {
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
}

.svg-editor-meta {
  display: grid;
  gap: 0.18rem;
}

.svg-editor-meta-label {
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 700;
}

.svg-editor-meta-value {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: uppercase;
}

.svg-editor-actions {
  display: flex;
  justify-content: flex-end;
}

.tool-empty--minimal {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
}

.input-stepper {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  gap: 0.35rem;
  align-items: center;
}

.input-stepper-btn {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.input-stepper-btn:hover:not(:disabled) {
  border-color: #93c5fd;
  color: #1d4ed8;
  background: #eff6ff;
}

.input-stepper-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.input-stepper-btn--compact {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.preview-unit-field {
  min-width: 88px;
  gap: 0;
}

.preview-unit-actions {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-unit-select-wrap {
  position: relative;
  min-width: 0;
}

.preview-unit-select-wrap :deep(.filter-dropdown) {
  min-width: 0;
  width: 100%;
  z-index: 35;
}

.preview-unit-select-wrap :deep(.filter-dropdown-trigger) {
  height: 38px;
  border-color: #cbd5e1;
  border-radius: 12px;
  font-size: 0.85rem;
}

.preview-unit-select-wrap :deep(.filter-dropdown-menu) {
  border-color: #dbe3f0;
  border-radius: 12px;
}

.preview-done-btn {
  min-width: 84px;
}

.font-select-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  z-index: 30;
}

.font-select-group {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
}

.preview-unit-select {
  appearance: none;
  padding-right: 2.05rem;
  border-radius: 12px;
  border-color: #d7e0ee;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  font-weight: 700;
}

.font-select {
  appearance: none;
  padding-right: 2.05rem;
  border-radius: 12px;
  border-color: #d7e0ee;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  font-weight: 700;
  position: relative;
  z-index: 31;
}

.action-btn.primary.saved {
  background: linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%);
  border-color: rgba(15, 118, 110, 0.24);
  box-shadow: 0 10px 22px rgba(15, 118, 110, 0.18);
}

.tool-input,
.tool-textarea,
.tool-color {
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  background: #ffffff;
  color: #0f172a;
}

.preview-select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  padding: 12px 14px;
  padding-right: 2.2rem;
  font-size: 0.88rem;
}

.preview-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-input,
.tool-textarea {
  width: 100%;
  padding: 0.5rem 0.58rem;
  font-size: 0.8rem;
}

.tool-input-number {
  width: 100%;
  min-width: 0;
}

.tool-input-number:deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 14px;
  box-shadow: 0 0 0 1px #cbd5e1 inset;
  background: #ffffff;
}

.tool-input-number:deep(.el-input__inner) {
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 600;
}

.tool-input-number:deep(.el-input-number__decrease),
.tool-input-number:deep(.el-input-number__increase) {
  width: 28px;
  color: #475569;
}

.tool-input-number:deep(.el-input-number__decrease.is-disabled),
.tool-input-number:deep(.el-input-number__increase.is-disabled),
.tool-input-number:deep(.el-input-number.is-disabled .el-input__wrapper) {
  opacity: 0.55;
}

.tool-input-number--inline:deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: 10px;
  padding-left: 0.42rem;
  padding-right: 2rem;
}

.tool-textarea {
  min-height: 84px;
  resize: vertical;
  font-family: inherit;
}

.tool-color {
  width: 52px;
  height: 38px;
  padding: 0;
}

.tool-input:disabled,
.tool-textarea:disabled,
.tool-color:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-range-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px auto;
  gap: 0.5rem;
  align-items: center;
}

.tool-range {
  width: 100%;
  accent-color: #2563eb;
  cursor: pointer;
}

.tool-input--inline {
  min-width: 0;
}

.tool-range-value {
  min-width: 3rem;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 800;
  text-align: right;
}

.size-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  margin-top: 0.6rem;
  align-items: center;
}

.size-input,
.preview-size-custom-input {
  width: 100%;
  min-width: 0;
  padding: 0.68rem 0.76rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 600;
}

.field-hint {
  margin-top: 0.4rem;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.5;
}

.tool-btn,
.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem 0.82rem;
  border-radius: 12px;
  border: 1px solid #d7e0ee;
  background: #ffffff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button--full {
  width: 100%;
}

.action-button-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.7rem;
  font-weight: 800;
}

.tool-btn:disabled,
.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.primary,
.action-button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.tool-btn.success,
.action-button {
  background: #16a34a;
  border-color: #16a34a;
  color: #ffffff;
}

.tool-btn.danger {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

.action-button.secondary {
  background: #ffffff;
  border-color: #d7e0ee;
  color: #334155;
}

.preview-image-container {
  margin-top: 0;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border: 1px solid #dce5f3;
  background: #f8fafc;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 1.4rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-nav.prev {
  left: 0.85rem;
}

.preview-nav.next {
  right: 0.85rem;
}

.preview-nav:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.92);
}

.preview-nav:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #ffffff;
}

.preview-image-button {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  color: #94a3b8;
  text-align: center;
}

.placeholder-content svg {
  width: 44px;
  height: 44px;
}

.preview-loading {
  position: absolute;
  left: 50%;
  bottom: 0.9rem;
  transform: translateX(-50%);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: calc(100% - 2rem);
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  text-align: center;
}

.preview-view-chip {
  position: absolute;
  right: 0.85rem;
  bottom: 0.85rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  max-width: calc(100% - 1.7rem);
  padding: 0.34rem 0.65rem;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.preview-toolbar {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.7rem;
}

.preview-toolbar-slot {
  display: flex;
  align-items: center;
  min-width: 0;
}

.preview-toolbar-slot--start {
  justify-content: flex-start;
}

.preview-toolbar-slot--center {
  justify-content: center;
  justify-self: center;
}

.preview-toolbar-slot--end {
  justify-content: flex-end;
}

.preview-refresh-menu {
  justify-self: start;
}

.preview-refresh-icon {
  width: 40px;
  height: 40px;
}

.preview-launch-btn {
  flex: 0 0 auto;
}

.preview-dots {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 0;
}

.preview-dot {
  width: 9px;
  height: 9px;
  border: none;
  border-radius: 999px;
  background: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-dot.active {
  width: 24px;
  background: #2563eb;
}

.preview-dots--dialog {
  margin-top: 0;
}

.workspace-modal-backdrop--preview {
  padding: 1.2rem;
}

.workspace-modal-backdrop--locked {
  cursor: wait;
}

.workspace-modal--preview-view {
  width: min(1380px, calc(100vw - 2rem));
  max-height: calc(100vh - 2.4rem);
}

.workspace-modal-body--preview-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: calc(100vh - 120px);
  overflow: auto;
}

.preview-dialog-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: start;
  position: sticky;
  top: 0;
  z-index: 2;
  padding-bottom: 0.2rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.94) 100%);
  backdrop-filter: blur(10px);
}

.preview-size-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.preview-size-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.18rem;
  min-width: 136px;
  padding: 0.62rem 0.78rem;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-size-chip:hover:not(:disabled),
.preview-size-chip.active {
  border-color: rgba(37, 99, 235, 0.34);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.preview-size-chip.original {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.preview-size-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preview-size-chip-label {
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 800;
}

.preview-size-chip-helper {
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
}

.preview-size-custom-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem;
  margin-top: 0.7rem;
  width: 100%;
}

.preview-size-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 0.35rem;
}

.preview-size-picker::-webkit-scrollbar {
  height: 8px;
}

.preview-size-picker::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

.preview-dialog-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  color: #475569;
  font-size: 0.86rem;
  font-weight: 700;
}

.preview-dialog-meta--header {
  min-width: 180px;
  padding: 0.2rem 0 0.6rem;
  white-space: normal;
}

.preview-dialog-meta--viewer {
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.preview-dialog-meta-primary,
.preview-dialog-meta-secondary {
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
}

.preview-dialog-meta-primary strong,
.preview-dialog-meta-secondary span:first-child {
  color: #0f172a;
}

.preview-dialog-main-view-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  width: fit-content;
  padding: 0.18rem 0.48rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, rgba(14, 165, 233, 0.12) 100%);
  color: #1d4ed8;
  font-size: 0.68rem;
  font-weight: 800;
}

.preview-dialog-main-view-chip svg {
  width: 0.72rem;
  height: 0.72rem;
  flex: 0 0 auto;
}

.preview-dialog-stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
}

.preview-dialog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 248px;
  gap: 1rem;
  align-items: stretch;
  min-height: 0;
}

.preview-dialog-layout--viewer {
  grid-template-columns: minmax(0, 1fr) 182px;
}

.preview-dialog-main,
.preview-dialog-sidebar {
  min-width: 0;
}

.preview-dialog-main {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.preview-dialog-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding: 0.85rem;
  border: 1px solid #dbe3f0;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.preview-dialog-sidebar--viewer {
  padding: 0.75rem;
}

.preview-dialog-sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
}

.preview-dialog-sidebar-header strong {
  color: #0f172a;
  font-size: 0.88rem;
  font-weight: 800;
}

.preview-results-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.82rem 0.95rem;
  border: 1px solid #2563eb;
  border-radius: 14px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.preview-results-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.preview-results-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.preview-results-action-notice {
  display: block;
  margin-top: 0.45rem;
  color: #1d4ed8;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
}

.preview-dialog-sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-top: 0.12rem;
}

.preview-dialog-color-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.55rem 0.5rem 0.4rem;
  margin-top: 0.35rem;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.preview-dialog-color-bar-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.preview-dialog-color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.preview-dialog-color-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.32rem 0.56rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  background: #ffffff;
  color: #1f2937;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.preview-dialog-color-chip:hover {
  border-color: rgba(37, 99, 235, 0.55);
  transform: translateY(-1px);
}

.preview-dialog-color-chip.active {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.preview-dialog-color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.16);
  flex: none;
}

.preview-dialog-color-name {
  white-space: nowrap;
  text-transform: capitalize;
}

.preview-dialog-color-options--header {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin: 0;
  padding: 0.2rem 0.4rem;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.preview-dialog-color-chip--labeled {
  padding: 0.28rem 0.52rem;
  border-radius: 8px;
  height: auto;
  min-width: 0;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.12);
}

.preview-dialog-color-chip--labeled:hover {
  border-color: rgba(37, 99, 235, 0.5);
  transform: translateY(-1px);
}

.preview-dialog-color-chip--labeled.active {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.preview-dialog-color-chip--labeled .preview-dialog-color-swatch {
  width: 14px;
  height: 14px;
}

.preview-dialog-color-chip--labeled .preview-dialog-color-name {
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-dialog-color-chip--swatch-only {
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.preview-dialog-color-chip--swatch-only:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.4);
}

.preview-dialog-color-chip--swatch-only.active {
  border-color: #2563eb;
  background: transparent;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.32);
}

.preview-dialog-color-chip--swatch-only .preview-dialog-color-swatch {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(15, 23, 42, 0.2);
}

.preview-main-image-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.36rem;
  padding: 0.56rem 0.72rem;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
  font-size: 0.77rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}

.preview-main-image-button svg {
  width: 0.8rem;
  height: 0.8rem;
  flex: 0 0 auto;
}

.preview-main-image-button--header {
  width: auto;
  padding: 0.4rem 0.72rem;
  font-size: 0.78rem;
}

.workspace-modal-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview-dialog-color-bar--header {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.04);
}

.preview-dialog-color-bar--header .preview-dialog-color-bar-label {
  font-size: 0.72rem;
  color: rgba(15, 23, 42, 0.6);
}

.preview-dialog-color-bar--header .preview-dialog-color-options {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.preview-main-image-button:hover:not(:disabled) {
  border-color: rgba(37, 99, 235, 0.36);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.1);
}

.preview-main-image-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.preview-main-image-button--active {
  border-color: rgba(29, 78, 216, 0.24);
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.16);
}

@media (max-width: 1120px) {
  .preview-dialog-controls {
    grid-template-columns: 1fr;
  }

  .preview-dialog-meta {
    justify-content: flex-start;
  }

  .preview-dialog-stage {
    grid-template-columns: 1fr;
  }

  .preview-nav {
    width: 100%;
  }

  .preview-dialog-layout {
    grid-template-columns: 1fr;
  }

  .preview-dialog-sidebar {
    padding: 0.8rem;
  }

  .preview-dialog-strip--sidebar {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding-right: 0;
    padding-bottom: 0.2rem;
  }

  .replace-artwork-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .preview-results-selection-grid {
    grid-template-columns: 1fr;
  }
}

.preview-size-custom-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 0.9rem;
  border: 1px solid #2563eb;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.preview-size-custom-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.preview-dialog-stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
}

.preview-dialog-media {
  border: 1px solid #dbe3f0;
  border-radius: 18px;
  min-height: min(68vh, 720px);
  max-height: calc(100vh - 220px);
  padding: 1rem;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.preview-dialog-image {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 260px);
  object-fit: contain;
  background: #ffffff;
  margin: 0 auto;
}

.preview-dialog-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(68vh, 720px);
  width: 100%;
}

.preview-dialog-loading-panel {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 1.4rem 1.2rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.preview-dialog-loading-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.34rem 0.72rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.preview-dialog-loading-spinner {
  transform: scale(1.05);
}

.preview-dialog-loading-title {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.preview-dialog-loading-text {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.55;
  font-weight: 600;
}

.preview-placeholder--dialog {
  min-height: min(72vh, 760px);
}

.preview-dialog-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: #475569;
  font-size: 0.86rem;
  font-weight: 700;
}

.preview-dialog-meta--header {
  min-width: 220px;
  padding: 0.2rem 0;
  white-space: nowrap;
}

.preview-dialog-strip {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: thin;
}

.preview-dialog-strip--sidebar {
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 0.15rem;
  padding-bottom: 0;
}

.preview-dialog-strip--viewer {
  gap: 0.6rem;
}

.preview-dialog-thumb {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 0 0 clamp(118px, 18vw, 156px);
  padding: 0.55rem;
  border: 1px solid #dbe3f0;
  border-radius: 14px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-dialog-strip--sidebar .preview-dialog-thumb {
  flex: 0 0 auto;
  width: 100%;
}

.preview-dialog-strip--viewer .preview-dialog-thumb-image,
.preview-dialog-strip--viewer .preview-dialog-thumb-placeholder {
  height: 92px;
}

.preview-dialog-thumb:hover:not(:disabled),
.preview-dialog-thumb.active {
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.preview-dialog-thumb--main {
  border-color: rgba(245, 158, 11, 0.38);
  box-shadow: 0 10px 24px rgba(245, 158, 11, 0.14);
}

.preview-dialog-thumb:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preview-dialog-thumb-image,
.preview-dialog-thumb-placeholder {
  width: 100%;
  height: 96px;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: contain;
}

.preview-dialog-thumb-placeholder--loading {
  color: #2563eb;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
}

.preview-dialog-thumb-main-badge {
  position: absolute;
  top: 0.78rem;
  left: 0.78rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.42rem;
  height: 1.42rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.84);
  color: #fbbf24;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.16);
}

.preview-dialog-thumb-main-badge svg {
  width: 0.78rem;
  height: 0.78rem;
}

.preview-dialog-thumb-label {
  font-size: 0.78rem;
  font-weight: 800;
  color: #0f172a;
}

.preview-dialog-thumb-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

.preview-dialog-thumb-status {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 0.68rem;
  font-weight: 800;
}

.preview-dialog-thumb-meta {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
}

@media (max-width: 1120px) {
  .preview-dialog-strip--sidebar {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding-right: 0;
    padding-bottom: 0.2rem;
  }
}

.canvas-context-menu {
  position: fixed;
  z-index: 80;
  width: min(360px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  padding: 0.45rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 26px 56px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(14px);
  overflow: auto;
}

.canvas-context-menu-title {
  padding: 0.5rem 0.72rem 0.62rem;
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: none;
}

.canvas-context-menu-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  border: none;
  border-radius: 16px;
  background: transparent;
  padding: 0.82rem 0.8rem;
  color: #0f172a;
  font-size: 0.94rem;
  font-weight: 500;
  line-height: 1.32;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.canvas-context-menu-item + .canvas-context-menu-item {
  margin-top: 0.1rem;
}

.canvas-context-menu-item:hover {
  background: rgba(37, 99, 235, 0.14);
  color: #1d4ed8;
}

.canvas-context-menu-item.danger {
  color: #dc2626;
}

.canvas-context-menu-item.danger:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
}

.selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.72rem;
  padding-top: 0.35rem;
  border-top: 1px solid #edf2f7;
}

.control-label {
  color: #475569;
  font-size: 0.8rem;
  font-weight: 800;
}

.color-options.compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.45rem;
  max-height: 220px;
  overflow: auto;
  padding-right: 0.12rem;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 36px;
  padding: 0.48rem 0.55rem;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 0;
}

.color-option.compact {
  width: 100%;
}

.color-swatch {
  width: 15px;
  height: 15px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  flex: 0 0 auto;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.sidebar-actions-panel--output {
  padding: 0.82rem;
}

.workspace-sidebar--tools .panel-header,
.live-sidebar--output .panel-header {
  margin-bottom: 0.78rem;
}

.color-name,
.view-label,
.output-size {
  color: inherit;
  font-size: 0.75rem;
  font-weight: 700;
}

.color-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.6rem;
}

.view-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0.75rem;
  border: 1px solid #dbe3f0;
  border-radius: 16px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.field-label {
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
}

.field-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 600;
}

.workspace-modal--shortcuts {
  width: min(640px, 100%);
}

.workspace-modal-body--shortcuts {
  padding-top: 0.9rem;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.55rem;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.68rem 0.8rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: #f8fafc;
}

.shortcut-label {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
}

.shortcut-key {
  border-radius: 9px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  padding: 0.25rem 0.48rem;
  color: #475569;
  font-size: 0.74rem;
  white-space: nowrap;
}

.field-actions {
  justify-content: flex-end;
}

.field-action-button {
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  padding: 0.35rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.chip-button {
  padding: 0.55rem 0.8rem;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-message {
  padding: 0.95rem 1rem;
  border-radius: 16px;
  font-size: 0.88rem;
  font-weight: 700;
}

.status-message.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.status-message.info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
}

.status-message.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.inline-action-btn {
  margin-left: 0.75rem;
}

.recent-actions {
  margin-top: 0.35rem;
}

.results-panel {
  margin-top: 0.85rem;
}

.output-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.results-source-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.28rem 0.56rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.results-source-badge--preview {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.results-source-badge--export {
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
}

.results-panel--compact {
  margin-top: 0.25rem;
}

.workspace-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20000;
  background: rgba(15, 23, 42, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow: auto;
}

.workspace-modal {
  width: min(760px, 100%);
  max-height: calc(100vh - 3rem);
  position: relative;
  z-index: 20001;
  border-radius: 20px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-modal--results {
  width: min(760px, 100%);
}

.workspace-modal--copy-part {
  width: min(560px, 100%);
}

.workspace-modal--drafts {
  width: min(640px, 100%);
}

.workspace-modal--replace-artwork {
  width: min(1120px, 100%);
  overflow: visible;
}

.workspace-modal--preview-results-select {
  width: min(860px, 100%);
}

.workspace-modal--duplicate-count {
  width: min(460px, 100%);
}

.workspace-modal--layer-size {
  width: min(520px, 100%);
}

.replace-artwork-header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.replace-artwork-header-text {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.45;
}

.workspace-modal-body--replace-artwork {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  overflow: visible;
}

.replace-artwork-summary {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.replace-artwork-summary-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid #dbe3f0;
  border-radius: 16px;
  background: #f8fafc;
}

.replace-artwork-summary-copy--target {
  min-width: min(100%, 260px);
}

.replace-artwork-summary-label {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.replace-artwork-search-input {
  height: 42px;
}

.replace-artwork-library-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.15rem 0.1rem 0;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
}

.replace-artwork-library-scroll-area {
  min-height: 280px;
  max-height: min(52vh, 560px);
  padding-right: 0.2rem;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 0.75rem 0.2rem 0.3rem 0.75rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.replace-artwork-library-scroll-area .library-grid--artwork {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  justify-content: start;
}

.replace-artwork-library-scroll-area .library-tile {
  max-width: none;
  width: 100%;
}

.replace-artwork-modal-footer {
  flex-wrap: wrap;
}

.workspace-modal-body--layer-size {
  gap: 1rem;
}

.layer-size-modal-copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.layer-size-current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #dbe3f0;
  border-radius: 16px;
  background: #f8fafc;
}

.layer-size-current-label {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
}

.layer-size-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: end;
}

.layer-size-input {
  width: 100%;
}

.layer-size-unit {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
}

.workspace-modal-body--preview-results-select {
  gap: 0.9rem;
}

.preview-results-selection-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

.preview-results-selection-feedback {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.82rem;
  border-radius: 14px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.45;
}

.preview-results-selection-feedback.is-busy {
  background: #dbeafe;
}

.preview-results-selection-warning {
  color: #1e3a8a;
}

.preview-results-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 0.75rem;
}

.preview-results-selection-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem;
  border: 1px solid #dbe3f0;
  border-radius: 18px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-results-selection-card:hover {
  transform: translateY(-1px);
  border-color: #c7d2fe;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.preview-results-selection-card.active {
  border-color: #2563eb;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.12);
}

.preview-results-selection-card.current::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
  pointer-events: none;
}

.preview-results-selection-card.disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.preview-results-selection-check {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  width: 18px;
  height: 18px;
  border: 1.5px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
}

.preview-results-selection-check.active {
  border-color: #2563eb;
  background: radial-gradient(circle at center, #2563eb 0 45%, #ffffff 46% 100%);
}

.preview-results-selection-image,
.preview-results-selection-placeholder {
  width: 100%;
  height: 118px;
  border-radius: 12px;
  background: #f8fafc;
  object-fit: contain;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-results-selection-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.preview-results-selection-copy strong {
  color: #0f172a;
  font-size: 0.82rem;
}

.preview-results-selection-copy span {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 600;
}

.duplicate-count-input {
  margin-top: 0.45rem;
}

.drafts-floating-panel {
  position: fixed;
  top: 5.95rem;
  right: max(0.9rem, calc((100vw - 1680px) / 2 + 0.9rem));
  width: 320px;
  max-width: calc(100vw - 1.8rem);
  z-index: 58;
  pointer-events: none;
}

.drafts-side-panel {
  position: static;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  width: 100%;
  max-height: min(calc(100vh - 132px), 780px);
  overflow: hidden;
  z-index: 1;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px);
  pointer-events: auto;
}

.drafts-side-panel-header {
  padding: 1rem 1rem 0.9rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.drafts-side-panel-body {
  flex: 1;
  min-height: 0;
  max-height: min(calc(100vh - 188px), 720px);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.9rem 1rem 1rem;
  overflow: auto;
  overscroll-behavior: contain;
}

.drafts-panel-layout {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.drafts-featured-card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.9rem;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.9) 0%, rgba(248, 250, 252, 0.96) 100%);
}

.drafts-featured-card.active {
  border-color: rgba(37, 99, 235, 0.38);
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.98) 0%, rgba(239, 246, 255, 0.98) 100%);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.12);
}

.drafts-featured-header,
.drafts-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.drafts-section-header strong {
  color: #0f172a;
  font-size: 0.92rem;
  font-weight: 800;
}

.drafts-section-kicker {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.drafts-featured-preview {
  width: 100%;
  min-height: 176px;
  border-radius: 18px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drafts-featured-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #ffffff;
}

.drafts-featured-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.draft-meta-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  color: #475569;
  font-size: 0.76rem;
  line-height: 1.45;
}

.draft-meta-label {
  color: #64748b;
  font-weight: 700;
}

.draft-meta-value {
  color: #0f172a;
  font-weight: 700;
  word-break: break-all;
}

.drafts-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}

.drafts-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.7rem;
}

.drafts-rename-field {
  margin-top: 0.65rem;
}

.drafts-rename-field--card {
  grid-column: 1 / -1;
  margin-top: 0;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(226, 232, 240, 0.95);
}

.drafts-rename-actions {
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.empty-state--drafts {
  margin-top: 0;
}

.workspace-modal-header,
.workspace-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid #e2e8f0;
}

.workspace-modal-footer {
  border-top: 1px solid #e2e8f0;
  border-bottom: none;
  justify-content: flex-end;
}

.workspace-modal-title {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.workspace-modal-close {
  width: 36px;
  height: 36px;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.workspace-modal-body {
  padding: 1rem 1.1rem 1.1rem;
  overflow: auto;
}

.workspace-modal-copy {
  margin: 0;
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.6;
}

.workspace-modal-body--copy-part {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.copy-part-select-all {
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #e2e8f0;
}

.copy-part-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.copy-part-checkbox {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  border: 1px solid #dbe3f0;
  background: #f8fafc;
  color: #334155;
  font-size: 0.88rem;
  font-weight: 700;
}

.copy-part-checkbox input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.draft-mode-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.draft-mode-button {
  border: 1px solid #dbe3f0;
  border-radius: 16px;
  background: #f8fafc;
  color: #334155;
  padding: 0.9rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.draft-mode-button.active {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.08);
  color: #312e81;
  box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.16);
}

.outputs-grid {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.outputs-grid--compact {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.65rem;
}

.output-item {
  display: flex;
  gap: 0.8rem;
  padding: 0.8rem;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  position: relative;
}

.output-item--selected {
  border-color: rgba(37, 99, 235, 0.55);
  background: rgba(239, 246, 255, 0.96);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.output-select-checkbox {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 2;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 4px;
  padding: 2px;
  display: inline-flex;
  cursor: pointer;
}

.output-select-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
}

.output-view--time {
  font-size: 0.78rem;
  color: #64748b;
}

.output-item--compact {
  padding: 0.7rem 0.75rem;
  border-radius: 16px;
}

.output-item--draft {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.output-item--draft.active {
  border-color: rgba(37, 99, 235, 0.32);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.92) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12), 0 10px 24px rgba(37, 99, 235, 0.08);
}

.output-item--draft-renaming {
  align-items: stretch;
}

.output-item--draft-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
}

.output-preview-stack--draft {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.output-preview {
  width: 72px;
  height: 72px;
  flex: 0 0 auto;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dbe3f0;
  cursor: zoom-in;
}

.workspace-modal--result-lightbox {
  width: min(1280px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
}

.workspace-modal-body--result-lightbox {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem;
  background: #ffffff;
  overflow: auto;
}

.result-lightbox-image {
  max-width: 100%;
  max-height: calc(100vh - 140px);
  object-fit: contain;
  display: block;
}

.output-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.output-preview--draft {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.output-preview--draft img {
  object-fit: contain;
  background: #ffffff;
}

.output-preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
}

.output-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.output-info--draft {
  width: 100%;
  gap: 0.3rem;
}

.recent-actions-inline {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 1rem;
  margin-top: 0.35rem;
}

.recent-actions-inline--drafts {
  gap: 0.85rem;
}

.recent-actions-inline--draft-card {
  margin-top: 0;
  gap: 0.65rem;
}

.draft-item-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.draft-item-heading .output-size {
  margin: 0;
  line-height: 1.35;
}

.draft-active-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.5rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.download-link,
.remove-link {
  border: none;
  background: transparent;
  padding: 0;
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}

.remove-link {
  color: #ef4444;
}

.action-button.danger {
  background: #dc2626;
  color: #ffffff;
  box-shadow: 0 14px 28px rgba(220, 38, 38, 0.22);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1440px) {
  .preview-container {
    grid-template-columns: 64px 220px minmax(0, 1fr) 260px;
  }

  .drafts-floating-panel {
    right: max(0.9rem, calc((100vw - 1680px) / 2 + 0.9rem));
    width: 292px;
  }
}

@media (max-width: 1200px) {
  .preview-page {
    height: auto;
    overflow: visible;
  }

  .preview-container {
    grid-template-columns: 68px 220px minmax(0, 1fr);
    overflow: visible;
  }

  .live-sidebar {
    grid-column: 1 / -1;
  }

  .workbench-main,
  .live-sidebar {
    height: auto;
    overflow: visible;
    padding-right: 0;
    margin-right: 0;
  }

  .sidebar-panel--workspace {
    height: auto;
    max-height: none;
  }

  .workspace-scroll-area {
    overflow: visible;
    padding-right: 0;
    margin-right: 0;
  }

  .drafts-floating-panel {
    position: static;
    top: auto;
    right: auto;
    width: auto;
    max-width: none;
    margin: 0 0.9rem 1rem;
    pointer-events: auto;
  }
}

@media (max-width: 900px) {
  .workspace-modal-backdrop--preview {
    padding: 0.6rem;
  }

  .workspace-modal--preview-view {
    width: min(100vw - 1.2rem, 100%);
    max-height: calc(100vh - 1.2rem);
  }

  .preview-dialog-controls {
    grid-template-columns: 1fr;
  }

  .preview-dialog-meta--header {
    min-width: 0;
    white-space: normal;
  }

  .preview-size-chip {
    min-width: calc(50% - 0.4rem);
  }

  .preview-dialog-stage {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-dialog-stage .preview-nav {
    justify-self: center;
  }

  .preview-dialog-media {
    min-height: min(54vh, 460px);
    max-height: calc(100vh - 360px);
  }

  .drafts-floating-panel {
    margin: 0 0.6rem 0.9rem;
  }

  .drafts-side-panel {
    max-height: none;
  }

  .drafts-side-panel-body {
    max-height: none;
  }

  .output-item--draft {
    align-items: stretch;
  }

  .output-preview--draft {
    width: 56px;
    max-width: none;
    height: 56px;
  }

  .drafts-featured-preview {
    min-height: 140px;
  }

  .preview-container {
    grid-template-columns: 1fr;
  }

  .hero-nav {
    grid-template-columns: 1fr auto;
    align-items: center;
    position: static;
    min-height: 0;
  }

  .preview-brand-link {
    position: static;
    transform: none;
    grid-column: 1 / -1;
    justify-self: center;
    margin-bottom: 0.4rem;
  }

  .product-actions {
    gap: 0.55rem;
  }

  .user-name {
    max-width: 108px;
  }

  .workspace-nav {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .workspace-nav-item {
    flex: 1 1 calc(20% - 0.5rem);
    min-width: 84px;
  }

  .workspace-sidebar,
  .live-sidebar {
    order: 0;
  }

  .hero-nav,
  .editor-shell-header,
  .editor-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .editor-shell-header {
    display: flex;
  }

  .editor-workbench {
    grid-template-columns: 1fr;
  }

  .workspace-hover-banner {
    width: 100%;
    justify-content: flex-start;
  }

  .editor-part-rail {
    overflow: hidden;
  }

  .part-rail-item {
    width: 100%;
    min-width: 0;
  }

  .transform-tools,
  .background-swatches {
    grid-template-columns: 1fr;
  }

  .background-color-row,
  .text-toolbar--grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .tool-field--wide {
    grid-column: span 1;
  }

  .color-options.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .library-grid,
  .library-grid--templates,
  .library-grid--artwork {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .shortcuts-grid {
    grid-template-columns: 1fr;
  }

  .workspace-hover-banner {
    gap: 0.35rem 0.55rem;
    padding: 0.52rem 0.7rem;
  }

  .workspace-hover-banner-title,
  .workspace-hover-banner-meta {
    width: 100%;
    white-space: normal;
  }

  .preview-topbar,
  .preview-container,
  .progress-content {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .sidebar-panel,
  .editor-shell {
    border-radius: 20px;
  }

  .canvas-container {
    min-height: 460px;
    padding: 0.65rem;
  }

  .library-grid,
  .library-grid--templates,
  .library-grid--artwork {
    grid-template-columns: 1fr;
  }

  .template-hover-card {
    width: min(248px, calc(100vw - 3rem));
  }
}

@media (max-width: 480px) {
  .preview-topbar {
    padding: 1rem;
  }
  
  .product-title {
    font-size: 1.5rem;
  }
  
  .product-badges {
    gap: 0.5rem;
  }
  
  .badge {
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
  }
  
  .card-header {
    padding: 1rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  .color-option {
    padding: 0.75rem;
  }
  
  .view-option {
    padding: 0.75rem;
  }
}
</style>
