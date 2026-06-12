# Dimension 03: Machine Learning Interatomic Potentials (MLIPs)

## Research Summary

This report investigates the current state of Machine Learning Interatomic Potentials (MLIPs) and whether they exhibit similar low-dimensional error structure as classical potentials. We cover the MLIP landscape (MACE, ACE, NequIP, Allegro, GAP, MTP, HDNNP, DeePMD), the Mao et al. work on hyper-ribbon training manifolds, MACE-MP0 and subsequent foundation models, error structure analysis, BCC/FCC behavior, elastic constant prediction accuracy, and computational cost trade-offs.

---

## 1. Current MLIP Landscape

### 1.1 Major MLIP Architectures

The field of MLIPs has undergone explosive growth, with multiple architectures competing across accuracy, speed, and data efficiency dimensions. A comprehensive user-perspective benchmark by Leimeroth et al. (2025) evaluated GAP, HDNNP, MTP, ACE (linear and nonlinear), NequIP, Allegro, and MACE on Al-Cu-Zr and Si-O systems [^1^].

**Key finding:** Nonlinear ACE and the equivariant message-passing graph neural networks (NequIP and MACE) form the Pareto front in the accuracy vs. computational cost trade-off [^1^]. For Al-Cu-Zr, MACE and Allegro offer the highest accuracy, while NequIP outperforms them for Si-O [^1^].

**Claim:** "We find that nonlinear ACE and the equivariant, message-passing graph neural networks NequIP and MACE form the Pareto front in the accuracy vs. computational cost trade-off." [^1^]
**Source:** Leimeroth et al., Machine-learning interatomic potentials from a users perspective
**URL:** https://arxiv.org/abs/2505.02503
**Date:** 2025-05-05
**Excerpt:** "We find that nonlinear ACE and the equivariant, message-passing graph neural networks NequIP and MACE form the Pareto front in the accuracy vs. computational cost trade-off."
**Context:** Benchmark on Al-Cu-Zr and Si-O systems comparing 7 MLIP types
**Confidence:** High

### 1.2 Accuracy Hierarchy

From the benchmark [^1^]:
- **Top tier:** MACE, Allegro, NequIP (highest accuracy)
- **Second tier:** Nonlinear ACE (close behind)
- **Third tier:** MTP, linear ACE
- **Fourth tier:** HDNNP, GAP (lower accuracy, limited by training data or memory)

For GPU-accelerated variants, ACE, MACE and Allegro run approximately two orders of magnitude faster on NVIDIA A100 GPUs compared to CPU versions [^1^].

### 1.3 Universal/Foundation Models

The landscape of universal MLIPs (uMLIPs) has expanded dramatically:

| Model | Training Data | Parameters | Key Feature |
|-------|--------------|------------|-------------|
| M3GNet | 188k structures | 228k | Early GNN-based UIP |
| CHGNet | MPtrj (1.58M) | 413k | Charge-informed |
| MACE-MP-0 | MPtrj | 4.69M | Equivariant message passing |
| MACE-MPA-0 | MPtrj + sAlex | 9.06M | Enhanced with Alexandria dataset |
| MatterSim | Proprietary | 4.55M | Microsoft proprietary dataset |
| SevenNet | OMat + MPtrj + sAlex | ~25.7M | Multi-foundation training |
| Orb-v3 | OMat24 + MPtrj + sAlex | 25.5M | Engineering-optimized |
| GRACE-2L | OMat24 + MPtrj + sAlex | 12.6M-15.3M | ACE-based |
| EquiformerV2/OMat24 | OMat24 | ~150M (largest) | Best-in-class accuracy |

**Claim:** "M3GNet was trained with 188k structures and has 228k params; CHGNet uses the MPtrj dataset with 1.58M structures and has 413k params; MACE MP-0 was also trained with MPtrj and has 4.69M params; and GNoME was trained with an active learning dataset of 89M structures and has 16.2M parameters." [^2^]
**Source:** Casillas-Trujillo et al., Performance Assessment of Universal MLIPs
**URL:** https://arxiv.org/html/2403.04217v1
**Date:** 2024-03-07
**Excerpt:** As above
**Context:** Chronological review of universal MLIP parameter growth
**Confidence:** High

---

## 2. Mao et al. on Hyper-Ribbon Error Structure in Neural Networks

