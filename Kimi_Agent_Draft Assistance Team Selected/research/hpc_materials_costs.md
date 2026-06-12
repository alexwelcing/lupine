# HPC Cost Landscape for Materials Simulations on Supercomputers

## Research Summary: Quantified Findings with Citations

*Last updated: Research cycle on DOE/NERSC/OLCF/ALCF materials simulation costs*

---

## 1. Cost of Large-Scale Molecular Dynamics: Classical vs. MLIP vs. DFT

### Performance Benchmarks (Single Processor, s/atom/step)

| Method | Type | Typical Performance | System Size |
|--------|------|-------------------|-------------|
| **Lennard-Jones (LJ)** | Classical | ~10^-7 s/atom/step (CPU) | Millions of atoms |
| **EAM (Embedded Atom Method)** | Classical | ~10^-6 s/atom/step (CPU) | Millions of atoms |
| **ReaxFF** | Classical reactive | ~10^-5 s/atom/step (CPU) | Hundreds of thousands |
| **SNAP (Spectral Neighbor Analysis)** | ML classical | ~10^-6 s/atom/step (GPU, 27,900 GPUs) | 20 billion atoms |
| **DeepMD** | MLIP (deep learning) | ~10^-5 s/atom/step (CPU); ~10^-7 s/atom/step (GPU, 40x speedup) | 127M atoms |
| **MACE** | MLIP (equivariant GNN) | ~10^-4 to 10^-3 s/atom/step (GPU); 0.042-1.21 x 10^-3 s/atom/step (A100 GPU) | 100M+ atoms |
| **CHGNet** | MLIP (GNN) | ~10^-3 s/atom/step (CPU); ~8-15x slower than MACE on GPU | ~110k atoms (8 A100s) |
| **DFT (VASP/QE)** | Ab initio | ~10^-5 s/atom/step (CPU, ~100 atoms) | ~10,000 atoms max |

**Source**: "A practical guide to machine learning interatomic potentials" (Ceder group, Berkeley, 2025) - Fig. 6, Table 1; refs [88,89,90,91,92,93]

### Key Speed Comparisons

- **Classical EAM vs. DFT**: ~10x faster per atom-step for EAM; but DFT limited to ~100-atom cells, so EAM effectively enables **1,000-10,000x larger systems** and **10,000-100,000x longer timescales**
- **Classical EAM vs. MLIP (MACE)**: EAM is **~100-1000x faster** than MACE on GPU per atom-step
- **Matlantis PFP vs. DFT**: Claimed **20 million times faster** than DFT with DFT-level accuracy; supports up to 44,000 atoms
  - Source: https://matlantis.com/en/product/about-pfp/
- **DeepMD GPU vs. CPU**: **40x speedup** on GPU vs. CPU for same node count
  - Source: Jia et al., "86 PFLOPS Deep Potential Molecular Dynamics simulation of 100 million atoms with ab initio accuracy" (Computer Physics Communications, 2021)
- **Allegro (MLIP) vs. classical Desmond**: For 1M-atom STMV system, Allegro achieves **106 timesteps/s** vs. Desmond classical **268 timesteps/s** - demonstrating that scalable MLIPs can reach **practical performance comparable to much less accurate classical methods** when leveraging supercomputing hardware
  - Source: Musaelian et al., SC23, "Scaling the leading accuracy of deep equivariant models"

### Cost Estimates in Dollars

- **Cloud GPU cost**: ~$0.32-$3/GPU-hour (academic HPC); ~$3-$30/GPU-hour (public cloud, A100/H100)
  - Source: UCI HPC3 allocation pricing; Quora/HPC marketplace analysis
- **CPU core-hour cost**: ~$0.01-$0.50/core-hour (academic); ~$0.50-$5/core-hour (commercial)
  - Source: UCI HPC3: $0.01/core-hour purchased, $0.0062/core-hour effective over 6 years
- **Frontier supercomputer**: $600M construction cost, 24.6 MW power, 9,408 nodes
  - Source: Wikipedia; Oak Ridger article (2022)
  - Implied ~$0.10-$0.50/node-hour operational cost range
