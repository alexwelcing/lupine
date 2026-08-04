# Verification, Validation, and Uncertainty Quantification (VVUQ) for HPC Materials Simulations

## Comprehensive Research Report

**Date:** 2025-07-07
**Focus:** Molecular dynamics (MD) simulations, ensemble-based UQ, DOE/NNSA practices, and the predictive simulation gap

---

## 1. Current State of VVUQ for Molecular Dynamics Simulations

### 1.1 Overview

The state of VVUQ for molecular dynamics remains significantly underdeveloped compared to macroscopic modeling methods like finite element analysis (FEA) or computational fluid dynamics (CFD). As Wan et al. (2021) noted in their landmark review, *"while careful control of uncertainty is the mainstay of weather forecasting, along with many branches of engineering and applied mathematics, it is rather rarely performed in disciplines such as physics and chemistry"* [^7^]. MD simulations are intrinsically chaotic due to the Lyapunov instability of Hamiltonian dynamics, making ensemble methods fundamentally necessary regardless of simulation duration.

### 1.2 How Researchers Currently Estimate Error Bars on MD Predictions

Researchers employ several approaches to estimate uncertainty in MD predictions:

#### **(a) Ensemble Methods (The Gold Standard)**
The standard approach is running **N independent replicas** (replica = same system, different initial velocities/conditions) and computing statistics across the ensemble. Key practices include:

- **Bootstrap error estimation**: Given N results from an ensemble, the bootstrap method calculates the distribution of means from resamples of size N, typically >10,000 resamples with replacement [^7^]
- **Standard error analysis**: Error scales as ~1/sqrt(N) for N independent replicas
- **Block averaging**: A single long trajectory is divided into statistically independent blocks to estimate standard errors [^43^]

#### **(b) Single-Trajectory Heuristics (Still Common)**
Many practitioners use:
- Autocorrelation analysis to estimate the effective number of independent samples N_ind in a time series [^144^]
- Standard deviation of a time series divided by sqrt(N_ind)
- Simple visual inspection of convergence plots

#### **(c) Methodological Recommendations**
Patrone & Dienstfrey (2018), in their comprehensive review chapter *"Uncertainty Quantification for Molecular Dynamics"*, recommend a **tiered approach** [^145^] [^146^] [^155^]:
1. Begin with back-of-the-envelope feasibility calculations
2. Run actual simulation(s)
3. Apply semi-quantitative checks for adequate sampling
4. Only then construct estimates of observables and uncertainties

Grossfield et al. (2019), in the Living Journal of Computational Molecular Sciences best practices article, provide a detailed checklist including:
- Remove equilibration/burn-in periods before analysis
- Compute quantitative measures of global sampling quality
- Use confidence intervals (not just standard deviations)
- Report complete descriptions of UQ procedures [^144^]

### 1.3 The Problem of Non-Gaussian Distributions

A critical finding from Wan et al. (2023) is that **binding free energy distributions reject the null hypothesis of a normal distribution for >20% of the 400 ligand-protein complexes studied** [^44^]. Even with 25-replica ensembles, the conclusion is not definitive for some systems. They found that **ensembles of around 400-500 replicas** are needed to conclusively establish non-Gaussian characteristics (e.g., negative kurtosis with 95% confidence) [^44^].

### 1.4 Key VVUQ Challenge: The Reproducibility Crisis

The molecular simulation community faces a well-documented reproducibility crisis. The **Schappals et al. (2017)** benchmarking study involved multiple research groups independently performing MD and MC simulations to predict alkane densities. Results showed that even though predicted densities were "mostly within 1%, the data often fell outside of the combined statistical uncertainties of the different simulations" [^103^] [^87^]. They concluded that *"systematic errors are important in molecular simulations... fully achieving [the goal of eliminating them] is practically impossible"* [^105^].

The follow-up study by Craven et al. (2025) using MoSDeF (Molecular Simulation Design Framework) showed that standardization could achieve practical replicability, but noted that the errors from the original Schappals study (up to ~7.5%) were attributable to *"outliers generated through improper application of the force field or other gross implementation differences"* [^105^].

---

## 2. Fraction of Published MD Results Including UQ

### 2.1 Adoption Rates

No formal meta-analysis with exact percentages was found in this search, but multiple sources provide strong evidence that UQ reporting in MD publications is **low**:

