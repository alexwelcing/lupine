# Round 2 Pre-Registration Protocol — The Projection Law Correction Operator

> **Version:** 2.2 (revised 2026-06-25)  
> **Objective:** Definitively test the Projection Law's conservation-rotation mechanism by (1) removing reference-standard confounds through 0K DFT targets, (2) demonstrating operational superiority over ensemble-based UQ, and (3) producing a drop-in LAMMPS extension that any HPC user can adopt.

## Revision history

| Date | Change | Author |
|------|--------|--------|
| 2026-06-25 | v2.2 — Added Ag and Au targets from published literature (Ag PBE Pandit & Bongiorno 2023; Au PW91-GGA Wang & Li 2008 as fallback). Target set now 16 cubic elemental metals. Updated r2SCAN bulk-shift coverage and evaluated-subset note. | researcher |
| 2026-06-26 | v2.1 — Corrected PBE extraction method (direct from de Jong 2015, not matminer); updated r2SCAN fallback list to Al, Ca, Sr; added evaluated-subset note; recorded provenance for all 14 target elements. | researcher |

## Systems

The target set comprises **16 cubic elemental metals** for which a published 0K elastic tensor is available:

- **FCC:** Al, Ag, Au, Ca, Cu, Ni, Pd, Pt, Sr
- **BCC:** Cr, Fe, Mo, Nb, Ta, V, W

*Pb, which was part of the original IMMI set, is absent from the published cubic-elastic compilations and is not in the current target set.*

**Evaluated subset (reported in parent benchmark):** Ag, Au, Cu, Fe, Ni, Pt, V, W (8 elements). Hypotheses below are registered for the full 16-element set; where the initial benchmark covers a restricted subset, this is noted explicitly.

## Reference targets

Pristine 0K elastic constants (C11, C12, C44) from:

- **PBE baseline:** de Jong *et al.*, *Scientific Data* **2**, 150009 (2015). This is the published DFT elastic-tensor dataset underlying the Materials Project elasticity workflow: VASP/PBE, stress-strain finite-difference method of Le Page & Saxe (Phys. Rev. B 65, 104104), 0 K static calculations. Values are extracted **directly from the de Jong 2015 publication data** (via the `matminer` `elastic_tensor_2015` dataset as a cross-check, but the primary source is the paper's tabulated values). The resulting file is `data/pbe_targets_dejong2015.json` (14 elements; missing Ag, Au).
- **Ag (PBE):** Pandit & Bongiorno, *Modelling Simul. Mater. Sci. Eng.* **31**, 055005 (2023). PBE elastic constants computed for a 108-atom FCC supercell with VASP, using a 480 eV plane-wave cutoff and 36×36×36 *k*-point grid. Values: C11 = 107.0, C12 = 79.0, C44 = 42.0 GPa.
- **Au (PW91-GGA fallback):** Wang & Li, *J. Phys.: Condens. Matter* **20**, 045214 (2008). The published PBE elastic-tensor entries for Au in the de Jong 2015 / Materials Project set are unphysical (negative or near-zero C44), and no stable PBE-only cubic Au tensor was recovered from AFLOW, OQMD, JARVIS-DFT, or Alexandria. We therefore adopt the PW91-GGA values from Wang & Li as the reference baseline: C11 = 165.9, C12 = 142.2, C44 = 26.7 GPa. The operator benchmark is run against the r2SCAN target derived from this baseline.
- **r2SCAN:** No published full r2SCAN elastic-tensor table exists for all target metals. We therefore apply a **scalar bulk-modulus shift** to the baseline tensors using r2SCAN/baseline bulk-modulus ratios from Liu *et al.*, *J. Chem. Phys.* **160**, 024102 (2024). The shift is computed as `Cij_r2SCAN = Cij_baseline × (B_r2SCAN / B_baseline)`; this preserves the tensor anisotropy (C11/C12 ratio, Zener ratio) while shifting overall stiffness. **Al, Ca, and Sr** lack r2SCAN bulk data in Liu *et al.* and retain the unshifted PBE baseline. The resulting file is `data/targets_0K.json` (schema `lupine.targets_0K.v3`).

Each target value carries a provenance record (`material_id`, source citation, URL, stability flag, and fallback reason where applicable).

### Provenance summary per element

| Element | Baseline source | r2SCAN method | r2SCAN fallback reason |
|---------|----------------|---------------|------------------------|
| Al, Ca, Sr | de Jong 2015 | PBE baseline retained | No published r2SCAN bulk modulus available |
| Ag | Pandit & Bongiorno 2023 (PBE) | Scalar bulk shift (Liu 2024) | — |
| Au | Wang & Li 2008 (PW91-GGA) | Scalar bulk shift (Liu 2024) | No stable published PBE Au tensor found |
| Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Ta, V, W | de Jong 2015 | Scalar bulk shift (Liu 2024) | — |

## Model grid

Layer 1 — Classical interatomic potentials (OpenKIM/NIST):
- 2–3 EAM potentials per element (e.g., Ackland-1987 for Cu, V, W; Ackland-1997 for Fe; Adams-1989 for Pt). The initial benchmark used the potentials available in the local NIST catalog.

Layer 2 — Foundation MLIPs evaluated at 0K via LAMMPS plugins (registered plan):
- **PBE ensemble:** M3GNet, CHGNet, TensorNet, QET (MatPES PBE).
- **r2SCAN ensemble:** same architectures on MatPES r2SCAN.

*Note: The interim benchmark reported here used Layer 1 classical potentials on the 8-element subset Ag, Au, Cu, Fe, Ni, Pt, V, W. Layer 2 MLIP evaluation is staged for the full 16-element set.*

## Registered hypotheses and kill conditions

### H1 — Cleaned effect size

When evaluated against 0K all-electron references, the functional-clustering effect size for 3d/4d metals meets or exceeds the Round 1 registered threshold (0.30).

- **Kill condition:** Effect size < 0.20 on the 3d/4d subset against 0K references.
- **Evaluated-subset note:** The interim 8-element benchmark contains four 3d/4d metals (Cu, Fe, Ni, V). The full 16-element test will include additional 3d/4d metals (Cr, Nb, Mo, Pd).

### H2 — Nested constraint hierarchy

The binding constraint for 3d/4d metals is the XC functional; for 5d metals a deeper physical constraint (e.g., scalar relativistic / correlation effects) may supersede the XC functional.

- **Prediction 2a:** 3d/4d subset clusters significantly by functional (exact permutation p < 0.05).
- **Prediction 2b:** The 5d metals with a PBE baseline (Pt, W) do not cluster by functional (p > 0.20) and PBE-to-r2SCAN error vectors maintain high cosine similarity (> 0.8). *Au is included in the target set but uses a PW91-GGA baseline, so it is excluded from the PBE-vs-r2SCAN functional-clustering test; Pt and W are the only PBE-baseline 5d metals.*
- **Kill condition:** The available PBE-baseline 5d metals cluster strongly by functional (p < 0.05) while the 3d/4d metals do not.
- **Scope adjustment:** Because Au lacks a stable PBE tensor, the original “5d noble metals (Au, Pt)” functional-clustering subset is revised to “PBE-baseline 5d metals (Pt, W)”; Au is retained in the target set with a PW91 baseline.

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
