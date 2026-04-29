# Distilled MD Principles

*59 principles from 133 sources*
*Last updated: 2026-03-21T04:02:04.659085+00:00*

---

## Analysis (2)

### Streaming trajectory analysis avoids dump file sprawl at scale

**Category:** `analysis` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Large-scale simulations produce terabytes of dump data. Post-hoc analysis of giant text dumps is I/O-bound and wasteful. Streaming/incremental feature extraction (RDF, MSD, defect counts) during or immediately after simulation is more scalable.

**Methods:** `OVITO`, `MDAnalysis`, `YAML dumps`, `VTK`
**Properties:** RDF, MSD, defect_density
**Tags:** #streaming, #analysis, #large-scale, #I/O, #EAM, #MD, #RDF, #MSD, #OVITO
**Sources:** P20

---

### Heat current formulations require careful many-body treatment in MLIPs

**Category:** `analysis` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Computing thermal conductivity via Green-Kubo or NEMD requires correct heat current definitions. Many-body potentials (including MLIPs) introduce non-trivial terms in the heat current that standard two-body formulations miss, leading to systematic errors.

**Methods:** `MTP`, `Green-Kubo`, `NEMD`
**Properties:** thermal_conductivity, heat_current
**Tags:** #thermal-transport, #heat-current, #many-body, #MLIP, #MD
**Sources:** P17

---

## Method (8)

### ReactiveMD and ReaxFF are systematically co-deployed in modern MD workflows

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> ReactiveMD and ReaxFF co-occur in 8 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `ReactiveMD`, `ReaxFF`
**Tags:** #co-occurrence, #reactivemd, #reaxff, #MD
**Sources:** P29, P30, P31, P32, P33, P34, P35, P39

---

### Reactive MD requires sub-femtosecond timesteps for numerical stability

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> ReaxFF and reactive force fields involve bond formation/breaking with stiff potentials. Timesteps of 0.1–0.25 fs are typically required to maintain energy conservation, making reactive simulations 10-40× more expensive per unit time.

**Methods:** `ReaxFF`, `REACTION`, `REACTER`
**Materials:** FOX-7, HMX, polymers, graphene
**Properties:** energy_conservation, reaction_products
**Tags:** #reactive-MD, #timestep, #stability, #energetic-materials, #ReaxFF, #MD
**Sources:** P29, P30, P31, P33, P34

---

### Integrator choice materially affects NEMD simulation outcomes

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> Seemingly minor details in time integration (SLLOD, Nosé-Hoover chains, damping constants) can materially change viscosity, thermal conductivity, and transport properties in non-equilibrium MD. Documenting integrator choice is critical.

**Methods:** `fix npt/sllod`, `Nosé-Hoover`, `Langevin`
**Properties:** viscosity, thermal_conductivity, transport
**Tags:** #NEMD, #integrator, #rheology, #transport, #MD, #NPT, #fix
**Sources:** P13, P48

---

### Numerical stability in ReaxFF constrains timestep selection

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of FOX‑7 decomposition (ReaxFF‑lg). Pain point: Small timestep + reactive complexity; heavy compute

**Methods:** `ReaxFF`, `ReactiveMD`, `HighEnergyMaterials`
**Tags:** #stability, #timestep, #validation, #benchmarking, #ReaxFF, #MD, #compute
**Sources:** P29, P31, P30, P32, P33, P34, P35, P39, P42

---

### Polymers and ReaxFF are systematically co-deployed in modern MD workflows

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Polymers and ReaxFF co-occur in 4 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `Polymers`, `ReaxFF`
**Tags:** #co-occurrence, #polymers, #reaxff
**Sources:** P33, P35, P39, P47

---

### HighEnergyMaterials and ReaxFF are systematically co-deployed in modern MD workflows

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> HighEnergyMaterials and ReaxFF co-occur in 3 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `HighEnergyMaterials`, `ReaxFF`
**Tags:** #co-occurrence, #highenergymaterials, #reaxff
**Sources:** P29, P30, P42

---

### Polymers and ReactiveMD are systematically co-deployed in modern MD workflows

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Polymers and ReactiveMD co-occur in 3 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `Polymers`, `ReactiveMD`
**Tags:** #co-occurrence, #polymers, #reactivemd, #MD
**Sources:** P33, P35, P39

