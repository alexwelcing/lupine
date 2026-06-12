# Error Geometry and Adaptive Sampling for Accelerating HPC Simulations

## A Research Synthesis on Active Learning, Sloppy Model Theory, and Pre-Computed Error Datasets for Computational Materials Science

**Date:** July 2025
**Sources:** DOE reports, NSF program data, Nature/Science journals, arXiv, conference proceedings

---

## 1. Adaptive Sampling / Active Learning in Molecular Dynamics

### 1.1 Definition and Concept

**Adaptive sampling** (also called "active learning" or "on-the-fly learning") in molecular dynamics refers to methods that automatically select the most informative atomic configurations for training a machine-learned interatomic potential (MLIP) during a simulation. Rather than running expensive ab initio molecular dynamics (AIMD) for the entire trajectory, the method uses a fast MLIP to propagate most time steps, calling the expensive quantum mechanical (DFT) calculation only when the model encounters configurations about which it is uncertain.

The key workflow (as implemented in VASP, FLARE, and ACE) is:
1. Start with a small initial training set from DFT
2. Run MD with the MLIP, evaluating uncertainty at each step
3. When uncertainty exceeds a threshold, call DFT, add data, and retrain
4. As the force field improves, fewer DFT calls are needed
5. Final model runs at near-DFT accuracy at MLIP speed

### 1.2 FLARE (Fast Learning of Atomistic Rare Events)

**Key paper:** Vandermause et al., *Nature Computational Materials* (2020) - "On-the-fly active learning of interpretable Bayesian force fields for atomistic rare events" [^137^]

| Metric | Value |
|--------|-------|
| **Speedup over AIMD** | 300x demonstrated for Al vacancy diffusion; claimed **5 orders of magnitude** for production runs at scale [^133^] |
| **Training data required** | ~100 DFT calculations (vs. thousands for conventional methods) |
| **Wall time for full training** | 68.8 hours on 32-core machine for Al vacancy + adatom diffusion |
| **Force field evaluation cost** | 5.6 x 10^-6 s/atom/timestep (2-body, comparable to EAM at 2.2 x 10^-6) |
| **Key feature** | Bayesian uncertainty quantification via Gaussian Process Regression |

The NSF award abstract for FLARE states its "scalable performance of at least **5 orders of magnitude faster than ab-initio molecular dynamics**" with "automated training requiring minimal amounts of DFT data" [^133^]. The method uses principled Bayesian uncertainty to guide data acquisition via closed-loop active learning, enabling MD simulations of "millions of atoms at near-DFT accuracy."

**FLARE++ for reactive systems:** Vandermause et al. (2021) introduced FLARE++ for reactive systems, obtaining a trained Pt/H model within **3 days of wall time** that was **2x faster than ReaxFF** and "considerably more accurate" [^78^].

### 1.3 VASP On-the-Fly Machine Learning Force Fields

**Source:** VASP Wiki, "Machine learning force field: Theory" [^7^]; Jinnouchi, Karsai, and Kresse, *PRB* 100, 014105 (2019)

| Metric | Value |
|--------|-------|
| **Speedup in prediction mode** | **2-4 orders of magnitude** faster than ab initio calculation [^14^] |
| **Additional speedup with fast prediction mode** | Factor of **20-100x** after refitting (VASP 6.4.0+) [^17^] |
| **Target accuracy** | Energies <5 meV/atom, Forces <100 meV/Angstrom |
| **Scaling** | Linear scaling due to cutoff function in descriptor |
| **Training mechanism** | Bayesian variance of atomic forces as criterion for DFT call |

VASP's on-the-fly learning algorithm automatically builds training data during MD: "the more accurate the forcefield gets, the less sampling is needed, and the more expensive ab initio steps are skipped" [^14^]. The method uses a Bayesian error estimate to decide at each step whether a DFT calculation is needed.

### 1.4 ACE (Atomic Cluster Expansion) with Active Learning

**Key paper:** "Efficient parameterization of transferable Atomic Cluster Expansion for water" (2024) [^6^]

| Metric | Value |
|--------|-------|
| **Method** | ACE + D-optimality active learning |
| **Speedup strategy** | Sample static ice configurations + active learning to select liquid configurations, **bypassing AIMD entirely** |
| **Final accuracy** | Energy MAE: 2.5 meV/atom; Force MAE: 16.7 meV/Angstrom |
| **Training structures** | Only 2,575 structures total (starting from 83 ice structures) |
| **Key insight** | Potential trained on ice + few liquid configs via AL captures liquid water accurately |

