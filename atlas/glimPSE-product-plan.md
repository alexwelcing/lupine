# atlas-view: The Visualization Library for LAMMPS
## V1 Product Plan — The ATLAS Beachhead

---

## 1. Strategic Thesis

**Grand vision:** ATLAS — the unified DFT + MD + ML platform.
**First product:** `atlas-view` — the best open-source visualization library for LAMMPS data.

**Why this first:**
- LAMMPS has 10,155+ citing papers and thousands of active users
- Current viz tools are either paid (OVITO Pro), outdated (VMD, Pizza.py), or DIY (matplotlib scripts)
- A great viz library is the #1 "quality of life" improvement for every LAMMPS user
- It requires zero LAMMPS code — just reads output files
- Gets `atlas` into every materials scientist's `import` statement
- Establishes brand, community, and contributor pipeline for the full ATLAS platform

**The wedge:** Every LAMMPS user currently writes their own matplotlib scripts to plot thermo data, manually loads dump files into OVITO, and struggles to make publication-quality figures. `atlas-view` makes this one line of code.

---

## 2. Competitive Gap Analysis

### Current Landscape

| Tool | Type | 3D Atoms | Thermo Plots | Jupyter | Open Source | Active | Publication Quality |
|------|------|----------|-------------|---------|-------------|--------|-------------------|
| OVITO Pro | Desktop app | ✅ Excellent | Limited | Partial | ❌ Paid | ✅ | ✅ |
| OVITO Basic | Desktop app | ✅ Good | Limited | Partial | ✅ MIT | ✅ | ❌ (no ray-tracing) |
| VMD | Desktop app | ✅ Good | ❌ | ❌ | Free (not OSS) | Slow | ❌ |
| Pizza.py | Python scripts | Minimal | Basic | ❌ | ✅ | ❌ Dead | ❌ |
| VESTA | Desktop app | ✅ Crystals | ❌ | ❌ | Free | ✅ | ✅ |
| matplotlib DIY | Python lib | ❌ | Manual | ✅ | ✅ | N/A | Depends on user |
| lammps-logfile | Python lib | ❌ | ❌ (data only) | ✅ | ✅ | Minimal | ❌ |
| thermotar | Python lib | ❌ | ❌ (data only) | ✅ | ✅ | Minimal | ❌ |
| **atlas-view** | **Python lib** | **✅ WebGL** | **✅ One-line** | **✅ Native** | **✅ Apache 2** | **✅** | **✅** |

### The Gap We Fill

Nobody provides a **Jupyter-native, one-line, publication-quality** visualization library purpose-built for LAMMPS. The closest is OVITO's Python package, but it:
- Requires OVITO Pro for many features (paid license)
- Is designed as a scripting interface to a desktop app, not a notebook-first library
- Doesn't provide opinionated, beautiful defaults — you still configure everything

**atlas-view is to LAMMPS what seaborn is to pandas** — beautiful defaults, one-line commands, Jupyter-native, publication-quality output.

---

## 3. Product Definition

### 3.1 Package Name & Identity

```
Package:    atlas-view
PyPI:       pip install atlas-view
Import:     import atlas_view as av
Tagline:    "Publication-quality LAMMPS visualization in one line"
License:    Apache 2.0
Repository: github.com/atlas-sim/atlas-view
```

### 3.2 Core API Design — "One Line to Beautiful"

