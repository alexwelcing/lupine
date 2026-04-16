# GLIM Viewer Load Scripts

## Quick Start Commands

### Graphene/CNT Stacking (WEST-MC-004) - Ready Now

```bash
# Small structure (11K atoms) - Fast load
atlas-view latest/library/model-data/dump-files/west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data

# Medium structure (20K atoms)
atlas-view latest/library/model-data/dump-files/west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr50x20L2_CNT7@0x2_PBD.data

# Large structure (40K atoms) - GPU recommended
atlas-view latest/library/model-data/dump-files/west-mc-004/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data

# Cross-aligned CNTs (unique structure)
atlas-view latest/library/model-data/dump-files/west-mc-004/CrossCNT/CrossCNT/CNTx2Cr_PBD_0a7_x20/Gr100x20L2_CNT7@7Cr_PBD.data
```

### Batch Load All Structures

```bash
# Find all .data files and create a manifest
find latest/library/model-data/dump-files/west-mc-004 -name "*.data" > graphene-cnt-manifest.txt

# Load with specific view settings
atlas-view --manifest graphene-cnt-manifest.txt --config viewer-configs/graphene-cnt.json
```

---

## Visual Configuration

### Graphene/CNT Viewer Config (`viewer-configs/graphene-cnt.json`)

```json
{
  "dataset": "WEST-MC-004",
  "title": "Graphene/CNT Stacking Structures",
  "atom_types": {
    "1": {
      "name": "graphene_sheet",
      "element": "C",
      "color": "#40E0D0",
      "radius": 1.7,
      "opacity": 0.9
    },
    "2": {
      "name": "cnt",
      "element": "C", 
      "color": "#FF6B6B",
      "radius": 1.7,
      "opacity": 1.0
    }
  },
  "bonds": {
    "enabled": true,
    "cutoff": 1.85,
    "radius": 0.3
  },
  "camera": {
    "projection": "orthographic",
    "position": [0, 0, 100],
    "target": [50, 60, 0],
    "up": [0, 1, 0]
  },
  "lighting": {
    "ambient": 0.4,
    "diffuse": 0.6,
    "specular": 0.2
  },
  "background": "#1a1a2e",
  "show_cell": true,
  "show_axes": true
}
```

---

## Structure Gallery

### By Size (Graphene Sheet Dimensions)

| Structure | File | Atoms | Size (Å) | CNT Type |
|-----------|------|-------|----------|----------|
| **Small** | Gr10x12 | ~11K | 10×12 | (7,0) × 2 |
| **Medium** | Gr50x20 | ~25K | 50×20 | (7,0) × 2 |
| **Large** | Gr100x20 | ~45K | 100×20 | (7,0) × 2 |
| **XL** | Gr120x20 | ~55K | 120×20 | (7,0) × 2 |

### By Configuration

| Type | Directory | Description |
|------|-----------|-------------|
| 2 parallel CNTs | `CNT_PBD_2tubes/` | Equal spacing, parallel alignment |
| 3 parallel CNTs | `CNT_PBD_3tubes/` | One additional repeated unit |
| Cross-aligned | `CrossCNT/` | X-pattern from crossed CNTs |

---

## Python Batch Loader

