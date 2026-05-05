# Response to Critique 11: Simpson's Paradox vs. Ecological Fallacy in the Pair-Style Analysis

**Manuscript:** *The Causal Geometry of Prediction Errors in Interatomic Potentials*
**Author:** A. Welcing (Lupine Materials Science)
**Venue:** Integrating Materials and Manufacturing Innovation (IMMI)
**Critique under response:** Critique 11, paragraph beginning *"The preprint itself defines Simpson's paradox as a sign reversal between pooled and within-group correlations..."*

---

## 1. Summary of the reviewer's point and our response

The reviewer writes:

> The preprint itself defines Simpson's paradox as a sign reversal between pooled and within-group correlations. But in the pair-style analysis the manuscript reports r_pool = 0.82 and within-group mean r = 0.95, both positive; that is an ecological-fallacy example, not a classical Simpson reversal.

**The reviewer is correct.** The pair-style analysis as currently reported in the manuscript does not exhibit a classical Simpson reversal. Both the pooled correlation (r ≈ 0.82) and the family-wise within-group correlations (mean r ≈ 0.95) lie in the same half-plane of the correlation circle; what the analysis demonstrates is *magnitude attenuation under pooling*, the canonical signature of the **ecological fallacy** (Robinson 1950), not the *sign reversal* required for **Simpson's paradox** (Simpson 1951) under our own definition.

We thank the reviewer for the precision. The conflation of the two terms is a defect of language with potential consequences for how readers interpret the rest of the framework, and it will be corrected throughout the revised manuscript. The remainder of this response (i) restates the formal distinction, (ii) documents three established sign-reversal Simpson examples in the quantitative-science literature so the corrected manuscript can ground its terminology in the canon, (iii) argues that the *scientific* warning the framework delivers — pooled benchmarks across heterogeneous chemistry are unsafe — survives the relabeling, (iv) concretely demonstrates that a *true* Simpson reversal is geometrically possible in the BCC/FCC stratification and identifies how to test for it, and (v) lists the manuscript revisions we will make.

---

## 2. Formal distinction between Simpson's paradox and the ecological fallacy

### 2.1 Definitions

**Simpson's paradox** (Simpson, E. H. 1951. *J. R. Stat. Soc. B* 13:238–241; see also Yule 1903 for the original "Yule–Simpson" form). Given a population partitioned into groups *g* = 1, …, *G*, Simpson's paradox occurs when the pooled association between two variables *X* and *Y* has **the opposite sign** from the within-group association in **every** subgroup *g*. For correlations: sign(r_pool) ≠ sign(r_g) for all *g*. The defining feature is the **strict reversal**, not attenuation.

**Ecological fallacy** (Robinson, W. S. 1950. "Ecological Correlations and the Behavior of Individuals." *Am. Sociol. Rev.* 15:351–357; clarified in Selvin, H. 1958. *Am. J. Sociol.* 63:607–619). The ecological fallacy is the **scale mismatch** error of inferring individual-level associations from group-aggregated data (or vice versa). The pooled (between-group) correlation can differ from the within-group correlations in **magnitude, sign, or both**. Sign reversal is the strongest manifestation; *Simpson's paradox is the special case of the ecological fallacy in which the discrepancy crosses zero*.

So all Simpson reversals are ecological-fallacy instances, but most ecological-fallacy instances are not Simpson reversals. In our pair-style analysis, r_pool = 0.82 and within r̄ = 0.95 is the latter: a same-sign attenuation (a "shrunken-pooled" pattern), driven by between-family dispersion adding noise to the pooled scatter.

### 2.2 Geometric / algebraic condition for a true Simpson reversal

Treat each group *g* as a Gaussian cloud with mean (μ_X^g, μ_Y^g), within-group covariance Σ_g, and weight n_g. Decompose the pooled covariance:

> Cov_pool(X, Y) = E_g[Cov_g(X, Y)] + Cov_g(μ_X^g, μ_Y^g)

i.e. *within* + *between*. The pooled correlation has the opposite sign from every within-group correlation iff the *between*-group covariance dominates and points in the **opposite** direction from each within-group covariance. Geometrically: each subgroup ellipse is tilted one way (say, positively); the centroids of those ellipses lie along a line tilted the *other* way (negatively); and the centroid-spread is large enough relative to the within-group spread to flip the pooled regression.

This is more restrictive than "the pooled and within numbers disagree." The manuscript's pair-style data fail this stronger condition; they only show that the within-family and between-family components of the pooled covariance are not parallel, which is sufficient for attenuation but not for reversal.

### 2.3 Why the distinction matters

