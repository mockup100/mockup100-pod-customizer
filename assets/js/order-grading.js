/**
 * 0.5.7: 后台订单详情页 Grading 入口前端控制脚本。
 *
 * 合规要点:
 *   - 第一次点击必须显式 confirm 同意框,告知"会把订单设计字段发送给
 *     https://www.mockup100.com Grading API",同意后才发起 AJAX,后端写入
 *     一次性 user_meta 记忆同意状态。
 *   - 若当前账号不可用该外部服务,SaaS 端返回 402 + subscription_required,本脚本
 *     渲染中性的 service-page 跳转按钮(在新标签里打开 mockup100.com),
 *     不在 wp-admin 里弹任何付款表单/license 校验。
 */
(function ($) {
    'use strict';

    var config = window.mockup100OrderGrading || null;
    if (!config || !config.restUrl) {
        return;
    }

    var i18n = config.i18n || {};
    var consentGiven = !!config.consentGiven;

    function getStatusEl(itemId) {
        return $('.mockup100-order-grading-status[data-item-id="' + itemId + '"]');
    }

    function buildEndpointUrl(orderId) {
        var base = String(config.restUrl || '').replace(/\/+$/, '');
        return base + '/' + encodeURIComponent(String(orderId)) + '/grading/compose';
    }

    function renderSubscriptionRequired(statusEl, message, subscriptionUrl) {
        statusEl.empty();
        var $msg = $('<div></div>')
            .css({ color: '#b32d2e', marginBottom: '4px' })
            .text(message || i18n.subscriptionRequired || 'This external service is not currently available.');
        statusEl.append($msg);
        if (subscriptionUrl) {
            var $link = $('<a></a>')
                .attr('href', subscriptionUrl)
                .attr('target', '_blank')
                .attr('rel', 'noopener')
                .addClass('button button-secondary')
                .text(i18n.subscribe || 'Open Mockup100 service page');
            statusEl.append($link);
        }
    }

    function renderSuccess(statusEl, payload) {
        statusEl.empty();
        var $ok = $('<div></div>')
            .css({ color: '#2271b1' })
            .text(i18n.success || 'Grading sizes generated.');
        statusEl.append($ok);
        if (payload && payload.result && typeof payload.result === 'object') {
            // 如果 SaaS 端返回了下载/查看链接,直接链出来,不在本地展开 zip。
            var url = payload.result.bundle_url || payload.result.download_url || payload.result.url || '';
            if (url) {
                var $download = $('<a></a>')
                    .attr('href', String(url))
                    .attr('target', '_blank')
                    .attr('rel', 'noopener')
                    .addClass('button button-secondary')
                    .css({ marginTop: '4px', display: 'inline-block' })
                    .text('Open Mockup100 result');
                statusEl.append($download);
            }
        }
    }

    function renderFailure(statusEl, message) {
        statusEl.empty();
        statusEl.append(
            $('<div></div>')
                .css({ color: '#b32d2e' })
                .text((i18n.failurePrefix || 'Grading failed: ') + (message || ''))
        );
    }

    function dispatch(orderId, itemId, statusEl) {
        statusEl.text(i18n.inProgress || 'Sending request to Mockup100 Grading…');
        $.ajax({
            url: buildEndpointUrl(orderId),
            method: 'POST',
            dataType: 'json',
            beforeSend: function (xhr) {
                if (config.nonce) {
                    xhr.setRequestHeader('X-WP-Nonce', String(config.nonce));
                }
                xhr.setRequestHeader('Accept', 'application/json');
            },
            data: {
                order_id: orderId,
                item_id: itemId,
                consent: 1
            }
        })
            .done(function (response) {
                renderSuccess(statusEl, response || {});
            })
            .fail(function (xhr) {
                var body = xhr && xhr.responseJSON ? xhr.responseJSON : null;
                var error = body && body.error ? String(body.error) : '';
                var message = body && body.message ? String(body.message) : ('HTTP ' + (xhr ? xhr.status : '?'));
                if (error === 'subscription_required' || (xhr && xhr.status === 402)) {
                    renderSubscriptionRequired(
                        statusEl,
                        message,
                        (body && body.subscription_url) || config.gradingSubscriptionUrl || ''
                    );
                    return;
                }
                renderFailure(statusEl, message);
            });
    }

    $(document).on('click', '.mockup100-order-grading-button', function (event) {
        event.preventDefault();
        var $btn = $(this);
        var orderId = parseInt($btn.attr('data-order-id'), 10) || 0;
        var itemId = parseInt($btn.attr('data-item-id'), 10) || 0;
        if (!orderId || !itemId) {
            return;
        }
        var statusEl = getStatusEl(itemId);

        if (!consentGiven) {
            // 第一次点击:浏览器原生 confirm 弹同意,文案明确告知出站目的地。
            var consentText = (i18n.consentTitle ? i18n.consentTitle + '\n\n' : '')
                + (i18n.consentBody || 'Send order data to Mockup100 Grading API?');
            // eslint-disable-next-line no-alert
            var agreed = window.confirm(consentText);
            if (!agreed) {
                return;
            }
            // 客户端立即记忆,避免同一个 wp-admin 会话每条 line item 重复弹窗。
            consentGiven = true;
        }

        dispatch(orderId, itemId, statusEl);
    });
})(jQuery);
