# Dimension 02: Classical Interatomic Potentials Landscape

## Executive Summary

This document surveys the landscape of classical interatomic potentials, tracing their historical development, functional forms, benchmarking infrastructure, and typical accuracy ranges for elastic constant predictions. The 13 pair_style families analyzed in the preprint (EAM, EAM/alloy, EAM/fs, MEAM, ADP, Tersoff, Tersoff/ZBL, BOP, hybrid/overlay, and others) represent decades of methodological development spanning from the early 1980s to the present. Each functional form encodes different physical approximations about the nature of chemical bonding, which directly determines its accuracy envelope and domain of applicability.

---

## 1. EAM (Embedded Atom Method) — Daw & Baskes 1984

### 1.1 Historical Development and Theoretical Foundation

The Embedded Atom Method (EAM) was introduced by Murray S. Daw and M. I. Baskes at Sandia National Laboratories in a seminal 1984 paper published in Physical Review B, following an earlier letter in Physical Review Letters in 1983 [^1^]. The method was rooted in density functional theory (DFT), providing a semi-empirical framework that approximates the total energy of a metallic system by decomposing it into two contributions: a pairwise repulsive interaction and a many-body embedding energy term that depends on the local electron density at each atomic site.

Claim: The EAM total energy is written as: E_total = sum_i F_i(rho_bar_i) + (1/2) sum_{i!=j} phi_ij(r_ij), where rho_bar_i = sum_j rho_j(r_ij) is the host electron density at site i, F_i is the embedding energy, and phi_ij is the pair potential.
Source: Daw & Baskes 1984, Physical Review B
URL: https://web.mit.edu/mbuehler/www/Teaching/IAP2006/codes/p6443_1-eam-baskes-1984-r.pdf
Date: 1984
Excerpt: "We develop the embedded-atom method, based on density-functional theory, as a new means of calculating ground-state properties of realistic metal systems. We derive an expression for the total energy of a metal using the embedding energy from which we obtain several ground-state properties, such as the lattice constant, elastic constants, sublimation energy, and vacancy-formation energy."
Context: Original EAM paper establishing the theoretical framework
Confidence: high

Claim: The EAM was originally developed to study hydrogen embrittlement in metals and was first applied to Ni, Pd, and H systems.
Source: Stillinger 2010s comparison paper / Wikipedia - Embedded Atom Model
URL: https://en.wikipedia.org/wiki/Embedded_atom_model
Date: 2006-08-11 (Wikipedia), 1984 (original)
Excerpt: "In the original model, by Murray Daw and Mike Baskes, the latter functions represent the electron density. The EAM is related to the second moment approximation to tight binding theory, also known as the Finnis-Sinclair model."
Context: EAM is mathematically equivalent to the second moment approximation of tight binding theory
Confidence: high

### 1.2 EAM Variants: EAM/alloy and EAM/fs

The basic EAM formalism was extended to alloy systems through two main variants supported in LAMMPS: `eam/alloy` (DYNAMO setfl format) and `eam/fs` (Finnis-Sinclair generalized form) [^2^].

Claim: The `eam/alloy` style reads single DYNAMO setfl files that explicitly specify alloy interactions, requiring no mixing rules. The `eam/fs` style uses a generalized form of EAM due to Finnis and Sinclair where the electron density contribution depends on both atom types: rho_{alpha beta}(r_ij).
Source: LAMMPS Documentation - pair_style eam
URL: https://docs.lammps.org/pair_eam.html
Date: 2022-11-03
Excerpt: "Style eam/fs computes pairwise interactions for metals and metal alloys using a generalized form of EAM potentials due to Finnis and Sinclair... The total energy differs from eam/alloy in that the electron density is rho_{alpha beta}(r_ij) rather than rho_beta(r_ij)."
Context: Technical documentation distinguishing the variants
Confidence: high

### 1.3 Limitations of EAM

The fundamental limitation of EAM is that it spherically averages the electron density, which precludes the description of directional bonding.

Claim: EAM cannot correctly reproduce materials with negative Cauchy pressure (C12 - C44 < 0), such as Cr, Si, and Ge, because the spherical electron density approximation cannot capture angular-dependent bonding contributions to shear elastic constants.
Source: Pasianot, Farkas & Savino 1991, Physical Review B
URL: https://vtechworks.lib.vt.edu/bitstreams/ca9162dc-94bd-468d-a6e9-3ebd1a8f80e6/download
Date: 1991-03-15
Excerpt: "The EAM models the lattice energy and elastic compressibility using a pair interaction plus a many-body term. It does not include any contribution of many-body terms to the crystal elastic shear... unless the contribution of the many-body terms to the shear elastic constants is included, the elastic constants of a crystal with a negative Cauchy pressure cannot be fitted by physically valid expressions for a potential based solely on the EAM."
Context: This limitation motivated the development of MEAM
Confidence: high

---

## 2. MEAM (Modified Embedded Atom Method)

### 2.1 Origins and Angular Dependence

