# Conditional universal selector kernels

`LupineDiscovery.lean` quantifies over arbitrary candidate and constraint types,
real-valued objectives and constraints, and sound enclosing intervals. It does
not require a finite candidate universe, descriptor, enumerator, or physical
model. Soundness is an explicit theorem hypothesis, never an asserted axiom.

`LupinePareto.lean` extends the selector to arbitrary objective types, using
certified feasible strict componentwise dominance witnesses. `LupineIntervals.lean`
proves finite real multiplication, reciprocal, division, and square enclosures.
`LupineRisk.lean` proves finite event-risk composition and exact rational rank
resolution from explicit premises. `LupineSharpness.lean` characterizes the scalar
retained set as the smallest universally safe set when only the supplied interval
constraints are known. `LupineCoupled.lean` proves conservative affine-certificate
screening under one shared latent world. `LupineProjection.lean` proves the exact
algebra translating a declared correction field into those affine quantities and
anchor rows. Each module has its own namespace. All seven
modules are default build targets.

The standalone package pins Lean `v4.29.0` and Mathlib
`8a178386ffc0f5fef0b77738bb5449d50efeea95`, matching the Mathlib/toolchain
configuration in `alexwelcing/lupine-rhizo` at
`81079a8e1bac7ed332712cc92002bd3435e40776` (`lean-spec/`). It does not import
Atlas or its unproved target.

## Theorem map

| Theorem | Mathematical guarantee |
| --- | --- |
| `certified_feasible` | F− is contained in the true feasible set |
| `feasible_possible` | The true feasible set is contained in F+ |
| `minimizer_retained` | Every feasible global minimizer survives Ls ≤ U(y), for any certified feasible incumbent y |
| `regret_bound` | s(y) − s(x) ≤ U(y) − a for feasible x, whenever a lower-bounds every lower score in F+ |
| `regret_bound_monotone` | A smaller supplied upper threshold and larger supplied lower envelope bound improve the regret bound |
| `incumbent_regret_nonnegative` | A certified feasible incumbent has nonnegative regret against a true feasible global minimum |
| `empty_possible_no_feasible` | Empty F+ implies no feasible element in the quantified candidate universe |
| `pruned_has_better_feasible` | An incumbent upper score below a candidate lower score witnesses a strictly better feasible candidate |
| `certified_expands` | Narrower intervals expand F− |
| `possible_shrinks` | Narrower intervals shrink F+ |
| `threshold_decreases` | A refined best-upper witness has threshold no larger than any old certified incumbent |
| `retained_shrinks` | Narrower intervals and a nonincreasing threshold shrink the retained predicate |
| `best_upper_retained_shrinks` | Combines refinement and best-upper witness into retained-pool inclusion |
| `pairwise_order`, `pairwise_strict_order` | Disjoint/ordered score intervals imply true weak/strict score order |
| `shared_prediction_error_lower_bound` | A shared prediction has uniform error at least half the true label gap |
| `descriptor_collision_lower_bound` | Equal descriptors force that error floor for a deterministic descriptor-only predictor |
| `no_anchor_ambiguity` | With no constraint information, both feasible and infeasible constant worlds exist |

With no certified incumbent, retaining all of F+ is safe directly by
`feasible_possible`; the thresholded predicate is used only with an incumbent.

Minimizer retention assumes a true feasible minimizer exists. `BestUpper`
includes certified feasibility and an attained least upper score; its existence
is an explicit witness, since arbitrary infinite pools need not attain a minimum.

The regret theorem uses a supplied lower envelope bound instead of a totalized
`iInf`: an arbitrary infinite real-valued candidate set may have no finite
infimum. For a finite nonempty F+, its minimum lower score satisfies that
hypothesis. Feasibility of y is needed to interpret the difference as feasible
incumbent regret; the algebraic inequality itself needs only score soundness.

`Certified` and `Possible` are predicates, not executable finite checkers.
This proof does not establish a refinement relation from the Python runtime.
Runtime tests and differential evidence must be reported separately.

## Pareto theorem map

All objectives are minimized. A witness `y` may exclude `x` only when `y` is
certified feasible, every objective satisfies `upper(y) ≤ lower(x)`, and at
least one objective satisfies a strict inequality. A possible-feasible `x` is
retained when no such witness exists. This uses no scalarization, preferred
objective weighting, scalar regret bound, or top-k truncation.

