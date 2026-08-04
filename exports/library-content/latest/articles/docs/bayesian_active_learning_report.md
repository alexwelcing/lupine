# Bayesian Active Learning for Interatomic Potential Selection

## Kimi Deep Research Report — Comprehensive Literature Review & Practical Guide

**Tags:** Bayesian Optimization | Active Learning | Materials Science | GLIM

---

## Report Structure (10 Major Sections, 22+ Tables)

### 1. Problem Formulation and Theoretical Foundations

#### 1.1 The GLIM Benchmark Challenge

##### 1.1.1 Dataset Characteristics: 23 Potentials x 12,000 Materials

The GLIM benchmark represents a paradigm shift in computational materials science, providing systematic evaluation of 23 distinct interatomic potentials across approximately 12,000 materials from the JARVIS-FF database. This massive-scale comparison creates a performance matrix of 276,000 potential-material combinations for each target property. The 23 potentials encompass a diverse methodological spectrum: classical empirical potentials (EAM, MEAM, ReaxFF), machine learning interatomic potentials (SNAP, GAP, neural network potentials), and recent universal pre-trained models (M3GNet, CHGNet, MACE-MP0).

**Table 1**: Taxonomy of interatomic potentials in the GLIM benchmark, illustrating the cost-accuracy spectrum that motivates multi-fidelity optimization.

##### 1.1.2 Target Properties: Bulk Modulus (K), Shear Moduli (C', C44)

**Table 2**: Target elastic constants in the GLIM benchmark, showing their complementary information content and varying sensitivity to potential quality.

##### 1.1.3 Dimensionality Reduction: PCA Analysis with 55% First-Component Variance

The PCA decomposition operates on the centered prediction error matrix, where entries represent deviations from DFT reference values. The 55% variance capture is remarkably high for such heterogeneous data, indicating that potential performance is not randomly distributed but follows predictable patterns exploitable for selection.

| Principal Component | Variance Explained | Interpretation | Implications for Selection |
|---|---|---|---|
| PC1 | 55% | Global "potential quality" / "material difficulty" axis | Coarse ranking; identifies broadly good/bad potentials |
| PC2 | ~15% | Ionic vs. covalent bonding discrimination | Separates potential families by bonding type |
| PC3 | ~10% | Crystal structure effects (fcc vs. bcc vs. hcp) | Structure-specific performance patterns |
| PC4-5 | ~5% each | Property-specific effects | Fine-grained, property-dependent selection |

##### 1.1.4 Core Decision Problem: Material-Specific Potential Trustworthiness

**Table 4**: Taxonomy of uncertainty sources in potential selection, distinguishing reducible (epistemic) from irreducible (aleatoric) components.

#### 1.2 Statistical Framework for Model Selection

- 1.2.1 From Single-Model Prediction to Ensemble Decision-Making
- 1.2.2 Connection to Multi-Armed Bandit Theory
- 1.2.3 Bayesian Information Criteria for Potential Ranking

---

### 2. Bayesian Model Averaging (BMA) for Multi-Potential Ensembles

#### 2.1 Classical BMA Theory Adapted to Interatomic Potentials

- 2.1.1 Posterior Weight Computation via Marginal Likelihood
- 2.1.2 Heteroscedastic Error Models Capturing Material-Dependent Accuracy
- 2.1.3 Property-Dependent Weight Profiles: Why "Best Overall" != "Best for K"

Specialist behavior is valuable for application-targeted selection — the same material may warrant different potentials for bulk modulus screening versus dislocation modeling.

#### 2.2 Implementation Strategies for Interatomic Potential Ensembles

##### 2.2.1 Training Set Likelihood Evaluation Across JARVIS-FF Materials

Practical BMA implementation requires efficient likelihood computation at GLIM scale. The heteroscedastic error model:

log p(y_i | m, M_k) ~ -(y_i - y_ki)^2 / (2 sigma_k^2(m_i)) - log sigma_k(m_i)

The material-dependent variance sigma_k^2(m) is learned via GP regression on descriptors, enabling location-adaptive uncertainty.

---

### 3. Gaussian Process Surrogates for Error Prediction

- 3.1 Multi-Output GP Framework for the GLIM Error Matrix
- 3.2 Kernel Design for Material-Potential Interactions (Tables 8-9)
- 3.3 Scalable GP Approximations for 12,000-Material Problems (Table 10)

---

### 4. Active Learning and Query-by-Committee for DFT Prioritization

#### 4.1 Ensemble Disagreement as Uncertainty Measure

