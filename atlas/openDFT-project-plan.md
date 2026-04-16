# OpenDFT: Open-Source VASP-Compatible DFT Engine
## Project Plan & Architecture Document

---

## 1. Executive Summary

**Goal:** Build a fully open-source, VASP-compatible plane-wave PAW DFT code with mathematically proven numerical equivalence to VASP, verified through the community-standard Delta Codes DFT benchmark framework.

**Why this matters:** VASP is used by 1,400+ research groups worldwide but remains commercially licensed (~$5,000–$15,000+ per group). The computational materials science community needs an open-source alternative that produces bit-for-bit comparable results, enabling reproducibility, accessibility, and community-driven innovation.

**Key differentiator vs. existing open-source codes:** While Quantum ESPRESSO, ABINIT, and GPAW exist, none are designed as direct VASP replacements with full I/O compatibility. OpenDFT will read VASP input files natively (INCAR, POSCAR, KPOINTS, POTCAR-compatible PAW datasets) and produce VASP-format output files, enabling zero-friction migration for the entire VASP user community.

---

## 2. The Verification Problem

The academic community won't adopt a new DFT code unless it can demonstrate rigorous numerical agreement with established codes. This is not optional — it's existential for the project.

### 2.1 The Delta Codes DFT Benchmark (Our Gold Standard)

