# Conditional universal selector kernels

`LupineDiscovery.lean` quantifies over arbitrary candidate and constraint types,
real-valued objectives and constraints, and sound enclosing intervals. It does
not require a finite candidate universe, descriptor, enumerator, or physical
model. Soundness is an explicit theorem hypothesis, never an asserted axiom.

`LupinePareto.lean` extends the selector to arbitrary objective types, using
certified feasible strict componentwise dominance witnesses. `LupineIntervals.lean`
proves finite real multiplication, reciprocal, division, and square enclosures.
Each module has its own namespace. All three modules are default build targets.

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