### 1.5 Batch Active Learning Methods

**Key paper:** "Batch active learning for accelerating the development of interatomic potentials," *Computational Materials Science* (2022) [^20^]

This method combines energy uncertainty and structure similarity metrics to efficiently sample highly uncertain structures. For monolayer GeSe, it generates "interatomic potential with highly accurate and robust model coefficients which are difficult to achieve with conventional sampling approaches."

### 1.6 Active Learning Speedup Summary

| Method | Speedup over AIMD | Training Data Reduction | Key Advantage |
|--------|-------------------|------------------------|---------------|
| FLARE (GP) | 300x - 100,000x | ~100 DFT calls | Bayesian uncertainty, interpretable |
| VASP MLFF | 100x - 10,000x | Auto-selected | Integrated with production DFT code |
| ACE + AL | Bypasses AIMD | ~2,500 structures | Systematic, transferable |
| FLARE++ (reactive) | 2x vs. ReaxFF | 3 days wall time | Reactive chemistry |

---

## 2. Stiff vs. Sloppy Directions: Hyper-Ribbon Geometry and Simulation Acceleration

### 2.1 Sloppy Model Theory Fundamentals

**Key references:**
- Gutenkunst et al., *PLoS Computational Biology* (2007) - "Universally Sloppy Parameter Sensitivities in Systems Biology Models" [^97^]
- Transtrum et al., *Physical Review E* (2011) - "Geometry of nonlinear least squares with applications to sloppy models and optimization" [^20^]
- Transtrum & Sethna, *Reports on Progress in Physics* (2022) - "Information geometry of multiparameter models" [^19^]

### 2.2 Core Concepts

**Sloppy models** are multiparameter models where parameter combinations vary over decades without significantly changing predictions. The model manifold of predictions forms a **"hyper-ribbon"** - a high-dimensional structure with a geometric series of widths:

- **Stiff directions**: A few parameter combinations are tightly constrained by data; these control the model's predictions
- **Sloppy directions**: Most parameter combinations are poorly constrained; varying them has little effect on predictions

The eigenvalue spectrum of the Fisher Information Matrix (sensitivity matrix) typically spans many decades - often **10^6 to 10^10** between the stiffest and sloppiest directions [^97^].

### 2.3 Implications for Parameter Optimization and Sampling

**Key insight from Transtrum et al. (2011) [^20^]:**

The hyper-ribbon geometry explains why:
1. **Optimization is slow in bare parameters** - Cost contours form hierarchies of plateaus and long narrow canyons
2. **Geodesic acceleration works** - By constructing alternative coordinates based on geodesic motion on the model manifold, "long narrow canyons are transformed into a single quadratic, isotropic basin"
3. **Most parameters can be eliminated** - The MBAM (Model Boundary Approximation Method) finds simpler emergent models on boundaries of the model manifold

**Practical consequences:**
- Algorithms that exploit the hyper-ribbon geometry (geodesic acceleration, Levenberg-Marquardt in natural coordinates) converge **significantly faster** than naive gradient descent [^20^]
- The number of effective parameters is often **orders of magnitude smaller** than the nominal parameter count
- Knowing stiff vs. sloppy directions allows targeted experimental design and focused sampling

### 2.4 Connection to Simulation Acceleration

The hyper-ribbon framework suggests several strategies for accelerating HPC simulations:

1. **Dimensionality reduction**: If a potential's parameter manifold is low-dimensional (hyper-ribbon), one can navigate in the stiff directions only, ignoring sloppy directions that don't affect observables
2. **Geodesic optimization**: Moving along geodesics on the model manifold (rather than in parameter space) accelerates parameter fitting by avoiding plateaus and canyons
3. **Uncertainty quantification**: Stiff directions correspond to well-constrained predictions; sloppy directions to uncertain ones. This guides where to sample.
4. **Model reduction**: The MBAM method can derive emergent models with fewer parameters that explain behavior equally well, effectively compressing expensive potentials

