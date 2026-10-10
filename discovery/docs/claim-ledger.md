# Claims and their evidence

This ledger separates mathematical implications, software execution, archived observations, and open scientific premises. A stronger claim requires stronger evidence than the row beneath it supplies.

The [generated formal inventory](../formal/theorem-inventory.json) records 130
compiled statements: 18 scalar-selector, 15 Pareto, 9 nonlinear interval/domain,
15 conditional finite-risk/rank, 12 interval-box sharpness, and 19 conservative
coupled-affine statements, plus 12 projection-algebra, 17 direct-pool counting/finite-law
and 8 finite permutation-law and 5 exact normalization statements. The [formal verification record](../formal/VERIFICATION.md)
documents actual compilation and axiom auditing. The
[engine extension verification record](../reports/engine-extension-verification.md)
records execution evidence for the new runtime and interface routes. These are
conditional mathematical and software results. Finite-risk composition has an
explicit finite weighted probability instance. The direct-pool extension proves
a marginal bound for a finite weighted outcome model with equal failure-event
masses as a premise. The subsequent [finite exchangeability bridge](finite-exchangeability.md)
derives those equal masses from invariant atom weights and coordinate-permutation
closure of a finite score-vector support. Arbitrary measurable exchangeable laws,
Python refinement and physical validity remain unproved.

The [coupled kernel contract](coupled-kernel.md) documents exact affine proofs
and their common-world premise. Its 18 focused tests and [independent audit](../reports/coupled-independent-audit.json)
cover 10,003 checks across 11,027 synthetic worlds. The [strict adapter](coupled-problem.md)
adds scoped wire identities, actual-pool replay and a guarded local HTTP route.
Independent adapter/worker tests include false-common-world controls, 144 partial
truth patterns, stale seals and process cleanup. The [coupled interface verification](../reports/coupled-interface-verification.md)
records 298 Python tests, 24 browser checks and an isolated wheel exercising
22 cases. Historical records remain separately identified. The [projection checkpoint](../reports/projection-verification.md) adds exact adapter algebra and paired input/certificate exports: 325 Python tests, 27 browser checks and 100 compiled statements.