```python
import atlas_view as av

# ─── THERMO DATA ───────────────────────────────────────────
# One line: publication-quality thermo plot from a log file
av.thermo("log.lammps")                          # All properties, auto-layout
av.thermo("log.lammps", y="Temp")                # Single property
av.thermo("log.lammps", y=["Temp","Press","KE"]) # Multiple properties
av.thermo("log.lammps", y="Temp", running_avg=100)  # With smoothing
av.thermo("log.lammps", y="TotEng", equilibration=True)  # Auto-detect equilibration

# Compare multiple simulations
av.thermo_compare(["run1/log.lammps", "run2/log.lammps"], y="Temp",
                   labels=["300K", "500K"])

# Energy decomposition
av.energy_breakdown("log.lammps")  # Stacked bar or area chart of energy components

# ─── DUMP FILE VISUALIZATION ───────────────────────────────
# 3D atomic structure from dump file — interactive WebGL in notebook
av.atoms("dump.lammpstrj")                        # Auto-color by type
av.atoms("dump.lammpstrj", color="charge")        # Color by property
av.atoms("dump.lammpstrj", color="stress_xx")     # Color by per-atom stress
av.atoms("dump.lammpstrj", frame=100)             # Specific frame
av.atoms("dump.lammpstrj", slice_z=(0, 10))       # Slice through volume

# Trajectory animation (returns HTML5 widget in Jupyter)
av.trajectory("dump.lammpstrj", fps=30)
av.trajectory("dump.lammpstrj", color="velocity_magnitude", colormap="inferno")

# ─── DATA FILES ────────────────────────────────────────────
# Visualize LAMMPS data files (initial configurations)
av.data("system.data")                             # 3D view with bond topology
av.data("system.data", show_bonds=True)

# ─── STRUCTURAL ANALYSIS ──────────────────────────────────
# Radial distribution function
av.rdf("dump.lammpstrj", pairs=[(1,1), (1,2)])

# Mean squared displacement
av.msd("dump.lammpstrj", group="type 1")

# Density profile (slab geometry)
av.density_profile("dump.lammpstrj", axis="z", species=[1, 2])

# Bond angle distribution
av.bond_angle_distribution("dump.lammpstrj")

# Coordination number distribution
av.coordination("dump.lammpstrj", cutoff=3.5)

# Stress-strain curve (from log + deformation fix)
av.stress_strain("log.lammps")

# Voronoi analysis visualization
av.voronoi("dump.lammpstrj", frame=-1)

# ─── PUBLICATION EXPORT ───────────────────────────────────
fig = av.thermo("log.lammps", y="Temp")
fig.save("figure1.pdf", dpi=300)          # Vector PDF for journals
fig.save("figure1.png", dpi=600)          # High-res PNG
fig.save("figure1.svg")                   # SVG for editing

# 3D renders for papers
av.render("dump.lammpstrj", frame=-1,
          style="publication",            # Clean white background
          output="figure2.png",
          width=2400, height=1800)

# ─── STYLE PRESETS ────────────────────────────────────────
av.set_style("nature")    # Nature journal style
av.set_style("acs")       # ACS journal style  
av.set_style("aps")       # APS/Physical Review style
av.set_style("dark")      # Dark theme for presentations
av.set_style("atlas")     # ATLAS brand style
```

### 3.3 Design Principles

1. **One line to beautiful** — Every common visualization task is one function call with beautiful defaults
2. **Jupyter-first** — Designed for notebooks; renders inline, interactive, no external app needed
3. **Publication-ready** — Default output meets journal standards (fonts, sizes, DPI, color palettes)
4. **LAMMPS-native** — Understands LAMMPS file formats natively, no conversion needed
5. **Progressive disclosure** — Simple by default, fully customizable when needed
6. **Performant** — Rust core (via PyO3) for parsing large dump files (millions of atoms)

### 3.4 Technical Architecture

