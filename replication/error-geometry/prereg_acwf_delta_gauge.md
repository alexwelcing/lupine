# Pre-Registration: Δ-Gauge Cross-Layer Test — Error Geometry of DFT Implementations

**Program:** projection law (error direction fingerprints the binding constraint)
**Date registered:** 2026-06-11, after downloading the ACWF dataset and inspecting
its schema/labels, BEFORE computing any error-vector statistic.
**Data:** ACWF verification study (Bosoni et al., Nat. Rev. Phys. 2024),
`acwf_paper_plots/code-data/` JSONs (commit-pinned copies in `data/acwf/`).
384 unary systems (96 elements × {SC, BCC, FCC, Diamond}), observables per
system: (V₀ = min_volume, B₀ = bulk_modulus_ev_ang3, B₁ = bulk_deriv).
Reference: `AE-average` (mean of WIEN2k and FLEUR all-electron results).
AE noise floor per system: the FLEUR-vs-WIEN2k relative difference.

## The transposition

This is the 4×2 experiment moved one layer up the epistemic stack. There, the
binding constraint was the training functional and the irrelevant variable was
the architecture. Here, all methods share the SAME functional (PBE) and the
same reference (all-electron PBE), so the functional cancels; the predicted
binding constraint is the **pseudopotential approximation** (formalism and
table), and the predicted irrelevant variable is the **simulation code**.

Family assignment (fixed now, before analysis):
- **NC/PseudoDojo group** (shared table, different codes): abinit-PD0.4-psp8,
  quantum_espresso-PD0.4-upf, castep-PD0.4-upf, abacus-PD0.4-upf
  (+ abinit-PD0.5b1, dftk-PD0.5 as the PD0.5 subgroup; siesta = PD0.4-psml).
- **PAW group**: vasp (PAW54-based), gpaw (PAW 0.9.20000), abinit-JTH1.1.
- **Same-code-cross-family pairs** (the code-clustering test): abinit ×
  {JTH-PAW, PD0.4-NC, PD0.5-NC}; quantum_espresso × {PD0.4-NC, SSSP};
  castep × {PD0.4-NC, C19-OTF}.
- **Excluded from confirmatory contrasts** (mixed or sui-generis basis/potential
  families; used in secondary analyses only): SSSP libraries (mixed
  PAW/USPP/NC per element), bigdft (HGH-K), cp2k_TZV2P (GTH), castep-C19,
  recPOTs, cp2k-sirius.

Error vector per (system, method): δ = (V₀/V₀ᴬᴱ − 1, B₀/B₀ᴬᴱ − 1, B₁/B₁ᴬᴱ − 1),
raw relative errors (consistent with all prior analyses in this program).
A system enters confirmatory statistics only if every method in the pair has
|δ| > 3 × the AE-floor magnitude for that system (direction is meaningless at
the reference noise floor — the formalized regime condition).

## Pre-registered predictions

- **P-Δ1 (consensus under a shared constraint):** within the PseudoDojo-0.4
  group (≥4 independent codes, one shared pseudopotential table), the median
  over qualifying systems of the mean pairwise error cosine is ≥ 0.50.
- **P-Δ2 (cluster by constraint, not implementation):** define
  S_table = mean cosine over different-code-SAME-table pairs (PD0.4 group,
  PD0.5 pair), and S_code = mean cosine over SAME-code-different-family pairs
  (abinit-JTH vs abinit-PD0.4/PD0.5; QE-PD0.4 vs QE-SSSP; castep-PD0.4 vs
  castep-C19), over the same qualifying systems. Prediction:
  S_table − S_code ≥ 0.20 with permutation p < 0.05 (label permutation over
  the method set, ≥ 5000 shuffles or exact enumeration).
  **Refutation condition: S_code > S_table** — errors organizing by code
  rather than by pseudopotential family refutes the law at this layer.
- **P-Δ3 (regime structure of the gauge):** across all systems and the full
  pseudopotential method set, the per-system mean pairwise cosine increases
  with per-system mean error magnitude measured in units of the AE floor:
  Spearman ρ > 0.30, p < 0.001. (Above the floor, direction is constraint;
  at the floor, direction is noise — the generalized Ni control.)

## Secondary analyses (non-confirmatory)

- Oxides dataset: identical statistics, report sign agreement with unaries.
- Component-standardized error vectors (each observable scaled by its
  ensemble-wide RMS) as a robustness check on the raw-relative-error choice.
- PAW-group internal alignment (different tables, same formalism): predicted
  intermediate between PD-group and cross-family.
- Per-system rank-1 share and PR placement on the PR(ρ) gauge.

## What each outcome means

- **Confirmed:** the law has now organized error geometry at three layers of
  the same epistemic stack with three different binding constraints —
  functional form (classical potentials), training functional (foundation
  MLIPs), pseudopotential approximation (DFT implementations) — none of which
  is an artifact of any single harness, dataset, or community.
- **Refuted (S_code > S_table):** implementation identity dominates the
  approximation family at the DFT layer; the law's claim to constraint-
  tracking fails outside its home domain and Paper 2 must be scoped to
  model-fitting paradigms only.
