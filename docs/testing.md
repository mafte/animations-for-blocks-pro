# Testing

## Local checks

Use the pinned pnpm version and run the build from the repository root:

```sh
corepack pnpm install --frozen-lockfile
npm test
npm run build
php -l animations-for-blocks.php
```

`npm test` runs the runtime and initialization checks plus the unit/contract suite. Run `npm run test:unit` for only the unit suite or `npm run test:browser` when Chromium and Playwright are available. Generated `build/` files are part of the plugin and must be included with source changes.

## WordPress integration checks

Tests that write WordPress content must run only on a disposable WordPress installation with `ANFB_TEST_SITE` explicitly enabled in that site's `wp-config.php`. Do not run them on production, client, or personal sites. Use a site with a compatible GenerateBlocks V2 version for adapter coverage.

Example commands (replace paths and IDs with the disposable site's values):

```sh
wp --path=/path/to/disposable-wordpress --user=1 eval-file tests/content.php
wp --path=/path/to/disposable-wordpress --user=1 eval-file tests/migration.php
ANFB_WP_PATH=/path/to/disposable-wordpress ANFB_WP_CLI=wp ANFB_TEST_USER=1 python3 tests/cli.py
```

The CLI and browser fixtures create and remove test content. Keep backups private, confirm the site's initial plugin state, and remove fixtures after checks. Asset scenarios that rely on per-request PHP state must run in separate WP-CLI processes.

## Browser and release review

When browser automation is available, verify editor preview, save/reopen behavior, frontend animation, mobile layout, keyboard operation, reduced motion, and visible content with JavaScript disabled or initialization failed. Record which browser/version was used; a Chromium pass does not establish Safari or Firefox compatibility.

Before packaging, run `npm run package:plugin` and inspect the ZIP entries. The package must include the PHP entry point, `includes/`, generated `build/`, plugin and AOS license notices, and `readme.txt`. It must not contain development sources, tests, docs, package-manager files, or local environment artifacts.