---

### Path-integral MD with MLIPs captures nuclear quantum effects efficiently

**Category:** `method` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> PIMD combined with ML potentials (e.g., DeePMD) enables quantum nuclear dynamics at near-classical cost. Efficient ring-polymer implementations (fix pimd/langevin) reduce the overhead of running 32+ beads per atom.

**Methods:** `PIMD`, `DeePMD`, `ring-polymer`
**Materials:** water, H₂O
**Properties:** quantum_dynamics, isotope_effects
**Tags:** #PIMD, #quantum, #nuclear-dynamics, #water, #DeePMD, #MD, #fix
**Sources:** P03

---

## Performance (21)

### GPU performance portability requires KOKKOS abstraction layer

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> Running LAMMPS across heterogeneous GPU/CPU architectures at exascale demands the KOKKOS abstraction. Direct CUDA or HIP code locks simulations to a single vendor. KOKKOS provides portable performance without rewriting kernels.

**Methods:** `KOKKOS`, `GPU`, `CUDA`, `HIP`
**Properties:** throughput, scaling
**Tags:** #HPC, #exascale, #portability, #LAMMPS, #KOKKOS
**Sources:** P01, P02, P04, P05, P07, P08, P59

---

### GPU and HPC are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> GPU and HPC co-occur in 7 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `GPU`, `HPC`
**Tags:** #co-occurrence, #gpu, #hpc
**Sources:** P01, P02, P03, P04, P05, P06, P16

---

### GPU and KOKKOS are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> GPU and KOKKOS co-occur in 7 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `GPU`, `KOKKOS`
**Tags:** #co-occurrence, #gpu, #kokkos
**Sources:** P01, P02, P04, P05, P07, P08, P59

---

### GPU and MLIP are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> GPU and MLIP co-occur in 5 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `GPU`, `MLIP`
**Tags:** #co-occurrence, #gpu, #mlip
**Sources:** P06, P07, P08, P16, P59

---

### Plugin architecture resolves LAMMPS licensing and distribution constraints

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> LAMMPS's GPLv2 license creates friction when distributing binaries that include incompatibly-licensed MLIP libraries. The runtime plugin system (dynamic shared objects) allows loading extensions without recompiling, sidestepping license conflicts.

**Methods:** `LAMMPS plugins`, `pair_style`, `fix`
**Properties:** compatibility, distribution
**Tags:** #plugins, #licensing, #distribution, #packaging, #LAMMPS, #MLIP, #pair_style, #fix

---

### Performance portability across architectures demands abstraction layers

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of LAMMPS‑KOKKOS: Performance Portable Molecular Dynamics Across Exascale Architectures. Pain point: Hardware heterogeneity drives portability needs

**Methods:** `KOKKOS`, `GPU`, `HPC`, `SNAP`, `ReaxFF`
**Tags:** #HPC, #portability, #ReaxFF, #LAMMPS, #SNAP, #KOKKOS
**Sources:** P01, P02, P04, P05, P60, P03, P06, P07, P08, P16, P58, P59

---

### Scaling MTP to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Kokkos‑Accelerated Moment Tensor Potential (MTP) for LAMMPS (preprint). Pain point: Need portable high‑fidelity MLIPs at scale

**Methods:** `MTP`, `KOKKOS`, `GPU`, `HPC`, `ActiveLearning`
**Tags:** #scaling, #large-scale, #LAMMPS, #MLIP, #KOKKOS
**Sources:** P04, P01, P02, P03, P05, P06, P07, P08, P16, P59

---

### GPU and SNAP are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> GPU and SNAP co-occur in 4 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `GPU`, `SNAP`
**Tags:** #co-occurrence, #gpu, #snap
**Sources:** P01, P02, P07, P08

---

### HPC and KOKKOS are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> HPC and KOKKOS co-occur in 4 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `HPC`, `KOKKOS`
**Tags:** #co-occurrence, #hpc, #kokkos
**Sources:** P01, P02, P04, P05

---

### KOKKOS and SNAP are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> KOKKOS and SNAP co-occur in 4 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `KOKKOS`, `SNAP`
**Tags:** #co-occurrence, #kokkos, #snap
**Sources:** P01, P02, P07, P08

