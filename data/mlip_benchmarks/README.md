# MLIP Benchmark Source Packets

This directory stores auditable source ledgers for real-material MLIP/Distill
benchmarks. These files are not scratch notes. They are the citation, license,
local-path, and benchmark-lane spine that future local and GCP campaigns must
reference.

## Current Packet

`manifest_sources.json` defines `real-material-publication-v1`:

- Lane A: fcc Ni as the EAM/MEAM home-turf benchmark.
- Lane B: a harder DFT/MLIP-favored oxide or solid-ion-conductor slice.
- NIST, OpenKIM, JARVIS-FF, MS25, solid-ion-conductor, MLIP Arena, and modern
  defect benchmark sources.
- Local Ni classical inventory from `atlas-distill/lammps_runs`.

Validate it before launching work:

```powershell
python tools/mlip_benchmark_sources.py validate
```

Inspect the Ni classical candidates:

```powershell
python tools/mlip_benchmark_sources.py ni-inventory
```

Inspect the ready local Ni bulk evidence:

```powershell
python tools/mlip_benchmark_sources.py ni-bulk-results
```

## General Research Source Registry

`../research_sources/materials_research_sources_v1.json` is the broad reusable
registry for materials datasets, papers, model repositories, and validation
resources. It is deliberately larger than the current benchmark packet: OMat24,
LeMat-Traj, MPtrj, GST phase-change sources, high-pressure crystal structures,
MatterSim, OpenKIM, ColabFit, and NIST IPR all live there with claim boundaries.

Validate and inspect the registry before creating a new fixture family:

```powershell
python tools/research_source_registry.py validate
python tools/research_source_registry.py summary
python tools/research_source_registry.py claim-matrix
python tools/research_source_registry.py ingest-plan --claim state_condition_coverage --claim phase_change_labels
python tools/research_source_registry.py verify-live
```

The key rule is that source roles stay separate. OMat24 can seed finite
temperature and stress/pressure-state examples. GST sources can seed
phase-change labels. LeMat-Traj and MPtrj are broad crystal/trajectory support
sources. MatterSim/OpenKIM/NIST are comparison and validation resources, not
truth labels unless a specific property record is ingested with its own
provenance.

Build the sealed fcc Ni fixture:

```powershell
python tools/build_ni_publication_fixture.py
```

Evaluate the fixture against its own Mishin-1999 EAM reference calculator:

```powershell
python tools/evaluate_ni_fixture_reference.py
```

Validate and materialize the paired baseline versus Distill Accuracy evidence
campaign:

```powershell
python tools/mlip_evidence_campaign.py validate
python tools/mlip_evidence_campaign.py write-batches
python tools/mlip_evidence_campaign.py commands --kind upload
python tools/mlip_evidence_campaign.py commands --kind run-batch --wait
```

For the live cloud lane, prefer the ledgered launcher after the jobs have been
deployed with the expected image tag:

```powershell
python tools/mlip_evidence_launch.py --require-image-tag paired-evidence-20260527a
python tools/mlip_evidence_collect.py
python tools/mlip_evidence_report.py
```

The default evidence campaign is
`data/mlip_benchmarks/evidence_campaigns/ni_lane_a_paired_accuracy_v1.json`.
It expands to 50 cells: five rows, five MLIPs, and two variants. Each Distill
Accuracy cell depends on the paired baseline cell and consumes the same
raw-prediction checkpoint URL in read-only mode, so an accuracy claim can be
traced to the exact MLIP prediction surface it modified.

## Policy

- Every publication result must point back to a source packet.
- Every source must have a URL, citation key, license note, and stewardship
  instruction.
- Every local evidence path marked `ready_local_evidence` must exist.
- Hard-lane classical baselines must be marked `not_applicable` when the
  chemistry makes EAM/MEAM invalid.
- Negative rows and failed runs are evidence for the next ribbon version, not
  data to hide.
