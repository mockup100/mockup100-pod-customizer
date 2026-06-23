/* global mockup100Config */
(function () {
    'use strict';

    // Source of Truth: spec lock-mockup100-final-pricing-products-scheme Task 7.4 —
    // 双端关闭入口。fetch /user/capabilities 后将 platform_grading_sub_tier 同步渲染到
    // [data-grading-tier]，并在 tier === "none" 时把 [data-grading-entry] 元素 disable。
    // tier 文案严格对齐 web console（none|standard|enterprise）。

    var config = (typeof window !== 'undefined' && window.mockup100Config) || {};
    var panel = document.querySelector('[data-mockup100-token-panel]');
    if (!panel) {
        return;
    }

    var balanceEl = panel.querySelector('[data-token-balance]');
    var proEl = panel.querySelector('[data-wp-pro-active]');
    var gradingEl = panel.querySelector('[data-grading-tier]');
    var gradingEntryEls = document.querySelectorAll('[data-grading-entry]');

    function setText(el, text) {
        if (el) {
            el.textContent = String(text);
        }
    }

    function describeBoolean(value) {
        return value ? 'Active' : 'Inactive';
    }

    function normalizeTier(tier) {
        var value = String(tier || '').toLowerCase();
        if (value === 'standard' || value === 'enterprise') return value;
        return 'none';
    }

    function describeGrading(tier) {
        var normalized = normalizeTier(tier);
        if (normalized === 'standard') return 'Standard';
        if (normalized === 'enterprise') return 'Enterprise';
        return 'Inactive';
    }

    /**
     * Spec Task 7.4: tier === "none" 时关闭所有 multi-size grading 工作流入口。
     * 仅作用于 [data-grading-entry] 标记的工作流按钮 —— 不影响订阅页跳转 CTA。
     */
    function applyGradingEntryGate(tier) {
        var locked = normalizeTier(tier) === 'none';
        for (var i = 0; i < gradingEntryEls.length; i++) {
            var el = gradingEntryEls[i];
            if (locked) {
                el.setAttribute('disabled', 'disabled');
                el.setAttribute('aria-disabled', 'true');
                el.setAttribute('data-grading-locked', '1');
                if (!el.getAttribute('data-grading-original-title')) {
                    el.setAttribute('data-grading-original-title', el.getAttribute('title') || '');
                }
                el.setAttribute('title', 'Multi-size grading requires an active subscription. Standard $9/month or Enterprise $19/month.');
            } else {
                el.removeAttribute('disabled');
                el.removeAttribute('aria-disabled');
                el.removeAttribute('data-grading-locked');
                var original = el.getAttribute('data-grading-original-title') || '';
                if (original) {
                    el.setAttribute('title', original);
                } else {
                    el.removeAttribute('title');
                }
            }
        }
    }

    var restBase = String(config.restBase || '').replace(/\/+$/, '');
    if (!restBase) {
        setText(balanceEl, '—');
        setText(proEl, '—');
        setText(gradingEl, '—');
        applyGradingEntryGate('none');
        return;
    }

    var url = restBase + '/user/capabilities';
    var headers = { 'Content-Type': 'application/json' };
    if (config.nonce) {
        headers['X-WP-Nonce'] = String(config.nonce);
    }

    fetch(url, { credentials: 'same-origin', headers: headers })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function (payload) {
            var data = (payload && payload.data) ? payload.data : payload || {};
            var tokenBalance = data.token_balance != null ? data.token_balance : (data.tokens != null ? data.tokens : '—');
            var wpProActive = !!(data.wp_pro_active || data.wpProActive);
            var rawTier = data.platform_grading_sub_tier || data.platform_grading_sub || data.gradingTier || data.grading_tier || '';
            var tier = normalizeTier(rawTier);
            setText(balanceEl, tokenBalance);
            setText(proEl, describeBoolean(wpProActive));
            setText(gradingEl, describeGrading(tier));
            applyGradingEntryGate(tier);
        })
        .catch(function () {
            setText(balanceEl, '—');
            setText(proEl, '—');
            setText(gradingEl, '—');
            applyGradingEntryGate('none');
        });
})();
