# Animations for Blocks Pro

Animations for Blocks Pro adds animation controls to supported Gutenberg blocks. It uses AOS (Animate on Scroll) for block entrance animations and includes text effects, animation sequences, reduced-motion handling, and optional Lenis smooth scrolling.

## Requirements

- WordPress 6.6 or later
- PHP 8.1 or later

## Features

- Configure animation type, direction, duration, delay, easing, and scroll behavior in the block editor.
- Animate selected text with typing, word reveal, and counter effects.
- Coordinate child animations with native Group blocks and sequences.
- Respect `prefers-reduced-motion` by default.
- Load frontend assets conditionally and support optional Lenis integration.
- Configure or inspect supported content with the `wp anfb` WP-CLI commands.

## Installation

Download a production ZIP release from the repository, then install it from **Plugins → Add New → Upload Plugin** in WordPress. The ZIP contains the plugin runtime and compiled assets; Node.js, package-manager files, source maps, tests, and development documentation are not required on the site.

## Development

This repository contains the plugin source and the generated `build/` assets. Use Node.js and pnpm 10.24.0 through Corepack:

```sh
corepack pnpm install --frozen-lockfile
npm test
npm run package:plugin
```

The install command applies the AOS source patch in `patches/`. Keep that patch and the lockfile together so clean installs reproduce the same AOS source. Do not edit generated files in `build/` by hand; rebuild them from `src/`.

See [Development](docs/development.md), [Testing](docs/testing.md), and [Safe deactivation](docs/safe-deactivation.md) for project contracts and workflows. The [animation skill](skills/animate-wordpress-blocks/SKILL.md) is an optional Codex reference for configuring existing pages; it is not required by the plugin.

## Production package

Run `npm run package:plugin` to build the assets and create `dist/animations-for-blocks-<version>.zip`. `npm run release` is an alias for the same workflow. The packager stages an explicit allowlist: the plugin entry point, `includes/`, compiled `build/`, the third-party AOS license, the plugin license, and WordPress's `readme.txt`. It checks required and excluded paths in the archive. `dist/` is ignored by Git.

## License

The plugin is distributed under GPL-2.0-or-later. Third-party notices are included in `licenses/`.
