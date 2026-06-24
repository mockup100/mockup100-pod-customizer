<?php

if (! defined('ABSPATH')) {
    exit;
}

/**
 * 0.5.7：后台订单详情页 Grading 入口（合规版）。
 *
 * WordPress.org 审核合规要点（按 detailed-plugin-guidelines）：
 * - §6 "Phoning Home Without Disclosure"：按钮渲染本身不发出站请求；用户必须显式
 *   点击 + 第一次点击弹同意框，把"将订单设计字段发送至 https://www.mockup100.com 的
 *   Grading API"明确告知，确认后写入 user_meta 记忆同意状态。
 * - §8 "Hijacking the Admin"：不在 admin notice / dashboard 推销，仅在订单编辑页
 *   meta box 内提供功能入口；按钮文案为 "Generate Grading Sizes" 中性表述，未带
 *   锁图标 / 价格 / "Pro" 标签。
 * - §11 "Pay-to-Use Inside the Plugin"：插件本体所有功能（绑定、设计、加购、订单
 *   meta）免费；Grading 是 Mockup100 SaaS 上的订阅外部服务。本类不做任何本地 license
 *   key 校验，未订阅时直接由 SaaS 端返回 GRADING_SUBSCRIPTION_REQUIRED，前端引导
 *   到 mockup100.com/pricing#grading 完成订阅，所有计费均在 Mockup100 SaaS 侧发生。
 * - §10 "External Services Disclosure"：readme.txt == External Services == 段已
 *   披露此调用 + ToS / Privacy URL，本类的 dispatch 路径与披露内容一一对应。
 * - 站点级断开开关：Settings 页 OPTION_ORDER_GRADING_ENABLED 默认开启；管理员可
 *   随时关闭，关闭后 meta box 不渲染按钮，REST 路由也直接返回 disabled。
 */
class Mockup100_Order_Grading
{
    public const META_USER_CONSENT = '_mockup100_grading_external_consent';
    public const REST_NAMESPACE = 'mockup100/v1';
    public const REST_ROUTE = '/order/(?P<order_id>\d+)/grading/compose';
    public const META_BOX_ID = 'mockup100_order_grading';

    private Mockup100_Api_Proxy $api_proxy;
    private Mockup100_Settings $settings;

    public function __construct(Mockup100_Api_Proxy $api_proxy, Mockup100_Settings $settings)
    {
        $this->api_proxy = $api_proxy;
        $this->settings = $settings;
    }

