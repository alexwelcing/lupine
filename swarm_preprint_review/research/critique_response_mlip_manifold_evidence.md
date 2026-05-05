# Response to Reviewer: MLIP Manifold Equivalence is a Hypothesis, Not a Demonstrated Result

**Manuscript:** *The Causal Geometry of Prediction Errors in Interatomic Potentials*
**Author:** Welcing (Lupine Materials Science)
**Journal:** Integrating Materials and Manufacturing Innovation (IMMI)
**Reviewer concern addressed:** Whether foundation MLIPs (MACE-MP, CHGNet, M3GNet) share the same low-dimensional elastic-error geometry as classical interatomic potentials.

---

## 1. Concession: the reviewer is right, and we owe a sharper claim

The reviewer correctly identifies that the favorable framing of the manuscript over-extrapolates. To be explicit: the D1 ledger underlying this work contains **1,115 records covering 559 classical interatomic potentials across 15 elements, and zero MLIP records.** The hypothesis tagged `h4_mlip_invariance` is hardcoded in the analysis pipeline as `status: "pending"`. It is, today, an *empirical conjecture* that has not been tested against a single foundation MLIP datapoint.

The reviewer also correctly characterizes the state of the MLIP literature. There is strong evidence that universal MLIPs are biased by their shared Materials Project–derived training data — most notably the systematic potential-energy-surface (PES) softening reported by Deng et al. (2024) for M3GNet, CHGNet, and MACE-MP-0 simultaneously, and the model-to-model variability on phonons and downstream simulation observables documented by EGraFFBench (Bihani et al. 2023), "Forces are not Enough" (Fu et al. 2023), and the recently launched MLIP Arena (Lin et al. 2025). What that literature supports is **shared data-distribution bias** as a serious and well-evidenced hypothesis. It does *not* support the stronger claim that "architecture invariance has been demonstrated" across MLIP families and classical force fields.

We therefore retract any phrasing in the favorable brief that implied MLIPs have already been *shown* to lie on the same elastic-error manifold. The manuscript's own limitations section was more cautious, and that caution is warranted. What follows is the protocol by which this gap will be closed in revision.

---

## 2. Reframing: from claim to falsifiable benchmark protocol

We replace the equivalence *claim* with an equivalence *test*. The proposed protocol is designed so that any of three distinct outcomes — full equivalence, partial equivalence, or full inequivalence — is informative and publishable, and so that the result does not depend on the success of any single MLIP family.

### 2.1 Models tested

We will benchmark five foundation MLIPs that span the architectural diversity of the field:

| Model | Reference | Architecture | Training corpus |
|---|---|---|---|
| **MACE-MP-0** | Batatia et al. 2024 (arXiv:2401.00096); MACE itself: Batatia et al. 2022 (arXiv:2206.07697) | Higher-order equivariant message passing | MPtrj (~1.6 M structures) |
| **CHGNet** | Deng et al. 2023, *Nat. Mach. Intell.* (arXiv:2302.14231) | Charge-informed GNN with magnetic moments | MPtrj (~1.5 M structures, 10 yr of MP relaxations) |
| **M3GNet** | Chen & Ong 2022, *Nat. Comput. Sci.* (arXiv:2202.02450) | Three-body GNN | Materials Project relaxation trajectories (89 elements) |
| **MatterSim** | Yang et al. 2024 (arXiv:2405.04967) | Active-learning-augmented GNN; broad T,P coverage | First-principles + active learning, 0–5000 K, up to 1000 GPa |
| **Orb (v2)** | Neumann et al. 2024 (arXiv:2410.22570) | Diffusion-pretrained scalable potential | MPtrj + Alexandria; 31% Matbench Discovery error reduction at release |

Including MatterSim and Orb is deliberate: they widen the training-data footprint beyond MPtrj-only, which is the sharpest available test of the "dataset *is* the manifold" hypothesis. If MatterSim — trained on a substantially different corpus with active-learning augmentation — lies on the *same* manifold as the three MPtrj-trained models, that is striking. If it does not, that itself isolates training data as the dominant axis of variation.

### 2.2 Element corpus

Identical to the classical study: the 15 metallic elements **Al, Cu, Ni, Ag, Au, Pt, Pd, Pb, Fe, Cr, Mo, W, V, Nb, Ta**. Same FCC/BCC split as the manuscript's Sec. 4 analysis. This holds the chemistry constant and isolates the model class as the only varying factor.