A pooled–within disagreement that *does* cross zero is a strict logical refutation of the pooled summary: the pooled benchmark says "X positively predicts Y" and every subgroup says "X negatively predicts Y." A pooled–within disagreement that only attenuates is a quantitative warning, not a qualitative one. Both are decision-relevant for benchmarking — but the manuscript's previous wording promised the stronger of the two and delivered the weaker.

---

## 3. Three documented sign-reversal examples in the quantitative-science literature

For the corrected manuscript to anchor its terminology, we will cite three well-documented sign-reversal Simpson examples from quantitative science. Each is a *true* reversal: the pooled effect goes one way and every subgroup effect goes the other.

### Example A — Kidney-stone treatment (Charig et al. 1986 / Julious & Mullee 1994)

**Citation:** Charig, C. R., Webb, D. R., Payne, S. R., Wickham, J. E. A. (1986) "Comparison of treatment of renal calculi by open surgery, percutaneous nephrolithotomy, and extracorporeal shockwave lithotripsy." *British Medical Journal* 292:879–882. Re-analyzed as a Simpson example in Julious, S. A. & Mullee, M. A. (1994) "Confounding and Simpson's paradox," *BMJ* 309:1480–1481.

**Numbers (commonly cited subset comparing open surgery, "Treatment A," to percutaneous nephrolithotomy, "Treatment B"):**

| Stratum | Treatment A (open surgery) | Treatment B (percutaneous) |
|---|---|---|
| Small stones (< 2 cm) | **93%** (81/87) | 87% (234/270) |
| Large stones (≥ 2 cm) | **73%** (192/263) | 69% (55/80) |
| **Pooled** | 78% (273/350) | **83%** (289/350) |

Within each stone-size stratum, Treatment A wins. Pooled across strata, Treatment B wins. This is a strict success-rate reversal — exactly Simpson's paradox in the canonical sense. The confounder is allocation: large stones (the harder cases) were preferentially routed to Treatment A, dragging its pooled rate down.

**Why the reversal happens (3 sentences):** The two strata have very different baseline difficulties (large stones are harder to treat regardless of method). Treatment A absorbs the disproportionately hard cases (263/350 = 75% of A's patients have large stones, vs. only 80/350 = 23% of B's). The pooled mean is therefore a weighted average where the weights themselves are confounded with the outcome, flipping the sign of the difference.

### Example B — Berkeley graduate admissions (Bickel, Hammel & O'Connell 1975)

**Citation:** Bickel, P. J., Hammel, E. A., & O'Connell, J. W. (1975) "Sex Bias in Graduate Admissions: Data from Berkeley." *Science* 187(4175):398–404. DOI: 10.1126/science.187.4175.398.

**Numbers:**

- *Pooled (across all departments, fall 1973):* admission rate for men = 44% (3,714/8,442); for women = 35% (1,512/4,321). The pooled marginal odds favor men.
- *Stratified by department:* in 4 of the 6 largest departments, admission rates were *higher* for women than for men. The pooled-and-corrected (Mantel–Haenszel-style) effect showed a "small but statistically significant" bias *in favor of women*.

This is a sign reversal of the gender-effect direction at the unit (department) level vs. the population. Many practitioners regard it as the prototypical real-world Simpson example outside of medicine.

**Why the reversal happens:** Women applied disproportionately to highly competitive departments with low admission rates for everyone (e.g. English); men applied disproportionately to departments with high admission rates (e.g. engineering). Department choice is a confounder of the (sex → admission) association: it sets the baseline rate that any applicant of either sex will face. Marginalizing over department mixes incommensurate base rates, and the pooled marginal flips the sign of the conditional effect.

### Example C — Two-season batting averages (Ross 2004; Wagner 1982)

**Citation:** Ross, K. (2004) *A Mathematician at the Ballpark.* Pi Press. Earlier general treatment in Wagner, C. H. (1982) "Simpson's Paradox in Real Life." *The American Statistician* 36(1):46–48. DOI: 10.2307/2684093.

**Numbers (Derek Jeter vs. David Justice, Major League Baseball, 1995–1996):**

| Year | Jeter (H/AB, BA) | Justice (H/AB, BA) | Higher BA |
|---|---|---|---|
| 1995 | 12 / 48 = .250 | 104 / 411 = .253 | **Justice** |
| 1996 | 183 / 582 = .314 | 45 / 140 = .321 | **Justice** |
| **Combined** | 195 / 630 = **.310** | 149 / 551 = .270 | **Jeter** |

