# Dimension 05: Simpson's Paradox & Ecological Fallacy in Physical Sciences

## Executive Summary

Simpson's paradox—the phenomenon where a statistical relationship reverses upon aggregation or stratification—is one of the most consequential phenomena in applied statistics. This research dimension investigates its history, causal foundations, detection methods, and relevance to computational materials science benchmarking. The paradox has been documented in quantum mechanics but appears largely unexplored in materials informatics. Its relevance to interatomic potential benchmarking—where element identity acts as a confounding variable—is a novel application with significant implications for the field.

---

## 1. History of Simpson's Paradox

### 1.1 Origins: Pearson (1899) and Yule (1903)

The phenomenon now known as Simpson's paradox was first identified not by Simpson, but by Karl Pearson in 1899 [^1^]. In a paper on genetic selection, Pearson demonstrated that the correlation between length and breadth of male skulls from the Paris catacombs was 0.09, while for female skulls it was -0.04. When the two samples were combined, the correlation was 0.20—skull length and breadth were uncorrelated within sexes but positively correlated across sexes [^2^].

> "To those who persist on looking upon all correlation as cause and effect, the fact that correlation can be produced between two quite uncorrelated characters A and B by taking an artificial mixture of the two closely allied races, must come as rather a shock." — Pearson et al., 1899 [^3^]

George Udny Yule extended this observation in 1903, describing association paradoxes with categorical variables using the hypothetical example of a possibly ineffective anti-toxin that could appear to be a "cure" due to sex-related differences in mortality rates [^4^]. The paradox is therefore sometimes called the **Yule-Simpson effect**.

### 1.2 Simpson's Formalization (1951)

Edward H. Simpson's 1951 paper "The Interpretation of Interaction in Contingency Tables" in the *Journal of the Royal Statistical Society* gave the phenomenon its enduring fame [^5^]. Importantly, Simpson himself did not claim to have discovered the effect. He pointed out that association paradoxes were well known prior to his paper. The name "Simpson's paradox" was actually coined by Colin R. Blyth in 1972 [^6^].

Simpson's key contribution was to demonstrate that:
1. Identical data arising from different causal structures need to be analyzed differently
2. There is no purely statistical rule for whether conditional or marginal associations should be preferred

### 1.3 The Berkeley Admissions Case: Bickel et al. (1975)

The most famous real-world example comes from a 1975 *Science* paper by Peter Bickel, Eugene Hammel, and J.W. O'Connell studying graduate admissions at UC Berkeley [^7^]. When aggregated across 85 departments, the data showed 44% of male applicants were admitted versus only 35% of female applicants—a statistically significant difference suggesting gender bias.

However, when stratified by department, the paradox emerged: in most departments, women had *higher* admission rates than men. The apparent discrimination arose because women tended to apply to more competitive departments (e.g., English) with lower overall admission rates, while men applied more to departments like mechanical engineering with higher admission rates [^8^].

> **Key insight**: The Berkeley case is not a pure Simpson's paradox because not all departments showed the same direction of bias. However, it demonstrates how aggregation across structurally different subgroups can create misleading impressions [^9^].

---

## 2. Robinson's Ecological Fallacy (1950)

### 2.1 The Foundational Paper

In 1950, sociologist William S. Robinson published "Ecological Correlations and the Behavior of Individuals" in the *American Sociological Review*—one of the most influential methodological papers in the social sciences [^10^]. Robinson analyzed 1930 U.S. Census data and demonstrated striking discrepancies between state-level and individual-level correlations.

His most famous example: the correlation between race (percent Black) and illiteracy was:
- **r = 0.77** at the state level (ecological correlation)
- **r = 0.20** at the individual level

Even more dramatically, the correlation between foreign-born status and illiteracy was:
- **r = -0.53** at the state level (suggesting immigrants were less illiterate)
- **r = +0.12** at the individual level (immigrants were actually slightly more illiterate)

### 2.2 Robinson's Conclusion

> "There need be no correspondence between the individual correlation and the ecological correlation... From a practical standpoint, therefore, the only reasonable assumption is that an ecological correlation is almost certainly not equal to its corresponding individual correlation." — Robinson, 1950 [^11^]

