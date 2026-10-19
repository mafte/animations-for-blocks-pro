<?php
namespace wsd\anfb;

defined('ABSPATH') || exit;

/** Splice only changed comments/root tags; never reserialize unrelated blocks. */
function migrate_content($content) {
	preg_match_all('/<!--\s+(\/?)wp:([a-z0-9_-]+(?:\/[a-z0-9_-]+)?)(?:\s+(\{.*?\}))?\s*(\/?)-->/s', $content, $tokens, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);
	$patches = [];
	$stack = [];
	$pending = [];
	foreach ($tokens as $index => $token) {
		[$comment, $offset] = $token[0];
		$name = str_contains($token[2][0], '/') ? $token[2][0] : 'core/' . $token[2][0];
		if ($token[1][0] === '/') {
			$parent = array_pop($stack);
			if (!$parent || $parent['name'] !== $name) throw new \InvalidArgumentException('Unbalanced block markup; no migration performed.');
			if ($parent['converted']) $patches[] = [$offset, strlen($comment), '<!-- /wp:group -->'];
			continue;
		}
		$attrs = !empty($token[3][0]) ? json_decode($token[3][0], true, 512, JSON_THROW_ON_ERROR) : [];
		if (!is_array($attrs)) throw new \InvalidArgumentException('Invalid block attributes.');
		$self_closing = ($token[4][0] ?? '') === '/';
		$external = in_array($name, ['core/block', 'core/template-part', 'core/query', 'core/post-template', 'generateblocks/query', 'generateblocks/looper', 'generateblocks/loop-item'], true) || !empty($attrs['metadata']['bindings']) || !empty($attrs['dynamicData']);
		$blocked = ($stack && end($stack)['blocked']) || $external;
		$editable = block_editable(['blockName' => $name, 'attrs' => $attrs, 'innerHTML' => '']);
		$has_settings = isset($attrs['metadata']['anfb']) || isset($attrs['animationsForBlocks']) || !empty($attrs['isAnimationProvider']);
		if (($blocked && (!$stack || !end($stack)['blocked'])) || (!$blocked && !$editable && $has_settings)) $pending[] = ['block' => $name, 'ref' => $attrs['ref'] ?? null, 'offset' => $offset];
		$container = !$blocked && $name === 'anfb/animation-container';
		if (!$self_closing) $stack[] = ['name' => $name, 'converted' => $container, 'blocked' => $blocked];
		if ($blocked || !$editable) continue;
		if ($container && $self_closing) throw new \InvalidArgumentException('Container has no editable root.');
		if (isset($attrs['metadata']) && !is_array($attrs['metadata'])) throw new \InvalidArgumentException('Block metadata must be an object.');
		$original_attrs = $attrs;
		$native = array_key_exists('anfb', $attrs['metadata'] ?? []);
		$legacy = array_intersect_key($attrs, array_flip(['animationsForBlocks', 'isAnimationProvider', 'animationStagger']));
		if ($native) {
			validate_animation_metadata($attrs['metadata']['anfb']);
			if ($legacy) store_animation_attributes($legacy);
			$effective = animation_attributes($attrs);
			foreach ($legacy as $key => $value) {
				if ($value != ($effective[$key] ?? null)) throw new \InvalidArgumentException('Conflicting legacy and native animation settings.');
			}
			$attrs = store_animation_attributes($effective);
		} elseif ($legacy) {
			$attrs = store_animation_attributes($attrs);
		}
		$root_start = $offset + strlen($comment);
		$root_end = $tokens[$index + 1][0][1] ?? strlen($content);
		$html = substr($content, $root_start, $root_end - $root_start);
		$updated = $html;
		if (($native || $legacy || $container) && !$self_closing) {
			$updated = sync_entry_html($html);
		}
		if ($container) {
			$allowed = ['metadata', 'anchor', 'className', 'lock'];
			if (array_diff(array_keys($attrs), $allowed)) throw new \InvalidArgumentException('Unsupported legacy container attributes.');
			$attrs['className'] = trim('wp-block-anfb-animation-container ' . ($attrs['className'] ?? ''));
			$attrs['layout'] = ['type' => 'default'];
			$attrs['style']['spacing']['blockGap'] = '0';
			$tag = new \WP_HTML_Tag_Processor($updated);
			if (!$tag->next_tag() || $tag->get_tag() !== 'DIV') throw new \InvalidArgumentException('Unsupported legacy container root.');
			$tag->set_attribute('class', trim('wp-block-group ' . $attrs['className']));
			$updated = $tag->get_updated_html();
		}
		if ($attrs !== $original_attrs || $container) {
			$new_name = $container ? 'group' : $token[2][0];
			$replacement = '<!-- wp:' . $new_name . ($attrs ? ' ' . serialize_block_attributes($attrs) : '') . ($self_closing ? ' /-->' : ' -->');
			$patches[] = [$offset, strlen($comment), $replacement];
		}
		if ($updated !== $html) $patches[] = [$root_start, strlen($html), $updated];
	}
	if ($stack) throw new \InvalidArgumentException('Unclosed block markup; no migration performed.');
	usort($patches, static fn($a, $b) => $b[0] <=> $a[0]);
	foreach ($patches as [$offset, $length, $replacement]) $content = substr_replace($content, $replacement, $offset, $length);
	return ['content' => $content, 'pendingSources' => $pending];
}