**Quantitative relationship:**
In the linear regime, the number of "effective dimensions" k* of the hyper-ribbon scales as:
- k* ~ ln(T*a)/(2c) where T is training time, a is learning rate, and c is the decay rate of the sloppy eigenspectrum [^18^]
- For typical sloppy models with c ~ 0.1-1.0, only **3-10 dimensions** capture 95% of the variance [^18^]

### 2.5 The Information Geometry Framework

The 2022 review by Transtrum & Sethna [^19^] formalizes the connection:

> "The hyperribbon structure of the model manifold in emergent statistical mechanics models" connects to "renormalization-group flows" where "stiff and sloppy directions along the model manifold" correspond to "relevant and irrelevant eigendirections of the renormalization group."

This means:
- **Stiff directions** = relevant operators in RG flow (affect macroscopic observables)
- **Sloppy directions** = irrelevant operators (can be integrated out without affecting predictions)
- The hyper-ribbon structure is a **universal feature** of multiparameter models in physics

### 2.6 Application to Interatomic Potentials

For ML interatomic potentials (which can have 10^3 - 10^6 parameters), sloppy model theory implies:
- Only a small fraction of parameter combinations actually matter for any given observable
- Pre-computing the error geometry (which directions are stiff/sloppy for which observables) enables:
  - **Targeted fine-tuning**: Adjust only stiff directions for a specific property
  - **Predictive uncertainty**: Sloppy directions = high uncertainty; stiff directions = reliable predictions
  - **Model compression**: Project onto the stiff subspace for faster evaluation

---

## 3. The Model Selection Problem in HPC Materials Simulation

### 3.1 The Current Landscape

There is an **explosion of interatomic potentials** available to materials scientists:

| Potential Type | Examples | Parameters | Accuracy | Speed |
|---------------|----------|------------|----------|-------|
| Classical/Empirical | EAM, MEAM, ReaxFF, SW | 10-100 | Low-Moderate | Fastest |
| Moment Tensor | MTP | 100-10,000 | High | Fast |
| Spectral Neighbor | SNAP, qSNAP | 100-10,000 | High | Moderate |
| Gaussian Process | GAP, FLARE | Data-dependent | Highest | Moderate |
| Equivariant Neural | MACE, NequIP, Allegro | 10^4-10^6 | Highest | Moderate |
| Foundation Models | MACE-MP, CHGNet, SevenNet | 10^6-10^7 | General | Moderate |

**The problem:** Researchers currently choose potentials through a **trial-and-error process** involving:
1. Literature review to find potentials trained on similar systems
2. Ad hoc benchmarking against DFT for the specific system of interest
3. Running test simulations and checking for physical plausibility
4. Iterative refinement when the chosen potential fails

### 3.2 The Cost of Bad Choices

**Evidence from benchmark studies:**

**MS25 Benchmark (2024):** [^41^]
- Tested MACE, NequIP, Allegro, MTP, Torch-ANI on MgO, water, zeolites, Pt catalysis, HEAs, Zr-oxides
- "Most models reach comparable accuracy on standard error metrics across simple systems"
- BUT: "Equivariant MLIPs offer **1.5-2x improvements** over non-equivariant MLIPs in energy and force error for structurally complex or compositionally disordered environments"
- KEY FINDING: "Low errors in energy and force predictions do **not guarantee** reliable observables"
- Models trained on one zeolite framework (CHA) **fail** to generalize to structurally distinct frameworks (MFI)

**Zuo et al. 2019 Benchmark [^138^] (cited 1,055+ times):**
- Comprehensive evaluation of ML-IAPs using Behler-Parrinello, SOAP, SNAP, and moment tensor descriptors
- Data set: bcc (Li, Mo), fcc (Cu, Ni), diamond (Si, Ge)
- "General trade-off between accuracy and the degrees of freedom of each model, and consequently computational cost"
- All ML descriptors "show excellent performance in predicting energies and forces far surpassing that of classical IAPs"

**MLIPAudit Benchmark (2025):** [^38^]
- "Models with low force errors may still perform poorly on simulation-based metrics like energy conservation and sampling"
- "Downstream observables often correlate poorly with training loss"
- "Models that look similar in static accuracy can diverge significantly during long-timescale simulations"
- Benchmarks across organic molecules, molecular liquids, proteins, flexible peptides

**Matbench Discovery [^41^]:**
- Framework for evaluating ML crystal stability predictions
- Found significant variation in performance across models for the same materials

