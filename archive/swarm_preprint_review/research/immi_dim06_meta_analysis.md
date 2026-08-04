# Dimension 06 — Meta-Analysis Methodology for Heterogeneous Correlations

## Research Findings: Meta-Analysis Methods, Interpretation, and Precedents

---

## 1. Fisher z-Transformation: Why Is It Necessary for Correlations?

### Claim: Fisher's z-transformation is necessary for meta-analyzing correlation coefficients because it normalizes the sampling distribution and stabilizes the variance, which otherwise depends strongly on the true correlation value [^1^].
**Source:** Hedges & Olkin (1985), *Statistical Methods for Meta-Analysis*
**URL:** https://jepusto.com/files/Converting-from-d-to-r-to-z.pdf (secondary source citing Hedges & Olkin)
**Date:** 1985
**Excerpt:** "Hedges and Olkin(1985) note in particular that rp has a small bias... and that rp has large-sample variance Var(rp) ≈ (1-rp²)²/n. Note that this variance depends on the value of the correlation, which is one motivation for converting from r to Fisher's z scale for purposes of meta-analysis. z-Transformation removes this dependence, so that the large-sample variance of zp is Var(zp) ≈ 1/(n-3)."
**Context:** The variance of raw correlation coefficients is (1-ρ²)²/n, which approaches 0 as |ρ| → 1. This makes weighting by inverse variance problematic when studies have different true correlations.
**Confidence:** High

### Claim: Without the Fisher transformation, the variance of r grows smaller as |ρ| gets closer to 1, making standard error dependent on the unknown population parameter [^2^].
**Source:** Wikipedia / Fisher transformation (verified against primary sources)
**URL:** https://en.wikipedia.org/wiki/Fisher_transformation
**Date:** Reference work
**Excerpt:** "The Fisher transformation is an approximate variance-stabilizing transformation for r when X and Y follow a bivariate normal distribution. This means that the variance of z is approximately constant for all values of the population correlation coefficient ρ. Without the Fisher transformation, the variance of r grows smaller as |ρ| gets closer to 1."
**Context:** The transformation stretches the distribution near |ρ| = 1 where variance is smallest, thereby equalizing variability across the correlation range.
**Confidence:** High

### Claim: Fisher's z has the additional property of rapid convergence to normality compared to the raw correlation coefficient, which remains skewed for moderate sample sizes when |ρ| is large [^3^].
**Source:** Richardson (2004), "Seeing the Fisher Z-transformation"
**URL:** https://faculty.tcu.edu/richardson/seeing/seeingf060403.pdf
**Date:** 2004
**Excerpt:** "Relative to the correlation coefficient, Zr has a simpler distribution: its variance is more nearly independent of the corresponding population parameter; and it converges more quickly to normality (Johnson, Kotz, and Balakrishnan, 1995)."
**Context:** This rapid convergence is especially important for meta-analysis, which relies on normal approximation for confidence intervals and hypothesis tests.
**Confidence:** High

### Claim: The Fisher z-transformation was first introduced by R.A. Fisher in 1915 and refined in 1921, with the asymptotic variance of approximately 1/(n-3) that is independent of the true population correlation [^4^].
**Source:** Grokipedia (fact-checked) / Fisher (1915, 1921)
**URL:** https://grokipedia.com/page/Fisher_transformation
**Date:** 1921
**Excerpt:** "Fisher sought to transform these distributions into normal distributions. He proposed the transformation f(r) = arctanh(r)... the standard error of z is approximately 1/sqrt(N-3), which is independent of the value of the correlation."
**Context:** Historical development of the transformation for biometric applications, later adopted for meta-analysis.
**Confidence:** High

### Claim: There is an ongoing methodological debate between Hedges-Olkin (z-transformation) and Hunter-Schmidt (raw correlations) approaches for meta-analyzing correlations [^5^].
**Source:** StatsDirect, Pearson Correlation Meta-analysis
**URL:** https://www.statsdirect.com/help/meta_analysis/correlation.htm
**Date:** Current documentation
**Excerpt:** "Two methods are used: The Hedges-Olkin method is based on a conventional summary meta-analysis with a Fisher Z transformation of the correlation coefficient (Hedges and Olkin, 1985). The Hunter-Schmidt method is effectively a weighted mean of the raw correlation coefficient (Schmidt and Hunter, 1990)."
**Context:** The Hedges-Olkin method reduces Type I error for homogeneous studies, while the Schmidt-Hunter method provides less biased point estimates of the population correlation.
**Confidence:** High