The term "ecological fallacy" itself was coined by Hanan C. Selvin in 1958 [^12^]. Robinson's paper has been cited over 1,150 times across social sciences, public health, and biomedical research [^13^].

### 2.3 Relationship to Simpson's Paradox

The ecological fallacy is closely related to Simpson's paradox—sometimes called its "inverse." Where Simpson's paradox involves reversals when combining subgroups, the ecological fallacy involves incorrect inferences about individuals from aggregate data [^14^]. Both arise from the same fundamental phenomenon: associations at different levels of aggregation can differ qualitatively.

---

## 3. Judea Pearl's Causal Framework

### 3.1 The Causal Revolution

Judea Pearl's work on causal inference provides the most rigorous framework for understanding and resolving Simpson's paradox. In his 2009 paper "Simpson's Paradox, Confounding, and Collapsibility" and his seminal book *Causality*, Pearl demonstrated that the paradox is fundamentally a causal phenomenon, not merely a statistical curiosity [^15^].

### 3.2 Key Insight: The "Paradox" Disappears with Causal Structure

> "The apparent paradox originally described by Simpson is the result of disregarding the causal structure of the research problem. In fact, any hint of a paradox disappears when the causal structure is made explicit." — Hernan et al., 2011 [^16^]

Pearl showed that whether one should condition on a third variable depends entirely on its causal relationship to the variables of interest:

**Confounder structure**: If variable C is a common cause of both treatment T and outcome Y (C → T, C → Y), then one MUST condition on C to get the correct causal effect. This is the classical Simpson's paradox scenario.

**Collider structure**: If C is an effect of both T and Y (T → C, Y → C), then one must NOT condition on C, as this would create spurious associations.

**Mediator structure**: If C is on the causal pathway from T to Y (T → C → Y), then whether to condition on C depends on whether one wants the total or direct effect [^17^].

### 3.3 The do-calculus

Pearl introduced the **do(·) operator** to formalize causal reasoning. The key distinction is between:
- **P(Y | X = x)**: Probability of Y given that X is observed to be x (conditional probability)
- **P(Y | do(X = x))**: Probability of Y if X is intervened upon and set to x (causal effect)

When these differ, confounding is present. Simpson's paradox arises from conflating conditional probabilities with causal probabilities [^18^].

### 3.4 The Back-Door Criterion

Pearl's **back-door criterion** provides a graphical test for identifying whether a set of variables is sufficient to control for confounding. A set Z satisfies the back-door criterion relative to (X, Y) if:
1. No node in Z is a descendant of X
2. Z blocks every path between X and Y that contains an arrow into X

This provides a principled, formal way to decide whether to stratify by a given variable [^19^].

---

## 4. Simpson's Paradox in Physical Sciences

### 4.1 Quantum Mechanics

The most direct evidence of Simpson's paradox in physical sciences comes from quantum mechanics. Several papers have documented its occurrence:

**Selvitella (2017)** proved that Simpson's paradox occurs for solutions of the quantum harmonic oscillator, both in stationary and non-stationary cases. In the non-stationary case, the paradox is "persistent"—if it occurs at any time t, it occurs at all times. The paradox is also shown to be "not an isolated phenomenon"—near initial data where it occurs, there exists an open neighborhood of initial data where it still occurs [^20^].

**Paris (2012)** identified "two quantum Simpson's paradoxes":
- The **quantum-classical YS effect**: Occurs with quantum limited measurements and lurking variables from mixing of states
- The **quantum-quantum YS effect**: Occurs when coherent superpositions of quantum states are allowed [^21^]

These findings demonstrate that Simpson's paradox is not merely a statistical artifact but can emerge from the fundamental structure of physical systems.

### 4.2 Chemistry and Materials Science

Direct documentation of Simpson's paradox in chemistry or materials science appears to be **extremely limited or absent** from the literature. No published studies were found that explicitly identify Simpson's paradox in:
- Molecular dynamics benchmarking
- Density functional theory validation
- Interatomic potential assessment
- Materials property prediction

