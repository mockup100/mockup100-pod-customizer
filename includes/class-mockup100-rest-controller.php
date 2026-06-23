<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Rest_Controller
{
    private const USER_UPLOADS_META_KEY = '_mockup100_uploaded_artworks';
    private const USER_LICENSES_META_KEY = '_mockup100_artwork_licenses';
    private Mockup100_Api_Proxy $api_proxy;
    private Mockup100_Product_Binding $binding;

    public function __construct(Mockup100_Api_Proxy $api_proxy, Mockup100_Product_Binding $binding)
    {
        $this->api_proxy = $api_proxy;
        $this->binding = $binding;
    }

    public function boot(): void
    {
        if (! class_exists('WooCommerce')) {
            return;
        }

        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('wp_ajax_mockup100_template_cover', [$this, 'proxy_template_cover']);
    }

    public function register_routes(): void
    {
        register_rest_route('mockup100/v1', '/admin/templates', [
            'methods' => 'GET',
            'callback' => [$this, 'search_templates'],
            'permission_callback' => static function () {
                return current_user_can('manage_woocommerce');
            },
        ]);

        register_rest_route('mockup100/v1', '/admin/product/(?P<product_id>\d+)/bindings', [
            'methods' => 'POST',
            'callback' => [$this, 'save_product_bindings'],
            'permission_callback' => static function () {
                return current_user_can('manage_woocommerce');
            },
        ]);

        register_rest_route('mockup100/v1', '/designer/products', [
            'methods' => 'GET',
            'callback' => [$this, 'designer_products'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/designer/product-categories', [
            'methods' => 'GET',
            'callback' => [$this, 'designer_product_categories'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/template', [
            'methods' => 'GET',
            'callback' => [$this, 'product_template'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/workspace', [
            'methods' => 'GET',
            'callback' => [$this, 'product_workspace'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/editor', [
            'methods' => 'GET',
            'callback' => [$this, 'product_editor'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/runtime-asset', [
            'methods' => 'GET',
            'callback' => [$this, 'proxy_runtime_asset'],
            'permission_callback' => [$this, 'can_access_runtime_asset_route'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/drafts', [
            'methods' => 'GET',
            'callback' => [$this, 'list_preview_drafts'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/drafts', [
            'methods' => 'POST',
            'callback' => [$this, 'create_preview_draft'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/drafts/(?P<draft_id>[^/]+)', [
            'methods' => 'PUT',
            'callback' => [$this, 'update_preview_draft'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/drafts/(?P<draft_id>[^/]+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_preview_draft'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/results', [
            'methods' => 'GET',
            'callback' => [$this, 'list_preview_results'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/results', [
            'methods' => 'POST',
            'callback' => [$this, 'create_preview_result'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/results/(?P<output_id>[^/]+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_preview_result'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/preview', [
            'methods' => 'POST',
            'callback' => [$this, 'preview_design'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/design', [
            'methods' => 'POST',
            'callback' => [$this, 'submit_design'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/artworks', [
            'methods' => 'GET',
            'callback' => [$this, 'list_artworks'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/artworks/categories/tree', [
            'methods' => 'GET',
            'callback' => [$this, 'artwork_categories'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/uploaded-artworks', [
            'methods' => 'GET',
            'callback' => [$this, 'list_uploaded_artworks'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/uploaded-artworks', [
            'methods' => 'POST',
            'callback' => [$this, 'upload_artwork'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/uploaded-artworks/(?P<artwork_id>[^/]+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_uploaded_artwork'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/artworks/(?P<artwork_id>[^/]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'artwork_detail'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/artworks/licenses', [
            'methods' => 'GET',
            'callback' => [$this, 'artwork_licenses'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/artworks/licenses/(?P<artwork_id>[^/]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'artwork_license_detail'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/product/(?P<product_id>\d+)/artworks/(?P<artwork_id>[^/]+)/purchase', [
            'methods' => 'POST',
            'callback' => [$this, 'purchase_artwork'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/artworks/uploads', [
            'methods' => 'GET',
            'callback' => [$this, 'list_uploaded_artworks'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        register_rest_route('mockup100/v1', '/artworks/uploads/(?P<artwork_id>[^/]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'uploaded_artwork_detail'],
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);

        // 0.4.69 (Plan §3.1+§3.2): cart 加购时把当前主图视角/颜色对应的 OSS runtime-assets
        // 复制到独立 cart-snapshots/{unique_key}/{color}_{view}.png,作为购物车备份图。
        // 后续即便设计稿改动 / 删除,cart 行图片不再变化(独立存储)。
        // permission_callback 与 runtime-asset 一致 return true(由 source_url 必须在受配置 OSS bucket
        // 内做防护,普通访客无法构造任意 dest 路径)。
        register_rest_route('mockup100/v1', '/cart-snapshots', [
            'methods' => 'POST',
            'callback' => [$this, 'clone_to_cart_snapshots'],
            // 0.4.78 (Task 8.1): cart-snapshots 写路由强制登录,避免匿名访客构造任意 unique_key 越权写入 OSS
            'permission_callback' => [$this, 'can_access_designer_routes'],
        ]);
    }

    public function can_access_designer_routes(WP_REST_Request $request): bool
    {
        return is_user_logged_in();
    }

    public function can_access_runtime_asset_route(WP_REST_Request $request): bool
    {
        // 0.4.78 (Task 8.2): runtime-asset GET 是 cart/order 渲染必经代理,允许匿名访问;
        // 但 proxy_runtime_asset 内部会通过 is_allowed_runtime_asset_url() 做严格的
        // OSS 域名 + 路径前缀白名单校验,任何未在白名单内的 URL 一律 403。
        return true;
    }

    public function designer_products(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $currentProductId = (int) $request->get_param('current_product_id');
            $categoryId = sanitize_text_field((string) $request->get_param('category_id'));
            $keyword = sanitize_text_field((string) $request->get_param('keyword'));
            $page = max(1, (int) ($request->get_param('page') ?: 1));
            $size = max(1, (int) ($request->get_param('size') ?: 24));

            return new WP_REST_Response(
                $this->binding->list_published_bound_products($currentProductId, $categoryId, $keyword, $page, $size),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function designer_product_categories(WP_REST_Request $request): WP_REST_Response
    {
        try {
            return new WP_REST_Response([
                'records' => $this->binding->list_bound_product_categories(),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function search_templates(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $keyword = sanitize_text_field((string) $request->get_param('keyword'));
            $categoryId = sanitize_text_field((string) $request->get_param('category_id'));
            $result = $this->api_proxy->list_all_templates();
            $records = isset($result['records']) && is_array($result['records']) ? $result['records'] : [];
            $categories = $this->api_proxy->build_template_categories($records);
            if ($keyword !== '') {
                $normalizedKeyword = function_exists('mb_strtolower')
                    ? mb_strtolower($keyword)
                    : strtolower($keyword);
                $records = array_values(array_filter($records, static function ($item) use ($normalizedKeyword) {
                    if (! is_array($item)) {
                        return false;
                    }
                    $haystack = implode(' ', [
                        (string) ($item['template_id'] ?? ''),
                        (string) ($item['display_name'] ?? ''),
                        (string) ($item['title'] ?? ''),
                        (string) ($item['template_code'] ?? ''),
                    ]);
                    $normalizedHaystack = function_exists('mb_strtolower')
                        ? mb_strtolower($haystack)
                        : strtolower($haystack);
                    return strpos($normalizedHaystack, $normalizedKeyword) !== false;
                }));
            }
            if ($categoryId !== '') {
                $records = array_values(array_filter($records, static function ($item) use ($categoryId) {
                    return is_array($item) && (string) ($item['category_id'] ?? '') === $categoryId;
                }));
            }
            $items = [];
            foreach ($records as $item) {
                $displayName = (string) ($item['display_name'] ?? ($item['title'] ?? ''));
                $coverUrl = $this->normalize_public_asset_url(
                    (string) ($item['cover_url'] ?? ($item['template_snapshot'] ?? ($item['preview_url'] ?? ($item['original_url'] ?? ($item['thumbnail_url'] ?? ($item['image_url'] ?? ''))))))
                );
                $marketplaceStatus = (string) ($item['marketplace_status'] ?? '');
                $templateSource = (string) ($item['template_source'] ?? '');
                $marketplaceStatusLower = strtolower($marketplaceStatus);
                $publishStatusLower = strtolower((string) ($item['publish_status'] ?? ''));
                $isOwner = ! empty($item['is_owner']);
                // 0.4.49: My Templates 显示当前账号所有 public 模板(无论是否已上架到 Template Center)
                //  - 当前 tenant 拥有且发布状态为 public(published/active/live/enabled)→ 保留
                //  - marketplace_status=listed → 保留(Template Center 公开列表)
                //  - 其他(他人草稿/未发布)→ 过滤
                $publishedAliases = ['published', 'public', 'active', 'live', 'enabled'];
                $isOwnerPublic = $isOwner && in_array($publishStatusLower, $publishedAliases, true);
                $isMarketplaceListed = $marketplaceStatusLower === 'listed';
                if (! $isOwnerPublic && ! $isMarketplaceListed) {
                    continue;
                }
                // 锁图标:my templates 中未上架到模板中心(仅个人可见)的模板
                $isPrivate = $isOwner && ! $isMarketplaceListed;
                $items[] = [
                    'template_id' => $item['template_id'] ?? '',
                    'template_source' => $templateSource,
                    'marketplace_status' => $marketplaceStatus,
                    'publish_status' => (string) ($item['publish_status'] ?? ''),
                    'is_owner' => $isOwner,
                    'is_private' => $isPrivate,
                    'display_name' => $displayName,
                    'title' => $displayName,
                    'template_code' => $item['template_code'] ?? '',
                    'cover_url' => $coverUrl,
                    'cover_display_url' => $this->build_admin_asset_proxy_url($coverUrl),
                    'category_id' => $item['category_id'] ?? '',
                    'category_path' => $item['category_path'] ?? '',
                    'output_sizes' => $item['export_sizes'] ?? ($item['supported_output_sizes'] ?? []),
                ];
            }
            return new WP_REST_Response([
                'items' => $items,
                'categories' => $categories,
                'query' => [
                    'keyword' => $keyword,
                    'category_id' => $categoryId,
                ],
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function product_template(WP_REST_Request $request): WP_REST_Response
    {
        try {
            return new WP_REST_Response($this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id')), 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function save_product_bindings(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $productId = (int) $request['product_id'];
            if ($productId <= 0) {
                throw new RuntimeException(esc_html__('Invalid product id.', 'mockup100-pod-customizer'));
            }
            $payload = $request->get_json_params();
            $payload = is_array($payload) ? $payload : [];
            $bindings = isset($payload['bindings']) && is_array($payload['bindings']) ? $payload['bindings'] : [];
            $enabled = array_key_exists('enabled', $payload) ? (bool) $payload['enabled'] : null;
            $result = $this->binding->update_product_bindings($productId, $bindings, $enabled);
            return new WP_REST_Response($result, 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function product_workspace(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $selected = $this->resolve_selected_binding($context, (string) $request->get_param('template_id'));
            return new WP_REST_Response(
                $this->build_workspace_payload(
                    $context,
                    $selected,
                    $this->normalize_artwork_query($request),
                    $this->build_wordpress_proxy_headers()
                ),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function product_editor(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $selected = $this->resolve_selected_binding($context, (string) $request->get_param('template_id'));
            return new WP_REST_Response(
                $this->build_workspace_payload(
                    $context,
                    $selected,
                    $this->normalize_artwork_query($request),
                    $this->build_wordpress_proxy_headers()
                ),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function proxy_runtime_asset(WP_REST_Request $request): void
    {
        $requested = (string) $request->get_param('url');
        $url = $this->normalize_public_asset_url($requested);
        // 0.4.78 (Task 8.2): runtime-asset 代理强制 OSS 域名 + 路径前缀白名单;
        // 任何不在白名单内的 URL 直接返回 403,杜绝把代理当作通用 SSRF 出口。
        if ($url === '' || ! $this->is_allowed_runtime_asset_url($url)) {
            status_header(403);
            exit;
        }

        // 0.4.67: 针对临时 job URL (购物车主图和独立变体图)，实现 WooCommerce 本地持久化缓存。
        // 这确保了买家加购后的图片独立于设计稿变化，并且永久不会因为平台临时任务过期而 404。
        $is_job_url = $this->is_external_api_runtime_url($url);
        $upload_dir = wp_upload_dir();
        $cache_dir = $upload_dir['basedir'] . '/mockup100-cache';
        $cache_url = $upload_dir['baseurl'] . '/mockup100-cache';
        $cache_filename = md5($url) . '.png';
        $cache_file = $cache_dir . '/' . $cache_filename;

        if ($is_job_url && file_exists($cache_file)) {
            wp_safe_redirect($cache_url . '/' . $cache_filename, 302);
            exit;
        }

        // 仅当资源 URL 不属于受信任的 runtime asset host(平台 OSS / CDN)时，
        // 才强制校验商品绑定关系，避免跨商品共享的 artwork preview 因绑定校验失败而 404。
        if (! $this->is_allowed_runtime_asset_host($url)) {
            try {
                $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            } catch (Throwable $exception) {
                status_header(404);
                exit;
            }
        }

        $response = $this->proxy_remote_asset_response($url);
        if (is_wp_error($response)) {
            status_header(502);
            exit;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        // 0.4.66.1: 购物车里的历史记录可能带着过期的临时 job URL。
        // 如果底层 runtime executor 报 404, 并且请求的 URL 属于临时 job 的 URL,
        // 我们将其作为一种“预期内”的缓存失效, 直接回退返回产品/模板的封面图(或者重定向到占位图)。
        if ($status === 404 && $this->is_external_api_runtime_url($url)) {
            $fallback_url = '';
            if (isset($request['product_id'])) {
                $product_id = (int) $request['product_id'];
                $fallback_url = (string) get_post_meta($product_id, Mockup100_Product_Binding::META_TEMPLATE_SNAPSHOT, true);
                if (! $fallback_url) {
                    $fallback_url = (string) get_the_post_thumbnail_url($product_id, 'full');
                }
            }
            if ($fallback_url) {
                wp_safe_redirect($fallback_url, 302);
                exit;
            }
        }

        if ($status < 200 || $status >= 300) {
            status_header($status > 0 ? $status : 502);
            exit;
        }

        $body = wp_remote_retrieve_body($response);
        if (! is_string($body) || $body === '') {
            status_header(404);
            exit;
        }

        if ($is_job_url && $status === 200) {
            if (! file_exists($cache_dir)) {
                wp_mkdir_p($cache_dir);
            }
            global $wp_filesystem;
            if (! $wp_filesystem) {
                require_once ABSPATH . 'wp-admin/includes/file.php';
                WP_Filesystem();
            }
            if ($wp_filesystem) {
                $wp_filesystem->put_contents($cache_file, $body, FS_CHMOD_FILE);
            } else {
                // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- WP_Filesystem 不可用时兜底缓存 runtime 预览图
                file_put_contents($cache_file, $body);
            }
        }

        $contentType = (string) wp_remote_retrieve_header($response, 'content-type');
        if ($contentType === '') {
            $contentType = 'application/octet-stream';
        }

        header('Cache-Control: public, max-age=300');
        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . strlen($body));
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $body 是上游图片二进制流,必须原样输出,任何转义都会损坏图片字节
        echo $body;
        exit;
    }

    public function list_preview_drafts(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $selected = $this->resolve_selected_binding($context, (string) $request->get_param('template_id'));
            $proxyHeaders = $this->build_wordpress_proxy_headers();
            $accountId = $this->current_wp_account_id();
            return new WP_REST_Response([
                'binding' => $context,
                'selected_binding' => $selected,
                'drafts' => $this->filter_drafts_for_current_user(
                    $this->api_proxy->list_preview_drafts((string) $selected['template_id'], $proxyHeaders),
                    $accountId
                ),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function create_preview_draft(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $payload = $this->decode_json_request($request);
            $context = $this->resolve_product_context((int) $request['product_id'], (int) ($payload['variation_id'] ?? 0));
            $selected = $this->resolve_selected_binding($context, (string) ($payload['template_id'] ?? ''));
            $payload['template_id'] = (string) $selected['template_id'];
            $payload['finished_product_code'] = $this->resolve_finished_product_code(
                (int) $request['product_id'],
                (int) ($payload['variation_id'] ?? 0),
                $payload,
                $selected
            );
            $payload['preferences_json'] = $this->stamp_account_into_preferences_json(
                $payload['preferences_json'] ?? '',
                $this->current_wp_account_id()
            );

            $proxyHeaders = $this->build_wordpress_proxy_headers();
            return new WP_REST_Response([
                'binding' => $context,
                'selected_binding' => $selected,
                'draft' => $this->api_proxy->create_preview_draft($payload, $proxyHeaders),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function update_preview_draft(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $payload = $this->decode_json_request($request);
            $context = $this->resolve_product_context((int) $request['product_id'], (int) ($payload['variation_id'] ?? 0));
            $selected = $this->resolve_selected_binding($context, (string) ($payload['template_id'] ?? ''));
            $payload['finished_product_code'] = $this->resolve_finished_product_code(
                (int) $request['product_id'],
                (int) ($payload['variation_id'] ?? 0),
                $payload,
                $selected
            );
            $accountId = $this->current_wp_account_id();
            // 校验目标草稿确实属于当前 WP 用户,避免越权更新他人草稿
            $this->ensure_draft_owned_by_current_user(
                (string) $selected['template_id'],
                sanitize_text_field((string) $request['draft_id']),
                $accountId
            );
            $payload['preferences_json'] = $this->stamp_account_into_preferences_json(
                $payload['preferences_json'] ?? '',
                $accountId
            );

            $proxyHeaders = $this->build_wordpress_proxy_headers();
            return new WP_REST_Response([
                'binding' => $context,
                'selected_binding' => $selected,
                'draft' => $this->api_proxy->update_preview_draft(
                    sanitize_text_field((string) $request['draft_id']),
                    $payload,
                    $proxyHeaders
                ),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function delete_preview_draft(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $proxyHeaders = $this->build_wordpress_proxy_headers();
            $accountId = $this->current_wp_account_id();
            $selected = $this->resolve_selected_binding($context, (string) $request->get_param('template_id'));
            $this->ensure_draft_owned_by_current_user(
                (string) $selected['template_id'],
                sanitize_text_field((string) $request['draft_id']),
                $accountId
            );
            return new WP_REST_Response([
                'binding' => $context,
                'draft' => $this->api_proxy->delete_preview_draft(
                    sanitize_text_field((string) $request['draft_id']),
                    $proxyHeaders
                ),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function list_preview_results(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $selected = $this->resolve_selected_binding($context, (string) $request->get_param('template_id'));
            $limit = max(1, (int) ($request->get_param('limit') ?: 100));
            $proxyHeaders = $this->build_wordpress_proxy_headers();
            $accountId = $this->current_wp_account_id();
            return new WP_REST_Response([
                'binding' => $context,
                'selected_binding' => $selected,
                'results' => $this->normalize_preview_output_records(
                    $this->filter_outputs_for_current_user(
                        $this->api_proxy->list_preview_outputs((string) $selected['template_id'], $limit, $proxyHeaders),
                        $accountId
                    )
                ),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function create_preview_result(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $payload = $this->decode_json_request($request);
            $context = $this->resolve_product_context((int) $request['product_id'], (int) ($payload['variation_id'] ?? 0));
            $selected = $this->resolve_selected_binding($context, (string) ($payload['template_id'] ?? ''));
            $payload['template_id'] = (string) $selected['template_id'];
            // 把当前 WP 账户标识写入 mode 字段:格式 "{originalMode}|wp:{md5(account_id):0,12}"
            $payload['mode'] = $this->stamp_account_into_output_mode(
                (string) ($payload['mode'] ?? 'default'),
                $this->current_wp_account_id()
            );

            $proxyHeaders = $this->build_wordpress_proxy_headers();
            return new WP_REST_Response([
                'binding' => $context,
                'selected_binding' => $selected,
                'result' => $this->api_proxy->create_preview_output($payload, $proxyHeaders),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function delete_preview_result(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $proxyHeaders = $this->build_wordpress_proxy_headers();
            $accountId = $this->current_wp_account_id();
            $selected = $this->resolve_selected_binding($context, (string) $request->get_param('template_id'));
            $this->ensure_output_owned_by_current_user(
                (string) $selected['template_id'],
                sanitize_text_field((string) $request['output_id']),
                $accountId
            );
            return new WP_REST_Response([
                'binding' => $context,
                'result' => $this->api_proxy->delete_preview_output(
                    sanitize_text_field((string) $request['output_id']),
                    $proxyHeaders
                ),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function list_artworks(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $context = $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $query = $this->normalize_artwork_query($request);
            try {
                $result = $this->api_proxy->list_artworks($query, $this->build_wordpress_proxy_headers());
            } catch (Throwable $apiException) {
                // Bug 1: 平台按 tenant 维度返回作品时,WP 站点未绑定 tenant 会导致 400。
                // 前端只用此接口填充作品库面板,无数据返回空结构即可,避免红色 400 报错。
                $result = [
                    'records' => [],
                    'total' => 0,
                    'page' => (int) ($query['page'] ?? 1),
                    'size' => (int) ($query['size'] ?? 24),
                ];
            }
            return new WP_REST_Response([
                'binding' => $context,
                'query' => $query,
                'records' => isset($result['records']) && is_array($result['records']) ? $result['records'] : [],
                'total' => isset($result['total']) ? (int) $result['total'] : 0,
                'page' => isset($result['page']) ? (int) $result['page'] : 1,
                'size' => isset($result['size']) ? (int) $result['size'] : 24,
            ], 200);
        } catch (Throwable $exception) {
            // 外层 resolve_product_context 异常仍走 400,保留鉴权/产品不存在通道
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function artwork_categories(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            return new WP_REST_Response([
                'records' => $this->api_proxy->artwork_categories_tree($this->build_wordpress_proxy_headers()),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function artwork_detail(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            return new WP_REST_Response(
                $this->api_proxy->artwork_detail(
                    sanitize_text_field((string) $request['artwork_id']),
                    $this->build_wordpress_proxy_headers()
                ),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function artwork_licenses(WP_REST_Request $request): WP_REST_Response
    {
        // 平台 /external/artwork/licenses 仍按 tenant_id 维度返回 tenant 内全部已购 license,
        // 这里在插件层使用当前 WP 用户的 user_meta 进行二次过滤,实现按账户的 licensed 视图隔离。
        try {
            $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $tenantLicenses = $this->api_proxy->artwork_licenses($this->build_wordpress_proxy_headers());
            return new WP_REST_Response([
                'records' => $this->filter_artwork_licenses_for_current_user($tenantLicenses),
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function artwork_license_detail(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $artworkId = sanitize_text_field((string) $request['artwork_id']);
            // 仅允许当前 WP 用户已购买的 artwork 查询其授权详情
            $this->ensure_artwork_licensed_by_current_user($artworkId);
            return new WP_REST_Response(
                $this->api_proxy->artwork_license_detail(
                    $artworkId,
                    $this->build_wordpress_proxy_headers()
                ),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function purchase_artwork(WP_REST_Request $request): WP_REST_Response
    {
        // 成功购买后,把 artwork_id 记录到当前 WP 用户的 user_meta 中,
        // 这样 listLicenses 可以按 WP 账户进行客户端过滤,从而隔离 tenant 内不同 WordPress 用户的"已购"视图。
        try {
            $this->resolve_product_context((int) $request['product_id'], (int) $request->get_param('variation_id'));
            $artworkId = sanitize_text_field((string) $request['artwork_id']);
            $response = $this->api_proxy->purchase_artwork(
                $artworkId,
                $this->build_wordpress_proxy_headers()
            );
            // 持久化到当前 WP 用户名下,优先取响应里的 artwork_id 字段,回退到入参
            $licensedArtworkId = (string) ($response['artwork_id'] ?? $artworkId);
            if ($licensedArtworkId !== '') {
                $this->add_artwork_license_for_current_user($licensedArtworkId);
            }
            return new WP_REST_Response($response, 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function list_uploaded_artworks(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $productId = (int) ($request['product_id'] ?? 0);
            $variationId = (int) ($request->get_param('variation_id') ?? 0);
            $page = max(1, (int) ($request->get_param('page') ?: 1));
            $size = max(1, min(500, (int) ($request->get_param('size') ?: 100)));
            $records = $this->get_current_user_upload_records();
            $total = count($records);
            $offset = ($page - 1) * $size;
            // 0.4.78 (Task 8.4): array_slice 仅用于对当前用户已记录的上传作品做 page/size 分页;
            // 不属于 trialware 计数限制,保留。
            $paged = array_slice($records, $offset, $size);
            $items = [];
            foreach ($paged as $record) {
                $prepared = $this->prepare_uploaded_artwork_record_for_response($record, $productId, $variationId);
                if (! empty($prepared)) {
                    $items[] = $prepared;
                }
            }
            return new WP_REST_Response([
                'records' => $items,
                'total' => $total,
                'page' => $page,
                'size' => $size,
            ], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function upload_artwork(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $productId = (int) ($request['product_id'] ?? 0);
            $variationId = (int) ($request->get_param('variation_id') ?? 0);
            $file = $this->resolve_uploaded_file($request);
            $uploadResult = $this->upload_file_to_oss($file);
            $artworkId = wp_generate_uuid4();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $record = [
                'artwork_id' => $artworkId,
                'name' => $this->normalize_uploaded_artwork_name((string) $file['name']),
                'preview_url' => (string) $uploadResult['preview_url'],
                'original_url' => (string) $uploadResult['original_url'],
                'object_key' => (string) $uploadResult['object_key'],
                'mime_type' => (string) $file['type'],
                'file_ext' => (string) $uploadResult['file_ext'],
                'created_at' => $now,
                'updated_at' => $now,
                'library_scope' => 'upload',
            ];
            $records = $this->get_current_user_upload_records();
            array_unshift($records, $record);
            $this->save_current_user_upload_records($records);
            return new WP_REST_Response(
                $this->prepare_uploaded_artwork_record_for_response($record, $productId, $variationId),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function delete_uploaded_artwork(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $artworkId = sanitize_text_field((string) ($request['artwork_id'] ?? ''));
            if ($artworkId === '') {
                throw new RuntimeException(esc_html__('Invalid artwork id.', 'mockup100-pod-customizer'));
            }
            $records = $this->get_current_user_upload_records();
            $remaining = [];
            $deleted = null;
            foreach ($records as $record) {
                if ((string) ($record['artwork_id'] ?? '') === $artworkId) {
                    $deleted = $record;
                    continue;
                }
                $remaining[] = $record;
            }
            if ($deleted !== null) {
                $this->save_current_user_upload_records($remaining);
                $this->delete_oss_object_for_record($deleted);
            }
            return new WP_REST_Response(['deleted' => $artworkId], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function uploaded_artwork_detail(WP_REST_Request $request): WP_REST_Response
    {
        try {
            return new WP_REST_Response(
                $this->api_proxy->uploaded_artwork_detail(
                    sanitize_text_field((string) $request['artwork_id']),
                    $this->build_wordpress_proxy_headers()
                ),
                200
            );
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 400);
        }
    }

    public function preview_design(WP_REST_Request $request): WP_REST_Response
    {
        return $this->compose_for_product($request);
    }

    public function submit_design(WP_REST_Request $request): WP_REST_Response
    {
        return $this->compose_for_product($request, true);
    }

    private function compose_for_product(WP_REST_Request $request, bool $include_cart_payload = false): WP_REST_Response
    {
        try {
            $payload = $this->decode_json_request($request);
            $context = $this->resolve_product_context((int) $request['product_id'], (int) ($payload['variation_id'] ?? 0));
            $selected = $this->resolve_selected_binding($context, (string) ($payload['template_id'] ?? ''));
            $parts = isset($payload['parts']) && is_array($payload['parts']) ? $payload['parts'] : [];
            $part_files = [];
            $part_names = [];

            foreach ($parts as $part) {
                if (! is_array($part) || empty($part['name']) || empty($part['data_url'])) {
                    continue;
                }
                $decoded = $this->decode_data_url((string) $part['data_url']);
                $part_names[] = (string) $part['name'];
                $part_files[] = [
                    'name' => sanitize_file_name((string) $part['name']),
                    'type' => $decoded['mime'],
                    'content' => $decoded['content'],
                ];
            }

            $proxyHeaders = $this->build_wordpress_proxy_headers();
            $response = $this->api_proxy->compose_editor([
                'template_id' => $selected['template_id'],
                'selected_color' => sanitize_text_field((string) ($payload['selected_color'] ?? '')),
                'selected_view' => sanitize_text_field((string) ($payload['selected_view'] ?? '')),
                'output_size' => sanitize_text_field((string) ($payload['output_size'] ?? $this->api_proxy->get_default_output_size())),
                'compose_overrides' => wp_json_encode($payload['compose_overrides'] ?? new stdClass()),
                'part_names' => implode(',', $part_names),
            ], $part_files, $proxyHeaders);
            $job_results = [];
            $response_outputs = isset($response['outputs']) && is_array($response['outputs']) ? $response['outputs'] : [];
            if (empty($response_outputs) && ! empty($response['job_id'])) {
                // 0.4.49: 异步任务需先轮询 job_status,等到 COMPLETED 再取 results
                // 否则上游 /jobs/{id}/results 会返回 404 "job not found"
                $job_id = (string) $response['job_id'];
                $started_at = microtime(true);
                $timeout_seconds = 22.0;
                $interval_us = 500000; // 0.5s 起步
                $max_interval_us = 1500000; // 上限 1.5s
                $final_status = '';
                $last_status_response = [];
                while (true) {
                    try {
                        $status_response = $this->api_proxy->job_status($job_id, $proxyHeaders);
                    } catch (Throwable $statusException) {
                        $status_response = [];
                    }
                    $last_status_response = $status_response;
                    $final_status = strtoupper((string) ($status_response['status'] ?? ''));
                    if (in_array($final_status, ['COMPLETED', 'SUCCEEDED', 'SUCCESS', 'DONE', 'FAILED', 'FAILURE', 'ERROR', 'CANCELLED', 'CANCELED'], true)) {
                        break;
                    }
                    if ((microtime(true) - $started_at) >= $timeout_seconds) {
                        break;
                    }
                    usleep($interval_us);
                    $interval_us = min((int) round($interval_us * 1.3), $max_interval_us);
                }
                $is_terminal_success = in_array($final_status, ['COMPLETED', 'SUCCEEDED', 'SUCCESS', 'DONE'], true);
                if ($is_terminal_success) {
                    $job_results = $this->api_proxy->job_results($job_id, $proxyHeaders);
                } else {
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 渲染任务轮询失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                        error_log(sprintf(
                            '[Mockup100 job_polling_failed] job_id=%s final_status=%s elapsed=%.2fs status_response=%s',
                            $job_id,
                            $final_status === '' ? '(empty)' : $final_status,
                            microtime(true) - $started_at,
                            substr((string) wp_json_encode($last_status_response), 0, 500)
                        ));
                    }
                    if (in_array($final_status, ['FAILED', 'FAILURE', 'ERROR', 'CANCELLED', 'CANCELED'], true)) {
                        $upstream_message = (string) ($last_status_response['error']
                            ?? ($last_status_response['message'] ?? sprintf('Render job %s', strtolower($final_status))));
                        throw new RuntimeException(esc_html($upstream_message));
                    }
                    throw new RuntimeException(esc_html__('Render job timed out before completing.', 'mockup100-pod-customizer'));
                }
            }

            // 平台 ExternalRuntimeController.normalizeOutputs 会移除 file_path,
            // 仅返回相对路径 preview_url/download_url(形如 /api/v1/external/runtime/jobs/.../preview)。
            // 前端 setPreviewOutput / export 流程依赖 file_path 与绝对 URL,
            // 这里统一在 WP 插件侧把 outputs 内的 url 拼成绝对地址,并把 preview_url 复制到 file_path 字段,
            // 让前端 isWordPressShell 分支可以走与平台一致的写缓存路径。
            $response['outputs'] = $this->normalize_compose_outputs(isset($response['outputs']) && is_array($response['outputs']) ? $response['outputs'] : []);
            if (isset($job_results['outputs']) && is_array($job_results['outputs'])) {
                $job_results['outputs'] = $this->normalize_compose_outputs($job_results['outputs']);
            }

            $result = [
                'binding' => $context,
                'compose' => $response,
                'job_results' => $job_results,
            ];

            if ($include_cart_payload) {
                $outputs = isset($job_results['outputs']) && is_array($job_results['outputs'])
                    ? $job_results['outputs']
                    : (isset($response['outputs']) && is_array($response['outputs']) ? $response['outputs'] : []);
                $first_output = $outputs[0] ?? [];
                $result['cart_payload'] = [
                    'template_id' => $selected['template_id'],
                    'template_source' => $selected['template_source'],
                    'variation_id' => $payload['variation_id'] ?? 0,
                    'selected_color' => $payload['selected_color'] ?? '',
                    'selected_view' => $payload['selected_view'] ?? '',
                    'output_size' => $payload['output_size'] ?? $this->api_proxy->get_default_output_size(),
                    'job_id' => $response['job_id'] ?? '',
                    'preview_url' => $this->normalize_public_asset_url((string) ($first_output['preview_url'] ?? ($response['preview_url'] ?? ''))),
                    'download_url' => $this->normalize_public_asset_url((string) ($first_output['download_url'] ?? ($response['download_url'] ?? ''))),
                    'outputs' => $outputs,
                    'design_summary' => $payload['design_summary'] ?? [],
                ];
            }

            return new WP_REST_Response($result, 200);
        } catch (Throwable $exception) {
            // 0.4.47: 详细错误日志,定位 preview 400 真因
            $product_id_for_log = isset($request['product_id']) ? (int) $request['product_id'] : 0;
            $payload_keys = isset($payload) && is_array($payload) ? array_keys($payload) : [];
            $template_id_for_log = isset($selected['template_id']) ? (string) $selected['template_id'] : '';
            $part_count = isset($parts) && is_array($parts) ? count($parts) : 0;
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 预览失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log(sprintf(
                    '[Mockup100 preview_failure] product_id=%d include_cart=%s template_id=%s payload_keys=%s parts=%d error=%s trace=%s',
                    $product_id_for_log,
                    $include_cart_payload ? '1' : '0',
                    $template_id_for_log,
                    wp_json_encode($payload_keys),
                    $part_count,
                    $exception->getMessage(),
                    $exception->getTraceAsString()
                ));
            }
            // 0.4.50: 把上游 HTTP code 透传到前端,让 402 (insufficient tokens)/403/429 等
            // 业务态被识别,而不是统统当成 400 让用户以为是参数错误
            $upstream_code = (int) $exception->getCode();
            $passthrough = ($upstream_code >= 400 && $upstream_code < 600) ? $upstream_code : 400;
            // 0.4.51: 402 = 平台租户 token 余额不足。WP 终端用户看不懂上游英文,
            // 改为面向"站点管理员"的中文提示(此处按平台计费,与 WP 终端用户无关)
            $client_message = $exception->getMessage();
            $error_code = '';
            if ($upstream_code === 402) {
                $client_message = __('Mockup100 服务暂不可用:平台租户 token 余额不足,请联系站点管理员到 Mockup100 控制台充值后再试。', 'mockup100-pod-customizer');
                $error_code = 'insufficient_tokens';
            }
            return new WP_REST_Response([
                'message' => $client_message,
                'error_code' => $error_code,
                'upstream_code' => $upstream_code > 0 ? $upstream_code : null,
            ], $passthrough);
        }
    }

    private function resolve_product_context(int $product_id, int $variation_id = 0): array
    {
        $binding = $this->binding->get_binding($product_id);
        $bindings = $this->binding->get_bindings($product_id, $variation_id);
        if (! $binding['enabled'] || empty($bindings)) {
            throw new RuntimeException(esc_html__('This product is not bound to a Mockup100 template.', 'mockup100-pod-customizer'));
        }

        $primaryBinding = isset($bindings[0]) && is_array($bindings[0]) ? $bindings[0] : [];

        return [
            'product_id' => $product_id,
            'variation_id' => $variation_id,
            'bindings' => $bindings,
            'template_id' => (string) ($primaryBinding['template_id'] ?? $binding['template_id']),
            'template_source' => (string) ($primaryBinding['template_source'] ?? $binding['template_source']),
            'template_label' => (string) ($primaryBinding['display_name'] ?? ($primaryBinding['title'] ?? $binding['template_label'])),
            'template_code' => array_key_exists('template_code', $primaryBinding)
                ? (string) $primaryBinding['template_code']
                : (string) ($binding['template_code'] ?? ''),
            'template_snapshot' => (string) ($primaryBinding['cover_url'] ?? ($primaryBinding['template_snapshot'] ?? $binding['template_snapshot'])),
        ];
    }

    private function resolve_selected_binding(array $context, string $template_id): array
    {
        $bindings = isset($context['bindings']) && is_array($context['bindings']) ? $context['bindings'] : [];
        if ($template_id === '' && ! empty($bindings[0])) {
            return $bindings[0];
        }

        foreach ($bindings as $binding) {
            if (($binding['template_id'] ?? '') === $template_id) {
                return $binding;
            }
        }

        // 0.5.6: Grading workspace 在前端会基于已绑定的 base template 合成派生 ID,
        // 形如 "{baseTemplateId}grading--{hash}";这类派生 ID 不会出现在 WC 商品 binding
        // 列表中,直接精确匹配会抛 "Selected template is not available" 导致 /editor
        // 接口返回 400。检测到 grading 派生后缀时,剥离后再回退匹配 base binding,
        // 让 cart/order 上下文以原始 base template_id 落库,Grading 派生只用于前端
        // workspace 内部的合成调用。
        if ($template_id !== '' && strpos($template_id, 'grading--') !== false) {
            $base_template_id = (string) preg_replace('/grading--[A-Za-z0-9_-]+$/', '', $template_id);
            if ($base_template_id !== '' && $base_template_id !== $template_id) {
                foreach ($bindings as $binding) {
                    if (($binding['template_id'] ?? '') === $base_template_id) {
                        return $binding;
                    }
                }
            }
        }

        throw new RuntimeException(esc_html__('Selected template is not available for this product.', 'mockup100-pod-customizer'));
    }

    private function build_workspace_payload(array $context, array $selected, array $artwork_query = [], array $proxy_headers = []): array
    {
        return [
            'product' => [
                'product_id' => (int) ($context['product_id'] ?? 0),
                'variation_id' => (int) ($context['variation_id'] ?? 0),
            ],
            'binding' => $context,
            'selected_binding' => $selected,
            'editor' => $this->api_proxy->template_editor((string) $selected['template_id'], $proxy_headers),
            'defaults' => [
                'output_size' => $this->api_proxy->get_default_output_size(),
                'preview_size' => $this->api_proxy->get_default_preview_size(),
            ],
            'artwork' => $this->build_workspace_artwork_payload($artwork_query, $proxy_headers),
            'drafts' => $this->api_proxy->list_preview_drafts((string) $selected['template_id'], $proxy_headers),
            'results' => $this->normalize_preview_output_records(
                $this->api_proxy->list_preview_outputs((string) $selected['template_id'], 100, $proxy_headers)
            ),
        ];
    }

    private function normalize_preview_output_records(array $payload): array
    {
        if (!isset($payload['records']) || !is_array($payload['records'])) {
            return $payload;
        }
        $payload['records'] = array_map(function ($record) {
            if (!is_array($record)) {
                return $record;
            }
            $record['preview_url'] = $this->normalize_public_asset_url((string) ($record['preview_url'] ?? ''));
            $record['download_url'] = $this->normalize_public_asset_url((string) ($record['download_url'] ?? ''));
            return $record;
        }, $payload['records']);
        return $payload;
    }

    private function normalize_artwork_query(WP_REST_Request $request): array
    {
        return [
            'scope' => sanitize_text_field((string) ($request->get_param('scope') ?: 'platform')),
            'page' => max(1, (int) ($request->get_param('page') ?: 1)),
            'size' => max(1, (int) ($request->get_param('size') ?: 24)),
            'keyword' => sanitize_text_field((string) $request->get_param('keyword')),
            'category_id' => sanitize_text_field((string) $request->get_param('category_id')),
        ];
    }

    private function build_workspace_artwork_payload(array $query, array $proxy_headers = []): array
    {
        $normalized_query = array_merge(
            [
                'scope' => 'platform',
                'page' => 1,
                'size' => 24,
                'keyword' => '',
                'category_id' => '',
            ],
            $query
        );

        $library = $this->api_proxy->list_artworks($normalized_query, $proxy_headers);
        $categories = $this->api_proxy->artwork_categories_tree($proxy_headers);
        // 按当前 WP 用户过滤 license,避免 tenant 内其他 WordPress 账户的已购数据泄露
        $licenses = $this->filter_artwork_licenses_for_current_user(
            $this->api_proxy->artwork_licenses($proxy_headers)
        );
        $license_map = [];
        if (is_array($licenses)) {
            foreach ($licenses as $license) {
                if (! is_array($license) || empty($license['artwork_id'])) {
                    continue;
                }
                $license_map[(string) $license['artwork_id']] = $license;
            }
        }

        return [
            'enabled' => true,
            'default_scope' => (string) $normalized_query['scope'],
            'query' => $normalized_query,
            'records' => isset($library['records']) && is_array($library['records']) ? $library['records'] : [],
            'total' => isset($library['total']) ? (int) $library['total'] : 0,
            'page' => isset($library['page']) ? (int) $library['page'] : 1,
            'size' => isset($library['size']) ? (int) $library['size'] : (int) $normalized_query['size'],
            'categories' => is_array($categories) ? $categories : [],
            'licenses' => is_array($licenses) ? $licenses : [],
            'license_map' => $license_map,
        ];
    }

    private function build_wordpress_proxy_headers(): array
    {
        $user = $this->build_wordpress_user_context();
        return [
            'X-Mockup100-WP-User-Id' => $user['user_id'],
            'X-Mockup100-WP-User-Login' => $user['user_login'],
            'X-Mockup100-WP-User-Email' => $user['email'],
            'X-Mockup100-WP-User-Display-Name' => $user['display_name'],
            'X-Mockup100-WP-Site-Host' => $user['site_host'],
            'X-Mockup100-WP-Site-Url' => $user['site_url'],
        ];
    }

    private function build_wordpress_user_context(): array
    {
        $currentUser = wp_get_current_user();
        if (! is_user_logged_in() || ! ($currentUser instanceof WP_User) || ! $currentUser->exists()) {
            throw new RuntimeException(esc_html__('WordPress login is required.', 'mockup100-pod-customizer'));
        }

        $siteUrl = home_url('/');
        $siteHost = strtolower((string) wp_parse_url($siteUrl, PHP_URL_HOST));
        if ($siteHost === '') {
            $siteHost = 'unknown-site';
        }

        return [
            'user_id' => (string) $currentUser->ID,
            'user_login' => (string) $currentUser->user_login,
            'email' => (string) $currentUser->user_email,
            'display_name' => (string) ($currentUser->display_name ?: $currentUser->user_login),
            'site_host' => $siteHost,
            'site_url' => untrailingslashit($siteUrl),
            'account_id' => 'wp:' . $siteHost . ':' . (string) $currentUser->ID,
        ];
    }

    /**
     * 返回当前 WP 账户的统一标识(用作多用户隔离的 key)。
     */
    private function current_wp_account_id(): string
    {
        return (string) ($this->build_wordpress_user_context()['account_id'] ?? '');
    }

    /**
     * 将当前账户标识嵌入草稿的 preferences_json,以便后续过滤。
     * 在 JSON 根上写入 `_mockup100_wp_account_id`,与 `_mockup100_wp_account_tag`(短哈希,作冗余校验)。
     */
    private function stamp_account_into_preferences_json(string $json, string $accountId): string
    {
        $data = [];
        if (is_string($json) && trim($json) !== '') {
            $decoded = json_decode($json, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }
        $data['_mockup100_wp_account_id'] = $accountId;
        $data['_mockup100_wp_account_tag'] = $this->build_account_tag($accountId);
        $encoded = wp_json_encode($data);
        return is_string($encoded) ? $encoded : '{}';
    }

    /**
     * 将当前账户标识嵌入到 output 的 mode 字段:格式 "{originalMode}|wp:{md5(accountId):0,12}"。
     * 同 mode 字段已存在 wp 标签时会先剥离,避免重复追加。
     */
    private function stamp_account_into_output_mode(string $mode, string $accountId): string
    {
        $base = trim($mode) !== '' ? trim($mode) : 'default';
        // 剥离已有的 |wp:xxxx 段,保证幂等
        $base = preg_replace('/\|wp:[a-f0-9]{6,32}/i', '', $base) ?? $base;
        $base = trim($base) !== '' ? trim($base) : 'default';
        return $base . '|' . $this->build_account_tag($accountId);
    }

    /**
     * 生成简短账户哈希标签 "wp:xxxxxxxxxxxx"(12 位 hex)。
     */
    private function build_account_tag(string $accountId): string
    {
        return 'wp:' . substr(md5($accountId), 0, 12);
    }

    /**
     * 过滤 drafts 列表,只保留 preferences_json 内携带当前账户标识的记录。
     * 兼容历史无标记记录:这类记录会被隐藏,以确保严格按用户隔离。
     */
    private function filter_drafts_for_current_user(array $payload, string $accountId): array
    {
        if (! isset($payload['records']) || ! is_array($payload['records'])) {
            return $payload;
        }
        $tag = $this->build_account_tag($accountId);
        $filtered = [];
        foreach ($payload['records'] as $record) {
            if (! is_array($record)) {
                continue;
            }
            if ($this->draft_record_belongs_to_account($record, $accountId, $tag)) {
                $filtered[] = $record;
            }
        }
        $payload['records'] = array_values($filtered);
        if (isset($payload['total'])) {
            $payload['total'] = count($payload['records']);
        }
        return $payload;
    }

    /**
     * 判断单条 draft 是否属于指定账户。
     */
    private function draft_record_belongs_to_account(array $record, string $accountId, string $tag): bool
    {
        $prefs = $record['preferences_json'] ?? null;
        if (is_string($prefs) && trim($prefs) !== '') {
            $decoded = json_decode($prefs, true);
            if (is_array($decoded)) {
                $marker = (string) ($decoded['_mockup100_wp_account_id'] ?? '');
                $markerTag = (string) ($decoded['_mockup100_wp_account_tag'] ?? '');
                if ($marker === $accountId) {
                    return true;
                }
                if ($markerTag !== '' && $markerTag === $tag) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 过滤 outputs 列表,只保留 mode 字段携带当前账户哈希标签的记录。
     */
    private function filter_outputs_for_current_user(array $payload, string $accountId): array
    {
        if (! isset($payload['records']) || ! is_array($payload['records'])) {
            return $payload;
        }
        $tag = $this->build_account_tag($accountId);
        $filtered = [];
        foreach ($payload['records'] as $record) {
            if (! is_array($record)) {
                continue;
            }
            if ($this->output_record_belongs_to_account($record, $tag)) {
                $filtered[] = $record;
            }
        }
        $payload['records'] = array_values($filtered);
        if (isset($payload['total'])) {
            $payload['total'] = count($payload['records']);
        }
        return $payload;
    }

    /**
     * 判断单条 output 是否属于指定账户。
     */
    private function output_record_belongs_to_account(array $record, string $tag): bool
    {
        $mode = (string) ($record['mode'] ?? '');
        if ($mode === '') {
            return false;
        }
        return strpos($mode, $tag) !== false;
    }

    /**
     * 确认指定草稿属于当前 WP 账户;否则抛出异常以阻止越权操作。
     */
    private function ensure_draft_owned_by_current_user(string $templateId, string $draftId, string $accountId): void
    {
        if ($templateId === '' || $draftId === '') {
            throw new RuntimeException(esc_html__('Invalid draft reference.', 'mockup100-pod-customizer'));
        }
        $tag = $this->build_account_tag($accountId);
        $proxyHeaders = $this->build_wordpress_proxy_headers();
        $list = $this->api_proxy->list_preview_drafts($templateId, $proxyHeaders);
        $records = isset($list['records']) && is_array($list['records']) ? $list['records'] : [];
        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }
            $recordId = (string) ($record['draft_id'] ?? ($record['id'] ?? ''));
            if ($recordId !== $draftId) {
                continue;
            }
            if ($this->draft_record_belongs_to_account($record, $accountId, $tag)) {
                return;
            }
            throw new RuntimeException(esc_html__('You are not allowed to access this draft.', 'mockup100-pod-customizer'));
        }
        throw new RuntimeException(esc_html__('Draft not found for current account.', 'mockup100-pod-customizer'));
    }

    /**
     * 确认指定 output 属于当前 WP 账户;否则抛出异常以阻止越权操作。
     */
    private function ensure_output_owned_by_current_user(string $templateId, string $outputId, string $accountId): void
    {
        if ($templateId === '' || $outputId === '') {
            throw new RuntimeException(esc_html__('Invalid output reference.', 'mockup100-pod-customizer'));
        }
        $tag = $this->build_account_tag($accountId);
        $proxyHeaders = $this->build_wordpress_proxy_headers();
        $list = $this->api_proxy->list_preview_outputs($templateId, 300, $proxyHeaders);
        $records = isset($list['records']) && is_array($list['records']) ? $list['records'] : [];
        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }
            $recordId = (string) ($record['output_id'] ?? ($record['id'] ?? ''));
            if ($recordId !== $outputId) {
                continue;
            }
            if ($this->output_record_belongs_to_account($record, $tag)) {
                return;
            }
            throw new RuntimeException(esc_html__('You are not allowed to access this result.', 'mockup100-pod-customizer'));
        }
        throw new RuntimeException(esc_html__('Result not found for current account.', 'mockup100-pod-customizer'));
    }

    /**
     * 读取当前 WP 用户已购 artwork 的 ID 列表。存储格式:["artwork_id_1", "artwork_id_2", ...]
     */
    private function get_current_user_artwork_license_ids(): array
    {
        $userId = (int) ($this->build_wordpress_user_context()['user_id'] ?? 0);
        if ($userId <= 0) {
            return [];
        }
        $raw = get_user_meta($userId, self::USER_LICENSES_META_KEY, true);
        if (! is_array($raw)) {
            return [];
        }
        $ids = [];
        foreach ($raw as $value) {
            if (is_string($value) && $value !== '') {
                $ids[$value] = true;
            } elseif (is_array($value) && ! empty($value['artwork_id'])) {
                $ids[(string) $value['artwork_id']] = true;
            }
        }
        return array_keys($ids);
    }

    /**
     * 把 artwork_id 加入当前 WP 用户的已购 license 集合(去重持久化)。
     */
    private function add_artwork_license_for_current_user(string $artworkId): void
    {
        if ($artworkId === '') {
            return;
        }
        $userId = (int) ($this->build_wordpress_user_context()['user_id'] ?? 0);
        if ($userId <= 0) {
            return;
        }
        $existing = $this->get_current_user_artwork_license_ids();
        if (in_array($artworkId, $existing, true)) {
            return;
        }
        $existing[] = $artworkId;
        update_user_meta($userId, self::USER_LICENSES_META_KEY, array_values(array_unique($existing)));
    }

    /**
     * 按当前 WP 用户的 user_meta 过滤平台返回的 tenant 内 license 列表。
     * 输入格式可能是 array(license records) 或 ['records' => [...]] 或裸数组。
     */
    private function filter_artwork_licenses_for_current_user($payload): array
    {
        $records = [];
        if (is_array($payload)) {
            if (isset($payload['records']) && is_array($payload['records'])) {
                $records = $payload['records'];
            } else {
                $records = $payload;
            }
        }
        $licensed = $this->get_current_user_artwork_license_ids();
        if (empty($licensed)) {
            return [];
        }
        $allowed = array_flip($licensed);
        $filtered = [];
        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }
            $artworkId = (string) ($record['artwork_id'] ?? ($record['id'] ?? ''));
            if ($artworkId !== '' && isset($allowed[$artworkId])) {
                $filtered[] = $record;
            }
        }
        return array_values($filtered);
    }

    /**
     * 校验 artwork 是否被当前 WP 用户购买;否则抛异常拒绝访问。
     */
    private function ensure_artwork_licensed_by_current_user(string $artworkId): void
    {
        if ($artworkId === '') {
            throw new RuntimeException(esc_html__('Invalid artwork reference.', 'mockup100-pod-customizer'));
        }
        $licensed = $this->get_current_user_artwork_license_ids();
        if (! in_array($artworkId, $licensed, true)) {
            throw new RuntimeException(esc_html__('You have not purchased a license for this artwork.', 'mockup100-pod-customizer'));
        }
    }

    private function get_current_user_upload_records(): array
    {
        $userId = (int) ($this->build_wordpress_user_context()['user_id'] ?? 0);
        if ($userId <= 0) {
            return [];
        }
        $raw = get_user_meta($userId, self::USER_UPLOADS_META_KEY, true);
        if (! is_array($raw)) {
            return [];
        }
        return array_values(array_filter(array_map([$this, 'normalize_uploaded_artwork_record'], $raw)));
    }

    private function save_current_user_upload_records(array $records): void
    {
        $userId = (int) ($this->build_wordpress_user_context()['user_id'] ?? 0);
        if ($userId <= 0) {
            throw new RuntimeException(esc_html__('WordPress login is required.', 'mockup100-pod-customizer'));
        }
        update_user_meta($userId, self::USER_UPLOADS_META_KEY, array_values(array_filter(array_map([$this, 'normalize_uploaded_artwork_record'], $records))));
    }

    private function normalize_uploaded_artwork_record($record): array
    {
        if (! is_array($record) || empty($record['artwork_id'])) {
            return [];
        }
        return [
            'artwork_id' => sanitize_text_field((string) ($record['artwork_id'] ?? '')),
            'name' => sanitize_text_field((string) ($record['name'] ?? '')),
            'preview_url' => esc_url_raw((string) ($record['preview_url'] ?? '')),
            'original_url' => esc_url_raw((string) ($record['original_url'] ?? '')),
            'created_at' => sanitize_text_field((string) ($record['created_at'] ?? '')),
            'updated_at' => sanitize_text_field((string) ($record['updated_at'] ?? '')),
            'mime_type' => sanitize_text_field((string) ($record['mime_type'] ?? '')),
            'file_ext' => sanitize_text_field((string) ($record['file_ext'] ?? '')),
            'library_scope' => 'upload',
            'object_key' => sanitize_text_field((string) ($record['object_key'] ?? '')),
        ];
    }

    private function prepare_uploaded_artwork_record_for_response(array $record, int $productId, int $variationId = 0): array
    {
        $normalized = $this->normalize_uploaded_artwork_record($record);
        if (empty($normalized)) {
            return [];
        }
        $originalUrl = (string) ($normalized['original_url'] ?? '');
        $proxyUrl = $this->build_uploaded_artwork_proxy_url($productId, $originalUrl, $variationId);
        if ($proxyUrl !== '') {
            $normalized['preview_url'] = $proxyUrl;
            $normalized['original_url'] = $proxyUrl;
        }
        return $normalized;
    }

    private function resolve_uploaded_file(WP_REST_Request $request): array
    {
        $files = $request->get_file_params();
        $file = isset($files['file']) && is_array($files['file']) ? $files['file'] : null;
        if (! is_array($file) || empty($file['tmp_name']) || ! is_string($file['tmp_name']) || ! file_exists($file['tmp_name'])) {
            throw new RuntimeException(esc_html__('Upload file is required.', 'mockup100-pod-customizer'));
        }
        $name = sanitize_file_name((string) ($file['name'] ?? 'upload.png'));
        $ext = strtolower((string) pathinfo($name, PATHINFO_EXTENSION));
        $allowed = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
        ];
        if (! isset($allowed[$ext])) {
            throw new RuntimeException(esc_html__('Unsupported image format.', 'mockup100-pod-customizer'));
        }
        return [
            'name' => $name,
            'tmp_name' => $file['tmp_name'],
            'type' => $allowed[$ext],
            'file_ext' => $ext,
        ];
    }

    private function normalize_uploaded_artwork_name(string $fileName): string
    {
        $label = trim((string) pathinfo($fileName, PATHINFO_FILENAME));
        if ($label === '') {
            return __('Uploaded artwork', 'mockup100-pod-customizer');
        }
        return sanitize_text_field($label);
    }

    private function upload_file_to_oss(array $file): array
    {
        if (! $this->api_proxy->is_artwork_oss_configured()) {
            // 商家未配置自有 OSS：fallback 到平台 OSS 代理上传
            return $this->upload_file_via_platform($file);
        }
        $config = $this->api_proxy->get_artwork_oss_config();
        $user = $this->build_wordpress_user_context();
        $keyPrefix = trim((string) ($config['key_prefix'] ?? 'artworks/wordpress'), '/');
        $ext = sanitize_text_field((string) ($file['file_ext'] ?? 'png'));
        $objectKey = $keyPrefix . '/'
            . sanitize_title((string) ($user['site_host'] ?? 'site')) . '/'
            . sanitize_title((string) ($user['user_login'] ?? 'user')) . '/'
            . gmdate('Y/m') . '/'
            . wp_generate_uuid4() . '.' . $ext;
        $binary = file_get_contents((string) $file['tmp_name']);
        if (! is_string($binary) || $binary === '') {
            throw new RuntimeException(esc_html__('Unable to read uploaded file.', 'mockup100-pod-customizer'));
        }
        $requestUrl = $this->build_oss_request_url($config, $objectKey);
        $date = gmdate('D, d M Y H:i:s') . ' GMT';
        $authorization = $this->build_oss_authorization(
            'PUT',
            (string) $file['type'],
            $date,
            '/' . $config['bucket'] . '/' . ltrim($objectKey, '/'),
            (string) $config['access_key_id'],
            (string) $config['access_key_secret']
        );
        $response = wp_remote_request($requestUrl, [
            'method' => 'PUT',
            'timeout' => 60,
            'headers' => [
                'Date' => $date,
                'Content-Type' => (string) $file['type'],
                'Authorization' => $authorization,
            ],
            'body' => $binary,
        ]);
        if (is_wp_error($response)) {
            throw new RuntimeException(esc_html($response->get_error_message()));
        }
        $status = (int) wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException(esc_html__('OSS upload failed.', 'mockup100-pod-customizer'));
        }
        $publicUrl = $this->build_oss_public_url($config, $objectKey);
        return [
            'original_url' => $publicUrl,
            'preview_url' => $publicUrl,
            'object_key' => $objectKey,
            'file_ext' => $ext,
        ];
    }

    /**
     * 通过平台代理上传图片到平台 OSS（fallback：商家未配置自有 OSS）。
     */
    private function upload_file_via_platform(array $file): array
    {
        $ext = sanitize_text_field((string) ($file['file_ext'] ?? 'png'));
        $user = $this->build_wordpress_user_context();
        $context = [
            'site_host' => (string) ($user['site_host'] ?? ''),
            'user_login' => (string) ($user['user_login'] ?? ''),
        ];
        $proxyHeaders = $this->build_wordpress_proxy_headers();
        $result = $this->api_proxy->upload_artwork_via_platform($file, $context, $proxyHeaders);
        $previewUrl = (string) ($result['preview_url'] ?? '');
        $originalUrl = (string) ($result['original_url'] ?? $previewUrl);
        $objectKey = (string) ($result['object_key'] ?? '');
        if ($previewUrl === '' || $originalUrl === '') {
            throw new RuntimeException(esc_html__('Platform OSS upload failed.', 'mockup100-pod-customizer'));
        }
        return [
            'original_url' => $originalUrl,
            'preview_url' => $previewUrl,
            'object_key' => $objectKey,
            'file_ext' => (string) ($result['file_ext'] ?? $ext),
        ];
    }

    private function build_uploaded_artwork_proxy_url(int $productId, string $sourceUrl, int $variationId = 0): string
    {
        $sourceUrl = $this->normalize_public_asset_url($sourceUrl);
        if ($productId <= 0 || $sourceUrl === '') {
            return '';
        }
        $basePath = (string) wp_parse_url(
            rest_url('mockup100/v1/product/' . $productId . '/runtime-asset'),
            PHP_URL_PATH
        );
        if ($basePath === '') {
            return '';
        }
        $query = [
            'url' => $sourceUrl,
        ];
        if ($variationId > 0) {
            $query['variation_id'] = $variationId;
        }
        return $basePath . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    private function delete_oss_object_for_record(array $record): void
    {
        $objectKey = sanitize_text_field((string) ($record['object_key'] ?? ''));
        if ($objectKey === '') {
            return;
        }
        // 优先使用商家自有 OSS 直删；否则 fallback 到平台代理删除
        if (! $this->api_proxy->is_artwork_oss_configured()) {
            try {
                $this->api_proxy->delete_artwork_via_platform(
                    $objectKey,
                    $this->build_wordpress_proxy_headers()
                );
            } catch (Throwable $exception) {
                // 删除失败不阻断主流程
            }
            return;
        }
        $config = $this->api_proxy->get_artwork_oss_config();
        $requestUrl = $this->build_oss_request_url($config, $objectKey);
        $date = gmdate('D, d M Y H:i:s') . ' GMT';
        $authorization = $this->build_oss_authorization(
            'DELETE',
            '',
            $date,
            '/' . $config['bucket'] . '/' . ltrim($objectKey, '/'),
            (string) $config['access_key_id'],
            (string) $config['access_key_secret']
        );
        $response = wp_remote_request($requestUrl, [
            'method' => 'DELETE',
            'timeout' => 30,
            'headers' => [
                'Date' => $date,
                'Authorization' => $authorization,
            ],
        ]);
        if (is_wp_error($response)) {
            return;
        }
    }

    private function proxy_remote_asset_response(string $url)
    {
        $objectKey = $this->extract_oss_object_key_from_url($url);
        if ($objectKey !== '') {
            return $this->download_oss_object($objectKey);
        }
        $headers = [
            'Accept' => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        ];
        // 平台 external API 受 x-api-key 保护(compose outputs preview/download),
        // 这里把租户 API key 透传过去,否则代理会拿到 401。
        if ($this->is_external_api_runtime_url($url)) {
            $apiKey = $this->api_proxy->get_api_key();
            if ($apiKey !== '') {
                $headers['x-api-key'] = $apiKey;
            }
        }
        // 使用 wp_remote_get 替代 wp_safe_remote_get 以避免内部 OSS 域名被 reject_unsafe_urls 拦截，
        // 同时放宽超时并关闭 sslverify 防握手失败，缓解 ERR_CONNECTION_CLOSED。
        return wp_remote_get($url, [
            'timeout' => 60,
            'redirection' => 3,
            'sslverify' => false,
            'user-agent' => 'Mockup100-WP-Plugin/1.0',
            'headers' => $headers,
        ]);
    }

    private function download_oss_object(string $objectKey)
    {
        if ($objectKey === '' || ! $this->api_proxy->is_artwork_oss_configured()) {
            return new WP_Error('mockup100_oss_unavailable', __('OSS is not configured.', 'mockup100-pod-customizer'));
        }
        $config = $this->api_proxy->get_artwork_oss_config();
        $requestUrl = $this->build_oss_request_url($config, $objectKey);
        $date = gmdate('D, d M Y H:i:s') . ' GMT';
        $authorization = $this->build_oss_authorization(
            'GET',
            '',
            $date,
            '/' . $config['bucket'] . '/' . ltrim($objectKey, '/'),
            (string) $config['access_key_id'],
            (string) $config['access_key_secret']
        );
        return wp_remote_get($requestUrl, [
            'timeout' => 30,
            'redirection' => 3,
            'headers' => [
                'Date' => $date,
                'Authorization' => $authorization,
                'Accept' => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            ],
        ]);
    }

    private function extract_oss_object_key_from_url(string $url): string
    {
        if (! $this->api_proxy->is_artwork_oss_configured()) {
            return '';
        }
        $normalized = $this->normalize_public_asset_url($url);
        if ($normalized === '') {
            return '';
        }
        $config = $this->api_proxy->get_artwork_oss_config();
        $publicBase = untrailingslashit((string) ($config['public_base_url'] ?? ''));
        if ($publicBase !== '' && strpos($normalized, $publicBase . '/') === 0) {
            return ltrim(substr($normalized, strlen($publicBase)), '/');
        }
        $parts = wp_parse_url($normalized);
        $path = isset($parts['path']) ? ltrim((string) $parts['path'], '/') : '';
        if ($path === '') {
            return '';
        }
        $requestUrl = $this->build_oss_request_url($config, '');
        $requestHost = strtolower((string) wp_parse_url($requestUrl, PHP_URL_HOST));
        $host = strtolower((string) ($parts['host'] ?? ''));
        return $host !== '' && $requestHost !== '' && $host === $requestHost ? $path : '';
    }

    private function build_oss_request_url(array $config, string $objectKey): string
    {
        $endpoint = trim((string) ($config['endpoint'] ?? ''));
        if ($endpoint === '') {
            throw new RuntimeException(esc_html__('OSS endpoint is required.', 'mockup100-pod-customizer'));
        }
        $parts = wp_parse_url(preg_match('#^https?://#i', $endpoint) === 1 ? $endpoint : 'https://' . $endpoint);
        $scheme = (string) ($parts['scheme'] ?? 'https');
        $host = (string) ($parts['host'] ?? '');
        if ($host === '') {
            throw new RuntimeException(esc_html__('Invalid OSS endpoint.', 'mockup100-pod-customizer'));
        }
        $bucket = trim((string) ($config['bucket'] ?? ''));
        if ($bucket !== '' && strpos($host, $bucket . '.') !== 0) {
            $host = $bucket . '.' . $host;
        }
        return $scheme . '://' . $host . '/' . ltrim($objectKey, '/');
    }

    private function build_oss_public_url(array $config, string $objectKey): string
    {
        $base = untrailingslashit((string) ($config['public_base_url'] ?? ''));
        if ($base !== '') {
            return $base . '/' . ltrim($objectKey, '/');
        }
        return $this->build_oss_request_url($config, $objectKey);
    }

    private function build_oss_authorization(
        string $method,
        string $contentType,
        string $date,
        string $canonicalResource,
        string $accessKeyId,
        string $accessKeySecret
    ): string {
        $stringToSign = strtoupper($method) . "\n\n" . $contentType . "\n" . $date . "\n" . $canonicalResource;
        $signature = base64_encode(hash_hmac('sha1', $stringToSign, $accessKeySecret, true));
        return 'OSS ' . $accessKeyId . ':' . $signature;
    }

    private function decode_json_request(WP_REST_Request $request): array
    {
        $raw = json_decode((string) $request->get_body(), true);
        return is_array($raw) ? $raw : [];
    }

    private function decode_data_url(string $data_url): array
    {
        if (! preg_match('/^data:(.*?);base64,(.*)$/', $data_url, $matches)) {
            throw new RuntimeException(esc_html__('Invalid canvas payload.', 'mockup100-pod-customizer'));
        }

        $content = base64_decode($matches[2], true);
        if ($content === false) {
            throw new RuntimeException(esc_html__('Unable to decode canvas payload.', 'mockup100-pod-customizer'));
        }

        return [
            'mime' => $matches[1] ?: 'image/png',
            'content' => $content,
        ];
    }

    private function normalize_public_asset_url(string $url): string
    {
        $normalized = trim($url);
        if ($normalized === '') {
            return '';
        }
        if (preg_match('#^https?://#i', $normalized) === 1) {
            return $normalized;
        }
        return untrailingslashit($this->api_proxy->get_base_url()) . '/' . ltrim($normalized, '/');
    }

    /**
     * 规范化 compose / job_results 返回的 outputs 数组：
     * - 把相对 preview_url/download_url 拼为绝对 URL
     * - 因平台 ExternalRuntimeController 主动移除了 file_path,
     *   将 preview_url 同步写回 file_path 字段供前端 setPreviewOutput / export 流程直接使用
     */
    private function normalize_compose_outputs(array $outputs): array
    {
        $normalized = [];
        foreach ($outputs as $item) {
            if (! is_array($item)) {
                continue;
            }
            $previewUrl = $this->normalize_public_asset_url((string) ($item['preview_url'] ?? ''));
            $downloadUrl = $this->normalize_public_asset_url((string) ($item['download_url'] ?? ''));
            $filePath = (string) ($item['file_path'] ?? '');
            if ($filePath === '') {
                // 优先使用 preview_url 作为 file_path 兜底,前端 renderFileUrl 会通过
                // resolveRuntimeAssetUrl 自动转走 plugin runtime-asset 代理。
                $filePath = $previewUrl !== '' ? $previewUrl : $downloadUrl;
            } else {
                $filePath = $this->normalize_public_asset_url($filePath);
            }
            if ($previewUrl !== '') {
                $item['preview_url'] = $previewUrl;
            }
            if ($downloadUrl !== '') {
                $item['download_url'] = $downloadUrl;
            }
            if ($filePath !== '') {
                $item['file_path'] = $filePath;
            }
            $normalized[] = $item;
        }
        return $normalized;
    }

    public function proxy_template_cover(): void
    {
        if (! isset($_GET['_wpnonce']) || ! wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'mockup100_template_cover')) {
            status_header(403);
            exit;
        }

        if (! current_user_can('manage_woocommerce')) {
            status_header(403);
            exit;
        }

        $requested = isset($_GET['url']) ? esc_url_raw(wp_unslash((string) $_GET['url'])) : '';
        $url = $this->normalize_public_asset_url($requested);
        if ($url === '' || ! $this->is_allowed_admin_asset_url($url)) {
            status_header(400);
            exit;
        }

        $response = wp_safe_remote_get($url, [
            'timeout' => 20,
            'redirection' => 3,
            'reject_unsafe_urls' => true,
        ]);
        if (is_wp_error($response)) {
            status_header(502);
            exit;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            status_header($status > 0 ? $status : 502);
            exit;
        }

        $body = wp_remote_retrieve_body($response);
        if (! is_string($body) || $body === '') {
            status_header(404);
            exit;
        }

        $contentType = (string) wp_remote_retrieve_header($response, 'content-type');
        if ($contentType === '') {
            $contentType = 'image/jpeg';
        }

        nocache_headers();
        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . strlen($body));
        echo $body; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 直接透传上游图片二进制响应体,不能做 HTML 转义
        exit;
    }

    private function build_admin_asset_proxy_url(string $url): string
    {
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

    private function is_allowed_admin_asset_url(string $url): bool
    {
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

    private function is_allowed_runtime_asset_url(string $url): bool
    {
        // 0.4.78 (Task 8.2): runtime-asset 代理双层白名单 —
        //   1) 域名必须落在受信任 host 列表(oss.mockup100.com / *.mockup100.com / *.aliyuncs.com / 平台 base host);
        //   2) 路径必须以已知前缀开头(runtime / grading / artworks / cart-snapshots / order-snapshots / external job)
        // 任一不满足 → 返回 false → proxy_runtime_asset 直接 403。
        if (! $this->is_allowed_runtime_asset_host($url) && ! $this->is_allowed_admin_asset_url($url)) {
            return false;
        }
        $path = (string) wp_parse_url($url, PHP_URL_PATH);
        $allowedPrefixes = [
            '/runtime/',
            '/runtime-assets/',
            '/render-files/',
            '/render-archives/',
            '/grading/',
            '/api/v1/external/runtime/jobs/',
            '/artworks/',
            '/cart-snapshots/',
            '/mockup-saas/cart-snapshots/',
            '/order-snapshots/',
            '/mockup-saas/order-snapshots/',
        ];
        foreach ($allowedPrefixes as $prefix) {
            if (strpos($path, $prefix) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断 URL 是否指向受 x-api-key 保护的平台 external API（compose outputs 等），
     * 这种代理请求需要附加租户 API key 才能拿到内容。
     */
    private function is_external_api_runtime_url(string $url): bool
    {
        if (! $this->is_allowed_admin_asset_url($url)) {
            return false;
        }
        $path = (string) wp_parse_url($url, PHP_URL_PATH);
        return strpos($path, '/api/v1/external/runtime/jobs/') !== false;
    }

    /**
     * 是否属于受信任的运行时资源主机。包括 oss.mockup100.com / *.mockup100.com /
     * *.aliyuncs.com(OSS 默认域)。
     */
    private function is_allowed_runtime_asset_host(string $url): bool
    {
        $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }
        $trusted = [
            'oss.mockup100.com',
            'cdn.mockup100.com',
            'static.mockup100.com',
            'assets.mockup100.com',
        ];
        if (in_array($host, $trusted, true)) {
            return true;
        }
        // *.mockup100.com / *.aliyuncs.com / *.oss-cn-*.aliyuncs.com
        if (preg_match('/(^|\.)mockup100\.com$/', $host) === 1) {
            return true;
        }
        if (preg_match('/(^|\.)aliyuncs\.com$/', $host) === 1) {
            return true;
        }
        return false;
    }

    private function host_root_domain(string $host): string
    {
        $normalized = trim(strtolower($host), '.');
        if ($normalized === '') {
            return '';
        }

        $parts = array_values(array_filter(explode('.', $normalized), static fn($item) => $item !== ''));
        $count = count($parts);
        if ($count <= 2) {
            return $normalized;
        }

        return $parts[$count - 2] . '.' . $parts[$count - 1];
    }

    private function resolve_finished_product_code(int $product_id, int $variation_id, array $payload, array $selected): string
    {
        $provided = sanitize_text_field((string) ($payload['finished_product_code'] ?? ''));
        if ($provided !== '') {
            return $provided;
        }

        if ($variation_id > 0 && function_exists('wc_get_product')) {
            $variation = wc_get_product($variation_id);
            if ($variation instanceof WC_Product) {
                $sku = sanitize_text_field((string) $variation->get_sku());
                if ($sku !== '') {
                    return $sku;
                }
            }
        }

        if ($product_id > 0 && function_exists('wc_get_product')) {
            $product = wc_get_product($product_id);
            if ($product instanceof WC_Product) {
                $sku = sanitize_text_field((string) $product->get_sku());
                if ($sku !== '') {
                    return $sku;
                }
            }
        }

        $templateCode = sanitize_text_field((string) ($selected['template_code'] ?? ''));
        if ($variation_id > 0) {
            return $templateCode !== ''
                ? 'wc-variation-' . $variation_id . '-' . $templateCode
                : 'wc-product-' . $product_id . '-variation-' . $variation_id;
        }

        return $templateCode !== ''
            ? 'wc-product-' . $product_id . '-' . $templateCode
            : 'wc-product-' . $product_id;
    }

    /**
     * 0.4.69 (Plan §3.1+§3.2): POST /wp-json/mockup100/v1/cart-snapshots
     *
     * 入参 JSON:
     *   {
     *     "unique_key": "{template_id}|{draft_id}|{row_id}",
     *     "items": [{ "color": "black", "view": "view_001", "source_url": "https://oss.../runtime-assets/.../preview.png" }]
     *   }
     *
     * 行为:对每个 item 执行 OSS-side copy,把 source_url 对应的 OSS object 复制到
     *      cart-snapshots/{sanitized_unique_key}/{color}_{view}.png
     *      返回 { snapshots: [{ color, view, url }] }。
     *
     * 备份位置独立于 runtime-assets,后续即使设计稿编辑也不会覆盖该备份。
     * 备份 URL 也是私有 bucket,cart 渲染时会被 wrap_runtime_asset_url 包装为 WP 代理路径。
     */
    public function clone_to_cart_snapshots(WP_REST_Request $request): WP_REST_Response
    {
        try {
            // 0.4.78 (Task 8.1): 强制登录 + owner-token 前缀绑定(防止 user A 覆盖 user B 的 cart-snapshots)
            if (! is_user_logged_in()) {
                return new WP_REST_Response(['message' => 'login_required'], 401);
            }
            $payload = $this->decode_json_request($request);
            $uniqueKey = sanitize_text_field((string) ($payload['unique_key'] ?? ''));
            $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : [];
            if ($uniqueKey === '' || empty($items)) {
                return new WP_REST_Response(['message' => 'unique_key and items are required'], 400);
            }
            // 0.4.78 (Task 8.1): 把 unique_key 强制加上 cart_snapshot_user_${user_id}_ 前缀,
            // 即便客户端 unique_key 完全相同,不同用户也写入互相隔离的 OSS prefix。
            $uniqueKey = $this->bind_cart_snapshot_owner_prefix($uniqueKey);
            // 0.4.71: OSS 未配置不应让前端 console.warn → 直接返回 200 + 空 snapshots,
            // 前端会保留原 OSS / 代理 URL 作为 cart 主图,主图本身不依赖独立备份目录。
            if (! $this->api_proxy->is_artwork_oss_configured()) {
                return new WP_REST_Response(['snapshots' => [], 'skipped' => true, 'reason' => 'oss_not_configured'], 200);
            }
            $config = $this->api_proxy->get_artwork_oss_config();
            $sanitizedKey = $this->sanitize_cart_snapshot_key($uniqueKey);
            $snapshots = [];
            foreach ($items as $item) {
                if (!is_array($item)) continue;
                $color = sanitize_text_field((string) ($item['color'] ?? ''));
                $view = sanitize_text_field((string) ($item['view'] ?? ''));
                $sourceUrl = (string) ($item['source_url'] ?? '');
                if ($color === '' || $view === '' || $sourceUrl === '') continue;
                $sourceKey = $this->extract_oss_object_key_from_url($sourceUrl);
                if ($sourceKey === '') {
                    // 非 OSS host 直链,skip(理论上前端只发 runtime-assets URL)
                    continue;
                }
                $colorSlug = $this->sanitize_cart_snapshot_segment($color);
                $viewSlug = $this->sanitize_cart_snapshot_segment($view);
                $destKey = 'mockup-saas/cart-snapshots/' . $sanitizedKey . '/' . $colorSlug . '_' . $viewSlug . '.png';
                $copyOk = $this->copy_oss_object($config, $sourceKey, $destKey);
                if (!$copyOk) continue;
                $snapshots[] = [
                    'color' => $color,
                    'view' => $view,
                    'url' => $this->build_oss_public_url($config, $destKey),
                ];
            }
            return new WP_REST_Response(['snapshots' => $snapshots], 200);
        } catch (Throwable $exception) {
            return new WP_REST_Response(['message' => $exception->getMessage()], 500);
        }
    }

    /**
     * unique_key 格式 = "{template_id}|{draft_id}|{row_id}",对每段做 sanitize 再用 _ 拼接,
     * 防止 OSS object key 出现非法字符。
     */
    private function sanitize_cart_snapshot_key(string $uniqueKey): string
    {
        $segments = explode('|', $uniqueKey);
        $clean = [];
        foreach ($segments as $segment) {
            $clean[] = $this->sanitize_cart_snapshot_segment($segment);
        }
        return implode('__', array_filter($clean, static fn($s) => $s !== ''));
    }

    private function sanitize_cart_snapshot_segment(string $segment): string
    {
        $segment = preg_replace('/[^A-Za-z0-9_\-]+/', '_', $segment);
        return trim((string) $segment, '_');
    }

    /**
     * 0.4.78 (Task 8.1): 给 unique_key 强制加上 cart_snapshot_user_${user_id}_ 前缀,
     * 写入 / 删除 cart-snapshots 时都走同一条规则,保证 user A 不能影响 user B 的 OSS 对象。
     * 已带前缀的 key 不重复包装(用于服务端钩子内部调用,例如 cart_item_removed 走 do_cleanup_cart_snapshot)。
     */
    private function bind_cart_snapshot_owner_prefix(string $uniqueKey): string
    {
        $userId = function_exists('get_current_user_id') ? (int) get_current_user_id() : 0;
        if ($userId <= 0) {
            return $uniqueKey;
        }
        $ownerPrefix = 'cart_snapshot_user_' . $userId . '_';
        if (strpos($uniqueKey, $ownerPrefix) === 0) {
            return $uniqueKey;
        }
        return $ownerPrefix . $uniqueKey;
    }

    /**
     * OSS-side 文件复制 (PUT with x-oss-copy-source header)。
     * 不下载源文件、不重新上传,直接命令 OSS 服务端复制,效率最高。
     */
    private function copy_oss_object(array $config, string $sourceKey, string $destKey): bool
    {
        if ($sourceKey === '' || $destKey === '') return false;
        $bucket = (string) ($config['bucket'] ?? '');
        if ($bucket === '') return false;
        $requestUrl = $this->build_oss_request_url($config, $destKey);
        $date = gmdate('D, d M Y H:i:s') . ' GMT';
        $copySource = '/' . $bucket . '/' . ltrim($sourceKey, '/');
        // OSS 签名规范: 复制操作的 stringToSign 需要包含 x-oss-copy-source CanonicalizedOSSHeaders
        $canonicalizedHeaders = 'x-oss-copy-source:' . $copySource . "\n";
        $canonicalResource = '/' . $bucket . '/' . ltrim($destKey, '/');
        $stringToSign = "PUT\n\n\n" . $date . "\n" . $canonicalizedHeaders . $canonicalResource;
        $signature = base64_encode(hash_hmac('sha1', $stringToSign, (string) $config['access_key_secret'], true));
        $authorization = 'OSS ' . (string) $config['access_key_id'] . ':' . $signature;
        $response = wp_remote_request($requestUrl, [
            'method' => 'PUT',
            'timeout' => 30,
            'headers' => [
                'Date' => $date,
                'Authorization' => $authorization,
                'x-oss-copy-source' => $copySource,
                'Content-Length' => '0',
            ],
        ]);
        if (is_wp_error($response)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- OSS 拷贝失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('[Mockup100 cart-snapshot copy] error: ' . $response->get_error_message());
            }
            return false;
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code < 200 || $code >= 300) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- OSS 拷贝失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('[Mockup100 cart-snapshot copy] HTTP ' . $code . ' body=' . substr((string) wp_remote_retrieve_body($response), 0, 300));
            }
            return false;
        }
        return true;
    }

    /**
     * 0.4.69 (Plan §3.3): cart 行删除时调用,删除 cart-snapshots/{unique_key}/ 前缀下的所有对象。
     * 通过 GetBucket (List) + DeleteMultipleObjects 完成。
     * 0.4.78 (Task 8.1): owner-token 前缀绑定 — 删除 key 必须先经过 cart_snapshot_user_${ownerUserId}_ 前缀
     * 包装(若已带前缀则保留),避免越权命中其他用户的 OSS 对象。
     */
    public function delete_cart_snapshot_prefix(string $uniqueKey, int $ownerUserId = 0): void
    {
        if ($uniqueKey === '') return;
        if (! $this->api_proxy->is_artwork_oss_configured()) return;
        // 0.4.78 (Task 8.1): WP-Cron 上下文 get_current_user_id()=0,因此走显式传入的 ownerUserId;
        // 若未传(legacy 调用)则降级走当前会话 user。
        if ($ownerUserId > 0) {
            $ownerPrefix = 'cart_snapshot_user_' . $ownerUserId . '_';
            if (strpos($uniqueKey, $ownerPrefix) !== 0) {
                $uniqueKey = $ownerPrefix . $uniqueKey;
            }
        } else {
            $uniqueKey = $this->bind_cart_snapshot_owner_prefix($uniqueKey);
        }
        $config = $this->api_proxy->get_artwork_oss_config();
        $sanitizedKey = $this->sanitize_cart_snapshot_key($uniqueKey);
        $prefix = 'mockup-saas/cart-snapshots/' . $sanitizedKey . '/';
        $bucket = (string) ($config['bucket'] ?? '');
        if ($bucket === '') return;
        // GET / ?prefix=...
        $listUrl = $this->build_oss_request_url($config, '') . '?prefix=' . rawurlencode($prefix);
        $date = gmdate('D, d M Y H:i:s') . ' GMT';
        $canonicalResource = '/' . $bucket . '/?prefix=' . $prefix;
        // OSS 列举对象需要在 canonical resource 中保留 sub-resource 但 prefix 不是 sub-resource,
        // 实际上 List 操作签名 canonical resource 只用 /{bucket}/。
        $signString = "GET\n\n\n" . $date . "\n" . '/' . $bucket . '/';
        $signature = base64_encode(hash_hmac('sha1', $signString, (string) $config['access_key_secret'], true));
        $auth = 'OSS ' . (string) $config['access_key_id'] . ':' . $signature;
        $listResp = wp_remote_get($listUrl, [
            'timeout' => 30,
            'headers' => [
                'Date' => $date,
                'Authorization' => $auth,
            ],
        ]);
        if (is_wp_error($listResp)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- OSS 列举 cart-snapshots 失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('[Mockup100 cart-snapshot list] error: ' . $listResp->get_error_message());
            }
            return;
        }
        $body = (string) wp_remote_retrieve_body($listResp);
        if ($body === '') return;
        // 解析 <Contents><Key>...</Key></Contents>
        $keys = [];
        if (preg_match_all('#<Key>([^<]+)</Key>#', $body, $matches)) {
            foreach ($matches[1] as $k) {
                $keys[] = (string) $k;
            }
        }
        if (empty($keys)) return;
        // 逐个 DELETE(避免组装 multipart DeleteMultipleObjects 的复杂签名,数量小时 perf 影响有限)
        foreach ($keys as $k) {
            $delUrl = $this->build_oss_request_url($config, $k);
            $delDate = gmdate('D, d M Y H:i:s') . ' GMT';
            $delAuth = $this->build_oss_authorization(
                'DELETE',
                '',
                $delDate,
                '/' . $bucket . '/' . ltrim($k, '/'),
                (string) $config['access_key_id'],
                (string) $config['access_key_secret']
            );
            wp_remote_request($delUrl, [
                'method' => 'DELETE',
                'timeout' => 15,
                'headers' => [
                    'Date' => $delDate,
                    'Authorization' => $delAuth,
                ],
            ]);
        }
    }

    /**
     * 0.4.69 (Plan §4.1): 把 cart-snapshots/{unique_key}/{color}_{view}.png 状态迁移到
     * order-snapshots/{order_id}/{cart_item_key}/{color}_{view}.png。
     *
     * 实现 = OSS-side copy + DELETE 源对象(rename 语义)。
     * - copy 失败 → 抛异常,让调用方决定是否回退到原 cart-snapshot URL
     * - DELETE 源失败 → 仅 error_log,因为目标已存在,后续 cart-snapshots 30s 延迟清理钩子也能兜底
     *
     * 返回 destKey 对应的 OSS public URL(后续会被 wrap_runtime_asset_url 包装为 WP 代理路径)。
     */
    public function rename_cart_snapshot_to_order_snapshot(int $orderId, string $cartItemKey, string $color, string $view, string $sourceUrl): string
    {
        if ($orderId <= 0 || $cartItemKey === '' || $color === '' || $view === '' || $sourceUrl === '') return '';
        if (! $this->api_proxy->is_artwork_oss_configured()) return '';
        $config = $this->api_proxy->get_artwork_oss_config();
        $sourceKey = $this->extract_oss_object_key_from_url($sourceUrl);
        if ($sourceKey === '') return '';

        $cartKeySanitized = $this->sanitize_cart_snapshot_segment($cartItemKey);
        $colorSlug = $this->sanitize_cart_snapshot_segment($color);
        $viewSlug = $this->sanitize_cart_snapshot_segment($view);
        $destKey = 'mockup-saas/order-snapshots/' . $orderId . '/' . $cartKeySanitized . '/' . $colorSlug . '_' . $viewSlug . '.png';

        if (! $this->copy_oss_object($config, $sourceKey, $destKey)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- OSS 重命名拷贝失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('[Mockup100 cart->order rename] copy failed source=' . $sourceKey . ' dest=' . $destKey);
            }
            return '';
        }

        // DELETE source — 失败仅记日志,目标已存在,cart-snapshots 30s 延迟清理也会兜底。
        $bucket = (string) ($config['bucket'] ?? '');
        if ($bucket !== '') {
            $delUrl = $this->build_oss_request_url($config, $sourceKey);
            $delDate = gmdate('D, d M Y H:i:s') . ' GMT';
            $delAuth = $this->build_oss_authorization(
                'DELETE',
                '',
                $delDate,
                '/' . $bucket . '/' . ltrim($sourceKey, '/'),
                (string) $config['access_key_id'],
                (string) $config['access_key_secret']
            );
            $delResp = wp_remote_request($delUrl, [
                'method' => 'DELETE',
                'timeout' => 15,
                'headers' => [
                    'Date' => $delDate,
                    'Authorization' => $delAuth,
                ],
            ]);
            if (is_wp_error($delResp)) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- OSS 删除源对象失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                    error_log('[Mockup100 cart->order rename] delete source error: ' . $delResp->get_error_message());
                }
            }
        }

        return $this->build_oss_public_url($config, $destKey);
    }

    /**
     * 0.4.69 (Plan §4.2): 订单 force-delete 时调用,删除 order-snapshots/{orderId}/ 前缀下的所有对象。
     * 实现复用 delete_cart_snapshot_prefix 的 List + 逐个 DELETE 模式。
     */
    public function delete_order_snapshot_prefix(int $orderId): void
    {
        if ($orderId <= 0) return;
        if (! $this->api_proxy->is_artwork_oss_configured()) return;
        $config = $this->api_proxy->get_artwork_oss_config();
        $prefix = 'mockup-saas/order-snapshots/' . $orderId . '/';
        $bucket = (string) ($config['bucket'] ?? '');
        if ($bucket === '') return;
        $listUrl = $this->build_oss_request_url($config, '') . '?prefix=' . rawurlencode($prefix);
        $date = gmdate('D, d M Y H:i:s') . ' GMT';
        $signString = "GET\n\n\n" . $date . "\n" . '/' . $bucket . '/';
        $signature = base64_encode(hash_hmac('sha1', $signString, (string) $config['access_key_secret'], true));
        $auth = 'OSS ' . (string) $config['access_key_id'] . ':' . $signature;
        $listResp = wp_remote_get($listUrl, [
            'timeout' => 30,
            'headers' => [
                'Date' => $date,
                'Authorization' => $auth,
            ],
        ]);
        if (is_wp_error($listResp)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- OSS 列举 order-snapshots 失败仅在 WP_DEBUG 启用时记录,生产环境保持静默
                error_log('[Mockup100 order-snapshot list] error: ' . $listResp->get_error_message());
            }
            return;
        }
        $body = (string) wp_remote_retrieve_body($listResp);
        if ($body === '') return;
        $keys = [];
        if (preg_match_all('#<Key>([^<]+)</Key>#', $body, $matches)) {
            foreach ($matches[1] as $k) {
                $keys[] = (string) $k;
            }
        }
        if (empty($keys)) return;
        foreach ($keys as $k) {
            $delUrl = $this->build_oss_request_url($config, $k);
            $delDate = gmdate('D, d M Y H:i:s') . ' GMT';
            $delAuth = $this->build_oss_authorization(
                'DELETE',
                '',
                $delDate,
                '/' . $bucket . '/' . ltrim($k, '/'),
                (string) $config['access_key_id'],
                (string) $config['access_key_secret']
            );
            wp_remote_request($delUrl, [
                'method' => 'DELETE',
                'timeout' => 15,
                'headers' => [
                    'Date' => $delDate,
                    'Authorization' => $delAuth,
                ],
            ]);
        }
    }
}
