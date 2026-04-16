# glim Research & Planning Artifact Index

Annotated catalog of every major research, planning, and presentation document in this repo.
All paths are relative to the repo root (`glim/`).

> **On the JSX files:** The `atlas/*.jsx` files are **standalone presentation and prototype
> artifacts** — self-contained React components used for design exploration and stakeholder
> communication. They are not part of the production app (`atlas/glimPSE/`) and do not
> share its build system, packages, or state management.

---

## Research Documents (repo root)

### `deep-research-report.md`
**Title:** Opportunities for Ancillary Software Around the LAMMPS Materials-Science Platform  
**Type:** Primary ecosystem research — LAMMPS landscape analysis  
**Length:** Very long (~full report)

The foundational market and ecosystem analysis. Organized around five opportunity themes:

1. **ML interatomic potentials (MLIPs) and DFT-accuracy-at-scale workflows** — DeePMD-kit, FitSNAP, ML-PACE, ACE; large citation footprint; all designed to run in or integrate with LAMMPS.
2. **Interoperability and potential validation** — LAMMPS's OpenKIM integration (`pair_style kim`) as a natural entry point for potential-selection and validation tooling.
3. **Workflow automation / "LAMMPS as a library"** — Python module (`ctypes` wrapper), pyiron, ASE integrations; demand for job graphs, provenance capture, parameter sweeps, active learning loops outside core LAMMPS.
4. **Post-processing and visualization at scale** — OVITO (100M+ atoms), VMD, fragmented dump-file ecosystem; existing tools strong but ecosystem is ad hoc.
5. **Distribution, packaging, and research execution environments** — prebuilt binaries, Docker/NGC containers, plugin model for licensing constraints.

**Identified product gaps:** cohesive workflow SDK + data model (inputs ↔ potentials ↔ outputs ↔ metadata), scalable/streaming analysis (avoiding giant dump files), opinionated templates for common protocols (equilibration, property calculations, UQ, ML active learning).

**Search for:** ecosystem overview, competitive landscape, OVITO/VMD/Pizza.py analysis, GPL constraints, plugin boundary strategy, citation network, LAMMPS library interface.

---

### `ancillary-research-opps.md`
**Title:** Opportunities for Ancillary Software Around LAMMPS Through the Lens of 2025–2026 People, Labs, and Methods  
**Type:** Current-state landscape — people, labs, publications  
**Length:** Very long (~full report with 60-paper corpus table)

The 2025–2026 follow-up to `deep-research-report.md`. Grounds everything in observable, current activity rather than general ecosystem mapping. Key contents:

**Three reinforcing currents shaping the ecosystem:**
- Heterogeneous HPC performance portability via Kokkos and GPU work
- Rapid operationalization of MLIPs inside production MD (deployment frameworks, "mixing" strategies, model-agnostic interfaces)
- Reactive MD at scale (ReaxFF variants)

**Two interaction hubs mapped:**
- Core LAMMPS developer network (Sandia, release engineering, Kokkos/GPU, reactive MD)
- 2025 LAMMPS Workshop and Symposium (live routing table of active topics and speakers)

**60-paper corpus (2025–2026):** Tabulated as `P01–P60` with DOI, tags (KOKKOS/GPU/MLIP/ReaxFF/PythonWorkflow/OVITO etc.), scale (atoms/timesteps), and explicit pain points. Covers: LAMMPS-KOKKOS exascale work (P01–P05), MLIP deployment frameworks like `chemtrain-deploy` (P06), spatial MLIP mixing `ML-MIX` (P07–P08), reactive MD, transport, mechanics, and more.

**25-person advisory council prospect list** — three rings: core LAMMPS stewards, workflow/MLIP leaders, high-volume applied labs. Priority institutions: Sandia, LANL, Temple, Purdue, Michigan, Harvard, LBNL/Berkeley, Cambridge/UCL, Helsinki, Helmholtz-Zentrum Dresden-Rossendorf, Institute of Metal Research (CAS), Chongqing, Preferred Networks/Matlantis (Japan).

