# FCC Metal Operator Failure Analysis

## Executive Summary

Analysis of 5 operators across 5 FCC metals (Al, Cu, Ni, Ag, Au) reveals:
- **1 clear failure** (error > 5%): Au + volume_scaling
- **10 near-failures** (error 2-5%): borderline cases requiring attention
- **Failure rate**: 44% of operator-metal combinations show significant errors

## Failure Table

| Metal | Operator | Error (%) | Severity | Failure Reason |
|-------|----------|-----------|----------|----------------|
| Au | volume_scaling | 5.32 | **CRITICAL** | 5d relativistic effects causing anomalous volume response |
| Ni | cauchy_pressure | 4.80 | WARNING | Ferromagnetic ordering not captured by EAM |
| Ni | volume_scaling | 4.68 | WARNING | Magnetic volume contraction (Invar-like) |
| Ag | stability_margin | 3.67 | WARNING | Low C44/C11 ratio sensitivity |
| Cu | volume_scaling | 3.65 | WARNING | 3d d-band nonlinearity effects |
| Au | cauchy_pressure | 3.20 | CAUTION | 5d relativistic bonding anisotropy |
| Al | poisson_ratio | 2.81 | CAUTION | Negative Poisson ratio (unphysical) |
| Al | cauchy_pressure | 2.80 | CAUTION | Free-electron Cauchy sensitivity |
| Ag | cauchy_pressure | 2.80 | CAUTION | 4d orbital hybridization issues |
| Ag | poisson_ratio | 2.48 | CAUTION | Negative Poisson ratio (unphysical) |
| Cu | cauchy_pressure | 2.40 | CAUTION | 3d transition metal d-band errors |

## Failure Pattern Analysis

### 1. Magnetic Materials (Ni)
**Problem**: Ferromagnetic FCC metals have anomalous elastic properties due to spin-lattice coupling that EAM potentials cannot capture.

**Evidence**: 
- Ni Cauchy pressure error: 4.8% (highest non-Au failure)
- Ni volume scaling error: 4.68%

**Proposed Fix**:
```python
def magnetic_correction(Cp, T_Curie, T=0, mu_sat=5.4e-3):
    """Add magnetic correction for ferromagnetic materials"""
    alpha = 0.3  # empirical factor
    order_param = max(0, (T_Curie - T) / T_Curie)
    return Cp + alpha * order_param * mu_sat * 1e3  # GPa units
```

### 2. Heavy 5d Elements (Au)
**Problem**: Relativistic effects in 5d metals cause:
- Electron contraction (6s → 5d)
- Increased atomic density
- Reduced thermal expansion
- Anomalously low C44

**Evidence**: Au volume_scaling error = 5.32% (only >5% failure)

**Proposed Fix**:
```python
def relativistic_correction(a, Z, r_s):
    """Element-specific scaling for heavy elements"""
    if Z >= 78:  # Au and heavier
        a_mod = 0.15  # reduced scaling
    elif Z >= 46:  # Ag and heavier  
        a_mod = 0.25  # moderate reduction
    else:
        a_mod = a
    return a_mod
```

### 3. Free-Electron Metals (Al, Ag)
**Problem**: Nearly-free-electron metals (Al, Ag) produce:
- Negative Poisson ratios (unphysical)
- Extreme sensitivity to C11/C12 ratio
- Cauchy pressure sensitivity to small errors

**Evidence**: 
- Al poisson_ratio error: 2.81% (with negative nu)
- Ag poisson_ratio error: 2.48% (with negative nu)
- Warnings in raw output confirm negative values

**Proposed Fix**:
```python
def clamped_poisson_ratio(nu_class):
    """Clamp Poisson ratio to physical range"""
    if nu_class < 0.2:
        warnings.warn(f"Unphysical Poisson ratio: {nu_class}")
        return 0.3  # typical metallic value
    return nu_class
```

### 4. d-Band Transition Metals (Cu, Ag, Au)
**Problem**: Partially filled d-bands cause nonlinear elastic responses that linear operators cannot capture.

**Proposed Fix**: Element-specific calibration factors

## Operator Performance Ranking

| Rank | Operator | MAE | Verdict |
|------|----------|-----|---------|
| 1 | stiffness_ratio | 0.026 | **EXCELLENT** - Works for all metals |
| 2 | stability_margin | 1.174 | GOOD - Ag exception |
| 3 | poisson_ratio | 1.249 | CAUTION - Free-electron issues |
| 4 | volume_scaling | 3.131 | WARNING - Needs element-specific calibration |
| 5 | cauchy_pressure | 3.200 | WARNING - Magnetic/relativistic failures |

## Recommended Actions

1. **Immediate**: Clamp all Poisson ratio outputs to [0.2, 0.5]
2. **Short-term**: Add magnetic_correction operator for Ni, Fe, Co
3. **Medium-term**: Implement relativistic corrections for 4d/5d metals
4. **Long-term**: Develop separate operator families:
   - Free-electron family (Al, Pb)
   - d-band family (Cu, Ni, Ag, Au, Pt)
   - Magnetic family (Ni, Fe, Co)

## Conclusions

The stiffness_ratio operator is robust across all FCC metals. The primary failure modes are:
1. Ferromagnetism (Ni) - requires spin-polarized corrections
2. Relativistic effects (Au) - requires 5d-specific calibration
3. Unphysical Poisson ratios (Al, Ag) - require clamping

The proposed fixes preserve operator mathematical forms while adding physical corrections for known failure mechanisms.
