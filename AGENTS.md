# Animations for Blocks Pro

Before developing or extending the plugin, read [docs/development.md](docs/development.md). Preserve its data, interface, translation, and compatibility contracts; adding animations does not imply redesigning editor controls. Source UI strings must be English, translated through WordPress with the `animations-for-blocks` text domain.

For plugin development, edit `src/` and run `npm run build`; commit the generated `build/` assets as well. Keep WordPress 6.6 and PHP 8.1 compatibility and preserve existing blocks. Supported text adapters are listed in `includes/animation-schema.json`.

Read [docs/testing.md](docs/testing.md) before running checks. Tests that create WordPress content require a disposable site with `ANFB_TEST_SITE` enabled.
