# Projection Law — Final Draft Report

**Date:** 2026-06-16  
**Evidence update:** 2026-06-21
**PRX master:** `paper2/projection-law.tex`  
**IMMI companion:** `paper2/immi/projection-law-immi.tex`  
**PDFs:** `paper2/projection-law.pdf` (15 pp), `paper2/immi/projection-law-immi.pdf` (15 pp)

## What was delivered

1. **LaTeX hardening**
   - Updated theorem counts to match current `lean-spec` build: ~225 theorem/lemma declarations, 77 build-locked theorems in Vision.lean, zero `sorry`, zero new axioms.
   - Fixed Figure 4 caption: classical median PR = 1.09, systematic fraction α = 0.98 (was incorrectly 1.28 / 0.93).
   - Clarified abstract MLIP PR as "1.3 (FCC foundation MLIPs)" to avoid ambiguity with the all-element median.
   - Replaced overfull `tabular` in Table 1 with `tabularx`.
   - Updated date; removed "Draft of".

2. **Evidence verification**
   - `lean-spec lake build`: **OK** (2891 jobs).
   - Added three new formal-core modules (`AffineDecomposition`, `SmoothProjection`, `FiniteSampleConcentration`) and wired them into `Vision.lean`; propagated the new theorems into both the PRX master and the IMMI companion.
   - `replication/error-geometry/tier1_analyze.py`: **PASS** (S_func = +0.317, S_arch = −0.093, p = 0.0286).
   - Added `tier1_pr_gauge.py` to the replication kit so every PR/rank-one-share number cited in the paper is reproducible from committed raw data.
   - Copied the round-1 preregistration into `replication/error-geometry/` so all three preregistrations now live with the replication kit.

3. **Automation built**
   - `paper2/build_paper.py`: one-command figure regeneration, LaTeX compile, PDF verification, and submission bundle creation. Auto-detects TinyTeX on Windows.
   - `paper2/quality_gate.py`: checks citation↔bib parity, figure existence, placeholder text, and (optionally) Lean build.
   - `paper2/requirements-figures.txt`: pinned figure environment with scienceplots/matplotlib compatibility note.

4. **Companion sync**
   - `paper2/immi/projection-law-immi.tex` was regenerated from the PRX master by a dedicated subagent and recompiled cleanly.
   - Fixed broken cross-citations in `paper/immi-paper.tex` by adding `welcing2026projection` and `welcing2026formal` entries to `paper/references.bib`.

5. **Submission bundle**
   - `paper2/projection-law-submission-bundle.zip` contains source, bibliography, final PDF, and figure PDFs plus a replication-kit pointer.

   - Rebuilt `projection-law.pdf` and `immi/projection-law-immi.pdf` from updated sources; refreshed submission bundles.
   - Addressed academic-review MUST FIX items: tightened affine/gauge and smooth-local/global bridges; downplayed finite-sample PR sample-complexity claim; added MLIP permutation-floor nuance to abstract, Table 1, and the IMMI abstract; added versioned PDF assets to `library-site` and updated `working-papers.html` links.

6. **2026-06-21 evidence closure**
   - Re-ran `replication/error-geometry/tier1_analyze.py`: **PASS** (S_func = +0.317, S_arch = -0.093, p = 0.0286).
   - Re-ran `replication/error-geometry/tier1_pr_gauge.py`: screened foundation-MLIP per-element PR table reproduced for all 15 elements (median PR 1.592, max 1.910, median rank-1 share 0.774).
   - Re-ran `paper2/quality_gate.py`: **PASS** (42 citations, 42 bibliography entries, 4 figures).
   - Verified live `glim-think` workflow surfaces and queued 12 `mlip-discovery-loop` agenda actions for campaign `github:27618187135`; Fe/CHGNet stability evaluation returned verdict `inspect_before_promotion`.

## Known remaining manual steps

- DONE 2026-06-21: **Zenodo DOI** minted and propagated:
  `https://doi.org/10.5281/zenodo.20787874`.
- DONE 2026-06-21: **ORCID** filled:
  `https://orcid.org/0009-0002-1602-8545`.
- **Review cycle**: academic and adversarial review issues are incorporated; do one final human read-through before submission.
- **External marketing page**: `lupine.science` marketing source is outside this repo and still points to the old GCS PDF; update it to the new `/assets/papers/projection-law-v2026-06-16.pdf` link.
- DONE 2026-06-21: **Final reference audit**: re-verified `boe2018`
  (`Geophysical Research Letters` 45, 2771--2779,
  doi:10.1002/2017GL076829) and `gao2015` (`Current Opinion in
  Neurobiology` 32, 148--155, doi:10.1016/j.conb.2015.04.003).
- **PRX / arXiv submission**: the manuscript is now technically submission-ready; venue-specific formatting and cover letter are the next human steps.

## Verification commands

```powershell
# P2 quality gate (citations, figures, Lean build)
cd paper2
python quality_gate.py --lean

# Full rebuild from source
cd paper2
python build_paper.py --all

# Tier-1 evidence check
cd replication/error-geometry
python tier1_analyze.py
python tier1_pr_gauge.py

# Lean proof check
cd lean-spec
lake build
```