**Actionable opportunity clusters:** reproducible auditable workflows; "DevOps for MLIPs" (packaging, GPU dispatch, validation harnesses); plugin/build distribution automation; workflow-native UX (script linting, structured input IRs, LLM copilots).

**Search for:** 2025–2026 publications, advisory council names, specific institutions, Kokkos/GPU performance portability, ML-MIX, chemtrain-deploy, PIMD, pain points table.

---

### `foundational-research.md`
**Title:** *(no formal title — raw Q&A / brief format)*  
**Type:** Original research brief + AI researcher response + advisory council prospectus  
**Length:** Medium

The origin document. Contains the original brief ("We want to provide ancillary software development focused on features such as visualization, analysis, and optimizations...") followed by a structured researcher response forming a first-pass advisory council prospectus.

**Contents:**
- Brief: references `deep-research-report.md` as the response to the initial request
- Follow-up: request to identify 2025–2026 active individuals for an advisory council
- Researcher response: tiered 12-person priority outreach list with rationale:
  - **Tier 1 (anchors):** Steve Plimpton, Axel Kohlmeyer, Aidan Thompson, Megan McCarthy, Stan Moore, Anders Johansson, Christian Trott
  - **Tier 2 (workflow/usability):** Alejandro Strachan (Purdue), Ethan Holbrook, Juan Carlos Verduzco, Rebecca K. Lindsey (Michigan), Danny Perez (LANL)
  - **Tier 3 (international MLIP/advanced materials):** James Kermode, Thomas Swinburne, Angelos Michaelides, Venkat Kapil, Karsten Nordlund, Jan Janssen, Peitao Liu, Xing-Qiu Chen, Liang Zhang, So Takamoto, Mark Asta, Kien Nguyen-Cong
- Priority institutional relationships list (13 organizations)
- Council framing around 4 themes: core platform evolution, MLIP deployment/validation, workflow/reproducibility, large-scale visualization/analysis

**Search for:** advisory council, specific researcher names, Tier 1/2/3 outreach priorities, institutional relationships, council framing themes.

---

### `example-research-papers.md`
**Title:** Curated Library of Downloadable LAMMPS MD Simulation Files for Materials Science Papers  
**Type:** Curated paper + data repository catalog  
**Length:** Long (multi-section table)

A practical catalog of LAMMPS simulation packages (inputs, data files, potentials, sometimes trajectories) that are publicly deposited and downloadable. Inclusion criteria: LAMMPS explicitly used + high-quality paper with linked DOI + downloadable simulation artifacts.

**Grouped by material class:**

| Class | Notable entries |
|-------|----------------|
| **Metals** | Dislocation–grain-boundary interaction dataset for FCC Cu (Materials Cloud, 6.6 GiB); GRIP-optimized grain boundaries in hcp Ti (Zenodo + GitHub); edge dislocation in FCC Ni with Bayesian parameterization (Zenodo) |
| **Alloys** | LAMMPS EAM potential for Hf–Nb–Ta–Zr refractory HEA (Materials Cloud, 569 KiB); topological grain-boundary segregation transitions in alloys (Zenodo, 7.7 GB) |
| **Ceramics / minerals** | CaCO₃ structural phase transitions (Materials Cloud, includes PLUMED inputs); diamond tool surface flaws / nanocutting SiC (GitHub template) |
| **Polymers** | (Table continues — bead–spring models, polymer interfaces, bond/react templates) |
| **2D materials** | (Table continues) |

**Deposit hosts:** Zenodo, Materials Cloud, GitHub. Most CC BY 4.0.

**Search for:** specific paper DOIs, material systems, grain boundaries, EAM potentials, polymer workflows, Zenodo/Materials Cloud links.

---

## Planning Documents (`atlas/`)

### `atlas/glim-project-plan.md`
**Title:** glim: Atomic-scale Theory, Learning, and Simulation — Unified Open-Source Computational Materials Science Platform  
**Type:** Project charter and technical architecture  
**Scope:** Full-stack platform (DFT + MD + ML)

The top-level vision document for the glim platform. Defines the three-pillar architecture:
1. **Quantum DFT Engine** — VASP-compatible plane-wave PAW DFT
2. **Molecular Dynamics Engine** — LAMMPS-compatible large-scale classical and reactive MD
3. **ML Potential Pipeline** — integrated training, validation, and deployment of MLIPs