### 2.3 Properties

Three elastic constants per element, computed from finite-difference deformation:

- **C11**, **C12**, **C44** in standard cubic Voigt notation.

These are the same observables on which the 559 classical potentials in the D1 ledger were evaluated, so the resulting MLIP error vectors live in the *same R³ observable space* as the classical points. That is essential — manifold comparison only makes sense when the observable basis is identical.

### 2.4 DFT reference values

Reference C11/C12/C44 will be drawn from a single, consistent source per element to avoid cross-functional confusion:

- **Primary:** Materials Project elastic tensor entries (PBE+U where applicable for Fe/Cr; PBE for the rest), pulled per element with chemically pristine ground-state structures.
- **Cross-check:** the Wang et al. PBE elastic library and the de Jong et al. (2015) elastic tensor dataset, both of which have been the de facto reference for elastic-constant benchmarks.

This is one of the protocol's known weak points — see §6, Risks, item (1) — and we will report results against both reference sets so that the manifold conclusion does not hinge on a single DFT functional choice.

### 2.5 Measurement procedure

For each (element, model) pair:

1. Relax the conventional cubic cell to the model's predicted ground state via ASE BFGS, force tolerance 1 meV/Å.
2. Apply Voigt strains ε ∈ {−0.5%, −0.25%, 0, +0.25%, +0.5%} along the three independent cubic directions corresponding to C11, C12, C44.
3. Compute the resulting stress tensor at each strain (LAMMPS for MACE/M3GNet/Orb via the standard ASE interface; native CHGNet calculator; MatterSim via its provided ASE wrapper).
4. Linear-regress σ vs ε to extract Cij; bootstrap residuals to obtain a per-constant uncertainty.
5. Form the error vector **e** = (ΔC11, ΔC12, ΔC44) relative to the chosen DFT reference.

This is the textbook finite-difference elastic-constant protocol used by Wang et al., the Materials Project elastic-tensor pipeline, and the recent EGraFFBench evaluations. There is nothing novel in step 1–5 — that is intentional. The protocol's *only* novelty is feeding the resulting error vectors into the manifold-analysis machinery the manuscript already deploys for classical potentials.

### 2.6 Manifold analysis

We will reuse — without modification — the `analyze_manifold` routine from `atlas-distill` that produced the manuscript's Section 3 results. Concretely, for each model family we compute:

- **Participation ratio (PR/d)** of the empirical error covariance.
- **Mann–Kendall τ** for monotonic eigenvalue decay.
- **Log-spacing R²** of the eigenvalue spectrum (the sloppy-model log-linear test).
- **Bootstrap 95% CI on PR/d** with B = 1000 resamples.
- **Principal-direction angle** between the leading PC of MLIP errors and the leading PC of classical errors, per element subset and pooled.

Identical numerics, identical thresholds, identical code path. This is the only way the classical and MLIP results can be compared without arbitrating differences in the post-processing.

### 2.7 Discriminative test

The composite manifold-equivalence test passes when **all three** of the following hold:

1. **PR/d for the MLIP error matrix lies inside the bootstrap 95% CI of the classical-potential PR/d** (per-element and pooled).
2. **Principal-direction angle between MLIP and classical first PC is < 30°** (a generous threshold; tightening to 15° would be a stronger claim we are not ready to make).
3. **The hyper-ribbon classifier from §3 of the manuscript** — monotonicity + log-spacing R² > 0.8 + PR/d < 0.9 — fires for the MLIP error matrix with the *same* strengthened nulls the reviewer asked for in critique 11.

If all three fire across all five MLIP families, the equivalence claim is supported. Anything less is a partial result and will be reported as such.

---

## 3. Outcome scenarios — and what each means scientifically

We commit in advance to the interpretation of each possible outcome. This is the falsifiability requirement; without it, the protocol is theatre.

### Scenario A: Full equivalence (all 5 MLIPs pass all 3 criteria)

**Interpretation:** training-data bias dominates architecture. Foundation MLIPs and classical force fields, despite radically different functional forms, end up making elastic-prediction errors on the same low-dimensional manifold. The most parsimonious explanation is that *both* are constrained by the same equilibrium-biased reference data (MPtrj for MLIPs; experimentally measured equilibrium properties for classical fits), and the manifold is a fingerprint of the data, not the model class.