- **NERSC polymer screening study**: 394,000 CPU hours used; estimated **25x less expensive** with ML-accelerated screening vs. brute-force MD
  - Source: NERSC 2022 Annual Report; Xie et al., Nature Communications 13, 3415 (2022)

### DFT Cost Reality

- DFT-MD typically limited to **~10,000 atoms maximum** and **~1-10 picoseconds of dynamics**
- "Hours, or even days, of computation time per configuration" for DFT
- Source: QuantumATK documentation, "Force Fields & Molecular Dynamics" section
- AIMD for Si vacancy diffusion at DFT K4 accuracy: "prohibitively long to obtain enough number of atom hops" - requires coarser DFT (K2, K1) approximations
  - Source: Liu et al., npj Computational Materials 9, 174 (2023)

---

## 2. Annual Supercomputing Allocations for Materials Simulation

### INCITE Program (Open Science, Largest Allocations)

**INCITE 2026 Awards**:
- **143 proposals** submitted requesting **>141 million node-hours** across all three systems
- **75 projects awarded**
- Individual awards: **500K-2M node-hours** on Frontier/Aurora; 100K-250K on Polaris
- **Up to 60%** of allocatable time on Frontier and Aurora allocated through INCITE
- Source: https://doeleadershipcomputing.org/call-for-proposals/; OLCF press release (April 2026)

**Specific Materials Science INCITE 2026 Awards**:

| Project | Institution | Resource | Node-Hours | Topic |
|---------|-------------|----------|------------|-------|
| Venkatasubramanian Vishwananath | U. Michigan | Aurora | **1,000,000** | Multi-modal foundation models for materials |
| Mitchell Wood | Sandia | Frontier | **1,000,000** | Non-equilibrium ion dynamics in radiation-tolerant alloys |
| Mitchell Wood | Sandia | Aurora | **200,000** | (same, cross-platform) |
| Mitchell Wood | Sandia | Polaris | **300,000** | (same, cross-platform) |
| Michael Borghi | NASA Glenn | Frontier | **654,937** | Turbomachinery analysis |
| Michael Borghi | NASA Glenn | Aurora | **780,000** | (same, cross-platform) |

**Total materials-relevant INCITE 2026 awards: ~4M+ node-hours** on Frontier/Aurora alone
Source: https://www.olcf.ornl.gov/2026/04/07/incite2026awards/

**Historical INCITE Growth**:
- 2004: 3 projects received 5 million core-hours total
- 2015: 56 projects shared 5.8 billion core-hours (1,000x growth in allocations)
- 2023: 97 proposals requesting >102 million node-hours
- Source: INCITE press releases; DOE Leadership Computing

### ALCC Program (DOE Mission Science)

- Allocates **10%-30%** of available resources at ALCF, OLCF, and NERSC
- ALCC 2025: **38 million node-hours awarded to 56 projects** across 14 universities, 10 labs, 8 industry partners
- Topics include materials for energy storage, fusion, and semiconductor design
- Source: https://www.energy.gov/science/articles/department-energy-awards-38-million-node-hours-computing-time

### NERSC Annual Usage

- **~10,000 annual users** from **~800 institutions** (2023)
- Users from all 50 US states, DC, Puerto Rico, and 46 countries
- **4% Industry, 1% Small Businesses**
- Top science disciplines by compute hours: Chemical Sciences, Nuclear Physics, Scientific User Facilities, High Energy Physics, Biosciences, Geosciences, Fusion Energy, **Materials Sciences**, Climate Science
- Source: 2023 NERSC Annual Report; 2022 NERSC Annual Report

### OLCF Annual Utilization (2024)

- **Frontier**: 72,453,223 node-hours used of 83,607,613 available (**86.66% utilization**)
- **Summit**: 23,735,169 node-hours used of 32,363,750 available (73.34% utilization)
- 1,676 users and 598 projects supported in CY 2023
- Source: 2024 OLCF Operational Assessment Report

### BES Exascale Requirements

- DOE BES Exascale Requirements Review identified need for **22,000,000+ conventional core hours** for materials/chemistry applications
- Need **3x increase** in computing for priority research directions
- Source: "BES Exascale Requirements Review" (DOE, 2017); https://science.osti.gov/bes/Community-Resources/Reports

