# Phonon Frequency Spectrum Benchmarking for Interatomic Potentials: A Technical Review for the GLIM Project

## 1. Foundational Concepts and Scope

### 1.1 Phonon Frequency Spectrum as a Critical Validation Target

#### 1.1.1 Physical significance of harmonic phonon properties in materials characterization

The phonon frequency spectrum represents one of the most fundamental and stringent tests of interatomic potential accuracy, as it directly probes the curvature of the potential energy surface (PES) at equilibrium configurations. Unlike total energies and atomic forces—which depend on zeroth and first derivatives of the PES—phonon frequencies emerge from second derivatives of energy with respect to atomic displacements, making them exponentially more sensitive to subtle errors in potential parameterization. This heightened sensitivity explains why phonon benchmarks have become indispensable for validating both classical empirical potentials and modern machine learning interatomic potentials (MLIPs).

Performance in data-scarce regimes represents a critical second benchmark role: assessing how reliably models predict on systems outside training distributions. This role is particularly critical for universal MLIPs, which claim zero-shot generalization across chemical space yet may exhibit composition-dependent failure modes not evident from energy-focused validation. The phenomenon of "force-constant collapse"—where neural network potentials predict reasonable forces but severely inaccurate curvatures—has been documented across multiple architectures, underscoring the necessity of explicit phonon validation.

The reliability assessment enabled by phonon benchmarks extends to dynamical stability prediction, which is fundamental for materials discovery. A potential's ability to correctly identify imaginary frequency modes—indicating mechanical instability—directly impacts its utility for structure screening. Large-scale studies reveal significant variation: the PhononBench evaluation of 108,843 AI-generated structures found that only 25.83% were dynamically stable, with top performers achieving higher prediction accuracy.

### 1.1.2 Hierarchical representation of phonon information

Phonon information exists across three distinct hierarchical levels, each capturing distinct physics and enabling different applications:

**Band structure level** enables direct comparison with inelastic neutron scattering (INS) and inelastic X-ray scattering (IXS) experiments. This level captures directional anisotropy, mode crossings, and critical points in the Brillouin zone, but requires substantial computational investment for dense q-point sampling.

At the intermediate level, the phonon density of states (PDOS) g(ω) integrates over wavevectors to yield a frequency distribution that preserves statistical mode weighting while losing q-point specificity. The PDOS enables efficient calculation of thermodynamic properties through frequency integrals and facilitates comparison with Raman spectroscopy and specific heat measurements. Critically, PDOS agreement does not guarantee accurate individual frequencies—systematic shifts or mode misassignments may be masked in the integrated representation.

At the coarsest but most application-relevant level, derived thermodynamic quantities—including vibrational entropy S_vib, Helmholtz free energy F, and heat capacity C_V—emerge from phonon frequency integrals weighted by Bose-Einstein occupation factors. These properties directly impact phase stability, thermal transport predictions, and equation-of-state models critical for high-pressure materials discovery and geological applications.

### 1.2 Scope and Coverage of Benchmarking Targets

#### 1.2.1 Motivation for comprehensive assessment across potential families and chemical space

The GLIM project targets 23 diverse potentials spanning classical empirical methods through state-of-the-art machine learning approaches. This diversity reflects the evolving landscape of materials modeling and reveals systematic performance patterns across architecture paradigms, enabling evidence-based guidance for potential selection across use cases.

Different bonding characters present distinct methodological challenges: van der Waals materials demand long-range dispersion-corrected functionals; metals exhibit Fermi surface-driven screening effects; covalent semiconductors demand precise bond-angle description; ionics require accurate charge transfer and polarization effects.

#### 1.2.2 Chemical space sampling: main-group compounds, transition metals, and outlier systems

Structural diversity in crystalline inorganic materials spans elemental metals (simple EAM-compatible systems), covalent semiconductors (directional bonding challenges), van der Waals materials (extreme frequency range, interlayer softness), ionic oxides (polar coupling, LO-TO splitting), and complex ceramics with large unit cell variations, with phonon spectra reflecting both mass disorder effects and chemical ordering.

| Material Class | Bonding Character | Phonon Challenges | Representative Systems |
|---|---|---|---|
| Elemental metals | Metallic, delocalized | Kohn anomalies, Fermi surface effects | Al, Cu, Fe, Mg |
| Covalent semiconductors | Directional, strong | High-frequency optical modes, flat TA branches | Si, Ge, diamond |
| Van der Waals materials | Layered, anisotropic | Extreme frequency range, interlayer softness | Graphite, MoS₂, h-BN |
| Ionic oxides | Polar, charge transfer | LO-TO splitting, dielectric response | MgO, Al₂O₃, SrTiO₃ |
| Complex ceramics | Mixed bonding, large cells | Mode localization, computational cost | Zeolites, garnets, MAX phases |