### Claim: Field (2005) found that Hunter-Schmidt produced more accurate average correlation estimates with less error, though both methods were very accurate, while Hedges-Vevea confidence intervals were more conservative [^6^].
**Source:** Field (2005), *Psychological Methods*
**URL:** https://pubmed.ncbi.nlm.nih.gov/16392999/
**Date:** 2005
**Excerpt:** "(a) The Hunter-Schmidt method produced estimates of the average correlation with the least error, although estimates from both methods were very accurate; (b) confidence intervals from Hunter and Schmidt's method were always slightly too narrow but became more accurate than those from Hedges and Vevea's method as the number of studies... and the variability of correlations increased."
**Context:** Neither method is completely suitable for small numbers of studies (<30) or heterogeneous sets of studies.
**Confidence:** High

---

## 2. DerSimonian-Laird Random-Effects Model and τ² Estimation

### Claim: The DerSimonian-Laird (DL) estimator uses the method of moments to estimate τ² = max(0, (Q - (k-1))/C), where Q is Cochran's heterogeneity statistic and C is a scaling constant [^7^].
**Source:** Borenstein et al. (2009), *Introduction to Meta-Analysis*
**URL:** https://introduction-to-meta-analysis.com/download/c12.pdf
**Date:** 2009
**Excerpt:** "The parameter τ² (tau-squared) is the between-studies variance... One method for estimating τ² is the method of moments (or the DerSimonian and Laird) method, as follows. We compute T² = (Q - df)/C, where Q = Σ WiYi² - (Σ WiYi)²/Σ Wi, df = k-1."
**Context:** The DL method is the most widely used approach due to its computational simplicity and availability in software, but it has known limitations.
**Confidence:** High

### Claim: The DL estimator is negatively biased in scenarios with small numbers of studies and rare binary outcomes, tending to underestimate τ² and produce overly narrow confidence intervals [^8^].
**Source:** Langan et al. (2019), *Research Synthesis Methods*
**URL:** https://pubmed.ncbi.nlm.nih.gov/30067315/
**Date:** 2019
**Excerpt:** "Results confirm that the DerSimonian-Laird estimator is negatively biased in scenarios with small studies and in scenarios with a rare binary outcome... We recommend the method of restricted maximum likelihood (REML) to estimate the heterogeneity variance over other methods."
**Context:** A comprehensive simulation comparing 9 heterogeneity variance estimators.
**Confidence:** High

### Claim: Modern meta-analysis methodology has shifted toward REML as the preferred estimator for τ², as it reduces bias and produces more reliable estimates, especially with substantial heterogeneity [^9^].
**Source:** Understanding Heterogeneity in Meta-Analysis (Preprints.org)
**URL:** https://www.preprints.org/manuscript/202508.1527/v1
**Date:** 2025
**Excerpt:** "Given its well-documented biases, the DL estimator should no longer be regarded as the default choice in modern meta-analysis... REML is now considered the standard. Unlike DL, it iteratively searches for the τ² that makes the observed results most plausible under a random-effects model."
**Context:** The Cochrane Handbook (2024) now recommends REML as the default, with DL remaining as an option.
**Confidence:** High

### Claim: Veroniki et al. (2016) provide a comprehensive comparison of τ² estimators and recommend REML or Paule-Mandel for most applications [^10^].
**Source:** Veroniki et al. (2016), cited in Doing Meta-Analysis in R
**URL:** https://cjvanlissa.github.io/Doing-Meta-Analysis-in-R/random.html
**Date:** 2016
**Excerpt:** "An overview paper by Veroniki and colleagues (Veroniki et al. 2016) provides an excellent summary on current evidence which estimator might be more or less biased in which situation. This paper suggests that the Restricted Maximum-Likelihood estimator performs best, and it is the default estimator in metafor."
**Context:** The choice of estimator depends on k (number of studies), n (sample sizes), balance of study sizes, and magnitude of τ².
**Confidence:** High

