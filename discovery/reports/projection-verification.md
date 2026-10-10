# Scoped projection and paired-export verification

Executed on 2026-10-10 in the Linux x86-64 workspace with Python 3.12.14.
This extends published interface commit `f55f0c43a9546db48f1b1d69ce6be54266269c8f`,
whose [four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38071085852).

- **325 Python tests pass**, with no failures, errors or skips. The suite ran
  in 69.197 seconds. Captured implementation/test/script/example bytes match
  before and after execution; the separately tested browser script was excluded
  from that snapshot. [Log](projection-release-tests.txt),
  [source-bound receipt](projection-test-receipt.json).
- The projection API has **27 focused tests**, including fifteen independently
  expressed tests. The [rerunnable independent audit](projection-independent-audit.json)
  executes 5,949 direct source-equation cases, 81 anchor cases and 5,913
  retention cases. These categories overlap and are not a distinct-world sum.
  The oracle evaluates the original equations directly, covering signed and
  rectangular normalization, scope separation, gain/tie/reversal, unknown and
  empirical-only bounds, conflicting anchors and immutable identities.
- **100 Lean statements** compile and pass the fresh axiom audit across seven
  modules. Twelve new statements prove substitution, truth transfer under
  explicit equalities, cancellation, signed transformation, discrepancy
  enclosure and anchor-row equivalence. Strict build: 985 jobs, no warnings;
  all eleven audit tests pass. Only standard logical axioms occur. All six
  historical source hashes are unchanged, and the 88-statement inventory and
  output are preserved in [formal history](../formal/history/README.md).
  See [executed formal record](../formal/VERIFICATION.md).
- **27 Chromium checks pass**, zero JavaScript errors. Paired Problem and
  Certificate downloads verify with the real CLI across all four schemas.
  A custom coupled input preserves whitespace and high-precision exact tokens.
  Pending responses, intervening edits and failed scalar/coupled rebuilds
  cannot restore or export stale pairs. Existing scientific report, unknown,
  failure and mobile checks also pass. [Receipt](browser-projection-onboarding-v1.json).
- An isolated noneditable wheel passes **22 packaged cases across four schemas**,
  installed HTTP/CLI agreement, scientific report serving, the new projection
  translation and no-model missing-bound fallback. Runtime dependencies remain
  empty. [Package receipt](package-projection-v1.json).
- The runnable [projected example](../examples/projected.py) passes four
  constructed controls: a verified difference upper bound of `-1/2`, an
  attained tie at `9/2`, no model for missing bounds, and all-retained unresolved
  consistency for contradictory anchors. [Executed example receipt](projection-example-v1.json).
  Its output is a Python-API report, not a workbench input schema.

The final adapter source SHA-256 is
`4a7eb4a48f281f888132c5bb235b10ec037c685f2ba8a192f976a00337e0de09`.
The published checkpoint is `0a8b248943fa1a65400214eebbe54377d8c3ff5e`.
Its 128-file inventory is preserved in
[runtime-manifest-projection-api.json](runtime-manifest-projection-api.json);
[runtime-manifest.json](runtime-manifest.json) follows subsequent work.
The preceding 124-file inventory remains in
[runtime-manifest-coupled-interface.json](runtime-manifest-coupled-interface.json).
[All four remote CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38071896576)
at that exact checkpoint: Python 3.11/3.12, browser, and Lean.

The adapter has no new JSON/browser mode yet. Its pure Python construction is
not a resource guard; the [proposed wrapper](../docs/projection-workbench-contract.md)
sets the next integration boundary. The coupled HTTP guard remains in place.

The [source-readiness audit](../docs/projection-data-readiness.md) inventories
pinned Rhizo metadata and source code without opening target JSON or running
fits. Incidental numeric reference examples in documentation are disclosed;
this is not a fully blinded or newly untouched scientific evaluation.

All guarantees remain conditional on the supplied representation, common-world,
coordinate/discrepancy and anchor premises. There is no Python-to-Lean
refinement proof or validation of physical field sharing. The completed pilots,
constrained screening/utility failures and training-model NO-GO are unchanged.