**Implication for the paper:** Claim 4 (universal applicability) is supported, with the strong qualifier that "universal" means "across model classes that share an equilibrium-biased reference distribution." This is a meaningful positive result, and it ties directly into the systematic-softening literature (Deng et al. 2024) — the same mechanism that softens MLIP PES curvature globally would also flatten the elastic-error manifold along its dominant directions.

### Scenario B: MLIPs share *a* manifold but it differs from the classical manifold

**Interpretation:** architecture or training paradigm matters at the level of error geometry. MLIPs are internally consistent — their error vectors cluster on a single low-dimensional subspace — but the orientation and curvature of that subspace differs from the classical one (e.g., principal-direction angle > 30°, or PR/d outside the classical CI).

**Implication:** Claim 4 is partially correct and needs scoping. The framework still applies (MLIPs *do* have a manifold), but the *specific* manifold identified for classical potentials is not universal. We would revise the manuscript to present two manifolds — classical and MLIP — as parallel diagnostic structures rather than a single shared one. The diagnostic methodology (PR/d, log-spacing, hyper-ribbon classifier) survives intact; only the universality claim narrows.

### Scenario C: Each MLIP family on its own manifold

**Interpretation:** "universal MLIPs" are not universal in error geometry. CHGNet errors, MACE errors, M3GNet errors, MatterSim errors, and Orb errors each cluster differently. The shared data-distribution bias hypothesis would have to be qualified: training data sets a *floor* on error structure but architecture imprints additional non-random variation.

**Implication:** This is the most damaging-to-the-thesis outcome, and it is also the most scientifically informative one. It would force us to rewrite §4 around model-family-specific diagnostics, and it would imply that the broader sloppy-model framework needs an architecture-aware extension when applied to learned potentials. It would also be a meaningful finding for the MLIP community, complementing Bihani et al.'s observation that no single architecture wins all benchmarks. We would publish it as such, even though it weakens the manuscript's headline.

We are committing in advance to all three interpretations. The protocol is set up so that a negative result is not a paper-killer — it sharpens what "universal" can mean.

---

## 4. Literature situating this protocol

The reviewer's concern is well grounded in a body of work that has matured rapidly between 2022 and 2025. The relevant citations:

1. **Batatia et al. 2024**, *A foundation model for atomistic materials chemistry* (arXiv:2401.00096) — MACE-MP-0 architecture, MPtrj training, broad-chemistry MD demonstration.
2. **Batatia et al. 2022**, *MACE: Higher-Order Equivariant Message Passing Neural Networks* (arXiv:2206.07697) — underlying architecture.
3. **Deng, Zhong, Jun, et al. 2023**, *CHGNet as a pretrained universal neural network potential for charge-informed atomistic modelling*, *Nature Machine Intelligence* 5, 1031–1041 (arXiv:2302.14231).
4. **Chen & Ong 2022**, *A universal graph deep learning interatomic potential for the periodic table*, *Nature Computational Science* 2, 718–728 (arXiv:2202.02450).
5. **Yang et al. 2024**, *MatterSim: A Deep Learning Atomistic Model Across Elements, Temperatures and Pressures* (arXiv:2405.04967).
6. **Neumann et al. 2024**, *Orb: A Fast, Scalable Neural Network Potential* (arXiv:2410.22570).
7. **Bihani et al. 2023/2024**, *EGraFFBench: Evaluation of Equivariant Graph Neural Network Force Fields for Atomistic Simulations* (arXiv:2310.02428; *Digital Discovery* 2024) — the first systematic GNN-MLIP benchmark to include phonons and to demonstrate that low force/energy error does not guarantee faithful MD or downstream observables.
8. **Fu et al. 2023**, *Forces are not Enough: Benchmark and Critical Evaluation for Machine Learning Force Fields with Molecular Simulations*, *TMLR* (arXiv:2210.07237) — explicit demonstration that force-error MAE is decoupled from derived-property accuracy.
9. **Riebesell et al. 2025**, *Matbench Discovery* (arXiv:2308.14920; *Nature Machine Intelligence* 2025) — leaderboard establishing that universal MLIPs dominate stability prediction but that error structure differs across families.
10. **Deng et al. 2024**, *Overcoming systematic softening in universal machine learning interatomic potentials by fine-tuning* (arXiv:2405.07105; *npj Comput. Mater.* 2024) — direct experimental evidence that M3GNet, CHGNet, and MACE-MP-0 all exhibit systematic PES softening tied to near-equilibrium training bias, and that fine-tuning corrects much of it. **This is the single paper most supportive of the "shared data-distribution bias" hypothesis** and is the most concrete prior reason to expect Scenario A above.
11. **Yu et al. 2024**, *Systematic assessment of various universal machine-learning interatomic potentials* (arXiv:2403.05729) — model-to-model differences across five uMLIP families on identical tasks.
12. **MLIP Arena 2025** (arXiv:2509.20630) — open benchmarking platform documenting cross-family variance in derived properties, providing infrastructure we can pull comparison numbers from.
13. **Loew et al. 2025**, *Universal machine learning interatomic potentials are ready for phonons*, *npj Comput. Mater.* — the most recent positive evidence that several uMLIPs reproduce phonon spectra reliably, which provides indirect support for elastic-constant fidelity.

