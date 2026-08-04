# From Fantasy Frameworks to Makeable Materials: A Prospectus for Formalized MOF Discovery

> **A proposal for a joint research-and-formalization program**
>
> **Date:** 2026-06-25  
> **Scope:** Metal–organic frameworks (MOFs), covalent organic frameworks (COFs), and other high-value reticular / complex molecular structures  
> **Description:** Why the next leap in AI-driven materials science needs theorem-proved certificates of synthesizability, and how a lab partnership can close the generate–test–learn loop.  
> **Audience:** Investors, materials scientists, and AI-for-science teams  
> **Status:** Draft for discussion

---

## The headline

Generative AI can now invent millions of new metal–organic frameworks. What it cannot yet do is **promise that any of them can be made**.

In the first half of 2026, that gap has become the central bottleneck in materials AI. A *Chemical Science* perspective published in June calls synthetic likelihood “a fundamental challenge” and argues the field must move from performance-driven screening to **synthesis-informed design**, with free energy as the physically grounded metric.[^1] A January 2026 analysis put the scale of the problem in stark terms: of thousands of computational MOF screenings, only about a dozen had been accompanied by actual synthesis.[^2]

We propose the next phase of the **OpenDistillationFactory** formalization effort: a theorem-proved “makeability layer” for AI-generated materials, built in partnership with a research organization that can both generate structures and test them in a lab.

The goal is a flywheel in which every simulated candidate carries a formal certificate of validity, every experiment updates the certificate rules, and every cycle makes the next cycle faster.

---

## A one-minute primer

For readers who do not spend their days inside reticular chemistry or proof assistants:

- **MOFs** are crystalline sponge-like materials built from metal “nodes” and organic “linkers.” Their pores can store hydrogen, capture CO₂, separate gases, or host catalysts. Because the building blocks are modular, the design space is astronomical.
- **Generative AI** (diffusion models, graph neural networks, large language models) can now propose new MOFs at machine speed. Recent systems include MatterGen, GNoME, MOF-LLM, and ChatMOF.
- **The synthesis gap:** a structure that is stable on a computer screen may be kinetically inaccessible, chemically incompatible with real solvents, or so strained that it collapses the moment it is isolated. Most AI-generated MOFs are, in effect, fantasy frameworks.
- **Formalization** means encoding the rules of MOF assembly, stability, and synthesis in a proof assistant (we use **Lean 4**) and proving theorems about them. The output is not a prediction; it is a **certificate**: a machine-checkable argument that a candidate satisfies stated assumptions.

The question this prospectus answers is: what would a formalized materials-discovery pipeline look like, and why should a materials-generation lab partner with us to build it?

---

## Why now? The H1 2026 landscape

**China** is pushing the synthesis frontier. In May 2026, researchers reported that an alternating electric field can cut MOF synthesis from overnight to 15–60 minutes without added heat or catalysts.[^3] A June 2026 study described light-driven synthesis “beyond thermodynamic constraints.”[^4] Tsinghua and Nanjing University’s **MOF-LLM** is the first large-language-model system for block-level MOF structure prediction.[^5] Chinese institutions also dominate the patent landscape for covalent organic frameworks.[^6]

**The United States** is pushing the generative-model and autonomous-lab frontier. Microsoft’s **MatterGen** demonstrated property-conditioned diffusion for inorganic crystals.[^7] Google DeepMind’s **GNoME** seeded an active-learning recipe that is now being replicated across the field.[^8] Foundation machine-learning interatomic potentials such as **MACE-MP-0** are replacing DFT in production molecular dynamics at national labs.[^9] The NSF AI-for-Materials Research Institutes and DARPA FY2026 materials programs are investing heavily in “scientific AI” that extracts generalizable abstractions from experimental data.[^10][^11]

The common thread: both sides have moved past the “generate more structures” phase and are converging on the same question: **which generated structures are worth making?**

That is a formalization problem in disguise.

---

## What formalization adds to each stakeholder

