# Pre-Registration: Functional × Architecture 2×2 — The Decisive In-Domain Test of the Projection Law

**Program:** Lupine Science — hyper-ribbon / error-geometry
**Date registered:** 2026-06-11
**Status:** PROPOSED — register in claims ledger before any model is run
**Supersedes/extends:** `hyp_orthogonal_mlip_errors`, `hyp_equivariance_ribbon`, `research_note_au_reconciliation_2026_05_05`

---

## The law under test (in-domain form)

A model family's prediction errors concentrate along the perpendicular from truth
to the family's reachable set. For foundation MLIPs the binding constraint is not
the architecture but the training reference theory. Therefore the dominant error
direction is **inherited from the exchange-correlation functional of the training
data**, and is invariant to architecture.

Evidence so far (2026-06-11, n=3 PBE-trained models, experimental references):
shared all-negative C44-heavy error direction on FCC metals (Au mean rel. err.
(−0.32, −0.27, −0.79); cross-architecture cosine 0.98); rank-1 share of squared
error ≥ 0.84 for 14/15 elements; Ni (near-zero error) as internal harness control.
Confound not yet excluded: all three models train on PBE-derived corpora, so
"shared functional" and "shared corpus practice" are entangled. This experiment
disentangles them.

## Why now

The MatPES release (2025) provides, for the first time, **the same curated
training distribution in two functionals (PBE and r2SCAN) with the same two
architectures trained on each** (M3GNet and TensorNet). This is the clean 2×2
the law requires; no other public asset offers it.

## Design

**AMENDED 2026-06-11, prior to any model execution:** matgl 4.0.2 provides FOUR
architectures trained on MatPES in BOTH functionals. Design expands from 2×2 to
4×2 with thresholds unchanged:

| | MatPES-PBE (2025.2) | MatPES-r2SCAN (2025.2) |
|---|---|---|
| **M3GNet** | M3GNet-PES-MatPES-PBE-2025.2 | M3GNet-PES-MatPES-r2SCAN-2025.2 |
| **TensorNet** | TensorNet-PES-MatPES-PBE-2025.2 | TensorNet-PES-MatPES-r2SCAN-2025.2 |
| **CHGNet** | CHGNet-PES-MatPES-PBE-2025.2.10 | CHGNet-PES-MatPES-r2SCAN-2025.2.10 |
| **QET** | QET-PES-MatPES-PBE-2025.2 | QET-PES-MatPES-r2SCAN-2025.2 |

Anchors (already run): MACE-MP-0-small, CHGNet (MPtrj), Orb-v3 (OMat24) — all
PBE-lineage — these add a **dataset axis**: MPtrj/OMat24-PBE vs MatPES-PBE with
functional held fixed. CHGNet appears in both MPtrj-PBE and MatPES-PBE/r2SCAN
variants, giving an architecture-held-fixed dataset contrast as well.
Optional dose-response extension: PET-MAD v1.0 (PBEsol) and v1.5 (r2SCAN) — the
PBE → PBEsol → r2SCAN ladder predicts ORDERED rotation of the noble-metal C44
error component (progressively less negative).

All runs through the LOCAL strain-energy harness (`mlip_immi/`), ε_max = 0.5%,
15 IMMI elements, experimental reference table (`REFERENCE_ELASTIC_GPA` in
`tools/mlip_kimi_evidence.py`). Born screen (C11>0, C44>0, C11>|C12|) applied
identically to every cell. The corrupted v7 cloud harness is NOT used.

## Gate 0 — harness validation (blocking)

Before any new model runs: reproduce published elastic constants for MACE-MP-0
(matbench-discovery / MatCalc-published values) on ≥ 5 elements to within 15%,
or reconcile the discrepancy in writing. Motivation: Au C44 error of −80% across
all three local models exceeds literature PBE softening (~−25 to −40%); the
2026-05-05 Au reconciliation note shows aggregation subtleties are real. A
harness bias shared across cells would NOT invalidate the 2×2 contrast (it
cancels in between-group comparisons) but would corrupt the direction estimate b̂.

## Pre-registered predictions and falsification thresholds

Let cos_within = mean pairwise error-vector cosine across architectures WITHIN a
functional (A–C and B–D), and cos_between = mean cosine BETWEEN functionals
(A–B, A–D, C–B, C–D), computed per element over Born-stable FCC elements.

- **P-A (alignment by functional):** median over FCC elements of cos_within ≥ 0.70.
- **P-B (separation):** median cos_within − median cos_between ≥ 0.30, AND a
  permutation test of "cluster by functional vs cluster by architecture" gives
  p < 0.05 in favor of functional.
- **P-C (directional rotation):** the r2SCAN group's mean error C44 component for
  Au, Pt, Ag is less negative than the PBE group's by ≥ 0.15 (r2SCAN is known to
  stiffen noble metals toward experiment). Sign must be correct for ≥ 2 of 3 elements.
- **P-D (dataset control):** MatPES-PBE cells align with MPtrj-PBE anchors
  (median FCC cosine ≥ 0.60) — same functional, different corpus ⇒ still aligned.

**The law's in-domain form is REFUTED if** errors cluster by architecture rather
than functional (P-B reversed), or if P-A fails on the majority of Born-stable
FCC elements. Partial outcomes (P-A holds, P-C fails) indicate functional
inheritance without the specific r2SCAN stiffening mechanism — report as such,
do not reinterpret post hoc.

## Secondary analyses (non-confirmatory)

- PR(ρ) consilience per element at n ≥ 6 models: check PR, mean pairwise cosine,
  and rank-1 SVD share against the one-parameter family
  PR = (ρ+3)²/((ρ+1)²+2), share ≈ ρ/(ρ+1).
- BCC divergence replication with n > 3: do V/Cr/Nb remain same-axis,
  opposite-sign (rank-1 but sign-split)?
- Born-failure census by cell: do failures concentrate by functional, architecture,
  or element class? (Decision rule for Cr/V/Fe: compare against published
  non-spin-polarized DFT elastic constants before classifying a Born failure as
  model pathology — a faithful reproduction of an unstable reference is signal.)

## Logistics

- Models: matgl-distributed MatPES checkpoints (M3GNet-MatPES-PBE/-r2SCAN,
  TensorNet-MatPES-PBE/-r2SCAN). CPU-feasible (~minutes/element based on
  local MACE timings).
- Outputs: one results JSON per cell, same schema as `mace_results.json`;
  analysis script extends `recompute_born_filtered.py`.
- Everything ingests to the claims ledger; this document is the claim of record.

## What each outcome means for the program

- **Confirmed:** Paper 2's empirical anchor. The law graduates from "observed in
  one ensemble" to "survived its strongest in-domain attempt at refutation," and
  the calibration product (shared correction vector per functional) is justified.
- **Refuted:** the FCC alignment of the original trio reflects corpus practice or
  architecture-family convergence, not functional inheritance — still publishable,
  still constrains the law, and the projection theorem survives at the classical
  layer regardless (its evidence is independent).