---

### GPU and MACE are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> GPU and MACE co-occur in 4 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `GPU`, `MACE`
**Tags:** #co-occurrence, #gpu, #mace, #ACE
**Sources:** P06, P07, P08, P59

---

### Scaling Membranes to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Ion transport in polyamide (Science Advances) via LAMMPS. Pain point: Nanoscale morphology ↔ transport inference friction

**Methods:** `Membranes`, `Ions`, `Transport`, `Water`
**Tags:** #scaling, #large-scale, #LAMMPS
**Sources:** P52, P53, P54

---

### HPC and ReaxFF are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> HPC and ReaxFF co-occur in 3 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `HPC`, `ReaxFF`
**Tags:** #co-occurrence, #hpc, #reaxff
**Sources:** P01, P02, P58

---

### HPC and MLIP are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> HPC and MLIP co-occur in 3 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `HPC`, `MLIP`
**Tags:** #co-occurrence, #hpc, #mlip
**Sources:** P06, P15, P16

---

### KOKKOS and MACE are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> KOKKOS and MACE co-occur in 3 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `KOKKOS`, `MACE`
**Tags:** #co-occurrence, #kokkos, #mace, #ACE
**Sources:** P07, P08, P59

---

### KOKKOS and MLIP are systematically co-deployed in modern MD workflows

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> KOKKOS and MLIP co-occur in 3 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `KOKKOS`, `MLIP`
**Tags:** #co-occurrence, #kokkos, #mlip
**Sources:** P07, P08, P59

---

### Scaling Electrostatics to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Fast Ewald Summation with Prolates; implementations in LAMMPS and GROMACS. Pain point: Efficient long‑range electrostatics remains a scaling bottleneck

**Methods:** `Electrostatics`, `FFT`, `HPC`
**Tags:** #scaling, #large-scale, #LAMMPS
**Sources:** P11

---

### Scaling Multiscale to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Quasi‑atom method (simultaneous atomistic + continuum). Pain point: Bridging scales efficiently remains hard

**Methods:** `Multiscale`, `AtC`, `HPC`
**Tags:** #scaling, #large-scale
**Sources:** P14

---

### Scaling HPC to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Improving LAMMPS performance on large‑scale HPC systems. Pain point: Scaling/efficiency challenges on large systems

**Methods:** `HPC`, `Performance`, `Scaling`, `MPI`
**Tags:** #scaling, #large-scale, #LAMMPS
**Sources:** P23

---

### Scaling MD‑FEA to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Integrated MD‑FEA approach using LAMMPS. Pain point: Multiscale coupling and parameter handoffs

**Methods:** `MD‑FEA`, `Mechanical`, `Nanocomposites`
**Tags:** #scaling, #large-scale, #interoperability, #coupling, #LAMMPS, #MD, #DOF
**Sources:** P49

---

### Scaling Biomaterials to large systems reveals I/O and memory bottlenecks

**Category:** `performance` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Biomimetic tendon‑like materials: multiscale toughening. Pain point: Bridging scales + validation complexity

**Methods:** `Biomaterials`, `Mechanical`, `Multiscale`
**Tags:** #scaling, #large-scale, #validation, #benchmarking
**Sources:** P50

---

## Potential (5)

### MACE and MLIP are systematically co-deployed in modern MD workflows

**Category:** `potential` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> MACE and MLIP co-occur in 5 papers in the corpus, indicating a systematic workflow or performance relationship.

**Methods:** `MACE`, `MLIP`
**Tags:** #co-occurrence, #mace, #mlip, #ACE
**Sources:** P06, P07, P08, P59, P60

---

### Active learning loops automate training data generation for MLIPs

**Category:** `potential` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> DP-GEN and similar active learning frameworks identify configurations where the MLIP is uncertain, run DFT on those configurations, and retrain. This avoids redundant training data and systematically fills gaps in chemical/configurational space.

**Methods:** `DP-GEN`, `active learning`, `DeePMD`, `MTP`
**Properties:** accuracy, transferability, uncertainty
**Tags:** #active-learning, #MLIP, #training-data, #automation, #DeePMD, #ACE, #DFT, #MD
**Sources:** P04, P05

