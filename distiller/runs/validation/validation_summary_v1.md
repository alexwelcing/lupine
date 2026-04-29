# EAM Ensemble Validation Report

## Summary

**Overall Status: FAIL**


### Gate Results

- ❌ FAIL: Gate 1 (Ensemble MAE < 1.0 GPa): FAIL (MAE=3.663 GPa)
- ❌ FAIL: Gate 2 (Worst-case < 5.0 GPa): FAIL (Max=5.623 GPa)

## Ensemble Metrics

| Metric | Value |
|--------|-------|
| MAE | 3.663 GPa |
| RMSE | 3.868 GPa |
| Max Error | 5.623 GPa |

## Per-Metal Errors (Ensemble)

| Metal | MAE | C11 Err | C12 Err | C44 Err |
|-------|-----|---------|---------|---------|
| Al | 2.613 | 4.270 | 2.450 | 1.120 |
| Cu | 4.037 | 5.180 | 4.270 | 2.660 |
| Ni | 4.153 | 5.810 | 3.150 | 3.500 |
| Ag | 3.267 | 4.270 | 3.710 | 1.820 |
| Au | 4.247 | 5.530 | 5.670 | 1.540 |
| Pt | 5.623 | 8.050 | 5.740 | 3.080 |
| Pd | 4.200 | 5.880 | 4.760 | 1.960 |
| Pb | 1.167 | 1.610 | 1.330 | 0.560 |

## Per-Operator Scalar Metrics

| Operator | MAE | RMSE | Max Error |
|----------|-----|------|-----------|
| rms_anisotropy | 0.0838 | 0.1460 | 0.3125 |
| zener_ratio | 0.0838 | 0.1460 | 0.3125 |
| bulk_modulus | 0.0347 | 0.0377 | 0.0568 |
| shear_modulus | 0.1063 | 0.1324 | 0.2695 |

## Pass/Fail Gates

| Gate | Threshold | Actual | Status |
|------|-----------|--------|--------|
| Ensemble MAE | < 1.0 GPa | 3.663 GPa | ❌ FAIL |
| Worst-case | < 5.0 GPa | 5.623 GPa | ❌ FAIL |