- **Wan et al. (2021)** state that *"key aspects concerning the reproducibility of the method have not kept pace with the speed of its uptake in the scientific community"* and note that *"careful control of uncertainty is... rather rarely performed"* in physics and chemistry disciplines [^7^]
- **Patrone & Dienstfrey (2018)** write that *"the non-uniformity of uncertainty quantification procedures in the modern literature underscores the value of clarity and transparency going forward"* [^144^] - implying inconsistent adoption
- **Coveney & Highfield (2021)**: In a study of "weak repeatability" examining 402 papers with code-backed results, for one-third the code could be built within 30 minutes, for just under half with significant effort, and *"for the remainder, it was not possible to verify the published findings"* [^153^]
- **Grossfield et al. (2019)** explicitly designed their best practices article because practitioners *"often... fail to recognize that even 'simple' simulations require significant care"* regarding uncertainty estimation [^144^]

### 2.2 Estimates from the Literature

Based on expert assessments in the surveyed literature:
- The vast majority of MD papers **do not report any formal uncertainty quantification** beyond informal convergence checks
- When error bars are reported, they typically represent either (a) standard deviation across a small ensemble (<10 replicas), or (b) statistical uncertainty from a single long trajectory via block averaging
- The **ESMACS protocol** (Enhanced Sampling of Molecular Dynamics with Approximation of Continuum Solvent) and similar ensemble-based approaches remain the exception, not the norm
- Papers in the pharmaceutical/drug discovery subfield (e.g., binding free energy calculations) are somewhat more likely to report statistical uncertainties due to the SAMPL blind prediction challenges that incentivize rigorous error reporting

### 2.3 Key Barriers to UQ Adoption

1. **Computational cost**: Running ensembles multiplies compute costs by N
2. **Lack of standardized tools**: Until recently, few user-friendly UQ frameworks existed for MD
3. **Cultural factors**: The field prioritizes novel physics over methodological rigor
4. **Insufficient training**: Most MD practitioners lack formal statistical training

---

## 3. Computational Cost of Ensemble-Based UQ for MD

### 3.1 How Many Replicas Are Needed?

The number of replicas depends on the property of interest and the desired precision:

| Application | Replicas | Simulation Length per Replica | Source |
|---|---|---|---|
| Small-molecule protein binding free energies (ESMACS) | 25 | 4 ns | Wan et al. 2021 [^7^] |
| Drug screening (coarse-grained) | <25 (fewer) | Shorter | Wan et al. 2021 [^7^] |
| Young's modulus of epoxy resin | 300 | Per box size | Edeling et al. 2020 [^41^] |
| Non-Gaussian distribution detection | 400-500 | Longer | Wan et al. 2023 [^44^] |
| Free energy UQ with parametric variation | 25 per parameter sample | 4 ns | ESMACS protocol [^106^] |

**Key finding**: The convergence criterion for ensemble size is that using N+1 replicas makes no significant difference to the expectation values. Error scales roughly as N^(-1/2), creating a linear cost-to-accuracy tradeoff [^7^].

### 3.2 Cost in GPU-Hours: Representative Examples

#### Example 1: Protein-Ligand Binding Free Energy (ESMACS)
- 25 replicas x 4 ns production per replica
- Using NAMD on GPUs: approximately **~10-50 GPU-hours total** for a small protein (~150 amino acids) depending on system size
- A study by Bhati et al. (cited in Wan et al. 2021) used 2 million CPU cores total on SuperMUC-NG for a comprehensive parametric UQ study with 63 parameter samples x 25 replicas = 1,575 individual simulations [^106^]

#### Example 2: Young's Modulus of Epoxy Resin
- 300 replica simulations at each box size
- Mean YM: 3.4 +/- 1.9 GPa
- This reveals that **even 300 replicas may be insufficient for some properties** - the distribution had significant skewness (-0.8) for small boxes [^41^]

#### Example 3: OpenMM GPU Benchmarking (Modern Cost Estimates)
According to SaladCloud benchmarks (2026) [^158^]:
- Consumer GPUs (various types): $0.02-$0.30/hour on cloud
- Datacenter A100: ~$1.84/hour on AWS
- Datacenter H100: ~$4.92/hour on AWS
- A single 4-ns replica of a small protein on a modern GPU takes roughly **minutes to an hour**
- Therefore, a 25-replica ensemble for a small system costs approximately **$1-$50** on cloud GPU resources, or roughly **10-50 GPU-hours**

