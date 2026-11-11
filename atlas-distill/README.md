# atlas-distill

**Rust engine for analysing interatomic-potential prediction errors.**

[![Tests](https://github.com/alexwelcing/lupine/actions/workflows/build-atlas-distill.yml/badge.svg)](https://github.com/alexwelcing/lupine/actions/workflows/build-atlas-distill.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`atlas-distill` is a Rust-based scientific engine for analyzing the geometric and statistical structure of interatomic potential prediction errors. It implements sloppy model theory, causal inference (Simpson's paradox detection), and random-effects meta-analysis for systematic benchmarking of classical and machine-learning potentials.

## Features

- **Manifold Analysis** — PCA/SVD eigenvalue analysis of prediction errors with hyper-ribbon detection
- **Bootstrap Uncertainty Quantification** — 95% confidence intervals for participation ratios and geometric fits
- **Meta-Analysis** — Standard fixed- and random-effects meta-analysis of correlation coefficients across independent groups (Fisher z, DerSimonian–Laird τ², Q and I²); see [Meta-analysis](#meta-analysis) for scope and known issues
- **Simpson's Paradox Detection** — Pooled vs. within-group correlation comparison with reversal markers
- **Multi-Potential Benchmarking** — FCC (8 metals) and BCC (7 metals) elastic constant validation
- **Model Geometry Evidence** — Residual-SVD packets for MLIP/WBM/arena-scale model dumps, with accuracy gates and effective-rank guards
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

# Model/reference residual geometry from a tidy benchmark dump
cargo run --bin atlas-distill -- model-geometry \
  --input tests/fixtures/model_geometry_smoke.csv \
  --pair gen0:gen1 \
  --quality-gate accuracy \
  --top-k 3

# Same command shape used by glim-think/tasks-consumer
cargo run --bin atlas-distill -- model-geometry \
  --fixture-url tests/fixtures/model_geometry_smoke.csv \
  --hypothesis-id mlip-manifold-equivalence \
  --pair gen0:gen1 \
  --quality-gate accuracy \
  --top-k 5

# Canonical Lupine Distill runtime policy for one prediction
cargo run --bin atlas-distill -- distill-policy \
  --request tests/fixtures/distill_policy_energy_block.json \
  --ribbon-version hyperribbon-v1

# Apply a selected hill-climb policy limits object during runtime decisions
cargo run --bin atlas-distill -- distill-policy \
  --request tests/fixtures/distill_policy_energy_gate.json \
  --policy-limits tmp/selected-policy-limits.json \
  --ribbon-version hyperribbon-v1

# Batch mode used by MLIP cell runners; one request per JSONL line
cargo run --bin atlas-distill -- distill-policy \
  --request-jsonl tmp/distill-policy-requests.jsonl \
  --output tmp/distill-policy-decisions.jsonl \
  --ribbon-version hyperribbon-v1

# Local Distill ribbon hill climb for sealed MLIP replay cases
cargo run --bin atlas-distill -- distill-hill-climb \
  --cases tests/fixtures/distill_hill_climb_cases.jsonl \
  --selected-limits-output tmp/selected-policy-limits.json \
  --rounds 3 \
  --beam-width 4 \
  --report-top-k 8 \
  --ribbon-version hyperribbon-v1

# Offset-lattice equilibrium solve baseline scoring
cargo run --bin atlas-distill -- equilibrium-solve \
  --trajectory tests/fixtures/equilibrium_solve_al_fcc_offset.json \
  --continuation-window-steps 200
```

### Docker

```bash
docker build -t atlas-distill .
docker run --rm atlas-distill validate --full
```

## Development

`atlas-distill` is a Cargo workspace. The core engine builds without GPU dependencies:

```bash
cargo check --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
```

The `gpu_experiment` binary is an optional WGPU proof-of-concept and is gated behind the `gpu` feature:

```bash
cargo run --bin gpu_experiment --features gpu
```

## Benchmark Datasets

| Dataset | Metals | Potentials | Properties |
|---------|--------|------------|------------|
| FCC | Al, Cu, Ni, Ag, Au, Pt, Pd, Pb | EAM, LJ, SW | C₁₁, C₁₂, C₄₄ |
| BCC | Fe, Cr, Mo, W, V, Nb, Ta | EAM, LJ | C₁₁, C₁₂, C₄₄ |
| **NIST** | **15 metals** | **170 real NIST potentials** | **C₁₁, C₁₂, C₄₄** |

All values in GPa. Reference data from room-temperature experimental crystallographic databases.
NIST data sourced from the [NIST Interatomic Potentials Repository](https://www.ctcms.nist.gov/potentials/) via local mirror.

## Architecture

```
atlas-distill/
├── src/
│   ├── main.rs           # CLI entrypoint (16 subcommands)
│   ├── stats.rs          # PCA, covariance, Fisher z, bootstrap CI
│   ├── manifold.rs       # Error vector analysis, hyper-ribbon detection
│   ├── meta_analysis.rs  # Fixed/random-effects meta-analysis
│   ├── causal.rs         # Simpson's paradox detection
│   ├── validation.rs     # Multi-potential benchmark harness
│   ├── benchmark.rs      # CSV/JSON benchmark database loader
│   ├── nist.rs           # NIST IPR catalog loader + scaffold generator
│   ├── autoresearch.rs   # Automated DOI→fetch→extract→benchmark pipeline
│   ├── fitting/          # Linear, power-law, Arrhenius, polynomial, symbolic regression
│   ├── observables/      # RDF, MSD, VACF, elastic constants
│   ├── ingest/           # LAMMPS log and dump parsers
│   ├── literature/       # CrossRef/arXiv fetch and extract
│   └── formalize.rs      # Lean 4 specification export
├── benchmarks/           # FCC, BCC, and NIST scaffold data
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
| `model-geometry --input <csv/json> [--pair A:B]` | Distill model-to-model and model-to-reference residual geometry evidence |
| `model-geometry --fixture-url <path/gs/http> --hypothesis-id <id>` | Glim-think/task-consumer compatible model-geometry run with optional beat emission |
| `distill-policy --request <json> [--policy-limits <json>]` | Apply the canonical versioned Lupine Distill runtime policy to one MLIP prediction |
| `distill-policy --request-jsonl <jsonl>` | Batch canonical Distill runtime decisions for a cell runner |
| `distill-hill-climb --cases <json/jsonl>` | Search hyperribbon policy limits against sealed local MLIP replay cases |
| `equilibrium-solve --trajectory <json>` | Score an offset-lattice relaxation against known equilibrium and emit viewer-ready evidence |
| `nist [--element] [--pair-style] [--scaffold]` | Query NIST IPR catalog (675 potentials) |
| `auto-research [--elements] [--eam-only]` | Automated DOI→extract→benchmark pipeline |
| `thermo <log> [--x] [--y]` | Analyze LAMMPS thermo log |
| `trajectory <dump> [--msd] [--rdf] [--vacf]` | Analyze trajectory data |
| `fit <csv> [--model] [--degree]` | Fit model to CSV data |
| `elastic --c11 --c12 --c44` | Compute FCC elastic properties |
| `literature <action>` | Literature-based discovery |
| `scan --x --y <files...>` | Cross-run relationship scanning |
| `pipeline [--provider]` | Multi-step analysis pipeline (legacy; each stage calls an external, provider-backed agent command-line tool) |
| `formalize` | Export to Lean 4 specification |

## Meta-analysis

`src/meta_analysis.rs` implements standard fixed- and random-effects
meta-analysis of correlation coefficients across independent groups: each
group's r is Fisher z-transformed, weighted by inverse variance, pooled, and
back-transformed; the random-effects model adds a DerSimonian–Laird estimate
of between-group variance τ² and reports Q, I² and a prediction interval. It
pools correlations, not error magnitudes such as MAE, and it assumes the
groups are independent. Rows that share materials or models (for example
C11, C12 and C44 of the same metal) are not independent, and intervals built
on such rows are anti-conservative. We withdrew our own earlier Fisher-z
random-effects intervals built on dependent C11/C12/C44 rows for this reason
(lupine-rhizo `paper/tms2027-proceedings/manuscript.tex`).

### Known issues (fix pending)

- **Q and I² in the random-effects output.** `random_effects_meta` estimates
  τ² from the fixed-effect Q (correct), but `compute_final_result` then
  recomputes the reported Q, its p-value and I² around the random-effects
  pooled mean instead of the fixed-effect mean. Because the fixed-effect mean
  minimises that weighted sum, the reported random-effects Q and I² can only
  be equal to or larger than the standard values. Use the fixed-effects
  output (`fixed_effects_meta`) for Q and I² until this is fixed.
- **Prediction interval quantile.** The random-effects prediction interval
  uses the normal quantile 1.96 rather than a t quantile with k − 2 degrees
  of freedom (k = number of groups), so it is too narrow, most noticeably
  when k is small.
- The unit tests check ranges and properties, not agreement with a reference
  implementation.

## Demo commands use hand-typed fixtures

`validate`, `manifold` and `detect-paradox` without an input file run on
hand-typed fixtures in `src/validation.rs`, which the engine itself labels
synthetic in its provenance summary. Their output demonstrates the code paths;
it is not a Lupine result. Measured results and their status are in the
[program README](../README.md) and the maintained conjecture ledger in
`alexwelcing/lupine-rhizo` (`docs/conjectures/ledger.md`).

## Citation

No Lupine paper has been peer-reviewed or accepted yet, so there is no paper to
cite for this tool. If you use `atlas-distill`, cite this repository
(<https://github.com/alexwelcing/lupine>, `atlas-distill/`) and the commit you
used. The current working draft that discusses the meta-analysis limits above is
lupine-rhizo `paper/tms2027-proceedings/manuscript.tex`.

## License

MIT — see the repository [LICENSE](../LICENSE). First-party text and data are CC BY 4.0; see [NOTICE.md](../NOTICE.md).

## Acknowledgments

This work builds on sloppy model theory (Brown & Sethna 2003, Transtrum et al. 2010–2013), causal inference methodology (Pearl 2014), and meta-analysis frameworks (DerSimonian & Laird 1986). Benchmark data sources include the OpenKIM consortium and NIST Interatomic Potential Database.