### For investors: de-risk the bet

Materials AI has produced eye-popping demos, but the path from demo to product is littered with structures that look good on paper and fail in the lab. A formalized pipeline changes the investment case:

- **Makeability certificates** turn synthetic likelihood from a hunch into an auditable predicate.
- **Data network effects** arise because every failed synthesis, when encoded formally, improves the next generation of certificates.
- **IP moat** comes from the theorem library itself: a competitor can copy a model, but it cannot quickly copy a machine-checked theory of what the model is allowed to propose.
- **Capital efficiency** improves because the lab queue is pre-filtered by rigorous constraints, not just model confidence.

### For materials scientists: reproducibility, not just novelty

The experimental side of the field is already wary of AI-generated structures that do not survive contact with reality. Formalization offers:

- A shared vocabulary for **valid assembly** (charge balance, valence, topology, no atomic clashes).
- Explicit **stability thresholds** drawn from the literature, not from model optimism.
- A **data-audit layer** that catches the structural errors, duplicate polymorphs, and oxidation-state mistakes that plague curated databases.[^12]
- Synthesis-condition predicates that connect a candidate structure to a real protocol: solvothermal, electric-field, microwave, or mechanochemical.

### For AI-for-science teams: correctness as a feature

Generative models for materials face the same correctness challenge as large language models: they can hallucinate. Formalization gives those models a guardrail:

- **Hard constraints** on generator output: valid chemistry, periodic symmetry, SE(3) equivariance, novelty with respect to training data.
- **Benchmarks** defined by provable properties, not just leaderboard rankings.
- **Uncertainty quantification** tied to certificate coverage: a candidate is either inside the certified region or flagged as outside.

---

## The proposed formalization roadmap

We would build the makeability layer as a series of Lean modules. Each module addresses a distinct gap in the current pipeline.

### 1. `ReticularAssembly.lean` — what is a valid structure?

A typed grammar of MOF/COF/reticular materials:

- Metal nodes / secondary building units (SBUs).
- Organic linkers with connectivity and symmetry.
- Topology nets from the Reticular Chemistry Structure Resource (RCSR).
- Periodic embeddings and collision-free assembly.

**Key theorem class:** charge balance, valence satisfaction, and net compatibility are decidable for a given assembly.

### 2. `Synthesizability.lean` — can it be made?

The core makeability certificate. It formalizes the free-energy and kinetic-accessibility arguments that the *Chemical Science* perspective identifies as central:[^1]

- Free-energy window relative to competing phases.
- Linker-strain bounds.
- Solubility and solvent-compatibility predicates.
- Synthesis-condition models: solvothermal, electric-field, microwave, mechanochemical, sonochemical.

**Key theorem class:** if a structure satisfies the makeability certificate under a specified synthesis protocol, then it is synthesizable *under the assumptions encoded in the certificate*.

### 3. `StabilityBound.lean` — will it survive operation?

Thermal, chemical, and mechanical stability thresholds, plus defect tolerance:

- Framework collapse thresholds under adsorption/desorption cycles.
- Defect-density bounds that preserve pore connectivity.
- Polymorph stability landscapes.

This module directly connects to our existing work on error geometry and smooth projections: a stable framework is one whose geometric neighborhood contains no low-energy collapse mode.

### 4. `GenerativeValidity.lean` — what can the generator legally propose?

Invariants for diffusion models, graph neural networks, and LLMs that generate structures:

- Chemical validity (charge, valence, collision-free).
- Novelty: lower bound on distance to the training set and to known databases.
- Symmetry: SE(3) and periodicity are respected.
- Topology consistency: the generated structure realizes the claimed net.

### 5. `MOFDataAudit.lean` — is the training data trustworthy?

Formal predicates for database integrity:

- Correct oxidation states.
- Unique identity up to symmetry.
- Disorder and partial-occupancy flags.
- Experimental vs. simulated provenance.

This addresses the documented “high structural error rates” in computation-ready MOF databases.[^12]

