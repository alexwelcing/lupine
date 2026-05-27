# MLIP Distill Real-Material Publication Plan

Status: dean's review draft
Date: 2026-05-27
Scope: first publishable real-material benchmark for Lupine Distill Accuracy
Review posture: written in the style of a senior materials-science gatekeeper,
not as an endorsement by any institution.

## Dean's Direction

This paper is not a dashboard story and not a "green cell" report. It must read
as a serious materials-science methods paper whose evidence would survive a
hard review from a national-lab PI, a journal editor, or a committee member who
has seen too many MLIP benchmarks overclaim from convenient examples.

The job of the paper is to establish one disciplined claim:

> If MLIP errors concentrate along versioned, learnable hyperribbon directions,
> then a canonical in-run Distill policy can improve or refuse MLIP predictions
> during a real materials calculation without retraining the source model.

Everything else is subordinate to that. We are not trying to show that Lupine is
always better than every potential. We are trying to show that a versioned,
auditable runtime layer can change the outcome of real calculations in a
physically responsible way: improving where evidence supports intervention,
refusing where it does not, and leaving already-good calculations unharmed.

The standard of proof is paired, stratified, and reproducible:

- paired: baseline and Distill Accuracy must be compared on the same sealed
  structures, raw checkpoints, or seeded trajectories;
- stratified: do not hide failures in aggregate means across incompatible
  materials or rows;
- reproducible: every table and figure must point back to immutable manifests,
  hashes, model identifiers, runner versions, and citation records.

## What The Reviewer Will Ask First

A serious reviewer will not begin with "is the product exciting?" They will ask:

1. Did you choose a fair material system, or only a place where your method
   wins?
2. Are the classical baselines real baselines, with real provenance, or straw
   men?
3. Is Distill acting during the calculation, or only correcting a report after
   the fact?
4. Did you protect against train/eval leakage?
5. Can another lab reproduce the run without inheriting the author's local
   workstation folklore?
6. Do the results improve energy-basin accuracy without breaking forces,
   stresses, elastic constants, or relaxation stability?
7. Do the negative cases teach the next ribbon version, or are they hidden?

This plan exists to make those answers obvious.

## Non-Negotiable Benchmark Shape

The first publishable benchmark needs two lanes.

### Lane A: FCC Nickel, EAM Home Turf

Use fcc Ni as the anchor material. This is the fair fight.

Why this lane earns trust:

- NIST IPR has extensive Ni EAM, MEAM, EMT, and related potential provenance,
  including original citations, files, and OpenKIM links.
- OpenKIM and NIST let us compare against classical potentials as serious
  baselines, not caricatures.
- Recent open benchmark work studies many OpenKIM Ni potentials with surfaces
  and extended defects, and reports the exact pattern we need for a fair test:
  many potentials handle lattice parameters, elastic constants, and surface
  energies well, while migration and short-range compression are harder.

Run packet:

- bulk lattice constant and relative energy curve;
- elastic constants from finite strain;
- vacancy formation energy and optional migration proxy if reference data are
  available;
- low-index surface energies, especially (100), (110), and (111);
- generalized stacking fault or short-range compression slices where the recent
  Ni benchmark reports degradation;
- `equilibrium_solve`: offset an fcc Ni lattice and measure how quickly each
  calculator returns toward the reference structure and energy basin.

Pass conditions:

- EAM/MEAM remain competitive on easy fcc Ni bulk mechanics. That is not a
  problem; it is the credibility anchor.
- Baseline MLIPs may win or lose by row, but every result must be traceable to
  the same fixture and scoring contract.
- Distill Accuracy must improve selected MLIP rows or explicitly refuse unsafe
  corrections. No hidden degradation on easy Ni bulk rows is acceptable.
- If Distill hurts easy Ni bulk metrics, that ribbon version is not ready for
  publication. Say so and use the failure to motivate the next version.

### Lane B: DFT/MLIP-Favored Hard System

Use a harder system from a recent open benchmark pool before choosing a single
heroic material. The preferred first source is MS25 because it is a 2025
materials-science benchmark dataset with metals, alloys, oxides, DFT labels,
speed-test inputs, and a CC BY 4.0 data license.

Candidate hard slices:

- Zr-O or oxide structures from MS25, because oxygen coordination and mixed
  bonding should stress EAM/MEAM-style assumptions.
- Li solid ion conductor slices, especially Li3YCl6 or Li6PS5Cl, after checking
  data accessibility and exact reference labels. Recent work benchmarked
  MatterSim, MACE, SevenNet, CHGNet, M3GNet, and ORBFF on solid ion conductors
  across energy, forces, thermodynamics, elastic moduli, and Li diffusion.

Run packet:

- static energy and force errors on sealed held-out structures;
- equilibrium/relaxation from controlled perturbations;
- force-call and wall-time trajectories;
- energy-basin closeness as the primary target;
- stress, forces, elastic moduli, and diffusion proxies as consistency checks;
- explicit failure classes: `non_converged`, `force_explosion`,
  `cell_collapse`, `energy_drift`, `stress_explosion`, `oscillation`,
  `wrong_equilibrium`, and `backend_runtime_error`.

Pass conditions:

- Do not force EAM/MEAM into chemically inappropriate systems and then celebrate
  their failure. If a classical baseline is not scientifically applicable,
  label it `not_applicable` and compare against available empirical or ML
  baselines.
- The hard lane must reveal whether the ribbon is useful under stress:
  `accept`, `delta_correct`, `tighten`, `backtrack`, `stop_early`, or `refuse`.
- Improvements must be physically coherent. An energy improvement that destroys
  force/stress behavior is not a win; it is a fault line.

## Experimental Contract

Every result must be reproducible from a sealed manifest. The manifest is not
administrative overhead; it is the paper's credibility backbone.

Required fields:

- `material_id`, structure source, license, citation, and content hash;
- support/eval split with no overlap;
- MLIP model id, package versions, CUDA/GPU facts, and runner image or local env
  identity;
- raw prediction checkpoint shared between baseline and Distill Accuracy when
  isolating accuracy effects;
- Distill ribbon version, policy candidate id, theorem/spec registry id, and
  Rust `atlas-distill` commit;
- calculator output artifacts, step trajectories, final structures, timing,
  retry count, and failure class.

Ownership boundaries:

- Python runner: backend import, ASE/LAMMPS/calculator integration, device
  placement, model loading, and raw prediction/trajectory execution.
- Rust `atlas-distill`: policy, scoring, fault-line extraction, refusal logic,
  theorem hooks, and hill-climb decisions.
- Cloudflare/glim-think: durable ledger, workflow state, public reports, and
  budget/resource evidence.
- Phoenix: experiment observability and comparison home, not the optimizer.

If these boundaries blur, the method becomes hard to reproduce and easy to
dismiss.

## Evaluation Standard

Primary metric: paired accuracy lift against raw MLIP baseline on the same raw
prediction checkpoint or same seeded relaxation trajectory.

Report at four levels:

1. Per-case: raw error, corrected error, action, refusal state, runtime, force
   calls, and artifact hashes.
2. Per-row: energy, forces, stress, elastic, relaxation/equilibrium solve.
3. Per-material: Ni bulk, Ni defects/surfaces, hard-system static, hard-system
   relaxation.
4. Aggregate: stratified mean, bootstrap confidence interval, no-harm counts,
   and failure-class distribution.

For `equilibrium_solve`, report the full anytime curve:

- final distance to reference;
- best distance reached;
- area under error-vs-step and error-vs-wall-time curves;
- time or force calls to threshold;
- marginal gain from extra steps, e.g. whether another 200 steps buys 5 percent
  or 0.2 percent;
- plateau and wrong-equilibrium detection.

Reviewer warning: do not claim acceleration from Distill Accuracy runs that
replay shared raw checkpoints. Those runs isolate accuracy. Speed claims require
a separate Distill Accuracy + Accelerate protocol without the shared-checkpoint
shortcut.

## Paper Draft Shape

Working title:

> Runtime Error Geometry for Machine-Learned Interatomic Potentials: A
> Real-Material Benchmark of Versioned Hyperribbon Distillation

Abstract instructions:

- Begin with the failure mode: real MLIP simulations fail during trajectories,
  relaxations, and off-equilibrium excursions; post-hoc leaderboards diagnose
  too late.