#### 1.2.3 Challenges in phonon calculations for materials with varying bonding character

Materials with directional bonds demand precise description of bond-angle dependencies; the flat transverse acoustic (TA) branch characteristic of 2D materials proves challenging across many potential families. MLIPs trained on PBE data without explicit dispersion corrections exhibit substantially larger errors. Complex systems with rare earths or heavy elements face f-electron challenges. The data-scarce regime—materials lacking converged DFT phonons in public databases—tests potential generalization without serving as reference.

### 1.3 Benchmark Scope and Objectives

#### 1.3.1 The 23-potential × 12,000-material computational target

The GLIM project's 23 potentials × 12,000 materials = 276,000 phonon spectra computational target demands strategic optimization. Full explicit DFT validation at all scales infeasible; hybrid approach: JARVIS-DFT phonons as primary reference, selective Materials Project comparisons for PBE-trained models, experimental data for key validation systems (Debye temperatures, thermal expansion, specific heat).

#### 1.3.2 Objectives: systematic accuracy assessment and computational efficiency evaluation

The dual objectives of accuracy and efficiency assessment reflect practical constraints in materials modeling. Accuracy metrics must span hierarchical levels: primary metrics (frequency MAE, ω_max error, stability prediction accuracy) for global ranking; secondary metrics (PDOS correlation, thermodynamic property errors) for detailed pattern analysis; and diagnostic metrics (composition-dependent errors, failure mode categorization) for improvement guidance.

## 2. Phonon Calculation Methodology

### 2.1 Structure Preparation and Supercell Construction

#### 2.1.1 Supercell generation with minimum dimension ≥12 Å and symmetry reduction

Phonopy constructs force constant matrices by systematic atomic displacement and force calculation. Supercell dimensions must exceed the cutoff radius of interatomic interactions, with ≥12 Å minimum dimension standard for converged long-range forces. Symmetry analysis via spglib reduces independent displacements by identifying equivalent atoms, achieving 2–10× reduction depending on crystal symmetry. For high-throughput execution across 12,000 materials, automated supercell generation with fallback handling for low-symmetry or large-cell systems is essential.

#### 2.1.2 Atomic displacement magnitudes: standard 0.01–0.03 Å range and convergence considerations

Displacement magnitude selection balances numerical stability against harmonic approximation validity. Standard range: 0.01–0.03 Å, with 0.01 Å typical for DFT (low force noise) and 0.02–0.03 Å for empirical potentials (larger signal-to-noise). Critical architecture-dependent behavior affects accuracy across displacement ranges.

### 2.2 Structural Relaxation Protocol

#### 2.2.1 Fixed lattice constant approach: maintaining reference geometry for accuracy assessment

The comprehensive uMLIP benchmark explicitly adopted this protocol: "we did not relax the volume or shape of the unit cells...because our goal was to benchmark and compare the phonon properties calculated on the same crystal structures". This ensures that frequency differences reflect force constant accuracy rather than Grüneisen-parameter-shifted volumes. The FIRE algorithm with 0.005 eV/Å force convergence provides efficient, robust relaxation.

### 2.3 Force Constant and Phonon Calculation

#### 2.3.1 Force constant matrix computation via supercell derivatives

Force constants emerge from second-order energy derivatives. Numerical differentiation: F(i,j,α,β) = [E(+δ) - 2E(0) + E(-δ)] / δ², with typical δ = 0.01 Å. Symmetry constraints reduce independent calculations through spglib equivalence identification. Quality validation: acoustic sum rules preservation checks; rotational invariance testing; LO-TO splitting verification for polar materials.

#### 2.3.2 Q-point mesh sampling and Fourier interpolation

Fourier interpolation extends discrete force constants to arbitrary q-points. Standard density: 1000 points/Å⁻³ ensures converged PDOS and thermodynamic properties. Convergence verification: explicit supercell calculations at commensurate q-points should match interpolated values within tolerance. Adaptive refinement benefits materials with sharp spectral features or flat bands.

#### 2.3.3 Phonon density of states calculation via uniform q-point meshes