**Core thesis:** the future of materials simulation is seamless flow from electronic structure → ML potential generation → production-scale MD → property prediction. No existing tool covers this full pipeline in a unified, modern, open-source package.

**Problem framing:** A typical 2026 materials workflow requires 4–6 separate software packages with manual file conversion at every step (VASP → pymatgen → DeePMD-kit → LAMMPS → OVITO). Every arrow is a failure point. glim removes every arrow.

**Competitive context:** VASP is commercially locked ($5k–$15k+/group); LAMMPS is GPL and 30-year-old C++ with Fortran-era patterns; existing open-source alternatives (QE, ABINIT, GPAW) each solve one piece.

**Search for:** glim architecture, DFT + MD + ML pipeline, platform vision, VASP compatibility rationale, competitive positioning vs VASP/LAMMPS/QE.

---

### `atlas/openDFT-project-plan.md`
**Title:** OpenDFT: Open-Source VASP-Compatible DFT Engine  
**Type:** Detailed technical project plan  
**Scope:** DFT engine (Pillar 1 of glim)

Detailed plan for the DFT engine component. VASP is used by 1,400+ research groups worldwide but costs $5k–$15k+ per group; OpenDFT aims to read VASP input files natively (INCAR, POSCAR, KPOINTS, POTCAR-compatible PAW datasets) and produce VASP-format outputs for zero-friction migration.

**Verification strategy (non-negotiable for academic adoption):**
- **Gold standard:** Delta Codes DFT benchmark (Lejaeghere et al., *Science* 2016) — Δ-factor < 1 meV/atom against VASP for all 71 elemental crystals using PBE functional
- **Tier 1:** Unit-level mathematical verification of each computational kernel (FFT, PAW overlap, XC functional vs libxc, Ewald summation)
- **Tier 2+:** Progressive integration against VASP reference data

**Key differentiators vs QE/ABINIT/GPAW:** designed as a direct VASP replacement with full I/O compatibility, not just "another DFT code."

**Search for:** DFT engine design, PAW, plane-wave, Delta Codes benchmark, Δ-factor, VASP compatibility, 71 elements, Birch-Murnaghan equation of state.

---

### `atlas/glimPSE-product-plan.md`
**Title:** glimPSE: The Visualization Library for LAMMPS — V1 Product Plan — The glim Beachhead  
**Type:** Product strategy document  
**Status:** ⚠️ Superseded by `atlas/glimPSE-web-product-plan.md`

The earlier product strategy, which proposed `glimPSE` as a **Python library** (`pip install glimPSE`). Key elements still relevant as background:
- LAMMPS has 10,155+ citing papers; current viz tools are paid (OVITO Pro), outdated (VMD, Pizza.py), or DIY (matplotlib scripts)
- Competitive table: OVITO Pro/Basic, VMD, Pizza.py, VESTA, matplotlib, lammps-logfile, thermotar vs glimPSE
- "The wedge": every LAMMPS user currently writes their own matplotlib scripts to plot thermo data
- License: Apache 2.0
- Goal: get `glim` into every materials scientist's `import` statement

The Python library approach was replaced by the web app approach (see below) due to superior rendering, zero-install, sharing, and WebGPU technology moat.

**Search for:** Python library strategy, competitive table, OVITO comparison, pip install approach, beachhead rationale.

---

### `atlas/glimPSE-web-product-plan.md`
**Title:** glimPSE — Web-Native LAMMPS Visualization Platform — V1 Product Plan: The glim Beachhead  
**Type:** Product strategy document  
**Status:** ✅ Current strategy

The active product strategy. Pivots from Python library to **WebGPU-powered web application**: zero installation, drag a dump file into the browser, get publication-quality 3D visualization in 2 seconds.