- State the method: Lupine Distill is a canonical Rust runtime policy layer
  grafted onto Python MLIP calculators through sealed prediction and trajectory
  contracts.
- State the benchmark: fcc Ni as EAM-home-turf plus a harder DFT/MLIP-favored
  system from an open benchmark pool.
- State the claim carefully: Distill improves selected baseline MLIP accuracy
  under paired, versioned conditions and identifies refusal/fault lines where
  it cannot safely improve.

Sections:

1. Introduction: from potential ranking to runtime error science.
2. Background: EAM/MEAM, universal MLIPs, hyperribbon/sloppy-model motivation,
   and why post-hoc evaluation is insufficient.
3. Materials and Data: Ni lane, hard lane, references, licenses, splits, and
   leakage guard.
4. Methods: MLIP runner, Rust Distill policy, equilibrium-solve protocol,
   shared checkpoints, and cloud/local reproducibility.
5. Evaluation: paired accuracy, anytime curves, no-harm gates, stratified
   statistics, failure taxonomy.
6. Results: baseline classical and MLIP behavior, Distill Accuracy lift, ribbon
   interventions, and negative cases.
7. Discussion: what improved, what refused, why this supports a versioned
   hyperribbon research program, and what remains unproven.
8. Reproducibility and Stewardship: artifact hashes, GCP commands, data
   citations, model citations, and public report.

Figures the paper must earn:

- architecture diagram: source MLIP, Rust Distill, evidence plane;
- material map: EAM-home-turf Ni vs hard DFT/MLIP-favored system;
- Ni baseline table: EAM/MEAM/OpenKIM vs MLIPs vs Distill;
- hard-lane table: raw MLIP vs Distill by row;
- equilibrium-solve trajectory: offset lattice drifting toward reference;
- anytime curves: error vs steps/time and marginal value of extra steps;
- intervention trace: accept/correct/tighten/backtrack/refuse over a run;
- reproducibility map: manifest, checkpoint, GCS/R2 artifact, Phoenix trace,
  paper figure.

## Citation And Stewardship Rules

Be generous and exact. Academic citizenship matters here.

- Cite NIST IPR and each original potential paper used from NIST/OpenKIM.
- Cite OpenKIM when using OpenKIM model IDs or computed-property references.
- Cite JARVIS-FF/NIST for classical-potential comparison tables.
- Cite MS25 or the selected solid-ion-conductor benchmark if used.
- Cite every MLIP backend and model checkpoint: MACE, CHGNet, M3GNet, ORB,
  SevenNet, UMA/MatterSim only when actually run.
- Cite datasets separately from papers when they have DOIs.
- Publish our own manifests, configs, result JSONL, plotting scripts, and
  failure cases.

Negative results are not embarrassment. They are how this becomes useful.

Claims to avoid:

- Do not say Distill is a new MLIP.
- Do not imply source MLIP weights were retrained unless they actually were.
- Do not say a hard-system classical baseline failed if the baseline is not
  scientifically applicable.
- Do not pool all materials into one headline number without stratified tables.
- Do not claim speedup until the accelerate protocol is run without shared
  accuracy checkpoints.
- Do not use "DFT-level" unless the exact DFT reference, functional, structure
  set, and error bars justify it.

## Implementation Milestones

### M0: Source Packet

Deliverable: a source manifest that a reviewer could audit before reading the
results.

- Status: implemented as `real-material-publication-v1`; validate with
  `python tools/mlip_benchmark_sources.py validate`.
- Created `data/mlip_benchmarks/manifest_sources.json` with candidate sources,
  citations, licenses, URLs, expected artifacts, and access instructions.
- Added `tools/mlip_benchmark_sources.py` to validate the packet, inspect the
  Ni inventory, and print ready local Ni bulk evidence.
- Confirmed the first local Ni EAM-style inventory from
  `atlas-distill/lammps_runs`; MEAM entries are tracked as candidates needing
  local LAMMPS evidence.
- Remaining: confirm which Ni potential files are actually used in the first
  paper figure and record any additional original citations.
- Confirm whether MS25 or the Li solid-ion-conductor source has the exact
  labels needed for our hard lane.
- Added initial `paper/references.bib` entries for the selected source packet.
- Add a short library-site page explaining why this benchmark is fair.