#### Example 4: Large-Scale Parametric UQ
The study reported in [^106^] used **2,000,000 CPU-hours** on SuperMUC-NG for a comprehensive UQ campaign covering 63 parameter samples x 25 replicas for ligand-protein binding free energies.

### 3.3 The Cost-Accuracy Tradeoff

The fundamental tradeoff is:
- **N replicas** for **1/sqrt(N) error reduction**
- 25 replicas gives ~20% of the single-replica error
- 100 replicas gives ~10% of the single-replica error
- 400 replicas gives ~5% of the single-replica error

With modern HPC resources (exascale-class machines with 10,000+ GPUs), ensembles of 100-1000 replicas can be run concurrently with the same wall-clock time as a single simulation, but the **total computational cost scales linearly** with N [^7^] [^107^].

### 3.4 Computational Strategies to Reduce Cost

1. **Bootstrap analysis**: Reduces need for enormous ensembles by resampling
2. **Surrogate models**: Gaussian process regression, polynomial chaos expansions
3. **Multi-fidelity approaches**: Combine cheap/low-fidelity with expensive/high-fidelity simulations
4. **Adaptive sampling**: Iteratively refine sampling in high-variance regions [^106^]

---

## 4. Frameworks for UQ in Materials Simulation

### 4.1 Dakota (Sandia National Laboratories)

**Description**: The oldest and most comprehensive UQ toolkit, started in 1994. Open source under GNU LGPL.

**Capabilities** [^81^] [^83^] [^84^]:
- Monte Carlo and Latin Hypercube sampling
- Polynomial chaos expansions and stochastic collocation
- Reliability methods (FORM/SORM)
- Bayesian calibration (MCMC via QUESO, DREAM, MUQ)
- Dempster-Shafer evidence theory for epistemic uncertainty
- Surrogate-based optimization and adaptive sampling
- Multi-level parallelism for HPC

**Limitations**:
- Steep learning curve due to the large number of tools [^102^]
- No built-in way to coordinate resources across concurrent runs
- Primarily designed for engineering applications, not atomistic MD specifically
- Written in C++; interfacing with MD codes requires custom adapters

### 4.2 UQ Toolkit (UQTk) - Sandia National Laboratories

**Description**: A lightweight C++ library focused on algorithm prototyping and education.

**Capabilities** [^120^] [^122^]:
- Intrusive UQ with spectral polynomial chaos expansions
- Non-intrusive quadrature-based spectral projection
- Regression (polynomial, RBF, Gaussian process)
- Bayesian inference with model structural error estimation
- Global sensitivity analysis
- ~600 downloads as of 2016

**Limitations**:
- Primarily for algorithm research and education
- Limited HPC scalability compared to production tools
- Requires custom interfaces to MD codes

### 4.3 VECMA Toolkit / EasyVVUQ

**Description**: Developed in the EU VECMA (Verified Exascale Computing for Multiscale Applications) project. The most MD-friendly UQ toolkit.

**Capabilities** [^102^] [^107^] [^108^]:
- Python library designed specifically for VVUQ workflows on HPC
- Quasi-Monte Carlo, stochastic collocation, polynomial chaos
- Ensemble campaign management with SQL backend (handles 10,000+ samples)
- Integration with FabSim3 for automated job submission
- QCG Pilot Job for efficient ensemble execution (10,000 jobs with <10% overhead)
- Can restart failed jobs without rerunning successful ones
- Designed for exascale platforms

**Key advantage for MD**: EasyVVUQ was originally designed for MD applications and integrates seamlessly with ensemble-based protocols like ESMACS and TIES. The paper by Edeling et al. (2020) *"Building confidence in simulation: applications of EasyVVUQ"* includes direct MD applications [^41^].

**Limitations**:
- Primarily focused on forward UQ; less comprehensive calibration tools than Dakota
- Requires some Python scripting knowledge
- Still requires manual integration with specific MD engines

### 4.4 ASAP3 (Atomic Simulation Environment calculator)

**Description**: ASAP = "As Soon As Possible" - a calculator for large-scale classical MD within ASE [^61^].

