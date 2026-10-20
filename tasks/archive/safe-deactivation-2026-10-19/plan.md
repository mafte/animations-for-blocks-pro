# Implementation plan: safe deactivation

User approved specs and execution, 2026-10-19.

1. Characterize native metadata/unknown RichText persistence first. Stop if framework cannot preserve content.
2. Add canonical metadata accessors and server normalization; retain legacy behavior. Verify unit/PHP checks.
3. Route editor writes/readers and CLI transforms through accessors, preserve render/preview parity.
4. Add native Group conversion and controlled per-page migration using existing backup/hash/write safeguards.
5. Extend regression coverage, compile distribution and document migration.
6. Install candidate only for localized copy tests; restore environment and verify originals unchanged.

Risks: legacy validity (keep old save path until explicit conversion); unregistered text formats (native regression); Group layout changes (no added flow layout + compare); external sources (report, do not migrate refs); local CLI PHP mismatch (explicit Local PHP runtime, no configuration edits).

Tasks tracked in tasks/todo.md.
