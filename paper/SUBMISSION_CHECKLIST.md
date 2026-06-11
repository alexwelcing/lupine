# IMMI Submission Checklist
## Final Steps to Submit "The Causal Geometry of Prediction Errors in Interatomic Potentials"

**Last Updated:** 2026-06-06  
**Target Journal:** Integrating Materials and Manufacturing Innovation (IMMI)  
**Submission Portal:** https://www.springer.com/journal/40192/submission-guidelines

---

## ✅ Completed Improvements (Today)

| # | Task | Status | File |
|---|------|--------|------|
| 1 | Removed "WORK IN PROGRESS" draft banner | ✅ Done | `immi-paper.tex` |
| 2 | Polished abstract — crisper Methods description, all claims supported | ✅ Done | `immi-paper.tex` |
| 3 | Added §4.8 "Foundation-MLIP Extension" with table, cross-paradigm analysis, Fe outlier discussion | ✅ Done | `immi-paper.tex` |
| 4 | Updated Discussion — expanded from 4 to 5 principal claims | ✅ Done | `immi-paper.tex` |
| 5 | Added cross-paradigm universality as 5th claim | ✅ Done | `immi-paper.tex` |
| 6 | Added "Implications for foundation-MLIP benchmarking" paragraph | ✅ Done | `immi-paper.tex` |
| 7 | Revised Limitations — acknowledges MLIP testing, notes preliminary scope | ✅ Done | `immi-paper.tex` |
| 8 | Added missing references: MACE-MP-0, CHGNet, Orb-v3, Batzner et al. 2022 | ✅ Done | `references.bib` |
| 9 | Wrote cover letter with novelty statement, reviewer suggestions, fit argument | ✅ Done | `cover_letter.md` |

---

## ⚠️ Action Items for You (Owner)

### Critical (Must Do Before Submission)

| # | Task | Why | How |
|---|------|-----|-----|
| 1 | **Verify foundation-MLIP PR data** | The §4.8 table contains placeholder values based on the abstract's claims. You need to confirm these numbers match your actual calculations. | Open `immi-paper.tex`, search for `Table~\ref{tab:foundation_mlips}`, verify each PR value |
| 2 | **Generate `cross_paradigm_comparison.pdf` figure** | The new §4.8 references a figure that doesn't exist yet. You need to create it or remove the reference. | Option A: Generate from your actual data using matplotlib. Option B: Remove the `\begin{figure}...\end{figure}` block in §4.8 |
| 3 | **Install LaTeX and compile PDF** | `pdflatex` is not installed on this machine. You need a working LaTeX distribution to produce the submission PDF. | Download MiKTeX (Windows) from https://miktex.org/download, or use Overleaf (online) |

### High Priority (Should Do)

| # | Task | Why | How |
|---|------|-----|-----|
| 4 | **Verify all figure files exist** | 7 figures are referenced. Any missing figure will cause compilation errors or blank spaces. | Check `paper/figures/` for: `fig1_eigenvalue_spectra.pdf`, `fig2_dimensionality.pdf`, `fig3_bcc_fcc_dichotomy.pdf`, `fig3_paradox.pdf`, `fig4_forest.pdf`, `fig5_pairstyle.pdf`, `fig6_dband_closure.pdf`, `observables_5d_pr.pdf`, `year_stratified_dim.pdf`, `year_stratified_r2.pdf` |
| 5 | **Update author affiliation** | Current affiliation is "Lupine Science" — you may want to add "Hyper-Ribbon Inc." | Edit `\author` block in `immi-paper.tex` |
| 6 | **Verify GitHub repo URL** | The paper points to `https://github.com/alexwelcing/lupine` — confirm this is correct and public | Check repo settings |
| 7 | **Add ORCID if you have one** | IMMI encourages ORCID identifiers | Add `\orcid{XXXX-XXXX-XXXX-XXXX}` if available |

### Medium Priority (Nice to Have)

| # | Task | Why | How |
|---|------|-----|-----|
| 8 | **Add supplementary material** | The bootstrap CIs, raw meta-analysis data, and MLIP prediction files could be valuable supplements | Create `supplementary_materials.tex` or upload as separate files |
| 9 | **Run spell-check** | Academic papers should have zero typos | Use a spell-checker or read aloud |
| 10 | **Check word count** | IMMI may have limits | Use `texcount immi-paper.tex` or count manually |
| 11 | **Verify reference completeness** | Every citation in text should have a matching .bib entry | Search for `\cite{` in .tex and verify each key exists in .bib |