---

## 3. Interpreting I² = 98.6% — What Does This Level of Heterogeneity Mean?

### Claim: I² measures the percentage of total variability across studies attributable to true heterogeneity rather than sampling error, calculated as I² = ((Q - df)/Q) × 100% [^11^].
**Source:** Higgins & Thompson (2002), *Statistics in Medicine*
**URL:** https://pubmed.ncbi.nlm.nih.gov/12111919/
**Date:** 2002
**Excerpt:** "We develop measures of the impact of heterogeneity on a meta-analysis, from mathematical criteria, that are independent of the number of studies and the treatment effect metric... I² is a transformation of (H) that describes the proportion of total variation in study estimates that is due to heterogeneity."
**Context:** This is the foundational paper introducing I². The measure was designed to be more interpretable than Cochran's Q.
**Confidence:** High

### Claim: Cochrane Handbook thresholds classify I² > 75% as "considerable heterogeneity" where "results are highly inconsistent; explore sources before relying on pooled estimate" [^12^].
**Source:** Cochrane Handbook Chapter 10
**URL:** https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-10
**Date:** 2024 (updated)
**Excerpt:** "A rough guide to interpretation... 75% to 100%: considerable heterogeneity*... The importance of the observed value of I² depends on (1) magnitude and direction of effects, and (2) strength of evidence for heterogeneity (e.g. P value from the Chi2 test, or a confidence interval for I²)."
**Context:** I² = 98.6% falls in the "considerable" category by a wide margin. At this level, the pooled estimate may be nearly meaningless without exploration of sources.
**Confidence:** High

### Claim: When I² = 98.6%, only 1.4% of the total variance is due to sampling error — the remaining 98.6% reflects true between-study differences. This means the studies are measuring fundamentally different effects [^13^].
**Source:** Research Gold — Heterogeneity in Meta-Analysis
**URL:** https://researchgold.org/blog/heterogeneity-meta-analysis-i-squared-guide
**Date:** 2026
**Excerpt:** "When Q greatly exceeds df, I-squared approaches 100%, nearly all variability reflects true differences between studies... An I-squared of 60% where some studies show benefit and others show harm is very different from an I-squared of 60% where all effect sizes point in the same direction."
**Context:** With I² = 98.6%, the studies are estimating genuinely different quantities, and a single pooled estimate may obscure important subgroup differences.
**Confidence:** High

### Claim: A critical but often overlooked limitation of I² is that it is a proportion, not a measure of absolute variability. Two meta-analyses can both have I² = 75% but vastly different amounts of actual variation [^14^].
**Source:** Research Gold / Borenstein et al. (2009)
**URL:** https://researchgold.org/blog/heterogeneity-meta-analysis-i-squared-guide
**Date:** 2026
**Excerpt:** "First, I-squared is a proportion, not a measure of absolute variability. Two meta-analyses can both have I-squared = 75% but vastly different amounts of actual variation — one may have effect sizes ranging from 0.3 to 0.5, while another ranges from -0.2 to 1.8."
**Context:** I² should always be reported alongside τ² (absolute heterogeneity) and the prediction interval.
**Confidence:** High

### Claim: I² approaches 100% as sample sizes become very large because the within-study component goes to zero, making I² sample-size dependent. A high I² can reflect either genuine heterogeneity or simply large sample sizes [^15^].
**Source:** Hemming et al. (2020), *BMC Medical Research Methodology*
**URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC8173367/
**Date:** 2020
**Excerpt:** "This is because the within-cluster component of the I-squared statistic is sample size dependent and goes to zero as the sample size goes to infinity. This therefore means that I-squared goes to 100% as the sample size becomes very large."
**Context:** With N = 1,677 total observations across 15 elements, the extremely large sample size contributes to the high I².
**Confidence:** High

---

## 4. Why Does the Random-Effects CI [0.41, 0.85] Span the BCC/FCC Divide?

### Claim: The random-effects confidence interval is always wider than the fixed-effects CI when heterogeneity is present (I² > 0), because the random-effects model adds between-study variance τ² to each study's weight [^16^].
**Source:** Cochrane Handbook Chapter 10
**URL:** https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-10
**Date:** 2024
**Excerpt:** "When heterogeneity is present, a confidence interval around the random-effects summary estimate is wider than a confidence interval around a fixed-effect summary estimate. This will happen whenever the I² statistic is greater than zero."
**Context:** The random-effects model accounts for the fact that studies are estimating different true effects, adding uncertainty about the mean of that distribution.
**Confidence:** High