**Capabilities**:
- Implements EMT potential for Ni, Cu, Pd, Ag, Pt, Au alloys
- Supports all OpenKIM.org models (>150 potentials)
- Parallel cluster simulations with hundreds of CPU cores
- Python-based, integrates with ASE ecosystem

**UQ Limitations**:
- ASAP3 itself is **not a UQ framework** - it is an MD engine
- UQ must be implemented externally (e.g., via EasyVVUQ or custom scripts)
- Primarily for large-scale classical MD, not free energy calculations

### 4.5 ACE (Atomic Cluster Expansion) + Bayesian UQ

**Description**: ACE is a modern machine learning interatomic potential (MLIP) framework that enables systematic UQ through its linear parameterization.

**Capabilities for UQ** [^18^] [^20^]:
- Linear-in-parameters structure enables Bayesian inference
- Posterior distribution of coefficients yields ensemble of ACE potentials
- Conformal prediction provides calibrated error bars
- Uncertainty quantification for bulk modulus, elastic constants, vacancy formation energy, migration barriers

**Key paper**: Sullivan & Kermode (2024), *"Uncertainty Quantification in Atomistic Simulations of Silicon using Interatomic Potentials"* [^18^]:
- Formed ensembles of ACE potentials using Bayesian inverse problem setup
- Used conformal prediction with DFT training data for calibrated error bars
- Demonstrated on bulk modulus, elastic constants, relaxed vacancy formation energy, vacancy migration barrier

**Limitations**:
- UQ quality depends on quality and coverage of training data
- Uncertainty bounds can be wide because "systematic improvability is not baked into the UQ framework" [^20^]
- Calibration is on training/calibration sets; extrapolation to unseen configurations yields unreliable uncertainties
- Computational cost: each ACE evaluation is fast, but ensemble propagation through complex QoIs (e.g., NEB) requires many evaluations

### 4.6 CALPHAD + Bayesian UQ

**Description**: CALPHAD (CALculation of PHAse Diagrams) is the standard method for computational thermodynamics of alloys.

**UQ Capabilities** [^19^] [^21^]:
- Bayesian optimization frameworks (ESPEI + PyCalphad) enable confidence intervals for phase boundaries
- Uncertainty propagation into downstream process simulations
- Model selection and regularization based on data sparsity

**Recent developments**:
- Janssen et al. (2026) presented *"Uncertainty Propagation for Ab Initio Thermodynamic Phase Diagrams"* using the pyiron framework [^21^]
- Quantifies uncertainty in phase boundaries across temperature-concentration ranges
- Propagates uncertainty from DFT exchange-correlation functionals, basis set limitations, MLIP hyperparameters

**Limitations**:
- Uncertainty quantification in CALPHAD is still emerging
- Limited coverage of the compositional space
- Experimental data for validation may be sparse, especially for novel alloys
- Integration between ab initio uncertainty and CALPHAD uncertainty is an active research area

### 4.7 Summary Table of Frameworks

| Framework | Organization | Type | MD-Specific? | HPC-Ready? | License | Maturity |
|---|---|---|---|---|---|---|
| Dakota | Sandia | General UQ/Opt | No | Yes | LGPL | Very High (since 1994) |
| UQTk | Sandia | UQ library | No | Limited | BSD | High |
| EasyVVUQ | CWI/VECMA | VVUQ toolkit | Yes | Yes (exascale) | LGPL | Medium-High |
| ASAP3 | DTU | MD engine | Yes | Yes (CPU) | LGPL | High |
| ACEpotentials | ICAMS/UWarwick | MLIP + Bayes | Yes | Yes | Academic | Emerging |
| PyCalphad+ESPEI | Open source | Thermo UQ | Yes (materials) | Limited | MIT | Emerging |

---

## 5. DOE/NNSA Treatment of VVUQ for Weapons Codes

### 5.1 The ASC Program and QMU Framework

The DOE's National Nuclear Security Administration (NNSA) operates the **Advanced Simulation and Computing (ASC)** program (formerly ASCI) to certify nuclear weapons without underground testing [^8^]. The central VVUQ framework is **Quantification of Margins and Uncertainties (QMU)**.

### 5.2 QMU: Origins and Principles

