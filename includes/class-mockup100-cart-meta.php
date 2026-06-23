<?php

if (! defined('ABSPATH')) {
    exit;
}

class Mockup100_Cart_Meta
{
    public const REQUEST_KEY = 'mockup100_design_payload';

    public function boot(): void
    {
        if (! class_exists('WooCommerce')) {
            return;
        }

        add_filter('woocommerce_add_to_cart_validation', [$this, 'validate'], 10, 3);
        add_filter('woocommerce_add_cart_item_data', [$this, 'add_cart_item_data'], 10, 3);
        add_filter('woocommerce_get_item_data', [$this, 'display_item_data'], 10, 2);
        add_action('woocommerce_checkout_create_order_line_item', [$this, 'store_order_item_meta'], 10, 4);
        add_filter('woocommerce_cart_item_thumbnail', [$this, 'override_cart_item_thumbnail'], 10, 3);
        add_filter('woocommerce_store_api_cart_item_images', [$this, 'override_store_api_cart_item_images'], 10, 3);
        add_filter('woocommerce_cart_item_name', [$this, 'override_cart_item_name'], 10, 3);
        // 0.5.5: 订单详情页 / 邮件 / 后台订单管理页面 meta 渲染对齐 cart 显示:
        //   1) `Design Thumbnail` meta 渲染为 <img> 而非 URL 文本(与 cart 主图一致)。
        //   2) 所有 `_mockup100_*` 内部 JSON / 标识字段加入 hidden meta 列表,
        //      避免后台订单"自定义字段"区域输出大段 JSON 噪声(_mockup100_design_summary /
        //      _mockup100_placeOrderRows / _mockup100_place_order_clone / _mockup100_part_layers 等)。
        add_filter('woocommerce_order_item_display_meta_value', [$this, 'render_order_item_meta_value'], 10, 3);
        add_filter('woocommerce_hidden_order_itemmeta', [$this, 'hide_internal_order_item_meta']);
        add_filter('woocommerce_cart_item_data_to_validate', [$this, 'differentiate_cart_item_key'], 10, 2);
        add_action('wp_enqueue_scripts', [$this, 'inject_cart_block_styles']);
        // 0.4.58: 服务端兜底合并 — 即便 cart_item_key hash 因任何原因不一致,
        // 只要 mockup100.design_summary.unique_key + product_id + variation_id 三元组相同,
        // add 完成后立即把新行 quantity 累加到旧行并移除新行。
        add_action('woocommerce_add_to_cart', [$this, 'merge_existing_mockup_design'], 20, 6);
        add_action('shutdown', [$this, 'log_add_to_cart_failure_on_shutdown'], 99);
        // 0.4.46: 在 WC 处理 add_to_cart 之前,根据 product 的 variation 矩阵把 $_POST 里的 attribute 值
        // 大小写校正 + 缺失补全(只发了 size 的请求会被自动补 color 等),解决"请访问 xxx 选择产品选项"
        add_action('wp_loaded', [$this, 'normalize_attribute_post_for_variations'], 5);
        // 0.4.55: 修复 wc-ajax=add_to_cart 路径下 variable 产品报 "请访问 xxx 选择产品选项"。
        // WC_AJAX::add_to_cart 仅读 $_POST['product_id'],忽略 $_POST['variation_id'],导致父级 variable
        // 进入 WC_Cart::add_to_cart 因没 variation_id 抛异常。把 product_id 替换为 variation_id,
        // WC 会再次 wc_get_product 取得 product_variation,走 VARIATION 分支并复原 parent_id。
        add_filter('woocommerce_add_to_cart_product_id', [$this, 'redirect_ajax_to_variation_id']);

        // 0.4.69 (Plan §3.3): cart 行删除时 30s 延迟清理 cart-snapshots/{unique_key}/ 前缀。
        // 30s 延迟覆盖 WC Undo 窗口 — 用户点 Undo 会直接 add 回原 cart_item_data,unique_key 一致,
        // 无需重新生成 snapshot。延迟到期后若该 unique_key 已被新 cart 行复用,删除不会发生因为
        // 实际仍有引用(目前 do_cleanup 只删 OSS 对象,删完 cart 行用到的 URL 已被 wrap 后端代理拒签 —
        // 所以延迟兜底足够,确认无 active 引用后才真正删除)。
        add_action('woocommerce_cart_item_removed', [$this, 'cleanup_cart_snapshot'], 10, 2);
        add_action('mockup100_cleanup_cart_snapshot', [$this, 'do_cleanup_cart_snapshot'], 10, 1);

        // 0.4.69 (Plan §4.2): 订单删除时 30s 延迟清理 order-snapshots/{order_id}/ 前缀。
        // 仅 force-delete(post 真正被删)清理;cancel / refund / trash 保留备份。
        add_action('woocommerce_before_delete_order', [$this, 'cleanup_order_snapshot'], 10, 1);
        add_action('before_delete_post', [$this, 'cleanup_order_snapshot_for_post'], 10, 1);
        add_action('mockup100_cleanup_order_snapshot', [$this, 'do_cleanup_order_snapshot'], 10, 1);
    }

