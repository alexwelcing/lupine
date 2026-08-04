Dr. [Editor-in-Chief Name]
Editor-in-Chief
Integrating Materials and Manufacturing Innovation (IMMI)

Dear Dr. [Editor-in-Chief Name],

We are pleased to submit our manuscript, "The Causal Geometry of Prediction Errors in Interatomic Potentials: A Hyper-Ribbon Manifold Analysis with Ecological Fallacy Detection," for consideration as a full article in Integrating Materials and Manufacturing Innovation (IMMI).

**Novelty and Significance**

This paper presents the largest systematic analysis of interatomic potential prediction errors to date, examining 559 classical potentials across 15 benchmark metals (1,677 data points) and extending the analysis to three foundation machine-learning interatomic potentials (MACE-MP-0, CHGNet, Orb-v3). Our central finding is that prediction errors are not unstructured noise but occupy strictly bounded, low-dimensional "hyper-ribbon" manifolds---a signature of sloppy model universality that persists across both classical and MLIP modeling paradigms.

The paper makes four distinct contributions that we believe are of high interest to the IMMI readership:

1. **Geometric characterization of errors.** We show that elastic constant errors for all 559 potentials occupy manifolds with effective dimensionality 1.05--1.86 out of 3, regardless of functional form (EAM, MEAM, Tersoff, BOP). This is the first demonstration of sloppy model hyper-ribbon geometry in the interatomic potential literature at this scale.

2. **Crystal-structure dichotomy.** We discover a striking BCC/FCC pattern: all 7 BCC metals show strong reference--prediction correlations (r > 0.70, mean r = 0.89), while 7 of 8 FCC metals show near-zero correlation (r < 0.40, mean r = 0.16). This is a novel form of structural confounding with immediate implications for benchmarking protocol design.

3. **Methodological rigor.** We apply random-effects meta-analysis (I² = 98.6%), ecological fallacy detection, bootstrap uncertainty quantification, and permutation testing---methods rarely used in materials benchmarking but essential for valid cross-element comparison. We also identify and control for a sample-size confounder in cross-style PC1 alignment analysis, demonstrating that fitting depth must be reported alongside any per-element accuracy metric.

4. **Cross-paradigm universality.** Our extension to foundation MLIPs confirms that the hyper-ribbon structure is invariant across modeling paradigms: 14 of 15 elements retain participation ratio < 2.0 when MACE-MP-0, CHGNet, and Orb-v3 are added to the ensembles. This suggests the hyper-ribbon is a property of the observable landscape, not the model architecture.

**Fit for IMMI**

IMMI's scope explicitly includes "materials informatics, computational materials science, and data-driven discovery." Our work sits at the intersection of all three: it uses large-scale data analysis (559 potentials) to reveal geometric structure in computational materials predictions, with direct implications for how the community benchmarks and validates interatomic models. The open-source atlas-distill engine and full reproducibility package align with IMMI's emphasis on transparent, reusable research infrastructure.

**Suggested Reviewers**

- Dr. James P. Sethna (Cornell University) — sloppy model theory, hyper-ribbon geometry
- Dr. Gábor Csányi (University of Cambridge) — machine-learning interatomic potentials, MACE
- Dr. Mark Asta (University of California, Berkeley) — interatomic potential benchmarking, OpenKIM
- Dr. Aditi Krishnapriyan (University of California, Berkeley) — MLIP benchmarking, ML for materials
- Dr. Matthias Scheffler (Fritz Haber Institute) — materials informatics, benchmark design

**Conflicts of Interest**

The authors declare no competing financial interests. This work was supported by Lupine Science / Hyper-Ribbon Inc. All data and code are released under the MIT License.

We thank you for considering our manuscript and look forward to your response.

Sincerely,

Alexander Welcing
Lupine Science / Hyper-Ribbon Inc.
alex@lupine.io

---

**Manuscript Details**
- Title: The Causal Geometry of Prediction Errors in Interatomic Potentials: A Hyper-Ribbon Manifold Analysis with Ecological Fallacy Detection
- Article Type: Full Article
- Word Count: ~6,500 words (main text)
- Figures: 7 (6 existing + 1 new cross-paradigm comparison)
- Tables: 3 (hyper-ribbon classification, meta-analysis, foundation-MLIP extension)
- References: ~45
- Data Availability: All data and code at https://github.com/alexwelcing/lupine