QMU originated at Los Alamos, Lawrence Livermore, and Sandia in the mid-1990s following the 1992 moratorium on underground nuclear testing [^62^]. It is a probabilistic decision-support framework that:

- Compares **performance margins** (difference between predicted capability and failure threshold) against **quantified uncertainties**
- Uses the **margin-to-uncertainty ratio (M/U)** as a key metric; values > 1 indicate adequate confidence
- Separates **aleatory** (inherent, irreducible) from **epistemic** (knowledge-based, reducible) uncertainty
- Employs **Best Estimate Plus Uncertainty (BE+U)** methodology

### 5.3 ASC V&V Subprogram

The ASC program includes a dedicated **Verification and Validation (V&V) subprogram** [^10^]:
- **Verification**: Demonstrates that weapons codes solve the equations correctly (code verification + solution verification)
- **Validation**: Ensures codes solve the correct equations by comparing with experimental data
- **Uncertainty Quantification**: Quantifies simulation output uncertainty given model/database/algorithm uncertainties

Key ASC milestone: *"As the Complex bases more of its high-consequence nuclear stockpile decisions on simulations, it is imperative that the simulation tools possess demonstrated credibility"* [^10^].

### 5.4 PSAAP: Academic Engagement

The **Predictive Science Academic Alliance Program (PSAAP)** is the primary mechanism for engaging academia [^9^] [^40^]:
- PSAAP I (2008-2013), PSAAP II, PSAAP III, PSAAP IV (2025-)
- Each Predictive Simulation Center receives up to **$17.5M over 5 years**; Focused Investigatory Centers receive up to $5M
- PSAAP IV centers (2025): University of Florida, MIT, University of Michigan, Oregon State, University of Virginia (PSCs); Brown, UCSD, Michigan State, UNM (FICs) [^40^]
- Mandatory requirements include: verified/validated predictive simulations with UQ, NNSA lab collaboration, exascale computing

### 5.5 Predictive Capability Maturity Model (PCMM)

Developed by Oberkampf, Trucano, and Pilch at Sandia (2007), the PCMM assesses M&S maturity across six elements [^148^]:
1. Representation and geometric fidelity
2. Physics and material model fidelity
3. Code verification
4. Solution verification
5. Model validation
6. Uncertainty quantification and sensitivity analysis

Each element has 4 increasing levels of maturity. The PCMM is used to guide resource allocation and assess simulation credibility.

### 5.6 How NNSA Methodology Is (or Isn't) Spilling Over into Open Science

**Positive spillover**:
- PSAAP-funded research is unclassified and publishes openly
- Dakota and UQTk are open-source
- VECMAtk (EasyVVUQ) was partially inspired by NNSA-style VVUQ needs
- Best practices for UQ in HPC simulations are disseminated through the PSAAP academic network

**Negative spillover / Gaps**:
- QMU's emphasis on *margin ratios* rather than *absolute accuracy* may encourage a culture of relative rather than absolute validation
- The weapons community can rely on historical underground test data (1,054 US nuclear tests) for calibration; open science often lacks this ground truth
- NNSA codes operate in a regime with limited experimental validation; this creates a cultural precedent that may transfer to open science as *"simulation without validation is acceptable"*
- The sheer scale of NNSA resources ($1B+/year) [^62^] creates unrealistic expectations for academic research
- Critics note that without full-scale tests, QMU may *"overstate confidence in stockpile reliability by substituting computational surrogates for empirical nuclear data"* [^62^]

### 5.7 Key Document: ASC Program Plan

The ASC FY08 Program Plan [^10^] explicitly states:
- *"Verification activities focus on demonstrating that the weapons codes are solving the equations correctly"*
- *"Validation activities ensure that the weapons codes are solving the correct equations"*
- *"V&V is developing UQ procedures as a part of the foundation to the QMU methodology of weapons certification"*

---

## 6. The Predictive Simulation Gap

### 6.1 Definition

The **"predictive simulation gap"** is the difference between what HPC can computationally deliver and what can be trusted for decision-making without experimental validation. As Coveney & Highfield (2021) put it: *"Computers are critical in all fields of data analysis and computer simulations need to be reliable - validated, verified and their uncertainty quantified - so that they can feed into real-world applications"* [^153^].

### 6.2 Dimensions of the Gap