### Claim: With extreme heterogeneity (I² = 98.6%), the between-study variance τ² dominates the weights, and the standard error of the pooled estimate becomes very large. The CI then naturally spans a wide range [^17^].
**Source:** Borenstein et al. (2009), *Introduction to Meta-Analysis*
**URL:** https://meta-analysis-workshops.com/download/commonmistakes.pdf
**Date:** Reference material
**Excerpt:** "Ironically, when the adjustment is most needed (when we have a small number of studies) the impact of the adjustment may be so large that the estimate of the mean effect size will be uninformative... While this is unfortunate, it represents the true state of affairs. When the between-study variance is non-trivial, an estimate of the mean effect size for the universe of comparable studies, based on few studies, is not reliable."
**Context:** A CI of [0.41, 0.85] for a correlation means the true average effect could plausibly range from moderate (0.41) to very strong (0.85), which spans different practical and theoretical classifications.
**Confidence:** High

### Claim: BCC (body-centered cubic) and FCC (face-centered cubic) are distinct crystal structure types with fundamentally different atomic arrangements, packing factors, and mechanical properties. A correlation spanning across the threshold between these classifications means the meta-analytic result is consistent with either classification [^18^].
**Source:** MSE Student, "What Is the Difference Between FCC and BCC?"
**URL:** https://msestudent.com/what-is-the-difference-between-fcc-and-bcc-crystal-structure-properties-interstitial-sites-and-examples/
**Date:** 2020
**Excerpt:** "FCC actually has the most efficient atomic arrangement possible (tied with HCP). This is why we call FCC a 'close-packed' structure... FCC and BCC crystals have different packing, slip systems, ductility, and more!"
**Context:** In the preprint context, the CI [0.41, 0.85] likely spans across a correlation threshold that separates materials predicted to have BCC vs FCC structures. The fact that the CI includes both moderate and strong correlations means the meta-analysis cannot definitively locate the true relationship on either side of a classification boundary.
**Confidence:** Medium (interpretation of specific context)

### Claim: The prediction interval (for a future study's effect) would be even wider than the confidence interval for the mean. With I² = 98.6%, the prediction interval likely spans from near-zero to very strong correlations [^19^].
**Source:** Higgins et al. (2009), "A re-evaluation of random-effects meta-analysis"
**URL:** https://introduction-to-meta-analysis.com/download/c17.pdf
**Date:** 2009
**Excerpt:** "A mean effect size of 0.50 where all true effects are clustered in the range of 0.40 to 0.60 may have very different implications than the same mean where the true effects are scattered over the range of 0.00 to 1.00."
**Context:** The prediction interval addresses: "what effect would we expect in a new, similar study?" With I² = 98.6%, this interval would be extremely wide.
**Confidence:** High

---

## 5. Forest Plots and Their Interpretation

### Claim: Forest plots display each study's effect size as a box (point estimate) with a horizontal line (95% CI), where box size reflects study weight. The overall pooled effect is shown as a diamond at the bottom [^20^].
**Source:** How to Interpret a Meta-Analysis Forest Plot, NIH/PMC
**URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC8119923/
**Date:** Current
**Excerpt:** "Each study included in a meta-analysis is represented by a box (point estimate) and a horizontal line through the box (95% confidence interval). The size of the box represents the study weight... The diamond below the studies represents the overall pooled effect."
**Context:** Forest plots provide a visual diagnostic of heterogeneity — when CIs overlap substantially, heterogeneity is low; when they are scattered, heterogeneity is high.
**Confidence:** High

