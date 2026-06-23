<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__);
}

$GLOBALS['mockup100_menu_pages'] = [];
$GLOBALS['mockup100_submenu_pages'] = [];
$GLOBALS['mockup100_meta_store'] = [];
$GLOBALS['mockup100_current_post_id'] = 0;
$GLOBALS['mockup100_posts'] = [];
$GLOBALS['mockup100_products'] = [];

function __($text, $domain = null): string {
    return (string) $text;
}

function esc_attr($value): string {
    return htmlspecialchars((string) $value, ENT_QUOTES);
}

function esc_attr__($value, $domain = null): string {
    return esc_attr($value);
}

function esc_html($value): string {
    return htmlspecialchars((string) $value, ENT_QUOTES);
}

function esc_html_e($value, $domain = null): void {
    echo esc_html($value);
}

function esc_html__($value, $domain = null): string {
    return esc_html($value);
}

function esc_url($value): string {
    return (string) $value;
}

function esc_url_raw($value): string {
    return trim((string) $value);
}

function selected($value, $option, $echo = true): string {
    return (string) $value === (string) $option ? 'selected="selected"' : '';
}

function checked($value, $option = true, $echo = true): string {
    return (string) $value === (string) $option ? 'checked="checked"' : '';
}

function sanitize_text_field($value): string {
    return trim((string) $value);
}

function sanitize_key($value): string {
    return strtolower((string) preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $value));
}

function wp_unslash($value): string {
    return (string) $value;
}

function wp_slash($value) {
    return $value;
}

function wp_json_encode($value): string {
    return json_encode($value);
}

function rest_url($path = ''): string {
    return 'https://shop.mockup100.test/wp-json/' . ltrim((string) $path, '/');
}

function wp_create_nonce($action): string {
    return 'nonce-demo';
}

function wp_nonce_field($action = -1, $name = '_wpnonce', $referer = true, $display = true): string {
    $field = '<input type="hidden" name="' . htmlspecialchars((string) $name, ENT_QUOTES, 'UTF-8') . '" value="nonce-demo" />';
    if ($display) {
        echo $field;
    }
    return $field;
}

function wp_enqueue_script($handle, $src = '', $deps = [], $ver = false, $inFooter = false): void {}
function wp_localize_script($handle, $objectName, $l10n): void {}
function wp_register_script($handle, $src = '', $deps = [], $ver = false, $inFooter = false): void {}
function wp_register_style($handle, $src = '', $deps = [], $ver = false): void {}
function wp_enqueue_style($handle, $src = '', $deps = [], $ver = false, $media = 'all'): void {}
function woocommerce_wp_checkbox(array $args): void {}
function woocommerce_wp_hidden_input(array $args): void {}
function get_post_meta(int $postId, string $key, bool $single = true) {
    return $GLOBALS['mockup100_meta_store'][$postId][$key] ?? '';
}
function update_post_meta(int $postId, string $key, $value): void {
    if (! isset($GLOBALS['mockup100_meta_store'][$postId])) {
        $GLOBALS['mockup100_meta_store'][$postId] = [];
    }
    $GLOBALS['mockup100_meta_store'][$postId][$key] = $value;
}

