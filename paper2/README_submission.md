# Projection Law — manuscript sources

**Status:** Working draft (version 2026-06-29). No Lupine paper has been
peer-reviewed or accepted yet. Submission correspondence (cover letters,
portal fields, reviewer suggestions) is not kept in this public repository.

## Files

- `ProjectionLaw_Round2.md` / `.pdf` / `.html` — stand-alone draft with the
  Layer-2 Round-2 evidence, figures and open items.
- `ProjectionLaw_PRX.tex` — LaTeX source of the same draft.
- `immi/ProjectionLaw_IMMI.tex` — companion LaTeX source.
  `immi/ProjectionLaw_IMMI.pdf` is **stale** and predates the componentwise
  certification boundary; rebuild it from the TeX source before sharing.
- `figures/` — figure PDFs/PNGs and the scripts that make them.
- `build_pdf.py`, `build_paper.py`, `quality_gate.py`, `audit_references.py` —
  build and reference-check helpers.

## What the 2026-06-29 version reports

- Round-2 3×3×3 elastic-constant benchmark: 16 cubic metals × 4 MatPES MLIPs
  × 2 functionals (128 cases; r2SCAN targets approximate).
- One bias direction per functional transfers out of sample. When the
  held-out reference sets how far to correct, MAE falls from 17.84 to
  10.36 GPa: a ceiling, not a deployable correction. The best no-target
  estimator tested (consensus) reached 14.41 GPa but harmed 50 of 128 cases.
  A correction that works without seeing the answer is still open.
- Certification boundary: C11, C12 and C44 each need an independent valid
  held-out-target clearance; derived moduli and composites (B, G, C′, Cauchy
  pressure, anisotropy) are uncertified.
- Preregistered H1–H4 outcomes: H1 and H2a kill conditions triggered
  (effect −0.14; p = 0.13); H2b cosine 0.53 missed its 0.8 threshold; H3
  pending; H4 conformal coverage 86.7% against a 90% target.
- A6 bridge protocol, pilot and scale-blocker note; all-electron DFT anchor
  blocker note.
- Lean 4 `ExactTubularUniversality.lean` skeleton (full proof open).

## Known open items

- H3 all-electron anchor: blocked on external compute.
- A6 bridge at scale: blocked on MatPES/MPtrj/OMat24 prediction files.
- Lean `exact_tubular_universality` proof from A0–A5: skeleton only.
- Deployable no-target correction: gap measured, not closed.

These are reported as open in the manuscript, not suppressed.
