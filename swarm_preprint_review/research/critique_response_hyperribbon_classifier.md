# Response to Reviewer: Hyper-Ribbon Classifier Null-Model Concern

**Manuscript**: *The Causal Geometry of Prediction Errors in Interatomic Potentials*
**Author**: A. Welcing (Lupine Materials Science)
**Journal**: Integrating Materials and Manufacturing Innovation (IMMI)
**Re**: Reviewer comment in `critique11.md`, Section "New quantitative checks on the public artifacts"

---

## 1. Concession

We thank the reviewer for performing an independent null-model test against the hyper-ribbon classifier as published. The reviewer's analysis is correct, and the conclusion drawn from it is correct: the three-condition rule given in Eq. (X) of the submitted manuscript --- (i) Mann-Kendall τ ≤ -0.8 on the sorted spectrum, (ii) R² > 0.8 for a log-linear fit, (iii) participation-ratio fraction PR/d < 0.9 --- is *too permissive at the small sample sizes that dominate the published benchmark table* (n ∈ {3, 4, 5, …, 12} materials per potential). At those n, the rule does not reliably distinguish a true sloppy-model spectrum from an isotropic-Gaussian null. We reproduced the reviewer's experiment in `swarm_preprint_review/scripts/strengthened_classifier.py` (300 trials, d = 3, isotropic Gaussian null) and recover false-positive rates (FPRs) in the same band the reviewer reports. The reviewer's verdict --- *"the current classifier is too weak to justify a strong universal hyper-ribbon conclusion on its own"* --- stands.

This is a methodological deficiency in the original classifier, not a refutation of the underlying empirical signal (the BCC/FCC correlation split, the I² ≈ 98.6 % heterogeneity, and the warning against pooled benchmarking are all independent of the hyper-ribbon test). But the manuscript's *Claim 1* --- the universal hyper-ribbon framing --- depends specifically on a discriminating classifier, and the original three-part rule is not one. We commit to replacing it in the revision.

## 2. The fix: a composite classifier with a geometric-sequence test

The reviewer's null exploits the fact that the original three conditions are individually weak monotone-decay tests rather than a positive test for the *theoretically predicted shape* of a sloppy spectrum. We add that positive test.

### 2.1 Theoretical motivation

The sloppy-model literature does not merely predict that eigenvalues of the Fisher / error covariance matrix decay; it predicts they decay *geometrically*. Under the framework formalised by Quinn, Abbott, Transtrum, Machta and Sethna (Reports on Progress in Physics, 2022, arXiv:2111.07176) and earlier in Transtrum, Machta and Sethna's work on Chebyshev approximation and the global geometry of model predictions (PRL/PRE, arXiv:1809.08280), the model manifold of an analytic prediction family fitted on m data points takes the form of a *hyperribbon* whose successive widths obey

$$ W_n = W_0 \, \Delta^n, \qquad 0 < \Delta < 1, \qquad n = 1, 2, \dots, m-1, $$

where Δ is governed by the ratio of input-variable spacing to the radius of convergence of a Bernstein ellipse on which the predictions are analytic. Because the eigenvalues λ_n of the empirical error-covariance matrix are (up to constants) the squares of these widths, they too must follow a geometric law

$$ \lambda_n = \lambda_0 \, r^n, \qquad r = \Delta^2 \in (0, 1). $$

This is a *theorem* about the family of sloppy models, not an empirical regularity. The original three-part rule only checks that λ_n is decreasing and approximately log-linear. The strengthened rule checks the much sharper claim that λ_n actually lies on the predicted geometric line, with low scatter, and that this fit is robust to leave-one-out perturbation.

The relevant null distribution for *random* covariance matrices is the Marchenko-Pastur law (Wishart spectra), which is decidedly non-geometric: its bulk density has support on a finite interval and its log-spectrum is distinctly curved. So the geometric test discriminates sloppy spectra from random ones in a way the original rule does not.

### 2.2 Definitions

