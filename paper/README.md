# IMMI Paper: The Causal Geometry of Prediction Errors in Interatomic Potentials

LaTeX source, figures, and build infrastructure for the working paper
*"The Causal Geometry of Prediction Errors in Interatomic Potentials: A
Hyper-Ribbon Manifold Analysis with Ecological Fallacy Detection."*

**Status:** working paper, in preparation (single source of truth:
`library-site/src/brand.json` → `publication.status`). Do not describe as
submitted, accepted, or published anywhere until that field changes.

**Canonical source:** `immi-paper.tex` in this directory tracks the corrected
post-audit manuscript (ecological-fallacy terminology per the Lean audit
T111; Born-screened MLIP section; verified Table 2). Submission
correspondence is not kept in this public repository.

## Review-Ready Advanced Drafts

Advanced manuscript drafts imported in June 2026 live in `review-ready/`. They are
marked **ready for review**, not submission-ready:

- `review-ready/paper3-lean-verification.tex`
- `review-ready/paper4-causal-acceleration.tex`
- `review-ready/advanced-paper-review-ledger.md`

Use that ledger before promoting either draft into a submission workflow.

## Building

```bash
cd paper
pdflatex immi-paper.tex && bibtex immi-paper && pdflatex immi-paper.tex && pdflatex immi-paper.tex
# or: tectonic immi-paper.tex
```

Requires `natbib`, `siunitx`, `booktabs`; figures are pre-rendered PNGs in
`figures/`.

## Figures

| Figure | File | Description |
|--------|------|-------------|
| 1 | `figures/fig1_eigenvalue_spectra.png` | Eigenvalue spectra (sloppy log-linear hierarchy) |
| 2 | `figures/fig2_dimensionality.png` | Participation-ratio distribution (42 multi-element potentials) |
| 3 | `figures/fig3_bcc_fcc_dichotomy.png` | BCC/FCC correlation dichotomy |
| 4 | `figures/fig4_forest.png` | Random-effects meta-analysis forest plot |
| 5 | `figures/fig5_pairstyle.png` | Pair-style stratification (ecological fallacy) |
| 6 | `figures/fig6_dband_closure.png` | Cross-style alignment vs d-band / n_pairs confounder |
| S1–S3 | `figures/year_stratified_*.png`, `figures/observables_5d_pr.png` | Supplementary: temporal invariance, 5D expansion |

`figures/fig3_paradox.png` is a superseded artifact from the pre-audit
draft (Simpson's-paradox framing, replaced by the ecological-fallacy
analysis); retained for provenance only — do not include in any build.

## Provenance and corrections

The 2026-06-11 audit replaced
Simpson's-paradox claims with ecological-fallacy terminology (the strict
reversal criterion of Kievit et al. was not met; the Lean audit T111 caught
the overstatement), applied Born stability screening to the foundation-MLIP
section, and corrected Table 2. Any copy of this paper that uses the
Simpson's-paradox title is superseded.

Corrected 2026-11-12: the `atlas-distill` meta-analysis engine computed the
random-effects Q and I² around the random-effects mean and built the
prediction interval with the normal quantile (see `atlas-distill/README.md`,
"Known issues"). With the fixed engine, the random-effects row of the
meta-analysis table and the text report Q = 945 and I² = 98.5% (were 984 and
98.6%) and a 95% prediction interval of [−0.73, +0.99] (was [−0.64, +0.99]),
using a t quantile with k − 2 = 13 degrees of freedom. The pooled r (0.69),
its CI [0.41, 0.85] and τ (0.80) are unchanged. `figures/fig4_forest.{png,pdf}`
was regenerated. The compiled PDFs (`immi-paper.pdf`, `immi-paper-latest.pdf`,
`immi-paper-local.pdf` and `library-site/src/immi_paper.pdf`) predate this
correction and still show the old values until they are rebuilt.

## Citation

```bibtex
@unpublished{welcing2026causal,
  author = {Welcing, Alex},
  title  = {The Causal Geometry of Prediction Errors in Interatomic
            Potentials: A Hyper-Ribbon Manifold Analysis with Ecological
            Fallacy Detection},
  year   = {2026},
  note   = {Working paper, in preparation}

}
```

## How it connects to the rest of the repo

- Claims and figures are grounded in `lean-spec/` theorems and `mlip_immi/`
  real-data analyses.
- `python/lupine_distill/` and `atlas-distill/` supply benchmark metrics and
  policy decisions cited in the manuscript.
- The public Library at `library-site/` renders the published version of this
  work once it leaves working-paper status.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Related

- [`docs/ONBOARDING.md`](../docs/ONBOARDING.md) — new-contributor tracks
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — system map
- [`mlip_immi/README.md`](../mlip_immi/README.md) — local real-data MLIP/IMMI lane
- [`lean-spec/README.md`](../lean-spec/README.md) — formal proof layer
