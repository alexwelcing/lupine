# Experiment 2: Ecological Fallacy with Simulated Elastic Constants

## Objective

Demonstrate numerically how aggregating across groups (BCC vs FCC) produces 
misleading correlation benchmarks, while stratifying reveals true structure.

## Methodology

### 1. Reference Data Simulation
- **BCC metals** (n=7): Fe, W, Mo, Cr, V, Nb, Ta
  - Characteristic: C12 ≈ C44 (Cauchy relation approximately holds)
  - C11 range: ~200-550 GPa
- **FCC metals** (n=8): Al, Cu, Au, Ni, Pd, Pt, Ag, Pb
  - Characteristic: C12 > C44 (Cauchy violation)
  - Wider range of elastic constants

### 2. Prediction Simulation
- **BCC predictions**: Strong positive correlation to reference (target r = 0.85)
  - Represents a model that works well for BCC metals
- **FCC predictions**: Weak/no correlation to reference (target r = 0.15)
  - Represents a model that fails for FCC metals

### 3. Simpson's Paradox Design
- BCC and FCC groups both have positive within-group correlations (r ~ 0.75-0.95)
- Between-group offsets create negative pooled correlation (r ~ -0.1 to -0.6)
- Reversal magnitude > 0.3 per Kievit et al. framework (all components PASS)

### 4. Statistical Analysis
- Pearson correlation coefficient (r)
- Bootstrapped 95% confidence intervals (10,000 resamples)
- Coefficient of determination (R²)
- Mean absolute error (MAE) and root mean square error (RMSE)

## Results

### Ecological Fallacy Demonstration

When predictions are evaluated **within each crystal structure**:


#### C11

| Scenario | r | 95% CI | R² | MAE (GPa) | RMSE (GPa) |
|----------|---|--------|----|-----------|------------|
| Pooled | +0.6991 | [+0.0420, +0.9256] | 0.3848 | 71.63 | 95.65 |
| BCC | +0.8500 | [+0.3466, +0.9967] | 0.6812 | 56.57 | 61.79 |
| FCC | +0.1500 | [-0.7450, +0.9129] | -0.8390 | 84.81 | 117.53 |

#### C12

| Scenario | r | 95% CI | R² | MAE (GPa) | RMSE (GPa) |
|----------|---|--------|----|-----------|------------|
| Pooled | +0.3127 | [-0.3406, +0.8758] | -0.4538 | 43.74 | 64.78 |
| BCC | +0.8500 | [+0.4758, +0.9982] | 0.6741 | 17.05 | 21.46 |
| FCC | +0.1500 | [-0.6990, +0.9137] | -0.8574 | 67.09 | 86.41 |

#### C44

| Scenario | r | 95% CI | R² | MAE (GPa) | RMSE (GPa) |
|----------|---|--------|----|-----------|------------|
| Pooled | +0.6384 | [+0.2057, +0.8992] | 0.2484 | 26.76 | 34.52 |
| BCC | +0.8500 | [+0.5977, +0.9892] | 0.6744 | 21.41 | 23.56 |
| FCC | +0.1500 | [-0.6873, +0.9617] | -0.7402 | 31.44 | 41.82 |

### Key Finding: The Ecological Fallacy

When BCC (r ~ 0.85) and FCC (r ~ 0.15) results are **pooled together**, 
the correlation appears moderate (r ~ 0.31-0.70). This pooled metric:

1. **Overstates** performance for FCC metals (0.15 → 0.31-0.70)
2. **Understates** performance for BCC metals (0.85 → 0.31-0.70)
3. Creates a **false impression** of uniform model quality

This is the ecological fallacy: inferences about the population (pooled) 
do not apply to subgroups (BCC, FCC).

### Simpson's Paradox Demonstration

**True sign reversal achieved**: within-group correlations are positive 
while pooled correlation is negative.


#### C11

| Scenario | r |
|----------|---|
| BCC | +0.7669 |
| FCC | +0.8310 |
| POOLED | -0.5756 |

**Reversal magnitude**: 1.3745
**Kievit criterion** (> 0.3): PASS ✓

#### C12

| Scenario | r |
|----------|---|
| BCC | +0.8811 |
| FCC | +0.9762 |
| POOLED | -0.1337 |

**Reversal magnitude**: 1.0623
**Kievit criterion** (> 0.3): PASS ✓

#### C44

| Scenario | r |
|----------|---|
| BCC | +0.9048 |
| FCC | +0.9326 |
| POOLED | -0.3064 |

**Reversal magnitude**: 1.2251
**Kievit criterion** (> 0.3): PASS ✓

### Key Finding: Simpson's Paradox

The within-group correlations (all positive, r = 0.77-0.98) have the 
**opposite sign** from the pooled correlation (negative, r = -0.13 to -0.58). 
This occurs because:

1. BCC metals have higher mean reference values but predictions are shifted LOW
2. FCC metals have lower mean reference values but predictions are shifted HIGH
3. The between-group structure (high-X/low-Y + low-X/high-Y) dominates
4. A naive pooled analysis concludes the model has NEGATIVE correlation
5. Stratified analysis reveals both groups actually have POSITIVE correlations

This demonstrates how aggregation can completely reverse the apparent 
direction of an effect — a model that works well within each structure 
type appears to fail overall.

## Implications for Materials ML

1. **Always stratify by crystal structure** when evaluating elastic constant predictions
2. **Pooled metrics are misleading** when model quality varies by structure type
3. **Report structure-specific correlations** alongside overall metrics
4. **Simpson's paradox** can occur when different structures occupy different 
   regions of property space
5. **Pair style stratification** reveals similar patterns — aggregating across 
   potential types obscures true performance differences

## Files Generated

- `experiment2_code.py`: Full experiment source code
- `experiment2_ecological_fallacy.png`: Main ecological fallacy scatter plot
- `experiment2_simpsons_paradox.png`: Simpson's paradox visualization
- `experiment2_forest_plot.png`: Forest plot with confidence intervals
- `experiment2_pair_style_stratification.png`: Pair style stratification
- `experiment2_summary.png`: Comprehensive summary figure
- `experiment2_results.json`: Machine-readable numerical results
- `experiment2_results.md`: This file

## References

1. Kievit, R. A., Frankenhuis, W. E., Waldorp, L. J., & Borsboom, D. (2013).
   Simpson's paradox in psychological science: a practical guide.
   *Frontiers in Psychology*, 4, 513.

2. Robinson, W. S. (1950). Ecological correlations and the behavior of 
   individuals. *American Sociological Review*, 15(3), 351-357.

3. Pedhazur, E. J. (1997). *Multiple Regression in Behavioral Research*.
   3rd Edition. Wadsworth.

---
*Generated by Experiment 2: Ecological Fallacy Demonstration*
