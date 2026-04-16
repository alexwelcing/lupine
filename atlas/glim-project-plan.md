# glim: Atomic-scale Theory, Learning, and Simulation
## Unified Open-Source Computational Materials Science Platform

### Project Charter & Technical Architecture

---

## 1. Vision Statement

**glim** is a ground-up, open-source computational materials science platform that unifies three pillars of modern materials simulation into a single, coherent codebase:

1. **Quantum DFT Engine** — VASP-compatible plane-wave PAW density functional theory
2. **Molecular Dynamics Engine** — LAMMPS-compatible large-scale classical and reactive MD
3. **ML Potential Pipeline** — Integrated training, validation, and deployment of machine learning interatomic potentials

The core thesis: **the future of materials simulation is the seamless flow from electronic structure → ML potential generation → production-scale MD → property prediction**, and no existing tool covers this full pipeline in a unified, modern, open-source package.

VASP is commercially locked. LAMMPS is GPL and 30 years old (C++ with Fortran-era patterns). Quantum ESPRESSO, ABINIT, and others each solve one piece. **glim solves the whole stack.**

---

## 2. Why This Matters

### 2.1 The Fragmented Landscape

A typical materials research workflow in 2026 looks like:

```
VASP (DFT, commercial)          →  ad-hoc Python scripts  →  DeePMD-kit (ML training)
    ↓                                                              ↓
pymatgen (data extraction)       →  manual file conversion  →  LAMMPS (production MD)
    ↓                                                              ↓
custom analysis scripts          →  manual validation       →  OVITO/VESTA (viz)
```

Every arrow is a potential failure point. File format conversions lose metadata. Validation is manual. The DFT→MLIP→MD pipeline requires expertise in 4-6 separate software packages, each with its own input syntax, data model, and community conventions.

### 2.2 The Unified Alternative

```
glim
├── glim dft    → VASP-compatible quantum calculations
├── glim train  → ML potential training from DFT data (DeePMD, MACE, Allegro, NequIP)
├── glim md     → Large-scale molecular dynamics (LAMMPS-compatible)
├── glim flow   → Automated DFT → train → validate → MD workflows
└── glim verify → Continuous verification against VASP/LAMMPS reference data
```

One input data model. One configuration system. One verification framework. Shared memory representations between DFT and MD. Native ML potential support at every level.

### 2.3 The Academic Adoption Equation

Researchers will switch when:
- **Mathematical equivalence** is proven (Δ < 1 meV/atom vs. VASP; bit-level force agreement vs. LAMMPS)
- **Migration cost** is zero (reads VASP and LAMMPS input files natively)
- **Capability** exceeds what they have (integrated ML pipeline, differentiable simulation)
- **Access** is unrestricted (permissive open-source license, no cost)

---

## 3. The Verification Imperative

### 3.1 DFT Verification (vs. VASP)

**Gold standard:** Delta Codes DFT benchmark — 71 elemental crystals, PBE functional, Birch-Murnaghan EOS comparison.

| Tier | What | Target | Timeline |
|------|------|--------|----------|
| 1 | Unit-level kernel verification | Analytical match | Months 1–6 |
| 2 | Single-SCF total energy (10 systems) | < 0.1 meV/atom vs. VASP | Months 4–9 |
| 3 | Full Delta benchmark (71 elements) | Δ < 1 meV/atom | Months 8–14 |
| 4 | Properties: bands, DOS, phonons, elastics | Quantitative match | Months 12–18 |
| 5 | Advanced: HSE06, GW, RPA, SOC | Published reference match | Months 18–30 |

**Per-element verification protocol:**
1. Compute total energy at 7 volumes around equilibrium
2. Fit Birch-Murnaghan EOS → extract V₀, B₀, B₁
3. Compare RMS energy difference vs. VASP reference data
4. Report per-element Δ and aggregate statistics
5. All inputs, outputs, and comparison scripts committed to repository

### 3.2 MD Verification (vs. LAMMPS)

LAMMPS is already open-source, so verification means **numerical equivalence** for identical force fields and algorithms, ensuring the port is correct.

| Tier | What | Target | Timeline |
|------|------|--------|----------|
| 1 | Pair potentials: LJ, Morse, EAM, Tersoff | Bit-identical forces | Months 1–4 |
| 2 | Integrators: velocity-Verlet, rRESPA | Trajectory match to machine precision | Months 2–5 |
| 3 | Neighbor lists: Verlet, half/full | Identical pair enumeration | Months 1–3 |
| 4 | Thermostats/barostats: NVE, NVT (NH), NPT | Statistical ensemble equivalence | Months 4–8 |
| 5 | Many-body: EAM, MEAM, ReaxFF, Tersoff | Force/energy match for 50 test configs | Months 6–12 |
| 6 | Long-range: Ewald, PPPM | Energy match to specified accuracy | Months 6–10 |
| 7 | LAMMPS regression suite (500+ tests) | 100% pass rate | Months 10–16 |
| 8 | Parallel decomposition equivalence | Identical results 1–1024 ranks | Months 8–14 |

**Methodology:**
- Run identical input scripts on both LAMMPS and glim-MD
- Compare: total energy, per-atom forces, stress tensor, thermodynamic averages
- For deterministic algorithms: require bit-identical results (given same RNG seeds)
- For stochastic algorithms: require statistical equivalence (Kolmogorov-Smirnov test on distributions)
- LAMMPS regression test suite ported and passing as gate for every release

### 3.3 ML Potential Verification

