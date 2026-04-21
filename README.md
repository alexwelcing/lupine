# Lupine Materials Science

**Open-source scientific engine for the geometric and statistical analysis of interatomic potential prediction errors.**

This repository contains:

- **`atlas-distill/`** — Rust engine for mathematical discovery in MD data (manifold analysis, meta-analysis, causal detection)
- **`paper/`** — Peer-reviewed paper source (IMMI journal submission)
- **`lupine-site/`** — Public-facing marketing site (deployed to GCP Cloud Run)

## Quick Start

```bash
# Build the scientific engine
cd atlas-distill
cargo build --release

# Run full FCC validation with manifold analysis
cargo run --bin atlas-distill -- validate --full

# Run BCC Simpson's paradox demo
cargo run --bin atlas-distill -- detect-paradox --bcc

# Generate publication figures
cd ../paper
make figures
```

## Repository Structure

```
.
├── atlas-distill/          # Rust scientific engine
│   ├── src/                # Source code (15 modules)
│   ├── benchmarks/         # FCC + BCC elastic constant data
│   ├── Dockerfile          # Cloud Run Job container
│   └── cloudbuild.yaml     # GCP CI/CD pipeline
├── paper/                  # IMMI journal submission
│   ├── immi-paper.tex      # LaTeX source
│   ├── references.bib      # BibTeX bibliography
│   └── figures/            # Publication-quality figure scripts
├── lupine-site/            # Marketing site (Vite + Tailwind)
│   └── ...
└── docs/                   # Supplementary research reports
```

## Citation

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

- Sloppy model theory: Brown & Sethna (2003), Transtrum et al. (2010–2013)
- Causal inference: Pearl (2014)
- Meta-analysis: DerSimonian & Laird (1986)
- Benchmark infrastructure: OpenKIM consortium