**Why web over Python library (key comparisons):**
- Installation: zero (URL) vs pip + Rust toolchain builds + version conflicts
- 3D rendering: WebGPU native (10M+ atoms at 60fps) vs pythreejs/ipywidgets (fragile, Jupyter-dependent)
- Collaboration: shareable URL with full encoded scene state vs export-and-email PNGs
- Video export: WebCodecs API (hardware-accelerated in browser) vs ffmpeg dependency + manual scripting
- Publication quality: real-time SSAO/DOF/bloom, what-you-see-is-what-you-export vs matplotlib 2D / POV-Ray install
- Community reach: any researcher on any device vs Python-literate researchers only

**The paid wall problem:** OVITO Pro (required for ray-tracing, time-averaging, spatial binning) is paid per seat per year. OVITO Basic is free but lacks the features researchers need for papers. glimPSE: free, web, no install, better rendering.

**Search for:** web app strategy, WebGPU rationale, OVITO paid wall, URL sharing / encoded state, WebCodecs video, why not Python library, beachhead strategy.

---

### `atlas/glimPSE-example-gallery.md`
**Title:** glimPSE — Example Gallery — Curated Datasets for the Website Launch  
**Type:** Content / launch planning  
**Scope:** 12 example simulations for the product website

Curated list of 12 LAMMPS simulation datasets to ship as built-in gallery examples on the website. Each selected for visual diversity, scientific relevance, and "wow factor." All generated from official LAMMPS example scripts (GPL, freely redistributable).

| # | Name | Domain | Atoms | Visual hook |
|---|------|--------|-------|------------|
| 1 | Crack Propagation | Fracture mechanics | ~17K | Crack tip opening, dramatic failure |
| 2 | Nanoindentation | Materials testing | ~12K | Indenter push + lattice healing |
| 3 | LJ Melt | Phase transitions | ~32K | Rapid melting, liquid chaos |
| 4 | Granular Pour | Granular mechanics | ~10K | Particles falling into box, chute flow |
| 5 | Micelle Self-Assembly | Soft matter | ~5K | Lipid molecules form bilayers |
| 6 | Couette Flow | Fluid dynamics | ~8K | Velocity gradient, channel flow |
| 7 | Colloid in Solvent | Colloids | ~5K | Big particles in small particle bath |
| 8 | Polymer in Water | Polymer science | ~15K | Coiled chain in solvent |
| 9 | CNT Tensile Pull | Nanomaterials | ~2K | Carbon nanotube stretching + breaking |
| 10 | Shear Deformation | Plasticity | ~16K | Void growth under shear, defect nucleation |
| 11 | Peptide in Water | Biomolecular | ~2K | Small solvated peptide, 5-mer |
| 12 | NaCl Crystal | Ionic materials | ~8K | Ionic crystal, two-type system |

Source scripts: `examples/crack`, `examples/indent`, `examples/melt`, `examples/pour`,
`examples/micelle`, `examples/flow`, `examples/colloid`, `examples/shear`, `examples/peptide`,
`examples/eim` from LAMMPS GitHub, plus `lammpstutorials` for polymer/CNT/peptide.

A test dump file for the LJ Melt example is included at `apps/web/public/testdata/dump.lj_melt.lammpstrj`.

**Search for:** gallery examples, specific simulation types, atom counts, LAMMPS example scripts, website launch content.

---

## JSX Presentation & Prototype Artifacts (`atlas/`)

All 13 files below are **standalone React components** — presentation artifacts and visual
prototypes used for design exploration and stakeholder communication. They are **not**
part of the production `atlas/glimPSE/` codebase: no shared packages, no shared build
pipeline, no shared state management. They can be rendered in isolation (e.g., Claude
artifacts, CodeSandbox, any React renderer) without the monorepo.

When reading these files, treat them as design specifications and visual mockups, not
as authoritative implementations of features.

