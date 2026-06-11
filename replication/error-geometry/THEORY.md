# Theory ↔ Experiment Contract

Every empirical statistic in this kit instantiates a machine-checked theorem.
The Lean sources live in `lean-spec/OpenDistillationFactory/Materials/Theory/`
(`lake build` in `lean-spec/`; zero `sorry`, zero new axioms). Nothing below
depends on trusting any experiment; the experiments only measure where the
theorems' hypotheses hold.

## The projection law (`ProjectionLaw.lean`)

A model family is idealized as a subspace `K` of observable space (the
linearized reachable set); fitting is best approximation of the truth `T`.

| Theorem | Statement | Empirical face |
|---|---|---|
| `IsBestApprox.residual_inner_eq_zero` | a best approximation's residual is orthogonal to the family (variational argument; no completeness, no projection API) | errors of well-fitted models point along the family's normal direction |
| `IsBestApprox.unique` | best approximations onto a subspace are unique | within a converged family there is one residual to find |
| `IsBestApprox.residual_eq` | **consensus theorem**: any two best approximations of the same target share an identical residual | within-family error correlation r ≈ 0.95 across 559 classical potentials; cross-architecture cosine ≈ 0.98 on Au for PBE-trained MLIPs |
| `IsBestApprox.residual_eq_zero_iff` | the residual vanishes iff the truth is in the family | nonzero shared error = signature of a binding constraint (functional form, XC functional, or harness) |

Interpretive consequence, now formal: **agreement among models sharing a
constraint measures the constraint, not the truth.**

## The PR gauge (`ErrorGeometry.lean`)

Errors modeled as shared bias `b` plus isotropic noise `σ` in `d` dimensions,
`ρ = |b|²/σ²`:  `PR(d, ρ) = (ρ + d)² / ((ρ + 1)² + (d − 1))`.

| Theorem | Statement | Empirical face |
|---|---|---|
| `prBiasNoise_zero` | PR(d, 0) = d | an immature (variance-dominated) family fills observable space |
| `one_le_prBiasNoise`, `prBiasNoise_le_dim` | 1 ≤ PR ≤ d | observed PR ∈ [1.05, 2.09] out of 3, every ensemble, every paradigm, 40 years |
| `prBiasNoise_strictAnti` | PR strictly decreases in ρ (key identity: N₁D₂ − N₂D₁ = (d−1)(ρ₂−ρ₁)(2ρ₁ρ₂ + d(ρ₁+ρ₂))) | PR is a *gauge*: median PR 1.28 inverts to ≈93% systematic error fraction for the classical corpus |
| `systematicFraction_*` | α = ρ/(ρ+1) ∈ [0, 1) | the three-estimator consilience (PR, within-family r, rank-1 share → 0.93/0.95/0.96) |

## Ribbon/consensus decoupling (`ErrorGeometry.lean`)

| Theorem | Statement | Empirical face |
|---|---|---|
| `axisSecondMoment_sign_blind` | the shared-axis second moment is invariant under per-model sign flips | rank-1 share stays 0.56–0.94 at n = 8–11 models even where mean signed cosine ≈ 0 |
| `axis_pr_one` | a shared-axis ensemble has PR = 1 for any sign pattern | the error *axis* is element-intrinsic |
| `ribbon_consensus_decoupled` | identical ribbons (PR = 1) admit mean alignment 1 or −1/3 | V/Cr: cross-MLIP cosine ≈ −0.88 along a shared line — same constraint axis, functional-dependent sign |

PR detects the **axis**; alignment detects **sign coherence**. They are
provably distinct order parameters — which is why the Tier-1 analysis reports
both, and why pre-registration round 2 will use axis-based statistics.

## What is NOT yet formalized (honest gaps)

- The projection law for *nonlinear* reachable sets (normal-cone version);
  the subspace case is the linearization.
- The bias+noise spectrum derivation from vector ensembles (the spectrum is
  currently taken as the model's definition; the rank-one-update eigenvalue
  computation is standard but unformalized).
- Any statement about *which* constraint binds (that is the empirical
  content; the theorems say only that a shared residual implies a shared
  constraint).