### 2.1 The Core Finding: Low-Dimensional Training Manifolds

The key paper is Mao et al. (2024), published in PNAS [^3^]. This work demonstrates that the training process of deep neural networks explores a remarkably low-dimensional "hyper-ribbon-like" manifold in the space of probability distributions.

**Claim:** "We develop information-geometric techniques to analyze the trajectories of the predictions of deep networks during training. By examining the underlying high-dimensional probabilistic models, we reveal that the training process explores an effectively low-dimensional manifold." [^3^]
**Source:** Mao et al., PNAS
**URL:** https://arxiv.org/abs/2305.01604 (preprint); https://doi.org/10.1073/pnas.2310002121 (PNAS)
**Date:** 2024-03-19 (PNAS publication)
**Excerpt:** "Networks with a wide range of architectures, sizes, trained using different optimization methods, regularization techniques, data augmentation techniques, and weight initializations lie on the same manifold in the prediction space."
**Context:** Foundational paper on information geometry of deep learning
**Confidence:** High

### 2.2 Dimensionality Findings

Across large problems with dimensions sim 10^6 - 10^8, training manifolds are found to be remarkably low-dimensional:
- **As low as ~50 dimensions** are sufficient to embed the manifold faithfully [^4^]
- Networks with different architectures follow **distinguishable trajectories** but on the same underlying manifold
- Larger networks train along similar manifolds as smaller networks, just faster
- Networks initialized at very different points converge along similar manifolds

### 2.3 Analytical Characterization (2025 Follow-up)

Griniasty et al. (2025, arXiv) provided an analytical characterization of this phenomenon for linear models, showing the geometry is controlled by three factors [^4^]:

1. **Decay rate of eigenvalues** of the input correlation matrix of training data (sloppiness)
2. **Relative scale** of ground-truth output to initial weights
3. **Number of gradient descent steps**

**Claim:** "The key question that will help frame our narrative is: why do different architectures, training and regularization methods, explore such a tiny subset of the prediction space? [...] across large problems with n(C-1) ~ 10^6 - 10^8, the authors in [mao2024training, rameshPictureSpaceTypical2023] have found training manifolds to be remarkably low-dimensional, as low as 50 dimensions seem sufficient to embed the manifold faithfully." [^4^]
**Source:** Griniasty et al., An Analytical Characterization of Sloppiness in Neural Networks
**URL:** https://arxiv.org/html/2505.08915v2
**Date:** 2025-05-15
**Excerpt:** As above
**Context:** Theoretical analysis connecting hyper-ribbon structure to sloppiness theory
**Confidence:** High

### 2.4 Implications for MLIPs

The Mao et al. finding that deep neural networks explore low-dimensional manifolds during training has direct relevance to MLIPs:

- **MLIPs ARE neural networks** (in the case of NequIP, Allegro, MACE, etc.), so the same low-dimensional training manifold structure applies
- The "hyper-ribbon" structure suggests that different MLIP architectures may explore similar regions of prediction space despite different architectures
- The low dimensionality arises from the **structure of the task** (physics of interatomic interactions) as much as from the architecture
- This provides theoretical justification for why different MLIP architectures often show similar accuracy when well-trained

**No direct evidence was found** that anyone has explicitly studied whether MLIP prediction errors compress to low-dimensional hyper-ribbon manifolds in the same way as classical potential errors. However, the Mao et al. work on training manifolds, combined with the PES softening finding (Section 4), suggests that MLIP errors ARE highly structured and systematic.

---

## 3. MACE-MP0 Foundation Model

### 3.1 Training and Architecture

MACE-MP-0 is the most widely deployed universal MLIP foundation model [^5^].

**Claim:** "The model referred to in this study uses two MACE layers, a spherical expansion of up to l_max = 3, and 4-body messages in each layer (correlation order 3). The model uses a 128-channel dimension for tensor decomposition. We use a radial cutoff of 6 Angstrom [...] a fully connected feed-forward neural network with three hidden layers of 64 hidden units and SiLU nonlinearities." [^5^]
**Source:** Batatia et al., A foundation model for atomistic materials chemistry (JCP)
**URL:** https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267
**Date:** 2025-11-14
**Excerpt:** Architecture details as above
**Context:** Methods section describing MACE-MP-0 architecture
**Confidence:** High

### 3.2 Training Performance

