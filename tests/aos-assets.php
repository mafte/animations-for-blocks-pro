<?php
// Run in a fresh WordPress CLI process per ANFB_AOS_SCENARIO value.
if (!defined('ANFB_TEST_SITE') || !ANFB_TEST_SITE) throw new RuntimeException('Isolated test site required.');

$scenario = getenv('ANFB_AOS_SCENARIO') ?: 'lazy-empty';
$original = get_option('animations-for-blocks', []);
$settings = array_merge($original, [
	'lazyloadAssets' => !in_array($scenario, ['eager', 'filtered'], true),
	'lenis' => $scenario === 'lenis' ? 'on' : 'off',
]);
add_filter('pre_option_animations-for-blocks', static fn() => $settings);

if ($scenario === 'filtered') {
	add_filter('anfb_load_styles', '__return_false', 20);
	add_filter('anfb_load_scripts', '__return_false', 20);
}

do_action('wp_enqueue_scripts');
$styles = wp_styles();
$scripts = wp_scripts();
$aos_style = WSD_ANFB_AOS_HANDLE;
$aos_init = 'animations-for-blocks';
$check = static function ($condition, $message) {
	if (!$condition) throw new RuntimeException($message);
};
$queued = static fn($type, $handle) => in_array($handle, $type->queue, true);

if ($scenario === 'lazy-animated' || $scenario === 'lazy-empty') {
	$check(!$queued($styles, $aos_style) && !$queued($scripts, $aos_init), 'Lazy loading enqueued AOS before rendering an animated block.');
	$markup = $scenario === 'lazy-animated'
		? '<!-- wp:paragraph {"animationsForBlocks":{"animation":"fade","variation":"up","duration":600}} --><p>AOS asset fixture</p><!-- /wp:paragraph -->'
		: '<!-- wp:paragraph {"animationsForBlocks":{"animation":"none"}} --><p>No animation fixture</p><!-- /wp:paragraph -->';
	$html = do_blocks($markup);
	if ($scenario === 'lazy-animated') {
		$check(str_contains($html, 'data-aos="fade-up"'), 'Animated fixture did not render AOS attributes.');
		$check($queued($styles, $aos_style) && $queued($scripts, $aos_init), 'The first animated block did not enqueue AOS assets.');
	} else {
		$check(!$queued($styles, $aos_style) && !$queued($scripts, $aos_init), 'AOS assets loaded for a block without an animation.');
	}
} elseif ($scenario === 'eager') {
	$check($queued($styles, $aos_style) && $queued($scripts, $aos_init), 'Eager loading did not enqueue AOS assets.');
} elseif ($scenario === 'filtered') {
	$check(!$queued($styles, $aos_style) && !$queued($scripts, $aos_init), 'Asset filters did not prevent AOS enqueueing.');
} elseif ($scenario === 'lenis') {
	$check($queued($styles, 'anfb/lenis') && $queued($scripts, 'anfb/lenis'), 'Lenis option did not enqueue its assets.');
	$check(!$queued($styles, $aos_style) && !$queued($scripts, $aos_init), 'Lenis-only loading unexpectedly enqueued AOS.');
} else {
	throw new InvalidArgumentException('Unknown ANFB_AOS_SCENARIO: ' . $scenario);
}

$check(isset($scripts->registered[$aos_style]), 'AOS script handle is not registered.');
$check(isset($scripts->registered[$aos_init]), 'AOS initializer handle is not registered.');
$asset = include WSD_ANFB_DIR . '/build/aos.asset.php';
$check($scripts->registered[$aos_style]->ver === $asset['version'], 'AOS script URL version does not match its asset manifest.');
$check(in_array(apply_filters('anfb_aos_handle', $aos_style), $scripts->registered[$aos_init]->deps, true), 'Initializer no longer depends on the configured AOS handle.');
$check(($scripts->registered[$aos_style]->extra['strategy'] ?? null) === 'defer', 'AOS script lost its defer strategy.');
$check(($scripts->registered[$aos_init]->extra['strategy'] ?? null) === 'defer', 'AOS initializer lost its defer strategy.');
$check($styles->registered[$aos_style]->ver === md5_file(WSD_ANFB_DIR . '/build/aos.css'), 'AOS style URL version does not match its content.');

echo "AOS asset checks passed: {$scenario}.\n";
