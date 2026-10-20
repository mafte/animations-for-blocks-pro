---
name: animate-wordpress-blocks
description: Plan and apply animations to existing WordPress content with Animations for Blocks and `wp anfb`. Use for block entrances, text effects, and sequences; do not use for plugin development.
---

# Animate WordPress blocks

Use the plugin's supported editing workflow to animate existing content. Never rebuild a page from HTML or edit saved content outside the requested scope. If the user asks only for recommendations, provide a proposal without applying it.

## Choose motion

Use the content's hierarchy to choose effects. Prefer one consistent family and restrained timing; stagger related siblings rather than every fragment. Keep navigation, forms, and essential content usable, especially on mobile. Respect reduced motion.

| Effect | Typical use |
| --- | --- |
| `fade` | Subtle entrance for headings, paragraphs, and sections |
| `slide` | Directional movement when direction adds meaning |
| `zoom`, `scale` | Moderate emphasis for images or featured elements |
| `flip` | Occasional expressive treatment |
| `curtain` | Reveal an image with a directional mask |
| `typing` | Short text fragments; cursor is optional |
| `words`, `words-up` | Word-by-word reveal or a soft title reveal |
| `count` | Animate a number while preserving its displayed format |
| `sequence` | Stagger entrances of children in an existing group |

For an open-ended request for gentle motion, a reasonable starting point is `fade/up`, 500–700 ms, `ease-out-soft`, distance 24 px (16 px on mobile), `once: true`, and a 100 ms sequence interval. Treat these as defaults to discuss, not mandatory style rules. Confirm animation IDs and variations from the live `inspect.capabilities` output.

## Inspect before editing

1. Identify the correct WordPress installation, page/source, and an authorized editor. Use explicit `--path` and `--user` arguments. The plugin checkout is not the WordPress site.
2. Confirm the plugin is available and active. Do not replace this workflow with SQL, reconstructed HTML, or manual AOS attributes.
3. Inspect the page and retain the JSON response. Use returned paths, block names, text nodes, and capabilities exactly; never guess indices. Do not traverse non-editable nodes. Report synced patterns, query templates, bindings, and other dynamic sources that are outside the inspected editable content.
4. Inspect shared template parts separately when the requested content lives in a header or another shared source. Keep page-specific and global effects distinct.

```sh
wp --path=/path/to/wordpress --user=ID anfb inspect POST_ID --format=json
```

## Prepare a change set

Use plan version 1 with the current `postId`, `contentHash`, and `operations` from inspect. Each operation must use the exact returned `path` and `block` values. Supported operation types include `entry`, `entry-remove`, `text`, `text-remove`, `sequence`, and `clear`; verify the installed schema before relying on any option.

For entries, supported configuration may include animation, variation, duration, delay, easing, distance, mobile distance, offset, once/mirror, anchor placement, page IDs, and order. Entries normally support duration 50–3000 ms, delay up to 3000 ms in 50 ms steps, and distances 0–200 px. Use `default` only for the existing global default; use `inherit` only with a valid sequence provider.

For text effects, target only supported, editable Heading, Paragraph, or GenerateBlocks Text content. The selected string must fit within one inspected text node. Preserve inline formatting and links; do not flatten HTML to make a selection fit. Text duration and delay use their own ranges and validation, so consult the installed schema/runtime. For counters, provide a numeric endpoint and explicit decimal/thousands formatting where needed; never send a localized number string as a number.

For sequences, use an existing Group or GenerateBlocks Element. Configure the provider, then the sequence. Do not animate the provider wrapper as well as its children. Children already configured keep their own entries; only assign `inherit` where the user wants them in the sequence.

## Simulate, apply, and review

Save the JSON plan to a local file. Use a new private backup path outside the public WordPress tree. Simulate first, review the returned diff and scope, then apply that exact plan:

```sh
wp --path=/path/to/wordpress --user=ID anfb apply POST_ID --file=/path/to/plan.json --dry-run
wp --path=/path/to/wordpress --user=ID anfb apply POST_ID --file=/path/to/plan.json --backup=/private/path/before.json
```

Stop on stale hashes, editor locks, validation errors, or insufficient permissions. Re-inspect and simulate a revised plan if content changed. Never force an overwrite.

After applying, inspect again and review the frontend on desktop and mobile, including the complete scroll, navigation, and forms. Save/reopen in Gutenberg and verify valid blocks. Check reduced motion and no-JavaScript behavior where the browser supports those controls. If the editor canvas or browser is unavailable, state that visual verification remains incomplete.

Report what changed, which page or shared source changed, actual verification performed, limitations, and the plan/backup locations. Do not publish, alter unrelated design, submit forms, or deactivate the plugin unless asked.

## Remove or restore

Prefer `entry-remove` and `text-remove` for targeted cleanup. `clear` without paths may affect every editable block on the page, so inspect and simulate it first. Restore only with the private backup from the same site/page and when the content hash still matches; a conflict means later edits exist, so do not overwrite them manually.

For safe plugin deactivation, follow the project's [safe deactivation guide](../../docs/safe-deactivation.md). Legacy content may need the explicit per-page `migrate` command. Migration preserves settings; `clear` deletes them. Neither is an automatic part of applying animations.