- Training dataset: **MPtrj** (Materials Project trajectories)
- Energy MAE: **18 meV/atom** (medium model)
- Force MAE: **39 meV/Angstrom** (medium model)
- Training time: ~2600 GPU hours on 40-80 NVIDIA H100 GPUs
- Speed: Several ns/day for 1000 atoms on single NVIDIA A100 GPU [^5^]
- Parallel scaling: Perfect weak scaling up to 10^6 atoms on 256 GPUs [^5^]

### 3.3 Bulk and Shear Modulus Performance

**Claim:** "The results comparing MP and MACE-MP-0 bulk moduli with MAE of 15.70 GPa and R^2 of 0.84 are shown in Fig. 62(a). This compares favorably to the R^2 value of 0.757 reported for M3GNet. [...] MACE-MP-0 struggles to predict shear properties, likely due to a lack of sheared structures in MP." [^5^]
**Source:** Batatia et al., JCP (Appendix B)
**URL:** https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267
**Date:** 2025
**Excerpt:** As above
**Context:** Benchmark against ~8400 materials in MP database
**Confidence:** High

### 3.4 MACE-MPA-0: Enhanced Version

MACE-MPA-0 was trained on an expanded dataset combining MPtrj and sAlex (10.5M structures from Alexandria) [^6^].

**Claim:** "To investigate the effect of training set size on model performance, we developed a MACE model, MPA-0, using identical hyperparameters to the MP-0b3 medium model but trained on an expanded dataset combining MPtraj and sAlex. [...] we observe a strong enhancement in the accuracy of the MPA-0 model compared to MP-0b3 on applications for which coverage was not increased, namely, amorphous phases and small molecules on surfaces." [^5^]
**Source:** Batatia et al., JCP (Appendix A.33)
**URL:** https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267
**Date:** 2025
**Excerpt:** As above
**Context:** MPA-0 shows improved stacking fault profiles for BCC metals (W, Mo, Nb)
**Confidence:** High

On Matbench Discovery [^7^], MACE-MPA-0 achieves:
- CPS: 0.795
- F1: 0.852
- MAE: 0.028 eV/atom
- R^2: 0.842

### 3.5 BCC Metal Performance Issues

MACE-MP-0 struggles with BCC metals:
- **Stacking fault energies** for W and Mo underestimated by ~factor of 2 [^5^]
- **Screw dislocation** barriers significantly underestimated [^8^]
- **FCC structures** show ~0.5 eV/atom energy shift vs BCC for W [^9^]
- Fine-tuning with as few as 142 W configurations corrects these issues [^9^]

**Claim:** "Without fine-tuning, the foundation model MACE-MP-0 performs poorly on BCC metals, with defect formation energies and dislocation glide properties showing relative errors exceeding 50% compared to DFT calculations." [^8^]
**Source:** A Study on Fine-Tuning Performance of U-MLIPs
**URL:** https://arxiv.org/html/2506.07401v1
**Date:** 2025-06-09
**Excerpt:** As above
**Context:** Benchmark on Fe and W dislocations
**Confidence:** High

---

## 4. Error Structure: PES Softening as Systematic Bias

### 4.1 The PES Softening Phenomenon

A landmark 2024 study by Deng et al. identified a consistent **PES softening effect** across three major uMLIPs (M3GNet, CHGNet, MACE-MP-0) [^10^]:

**Claim:** "We find that the PES softening behavior originates from a systematic underprediction error of the PES curvature, which derives from the biased sampling of near-equilibrium atomic arrangements in uMLIP pre-training datasets." [^10^]
**Source:** Deng et al., Overcoming systematic softening in universal MLIPs
**URL:** https://arxiv.org/html/2405.07105v1; https://www.nature.com/articles/s41524-024-01500-6
**Date:** 2024-05-11
**Excerpt:** As above
**Context:** Universal finding across M3GNet, CHGNet, and MACE-MP-0
**Confidence:** High

### 4.2 Key Observations on PES Softening

1. **Universal:** >90% of 979 tested compounds show softening scale < 1 [^11^]
2. **Systematic:** Energy and force underpredictions are consistent, not random
3. **Origin:** Training data dominated by near-equilibrium configurations from relaxation trajectories
4. **Correctable:** Fine-tuning with even a single additional data point can largely fix it [^10^]
5. **Manifestations:**
   - Underpredicted phonon frequencies
   - Overpredicted heat capacities
   - Underestimated migration barriers
   - Overstabilization of materials (higher TNR than TPR on Matbench Discovery)

