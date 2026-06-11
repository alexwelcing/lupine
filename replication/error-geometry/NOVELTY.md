# Novelty Charter — what Paper 2 may and may not claim

Synthesis of three adversarial prior-art sweeps (climate/forecasting/statistics;
ML/ensembles/sloppy-models; materials/DFT/approximation theory), 2026-06-11.
This document governs the claims language of the law paper. Rule: every claim
below carries its verdict and its required pre-citations; the paper must not
exceed this charter.

## Verdicts

| # | Claim | Verdict (3 sweeps) | Disposition |
|---|---|---|---|
| C1 | Ensemble errors concentrate on a shared low-dim direction | ANTICIPATED (ML: error consistency, prediction-space clustering) / ADJACENT (climate: EOF-of-bias) | Present as *measurement*, not discovery. Pre-cite Geirhos 2020, Mania 2019, Fort 2019, Brands 2022, Sanderson 2015. |
| C2 | Consensus measures the shared constraint, not truth | ANTICIPATED (Parker 2011, Pirtle 2010 qualitatively; Bishop & Abramowitz 2013 operationally; disagreement-tracks-bias in ML) | Present as *formalization* (normal-cone theorem) of a known insight. Must state how error-vector geometry exceeds pairwise error correlation (it identifies WHICH constraint, via factorial designs). |
| C3 | **Anisotropy is conserved; its direction rotates to the next binding constraint when a paradigm is replaced** | **CLEAR in all three literatures** | THE headline claim. Closest prior: Mao 2024 (shared training manifold), Huh 2024 (representation convergence), Tian & Dong 2020 (bias persistence) — none state conservation+rotation as a law. Frame as named, falsifiable law extending these. |
| C4a | Cross-architecture error-vector alignment from inherited reference bias, quantified (cos 0.95–0.99); one correction vector repairs all | ADJACENT (softening known qualitatively: arXiv:2405.07105, 2403.05729; "Errors that matter" 2026) | Claim the *quantitative directional* result and the rank-1-correction corollary; pre-cite the softening literature explicitly. |
| C4b | Factorial constraint-vs-implementation designs (4×2 functional×architecture; ACWF table×code) showing errors cluster by constraint | **CLEAR (design)** | Claim fully. No published factorial error-clustering analysis exists in either community. |
| C1m | Hyper-ribbon geometry of CROSS-MODEL error ensembles; 40-year conservation | ADJACENT — terminology collision with Kurniawan 2022 (single-model PARAMETER manifold) | Must explicitly distinguish: parameter-space sloppiness (theirs) vs observable-space ensemble error geometry (ours). Cite Kurniawan, Transtrum, Quinn prominently. |
| C5 | PR(d,ρ) gauge | ANTICIPATED (PR standard; spiked/equicorrelated covariance algebra standard) | Present as a *named gauge* (one-line corollary of spiked covariance) whose value is the three-estimator consilience + machine-checked monotonicity. No mathematics claimed. |
| C6 | Cauchy-violation as forced error direction; ensemble error-PCA of classical potentials | physics ANTICIPATED (textbook); error-geometry application CLEAR | Claim the application; cite Cauchy-relations literature as textbook. |
| C7 | Best-approximation orthogonality / normal cones | ANTICIPATED (Deutsch 2001; Kinderlehrer & Stampacchia 1980) | Cite as classical. Claim ONLY: the epistemic application + the machine-checked instantiation chain. |
| NEW | ACWF directional clustering by pseudopotential table | CLEAR (ACWF/Δ-project stop at scalar metrics; confirmed by sweep) | Claim fully; pre-cite Lejaeghere 2016, Bosoni 2024. |

## The three claims the paper stands on

1. **The conservation–rotation law (C3), now with three pre-registered/observational
   layers in one epistemic stack:** classical potentials (constraint = functional
   form), foundation MLIPs (constraint = training functional; S_func=+0.317 vs
   S_arch=−0.093, p=0.029), DFT implementations (constraint = pseudopotential
   table; S_table=+0.526 vs S_code=+0.265, p=0.017). Each registered test carried
   an explicit refutation condition; neither was triggered.
2. **The factorial method (C4b + ACWF design):** crossing constraint against
   implementation and reading the answer from error-vector clustering — the
   instrument that identifies WHICH constraint binds, strictly stronger than
   pairwise error correlation (Bishop–Abramowitz) or scalar reproducibility
   metrics (Δ/ε).
3. **The verified chain (C7 application):** convex normal-cone consensus theorem
   → bias+noise spectrum → PR gauge → collapse rate, machine-checked in Lean 4
   (0 sorry), bound to the empirical statistics by a written contract, with a
   two-tier replication kit. No comparable evidence stack exists in the
   adjacent literatures.

## Mandatory defensive sentences (verbatim or equivalent)

- "The mathematics of best approximation is classical (Deutsch 2001;
  Kinderlehrer & Stampacchia 1980); we claim only its epistemic application to
  model ensembles and the machine-checked instantiation chain."
- "Hyper-ribbon geometry was introduced for the parameter manifolds of single
  models (Transtrum et al.; Kurniawan et al. 2022); the object studied here is
  different — the error vectors of an ensemble of distinct models in
  observable space."
- "That multi-model agreement can reflect shared construction rather than
  truth is established qualitatively (Pirtle 2010; Parker 2011) and
  operationally via error correlation (Bishop & Abramowitz 2013); our
  contribution is the geometric formalization and the factorial designs that
  identify the binding constraint."
- "Systematic softening shared by universal MLIPs has been reported
  (arXiv:2405.07105); our contribution is its directional quantification
  across architectures and the demonstration that error geometry organizes by
  training functional, not architecture, under a pre-registered factorial test."

## Claims the paper must NOT make

- That shared/correlated ensemble errors are a new phenomenon (C1).
- That "consensus ≠ truth" is new (C2).
- That the PR formula is new mathematics (C5).
- Any unqualified use of "hyper-ribbon" without the parameter-vs-error-space
  distinction (C1m).