In *both* individual seasons Justice's batting average exceeded Jeter's. Pooled over the two seasons, Jeter's average exceeded Justice's by 40 points. This is a sign reversal of the (player → BA) effect under pooling.

**Why the reversal happens:** 1995 was a low-BA year for both players, and 1996 was a high-BA year for both. Justice took most of his at-bats (411/551 = 75%) in the low-year (1995). Jeter took most of his at-bats (582/630 = 92%) in the high-year (1996). The pooled BA is at-bat-weighted, and the at-bat distribution is confounded with the per-season baseline: pooling weights Justice's average toward the bad year and Jeter's toward the good year, flipping the comparison.

### Honourable mentions for the corrected Discussion

- Pearl, J. (2014) "Understanding Simpson's Paradox." *The American Statistician* 68(1):8–13. Modern causal-graph treatment showing why purely statistical "fix the paradox" rules (e.g. always-stratify or never-stratify) are wrong and the do-calculus is required.
- Hernán, M. A., Clayton, D., Keiding, N. (2011) "The Simpson's paradox unraveled." *International Journal of Epidemiology* 40(3):780–785.
- Investigations of Simpson reversals in ML benchmark aggregation (e.g. Alipourfard et al. 2018, "Can you Trust the Trend? Discovering Simpson's Paradoxes in Social Data," *WSDM 2018*; Sharma et al. 2022, "Detecting Simpson's Paradox: A Machine Learning Perspective," in *DEXA 2022*, Springer LNCS 13426). These show pooled benchmark accuracies reversing sign of the model-vs-model comparison once subgroups (cohort, label distribution, source dataset) are stratified — the direct ML analogue of the issue being raised here for interatomic potentials.

---

## 4. Why the warning still matters for materials benchmarking

The reviewer's correction is about terminology, not about the underlying epistemic problem the framework is trying to flag. We argue that the substantive warning — *one-number benchmarks across heterogeneous element families and crystal structures are unsafe* — survives the relabeling. Three reasons.

**(a) The framework's primary BCC/FCC stratification has the geometric structure required for a true Simpson reversal.** The artifact that critique 11 itself cites reports BCC element correlations clustered in 0.70–0.99 and FCC element correlations clustered in 0.05–0.40, with I² ≈ 98.6% across 15 elements and 1,677 observations. This is not the pair-style configuration; this is the element/structure stratification. With FCC correlations near zero (mean ≈ 0.2, several individual-element values negative or indistinguishable from zero in the underlying table) and BCC correlations near unity, *if the between-element centroid arrangement happens to be tilted oppositely* — for instance, if the highest-error FCC elements have the *lowest* reference values and the lowest-error BCC elements have the *highest* — the pooled regression slope can in principle flip sign. The condition is not exotic; it depends on the joint arrangement of (element-mean error, element-mean reference). Whether the actual benchmark exhibits a strict reversal in any cell is an empirical question the manuscript should answer rather than assume.

**(b) A small synthetic demonstration that the geometric possibility is real.** Consider two element groups A (FCC-like, weak within-group correlation) and B (BCC-like, strong within-group correlation), each with *n* = 50 observations:

- Group A: X_A ~ N(μ = 1, σ = 0.1), Y_A = X_A + ε_A where ε_A ~ N(0, 0.5). Within-group r_A ≈ +0.20.
- Group B: X_B ~ N(μ = −1, σ = 0.1), Y_B = X_B + ε_B where ε_B ~ N(0, 0.05). Within-group r_B ≈ +0.90.

Both subgroup correlations are positive. Now move the *centroids* to opposite-tilt positions: shift group A so that its centroid is at (X̄_A, Ȳ_A) = (+1, −1) and group B's centroid is at (X̄_B, Ȳ_B) = (−1, +1). The pooled X–Y scatter contains two tightly clustered clouds whose centroids lie along a line of slope −1, while each cloud individually has slope +1. The pooled correlation is negative; the within correlations are both positive. **Strict Simpson reversal.** The construction uses only a shifted-mean and shared-slope template — i.e. it is the minimal modification of the pair-style picture that crosses zero. The manuscript will include this construction (with code in the supplement) so the reader can see exactly which empirical pattern would cross from "ecological fallacy" to "Simpson's paradox."

**(c) The same warning, framed honestly, is more useful.** A reader who is told "Simpson's paradox" expects sign reversal and may discount the framework if the cited example is "only" attenuation. A reader who is told "magnitude attenuation under pooling, with a known theoretical pathway to full Simpson reversal in the BCC/FCC stratification, demonstrated synthetically and tested empirically in §X.Y," gets a more accurate map of the evidence. The framework's epistemic load is then: pooled benchmarks should at minimum quote a heterogeneity statistic (e.g. I²) and should report stratified effects; if any subgroup arrangement exhibits a sign reversal, the pooled metric is not just biased but logically misleading.

