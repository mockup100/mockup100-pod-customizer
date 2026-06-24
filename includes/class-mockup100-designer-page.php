<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Designer_Page {
    private Mockup100_Product_Binding $product_binding;
    private Mockup100_Api_Proxy $api_proxy;

    public function __construct(Mockup100_Product_Binding $product_binding, Mockup100_Api_Proxy $api_proxy) {
        $this->product_binding = $product_binding;
        $this->api_proxy = $api_proxy;
    }

    public function boot(): void {
        if (! class_exists('WooCommerce')) {
            return;
        }

        add_action('template_redirect', [$this, 'maybe_render_page']);
        add_filter('login_redirect', [$this, 'filter_login_redirect'], 10, 3);
        add_filter('woocommerce_login_redirect', [$this, 'filter_woocommerce_login_redirect'], 10, 2);
        add_filter('woocommerce_registration_redirect', [$this, 'filter_woocommerce_registration_redirect'], 10, 1);
        // 全站前端屏蔽未配置 ID 的 Reddit / Snapchat 追踪脚本（rdt / snaptr not implemented），并避免 gravatar 跨境超时
        add_action('wp_enqueue_scripts', [$this, 'suppress_third_party_tracking_scripts'], 9999);
        add_action('template_redirect', [$this, 'start_third_party_tracking_buffer'], 0);
        add_filter('get_avatar_url', [$this, 'replace_gravatar_avatar_url'], 9999, 1);
        add_filter('pre_get_avatar_data', [$this, 'short_circuit_gravatar_avatar_data'], 9999, 1);
        // Bug 9: 在 mockup100 设计页与其触发链路上禁用 WP 自动 srcset 生成,
        // 避免 attachment 缺少 2x 尺寸文件时浏览器请求 `/product/ok/2x` 形态的 404
        add_filter('wp_calculate_image_srcset', [$this, 'maybe_disable_image_srcset'], 9999, 5);
        add_filter('wp_get_attachment_image_attributes', [$this, 'maybe_strip_image_srcset_attr'], 9999, 1);
    }

    /**
     * Bug 9: 在 mockup100 设计页禁用 wp_calculate_image_srcset,避免 2x 404
     */
    public function maybe_disable_image_srcset($sources, $size_array = [], $image_src = '', $image_meta = [], $attachment_id = 0) {
        if ($this->is_design_request()) {
            return false;
        }
        return $sources;
    }

    /**
     * Bug 9: 在 mockup100 设计页移除 attachment image 的 srcset / sizes 属性
     */
    public function maybe_strip_image_srcset_attr($attr) {
        if (!is_array($attr)) {
            return $attr;
        }
        if ($this->is_design_request()) {
            unset($attr['srcset'], $attr['sizes']);
        }
        return $attr;
    }

    public function build_url(int $product_id, int $variation_id = 0, array $attributes = []): string {
        $query = [
            'mockup100_design' => '1',
            'product_id' => $product_id,
        ];
        if ($variation_id > 0) {
            $query['variation_id'] = $variation_id;
        }
        foreach ($attributes as $key => $value) {
            $normalizedKey = sanitize_key((string) $key);
            if ($normalizedKey === '' || strpos($normalizedKey, 'attribute_') !== 0) {
                continue;
            }
            $query[$normalizedKey] = sanitize_text_field((string) $value);
        }

        return add_query_arg($query, home_url('/'));
    }

    public function maybe_render_page(): void {
        if (! $this->is_design_request()) {
            return;
        }

        $productId = isset($_GET['product_id']) ? max(0, (int) wp_unslash($_GET['product_id'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- 设计器页通过自定义 query 参数路由,只读 GET,无写入操作;读取后立即 (int) 强转为整数,无注入风险
        $variationId = isset($_GET['variation_id']) ? max(0, (int) wp_unslash($_GET['variation_id'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- 同上,GET 只读路由参数;(int) 强转抑制 ValidatedSanitizedInput
        $product = $productId > 0 ? wc_get_product($productId) : null;
        if (! $product instanceof WC_Product) {
            wp_die(esc_html__('Mockup100 design page could not find the requested product.', 'mockup100-pod-customizer'));
        }

        $binding = $this->product_binding->get_binding($productId);
        if (! $binding['enabled'] || empty($binding['template_id'])) {
            wp_die(esc_html__('This product is not connected to a Mockup100 template yet.', 'mockup100-pod-customizer'));
        }
        if (! $this->api_proxy->is_configured()) {
            wp_die(esc_html__('Mockup100 platform settings are incomplete. Please configure the plugin API settings first.', 'mockup100-pod-customizer'));
        }
        if (! is_user_logged_in()) {
            wp_safe_redirect($this->build_auth_entry_url($productId, $variationId));
            exit;
        }

        $displayProduct = $this->resolve_display_product($product, $variationId);
        $returnUrl = $this->build_return_url($productId);
        $this->suppress_third_party_tracking_scripts();
        // 隐藏 WP admin bar(避免 gravatar 头像跨境请求超时)
        add_filter('show_admin_bar', '__return_false');
        $this->enqueue_local_editor_assets($productId, $variationId, $binding, $returnUrl);
        status_header(200);
        nocache_headers();
        ob_start([$this, 'filter_design_page_html']);
        ?>
        <!doctype html>
        <html <?php language_attributes(); ?> class="mockup100-standalone-html">
        <head>
            <meta charset="<?php bloginfo('charset'); ?>" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title><?php echo esc_html(sprintf(
                /* translators: %s 表示当前商品名称 */
                __('Design %s', 'mockup100-pod-customizer'),
                $product->get_name()
            )); ?></title>
            <?php wp_head(); ?>
        </head>
        <body class="mockup100-standalone-page mockup100-standalone-page--local-editor">
        <?php
        if (function_exists('wp_body_open')) {
            wp_body_open();
        }
        ?>
        <main class="mockup100-local-editor-shell" aria-label="<?php echo esc_attr($displayProduct->get_name()); ?>">
            <div id="mockup100-wordpress-editor-root" class="mockup100-wordpress-editor-root"></div>
        </main>
            <?php wp_footer(); ?>
        </body>
        </html>
        <?php
        ob_end_flush();
        exit;
    }

    public function filter_login_redirect(string $redirectTo, string $requestedRedirectTo, $user): string {
        $target = $this->resolve_requested_auth_redirect();
        return $target !== '' ? $target : $redirectTo;
    }

    public function filter_woocommerce_login_redirect(string $redirect, $user): string {
        $target = $this->resolve_requested_auth_redirect();
        return $target !== '' ? $target : $redirect;
    }

    public function filter_woocommerce_registration_redirect(string $redirect): string {
        $target = $this->resolve_requested_auth_redirect();
        return $target !== '' ? $target : $redirect;
    }

    private function is_design_request(): bool {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- 仅作为只读路由判定,根据自定义 query 参数决定是否渲染设计器页,不写入业务数据
        return isset($_GET['mockup100_design']) && sanitize_text_field(wp_unslash((string) $_GET['mockup100_design'])) === '1';
    }

    private function resolve_display_product(WC_Product $product, int $variationId): WC_Product {
        if ($variationId > 0) {
            $variation = wc_get_product($variationId);
            if ($variation instanceof WC_Product) {
                return $variation;
            }
        }

        return $product;
    }

    private function get_variation_attributes(): array {
        $attributes = [];
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- 仅作为只读 query 解析,不写入业务数据
        foreach ($_GET as $key => $value) {
            $normalizedKey = sanitize_key((string) $key);
            if ($normalizedKey === '' || strpos($normalizedKey, 'attribute_') !== 0) {
                continue;
            }
            if (is_array($value)) {
                continue;
            }
            $attributes[$normalizedKey] = sanitize_text_field(wp_unslash((string) $value));
        }

        return $attributes;
    }

    private function build_auth_entry_url(int $productId, int $variationId = 0): string {
        $redirectTarget = $this->build_design_request_url($productId, $variationId);
        if (function_exists('wc_get_page_permalink')) {
            $accountUrl = wc_get_page_permalink('myaccount');
            if (is_string($accountUrl) && $accountUrl !== '') {
                return add_query_arg([
                    'mockup100_redirect_to' => $redirectTarget,
                ], $accountUrl);
            }
        }

        return wp_login_url($redirectTarget);
    }

    private function build_return_url(int $productId): string {
        return add_query_arg($this->get_variation_attributes(), get_permalink($productId));
    }

    private function build_design_request_url(int $productId, int $variationId = 0): string {
        return $this->build_url($productId, $variationId, $this->get_variation_attributes());
    }

    private function resolve_requested_auth_redirect(): string {
        // phpcs:disable WordPress.Security.NonceVerification.Recommended -- 只读取登录回跳目标,wp_validate_redirect 会做白名单验证
        $candidates = [
            isset($_REQUEST['mockup100_redirect_to']) ? esc_url_raw(wp_unslash((string) $_REQUEST['mockup100_redirect_to'])) : '',
            isset($_REQUEST['redirect']) ? esc_url_raw(wp_unslash((string) $_REQUEST['redirect'])) : '',
            isset($_REQUEST['redirect_to']) ? esc_url_raw(wp_unslash((string) $_REQUEST['redirect_to'])) : '',
        ];
        // phpcs:enable WordPress.Security.NonceVerification.Recommended

        foreach ($candidates as $candidate) {
            $candidate = trim($candidate);
            if ($candidate === '') {
                continue;
            }
            $validated = wp_validate_redirect($candidate, '');
            if ($validated !== '') {
                return $validated;
            }
        }

        return '';
    }

    private function ensure_local_editor_assets_registered(): void {
        $asset_base = MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL . 'assets/';
        $asset_dir = MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'assets/';
        // 0.4.44: 用文件 mtime 作为 version,强制 bust Cloudflare/浏览器旧缓存
        $css_path = $asset_dir . 'css/mockup100-editor.css';
        $js_path = $asset_dir . 'js/mockup100-editor.umd.js';
        $vue_path = $asset_dir . 'js/vue.global.js';
        $css_ver = file_exists($css_path) ? (string) filemtime($css_path) : MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION;
        $js_ver = file_exists($js_path) ? (string) filemtime($js_path) : MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION;
        $vue_ver = file_exists($vue_path) ? (string) filemtime($vue_path) : MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION;

        if (! wp_style_is('mockup100-umd-editor', 'registered')) {
            wp_register_style(
                'mockup100-umd-editor',
                $asset_base . 'css/mockup100-editor.css',
                [],
                $css_ver
            );
        }

        if (! wp_script_is('mockup100-vue-global', 'registered')) {
            wp_register_script(
                'mockup100-vue-global',
                $asset_base . 'js/vue.global.js',
                [],
                $vue_ver,
                true
            );
        }

        if (! wp_script_is('mockup100-umd-editor', 'registered')) {
            wp_register_script(
                'mockup100-umd-editor',
                $asset_base . 'js/mockup100-editor.umd.js',
                ['mockup100-vue-global'],
                $js_ver,
                true
            );
        }
    }

    private function enqueue_local_editor_assets(int $productId, int $variationId, array $binding, string $returnUrl): void {
        $this->ensure_local_editor_assets_registered();
        wp_enqueue_style('mockup100-umd-editor');
        wp_enqueue_script('mockup100-umd-editor');

        // 0.5.1 (WP.org review §5): standalone designer iframe 内联 CSS 改走
        // wp_add_inline_style,而不是页面体内 <style> + echo + </style>。
        wp_add_inline_style('mockup100-umd-editor', $this->iframe_page_styles());

        // 0.5.0: 为前台 UMD 编辑器同步注入 mockup100Config(PRO/Grading/Token URL + cloudOptIn),
        // 与 wp-admin Settings 页 / editor-app.js 保持唯一配置源。
        if (class_exists('Mockup100_Settings')) {
            $settings_helper = new Mockup100_Settings($this->api_proxy);
            wp_localize_script(
                'mockup100-umd-editor',
                'mockup100Config',
                $settings_helper->build_mockup100_config()
            );
        }

        $templateId = isset($binding['template_id']) ? (string) $binding['template_id'] : '';
        $templateCode = isset($binding['template_code']) ? (string) $binding['template_code'] : $templateId;
        $displayName = isset($binding['template_label']) ? (string) $binding['template_label'] : $templateId;
        $source = (isset($binding['template_source']) ? (string) $binding['template_source'] : '') === 'marketplace'
            ? 'center'
            : 'repository';
        $locale = determine_locale();
        $config = [
            'container' => '#mockup100-wordpress-editor-root',
            'restBase' => untrailingslashit($this->api_proxy->get_base_url()),
            'siteUrl' => home_url('/'),
            'apiKey' => $this->api_proxy->get_api_key(),
            'productId' => $productId,
            'templateId' => $templateId,
            'templateCode' => $templateCode,
            'displayName' => $displayName,
            'source' => $source,
            'variationId' => $variationId > 0 ? $variationId : null,
            'wcNonce' => wp_create_nonce('wp_rest'),
            'returnUrl' => $returnUrl,
            'locale' => strpos((string) $locale, 'zh') === 0 ? 'zh' : 'en',
            'wordpressShell' => $this->build_wordpress_shell_config($returnUrl),
            'wordpressUser' => $this->build_wordpress_user_config(),
            'wordpressProductNav' => $this->build_wordpress_product_nav_config($productId),
        ];

        wp_add_inline_script(
            'mockup100-umd-editor',
            'window.MOCKUP100_WORDPRESS_EDITOR=' . wp_json_encode($config) . ';' .
            '(function(){' .
                'function mountEditor(){' .
                    'var config=window.MOCKUP100_WORDPRESS_EDITOR;' .
                    'var root=document.querySelector(config.container);' .
                    'if(!root){return;}' .
                    'if(typeof window.createMockup100Editor!=="function"){' .
                        'root.innerHTML="<div style=\"padding:24px;color:#b91c1c;font:14px/1.6 sans-serif;\">Mockup100 local editor bundle failed to load.</div>";' .
                        'return;' .
                    '}' .
                    'window.createMockup100Editor(config);' .
                '}' .
                'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",mountEditor,{once:true});}else{mountEditor();}' .
            '})();',
            'after'
        );
    }

    private function build_wordpress_shell_config(string $returnUrl): array {
        $currentUser = wp_get_current_user();
        $isLoggedIn = is_user_logged_in() && ($currentUser instanceof WP_User) && $currentUser->exists();

        return [
            'homeUrl' => home_url('/'),
            'siteTitle' => wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES),
            'siteLogoUrl' => $this->resolve_wordpress_logo_url(),
            'navItems' => $this->resolve_wordpress_nav_items(),
            'accountUrl' => $this->resolve_wordpress_account_url($returnUrl),
            'loginUrl' => wp_login_url($returnUrl),
            'logoutUrl' => $isLoggedIn ? wp_logout_url($returnUrl) : '',
            'isLoggedIn' => $isLoggedIn,
            'displayName' => $isLoggedIn ? (string) ($currentUser->display_name ?: $currentUser->user_login) : '',
            'cartUrl' => function_exists('wc_get_cart_url') ? wc_get_cart_url() : '',
            'cartCount' => (function_exists('WC') && WC()->cart) ? (int) WC()->cart->get_cart_contents_count() : 0,
            // 0.4.43: Place Order 走 WC AJAX 时所需的 nonce / 端点,缺省主题安全插件可能拦截无 nonce 请求
            'wcAjaxUrl' => function_exists('WC_AJAX') && method_exists('WC_AJAX', 'get_endpoint')
                ? WC_AJAX::get_endpoint('add_to_cart')
                : home_url('/?wc-ajax=add_to_cart'),
            'wcAjaxNonce' => wp_create_nonce('woocommerce-add-to-cart'),
        ];
    }

    private function build_wordpress_user_config(): array {
        $currentUser = wp_get_current_user();
        $isLoggedIn = is_user_logged_in() && ($currentUser instanceof WP_User) && $currentUser->exists();
        $siteUrl = home_url('/');
        $siteHost = strtolower((string) wp_parse_url($siteUrl, PHP_URL_HOST));
        if (! $isLoggedIn) {
            return [
                'userId' => '',
                'userLogin' => '',
                'email' => '',
                'displayName' => '',
                'accountId' => '',
                'siteHost' => $siteHost,
                'siteUrl' => untrailingslashit($siteUrl),
            ];
        }

        return [
            'userId' => (string) $currentUser->ID,
            'userLogin' => (string) $currentUser->user_login,
            'email' => (string) $currentUser->user_email,
            'displayName' => (string) ($currentUser->display_name ?: $currentUser->user_login),
            'accountId' => 'wp:' . $siteHost . ':' . (string) $currentUser->ID,
            'siteHost' => $siteHost,
            'siteUrl' => untrailingslashit($siteUrl),
        ];
    }

    private function build_wordpress_product_nav_config(int $productId): array {
        $products = $this->product_binding->list_published_bound_products($productId, '', '', 1, 12);
        return [
            'currentProductId' => $productId,
            'currentProduct' => isset($products['current']) && is_array($products['current'])
                ? $products['current']
                : (isset($products['items'][0]) && is_array($products['items'][0]) ? $products['items'][0] : null),
            'initialItems' => isset($products['items']) && is_array($products['items']) ? $products['items'] : [],
            'categories' => $this->product_binding->list_bound_product_categories(),
            'restPaths' => [
                'products' => esc_url_raw(rest_url('mockup100/v1/designer/products')),
                'categories' => esc_url_raw(rest_url('mockup100/v1/designer/product-categories')),
            ],
        ];
    }

    private function resolve_wordpress_logo_url(): string {
        $customLogoId = (int) get_theme_mod('custom_logo');
        if ($customLogoId > 0) {
            $logoUrl = wp_get_attachment_image_url($customLogoId, 'full');
            if (is_string($logoUrl) && $logoUrl !== '') {
                return $logoUrl;
            }
        }

        return '';
    }

    private function resolve_wordpress_account_url(string $returnUrl): string {
        if (function_exists('wc_get_page_permalink')) {
            $accountUrl = wc_get_page_permalink('myaccount');
            if (is_string($accountUrl) && $accountUrl !== '') {
                return $accountUrl;
            }
        }

        return is_user_logged_in() ? admin_url('profile.php') : wp_login_url($returnUrl);
    }

    private function resolve_wordpress_nav_items(): array {
        $items = [];
        $locations = function_exists('get_nav_menu_locations') ? get_nav_menu_locations() : [];
        $preferredLocations = ['primary', 'menu-1', 'main', 'header', 'top'];

        foreach ($preferredLocations as $location) {
            $menuId = isset($locations[$location]) ? (int) $locations[$location] : 0;
            if ($menuId <= 0) {
                continue;
            }
            $menuItems = wp_get_nav_menu_items($menuId, ['update_post_term_cache' => false]);
            if (! is_array($menuItems) || $menuItems === []) {
                continue;
            }
            foreach ($menuItems as $menuItem) {
                if (! $menuItem instanceof WP_Post) {
                    continue;
                }
                if ((int) $menuItem->menu_item_parent !== 0) {
                    continue;
                }
                $title = trim(wp_strip_all_tags((string) $menuItem->title));
                $url = isset($menuItem->url) ? esc_url_raw((string) $menuItem->url) : '';
                if ($title === '' || $url === '') {
                    continue;
                }
                $items[] = [
                    'label' => $title,
                    'url' => $url,
                ];
                if (count($items) >= 6) {
                    break 2;
                }
            }
        }

        if ($items !== []) {
            return $items;
        }

        $fallbacks = [];
        if (function_exists('wc_get_page_permalink')) {
            $shopUrl = wc_get_page_permalink('shop');
            $accountUrl = wc_get_page_permalink('myaccount');
            $checkoutUrl = wc_get_page_permalink('checkout');
            if (is_string($shopUrl) && $shopUrl !== '') {
                $fallbacks[] = ['label' => __('Shop', 'mockup100-pod-customizer'), 'url' => $shopUrl];
            }
            if (is_string($accountUrl) && $accountUrl !== '') {
                $fallbacks[] = ['label' => __('My account', 'mockup100-pod-customizer'), 'url' => $accountUrl];
            }
            if (is_string($checkoutUrl) && $checkoutUrl !== '') {
                $fallbacks[] = ['label' => __('Checkout', 'mockup100-pod-customizer'), 'url' => $checkoutUrl];
            }
        }
        if (function_exists('wc_get_cart_url')) {
            $cartUrl = wc_get_cart_url();
            if (is_string($cartUrl) && $cartUrl !== '') {
                $fallbacks[] = ['label' => __('Cart', 'mockup100-pod-customizer'), 'url' => $cartUrl];
            }
        }

        return $fallbacks;
    }

    public function suppress_third_party_tracking_scripts(): void {
        $blockedNeedles = [
            'reddit-for-woocommerce/js/build/tracking.js',
            'snapchat-for-woocommerce/js/build/tracking.js',
        ];

        $queuedHandles = wp_scripts()->queue;
        foreach ($queuedHandles as $handle) {
            if (! isset(wp_scripts()->registered[$handle])) {
                continue;
            }
            $src = (string) wp_scripts()->registered[$handle]->src;
            foreach ($blockedNeedles as $needle) {
                if ($src !== '' && strpos($src, $needle) !== false) {
                    wp_dequeue_script($handle);
                    wp_deregister_script($handle);
                    break;
                }
            }
        }
    }

    public function start_third_party_tracking_buffer(): void {
        if ($this->is_design_request()) {
            // 设计器页有自己的 ob_start，避免重复缓冲
            return;
        }
        // 在 template 渲染前启动输出缓冲，shutdown 时统一剥除残留 reddit/snapchat tracking 脚本
        ob_start([$this, 'filter_design_page_html']);
        add_action('shutdown', static function (): void {
            while (ob_get_level() > 0) {
                @ob_end_flush();
            }
        }, 0);
    }

    public function replace_gravatar_avatar_url(string $url): string {
        if ($url === '') {
            return $url;
        }
        if (strpos($url, 'gravatar.com/') !== false || strpos($url, '://gravatar.com') !== false) {
            // 用 1x1 透明 gif 替代 gravatar，避免国内访问超时阻塞页面
            return 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
        }
        return $url;
    }

    public function short_circuit_gravatar_avatar_data($args) {
        if (! is_array($args)) {
            return $args;
        }
        $args['url'] = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
        $args['found_avatar'] = true;
        return $args;
    }

    public function filter_design_page_html(string $html): string {
        $patterns = [
            '#<script\b[^>]*id="reddit_tracking-js-extra"[^>]*>.*?</script>\s*#is',
            '#<script\b[^>]*id="reddit_tracking-js"[^>]*>.*?</script>\s*#is',
            '#<script\b[^>]*id="reddit_tracking-js-after"[^>]*>.*?</script>\s*#is',
            '#<script\b[^>]*id="snapchat_tracking-js-extra"[^>]*>.*?</script>\s*#is',
            '#<script\b[^>]*id="snapchat_tracking-js"[^>]*>.*?</script>\s*#is',
            '#<script\b[^>]*id="snapchat_tracking-js-after"[^>]*>.*?</script>\s*#is',
        ];

        return (string) preg_replace($patterns, '', $html);
    }

    private function iframe_page_styles(): string {
        return '
html, body.mockup100-standalone-page {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    background: #f5f7fb;
}
/* Bug 2-1: 强制移除 WP admin bar / theme header 注入的顶部空白 */
html.mockup100-standalone-html {
    margin-top: 0 !important;
    padding-top: 0 !important;
}
body.mockup100-standalone-page--local-editor {
    overflow: hidden;
}
.mockup100-local-editor-shell {
    width: 100vw;
    height: 100vh;
}
.mockup100-wordpress-editor-root {
    width: 100%;
    height: 100%;
}
';
    }
}
