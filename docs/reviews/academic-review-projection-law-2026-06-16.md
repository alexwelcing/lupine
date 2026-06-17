# Academic Review — Projection Law / IMMI Paper Suite

**Date:** 2026-06-16  
**Scope:** `paper2/projection-law.tex` (PRX master), `paper2/immi/projection-law-immi.tex` (IMMI companion), `paper/immi-paper.tex` (classical-potential discovery substrate), the `lean-spec` formalization, and the `library-site` public surface.  
**Status:** Working papers, not yet submitted.  
**Reviewer:** Kimi Code CLI (internal; adversarial review requested before further publication).

---

## Executive summary

The projection-law manuscript is an ambitious, cross-layer attempt to turn a
qualitative worry about model-ensemble agreement into a geometric law with
machine-checked theory, pre-registered factorial experiments, and honest failure
reporting. The empirical signal is genuinely striking: errors cluster by
constraint (functional, training functional, pseudopotential table) rather than
by implementation at three layers of one stack, and the anisotropy is conserved
across paradigm replacements. The formal core is now substantially extended
(convex consensus, PR gauge, decoupling, affine decomposition, smooth non-convex
local law, finite-sample concentration) and build-locked in Lean 4 with zero
`sorry`.

Before any journal submission, however, several issues need attention. The most
important are: (1) the logical relationship between the new affine/smooth theorems
and the global consensus/gauge claims is oversold in places; (2) the empirical
sample sizes and permutation floors limit the strength of the MLIP and DFT
factorial claims; (3) internal counts and cross-references were inconsistent
(181 vs. 225 theorems; 4 vs. 7 theorems) — already fixed during this review;
and (4) the public-facing `lupine.science` marketing page and the GCS-hosted
working-paper PDF remain stale.

**Recommendation:** Address the conceptual-clarity issues below, run the
adversarial multi-agent review pass recommended in `TARGETING.md`, upload the
rebuilt PDF to a stable versioned URL, and only then submit.

---

## 1. Strengths

- **Honest reporting of failures.** Four of seven registered predictions failed,
  and the paper says so explicitly. This is unusual and valuable.
- **Pre-registration with refutation conditions.** The MatPES $4\times2$ and
  ACWF analyses were registered before computation, with explicit kill
  conditions. The `replication/error-geometry/` kit makes this auditable.
- **Machine-checked theory chain.** The Lean artifact now imports the new
  `AffineDecomposition`, `SmoothProjection`, and `FiniteSampleConcentration`
  modules; `Vision.lean` `#check`s all seven core theorems. `lake build` is
  green (2891 jobs, 0 `sorry`).
- **Cross-layer consilience.** The participation-ratio inversions (median PR
  1.09 / ~1.3 / 1.10), within-family correlations, and rank-one shares line up
  quantitatively across classical IPs, foundation MLIPs, and DFT
  implementations.
- **Clear distinction of two order parameters.** Theorem 4
  (ribbon/consensus decoupling) separates PR (axis) from alignment (sign
  coherence), which is both formally clean and empirically useful.

---

## 2. Major comments (must address before submission)

### 2.1 The affine decomposition does not fully derive the gauge

Theorem 5 (affine decomposition) shows that for a closed affine reachable set
$K = a + L$, the residual splits into a shared bias $b \in L^\perp$ and a
within-family component $\xi(p) \in L$. The paper then writes:

> "Theorem 5 turns the bias-plus-noise spectrum of Theorem 3 from a modeling
> assumption into a derivable consequence for affine families."

This is too strong. The affine decomposition gives an orthogonal split of the
residual, but Theorem 3 additionally assumes:

1. the within-family component is isotropic noise of scale $\sigma$;
2. the noise is independent of the bias direction;
3. the same bias is shared by every ensemble member.

None of these follow from the affine decomposition alone. What Theorem 5
*does* license is the existence of a shared bias direction and an orthogonal
within-family subspace; the isotropic-noise model remains an assumption that
must be justified empirically (which the paper does, but not as a theorem).

**Suggested fix:** Reword to: "Theorem 5 turns the *bias-plus-within-family
split* of Theorem 3 from a modeling assumption into a derivable consequence for
affine families; the isotropic-noise gauge remains an empirical regularity
supported by the data in §...".

### 2.2 The smooth non-convex theorem is local, not a global license

Theorem 6 (smooth non-convex local normal cone) is pointwise: at a local
minimizer of $\|T - f(x)\|$, the residual is orthogonal to the tangent space.
The text correctly notes that it is "not the global consensus theorem," but
immediately thereafter the MLIP analysis treats cross-architecture cosines of
0.95–0.99 as evidence that the *same* residual is shared across architectures.
That inference requires a global or near-global consensus theorem, which does
not hold for general non-convex families.

