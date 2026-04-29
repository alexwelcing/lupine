# GLIM Molecular Dynamics Library

> **Production-ready LAMMPS datasets for ATLAS View**  
> **Status:** 🟢 Alpha Presentation Ready | **Size:** ~1 GB | **Datasets:** 2 Operational

[![Graphene/CNT](https://img.shields.io/badge/Graphene_CNT-575_MB-00d4aa)](#dataset-1-graphene-cnt)
[![Ti GB Phases](https://img.shields.io/badge/Ti_GB_Phases-431_MB-ffd700)](#dataset-2-ti-grain-boundaries)
[![Total Structures](https://img.shields.io/badge/Total_Structures-60+-blue)](#quick-start)
[![Viewer Ready](https://img.shields.io/badge/Viewer_Ready-Yes-success)](#viewer-integration)

---

## 🚀 Quick Start (30 Seconds)

```bash
# Navigate to library
cd latest/library/model-data/dump-files

# Load graphene/CNT structure (11K atoms, instant)
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data

# Load large structure (45K atoms, impressive)
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data
```

**That's it.** You now have 60+ molecular structures to explore.

---

## 📦 What's Included

### Dataset 1: Graphene/CNT Stacking ✅ Ready

**Source:** J. Phys. Chem. C (2023) | **DOI:** 10.1021/acs.jpcc.3c06132  
**Size:** 575 MB | **Structures:** 60+ | **Atoms:** 11K-55K

**What it is:** Multi-layer graphene with carbon nanotube spacers — designed for studying interlayer interactions in 2D materials.

**Structure types:**
- 🔹 **2-tube parallel** - 173 configurations
- 🔹 **3-tube parallel** - 24 configurations  
- 🔹 **Cross-aligned** - 15 X-pattern configurations

**Perfect for:**
- 2D material visualization
- Layer stacking demonstrations
- Interlayer spacing studies
- WebGPU performance testing

---

### Dataset 2: Ti Grain Boundary Phases ⏳ Downloading

**Source:** Nature Communications (2024) | **DOI:** 10.1038/s41467-024-51330-9  
**Size:** 431 MB | **Status:** Completes overnight

**What it is:** Automated grand-canonical optimization of titanium grain boundary phases — high-impact research data.

**Contents:**
- hcp Ti grain boundary structures
- Point defect absorption data
- DFT-validated configurations
- Phase transition catalog

**Perfect for:**
- Grain boundary visualization
- Phase diagram exploration
- Defect dynamics studies

---

## 🎮 Viewer Integration

### Load Commands by Use Case

```bash
# Demo: Fast load (2 seconds)
atlas-view west-mc-004/.../Gr10x12L2_CNT7@0x2_PBD.data

# Demo: Impressive scale (45K atoms)
atlas-view west-mc-004/.../Gr100x20L2_CNT7@0x2_PBD.data

# Demo: Unique pattern (cross-aligned)
atlas-view west-mc-004/.../Gr100x20L2_CNT7@7Cr_PBD.data
```

### Visual Configuration

```json
{
  "atom_types": {
    "1": { "name": "graphene", "color": "#40E0D0", "radius": 1.7 },
    "2": { "name": "cnt", "color": "#FF6B6B", "radius": 1.7 }
  },
  "bonds": { "enabled": true, "cutoff": 1.85 },
  "camera": { "projection": "orthographic" }
}
```

---

## 📚 Documentation

| Document | What You'll Find | When to Use |
|----------|------------------|-------------|
| **[ALPHA-PRESENTATION.md](ALPHA-PRESENTATION.md)** | Demo script & talking points | Morning presentation |
| **[CATALOG.md](CATALOG.md)** | Complete dataset inventory | Research & planning |
| **[LOAD-SCRIPTS.md](LOAD-SCRIPTS.md)** | All viewer commands | Daily use |
| **[PAPER-INDEX.md](PAPER-INDEX.md)** | Research papers + figures | Citation & context |
| **[FINAL-STATUS-REPORT.md](FINAL-STATUS-REPORT.md)** | Comprehensive status | Understanding scope |

---

## 🗂️ Library Structure

```
latest/library/
│
├── 📄 README.md                    ← You are here
├── 📄 ALPHA-PRESENTATION.md        ← Morning demo guide
├── 📄 CATALOG.md                   ← All 14 datasets
├── 📄 FINAL-STATUS-REPORT.md       ← Complete status
│
├── 📁 model-data/
│   └── dump-files/
│       ├── west-mc-004/           ✅ Graphene/CNT (575 MB)
│       │   ├── CNT_PBD_2tubes/     173 files
│       │   ├── CNT_PBD_3tubes/     24 files
│       │   └── CrossCNT/           15 files
│       │
│       └── west-zen-001/          ⏳ Ti GB (431 MB)
│
├── 📁 viewer-manifests/
│   ├── WEST-MC-004.json           ✅ Graphene config
│   └── WEST-ZEN-001.json          ⏳ Ti GB config
│
├── 📁 papers/
│   └── PAPER-INDEX.md             📚 Research context
│
└── 📁 by-material/
    ├── metals/                    📝 README
    ├── ceramics/                  📝 README
    ├── polymers/                  📝 README
    ├── alloys/                    📝 README
    └── 2d-materials/              📝 README
```

---

## 🎯 Use Cases

### For Demo/Presentation
```bash
# Quick load test
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data

# See ALPHA-PRESENTATION.md for full script
```

### For Research
```bash
# Browse all structures
ls west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/*/

# Pick by size
cat CATALOG.md | grep "Gr[0-9]"
```

### For Development
```bash
# Check viewer configs
cat viewer-manifests/WEST-MC-004.json | jq .

# Test load with config
atlas-view --config viewer-manifests/WEST-MC-004.json [file]
```

---

## 🔬 Research Affiliations

**Graphene/CNT Dataset:**
- 📄 Ding et al., *J. Phys. Chem. C*, 2023
- 🔗 DOI: [10.1021/acs.jpcc.3c06132](https://doi.org/10.1021/acs.jpcc.3c06132)
- 📊 Experimental validation: Raman spectroscopy

**Ti GB Dataset:**
- 📄 Chen et al., *Nature Communications*, 2024
- 🔗 DOI: [10.1038/s41467-024-51330-9](https://doi.org/10.1038/s41467-024-51330-9)
- 🔬 Method: Automated grand-canonical optimization (GRIP)

---

## 📈 Coming Next

| Priority | Dataset | Size | Source |
|----------|---------|------|--------|
| 🔴 High | Multi-physics removal | 55 GB | NBSDC (China) |
| 🔴 High | Cu dislocation-GB | 6.6 GB | Materials Cloud |
| 🟡 Medium | CaCO3 phases | 12 MB | Materials Cloud |
| 🟡 Medium | HEA potentials | 568 KB | Materials Cloud |
| 🟢 Low | Epoxy curing | 59 MB | Zenodo |

**See:** `chinese-md-sources.md` for full Chinese dataset research

---

## 🛠️ Troubleshooting

### "File not found"
```bash
# Check you're in the right directory
pwd  # Should show .../latest/library/model-data/dump-files

# List available files
ls west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/
```

### "WebGPU not supported"
- Use Chrome 113+ or Edge 113+
- Enable: `chrome://flags/#enable-unsafe-webgpu`
- Check: `chrome://gpu` → "WebGPU: Hardware accelerated"

### "Load is slow"
- Use smaller structure: `Gr10x12` (11K atoms)
- Enable GPU acceleration
- Close other browser tabs

---

## 📞 Quick Reference

| Task | Command/File |
|------|--------------|
| **Fast demo load** | `atlas-view west-mc-004/.../Gr10x12...` |
| **Scale demo** | `atlas-view west-mc-004/.../Gr100x20...` |
| **Demo script** | `cat ALPHA-PRESENTATION.md` |
| **All datasets** | `cat CATALOG.md` |
| **Load scripts** | `cat LOAD-SCRIPTS.md` |
| **Status report** | `cat FINAL-STATUS-REPORT.md` |

---

## 🏆 Project Status

**Phase:** Alpha Presentation Ready  
**Last Updated:** 2026-03-17 23:50  
**Datasets Operational:** 1 (Graphene/CNT)  
**Datasets Downloading:** 1 (Ti GB)  
**Total Size:** ~1 GB  

**Next Milestone:** Complete Ti download + Post-alpha feedback

---

## 📜 Citation

If you use these datasets:

```bibtex
@misc{glim2026library,
  title={GLIM Molecular Dynamics Library},
  author={GLIM Project},
  year={2026},
  note={Integrated repository of LAMMPS datasets for ATLAS View},
  datasets={
    graphene={Ding2023, DOI:10.1021/acs.jpcc.3c06132},
    titanium={Chen2024, DOI:10.1038/s41467-024-51330-9}
  }
}
```

---

*Built for ATLAS View alpha presentation*  
*Optimized for WebGPU molecular visualization*
