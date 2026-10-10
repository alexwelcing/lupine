# Lupine Discovery — development contract

Build a representation-independent, evidence-aware candidate recommendation engine.
Universal means the mathematical statements quantify over arbitrary candidate sets,
objectives, constraints, and sound intervals; it does not mean unconditional physical
accuracy, a universal descriptor, or complete enumeration of undiscovered matter.

## Working rules

- Keep the core exact: Python `fractions.Fraction`; decimal JSON inputs are strings.
- Preserve unknown, incompatible, refuted, and uncertified states explicitly.
- Never promote a sampled Lipschitz check into a global smoothness certificate.
- Separate mathematical implications, measured evidence, and software verification.
- A receipt hash proves identity, not physical validity or training independence.
- Preserve upstream provenance, licensing, counterexamples, and failed evaluations.
- No paid compute, deployments, or messages to third parties are needed for this project.
- Tests must challenge soundness and boundary behavior, not merely repeat examples.
- Formal modules must build without admitted proofs or extra axioms. Report what
  was actually compiled; source inspection is not build verification.
- Do not claim the Python runtime is formally refined from Lean unless that bridge
  has actually been proved. Differential tests are executable conformance evidence.

## Architecture

- `src/lupine_discovery/core.py`: pure exact interval selector and certificate data.
- `src/lupine_discovery/envelope.py`: scoped residual anchors and correction bounds.
- `src/lupine_discovery/evidence.py`: provenance, semantic scope, evidence status.
- `src/lupine_discovery/replay.py`: hidden-outcome retrospective evaluation.
- `src/lupine_discovery/cli.py`: deterministic JSON CLI; never an LLM ranking path.
- `formal/`: standalone Lean/Mathlib statements for arbitrary real-valued problems.
- `tests/`: adversarial, exhaustive finite-world, serialization and replay checks.
- `docs/`: specification, proof/evidence map, and four-day project record.

## Shared API contract

Core public types (frozen dataclasses):

```
Interval(lower: Fraction, upper: Fraction)
Candidate(candidate_id: str, score: Interval, constraints: dict[str, Interval])
select(candidates: Sequence[Candidate]) -> Selection
```

All candidates share the same constraint keys. Minimize score; constraints mean
`g_j <= 0`. Reject duplicate IDs, inverted intervals, and mismatched constraints.
Selection exposes `certified_feasible`, `possible_feasible`, `retained`,
`certified_infeasible`, `dominated`, `incumbent`, `threshold`, `regret_bound`.
ID collections are deterministic sorted tuples; optional scalar fields use `None`.
`incumbent` is a candidate ID or None, choosing minimum upper score then ID.
When no certified-feasible incumbent exists, retain all possibly feasible candidates.
When possible feasibility is empty, report certified infeasibility of this finite
universe only. No arbitrary top-k truncation of the certified retained pool.

No empirical evidence status is hidden inside the pure core. A separate evidence
contract declares whether the input interval premises are mathematical, empirical,
assumed, or missing. Core conclusions are conditional on sound inputs.