### M1: Ni Local Baseline

Deliverable: reproducible local Ni evidence, not a notebook.

- Status: Lane A bulk fixture implemented as
  `data/mlip_benchmarks/fixtures/ni_fcc_eam_home_turf_v1.json`; validate with
  `just mlip-ni-fixture-check`.
- Added a classical calculator lane for the NIST Mishin-1999 Ni EAM potential
  through ASE EAM.
- Built sealed Ni fixtures for bulk energy-volume, finite-strain elastic,
  stress, force, and fixed-cell offset-lattice relaxation rows.
- Remaining: add surface, defect, and short-range-compression fixtures only
  after exact open benchmark reference values are ingested.
- Run local EAM/MEAM, MACE, CHGNet, ORB, SevenNet where supported.
- Emit the same artifact schema as the existing MLIP runner.
- Produce the first Ni baseline table with citations attached to every
  reference value.

### M2: Ni Distill Accuracy

Deliverable: the first honest no-harm/accuracy-lift ribbon test.

- Reuse shared raw prediction checkpoints.
- Search energy-anchored ribbon policies in Rust.
- Promote only no-harm or positive-lift policies to GCP canaries.
- Publish per-row intervention and refusal traces.
- Mark any failed row as ribbon evidence, not as missing data.

### M3: Hard-Lane Ingest

Deliverable: one hard-lane slice that is small enough to run and serious enough
to cite.

- Select MS25 Zr-O/oxide or Li solid-ion-conductor slice based on open data
  availability, labels, and local/GCP cost.
- Seal support/eval splits.
- Run local baseline and narrow Distill triplets.
- Decide which classical baselines are valid, invalid, or not applicable.

### M4: GCP Reproducible Campaign

Deliverable: cloud evidence another lab could reproduce.

- Promote the exact local commands to Cloud Run Jobs.
- Run progress-checkpointed batches so partial success at 24, 50, or 100 cases
  is still usable evidence.
- Keep Cloudflare as ledger and Phoenix as experiment observability, not as the
  optimizer.
- Record Cloud Run job ids, image digests, package versions, GPU facts, and
  artifact URIs.

### M5: Paper And Public Report

Deliverable: figures and tables generated directly from artifacts.

- Generate tables and figures from result JSONL, not manual transcription.
- Publish report JSON, HTML, and figure assets.
- Draft the paper with explicit limitations and exact citations.
- Archive run manifests and artifacts under immutable names before submission.

## Initial Source List

- NIST Interatomic Potentials Repository, including Ni potential files and
  original potential citations: https://www.ctcms.nist.gov/potentials/
- NIST Ni system page: https://www.ctcms.nist.gov/potentials/system/Ni/
- JARVIS-FF / NIST classical-potential comparison data:
  https://materialsdata.nist.gov/handle/11256/702
- OpenKIM model repository and computed-property ecosystem:
  https://openkim.org/
- Thoms et al., "Benchmarking 34 OpenKIM Nickel Potentials with an Emphasis on
  Surfaces and Extended Defects," arXiv:2510.18033:
  https://arxiv.org/abs/2510.18033
- Maxson et al., "MS25: Materials Science-Focused Benchmark Data Set for
  Machine Learning Interatomic Potentials," DOI 10.18126/6w8c-by76:
  https://acdc.alcf.anl.gov/mdf/detail/74d6b3d9-c33c-47c4-9c9a-c14ca773d3c8-1.0/
- Du et al., "Universal Machine Learning Interatomic Potentials are Ready for
  Solid Ion Conductors," arXiv:2502.09970:
  https://arxiv.org/abs/2502.09970
- Chiang et al., "MLIP Arena," NeurIPS 2025 Datasets and Benchmarks Track:
  https://papers.nips.cc/paper_files/paper/2025/hash/bfa45223cc236855dbaa5c468c809896-Abstract-Datasets_and_Benchmarks_Track.html

## Final Gate

The paper is ready to draft only when this sentence is true:

> A skeptical materials scientist can rerun the sealed baseline and Distill
> Accuracy comparison, inspect every intervention and refusal, verify every
> cited reference value, and see that the claims remain stratified, paired, and
> physically coherent.

Until then, the correct posture is disciplined iteration, not promotion.
