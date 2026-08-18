# Materials-Science Interpretation: Lupine Layer-2 3×3×3 MLIP Elastic-Constant Benchmark

**Scope.** 16 cubic elemental metals (Ag, Al, Au, Ca, Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Sr, Ta, V, W) evaluated with four MatPES-trained MLIPs—CHGNet, M3GNet, QET, and TensorNet—against PBE and approximate r2SCAN 0 K elastic-constant targets. Units are GPa unless noted.

- Overall mean MAE: **17.84 GPa** (PBE: 15.01; r2SCAN: 20.66).
- Best single model: **QET** (PBE 13.41; r2SCAN 15.46 GPa).

## 1. Chemical stratification: MAE by bonding/crystal class

The elements are grouped by structure and dominant bonding character, then the mean Cij MAE is reported for each model × functional. V and W are included in the BCC transition class.

| Class | Elements | Functional | CHGNet | M3GNet | QET | TensorNet |
|-------|----------|------------|--------|--------|-----|-----------|
| FCC noble/coinage | Ag, Au, Cu | PBE |  16.20 |  12.19 |  11.68 |  11.59 |
| FCC noble/coinage | Ag, Au, Cu | r2SCAN |  17.03 |  12.79 |   9.05 |  10.17 |
| FCC late transition (Ni, Pd, Pt) | Ni, Pd, Pt | PBE |  13.71 |  14.49 |  10.72 |  11.68 |
| FCC late transition (Ni, Pd, Pt) | Ni, Pd, Pt | r2SCAN |  29.61 |   9.94 |   6.80 |  27.05 |
| FCC simple/sp (Al) | Al | PBE |  24.40 |   7.35 |   8.84 |  10.59 |
| FCC simple/sp (Al) | Al | r2SCAN |  19.29 |  16.61 |  21.68 |  15.33 |
| FCC alkaline-earth | Ca, Sr | PBE |   2.15 |   2.66 |   3.52 |   2.39 |
| FCC alkaline-earth | Ca, Sr | r2SCAN |   2.35 |   2.54 |   8.95 |   2.83 |
| BCC transition | Cr, Fe, Mo, Nb, Ta, V, W | PBE |  23.99 |  19.04 |  18.79 |  21.23 |
| BCC transition | Cr, Fe, Mo, Nb, Ta, V, W | r2SCAN |  40.45 |  34.49 |  22.90 |  23.44 |

**Interpretation.**
- **FCC alkaline-earth** remains the easiest class overall (mean MAE 3.42 GPa), confirming that weak free-electron-like bonding is well captured.
- **BCC transition** is the hardest class overall (mean MAE 25.54 GPa). Adding V and W reinforces the trend: strong, directional d-d bonding and magnetism make BCC refractory/magnetic metals the largest residual source of error.
- On r2SCAN, the BCC class is worst for **CHGNet** (MAE 40.45 GPa), driven mainly by Cr and Fe.

## 2. Systematic bias signatures

Signed mean errors (prediction − target) reveal whether a model globally over-stiffens (+) or under-stiffens (−). Bulk modulus B = (c11 + 2c12)/3 and Hill shear modulus G are derived from the predicted and target Cij.

### 2a. Combined over PBE + r2SCAN

| Model | ⟨Δc11⟩ | ⟨Δc12⟩ | ⟨Δc44⟩ | ⟨ΔB⟩ | ⟨ΔG⟩ | Overall MAE |
|-------|--------|--------|--------|------|------|-------------|
| CHGNet | -23.28 |  -1.98 |   1.74 |  -9.08 |  -2.11 |  22.92 |
| M3GNet |   4.49 |  -9.35 |   8.36 |  -4.74 |   8.42 |  17.42 |
| QET |  15.59 |  -4.59 |   4.71 |   2.14 |   7.12 |  14.44 |
| TensorNet |  -9.89 | -10.91 |   1.62 | -10.57 |   1.37 |  16.58 |

### 2b. Split by functional

**PBE**

| Model | ⟨Δc11⟩ | ⟨Δc12⟩ | ⟨Δc44⟩ | ⟨ΔB⟩ | ⟨ΔG⟩ |
|-------|--------|--------|--------|------|------|
| CHGNet | -16.51 |  -0.87 |   3.66 |  -6.08 |   0.30 |
| M3GNet |  -1.77 |  -8.64 |   8.39 |  -6.35 |   7.02 |
| QET |  14.63 |  -6.38 |   6.25 |   0.62 |   8.29 |
| TensorNet |  -5.63 |  -9.74 |   1.32 |  -8.37 |   1.93 |

