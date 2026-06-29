# Lupine Layer-2 3×3×3 Statistical Analysis Report

**Benchmark:** cubic metal elastic constants (C11, C12, C44) on a 3×3×3 supercell.

## 1. Dataset Overview

- **Elements:** 16
- **Models:** CHGNet, M3GNet, QET, TensorNet (4)
- **Functionals:** PBE, r2SCAN (2)
- **Total rows:** 128 (16 elements × 4 models × 2 functionals)

## 2. Aggregate Metrics by Model and Functional

| Model | Functional | n | Mean MAE | Median MAE | Std MAE | RMSE (Cij) | Max-Error Element |
|-------|------------|---|----------|------------|---------|------------|-------------------|
| CHGNet | PBE | 16 | 17.90 | 15.78 | 11.30 | 25.14 | Cr (45.02) |
| CHGNet | r2SCAN | 16 | 27.94 | 21.34 | 19.78 | 42.44 | Cr (66.55) |
| M3GNet | PBE | 16 | 14.13 | 14.91 | 8.39 | 18.03 | Nb (25.87) |
| M3GNet | r2SCAN | 16 | 20.71 | 14.21 | 20.93 | 34.80 | Cr (86.31) |
| QET | PBE | 16 | 13.41 | 9.77 | 10.00 | 20.48 | V (34.47) |
| QET | r2SCAN | 16 | 15.46 | 12.02 | 11.45 | 21.20 | Cr (43.88) |
| TensorNet | PBE | 16 | 14.61 | 13.57 | 10.67 | 21.09 | Cr (46.08) |
| TensorNet | r2SCAN | 16 | 18.54 | 15.38 | 12.38 | 25.69 | Cr (44.26) |

## 3. Functional Comparison: PBE vs r2SCAN

| Model | PBE Mean MAE | r2SCAN Mean MAE | Δ (r2SCAN − PBE) |
|-------|--------------|-----------------|------------------|
| CHGNet | 17.90 | 27.94 | +10.04 |
| M3GNet | 14.13 | 20.71 | +6.58 |
| QET | 13.41 | 15.46 | +2.05 |
| TensorNet | 14.61 | 18.54 | +3.93 |
| **Overall** | **15.01** | **20.66** | **+5.65** |

## 4. Model Rankings

### Overall (mean MAE across all elements and functionals)

| Rank | Model | Mean MAE |
|------|-------|----------|
| 1 | QET | 14.44 |
| 2 | TensorNet | 16.58 |
| 3 | M3GNet | 17.42 |
| 4 | CHGNet | 22.92 |

### PBE-only

| Rank | Model | Mean MAE |
|------|-------|----------|
| 1 | QET | 13.41 |
| 2 | M3GNet | 14.13 |
| 3 | TensorNet | 14.61 |
| 4 | CHGNet | 17.90 |

### r2SCAN-only

| Rank | Model | Mean MAE |
|------|-------|----------|
| 1 | QET | 15.46 |
| 2 | TensorNet | 18.54 |
| 3 | M3GNet | 20.71 |
| 4 | CHGNet | 27.94 |

## 5. QET vs TensorNet Alias Check

Compared per-element MAE for QET and TensorNet across all 32 element–functional pairs.

- **Mean absolute MAE difference:** 8.408 GPa
- **Mean relative MAE difference:** 53.92%
- **Max absolute MAE difference:** 40.36 GPa
- **Max relative MAE difference:** 155.8%
- **Identical pairs (diff = 0):** 0 / 32
- **Near-identical pairs (diff < 0.1 GPa):** 0 / 32