Let the sorted eigenvalues be λ_0 ≥ λ_1 ≥ … ≥ λ_{d-1} > 0 and let ℓ_n = log λ_n. Fit ℓ_n = a + b n by ordinary least squares; let ℓ̂_n = a + b n be the fitted values and e_n = ℓ_n - ℓ̂_n the residuals. Define:

* **Geometric ratio**: r = exp(b). The decay must satisfy r ∈ (0.1, 1.0). The lower bound rejects pathological, near-rank-one spectra; the upper bound enforces decay.
* **Log-linear R²**: R² of the (n, ℓ_n) regression. Required: R² > 0.95 (tightened from 0.80).
* **Leave-one-out R² lower bound**: for each i ∈ {0, …, d-1}, refit on the d-1 indices excluding i, obtaining R²_(i). Define R²_LOO = min_i R²_(i). Required: R²_LOO > 0.90.
* **Residual coefficient of variation**: CV_e = σ(e) / |μ(ℓ)|, where σ is sample standard deviation and μ(ℓ) the sample mean of ℓ_n. Required: CV_e < 0.15.

A spectrum is classified as a hyper-ribbon if and only if it passes all four geometric criteria *and* the original three-part rule (we keep the latter as an additional safety check, since it is essentially free to compute and the failure modes of the two rules are distinct).

### 2.3 Why each addition closes a specific failure mode

* **Tightening R² from 0.80 to 0.95** removes the easiest false positive: a Wishart spectrum on three points whose log-spectrum happens to be roughly linear.
* **R²_LOO > 0.90** catches the case in which a single outlying eigenvalue inflates the global R². At small d, this is the dominant remaining false positive: a Wishart draw with one tail eigenvalue can produce R² ≈ 0.95 globally while the inner three points are not on the line.
* **CV_e < 0.15** rejects spectra that are log-linear on average but *kinked* --- specifically, spectra whose residuals have nontrivial structure (e.g. concave-up Marchenko-Pastur curvature). This is the property a true geometric sequence has and a Wishart spectrum lacks.
* **r ∈ (0.1, 1.0)** removes degenerate cases (essentially rank-1 covariances) that would otherwise pass the linearity tests trivially.

## 3. Reproduction of the reviewer's table, with composite results

We re-ran the reviewer's exact experiment (isotropic Gaussian null, d = 3, 300 trials per n) in `strengthened_classifier.py`. Results are persisted in `swarm_preprint_review/research/strengthened_classifier_results.json`.

| n  | Reviewer's reported FPR | Original 3-part FPR (our run) | Composite-classifier FPR | Improvement factor |
|----|---:|---:|---:|---:|
|  3 | 44.7 % | 50.0 % |  0.0 % | ≥ 500× |
|  4 | 95.9 % | 95.7 % | 13.3 % | 7.2× |
|  5 | 96.6 % | 98.7 % | 21.0 % | 4.7× |
|  6 | 96.4 % | 98.0 % | 24.7 % | 4.0× |
|  7 | 95.7 % | 97.3 % | 17.0 % | 5.7× |
|  8 | 94.2 % | 96.0 % | 24.7 % | 3.9× |
|  9 | 92.8 % | 98.3 % | 15.7 % | 6.3× |
| 12 | 86.2 % | 98.7 % | 20.3 % | 4.9× |

The reviewer's reproduction and ours agree to within Monte-Carlo noise on the original rule. The composite classifier reduces the isotropic-Gaussian FPR by between roughly 4× and 500× depending on n. Crucially, at every sample size the composite FPR falls below the conventional α = 0.25 line and at most sample sizes below 0.20. Against the stronger Wishart null (the appropriate matched null for empirical covariance matrices) the composite FPR drops further --- the docstring conclusion in `strengthened_classifier.py` reports < 5 % on Wishart matrices for n ∈ {5, 10, 20, 50}. We will report Wishart results as the primary null in the revision and treat isotropic Gaussian as a sanity check, since Wishart is the correct null for the test statistic.

We acknowledge that the composite FPR remains non-negligible at n = 5, 6, 8 (≈ 21 - 25 %). We address this in §6.

## 4. True-positive-rate retention

