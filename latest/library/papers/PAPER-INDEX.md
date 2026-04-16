# Paper Index with Figure Extraction

> High-priority research papers affiliated with simulation datasets
> Each entry includes figure metadata for distiller training

---

## Tier 1: Must-Have Papers (Download Immediately)

### 1. Large-scale MD dataset of dislocation-GB interactions in FCC Cu

**Citation:**
```bibtex
@article{dang2025dislocation,
  title={A large-scale molecular dynamics dataset of dislocation-grain boundary interactions in FCC Cu},
  author={Dang, Khanh and others},
  journal={Scientific Data},
  volume={12},
  pages={xxx},
  year={2025},
  publisher={Nature Publishing Group},
  doi={10.1038/s41597-025-05256-6}
}
```

**Dataset Link:** WEST-MC-001

**Key Figures for Extraction:**

| Fig # | Title | Type | Distiller Use |
|-------|-------|------|---------------|
| 1 | GB network classification diagram | Schematic | Methodology training |
| 2 | Dislocation absorption mechanisms | Atomic render | Visualization training |
| 3 | Stress-strain curves by GB type | Line plot | Property prediction |
| 4 | Metastable GB structure catalog | Gallery | Structure classification |
| 5 | Dislocation line evolution | Time series | Dynamics training |

**Download Status:** ⬜ Pending
**PDF Location:** `papers/figures/WEST-MC-001/`

---

### 2. GRIP: Automated grand-canonical optimization for GB phases

**Citation:**
```bibtex
@article{chen2024grip,
  title={Automated grand-canonical optimization of grain-boundary phases},
  author={Chen, Enze and others},
  journal={Nature Communications},
  volume={15},
  pages={xxx},
  year={2024},
  publisher={Nature Publishing Group},
  doi={10.1038/s41467-024-51330-9}
}
```

**Dataset Link:** WEST-ZEN-001

**Key Figures:**

| Fig # | Title | Type | Distiller Use |
|-------|-------|------|---------------|
| 1 | GRIP workflow schematic | Algorithm | Methodology |
| 2 | Ti GB phase diagrams | Phase diagram | Phase stability |
| 3 | Point defect absorption maps | Contour plot | Defect mechanisms |
| 4 | GB structure gallery | Atomic structures | Structure library |
| 5 | Validation against DFT | Scatter plot | Accuracy assessment |

**Download Status:** ⬜ Pending
**PDF Location:** `papers/figures/WEST-ZEN-001/`

---

### 3. Topological GB segregation transitions (Science)

**Citation:**
```bibtex
@article{devulapalli2024topological,
  title={Topological grain-boundary segregation transitions},
  author={Devulapalli, Vivek and others},
  journal={Science},
  volume={386},
  number={xxx},
  pages={xxx},
  year={2024},
  publisher={American Association for the Advancement of Science},
  doi={10.1126/science.adq4147}
}
```

**Dataset Link:** WEST-ZEN-002

**Key Figures:**

| Fig # | Title | Type | Distiller Use |
|-------|-------|------|---------------|
| 1 | Segregation transition schematic | Conceptual | Theory training |
| 2 | Experimental microscopy + MD overlay | Combined | Multi-scale validation |
| 3 | Segregation enthalpy maps | Heatmap | Property visualization |
| 4 | Topological analysis diagrams | Network graph | Graph neural network training |
| 5 | Thermodynamic transitions | Phase diagram | Thermodynamics |

**Download Status:** ⬜ Pending
**PDF Location:** `papers/figures/WEST-ZEN-002/`

---

## Tier 2: High-Value Chinese Papers

### 4. Multi-physics material removal (NBSDC Flagship)

**Citation:**
```bibtex
@dataset{multiphysics2024,
  title={多物理场耦合下材料跨尺度去除模型与亚表面损伤抑制方法数据集},
  author={中科院过程工程研究所},
  year={2024},
  publisher={国家基础学科公共科学数据中心},
  cstr={16666.11.nbsdc.6qosvoyp}
}
```

**Dataset Link:** CN-NBSDC-001

**Key Figures (Expected):**

| Fig # | Title | Type | Distiller Use |
|-------|-------|------|---------------|
| 1 | Cross-scale methodology diagram | Schematic | Multi-scale framework |
| 2 | Nano-scratch MD snapshots | Atomic render | Damage visualization |
| 3 | SEM/TEM experimental images | Microscopy | Validation data |
| 4 | CFD + MD comparison plots | Multi-panel | Cross-model validation |
| 5 | Damage depth correlations | Scatter + fit | Predictive modeling |
| 6 | Material comparison (4 materials) | Multi-panel | Material benchmarking |

**Download Status:** ⬜ Pending
**PDF Location:** `papers/figures/CN-NBSDC-001/`
**Note:** Paper may be in Chinese — extract figures regardless

---

### 5. Hydrogen embrittlement in Fe-Cu alloys