```python
#!/usr/bin/env python3
"""
GLIM Dataset Loader for ATLAS View
Loads Graphene/CNT structures with optimized settings
"""

import glob
import json
import subprocess

DATASET_PATH = "latest/library/model-data/dump-files/west-mc-004"

def get_all_structures():
    """Get all .data files in the dataset"""
    pattern = f"{DATASET_PATH}/**/*.data"
    return sorted(glob.glob(pattern, recursive=True))

def load_structure(filepath, view_type="default"):
    """Load a single structure in the viewer"""
    cmd = ["atlas-view", "--file", filepath]
    
    if view_type == "top":
        cmd.extend(["--camera", "0,0,100", "--projection", "ortho"])
    elif view_type == "side":
        cmd.extend(["--camera", "100,0,0", "--projection", "ortho"])
    
    subprocess.run(cmd)

def create_gallery_manifest():
    """Create a manifest for all structures"""
    structures = get_all_structures()
    
    manifest = {
        "dataset": "WEST-MC-004",
        "title": "Graphene/CNT Stacking Gallery",
        "structures": []
    }
    
    for s in structures:
        # Parse filename for metadata
        filename = s.split("/")[-1]
        # Gr100x20L2_CNT7@0x2_PBD.data
        parts = filename.replace(".data", "").split("_")
        
        manifest["structures"].append({
            "file": s,
            "name": filename,
            "graphene_size": parts[0],
            "cnt_config": parts[2] if len(parts) > 2 else "unknown"
        })
    
    with open("graphene-cnt-manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Created manifest with {len(structures)} structures")
    return manifest

if __name__ == "__main__":
    # Example usage
    structures = get_all_structures()
    print(f"Found {len(structures)} structures")
    
    # Load the smallest for testing
    if structures:
        smallest = min(structures, key=lambda x: x.count("x"))
        print(f"Loading: {smallest}")
        load_structure(smallest, view_type="top")
```

---

## Shell Scripts

### Quick Load (Unix/Mac)

```bash
#!/bin/bash
# load-graphene-cnt.sh

DATASET="latest/library/model-data/dump-files/west-mc-004"

echo "GLIM Graphene/CNT Loader"
echo "========================"
echo ""
echo "1. Small structure (11K atoms)"
echo "2. Medium structure (25K atoms)"
echo "3. Large structure (45K atoms)"
echo "4. Cross-aligned (45K atoms)"
echo ""
read -p "Select structure [1-4]: " choice

case $choice in
  1)
    FILE="$DATASET/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data"
    ;;
  2)
    FILE="$DATASET/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr50x20L2_CNT7@0x2_PBD.data"
    ;;
  3)
    FILE="$DATASET/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data"
    ;;
  4)
    FILE="$DATASET/CrossCNT/CrossCNT/CNTx2Cr_PBD_0a7_x20/Gr100x20L2_CNT7@7Cr_PBD.data"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo "Loading: $FILE"
atlas-view --file "$FILE" --config viewer-configs/graphene-cnt.json
```

### Quick Load (Windows PowerShell)

```powershell
# load-graphene-cnt.ps1

$DATASET = "latest/library/model-data/dump-files/west-mc-004"

Write-Host "GLIM Graphene/CNT Loader" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Small structure (11K atoms)"
Write-Host "2. Medium structure (25K atoms)"  
Write-Host "3. Large structure (45K atoms)"
Write-Host "4. Cross-aligned (45K atoms)"
Write-Host ""

$choice = Read-Host "Select structure [1-4]"

switch ($choice) {
    "1" { $FILE = "$DATASET/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data" }
    "2" { $FILE = "$DATASET/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr50x20L2_CNT7@0x2_PBD.data" }
    "3" { $FILE = "$DATASET/CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data" }
    "4" { $FILE = "$DATASET/CrossCNT/CrossCNT/CNTx2Cr_PBD_0a7_x20/Gr100x20L2_CNT7@7Cr_PBD.data" }
    default { Write-Host "Invalid choice" -ForegroundColor Red; exit }
}

Write-Host "Loading: $FILE" -ForegroundColor Cyan
atlas-view --file $FILE
```

---

## Download Status

| Dataset | Status | Size | Files | Viewer Ready |
|---------|--------|------|-------|--------------|
| WEST-MC-004 (Graphene/CNT) | ✅ Complete | 575 MB | 212 | ✅ Yes |
| WEST-MC-001 (Cu dislocation) | ⏳ Partial | 146 MB | - | ⏳ No |
| WEST-MC-002 (CaCO3) | ⬜ Pending | - | - | ⬜ No |
| WEST-MC-003 (HEA potential) | ⬜ Failed | - | - | ⬜ No |

---

## Next Steps

1. **Resume Cu download** (6.6GB) - Run download script in background
2. **Try alternative sources** for CaCO3 dataset
3. **Test viewer** with Graphene/CNT data
4. **Download Chinese datasets** from NBSDC

---

*Load scripts last updated: 2026-03-17*