```
atlas-view/
├── rust/                           # Rust core (PyO3 bindings)
│   ├── src/
│   │   ├── parsers/
│   │   │   ├── log.rs              # LAMMPS log file parser (all thermo styles)
│   │   │   ├── dump.rs             # LAMMPS dump file parser (atom, custom, xyz)
│   │   │   ├── data.rs             # LAMMPS data file parser
│   │   │   ├── rdf.rs              # RDF output file parser
│   │   │   └── chunk.rs            # fix ave/chunk output parser
│   │   ├── analysis/
│   │   │   ├── rdf.rs              # RDF computation from dump frames
│   │   │   ├── msd.rs              # MSD computation
│   │   │   ├── coordination.rs     # Coordination number analysis
│   │   │   ├── density_profile.rs  # Spatial density profiles
│   │   │   └── equilibration.rs    # Automatic equilibration detection
│   │   └── lib.rs                  # PyO3 module definition
│   └── Cargo.toml
│
├── python/
│   └── atlas_view/
│       ├── __init__.py             # Public API (av.thermo, av.atoms, etc.)
│       ├── thermo.py               # Thermo visualization functions
│       ├── atoms.py                # 3D atomic visualization
│       ├── trajectory.py           # Trajectory animation
│       ├── structural.py           # RDF, MSD, density profiles
│       ├── compare.py              # Multi-simulation comparison
│       ├── export.py               # Publication export (PDF, SVG, PNG)
│       ├── styles/
│       │   ├── atlas.py            # ATLAS default style
│       │   ├── nature.py           # Nature journal style
│       │   ├── acs.py              # ACS journal style
│       │   ├── aps.py              # APS journal style
│       │   └── dark.py             # Presentation dark theme
│       ├── _plotting/
│       │   ├── backend.py          # matplotlib/plotly abstraction
│       │   ├── colors.py           # Color palettes (colorblind-safe)
│       │   └── layouts.py          # Smart multi-panel layouts
│       ├── _3d/
│       │   ├── renderer.py         # Three.js WebGL renderer (Jupyter widget)
│       │   ├── atoms_widget.py     # Interactive 3D atom viewer
│       │   └── exporters.py        # Static 3D renders (raytracing via POV-Ray or pythreejs)
│       └── _core/
│           ├── io.py               # File loading orchestration
│           ├── system.py           # AtomicSystem lightweight data model
│           └── units.py            # LAMMPS unit style handling
│
├── js/                             # JavaScript for Jupyter widgets
│   ├── src/
│   │   ├── AtomViewer.js           # Three.js atom renderer
│   │   ├── TrajectoryPlayer.js     # Animated trajectory widget
│   │   └── InteractiveThermo.js    # Interactive thermo plot (plotly)
│   └── package.json
│
├── tests/
│   ├── test_data/                  # Sample LAMMPS output files
│   │   ├── lj_melt/               # LJ melt: log + dump
│   │   ├── water_spc/             # SPC/E water: log + dump  
│   │   ├── cu_eam/                # Copper EAM: log + dump
│   │   ├── polymer/               # Polymer chain: log + dump + data
│   │   └── crack/                 # Fracture: log + dump (large)
│   ├── test_thermo.py
│   ├── test_atoms.py
│   ├── test_structural.py
│   └── test_export.py
│
├── docs/
│   ├── getting_started.md
│   ├── gallery/                    # Visual gallery of all plot types
│   ├── tutorials/
│   │   ├── 01_thermo_basics.ipynb
│   │   ├── 02_atomic_visualization.ipynb
│   │   ├── 03_trajectory_animation.ipynb
│   │   ├── 04_structural_analysis.ipynb
│   │   ├── 05_publication_figures.ipynb
│   │   └── 06_comparing_simulations.ipynb
│   └── api/                        # Auto-generated API reference
│
├── gallery/                        # Example notebooks for the website
│   ├── lennard_jones_melt.ipynb
│   ├── water_structure.ipynb
│   ├── metal_deformation.ipynb
│   ├── polymer_dynamics.ipynb
│   └── grain_boundary.ipynb
│
├── pyproject.toml
├── README.md
└── LICENSE                         # Apache 2.0
```

### 3.5 Dependencies (Minimal)

**Required:**
- numpy
- matplotlib (2D plotting backbone)
- polars (fast DataFrame for large thermo data)

**Optional (installed with extras):**
- plotly (interactive plots)
- ipywidgets + pythreejs (3D in Jupyter)
- povray (publication 3D renders)

**Build:**
- maturin (Rust→Python build)
- PyO3 (Rust FFI)

The Rust core handles file parsing only — all visualization is pure Python. This keeps the install simple (`pip install atlas-view` works without a Rust toolchain via pre-built wheels).

---

## 4. What Makes It Win

### 4.1 Beautiful Defaults

Every plot out of `atlas-view` should look better than what 95% of LAMMPS users create manually. This means:

- **Colorblind-safe palettes** by default (no red-green)
- **Proper axis labels** auto-generated from LAMMPS unit style (e.g., "Temperature (K)" not "Temp")
- **Smart tick formatting** (no 1e+06, use "1 M" or scientific notation appropriately)
- **Consistent typography** (one sans-serif font family, proper sizes for journal figures)
- **Grid and spine** choices that match target journal guidelines
- **Legend placement** that doesn't obscure data
- **Automatic figure sizing** for single-column (3.375") or double-column (7") journal layouts

### 4.2 LAMMPS-Aware Intelligence

Not just generic plotting — the library understands LAMMPS semantics:

- **Auto-detects unit style** from log files (real, metal, lj, si, cgs) and labels axes correctly
- **Auto-detects equilibration** by analyzing energy convergence (block averaging, drift detection)
- **Auto-identifies energy components** and provides energy decomposition views
- **Understands dump columns** (id, type, x, y, z, vx, vy, vz, fx, fy, fz, c_pe, etc.)
- **Knows atom types** and can map to element symbols if `mass` is in the log
- **Handles multi-run logs** gracefully (equilibration → production, NVT → NPT transitions)
- **Handles periodic boundaries** correctly for 3D rendering and structural analysis

### 4.3 Gallery-Driven Documentation

The #1 way scientists discover viz tools is by seeing beautiful output. The atlas-view website features:

- **Visual gallery** of every plot type with the one-line command that produces it
- **"From log to figure" tutorials** — upload your log file, get a publication figure in 3 lines
- **Journal-specific style guides** — "How to make figures for Nature Materials with atlas-view"
- **Before/after comparisons** — ugly matplotlib script vs. one-line atlas-view

### 4.4 Performance for Real Data

LAMMPS simulations produce massive files. A trajectory of 1M atoms × 1000 frames = ~100 GB of dump data. The Rust parser core handles this:

- **Streaming parser** — doesn't load entire file into memory
- **Frame indexing** — random access to any frame without reading preceding frames
- **Lazy loading** — only parse requested columns/properties
- **Chunked RDF/MSD** — compute structural properties without loading all frames simultaneously
- **Pre-built wheels** — no compilation required for users (`manylinux`, `macosx`, `win`)

---

## 5. Launch & Adoption Strategy

### 5.1 Pre-Launch (Weeks 1–4)

- Implement core: log parser, dump parser, `av.thermo()`, `av.atoms()` (basic)
- Create 5 gallery notebooks with beautiful output
- Set up PyPI package with pre-built wheels
- Write README with GIF demos

### 5.2 Soft Launch (Week 5)

- `pip install atlas-view` works
- Post to LAMMPS Discourse (matsci.org/lammps) — "I built a viz library, feedback welcome"
- Post to r/computationalmaterialscience, r/physics
- Submit to Journal of Open Source Software (JOSS) review

### 5.3 Community Launch (Weeks 6–8)

- Gallery website at `atlas-sim.org/view`
- Tutorial notebooks on Google Colab (zero install)
- Twitter/X thread with animated GIF demos
- Submit to Awesome LAMMPS list
- Reach out to LAMMPS workshop organizers for tutorial slot
- Contact LAMMPS core developers for listing on lammps.org tools page

### 5.4 Growth (Months 3–6)

- Conference presentations (APS March Meeting poster/talk)
- JOSS paper published (citable for researchers)
- Integration with ASE, pymatgen (read their structures too)
- User-requested features from community feedback
- "atlas-view used by X papers" tracking

### 5.5 Bridge to ATLAS (Months 6–12)

- Introduce `atlas-view` features that hint at the full platform:
  - `av.atoms()` works with VASP POSCAR/CONTCAR too
  - `av.thermo()` works with VASP OSZICAR too
  - DFT charge density isosurface from CHGCAR
- Blog post: "atlas-view is becoming ATLAS — here's our vision"
- Early access program for `atlas-dft` and `atlas-md`

---

## 6. V1.0 Feature Scope (Ship in 8 Weeks)