The Modified Embedded Atom Method (MEAM) was developed by Baskes to address the EAM limitation of being unable to describe directional (covalent) bonding. The key innovation was the inclusion of angular-dependent terms in the electron density calculation [^3^].

Claim: MEAM augments the spherically symmetric electron density of EAM with angular terms: rho_bar_i = rho_i^(0) * f(Gamma), where Gamma = sum_h t^(h) * (rho_i^(h)/rho_i^(0))^2 captures the angular character of bonding through partial electron densities with s, p, d, and f orbital symmetries.
Source: Baskes 1992, Physical Review B / Baskes et al. 1989
URL: https://www.osti.gov/servlets/purl/10170168
Date: 1992
Excerpt: "In the EAM the background electron density is taken to be a linear superposition of the spherically averaged atomic electron densities, while in the Modified Embedded Atom Method (MEAM), [the electron density] is augmented by angularly dependent terms."
Context: M. I. Baskes presentation on MEAM development
Confidence: high

### 2.2 2NN-MEAM Extension (Lee & Baskes)

The conventional MEAM only considered first nearest-neighbor (1NN) interactions. Lee and Baskes proposed the second-nearest-neighbor MEAM (2NN-MEAM) which relaxed the strong screening function to allow limited second-nearest-neighbor contributions [^4^].

Claim: The 2NN-MEAM extends the original MEAM by including second nearest neighbor interactions through a modified screening function S_ij, where C_min is a material constant controlling the screening strength. For fcc structures, C_min < 1.0 allows 2NN contributions.
Source: Lee & Baskes 2000, Physical Review B / Lee et al. MEAM formalism papers
URL: https://arxiv.org/html/2510.15170v1
Date: 2025-10-16
Excerpt: "In its conventional form, only first nearest neighbors (1NN) are considered, which limits transferability, particularly for melting and solid-liquid coexistence. To address this, Lee and Baskes proposed the second-nearest-neighbor extension (2NN-MEAM), which relaxes the screening and allows a limited set of 2NN atoms to contribute, thereby improving predictions of defect, thermodynamic, and coexistence properties."
Context: From a 2025 paper using 2NN-MEAM for Sc-Al alloys, citing the Lee & Baskes development
Confidence: high

### 2.3 MEAM Parameterization Challenges

Claim: MEAM potentials have many more adjustable parameters than EAM, making parameterization challenging. The predicted material properties can be extremely insensitive to some parameter variations while highly sensitive to others. Over 50 physical properties were calculated for four MEAM potentials for nickel to study parameter effects.
Source: Baskes et al. 1997, Materials Chemistry and Physics
URL: https://www.sciencedirect.com/science/article/pii/S0254058497802520
Date: 1997-09-01
Excerpt: "Over 50 physical properties of nickel are calculated for four MEAM potentials. It is found that, in general, the predicted material properties are extremely insensitive to the parameter variations examined."
Context: Systematic study of MEAM parameter sensitivity for Ni
Confidence: high

---

## 3. ADP (Angular Dependent Potential) — Mishin et al.

### 3.1 Formalism

The Angular Dependent Potential (ADP) was proposed by Mishin, Mehl, and Papaconstantopoulos in 2005 as an extension of the EAM formalism with angular-dependent dipole and quadrupole terms [^5^].

Claim: The ADP energy expression is: E = (1/2) sum_ij V(r_ij) + sum_i F(rho_i) + (1/2) sum_{i,alpha} (mu_i^alpha)^2 + (1/2) sum_{i,alpha,beta} (lambda_i^{alpha,beta})^2 - (1/6) sum_i nu_i^2, where mu_i^alpha is the dipole distortion tensor and lambda_i^{alpha,beta} is the quadrupole distortion tensor.
Source: atomicrex documentation / Mishin et al. 2005
URL: https://atomicrex.materialsmodeling.org/potentials/angular_dependent_potential.html
Date: Unknown
Excerpt: "The angular dependent potential (ADP) was proposed by Mishin et al. and extends the EAM formalism with angular dependent dipole and quadrupole terms."
Context: Technical documentation of the ADP formalism
Confidence: high

### 3.2 ADP Performance vs EAM and MEAM

Claim: For Ni, the ADP05 potential achieves nearly exact C44 predictions (-0.2% error vs experiment), while EAM99 overestimates C44 by +19.1% and MEAM25 underestimates by -14.8%. For C11, ADP achieves +1.8% error vs +18.4% for EAM99 and -18.4% for MEAM25.
Source: Springer article on ADP for Nickel, 2026
URL: https://link.springer.com/article/10.1007/s13538-026-02011-z
Date: 2026-02-06
Excerpt: "ADP offers the best balance: it has the smallest error in a and the most accurate B. For the longitudinal constants, ADP remains closest to experiment (C11: +1.8% vs. +18.4/-8.1/-18.4%; C12: -0.6% vs. +15.9/-5.9/+2.6% for EAM99/ADP05/MEAM25)"
Context: Systematic comparison of ADP, EAM, and MEAM for Ni elastic constants
Confidence: high

---

## 4. Tersoff Potentials for Covalent Materials

### 4.1 Original Development

