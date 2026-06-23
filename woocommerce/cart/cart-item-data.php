<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<dl class="variation">
	<?php // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- $item_data 由 WooCommerce 模板系统传入,$data 为模板局部循环变量,不在全局命名空间
	foreach ( $item_data as $data ) :
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- $raw_key/$clean/$hide_dt 仅为模板内部短生命周期局部变量,WooCommerce 模板惯例
		$raw_key = trim( wp_strip_all_tags( (string) $data['key'] ) );
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- 模板局部变量
		$clean   = preg_replace( '/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $raw_key );
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- 模板局部变量
		$hide_dt = ( $clean === '' );
	?>
		<?php if ( ! $hide_dt ) : ?>
		<dt class="<?php echo sanitize_html_class( 'variation-' . $data['key'] ); ?>"><?php echo wp_kses_post( $data['key'] ); ?>:</dt>
		<?php endif; ?>
		<dd class="<?php echo sanitize_html_class( 'variation-' . $data['key'] ); ?>" style="<?php echo $hide_dt ? 'margin-left:0;' : ''; ?>"><?php echo wp_kses_post( wpautop( $data['display'] ) ); ?></dd>
	<?php endforeach; ?>
</dl>
