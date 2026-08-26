# 3×3×3 Completion Tests: H1–H4 and Class-Aware Operator

Total cases: 128

## H1 — Cleaned effect size on 3d/4d subset

- S_func = 0.2932
- S_arch = 0.4307
- Effect size = -0.1375
- Permutation p-value = 0.1260 (1260/10000)
- Kill condition (effect < 0.20): TRIGGERED

## H2a — 3d/4d functional clustering

- Same as H1: p = 0.1260
- Kill condition (3d/4d does not cluster): TRIGGERED

## H2b — 5d functional similarity (Ta, W, Pt)

- S_func = 0.1359
- S_arch = 0.4040
- Effect size = -0.2681
- Permutation p-value = 0.4842
- Mean PBE↔r2SCAN error-vector cosine = 0.5338 (median 0.7235)
- Kill condition (5d clusters strongly, p<0.05): NOT TRIGGERED

## Clustering robustness variants

| Subset | S_func | S_arch | Effect size | p-value | n_func | n_arch |
|---|---:|---:|---:|---:|---:|---:|
| FCC 3d/4d | 0.4757 | 0.5382 | -0.0625 | 0.0736 | 40 | 24 |
| All FCC | 0.5756 | 0.5837 | -0.0081 | 0.0443 | 90 | 54 |
| BCC 3d/4d | 0.1473 | 0.3448 | -0.1975 | 0.2882 | 50 | 30 |
| Transition FCC | 0.3279 | 0.5070 | -0.1791 | 0.3822 | 30 | 18 |
| Transition BCC | 0.0826 | 0.3417 | -0.2591 | 0.2950 | 70 | 42 |
| All transition | 0.2539 | 0.4241 | -0.1702 | 0.1812 | 120 | 72 |

## H3 — Rotation link to Layer 3

- **Pending:** requires pseudopotential/all-electron DFT Layer-3 data not yet computed.

## H4 — Operator vs ensemble (LOO oracle, QET as single model)

**Certification status:** Every corrected MAE/MSE in this section is an empirical oracle aggregate and is **uncertified** as a correction license. Certification would require a valid held-out-target license for each C11, C12, and C44 component; no derived elastic quantity inherits a license from componentwise correction.

- Ensemble raw MAE = 12.62 GPa; MSE = 288.71 GPa²
- QET + LOO operator MAE = 8.95 GPa; MSE = 167.89 GPa²
- Operator beats ensemble on MAE: True; on MSE: True

Per-model operator vs ensemble:

| Model | Operator MAE | Operator MSE | Beats ensemble MAE | Beats ensemble MSE |
|---|---:|---:|:---|:---|
| CHGNet | 12.29 | 403.97 | True | False |
| M3GNet | 10.09 | 220.12 | True | True |
| QET | 8.95 | 167.89 | True | True |
| TensorNet | 10.09 | 265.29 | True | True |

## Class-aware correction operator (LOO)

Oracle magnitude uses the held-out target to set the projection coefficient; the no-target variants use only training data.

| Variant | Raw MAE | Oracle MAE | Mean-α MAE | Median-α MAE | Mean-resid MAE | Oracle harm | Mean-α harm | Median-α harm | Mean-resid harm |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Global 1-D | 17.84 | 10.36 | 18.0 | 18.12 | 17.5 | 0/128 | 67/128 | 102/128 | 55/128 |
| Bonding-class 1-D | 17.84 | 9.97 | 17.4 | 17.12 | 17.17 | 0/128 | 57/128 | 48/128 | 54/128 |
| alkaline_earth_fcc | 3.43 | 2.49 | 3.18 | 3.02 | 3.06 | 0/16 | 6/16 | 4/16 | 3/16 |
| noble_coinage_fcc | 12.59 | 9.41 | 11.45 | 11.43 | 9.68 | 0/24 | 12/24 | 8/24 | 8/24 |
| post_transition | 15.51 | 5.74 | 8.32 | 7.6 | 8.26 | 0/8 | 1/8 | 1/8 | 1/8 |
| transition_bcc | 25.54 | 13.73 | 26.01 | 25.72 | 26.46 | 0/56 | 27/56 | 27/56 | 30/56 |
| transition_fcc | 15.5 | 8.14 | 15.75 | 15.32 | 15.35 | 0/24 | 11/24 | 8/24 | 12/24 |

## Conformal coverage (90% target)

- Global operator: coverage = 0.867, mean width = 73.09 GPa
- Class-aware operator: coverage = 0.750, mean width = 52.69 GPa
