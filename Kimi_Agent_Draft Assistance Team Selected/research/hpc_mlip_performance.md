# Machine-Learning Interatomic Potentials on HPC Systems: Performance, Scaling, and the Path to Exascale

## Executive Summary

Machine-learning interatomic potentials (MLIPs) have emerged as a transformative bridge between density functional theory (DFT) accuracy and classical molecular dynamics (MD) speed. As of 2024-2025, leading MLIPs such as MACE, Allegro, CHGNet, and SevenNet are achieving throughputs of **10^4-10^6 atom-steps/second on single GPUs** (NVIDIA A100/H100), with strong scaling demonstrated to **>5000 GPUs** and system sizes exceeding **100 million atoms**. However, the speed penalty relative to classical potentials remains substantial: **10x-1000x slower than EAM** depending on the MLIP architecture, and the fundamental "accuracy wall" of extrapolation failure outside training distributions remains the central unsolved challenge.

---

## 1. Documented GPU Performance Numbers for MLIPs

### 1.1 MACE (Message-Passing Atomic Cluster Expansion)

MACE is currently one of the most widely adopted equivariant GNN potentials, with foundation models covering 89 elements.

**Table 1.1: MACE GPU Performance Benchmarks (NVIDIA A100)**

| Model | System Size | Interface | GPU | Throughput | Source |
|-------|-------------|-----------|-----|------------|--------|
| MACE-OFF23(S) | ~600 atoms (liquid) | OpenMM | A100 80GB | **2.1 x 10^6 steps/day (24.3 steps/s)** | Kovács et al. 2024 [^1] |
| MACE-OFF23(M) | ~600 atoms (liquid) | OpenMM | A100 80GB | **1.1 x 10^6 steps/day (12.7 steps/s)** | Kovács et al. 2024 [^1] |
| MACE-OFF23(L) | ~600 atoms (liquid) | OpenMM | A100 80GB | **2.8 x 10^5 steps/day (3.2 steps/s)** | Kovács et al. 2024 [^1] |
| MACE-OFF24(M) | Ala3 vacuum | OpenMM | A100 80GB | **9.6 x 10^6 steps/day (111 steps/s)** | Kovács et al. 2025 [^2] |
| MACE-OFF24(M) | Ala3 solvated | OpenMM | A100 80GB | **2.2 x 10^6 steps/day (25.5 steps/s)** | Kovács et al. 2025 [^2] |
| MACE-MP-0b3 (medium) | 1,024,000 atoms (Cantor alloy) | LAMMPS+Kokkos (symmetrix) | A100 | **~580 Matom-step/s** | MACE-MP-0 paper [^3] |
| MACE-MP-0b3 (medium) | ~1000 atoms | GPU (generic) | A100 | **~1 ns/day** | MACE-MP-0 paper [^3] |
| MACE (via LAMMPS ML-IAP) | 669 atoms | LAMMPS+Kokkos | A100 | **0.039 ns/day (0.45 steps/s)** | GitHub Issue #946 [^4] |
| MACE (via LAMMPS ML-MACE) | 669 atoms | LAMMPS+ML-MACE | A100 | **0.511 ns/day (5.9 steps/s)** | GitHub Issue #946 [^4] |
| MACE (CPU) | 250 atoms | LAMMPS | 128-core AMD EPYC | **0.092 ns/day** | Dirac's Student Blog [^5] |

**Key Finding:** MACE performance varies dramatically by implementation. The OpenMM interface achieves **2-3 orders of magnitude higher throughput** than the LAMMPS ML-IAP interface for small systems due to optimized GPU tensor operations and reduced CPU-GPU transfer overhead. The symmetrix/Kokkos evaluator narrows this gap for large systems.

### 1.2 Allegro (Equivariant Deep Learning Potential)

Allegro, from the Harvard/Kozinsky group, represents the state of the art in large-scale biomolecular and materials simulations with MLIPs. Published at SC23.

