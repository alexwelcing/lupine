# From Fantasy Frameworks to Makeable Materials: A Prospectus for Formalized MOF Discovery

> **Status:** Direction. Describes where this work is aimed. Not a result.
>
> **Date:** 2026-06-25 (revised 2026-11-11)
> **Scope:** Metal–organic frameworks (MOFs), covalent organic frameworks (COFs), and other reticular / complex molecular structures
> **Summary:** A proposed set of Lean-checked rules for when an AI-generated framework is worth trying to make, written as hypotheses to test. Lupine has no MOF result yet; nothing here has been run against a lab.

---

## The headline

Generative AI can now invent millions of new metal–organic frameworks. What it cannot yet do is say which of them can be made.

In the first half of 2026 that gap has been described as a central bottleneck in materials AI. A *Chemical Science* perspective published in June calls synthetic likelihood “a fundamental challenge” and argues the field must move from performance-driven screening to **synthesis-informed design**, with free energy as the physically grounded metric.[^1] A January 2026 analysis reported that of thousands of computational MOF screenings, only about a dozen had been accompanied by actual synthesis.[^2]

We propose to extend the **OpenDistillationFactory** Lean formalization toward a “makeability layer” for AI-generated frameworks: explicit, checkable rules that a candidate must satisfy before it is worth a lab's time. Whether such rules actually predict which syntheses succeed is the hypothesis to test, not a finding.

---

## A one-minute primer

For readers who do not spend their days inside reticular chemistry or proof assistants:

- **MOFs** are crystalline sponge-like materials built from metal “nodes” and organic “linkers.” Their pores can store hydrogen, capture CO₂, separate gases, or host catalysts. Because the building blocks are modular, the design space is astronomical.
- **Generative AI** (diffusion models, graph neural networks, large language models) can now propose new MOFs at machine speed. Recent systems include MatterGen, GNoME, MOF-LLM, and ChatMOF.
- **The synthesis gap:** a structure that is stable on a computer screen may be kinetically inaccessible, chemically incompatible with real solvents, or so strained that it collapses the moment it is isolated.
- **Formalization** means encoding stated rules of MOF assembly, stability and synthesis in a proof assistant (we use **Lean 4**). Lean 4 checks the arithmetic and stated inequalities behind a rule; it does not check the physics, the reference data or the pipeline. A Lean-checked rule is only as good as its assumptions and its thresholds.

---

## Why now? The H1 2026 landscape

Published work in 2026 is moving on synthesis speed and on generation. Researchers reported that an alternating electric field can cut MOF synthesis from overnight to 15–60 minutes without added heat or catalysts,[^3] and a June 2026 study described light-driven synthesis “beyond thermodynamic constraints.”[^4] Tsinghua and Nanjing University’s **MOF-LLM** targets block-level MOF structure prediction.[^5] Patent analyses show heavy activity in covalent organic frameworks.[^6] Microsoft’s **MatterGen** demonstrated property-conditioned diffusion for inorganic crystals,[^7] and Google DeepMind’s **GNoME** seeded an active-learning recipe now replicated across the field.[^8] Foundation machine-learning interatomic potentials such as **MACE-MP-0** are increasingly used for production molecular dynamics.[^9] Public programmes such as the NSF AI-for-Materials institutes and DARPA FY2026 materials studies describe the same priority.[^10][^11]

The common thread: the field is moving past “generate more structures” toward **which generated structures are worth making?**

---

## What explicit rules could add

### For materials scientists: reproducibility, not just novelty

- A shared vocabulary for **valid assembly** (charge balance, valence, topology, no atomic clashes).
- Explicit **stability thresholds** drawn from the literature, not from model optimism.
- A **data-audit layer** for the structural errors, duplicate polymorphs and oxidation-state mistakes reported in curated databases.[^12]
- Synthesis-condition predicates that connect a candidate structure to a real protocol: solvothermal, electric-field, microwave or mechanochemical.