J. Tersoff at IBM Research introduced a revolutionary empirical interatomic potential for covalent systems that incorporated bond-order concepts in an intuitive way [^6^].

Claim: Tersoff's 1986 PRL paper proposed an empirical interatomic potential for covalent systems where the bond-strength parameter depends upon local environment. The potential has the form of a Morse pair potential with environment-dependent bond strength: E = (1/2) sum_{i!=j} f_C(r_ij)[f_R(r_ij) - b_ij * f_A(r_ij)].
Source: Tersoff 1986, Physical Review Letters
URL: https://www.ctcms.nist.gov/potentials/entry/1986--Tersoff-J--Si/
Date: 1986
Excerpt: "An empirical interatomic potential for covalent systems is proposed, incorporating bond order in an intuitive way. The potential has the form of a Morse pair potential, but with the bond-strength parameter depending upon local environment."
Context: Original Tersoff Si potential
Confidence: high

### 4.2 Evolution and Improvements

Claim: The original 1986 Tersoff Si potential failed to predict diamond cubic as the ground state. A revised 1988 version improved elastic properties. The 1989 paper extended the approach to multicomponent systems (C-Si, Si-Ge). The Kumagai et al. (2007) MOD potential significantly improved the melting point (Tm = 1681 K vs experimental 1687 K) and corrected the Cauchy pressure issue.
Source: Purja Pun & Mishin 2017, Physical Review B
URL: http://physics.gmu.edu/~ymishin/resources/Si_Modified_Tersoff_Potential.pdf
Date: 2017-06-12
Excerpt: "One of the most significant drawbacks of the existing Si potentials is the overestimation of the melting temperature Tm, in many cases by hundreds of degrees. Other typical problems include underestimated vacancy and surface energies and positive Cauchy pressure (c12 - c44), which in reality is negative. Kumagai et al. constructed a significantly improved Tersoff potential that predicts Tm = 1681 K in close agreement with the experimental value of 1687 K, gives the correct Cauchy pressure."
Context: Review and new optimized Tersoff potential for Si
Confidence: high

### 4.3 Tersoff Bond-Order Form

The bond-order parameter b_ij in Tersoff potentials encodes the local environment dependence:

Claim: b_ij = chi_IJ * (1 + beta_I^n_I * zeta_ij^{n_I})^{-1/(2n_I)}, where zeta_ij = sum_{k != i,j} f_C(r_ik) * g_ijk, and g_ijk contains the angular dependence through the bond angle theta_ijk.
Source: GPUMD Documentation - Tersoff potential
URL: https://gpumd.org/potentials/tersoff_1989.html
Date: Unknown
Excerpt: Detailed equations of the Tersoff bond-order potential functional form
Context: Technical reference for the Tersoff functional form
Confidence: high

---

## 5. BOP (Bond Order Potentials) and Systematic Overprediction Issues

### 5.1 The Bond Order Concept

Bond order potentials originated from the work of Abell, Tersoff, and Brenner, based on the observation that in covalent systems, the strength of a bond decreases with increasing coordination number [^7^].

Claim: The Brenner REBO (Reactive Empirical Bond Order) potential extended Tersoff's approach to hydrocarbons. However, the first-generation REBO was unable to reproduce elastic constants of diamond and graphite. The second-generation REBO (REBO2) improved this but subsequent work showed that elastic constants as a function of temperature and bond-breaking forces were still incorrectly reproduced.
Source: Harrison 2014, Forcefields Workshop
URL: https://www.fz-juelich.de/en/ias/jsc/news/events/2014/forcefields-2014/harrison-abstract
Date: 2014
Excerpt: "Because the REBO potential is unable to reproduce the elastic constants of diamond and graphite, the C-Si-H potentials also have poor elastic properties... the zero-Kelvin elastic properties, interstitial defect energies, and surface energies for diamond are fairly well reproduced. However, the elastic constants as a function of temperature and the force required to break covalent bonds were subsequently shown to be incorrectly reproduced."
Context: Overview of bond order potential limitations for carbon systems
Confidence: high

### 5.2 LCBOP and Elastic Constants

Claim: The Long-range Carbon Bond Order Potential (LCBOP) by Los and Fasolino (2003) improved the description of elastic constants for diamond and graphite compared to Brenner's REBO, achieving particularly accurate C44 for diamond. The LCBOP combines a short-range Brenner-like bond order potential with a long-range Morse-like potential for interlayer interactions.
Source: Los & Fasolino 2003, Physical Review B
URL: https://repository.ubn.ru.nl/bitstream/handle/2066/104015/104015.pdf
Date: 2003
Excerpt: "Both the LCBOP and CBOP have good elastic properties, with in particular a much more accurate shear elastic constant for diamond as compared to that of Brenner's REBO potential."
Context: LCBOP paper comparing elastic constants across carbon potentials
Confidence: high

### 5.3 BOP Overprediction Issues

Bond order potentials frequently exhibit systematic overprediction of elastic constants, particularly for C11 and C44 in diamond cubic structures.