    public function boot(): void
    {
        if (! class_exists('WooCommerce')) {
            return;
        }
        add_action('add_meta_boxes', [$this, 'register_meta_box']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_meta_box(): void
    {
        // 仅在站点管理员开启 Order Grading 功能开关时挂载 meta box,
        // 关闭后 wp-admin 订单页彻底看不到该入口,符合"可断开 SaaS 依赖"。
        if ((int) get_option(Mockup100_Settings::OPTION_ORDER_GRADING_ENABLED, 1) !== 1) {
            return;
        }

        $screens = ['shop_order'];
        // WC 8.0+ HPOS：订单存放于 wc_orders 表,编辑页 screen id 为 woocommerce_page_wc-orders
        if (function_exists('wc_get_page_screen_id')) {
            $hpos_screen = wc_get_page_screen_id('shop-order');
            if (is_string($hpos_screen) && $hpos_screen !== '') {
                $screens[] = $hpos_screen;
            }
        }
        foreach (array_unique($screens) as $screen) {
            add_meta_box(
                self::META_BOX_ID,
                __('Mockup100 Grading', 'mockup100-pod-customizer'),
                [$this, 'render_meta_box'],
                $screen,
                'side',
                'default'
            );
        }
    }

    /**
     * @param mixed $post_or_order WP_Post (legacy) 或 WC_Order (HPOS) 都要兼容。
     */
    public function render_meta_box($post_or_order): void
    {
        $order = $post_or_order instanceof WC_Order
            ? $post_or_order
            : (function_exists('wc_get_order') ? wc_get_order($post_or_order) : null);
        if (! $order instanceof WC_Order) {
            echo '<p>' . esc_html__('Order not available.', 'mockup100-pod-customizer') . '</p>';
            return;
        }

        $items_with_template = [];
        foreach ($order->get_items() as $item_id => $item) {
            $template_id = (string) $item->get_meta('mockup100_template_id', true);
            if ($template_id === '') {
                continue;
            }
            $items_with_template[] = [
                'item_id' => (int) $item_id,
                'template_id' => $template_id,
                'name' => (string) $item->get_name(),
            ];
        }

        $config = $this->settings->build_mockup100_config();
        $grading_url = isset($config['gradingSubscriptionUrl']) ? (string) $config['gradingSubscriptionUrl'] : '';

        // 第一段：合规披露文本(与 readme.txt == External Services == 一致),
        // 任何点击之前先让管理员看到"这是付费 SaaS 服务、点击后会上送哪些字段"。
        echo '<div class="mockup100-order-grading">';
        echo '<p class="description">';
        esc_html_e(
            'Generate size-graded pattern outputs for design layers in this order. Grading is an optional Mockup100 external service operated on mockup100.com and billed outside this plugin.',
            'mockup100-pod-customizer'
        );
        echo '</p>';
        echo '<p class="description">';
        esc_html_e(
            'Clicking the button will send this line item\'s design metadata (template id, part keys) to the Mockup100 Grading API at https://www.mockup100.com. The first click requests your explicit consent.',
            'mockup100-pod-customizer'
        );
        echo '</p>';
        if ($grading_url !== '') {
            echo '<p><a href="' . esc_url($grading_url) . '" target="_blank" rel="noopener">'
                . esc_html__('Service details (opens mockup100.com)', 'mockup100-pod-customizer')
                . '</a></p>';
        }

        if (empty($items_with_template)) {
            echo '<p>' . esc_html__('No Mockup100 design items in this order.', 'mockup100-pod-customizer') . '</p>';
            echo '</div>';
            return;
        }

        echo '<ul class="mockup100-order-grading-items">';
        foreach ($items_with_template as $entry) {
            echo '<li class="mockup100-order-grading-items__item">';
            echo '<div class="mockup100-order-grading-item__name">' . esc_html($entry['name']) . '</div>';
            echo '<button type="button" class="button button-secondary mockup100-order-grading-button"'
                . ' data-order-id="' . esc_attr((string) $order->get_id()) . '"'
                . ' data-item-id="' . esc_attr((string) $entry['item_id']) . '"'
                . ' data-template-id="' . esc_attr($entry['template_id']) . '">'
                . esc_html__('Generate Grading Sizes', 'mockup100-pod-customizer')
                . '</button>';
            echo '<div class="mockup100-order-grading-status" data-item-id="' . esc_attr((string) $entry['item_id']) . '"></div>';
            echo '</li>';
        }
        echo '</ul>';
        echo '</div>';
    }

    public function enqueue_admin_assets(string $hook): void
    {
        if ((int) get_option(Mockup100_Settings::OPTION_ORDER_GRADING_ENABLED, 1) !== 1) {
            return;
        }
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if (! $screen) {
            return;
        }
        $allowed = ['shop_order', 'edit-shop_order'];
        if (function_exists('wc_get_page_screen_id')) {
            $hpos = wc_get_page_screen_id('shop-order');
            if (is_string($hpos) && $hpos !== '') {
                $allowed[] = $hpos;
            }
        }
        if (! in_array($screen->id, $allowed, true)) {
            return;
        }

        $asset_base = MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL . 'assets/';
        $asset_dir = MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'assets/';
        $js_path = $asset_dir . 'js/order-grading.js';
        $js_ver = file_exists($js_path) ? (string) filemtime($js_path) : MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION;

        wp_enqueue_script(
            'mockup100-order-grading',
            $asset_base . 'js/order-grading.js',
            ['jquery'],
            $js_ver,
            true
        );
        if (! wp_style_is('mockup100-order-grading-admin', 'registered')) {
            wp_register_style('mockup100-order-grading-admin', false, [], MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION);
        }
        wp_enqueue_style('mockup100-order-grading-admin');
        wp_add_inline_style(
            'mockup100-order-grading-admin',
            '.mockup100-order-grading-items{margin:0;padding:0;list-style:none;}'
            . '.mockup100-order-grading-items__item{margin-bottom:12px;border-top:1px solid #e2e4e7;padding-top:8px;}'
            . '.mockup100-order-grading-item__name{font-weight:600;margin-bottom:4px;}'
            . '.mockup100-order-grading-status{margin-top:6px;font-size:12px;color:#50575e;}'
        );

        $config = $this->settings->build_mockup100_config();
        $current_uid = get_current_user_id();
        $consent_given = (int) get_user_meta($current_uid, self::META_USER_CONSENT, true) === 1;

        wp_localize_script('mockup100-order-grading', 'mockup100OrderGrading', [
            'restUrl' => esc_url_raw(rest_url(self::REST_NAMESPACE . '/order/')),
            'nonce' => wp_create_nonce('wp_rest'),
            'consentGiven' => $consent_given,
            'gradingSubscriptionUrl' => isset($config['gradingSubscriptionUrl']) ? (string) $config['gradingSubscriptionUrl'] : '',
            'externalEndpoint' => 'https://www.mockup100.com/api/v1/runtime/templates/{templateId}/grading/compose',
            'i18n' => [
                'consentTitle' => __('Send order design data to Mockup100 Grading?', 'mockup100-pod-customizer'),
                'consentBody' => __('To generate size-graded pattern outputs, this order line\'s design metadata (template id and part keys) will be sent to the Mockup100 Grading API at https://www.mockup100.com. Grading access is managed on mockup100.com, outside this plugin. You can revoke this consent at any time on the Mockup100 Settings page.', 'mockup100-pod-customizer'),
                'consentAccept' => __('I agree, generate now', 'mockup100-pod-customizer'),
                'consentCancel' => __('Cancel', 'mockup100-pod-customizer'),
                'subscribe' => __('Open Mockup100 service page', 'mockup100-pod-customizer'),
                'inProgress' => __('Sending request to Mockup100 Grading…', 'mockup100-pod-customizer'),
                'success' => __('Grading sizes generated. Open Mockup100 to download the bundle.', 'mockup100-pod-customizer'),
                'subscriptionRequired' => __('This optional Mockup100 Grading service is not currently available for this account.', 'mockup100-pod-customizer'),
                'failurePrefix' => __('Grading failed: ', 'mockup100-pod-customizer'),
            ],
        ]);
    }

    public function register_rest_routes(): void
    {
        register_rest_route(self::REST_NAMESPACE, self::REST_ROUTE, [
            'methods' => 'POST',
            'callback' => [$this, 'rest_dispatch_grading'],
            'permission_callback' => [$this, 'rest_permission_callback'],
            'args' => [
                'order_id' => ['required' => true, 'sanitize_callback' => 'absint'],
                'item_id' => ['required' => true, 'sanitize_callback' => 'absint'],
                'consent' => ['required' => true, 'sanitize_callback' => [$this, 'sanitize_bool_param']],
            ],
        ]);
    }

    public function sanitize_bool_param($value): int
    {
        return (! empty($value) && $value !== '0' && $value !== 'false') ? 1 : 0;
    }

    public function rest_permission_callback(WP_REST_Request $request): bool
    {
        unset($request);
        return current_user_can('edit_shop_orders');
    }

    public function rest_dispatch_grading(WP_REST_Request $request)
    {
        if ((int) get_option(Mockup100_Settings::OPTION_ORDER_GRADING_ENABLED, 1) !== 1) {
            return new WP_REST_Response(
                [
                    'error' => 'feature_disabled',
                    'message' => __('Order Grading is disabled by site administrator on the Mockup100 Settings page.', 'mockup100-pod-customizer'),
                ],
                403
            );
        }

        $order_id = (int) $request->get_param('order_id');
        $item_id = (int) $request->get_param('item_id');
        $consent = (int) $request->get_param('consent') === 1;
        if (! $consent) {
            return new WP_REST_Response(
                [
                    'error' => 'consent_required',
                    'message' => __('User did not consent to send order data to Mockup100.', 'mockup100-pod-customizer'),
                ],
                400
            );
        }

        update_user_meta(get_current_user_id(), self::META_USER_CONSENT, 1);

        $order = function_exists('wc_get_order') ? wc_get_order($order_id) : null;
        if (! $order instanceof WC_Order) {
            return new WP_REST_Response(['error' => 'order_not_found'], 404);
        }
        $item = $order->get_item($item_id);
        if (! $item) {
            return new WP_REST_Response(['error' => 'item_not_found'], 404);
        }
        $template_id = (string) $item->get_meta('mockup100_template_id', true);
        if ($template_id === '') {
            return new WP_REST_Response(['error' => 'no_template_in_item'], 422);
        }

        $part_keys = $this->extract_part_keys_from_item($item);
        if (empty($part_keys)) {
            return new WP_REST_Response(
                [
                    'error' => 'no_part_keys',
                    'message' => __('This order line does not contain part-level design data.', 'mockup100-pod-customizer'),
                ],
                422
            );
        }

        try {
            $result = $this->api_proxy->compose_grading($template_id, [
                'mode' => 'full',
                'part_keys' => $part_keys,
            ]);
            return new WP_REST_Response(
                [
                    'success' => true,
                    'result' => $result,
                ],
                200
            );
        } catch (RuntimeException $exception) {
            $message = $exception->getMessage();
            $is_subscription = stripos($message, 'GRADING_SUBSCRIPTION_REQUIRED') !== false
                || stripos($message, 'subscription required') !== false;
            $config = $this->settings->build_mockup100_config();
            return new WP_REST_Response(
                [
                    'error' => $is_subscription ? 'subscription_required' : 'compose_failed',
                    'message' => $message,
                    'subscription_url' => isset($config['gradingSubscriptionUrl']) ? (string) $config['gradingSubscriptionUrl'] : '',
                ],
                $is_subscription ? 402 : 502
            );
        }
    }

    /**
     * 从 order item meta 抽取 part keys。优先使用 design_summary.parts / part_keys,
     * 兼容 0.4.x 期间不同字段命名,只返回非空字符串去重列表。
     *
     * @param mixed $item WC_Order_Item
     * @return string[]
     */
    private function extract_part_keys_from_item($item): array
    {
        $design_summary = $item->get_meta('mockup100_design_summary', true);
        if (is_string($design_summary)) {
            $design_summary = json_decode($design_summary, true);
        }
        if (! is_array($design_summary)) {
            return [];
        }

        $keys = [];
        if (isset($design_summary['parts']) && is_array($design_summary['parts'])) {
            foreach ($design_summary['parts'] as $part) {
                if (is_string($part)) {
                    $keys[] = $part;
                } elseif (is_array($part) && isset($part['key']) && is_string($part['key'])) {
                    $keys[] = $part['key'];
                }
            }
        }
        if (isset($design_summary['part_keys']) && is_array($design_summary['part_keys'])) {
            foreach ($design_summary['part_keys'] as $part) {
                if (is_string($part)) {
                    $keys[] = $part;
                }
            }
        }
        $keys = array_filter($keys, static function ($value) {
            return is_string($value) && $value !== '';
        });
        return array_values(array_unique($keys));
    }
}
