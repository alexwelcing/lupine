# Reconciling the ribbon program with the keystone paper

> ⚠️ **Self-correction (2026-06-02, after reading the repo's own literature review).**
> This note's "category error" framing (§2) was **overstated**. The repo's
> participation-ratio-of-error-covariance ("object B" in
> [`docs/navigation.md`](../navigation.md)) is the *standard* sloppy-model measure of
> the effective dimensionality of the model manifold ("object A", Transtrum–Sethna) —
> documented with primary sources in
> [`archive/swarm_preprint_review/research/immi_dim01_sloppy_theory.md`](../../archive/swarm_preprint_review/research/immi_dim01_sloppy_theory.md).
> That is **correct, literature-sanctioned usage**, not an elementary mistake. The
> keystone paper's configuration-space core ("object C") is a *distinct, more
> advanced* question, and the genuine open issue is the **A6 bridge** (B/A → C), not
> that the repo misuses the measure. Also: the A6 test in §7 does **not** control for
> elastic-constant **mathematical coupling** (Cauchy relation / stability), which
> Jackson–Somers (1991) and Archie (1981) show produces a non-zero baseline
> correlation — so that result is **provisional** until the coupling-aware null is
> run. Read the rest of this file with those two corrections in mind.

> After reading *"A Conditional Universality Theorem for Error Geometry in
> Machine-Learning Interatomic Potentials"* (the 20-page PDF at repo root). The paper
> says several things that the repo's hyper-ribbon framing — and my own
> `RibbonProjection.lean` and the live campaign — get wrong or assume away. Page/
> assumption references are to that PDF.

## 1. What the paper actually proves

Not an unrestricted universality. The paper's **first conclusion is that an
unrestricted universality claim is false**; only a *conditional* theorem holds. The
structure it requires:

- A fixed **scalarized error field** `q_M(x) = ‖r_M(x)‖²`, where the residual is the
  **stacked** vector `r_M = [w_E(E_M−E*), w_F·vec(F_M−F*), w_σ·vec(σ_M−σ*)]` with
  **fixed weights across the class** (else "universality" is manufactured by changing
  the metric).
- A shared compact **core manifold `H ⊂ Ω`** in *configuration* space, with positive
  reach `τ_H`, a common monotone **radial profile `ψ`**, and small model-specific
  perturbations `η_M`.
- **Exact theorem** (A0,A1,A2,A5): the high-error region is a *tube* around `H`,
  `S_{M,ε} = {dist(x,H) ≤ r̄_M}`, the boundary `Γ_{M,ε}` is `C¹`-diffeomorphic to the
  unit normal bundle `S(NH)`, and **all models' boundaries are pairwise
  diffeomorphic** — that is the universality. **`dim Γ = m−1`**.
- **Perturbative theorem** (adds `η_M`, `‖∂_sη_M‖ < a_M c_ψ`): the boundary survives
  as a `C¹` hypersurface; radius perturbation `‖r_M − r̄_M‖ ≤ δ_M/(a_M c_ψ − L_M)`.
- **Fisher→geometry proposition**: Fisher-spectrum decay bounds the geometric
  perturbation **only under A6**, the *common-spatial-mode separability* assumption.

The paper's own assumption ledger marks **A2/A3 "nonstandard / reasonable only if a
shared error core exists"** and **A6 "strongly nonstandard… should be treated as an
empirical hypothesis,"** stating plainly: *"Neither assumption follows from
pretraining scale alone, and both must be tested rather than presumed."*

## 2. The category error the repo (and I) made

The paper's **third conclusion is "terminological but decisive."** There are several
different "low-dimensional error" objects and they must not be conflated:

| object | where it lives | dimension | the repo's name for it |
|---|---|---|---|
| error-**vector** covariance concentration (PR<2 of C11/C12/C44 errors) | **output/observable** space | "low" (PR) | "the hyper-ribbon" / `HyperRibbonEmpirical` |
| error-**boundary** level set `Γ_{M,ε}` | **configuration** space `Ω⊂ℝᵐ` | **m−1** | — |
| shared **core** `H` | **configuration** space | low (`d`) | — |

The repo measures the **first** (participation ratio of the error-vector covariance,
`maxEmpiricalFractionalDimensionality = 0.398`) and calls it a low-dimensional error
**manifold**. The paper's theorem is about the **third** (a configuration-space core
`H`), and it explicitly warns that the boundary object is `m−1`-dimensional, *not*
low — and that a measure-theoretic concentration **must not be called a manifold**.
**These are different objects, and the program has been equating them.**
`HyperRibbon.hyper_ribbon_bound_3d` (a PR bound under eigenvalue decay) is an
output-space *sloppiness* statement; it is the *Fisher-decay side*, not the geometry.

## 3. The load-bearing assumption nobody stated: A6

