<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Product_Binding {
    public const META_ENABLED = '_mockup100_enabled';
    public const META_TEMPLATE_BINDINGS = '_mockup100_template_bindings';
    public const META_TEMPLATE_ID = '_mockup100_template_id';
    public const META_TEMPLATE_CODE = '_mockup100_template_code';
    public const META_TEMPLATE_SOURCE = '_mockup100_template_source';
    public const META_TEMPLATE_LABEL = '_mockup100_template_label';
    public const META_TEMPLATE_SNAPSHOT = '_mockup100_template_snapshot';

    private ?Mockup100_Api_Proxy $api_proxy;
    private array $template_cover_cache = [];

    public function __construct(?Mockup100_Api_Proxy $api_proxy = null) {
        $this->api_proxy = $api_proxy;
    }

    public function boot(): void {
        if (! class_exists('WooCommerce')) {
            return;
        }

        add_action('edit_form_after_title', [$this, 'render_editor_launcher']);
        add_action('woocommerce_product_options_general_product_data', [$this, 'render_fields']);
        add_action('woocommerce_process_product_meta', [$this, 'save_fields']);
        add_action('woocommerce_product_after_variable_attributes', [$this, 'render_variation_fields'], 10, 3);
        add_action('woocommerce_save_product_variation', [$this, 'save_variation_fields'], 10, 2);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_head', [$this, 'render_admin_styles']);
        add_filter('manage_edit-product_columns', [$this, 'register_product_list_column']);
        add_action('manage_product_posts_custom_column', [$this, 'render_product_list_column'], 10, 2);
    }

    public function enqueue_assets(string $hook): void {
        global $post, $typenow;

        $isProductEditor = in_array($hook, ['post.php', 'post-new.php'], true)
            && $post
            && $post->post_type === 'product';
        $currentPostType = isset($_GET['post_type']) ? sanitize_key((string) wp_unslash($_GET['post_type'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- enqueue_assets 是 WP admin hook,只读 GET 决定是否注册资源,不写入业务数据
        $isProductList = $hook === 'edit.php' && ($currentPostType === 'product' || $typenow === 'product');
        if (! $isProductEditor && ! $isProductList) {
            return;
        }

        wp_enqueue_script(
            'mockup100-product-binding',
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL . 'assets/js/admin-product-binding.js',
            ['jquery'],
            MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION,
            true
        );
        wp_localize_script(
            'mockup100-product-binding',
            'MOCKUP100_PRODUCT_BINDING',
            [
                'restUrl' => esc_url_raw(rest_url('mockup100/v1/admin/templates')),
                'saveRestBase' => esc_url_raw(rest_url('mockup100/v1/admin/product')),
                'nonce' => wp_create_nonce('wp_rest'),
                'productBindingsMeta' => self::META_TEMPLATE_BINDINGS,
            ]
        );
    }

    public function render_editor_launcher($post): void {
        if (! $post || ! isset($post->post_type) || $post->post_type !== 'product') {
            return;
        }

        $this->render_admin_styles();
        $bindings = $this->get_product_bindings((int) $post->ID);
        echo '<div class="notice inline mockup100-editor-launcher">';
        echo '<p class="mockup100-editor-launcher__title"><strong>' . esc_html__('Mockup100 Template Binding', 'mockup100-pod-customizer') . '</strong></p>';
        echo '<div class="description mockup100-binding-summary mockup100-binding-summary--launcher" data-binding-summary="product">' . $this->build_binding_summary_markup($bindings) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 输出来源是 build_binding_summary_markup() 内部已用 esc_html/esc_attr 转义后拼接的 HTML 字符串
        echo '<p class="mockup100-editor-launcher__actions"><button type="button" class="button button-primary mockup100-open-binding-modal" data-binding-target="product">' . esc_html__('Bind Templates', 'mockup100-pod-customizer') . '</button></p>';
        echo '</div>';
        wp_nonce_field('mockup100_save_bindings', 'mockup100_bindings_nonce');
        $this->render_binding_modal('product', (int) $post->ID, $bindings);
    }

    public function register_product_list_column(array $columns): array {
        $result = [];
        foreach ($columns as $key => $label) {
            $result[$key] = $label;
            if ($key === 'name') {
                $result['mockup100_template_binding'] = __('Mockup100', 'mockup100-pod-customizer');
            }
        }
        if (! isset($result['mockup100_template_binding'])) {
            $result['mockup100_template_binding'] = __('Mockup100', 'mockup100-pod-customizer');
        }
        return $result;
    }

    public function render_product_list_column(string $column, int $post_id): void {
        if ($column !== 'mockup100_template_binding') {
            return;
        }

        $this->render_admin_styles();
        $target = 'list-' . $post_id;
        $bindings = $this->get_product_bindings($post_id);
        $summaryHtml = $this->build_binding_summary_markup($bindings, true);
        echo '<div class="mockup100-list-binding">';
        echo '<div class="mockup100-list-binding__summary" data-binding-list-summary="' . esc_attr($target) . '">' . $summaryHtml . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $summaryHtml 来源是 build_binding_summary_markup() 内部已用 esc_html/esc_attr 转义后拼接的 HTML 字符串
        echo '<details class="mockup100-list-binding-panel">';
        echo '<summary>' . esc_html__('Manage binding', 'mockup100-pod-customizer') . '</summary>';
        echo '<input type="hidden" data-binding-storage="' . esc_attr($target) . '" value="' . esc_attr(wp_json_encode($bindings)) . '" />';
        echo '<p>';
        echo '<select class="mockup100-template-category" data-binding-target="' . esc_attr($target) . '"><option value="">' . esc_html__('All categories', 'mockup100-pod-customizer') . '</option></select> ';
        echo '<input type="text" class="mockup100-template-search" data-binding-target="' . esc_attr($target) . '" placeholder="' . esc_attr__('Search enabled templates', 'mockup100-pod-customizer') . '" /> ';
        echo '<button type="button" class="button mockup100-search-button" data-binding-target="' . esc_attr($target) . '">' . esc_html__('Filter', 'mockup100-pod-customizer') . '</button>';
        echo '</p>';
        echo '<div class="mockup100-current-binding" data-binding-list="' . esc_attr($target) . '">' . $this->build_binding_summary_markup($bindings) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 输出来源是 build_binding_summary_markup() 内部已用 esc_html/esc_attr 转义后拼接的 HTML 字符串
        echo '<div class="mockup100-template-results" data-binding-results="' . esc_attr($target) . '"><p>' . esc_html__('Loading templates...', 'mockup100-pod-customizer') . '</p></div>';
        echo '<p><button type="button" class="button button-primary mockup100-save-bindings" data-binding-target="' . esc_attr($target) . '" data-product-id="' . esc_attr((string) $post_id) . '">' . esc_html__('Save bindings', 'mockup100-pod-customizer') . '</button></p>';
        echo '<p class="description" data-binding-status="' . esc_attr($target) . '"></p>';
        echo '</details>';
        echo '</div>';
    }

    public function render_admin_styles(): void {
        static $printed = false;
        if ($printed) {
            return;
        }
        if (! $this->should_render_admin_styles()) {
            return;
        }
        $printed = true;

        // 0.4.78 (Task 8.3): WP.org Plugin Check 不允许直接 echo `<style>`;
        // 改用 wp_register_style + wp_add_inline_style 把 admin CSS 走 WP enqueue 管道。
        $handle = 'mockup100-product-binding-admin';
        if (! wp_style_is($handle, 'registered')) {
            wp_register_style($handle, false, [], MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION);
        }
        if (! wp_style_is($handle, 'enqueued')) {
            wp_enqueue_style($handle);
        }
        wp_add_inline_style($handle, '
        .mockup100-editor-launcher{margin:12px 0 16px;padding:12px 16px;border-left:4px solid #2271b1;background:#f6fbff}
        .mockup100-editor-launcher__title{margin:0 0 8px}
        .mockup100-editor-launcher__actions{margin:0}
        .mockup100-binding-summary--launcher{margin:0 0 12px}
        .mockup100-binding-modal[hidden]{display:none!important}
        .mockup100-binding-modal{position:fixed;inset:0;z-index:100100}
        .mockup100-binding-modal__backdrop{position:absolute;inset:0;background:rgba(15,23,42,.45)}
        .mockup100-binding-modal__dialog{position:relative;max-width:980px;margin:48px auto;background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(15,23,42,.25);padding:20px;max-height:calc(100vh - 96px);overflow:auto}
        .mockup100-binding-modal__header,.mockup100-binding-modal__footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .mockup100-binding-modal__title{margin:0 0 6px}
        .mockup100-binding-modal__hint{margin:0;color:#50575e}
        .mockup100-binding-modal__filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.5fr) auto;gap:8px;margin:12px 0;align-items:center}
        .mockup100-binding-modal__filters .mockup100-template-category-level,.mockup100-binding-modal__filters .mockup100-template-search,.mockup100-binding-modal__filters .mockup100-search-button{width:100%;min-width:0}
        .mockup100-binding-modal__filters .mockup100-search-button{white-space:nowrap}
        .mockup100-template-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-height:420px;overflow:auto;padding:4px 0}
        .mockup100-template-option{display:flex;gap:12px;width:100%;text-align:left;padding:12px;border:1px solid #dcdcde;border-radius:8px;background:#fff;min-width:0}
        .mockup100-template-option.is-selected{border-color:#2271b1;background:#f0f6fc}
        .mockup100-template-option__cover{position:relative;display:flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:6px;background:#f6f7f7;overflow:hidden;flex:0 0 72px}
        .mockup100-template-option__cover img{width:72px;height:72px;object-fit:cover;border-radius:6px;background:#f6f7f7}
        .mockup100-template-option__lock,.mockup100-binding-card__lock{position:absolute;top:6px;right:6px;background:rgba(15,23,42,.65);color:#fff;border-radius:4px;padding:2px 5px;font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center;z-index:2;pointer-events:none}
        .mockup100-template-option__fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
        .mockup100-template-option__meta{display:flex;flex-direction:column;gap:4px;min-width:0}
        .mockup100-template-option__meta strong,.mockup100-template-option__meta code,.mockup100-template-option__meta small{overflow:hidden;text-overflow:ellipsis}
        .mockup100-template-pagination{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:12px}
        .mockup100-current-binding{margin:12px 0;padding:10px 12px;background:#f6f7f7;border-radius:6px}
        .mockup100-source-tab.is-active{background:#2271b1;border-color:#2271b1;color:#fff}
        .mockup100-binding-card{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:8px;background:#fff;border:1px solid #dcdcde}
        .mockup100-binding-card.is-compact{padding:8px 10px;background:#f6f7f7}
        .mockup100-binding-card__cover{display:flex;align-items:center;justify-content:center;width:64px;height:64px;flex:0 0 64px;border-radius:6px;background:#f0f1f1;overflow:hidden}
        .mockup100-binding-card.is-compact .mockup100-binding-card__cover{width:56px;height:56px;flex-basis:56px}
        .mockup100-binding-card__cover img{width:100%;height:100%;object-fit:cover}
        .mockup100-binding-card__fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:6px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;text-align:center}
        .mockup100-binding-card__body{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
        .mockup100-binding-card__title,.mockup100-binding-card__meta,.mockup100-binding-card__code{line-height:1.4;word-break:break-word}
        .mockup100-binding-card__title{font-size:13px}
        .mockup100-binding-card__meta,.mockup100-binding-card__code{color:#50575e}
        .mockup100-binding-empty{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:8px;background:#f6f7f7}
        .wp-list-table th.column-mockup100_template_binding,.wp-list-table td.column-mockup100_template_binding{width:360px;min-width:360px}
        .mockup100-list-binding{width:100%}
        .mockup100-list-binding__summary{margin-bottom:8px}
        .mockup100-list-binding-panel summary{cursor:pointer}
        @media (max-width: 960px){.mockup100-binding-modal__filters,.mockup100-template-results{grid-template-columns:1fr}}
        ');
    }

    private function should_render_admin_styles(): bool {
        if (! function_exists('get_current_screen')) {
            return false;
        }

        $screen = get_current_screen();
        if (! $screen) {
            return false;
        }

        if ($screen->post_type !== 'product') {
            return false;
        }

        return in_array($screen->base, ['edit', 'post', 'post-new'], true);
    }

    public function render_fields(): void {
        global $post;

        echo '<div class="options_group">';
        woocommerce_wp_hidden_input([
            'id' => self::META_TEMPLATE_ID,
            'value' => (string) get_post_meta($post->ID, self::META_TEMPLATE_ID, true),
        ]);
        woocommerce_wp_hidden_input([
            'id' => self::META_TEMPLATE_SOURCE,
            'value' => (string) get_post_meta($post->ID, self::META_TEMPLATE_SOURCE, true),
        ]);
        woocommerce_wp_hidden_input([
            'id' => self::META_TEMPLATE_LABEL,
            'value' => (string) get_post_meta($post->ID, self::META_TEMPLATE_LABEL, true),
        ]);
        woocommerce_wp_hidden_input([
            'id' => self::META_TEMPLATE_SNAPSHOT,
            'value' => (string) get_post_meta($post->ID, self::META_TEMPLATE_SNAPSHOT, true),
        ]);
        woocommerce_wp_hidden_input([
            'id' => self::META_TEMPLATE_BINDINGS,
            'value' => wp_json_encode($this->get_product_bindings($post->ID)),
        ]);
        $bindings = $this->get_product_bindings($post->ID);
        $boundLabel = $this->resolve_binding_label($bindings);
        echo '<p class="form-field"><label>' . esc_html__('Mockup100', 'mockup100-pod-customizer') . '</label>';
        /* translators: %s 表示已绑定模板的标签名 */
        $connectedText = ! empty($bindings) ? sprintf(__('Connected: %s', 'mockup100-pod-customizer'), $boundLabel) : __('Not connected', 'mockup100-pod-customizer');
        echo '<span>' . esc_html($connectedText) . '</span></p>';
        echo '<p class="form-field"><label>' . esc_html__('Template Binding', 'mockup100-pod-customizer') . '</label>';
        echo '<span>' . esc_html__('Use the Mockup100 panel below the product title to search and bind one or more templates for this product.', 'mockup100-pod-customizer') . '</span></p>';
        echo '</div>';
    }

    public function render_variation_fields($loop, $variation_data, $variation): void {
        $variation_id = (int) $variation->ID;
        $input_id = self::META_TEMPLATE_BINDINGS . '_' . $variation_id;
        echo '<div class="form-row form-row-full">';
        echo '<label><strong>' . esc_html__('Mockup100 Variation Bindings', 'mockup100-pod-customizer') . '</strong></label>';
        echo '<input type="hidden" class="mockup100-variation-bindings" name="' . esc_attr($input_id) . '" value="' . esc_attr(wp_json_encode($this->get_product_bindings($variation_id))) . '" />';
        echo '<select class="short mockup100-template-category" data-binding-target="variation-' . esc_attr((string) $variation_id) . '"><option value="">' . esc_html__('All categories', 'mockup100-pod-customizer') . '</option></select> ';
        echo '<input type="text" class="short mockup100-template-search" data-binding-target="variation-' . esc_attr((string) $variation_id) . '" placeholder="' . esc_attr__('Search enabled templates for this variation', 'mockup100-pod-customizer') . '" />';
        echo '<button type="button" class="button mockup100-search-button" data-binding-target="variation-' . esc_attr((string) $variation_id) . '">' . esc_html__('Filter', 'mockup100-pod-customizer') . '</button>';
        echo '<div class="mockup100-current-binding" data-binding-list="variation-' . esc_attr((string) $variation_id) . '">' . esc_html__('No variation templates selected', 'mockup100-pod-customizer') . '</div>';
        echo '<div class="mockup100-template-results" data-binding-results="variation-' . esc_attr((string) $variation_id) . '"><p>' . esc_html__('Loading templates...', 'mockup100-pod-customizer') . '</p></div>';
        echo '</div>';
    }

    private function render_binding_modal(string $target, int $post_id, array $bindings): void {
        echo '<div class="mockup100-binding-modal" data-binding-modal="' . esc_attr($target) . '" hidden>';
        echo '<div class="mockup100-binding-modal__backdrop" data-binding-close="' . esc_attr($target) . '"></div>';
        echo '<div class="mockup100-binding-modal__dialog" role="dialog" aria-modal="true" aria-label="' . esc_attr__('Bind Mockup100 Template', 'mockup100-pod-customizer') . '">';
        echo '<div class="mockup100-binding-modal__header">';
        echo '<div>';
        echo '<h2 class="mockup100-binding-modal__title">' . esc_html__('Bind Mockup100 Templates', 'mockup100-pod-customizer') . '</h2>';
        echo '<p class="mockup100-binding-modal__hint">' . esc_html__('Browse My Templates and Template Center templates, then save one or more bindings for this product.', 'mockup100-pod-customizer') . '</p>';
        echo '</div>';
        echo '<button type="button" class="button-link" data-binding-close="' . esc_attr($target) . '">' . esc_html__('Close', 'mockup100-pod-customizer') . '</button>';
        echo '</div>';
        echo '<input type="hidden" data-binding-storage="' . esc_attr($target) . '" value="' . esc_attr(wp_json_encode($bindings)) . '" />';
        echo '<div class="mockup100-binding-modal__tabs">';
        echo '<button type="button" class="button mockup100-source-tab is-active" data-binding-target="' . esc_attr($target) . '" data-template-source-filter="repository">' . esc_html__('My Templates', 'mockup100-pod-customizer') . '</button> ';
        echo '<button type="button" class="button mockup100-source-tab" data-binding-target="' . esc_attr($target) . '" data-template-source-filter="marketplace">' . esc_html__('Template Center', 'mockup100-pod-customizer') . '</button>';
        echo '</div>';
        echo '<div class="mockup100-binding-modal__filters">';
        echo '<select class="mockup100-template-category-level" data-level="1" data-binding-target="' . esc_attr($target) . '"><option value="">' . esc_html__('Level 1 Category', 'mockup100-pod-customizer') . '</option></select>';
        echo '<select class="mockup100-template-category-level" data-level="2" data-binding-target="' . esc_attr($target) . '"><option value="">' . esc_html__('Level 2 Category', 'mockup100-pod-customizer') . '</option></select>';
        echo '<select class="mockup100-template-category-level" data-level="3" data-binding-target="' . esc_attr($target) . '"><option value="">' . esc_html__('Level 3 Category', 'mockup100-pod-customizer') . '</option></select>';
        echo '<input type="text" class="regular-text mockup100-template-search" data-binding-target="' . esc_attr($target) . '" placeholder="' . esc_attr__('Search template name, code, or id', 'mockup100-pod-customizer') . '" />';
        echo '<button type="button" class="button mockup100-search-button" data-binding-target="' . esc_attr($target) . '">' . esc_html__('Search', 'mockup100-pod-customizer') . '</button>';
        echo '</div>';
        echo '<div class="mockup100-current-binding" data-binding-list="' . esc_attr($target) . '">' . $this->build_binding_summary_markup($bindings) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 输出来源是 build_binding_summary_markup() 内部已用 esc_html/esc_attr 转义后拼接的 HTML 字符串
        echo '<div class="mockup100-template-results" data-binding-results="' . esc_attr($target) . '"><p>' . esc_html__('Loading templates...', 'mockup100-pod-customizer') . '</p></div>';
        echo '<div class="mockup100-template-pagination" data-binding-pagination="' . esc_attr($target) . '"></div>';
        echo '<div class="mockup100-binding-modal__footer">';
        echo '<p class="description" data-binding-status="' . esc_attr($target) . '"></p>';
        echo '<div>';
        echo '<button type="button" class="button" data-binding-close="' . esc_attr($target) . '">' . esc_html__('Cancel', 'mockup100-pod-customizer') . '</button> ';
        echo '<button type="button" class="button button-primary mockup100-save-bindings" data-binding-target="' . esc_attr($target) . '" data-product-id="' . esc_attr((string) $post_id) . '">' . esc_html__('Save bindings', 'mockup100-pod-customizer') . '</button>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }

    private function build_binding_summary_markup(array $bindings, bool $compact = false): string {
        if (empty($bindings)) {
            return '<div class="mockup100-binding-empty"><strong>' . esc_html__('No Mockup100 template linked yet.', 'mockup100-pod-customizer') . '</strong><span>' . esc_html__('Bind one or more templates to show their template code and preview image.', 'mockup100-pod-customizer') . '</span></div>';
        }

        return $this->build_bound_binding_markup($bindings[0], $compact);
    }

    private function build_bound_binding_markup(array $binding, bool $compact = false): string {
        $label = (string) ($binding['display_name'] ?? ($binding['title'] ?? ($binding['template_id'] ?? __('Template', 'mockup100-pod-customizer'))));
        $templateCode = (string) ($binding['template_code'] ?? '');
        if ($templateCode === '') {
            $templateCode = $label !== '' ? $label : (string) ($binding['template_id'] ?? '');
        }
        $templateId = (string) ($binding['template_id'] ?? '');
        $sourceLabel = (string) (($binding['template_source'] ?? '') === 'marketplace' ? __('Template Center', 'mockup100-pod-customizer') : __('My Templates', 'mockup100-pod-customizer'));
        $coverUrl = $this->resolve_binding_display_cover_url($binding);
        $coverHtml = $coverUrl !== ''
            ? '<img src="' . esc_url($coverUrl) . '" alt="' . esc_attr($label) . '" loading="lazy" />'
            : '<span class="mockup100-binding-card__fallback">' . esc_html__('No Image', 'mockup100-pod-customizer') . '</span>';
        $templateIdHtml = $templateId !== '' && $templateId !== $templateCode
            ? '<span class="mockup100-binding-card__meta">' . esc_html__('Template ID:', 'mockup100-pod-customizer') . ' <code>' . esc_html($templateId) . '</code></span>'
            : '';

        return '<div class="mockup100-binding-card' . ($compact ? ' is-compact' : '') . '">'
            . '<div class="mockup100-binding-card__cover">' . $coverHtml . '</div>'
            . '<div class="mockup100-binding-card__body">'
            // translators: %s 表示模板的展示名称
            . '<strong class="mockup100-binding-card__title">' . esc_html(sprintf(__('Linked template: %s', 'mockup100-pod-customizer'), $label)) . '</strong>'
            . '<span class="mockup100-binding-card__code">' . esc_html__('Template code:', 'mockup100-pod-customizer') . ' <code>' . esc_html($templateCode) . '</code></span>'
            . $templateIdHtml
            . '<span class="mockup100-binding-card__meta">' . esc_html($sourceLabel) . '</span>'
            . '</div>'
            . '</div>';
    }

    public function save_fields(int $post_id): void {
        if (! isset($_POST['mockup100_bindings_nonce'])
            || ! wp_verify_nonce(sanitize_text_field(wp_unslash((string) $_POST['mockup100_bindings_nonce'])), 'mockup100_save_bindings')) {
            return;
        }
        if (! current_user_can('edit_post', $post_id)) {
            return;
        }
        // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- nonce 已在上方校验;此处为整段 JSON 字符串,后续 json_decode 后再做字段级 sanitize
        $raw = isset($_POST[self::META_TEMPLATE_BINDINGS]) ? wp_unslash($_POST[self::META_TEMPLATE_BINDINGS]) : '[]';
        if (! is_string($raw)) {
            $raw = '[]';
        }
        $decoded = json_decode($raw, true);
        $this->update_product_bindings($post_id, is_array($decoded) ? $decoded : []);
    }

    public function save_variation_fields(int $variation_id, int $index): void {
        if (! isset($_POST['mockup100_bindings_nonce'])
            || ! wp_verify_nonce(sanitize_text_field(wp_unslash((string) $_POST['mockup100_bindings_nonce'])), 'mockup100_save_bindings')) {
            return;
        }
        if (! current_user_can('edit_post', $variation_id)) {
            return;
        }
        $field = self::META_TEMPLATE_BINDINGS . '_' . $variation_id;
        // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- nonce 已在上方校验;此处为整段 JSON 字符串,后续 json_decode 后再做字段级 sanitize
        $raw = isset($_POST[$field]) ? wp_unslash($_POST[$field]) : '[]';
        if (! is_string($raw)) {
            $raw = '[]';
        }
        $decoded = json_decode($raw, true);
        $this->update_product_bindings($variation_id, is_array($decoded) ? $decoded : []);
    }

    public function update_product_bindings(int $entity_id, array $bindings, ?bool $enabled = null): array {
        $normalizedBindings = $this->normalize_bindings($bindings);
        update_post_meta($entity_id, self::META_TEMPLATE_BINDINGS, wp_slash(wp_json_encode($normalizedBindings)));
        if ($enabled !== null) {
            update_post_meta($entity_id, self::META_ENABLED, $enabled ? 'yes' : 'no');
        } else {
            update_post_meta($entity_id, self::META_ENABLED, ! empty($normalizedBindings) ? 'yes' : 'no');
        }

        $first = $normalizedBindings[0] ?? [];
        update_post_meta($entity_id, self::META_TEMPLATE_ID, (string) ($first['template_id'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_CODE, (string) ($first['template_code'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_SOURCE, (string) ($first['template_source'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_LABEL, (string) ($first['title'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_SNAPSHOT, (string) ($first['cover_url'] ?? ''));

        // 返回时立刻补齐 cover_display_url(走 admin proxy),保证前端保存草稿后无需刷新即能正确加载图片。
        $enrichedBindings = array_values(array_map(function (array $binding): array {
            return $this->repair_binding($binding);
        }, $normalizedBindings));

        return [
            'enabled' => get_post_meta($entity_id, self::META_ENABLED, true) === 'yes',
            'bindings' => $enrichedBindings,
        ];
    }

    public function get_binding(int $product_id): array {
        $bindings = $this->get_product_bindings($product_id);
        $first = $bindings[0] ?? [];
        return [
            'enabled' => get_post_meta($product_id, self::META_ENABLED, true) === 'yes',
            'template_id' => (string) ($first['template_id'] ?? get_post_meta($product_id, self::META_TEMPLATE_ID, true)),
            'template_code' => (string) ($first['template_code'] ?? get_post_meta($product_id, self::META_TEMPLATE_CODE, true)),
            'template_source' => (string) ($first['template_source'] ?? get_post_meta($product_id, self::META_TEMPLATE_SOURCE, true)),
            'template_label' => (string) ($first['display_name'] ?? ($first['title'] ?? get_post_meta($product_id, self::META_TEMPLATE_LABEL, true))),
            'template_snapshot' => (string) ($first['cover_url'] ?? ($first['template_snapshot'] ?? get_post_meta($product_id, self::META_TEMPLATE_SNAPSHOT, true))),
            'bindings' => $bindings,
        ];
    }

    public function get_bindings(int $product_id, int $variation_id = 0): array {
        if ($variation_id > 0) {
            $variationBindings = $this->get_product_bindings($variation_id);
            if (! empty($variationBindings)) {
                return $variationBindings;
            }
        }

        return $this->get_product_bindings($product_id);
    }

    public function list_published_bound_products(
        int $current_product_id = 0,
        string $category_id = '',
        string $keyword = '',
        int $page = 1,
        int $size = 24
    ): array {
        $page = max(1, $page);
        $size = max(1, min(100, $size));
        $queryArgs = [
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => $size,
            'paged' => $page,
            'orderby' => 'title',
            'order' => 'ASC',
            'fields' => 'ids',
        ];

        $normalizedKeyword = trim($keyword);
        if ($normalizedKeyword !== '') {
            $queryArgs['s'] = $normalizedKeyword;
        }

        $normalizedCategoryId = trim($category_id);
        if ($normalizedCategoryId !== '') {
            // include_children = true：选中父级分类时，子分类下挂的产品也要展示，对齐 artwork 三级分类的体验
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- 仅在管理界面拉取已绑定模板的产品列表
            $queryArgs['tax_query'] = [[
                'taxonomy' => 'product_cat',
                'field' => ctype_digit($normalizedCategoryId) ? 'term_id' : 'slug',
                'terms' => ctype_digit($normalizedCategoryId) ? [(int) $normalizedCategoryId] : [$normalizedCategoryId],
                'include_children' => true,
                'operator' => 'IN',
            ]];
        }

        $query = new WP_Query($queryArgs);
        $items = [];
        foreach ($query->posts as $postId) {
            $product = function_exists('wc_get_product') ? wc_get_product((int) $postId) : null;
            if (! $product instanceof WC_Product) {
                continue;
            }
            $summary = $this->build_published_bound_product_summary($product);
            if ($summary !== null) {
                $items[] = $summary;
            }
        }
        wp_reset_postdata();

        $currentItem = null;
        if ($current_product_id > 0) {
            $currentProduct = function_exists('wc_get_product') ? wc_get_product($current_product_id) : null;
            if ($currentProduct instanceof WC_Product) {
                $currentItem = $this->build_bound_product_summary($currentProduct, true);
            }
        }

        return [
            'current_product_id' => $current_product_id,
            'current' => $currentItem,
            'items' => $items,
            'total' => (int) $query->found_posts,
            'page' => $page,
            'size' => $size,
        ];
    }

    public function list_bound_product_categories(): array {
        $query = new WP_Query([
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'orderby' => 'title',
            'order' => 'ASC',
        ]);

        $counts = [];
        foreach ($query->posts as $postId) {
            $product = function_exists('wc_get_product') ? wc_get_product((int) $postId) : null;
            if (! $product instanceof WC_Product) {
                continue;
            }
            $terms = get_the_terms((int) $postId, 'product_cat');
            if (! is_array($terms)) {
                continue;
            }
            foreach ($terms as $term) {
                if (! $term instanceof WP_Term) {
                    continue;
                }
                $key = (string) $term->term_id;
                if (! isset($counts[$key])) {
                    $counts[$key] = [
                        'category_id' => $key,
                        'name' => $term->name,
                        'slug' => $term->slug,
                        'parent_id' => $term->parent > 0 ? (string) $term->parent : '',
                        'count' => 0,
                    ];
                }
                $counts[$key]['count']++;

                // 补全祖先链，确保前端能拼出完整 1/2/3 级层级
                // 即使祖先分类没有直接绑定产品，也需要作为分组节点出现在树中
                $ancestors = get_ancestors((int) $term->term_id, 'product_cat', 'taxonomy');
                if (is_array($ancestors)) {
                    foreach ($ancestors as $ancestorId) {
                        $ancestorTerm = get_term((int) $ancestorId, 'product_cat');
                        if (! $ancestorTerm instanceof WP_Term) {
                            continue;
                        }
                        $ancestorKey = (string) $ancestorTerm->term_id;
                        if (! isset($counts[$ancestorKey])) {
                            $counts[$ancestorKey] = [
                                'category_id' => $ancestorKey,
                                'name' => $ancestorTerm->name,
                                'slug' => $ancestorTerm->slug,
                                'parent_id' => $ancestorTerm->parent > 0 ? (string) $ancestorTerm->parent : '',
                                'count' => 0,
                            ];
                        }
                    }
                }
            }
        }
        wp_reset_postdata();

        uasort($counts, static function (array $left, array $right): int {
            return strcmp((string) $left['name'], (string) $right['name']);
        });

        return array_values($counts);
    }

    public function get_product_bindings(int $entity_id): array {
        $raw = get_post_meta($entity_id, self::META_TEMPLATE_BINDINGS, true);
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $normalized = array_values(array_filter(array_map([$this, 'normalize_binding'], $decoded)));
                return $this->repair_and_enrich_bindings($entity_id, $normalized);
            }
        }

        $legacyId = (string) get_post_meta($entity_id, self::META_TEMPLATE_ID, true);
        if ($legacyId === '') {
            return [];
        }

        return $this->repair_and_enrich_bindings($entity_id, [[
            'template_id' => $legacyId,
            'template_code' => (string) get_post_meta($entity_id, self::META_TEMPLATE_CODE, true),
            'template_source' => (string) get_post_meta($entity_id, self::META_TEMPLATE_SOURCE, true),
            'title' => (string) get_post_meta($entity_id, self::META_TEMPLATE_LABEL, true),
            'cover_url' => (string) get_post_meta($entity_id, self::META_TEMPLATE_SNAPSHOT, true),
        ]]);
    }

    private function sanitize_bindings_json(string $raw): string {
        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return '[]';
        }

        return wp_json_encode($this->normalize_bindings($decoded));
    }

    private function normalize_bindings(array $bindings): array {
        // 0.5.0 (Trialware-free Free Plugin §Trialware-free Free Plugin):
        // 移除原 array_slice(..., 0, 1) 的硬截断,允许商品保留任意数量的 template binding。
        // 历史 array_slice 属于 spec 列出的 quantity-throttle trialware 模式。
        return array_values(array_filter(array_map([$this, 'normalize_binding'], $bindings)));
    }

    private function normalize_binding($item): array {
        if (! is_array($item) || empty($item['template_id'])) {
            return [];
        }

        return [
            'template_id' => sanitize_text_field((string) $item['template_id']),
            'template_code' => sanitize_text_field((string) ($item['template_code'] ?? '')) ?: sanitize_text_field((string) ($item['template_id'] ?? '')),
            'template_source' => sanitize_text_field((string) ($item['template_source'] ?? '')),
            'title' => sanitize_text_field((string) ($item['display_name'] ?? ($item['title'] ?? $item['template_label'] ?? ''))),
            'cover_url' => $this->normalize_binding_cover_url($item),
            'output_sizes' => isset($item['output_sizes']) && is_array($item['output_sizes'])
                ? array_values(array_map('sanitize_text_field', $item['output_sizes']))
                : [],
        ];
    }

    private function resolve_binding_label(array $bindings): string {
        $first = $bindings[0] ?? [];
        return (string) ($first['display_name'] ?? ($first['title'] ?? ($first['template_id'] ?? __('Template', 'mockup100-pod-customizer'))));
    }

    private function normalize_binding_cover_url(array $item): string {
        $candidates = [
            $item['cover_url'] ?? '',
            $item['template_snapshot'] ?? '',
            $item['preview_url'] ?? '',
            $item['original_url'] ?? '',
            $item['thumbnail_url'] ?? '',
            $item['image_url'] ?? '',
        ];

        foreach ($candidates as $candidate) {
            $url = $this->sanitize_binding_cover_candidate((string) $candidate);
            if ($url !== '') {
                return $url;
            }
        }

        return '';
    }

    private function repair_and_enrich_bindings(int $entity_id, array $bindings): array {
        if (empty($bindings)) {
            return [];
        }

        $repairedBindings = [];
        $shouldPersist = false;

        foreach ($bindings as $binding) {
            $repaired = $this->repair_binding($binding);
            if ($this->binding_persistent_payload($repaired) !== $this->binding_persistent_payload($binding)) {
                $shouldPersist = true;
            }
            $repairedBindings[] = $repaired;
        }

        if ($shouldPersist) {
            $this->persist_repaired_bindings($entity_id, $repairedBindings);
        }

        return $repairedBindings;
    }

    private function repair_binding(array $binding): array {
        $templateId = (string) ($binding['template_id'] ?? '');
        if ($templateId === '') {
            return $binding;
        }

        $coverUrl = $this->normalize_binding_cover_url($binding);
        if ($this->binding_needs_cover_refresh($templateId, $coverUrl)) {
            $templateData = $this->fetch_template_cover_data($templateId);
            if (! empty($templateData['cover_url'])) {
                $coverUrl = (string) $templateData['cover_url'];
                $binding['cover_url'] = $coverUrl;
            }
            if (! empty($templateData['template_code'])) {
                $binding['template_code'] = (string) $templateData['template_code'];
            }
            if (! empty($templateData['title']) && empty($binding['title'])) {
                $binding['title'] = (string) $templateData['title'];
            }
            if (! empty($templateData['template_source']) && empty($binding['template_source'])) {
                $binding['template_source'] = (string) $templateData['template_source'];
            }
        }

        $binding['cover_url'] = $coverUrl;
        $binding['cover_display_url'] = $this->build_admin_image_proxy_url($coverUrl);
        if ($binding['cover_display_url'] === '') {
            unset($binding['cover_display_url']);
        }

        return $binding;
    }

    private function binding_needs_cover_refresh(string $templateId, string $coverUrl): bool {
        if ($templateId === '') {
            return false;
        }

        if ($coverUrl === '') {
            return true;
        }

        return preg_match('/color_(?:u[0-9a-f]{4})+/i', $coverUrl) === 1;
    }

    private function fetch_template_cover_data(string $templateId): array {
        if ($templateId === '' || ! $this->api_proxy instanceof Mockup100_Api_Proxy || ! $this->api_proxy->is_configured()) {
            return [];
        }

        if (array_key_exists($templateId, $this->template_cover_cache)) {
            return $this->template_cover_cache[$templateId];
        }

        try {
            $payload = $this->api_proxy->template_detail($templateId);
            $displayName = sanitize_text_field((string) ($payload['display_name'] ?? ($payload['title'] ?? '')));
            $result = [
                'template_id' => sanitize_text_field((string) ($payload['template_id'] ?? $templateId)),
                'template_code' => sanitize_text_field((string) ($payload['template_code'] ?? '')),
                'template_source' => sanitize_text_field((string) ($payload['template_source'] ?? '')),
                'title' => $displayName,
                'cover_url' => $this->normalize_public_asset_url(
                    (string) ($payload['cover_url'] ?? ($payload['template_snapshot'] ?? ($payload['preview_url'] ?? ($payload['original_url'] ?? ($payload['thumbnail_url'] ?? ($payload['image_url'] ?? ''))))))
                ),
            ];
            $this->template_cover_cache[$templateId] = $result;
        } catch (Throwable $exception) {
            $this->template_cover_cache[$templateId] = [];
        }

        return $this->template_cover_cache[$templateId];
    }

    private function persist_repaired_bindings(int $entity_id, array $bindings): void {
        $persistentBindings = array_values(array_map(function (array $binding): array {
            return $this->binding_persistent_payload($binding);
        }, $bindings));

        update_post_meta($entity_id, self::META_TEMPLATE_BINDINGS, wp_slash(wp_json_encode($persistentBindings)));

        $first = $persistentBindings[0] ?? [];
        update_post_meta($entity_id, self::META_TEMPLATE_ID, (string) ($first['template_id'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_CODE, (string) ($first['template_code'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_SOURCE, (string) ($first['template_source'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_LABEL, (string) ($first['title'] ?? ''));
        update_post_meta($entity_id, self::META_TEMPLATE_SNAPSHOT, (string) ($first['cover_url'] ?? ''));
    }

    private function binding_persistent_payload(array $binding): array {
        return [
            'template_id' => sanitize_text_field((string) ($binding['template_id'] ?? '')),
            'template_code' => sanitize_text_field((string) ($binding['template_code'] ?? '')),
            'template_source' => sanitize_text_field((string) ($binding['template_source'] ?? '')),
            'title' => sanitize_text_field((string) ($binding['title'] ?? '')),
            'cover_url' => $this->sanitize_binding_cover_candidate((string) ($binding['cover_url'] ?? '')),
            'output_sizes' => isset($binding['output_sizes']) && is_array($binding['output_sizes'])
                ? array_values(array_map('sanitize_text_field', $binding['output_sizes']))
                : [],
        ];
    }

    private function sanitize_binding_cover_candidate(string $candidate): string {
        $url = trim($candidate);
        if ($url === '') {
            return '';
        }

        $url = str_replace(' ', '%20', $url);
        if (preg_match('#^https?://#i', $url) === 1) {
            return $url;
        }

        if (preg_match('#^[a-z][a-z0-9+\-.]*:#i', $url) === 1) {
            return '';
        }

        return $url;
    }

    private function normalize_public_asset_url(string $url): string {
        $normalized = trim($url);
        if ($normalized === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $normalized) === 1) {
            return $normalized;
        }

        if (! $this->api_proxy instanceof Mockup100_Api_Proxy) {
            return '';
        }

        return untrailingslashit($this->api_proxy->get_base_url()) . '/' . ltrim($normalized, '/');
    }

    private function build_admin_image_proxy_url(string $url): string {
        $normalized = $this->normalize_public_asset_url($url);
        if ($normalized === '' || ! $this->is_allowed_admin_asset_url($normalized)) {
            return '';
        }

        return add_query_arg([
            'action' => 'mockup100_template_cover',
            'url' => $normalized,
            '_wpnonce' => wp_create_nonce('mockup100_template_cover'),
        ], admin_url('admin-ajax.php'));
    }

    private function is_allowed_admin_asset_url(string $url): bool {
        $parts = wp_parse_url($url);
        if (! is_array($parts)) {
            return false;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($host === '') {
            return false;
        }

        if (! $this->api_proxy instanceof Mockup100_Api_Proxy) {
            return false;
        }

        $baseHost = strtolower((string) wp_parse_url($this->api_proxy->get_base_url(), PHP_URL_HOST));
        if ($baseHost === '') {
            return false;
        }

        if ($host === $baseHost) {
            return true;
        }

        $baseRoot = $this->host_root_domain($baseHost);
        $assetRoot = $this->host_root_domain($host);
        return $baseRoot !== '' && $baseRoot === $assetRoot;
    }

    private function host_root_domain(string $host): string {
        $normalized = trim(strtolower($host), '.');
        if ($normalized === '') {
            return '';
        }

        $parts = array_values(array_filter(explode('.', $normalized), static fn ($item) => $item !== ''));
        $count = count($parts);
        if ($count <= 2) {
            return $normalized;
        }

        return $parts[$count - 2] . '.' . $parts[$count - 1];
    }

    private function resolve_binding_display_cover_url(array $item): string {
        $coverUrl = $this->normalize_binding_cover_url($item);
        if ($this->binding_needs_cover_refresh((string) ($item['template_id'] ?? ''), $coverUrl)) {
            $item = $this->repair_binding($item);
            $coverUrl = (string) ($item['cover_url'] ?? '');
        }
        if ($coverUrl === '') {
            return '';
        }

        if (! empty($item['cover_display_url'])) {
            return esc_url_raw((string) $item['cover_display_url']);
        }

        $proxyUrl = $this->build_admin_image_proxy_url($coverUrl);
        if ($proxyUrl !== '') {
            return $proxyUrl;
        }

        return $coverUrl;
    }

    private function build_published_bound_product_summary(WC_Product $product): ?array {
        return $this->build_bound_product_summary($product, false);
    }

    private function build_bound_product_summary(WC_Product $product, bool $allowUnpublished = false): ?array {
        $productId = $product->get_id();
        if ($productId <= 0) {
            return null;
        }
        $status = (string) get_post_status($productId);
        if (! $allowUnpublished && $status !== 'publish') {
            return null;
        }
        $binding = $this->get_binding($productId);

        $terms = get_the_terms($productId, 'product_cat');
        $categoryIds = [];
        $categoryNames = [];
        $categorySlugs = [];
        if (is_array($terms)) {
            foreach ($terms as $term) {
                if (! $term instanceof WP_Term) {
                    continue;
                }
                // 过滤掉默认的 Uncategorized 分类，避免在前端重复展示
                if ($term->slug === 'uncategorized') {
                    continue;
                }
                $categoryIds[] = (string) $term->term_id;
                $categoryNames[] = $term->name;
                $categorySlugs[] = $term->slug;
            }
        }

        $imageId = $product->get_image_id();
        $imageUrl = '';
        if ($imageId > 0) {
            // 依次尝试 woocommerce_thumbnail / woocommerce_single / medium / full，避免某尺寸不存在返回 false
            foreach (['woocommerce_thumbnail', 'woocommerce_single', 'medium_large', 'medium', 'full'] as $size) {
                $candidate = wp_get_attachment_image_url($imageId, $size);
                if (is_string($candidate) && $candidate !== '') {
                    $imageUrl = $candidate;
                    break;
                }
            }
            if ($imageUrl === '') {
                $candidate = wp_get_attachment_url($imageId);
                if (is_string($candidate)) {
                    $imageUrl = $candidate;
                }
            }
        }
        $galleryImageIds = method_exists($product, 'get_gallery_image_ids') ? $product->get_gallery_image_ids() : [];
        // fallback：主图为空时，尝试从 gallery 第一张图取
        if ($imageUrl === '' && is_array($galleryImageIds)) {
            foreach ($galleryImageIds as $gid) {
                $gid = (int) $gid;
                if ($gid <= 0) {
                    continue;
                }
                foreach (['woocommerce_thumbnail', 'woocommerce_single', 'medium_large', 'medium', 'full'] as $size) {
                    $candidate = wp_get_attachment_image_url($gid, $size);
                    if (is_string($candidate) && $candidate !== '') {
                        $imageUrl = $candidate;
                        break 2;
                    }
                }
                $candidate = wp_get_attachment_url($gid);
                if (is_string($candidate) && $candidate !== '') {
                    $imageUrl = $candidate;
                    break;
                }
            }
        }
        // fallback：仍为空时使用 WooCommerce 占位图
        if ($imageUrl === '' && function_exists('wc_placeholder_img_src')) {
            $candidate = wc_placeholder_img_src('woocommerce_thumbnail');
            if (is_string($candidate) && $candidate !== '') {
                $imageUrl = $candidate;
            }
        }
        $galleryImages = [];
        if (is_array($galleryImageIds)) {
            foreach ($galleryImageIds as $galleryImageId) {
                $galleryUrl = '';
                foreach (['woocommerce_thumbnail', 'woocommerce_single', 'medium_large', 'medium', 'full'] as $size) {
                    $candidate = wp_get_attachment_image_url((int) $galleryImageId, $size);
                    if (is_string($candidate) && $candidate !== '') {
                        $galleryUrl = $candidate;
                        break;
                    }
                }
                if ($galleryUrl === '') {
                    $candidate = wp_get_attachment_url((int) $galleryImageId);
                    if (is_string($candidate)) {
                        $galleryUrl = $candidate;
                    }
                }
                if ($galleryUrl !== '') {
                    $galleryImages[] = $galleryUrl;
                }
            }
        }
        $tags = get_the_terms($productId, 'product_tag');
        $tagNames = [];
        if (is_array($tags)) {
            foreach ($tags as $tag) {
                if (! $tag instanceof WP_Term) {
                    continue;
                }
                $tagNames[] = $tag->name;
            }
        }
        $attributeItems = [];
        foreach ($product->get_attributes() as $attribute) {
            if (! $attribute instanceof WC_Product_Attribute) {
                continue;
            }
            $options = [];
            if ($attribute->is_taxonomy()) {
                $terms = wc_get_product_terms($productId, $attribute->get_name(), ['fields' => 'names']);
                if (is_array($terms)) {
                    $options = array_values(array_filter(array_map('strval', $terms)));
                }
            } else {
                $options = array_values(array_filter(array_map('strval', $attribute->get_options())));
            }
            $attributeItems[] = [
                'name' => wc_attribute_label($attribute->get_name(), $product),
                'options' => $options,
                'visible' => (bool) $attribute->get_visible(),
                'variation' => (bool) $attribute->get_variation(),
                // 0.4.43: 同时返回 raw key (taxonomy slug 或 slugified label),
                // 前端 add_to_cart 走 attribute_<key> 时必须用这个 key,不能再用 label 的 slug
                'raw_name' => $attribute->get_name(),
                'attribute_key' => 'attribute_' . sanitize_title($attribute->get_name()),
            ];
        }

        // 0.4.43: 可变商品 — 输出 variations 矩阵供前端 add_to_cart 时匹配 variation_id
        $variations = [];
        if ($product instanceof WC_Product_Variable) {
            $children = $product->get_available_variations();
            if (is_array($children)) {
                foreach ($children as $child) {
                    if (! is_array($child)) {
                        continue;
                    }
                    $rawAttrs = isset($child['attributes']) && is_array($child['attributes']) ? $child['attributes'] : [];
                    $normalizedAttrs = [];
                    foreach ($rawAttrs as $attrKey => $attrVal) {
                        // WooCommerce 输出形如 'attribute_pa_color' => 'red',统一保留 lower-cased key
                        $normalizedAttrs[strtolower((string) $attrKey)] = (string) $attrVal;
                    }
                    $variations[] = [
                        'variation_id' => (int) ($child['variation_id'] ?? 0),
                        'attributes' => $normalizedAttrs,
                        'is_in_stock' => (bool) ($child['is_in_stock'] ?? true),
                        'is_purchasable' => (bool) ($child['is_purchasable'] ?? true),
                        // 0.4.64: 透传 variation 价格,Place Order 弹窗按 variation 单价显示
                        'price' => isset($child['display_price']) ? (string) $child['display_price'] : '',
                        'regular_price' => isset($child['display_regular_price']) ? (string) $child['display_regular_price'] : '',
                        'price_html' => isset($child['price_html']) ? (string) $child['price_html'] : '',
                    ];
                }
            }
        }

        return [
            'product_id' => $productId,
            'name' => $product->get_name(),
            'post_status' => $status,
            'slug' => get_post_field('post_name', $productId),
            'permalink' => get_permalink($productId),
            'image_url' => is_string($imageUrl) ? $imageUrl : '',
            'gallery_images' => array_values(array_unique(array_filter($galleryImages))),
            'sku' => (string) $product->get_sku(),
            'product_type' => (string) $product->get_type(),
            'catalog_visibility' => (string) $product->get_catalog_visibility(),
            'stock_status' => (string) $product->get_stock_status(),
            'stock_quantity' => $product->managing_stock() ? $product->get_stock_quantity() : null,
            'price' => (string) $product->get_price(),
            'regular_price' => (string) $product->get_regular_price(),
            'sale_price' => (string) $product->get_sale_price(),
            'price_html' => (string) $product->get_price_html(),
            'description' => wp_strip_all_tags((string) $product->get_description()),
            'short_description' => wp_strip_all_tags((string) $product->get_short_description()),
            'category_ids' => array_values(array_unique(array_filter($categoryIds))),
            'category_names' => array_values(array_unique(array_filter($categoryNames))),
            'category_slugs' => array_values(array_unique(array_filter($categorySlugs))),
            'tag_names' => array_values(array_unique(array_filter($tagNames))),
            'attributes' => $attributeItems,
            'variations' => $variations,
            'has_template_binding' => ! empty($binding['bindings']),
            'design_enabled' => (bool) ($binding['enabled'] ?? false),
            'binding' => [
                'template_id' => (string) ($binding['template_id'] ?? ''),
                'template_code' => (string) ($binding['template_code'] ?? ''),
                'template_label' => (string) ($binding['template_label'] ?? ''),
                'template_snapshot' => (string) ($binding['template_snapshot'] ?? ''),
            ],
        ];
    }

    private function published_bound_product_matches_filters(array $item, string $categoryId, string $keyword): bool {
        if ($categoryId !== '') {
            $categoryIds = isset($item['category_ids']) && is_array($item['category_ids']) ? $item['category_ids'] : [];
            $categorySlugs = isset($item['category_slugs']) && is_array($item['category_slugs']) ? $item['category_slugs'] : [];
            if (! in_array($categoryId, $categoryIds, true) && ! in_array($categoryId, $categorySlugs, true)) {
                return false;
            }
        }

        $normalizedKeyword = function_exists('mb_strtolower')
            ? mb_strtolower($keyword)
            : strtolower($keyword);
        if ($normalizedKeyword === '') {
            return true;
        }

        $haystack = implode(' ', [
            (string) ($item['name'] ?? ''),
            (string) ($item['slug'] ?? ''),
            (string) ($item['short_description'] ?? ''),
            (string) (($item['binding']['template_code'] ?? '')),
            (string) (($item['binding']['template_label'] ?? '')),
            (string) (($item['binding']['template_id'] ?? '')),
        ]);
        $normalizedHaystack = function_exists('mb_strtolower')
            ? mb_strtolower($haystack)
            : strtolower($haystack);

        return strpos($normalizedHaystack, $normalizedKeyword) !== false;
    }
}
