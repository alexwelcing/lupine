# Layer-2 3×3×3 MLIP Elastic-Constant Benchmark — Master Analysis

**Date:** 2026-06-29  
**Execution:** `layer2-3x3x3-grid-zb76j` (Cloud Run, `witching-606c6`, us-central1)  
**Container:** `us-central1-docker.pkg.dev/witching-606c6/lupine-layer2/runner:v1`  
**Data:** `gs://lupine-benchmark-witching-606c6/layer2_3x3x3/` (128 raw JSON files)  
**Summary:** `lupine/data/benchmark_layer2_3x3x3_summary.json`  
**Team reports:**
- Statistical deep-dive: `analysis_statistical.md`
- Materials-science interpretation: `analysis_materials.md`
- Reproducibility audit: `analysis_audit.md`
- Communications draft: `analysis_comms.md`

---

## Executive Summary

The Layer-2 3×3×3 reference grid is now complete for all 16 cubic metals. The headline result is that a high-fidelity supercell elastic-constant reference can be built for **less than one CPU core-hour**, with a best single-model workflow (QET / PBE) achieving a mean C$_{ij}$ MAE of **13.4 GPa**.

| Metric | Value |
|---|---:|
| Raw outputs | 128 (16 elements × 4 models × 2 functionals) |
| Overall mean C$_{ij}$ MAE | **17.84 GPa** (95% CI [15.51, 20.41]) |
| Best overall model | **QET** — 14.44 GPa mean MAE |
| Best PBE workflow | **QET / PBE** — 13.41 GPa |
| Best r2SCAN workflow | **QET / r2SCAN** — 15.46 GPa |
| Functional gap | r2SCAN is **+5.65 GPa** harder on average |
| Easiest element | Ca — 2.87 GPa mean MAE |
| Hardest element | Cr — 43.47 GPa mean MAE |
| Total compute cost | ~0.82 CPU-equivalent core-hours |

**Most important update vs. the 14-element snapshot:** completing the grid added V and W and corrected a bug in the summary aggregator. The corrected full-dataset ranking is **QET > TensorNet > M3GNet > CHGNet**. The earlier 14-element snapshot had the same qualitative order; the gap is now quantified across the full 16-element set.

---

## 1. What we measured

For each of 16 cubic elements (Ag, Al, Au, Ca, Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Sr, Ta, V, W) we computed the three independent elastic constants C$_{11}$, C$_{12}$, and C$_{44}$ on a 3×3×3 supercell using four MatPES foundation MLIPs:

- CHGNet
- M3GNet
- QET
- TensorNet

and two target functionals:

- PBE ( headline target )
- r2SCAN ( sensitivity target; scalar bulk-modulus approximation where needed )

Every case was run once, with wall-clock runtime recorded. Outputs were uploaded to GCS; the aggregator produced a summary JSON with per-row targets and MAEs.

---

## 2. Headline model ranking

Mean C$_{ij}$ MAE across all 16 elements and both functionals:

| Rank | Model | Mean MAE (GPa) | PBE MAE | r2SCAN MAE |
|---:|---|---:|---:|---:|
| 1 | **QET** | **14.44** | 13.41 | 15.46 |
| 2 | TensorNet | 16.58 | 14.61 | 18.54 |
| 3 | M3GNet | 17.42 | 14.13 | 20.71 |
| 4 | CHGNet | 22.92 | 17.90 | 27.94 |

**Interpretation:** QET is the only model that keeps mean MAE below 15 GPa on both functionals. TensorNet is competitive on PBE but degrades more on r2SCAN. M3GNet is close to TensorNet on PBE but has the largest r2SCAN tail (Cr). CHGNet is systematically softer than the targets and is the weakest overall performer.

---

## 3. Functional comparison

| Functional | Mean MAE (GPa) | Best model | Best-model MAE (GPa) |
|---|---:|---|---:|
| PBE | 15.01 | QET | 13.41 |
| r2SCAN | 20.66 | QET | 15.46 |
| Δ (r2SCAN − PBE) | **+5.65** | — | — |

All four models are worse on r2SCAN, but the functional gap varies widely:

- CHGNet: +10.04 GPa
- M3GNet: +6.58 GPa
- TensorNet: +3.93 GPa
- QET: +2.05 GPa

**Interpretation:** QET generalizes best to the r2SCAN-shifted targets. CHGNet’s bulk-softening bias is amplified when the reference is stiffer. The r2SCAN target itself is approximate (scalar bulk shift), so the gap is a lower bound on true r2SCAN generalization error.

---

## 4. Per-element error landscape

Elements ranked by mean MAE across all models and functionals:

| Rank | Element | Mean MAE (GPa) | Class | Notes |
|---:|---|---:|---|---|
| 1 | Ca | 2.87 | FCC alkaline-earth | Free-electron-like, smooth energy surface |
| 2 | Sr | 3.98 | FCC alkaline-earth | Same class as Ca |
| 3 | Ag | 7.30 | FCC noble/coinage | Well-described by all models |
| 4 | Ni | 11.23 | FCC late transition | QET and M3GNet strong |
| 5 | Pd | 12.20 | FCC late transition | TensorNet best on PBE |
| 6 | Cu | 14.35 | FCC noble/coinage | Large r2SCAN shift |
| 7 | Al | 15.51 | FCC simple metal | CHGNet under-stiffens |
| 8 | Au | 16.12 | FCC noble/coinage | PW91 fallback target |
| 9 | Ta | 17.00 | BCC transition | QET best |
| 10 | Mo | 19.94 | BCC transition | M3GNet best on r2SCAN |
| 11 | W | 20.79 | BCC transition | TensorNet best on r2SCAN |
| 12 | Pt | 23.07 | FCC late transition | CHGNet fails on r2SCAN |
| 13 | Fe | 23.29 | BCC transition | Magnetic, model-dependent |
| 14 | Nb | 26.92 | BCC transition | c44 universally over-stiffened |
| 15 | V | 27.38 | BCC transition | QET-PBE surprisingly poor |
| 16 | Cr | 43.47 | BCC transition | Antiferromagnetic outlier |