The Lejaeghere et al. study published in *Science* (2016) established the definitive framework for comparing DFT codes. It compares equations of state for 71 elemental crystals using the PBE functional, computing a single metric: the **Δ-factor** (RMS energy difference in meV/atom between two codes' equations of state).

**Target:** Achieve Δ < 1 meV/atom against VASP across all 71 elements. This threshold is comparable to the precision between different all-electron codes and within experimental uncertainty.

**What this requires per element:**
1. Compute total energy at 7 volumes around the equilibrium volume
2. Fit to the Birch-Murnaghan equation of state → extract V₀, B₀, B₁
3. Compare RMS energy difference of equation of state vs. VASP reference data

### 2.2 Multi-Tier Verification Strategy

**Tier 1 — Unit-Level Mathematical Verification (Months 1–6)**
- Verify each computational kernel independently against analytical solutions
- Plane-wave expansion of known functions (convergence rates must match theory)
- FFT accuracy for charge density ↔ potential transformations
- PAW overlap matrix elements against published tabulated values
- XC functional values against libxc reference implementation
- Ewald summation against Madelung constants for known crystal structures

**Tier 2 — Single-SCF Verification (Months 4–9)**
- For a set of 10 standard test systems (Si, Al, Fe, GaAs, MgO, NaCl, Cu, diamond C, TiO₂, BN):
  - Match total energy to < 0.1 meV/atom for identical input parameters
  - Match eigenvalues at each k-point to < 0.01 meV
  - Match forces to < 0.1 meV/Å
  - Match stress tensor to < 0.01 kbar
- Requires exact same PAW datasets, k-mesh, cutoff, smearing

**Tier 3 — Delta Codes Benchmark (Months 8–14)**
- Full 71-element benchmark
- Achieve Δ < 1 meV/atom vs. VASP
- Publish results alongside existing codes in the Delta database

**Tier 4 — Property Verification (Months 12–18)**
- Band structures (eigenvalue comparison at high-symmetry points)
- Density of states (integrated DOS comparison)
- Phonon frequencies via finite differences
- Elastic constants
- Magnetic moments (collinear and non-collinear)
- Dielectric properties

**Tier 5 — Advanced Methods (Months 18–30)**
- Hybrid functionals (HSE06, PBE0): compare band gaps for 20 standard semiconductors
- GW quasiparticle energies: compare against published VASP GW results
- RPA correlation energies
- Molecular dynamics trajectories (statistical comparison of RDFs, diffusion coefficients)

---

## 3. Technical Architecture

### 3.1 Core Computational Methods

VASP's mathematical foundations are all published. The key algorithms:

| Component | Method | Key References |
|-----------|--------|----------------|
| Basis set | Plane waves with kinetic energy cutoff | Standard solid-state physics |
| Ion-electron interaction | Projector Augmented Wave (PAW) | Blöchl (1994), Kresse & Joubert (1999) |
| SCF solver | Residual minimization (RMM-DIIS) | Kresse & Furthmüller (1996) |
| SCF solver (alt) | Blocked Davidson | Davidson (1975) |
| SCF solver (alt) | Conjugate gradient | Teter, Payne, Allan (1989) |
| Charge mixing | Pulay mixing (DIIS) | Pulay (1980) |
| XC functionals | LDA, GGA (PBE, PW91), meta-GGA (SCAN) | Use libxc library |
| k-point sampling | Monkhorst-Pack, Gamma-centered | Monkhorst & Pack (1976) |
| Smearing | Gaussian, Methfessel-Paxton, Fermi-Dirac | Methfessel & Paxton (1989) |
| Symmetry | Space group detection & symmetrization | spglib library |
| Parallelization | k-point, band, plane-wave decomposition | MPI + OpenMP |

### 3.2 Language & Technology Choices

**Primary language: Rust + C/Fortran FFI**

Rationale:
- Memory safety eliminates entire classes of bugs that plague Fortran scientific codes
- Zero-cost abstractions enable performance parity with Fortran
- Modern tooling (cargo, crates.io) dramatically lowers contribution barrier
- Excellent MPI and BLAS/LAPACK bindings exist
- Growing adoption in scientific computing (e.g., Pola.rs, burn)
- Falls back to C/Fortran FFI for FFTW, BLAS, ScaLAPACK

**Alternative consideration: Modern Fortran (2018+) or C++ with Kokkos**
- Fortran: Lower barrier for existing computational physics community
- C++ Kokkos: Best GPU portability story
- Decision should involve community input (see Governance)

**Critical dependencies:**
- FFTW3 or cuFFT/rocFFT for GPU
- BLAS/LAPACK (OpenBLAS, MKL, or AOCL)
- ScaLAPACK for distributed linear algebra
- MPI (OpenMPI or MPICH)
- libxc for exchange-correlation functionals
- spglib for symmetry operations
- HDF5 for large data I/O

### 3.3 Module Architecture

```
openDFT/
├── core/
│   ├── crystal/          # Lattice, atoms, symmetry (POSCAR parser)
│   ├── basis/            # Plane-wave basis set management
│   │   ├── pw_basis.rs   # G-vector generation, kinetic energy sorting
│   │   └── fft_grid.rs   # Real-space ↔ reciprocal-space transforms
│   ├── kpoints/          # k-mesh generation (KPOINTS parser)
│   │   ├── monkhorst_pack.rs
│   │   └── symmetry_reduction.rs
│   ├── potential/        # Effective potential construction
│   │   ├── hartree.rs    # Poisson equation solver
│   │   ├── xc.rs         # XC via libxc
│   │   ├── local_pp.rs   # Local pseudopotential
│   │   └── nonlocal_pp.rs # PAW nonlocal projectors
│   ├── paw/              # Projector Augmented Wave
│   │   ├── paw_dataset.rs    # Read PAW data (JTH/GPAW format)
│   │   ├── paw_one_center.rs # One-center corrections
│   │   ├── paw_augmentation.rs # Augmentation charges
│   │   └── paw_density.rs    # Compensation charge density
│   ├── hamiltonian/      # H|ψ⟩ application
│   │   ├── kinetic.rs    # T|ψ⟩ in reciprocal space
│   │   ├── local.rs      # V_local|ψ⟩ via FFT
│   │   └── nonlocal.rs   # V_NL|ψ⟩ via projectors
│   ├── solver/           # Eigenvalue solvers
│   │   ├── davidson.rs   # Blocked Davidson
│   │   ├── rmm_diis.rs   # Residual minimization
│   │   └── cg.rs         # Conjugate gradient
│   ├── mixing/           # Charge density mixing
│   │   ├── pulay.rs      # Pulay/DIIS mixing
│   │   ├── kerker.rs     # Kerker preconditioning
│   │   └── broyden.rs    # Broyden mixing
│   └── scf/              # Self-consistent field loop
│       ├── scf_loop.rs   # Main SCF driver
│       ├── convergence.rs # Convergence checks
│       └── occupations.rs # Smearing & occupation numbers
├── io/
│   ├── vasp/             # VASP-compatible I/O
│   │   ├── incar.rs      # INCAR parser (tag=value)
│   │   ├── poscar.rs     # POSCAR/CONTCAR reader/writer
│   │   ├── kpoints.rs    # KPOINTS reader
│   │   ├── potcar.rs     # POTCAR-format PAW reader
│   │   ├── outcar.rs     # OUTCAR-format writer
│   │   ├── doscar.rs     # DOSCAR writer
│   │   ├── eigenval.rs   # EIGENVAL writer
│   │   ├── chgcar.rs     # CHGCAR reader/writer
│   │   ├── wavecar.rs    # WAVECAR reader/writer
│   │   └── vasprun_xml.rs # vasprun.xml writer
│   └── native/           # Native JSON/HDF5 format
├── properties/
│   ├── band_structure.rs
│   ├── dos.rs
│   ├── forces.rs
│   ├── stress.rs
│   ├── charge_density.rs
│   ├── dielectric.rs
│   └── magnetic.rs
├── dynamics/
│   ├── ionic_relaxation.rs  # CG, BFGS, FIRE
│   ├── cell_relaxation.rs   # Variable cell
│   └── md.rs                # Born-Oppenheimer MD
├── advanced/
│   ├── hybrid_functionals.rs # HSE06, PBE0
│   ├── gw.rs                 # GW approximation
│   ├── rpa.rs                # RPA correlation
│   ├── soc.rs                # Spin-orbit coupling
│   └── neb.rs                # Nudged elastic band
├── parallel/
│   ├── kpoint_parallel.rs    # k-point parallelism
│   ├── band_parallel.rs      # Band parallelism
│   └── fft_parallel.rs       # FFT distribution
├── gpu/
│   ├── cuda_kernels/         # CUDA implementations
│   └── hip_kernels/          # AMD HIP implementations
└── verify/                   # Verification suite
    ├── delta_benchmark/      # Full 71-element Delta test
    ├── regression/           # Regression test library
    └── analytical/           # Tests against analytical solutions
```

### 3.4 PAW Dataset Strategy

**Critical issue:** VASP's POTCAR files are proprietary and cannot be distributed. However, several high-quality open PAW datasets exist:

1. **JTH PAW datasets** (ABINIT): Published, validated, openly available. Jollet, Torrent & Holzwarth (2014) validated 71 elements.
2. **GPAW PAW setups**: Open-source, well-tested, ASE-compatible.
3. **PseudoDojo** (ONCVPSP norm-conserving): Not PAW but an alternative path.
4. **SG15 ONCVPSP**: Another NC-PP library.

**Recommended approach:**
- Support JTH PAW datasets natively (XML format, well-documented)
- Also support GPAW PAW setup format
- Build a POTCAR-to-native converter for users who have VASP licenses
- Long-term: Generate and validate our own PAW datasets using atompaw code

### 3.5 VASP I/O Compatibility Specification

The following INCAR tags must be supported in Phase 1 (core DFT):

**Electronic minimization:**
ALGO (Normal, Fast, VeryFast, All, Damped), NELM, NELMIN, EDIFF, ENCUT, PREC, LREAL, ISPIN, NBANDS, ISMEAR, SIGMA

**Ionic relaxation:**
IBRION (-1, 0, 1, 2), NSW, EDIFFG, POTIM, ISIF

**Output control:**
LWAVE, LCHARG, LORBIT, NWRITE, LELF, LVTOT

**Parallelization:**
NCORE/NPAR, KPAR

**Magnetic:**
MAGMOM, ISPIN, LNONCOLLINEAR, LSORBIT

---

## 4. Development Roadmap

### Phase 1: Foundation (Months 1–6) — "It computes energy"
- Crystal structure I/O (POSCAR reader/writer)
- Plane-wave basis set with G-vector generation
- FFT grid and real ↔ reciprocal transforms
- Local potential in reciprocal space
- Hartree potential (Poisson solver)
- XC potential via libxc (LDA, PBE)
- PAW dataset reader (JTH XML format)
- PAW nonlocal projector application
- Davidson eigensolver
- Pulay charge mixing
- Basic SCF loop
- k-point generation (Monkhorst-Pack)
- Symmetry via spglib
- MPI k-point parallelism
- **Milestone:** Total energy of bulk Si matches VASP to < 1 meV/atom

### Phase 2: Production DFT (Months 6–12) — "It matches VASP"
- RMM-DIIS solver
- Methfessel-Paxton, Fermi-Dirac smearing
- Forces and stress tensor
- Ionic relaxation (CG, quasi-Newton)
- Variable-cell relaxation
- Spin polarization (collinear)
- Full INCAR parser with VASP-compatible defaults
- OUTCAR, DOSCAR, EIGENVAL, CHGCAR writers
- Band parallelism (NCORE/NPAR)
- Kerker preconditioning
- **Milestone:** Pass Delta benchmark for 30+ elements with Δ < 2 meV/atom

### Phase 3: Verification & Hardening (Months 12–18) — "It's proven"
- Full 71-element Delta benchmark: Δ < 1 meV/atom
- Band structure and DOS verified against VASP for 20 materials
- Phonon frequencies via finite differences (verified vs. Phonopy + VASP)
- Elastic constants for 10 materials
- Born-Oppenheimer MD
- Non-collinear magnetism
- Spin-orbit coupling
- vasprun.xml output (pymatgen/ASE compatibility)
- WAVECAR I/O
- Comprehensive regression test suite (500+ tests)
- **Milestone:** Publication in peer-reviewed journal (JCTC, CPC, or JOSS)

### Phase 4: Advanced Methods (Months 18–30) — "It does more than basics"
- Hybrid functionals (HSE06, PBE0) via ACE or adaptively compressed exchange
- meta-GGA functionals (SCAN, r2SCAN)
- DFT+U (Dudarev, Liechtenstein)
- Van der Waals corrections (DFT-D3, DFT-D4, rVV10)
- GW quasiparticle calculations
- RPA correlation energies
- NEB for transition states
- GPU acceleration (CUDA + HIP)
- **Milestone:** Feature parity with VASP for 80% of published use cases

### Phase 5: Beyond VASP (Months 24+) — "It does things VASP can't"
- Machine learning potentials integration
- On-the-fly active learning for MD
- Automatic workflow integration (AiiDA, Fireworks)
- Real-time TDDFT
- DMFT interface
- Stochastic DFT for very large systems
- WebAssembly build for education/demos

---

## 5. Verification Infrastructure

### 5.1 Automated Regression Testing

Every commit must pass:
```
Level 1: Unit tests (< 2 min) — analytical checks, parser tests
Level 2: Quick integration (< 15 min) — Si, Al, Fe total energies
Level 3: Nightly full (< 4 hours) — 20-material property suite
Level 4: Weekly Delta (< 24 hours) — Full 71-element benchmark
```

### 5.2 Continuous Benchmarking Dashboard

Public-facing dashboard showing:
- Δ-factor vs. VASP for each element (updated nightly)
- Performance benchmarks (time-to-solution vs. system size)
- Convergence behavior comparisons
- Memory usage profiling

### 5.3 Reproducibility Protocol

For every verification claim:
1. Input files committed to repository
2. Exact software versions recorded (including libxc, FFTW, compiler)
3. Output files archived with checksums
4. Comparison scripts included
5. Docker/Singularity containers for exact reproduction

---

## 6. Community & Governance

### 6.1 Open-Source License
**Apache 2.0 or MIT** — maximally permissive to encourage adoption in both academia and industry. Copyleft licenses (GPL) would limit commercial use and reduce adoption.

### 6.2 Governance Model
- **Technical Steering Committee** (5–7 members): Core architectural decisions
- **Domain Maintainers**: Responsible for specific modules (PAW, solvers, GPU, etc.)
- **Advisory Board**: Senior academics who provide scientific oversight
- **BDFL (initial)**: Project founder for first 2 years, then elected TSC

### 6.3 Community Building Strategy
1. **arXiv preprint** at Milestone 1 (working code with Si benchmark)
2. **Conference presentations** at APS March Meeting, MRS, Psi-k
3. **Tutorial workshops** at major computational materials science meetings
4. **Integration with ecosystem**: pymatgen, ASE, AiiDA, Phonopy, VASPKIT compatibility
5. **"VASP-to-OpenDFT Migration Guide"** — document showing identical workflows
6. **Delta benchmark results** published prominently and transparently

### 6.4 Funding Strategy
- NSF CSSI (Cyberinfrastructure for Sustained Scientific Innovation)
- DOE BES/ASCR computational materials science programs
- European Research Council (ERC) open science initiatives
- Chan Zuckerberg Initiative (Essential Open Source Software)
- NumFOCUS fiscal sponsorship
- Industry sponsorship from national labs (NERSC, OLCF, ALCF)

---

## 7. Competitive Landscape & Differentiation

| Feature | VASP | Quantum ESPRESSO | ABINIT | OpenDFT (Target) |
|---------|------|-----------------|--------|-----------------|
| License | Commercial | GPL | GPL | Apache 2.0 |
| VASP I/O compatible | ✅ (native) | ❌ | ❌ | ✅ |
| PAW method | ✅ | ✅ (limited) | ✅ | ✅ |
| Plane-wave basis | ✅ | ✅ | ✅ | ✅ |
| Hybrid functionals | ✅ | ✅ | ✅ | Phase 4 |
| GW | ✅ | ✅ (Yambo) | ✅ | Phase 4 |
| GPU support | ✅ (OpenACC) | ✅ (CUDA) | ✅ (GPU) | Phase 4 |
| Language | Fortran | Fortran | Fortran | Rust + FFI |
| Modern tooling | ❌ | Partial | Partial | ✅ (cargo, CI/CD) |
| Active development | ✅ | ✅ | ✅ | ✅ |
| Delta verified | Reference | ~1.5 meV | ~0.9 meV | Target < 1 meV |

**Our unique value propositions:**
1. **VASP-native I/O** — zero migration cost for 1,400+ research groups
2. **Modern language** — memory-safe, easier to contribute to
3. **Permissive license** — no GPL restrictions on commercial use
4. **Verification-first** — Delta benchmark results published from day one
5. **API-first design** — Python bindings, workflow integration baked in

---

## 8. Risk Analysis

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| PAW dataset incompatibility causes systematic Δ errors | High | Medium | Use JTH datasets validated to < 0.3 meV against all-electron |
| Community doesn't adopt due to VASP entrenchment | High | Medium | VASP I/O compatibility eliminates migration friction |
| Insufficient funding for sustained development | High | Medium | Pursue multiple funding sources; build volunteer community |
| Legal concerns re VASP compatibility claims | Medium | Low | No VASP code used; only public math + file format |
| Performance gap vs. optimized VASP | Medium | High | Accept initially; GPU path closes gap |
| Key developers leave project | Medium | Medium | Modular design; comprehensive documentation |
| Numerical edge cases cause divergence | Medium | High | Extensive test suite; nightly Delta runs |

---

## 9. Getting Started — First 90 Days

### Month 1: Scaffolding
- [ ] Set up repository (GitHub), CI/CD (GitHub Actions), documentation (mdBook)
- [ ] Implement crystal structure module (lattice vectors, fractional coordinates, symmetry)
- [ ] POSCAR reader/writer with round-trip tests
- [ ] Plane-wave basis set: G-vector generation for given cell + Ecut
- [ ] FFT grid sizing and FFTW3 bindings
- [ ] Unit tests: G-vector counts match VASP for 5 test systems

### Month 2: Potentials
- [ ] JTH PAW dataset XML reader
- [ ] Local pseudopotential in reciprocal space
- [ ] Hartree potential via Poisson equation (reciprocal space)
- [ ] XC potential via libxc (LDA PZ, GGA PBE)
- [ ] Ewald ion-ion energy
- [ ] Unit tests: Hartree energy of Gaussian charge matches analytical; XC values match libxc standalone

### Month 3: Hamiltonian
- [ ] H|ψ⟩ application: kinetic + local + nonlocal (PAW projectors)
- [ ] Overlap matrix S (PAW augmentation)
- [ ] k-point mesh generation (Monkhorst-Pack)
- [ ] Brillouin zone integration with symmetry reduction
- [ ] Unit tests: H matrix elements for H atom match analytical; k-mesh matches VASP IBZKPT

### Month 4: SCF
- [ ] Davidson eigensolver (blocked, with preconditioning)
- [ ] Occupation numbers (Gaussian smearing)
- [ ] Charge density from wavefunctions
- [ ] Pulay mixing
- [ ] SCF loop driver with convergence monitoring
- [ ] **FIRST SCF**: bulk Si at Gamma point converges

### Month 5: First Verification
- [ ] Full k-mesh SCF for Si, Al, Cu
- [ ] Compare total energies vs. VASP (target: < 1 meV/atom for Si)
- [ ] INCAR parser (subset: ENCUT, ISMEAR, SIGMA, EDIFF, ALGO)
- [ ] KPOINTS parser
- [ ] OUTCAR writer (basic)
- [ ] MPI k-point parallelism

### Month 6: First Milestone
- [ ] Forces via Hellmann-Feynman theorem
- [ ] Stress tensor
- [ ] 10-material energy comparison vs. VASP
- [ ] Delta benchmark for 5 elements (Si, Al, Cu, Fe, C)
- [ ] arXiv preprint: "OpenDFT: Towards an Open-Source VASP-Compatible DFT Engine"
- [ ] **MILESTONE 1: Δ < 2 meV/atom for 5 elements**

---

## 10. Key References

1. Kresse & Furthmüller, *Phys. Rev. B* 54, 11169 (1996) — VASP methodology
2. Kresse & Joubert, *Phys. Rev. B* 59, 1758 (1999) — PAW implementation
3. Blöchl, *Phys. Rev. B* 50, 17953 (1994) — PAW method
4. Lejaeghere et al., *Science* 351, aad3000 (2016) — Delta benchmark
5. Perdew, Burke & Ernzerhof, *Phys. Rev. Lett.* 77, 3865 (1996) — PBE functional
6. Monkhorst & Pack, *Phys. Rev. B* 13, 5188 (1976) — k-point sampling
7. Methfessel & Paxton, *Phys. Rev. B* 40, 3616 (1989) — Smearing methods
8. Jollet, Torrent & Holzwarth, *Comput. Phys. Commun.* 185, 1246 (2014) — JTH PAW datasets

---

*Document version: 1.0 — March 2026*
*Project codename: OpenDFT*