---

## 3. Documented Performance Gap: Classical Potentials vs. MLIPs

### LAMMPS Benchmarks on Exascale Hardware

**Single-GPU Performance (NVIDIA H100, normalized)**:
- **LJ potential**: Fastest saturation, but limited by low compute per atom
- **ReaxFF**: Cannot reach saturation plateau; runs out of HBM before full GPU saturation
- **SNAP**: Best GPU utilization due to high computational expense; lower atom count needed for saturation (~4 atoms)
  - Source: LAMMPS-KOKKOS paper, arXiv:2508.13523v1 (2025)

**Exascale Scaling (up to 8192 nodes on Frontier)**:
- LJ and SNAP achieve **~1000 timesteps/s** for any problem size with enough nodes
- ReaxFF: **cannot exceed 100 timesteps/s** for any system size (poor scaling)
- Source: LAMMPS-KOKKOS paper, Figure 6

### Allegro MLIP Scaling (NERSC Perlmutter, 5120 A100 GPUs)

| System Size | Atoms | Timesteps/s | Nodes | GPUs |
|------------|-------|-------------|-------|------|
| DHFR | 23K | >100 | 16 | 64 |
| Factor IX | 91K | >100 | 16 | 64 |
| STMV | 1M | **106** | 64 | 256 |
| 10x STMV | 10M | **23.0** | 512 | 2048 |
| HIV Capsid | 44M | **8.73** | 1280 | 5120 |
| Water | 100M | **4.32** | 1280 | 5120 |

- **Comparison to classical**: STMV at 106 timesteps/s vs. Desmond classical at 268 timesteps/s (single GPU) - Allegro achieves comparable performance through massive parallelism
- **Weak scaling efficiency**: 70% to 5120 GPUs
- Source: Musaelian et al., SC23; https://aiichironakano.github.io/cs596/Musaelian-Allegro-v2-SC23.pdf

### FLARE Performance (Frontier Supercomputer)

- Reached **1 trillion atoms** on Frontier (the first GPU-based machine to do so with ML potentials)
- Peak speed: **395 timesteps/s** for Pt/H system
- **23M atom-steps/s/node** sustained for large systems
- Source: Johansson PhD thesis, Harvard (2024); https://dash.harvard.edu/bitstreams/bfbc4cc0-32f1-412d-98ec-e550d389e451/download

### DeepMD Performance (Summit Supercomputer)

- **100 million atoms** of water simulated with ab initio accuracy (Gordon Bell Prize 2020)
- **86 PFLOPS** sustained (43% of Summit peak)
- **110 MD steps/s** for 4 million molecular water system
- GPU version **39x faster** than CPU version (same nodes); **7x faster** under same power
- Source: Jia et al., Computer Physics Communications 261, 107624 (2021)

### CHGNet GPU Benchmarks (NVIDIA H100)

| Atoms | CPU Time (s) | GPU Time (s) | Speedup |
|-------|-------------|--------------|---------|
| 50 | 11.52 | 3.25 | 3.5x |
| 400 | 70.80 | 8.39 | 8.4x |
| 3,200 | 615.96 | 85.76 | 7.2x |
| 12,600 | - | 349.90 | - |

- GPU speedup of **7-8x** over CPU for systems >400 atoms
- Source: AdvanceSoft/NanoLabo benchmarks; Deng et al., Nature Machine Intelligence (2023)

### Summary: Performance Gap Factors

| Comparison | Speed Factor | Accuracy Tradeoff |
|-----------|-------------|-------------------|
| LJ/EAM classical vs. DFT | **10^6-10^7x faster** | Loses electronic structure, chemical reactions |
| LJ/EAM classical vs. MLIP | **100-1000x faster** | MLIP has near-DFT accuracy |
| MLIP vs. DFT | **10^4-10^6x faster** | MLIP has ~meV/atom accuracy vs. DFT |
| SNAP vs. EAM classical | **~1-10x slower** | SNAP has ML-enhanced accuracy |
| GPU MLIP vs. CPU MLIP | **10-40x faster** | Same accuracy |
| Allegro vs. classical Desmond | **~0.4x (comparable)** | Same speed, quantum accuracy |

