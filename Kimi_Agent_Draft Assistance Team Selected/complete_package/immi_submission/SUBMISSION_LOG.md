# IMMI Submission Log

## Paper: The Causal Geometry of Prediction Errors in Interatomic Potentials
**Author:** Alex Welcing (solo)
**Target Journal:** Integrating Materials and Manufacturing Innovation (IMMI)
**Article Type:** Technical Article
**Date:** 2026-06-04

---

## Decisions Logged

### Decision 1: Final Element Set — APPROVED
- **Element set:** 15 elements (8 FCC: Al, Cu, Ni, Ag, Au, Pt, Pd, Pb; 7 BCC: Fe, Cr, Mo, W, V, Nb, Ta)
- **Locked by:** Manuscript Curator
- **Tag:** immi-submission-v1

### Decision 2: Figure Roster — APPROVED
- **Main figures (6):** Fig 1 eigenvalue spectra, Fig 2 dimensionality, Fig 3 BCC/FCC dichotomy, Fig 4 forest plot, Fig 5 pairstyle, Fig 6 d-band closure
- **Supplementary figures (3):** Supp Fig 1 temporal PR, Supp Fig 2 temporal R², Supp Fig 3 5D observables
- **No new figure for Foundation MLIP section** — uses Table 2 (foundation_classical_comparison) + references Fig 2

### Decision 3: "In Press" Typo Fix — PENDING (Library Fixer)
- Current site: library.lupine.science claims "in press"
- **Correct language:** "Submitted to Integrating Materials and Manufacturing Innovation (IMMI)"
- **Action:** Library Fixer to commit and push before submission

### Decision 4: Zenodo Release Scope — PENDING (Data Archaeologist)
- **Rule:** Only data that produced the figures
- **Contents:** Final element set CSV, MLIP benchmark results JSONs, cross-MLIP alignment JSON
- **Action:** Data Archaeologist to package; Portal Operator to acquire DOI

### Decision 5: Word Count & Supplementary Split — APPROVED
- Manuscript: ~4,500 words (well within 8,000 limit)
- Methods: ~600 words (within 2,000 limit)
- No supplementary move required

---

## Changes from Previous Draft

| Change | Status | Details |
|--------|--------|---------|
| Author name fix | Done | "Alexander Welcing" → "Alex Welcing" |
| WIP banner removal | Done | Red banner deleted |
| Foundation MLIP section | Done | New 720-word section 4.6 with Table 2 |
| Data Availability update | Done | Zenodo DOI placeholder added |
| Limitations update | Done | MLIP sample size caveat added |
| Cover letter | Done | 1 page, 3 reviewer suggestions |
| Supplementary material | Done | 3 supplementary figures |

---

## Files Produced

| File | Description |
|------|-------------|
| `immi-paper-final.tex` | Main manuscript (self-contained LaTeX) |
| `immi_sec46_foundation_mlip.tex` | New section source (also inlined in main) |
| `immi_supplementary.tex` | Supplementary materials (3 figures) |
| `immi_cover_letter.tex` | Cover letter for Editor |
| `SUBMISSION_LOG.md` | This file |

---

## Next Steps (Pre-Submission)

- [ ] Library Fixer: Fix "in press" typo on library.lupine.science
- [ ] Reference Auditor: Verify all DOIs in references.bib resolve
- [ ] Figure Marshal: Export all 6 main figures as separate high-res PDFs
- [ ] Portal Operator: Register at editorialmanager.com/immj
- [ ] Data Archaeologist: Create Zenodo release, acquire DOI
- [ ] Manuscript Curator: Compile final PDF (pdflatex → bibtex → pdflatex ×2)
- [ ] Commander (Alex): Final sign-off + click submit

---

## Post-Submission Actions

- [ ] Tag repo: `immi-submitted-2026-06-04`
- [ ] Archive submission files in `paper/submission/`
- [ ] Update library.lupine.science → "Submitted to IMMI"
- [ ] Set calendar reminder: 30 days for status check
- [ ] Prepare response-to-reviewers template

---

## Revision Pass — 2026-06-11 (pre-submission correction sweep)

Full pre-submission review found that the 2026-06-04 packages contained the
pre-audit "Simpson's paradox" manuscript and a PDF compiled before the
ecological-fallacy correction. All artifacts regenerated from the corrected
source. Changes:

| Fix | Detail |
|---|---|
| Version sync | Packages + compiled PDF rebuilt from corrected `immi-paper-final.tex`; cover letter and supplementary titles updated to "Ecological Fallacy Detection" |
| Born screening (§4.6) | Same Born filter as classical pipeline now applied to MLIP predictions; 7/45 element–model tensors excluded (Orb-v3: Al, Nb, Pb, Pt; CHGNet: Cr, Fe; MACE: V). Table 2 recomputed (`cross_mlip_alignment_born_filtered.json`); Spearman ρ=0.264, p=0.341 |
| Table 2 errata | W MLIP mean corrected 0.607→0.498; weak-group mean recomputed for the stated group (Pd/Al/W/Fe); Pairs column added |
| Abstract | Unsupported "14 of 15 PR<2.0 / Fe lone outlier" claim replaced with supported Born-screening + alignment summary |
| Fe narrative | "Highest internal variability" claim (contradicted by own table) replaced with Born-failure framing |
| Citations | Added batatia2024 (MACE-MP-0), deng2023 (CHGNet), rhodes2025 (Orb-v3), welcing2026universality/formal to references.bib; fixed MACE/Orb misattributions; Orb no longer described as "orbital-based equivariant" |
| Statistics language | "refuted" → "not supported" (n=15 power); "dominated by confounder" softened (p=0.060); post-hoc subset marked exploratory; "ecological-fallacy on our own analysis" → suppression effect |
| Counts | Median PR 1.38→1.28 (matches Fig 2); Fig 2 described as 42 multi-element potentials (not 559); 345 matches vs 633 entries reconciled; "13 families: …" → "13 families, including …" |
| Figure roster | Temporal + 5D figures removed from main text (now Supplementary Figs S1–S3 only, per Decision 2); main paper back to 6 figures |
| Figure repair | fig4_forest, fig5_pairstyle, observables_5d_pr PNGs were truncated in all copies; recovered pixel-exact from the 06-04 PDF |
| Limitations | Added Born-failure caveat, mixed-reference caveat (MP vs Simmons-Wang for BCC), 3-model PR tautology note, non-independence of pooled constants |

**Still open before submit (verify against source data, not in this package):**
- [ ] Fig 2 right panel shows max PR ≈ 2.05 — verify the "1.05–1.86" range claim (abstract/intro/discussion) and "rigidly bounded below 2.0" against `manifold_analysis.json`
- [ ] Confirm which two elements were excluded from the Mann-Whitney closed/open d-shell comparison (placeholder language inserted)
- [ ] Companion paper titles in references.bib are placeholders — set real titles
- [ ] Zenodo DOI still XXXXXX; include `cross_mlip_alignment_born_filtered.json` in the release
- [ ] library.lupine.science still says "in press" — must be fixed (cover letter asserts no preprint)
- [ ] Figures are 300 DPI PNG; IMMI wants ≥600 dpi line art as separate files

---

*Log compiled: 2026-06-04; revised 2026-06-11*
*For: Lupine Research Swarm*
*Mission: IMMI First Submission*