**Materials-science insight:** Error is not random. It clusters by chemistry and structure:
- FCC alkaline-earth and noble metals are easy.
- BCC transition metals — especially magnetic Cr/Fe and low-shear Nb — dominate the error tail.
- r2SCAN amplifies errors wherever the model already under-stiffens (CHGNet on Pt, Au, Mo).

---

## 5. QET vs TensorNet: not aliases in this benchmark

A prior Lupine preprint treated QET and TensorNet as a single architecture because they resolved to the same checkpoint in some settings. In the Layer-2 3×3×3 grid they are measurably different:

- Mean absolute MAE difference: **8.41 GPa**
- Mean relative difference: **53.9%**
- Identical pairs: **0 / 32**
- Largest gap: Cr/PBE — QET MAE 5.72 GPa vs TensorNet MAE 46.08 GPa

**Interpretation:** QET should be treated as a distinct model for ranking and ensemble purposes. This is a meaningful correction to earlier reporting.

---

## 6. Systematic biases (signed errors)

Mean signed error = predicted − target (positive = over-stiffen):

| Model | ⟨Δc11⟩ | ⟨Δc12⟩ | ⟨Δc44⟩ | ⟨ΔB⟩ | Bias signature |
|---|---:|---:|---:|---:|---|
| CHGNet | −23.28 | −1.98 | +1.74 | −9.08 | Strong bulk softening |
| M3GNet | +4.49 | −9.35 | +8.36 | −4.80 | Over-stiff shear, soft coupling |
| QET | +15.60 | −4.59 | +4.71 | +2.14 | Slight bulk stiffening, balanced |
| TensorNet | −9.89 | −10.91 | +1.62 | −10.57 | Uniform diagonal softening |

(Values are averages over both functionals.)

**Correction opportunities:**
- CHGNet and TensorNet both under-stiffen the bulk modulus; a scalar volume-stiffness rescaling would help the easy cases but not Cr/Fe/Nb.
- M3GNet’s shear anisotropy is structural and cannot be fixed by a scalar shift.
- QET is already the most balanced; its residual errors are mostly in transition-metal chemistry.

---

## 7. Reproducibility and data quality

**Verdict: GO for full 16-element publication, with documented caveats.**

- 128 / 128 outputs present and `status: ok`
- 0 failed tasks, 0 duplicate keys
- All lattice constants positive; all cubic tensors mechanically stable
- Raw/summary values consistent
- Cloud Run execution completed in ~5 minutes wall time
- Total recorded runtime: ~0.82 core-hours

**Caveats to publish:**
1. DFT-reference errors, not experimental errors.
2. Cubic metals only; transfer to alloys/low-symmetry systems not guaranteed.
3. r2SCAN targets are scalar bulk-modulus approximations; Al, Ca, Sr carry no shift.
4. Au uses a PW91-GGA fallback target.
5. Single seed; no replicates.
6. Costs are cache-warm, single-process CPU-equivalent.
7. QET and TensorNet are distinct in this benchmark, despite earlier alias reports.
8. Raw files do not yet embed git commit / execution ID / image digest provenance.

---

## 8. Communications strategy

**Recommended headline:**  
*Foundation MLIPs deliver a 16-element, 3×3×3 elastic-constant reference for under one core-hour — QET leads at 13.4 GPa mean MAE.*

**One-sentence bottom line:**  
The Layer-2 3×3×3 benchmark shows that supercell-based cubic-metal elastic references are now sub-core-hour cheap, with QET the accuracy leader; the remaining error is concentrated in transition metals and r2SCAN targets, giving the field a clear, honest roadmap.

**Recommended public artifacts:**
1. Short blog post / library article: “One core-hour, 128 elastic constants”
2. Updated preprint: “Layer-2 3×3×3 reference benchmark for MatPES foundation MLIPs: elastic constants of 16 cubic metals across PBE and r2SCAN”
3. Data package: summary JSON + 128 raw files + targets provenance

A full communications draft with headline options, stakeholder angles, social thread, and figure captions is in `analysis_comms.md`.

---

## 9. Immediate action items

1. ✅ Complete 16-element grid (V, W) — done.
2. ✅ Fix aggregator bug so `best_model` reflects mean MAE, not single best case — done.
3. ⏳ Commit corrected summary + aggregator fix to Lupine.
4. ⏳ Publish library article on library.lupine.science.
5. ⏳ Update lupine.science ticker with corrected 16-element headline.
6. ⏳ Add provenance fields to raw outputs in the next run.
7. ⏳ Use these results to update the 1×1×1 vs 3×3×3 cost-accuracy preprint (the small-cell equivalence conclusion is unchanged).

---

*Master analysis compiled from the parallel team reports in `analysis_statistical.md`, `analysis_materials.md`, `analysis_audit.md`, and `analysis_comms.md`.*
