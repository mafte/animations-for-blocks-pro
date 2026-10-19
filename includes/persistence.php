<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

/** Runtime aliases keep existing render hooks and sequence contexts compatible. */
function animation_attributes($attrs) {
	if (!array_key_exists('anfb', $attrs['metadata'] ?? [])) return $attrs;
	$data = $attrs['metadata']['anfb'];
	unset($attrs['animationsForBlocks'], $attrs['isAnimationProvider'], $attrs['animationStagger']);
	if (!is_array($data) || ($data['version'] ?? null) !== 1) return $attrs;
	if (is_array($data['entry'] ?? null)) $attrs['animationsForBlocks'] = $data['entry'];
	if (is_array($data['sequence'] ?? null)) {
		$attrs['isAnimationProvider'] = $data['sequence']['enabled'] ?? false;
		$attrs['animationStagger'] = $data['sequence']['interval'] ?? 0;
	}
	return $attrs;
}

function store_animation_attributes($attrs) {
	if (isset($attrs['metadata']['anfb']) && ($attrs['metadata']['anfb']['version'] ?? null) !== 1) {
		throw new \InvalidArgumentException('Unknown animation metadata version; content was not changed.');
	}
	$data = ['version' => 1];
	if (!empty($attrs['animationsForBlocks'])) $data['entry'] = validate_entry($attrs['animationsForBlocks']);
	if (!empty($attrs['isAnimationProvider']) || !empty($attrs['animationStagger'])) {
		$data['sequence'] = ['enabled' => !empty($attrs['isAnimationProvider']), 'interval' => $attrs['animationStagger'] ?? 0];
	}
	if (isset($data['sequence']) && (!is_int($data['sequence']['interval']) || $data['sequence']['interval'] < 0 || $data['sequence']['interval'] > 1000 || $data['sequence']['interval'] % 50 !== 0)) {
		throw new \InvalidArgumentException('Sequence interval must be 0–1000 ms in steps of 50.');
	}
	unset($attrs['animationsForBlocks'], $attrs['isAnimationProvider'], $attrs['animationStagger']);
	if (count($data) > 1) $attrs['metadata']['anfb'] = $data;
	else unset($attrs['metadata']['anfb']);
	if (isset($attrs['metadata']) && !$attrs['metadata']) unset($attrs['metadata']);
	return $attrs;
}

function prepare_animation_attributes($block) {
	if (!empty($block['anfbPrepared'])) return $block;
	$block['anfbPrepared'] = true;
	$block['attrs'] = animation_attributes($block['attrs'] ?? []);
	foreach ($block['innerBlocks'] as &$child) $child = prepare_animation_attributes($child);
	return $block;
}
add_filter('render_block_data', __NAMESPACE__ . '\\prepare_animation_attributes', 8);