### For AI-for-science teams: stated constraints on generator output

- **Hard constraints** on generator output: valid chemistry, periodic symmetry, novelty with respect to training data.
- **Benchmarks** defined by checkable properties, not just leaderboard rankings.

Each of these is a hypothesis: that a rule written this way removes bad candidates without removing good ones. Our own measurements of machine-learned interatomic potentials are a caution here. In four preregistered campaigns in July 2026 (Round 4), no gate passed, and every selected Δ-correction made catalyst-adsorption holdout error worse (see the [program README](../README.md)). Rules for MOFs would need the same kind of preregistered test.

---

## The proposed formalization roadmap

We would build the rules as a series of Lean modules. None of them exists yet as a tested tool.

### 1. `ReticularAssembly.lean` — what is a valid structure?

A typed grammar of MOF/COF/reticular materials: metal nodes / secondary building units (SBUs); organic linkers with connectivity and symmetry; topology nets from the Reticular Chemistry Structure Resource (RCSR); periodic embeddings and collision-free assembly.

**Statement class:** charge balance, valence satisfaction and net compatibility are decidable for a given assembly.

### 2. `Synthesizability.lean` — can it be made?

Rules for the free-energy and kinetic-accessibility arguments that the *Chemical Science* perspective identifies as central:[^1] free-energy window relative to competing phases; linker-strain bounds; solubility and solvent-compatibility predicates; synthesis-condition models.

**Statement class:** a structure satisfies the stated rules under a specified protocol. Whether satisfying them predicts a successful synthesis is an empirical question that only lab results can answer.

### 3. `StabilityBound.lean` — will it survive operation?

Thermal, chemical and mechanical stability thresholds, plus defect tolerance: collapse thresholds under adsorption/desorption cycles; defect-density bounds that preserve pore connectivity; polymorph stability landscapes.

### 4. `GenerativeValidity.lean` — what can a generator propose?

Invariants for generators: chemical validity (charge, valence, collision-free); novelty (distance to the training set and known databases); symmetry and periodicity; topology consistency.

### 5. `MOFDataAudit.lean` — is the training data trustworthy?

Predicates for database integrity: correct oxidation states; unique identity up to symmetry; disorder and partial-occupancy flags; experimental vs. simulated provenance.[^12]

### 6. `MultiObjectiveDiscovery.lean` and 7. `AutonomousLab.lean`

Longer-term: Pareto-front convergence for conflicting objectives, and safety/compliance invariants for an automated synthesis loop.

---

## How it would be tested

A rule set like this only matters if it is tested against syntheses that were attempted, including the failures:

1. **Write the rules down** in Lean, with literature thresholds and their sources.
2. **Preregister the test:** before any results are seen, state which candidates the rules accept and reject and what pass/fail line would count as useful.
3. **Compare against real outcomes:** published or newly attempted syntheses, successes and failures alike.
4. **Publish the verdict** (pass, fail or abstain) and record any amendment made after results are seen.

We want to work with labs that attempt syntheses and are willing to share both successes and failures under an agreed data framework. No such collaboration exists today.

---

## Where we would start

A narrow first slice:

1. **ReticularAssembly** for one well-studied MOF family (e.g., Zr-carboxylate MOFs such as UiO-66 / UiO-67).
2. **Synthesizability** for one synthesis modality (e.g., electric-field-assisted solvothermal synthesis, following the 2026 literature).[^3]
3. **StabilityBound** for one operational stressor (e.g., solvent-removal / activation stability).
4. **DataAudit** for one public database (e.g., CoRE MOF).

---

## Contact

Research partners, model builders, press and investors: alex@lupinesci.com.

---

## References and notes

