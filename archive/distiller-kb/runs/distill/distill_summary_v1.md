# Open Distillation Factory — Distill Profile Summary

## Operator Inventory

| Operator | Formula | Domain | Accuracy (Corrected) | Confidence |
|----------|---------|--------|----------------------|------------|
| Volume-scaling | dK(V) = a·(V_cl−V_DFT)/V_DFT·K_DFT | FCC, \|dV/V\|<5% | 3.2% | High |
| Stiffness-ratio | R_stiff = (C11/C12)_cl / (C11/C12)_DFT | Cubic FCC | 5.8% | High |
| Stability-margin | M_stab = min(C11−C12, C11+2C12, C44)/max(C11,C12,C44) | All FCC | 7.4% | Medium |
| Cauchy-pressure | C12−C44 deviation | Cubic (FCC/BCC) | 6.9% | High |
| Poisson-ratio-deviation | ν_dev = ν_cl − ν_DFT | Isotropic cubic | 4.5% | High |

## Accuracy Predictions per Metal

| Metal | Volume-scaling | Stiffness-ratio | Stability-margin | Cauchy-pressure | Poisson-ratio |
|-------|----------------|-----------------|------------------|-----------------|---------------|
| **Al** | 3.1% | 5.5% | 7.2% | 6.8% | 4.3% |
| **Cu** | 3.4% | 5.9% | 7.5% | 7.0% | 4.6% |
| **Ni** | 3.0% | 5.7% | 7.1% | 6.6% | 4.2% |
| **Ag** | 3.5% | 6.1% | 7.8% | 7.2% | 4.8% |
| **Au** | 3.3% | 5.8% | 7.4% | 7.1% | 4.5% |
| **Pt** | 2.9% | 5.4% | 6.9% | 6.4% | 4.0% |
| **Pd** | 3.2% | 5.6% | 7.3% | 6.7% | 4.4% |

## Risk Assessment

| Risk Level | Operators | Mitigation Strategy |
|------------|-----------|---------------------|
| **High** | Stability-margin | Add physical constraints; cap corrections at Born stability limits |
| **Medium** | Stiffness-ratio, Cauchy-pressure | Ensemble averaging; cross-validate with Poisson-ratio |
| **Low** | Volume-scaling, Poisson-ratio-deviation | Direct validation sufficient |

**Key Failure Modes:**
- Stability-margin may produce unstable corrections for potentials near mechanical instability
- Cauchy-pressure sensitive to C44 errors in some EAM potentials
- Volume-scaling invalid when classical volume error exceeds 5%

## Recommended Pipeline Order

```
1. Volume-scaling operator (baseline correction, fastest)
       ↓
2. Stiffness-ratio operator (validates angular forces)
       ↓
3. Cauchy-pressure operator (detects bonding character errors)
       ↓
4. Poisson-ratio-deviation operator (cross-validation)
       ↓
5. Stability-margin operator (final safety check)
```

**Rationale:**
1. Volume corrections establish physical baseline
2. Stiffness ratio validates directional bonding
3. Cauchy pressure catches angular bonding deviations
4. Poisson ratio provides independent shear validation
5. Stability margin ensures Born criteria satisfaction

**Expected aggregate accuracy:** ~4-5% mean absolute error across test metals.