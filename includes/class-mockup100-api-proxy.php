<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Api_Proxy {
    public const OPTION_KEY = 'mockup100_preview_settings';
    private const SUPPORTED_OUTPUT_SIZES = ['512x512', '1024x1024', '2048x2048', '4096x4096'];

    public function get_settings(): array {
        $settings = get_option(self::OPTION_KEY, []);

        return is_array($settings) ? $settings : [];
    }

    public function get_base_url(): string {
        $settings = $this->get_settings();
        $baseUrl = isset($settings['platform_base_url']) ? trim((string) $settings['platform_base_url']) : '';
        if ($baseUrl === '') {
            $baseUrl = 'https://www.mockup100.com';
        }
        return untrailingslashit($baseUrl);
    }

    public function get_api_key(): string {
        $settings = $this->get_settings();
        return isset($settings['tenant_api_key']) ? trim((string) $settings['tenant_api_key']) : '';
    }

    public function get_default_output_size(): string {
        $settings = $this->get_settings();
        return $this->normalize_output_size($settings['default_output_size'] ?? '1024x1024');
    }

    public function get_default_preview_size(): string {
        $settings = $this->get_settings();
        return $this->normalize_output_size($settings['default_preview_size'] ?? '1024x1024');
    }

    public function get_artwork_storage_provider(): string {
        $settings = $this->get_settings();
        $provider = strtolower(trim((string) ($settings['artwork_storage_provider'] ?? 'oss')));
        return $provider !== '' ? $provider : 'oss';
    }

    public function get_artwork_oss_config(): array {
        $settings = $this->get_settings();
        return [
            'endpoint' => trim((string) ($settings['artwork_oss_endpoint'] ?? '')),
            'bucket' => trim((string) ($settings['artwork_oss_bucket'] ?? '')),
            'access_key_id' => trim((string) ($settings['artwork_oss_access_key_id'] ?? '')),
            'access_key_secret' => trim((string) ($settings['artwork_oss_access_key_secret'] ?? '')),
            'public_base_url' => untrailingslashit(trim((string) ($settings['artwork_oss_public_base_url'] ?? ''))),
            'key_prefix' => trim((string) ($settings['artwork_oss_key_prefix'] ?? 'artworks/wordpress')),
        ];
    }

    public function is_artwork_oss_configured(): bool {
        $config = $this->get_artwork_oss_config();
        return $this->get_artwork_storage_provider() === 'oss'
            && $config['endpoint'] !== ''
            && $config['bucket'] !== ''
            && $config['access_key_id'] !== ''
            && $config['access_key_secret'] !== '';
    }

    public function is_configured(): bool {
        return $this->get_base_url() !== '' && $this->get_api_key() !== '';
    }

    public function list_templates(array $filters = []): array {
        $path = '/external/templates';
        $query = [];
        $keyword = isset($filters['keyword']) ? trim((string) $filters['keyword']) : '';
        $page = isset($filters['page']) ? max(1, (int) $filters['page']) : 1;
        $size = isset($filters['size']) ? max(1, (int) $filters['size']) : 100;

        $query['page'] = $page;
        $query['size'] = $size;
        if ($keyword !== '') {
            $query['keyword'] = $keyword;
        }
        if (! empty($query)) {
            $path .= '?' . http_build_query($query);
        }

        return $this->request_json('GET', $path);
    }

    public function list_all_templates(array $filters = []): array {
        $keyword = isset($filters['keyword']) ? trim((string) $filters['keyword']) : '';
        $categoryId = isset($filters['category_id']) ? trim((string) $filters['category_id']) : '';
        $page = 1;
        $size = isset($filters['size']) ? max(1, (int) $filters['size']) : 100;
        $records = [];
        $total = null;
        $pages = null;

        do {
            $payload = $this->list_templates([
                'page' => $page,
                'size' => $size,
                'keyword' => $keyword,
            ]);
            $pageRecords = isset($payload['records']) && is_array($payload['records']) ? $payload['records'] : [];
            $records = array_merge($records, $pageRecords);
            $total = isset($payload['total']) ? (int) $payload['total'] : $total;
            $pages = isset($payload['pages']) ? max(1, (int) $payload['pages']) : $pages;
            $page++;
            $reachedTotal = $total !== null && count($records) >= $total;
            $reachedPages = $pages !== null && $page > $pages;
        } while (! empty($pageRecords) && ! $reachedTotal && ! $reachedPages);

        if ($categoryId !== '') {
            $records = array_values(array_filter($records, static function ($item) use ($categoryId) {
                return is_array($item) && (string) ($item['category_id'] ?? '') === $categoryId;
            }));
        }

        return [
            'records' => $records,
            'total' => count($records),
            'page' => 1,
            'size' => count($records),
            'pages' => count($records) > 0 ? 1 : 0,
        ];
    }

    public function build_template_categories(array $templates): array {
        $categories = [];
        foreach ($templates as $item) {
            if (! is_array($item)) {
                continue;
            }
            $categoryId = trim((string) ($item['category_id'] ?? ''));
            if ($categoryId === '') {
                continue;
            }
            $categoryPath = trim((string) ($item['category_path'] ?? $categoryId));
            $categories[$categoryId] = [
                'category_id' => $categoryId,
                'category_path' => $categoryPath,
                'label' => $categoryPath,
            ];
        }

        uasort($categories, static function (array $left, array $right): int {
            return strcmp($left['label'], $right['label']);
        });

        return array_values($categories);
    }

    public function template_detail(string $template_reference, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/templates/' . rawurlencode($template_reference),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function template_editor(string $template_reference, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/templates/' . rawurlencode($template_reference) . '/editor',
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function list_artworks(array $query = [], array $extra_headers = []): array {
        $path = '/external/artworks';
        $query = array_filter($query, static function ($value) {
            return $value !== null && $value !== '';
        });
        if (! empty($query)) {
            $path .= '?' . http_build_query($query);
        }

        return $this->request_json('GET', $path, $this->with_extra_headers([], $extra_headers));
    }

    public function artwork_categories_tree(array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/artworks/categories/tree',
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function artwork_detail(string $artwork_id, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/artworks/' . rawurlencode($artwork_id),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function artwork_licenses(array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/artworks/licenses',
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function artwork_license_detail(string $artwork_id, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/artworks/licenses/' . rawurlencode($artwork_id),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function purchase_artwork(string $artwork_id, array $extra_headers = []): array {
        return $this->request_json(
            'POST',
            '/external/artworks/' . rawurlencode($artwork_id) . '/purchase',
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function list_preview_drafts(string $template_id, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/preview/drafts?' . http_build_query([
                'template_id' => $template_id,
            ]),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function create_preview_draft(array $payload, array $extra_headers = []): array {
        return $this->request_json('POST', '/external/preview/drafts', $this->with_extra_headers([
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($payload),
        ], $extra_headers));
    }

    public function update_preview_draft(string $draft_id, array $payload, array $extra_headers = []): array {
        return $this->request_json('PUT', '/external/preview/drafts/' . rawurlencode($draft_id), $this->with_extra_headers([
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($payload),
        ], $extra_headers));
    }

    public function delete_preview_draft(string $draft_id, array $extra_headers = []): array {
        return $this->request_json(
            'DELETE',
            '/external/preview/drafts/' . rawurlencode($draft_id),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function list_preview_outputs(string $template_id, int $limit = 100, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/preview/outputs?' . http_build_query([
                'template_id' => $template_id,
                'limit' => max(1, min(300, $limit)),
            ]),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function create_preview_output(array $payload, array $extra_headers = []): array {
        return $this->request_json('POST', '/external/preview/outputs', $this->with_extra_headers([
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($payload),
        ], $extra_headers));
    }

    public function delete_preview_output(string $output_id, array $extra_headers = []): array {
        return $this->request_json(
            'DELETE',
            '/external/preview/outputs/' . rawurlencode($output_id),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function compose_editor(array $fields, array $part_files, array $extra_headers = []): array {
        $boundary = 'mockup100-' . wp_generate_password(16, false, false);
        $body = '';

        foreach ($fields as $name => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $body .= '--' . $boundary . "\r\n";
            $body .= 'Content-Disposition: form-data; name="' . $name . '"' . "\r\n\r\n";
            $body .= (string) $value . "\r\n";
        }

        foreach ($part_files as $item) {
            if (! is_array($item) || empty($item['name']) || ! isset($item['content'])) {
                continue;
            }
            $body .= '--' . $boundary . "\r\n";
            $body .= 'Content-Disposition: form-data; name="part_images"; filename="' . sanitize_file_name((string) $item['name']) . '"' . "\r\n";
            $body .= 'Content-Type: ' . ($item['type'] ?? 'image/png') . "\r\n\r\n";
            $body .= $item['content'] . "\r\n";
        }

        $body .= '--' . $boundary . "--\r\n";

        return $this->request_json('POST', '/external/runtime/editor/compose', $this->with_extra_headers([
            'headers' => [
                'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
            ],
            'body' => $body,
        ], $extra_headers));
    }

    public function job_results(string $job_id, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/runtime/jobs/' . rawurlencode($job_id) . '/results',
            $this->with_extra_headers([], $extra_headers)
        );
    }

    public function job_status(string $job_id, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/runtime/jobs/' . rawurlencode($job_id),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    /**
     * 0.5.7: 后台订单详情页 Grading meta box 调用入口。
     * 把订单 line item 的 template_id + part_keys 作为 JSON body 投递给
     * Mockup100 SaaS Grading compose endpoint;鉴权仍然通过 request() 注入的
     * x-api-key header 完成,本方法不在前端泄漏 tenant key。
     *
     * 上游 endpoint 在未订阅时返回 message 含 GRADING_SUBSCRIPTION_REQUIRED 的 4xx,
     * request() 抛 RuntimeException 由调用方 (rest_dispatch_grading) 翻译成 402。
     */
    public function compose_grading(string $template_id, array $payload, array $extra_headers = []): array {
        $path = '/external/runtime/templates/' . rawurlencode($template_id) . '/grading/compose';
        return $this->request_json('POST', $path, $this->with_extra_headers([
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($payload),
            'timeout' => 120,
        ], $extra_headers));
    }

    public function list_uploaded_artworks(array $query = [], array $extra_headers = []): array {
        $path = '/external/artworks/uploads';
        $query = array_filter($query, static function ($value) {
            return $value !== null && $value !== '';
        });
        if (! empty($query)) {
            $path .= '?' . http_build_query($query);
        }

        return $this->request_json('GET', $path, $this->with_extra_headers([], $extra_headers));
    }

    public function uploaded_artwork_detail(string $artwork_id, array $extra_headers = []): array {
        return $this->request_json(
            'GET',
            '/external/artworks/uploads/' . rawurlencode($artwork_id),
            $this->with_extra_headers([], $extra_headers)
        );
    }

    /**
     * 通过平台代理上传图片到平台 OSS（fallback：商家未配置自有 OSS 时使用）。
     * @param array $file ['name', 'tmp_name', 'type', 'file_ext']
     * @param array $context ['site_host', 'user_login']
     * @return array ['preview_url', 'original_url', 'object_key', 'mime_type', 'file_ext', 'file_size']
     */
    public function upload_artwork_via_platform(array $file, array $context, array $extra_headers = []): array {
        $tmpName = (string) ($file['tmp_name'] ?? '');
        $binary = $tmpName !== '' && is_readable($tmpName) ? file_get_contents($tmpName) : '';
        if (! is_string($binary) || $binary === '') {
            throw new RuntimeException(esc_html__('Unable to read uploaded file.', 'mockup100-pod-customizer'));
        }
        $boundary = 'mockup100-' . wp_generate_password(16, false, false);
        $filename = sanitize_file_name((string) ($file['name'] ?? 'artwork.png'));
        $mime = (string) ($file['type'] ?? 'application/octet-stream');
        $body = '';
        $body .= '--' . $boundary . "\r\n";
        $body .= 'Content-Disposition: form-data; name="site_host"' . "\r\n\r\n";
        $body .= (string) ($context['site_host'] ?? '') . "\r\n";
        $body .= '--' . $boundary . "\r\n";
        $body .= 'Content-Disposition: form-data; name="user_login"' . "\r\n\r\n";
        $body .= (string) ($context['user_login'] ?? '') . "\r\n";
        $body .= '--' . $boundary . "\r\n";
        $body .= 'Content-Disposition: form-data; name="file"; filename="' . $filename . '"' . "\r\n";
        $body .= 'Content-Type: ' . $mime . "\r\n\r\n";
        $body .= $binary . "\r\n";
        $body .= '--' . $boundary . "--\r\n";

        return $this->request_json('POST', '/external/artworks/wp-upload', $this->with_extra_headers([
            'headers' => [
                'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
            ],
            'body' => $body,
            'timeout' => 120,
        ], $extra_headers));
    }

    /**
     * 删除平台 OSS 上的对象（仅允许删除当前 tenant 自己的 wordpress/<tenant>/ 前缀）。
     */
    public function delete_artwork_via_platform(string $object_key, array $extra_headers = []): array {
        $path = '/external/artworks/wp-upload?' . http_build_query(['object_key' => $object_key]);
        return $this->request_json('DELETE', $path, $this->with_extra_headers([], $extra_headers));
    }

    /**
     * 0.5.0 §Trialware-free: 站点/订单元数据上行同步必须由站点管理员显式 opt-in。
     * 默认关闭,避免 trialware 在用户不知情情况下回传隐私数据。
     */
    public function is_cloud_sync_opt_in(): bool {
        return (int) get_option('mockup100_cloud_opt_in', 0) === 1;
    }

    public function sync_woocommerce_site(array $payload): array {
        if (! $this->is_cloud_sync_opt_in()) {
            return ['skipped' => true, 'reason' => 'cloud_opt_in_disabled'];
        }
        return $this->request_json('POST', '/external/plugins/woocommerce/sync', [
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($payload),
        ]);
    }

    public function send_order_status(array $payload): array {
        if (! $this->is_cloud_sync_opt_in()) {
            return ['skipped' => true, 'reason' => 'cloud_opt_in_disabled'];
        }
        return $this->request_json('POST', '/external/plugins/woocommerce/orders/status', [
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($payload),
        ]);
    }

    public function request_json(string $method, string $path, array $args = []): array {
        $response = $this->request($method, $path, $args);
        $decoded = json_decode(wp_remote_retrieve_body($response), true);

        if (! is_array($decoded)) {
            throw new RuntimeException(esc_html__('Unexpected API response.', 'mockup100-pod-customizer'));
        }

        if (isset($decoded['data']) && is_array($decoded['data'])) {
            return $decoded['data'];
        }

        return $decoded;
    }

    public function request(string $method, string $path, array $args = []) {
        if (! $this->is_configured()) {
            throw new RuntimeException(esc_html__('Mockup100 plugin is not configured yet.', 'mockup100-pod-customizer'));
        }

        $headers = isset($args['headers']) && is_array($args['headers']) ? $args['headers'] : [];
        $headers['x-api-key'] = $this->get_api_key();
        $headers['Accept'] = 'application/json';
        unset($args['headers']);

        $request_args = array_merge(
            [
                'method' => strtoupper($method),
                'timeout' => 60,
                'headers' => $headers,
            ],
            $args
        );

        $url = $this->get_base_url() . '/api/v1' . $path;
        $response = wp_remote_request($url, $request_args);

        if (is_wp_error($response)) {
            // 0.4.47: 上游 HTTP 失败详细日志
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log(sprintf( // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 上游 HTTP 错误诊断日志,仅在 WP_DEBUG 启用时记录,生产环境保持静默
                    '[Mockup100 upstream_wp_error] method=%s path=%s error=%s',
                    strtoupper($method),
                    $path,
                    $response->get_error_message()
                ));
            }
            throw new RuntimeException(esc_html($response->get_error_message()));
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code < 200 || $code >= 300) {
            $raw_body = (string) wp_remote_retrieve_body($response);
            // 0.4.47: 上游非 2xx 详细日志(HTTP code + body 前 1500 字符)
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log(sprintf( // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 上游非 2xx 响应诊断日志,仅在 WP_DEBUG 启用时记录,生产环境保持静默
                    '[Mockup100 upstream_http_failure] method=%s path=%s code=%d body=%s',
                    strtoupper($method),
                    $path,
                    $code,
                    substr($raw_body, 0, 1500)
                ));
            }
            $body = json_decode($raw_body, true);
            $message = is_array($body) && isset($body['message']) ? (string) $body['message'] : ('HTTP ' . $code);
            // 0.4.50: 透传上游 HTTP code,让 WP 层能区分 402 余额不足/403 鉴权/4xx 业务/5xx 系统
            throw new RuntimeException(esc_html($message), $code); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- $code 为整型 HTTP 状态码,无需转义
        }

        return $response;
    }

    private function with_extra_headers(array $args, array $extra_headers): array {
        if (empty($extra_headers)) {
            return $args;
        }
        $headers = isset($args['headers']) && is_array($args['headers']) ? $args['headers'] : [];
        foreach ($extra_headers as $key => $value) {
            $headerName = is_string($key) ? trim($key) : '';
            if ($headerName === '' || $value === null) {
                continue;
            }
            $headers[$headerName] = (string) $value;
        }
        if (! empty($headers)) {
            $args['headers'] = $headers;
        }
        return $args;
    }

    private function normalize_output_size($value): string {
        $normalized = strtolower(preg_replace('/\s+/', '', (string) $value));
        return in_array($normalized, self::SUPPORTED_OUTPUT_SIZES, true) ? $normalized : '1024x1024';
    }
}