| What | Target |
|------|--------|
| Training data pipeline | Identical descriptor computation vs. reference implementations |
| Model inference | Force/energy match to < 0.01 meV/atom vs. standalone frameworks |
| Active learning triggers | Same uncertainty estimates as reference implementations |
| End-to-end: DFT → train → MD | Properties within statistical uncertainty of pure DFT-MD |

### 3.4 Continuous Verification Infrastructure

```
Every commit:
  Level 1: Unit tests (< 2 min)
  Level 2: Quick integration — Si/Al/Fe energy + LJ/EAM forces (< 15 min)

Nightly:
  Level 3: 20-material DFT property suite (< 4 hours)
  Level 4: 50-system MD regression suite (< 2 hours)
  Level 5: ML training + inference validation (< 1 hour)

Weekly:
  Level 6: Full 71-element Delta benchmark (< 24 hours)
  Level 7: Full LAMMPS regression suite (< 8 hours)
  Level 8: Performance benchmarks with trend tracking
```

Public dashboard at `verify.glim-sim.org` showing real-time Δ-factors, LAMMPS regression status, and performance trends.

---

## 4. Technical Architecture

### 4.1 Language Strategy

**Primary: Rust** with C/Fortran FFI for numerical libraries

| Consideration | Rust | Modern Fortran | C++ |
|---------------|------|---------------|-----|
| Memory safety | ✅ Compile-time | ❌ | ❌ |
| Performance | ≈ C/Fortran | ≈ C | ≈ C/Fortran |
| Package ecosystem | cargo, crates.io | Limited | vcpkg/conan (fragmented) |
| GPU support | rust-cuda, wgpu (maturing) | OpenACC, OpenMP | CUDA, HIP, SYCL (mature) |
| Community growth | Fastest-growing systems lang | Declining | Stable |
| Contribution barrier | Medium (learning curve) | Low (existing community) | Medium |
| FFI with C/Fortran | Excellent | Native | Native |
| Python bindings | PyO3 (excellent) | f2py (adequate) | pybind11 (good) |

**Decision:** Rust core with CUDA/HIP kernels in C++ for GPU, Fortran FFI for BLAS/LAPACK/ScaLAPACK/FFTW. Python bindings via PyO3 for the entire API surface.

**Critical dependencies:**
- FFTW3 / cuFFT / rocFFT (FFT)
- OpenBLAS / MKL / AOCL (linear algebra)
- ScaLAPACK (distributed LA)
- MPI (OpenMPI / MPICH)
- libxc (XC functionals)
- spglib (symmetry)
- HDF5 (large data I/O)
- PyTorch C++ API (libtorch) for ML inference
- ONNX Runtime (model-agnostic ML inference)

### 4.2 Unified Data Model

The key architectural innovation: a **shared atomic system representation** that serves DFT, MD, and ML equally.

```rust
/// Core representation shared across all engines
pub struct AtomicSystem {
    // Geometry
    pub cell: Cell,                    // Lattice vectors, PBC flags
    pub species: Vec<Element>,         // Atomic species
    pub positions: Array2<f64>,        // Cartesian coordinates [N_atoms × 3]
    pub velocities: Option<Array2<f64>>,
    
    // Per-atom properties (extensible)
    pub properties: PropertyStore,     // forces, charges, spins, custom fields
    
    // Topology (for MD)
    pub topology: Option<Topology>,    // bonds, angles, dihedrals, impropers
    
    // Electronic structure (for DFT)
    pub electronic: Option<ElectronicState>,  // wavefunctions, density, potential
    
    // ML descriptors (for MLIP)
    pub descriptors: Option<DescriptorCache>, // cached atomic environment descriptors
    
    // Metadata
    pub metadata: Metadata,            // provenance, units, history
}

/// Seamless conversion between engine representations
impl From<&AtomicSystem> for DftInput { ... }
impl From<&AtomicSystem> for MdInput { ... }
impl From<&AtomicSystem> for MlTrainingFrame { ... }
```

This means:
- DFT output structures feed directly into MD initial configurations
- MD snapshots feed directly into ML training pipelines
- ML descriptors computed once, shared between training and inference
- No file format conversion, no data loss, no metadata stripping

### 4.3 Module Architecture

