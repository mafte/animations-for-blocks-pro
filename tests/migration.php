<?php
// Read-only WordPress checks; never creates or updates a post.
use function wsd\anfb\{migrate_content, animation_attributes};
$assert = static function ($ok, $message) { if (!$ok) throw new RuntimeException($message); };
$source = '<!-- wp:paragraph {"animationsForBlocks":{"animation":"fade","variation":"up"},"metadata":{"name":"Keep"}} --><p data-aos="fade-up" data-aos-duration="800">Café <strong>sí</strong></p><!-- /wp:paragraph -->';
$result = migrate_content($source);
$assert(!str_contains($result['content'], 'data-aos='), 'Migration retained root attributes.');
$block = parse_blocks($result['content'])[0];
$assert($block['attrs']['metadata']['name'] === 'Keep' && animation_attributes($block['attrs'])['animationsForBlocks']['variation'] === 'up', 'Configuration lost.');
$assert(str_contains($result['content'], 'Café <strong>sí</strong>'), 'Formatted content changed.');
$assert(migrate_content($result['content'])['content'] === $result['content'], 'Migration not idempotent.');
$unrelated='<!-- wp:paragraph  --><p>Leave bytes alone.</p><!-- /wp:paragraph -->';
$assert(migrate_content($source . $unrelated)['content'] === $result['content'] . $unrelated, 'Unrelated block rewritten.');
$group = '<!-- wp:anfb/animation-container {"isAnimationProvider":true,"animationStagger":100,"animationsForBlocks":{"animation":"fade","variation":"up"}} --><div class="wp-block-anfb-animation-container">' . $source . '</div><!-- /wp:anfb/animation-container -->';
$converted = migrate_content($group)['content'];
$assert(!str_contains($converted, 'wp:anfb/animation-container') && str_contains($converted, 'wp:group'), 'Container not converted.');
$assert(parse_blocks($converted)[0]['attrs']['style']['spacing']['blockGap'] === '0', 'Group added default spacing.');
$conflict = '<!-- wp:paragraph {"metadata":{"anfb":{"version":1,"entry":{"animation":"zoom","variation":"in"}}},"animationsForBlocks":{"animation":"fade","variation":"up"}} --><p>Keep</p><!-- /wp:paragraph -->';
try { migrate_content($conflict); throw new RuntimeException('Conflicting stores accepted.'); } catch (InvalidArgumentException $e) {}
$future = '<!-- wp:paragraph {"metadata":{"anfb":{"version":99}}} --><p>Keep</p><!-- /wp:paragraph -->';
try { migrate_content($future); throw new RuntimeException('Future version overwritten.'); } catch (InvalidArgumentException $e) {}
$reference = '<!-- wp:block {"ref":123} /-->';
$pending=migrate_content($reference);
$assert($pending['content'] === $reference && count($pending['pendingSources']) === 1, 'Reference not reported.');
$static_parent = '<!-- wp:generateblocks-pro/carousel --><div class="carousel">' . $source . '</div><!-- /wp:generateblocks-pro/carousel -->';
$nested_result=migrate_content($static_parent);
$assert(str_contains($nested_result['content'],'class="carousel"') && !str_contains($nested_result['content'],'data-aos='), 'Static children in a stored container were not migrated.');
$assert(!$nested_result['pendingSources'], 'Unanimated static container incorrectly reported as pending.');

foreach ([null, false, 0, '', ['version'=>1,'entry'=>'invalid'], ['version'=>1,'entry'=>['animation'=>'fade','variation'=>'up'],'sequence'=>['enabled'=>true,'interval'=>-50]]] as $bad_metadata) {
 $malformed='<!-- wp:paragraph ' . wp_json_encode(['metadata'=>['anfb'=>$bad_metadata]]) . ' --><p>Preserve this paragraph.</p><!-- /wp:paragraph -->';
 try { migrate_content($malformed); throw new RuntimeException('Malformed animation metadata was silently discarded or rewritten: ' . wp_json_encode($bad_metadata)); } catch (InvalidArgumentException $e) {} catch (RuntimeException $e) { echo $e->getMessage() . "\n"; throw $e; }
}
$unknown_container='<!-- wp:anfb/animation-container {"customUnrecognized":"keep"} --><div class="wp-block-anfb-animation-container"><p>Keep me.</p></div><!-- /wp:anfb/animation-container -->';
try { migrate_content($unknown_container); throw new RuntimeException('Unknown container attribute was silently discarded.'); } catch (InvalidArgumentException $e) {}

echo "Migration checks passed.\n";