---

### MLIP spatial mixing recovers accuracy at reduced computational cost

**Category:** `potential` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> High-fidelity MLIPs are too expensive to run everywhere in a simulation box. ML-MIX enables spatial mixing of cheap and expensive potentials, applying the expensive model only where needed (e.g., near defects) for up to 11× speedup.

**Methods:** `MACE`, `ACE`, `SNAP`, `ML-MIX`
**Properties:** accuracy, computational_cost
**Tags:** #MLIP, #cost-reduction, #spatial-mixing, #MACE, #SNAP, #ACE
**Sources:** P07, P08

---

### Model-agnostic MLIP deployment enables cross-architecture portability

**Category:** `potential` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Tools like chemtrain-deploy and metatensor provide model-agnostic deployment of MLIPs into standard MD engines. Without this, each potential architecture (MACE, Allegro, DeePMD) requires bespoke integration and GPU dispatch code.

**Methods:** `MACE`, `Allegro`, `PaiNN`, `metatensor`, `metatomic`
**Properties:** portability, interoperability
**Tags:** #MLIP, #deployment, #model-agnostic, #interoperability, #DeePMD, #MACE, #ACE, #MD
**Sources:** P06, P60

---

### Charge equilibration adds significant complexity to MLIP deployment

**Category:** `potential` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Fourth-generation high-dimensional neural network potentials (4G-HDNNPs) require iterative charge equilibration at every MD step. This adds both computational cost and implementation complexity compared to charge-neutral MLIPs.

**Methods:** `HDNNP`, `n2p2`, `QEq`
**Properties:** charge_distribution, electrostatics
**Tags:** #charge-equilibration, #MLIP, #electrostatics, #MD
**Sources:** P18

---

## Validation (7)

### DFT-vs-MD cross-validation establishes multiscale simulation credibility

**Category:** `validation` · **Scale:** `multiscale` · **Confidence:** 🟢 Established

> Comparing MD results (energy, forces, structure) against DFT reference calculations is the standard validation procedure for both classical and ML potentials. Without systematic cross-validation, MD predictions lack quantitative credibility.

**Methods:** `DFT`, `VASP`, `ABACUS`, `EAM`, `MLIP`
**Properties:** energy, forces, structure
**Tags:** #validation, #DFT, #cross-validation, #accuracy, #EAM, #MLIP, #MD
**Sources:** P43

---

### Systematic benchmarking is essential for MLIP reliability

**Category:** `validation` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of ML‑MIX (npj Computational Materials). Pain point: MLIP cost vs accuracy tradeoff; extends feasible scales

**Methods:** `MLIP`, `ACE`, `SNAP`, `MACE`, `GPU`
**Tags:** #validation, #benchmarking, #scaling, #large-scale, #MLIP, #MACE, #SNAP, #ACE
**Sources:** P08, P18, P01, P02, P06, P07, P16, P59, P60

---

### LAMMPS input script validation prevents silent simulation errors

**Category:** `validation` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Complex LAMMPS input scripts can contain unit mismatches, incompatible fix/pair_style combinations, and missing package dependencies that produce silently wrong results. Static validation (linting) of input scripts is an unmet need across the community.

**Methods:** `LAMMPS`
**Properties:** correctness, reproducibility
**Tags:** #validation, #linting, #input-scripts, #correctness, #LAMMPS, #pair_style, #fix
**Sources:** P09, P21, P22

---

### Reproducible Dataset workflows require automated provenance capture

**Category:** `validation` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of ElectroFace dataset: MLMD trajectories via LAMMPS + DeePMD. Pain point: Dataset/provenance tooling is central

**Methods:** `Dataset`, `DeePMD`, `MLIP`, `Reproducibility`
**Tags:** #reproducibility, #provenance, #workflow, #automation, #LAMMPS, #MLIP, #DeePMD, #ACE, #MD
**Sources:** P41, P40

---

### Systematic benchmarking is essential for Rheology reliability

**Category:** `validation` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Rate‑dependent shear viscosity; fix npt/sllod validation. Pain point: Implementation/validation of NEMD fixes is nontrivial

**Methods:** `Rheology`, `Integrator`, `NonEquilibrium`
**Tags:** #validation, #benchmarking, #MD, #NPT, #fix
**Sources:** P48, P13

