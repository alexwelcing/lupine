# Exact finite-population planning workbench

Prepared 2026-10-16, root integration. This independently reviewed extension is
tested in isolated source overlays. Publication and exact-commit CI remain
separate later gates; this report does not infer their completion.

The new `finite_planning.py` API, `plan-finite-zero-loss` command and guarded
`/api/plan-finite-zero-loss` route calculate exact prospective zero-failure
resolution for uniform sampling without replacement from a complete, frozen
residual panel population. A third Study planning form displays the same Python
object and exports the exact HTTP JSON. Existing IID planning remains separate.
No new archive, model, loss endpoint, protocol, allocation or scientific criterion
is selected, and no observed outcome is used by these calculations.

For population size M and null failure fraction at least rho, the smallest null
failure count is `K_min = ceil(rho*M)`. At fixed evaluation count e, the exact
zero-failure null supremum is `C(M-K_min,e)/C(M,e)`, with numerator zero when
the event is impossible. The planner returns the first positive count meeting
the declared significance within the cap, exact bounds, the discretized null
count/fraction and explicit unestablished scientific status. Its domain is
M=1..256, cap=0..M and bounded exact rational probabilities. It reads no outcomes.

Probability is over the evaluation draw conditional on the frozen frame and
policy. It does not additionally condition on the realized draw/transcript.
Scientific labels need not be IID, but the finite design and complete fixed
endpoints must be justified. This supplies no future-material risk, observed
coverage, power or physical qualification. The [general design note](../phase2-finite-archive-design-v1/README.md)
derives the mathematics and counterexamples; [API documentation](../../docs/finite-population-planning.md)
and the [workbench/transport guide](../../docs/study-planning.md) state the contract.
Written proofs are not new Lean compilations or Python refinement proofs.

## Executed checks

| Evidence | Actual result and scope |
| --- | --- |
| Author finite API | 13 tests pass, enumerating all binary label worlds and all distinct subsets for M=1..7. Four deliberate arithmetic mutations each fail the intended control; all original failures remain in the [author bundle](../phase2-finite-planner-author-v1/README.md). |
| Independent finite API | Nine test groups pass. A sequential-draw probability recurrence, separate from the author's subset oracle and runtime combination formula, checks 3,663 null/risk/significance/cap cases against 284 distributions. Exact ceilings, equality, census, M=1, cap zero, IID substitution and resource/claim states are challenged. [Independent review](../phase2-finite-planner-review-v1/review.json). |
| First combined overlay | 67 planning/transport tests and 49 package tests pass with 310 unchanged runtime files. The retained suite runs 23 tests and fails one stale expected check count: it still required 15 after the deliberate sixteenth installed check was added. The original traceback remains in `combined-v1/2/`. No installed-package run followed that failure. |
| Repaired combined overlay | 76 planning/transport tests, 49 package tests and all 23 retained tests pass with 311 unchanged runtime files. The only source delta from the first overlay is the two explicit test expectation/name updates and the added independent API test. No product behavior changed for the repair. |
| Isolated installed package | The repaired overlay passes 28 demonstrations, six candidate schemas and 16 required installed checks, including exact finite CLI/HTTP agreement. This is an isolated noneditable wheel run from an uncommitted overlay, not clean Git retention or final-source CI. |
| Maintained full browser suite | 73 checks pass: all previous 65 in original order plus eight new finite-planning groups; zero JavaScript errors; all 310 original overlay runtime files unchanged. Actual duration 144.080 seconds. Exact export, discrete null/equality, zero cap/census, invalid input, races, 13 forged-response controls, keyboard and 320/390px layouts are exercised. |
| Independent browser/source review | Eight focused groups pass in 14.285 seconds with 311 unchanged repaired-overlay files and no JavaScript errors. Backend outcome/archive helpers are forbidden; only planning routes are recorded. A browser-only mutation removing the two stale-response guards fails at the intended assertion after the completion barrier. [Review](independent-interface/review.json). |

The independent source review verifies all 63 prior installed-probe assertions
are unchanged; nine additional assertions bring the total to 72. The producer
and retained verifier require the same ordered 16 checks; both fixed probe pins
are explicitly updated to
`a990a5aa825b1ed55caeb2551b86dae3efc4f0e258e95afc696b95f4919415a6`.
The previous omission/extra/reorder rejection loops are preserved. Static browser
review likewise preserves all 167 prior assertion ASTs and the original planning
helper. No check is removed or replaced with a skip.

The first overlay setup used a repository-root pathspec from the discovery
subdirectory and failed before any test; the dependent recorder then found no
overlay. Correcting the command working directory created the intended source
copy. Both setup failures are recorded separately from the executed test runs.
All source hashes and actual timings are retained, with no unexecuted pass claim.

## Interface and publication scope

The third form preserves the existing per-form revision guards and invalidates
results/exports after edits or errors. It checks the finite schema and closed
claim fields, including `frozen_residual_finite_population_only`, uniform
without-replacement sampling, unknown future risk and no observed evidence.
JavaScript performs no probability/rank/sample-size arithmetic. Request bodies
remain bounded to 4096 bytes and reject duplicate/extra fields, floats, invalid
counts, exponent notation, unsupported origins and any outcome/source input.

Root inspected the readable default desktop and 320px screenshots; fields and
exact outputs remain contained. The first mobile element capture included an
offscreen fixed skip-link artifact; the actual unfocused element was above the
viewport. Both original and corrected captures are preserved. The independent
reviewer's screenshots and geometry checks found no clipping or page overflow.

All demonstrations and negative controls are hypothetical. The 25-panel answer
for M=100/rho=1/10/eta=1/20 and the existing IID answer of 29 have different
inferential scopes; this is not scientific superiority or an observed reduction
in measurement cost. All historical physical/general-superiority NO-GO results
remain unchanged. Root owns exact promotion, remote/CI verification and a clean
retained package after the separate source diagnostic checkpoint completes.

Independent final claim review found no blocker. It checked 16 execution records
and their log hashes, the source-only overlay delta, published probe/browser
assertion preservation, exact finite and IID example arithmetic and the scope of
the written derivation. This was an audit of existing evidence, not an additional
test run. See [the source-bound review](claim-review/review.json).

Root promoted the exact reviewed finite and compatible candidates after the
completed f7 flag diagnosis. The combined tracked source passes all109Li custody,
header, flag-family and compatible-envelope tests (1.373seconds unittest;
1.737seconds process), with all317runtimefiles unchanged. This is actual local
uncommitted-source evidence. Final-source CI and clean retained artifacts remain
separate pending publication gates; no compatible-envelope production run occurred.

Six evidence files contain intentional trailing whitespace: five browser revision
fixtures and the independent compatible-reader fixture-correction patch. Their
original bytes remain in the development cache and are published as lossless
UTF-8 text wrappers to preserve both exact evidence and whole-tree whitespace
checks. [The artifact map](lossless-artifact-map.json) resolves the original
receipt paths to wrappers; encoding each wrapper's `text` field as UTF-8 exactly
reconstructs the bound original bytes. All six round trips were verified. No
runtime source, test assertion, scientific result or check configuration changed.