### Claim: A key interpretive step is to check whether the diamond (pooled estimate) crosses the line of no effect. When I² > 75%, the forest plot typically shows studies scattered across both sides, indicating considerable inconsistency [^21^].
**Source:** Research Gold — Forest Plot Interpretation Guide
**URL:** https://researchgold.org/blog/forest-plot-interpretation-guide
**Date:** 2026
**Excerpt:** "When intervals are scattered across the plot with minimal overlap, or when some studies show strong positive effects while others show negative effects, heterogeneity is high. In our meta-analysis work, the most common misinterpretation we encounter is researchers focusing on the diamond while ignoring I² values above 75%."
**Context:** With I² = 98.6%, a forest plot would show almost no overlap between study CIs, with effects potentially ranging from weak to very strong correlations.
**Confidence:** High

### Claim: In random-effects forest plots, study weights are more evenly distributed than in fixed-effect plots because the model adds τ² to each study's variance, downweighting large studies and upweighting small ones [^22^].
**Source:** Research Gold
**URL:** https://researchgold.org/blog/forest-plot-interpretation-guide
**Date:** 2026
**Excerpt:** "In a random-effects meta-analysis, study weights are more evenly distributed than in a fixed-effect model, because the random-effects model accounts for both within-study and between-study variance (DerSimonian & Laird, 1986)."
**Context:** This reweighting can shift the pooled estimate substantially compared to fixed-effects, especially when small studies differ systematically from large ones.
**Confidence:** High

---

## 6. Has Meta-Analysis Been Used in Materials Science Before?

### Claim: Traditional meta-analysis (in the statistical sense of combining effect sizes across studies) is rare in materials science. The field more commonly uses Voigt-Reuss-Hill averaging for elastic tensor aggregation, which is a form of weighted averaging across crystallite orientations [^23^].
**Source:** MTEX Toolbox — Tensor Averages
**URL:** https://mtex-toolbox.github.io/TensorAverage.html
**Date:** Current documentation
**Excerpt:** "The Voigt and Reuss are averaging schemes for obtaining estimates of the effective elastic constants in polycrystalline materials. The Voigt average assumes that the elastic strain field in the aggregate is constant everywhere... The Reuss average assumes that the stress field in the aggregate is constant."
**Context:** Voigt-Reuss-Hill averaging combines single-crystal elastic constants over orientation distributions — it is structurally similar to meta-analysis (weighted averaging) but for physical property tensors rather than study-level statistics.
**Confidence:** High

### Claim: Materials informatics has increasingly used machine learning for cross-study prediction and aggregation, but these are predictive models rather than formal meta-analyses of effect sizes. Large-scale data integration (e.g., Materials Project, OQMD) represents a form of quantitative synthesis [^24^].
**Source:** Huang et al. (2023), "Application of Machine Learning in Material Synthesis and Property Prediction"
**URL:** https://www.mdpi.com/1996-1944/16/17/5977
**Date:** 2023
**Excerpt:** "ML can greatly reduce computational costs, shorten the development cycle, and improve computational accuracy... data in materials science are characterized by high acquisition costs, excessive concentration or dispersion, and a lack of uniform processing standards."
**Context:** The challenges of data aggregation in materials science (different measurement conditions, different purity levels, different computational parameters) mirror the heterogeneity challenges in clinical meta-analysis.
**Confidence:** High

### Claim: Direct precedent for meta-analysis of correlation coefficients in materials science appears limited. The standard methodology for combining correlation data across elements/systems is not well-established in the materials science literature [^25^].
**Source:** Multiple searches conducted
**URL:** Various
**Date:** 2024-2025
**Excerpt:** (No direct sources found for "meta-analysis" in the statistical sense applied to materials property correlations across multiple studies. Searches for "meta-analysis materials science bulk modulus", "meta-analysis Young's modulus correlation", and similar queries returned machine learning aggregation approaches, not formal statistical meta-analysis of correlation coefficients.)
**Context:** The application of DerSimonian-Laird random-effects meta-analysis with Fisher z-transformation to combine correlations across 15 elements appears to be a novel methodological contribution, adapted from psychology/medicine to materials science.
**Confidence:** Medium (absence of evidence is not evidence of absence)

