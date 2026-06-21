# Foundation Materials Models Need Trust Layers, Not Just Bigger Benchmarks

**Status:** proposed / publication-ready library memo
**Publication date:** 2026-06-20
**Audience:** materials labs, MLIP builders, and observers evaluating the Lupine evidence trail.

## Human summary

Universal machine-learning interatomic potentials and generative materials models have become good enough to change the substrate of materials discovery. The bottleneck is no longer only “can we generate or relax more candidates?” It is “which prediction is reliable enough to spend DFT, synthesis, or lab time on?”

Lupine’s next public lane should frame itself as the correction and trust layer for that substrate. The system should not claim to have discovered a new material yet. It should publish evidence-carrying canaries: sealed candidate sets, paired baseline-vs-correction comparisons, property-specific guards, refusal logs, and kill criteria.

## The literature signal

Recent public work points in the same direction:

- MatterSim and related universal atomistic models broaden the usable domain of MLIPs across elements, temperatures, and pressures.
- CHGNet, MACE, ORB, SevenNet, MatterSim, and other foundation potentials are now practical defaults for screening and relaxation workflows.
- GNoME and MatterGen-style systems make candidate generation abundant.
- Battery, phonon, pressure, zeolite, surface, and kinetics benchmarks show that good average force or energy error does not certify every property decision.
- Active-learning, uncertainty, evidential, and delta-correction papers increasingly treat “when to trust the model” as the central question.

The Lupine article thesis should be simple: foundation models make screening cheap enough that correction, calibration, and evidence become the scarce layer.

## Property-specific trust contracts

A single MLIP accuracy number is not a discovery certificate. Each material candidate should carry separate trust status for the property being used:

| Trust contract | What it certifies | What can break it |
| --- | --- | --- |
| Relaxation trust | relaxed geometry is physically plausible | hidden phase change, unstable tensor, force explosion |
| Energy-ranking trust | candidates are ordered correctly enough for screening | functional bias, stoichiometry bias, support mismatch |
| Force/MD trust | finite-temperature trajectory is usable | drift, rare-event failures, bad local curvature |
| Phonon trust | dynamical stability and second derivatives are credible | imaginary modes, displacement sensitivity, Hessian collapse |
| Migration-barrier trust | NEB / hop barriers are decision-relevant | wrong transition state, barrier ranking inversion |
| Surface/catalysis trust | adsorption and reaction surfaces are credible | bulk-training extrapolation, charge/coverage effects |
| Pressure/temperature trust | model survives thermodynamic extrapolation | out-of-domain pressure, phase-boundary instability |
| Electronic-property trust | structure is suitable for band/optical claims | MLIP geometry confidence does not imply electronic accuracy |

## Ranked Lupine target lanes

### 1. Li solid-ion and Li-channel dynamics

This is the strongest discovery-facing wedge. The repo already contains a LiFePO4 local canary where a paired correction improves final position RMSE from about 0.131 Å to about 0.042 Å under a force guard. That is not a conductivity discovery, but it is exactly the kind of sealed paired result that can mature into a battery trust lane.

Next gate: lock a public solid-ion-conductor reference subset such as Li3YCl6 or Li6PS5Cl, run MACE/CHGNet/ORB/SevenNet baselines and corrections, and score position, force, stress, energy drift, migration proxy, and refusal rate.

Kill if the correction improves position while worsening force/stress, fails shared-checkpoint pairing, or cannot lock a redistributable reference.

### 2. MPtrj broad-DFT canary

The MPtrj canary is the best bridge beyond the controlled Ni fixture. The support-floor v2 cloud result reports eight paired comparisons, six improvements, two safe holds, and zero regressions. That is a useful evidence-contract result, not a universal model-improvement result.

Next gate: replay the row-hybrid v3 policy in Cloud Run with force/stress/elastic rows promoted to first-class gates.

Kill if the win remains energy-only while the article implies broader model improvement.

### 3. Ni vacancy and defect transport

Ni is a credibility anchor. The broad Ni paired-accuracy campaign rejected promotion: 25 measured pairs, zero improvements, ten regressions, and fifteen unchanged. That negative result is useful because the gate caught harm. A local Ni vacancy canary is promising but not yet externally locked.

Next gate: lock vacancy formation, local relaxation, and migration references before promoting any defect-transport claim.

Kill if bulk anchors regress or the local improvement fails cloud/shared-checkpoint replay.

### 4. Fe magnetic MLIP failure audit

Fe remains strategically important, but the old “persistent PR outlier” line is not currently citable after Born screening. The credible target is narrower: a magnetic mechanical-stability failure audit for Fe and related transition metals.

Next gate: compare spin-aware and spin-agnostic references under Born screening, phonon stability, elastic stability, and coupling-aware nulls.

Kill if matched screened inputs remove the effect or if the signal is explained by one invalid tensor.

### 5. Au and heavy noble-metal surfaces

Au escape is a good hypothesis target, especially for catalyst-adjacent surfaces, but it remains open. The bulk pre-screening signal should become a surface/adsorbate canary with Ag/Pt/Pd controls.

Next gate: low-index slabs and simple adsorbates with MACE/CHGNet/ORB/SevenNet, reporting scalar errors plus error-subspace geometry.

Kill if ORB/SevenNet do not reproduce the effect or if a group-level noble-metal explanation beats Au-specificity.

### 6. Phonon / Hessian trust for semiconductors, vdW materials, and ionic oxides

Phonons are strategically important because they expose second-derivative failures that scalar energy/force metrics can hide. Current repo evidence is mostly protocol and review, so this should be framed as the next canary protocol unless pilot measurements are added.

Next gate: a small sealed phonon subset across Si/Ge/diamond, MgO/Al2O3/SrTiO3, and graphite/MoS2/h-BN.

Kill if reference functional mismatch dominates or displacement-size sensitivity changes the conclusion.

## Recommended public artifact format

Every top-priority target should ship as an evidence-carrying candidate, not as a press release:

- material or class;
- model family;
- property target;
- baseline artifact;
- corrected artifact;
- reference source and license;
- support-domain signal;
- uncertainty/calibration signal;
- refusal decision;
- no-regression checks;
- kill criterion;
- LUPI or library route for inspection.

## Working-paper patches implied by this memo

1. Replace any scalar “MLIP accuracy” language with property-specific trust contracts.
2. Say explicitly that correction is decision-specific: barrier trust is not phonon trust, and geometry trust is not electronic-property trust.
3. Treat generative discovery outputs as candidates that need evidence, not as discoveries by default.
4. Promote batteries and catalysts only where the repo has sealed canaries or a concrete next gate.
5. Keep construction/cement and broad catalyst discovery out of the headline until there is a source packet and a measured canary.

## Bottom line

The next Lupine publication should not overclaim a new material. It should show the infrastructure that makes future material claims worth believing: a trust layer that catches negative transfer, refuses unsafe corrections, and publishes the evidence trail attached to each candidate.