```
glim/
├── crates/
│   ├── glim-core/                    # Shared data model, units, math utilities
│   │   ├── system.rs                  # AtomicSystem, Cell, Element
│   │   ├── properties.rs              # Extensible per-atom property store
│   │   ├── units.rs                   # Physical units with compile-time checking
│   │   ├── math/                      # Linear algebra, FFT, special functions
│   │   └── parallel/                  # MPI abstractions, domain decomposition
│   │
│   ├── glim-dft/                     # ═══ QUANTUM DFT ENGINE ═══
│   │   ├── basis/
│   │   │   ├── plane_waves.rs         # G-vector generation, kinetic energy cutoff
│   │   │   └── fft_grid.rs            # Real ↔ reciprocal space transforms
│   │   ├── paw/
│   │   │   ├── dataset.rs             # PAW dataset reader (JTH XML, GPAW, POTCAR-compat)
│   │   │   ├── projectors.rs          # Nonlocal PAW projector application
│   │   │   ├── one_center.rs          # One-center PAW corrections
│   │   │   ├── augmentation.rs        # Compensation charge density
│   │   │   └── density.rs             # PAW density construction
│   │   ├── potential/
│   │   │   ├── hartree.rs             # Poisson equation (reciprocal space)
│   │   │   ├── xc.rs                  # Exchange-correlation via libxc
│   │   │   ├── local_pp.rs            # Local pseudopotential
│   │   │   ├── nonlocal_pp.rs         # Nonlocal PP + PAW
│   │   │   └── external.rs            # External fields (electric, magnetic)
│   │   ├── hamiltonian/
│   │   │   ├── apply.rs               # H|ψ⟩ = (T + V_local + V_NL)|ψ⟩
│   │   │   ├── kinetic.rs             # Kinetic energy operator
│   │   │   └── overlap.rs             # PAW overlap matrix S
│   │   ├── solver/
│   │   │   ├── davidson.rs            # Blocked Davidson eigensolver
│   │   │   ├── rmm_diis.rs            # Residual minimization (VASP default)
│   │   │   ├── cg.rs                  # Conjugate gradient
│   │   │   └── lobpcg.rs              # Locally optimal block preconditioned CG
│   │   ├── mixing/
│   │   │   ├── pulay.rs               # Pulay/DIIS charge mixing
│   │   │   ├── kerker.rs              # Kerker preconditioning
│   │   │   └── broyden.rs             # Broyden mixing
│   │   ├── scf/
│   │   │   ├── loop.rs                # Self-consistent field driver
│   │   │   ├── convergence.rs         # Energy/density convergence criteria
│   │   │   └── occupations.rs         # Smearing: Gaussian, MP, Fermi-Dirac
│   │   ├── kpoints/
│   │   │   ├── mesh.rs                # Monkhorst-Pack, Gamma-centered
│   │   │   ├── path.rs                # Band structure k-paths
│   │   │   └── symmetry.rs            # IBZ reduction via spglib
│   │   ├── properties/
│   │   │   ├── band_structure.rs
│   │   │   ├── dos.rs                 # Total and projected DOS
│   │   │   ├── forces.rs              # Hellmann-Feynman + Pulay corrections
│   │   │   ├── stress.rs              # Stress tensor
│   │   │   ├── dielectric.rs          # Dielectric function
│   │   │   ├── born_charges.rs        # Born effective charges
│   │   │   └── magnetic.rs            # Collinear + non-collinear magnetism
│   │   └── advanced/
│   │       ├── hybrid.rs              # HSE06, PBE0 (adaptively compressed exchange)
│   │       ├── gw.rs                  # GW quasiparticle energies
│   │       ├── rpa.rs                 # RPA correlation
│   │       ├── soc.rs                 # Spin-orbit coupling
│   │       ├── dftu.rs                # DFT+U (Dudarev, Liechtenstein)
│   │       └── vdw.rs                 # DFT-D3, DFT-D4, rVV10
│   │
│   ├── glim-md/                      # ═══ MOLECULAR DYNAMICS ENGINE ═══
│   │   ├── neighbor/
│   │   │   ├── verlet_list.rs         # Verlet neighbor lists (half/full)
│   │   │   ├── cell_list.rs           # Cell-linked list construction
│   │   │   ├── stencil.rs             # Stencil for processor decomposition
│   │   │   └── exclusions.rs          # 1-2, 1-3, 1-4 molecular exclusions
│   │   ├── pair/                      # ─── Pairwise potentials ───
│   │   │   ├── lj.rs                  # Lennard-Jones (cut, smooth, shift)
│   │   │   ├── morse.rs               # Morse potential
│   │   │   ├── buck.rs                # Buckingham
│   │   │   ├── coulomb.rs             # Coulombic (short-range)
│   │   │   ├── born.rs                # Born-Mayer-Huggins
│   │   │   ├── yukawa.rs              # Yukawa (screened Coulomb)
│   │   │   ├── dpd.rs                 # Dissipative particle dynamics
│   │   │   └── table.rs               # Tabulated pair potentials
│   │   ├── manybody/                  # ─── Many-body potentials ───
│   │   │   ├── eam.rs                 # Embedded atom method (+ alloy, FS)
│   │   │   ├── meam.rs                # Modified EAM
│   │   │   ├── tersoff.rs             # Tersoff (Si, C, SiC, BN...)
│   │   │   ├── sw.rs                  # Stillinger-Weber
│   │   │   ├── vashishta.rs           # Vashishta
│   │   │   ├── snap.rs                # Spectral Neighbor Analysis Potential
│   │   │   ├── ace.rs                 # Atomic Cluster Expansion
│   │   │   └── reaxff.rs              # Reactive force field (bond-order)
│   │   ├── bonded/                    # ─── Molecular interactions ───
│   │   │   ├── bond.rs                # Harmonic, FENE, Morse bonds
│   │   │   ├── angle.rs               # Harmonic, cosine, SDK angles
│   │   │   ├── dihedral.rs            # OPLS, harmonic, multi-harmonic
│   │   │   ├── improper.rs            # Improper torsions
│   │   │   └── special_bonds.rs       # 1-2, 1-3, 1-4 scaling
│   │   ├── longrange/                 # ─── Electrostatics ───
│   │   │   ├── ewald.rs               # Ewald summation
│   │   │   ├── pppm.rs                # Particle-particle particle-mesh
│   │   │   ├── msm.rs                 # Multi-level summation method
│   │   │   └── wolf.rs                # Wolf summation (damped shifted)
│   │   ├── integrate/                 # ─── Time integration ───
│   │   │   ├── velocity_verlet.rs     # Standard velocity-Verlet
│   │   │   ├── respa.rs               # rRESPA multi-timestep
│   │   │   └── constraints.rs         # SHAKE, RATTLE, rigid body
│   │   ├── thermostat/                # ─── Temperature control ───
│   │   │   ├── nose_hoover.rs         # Nosé-Hoover chains
│   │   │   ├── langevin.rs            # Langevin dynamics
│   │   │   ├── berendsen.rs           # Berendsen (weak coupling)
│   │   │   └── csvr.rs                # Canonical SVR
│   │   ├── barostat/                  # ─── Pressure control ───
│   │   │   ├── nose_hoover.rs         # NH-NPT
│   │   │   ├── parrinello_rahman.rs   # Variable cell shape
│   │   │   └── berendsen.rs           # Berendsen barostat
│   │   ├── minimize/                  # ─── Energy minimization ───
│   │   │   ├── cg.rs                  # Conjugate gradient
│   │   │   ├── fire.rs                # FIRE algorithm
│   │   │   ├── lbfgs.rs               # L-BFGS
│   │   │   └── sd.rs                  # Steepest descent
│   │   ├── enhanced_sampling/         # ─── Rare events ───
│   │   │   ├── metadynamics.rs        # Well-tempered metadynamics
│   │   │   ├── umbrella.rs            # Umbrella sampling
│   │   │   ├── replica_exchange.rs    # Parallel tempering
│   │   │   ├── neb.rs                 # Nudged elastic band
│   │   │   └── plumed_interface.rs    # PLUMED integration
│   │   ├── granular/                  # ─── Granular mechanics ───
│   │   │   ├── hertz.rs               # Hertzian contact
│   │   │   ├── hooke.rs               # Hookean contact
│   │   │   └── granular_model.rs      # General granular pair style
│   │   ├── sph/                       # ─── Smoothed particle hydro ───
│   │   │   ├── sph_kernel.rs          # SPH kernels
│   │   │   ├── rheo.rs                # RHEO package equivalent
│   │   │   └── heat.rs                # SPH heat transfer
│   │   └── analysis/                  # ─── On-the-fly analysis ───
│   │       ├── rdf.rs                 # Radial distribution function
│   │       ├── msd.rs                 # Mean squared displacement
│   │       ├── compute.rs             # General compute infrastructure
│   │       └── dump.rs                # Trajectory output (various formats)
│   │
│   ├── glim-ml/                      # ═══ ML POTENTIAL PIPELINE ═══
│   │   ├── descriptors/
│   │   │   ├── symmetry_functions.rs  # Behler-Parrinello symmetry functions
│   │   │   ├── soap.rs                # Smooth overlap of atomic positions
│   │   │   ├── ace.rs                 # Atomic cluster expansion descriptors
│   │   │   └── graph.rs               # Graph-based representations
│   │   ├── models/
│   │   │   ├── deepmd.rs              # DeePMD-kit compatible models
│   │   │   ├── nequip.rs              # NequIP equivariant GNN
│   │   │   ├── allegro.rs             # Allegro (local equivariant)
│   │   │   ├── mace.rs                # MACE multi-body expansion
│   │   │   └── generic_nn.rs          # Generic NN potential interface
│   │   ├── training/
│   │   │   ├── dataset.rs             # Training data management
│   │   │   ├── trainer.rs             # Training loop with validation
│   │   │   ├── loss.rs                # Energy/force/stress loss functions
│   │   │   └── hyperopt.rs            # Hyperparameter optimization
│   │   ├── active_learning/
│   │   │   ├── uncertainty.rs         # Ensemble uncertainty estimation
│   │   │   ├── query_strategy.rs      # When to request new DFT data
│   │   │   ├── oracle.rs              # Interface to DFT engine for new calcs
│   │   │   └── falcon.rs              # FALCON-style on-the-fly training
│   │   ├── inference/
│   │   │   ├── libtorch.rs            # PyTorch C++ inference
│   │   │   ├── onnx.rs                # ONNX Runtime inference
│   │   │   └── native.rs              # Pure Rust inference (no framework dep)
│   │   ├── foundation/
│   │   │   ├── universal_mlip.rs      # Foundation model interface
│   │   │   ├── fine_tune.rs           # System-specific fine-tuning
│   │   │   └── transfer.rs            # Transfer learning utilities
│   │   └── validation/
│   │       ├── delta_test.rs          # Compare MLIP vs DFT for Delta benchmark
│   │       ├── property_test.rs       # Phonons, elastic, thermal expansion
│   │       └── extrapolation.rs       # Detect out-of-distribution configs
│   │
│   ├── glim-io/                      # ═══ I/O COMPATIBILITY LAYER ═══
│   │   ├── vasp/                      # VASP-format readers/writers
│   │   │   ├── incar.rs               # INCAR tag=value parser
│   │   │   ├── poscar.rs              # POSCAR/CONTCAR
│   │   │   ├── kpoints.rs             # KPOINTS
│   │   │   ├── potcar.rs              # POTCAR PAW data (+ JTH converter)
│   │   │   ├── outcar.rs              # OUTCAR output
│   │   │   ├── doscar.rs              # Density of states
│   │   │   ├── eigenval.rs            # Eigenvalues
│   │   │   ├── chgcar.rs              # Charge density
│   │   │   ├── wavecar.rs             # Wavefunctions
│   │   │   └── vasprun_xml.rs         # vasprun.xml (pymatgen compatible)
│   │   ├── lammps/                    # LAMMPS-format readers/writers
│   │   │   ├── input_script.rs        # LAMMPS input script parser
│   │   │   ├── data_file.rs           # LAMMPS data file (atom, bond, etc.)
│   │   │   ├── dump.rs                # dump custom/atom/xyz formats
│   │   │   ├── restart.rs             # Binary restart files
│   │   │   ├── log.rs                 # Thermo output log
│   │   │   └── potential_files.rs     # EAM, Tersoff, ReaxFF param files
│   │   ├── standard/                  # Community standard formats
│   │   │   ├── cif.rs                 # Crystallographic Information File
│   │   │   ├── xyz.rs                 # Extended XYZ
│   │   │   ├── pdb.rs                 # Protein Data Bank
│   │   │   └── hdf5.rs               # HDF5 for large datasets
│   │   └── ecosystem/                 # Ecosystem compatibility
│   │       ├── pymatgen.rs            # pymatgen Structure serialization
│   │       ├── ase.rs                 # ASE Atoms serialization
│   │       └── aiida.rs               # AiiDA provenance integration
│   │
│   ├── glim-parallel/                # ═══ PARALLELIZATION ═══
│   │   ├── mpi/
│   │   │   ├── communicator.rs        # MPI wrapper with Rust safety
│   │   │   ├── domain_decomp.rs       # Spatial domain decomposition
│   │   │   ├── ghost_comm.rs          # Ghost atom communication
│   │   │   └── collective.rs          # Allreduce, broadcast, etc.
│   │   ├── threading/
│   │   │   ├── rayon_backend.rs       # Rayon work-stealing parallelism
│   │   │   └── openmp_ffi.rs          # OpenMP FFI for Fortran libs
│   │   └── gpu/
│   │       ├── cuda_kernels/          # CUDA C++ kernels
│   │       │   ├── pair_lj.cu
│   │       │   ├── eam.cu
│   │       │   ├── pppm.cu
│   │       │   ├── neighbor.cu
│   │       │   └── fft.cu
│   │       ├── hip_kernels/           # AMD HIP kernels
│   │       ├── sycl_kernels/          # Intel SYCL kernels
│   │       └── kokkos_port/           # Kokkos abstraction layer
│   │
│   ├── glim-flow/                    # ═══ WORKFLOW AUTOMATION ═══
│   │   ├── pipeline.rs                # Multi-step workflow definitions
│   │   ├── dft_to_mlip.rs            # Automated DFT → training data → MLIP
│   │   ├── convergence_study.rs       # Automated ENCUT/KPOINTS convergence
│   │   ├── equation_of_state.rs       # Automated EOS fitting
│   │   ├── phonon_workflow.rs         # Finite-difference phonon calculations
│   │   ├── elastic_workflow.rs        # Elastic constant computation
│   │   └── phase_diagram.rs           # Phase stability analysis
│   │
│   ├── glim-diff/                    # ═══ DIFFERENTIABLE SIMULATION ═══
│   │   ├── autograd.rs                # Automatic differentiation engine
│   │   ├── diff_md.rs                 # Differentiable MD trajectories
│   │   ├── diff_loss.rs               # Loss functions on trajectory observables
│   │   └── inverse_design.rs          # Optimize structures for target properties
│   │
│   └── glim-verify/                  # ═══ VERIFICATION SUITE ═══
│       ├── delta_benchmark/           # Full 71-element DFT benchmark
│       ├── lammps_regression/         # Ported LAMMPS test suite
│       ├── mlip_validation/           # ML potential accuracy tests
│       ├── analytical/                # Tests against exact solutions
│       └── dashboard/                 # Verification status web UI
│
├── bindings/
│   └── python/                        # PyO3 Python bindings
│       ├── glim/
│       │   ├── dft.py                 # Python DFT interface
│       │   ├── md.py                  # Python MD interface (PyLAMMPS-compat)
│       │   ├── ml.py                  # Python ML training interface
│       │   └── system.py              # AtomicSystem Python interface
│       └── pyproject.toml
│
├── cli/
│   └── glim/                         # CLI entry points
│       ├── main.rs
│       ├── dft.rs                     # `glim dft` subcommand
│       ├── md.rs                      # `glim md` subcommand
│       ├── train.rs                   # `glim train` subcommand
│       ├── flow.rs                    # `glim flow` subcommand
│       └── verify.rs                  # `glim verify` subcommand
│
└── data/
    ├── paw/                           # PAW datasets (JTH, GPAW)
    ├── potentials/                    # Classical potential parameter files
    ├── benchmarks/                    # Delta benchmark reference data
    └── test_systems/                  # Regression test input/output
```

