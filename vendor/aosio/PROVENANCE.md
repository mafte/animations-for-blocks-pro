# AOSIO source provenance

- Source archive supplied by the user: `aosio-main.zip` (SHA-256 `69663987e5dec69902011b6ecdda3be8663feb602889f7b3214e6f1575f9bf7d`).
- Source corresponds to upstream `jaredchesebro/aosio` commit `40ed891c66107656a586e35b900cd2b23ff11598`.
- Copied `src/js/` and `src/sass/` for this private compatibility evaluation. One local compatibility patch in `src/js/aosio-core.js` clears the cached viewport height before `refreshHard()` so dynamically inserted elements are observed even when the window height is unchanged. The unmodified upstream behavior fails the plugin's dynamic insertion smoke.
- The archive contains no license or copyright permission statement. The user authorized use of the archive for this local branch evaluation. This provenance note does not grant rights for publishing or redistributing the plugin or these files.
