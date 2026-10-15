<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

function animation_schema() {
	static $schema;
	return $schema ??= json_decode(file_get_contents(__DIR__ . '/animation-schema.json'), true);
}

function validate_entry($config) {
	if (!is_array($config)) {
		throw new \InvalidArgumentException('Entry config must be an object.');
	}
	$allowed = ['animation', 'variation', 'duration', 'delay', 'once', 'mirror', 'easing', 'offset', 'anchorPlacement'];
	if (array_diff(array_keys($config), $allowed)) {
		throw new \InvalidArgumentException('Unknown entry option.');
	}
	$schema = animation_schema();
	$name = $config['animation'] ?? '';
	if (!in_array($name, array_merge(array_keys($schema['variations']), ['default', 'inherit', 'none']), true)) {
		throw new \InvalidArgumentException('Unknown entry animation.');
	}
	if (isset($schema['variations'][$name]) && !in_array($config['variation'] ?? '', $schema['variations'][$name], true)) {
		throw new \InvalidArgumentException('Invalid animation variation.');
	}
	foreach (['duration', 'delay', 'offset'] as $key) {
		if (isset($config[$key]) && (!is_int($config[$key]) || $config[$key] < 0 || $config[$key] > 60000)) {
			throw new \InvalidArgumentException("Invalid $key (integer 0–60000 required).");
		}
	}
	foreach (['duration', 'delay'] as $key) {
		if (isset($config[$key]) && ($config[$key] > 3000 || $config[$key] % 50 !== 0 || ($key === 'duration' && $config[$key] === 0))) {
			throw new \InvalidArgumentException("AOS $key must use steps of 50 ms up to 3000; duration must be positive.");
		}
	}
	foreach (['once', 'mirror'] as $key) {
		if (isset($config[$key]) && !is_bool($config[$key])) {
			throw new \InvalidArgumentException("$key must be boolean.");
		}
	}
	foreach (['easing' => 'easings', 'anchorPlacement' => 'anchorPlacements'] as $key => $values) {
		if (isset($config[$key]) && !in_array($config[$key], $schema[$values], true)) {
			throw new \InvalidArgumentException("Invalid $key.");
		}
	}
	return $config;
}

function validate_text_config($config) {
	if (!is_array($config) || array_diff(array_keys($config), ['effect', 'duration', 'delay', 'cursor', 'start', 'end', 'decimals', 'decimal', 'thousands', 'prefix', 'suffix'])) {
		throw new \InvalidArgumentException('Unknown text option or invalid config.');
	}
	if (!in_array($config['effect'] ?? '', animation_schema()['effects'], true)) {
		throw new \InvalidArgumentException('Unknown text effect.');
	}
	$config = array_merge(['duration' => 1200, 'delay' => 0], $config);
	foreach (['duration', 'delay'] as $key) {
		if (!is_int($config[$key]) || $config[$key] < ($key === 'duration' ? 1 : 0) || $config[$key] > 60000) {
			throw new \InvalidArgumentException("Invalid text $key.");
		}
	}
	if (isset($config['cursor']) && !is_bool($config['cursor'])) {
		throw new \InvalidArgumentException('Cursor must be boolean.');
	}
	if ($config['effect'] === 'count') {
		$config = array_merge(['start' => 0, 'decimals' => 0, 'decimal' => '.', 'thousands' => ',', 'prefix' => '', 'suffix' => ''], $config);
		foreach (['start', 'end'] as $key) {
			if (!isset($config[$key]) || !is_numeric($config[$key]) || is_string($config[$key]) || !is_finite((float) $config[$key]) || abs($config[$key]) > 9007199254740991) {
				throw new \InvalidArgumentException("Counter $key must be an explicit finite number.");
			}
		}
		if (!is_int($config['decimals']) || $config['decimals'] < 0 || $config['decimals'] > 10) {
			throw new \InvalidArgumentException('Decimals must be 0–10.');
		}
		foreach (['decimal', 'thousands', 'prefix', 'suffix'] as $key) {
			if (!is_string($config[$key]) || strlen($config[$key]) > 100) {
				throw new \InvalidArgumentException("Invalid counter $key.");
			}
		}
		if ($config['decimal'] === '' || $config['decimal'] === $config['thousands']) {
			throw new \InvalidArgumentException('Counter separators must be different; decimal is required.');
		}
	}
	return $config;
}

/** Keep static saved markup aligned with the editor's extraProps filter. */
function sync_entry_html($html, $config = [], $provider = false) {
	$tags = new \WP_HTML_Tag_Processor($html);
	if (!$tags->next_tag()) {
		throw new \InvalidArgumentException('Block has no root HTML element.');
	}
	foreach (['data-aos', 'data-aos-delay', 'data-aos-duration', 'data-aos-easing', 'data-aos-once', 'data-aos-mirror', 'data-aos-offset', 'data-aos-anchor-placement'] as $key) {
		$tags->remove_attribute($key);
	}
	if (!$provider && !in_array($config['animation'] ?? 'none', ['none', 'default', 'inherit'], true)) {
		foreach (get_animation_attributes($config) as $key => $value) {
			$tags->set_attribute($key, $value);
		}
	}
	return $tags->get_updated_html();
}
