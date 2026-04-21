# atlas-distill

**Mathematical discovery engine for molecular dynamics simulation data.**

[![Tests](https://github.com/alexwelcing/lupine/actions/workflows/build-atlas-distill.yml/badge.svg)](https://github.com/alexwelcing/lupine/actions/workflows/build-atlas-distill.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`atlas-distill` is a Rust-based scientific engine for analyzing the geometric and statistical structure of interatomic potential prediction errors. It implements sloppy model theory, causal inference (Simpson's paradox detection), and random-effects meta-analysis for systematic benchmarking of classical and machine-learning potentials.

## Features

- **Manifold Analysis** — PCA/SVD eigenvalue analysis of prediction errors with hyper-ribbon detection
- **Bootstrap Uncertainty Quantification** — 95% confidence intervals for participation ratios and geometric fits
- **Meta-Analysis** — Fixed/random-effects meta-analysis with Fisher z-transformation, DerSimonian-Laird τ², and I² heterogeneity
- **Simpson's Paradox Detection** — Pooled vs. within-group correlation comparison with reversal markers
- **Multi-Potential Benchmarking** — FCC (8 metals) and BCC (7 metals) elastic constant validation
- **Literature Fetching** — CrossRef/arXiv abstract retrieval and value extraction
- **Lean 4 Formalization** — Export computationally validated relationships into formal specification

## Quick Start

### Installation

```bash
# From crates.io (when published)
cargo install atlas-distill

# From source
git clone https://github.com/alexwelcing/lupine.git
cd lupine/atlas-distill
cargo build --release
```

### Run the full validation suite

```bash
# FCC benchmark with manifold analysis
cargo run --bin atlas-distill -- validate --full

# BCC benchmark
cargo run --bin atlas-distill -- validate --full --bcc

# Manifold analysis only
cargo run --bin atlas-distill -- manifold

# Simpson's paradox demo
cargo run --bin atlas-distill -- detect-paradox --bcc

# Meta-analysis
cargo run --bin atlas-distill -- meta-analyze
```

### Docker

```bash
docker build -t atlas-distill .
docker run --rm atlas-distill validate --full
```

## Benchmark Datasets

| Dataset | Metals | Potentials | Properties |
|---------|--------|------------|------------|
| FCC | Al, Cu, Ni, Ag, Au, Pt, Pd, Pb | EAM, LJ, SW | C₁₁, C₁₂, C₄₄ |
| BCC | Fe, Cr, Mo, W, V, Nb, Ta | EAM, LJ | C₁₁, C₁₂, C₄₄ |

All values in GPa. Reference data from room-temperature experimental crystallographic databases.

## Architecture

```
atlas-distill/
├── src/
│   ├── main.rs           # CLI entrypoint (14 subcommands)
│   ├── stats.rs          # PCA, covariance, Fisher z, bootstrap CI
│   ├── manifold.rs       # Error vector analysis, hyper-ribbon detection
│   ├── meta_analysis.rs  # Fixed/random-effects meta-analysis
│   ├── causal.rs         # Simpson's paradox detection
│   ├── validation.rs     # Multi-potential benchmark harness
│   ├── benchmark.rs      # CSV/JSON benchmark database loader
│   ├── fitting/          # Linear, power-law, Arrhenius, polynomial, symbolic regression
│   ├── observables/      # RDF, MSD, VACF, elastic constants
│   ├── ingest/           # LAMMPS log and dump parsers
│   ├── literature/       # CrossRef/arXiv fetch and extract
│   └── formalize.rs      # Lean 4 specification export
├── benchmarks/           # FCC and BCC reference data
├── Dockerfile
└── cloudbuild.yaml       # GCP Cloud Run Job deployment
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `validate [--full] [--bcc]` | Run ensemble operator validation |
| `manifold [--bcc]` | Analyze error manifold structure |
| `meta-analyze [--groups]` | Run meta-analysis on correlations |
| `detect-paradox [--bcc] [--example]` | Detect Simpson's paradox |
| `benchmark <file> [--manifold] [--meta]` | Load external benchmark database |
| `thermo <log> [--x] [--y]` | Analyze LAMMPS thermo log |
| `trajectory <dump> [--msd] [--rdf] [--vacf]` | Analyze trajectory data |
| `fit <csv> [--model] [--degree]` | Fit model to CSV data |
| `elastic --c11 --c12 --c44` | Compute FCC elastic properties |
| `literature <action>` | Literature-based discovery |
| `scan --x --y <files...>` | Cross-run relationship scanning |
| `pipeline [--provider]` | Hermes pipeline orchestrator |
| `formalize` | Export to Lean 4 specification |

## Key Results

### FCC Hyper-Ribbon Structure

| Potential | PR / 3 | 95% CI | R²_log | Hyper-ribbon? |
|-----------|--------|--------|--------|---------------|
| EAM | 1.41 | [1.17, 2.17] | 0.998 | ✅ Yes |
| LJ | 1.36 | [1.04, 1.50] | 0.997 | ✅ Yes |
| SW | 1.29 | [1.09, 2.09] | 0.977 | ✅ Yes |

### BCC Simpson's Paradox

- **Pooled correlation:** r = −0.435
- **Within-group correlation:** r = +0.147
- **Reversal magnitude:** 0.581
- **Detection:** Complete reversal with ecological fallacy risk

## Citation

If you use `atlas-distill` in your research, please cite:

```bibtex
@article{welcing2026causal,
  author  = {Welcing, Alexander},
  title   = {The Causal Geometry of Prediction Errors in Interatomic Potentials: A Hyper-Ribbon Manifold Analysis with Simpson's Paradox Detection},
  journal = {Integrating Materials and Manufacturing Innovation},
  year    = {2026},
  note    = {In press}
}
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

This work builds on sloppy model theory (Brown & Sethna 2003, Transtrum et al. 2010–2013), causal inference methodology (Pearl 2014), and meta-analysis frameworks (DerSimonian & Laird 1986). Benchmark data sources include the OpenKIM consortium and NIST Interatomic Potential Database.
