<?php

if (! defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// 0.4.53: 卸载流程必须"绝不抛错",任何 fatal/timeout 都会让 WordPress 报
// "未能完整移除插件 .../mockup100-preview-plugin.php"。所以全部包 try/catch,
// 单步失败只记日志、不阻塞文件删除。

try {
    delete_option('mockup100_preview_settings');
    delete_site_transient('mockup100_preview_remote_plugin_info');
    delete_site_transient('update_plugins');
    // 0.5.7: 后台订单 Grading 入口的站点级开关 option 也需在卸载时清理。
    delete_option('mockup100_order_grading_enabled');
} catch (\Throwable $e) {
    // ignore: 选项/缓存清理失败不应阻塞插件文件移除
}

$mockup100_metaKeys = [
    '_mockup100_enabled',
    '_mockup100_template_bindings',
    '_mockup100_template_id',
    '_mockup100_template_code',
    '_mockup100_template_source',
    '_mockup100_template_label',
    '_mockup100_template_snapshot',
];

// delete_post_meta_by_key() 在大型 postmeta 表上是 DELETE 全表扫描,
// 超时会直接 fatal,WordPress 会判定卸载失败并保留插件目录 →
// 改成 wpdb 直接 DELETE,设置短超时,失败也不抛
global $wpdb;
if ($wpdb && isset($wpdb->postmeta)) {
    foreach ($mockup100_metaKeys as $mockup100_metaKey) {
        try {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- 卸载流程必须直接清理 postmeta;此处不需要缓存,且按 meta_key 删除是卸载的唯一可靠方式
            $wpdb->delete($wpdb->postmeta, ['meta_key' => $mockup100_metaKey], ['%s']);
        } catch (\Throwable $e) {
            // ignore: 单个 key 删不掉不应阻塞整体卸载
        }
    }
}

// 0.4.78 (Task 8.5): 卸载时同步清理用户级 user_meta(已购作品授权 + 用户上传作品记录),
// 避免遗留隐私/业务数据。同 postmeta 一致,直接 wpdb DELETE 兼顾大表性能与超时安全,
// 单步失败只 ignore 不阻塞插件文件移除。
$mockup100_userMetaKeys = [
    '_mockup100_artwork_licenses',
    '_mockup100_uploaded_artworks',
    // 0.5.7: 后台订单 Grading 入口的"用户已同意将订单数据发往 Mockup100" user_meta
    '_mockup100_grading_external_consent',
];

if ($wpdb && isset($wpdb->usermeta)) {
    foreach ($mockup100_userMetaKeys as $mockup100_userMetaKey) {
        try {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- 卸载流程必须直接清理 usermeta;此处不需要缓存,且按 meta_key 删除是卸载的唯一可靠方式
            $wpdb->delete($wpdb->usermeta, ['meta_key' => $mockup100_userMetaKey], ['%s']);
        } catch (\Throwable $e) {
            // ignore: 单个 user_meta key 删不掉不应阻塞整体卸载
        }
    }
}