### 4.4 LAMMPS Input Script Compatibility

The `glim md` engine must parse and execute LAMMPS input scripts. This is a massive compatibility surface:

**Phase 1 — Core commands (must support):**
```
# System definition
units, dimension, boundary, atom_style, atom_modify
lattice, region, create_box, create_atoms, read_data, read_restart
mass, set, group, velocity

# Force fields
pair_style, pair_coeff, bond_style, bond_coeff
angle_style, angle_coeff, dihedral_style, dihedral_coeff
kspace_style, special_bonds

# Simulation control
fix nve, fix nvt, fix npt, fix langevin
fix shake, fix rigid
timestep, run, minimize

# Output
thermo, thermo_style, dump, dump_modify, restart
compute, variable

# Parallel
processors, neighbor, neigh_modify, comm_style, comm_modify
```

**Phase 2 — Extended commands:**
```
# Enhanced sampling
fix neb, fix plumed, temper

# Reactive MD
pair_style reaxff, fix reaxff/bonds, fix reaxff/species

# Granular
pair_style gran/hooke, fix pour, fix wall/gran

# ML potentials
pair_style deepmd, pair_style allegro, pair_style mace
pair_style mlip (native glim ML models)

# Coarse-grained
pair_style sdk, pair_style gauss
```

**Compatibility guarantee:** Any LAMMPS input script using Phase 1 commands must produce statistically identical results when run with `glim md`. A migration tool (`glim migrate lammps-script input.lmp`) converts scripts to native glim format with warnings for unsupported features.

