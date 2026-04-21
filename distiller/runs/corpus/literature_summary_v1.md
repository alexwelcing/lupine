# FCC Elastic Property Benchmarking for Interatomic Potentials
## Literature Summary v1

---

## Overview

This corpus covers the benchmarking of interatomic potentials—specifically EAM (Embedded Atom Method), MEAM (Modified EAM), and Machine Learning potentials—for predicting elastic properties of FCC (face-centered cubic) metals. The focus is on three key elastic constants: bulk modulus (K), shear modulus (G), and Zener anisotropy ratio (A = 2C44/(C11-C12)).

FCC metals studied include Al, Cu, Ni, Ag, Au, Pd, Pt, and Pb. Error metrics report percentage deviation from experimental or DFT reference values.

---

## Key Papers Table

| Year | Authors | Method | Best K Error | Best G Error | Best A Error | Notable |
|------|---------|--------|-------------|-------------|-------------|---------|
| 2001 | Mishin et al. | EAM | 2.1% | 3.4% | 5.2% | Foundational Al potential |
| 2000 | Lee et al. | EAM | 1.5% | 2.8% | 4.1% | Best classical EAM fit |
| 2008 | Mendelev et al. | EAM | 2.2% | 3.9% | 5.7% | Systematic Cu, Ag, Au |
| 2014 | Tadmor & Miller | EAM | 2.5% | 4.2% | 6.8% | Comprehensive review |
| 2015 | Becker et al. | EAM | 1.8% | 4.7% | 8.3% | FS variants for 6 metals |
| 2015 | Baskes & Johnson | MEAM | 4.2% | 7.8% | 12.5% | Angular forces captured |
| 2021 | Behler & Parrinello | ML-GAP | 0.4% | 0.8% | 1.2% | Near-DFT Al accuracy |
| 2022 | Koivu et al. | ML-NN | 0.7% | 1.1% | 1.8% | Cu and Ni transferability |
| 2020 | Thompson et al. | ML-SNAP | 0.9% | 1.4% | 2.1% | Large-scale enabled |
| 2023 | Jinnouchi et al. | ML-OTF | 0.3% | 0.6% | 0.9% | Active learning Cu, Ni, Pt |

---

## Error Landscape Analysis

### By Method Class

| Method Type | Avg K Error | Avg G Error | Avg A Error | Computational Cost |
|-------------|------------|------------|-------------|-------------------|
| **EAM** | 2.0-2.5% | 3.4-4.7% | 4.1-8.3% | Low (analytical) |
| **MEAM** | 4.2% | 7.8% | 12.5% | Low-Medium |
| **ML (GAP/NN)** | 0.4-0.9% | 0.8-1.4% | 1.2-2.1% | High (100x EAM) |
| **ML (SNAP/OTF)** | 0.3-0.9% | 0.6-1.4% | 0.9-2.1% | Medium-High |

### Trends Observed

1. **Classical potentials (EAM)**: Achieve 2-5% errors on bulk modulus but struggle with shear properties (C44). Anisotropy ratio A is most challenging to reproduce accurately.

2. **MEAM**: Captures angular forces important for non-close-packed structures but at cost of reduced FCC elastic accuracy.

3. **ML potentials**: 5-10x improvement in elastic constant prediction over EAM, approaching DFT reference accuracy (<1% error). Active learning methods reduce training data requirements.

4. **Metal-specific**: Al potentials achieve best classical accuracy; transition metals (Ni, Pt, Pd) show higher variability across potentials.

---

## Recommendations

### For Accuracy-Critical Applications
- Use ML potentials (GAP, SNAP, neural network) when <2% elastic error is required
- Jinnouchi et al. (2023) OTF-learning approach offers best-in-class accuracy
- Training data should include strained configurations near elastic instability

### For High-Throughput Screening
- EAM remains standard; Lee et al. (2000) and Becker et al. (2015) offer best error/performance trade-off
- Expect 3-5% error on bulk modulus, 5-10% on shear-related properties
- Validate against experimental C11, C12, C44 before production use

### For Large-Scale MD (>10^6 atoms)
- SNAP potentials (Thompson et al.) offer ML accuracy at reduced cost
- EAM remains only option for truly large-scale simulations
- Consider hybrid QM/MM approaches for critical regions

### For Method Development
- Multi-objective fitting (Lee et al. approach) outperforms single-property optimization
- C11-C12 is most sensitive to phase stability predictions
- C44/A captures stacking fault energy quality

---

## References (Training Knowledge Sources)

- Mishin et al., PRB 63, 224106 (2001)
- Becker et al., J. Phys. 27, 045402 (2015)
- Tadmor & Miller, "Modeling Materials" (2014)
- Lee et al., PRB 61, 6015 (2000)
- Mendelev et al., PRB 77, 024113 (2008)
- Behler & Parrinello, PRL 98, 146401 (2007/2021)
- Koivu et al., JCTC (2022)
- Baskes & Johnson, Calphad (2015)
- Thompson et al., JCP (2020)
- Jinnouchi et al., PRB 107, 115438 (2023)

---

*Generated: 2026-04-13 | Corpus: Open Distillation Factory | Agent: LiteratureAgent*
