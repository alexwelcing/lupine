# Projection workbench and custody-construction verification

Executed on 2026-10-10 in the Linux x86-64 workspace with Python 3.12.14.
This extends `0a8b248943fa1a65400214eebbe54377d8c3ff5e`, whose
[four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38071896576).
The previous 325-test/27-browser/22-case checkpoint remains recorded in
[projection-verification.md](projection-verification.md).

## Implemented boundary

The strict projection wrapper preserves complete physical contexts, field and
source scopes, normalization, observation maps, signed quantity conversions,
anchors, bound bases and original source identities. The outer receipt binds
those declarations and the deterministic coupled preparation. Verification
recomputes from the original input; separate replay fixes that decision before
reading outcomes and checks their original outer seals before internal rebinding.
Missing or empirical-only bounds produce no numerical model, preserve every
candidate, and leave numerical coverage/point diagnostics unavailable.

CLI selection/verification/replay and Linux-guarded HTTP share these semantics.
Declared and expanded dimensions are bounded before exact adapter construction;
the shared worker enforces CPU, wall, memory and output limits. Hard failures
return no decision receipt. The browser exposes the original relation and saves
its exact submitted problem with the full certificate and separate replay.

Review found two concrete defects and fixes: pretty formatting could make an
otherwise valid certificate exceed the verification cap; coupled/projection
CLI and browser exports now use compact JSON. Outcome-file reads could leave
an old replay exportable or apply older reads last; immediate invalidation and
request tokens now bind the replay to the current completed upload. Actual
large-receipt and controlled failed/reordered-read regressions cover both fixes.

## Independent and release checks

The [source-bound independent audit](projection-wire-independent-audit.json)
passes 19 tests, including 144 synthetic partial-truth patterns, actual guarded
select/replay/verify, the shared worker slot and a 64-candidate CLI export/verify
round trip. It checks metadata-only identity changes, unavailable-model states,
pre-loader sealing, ties, profile rejection and a false common-world control
that loses a true optimum despite complete marginal coverage. These are finite
engineering checks; no scientific targets or fitted models are involved.

Final release checks completed:

- **416 Python tests pass**, with no failures, errors or skips, in 117.268 seconds.
  Runtime/test/script/example source hashes match before and after the run.
  [Full log](projection-workbench-release-tests.txt) and
  [execution receipt](projection-workbench-test-receipt.json).
- **35 Chromium checks pass**, zero JavaScript errors, including all prior 27.
  All five modes export input/certificate pairs verified by the actual CLI.
  A 1,761,884-byte projection receipt verifies after download; no-model,
  metadata, partial-truth, false-common-world, failed/reordered upload and
  mobile states pass. [Report](browser-projection-workbench-v1.json),
  [stable source receipt](browser-projection-workbench-source-v1.json).
  The first attempt stopped on a test-harness cleanup expression after the
  new upload assertions. Its [failure record](browser-projection-workbench-first-failure.txt)
  is preserved; the corrected complete rerun supplies the passing evidence.
- A **fresh isolated noneditable wheel passes 25 cases across five schemas**,
  installed guarded HTTP/CLI agreement, all original scientific reports and
  projection translation/no-model probes. Runtime dependencies remain empty.
  [Package receipt](package-projection-workbench-v1.json). The original
  13-case known-answer suite remains unchanged. The three new projection
  demonstrations are constructed algebra, not new scientific benchmarks.
- [Additional interface review](projection-interface-review.md) records exact
  300-bit rational and Unicode/astral metadata round trips through Node JSON
  and the real guarded verifier. The root also inspected the desktop projection
  display; mobile no-overflow and failure prominence were checked by the UI owner.

An earlier integration wheel passed before the final upload fix; its temporary
receipt stays ignored and is not the release package evidence.

No formal or mathematical-kernel source changed in this increment. The
previously executed 100-statement build/axiom audit remains the local formal
evidence; CI must verify the published extension separately. No runtime-to-Lean
refinement is claimed.

## Custody construction frozen before acquisition

The [engineering receipt](projection-custody-engineering-v1.json) and
[31-test log](projection-custody-engineering-tests.txt) bind the custody producer,
17 producer tests, 14 independent tests and its documentation. Before/after
source hashes agree; both reviews found no remaining blocker. The receipt's
original local log path is retained; the linked copy has its recorded SHA-256.
These tests use synthetic 110-file archives, not the real mixed target JSON.

Resolved review findings include opaque supplied-hash leakage, UNKNOWN versus
CONFLICT classification, nested-container/schema bypasses and public-write
revalidation. All 36 expected units remain represented. Whole-blob integrity,
reference ambiguity, checkpoint non-promotion, target-value noninterference and
sanitized errors are tested. At this construction checkpoint no real target-
bearing JSON has been acquired or decoded. After this source is committed and
pushed, the next action is the fixed acquisition/extraction followed by a
separate dated metadata receipt. The tool does not define an evaluation protocol.

## Scientific meaning

The projection examples are synthetic algebra. Source hashes establish identity;
compiled statements establish their stated conditional mathematics. Neither
establishes physical field validity, hard discrepancy bounds, checkpoint identity,
common-world truth or recommendation superiority. All original pilot failures,
constrained screening/utility failures and training-only model NO-GO remain
unchanged. Research-preview eligibility and scientific recommendation claims
continue to be judged separately in the release matrix.
