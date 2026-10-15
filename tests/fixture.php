<?php
if (!defined('ANFB_TEST_SITE') || !ANFB_TEST_SITE) throw new RuntimeException('Isolated test site required.');
$content = '<!-- wp:group {"layout":{"type":"constrained"}} --><div class="wp-block-group"><!-- wp:heading --><h2 class="wp-block-heading">Animaciones con café 👩🏽‍💻</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Más de 1.250,50 proyectos y 98% de satisfacción. <strong>Texto destacado</strong> con <a href="#contacto">enlace</a>.</p><!-- /wp:paragraph --><!-- wp:generateblocks/text {"uniqueId":"anfbtest","tagName":"p"} --><p class="gb-text gb-text-anfbtest">GenerateBlocks 42</p><!-- /wp:generateblocks/text --></div><!-- /wp:group -->';
$id = wp_insert_post(['post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'ANFB acceptance fixture', 'post_content' => wp_slash($content)]);
if (is_wp_error($id) || !$id) throw new RuntimeException('Fixture failed.');
file_put_contents('/private/tmp/anfb-fixture.json', wp_json_encode(['postId' => $id, 'content' => get_post($id)->post_content]));
echo $id;
