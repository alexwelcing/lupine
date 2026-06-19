Literature review: error structure in interatomic

potential predictions

Classical force fields for metals exhibit structured, low-dimensional prediction errors that

can be understood through the convergence of three distinct intellectual traditions: sloppy

model theory from statistical physics, Simpson’s paradox from meta-analytic methodology,

and systematic interatomic potential benchmarking. This review assembles the key

references across these areas to support a paper showing that FCC elastic constant errors

(C11, C12, C44) occupy a manifold with effective dimensionality ~1.66/3, while pooled BCC

data produce a spurious correlation inversion attributable to Simpson’s paradox.

Area 1: Sloppy model theory and the geometry of poorly

constrained models

Foundational framework

The sloppy model framework emerged from computational biology and statistical physics,

establishing that multiparameter models generically have parameter sensitivities spanning

many orders of magnitude. Brown and Sethna (2003) introduced the concept, showing

that biochemical signaling models with ~48 parameters have Hessian eigenvalue spectra

spanning many decades, with only a few “stiff” parameter combinations controlling

predictions and many “sloppy” directions allowing parameters to vary freely (Brown KS,

Sethna JP, “Statistical mechanical approaches to models with many poorly known

parameters,” Physical Review E 68, 021904, 2003). PubMed

Waterfall et al. (2006) demonstrated that sloppiness constitutes a universality class by

connecting the characteristic eigenvalue spectrum to Vandermonde matrix ensembles. The

logarithms of eigenvalues are roughly uniformly spaced — a signature now recognized

across physics, biology, and engineering. PubMed American Physical Society Crucially, this

paper explicitly noted that sloppiness had also been demonstrated “in three multiparameter

interatomic potentials fit to electronic structure” Cornell (Waterfall JJ, Casey FP,

Gutenkunst RN, Brown KS, Myers CR, Brouwer PW, Elser V, Sethna JP, “Sloppy-model

universality class and the Vandermonde matrix,” Physical Review Letters 97, 150601, 2006).

Gutenkunst et al. (2007) tested 17 systems biology models and found that every one

exhibited sloppy parameter sensitivities, cementing the universality claim. They argued that

collective fits yield well-constrained predictions even when individual parameters remain

poorly determined, and that direct parameter measurements must be “formidably precise

and complete” to be more useful than collective fitting PubMed (Gutenkunst RN, Waterfall

JJ, Casey FP, Brown KS, Myers CR, Sethna JP, “Universally sloppy parameter sensitivities in

systems biology models,” PLoS Computational Biology 3(10), e189, 2007).

Geometric and information-theoretic development

The geometric interpretation of sloppiness matured through a series of papers by

Transtrum, Machta, and Sethna. Transtrum et al. (2010) introduced the model manifold

perspective: the set of all possible predictions as parameters vary forms a “hyper-ribbon” in

data space with a geometric hierarchy of widths. This narrowness explains both why fitting

is computationally difficult and why predictions are low-dimensional arXiv (Transtrum MK,

Machta BB, Sethna JP, “Why are nonlinear fits to data so challenging?” Physical Review

Letters 104, 060201, 2010). Transtrum et al. (2011) provided the comprehensive

geometric treatment, showing that model manifolds universally exhibit a geometric series of

widths, extrinsic curvatures, and parameter-effect curvatures American Physical Society

(Transtrum MK, Machta BB, Sethna JP, “Geometry of nonlinear least squares with

applications to sloppy models and optimization,” Physical Review E 83, 036701, 2011).

Machta et al. (2013) connected sloppiness to fundamental physics by showing that

parameter space compression underlies emergent theories. Using the Fisher Information

Matrix (FIM) as a Riemannian metric on parameter space, they demonstrated that the

emergence of effective theories — continuum limits, renormalization group fixed points —

corresponds to compression from many microscopic parameters to few macroscopic ones.

AIP Publishing PubMed Stiff FIM directions become emergent parameters; sloppy