### 4.5 VASP Input Compatibility

**Phase 1 INCAR tags (must support):**

| Category | Tags |
|----------|------|
| Electronic | ALGO, NELM, NELMIN, EDIFF, ENCUT, PREC, LREAL, ISPIN, NBANDS, ISMEAR, SIGMA |
| Ionic | IBRION, NSW, EDIFFG, POTIM, ISIF |
| Output | LWAVE, LCHARG, LORBIT, NWRITE, LELF, LVTOT |
| Parallel | NCORE, NPAR, KPAR |
| Magnetic | MAGMOM, ISPIN, LNONCOLLINEAR, LSORBIT |
| Precision | ADDGRID, NGX/NGY/NGZ, LASPH |

**Phase 2 INCAR tags:**
| Category | Tags |
|----------|------|
| Hybrid DFT | LHFCALC, AEXX, HFSCREEN, NKRED |
| DFT+U | LDAU, LDAUTYPE, LDAUL, LDAUU, LDAUJ |
| vdW | IVDW, LVDW |
| GW | ALGO=GW, NOMEGA, NBANDSGW |
| Response | LEPSILON, LOPTICS, LRPA |

**Compatibility guarantee:** `glim dft` reads INCAR/POSCAR/KPOINTS natively. A tool (`glim migrate vasp-dir ./vasp_calc/`) validates all tags are supported and flags any that require manual attention.

