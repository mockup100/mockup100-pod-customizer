/* global mockup100Config */
(function () {
    'use strict';

    // 只同步外部服务状态展示，不在免费插件内做本地订阅/付费门槛拦截。

    var config = (typeof window !== 'undefined' && window.mockup100Config) || {};
    var panel = document.querySelector('[data-mockup100-token-panel]');
    if (!panel) {
        return;
    }

    var balanceEl = panel.querySelector('[data-token-balance]');
    var gradingEl = panel.querySelector('[data-grading-tier]');

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

    var restBase = String(config.restBase || '').replace(/\/+$/, '');
    if (!restBase) {
        setText(balanceEl, '—');
        setText(gradingEl, '—');
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
            var rawTier = data.platform_grading_sub_tier || data.platform_grading_sub || data.gradingTier || data.grading_tier || '';
            var tier = normalizeTier(rawTier);
            setText(balanceEl, tokenBalance);
            setText(gradingEl, describeGrading(tier));
        })
        .catch(function () {
            setText(balanceEl, '—');
            setText(gradingEl, '—');
        });
})();
