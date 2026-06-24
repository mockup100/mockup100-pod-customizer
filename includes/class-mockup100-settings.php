<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Settings {
    private const MENU_SLUG = 'mockup100-preview';
    public const OPTION_CLOUD_OPT_IN = 'mockup100_cloud_opt_in';
    public const OPTION_PRO_STOREFRONT_URL = 'mockup100_pro_storefront_url';
    public const OPTION_GRADING_SUBSCRIPTION_URL = 'mockup100_grading_subscription_url';
    public const OPTION_TOKEN_RECHARGE_URL = 'mockup100_token_recharge_url';
    // 0.5.7: 后台订单详情页 Grading meta box 入口的站点级断开开关。
    // 默认开启 (1);管理员勾掉后,wp-admin 订单页不渲染 Grading meta box,
    // 对应 REST 路由也直接返回 feature_disabled,符合"商家可随时切断 SaaS 依赖"。
    public const OPTION_ORDER_GRADING_ENABLED = 'mockup100_order_grading_enabled';
    public const DEFAULT_PRO_STOREFRONT_URL = 'https://www.mockup100.com/pricing#wp-pro';
    public const DEFAULT_GRADING_SUBSCRIPTION_URL = 'https://www.mockup100.com/pricing#grading';
    public const DEFAULT_TOKEN_RECHARGE_URL = 'https://www.mockup100.com/pricing#tokens';

    private Mockup100_Api_Proxy $api_proxy;

    public function __construct(Mockup100_Api_Proxy $api_proxy) {
        $this->api_proxy = $api_proxy;
    }

    public function boot(): void {
        add_action('admin_menu', [$this, 'register_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_settings_assets']);
    }

    public function register_menu(): void {
        add_menu_page(
            __('Mockup100 Preview', 'mockup100-pod-customizer'),
            __('Mockup100', 'mockup100-pod-customizer'),
            'manage_options',
            self::MENU_SLUG,
            [$this, 'render_page'],
            'dashicons-art',
            56
        );
        add_submenu_page(
            self::MENU_SLUG,
            __('Mockup100 Settings', 'mockup100-pod-customizer'),
            __('Settings', 'mockup100-pod-customizer'),
            'manage_options',
            self::MENU_SLUG,
            [$this, 'render_page']
        );
    }

    public function register_settings(): void {
        register_setting(
            'mockup100_preview',
            Mockup100_Api_Proxy::OPTION_KEY,
            [
                'type' => 'array',
                'sanitize_callback' => [$this, 'sanitize_settings'],
                'default' => [],
            ]
        );

        // 0.5.0 §Trialware-free / Privacy: 默认关闭隐私同步,需站点管理员显式勾选
        register_setting(
            'mockup100_preview',
            self::OPTION_CLOUD_OPT_IN,
            [
                'type' => 'boolean',
                'sanitize_callback' => [$this, 'sanitize_cloud_opt_in'],
                'default' => 0,
            ]
        );

        register_setting(
            'mockup100_preview',
            self::OPTION_PRO_STOREFRONT_URL,
            [
                'type' => 'string',
                'sanitize_callback' => [$this, 'sanitize_optional_https_url'],
                'default' => self::DEFAULT_PRO_STOREFRONT_URL,
            ]
        );
        register_setting(
            'mockup100_preview',
            self::OPTION_GRADING_SUBSCRIPTION_URL,
            [
                'type' => 'string',
                'sanitize_callback' => [$this, 'sanitize_optional_https_url'],
                'default' => self::DEFAULT_GRADING_SUBSCRIPTION_URL,
            ]
        );
        register_setting(
            'mockup100_preview',
            self::OPTION_TOKEN_RECHARGE_URL,
            [
                'type' => 'string',
                'sanitize_callback' => [$this, 'sanitize_optional_https_url'],
                'default' => self::DEFAULT_TOKEN_RECHARGE_URL,
            ]
        );

        // 0.5.7: 默认开启,这样新装插件就能在订单详情页看到 Grading 入口;
        // 管理员有意切断 SaaS 依赖时只需在 Settings 页取消勾选即可。
        register_setting(
            'mockup100_preview',
            self::OPTION_ORDER_GRADING_ENABLED,
            [
                'type' => 'boolean',
                'sanitize_callback' => [$this, 'sanitize_order_grading_enabled'],
                'default' => 1,
            ]
        );

        add_settings_section(
            'mockup100_preview_main',
            __('Platform Connection', 'mockup100-pod-customizer'),
            '__return_false',
            'mockup100-preview'
        );

        add_settings_section(
            'mockup100_preview_storage',
            __('WordPress Upload Storage', 'mockup100-pod-customizer'),
            '__return_false',
            'mockup100-preview'
        );

        add_settings_section(
            'mockup100_preview_privacy',
            __('Cloud Sync (Privacy)', 'mockup100-pod-customizer'),
            '__return_false',
            'mockup100-preview'
        );

        $fields = [
            'platform_base_url' => __('Platform Base URL', 'mockup100-pod-customizer'),
            'tenant_api_key' => __('Tenant API Key', 'mockup100-pod-customizer'),
            'default_output_size' => __('Default Output Size', 'mockup100-pod-customizer'),
            'default_preview_size' => __('Default Preview Size', 'mockup100-pod-customizer'),
        ];

        foreach ($fields as $key => $label) {
            add_settings_field(
                $key,
                $label,
                [$this, 'render_field'],
                'mockup100-preview',
                'mockup100_preview_main',
                ['key' => $key]
            );
        }

        $storageFields = [
            'artwork_storage_provider' => __('Artwork Storage Provider', 'mockup100-pod-customizer'),
            'artwork_oss_endpoint' => __('OSS Endpoint', 'mockup100-pod-customizer'),
            'artwork_oss_bucket' => __('OSS Bucket', 'mockup100-pod-customizer'),
            'artwork_oss_access_key_id' => __('OSS Access Key ID', 'mockup100-pod-customizer'),
            'artwork_oss_access_key_secret' => __('OSS Access Key Secret', 'mockup100-pod-customizer'),
            'artwork_oss_public_base_url' => __('OSS Public Base URL', 'mockup100-pod-customizer'),
            'artwork_oss_key_prefix' => __('OSS Key Prefix', 'mockup100-pod-customizer'),
        ];

        foreach ($storageFields as $key => $label) {
            add_settings_field(
                $key,
                $label,
                [$this, 'render_field'],
                'mockup100-preview',
                'mockup100_preview_storage',
                ['key' => $key]
            );
        }

        add_settings_field(
            self::OPTION_CLOUD_OPT_IN,
            __('Cloud Data Sync', 'mockup100-pod-customizer'),
            [$this, 'render_cloud_opt_in_field'],
            'mockup100-preview',
            'mockup100_preview_privacy'
        );

        add_settings_field(
            self::OPTION_ORDER_GRADING_ENABLED,
            __('Order Grading Entry', 'mockup100-pod-customizer'),
            [$this, 'render_order_grading_enabled_field'],
            'mockup100-preview',
            'mockup100_preview_privacy'
        );
    }

    public function sanitize_settings($value): array {
        $payload = is_array($value) ? $value : [];

        return [
            'platform_base_url' => isset($payload['platform_base_url'])
                ? $this->sanitize_base_url($payload['platform_base_url'])
                : 'https://www.mockup100.com',
            'tenant_api_key' => isset($payload['tenant_api_key']) ? sanitize_text_field((string) $payload['tenant_api_key']) : '',
            'default_output_size' => $this->sanitize_size($payload['default_output_size'] ?? '1024x1024'),
            'default_preview_size' => $this->sanitize_size($payload['default_preview_size'] ?? '1024x1024'),
            'artwork_storage_provider' => $this->sanitize_storage_provider($payload['artwork_storage_provider'] ?? 'oss'),
            'artwork_oss_endpoint' => isset($payload['artwork_oss_endpoint']) ? $this->sanitize_endpoint($payload['artwork_oss_endpoint']) : '',
            'artwork_oss_bucket' => isset($payload['artwork_oss_bucket']) ? sanitize_text_field((string) $payload['artwork_oss_bucket']) : '',
            'artwork_oss_access_key_id' => isset($payload['artwork_oss_access_key_id']) ? sanitize_text_field((string) $payload['artwork_oss_access_key_id']) : '',
            'artwork_oss_access_key_secret' => isset($payload['artwork_oss_access_key_secret']) ? sanitize_text_field((string) $payload['artwork_oss_access_key_secret']) : '',
            'artwork_oss_public_base_url' => isset($payload['artwork_oss_public_base_url']) ? $this->sanitize_optional_base_url($payload['artwork_oss_public_base_url']) : '',
            'artwork_oss_key_prefix' => isset($payload['artwork_oss_key_prefix']) ? sanitize_text_field((string) $payload['artwork_oss_key_prefix']) : 'artworks/wordpress',
        ];
    }

    public function sanitize_cloud_opt_in($value): int {
        return (! empty($value) && $value !== '0') ? 1 : 0;
    }

    public function sanitize_order_grading_enabled($value): int {
        return (! empty($value) && $value !== '0') ? 1 : 0;
    }

    public function sanitize_optional_https_url($value): string {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return '';
        }
        return esc_url_raw($normalized);
    }

    public function render_field(array $args): void {
        $settings = $this->api_proxy->get_settings();
        $key = (string) ($args['key'] ?? '');
        $value = isset($settings[$key]) ? (string) $settings[$key] : '';
        if ($key === 'platform_base_url' && $value === '') {
            $value = 'https://www.mockup100.com';
        }
        $name = Mockup100_Api_Proxy::OPTION_KEY . '[' . esc_attr($key) . ']';

        if (in_array($key, ['default_output_size', 'default_preview_size'], true)) {
            $options = ['512x512', '1024x1024', '2048x2048', '4096x4096'];
            echo '<select class="regular-text" name="' . esc_attr($name) . '">';
            foreach ($options as $option) {
                echo '<option value="' . esc_attr($option) . '" ' . selected($value, $option, false) . '>' . esc_html($option) . '</option>';
            }
            echo '</select>';
            return;
        }

        if ($key === 'artwork_storage_provider') {
            echo '<select class="regular-text" name="' . esc_attr($name) . '">';
            echo '<option value="oss" ' . selected($value, 'oss', false) . '>' . esc_html__('OSS', 'mockup100-pod-customizer') . '</option>';
            echo '</select>';
            return;
        }

        $type = in_array($key, ['tenant_api_key', 'artwork_oss_access_key_id', 'artwork_oss_access_key_secret'], true)
            ? 'password'
            : (in_array($key, ['platform_base_url', 'artwork_oss_public_base_url'], true) ? 'url' : 'text');
        echo '<input class="regular-text" type="' . esc_attr($type) . '" name="' . esc_attr($name) . '" value="' . esc_attr($value) . '" />';
    }

    public function render_cloud_opt_in_field(): void {
        $checked = (int) get_option(self::OPTION_CLOUD_OPT_IN, 0) === 1;
        echo '<label>';
        // 0.5.2 (Plugin Check ERROR EscapeOutput.OutputNotEscaped fix):
        // 直接在 echo 拼接处调 esc_attr,避免中间变量让 PHPCS 误报。
        echo '<input type="checkbox" name="' . esc_attr(self::OPTION_CLOUD_OPT_IN) . '" value="1" ' . checked($checked, true, false) . ' /> ';
        // 使用 spec 文案 §Trialware-free Free Plugin 中提到的 cloud sync opt-in 描述
        echo esc_html__('Sync design data to Mockup100 cloud (recommended for cross-device sync)', 'mockup100-pod-customizer');
        echo '</label>';
        echo '<p class="description">' . esc_html__('When disabled, the WP plugin keeps design data local and skips cloud sync calls (site/order metadata).', 'mockup100-pod-customizer') . '</p>';
    }

    public function render_order_grading_enabled_field(): void {
        $checked = (int) get_option(self::OPTION_ORDER_GRADING_ENABLED, 1) === 1;
        echo '<label>';
        echo '<input type="checkbox" name="' . esc_attr(self::OPTION_ORDER_GRADING_ENABLED) . '" value="1" ' . checked($checked, true, false) . ' /> ';
        echo esc_html__('Show "Generate Grading Sizes" entry on WooCommerce order edit pages', 'mockup100-pod-customizer');
        echo '</label>';
        echo '<p class="description">' . esc_html__('Adds a side-panel meta box to wp-admin order pages that lets shop managers send a single line item\'s design metadata (template id, part keys) to the Mockup100 Grading API after explicit consent. Grading access is managed on mockup100.com, outside this plugin. Disable this checkbox to remove the meta box and the matching REST route entirely.', 'mockup100-pod-customizer') . '</p>';
    }

    public function enqueue_settings_assets(string $hook): void {
        // 只在 Mockup100 设置子页面注册 Token panel JS,避免污染 wp-admin 其他页面
        if (strpos((string) $hook, self::MENU_SLUG) === false) {
            return;
        }

        $asset_base = MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL . 'assets/';
        $asset_dir = MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'assets/';
        $js_path = $asset_dir . 'js/settings.js';
        $css_path = $asset_dir . 'css/settings.css';
        $js_ver = file_exists($js_path) ? (string) filemtime($js_path) : MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION;
        $css_ver = file_exists($css_path) ? (string) filemtime($css_path) : MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION;

        if (file_exists($css_path)) {
            wp_enqueue_style(
                'mockup100-settings',
                $asset_base . 'css/settings.css',
                [],
                $css_ver
            );
        }

        if (file_exists($js_path)) {
            wp_enqueue_script(
                'mockup100-settings',
                $asset_base . 'js/settings.js',
                [],
                $js_ver,
                true
            );
            wp_localize_script(
                'mockup100-settings',
                'mockup100Config',
                $this->build_mockup100_config()
            );
        }
    }

    /**
     * 构建前端注入配置(供 settings.js / main.js 共用)。
     * URL 全部由 PHP get_option(...) 兜底,避免任何前端硬编码。
     */
    public function build_mockup100_config(): array {
        return [
            'apiBase' => untrailingslashit($this->api_proxy->get_base_url()) . '/api',
            'restBase' => esc_url_raw(rest_url('mockup100/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'proStorefrontUrl' => esc_url_raw($this->option_url_or_default(self::OPTION_PRO_STOREFRONT_URL, self::DEFAULT_PRO_STOREFRONT_URL)),
            'gradingSubscriptionUrl' => esc_url_raw($this->option_url_or_default(self::OPTION_GRADING_SUBSCRIPTION_URL, self::DEFAULT_GRADING_SUBSCRIPTION_URL)),
            'tokenRechargeUrl' => esc_url_raw($this->option_url_or_default(self::OPTION_TOKEN_RECHARGE_URL, self::DEFAULT_TOKEN_RECHARGE_URL)),
            'cloudOptIn' => (bool) get_option(self::OPTION_CLOUD_OPT_IN, 0),
        ];
    }

    private function option_url_or_default(string $option_name, string $default_url): string {
        $configured = trim((string) get_option($option_name, ''));
        return $configured === '' ? $default_url : $configured;
    }

    public function render_page(): void {
        $connection = $this->describe_connection_status();
        $config = $this->build_mockup100_config();
        $rechargeUrl = $config['tokenRechargeUrl'];
        $gradingUrl = $config['gradingSubscriptionUrl'];
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Mockup100 Settings', 'mockup100-pod-customizer'); ?></h1>
            <p><?php esc_html_e('Connect this WooCommerce site to your Mockup100 tenant by entering `https://www.mockup100.com` and the tenant API key generated in your Mockup100 account.', 'mockup100-pod-customizer'); ?></p>
            <p><?php esc_html_e('For WordPress personal artwork uploads, configure OSS below so uploads stay bound to the current WordPress user without requiring a Mockup100 platform session.', 'mockup100-pod-customizer'); ?></p>
            <p><strong><?php esc_html_e('Connection Status:', 'mockup100-pod-customizer'); ?></strong> <?php echo esc_html($connection['message']); ?></p>
            <?php if (! empty($connection['detail'])) : ?>
                <p class="description"><?php echo esc_html($connection['detail']); ?></p>
            <?php endif; ?>

            <h2><?php esc_html_e('Mockup100 Service Status', 'mockup100-pod-customizer'); ?></h2>
            <div class="mockup100-token-panel" data-mockup100-token-panel>
                <div class="mockup100-token-summary">
                    <div class="mockup100-token-summary__item">
                        <span class="mockup100-token-summary__label"><?php esc_html_e('Tokens', 'mockup100-pod-customizer'); ?></span>
                        <span class="mockup100-token-summary__value" data-token-balance>—</span>
                    </div>
                    <div class="mockup100-token-summary__item">
                        <span class="mockup100-token-summary__label"><?php esc_html_e('Grading Subscription', 'mockup100-pod-customizer'); ?></span>
                        <span class="mockup100-token-summary__value" data-grading-tier>—</span>
                    </div>
                </div>
                <div class="mockup100-recharge-cards">
                    <div class="mockup100-recharge-card">
                        <h3><?php esc_html_e('Cloud Token Service', 'mockup100-pod-customizer'); ?></h3>
                        <p><?php
                        echo esc_html__('Open the Mockup100 service page to review available token packages for HD renders and premium artwork.', 'mockup100-pod-customizer');
                        ?></p>
                        <a class="button button-secondary" href="<?php echo esc_url($rechargeUrl); ?>" target="_blank" rel="noopener"><?php esc_html_e('Open token service page', 'mockup100-pod-customizer'); ?></a>
                    </div>
                    <div class="mockup100-recharge-card">
                        <h3><?php esc_html_e('Grading Service', 'mockup100-pod-customizer'); ?></h3>
                        <p><?php
                        echo esc_html__('Open the Mockup100 service page to review grading access for the optional external grading workflow.', 'mockup100-pod-customizer');
                        ?></p>
                        <a class="button button-secondary" href="<?php echo esc_url($gradingUrl); ?>" target="_blank" rel="noopener"><?php esc_html_e('Open grading service page', 'mockup100-pod-customizer'); ?></a>
                    </div>
                </div>
            </div>

            <form method="post" action="options.php">
                <?php
                settings_fields('mockup100_preview');
                do_settings_sections('mockup100-preview');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    private function sanitize_size($value): string {
        $normalized = preg_replace('/\s+/', '', (string) $value);
        $supported = ['512x512', '1024x1024', '2048x2048', '4096x4096'];
        if (in_array(strtolower($normalized), $supported, true)) {
            return strtolower($normalized);
        }

        return '1024x1024';
    }

    private function sanitize_base_url($value): string {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return 'https://www.mockup100.com';
        }

        return esc_url_raw($normalized);
    }

    private function sanitize_optional_base_url($value): string {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return '';
        }

        return esc_url_raw($normalized);
    }

    private function sanitize_endpoint($value): string {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return '';
        }
        // 0.5.1 (WP review §5.3): OSS endpoint 必须是合法 URL,统一走 esc_url_raw
        // 剥离危险协议 / HTML 标签,非法值返回空串让前端兜底校验提示。
        return esc_url_raw($normalized);
    }

    private function sanitize_storage_provider($value): string {
        return strtolower(trim((string) $value)) === 'oss' ? 'oss' : 'oss';
    }

    private function describe_connection_status(): array {
        if (! $this->api_proxy->is_configured()) {
            return [
                'message' => __('Missing API key.', 'mockup100-pod-customizer'),
                'detail' => __('Enter the tenant API key from your Mockup100 account to enable template sync.', 'mockup100-pod-customizer'),
            ];
        }

        try {
            $result = $this->api_proxy->list_templates(['page' => 1, 'size' => 1]);
            $records = isset($result['records']) && is_array($result['records']) ? $result['records'] : [];
            return [
                'message' => __('Connected', 'mockup100-pod-customizer'),
                'detail' => sprintf(
                    /* translators: %d is the number of visible templates in the first sync probe. */
                    __('Successfully reached Mockup100. Template probe returned %d record(s).', 'mockup100-pod-customizer'),
                    count($records)
                ),
            ];
        } catch (Throwable $exception) {
            return [
                'message' => __('Configured, but template sync failed.', 'mockup100-pod-customizer'),
                'detail' => $exception->getMessage(),
            ];
        }
    }
}
