<?php
// Read-only WordPress checks: wp --user=<administrator> eval-file tests/persistence.php
use function wsd\anfb\{animation_attributes, store_animation_attributes};
$assert = static function ($ok, $message) { if (!$ok) throw new RuntimeException($message); };
$legacy = ['metadata' => ['name' => 'Keep'], 'animationsForBlocks' => ['animation' => 'fade', 'variation' => 'up'], 'isAnimationProvider' => true, 'animationStagger' => 100];
$stored = store_animation_attributes($legacy);
$assert($stored['metadata']['name'] === 'Keep' && !isset($stored['animationsForBlocks']), 'Native metadata did not replace legacy properties.');
$assert(animation_attributes($stored)['animationsForBlocks'] === $legacy['animationsForBlocks'], 'Entry did not roundtrip.');
$assert(animation_attributes($stored)['animationStagger'] === 100, 'Sequence did not roundtrip.');
$assert(store_animation_attributes(animation_attributes($stored)) === $stored, 'Storage is not idempotent.');
$future = ['metadata' => ['anfb' => ['version' => 99]], 'animationsForBlocks' => ['animation' => 'fade']];
$assert(!isset(animation_attributes($future)['animationsForBlocks']), 'Unknown version executed legacy animation.');
try { store_animation_attributes($future); throw new RuntimeException('Unknown version overwritten.'); } catch (InvalidArgumentException $e) {}
$markup = '<!-- wp:paragraph ' . wp_json_encode($stored) . ' --><p>Keep text</p><!-- /wp:paragraph -->';
$rendered = do_blocks($markup);
$assert(str_contains($rendered, 'Keep text'), 'Render lost content.');
echo "Persistence checks passed.\n";

$para = '<!-- wp:paragraph {"animationsForBlocks":{"animation":"inherit"}} --><p>Sequence</p><!-- /wp:paragraph -->';
$inner = '<!-- wp:group {"isAnimationProvider":true,"animationStagger":50,"animationsForBlocks":{"animation":"zoom","variation":"in"}} --><div class="wp-block-group">' . $para . $para . '</div><!-- /wp:group -->';
$outer = '<!-- wp:group {"isAnimationProvider":true,"animationStagger":100,"animationsForBlocks":{"animation":"fade","variation":"up"}} --><div class="wp-block-group">' . $para . $inner . $para . '</div><!-- /wp:group -->';
$native = wsd\anfb\migrate_content($outer)['content'];
$output = do_blocks($native);
$assert(substr_count($output, 'data-aos="fade-up"') === 2 && substr_count($output, 'data-aos="zoom-in"') === 2, 'Native nested providers lost scope.');
$assert(str_contains($output,'data-aos-delay="50"') && str_contains($output,'data-aos-delay="100"'), 'Native nested sequence intervals lost.');
$assert(do_blocks($native) === $output, 'Native sequence leaked state across renders.');
echo "Native nested sequence checks passed.\n";