**Citation:**
```bibtex
@dataset{hydrogen2021,
  title={合金元素晶界偏聚对氢相关行为的影响数据集},
  author={雍兮, 中科院金属研究所},
  year={2021},
  publisher={国家基础学科公共科学数据中心},
  cstr={16666.11.nbsdc.2eaz4c1k}
}
```

**Dataset Link:** CN-NBSDC-002

**Key Figures (Expected):**

| Fig # | Title | Type | Distiller Use |
|-------|-------|------|---------------|
| 1 | GB structure catalog | Gallery | Structure library |
| 2 | H binding energy distributions | Histogram | Energy landscapes |
| 3 | Diffusion pathway visualizations | 3D paths | Kinetics training |
| 4 | DFT vs MD comparison | Scatter | Multi-scale validation |
| 5 | Fracture work calculations | Bar chart | Mechanical properties |

**Download Status:** ⬜ Pending
**PDF Location:** `papers/figures/CN-NBSDC-002/`

---

## Tier 3: Specialized Datasets

### 6. CaCO3 Phase Transitions

**Citation:**
```bibtex
@article{sidler2024caco3,
  title={Structural phase transitions in CaCO3 via molecular dynamics},
  author={Sidler, Elizaveta and Cabriolu, Raffaela},
  journal={arXiv preprint},
  year={2024},
  doi={10.48550/arXiv.2408.04036}
}
```

**Dataset Link:** WEST-MC-002

**Key Figures:**
- Phase transition free energy surfaces
- Temperature-pressure phase diagrams
- Structural order parameter evolution

---

### 7. Graphene/CNT Spacer Structures

**Citation:**
```bibtex
@article{ding2023graphene,
  title={Multilayer graphene with inserted CNT nanospacers},
  author={Ding, Mingda and others},
  journal={Journal of Physical Chemistry C},
  year={2023},
  doi={10.1021/acs.jpcc.3c06132}
}
```

**Dataset Link:** WEST-MC-004

**Key Figures:**
- Stacking configuration schematics
- Interlayer spacing distributions
- Raman comparison (experimental)

---

### 8. Epoxy Crosslinking

**Citation:**
```bibtex
@article{livraghi2023epoxy,
  title={Crosslinked epoxy resin modeling},
  author={Livraghi, M. and others},
  journal={Journal of Physical Chemistry B},
  year={2023},
  doi={10.1021/acs.jpcb.3c04724}
}
```

**Dataset Link:** WEST-ZEN-003

**Key Figures:**
- Curing reaction schemes
- Crosslink density vs time
- Tensile stress-strain curves
- Glass transition temperature data

---

## Figure Extraction Protocol

### For Each Paper:

1. **Download PDF** from journal website or DOI
2. **Extract all figures** at 300+ DPI
3. **Create metadata file** (`figure-metadata.json`):

```json
{
  "paper_id": "WEST-MC-001",
  "figure_number": 2,
  "caption": "Dislocation absorption mechanisms at Σ5 GB",
  "panel_labels": ["a", "b", "c"],
  "atom_types": ["Cu"],
  "visualization_software": "OVITO",
  "color_coding": "centrosymmetry",
  "extracted": true,
  "files": [
    "fig2a_dislocation_approach.png",
    "fig2b_absorption_process.png", 
    "fig2c_final_configuration.png"
  ]
}
```

4. **Store in structured folder:**
```
papers/figures/{dataset_id}/
├── paper.pdf
├── figure-metadata.json
├── fig1/
│   ├── full.png
│   ├── panel_a.png
│   └── panel_b.png
├── fig2/
└── ...
```

---

## Download Checklist

### Week 1 Priority
- [ ] Dang et al. 2025 (Sci Data) — Cu dislocation-GB
- [ ] Chen et al. 2024 (Nat Commun) — Ti GB phases
- [ ] Devulapalli et al. 2024 (Science) — GB segregation

### Week 2 Priority  
- [ ] Multi-physics removal (Chinese) — CN-NBSDC-001
- [ ] Hydrogen embrittlement (Chinese) — CN-NBSDC-002
- [ ] Sidler & Cabriolu 2024 — CaCO3 phases

### Week 3 Priority
- [ ] Ding et al. 2023 — Graphene/CNT
- [ ] Livraghi et al. 2023 — Epoxy curing
- [ ] Anis et al. 2024 — Ni dislocation mobility

---

## Figure Training Data for Distiller

### Categories:

| Category | Count | Use Case |
|----------|-------|----------|
| Atomic structures (GBs, defects) | 50+ | Structure recognition |
| Stress-strain curves | 30+ | Property prediction |
| Phase diagrams | 20+ | Phase stability |
| RDF / Coordination | 25+ | Local structure analysis |
| Dislocation networks | 15+ | Defect dynamics |
| Segregation maps | 10+ | Chemical ordering |
| Time series (MD trajectories) | 40+ | Dynamics prediction |

### Total Target: 200+ figures for initial training

---

*Next Action: Download Tier 1 papers and begin figure extraction*
