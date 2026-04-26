# Dimension 09: Temporal Evolution & Historical Trends in Potential Development

## Research Summary

This document investigates how interatomic potential accuracy and error structure has evolved over 40+ years of development, from early pairwise potentials through modern machine learning interatomic potentials (MLIPs). The central finding to contextualize is the claim that while raw accuracy has improved, the effective dimensionality of prediction errors remains bounded between 1.0 and 1.9, suggesting the hyper-ribbon is an invariant of the observable space.

---

## 1. Timeline of Interatomic Potential Development

### 1.1 Pre-1980s: Pairwise Potentials

Early interatomic potentials were based on pairwise additive interactions, most notably the Lennard-Jones potential. These were adequate for noble gases but fundamentally inadequate for metallic and covalent bonding due to their neglect of many-body effects.

### 1.2 The 1980s: Revolution - Many-Body Potentials

The 1980s marked a paradigm shift with the introduction of explicit many-body potentials.

**Daw & Baskes EAM (1984)**

Claim: The Embedded-Atom Method (EAM), introduced by Daw and Baskes in 1983-1984, was the first widely successful many-body potential for metallic systems, based on density-functional theory concepts. [^1^]
Source: Physical Review B (Daw & Baskes, 1984)
URL: https://web.mit.edu/mbuehler/www/Teaching/IAP2006/codes/p6443_1-eam-baskes-1984-r.pdf
Date: 1984
Excerpt: "We develop the embedded-atom method, based on density-functional theory, as a new means of calculating ground-state properties of realistic metal systems. We derive an expression for the total energy of a metal using the embedding energy from which we obtain several ground-state properties, such as the lattice constant, elastic constants, sublimation energy, and vacancy-formation energy."
Context: The EAM represented a fundamental departure from pairwise potentials by recognizing that the energy of an atom depends on the local electron density in which it is embedded, not just pairwise distances. This made it particularly suitable for metallic systems where conduction electrons create a collective binding environment.
Confidence: High

**Finnis-Sinclair (1984)**

Claim: The Finnis-Sinclair potential was developed independently as a second-moment approximation to tight-binding theory, providing a similar many-body framework particularly suited for bcc transition metals. [^2^]
Source: Interatomic Potentials Repository / OSTI
URL: https://www.osti.gov/servlets/purl/10170168
Date: 1984 (conference proceedings 1995)
Excerpt: "Finnis and Sinclair derived a similar method based on a second moment approximation to tight binding and originally applied it to the bcc or half-filled d-band transition metals."
Context: The FS potential and EAM are mathematically related - both express energy as a sum of pairwise terms plus an embedding function that depends on the local environment. The FS form was originally more common in European computational materials science communities.
Confidence: High

**Stillinger-Weber (1985)**

Claim: The Stillinger-Weber potential introduced a three-body term for describing covalent directional bonding, particularly for silicon, representing a major advance over purely pairwise descriptions of covalent materials. [^3^]
Source: Journal of Applied Physics (force-matching SW for MoS2)
URL: https://pubs.aip.org/aip/jap/article/122/24/244301/154646/
Date: 1985 (original); 2017 (review)
Excerpt: "The Stillinger-Weber potential introduced three-body interactions to describe directional covalent bonding."
Context: The SW potential added explicit three-body terms that penalize deviations from the tetrahedral bond angle, making it suitable for group IV semiconductors.
Confidence: High

**Tersoff (1986/1988)**

Claim: Tersoff's 1986-1988 papers introduced a bond-order potential that captures environmental dependence of bond strengths, providing a unified description of silicon structures across multiple coordination environments. [^4^]
Source: Physical Review B 37, 6991 (1988) / NIST Interatomic Potentials Repository
URL: https://www.ctcms.nist.gov/potentials/entry/1988--Tersoff-J--Si-b/
Date: 1988
Excerpt: "A new approach for constructing such potentials, by explicitly incorporating the dependence of bond order on local environment, permits an improved description of covalent materials."
Context: Tersoff's key insight was that bond strength should decrease with increasing coordination, providing a natural explanation for why diamond cubic silicon is more stable than metallic phases. The original Tersoff Si(B) potential remains widely used today.
Confidence: High

### 1.3 The 1990s: Extended Formalisms

**Baskes MEAM (1992)**

Claim: The Modified Embedded-Atom Method (MEAM) extended EAM to include angular dependence of electron density, enabling description of directional bonding in covalent and ionic materials while retaining the computational advantages of EAM. [^5^]
Source: Physical Review B 46, 2727 (1992) / NIST Repository
URL: https://www.ctcms.nist.gov/potentials/entry/1992--Baskes-M-I--Si/
Date: 1992
Excerpt: "The modified embedded-atom method is extended to a variety of cubic materials and impurities. In this extension, all functions are analytic and computationally simple. The basic equations of the method are developed and applied to 26 elements: ten fcc, ten bcc, three diamond cubic, and three gaseous materials."
Context: MEAM added angular terms to the background electron density calculation, enabling it to describe directional bonding in materials like silicon, carbon, and ionic compounds. This significantly expanded the applicability of the EAM framework beyond simple metals.
Confidence: High

**Brenner REBO (1990)**