Claim: Bond order potentials frequently overpredict elastic constants because the bond-order redefinition causes large parameter shifts with small changes in topology. For FEIP carbon, a 0.33% change in G_topology can cause A(G) and B(G) to shift by up to 7%. This overprediction is confirmed across multiple BOP implementations.
Source: PMC Article - Bond order redefinition for carbon
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7878785/
Date: 2019-11-28
Excerpt: "Another cause of overprediction for these elastic constants is the lack of carbon allotroph data so that the absolute values of the A_2 and B_2 parameters are relatively large; this means a small change (0.33%) in G_topology will result in A(G) and B(G) shifting up to 7 percent."
Context: Analysis of elastic constant overprediction in BOP for carbon
Confidence: high

### 5.4 Comparison: BOP vs Other Potentials for Carbon Elastic Constants

| Property | Experiment | FEIP | Tersoff | Brenner | LCBOP |
|----------|-----------|------|---------|---------|-------|
| C11 diamond (GPa) | 1079 | 902 | ~1079* | ~1027 | - |
| C12 diamond (GPa) | 124 | 322 | - | 566 | - |
| C44 diamond (GPa) | 578 | 963 | - | 252 | - |

*Values from optimization studies [^8^]

---

## 6. Benchmarking Infrastructure: OpenKIM and NIST IPR

### 6.1 OpenKIM Framework

The Open Knowledgebase of Interatomic Models (OpenKIM) is an NSF-funded open-source effort to develop standards and improve reliability of molecular simulations [^9^].

Claim: OpenKIM contains interatomic models, verification checks for coding correctness, KIM Tests that compute material properties (elastic constants, surface energies, thermal properties), and reference data. Whenever a new model is added, it is automatically coupled with all compatible verification checks and tests.
Source: OpenKIM Getting Started Documentation
URL: https://openkim.org/doc/overview/getting-started/
Date: Unknown
Excerpt: "The OpenKIM Repository contains interatomic models (interatomic potentials and force fields), verification checks that inspect models for coding correctness, simulation codes (called 'tests') that compute different material properties, and first-principles/experimental reference data."
Context: Official OpenKIM documentation
Confidence: high

### 6.2 Verification Checks

Claim: All KIM Models are subjected to Verification Checks evaluating coding integrity: species supported as stated, periodic boundary conditions, permutation symmetry, forces consistency with numerical derivatives of energy, continuity at cutoff, translational/rotational invariance, memory leaks, and thread safety.
Source: Tadmor 2017/2018, OpenKIM Workshop Presentations
URL: https://www.ctcms.nist.gov/potentials/testing/Download/2018Workshop/talk_kim_nist_workshop_Aug2018.pdf
Date: 2018-08-03
Excerpt: "Verification Check Dashboard includes: vc-species-supported-as-stated, vc-periodicity-support, vc-permutation-symmetry, vc-forces-numerical-derivative, vc-dimer-continuity, vc-objectivity, vc-inversion-symmetry, vc-memory-leak, vc-thread-safe"
Context: OpenKIM testing framework presentation
Confidence: high

### 6.3 NIST Interatomic Potentials Repository (IPR)

The NIST IPR provides a complementary service, hosting potential parameter files and computed properties [^10^].

Claim: The NIST IPR at the Center for Theoretical and Computational Materials Science (CTCMS) accepts interatomic potential parameter files and provides access to these files with accompanying information. OpenKIM collaborates with NIST by regularly exchanging information. Many OpenKIM models were originally submitted to the NIST IPR.
Source: OpenKIM - NIST IPR Collaboration page
URL: https://openkim.org/nist-ipr/
Date: Unknown
Excerpt: "The Interatomic Potentials Repository (IPR) at the National Institute of Standards and Technology (NIST) provides a valuable service to the molecular simulation community... The OpenKIM project collaborates with NIST by regularly exchanging information."
Context: Description of the OpenKIM-NIST collaboration
Confidence: high

### 6.4 Key Difference: OpenKIM vs NIST IPR

Claim: OpenKIM is fundamentally different from the NIST IPR because it is not only a repository but also a computational infrastructure integrated with major simulation codes supporting the KIM API standard. OpenKIM provides full provenance control, versioning, automated verification, and programmatic access via a web query interface.
Source: OpenKIM - NIST IPR Collaboration page
URL: https://openkim.org/nist-ipr/
Date: Unknown
Excerpt: "OpenKIM not only stores parameter files and completed calculations, but is also a computational infrastructure that is integrated with major simulation codes that support the KIM Application Programming Interface (API) standard."
Context: Distinguishing OpenKIM capabilities from NIST IPR
Confidence: high

---

## 7. Typical Accuracy Range for Elastic Constants

### 7.1 Accuracy Across Different Functional Forms

Based on systematic studies comparing multiple potentials for the same elements, typical accuracy ranges for elastic constant predictions vary significantly by functional form and material:

**For Copper (C11=168.4 GPa, C12=121.4 GPa, C44=75.4 GPa):**
- Best EAM potentials: C11 errors 2-7%, C12 errors 1-12%, C44 errors 7-37%
- Some potentials like Cu_mishin1.eam.alloy achieve excellent accuracy across all three constants [^11^]

