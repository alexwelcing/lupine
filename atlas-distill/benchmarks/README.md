# Benchmark Data

Elastic constant benchmark data for the atlas-distill validation engine.

## Files

### Existing (hardcoded replicas)

- `fcc_elastic_constants.csv` — 8 FCC metals × 3 potentials (EAM, LJ, SW) × 3 properties = 72 rows
- `bcc_elastic_constants.csv` — 7 BCC metals × 2 potentials (EAM, LJ) × 3 properties = 42 rows

These reproduce the hardcoded values in `validation.rs` and serve as the legacy baseline.

### NIST-derived

- `nist_scaffold.csv` — **170 real NIST potentials** × 3 properties = **510 rows**

Generated via:
```bash
atlas-distill nist --scaffold > benchmarks/nist_scaffold.csv
```

Each row has:
| Column | Description |
|--------|-------------|
| `material` | Element symbol (Al, Cu, Fe, ...) |
| `potential` | Short label (Mishin-1999, Lee-2003, ...) |
| `property` | Elastic constant (C11, C12, C44) |
| `reference` | Experimental value (GPa) |
| `predicted` | **Blank** — to be filled from LAMMPS runs or literature |
| `unit` | GPa |
| `nist_id` | Full NIST implementation ID |
| `pair_style` | LAMMPS pair_style (eam/alloy, meam, ...) |
| `doi` | Publication DOI |

## Usage

```bash
# Load and analyze any benchmark CSV
atlas-distill benchmark benchmarks/fcc_elastic_constants.csv --full

# Query the NIST catalog
atlas-distill nist
atlas-distill nist --element Al --single
atlas-distill nist --pair-style meam

# Generate scaffold for a specific element
atlas-distill nist --element Fe --scaffold > benchmarks/fe_scaffold.csv
```

## Population Strategy

The `predicted` column in `nist_scaffold.csv` can be populated from:

1. **Published papers** — many NIST entries report their fitted elastic constants in the original paper
2. **NIST property pages** — the NIST IPR itself sometimes lists computed properties
3. **LAMMPS runs** — use the parameter files in `atlas/nist_ipr/files/` to compute elastic constants directly