**Claim:** "The systematic PES softening effect shows up by the clockwise tilting of the distribution away from the diagonal. [...] for the majority (>90%) of the compounds, the softening scale is smaller than 1 for all 3 FPs we have tested. This result indicates the systematic softening behavior is universal across all chemical systems in current FP models." [^11^]
**Source:** Deng et al. / UC Berkeley thesis
**URL:** https://escholarship.org/content/qt8pb3z8q0/qt8pb3z8q0.pdf
**Date:** 2024
**Excerpt:** As above
**Context:** Analysis of 979 WBM compounds
**Confidence:** High

### 4.3 MatPES Dataset as Remedy

The MatPES dataset was developed to address PES softening by including diverse non-equilibrium structures [^12^]. Models trained on MatPES largely correct the systematic underprediction of PES curvature.

---

## 5. Do MLIPs Compress Errors to Low-Dimensional Manifolds?

### 5.1 Direct Evidence

**No direct study was found** that explicitly investigates whether MLIP prediction errors form low-dimensional hyper-ribbon manifolds analogous to classical potential error structures. However, multiple lines of evidence suggest they do:

1. **Mao et al. (2024)** showed that ALL deep neural network training trajectories explore low-dimensional manifolds in prediction space [^3^]. MLIPs are deep neural networks, so this applies directly to their training dynamics.

2. **PES softening** demonstrates that MLIP errors are **highly systematic** rather than random - errors are correlated across different observables (energies, forces, phonons, elastic constants) [^10^].

3. **Low-rank compression of MLIPs** is possible without accuracy loss:
   - Low-rank matrix/tensor factorizations can compress MTP radial parameters by up to 50% without loss [^13^]
   - This suggests parameter redundancy analogous to the low-dimensional error structure

4. **Different foundation models show correlated errors**: When benchmarked on elastic properties, different uMLIPs (CHGNet, MACE, SevenNet, MatterSim) show systematic patterns of over/underprediction [^14^]:
   - CHGNet systematically underestimates shear modulus (-48%) and overestimates Poisson ratio (+27%)
   - MACE systematically overestimates shear modulus (+13.8%)
   - MatterSim shows near-zero bias but struggles with anisotropy

### 5.2 Comparison to Classical Potentials

The evidence suggests MLIPs exhibit error structures that are:
- **More systematic** than classical potentials (due to PES softening)
- **Correctable** through fine-tuning (data-efficient)
- **Architecture-dependent** (different models show different bias patterns)
- **Training-data-dependent** (MatPES-trained models have less softening)

---

## 6. Classical Potentials vs MLIPs for Elastic Constants

### 6.1 Universal MLIP Performance on Elastic Properties

A 2026 benchmarking study compared CHGNet, MACE, MatterSim, and SevenNet for elastic property prediction against DFT [^14^]:

**Claim:** "CHGNet systematically yields the highest error levels, with an average MAPE of 71.8%, underscoring its structural deficiencies in elastic property prediction. In contrast, SevenNet consistently achieves the lowest error, with an average MAPE of only 27.53%." [^14^]
**Source:** Benchmarking Universal MLIPs for Elastic Property Prediction
**URL:** https://arxiv.org/html/2510.22999v3
**Date:** 2026-03-05
**Excerpt:** As above
**Context:** Benchmark on ~12,122 materials from Materials Project
**Confidence:** High

| Model | B MAE (GPa) | G MAE (GPa) | B R^2 | G R^2 |
|-------|-------------|-------------|-------|-------|
| SevenNet | ~15 | - | 0.94 | 0.895 |
| MACE | ~15 | - | 0.94 | 0.896 |
| MatterSim | ~10.5 | ~9.7 | 0.924 | 0.847 |
| CHGNet | - | - | 0.909 | 0.546 |

### 6.2 MACE-MP-0 Specific Issues

MACE-MP-0 shows a bulk modulus MAE of 15.70 GPa and R^2 of 0.84 [^5^]. Its shear modulus prediction is notably worse, with some predictions being unphysical (>=600 GPa or <=-50 GPa for 10 materials) [^5^]. The poor shear performance is attributed to "a lack of sheared structures in MP" [^5^].