To get from "error vectors are sloppy / low-PR" (parameter/output space, where
`ParameterBound`'s Jacobian-rank→PR argument lives) to "there is a shared
configuration-space error core" (the geometry), you must cross the **Fisher→geometry
bridge**, which the paper proves **only under A6** and flags as strongly nonstandard.
The repo's chain `ParameterBound → HyperRibbon → distill correction` **silently
assumes A6**. That is the real gap: not a missing theorem, a missing — and
empirically untested — *hypothesis*.

## 4. My own contributions, honestly graded against the paper

- **`RibbonProjection.lean`** formalizes a 2-D parallel/orthogonal scalar
  decomposition with a clean correction. That is a *parameter/output-space toy*. It
  is internally valid (kernel-checked) but it does **not** formalize the paper's
  theorem, and its tidy orthogonal split is exactly the separability the paper says is
  the hard, nonstandard part. At best it is a *concentration lemma*; it should be
  relabeled as such and must not be read as "the ribbon, formalized." The paper even
  gives the **right** skeleton (`ErrorGeomData` + `exact_tubular_universality`,
  p.15–16): reach uniqueness + 1-D monotonicity + explicit inverse — that is what a
  faithful Lean effort should mechanize.
- **The live campaign** measured energy / forces / stress as *separate* MAEs. In the
  paper's frame the object is the **joint** `q_M = ‖r_M‖²`. The distill correction
  moved only the `w_E` block of `r_M` (energy), leaving the `w_F`, `w_σ` blocks
  untouched (forces/stress Δ≈0). So for any evaluation with `w_F,w_σ > 0` (i.e.
  anything dynamical) the correction barely changes `q_M`'s structure. This is the
  paper's own cited failure mode: *"good energy/force scores need not imply robust
  vibrational-property performance."* My "promote" call ignored that the meaningful
  error field is the joint one.

## 5. The experiments that would actually advance this (from the paper's §Protocols)

Not more energy-MAE cells. The paper's diagnostics table (p.14–15) names them:

1. **Core dimension `d`** — local PCA / manifold estimator on **pooled high-error
   points in configuration space** (not error vectors in observable space), with a
   **threshold sweep** (the exact theorem gives `dε_M/dr̄_M = 2ε_M/(a_M|ψ'(r̄_M)|)`;
   small `ε` ⇒ unstable geometry). Failure: sharp instability under nearby thresholds.
2. **Cross-model alignment — the direct test of A6.** Principal-angle / shared-core
   statistic across models with a **stratified permutation null** (permute model
   labels within strata; report Monte-Carlo p). Failure: *not stronger than the
   shuffled null.* If A6 fails here, Fisher decay must **not** be read geometrically,
   and the whole ribbon-transfer story is unsupported.
3. **Stability margin `M_M = a_M c_ψ − L_M`** with blocked-bootstrap CIs (blocks =
   materials / trajectories, never atomic frames). Failure: CI overlaps zero.

Validation contract the paper recommends: fit locally on **MatPES/MPtrj**, scale-test
on **OMat24**, task-utility on **Matbench Discovery**, stress assumptions on **MLIP
Arena / LAMBench / MOFSimBench / phonon** benchmarks.

## 6. Honest verdict

- The ribbon's *existence as an output-space concentration* is real and interesting,
  but it is **not** the configuration-space universal core the keystone theorem is
  about, and the program has been treating them as one.
- The bridge between them (A6) is **assumed, not tested**. Until a cross-model
  alignment test beats a permutation null, "the ribbon transfers / is universal /
  is correctable" is an empirical hypothesis wearing a theorem's clothes.
- The distill correction, measured against the *joint* residual the paper insists on,
  is an energy-block recalibration — which is why forces/stress/elastic did not move.
  Nothing here justifies promotion.

The single highest-value next step is experiment **#2**: test A6 directly.

## 7. First A6 test — done (pilot)

Built [`tools/a6_alignment_test.py`](../../tools/a6_alignment_test.py) and ran it on the
force-error field (3 MLIPs × 5 shared structures = 107 atoms, 5000 stratified
permutations) — see
[a6-alignment-results.md](../glim-m3-upgrade/runs/a6-alignment-results.md). The answer is
**not the clean negative I'd braced for, and not the unrestricted positive the program
assumed — it's the paper's *conditional* middle**:

- **Real shared structure:** all three MLIPs concentrate force error on the **same
  atoms** (`mag_corr` 0.70–0.86, p≤0.0002, far above the stratified null) and err in
  correlated directions (`atom_cos` 0.2–0.3, significant). A6 has genuine empirical
  support at the force-field level — the first such evidence in the repo.
- **But conditional:** whole-field alignment is heterogeneous; **CHGNet is a partial
  outlier** (large model-specific perturbation `η_M`), independently echoing the
  campaign's finding that CHGNet is the backend distill regressed. So the correct
  formal object is the **perturbative** tubular theorem with per-model `δ_M`, not the
  exact/unrestricted claim — and not a per-model exception table.

Pilot scale (107 atoms, one manifold) — the definitive test is the paper's
MatPES/MPtrj/OMat24 protocol with blocked bootstrap over materials. But the method now
exists and the first signal is in: the ribbon's shared structure is **real on forces
and conditional**, exactly the regime the keystone theorem governs.
