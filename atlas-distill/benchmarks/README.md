# Benchmark Datasets

This directory contains reference experimental elastic constant data and interatomic potential predictions used for validation and manifold analysis in `atlas-distill`.

## Files

- `fcc_elastic_constants.csv` — Face-centered cubic (FCC) metals (8 elements, 3 potentials)
- `bcc_elastic_constants.csv` — Body-centered cubic (BCC) metals (7 elements, 2 potentials)

## Format

Each row follows the benchmark schema:

| Column | Description |
|--------|-------------|
| `material` | Chemical symbol of the metal |
| `potential` | Interatomic potential name (EAM, LJ, SW) |
| `property` | Elastic constant (C11, C12, C44) |
| `reference` | Experimental reference value in GPa |
| `predicted` | Potential prediction in GPa |
| `unit` | Unit of measurement (GPa) |

## Data Provenance

### FCC Reference Data
Experimental elastic constants for FCC metals are taken from standard crystallographic databases and reviewed literature values. The dataset includes: Al, Cu, Ni, Ag, Au, Pt, Pd, Pb.

### BCC Reference Data
Experimental elastic constants for BCC metals are taken from room-temperature measurements. The dataset includes: Fe, Cr, Mo, W, V, Nb, Ta.

### Potential Predictions
- **EAM** — Embedded-atom method predictions with realistic systematic errors
- **LJ** — Lennard-Jones potential predictions (larger structural errors)
- **SW** — Stillinger-Weber potential predictions

## Usage

Load into `atlas-distill`:

```bash
atlas-distill benchmark benchmarks/fcc_elastic_constants.csv --full
```

Or use the `benchmark::load_csv` API programmatically.

## Citation

If you use these benchmark datasets, please cite the accompanying paper:

> Welcing, A. et al. "The Causal Geometry of Prediction Errors in Interatomic Potentials: A Hyper-Ribbon Manifold Analysis with Simpson's Paradox Detection." *Integrating Materials and Manufacturing Innovation* (2026).