### 6.3 Foundation Models vs Specialized MLIPs

Specialized MLIPs trained on specific systems dramatically outperform foundation models:

**Claim:** "The original foundation models exhibit large errors (20-80%) for most properties, consistent with previous benchmarks, likely due to the low emphasis on stress during training. Fine-tuned models and those trained from scratch show significant improvements. Lattice parameters are predicted within 0.1-2.0% of DFT values, and elastic constants typically within 10%." [^8^]
**Source:** Fine-Tuning Performance of U-MLIPs
**URL:** https://arxiv.org/html/2506.07401v1
**Date:** 2025-06-09
**Excerpt:** As above
**Context:** Tested on Li, Mo, Ni, Cu, Si, Ge
**Confidence:** High

### 6.4 Deep Potential vs Classical for Ni

For FCC/HCP nickel, the DeePMD potential (DP-Ni) trained on distorted structures achieves elastic constant deviations of <10% for both FCC and HCP phases, while classical EAM/MEAM potentials show deviations up to 54% for HCP elastic constants [^15^].

**Claim:** "DP-Ni accurately reproduces the elastic constants of HCP Ni from DFT, with the maximum deviation at C12 (9.6%). However, all other potentials show large deviations in the elastic constants of HCP Ni compared to DFT results, particularly for EAM at C13 (37.4%), C33 (35.5%), and C44 (15.9%)." [^15^]
**Source:** An accurate MLIP for FCC and HCP nickel
**URL:** https://arxiv.org/html/2312.17596v1
**Date:** 2023-12-29
**Excerpt:** As above
**Context:** DP-Ni vs 8 EAM and 10 MEAM potentials
**Confidence:** High

---

## 7. BCC/FCC Dichotomy: Do MLIPs Break It?

### 7.1 The Issue

The original paper's BCC/FCC dichotomy refers to systematic accuracy differences between body-centered cubic and face-centered cubic structures in classical potentials. For MLIPs:

1. **Foundation models struggle with BCC metals specifically**: MACE-MP-0 underestimates BCC stacking fault energies by ~2x for W and Mo [^5^]
2. **FCC structures are generally better described**: Foundation models perform better on FCC elemental metals
3. **The dichotomy is training-data-dependent, not inherent**: 
   - MACE-MPA-0 (trained on larger dataset) shows improved BCC stacking fault profiles [^5^]
   - Fine-tuning with just 142 W configurations corrects BCC issues [^9^]
   - Models trained from scratch with appropriate data describe both equally well

### 7.2 Key Evidence

**Claim:** "MPA-0 shows markedly improved agreement with DFT reference data compared to MP-0b3 for W and Mo, where MP-0b3 substantially underestimates the fault energies. For W and Mo, MPA-0 correctly captures the peak heights and the overall energy landscape while maintaining proper symmetry across the normalized displacement." [^5^]
**Source:** Batatia et al., JCP (Appendix A.33)
**URL:** https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267
**Date:** 2025
**Excerpt:** As above
**Context:** MPA-0 vs MP-0b3 for BCC stacking faults
**Confidence:** High

**Claim:** "For all three metals, the degenerate core is incorrectly predicted to be the most stable configuration by the MACE-MP-0b3 model. [...] Screw dislocations are known to be a sensitive probe of potentials, since the accuracy required is on the meV/atom level." [^9^]
**Source:** Batatia et al., JCP (Appendix A.14)
**URL:** https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267
**Date:** 2025
**Excerpt:** As above
**Context:** Dislocation core structure analysis for W, Mo, Nb
**Confidence:** High

### 7.3 Conclusion on BCC/FCC

MLIPs do **NOT** have an inherent BCC/FCC dichotomy like some classical potentials. The observed differences are:
- A **data coverage issue** (BCC defects underrepresented in training)
- **Correctable** through fine-tuning or improved training datasets
- The MACE-MPA-0 model, with expanded training data, significantly reduces the gap

---

## 8. Computational Cost Trade-offs

### 8.1 CPU Performance

From the comprehensive benchmark [^1^]:
- **Fastest:** Nonlinear ACE, linear ACE, MTP, HDNNP
- **Slowest:** GAP, Allegro, MACE, NequIP
- **Best accuracy/speed tradeoff:** Nonlinear ACE (Pareto front)

### 8.2 GPU Acceleration

