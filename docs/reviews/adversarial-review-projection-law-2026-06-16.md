# Adversarial Review — Projection Law / IMMI Paper Suite

**Date:** 2026-06-16  
**Scope:** `paper2/projection-law.tex` (PRX master), `paper2/immi/projection-law-immi.tex` (IMMI companion), the built PDFs, `paper2/FINAL_DRAFT_REPORT.md`, `paper2/TARGETING.md`, `library-site/src/reports/working-papers.html`, `library-site/scripts/catalog.js`, and `docs/PROGRAM.md`.  
**Reviewer:** independent adversarial pass (requested before submission).

---

## Verdict

The first-pass fixes are real and substantially address the overclaim problems in §2.1–2.4 of the academic review. The two manuscripts are now in sync on the theorem chain, the permutation-floor nuance, and the failure reporting. However, the fixes are not complete: one item (§2.5) is only mentioned in passing, another (§2.6) is softened but not explicitly flagged, and a new grammatical/interpretive problem has been introduced in the IMMI abstract. The IMMI PDF still ships an ORCID placeholder in its text layer, and a program-level doc (`docs/PROGRAM.md`) is stale. **Do not submit until the open items below are closed.**

---

## Checklist: the six MUST-FIX items from the academic review

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 2.1 | **Affine decomposition does not fully derive the gauge** | **Fixed** | Both `projection-law.tex:217` and `immi/projection-law-immi.tex:231` now read: "Theorem~5 turns the bias-plus-within-family *split* of Theorem~3 from a modeling assumption into a derivable consequence for affine families. The isotropic-noise gauge itself remains an empirical regularity..." The oversold "bias-plus-noise spectrum" wording is gone. |
| 2.2 | **Smooth non-convex theorem is local, not global** | **Fixed** | Both manuscripts state explicitly that Theorem~6 is "pointwise (one normal space per local minimizer), not the global consensus theorem" (`projection-law.tex:232`; `immi/projection-law-immi.tex:246`), and interpret MLIP clustering as nearby local minimizers landing in a common normal direction. |
| 2.3 | **Finite-sample concentration is entrywise, not a PR sample-complexity bound** | **Fixed** | Both manuscripts state: "It does not, by itself, give a closed-form sample-complexity bound for $|\widehat{\rm PR} - {\rm PR}|$ because the denominator... can be arbitrarily small. In practice, PR uncertainty is quantified by the bootstrap intervals" (`projection-law.tex:255`; `immi/projection-law-immi.tex:269`). |
| 2.4 | **MLIP factorial evidence is at the permutation floor and effect size failed** | **Fixed** | PRX abstract (`projection-law.tex:47`): "exact permutation $p=0.029$, i.e. 2 of all 70 labelings at the resolution floor; the registered effect-size component of this test failed." IMMI abstract (`immi/projection-law-immi.tex:55`) and Table 1 in both formats carry the same floor/failure language. Body text (`projection-law.tex:376`) repeats the effect-size miss ($0.085$ vs. $0.30$). |
| 2.5 | **Multiple comparisons across seven registered predictions** | **Partially fixed** | The Limitations section acknowledges "seven registered predictions across two experiments invite multiplicity concerns that round 2's single-primary-endpoint design addresses" (`projection-law.tex:620`; `immi/projection-law-immi.tex:633`). **Missing:** the requested short paragraph specifying which predictions were primary vs. auxiliary/hierarchical in the *present* manuscript, not just deferring to round 2. |
| 2.6 | **Reference mixing in the MLIP extension** | **Partially fixed** | Limitations note that the MLIP layer "compares to *experimental* references, so the measured residual mixes fitting error, exchange–correlation bias, and thermal/zero-point offsets" (`projection-law.tex:613`; `immi/projection-law-immi.tex:626`). **Missing:** an explicit flag that FCC metals use experimental references while BCC metals in the same MLIP analysis use Materials Project (DFT) references, so the MLIP-layer residual is not measured against a uniform reference standard. This was acknowledged in `paper/immi-paper.tex` but not carried into the law manuscript. |