---

### Reproducible RNG workflows require automated provenance capture

**Category:** `validation` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Faster RANMAR RNG in LAMMPS + jump‑ahead. Pain point: RNG cost and reproducibility/scaling concerns

**Methods:** `RNG`, `HPC`, `Reproducibility`
**Tags:** #reproducibility, #provenance, #scaling, #large-scale, #LAMMPS
**Sources:** P12

---

### Reproducible Polymers workflows require automated provenance capture

**Category:** `validation` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Ion distribution at polymer/ceramic interfaces. Pain point: Workflow chart referenced; suggests reproducibility need

**Methods:** `Polymers`, `Interfaces`, `Electrolytes`
**Tags:** #reproducibility, #provenance, #workflow, #automation, #ACE
**Sources:** P46

---

## Workflow (16)

### MLIP deployment bottleneck has shifted from training to production validation

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟢 Established

> Training ML interatomic potentials is increasingly automated (DP-GEN, active learning). The real bottleneck is now deploying, validating, benchmarking, and trusting models in production MD runs — especially across different hardware and LAMMPS versions.

**Methods:** `DeePMD`, `MACE`, `ACE`, `MTP`, `SNAP`
**Properties:** deployment, validation, uncertainty
**Tags:** #MLIP-ops, #deployment, #validation, #production, #LAMMPS, #MLIP, #DeePMD, #MACE, #SNAP, #ACE, #MD
**Sources:** P06, P15, P16, P18, P60, P07, P08

---

### Multi-tool workflow handoffs are the dominant friction in applied MD

**Category:** `workflow` · **Scale:** `multiscale` · **Confidence:** 🟢 Established

> Real-world MD workflows chain together Atomsk → LAMMPS → OVITO → Python scripts. Each handoff is manual, brittle, and unreproducible. Even 2025-2026 applied papers show researchers stitching 3-5 tools together without standardized data flow.

**Methods:** `Atomsk`, `OVITO`, `Materials Studio`, `VMD`
**Properties:** reproducibility, workflow_integrity
**Tags:** #workflow, #fragmentation, #reproducibility, #tooling, #LAMMPS, #MD, #OVITO, #VMD, #DOF
**Sources:** P27, P28, P47

---

### Provenance capture is essential for reproducible MD research

**Category:** `workflow` · **Scale:** `multiscale` · **Confidence:** 🟢 Established

> Reproducibility requires capturing the exact LAMMPS version, enabled packages, potential files (with DOI/KIM IDs), GPU settings, compiler flags, and random seeds. Most workflows capture none of this automatically.

**Methods:** `LAMMPS`, `OpenKIM`
**Properties:** reproducibility, provenance
**Tags:** #provenance, #reproducibility, #metadata, #FAIR, #LAMMPS, #OpenKIM
**Sources:** P41, P22

---

### Workflow automation reduces friction in ReaxFF simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Pyrolysis of polyimide and epoxy resin (ReaxFF). Pain point: Reactive workflows depend on upstream structure prep

**Methods:** `ReaxFF`, `ReactiveMD`, `Polymers`, `MaterialsStudio`
**Tags:** #workflow, #automation, #EAM, #ReaxFF, #MD
**Sources:** P33, P47, P25, P29, P30, P31, P32, P34, P35, P39

---

### MACE deployment requires standardized packaging and validation

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of ZIF phase transitions using LAMMPS_MACE + KOKKOS GPU. Pain point: Deploying/maintaining MLIP GPU integrations

**Methods:** `MACE`, `MLIP`, `KOKKOS`, `GPU`, `MOFs`
**Tags:** #deployment, #MLIP-ops, #LAMMPS, #MLIP, #MACE, #ACE, #KOKKOS
**Sources:** P59, P01, P02, P04, P05, P06, P07, P08, P16, P60

---

### MLIP deployment requires standardized packaging and validation

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of chemtrain‑deploy: model‑agnostic deployment of MLPs in million‑atom MD. Pain point: Notes lack of model‑agnostic + multi‑GPU‑parallel deployment tools in standard MD