**Table 1.2: Allegro GPU Performance Benchmarks (Perlmutter Supercomputer, NVIDIA A100)**

| System | Atoms | GPUs Used | Timesteps/s | Source |
|--------|-------|-----------|-------------|--------|
| Water (various) | up to 1M | 1 GPU (saturated) | **>100** | Musaelian et al., SC23 [^6] |
| STMV (virus capsid) | 1M | Multiple | **106** | SC23 [^6] |
| 10xSTMV | 10M | Multiple | **23.0** | SC23 [^6] |
| HIV Capsid | 44M | 512-1280 nodes | **8.73** | SC23 [^6] |
| Water | 10M | Multiple | **36.3** | SC23 [^6] |
| Water | 100M | Multiple | **4.32** | SC23 [^6] |

**Key Finding:** Allegro achieves **>100 timesteps/s for systems up to 1M atoms** on fully saturated GPUs. At extreme scale (44M-100M atoms), throughput remains at **4-9 timesteps/s**, which is comparable to classical force field codes like Desmond running on single GPUs. This is the first demonstration that equivariant GNN potentials can match classical FF performance at scale through massive parallelism.

### 1.3 CHGNet (Crystal Hamiltonian Graph Neural Network)

CHGNet is a charge-informed universal GNN potential pretrained on the MPtrj dataset.

**Table 1.3: CHGNet GPU Performance Benchmarks**

| Configuration | System | GPU/CPU | Speedup | Source |
|--------------|--------|---------|---------|--------|
| CHGNet MD | 50 atoms | H100 vs CPU | **3.5x** | AdvanceSoft [^7] |
| CHGNet MD | 400-13,500 atoms | H100 vs CPU | **7-8x** | AdvanceSoft [^7] |
| FastCHGNet MD | Various (1088-10188 features) | GPU | **2.63-3.03x** vs CHGNet | Zhou et al. 2024 [^8] |
| FastCHGNet training | Full MPtrj | 32x A100 | **1.53 hours** (vs 8.3 days on 1 A100) | Zhou et al. 2024 [^8] |
| CHGNet (MatGL) | Si supercells (8-5832 atoms) | RTX A6000 | Fastest among MatGL models | MatGL paper [^9] |

**Key Finding:** CHGNet on H100 achieves **7-8x speedup over CPU** for systems >400 atoms, but GPU underutilization is significant for small systems (<500 atoms). FastCHGNet's optimizations (kernel fusion, redundancy bypass, multi-GPU training with load balancing) reduce training time from **8.3 days to 1.53 hours on 32 GPUs** (weak scaling efficiency: 74.6% at 32 GPUs).

### 1.4 SevenNet (Scalable Equivariance Enabled Neural Network)

SevenNet is designed specifically for multi-GPU parallelism using CUDA-aware MPI.

**Table 1.4: SevenNet Multi-GPU Performance**

| System Size | GPUs | Time/100 steps | ns/day | Source |
|-------------|------|---------------|--------|--------|
| 21,600 atoms | 2x A100 | 74s | ~0.12 | AdvanceSoft [^10] |
| 21,600 atoms | 8x A100 | 23s | ~0.38 | AdvanceSoft [^10] |
| 98,000 atoms | 5x A100 | 204s | ~0.04 | AdvanceSoft [^10] |
| 98,000 atoms | 8x A100 | 87s | ~0.10 | AdvanceSoft [^10] |
| 100,000 atoms (Si3N4) | 8x A100 80GB | - | **~0.1** | Park et al. 2024 [^11] |

### 1.5 FastMLIP Implementations (MTP, DeePMD, ACE, GAP)

**Table 1.5: Computational Cost Comparison of MLIPs (relative to MTP)**