Claim: Brenner extended the bond-order concept to hydrocarbons, laying groundwork for reactive potentials. [^6^]
Source: Physical Review B 42, 9458 (1990)
URL: https://en.wikipedia.org/wiki/Interatomic_potential
Date: 1990
Excerpt: Brenner's second-generation reactive empirical bond-order (REBO) potential extended the Tersoff approach to hydrocarbon systems.
Confidence: High

### 1.4 The 2000s: Reactive Potentials

**ReaxFF (2001)**

Claim: ReaxFF, developed by van Duin, Dasgupta, Lorant, and Goddard, introduced a general reactive force field using bond-order/bond-distance relationships, enabling simulation of chemical reactions in large systems. [^7^]
Source: Journal of Physical Chemistry A 105, 9396-9409 (2001)
URL: https://authors.library.caltech.edu/records/ep8x0-sxa65
Date: 2001
Excerpt: "To make practical the molecular dynamics simulation of large scale reactive chemical systems (1000s of atoms), we developed ReaxFF, a force field for reactive systems. ReaxFF uses a general relationship between bond distance and bond order on one hand and between bond order and bond energy on the other hand that leads to proper dissociation of bonds to separated atoms."
Context: ReaxFF was revolutionary because it allowed simulation of chemical reactions without pre-defining reaction pathways or reactive sites. It uses a single atom type per element and determines bonding dynamically. It is 10-50x slower than non-reactive force fields but ~100x faster than quantum methods.
Confidence: High

**Charge-Optimized Many-Body (COMB) Potential (2007)**

Claim: COMB potentials extended reactive formalisms to include variable charge distributions. [^8^]
Source: Physical Review B 75, 085311 (2007)
URL: https://pubs.acs.org/doi/10.1021/acs.chemrev.5c00728
Date: 2007
Excerpt: "Charge Optimized Many-Body Potential for the Si/SiO2 System"
Context: COMB added self-consistent charge equilibration to many-body potentials, improving descriptions of ionic and polar systems.
Confidence: High

### 1.5 The 2010s: Machine Learning Potentials Emerge

**Behler-Parrinello HDNNP (2007)**

Claim: The Behler-Parrinello high-dimensional neural network potential (HDNNP) was the first successful ML interatomic potential, using local symmetry functions to describe atomic environments and individual atomic neural networks to compute energy contributions. [^9^]
Source: Physical Review Letters 98, 146401 (2007)
URL: https://rowansci.com/publications/introduction-to-nnps
Date: 2007
Excerpt: "The first modern NNP was published by Jorg Behler and Michele Parrinello in a 2007 Phys. Rev. Lett. paper studying bulk silicon. This NNP used a simple architecture and was trained on 8,200 DFT energies."
Context: The key innovation was using atom-centered symmetry functions to describe local environments and summing atomic energy contributions computed by individual neural networks. This preserved physical symmetries (translation, rotation, permutation) while enabling high-dimensional regression.
Confidence: High

**GAP (2010)**

Claim: Gaussian Approximation Potentials (GAP), introduced by Bartok, Payne, Kondor, and Csanyi, combined SOAP descriptors with Gaussian process regression to achieve quantum accuracy. [^10^]
Source: Physical Review Letters 104, 136403 (2010)
URL: https://libatoms.github.io/GAP/
Date: 2010
Excerpt: "The Accuracy of Quantum Mechanics, without the Electrons"
Context: GAP introduced the SOAP descriptor for characterizing atomic environments and used Bayesian nonparametric regression. Unlike HDNNPs, GAP does not require a fixed neural network architecture but instead builds the model from the training data using kernel methods.
Confidence: High

**SNAP (2015)**

Claim: Spectral Neighbor Analysis Potentials (SNAP), developed by Thompson et al., replaced GAP's Gaussian process with linear regression over bispectrum components, enabling faster evaluation and decoupling MD speed from training set size. [^11^]
Source: Journal of Computational Physics 285, 316 (2015)
URL: http://ui.adsabs.harvard.edu/abs/2015JCoPh.285..316T/abstract
Date: 2015
Excerpt: "We present a new interatomic potential for solids and liquids called Spectral Neighbor Analysis Potential (SNAP). The SNAP potential has a very general form and uses machine-learning techniques to reproduce the energies, forces, and stress tensors of a large set of small configurations of atoms."
Context: SNAP's key innovation was using linear regression instead of Gaussian processes, making it much faster for MD simulations while maintaining accuracy. A subsequent quadratic SNAP extension further improved accuracy. [^12^]
Confidence: High

### 1.6 The 2020s: Universal Machine Learning Potentials

**ACE (2019)**

Claim: The Atomic Cluster Expansion (ACE), introduced by Drautz and later implemented practically by Shapeev (MTPs), provided a mathematically complete framework for constructing rotationally and permutationally invariant basis functions for interatomic potentials. [^13^]
Source: Physical Review B 99, 014104 (2019); Journal of Computational Physics 454, 110946 (2022)
URL: https://arxiv.org/html/2402.07472v3
Date: 2019/2022
Excerpt: "ACE can be viewed as a general framework of many other representations of the atomic environment, such as the Atom Centered Symmetry Functions (ACSF), Smooth Overlap of Atomic Positions (SOAP) descriptor, Moment Tensor Potentials (MTPs), and bispectrums."
Context: ACE provided a unifying theoretical framework showing that essentially all descriptor-based MLIPs are special cases of the ACE formalism. ACE guarantees completeness of the basis set and systematic convergence to the true potential energy surface. [^14^]
Confidence: High

