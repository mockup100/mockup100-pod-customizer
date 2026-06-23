(function ($) {
  const PAGE_SIZE = 12
  const catalogState = {
    loaded: false,
    items: [],
  }
  const uiState = {}

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
  }

  function getTargetState(target) {
    if (!uiState[target]) {
      uiState[target] = {
        source: 'repository',
        page: 1,
        levels: ['', '', ''],
      }
    }
    return uiState[target]
  }

  function ensureTemplateMeta(item) {
    const path = String(item.category_path || item.category_id || '')
    const levels = path.split('/').map((part) => String(part || '').trim()).filter(Boolean).slice(0, 3)
    const coverUrl = item.cover_url
      || item.template_snapshot
      || item.preview_url
      || item.original_url
      || item.thumbnail_url
      || item.image_url
      || ''
    const coverDisplayUrl = item.cover_display_url
      || item.coverDisplayUrl
      || coverUrl
      || ''
    return {
      ...item,
      category_levels: levels,
      cover_url: String(coverUrl || ''),
      cover_display_url: String(coverDisplayUrl || ''),
      template_code: String(item.template_code || ''),
    }
  }

  function resolveBindingLabel(item) {
    return String(item.display_name || item.title || item.template_code || item.template_id || 'Template')
  }

  function resolveBindingCode(item) {
    return String(item.template_code || item.display_name || item.title || item.template_id || '')
  }

  function renderBindingCard(item, options = {}) {
    const label = resolveBindingLabel(item)
    const templateCode = resolveBindingCode(item)
    const templateId = String(item.template_id || '')
    const source = item.template_source === 'marketplace' ? 'Template Center' : 'My Templates'
    // 选中后 cover_display_url 在某些场景未保存,优先用 cover_display_url,回退 cover_url。
    const coverDisplayUrl = String(item.cover_display_url || item.cover_url || item.template_snapshot || '')
    const compactClass = options.compact ? ' is-compact' : ''
    const lockIcon = item.is_private
      ? '<span class="mockup100-binding-card__lock" title="Private template" aria-label="Private">\u{1F512}</span>'
      : ''
    const removable = options.removable
      ? `<button type="button" class="button-link-delete mockup100-remove-binding" data-binding-target="${escapeHtml(options.target || '')}" data-index="${Number(options.index || 0)}">Remove</button>`
      : ''
    const idLine = templateId && templateId !== templateCode
      ? `<span class="mockup100-binding-card__meta">Template ID: <code>${escapeHtml(templateId)}</code></span>`
      : ''
    const coverHtml = coverDisplayUrl
      ? `<img src="${escapeHtml(coverDisplayUrl)}" alt="${escapeHtml(label)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="mockup100-binding-card__fallback" style="display:none">No Image</span>`
      : '<span class="mockup100-binding-card__fallback">No Image</span>'

    return `
      <div class="mockup100-binding-card${compactClass}">
        <div class="mockup100-binding-card__cover">${coverHtml}${lockIcon}</div>
        <div class="mockup100-binding-card__body">
          <strong class="mockup100-binding-card__title">Linked template: ${escapeHtml(label)}</strong>
          <span class="mockup100-binding-card__code">Template code: <code>${escapeHtml(templateCode)}</code></span>
          ${idLine}
          <span class="mockup100-binding-card__meta">${escapeHtml(source)}</span>
          ${removable}
        </div>
      </div>
    `
  }

  function getHiddenInput(target) {
    if (target === 'product') {
      return $('#' + MOCKUP100_PRODUCT_BINDING.productBindingsMeta)
    }
    if (String(target).startsWith('list-')) {
      return $(`[data-binding-storage="${target}"]`)
    }
    const variationId = String(target).replace('variation-', '')
    return $(`input[name="${MOCKUP100_PRODUCT_BINDING.productBindingsMeta}_${variationId}"]`)
  }

  function getBindings(target) {
    const input = getHiddenInput(target)
    try {
      const parsed = JSON.parse(input.val() || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      return []
    }
  }

  function getSummaryRoot(target) {
    return $(`[data-binding-summary="${target}"]`)
  }

  function getSearchInput(target) {
    return $(`.mockup100-template-search[data-binding-target="${target}"]`)
  }

  function getResultsRoot(target) {
    return $(`[data-binding-results="${target}"]`)
  }

  function getStatusRoot(target) {
    return $(`[data-binding-status="${target}"]`)
  }

  function getPaginationRoot(target) {
    return $(`[data-binding-pagination="${target}"]`)
  }

  function getLevelSelect(target, level) {
    return $(`.mockup100-template-category-level[data-binding-target="${target}"][data-level="${level}"]`)
  }

  function getModal(target) {
    return $(`[data-binding-modal="${target}"]`)
  }

  function setBindings(target, bindings) {
    getHiddenInput(target).val(JSON.stringify(bindings))
    renderListSummary(target)
    renderBindingList(target)
    renderSummary(target)
  }

  function renderBindingList(target) {
    const $root = $(`[data-binding-list="${target}"]`)
    if (!$root.length) return
    const bindings = getBindings(target)
    if (!bindings.length) {
      $root.html('<div class="mockup100-binding-empty"><strong>No Mockup100 template linked yet.</strong><span>Bind one template to show its template code and preview image.</span></div>')
      return
    }
    $root.html(bindings.map((item, index) => renderBindingCard(item, {
      target,
      index,
      removable: true,
    })).join(''))
  }

  function renderListSummary(target) {
    const $root = $(`[data-binding-list-summary="${target}"]`)
    if (!$root.length) return
    const bindings = getBindings(target)
    if (!bindings.length) {
      $root.html('<div class="mockup100-binding-empty"><strong>No template linked</strong><span>Bind one Mockup100 template for this product.</span></div>')
      return
    }
    $root.html(renderBindingCard(bindings[0] || {}, { compact: true }))
  }

  function renderSummary(target) {
    const $root = getSummaryRoot(target)
    if (!$root.length) return
    const bindings = getBindings(target)
    if (!bindings.length) {
      $root.html('<div class="mockup100-binding-empty"><strong>No Mockup100 template linked yet.</strong><span>Bind one template to show its template code and preview image.</span></div>')
      return
    }
    $root.html(renderBindingCard(bindings[0] || {}))
  }

  function setStatus(target, message, isError) {
    const $root = getStatusRoot(target)
    if (!$root.length) return
    $root.text(message || '')
    $root.css('color', isError ? '#b91c1c' : '')
  }

  function loadCatalog() {
    if (catalogState.loaded) {
      return Promise.resolve(catalogState)
    }
    return fetch(MOCKUP100_PRODUCT_BINDING.restUrl, {
      headers: {
        'X-WP-Nonce': MOCKUP100_PRODUCT_BINDING.nonce,
      },
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`)
      }
      catalogState.items = (Array.isArray(payload.items) ? payload.items : []).map(ensureTemplateMeta)
      catalogState.loaded = true
      return catalogState
    })
  }

  function getAvailableLevelOptions(items, levelIndex, selectedLevels) {
    const options = new Set()
    items.forEach((item) => {
      const levels = item.category_levels || []
      const matchesParents = selectedLevels.slice(0, levelIndex).every((value, index) => !value || levels[index] === value)
      if (!matchesParents) return
      if (levels[levelIndex]) {
        options.add(levels[levelIndex])
      }
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }

  // 判定一个模板属于哪个 source 列表
  // - repository(My Templates): 当前 tenant 所拥有的(包括上架到 marketplace 的)
  // - marketplace(Template Center): 平台模版中心展示的全部 listed
  function matchSource(item, source) {
    if (source === 'marketplace') {
      return item.template_source === 'marketplace'
    }
    return Boolean(item.is_owner)
  }

  function renderCategoryLevels(target) {
    const state = getTargetState(target)
    const items = catalogState.items.filter((item) => matchSource(item, state.source))
    ;[1, 2, 3].forEach((level) => {
      const index = level - 1
      const $select = getLevelSelect(target, level)
      if (!$select.length) return
      const label = `Level ${level} Category`
      const values = getAvailableLevelOptions(items, index, state.levels)
      const previous = state.levels[index]
      const options = [`<option value="">${label}</option>`]
      values.forEach((value) => {
        options.push(`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      })
      $select.html(options.join(''))
      if (values.includes(previous)) {
        $select.val(previous)
      } else {
        state.levels[index] = ''
        $select.val('')
      }
    })
  }

  function filterItems(target) {
    const state = getTargetState(target)
    const keyword = normalizeText(getSearchInput(target).val())
    return catalogState.items.filter((item) => {
      if (!matchSource(item, state.source)) return false
      const levels = item.category_levels || []
      const matchesLevels = state.levels.every((value, index) => !value || levels[index] === value)
      if (!matchesLevels) return false
      if (!keyword) return true
      const haystack = normalizeText([
        item.template_id,
        item.template_code,
        item.display_name,
        item.title,
        item.category_path,
        item.template_source,
      ].join(' '))
      return haystack.includes(keyword)
    })
  }

  function renderPagination(target, totalItems) {
    const $root = getPaginationRoot(target)
    if (!$root.length) return
    const state = getTargetState(target)
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    if (state.page > totalPages) {
      state.page = totalPages
    }
    if (totalItems <= PAGE_SIZE) {
      $root.html('')
      return
    }
    $root.html(`
      <button type="button" class="button mockup100-page-button" data-binding-target="${target}" data-page-action="prev" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
      <span class="mockup100-page-label">Page ${state.page} / ${totalPages}</span>
      <button type="button" class="button mockup100-page-button" data-binding-target="${target}" data-page-action="next" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
    `)
  }

  function renderResults(target) {
    const $root = getResultsRoot(target)
    if (!$root.length) return
    const state = getTargetState(target)
    const items = filterItems(target)
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
    if (state.page > totalPages) {
      state.page = totalPages
    }
    const start = (state.page - 1) * PAGE_SIZE
    const pageItems = items.slice(start, start + PAGE_SIZE)
    if (!pageItems.length) {
      $root.html('<p>No enabled templates found for the current filters.</p>')
      renderPagination(target, 0)
      return
    }
    const currentBindings = getBindings(target).map((item) => String(item.template_id))
    const html = pageItems.map((item) => {
      const coverDisplayUrl = String(item.cover_display_url || item.cover_url || '')
      const cover = coverDisplayUrl
        ? `<img src="${escapeHtml(coverDisplayUrl)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />`
        : ''
      const sizes = Array.isArray(item.output_sizes) ? item.output_sizes.join(', ') : ''
      const category = item.category_path || item.category_id || ''
      const sourceLabel = state.source === 'marketplace' ? 'Template Center' : 'My Templates'
      const templateCode = item.template_code || item.template_id || ''
      const selected = currentBindings.includes(String(item.template_id))
      // private 模板覆盖物锁图标(仅 my templates,marketplace 显示 listed 状态)
      const lockIcon = item.is_private
        ? '<span class="mockup100-template-option__lock" title="Private template" aria-label="Private">\u{1F512}</span>'
        : ''
      return `
        <button type="button" class="button-link mockup100-template-option ${selected ? 'is-selected' : ''}"
          data-binding-target="${target}"
          data-template-id="${escapeHtml(item.template_id || '')}"
          data-template-code="${escapeHtml(item.template_code || '')}"
          data-template-source="${escapeHtml(item.template_source || '')}"
          data-template-label="${escapeHtml(item.display_name || item.title || '')}"
          data-template-snapshot="${escapeHtml(item.cover_url || '')}"
          data-template-cover-display="${escapeHtml(coverDisplayUrl)}"
          data-template-is-private="${item.is_private ? '1' : '0'}"
          data-template-output-sizes='${JSON.stringify(item.output_sizes || []).replace(/'/g, '&#39;')}'>
          <span class="mockup100-template-option__cover">${cover}${lockIcon}<span class="mockup100-template-option__fallback" ${coverDisplayUrl ? 'style="display:none"' : ''}>No Image</span></span>
          <span class="mockup100-template-option__meta">
            <strong>${escapeHtml(item.display_name || item.title || item.template_id || 'Template')}</strong>
            <code>${escapeHtml(templateCode)}</code>
            <small>${escapeHtml(sourceLabel)}</small>
            <small>${escapeHtml(category)}</small>
            <small>${escapeHtml(sizes)}</small>
          </span>
        </button>
      `
    }).join('')
    $root.html(html)
    renderPagination(target, items.length)
  }

  function refreshTarget(target, resetPage) {
    const state = getTargetState(target)
    if (resetPage) {
      state.page = 1
    }
    renderCategoryLevels(target)
    renderBindingList(target)
    renderResults(target)
  }

  function initializeTarget(target) {
    const $results = getResultsRoot(target)
    if ($results.length) {
      $results.html('<p>Loading templates...</p>')
    }
    loadCatalog()
      .then(() => {
        const bindings = getBindings(target)
        if (bindings.length) {
          const catalogMap = {}
          catalogState.items.forEach(function (item) {
            catalogMap[String(item.template_id || '')] = item
          })
          const merged = bindings.map(function (binding) {
            const tid = String(binding.template_id || '')
            const catalogEntry = catalogMap[tid]
            if (catalogEntry) {
              return Object.assign({}, binding, {
                template_code: binding.template_code || catalogEntry.template_code || '',
                cover_url: binding.cover_url || catalogEntry.cover_url || catalogEntry.template_snapshot || catalogEntry.preview_url || catalogEntry.original_url || catalogEntry.thumbnail_url || catalogEntry.image_url || '',
                cover_display_url: binding.cover_display_url || catalogEntry.cover_display_url || catalogEntry.coverDisplayUrl || catalogEntry.cover_url || '',
                display_name: binding.display_name || binding.title || catalogEntry.display_name || catalogEntry.title || tid,
              })
            }
            return binding
          })
          setBindings(target, merged)
        }
        renderListSummary(target)
        refreshTarget(target, true)
      })
      .catch(function (error) {
        if ($results.length) {
          $results.html('<p>' + escapeHtml(error.message || 'Template loading failed.') + '</p>')
        }
      })
  }

  function openModal(target) {
    const $modal = getModal(target)
    if (!$modal.length) return
    $modal.removeAttr('hidden')
    $('body').css('overflow', 'hidden')
    refreshTarget(target, false)
  }

  function closeModal(target) {
    const $modal = getModal(target)
    if (!$modal.length) return
    $modal.attr('hidden', 'hidden')
    $('body').css('overflow', '')
  }

  $(document).on('click', '.mockup100-open-binding-modal', function () {
    openModal(String($(this).data('binding-target') || ''))
  })

  $(document).on('click', '[data-binding-close]', function () {
    closeModal(String($(this).data('binding-close') || ''))
  })

  $(document).on('click', '.mockup100-source-tab', function () {
    const target = String($(this).data('binding-target') || '')
    const source = String($(this).data('template-source-filter') || 'repository')
    const state = getTargetState(target)
    state.source = source
    state.page = 1
    state.levels = ['', '', '']
    $(`.mockup100-source-tab[data-binding-target="${target}"]`).removeClass('is-active')
    $(this).addClass('is-active')
    refreshTarget(target, true)
  })

  $(document).on('click', '.mockup100-search-button', function () {
    refreshTarget(String($(this).data('binding-target') || ''), true)
  })

  $(document).on('change', '.mockup100-template-category-level', function () {
    const target = String($(this).data('binding-target') || '')
    const level = Number($(this).data('level') || 1)
    const state = getTargetState(target)
    state.levels[level - 1] = String($(this).val() || '')
    for (let index = level; index < 3; index += 1) {
      state.levels[index] = ''
    }
    refreshTarget(target, true)
  })

  $(document).on('keydown', '.mockup100-template-search', function (event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    refreshTarget(String($(this).data('binding-target') || ''), true)
  })

  $(document).on('click', '.mockup100-page-button', function () {
    const target = String($(this).data('binding-target') || '')
    const action = String($(this).data('page-action') || '')
    const state = getTargetState(target)
    state.page = Math.max(1, state.page + (action === 'next' ? 1 : -1))
    renderResults(target)
  })

  $(document).on('click', '.mockup100-template-option', function () {
    const $button = $(this)
    const target = String($button.data('binding-target'))
    const templateId = String($button.data('template-id') || '')
    if (!templateId) return
    const bindings = getBindings(target)
    const isSameSelection = bindings.length === 1 && String(bindings[0].template_id || '') === templateId
    const nextBindings = isSameSelection ? [] : [{
      template_id: templateId,
      template_code: String($button.data('template-code') || ''),
      template_source: String($button.data('template-source') || ''),
      title: String($button.data('template-label') || templateId),
      cover_url: String($button.data('template-snapshot') || ''),
      cover_display_url: String($button.data('template-cover-display') || $button.data('template-snapshot') || ''),
      is_private: String($button.data('template-is-private') || '0') === '1',
      output_sizes: JSON.parse(String($button.attr('data-template-output-sizes') || '[]')),
    }]
    setBindings(target, nextBindings)
    renderResults(target)
  })

  $(document).on('click', '.mockup100-remove-binding', function () {
    const target = String($(this).data('binding-target'))
    const index = Number($(this).data('index'))
    setBindings(target, getBindings(target).filter((_, itemIndex) => itemIndex !== index))
    renderResults(target)
  })

  $(document).on('click', '.mockup100-save-bindings', function () {
    const target = String($(this).data('binding-target'))
    const productId = Number($(this).data('product-id') || 0)
    if (!target || productId <= 0) return
    const $button = $(this)
    const bindings = getBindings(target)
    $button.prop('disabled', true)
    setStatus(target, 'Saving template binding...', false)
    fetch(`${MOCKUP100_PRODUCT_BINDING.saveRestBase}/${productId}/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': MOCKUP100_PRODUCT_BINDING.nonce,
      },
      body: JSON.stringify({ bindings, enabled: bindings.length > 0 }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.message || `HTTP ${response.status}`)
        }
        setBindings(target, Array.isArray(payload.bindings) ? payload.bindings : bindings)
        setStatus(target, bindings.length ? 'Template binding saved.' : 'Template binding removed.', false)
        closeModal(target)
      })
      .catch((error) => {
        setStatus(target, error.message || 'Failed to save template binding.', true)
      })
      .finally(() => {
        $button.prop('disabled', false)
      })
  })

  $(function () {
    initializeTarget('product')
    $('.mockup100-variation-bindings').each(function () {
      const name = $(this).attr('name') || ''
      const variationId = name.replace(`${MOCKUP100_PRODUCT_BINDING.productBindingsMeta}_`, '')
      if (variationId) initializeTarget(`variation-${variationId}`)
    })
    $('[data-binding-storage^="list-"]').each(function () {
      const target = String($(this).data('binding-storage') || '')
      if (target) initializeTarget(target)
    })
  })
})(jQuery)