PDOS integration via uniform meshes (20×20×20 to 40×40×40 typical) with tetrahedron method or Gaussian smearing (σ ~ 0.1–0.5 THz). Tetrahedron methods preserve van Hove singularities; Gaussian smearing provides robustness for coarse meshes.

## 3. Reference Data: JARVIS-DFT Phonon Database

### 3.1 Database Characteristics and Coverage

#### 3.1.1 vdW-DF-optB88 functional basis for phonon calculations

JARVIS-DFT employs vdW-DF-optB88, distinguishing it from PBE-dominant Materials Project. The optB88 exchange optimization improves van der Waals binding while maintaining reasonable performance for covalent/ionic materials. Functional consequences: 1–2% lattice parameter differences versus PBE for dense solids, substantially larger for layered materials; corresponding phonon frequency shifts of 2–6% (dense) to 20%+ (van der Waals).

#### 3.1.2 Material diversity and chemical space representation

JARVIS-DFT encompasses ~90,000 materials with 17,402 having elastic tensors and phonons. Coverage spans bulk crystals (metals, semiconductors, insulators), van der Waals materials, and complex multicomponent systems.

## 4. Metrics and Evaluation Framework

### 4.1 Hierarchical Accuracy Metrics

#### 4.1.1 Primary frequency metrics: mean absolute error (MAE) and root mean square error (RMSE)

Mean absolute error (MAE): average |ω_predicted - ω_reference| across all q-points and branches, most interpretable for physical insight. RMSE provides per-material weighting to high-error outliers; sensitivity to outliers aids failure mode detection. Units: meV (milli-electron volts), with 1 THz ≈ 4.136 meV conversion.

Materiality thresholds:
- <2 meV: excellent
- 2–5 meV: good
- 5–15 meV: acceptable for exploratory screening
- >15 meV: problematic for property transfer

### 4.2 Stability Metrics

#### 4.2.1 Dynamical stability: imaginary frequency absence and phonon stability score

Binary outcome: imaginary frequency present (unstable, score = 0) or absent (stable, score = 1). Stability score = (N_modes_real / N_modes_total): soft modes with ω < 1 THz may indicate marginal stability or finite-temperature effects absent from harmonic model.

#### 4.2.3 Stability prediction accuracy metrics

Binary classification metrics: precision, recall, F1, ROC-AUC. Class imbalance (baseline ~25% stable) requires careful interpretation: random guessing achieves 25% accuracy; perfect prediction achieves 100%. Skill scores (improvement over baseline) enable fair comparison.

## 5. Potential Family Performance Comparison

### 5.1 Universal Machine Learning Interatomic Potentials (uMLIPs)

#### 5.1.1 MatterSim: DFT-level accuracy demonstrated across >10,000 materials

MatterSim represents leading uMLIP performance with explicit phonon-focused validation enabling rigorous benchmarking at unprecedented scale.

#### 5.1.4 SevenNet-0, ORB, eqV2-M, and emerging architectures

| Model | Key Features | Phonon Performance | Efficiency Notes |
|---|---|---|---|
| SevenNet-0 / SevenNet-MP-ompa | Equivariant, parallelized message passing | Top-tier, near-MACE accuracy | Favorable scaling |
| ORB v3 | Smooth overlap atomic positions, direct force output | Highest ranking in uMLIP benchmark | ~10× more efficient than OMat24 |
| ORB v1 | Earlier version | Good, below v3 | Similar efficiency |
| eqV2-M / EquiformerV2 | Equivariant transformers, higher-order representations | Strong, improved with fine-tuning (FT: MAE 0.174 log(W/m·K)) | Architecture-dependent overhead |
| OMat24 / GRACE-2L-OAM | Large-scale training, diverse data | Top-tier accuracy | Drastically steeper scaling than MACE/SevenNet |

### 5.2 Fine-Tuning and Domain Adaptation

#### 5.2.1 Phonon force constant tuning (PFT) methodology

PFT methodology: direct Hessian supervision with stochastic column sampling for scalability. Co-training with original data prevents catastrophic forgetting. Results: 55% average phonon property improvement, state-of-the-art thermodynamic and transport predictions.

#### 5.2.3 Accuracy gains: sub-meV errors achievable with targeted optimization

Fine-tuned achievements: ω_max MAE 10 K (~0.9 meV), S_vib MAE 11 J/mol·K, F MAE 4 kJ/mol, C_V MAE 2 J/mol·K. Approaching practical limits set by reference data quality and numerical precision.

### 5.3 Classical Empirical Potentials

#### 5.3.1 Embedded atom method (EAM) and modified EAM (MEAM) performance