This represents a **significant gap** in the literature. The materials informatics community appears largely unaware of the risk of aggregation paradoxes in benchmarking studies.

### 4.3 Why Physical Science Benchmarking is Vulnerable

Several characteristics of computational materials benchmarking make it particularly susceptible to Simpson's paradox:

1. **Heterogeneous data aggregation**: Benchmarks combine data across different elements, structures, and calculation types
2. **Systematic variation in difficulty**: Some elements/structures are intrinsically harder to model than others
3. **Uneven sampling**: Training data is often concentrated in certain regions of chemical space
4. **Confounding by element identity**: Different elements have different numbers of electrons, bonding types, and physical properties
5. **Structural vs. chemical effects**: Crystal structure and chemical composition may act as separate confounders

---

## 5. The Kievit et al. Detection Framework

### 5.1 Overview

Rogier Kievit and colleagues (2013) published "Simpson's paradox in psychological science: a practical guide" in *Frontiers in Psychology*, providing both a conceptual framework and practical tools for detecting the paradox [^22^].

### 5.2 Key Contributions

1. **Scope documentation**: The authors showed Simpson's paradox is more common than conventionally thought, reviewing examples from cognitive neuroscience, behavior genetics, clinical psychology, personality psychology, educational psychology, and intelligence research

2. **Statistical markers**: They proposed a set of statistical indicators of the paradox:
   - Evidence of more than one cluster in the data
   - Regression relationships that differ in direction between subgroups
   - Significant differences in slopes between aggregate and subgroup analyses

3. **The R package `Simpsons`**: An open-source tool for detecting Simpson's paradox in bivariate continuous data [^23^]

### 5.3 How the Detection Framework Works

The Kievit framework operates through a multi-step procedure:

1. **Cluster detection**: Uses model-based cluster analysis (MCLUST) to identify whether more than one cluster exists in the data
2. **Regression comparison**: Estimates the regression of X on Y for the whole dataset and for each identified cluster
3. **Permutation testing**: Uses permutation tests to determine whether the regression within a cluster significantly differs from the aggregate regression
4. **Sign reversal detection**: Flags cases where the regression within a cluster is in the opposite direction from the aggregate regression

The package outputs warnings:
- "Beta regression estimate in cluster X is significantly different compared to the group!"
- "Sign reversal: Simpson's Paradox! Cluster X is significantly different and in the opposite direction compared to the group!" [^24^]

### 5.4 Limitations

- Designed primarily for bivariate continuous data with categorical grouping variables
- Cluster analysis may identify spurious subgroups
- Does not incorporate causal structure (following Pearl, this is a significant limitation)
- May have reduced power with small sample sizes

---

## 6. Element Identity as a Confounder in Potential Benchmarking

### 6.1 Why Element Identity is a Confounding Variable

In computational materials benchmarking, **element identity (Z)** satisfies the definition of a confounder under Pearl's framework:

1. **Element identity affects the predictor**: Different elements have different optimal potential parameters, cutoff radii, and basis functions
2. **Element identity affects the outcome**: Different elements have different cohesive energies, lattice constants, elastic moduli, and other properties
3. **Element identity is a common cause**: The physical properties of an element (nuclear charge, electron configuration) causally influence both the accuracy of a potential and the magnitude of the properties being predicted

### 6.2 The Causal Structure

The causal diagram for potential benchmarking can be represented as:

```
Element Identity (Z)
       /        \
      v          v
Potential    True Property
Accuracy     Value
      \        /
       v      v
    Benchmark
      Error
```

Under this structure, element identity Z is a **confounder**. To estimate the true causal effect of potential choice on benchmark error, one must condition on (stratify by) element identity. Failing to do so leads to confounded estimates [^25^].

### 6.3 How Aggregation Creates Misleading Benchmarks

When benchmark errors are aggregated across elements:
- Elements with more data points (e.g., common metals) dominate the aggregate
- Elements that are intrinsically harder to model may have systematically larger errors
- The resulting aggregate RMSE/MAE may not reflect performance on any individual element
- Comparisons between potentials may reverse when stratified by element

