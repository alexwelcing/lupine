# Coupled interface verification

Executed on 2026-10-10 in the Linux x86-64 workspace with Python 3.12.14.
This extends the published `b37d8db` [kernel/training checkpoint](coupled-training-verification.md).

- **298 Python tests pass**, no failures/errors/skips, in 58.199 seconds.
  [Complete log](coupled-interface-release-tests.txt) and
  [source-bound receipt](coupled-interface-test-receipt.json). All captured
  Python implementation/test/script hashes match before and after; the browser
  smoke script was explicitly excluded while its new checks were being added.
- The first combined run had one test-fixture failure. The CLI's bounded reader
  uses binary `Path.open`, while the old outcome-replacement regression mocked
  `Path.read_text`. Updating that fixture to a binary stream preserved its
  single-open and outcome-digest assertions. All eight focused adversarial
  integration tests then passed before the complete rerun. The
  [first log](coupled-interface-first-tests.txt) and
  [first receipt](coupled-interface-first-test-receipt.json) remain preserved.
- **24 Chromium checks pass**, with zero JavaScript errors. They exercise all
  four modes, three coupled demonstrations, exact export/reverification,
  full marginal coverage with a lost optimum under a false common relation,
  partial-truth uncertainty, raw input preservation, stale-result clearing
  after a synthetic hard worker failure, recovery, and mobile behavior.
  They also check all model/property rows, gates, cost, provenance and exact
  export for the training-only NO-GO report, and a missing-report state.
  [Browser receipt](browser-coupled-interface-v1.json).
- An isolated noneditable wheel passes **22 cases across four problem schemas**,
  selection/verification/replay, installed HTTP/CLI agreement, guarded coupled
  custom replay for all three coupled fixtures, and the original/constrained/
  training reports. [Package receipt](package-coupled-interface-v1.json).
  The runtime still has no third-party package dependencies.
- Independent wire/worker review contributes eleven tests, including 144
  partial-truth patterns and proof-phase permutations. Review found and fixed
  missing supplied-proof indices, cleanup of a descendant after its leader
  exited, malformed transport/seal acceptance, and stale UI results after a
  failed repeated build. Each corrected behavior has executed coverage.
- The training dashboard projector passes fourteen corruption/consistency tests.
  It pins the three published receipt hashes and scientific digest, rejecting
  even an internally resealed replacement of the historical NO-GO result.
  [Exact dashboard](training-tail-v1.json) matches the bundled resource byte for
  byte. No original labels or fitting are needed to construct the dashboard.
- Both hand-constructed correction-field examples pass real CLI verification
  and replay. A discrepancy radius of `1/4` permits the exact improvement bound
  `-1/2`; radius `1/2` preserves an attained tie at `9/2`.

The formal source is unchanged from the compiled and audited **88 statements**
at `b37d8db`; [all four remote jobs passed there](https://github.com/alexwelcing/lupine/actions/runs/38069767606).
The current interface adds no formal runtime-refinement or physical-validity
claim. All four jobs also passed at the published interface checkpoint
[`f55f0c4`](https://github.com/alexwelcing/lupine/actions/runs/38071085852):
Python 3.11/3.12 with manifest/package checks, Chromium and all 88 theorem audits.

The original three pilot failures, constrained screening/utility failures, and
training-model NO-GO remain unchanged and visible. The shared-model route
requires a common actual world; exact model consistency or marginal coverage
does not establish that premise. All guarantees remain relative to the supplied
finite candidate universe. Research-preview readiness is separate from a
scientifically validated material recommendation.

The published interface checkpoint is `f55f0c43a9546db48f1b1d69ce6be54266269c8f`.
Its 124 source-file identities are preserved in
[runtime-manifest-coupled-interface.json](runtime-manifest-coupled-interface.json);
[runtime-manifest.json](runtime-manifest.json) follows subsequent work.
The preceding 105-file inventory is preserved in
[runtime-manifest-coupled-kernel.json](runtime-manifest-coupled-kernel.json).
