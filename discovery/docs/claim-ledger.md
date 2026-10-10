# Claims and their evidence

This ledger separates mathematical implications, software execution, archived observations, and open scientific premises. A stronger claim requires stronger evidence than the row beneath it supplies.

| Claim | Evidence | Status and limit |
|---|---|---|
| Sound intervals give a feasibility sandwich | `formal/LupineDiscovery.lean`: `certified_feasible`, `feasible_possible` | Conditional theorem; build evidence in `formal/VERIFICATION.md` |
| Every feasible minimizer is retained | `minimizer_retained` | Assumes sound intervals and a certified incumbent; all candidates without one remain governed by F+ |
| Pruning has a better feasible witness | `pruned_has_better_feasible` | Strict score separation required |
| Incumbent regret is bounded | `regret_bound`, mathematical specification | Formal statement takes an explicit lower-envelope bound; finite minimum instantiation is explained in the specification |
| Compatible refinement shrinks the pool | `best_upper_retained_shrinks` | Same candidate type/scope and a refined best-upper witness |
| Runtime implements the finite equations | `tests/test_core.py`, `tests/test_envelope.py` | Exhaustive bounded worlds and randomized refinement tests; no full formal refinement proof |
| Serialization and certificate recomputation reject tested tampering | `tests/test_io.py`, `tests/test_adversarial_integration.py` | Tested cases; certificate is not a digital signature or physical attestation |
| Local interface exercises the actual selector | `tests/test_server.py`, `scripts/browser_smoke.py`, `reports/browser-v1.json` | Desktop/mobile Chromium checks and exact API/CLI agreement; research preview, not a public hosting service |
| Finite known-answer expectations hold | `reports/known-answers-v1.json`, `tests/test_known_answers.py` | 11 sound fixtures and 2 failure-detection controls; independent oracle, synthetic software evidence only |
| Archived pilots expose interval failures | `reports/archived-v1.json`, `reports/additional-archived-v1.json`, corresponding protocols | All three archives refute simultaneous soundness of their empirical intervals |
| Composition-only predictors have a 1.15 eV archive worst-error floor | `descriptor_collision_lower_bound`, `reports/descriptor-audit.json`, `docs/descriptor-audit.md` | General conditional inequality formalized; archive instantiation computed by Python from three descriptor collisions; not a claim of physical irreducibility |
| Engine improves discovery efficiency across materials | None yet | Open; pilot does not establish superiority |
| Real source intervals are globally sound | None in this release | Open scientific premise; evidence labels do not establish it |
| Source citations and input hashes certify physical truth | No such implication | Not claimed |
| All physical materials are represented | No exhaustive physical enumerator | Not claimed; guarantees are relative to the candidate universe |

## Why finite retrospective success cannot prove unconditional prediction

Suppose an unconstrained property predictor observes a finite archive D and must predict an unobserved candidate x. Without an assumption linking x to D, define two property functions f and h that agree on every archived point but assign different values at x. The predictor receives identical evidence in both worlds and must produce the same answer. Its answer cannot be exact in both; any fixed finite interval can be defeated by choosing the second world's value outside it.

The same construction reverses candidate rankings. Thus archive performance alone cannot prove universal predictive accuracy for arbitrary property functions. Regularity, mechanistic restrictions, scoped physical models, or probabilistic assumptions supply additional premises. Those premises must be stated and challenged. Lupine's global residual-Lipschitz assumption is one such substantive restriction; sampled smoothness does not establish its global validity.

The reusable result is the decision implication: **given justified enclosing intervals, the selector preserves feasible optima and reports a regret bound**. Retrospective evaluation can refute a proposed interval construction and measure its usefulness. It cannot remove the construction's assumptions merely by succeeding on a finite dataset.