---

## New issues found

### N1. IMMI abstract garbles the failure wording (introduced by the fix)
`paper2/immi/projection-law-immi.tex:55–56` reads:

> "...exact permutation $p=0.029$, 2 of 70 labelings at the resolution floor); **the registered effect-size component failed rotation prediction confirmed on Au and Pt under r$^2$SCAN but not Ag.**"

The missing punctuation makes it sound as if the rotation prediction failed. It should be split into two clauses, e.g.: "...the registered effect-size component failed; the rotation prediction was confirmed on Au and Pt under r$^2$SCAN but not Ag." The PRX abstract (`projection-law.tex:48`) gets this right.

### N2. ORCID placeholder leaks into the IMMI PDF text layer
`paper2/immi/projection-law-immi.tex:25` still has:

```latex
\small ORCID: 0009--0000--0000--0000 (to be completed)}
```

The extracted text layer of `paper2/immi/projection-law-immi.pdf` shows: **"ORCID: 0009–0000–0000–0000 (to be completed)"**. A placeholder marked "to be completed" must not ship in a submission PDF. The PRX master has no ORCID at all; most journals will require one, so both manuscripts need the real ORCID before submission.

### N3. Hyper-ribbon disambiguation gloss is not at first use in the abstract
Review §2.7 requested a one-sentence gloss at first use in the abstract distinguishing ensemble error-vector ribbons from sloppy-model parameter-space hyper-ribbons. The manuscripts do contain the distinction, but inside Theorem 4 (`projection-law.tex:200`) and the classical layer (`projection-law.tex:314`), not in the abstract. The abstract is where most readers will first encounter the term.

### N4. `docs/PROGRAM.md` is stale and inconsistent with the current build
`docs/PROGRAM.md` is dated 2026-06-11 and describes the formal core as "27 theorems, 0 sorry, 0 new axioms" with no mention of `AffineDecomposition`, `SmoothProjection`, or `FiniteSampleConcentration`. It also has a broken line at line 72–73: `USER: Zenodo DOI (` followed by a newline and `eplication/error-geometry/ZENODO_DEPOSIT.md...` (missing the leading `r`). This doc is outside the manuscripts but is part of the public docs surface the user asked to verify.

### N5. `quality_gate.py` would not catch the ORCID placeholder
`paper2/quality_gate.py:72` checks for `TODO`, `FIXME`, `XXXXXX`, `\[fill\]`, `placeholder`, and `Draft of`. It does not check for `(to be completed)` or the dummy ORCID `0009-0000-0000-0000`, so the placeholder in N2 escaped the gate.

### N6. `paper/immi-paper.tex` no longer has the stale "180-theorem" count
The academic review's minor comment §6.6 noted that `paper/immi-paper.tex` still said "180-theorem Lean 4 corpus." A fresh grep finds no such string in that file, so this has been cleaned up.

---

## Consistency check: counts, URLs, and PDFs

| Source | Claim | Status |
|--------|-------|--------|
| `paper2/projection-law.tex:261` | 225 theorem/lemma declarations, 7 theorems of this paper, 0 sorry, 0 new axioms | OK |
| `paper2/immi/projection-law-immi.tex:275` | same 225/7/0/0 language | OK (synced) |
| `FINAL_DRAFT_REPORT.md:11` | ~225 theorem/lemma declarations, 77 build-locked, 0 sorry | OK |
| `library-site/src/reports/working-papers.html:82` | ~225-theorem corpus · 77 build-locked · 0 sorry · 2891-job build green | OK |
| `paper2/projection-law.pdf` / `projection-law-immi.pdf` | 15 pages each, rebuilt 2026-06-17 09:06–09:07 | OK, matches `FINAL_DRAFT_REPORT.md:6` |
| `library-site/src/assets/papers/projection-law-v2026-06-16.pdf` | byte-identical to `paper2/projection-law.pdf` (477,806 bytes, same timestamp) | OK |
| `library-site/src/assets/papers/projection-law-immi-v2026-06-16.pdf` | byte-identical to `paper2/immi/projection-law-immi.pdf` (477,871 bytes, same timestamp) | OK |
| `library-site/src/reports/working-papers.html:94–95` | links to `/assets/papers/projection-law-v2026-06-16.pdf` and `/assets/papers/projection-law-immi-v2026-06-16.pdf` | OK |
| `docs/papers-working.md:7` | same two `/assets/papers/...v2026-06-16.pdf` links | OK |
| `paper/immi-paper.tex` | no stale 180/181 theorem count found | OK |