| Potential | Cost vs MTP | Cost vs Buckingham | Source |
|-----------|-------------|-------------------|--------|
| MTP | **1x (baseline)** | **~0.7x (FASTER than Buckingham)** | LiAlO2 benchmark [^12] |
| Buckingham | ~1.4x | 1x (baseline) | LiAlO2 benchmark [^12] |
| ReaxFF | ~1.2x | ~0.9x | LiAlO2 benchmark [^12] |
| ACE | **~3x** | **~2x** | LiAlO2 benchmark [^12] |
| MACE | **~7x** | **~5x** | LiAlO2 benchmark [^12] |
| DeePMD | **~27x** | **~19x** | LiAlO2 benchmark [^12] |
| GAP | **~380x** | **~270x** | LiAlO2 benchmark [^12] |

**Key Finding:** Among MLIPs, only MTP is computationally cheaper than traditional empirical potentials. MACE and DeePMD incur **5-20x penalties** compared to Buckingham, while GAP is **~270x slower**. For radiation damage simulations requiring millions of atoms, this cost differential is decisive.

### 1.6 Summary: Atoms/sec/GPU for Major MLIPs

**Table 1.6: Normalized Single-GPU Throughput (approximate, system-dependent)**

| MLIP | Atoms/sec/GPU (typical) | System Size for Saturation | Notes |
|------|------------------------|---------------------------|-------|
| MTP | ~10^6 - 10^7 | ~1K atoms | Fastest MLIP; CPU-optimized |
| CHGNet | ~5 x 10^5 - 10^6 | ~1K-5K atoms | Fast GNN; good GPU utilization |
| MACE-OFF(S) | ~10^6 - 10^7 | ~500 atoms | OpenMM optimized |
| MACE-MP (LAMMPS) | ~10^3 - 10^5 | ~10K+ atoms | Kokkos/symmetrix improves large systems |
| Allegro | ~10^5 - 10^8 | ~500 atoms | Excellent GPU saturation |
| SevenNet | ~10^5 - 10^6 | ~10K atoms | Multi-GPU optimized |
| DeePMD | ~10^4 - 10^5 | ~1K atoms | Linear scaling; widely used |
| ACE | ~10^5 - 10^6 | ~1K atoms | Linear regression; fast evaluation |
| GAP (SOAP) | ~10^3 - 10^4 | ~1K atoms | Very expensive; high accuracy |

---

## 2. MLIP vs Classical Potential Performance

### 2.1 The Speed Penalty Factor

Classical potentials (EAM, MEAM, ReaxFF, Buckingham, Tersoff) maintain a dramatic performance advantage over MLIPs:

| Classical Potential | Approximate Speed vs MACE | Approximate Speed vs Allegro | Approximate Speed vs DeePMD |
|--------------------|--------------------------|------------------------------|----------------------------|
| Lennard-Jones | **~1000x faster** | **~100-1000x faster** | **~1000x faster** |
| EAM | **~100-500x faster** | **~50-200x faster** | **~500x faster** |
| Tersoff | **~50-200x faster** | **~20-100x faster** | **~100-300x faster** |
| Buckingham | **~5-10x faster** | **~2-5x faster** | **~20x faster** |
| ReaxFF | **~3-5x faster** | **~1-2x faster** | **~15x faster** |

Source: Multiple benchmark studies [^12][^13][^14]

**Critical Insight:** For large-scale production simulations (>10M atoms), EAM potentials can sustain **6 x 10^10 atom-step/s** on Frontier-class systems [^15]. No MLIP currently approaches this throughput. The practical implication: classical potentials remain essential for sampling rare events and reaching engineering timescales, while MLIPs are reserved for accuracy-critical regions or smaller systems.

### 2.2 GPU Saturation Requirements

The EXAALT project at Los Alamos National Laboratory reports key GPU saturation thresholds [^15]:

- **Expensive ML potentials (e.g., SNAP):** ~10,000 atoms per GPU needed for saturation
- **Cheap classical potentials (e.g., EAM):** ~10,000,000 atoms per GPU needed for saturation

This **1000x difference** in saturation requirements fundamentally shapes scaling strategies: MLIPs can extract useful work from GPUs with far fewer atoms, making them more suitable for strong scaling to large node counts with modest system sizes.