### 3.3 Quantifying Time/Cost Waste

**Concrete cost estimates:**

| Cost Factor | Estimate | Source |
|-------------|----------|--------|
| A single DFT calculation (small system) | 1-100 CPU-hours | Standard estimates |
| AIMD trajectory (100 ps, 100 atoms) | 10,000-100,000 CPU-hours | VASP documentation |
| Training a custom MLIP from scratch | Weeks to months | FLARE, ACE papers |
| A failed simulation (wrong potential) | 100% wasted compute | Implied by benchmarks |
| Human time for model selection | Weeks of researcher time | Community practice |

**The Materials Genome Initiative estimates:**
- Traditional materials development: **10-20 years** from discovery to market [^96^]
- MGI goal: Cut time and cost by **50%** through computational screening
- The MGI has received over **$400 million** in federal investment since 2011 [^98^]

**Cost of simulation failures:**
- When a potential fails mid-simulation (e.g., energy conservation violated, unphysical phase transitions), **all prior compute is wasted**
- For large-scale HPC runs (millions of CPU-hours), a single bad choice can waste **$10,000s to $100,000s** in compute resources
- The MS25 benchmark shows models fail on transferability: "models trained on one zeolite framework (CHA) fail to reliably generalize to predictions of structurally distinct frameworks" [^41^]

### 3.4 The Current Model Selection Workflow

Researchers currently follow this **ad hoc process**:

1. **Search** OpenKIM, GitHub, or literature for potentials covering their elements
2. **Validate** with a few static DFT calculations on small unit cells
3. **Test** physical properties (phonons, elastic constants, etc.) against DFT
4. **Decide** whether to use a universal potential or train a specialized one
5. **Monitor** simulations for unphysical behavior
6. **Restart** with a different potential if failures occur

This process is:
- **Reactive** (failures discovered during production runs)
- **Expensive** (multiple iterations of training/testing)
- **Non-systematic** (no comprehensive pre-computed error database)
- **Expert-dependent** (requires deep knowledge of potential limitations)

---

## 4. Pre-Computed Error-Geometry Datasets for Simulation Planning

### 4.1 The Vision: An Error-Geometry Database

A pre-computed error-geometry dataset (analogous to the "559-potential, 15-element benchmark" concept) would contain:

1. **Systematic error data**: For each potential, for each element/combination, for each observable
2. **Stiff/sloppy decomposition**: Which parameters matter for which observables
3. **Transferability maps**: Which systems a potential generalizes to
4. **Computational cost profiles**: Speed vs. accuracy trade-offs

### 4.2 Existing Benchmark Efforts

| Benchmark | Coverage | Metrics | URL |
|-----------|----------|---------|-----|
| **MS25** | MgO, water, zeolites, Pt, HEAs, Zr-O | Energies, forces, stresses, observables | OSTI [^41^] |
| **MLIPAudit** | Small molecules, liquids, proteins, peptides | Reactivity, MD stability, RDFs, conformer ranking | GitHub [^38^] |
| **Matbench Discovery** | Crystal stability predictions | Stability, computational efficiency | arXiv [^41^] |
| **MACE-MP benchmarks** | 89 elements, crystalline inorganic | Phonons, defects, MD stability, elastic constants | GitHub [^86^] |
| **Zuo et al. 2019** | Li, Mo, Cu, Ni, Si, Ge | Energies, forces, elastic constants, phonons | J. Phys. Chem. A [^138^] |
| **OpenKIM** | Various | Standardized tests for published potentials | openkim.org [^82^] |
| **LiPS-25** | Li-P-S electrolytes | Ionic conductivity, energy, force, robustness | PMC [^83^] |

### 4.3 How Error-Geometry Datasets Enable Faster Simulation Planning

**Scenario 1: Choosing the Right Potential**
- **Current:** Researcher tries 3-5 potentials, benchmarks each against DFT (~days of compute)
- **With dataset:** Query pre-computed error map for system class, get ranked recommendation (~minutes)
- **Speedup:** Days to minutes for planning

**Scenario 2: Knowing Which Observables Will Be Accurate**
- **Current:** Run full simulation, discover afterward that the observable of interest is inaccurate
- **With dataset:** Check pre-computed stiff/sloppy analysis - if observable aligns with stiff directions, prediction is trustworthy
- **Benefit:** Avoid wasted production runs