**r2SCAN**

| Model | ⟨Δc11⟩ | ⟨Δc12⟩ | ⟨Δc44⟩ | ⟨ΔB⟩ | ⟨ΔG⟩ |
|-------|--------|--------|--------|------|------|
| CHGNet | -30.06 |  -3.10 |  -0.18 | -12.08 |  -4.51 |
| M3GNet |  10.75 | -10.05 |   8.32 |  -3.12 |   9.82 |
| QET |  16.56 |  -2.80 |   3.17 |   3.65 |   5.95 |
| TensorNet | -14.15 | -12.08 |   1.92 | -12.77 |   0.81 |

**Key bias diagnoses.**
- **CHGNet** systematically **under-stiffens** the bulk modulus (⟨ΔB⟩ = -9.08 GPa overall; PBE -6.08, r2SCAN -12.08), under-stiffens shear (⟨ΔG⟩ = -2.11 GPa).
- **M3GNet** shows a modest bulk bias (⟨ΔB⟩ = -4.74 GPa), over-stiffens shear (⟨ΔG⟩ = +8.42 GPa).
- **QET** shows a modest bulk bias (⟨ΔB⟩ = 2.14 GPa), over-stiffens shear (⟨ΔG⟩ = +7.12 GPa).
- **TensorNet** systematically **under-stiffens** the bulk modulus (⟨ΔB⟩ = -10.57 GPa overall; PBE -8.37, r2SCAN -12.77), has a near-neutral shear bias (⟨ΔG⟩ = 1.37 GPa).

## 3. Worst-case failures and materials-science causes

The table below lists the highest single-case MAEs and the offending elastic constants.

| Rank | MAE (GPa) | Element | Model | Functional | Predicted (c11, c12, c44) | Target (c11, c12, c44) | Diagnosis |
|------|-----------|---------|-------|------------|---------------------------|------------------------|-----------|
| 1 | 86.31 | Cr | M3GNet | r2SCAN | (708.0, 212.2, 127.0) | (531.3, 148.0, 108.8) | antiferromagnetic Cr / d-band anisotropy |
| 2 | 66.55 | Cr | CHGNet | r2SCAN | (421.2, 216.2, 87.4) | (531.3, 148.0, 108.8) | antiferromagnetic Cr / d-band anisotropy |
| 3 | 57.75 | Pt | CHGNet | r2SCAN | (233.0, 169.1, 78.8) | (320.4, 248.3, 72.1) | heavy d/noble metal under-stiffening |
| 4 | 51.78 | Mo | CHGNet | r2SCAN | (376.5, 186.0, 95.0) | (494.5, 165.2, 111.5) | refractory BCC c11 under-stiffening |
| 5 | 49.96 | Fe | CHGNet | r2SCAN | (171.5, 133.9, 90.7) | (272.7, 165.7, 107.5) | magnetic d-band tensor collapse |
| 6 | 46.08 | Cr | TensorNet | PBE | (546.4, 220.1, 91.9) | (499.5, 139.2, 102.3) | antiferromagnetic Cr / d-band anisotropy |
| 7 | 45.02 | Cr | CHGNet | PBE | (439.0, 199.1, 87.7) | (499.5, 139.2, 102.3) | antiferromagnetic Cr / d-band anisotropy |
| 8 | 44.26 | Cr | TensorNet | r2SCAN | (552.1, 219.7, 68.4) | (531.3, 148.0, 108.8) | antiferromagnetic Cr / d-band anisotropy |
| 9 | 43.88 | Cr | QET | r2SCAN | (587.5, 197.2, 82.5) | (531.3, 148.0, 108.8) | antiferromagnetic Cr / d-band anisotropy |
| 10 | 40.01 | Pt | TensorNet | r2SCAN | (270.6, 185.2, 79.4) | (320.4, 248.3, 72.1) | heavy d/noble metal under-stiffening |
| 11 | 39.38 | Nb | M3GNet | r2SCAN | (267.1, 94.4, 43.8) | (232.0, 144.6, 10.9) | soft c44 over-stiffened |
| 12 | 37.33 | W | CHGNet | r2SCAN | (459.3, 229.5, 150.2) | (555.5, 219.0, 155.5) | refractory BCC c11 under-stiffening |