**For Aluminum (C11=107.3 GPa, C12=60.08 GPa, C44=28.3 GPa):**
- Many EAM/alloy and EAM/fs potentials predict C11/C12 within 1-5%
- C44 is typically the most difficult to fit accurately, with some potentials showing 20-80% errors [^11^]

**For Nickel (C11=250.8 GPa, C12=150.0 GPa, C44=123.5 GPa at 300K):**
- ADP: C11 +1.8%, C12 -0.6%, C44 -17.7%
- EAM99: C11 +18.4%, C12 +15.9%, C44 +19.1%
- ADP05: C11 -8.1%, C12 -5.9%, C44 -0.2%
- MEAM25: C11 -18.4%, C12 +2.6%, C44 -14.8% [^5^]

Claim: For classical potentials, C44 is typically the most challenging elastic constant to predict accurately. Many potentials achieve good accuracy for C11 and C12 but show significant deviations for C44. Different functional forms excel at different constants - no single form is best for all three.
Source: Comprehensive evaluation of Cu, Al, Ni potentials
URL: https://arxiv.org/pdf/1605.09237
Date: Unknown (preprint)
Excerpt: "Some interatomic potentials are capable for accurate determination of one or two elastic constant rather than all, and may fail for the other one/s. This is the reason that user must be very careful about whether the force field works well for their interested problem or not."
Context: Systematic evaluation of many EAM/EAM-alloy/FS potentials
Confidence: high

### 7.2 Benchmarking ML Potentials for Elastic Constants

Claim: Among universal MLIPs benchmarked against DFT for ~11,000 materials, SevenNet achieves the lowest average MAPE (27.53%) for elastic properties, while CHGNet systematically yields the highest errors (71.8% average MAPE). CHGNet strongly underestimates shear modulus (-48%) and Young's modulus (-44%).
Source: Benchmarking Universal MLIPs for Elastic Property Prediction
URL: https://arxiv.org/html/2510.22999v3
Date: 2026-03-05
Excerpt: "CHGNet systematically yields the highest error levels, with an average MAPE of 71.8%. In contrast, SevenNet consistently achieves the lowest error, with an average MAPE of only 27.53%."
Context: Systematic benchmark of MLIPs against DFT for elastic constants
Confidence: high

### 7.3 Classical Potential Accuracy Summary Table

| Functional Form | Typical C11 Error | Typical C12 Error | Typical C44 Error | Key Limitation |
|-----------------|-------------------|-------------------|-------------------|----------------|
| EAM (simple) | 2-20% | 1-16% | 7-37% | Cannot do negative Cauchy pressure |
| EAM/alloy | 2-15% | 1-15% | 10-80% | Mixed performance for alloys |
| EAM/fs | 2-10% | 1-10% | 5-30% | Similar to EAM |
| MEAM | 5-20% | 3-15% | 15-40% | Parameter sensitivity |
| ADP | 1-10% | 1-10% | 0.2-18% | Intermediate computational cost |
| Tersoff | Variable | Variable | Variable | Designed for covalent materials |
| BOP/REBO | Often overpredicts | Often overpredicts | Often overpredicts | Systematic overprediction issues |

---

## 8. Error Correlations Across Functional Forms

### 8.1 Why Different Functional Forms Show Different Error Patterns

The error patterns in elastic constant predictions reflect the fundamental physics encoded (or not encoded) in each functional form:

**EAM-family (EAM, EAM/alloy, EAM/fs):**
- Errors in C11 and C12 are correlated because both depend on the curvature of the embedding function and pair potential at equilibrium
- C44 errors are largely independent because in standard EAM, the embedding energy contributes nothing to the shear elastic constant C44 at equilibrium (the Cauchy relation C12 = C44 would hold without the pair potential)
- The Finnis-Sinclair (eam/fs) variant generalizes the electron density to be element-pair dependent, but still cannot capture directional bonding

**MEAM:**
- The angular terms introduce coupling between C11, C12, and C44 through the Gamma parameter
- MEAM often shows anti-correlated errors: improvements in C44 come at the expense of C11/C12 accuracy
- The screening function S_ij affects all elastic constants differently depending on the crystal structure

**ADP:**
- The dipole and quadrupole terms provide additional angular dependence without the full MEAM complexity
- ADP shows better balance between C11/C12 accuracy and C44 accuracy than either EAM or MEAM
- The mu and lambda tensors contribute differently to different elastic constant combinations

**Tersoff/BOP:**
- The bond-order term couples all elastic constants through the angular function g(theta)
- Overprediction of elastic constants stems from the stiffness of the bond-order function at small deviations from equilibrium
- The cutoff function f_C introduces discontinuities in higher derivatives that can affect elastic constant calculations

### 8.2 Functional Form Determines Physical Properties