    /**
     * 0.4.46: 修复 Place Order 弹窗 add_to_cart 报 "暂时无法购买 / 请选择产品选项" 问题
     *
     * 真因:WC form-handler 调 find_matching_product_variation 时
     *   - local attribute 值大小写敏感(用户发 "S" 但 variation 存 "s" → 不匹配)
     *   - 前端只发了用户选择的子集(如只发 attribute_size,缺 attribute_pa_color)→ 退化为"未选 variation"
     *
     * 解决:在 wp_loaded 阶段(早于 form-handler),如果 $_POST 已带 variation_id 且 product 是 variable,
     *      就用 variation 矩阵上的实际属性值覆盖/补全 $_POST。
     */
    public function normalize_attribute_post_for_variations(): void
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.NonceVerification.Recommended -- WooCommerce add-to-cart 流程由 WC 自身校验 nonce,这里仅在 wp_loaded 阶段对 $_POST 做大小写补全,不写入业务数据。
        if (! isset($_POST['add-to-cart']) && ! isset($_REQUEST['add-to-cart'])) return;
        // phpcs:disable WordPress.Security.NonceVerification.Missing,WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- WC add-to-cart 自身处理 nonce;这里读取的值后续都用 (int) 强转,无 XSS/注入风险
        $product_id = isset($_POST['add-to-cart'])
            ? (int) wp_unslash($_POST['add-to-cart'])
            : (isset($_REQUEST['add-to-cart']) ? (int) wp_unslash($_REQUEST['add-to-cart']) : 0);
        if ($product_id <= 0) return;
        $variation_id = isset($_POST['variation_id']) ? (int) wp_unslash($_POST['variation_id']) : 0;
        // phpcs:enable WordPress.Security.NonceVerification.Missing,WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        if ($variation_id <= 0) return;
        if (! function_exists('wc_get_product')) return;
        $variation = wc_get_product($variation_id);
        if (! ($variation instanceof WC_Product_Variation)) return;
        $variation_attrs = $variation->get_attributes();
        if (! is_array($variation_attrs) || empty($variation_attrs)) return;
        foreach ($variation_attrs as $attr_name => $variation_value) {
            // $attr_name 形如 'pa_color' 或 'size' (local);WC 在 form-handler 找 'attribute_<attr_name>'
            $post_key = 'attribute_' . strtolower((string) $attr_name);
            $variation_value = (string) $variation_value;
            if ($variation_value === '') continue; // variation 上为 "any" 不需要覆盖,但仍需用户传值;跳过
            // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- 同上,WC 自身处理 nonce;此处经 sanitize_text_field 处理后才赋值,无注入风险
            $current = isset($_POST[$post_key]) ? sanitize_text_field(wp_unslash((string) $_POST[$post_key])) : '';
            if ($current === '') {
                // 缺失 → 直接补
                $_POST[$post_key] = $variation_value;
                continue;
            }
            // 大小写不一致 → 用 variation 上的实际值覆盖
            if (strcasecmp($current, $variation_value) === 0 && $current !== $variation_value) {
                $_POST[$post_key] = $variation_value;
            }
        }
    }

    /**
     * 0.4.58: 服务端兜底合并相同设计稿 cart line。
     *
     * 触发时机:WC 完成 add 之后(`woocommerce_add_to_cart` action)。
     * 合并依据:`mockup100.design_summary.unique_key` + product_id + variation_id 三元组完全相同。
     *
     * 行为:
     *   - 若已存在旧行,把新行 quantity 累加到旧行(`set_quantity($key, $old + $new, true)`),
     *     再把新行从 cart 中移除。
     *   - 否则不做任何事,保留新行。
     *
     * 备注:
     *   - 不在 `woocommerce_add_to_cart_validation` 阻断 — 返回 false 会让 WC_AJAX 走 error 分支并
     *     输出 "无法添加至购物车" notice,影响用户体验。本方案在 add 后静默合并,fragments 正常更新。
     *   - 该 action 的回调由 WC 在 `WC_Cart::add_to_cart()` 末尾(set_quantity 之后)调用,
     *     `set_quantity` 自身不会再触发 `woocommerce_add_to_cart`,因此不会递归。
     */
    public function merge_existing_mockup_design(
        string $cart_item_key,
        int $product_id,
        int $quantity,
        int $variation_id,
        array $variation,
        array $cart_item_data
    ): void {
        if (! function_exists('WC') || ! WC()->cart) {
            return;
        }
        $incomingKey = isset($cart_item_data['mockup100']['design_summary']['unique_key'])
            ? (string) $cart_item_data['mockup100']['design_summary']['unique_key']
            : '';
        if ($incomingKey === '') {
            return;
        }
        $cart = WC()->cart;
        $cartContents = $cart->get_cart();
        foreach ($cartContents as $existingKey => $row) {
            if ($existingKey === $cart_item_key) {
                continue;
            }
            $rowKey = isset($row['mockup100']['design_summary']['unique_key'])
                ? (string) $row['mockup100']['design_summary']['unique_key']
                : '';
            if ($rowKey === '' || $rowKey !== $incomingKey) {
                continue;
            }
            if ((int) ($row['product_id'] ?? 0) !== (int) $product_id) {
                continue;
            }
            if ((int) ($row['variation_id'] ?? 0) !== (int) $variation_id) {
                continue;
            }
            $existingQty = (int) ($row['quantity'] ?? 0);
            // 0.4.60: 直接用 incoming 数量(WC 已确保 ≥1),不再 max(1, ...) — 原 fallback 在
            // 极端 race 路径下可能把 0 强加成 1 导致偏多。
            $incomingQty = (int) $quantity;
            if ($incomingQty <= 0) {
                return;
            }
            $cart->set_quantity($existingKey, $existingQty + $incomingQty, true);
            $cart->remove_cart_item($cart_item_key);
            return;
        }
    }

    /**
     * 0.4.44: 仅在 wc-ajax=add_to_cart 请求且存在 error notice 时输出诊断日志。
     * 输出会写到 nginx error_log (FastCGI sent in stderr: PHP message: ...) 与 PHP error_log,
     * 便于 `tail /www/wwwlogs/<domain>.error.log` 直接看到失败真因。
     */
    public function log_add_to_cart_failure_on_shutdown(): void
    {
        $isWcAjaxAddToCart = false;
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- 仅做诊断日志读取,不写入业务数据
        if (isset($_GET['wc-ajax']) && sanitize_text_field(wp_unslash((string) $_GET['wc-ajax'])) === 'add_to_cart') {
            $isWcAjaxAddToCart = true;
        }
        if (! $isWcAjaxAddToCart) {
            return;
        }
        if (! function_exists('wc_get_notices')) {
            return;
        }
        $errors = wc_get_notices('error');
        if (empty($errors)) {
            return;
        }
        $messages = [];
        foreach ($errors as $err) {
            if (is_array($err) && isset($err['notice'])) {
                $messages[] = wp_strip_all_tags((string) $err['notice']);
            } elseif (is_string($err)) {
                $messages[] = wp_strip_all_tags($err);
            }
        }
        // phpcs:ignore WordPress.Security.NonceVerification.Missing -- 仅做诊断日志读取,WC add-to-cart 自身已校验 nonce
        $postKeys = array_keys($_POST);
        // phpcs:disable WordPress.Security.NonceVerification.Missing,WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- 仅做诊断日志读取,WC add-to-cart 自身已校验 nonce;读取后经 sanitize_text_field 处理,无注入风险
        $payloadShort = isset($_POST[self::REQUEST_KEY])
            ? substr(sanitize_text_field(wp_unslash((string) $_POST[self::REQUEST_KEY])), 0, 400)
            : '';
        // phpcs:enable WordPress.Security.NonceVerification.Missing,WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        $context = [
            'errors' => $messages,
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'product_id' => isset($_POST['product_id']) ? sanitize_text_field(wp_unslash((string) $_POST['product_id'])) : '',
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'add_to_cart' => isset($_POST['add-to-cart']) ? sanitize_text_field(wp_unslash((string) $_POST['add-to-cart'])) : '',
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'variation_id' => isset($_POST['variation_id']) ? sanitize_text_field(wp_unslash((string) $_POST['variation_id'])) : '',
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'quantity' => isset($_POST['quantity']) ? sanitize_text_field(wp_unslash((string) $_POST['quantity'])) : '',
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'has_security' => isset($_POST['security']) ? 'yes' : 'no',
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'has_wpnonce' => isset($_POST['_wpnonce']) ? 'yes' : 'no',
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            'has_woocommerce_nonce' => isset($_POST['woocommerce-add-to-cart-nonce']) ? 'yes' : 'no',
            'attribute_keys' => array_values(array_filter($postKeys, static function ($k) {
                return strpos((string) $k, 'attribute_') === 0;
            })),
            'mockup_payload_head' => $payloadShort,
            'is_user_logged_in' => is_user_logged_in() ? 'yes' : 'no',
            'has_wc_session' => (function_exists('WC') && WC()->session) ? 'yes' : 'no',
            'request_uri' => isset($_SERVER['REQUEST_URI']) ? esc_url_raw(wp_unslash((string) $_SERVER['REQUEST_URI'])) : '',
        ];
        // 单行 JSON 便于 grep / 日志聚合
        if (defined('WP_DEBUG') && WP_DEBUG) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 加购失败诊断信息仅在 WP_DEBUG 启用时记录,生产环境保持静默
            error_log('[Mockup100 add_to_cart_failure] ' . wp_json_encode($context));
        }
    }

    public function validate(bool $passed, int $product_id, int $quantity): bool
    {
        // 0.4.45: 不再阻断"没有 mockup payload"的加购 —— 允许原生 /product/<slug>/ 页面 / PHP / 第三方
        // 直接购买空白产品。Mockup 自定义数据仅在前端 Place Order 弹窗主动提交 mockup100_design_payload
        // 时才会通过 add_cart_item_data 挂载,实现"原生页正常下单 vs 弹窗带定制信息"两条路径并存。
        return $passed;
    }

    /**
     * 0.4.55: WC_AJAX::add_to_cart 不读 $_POST['variation_id']/$_POST['attribute_*'],
     * variable 产品在 wc-ajax=add_to_cart 路径下必然走到 "Please choose product options"。
     *
     * 此 filter 在 WC_AJAX 调 wc_get_product(product_id) 之前把 ID 切到 variation;
     * WC 后续会判定为 ProductType::VARIATION,自动 set parent_id + variation_attributes,顺利入车。
     *
     * 仅在以下条件全部满足时切换:
     *   - 当前是 wc-ajax=add_to_cart 请求
     *   - $_POST 带合法的 variation_id
     *   - 该 variation 确实属于这个父 product
     */
    public function redirect_ajax_to_variation_id($product_id)
    {
        $product_id = (int) $product_id;
        if ($product_id <= 0) return $product_id;
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- WC AJAX 自身校验 nonce,这里只读 query 标识
        if (! isset($_GET['wc-ajax']) || sanitize_text_field(wp_unslash((string) $_GET['wc-ajax'])) !== 'add_to_cart') return $product_id;
        // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- WC AJAX add-to-cart 自身校验 nonce;读取后立即 (int) 强转为整数,无注入风险
        $variation_id = isset($_POST['variation_id']) ? (int) wp_unslash($_POST['variation_id']) : 0;
        if ($variation_id <= 0) return $product_id;
        if (! function_exists('wc_get_product')) return $product_id;
        $variation = wc_get_product($variation_id);
        if (! ($variation instanceof WC_Product_Variation)) return $product_id;
        if ((int) $variation->get_parent_id() !== $product_id) return $product_id;
        return $variation_id;
    }

    /**
     * 0.5.1 (WP review §5.2): 通用递归消毒。
     *
     * 遍历任意层级的 array,按 key 名启发式选取最严格的 WordPress 消毒函数:
     *   - URL 类 key (preview_url / download_url / thumbnail_url / *_url / url / src) -> esc_url_raw
     *   - ID/数量类 key (*_id / id / count / index / page / size 等) 且值为数字 -> absint
     *   - 几何/字号类 key (x / y / scale / opacity / rotation / angle / width / height / fontSize 等) 且值为数字 -> (float)
     *   - 布尔 -> (bool)
     *   - 数组 -> 递归
     *   - 其余 -> sanitize_text_field
     *
     * 即便上游 JSON 字段被恶意构造,落到 cart_item_data 时也已剥离脚本/危险协议,
     * 后续 cart / 订单 / 邮件渲染再 esc_html 即可二次防护。
     */
    private static function sanitize_payload_recursive($value, string $key = '')
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $childKey = is_string($k) ? $k : '';
                $out[$k] = self::sanitize_payload_recursive($v, $childKey);
            }
            return $out;
        }

        if (is_bool($value)) {
            return $value;
        }

        if ($value === null) {
            return '';
        }

        $lcKey = strtolower($key);

        // URL 类
        if ($lcKey !== '' && (
            $lcKey === 'url' || $lcKey === 'src'
            || preg_match('/_url$/', $lcKey)
            || in_array($lcKey, ['preview_url', 'download_url', 'thumbnail_url'], true)
        )) {
            return esc_url_raw((string) $value);
        }

        // ID / 计数类(整数)
        if ($lcKey !== '' && (
            $lcKey === 'id' || preg_match('/_id$/', $lcKey)
            || in_array($lcKey, ['count', 'index', 'page', 'size', 'qty', 'quantity'], true)
        ) && is_numeric($value)) {
            return absint($value);
        }

        // 几何 / 字号类(浮点)
        if ($lcKey !== '' && (
            in_array($lcKey, ['x', 'y', 'scale', 'scalex', 'scaley', 'opacity', 'rotation', 'angle', 'width', 'height', 'font_size', 'fontsize', 'left', 'top', 'radius'], true)
        ) && is_numeric($value)) {
            return (float) $value;
        }

        // 兜底:文本消毒
        return sanitize_text_field((string) $value);
    }

    public function add_cart_item_data(array $cart_item_data, int $product_id, int $variation_id): array
    {
        $nonce = isset($_POST['woocommerce-add-to-cart-nonce'])
            ? sanitize_text_field(wp_unslash((string) $_POST['woocommerce-add-to-cart-nonce']))
            : '';
        if (! wp_verify_nonce($nonce, 'woocommerce-add-to-cart')) {
            return $cart_item_data;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- nonce 已在上方显式校验;此处读取并解析 JSON 负载,后续所有嵌套字段会再经 sanitize_payload_recursive / esc_url_raw 处理
        $payload = isset($_POST[self::REQUEST_KEY]) ? json_decode(wp_unslash((string) $_POST[self::REQUEST_KEY]), true) : null;
        if (! is_array($payload)) {
            return $cart_item_data;
        }

        $designSummary = isset($payload['design_summary']) && is_array($payload['design_summary'])
            ? $payload['design_summary']
            : [];

        // 0.4.57: 在 cart_item_data 中冗余存 product/template/design 标识字段,供 cart / 订单详情 / 邮件分组渲染。
        $productInfo = $this->resolve_product_info($product_id, $variation_id);
        $templateInfo = $this->resolve_template_info($payload, $designSummary);
        $designInfo = $this->resolve_design_info($payload, $designSummary);

        $cart_item_data['mockup100'] = [
            'template_id' => sanitize_text_field((string) ($payload['template_id'] ?? '')),
            'template_source' => sanitize_text_field((string) ($payload['template_source'] ?? '')),
            'selected_color' => sanitize_text_field((string) ($payload['selected_color'] ?? '')),
            'selected_view' => sanitize_text_field((string) ($payload['selected_view'] ?? '')),
            'output_size' => sanitize_text_field((string) ($payload['output_size'] ?? '')),
            'job_id' => sanitize_text_field((string) ($payload['job_id'] ?? '')),
            'preview_url' => esc_url_raw((string) ($payload['preview_url'] ?? '')),
            'download_url' => esc_url_raw((string) ($payload['download_url'] ?? '')),
            // 0.5.1 (WP review §5.2): 嵌套 JSON 全部经 sanitize_payload_recursive 递归消毒,
            // 防止 design_summary / part_layers / placeOrderRows / place_order_clone 内残留未转义脚本。
            'outputs' => self::sanitize_payload_recursive((array) ($payload['outputs'] ?? [])),
            'design_summary' => self::sanitize_payload_recursive($designSummary),
            // 0.4.57: 5 分组渲染所需字段(冗余持久化,避免后续访问 cart 页时 product 已被改名/删除)
            'design_name' => $designInfo['name'],
            'design_thumbnail_url' => $designInfo['thumbnail_url'],
            'product_name' => $productInfo['name'],
            'product_sku' => $productInfo['sku'],
            'template_name' => $templateInfo['name'],
            'template_code' => $templateInfo['code'],
            // 0.4.58 (Task 4): 持久化前端预拼好的 Text 层 label("partName / textName")与 placeOrderRows,
            // 让 cart / 订单 / 邮件直接复用,与 Place Order 弹窗 1:1 镜像。
            'part_layers' => self::sanitize_payload_recursive((array) ($payload['part_layers'] ?? [])),
            'placeOrderRows' => self::sanitize_payload_recursive((array) ($payload['placeOrderRows'] ?? [])),
            // 0.4.59 (Task 2): 完整 Place Order 弹窗镜像 — pricing / 字体字号颜色 / 自定义下拉值
            'place_order_clone' => self::sanitize_payload_recursive((array) ($payload['placeOrderClone'] ?? [])),
        ];
        // 0.4.43: 用 design unique_key 让相同 SKU 不同设计稿独立成行（Woo 默认按 cart_item_key hash 合并）
        $uniqueKey = (string) ($payload['design_summary']['unique_key']
            ?? ($cart_item_data['mockup100']['template_id'] . '|' . md5(wp_json_encode($cart_item_data['mockup100']))));
        $cart_item_data['unique_key'] = $uniqueKey;

        return $cart_item_data;
    }

    /**
     * 0.4.57: 用 wc_get_product 兜底获取 Product Name / SKU。
     */
    private function resolve_product_info(int $product_id, int $variation_id): array
    {
        $name = '';
        $sku = '';
        if (function_exists('wc_get_product')) {
            // variation 优先(SKU 通常打在 variation 上)
            if ($variation_id > 0) {
                $variation = wc_get_product($variation_id);
                if ($variation instanceof WC_Product) {
                    $sku = (string) $variation->get_sku();
                }
            }
            if ($product_id > 0) {
                $product = wc_get_product($product_id);
                if ($product instanceof WC_Product) {
                    $name = (string) $product->get_name();
                    if ($sku === '') {
                        $sku = (string) $product->get_sku();
                    }
                }
            }
        }
        return [
            'name' => sanitize_text_field($name),
            'sku' => sanitize_text_field($sku),
        ];
    }

    /**
     * 0.4.57: 解析 Template 名称 / 编号(优先取 frontend payload,fallback 到 template_id)。
     */
    private function resolve_template_info(array $payload, array $designSummary): array
    {
        $name = (string) ($payload['template_name']
            ?? ($designSummary['template_name']
                ?? ($designSummary['template_label']
                    ?? '')));
        $code = (string) ($payload['template_code']
            ?? ($designSummary['template_code']
                ?? ''));
        $templateId = (string) ($payload['template_id'] ?? '');
        if ($name === '') {
            $name = $templateId;
        }
        if ($code === '') {
            $code = $templateId;
        }
        return [
            'name' => sanitize_text_field($name),
            'code' => sanitize_text_field($code),
        ];
    }

    /**
     * 0.4.57: 解析 Design 名称 / 主图 URL。
     */
    private function resolve_design_info(array $payload, array $designSummary): array
    {
        $name = (string) ($designSummary['draft_name']
            ?? ($payload['design_name']
                ?? ($designSummary['design_name']
                    ?? '')));
        $thumbnail = (string) ($payload['design_thumbnail_url']
            ?? ($designSummary['design_thumbnail_url']
                ?? ($designSummary['thumbnail_url']
                    ?? ($payload['preview_url'] ?? ''))));
        return [
            'name' => sanitize_text_field($name),
            'thumbnail_url' => esc_url_raw($thumbnail),
        ];
    }

    /**
     * 0.4.43: 让 cart 页 / mini-cart 显示设计稿主图 — 主题/区块构建器无需改 cart.php
     */
    public function override_cart_item_thumbnail($thumbnail, array $cart_item, string $cart_item_key)
    {
        $payload = $cart_item['mockup100'] ?? null;
        if (! is_array($payload)) {
            return $thumbnail;
        }
        $previewUrl = isset($payload['preview_url']) ? (string) $payload['preview_url'] : '';
        if ($previewUrl === '') {
            return $thumbnail;
        }
        $product_id = (int) ($cart_item['product_id'] ?? 0);
        $variation_id = (int) ($cart_item['variation_id'] ?? 0);
        $previewUrl = $this->wrap_runtime_asset_url($previewUrl, $product_id, $variation_id);
        $alt = isset($payload['template_id']) ? (string) $payload['template_id'] : '';
        return sprintf(
            '<img src="%s" alt="%s" loading="lazy" decoding="async" />',
            esc_url($previewUrl),
            esc_attr($alt)
        );
    }

    /**
     * 0.4.65: 不再向商品名追加 HTML 区块(避免 cart 里整段 design 信息被 CSS 拼成一行 `/` 分隔)。
     * 设计稿名 + Color + 文本图层等改由 `display_item_data` (dl/dt/dd) 渲染,
     * 主图由 `override_cart_item_thumbnail` (woocommerce_cart_item_thumbnail filter) 注入。
     */
    public function override_cart_item_name(string $name, array $cart_item, string $cart_item_key): string
    {
        return $name;
    }

    public function inject_cart_block_styles(): void
    {
        if (function_exists('is_cart') && function_exists('is_checkout') && (is_cart() || is_checkout())) {
            // 0.4.78 (Task 8.3): WP.org Plugin Check 不允许直接 echo `<style>`;
            // 改用 wp_register_style + wp_add_inline_style 把 cart block CSS 走 WP enqueue 管道。
            $handle = 'mockup100-cart-block-overrides';
            if (! wp_style_is($handle, 'registered')) {
                wp_register_style($handle, false, [], MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION);
            }
            if (! wp_style_is($handle, 'enqueued')) {
                wp_enqueue_style($handle);
            }
            $css = '.wc-block-components-product-details { display: block !important; margin-top: 8px; }'
                . '.wc-block-components-product-details > span.wc-block-components-product-details__name,'
                . '.wc-block-components-product-details > span.wc-block-components-product-details__value { display: inline !important; }'
                . '.wc-block-components-product-details > span { display: block !important; margin-bottom: 4px; }'
                . '.wc-block-components-product-details > span > span[aria-hidden="true"] { display: none !important; }';
            wp_add_inline_style($handle, $css);
        }
    }

    public function override_store_api_cart_item_images(array $images, array $cart_item, string $cart_item_key): array
    {
        $payload = $cart_item['mockup100'] ?? null;
        if (!is_array($payload)) {
            return $images;
        }

        $previewUrl = isset($payload['preview_url']) ? (string) $payload['preview_url'] : '';
        if ($previewUrl === '') {
            return $images;
        }

        $product_id = (int) ($cart_item['product_id'] ?? 0);
        $variation_id = (int) ($cart_item['variation_id'] ?? 0);
        $previewUrl = $this->wrap_runtime_asset_url($previewUrl, $product_id, $variation_id);

        $alt = isset($payload['design_name']) ? (string) $payload['design_name'] : '';
        
        return [
            (object) [
                'id'               => 1, // must be truthy for isset($image->id) if it checks empty? No, but let's use 1 just in case
                'src'              => $previewUrl,
                'thumbnail'        => $previewUrl,
                'srcset'           => '',
                'sizes'            => '',
                'thumbnail_srcset' => '',
                'thumbnail_sizes'  => '',
                'name'             => $alt,
                'alt'              => $alt,
            ]
        ];
    }

    /**
     * 0.4.68: cart 主图来源可能是 OSS 私有 bucket 直链(私有 ACL → 公网直读 403),
     * 或是 /api/v1/external/runtime/jobs/.../outputs/N/preview 等受 x-api-key 保护的 URL。
     * 这里把 cart 端任何直读会失败的 runtime asset 强制包装为 WP 插件的代理 URL
     * (/wp-json/mockup100/v1/product/{id}/runtime-asset?url=...),让代理走 OSS 签名 / API key。
     */
    private function wrap_runtime_asset_url(string $url, int $product_id, int $variation_id = 0): string
    {
        $url = trim($url);
        if ($url === '' || $product_id <= 0) {
            return $url;
        }
        // 已经是插件代理 URL,直接返回(若是相对路径需补全为绝对 URL,
        // Store API CartItemSchema 用 FILTER_VALIDATE_URL 校验,相对路径会被丢弃)
        if (stripos($url, '/wp-json/mockup100/v1/product/') !== false
            && stripos($url, '/runtime-asset') !== false) {
            if (preg_match('#^https?://#i', $url) === 1) {
                return $url;
            }
            return home_url($url);
        }
        // 仅对 http(s) 直链做包装;data:/blob: 等保留
        if (preg_match('#^https?://#i', $url) !== 1) {
            return $url;
        }
        $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
        $path = (string) wp_parse_url($url, PHP_URL_PATH);
        $isMockupHost = $host !== '' && (
            $host === 'oss.mockup100.com'
            || preg_match('/(^|\.)mockup100\.com$/', $host) === 1
            || preg_match('/(^|\.)aliyuncs\.com$/', $host) === 1
        );
        $needsProxy = $isMockupHost && (
            strpos($path, '/runtime-assets/') !== false
            || strpos($path, '/render-files/') !== false
            || strpos($path, '/render-archives/') !== false
            || strpos($path, '/api/v1/external/runtime/jobs/') !== false
            || strpos($path, '/artworks/') === 0
            || strpos($path, '/cart-snapshots/') !== false
            || strpos($path, '/mockup-saas/cart-snapshots/') !== false
            || strpos($path, '/order-snapshots/') !== false
            || strpos($path, '/mockup-saas/order-snapshots/') !== false
        );
        if (!$needsProxy) {
            return $url;
        }
        $basePath = (string) wp_parse_url(
            rest_url('mockup100/v1/product/' . $product_id . '/runtime-asset'),
            PHP_URL_PATH
        );
        if ($basePath === '') {
            return $url;
        }
        $query = ['url' => $url];
        if ($variation_id > 0) {
            $query['variation_id'] = $variation_id;
        }
        // 0.4.69: Store API CartItemSchema 用 FILTER_VALIDATE_URL 校验 src/thumbnail,
        // 必须返回完整 absolute URL,否则 WC 回退到商品原图。所以这里拼 home_url 前缀。
        $absolute = home_url($basePath . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986));
        return $absolute;
    }

    /**
     * 0.4.69 (Plan §4.1): 反向解析 wrap_runtime_asset_url 包装的 URL。
     * 从 /wp-json/mockup100/v1/product/{id}/runtime-asset?url=<encoded> 中取出原始 OSS / API URL。
     * 非 wrapper URL 直接返回 trim 后的 URL(可能本身就是裸 OSS URL)。
     */
    private function extract_inner_runtime_asset_url(string $url): string
    {
        $url = trim($url);
        if ($url === '') return '';
        if (stripos($url, '/wp-json/mockup100/v1/product/') === false || stripos($url, '/runtime-asset') === false) {
            return $url;
        }
        $query = (string) wp_parse_url($url, PHP_URL_QUERY);
        if ($query === '') return $url;
        $args = [];
        wp_parse_str($query, $args);
        $inner = isset($args['url']) ? (string) $args['url'] : '';
        return $inner !== '' ? $inner : $url;
    }

    public function differentiate_cart_item_key(array $cart_item_data, $product)
    {
        // 已经在 add_cart_item_data 注入 unique_key,这里仅作为兜底直接返回
        return $cart_item_data;
    }

    /**
     * 0.4.64: cart item 渲染 — 完全控制 cart 显示。
     *
     * 用户期望(每件 cart line):
     *   主图(在设计页面设置的主图)            ← override_cart_item_thumbnail
     *   ok 45 L                                ← WC 商品名
     *   Untitled Design                        ← 设计稿名(item_data 第一行)
     *   No.1  Color: white, size: S, ¥X, Quantity: 1
     *   #1 右鞋身 / Text 1: Ne
     *   #2 右鞋身 / Text 2: ext
     *   #3 左鞋身 / 11: New text
     *   No.2 Color: white, size: M, ¥X, Quantity: 2
     *   ...
     *
     * 关键技术细节:
     *   1. WC `wc_get_formatted_cart_item_data` line 4369:`key` 字段非空时优先用;
     *      要让 Variation 行不显示 `mockup100_xxx`,必须把 key 设为可读 label 或留空
     *      让它 fallback 到 `name`。这里直接用空字符串 + name 双重保险。
     *   2. mall 主题用 `flat=true`(扁平 `key: display\n`),HTML 标签会被剥光,
     *      所以我们让 value/display 是同一份纯文本,key 也是纯文本。
     *   3. 完全替换 $item_data → 自动消除末尾多余的 WC 默认 `size: S`。
     */
    public function display_item_data(array $item_data, array $cart_item): array
    {
        $payload = $cart_item['mockup100'] ?? null;
        if (! is_array($payload)) {
            return $item_data;
        }

        // 0.4.65 (refined): 期望最终 cart 显示
        //   ok                                          (商品名,WC 自动)
        //   45 L                                        (variation 单价,WC 自动)
        //   Untitled Design, Color: white               <- 合成首行
        //   #1 右鞋身 / Text 1: Ne                       <- 文本图层独立行
        //   #2 右鞋身 / Text 2: ext
        //   #3 左鞋身 / 11: New text
        //   size: S                                      (WC 原 variation attribute,保留)

        $poRows = isset($payload['placeOrderRows']) && is_array($payload['placeOrderRows']) ? $payload['placeOrderRows'] : [];
        $poRow = $poRows[0] ?? [];

        // 解析 part layer 标签 (#1 部位名 / #2 部位名 ...)
        $textLayerLabels = [];
        $partLayers = isset($payload['part_layers']) && is_array($payload['part_layers']) ? $payload['part_layers'] : [];
        $partIdx = 1;
        foreach ($partLayers as $layer) {
            if (isset($layer['id']) && isset($layer['label'])) {
                $textLayerLabels[(string) $layer['id']] = '#' . $partIdx . ' ' . (string) $layer['label'];
                $partIdx++;
            }
        }

        $injected = [];

        // === 首行: "Untitled Design, Color: white" ===
        $designName = (string) ($payload['design_name'] ?? ($payload['design_summary']['draft_name'] ?? ''));
        $color = (string) ($poRow['color'] ?? '');
        $headParts = [];
        if ($designName !== '') $headParts[] = $designName;
        if ($color !== '') $headParts[] = 'Color: ' . $color;
        if (!empty($headParts)) {
            $headLine = implode(', ', $headParts);
            $injected[] = [
                'key'     => "",
                'name'    => "",
                'value'   => $headLine,
                // inline style 是 WC cart/email 内嵌展示所必需;外部 stylesheet 在邮件客户端不可用。
                'display' => '<strong style="color:#111827;">' . esc_html($headLine) . '</strong>',
            ];
        }

        // === 文本图层独立行 ===
        if (!empty($poRow['text_overrides']) && is_array($poRow['text_overrides'])) {
            foreach ($poRow['text_overrides'] as $layer_id => $text) {
                $textStr = (string) $text;
                if ($textStr === '') continue;
                $label = $textLayerLabels[(string) $layer_id] ?? (string) $layer_id;
                $injected[] = [
                    'key'     => $label,
                    'name'    => $label,
                    'value'   => $textStr,
                    'display' => esc_html($textStr),
                ];
            }
        }

        // === 保留 WC 默认 variation attribute(size 等),过滤 color/colour 避免与首行重复 ===
        $kept = [];
        foreach ($item_data as $row) {
            $rk = strtolower((string) ($row['key'] ?? $row['name'] ?? ''));
            // 0.4.65: WC 默认 variation 行;color 已合并到首行,跳过
            if ($rk === 'color' || $rk === 'colour') continue;
            // 跳过任何含 mockup100_ 前缀的内部 key(防御 0.4.64 之前的旧 cart 数据)
            if (strpos($rk, 'mockup100_') === 0) continue;
            $kept[] = $row;
        }

        return array_merge($injected, $kept);
    }

    /**
     * 0.5.5: 订单详情(前台 my-account / 邮件 / 后台订单管理页面)meta 值渲染。
     *
     * 仅针对 `Design Thumbnail` 这一显示型 meta(由 store_order_item_meta 用 __() 包装,
     * 因此 key 是已本地化的字符串,匹配时同时考虑英文原文与本地化标签)。
     *
     * 把 URL 文本替换为 <img>,与 cart 显示对齐;同时支持 wp-json/.../runtime-asset?url=...
     * 这种被 wrap_runtime_asset_url 包装过的代理 URL,以及裸 OSS / runtime URL。
     *
     * 其他 meta 一律按原样返回(WC 默认 wp_kses_post → make_clickable 会把 URL 文本转链接,
     * 这里只对 thumbnail 做特殊渲染)。
     */
    public function render_order_item_meta_value($display_value, $meta, $item)
    {
        if (! is_object($meta) || ! isset($meta->key)) {
            return $display_value;
        }
        $key = (string) $meta->key;
        $thumbnailLabel = function_exists('__')
            ? (string) __('Design Thumbnail', 'mockup100-pod-customizer')
            : 'Design Thumbnail';
        $isThumbnail = ($key === 'Design Thumbnail' || $key === $thumbnailLabel || $key === '_mockup100_design_thumbnail_url');
        if (! $isThumbnail) {
            return $display_value;
        }
        $rawValue = isset($meta->value) ? (string) $meta->value : '';
        if ($rawValue === '') {
            return $display_value;
        }
        // 已是相对路径(/wp-json/...)需补全为绝对 URL,Store API / 邮件客户端要求 absolute src。
        $absoluteUrl = $rawValue;
        if (preg_match('#^https?://#i', $absoluteUrl) !== 1) {
            if (function_exists('home_url')) {
                $absoluteUrl = home_url($absoluteUrl);
            }
        }
        $alt = '';
        if (is_object($item) && method_exists($item, 'get_name')) {
            $alt = (string) $item->get_name();
        }
        return sprintf(
            // inline style 是 WC email / order item meta 缩略图渲染所必需;外部 stylesheet 在邮件客户端不可用。
            '<img src="%s" alt="%s" loading="lazy" decoding="async" style="max-width:120px;height:auto;display:block;border-radius:4px;" />',
            esc_url($absoluteUrl),
            esc_attr($alt)
        );
    }

    /**
     * 0.5.5: 把所有 `_mockup100_*` 内部 meta 从后台订单"自定义字段 / Custom fields"
     * 区域隐藏。这些字段是冗余的内部状态(JSON / 标识 ID / outputs 数组等),
     * 显示给运营/管理员只会造成噪声,真正需要看的字段(Design Name / Color / Text 层等)
     * 由 store_order_item_meta 用 __() 包装的可读 label 单独 add_meta_data,
     * 它们不带下划线前缀,不会被 WC hidden 列表过滤。
     */
    public function hide_internal_order_item_meta($hidden)
    {
        if (! is_array($hidden)) {
            $hidden = [];
        }
        $internal = [
            '_mockup100_template_id',
            '_mockup100_template_source',
            '_mockup100_selected_color',
            '_mockup100_selected_view',
            '_mockup100_output_size',
            '_mockup100_job_id',
            '_mockup100_preview_url',
            '_mockup100_download_url',
            '_mockup100_outputs',
            '_mockup100_design_summary',
            '_mockup100_design_name',
            '_mockup100_design_thumbnail_url',
            '_mockup100_product_name',
            '_mockup100_product_sku',
            '_mockup100_template_name',
            '_mockup100_template_code',
            '_mockup100_part_layers',
            '_mockup100_placeOrderRows',
            '_mockup100_place_order_clone',
        ];
        return array_values(array_unique(array_merge($hidden, $internal)));
    }

    public function store_order_item_meta(WC_Order_Item_Product $item, string $cart_item_key, array $values, WC_Order $order): void
    {
        $payload = $values['mockup100'] ?? null;
        if (! is_array($payload)) {
            return;
        }

        // 0.4.69 (Plan §4.1): cart→order rename — 把 cart-snapshots/{unique_key}/{color}_{view}.png
        // 状态迁移到 order-snapshots/{order_id}/{cart_item_key}/{color}_{view}.png。
        // checkout 后 cart 行被清空,cart-snapshots 是无主资源;rename(OSS-side copy + DELETE 源)保证
        // 单一备份来源,且订单详情/邮件 / 后台仍能稳定渲染。
        // rename 失败时保留原 cart-snapshots URL —— 后续 cart-snapshots 30s 延迟清理钩子将不会触发
        // (因 cart_item_removed 在 checkout 转化路径里也不一定触发,empty_cart 直接重置数组),
        // 因此即便 rename 失败,原 OSS 对象仍存在,渲染不受影响。
        $product_id = (int) ($values['product_id'] ?? $item->get_product_id());
        $variation_id = (int) ($values['variation_id'] ?? $item->get_variation_id());
        $orderId = (int) $order->get_id();

        if ($orderId > 0 && $product_id > 0 && class_exists('Mockup100_Api_Proxy') && class_exists('Mockup100_Product_Binding') && class_exists('Mockup100_Rest_Controller')) {
            $api_proxy = new Mockup100_Api_Proxy();
            $binding = new Mockup100_Product_Binding($api_proxy);
            $controller = new Mockup100_Rest_Controller($api_proxy, $binding);

            // 0.5.1 (WP review §5.4): 计算 rename 操作的归属上下文,
            // 闭包内同时校验 owner uid + cart_item_key,避免伪造跨用户 URL 触发越权 OSS copy/delete。
            $ownerUserId = (int) $order->get_customer_id();

            $expectedUniqueKey = (string) ($values['unique_key'] ?? ($payload['design_summary']['unique_key'] ?? ''));
            $renamePoRow = function (string $color, string $view, string $proxyUrl) use ($controller, $orderId, $cart_item_key, $product_id, $variation_id, $ownerUserId, $expectedUniqueKey): string {
                $inner = $this->extract_inner_runtime_asset_url($proxyUrl);
                if ($inner === '') return $proxyUrl;
                if (strpos($inner, '/cart-snapshots/') === false) return $proxyUrl;
                $expectedPrefix = '';
                if ($expectedUniqueKey !== '') {
                    $scopedUniqueKey = 'cart_snapshot_user_' . $ownerUserId . '_' . $expectedUniqueKey;
                    $segments = array_filter(array_map(
                        static function (string $segment): string {
                            $segment = preg_replace('/[^A-Za-z0-9_\-]+/', '_', $segment);
                            return trim((string) $segment, '_');
                        },
                        explode('|', $scopedUniqueKey)
                    ));
                    $expectedPrefix = 'mockup-saas/cart-snapshots/' . implode('__', $segments) . '/';
                }
                if ($expectedPrefix !== '' && strpos($inner, $expectedPrefix) === false) {
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- 前缀校验命中仅在 WP_DEBUG 启用时记录,生产环境保持静默
                        error_log('[Mockup100 cart->order rename] unique_key prefix mismatch: ' . $inner);
                    }
                    return $proxyUrl;
                }
                if ($ownerUserId > 0 && strpos($inner, 'cart_snapshot_user_' . $ownerUserId . '_') === false) {
                    if (defined('WP_DEBUG') && WP_DEBUG) {
                        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- owner 前缀校验命中仅在 WP_DEBUG 启用时记录,生产环境保持静默
                        error_log('[Mockup100 cart->order rename] ownership mismatch (uid): ' . $inner);
                    }
                    return $proxyUrl;
                }
                $newOssUrl = $controller->rename_cart_snapshot_to_order_snapshot($orderId, $cart_item_key, $color, $view, $inner);
                if ($newOssUrl === '') return $proxyUrl;
                return $this->wrap_runtime_asset_url($newOssUrl, $product_id, $variation_id);
            };

            // 主 preview_url
            $parentColor = (string) ($payload['selected_color'] ?? '');
            $parentView = (string) ($payload['selected_view'] ?? '');
            $parentPreview = (string) ($payload['preview_url'] ?? '');
            if ($parentColor !== '' && $parentView !== '' && $parentPreview !== '') {
                $renamed = $renamePoRow($parentColor, $parentView, $parentPreview);
                if ($renamed !== $parentPreview) {
                    $payload['preview_url'] = $renamed;
                }
            }

            // placeOrderRows[].preview_url
            if (isset($payload['placeOrderRows']) && is_array($payload['placeOrderRows'])) {
                foreach ($payload['placeOrderRows'] as $idx => $poRow) {
                    if (! is_array($poRow)) continue;
                    $rowColor = (string) ($poRow['color'] ?? '');
                    $rowView = (string) ($poRow['view'] ?? $parentView);
                    $rowPreview = (string) ($poRow['preview_url'] ?? '');
                    if ($rowColor === '' || $rowView === '' || $rowPreview === '') continue;
                    $renamedRow = $renamePoRow($rowColor, $rowView, $rowPreview);
                    if ($renamedRow !== $rowPreview) {
                        $payload['placeOrderRows'][$idx]['preview_url'] = $renamedRow;
                    }
                }
            }

            // design_thumbnail_url 若也指向 cart-snapshots,跟随主 preview_url 替换
            $designThumb = (string) ($payload['design_thumbnail_url'] ?? '');
            if ($designThumb !== '' && $parentColor !== '' && $parentView !== '') {
                $renamedThumb = $renamePoRow($parentColor, $parentView, $designThumb);
                if ($renamedThumb !== $designThumb) {
                    $payload['design_thumbnail_url'] = $renamedThumb;
                }
            }
        }

        foreach ($payload as $key => $value) {
            $item->add_meta_data(
                '_mockup100_' . $key,
                is_scalar($value) ? (string) $value : wp_json_encode($value),
                true
            );
        }

        $poRows = isset($payload['placeOrderRows']) && is_array($payload['placeOrderRows']) ? $payload['placeOrderRows'] : [];
        if (empty($poRows)) {
            $this->store_legacy_order_item_meta($item, $payload);
            return;
        }

        $designName = (string) ($payload['design_name'] ?? ($payload['design_summary']['draft_name'] ?? ''));
        $designThumb = (string) ($payload['design_thumbnail_url'] ?? ($payload['preview_url'] ?? ''));
        if ($designName !== '') {
            $item->add_meta_data(__('Design Name', 'mockup100-pod-customizer'), $designName, true);
        }
        if ($designThumb !== '') {
            $item->add_meta_data(__('Design Thumbnail', 'mockup100-pod-customizer'), $designThumb, true);
        }

        $text_layer_labels = [];
        $part_layers = isset($payload['part_layers']) && is_array($payload['part_layers']) ? $payload['part_layers'] : [];
        $idx = 1;
        foreach ($part_layers as $layer) {
            if (isset($layer['id']) && isset($layer['label'])) {
                $text_layer_labels[$layer['id']] = '#' . $idx . ' ' . $layer['label'];
                $idx++;
            }
        }

        $isMulti = count($poRows) > 1;
        foreach ($poRows as $index => $poRow) {
            $rowNum = $index + 1;
            // translators: %d 表示采购需求行号
            $prefix = $isMulti ? sprintf(__('Req #%d: ', 'mockup100-pod-customizer'), $rowNum) : '';

            $color = (string) ($poRow['color'] ?? '');
            if ($color !== '') {
                $item->add_meta_data($prefix . __('Color', 'mockup100-pod-customizer'), $color, true);
            }

            if (!empty($poRow['attributes']) && is_array($poRow['attributes'])) {
                foreach ($poRow['attributes'] as $k => $v) {
                    $kStr = (string) $k;
                    $vStr = (string) $v;
                    if (strcasecmp($kStr, 'color') === 0 || strcasecmp($kStr, 'colour') === 0) continue;
                    if ($vStr !== '') {
                        $item->add_meta_data($prefix . $kStr, $vStr, true);
                    }
                }
            }

            if (!empty($poRow['text_overrides']) && is_array($poRow['text_overrides'])) {
                foreach ($poRow['text_overrides'] as $layer_id => $text) {
                    $textStr = (string) $text;
                    if ($textStr === '') continue;

                    if (isset($text_layer_labels[$layer_id])) {
                        $label = $text_layer_labels[$layer_id];
                        $item->add_meta_data($prefix . $label, $textStr, true);
                    }
                }
            }

            if ($isMulti && isset($poRow['quantity'])) {
                $item->add_meta_data($prefix . __('Quantity', 'mockup100-pod-customizer'), (string) $poRow['quantity'], true);
            }
        }
    }

    private function store_legacy_order_item_meta(WC_Order_Item_Product $item, array $payload): void
    {
        $clone = isset($payload['place_order_clone']) && is_array($payload['place_order_clone']) ? $payload['place_order_clone'] : [];
        $designName = (string) ($payload['design_name'] ?? ($payload['design_summary']['draft_name'] ?? ''));
        $designThumb = (string) ($payload['design_thumbnail_url'] ?? ($payload['preview_url'] ?? ''));
        if ($designName !== '') $item->add_meta_data(__('Design Name', 'mockup100-pod-customizer'), $designName, true);
        if ($designThumb !== '') $item->add_meta_data(__('Design Thumbnail', 'mockup100-pod-customizer'), $designThumb, true);

        $color = (string) ($payload['selected_color'] ?? '');
        $sizeValue = '';
        if (isset($payload['design_summary']['attributes']) && is_array($payload['design_summary']['attributes'])) {
            $attrs = $payload['design_summary']['attributes'];
            $sizeValue = (string) ($attrs['Size'] ?? ($attrs['size'] ?? ($attrs['pa_size'] ?? '')));
        }
        if ($color !== '') $item->add_meta_data(__('Color', 'mockup100-pod-customizer'), $color, true);
        if ($sizeValue !== '') $item->add_meta_data(__('Size', 'mockup100-pod-customizer'), $sizeValue, true);

        $cloneRows = isset($clone['quantity']['rows']) && is_array($clone['quantity']['rows']) ? $clone['quantity']['rows'] : [];
        $primaryAttrs = isset($cloneRows[0]['attrs']) && is_array($cloneRows[0]['attrs']) ? $cloneRows[0]['attrs'] : [];
        if (! empty($primaryAttrs)) {
            foreach ($primaryAttrs as $attrName => $attrValue) {
                if (strcasecmp($attrName, 'color') === 0 || strcasecmp($attrName, 'colour') === 0) continue;
                if ($sizeValue !== '' && strcasecmp($attrValue, $sizeValue) === 0 && (stripos($attrName, 'size') !== false || stripos($attrName, '尺') !== false)) continue;
                $item->add_meta_data((string) $attrName, (string) $attrValue, true);
            }
        }

        $partLayers = isset($payload['part_layers']) && is_array($payload['part_layers']) ? $payload['part_layers'] : [];
        if (! empty($partLayers)) {
            foreach ($partLayers as $layer) {
                if (! is_array($layer)) continue;
                $textValue = (string) ($layer['text'] ?? '');
                $label = (string) ($layer['label'] ?? $layer['name'] ?? '');
                if ($textValue !== '' && $label !== '') {
                    $item->add_meta_data($label, $textValue, true);
                }
            }
        }
    }

    /**
     * 0.4.69 (Plan §3.3): cart 行删除时排程 30s 延迟清理。
     * 30s 覆盖 WC Undo 窗口 — Undo 会重新 add 回原 unique_key 行,清理时再判断当前 cart 是否还有引用。
     * 0.4.78 (Task 8.1): 调度时同时携带当前用户 ID,WP-Cron 回调时用它还原 owner-prefix,避免越权删除。
     */
    public function cleanup_cart_snapshot(string $cart_item_key, $cart): void
    {
        $uniqueKey = '';
        if (is_object($cart) && property_exists($cart, 'removed_cart_contents') && is_array($cart->removed_cart_contents)) {
            $row = $cart->removed_cart_contents[$cart_item_key] ?? null;
            if (is_array($row)) {
                $uniqueKey = (string) ($row['unique_key']
                    ?? ($row['mockup100']['design_summary']['unique_key'] ?? ''));
            }
        }
        if ($uniqueKey === '') return;
        if (! function_exists('wp_schedule_single_event')) return;
        $userId = function_exists('get_current_user_id') ? (int) get_current_user_id() : 0;
        wp_schedule_single_event(time() + 30, 'mockup100_cleanup_cart_snapshot', [$uniqueKey, $userId]);
    }

    /**
     * 0.4.69: WP-Cron 回调 — 真正删除 cart-snapshots/{unique_key}/ 前缀下的 OSS 对象。
     * 在 30s 延迟后执行,如果 cart 中已有同 unique_key 行(Undo / 重新加入)说明仍被引用,
     * 此处保守:目前不再二次校验,因为 cart-snapshots key 由 unique_key 决定,
     * Undo 重 add 会直接复用同 prefix,延迟期间不会真正调用 clone(前端 unique_key 命中即跳过),
     * 但旧对象仍存在于 OSS。这里删除会牵连刚 Undo 的行 — 因此延迟期间需要再做一次检查。
     */
    public function do_cleanup_cart_snapshot(string $uniqueKey, int $userId = 0): void
    {
        if ($uniqueKey === '') return;

        // Undo 兜底:延迟到期时若当前 cart 仍存在同 unique_key 的行,跳过删除。
        if (function_exists('WC') && WC() && WC()->cart) {
            foreach ((array) WC()->cart->get_cart() as $row) {
                $rowKey = (string) ($row['unique_key']
                    ?? ($row['mockup100']['design_summary']['unique_key'] ?? ''));
                if ($rowKey !== '' && $rowKey === $uniqueKey) return;
            }
        }

        if (! class_exists('Mockup100_Api_Proxy') || ! class_exists('Mockup100_Product_Binding') || ! class_exists('Mockup100_Rest_Controller')) {
            return;
        }
        $api_proxy = new Mockup100_Api_Proxy();
        $binding = new Mockup100_Product_Binding($api_proxy);
        $controller = new Mockup100_Rest_Controller($api_proxy, $binding);
        // 0.4.78 (Task 8.1): WP-Cron 上下文里 get_current_user_id() = 0,
        // 因此把调度时记录的 owner user_id 显式传入,删除路径才能对齐 clone 时的 owner-prefix。
        $controller->delete_cart_snapshot_prefix($uniqueKey, $userId);
    }

    /**
     * 0.4.69 (Plan §4.2): 订单 force-delete 时排程清理 order-snapshots/{order_id}/ 前缀。
     * `woocommerce_before_delete_order` 仅在 force delete 触发(trash/cancel/refund 不触发)。
     */
    public function cleanup_order_snapshot($order_id): void
    {
        $orderId = (int) $order_id;
        if ($orderId <= 0) return;
        if (! function_exists('wp_schedule_single_event')) return;
        wp_schedule_single_event(time() + 30, 'mockup100_cleanup_order_snapshot', [$orderId]);
    }

    /**
     * 0.4.69: HPOS 关闭(post 模式)时也通过 before_delete_post 兜底。
     * 仅当 post 类型为 shop_order 时触发。
     */
    public function cleanup_order_snapshot_for_post($post_id): void
    {
        $postId = (int) $post_id;
        if ($postId <= 0) return;
        $type = get_post_type($postId);
        if ($type !== 'shop_order') return;
        $this->cleanup_order_snapshot($postId);
    }

    /**
     * 0.4.69: WP-Cron 回调 — 真正删除 order-snapshots/{orderId}/ 前缀下的 OSS 对象。
     */
    public function do_cleanup_order_snapshot($order_id): void
    {
        $orderId = (int) $order_id;
        if ($orderId <= 0) return;
        if (! class_exists('Mockup100_Api_Proxy') || ! class_exists('Mockup100_Product_Binding') || ! class_exists('Mockup100_Rest_Controller')) {
            return;
        }
        $api_proxy = new Mockup100_Api_Proxy();
        $binding = new Mockup100_Product_Binding($api_proxy);
        $controller = new Mockup100_Rest_Controller($api_proxy, $binding);
        $controller->delete_order_snapshot_prefix($orderId);
    }
}