### Claim: The concept of "learning to learn" (meta-learning) has been applied in materials science for property prediction, but this is distinct from statistical meta-analysis. It involves training a model to adapt to new material systems with few data points [^26^].
**Source:** Nature Communications (2025), "Advancing extrapolative predictions of material properties through learning to learn"
**URL:** https://www.nature.com/articles/s43246-025-00754-x
**Date:** 2025
**Excerpt:** "We employed a meta-learning algorithm, commonly known as 'learning to learn,' to impart extrapolative prediction capabilities... MNNs have a distinctive feature in that they explicitly include the training dataset as an input variable."
**Context:** The term "meta-analysis" is used differently in machine learning (meta-learning) than in statistics. The preprint's use of statistical meta-analysis for correlation coefficients is a cross-disciplinary methodological transfer.
**Confidence:** High

---

## 7. Limitations of Meta-Analyzing Correlations Across Physically Distinct Systems

### Claim: A fundamental assumption of meta-analysis is that the effect sizes from different studies measure (at least approximately) the same thing. When combining correlations across physically distinct elements (different crystal structures, bonding types, electronic configurations), this assumption is violated [^27^].
**Source:** Borenstein et al. (2009), *Introduction to Meta-Analysis*
**URL:** https://www.agropustaka.id/wp-content/uploads/2020/04/agropustaka.id_buku_Introduction-to-Meta-Analysis.pdf
**Date:** 2009
**Excerpt:** "Three major considerations should drive the choice of an effect size index. The first is that the effect sizes from the different studies should be comparable to one another in the sense that they measure (at least approximately) the same thing."
**Context:** If the correlation between property X and property Y differs systematically across crystal structure types (BCC vs FCC), then combining them assumes a single "average" correlation that may not correspond to any physical reality.
**Confidence:** High

### Claim: When studies estimate genuinely different effects, the random-effects model estimates the mean of a distribution of effects. This mean may not be a meaningful parameter if the distribution is bimodal (e.g., one mode for BCC, one for FCC) [^28^].
**Source:** Cochrane Handbook Chapter 10
**URL:** https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-10
**Date:** 2024
**Excerpt:** "A random-effects model provides a result that may be viewed as an 'average intervention effect', where this average is explicitly defined according to an assumed distribution of effects across studies. Instead of assuming that the intervention effects are the same, we assume that they follow (usually) a normal distribution."
**Context:** The assumed normal distribution of true effects may be inappropriate if there are distinct subgroups (e.g., BCC vs FCC metals) with systematically different correlation structures.
**Confidence:** High

### Claim: Subgroup analysis or meta-regression is the recommended approach when heterogeneity is substantial (I² > 75%). Failing to explore sources of heterogeneity is one of the most common errors in meta-analysis [^29^].
**Source:** Research Gold
**URL:** https://researchgold.org/blog/heterogeneity-meta-analysis-i-squared-guide
**Date:** 2026
**Excerpt:** "Heterogeneity is not a problem to be eliminated, it is information to be explored. The studies in your meta-analysis produced different results for reasons that may be clinically important. Understanding why results disagree is often more valuable than the pooled estimate itself."
**Context:** With I² = 98.6%, the authors should strongly consider subgroup analysis (e.g., by crystal structure type, by row of the periodic table) rather than relying solely on the overall pooled estimate.
**Confidence:** High

### Claim: The random-effects model gives relatively more weight to smaller studies than fixed-effect. If smaller studies are systematically different (e.g., studying exotic elements with different physics), this can bias the pooled estimate [^30^].
**Source:** Cochrane Handbook
**URL:** https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-10
**Date:** 2024
**Excerpt:** "In the presence of heterogeneity, a random-effects analysis gives relatively more weight to smaller studies and relatively less weight to larger studies. If there is additionally some funnel plot asymmetry... then this will push the results of the random-effects analysis towards the findings in the smaller studies."
**Context:** In materials science, studies of rare or exotic elements may have smaller sample sizes but also different underlying physics, creating systematic differences.
**Confidence:** High

---

## 8. Permutation Testing for Correlations — Why Is ρ = 0 an Inappropriate Null?

### Claim: The fundamental requirement for a valid permutation test is exchangeability — the joint distribution must remain unchanged under permutation when the null hypothesis is true. When data have inherent structure (correlation, clustering, pairing), this assumption is violated [^31^].
**Source:** Winkler et al. / "The Exchangeability Assumption for Permutation Tests"
**URL:** https://arxiv.org/html/2406.07756v2
**Date:** 2025
**Excerpt:** "Data are exchangeable under the null hypothesis if the joint distribution from which the data came is the same before a permutation as after a permutation when the null hypothesis is true."
**Context:** For correlation tests, if the data have any internal structure (e.g., familial relationships, repeated measures, or inherent ordering), simple permutation breaks this structure and creates an invalid null distribution.
**Confidence:** High