GPU acceleration changes the landscape dramatically [^1^]:
- ACE, MACE, Allegro: ~100x speedup on NVIDIA A100 vs CPU
- NequIP: Similar speedup but lacks KOKKOS/MPI implementation
- GPU-accelerated message-passing MLIPs can compete with MTPs and HDNNPs on CPU

### 8.3 Speed Comparison: MLIPs vs Classical

**Claim:** "Furthermore, GPUs can massively accelerate the MLIPs, bringing them on par with and even ahead of non-accelerated classical IPs with regards to accessible timescales." [^1^]
**Source:** Leimeroth et al., MLIP comparison
**URL:** https://iopscience.iop.org/article/10.1088/1361-651X/adf56d
**Date:** 2025-08-14
**Excerpt:** As above
**Context:** Final statement of abstract
**Confidence:** High

### 8.4 MACE-MP-0 Specific Performance

- Single NVIDIA A100 GPU: Several ns/day for 1000 atoms [^5^]
- Parallel (256 GPUs, 10^6 atoms): ~1 ns/day [^5^]
- Can exceed 4 ns/day with 500 atoms/GPU [^5^]
- Training: ~2600 GPU hours for medium model [^5^]

### 8.5 Memory Requirements

Allegro, NequIP, and MACE have very high memory requirements during MD simulation [^1^]. This limits them to comparatively small-scale simulations on CPU, or alternatively requires massive resources. MTP, ACE, and HDNNP need much less memory [^1^].

### 8.6 Cost Summary Table

| Potential Type | CPU Speed | GPU Speed | Memory | Accuracy |
|----------------|-----------|-----------|--------|----------|
| Classical (EAM) | Very fast | N/A | Low | Low |
| MTP | Fast | Moderate | Low | Moderate |
| ACE (nonlinear) | Fast | Very fast | Moderate | High |
| HDNNP | Fast | N/A | Low | Moderate |
| MACE | Slow | Very fast | High | Very high |
| Allegro | Slow | Very fast | High | Very high |
| NequIP | Slow | Moderate | High | Very high |
| GAP | Slow | N/A | High | Moderate |

---

## 9. Additional Findings

### 9.1 Fine-Tuning Effectiveness

Fine-tuning foundation models is remarkably data-efficient:
- **4-10x improvement** in accuracy compared to training from scratch [^5^]
- Fine-tuning with ~100 configurations often matches or exceeds from-scratch models trained on 1000s of configurations [^5^]
- Multi-head replay protocol prevents catastrophic forgetting [^5^]

### 9.2 Matbench Discovery Rankings (2026)

Current top models on Matbench Discovery [^7^]:
1. EquiformerV3+DeNS-OAM: CPS 0.902, MAE 0.018 eV/atom
2. PET-OAM-XL: CPS 0.898, MAE 0.019 eV/atom
3. TACE-OAM-L: CPS 0.889, MAE 0.020 eV/atom
4. eSEN-30M-OAM: CPS 0.888, MAE 0.018 eV/atom
5. MACE-MPA-0: CPS 0.795, MAE 0.028 eV/atom
6. MatterSim: CPS 0.767, MAE 0.024 eV/atom
7. CHGNet: CPS 0.400, MAE 0.063 eV/atom
8. M3GNet: CPS 0.428, MAE 0.075 eV/atom

### 9.3 Key Limitations of Current MLIPs

1. **PES softening** (universal systematic bias) [^10^]
2. **Stress prediction** often less accurate than energy/force [^8^]
3. **Shear modulus** particularly challenging [^5^]
4. **Extrapolation** to out-of-distribution configurations remains risky [^1^]
5. **BCC defects** underrepresented in training data [^8^]
6. **Memory requirements** for GNN-based models limit CPU-only workflows [^1^]

---

## 10. Summary and Implications for the Original Paper

### 10.1 Key Takeaways

1. **MLIPs DO exhibit low-dimensional structure in their training dynamics**, as demonstrated by Mao et al. (2024) [^3^]. The training manifolds of deep neural networks (including all GNN-based MLIPs like MACE, NequIP, Allegro) are remarkably low-dimensional (~50 dimensions sufficient for problems with 10^6-10^8 parameters).

2. **MLIP prediction errors are highly systematic**, not random. The PES softening phenomenon [^10^] demonstrates that errors compress to correlated patterns (underpredicted curvature, overstabilization, underestimated barriers).

