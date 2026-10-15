<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

/** Each provider owns its ordered list; nested providers never consume its interval. */
function resolve_provider(&$block) {
	$provided = $block['attrs']['animationsForBlocks'] ?? [];
	if (($provided['animation'] ?? '') === 'default') $provided = get_default_animation();
	if (empty($provided['animation']) || in_array($provided['animation'], ['none', 'inherit'], true)) return;
	$entries = [];
	$collect = function (&$children, $animated = false) use (&$collect, &$entries) {
		foreach ($children as &$child) {
			if (!empty($child['attrs']['isAnimationProvider'])) continue;
			$name = $child['attrs']['animationsForBlocks']['animation'] ?? 'none';
			if ($name === 'inherit') {
				if ($animated) unset($child['attrs']['animationsForBlocks']);
				else $entries[] =& $child;
			}
			$collect($child['innerBlocks'], $animated || !in_array($name, ['none', ''], true));
		}
	};
	$collect($block['innerBlocks']);
	usort($entries, static fn($a, $b) => ($a['attrs']['animationsForBlocks']['order'] ?? 0) <=> ($b['attrs']['animationsForBlocks']['order'] ?? 0));
	foreach ($entries as $rank => &$entry) {
		$entry['attrs']['animationsForBlocks'] = array_merge($provided, ['delay' => min(3000, ($provided['delay'] ?? 0) + $rank * ($block['attrs']['animationStagger'] ?? 0))]);
	}
}

function prepare_sequences($block) {
	if (!empty($block['attrs']['isAnimationProvider'])) resolve_provider($block);
	foreach ($block['innerBlocks'] as &$child) $child = prepare_sequences($child);
	return $block;
}
add_filter('render_block_data', __NAMESPACE__ . '\\prepare_sequences', 9);