**Methods:** `MLIP`, `MACE`, `Allegro`, `PaiNN`, `GPU`
**Tags:** #deployment, #MLIP-ops, #MLIP, #MACE, #ACE, #MD
**Sources:** P06, P15, P18, P07, P08, P16, P59, P60

---

### Cross-code coupling requires standardized interfaces for Water

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Ions on water: LAMMPS interfaced with MBX (ChemRxiv). Pain point: Cross‑code coupling and packaging complexity

**Methods:** `Water`, `Ions`, `Coupling`, `MBX`, `Electrostatics`
**Tags:** #interoperability, #coupling, #LAMMPS, #ACE
**Sources:** P53, P52, P54

---

### Workflow automation reduces friction in PythonWorkflow simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of NAVIS: LAMMPS‑Python framework for nanochannel slip. Pain point: Need efficient, reproducible interfacial slip extraction workflows

**Methods:** `PythonWorkflow`, `Nanofluidics`, `ThermalTransport`, `InterfacialSlip`
**Tags:** #workflow, #automation, #reproducibility, #provenance, #LAMMPS
**Sources:** P10, P19

---

### Workflow automation reduces friction in EAM simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Vanadium grain boundary migration under gradients. Pain point: Workflow relies on multiple tools (Atomsk/OVITO)

**Methods:** `EAM`, `GrainBoundaries`, `Atomsk`, `OVITO`
**Tags:** #workflow, #automation, #EAM, #OVITO
**Sources:** P27, P28

---

### Workflow automation reduces friction in ML simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Multi‑fidelity ML prediction using LAMMPS MD + TensorFlow. Pain point: Data‑pipeline coupling (MD→ML) adds friction

**Methods:** `ML`, `EAM`, `Atomsk`, `OVITO`, `TensorFlow`
**Tags:** #workflow, #automation, #interoperability, #coupling, #EAM, #LAMMPS, #MD, #OVITO
**Sources:** P28, P27

---

### Cross-code coupling requires standardized interfaces for MTP

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Heat current + thermal conductivity using MTP/LAMMPS interface. Pain point: Correct many‑body heat current definitions + interfaces matter

**Methods:** `MTP`, `ThermalTransport`, `Methodology`
**Tags:** #interoperability, #coupling, #LAMMPS, #ACE
**Sources:** P17

---

### Cross-code coupling requires standardized interfaces for CVFF

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Epoxy coating + concrete interface MD (CVFF/ClayFF). Pain point: Multi‑FF coupling and interfacial metrics friction

**Methods:** `CVFF`, `ClayFF`, `Concrete`, `Coatings`
**Tags:** #interoperability, #coupling, #ACE, #MD
**Sources:** P36

---

### ReaxFF‑nn deployment requires standardized packaging and validation

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of ReaxFF‑nn in GULP/LAMMPS; thermal conductivity of carbon. Pain point: Reactive ML augmentation + deployment complexity

**Methods:** `ReaxFF‑nn`, `MLIP`, `ThermalTransport`
**Tags:** #deployment, #MLIP-ops, #ReaxFF, #LAMMPS, #MLIP
**Sources:** P38

---

### Workflow automation reduces friction in GasSurface simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Reflected gas behavior in rarefied flow using LAMMPS. Pain point: Accurate boundary models & analysis workflows

**Methods:** `GasSurface`, `LJ`, `NonEquilibrium`
**Tags:** #workflow, #automation, #LAMMPS, #ACE
**Sources:** P45

---

### Workflow automation reduces friction in CoarseGrained simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Multiple‑network elastomers: coarse‑grained MD in LAMMPS. Pain point: Large ensembles + analysis pipelines

**Methods:** `CoarseGrained`, `Polymers`, `SoftMatter`
**Tags:** #workflow, #automation, #LAMMPS, #MD
**Sources:** P51

---

### Workflow automation reduces friction in Composites simulation pipelines

**Category:** `workflow` · **Scale:** `atomic` · **Confidence:** 🟡 Emerging

> Derived from friction analysis of Fiber–NASH composite interfacial MD using LAMMPS (MDPI). Pain point: Long equilibration pipelines are common

**Methods:** `Composites`, `Cement`, `Interfaces`
**Tags:** #workflow, #automation, #LAMMPS, #ACE, #MD
**Sources:** P55

---