directions correspond to irrelevant microscopic detail arXiv (Machta BB, Chachra R,

Transtrum MK, Sethna JP, “Parameter space compression underlies emergent theories and

predictive models,” Science 342(6158), 604–607, 2013). This framework directly implies

that the ~1.66 effective dimensions for elastic constant errors correspond to approximately

two emergent combinations of potential parameters dominating elastic response.

Transtrum et al. (2014) introduced the Manifold Boundary Approximation Method (MBAM)

for systematic model reduction by following geodesics to the manifold boundary, removing

sloppy parameter combinations while preserving stiff predictions PubMed (Transtrum MK,

Qiu P, “Model reduction by manifold boundaries,” Physical Review Letters 113, 098701,

2014). The comprehensive review by Transtrum et al. (2015) synthesized the full program,

including FIM-based analysis, hyperribbon structure, MBAM, and connections to emergent

theories across physics and biology AIP Publishing ADS (Transtrum MK, Machta BB, Brown

KS, Daniels BC, Myers CR, Sethna JP, “Perspective: Sloppiness and emergent theories in

physics, biology, and beyond,” Journal of Chemical Physics 143(1), 010901, 2015).

Quinn et al. (2019) provided the first rigorous mathematical explanation for sloppiness,

using Chebyshev approximation theory to derive universal bounds on model manifold widths

as a consequence of model smoothness alone American Physical Society (Quinn KN, Wilber H,

Townsend A, Sethna JP, “Chebyshev approximation and the global geometry of model

predictions,” Physical Review Letters 122, 158302, 2019). The most recent comprehensive

review is Quinn et al. (2023), covering model manifold structure, MBAM, information

topology, optimal Bayesian priors, and visualization via intensive PCA PubMed Central

(Quinn KN, Abbott MC, Transtrum MK, Machta BB, Sethna JP, “Information geometry for

multiparameter models: New perspectives on the origin of simplicity,” Reports on Progress

in Physics 86, 035901, 2023).

Applications to interatomic potentials

The seminal application of sloppy model theory to force fields is Frederiksen et al. (2004),

which developed a Bayesian ensemble approach for estimating prediction errors from

interatomic potentials. Working with EAM-type potentials for molybdenum fitted to DFT

force databases, they showed that the potentials exhibit sloppy eigenvalue spectra identical

in character to biological models, and that Bayesian error bars on elastic constants,

gamma-surface energies, structural energies, and dislocation properties provided realistic

uncertainty estimates. PubMed Parameters varied wildly across the ensemble while

predictions remained constrained Cornell — the hallmark of low-dimensional prediction

structure PLOS (Frederiksen SL, Jacobsen KW, Brown KS, Sethna JP, “Bayesian ensemble

approach to error estimation of interatomic potentials,” Physical Review Letters 93, 165501,

2004).

Wen et al. (2017) applied Fisher information theory to a Stillinger-Weber potential for MoS₂,

computing the FIM eigenvalue spectrum and verifying parameter identifiability. They used

the geodesic Levenberg-Marquardt algorithm for fitting and demonstrated that the FIM

analysis provides uncertainty bounds for elastic constants and other predicted properties

(Wen M, Li J, Brommer P, Elliott RS, Sethna JP, Tadmor EB, “A force-matching Stillinger-

Weber potential for MoS₂: Parameterization and Fisher information theory based sensitivity

analysis,” Journal of Applied Physics 122, 244301, 2017).

Kurniawan et al. (2022) provided the most thorough study of parametric uncertainty in

classical potentials using the OpenKIM framework. Working with Lennard-Jones, Morse, and

Stillinger-Weber potentials, they confirmed that interatomic potentials are sloppy models

arXiv with bounded manifolds exhibiting a hierarchy of widths DNTB and low effective

dimensionality. arXiv Many parameter combinations are unidentifiable, ResearchGate yet