| Theorem in `LupinePareto` | Mathematical guarantee |
| --- | --- |
| `certified_feasible`, `feasible_possible` | Certified feasibility implies true feasibility, which implies possible feasibility |
| `interval_dominance_sound` | The endpoint dominance predicate implies true componentwise dominance with a strict component |
| `witness_has_feasible_dominator` | An exclusion witness is truly feasible and strictly Pareto dominates its target |
| `pareto_retained` | Every true feasible Pareto optimum is retained, including an optimum whose feasibility is only possible from the intervals |
| `equal_vectors_not_dominated`, `equal_vectors_no_witness` | Equal true objective vectors cannot dominate or exclude one another under sound intervals |
| `pruned_has_feasible_dominator` | Every excluded possible-feasible candidate has a true feasible strict dominator |
| `no_certified_retains_possible` | Without any certified feasible witness, every possible-feasible candidate is retained |
| `empty_possible_no_feasible` | Empty possible feasibility implies no feasible candidate in the quantified universe |
| `certified_expands`, `possible_shrinks` | Componentwise refinement expands certified feasibility and shrinks possible feasibility |
| `interval_dominance_persists`, `witness_persists`, `retained_shrinks` | Refinement preserves old strict witnesses and can only shrink the retained pool |

The candidate, objective, and constraint types may be arbitrary, including
infinite types. The runtime uses a finite candidate collection and nonempty
objective maps; those are executable interface restrictions, not additional
requirements of these theorems. An empty objective type has no strict dominance
component, so the abstract selector retains all possible-feasible candidates.

Equal vectors are protected from excluding one another; this does not require
retaining nonoptimal equal vectors when a third candidate strictly dominates
both. All truly Pareto-optimal ties are retained by `pareto_retained`.

`Bounds` uses finite real endpoints. Conservative runtime handling of absent or
unbounded information is not formally refined from these definitions. Neither
Pareto theorem proves interval soundness, prediction accuracy, or physical
coverage of the candidate universe.

## Nonlinear interval theorem map

| Theorem in `LupineIntervals` | Mathematical guarantee |
| --- | --- |
| `scaled_enclosure` | Multiplication by any fixed real is enclosed by the ordered endpoint products |
| `product_enclosure` | The minimum and maximum of all four corner products enclose every product of enclosed real inputs |
| `zero_excluding_nonzero` | An interval with strictly positive lower endpoint or strictly negative upper endpoint contains no zero value |
| `reciprocal_enclosure` | On either such zero-excluding domain, reciprocal values lie between the reversed reciprocal endpoints |
| `quotient_enclosure` | Multiplying the numerator interval by the reciprocal denominator interval encloses division on that domain |
| `square_nonnegative_enclosure`, `square_nonpositive_enclosure` | Squaring preserves endpoint order on nonnegative intervals and reverses it on nonpositive intervals |
| `square_upper_enclosure`, `square_enclosure` | The larger squared endpoint bounds every square above; the lower bound is the squared endpoint nearest zero, or zero across zero |

No statistical independence is required for multiplication or division. Repeated
dependencies may widen an interval; these are containment results, not claims
of an optimal enclosure of a whole expression. Reciprocal and division require
the entire denominator interval to exclude zero, even when the numerator is
zero. Square is proved directly and therefore avoids the negative lower bound
that multiplying a sign-crossing interval by itself can introduce.

## Finite joint-risk theorem map

`RiskLaw Ω` records the event-risk properties used by the proof: a real-valued
mass for every event, empty-event mass zero, total mass one, monotonicity, and
binary subadditivity. These fields are explicit hypotheses, not asserted project
axioms. This is a normalized monotone subadditive capacity; additivity is not
required, so a `RiskLaw` need not itself be a probability distribution.
Outcome type `Ω` can be arbitrary; the indexed event collection is
finite. Every marginal bound must refer to this same event law and sampling
mechanism. Statistical independence is not required.

`finiteWeightedRisk` constructs these properties from a concrete finite outcome
type with nonnegative weights summing to one. The proof establishes its event
mass as the sum of included outcome weights; it does not infer weights or
sampling validity from experimental data. No adapter to Mathlib's general
measure/probability types is compiled in this module. The outcome space describes
sampling randomness and is distinct from the material candidate pool; a finite
candidate pool does not make that randomness a finite probability space.