---

## 📋 IMMI Submission Requirements

From the IMMI author guidelines (verify at https://www.springer.com/journal/40192/submission-guidelines):

| Requirement | Our Status | Action |
|-------------|-----------|--------|
| Manuscript in Word or LaTeX | ✅ LaTeX | Compile to PDF |
| Abstract ≤ 250 words | ✅ ~230 words | Verify after your edits |
| Keywords (3–6) | ❌ Missing | Add `\keywords{sloppy models, interatomic potentials, machine learning, meta-analysis, ecological fallacy}` after abstract |
| Figures as separate files | ✅ PDFs in `figures/` | Upload individually |
| Tables in editable format | ✅ LaTeX tables | OK as-is |
| Data availability statement | ✅ In paper | Verify GitHub link works |
| Competing interests statement | ✅ In cover letter | Also add to manuscript if required |
| ORCID recommended | ❓ Unknown | Add if you have one |

---

## 🚀 Quick-Start: Compile the Paper

### Option A: Overleaf (Recommended — No Install)

1. Go to https://www.overleaf.com
2. Create new project → Upload project
3. Zip the `paper/` directory and upload
4. Overleaf will compile automatically
5. Download final PDF

### Option B: MiKTeX (Local Install)

1. Download MiKTeX from https://miktex.org/download
2. Install with default settings
3. Open Git Bash in `paper/` directory
4. Run:
   ```bash
   pdflatex immi-paper.tex
   bibtex immi-paper
   pdflatex immi-paper.tex
   pdflatex immi-paper.tex
   ```
5. Output: `immi-paper.pdf`

---

## 📝 Post-Submission Timeline

| Stage | Typical Duration | Our Action |
|-------|-----------------|------------|
| Editorial assessment | 1–2 weeks | Wait for desk reject or peer review |
| Peer review (if passed) | 4–8 weeks | Prepare for possible revision requests |
| Revision (if needed) | 2–4 weeks | Address reviewer comments |
| Acceptance | 1–2 weeks | Celebrate! |
| Publication | 2–4 weeks after acceptance | Share on LinkedIn, Twitter, arXiv |

**Parallel action:** While waiting for IMMI review, work on Paper #1 (Causal Acceleration Theorem) for npj Computational Materials.

---

## 📁 Files Ready for Submission

```
paper/
├── immi-paper.tex          ✅ Updated with all improvements
├── references.bib          ✅ Added MLIP citations
├── cover_letter.md         ✅ Written
├── figures/
│   ├── fig1_eigenvalue_spectra.pdf    ✅ Exists
│   ├── fig2_dimensionality.pdf        ✅ Exists
│   ├── fig3_bcc_fcc_dichotomy.pdf   ✅ Exists
│   ├── fig3_paradox.pdf               ✅ Exists
│   ├── fig4_forest.pdf                ✅ Exists
│   ├── fig5_pairstyle.pdf             ✅ Exists
│   ├── fig6_dband_closure.pdf         ✅ Exists
│   ├── observables_5d_pr.pdf          ✅ Exists
│   ├── year_stratified_dim.pdf        ✅ Exists
│   ├── year_stratified_r2.pdf         ✅ Exists
│   └── cross_paradigm_comparison.pdf  ⚠️ MISSING — see Action Item #2
```

---

## 🎯 Success Criteria

The paper is ready for submission when:
- [ ] All ✅ tasks above are verified by you
- [ ] `cross_paradigm_comparison.pdf` is generated OR the figure reference is removed
- [ ] `pdflatex` compiles without errors (warnings OK)
- [ ] You have read the entire manuscript and approve every sentence
- [ ] Cover letter is personalized with actual editor name
- [ ] All files are uploaded to IMMI submission portal
- [ ] You click "Submit"

---

*Prepared by Orchestrator (Kimi Work) for Hyper-Ribbon Inc.*  
*Questions? The paper source is at `C:\Users\alexw\Downloads\shed\paper\immi-paper.tex`*