The honest read of this literature today: there is direct evidence for shared *bias* (Deng 2024 systematic softening), evidence for cross-family *differences* on derived properties (Bihani 2023, Fu 2023, Yu 2024), and no published study that has explicitly tested whether MLIP error vectors share a low-dimensional manifold with classical force fields. That is the gap the proposed protocol fills.

---

## 5. Why this is the right defense

The protocol is the right defense because it is *falsifiable*, *cheap*, and *directly diagnostic* of the universality claim.

**Falsifiable.** Each of the three discriminative criteria (§2.7) has a sharp pre-registered threshold. We are not free to declare success after the fact by tuning the criterion; the thresholds are stated here, before the experiments are run. A negative or partial result is a publishable scientific finding — we are not betting the manuscript on a single outcome.

**Cheap.** A universal MLIP elastic-constant calculation on a single-element cubic cell with a 5-point strain sweep is fast — CHGNet on a CPU runs at roughly 1 second per single-point evaluation; MACE-MP-0 on a single GPU is similar. The full sweep is **15 elements × 3 elastic constants × 5 strain points × 5 models = 1,125 single-point evaluations**, plus relaxation. Even allowing 10× overhead for relaxation, geometry preparation, and the slower models, the total compute is in the order of 30 minutes on a workstation GPU and a few hours on CPU. This is well within revision-cycle scope and does not require cluster access.

**Directly diagnostic.** Because we are reusing the manuscript's own `analyze_manifold` pipeline against the same observable space (C11, C12, C44 errors for the same 15 elements), the comparison is not mediated by any new statistical assumption. Whatever the outcome, it can be read directly off the same plots that already exist for the classical case. There is no auxiliary modeling step that could bias interpretation.

**Honest about negative outcomes.** A finding that MLIPs do *not* share the classical manifold is, scientifically, a stronger contribution than a vague positive. It would mean the framework distinguishes model classes — which is exactly what a diagnostic should do — and it would direct the field toward architecture-specific error analysis. We say this explicitly in §3 because the temptation to soft-pedal a negative result must be resisted.

---

## 6. Risks and what could go wrong

We list three concrete risks, in decreasing order of severity, that could compromise the interpretation. Each has a planned mitigation.

**Risk 1: DFT reference mismatch.** The 559 classical potentials in the D1 ledger were fit to a heterogeneous set of references — many to experimental elastic constants from the 1980s–1990s, some to early DFT calculations using LDA or GGA functionals that pre-date PBE. The MLIPs, in contrast, are trained on Materials Project PBE data. If we benchmark MLIP errors against Materials Project PBE references, we are comparing apples to oranges versus the classical errors, which were measured against a different (and inhomogeneous) reference set. *Mitigation:* report MLIP errors against both Materials Project PBE and against the same experimental references the classical potentials were originally fit to (to the extent they can be reconstructed from the OpenKIM and NIST archives), and report the manifold analysis under both choices. If the manifold conclusion flips between the two reference sets, that is itself the headline finding — and it would constitute a separate critique of cross-era benchmarking practices.

