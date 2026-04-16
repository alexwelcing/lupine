# WEST-MC-004: Graphene/CNT Stacking Structures

## Quick Load

```bash
# Load smallest structure (10x12 graphene, 2 CNTs)
atlas-view --file CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr10x12L2_CNT7@0x2_PBD.data

# Load medium structure (50x12 graphene, 2 CNTs)  
atlas-view --file CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x12/Gr50x12L2_CNT7@0x2_PBD.data

# Load largest 2-tube structure (100x20 graphene, 2 CNTs)
atlas-view --file CNT_PBD_2tubes/CNT_PBD_2tubes/CNTx2T_PBD_0a7_x20/Gr100x20L2_CNT7@0x2_PBD.data

# Load cross-aligned CNT structure
atlas-view --file CrossCNT/CrossCNT/CNTx2Cr_PBD_0a7_x20/Gr100x20L2_CNT7@7Cr_PBD.data
```

## Dataset Overview

| Property | Value |
|----------|-------|
| **Total Structures** | 60+ |
| **Atom Count Range** | 5,000 - 50,000 |
| **Format** | LAMMPS data file (atom_style full) |
| **Elements** | Carbon only (2 atom types: graphene, CNT) |

## Structure Naming Convention

```
Gr[A]x[B]L2_CNT[C]x2_PBD.data
│   │   │   │    │
│   │   │   │    └── Number of CNTs (x2 or x3)
│   │   │   └─────── CNT chirality (e.g., 7@0 = (7,0) CNT)
│   │   └─────────── "L2" = 2 layers
│   └─────────────── Graphene width (angstroms)
└─────────────────── Graphene length (angstroms)
```

Examples:
- `Gr10x12L2_CNT7@0x2_PBD.data` = 10Å×12Å graphene, 2×(7,0) CNTs
- `Gr100x20L2_CNT5@5x3_PBD.data` = 100Å×20Å graphene, 3×(5,5) CNTs
- `Gr80x20L2_CNT7@7Cr_PBD.data` = 80Å×20Å graphene, 2×(7,7) CNTs cross-aligned

## Viewer Configuration

### Recommended Visual Settings

```json
{
  "camera": "orthographic",
  "view_direction": [0, 0, 1],
  "color_by": "atom_type",
  "atom_types": {
    "1": {"name": "graphene", "color": "#40E0D0", "radius": 1.7},
    "2": {"name": "cnt", "color": "#FF6B6B", "radius": 1.7}
  },
  "bonds": {
    "enabled": true,
    "cutoff": 1.85
  },
  "show_cell": true,
  "background": "#1a1a2e"
}
```

### Interesting Views

1. **Top view** (z-axis): Shows graphene sheet with CNT spacers as circles
2. **Side view** (x or y-axis): Shows layer stacking and CNT height
3. **Cross-aligned**: X-pattern from crossed CNTs

## Simulation Details

From the LAMMPS input file:
- **Potential**: ReaxFF (reactive force field)
- **Ensemble**: NVT relaxation
- **Purpose**: Find energetically favorable stacking configurations
- **Output**: Minimum energy structures

## Batch Loading

To load all structures for comparison:

```python
# Python batch loader example
import glob
structures = glob.glob("CNT_PBD_2tubes/**/*.data", recursive=True)
for s in structures:
    print(f"Loading: {s}")
    # viewer.load(s)
```

## File Locations

```
west-mc-004/
├── CNT_PBD_2tubes/           # Parallel CNTs (2 tubes)
│   └── CNT_PBD_2tubes/
│       ├── CNTx2T_PBD_0a7_x12/   # 12Å wide structures
│       ├── CNTx2T_PBD_0a7_x20/   # 20Å wide structures
│       └── CNTx2T_PBD_0a7_x3.4/  # 3.4Å wide structures
├── CNT_PBD_3tubes/           # Parallel CNTs (3 tubes)
├── CrossCNT/                 # Cross-aligned CNTs
└── in.*.in                   # LAMMPS input scripts
```

## Citation

```bibtex
@article{ding2023graphene,
  title={Multilayer graphene with inserted CNT nanospacers},
  author={Ding, Mingda and others},
  journal={Journal of Physical Chemistry C},
  year={2023},
  doi={10.1021/acs.jpcc.3c06132}
}
```
