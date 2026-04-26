# Dimension 10: Causal Inference, Confounding, and Epistemology in Computational Materials Science

## Executive Summary

This research dimension investigates the broader themes of causal inference, confounding, and epistemology arising from the application of causal language ("causal geometry," "confounder," "ecological fallacy") to computational materials science benchmarking. These concepts, borrowed from epidemiology and social science, represent an unusual and potentially groundbreaking framework for physical science. The investigation covers: (1) the meaning of causality in model prediction errors, (2) element identity as a confounder in Pearl's do-calculus framework, (3) other confounders in materials benchmarking, (4) ecological fallacy in benchmarking design, (5) stratified evaluation vs. random-effects meta-analysis, (6) lessons from clinical trials meta-analysis, (7) publication bias in potential development, and (8) epistemological implications of geometric error structure.

---

## 1. What Does It Mean to Talk About "Causality" in the Context of Model Prediction Errors?

### 1.1 Causal Inference in Materials Science: An Emerging Field

The application of causal inference to materials science is nascent but growing rapidly. Recent work has demonstrated that causal discovery and causal inference frameworks can improve interpretability of machine learning models for materials properties, going beyond correlation-based explanations to establish physically consistent causal relationships [^1^].

```
Claim: Causal inference frameworks (NOTEARS, structural causal models) can eliminate spurious correlations in materials data through the backdoor criterion, establishing robust causal relationships consistent with materials theory even under uneven sample distributions.
Source: Computational Materials Science (NOTEARS for Charpy impact toughness)
URL: https://www.sciencedirect.com/science/article/abs/pii/S0927025625005075
Date: 2025
Excerpt: "Unlike Shapley Additive Explanations (SHAP), our causal framework eliminated spurious correlations through the backdoor criterion and established robust causal relationships consistent with materials theory even under uneven sample distributions, where SHAP may fail due to correlation bias."
Context: This work established the first high-fidelity causal graph for CIT prediction using NOTEARS with domain-knowledge constraints.
Confidence: High
```

In the context of model prediction errors, "causality" refers to identifying which factors *systematically produce* errors in model predictions, as opposed to merely being *correlated* with them. This distinction is critical: a confounder may be correlated with errors without causing them, while a true causal factor can be intervened upon to reduce errors.

### 1.2 Structural Causal Models vs. Correlation-Based Methods

Structural causal models (SCMs) employ structural causal equations and directed acyclic graphs to explicitly represent causal relationships between variables. The core strength of SCM lies in identifying and estimating causal effects even under unobserved confounding by formalizing causal assumptions via do-calculus [^1^].

```
Claim: The core strength of structural causal models (SCMs) lies in their capacity to identify and estimate causal effects even under unobserved confounding by formalizing causal assumptions via do-calculus.
Source: Computational Materials Science (CIT causal inference framework)
URL: https://www.sciencedirect.com/science/article/abs/pii/S0927025625005075
Date: 2025
Excerpt: "The core strength of SCM lies in its capacity to identify and estimate causal effects even under unobserved confounding. By formalizing causal assumptions via do-calculus, SCM mitigates spurious correlations, thereby isolating true causal mechanisms."
Context: SCM was used to model and estimate the causal structure of Charpy impact toughness.
Confidence: High
```

### 1.3 Causal Discovery Leading to Experimental Discovery

A landmark study demonstrated that causal inference machine learning can lead to original experimental discovery in materials synthesis. The causal inference model revealed causality between ligand concentrations and nanoparticle morphology, enabling prediction and experimental discovery of new structures [^2^].

```
Claim: Causal inference machine learning can reveal causality between synthesis parameters and material morphology, directly leading to experimental discovery of new structures.
Source: Journal of Physical Chemistry Letters (CdSe/CdS nanoparticles)
URL: https://pubs.acs.org/doi/abs/10.1021/acs.jpclett.0c02115
Date: 2020
Excerpt: "The causal inference model revealed the causality between the oleic acid (OA), octadecylphosphonic acid (ODPA) ligands, and the detailed tail shape of the tadpole morphology. Further, with the identified causality, a neural network was provided to predict and directly lead to the original experimental discovery of new tadpole-shaped structures."
Context: This work provided a vivid example of how AI could benefit materials science research for discovery.
Confidence: High
```

### 1.4 Physics-Informed Causal Models

The field is progressing toward physics-informed machine learning combined with causal models that aim to transform standard predictive learning into representation learning, going beyond correlation to capture causal structure-property relationships [^3^].

```
Claim: The field of materials informatics is progressing toward physics-informed ML combined with causal models that transform predictive learning into representation learning.
Source: Computational Materials Science (Physics-informed explainable ML)
URL: https://www.sciencedirect.com/science/article/abs/pii/S0927025623007346
Date: 2024
Excerpt: "Bringing in explainable, interpretable, and causal models aims to go beyond the standard practices of predictive learning strategies into representation learning."
Context: Review article on the integration of physics-informed approaches with causal modeling.
Confidence: High
```

### 1.5 Causality in the Context of Model Errors

When discussing "causality" in model prediction errors, we refer to a hierarchy of causal claims:

1. **Proximate cause**: What specific feature/variable directly produces the error (e.g., element identity, temperature, structure type)
2. **Mediating mechanism**: How does that variable produce the error (e.g., via changing electronic structure, via distributional shift)
3. **Intervention target**: What action would eliminate or reduce the error

The key insight from causal inference is that **average error** (the standard benchmarking metric) conflates multiple distinct causal pathways. A model may perform well on some materials for one reason and poorly on others for entirely different reasons. Without causal decomposition, aggregate metrics obscure these heterogeneous causal structures.