---

## 5. Manuscript revisions

The revised manuscript will make the following changes.

1. **§ Pair-style analysis (currently labelled "Simpson's paradox in pair-style benchmarks").** Rename to **"Magnitude attenuation under pooling (ecological fallacy)."** Replace each occurrence of "Simpson's paradox" in this section with "ecological fallacy" or "magnitude attenuation," reserving "Simpson's paradox" exclusively for sign-reversal cases. State explicitly: "Both r_pool = 0.82 and the within-family mean r̄ = 0.95 are positive; this is a same-sign attenuation, the canonical ecological fallacy of Robinson (1950), not the sign reversal of Simpson (1951)."

2. **New sub-section "When ecological fallacy becomes Simpson reversal."** Add the synthetic two-cloud construction from §4(b) above as a worked example. Provide the figure (the two clouds on a tilted-centroid template), the within-group correlations, the pooled correlation, and a reproducible code snippet. Use this to articulate the geometric criterion (between-group covariance opposite-signed and dominant over within-group covariance).

3. **Empirical search for a true Simpson reversal in the BCC/FCC table.** Add a check that, for each pair of elements (or for the BCC vs. FCC pooling), tests whether the pooled predicted-vs-reference correlation has the opposite sign from both element-wise correlations. Report the result honestly: if no cell crosses zero, say so and frame the warning as "documented attenuation, not documented reversal, in this dataset"; if any cell does cross zero, report it. Either outcome is publishable; the previous wording prejudged which it would be.

4. **Discussion citations.** Add Simpson (1951), Robinson (1950), Selvin (1958), Bickel et al. (1975), Charig et al. (1986), Julious & Mullee (1994), Wagner (1982) / Ross (2004), Pearl (2014), Hernán et al. (2011), and one ML-benchmark Simpson reference (Alipourfard et al. 2018 or Sharma et al. 2022). Keep the existing Pearl & Bareinboim (2014) "External validity: from do-calculus to transportability across populations," *JASA* 109:8059, which is the right reference for *when* subgroup effects compose into a population effect — directly relevant to the question of when a pooled benchmark is admissible at all.

5. **Title and abstract.** The abstract currently uses "Simpson-like" and "Simpson-style" loosely. Tighten to "ecological fallacy with a Simpson-reversal pathway demonstrated synthetically and tested empirically." The title's "causal geometry" claim, while attacked elsewhere in the critique, is not directly at stake in this response and is being addressed in a separate response document.

---

## 6. Theoretical synthesis

The deeper point is that "Simpson's paradox" and "ecological fallacy" are not merely synonyms with different intensities — they are members of a common family of *transportability* failures that Pearl & Bareinboim (2014, *JASA*) formalize using the do-calculus. A pooled benchmark is implicitly a *transport* operation: it takes effect estimates from sub-populations (element families, crystal structures, training-data slices) and projects them onto a single super-population (the union benchmark). Pearl & Bareinboim show that this transport is licensed only when the relevant *S*-admissible set of variables is conditioned on; it is *not* generally licensed by simple averaging.

Hernán, Clayton, & Keiding (2011) reach the same conclusion from the epidemiological side: Simpson's paradox is "unraveled" once one writes down the causal DAG and asks whether the pooling operation respects the back-door criterion. In our setting, the DAG node we need is *element identity* (or *crystal structure*), which acts as a confounder of the (predicted-error → reference-error) association whenever both error magnitudes depend on chemistry. Pooling without conditioning on chemistry is therefore not licensed in general, regardless of whether the resulting bias is sign-flipping (Simpson) or magnitude-distorting (ecological fallacy).

This is why the *terminology* matters less than the *causal structure*: both labels point to the same back-door violation. The manuscript will be clearer about which specific symptom (attenuation vs. reversal) the pair-style data exhibit, while keeping the same unified causal-inference frame for the warning.

---

## 7. Self-critique

Three weaknesses of this response and the planned revisions.

**(a) The synthetic two-cloud construction in §4(b) is, by construction, a demonstration of geometric possibility, not of empirical inevitability.** A skeptical reader could legitimately point out that we chose the centroid arrangement to flip the sign. The honest response is exactly that — we are demonstrating what *could* happen in the data, not claiming it *does* happen in the pair-style data. The empirical search in revision 5.3 is the appropriate test, and we will let its outcome stand on its own.

