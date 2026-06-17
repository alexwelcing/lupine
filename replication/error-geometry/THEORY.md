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
| `one_le_prBiasNoise`, `prBiasNoise_le_dim` | 1 ≤ PR ≤ d | observed PR ∈ [1.00, 2.29] out of 3, every ensemble, every paradigm, 40 years |
| `prBiasNoise_strictAnti` | PR strictly decreases in ρ (key identity: N₁D₂ − N₂D₁ = (d−1)(ρ₂−ρ₁)(2ρ₁ρ₂ + d(ρ₁+ρ₂))) | PR is a *gauge*: median PR 1.09 (pinned 42-potential dataset) inverts to ≈98% systematic error fraction for the classical corpus |
| `systematicFraction_*` | α = ρ/(ρ+1) ∈ [0, 1) | the three coupled diagnostics (PR inversion, within-family r, rank-1 share → 0.98/0.95/0.96; algebraically related, read as internal consistency) |

## Ribbon/consensus decoupling (`ErrorGeometry.lean`)

| Theorem | Statement | Empirical face |
|---|---|---|
| `axisSecondMoment_sign_blind` | the shared-axis second moment is invariant under per-model sign flips | rank-1 share stays 0.56–0.94 at n = 8–11 models even where mean signed cosine ≈ 0 |
| `axis_pr_one` | a shared-axis ensemble has PR = 1 for any sign pattern | the error *axis* is element-intrinsic |
| `ribbon_consensus_decoupled` | identical ribbons (PR = 1) admit mean alignment 1 or −1/3 | V/Cr: cross-MLIP cosine ≈ −0.88 along a shared line — same constraint axis, functional-dependent sign |

PR detects the **axis**; alignment detects **sign coherence**. They are
provably distinct order parameters — which is why the Tier-1 analysis reports
both, and why pre-registration round 2 will use axis-based statistics.

## The convex generalization (`ConvexProjection.lean`)

The law beyond linear families: convexity of the reachable set suffices.

| Theorem | Statement | Empirical face |
|---|---|---|
| `IsBestApproxOn.residual_mem_normalCone` | obtuse-angle criterion: the residual lies in the normal cone of the family at the fitted point | "errors point at the binding constraint" in its general form |
| `IsBestApproxOn.unique` | best approximations onto a convex family are unique (two variational inequalities sum to `‖p₁−p₂‖² ≤ 0`) | one residual per (family, target) |
| `IsBestApproxOn.residual_eq` | consensus theorem on convex families | within-family agreement generalizes past linearization |

## The affine decomposition (`AffineDecomposition.lean`)

For a closed affine reachable set `K = a + L`, the projection-law residual
`T - p` decomposes as a shared bias `b = T - p*` in `direction(K)ᗮ` plus a
within-family component `ξ(p) = p* - p` in `direction(K)`.

| Theorem | Statement | Empirical face |
|---|---|---|
| `AffineDecomposition.AffineFamily.decomposition` | `T - p = b + ξ(p)`, with `b ⟂ ξ(p)`, `b ∈ direction(K)ᗮ`, `ξ(p) ∈ direction(K)` | the shared bias / within-family split behind the bias+noise gauge |

## The smooth non-convex projection law (`SmoothProjection.lean`)

Local normal-cone theorem for `C¹` immersions `ℝᵏ → E`. Curvature is not
assumed away; the result is a first-order normal-cone statement at a local
minimizer.

| Theorem | Statement | Empirical face |
|---|---|---|
| `SmoothProjection.SmoothFamily.residual_orthogonal_to_tangent` | the residual at a local minimizer is orthogonal to the tangent space | local fitting minima still point at the binding constraint |
| `SmoothProjection.SmoothFamily.local_consensus_weak` | nearby local minimizers that land on the same fitted point share the same residual | finite sampling of a non-convex family still clusters around one residual direction |

## Finite-sample concentration (`FiniteSampleConcentration.lean`)

Binds noisy finite ensembles to the second-moment operator used by the gauge.

| Theorem | Statement | Empirical face |
|---|---|---|
| `empiricalSecondMoment_entrywise_concentration` | Hoeffding: entrywise deviation of `M̂ₙ` from `M` is `≤ 2 exp(-n ε² / (2 B⁴))` | the sample covariance/PR used in experiments converges to the population operator |
| `participationRatioMatrix_continuous` | `PR(M) = (tr M)² / tr(M²)` is continuous when the denominator is non-zero | small matrix perturbations do not jump the PR gauge |

## The spectrum bridge (`SpectrumBridge.lean`)

Closes the chain from vectors to the gauge.

| Theorem | Statement | Empirical face |
|---|---|---|
| `biasNoiseOp_eigen_bias` / `_orth` | the second-moment operator `⟪b,·⟫•b + σ²·id` has eigenvalue `‖b‖²+σ²` on the bias axis and acts as `σ²·id` on the entire orthogonal complement | the "one big eigenvalue + noise floor" spectra of Fig. 1 |
| `prSpectrumFin_smul` | PR is scale-invariant | the σ² unit drops out of every measurement |
| `prSpectrumFin_biasNoise` | PR of the bias+noise spectrum **equals** the closed-form gauge: the gauge is a theorem, not a definition | the PR(ρ) inversion (median 1.28 → 93% systematic) is now derived end-to-end |
| `prBiasNoise_sub_one_le` | quantitative ribbon collapse: `ρ ≥ d ⇒ PR − 1 ≤ 3(d−1)/ρ` | why 40 years of potentials sit at PR ≈ 1.3: mature families are *provably* ribbon-confined at an explicit rate |

## The complete machine-checked chain

    convex family + fitting            (ConvexProjection: normal cone, uniqueness)
      ⇒ one shared residual            (ConvexProjection/ProjectionLaw: consensus)
      ⇒ affine decomposition           (AffineDecomposition: bias + within-family)
      ⇒ smooth non-convex local law    (SmoothProjection: tangent-space orthogonality)
      ⇒ finite-sample concentration    (FiniteSampleConcentration: M̂ₙ → M entrywise)
      ⇒ bias-plus-noise second moment  (SpectrumBridge: eigen-structure)
      ⇒ PR equals the gauge            (SpectrumBridge: prSpectrumFin_biasNoise)
      ⇒ ribbon collapse at rate 3(d−1)/ρ   (SpectrumBridge: prBiasNoise_sub_one_le)
      with PR sign-blind vs alignment sign-sensitive  (ErrorGeometry: decoupling)

## What remains OUTSIDE the formal layer (by design)

- Claims about *which* constraint binds — that is empirical content by
  construction: the theorems say a shared residual implies a shared
  constraint, and the experiments identify it (functional form, XC
  functional, or harness).
