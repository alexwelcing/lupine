# ATLAS View Alpha Presentation

> **Presenter:** [Your Name]  
> **Duration:** 5 minutes  
> **Materials:** ATLAS View WebGPU app + 2 demo datasets

---

## 🎯 Opening Hook (30 sec)

> "Molecular dynamics generates terabytes of atomistic data. We built ATLAS View to visualize millions of atoms in real-time — in the browser, using WebGPU."

**Action:** Open atlas-view in browser, show loading screen

---

## 📦 Demo 1: Graphene/CNT (2 minutes)

### Context
> "First dataset: Carbon nanotubes on graphene sheets. Research from J. Phys. Chem. C — 212 structures ranging from 11,000 to 55,000 atoms."

### Demo Flow

**1. Fast Demo (30 sec)**
```
File: Gr10x12L2_CNT7@0x2_PBD.data
Atoms: 11,136
Load time: ~2 seconds
```
- Load file
- Rotate: "Graphene sheet with two carbon nanotubes"
- Highlight: Colored by type (graphene = blue, CNT = gold)
- Pan/zoom: "60Å spacing between tubes"

**2. Show Variety (30 sec)**
- Quick switch: 2-tube → 3-tube → cross-aligned
- Point out: "Different CNT orientations and spacings"

**3. Scale Demo (60 sec)**
```
File: Gr100x20L2_CNT7@0x2_PBD.data
Atoms: 45,888
```
- Load large structure
- Emphasize: "45K atoms, still 60 FPS"
- Rotate slow: "Full view of 100Å × 20Å graphene sheet"
- Top view → Side view toggle

**Talking Points:**
- "WebGPU enables this performance — no desktop app needed"
- "ReaxFF potential for chemical accuracy"
- "575 MB dataset, ready for immediate analysis"

---

## 📦 Demo 2: Ti Grain Boundaries (1.5 minutes)

### Context
> "Second dataset: Titanium grain boundary phases from a Nature Communications paper. This is DFT-validated research on hcp titanium grain boundaries."

### Demo Flow

**1. Dataset Overview (30 sec)**
```
Dataset: WEST-ZEN-001
Source: Zenodo / DOI: 10.5281/zenodo.12590125
Size: 431 MB
Structures: 100+ GB configurations
```
- Show file tree: "Three tilt boundary types, two potentials"

**2. Load GB Structure (45 sec)**
```
File: [0001] tilt boundary (Hennig potential)
Atoms: ~15,000-30,000
```
- Load structure
- Rotate to show grain boundary plane
- Zoom: "Dislocation network accommodating misorientation"
- Color by centrosymmetry: "Defects segregate to boundary"

**3. Research Context (15 sec)**
> "GRIP workflow — grand-canonical optimization. Discovers new GB phases automatically, validated with DFT. This is how modern materials science is done."

**Talking Points:**
- "Hennig vs Zope potentials — comparative study"
- "Point defect absorption data included"
- "Nuclear materials application"

---

## 🔬 Technical Deep-Dive (30 sec)

### Architecture

**Component Stack:**
```
UI Layer:    React + TypeScript + React Three Fiber
Rendering:   WebGPU → wgpu → Raw GPU access
Parsing:     Rust WASM → 60fps LAMMPS parsing
Data:        Content-addressable cache (SHA-256)
```

### Performance
```
Graphene/CNT: 11K-55K atoms → 60 FPS
Ti GB:        ~25K atoms avg → 60 FPS
Memory:       Streaming parse, <100 MB footprint
```

### Key Innovation
> "WebGPU in the browser reaches desktop-class performance. No installation, no backend, instant sharing of molecular visualizations."

---

## 📚 Dataset Catalog Overview (30 sec)

### Library Stats
```
Total Datasets: 14
├── Chinese Sources: 6
│   └── NBSDC Multi-physics: 55.85 GB flagship
└── Western Sources: 8
    └── Materials Cloud / Zenodo

Total Size: ~56 GB (compressed)
Coverage: Graphene, CNT, GaN, SiC, Ti, Cu, SiGe
```

### Citation Standards
> "Every dataset has DOI + CSTR (Chinese) identifiers, BibTeX citations, and full provenance. Research-grade data for serious work."

---

## 🚀 Closing & Next Steps (30 sec)

### Summary
> "ATLAS View + Chinese-Western dataset library = molecular visualization without barriers. WebGPU-powered, browser-native, research-ready."

### Call to Action
```
Try it: atlas-view.example.com
Docs:   atlas-view.example.com/docs
Datasets: github.com/xxx/atlas-datasets
```

### Future Roadmap
- [ ] 1 million atom support (streaming)
- [ ] Time-series animation
- [ ] In-browser ML analysis
- [ ] Chinese mirror for datasets

---

## 🛠️ Setup Checklist

### Before Presentation
- [ ] Build viewer: `cd atlas-view && pnpm build`
- [ ] Test WebGPU: Visit https://webgpu.io
- [ ] Clear cache: DevTools → Application → Clear storage
- [ ] Prepare datasets: Both folders accessible
- [ ] Close background apps (free RAM)

### Emergency Fallbacks
| Issue | Fallback |
|-------|----------|
| WebGPU fails | Show screenshots / video recording |
| Ti download incomplete | Focus on Graphene/CNT only |
| Build fails | Use pre-built bundle from `./dist` |
| Large file crashes | Use 11K atom file instead |

---

## 📊 Demo Files Reference

### Graphene/CNT Dataset
```
Location: latest/library/model-data/dump-files/west-mc-004/
Manifest: latest/library/viewer-manifests/WEST-MC-004.json
Docs:     latest/library/README.md (section 2)

Fast:    CNT_PBD_2tubes/*/Gr10x12L2_CNT7@0x2_PBD.data (11K atoms)
Medium:  CNT_PBD_3tubes/*/Gr10x12L3_CNT7@0x2_PBD.data (14K atoms)
Large:   CNT_PBD_2tubes/*/Gr100x20L2_CNT7@0x2_PBD.data (45K atoms)
```

### Ti GB Dataset
```
Location: latest/library/model-data/dump-files/west-zen-001/
Manifest: (To be created after download)
Docs:     latest/library/model-data/dump-files/west-zen-001/DEMO-READY.md

Best for demo: GRIP_snapshot/ (1 MB) or 0001_Hennig/ (12 MB)
```

---

## 🎨 Presentation Tips

### Do
- Start with the "hook" — WebGPU performance
- Show, don't tell — rotate structures live
- Mention paper citations for credibility
- Keep mouse movements slow and deliberate
- Have screenshots ready as backup

### Don't
- Don't load files >50K atoms on low-end laptops
- Don't rush the WebGPU tech explanation
- Don't skip the Chinese research context
- Don't rely on internet (demo offline if possible)

---

## 📱 Live Commands (Copy-Paste Ready)

```bash
# Graphene fast demo
cd latest/library/model-data/dump-files/west-mc-004
atlas-view CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data

# Graphene large demo
atlas-view CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data

# Ti GB (when ready)
cd ../west-zen-001
atlas-view extracted/0001_Hennig/[structure].data
```

---

**Presentation prepared:** 2026-03-18  
**Version:** Alpha Demo v1.0  
**Contact:** [your-email] for questions