### 4.6 The DFT → ML → MD Pipeline (The Killer Feature)

This is what no existing tool does well. glim provides a single-command workflow:

```bash
# Step 1: Generate DFT training data
glim flow train-mlip \
  --structure POSCAR \
  --dft-settings INCAR \
  --sampling-method active-learning \
  --model-type mace \
  --target-delta 0.5    # meV/atom accuracy target

# Under the hood:
# 1. Runs DFT on initial structure + random perturbations
# 2. Trains initial MACE model
# 3. Runs short MD with MACE, identifies uncertain configurations
# 4. Runs DFT on uncertain configs (active learning loop)
# 5. Retrains model, repeats until target accuracy reached
# 6. Validates: computes Delta factor vs pure DFT for 5 test structures
# 7. Outputs production-ready MLIP model file

# Step 2: Production MD with the trained potential
glim md -i production.lmp  # LAMMPS-format input using the trained MLIP
```

Or programmatically in Python:

```python
import glim

# DFT calculation
system = glim.io.read_poscar("POSCAR")
dft = glim.DftEngine(incar="INCAR", kpoints="KPOINTS")
result = dft.run(system)

# Train ML potential from DFT data
trainer = glim.ml.MaceTrainer(
    training_data=glim.ml.ActiveLearningDataset(dft_engine=dft),
    target_accuracy=0.5,  # meV/atom
)
model = trainer.train()

# Production MD
md = glim.MdEngine()
md.pair_style("glim/mlip", model=model)
md.fix("nvt", temp=300)
md.run(1_000_000)  # 1M steps at near-DFT accuracy
```

---

## 5. PAW Dataset Strategy

VASP's POTCAR files are proprietary. glim needs high-quality open PAW data.

| Dataset | Format | Elements | Validation | License |
|---------|--------|----------|------------|---------|
| JTH v1.1 | XML (ABINIT) | 71 | Δ < 0.5 meV vs. all-electron | CC-BY |
| GPAW setups | Custom | 86 | Δ ≈ 1.7 meV (PW basis) | GPL |
| PseudoDojo (NC) | UPF | 72 | Extensive Δ testing | CC-BY |
| atompaw-generated | XML | Custom | User-validated | Generated |

**Strategy:**
1. JTH PAW datasets as primary (best validated, open license)
2. GPAW setups as secondary
3. POTCAR import tool for existing VASP users (reads their licensed files)
4. Long-term: generate and validate glim-native PAW datasets using atompaw
5. Establish glim PAW Dataset Library with community contributions and automated Δ validation

---

## 6. Development Roadmap

### Phase 1: Dual Foundation (Months 1–8)

**DFT Track (Months 1–8):**
- Crystal structure I/O, plane-wave basis, FFT grid
- PAW dataset reader (JTH XML)
- Hartree + XC potential via libxc
- Davidson eigensolver + Pulay mixing + SCF loop
- k-point parallelism, symmetry via spglib
- Forces and stress tensor
- **Milestone:** Si total energy matches VASP < 1 meV/atom
- **Milestone:** Delta benchmark Δ < 2 meV for 5 elements

**MD Track (Months 1–8):**
- AtomicSystem data model + LAMMPS data file reader
- Verlet neighbor list (half/full) with cell-linked lists
- Pair potentials: LJ, Morse, Coulomb
- Many-body: EAM (+ alloy), Tersoff
- Velocity-Verlet integrator
- NVE, NVT (Nosé-Hoover), NPT
- LAMMPS input script parser (core commands)
- MPI domain decomposition
- Thermo output, dump trajectories
- **Milestone:** LJ liquid RDF matches LAMMPS exactly
- **Milestone:** EAM Cu matches LAMMPS forces to machine precision

**Shared Infrastructure (Months 1–4):**
- Cargo workspace, CI/CD (GitHub Actions), documentation
- Unified AtomicSystem data model
- MPI abstraction layer
- Python bindings scaffold (PyO3)
- Verification dashboard framework

### Phase 2: Production & Verification (Months 8–16)

**DFT:**
- RMM-DIIS solver, CG solver
- Full INCAR parser with VASP defaults
- All output files: OUTCAR, DOSCAR, EIGENVAL, CHGCAR, vasprun.xml
- Spin polarization (collinear)
- Ionic relaxation + variable-cell optimization
- Band parallelism (NCORE)
- Full 71-element Delta benchmark: Δ < 1 meV/atom
- Band structure and DOS verified for 20 materials
- **Milestone:** arXiv preprint with Delta results

