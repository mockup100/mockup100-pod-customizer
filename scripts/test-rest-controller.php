<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__);
}

$GLOBALS['mockup100_registered_routes'] = [];

function register_rest_route(string $namespace, string $route, array $args): void {
    $GLOBALS['mockup100_registered_routes'][] = [
        'namespace' => $namespace,
        'route' => $route,
        'args' => $args,
    ];
}

function sanitize_text_field($value): string {
    return trim((string) preg_replace('/[\r\n\t]+/', ' ', (string) $value));
}

function sanitize_file_name($value): string {
    return trim((string) preg_replace('/[^A-Za-z0-9._-]+/', '-', (string) $value), '-');
}

function wp_json_encode($value): string {
    $encoded = json_encode($value, JSON_UNESCAPED_SLASHES);
    return $encoded === false ? '' : $encoded;
}

function untrailingslashit(string $value): string {
    return rtrim($value, '/');
}

function __($text, $domain = null): string {
    return (string) $text;
}

function esc_html__($text, $domain = null): string {
    return (string) $text;
}

function esc_html($text): string {
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

class WP_User {
    public int $ID = 101;
    public string $user_login = 'mockup100-user';
    public string $user_email = 'user@example.test';
    public string $display_name = 'Mockup100 User';

    public function exists(): bool {
        return true;
    }
}

function wp_get_current_user(): WP_User {
    return new WP_User();
}

function is_user_logged_in(): bool {
    return true;
}

function home_url(string $path = ''): string {
    return 'https://wp.mockup100.test/' . ltrim($path, '/');
}

function rest_url(string $path = ''): string {
    return 'https://wp.mockup100.test/wp-json/' . ltrim($path, '/');
}

function get_user_meta(int $user_id, string $key, bool $single = false) {
    if ($key === '_mockup100_artwork_licenses') {
        return ['art_paid'];
    }
    return [];
}

function update_user_meta(int $user_id, string $key, $value): bool {
    return true;
}

function wp_parse_url(string $url, int $component = -1) {
    return $component === -1 ? parse_url($url) : parse_url($url, $component);
}

function wp_create_nonce(string $action): string {
    return 'test-nonce-' . $action;
}

function add_query_arg(array $args, string $url): string {
    $separator = strpos($url, '?') === false ? '?' : '&';
    return $url . $separator . http_build_query($args);
}

function admin_url(string $path = ''): string {
    return 'https://wp.mockup100.test/wp-admin/' . ltrim($path, '/');
}

class WP_REST_Request implements ArrayAccess {
    private array $params = [];
    private string $body = '';

    public function __construct(string $method = 'GET', string $route = '') {
    }

    public function set_param(string $key, $value): void {
        $this->params[$key] = $value;
    }

    public function get_param(string $key) {
        return $this->params[$key] ?? null;
    }

    public function set_body(string $body): void {
        $this->body = $body;
    }

    public function get_body(): string {
        return $this->body;
    }

    #[\ReturnTypeWillChange]
    public function offsetExists($offset): bool {
        return array_key_exists((string) $offset, $this->params);
    }

    #[\ReturnTypeWillChange]
    public function offsetGet($offset) {
        return $this->params[(string) $offset] ?? null;
    }

    #[\ReturnTypeWillChange]
    public function offsetSet($offset, $value): void {
        $this->params[(string) $offset] = $value;
    }

    #[\ReturnTypeWillChange]
    public function offsetUnset($offset): void {
        unset($this->params[(string) $offset]);
    }
}

class WP_REST_Response {
    private $data;
    private int $status;

    public function __construct($data = null, int $status = 200) {
        $this->data = $data;
        $this->status = $status;
    }

    public function get_data() {
        return $this->data;
    }

    public function get_status(): int {
        return $this->status;
    }
}

class Mockup100_Api_Proxy {
    public function get_base_url(): string {
        return 'https://www.mockup100.com';
    }

    public function get_default_output_size(): string {
        return '1024x1024';
    }

    public function get_default_preview_size(): string {
        return '1024x1024';
    }
}

class Mockup100_Product_Binding {
    public function get_binding(int $product_id): array {
        return [];
    }

    public function get_bindings(int $product_id, int $variation_id = 0): array {
        return [];
    }
}

require_once __DIR__ . '/../includes/class-mockup100-rest-controller.php';

class FakeApiProxy extends Mockup100_Api_Proxy {
    public array $calls = [];
    public array $templateCatalog = [];
    public array $templateEditors = [];
    public array $previewDrafts = [
        'template_id' => 'tpl_default',
        'active_draft_id' => '',
        'records' => [],
    ];
    public array $previewOutputs = [
        'template_id' => 'tpl_default',
        'records' => [],
    ];
    public array $artworkLibrary = [
        'records' => [],
        'total' => 0,
        'page' => 1,
        'size' => 24,
    ];
    public array $artworkCategories = [];
    public array $artworkDetail = [];
    public array $artworkLicenses = [];
    public array $artworkLicenseDetail = [];
    public array $purchaseResponse = [];
    public array $composeResponse = [];
    public array $jobResultsResponse = [];
    public string $defaultOutputSize = '1024x1024';
    public string $defaultPreviewSize = '2048x2048';

    public function get_default_output_size(): string {
        return $this->defaultOutputSize;
    }

    public function get_default_preview_size(): string {
        return $this->defaultPreviewSize;
    }

    public function list_templates(array $filters = []): array {
        $this->calls['list_templates'][] = $filters;
        return ['records' => $this->templateCatalog];
    }

    public function list_all_templates(array $filters = []): array {
        $this->calls['list_all_templates'][] = $filters;
        return [
            'records' => $this->templateCatalog,
            'total' => count($this->templateCatalog),
            'page' => 1,
            'size' => count($this->templateCatalog),
            'pages' => 1,
        ];
    }

    public function build_template_categories(array $templates): array {
        $this->calls['build_template_categories'][] = $templates;
        $categories = [];
        foreach ($templates as $item) {
            if (! is_array($item) || empty($item['category_id'])) {
                continue;
            }
            $label = (string) ($item['category_path'] ?? $item['category_id']);
            $categories[(string) $item['category_id']] = [
                'category_id' => (string) $item['category_id'],
                'category_path' => $label,
                'label' => $label,
            ];
        }
        return array_values($categories);
    }

    public function template_editor(string $template_reference): array {
        $this->calls['template_editor'][] = $template_reference;
        return $this->templateEditors[$template_reference] ?? [];
    }

    public function list_artworks(array $query = []): array {
        $this->calls['list_artworks'][] = $query;
        return $this->artworkLibrary;
    }

    public function artwork_categories_tree(): array {
        $this->calls['artwork_categories_tree'][] = true;
        return $this->artworkCategories;
    }

    public function artwork_detail(string $artwork_id): array {
        $this->calls['artwork_detail'][] = $artwork_id;
        return $this->artworkDetail;
    }

    public function artwork_licenses(): array {
        $this->calls['artwork_licenses'][] = true;
        return $this->artworkLicenses;
    }

    public function artwork_license_detail(string $artwork_id): array {
        $this->calls['artwork_license_detail'][] = $artwork_id;
        return $this->artworkLicenseDetail;
    }

    public function purchase_artwork(string $artwork_id): array {
        $this->calls['purchase_artwork'][] = $artwork_id;
        return $this->purchaseResponse;
    }

    public function list_preview_drafts(string $template_id): array {
        $this->calls['list_preview_drafts'][] = $template_id;
        return $this->previewDrafts;
    }

    public function create_preview_draft(array $payload): array {
        $this->calls['create_preview_draft'][] = $payload;
        return [
            'draft_id' => 'draft_created_1',
            'template_id' => (string) ($payload['template_id'] ?? ''),
            'finished_product_code' => (string) ($payload['finished_product_code'] ?? ''),
        ];
    }

    public function update_preview_draft(string $draft_id, array $payload): array {
        $this->calls['update_preview_draft'][] = [
            'draft_id' => $draft_id,
            'payload' => $payload,
        ];
        return [
            'draft_id' => $draft_id,
            'template_id' => (string) ($payload['template_id'] ?? 'tpl_default'),
            'finished_product_code' => (string) ($payload['finished_product_code'] ?? ''),
            'active' => true,
        ];
    }

    public function delete_preview_draft(string $draft_id): array {
        $this->calls['delete_preview_draft'][] = $draft_id;
        return [
            'deleted' => true,
            'draft_id' => $draft_id,
        ];
    }

    public function list_preview_outputs(string $template_id, int $limit = 100): array {
        $this->calls['list_preview_outputs'][] = [
            'template_id' => $template_id,
            'limit' => $limit,
        ];
        return $this->previewOutputs;
    }

    public function create_preview_output(array $payload): array {
        $this->calls['create_preview_output'][] = $payload;
        return [
            'output_id' => 'output_created_1',
            'template_id' => (string) ($payload['template_id'] ?? ''),
        ];
    }

    public function delete_preview_output(string $output_id): array {
        $this->calls['delete_preview_output'][] = $output_id;
        return [
            'deleted' => true,
            'output_id' => $output_id,
        ];
    }

    public function compose_editor(array $fields, array $part_files, array $headers = []): array {
        $this->calls['compose_editor'][] = [
            'fields' => $fields,
            'part_files' => $part_files,
            'headers' => $headers,
        ];
        return $this->composeResponse;
    }

    public function job_status(string $job_id, array $headers = []): array {
        $this->calls['job_status'][] = [$job_id, $headers];
        return ['status' => 'COMPLETED'];
    }

    public function job_results(string $job_id, array $headers = []): array {
        $this->calls['job_results'][] = $job_id;
        return $this->jobResultsResponse;
    }
}

class FakeBinding extends Mockup100_Product_Binding {
    private array $binding;
    private array $bindings;

    public function __construct(array $binding, array $bindings) {
        $this->binding = $binding;
        $this->bindings = $bindings;
    }

    public function get_binding(int $product_id): array {
        return $this->binding;
    }

    public function get_bindings(int $product_id, int $variation_id = 0): array {
        return $this->bindings;
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

function route_exists(string $namespace, string $route): bool {
    foreach ($GLOBALS['mockup100_registered_routes'] as $registered) {
        if ($registered['namespace'] === $namespace && $registered['route'] === $route) {
            return true;
        }
    }
    return false;
}

function make_request(array $params = [], ?array $body = null): WP_REST_Request {
    $request = new WP_REST_Request();
    foreach ($params as $key => $value) {
        $request->set_param((string) $key, $value);
    }
    if ($body !== null) {
        $encoded = json_encode($body, JSON_UNESCAPED_SLASHES);
        $request->set_body($encoded === false ? '{}' : $encoded);
    }
    return $request;
}

function create_controller(FakeApiProxy $apiProxy): Mockup100_Rest_Controller {
    $binding = [
        'enabled' => true,
        'template_id' => 'tpl_default',
        'template_source' => 'repository',
        'template_label' => 'Default Template',
        'template_snapshot' => 'https://cdn.mockup100.test/default.png',
    ];
    $bindings = [
        [
            'template_id' => 'tpl_default',
            'template_source' => 'repository',
            'title' => 'Default Template',
            'cover_url' => 'https://cdn.mockup100.test/default.png',
        ],
        [
            'template_id' => 'tpl_market',
            'template_source' => 'marketplace',
            'title' => 'Marketplace Template',
            'cover_url' => 'https://cdn.mockup100.test/market.png',
        ],
    ];
    return new Mockup100_Rest_Controller($apiProxy, new FakeBinding($binding, $bindings));
}

function test_register_routes(): void {
    $GLOBALS['mockup100_registered_routes'] = [];
    $controller = create_controller(new FakeApiProxy());
    $controller->register_routes();

    $expectedRoutes = [
        '/admin/templates',
        '/product/(?P<product_id>\d+)/template',
        '/product/(?P<product_id>\d+)/workspace',
        '/product/(?P<product_id>\d+)/editor',
        '/product/(?P<product_id>\d+)/drafts',
        '/product/(?P<product_id>\d+)/drafts/(?P<draft_id>[^/]+)',
        '/product/(?P<product_id>\d+)/results',
        '/product/(?P<product_id>\d+)/results/(?P<output_id>[^/]+)',
        '/product/(?P<product_id>\d+)/preview',
        '/product/(?P<product_id>\d+)/design',
        '/product/(?P<product_id>\d+)/artworks',
        '/product/(?P<product_id>\d+)/artworks/categories/tree',
        '/product/(?P<product_id>\d+)/artworks/(?P<artwork_id>[^/]+)',
        '/product/(?P<product_id>\d+)/artworks/licenses',
        '/product/(?P<product_id>\d+)/artworks/licenses/(?P<artwork_id>[^/]+)',
        '/product/(?P<product_id>\d+)/artworks/(?P<artwork_id>[^/]+)/purchase',
    ];

    foreach ($expectedRoutes as $route) {
        assert_true(route_exists('mockup100/v1', $route), 'Missing route registration for ' . $route);
    }
}

function test_workspace_aggregates_open_api_payloads(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->templateEditors['tpl_market'] = [
        'template_id' => 'tpl_market',
        'parts' => [
            ['part_name' => 'front', 'part_label' => 'Front'],
        ],
        'colors' => [
            ['color_name' => 'black'],
        ],
        'views' => [
            ['view_name' => 'front'],
        ],
        'export_sizes' => ['1024x1024', '2048x2048'],
    ];
    $apiProxy->previewDrafts = [
        'template_id' => 'tpl_market',
        'active_draft_id' => 'draft_live_1',
        'records' => [
            [
                'draft_id' => 'draft_live_1',
                'draft_name' => 'Homepage draft',
                'preferences_json' => '{"_mockup100_wp_account_id":"wp:wp.mockup100.test:101"}',
            ],
        ],
    ];
    $apiProxy->previewOutputs = [
        'template_id' => 'tpl_market',
        'records' => [
            [
                'output_id' => 'output_live_1',
                'mode' => 'default|wp:203a1fadaafa',
                'preview_url' => 'https://cdn.mockup100.test/output-preview.png',
            ],
        ],
    ];
    $apiProxy->artworkLibrary = [
        'records' => [
            [
                'artwork_id' => 'art_paid',
                'commerce_type' => 'paid',
                'price_tokens' => 3,
            ],
        ],
        'total' => 1,
        'page' => 2,
        'size' => 12,
    ];
    $apiProxy->artworkCategories = [
        [
            'category_id' => 'cat_flowers',
            'name' => 'Flowers',
            'children' => [],
        ],
    ];
    $apiProxy->artworkLicenses = [
        [
            'artwork_id' => 'art_paid',
            'purchase_status' => 'completed',
            'unlocked' => true,
        ],
    ];

    $controller = create_controller($apiProxy);
    $request = make_request([
        'product_id' => 42,
        'variation_id' => 7,
        'template_id' => 'tpl_market',
        'scope' => 'tenant',
        'page' => 2,
        'size' => 12,
        'keyword' => ' floral ',
        'category_id' => 'cat_flowers',
    ]);

    $response = $controller->product_workspace($request);
    $payload = $response->get_data();

    assert_same(200, $response->get_status(), 'Workspace route should succeed');
    assert_same('tpl_market', $payload['selected_binding']['template_id'], 'Workspace should honor selected binding');
    assert_same('tpl_market', $payload['editor']['template_id'] ?? 'tpl_market', 'Workspace should load editor for selected template');
    assert_same('1024x1024', $payload['defaults']['output_size'], 'Workspace should expose default output size');
    assert_same('2048x2048', $payload['defaults']['preview_size'], 'Workspace should expose default preview size');
    assert_same('draft_live_1', $payload['drafts']['active_draft_id'], 'Workspace should include preview drafts');
    assert_same('output_live_1', $payload['results']['records'][0]['output_id'], 'Workspace should include preview outputs');
    assert_same('art_paid', $payload['artwork']['records'][0]['artwork_id'], 'Workspace should include artwork records');
    assert_same('completed', $payload['artwork']['license_map']['art_paid']['purchase_status'], 'Workspace should expose artwork license map');
    assert_same('tenant', $apiProxy->calls['list_artworks'][0]['scope'], 'Workspace should forward artwork scope');
    assert_same('floral', $apiProxy->calls['list_artworks'][0]['keyword'], 'Workspace should sanitize artwork keyword');
    assert_same('tpl_market', $apiProxy->calls['template_editor'][0], 'Workspace should request selected template editor');
    assert_same('tpl_market', $apiProxy->calls['list_preview_drafts'][0], 'Workspace should load preview drafts for selected template');
    assert_same('tpl_market', $apiProxy->calls['list_preview_outputs'][0]['template_id'], 'Workspace should load preview outputs for selected template');
}

function test_preview_state_routes_proxy_wordpress_bff_requests(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->previewDrafts = [
        'template_id' => 'tpl_market',
        'active_draft_id' => 'draft_live_1',
        'records' => [[
            'draft_id' => 'draft_live_1',
            'preferences_json' => '{"_mockup100_wp_account_id":"wp:wp.mockup100.test:101"}',
        ]],
    ];
    $apiProxy->previewOutputs = [
        'template_id' => 'tpl_market',
        'records' => [[
            'output_id' => 'output_live_1',
            'mode' => 'default|wp:203a1fadaafa',
        ]],
    ];
    $controller = create_controller($apiProxy);

    $listDraftsResponse = $controller->list_preview_drafts(make_request([
        'product_id' => 42,
        'template_id' => 'tpl_market',
    ]));
    $createDraftResponse = $controller->create_preview_draft(make_request(
        ['product_id' => 42],
        [
            'template_id' => 'tpl_market',
            'draft_name' => 'Draft From BFF',
        ]
    ));
    $updateDraftResponse = $controller->update_preview_draft(make_request(
        [
            'product_id' => 42,
            'draft_id' => 'draft_live_1',
        ],
        [
            'template_id' => 'tpl_market',
            'draft_name' => 'Renamed Draft',
            'set_active' => true,
        ]
    ));
    $listResultsResponse = $controller->list_preview_results(make_request([
        'product_id' => 42,
        'template_id' => 'tpl_market',
        'limit' => 50,
    ]));
    $createResultResponse = $controller->create_preview_result(make_request(
        ['product_id' => 42],
        [
            'template_id' => 'tpl_market',
            'mode' => 'default',
            'color' => 'black',
            'view' => 'front',
            'size' => '1024x1024',
            'file_path' => '/tmp/output.png',
            'preview_url' => 'https://cdn.mockup100.test/preview.png',
            'download_url' => 'https://cdn.mockup100.test/download.png',
        ]
    ));
    $deleteDraftResponse = $controller->delete_preview_draft(make_request([
        'product_id' => 42,
        'draft_id' => 'draft_live_1',
    ]));
    $deleteResultResponse = $controller->delete_preview_result(make_request([
        'product_id' => 42,
        'output_id' => 'output_live_1',
    ]));

    assert_same(200, $listDraftsResponse->get_status(), 'List drafts route should succeed');
    assert_same(200, $createDraftResponse->get_status(), 'Create draft route should succeed');
    assert_same(200, $updateDraftResponse->get_status(), 'Update draft route should succeed');
    assert_same(200, $listResultsResponse->get_status(), 'List results route should succeed');
    assert_same(200, $createResultResponse->get_status(), 'Create result route should succeed');
    assert_same(200, $deleteDraftResponse->get_status(), 'Delete draft route should succeed');
    assert_same(200, $deleteResultResponse->get_status(), 'Delete result route should succeed');

    assert_same('tpl_market', $apiProxy->calls['list_preview_drafts'][0], 'Draft list route should use selected template');
    assert_same('tpl_market', $apiProxy->calls['create_preview_draft'][0]['template_id'], 'Draft create route should normalize selected template');
    assert_same('wc-product-42', $apiProxy->calls['create_preview_draft'][0]['finished_product_code'], 'Draft create route should provide a stable finished product code');
    assert_same('draft_live_1', $apiProxy->calls['update_preview_draft'][0]['draft_id'], 'Draft update route should forward draft id');
    assert_same(true, $apiProxy->calls['update_preview_draft'][0]['payload']['set_active'], 'Draft update route should forward active flag');
    assert_same('wc-product-42', $apiProxy->calls['update_preview_draft'][0]['payload']['finished_product_code'], 'Draft update route should provide a stable finished product code');
    assert_same(50, $apiProxy->calls['list_preview_outputs'][0]['limit'], 'Result list route should forward result limit');
    assert_same('tpl_market', $apiProxy->calls['create_preview_output'][0]['template_id'], 'Result create route should normalize selected template');
    assert_same('draft_live_1', $apiProxy->calls['delete_preview_draft'][0], 'Draft delete route should forward draft id');
    assert_same('output_live_1', $apiProxy->calls['delete_preview_output'][0], 'Result delete route should forward output id');
}

function test_admin_templates_returns_categories_and_filters_records(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->templateCatalog = [
        [
            'template_id' => 'tpl_mug_1',
            'template_source' => 'repository',
            'display_name' => 'Basic Mug',
            'cover_url' => 'https://cdn.mockup100.test/mug.png',
            'category_id' => 'mugs',
            'category_path' => 'Drinkware / Mugs',
            'marketplace_status' => 'listed',
            'supported_output_sizes' => ['1024x1024'],
        ],
        [
            'template_id' => 'tpl_tee_1',
            'template_source' => 'marketplace',
            'display_name' => 'Classic Tee',
            'cover_url' => 'https://cdn.mockup100.test/tee.png',
            'category_id' => 'tshirts',
            'category_path' => 'Apparel / T-Shirts',
            'marketplace_status' => 'listed',
            'supported_output_sizes' => ['2048x2048'],
        ],
    ];

    $controller = create_controller($apiProxy);
    $request = make_request([
        'keyword' => 'tee',
        'category_id' => 'tshirts',
    ]);

    $response = $controller->search_templates($request);
    $payload = $response->get_data();

    assert_same(200, $response->get_status(), 'Admin templates route should succeed');
    assert_same(2, count($payload['categories']), 'Admin templates should expose aggregated categories');
    assert_same('tpl_tee_1', $payload['items'][0]['template_id'], 'Admin templates should filter by keyword and category');
    assert_same('https://cdn.mockup100.test/tee.png', $payload['items'][0]['cover_url'], 'Admin templates should keep absolute cover urls');
    assert_same('tshirts', $payload['query']['category_id'], 'Admin templates should echo category filter');
    assert_same('tee', $payload['query']['keyword'], 'Admin templates should echo keyword filter');
    assert_same('', $apiProxy->calls['list_all_templates'][0]['keyword'] ?? '', 'Admin templates should load full catalog once for local filtering');
}

function test_admin_templates_normalize_relative_cover_urls(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->templateCatalog = [[
        'template_id' => 'tpl_relative',
        'template_source' => 'repository',
        'display_name' => 'Relative Cover Template',
        'cover_url' => '/assets/templates/relative.png',
        'category_id' => 'mugs',
        'category_path' => 'Drinkware / Mugs',
        'marketplace_status' => 'listed',
        'supported_output_sizes' => ['1024x1024'],
    ]];

    $controller = create_controller($apiProxy);
    $response = $controller->search_templates(make_request());
    $payload = $response->get_data();

    assert_same(200, $response->get_status(), 'Admin templates route should succeed when cover url is relative');
    assert_same('https://www.mockup100.com/assets/templates/relative.png', $payload['items'][0]['cover_url'], 'Admin templates should normalize relative cover urls to the platform origin');
}

function test_prepare_design_builds_cart_payload_and_compose_request(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->composeResponse = [
        'job_id' => 'job_design_1',
        'outputs' => [
            [
                'preview_url' => 'https://cdn.mockup100.test/compose-preview.png',
                'download_url' => 'https://cdn.mockup100.test/compose-output.png',
            ],
        ],
    ];
    $apiProxy->jobResultsResponse = [
        'outputs' => [
            [
                'preview_url' => 'https://cdn.mockup100.test/job-preview.png',
                'download_url' => 'https://cdn.mockup100.test/job-output.png',
            ],
        ],
    ];

    $controller = create_controller($apiProxy);
    $request = make_request(
        ['product_id' => 42],
        [
            'template_id' => 'tpl_default',
            'variation_id' => 11,
            'selected_color' => 'black',
            'selected_view' => 'front',
            'output_size' => '2048x2048',
            'design_summary' => [
                'parts' => [
                    ['part_name' => 'front', 'layer_count' => 1],
                ],
            ],
            'parts' => [
                [
                    'name' => 'front',
                    'data_url' => 'data:image/png;base64,' . base64_encode('png-data'),
                ],
            ],
        ]
    );

    $response = $controller->submit_design($request);
    $payload = $response->get_data();
    $composeCall = $apiProxy->calls['compose_editor'][0];

    assert_same(200, $response->get_status(), 'Design route should succeed');
    assert_same('tpl_default', $composeCall['fields']['template_id'], 'Compose should use selected template id');
    assert_same('black', $composeCall['fields']['selected_color'], 'Compose should forward selected color');
    assert_same('front', $composeCall['fields']['selected_view'], 'Compose should forward selected view');
    assert_same('2048x2048', $composeCall['fields']['output_size'], 'Compose should forward output size');
    assert_same('{}', $composeCall['fields']['compose_overrides'], 'Compose should send empty overrides object by default');
    assert_same('front', $composeCall['fields']['part_names'], 'Compose should serialize part names');
    assert_same('front', $composeCall['part_files'][0]['name'], 'Compose should forward part file name');
    assert_same('image/png', $composeCall['part_files'][0]['type'], 'Compose should preserve part mime type');
    assert_same('png-data', $composeCall['part_files'][0]['content'], 'Compose should decode part payload');
    assert_same('job_design_1', $payload['cart_payload']['job_id'], 'Prepare route should include job id in cart payload');
    assert_same('repository', $payload['binding']['template_source'], 'Binding payload should remain available');
    assert_same('repository', $payload['cart_payload']['template_source'], 'Cart payload should use selected template source');
    assert_same('https://cdn.mockup100.test/compose-preview.png', $payload['cart_payload']['preview_url'], 'Prepare route should use compose outputs when they are returned inline');
    assert_true(empty($apiProxy->calls['job_results'] ?? []), 'Prepare route should skip job results when compose outputs are already available');
}

function test_invalid_template_selection_returns_bad_request(): void {
    $controller = create_controller(new FakeApiProxy());
    $request = make_request([
        'product_id' => 42,
        'template_id' => 'tpl_missing',
    ]);

    $response = $controller->product_workspace($request);
    $payload = $response->get_data();

    assert_same(400, $response->get_status(), 'Workspace should reject unavailable template ids');
    assert_same('Selected template is not available for this product.', $payload['message'], 'Workspace should expose selection error');
}

function test_artwork_purchase_route_proxies_external_purchase(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->purchaseResponse = [
        'artwork_id' => 'art_paid',
        'status' => 'completed',
        'price_tokens' => 3,
    ];
    $controller = create_controller($apiProxy);
    $request = make_request([
        'product_id' => 42,
        'artwork_id' => 'art_paid',
    ]);

    $response = $controller->purchase_artwork($request);
    $payload = $response->get_data();

    assert_same(200, $response->get_status(), 'Artwork purchase route should succeed');
    assert_same('art_paid', $apiProxy->calls['purchase_artwork'][0], 'Artwork purchase route should proxy artwork id');
    assert_same('completed', $payload['status'], 'Artwork purchase route should return proxy payload');
}

function test_artwork_detail_route_proxies_external_detail(): void {
    $apiProxy = new FakeApiProxy();
    $apiProxy->artworkDetail = [
        'artwork_id' => 'art_paid',
        'name' => 'Paid Floral',
        'unlocked' => true,
    ];
    $controller = create_controller($apiProxy);
    $request = make_request([
        'product_id' => 42,
        'artwork_id' => 'art_paid',
    ]);

    $response = $controller->artwork_detail($request);
    $payload = $response->get_data();

    assert_same(200, $response->get_status(), 'Artwork detail route should succeed');
    assert_same('art_paid', $apiProxy->calls['artwork_detail'][0], 'Artwork detail route should proxy artwork id');
    assert_same('Paid Floral', $payload['name'], 'Artwork detail route should return proxy payload');
}

$mockup100_tests = [
    'test_register_routes',
    'test_admin_templates_returns_categories_and_filters_records',
    'test_admin_templates_normalize_relative_cover_urls',
    'test_workspace_aggregates_open_api_payloads',
    'test_preview_state_routes_proxy_wordpress_bff_requests',
    'test_prepare_design_builds_cart_payload_and_compose_request',
    'test_invalid_template_selection_returns_bad_request',
    'test_artwork_detail_route_proxies_external_detail',
    'test_artwork_purchase_route_proxies_external_purchase',
];

foreach ($mockup100_tests as $mockup100_test) {
    $mockup100_test();
    fwrite(STDOUT, "PASS {$mockup100_test}\n");
}

fwrite(STDOUT, "All WordPress REST controller checks passed.\n");
