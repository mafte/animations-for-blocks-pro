<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

function register_text_assets() {
	$asset = include WSD_ANFB_DIR . '/build/text.asset.php';
	wp_register_script('anfb-text', plugins_url('build/text.js', WSD_ANFB_FILE), $asset['dependencies'], $asset['version'], ['in_footer' => true, 'strategy' => 'defer']);
	wp_register_style('anfb-text', plugins_url('build/text.css', WSD_ANFB_FILE), [], $asset['version']);
}
add_action('init', __NAMESPACE__ . '\\register_text_assets');

function enqueue_text_assets($html) {
	if (!is_admin() && str_contains($html, 'data-anfb=')) {
		wp_enqueue_script('anfb-text');
		wp_enqueue_style('anfb-text');
	}
	return $html;
}
add_filter('render_block', __NAMESPACE__ . '\\enqueue_text_assets', 20);