function add_action($hook, $callback, $priority = 10, $acceptedArgs = 1): void {}
function add_filter($hook, $callback, $priority = 10, $acceptedArgs = 1): void {}
function register_setting($group, $name, $args = []): void {}
function add_settings_section($id, $title, $callback, $page): void {}
function add_settings_field($id, $title, $callback, $page, $section = 'default', $args = []): void {}
function settings_fields($group): void {}
function do_settings_sections($page): void {}
function submit_button(): void {}
function home_url($path = ''): string { return 'https://shop.mockup100.test' . ($path ?: ''); }
function admin_url(string $path = ''): string { return 'https://shop.mockup100.test/wp-admin/' . ltrim($path, '/'); }
function wp_parse_url(string $url, int $component = -1) { return $component === -1 ? parse_url($url) : parse_url($url, $component); }
function add_query_arg(array $query, string $url): string { return $url . '?' . http_build_query($query); }
function apply_filters($hook, $value, ...$args) { return $value; }
function current_user_can($capability): bool { return true; }
function get_bloginfo($show = ''): string { return 'demo'; }
function is_admin(): bool { return false; }
function get_the_ID(): int { return (int) ($GLOBALS['mockup100_current_post_id'] ?? 0); }
function get_post_type($postId = null): string {
    $target = $postId ?: ($GLOBALS['mockup100_current_post_id'] ?? 0);
    return (string) ($GLOBALS['mockup100_posts'][$target]['post_type'] ?? '');
}
function wc_get_product(int $productId) {
    return $GLOBALS['mockup100_products'][$productId] ?? null;
}
function is_product(): bool { return false; }
function is_singular($postType = ''): bool { return $postType === 'product'; }

function add_menu_page($pageTitle, $menuTitle, $capability, $menuSlug, $callback = null, $iconUrl = '', $position = null): void {
    $GLOBALS['mockup100_menu_pages'][] = compact('pageTitle', 'menuTitle', 'capability', 'menuSlug');
}

function add_submenu_page($parentSlug, $pageTitle, $menuTitle, $capability, $menuSlug, $callback = null): void {
    $GLOBALS['mockup100_submenu_pages'][] = compact('parentSlug', 'pageTitle', 'menuTitle', 'capability', 'menuSlug');
}

class Mockup100_Api_Proxy {
    public const OPTION_KEY = 'mockup100_preview_settings';

    public function get_settings(): array {
        return [];
    }

    public function is_configured(): bool {
        return false;
    }

    public function get_base_url(): string {
        return 'https://www.mockup100.com';
    }

    public function list_templates(array $filters = []): array {
        return ['records' => []];
    }
}

class Mockup100_Cart_Meta {
    public const REQUEST_KEY = 'mockup100_design_payload';

    public function boot(): void {}
}

class Mockup100_Rest_Controller {
    public function __construct($api_proxy, $binding) {}

    public function boot(): void {}
}

class WC_Product {
    private int $id;
    private bool $variable;

    public function __construct(int $id, bool $variable = false) {
        $this->id = $id;
        $this->variable = $variable;
    }

    public function get_id(): int {
        return $this->id;
    }

    public function is_type(string $type): bool {
        return $type === 'variable' ? $this->variable : ! $this->variable;
    }
}

require_once __DIR__ . '/../includes/class-mockup100-settings.php';
require_once __DIR__ . '/../includes/class-mockup100-designer-page.php';
require_once __DIR__ . '/../includes/class-mockup100-product-binding.php';
require_once __DIR__ . '/../includes/class-mockup100-plugin.php';

define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION', '0.4.1');
define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL', 'https://shop.mockup100.test/wp-content/plugins/mockup100-preview/');

class FakeApiProxyForSettings extends Mockup100_Api_Proxy {
    public function get_settings(): array {
        return [];
    }
}

function assert_same($expected, $actual, string $label): void {
    if ($expected !== $actual) {
        throw new RuntimeException($label . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true));
    }
}

function assert_true($condition, string $label): void {
    if (! $condition) {
        throw new RuntimeException($label);
    }
}

function test_settings_registers_top_level_menu(): void {
    $GLOBALS['mockup100_menu_pages'] = [];
    $GLOBALS['mockup100_submenu_pages'] = [];
    $settings = new Mockup100_Settings(new FakeApiProxyForSettings());
    $settings->register_menu();

    assert_same('mockup100-preview', $GLOBALS['mockup100_menu_pages'][0]['menuSlug'], 'Settings should register a top-level Mockup100 menu');
    assert_same('mockup100-preview', $GLOBALS['mockup100_submenu_pages'][0]['parentSlug'], 'Settings should register a submenu under Mockup100');
}