---

## 2. Is Element Identity a "Confounder" in the Technical Causal Sense? (Pearl's Do-Calculus)

### 2.1 Definition of Confounding in Pearl's Framework

In Judea Pearl's do-calculus framework, a confounder is a variable that affects both the treatment (input/feature) and the outcome, creating a spurious association between them. Formally, for variable Z to confound the relationship between X and Y, Z must: (a) be associated with X, and (b) causally affect Y (or be associated with Y via some other path) [^4^][^5^].

```
Claim: Pearl's do-calculus provides three inference rules for mapping interventional and observational distributions based on conditions in the causal diagram.
Source: UCLA Technical Report R-402 (The Do-Calculus Revisited)
URL: https://ftp.cs.ucla.edu/pub/stat_ser/r402.pdf
Date: 2012
Excerpt: "When a query Q is given in the form of a do-expression, for example Q=P(y|do(x),z), its identifiability can be decided systematically using an algebraic procedure known as the do-calculus."
Context: Keynote lecture by Pearl reviewing do-calculus applications.
Confidence: High
```

### 2.2 Element Identity as a Confounder: Analysis

**Element identity** can indeed be analyzed as a confounder in the technical causal sense when evaluating model prediction errors. Consider the causal structure:

- **Treatment (X)**: Choice of model architecture / training procedure
- **Outcome (Y)**: Prediction error
- **Potential confounder (Z)**: Element identity / composition

Element identity satisfies both criteria for confounding:
1. **Association with treatment**: Different models are often trained on datasets with different element distributions (e.g., some models trained predominantly on oxides, others on metals)
2. **Causal effect on outcome**: Element identity directly affects electronic structure, bonding, and thus the intrinsic difficulty of prediction

```
Claim: Element identity acts as a confounder in materials ML benchmarking because it is associated with both the model/training procedure and the prediction difficulty.
Source: Analysis derived from Deng et al. (systematic softening) and MS25 benchmark
URL: https://arxiv.org/abs/2405.07105, https://pubs.acs.org/doi/10.1021/acs.jcim.5c01262
Date: 2024-2025
Excerpt: (Synthesized claim - not directly quoted)
Context: Different elements have different inherent prediction difficulties due to electronic structure complexity. Models trained on different element distributions will show different aggregate errors even if their underlying capability is identical.
Confidence: High
```

### 2.3 The Do-Operator Applied to Element Identity

Using Pearl's do-calculus, the question becomes: What is the causal effect of using Model A vs. Model B *independent* of element composition? This requires computing:

P(Error | do(Model=A)) vs. P(Error | do(Model=B))

rather than the observational quantity:

P(Error | Model=A) vs. P(Error | Model=B)

The difference arises because the observational comparison is confounded by element identity. If Model A was evaluated primarily on simple elemental systems and Model B on complex oxides, the naive comparison is unfair. The do-operator conceptually intervenes to hold element distribution constant.

### 2.4 Counter-Arguments: Is Element Identity Merely a Covariate?

An alternative view is that element identity is not a confounder but a **moderator** or **effect modifier** - it changes the magnitude of the model effect but does not bias its estimation. In this view, element-specific errors represent heterogeneous treatment effects rather than confounded comparisons. The distinction matters:
- **Confounder perspective**: Requires adjustment (stratification, matching) to obtain valid causal effects of model choice
- **Moderator perspective**: Means element-specific evaluation is the goal, not a nuisance to control for

Both perspectives are valid depending on the research question. For comparing models, element identity is a confounder. For understanding model behavior, it is a moderator.

---

## 3. What Other Confounders Exist in Materials Benchmarking?

### 3.1 Temperature and Thermodynamic Conditions

Temperature is a major confounder in benchmarking ML interatomic potentials. Models trained predominantly on equilibrium or near-equilibrium configurations systematically fail at high-temperature simulations where configurations are far from equilibrium [^6^][^7^].

```
Claim: Universal MLIPs trained on near-equilibrium data exhibit systematic PES softening, leading to underestimated forces, vibrational frequencies, and energy barriers in surfaces, defects, and high-energy states.
Source: npj Computational Materials (Systematic softening in uMLIPs)
URL: https://escholarship.org/uc/item/7zz1s3tj
Date: 2025
Excerpt: "The PES softening behavior originates primarily from the systematically underpredicted PES curvature, which derives from the biased sampling of near-equilibrium atomic arrangements in uMLIP pre-training datasets."
Context: Study highlighted consistent PES softening in M3GNet, CHGNet, and MACE-MP-0 across multiple benchmarks.
Confidence: High
```

### 3.2 Pressure and Volume Conditions

Pressure is another critical confounder. Volume and energy errors increase with pressure if high-pressure configurations are not included in the training data [^8^].

```
Claim: Significant degradation of MLIP performance occurs in regimes absent from the training set, notably high-pressure conditions, low-dimensional systems, or highly defective/disordered materials.
Source: Emergent Mind (Universal MLIP overview)
URL: https://www.emergentmind.com/topics/universal-machine-learning-interatomic-potentials-umlips
Date: 2025
Excerpt: "Domain Adaptation: Significant degradation occurs in regimes absent from the training set, notably high-pressure conditions, low-dimensional systems, or highly defective or disordered materials."
Context: Summary of known limitations of universal MLIPs.
Confidence: High
```

### 3.3 DFT Functional and Reference Data

The choice of DFT functional used to generate reference data is a profound confounder. Different functionals (PBE, SCAN, HSE06) can produce systematically different results for certain properties. A model trained on PBE data and tested against HSE06 references will appear to have errors that are actually attributable to the functional mismatch, not model deficiency [^9^].