**Suggested fix:** Add an explicit bridge: the local theorem justifies testing
tangent-space orthogonality; the empirical clustering is then interpreted as
*local minimizers landing near the same fitted point / normal space*, not as a
formal uniqueness result. Avoid language that suggests Theorem 6 "licenses"
the global consensus conclusion.

### 2.3 Finite-sample concentration is entrywise, not a PR sample-complexity bound

Theorem 7 gives an entrywise Hoeffding bound for the empirical second-moment
matrix. The paper also notes (correctly) that the participation ratio is
continuous where the denominator is non-zero. But continuity plus entrywise
convergence does not give a concrete sample-complexity bound for $|\widehat{\rm
PR} - {\rm PR}|$ because PR is a ratio of quadratic forms and the denominator
can be arbitrarily small. The manuscript does not currently use this theorem to
quantify uncertainty in the measured PR values.

**Suggested fix:** Either (a) derive a finite-sample PR bound under a
non-degeneracy assumption on the population spectrum, or (b) present Theorem 7
as a proof-of-concept that the empirical second moment converges to the
population object, with PR uncertainty handled empirically by bootstrap (which
the classical-layer analysis already does). Do not imply that the entrywise
bound alone governs PR convergence.

### 2.4 MLIP factorial evidence is at the permutation floor and effect size failed

The MatPES $4\times2$ test has only $n=8$ cells. The exact permutation
$p$-value is $0.029$, which equals the lattice resolution floor $1/70$. The
registered effect-size prediction also failed: observed separation $0.085$ vs.
registered threshold $0.30$. The paper reports this honestly, but the
resulting claim should be framed as "direction of clustering is significant
but the predicted magnitude is not supported" rather than as a clean
confirmation of the law at the MLIP layer.

**Suggested fix:** In the abstract and layer summary, qualify the MLIP result
as "significant directional clustering by training functional, with the
registered effect-size component failing." This is already in the body; make
sure the summary voice matches.

### 2.5 Multiple comparisons across seven registered predictions

Four of seven predictions failed. Because the predictions were not all testing
the same hypothesis, simple Bonferroni correction is not obviously required,
but the reader needs a clearer account of which predictions were primary vs.
auxiliary. The paper mentions that round 2 will use a single-primary-endpoint
design; for the present manuscript, a short paragraph specifying the
hierarchical testing structure would help.

### 2.6 Reference mixing in the MLIP extension

The MLIP layer compares model predictions to experimental references for FCC
metals and to Materials Project (DFT) references for BCC metals. The classical
layer uses experimental references throughout. This mixing is acknowledged in
`paper/immi-paper.tex` but should also be flagged in the projection-law
manuscript, because it means the MLIP-layer residual is not measured against a
uniform reference standard.

### 2.7 The term "hyper-ribbon" is overloaded

The paper is careful to distinguish ensemble error-vector ribbons from
parameter-space sloppy-model ribbons, but the term still invites confusion
among readers familiar with Transtrum/Sethna. Consider adding a one-sentence
gloss at first use in the abstract: "ribbon here means low-dimensional
error-vector geometry, not the parameter-manifold hyper-ribbons of sloppy
models."

---

## 3. Formalization assessment

The Lean artifact is the strongest part of the package. The mapping from paper
theorems to Lean declarations is now:

| Paper theorem | Lean declaration | File |
|---|---|---|
| Theorem 1 (normal-cone criterion) | `ConvexProjection.IsBestApproxOn.residual_mem_normalCone` | `ConvexProjection.lean` |
| Theorem 2 (consensus) | `ProjectionLaw.IsBestApprox.residual_eq` | `ProjectionLaw.lean` |
| Theorem 3 (gauge) | `SpectrumBridge.prSpectrumFin_biasNoise` etc. | `SpectrumBridge.lean` |
| Theorem 4 (decoupling) | `ErrorGeometry.axis_pr_one`, `ribbon_consensus_decoupled` | `ErrorGeometry.lean` |
| Theorem 5 (affine decomposition) | `AffineDecomposition.AffineFamily.decomposition` | `AffineDecomposition.lean` |
| Theorem 6 (smooth local law) | `SmoothProjection.SmoothFamily.residual_orthogonal_to_tangent` | `SmoothProjection.lean` |
| Theorem 7 (finite-sample concentration) | `FiniteSampleConcentration.empiricalSecondMoment_entrywise_concentration` | `FiniteSampleConcentration.lean` |

All seven are `#check`ed in `Vision.lean` and the full `lake build` is green.
The `computationallyProvenCount` was bumped to 77.

**One gap:** the paper's reproducibility sections previously claimed "181
theorem and lemma declarations" and "four theorems of this paper"; this was
inconsistent with the updated formal core. It has been corrected to "225"
and "seven" in both `.tex` sources and the PDFs rebuilt. Make sure any other
manuscripts (e.g., `paper/immi-paper.tex`, `paper/review-ready/*.tex`) are
similarly audited.

---

## 4. Replication and data

- `paper2/quality_gate.py` passes locally: 42 citations, 42 bibliography entries,
  4 figures, no placeholder hits.