**Risk 2: Elastic constants are out-of-distribution for some MLIPs.** Foundation MLIPs are trained on energies and forces, not directly on elastic constants. The accuracy of finite-difference Cij extraction depends on the model's local curvature near equilibrium, which is exactly the property documented by Deng et al. (2024) to be systematically softened. *Mitigation:* this is partially the *point* — if all five MLIPs share the same softening pattern, that itself is evidence of a shared low-dimensional error structure and supports Scenario A. We will report unsoftened (raw foundation-model) and lightly fine-tuned (single-point per element correction, following Deng 2024) results separately, so the manifold geometry can be inspected before and after the dominant known bias is removed.

**Risk 3: Functional/dataset bias propagation.** Materials Project PBE under-binds many transition metal elastic constants by 5–15% versus experiment in known systematic ways. If both the MLIP errors and the DFT references inherit this bias in correlated fashion, we may "see" a manifold that is in fact a property of the reference choice rather than of the model class. *Mitigation:* the principal-direction angle test (criterion 2 in §2.7) is invariant to overall scaling and to common-mode shifts; what it isolates is the *direction* of dominant error variation. A spurious manifold from correlated reference bias would shift PR/d but should not align principal directions with the classical case unless the underlying manifold structure is genuinely shared. Reporting both PR/d and the angle separately disentangles the two effects.

There are also two minor risks worth flagging: (a) the LAMMPS interface for newer MLIPs varies in maturity and we may need to standardize on the ASE calculator path even where LAMMPS would be faster; (b) MatterSim and Orb both have model-version churn, and we will pin specific released checkpoints (MatterSim v1.0.0 small/large; Orb v2) to make the result reproducible.

---

## 7. Implementation status and timeline

A Python harness is being written in a sibling commit at:

```
swarm_preprint_review/scripts/mlip_benchmark/
```

The skeleton script `mlip_benchmark_protocol.py` already exists in `swarm_preprint_review/scripts/`; the harness directory will contain per-model wrappers (`run_mace.py`, `run_chgnet.py`, `run_m3gnet.py`, `run_mattersim.py`, `run_orb.py`), a shared elastic-constant driver (`elastic.py`) that reuses the same finite-difference protocol across all backends, and a manifold-analysis caller (`manifold.py`) that imports `analyze_manifold` from atlas-distill. Outputs land in a parallel D1-shaped ledger (`mlip_d1.csv`) so the same analysis pipeline can ingest them without modification.

**Timeline commitment:**

- **Week 1–2:** preliminary CHGNet results on a 5-element subset (Al, Cu, Ni, Fe, W — covering both FCC and BCC). Single model, single reference set. Reported as a preprint update.
- **Week 3–4:** MACE-MP-0 and M3GNet added on the same 5-element subset, allowing the first cross-architecture comparison.
- **Week 5–8:** full 15-element corpus, all 5 models, both DFT reference sets, full manifold analysis. This is the version included in the IMMI revision.

Preliminary results will be posted to the public repository (`atlas-distill/`, the same repository the reviewer audited) as soon as they are available, with raw stress-strain data and analysis scripts so that the result is independently reproducible from the moment it is reported.

---

## 8. What we are committing to in the revised manuscript

In the revised manuscript:

1. The current Section 4 paragraph that implies MLIP equivalence will be **explicitly downgraded to a stated hypothesis** (`H4`) with the protocol of §2 as its planned test.
2. The limitations section will be **expanded** to spell out — using the reviewer's own framing — the distinction between "shared data-distribution bias" (which the literature supports) and "architecture invariance of error geometry" (which it does not yet support).
3. Section 4 will gain a **new subsection** (4.x) presenting the protocol of this response and the predicted outcomes of §3, even before the experiments are complete. This makes the falsifiability commitment part of the published record.
4. As soon as preliminary CHGNet results are in, they will be added to the revision as a separate appendix, with a clear statement of which discriminative criteria they pass and which they fail.

---

## 9. Closing

The reviewer has done us a service. The original phrasing extrapolated beyond the data, and the corrective is not a defense of the original wording but a concrete experimental program to either substantiate it or refute it. The protocol above is designed so that the manuscript benefits in either case — by either confirming a striking universality result or by sharpening the diagnostic framework into something explicitly model-class-aware. We have no scientific stake in which of the three scenarios in §3 occurs; we have a strong stake in finding out which one does, on the same observable basis, with the same analysis code, against the same elemental corpus.

We thank the reviewer for the precision of the critique and look forward to reporting the results in revision.
