<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

function validate_animation_metadata($data) {
	if (!is_array($data) || ($data['version'] ?? null) !== 1 || array_diff(array_keys($data), ['version', 'entry', 'sequence'])) {
		throw new \InvalidArgumentException('Unknown or invalid animation metadata; content was not changed.');
	}
	if (array_key_exists('entry', $data)) validate_entry($data['entry']);
	if (array_key_exists('sequence', $data)) {
		$sequence = $data['sequence'];
		if (!is_array($sequence) || array_diff(array_keys($sequence), ['enabled', 'interval']) || !is_bool($sequence['enabled'] ?? null) || !is_int($sequence['interval'] ?? null) || $sequence['interval'] < 0 || $sequence['interval'] > 1000 || $sequence['interval'] % 50 !== 0) {
			throw new \InvalidArgumentException('Invalid animation sequence metadata.');
		}
	}
}

/** Runtime aliases keep existing render hooks and sequence contexts compatible. */
function animation_attributes($attrs) {
	if (!is_array($attrs['metadata'] ?? []) || !array_key_exists('anfb', $attrs['metadata'] ?? [])) return $attrs;
	$data = $attrs['metadata']['anfb'];
	unset($attrs['animationsForBlocks'], $attrs['isAnimationProvider'], $attrs['animationStagger']);
	try { validate_animation_metadata($data); } catch (\InvalidArgumentException $e) { return $attrs; }
	if (isset($data['entry'])) $attrs['animationsForBlocks'] = $data['entry'];
	if (isset($data['sequence'])) {
		$attrs['isAnimationProvider'] = $data['sequence']['enabled'];
		$attrs['animationStagger'] = $data['sequence']['interval'];
	}
	return $attrs;
}

function store_animation_attributes($attrs) {
	if (isset($attrs['metadata']) && !is_array($attrs['metadata'])) throw new \InvalidArgumentException('Block metadata must be an object.');
	if (array_key_exists('anfb', $attrs['metadata'] ?? [])) validate_animation_metadata($attrs['metadata']['anfb']);
	if (isset($attrs['isAnimationProvider']) && !is_bool($attrs['isAnimationProvider'])) throw new \InvalidArgumentException('Sequence enabled must be boolean.');
	if (isset($attrs['animationStagger']) && !is_int($attrs['animationStagger'])) throw new \InvalidArgumentException('Sequence interval must be an integer.');
	$data = ['version' => 1];
	if (!empty($attrs['animationsForBlocks'])) {
		$entry = $attrs['animationsForBlocks'];
		if (is_array($entry) && empty($entry['animation'])) $entry['animation'] = 'none';
		$data['entry'] = validate_entry($entry);
	}
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
