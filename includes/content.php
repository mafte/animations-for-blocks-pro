<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

function block_editable($block, $text = false) {
	$name = $block['blockName'] ?? '';
	$type = \WP_Block_Type_Registry::get_instance()->get_registered($name);
	if ($name === 'core/block' || !$type || !is_supported($name) || ($type->is_dynamic() && !in_array($name, animation_schema()['renderedEntryBlocks'], true)) || !empty($block['attrs']['metadata']['bindings']) || !empty($block['attrs']['dynamicData'])) {
		return false;
	}
	if ($text && (preg_match('/\{\{.*?\}\}/s', $block['innerHTML']) || !in_array($name, animation_schema()['textBlocks'], true))) {
		return false;
	}
	return true;
}

/** Remove only this plugin's attributes; retain a span that still carries user styling. */
function clean_text_opening($token) {
	$tag = new \WP_HTML_Tag_Processor($token);
	$tag->next_tag();
	$tag->remove_attribute('data-anfb');
	$classes = preg_split('/\s+/', trim((string) $tag->get_attribute('class')));
	$classes = array_values(array_filter($classes, static fn($class) => $class !== '' && $class !== 'anfb-text'));
	if ($classes) {
		$tag->set_attribute('class', implode(' ', $classes));
	} else {
		$tag->remove_attribute('class');
	}
	$clean = $tag->get_updated_html();
	$remaining = new \WP_HTML_Tag_Processor($clean);
	$remaining->next_tag();
	return $remaining->get_attribute_names_with_prefix('') ? $clean : '';
}

function remove_text_formats($html) {
	$stack = [];
	$result = '';
	foreach (wp_html_split($html) as $token) {
		if (preg_match('/^<\/span\s*>$/i', $token)) {
			if (array_pop($stack)) {
				continue;
			}
		} elseif (preg_match('/^<span\b/i', $token)) {
			$tag = new \WP_HTML_Tag_Processor($token);
			$tag->next_tag();
			if ($tag->get_attribute('data-anfb') !== null) {
				$token = clean_text_opening($token);
				$stack[] = $token === '';
			} else {
				$stack[] = false;
			}
		}
		$result .= $token;
	}
	return $result;
}

/** Offsets refer to original HTML bytes; text comparisons use decoded UTF-8. */
function text_tokens($html) {
	$result = [];
	$offset = 0;
	$stack = [];
	foreach (wp_html_split($html) as $token) {
		if (preg_match('/^<\/span\s*>$/i', $token)) {
			$open = array_pop($stack);
			if ($open !== null) {
				foreach ($result as &$item) {
					if ($item['marker'] === $open) {
						$item['marker_end'] = $offset + strlen($token);
					}
				}
				unset($item);
			}
		} elseif (preg_match('/^<span\b/i', $token)) {
			$tag = new \WP_HTML_Tag_Processor($token);
			$tag->next_tag();
			$stack[] = $tag->get_attribute('data-anfb') !== null ? $offset : null;
		} elseif ($token !== '' && $token[0] !== '<') {
			$markers = array_values(array_filter($stack, static fn($v) => $v !== null));
			$result[] = ['offset' => $offset, 'html' => $token, 'text' => html_entity_decode($token, ENT_QUOTES | ENT_HTML5, 'UTF-8'), 'marker' => $markers ? end($markers) : null, 'marker_end' => null];
		}
		$offset += strlen($token);
	}
	return $result;
}

