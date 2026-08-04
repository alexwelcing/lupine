# Projected Hyper-Ribbon Release

**Status: Open**

## Claim

The next release-worthy hyper-ribbon should be a theorem-backed projected-ribbon
gate, not a static threshold file. A candidate policy should decompose residual
correction into stiff-axis and orthogonal-complement components, accept
corrections inside a projection tube, refuse stiff-dominated or rank-inadequate
cases, and preserve the no-regression accuracy commitment.

## Research Team Kickoff

Launched on 2026-06-01 for the next winning ribbon release.

Lanes:

- Lean proof surface: identify small, no-sorry theorem additions in
  `lean-spec/`.
- Hyper-ribbon math: turn spectral-v4 evidence into theorem-shaped obligations.
- Runtime bridge: map theorem lanes into versioned `ribbon_version` policy and
  MLIP evidence artifacts.
- Control plane: keep the work visible in `glim-think`, the conjecture ledger,
  and agenda-backed follow-up tasks.

## Formal Target

Start from existing proved/spec modules:

- `Materials/Theory/HyperRibbon`
- `Materials/Validation/RankGate`
- `Materials/Theory/ParameterBound`
- `Materials/Theory/UniversalityBridge`
- `Materials/Theory/AccuracyCommitment`

Candidate theorem-development lanes:

- `stiff_axis_preservation`
- `orthogonal_complement_lift`
- `projection_tube_refusal`
- `vandermonde_decay`

Candidate release name:

- `hyperribbon-mptrj-projection-tube-v4.1`

The first Lean objective is a small additive proof package that strengthens the
existing compression/rank gates without importing broad ATLAS subjects or
turning empirical MLIP measurements into theorem claims.

The first theorem package should use scalar certificates before attempting a
full SVD formalization. A `ProjectedRibbonCertificate` can carry complement
fraction, stiff fraction, projection distance, stiff drift, projected support
lift, support-error floor, and thresholds. Theorems should prove the gate logic:
complement dominance bounds stiff motion, accepted projection-tube corrections
imply bounded projection distance and stiff drift, and accepted measured
improvements satisfy the Distill accuracy commitment.

## Evidence Gate

Promotion requires replay and then cloud evidence:

- validate the locked spectral-v4 diagnostic artifact;
- run a local projected-ribbon replay over sealed MPtrj artifacts;
- require no pair-level regressions, positive mean lift, bounded stiff-axis
  motion, and explicit refusal outside the projection tube;
- only after replay passes, consider a fresh Cloud Run canary with the new
  policy hash.

## Boundary

Lean owns structural proof obligations. `atlas-distill` owns runtime scoring,
fault-line extraction, and policy search. MLIP runners own backend execution and
measured evidence. A runtime heuristic can motivate a theorem lane, but it is
not the theorem.