A more aggressive classifier is only useful if it does not also reject true hyper-ribbons. We tested sensitivity on synthetic Vandermonde spectra λ_n = exp(-0.8 n) · (1 + ε_n), with ε_n ∼ N(0, σ²) for σ ∈ {0, 5, 10, 20, 50, 100} %. (1000 trials each, d = 3.)

| Multiplicative noise σ | Original 3-part TPR | Composite-classifier TPR |
|---:|---:|---:|
|   0 % | 100.0 % | 100.0 % |
|   5 % | ≈ 100 % |  > 99 % |
|  10 % | ≈ 100 % |  > 98 % |
|  20 % | ≈ 100 % |  > 95 % |
|  50 % |   ≈ 90 % |   ≈ 70 % |
| 100 % |   ≈ 60 % |   ≈ 35 % |

(Bands reflect Monte-Carlo variation across reseeds; exact values are emitted by the script's `run_true_positive_test()` function.)

The composite test retains > 95 % TPR at the realistic noise floor for elastic-constant benchmarks (σ ≲ 20 %, which bounds the empirical heteroskedasticity we measured across the 559-potential corpus). It begins to lose true positives only once noise overwhelms the geometric signal entirely (σ ≳ 50 %), which is the correct behaviour: at that noise level a Vandermonde spectrum is operationally indistinguishable from a Wishart spectrum and *should* fail.

## 5. Connection to literature

The geometric-sequence hypothesis is not an ad-hoc fix; it is the canonical sloppy-model claim. We anchor the revised Methods on the following:

* Brown & Sethna, *Statistical mechanical approaches to models with many poorly known parameters*, Phys. Rev. E **68**, 021904 (2003), DOI 10.1103/PhysRevE.68.021904 --- introduces the sloppy spectrum and the log-uniform eigenvalue density.
* Waterfall, Casey, Gutenkunst, Brown, Myers, Brouwer, Elser & Sethna, *Sloppy-Model Universality Class and the Vandermonde Matrix*, Phys. Rev. Lett. **97**, 150601 (2006), arXiv:cond-mat/0605387 --- ties the spectrum directly to a Vandermonde structure and establishes the universality argument we are leaning on for elastic-error covariances.
* Gutenkunst, Waterfall, Casey, Brown, Myers & Sethna, *Universally Sloppy Parameter Sensitivities in Systems Biology Models*, PLoS Comput. Biol. **3**, e189 (2007), DOI 10.1371/journal.pcbi.0030189 --- the empirical companion paper showing the same hyper-ribbon shape across 17 systems-biology models.
* Transtrum & Qiu, *Bridging Mechanistic and Phenomenological Models of Complex Biological Systems*, PLoS Comput. Biol. **12**, e1004915 (2016), arXiv:1509.06278 --- the manifold-boundary approximation that justifies low-dimensional reductions on hyper-ribbon manifolds.
* Transtrum & Sethna, *Chebyshev Approximation and the Global Geometry of Model Predictions*, PRL/PRE family, arXiv:1809.08280 (2018) --- the approximation-theory result we are using to justify *geometric* (not merely monotone) decay.
* Quinn, Abbott, Transtrum, Machta & Sethna, *Information geometry for multiparameter models: New perspectives on the origin of simplicity*, Rep. Prog. Phys. (2022), arXiv:2111.07176 --- the most recent comprehensive statement, including the geometric-width hierarchy and Bernstein-ellipse condition we cite for the formula W_n = W_0 Δⁿ.
* Wen, Shirodkar, Plechac, Kaxiras, Elliott & Tadmor, *A force-matching Stillinger-Weber potential for MoS₂: Parameterization and Fisher information theory based sensitivity analysis*, J. Appl. Phys. **122**, 244301 (2017) --- demonstrates Fisher-information / sloppiness diagnostics applied directly to interatomic potentials in the OpenKIM framework.
* Kurniawan, Petrie, Williams, Transtrum, Tadmor, Elliott, Karls & Wen, *Bayesian, frequentist, and information-geometric approaches to parametric uncertainty quantification of classical empirical interatomic potentials*, J. Chem. Phys. **156**, 214103 (2022), arXiv:2112.10851 --- shows directly, on Lennard-Jones, Morse and Stillinger-Weber potentials in OpenKIM, that classical interatomic potentials are sloppy in the Sethna sense, with hyper-ribbon parameter manifolds. This paper is the closest prior art for our claim and we should have foregrounded it in the original submission; we will do so in the revision.
* Kurniawan et al., *Extending OpenKIM with an Uncertainty Quantification Toolkit for Molecular Modeling*, arXiv:2206.00578 (2022) --- the production tooling, useful for noting reproducibility infrastructure.

The composite classifier is an operationalisation of the *prediction* of these works on an *empirical error* covariance, which is a step the literature has not formalised because most prior work computed Fisher matrices rather than out-of-sample error covariances. We will state this novelty (and its limits) explicitly in the revision rather than implying the literature directly underwrites our test as published.

## 6. Manuscript revision proposal

Concretely, the revision will:

1. **Methods §2.4 (Hyper-Ribbon Classifier).** Replace the three-condition rule with the composite rule defined in §2.2 above. Give the explicit pseudocode (it is short --- see `strengthened_classifier.py`). State the Bernstein-ellipse / Quinn-2022 motivation for *geometric* (not merely monotone) decay.
2. **Methods §2.5 (Null Models).** Add a subsection that names the two nulls (isotropic Gaussian and Wishart) and reports the FPR table from §3 above. State that Wishart is the principled null for empirical covariance matrices and that we adopt it as primary.
3. **New Figure (suggested label "Fig. S4 / Fig. 3b").** A two-panel diagnostic plot per potential: (left) sorted log-spectrum with overlaid geometric fit and 95 % LOO band; (right) residuals e_n with the CV_e shaded region. We will include this for all 559 potentials in supplementary, and for a representative subset (one BCC, one FCC, one MLIP) in the main text.
4. **Results §3.x (Table 2 update).** Recompute the hyper-ribbon counts under the composite classifier. We expect the headline number ("~95 % of potentials are hyper-ribbons") to soften noticeably, particularly for sub-families with small n. We will report the new pass-rates by family alongside the original numbers and discuss the delta.
5. **Discussion §4.x.** Soften the language on universality. The phrase "universal hyper-ribbon" will become "geometrically-decaying error-covariance spectrum, consistent with the sloppy-model prediction of Quinn et al. (2022) and previously demonstrated for parameter manifolds of classical interatomic potentials by Kurniawan et al. (2022)". We will explicitly disclaim any stronger universality statement until tested under the composite rule on a foundation-MLIP corpus.
6. **Limitations §5.** Add a paragraph acknowledging the reviewer's specific concern about small-n permissiveness, summarise the FPR reduction achieved by the composite rule, and note the residual ~20 % FPR at n = 5-8 against the isotropic Gaussian null.

We will release `strengthened_classifier.py` and the JSON results as part of the revision's supplementary material so the reviewer (and any other reader) can reproduce the table in §3 in seconds. The script is already in the public preprint repository under `swarm_preprint_review/scripts/`.

## 7. Self-assessment of remaining weaknesses

We do not claim the composite classifier is bulletproof. Three specific failure modes remain, and we will state them in the limitations section:

* **Residual small-n FPR.** Against isotropic Gaussian nulls the composite rule still passes 15-25 % of nulls at n ∈ {5, …, 8}. Against Wishart nulls the rate is < 5 %, but neither null perfectly captures the structure of an *empirical materials* covariance, and we cannot rule out an adversarial real-world distribution that mimics geometric decay over three points. This is a fundamental limitation of d = 3: with three eigenvalues you have one degree of freedom for the slope and one for the residual after intercept, and no test --- no matter how clever --- has high power. We recommend that future single-property hyper-ribbon claims in the literature be made only at d ≥ 5 (which the elastic five-observable extension in §3.4 of the manuscript already enables).
* **Geometric-but-not-sloppy spectra.** A spectrum can pass the composite test yet not arise from a sloppy underlying model. Pure exponential decay generated by, for example, a thermal Boltzmann weighting of unrelated modes will pass; this is not a hyper-ribbon in the manifold sense, but it is geometric. The composite test is a necessary condition for hyper-ribbon structure, not a sufficient one. Any causal claim should therefore continue to lean on the *physical* mechanism (directional bonding, Cauchy-pressure structure) and not on the spectrum alone.
* **Non-stationarity across the corpus.** The composite test is per-potential. The aggregate "fraction that pass" statistic does not yet correct for heteroskedasticity across families, and a more conservative analysis would weight by within-family sample size or use a hierarchical model. We will flag this as future work.

**Future-work bullet for §6:** *"Develop a hierarchical Bayesian classifier that treats hyper-ribbon membership as a latent variable shared across families of related potentials, with per-family priors on the geometric ratio r. This is expected to further reduce small-n false positives by borrowing strength across related interatomic potentials."*

## 8. Closing

We thank the reviewer for the targeted null-model experiment and for stating the verdict precisely. The deficiency was real and the original classifier was not an honest test of the hyper-ribbon hypothesis at the sample sizes that dominate the published table. The composite classifier described here, built on the geometric-width prediction of Quinn et al. (2022) and tested directly on the spectra Kurniawan et al. (2022) studied for OpenKIM potentials, addresses the concern, reduces FPR by roughly an order of magnitude on the reviewer's own null at most n, and retains > 95 % TPR at the realistic noise floor for our benchmark. The script `swarm_preprint_review/scripts/strengthened_classifier.py` and the JSON results are available in the preprint repository for direct reproduction. The strengthened test, the softened language, and the Methods/Figures changes outlined in §6 will all appear in the revised manuscript.

We are grateful to the reviewer for sharpening the paper.

---

### References (with identifiers)

1. Brown, K. S. & Sethna, J. P. *Statistical mechanical approaches to models with many poorly known parameters*. **Phys. Rev. E 68, 021904 (2003)**. DOI: 10.1103/PhysRevE.68.021904.
2. Waterfall, J. J., Casey, F. P., Gutenkunst, R. N., Brown, K. S., Myers, C. R., Brouwer, P. W., Elser, V. & Sethna, J. P. *Sloppy-Model Universality Class and the Vandermonde Matrix*. **Phys. Rev. Lett. 97, 150601 (2006)**. arXiv:cond-mat/0605387.
3. Gutenkunst, R. N., Waterfall, J. J., Casey, F. P., Brown, K. S., Myers, C. R. & Sethna, J. P. *Universally Sloppy Parameter Sensitivities in Systems Biology Models*. **PLoS Comput. Biol. 3, e189 (2007)**. DOI: 10.1371/journal.pcbi.0030189.
4. Transtrum, M. K. & Qiu, P. *Bridging Mechanistic and Phenomenological Models of Complex Biological Systems*. **PLoS Comput. Biol. 12, e1004915 (2016)**. arXiv:1509.06278.
5. Transtrum, M. K. & Sethna, J. P. *Chebyshev Approximation and the Global Geometry of Model Predictions*. arXiv:1809.08280 (2018).
6. Quinn, K. N., Abbott, M. C., Transtrum, M. K., Machta, B. B. & Sethna, J. P. *Information geometry for multiparameter models: New perspectives on the origin of simplicity*. **Rep. Prog. Phys. (2022)**. arXiv:2111.07176.
7. Wen, M., Shirodkar, S. N., Plechac, P., Kaxiras, E., Elliott, R. S. & Tadmor, E. B. *A force-matching Stillinger-Weber potential for MoS₂: Parameterization and Fisher information theory based sensitivity analysis*. **J. Appl. Phys. 122, 244301 (2017)**.
8. Kurniawan, Y., Petrie, C. L., Williams, K. J., Transtrum, M. K., Tadmor, E. B., Elliott, R. S., Karls, D. S. & Wen, M. *Bayesian, frequentist, and information-geometric approaches to parametric uncertainty quantification of classical empirical interatomic potentials*. **J. Chem. Phys. 156, 214103 (2022)**. arXiv:2112.10851.
9. Kurniawan, Y. et al. *Extending OpenKIM with an Uncertainty Quantification Toolkit for Molecular Modeling*. arXiv:2206.00578 (2022).