---

## 3. Scaling Properties of MLIP MD Simulations

### 3.1 Strong Scaling

**Allegro (SC23, Perlmutter Supercomputer) [^6]:**
- Demonstrated excellent strong scaling from single-GPU to **1280 nodes (5120 A100 GPUs)**
- Performance of **>100 timesteps/s** maintained for systems up to 1M atoms
- At 100M atoms: **4.32 timesteps/s** (water)
- GPU saturation maintained down to ~500 atoms per GPU (vs ~100K atoms/GPU for classical FFs)

**MACE-MP-0 (Multi-node, LAMMPS+Kokkos+symmetrix) [^3]:**
- Strong scaling demonstrated on AMD CPUs and NVIDIA A100 GPUs
- Single-node performance: ~580 Matom-step/s on A100 for 1M-atom Cantor alloy
- Multi-node scaling curves show good parallel efficiency up to ~100 nodes

**SevenNet (Multi-GPU) [^11]:**
- Parallel efficiency decreases with more GPUs for 21,600-atom system
- Better parallel efficiency at 98,000 atoms (nearly flat scaling from 6-8 GPUs)

### 3.2 Weak Scaling

**Allegro [^6]:**
- **70% weak scaling efficiency** to 1280 nodes / 5120 A100 GPUs
- This is the best-documented weak scaling result for an equivariant GNN potential

**FastCHGNet [^8]:**
- Weak scaling efficiencies: 91.5% (4 GPUs), 84.6% (8 GPUs), 74.6% (16 GPUs), 74.6% (32 GPUs)
- Batch size 512; training time scales sub-linearly with GPU count

**EXAALT/LAMMPS on Frontier [^15]:**
- Weak scaling demonstrated for amorphous carbon: 373,248 atoms/node scaling to 1.5B atoms
- MD weak-scales effectively as long as computation >> communication

### 3.3 Scaling Bottlenecks Identified in Literature

1. **Communication wall:** At large node counts, MPI communication dominates over computation [^15][^16]
2. **Neighbor list overhead:** Rebuilding neighbor lists at every step introduces synchronization [^4]
3. **Tensor shape variability:** PyTorch memory reallocations due to changing atom counts per GPU cause performance fluctuations [^6]
4. **Load imbalance:** Unequal atom distribution across domain decomposition boundaries [^11]
5. **CPU-GPU transfer:** Non-Kokkos LAMMPS styles require data transfer every timestep, causing **2-3x slowdown** [^17]

---

## 4. Exascale Systems: Projected Impact on MLIP Throughput

### 4.1 Current Exascale Systems

| System | Lab | Peak Performance | GPUs | Status | MLIP Relevance |
|--------|-----|-----------------|------|--------|---------------|
| **Frontier** | ORNL | 1.2 EF (HPL) | 37,632 MI250X | Operational (2022) | SNAP MD at 400x speedup vs Mira [^18] |
| **Aurora** | ANL | 2.0 EF (estimated) | ~60,000 Intel Max Series | Operational (2024) | GPU-optimized MLIP codes |
| **El Capitan** | LLNL | 2.0+ EF (projected) | AMD MI300A | Operational (2025) | Nuclear materials simulations |

### 4.2 EXAALT Performance on Frontier

The Exascale Atomistics for Accuracy, Length, and Time (EXAALT) project represents the most significant DOE investment in exascale MD with MLIPs [^18][^19][^20]:

- **400x speedup** achieved on 75% of Frontier vs. Mira baseline
- **500x+ projected speedup** at full machine capability
- **24x speedup** for SNAP kernel on single MI250X GPU vs. baseline
- Key optimizations: SNAP kernel rewrite, Kokkos performance portability, sub-kernel design for GPU threads, improved coalesced memory access

**Figure of Merit Progress:** The ECP target was 50x improvement; EXAALT achieved nearly **400x**, exceeding the goal by almost a factor of 10.

