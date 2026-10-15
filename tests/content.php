<?php
// Run: wp --user=<administrator> eval-file tests/content.php
use function wsd\anfb\{transform_content, validate_text_config, inspect_blocks, remove_text_formats, format_fragment};

$checks = 0;
$check = function ($condition, $message) use (&$checks) {
	$checks++;
	if (!$condition) { throw new RuntimeException($message); }
};
$reject = function ($callback, $message) use ($check) {
	try { $callback(); } catch (InvalidArgumentException $e) { $check(true, $message); return; }
	$check(false, $message);
};
$original = '<!-- wp:paragraph --><p class="keep">Hola &amp; café 👩🏽‍💻 <strong>42</strong> y 42.</p><!-- /wp:paragraph -->';
$heading = '<!-- wp:heading --><h2 class="wp-block-heading">Título</h2><!-- /wp:heading -->';
$check(inspect_blocks(parse_blocks($heading))[0]['textEditable'], 'Heading render callback must allow static text.');
$entry = ['path' => [0], 'block' => 'core/paragraph', 'op' => 'entry', 'config' => ['animation' => 'fade', 'variation' => 'up', 'duration' => 800, 'offset' => 0, 'once' => true]];
$changed = transform_content($original, [$entry]);
$check(str_contains($changed, 'data-aos="fade-up"') && str_contains($changed, 'data-aos-offset="0"'), 'Entry attributes missing.');
$check(str_contains($changed, 'class="keep"') && str_contains($changed, '<strong>42</strong>'), 'Unrelated markup changed.');
$check(transform_content($changed, [$entry]) === $changed, 'Entry apply must be idempotent.');
$entry['config'] = ['animation' => 'zoom', 'variation' => 'in'];
$changed = transform_content($changed, [$entry]);
$check(str_contains($changed, 'data-aos="zoom-in"') && !str_contains($changed, 'data-aos-duration'), 'Old entry attributes survived.');
$clear = ['path' => [0], 'block' => 'core/paragraph', 'op' => 'clear'];
$check(!str_contains(transform_content($changed, [$clear]), 'data-aos'), 'Clear left entry attributes.');
$text = ['path' => [0], 'block' => 'core/paragraph', 'op' => 'text', 'selection' => ['text' => '42', 'occurrence' => 1], 'config' => ['effect' => 'count', 'end' => 42]];
$changed = transform_content($original, [$text]);
$check(str_contains($changed, '<strong><span class="anfb-text"'), 'Inline format lost strong.');
$check(transform_content($changed, [$text]) === $changed, 'Text apply must be idempotent.');
$text['selection'] = ['text' => '42', 'occurrence' => 2];
$text['config']['duration'] = 500;
$changed = transform_content($changed, [$text]);
$check(substr_count($changed, 'data-anfb=') === 2, 'Independent effects missing.');
$text['op'] = 'text-remove';
$changed = transform_content($changed, [$text]);
$check(substr_count($changed, 'data-anfb=') === 1, 'Removing one effect removed another.');
$check(remove_text_formats('<span class="keep"><span data-anfb="{}"><b>Hola</b></span></span>') === '<span class="keep"><b>Hola</b></span>', 'Removing format changed other spans.');
$check(str_contains(format_fragment('<p>Café &amp; té 👩🏽‍💻</p>', ['text' => 'té 👩🏽‍💻'], ['effect' => 'words']), 'té 👩🏽‍💻</span>'), 'Unicode or entities damaged.');
$reject(fn() => format_fragment('<p>42 y 42</p>', ['text' => '42'], ['effect' => 'count']), 'Ambiguous selection accepted.');
$reject(fn() => format_fragment('<p>Ho<strong>la</strong></p>', ['text' => 'Hola'], ['effect' => 'words']), 'Selection crossing HTML accepted.');
$reject(fn() => transform_content($original, [array_merge($entry, ['block' => 'core/heading'])]), 'Wrong block type accepted.');
$reject(fn() => transform_content($original, [array_merge($entry, ['path' => [99]])]), 'Wrong path accepted.');
$reject(fn() => transform_content($original, [array_merge($entry, ['config' => ['animation' => 'fade', 'variation' => 'javascript']])]), 'Bad variation accepted.');
$reject(fn() => validate_text_config(['effect' => 'count', 'end' => '1.250']), 'Ambiguous numeric string accepted.');
$reject(fn() => validate_text_config(['effect' => 'count', 'end' => INF]), 'Nonfinite counter accepted.');
foreach ([['decimal' => ',', 'thousands' => '.', 'prefix' => 'C$', 'suffix' => ''], ['decimal' => '.', 'thousands' => ',', 'prefix' => '', 'suffix' => '%']] as $locale) {
	$config = validate_text_config(array_merge($locale, ['effect' => 'count', 'start' => 2000, 'end' => -1250.5, 'decimals' => 2]));
	$check($config['end'] === -1250.5, 'Counter configuration altered.');
}
$gb = '<!-- wp:generateblocks/element {"uniqueId":"container","tagName":"div"} --><div class="gb-element-container"><!-- wp:generateblocks/text {"uniqueId":"text","tagName":"p"} --><p class="gb-text gb-text-text">Datos 98%</p><!-- /wp:generateblocks/text --></div><!-- /wp:generateblocks/element -->';
$ops = [['path' => [0, 0], 'block' => 'generateblocks/text', 'op' => 'text', 'selection' => ['text' => '98%'], 'config' => ['effect' => 'count', 'end' => 98, 'suffix' => '%']]];
$check(str_contains(transform_content($gb, $ops), 'gb-text gb-text-text'), 'GB V2 adapter failed.');
$check(inspect_blocks(parse_blocks($gb))[0]['children'][0]['textEditable'], 'GB V2 text not inspectable.');
$dynamic = '<!-- wp:block {"ref":123} /-->';
$reject(fn() => transform_content($dynamic, [['path' => [0], 'block' => 'core/block', 'op' => 'clear']]), 'Synced pattern accepted.');
$check(inspect_blocks(parse_blocks($dynamic))[0]['source']['ref'] === 123, 'Pattern source not reported.');
$bindings = '<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta"}}}} --><p>42</p><!-- /wp:paragraph -->';
$reject(fn() => transform_content($bindings, [$clear]), 'Bound content accepted.');
$wrapped = '<!-- wp:group --><div class="wp-block-group">' . $original . '</div><!-- /wp:group -->';
$check(inspect_blocks(parse_blocks($wrapped))[0]['children'][0]['editable'], 'Static parent blocks children.');
$styled = '<p><span id="stat" class="anfb-text custom" style="color:red" data-anfb="{}">42</span></p>';
$cleaned = remove_text_formats($styled);
$check(str_contains($cleaned, 'id="stat"') && str_contains($cleaned, 'class="custom"') && str_contains($cleaned, 'style="color:red"') && !str_contains($cleaned, 'data-anfb'), 'Clear lost unrelated span attributes.');
$updated = format_fragment($styled, ['text' => '42'], ['effect' => 'count', 'end' => 42]);
$check(str_contains($updated, 'id="stat"') && str_contains($updated, 'anfb-text custom'), 'Updating a fragment lost unrelated attributes.');
$check(str_contains(format_fragment($styled, ['text' => '42'], null), 'class="custom"'), 'Removing a fragment lost user styling.');
$no_effects = '<!-- wp:paragraph  -->
<p>Hi</p>
<!-- /wp:paragraph -->';
$check(transform_content($no_effects, [$clear]) === $no_effects, 'No-op clear rewrote content.');
$more = '<!-- wp:more --><!--more--><!-- /wp:more -->';
$check(transform_content($more, [['path' => [0], 'block' => 'core/more', 'op' => 'clear']]) === $more, 'No-op clear on a non-element block failed.');
$provider = '<!-- wp:anfb/animation-container {"isAnimationProvider":true,"animationStagger":100,"animationsForBlocks":{"animation":"fade","variation":"up","duration":800}} --><div class="wp-block-anfb-animation-container"><!-- wp:paragraph {"animationsForBlocks":{"animation":"inherit"}} --><p>First</p><!-- /wp:paragraph --><!-- wp:paragraph {"animationsForBlocks":{"animation":"inherit"}} --><p>Second</p><!-- /wp:paragraph --></div><!-- /wp:anfb/animation-container -->';
$rendered = do_blocks($provider);
$check(substr_count($rendered, 'data-aos="fade-up"') === 2, 'Provider inheritance failed.');
$check(str_contains($rendered, 'data-aos-delay="100"'), 'Provider stagger failed.');
$check(!str_contains(transform_content($provider, [['path' => [0,0], 'block' => 'core/paragraph', 'op' => 'entry', 'config' => ['animation' => 'inherit']]]), 'data-aos='), 'Inherited attributes should only be rendered server side.');
$stale = wsd\anfb\add_animation_attributes('<p class="keep" data-aos="zoom-in" data-aos-delay="500">Hi</p>', ['animation' => 'fade', 'variation' => 'up']);
$check(str_contains($stale, 'data-aos="fade-up"') && !str_contains($stale, 'data-aos-delay'), 'Rendered attributes remained stale.');

echo "Content checks passed: $checks\n";