### Claim: Permuting correlated data breaks the dependence structure, leading to a null distribution that is too dispersed and p-values that are anti-conservative (too many false positives) [^32^].
**Source:** Abney (2015), "Permutation Testing in the Presence of Polygenic Variation"
**URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC4634896/
**Date:** 2015
**Excerpt:** "The fundamental challenge with performing a permutation test is ensuring exchangeability in the permuted quantities... In a genetic association test, it is generally not possible to do an exact permutation test when the trait under study has a polygenic component."
**Context:** The covariance structure of the data must be preserved under permutation. If permutations destroy the covariance structure, the resulting test is invalid.
**Confidence:** High

### Claim: Two variables can be highly dependent but have zero correlation (e.g., Y = X² with symmetric X). Testing ρ = 0 tests only for linear association, not for independence. Permutation tests of correlation are specifically testing independence, not just zero correlation [^33^].
**Source:** UW Lecture Notes — Permutation, Rank Correlation, and Dependence Test
**URL:** https://faculty.washington.edu/yenchic/18W_425/Lec3_permutation.pdf
**Date:** Course material
**Excerpt:** "The two variables can be highly dependent but has 0 correlation. The following is one example: (X, Y) = (-3,9), (-2,4), (-1,1), (0,0), (1,1), (2,4), (3,9). In fact, they are dependent because they are from Y = X². But if you compute their correlation coefficient, you will obtain rXY = 0!"
**Context:** If the scientific question concerns any form of association (not just linear), then testing ρ = 0 is too narrow. A permutation test with an appropriate statistic tests the broader null of independence.
**Confidence:** High

### Claim: When the null hypothesis of ρ = 0 is tested against structured data where some correlation is expected due to physical constraints (e.g., materials properties that must be related by thermodynamic constraints), the null is misspecified because the true correlation under the null may not be zero [^34^].
**Source:** Synthesized from multiple sources on exchangeability
**URL:** Various
**Date:** 2025 analysis
**Excerpt:** (Derived reasoning) If physical constraints ensure that property X and property Y are positively related (e.g., both depend on atomic bonding strength), then the null of ρ = 0 is testing against an impossible scenario. The permutation test must respect the physical structure of the data.
**Context:** In materials science, many properties are physically constrained to be correlated (e.g., bulk modulus and shear modulus are both measures of stiffness). A null of ρ = 0 ignores these structural relationships.
**Confidence:** Medium (synthesis from general principles)

### Claim: The Freedman-Lane method (permuting residuals under the reduced model) provides accurate false positive control in the presence of nuisance variables and is robust to outliers, but requires careful specification of what to permute [^35^].
**Source:** OHBM Brain Mapping Blog — Permutation Testing Overview
**URL:** https://www.ohbmbrainmappingblog.com/blog/a-brief-overview-of-permutation-testing-with-examples
**Date:** 2018
**Excerpt:** "It is crucial that what is permuted is what would render the subjects different were the alternative hypothesis true. It is not relevant to permute aspects of the dataset that would not be affected should the null hypothesis be false."
**Context:** When testing a correlation between two material properties, one should not permute in ways that break physically necessary relationships (e.g., crystal structure constraints).
**Confidence:** High

---

## Summary of Key Methodological Concerns

### Extreme Heterogeneity (I² = 98.6%)
- I² = 98.6% indicates that the 15 elements are estimating fundamentally different correlation structures
- The fixed-effect estimate (r = 0.60) and random-effects estimate (r = 0.69) differ, suggesting systematic differences between study sizes
- The CI [0.41, 0.85] spans from moderate to very strong correlations, making it consistent with multiple classification thresholds
- **Recommendation:** Subgroup analysis by crystal structure type, period, or bonding character should be conducted rather than relying solely on the overall pooled estimate