| Theorem in `LupineRisk` | Mathematical guarantee |
| --- | --- |
| `risk_nonnegative`, `risk_at_most_one` | The explicit event-law properties imply every event risk is between zero and one |
| `finite_union_bound` | Risk of a finite union is at most the sum of its individual event risks |
| `allocated_joint_failure_bound` | Valid per-event risk bounds whose allocations sum to at most delta bound joint failure risk by delta |
| `finite_weighted_joint_failure_bound` | The allocated bound applies directly to a finite distribution with nonnegative normalized outcome weights |
| `uniform_allocation_sum`, `uniform_joint_failure_bound` | With N nonzero indexed events, N allocations of delta/N sum exactly to delta and imply the corresponding joint bound |
| `failure_subset_bound` | Any bad decision event contained in the bounded failure union inherits its risk bound |
| `conditional_conclusion_failure_bound`, `conditional_conclusion_success_bound` | A conclusion that holds whenever all indexed premises hold fails with risk at most delta and succeeds with mass at least 1-delta |
| `finite_rank_iff` | For rational epsilon, `ceil((n+1)*(1-epsilon)) <= n` exactly when `1/(n+1) <= epsilon`, including the equality boundary |
| `finite_rank_iff_minimum_count` | For positive rational epsilon, finite rank is equivalent to `ceil(1/epsilon)-1 <= n`, matching the minimum-sample diagnostic |
| `rank_positive`, `rank_at_most_next` | Epsilon<1 makes the rank positive; epsilon>=0 makes it no greater than n+1 |
| `insufficient_resolution_rank` | A nonnegative allocation below `1/(n+1)` gives precisely rank n+1, which the runtime represents as an unavailable finite radius |

The rational rank statements are arithmetic, not order-statistic coverage
theorems. The natural ceiling agrees with the runtime's integer ceiling on the
accepted `0 < epsilon < 1` domain. Its behavior on negative rank expressions
outside that domain is not a runtime correspondence claim.
No exchangeability theorem, conformal marginal-coverage theorem, or
data-derived marginal failure bound is proved. The deterministic conclusion
bridge is an explicit hypothesis; this module does not mechanically instantiate
it with the scalar/Pareto runtime or establish Python refinement. The compiled
results explain how valid marginal premises would compose and when the proposed
calibration rank is unavailable. They do not make the current archived interval
failures disappear or establish their sampling assumptions.

## Interval-box sharpness theorem map

The scalar selector retains exactly the candidates that can be feasible global
minimizers in at least one world compatible with its intervals. Here a world
assigns every candidate a score and constraint values anywhere in their supplied
intervals. Every interval must be ordered. The construction places the selected
candidate at its lower endpoints and all other candidates at their upper
endpoints; candidates whose feasibility is not certified then become infeasible
in that world.

| Theorem in `LupineSharpness` | Mathematical guarantee |
| --- | --- |
| `witness_world_sound` | The constructed world lies within every ordered interval |
| `witness_candidate_feasible` | A possible-feasible selected candidate is feasible in that world |
| `witness_other_feasible_iff_certified` | Each other candidate is feasible in that world exactly when its intervals certify feasibility |
| `witness_candidate_minimizer`, `box_retained_realizable` | Every retained candidate is a feasible global minimizer in a compatible constructed world |
| `compatible_minimizer_box_retained`, `box_retained_iff_realizable` | Conversely every compatible-world feasible minimizer is retained, giving an exact characterization |
| `box_retained_iff_best_upper_retained` | With an attained best-upper witness, the characterization equals the scalar threshold selector |
| `no_certified_box_retained_iff_possible` | Without a certified feasible candidate, the characterization is exactly possible feasibility |
| `box_retained_universally_safe` | The characterized pool retains every feasible global minimizer in every compatible world |
| `box_retained_minimal`, `pruning_retained_has_counterexample` | Every universally safe pool contains this pool; excluding one of its candidates loses a feasible minimizer in some compatible world |

These statements preserve all tied minimizers and quantify over arbitrary
candidate and constraint types. They establish necessity only for selectors
whose information is the Cartesian product of these intervals. A compatible
constructed world need not be physically attainable or satisfy additional known
correlations. Extra scientifically justified constraints can support narrower
safe pools. A large retained pool can therefore be unavoidable under the supplied
interval information without establishing that the predictor or evidence is
adequate for useful material discovery. This module does not prove Python
refinement or Pareto-selector minimality.

