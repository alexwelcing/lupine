# Conditional universal selector kernel

`LupineDiscovery.lean` quantifies over arbitrary candidate and constraint types,
real-valued objectives and constraints, and sound enclosing intervals. It does
not require a finite candidate universe, descriptor, enumerator, or physical
model. Soundness is an explicit theorem hypothesis, never an asserted axiom.

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

## Reproduction and trust

Use the committed `lake-manifest.json`; optionally run `lake exe cache get`,
then run `lake --wfail build` and `python3 audit_axioms.py` in this directory.
Run `lake update` only when intentionally refreshing dependency resolution.
When available, the Mathlib cache avoids compiling the library from source.
If cache endpoints are unavailable, `lake build` compiles the imported dependency
graph directly. The package has no
project axiom declarations or admitted proofs. `#print axioms` commands expose
Lean's standard logical dependencies in the build output. The audit script
re-elaborates the module, requires complete theorem coverage, rejects extra axioms
and admitted proofs, and saves actual output to `AXIOMS.txt`. Its six adversarial
parser checks run with `python3 -m unittest test_audit_axioms -v`. These must be
distinguished from explicit hypotheses such as interval soundness.

See `VERIFICATION.md` for actual execution evidence; this README alone is not a
claim that compilation succeeded.