**MD:**
- Additional pair styles: Buck, Born, Yukawa, DPD, tabulated
- Bonded: harmonic/FENE bonds, harmonic/cosine angles, OPLS dihedrals
- PPPM long-range electrostatics
- SHAKE/RATTLE constraints
- Energy minimization (CG, FIRE, L-BFGS)
- Compute/variable infrastructure
- LAMMPS regression suite: 200+ tests passing
- **Milestone:** SPC/E water matches LAMMPS thermodynamics exactly

**ML Pipeline:**
- Training data generation from glim-dft
- Descriptor computation (symmetry functions, SOAP)
- DeePMD-kit model inference via libtorch
- MACE model inference
- Basic active learning loop
- **Milestone:** Trained MACE potential for Si within 1 meV/atom of DFT

### Phase 3: Feature Parity & Community (Months 16–24)

**DFT:**
- Non-collinear magnetism + spin-orbit coupling
- DFT+U (Dudarev)
- Van der Waals corrections (DFT-D3, DFT-D4)
- meta-GGA (SCAN, r2SCAN)
- Born-Oppenheimer MD
- WAVECAR I/O
- **Milestone:** Paper accepted in peer-reviewed journal

**MD:**
- ReaxFF reactive force field
- MEAM, Vashishta, Stillinger-Weber
- rRESPA multi-timestep
- Rigid body dynamics
- Langevin, Berendsen thermostats
- NEB for transition states
- PLUMED interface
- Granular mechanics basics
- LAMMPS regression suite: 500+ tests passing
- **Milestone:** ReaxFF hydrocarbon combustion matches LAMMPS

**ML Pipeline:**
- NequIP and Allegro inference
- Full active learning with uncertainty quantification
- Foundation model fine-tuning interface
- `glim flow train-mlip` end-to-end command
- ML-accelerated MD at scale (GPU)
- **Milestone:** Automated MLIP generation published as workflow paper

### Phase 4: Advanced & Performance (Months 24–36)

**DFT:**
- Hybrid functionals (HSE06, PBE0)
- GW quasiparticle energies
- RPA correlation
- DFPT (phonons, dielectric, Born charges)

**MD:**
- GPU acceleration (CUDA, HIP, SYCL)
- Kokkos-equivalent performance portability
- SPH/RHEO hydrodynamics
- Coarse-grained models
- Exascale optimization
- Full LAMMPS regression suite passing

**ML + Differentiable:**
- Differentiable MD engine (autograd through trajectories)
- Inverse design framework
- Foundation model integration
- On-the-fly active learning during production MD

**Platform:**
- Web UI for job submission and monitoring
- Cloud deployment (AWS, GCP, Azure HPC)
- Jupyter integration for interactive workflows
- Plugin system for community extensions

---

## 7. Competitive Positioning

| Capability | VASP | LAMMPS | QE | ABINIT | OpenMM | **glim** |
|------------|------|--------|----|--------|--------|-----------|
| Plane-wave DFT | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Classical MD | ❌ | ✅ | ❌ | Limited | ✅ | ✅ |
| Reactive MD (ReaxFF) | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| ML potentials native | ❌ | Plugin | ❌ | ❌ | ✅ | **✅ Core** |
| DFT→MLIP pipeline | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Active learning | ❌ | External | ❌ | ❌ | ❌ | **✅** |
| Differentiable MD | ❌ | ❌ | ❌ | ❌ | Partial | **✅** |
| VASP I/O | Native | ❌ | ❌ | ❌ | ❌ | **✅** |
| LAMMPS I/O | ❌ | Native | ❌ | ❌ | ❌ | **✅** |
| GPU (multi-vendor) | OpenACC | KOKKOS | CUDA | GPU | CUDA/OpenCL | CUDA/HIP/SYCL |
| License | Commercial | GPL | GPL | GPL | MIT | **Apache 2.0** |
| Language | Fortran | C++ | Fortran | Fortran | C++/Python | **Rust** |

**glim is the only platform that spans the full DFT → ML → MD pipeline in a unified codebase with permissive licensing.**

---

## 8. Community & Governance

### 8.1 License
**Apache 2.0** — maximally permissive. This is critical for:
- Industry adoption (no GPL copyleft concerns)
- National lab deployment (government contractor compatibility)
- Commercial tool integration
- Cloud service providers

### 8.2 Governance Structure
- **Technical Steering Committee (7 members):** Architecture, release decisions
  - 3 seats: Core developers
  - 2 seats: Academic users/contributors
  - 1 seat: National lab representative
  - 1 seat: Industry representative
- **Domain Working Groups:** DFT, MD, ML, GPU, I/O compatibility
- **Advisory Board:** Senior academics providing scientific oversight
- **BDFL (Year 1–2):** Project founder, then elected TSC chair

### 8.3 Adoption Strategy

**Phase A — Credibility (Months 1–12):**
1. arXiv preprint with Delta benchmark results
2. Presentations at APS March Meeting, MRS Fall, Psi-k
3. Open verification dashboard
4. Engagement with pymatgen/ASE maintainers

**Phase B — Migration (Months 12–24):**
5. "VASP-to-glim Migration Guide" with worked examples
6. "LAMMPS-to-glim Migration Guide"
7. Tutorial workshops at CECAM, ICTP
8. Integration with AiiDA workflow manager
9. Benchmarks on NERSC Perlmutter, OLCF Frontier

**Phase C — Ecosystem (Months 24–36):**
10. Plugin system for community contributions
11. glim Potential Library (curated MLIPs)
12. Cloud deployment for teaching and small-lab access
13. Annual glim Workshop