predictions remain constrained (Kurniawan Y, Petrie CL, Williams KJ, Transtrum MK, Tadmor

EB, Elliott RS, Karls DS, Wen M, “Bayesian, frequentist, and information geometric

approaches to parametric uncertainty quantification of classical empirical interatomic

potentials,” Journal of Chemical Physics 156(21), 214103, 2022).

Mortensen et al. (2005) extended the Bayesian sloppy-model framework to density

functional theory itself, showing that DFT exchange-correlation functionals are also sloppy

— sloppiness pervades the entire hierarchy of computational materials science (Mortensen

JJ, Kaasbjerg K, Frederiksen SL, Nørskov JK, Sethna JP, Jacobsen KW, “Bayesian error

estimation in density-functional theory,” Physical Review Letters 95, 216401, 2005).

Neural networks and modern potentials

Mao et al. (2024) showed that deep neural networks with widely different architectures,

sizes, optimizers, and regularization all traverse the same low-dimensional manifold

during training, with hyper-ribbon structure characteristic of sloppy models. ADS This

suggests that neural network potentials (NequIP, MACE, etc.) should also produce low-

dimensional elastic constant error patterns regardless of architecture (Mao J, Griniasty I,

Teoh HK, Ramesh R, Yang R, Transtrum MK, Sethna JP, Chaudhari P, “The training process

of many deep networks explores the same low-dimensional manifold,” Proceedings of the

National Academy of Sciences 121(12), e2310002121, 2024). An analytical treatment

followed in Mao et al. (2026), deriving conditions for hyper-ribbon emergence in linear

models and characterizing phase boundaries (Mao J, Griniasty I, Sun Y, Transtrum MK,

Sethna JP, Chaudhari P, “Analytical characterization of sloppiness in neural networks:

Insights from linear models,” Physical Review E 113, 015306, 2026).

Area 2: Simpson’s paradox and meta-analytic methodology for

grouped correlations

Foundational references

Simpson (1951) demonstrated that collapsing two-way contingency tables can reverse

associations, establishing the foundational paradox Wiley Online Library (Simpson EH, “The

interpretation of interaction in contingency tables,” Journal of the Royal Statistical Society:

Series B 13(2), 238–241, 1951). Blyth (1972) formalized the paradox and connected it to

Savage’s sure-thing principle, Wikipedia providing the probabilistic framework (Blyth CR,

“On Simpson’s paradox and the sure-thing principle,” Journal of the American Statistical

Association 67(338), 364–366, 1972).

The most celebrated real-world demonstration is the Berkeley admissions case (Bickel et

al., 1975), where aggregate data showed apparent bias against women that reversed at the

department level Science ResearchGate — women applied disproportionately to

competitive departments, a confounding structure directly analogous to pooling elastic

constant errors across elements with different physical properties (Bickel PJ, Hammel EA,

O’Connell JW, “Sex bias in graduate admissions: Data from Berkeley,” Science 187(4175),

398–404, 1975).

Pearl (2014) argued that Simpson’s paradox can only be resolved through causal

reasoning, introducing the do-calculus and back-door criterion for determining whether

pooled or stratified analysis gives the correct inference. In the interatomic potential context,

element identity acts as a causal confounder through distinct physical properties — atomic

radius, electron configuration, bonding character — that independently influence both the

potential’s error structure and the target elastic constants (Pearl J, “Comment:

Understanding Simpson’s paradox,” The American Statistician 68(1), 8–13, 2014; also Pearl

J, Causality: Models, Reasoning, and Inference, 2nd ed., Cambridge University Press,

2009).

Robinson (1950) established the closely related ecological fallacy, showing that state-level

correlations between demographic variables can completely reverse from individual-level

correlations. Wikipedia The pooled interatomic potential error correlation across elements

is precisely this type of “ecological correlation” (Robinson WS, “Ecological correlations and

the behavior of individuals,” American Sociological Review 15(3), 351–357, 1950).

Correlation testing methodology

Jackson and Somers (1991) is the key methodological reference for handling spurious

