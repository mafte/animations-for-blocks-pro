# Development guide

Read this guide before changing the plugin. It describes the existing architecture and compatibility rules; it does not define an extension API for other plugins.

## Project structure

- `src/` contains the editor interfaces, frontend runtimes, styles, and AOS integration.
- `includes/animation-schema.json` is the source of truth for animation identifiers, ordered variations, easing values, anchor placements, configuration keys, CLI operations, and supported text adapters. PHP reads it through `animation_schema()`; JavaScript imports it directly.
- `src/aos-data.ts` provides translated editor labels and visual ordering. Keep strings passed to WordPress `__()` literal so translation extraction continues to work.
- `includes/` contains PHP registration, rendering, persistence, migration, sequence, text, and WP-CLI behavior.
- `build/` contains generated runtime assets and is committed because WordPress loads these files directly.
- `patches/aos@3.0.0-beta.6.patch` removes AOS's unused internal SCSS import. pnpm applies it to the pinned development dependency; retain it with `pnpm-workspace.yaml` and `pnpm-lock.yaml` so clean builds reproduce the same source.

## Data and runtime contracts

The plugin has three related capabilities:

| Capability | Configuration | Runtime |
| --- | --- | --- |
| Block entrance | `metadata.anfb.entry` | Rendered AOS attributes and the shared entrance engine |
| Selected-text effect | RichText format `anfb/text` | `<span class="anfb-text" data-anfb="…">` and the text runtime |
| Block sequence | `metadata.anfb.sequence` on a provider; children may inherit | Server/editor inheritance resolution and entrance delays |

Directions are variations of an entrance, not separate animation families or text effects. A sequence coordinates existing entrances. Preserve the current identifiers, markup, attributes, clipboard prefix, public hooks, and CLI plan format. Do not change saved HTML as part of an internal refactor.

New settings belong in native `metadata.anfb`; retain legacy aliases only where required for compatibility. Resolve Default, Inherit, and page-conditional entries at runtime rather than baking their result into saved markup. A sequence provider must not animate its own wrapper in addition to its children.

The editor catalog and schema are checked against each other. Keep variation ordering consistent between the schema and editor because the first variation is selected when switching from an incompatible family. The visual animation order is Curtain, Fade, Flip, Slide, Zoom, Scale. `none`, empty strings, and absent values keep their existing meanings.

Global defaults are represented in PHP (`get_default_settings()`) and JavaScript (`DEFAULT_SETTINGS` / `DEFAULT_ANIMATION`); update both when changing them. REST enumerations derive from the schema.

## Text, validation, and sequences

- `src/text-formats.js` applies and previews effects while preserving selected HTML, links, and inline formats. It must not replace the whole block.
- `src/text-runtime.js` runs Typing, Reveal words, Smooth words, and Counter. It restores original content when an effect finishes or is interrupted and keeps an accessible representation.
- `includes/text.php`, `includes/content.php`, and `includes/config.php` load, adapt, and validate supported text content.
- `includes/sequence.php` must stay in parity with the editor's `useAnimationConfig()` resolver.
- `includes/cli.php` implements `wp anfb`. Keep validation, current-hash checks, dry-run, and private backups for content writes.

Entry timing and text timing have different ranges. AOS entry duration is positive and entry delay uses 50 ms increments up to 3000 ms. Text duration and delay each support 1–60000 ms and 0–60000 ms respectively. Do not reuse one validator for the other. Adding a key to `textOptions` does not implement its behavior; validate and execute it explicitly.

## Compatibility and accessibility

- Minimum versions are WordPress 6.6 and PHP 8.1. Check API availability before relying on newer platform behavior.
- Preserve existing WordPress and GenerateBlocks V2 blocks, animation IDs, variations, effects, formats, attributes, hooks, and saved content.
- Keep reduced-motion support, visible content without JavaScript, and the initialization-failure fallback.
- Do not expand supported block/text adapters indiscriminately. Dynamic blocks, synced patterns, bindings, and query templates need specific review.
- UI source strings remain English and use the `animations-for-blocks` translation domain.

For any change, cover PHP and JavaScript parity, old content where relevant, editor preview, frontend rendering, keyboard/accessibility behavior, and failure/reduced-motion paths. See [testing.md](testing.md) for commands and disposable-site rules.