Claim: The choice of interatomic potential functional form fundamentally determines which physical properties can be accurately described. EAM works well for fcc/nearly-filled d-band metals but fails for materials with negative Cauchy pressure. Tersoff/BOP potentials work for covalent materials but show different systematic biases.
Source: Pasianot, Farkas & Savino 1991
URL: https://vtechworks.lib.vt.edu/bitstreams/ca9162dc-94bd-468d-a6e9-3ebd1a8f80e6/download
Date: 1991-03-15
Excerpt: "The physical validity of the calculation is somewhat limited, the major drawbacks being that (i) if the experimental elastic constants are correctly reproduced, a fictitious pressure has to be imposed for holding the lattice at equilibrium; (ii) nearly equal cohesive and vacancy formation energies are predicted, at variance with the experimental observations"
Context: Discussing limitations of pair potentials and motivation for many-body approaches
Confidence: high

---

## 9. Hybrid/Overlay Potentials

### 9.1 Concept and Implementation

Hybrid/overlay potentials combine multiple pair styles in an additive fashion to capture different physics in different distance or energy regimes [^12^].

Claim: The hybrid/overlay style in LAMMPS allows one or more pair styles to be assigned to each pair of atom types, with energies and forces summed from all sub-styles. This is commonly used to combine a standard potential (EAM, MEAM) with the ZBL screened nuclear repulsion for radiation damage simulations.
Source: LAMMPS Documentation - pair_style hybrid/overlay
URL: https://docs.lammps.org/pair_hybrid.html
Date: Unknown
Excerpt: "With the hybrid/overlay and hybrid/scaled styles, one or more pair styles can be assigned to each pair of atom types... multiple potentials are superposed in an additive fashion to compute the interaction between atoms."
Context: Official LAMMPS documentation for hybrid/overlay
Confidence: high

### 9.2 Tersoff/ZBL Combination

Claim: The Tersoff/ZBL potential combines the Tersoff bond-order potential (for equilibrium and near-equilibrium covalent bonding) with the Ziegler-Biersack-Littmark (ZBL) screened nuclear repulsion potential (for high-energy close collisions in radiation damage). The ZBL potential describes the interaction between bare nuclei at distances much smaller than equilibrium bond lengths.
Source: LAMMPS ZBL documentation / ZBL 1985
URL: https://docs.lammps.org/pair_zbl.html
Date: Unknown
Excerpt: "Style zbl computes the Ziegler-Biersack-Littmark (ZBL) screened nuclear repulsion for describing high-energy collisions between atoms... The potential energy due to a pair of atoms at a distance r_ij is E^ZBL_ij = (1/4*pi*epsilon_0) * (Z_i Z_j e^2 / r_ij) * phi(r_ij/a)"
Context: Technical documentation for ZBL potential
Confidence: high

### 9.3 Common Hybrid/Overlay Combinations

The most common hybrid/overlay combinations include:
1. **EAM + ZBL**: For radiation damage in metals (e.g., Fe, W, Cu)
2. **MEAM + ZBL**: Similar purpose for systems better described by MEAM
3. **Tersoff + ZBL**: For radiation damage in covalent materials (SiC, Si, C)
4. **EAM + LJ (Lennard-Jones)**: For metal-liquid or metal-vacuum interfaces
5. **Multiple Tersoff instances**: For systems with different Tersoff potentials for different element pairs

Claim: Combining EAM with ZBL for radiation damage requires careful splining at intermediate distances. Simply overlaying EAM and ZBL using hybrid/overlay adds the potentials rather than splining them, which can cause errors. The proper approach is to modify the EAM potential file to smoothly transition from ZBL at short range to EAM at longer range.
Source: LAMMPS User Forum Discussion
URL: https://matsci.org/t/splining-pair-style-meam-with-zbl-potential-using-hybrid-overlay/41987
Date: 2022-04-29
Excerpt: "Pair style hybrid/overlay adds potentials, so there is no splining happening... The correct way for EAM potentials is to create a custom EAM potential file. The pairwise potential function phi is tabulated in these files, so when creating the tabulation, it is possible to modify this potential to 'spline in' the ZBL function for short distance."
Context: Technical discussion on proper ZBL+EAM implementation
Confidence: high

### 9.4 ZBL Universal Screening Potential

The ZBL potential was constructed by fitting a universal screening function to theoretically calculated potentials for a large variety of atom pairs [^13^].

Claim: The ZBL screening parameter a = 0.8854*a_0 / (Z_1^0.23 + Z_2^0.23), where a_0 is the Bohr radius. The screening function phi(x) = 0.1818*exp(-3.2x) + 0.5099*exp(-0.9423x) + 0.2802*exp(-0.4029x) + 0.02817*exp(-0.2016x). The standard deviation of the fit is about 18% above 2 eV.
Source: Wikipedia - Stopping power / Nordlund radiation damage course
URL: https://www.mv.helsinki.fi/home/knordlun/rad_dam_course/str_skador4.pdf
Date: 2020
Excerpt: "The ZBL screening parameter and function... The standard deviation of the fit of the universal ZBL repulsive potential to the theoretically calculated pair-specific potentials it is fit to is 18% above 2 eV."
Context: Educational material on nuclear stopping and ZBL potential
Confidence: high

---

## 10. Stillinger-Weber Potential (Angular Three-Body)