3. **These systematic errors are correctable** with small amounts of fine-tuning data, suggesting the error manifold has a simple structure analogous to the classical potential hyper-ribbon.

4. **No direct evidence** was found that anyone has explicitly studied whether MLIP errors form hyper-ribbon structures in property prediction space. This is an open research question.

5. **The BCC/FCC dichotomy in classical potentials does NOT persist in MLIPs** in the same form. Differences between BCC and FCC accuracy in foundation models are due to training data coverage, not inherent functional form limitations.

6. **MLIPs dramatically outperform classical potentials** for elastic constants when trained on appropriate data (DP-Ni: <10% error for HCP elastic constants vs EAM: up to 54% error) [^15^].

7. **Foundation models still have significant limitations** for mechanical properties, especially shear moduli and elastic constants, due to training data biases toward equilibrium configurations.

### 10.2 Open Questions

- Has anyone explicitly characterized the dimensionality of MLIP error manifolds across different architectures?
- Do different MLIP architectures (MACE, NequIP, ACE) explore the same error manifold or different ones?
- Can the hyper-ribbon formalism be extended to characterize the error structure of foundation models?
- How does the low-dimensional training manifold structure translate to error correlations in predicted materials properties?

---

## Citations

[^1^]: Leimeroth et al., "Machine-learning interatomic potentials from a users perspective: A comparison of accuracy, speed and data efficiency," arXiv:2505.02503, 2025. https://arxiv.org/abs/2505.02503

[^2^]: Casillas-Trujillo et al., "Performance Assessment of Universal Machine Learning Interatomic Potentials: Challenges and Directions for Materials' Surfaces," arXiv:2403.04217, 2024. https://arxiv.org/html/2403.04217v1

[^3^]: Mao et al., "The training process of many deep networks explores the same low-dimensional manifold," PNAS 121(12), e2310002121, 2024. https://arxiv.org/abs/2305.01604

[^4^]: Griniasty et al., "An Analytical Characterization of Sloppiness in Neural Networks: Insights from Linear Models," arXiv:2505.08915, 2025. https://arxiv.org/html/2505.08915v2

[^5^]: Batatia et al., "A foundation model for atomistic materials chemistry," J. Chem. Phys. 163, 184110, 2025. https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267

[^6^]: MACE GitHub releases, "New Foundation Models: MACE-MPA-0," 2024. https://github.com/ACEsuit/mace/releases

[^7^]: Matbench Discovery Leaderboard, accessed 2026. https://matbench-discovery.materialsproject.org/models

[^8^]: "A Study on the Fine-Tuning Performance of Universal Machine-Learned Interatomic Potentials," arXiv:2506.07401, 2025. https://arxiv.org/html/2506.07401v1

[^9^]: Batatia et al., JCP 163, 184110 (2025), Appendix A.14 (Tungsten) and A.33 (MPA-0). https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267

[^10^]: Deng et al., "Overcoming systematic softening in universal machine learning interatomic potentials by fine-tuning," npj Computational Materials, 2024. https://arxiv.org/html/2405.07105v1; https://www.nature.com/articles/s41524-024-01500-6

[^11^]: Deng et al. thesis, UC Berkeley, 2025. https://escholarship.org/content/qt8pb3z8q0/qt8pb3z8q0.pdf

[^12^]: MatPES dataset paper, "A Foundational Potential Energy Surface Dataset for Materials," arXiv:2503.04070, 2025. https://materialsvirtuallab.org/pubs/10.48550_arXiv.2503.04070.pdf

[^13^]: "Low-rank matrix and tensor approximations for compression of machine-learning interatomic potentials," arXiv:2509.04440, 2025. https://arxiv.org/html/2509.04440v2

[^14^]: "Benchmarking Universal Machine Learning Interatomic Potentials for Elastic Property Prediction," arXiv:2510.22999, 2026. https://arxiv.org/html/2510.22999v3

[^15^]: "An accurate machine learning interatomic potential for FCC and HCP nickel," arXiv:2312.17596, 2023; Nature Portfolio (2024). https://arxiv.org/html/2312.17596v1

---

*Report compiled from 18+ independent web searches across academic databases, arXiv, journal websites, and benchmark repositories. Primary sources prioritized over summaries.*
