# Actual public-resource integration: source-only preflight

Conclusion: no unconditional “actual resource must be absent” assertion was found in the server, full Python test paths, standard browser controls, installed-package probe or retained-artifact auditor. Both a valid complete original and an authenticated `NO_GO_INSUFFICIENT_DEVELOPMENT` original are supported by the existing display and prepared supplemental verifier. This is source inspection, not a test execution or a guarantee that future actual bytes will pass.

## Present and absent behavior

| Component | Relevant source | Finding |
| --- | --- | --- |
| Server / wheel inclusion | `server.py:79–81`; `pyproject.toml:24` | The optional resource is included by existing JSON package-data patterns and returned as `mpea_archived` when present. Absence omits the field. No case-catalog change is needed. |
| UI | `web/mpea.js:124–136`, `147–167` | Accepts registered originals under unchanged scientific protocol `mpea-t25-archival-v1`. Complete reports show their actual declared verdict; unavailable reports accept BLOCKED/INCOMPLETE/NO_GO_INSUFFICIENT_DEVELOPMENT with null overall verdict, stopping reasons and no performance gates/populations. The v2 registration generation does not change the protocol ID or filename. |
| Standard browser suite | `browser_smoke.py:994–998`; `mpea_browser_checks.py:20–24`, `122–124` | The helper deliberately renders None for a synthetic absence control, exercises fixtures, then restores the actual API object. A present report does not violate the synthetic absence assertion. |
| HTTP unit tests | `tests/test_server.py:116–133` | Present and absent tests substitute their own fixture/missing path through a resource mock. They do not assert the production resource is absent. The general endpoint test at lines108–114 permits the extra field. |
| Installed wheel probe | `package_smoke.py:125–144` | Branches on installed presence; present objects must exactly equal the HTTP object, preserving JSON types/values. It reports `present_exactly_served`; no scientific PASS is required. Missing resources must not be invented. |
| Retained wheel auditor | `verify_retained_artifacts.py:103–111`, `172–195` | Accepts absent or present transport metadata, verifies agreement with actual wheel members, validates JSON object shape and records raw resource SHA. It explicitly does not validate scientific semantics or reexecute HTTP. |
| Transport tests | `test_package_mpea_interface.py:114–131`; `test_retained_mpea_transport.py:104–121` | Present unavailable and negative objects are explicitly supported. Absence expectations in other tests belong to temporary fixtures. No real-resource assumption is changed by adding the later artifact. |

## Required postterminal bookkeeping

Adding `src/lupine_discovery/resources/mpea-t25-v1.json` necessarily changes the runtime source set. The existing manifest walk includes all JSON files under that package (`runtime_manifest.py:11–25`), and its check rejects a new file absent from the recorded set (`:43–49`). Therefore **refresh `reports/runtime-manifest.json` for the later resource checkpoint** after preserving/copying the authenticated original bytes. This is an expected new artifact/source identity, not a defect or permission to relax a check. If using `--staged`, stage the resource before capturing that staged manifest; otherwise staged and working sets will differ.

The retained package path requires a committed clean tree and matching manifest (`package_smoke.py:247–258`); the independent auditor requires exact archive/manifest coverage (`verify_retained_artifacts.py:262–278`). Preserve the existing a062 artifacts/registration and obtain the new applicable clean package/source/CI evidence after integration. Do not rewrite old receipts or claim their absent-resource package checked the new bytes. The current 343-file freeze remains untouched by this preflight.

No runtime/test-source edit is required merely to permit present complete or insufficient-development states. The later exact resource, refreshed manifest, resulting commit and fresh evidence are the concrete required changes.

## Actual-report browser evidence

The ordinary browser receipt hashes Python, web assets, decision-pool resources and synthetic MPEA fixtures (`browser_smoke.py:29–36`), **not the optional actual MPEA resource**. It restores actual content but does not assert its data. A standard browser PASS alone therefore does not validate actual-report integration.

The already prepared scratch `verify_actual_public_browser.py` covers that separate claim. Its input boundary requires the exact packaged filename and reviewed original raw SHA (`:298–318`); it uses the actual server/API, not renderer-injected controls. `validate_public_shape` accepts COMPLETE and unavailable statuses including `NO_GO_INSUFFICIENT_DEVELOPMENT` (`:123–161`); only the complete branch demands both populations, 24 policies, seven caps and full accounting. The unavailable branch checks null performance fields and no rendered performance tables. It checks exact export/object equality, original labels/reasons, source/public identity, desktop/mobile screenshots and page errors. Existing protocol ID, execution kind `registered_original` and filename remain correct for a v2-registered original because v2 changes registration generation, not the scientific protocol.

Keep the supplemental run separate and source-bound, using the reviewed original public digest. It performs transport/presentation checks, not independent authentication of scientific custody; the earlier review supplies that authority. There is no need to change ordinary browser source solely to duplicate those supplemental checks. If the actual scientific report claim is later assigned to the ordinary suite instead, its missing resource binding and actual-state assertions would need a separate reviewed increment.

No actual resource was added, inspected or fabricated. No study inputs, private outputs, archive, allocation or targets were opened. No tests/browser/package/study ran. The note and source-hash receipt are ignored scratch only. A second source-only reviewer independently checked the two browser paths; it found no presence blocker and confirmed the ordinary-browser evidence limitation.