function format_fragment($html, $selection, $config) {
	if (!is_array($selection) || !isset($selection['text']) || !is_string($selection['text']) || $selection['text'] === '' || array_diff(array_keys($selection), ['text', 'occurrence'])) {
		throw new \InvalidArgumentException('Selection requires non-empty exact text and optional occurrence.');
	}
	$needle = $selection['text'];
	$matches = [];
	foreach (text_tokens($html) as $token) {
		$offset = 0;
		while (($position = strpos($token['text'], $needle, $offset)) !== false) {
			$matches[] = [$token, $position];
			$offset = $position + strlen($needle);
		}
	}
	$occurrence = $selection['occurrence'] ?? null;
	if ($occurrence !== null && (!is_int($occurrence) || $occurrence < 1)) {
		throw new \InvalidArgumentException('Occurrence must be a positive integer.');
	}
	if (!$matches || ($occurrence === null && count($matches) !== 1) || ($occurrence !== null && !isset($matches[$occurrence - 1]))) {
		throw new \InvalidArgumentException('Selection missing or ambiguous; use inspect and occurrence. Selection must fit one text node.');
	}
	[$token, $position] = $matches[($occurrence ?? 1) - 1];
	$replacement = $config === null ? esc_html($needle) : '<span class="anfb-text" data-anfb="' . esc_attr(wp_json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . '">' . esc_html($needle) . '</span>';
	if ($token['marker'] !== null) {
		$fragment = substr($html, $token['marker'], $token['marker_end'] - $token['marker']);
		if ($position !== 0 || $token['text'] !== $needle || !preg_match('/^<span\b[^>]*>[^<]*<\/span>$/s', $fragment)) {
			throw new \InvalidArgumentException('Selection overlaps an existing effect. Remove the complete effect in the editor first.');
		}
		$opening = '';
		foreach (wp_html_split($fragment) as $part) {
			if (preg_match('/^<span\b/i', $part)) {
				$opening = $part;
				break;
			}
		}
		if ($config === null) {
			$clean = clean_text_opening($opening);
			$replacement = $clean . $token['html'] . ($clean !== '' ? '</span>' : '');
		} else {
			$tag = new \WP_HTML_Tag_Processor($opening);
			$tag->next_tag();
			$tag->set_attribute('data-anfb', wp_json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
			$replacement = $tag->get_updated_html() . $token['html'] . '</span>';
		}
		return substr_replace($html, $replacement, $token['marker'], strlen($fragment));
	}
	if ($config === null) {
		return $html;
	}
	$replacement = esc_html(substr($token['text'], 0, $position)) . $replacement . esc_html(substr($token['text'], $position + strlen($needle)));
	return substr_replace($html, $replacement, $token['offset'], strlen($token['html']));
}

function inspect_blocks($blocks, $prefix = [], $blocked = false) {
	$result = [];
	foreach ($blocks as $index => $block) {
		$path = array_merge($prefix, [$index]);
		$editable = !$blocked && block_editable($block);
		$settings = animation_attributes($block['attrs'] ?? []);
		$own_html = implode('', array_filter($block['innerContent'], 'is_string'));
		$effects = [];
		$tag = new \WP_HTML_Tag_Processor($own_html);
		while ($tag->next_tag()) {
			if (is_string($tag->get_attribute('data-anfb'))) {
				$effects[] = json_decode($tag->get_attribute('data-anfb'), true);
			}
		}
		$result[] = [
			'path' => $path, 'block' => $block['blockName'], 'editable' => $editable,
			'textEditable' => $editable && block_editable($block, true),
			'text' => html_entity_decode(wp_strip_all_tags($own_html), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'textNodes' => array_column(text_tokens($own_html), 'text'),
			'sequence' => ['enabled' => !empty($settings['isAnimationProvider']), 'interval' => $settings['animationStagger'] ?? 0],
			'entry' => $settings['animationsForBlocks'] ?? null, 'effects' => $effects,
			'source' => $editable ? null : ['block' => $block['blockName'], 'ref' => $block['attrs']['ref'] ?? null, 'reason' => 'Unregistered, unsupported, dynamic or bound content; edit its source.'],
			'children' => inspect_blocks($block['innerBlocks'], $path, !$editable),
		];
	}
	return $result;
}

function &block_at_path(&$blocks, $path) {
	if (!is_array($path) || !$path) {
		throw new \InvalidArgumentException('Block path must be a non-empty array.');
	}
	$level =& $blocks;
	foreach ($path as $depth => $index) {
		if (!is_int($index) || $index < 0 || !isset($level[$index]) || !block_editable($level[$index])) {
			throw new \InvalidArgumentException('Block path is unavailable or crosses dynamic content.');
		}
		if ($depth === count($path) - 1) {
			return $level[$index];
		}
		$level =& $level[$index]['innerBlocks'];
	}
}

function transform_content($content, $operations) {
	if (!is_array($operations) || !array_is_list($operations)) {
		throw new \InvalidArgumentException('Operations must be an array.');
	}
	$blocks = parse_blocks($content);
	$original_serialized = serialize_blocks($blocks);
	foreach ($operations as $operation) {
		if (!is_array($operation) || array_diff(array_keys($operation), ['path', 'block', 'op', 'config', 'selection'])) {
			throw new \InvalidArgumentException('Invalid operation.');
		}
		$block =& block_at_path($blocks, $operation['path'] ?? null);
		if (($operation['block'] ?? '') !== $block['blockName']) {
			throw new \InvalidArgumentException('Block type does not match inspection.');
		}
		if (array_key_exists('anfb', $block['attrs']['metadata'] ?? [])) validate_animation_metadata($block['attrs']['metadata']['anfb']);
		$op = $operation['op'] ?? '';
		if (!in_array($op, ['text', 'text-remove'], true)) $block['attrs'] = animation_attributes($block['attrs'] ?? []);
		if ($op === 'sequence') {
			if (!in_array($block['blockName'], animation_schema()['sequenceBlocks'], true)) throw new \InvalidArgumentException('Unsupported sequence group.');
			$config = $operation['config'] ?? [];
			if (array_diff(array_keys($config), ['enabled', 'interval']) || !is_bool($config['enabled'] ?? null) || !is_int($config['interval'] ?? null) || $config['interval'] < 0 || $config['interval'] > 1000 || $config['interval'] % 50 !== 0) throw new \InvalidArgumentException('Sequence requires enabled and interval 0–1000.');
			$block['attrs']['isAnimationProvider'] = $config['enabled'];
			$block['attrs']['animationStagger'] = $config['interval'];
			foreach ($block['innerBlocks'] as &$child) {
				if ($config['enabled'] && block_editable($child)) {
					$settings = animation_attributes($child['attrs'] ?? []);
					if (empty($settings['animationsForBlocks']['animation'])) {
						$settings['animationsForBlocks'] = ['animation' => 'inherit'];
						$child['attrs'] = store_animation_attributes($settings);
					}
				}
			}
			unset($child);
			foreach ($block['innerContent'] as &$chunk) {
				if (is_string($chunk) && trim($chunk) !== '') { $chunk = sync_entry_html($chunk); break; }
			}
			unset($chunk);
		} elseif (in_array($op, ['entry', 'entry-remove'], true)) {
			$config = $op === 'entry' ? validate_entry($operation['config'] ?? null) : [];
			if ($op === 'entry' && ($config['animation'] ?? '') !== 'none') {
				$block['attrs']['animationsForBlocks'] = $config;
			} else {
				unset($block['attrs']['animationsForBlocks']);
			}
			$first = true;
			foreach ($block['innerContent'] as &$chunk) {
				if (is_string($chunk) && trim($chunk) !== '' && $first) {
					$chunk = sync_entry_html($chunk);
					$first = false;
				}
			}
			unset($chunk);
			if ($first && !in_array($block['blockName'], animation_schema()['renderedEntryBlocks'], true)) {
				throw new \InvalidArgumentException('Block has no editable root.');
			}
		} elseif (in_array($op, ['text', 'text-remove'], true)) {
			if (!block_editable($block, true) || $block['innerBlocks']) {
				throw new \InvalidArgumentException('Text effects require static paragraph, heading or GenerateBlocks V2 Text.');
			}
			$config = $op === 'text' ? validate_text_config($operation['config'] ?? null) : null;
			$block['innerContent'] = [format_fragment(implode('', $block['innerContent']), $operation['selection'] ?? null, $config)];
		} elseif ($op === 'clear') {
			if (!isset($block['attrs']['animationsForBlocks']) && empty($block['attrs']['isAnimationProvider']) && !str_contains($block['innerHTML'], 'data-aos') && !str_contains($block['innerHTML'], 'data-anfb')) {
				unset($block);
				continue;
			}
			unset($block['attrs']['animationsForBlocks'], $block['attrs']['isAnimationProvider'], $block['attrs']['animationStagger']);
			$first = true;
			foreach ($block['innerContent'] as &$chunk) {
				if (is_string($chunk)) {
					$chunk = remove_text_formats($chunk);
					if ($first && trim($chunk) !== '') {
						$chunk = sync_entry_html($chunk);
						$first = false;
					}
				}
			}
			unset($chunk);
		} else {
			throw new \InvalidArgumentException('Unknown operation.');
		}
		if (!in_array($op, ['text', 'text-remove'], true)) $block['attrs'] = store_animation_attributes($block['attrs']);
		$block['innerHTML'] = implode('', array_filter($block['innerContent'], 'is_string'));
		unset($block);
	}
	$result = serialize_blocks($blocks);
	return $result === $original_serialized ? $content : $result;
}