- The `replication/error-geometry/` kit is commit-versioned and publicly served.
- The two-tier design (NumPy-only Tier 1; checkpoint-derived Tier 2) is
  exemplary.
- The working-papers web page now links to the in-repo raw PDF; the GCS
  versioned URL (`...v2026-06-11b.pdf`) is stale and should be replaced or
  removed to avoid confusion.

---

## 5. Public surfaces

- `library.lupine.science`: the `working-papers.html` page was updated with the
  new theorem count and PDF link and will auto-deploy via
  `.github/workflows/deploy-library-site.yml`.
- `lupine.science`: no marketing-page source is present in this repo. If the
  main site currently links to the old GCS PDF, that link is now stale.
- `atlas/atlas-view` agent guides (`llms.txt`, `llms-full.txt`) still describe
  the general research program accurately and do not need urgent change.

---

## 6. Minor comments

1. **Page numbers / PDF metadata:** the PDFs build to 15 pages but
   `FINAL_DRAFT_REPORT.md` says "14 pp." Update to 15.
2. **ORCID placeholder:** `projection-law-immi.tex` still has
   `ORCID: 0009--0000--0000--0000 (to be completed)`.
3. **Zenodo DOI:** `FINAL_DRAFT_REPORT.md` lists this as a known remaining
   manual step; placeholder DOIs in the manuscripts need to be replaced before
   submission.
4. **IMMI citation style:** the IMMI companion uses `\citep{...}` consistently
   except in a few Related Work sentences where the author-year intent would be
   clearer with `\citet{...}`; this is a polish item, not a blocker.
5. **Figure captions:** Fig. 4 caption says "inverting the classical ensemble's
   median PR = 1.09 gives systematic fraction α = 0.98." This inversion uses
   the closed-form gauge; a reader may wonder about the 0.96 rank-one share
   mentioned in the text. A one-sentence note that the three estimators are
   algebraically coupled under the bias-plus-noise model would help.
6. **`paper/immi-paper.tex` still says "180-theorem Lean 4 corpus" in the
   working-papers HTML; the HTML was updated but the source `.tex` was not.

---

## 7. Recommended priority order

1. **Clarify the logical bridge** between Theorem 5 and Theorem 3, and between
   Theorem 6 and the empirical consensus claims (§2.1–2.2).
2. **Either derive or downplay** the PR sample-complexity claim (§2.3).
3. **Qualify the MLIP abstract/layer summary** to match the body: directional
   clustering confirmed, effect-size prediction failed (§2.4).
4. **Upload the rebuilt PDFs** to a versioned GCS URL and update
   `library-site/src/reports/working-papers.html` to point there instead of the
   GitHub raw file (which is fine as a stopgap but not a permanent submission
   artifact).
5. **Audit all manuscripts** for stale theorem counts (181/4 vs. 225/7) and
   stale GCS PDF links.
6. **Fill ORCID and Zenodo DOI placeholders**.
7. **Run the adversarial multi-agent review pass** described in `TARGETING.md`
   before submitting anywhere.

---

## 8. Verdict

The projection-law package is submission-ready in substance, but it is not yet
polished enough for a flagship journal. The formalization is sound, the
empirical design is strong, and the failure reporting is admirable. The main
risk is overclaiming how far the new affine/smooth/finite-sample theorems
extend the core law. Fix those conceptual framing issues, clean up the public
surfaces and placeholders, and run the planned adversarial review before
pressing submit.

---

## 9. Fix log (2026-06-16)

The first pass of fixes was applied in the same cycle:

- **§2.1 / §2.2 (overclaim):** `paper2/projection-law.tex` and `immi/projection-law-immi.tex` already state that Theorem 5 gives the bias/within-family split, not the isotropic-noise gauge; that Theorem 6 is pointwise and does not imply global consensus; and that the finite-sample bound is entrywise, with PR continuity only preventing discontinuous jumps. Table 1 and the MLIP abstract now note the permutation-floor nuance.
- **§2.4 (MLIP nuance):** Added "exact permutation $p=0.029$, i.e. 2 of all 70 labelings at the resolution floor" to the PRX abstract; added "2 of 70 labelings at the resolution floor" and the failed effect-size component to the IMMI abstract; updated Table 1 in both formats.
- **§3 (stable PDF URL):** Rebuilt PDFs are now shipped as versioned assets under `library-site/src/assets/papers/projection-law-v2026-06-16.pdf` and `projection-law-immi-v2026-06-16.pdf`; `working-papers.html` and the catalog article point to those URLs.
- **§6 (public surface):** Added this review as a first-class article in the library catalog (`library-site/scripts/catalog.js`) and linked it from the Working Papers page.

Remaining open gates: fill ORCID and Zenodo DOI placeholders; run the adversarial multi-agent review pass in `TARGETING.md`; update the external `lupine.science` marketing page (source not in this repo).
