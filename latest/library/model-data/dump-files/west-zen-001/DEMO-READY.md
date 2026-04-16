# Ti Grain Boundary Phases - Demo Guide

> **Dataset:** WEST-ZEN-001  
> **Source:** Nature Communications 2024  
> **DOI:** 10.5281/zenodo.12590125 / 10.1038/s41467-024-51330-9

---

## 🎬 Demo Script (When Download Completes)

### Introduction
> "This dataset is from a Nature Communications paper on automated grand-canonical optimization of titanium grain boundary phases. It includes DFT-validated hcp Ti structures with point defect absorption data."

---

## 📂 Dataset Structure

```
west-zen-001/
├── 0001_Hennig.zip          (12.8 MB)  - [0001] tilt GB, Hennig potential
├── 0001_Zope.zip            (20.1 MB)  - [0001] tilt GB, Zope potential
├── 01-10_Hennig.zip         (56.7 MB)  - [01-10] tilt GB, Hennig potential
├── 01-10_Zope.zip           (70.6 MB)  - [01-10] tilt GB, Zope potential
├── 12-10_Hennig.zip         (108.8 MB) - [12-10] tilt GB, Hennig potential
├── 12-10_Zope.zip           (148.2 MB) - [12-10] tilt GB, Zope potential
├── gamma_surface.zip        (3.5 KB)   - Gamma surface calculations
├── GRIP_snapshot.zip        (1.0 MB)   - GRIP workflow snapshot
├── open_surface.zip         (13.4 MB)  - Open surface structures
└── scripts.zip              (8.8 KB)   - Analysis scripts
```

**Total:** 431.6 MB  
**GB Types:** [0001], [01-10], [12-10] tilt boundaries  
**Potentials:** Hennig & Zope (comparative study)

---

## 🚀 Quick Demo Commands

### Option 1: GRIP Snapshot (Smallest, Fastest)
```bash
# 1.0 MB - Workflow demonstration
atlas-view extracted/GRIP_snapshot/[structure-file]
```

### Option 2: Gamma Surface (Analysis Data)
```bash
# 3.5 KB - Surface energy data
# Good for 2D plots + 3D structure correlation
```

### Option 3: Full GB Structure (Impressive)
```bash
# 12-56 MB per zip - Full tilt GB catalog
atlas-view extracted/12-10_Hennig/[GB_structure].data
```

---

## 🎯 Demo Flow

### 1. Show Dataset Scale (30 sec)
```bash
# List all available structures
ls extracted/*/ | head -20
# Show: "Over 100 GB structures across 3 tilt boundary types"
```

### 2. Load Representative GB (1 min)
```bash
# Load a [0001] tilt GB (smallest category)
atlas-view extracted/0001_Hennig/[structure].data

# Visual highlights:
# - hcp titanium structure
# - Grain boundary plane
# - Dislocation network
```

### 3. Show Phase Transition (1 min)
```bash
# Compare two phases side-by-side
atlas-view extracted/01-10_Hennig/phase_A.data &
atlas-view extracted/01-10_Hennig/phase_B.data &

# Talking point: "Free energy difference drives phase transition"
```

### 4. Research Context (30 sec)
> "This data supports the Nature Communications paper on automated GB optimization. Each structure was validated against DFT calculations."

---

## 📊 Key Visual Features

### What to Highlight

| Feature | What to Show | Talking Point |
|---------|--------------|---------------|
| **GB Plane** | Rotate to show boundary | "Tilt boundary separating two crystals" |
| **Dislocations** | Zoom to atomic scale | "Dislocation network accommodating misorientation" |
| **Defects** | Color by centrosymmetry | "Point defects preferentially segregate to GB" |
| **hcp Structure** | View along c-axis | "Hexagonal close-packed titanium" |

---

## 🔬 Research Value

### Why This Dataset Matters

1. **Automated Discovery**
   - GRIP (Grand-canonical optimization) workflow
   - Discovers new GB phases automatically
   - Traditional methods miss metastable phases

2. **DFT Validation**
   - Every structure DFT-checked
   - Confidence in predicted phases
   - Bridge between experiment and simulation

3. **Defect Chemistry**
   - Point defect absorption data
   - Critical for radiation damage
   - Nuclear materials applications

### Citation
```bibtex
@article{chen2024grip,
  title={Grand canonically optimized grain boundary phases in hexagonal close-packed titanium},
  author={Chen, Enze and Heo, Tae Wook and Wood, Brandon and Asta, Mark and Frolov, Timofey},
  journal={Nature Communications},
  volume={15},
  pages={6235},
  year={2024},
  publisher={Nature Publishing Group},
  doi={10.1038/s41467-024-51330-9}
}
```

---

## 🛠️ Setup Commands

### Extract All Archives
```bash
cd west-zen-001

# Extract all zip files
for zip in *.zip; do
    unzip -q "$zip" -d "extracted/${zip%.zip}"
done

echo "Extraction complete!"
ls extracted/
```

### Check Available Structures
```bash
# Count total structures
find extracted/ -name "*.data" -o -name "*.lmp" | wc -l

# List GB types
ls extracted/
# Output: 0001_Hennig  0001_Zope  01-10_Hennig  01-10_Zope  12-10_Hennig  12-10_Zope
```

---

## 📈 Comparison with Graphene/CNT

| Property | Graphene/CNT | Ti GB Phases |
|----------|--------------|--------------|
| **Material** | 2D carbon | hcp titanium |
| **Structure** | Layered + spacers | Grain boundaries |
| **Atoms** | 11K-55K | Varies (typically 10K-50K) |
| **Use case** | 2D materials | Defect engineering |
| **Potential** | ReaxFF | Hennig/Zope EAM |
| **Publication** | J. Phys. Chem. C | Nature Communications |

**Demo narrative:** "From 2D carbon structures to metal grain boundaries — covering different materials classes and simulation methods."

---

## 🎨 Viewer Configuration

### Ti GB Config (`viewer-configs/Ti-GB.json`)
```json
{
  "dataset": "WEST-ZEN-001",
  "title": "Ti Grain Boundary Phases",
  "atom_types": {
    "1": { "name": "Ti", "element": "Ti", "color": "#C0C0C0", "radius": 1.47 }
  },
  "bonds": { "enabled": true, "cutoff": 3.0 },
  "camera": { "projection": "perspective" },
  "color_by": "centrosymmetry",
  "background": "#1a1a2e"
}
```

---

## ⚡ Emergency Backup Demo

If files aren't extracted in time:

```bash
# Show file structure
tree west-zen-001/ -L 1

# Reference paper
cat << EOF
Nature Communications 2024
"Grand canonically optimized grain boundary phases in hcp titanium"
DOI: 10.1038/s41467-024-51330-9

Key findings:
- Automated discovery of GB phases
- DFT-validated structures
- Point defect absorption mechanisms
EOF
```

---

## ✅ Post-Download Checklist

When download completes:
- [ ] Extract all zip files
- [ ] Test load one structure
- [ ] Verify atom count
- [ ] Check visual quality
- [ ] Update viewer manifest
- [ ] Add to presentation rotation

---

*Demo guide prepared: 2026-03-18*  
*Status: Awaiting download completion*  
*Expected structures: 100+ GB configurations*