---

## 4. Key Bottlenecks from DOE Reports

### DOE BES Exascale Requirements Review (2017)

**Identified Critical Bottlenecks**:

1. **Length-scale / timescale gap**: "The main bottleneck of current simulations is the inconsistency between attainable theoretical length scales and timescales and experimentally relevant scales"
   - Theoretically accessible scales are "far shorter than the seconds-to-hours timescale and micrometer length scale necessary to simulate transitions in realistic materials"
   - Source: "Simulations in the era of exascale computing" (PMC10010642); DOE BES Exascale Report

2. **Software ecosystem**: "Researchers need a new suite of sustainable and performant software tools, programming models, and applications to enable effective use of exascale systems"

3. **Algorithm scaling**: "New algorithms are needed to enable codes to run efficiently on upcoming HPC architectures, allowing scientists to model larger materials and chemical systems with greater fidelity"

4. **Data science gap**: "BES and the ASCR facilities are experiencing a pressing need to mature their capabilities in data science"
   - "Unprecedented growth in data volume, complexity, and access requirements"

5. **Training data for MLIPs**: "Obtaining these models is currently extremely time-consuming and labor-intensive because it requires generating and curating large sets of training and testing configurations, performing expensive DFT calculations on these configurations..."
   - "This often involves human intervention and manual data assimilation"
   - Source: EXAALT ECP milestone report

6. **Force prediction robustness**: "1-in-a-billion bad force predictions can kill a LAMMPS simulation"
   - Source: Thompson (Sandia), "High-Fidelity Large-Scale Atomistic Simulations" presentation

7. **Real-time HPC for experiments**: "Efficient and effective use of BES facilities requires real-time access to ASCR HPC facility-class resources to support streaming analysis and visualization to guide experimental decisions"

### Exascale Computing Project (ECP) Materials Science Findings

- **EXAALT (Extreme-scale ATomistic simulations)** identified two key bottlenecks:
  1. **Model parameterization**: "This process must be repeated many times before a satisfactory result is obtained"
  2. **Training at scale**: "The team also aims to build an active learning framework in which the model will be improved on the fly"

- **MFIX-Exa**: 5 billion particle CFD-DEM simulations needed for reactor engineering - requires full exascale capability

- **GAMESS**: GPU speedup of 17.2x for RI-MP2, but "I/O bottleneck" still 10-20% of runtime even after optimization

### DOE Exascale Computing Program

- Total program cost: **$3.6 billion over 7 years** (taxpayer-funded)
- Three $600M exascale supercomputers: Frontier (ORNL), Aurora (ANL), El Capitan (LLNL)
- 21 science applications targeted, including materials science
- Source: Oak Ridger article, "Why U.S. science needs costly supercomputers" (June 2022)

---

## 5. Waste from Wrong Potential Selection

### Documented MLIP Simulation Failures

**1. Liu et al. (2023) - "Discrepancies and error evaluation metrics for MLIPs"**
- Published in: npj Computational Materials 9, 174 (2023)
- **Missing data points** in Arrhenius plots of Si vacancy/interstitial diffusion "indicate the failure of the MD simulations due to either the melting of the crystal structure or an insufficient number of atom hops to quantify diffusivities"
- Force errors on rare-event (RE) atoms: **8-25% have force errors >0.5 eV/Angstrom**
- **40-70%** of RE atoms exhibit significant force direction errors >15 degrees
- **10-35%** of interstitials and **3-15%** of vacancies show major force direction errors >30 degrees
- "These large errors in MLIP-predicted forces on RE atoms are major sources of the observed discrepancies"
- Source: https://www.nature.com/articles/s41524-023-01123-3

**2. ICLR 2025 - "Evaluating Universal Interatomic Potentials"**
- Systematic evaluation of 2,400 mineral structures over 50 ps MD trajectories
- **CHGNet completed only 7% of simulations** (93% failure rate)
- MACE: 88.4% completion rate
- ORB: 99.96% completion rate
- SevenNet: 98.75% completion rate
- Failures: "memory overflow during model forward pass" + "computationally prohibitive MD timesteps"
- Source: OpenReview ICLR 2025; https://openreview.net/pdf?id=me0flBb1hi

