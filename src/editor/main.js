(function () {
  const config = window.MOCKUP100_PREVIEW
  const fabricApi = window.fabric
  if (!config || !fabricApi) return
  // Mockup100 三大产品跳转 URL 由 PHP wp_localize_script 注入,
  // 不再硬编码 https://www.mockup100.com,避免域名/路径变更后失联。
  const mockup100Config = (window.mockup100Config && typeof window.mockup100Config === 'object')
    ? window.mockup100Config
    : {}

  const root = document.getElementById('mockup100-preview-root')
  if (!root) return

  const Canvas = fabricApi.Canvas
  const StaticCanvas = fabricApi.StaticCanvas || Canvas
  const FabricImage = fabricApi.FabricImage || fabricApi.Image
  const Rect = fabricApi.Rect
  const Textbox = fabricApi.Textbox
  const loadSVGFromURL = fabricApi.loadSVGFromURL
  const fabricUtil = fabricApi.util

  const STAGE_SIZE = 720
  const GUIDE_SIZE = 580
  const GUIDE_OFFSET = 70
  const ARTWORK_FIT_RATIO = 0.82

  const state = {
    binding: null,
    editor: null,
    variationId: Number(config.initialVariationId || 0),
    selectedTemplateId: '',
    activePartName: '',
    activeLayerId: '',
    partStates: {},
    fabricCanvas: null,
    stageResizeFrame: 0,
    drawToken: 0,
    dragLayerId: '',
    suspendSelectionSync: false,
    artwork: {
      records: [],
      categories: [],
      licenses: [],
      licenseMap: {},
      scope: 'platform',
      page: 1,
      size: 8,
      total: 0,
      categoryId: '',
      keyword: '',
      loading: false,
      purchasingId: '',
    },
    drafts: {
      templateId: '',
      activeDraftId: '',
      records: [],
      loading: false,
      saving: false,
      deletingId: '',
    },
    results: {
      templateId: '',
      records: [],
      loading: false,
      deletingId: '',
      lastSavedSignature: '',
    },
    viewPreview: {
      open: false,
      activeColor: '',
      activeView: '',
    },
    exportModal: {
      open: false,
    },
    resultsModal: {
      open: false,
      selectedIds: new Set(),
      lightboxUrl: '',
      lightboxLabel: '',
    },
    ui: {
      activeSidebarTab: 'template',
      templateSource: 'all',
      templateCategoryId: '',
      templateKeyword: '',
      templatePage: 1,
      templatePageSize: 8,
    },
  }

  function request(path, options = {}) {
    return fetch(`${config.restBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
        ...(options.headers || {}),
      },
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        // 0.4.51: 把 HTTP status 和后端 error_code 透传到 Error 对象,
        // 让上层 catch 能识别 402 (insufficient_tokens) 等业务态,弹专门的提示
        const error = new Error(payload.message || `HTTP ${response.status}`)
        error.status = response.status
        error.errorCode = payload.error_code || ''
        error.upstreamCode = payload.upstream_code || null
        throw error
      }
      return payload
    })
  }

  function resolveAssetUrl(url) {
    if (!url || typeof url !== 'string') {
      return url
    }
    const trimmed = url.trim()
    if (!trimmed) {
      return trimmed
    }
    if (/^https?:\/\//.test(trimmed)) {
      return trimmed
    }
    const platformUrl = window.MOCKUP100_ASSET_URL || mockup100Config.assetBaseUrl || ''
    if (!platformUrl) {
      return trimmed
    }
    return platformUrl + (trimmed.startsWith('/') ? trimmed : '/' + trimmed)
  }

  function createLayout() {
    root.innerHTML = `
      <div class="mockup100-designer mockup100-designer--pro">
        <aside class="mockup100-designer__sidebar">
          <div class="mockup100-sidebar-nav">
            <button type="button" class="mockup100-sidebar-nav__item is-active" data-role="sidebar-tab" data-tab="template">Templates</button>
            <button type="button" class="mockup100-sidebar-nav__item" data-role="sidebar-tab" data-tab="artwork">Artwork</button>
            <button type="button" class="mockup100-sidebar-nav__item" data-role="sidebar-tab" data-tab="text">Text</button>
            <button type="button" class="mockup100-sidebar-nav__item" data-role="sidebar-tab" data-tab="drafts">Drafts</button>
            <button type="button" class="mockup100-sidebar-nav__item" data-role="sidebar-tab" data-tab="results">Results</button>
          </div>
          <div class="mockup100-sidebar-panels">
            <section class="mockup100-sidebar-panel" data-panel="template">
              <div class="mockup100-panel__header">
                <div>
                  <p class="mockup100-panel__eyebrow">Template Library</p>
                  <h3>Choose A Template</h3>
                </div>
                <span class="mockup100-panel__badge" data-role="template-count"></span>
              </div>
              <div class="mockup100-segment-switch">
                <button type="button" class="mockup100-segment-switch__item is-active" data-role="template-source" data-source="all">All</button>
                <button type="button" class="mockup100-segment-switch__item" data-role="template-source" data-source="tenant">My Templates</button>
                <button type="button" class="mockup100-segment-switch__item" data-role="template-source" data-source="center">Template Center</button>
              </div>
              <label>Search
                <input type="text" data-role="template-search" placeholder="Search name / code" />
              </label>
              <label>Category
                <select data-role="template-category">
                  <option value="">All Categories</option>
                </select>
              </label>
              <div class="mockup100-template-library__list" data-role="template-list"></div>
              <div class="mockup100-pagination" data-role="template-pagination">
                <button type="button" class="button" data-role="template-prev">Prev</button>
                <span data-role="template-page-status"></span>
                <button type="button" class="button" data-role="template-next">Next</button>
              </div>
            </section>

            <section class="mockup100-sidebar-panel" data-panel="artwork" hidden>
              <div class="mockup100-panel__header">
                <div>
                  <p class="mockup100-panel__eyebrow">Artwork Library</p>
                  <h3>Insert Artwork</h3>
                </div>
              </div>
              <div class="mockup100-designer__actions">
                <button type="button" class="button" data-role="upload">Upload Image</button>
              </div>
              <input type="file" accept="image/*" data-role="file" hidden />
              <div class="mockup100-designer__inline">
                <label>Scope
                  <select data-role="artwork-scope">
                    <option value="platform">Platform</option>
                    <option value="tenant">My Library</option>
                  </select>
                </label>
                <label>Category
                  <select data-role="artwork-category">
                    <option value="">All</option>
                  </select>
                </label>
              </div>
              <div class="mockup100-designer__inline">
                <label>Search
                  <input type="text" data-role="artwork-keyword" placeholder="Search artwork" />
                </label>
                <button type="button" class="button" data-role="artwork-refresh">Refresh</button>
              </div>
              <div class="mockup100-layer-stack__list" data-role="artwork-list"></div>
              <div class="mockup100-pagination" data-role="artwork-pagination">
                <button type="button" class="button" data-role="artwork-prev">Prev</button>
                <span data-role="artwork-page-status"></span>
                <button type="button" class="button" data-role="artwork-next">Next</button>
              </div>
            </section>

            <section class="mockup100-sidebar-panel" data-panel="text" hidden>
              <div class="mockup100-panel__header">
                <div>
                  <p class="mockup100-panel__eyebrow">Text Tools</p>
                  <h3>Edit Text Layer</h3>
                </div>
              </div>
              <div class="mockup100-designer__actions">
                <button type="button" class="button" data-role="add-text">Add Text</button>
              </div>
              <label>Text
                <textarea rows="3" data-role="text-content" placeholder="Edit selected text layer"></textarea>
              </label>
              <div class="mockup100-designer__inline">
                <label>Size <input type="number" min="12" max="180" data-role="text-size" /></label>
                <label>Color <input type="color" data-role="text-color" /></label>
              </div>
              <div class="mockup100-designer__inline">
                <label>Font
                  <select data-role="text-font">
                    <option value="Inter">Inter</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </label>
                <label>Opacity <input type="range" min="0.15" max="1" step="0.05" data-role="text-opacity" /></label>
              </div>
              <div class="mockup100-designer__inline">
                <label>Letter Spacing <input type="number" min="-400" max="800" step="10" data-role="text-char-spacing" /></label>
                <label>Line Height <input type="number" min="0.8" max="3" step="0.1" data-role="text-line-height" /></label>
              </div>
              <div class="mockup100-designer__inline">
                <label>Stroke Color <input type="color" data-role="text-stroke-color" /></label>
                <label>Stroke Width <input type="number" min="0" max="12" step="0.5" data-role="text-stroke-width" /></label>
              </div>
              <div class="mockup100-designer__inline">
                <label>Background
                  <span class="mockup100-designer__toggle">
                    <input type="checkbox" data-role="text-background-enabled" />
                    <span>Enable</span>
                  </span>
                </label>
                <label>Background Color <input type="color" data-role="text-background-color" /></label>
              </div>
              <div class="mockup100-designer__actions">
                <button type="button" class="button" data-role="text-bold">Bold</button>
                <button type="button" class="button" data-role="text-italic">Italic</button>
                <button type="button" class="button" data-role="align-left">Left</button>
                <button type="button" class="button" data-role="align-center">Center</button>
                <button type="button" class="button" data-role="align-right">Right</button>
              </div>
            </section>

            <section class="mockup100-sidebar-panel" data-panel="drafts" hidden>
              <div class="mockup100-panel__header">
                <div>
                  <p class="mockup100-panel__eyebrow">Preview Drafts</p>
                  <h3>Save And Restore</h3>
                </div>
                <span class="mockup100-panel__badge" data-role="draft-count">0 drafts</span>
              </div>
              <div class="mockup100-designer__actions">
                <button type="button" class="button button-primary" data-role="save-draft">Save Draft</button>
              </div>
              <div class="mockup100-layer-stack__list" data-role="draft-list"></div>
            </section>

            <section class="mockup100-sidebar-panel" data-panel="results" hidden>
              <div class="mockup100-panel__header">
                <div>
                  <p class="mockup100-panel__eyebrow">Preview Results</p>
                  <h3>Restore Downloads</h3>
                </div>
                <span class="mockup100-panel__badge" data-role="result-count">0 results</span>
              </div>
              <div class="mockup100-designer__actions">
                <button type="button" class="button" data-role="refresh-results">Refresh</button>
              </div>
              <div class="mockup100-layer-stack__list" data-role="result-list"></div>
            </section>

            <div class="mockup100-designer__footer">
              <div class="mockup100-designer__actions">
                <button type="button" class="button" data-role="preview">Update Preview</button>
                <button type="button" class="button button-primary" data-role="prepare">Prepare For Cart</button>
              </div>
              <p class="mockup100-designer__status" data-role="status"></p>
            </div>
          </div>
        </aside>
        <section class="mockup100-designer__workspace">
          <div class="mockup100-stage-toolbar">
            <label>Part <select data-role="part"></select></label>
            <label>Color <select data-role="color"></select></label>
            <label>View <select data-role="view"></select></label>
            <label>Output Size <select data-role="output-size"></select></label>
          </div>
          <div class="mockup100-stage-headerbar">
            <button type="button" class="button" data-role="open-view-preview">View Preview</button>
            <button type="button" class="button" data-role="open-results">Results</button>
          </div>
          <div class="mockup100-stage-actions">
            <div class="mockup100-designer__actions">
              <button type="button" class="button" data-role="duplicate-layer">Duplicate</button>
              <button type="button" class="button" data-role="lock-layer">Lock</button>
              <button type="button" class="button" data-role="hide-layer">Hide</button>
              <button type="button" class="button" data-role="remove-layer">Delete</button>
            </div>
            <div class="mockup100-designer__actions">
              <button type="button" class="button" data-role="scale-up">Scale Up</button>
              <button type="button" class="button" data-role="scale-down">Scale Down</button>
              <button type="button" class="button" data-role="rotate-left">Rotate Left</button>
              <button type="button" class="button" data-role="rotate-right">Rotate Right</button>
            </div>
            <div class="mockup100-designer__actions">
              <button type="button" class="button" data-role="bring-forward">Bring Forward</button>
              <button type="button" class="button" data-role="send-backward">Send Backward</button>
              <button type="button" class="button" data-role="bring-front">Bring To Front</button>
              <button type="button" class="button" data-role="send-back">Send To Back</button>
            </div>
          </div>
          <div class="mockup100-designer__stage">
            <div class="mockup100-designer__canvas-frame" data-role="canvas-frame">
              <canvas width="720" height="720" data-role="canvas"></canvas>
            </div>
            <img alt="" data-role="preview-image" />
          </div>
          <div class="mockup100-layer-stack">
            <div class="mockup100-layer-stack__header">Layer Stack</div>
            <div class="mockup100-layer-stack__list" data-role="layer-list"></div>
          </div>
        </section>
      </div>
      <div class="mockup100-modal-backdrop" data-role="view-preview-modal" hidden>
        <div class="mockup100-modal mockup100-modal--preview">
          <header class="mockup100-modal__header">
            <h3>View Preview</h3>
            <button type="button" class="mockup100-modal__close" data-role="close-view-preview">×</button>
          </header>
          <div class="mockup100-modal__body">
            <aside class="mockup100-preview-thumbs" data-role="preview-thumbs"></aside>
            <div class="mockup100-preview-main">
              <div class="mockup100-preview-chips" data-role="preview-color-chips"></div>
              <div class="mockup100-preview-image-wrap">
                <button type="button" class="mockup100-preview-nav mockup100-preview-nav--prev" data-role="preview-prev">‹</button>
                <img alt="" data-role="preview-modal-image" />
                <button type="button" class="mockup100-preview-nav mockup100-preview-nav--next" data-role="preview-next">›</button>
              </div>
              <div class="mockup100-preview-meta" data-role="preview-meta"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="mockup100-modal-backdrop" data-role="results-modal" hidden>
        <div class="mockup100-modal mockup100-modal--results">
          <header class="mockup100-modal__header">
            <h3>Results</h3>
            <button type="button" class="mockup100-modal__close" data-role="close-results">×</button>
          </header>
          <div class="mockup100-results-toolbar">
            <button type="button" class="button" data-role="results-select-all">Select All</button>
            <button type="button" class="button" data-role="results-clear">Clear</button>
            <button type="button" class="button button-primary" data-role="results-download-selected">Download</button>
            <span class="mockup100-results-count" data-role="results-modal-count"></span>
          </div>
          <div class="mockup100-results-grid" data-role="results-grid"></div>
        </div>
      </div>
      <div class="mockup100-modal-backdrop mockup100-modal-backdrop--lightbox" data-role="results-lightbox" hidden>
        <div class="mockup100-modal mockup100-modal--lightbox">
          <header class="mockup100-modal__header">
            <h3 data-role="results-lightbox-label"></h3>
            <button type="button" class="mockup100-modal__close" data-role="close-results-lightbox">×</button>
          </header>
          <div class="mockup100-results-lightbox-body">
            <img data-role="results-lightbox-image" alt="" />
          </div>
        </div>
      </div>
    `
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error || new Error('File read failed'))
      reader.readAsDataURL(file)
    })
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value)
    }
    return String(value || '').replace(/"/g, '\\"')
  }

  function parseSizeToken(token) {
    const match = String(token || '').match(/^\s*(\d+)\s*x\s*(\d+)\s*$/i)
    if (!match) return null
    return { width: Number(match[1]), height: Number(match[2]) }
  }

  function normalizeColor(value, fallback = '#111827') {
    const normalized = String(value || '').trim()
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function createLayerId(partName) {
    return `${partName}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  }

  function isSvgAsset(src) {
    const normalized = String(src || '').toLowerCase()
    return normalized.includes('.svg') || normalized.startsWith('data:image/svg+xml')
  }

  function getParts() {
    return state.editor && Array.isArray(state.editor.parts) ? state.editor.parts : []
  }

  function getActivePart() {
    return getParts().find((part) => part.part_name === state.activePartName) || getParts()[0] || null
  }

  function getPartState(partName) {
    const key = String(partName || '')
    if (!state.partStates[key]) {
      state.partStates[key] = { layers: [] }
    }
    return state.partStates[key]
  }

  function initializePartStates(parts) {
    const next = {}
    ;(parts || []).forEach((part) => {
      const current = state.partStates[part.part_name]
      next[part.part_name] = { layers: current && Array.isArray(current.layers) ? current.layers : [] }
    })
    state.partStates = next
    if (!state.activePartName || !state.partStates[state.activePartName]) {
      state.activePartName = parts && parts[0] ? parts[0].part_name : ''
    }
    state.activeLayerId = ''
  }

  function getLayers(partName) {
    return getPartState(partName).layers
  }

  function getCurrentLayer() {
    return getLayers(state.activePartName).find((layer) => layer.id === state.activeLayerId) || null
  }

  function setStatus(message, isError) {
    const node = root.querySelector('[data-role="status"]')
    node.textContent = message || ''
    node.classList.toggle('is-error', !!isError)
  }

  function flattenArtworkCategories(nodes, depth = 0, output = []) {
    ;(Array.isArray(nodes) ? nodes : []).forEach((node) => {
      if (!node || !node.category_id) return
      output.push({
        category_id: node.category_id,
        name: `${depth ? `${'  '.repeat(depth)}- ` : ''}${node.name || node.category_id}`,
      })
      flattenArtworkCategories(node.children || [], depth + 1, output)
    })
    return output
  }

  function getArtworkLicense(artworkId) {
    if (!artworkId) return null
    if (state.artwork.licenseMap && state.artwork.licenseMap[artworkId]) {
      return state.artwork.licenseMap[artworkId]
    }
    return (state.artwork.licenses || []).find((item) => item.artwork_id === artworkId) || null
  }

  function getArtworkLicenseStatus(license) {
    if (!license || typeof license !== 'object') return ''
    return String(license.purchase_status || license.status || '').trim()
  }

  function applyArtworkBootstrap(payload) {
    const artwork = payload && payload.artwork ? payload.artwork : {}
    const query = artwork.query || {}
    state.artwork.scope = artwork.default_scope || query.scope || state.artwork.scope || 'platform'
    state.artwork.categoryId = query.category_id || ''
    state.artwork.keyword = query.keyword || state.artwork.keyword || ''
    state.artwork.page = Number(artwork.page || query.page || state.artwork.page || 1)
    state.artwork.size = Number(artwork.size || query.size || state.artwork.size || 8)
    state.artwork.total = Number(artwork.total || 0)
    state.artwork.categories = Array.isArray(artwork.categories) ? artwork.categories : []
    state.artwork.licenses = Array.isArray(artwork.licenses) ? artwork.licenses : []
    state.artwork.licenseMap = artwork.license_map && typeof artwork.license_map === 'object' ? artwork.license_map : {}
    state.artwork.records = Array.isArray(artwork.records) ? artwork.records : []
    state.artwork.loading = false
    populateArtworkCategories()
    renderArtworkList()
    renderArtworkPagination()
  }

  function applyDraftBootstrap(payload) {
    const drafts = payload && payload.drafts ? payload.drafts : {}
    state.drafts.templateId = drafts.template_id || state.selectedTemplateId || ''
    state.drafts.activeDraftId = drafts.active_draft_id || ''
    state.drafts.records = Array.isArray(drafts.records) ? drafts.records : []
    state.drafts.loading = false
    state.drafts.saving = false
    state.drafts.deletingId = ''
    syncDraftActionButton()
    renderDraftList()
  }

  function applyResultsBootstrap(payload) {
    const results = payload && payload.results ? payload.results : {}
    state.results.templateId = results.template_id || state.selectedTemplateId || ''
    state.results.records = dedupeResults(Array.isArray(results.records) ? results.records : [])
    state.results.loading = false
    state.results.deletingId = ''
    renderResultList()
    if (state.resultsModal && state.resultsModal.open) renderResultsDialog()
    if (state.viewPreview && state.viewPreview.open) renderViewPreviewDialog()
  }

  function syncDraftActionButton() {
    const button = root.querySelector('[data-role="save-draft"]')
    if (!button) return
    const hasTemplate = !!state.selectedTemplateId
    button.disabled = !hasTemplate || state.drafts.loading || state.drafts.saving
    button.textContent = state.drafts.saving ? 'Saving...' : 'Save Draft'
    button.title = hasTemplate ? 'Save the current workspace state.' : 'Select a template before saving.'
  }

  function renderDraftList() {
    const list = root.querySelector('[data-role="draft-list"]')
    const badge = root.querySelector('[data-role="draft-count"]')
    if (!list || !badge) return
    badge.textContent = `${state.drafts.records.length} drafts`
    if (state.drafts.loading) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">Loading drafts...</div>'
      return
    }
    if (!state.drafts.records.length) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">No saved drafts for this template yet.</div>'
      return
    }
    list.innerHTML = state.drafts.records.map((item) => {
      const active = item.draft_id === state.drafts.activeDraftId
      const disabled = state.drafts.deletingId === item.draft_id
      const updatedAt = item.updated_at || item.created_at || ''
      return `
        <div class="mockup100-layer-row ${active ? 'is-active' : ''}">
          <div class="mockup100-draft-card">
            <div class="mockup100-draft-card__body" data-action="load-draft" data-draft-id="${escapeHtml(item.draft_id || '')}">
              <div class="mockup100-draft-card__title">${escapeHtml(item.draft_name || 'Untitled Draft')}</div>
              <div class="mockup100-draft-card__meta">${escapeHtml(updatedAt)}</div>
            </div>
            <div class="mockup100-designer__actions">
              <button type="button" class="button button-small" data-action="load-draft" data-draft-id="${escapeHtml(item.draft_id || '')}">${active ? 'Active' : 'Load'}</button>
              <button type="button" class="button button-small" data-action="delete-draft" data-draft-id="${escapeHtml(item.draft_id || '')}" ${disabled ? 'disabled' : ''}>Delete</button>
            </div>
          </div>
        </div>
      `
    }).join('')
  }

  function renderResultList() {
    const list = root.querySelector('[data-role="result-list"]')
    const badge = root.querySelector('[data-role="result-count"]')
    if (!list || !badge) return
    const exportRecords = exportResultRecords()
    badge.textContent = `${exportRecords.length} results`
    if (state.results.loading) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">Loading results...</div>'
      return
    }
    if (!exportRecords.length) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">No persisted results yet. Render a preview to populate this list.</div>'
      return
    }
    list.innerHTML = exportRecords.map((item) => {
      const disabled = state.results.deletingId === item.output_id
      const resolvedPreviewUrl = resolveAssetUrl(item.preview_url)
      return `
        <div class="mockup100-layer-row">
          <div class="mockup100-result-card">
            <div class="mockup100-result-card__thumb">
              ${item.preview_url ? `<img src="${escapeHtml(resolvedPreviewUrl)}" alt="${escapeHtml(item.output_id || 'result')}" />` : '<span>IMG</span>'}
            </div>
            <div class="mockup100-result-card__body">
              <div class="mockup100-result-card__title">${escapeHtml(item.color || '')} · ${escapeHtml(item.view || '')} · ${escapeHtml(item.size || '')}</div>
              <div class="mockup100-result-card__meta">${escapeHtml(item.created_at || '')}</div>
              <div class="mockup100-designer__actions">
                ${item.preview_url ? `<a class="button button-small" href="${escapeHtml(resolvedPreviewUrl)}" target="_blank" rel="noopener">Preview</a>` : ''}
                ${item.download_url ? `<a class="button button-small" href="${escapeHtml(item.download_url)}" target="_blank" rel="noopener">Download</a>` : ''}
                <button type="button" class="button button-small" data-action="delete-result" data-output-id="${escapeHtml(item.output_id || '')}" ${disabled ? 'disabled' : ''}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      `
    }).join('')
  }

  // === View Preview Modal ===
  function openViewPreviewDialog() {
    state.viewPreview.open = true
    state.viewPreview.activeColor = root.querySelector('[data-role="color"]').value
    state.viewPreview.activeView = root.querySelector('[data-role="view"]').value
    const modal = root.querySelector('[data-role="view-preview-modal"]')
    if (modal) modal.hidden = false
    renderViewPreviewDialog()
  }

  function closeViewPreviewDialog() {
    state.viewPreview.open = false
    const modal = root.querySelector('[data-role="view-preview-modal"]')
    if (modal) modal.hidden = true
  }

  function getAvailableColors() {
    const editor = state.editor || {}
    const colors = Array.isArray(editor.colors) ? editor.colors : []
    return colors.map((c) => (typeof c === 'string' ? c : (c.color_name || c.name || '')))
      .filter(Boolean)
  }

  function getAvailableViews() {
    const editor = state.editor || {}
    const views = Array.isArray(editor.views) ? editor.views : []
    return views.map((v) => (typeof v === 'string' ? v : (v.view_name || v.name || '')))
      .filter(Boolean)
  }

  function getAvailableSizes() {
    const editor = state.editor || {}
    const sizes = Array.isArray(editor.export_sizes) && editor.export_sizes.length
      ? editor.export_sizes
      : (Array.isArray(editor.supported_output_sizes) ? editor.supported_output_sizes : [])
    return sizes.filter(Boolean)
  }

  function getResultsByColorView(color, view) {
    return state.results.records.filter((r) =>
      String(r.color || '') === String(color) && String(r.view || '') === String(view)
    )
  }

  function renderViewPreviewDialog() {
    if (!state.viewPreview.open) return
    const chips = root.querySelector('[data-role="preview-color-chips"]')
    const thumbs = root.querySelector('[data-role="preview-thumbs"]')
    const image = root.querySelector('[data-role="preview-modal-image"]')
    const meta = root.querySelector('[data-role="preview-meta"]')
    if (!chips || !thumbs || !image || !meta) return

    const colors = getAvailableColors()
    const views = getAvailableViews()
    const activeColor = state.viewPreview.activeColor || colors[0] || ''
    const activeView = state.viewPreview.activeView || views[0] || ''

    chips.innerHTML = colors.map((c) =>
      '<button type="button" class="mockup100-chip ' + (c === activeColor ? 'is-active' : '') +
      '" data-action="preview-color" data-color="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>'
    ).join('')

    thumbs.innerHTML = views.map((v) => {
      const matches = getResultsByColorView(activeColor, v)
      const first = matches[0]
      const url = first ? resolveAssetUrl(first.preview_url || '') : ''
      return '<button type="button" class="mockup100-preview-thumb ' + (v === activeView ? 'is-active' : '') +
        '" data-action="preview-view" data-view="' + escapeHtml(v) + '">' +
        (url ? '<img src="' + escapeHtml(url) + '" alt="" />' : '<span class="mockup100-preview-thumb__placeholder">' + escapeHtml(v) + '</span>') +
        '<span class="mockup100-preview-thumb__label">' + escapeHtml(v) + '</span>' +
        '</button>'
    }).join('')

    const matches = getResultsByColorView(activeColor, activeView)
    const current = matches[0]
    if (current && current.preview_url) {
      image.src = resolveAssetUrl(current.preview_url)
      image.style.visibility = 'visible'
    } else {
      image.removeAttribute('src')
      image.style.visibility = 'hidden'
    }
    meta.textContent = current
      ? (current.color + ' · ' + current.view + ' · ' + (current.size || ''))
      : 'No render available for this combination.'
  }

  function navigateViewPreview(direction) {
    const views = getAvailableViews()
    if (!views.length) return
    const idx = views.indexOf(state.viewPreview.activeView)
    let next = idx + (direction === 'next' ? 1 : -1)
    if (next < 0) next = views.length - 1
    if (next >= views.length) next = 0
    state.viewPreview.activeView = views[next]
    renderViewPreviewDialog()
  }

  // === Results Modal ===
  function openResultsDialog() {
    state.resultsModal.open = true
    state.resultsModal.selectedIds = new Set()
    const modal = root.querySelector('[data-role="results-modal"]')
    if (modal) modal.hidden = false
    refreshPreviewResults().then(() => renderResultsDialog())
    renderResultsDialog()
  }

  function closeResultsDialog() {
    state.resultsModal.open = false
    const modal = root.querySelector('[data-role="results-modal"]')
    if (modal) modal.hidden = true
  }

  // results 列表只展示 export 来源,过滤掉 preview / draft_save 等 Quick Preview 类条目;
  // mode 字段保持 stamp 后的格式,例如 "export|wp:xxx" 或 "export"。
  function isExportResultRecord(record) {
    if (!record) return false
    const rawMode = String(record.mode || '').trim().toLowerCase()
    if (!rawMode) return false
    const baseMode = rawMode.split('|')[0]
    return baseMode === 'export' || baseMode === 'download_zip'
  }
  function exportResultRecords() {
    return dedupeResults(state.results.records).filter(isExportResultRecord)
  }

  function dedupeResults(records) {
    const seen = new Set()
    const out = []
    ;(records || []).forEach((r) => {
      const id = r.output_id || r.id || (r.preview_url + '|' + r.download_url)
      if (seen.has(id)) return
      seen.add(id)
      out.push(r)
    })
    return out
  }

  function renderResultsDialog() {
    if (!state.resultsModal.open) return
    const grid = root.querySelector('[data-role="results-grid"]')
    const count = root.querySelector('[data-role="results-modal-count"]')
    if (!grid || !count) return
    const records = exportResultRecords()
    count.textContent = records.length + ' renders · ' + state.resultsModal.selectedIds.size + ' selected'
    if (!records.length) {
      grid.innerHTML = '<div class="mockup100-results-empty">No renders yet.</div>'
      return
    }
    grid.innerHTML = records.map((r) => {
      const id = r.output_id || ''
      const selected = state.resultsModal.selectedIds.has(id)
      const url = resolveAssetUrl(r.preview_url || '')
      const dl = r.download_url || ''
      const labelText = (r.color || '') + ' · ' + (r.view || '') + ' · ' + (r.size || '')
      return '<div class="mockup100-result-tile ' + (selected ? 'is-selected' : '') + '" data-output-id="' + escapeHtml(id) + '">' +
        '<label class="mockup100-result-tile__select" data-stop-propagate="1">' +
          '<input type="checkbox" data-action="result-toggle" data-output-id="' + escapeHtml(id) + '" ' + (selected ? 'checked' : '') + ' />' +
        '</label>' +
        '<div class="mockup100-result-tile__thumb" data-action="result-zoom" data-output-id="' + escapeHtml(id) + '" data-thumb-url="' + escapeHtml(url) + '" data-thumb-label="' + escapeHtml(labelText) + '">' +
          (url ? '<img src="' + escapeHtml(url) + '" alt="" />' : '<span>IMG</span>') +
        '</div>' +
        '<div class="mockup100-result-tile__meta">' + escapeHtml(labelText) + '</div>' +
        (dl ? '<a class="button button-small" href="' + escapeHtml(dl) + '" target="_blank" rel="noopener" data-stop-propagate="1">Download</a>' : '') +
        '</div>'
    }).join('')
  }

  function selectAllResults() {
    const records = exportResultRecords()
    records.forEach((r) => {
      if (r.output_id) state.resultsModal.selectedIds.add(r.output_id)
    })
    renderResultsDialog()
  }

  function clearResultsSelection() {
    state.resultsModal.selectedIds = new Set()
    renderResultsDialog()
  }

  function openResultLightbox(url, label) {
    state.resultsModal.lightboxUrl = url || ''
    state.resultsModal.lightboxLabel = label || ''
    const modal = root.querySelector('[data-role="results-lightbox"]')
    const img = root.querySelector('[data-role="results-lightbox-image"]')
    const labelEl = root.querySelector('[data-role="results-lightbox-label"]')
    if (img) img.src = state.resultsModal.lightboxUrl
    if (labelEl) labelEl.textContent = state.resultsModal.lightboxLabel
    if (modal) modal.hidden = !state.resultsModal.lightboxUrl
  }

  function closeResultLightbox() {
    state.resultsModal.lightboxUrl = ''
    state.resultsModal.lightboxLabel = ''
    const modal = root.querySelector('[data-role="results-lightbox"]')
    const img = root.querySelector('[data-role="results-lightbox-image"]')
    if (img) img.src = ''
    if (modal) modal.hidden = true
  }

  function downloadSelectedResults() {
    const records = exportResultRecords()
    const targets = records.filter((r) => r.output_id && state.resultsModal.selectedIds.has(r.output_id) && r.download_url)
    if (!targets.length) {
      setStatus('Select at least one render to download.', true)
      return
    }
    targets.forEach((r, idx) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = r.download_url
        a.target = '_blank'
        a.rel = 'noopener'
        a.download = ''
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, idx * 200)
    })
    setStatus('Downloading ' + targets.length + ' renders.')
  }

  function buildWorkspaceSnapshot() {
    return {
      version: 1,
      template_id: state.selectedTemplateId,
      active_part_name: state.activePartName,
      active_layer_id: state.activeLayerId,
      selected_color: root.querySelector('[data-role="color"]').value,
      selected_view: root.querySelector('[data-role="view"]').value,
      output_size: root.querySelector('[data-role="output-size"]').value,
      parts: getParts().map((part) => ({
        part_name: part.part_name,
        layers: getLayers(part.part_name).map((layer) => ({ ...layer })),
      })),
    }
  }

  function restoreWorkspaceSnapshot(snapshot, preferences = {}) {
    if (!snapshot || typeof snapshot !== 'object') return false
    const parts = Array.isArray(snapshot.parts) ? snapshot.parts : []
    if (!parts.length) return false
    initializePartStates(state.editor && Array.isArray(state.editor.parts) ? state.editor.parts : [])
    parts.forEach((part) => {
      if (!part || !part.part_name || !state.partStates[part.part_name]) return
      state.partStates[part.part_name] = {
        layers: Array.isArray(part.layers) ? part.layers.map((layer) => ({ ...layer })) : [],
      }
    })
    state.activePartName = snapshot.active_part_name && state.partStates[snapshot.active_part_name]
      ? snapshot.active_part_name
      : (getParts()[0] ? getParts()[0].part_name : '')
    state.activeLayerId = snapshot.active_layer_id || ''
    setSelectValue(root.querySelector('[data-role="part"]'), [state.activePartName])
    setSelectValue(root.querySelector('[data-role="color"]'), [preferences.selected_color || snapshot.selected_color])
    setSelectValue(root.querySelector('[data-role="view"]'), [preferences.selected_view || snapshot.selected_view])
    setSelectValue(root.querySelector('[data-role="output-size"]'), [preferences.output_size || snapshot.output_size])
    return true
  }

  async function refreshPreviewDrafts() {
    if (!state.selectedTemplateId) {
      applyDraftBootstrap({ drafts: { template_id: '', active_draft_id: '', records: [] } })
      return
    }
    state.drafts.loading = true
    syncDraftActionButton()
    renderDraftList()
    const query = new URLSearchParams()
    if (state.selectedTemplateId) query.set('template_id', state.selectedTemplateId)
    if (state.variationId) query.set('variation_id', String(state.variationId))
    const payload = await request(`/drafts?${query.toString()}`)
    applyDraftBootstrap(payload)
  }

  async function refreshPreviewResults() {
    if (!state.selectedTemplateId) {
      applyResultsBootstrap({ results: { template_id: '', records: [] } })
      return
    }
    state.results.loading = true
    renderResultList()
    const query = new URLSearchParams()
    if (state.selectedTemplateId) query.set('template_id', state.selectedTemplateId)
    if (state.variationId) query.set('variation_id', String(state.variationId))
    const payload = await request(`/results?${query.toString()}`)
    applyResultsBootstrap(payload)
  }

  async function saveDraft() {
    if (!state.selectedTemplateId) {
      setStatus('Select a template before saving a draft.', true)
      return
    }
    const draftName = window.prompt('Draft name', resolveActiveDraftName() || 'Preview Draft')
    if (!draftName) return
    state.drafts.saving = true
    syncDraftActionButton()
    const payload = {
      template_id: state.selectedTemplateId,
      variation_id: state.variationId,
      draft_name: draftName.trim(),
      design_json: JSON.stringify(buildWorkspaceSnapshot()),
      preferences_json: JSON.stringify({
        selected_color: root.querySelector('[data-role="color"]').value,
        selected_view: root.querySelector('[data-role="view"]').value,
        output_size: root.querySelector('[data-role="output-size"]').value,
      }),
    }
    try {
      if (state.drafts.activeDraftId) {
        await request(`/drafts/${encodeURIComponent(state.drafts.activeDraftId)}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...payload,
            set_active: true,
          }),
        })
      } else {
        await request('/drafts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      await refreshPreviewDrafts()
      setStatus('Draft saved.')
    } finally {
      state.drafts.saving = false
      syncDraftActionButton()
    }
  }

  function resolveActiveDraftName() {
    const active = state.drafts.records.find((item) => item.draft_id === state.drafts.activeDraftId)
    return active && active.draft_name ? active.draft_name : ''
  }

  async function loadDraft(draftId) {
    const draft = state.drafts.records.find((item) => item.draft_id === draftId)
    if (!draft || !draft.design_json) return
    const snapshot = safeParseJson(draft.design_json)
    const preferences = safeParseJson(draft.preferences_json || '{}')
    if (!restoreWorkspaceSnapshot(snapshot, preferences)) {
      setStatus('Unable to restore this draft.', true)
      return
    }
    await request(`/drafts/${encodeURIComponent(draftId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        template_id: state.selectedTemplateId,
        set_active: true,
      }),
    })
    state.drafts.activeDraftId = draftId
    renderDraftList()
    await drawScene()
    setStatus(`Draft restored: ${draft.draft_name || draftId}`)
  }

  async function deleteDraft(draftId) {
    state.drafts.deletingId = draftId
    renderDraftList()
    try {
      await request(`/drafts/${encodeURIComponent(draftId)}`, {
        method: 'DELETE',
      })
      await refreshPreviewDrafts()
      setStatus('Draft deleted.')
    } finally {
      state.drafts.deletingId = ''
      renderDraftList()
    }
  }

  function safeParseJson(value) {
    try {
      const parsed = JSON.parse(String(value || ''))
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch (_) {
      return null
    }
  }

  function populateArtworkCategories() {
    const select = root.querySelector('[data-role="artwork-category"]')
    const current = state.artwork.categoryId
    populateSelect(
      select,
      [{ category_id: '', name: 'All' }, ...flattenArtworkCategories(state.artwork.categories)],
      (item) => item.category_id,
      (item) => item.name,
    )
    select.value = current
  }

  function renderArtworkList() {
    const list = root.querySelector('[data-role="artwork-list"]')
    if (state.artwork.loading) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">Loading artwork...</div>'
      renderArtworkPagination()
      return
    }
    if (!state.artwork.records.length) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">No artwork found for the current filters.</div>'
      renderArtworkPagination()
      return
    }
    list.innerHTML = state.artwork.records.map((item) => {
      const license = getArtworkLicense(item.artwork_id)
      const unlocked = !!item.unlocked || !!item.purchased || !!license || item.commerce_type !== 'paid'
      const actionLabel = unlocked
        ? 'Use Artwork'
        : (state.artwork.purchasingId === item.artwork_id ? 'Unlocking...' : `Unlock ${item.price_tokens || 0} Tokens`)
      const action = unlocked ? 'use-artwork' : 'buy-artwork'
      const disabled = state.artwork.purchasingId && state.artwork.purchasingId !== item.artwork_id
      const licenseStatus = getArtworkLicenseStatus(license)
      const licenseLabel = licenseStatus ? ` · license ${licenseStatus}` : ''
      const artworkThumbUrl = resolveAssetUrl(item.preview_url || item.original_url || '')
      return `
        <div class="mockup100-layer-row">
          <div class="mockup100-artwork-card">
            <div class="mockup100-artwork-card__thumb">
              <img src="${escapeHtml(artworkThumbUrl)}" alt="${escapeHtml(item.name || item.artwork_id)}" />
            </div>
            <div class="mockup100-artwork-card__body">
              <div class="mockup100-artwork-card__title">${escapeHtml(item.name || item.artwork_id)}</div>
              <div class="mockup100-artwork-card__meta">${escapeHtml(item.category_path || item.library_scope || '')}</div>
              <div class="mockup100-artwork-card__meta">${escapeHtml(item.creator_name || '')}</div>
              <div class="mockup100-artwork-card__meta">${escapeHtml(item.commerce_type || 'free')}${item.price_tokens ? ` · ${escapeHtml(item.price_tokens)} Tokens` : ''}${escapeHtml(licenseLabel)}</div>
              <div class="mockup100-designer__actions">
                <button
                  type="button"
                  class="button button-small"
                  data-action="${action}"
                  data-artwork-id="${escapeHtml(item.artwork_id)}"
                  ${disabled ? 'disabled' : ''}
                >${escapeHtml(actionLabel)}</button>
              </div>
            </div>
          </div>
        </div>
      `
    }).join('')
    renderArtworkPagination()
  }

  function resetPreparedCartPayload() {
    const hidden = document.querySelector(`input[name="${config.cartInputName}"]`)
    if (hidden) hidden.value = ''
    syncCartButtonState(false)
  }

  function syncCartButtonState(enabled) {
    const button = document.querySelector('[data-role="designer-add-to-cart"]')
    if (!button) return
    button.disabled = !enabled
  }

  function updateSelectedTemplateLabel(payload) {
    const target = document.querySelector('[data-role="selected-template-label"]')
    if (!target) return
    const selectedBinding = payload && payload.selected_binding ? payload.selected_binding : {}
    const binding = payload && payload.binding ? payload.binding : {}
    target.textContent = selectedBinding.display_name
      || selectedBinding.title
      || binding.template_label
      || binding.template_id
      || 'Template'
  }

  function populateSelect(select, items, getValue, getLabel) {
    select.innerHTML = ''
    items.forEach((item, index) => {
      const option = document.createElement('option')
      option.value = getValue(item)
      option.textContent = getLabel(item)
      if (index === 0) option.selected = true
      select.appendChild(option)
    })
  }

  function setSelectValue(select, candidates) {
    const options = Array.from(select.options || []).map((option) => option.value)
    const next = (Array.isArray(candidates) ? candidates : [])
      .map((value) => String(value == null ? '' : value))
      .find((value) => options.includes(value))

    if (next !== undefined) {
      select.value = next
      return
    }

    if (select.options.length) {
      select.value = select.options[0].value
    }
  }

  function getSelectedBindingPreview(payload) {
    const selectedBinding = payload && payload.selected_binding ? payload.selected_binding : {}
    const binding = payload && payload.binding ? payload.binding : {}
    const previewUrl = selectedBinding.cover_url || selectedBinding.template_snapshot || binding.template_snapshot || ''
    return resolveAssetUrl(previewUrl)
  }

  function normalizeTemplateSource(source) {
    const normalized = String(source || '').trim().toLowerCase()
    if (normalized === 'marketplace' || normalized === 'template_center') {
      return 'center'
    }
    if (normalized === 'tenant' || normalized === 'repository') {
      return 'tenant'
    }
    return normalized || 'other'
  }

  function getTemplateBindings() {
    return state.binding && Array.isArray(state.binding.bindings) ? state.binding.bindings : []
  }

  function getTemplateCategoryOptions() {
    const categories = new Map()
    getTemplateBindings().forEach((item) => {
      const categoryId = String(item.category_id || '').trim()
      if (!categoryId) return
      categories.set(categoryId, {
        category_id: categoryId,
        label: String(item.category_path || categoryId).trim(),
      })
    })
    return Array.from(categories.values()).sort((left, right) => left.label.localeCompare(right.label))
  }

  function getFilteredTemplateBindings() {
    const keyword = String(state.ui.templateKeyword || '').trim().toLowerCase()
    return getTemplateBindings().filter((item) => {
      if (state.ui.templateSource !== 'all' && normalizeTemplateSource(item.template_source) !== state.ui.templateSource) {
        return false
      }
      if (state.ui.templateCategoryId && String(item.category_id || '') !== state.ui.templateCategoryId) {
        return false
      }
      if (!keyword) return true
      const haystack = [
        item.display_name,
        item.title,
        item.template_id,
        item.template_code,
      ].join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
  }

  function getTemplatePageState() {
    const items = getFilteredTemplateBindings()
    const pageSize = Math.max(1, Number(state.ui.templatePageSize || 8))
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
    state.ui.templatePage = Math.min(totalPages, Math.max(1, Number(state.ui.templatePage || 1)))
    const start = (state.ui.templatePage - 1) * pageSize
    return {
      items,
      pageSize,
      totalPages,
      pagedItems: items.slice(start, start + pageSize),
    }
  }

  function syncSidebarPanels() {
    root.querySelectorAll('[data-role="sidebar-tab"]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-tab') === state.ui.activeSidebarTab)
    })
    root.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-panel') !== state.ui.activeSidebarTab
    })
  }

  function scrollActiveLayerIntoView() {
    if (!state.activeLayerId) return
    const activeRow = root.querySelector(`.mockup100-layer-row[data-layer-id="${cssEscape(state.activeLayerId)}"]`)
    if (!activeRow || typeof activeRow.scrollIntoView !== 'function') return
    activeRow.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  function renderTemplateLibrary() {
    const list = root.querySelector('[data-role="template-list"]')
    const categorySelect = root.querySelector('[data-role="template-category"]')
    const searchInput = root.querySelector('[data-role="template-search"]')
    const countBadge = root.querySelector('[data-role="template-count"]')
    if (!list || !categorySelect || !searchInput || !countBadge) return

    searchInput.value = state.ui.templateKeyword
    const categories = getTemplateCategoryOptions()
    const currentValue = state.ui.templateCategoryId
    populateSelect(
      categorySelect,
      [{ category_id: '', label: 'All Categories' }, ...categories],
      (item) => item.category_id,
      (item) => item.label,
    )
    categorySelect.value = currentValue

    root.querySelectorAll('[data-role="template-source"]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-source') === state.ui.templateSource)
    })

    const { items, pagedItems, totalPages } = getTemplatePageState()
    countBadge.textContent = `${items.length} templates`
    if (!pagedItems.length) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">No templates match the current filters.</div>'
    } else {
      list.innerHTML = pagedItems.map((item) => `
        <button
          type="button"
          class="mockup100-template-tile ${state.selectedTemplateId === item.template_id ? 'is-active' : ''}"
          data-role="template-tile"
          data-template-id="${escapeHtml(item.template_id || '')}"
        >
          <span class="mockup100-template-tile__thumb">
            ${item.cover_url ? `<img src="${escapeHtml(item.cover_url)}" alt="${escapeHtml(item.display_name || item.template_id)}" />` : '<span class="mockup100-template-tile__fallback">T</span>'}
          </span>
          <span class="mockup100-template-tile__body">
            <span class="mockup100-template-tile__title">${escapeHtml(item.display_name || item.title || item.template_id)}</span>
            <span class="mockup100-template-tile__meta">${escapeHtml(item.category_path || item.category_id || 'Uncategorized')}</span>
            <span class="mockup100-template-tile__meta">${escapeHtml(normalizeTemplateSource(item.template_source) === 'center' ? 'Template Center' : 'My Templates')}</span>
          </span>
        </button>
      `).join('')
    }

    const prev = root.querySelector('[data-role="template-prev"]')
    const next = root.querySelector('[data-role="template-next"]')
    const status = root.querySelector('[data-role="template-page-status"]')
    if (prev && next && status) {
      prev.disabled = state.ui.templatePage <= 1
      next.disabled = state.ui.templatePage >= totalPages
      status.textContent = items.length ? `${state.ui.templatePage} / ${totalPages}` : '0 / 0'
    }
  }

  function renderArtworkPagination() {
    const prev = root.querySelector('[data-role="artwork-prev"]')
    const next = root.querySelector('[data-role="artwork-next"]')
    const status = root.querySelector('[data-role="artwork-page-status"]')
    if (!prev || !next || !status) return
    const totalPages = Math.max(1, Math.ceil((state.artwork.total || 0) / Math.max(1, state.artwork.size || 8)))
    prev.disabled = state.artwork.page <= 1
    next.disabled = state.artwork.page >= totalPages
    status.textContent = state.artwork.total ? `${state.artwork.page} / ${totalPages}` : '0 / 0'
  }

  function getLayerDisplayLabel(layer, partName, indexFromBottom) {
    const customName = String(layer && layer.name ? layer.name : '').trim()
    if (customName) return customName
    if (layer.kind === 'text') {
      const raw = String(layer.text || '')
      const trimmed = raw.slice(0, 18)
      return trimmed ? (raw.length > 18 ? trimmed + '...' : trimmed) : 'Text'
    }
    return `${partName || 'part'} #${indexFromBottom}`
  }

  async function renameLayer(layerId) {
    if (!layerId) return
    const part = getActivePart()
    if (!part) return
    const layers = getLayers(part.part_name)
    const target = layers.find((item) => item.id === layerId)
    if (!target) return
    const currentLabel = String(target.name || (target.kind === 'text' ? (target.text || '') : '')).trim()
    const next = window.prompt('Rename layer', currentLabel)
    if (next === null) return
    const trimmed = String(next || '').trim()
    if (!trimmed) return
    if (trimmed === currentLabel) return
    target.name = trimmed
    renderLayerList()
  }

  function renderLayerList() {
    const list = root.querySelector('[data-role="layer-list"]')
    const layers = getLayers(state.activePartName)
    if (!layers.length) {
      list.innerHTML = '<div class="mockup100-layer-stack__empty">No layers added for this part yet.</div>'
      return
    }
    list.innerHTML = [...layers].reverse().map((layer, index) => `
      <div
        class="mockup100-layer-row ${state.activeLayerId === layer.id ? 'is-active' : ''} ${layer.locked ? 'is-locked' : ''} ${layer.hidden ? 'is-hidden' : ''}"
        data-layer-id="${layer.id}"
        draggable="true"
      >
        <button type="button" class="mockup100-layer-chip" data-action="select-layer" data-layer-id="${layer.id}">
          <span class="mockup100-layer-chip__handle">::</span>
          <span class="mockup100-layer-chip__kind">${layer.kind === 'text' ? 'TXT' : 'IMG'}</span>
          <span class="mockup100-layer-chip__label">${escapeHtml(getLayerDisplayLabel(layer, state.activePartName, layers.length - index))}</span>
          <span class="mockup100-layer-chip__badges">
            ${layer.locked ? '<span class="mockup100-layer-chip__badge">Locked</span>' : ''}
            ${layer.hidden ? '<span class="mockup100-layer-chip__badge">Hidden</span>' : ''}
          </span>
        </button>
        <div class="mockup100-layer-chip__tools">
          <button type="button" class="button button-small" data-action="rename-layer" data-layer-id="${layer.id}">Rename</button>
          <button type="button" class="button button-small" data-action="duplicate-layer" data-layer-id="${layer.id}">Copy</button>
          <button type="button" class="button button-small" data-action="lock-layer" data-layer-id="${layer.id}">${layer.locked ? 'Unlock' : 'Lock'}</button>
          <button type="button" class="button button-small" data-action="hide-layer" data-layer-id="${layer.id}">${layer.hidden ? 'Show' : 'Hide'}</button>
        </div>
      </div>
    `).join('')
    scrollActiveLayerIntoView()
  }

  function syncLayerActionButtons() {
    const current = getCurrentLayer()
    const isMutable = !!current && !current.locked
    const duplicateButton = root.querySelector('[data-role="duplicate-layer"]')
    const lockButton = root.querySelector('[data-role="lock-layer"]')
    const hideButton = root.querySelector('[data-role="hide-layer"]')
    const removeButton = root.querySelector('[data-role="remove-layer"]')
    const guardedSelectors = [
      '[data-role="scale-up"]',
      '[data-role="scale-down"]',
      '[data-role="rotate-left"]',
      '[data-role="rotate-right"]',
      '[data-role="bring-forward"]',
      '[data-role="send-backward"]',
      '[data-role="bring-front"]',
      '[data-role="send-back"]',
    ]
    duplicateButton.disabled = !current
    lockButton.disabled = !current
    hideButton.disabled = !current
    removeButton.disabled = !isMutable
    guardedSelectors
      .map((selector) => root.querySelector(selector))
      .forEach((button) => {
        button.disabled = !isMutable
      })
    lockButton.classList.toggle('is-active', !!current && !!current.locked)
    hideButton.classList.toggle('is-active', !!current && !!current.hidden)
    lockButton.textContent = current && current.locked ? 'Unlock' : 'Lock'
    hideButton.textContent = current && current.hidden ? 'Show' : 'Hide'
  }

  function syncTextControls() {
    const current = getCurrentLayer()
    const textarea = root.querySelector('[data-role="text-content"]')
    const sizeInput = root.querySelector('[data-role="text-size"]')
    const colorInput = root.querySelector('[data-role="text-color"]')
    const fontSelect = root.querySelector('[data-role="text-font"]')
    const opacityInput = root.querySelector('[data-role="text-opacity"]')
    const charSpacingInput = root.querySelector('[data-role="text-char-spacing"]')
    const lineHeightInput = root.querySelector('[data-role="text-line-height"]')
    const strokeColorInput = root.querySelector('[data-role="text-stroke-color"]')
    const strokeWidthInput = root.querySelector('[data-role="text-stroke-width"]')
    const backgroundEnabledInput = root.querySelector('[data-role="text-background-enabled"]')
    const backgroundColorInput = root.querySelector('[data-role="text-background-color"]')
    const buttons = [
      '[data-role="text-bold"]',
      '[data-role="text-italic"]',
      '[data-role="align-left"]',
      '[data-role="align-center"]',
      '[data-role="align-right"]',
    ].map((selector) => root.querySelector(selector))
    const isText = !!current && current.kind === 'text'
    const isEditableText = isText && !current.locked
    textarea.disabled = !isEditableText
    sizeInput.disabled = !isEditableText
    colorInput.disabled = !isEditableText
    fontSelect.disabled = !isEditableText
    opacityInput.disabled = !isEditableText
    charSpacingInput.disabled = !isEditableText
    lineHeightInput.disabled = !isEditableText
    strokeColorInput.disabled = !isEditableText
    strokeWidthInput.disabled = !isEditableText
    backgroundEnabledInput.disabled = !isEditableText
    backgroundColorInput.disabled = !isEditableText || !backgroundEnabledInput.checked
    buttons.forEach((button) => { button.disabled = !isEditableText })
    syncLayerActionButtons()
    if (!isText) {
      textarea.value = ''
      sizeInput.value = '52'
      colorInput.value = '#111827'
      fontSelect.value = 'Inter'
      opacityInput.value = '1'
      charSpacingInput.value = '0'
      lineHeightInput.value = '1.2'
      strokeColorInput.value = '#111827'
      strokeWidthInput.value = '0'
      backgroundEnabledInput.checked = false
      backgroundColorInput.value = '#ffffff'
      backgroundColorInput.disabled = true
      buttons.forEach((button) => button.classList.remove('is-active'))
      return
    }
    textarea.value = current.text || ''
    sizeInput.value = String(current.fontSize || 52)
    colorInput.value = normalizeColor(current.fill, '#111827')
    fontSelect.value = current.fontFamily || 'Inter'
    opacityInput.value = String(current.opacity == null ? 1 : current.opacity)
    charSpacingInput.value = String(current.charSpacing || 0)
    lineHeightInput.value = String(current.lineHeight || 1.2)
    strokeColorInput.value = normalizeColor(current.stroke, '#111827')
    strokeWidthInput.value = String(current.strokeWidth || 0)
    backgroundEnabledInput.checked = !!current.textBackgroundColor
    backgroundColorInput.value = normalizeColor(current.textBackgroundColor, '#ffffff')
    backgroundColorInput.disabled = !isEditableText || !backgroundEnabledInput.checked
    root.querySelector('[data-role="text-bold"]').classList.toggle('is-active', current.fontWeight === '700')
    root.querySelector('[data-role="text-italic"]').classList.toggle('is-active', current.fontStyle === 'italic')
    root.querySelector('[data-role="align-left"]').classList.toggle('is-active', current.textAlign === 'left')
    root.querySelector('[data-role="align-center"]').classList.toggle('is-active', current.textAlign === 'center')
    root.querySelector('[data-role="align-right"]').classList.toggle('is-active', current.textAlign === 'right')
  }

  function updateCurrentLayer(mutator) {
    const layers = getLayers(state.activePartName)
    const current = layers.find((layer) => layer.id === state.activeLayerId)
    if (!current) return
    mutator(current)
    renderLayerList()
    syncTextControls()
    resetPreparedCartPayload()
  }

  function moveLayer(direction) {
    const layers = getLayers(state.activePartName)
    const index = layers.findIndex((layer) => layer.id === state.activeLayerId)
    if (index < 0) return false
    const targetIndex = direction(index, layers.length)
    if (targetIndex === index || targetIndex < 0 || targetIndex >= layers.length) {
      return false
    }
    const [layer] = layers.splice(index, 1)
    layers.splice(targetIndex, 0, layer)
    renderLayerList()
    syncTextControls()
    resetPreparedCartPayload()
    return true
  }

  function moveLayerByIds(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return false
    const layers = getLayers(state.activePartName)
    const displayIds = [...layers].reverse().map((layer) => layer.id)
    const sourceIndex = displayIds.indexOf(sourceId)
    const targetIndex = displayIds.indexOf(targetId)
    if (sourceIndex < 0 || targetIndex < 0) return false
    const [movedId] = displayIds.splice(sourceIndex, 1)
    const insertAt = targetIndex
    displayIds.splice(insertAt, 0, movedId)
    const nextLayers = [...displayIds]
      .reverse()
      .map((id) => layers.find((layer) => layer.id === id))
      .filter(Boolean)
    if (nextLayers.length !== layers.length) return false
    getPartState(state.activePartName).layers = nextLayers
    renderLayerList()
    syncTextControls()
    resetPreparedCartPayload()
    return true
  }

  function getCanvas() {
    return state.fabricCanvas
  }

  function getActiveCanvasObject() {
    const canvas = getCanvas()
    return canvas ? canvas.getActiveObject() : null
  }

  function syncCanvasSelectionDestination(active) {
    if (!active || !active.layerId) return
    if (active.layerKind === 'text') {
      state.ui.activeSidebarTab = 'text'
      syncSidebarPanels()
      return
    }
    scrollActiveLayerIntoView()
  }

  async function loadGuideOverlay(src) {
    const resolvedSrc = resolveAssetUrl(src)
    if (isSvgAsset(resolvedSrc)) {
      const parsed = await loadSVGFromURL(resolvedSrc, undefined, { crossOrigin: 'anonymous' })
      const objects = parsed.objects.filter(Boolean)
      return fabricUtil.groupSVGElements(objects, parsed.options)
    }
    return await FabricImage.fromURL(resolvedSrc, { crossOrigin: 'anonymous' })
  }

  async function addGuideAndMask(canvas, part) {
    const bottomAssetUrl = part.svg_url || part.guide_url
    if (bottomAssetUrl) {
      try {
        const guide = await loadGuideOverlay(bottomAssetUrl)
        guide.set({
          left: GUIDE_OFFSET,
          top: GUIDE_OFFSET,
          selectable: false,
          evented: false,
          opacity: 0.42,
        })
        guide.scaleToWidth(GUIDE_SIZE)
        guide.scaleToHeight(GUIDE_SIZE)
        canvas.add(guide)
      } catch (error) {
        // ignore asset load failure
      }
    }

    if (part.cutout_url) {
      try {
        const mask = await loadGuideOverlay(part.cutout_url)
        mask.set({
          left: GUIDE_OFFSET,
          top: GUIDE_OFFSET,
          selectable: false,
          evented: false,
        })
        mask.scaleToWidth(GUIDE_SIZE)
        mask.scaleToHeight(GUIDE_SIZE)
        canvas.add(mask)
      } catch (error) {
        // ignore asset load failure
      }
    }
  }

  async function drawScene() {
    const canvas = getCanvas()
    const part = getActivePart()
    if (!canvas || !part) return
    const currentToken = ++state.drawToken
    const isCurrent = () => currentToken === state.drawToken
    const preservedActiveLayerId = state.activeLayerId
    state.suspendSelectionSync = true
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.add(new Rect({
      left: 32,
      top: 32,
      width: 656,
      height: 656,
      rx: 24,
      ry: 24,
      fill: '#f8fafc',
      stroke: '#dbe3f0',
      strokeWidth: 2,
      selectable: false,
    }))
    canvas.add(new Rect({
      left: GUIDE_OFFSET,
      top: GUIDE_OFFSET,
      width: GUIDE_SIZE,
      height: GUIDE_SIZE,
      rx: 18,
      ry: 18,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeDashArray: [10, 10],
      selectable: false,
    }))
    await addGuideAndMask(canvas, part)
    if (!isCurrent()) {
      state.suspendSelectionSync = false
      return
    }

    const layers = getLayers(part.part_name)
    let activeObject = null
    for (const layer of layers) {
      if (layer.hidden) continue
      if (layer.kind === 'image') {
        try {
          const overlay = await FabricImage.fromURL(layer.src, { crossOrigin: 'anonymous' })
          if (!isCurrent()) {
            state.suspendSelectionSync = false
            return
          }
          overlay.set({
            left: layer.left,
            top: layer.top,
            angle: layer.angle,
            scaleX: layer.scaleX,
            scaleY: layer.scaleY,
            opacity: layer.opacity == null ? 1 : layer.opacity,
            originX: 'center',
            originY: 'center',
            cornerColor: '#4f46e5',
            borderColor: '#4f46e5',
            transparentCorners: false,
            lockScalingFlip: true,
            visible: !layer.hidden,
            selectable: !layer.locked,
            evented: !layer.locked,
            lockMovementX: !!layer.locked,
            lockMovementY: !!layer.locked,
            lockRotation: !!layer.locked,
            lockScalingX: !!layer.locked,
            lockScalingY: !!layer.locked,
            hasControls: !layer.locked,
            hasBorders: !layer.locked,
          })
          overlay.partKey = part.part_name
          overlay.layerId = layer.id
          overlay.layerKind = layer.kind
          canvas.add(overlay)
          if (state.activeLayerId === layer.id && !layer.locked) activeObject = overlay
        } catch (error) {
          // ignore single layer failures
        }
        continue
      }

      const overlay = new Textbox(layer.text, {
        left: layer.left,
        top: layer.top,
        angle: layer.angle,
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        width: layer.width,
        fontSize: layer.fontSize,
        fill: layer.fill,
        fontFamily: layer.fontFamily || 'Inter',
        opacity: layer.opacity == null ? 1 : layer.opacity,
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
        textAlign: layer.textAlign,
        charSpacing: layer.charSpacing || 0,
        lineHeight: layer.lineHeight || 1.2,
        stroke: layer.stroke || undefined,
        strokeWidth: layer.strokeWidth || 0,
        textBackgroundColor: layer.textBackgroundColor || undefined,
        originX: 'center',
        originY: 'center',
        cornerColor: '#4f46e5',
        borderColor: '#4f46e5',
        transparentCorners: false,
        editable: !layer.locked,
        lockScalingFlip: true,
        selectable: !layer.locked,
        evented: !layer.locked,
        lockMovementX: !!layer.locked,
        lockMovementY: !!layer.locked,
        lockRotation: !!layer.locked,
        lockScalingX: !!layer.locked,
        lockScalingY: !!layer.locked,
        hasControls: !layer.locked,
        hasBorders: !layer.locked,
      })
      overlay.partKey = part.part_name
      overlay.layerId = layer.id
      overlay.layerKind = layer.kind
      canvas.add(overlay)
      if (state.activeLayerId === layer.id && !layer.locked) activeObject = overlay
    }

    if (activeObject) {
      canvas.setActiveObject(activeObject)
    } else if (preservedActiveLayerId && layers.some((layer) => layer.id === preservedActiveLayerId)) {
      state.activeLayerId = preservedActiveLayerId
    }
    state.suspendSelectionSync = false
    canvas.renderAll()
    renderLayerList()
    syncTextControls()
  }

  async function addArtwork(file) {
    const part = getActivePart()
    if (!part) return
    const src = await readFileAsDataUrl(file)
    await addArtworkFromSource(src)
  }

  async function addArtworkFromSource(src) {
    const part = getActivePart()
    if (!part) return
    const resolvedSrc = resolveAssetUrl(src)
    let initialScale = 0.45
    try {
      const image = await loadImage(resolvedSrc)
      const maxWidth = GUIDE_SIZE * ARTWORK_FIT_RATIO
      const maxHeight = GUIDE_SIZE * ARTWORK_FIT_RATIO
      const fitScale = Math.min(maxWidth / Math.max(image.width, 1), maxHeight / Math.max(image.height, 1), 1)
      if (Number.isFinite(fitScale) && fitScale > 0) {
        initialScale = fitScale
      }
    } catch (error) {
      // keep fallback
    }
    const layer = {
      id: createLayerId(part.part_name),
      kind: 'image',
      src: resolvedSrc,
      left: STAGE_SIZE / 2,
      top: STAGE_SIZE / 2,
      scaleX: initialScale,
      scaleY: initialScale,
      angle: 0,
      opacity: 1,
      locked: false,
      hidden: false,
    }
    getLayers(part.part_name).push(layer)
    state.activeLayerId = layer.id
    resetPreparedCartPayload()
    await drawScene()
  }

  async function loadArtworkCategories() {
    try {
      const payload = await request('/artworks/categories/tree')
      state.artwork.categories = Array.isArray(payload.records) ? payload.records : []
      populateArtworkCategories()
    } catch (error) {
      state.artwork.categories = []
      populateArtworkCategories()
    }
  }

  async function loadArtworkLicenses() {
    try {
      const payload = await request('/artworks/licenses')
      state.artwork.licenses = Array.isArray(payload.records) ? payload.records : []
      state.artwork.licenseMap = Object.fromEntries(state.artwork.licenses
        .filter((item) => item && item.artwork_id)
        .map((item) => [item.artwork_id, item]))
    } catch (error) {
      state.artwork.licenses = []
      state.artwork.licenseMap = {}
    }
  }

  async function loadArtworks() {
    state.artwork.loading = true
    renderArtworkList()
    try {
      const query = new URLSearchParams()
      query.set('scope', state.artwork.scope || 'platform')
      query.set('page', String(state.artwork.page || 1))
      query.set('size', String(state.artwork.size || 8))
      if (state.artwork.categoryId) query.set('category_id', state.artwork.categoryId)
      if (state.artwork.keyword) query.set('keyword', state.artwork.keyword)
      const payload = await request(`/artworks?${query.toString()}`)
      state.artwork.records = Array.isArray(payload.records) ? payload.records : []
      state.artwork.total = Number(payload.total || state.artwork.records.length || 0)
      state.artwork.page = Number(payload.page || state.artwork.page || 1)
      state.artwork.size = Number(payload.size || state.artwork.size || 8)
      state.artwork.licenseMap = Object.fromEntries((state.artwork.licenses || [])
        .filter((item) => item && item.artwork_id)
        .map((item) => [item.artwork_id, item]))
    } catch (error) {
      state.artwork.records = []
      setStatus(error.message || 'Unable to load artwork.', true)
    } finally {
      state.artwork.loading = false
      renderArtworkList()
      renderArtworkPagination()
    }
  }

  async function purchaseArtwork(artworkId) {
    if (!artworkId) return
    state.artwork.purchasingId = artworkId
    renderArtworkList()
    try {
      await request(`/artworks/${encodeURIComponent(artworkId)}/purchase`, { method: 'POST' })
      await loadArtworkLicenses()
      await loadArtworks()
      setStatus('Artwork unlocked and ready to use.')
    } catch (error) {
      setStatus(error.message || 'Unable to unlock artwork.', true)
    } finally {
      state.artwork.purchasingId = ''
      renderArtworkList()
    }
  }

  async function addText() {
    const part = getActivePart()
    if (!part) return
    const layer = {
      id: createLayerId(part.part_name),
      kind: 'text',
      left: STAGE_SIZE / 2,
      top: STAGE_SIZE / 2,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      text: 'New text',
      fontSize: 52,
      fontFamily: 'Inter',
      opacity: 1,
      fill: '#111827',
      fontWeight: '700',
      fontStyle: 'normal',
      textAlign: 'center',
      charSpacing: 0,
      lineHeight: 1.2,
      stroke: '',
      strokeWidth: 0,
      textBackgroundColor: '',
      width: 340,
      locked: false,
      hidden: false,
    }
    getLayers(part.part_name).push(layer)
    state.activeLayerId = layer.id
    resetPreparedCartPayload()
    await drawScene()
  }

  async function scaleActive(factor) {
    if (!getCurrentLayer() || getCurrentLayer().locked) return
    updateCurrentLayer((layer) => {
      layer.scaleX = Math.max(0.1, layer.scaleX * factor)
      layer.scaleY = Math.max(0.1, layer.scaleY * factor)
    })
    await drawScene()
  }

  async function rotateActive(delta) {
    if (!getCurrentLayer() || getCurrentLayer().locked) return
    updateCurrentLayer((layer) => {
      layer.angle += delta
    })
    await drawScene()
  }

  async function reorderActive(type) {
    if (!getCurrentLayer() || getCurrentLayer().locked) return
    let changed = false
    if (type === 'forward') {
      changed = moveLayer((index, length) => Math.min(length - 1, index + 1))
    } else if (type === 'backward') {
      changed = moveLayer((index) => Math.max(0, index - 1))
    } else if (type === 'front') {
      changed = moveLayer((index, length) => length - 1)
    } else if (type === 'back') {
      changed = moveLayer(() => 0)
    }
    if (changed) {
      await drawScene()
    }
  }

  async function removeActive() {
    const part = getActivePart()
    if (!part || !state.activeLayerId || (getCurrentLayer() && getCurrentLayer().locked)) return
    const next = getLayers(part.part_name).filter((layer) => layer.id !== state.activeLayerId)
    getPartState(part.part_name).layers = next
    state.activeLayerId = next.length ? next[next.length - 1].id : ''
    resetPreparedCartPayload()
    await drawScene()
  }

  async function duplicateActive() {
    const part = getActivePart()
    const current = getCurrentLayer()
    if (!part || !current) return
    const copy = JSON.parse(JSON.stringify(current))
    copy.id = createLayerId(part.part_name)
    copy.left = Number(copy.left || STAGE_SIZE / 2) + 24
    copy.top = Number(copy.top || STAGE_SIZE / 2) + 24
    copy.hidden = false
    copy.locked = false
    getLayers(part.part_name).push(copy)
    state.activeLayerId = copy.id
    resetPreparedCartPayload()
    await drawScene()
  }

  async function toggleLockActive() {
    if (!getCurrentLayer()) return
    updateCurrentLayer((layer) => {
      layer.locked = !layer.locked
    })
    await drawScene()
  }

  async function toggleHiddenActive() {
    if (!getCurrentLayer()) return
    updateCurrentLayer((layer) => {
      layer.hidden = !layer.hidden
    })
    await drawScene()
  }

  function partHasContent(partName) {
    return getLayers(partName).length > 0
  }

  async function buildPartPayload() {
    const output = []
    const explicitSize = parseSizeToken(root.querySelector('[data-role="output-size"]').value)
    const width = explicitSize ? explicitSize.width : 1200
    const height = explicitSize ? explicitSize.height : 1200

    for (const part of getParts()) {
      const layers = getLayers(part.part_name)
      if (!layers.length) continue
      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const exportCanvas = new StaticCanvas(offscreen, {
        width,
        height,
        backgroundColor: 'transparent',
        enableRetinaScaling: false,
      })
      const xScale = width / STAGE_SIZE
      const yScale = height / STAGE_SIZE
      for (const layer of layers) {
        if (layer.hidden) continue
        if (layer.kind === 'image') {
          const artwork = await FabricImage.fromURL(layer.src, { crossOrigin: 'anonymous' })
          artwork.set({
            left: layer.left * xScale,
            top: layer.top * yScale,
            angle: layer.angle,
            scaleX: layer.scaleX * xScale,
            scaleY: layer.scaleY * yScale,
            opacity: layer.opacity == null ? 1 : layer.opacity,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          })
          exportCanvas.add(artwork)
          continue
        }
        exportCanvas.add(new Textbox(layer.text, {
          left: layer.left * xScale,
          top: layer.top * yScale,
          angle: layer.angle,
          scaleX: layer.scaleX * xScale,
          scaleY: layer.scaleY * yScale,
          width: layer.width * xScale,
          fontSize: layer.fontSize,
          fill: layer.fill,
          fontFamily: layer.fontFamily || 'Inter',
          opacity: layer.opacity == null ? 1 : layer.opacity,
          fontWeight: layer.fontWeight,
          fontStyle: layer.fontStyle,
          textAlign: layer.textAlign,
          charSpacing: layer.charSpacing || 0,
          lineHeight: layer.lineHeight || 1.2,
          stroke: layer.stroke || undefined,
          strokeWidth: layer.strokeWidth || 0,
          textBackgroundColor: layer.textBackgroundColor || undefined,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          editable: false,
        }))
      }
      exportCanvas.renderAll()
      output.push({
        name: part.part_name,
        data_url: exportCanvas.toDataURL({ format: 'png' }),
      })
      if (typeof exportCanvas.dispose === 'function') {
        exportCanvas.dispose()
      }
    }

    return output
  }

  function getDesignPayload() {
    return {
      template_id: state.selectedTemplateId,
      variation_id: state.variationId,
      selected_color: root.querySelector('[data-role="color"]').value,
      selected_view: root.querySelector('[data-role="view"]').value,
      output_size: root.querySelector('[data-role="output-size"]').value,
      compose_overrides: {},
      design_summary: {
        active_part: state.activePartName,
        parts: getParts()
          .filter((part) => partHasContent(part.part_name))
          .map((part) => ({
            part_name: part.part_name,
            layer_count: getLayers(part.part_name).length,
            layers: getLayers(part.part_name).map((layer) => ({
              kind: layer.kind,
              text: layer.kind === 'text' ? layer.text : '',
            })),
          })),
      },
      parts: [],
    }
  }

  function updatePreview(payload) {
    const previewImage = root.querySelector('[data-role="preview-image"]')
    const outputs = payload.job_results && Array.isArray(payload.job_results.outputs)
      ? payload.job_results.outputs
      : (payload.compose && Array.isArray(payload.compose.outputs) ? payload.compose.outputs : [])
    const first = outputs[0] || {}
    const previewUrl = first.preview_url || first.download_url || payload.compose.preview_url || ''
    previewImage.src = resolveAssetUrl(previewUrl)
  }

  async function persistLatestResult(payload, mode) {
    const outputs = payload.job_results && Array.isArray(payload.job_results.outputs)
      ? payload.job_results.outputs
      : (payload.compose && Array.isArray(payload.compose.outputs) ? payload.compose.outputs : [])
    const first = outputs[0] || {}
    const previewUrl = first.preview_url || payload.compose.preview_url || ''
    const downloadUrl = first.download_url || payload.compose.download_url || ''
    const size = first.size || root.querySelector('[data-role="output-size"]').value
    const color = first.selected_color || payload.compose.selected_color || root.querySelector('[data-role="color"]').value
    const view = first.selected_view || payload.compose.selected_view || root.querySelector('[data-role="view"]').value
    if (!previewUrl || !downloadUrl || !size || !color || !view) return

    // export 模式每次独立保存不覆盖,跳过 signature 去重
    if (mode !== 'export' && mode !== 'download_zip') {
      const signature = [mode, color, view, size, previewUrl, downloadUrl].join('|')
      if (state.results.lastSavedSignature === signature) return
      state.results.lastSavedSignature = signature
    }

    await request('/results', {
      method: 'POST',
      body: JSON.stringify({
        template_id: state.selectedTemplateId,
        variation_id: state.variationId,
        mode,
        color,
        view,
        size,
        file_path: payload.compose && payload.compose.job_id ? String(payload.compose.job_id) : previewUrl,
        preview_url: previewUrl,
        download_url: downloadUrl,
      }),
    })
    await refreshPreviewResults()
  }

  // 0.5.0: persistExportFromRecord / findCachedPreviewRecord 原服务于免费版批量 export
  // 三层循环。WP 免费版不允许内置批量执行代码(spec §WP Free Plugin Has No Hidden
  // Premium Code),整套批量逻辑下沉至独立 WP Pro 插件,免费版仅保留弹窗入口。

  async function submitDesign(mode) {
    try {
      setStatus(mode === 'prepare' ? 'Preparing design...' : 'Rendering preview...')
      const payload = getDesignPayload()
      payload.parts = await buildPartPayload()
      const response = await request(`/${mode === 'prepare' ? 'design' : 'preview'}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      updatePreview(response)
      if (mode === 'prepare' && response.cart_payload) {
        const hidden = document.querySelector(`input[name="${config.cartInputName}"]`)
        if (hidden) {
          hidden.value = JSON.stringify(response.cart_payload)
        }
        syncCartButtonState(true)
      }
      await persistLatestResult(response, mode)
      setStatus(mode === 'prepare' ? 'Design prepared. You can add this product to cart now.' : 'Preview updated.')
    } catch (error) {
      if (mode === 'prepare') {
        syncCartButtonState(false)
      }
      // 0.4.51: 402 = 平台租户 token 余额不足。WP 终端用户无能为力,
      // 必须由站点管理员去 Mockup100 控制台充值。弹独立 modal 而不是淹没在状态栏
      if (error && (error.status === 402 || error.errorCode === 'insufficient_tokens' || error.upstreamCode === 402)) {
        showInsufficientTokensModal(error.message)
        setStatus('', false)
        return
      }
      setStatus(error.message || 'Request failed.', true)
    }
  }

  // 0.4.51: 余额不足提示弹窗(管理员侧:平台租户 token 由站点持有人承担)
  function showInsufficientTokensModal(detailMessage) {
    let modal = document.getElementById('mockup100-insufficient-tokens-modal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'mockup100-insufficient-tokens-modal'
      modal.className = 'mockup100-modal-backdrop'
      modal.innerHTML = (
        '<div class="mockup100-modal" style="max-width:520px;padding:24px;">' +
          '<header style="margin-bottom:12px;"><h3 style="margin:0;font-size:18px;">Mockup100 服务暂不可用</h3></header>' +
          '<div style="line-height:1.6;color:#333;font-size:14px;">' +
            '<p style="margin:0 0 12px 0;"><strong>原因:</strong>平台租户的 token 余额已耗尽,无法继续生成预览/合成。</p>' +
            '<p style="margin:0 0 12px 0;"><strong>处理:</strong>请联系本站点管理员到 ' +
              '站点管理员恢复 Mockup100 服务配额后再试。</p>' +
            '<p style="margin:0;color:#888;font-size:12px;">提示:此费用由站点运营方承担,与您的购物结算无关。</p>' +
            (detailMessage ? '<p style="margin:12px 0 0 0;color:#999;font-size:11px;">技术详情:' + escapeHtml(String(detailMessage)) + '</p>' : '') +
          '</div>' +
          '<footer style="margin-top:18px;text-align:right;">' +
            '<button type="button" class="button button-primary" data-role="insufficient-tokens-close">我知道了</button>' +
          '</footer>' +
        '</div>'
      )
      document.body.appendChild(modal)
      modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.dataset.role === 'insufficient-tokens-close') {
          modal.hidden = true
        }
      })
    }
    modal.hidden = false
  }

  function syncSelectionFromCanvas() {
    if (state.suspendSelectionSync) return
    const active = getActiveCanvasObject()
    state.activeLayerId = active && active.layerId ? active.layerId : ''
    renderLayerList()
    syncTextControls()
    syncCanvasSelectionDestination(active)
  }

  function clampObjectToGuide(target) {
    if (!target) return
    target.setCoords()
    let bounds = target.getBoundingRect()
    if (bounds.width > GUIDE_SIZE || bounds.height > GUIDE_SIZE) {
      const widthRatio = GUIDE_SIZE / Math.max(bounds.width, 1)
      const heightRatio = GUIDE_SIZE / Math.max(bounds.height, 1)
      const nextRatio = Math.min(widthRatio, heightRatio, 1)
      target.scaleX = Math.max(0.1, (target.scaleX || 1) * nextRatio)
      target.scaleY = Math.max(0.1, (target.scaleY || 1) * nextRatio)
      target.setCoords()
      bounds = target.getBoundingRect()
    }
    let nextLeft = target.left
    let nextTop = target.top
    const minX = GUIDE_OFFSET
    const minY = GUIDE_OFFSET
    const maxX = GUIDE_OFFSET + GUIDE_SIZE
    const maxY = GUIDE_OFFSET + GUIDE_SIZE

    if (bounds.left < minX) {
      nextLeft += minX - bounds.left
    }
    if (bounds.top < minY) {
      nextTop += minY - bounds.top
    }
    if (bounds.left + bounds.width > maxX) {
      nextLeft -= (bounds.left + bounds.width) - maxX
    }
    if (bounds.top + bounds.height > maxY) {
      nextTop -= (bounds.top + bounds.height) - maxY
    }
    target.set({
      left: nextLeft,
      top: nextTop,
    })
    target.setCoords()
  }

  function registerCanvasEvents() {
    const canvas = getCanvas()
    if (!canvas) return
    canvas.on('selection:created', syncSelectionFromCanvas)
    canvas.on('selection:updated', syncSelectionFromCanvas)
    canvas.on('selection:cleared', syncSelectionFromCanvas)
    canvas.on('mouse:down', (event) => {
      const target = event && event.target ? event.target : null
      if (!target || !target.layerId) return
      state.activeLayerId = target.layerId
      renderLayerList()
      syncTextControls()
      syncCanvasSelectionDestination(target)
    })
    canvas.on('mouse:dblclick', (event) => {
      const target = event && event.target ? event.target : null
      if (!target || target.layerKind !== 'text' || typeof target.enterEditing !== 'function') return
      state.activeLayerId = target.layerId || state.activeLayerId
      state.ui.activeSidebarTab = 'text'
      syncSidebarPanels()
      renderLayerList()
      syncTextControls()
      canvas.setActiveObject(target)
      target.enterEditing()
      if (typeof target.selectAll === 'function') {
        target.selectAll()
      }
      if (typeof canvas.requestRenderAll === 'function') {
        canvas.requestRenderAll()
      } else {
        canvas.renderAll()
      }
    })
    canvas.on('object:moving', (event) => {
      clampObjectToGuide(event.target)
    })
    canvas.on('object:scaling', (event) => {
      clampObjectToGuide(event.target)
    })
    canvas.on('object:rotating', (event) => {
      clampObjectToGuide(event.target)
    })
    canvas.on('text:changed', () => {
      const active = getActiveCanvasObject()
      if (!active || !active.layerId) return
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.text = active.text || layer.text
        layer.width = active.width || layer.width
        layer.fontSize = active.fontSize || layer.fontSize
        layer.charSpacing = active.charSpacing || 0
        layer.lineHeight = active.lineHeight || layer.lineHeight || 1.2
        layer.stroke = active.stroke || ''
        layer.strokeWidth = active.strokeWidth || 0
        layer.textBackgroundColor = active.textBackgroundColor || ''
      })
    })
    canvas.on('object:modified', () => {
      const active = getActiveCanvasObject()
      if (!active || !active.layerId) return
      clampObjectToGuide(active)
      updateCurrentLayer((layer) => {
        layer.left = active.getCenterPoint().x || layer.left
        layer.top = active.getCenterPoint().y || layer.top
        layer.scaleX = active.scaleX || layer.scaleX
        layer.scaleY = active.scaleY || layer.scaleY
        layer.angle = active.angle || layer.angle
        layer.opacity = active.opacity == null ? (layer.opacity == null ? 1 : layer.opacity) : active.opacity
        if (layer.kind === 'text' && typeof active.width === 'number') {
          layer.width = active.width
          layer.text = active.text || layer.text
          layer.fontSize = active.fontSize || layer.fontSize
          layer.charSpacing = active.charSpacing || 0
          layer.lineHeight = active.lineHeight || layer.lineHeight || 1.2
          layer.stroke = active.stroke || ''
          layer.strokeWidth = active.strokeWidth || 0
          layer.textBackgroundColor = active.textBackgroundColor || ''
        }
      })
    })
  }

  async function onKeydown(event) {
    if (!getCurrentLayer()) return
    if (getCurrentLayer().locked) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      await removeActive()
      return
    }
    if ((event.key === '+' || event.key === '=') && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      await scaleActive(1.1)
      return
    }
    if (event.key === '-') {
      event.preventDefault()
      await scaleActive(0.9)
      return
    }
    if (event.key.toLowerCase() === 'a') {
      event.preventDefault()
      await rotateActive(-15)
      return
    }
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault()
      await rotateActive(15)
    }
  }

  function initializeCanvas() {
    const canvasElement = root.querySelector('[data-role="canvas"]')
    const wrapper = root.querySelector('[data-role="canvas-frame"]')
    state.fabricCanvas = new Canvas(canvasElement, {
      backgroundColor: '#ffffff',
      width: STAGE_SIZE,
      height: STAGE_SIZE,
      preserveObjectStacking: true,
    })
    if (wrapper) {
      wrapper.style.width = `${STAGE_SIZE}px`
      wrapper.style.maxWidth = '100%'
    }
    const syncCanvasViewport = () => {
      if (!state.fabricCanvas || !canvasElement || !wrapper) return
      const availableWidth = Math.max(Math.min(wrapper.clientWidth || STAGE_SIZE, STAGE_SIZE), 320)
      const nextScale = availableWidth / STAGE_SIZE
      state.fabricCanvas.setDimensions({ width: STAGE_SIZE * nextScale, height: STAGE_SIZE * nextScale }, { cssOnly: true })
      if (typeof state.fabricCanvas.setZoom === 'function') {
        state.fabricCanvas.setZoom(nextScale)
      }
      state.fabricCanvas.calcOffset()
      if (typeof state.fabricCanvas.requestRenderAll === 'function') {
        state.fabricCanvas.requestRenderAll()
      } else {
        state.fabricCanvas.renderAll()
      }
    }
    syncCanvasViewport()
    window.addEventListener('resize', () => {
      if (state.stageResizeFrame) {
        window.cancelAnimationFrame(state.stageResizeFrame)
      }
      state.stageResizeFrame = window.requestAnimationFrame(() => {
        state.stageResizeFrame = 0
        syncCanvasViewport()
      })
    })
    registerCanvasEvents()
    window.addEventListener('keydown', onKeydown)
  }

  function attachUiEvents() {
    root.querySelector('[data-role="upload"]').addEventListener('click', () => root.querySelector('[data-role="file"]').click())
    root.querySelector('[data-role="file"]').addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0]
      if (!file) return
      await addArtwork(file)
      event.target.value = ''
    })
    root.querySelector('[data-role="add-text"]').addEventListener('click', () => addText())
    root.querySelector('[data-role="duplicate-layer"]').addEventListener('click', () => duplicateActive())
    root.querySelector('[data-role="lock-layer"]').addEventListener('click', () => toggleLockActive())
    root.querySelector('[data-role="hide-layer"]').addEventListener('click', () => toggleHiddenActive())
    root.querySelector('[data-role="remove-layer"]').addEventListener('click', () => removeActive())
    root.querySelector('[data-role="scale-up"]').addEventListener('click', () => scaleActive(1.1))
    root.querySelector('[data-role="scale-down"]').addEventListener('click', () => scaleActive(0.9))
    root.querySelector('[data-role="rotate-left"]').addEventListener('click', () => rotateActive(-15))
    root.querySelector('[data-role="rotate-right"]').addEventListener('click', () => rotateActive(15))
    root.querySelector('[data-role="bring-forward"]').addEventListener('click', () => reorderActive('forward'))
    root.querySelector('[data-role="send-backward"]').addEventListener('click', () => reorderActive('backward'))
    root.querySelector('[data-role="bring-front"]').addEventListener('click', () => reorderActive('front'))
    root.querySelector('[data-role="send-back"]').addEventListener('click', () => reorderActive('back'))
    root.querySelector('[data-role="preview"]').addEventListener('click', () => submitDesign('preview'))
    root.querySelector('[data-role="prepare"]').addEventListener('click', () => submitDesign('prepare'))
    root.querySelector('[data-role="save-draft"]').addEventListener('click', async () => {
      await saveDraft()
    })
    root.querySelector('[data-role="layer-list"]').addEventListener('click', async (event) => {
      const actionNode = event.target.closest('[data-action]')
      if (actionNode) {
        const layerId = actionNode.getAttribute('data-layer-id') || ''
        const action = actionNode.getAttribute('data-action')
        if (action === 'rename-layer') {
          // 重命名不应改变激活图层选择，避免 prompt 弹出后画布跳焦。
          await renameLayer(layerId)
          return
        }
        state.activeLayerId = layerId
        if (action === 'duplicate-layer') {
          await duplicateActive()
        } else if (action === 'lock-layer') {
          await toggleLockActive()
        } else if (action === 'hide-layer') {
          await toggleHiddenActive()
        } else if (action === 'select-layer') {
          await drawScene()
        }
        return
      }
      const row = event.target.closest('[data-layer-id]')
      if (!row) return
      state.activeLayerId = row.getAttribute('data-layer-id') || ''
      await drawScene()
    })
    root.querySelector('[data-role="layer-list"]').addEventListener('dragstart', (event) => {
      const row = event.target.closest('[data-layer-id]')
      if (!row) return
      state.dragLayerId = row.getAttribute('data-layer-id') || ''
      row.classList.add('is-dragging')
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
      }
    })
    root.querySelector('[data-role="layer-list"]').addEventListener('dragover', (event) => {
      const row = event.target.closest('[data-layer-id]')
      if (!row || !state.dragLayerId) return
      event.preventDefault()
      root.querySelectorAll('.mockup100-layer-row.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'))
      if (row.getAttribute('data-layer-id') !== state.dragLayerId) {
        row.classList.add('is-drop-target')
      }
    })
    root.querySelector('[data-role="layer-list"]').addEventListener('dragleave', (event) => {
      const row = event.target.closest('[data-layer-id]')
      if (row) row.classList.remove('is-drop-target')
    })
    root.querySelector('[data-role="layer-list"]').addEventListener('dragend', () => {
      state.dragLayerId = ''
      root.querySelectorAll('.mockup100-layer-row').forEach((node) => node.classList.remove('is-dragging', 'is-drop-target'))
    })
    root.querySelector('[data-role="layer-list"]').addEventListener('drop', async (event) => {
      const row = event.target.closest('[data-layer-id]')
      if (!row || !state.dragLayerId) return
      event.preventDefault()
      const targetId = row.getAttribute('data-layer-id') || ''
      const changed = moveLayerByIds(state.dragLayerId, targetId)
      state.dragLayerId = ''
      root.querySelectorAll('.mockup100-layer-row').forEach((node) => node.classList.remove('is-dragging', 'is-drop-target'))
      if (changed) {
        await drawScene()
      }
    })
    root.querySelectorAll('[data-role="sidebar-tab"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.ui.activeSidebarTab = button.getAttribute('data-tab') || 'template'
        syncSidebarPanels()
      })
    })
    root.querySelectorAll('[data-role="template-source"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.ui.templateSource = button.getAttribute('data-source') || 'all'
        state.ui.templatePage = 1
        renderTemplateLibrary()
      })
    })
    root.querySelector('[data-role="template-search"]').addEventListener('input', (event) => {
      state.ui.templateKeyword = event.target.value.trim()
      state.ui.templatePage = 1
      renderTemplateLibrary()
    })
    root.querySelector('[data-role="template-category"]').addEventListener('change', (event) => {
      state.ui.templateCategoryId = event.target.value || ''
      state.ui.templatePage = 1
      renderTemplateLibrary()
    })
    root.querySelector('[data-role="template-list"]').addEventListener('click', async (event) => {
      const tile = event.target.closest('[data-role="template-tile"]')
      if (!tile) return
      const nextTemplateId = tile.getAttribute('data-template-id') || ''
      if (!nextTemplateId || nextTemplateId === state.selectedTemplateId) return
      state.selectedTemplateId = nextTemplateId
      resetPreparedCartPayload()
      await reloadEditor()
    })
    root.querySelector('[data-role="template-prev"]').addEventListener('click', () => {
      state.ui.templatePage = Math.max(1, state.ui.templatePage - 1)
      renderTemplateLibrary()
    })
    root.querySelector('[data-role="template-next"]').addEventListener('click', () => {
      const { totalPages } = getTemplatePageState()
      state.ui.templatePage = Math.min(totalPages, state.ui.templatePage + 1)
      renderTemplateLibrary()
    })
    root.querySelector('[data-role="part"]').addEventListener('change', async (event) => {
      state.activePartName = event.target.value
      state.activeLayerId = ''
      resetPreparedCartPayload()
      await drawScene()
    })
    root.querySelector('[data-role="color"]').addEventListener('change', () => {
      resetPreparedCartPayload()
    })
    root.querySelector('[data-role="view"]').addEventListener('change', () => {
      resetPreparedCartPayload()
    })
    root.querySelector('[data-role="output-size"]').addEventListener('change', () => {
      resetPreparedCartPayload()
    })
    root.querySelector('[data-role="text-content"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.text = event.target.value
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-size"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.fontSize = Math.max(12, Number(event.target.value || 52))
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-color"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.fill = event.target.value
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-font"]').addEventListener('change', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.fontFamily = event.target.value
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-opacity"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.opacity = Number(event.target.value || 1)
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-char-spacing"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.charSpacing = Number(event.target.value || 0)
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-line-height"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.lineHeight = Math.max(0.8, Number(event.target.value || 1.2))
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-stroke-color"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.stroke = event.target.value
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-stroke-width"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.strokeWidth = Math.max(0, Number(event.target.value || 0))
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-background-enabled"]').addEventListener('change', async (event) => {
      const backgroundColor = root.querySelector('[data-role="text-background-color"]').value
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.textBackgroundColor = event.target.checked ? backgroundColor : ''
      })
      syncTextControls()
      await drawScene()
    })
    root.querySelector('[data-role="text-background-color"]').addEventListener('input', async (event) => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.textBackgroundColor = root.querySelector('[data-role="text-background-enabled"]').checked ? event.target.value : ''
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-bold"]').addEventListener('click', async () => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.fontWeight = layer.fontWeight === '700' ? '400' : '700'
      })
      await drawScene()
    })
    root.querySelector('[data-role="text-italic"]').addEventListener('click', async () => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.fontStyle = layer.fontStyle === 'italic' ? 'normal' : 'italic'
      })
      await drawScene()
    })
    root.querySelector('[data-role="align-left"]').addEventListener('click', async () => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.textAlign = 'left'
      })
      await drawScene()
    })
    root.querySelector('[data-role="align-center"]').addEventListener('click', async () => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.textAlign = 'center'
      })
      await drawScene()
    })
    root.querySelector('[data-role="align-right"]').addEventListener('click', async () => {
      updateCurrentLayer((layer) => {
        if (layer.kind !== 'text') return
        layer.textAlign = 'right'
      })
      await drawScene()
    })
    root.querySelector('[data-role="artwork-refresh"]').addEventListener('click', async () => {
      state.artwork.keyword = root.querySelector('[data-role="artwork-keyword"]').value.trim()
      state.artwork.page = 1
      await loadArtworks()
    })
    root.querySelector('[data-role="artwork-scope"]').addEventListener('change', async (event) => {
      state.artwork.scope = event.target.value || 'platform'
      state.artwork.page = 1
      await loadArtworks()
    })
    root.querySelector('[data-role="artwork-category"]').addEventListener('change', async (event) => {
      state.artwork.categoryId = event.target.value || ''
      state.artwork.page = 1
      await loadArtworks()
    })
    root.querySelector('[data-role="artwork-keyword"]').addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      state.artwork.keyword = event.target.value.trim()
      state.artwork.page = 1
      await loadArtworks()
    })
    root.querySelector('[data-role="artwork-prev"]').addEventListener('click', async () => {
      state.artwork.page = Math.max(1, state.artwork.page - 1)
      await loadArtworks()
    })
    root.querySelector('[data-role="artwork-next"]').addEventListener('click', async () => {
      const totalPages = Math.max(1, Math.ceil((state.artwork.total || 0) / Math.max(1, state.artwork.size || 8)))
      state.artwork.page = Math.min(totalPages, state.artwork.page + 1)
      await loadArtworks()
    })
    root.querySelector('[data-role="artwork-list"]').addEventListener('click', async (event) => {
      const actionNode = event.target.closest('[data-action][data-artwork-id]')
      if (!actionNode) return
      const artworkId = actionNode.getAttribute('data-artwork-id') || ''
      const selectedArtwork = state.artwork.records.find((item) => item.artwork_id === artworkId)
      if (!selectedArtwork) return
      if (actionNode.getAttribute('data-action') === 'buy-artwork') {
        await purchaseArtwork(artworkId)
        return
      }
      await addArtworkFromSource(selectedArtwork.original_url || selectedArtwork.preview_url || '')
      setStatus(`Inserted artwork: ${selectedArtwork.name || artworkId}`)
    })
    root.querySelector('[data-role="draft-list"]').addEventListener('click', async (event) => {
      const actionNode = event.target.closest('[data-action][data-draft-id]')
      if (!actionNode) return
      const draftId = actionNode.getAttribute('data-draft-id') || ''
      if (!draftId) return
      if (actionNode.getAttribute('data-action') === 'delete-draft') {
        await deleteDraft(draftId)
        return
      }
      await loadDraft(draftId)
    })
    root.querySelector('[data-role="refresh-results"]').addEventListener('click', async () => {
      await refreshPreviewResults()
      setStatus('Results refreshed.')
    })
    root.querySelector('[data-role="result-list"]').addEventListener('click', async (event) => {
      const actionNode = event.target.closest('[data-action="delete-result"][data-output-id]')
      if (!actionNode) return
      const outputId = actionNode.getAttribute('data-output-id') || ''
      if (!outputId) return
      state.results.deletingId = outputId
      renderResultList()
      try {
        await request(`/results/${encodeURIComponent(outputId)}`, {
          method: 'DELETE',
        })
        await refreshPreviewResults()
        setStatus('Result deleted.')
      } finally {
        state.results.deletingId = ''
        renderResultList()
      }
    })

    // === Modal triggers ===
    const openVPBtn = root.querySelector('[data-role="open-view-preview"]')
    if (openVPBtn) openVPBtn.addEventListener('click', () => openViewPreviewDialog())
    const openResultsBtn = root.querySelector('[data-role="open-results"]')
    if (openResultsBtn) openResultsBtn.addEventListener('click', () => openResultsDialog())

    // View Preview modal events
    const vpModal = root.querySelector('[data-role="view-preview-modal"]')
    if (vpModal) {
      vpModal.addEventListener('click', (event) => {
        if (event.target === vpModal) { closeViewPreviewDialog(); return }
        const closeBtn = event.target.closest('[data-role="close-view-preview"]')
        if (closeBtn) { closeViewPreviewDialog(); return }
        const prev = event.target.closest('[data-role="preview-prev"]')
        if (prev) { navigateViewPreview('prev'); return }
        const next = event.target.closest('[data-role="preview-next"]')
        if (next) { navigateViewPreview('next'); return }
        const colorBtn = event.target.closest('[data-action="preview-color"]')
        if (colorBtn) {
          state.viewPreview.activeColor = colorBtn.getAttribute('data-color') || ''
          const colorSelect = root.querySelector('[data-role="color"]')
          if (colorSelect) colorSelect.value = state.viewPreview.activeColor
          renderViewPreviewDialog()
          return
        }
        const viewBtn = event.target.closest('[data-action="preview-view"]')
        if (viewBtn) {
          state.viewPreview.activeView = viewBtn.getAttribute('data-view') || ''
          const viewSelect = root.querySelector('[data-role="view"]')
          if (viewSelect) viewSelect.value = state.viewPreview.activeView
          renderViewPreviewDialog()
        }
      })
    }

    // Results modal events
    const resultsModal = root.querySelector('[data-role="results-modal"]')
    if (resultsModal) {
      resultsModal.addEventListener('click', (event) => {
        if (event.target === resultsModal) { closeResultsDialog(); return }
        if (event.target.closest('[data-role="close-results"]')) { closeResultsDialog(); return }
        if (event.target.closest('[data-role="results-select-all"]')) { selectAllResults(); return }
        if (event.target.closest('[data-role="results-clear"]')) { clearResultsSelection(); return }
        if (event.target.closest('[data-role="results-download-selected"]')) { downloadSelectedResults(); return }
        if (event.target.closest('[data-stop-propagate="1"]')) return
        const zoomTarget = event.target.closest('[data-action="result-zoom"][data-output-id]')
        if (zoomTarget) {
          const url = zoomTarget.getAttribute('data-thumb-url') || ''
          const label = zoomTarget.getAttribute('data-thumb-label') || ''
          openResultLightbox(url, label)
          return
        }
        const checkbox = event.target.closest('input[data-action="result-toggle"][data-output-id]')
        if (checkbox) {
          const id = checkbox.getAttribute('data-output-id')
          if (id) {
            if (state.resultsModal.selectedIds.has(id)) state.resultsModal.selectedIds.delete(id)
            else state.resultsModal.selectedIds.add(id)
            renderResultsDialog()
          }
        }
      })
    }
    const lightboxModal = root.querySelector('[data-role="results-lightbox"]')
    if (lightboxModal) {
      lightboxModal.addEventListener('click', (event) => {
        if (event.target === lightboxModal) { closeResultLightbox(); return }
        if (event.target.closest('[data-role="close-results-lightbox"]')) { closeResultLightbox(); return }
      })
    }
  }

  function hydrateSelectors(payload) {
    const partSelect = root.querySelector('[data-role="part"]')
    const colorSelect = root.querySelector('[data-role="color"]')
    const viewSelect = root.querySelector('[data-role="view"]')
    const outputSizeSelect = root.querySelector('[data-role="output-size"]')
    const currentColor = colorSelect.value
    const currentView = viewSelect.value
    const currentOutputSize = outputSizeSelect.value

    populateSelect(partSelect, payload.editor.parts || [], (item) => item.part_name, (item) => item.part_label || item.part_name)
    setSelectValue(partSelect, [state.activePartName])
    populateSelect(colorSelect, payload.editor.colors || [], (item) => item.color_name || item.name || item, (item) => item.color_name || item.name || item)
    setSelectValue(colorSelect, [currentColor])
    populateSelect(viewSelect, payload.editor.views || [], (item) => item.view_name || item.name || item, (item) => item.view_name || item.name || item)
    setSelectValue(viewSelect, [currentView])
    const outputSizes = Array.isArray(payload.editor.export_sizes) && payload.editor.export_sizes.length
      ? payload.editor.export_sizes
      : (Array.isArray(payload.editor.supported_output_sizes) && payload.editor.supported_output_sizes.length
          ? payload.editor.supported_output_sizes
          : [payload.editor.default_output_size || payload.defaults.output_size])
    populateSelect(outputSizeSelect, outputSizes, (item) => item, (item) => item)
    setSelectValue(outputSizeSelect, [currentOutputSize, payload.editor.default_output_size, payload.defaults.output_size])
    state.artwork.scope = payload.artwork && payload.artwork.default_scope ? payload.artwork.default_scope : state.artwork.scope
    root.querySelector('[data-role="artwork-scope"]').value = state.artwork.scope
    root.querySelector('[data-role="artwork-keyword"]').value = state.artwork.keyword
    root.querySelector('[data-role="artwork-category"]').value = state.artwork.categoryId
    renderTemplateLibrary()
    syncSidebarPanels()
  }

  async function reloadEditor() {
    const query = new URLSearchParams()
    if (state.selectedTemplateId) query.set('template_id', state.selectedTemplateId)
    if (state.variationId) query.set('variation_id', String(state.variationId))
    const payload = await request(`/workspace?${query.toString()}`)
    state.binding = payload.binding
    state.editor = payload.editor
    state.selectedTemplateId = payload.selected_binding && payload.selected_binding.template_id
      ? payload.selected_binding.template_id
      : state.selectedTemplateId
    initializePartStates(payload.editor.parts || [])
    hydrateSelectors(payload)
    updateSelectedTemplateLabel(payload)
    const selectedBindingPreview = getSelectedBindingPreview(payload)
    if (selectedBindingPreview) {
      root.querySelector('[data-role="preview-image"]').src = selectedBindingPreview
    }
    applyArtworkBootstrap(payload)
    applyDraftBootstrap(payload)
    applyResultsBootstrap(payload)
    const activeDraft = state.drafts.records.find((item) => item.draft_id === state.drafts.activeDraftId)
    if (activeDraft && activeDraft.design_json) {
      const restored = restoreWorkspaceSnapshot(
        safeParseJson(activeDraft.design_json),
        safeParseJson(activeDraft.preferences_json || '{}')
      )
      if (restored) {
        setSelectValue(root.querySelector('[data-role="part"]'), [state.activePartName])
      }
    }
    await drawScene()
  }

  function hookVariationChanges() {
    const form = document.querySelector('form.variations_form')
    if (!form) return
    jQuery(form).on('found_variation', async function (_, variation) {
      state.variationId = Number((variation && variation.variation_id) || 0)
      resetPreparedCartPayload()
      await reloadEditor()
    })
    jQuery(form).on('reset_data', async function () {
      state.variationId = 0
      resetPreparedCartPayload()
      await reloadEditor()
    })
  }

  async function init() {
    createLayout()
    initializeCanvas()
    attachUiEvents()
    syncCartButtonState(false)
    setStatus('Loading template...')
    try {
      const query = new URLSearchParams()
      if (state.variationId) query.set('variation_id', String(state.variationId))
      const payload = await request(`/workspace${query.toString() ? `?${query.toString()}` : ''}`)
      state.binding = payload.binding
      state.editor = payload.editor
      state.selectedTemplateId = payload.selected_binding && payload.selected_binding.template_id
        ? payload.selected_binding.template_id
        : (payload.binding.bindings && payload.binding.bindings[0] ? payload.binding.bindings[0].template_id : '')
      initializePartStates(payload.editor.parts || [])
      hydrateSelectors(payload)
      updateSelectedTemplateLabel(payload)
      const selectedBindingPreview = getSelectedBindingPreview(payload)
      if (selectedBindingPreview) {
        root.querySelector('[data-role="preview-image"]').src = selectedBindingPreview
      }
      hookVariationChanges()
      applyArtworkBootstrap(payload)
      applyDraftBootstrap(payload)
      applyResultsBootstrap(payload)
      const activeDraft = state.drafts.records.find((item) => item.draft_id === state.drafts.activeDraftId)
      if (activeDraft && activeDraft.design_json) {
        restoreWorkspaceSnapshot(
          safeParseJson(activeDraft.design_json),
          safeParseJson(activeDraft.preferences_json || '{}')
        )
      }
      await drawScene()
      setStatus('Template loaded.')
    } catch (error) {
      setStatus(error.message || 'Unable to load template.', true)
    }
  }

  init()
})()