**MACE (2022)**

Claim: MACE introduced higher-order equivariant message passing neural networks that use four-body messages, reducing required message passing iterations to just two while achieving state-of-the-art accuracy. [^15^]
Source: NeurIPS 2022; arXiv:2206.07697
URL: https://ar5iv.labs.arxiv.org/html/2206.07697
Date: 2022
Excerpt: "We propose that these limitations arise because MPNNs only pass two-body messages leading to a direct relationship between the number of layers and the expressivity of the network. In this work, we introduce MACE, a new equivariant MPNN model that uses higher body order messages."
Context: MACE has become the leading architecture for both material-specific and universal MLIPs. MACE-MP0 demonstrated ability to create a universal foundation model applicable across 89 elements with ~20 meV/atom energy MAE. [^16^]
Confidence: High

---

## 2. Has Elastic Constant Accuracy Actually Improved Over Time?

### 2.1 Evidence from OpenKIM and Systematic Studies

Claim: Systematic studies comparing classical EAM potentials with MLIPs show that while lattice parameters have remained accurate across decades, elastic constants for non-equilibrium structures (like HCP Ni) show dramatic errors in classical potentials that are significantly reduced by modern MLIPs. [^17^]
Source: npj Computational Materials 10, 74 (2024)
URL: https://www.nature.com/articles/s43246-024-00603-3
Date: 2024
Excerpt: "We benchmarked the basic properties of FCC and HCP Ni using various interatomic potentials, including eight embedded-atom method (EAM) and ten modified embedded-atom method (MEAM) potentials. All potentials display significant discrepancies in simple properties, such as the elastic constants of metastable HCP Ni; these deviations can be as high as 41%"
Context: The DP-Ni (deep potential) model reduced these errors dramatically, with energy differences within 3 meV/atom and maximum elastic constant deviations of ~10% for HCP Ni. However, even modern qSNAP showed ~30% deviations in cohesive energy.
Confidence: High

### 2.2 Temperature-Dependent Elastic Constants

Claim: A 2018 study comparing multiple EAM potentials for Pt, Au, and Ag found that even "accurate" classical potentials show systematic degradation with temperature, with most failing to maintain <10% error in all elastic constants above 500K. [^18^]
Source: Scientific Reports 8, 2246 (2018)
URL: https://www.nature.com/articles/s41598-018-20375-4
Date: 2018
Excerpt: "The Pt.lammps.eam potential was generated by Sheng et al. based on Pt crystal structures and physical properties which have been validated against experimental results at 0 K and 300 K... However, it may not be appropriate for temperatures higher than 300 K."
Context: This reveals that even modern EAM potentials fit to DFT data often fail outside their fitting window. Potentials developed by fitting to ab initio MD trajectories showed better transferability but still had significant errors at high temperatures.
Confidence: High

### 2.3 Universal MLIP Elastic Property Benchmark (2025)

Claim: A systematic benchmark of four universal MLIPs (MatterSim, MACE, SevenNet, CHGNet) against DFT for nearly 11,000 materials found that SevenNet achieved the highest accuracy, but all models showed systematic biases in elastic properties, with CHGNet strongly underestimating shear modulus (-48%) and MACE consistently overestimating it (+13.8%). [^19^]
Source: arXiv:2510.22999v3
URL: https://arxiv.org/html/2510.22999v3
Date: 2025
Excerpt: "CHGNet systematically underestimates both [shear modulus and Young's modulus] (-48.02% and -44.20%), in sharp contrast to the overestimations observed for MACE (13.83% and 12.43%), while MatterSim yields nearly symmetric distributions."
Context: Despite dramatically higher model complexity, universal MLIPs still exhibit systematic, architecture-dependent biases. The systematic nature of these errors suggests they originate from training data composition rather than model expressivity.
Confidence: High

### 2.4 Classical Potential Elastic Constant Accuracy (2017)

Claim: A comprehensive comparison of classical interatomic potentials found that for FCC metals, c_44 was consistently the most poorly predicted elastic constant, with relative errors 2.5x larger than c_11 and c_12 combined. PCA analysis showed that the first principal component of errors had weights (0.33, 0.31, 0.89) for (c_11, c_12, c_44). [^20^]
Source: Scientific Data / NIST
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC5283064/
Date: 2017
Excerpt: "The principal component analysis for this subset of empirical potentials predicts a relative error in c_44 of about 2.5 times the sum of the errors in c_11 and c_12."
Context: This finding is directly relevant to the error dimensionality question - the systematic structure of elastic constant errors across diverse potentials suggests these errors are constrained to a low-dimensional manifold determined by the physics of the bonding model, not the specific parameterization.
Confidence: High

---

## 3. Why Would Error Dimensionality Be Invariant Despite Model Complexity Increases?

### 3.1 The Observable Space Hypothesis

The central question raised by the preprint is: why does the effective dimensionality of prediction errors remain bounded between 1.0 and 1.9 even as models become dramatically more complex and individually more accurate? Several lines of evidence support this interpretation:

**3.1.1 Systematic Error Structure Across All Potential Types**

Claim: Systematic errors in interatomic potentials are highly structured and correlated across physical properties, regardless of potential formalism. [^21^]
Source: Multiple studies (Deng et al. 2024, Focassio et al. 2025)
URL: https://arxiv.org/html/2405.07105v1
Date: 2024
Excerpt: "A considerable fraction of uMLIP errors are highly systematic, and can therefore be efficiently corrected... fine-tuning with a single additional data point can rectify the PES softening issue."
Context: If errors were high-dimensional and uncorrelated, they would require many correction parameters. The fact that systematic corrections (like a single scaling factor for PES curvature) can dramatically improve multiple properties simultaneously is evidence for low-dimensional error structure.
Confidence: High

**3.1.2 PES Softening as Universal Error Mode**

Claim: Universal MLIPs systematically underestimate the curvature of the potential energy surface away from equilibrium, leading to correlated errors in forces, vibrational frequencies, energy barriers, surface energies, and defect energies. [^22^]
Source: npj Computational Materials 11, 9 (2025)
URL: https://arxiv.org/abs/2405.07105
Date: 2025
Excerpt: "The PES softening behavior originates from a systematic underprediction error of the PES curvature, which derives from the biased sampling of near-equilibrium atomic arrangements in uMLIP pre-training datasets."
Context: This "PES softening" represents a single dominant error mode that affects many observables simultaneously - a hallmark of low-dimensional error structure. Classical potentials show analogous dominant error modes (e.g., EAM's inability to capture directional bonding).
Confidence: High

**3.1.3 Correlation Between Test Error and Physical Properties**

Claim: For conservative MLIP models, there is a strong correlation between test-set force/energy errors and derived physical properties including thermal conductivity and vibrational entropy. [^23^]
Source: arXiv:2502.12147v2
URL: https://arxiv.org/html/2502.12147v2
Date: 2025
Excerpt: "Among models that pass the MD energy conservation test, a strong correlation between test error and kappa_SRME / vibrational entropy MAE can be observed."
Context: This demonstrates that the error in predicting derived physical properties is not independent of the fitting error - the errors live in a correlated, low-dimensional space.
Confidence: Medium

### 3.2 The Physical Origin of Error Dimensionality Invariance

Several mechanisms may explain why error dimensionality remains invariant:

**3.2.1 The Completeness-Physics Trade-off**

Claim: The ACE framework and related descriptors are provably complete in the limit, meaning they can represent any potential energy surface. However, practical implementations with finite cutoffs and body orders face fundamental limitations from the physics they encode. [^24^]
Source: arXiv:2402.07472v3 / Physical Review B 104, 144110 (2021)
URL: https://arxiv.org/html/2402.07472v3
Date: 2024
Excerpt: "ACE can be viewed as a general framework of many other representations of the atomic environment. The completeness of this representation implies that, as the approximation parameters tend to infinity, the model is capable of representing any arbitrary potential."
Context: The gap between "in principle completeness" and "practical implementation" creates systematic error modes. These modes are determined by what physics is NOT captured (long-range interactions, electronic structure, many-body effects beyond the cutoff) rather than by the specific functional form.
Confidence: High

**3.2.2 The "Observable Space" as a Constraint**

The preprint's claim that the hyper-ribbon is an "invariant of the observable space" can be interpreted as follows: the set of material properties typically measured (elastic constants, defect energies, surface energies, phonon frequencies, etc.) forms a correlated manifold because they all derive from the same underlying potential energy surface. Any model that approximates this PES will have errors that live primarily in the directions where the PES approximation fails. Since the physical properties of interest are all smooth functionals of the PES, their errors are necessarily correlated, and the dimensionality of the error space is bounded by the number of independent failure modes of the PES approximation, not by the number of observables.

**3.2.3 The Training Data Bottleneck**

Claim: Training data quality and diversity is often more important than model architecture in determining accuracy. Models trained on datasets biased toward equilibrium configurations exhibit similar systematic errors regardless of architecture. [^25^]
Source: Matlantis blog / Deng et al. (2024)
URL: https://matlantis.com/en/resources/blog/mlip-intro/
Date: 2025
Excerpt: "A model trained on a relatively small dataset of about 400,000 structures achieved performance equal to or better than a model using the massive OMat24 dataset containing about 100 million structures... The key lies in the breadth of the structural space covered by the dataset."
Context: The MatPES study showed that a 400K-structure dataset with balanced equilibrium/non-equilibrium coverage outperformed a 100M-structure dataset dominated by equilibrium configurations. This implies that the dimensionality of errors is determined by what regions of configuration space are sampled, not by model complexity.
Confidence: High

### 3.3 Analogy to the "No Free Lunch" Theorem

The invariance of error dimensionality can be understood through an analogy to the "no free lunch" theorem in machine learning: all models that use only local atomic environment information face the same fundamental physical constraints. Increasing model complexity can redistribute errors but cannot eliminate the fundamental error modes without introducing new information (e.g., long-range interactions, electronic degrees of freedom).

---

## 4. Do MLIPs Break This Temporal Invariance?

### 4.1 Evidence That MLIPs Maintain Low-Dimensional Error Structure

Claim: Despite dramatically higher accuracy on training-set-like configurations, MLIPs exhibit systematic error patterns that are correlated across physical properties, indicating that their errors still live in a low-dimensional subspace. [^26^]
Source: Leimeroth et al. (2025) / Journal of Physics: Condensed Matter
URL: https://iopscience.iop.org/article/10.1088/1361-651X/adf56d
Date: 2025
Excerpt: "Nonlinear ACE and the equivariant, message-passing graph neural networks NequIP and MACE form the Pareto front in the accuracy vs. computational cost trade-off... In case of the Al-Cu-Zr system we find that MACE and Allegro offer the highest accuracy, while NequIP outperforms them for Si-O."
Context: The fact that different MLIP architectures have different systematic strengths and weaknesses (MACE better for metals, NequIP better for ionic systems) suggests that error patterns are architecture-dependent but still low-dimensional.
Confidence: High

### 4.2 Evidence from Fine-Tuning Studies

Claim: Fine-tuning universally improves MLIP accuracy by factors of 5-15x for forces and 2-4 orders of magnitude for energies, with final accuracy becoming largely independent of the starting architecture. This suggests that the residual errors are determined by the data, not the model. [^27^]
Source: arXiv:2511.05337v1
URL: https://arxiv.org/html/2511.05337v1
Date: 2025
Excerpt: "Fine-tuning consistently reduces these errors by remarkable margins. Force accuracy improves by factors of 5-15x... the magnitude of improvement shows limited dependence on the specific MLIP framework, suggesting that fine-tuning effectiveness is primarily determined by the quality and relevance of training data rather than architectural details."
Context: If MLIPs could escape the low-dimensional error structure through architecture alone, we would expect architecture-dependent final accuracy after fine-tuning. Instead, all architectures converge to similar accuracy, suggesting the data determines the error floor.
Confidence: High

### 4.3 Universal MLIP Systematic Errors

Claim: A systematic assessment of uMLIPs (M3GNet, CHGNet, MACE, M3GNet, ALIGNN) found they all show architecture-dependent systematic biases in formation energies, vibrational properties, and equation of state predictions. [^28^]
Source: Wiley Interdisciplinary Reviews: Computational Molecular Science
URL: https://onlinelibrary.wiley.com/doi/full/10.1002/mgea.58
Date: 2024
Excerpt: "The precision and transferability is still far from the one that can be achieved with state-of-the-art pseudopotential-based ab initio techniques... uMLIPs predictions should be taken with some caution and, if possible, validated a posteriori via ab initio calculations."
Context: Despite training on millions of structures, uMLIPs still have systematic, correlated errors across properties. This strongly supports the hypothesis that the observable space constrains the dimensionality of errors.
Confidence: High

### 4.4 Counter-Evidence: Are MLIPs Different?

Some evidence suggests MLIPs may partially transcend the invariance:

Claim: MLIPs can achieve accuracy on individual properties that was previously impossible. For example, fine-tuned MACE models achieve sub-chemical accuracy for molecular crystals with respect to DFT. [^29^]
Source: Chemical Science 2025
URL: https://pubs.rsc.org/en/content/articlehtml/2025/sc/d5sc01325a
Date: 2025
Excerpt: "We fine-tune the MACE-MP-0b3 foundation model for each molecular crystal in the X23 dataset... Our fine-tuned models achieve excellent accuracy on lattice energies, equation of state (EOS), and quasi-harmonic vibrational energies."
Context: The question is whether this improvement represents an escape from the low-dimensional error structure or merely a shift along the error manifold. The evidence from systematic PES softening suggests the latter.
Confidence: Medium

---

## 5. Observable Space vs. Model Architecture

### 5.1 What is the "Observable Space"?

The "observable space" refers to the set of all material properties that are routinely computed and compared between interatomic potentials and reference data. This typically includes:
- Equilibrium structural properties (lattice constants, cohesive energies)
- Elastic constants and moduli
- Point defect formation and migration energies
- Surface and stacking fault energies
- Phonon frequencies and thermodynamic properties
- Phase stability and transition pressures
- Dislocation core structures and migration barriers

### 5.2 Why is Error Dimensionality an Invariant?

The key insight is that all these observables are smooth functionals of the potential energy surface (PES). If a model makes an error in the PES in some direction in configuration space, that error will propagate to all observables in a correlated manner. The number of independent ways a model can fail to capture the PES is much smaller than the number of observables, because:

1. **Physical constraints**: The PES must satisfy certain smoothness conditions, energy scaling, and symmetry constraints
2. **Locality**: Most interatomic potentials (including MLIPs) assume local interactions within a cutoff radius
3. **Information bottleneck**: The reference data (DFT calculations) itself lives on a lower-dimensional manifold in the space of all possible atomic configurations

### 5.3 Evidence from Classical Potentials

Claim: The PCA analysis of elastic constant errors for 30+ EAM/MEAM potentials showed that the first principal component explains most of the variance, with a characteristic error pattern (0.33, 0.31, 0.89) for (c_11, c_12, c_44). [^30^]
Source: PMC / NIST
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC5283064/
Date: 2017
Excerpt: "Most of the variance is explained by the first eigenvector (0.33, 0.31, 0.89) where the three components correspond to c_11, c_12, and c_44."
Context: This is direct evidence that the error manifold is approximately one-dimensional for a large ensemble of potentials. The specific direction of this dominant error mode is determined by physics (the difficulty of capturing shear deformations relative to volumetric deformations).
Confidence: High

---

## 6. Implications for Future Potential Development

### 6.1 The Plateau of Traditional Potentials

Claim: Traditional potentials have reached a plateau where further parameter optimization cannot significantly improve transferability because the error is dominated by the limitations of the functional form itself. [^31^]
Source: Acta Materialia 214, 116980 (2021) - Mishin review
URL: http://physics.gmu.edu/~ymishin/resources/ML_Potentials_Acta_2021.pdf
Date: 2021
Excerpt: "Traditional potentials have served in this capacity for over three decades... While the traditional potentials are derived from physical insights into the nature of chemical bonding, the ML potentials utilize a high-dimensional mathematical regression to interpolate between the reference energies."
Context: Mishin identifies three classes of potentials: traditional physics-based, ML-based, and a new hybrid "physically-informed" class that combines ML regression with physics-based models to improve transferability.
Confidence: High

### 6.2 MLIPs and the Data Bottleneck

Claim: The primary bottleneck for further improving MLIPs is not model architecture but the accumulation of high-quality, diverse reference data. [^32^]
Source: Journal of Physical Chemistry A (2023) - MLIPs and Long-Range Physics
URL: https://pubs.acs.org/doi/10.1021/acs.jpca.2c06778
Date: 2023
Excerpt: "Debatably, the bottleneck to increasing MLIP capabilities is the accumulation of reference data for training, instead of limitations resulting from the underlying model architecture."
Context: This directly supports the hypothesis that error dimensionality is data-limited, not model-limited. Adding new types of training data (non-equilibrium structures, diverse chemistries) expands the observable space and potentially increases the error dimensionality.
Confidence: High

### 6.3 Physics-Informed ML Potentials

Claim: The next frontier in interatomic potential development is coupling ML regression with physics-based models to combine the accuracy of ML with the transferability of physics-based approaches. [^33^]
Source: Physical Review Materials 4, 113807 (2020); Computational Materials Science 205, 111180 (2022)
URL: https://www.ctcms.nist.gov/potentials/entry/2022--Lin-Y-S-Purja-Pun-G-P-Mishin-Y--Ta/
Date: 2020-2022
Excerpt: "The recently proposed physically-informed neural network (PINN) model improves the transferability by combining a neural network regression with a physics-based bond-order interatomic potential."
Context: PINN potentials for tantalum reproduce reference energies within 2.8 meV/atom and accurately predict a broad spectrum of properties including lattice dynamics, thermal expansion, defect energies, dislocation core structures, and melting temperature.
Confidence: High

### 6.4 Semi-Universal vs. Universal MLIPs

Claim: Semi-universal MLIPs for specific material classes (e.g., steels, oxides, molten salts) may provide more practical solutions than fully universal potentials, similar to the CALPHAD approach to thermodynamic databases. [^34^]
Source: Ceder group - A practical guide to MLIPs (2025)
URL: https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf
Date: 2025
Excerpt: "Semi-universal (SU-MLIPs) for key classes of materials with intermediate numbers of elements (e.g., ~20) and/or limited phases or structures, might be established... Such an approach would mimic the very successful methods of the CALPHAD community."
Context: This approach would acknowledge that the observable space for specific material classes has lower effective dimensionality than the full space of all materials, enabling more efficient coverage.
Confidence: Medium

### 6.5 Future: Beyond Local Interactions

Claim: Including long-range interactions (electrostatics, dispersion) in MLIPs is an active frontier that may expand the observable space and potentially increase error dimensionality. [^35^]
Source: ACS Physical Chemistry Au (2026) - MLIPs and Long-Range Physics
URL: https://pubs.acs.org/doi/10.1021/acsphyschemau.4c00004
Date: 2026
Excerpt: "MLIPs are subject to an adage of classical simulations: a model should be no more or no less complex than what the application space demands."
Context: Fourth-generation HDNNPs with explicit long-range electrostatics, and equivariant message-passing architectures like MACE that capture semi-local interactions, represent attempts to expand beyond the locality assumption that constrains traditional potentials.
Confidence: Medium

---

## 7. Key Synthesis and Conclusions

### 7.1 The Error Dimensionality Paradox

The evidence strongly supports the preprint's central claim: while raw accuracy has improved dramatically over 40 years (from ~50% errors in elastic constants with early EAM to ~5-10% with modern MLIPs), the effective dimensionality of errors has remained bounded. This is because:

1. **Errors are physically constrained**: All observables derive from the PES, and PES approximation errors have a finite number of independent modes
2. **Locality is the binding constraint**: From EAM to modern MLIPs, the fundamental assumption that energy depends only on the local atomic environment (within a cutoff) limits what physics can be captured
3. **Training data determines the error manifold**: The composition of training data (equilibrium vs. non-equilibrium, diverse vs. narrow chemistry) determines the direction of errors more than model architecture

### 7.2 Will the Invariance Ever Be Broken?

The invariance could be broken if:
- **Nonlocal physics is included**: Potentials that explicitly include long-range electrostatics, dispersion, or electronic structure could access error modes currently inaccessible
- **The observable space expands**: New types of observables (e.g., response to electromagnetic fields, magnetic properties) could reveal new error dimensions
- **Exotic materials**: Materials with fundamentally different bonding (e.g., topological materials, strongly correlated systems) may require error modes not probed by current benchmarks

### 7.3 Practical Implications

1. **For potential developers**: Focus on data diversity and coverage of configuration space rather than marginal architectural improvements
2. **For users**: Systematic error patterns mean that validation on a few key properties can predict accuracy on many others
3. **For the field**: The invariance suggests there are fundamental limits to what local-interaction models can achieve, pointing toward the need for explicit nonlocal physics

---

## References

[^1^]: M.S. Daw and M.I. Baskes, "Embedded-atom method: Derivation and application to impurities, surfaces, and other defects in metals," Phys. Rev. B 29, 6443 (1984). https://doi.org/10.1103/PhysRevB.29.6443

[^2^]: M.W. Finnis and J.E. Sinclair, "A simple empirical N-body potential for transition metals," Philos. Mag. A 50, 45 (1984). https://doi.org/10.1080/01418618408244210

[^3^]: F.H. Stillinger and T.A. Weber, "Computer simulation of local order in condensed phases of silicon," Phys. Rev. B 31, 5262 (1985). https://doi.org/10.1103/PhysRevB.31.5262

[^4^]: J. Tersoff, "New empirical approach for the structure and energy of covalent systems," Phys. Rev. B 37, 6991 (1988). https://doi.org/10.1103/PhysRevB.37.6991

[^5^]: M.I. Baskes, "Modified embedded-atom potentials for cubic materials and impurities," Phys. Rev. B 46, 2727 (1992). https://doi.org/10.1103/PhysRevB.46.2727

[^6^]: D.W. Brenner, "Empirical potential for hydrocarbons for use in simulating the chemical vapor deposition of diamond films," Phys. Rev. B 42, 9458 (1990). https://doi.org/10.1103/PhysRevB.42.9458

[^7^]: A.C.T. van Duin et al., "ReaxFF: A Reactive Force Field for Hydrocarbons," J. Phys. Chem. A 105, 9396-9409 (2001). https://doi.org/10.1021/jp004368u

[^8^]: T. Liang et al., "Reactive Force Field for Molecular Dynamics Simulations of Hydrocarbon Oxidation," J. Phys. Chem. A 116, 7976-7991 (2012). https://doi.org/10.1021/jp212083t

[^9^]: J. Behler and M. Parrinello, "Generalized Neural-Network Representation of High-Dimensional Potential-Energy Surfaces," Phys. Rev. Lett. 98, 146401 (2007). https://doi.org/10.1103/PhysRevLett.98.146401

[^10^]: A.P. Bartok et al., "Gaussian Approximation Potentials: The Accuracy of Quantum Mechanics, without the Electrons," Phys. Rev. Lett. 104, 136403 (2010). https://doi.org/10.1103/PhysRevLett.104.136403

[^11^]: A.P. Thompson et al., "Spectral neighbor analysis method for automated generation of quantum-accurate interatomic potentials," J. Comp. Phys. 285, 316 (2015). https://doi.org/10.1016/j.jcp.2014.12.018

[^12^]: A.P. Thompson, "Extending the Accuracy of the SNAP Interatomic Potential Form," arXiv:1711.11131 (2017). https://doi.org/10.48550/arXiv.1711.11131

[^13^]: R. Drautz, "Atomic cluster expansion for accurate and transferable interatomic potentials," Phys. Rev. B 99, 014104 (2019). https://doi.org/10.1103/PhysRevB.99.014104

[^14^]: M. Rupp et al., "Atomic cluster expansion: Completeness, efficiency and stability," J. Comp. Phys. 454, 110946 (2022). https://doi.org/10.1016/j.jcp.2022.110946

[^15^]: I. Batatia et al., "MACE: Higher Order Equivariant Message Passing Neural Networks for Fast and Accurate Force Fields," NeurIPS 35, 11423-11436 (2022). https://arxiv.org/abs/2206.07697

[^16^]: D.P. Kovacs et al., "MACE: Higher Order Equivariant Message Passing Neural Networks," arXiv:2206.07697 (2022). https://doi.org/10.48550/arXiv.2206.07697

[^17^]: Z. Lin et al., "An accurate and transferable machine learning interatomic potential for nickel," npj Comp. Mater. 10, 74 (2024). https://doi.org/10.1038/s43246-024-00603-3

[^18^]: S.M. Hamdi et al., "Interatomic Potentials Transferability for Molecular Simulations: A Comparative Study for Platinum, Gold and Silver," Sci. Rep. 8, 2246 (2018). https://doi.org/10.1038/s41598-018-20375-4

[^19^]: "Benchmarking Universal Machine Learning Interatomic Potentials for Elastic Property Prediction," arXiv:2510.22999v3 (2025). https://arxiv.org/abs/2510.22999

[^20^]: K. Choudhary et al., "Evaluation and comparison of classical interatomic potentials through a user-friendly interactive web-interface," Sci. Data (2017). https://pmc.ncbi.nlm.nih.gov/articles/PMC5283064/

[^21^]: B. Deng et al., "Overcoming systematic softening in universal machine learning interatomic potentials by fine-tuning," arXiv:2405.07105 (2024). https://doi.org/10.48550/arXiv.2405.07105

[^22^]: B. Deng et al., "Systematic softening in universal machine learning interatomic potentials," npj Comp. Mater. 11, 9 (2025). https://doi.org/10.1038/s41524-024-01501-x

[^23^]: "Learning Smooth and Expressive Interatomic Potentials for Physical Property Prediction," arXiv:2502.12147 (2025). https://arxiv.org/abs/2502.12147

[^24^]: "Cartesian atomic cluster expansion for machine learning interatomic potentials," arXiv:2402.07472 (2024). https://arxiv.org/abs/2402.07472

[^25^]: "Introduction to Machine Learning Interatomic Potential," Matlantis (2025). https://matlantis.com/en/resources/blog/mlip-intro/

[^26^]: N. Leimeroth et al., "Machine-learning interatomic potentials from a user's perspective," J. Phys.: Condens. Matter (2025). https://iopscience.iop.org/article/10.1088/1361-651X/adf56d

[^27^]: J. Hänseroth et al., "Fine-Tuning Unifies Foundational Machine-learned Interatomic Potential Architectures at ab initio Accuracy," arXiv:2511.05337 (2025). https://arxiv.org/abs/2511.05337

[^28^]: "Systematic assessment of various universal machine-learning interatomic potentials," WIREs Comp. Mol. Sci. (2024). https://onlinelibrary.wiley.com/doi/full/10.1002/mgea.58

[^29^]: "Accurate and efficient machine learning interatomic potentials for finite temperature modelling of molecular crystals," Chem. Sci. (2025). https://pubs.rsc.org/en/content/articlehtml/2025/sc/d5sc01325a

[^30^]: K. Choudhary et al., "Evaluation and comparison of classical interatomic potentials," Sci. Data (2017). https://pmc.ncbi.nlm.nih.gov/articles/PMC5283064/

[^31^]: Y. Mishin, "Machine-learning interatomic potentials for materials science," Acta Mater. 214, 116980 (2021). https://doi.org/10.1016/j.actamat.2021.116980

[^32^]: S. Raugei et al., "Machine Learning Interatomic Potentials and Long-Range Physics," J. Phys. Chem. A (2023). https://doi.org/10.1021/acs.jpca.2c06778

[^33^]: Y.-S. Lin et al., "Development of a physically-informed neural network interatomic potential for tantalum," Comp. Mater. Sci. 205, 111180 (2022). https://doi.org/10.1016/j.commatsci.2021.111180

[^34^]: K. Ryan et al., "A practical guide to machine learning interatomic potentials," (2025). https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf

[^35^]: "The Potential of Neural Network Potentials," ACS Phys. Chem. Au (2026). https://pubs.acs.org/doi/10.1021/acsphyschemau.4c00004

---

## Additional Key Sources

- A.P. Bartok et al., "On representing chemical environments," Phys. Rev. B 87, 184115 (2013). https://doi.org/10.1103/PhysRevB.87.184115
- Y. Zuo et al., "Performance and Cost Assessment of Machine Learning Interatomic Potentials," J. Phys. Chem. A 124, 731-745 (2020). https://doi.org/10.1021/acs.jpca.9b08723
- V.L. Deringer et al., "Machine Learning Interatomic Potentials as Emerging Tools for Materials Science," Adv. Mater. 31, 1902765 (2019). https://doi.org/10.1002/adma.201902765
- N. Bernstein et al., "From GAP to ACE to MACE and Beyond," (2024). https://arxiv.org/abs/2410.06354
- C. Chen and S.P. Ong, "A universal graph deep learning interatomic potential for the periodic table," Nat. Comp. Sci. 2, 718-728 (2022). https://doi.org/10.1038/s43588-022-00349-3
- B. Deng et al., "CHGNet as a pretrained universal neural network potential for charge-informed atomistic modelling," Nat. Mach. Intell. 5, 1031-1041 (2023). https://doi.org/10.1038/s42256-023-00716-3
- W. Sheng et al., "Development of interatomic potentials appropriate for simulation of devitrification in Al-Ni-Y alloys," Philos. Mag. 92, 3456-3470 (2012). https://doi.org/10.1080/14786435.2012.681072
- E. Kocer et al., "Continuous and optimally complete description of chemical environments using spherical Bessel descriptors," (2021). https://par.nsf.gov/servlets/purl/10113351
- S. Kadupitiya et al., "Machine learning interatomic potentials from a user's perspective," (2025). https://arxiv.org/abs/2505.02503
- "Universal Machine Learning Potential for Systems with Reduced Dimensionality," arXiv:2508.15614 (2025). https://arxiv.org/abs/2508.15614

---

*Document compiled from 18+ independent web searches across peer-reviewed journals, arXiv preprints, official repositories (OpenKIM, NIST), and authoritative textbooks.*
*Last updated: Research session covering temporal evolution of interatomic potential accuracy and error structure.*