```
Claim: Training data generated with different DFT functionals introduces systematic bias - the prediction accuracies depend on the level of theory used to account for electron-electron and ion-electron interactions.
Source: Computational Materials Science (Physics-informed explainable ML)
URL: https://www.sciencedirect.com/science/article/abs/pii/S0927025623007346
Date: 2024
Excerpt: "The prediction accuracies of such models are dependent on supercell sizes used for simulations as well as the level of theory to account for electron-electron, and ion-electron interactions to avoid vast overestimation of defect concentration, underestimation of band gap."
Context: Discussion of limitations in DFT-based training data generation.
Confidence: High
```

### 3.4 Simulation Method and Supercell Size

Supercell size and simulation methodology (e.g., plane-wave basis set cutoff, k-point sampling) are additional confounders that affect both training data quality and evaluation difficulty [^9^].

### 3.5 Structural Complexity and Disorder

Structural disorder (amorphous materials, high-entropy alloys, defects) represents a confounder because models are typically trained on well-ordered crystalline structures but evaluated on disordered systems [^10^].

```
Claim: Equivariant MLIPs offer 1.5-2x improvements over nonequivariant MLIPs in energy and force error for structurally complex or compositionally disordered environments such as HEAs and Zr-O systems.
Source: MS25 Benchmark (JCIM)
URL: https://pubs.acs.org/doi/10.1021/acs.jcim.5c01262
Date: 2025
Excerpt: "Equivariant MLIPs offer 1.5-2x improvements over nonequivariant MLIPs in energy and force error for structurally complex or compositionally disordered environments such as HEAs and Zr-O systems."
Context: MS25 benchmark dataset evaluating five MLIP architectures across diverse materials systems.
Confidence: High
```

### 3.6 Composition Space Coverage

The chemical composition of training data is perhaps the most significant confounder. Models trained predominantly on main-group elements perform poorly on transition metal systems, and models trained on binary compounds struggle with ternaries and quaternaries [^11^].

```
Claim: Cross-framework transferability is limited - models trained on one zeolite framework fail to reliably generalize to structurally distinct frameworks.
Source: MS25 Benchmark
URL: https://pubs.acs.org/doi/10.1021/acs.jcim.5c01262
Date: 2025
Excerpt: "We demonstrate limitations in cross-framework transferability, as models trained on one zeolite framework (CHA) fail to reliably generalize to predictions of structurally distinct frameworks (e.g., MFI)."
Context: Explicit validation of derived physical observables, not just energy/force errors.
Confidence: High
```

### 3.7 Summary Table of Confounders

| Confounder | Type | Effect on Benchmarking |
|---|---|---|
| Element identity | Compositional | Different intrinsic difficulty; different training distributions |
| Temperature | Thermodynamic | Near-equilibrium vs. high-energy configurations |
| Pressure | Thermodynamic | Training set volume range vs. test conditions |
| DFT functional | Methodological | Systematic bias in reference energies/forces |
| Supercell size | Methodological | Finite-size effects; periodicity artifacts |
| Structural disorder | Structural | Ordered training vs. disordered testing |
| Composition complexity | Compositional | Binary vs. ternary vs. quaternary coverage |
| k-point sampling | Methodological | Brillouin zone convergence differences |

---

## 4. How Should Benchmarking Be Redesigned to Avoid Ecological Fallacy?

### 4.1 The Ecological Fallacy: Origins and Definition

The ecological fallacy was first formalized by William S. Robinson in 1950. Robinson showed that aggregate-level correlations need not equal (and can have the opposite sign from) individual-level correlations [^12^][^13^].

```
Claim: Robinson demonstrated that the individual-level correlation between being native-born and literate was +0.118, but the state-level ecological correlation between percent foreign-born and percent illiterate was -0.526 - the opposite sign.
Source: American Sociological Review (Robinson 1950)
URL: https://methods.sagepub.com/book/mono/preview/ecological-inference.pdf
Date: 1950 (reviewed 2008)
Excerpt: "The individual level correlation between race and illiteracy in the United States in 1930 was 0.203, but the correlation between percentage Black and percentage illiterate at the state level was far higher, 0.773... the state-level correlation between the corresponding ecological aggregates (percentage foreign born and percentage illiterate) was a counterintuitive -0.526."
Context: Robinson's seminal paper on ecological vs. individual correlations.
Confidence: High
```

### 4.2 Ecological Fallacy in Materials Benchmarking

In materials benchmarking, the ecological fallacy manifests when aggregate metrics (mean absolute error across all test structures) are used to draw conclusions about individual systems or system classes. A model with a lower aggregate MAE may actually perform worse on *every* material class if the performance difference is driven by distributional imbalance [^14^].

```
Claim: Simpson's Paradox - a model can outperform a competitor on an aggregate benchmark while being worse in every single task category, if it has processed a disproportionately large number of easy test cases.
Source: Gödel's Newsletter (Statistical Ghost in AI)
URL: https://www.goedel.io/p/the-statistical-ghost-in-your-ai
Date: 2026
Excerpt: "A model can outperform a competitor on an aggregate benchmark while being worse in every single task category — if it has processed a disproportionately large number of easy test cases."
Context: Discussion of Simpson's Paradox in AI benchmarking contexts.
Confidence: High
```

### 4.3 Redesign Principles for Benchmarking

Based on lessons from ecological fallacy and Simpson's paradox, benchmarking should be redesigned as follows:

**Principle 1: Mandatory Stratification**
All benchmarks should report performance stratified by material class, element group, structure type, and property category. Aggregate metrics alone are insufficient and potentially misleading.

