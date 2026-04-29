# IMMI Paper: The Causal Geometry of Prediction Errors in Interatomic Potentials

This directory contains the LaTeX source, figures, and build infrastructure for the paper submitted to *Integrating Materials and Manufacturing Innovation* (IMMI).

## Building the Paper

### Requirements

- LaTeX distribution (TeX Live or MiKTeX) with `natbib`, `siunitx`, `booktabs`
- Python 3.10+ with packages listed in `figures/requirements.txt`

### Quick Build

```bash
cd paper
make
```

### Step-by-Step

1. **Generate figures** (requires `atlas-distill` JSON outputs):
   ```bash
   cd figures
   pip install -r requirements.txt
   python generate_fig1_eigenvalue_spectra.py
   python generate_fig2_dimensionality.py
   python generate_fig3_paradox.py
   python generate_fig4_forest.py
   cd ..
   ```

2. **Compile LaTeX**:
   ```bash
   pdflatex immi-paper.tex
   bibtex immi-paper
   pdflatex immi-paper.tex
   pdflatex immi-paper.tex
   ```

3. **Output**: `immi-paper.pdf`

## Figure Regeneration

All figures are generated from `atlas-distill` JSON outputs:

| Figure | Script | Input Data | Description |
|--------|--------|------------|-------------|
| 1 | `generate_fig1_eigenvalue_spectra.py` | `manifold_analysis.json` | FCC eigenvalue spectra |
| 2 | `generate_fig2_dimensionality.py` | `manifold_analysis.json` | Effective dimensionality with CIs |
| 3 | `generate_fig3_paradox.py` | `paradox_detection.json` | BCC Simpson's paradox |
| 4 | `generate_fig4_forest.py` | `meta_analysis.json` | Meta-analysis forest plot |

To regenerate inputs:
```bash
cd ../atlas-distill
cargo run --bin atlas-distill -- validate --full    # produces manifold_analysis.json, validation_report.json
cargo run --bin atlas-distill -- meta-analyze       # produces meta_analysis.json
cargo run --bin atlas-distill -- detect-paradox --bcc  # produces paradox_detection.json
```

## Paper Structure

| Section | Content |
|---------|---------|
| Abstract | Summary of hyper-ribbon + Simpson's paradox + meta-analysis findings |
| Introduction | Three traditions convergence, software contribution |
| Theory | Sloppy models, Simpson's paradox, random-effects meta-analysis |
| Methods | Benchmark datasets, software implementation, bootstrap UQ |
| Results | FCC hyper-ribbon, BCC paradox, meta-analysis |
| Discussion | Implications, limitations, connection to NNIP work |

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