## Coupled affine certificate theorem map

`LupineCoupled` models finite real affine quantities and normalized rows
`M_r dot z <= upper_r`. The candidate type is arbitrary; the latent-coordinate,
domain-row, and per-candidate constraint types are finite and may be empty.
The executable interface restricts coefficients, points, and multipliers to
rationals. The real-valued proof encompasses those numbers, but it does not
establish a refinement of the rational checker or its input parsing.

An upper certificate supplies nonnegative multipliers whose coefficient sum is
the target affine coefficient vector and whose weighted right sides plus the
target constant are at most the claimed bound. A contradiction certificate
instead has zero combined coefficients and a strictly negative weighted right
side. These arguments do not require the row domain to be bounded, a solver to
be complete, or a feasible point to be found by any particular algorithm.

| Theorem in `LupineCoupled` | Mathematical guarantee |
| --- | --- |
| `finite_sum_mul`, `mul_finite_sum`, `combined_dot` | Finite distributivity and interchange justify the weighted-row calculation |
| `difference_evaluate` | Subtracting affine coefficients and constants evaluates to the exact difference |
| `affine_nonpositive_iff` | An affine constraint is normalized by moving its constant to the right with the correct sign |
| `point_consistency` | A point satisfying every row proves the declared model has an admissible world |
| `affine_combination_upper_bound` | A verified nonnegative multiplier certificate bounds the affine expression at every point in the exact certified domain |
| `contradiction_no_point`, `consistent_no_contradiction` | A strict contradiction certificate excludes every domain point and cannot coexist with a verified consistency point |
| `candidate_domain_iff` | Appending every normalized constraint of x constructs exactly Qx: base-domain membership and feasibility of x |
| `conditional_witness_better` | A witness certified feasible and strictly better over Qx is feasible and better whenever x is feasible in the same base world |
| `infeasible_exclusion_sound`, `strict_witness_exclusion_sound`, `certified_exclusion_not_minimizer` | Either supported exclusion rule prevents the target from being a feasible global minimizer in an admissible world |
| `equal_scores_no_strict_witness` | The strict-witness rule cannot exclude a feasible target through a witness with an equal score at that world |
| `disabled_retains_baseline`, `disabled_retains_all`, `inconsistent_gate_retains_baseline` | An inactive gate preserves its baseline; choosing the full candidate universe provides complete fallback, and an enabling-implies-consistency contract prevents pruning under inconsistent premises |
| `minimizer_retained` | Every tied feasible minimizer at one common admissible world survives any supplied subset of certified exclusions, if it was retained by the baseline |

Both witness feasibility and its strictly negative score-difference bound use
the identical Qx, constructed from the original fixed problem. Witnesses need
not be globally feasible. They also need not survive screening themselves:
their validity concerns the fixed candidate universe and admitted worlds.
An exhausted search budget supplies no certificate and cannot justify an
exclusion. This fixed-witness method is intentionally incomplete.

The inactive-gate theorem is parameterized by a baseline. In the new coupled
runtime, even the diagnostic interval bounds derive from the affine premises,
so unsupported premises, a missing/rejected consistency point, or inconsistent
premises require the **full candidate universe** as fallback. The affine-derived
interval baseline may be used only after that gate is enabled. The final
retention theorem explicitly assumes baseline retention; it does not silently
prove the interval-baseline implementation correct.

A consistency point establishes mathematical nonemptiness, not the scientific
claim that actual candidate values share an admissible latent vector. The
retention result requires that common-world premise. No physical affine
coupling, automatic certificate production, exhaustive branch reasoning,
possible-minimizer completeness, LP duality completeness, or Python refinement
is proved. The original interval-box sharpness theorem is unchanged; the new
rule uses additional premises restricting compatible worlds.

## Projection-field translation theorem map

`LupineProjection` uses the same `Affine`, `evaluate`, and `RowSystem` definitions
as the coupled kernel. Field coordinates `K` and normalized latent coordinates
`D` are arbitrary finite types, including empty types. The declared map is
`theta_k = b_k + sum_d S_kd z_d`. Its matrix can be rectangular or singular;
no inverse, image-coverage, or surjectivity premise is inferred from finite
marginal field bounds. A chosen common latent world is an explicit premise.