EAM/MEAM potentials achieve computational efficiency through simple functional form but face challenges in generalization across chemical space.

### 5.4 Cross-Family Comparative Analysis

#### 5.4.1 Systematic accuracy hierarchies: MLIPs > classical potentials for general systems

Clear hierarchy emerges: universal MLIPs achieve 2–10 meV typical accuracy, fine-tuned variants <2 meV, classical potentials 20–100+ meV for general systems. Gap largest for systems far from classical fitting domains. Computational cost hierarchy inverts: classical potentials fastest, efficient MLIPs (ORB, MACE) intermediate, large architectures (OMat) slowest.

#### 5.4.2 Composition-dependent performance variations

Systematic patterns: main-group compounds < transition metals < heavy elements/rare earths in typical accuracy. Van der Waals materials: large errors for PBE-trained models without dispersion corrections.

## 6. Computational Cost Analysis

### 6.1 DFT-Based Phonon Calculation Costs

#### 6.1.3 Speedup factors: 10–100× for harmonic phonon properties

Fully pre-trained uMLIPs enable 10³–10⁶× single-point speedup versus DFT, 10–100× full workflow speedup accounting for phonon calculation overhead. Absolute time: seconds to minutes per material for complete harmonic phonon analysis with efficient implementations.

### 6.2 Interatomic Potential Evaluation Costs

#### 6.2.1 Classical potential computational efficiency: near-linear scaling with system size

Classical potentials maintain near-linear O(N) scaling with minimal overhead. Millions of atoms feasible for molecular dynamics; phonon calculations limited by supercell size for force constant convergence rather than per-evaluation cost.

### 6.3 Hardware Requirements and Parallelization

#### 6.3.2 Automated convergence testing and adaptive q-point sampling

Adaptive protocols optimize accuracy-cost trade-off: coarse initial sampling, refinement where variance high, early termination for converged properties. Convergence criteria: frequency change <0.1 THz with sampling doubling, PDOS integral change <1%.

## 8. Machine Learning Potential Phonon Benchmarks: State of the Art

### 8.1 Large-Scale Benchmarking Initiatives

#### 8.1.1 MatterSim benchmark: >10,000 materials, seven uMLIPs

Pioneering scale: >10,000 materials with DFT-level accuracy demonstration. Key finding: phonon errors smaller than PBE-PBEsol functional differences establishes achievable target.

#### 8.1.2 PhononBench: 108,843 AI-generated structures for stability assessment

Unprecedented scale: 108,843 structures with MatterSim-v1 phonon evaluation. Key result: only 25.83% dynamically stable, with top generative model (MatterGen) at 41.0%.

### 8.3 Fine-Tuning and Domain Adaptation

#### 8.3.1 Phonon-targeted training strategies

PFT methodology: direct Hessian supervision with stochastic column sampling for scalability. Results: 55% average phonon property improvement, state-of-the-art thermodynamic and transport predictions. Cost-effectiveness: modest training investment (60–140 GPU-hours) for substantial accuracy gains.

## 9. Evaluation Protocol and Statistical Considerations

### 9.3 Computational Resource Planning

#### 9.3.1 Cost estimation for 12,000 × 23 phonon calculations

Base estimate: ~10⁶ GPU-hours for complete benchmark with efficient implementation (assuming ~1 minute per material per potential on modern GPU, parallel efficiency ~80%). Contingency: +50% for convergence failures, restarts, extended analysis. Total: ~1.5×10⁶ GPU-hours or equivalent CPU-GPU mixed resources.

#### 9.3.2 Prioritization strategies for material and potential subsets

Phase 1: all 23 potentials on 1000-material representative subset for statistical power and initial ranking. Phase 2: top 10 potentials on full 12,000-material set for definitive comparison.

## 10. Community Engagement and Benchmark Evolution

### 10.1 Open Data and Code Release

Data release: structures, phonon frequencies, PDOS, thermodynamic properties for all 276,000 calculations (compressed, with clear documentation). Code release: complete workflow from structure input to metric calculation, containerized for portability.

### 10.2 Living Benchmark Framework

Collaborative governance: steering committee with academic, national lab, industry representation. Update cycles: annual major releases with new potentials, expanded materials, refined metrics. Specialized benchmarks: spin-off initiatives for specific applications (e.g., battery materials, nuclear fuels, quantum materials) building on GLIM infrastructure. Ultimate goal: living benchmark that continuously improves with community contribution, enabling sustained progress in interatomic potential development.
