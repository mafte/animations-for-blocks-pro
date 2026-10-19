# Spec: native-containers

Approved scope 2026-10-19.

## Objective and contracts
New containers use native core/group. Keep old anfb/animation-container registered/readable but hide from inserter. Native conversion retains children/order, anchors, custom classes, block names and animation metadata, including nested groups; add no visual width/gap constraints. Unsupported conversion aborts page write.
## Acceptance and tests
Native serialize/parse validates converted Groups with plugin absent. Reactivation restores ordered and nested sequences. Before/after DOM and layout comparisons verify no introduced gap/width changes.

## Shared contract
WordPress >=6.6, PHP >=8.1; existing WordPress/GenerateBlocks V2 adapters. No new dependencies or UI redesign. Preserve public hooks and version-1 CLI plans. Source: src/ (editor), includes/ and main PHP (server/CLI), tests/ (verification), docs/ (guides), build/ (generated distribution).

Commands from repository: `npm test`, `npm run build`, `php -l animations-for-blocks.php`; lint every changed PHP file. PHP uses existing procedural snake_case, tabs, validators and WP_HTML_Tag_Processor; JS/TS follows existing React components. Example: `foreach (entry_attribute_names() as $key) { $tags->remove_attribute($key); }`. New UI text is English and translated with animations-for-blocks.

Always validate, back up before writes, compare readback, and report unverified checks. Ask before extending to original content or adding dependencies. Never run whole-site migrations, overwrite intervening edits, change vendor files, weaken tests or silently convert unsupported blocks. Tests creating users/content require a disposable site; Akumbele tests use only private copies.

## Open product questions
None. Technical failures must be reported, not waived.
