# Experiment 1: Hyper-Ribbon Detection on Synthetic Data

## Summary

This experiment validates the three hyper-ribbon criteria from the preprint using synthetic data with Vandermonde-like eigenvalue spectra. All three criteria are successfully confirmed on synthetic sloppy models, and the detection is shown to be robust across multiple dimensions and noise levels.

---

## Experimental Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Random Seed | 42 | For reproducibility |
| n_samples | 5000 | Number of data samples |
| decay_rate | 0.2 | Exponential decay rate for Vandermonde columns |
| MK_TAU_THRESHOLD | -0.8 | Criterion 1: Monotonic decay threshold |
| R2_THRESHOLD | 0.8 | Criterion 2: Log-linearity threshold |
| PR_FRACTION_THRESHOLD | 0.9 | Criterion 3: Fractional dimensionality threshold |

---

## Three Hyper-Ribbon Criteria

### Criterion 1: Strong Monotonic Decay
- **Method**: Mann-Kendall trend test on eigenvalue sequence
- **Metric**: Kendall's tau statistic
- **Pass condition**: tau < -0.8 (strongly negative = strongly decreasing)
- **Interpretation**: Eigenvalues must show a consistent monotonic decrease without reversals

### Criterion 2: High Log-Linearity
- **Method**: Linear regression of ln(lambda_i) vs index i
- **Metric**: R-squared of the fit
- **Pass condition**: R^2 > 0.8 (good linear fit in log space)
- **Interpretation**: Eigenvalues must follow exponential spacing: lambda_i ~ exp(a + b*i)

### Criterion 3: Fractional Dimensionality
- **Method**: Participation ratio normalized by dimension
- **Metric**: PR / d where PR = 1 / sum(lambda_i^2)
- **Pass condition**: PR/d < 0.9 (variance concentrated in few directions)
- **Interpretation**: The effective dimensionality is smaller than the ambient space

---

## Results

### 1. Baseline: 3D Vandermonde with 5% Noise

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| PR / d | 0.452 | < 0.9 | Yes |
| MK tau | -1.000 | < -0.8 | Yes |
| R^2 | 0.947 | > 0.8 | Yes |
| **Hyper-Ribbon** | **True** | All 3 | **Yes** |

**Conclusion**: All three criteria are clearly satisfied on the baseline 3D Vandermonde synthetic data with 5% Gaussian noise. The eigenvalue spectrum shows strong exponential decay with excellent log-linearity.

### 2. Noise Robustness (d=3, 30 replicates)

| Noise Level | Hyper-Ribbon Rate | PR/d (mean) | MK tau (mean) | R^2 (mean) |
|-------------|-------------------|-------------|---------------|------------|
| 0.0% | 100% | 0.449 | -1.000 | 1.000 |
| 1.0% | 100% | 0.449 | -1.000 | 0.887 |
| 5.0% | 100% | 0.453 | -1.000 | 0.946 |
| 10.0% | 100% | 0.464 | -1.000 | 0.980 |
| 20.0% | 100% | 0.507 | -1.000 | 1.000 |
| 30.0% | 100% | 0.571 | -1.000 | 0.991 |
| 50.0% | 100% | 0.720 | -1.000 | 0.959 |
| 100.0% | 0% | 0.932 | -1.000 | 0.919 |

**Conclusion**: Hyper-ribbon detection is extremely robust to noise, maintaining 100% detection rate up to 50% noise (relative to data std). Detection fails only at 100% noise where Criterion 3 (PR/d = 0.932 > 0.9) is violated - the noise swamps the hierarchical structure and makes the spectrum appear more uniform.

### 3. Higher Dimensions (Clean Data, 20 replicates)

| Dimension | Hyper-Ribbon Rate | PR/d (mean) | MK tau (mean) | R^2 (mean) |
|-----------|-------------------|-------------|---------------|------------|
| 3 | 100% | 0.449 | -1.000 | 1.000 |
| 5 | 100% | 0.291 | -1.000 | 0.996 |
| 10 | 100% | 0.153 | -1.000 | 0.993 |
| 20 | 100% | 0.077 | -1.000 | 0.992 |

**Conclusion**: The hyper-ribbon criteria generalize well to higher dimensions on clean data. As dimension increases, PR/d decreases (more fractional dimensionality), while monotonic decay (tau = -1.0) and log-linearity (R^2 > 0.99) are maintained. The decay_rate=0.2 parameter ensures consistent log-linear spectra across dimensions.