For a source quantity, the declared relation is
`truth = nominal - weights dot theta + discrepancy`. Discrepancy is represented
by an affine expression on that same latent vector. Giving each source quantity
its own coordinate in `[-1,1]` with nonnegative coefficient `rho` is a special
case; this construction requires no stochastic independence assumption. The
generated constant is `nominal - weights dot b + discrepancy.constant`, and its
coefficient at `d` is `discrepancy.coefficient_d - sum_k weights_k S_kd`.

| Theorem in `LupineProjection` | Mathematical guarantee |
| --- | --- |
| `normalization_dot`, `projected_evaluate` | Finite distributivity makes the generated affine expression exactly equal to the declared projection at each normalized world |
| `projected_truth` | Given both the actual field's image equality and the quantity's truth relation, the generated expression equals that actual quantity |
| `projected_difference`, `equal_weights_cancel` | Pairwise differences preserve the full field/discrepancy contributions, and identical weights cancel the shared field exactly |
| `transform_evaluate` | Multiplying every coefficient and the constant by any signed scale, then adding an offset, transforms the entire quantity including its discrepancy |
| `normalized_discrepancy_enclosure`, `scaled_discrepancy_enclosure` | A nonnegative radius times a coordinate in `[-1,1]` lies in `[-rho,rho]`; a signed conversion changes that radius to `abs(scale)*rho` |
| `affine_upper_row_iff`, `affine_lower_row_iff` | For an affine quantity `a dot z + c`, its upper and lower bounds are exactly the rows `a dot z <= U-c` and `(-a) dot z <= c-L` |
| `anchor_domain_iff`, `projected_anchor_domain_iff` | Satisfying every generated anchor row is equivalent to satisfying every supplied anchor interval in that same world |

The anchor family need not be finite for the equivalence itself; the runtime
and coupled multiplier certificates use finite row families. Ordered anchor
endpoints are not needed for the equivalence: contradictory intervals give an
empty row domain. This does not establish physical infeasibility of the material
universe. Anchors are expressed in their source quantity units; conversions
must be applied to the whole expression when forming objective or constraint
quantities.

To connect this algebra to an actual decision, the following conjunction is
still supplied, not proved from metadata: one actual common latent vector lies
within every declared coordinate bound; actual field coordinates equal its
declared image; all candidate and anchor quantities obey their declared
projection relations and discrepancy bounds at that same vector; and the
independently supplied anchor intervals contain their actual values. The
translation identities then identify actual quantities with generated affine
values, and the anchor equivalence identifies their anchor-row membership.
Any additional domain rows need their own valid premises. Given this domain
membership, sound baseline retention, and checked exclusion certificates,
`LupineCoupled.minimizer_retained` supplies the existing decision implication;
no duplicate retention theorem is asserted here.

Scope names, field-block labels, source hashes, empirical residuals, and model
consistency points do not establish that conjunction. No physical validity,
empirical calibration, relation transfer between materials, unit correctness
from labels, runtime parser correctness, or Python refinement follows from these
real-valued equalities. The finite rational adapter must be verified separately.

## Reproduction and trust

Use the committed `lake-manifest.json`; optionally run `lake exe cache get`,
then run `lake --wfail build` and `python3 audit_axioms.py` in this directory.
Run `lake update` only when intentionally refreshing dependency resolution.
When available, the Mathlib cache avoids compiling the library from source.
If cache endpoints are unavailable, `lake build` compiles the imported dependency
graph directly. The package has no
project axiom declarations or admitted proofs. `#print axioms` commands expose
Lean's standard logical dependencies in the build output. The audit script
re-elaborates every root proof module, requires complete theorem coverage per
module, rejects extra axioms and admitted proofs, and saves actual combined
output to `AXIOMS.txt` and source-bound theorem inventory to
`theorem-inventory.json`. It checks the one-namespace-per-file convention and
discovers proof modules rather than silently retaining a single-module audit.
Its eleven adversarial
parser checks run with `python3 -m unittest test_audit_axioms -v`. These must be
distinguished from explicit hypotheses such as interval soundness.

See `VERIFICATION.md` for actual execution evidence; this README alone is not a
claim that compilation succeeded.