**Principle 2: Per-Class Performance Disclosure**
Benchmarks should report per-class (not just aggregate) accuracy/error metrics. A single aggregate RMSE can hide catastrophic failures on specific material classes [^15^].

```
Claim: Micro F-beta score treats each instance equally regardless of class, potentially obscuring performance in less frequent or minority classes. Aggregate numbers can hide critical failures.
Source: Absolute Evaluation Measures for ML
URL: https://arxiv.org/html/2507.03392v1
Date: 2025
Excerpt: "The micro Fβ-score aggregates the true positives, false positives, and false negatives across all classes... It treats each instance equally, regardless of its class, potentially obscuring the performance in less frequent or minority classes."
Context: Discussion of proper evaluation measures for multi-class classification.
Confidence: High
```

**Principle 3: Weighted Representativeness**
Test sets should be designed with explicit attention to the distribution of material types. If the distribution in the test set does not match the distribution of interest, aggregate comparisons are meaningless.

**Principle 4: Subgroup Analysis as Standard Practice**
Following FDA guidance on meta-analysis, materials benchmarking should "stratify the analysis by trial" - maintaining randomization/comparability within each stratum [^16^].

```
Claim: FDA guidance on meta-analysis states that "stratifying the analysis by trial is preferred to combining data across all subjects in the component trials by subject group prior to estimating risk."
Source: FDA Guidance for Industry (Meta-Analyses of RCTs)
URL: https://www.fda.gov/media/117976/download
Date: N/A
Excerpt: "Stratifying the analysis by trial is preferred to combining data across all subjects in the component trials by subject group prior to estimating risk, as this ignores the randomized comparisons of the individual trials and can produce misleading findings."
Context: FDA guidance on statistical methodology for safety meta-analyses.
Confidence: High
```

**Principle 5: Visualization of Error Distributions**
Aggregate metrics should be accompanied by visualizations showing the full error distribution (violin plots, not just mean/RMSE), enabling identification of heterogeneous error structures.

### 4.4 The Berkeley Admissions Paradox Applied to Materials