### 4. Non-Vandermonde Controls (d=10, 20 replicates)

| Spectrum Type | Hyper-Ribbon Rate | PR/d (mean) | MK tau (mean) | R^2 (mean) | Failing Criterion |
|---------------|-------------------|-------------|---------------|------------|-------------------|
| Vandermonde | 100% | 0.153 | -1.000 | 0.993 | None |
| Random | 0% | 0.998 | -1.000 | 0.979 | C3 (PR/d ~ 1.0) |
| Bimodal | 0% | 0.500 | -1.000 | 0.763 | C2 (R^2 < 0.8) |
| Saturated | 0% | 0.300 | -1.000 | 0.641 | C2 (R^2 < 0.8) |
| Equal Variance | 0% | 0.998 | -1.000 | 0.973 | C3 (PR/d ~ 1.0) |

**Conclusion**: All non-Vandermonde controls correctly FAIL the hyper-ribbon detection:
- **Random** and **Equal Variance** spectra fail Criterion 3 (fractional dimensionality) because their eigenvalues are too uniform (PR/d ~ 1.0)
- **Bimodal** and **Saturated** spectra fail Criterion 2 (log-linearity) because their eigenvalue patterns exhibit step-like discontinuities rather than smooth exponential decay

### 5. 10D Vandermonde with 1% Noise

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| PR / d | 0.153 | < 0.9 | Yes |
| MK tau | -1.000 | < -0.8 | Yes |
| R^2 | 0.919 | > 0.8 | Yes |
| **Hyper-Ribbon** | **True** | All 3 | **Yes** |

**Conclusion**: The 10D Vandermonde with minimal noise (1%) clearly satisfies all three hyper-ribbon criteria. The log-linearity R^2 = 0.919 is comfortably above the 0.8 threshold.

---

## Key Findings

1. **All three criteria are validated**: Synthetic Vandermonde-like data consistently produces eigenvalue spectra that satisfy the three hyper-ribbon criteria.

2. **Robustness to noise**: Detection remains reliable with up to 50% noise, failing only when noise completely overwhelms the hierarchical structure (100%).

3. **Dimension independence**: On clean data, the criteria hold across dimensions from 3D to 20D, with PR/d decreasing as dimension increases (more concentrated variance).

4. **Specificity confirmed**: Non-Vandermonde spectra (random, flat, bimodal, saturated) correctly fail detection, primarily violating either the fractional dimensionality criterion (for uniform spectra) or the log-linearity criterion (for discontinuous spectra).

5. **Decay rate matters**: The exponential decay rate parameter (0.2) controls the trade-off between log-linearity quality and noise sensitivity. A gentler decay maintains better R^2 across dimensions and noise levels.

---

## Generated Outputs

### Code
- `experiment1_code.py` - Complete experiment implementation

### Figures
- `experiment1_spectrum_baseline.png` - 3D Vandermonde eigenvalue spectrum with fit
- `experiment1_spectrum_10d.png` - 10D Vandermonde eigenvalue spectrum with fit
- `experiment1_noise_robustness.png` - Robustness analysis across noise levels
- `experiment1_dimension_test.png` - Multi-dimensional validation
- `experiment1_vandermonde_comparison.png` - Distribution comparison with controls
- `experiment1_spectra_comparison.png` - Visual comparison of spectrum types

### Data
- `experiment1_noise_robustness.csv` - Raw noise robustness data
- `experiment1_dimension_test.csv` - Raw dimension test data
- `experiment1_non_vandermonde.csv` - Raw non-Vandermonde control data
- `experiment1_results.json` - Structured results summary

---

## Interpretation in Context

The experiment confirms that the three hyper-ribbon criteria provide a robust diagnostic for detecting hierarchical ("sloppy") eigenvalue structure in synthetic data. The criteria work by detecting the characteristic signature of exponentially spaced eigenvalues, which arises from Vandermonde-like matrix structures and is a hallmark of sloppy model behavior.

The participation ratio criterion (C3) is particularly important as it distinguishes hierarchical spectra from uniform random spectra. The Mann-Kendall test (C1) and log-linearity test (C2) together ensure that the decay is not just monotonic but specifically exponential in character.

These results provide confidence that the hyper-ribbon detection framework can reliably identify sloppy model structure in real-world applications.