##### 4.1.2 Jensen-Shannon Divergence for Multi-Potential Comparison

JSD(m) = (1/K) sum_k KL(p_k(.|m) || p_ens(.|m))

Captures both mean and variance disagreement, identifying materials where potentials differ in confidence as well as point estimates.

##### 4.1.3 Committee Variance as Proxy for Epistemic Uncertainty

sigma^2_committee(m) = (1/(K-1)) sum_k (y_k(m) - y_bar(m))^2

Decomposition: Total error^2 = Bias^2 + sigma^2_committee + sigma^2_aleatoric. The committee variance term is reducible epistemic uncertainty — the target of active learning.

#### 4.2 Uncertainty-Driven DFT Prioritization

##### 4.2.1 Maximum Expected Prediction Error (MEPE) Criteria

alpha_MEPE(m) = mu^2_bias(m) + sigma^2_committee(m)

- 4.2.2 Acquisition Function Design for Multi-Potential Selection (Table 12)
- 4.2.3 Batch Selection Strategies for Parallel DFT Computation

---

### 5. Multi-Fidelity Bayesian Optimization

- 5.1 Cost-Accuracy Hierarchy Among 23 Potentials (Table 13)
- 5.2 Multi-Fidelity GP Models (MFGP) (Table 14)
- 5.3 Information-Theoretic Acquisition Functions (alpha-UA)

---

### 6. Domain-Specific Considerations for Crystalline Materials

- 6.1 Crystal Symmetry-Aware Feature Engineering (Table 15)
- 6.2 Composition-Structure-Property Relationships in Feature Space
- 6.3 Transfer Learning Between Crystal Structure Families

---

### 7. Gaussian Process Architecture Design for GLIM

- 7.1.1 Matern-5/2 recommended: balance between smoothness and flexibility
- 7.1.2 Heteroscedastic GPs for Input-Dependent Noise: Twin GP formulation
- 7.1.3 Warped GPs for Non-Gaussian Error Distributions

**Table 17**: Kernel selection for GP surrogates in materials applications.

---

### 8. Literature Synthesis: Key References and Methods

- GP-MFBO, MEPE, UAPCA, alpha-UA acquisition function
- MC dropout for atomistic ML uncertainty
- QBC ensemble disagreement methods
- Bayesian model selection for elastic materials
- Ensemble variance as most promising acquisition criterion

---

### 9. Comparative Analysis of Acquisition Strategies (Tables 18-21)

---

### 10. Implementation Roadmap

#### 10.1 Software Ecosystem

| Tool | Role | Key Features |
|---|---|---|
| BoTorch | Bayesian optimization | GPU-accelerated, modular acquisition functions |
| GPyTorch | GP modeling | Scalable exact/approximate inference |
| ASE | Atomistic simulation | Calculator interface for all potentials |
| pymatgen | Structure analysis | Composition/structure featurization |
| Matminer | Feature extraction | Magpie, SOAP, structure featurizers |
| AiiDA/FireWorks | Workflow orchestration | Provenance, distributed execution |

#### 10.2 End-to-End Workflow Design

```
Input: Material m with descriptors phi(m)
1. Predict: mu_k(m), sigma_k(m) for all k potentials via GP surrogate
2. Select: (m, k*) = argmax acquisition(mu, sigma, cost)
3. Evaluate: Run potential k* on material m, observe y
4. Update: Incorporate (m, k*, y) into GP posterior
5. Recommend: Return best predicted potential or BMA prediction
```

#### 10.3 Validation and Benchmarking Protocols

- Leave-One-Material-Out Cross-Validation
- Time-Based Splits for Temporal Generalization
- Adversarial Testing for Robustness Assessment

#### 10.4 Future Directions

- Foundation Models for Universal Potential Pre-Training
- Causal Inference for Mechanistic Understanding
- Federated Learning for Distributed Potential Development

---

## Key Findings for GLIM

1. **Ensemble variance from 23 potentials is the most promising acquisition criterion** for active learning
2. **Heteroscedastic GP surrogates** with Matern-5/2 kernels provide optimal balance for error prediction
3. **BMA with property-dependent weights** captures the specialist nature of potentials
4. **Multi-fidelity optimization** exploits the cost hierarchy via alpha-UA acquisition functions
5. **Committee variance decomposes** into bias + epistemic + aleatoric components
6. **Leave-one-material-out cross-validation** is the primary validation protocol

---

*Report extracted from Kimi Deep Research. March 28, 2026.*
*Note: Partial extraction (~40% of 55K original) due to content filtering. Full report accessible in browser tab 1899282409.*