function test_settings_default_to_www_base_url(): void {
    $settings = new Mockup100_Settings(new FakeApiProxyForSettings());
    $payload = $settings->sanitize_settings([
        'platform_base_url' => '',
        'tenant_api_key' => 'api_demo',
    ]);

    assert_same('https://www.mockup100.com', $payload['platform_base_url'], 'Settings should default to the www domain');
}

function test_designer_page_builds_query_url_and_form_payload_field(): void {
    $page = new Mockup100_Designer_Page(new Mockup100_Product_Binding(), new FakeApiProxyForSettings());
    $url = $page->build_url(42, 7, [
        'attribute_pa_size' => 'xl',
    ]);

    assert_true(strpos($url, 'mockup100_design=1') !== false, 'Designer URL should include design query flag');
    assert_true(strpos($url, 'product_id=42') !== false, 'Designer URL should include product id');
    assert_true(strpos($url, 'variation_id=7') !== false, 'Designer URL should include variation id');
    assert_true(strpos($url, 'attribute_pa_size=xl') !== false, 'Designer URL should forward variation attributes');

    assert_true(method_exists($page, 'maybe_render_page'), 'Designer page should expose the standalone renderer');
}

function test_product_binding_registers_product_list_column(): void {
    $binding = new Mockup100_Product_Binding();
    $columns = $binding->register_product_list_column([
        'cb' => '<input />',
        'name' => 'Name',
        'sku' => 'SKU',
        'is_in_stock' => 'Stock',
        'price' => 'Price',
    ]);

    assert_true(isset($columns['mockup100_template_binding']), 'Product list should include a Mockup100 template column');
    $keys = array_keys($columns);
    assert_same('name', $keys[1], 'Name column should remain before Mockup100 column');
    assert_same('mockup100_template_binding', $keys[2], 'Mockup100 column should appear right after name');
    assert_same('sku', $keys[3], 'SKU column should remain after Mockup100 column');
}

function test_product_binding_updates_bindings_and_renders_list_panel(): void {
    $GLOBALS['mockup100_meta_store'] = [];
    $binding = new Mockup100_Product_Binding();
    $result = $binding->update_product_bindings(55, [
        [
            'template_id' => 'tpl-55',
            'template_source' => 'tenant',
            'display_name' => 'Sneaker Template',
            'cover_url' => 'https://cdn.mockup100.test/tpl-55.png',
            'output_sizes' => ['1024x1024'],
        ],
        [
            'template_id' => 'tpl-66',
            'template_source' => 'marketplace',
            'display_name' => 'Second Template',
            'cover_url' => 'https://cdn.mockup100.test/tpl-66.png',
            'output_sizes' => ['2048x2048'],
        ],
    ], true);

    assert_true($result['enabled'] === true, 'Updating list bindings should store enabled state');
    assert_same('tpl-55', get_post_meta(55, Mockup100_Product_Binding::META_TEMPLATE_ID, true), 'Updating bindings should keep legacy template id in sync');
    assert_same(2, count($result['bindings']), 'Product binding should keep all selected templates per product');

    ob_start();
    $binding->render_product_list_column('mockup100_template_binding', 55);
    $html = (string) ob_get_clean();

    assert_true(strpos($html, 'mockup100-save-bindings') !== false, 'Product list column should render a save button');
    assert_true(strpos($html, 'Search enabled templates') !== false, 'Product list column should render template filters');
    assert_true(strpos($html, 'tpl-55') !== false, 'Product list column should include the stored binding payload');
    assert_true(strpos($html, 'Linked template: Sneaker Template') !== false, 'Product list column should show the single linked template label');
    assert_true(strpos($html, 'data-binding-list-summary="list-55"') !== false, 'Product list column should render a compact summary shell');
}

