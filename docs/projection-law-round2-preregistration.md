# Round 2 Pre-Registration Protocol — The Projection Law Correction Operator

> **Version:** 2.1 (revised 2026-06-26)  
> **Objective:** Definitively test the Projection Law's conservation-rotation mechanism by (1) removing reference-standard confounds through 0K DFT targets, (2) demonstrating operational superiority over ensemble-based UQ, and (3) producing a drop-in LAMMPS extension that any HPC user can adopt.

## Revision history

| Date | Change | Author |
|------|--------|--------|
| 2026-06-26 | v2.1 — Corrected PBE extraction method (direct from de Jong 2015, not matminer); updated r2SCAN fallback list to Al, Ca, Sr; added evaluated-subset note; recorded provenance for all 14 target elements. | researcher |

## Systems

The target set comprises **14 cubic elemental metals** for which a published 0K PBE elastic tensor is available in the de Jong *et al.* 2015 dataset:

- **FCC:** Al, Ca, Cu, Ni, Pd, Pt, Sr
- **BCC:** Cr, Fe, Mo, Nb, Ta, V, W

*Ag and Au are excluded because no published 0K PBE elastic-tensor entry exists in the de Jong 2015 dataset. Pb, which was part of the original 15-metal IMMI set, is also absent from the de Jong 2015 cubic-elastic compilation and is not in the current target set.*

**Evaluated subset (reported in parent benchmark):** Cu, Fe, Ni, Pt, V, W (6 elements). Hypotheses below are registered for the full 14-element set; where the initial benchmark covers a restricted subset, this is noted explicitly.

## Reference targets

Pristine 0K elastic constants (C11, C12, C44) from:

- **PBE:** de Jong *et al.*, *Scientific Data* **2**, 150009 (2015). This is the published DFT elastic-tensor dataset underlying the Materials Project elasticity workflow: VASP/PBE, stress-strain finite-difference method of Le Page & Saxe (Phys. Rev. B 65, 104104), 0 K static calculations. Values are extracted **directly from the de Jong 2015 publication data** (via the `matminer` `elastic_tensor_2015` dataset as a cross-check, but the primary source is the paper's tabulated values). The resulting file is `data/pbe_targets_dejong2015.json` (14 elements; missing Ag, Au).
- **r2SCAN:** No published full r2SCAN elastic-tensor table exists for all target metals. We therefore apply a **scalar bulk-modulus shift** to the PBE tensors using r2SCAN/PBE bulk-modulus ratios from Liu *et al.*, *J. Chem. Phys.* **160**, 024102 (2024). The shift is computed as `Cij_r2SCAN = Cij_PBE × (B_r2SCAN / B_PBE)`; this preserves the tensor anisotropy (C11/C12 ratio, Zener ratio) while shifting overall stiffness. **Al, Ca, and Sr** lack r2SCAN bulk data in Liu *et al.* and retain the unshifted PBE baseline. The resulting file is `data/targets_0K.json` (schema `lupine.targets_0K.v2`).

Each target value carries a provenance record (`material_id`, source citation, URL, stability flag, and fallback reason where applicable). Ag and Au are absent from the published PBE dataset and are excluded from the Round 2 target set.

### Provenance summary per element

| Element | PBE source | r2SCAN method | r2SCAN fallback reason |
|---------|-----------|---------------|------------------------|
| Al, Ca, Sr | de Jong 2015 | PBE baseline retained | No published r2SCAN bulk modulus available |
| Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Ta, V, W | de Jong 2015 | Scalar bulk shift (Liu 2024) | — |

## Model grid

Layer 1 — Classical interatomic potentials (OpenKIM/NIST):
- 2–3 EAM potentials per element (e.g., Ackland-1987 for Cu, V, W; Ackland-1997 for Fe; Adams-1989 for Pt). The initial benchmark used the potentials available in the local NIST catalog.

Layer 2 — Foundation MLIPs evaluated at 0K via LAMMPS plugins (registered plan):
- **PBE ensemble:** M3GNet, CHGNet, TensorNet, QET (MatPES PBE).
- **r2SCAN ensemble:** same architectures on MatPES r2SCAN.

*Note: The initial 6-element benchmark reported in the parent task (t_350e210c) used Layer 1 classical potentials only. Layer 2 MLIP evaluation is staged for the full 14-element set.*

## Registered hypotheses and kill conditions

### H1 — Cleaned effect size

When evaluated against 0K all-electron references, the functional-clustering effect size for 3d/4d metals meets or exceeds the Round 1 registered threshold (0.30).

- **Kill condition:** Effect size < 0.20 on the 3d/4d subset against 0K references.
- **Evaluated-subset note:** The initial 6-element benchmark contains four 3d/4d metals (Cu, Fe, Ni, V). The full 14-element test will include additional 3d/4d metals (Cr, Nb, Mo, Pd).

### H2 — Nested constraint hierarchy

The binding constraint for 3d/4d metals is the XC functional; for 5d metals a deeper physical constraint (e.g., scalar relativistic / correlation effects) may supersede the XC functional.

- **Prediction 2a:** 3d/4d subset clusters significantly by functional (exact permutation p < 0.05).
- **Prediction 2b:** The available 5d metal (Pt, W) does not cluster by functional (p > 0.20) and PBE-to-r2SCAN error vectors maintain high cosine similarity (> 0.8). *Au is absent from the target set; the 5d-noble-metal prediction is therefore restricted to Pt and W.*
- **Kill condition:** The available 5d metals cluster strongly by functional (p < 0.05) while the 3d/4d metals do not.
- **Scope adjustment:** Because Au is missing from the PBE dataset, the original “5d noble metals (Au, Pt)” subset is revised to “available 5d metals (Pt, W)”.

### H3 — Rotation link to Layer 3

The empirical XC bias vector (T_r2SCAN − T_PBE) aligns directionally with pseudopotential-based DFT error vectors from Layer 3.

- **Kill condition:** Cosine similarity between Layer 2 XC bias vector and Layer 3 PBE DFT error vector < 0.5 for the majority of elements.
- **Status:** Layer 3 DFT compute is staged (see `replication/error-geometry/prereg_r2b_dft_anchor_spec.md`). This hypothesis remains pending until the all-electron anchor runs complete.

### H4 — Compute-budget head-to-head

For elastic-constant prediction, one MLIP run + the Lupine Correction Operator achieves lower out-of-sample MSE than the mean of a 4-model ensemble, with tighter conformal-calibrated intervals.

- **Kill condition:** MSE(Operator) ≥ MSE(ensemble mean) or conformal coverage < 90%.
- **Evaluated-subset note:** On the 6-element classical-potential benchmark, the operator won 4/6 head-to-head comparisons (Cu and Pt went to ensemble). Conformal coverage was ≥ 90% on all elements. This is reported as interim evidence, not a definitive test of the full Layer-2 MLIP claim.

## Analysis plan

1. **Geometry:** compute participation ratio (PR) of each ensemble error matrix; expect PR ≈ 1.0–1.3.
2. **Bias extraction:** first principal component of the centered error matrix = 1D bias vector `b`.
3. **Functional shift:** Δf = T_r2SCAN − T_PBE.
4. **Operator:** `corrected = raw − b + Δf`.
5. **Uncertainty:** split-conformal prediction on leave-one-out residuals; report 90% coverage and interval width.
6. **Significance:** exact permutation tests for functional clustering; report p-values and effect sizes.

## Software artifacts

- `lammps-operator/lupine_operator.py` — Projection Law operator.
- `lammps-operator/lammps_harness.py` — deterministic 0K elastic-constant harness.
- `lammps-operator/run_benchmark.py` — head-to-head benchmark orchestrator.
- `lammps-operator/curate_targets.py` — target curation script.
- `data/targets_0K.json` — ground-truth target values (14 elements, `lupine.targets_0K.v2`).
- `data/pbe_targets_dejong2015.json` — raw PBE reference values (14 elements).
- `data/curate_targets_0K.py` — script that applies the scalar bulk-modulus shift and stability gate.

## Scientific-integrity policy

- No synthetic data in published claims.
- Every `BenchmarkEntry.predicted` must carry a `LammpsRun` provenance record.
- Every theorem about computed values must use `native_decide` or `by decide` in Lean; no `rfl` on floats.
- Build failures in `#guard` statements are treated as scientific discrepancies.