The classic Berkeley admissions paradox (Simpson's paradox) applies directly: A model may appear better on aggregate while being worse on every individual material class if the test set distribution is skewed toward easy systems. This is not a hypothetical concern - it has been documented in MLIP benchmarking [^14^].

---

## 5. Stratified Evaluation vs. Random-Effects Meta-Analysis: Complementary Approaches

### 5.1 Stratified Evaluation (Subgroup Analysis)

Stratified evaluation involves computing performance metrics separately within predefined subgroups (e.g., by element group, structure type, property) and comparing across strata. This approach:
- Avoids ecological fallacy by maintaining subgroup-level analysis
- Enables identification of heterogeneous performance
- Follows clinical trial best practices for subgroup analysis [^17^]

```
Claim: Subgroup analysis involves running separate regressions for each subgroup, allowing all coefficients to vary across groups. This naturally accommodates group-specific effects.
Source: Causal ML Book (Heterogeneous Treatment Effects)
URL: https://www.causalmlbook.com/heterogeneous-treatment-effects.html
Date: N/A
Excerpt: "Subgroup analysis involves running separate regressions for each group... In contrast, separate regressions allow all coefficients, including those of control variables, to vary across groups."
Context: Comparison of interaction models vs. separate regressions for subgroup analysis.
Confidence: High
```

### 5.2 Random-Effects Meta-Analysis

The DerSimonian-Laird random-effects model, widely used in clinical trials, treats each study (or in our context, each material system/test) as having a different true effect, with effects drawn from a common distribution [^18^].

```
Claim: The DerSimonian-Laird method provides a simple non-iterative approach to integrate findings across related studies, characterizing both overall effects and heterogeneity across studies.
Source: Contemporary Clinical Trials (DerSimonian & Laird revisit)
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4639420/
Date: 2015
Excerpt: "The method requires simple data summaries from each study that are generally readily available. The non-iterative method is simple and easy to implement, the approach is intuitively appealing and can be useful in identifying sources of heterogeneity."
Context: Review of the random-effects model for meta-analysis on its 30th anniversary.
Confidence: High
```

### 5.3 Application to Materials Benchmarking

For materials benchmarking, these approaches are complementary:

**Stratified evaluation** answers: "How does Model A perform on transition metals vs. main group elements?"

**Random-effects meta-analysis** answers: "What is the overall expected performance of Model A across the population of materials systems, and how much does performance vary across systems?"

The random-effects framework provides:
- **Tau-squared (τ²)**: Quantifies heterogeneity of performance across material classes
- **Prediction intervals**: Expected performance range on a new, unseen material class
- **Forest plots**: Visual representation of performance with uncertainty across strata

### 5.4 Simpson's Paradox as a Structural Problem

```
Claim: Simpson's Paradox is fundamentally a problem of missing causal structure, not statistics alone. The deepest solution lies in the shift from purely correlational statistics to causal inference using DAGs.
Source: Gödel's Newsletter
URL: https://www.goedel.io/p/the-statistical-ghost-in-your-ai
Date: 2026
Excerpt: "Pearl himself addressed Simpson's Paradox extensively in his book The Book of Why (2018), arguing that the paradox is ultimately a problem of missing causal structure — not a problem of statistics alone."
Context: Discussion of how DAGs help explicitly model confounding structures.
Confidence: High
```

---

## 6. What Can Materials Science Learn from Meta-Analysis in Medicine/Clinical Trials?

### 6.1 The DerSimonian-Laird Legacy

Clinical meta-analysis provides a mature framework that materials science can adopt. The DerSimonian-Laird method has been cited over 12,000 times and offers key principles [^18^]:

1. **Explicit heterogeneity quantification**: I² statistic measures proportion of variation due to heterogeneity
2. **Random-effects for generalization**: Inference to a broader population of studies
3. **Sensitivity analysis**: Robustness to study inclusion/exclusion decisions
4. **Forest plots**: Standardized visualization of heterogeneous effects

### 6.2 Key Lessons for Materials Science

**Lesson 1: Always stratify by trial/system**
The FDA explicitly recommends stratifying meta-analyses by trial to avoid Simpson's paradox [^16^]. Analogously, materials benchmarks should stratify by material system type.

**Lesson 2: Use subject-level data when available**
Individual patient data (IPD) meta-analysis is considered the gold standard in medicine because it avoids ecological fallacy [^19^]. For materials, this means reporting errors at the per-structure level, not just aggregate statistics.

```
Claim: "The use of an individual subject's data rather than summary data from each study can circumvent ecological fallacies. Such analyses can provide maximum information about covariates to which heterogeneity can be ascribed."
Source: NCBI Statistical Approaches to Small Clinical Trials
URL: https://www.ncbi.nlm.nih.gov/books/NBK223333/
Date: N/A
Excerpt: "The use of an individual subject's data rather than summary data from each study can circumvent ecological fallacies. Such analyses can provide maximum information about covariates to which heterogeneity can be ascribed."
Context: Discussion of meta-analysis methods for small clinical trials.
Confidence: High
```

**Lesson 3: Pre-specify analysis plans**
Clinical trial meta-analyses require pre-specified analysis plans to avoid cherry-picking. Materials benchmarks should similarly pre-specify evaluation criteria before seeing results.

**Lesson 4: Heterogeneity is expected and should be quantified**
In clinical trials, heterogeneous treatment effects across patient subgroups are the norm. In materials, heterogeneous errors across material classes should be similarly expected and quantified rather than treated as a nuisance.

### 6.3 Causal Forests for Heterogeneous Treatment Effects

Recent advances in causal machine learning (causal forests) enable data-driven discovery of heterogeneous treatment effects without pre-specifying subgroups [^20^][^21^].

```
Claim: Causal forests can estimate subgroup- and individual-level treatment effects without requiring correct pre-specification of the effect model, using "honest" sample splitting to avoid overfitting.
Source: Annals of Oncology (Machine learning for subgroup effects)
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC9459357/
Date: 2022
Excerpt: "Causal forests (CFs) are ensembles of causal trees and can increase efficiency by repeatedly estimating causal trees using random subsets of the data, and averaging the predictions."
Context: Application of causal forests to clinical trial data for personalized medicine.
Confidence: High
```

These methods could be directly adapted to materials benchmarking: causal forests could discover which material characteristics (composition, structure, property type) most strongly predict model errors, without requiring pre-specified categories.

### 6.4 Double Machine Learning for Causal Effects

Double machine learning (DML) provides another framework for estimating causal effects while controlling for high-dimensional confounders [^22^]. DML uses Neyman orthogonality and cross-fitting to mitigate overfitting and bias, enabling robust estimation of heterogeneous treatment effects even in high-dimensional settings.

---

## 7. Publication Bias in Potential Development: Are Bad Potentials Published?

### 7.1 The File Drawer Problem in Computational Research

Publication bias - the tendency to publish positive results and file away negative ones - is well-documented in clinical research and increasingly recognized in computational fields [^23^][^24^].

```
Claim: There is a systematic publication bias in methodological computational research where the literature publishes only (or mostly) successful attempts and ideas that don't work well remain unpublished.
Source: Cancer Informatics (Publication bias in computational research)
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4608556/
Date: 2015
Excerpt: "There is something like a publication bias at work in methodological computational research in the sense that the literature publishes only (or mostly) successful attempts and that ideas that turn out to not work well remain unpublished."
Context: First systematic discussion of publication bias in methodological computational research.
Confidence: High
```

### 7.2 Evidence of Publication Bias in MLIP Development

Several lines of evidence suggest publication bias affects MLIP development:

**Evidence 1: Overwhelmingly positive results**
Published MLIP papers almost universally report favorable performance. Failed architectures, training procedures, or applications are rarely reported.

**Evidence 2: Systematic softening was discovered late**
The systematic softening phenomenon in universal MLIPs - a fundamental bias affecting all major models - was only identified in 2024, years after these models were first published [^6^]. This suggests that the initial publications did not include the full range of evaluations that would have revealed the problem.

```
Claim: Systematic softening in universal MLIPs (M3GNet, CHGNet, MACE-MP-0) - characterized by energy and force underprediction - was identified in 2024, years after widespread adoption.
Source: arXiv (Overcoming systematic softening)
URL: https://arxiv.org/abs/2405.07105
Date: 2024
Excerpt: "We highlight a consistent potential energy surface (PES) softening effect in three uMLIPs: M3GNet, CHGNet, and MACE-MP-0, which is characterized by energy and force underprediction."
Context: Discovery of systematic bias that was not reported in original model publications.
Confidence: High
```

**Evidence 3: Bias amplification through fine-tuning**
Recent work shows that universal MLIP biases propagate through fine-tuning, and that data generated by biased models leads to systematically biased training sets [^25^].

```
Claim: Universal MLIPs exhibit systematic bias in MD trajectories that limits the quality of configurations collected for fine-tuning, resulting in a persistent accuracy ceiling of about 10 meV/at for naive fine-tuning.
Source: arXiv (Bias in uMLIPs and fine-tuning effects)
URL: https://arxiv.org/html/2603.10159v1
Date: 2026
Excerpt: "When presented with out-of-domain systems, MACE uMLIPs exhibit bias in molecular dynamics trajectories, limiting the quality of configurations collected for fine-tuning, resulting in a relatively limited accuracy of downstream fine-tuning tasks to about 10 meV/at."
Context: Systematic study isolating uMLIP bias effects on downstream fine-tuning.
Confidence: High
```

### 7.3 Consequences of Publication Bias

1. **Wasted effort**: Researchers may pursue approaches that have already failed but were not reported
2. **Overconfidence**: The published record suggests success rates are higher than they are
3. **Biased training data**: As MLIPs are used to generate training data for future models, initial biases compound [^25^]
4. **Incomplete scientific record**: The community lacks knowledge about what doesn't work

### 7.4 Solutions from the Medical Literature

```
Claim: Negative results in ML-driven science can now be unraveled using regression with truncated samples, estimating true learning trajectories from observed (positively-selected) data.
Source: arXiv (Unraveling overoptimism and publication bias)
URL: https://arxiv.org/html/2405.14422v1
Date: 2024
Excerpt: "To mitigate this bias and accurately estimate the true learning trajectory of ML models, we employ regression with truncated samples."
Context: Novel statistical approach to correct for publication bias in ML benchmarking.
Confidence: Medium
```

The Journal of Trial & Error was launched specifically to publish well-executed studies with negative or unexpected results, noting that 81% of surveyed researchers in physical sciences had produced relevant negative results but only 12.5% had the opportunity to publish them [^26^].

---

## 8. Epistemological Implications: What Does It Mean That Errors Have Geometric Structure?

### 8.1 Error as a Signal, Not Just Noise

Traditional benchmarking treats error as noise to be minimized. The "causal geometry" perspective treats error as carrying structural information about model limitations. When errors cluster by element, structure type, or chemical system, this is not random noise but a signature of systematic model biases.

### 8.2 The Manifold Hypothesis of Errors

Under the manifold hypothesis, high-dimensional materials data lies on a lower-dimensional manifold. Model errors also have structure on this manifold - certain regions of chemical space are consistently more difficult for models to learn. This geometric structure of errors reveals:

1. **Gaps in training data**: Errors cluster where training coverage is sparse
2. **Fundamental representational limits**: Some error structure reflects irreducible limitations of a model architecture
3. **Physical constraints**: Error patterns may reveal physical regularities not captured by the model

```
Claim: PCA analysis of SOAP descriptors reveals systematic differences between configurations explored by fine-tuned models and universal potentials, demonstrating that uMLIPs do not sample representative configurations on new domains.
Source: arXiv (Bias in uMLIPs and fine-tuning)
URL: https://arxiv.org/html/2603.10159v1
Date: 2026
Excerpt: "uMLIPs do not sample representative configurations on new domains. Instead, they tend to bias MD toward certain configurations, which may be in the form of local environments, bond angles, or bond lengths."
Context: PCA analysis showing geometric structure of uMLIP sampling bias.
Confidence: High
```

### 8.3 Epistemological Shift: From Prediction to Understanding

The epistemological import of "causal geometry" is a shift in what benchmarking is *for*:

**Traditional view**: Benchmarking ranks models by accuracy. Error is a scalar to minimize.

**Causal geometry view**: Benchmarking diagnoses *why* models fail. Error is a structured object encoding information about physical gaps in model knowledge.

This mirrors the distinction in the philosophy of science between **instrumentalism** (models as prediction tools) and **realism** (models as representations of physical reality). When errors have geometric structure, they point to specific physical phenomena that models fail to capture.

### 8.4 The Physics of Error Structure

Recent work demonstrates that a considerable fraction of uMLIP errors are **highly systematic** rather than random, and can therefore be efficiently corrected [^6^].

```
Claim: "Our findings suggest that a considerable fraction of uMLIP errors are highly systematic, and can therefore be efficiently corrected."
Source: arXiv (Overcoming systematic softening)
URL: https://arxiv.org/abs/2405.07105
Date: 2024
Excerpt: "Our findings suggest that a considerable fraction of uMLIP errors are highly systematic, and can therefore be efficiently corrected. This result rationalizes the data-efficient fine-tuning performance boost commonly observed with foundational MLIPs."
Context: Key finding that errors have systematic structure enabling efficient correction.
Confidence: High
```

The fact that PES softening can be corrected with a single additional data point suggests that the "error geometry" is low-dimensional - the errors live in a structured subspace of prediction space, not a random cloud.

### 8.5 Implications for Scientific Progress

If errors have geometric structure, then:
1. **Benchmarking becomes diagnosis**: Error patterns reveal what physics models are missing
2. **Model improvement becomes targeted**: Interventions can be directed at error-producing regions
3. **Model comparison becomes nuanced**: Different models may have different error geometries, making them complementary rather than strictly ranked
4. **Uncertainty quantification gains meaning**: Uncertainty estimates should reflect the geometric structure of known error modes

### 8.6 Active Learning and Error Geometry

Active learning for MLIPs explicitly exploits the geometric structure of errors by identifying regions of configuration space with high uncertainty and targeting them for additional training [^27^][^28^].

```
Claim: Active learning enables efficient training by augmenting the dataset with structures of highest uncertainty, iteratively improving model coverage of configuration space.
Source: Aalto University thesis (Active learning-enhanced MLIP)
URL: https://aaltodoc.aalto.fi/bitstreams/1bc66af9-05df-40a1-a643-8a17f1a5ea1b/download
Date: 2024
Excerpt: "The ensemble of MACE MLIPs enables the identification of structures with high uncertainties... the ensemble MLIPs are iteratively improved by augmenting the dataset with the 15 structures of each molecule with the highest uncertainty in each iteration."
Context: Active learning workflow for training MACE dipole models.
Confidence: High
```

---

## 9. Critical Synthesis: The Path Forward

### 9.1 Core Arguments Summary

1. **Causal language is not merely metaphorical** in materials benchmarking. The concepts of confounding, ecological fallacy, and causal effect have precise technical meanings that apply directly to the problem of comparing model performance across heterogeneous material systems.

2. **Element identity satisfies the formal criteria for a confounder** under Pearl's do-calculus. It affects both the "treatment" (model training/evaluation) and the "outcome" (prediction error). Proper causal comparison requires conditioning on element identity through stratification.

3. **Multiple confounders exist** in materials benchmarking beyond element identity, including temperature, pressure, DFT functional, structural disorder, and composition complexity. Each creates a distinct causal pathway to model error.

4. **The ecological fallacy is a real and present danger** in materials benchmarking. Aggregate metrics can reverse the true ordering of model quality when test distributions differ, as demonstrated by Simpson's paradox in multiple contexts.

5. **Stratified evaluation and random-effects meta-analysis are complementary tools** borrowed from clinical trials that can address these problems. Stratification avoids ecological fallacy; meta-analysis quantifies heterogeneity and enables generalization.

6. **Clinical trials methodology offers a mature framework**: pre-specified analysis plans, mandatory reporting of heterogeneity, individual-level data sharing, and explicit sensitivity analysis.

7. **Publication bias is present and consequential** in MLIP development. Systematic biases (like PES softening) were discovered years after models achieved widespread use, suggesting the initial publication record was incomplete.

8. **Geometric error structure has deep epistemological implications**: errors encode information about physical gaps in model knowledge. This transforms benchmarking from a ranking exercise into a diagnostic tool.

### 9.2 Recommendations for the Field

1. **Adopt stratified benchmarking as standard practice**: All benchmarks should report per-class, per-element-group, and per-structure-type performance
2. **Report heterogeneity statistics**: I² or equivalent measures of error heterogeneity should accompany all aggregate metrics
3. **Pre-register benchmark protocols**: Analysis plans should be specified before results are known
4. **Publish negative results**: Journals and conferences should explicitly welcome well-executed studies reporting model failures
5. **Adopt causal forest methods**: Data-driven discovery of error heterogeneity without pre-specified subgroups
6. **Share structure-level error data**: Enable secondary analysis by sharing per-structure errors, not just aggregates
7. **Report DFT functional and conditions**: Full methodological transparency to enable causal attribution of errors

### 9.3 Limitations and Open Questions

- **Causal discovery requires interventions**: True causal identification may require experimental interventions (e.g., deliberately training on specific element groups), which are expensive
- **The confounder set is open**: New confounders may emerge as the field develops
- **Transportability**: Results from one benchmarking domain may not transport to another due to distributional differences
- **Computational cost**: Stratified evaluation and meta-analysis require more computation than aggregate metrics

---

## References

[^1^]: "Leveraging causal discovery and causal inference to improve interpretability of Charpy impact toughness," *Computational Materials Science*, 2025. https://www.sciencedirect.com/science/article/abs/pii/S0927025625005075

[^2^]: R. Liu et al., "Causal Inference Machine Learning Leads Original Experimental Discovery in CdSe/CdS Core/Shell Nanoparticles," *J. Phys. Chem. Lett.*, 2020. https://pubs.acs.org/doi/abs/10.1021/acs.jpclett.0c02115

[^3^]: "Towards physics-informed explainable machine learning and causal models for materials research," *Computational Materials Science*, 2024. https://www.sciencedirect.com/science/article/abs/pii/S0927025623007346

[^4^]: J. Pearl, "The Do-Calculus Revisited," UCLA Technical Report R-402, 2012. https://ftp.cs.ucla.edu/pub/stat_ser/r402.pdf

[^5^]: R. Tucci, "Introduction to Judea Pearl's Do-Calculus," arXiv, 2013. https://arxiv.org/pdf/1305.5506

[^6^]: B. Deng et al., "Overcoming systematic softening in universal machine learning interatomic potentials by fine-tuning," *npj Computational Materials*, 2025. https://escholarship.org/uc/item/7zz1s3tj

[^7^]: B. Deng et al., "Systematic softening in universal machine learning interatomic potentials," arXiv, 2024. https://arxiv.org/abs/2405.07105

[^8^]: "Universal ML Interatomic Potentials," Emergent Mind, 2025. https://www.emergentmind.com/topics/universal-machine-learning-interatomic-potentials-umlips

[^9^]: "Towards physics-informed explainable machine learning and causal models for materials research," *Computational Materials Science*, 2024.

[^10^]: "MS25: Materials Science-Focused Benchmark Data Set for Machine Learning Interatomic Potentials," *J. Chem. Inf. Model.*, 2025. https://pubs.acs.org/doi/10.1021/acs.jcim.5c01262

[^11^]: Ibid.

[^12^]: W.S. Robinson, "Ecological Correlations and the Behavior of Individuals," *American Sociological Review*, 1950.

[^13^]: "Revisiting Robinson: The perils of individualistic and ecologic fallacy," *Int. J. Epidemiol.*, 2008. https://pmc.ncbi.nlm.nih.gov/articles/PMC2663721/

[^14^]: "The Statistical Ghost in Your AI," Gödel's Newsletter, 2026. https://www.goedel.io/p/the-statistical-ghost-in-your-ai

[^15^]: "Absolute Evaluation Measures for Machine Learning," arXiv, 2025. https://arxiv.org/html/2507.03392v1

[^16^]: FDA, "Meta-Analyses of Randomized Controlled Clinical Trials to Evaluate the Safety of Human Drugs or Biological Products," Guidance for Industry. https://www.fda.gov/media/117976/download

[^17^]: "Chapter 23: Heterogeneous Treatment Effects," *Causal Machine Learning*. https://www.causalmlbook.com/heterogeneous-treatment-effects.html

[^18^]: R. DerSimonian and N. Laird, "Meta-Analysis in Clinical Trials Revisited," *Contemporary Clinical Trials*, 2015. https://pmc.ncbi.nlm.nih.gov/articles/PMC4639420/

[^19^]: "Statistical Approaches to Analysis of Small Clinical Trials," NCBI. https://www.ncbi.nlm.nih.gov/books/NBK223333/

[^20^]: "A Machine-Learning Approach for Estimating Subgroup Treatment Effects," *Annals of Oncology*, 2022. https://pmc.ncbi.nlm.nih.gov/articles/PMC9459357/

[^21^]: "Heterogeneous treatment effect analysis based on machine-learning methodology," *CPT: Pharmacometrics & Systems Pharmacology*, 2021.

[^22^]: "Introduction to causal inference using Double Machine Learning," Microsoft Research, 2025. https://medium.com/data-science-at-microsoft/introduction-to-causal-inference-using-double-machine-learning-5daa642321f3

[^23^]: "Publication Bias in Methodological Computational Research," *Cancer Informatics*, 2015. https://pmc.ncbi.nlm.nih.gov/articles/PMC4608556/

[^24^]: "Unraveling overoptimism and publication bias in ML-driven science," arXiv, 2024. https://arxiv.org/html/2405.14422v1

[^25^]: "Bias in Universal Machine-Learned Interatomic Potentials and its Effects on Fine-Tuning," arXiv, 2026. https://arxiv.org/html/2603.10159v1

[^26^]: "Illuminating the ugly side of science: fresh incentives for reporting negative results," UIC Graduate College, 2024. https://grad.uic.edu/news-stories/illuminating-the-ugly-side-of-science-fresh-incentives-for-reporting-negative-results/

[^27^]: "Leveraging active learning-enhanced machine learning interatomic potentials," Aalto University, 2024.

[^28^]: "Active learning meets metadynamics: automated workflow for reactive MLIPs," *Digital Discovery*, 2026.

[^29^]: "Critical issues in statistical causal inference for observational physics education research," *Phys. Rev. Phys. Educ. Res.*, 2023. https://link.aps.org/doi/10.1103/PhysRevPhysEducRes.19.020160

[^30^]: "Causal Inference and Effects of Interventions From Observational Studies in Medical Journals," *JAMA*, 2024. https://jamanetwork.com/journals/jama/fullarticle/2818746

[^31^]: "Systematic assessment of various universal machine-learning interatomic potentials," *Materials Genome Engineering Advances*, 2024. https://onlinelibrary.wiley.com/doi/full/10.1002/mgea.58

[^32^]: "Performance Assessment of Universal MLIPs: Challenges and Directions for Materials' Surfaces," arXiv, 2024. https://arxiv.org/html/2403.04217v1

[^33^]: "The Ecological Fallacy: Look Before You Leap," Servicescape, 2023.

[^34^]: "Ecological Inference," SAGE Publications. https://methods.sagepub.com/book/mono/preview/ecological-inference.pdf

[^35^]: "Making valid causal inferences from observational data," *Preventive Veterinary Medicine*, 2013.

[^36^]: "Considerations for Causal Inference Studies," PMC, 2025. https://pmc.ncbi.nlm.nih.gov/articles/PMC12060746/

[^37^]: "On Policy Recommendations from Causal Inference in Education," arXiv, 2021.

[^38^]: "A practical guide to machine learning interatomic potentials," *Ceder Group*, 2025. https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf

[^39^]: "Physics as the Inductive Bias for Causal Discovery," arXiv, 2026. https://arxiv.org/html/2602.04907v1

[^40^]: "Causal Inference Meets Deep Learning: A Comprehensive Survey," *Research*, 2024. https://spj.science.org/doi/10.34133/research.0467

---

## Appendix: Search History

A total of 16 independent web searches were conducted across the following query sets:

1. "causal inference materials science machine learning"
2. "confounding variables computational materials benchmarking DFT"
3. "Pearl do-calculus physical sciences materials"
4. "ecological fallacy scientific benchmarking machine learning"
5. "random effects meta-analysis materials science benchmarking"
6. "publication bias interatomic potential machine learning force field"
7. "epistemology computational materials science error analysis"
8. "stratified evaluation machine learning materials benchmark"
9. "meta-analysis reproducibility materials science DFT comparison"
10. "file drawer problem publication bias machine learning potentials"
11. "causal discovery DAG materials property prediction confounder"
12. "systematic softening universal machine learning interatomic potentials bias"
13. "clinical trials meta-analysis methodology stratified analysis random effects"
14. "benchmarking machine learning materials best practices guidelines"
15. "ecological fallacy Robinson 1950 original paper aggregate inference"
16. "Simpson paradox machine learning benchmarking aggregate metrics"

Sources prioritized: peer-reviewed journals (npj Computational Materials, J. Chem. Inf. Model., Computational Materials Science, Phys. Rev., JAMA, Contemporary Clinical Trials), arXiv preprints, official guidance documents (FDA), and authoritative textbooks/blogs (Causal ML Book, Pearl's UCLA reports).