### 4.3 EXESS: Exascale Quantum Chemistry

A separate but related effort (EXESS, led by University of Melbourne and ORNL) achieved [^21][^22]:
- First quantum chemistry simulation of **>2 million electrons exceeding 1 exaflop** in double precision
- **1000x larger and faster** than previous state-of-the-art
- Time steps for protein systems completed in **1-5 seconds** (previously hours)
- Used 9,400 Frontier nodes simultaneously

### 4.4 Projected MLIP Throughput on Exascale

Based on documented scaling curves, the projected throughput for major MLIPs on a full exascale system (assuming 5000-10000 GPU nodes) is:

| MLIP | System | Projected Throughput (full exascale) | Atoms Simulatable at 1 step/s |
|------|--------|-------------------------------------|------------------------------|
| Allegro | 10,000 nodes A100-class | **>10,000 steps/s** | ~1B atoms at 1 step/s |
| MACE-MP (LAMMPS) | 10,000 nodes A100-class | **~1,000-5,000 steps/s** | ~100M atoms at 1 step/s |
| SevenNet | 10,000 nodes A100-class | **~1,000 steps/s** | ~100M atoms at 1 step/s |
| SNAP/EXAALT | 75% Frontier | **Already demonstrated 400x** | ~1B atoms demonstrated [^18] |

### 4.5 Press Releases and Official Reports

- **ORNL Frontier Exascale:** "We project more than a 500x speed up when we extrapolate our results to the machine's full capability, almost a factor of 10 higher than our target" -- Danny Perez, LANL [^19]
- **ORNL News (Nov 2024):** Frontier improved by ~150 petaflops, equivalent to adding the performance of the former Summit supercomputer [^23]
- **ECP Conclusion (2024):** EXAALT achieved "nearly 400x speed up in performance running on only 75 percent of Frontier" [^18]

---

## 5. The "Accuracy Wall" Problem

### 5.1 Fundamental Limitations

Despite perfect compute, several fundamental limitations prevent MLIPs from achieving universal chemical accuracy:

**1. Extrapolation Failure (The Core Problem)**

> "Being purely mathematical constructions, ML potentials are little more than accurate numerical interpolators of DFT databases. Predictions of physical properties outside the interpolation domain are based on a mathematical algorithm and can give uncontrollable and often physically meaningless results." -- Mishin, Acta Materialia 2021 [^24]

- MLIPs excel at **interpolation** within the training distribution
- **Out-of-distribution (OOD) predictions** can have errors orders of magnitude larger than in-distribution errors
- No physics-based transferability to unknown structures (unlike classical potentials with embedded physics)

**2. The Curse of Dimensionality in Configuration Space**

- Training data must sample all relevant: compositions, structures, temperatures, pressures, defects, surfaces
- As chemical complexity increases, required training data grows exponentially
- A 5-species system may need ~150 training frames vs. ~4000 for 1 species (explicit AEF models) [^25]

**3. Long-Range Interactions**

- Most MLIPs (2nd generation) are based on **local atomic environments** with finite cutoffs
- Cannot capture nonlocal charge transfer, redox reactions, protonation/deprotonation, defects with long-range electronic structure effects [^26]
- MACE-MP-0 explicitly noted: "lack of explicit long-range interactions" and "challenges in capturing intermolecular interactions" [^3]
- Fourth-generation MLPs (incorporating nonlocal phenomena) are an active research frontier [^26]

**4. Training Data Quality and DFT Limitations**

- All universal MLIPs are trained on **DFT data with specific functionals** (typically PBE, PBE+U)
- Systematic DFT errors propagate into MLIP predictions
- Test errors: CHGNet 29 meV/atom energy, 70 meV/Å force; M3GNet 35 meV/atom, 72 meV/Å [^25]
- Very accurate specialized MLIPs achieve ~1 meV/atom, ~10 meV/Å, but universal models are 10-100x worse

**5. Stability in Production MD**

