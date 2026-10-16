# Finite-population planner author execution

This report records the separate prospective finite-frame module, author
tests, and four deliberately broken variants. It contains no archive target,
realized allocation, model fit, scientific result, new Lean compilation, or
claim of Python refinement. Existing IID planning behavior is preserved.

The ordinary candidate execution on 2026-10-16 at 06:48:32 UTC passed all
**13 author tests**: unittest duration 0.109 s, process duration 0.772485 s.
The source was held throughout that command. The baseline tracked package,
clean worktree, and HEAD `ea69d01e144747c97bf288b37249f39af9e8f715` remained
unchanged during all five commands. No ordinary author-test failure occurred.

The independent counting oracle in the author suite enumerates every labelled
binary population and every distinct sample subset for populations of sizes
one through seven. It computes each world's zero-failure probability by
counting subsets, then maximizes across the worlds satisfying the exact null.
It does not call the implementation's combination formula. Other tests cover
ceilings and grid jumps, equality, impossible events and census, singleton and
zero cap, exact minimum persistence, input bounds, frozen claims, and exact
JSON serialization. These tests assess arithmetic and API behavior under the
declared finite design; they do not attest an actual sampling design.

All four intentional mutations failed their selected tests, as required:

| Mutant | Changed behavior | Actual selected test outcome |
| --- | --- | --- |
| `mutant-floor` | Replaced `ceil(rho*M)` with floor | FAIL: `(1,2,2)` differed from expected `(2,2,3)` around the null grid boundary |
| `mutant-strict` | Replaced qualifying `<= eta` with `< eta` | FAIL: equality ceased to qualify |
| `mutant-iid` | Replaced the finite subset bound with `(1-rho)**e` | FAIL: returned `1/4` instead of the hand-counted `1/6` |
| `mutant-last-minimum` | Overwrote the first qualifying count with later counts | FAIL: returned four instead of the minimum one |

The failed mutant logs are intentional negative controls and are preserved
unchanged. They are not four additional passing product tests or scientific
failures. The unmodified module remains the sole implementation candidate.

Each execution directory contains actual command/timing/status receipts,
stdout/stderr, a manifest of every isolated runtime source file, the exact
module used for that run, and the unchanged author test. `run_tests.py` is the
actual recorder. It copied the tracked source package into an ignored isolated
overlay, added the candidate module, executed the named unittest command with
that overlay on `PYTHONPATH`, and verified source identities afterwards.
`copy-inventory.json` records byte-identical evidence copies; hashes attest
identity, not scientific validity or mathematical correctness.

The new function is `plan_finite_zero_failure_resolution(population_panels,
loss_ceiling, significance, maximum_evaluation_panels)`. The exact tail is a
null supremum over a fixed complete residual frame with uniform selection of
distinct IDs. Conditioning fixes policy, calibration, and frame while leaving
the evaluation draw random; it does not condition on the realized full
allocation transcript. The module does not attest IID panels or future risk.

This author report does not claim completion of independent review, combined
CLI/server/browser checks, installed-wheel checks, or CI. Those belong to the
separate actual review and integration records.