---

## Recommended next actions before submission

1. **Fix the IMMI abstract sentence** (`immi/projection-law-immi.tex:55–56`) so the effect-size failure and the rotation-prediction result are two unambiguous clauses.
2. **Remove/replace the ORCID placeholder** in `immi/projection-law-immi.tex:25`; add the real ORCID to the PRX master author block as well. Do not ship a PDF whose text layer contains "(to be completed)."
3. **Add the hyper-ribbon gloss to both abstracts** at first use, per review §2.7 (one sentence disambiguating ensemble error-vector ribbons from sloppy-model parameter-space ribbons).
4. **Add a short paragraph** in the MLIP/DFT experimental sections or in Limitations specifying the hierarchical testing structure: which of the seven registered predictions were primary endpoints and which were auxiliary/robustness checks. Do not defer the entire issue to round 2.
5. **Explicitly flag the reference-standard heterogeneity** in the MLIP layer: FCC metals vs. experimental references, BCC/non-FCC vs. DFT (Materials Project) references, and the consequences for interpreting the shared residual.
6. **Update `docs/PROGRAM.md`** to reflect the current formal corpus (225 declarations, 7 core theorems, new modules, 2891-job build) and fix the broken Zenodo-DOI line.
7. **Extend `quality_gate.py`** to flag `(to be completed)` and the dummy ORCID pattern so the gate catches placeholder leakage.
8. **Run the adversarial multi-agent review pass** described in `TARGETING.md` after the above are closed, then mint the Zenodo DOI and replace the acceptance-time DOI language in the IMMI declarations.

---

## Final statement

The manuscripts are now defensible on their core claims, but they still read as working papers with known manual steps outstanding. Close N1–N5, update the stale program doc, and run the planned adversarial pass before any journal submission.

---

## Fix log (2026-06-16, same cycle)

The issues above were addressed immediately after the review was produced:

- **N1 (IMMI abstract wording):** Split the effect-size failure and rotation-prediction clauses in `immi/projection-law-immi.tex:55`.
- **N2 (ORCID placeholder leak):** Removed the placeholder ORCID line from the IMMI author block; verified both PDF text layers contain no "to be completed" or dummy ORCID strings.
- **N3 (hyper-ribbon gloss):** Added a parenthetical disambiguating ensemble error-vector hyper-ribbon geometry from parameter-space sloppy-model ribbons in both abstracts.
- **N4 (`docs/PROGRAM.md`):** Updated the date, theorem/module counts, and open items; fixed the broken Zenodo-DOI line.
- **N5 (`quality_gate.py`):** Extended the placeholder linter to catch `(to be completed)`, `[to be added before submission]`, and the dummy ORCID patterns `0000-0000-0000-0000` / `0009-0000-0000-0000`.
- **2.5 / 2.6 (hierarchical testing + reference mixing):** Added explicit language in the Limitations section of both manuscripts specifying primary vs. auxiliary predictions and the FCC-experimental / BCC-DFT reference-standard heterogeneity.

Remaining open gates before submission: real ORCID, minted Zenodo DOI, external `lupine.science` marketing-page update, and a final human read-through.
