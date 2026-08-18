# Projection Law — submission package

**Version:** 2026-06-29  
**Formats:** Markdown + PDF (quick share), IMMI LaTeX + PDF (journal submission), PRX LaTeX source.

## Quick files

- `ProjectionLaw_Round2.pdf` — 10-page stand-alone PDF with the Layer-2 Round-2 evidence, figures, and open items.
- `immi/ProjectionLaw_IMMI.pdf` — **stale; do not submit** until rebuilt from the updated TeX source with a LaTeX toolchain.
- `ProjectionLaw_submission_bundle_2026-06-29.zip` — complete package.

## What is new in this version

- Round-2 3×3×3 elastic-constant benchmark of 16 cubic metals × 4 MatPES MLIPs.
- One-vector-per-functional LOO correction operator: MAE 17.84 → 10.36 GPa, zero no-harm violations (**empirical oracle aggregate; uncertified as a correction license**).
- Aggregate/derived boundary: C11, C12, and C44 each require an independent valid target license; B, G, C′, Cauchy pressure, anisotropy, and other composites inherit no componentwise license.
- Pre-registered H1–H4 outcomes reported honestly (H1/H2a fail on 3d/4d; H4 mixed).
- Class-aware operator oracle ceiling (9.97 GPa) and no-target magnitude estimator experiments.
- A6 bridge protocol + pilot + scale blocker note.
- All-electron DFT anchor blocker note + GCP burst startup script.
- Lean 4 `ExactTubularUniversality.lean` skeleton integrated, `RibbonProjection.lean` toy removed, `lake build` clean.
- Updated cover letters and submission-field files for both PRX and IMMI.

## Bundle contents

```
ProjectionLaw/
  ProjectionLaw_Round2.md / .pdf / .html
  ProjectionLaw_PRX.tex               # PRX LaTeX source (updated)
  build_pdf.py
  references.bib
  cover-letter_PRX.md
  submission-fields_PRX.md
  README_submission.md
  immi/
    ProjectionLaw_IMMI.tex            # IMMI LaTeX source
    ProjectionLaw_IMMI.pdf
    cover-letter_IMMI.md
    submission-fields_IMMI.md
    references.bib
  figures/
    fig1–fig4 (original)
    fig5_round2_raw_vs_corrected
    fig6_round2_per_element
    fig7_no_target_estimators
    make_round2_figures.py
  docs/science/
    a6_bridge_protocol.md
    a6_scale_blocker.md
    h3_blocker.md
  scripts/
    aims_elastic_startup.sh
  tools/
    a6_bridge_pilot.py
    no_target_magnitude_estimator.py
  REPLICATION.txt
```

## Submission steps

### For IMMI

1. Rebuild `immi/ProjectionLaw_IMMI.pdf` from `immi/ProjectionLaw_IMMI.tex`; the tracked PDF predates the componentwise-license boundary and must not be submitted as-is.
2. Copy the abstract, keywords, data-availability statement, funding, competing interests, author contributions, and AI-disclosure from `immi/submission-fields_IMMI.md` into the submission portal.
3. Upload `immi/cover-letter_IMMI.md` text as the cover letter.
4. Upload `ProjectionLaw_submission_bundle_2026-06-29.zip` as supplementary material (or provide the Zenodo DOI).

### For PRX

1. Compile `ProjectionLaw_PRX.tex` if a final PRX PDF is required (requires a local LaTeX toolchain; Tectonic was used for the IMMI version).
2. Use `cover-letter_PRX.md` and `submission-fields_PRX.md` for the portal.

## Known open items

- H3 all-electron anchor: blocked on external compute; spec and GCP startup script are included.
- A6 bridge at scale: blocked on MatPES/MPtrj/OMat24 prediction files; protocol and pilot included.
- Lean `exact_tubular_universality` proof from A0–A5: skeleton complete, full proof open.
- Deployable no-target operator: gap quantified but not closed.

These are reported as open in the manuscript, not suppressed.