| File | Category | What it shows |
|------|----------|--------------|
| `atlas/glim-architecture.jsx` | Platform | System architecture diagram — full glim stack (DFT + MD + ML + Viz) |
| `atlas/glim-presentation.jsx` | Platform | Full slide deck / pitch presentation for glim |
| `atlas/glimPSE-app.jsx` | UI prototype | App UI mockup — panels, viewport, timeline layout |
| `atlas/glimPSE-demo.jsx` | Demo concept | Interactive demo flow for showing the product |
| `atlas/glimPSE-preview.jsx` | Marketing | Landing page / product preview concept |
| `atlas/glimPSE-gallery.jsx` | UI prototype | Gallery view UI — example simulations browser |
| `atlas/glimPSE-mobile.jsx` | UI prototype | Mobile-responsive layout (v1) |
| `atlas/glimPSE-mobile-v2.jsx` | UI prototype | Mobile-responsive layout (v2, revised) |
| `atlas/glimPSE-publication.jsx` | Feature concept | Publication-quality image export workflow concept |
| `atlas/glimPSE-real-data.jsx` | Feature concept | Rendering concept using actual LAMMPS data |
| `atlas/glimPSE-timeseries.jsx` | Feature concept | Thermo/timeseries plot panel concept |
| `atlas/glimPSE-3d-melt.jsx` | Visualization | 3D melt simulation rendering concept |
| `atlas/glimPSE-3d-smooth.jsx` | Visualization | 3D smooth/high-quality sphere rendering concept |

---

## GLIM Project Deep Research (2025–2026)

This section indexes the specialized technical reviews and deep research reports generated for the **GLIM (Atomic-scale Theory, Learning, and Simulation)** project. These reports focus on multi-fidelity uncertainty quantification, model selection, and performance benchmarking of interatomic potentials.

### Multi-Fidelity & Uncertainty Quantification (UQ)

#### `docs/multi_fidelity_uq_glimMER_report.md`
**Title:** Comprehensive Review of Multi-Fidelity Uncertainty Quantification for Atomistic Simulation and Molecular Dynamics: Foundations, Methods, and the Novel "glimMER" Paradigm  
**Topic:** Cross-potential meta-analysis and systematic bias correction.  
**Key Concept:** "glimMER" — using PCA of prediction errors across dozens of potentials to construct correction operators.

#### `docs/bayesian_active_learning_report.md`
**Title:** Bayesian Active Learning for Interatomic Potential Selection  
**Topic:** Gaussian Process surrogates and active learning for potential selection at the GLIM scale (23 potentials x 12,000 materials).  
**Source Files:** `Bayesian Optimization and Active Learning for Interatomic Potential Selection_ A Comprehensive Technical Report.pdf / .docx`

#### `docs/weather_climate_ensembles_report.md`
**Title:** Multi-Model Ensemble Methods from Climate Science: A Technical Review for Computational Materials Science Applications  
**Topic:** Transferring ensemble weight strategies from climate modeling to materials simulation.  
**Source Files:** `Multi-Model Ensemble Methods from Climate Science_ A Technical Review for Computational Materials Science Applications.pdf / .docx`

### Error Prediction & Topology

#### `docs/gnn_error_prediction_report.md`
**Title:** Graph Neural Networks for Predicting Interatomic Potential Errors from Crystal Structure Topology: A Comprehensive Review  
**Topic:** Using GNNs to predict where potentials will fail based on local chemical environment.  
**Source Files:** `Graph Neural Networks for Predicting Interatomic Potential Errors from Crystal Structure Topology_ A Comprehensive Review.pdf / .docx`

#### `docs/tda_error_landscapes_report.md`
**Title:** Topological Data Analysis of Interatomic Potential Error Landscapes: A Comprehensive Review  
**Topic:** Applying persistent homology to characterize high-dimensional error surfaces.  
**Source Files:** `Topological Data Analysis of Interatomic Potential Error Landscapes: A Comprehensive Review.pdf / .docx`

### Performance Benchmarking & Physical Models

#### `docs/phonon_benchmarking_report.md`
**Title:** Phonon Frequency Spectrum Benchmarking for Interatomic Potentials: A Technical Review for the GLIM Project  
**Topic:** Using second-order energy derivatives (phonons) as the "gold standard" for potential validation.  
**Source Files:** `Phonon Frequency Spectrum Benchmarking for Interatomic Potentials: A Technical Review for the GLIM Project.pdf / .docx`  
**Summary:** `docs/KEY_FINDINGS_SUMMARY.md` (Executive summary of critical phonon findings).