### 6. `MultiObjectiveDiscovery.lean` — can we optimize multiple properties at once?

Pareto-front convergence for conflicting objectives such as CO₂ uptake, water stability, and cost. We would formalize active-learning regret bounds adapted to discrete materials spaces.

### 7. `AutonomousLab.lean` — can the robot be trusted?

A long-term formal model of the closed loop:

- AI planner → robotic synthesis → automated characterization → feedback.
- Safety invariants (no banned precursor combinations).
- Compliance invariants (temperature, pressure, reagent limits).
- Convergence guarantees: objective improves or uncertainty shrinks under stated assumptions.

---

## The partnership flywheel

A formalization effort in isolation is valuable; a formalization effort **tethered to a real lab** is transformative. We are looking for a partner organization with:

1. A high-throughput **materials-generation platform** (generative models, structure databases, or computational screening pipelines).
2. Access to **automated or semi-automated synthesis and characterization** (robotic synthesis, flow chemistry, PXRD, gas-adsorption, electron microscopy, etc.).
3. A willingness to share **both successes and failures** under an agreed data framework.

The flywheel works like this:

```
┌─────────────────────────────────────────────────────────────┐
│  1. FORMALIZE   →  Define makeability/stability predicates   │
│                 in Lean using literature thresholds.         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SIMULATE    →  Partner’s generator proposes candidates.  │
│                 Only certified candidates pass the filter.   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SYNTHESIZE  →  Lab tests certified candidates.           │
│                 Success *and* failure are logged.            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. FEEDBACK    →  Experimental results refine predicates.   │
│                 Failed syntheses tighten the certificate.    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              (back to 1, with stronger theory)
```

Each loop does three things:

- **Reduces the number of pointless experiments.** Candidates that violate a hard constraint never reach the lab.
- **Turns failures into assets.** A failed synthesis, once formalized, becomes a theorem that rules out an entire class of future candidates.
- **Builds a defensible knowledge base.** The growing proof library is a durable asset that improves every model the partner trains on it.

---

## Where we start

We do not propose boiling the ocean. The first 12–18 months would focus on a narrow, high-impact slice:

1. **ReticularAssembly** for one well-studied MOF family (e.g., Zr-carboxylate MOFs such as UiO-66 / UiO-67).
2. **Synthesizability** for one synthesis modality (e.g., electric-field-assisted solvothermal synthesis, following the 2026 literature).[^3]
3. **StabilityBound** for one operational stressor (e.g., solvent-removal / activation stability).
4. **DataAudit** for one public database (e.g., CoRE MOF or a partner-internal dataset).
5. A **closed-loop pilot** in which the partner generates candidates, our predicates filter them, the partner synthesizes a prioritized subset, and the results update the predicates.

This narrow scope lets each side show measurable value before scaling.

---

## Why us

The **OpenDistillationFactory** project has already built a machine-checkable theory of error geometry for machine-learning interatomic potentials. The most recent milestone, `ExactTubularUniversality.lean`, closed its last formal gap using a theorem-proved tubular-neighborhood framework and is now fully built by `lake build` with **zero remaining `sorry` axioms**. The project inventory currently stands at **85 formally proven lemmas** and **0 documented epistemic gaps**.[^13]

That track record matters because the next phase is harder: we are moving from geometry to chemistry. But the discipline is the same—state assumptions explicitly, prove theorems under those assumptions, and let experimental data tighten the assumptions.

---

## Call to action

If you are:

- a **materials-generation lab** (national lab, university group, or startup) with automated synthesis capacity,
- an **AI-for-science team** building generative models for MOFs, COFs, or complex molecular solids, or
- an **investor** looking for a differentiated way to de-risk materials-AI portfolios,

we would like to talk.

The next frontier in materials discovery is not generating more structures. It is **proving which ones are worth making**.

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
[^13]: OpenDistillationFactory `Vision.lean` inventory, updated 2026-06-25: 85 proven lemmas, 0 documented epistemic gaps; full `lake build` passes.