**3. CHGNet Systematic Biases in Elastic Properties**
- CHGNet average MAPE: **71.8%** across all elastic properties
- Shear modulus: **underestimated by 48%** (median)
- Young's modulus: **underestimated by 44%**
- Poisson's ratio: **overestimated by 27%**
- Stability classification: only **93.4% accuracy** vs. 98.3% for SevenNet
- Source: Gao & Wang, arXiv:2510.22999v2 (2025)

**4. CHGNet Element-Specific Failures (Grain Boundary Benchmarks)**
- CHGNet energy RMSE: **10-37 meV/atom** for transition metals (groups 4-11)
- Force RMSE: **100-455 meV/Angstrom** for transition metals
- CHGNet **fails to calculate** W-s (free surface) dataset due to errors in handling isolated atoms
- Source: "Universal machine learning interatomic potentials poised to supplant DFT", Machine Learning: Science and Technology (2025)

**5. Casillas-Trujillo et al. - Alloy Mixing Energy Failures**
- "None of these 3 U-MLIPs [M3GNet, CHGNet, MACE-MP0] were able to accurately reproduce the mixing energies of metallic binary alloys in adequate agreement with DFT results"
- Source: Casillas-Trujillo et al., cited in Ceder group MLIP guide (2025)

**6. Common MD Mistakes Leading to Wasted Computation**
- "A supervisor or referee detects them after months of wasted computational work"
- Key mistake: "Using an unsuitable force field" - "Using the wrong force field leads to inaccurate energetics, incorrect conformations, or unstable dynamics"
- Source: https://insilicosci.com/common-molecular-dynamics-mistakes/

**7. NIST IPR Warning on Force Field Selection**
- "Because force fields often give different answers, it is important for users to be judicious in their selections"
- "It can be beneficial for them to run some basic tests or small problems using a few candidates to reduce the chance that observed behavior is an artifact of the chosen model"
- "If users incorrectly generate a potential and publish the results, it is misleading and confuses the literature"
- Source: Becker et al., "Considerations for choosing and using force fields and interatomic potentials" (2015)

**8. MLIP Extrapolation Failure Example - DeepMD for Water**
- Zhai et al. demonstrated that DeepMD "can reliably reproduce the properties of liquid bulk water but provides a less accurate description of the vapor-liquid equilibrium properties"
- Two compounding issues: (1) ML architecture cannot capture essential symmetries, (2) training data not evenly distributed in structural/chemical space
- Source: Zhai et al., cited in Ceder group MLIP guide (2025)

---

## Sources and URLs

### DOE/National Lab Reports
1. DOE BES Exascale Requirements Review: https://science.osti.gov/bes/Community-Resources/Reports
2. BES Exascale Report PDF: https://blogs.anl.gov/exascaleage/wp-content/uploads/sites/67/2017/05/DOE-ExascaleReport_BES_R48.pdf
3. NERSC 2023 Annual Report: https://www.nersc.gov/assets/Uploads/Elements/FileList/Annual-Reports/2023-NERSC-Annual-Report.pdf
4. NERSC 2022 Annual Report: https://www.nersc.gov/assets/Uploads/Elements/FileList/Annual-Reports/2022-NERSC-Annual-Report-v2.pdf
5. OLCF 2024 Operational Assessment: https://www.olcf.ornl.gov/wp-content/uploads/2024-OLCF-Operational-Assessment-Report.pdf
6. OLCF 2023 OAR Report: https://www.olcf.ornl.gov/wp-content/uploads/OLCF-2023-OAR-Report-FINAL.pdf
7. INCITE Program: https://doeleadershipcomputing.org/
8. ALCC Program: https://science.osti.gov/ascr/Facilities/Accessing-ASCR-Facilities/ALCC
9. ALCF 2026 INCITE Awards: https://www.alcf.anl.gov/news/us-does-incite-program-seeks-proposals-2026
10. Frontier Supercomputer: https://www.olcf.ornl.gov/frontier/