#### `docs/rg_coarsegraining_report.md`
**Title:** Renormalization Group Methods for Coarse-Graining: A Comprehensive Review of RG Applications in MD  
**Topic:** Systematic methodology for deriving effective potentials via partition function matching.

#### `docs/sloppy_models_report.md`
**Title:** Sloppy Model Theory and Interatomic Potential Transferability: A Comprehensive Review  
**Topic:** Fisher Information Matrix (FIM) eigenvalue analysis to identify "stiff" and "sloppy" parameter directions.

### Information Theory & Infrastructure

#### `docs/info_theoretic_report.md`
**Title:** Information-Theoretic Bounds on Model Error Compression in Computational Physics: A Comprehensive Review  
**Topic:** Kolmogorov complexity, Rate-Distortion Theory, and Shannon entropy applied to model selection.

#### `docs/WebGPU and WGSL Compute Shaders for Real-Time Scientific Visualization of Molecular Dynamics Trajectories.pdf`
**Topic:** Browser-native scientific visualization architecture, million-atom rendering, and Rust/WASM integration for MD trajectories.  
**Source Files:** `WebGPU and WGSL Compute Shaders... .pdf / .docx`

#### `docs/funding_landscape_report.md`
**Title:** Federal Funding Programs for Materials Informatics, Uncertainty Quantification, and Computational Materials Science Infrastructure: A Comprehensive Review (2025–2026)  
**Topic:** Analysis of NSF DMREF, DOE BES, DARPA SURGE/PRIME, and MGI strategic priorities.  
**Source Files:** `Federal Funding Programs... .pdf / .docx`

### Supplementary & Follow-up Documents

#### `docs/GLIM Briefing Follow-Up.docx`
**Topic:** Follow-up notes and action items from the GLIM project briefing.

#### `docs/Comprehensive Deep Research Report_ Protein Force Field Benchmarking Methods and Crossover Potential to Materials Science Interatomic Potential Validation.pdf`
**Topic:** Review of protein force field benchmarking and how those methodologies can be applied to materials science potential validation.

---

## Cross-Reference: Which Doc Answers Which Question

| Question | Go to |
|----------|-------|
| What is the overall glim vision? | `atlas/glim-project-plan.md` |
| What is the web app product strategy and why? | `atlas/glimPSE-web-product-plan.md` |
| Why was the Python library approach dropped? | `atlas/glimPSE-product-plan.md` → `atlas/glimPSE-web-product-plan.md` |
| What are the gallery examples for the website? | `atlas/glimPSE-example-gallery.md` |
| What does the DFT engine need to do to be credible? | `atlas/openDFT-project-plan.md` |
| Who are the key people in the LAMMPS ecosystem right now? | `ancillary-research-opps.md`, `foundational-research.md` |
| What are the biggest LAMMPS ecosystem pain points? | `deep-research-report.md`, `ancillary-research-opps.md` |
| Which 2025–2026 papers show LAMMPS usage patterns? | `ancillary-research-opps.md` (60-paper corpus) |
| Where can I find downloadable LAMMPS simulation files? | `example-research-papers.md` |
| Who are the 12 priority outreach targets for an advisory council? | `foundational-research.md` |
| What are the competitive tools vs glimPSE? | `atlas/glimPSE-web-product-plan.md`, `atlas/glimPSE-product-plan.md` |
| What research doc covers X? | See JSX section above — presentation artifacts only |
| What is "glimMER" in GLIM? | `docs/multi_fidelity_uq_glimMER_report.md` |
| How can GNNs predict potential errors? | `docs/gnn_error_prediction_report.md` |
| Why are phonons considered the "gold standard" for validation? | `docs/phonon_benchmarking_report.md`, `docs/KEY_FINDINGS_SUMMARY.md` |
| What are "Sloppy Models" in the context of interatomic potentials? | `docs/sloppy_models_report.md` |
| How does the federal funding landscape for materials informatics look in 2025–2026? | `docs/funding_landscape_report.md` |
| What is the performance advantage of WebGPU for MD visualization? | `docs/WebGPU and WGSL Compute Shaders... .pdf` |
| How can climate science ensemble methods be applied to materials? | `docs/weather_climate_ensembles_report.md` |
