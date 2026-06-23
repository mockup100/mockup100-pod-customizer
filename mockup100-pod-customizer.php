<?php

/**
 * Plugin Name: Mockup100 Print-on-Demand Customizer for WooCommerce
 * Plugin URI: https://www.mockup100.com/
 * Description: Mockup100 Print-on-Demand customizer for WooCommerce. Bind store products to Mockup100 templates and launch a live design workspace from product pages.
 * Version: 0.5.8
 * Author: Mockup100
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: mockup100-pod-customizer
 */

if (! defined('ABSPATH')) {
    exit;
}

define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION', '0.5.8');
define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_FILE', __FILE__);
define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_SLUG', 'mockup100-pod-customizer');

require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-api-proxy.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-settings.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-product-binding.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-rest-controller.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-cart-meta.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-designer-page.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-order-grading.php';
require_once MOCKUP100_POD_CUSTOMIZER_PLUGIN_DIR . 'includes/class-mockup100-plugin.php';

function mockup100_preview_plugin()
{
    static $mockup100_plugin = null;

    if ($mockup100_plugin === null) {
        $mockup100_plugin = new Mockup100_Preview_Plugin();
    }

    return $mockup100_plugin;
}

add_action('plugins_loaded', static function () {
    mockup100_preview_plugin()->boot();
});

// Bug 9: 过滤掉空/相对 URL 的 srcset 候选,避免 WordPress 输出形如 "/product/ok/2x" 的非法路径触发 404
add_filter('wp_calculate_image_srcset', static function ($sources) {
    if (! is_array($sources)) {
        return $sources;
    }
    foreach ($sources as $key => $info) {
        $url = is_array($info) && isset($info['url']) ? (string) $info['url'] : '';
        if ($url === '' || ! preg_match('#^https?://#i', $url)) {
            unset($sources[$key]);
        }
    }
    return $sources;
}, 10, 1);

// Bug 9 (cart 404 续): WP get_avatar() 在用户没头像时仍硬编码 srcset='<空> 2x',
// 浏览器把候选 url "2x" 相对当前页解析成 /cart/2x 触发 404。
// 这里在 get_avatar HTML 上做正则修剪:srcset 中候选 url 必须是 http(s) 绝对地址,否则整属性删除。
add_filter('get_avatar', static function ($avatar) {
    if (! is_string($avatar) || $avatar === '') {
        return $avatar;
    }
    return preg_replace_callback(
        '#\ssrcset=([\'"])(.*?)\1#i',
        static function ($m) {
            $candidates = preg_split('/\s*,\s*/', trim((string) $m[2]));
            $kept = [];
            foreach ($candidates as $candidate) {
                if ($candidate === '') {
                    continue;
                }
                $parts = preg_split('/\s+/', $candidate, 2);
                $url = $parts[0] ?? '';
                if (preg_match('#^https?://#i', $url)) {
                    $kept[] = $candidate;
                }
            }
            if (empty($kept)) {
                return ''; // 整个 srcset 属性删除,避免浏览器解析空候选
            }
            return ' srcset=' . $m[1] . implode(', ', $kept) . $m[1];
        },
        $avatar
    );
}, 99, 1);
