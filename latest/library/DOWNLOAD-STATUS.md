# Download Status Report

**Date:** 2026-03-17  
**Total Downloaded:** 721 MB  
**Datasets Ready:** 1 (WEST-MC-004)

---

## ✅ Successfully Downloaded

### WEST-MC-004: Graphene/CNT Stacking Structures

| Property | Value |
|----------|-------|
| **Status** | ✅ Complete & Extracted |
| **Total Size** | 575 MB |
| **Files** | 212 (60+ structures) |
| **Atom Count** | 11,000 - 55,000 per structure |
| **Format** | LAMMPS data files |
| **Location** | `model-data/dump-files/west-mc-004/` |

**Contents:**
- 173 files in `CNT_PBD_2tubes/` (2 parallel CNTs)
- 24 files in `CNT_PBD_3tubes/` (3 parallel CNTs)
- 15 files in `CrossCNT/` (cross-aligned CNTs)

**Viewer Ready:** YES - All files are LAMMPS data files ready to load

**Quick Load:**
```bash
# Smallest structure (11K atoms)
atlas-view latest/library/model-data/dump-files/west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data

# Large structure (45K atoms)
atlas-view latest/library/model-data/dump-files/west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data
```

---

## ⏳ Partially Downloaded

### WEST-MC-001: Cu Dislocation-GB Database

| Property | Value |
|----------|-------|
| **Status** | ⏳ Partial (2% complete) |
| **Downloaded** | 146 MB of 6,600 MB |
| **Issue** | Timeout on large file download |
| **Action Needed** | Resume download with断点续传 |

**File:** `west-mc-001/DisGB_data.zip` (partial)

**To Resume:**
```bash
# Using wget with resume
cd latest/library/model-data/dump-files/west-mc-001
wget -c https://archive.materialscloud.org/records/59y2w-rap91/files/DisGB_data.zip?download=1
```

---

## ⬅️ Failed Downloads

### WEST-MC-002: CaCO3 Phase Transitions

| Property | Value |
|----------|-------|
| **Status** | ❌ Failed |
| **Issue** | Direct download URL not accessible |
| **Alternative** | Manual download from Materials Cloud |

**Manual Download:**
1. Visit: https://archive.materialscloud.org/records/36xwe-mfe60
2. Click "Download" button
3. Extract to: `model-data/dump-files/west-mc-002/`

### WEST-MC-003: HEA EAM Potential

| Property | Value |
|----------|-------|
| **Status** | ❌ Failed |
| **Issue** | Directory not created |
| **Retry** | Create directory first |

---

## 📋 Next Download Queue

### Immediate Priority

1. **Resume Cu dislocation** (6.6GB)
   - High value for viewer testing
   - 100+ GB structures
   - Dislocation dynamics visualization

2. **Retry CaCO3** (12MB)
   - Small file, quick win
   - Phase transition animations
   - Mineral structures

### This Week

3. **Chinese datasets from NBSDC:**
   - CN-NBSDC-001: 55GB multi-physics
   - CN-NBSDC-002: 2GB GB hydrogen
   - CN-LICP-001: 100MB polymer friction

4. **Western datasets:**
   - WEST-ZEN-001: Ti GB phases (431MB)
   - WEST-ZEN-002: GB segregation (7.7GB)
   - WEST-MC-004: ✅ Done

---

## 📁 Current Library Structure

```
latest/library/
├── CATALOG.md (16 KB) - Complete dataset inventory
├── README.md (8 KB) - Library overview
├── LOAD-SCRIPTS.md (8 KB) - Viewer load commands
├── PAPER-INDEX.md (9 KB) - Paper + figure extraction plan
├── viewer-manifests/
│   ├── WEST-MC-001.json
│   ├── WEST-MC-004.json ⭐ Ready
│   ├── WEST-ZEN-002.json
│   └── CN-NBSDC-001.json
├── papers/figures/ (empty - awaiting download)
├── model-data/
│   └── dump-files/
│       ├── west-mc-001/ (146 MB partial)
│       ├── west-mc-002/ (empty)
│       ├── west-mc-004/ ⭐ 575 MB ready
│       └── western/ (empty)
└── by-material/
    └── (README files created)
```

---

## 🎯 What's Ready for Viewer Testing

### Graphene/CNT Dataset (WEST-MC-004)

**60+ unique structures** including:
- Varying graphene sheet sizes (10Å to 120Å)
- Different CNT chiralities ((7,0), (5,5), (7,7))
- 2-tube, 3-tube, and cross-aligned configurations
- All in LAMMPS data format (atom_style full)

**Visual Features:**
- 2D graphene sheets (can use orthographic projection)
- 1D CNT spacers (cylindrical inclusions)
- Layer stacking visible in z-direction
- Two atom types (different colors)

**Test Scenarios:**
1. **Performance:** Load Gr120x20 (55K atoms) - stress test
2. **Visual:** Gr10x12 (11K atoms) - quick load
3. **Unique:** CrossCNT structures - X-pattern
4. **Comparison:** Side-by-side different sizes

---

## 📝 Download Scripts

### Resume Cu Download

```bash
#!/bin/bash
# resume-cu-download.sh

cd latest/library/model-data/dump-files/west-mc-001

URL="https://archive.materialscloud.org/records/59y2w-rap91/files/DisGB_data.zip?download=1"

# Try with wget (with resume)
if command -v wget &> /dev/null; then
    wget -c "$URL" -O DisGB_data.zip
# Or curl (without resume)
elif command -v curl &> /dev/null; then
    curl -C - -O "$URL"
else
    echo "Please install wget or curl"
fi
```

### Download CaCO3 (Manual)

```bash
# Alternative: direct API call
curl -L "https://archive.materialscloud.org/api/records/36xwe-mfe60/files/dataset.zip/content" \
     -o latest/library/model-data/dump-files/west-mc-002/dataset.zip
```

---

## 📊 Progress Summary

| Category | Target | Downloaded | Status |
|----------|--------|------------|--------|
| Western datasets | 8 | 1 (+1 partial) | 25% |
| Chinese datasets | 6 | 0 | 0% |
| Total data | ~80 GB | 721 MB | 0.9% |
| Viewer-ready | 14 | 1 | 7% |

---

## 🚀 Recommended Next Actions

1. **Test viewer** with Graphene/CNT data (ready now)
2. **Resume Cu download** (background process)
3. **Manual download** CaCO3 dataset (small, quick)
4. **Start Chinese dataset** downloads (ScienceDB/NBSDC)

---

*Status report generated: 2026-03-17 23:15*