### Must Have (Week 1–6)
- [x] Rust log file parser (line, multi, yaml thermo styles)
- [x] Rust dump file parser (atom, custom, xyz formats)
- [x] Rust LAMMPS data file parser
- [x] `av.thermo()` — one-line thermo plotting with auto-layout
- [x] `av.thermo_compare()` — multi-simulation comparison
- [x] `av.energy_breakdown()` — energy component visualization
- [x] `av.atoms()` — 3D WebGL atom viewer in Jupyter (via pythreejs)
- [x] `av.trajectory()` — animated trajectory playback
- [x] `av.rdf()` — radial distribution function
- [x] `av.msd()` — mean squared displacement
- [x] `av.density_profile()` — spatial density profiles
- [x] Journal style presets (nature, acs, aps)
- [x] PDF/SVG/PNG export at publication DPI
- [x] 5 gallery notebooks
- [x] PyPI package with manylinux/macosx/win wheels
- [x] Comprehensive README with GIFs
- [x] Auto-detection of LAMMPS unit style

### Nice to Have (Week 6–8)
- [ ] `av.stress_strain()` — stress-strain curves
- [ ] `av.coordination()` — coordination number analysis
- [ ] `av.bond_angle_distribution()` — angle distributions
- [ ] `av.voronoi()` — Voronoi tessellation view
- [ ] Color by per-atom compute (c_pe, c_stress, etc.)
- [ ] Slice/clip planes for 3D views
- [ ] Dark mode style preset
- [ ] Google Colab compatibility testing

### V1.1 (Month 3)
- [ ] Interactive plotly backend option
- [ ] VASP POSCAR/CONTCAR/CHGCAR support (bridge to ATLAS)
- [ ] XYZ, CIF, PDB file support
- [ ] Large file streaming (>10 GB trajectories)
- [ ] 3D publication renders via POV-Ray
- [ ] Custom colormaps

### V1.2 (Month 6)
- [ ] VASP OSZICAR/OUTCAR thermo parsing
- [ ] Lattice analysis (CNA, PTM)
- [ ] Dislocation visualization
- [ ] Grain boundary detection
- [ ] Real-time visualization from running LAMMPS (via PyLAMMPS)

---

## 7. Success Metrics

| Metric | 3 Months | 6 Months | 12 Months |
|--------|----------|----------|-----------|
| PyPI downloads | 1,000 | 10,000 | 50,000 |
| GitHub stars | 200 | 1,000 | 3,000 |
| Citing papers | 0 | 5 | 30 |
| Contributors | 3 | 10 | 25 |
| Listed on lammps.org | ❌ | ✅ | ✅ |
| JOSS paper | Submitted | Published | Cited |
| matsci.org mentions | 10 | 50 | 200 |

**North star metric:** Number of unique researchers who `import atlas_view` in a published paper's supplementary code.

---

## 8. How This Builds to ATLAS

```
Month 1–2:   atlas-view v1.0 — LAMMPS viz library
Month 3–4:   atlas-view v1.1 — adds VASP file support
Month 6:     atlas-view v1.2 — adds real-time LAMMPS viz
Month 8:     atlas-io v0.1   — spins out I/O layer as separate crate
Month 10:    atlas-md v0.1   — first MD kernels, uses atlas-io
Month 12:    atlas-dft v0.1  — first DFT kernels, uses atlas-io
Month 14:    atlas-ml v0.1   — first ML training pipeline
Month 18:    ATLAS v0.1      — unified platform alpha

The atlas-view community becomes the atlas community.
The atlas-view parsers become atlas-io.
The atlas-view data model becomes atlas-core.
```

Every line of code in atlas-view is designed to be extracted into the full ATLAS platform.
The Rust parsers become `atlas-io/lammps/`.
The `AtomicSystem` lightweight data model grows into the full unified representation.
The journal style presets serve every ATLAS visualization.

---

*"Get into the notebook first. The platform follows."*

---

*Document version: 1.0 — March 2026*
*Product: atlas-view*
*Parent project: ATLAS — Atomic-scale Theory, Learning, and Simulation*