| Claim | Evidence | Status and limit |
|---|---|---|
| Sound intervals give a feasibility sandwich | `formal/LupineDiscovery.lean`: `certified_feasible`, `feasible_possible` | Conditional theorem; build evidence in `formal/VERIFICATION.md` |
| Every feasible minimizer is retained | `minimizer_retained` | Assumes sound intervals and a certified incumbent; all candidates without one remain governed by F+ |
| Pruning has a better feasible witness | `pruned_has_better_feasible` | Strict score separation required |
| Incumbent regret is bounded | `regret_bound`, mathematical specification | Formal statement takes an explicit lower-envelope bound; finite minimum instantiation is explained in the specification |
| Compatible refinement shrinks the pool | `best_upper_retained_shrinks` | Same candidate type/scope and a refined best-upper witness |
| The scalar pool is the smallest universally safe pool under interval-only information | [Sharpness specification](sharpness.md), [LupineSharpness.lean](../formal/LupineSharpness.lean), [constructive tests](../tests/test_sharpness.py) | Every retained candidate can be a tied feasible optimum in a compatible Cartesian interval world. No claim that every such world is physically attainable; valid coupling or tighter evidence can change the admissible worlds |
| Nonnegative affine row combinations certify bounds and strict contradictions certify empty domains | [LupineCoupled.lean](../formal/LupineCoupled.lean): `affine_combination_upper_bound`, `contradiction_no_point` | Exact coefficient identities, nonnegative multipliers, and the stated right-side inequalities are required. An inconsistent common model does not establish material-universe infeasibility |
| Conservative coupled exclusions preserve every tied feasible minimizer | `candidate_domain_iff`, `conditional_witness_better`, `minimizer_retained` in [LupineCoupled.lean](../formal/LupineCoupled.lean) | One actual common latent world must satisfy the original rows, and the baseline must retain the optimum. Witness feasibility and strictly negative score difference are certified over the same target-feasible domain. No complete possible-optimum search is proved |
| Inactive coupled premises cannot authorize operational box pruning | [Coupled contract](coupled-kernel.md), [focused tests](../tests/test_coupled.py), `disabled_retains_all` | Unsupported or learned-correlation premises, missing/rejected consistency, or proved-inconsistent common models retain all IDs. Affine-derived box intervals remain diagnostic only; a consistency point establishes nonemptiness, not physical truth |
| The experimental coupled Python kernel passes independent finite-world checks | [Independent audit](../reports/coupled-independent-audit.json), [audit script](../scripts/audit_coupled.py), [focused tests](../tests/test_coupled.py) | 18 focused tests; 10,003 independent audit checks across 11,027 synthetic worlds. Source-bound software evidence, not Python refinement, scientific validation, or end-to-end resource guarantees |
| Declared correction fields translate to exact affine quantities and anchor rows | [Projection API](projection-adapter.md), [LupineProjection.lean](../formal/LupineProjection.lean), [independent audit](../reports/projection-independent-audit.json) | Twelve compiled algebraic statements; 27 focused tests. Common-image representation, coordinate/discrepancy enclosures and anchor validity remain premises. No Python refinement or physical validation |
| Projection scope, provenance and unavailable bounds remain explicit | [Projection tests](../tests/test_projection.py), [independent tests](../tests/test_projection_review.py) | Full physical context and quantity scopes checked; missing or empirical-only field/discrepancy bounds yield no numerical model and all original IDs. Identity labels are not scientific attestation |
| Valid individual failure budgets compose into a finite joint bound | [LupineRisk.lean](../formal/LupineRisk.lean), [formal verification](../formal/VERIFICATION.md) | Explicit normalized monotone subadditive risk law, with a finite weighted probability instance. Individual event-risk bounds and deterministic implication are premises; no stochastic independence is needed for the union bound |
| Calibration finite-rank resolution and minimum count are exact | `finite_rank_iff`, `finite_rank_iff_minimum_count`, `insufficient_resolution_rank` in [LupineRisk.lean](../formal/LupineRisk.lean) | Rational ceiling arithmetic; unavailable rank is n+1. This does not prove that empirical residual ranks have the assumed marginal coverage |
| Nonnegative finite coefficients with positive total normalize to a unit-sum vector in [0,1] | `normalized_coordinate_bounds`, `normalized_sum` in [LupineNormalization.lean](../formal/LupineNormalization.lean) | Conditional finite-real algebra; positive total is essential. Physical coefficient meaning and Python refinement are not proved |
| Positive scaling preserves normalization; normalized L1 is bounded and zero only for equal maps | `positive_scale_invariance`, `normalized_l1_bounds`, `l1_zero_iff_equal`; [actual build/audit](../formal/VERIFICATION.md) | Exact hypotheses differ by statement. No chemical predictivity or additional compiled L1 symmetry/triangle theorem is asserted |
| Exact coefficient features preserve unknown states and original rows | [Generic API](normalization.md), [synthetic adapter](mpea-features.md), [728-test integration](../reports/normalization-engineering-v1/README.md) | 44 focused synthetic checks, including 27 independent checks; no scientific reader or actual feature execution in this increment. Omitted axes mean known zero only under a complete declaration |
| The supplemental formula grammar recognizes the fixed MPEA archive | [Actual G15C result](../reports/mpea-formula-readiness-v1.md), frozen source/CI and two-process receipt | 1,545 original rows and 630 lexical groups; original G15B zero-recognition result preserved. No physical identity, target completeness, study independence or eligibility implication |
| Both historical negative numerical results reproduce in a clean checkout | [Fresh reproduction](../reports/clean-reproduction-v1/README.md), exact safe receipts and independent audits | Both historical scientific digests match; constrained screening/value and training-model gates remain failed. Same host/frozen data, not independent scientific replication |
| Runtime implements the finite equations | `tests/test_core.py`, `tests/test_envelope.py` | Exhaustive bounded worlds and randomized refinement tests; no full formal refinement proof |
| Calibration planner computes exact ranks and explicit unbounded outcomes | [Planner tests](../tests/test_calibration.py), [initial verification](../reports/calibration-verification.md) | Conditional arithmetic only; all candidate/target events are budgeted; sampling premises remain unverified |
| Calibrated CLI/workbench inputs use finite intervals or abstain from pruning | [Calibrated route tests](../tests/test_calibrated.py), [contract](calibrated-problem.md), [extension verification](../reports/engine-extension-verification.md) | Integrated scalar objective plus constraints. Unbounded radius or unsupported sampling retains the whole finite universe; nominal predictions never become substitute bounds; no feasibility, incumbent or regret certificate during abstention |
| Finite calibration output establishes simultaneous physical coverage | No such implication | Not claimed. Exchangeability, predictor freezing and candidate-generation validity are explicit unverified premises; conditional finite-risk composition is proved, while exchangeability and conformal marginal coverage are not |
| All tied feasible minimizers are retained exactly when their maximum normalized rank is at most the threshold | [Direct-pool design](decision-pool-calibration-design.md), `all_minimizers_retained_iff` in [LupineDecisionPool.lean](../formal/LupineDecisionPool.lean) | Deterministic finite-panel bridge, with nonnegative threshold and score zero for no feasible optimum. Complete recorded labels and a supplied ranking remain premises |
| Direct pool calibration has a conditional marginal failure bound | `leave_one_out_failure_count`, `finite_weighted_loo_ceiling_bound`, [formal scope](../formal/VERIFICATION.md) | Formal probability result uses a finite weighted outcome space and equal indexed failure-event masses. No arbitrary measurable-law theorem, application exchangeability proof, conditional-on-feasibility guarantee, or physical attestation |
| Finite joint-score permutation invariance implies the direct-pool marginal risk bound | [LupineExchangeability.lean](../formal/LupineExchangeability.lean), [finite-law scope](finite-exchangeability.md), [actual build/audit](../formal/VERIFICATION.md) | Eight compiled statements derive equal indexed failure masses instead of assuming them. Finite support, invariant normalized nonnegative atom weights and exact leave-one-out quantiles are required; no arbitrary measurable-law, scientific sampling, conditional-coverage or Python-refinement claim |
| Exact statistical pool runtime preserves incomplete calibration and abstains explicitly | [Core](../src/lupine_discovery/decision_pool.py), [independent tests](../tests/test_decision_pool_review.py), [workbench verification](../reports/decision-pool-workbench-verification.md) | Separate core with strict wire/CLI, guarded HTTP, actual-pool replay and browser integration. Every calibration panel remains in n; any missing target yields no calibrated threshold and whole-universe fallback. Future truth is absent from the selection API; no feasibility, regret, or hard interval certificate |
| A marginal pool guarantee implies reliability on feasible panels or a fixed calibration set | [Exact counterexamples](../reports/decision-pool-independent-audit.json), [runtime controls](../tests/test_decision_pool_review.py) | False: constructed marginal retention 19/20 coexists with zero retention conditional on feasibility. Marginal failure 1/2 can coexist with failure 1 conditional on a realized calibration set. No scientific archive is involved |
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
| Coupled replay audits the actual selected pool and preserves unknown truth | [Wire tests](../tests/test_coupled_io.py), [independent review](../tests/test_coupled_wire_review.py), [guide](coupled-problem.md) | Complete marginal coverage can coexist with a lost optimum when the common relation is false. Optional latent points are audited separately and never replace observed values or repair the prior decision |
| Coupled HTTP computation is bounded and hard failures carry no receipt | [Worker tests](../tests/test_coupled_worker.py), [HTTP tests](../tests/test_coupled_server.py), independent review | Linux CPU/address-space/wall/output boundary; one worker per server process. Unsupported platforms refuse this mode. Process checks do not prove completion of every accepted problem |
| The training dashboard preserves the fixed published experiment | [Projector tests](../tests/test_training_dashboard.py), [recorded projection](../reports/training-tail-v1.json) | Pins original public receipts and scientific digest; rejects even internally resealed result substitution. No fitting or original-data access; presentation is not new validation |
| Frozen source/model artifacts reproduce in a fresh wheel environment | [Reproduction receipt](../reports/constrained-reproduction.json) | All six artifact identities match after rebuilding from verified raw bytes; same host and interpreter, isolated noneditable wheel, no new independent data or outcome replay in that particular check |
| Composition-only predictors have a 1.15 eV archive worst-error floor | `descriptor_collision_lower_bound`, `reports/descriptor-audit.json`, `docs/descriptor-audit.md` | General conditional inequality formalized; archive instantiation computed by Python from three descriptor collisions; not a claim of physical irreducibility |
| The training-only follow-up establishes a better predictor | [Frozen protocol](training-tail-protocol-v1.md), [executed result](../reports/training-tail-result-v1.md), [two-pass receipt](../reports/training-tail-reproduction-v1.json) | **Not established:** all three ridge alternatives fail the predeclared joint requirements. Exact outputs reproduce in two processes. Training-only model selection is not independent validation or calibration; no changed predictor is authorized by this result |
| Engine improves discovery efficiency across materials | None yet | Open; pilot does not establish superiority |
| Real source intervals are globally sound | None in this release | Open scientific premise; evidence labels do not establish it |
| Source citations and input hashes certify physical truth | No such implication | Not claimed |
| All physical materials are represented | No exhaustive physical enumerator | Not claimed; guarantees are relative to the candidate universe |

