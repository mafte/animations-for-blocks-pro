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
