# GLIM MD Library Catalog

> **Unified repository for LAMMPS molecular dynamics research data**
> Integrating Chinese first-party sources with Western benchmark datasets
> Optimized for ATLAS View WebGL visualization + Distiller AI research

---

## Quick Navigation

| Section | Description | Viewer Ready |
|---------|-------------|--------------|
| [Chinese Sources](#chinese-sources-) | ScienceDB, NBSDC, CAS Institute data | 3 datasets |
| [Western Sources](#western-sources-) | Zenodo, Materials Cloud, NIST | 8 datasets |
| [By Material](#by-material-class-) | Metals, Ceramics, Polymers, 2D Materials | Cross-referenced |
| [Model Data](#model-data-) | Dump files, Input scripts, Potentials | Ready to load |
| [Papers with Figures](#papers-with-figures-) | PDFs + extracted figure metadata | Linked |

---

## Chinese Sources 🇨🇳

### Priority Tier 1: Direct Download Available

#### 1. Multi-Physics Material Removal Dataset (55.85GB)
```yaml
id: CN-NBSDC-001
cstr: "16666.11.nbsdc.6qosvoyp"
source: "国家基础学科公共科学数据中心"
institution: "中科院过程工程研究所"
title: "多物理场耦合下材料跨尺度去除模型与亚表面损伤抑制方法数据集"
materials:
  - GaN (氮化镓)
  - LiTaO3 (钽酸锂)
  - SiC (碳化硅)
  - MgAl2O4 (镁铝尖晶石)
simulation_types:
  - LAMMPS MD (nano-scratch, 双划痕模型)
  - Ansys Fluent CFD
  - SEM/TEM experimental
data_size: "55.85GB"
file_count: 2563
formats: [lammps, lmp, log, h5, tiff, msh]
viewer_suitability: "excellent"  # Large-scale, multi-timestep
distiller_value: "high"  # Cross-scale validation
access_url: "https://nbsdc.cn/general/dataDetail?id=683de914195d2612331895a3&type=1"
download_status: "pending"
```

**Contents for Viewer:**
- LAMMPS dump files from nano-scratch simulations
- Multiple load conditions per material
- Associated experimental SEM/TEM for validation

**Contents for Distiller:**
- Cross-scale comparison methodology
- Hard-brittle material damage mechanisms
- Published paper affiliation: TBD

---

#### 2. Grain Boundary Hydrogen Embrittlement Dataset
```yaml
id: CN-NBSDC-002
cstr: "16666.11.nbsdc.2eaz4c1k"
source: "国家基础学科公共科学数据中心"
institution: "中科院金属研究所"
title: "合金元素晶界偏聚对氢相关行为的影响数据集"
materials:
  - Fe-Cu alloys
  - Various grain boundary types
methods:
  - VASP (DFT first-principles)
  - LAMMPS (classical MD)
properties:
  - GB structures
  - Hydrogen binding energies
  - Diffusion pathways
  - Ideal fracture work
data_size: "~2GB"
viewer_suitability: "excellent"  # Clean GB structures
distiller_value: "high"  # Multi-scale approach
access_url: "https://www.escience.org.cn/metadata/detail?id=2ce818534b401c7fa2f2b28d816e5c73"
download_status: "pending"
```

**Contents for Viewer:**
- GB structure data files
- H diffusion trajectory segments

**Contents for Distiller:**
- DFT+MD validation methodology
- Hydrogen embrittlement mechanisms

---

#### 3. Epoxy/Polyurethane Copolymer Friction
```yaml
id: CN-LICP-001
source: "中科院兰州化学物理研究所科学数据中心"
title: "不同温度下环氧/聚氨酯共聚物摩擦学性能的分子动力学模拟研究"
materials:
  - Epoxy/Polyurethane copolymers (2EP/PU, 2PU/EP)
  - Iron layer interface
conditions:
  - 223K, 298K, 373K temperature series
properties:
  - Friction coefficients
  - Young's modulus
  - Shear properties
methods:
  - LAMMPS MD with ReaxFF
  - Sliding friction models
data_size: "~100MB"
viewer_suitability: "good"  # Polymer chain visualization
access_url: "http://119.78.99.9:8081/dataDetails/dc90a13d17ab41e0aa61e13a30c8b07c"
download_status: "pending"
```

---

### Priority Tier 2: Repository Mining Required

#### 4. ScienceDB Molecular Dynamics Collection
```yaml
id: CN-SCDB-001
source: "ScienceDB (科学数据银行)"
search_terms: ["分子动力学", "LAMMPS", "MD simulation"]
url: "https://www.scidb.cn"
filter: "材料科学 OR 化学"
datasets_expected: 50+
viewer_potential: "high"
```

#### 5. TensorKMC Defect Evolution
```yaml
id: CN-NBSDC-003
source: "NBSDC 分子动力学模拟 collection"
title: "Fe-Cu合金缺陷演化TensorKMC数据集"
method: TensorKMC
content: Cu原子扩散, 缺陷演化
data_size: "3.5MB"
viewer_suitability: "medium"
```

#### 6. Hefei-NAMD Excited State Dynamics
```yaml
id: CN-NBSDC-004
source: "NBSDC"
title: "激发态动力学第一性原理计算数据集"
software: Hefei-NAMD (self-developed)
data_size: "12GB"
content: 11 representative works on molecular materials
viewer_suitability: "low"  # Quantum chemistry focus
```

---

## Western Sources 🌍

### Verified LAMMPS Datasets

#### 1. Cu Dislocation-GB Interaction Database (6.6GB)
```yaml
id: WEST-MC-001
doi: "10.1038/s41597-025-05256-6"
source: "Materials Cloud"
authors: "Khanh Dang et al."
journal: "Scientific Data (Nature)"
title: "Large-scale MD dataset of dislocation-grain-boundary interactions in FCC Cu"
material: "Copper (FCC)"
content:
  - 100s of symmetric tilt GBs
  - Multiple dislocation character types
  - Metastable GB structures
  - ML-ready analyses
data_size: "6.6GB (DisGB_data.zip)"
license: "CC BY 4.0"
url: "https://archive.materialscloud.org/records/59y2w-rap91"
viewer_suitability: "excellent"
distiller_value: "high"
download_status: "pending"
```

**Why it matters:** 100,000+ GB structures — perfect for testing viewer scalability

---

#### 2. GRIP Ti Grain Boundary Phases (431MB)
```yaml
id: WEST-ZEN-001
doi_paper: "10.1038/s41467-024-51330-9"
doi_data: "10.5281/zenodo.12590125"
source: "Zenodo + GitHub"
authors: "Enze Chen et al."
journal: "Nature Communications"
title: "GRIP: Automated grand-canonical optimization for GB phases in hcp Ti"
material: "Titanium (hcp)"
content:
  - GB structures for 0001, 01-10, 12-10 tilt boundaries
  - Phase transitions
  - Point-defect absorption data
  - GRIP_snapshot.zip (1.0MB)
  - scripts.zip (8.8kB)
data_size: "431.6MB total"
license: "CC BY 4.0"
urls:
  - "https://doi.org/10.5281/zenodo.12590125"
  - "https://github.com/enze-chen/grip"
viewer_suitability: "excellent"
```

---

#### 3. CaCO3 Phase Transitions (11.8MB)
```yaml
id: WEST-MC-002
doi: "10.48550/arXiv.2408.04036"
source: "Materials Cloud"
authors: "Elizaveta Sidler & Raffaela Cabriolu"
title: "CaCO3 structural phase transitions via MD"
potential: "Raiteri potential"
content:
  - LAMMPS inputs (in_temp.lammps, in_press.lammps)
  - Starting configurations (.data files)
  - PLUMED input files
  - Temperature/pressure phase maps
data_size: "11.8MB"
license: "CC BY 4.0"
url: "https://archive.materialscloud.org/records/36xwe-mfe60"
viewer_suitability: "good"  # Mineral structures
```

---

#### 4. HfNbTaZr HEA EAM Potential
```yaml
id: WEST-MC-003
doi: "10.1016/j.actamat.2016.01.018"
source: "Materials Cloud"
authors: "Soumyadipta Maiti & Walter Steurer"
journal: "Acta Materialia"
title: "EAM potential for HfNbTaZr refractory HEAs"
material: "HfNbTaZr High-Entropy Alloy"
content:
  - LAMMPS-readable EAM file
  - Lattice distortion parameters
  - SRO effects data
data_size: "568.2KB"
url: "https://archive.materialscloud.org/records/a2hfp-zcx33"
viewer_suitability: "medium"  # Potential file only
```

---

#### 5. Topological GB Segregation (7.7GB)
```yaml
id: WEST-ZEN-002
doi_paper: "10.1126/science.adq4147"
doi_data: "10.5281/zenodo.13903314"
source: "Zenodo"
authors: "Vivek Devulapalli et al."
journal: "Science"
title: "Topological grain-boundary segregation transitions"
content:
  - MD/MC semigrand-canonical workflows
  - Thermodynamic excess properties
  - MDMC-SGC.zip (6.1GB)
  - Data.zip (1.6GB)
  - GRIP.zip (1.0MB)
data_size: "7.7GB"
url: "https://doi.org/10.5281/zenodo.13903314"
viewer_suitability: "excellent"
```

---

#### 6. Graphene/CNT Spacer Structures (62.3MB)
```yaml
id: WEST-MC-004
doi: "10.1021/acs.jpcc.3c06132"
source: "Materials Cloud"
authors: "Mingda Ding et al."
journal: "Journal of Physical Chemistry C"
title: "Multilayer graphene with CNT nanospacers"
material: "Graphene + Carbon Nanotubes"
content:
  - CNT_PBD_2tubes.zip (52.5MB)
  - CNT_PBD_3tubes.zip (3.2MB)
  - CrossCNT.zip (6.6MB)
  - LAMMPS inputs (in.*.in)
  - MATLAB utility (dump2data.m)
data_size: "62.3MB"
license: "CC BY-NC-SA 4.0"
url: "https://archive.materialscloud.org/records/rqp47-8es22"
viewer_suitability: "excellent"  # 2D materials visualization
```

---

#### 7. Crosslinked Epoxy Resin (45.5MB + 13.7MB)
```yaml
id: WEST-ZEN-003
doi: "10.1021/acs.jpcb.3c04724"
source: "Zenodo"
title: "Crosslinked epoxy resin modeling dataset"
content:
  - lammps.zip (45.5MB) - scripts + data
  - lammps_noCharge.zip (13.7MB)
  - amberLib.zip
  - curingReaction.zip
  - Bond/react templates
  - Glass transition annealing data
  - Tensile test scripts
url: "https://zenodo.org/records/7273800"
viewer_suitability: "good"
```

---

#### 8. Ni Edge Dislocation Bayesian Analysis
```yaml
id: WEST-ZEN-004
doi: "10.1103/PhysRevMaterials.8.123604"
source: "Zenodo"
authors: "Geraldine Anis et al."
journal: "Physical Review Materials"
title: "Bayesian dislocation mobility law from atomistic trajectories"
material: "Nickel (FCC)"
content:
  - data.zip (LAMMPS scripts, logs)
  - data_stress.zip (OVITO/DXA outputs)
  - Mishin 2004 EAM potential
method: DEMC fitting
dataset_doi: "10.5281/zenodo.10649697"
viewer_suitability: "excellent"  # Dislocation dynamics
```

---

## By Material Class 📊

### Metals

| Dataset | Material | Size | Source | Viewer Rating |
|---------|----------|------|--------|---------------|
| CN-NBSDC-001 | GaN, SiC, etc. | 55.85GB | NBSDC | ⭐⭐⭐⭐⭐ |
| CN-NBSDC-002 | Fe-Cu alloys | ~2GB | NBSDC | ⭐⭐⭐⭐⭐ |
| WEST-MC-001 | Cu (FCC) | 6.6GB | Materials Cloud | ⭐⭐⭐⭐⭐ |
| WEST-ZEN-004 | Ni (FCC) | Unknown | Zenodo | ⭐⭐⭐⭐⭐ |

**Viewer Focus:** Dislocation dynamics, grain boundaries, plastic deformation

---

### Ceramics & Minerals

| Dataset | Material | Size | Source | Viewer Rating |
|---------|----------|------|--------|---------------|
| CN-NBSDC-001 | GaN, LiTaO3, SiC, Spinel | 55.85GB | NBSDC | ⭐⭐⭐⭐⭐ |
| WEST-MC-002 | CaCO3 | 11.8MB | Materials Cloud | ⭐⭐⭐⭐ |

**Viewer Focus:** Phase transitions, hardness, brittle fracture

---

### Polymers

| Dataset | Material | Size | Source | Viewer Rating |
|---------|----------|------|--------|---------------|
| CN-LICP-001 | Epoxy/Polyurethane | ~100MB | LICP | ⭐⭐⭐⭐ |
| WEST-ZEN-003 | Crosslinked Epoxy | 59.2MB | Zenodo | ⭐⭐⭐⭐ |

**Viewer Focus:** Chain dynamics, crosslinking, glass transition

---

### Alloys

| Dataset | Material | Size | Source | Viewer Rating |
|---------|----------|------|--------|---------------|
| CN-NBSDC-002 | Fe-Cu (GB+H) | ~2GB | NBSDC | ⭐⭐⭐⭐⭐ |
| WEST-MC-003 | HfNbTaZr HEA | 568KB | Materials Cloud | ⭐⭐⭐ |
| WEST-ZEN-001 | Ti (hcp GBs) | 431MB | Zenodo | ⭐⭐⭐⭐⭐ |
| WEST-ZEN-002 | Binary alloys (segregation) | 7.7GB | Zenodo | ⭐⭐⭐⭐⭐ |

**Viewer Focus:** GB segregation, phase stability, HEA complexity

---

### 2D Materials

| Dataset | Material | Size | Source | Viewer Rating |
|---------|----------|------|--------|---------------|
| WEST-MC-004 | Graphene + CNT | 62.3MB | Materials Cloud | ⭐⭐⭐⭐⭐ |

**Viewer Focus:** Stacking, spacers, interlayer interactions

---

## Model Data 📁

### Dump Files (Viewer-Ready)

```
latest/library/model-data/dump-files/
├── chinese/
│   ├── CN-NBSDC-001/  # 55GB multi-physics
│   ├── CN-NBSDC-002/  # GB hydrogen
│   └── CN-LICP-001/   # Polymer friction
└── western/
    ├── WEST-MC-001/   # Cu dislocation-GB
    ├── WEST-ZEN-001/  # Ti GB phases
    ├── WEST-MC-002/   # CaCO3 phases
    └── WEST-MC-004/   # Graphene/CNT
```

### Input Scripts

```
latest/library/model-data/input-scripts/
├── in.lammps templates/
├── potential files/
│   ├── EAM/
│   ├── MEAM/
│   └── ReaxFF/
└── analysis scripts/
```

---

## Papers with Figures 📄

### PDF Collection Strategy

Each entry in this library links to:
1. **Source PDF** — Original paper for context
2. **Figure extraction** — Key visualizations for distiller training
3. **Data availability statement** — Where simulation files live
4. **Citation metadata** — BibTeX for reference management

### High-Priority Papers for Distiller

| Paper | Journal | Key Figures | Data Source |
|-------|---------|-------------|-------------|
| Dang et al. 2025 | Sci Data | GB networks, stress fields | WEST-MC-001 |
| Chen et al. 2024 | Nat Commun | Phase diagrams, GB structures | WEST-ZEN-001 |
| Devulapalli et al. 2024 | Science | Segregation maps | WEST-ZEN-002 |
| (Pending) | - | Multi-physics cross-scale | CN-NBSDC-001 |

---

## Download Queue 🚀

### Phase 1: Viewer Testing (This Week)
1. [ ] WEST-MC-001 — Cu dislocation-GB (6.6GB)
2. [ ] WEST-MC-004 — Graphene/CNT (62MB)
3. [ ] CN-NBSDC-002 — GB hydrogen (~2GB)

### Phase 2: Distiller Training (Next Week)
4. [ ] WEST-ZEN-001 — Ti GB phases (431MB)
5. [ ] WEST-ZEN-002 — Topological segregation (7.7GB)
6. [ ] CN-NBSDC-001 — Multi-physics (55GB)

### Phase 3: Complete Archive (Ongoing)
7. [ ] CN-LICP-001 — Polymer friction
8. [ ] WEST-MC-002 — CaCO3 phases
9. [ ] WEST-ZEN-003 — Epoxy curing
10. [ ] ScienceDB mining — 50+ additional datasets

---

## Viewer Integration 🎮

### Manifest Format

Each dataset includes a `viewer-manifest.json`:

```json
{
  "dataset_id": "WEST-MC-001",
  "title": "Cu Dislocation-GB Database",
  "files": [
    {
      "path": "DisGB_data.zip",
      "type": "archive",
      "contents": [
        {"pattern": "*.dump", "type": "lammps_dump", "atoms": "10000-1000000"},
        {"pattern": "*.data", "type": "lammps_data"}
      ]
    }
  ],
  "recommended_views": ["dislocation", "GB_network", "stress_field"],
  "atom_count_range": [10000, 1000000],
  "has_timesteps": true,
  "potential": "Mishin_2004_Cu",
  "temperatures": [300, 600, 900]
}
```

### Quick Load Commands

```bash
# Load Cu dislocation dataset
atlas-view --dataset WEST-MC-001 --view dislocation

# Load Chinese multi-physics dataset
atlas-view --dataset CN-NBSDC-001 --view cross-scale
```

---

## Distiller Integration 🤖

### Research Paper Affiliation

Each dataset maps to:
- **Methodology papers** — How the simulation was done
- **Analysis papers** — What was learned
- **Validation data** — Experimental comparisons

### Training Data Extraction

| Source Type | Extracted Content | Use Case |
|-------------|-------------------|----------|
| LAMMPS logs | Energy, temperature, pressure | Convergence training |
| Dump files | Atomic positions, velocities | Structure prediction |
| Input scripts | Force fields, ensembles | Methodology learning |
| Paper figures | Stress-strain, RDF, MSD | Visualization training |

---

## License Summary 📜

| Source | License | Commercial Use | Attribution |
|--------|---------|----------------|-------------|
| ScienceDB | Mixed | Dataset dependent | Required |
| NBSDC | Mixed | Dataset dependent | Required |
| Materials Cloud | CC BY 4.0 | ✅ Yes | Required |
| Zenodo | CC BY 4.0 (most) | ✅ Yes | Required |

---

## Maintenance Log 📝

| Date | Action | User |
|------|--------|------|
| 2026-03-17 | Initial catalog creation | System |
| 2026-03-17 | Added Chinese sources | System |
| 2026-03-17 | Merged Western benchmarks | System |

---

*Next Update: After Phase 1 downloads complete*