[^1]: “Interrogating the synthetic likelihood of metal–organic frameworks: a digital discovery perspective,” *Chem. Sci.*, 2026. DOI: [10.1039/D6SC02765B](https://pubs.rsc.org/en/content/articlehtml/2026/sc/d6sc02765b).
[^2]: HyperAI, “Highly Accurate and Fast Prediction of MOF Free Energy via Machine Learning,” Jan 2026. [https://hyper.ai/en/news/48685](https://hyper.ai/en/news/48685).
[^3]: *Chemistry World*, “Electrifying MOF synthesis drastically reduces time it takes to make them,” May 2026. [https://www.chemistryworld.com/news/electrifying-mof-synthesis-drastically-reduces-time-it-takes-to-make-them/4023477.article](https://www.chemistryworld.com/news/electrifying-mof-synthesis-drastically-reduces-time-it-takes-to-make-them/4023477.article).
[^4]: “Building Frameworks With Light: Breakthrough in Precise Synthesis of MOFs Beyond Thermodynamic Constraints,” *Rare Metals*, June 2026. [https://www.researchgate.net/publication/407543642_Building_Frameworks_With_Light_Breakthrough_in_Precise_Synthesis_of_MOBs_Beyond_Thermodynamic_Constraints](https://www.researchgate.net/publication/407543642_Building_Frameworks_With_Light_Breakthrough_in_Precise_Synthesis_of_MOBs_Beyond_Thermodynamic_Constraints).
[^5]: Pan et al., “Enhancing Spatial Reasoning in Large Language Models for Metal-Organic Frameworks Structure Prediction,” KDD 2026. [https://arxiv.org/html/2601.09285v2](https://arxiv.org/html/2601.09285v2).
[^6]: PatSnap, “Covalent Organic Framework Technology Landscape 2026,” Apr 2026. [https://www.patsnap.com/resources/blog/articles/cof-technology-landscape-2026-35-patent-insights/](https://www.patsnap.com/resources/blog/articles/cof-technology-landscape-2026-35-patent-insights/).
[^7]: Zeni et al., “A generative model for inorganic materials design,” *Nature*, Jan 2025. [https://www.nature.com/articles/s41586-025-08628-5](https://www.nature.com/articles/s41586-025-08628-5).
[^8]: Merchant et al., “Scaling deep learning for materials discovery,” *Nature*, Nov 2023; 2026 analysis at [https://iotdigitaltwinplm.com/geometric-deep-learning-materials-discovery-gnome-mattergen-2026/](https://iotdigitaltwinplm.com/geometric-deep-learning-materials-discovery-gnome-mattergen-2026/).
[^9]: MACE-MP-0 and Allegro/MACE class potentials are discussed in the 2026 geometric-deep-learning overview at [https://iotdigitaltwinplm.com/geometric-deep-learning-materials-discovery-gnome-mattergen-2026/](https://iotdigitaltwinplm.com/geometric-deep-learning-materials-discovery-gnome-mattergen-2026/).
[^10]: GrantedAI, “NSF AI-Materials Institute (NSF AI-MI) (2026).” [https://grantedai.com/grants/nsf-ai-materials-institute-nsf-ai-mi-national-science-foundation-nsf-8eb3788c](https://grantedai.com/grants/nsf-ai-materials-institute-nsf-ai-mi-national-science-foundation-nsf-8eb3788c).
[^11]: DARPA, FY2026 Materials Sciences Studies and Concepts justification. [https://comptroller.war.gov/Portals/45/Documents/defbudget/FY2026/budget_justification/pdfs/03_RDT_and_E/RDTE_Vol1_DARPA_MasterJustificationBook_PB_2026.pdf](https://comptroller.war.gov/Portals/45/Documents/defbudget/FY2026/budget_justification/pdfs/03_RDT_and_E/RDTE_Vol1_DARPA_MasterJustificationBook_PB_2026.pdf).
[^12]: White et al., “High Structural Error Rates in ‘Computation-Ready’ MOF Databases Discovered by Checking Metal Oxidation States,” *J. Am. Chem. Soc.*, 2025.
