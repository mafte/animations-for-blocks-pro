# Safe deactivation (1.5)

New entries and sequences live in the native block attribute `metadata.anfb`:

```json
{"version":1,"entry":{"animation":"fade","variation":"up"},"sequence":{"enabled":true,"interval":100}}
```

Omit entry/sequence when absent. Merge other metadata rather than replacing it. Native metadata is the canonical store; legacy aliases are for compatibility/runtime context only. Invalid or unknown records are preserved and do not execute. Editor controls refuse to overwrite them; migration rejects them. Do not downgrade to old plugin versions after writing the new format: they cannot read it.

Entry HTML remains ordinary block markup. Runtime render adds AOS attributes; previews decorate editor wrappers. Text formats intentionally retain their inert `span.anfb-text[data-anfb]` markup. With the plugin off there is no motion or animation UI; surviving settings/formats remain on save and reactivate later. Deleting a block or deliberately removing its format removes the corresponding configuration.

## Existing pages

The legacy save filter remains only for pages using legacy attributes, so installing the update does not invalidate them. They still need conversion before deactivation. New controls use metadata; editing one block does not certify that its whole page is migrated. A legacy Animation container cannot become editable without its plugin until converted to a native Group. The old block stays registered but is hidden from the inserter; new sequences use Group/Element plus the Sequence controls.

Migration preserves unrelated bytes, comments, inline formats and child order. Group conversion preserves the old class/anchor and explicitly uses zero block gap to avoid introducing WordPress flow spacing. Unsupported attributes/root structures abort conversion. Static local descendants may be migrated without changing their unsupported container; references, query templates, bindings and dynamic data are not traversed and are reported as pending sources.

From the correct WordPress environment, use an administrator or user able to edit the page:

```sh
wp --path=/wordpress --user=ID anfb inspect POST_ID --format=json
wp --path=/wordpress --user=ID anfb migrate POST_ID --content-hash=HASH --dry-run
wp --path=/wordpress --user=ID anfb migrate POST_ID --content-hash=HASH --backup=/private/path/before.json
wp --path=/wordpress --user=ID anfb restore POST_ID --file=/private/path/before.json --dry-run
wp --path=/wordpress --user=ID anfb restore POST_ID --file=/private/path/before.json
```

Use the current hash from inspect, never a guessed path/hash. Backups are exclusive private files outside the public WordPress tree. Dry run creates no backup. Conflicting legacy/native settings, unknown versions, stale hashes, edit locks and insufficient permissions prevent writes. Repeating a migration is a no-op. `pendingSources` lists unresolved sources; `complete:false` is not a safe-deactivation certification. An inert unsupported block without plugin settings is not a pending animation source.

Restore only works for the same site/page and exact post-migration hash. After intervening edits it refuses to overwrite them. There is no automatic database rewrite during activation, update, deactivation or uninstall. There is no whole-site migration command.

## Verification

Run `npm test`, `npm run build`, and PHP syntax checks. Read-only WordPress checks: `wp --user=ID eval-file tests/persistence.php`, `wp --user=ID eval-file tests/migration.php`, `wp --user=ID eval-file tests/content.php` with the candidate loaded. Existing integration fixtures requiring `ANFB_TEST_SITE` are only for disposable installations, not Akumbele.

On private page copies verify active → off → edit/save → on, native block validity, retained metadata, all text effects and Group sequences. Compare original-page hashes and restore the initial plugin state. Record browser limitations explicitly; an empty canvas is not a visual pass.