**(b) Some readers prefer the broader "ecological fallacy" framing and would view the Simpson-vs-ecological-fallacy distinction as hair-splitting.** We have some sympathy with this view; in practice, both labels deliver the same managerial advice ("don't pool across heterogeneous subgroups without checking"). However, since the manuscript itself defined "Simpson's paradox" as a sign reversal in its own setup paragraph, internal consistency requires that the term not then be applied to a non-reversal example. The reviewer is enforcing our own definition, not imposing an outside one.

**(c) We have not yet checked, at the time of this response, whether any individual cell of the BCC/FCC element-pair table in the meta-analysis artifact actually exhibits a strict sign reversal.** Critique 11 quotes ranges (BCC 0.70–0.99, FCC 0.05–0.40) but several FCC values cluster near zero, and we have not exhaustively enumerated the pair-wise pooled correlations against pair-wise stratified correlations. The revised manuscript will run that search and report the result; this response document commits to the methodology, not the outcome. If a true Simpson cell exists, we will highlight it; if it does not, the framework's warning will rest on attenuation plus the demonstrated geometric possibility, which is still a defensible position but a less dramatic one.

---

## 8. Closing

We are grateful to the reviewer for the precision. The defining feature of Simpson's paradox is sign reversal; the pair-style analysis as currently reported is a same-sign attenuation; calling the latter "Simpson's paradox" is a categorical error against the manuscript's own definition. The terminology will be corrected throughout the revised manuscript: "Simpson's paradox" will be reserved for documented sign reversals, and the pair-style example will be relabelled as the ecological fallacy (Robinson 1950) it is.

The scientific contribution of the framework — that pooled one-number benchmarks across heterogeneous element families and crystal structures are not transport-admissible without conditioning on chemistry — is unchanged by the relabeling. We have shown, with an explicit geometric construction, that a true Simpson reversal is possible within the BCC/FCC element stratification, and the revised manuscript will report whether any cell of the empirical table actually crosses zero. The warning to the benchmarking community is therefore, if anything, sharpened by the precision the reviewer has imposed: *attenuation is documented in this dataset; reversal is geometrically possible and will be searched for; either way, do not pool*. We thank the reviewer for moving the manuscript toward this clearer formulation.

---

### Bibliography for this response

- Alipourfard, N., Fennell, P. G., Lerman, K. (2018) "Can you Trust the Trend? Discovering Simpson's Paradoxes in Social Data." *Proceedings of the 11th ACM International Conference on Web Search and Data Mining* (WSDM 2018), 19–27.
- Bickel, P. J., Hammel, E. A., O'Connell, J. W. (1975) "Sex Bias in Graduate Admissions: Data from Berkeley." *Science* 187(4175):398–404. DOI: 10.1126/science.187.4175.398.
- Charig, C. R., Webb, D. R., Payne, S. R., Wickham, J. E. A. (1986) "Comparison of treatment of renal calculi by open surgery, percutaneous nephrolithotomy, and extracorporeal shockwave lithotripsy." *British Medical Journal* 292:879–882.
- Hernán, M. A., Clayton, D., Keiding, N. (2011) "The Simpson's paradox unraveled." *International Journal of Epidemiology* 40(3):780–785.
- Julious, S. A. & Mullee, M. A. (1994) "Confounding and Simpson's paradox." *BMJ* 309:1480–1481.
- Pearl, J. (2014) "Understanding Simpson's Paradox." *The American Statistician* 68(1):8–13.
- Pearl, J. & Bareinboim, E. (2014) "External validity: from do-calculus to transportability across populations." *Journal of the American Statistical Association* 109:8059.
- Robinson, W. S. (1950) "Ecological Correlations and the Behavior of Individuals." *American Sociological Review* 15:351–357.
- Ross, K. (2004) *A Mathematician at the Ballpark.* Pi Press.
- Selvin, H. C. (1958) "Durkheim's Suicide and Problems of Empirical Research." *American Journal of Sociology* 63:607–619.
- Sharma, R., et al. (2022) "Detecting Simpson's Paradox: A Machine Learning Perspective." *DEXA 2022*, Springer LNCS 13426.
- Simpson, E. H. (1951) "The Interpretation of Interaction in Contingency Tables." *Journal of the Royal Statistical Society, Series B* 13(2):238–241.
- Wagner, C. H. (1982) "Simpson's Paradox in Real Life." *The American Statistician* 36(1):46–48. DOI: 10.2307/2684093.
- Yule, G. U. (1903) "Notes on the Theory of Association of Attributes in Statistics." *Biometrika* 2(2):121–134.
