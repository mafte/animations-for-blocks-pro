# Spec: legacy-migration

Approved scope 2026-10-19.

## Objective and interfaces
New command: wp --path=/wordpress --user=ID anfb migrate POST_ID --content-hash=HASH --dry-run; apply replaces --dry-run with --backup=/private/path.json. Existing restore command retains site/post/hash protection. No automatic site-wide or deactivation migration.
Move old entry/sequence data to metadata, remove only enumerated plugin root attributes, convert old containers. Reject contradictory old/new configuration, unknown versions, unsupported conversion, stale hashes, insufficient permission and concurrent edits without updating page. Referenced/dynamic/bound sources are reported and not modified; no complete-safety claim when pending sources remain. Preserve unrelated source bytes where possible. Atomic per-page write, private exclusive backup, exact readback, idempotence.
## Acceptance and tests
Dry run creates no backup/writes; second migration no-op; permissions/stale hash/conflicts rejected; restore exact original; restore after intervening edits rejected. On Akumbele duplicate Nosotros 297 twice (current and legacy backup), keep private; add missing fixtures only on copies. Test active→disabled→edit/save→active, screenshots and errors, desktop/mobile. Prefer session-only loading; brief real activation authorized if needed; restore original plugin state and preserve original-page hashes. Empty IAB canvas is not a passed visual check.

## Shared contract
WordPress >=6.6, PHP >=8.1; existing WordPress/GenerateBlocks V2 adapters. No new dependencies or UI redesign. Preserve public hooks and version-1 CLI plans. Source: src/ (editor), includes/ and main PHP (server/CLI), tests/ (verification), docs/ (guides), build/ (generated distribution).

Commands from repository: `npm test`, `npm run build`, `php -l animations-for-blocks.php`; lint every changed PHP file. PHP uses existing procedural snake_case, tabs, validators and WP_HTML_Tag_Processor; JS/TS follows existing React components. Example: `foreach (entry_attribute_names() as $key) { $tags->remove_attribute($key); }`. New UI text is English and translated with animations-for-blocks.

Always validate, back up before writes, compare readback, and report unverified checks. Ask before extending to original content or adding dependencies. Never run whole-site migrations, overwrite intervening edits, change vendor files, weaken tests or silently convert unsupported blocks. Tests creating users/content require a disposable site; Akumbele tests use only private copies.

## Open product questions
None. Technical failures must be reported, not waived.