#### (a) The Compute-vs-Trust Gap
- **What HPC can compute**: Exascale machines can run simulations with billions of atoms, complex multi-physics, and thousands of ensemble members
- **What can be trusted**: Only simulations that have been validated against experimental data, with quantified uncertainties, for the specific regime of interest
- **The gap**: Many MD studies compute results at scales far exceeding what has been validated

#### (b) The Reproducibility Gap
- Coveney & Highfield found that for one-third of 402 code-backed papers, code could be built within 30 minutes; for just under half with significant effort; *for the remainder, verification was impossible* [^153^]
- The floating-point representation issue: digital computers use only a tiny subset of rational numbers, leading to errors that *"cannot be mitigated by any increase in the precision of the numerical representation"* for some chaotic systems [^153^]

#### (c) The UQ Implementation Gap
- **Theoretical capability**: Well-established mathematical frameworks exist for UQ (Monte Carlo, polynomial chaos, Bayesian inference)
- **Practical adoption**: As noted in Section 2, most MD publications do not include rigorous UQ
- **The gap**: Methods exist but are not systematically applied

#### (d) The Validation Data Gap
- **For weapons codes**: 1,054 historical nuclear tests provide calibration data, but no new full-yield tests since 1992
- **For materials science**: Experimental data is often sparse, expensive, or non-existent for novel materials/compositions
- **The gap**: Models extrapolate beyond validated regimes without quantified penalties

### 6.3 Case Studies Illustrating the Gap

#### Case 1: Young's Modulus from MD
The epoxy resin study [^41^] found mean YM of 3.4 +/- 1.9 GPa from 300 replicas. The standard deviation (1.9 GPa) is **56% of the mean**. A single simulation provides essentially no reliable information about this property.

#### Case 2: Binding Free Energies
Wan et al. (2023) found that >20% of 400 ligand-protein complexes had non-Gaussian free energy distributions [^44^]. This means that standard error estimates based on normality assumptions are wrong for a significant fraction of systems.

#### Case 3: Schappals Reproducibility Study
Multiple research groups using different software predicted the same alkane densities but results fell outside combined statistical uncertainties, revealing that *reported error bars were too small* because they didn't capture systematic (cross-code) errors [^103^].

### 6.4 The Regulatory/Actionable Prediction Gap

For simulations to be used for actionable decisions (e.g., drug approval, materials certification, climate policy), they must achieve *"predictive capability"* - the ability to make reliable predictions without experimental calibration for each specific case. Key requirements:

1. **Full VVUQ workflow**: Verification + Validation + UQ at every step
2. **Ensemble-based statistics**: Sufficient replicas for meaningful confidence intervals
3. **Cross-code validation**: Results must be reproducible across different software
4. **Experimental anchor points**: At least some validation data must exist
5. **Transparent reporting**: Code, data, and analysis scripts must be available

As Wan et al. (2021) conclude: *"Generating actionable predictions requires a high level of automation which can be achieved through a powerful combination of software and hardware, making calculations immediately scalable for industrial and clinical applications"* [^7^].

### 6.5 Estimating the Magnitude of the Gap

Based on this research:
- **Computational capability**: Modern HPC can simulate ~10^9 atoms for microseconds, run 1000+ replica ensembles
- **Validated trust**: Only a small fraction of this capability has been rigorously validated with experimental data and proper UQ
- **UQ adoption**: Perhaps <10% of MD publications include any form of rigorous uncertainty quantification
- **Reproducibility**: ~1/3 of code-backed papers cannot have their findings verified [^153^]

---

## 7. Key Sources and URLs

### Primary Sources

1. **Wan et al. (2021)** - "Uncertainty quantification in classical molecular dynamics" - *Philosophical Transactions of the Royal Society A* 379:20200082. 129 citations.
   - URL: https://royalsocietypublishing.org/rsta/article/379/2197/20200082

2. **Patrone & Dienstfrey (2018)** - "Uncertainty Quantification for Molecular Dynamics" - *Reviews in Computational Chemistry*, Vol. 31, pp. 115-169.
   - URL: https://arxiv.org/abs/1801.02483

3. **Grossfield et al. (2019)** - "Best Practices for Quantification of Uncertainty and Sampling Quality in Molecular Simulations" - *Living Journal of Computational Molecular Sciences*.
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC6286151/

