# Spec: animation-persistence

Approved scope 2026-10-19.

## Objective and contracts
Plugin active: controls and motion. Plugin disabled: visible editable ordinary content. After editing/saving disabled and reactivating: retain settings on surviving blocks/formats. Deleted blocks or deliberately removed formats are not reconstructed.
Canonical storage: metadata.anfb = {version:1, entry?: existing entry options, sequence?:{enabled:boolean,interval:number}}. Merge unrelated metadata. New-format save HTML has no generated entry data-aos/data-anfb-distance attributes; render adds them. Preserve current inline anfb/text spans. Unknown storage versions remain untouched and do not animate. Legacy read fallback only when metadata.anfb absent. Legacy saved HTML remains valid while active; migration is explicit.
## Acceptance and tests
Native parse/serialize and RichText disabled editing must preserve metadata and inline spans on WP6.6 and current site. Exercise paragraphs/headings/Groups and GenerateBlocks Text/Element/Media, four text effects, links, bold, Unicode, nested sequences, Default, Inherit and page conditions. Preserve public clipboard settings and CLI version 1. New writes use one canonical store. Content remains visible with plugin absent, reduced motion, JS disabled and failed initialization.

## Shared contract
WordPress >=6.6, PHP >=8.1; existing WordPress/GenerateBlocks V2 adapters. No new dependencies or UI redesign. Preserve public hooks and version-1 CLI plans. Source: src/ (editor), includes/ and main PHP (server/CLI), tests/ (verification), docs/ (guides), build/ (generated distribution).

Commands from repository: `npm test`, `npm run build`, `php -l animations-for-blocks.php`; lint every changed PHP file. PHP uses existing procedural snake_case, tabs, validators and WP_HTML_Tag_Processor; JS/TS follows existing React components. Example: `foreach (entry_attribute_names() as $key) { $tags->remove_attribute($key); }`. New UI text is English and translated with animations-for-blocks.

Always validate, back up before writes, compare readback, and report unverified checks. Ask before extending to original content or adding dependencies. Never run whole-site migrations, overwrite intervening edits, change vendor files, weaken tests or silently convert unsupported blocks. Tests creating users/content require a disposable site; Akumbele tests use only private copies.

## Open product questions
None. Technical failures must be reported, not waived.
