# Tasks

- [x] Archive untracked experiments/plans; preserve automated tests.
- [x] Record approved capability map/specs and implementation sequence.
- [x] Native disabled-persistence characterization: real serializers/RichText keep metadata/spans; focused Jest.
- [x] Server persistence: versioned metadata, fallback, normalization, unchanged render behavior; focused PHP.
- [x] Editor persistence: controls, clipboard, previews and sequences store metadata; Jest/build.
- [x] Native containers: hide legacy inserter, provide Group conversion with preserved children/styles; native validation.
- [x] Migration CLI: dry-run/hash/backup/conflicts/idempotence/restore; PHP + CLI integration.
- [x] Distribution/docs: npm test + build, PHP lint, migration documentation, review.
- [x] Localized acceptance: duplicate 297; active/off/edit/on; screenshots; restore plugin state and verify source hashes.

## Explicit verification limits

- WordPress 7.1.3 / Local PHP 8.4 was tested; a separate WordPress 6.6 installation was not available. No claim of a new 6.6 runtime test.
- TypeScript was checked using the installed transitive compiler; pre-existing declaration/type issues remain and are compared against the original baseline.
- Existing disposable-site browser/CLI fixtures were not run against Akumbele. Localized copies covered migration guards, actual native-editor disabled editing, native serializers and reactivation.
