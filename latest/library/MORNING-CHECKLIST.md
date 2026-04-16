# Alpha Presentation Morning Checklist

> **Date:** March 18, 2026  
> **Time:** Presentation Day  
> **Goal:** Flawless ATLAS View demo

---

## ☕ Pre-Presentation (30 min before)

### System Check
- [ ] **Browser ready** - Chrome/Edge 113+ open
- [ ] **WebGPU enabled** - Verify at `chrome://gpu`
- [ ] **Terminal open** - Navigate to `latest/library/model-data/dump-files`
- [ ] **No distractions** - Close unnecessary apps/tabs

### Quick Test (5 minutes)
```bash
# Test 1: Fast load
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data
# Should load in <2 seconds

# Test 2: Large structure (if time permits)
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data
# Should load in <10 seconds
```

### Backup Plan
- [ ] **Smallest structure ready:** `Gr10x12L2_CNT7@0x2_PBD.data` (11K atoms)
- [ ] **Medium structure ready:** `Gr50x20L2_CNT7@0x2_PBD.data` (25K atoms)
- [ ] **Large structure ready:** `Gr100x20L2_CNT7@0x2_PBD.data` (45K atoms)
- [ ] **Unique structure ready:** `Gr100x20L2_CNT7@7Cr_PBD.data` (cross-aligned)

---

## 🎬 Presentation Flow (5 Minutes Total)

### 1. Opening (30 seconds)
**Script:**
> "ATLAS View is a WebGPU-powered molecular dynamics visualizer. Today we're showing our alpha with two production datasets: graphene/CNT stacking structures and titanium grain boundaries. Both are peer-reviewed research datasets from 2023-2024."

**Action:** Show library folder structure

---

### 2. Demo 1: Graphene/CNT (2 minutes)

**Script:**
> "First, let's look at 2D materials. This dataset has 60+ graphene structures with carbon nanotube spacers — published in J. Phys. Chem. C."

**Commands:**
```bash
# Load impressive structure
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data
```

**Visual Flow:**
1. **Rotate** (show 3D perspective)
2. **Zoom to atomic scale** (show detail)
3. **Switch to side view** (show layer stacking)
   - Press `O` for orthographic projection
4. **Point out:**
   - Cyan = graphene sheets
   - Red = CNT spacers
   - Layer spacing visible

**Key talking points:**
- "45,000 atoms rendered at 60fps"
- "WebGPU compute shaders for culling"
- "Two atom types with bond rendering"
- "Real research data from 2023 publication"

---

### 3. Demo 2: Ti Grain Boundaries (1.5 minutes)

**Script:**
> "Second dataset: titanium grain boundaries from Nature Communications 2024. This is automated grand-canonical optimization data — DFT-validated structures."

**Status:** 
- If download complete: Load and demo
- If still downloading: Show file structure, reference paper

**Command (if ready):**
```bash
# Will be in west-zen-001/
atlas-view west-zen-001/[structure-file]
```

**Alternative (if not ready):**
> "This 431 MB dataset is completing download now. It includes hcp Ti grain boundary phase transitions with point defect absorption data."

---

### 4. Closing (30 seconds)

**Script:**
> "We have 60+ graphene structures operational today, with Ti GB phases coming online. Next: 55 GB Chinese multi-physics dataset covering GaN, SiC, and cross-scale validation. Questions?"

**Leave behind:**
- Repository: `latest/library/`
- Documentation: `ALPHA-PRESENTATION.md`
- Quick start: This checklist

---

## 🚨 Emergency Procedures

### "WebGPU not working"
```
1. Open chrome://flags
2. Search "WebGPU"
3. Enable "Unsafe WebGPU"
4. Restart browser
5. Test: chrome://gpu → look for "WebGPU: Hardware accelerated"
```

### "File won't load"
```bash
# Check file exists
ls west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/

# Use absolute path
atlas-view $PWD/west-mc-004/.../Gr10x12...data
```

### "Too slow"
```bash
# Use smallest structure
atlas-view west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data
```

### "Everything fails"
**Backup demo:**
1. Show file structure: `tree west-mc-004/ -L 2`
2. Show README: `cat README.md | head -50`
3. Show CATALOG: `cat CATALOG.md | head -80`
4. Emphasize: "60 structures, 575 MB, fully documented"

---

## 📊 Key Numbers to Remember

| Metric | Value |
|--------|-------|
| **Graphene structures** | 60+ |
| **Atoms range** | 11K - 55K |
| **Dataset size** | 575 MB |
| **Load time (small)** | <2 seconds |
| **Load time (large)** | <10 seconds |
| **WebGPU atoms** | 100K @ 60fps target |
| **Ti GB size** | 431 MB (downloading) |

---

## 📁 Critical File Paths

```bash
# Presentation entry point
cd latest/library/model-data/dump-files

# Demo structures (copy these paths)
SMALL=west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data
MEDIUM=west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr50x20L2_CNT7@0x2_PBD.data
LARGE=west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data
CROSS=west-mc-004/CrossCNT/CrossCNT/CNTx2Cr_PBD_0a7_x20/Gr100x20L2_CNT7@7Cr_PBD.data

# Load commands
atlas-view $SMALL      # 11K atoms, instant
atlas-view $MEDIUM     # 25K atoms, fast
atlas-view $LARGE      # 45K atoms, impressive
atlas-view $CROSS      # 45K atoms, unique pattern
```

---

## 🎯 Success Criteria

**Minimum viable demo:**
- ✅ One structure loads
- ✅ Rotation works
- ✅ Zoom works
- ✅ 60fps maintained

**Excellent demo:**
- ✅ Multiple structures loaded
- ✅ Orthographic projection shown
- ✅ Atom types explained
- ✅ Research paper referenced
- ✅ Smooth 60fps throughout

**Outstanding demo:**
- ✅ All above plus:
- ✅ Ti GB dataset demo
- ✅ File structure tour
- ✅ Chinese datasets teased
- ✅ Questions answered confidently

---

## 📝 Post-Presentation Notes

**Capture feedback on:**
1. Viewer performance (load times, fps)
2. Visual quality (colors, bonds, lighting)
3. Dataset interest (which materials?)
4. Missing features (what's needed?)
5. Chinese dataset priorities

**Update after presentation:**
- [ ] Note any technical issues
- [ ] Collect feature requests
- [ ] Prioritize next downloads
- [ ] Update documentation

---

## 🎉 You've Got This

**What you have:**
- ✅ 575 MB of real research data
- ✅ 60+ molecular structures
- ✅ 11K-55K atoms per structure
- ✅ Peer-reviewed dataset (J. Phys. Chem. C)
- ✅ Professional documentation
- ✅ Working download pipeline

**What you're showing:**
- WebGPU molecular visualization
- Real research data integration
- Professional data library
- Scalable architecture

**Good luck!** 🚀

---

*Checklist created: 2026-03-17 23:55*  
*For presentation: 2026-03-18*  
*Datasets ready: 1 (Graphene/CNT) + 1 downloading (Ti GB)*
