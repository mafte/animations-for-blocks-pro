# Safe deactivation and legacy content

New block entrances and sequences store their configuration in native block metadata under `metadata.anfb`. The block's saved HTML remains ordinary markup; the plugin adds AOS attributes at render time. Text effects retain an inert `span.anfb-text[data-anfb]` representation.

When the plugin is inactive, new metadata and text spans remain in content, but the animation controls and runtime are unavailable. Reactivating the plugin restores their behavior. Do not downgrade to versions that predate the native metadata format: they cannot read these settings.

## Existing legacy pages

Older pages may use legacy animation attributes or the plugin's Animation Container block. They can require migration before safe deactivation. New controls use native metadata, but editing one block does not certify that the entire page has been migrated. Convert legacy containers to native Group blocks where appropriate; the old block remains readable for compatibility.

The migration command is explicit and per-page. Inspect the page first, use the returned content hash, simulate the exact migration, and save a private backup outside the public WordPress tree before applying:

```sh
wp --path=/path/to/wordpress --user=ID anfb inspect POST_ID --format=json
wp --path=/path/to/wordpress --user=ID anfb migrate POST_ID --content-hash=HASH --dry-run
wp --path=/path/to/wordpress --user=ID anfb migrate POST_ID --content-hash=HASH --backup=/private/path/before.json
```

Use the actual path, ID, and hash from the site. Do not guess block paths or hashes. A stale hash, unsupported content, edit lock, insufficient permission, or invalid setting must stop the write. Migration is idempotent and does not perform a whole-site rewrite.

Restore is restricted to the same site/page and exact post-migration content hash. It refuses to overwrite later edits. Preserve the backup and inspect the conflict rather than replacing content manually.

`pendingSources` identifies unresolved dynamic or referenced sources. `complete: false` is not a safe-deactivation certification. There is no automatic database rewrite on activation, update, deactivation, or uninstall.

## Verification

Test migration only on a disposable WordPress installation with `ANFB_TEST_SITE` enabled. See [testing.md](testing.md). On private copies, verify plugin active → inactive → edit/save → active, confirm blocks remain valid, and confirm metadata and text formats survive. Never use a customer or production site as a test fixture.