This is precisely the structure that produces Simpson's paradox.

---

## 7. Other Confounders in Computational Materials Benchmarking

### 7.1 Pair Style / Functional Form

The choice of interatomic potential formalism (pair_style in LAMMPS terminology) is a major confounder:
- Different pair styles are designed for different bonding types (metallic, covalent, ionic)
- Some pair styles have more parameters and can fit data more closely
- Comparison across pair styles without controlling for intended application is problematic

### 7.2 Crystal Structure

- Different crystal structures (FCC, BCC, HCP) present different challenges
- Defect structures vs. perfect crystals have different error characteristics
- Structures with similar compositions but different symmetries may have different error patterns

### 7.3 Property Type

- Energy vs. force vs. stress predictions may have different error structures
- Some properties (elastic constants) are second derivatives and amplify errors
- Derived quantities (eigenvalues) vs. direct quantities (total energy)

### 7.4 Training Data Distribution

- Models trained on equilibrium configurations may fail on far-from-equilibrium
- Active learning may oversample certain regions of configuration space
- Transfer learning introduces dependencies on source domain

### 7.5 DFT Methodology

- The "ground truth" itself varies with DFT functional (PBE, SCAN, LDA)
- k-point sampling, energy cutoffs, and pseudopotentials introduce variation
- Self-consistent vs. non-self-consistent calculations

### 7.6 System Size

- Size-extensive errors may scale with system size
- Surface/interface effects in small systems
- Periodic boundary condition artifacts

---

## 8. Mathematical Coupling and Spurious Correlations

### 8.1 Mathematical Coupling: Archie (1981)

In 1981, J.P. Archie Jr. published "Mathematical coupling: a common source of error" in the *Annals of Surgery*, identifying a systematic source of spurious correlation in data analysis [^26^].

**Mathematical coupling** refers to artificial correlations that arise when variables share mathematical components or are derived from each other. Four types have been identified:

1. **Type 1**: Directional changes in functionally related variables
2. **Type 2**: Functional relationships with shared components
3. **Type 3**: Direct algebraic coupling (one variable calculated from another)
4. **Type 4**: Indirect or physiologic coupling through intermediary variables [^27^]

### 8.2 Relevance to Materials Benchmarking

Mathematical coupling is highly relevant to interatomic potential assessment:

- **Energy-per-atom vs. total energy**: Both share atomic count
- **Force errors vs. energy errors**: Both derive from the same potential surface
- **Elastic constants from stress-strain**: Derived from the same calculation
- **RMSE vs. MAE**: Both are computed from the same residuals
- **Training set vs. test set errors**: May share structural similarities

When comparing potential A and potential B, if both are evaluated on the same set of structures, the shared reference data creates a mathematical coupling that can inflate apparent correlations in performance [^28^].

### 8.3 Spurious Correlations from Ratio Variables: Kronmal (1993)

Richard Kronmal's 1993 paper "Spurious Correlation and the Fallacy of the Ratio Standard Revisited" extended Pearson's original work on spurious correlation [^29^]. Kronmal showed that:

1. Even if numerator and denominator of a ratio are uncorrelated with an independent variable, the ratio itself may be significantly correlated
2. Using a ratio as a dependent variable when the denominator is also an independent variable creates misleading results
3. Using ratios as independent variables can result in inadequate adjustment for component variables

### 8.4 Application to Benchmarking

Ratio variables are common in materials benchmarking:
- **Error per atom** (total error / atom count)
- **Performance relative to DFT** (potential value / DFT value)
- **Speedup factors** (CPU time reference / CPU time new method)
- **Accuracy-to-cost ratios**

Kronmal's analysis suggests these ratio-based metrics can introduce spurious correlations unless the component variables are also included in the analysis. The advice is to use a **full model** containing all component variables rather than pre-computed ratios [^30^].

### 8.5 Relationship to Simpson's Paradox

Mathematical coupling and spurious correlations from ratios create conditions favorable to Simpson's paradox:

1. Shared components create differential weighting across subgroups
2. Ratio variables can reverse correlations when stratified
3. The combination of confounding (element identity) and mathematical coupling (shared reference data) is particularly problematic

The preprint's finding that "aggregating across elements produces misleading benchmarks, and stratifying by pair_style reveals the true structure" is a textbook example of these interacting phenomena.

---

## 9. Synthesis: Implications for Materials Informatics

### 9.1 The Novelty of the Application

The application of Simpson's paradox and ecological fallacy analysis to computational materials benchmarking appears to be novel. While these statistical phenomena are well-known in epidemiology, social science, and medicine, their relevance to physical science benchmarking has not been systematically explored.

### 9.2 Key Findings Relevant to the Preprint

The preprint's central finding—that element identity is a confounder whose stratification reveals the "true structure" of potential benchmarking—aligns with:

1. **Pearl's causal framework**: Element identity is a confounder (common cause) that must be controlled for
2. **Kievit's detection framework**: The sign reversal upon stratification is a statistical marker of Simpson's paradox
3. **Robinson's ecological fallacy**: Aggregate benchmarks may not represent individual element performance
4. **Archie's mathematical coupling**: Shared reference data creates artificial correlations
5. **Kronmal's ratio analysis**: Aggregate error metrics may introduce spurious correlations

### 9.3 Recommendations for Benchmarking Practice

Based on this research, the following practices are recommended:

1. **Always stratify by element identity** when reporting benchmark results
2. **Report both aggregate and element-specific errors**
3. **Use causal diagrams** to identify potential confounders before analysis
4. **Avoid ratio-based metrics** unless component variables are also included
5. **Control for pair_style** (functional form) as a potential confounder
6. **Report sample sizes per subgroup** to identify differential weighting
7. **Use permutation tests** (following Kievit) to test for significant differences between subgroup and aggregate relationships

---

## References

[^1^]: Pearson, K., Lee, A., & Bramley-Moore, L. (1899). "Mathematical contributions to the Theory of Evolution.—VI. Genetic (Reproductive) selection." *Philosophical Transactions of the Royal Society of London*, Series A, 192, 257-330.

[^2^]: "Simpson's paradox - Causality, Correlation, Statistics." *Britannica*, 2026. https://www.britannica.com/topic/Simpsons-paradox/Problem-of-Causality

[^3^]: Pearl, J. (2009). *Causality: Models, Reasoning, and Inference* (2nd ed.). Cambridge University Press. Chapter 6.

[^4^]: Yule, G.U. (1903). "Notes on the theory of association of attributes in statistics." *Biometrika*, 2(2), 121-134.

[^5^]: Simpson, E.H. (1951). "The interpretation of interaction in contingency tables." *Journal of the Royal Statistical Society*, Ser. B, 13, 238-241.

[^6^]: Blyth, C.R. (1972). "On Simpson's paradox and the sure-thing principle." *Journal of the American Statistical Association*, 67(338), 364-366.

[^7^]: Bickel, P.J., Hammel, E.A., & O'Connell, J.W. (1975). "Sex bias in graduate admissions: Data from Berkeley." *Science*, 187(4175), 398-404.

[^8^]: "Simpson's paradox … and how to avoid it." *Norton, Significance, RSS*, 2015. https://rss.onlinelibrary.wiley.com/doi/full/10.1111/j.1740-9713.2015.00844.x

[^9^]: "Simpson's Paradox and Statistical Urban Legends." https://www.refsmmat.com/posts/2016-05-08-simpsons-paradox-berkeley.html

[^10^]: Robinson, W.S. (1950). "Ecological Correlations and the Behavior of Individuals." *American Sociological Review*, 15(3), 351-357.

[^11^]: Robinson, W.S. (1950). Ibid., pp. 340-341.

[^12^]: Selvin, H.C. (1958). "Durkheim's suicide and problems of empirical research."

[^13^]: "Revisiting Robinson: The perils of individualistic and ecologic fallacy." *PMC*, 2008. https://pmc.ncbi.nlm.nih.gov/articles/PMC2663721/

