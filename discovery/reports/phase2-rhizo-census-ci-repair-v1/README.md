# Repair the mandatory package-check expectation

At census checkpoint `2975d6d0b9111cc84adb82ccc673bc82339ab154`, both Python
CI jobs failed; browser and Lean passed. The [original completed CI receipt](original-ci/final.json)
is preserved. The ordinary job-log endpoint returned HTTP 403; no bypass was
attempted. Check annotations supplied only exit code 1, so raw remote traceback cause
is not asserted. The local full-suite reproduction supplies the concrete error.

The original Python 3.12 full suite ran **1860 tests with one failure**,
in 3060.422 process seconds, preserving all 339 runtime files.
`test_all_sixteen_flags_required_without_omission_extra_or_reorder` expected 16
checks after the census probe added the 17th. Its following last-two-flags
expectation was stale too. [Independent diagnosis](independent-diagnosis/README.md)
preserves a separate unchanged single-test failure and the bounded source search.
The [full execution receipt](original-full-suite/execution.json) and lossless
output preserve the complete first result; nothing is relabeled as passing.

The correction freezes the exact ordered 17-check list independently in the test.
All 17 individual omission cases, an invented extra flag and reversed order must
still reject. The verifier, package probe, application and scientific rules are
unchanged. The exact proposed test passed all 12 methods in isolation; the
[integrated focused suite](integrated-focused/execution.json) then passed
**109 methods**, including the previously omitted retention module. The runtime
manifest still has 339 files: one existing test changed, 338 files unchanged.
Fresh exact-commit full CI remains required after publication.

The prior [clean installed package and independent byte audit](../phase2-rhizo-census-verification-v1/README.md)
passed at 2975: 28 demonstrations, six schemas,17 mandatory checks; 5,442 source/Git
blobs, 339 runtime files and 117 wheel members. That success did not override the
failed full-suite gate. Its preparation-time CI-pending note remains historical;
this report records the later failure and repair. The existing 80-check browser
pass and scientific NOT_ADMITTED/UNKNOWN/NULL census scope are unchanged.

The [strict pure Li preparation](../phase2-li-complete-readiness-preparation-v1/README.md)
preserves 38 author/35 independent methods and the same 35 portable checks. It
does not execute a production reader. The [prospective complete-route decision](../phase2-li-complete-route-amendment-v1/README.md)
adds complete worksheet identities and default unresolved structural accounting,
while unsupported semantic premises force NO_GO. No actual Li operation was
performed here. Adapter implementation and independent tests remain separate.
The [source-only semantic binding table](../phase2-li-pre-c-semantic-bindings-v1/README.md)
finds no existing exact record-sheet, column, row-class or reference-key binding;
documentary vocabulary and notebook syntax cannot supply those missing premises.

Root owns exact remote/CI, fresh clean packaging and independent artifact
verification, followed by integration of the separately reviewed Li adapter.
G20 remains unresolved and G21 blocked. No new scientific fit, allocation,
threshold, DFT, deployment or schedule was introduced; original negatives remain.
