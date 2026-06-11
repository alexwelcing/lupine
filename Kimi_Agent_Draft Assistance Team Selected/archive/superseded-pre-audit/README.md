# Archive: superseded pre-audit paper versions — DO NOT DISTRIBUTE

Quarantined 2026-06-11. Every artifact in this directory predates the
2026-06-11 audit and carries one or more claims the program has since
corrected:

- "Simpson's paradox" titles and findings (refuted by the Lean audit T111:
  the strict reversal criterion of Kievit et al. was not met; the real
  finding is ecological fallacy — corrected in the canonical manuscript).
- The unsupported "14 of 15 elements retain PR < 2.0 / Fe lone outlier"
  abstract claim.
- Pre-Born-screening MLIP results (old Table 2, including the wrong W value
  0.607 and the misattributed MACE/Orb citations).
- "Peer-reviewed / in press" status language (the paper is a working paper;
  status source of truth: library-site/src/brand.json → publication.status).

Canonical current versions:
- Manuscript: `../../immi-paper-final.tex` (and `paper/immi-paper.tex` in
  the repo root, kept in sync) + `immi_paper_final.pdf`.
- Cover letter / supplementary: `../../immi_cover_letter.tex`,
  `../../immi_supplementary.tex`.
- Submission packages: `../../complete_package/immi_submission/`,
  `../../lupine_immi_package/`.

These files are retained for provenance and audit-trail purposes only.
Do not publish, deploy, mail, or upload anything from this directory.