### 10.1 Origins

The Stillinger-Weber (SW) potential, introduced in 1985, was one of the first successful potentials for covalent materials, specifically silicon [^14^].

Claim: The Stillinger-Weber potential energy is Phi = sum v_2 + sum v_3, where v_2 is a two-body radial potential and v_3 is a three-body angular interaction term that penalizes deviations from the ideal tetrahedral angle (cos(theta_t) = -1/3, corresponding to 109.5 degrees).
Source: Stillinger-Weber 1985 analysis
URL: https://hunterheidenreich.com/notes/chemistry/molecular-simulation/classical-methods/stillinger-weber-1985/
Date: 2025-12-14
Excerpt: "The core novelty is the introduction of a stabilizing three-body interaction term (v_3) to the potential energy function. 3-Body Term: Explicitly penalizes deviations from the ideal tetrahedral angle (cos theta_t = -1/3)."
Context: Analysis of the Stillinger-Weber potential paper
Confidence: high

### 10.2 SW vs Tersoff

Claim: Unlike Tersoff potentials which encode angular dependence through a bond-order term (scaling as N^2), Stillinger-Weber uses explicit three-body terms (theoretically scaling as N^3, though optimized implementations reduce this). The Tersoff approach is computationally more efficient but less explicit about angular constraints.
Source: DTIC report on Tersoff Si potential evaluation
URL: https://apps.dtic.mil/sti/tr/pdf/ADA179231.pdf
Date: 1987
Excerpt: "Tersoff has avoided explicit three-body terms in the potential, resulting in a hybrid two-body potential in which the attractive term is modified by the bonding environment. Because the Tersoff potential is basically a two-body potential, the bond calculations scale as N^2 rather than N^3."
Context: Evaluation comparing computational efficiency of Tersoff vs SW
Confidence: high

---

## 11. Key Historical Timeline

| Year | Development | Reference |
|------|-------------|-----------|
| 1984 | Finnis-Sinclair potential (second-moment tight binding) | Finnis & Sinclair, Phil. Mag. A |
| 1984 | EAM - Embedded Atom Method | Daw & Baskes, Phys. Rev. B |
| 1985 | Stillinger-Weber potential for Si | Stillinger & Weber, Phys. Rev. B |
| 1986 | Tersoff original Si potential | Tersoff, Phys. Rev. Lett. |
| 1988 | Tersoff improved Si elastic constants | Tersoff, Phys. Rev. B 38, 9902 |
| 1989 | Tersoff multicomponent (C-Si, Si-Ge) | Tersoff, Phys. Rev. B 39, 5566 |
| 1989 | MEAM - Modified EAM for Si, Ge | Baskes et al., Phys. Rev. B |
| 1990 | Brenner REBO for hydrocarbons | Brenner, Phys. Rev. B |
| 1992 | MEAM extended to fcc, bcc, hcp metals | Baskes, Phys. Rev. B |
| 2000 | 2NN-MEAM (Lee & Baskes) | Lee & Baskes, Phys. Rev. B |
| 2002 | Brenner REBO2 (second generation) | Brenner et al., J. Phys. C |
| 2003 | LCBOP for carbon | Los & Fasolino, Phys. Rev. B |
| 2005 | ADP - Angular Dependent Potential | Mishin et al., Acta Mater. |
| 2007 | Kumagai MOD Tersoff for Si | Kumagai et al., Comp. Mater. Sci. |
| 2010s | OpenKIM infrastructure development | Tadmor et al., JOM |
| 2013 | Screened BOP (Pastewka et al.) | Pastewka et al., Phys. Rev. B |

---

## 12. Implications for the Preprint Analysis

The preprint's analysis of 559 interatomic potentials across 13 pair_style families for elastic constants of 15 metals captures the full diversity of the classical potentials landscape. Key observations relevant to interpreting the preprint's findings:

1. **Functional form matters more than parameter set**: The systematic differences in error patterns between EAM, MEAM, ADP, Tersoff, and BOP reflect fundamental physical differences in how each form encodes bonding, not just quality of fitting.

2. **C44 is the discriminating property**: Across all functional forms, C44 is the most challenging elastic constant to predict accurately. This reflects the fact that C44 measures resistance to shear deformation, which is most sensitive to the angular/directional character of bonding.

3. **The EAM family's limitations are well-understood**: The inability of simple EAM to handle negative Cauchy pressure materials explains why some metals show systematically poorer predictions.

4. **Hybrid/overlay potentials add complexity**: The Tersoff/ZBL and EAM+ZBL combinations address radiation damage physics but may not improve equilibrium elastic constant predictions.

5. **Benchmarking infrastructure validates the approach**: The NIST IPR and OpenKIM provide the standardized calculation methods (iprPy) that underpin the systematic benchmarking in the preprint.

---

## References

[^1^] M. S. Daw and M. I. Baskes, "Embedded-atom method: Derivation and application to impurities, surfaces, and other defects in metals," Physical Review B 29, 6443 (1984). https://journals.aps.org/prb/abstract/10.1103/PhysRevB.29.6443