## Declared-coefficient normalization and feature custody

Five compiled conditional finite-real statements prove normalized-coordinate
bounds, unit sum, positive-scale invariance, L1 bounds and zero-distance equality.
[Executed engineering evidence](../reports/normalization-engineering-v1/README.md)
checks the exact Python implementation independently; no runtime refinement or
physical descriptor validity is claimed. The [source-bound feature reader](../reports/mpea-feature-reader-engineering-v1/README.md)
passes synthetic custody tests and the 762-test full suite. After its published
freeze and green CI, [two actual processes](../reports/mpea-feature-readiness-v1/README.md)
preserved all 1,545 rows and produced identical declared-coefficient features.
Only aggregate receipts are published. Private vectors and checksums cannot
establish useful ranking, physical composition or target validity; no performance
target interpretation, allocation, fit or new scientific result is claimed.

## Why finite retrospective success cannot prove unconditional prediction

Suppose an unconstrained property predictor observes a finite archive D and must predict an unobserved candidate x. Without an assumption linking x to D, define two property functions f and h that agree on every archived point but assign different values at x. The predictor receives identical evidence in both worlds and must produce the same answer. Its answer cannot be exact in both; any fixed finite interval can be defeated by choosing the second world's value outside it.

The same construction reverses candidate rankings. Thus archive performance alone cannot prove universal predictive accuracy for arbitrary property functions. Regularity, mechanistic restrictions, scoped physical models, or probabilistic assumptions supply additional premises. Those premises must be stated and challenged. Lupine's global residual-Lipschitz assumption is one such substantive restriction; sampled smoothness does not establish its global validity.

The reusable result is the decision implication: **given justified enclosing
intervals, scalar and Pareto selectors preserve their respective feasible
optima; scalar selection also reports a conditional regret bound when a
certified incumbent exists**. Abstention preserves candidates by retaining the
whole universe and reports no such bound. With an additional justified common
affine world, verified conservative coupled exclusions also preserve tied
feasible minima; the supplied relations are extra premises, not consequences
of interval-only sharpness. Retrospective evaluation can refute a
proposed interval construction and measure its usefulness. It cannot remove
the construction's assumptions merely by succeeding on a finite dataset.

## Guarded archival engineering and workbench

[981 Python tests and 56 browser checks](../reports/mpea-guarded-components-v1/README.md)
exercise constructed custody stages, network isolation, cumulative operational
limits, exact fixed-policy evaluation and explicit aggregate failure/unknown
presentation. Independent reviews preserve their original failures and final
source identities. These checks do not establish a production registration,
archival usefulness or physical validity. Observed RSS enforcement is a sampled
process boundary; an aggregate seal depends on authenticated upstream context.
Actual MPEA results remain unavailable until the complete registered workflow
executes. All previous scientific negatives and claim limits remain in force.