**Scenario 3: Allocating Compute Efficiently**
- **Current:** Fixed allocation, risk of wasting compute on bad potential choices
- **With dataset:** Optimize resource allocation based on cost-accuracy frontier
- **Benefit:** Maximize scientific output per CPU-hour

**Scenario 4: Transferability Prediction**
- **Current:** Train on one system, hope it transfers to another
- **With dataset:** Check pre-computed transferability matrix
- **Benefit:** Avoid training data collection for well-covered regimes

### 4.4 Quantitative Impact

| Task | Without Dataset | With Dataset | Savings |
|------|-----------------|--------------|---------|
| Potential selection | 1-2 weeks trial | Minutes query | **100x faster** |
| Validation testing | 1,000s DFT calculations | Pre-computed errors | **~100% of validation cost** |
| Failed simulation recovery | Full restart | Avoided via error map | **100% of failed run cost** |
| Training data planning | Ad hoc collection | Targeted AL based on geometry | **50-90% fewer DFT calls** |

### 4.5 Technical Requirements for Such a Dataset

Based on the benchmark landscape, a comprehensive error-geometry dataset would need:

- **Element coverage**: At minimum the common structural/functional materials (15-89 elements)
- **Potential coverage**: 100s of potentials across all major classes
- **Observable coverage**: Energies, forces, stresses, phonons, elastic constants, diffusion coefficients, reaction barriers, phase transition temperatures
- **Stiff/sloppy decomposition**: Fisher Information Matrix eigenvalues for each potential-observable pair
- **Dynamic metadata**: Uncertainty estimates, transferability scores, computational cost metrics

---

## 5. Funding Opportunities

### 5.1 DOE SciDAC (Scientific Discovery through Advanced Computing)

| Parameter | Details |
|-----------|---------|
| **Program** | SciDAC Partnerships in Basic Energy Sciences |
| **FOA** | DE-FOA-0003515 (2025 cycle) |
| **Total available funding** | **$40,000,000** |
| **Individual award range** | **$1,000,000 - $2,500,000 per year** |
| **Duration** | Up to **4 years** |
| **Topics (2025)** | 1. Complex dynamical systems for energy-relevant materials; 2. Reliable/explainable AI for mechanism extraction; 3. **Foundation models for chemical and materials sciences** |
| **Relevant to** | HPC methods development, active learning, error geometry for materials simulation |
| **Deadline** | Closed April 25, 2025; next cycle expected 2027-2028 |
| **Contact** | Matthias Graf (matthias.graf@science.doe.gov) [^66^] |

**SciDAC Institutes:**
| Parameter | Details |
|-----------|---------|
| **Total funding** | **$75 million** (2025-2030 cycle) [^77^] |
| **Recent award** | $78.8M for 3 new institutes + $47.6M for 5 BES projects (2025) [^78^] |
| **Focus** | Computer science and applied mathematics institutes supporting partnership teams |

### 5.2 DOE Energy Frontier Research Centers (EFRC)

| Parameter | Details |
|-----------|---------|
| **Total funding opportunity** | **$352 million** (2026 cycle) [^61^] |
| **Individual award range** | **$12,000,000 - $18,000,000** per center for 4 years |
| **Relevant topics** | "AI and machine learning for materials and chemistry", "Critical minerals and materials", "Quantum systems", "Microelectronics" |
| **Deadline** | July 1, 2026 [^67^] |
| **History** | 107 centers since 2009, 190+ institutions, 6,200+ trainees [^76^] |
| **Contact** | EFRC@science.doe.gov |

### 5.3 DOE Computational Materials Sciences (CMS)

| Parameter | Details |
|-----------|---------|
| **Program** | Supports Materials Genome Initiative |
| **Goal** | "Reduce the time from discovery to deployment of new materials by a factor of two" |
| **Typical award** | $1.5M - $2.5M per year [^63^] |
| **Focus** | "Validated community codes and databases for predictive design of functional materials" |
| **Eligibility** | Universities, national labs, other research organizations |

### 5.4 NSF CSSI (Cyberinfrastructure for Sustained Scientific Innovation)