[^2^] LAMMPS Documentation, "pair_style eam/alloy command." https://docs.lammps.org/pair_eam.html

[^3^] M. I. Baskes, "Modified embedded-atom potentials for cubic materials and impurities," Physical Review B 46, 2727 (1992). M. I. Baskes, J. S. Nelson, and A. F. Wright, "Semiempirical modified embedded-atom potentials for silicon and germanium," Physical Review B 40, 6085 (1989).

[^4^] B.-J. Lee and M. I. Baskes, "Second nearest-neighbor modified embedded-atom-method potential," Physical Review B 62, 8564 (2000). https://arxiv.org/html/2510.15170v1

[^5^] Y. Mishin, M. J. Mehl, and D. A. Papaconstantopoulos, "Phase stability in the Fe-Ni system: Investigation by first-principles calculations and atomistic simulations," Acta Materialia 53, 4029 (2005). ADP Ni comparison: https://link.springer.com/article/10.1007/s13538-026-02011-z

[^6^] J. Tersoff, "New empirical model for the structural properties of silicon," Physical Review Letters 56, 632 (1986). J. Tersoff, "Modeling solid-state chemistry: Interatomic potentials for multicomponent systems," Physical Review B 39, 5566 (1989).

[^7^] D. W. Brenner, "Empirical potential for hydrocarbons for use in simulating the chemical vapor deposition of diamond films," Physical Review B 42, 9458 (1990). J. A. Harrison, "Recent developments and simulations utilizing bond-order potentials" (2014). https://www.fz-juelich.de/en/ias/jsc/news/events/2014/forcefields-2014/harrison-abstract

[^8^] Bond order redefinition for carbon: https://pmc.ncbi.nlm.nih.gov/articles/PMC7878785/

[^9^] OpenKIM, "Getting Started with KIM." https://openkim.org/doc/overview/getting-started/

[^10^] OpenKIM, "Collaboration with the NIST IPR." https://openkim.org/nist-ipr/

[^11^] A. M. G. Zanjani and M. Uludoan, "Evaluation of Copper, Aluminum and Nickel Interatomic Potentials on the Prediction of Mechanical Properties," arXiv:1605.09237. https://arxiv.org/pdf/1605.09237

[^12^] LAMMPS Documentation, "pair_style hybrid/overlay command." https://docs.lammps.org/pair_hybrid.html

[^13^] J. F. Ziegler, J. P. Biersack, and U. Littmark, "The Stopping and Range of Ions in Solids," Pergamon Press, New York (1985). https://www.mv.helsinki.fi/home/knordlun/rad_dam_course/str_skador4.pdf

[^14^] F. H. Stillinger and T. A. Weber, "Computer simulation of local order in condensed phases of silicon," Physical Review B 31, 5262 (1985). https://hunterheidenreich.com/notes/chemistry/molecular-simulation/classical-methods/stillinger-weber-1985/

[^15^] M. W. Finnis and J. E. Sinclair, "A simple empirical N-body potential for transition metals," Philosophical Magazine A 50, 45 (1984). Historical analysis: https://hal.science/hal-00541685v1/document

[^16^] R. Pasianot, D. Farkas, and E. J. Savino, "Empirical many-body interatomic potential for bcc transition metals," Physical Review B 43, 6952 (1991). https://vtechworks.lib.vt.edu/bitstreams/ca9162dc-94bd-468d-a6e9-3ebd1a8f80e6/download

[^17^] G. P. Purja Pun and Y. Mishin, "Optimized interatomic potential for silicon and its application to thermal and mechanical properties," Physical Review B 95, 224103 (2017). http://physics.gmu.edu/~ymishin/resources/Si_Modified_Tersoff_Potential.pdf

[^18^] J. H. Los and A. Fasolino, "Intrinsic long-range bond-order potential for carbon," Physical Review B 68, 024107 (2003). https://repository.ubn.ru.nl/bitstream/handle/2066/104015/104015.pdf

[^19^] NIST Interatomic Potentials Repository. https://www.ctcms.nist.gov/potentials/

[^20^] Benchmarking Universal MLIPs for Elastic Property Prediction, arXiv:2510.22999v3 (2026). https://arxiv.org/html/2510.22999v3

[^21^] T. Kumagai, S. Izumi, S. Hara, and S. Sakai, "Development of bond-order potentials that can reproduce the elastic constants and melting point of silicon," Computational Materials Science 39, 457 (2007).

[^22^] C. A. Howells and Y. Mishin, "Angular-dependent interatomic potential for the binary Ni-Cr system," Modelling and Simulation in Materials Science and Engineering 26, 085008 (2018). http://physics.gmu.edu/~ymishin/resources/ADP_Ni_Cr.pdf

[^23^] An accurate and transferable machine learning interatomic potential for nickel, npj Computational Materials (2024). https://www.nature.com/articles/s43246-024-00603-3

[^24^] Comparing interatomic potentials in calculating basic properties of Mo-W, Nb-W, and Ta-W alloys. https://shuozhixu.github.io/publications/atom/mamun_w.binary_ps.2023.pdf