**Failure diagnoses.**

1. **Cr—magnetism and d-band anisotropy.** Chromium remains the dominant failure, appearing repeatedly in the top 12. M3GNet-r2SCAN overshoots c11 by ~177 GPa (708 vs 531) and c12 by ~64 GPa. CHGNet and TensorNet instead under-stiffen c11 and over-stiffen c12, producing large errors in the shear anisotropy c′ = (c11 − c12)/2. Antiferromagnetic Cr’s energy surface depends sensitively on magnetic order; MLIPs trained on non-magnetic or approximate collinear data cannot reliably reproduce it.
2. **Fe—ferromagnetic collapse.** CHGNet-r2SCAN gives c11 = 171 GPa vs 273 GPa. Bcc Fe’s stiffness is tied to the magnetization–volume balance; an underestimated volume or suppressed moment collapses the tensile response.
3. **Mo/W/Ta—refractory BCC d-band stiffness.** Heavy BCC metals now include W. CHGNet and TensorNet tend to under-stiffen c11 while over-stiffening c12, an error pattern that grows with the absolute stiffness of the element (W c11 target ≈ 510–556 GPa).
4. **Nb—soft shear mode (c44).** Nb’s target c44 is ~11 GPa, but every model over-stiffens it (signed errors from +7 to +33 GPa). The BCC Brillouin-zone-boundary soft mode is governed by Fermi-surface nesting; small potential errors are amplified into outsized c44 errors.
5. **Pt/Au—heavy d/noble metals and relativistic/softness effects.** Pt under CHGNet-r2SCAN and Au under CHGNet-PBE are under-stiffened across the board. Strong spin–orbit coupling and narrow d bands make these systems sensitive to the exchange-correlation treatment.

## 4. PBE vs r2SCAN target shifts and correlation with MLIP errors

Because the r2SCAN targets were constructed by scalar bulk-modulus scaling of the PBE tensors, every Cij for a given element is multiplied by the same ratio. The table below ranks elements by that shift ratio, now including V and W.

| Element | Class | B-ratio (r2SCAN/PBE) | Avg abs Cij shift (GPa) | Notes |
|---------|-------|----------------------|--------------------------|-------|
| Cu | FCC noble/coinage | 1.1952 |  22.69 | large stiffening |
| Ag | FCC noble/coinage | 1.1819 |  13.82 | large stiffening |
| Pd | FCC late transition (Ni, Pd, Pt) | 1.1503 |  20.30 | large stiffening |
| Ni | FCC late transition (Ni, Pd, Pt) | 1.1430 |  27.02 | large stiffening |
| Pt | FCC late transition (Ni, Pd, Pt) | 1.1173 |  22.41 | moderate stiffening |
| Fe | BCC transition | 1.1038 |  17.12 | moderate stiffening |
| W | BCC transition | 1.0897 |  25.52 | moderate stiffening |
| V | BCC transition | 1.0799 |  11.26 | moderate stiffening |
| Cr | BCC transition | 1.0638 |  15.75 | moderate stiffening |
| Ta | BCC transition | 1.0619 |  10.15 | moderate stiffening |
| Mo | BCC transition | 1.0481 |  11.79 | small stiffening |
| Au | FCC noble/coinage | 1.0227 |   2.53 | small stiffening |
| Al | FCC simple/sp (Al) | 1.0000 |   0.00 | no shift (PBE retained) |
| Ca | FCC alkaline-earth | 1.0000 |   0.00 | no shift (PBE retained) |
| Sr | FCC alkaline-earth | 1.0000 |   0.00 | no shift (PBE retained) |
| Nb | BCC transition | 0.9956 |   0.57 | slight softening |

**Correlation with MLIP errors.** A Pearson correlation between the per-element mean model MAE and the r2SCAN shift ratio gives **r = -0.156 (PBE)** and **r = 0.002 (r2SCAN)**. Both correlations are small, confirming that model errors are governed by chemistry and local physics rather than by the scalar target shift.

The mean r2SCAN MAE (20.66 GPa) remains higher than the PBE MAE (15.01 GPa), but the largest r2SCAN failures are concentrated in magnetic/refractory BCC metals (Cr, Fe, Mo, W) and heavy FCC Pt, not in the elements with the largest scalar shifts (Cu, Ag, Pd, Ni).