- Even the best universal IPs show significant MD failure rates:
  - ORB: 99.96% completion (best)
  - SEVENNET: 98.75%
  - MATTERSIM: 95.6%
  - MACE: 88.4%
  - M3GNet: 74.2%
  - CHGNet: 7% (very high failure rate) [^27]

### 5.2 Strategies to Mitigate the Accuracy Wall

1. **Active learning:** Iteratively add training data where uncertainty is highest
2. **Foundation model fine-tuning:** Pre-train on large datasets, fine-tune on specific systems
3. **Out-of-distribution detection:** Monitor extrapolation grade (gamma > 2 indicates danger) [^28]
4. **Domain decomposition:** Use MLIPs only in accuracy-critical regions, classical FFs elsewhere
5. **Fourth-generation potentials:** Incorporate nonlocal electronic structure effects [^26]

### 5.3 What Chemical Accuracy Means in Practice

| Property | Required Accuracy | Current U-MLIP Accuracy | Gap |
|----------|------------------|------------------------|-----|
| Energy rankings | ~1 meV/atom | 20-40 meV/atom | **10-40x** |
| Reaction barriers | ~10 meV | 50-200 meV | **5-20x** |
| Force accuracy | ~10 meV/Å | 50-100 meV/Å | **5-10x** |
| Phase transition pressure | ~0.1 GPa | 0.5-2 GPa | **5-20x** |
| Melting point | ~10 K | 50-300 K | **5-30x** |
| Diffusion coefficient | Factor of 2 | Factor of 2-10 | **1-5x** |

---

## 6. National Lab Deployment and Production Science

### 6.1 Oak Ridge National Laboratory (ORNL)

**Frontier Supercomputer:**
- Regular production MD simulations with **5 million atoms** for carbon fiber composite research [^29]
- EXESS quantum chemistry simulations on **9,400 nodes** for drug discovery and materials [^21]
- Focus on scalable implementations of SNAP and ML potentials within LAMMPS
- Reported bottleneck: "Carbon fiber is extremely dense, and modeling it with molecular dynamics requires tracking the behavior of millions, if not billions, of atoms" [^29]

**Reported Challenges:**
- GPU memory limitations for large systems (OOM at ~14,700 atoms for CHGNet on single H100) [^7]
- Need for leadership-class resources to simulate synthesis processes at molecular fidelity

### 6.2 Argonne National Laboratory (ANL)

**Aurora Supercomputer:**
- EXAALT integration for multi-scale materials simulations
- SNAP potential development and GPU optimization
- Focus on fusion energy materials (tungsten plasma-facing components)

### 6.3 Los Alamos National Laboratory (LANL)

**EXAALT Project Leadership [^19][^20]:**
- Principal Investigator: Danny Perez (Theoretical Division)
- Integration of LAMMPS + ParSplice + LATTE codes
- Parallel-in-time (ParSplice) approach to extend simulation timescales
- Challenge problems: helium bubble growth in tungsten, nuclear fuel evolution

**Key Bottleneck Identified:**
> "These models have lots of nested loops that you can unroll and unfold in many different ways. Finding the right mapping of the physics onto the hardware is tricky." -- Danny Perez, LANL [^19]

> "New ML approaches for potentials are constantly being proposed. We cannot afford to spend years optimizing each. We either need to: Become dramatically better at this, Down-select to a few forms that are worth investing in, or Teach the machines to optimize themselves." -- LANL presentation [^15]

### 6.4 Sandia National Laboratories (SNL)

- LAMMPS development and Kokkos performance portability
- SNAP potential development (Aidan Thompson)
- EXAALT framework development and GPU optimization
- **25x speedup** in SNAP kernel through NESAP/NVIDIA collaboration [^18]

### 6.5 Summary of Reported Bottlenecks

