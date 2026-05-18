# References & Intellectual Lineage

The external literature Lupine builds on — what each work is, and *why we cite it*. This
is the annotated counterpart to the IMMI paper's `references.bib`: the bibliography tells
you the source, this tells you the load it bears in the argument.

Threads: sloppy-model theory → its application to interatomic potentials → the
Simpson's-paradox / ecological-fallacy machinery → meta-analysis → the benchmark
infrastructure and reference data.

---

## Sloppy-model theory — foundational

- **Brown & Sethna (2003)** — *Statistical mechanical approaches to models with many
  poorly known parameters.* Phys. Rev. E 68, 021904.
  [doi](https://doi.org/10.1103/PhysRevE.68.021904)
  — The origin of "sloppiness": most parameter combinations barely affect predictions.
  The conceptual seed of the hyper-ribbon.
- **Waterfall et al. (2006)** — *Sloppy-model universality class and the Vandermonde
  matrix.* Phys. Rev. Lett. 97, 150601.
  [doi](https://doi.org/10.1103/PhysRevLett.97.150601)
  — Establishes sloppiness as a *universality class* — why we expect the same geometry
  across unrelated potentials.
- **Gutenkunst et al. (2007)** — *Universally sloppy parameter sensitivities in systems
  biology models.* PLoS Comput. Biol. 3, e189.
  [doi](https://doi.org/10.1371/journal.pcbi.0030189)
  — Cross-domain evidence that the eigenvalue spectrum is generic, not model-specific.

## Sloppy-model theory — geometric / information-theoretic

- **Transtrum, Machta & Sethna (2010, 2011)** — *Why are nonlinear fits so challenging?*
  / *Geometry of nonlinear least squares.* PRL 104, 060201; PRE 83, 036701.
  [doi](https://doi.org/10.1103/PhysRevE.83.036701)
  — The model manifold as a bounded **hyper-ribbon** with a hierarchy of widths — the
  object Lupine measures in error space.
- **Machta et al. (2013)** — *Parameter space compression underlies emergent theories.*
  Science 342, 604. [doi](https://doi.org/10.1126/science.1238723)
  — Why low effective dimensionality is *expected*, not coincidental.
- **Transtrum & Qiu (2014)** — *Model reduction by manifold boundaries.* PRL 113, 098701.
  [doi](https://doi.org/10.1103/PhysRevLett.113.098701)
  — The Manifold Boundary Approximation Method — the route from "sloppy" to a reduced
  predictive model (the long-term retraining target).
- **Transtrum et al. (2015)** — *Perspective: Sloppiness and emergent theories.*
  J. Chem. Phys. 143, 010901. [doi](https://doi.org/10.1063/1.4923066)
  — The synthesis we treat as the canonical statement of the paradigm.
- **Quinn et al. (2019, 2023)** — *Chebyshev approximation and the global geometry of
  model predictions* / *Information geometry for multiparameter models.* PRL 122, 158302;
  Rep. Prog. Phys. 86, 035901. [doi](https://doi.org/10.1088/1361-6633/aca6f8)
  — Rigorous mathematical foundations for the manifold's geometry and the origin of
  simplicity.

## Sloppy models applied to interatomic potentials

- **Frederiksen, Jacobsen, Brown & Sethna (2004)** — *Bayesian ensemble approach to
  error estimation of interatomic potentials.* PRL 93, 165501.
  [doi](https://doi.org/10.1103/PhysRevLett.93.165501)
  — The direct ancestor: sloppiness applied to *potentials*. Lupine is the
  cross-potential, data-driven generalization of this idea.
- **Mortensen et al. (2005)** — *Bayesian error estimation in DFT.* PRL 95, 216401.
  [doi](https://doi.org/10.1103/PhysRevLett.95.216401)
  — Extends error estimation to the DFT reference level — relevant to ground-truth
  uncertainty.
- **Wen et al. (2017)** — *Force-matching Stillinger–Weber potential for MoS₂ + Fisher
  information sensitivity.* J. Appl. Phys. 122, 244301.
  [doi](https://doi.org/10.1063/1.5007842)
  — Fisher-information sensitivity analysis on a real potential — the per-potential
  analogue of our cross-potential manifold.
- **Kurniawan et al. (2022)** — *Bayesian, frequentist, and information-geometric
  approaches to parametric UQ of classical empirical interatomic potentials.*
  J. Chem. Phys. 156, 214103. [doi](https://doi.org/10.1063/5.0084988)
  — The closest prior art on potential UQ; we cite it to position the
  cross-potential corpus as the missing complementary view.

## Modern networks — same sloppy manifold

- **Mao et al. (2024, 2026)** — *The training process of many deep networks explores the
  same low-dimensional manifold* / *Analytical characterization of sloppiness in neural
  networks.* PNAS 121, e2310002121; PRE 113, 015306.
  [doi](https://doi.org/10.1073/pnas.2310002121)
  — The bridge to MLIPs: the sloppy manifold appears in deep networks too — the
  theoretical reason to expect the [hyper-ribbon to transfer classical → MLIP](conjectures/hyper-ribbon-mlip-transfer.md).

## Simpson's paradox & the ecological fallacy

- **Simpson (1951)**, **Blyth (1972)** — the paradox and the sure-thing principle.
  [doi](https://doi.org/10.1080/01621459.1972.10482387)
- **Bickel, Hammel & O'Connell (1975)** — *Sex bias in graduate admissions: Berkeley.*
  Science 187, 398. [doi](https://doi.org/10.1126/science.187.4175.398)
  — The canonical worked example; structurally identical to pooling elastic-constant
  errors across elements.
- **Robinson (1950)** — *Ecological correlations and the behavior of individuals.* Am.
  Sociol. Rev. 15, 351. [doi](https://doi.org/10.2307/2087176)
  — The ecological fallacy proper — why cross-element pooling is not optional to avoid.
- **Pearl (2014)** — *Understanding Simpson's paradox.* Am. Stat. 68, 8.
  [doi](https://doi.org/10.1080/00031305.2013.857687) — and **Pearl (2009)**,
  *Causality* (2nd ed.) — the causal-graph criterion the Lean spec encodes to prove the
  paper's Simpson's claim [cannot arise](formal-proof-ledger.md).
- **Kievit et al. (2013)**, **Selvitella (2017)** — practical guides to its ubiquity;
  cited to justify treating element identity as a confounder by default.

## Correlation pitfalls

- **Jackson & Somers (1991)** — *The spectre of 'spurious' correlations.* Oecologia 86,
  147. — **Archie (1981)** — *Mathematic coupling of data.* Ann. Surg. 193, 296.
  [doi](https://doi.org/10.1097/00000658-198103000-00008)
  — Why reference↔prediction correlations need the [matched-n discipline](methodology.md):
  shared terms manufacture correlation.

## Meta-analysis methodology

- **DerSimonian & Laird (1986)** — *Meta-analysis in clinical trials.* Control. Clin.
  Trials 7, 177. [doi](https://doi.org/10.1016/0197-2456(86)90046-2)
  — The random-effects estimator we use to aggregate heterogeneous potential
  performance correctly.
- **Higgins et al. (2003)** — *Measuring inconsistency in meta-analyses (I²).* BMJ 327,
  557. [doi](https://doi.org/10.1136/bmj.327.7414.557)
  — The heterogeneity statistic; our corpus shows extreme I² ≈ 98.6 %, which is *why*
  random-effects is mandatory.
- **Hedges & Olkin (1985)**, **Borenstein et al. (2009, 2010)** — standard references
  for fixed- vs random-effects models.
- **Welz, Viechtbauer & Pauly (2022)** — *Fisher-transformation CIs of correlations in
  meta-analysis.* Br. J. Math. Stat. Psychol. 75, 1.
  [doi](https://doi.org/10.1111/bmsp.12242)
  — The correct confidence intervals for pooled correlations.

## Benchmark infrastructure & reference data

- **OpenKIM** — Open Knowledgebase of Interatomic Models.
  [openkim.org](https://openkim.org) — primary prediction source (559 potentials).
- **NIST Interatomic Potentials Repository.**
  [ctcms.nist.gov/potentials](https://www.ctcms.nist.gov/potentials/) — cross-reference
  and potential-identity anchor.
- **Simmons & Wang (1971)** — *Single Crystal Elastic Constants and Calculated Aggregate
  Properties: A Handbook.* MIT Press. — the experimental ground truth for the elastic
  constants the corpus is benchmarked against.

---

The machine-readable bibliography is `paper/references.bib` (35 entries). See
[Methodology](methodology.md) for how these tools are used, and the
[Conjecture Ledger](conjectures/ledger.md) for what they were used to test.