## 5. Opportunities for cheap post-hoc correction

**Certification status:** The correction opportunities and all bulk/shear or other derived-modulus statements below are **uncertified hypotheses**, not consequences of componentwise licenses. Differences and mixed component directions can lose raw error cancellation; any future claim requires a separately proved and checked vector-valued license for the exact map.

**Scalar bulk shift.** A uniform volume-stiffness correction is most promising for models with a consistent bulk bias. CHGNet (⟨ΔB⟩ ≈ -9.08 GPa overall) and TensorNet (⟨ΔB⟩ ≈ -10.57 GPa overall) under-stiffen the bulk modulus systematically; adding a ~+5 to +10% energy–volume rescaling would pull c11 and c12 in the right direction without strongly affecting the more neutral c44. It would not fix the Cr/Fe magnetic failures, because those are non-uniform tensor errors, nor would it fix Nb’s c44.

**Element-specific bias correction.** When the signed error pattern is stable across functionals, an element-level offset could help. Examples:
- Ca and Sr have small, stable signed biases; a two-parameter correction would remove their already modest residuals.
- Au and Pt show consistent c11/c12 under-stiffening across all models but simultaneous c44 over-stiffening. A scalar per-element correction would improve bulk/shear moduli but trade errors between c44 and the diagonal constants.
- Nb’s c44 is systematically too large for every model; a shear-mode-only correction is the only cheap fix.

**Where correction will not work.** Magnetic elements (Cr, Fe) and some refractory BCC cases (Mo, Ta, W) display mixed signs and large case-to-case variance across models and functionals. An after-the-fact scalar or even element-specific linear correction would over-fit the benchmark and fail for structures or strains outside the fitted set. These cases require improved training data that captures magnetic ground states and Fermi-surface-driven phonon anomalies, and are unlikely to be fixed without retraining or explicit magnetic descriptors.

## 6. Actionable materials-science takeaways

- **QET is the safest default for cubic-metal elastic screening**, with the lowest overall MAE (14.44 GPa) and the smallest systematic bulk bias. Its main remaining failure modes are Nb’s soft c44 and the magnetic tensor anisotropy of Cr/Fe.

- **Avoid CHGNet for r2SCAN-derived moduli of heavy d metals and magnets.** CHGNet’s strong bulk-softening bias (⟨ΔB⟩ ≈ -12.08 GPa on r2SCAN) makes it unreliable for Pt, Au, Mo, Fe, and now W, where it under-stiffens c11 by large margins.

- **M3GNet over-stiffens shear while under-stiffening off-diagonal coupling.** The signature (positive Δc11, Δc44; negative Δc12) cannot be removed with a scalar correction and will inflate shear-modulus predictions for FCC and BCC systems.

- **TensorNet is uniformly soft in volume response.** Like CHGNet it under-stiffens B, but more evenly across c11 and c12. It is a candidate for a simple volume-stiffness recalibration, especially for non-magnetic FCC metals.

- **The r2SCAN functional shift is not the dominant error source.** Elements with the largest scalar r2SCAN stiffening (Cu, Ag, Pd, Ni) are not the worst-mode failures; Cr, Nb, Fe, W, and Pt dominate through local physics that scalar target scaling cannot capture.

- **Low-c44 BCC metals (especially Nb) are a universal blind spot.** Every model overestimates Nb c44 by 6.0 to 32.9 GPa. This points to missing training emphasis on Fermi-surface nesting and soft phonon branches in group-V BCC metals.

- **Use Ca and Sr as elastic sanity checks, not as proof of general accuracy.** These alkaline-earth FCC metals are predicted reliably by every model, but their weak, free-electron-like bonding is not representative of the transition-metal and magnetic systems where the models actually fail.

---

*Report generated from `/home/alex/Dev/lupine/lupine/data/benchmark_layer2_3x3x3_summary.json`, `/tmp/layer2_3x3x3_full/*.json`, and `/home/alex/Dev/lupine/lupine/data/targets_0K.json`. Target methodology: de Jong et al. 2015 (PBE), Pandit & Bongiorno 2023 (Ag), Wang & Li 2008 (Au PW91), with r2SCAN tensors approximated by scalar bulk-modulus scaling from Liu et al. 2024.*