### Random-Effects Model Limitations
- The random-effects model assumes a normal distribution of true effects across studies — this may be invalid if there are distinct physical regimes (BCC vs FCC)
- With only 15 "studies" (elements), the estimate of τ² is highly uncertain
- The prediction interval for a future element's correlation would be extremely wide
- **Recommendation:** Report both the CI and prediction interval; consider Bayesian meta-analysis with informative priors

### Fisher z-Transformation Appropriateness
- The transformation is standard practice and well-justified for correlations
- However, the back-transformation introduces slight bias for extreme values
- **Recommendation:** The use of Fisher z is methodologically sound; results should always be reported on the r scale after back-transformation

### Meta-Analysis in Materials Science
- True statistical meta-analysis (combining correlation coefficients across studies) is novel in materials science
- Precedents exist for weighted averaging (Voigt-Reuss-Hill) but not for combining statistical correlations
- **Recommendation:** The cross-disciplinary methodology transfer is innovative but requires careful justification of the exchangeability assumption

### Permutation Testing
- Simple permutation of correlation data with ρ = 0 as null ignores structural constraints
- Physical relationships may ensure non-zero correlations even under the null of "no special relationship"
- **Recommendation:** Permutation tests should account for structural constraints; the null hypothesis should be carefully matched to the physical question

---

## References

[^1^]: Hedges & Olkin (1985), *Statistical Methods for Meta-Analysis*, Ch. 15
[^2^]: Wikipedia, "Fisher transformation" (verified against primary sources)
[^3^]: Richardson (2004), "Seeing the Fisher Z-transformation"
[^4^]: Fisher (1915, 1921), original papers introducing the transformation
[^5^]: StatsDirect, "Pearson Correlation Meta-analysis"
[^6^]: Field (2005), *Psychological Methods*, Vol. 10, No. 4
[^7^]: Borenstein et al. (2009), *Introduction to Meta-Analysis*, Chapter 12
[^8^]: Langan et al. (2019), *Research Synthesis Methods*, doi:10.1002/jrsm.1316
[^9^]: Preprints.org (2025), "Understanding Heterogeneity in Meta-Analysis"
[^10^]: Veroniki et al. (2016), overview paper on τ² estimators
[^11^]: Higgins & Thompson (2002), *Statistics in Medicine*, 21:1539-1558
[^12^]: Cochrane Handbook v6.5, Chapter 10.10.2
[^13^]: Research Gold, "Heterogeneity in Meta-Analysis" (2026)
[^14^]: Research Gold, citing Borenstein et al. (2009)
[^15^]: Hemming et al. (2020), *BMC Medical Research Methodology*
[^16^]: Cochrane Handbook v6.5, Chapter 10.10.4.1
[^17^]: Borenstein, "Common mistakes in meta-analysis"
[^18^]: MSE Student, "What Is the Difference Between FCC and BCC?" (2020)
[^19^]: Higgins et al. (2009), *JRSS Series A*, 172:137-159
[^20^]: NIH/PMC, "How to Interpret a Meta-Analysis Forest Plot"
[^21^]: Research Gold, "Forest Plot Interpretation Guide" (2026)
[^22^]: Research Gold, Forest Plot Guide
[^23^]: MTEX Toolbox, "Tensor Averages" documentation
[^24^]: Huang et al. (2023), *Materials*, 16:5977
[^25^]: Author's search results (no direct precedents found)
[^26^]: Nature Communications (2025), doi:10.1038/s43246-025-00754-x
[^27^]: Borenstein et al. (2009), *Introduction to Meta-Analysis*, p. 3
[^28^]: Cochrane Handbook v6.5, Chapter 10.10.4
[^29^]: Research Gold, "Heterogeneity in Meta-Analysis"
[^30^]: Cochrane Handbook v6.5, Chapter 10.10.4.1
[^31^]: Winkler et al. (2025), arXiv:2406.07756v2
[^32^]: Abney (2015), *Genetic Epidemiology*, PMC4634896
[^33^]: UW Lecture Notes, "Permutation, Rank Correlation, and Dependence Test"
[^34^]: Author's synthesis from sources
[^35^]: OHBM Blog (2018), "A Brief Overview of Permutation Testing"

---

*Document compiled: 2025*
*Total independent web searches conducted: 15+*
*Sources prioritized: Peer-reviewed journals, Cochrane Handbook, arXiv preprints, authoritative textbooks*