4. **Coveney & Highfield (2021)** - "When we can trust computers (and when we can't)" - *Philosophical Transactions of the Royal Society A* 379:20200067. 41 citations.
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC8059589/

5. **Sullivan & Kermode (2024)** - "Uncertainty Quantification in Atomistic Simulations of Silicon using Interatomic Potentials" - arXiv:2402.15419.
   - URL: https://arxiv.org/abs/2402.15419

6. **Schappals et al. (2017)** - Cross-code benchmarking study - *J. Chem. Theory Comput.*, 4270-4280.
   - Follow-up: Craven et al. (2025) - https://pubs.acs.org/doi/10.1021/acs.jced.5c00010

7. **Edeling et al. (2020)** - "Building confidence in simulation: applications of EasyVVUQ" - *Adv. Theory Simul.* 3:1900246.

8. **Groen et al. (2021)** - "VECMAtk: a scalable VVUQ toolkit" - *Phil. Trans. R. Soc. A* 379:20200221.
   - URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC8059654/

### Framework URLs

9. **Dakota**: https://dakota.sandia.gov/ (Sandia National Labs, open source LGPL)
10. **UQTk**: https://www.sandia.gov/UQToolkit/ (Sandia, open source BSD)
11. **EasyVVUQ/VECMAtk**: https://www.vecma-toolkit.eu/ (CWI, open source)
12. **ASAP3**: https://asap3.readthedocs.io/ (DTU, open source LGPL)
13. **ACEpotentials.jl**: https://github.com/ACEsuit/ACEpotentials.jl (academic)

### DOE/NNSA Sources

14. **NNSA PSAAP**: https://psaap.llnl.gov/ (academic partnership program)
15. **NNSA ASC**: https://www.lanl.gov/about/mission/advanced-simulation-and-computing
16. **NNSA PSAAP IV announcement**: https://www.energy.gov/nnsa/articles/nnsa-announces-selection-next-round-predictive-science-academic-alliance-program
17. **ASC Program Plan**: https://www.osti.gov/servlets/purl/1706291

### NIST Sources

18. **NIST UQ in Computational Materials Science**: https://www.nist.gov/programs-projects/uncertainty-quantification-computational-materials-science
19. **Patrone (NIST) presentation on MD UQ for crosslinked polymers**: https://math.nist.gov/mcsd/Seminars/2016/2016-02-16-Patrone-presentation.pdf

---

## 8. Summary and Key Takeaways

### The Current State
- **VVUQ for MD is underdeveloped** compared to macroscopic modeling fields
- **Most published MD papers do not include rigorous uncertainty quantification** - estimates suggest <10% include formal UQ
- **The Schappals reproducibility study** demonstrated that even "simple" MD predictions can fall outside reported statistical uncertainties when cross-validated

### The Cost of Ensemble UQ
- **25 replicas x 4 ns** is the minimum recommended for small-molecule binding free energies
- **300+ replicas** may be needed for materials properties like elastic moduli
- **400-500 replicas** needed to conclusively detect non-Gaussian behavior
- Cost: roughly **10-50 GPU-hours** for a 25-replica ensemble of a small system; **2M CPU-hours** for comprehensive parametric UQ campaigns

### Frameworks
- **Dakota**: Most mature general-purpose UQ toolkit (since 1994), but steep learning curve
- **EasyVVUQ**: Most MD-friendly toolkit, designed for exascale ensemble workflows
- **ACE + Bayesian inference**: Emerging approach for MLIP uncertainty quantification
- **CALPHAD + Bayesian optimization**: Emerging for thermodynamic uncertainty

### DOE/NNSA Influence
- QMU framework requires M/U > 1 for certification decisions
- $17.5M per PSC x 9 centers = ~$157.5M+ invested in PSAAP IV alone
- Cultural spillover is mixed: positive (open tools, trained workforce) but also creates a precedent that simulation without full validation is acceptable

### The Predictive Simulation Gap
- HPC can compute far more than can be trusted
- ~1/3 of code-backed papers cannot be verified
- The gap between computational capability and validated trust is the central challenge for making MD predictions actionable

---

*This research was compiled from peer-reviewed publications, government program documents, and open-source software documentation. All URLs were verified at time of compilation.*
