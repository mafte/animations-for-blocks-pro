# Safe deactivation capability map

Approved 2026-10-19.

| Module | Responsibility | Depends on |
|---|---|---|
| animation-persistence | Native metadata, inert saved HTML, disabled editing and reactivation | — |
| native-containers | Native Group creation and legacy container conversion | animation-persistence |
| legacy-migration | Explicit atomic per-page migration, backup and restoration | Both |

Build order: animation-persistence → native-containers → legacy-migration.
