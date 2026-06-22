# Cover letter — Physical Review X

**Manuscript:** The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint  
**Authors:** Alex Welcing (Lupine Science, Union City, NJ)  
**Corresponding author:** alexwelcing@gmail.com  
**ORCID:** https://orcid.org/0009-0002-1602-8545  

---

Dear Editor,

We submit for your consideration the manuscript *The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint*.

**Why PRX.** The paper turns a qualitative worry about multi-model agreement into a geometric law with three ingredients that fit the journal's scope: a machine-checked theorem chain (Lean 4, zero unproven obligations), two pre-registered factorial experiments at three layers of one epistemic stack (classical interatomic potentials, foundation machine-learned potentials, and DFT implementations), and explicit failure reporting (four of seven registered predictions failed). The result is cross-domain: it speaks to materials simulation, climate ensembles, and any field that treats model consensus as evidence.

**Core claim.** A model family acts as a projection operator. Fitting drives every member toward the nearest point of the family's reachable set, so the shared residual is a fingerprint of the binding constraint rather than evidence of truth. We prove the normal-cone consensus theorem, a participation-ratio gauge with explicit collapse rate, a ribbon/consensus decoupling theorem, an affine decomposition, a local normal-cone theorem for smooth non-convex immersions, and Hoeffding entrywise concentration of the empirical second-moment matrix. All seven theorems are build-locked in a pinned Mathlib corpus (77 theorems in `Vision.lean`, ~225 declarations, 0 `sorry`, 0 new axioms).

**Empirical design.** The law's sharpest consequence — *errors organize by constraint, not by implementation* — is tested with pre-registered factorial experiments: MatPES foundation MLIPs (4 architectures × 2 training functionals) and ACWF DFT implementations (12 methods, 384 unary crystals). Both refutation conditions were registered before computation; neither was triggered. The paper reports the failures alongside the successes, including an effect-size prediction that missed by ~3.5×.

**Reproducibility.** A two-tier replication kit (Tier 1: NumPy-only statistics from committed raw data; Tier 2: bit-exact harness re-deriving elastic constants from public checkpoints) ships with the paper and is archived on Zenodo at https://doi.org/10.5281/zenodo.20787874.

**Suggested reviewers.**
- Mark K. Transtrum (Brigham Young University) — sloppy-model universality and information geometry lineage.
- Michele Ceriotti or a colleague in the EPFL MLIP/UQ group — machine-learning interatomic potential uncertainty quantification.
- James D. Annan or a colleague from climate model dependence — cross-domain ensemble dependence.
- A reviewer familiar with the ACWF/verification literature — DFT pseudopotential/code reuse; data authorship is not authorship.

We declare no conflicts of interest. The manuscript is not under consideration elsewhere. Independent academic and adversarial reviews of the package are published alongside our public research library; the review findings have been incorporated into the submitted version.

Thank you for your consideration.

Sincerely,

Alex Welcing  
Lupine Science