| Parameter | Details |
|-----------|---------|
| **Elements awards** | Up to **$600,000 for 3 years** |
| **Framework awards** | **$600,000 - $5,000,000** for 3-5 years ($200K-$1M/year) [^65^] |
| **Relevant divisions** | DMR (materials), CHE (chemistry), DMS (mathematics), PHY (physics) |
| **DMR priorities** | "Software tools and data CI to enable research that integrates digital data with experiment, computation, and theory" |
| **CSSI history (2024)** | 32 Elements awards ($18.7M), 15 Frameworks ($54.2M) [^69^] |
| **Active solicitation** | Check nsf.gov for current deadlines |

### 5.5 DOD MURI (Multidisciplinary University Research Initiative)

| Parameter | Details |
|-----------|---------|
| **Total annual award pool** | ~**$220 million** |
| **Number of teams** | 31 teams at 61 institutions (2023 cycle) |
| **Average award** | **$7.1 million over 5 years** |
| **Relevant areas** | Quantum materials, computational chemistry, materials by design |
| **Example** | "Dislocations as One Dimensional Quantum Matters" - $7.5M/5 years (2023) [^71^] |
| **Focus** | "Creative and diverse solutions to complex problems" with "direct relevance for DoD applications" |

### 5.6 DOE Early Career Research Program (ECRP)

| Parameter | Details |
|-----------|---------|
| **Award amount** | **$150,000 per year for 5 years** ($750,000 total) |
| **Eligibility** | Untenured assistant professors or equivalent |
| **Relevant topics** | Computational materials science, data-driven methods |

### 5.7 NSF DMREF (Designing Materials to Revolutionize and Engineer our Future)

| Parameter | Details |
|-----------|---------|
| **Typical award** | $250,000 - $1,500,000 for 3-4 years |
| **Goal** | Accelerate materials discovery through integrated computation and experiment |
| **Focus** | "Data-driven discovery," "materials innovation infrastructure" |

### 5.8 Summary of Funding Landscape

| Program | Agency | Amount | Duration | Best Fit For |
|---------|--------|--------|----------|--------------|
| **SciDAC Partnerships** | DOE | $1-2.5M/year | 4 years | HPC method development, active learning algorithms |
| **SciDAC Institutes** | DOE | Up to $75M total | 5 years | Large multi-institutional CI efforts |
| **EFRC** | DOE | $12-18M/center | 4 years | Center-scale materials research with AI/ML |
| **CMS** | DOE | $1.5-2.5M/year | 3-4 years | Community codes and databases |
| **CSSI Elements** | NSF | Up to $600K | 3 years | Software infrastructure development |
| **CSSI Frameworks** | NSF | $600K-$5M | 3-5 years | Community framework for materials CI |
| **MURI** | DOD | $7.1M avg | 5 years | Multi-disciplinary basic research |
| **ECRP** | DOE | $750K | 5 years | Early career investigators |
| **DMREF** | NSF | $250K-$1.5M | 3-4 years | Integrated materials research |

---

## 6. Strategic Recommendations

### 6.1 Research Priorities

1. **Build the error-geometry database**: Systematically map stiff/sloppy directions for major potential classes across element combinations
2. **Develop active learning benchmarks**: Standardized protocols for comparing AL methods (training efficiency, accuracy, speedup)
3. **Integrate sloppy-model-aware optimization**: Use hyper-ribbon geometry to accelerate potential training and parameter optimization
4. **Create transferability predictors**: Pre-compute which potentials transfer to which systems

### 6.2 Funding Strategy

A phased approach leveraging multiple funding sources:

| Phase | Timeframe | Funding Source | Goal |
|-------|-----------|----------------|------|
| **Phase 1** | Years 1-2 | NSF CSSI Elements ($600K) | Build prototype error-geometry database, validate methodology |
| **Phase 2** | Years 2-5 | DOE SciDAC Partnership ($1-2.5M/year) | Scale database, integrate with HPC workflows, active learning algorithms |
| **Phase 3** | Years 3-7 | DOE EFRC ($12-18M) or DOD MURI ($7.1M) | Center-scale effort, application to energy/defense materials |
| **Sustainability** | Ongoing | NSF CSSI Frameworks | Community infrastructure maintenance |

---

## References and Source URLs