| Element | Functional | QET MAE | TensorNet MAE | Abs. Diff | Rel. Diff |
|---------|------------|---------|---------------|-----------|-----------|
| Ag | PBE | 4.29 | 3.63 | 0.66 | 16.7% |
| Al | PBE | 8.84 | 10.59 | 1.75 | 18.0% |
| Au | PBE | 13.87 | 21.41 | 7.54 | 42.7% |
| Ca | PBE | 3.75 | 2.53 | 1.22 | 38.9% |
| Cr | PBE | 5.72 | 46.08 | 40.36 | 155.8% |
| Cu | PBE | 16.89 | 9.73 | 7.16 | 53.8% |
| Fe | PBE | 8.86 | 20.41 | 11.55 | 78.9% |
| Mo | PBE | 13.78 | 13.16 | 0.62 | 4.6% |
| Nb | PBE | 31.94 | 21.92 | 10.02 | 37.2% |
| Ni | PBE | 5.19 | 9.68 | 4.49 | 60.4% |
| Pd | PBE | 10.67 | 6.55 | 4.12 | 47.9% |
| Pt | PBE | 16.31 | 18.80 | 2.49 | 14.2% |
| Sr | PBE | 3.30 | 2.26 | 1.04 | 37.4% |
| Ta | PBE | 8.64 | 18.63 | 9.99 | 73.3% |
| V | PBE | 34.47 | 13.97 | 20.50 | 84.6% |
| W | PBE | 28.09 | 14.41 | 13.68 | 64.4% |
| Ag | r2SCAN | 8.23 | 7.20 | 1.03 | 13.4% |
| Al | r2SCAN | 21.68 | 15.33 | 6.35 | 34.3% |
| Au | r2SCAN | 4.71 | 10.66 | 5.95 | 77.4% |
| Ca | r2SCAN | 3.81 | 3.50 | 0.31 | 8.5% |
| Cr | r2SCAN | 43.88 | 44.26 | 0.38 | 0.9% |
| Cu | r2SCAN | 14.21 | 12.65 | 1.56 | 11.6% |
| Fe | r2SCAN | 13.48 | 27.44 | 13.96 | 68.2% |
| Mo | r2SCAN | 10.56 | 13.88 | 3.32 | 27.2% |
| Nb | r2SCAN | 23.91 | 23.21 | 0.70 | 3.0% |
| Ni | r2SCAN | 6.21 | 18.46 | 12.25 | 99.3% |
| Pd | r2SCAN | 7.17 | 22.67 | 15.50 | 103.9% |
| Pt | r2SCAN | 7.01 | 40.01 | 33.00 | 140.4% |
| Sr | r2SCAN | 14.09 | 2.15 | 11.94 | 147.0% |
| Ta | r2SCAN | 9.24 | 15.44 | 6.20 | 50.2% |
| V | r2SCAN | 34.48 | 31.98 | 2.50 | 7.5% |
| W | r2SCAN | 24.74 | 7.84 | 16.90 | 103.7% |

## 6. Per-Element Spotlight

- **Top 3 best elements** (lowest overall mean MAE): Ca (2.87), Sr (3.98), Ag (7.30)
- **Top 3 worst elements** (highest overall mean MAE): Nb (26.92), V (27.38), Cr (43.47)

### Best model per element

| Element | Best Model | Functional | MAE | Overall Mean MAE |
|---------|------------|------------|-----|------------------|
| Ag | M3GNet | PBE | 3.58 | 7.30 |
| Al | M3GNet | PBE | 7.35 | 15.51 |
| Au | QET | r2SCAN | 4.71 | 16.12 |
| Ca | CHGNet | r2SCAN | 1.47 | 2.87 |
| Cr | QET | PBE | 5.72 | 43.47 |
| Cu | TensorNet | PBE | 9.73 | 14.35 |
| Fe | QET | PBE | 8.86 | 23.29 |
| Mo | M3GNet | r2SCAN | 8.82 | 19.94 |
| Nb | TensorNet | PBE | 21.92 | 26.92 |
| Ni | M3GNet | PBE | 3.43 | 11.23 |
| Pd | TensorNet | PBE | 6.55 | 12.20 |
| Pt | M3GNet | r2SCAN | 6.27 | 23.07 |
| Sr | CHGNet | PBE | 1.93 | 3.98 |
| Ta | QET | PBE | 8.64 | 17.00 |
| V | TensorNet | PBE | 13.97 | 27.38 |
| W | TensorNet | r2SCAN | 7.84 | 20.79 |

## 7. Error Component Breakdown

Signed mean error by model × functional (positive = over-prediction).

| Model | Functional | Mean Error C11 | Mean Error C12 | Mean Error C44 |
|-------|------------|----------------|----------------|----------------|
| CHGNet | PBE | -16.51 | -0.87 | +3.66 |
| CHGNet | r2SCAN | -30.06 | -3.10 | -0.18 |
| M3GNet | PBE | -1.77 | -8.64 | +8.39 |
| M3GNet | r2SCAN | +10.75 | -10.05 | +8.32 |
| QET | PBE | +14.63 | -6.38 | +6.25 |
| QET | r2SCAN | +16.56 | -2.80 | +3.17 |
| TensorNet | PBE | -5.63 | -9.74 | +1.32 |
| TensorNet | r2SCAN | -14.15 | -12.08 | +1.92 |

## 8. Bootstrap 95% CI for Overall Mean MAE

- **Overall mean MAE:** 17.84 GPa
- **Bootstrap 95% CI:** [15.51, 20.41] GPa
- **Bootstrap samples:** 10000

## 9. Key Quantitative Takeaways

- **Best overall model:** QET (mean MAE 14.44 GPa).
- **Worst overall model:** CHGNet (mean MAE 22.92 GPa).
- **Overall model spread:** 8.48 GPa between best and worst.
- **Functional effect:** PBE is lower on average; r2SCAN raises mean MAE by 5.65 GPa overall.
- **QET vs TensorNet:** not identical; mean absolute MAE difference 8.408 GPa (53.9% relative), with 0 of 32 pairs showing zero difference.
- **Easiest element:** Ca (mean MAE 2.87 GPa).
- **Hardest element:** Cr (mean MAE 43.47 GPa).
- **Best model on PBE:** QET (mean MAE 13.41 GPa).
- **Best model on r2SCAN:** QET (mean MAE 15.46 GPa).