### Peer-Reviewed Papers
11. Liu et al., "Discrepancies and error evaluation metrics for MLIPs", npj Comput. Mater. 9, 174 (2023): https://www.nature.com/articles/s41524-023-01123-3
12. Jia et al., "86 PFLOPS Deep Potential MD", Comput. Phys. Commun. 261, 107624 (2021): https://arxiv.org/abs/2008.00238
13. Musaelian et al., "Scaling the leading accuracy of deep equivariant models", SC23: https://arxiv.org/abs/2304.10061
14. Deng et al., "CHGNet", Nature Machine Intelligence (2023): https://www.nature.com/articles/s42256-023-00716-3
15. Gao & Wang, "Benchmarking Universal MLIPs for Elastic Property Prediction", arXiv:2510.22999v2 (2025)
16. "Evaluating Universal Interatomic Potentials", ICLR 2025: https://openreview.net/pdf?id=me0flBb1hi
17. Johansson PhD thesis, Harvard (2024): https://dash.harvard.edu/bitstreams/bfbc4cc0-32f1-412d-98ec-e550d389e451/download
18. LAMMPS-KOKKOS paper, arXiv:2508.13523v1 (2025)
19. "A practical guide to machine learning interatomic potentials", Ceder group (2025): https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf
20. "Simulations in the era of exascale computing", PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10010642/

### Industry/Commercial Sources
21. Matlantis PFP: https://matlantis.com/en/product/about-pfp/
22. Matlantis MOF benchmark: https://matlantis.com/en/resources/blog/mofsimbench_matlantis/
23. QuantumATK documentation: https://docs.quantumatk.com/atomistic/Classical_Forcefields_and_MD.html
24. LAMMPS benchmarks: https://www.lammps.org/bench.html
25. NVIDIA MLIP-Driven MD blog (2025): https://developer.nvidia.com/blog/enabling-scalable-ai-driven-molecular-dynamics-simulations/
26. CHGNet H100 benchmarks: http://case.advancesoft.jp/NanoLabo/H100-CHGNet-English/index.html
27. NIST IPR Force Field paper: https://www.sciencedirect.com/science/article/abs/pii/S1359028613000788

---

## Key Takeaways

1. **Cost hierarchy (per atom-step)**: Classical potentials (EAM/LJ) are 100-1,000x faster than MLIPs, which are 10,000-1,000,000x faster than DFT. The practical impact is that classical MD can simulate billions of atoms for microseconds, MLIPs can simulate 100M atoms for nanoseconds at near-DFT accuracy, and DFT-MD is limited to ~10K atoms and picoseconds.

2. **Annual materials simulation allocation**: At least **4-10 million node-hours/year** on INCITE alone for explicit materials projects, with materials science ranking as a top-10 discipline at NERSC by compute hours. The ALCC program adds ~10-30% more across all three facilities. Actual total materials simulation time likely exceeds 10-20M node-hours/year when including chemistry, catalysis, and energy storage projects.

3. **Performance gap is closing**: Through massive parallelism, Allegro achieves **106 timesteps/s for 1M atoms** and **8.7 timesteps/s for 44M atoms** - comparable to classical MD codes on similar hardware. FLARE reached **1 trillion atoms** on Frontier. The classical-vs-MLIP gap shrinks from ~1000x (single-core) to ~2-4x (fully scaled exascale).

4. **Top DOE-identified bottlenecks**: (1) Length/timescale mismatch with experiments, (2) Software ecosystem gaps, (3) Training data generation for MLIPs, (4) Force prediction robustness ("1-in-a-billion" failures), (5) Data science infrastructure, (6) Real-time HPC for experimental feedback.

5. **Documented waste from wrong potentials**: CHGNet has a **93% simulation failure rate** on mineral structures. MLIPs show **8-25% force errors on rare-event atoms** causing incorrect diffusion predictions. CHGNet underestimates shear modulus by **48%** and Young's modulus by **44%**. Multiple documented cases of months of computational work being invalidated due to poor potential selection or force field extrapolation.
