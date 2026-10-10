# Claims and their evidence

This ledger separates mathematical implications, software execution, archived observations, and open scientific premises. A stronger claim requires stronger evidence than the row beneath it supplies.

The [generated formal inventory](../formal/theorem-inventory.json) records 69
compiled statements: 18 scalar-selector, 15 Pareto, 9 nonlinear interval/domain,
15 conditional finite-risk/rank, and 12 interval-box sharpness theorems. The [formal verification record](../formal/VERIFICATION.md)
documents actual compilation and axiom auditing. The
[engine extension verification record](../reports/engine-extension-verification.md)
records execution evidence for the new runtime and interface routes. These are
conditional mathematical and software results. Finite-risk composition has an
explicit finite weighted probability instance; exchangeability, conformal
marginal coverage, Python refinement and physical predictor validity remain
unproved.

| Claim | Evidence | Status and limit |
|---|---|---|
| Sound intervals give a feasibility sandwich | `formal/LupineDiscovery.lean`: `certified_feasible`, `feasible_possible` | Conditional theorem; build evidence in `formal/VERIFICATION.md` |
| Every feasible minimizer is retained | `minimizer_retained` | Assumes sound intervals and a certified incumbent; all candidates without one remain governed by F+ |
| Pruning has a better feasible witness | `pruned_has_better_feasible` | Strict score separation required |
| Incumbent regret is bounded | `regret_bound`, mathematical specification | Formal statement takes an explicit lower-envelope bound; finite minimum instantiation is explained in the specification |
| Compatible refinement shrinks the pool | `best_upper_retained_shrinks` | Same candidate type/scope and a refined best-upper witness |
| The scalar pool is the smallest universally safe pool under interval-only information | [Sharpness specification](sharpness.md), [LupineSharpness.lean](../formal/LupineSharpness.lean), [constructive tests](../tests/test_sharpness.py) | Every retained candidate can be a tied feasible optimum in a compatible Cartesian interval world. No claim that every such world is physically attainable; valid coupling or tighter evidence can change the admissible worlds |
| Valid individual failure budgets compose into a finite joint bound | [LupineRisk.lean](../formal/LupineRisk.lean), [formal verification](../formal/VERIFICATION.md) | Explicit normalized monotone subadditive risk law, with a finite weighted probability instance. Individual event-risk bounds and deterministic implication are premises; no stochastic independence is needed for the union bound |
| Calibration finite-rank resolution and minimum count are exact | `finite_rank_iff`, `finite_rank_iff_minimum_count`, `insufficient_resolution_rank` in [LupineRisk.lean](../formal/LupineRisk.lean) | Rational ceiling arithmetic; unavailable rank is n+1. This does not prove that empirical residual ranks have the assumed marginal coverage |
| Runtime implements the finite equations | `tests/test_core.py`, `tests/test_envelope.py` | Exhaustive bounded worlds and randomized refinement tests; no full formal refinement proof |
| Calibration planner computes exact ranks and explicit unbounded outcomes | [Planner tests](../tests/test_calibration.py), [initial verification](../reports/calibration-verification.md) | Conditional arithmetic only; all candidate/target events are budgeted; sampling premises remain unverified |
| Calibrated CLI/workbench inputs use finite intervals or abstain from pruning | [Calibrated route tests](../tests/test_calibrated.py), [contract](calibrated-problem.md), [extension verification](../reports/engine-extension-verification.md) | Integrated scalar objective plus constraints. Unbounded radius or unsupported sampling retains the whole finite universe; nominal predictions never become substitute bounds; no feasibility, incumbent or regret certificate during abstention |
| Finite calibration output establishes simultaneous physical coverage | No such implication | Not claimed. Exchangeability, predictor freezing and candidate-generation validity are explicit unverified premises; conditional finite-risk composition is proved, while exchangeability and conformal marginal coverage are not |
| Every feasible Pareto optimum is retained | [LupinePareto.lean](../formal/LupinePareto.lean): `pareto_retained`, `equal_vectors_no_witness` | Sound finite real endpoints required. Witnesses must be certified feasible, weakly better in every objective and strictly better in at least one; all true optimal ties survive |
| Pareto exclusions have feasible strict dominators and survive refinement | `witness_has_feasible_dominator`, `pruned_has_feasible_dominator`, `witness_persists`, `retained_shrinks` in [LupinePareto.lean](../formal/LupinePareto.lean) | Same candidate/objective/constraint scope and componentwise tightening. Merely possible interval feasibility cannot supply an exclusion witness; no scalar winner or regret is inferred |
| Finite Pareto runtime follows the tested selector equations | [Pareto tests](../tests/test_pareto.py), [runtime contract](pareto.md), [extension verification](../reports/engine-extension-verification.md) | Independent truth oracle over 46,656 interval problems and 1,000,000 contained integer worlds, plus refinement and unsound negative controls; software evidence rather than a Python-to-Lean proof |
| Selected nonlinear operations enclose all contained real operands | [LupineIntervals.lean](../formal/LupineIntervals.lean): product, reciprocal, quotient and square enclosure statements; [runtime tests](../tests/test_nonlinear.py) | Finite inputs and explicit domains. Reciprocal/division reject any zero-containing denominator, including with zero numerator. No independence assumption; repeated dependencies can widen enclosures |
| Separate Pareto outcome replay preserves unknown truth and the original decision | [Pareto protocol tests](../tests/test_pareto_io.py), [scoped protocol](pareto-problem.md), [extension verification](../reports/engine-extension-verification.md) | Global true front/retention require complete universe truth. Observed front is scoped to fully measured known-feasible observations; partial bound violations can refute soundness without completing the archive |
| Serialization and certificate recomputation reject tested tampering | `tests/test_io.py`, `tests/test_adversarial_integration.py` | Tested cases; certificate is not a digital signature or physical attestation |
| Local interface exercises the actual selector | [HTTP tests](../tests/test_server.py), [browser checks](../scripts/browser_smoke.py), [initial browser record](../reports/browser-v1.json), [extension verification](../reports/engine-extension-verification.md) | Desktop/mobile Chromium checks and exact API/CLI agreement; research preview. Initial and extension records identify which modes were actually exercised |
| Finite known-answer expectations hold | `reports/known-answers-v1.json`, `tests/test_known_answers.py` | 11 sound fixtures and 2 failure-detection controls; independent oracle, synthetic software evidence only |
| Archived pilots expose interval failures | `reports/archived-v1.json`, `reports/additional-archived-v1.json`, corresponding protocols | All three archives refute simultaneous soundness of their empirical intervals |
| Frozen constrained experiment establishes useful screening or recommendation superiority | [Measured result](../reports/constrained-result-v1.md), [compact dashboard](../reports/constrained-v1.json), frozen protocol | **Not established:** all 1,000 primary candidates retained; budget-four 42/50 vs nominal 40/50 fails predeclared gain and paired-test thresholds. Every negative result remains visible |
| Unsupported chemistry-family shift triggers abstention | [Measured result](../reports/constrained-result-v1.md), [calibrated contract](calibrated-problem.md) | All 50 shift panels retain every candidate; transferred-bound diagnostic covers only 18/50 panels and has unsupported premises. Abstention is not accurate shift prediction |
| Frozen source/model artifacts reproduce in a fresh wheel environment | [Reproduction receipt](../reports/constrained-reproduction.json) | All six artifact identities match after rebuilding from verified raw bytes; same host and interpreter, isolated noneditable wheel, no new independent data or outcome replay in that particular check |
| Composition-only predictors have a 1.15 eV archive worst-error floor | `descriptor_collision_lower_bound`, `reports/descriptor-audit.json`, `docs/descriptor-audit.md` | General conditional inequality formalized; archive instantiation computed by Python from three descriptor collisions; not a claim of physical irreducibility |
| Engine improves discovery efficiency across materials | None yet | Open; pilot does not establish superiority |
| Real source intervals are globally sound | None in this release | Open scientific premise; evidence labels do not establish it |
| Source citations and input hashes certify physical truth | No such implication | Not claimed |
| All physical materials are represented | No exhaustive physical enumerator | Not claimed; guarantees are relative to the candidate universe |

## Why finite retrospective success cannot prove unconditional prediction

Suppose an unconstrained property predictor observes a finite archive D and must predict an unobserved candidate x. Without an assumption linking x to D, define two property functions f and h that agree on every archived point but assign different values at x. The predictor receives identical evidence in both worlds and must produce the same answer. Its answer cannot be exact in both; any fixed finite interval can be defeated by choosing the second world's value outside it.

The same construction reverses candidate rankings. Thus archive performance alone cannot prove universal predictive accuracy for arbitrary property functions. Regularity, mechanistic restrictions, scoped physical models, or probabilistic assumptions supply additional premises. Those premises must be stated and challenged. Lupine's global residual-Lipschitz assumption is one such substantive restriction; sampled smoothness does not establish its global validity.

The reusable result is the decision implication: **given justified enclosing
intervals, scalar and Pareto selectors preserve their respective feasible
optima; scalar selection also reports a conditional regret bound when a
certified incumbent exists**. Abstention preserves candidates by retaining the
whole universe and reports no such bound. Retrospective evaluation can refute a
proposed interval construction and measure its usefulness. It cannot remove
the construction's assumptions merely by succeeding on a finite dataset.