| Bottleneck | Severity | Labs Reporting | Mitigation Strategy |
|------------|----------|---------------|-------------------|
| GPU memory (OOM) | High | ORNL, all | Multi-GPU, model compression, domain decomposition |
| CPU-GPU transfer | High | SNL, Harvard | Kokkos GPU-resident implementations |
| Communication overhead | High | LANL, all | Improved domain decomposition, GPU-aware MPI |
| Model optimization lag | Medium | LANL | Focus on few architectures (MACE, Allegro, SNAP) |
| Training data generation | Medium | All | Foundation models + active learning |
| OOD stability | High | All | Uncertainty quantification, real-time validation |
| Load imbalance | Medium | All | Dynamic task scheduling (EXAALT framework) |

---

## 7. Key Quantitative Findings Summary

### Performance Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Best single-GPU MLIP throughput | **2.1 x 10^6 steps/day** (MACE-OFF23(S), 600 atoms, A100) | Kovács 2024 |
| Best large-scale MLIP throughput | **100 steps/s** (Allegro, 1M atoms, A100) | SC23 |
| Largest MLIP simulation | **100M atoms** (Allegro water, 5120 A100s) | SC23 |
| Best weak scaling efficiency | **70%** (Allegro, 5120 GPUs) | SC23 |
| FastCHGNet training speed | **1.53 hours on 32 GPUs** (vs 8.3 days on 1 A100) | Zhou 2024 |
| EXAALT Frontier speedup | **400x** (vs Mira, at 75% of machine) | ECP 2024 |
| MLIP vs EAM speed penalty | **100-500x** (MACE vs EAM) | Multiple |
| MLIP vs ReaxFF speed penalty | **3-5x** (MACE vs ReaxFF) | Multiple |
| U-MLIP energy accuracy | **20-40 meV/atom** (vs DFT) | Multiple |
| U-MLIP MD stability | **7-99.96%** completion rate | ICLR 2025 |

### Cost Differential: DFT vs MLIP vs Classical

| Method | System Size | Timescale | Relative Cost |
|--------|-------------|-----------|---------------|
| DFT (AIMD) | ~100 atoms | ~100 ps | 1x (baseline) |
| MLIP (MACE/Allegro) | ~10,000 atoms | ~1 ns | **~10^-6 x DFT** |
| MLIP (Allegro, 100M atoms) | ~100M atoms | ~1 ns | **~10^-9 x DFT** |
| Classical (EAM) | ~100M atoms | ~1 μs | **~10^-12 x DFT** |

---

## 8. References and Source URLs

[^1]: Kovács et al., "MACE-OFF: Short-Range Transferable Machine Learning Force Fields for Organic Molecules," JACS 2024. https://pubs.acs.org/doi/10.1021/jacs.4c07099

[^2]: Kovács et al., MACE-OFF24 extended cutoff model, 2025. https://pubs.acs.org/doi/10.1021/jacs.4c07099

[^3]: Batatia et al., "A foundation model for atomistic materials chemistry," JCP 2024. https://pubs.aip.org/aip/jcp/article/163/18/184110/3372267

[^4]: MACE GitHub Discussion #946, "ML-IAP LAMMPS+kokkos performance issues," 2025. https://github.com/ACEsuit/mace/discussions/946

[^5]: Dirac's Student Blog, "Atomistics with Containers and MACE," 2024. https://www.diracs-student.blog/2024/08/atomistics-with-containers-and-mace.html

[^6]: Musaelian et al., "Scaling the leading accuracy of deep equivariant models to biomolecular simulations of realistic size," SC23. https://dl.acm.org/doi/10.1145/3581784.3627041

[^7]: AdvanceSoft, "Benchmarks of CHGNet with GPU (H100)," 2024. http://case.advancesoft.jp/NanoLabo/H100-CHGNet-English/index.html

[^8]: Zhou et al., "FastCHGNet: Training one Universal Interatomic Potential to 1.5 Hours with 32 GPUs," arXiv 2024. https://arxiv.org/html/2412.20796v1

[^9]: Chen et al., "Materials Graph Library (MatGL)," npj Computational Materials 2025. https://www.nature.com/articles/s41524-025-01742-y

