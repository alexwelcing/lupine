# Pre-Registration: Round 2 — Axis Statistics, Decisive Anchors, Symmetric Kills

**Program:** projection law. **Status:** REGISTERED 2026-06-11, before any
round-2 computation. Incorporates every methodological objection from the
2026-06-11 adversarial review (statistics, physics, claims referees).

## Design principles (corrections to round 1)

1. **One primary endpoint per experiment.** All other registered quantities
   are secondary; no promotion of passing components from failed conjunctive
   tests.
2. **Axis-based primary statistics** (mandated by the decoupling theorem):
   primary alignment measure is the rank-one share / absolute-cosine family,
   sign-agnostic; signed cosines are secondary.
3. **Symmetric kill conditions.** Each primary endpoint registers an
   equivalence bound: the law's prediction is REFUTED if the 95% bootstrap
   CI (resampling over models) of the primary contrast lies inside
   [−0.10, +0.10], not only if the sign reverses.
4. **Bootstrap CIs over models for every reported statistic.**
5. **Registration–execution separation:** this document is committed ≥ one
   session before any round-2 model runs.

## Experiments

### R2-A: Functional ladder (dose–response)
PET-MAD v1.0 (PBEsol) and v1.5 (r2SCAN) via the existing harness hooks, plus
a clean LOCAL SevenNet-0 run (v7 cloud data is harness-corrupted and barred),
joining the 4×2 cells and PBE anchors. PRIMARY: ordered rotation — the mean
noble-metal (Au, Pt) C44 error component is monotone PBE < PBEsol < r2SCAN
(less negative along the ladder), tested by bootstrap over models; kill if CI
on the PBE→r2SCAN difference lies in [−0.05, +0.05]. SECONDARY: SevenNet-0
(PBE-lineage, 4th architecture family) joins the PBE cluster (axis-based).

### R2-B: The decisive reference anchor (physics referee's test)
Compute 0 K DFT-PBE elastic constants per element (Materials Project
elasticity workflow values, or own FD-DFT where missing) and re-reference the
MLIP layer against DFT-PBE instead of experiment. PRIMARY: the shared
PBE-model error direction vs EXPERIMENT is reproduced by the DFT-PBE-vs-
experiment difference vector (median per-element cosine ≥ 0.5 over FCC
metals); kill if CI inside [−0.2, +0.2]. This separates fitting residual from
inherited XC bias from thermal/ZP offsets — if PBE-trained models track
DFT-PBE but not experiment, the inherited-bias reading stands; if they miss
DFT-PBE too, the harness/protocol is implicated and the elastic layer is
withdrawn.

### R2-C: Harness hardening (blocking gate for R2-A/B)
Rerun Gate 0 in float64 with stress-based C44 as primary (energy-based as
cross-check), per-element C44 agreement reported separately (no pooling);
explicit spin-state protocol declared for Fe, Cr, Ni, V (spin-polarized
inference where the model supports it; elements failing a declared protocol
are excluded BEFORE analysis, listed here, not post-hoc).

### R2-D: ACWF replication with registered nesting
PRIMARY: S_table − S_code on the whitened (V0, B0) observable set (the
robustness-favored variant), bootstrap CI over methods; kill if CI inside
[−0.10, +0.10]. REGISTERED NESTED PREDICTION (no longer post-hoc): an
independent localized-orbital implementation (GPAW-LCAO or FHI-aims, if
obtainable) dis-aligns from its own pseudopotential/table group (axis-based
alignment below the plane-wave within-table CI) — the SIESTA mechanism,
tested on a code that played no role in forming the hypothesis. Family
assignments for any new methods are fixed in an amendment BEFORE their data
is parsed.

### R2-E: MatPES confound disclosure
Report N_train, element coverage, and per-architecture hyperparameters for
the PBE and r2SCAN cells (from the MatPES release docs); if the corpora
differ materially, the 4×2 conclusion is downgraded to "clusters by training
distribution" wherever cited.

## Bookkeeping
- All outputs append to `robustness_results.json` schema; analysis scripts
  extend the Tier-1 kit so every round-2 statistic is kit-verifiable.
- The conjecture-ledger "14/15 on-ribbon" entry is settled only by the
  D1-bucket recomputation (out of round-2 scope; requires worker data).