correlations in grouped data. They demonstrated that ratios and indices sharing common

components generate correlations even from random data, and advocated randomization

(permutation) tests that generate a null distribution accounting for mathematical coupling.

Their central recommendation is that the appropriate null correlation is frequently non-zero,

and standard tests against r = 0 are inappropriate when variables share structural

components PubMed Springer (Jackson DA, Somers KM, “The spectre of ‘spurious’

correlations,” Oecologia 86(1), 147–151, 1991. DOI: 10.1007/BF00317404).

Archie (1981) established the mathematical coupling problem: when derived variables

share components (e.g., X/Z versus Y/Z), significant correlations arise even from

uncorrelated raw data. This is the foundational reference for the non-zero null hypothesis

issue — physical constraints among elastic constants (e.g., the Cauchy relation, stability

requirements) create inherent baseline correlations that must not be attributed to

systematic potential errors (Archie JP, “Mathematic coupling of data: A common source of

error,” Annals of Surgery 193(3), 296–303, 1981).

Kievit et al. (2013) provided a practical detection guide for Simpson’s paradox in

continuous bivariate data with categorical grouping variables, including an R toolbox and

statistical markers for the paradox. Frontiers Their methods are directly applicable to

elastic constant error data grouped by element (Kievit RA, Frankenhuis WE, Waldorp LJ,

Borsboom D, “Simpson’s paradox in psychological science: A practical guide,” Frontiers in

Psychology 4, Article 513, 2013).

Random-effects meta-analysis for correlations

The standard methodology for properly combining correlations across heterogeneous

groups uses Fisher’s z-transformation within a random-effects framework. Hedges and

Olkin (1985) established the foundational approach: transform each group-specific

correlation using z = arctanh(r), combine via inverse-variance weighting, and back-

transform (Hedges LV, Olkin I, Statistical Methods for Meta-Analysis, Academic Press,

1985). Borenstein et al. (2009) is the standard textbook reference, explaining fixed versus

random-effects models, heterogeneity assessment (Q-statistic, I²

, τ²), and interpretation

(Borenstein M, Hedges LV, Higgins JPT, Rothstein HR, Introduction to Meta-Analysis, Wiley,

2009). Borenstein et al. (2010) clarified when random-effects models are appropriate —

specifically when group-specific effects (element-specific correlations) are expected to

differ, as they do for different BCC metals (Borenstein M, Hedges LV, Higgins JPT, Rothstein

HR, “A basic introduction to fixed-effect and random-effects models for meta-analysis,”

Research Synthesis Methods 1(2), 97–111, 2010).

Welz et al. (2022) proposed improved confidence intervals for the Fisher z approach in

random-effects meta-analysis of correlations, showing that standard intervals can be

unsatisfactory and providing enhanced variance estimators (Welz T, Viechtbauer W, Pauly

M, “Fisher transformation based confidence intervals of correlations in fixed- and random-

effects meta-analysis,” British Journal of Mathematical and Statistical Psychology 75(1), 1–

38, 2022). DerSimonian and Laird (1986) provide the most widely used random-effects

estimator for between-study variance (DerSimonian R, Laird N, “Meta-analysis in clinical

trials,” Controlled Clinical Trials 7, 177–188, 1986). Higgins et al. (2003) introduced the I²

statistic for quantifying heterogeneity (Higgins JPT, Thompson SG, Deeks JJ, Altman DG,

“Measuring inconsistency in meta-analyses,” BMJ 327, 557–560, 2003).

Simpson’s paradox in the physical sciences

Examples of Simpson’s paradox in hard sciences remain rare, making instances in materials

science especially noteworthy. Selvitella (2017) demonstrated the paradox in quantum

mechanics (quantum harmonic oscillator, nonlinear Schrödinger equation) and in geometric

and linear algebraic settings (Selvitella A, “The ubiquity of the Simpson’s paradox,” Journal

of Statistical Distributions and Applications 4, Article 2, 2017). Chuang et al. (2009)