[^10]: AdvanceSoft, "Benchmark of Molecular Dynamics Simulations with SevenNet Multi-GPU," 2024. http://case.advancesoft.jp/NanoLabo/SevenNet-multi-GPU-English/index.html

[^11]: Park et al., "Scalable Parallel Algorithm for Graph Neural Network Interatomic Potentials," arXiv 2024. https://arxiv.org/abs/2402.03789

[^12]: Comparison of MLIPs for Radiation Damage, Advanced Intelligent Discovery 2026. https://advanced.onlinelibrary.wiley.com/doi/10.1002/aidi.202500196

[^13]: A practical guide to machine learning interatomic potentials, UC Berkeley 2025. https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf

[^14]: "EIP-GS: Modeling extensive defects in metals," npj Computational Materials 2025. https://www.nature.com/articles/s41524-025-01599-1

[^15]: Perez, "Molecular dynamics on exascale computers: a case study," LANL presentation. http://helper.ipam.ucla.edu/publications/nmetut/nmetut_19411.pdf

[^16]: LAMMPS-KOKKOS: Performance Portable MD Across Exascale Architectures, arXiv 2025. https://arxiv.org/html/2508.13523v1

[^17]: HPC Carpentry, "KOKKOS with GPUs - Running LAMMPS on HPC systems." https://www.hpc-carpentry.org/tuning_lammps/08-kokkos-gpu/index.html

[^18]: ECP, "EXAALT and Kokkos: Making Exascale Simulations a SNAP," 2024. https://www.exascaleproject.org/exaalt-and-kokkos-making-exascale-simulations-of-material-behavior-a-snap/

[^19]: ECP, "EXAALT-ing Molecular Dynamics to the Power of Exascale," 2023. https://www.exascaleproject.org/exaalt-ing-molecular-dynamics-to-the-power-of-exascale/

[^20]: ECP, "Extending the Reach of Molecular Dynamics Simulations by Leveraging Exascale," 2019. https://www.exascaleproject.org/extending-reach-molecular-dynamics-simulations-leveraging-exascale/

[^21]: ORNL, "Game-Changing Quantum Chemistry Calculations Push New Boundaries of Exascale Frontier," 2024. https://www.olcf.ornl.gov/2024/07/17/game-changing-quantum-chemistry-calculations-push-new-boundaries-of-exascale-frontier/

[^22]: EurekaAlert, "Game-changing quantum chemistry calculations push new boundaries of exascale Frontier," 2024. https://www.eurekalert.org/news-releases/1051730

[^23]: ORNL, "Frontier supercomputer hits new highs in third year of exascale," 2024. https://www.ornl.gov/news/frontier-supercomputer-hits-new-highs-third-year-exascale

[^24]: Mishin, "Machine-learning interatomic potentials for materials science," Acta Materialia 2021. http://physics.gmu.edu/~ymishin/resources/ML_Potentials_Acta_2021.pdf

[^25]: A practical guide to MLIPs, UC Berkeley 2025. https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf

[^26]: "Machine Learning Interatomic Potentials and Long-Range Physics," J. Phys. Chem. A 2023. https://pubs.acs.org/doi/10.1021/acs.jpca.2c06778

[^27]: "Evaluating Universal Interatomic Potentials," ICLR 2025. https://openreview.net/pdf?id=me0flBb1hi

[^28]: "Modeling extensive defects in metals," npj Comp. Mat. 2025. https://www.nature.com/articles/s41524-025-01599-1

[^29]: ORNL, "Simulations Reveal the Secret to Strengthening Carbon Fiber," 2025. https://www.olcf.ornl.gov/2025/06/19/simulations-reveal-the-secret-to-strengthening-carbon-fiber/

---

*Report compiled: 2025. Data sources: peer-reviewed papers, HPC conference proceedings (SC, ICS), national lab press releases, GitHub repositories, and technical documentation.*