### 8.4 Funding Strategy

| Source | Amount | Timeline | Focus |
|--------|--------|----------|-------|
| NSF CSSI | $3–5M | Year 1 | Core platform development |
| DOE BES/ASCR | $2–4M | Year 1–2 | Exascale + ML integration |
| ERC Open Science | €2–3M | Year 2 | European community building |
| Chan Zuckerberg EOSS | $400K | Year 1 | Essential infrastructure |
| NumFOCUS | Sponsorship | Year 1 | Fiscal home |
| NERSC/OLCF/ALCF | Compute | Ongoing | Benchmarking allocation |
| Industry (Google, MSFT, Meta) | $1–2M | Year 2 | ML infrastructure |

---

## 9. Risk Analysis

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| DFT accuracy doesn't reach Δ < 1 meV | **Critical** | Medium | JTH PAW datasets pre-validated; iterative debugging against element-by-element comparison |
| LAMMPS community sees this as hostile fork | High | Medium | Position as complement, not replacement; contribute upstream; emphasize unified pipeline value |
| Rust adoption barrier for physics community | High | Medium | Excellent Python bindings; comprehensive docs; consider Fortran-like DSL for physics modules |
| GPU performance gap vs. KOKKOS/CUDA-native | High | High | C++/CUDA kernels for hot paths; accept initial gap; Kokkos FFI as bridge |
| Scope creep (too many features, nothing works) | **Critical** | High | Strict phase gates; each phase has hard verification milestones before advancing |
| Key developers leave | Medium | Medium | Modular design; pair programming; comprehensive documentation |
| Legal concerns from VASP GmbH | Medium | Low | No VASP code used; only public algorithms + file format compatibility |
| LAMMPS GPL contamination | High | Medium | Clean-room implementation; no LAMMPS code copied; only algorithm reimplementation from papers |
| Funding gaps | High | Medium | Diversified funding; volunteer community; minimal viable scope per phase |

---

## 10. First 90 Days — Sprint Plan

### Month 1: Foundation Sprint

**Week 1–2: Infrastructure**
- [ ] GitHub org, monorepo, CI/CD, code formatting, linting
- [ ] Cargo workspace with all crate stubs
- [ ] `glim-core`: Cell, Element, AtomicSystem structs
- [ ] MPI wrapper crate with basic communicator

**Week 3–4: Dual-track kick-off**
- [ ] DFT: POSCAR reader/writer, plane-wave G-vector generation, FFT grid
- [ ] MD: LAMMPS data file reader, Verlet neighbor list, LJ pair potential
- [ ] Shared: Unit test framework, benchmark harness

### Month 2: Compute Kernels

**DFT:**
- [ ] JTH PAW XML reader
- [ ] Hartree potential (Poisson solver)
- [ ] XC potential via libxc FFI
- [ ] Local pseudopotential in reciprocal space
- [ ] Ewald ion-ion energy

**MD:**
- [ ] Velocity-Verlet integrator
- [ ] NVE ensemble
- [ ] Morse pair potential
- [ ] EAM potential (+ alloy variant)
- [ ] Thermo output matching LAMMPS format

### Month 3: First Results

**DFT:**
- [ ] H|ψ⟩ application (kinetic + local + nonlocal)
- [ ] PAW overlap matrix
- [ ] Davidson eigensolver
- [ ] Pulay mixing
- [ ] **FIRST SCF: bulk Si at Gamma point converges**

**MD:**
- [ ] NVT Nosé-Hoover thermostat
- [ ] LAMMPS input script parser (10 core commands)
- [ ] Tersoff potential
- [ ] **FIRST MD: LJ argon, compare RDF vs LAMMPS**

**ML:**
- [ ] Descriptor computation: symmetry functions for Si
- [ ] libtorch FFI for model inference
- [ ] **FIRST ML: Load pre-trained DeePMD model, compute forces**

**Shared:**
- [ ] Python bindings for AtomicSystem, basic DFT, basic MD
- [ ] Verification dashboard v0.1 (static site with test results)
- [ ] **arXiv preprint outline**

---

## 11. Key References

### DFT Foundations
1. Kresse & Furthmüller, *Phys. Rev. B* 54, 11169 (1996) — VASP methodology
2. Kresse & Joubert, *Phys. Rev. B* 59, 1758 (1999) — PAW in VASP
3. Blöchl, *Phys. Rev. B* 50, 17953 (1994) — PAW method
4. Perdew, Burke & Ernzerhof, *PRL* 77, 3865 (1996) — PBE functional

### MD Foundations
5. Thompson et al., *Comput. Phys. Commun.* 271, 108171 (2022) — LAMMPS
6. Plimpton, *J. Comp. Phys.* 117, 1 (1995) — Fast parallel MD algorithms
7. Aktulga et al., *Parallel Computing* 38, 245 (2012) — ReaxFF in LAMMPS

### Verification
8. Lejaeghere et al., *Science* 351, aad3000 (2016) — Delta benchmark
9. Jollet, Torrent & Holzwarth, *CPC* 185, 1246 (2014) — JTH PAW datasets

### ML Potentials
10. Batatia et al., *NeurIPS* (2022) — MACE
11. Musaelian et al., *Nat. Commun.* 14, 579 (2023) — Allegro
12. Batzner et al., *Nat. Commun.* 13, 2453 (2022) — NequIP
13. Zhang et al., *PRL* 120, 143001 (2018) — DeePMD

---

*Document version: 2.0 — March 2026*
*Project codename: glim — Atomic-scale Theory, Learning, and Simulation*
*"From electrons to engineering, in one platform."*