function test_product_binding_renders_editor_launcher_modal(): void {
    $GLOBALS['mockup100_meta_store'] = [];
    update_post_meta(77, Mockup100_Product_Binding::META_ENABLED, 'yes');
    update_post_meta(77, Mockup100_Product_Binding::META_TEMPLATE_BINDINGS, wp_json_encode([[
        'template_id' => 'tpl-editor',
        'title' => 'Editor Template',
        'template_source' => 'repository',
        'cover_url' => '',
        'output_sizes' => ['1024x1024'],
    ]]));

    $binding = new Mockup100_Product_Binding();
    ob_start();
    $binding->render_editor_launcher((object) [
        'ID' => 77,
        'post_type' => 'product',
    ]);
    $html = (string) ob_get_clean();

    assert_true(strpos($html, 'mockup100-editor-launcher') !== false, 'Product editor should render the launcher below the title');
    assert_true(strpos($html, 'mockup100-open-binding-modal') !== false, 'Product editor should render a visible Bind Template button');
    assert_true(strpos($html, 'data-binding-modal="product"') !== false, 'Product editor should render the binding modal');
    assert_true(strpos($html, 'Template Center') !== false, 'Product editor modal should expose the marketplace tab');
    assert_true(strpos($html, 'Linked template: Editor Template') !== false, 'Product editor should render a non-ambiguous linked template summary');
    assert_true(strpos($html, 'mockup100-binding-modal__filters') !== false, 'Product editor modal should render filter layout container');
    assert_true(strpos($html, 'mockup100-search-button') !== false, 'Product editor modal should render the search button separately from the input');
}

function test_product_binding_render_fields_show_mockup100_status(): void {
    global $post;
    $GLOBALS['mockup100_meta_store'] = [];
    $post = (object) ['ID' => 88];
    update_post_meta(88, Mockup100_Product_Binding::META_TEMPLATE_BINDINGS, wp_json_encode([[
        'template_id' => 'tpl-status',
        'title' => 'Status Template',
        'template_source' => 'repository',
        'cover_url' => 'https://cdn.mockup100.test/status.png',
        'output_sizes' => ['1024x1024'],
    ]]));

    $binding = new Mockup100_Product_Binding();
    ob_start();
    $binding->render_fields();
    $html = (string) ob_get_clean();

    assert_true(strpos($html, 'Mockup100') !== false, 'Product fields should render a Mockup100 field');
    assert_true(strpos($html, 'Connected: Status Template') !== false, 'Product fields should show current template association state');
}

function test_preview_page_renders_design_button_when_binding_exists(): void {
    $GLOBALS['mockup100_meta_store'] = [];
    $GLOBALS['mockup100_current_post_id'] = 31;
    $GLOBALS['mockup100_posts'][31] = ['post_type' => 'product'];
    $GLOBALS['mockup100_products'][31] = new WC_Product(31);
    $_GET['preview'] = 'true';

    $binding = new Mockup100_Product_Binding();
    $binding->update_product_bindings(31, [[
        'template_id' => 'fn028-svg--cc1f265d226f',
        'template_source' => 'repository',
        'display_name' => 'FN028',
        'cover_url' => 'https://cdn.mockup100.test/fn028.png',
    ]], true);

    $plugin = new Mockup100_Preview_Plugin();
    ob_start();
    $plugin->render_design_button();
    $html = (string) ob_get_clean();

    assert_true(strpos($html, 'mockup100-design-button') !== false, 'Preview page should render a Design button when the product is bound');
    assert_true(strpos($html, 'mockup100_design=1') !== false, 'Design button should link to the standalone designer page');
}

$mockup100_tests = [
    'test_settings_registers_top_level_menu',
    'test_settings_default_to_www_base_url',
    'test_designer_page_builds_query_url_and_form_payload_field',
    'test_product_binding_registers_product_list_column',
    'test_product_binding_updates_bindings_and_renders_list_panel',
    'test_product_binding_renders_editor_launcher_modal',
    'test_product_binding_render_fields_show_mockup100_status',
    'test_preview_page_renders_design_button_when_binding_exists',
];

foreach ($mockup100_tests as $mockup100_test) {
    $mockup100_test();
    fwrite(STDOUT, "PASS {$mockup100_test}\n");
}

fwrite(STDOUT, "All WordPress settings/designer checks passed.\n");
