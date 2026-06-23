<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Preview_Plugin {
    private Mockup100_Api_Proxy $api_proxy;
    private Mockup100_Settings $settings;
    private Mockup100_Product_Binding $product_binding;
    private Mockup100_Rest_Controller $rest_controller;
    private Mockup100_Cart_Meta $cart_meta;
    private Mockup100_Designer_Page $designer_page;
    private Mockup100_Order_Grading $order_grading;

    public function __construct() {
        $this->api_proxy = new Mockup100_Api_Proxy();
        $this->settings = new Mockup100_Settings($this->api_proxy);
        $this->product_binding = new Mockup100_Product_Binding($this->api_proxy);
        $this->rest_controller = new Mockup100_Rest_Controller($this->api_proxy, $this->product_binding);
        $this->cart_meta = new Mockup100_Cart_Meta();
        $this->designer_page = new Mockup100_Designer_Page($this->product_binding, $this->api_proxy);
        $this->order_grading = new Mockup100_Order_Grading($this->api_proxy, $this->settings);
    }

    public function boot(): void {
        $this->settings->boot();
        $this->rest_controller->boot();
        add_action('update_option_' . Mockup100_Api_Proxy::OPTION_KEY, [$this, 'sync_site_record'], 10, 2);

        if (! class_exists('WooCommerce')) {
            add_action('admin_notices', [$this, 'render_missing_woocommerce_notice']);
            return;
        }

        $this->product_binding->boot();
        $this->cart_meta->boot();
        $this->designer_page->boot();
        $this->order_grading->boot();

        add_filter('woocommerce_locate_template', [$this, 'locate_wc_template'], 10, 3);
        add_action('wp_enqueue_scripts', [$this, 'register_assets']);
        add_action('woocommerce_single_product_summary', [$this, 'render_design_button'], 25);
        add_action('woocommerce_order_status_changed', [$this, 'handle_order_status_changed'], 10, 4);
        add_action('woocommerce_process_product_meta', [$this, 'sync_site_record_now']);
        add_action('woocommerce_save_product_variation', [$this, 'sync_site_record_now']);
        add_filter('get_the_terms', [$this, 'filter_product_categories_on_frontend'], 10, 3);
    }

    public function filter_product_categories_on_frontend($terms, $post_id, $taxonomy) {
        if ($taxonomy !== 'product_cat' || empty($terms) || is_wp_error($terms)) {
            return $terms;
        }
        if (is_admin() && !wp_doing_ajax()) {
            return $terms;
        }
        // 仅过滤 WooCommerce 默认占位 uncategorized；保留全部层级（一/二/三级），
        // 让单品详情页显示完整 Categories: 一级, 二级, 三级 链路。
        $filtered = [];
        foreach ($terms as $term) {
            if (isset($term->slug) && $term->slug === 'uncategorized') {
                continue;
            }
            $filtered[] = $term;
        }
        return empty($filtered) ? $terms : array_values($filtered);
    }

    public function render_missing_woocommerce_notice(): void {
        if (! current_user_can('activate_plugins')) {
            return;
        }
        echo '<div class="notice notice-warning"><p>';
        esc_html_e('Mockup100 Preview requires WooCommerce to be installed and active.', 'mockup100-pod-customizer');
        echo '</p></div>';
    }

    public function sync_site_record($old_value, $new_value): void {
        $this->sync_site_record_now();
    }

    public function sync_site_record_now(): void {
        // 0.5.1 (WP review §6 / GDPR): 数据同步默认关闭,只有用户在设置页主动勾选 cloudOptIn 时
        // 才允许向 Mockup100 SaaS 发起出站 HTTP 请求。
        if ((int) get_option(Mockup100_Settings::OPTION_CLOUD_OPT_IN, 0) !== 1) {
            return;
        }
        try {
            if (! $this->api_proxy->is_configured()) {
                return;
            }
            $this->api_proxy->sync_woocommerce_site([
                'siteUrl' => home_url('/'),
                'siteName' => get_bloginfo('name'),
                'platformBaseUrl' => $this->api_proxy->get_base_url(),
                'pluginVersion' => MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
                'wordpressVersion' => get_bloginfo('version'),
                'woocommerceVersion' => defined('WC_VERSION') ? WC_VERSION : '',
                'productBindingCount' => $this->count_bound_products(),
                'variationBindingCount' => $this->count_bound_variations(),
            ]);
        } catch (Throwable $exception) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 站点信息回传失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('Mockup100 sync_site_record failed: ' . $exception->getMessage());
            }
        }
    }

    public function handle_order_status_changed(int $order_id, string $from, string $to, $order): void {
        // 0.5.1 (WP review §6 / GDPR): 订单状态回传默认关闭,只有用户主动勾选 cloudOptIn 时
        // 才允许将订单数据发送给 Mockup100 SaaS。
        if ((int) get_option(Mockup100_Settings::OPTION_CLOUD_OPT_IN, 0) !== 1) {
            return;
        }
        try {
            if (! $this->api_proxy->is_configured() || ! $order instanceof WC_Order) {
                return;
            }
            $designs = [];
            foreach ($order->get_items() as $item) {
                $templateId = $item->get_meta('mockup100_template_id', true);
                if (! $templateId) {
                    continue;
                }
                $designs[] = [
                    'item_id' => $item->get_id(),
                    'product_id' => $item->get_product_id(),
                    'template_id' => $templateId,
                    'template_source' => $item->get_meta('mockup100_template_source', true),
                    'selected_color' => $item->get_meta('mockup100_selected_color', true),
                    'selected_view' => $item->get_meta('mockup100_selected_view', true),
                    'output_size' => $item->get_meta('mockup100_output_size', true),
                    'job_id' => $item->get_meta('mockup100_job_id', true),
                    'preview_url' => $item->get_meta('mockup100_preview_url', true),
                    'download_url' => $item->get_meta('mockup100_download_url', true),
                    'outputs' => $this->decode_json_meta($item->get_meta('mockup100_outputs', true)),
                    'design_summary' => $this->decode_json_meta($item->get_meta('mockup100_design_summary', true)),
                ];
            }
            if (empty($designs)) {
                return;
            }
            $this->api_proxy->send_order_status([
                'siteUrl' => home_url('/'),
                'pluginVersion' => MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
                'externalOrderId' => (string) $order->get_id(),
                'orderNumber' => (string) $order->get_order_number(),
                'status' => $to,
                'currency' => (string) $order->get_currency(),
                'totalAmount' => (string) $order->get_total(),
                'payload' => [
                    'from_status' => $from,
                    'to_status' => $to,
                    'order_id' => $order->get_id(),
                    'order_number' => $order->get_order_number(),
                    'designs' => $designs,
                ],
            ]);
        } catch (Throwable $exception) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 订单状态回传失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('Mockup100 handle_order_status_changed failed: ' . $exception->getMessage());
            }
        }
    }

    private function decode_json_meta($value) {
        if (! is_string($value) || $value === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function count_bound_products(): int {
        $query = new WP_Query([
            'post_type' => 'product',
            'post_status' => 'any',
            'fields' => 'ids',
            'posts_per_page' => 1,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- 后台计数仅在设置页运行,且 posts_per_page=1 仅取 found_posts
            'meta_query' => [
                [
                    'key' => Mockup100_Product_Binding::META_TEMPLATE_BINDINGS,
                    'compare' => 'EXISTS',
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    private function count_bound_variations(): int {
        $query = new WP_Query([
            'post_type' => 'product_variation',
            'post_status' => 'any',
            'fields' => 'ids',
            'posts_per_page' => 1,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- 后台计数仅在设置页运行,且 posts_per_page=1 仅取 found_posts
            'meta_query' => [
                [
                    'key' => Mockup100_Product_Binding::META_TEMPLATE_BINDINGS,
                    'compare' => 'EXISTS',
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    public function register_assets(): void {
        $asset_base = MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL . 'assets/';

        wp_register_script(
            'mockup100-fabric',
            // 0.4.73 (security): 把 fabric@6.0.2 从 CDN(jsdelivr) 下载到本地 assets/vendor/fabric/
            // 后注册,所有静态资源仅托管在本地服务器,不再有跨域 CDN 依赖。
            $asset_base . 'vendor/fabric/fabric-6.0.2.min.js',
            [],
            '6.0.2',
            true
        );

        wp_register_style(
            'mockup100-preview',
            $asset_base . 'css/editor-app.css',
            [],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION
        );
        wp_register_script(
            'mockup100-preview',
            $asset_base . 'js/editor-app.js',
            ['jquery', 'wc-add-to-cart-variation', 'mockup100-fabric'],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
            true
        );
        // 0.5.0: 把 PRO/Grading/Token URL 与 cloudOptIn 标志注入到前端编辑器脚本,
        // 避免 main.js / editor-app.js 内出现任何业务硬编码 URL。
        wp_localize_script(
            'mockup100-preview',
            'mockup100Config',
            $this->settings->build_mockup100_config()
        );

        wp_register_style(
            'mockup100-umd-editor',
            $asset_base . 'css/mockup100-editor.css',
            [],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION
        );
        wp_register_script(
            'mockup100-vue-global',
            $asset_base . 'js/vue.global.js',
            [],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
            true
        );
        wp_register_script(
            'mockup100-umd-editor',
            $asset_base . 'js/mockup100-editor.umd.js',
            ['mockup100-vue-global'],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
            true
        );
        wp_register_script(
            'mockup100-design-button',
            $asset_base . 'js/product-design-button.js',
            ['jquery', 'wc-add-to-cart-variation'],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
            true
        );
    }

    public function render_design_button(): void {
        if (is_admin()) {
            return;
        }

        global $product;
        $postId = get_the_ID();
        $resolvedProduct = $product instanceof WC_Product
            ? $product
            : (($postId && get_post_type($postId) === 'product') ? wc_get_product($postId) : null);
        if (! $resolvedProduct instanceof WC_Product) {
            return;
        }
        $isProductPage = (function_exists('is_product') && is_product())
            || (function_exists('is_singular') && is_singular('product'))
            || get_post_type($resolvedProduct->get_id()) === 'product'
            || (isset($_GET['preview']) && sanitize_text_field(wp_unslash((string) $_GET['preview'])) === 'true' && get_post_type($postId) === 'product'); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- 仅判定是否为前台预览模式,不涉及写操作
        if (! $isProductPage) {
            return;
        }

        $binding = $this->product_binding->get_binding($resolvedProduct->get_id());
        if ($binding['template_id'] === '') {
            return;
        }
        $designUrl = $this->designer_page->build_url($resolvedProduct->get_id());
        echo '<div class="mockup100-design-entry">';
        echo '<a class="button button-primary mockup100-design-button" href="' . esc_url($designUrl) . '" data-base-url="' . esc_url($designUrl) . '">' . esc_html__('Design', 'mockup100-pod-customizer') . '</a>';
        echo '</div>';
        if ($resolvedProduct->is_type('variable')) {
            wp_enqueue_script('mockup100-design-button');
        }
    }

    public function locate_wc_template(string $template, string $template_name, string $template_path): string
    {
        $plugin_template = MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'woocommerce/' . $template_name;
        if (file_exists($plugin_template)) {
            return $plugin_template;
        }
        return $template;
    }
}