[^14^]: "Individuals are not small groups, II: The ecological fallacy." https://solomonkurz.netlify.app/blog/2019-10-14-individuals-are-not-small-groups-ii-the-ecological-fallacy/

[^15^]: Pearl, J. (2009). "Simpson's Paradox, Confounding, and Collapsibility." In *Causality* (2nd ed.), Cambridge University Press. Also: Pearl, J. (2014). "Understanding Simpson's Paradox." *The American Statistician*, 68(1), 8-13.

[^16^]: Hernan, M.A., Clayton, D., & Keiding, N. (2011). "The Simpson's paradox unraveled." *International Journal of Epidemiology*, 40(3), 780-785.

[^17^]: Pearl, J. (2014). "Understanding Simpson's Paradox." *The American Statistician*, 68(1), 8-13.

[^18^]: "Simpson's Paradox - Stanford Encyclopedia of Philosophy." (2021). https://plato.stanford.edu/archives/sum2021/entries/paradox-simpson/

[^19^]: Pearl, J. (2009). *Causality*, Chapter 3.

[^20^]: Selvitella, A. (2017). "The Simpson's paradox in quantum mechanics." *Journal of Mathematical Physics*, 58, 032101.

[^21^]: Paris, M.G.A. (2012). "Two quantum Simpson's paradoxes." *Journal of Physics A: Mathematical and Theoretical*, 45, 132001.

[^22^]: Kievit, R.A., Frankenhuis, W.E., Waldorp, L.J., & Borsboom, D. (2013). "Simpson's paradox in psychological science: a practical guide." *Frontiers in Psychology*, 4, 513.

[^23^]: Kievit, R.A., & Epskamp, S. (2012). "Simpsons: Detecting Simpson's Paradox." R package version 0.1.0. http://CRAN.R-project.org/package=Simpsons

[^24^]: "Detecting Simpson's Paradox - R Documentation." https://rdrr.io/cran/Simpsons/man/Simpsons.html

[^25^]: Based on Pearl's back-door criterion applied to materials benchmarking context.

[^26^]: Archie, J.P. Jr. (1981). "Mathematical coupling: a common source of error." *Annals of Surgery*, 193(3), 296-303.

[^27^]: "Mathematical coupling." Grokipedia. https://grokipedia.com/page/Mathematical_coupling

[^28^]: Tu, Y.K., & Gilthorpe, M.S. (2004). "Mathematical coupling can undermine the statistical assessment of clinical research." *Journal of Dental Research* illustrations.

[^29^]: Kronmal, R.A. (1993). "Spurious Correlation and the Fallacy of the Ratio Standard Revisited." *Journal of the Royal Statistical Society*, Series A, 156(3), 379-392.

[^30^]: Kronmal, R.A. (1993). Ibid. Section 4.

---

## Appendix: Key Claims Summary

| # | Claim | Source | Confidence |
|---|-------|--------|------------|
| 1 | Simpson's paradox was first identified by Pearson (1899), not Simpson (1951) | Britannica, Stanford Encyclopedia | High |
| 2 | The term "Simpson's paradox" was coined by Blyth (1972) | Norton 2015, RSS | High |
| 3 | Robinson (1950) showed ecological correlations can differ dramatically from individual correlations | Robinson 1950, cited >1150 times | High |
| 4 | Pearl's causal framework resolves Simpson's paradox by identifying causal structure | Pearl 2009, Hernan 2011 | High |
| 5 | Simpson's paradox has been proven to occur in quantum mechanics | Selvitella 2017, Paris 2012 | High |
| 6 | No prior literature documents Simpson's paradox in materials science benchmarking | Web search (no results) | Medium |
| 7 | The Kievit framework uses cluster analysis + permutation tests to detect Simpson's paradox | Kievit 2013, R package docs | High |
| 8 | Element identity is a confounder under Pearl's framework | Logical deduction from Pearl's criteria | High |
| 9 | Mathematical coupling (Archie 1981) creates spurious correlations from shared components | Archie 1981, Tu 2004 | High |
| 10 | Ratio variables in regression can produce spurious correlations (Kronmal 1993) | Kronmal 1993, JRSS A | High |
