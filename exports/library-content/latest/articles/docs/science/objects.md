# The three error-geometry objects (read this before writing "ribbon")

"Low-dimensional error" in this corpus refers to **three different objects**. They are
related but not identical, and conflating them produces real mistakes (it produced
several in a 2026-06-02 working session). This page is the canonical disambiguation;
everything else should link here rather than re-define the terms.

The literature foundation is
[`archive/swarm_preprint_review/research/immi_dim01_sloppy_theory.md`](../../archive/swarm_preprint_review/research/immi_dim01_sloppy_theory.md)
(25+ primary sources). Read it for the full chain; this is the compressed map.

## At a glance

| | **A. Model manifold** (the *hyper-ribbon*) | **B. Participation-ratio measure** | **C. Configuration-space error core** |
|---|---|---|---|
| Lives in | model **prediction / data** space | observable space (e.g. C11/C12/C44) | **configuration** space `Ω ⊂ ℝᵐ` |
| Is | image `y(θ)` of the prediction map as parameters vary; a bounded manifold with a geometric **hierarchy of widths** `Wₙ ~ W₀·Δⁿ` | `PR = (Σλ)²/Σλ²` of the **error covariance** across potentials — a scalar effective-dimension *measurement* | a low-dim core `H` with the error boundary a **codim-1 tube** around it (`dim Γ = m−1`) |
| Role | the *theory* object: why errors are low-dimensional | the *empirical handle*: how we measure A from data | a distinct, more demanding *rigor* object |
| Source | Transtrum–Machta–Sethna, PRL 104 060201 (2010); PRE 83 036701 (2011) | participation-ratio defn (Cell Reports Methods 2022); `immi_dim01` §4 | repo-root PDF *"A Conditional Universality Theorem for Error Geometry in MLIPs"* |
| In this repo | the framing; `docs/sloppy_models_report.md` | `lupine-distill/src/hypothesis/manifold.rs`; `HyperRibbonEmpirical.lean` | not yet built; `docs/science/keystone-reconciliation.md` |
| Status | established theory | **standard, correct usage** (B measures A) | **conditional** theorem; assumptions untested |

## A — the model manifold (this is what "hyper-ribbon" *means*)

The model manifold is the surface `y(θ)` swept out in **prediction space** as the
parameters `θ` vary over all allowed values; the parameters are coordinates on it and the
metric is the Fisher information `gₐᵦ = JᵀJ`. For sloppy models the manifold has a
**hierarchy of widths decreasing geometrically** — much longer than it is wide, much wider
than it is thick — a *hyper-ribbon* (Transtrum–Machta–Sethna 2010/2011). The widths track
the Fisher eigenvalue spectrum; the hierarchy follows from interpolation/approximation
theory and model smoothness (Quinn et al. 2019/2023). Interatomic potentials are in this
class (Frederiksen 2004; Wen 2017 [OpenKIM]; Kurniawan 2022). **When this corpus says
"hyper-ribbon," it means object A.**

## B — the participation-ratio measure (how we see A in the data)

We do not observe `y(θ)` directly; we observe **prediction errors** of many potentials on a
few properties. Stacking each potential's error vector (e.g. `[C11_err, C12_err, C44_err]`),
forming the error covariance, and taking the **participation ratio**
`PR = (Σλᵢ)²/Σλᵢ²` gives the *effective dimensionality* of that error cloud — a scalar
between 1 and the nominal rank. The IMMI corpus measures `PR ≈ 1.05–1.86` of 3 (a near-1D
ribbon with a thin secondary direction). This is the **standard, literature-sanctioned way
to measure the effective dimensionality of A from data** (`immi_dim01` §4). It is computed
in [`lupine-distill/src/hypothesis/manifold.rs`](../../lupine-distill/src/hypothesis/manifold.rs)
and recorded in `lean-spec/.../Theory/HyperRibbonEmpirical.lean`.

> **Caveat (do not skip).** B is a *linear* effective-dimension measure and the elastic
> constants share structural components (the **Cauchy relation**, mechanical-stability
> constraints). Jackson–Somers (1991) and Archie (1981) show such shared components produce
> a **non-zero baseline correlation / PR** independent of any shared physics. Any PR or
> cross-model-alignment claim must therefore be tested against a **coupling-aware null**,
> not against `r = 0`. (This is exactly the control the 2026-06-02 A6 test still lacks.)

## C — the configuration-space error core (a different, harder object)

The repo-root keystone paper studies a different thing: the geometry of the high-error
region in **configuration space** `Ω ⊂ ℝᵐ`. It proves a **conditional** universality —
*if* there is a shared low-dim core manifold `H ⊂ Ω` (positive reach), a common monotone
radial error profile, and small model-specific perturbations, *then* each model's high-error
region is a tube around `H` and the boundaries are pairwise diffeomorphic. Two cautions the
paper makes decisively:

- the error **boundary** level set is dimension **`m−1`, not low**; the low-dim object is the
  core `H`. A measure-theoretic *concentration* (like B) must **not** be called a manifold.
- bridging "errors are sloppy / low-PR" (A/B, parameter & observable space) to "there is a
  shared configuration-space core" (C) requires a **strongly nonstandard** assumption (the
  paper's "A6": different models share spatial error modes) that **must be tested**.

C is **not** the same as A. It is a separate, rigor-first reframing, and the open scientific
question is whether the A→C bridge (A6) holds. See
[`keystone-reconciliation.md`](./keystone-reconciliation.md).

## How they relate (one sentence)

**B is the empirical measure of A; C is a distinct configuration-space object whose link to
A/B is the untested A6 bridge.** A and B are the established program (correct usage). C is the
frontier.

## Which repo claims attach to which object

| Claim / artifact | Object | Note |
|---|---|---|
| Hyper-ribbon framing; `sloppy_models_report.md` | A | the theory |
| `HyperRibbonEmpirical` PR ≈ 0.40 fractional; `manifold.rs` | B | the measurement of A; coupling caveat applies |
| `hyper-ribbon-universality` / `mlip-transfer` conjectures | A via B | survival of the low-PR structure across potentials/MLIPs |
| `RibbonProjection.lean` | **none cleanly** | a scalar toy; not A, B, or C — keep as a concentration lemma, not "the ribbon formalized" |
| keystone paper + `keystone-reconciliation.md` | C | conditional; A6 untested |
| A6 alignment test (`a6-alignment-results.md`) | A→C bridge | provisional; coupling-aware null still owed |

## Decision guide — when you write "ribbon," say which

- Means *the structure in prediction space / why errors are low-dim* → **A** (cite Transtrum).
- Means *a measured effective dimensionality (a PR number)* → **B** (state the null you tested against).
- Means *a configuration-space error manifold/core* → **C** (it is conditional; name the assumptions).

If you cannot say which one, the statement is not yet precise enough to publish.
