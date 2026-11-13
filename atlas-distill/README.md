# atlas-distill

**Rust engine for analysing interatomic-potential prediction errors.**

[![Tests](https://github.com/alexwelcing/lupine/actions/workflows/build-atlas-distill.yml/badge.svg)](https://github.com/alexwelcing/lupine/actions/workflows/build-atlas-distill.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`atlas-distill` is a Rust-based scientific engine for analyzing the geometric and statistical structure of interatomic potential prediction errors. It implements sloppy model theory, causal inference (Simpson's paradox detection), and random-effects meta-analysis for systematic benchmarking of classical and machine-learning potentials.

## Features

- **Manifold Analysis** — PCA/SVD eigenvalue analysis of prediction errors with hyper-ribbon detection
- **Bootstrap Uncertainty Quantification** — 95% confidence intervals for participation ratios and geometric fits
- **Meta-Analysis** — Standard fixed- and random-effects meta-analysis of correlation coefficients across independent groups (Fisher z, DerSimonian–Laird τ², Cochran's Q and I², t-based prediction interval); see [Meta-analysis](#meta-analysis) for scope and the 2026-11-12 fix
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

# Meta-analysis of per-element correlations (writes benchmark_meta.json)
cargo run --bin atlas-distill -- meta-analyze \
  --input benchmarks/nist_populated_all.csv \
  --output benchmark_meta.json

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
| `meta-analyze --input <csv> \| --groups <json> [--output <json>]` | Fixed- and random-effects meta-analysis of per-group correlations |
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
of between-group variance τ² and a t-based prediction interval. Both models
report Cochran's Q (fixed-effect weights around the fixed-effect mean), its
p-value and I². It pools correlations, not error magnitudes such as MAE, and
it assumes the groups are independent. Rows that share materials or models (for example
C11, C12 and C44 of the same metal) are not independent, and intervals built
on such rows are anti-conservative. We withdrew our own earlier Fisher-z
random-effects intervals built on dependent C11/C12/C44 rows for this reason
(lupine-rhizo `paper/tms2027-proceedings/manuscript.tex`).

`meta-analyze --input` builds one group per material and skips, with a line
on stderr, any material with fewer than 4 numeric rows or with constant
reference or predicted values (zero variance, so r is undefined).

### Known issues (Fixed 2026-11-12 and 2026-11-13)

- **Q and I² in the random-effects output. Fixed 2026-11-12.**
  `random_effects_meta` used to recompute the reported Q, its p-value and I²
  around the random-effects pooled mean instead of the fixed-effect mean,
  which can only make them equal or larger. Both models now report Cochran's
  Q with fixed-effect weights around the fixed-effect mean (as metafor's QE
  does), df = k − 1, its chi-square p-value and I² = max(0, (Q − df)/Q).
  τ² (DerSimonian–Laird) was already computed from this Q and does not
  change.
- **Prediction interval quantile. Fixed 2026-11-12.** The random-effects
  prediction interval used the normal quantile 1.96. It now uses
  μ̂_RE ± t_{k−2, 0.975} · sqrt(τ² + SE(μ̂_RE)²) (Higgins, Thompson &
  Spiegelhalter 2009), back-transformed with tanh. It is undefined (`NaN`,
  written as JSON `null`) when there are fewer than three groups. The
  t quantile is implemented in the module (no new dependency).
- **Q p-value. Fixed 2026-11-12.** The p-value used a Wilson–Hilferty
  approximation that was off by up to an order of magnitude in the tail
  (2.5e-10 instead of 2.8e-11 for the demo groups in `meta_analysis.json`)
  and was written as 0 for very large Q. It now uses the regularized
  incomplete gamma function. Confidence intervals use z₀.₉₇₅ = 1.959963984540054 rather than
  1.96; this moves interval ends by about 1e-5.
- **Reference tests. Fixed 2026-11-12.** The unit tests now compare Q, df,
  p, I², τ², the pooled estimates, CIs and prediction intervals, to 1e-6,
  with an independent numpy/scipy implementation
  (`tests/reference/meta_reference.py`, output committed as
  `tests/reference/meta_reference.json`). The datasets are: a homogeneous
  set with Q < df (so τ² = 0), a heterogeneous set, a k = 3 set, a k = 2 set
  without a prediction interval, and the 15-element elastic-constant panel.
  The t quantile and chi-square p-value are also checked against scipy.
  Run `python tests/reference/meta_reference.py --check` (needs numpy and
  scipy) to confirm that the committed JSON and the values embedded in the
  Rust tests match a fresh run.
- **The module was not compiled.** Until 2026-11-12 `src/main.rs` did not
  declare `mod meta_analysis`, so neither the module nor its unit tests were
  built or run by `cargo test`. It is now declared and exercised by the
  `meta-analyze` command.
- **Constant-valued groups in `meta-analyze --input`. Fixed 2026-11-13.**
  A material with 4 or more rows whose reference or predicted values are all
  equal has no defined correlation, but `stats::pearson_r` returns 0.0 on a
  zero denominator, so such a group entered the pool as r = 0 with weight
  n − 3 and pulled the pooled correlation toward zero. It is now skipped
  ("skipping <material>: reference values are constant …" on stderr), like
  a group with n < 4. `benchmarks/nist_populated_all.csv` has no such group:
  re-running `meta-analyze` on it reproduces `benchmark_meta.json` byte for
  byte, so no published number changes.

Published numbers that came from this engine, before and after the 2026-11-12 fixes:
the 15-element panel's random-effects Q went from 984 to 945, I² from
98.6% to 98.5%, and the 95% prediction interval from [−0.64, +0.99] to
[−0.73, +0.99]. The pooled r (0.69), its CI [0.41, 0.85] and τ (0.80) are
unchanged. `benchmark_meta.json`, `meta_analysis.json` and
`paper/figures/fig4_forest.{png,pdf}` were regenerated with the fixed
engine. The dependence caveat above still applies to these intervals.

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