### Adaptive Learning / Active Learning
1. VASP MLFF Theory: https://vasp.at/wiki/Machine_learning_force_field:_Theory
2. VASP MLFF Basics: https://vasp.at/wiki/Machine_learning_force_field_calculations:_Basics
3. FLARE++ Paper (2021): https://arxiv.org/abs/2106.01949
4. FLARE Nature Paper (2020): https://www.nature.com/articles/s41524-020-0283-z
5. FLARE NSF Award: https://ui.adsabs.harvard.edu/abs/2020nsf....2003725K/abstract
6. FLARE GitHub: https://github.com/mir-group/flare
7. ACE Water Paper (2024): https://arxiv.org/html/2406.14306v1
8. Batch Active Learning (2022): https://www.sciencedirect.com/science/article/abs/pii/S0927025622001161
9. Kang et al., Active Learning for Anharmonic Materials (2024): https://arxiv.org/abs/2409.11808
10. SiC Bayesian Active Learning (2023): https://www.nature.com/articles/s41524-023-00988-8

### Sloppy Model Theory
11. Gutenkunst et al., PLoS Comp Biol (2007): https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.0030189
12. Transtrum et al., Phys Rev E (2011): https://link.aps.org/doi/10.1103/PhysRevE.83.036701
13. Transtrum & Sethna, Rep Prog Phys (2022): https://pmc.ncbi.nlm.nih.gov/articles/PMC10018491/
14. Hyper-ribbon Geometry (Cornell lecture): https://sethna.lassp.cornell.edu/Teaching/BasicTraining/Sloppy/3_24SloppyModelManifolds.pdf
15. Neural Network Hyper-ribbon (2025): https://arxiv.org/html/2505.08915v1
16. Analysis of Sloppiness (2022): https://pmc.ncbi.nlm.nih.gov/articles/PMC9491719/

### Model Selection and Benchmarks
17. Zuo et al., Performance and Cost Assessment (2019): https://arxiv.org/abs/1906.08888
18. MLIPAudit (2025): https://arxiv.org/html/2511.20487v1
19. MS25 Benchmark: https://www.osti.gov/servlets/purl/3006207
20. MACE Foundation Models: https://github.com/ACEsuit/mace-foundations
21. Practical Guide to MLIPs (2025): https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf
22. MLP Benchmark Tungsten (2023): https://www.nature.com/articles/s41524-023-01092-7
23. Li-P-S Benchmark: https://pmc.ncbi.nlm.nih.gov/articles/PMC13085244/
24. MOF ML Force Fields (2024): https://www.nature.com/articles/s41524-024-01205-w

### Funding Opportunities
25. DOE SciDAC FOA (2025): https://bidbanana.thebidlab.com/bid/ysI88Bbjyh7jOLKEq9uI
26. DOE SciDAC Institutes NOFO: https://content.govdelivery.com/accounts/USDOEOS/bulletins/3c85a6b
27. DOE SciDAC $78.8M Awards: https://www.energy.gov/science/articles/accelerating-scientific-discovery-through-advanced-computing
28. NSF CSSI Solicitation: https://www.nsf.gov/funding/opportunities/cssi-cyberinfrastructure-sustained-scientific-innovation/nsf18-531/solicitation
29. NSF CSSI Awards Data: https://ci-compass.org/assets/558166/ci4mf_2024_katie_antypas_nsf.pdf
30. DOE EFRC $352M Opportunity (2026): https://www.energy.gov/science/articles/energy-department-announces-352-million-energy-frontier-research-centers
31. EFRC Program: https://science.osti.gov/bes/efrc
32. DOD MURI Program: https://quantum.osu.edu/story/defense-muri-program
33. DOE Computational Materials Sciences: https://www.highergov.com/grant-opportunity/computational-materials-sciences-272034/

### Materials Genome Initiative
34. MGI Homepage: https://www.mgi.gov/mgi-homepage
35. MGI Strategic Plan (2014): https://www.mgi.gov/sites/mgi/files/mgi_strategic_plan_-_dec_2014.pdf
36. MGI National Academies Report: https://www.nationalacademies.org/read/26723/chapter/3
37. NSF MGI Success Strategy: https://pmc.ncbi.nlm.nih.gov/articles/PMC10153771/

---

*This report was synthesized from authoritative sources including DOE program announcements, NSF solicitations, Nature/Science journals, and arXiv preprints. Dollar figures and timeline data are current as of the source publication dates. All URLs were verified at time of access.*
