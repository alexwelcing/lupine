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

## Kimi 2026-06-07 Evidence Import

`kimi_2026_06_07/` stores the curated subset of Kimi's MLIP universality export:
Cloud Run cross-MLIP v7 results, irrep Vandermonde evidence, real early-exit
timing, MLIP/MD refusal-policy data, and a deterministic follow-up agenda.

Validate it with:

```powershell
python tools/mlip_kimi_evidence.py --check
python -m pytest tools/test_mlip_kimi_evidence.py
python tools/mlip_kimi_evidence.py --write-agenda
```

Use `docs/science/kimi-mlip-universality-import.md` for the review decision and
`docs/runbooks/cross-mlip-cloud-experiment.md` for the cloud rerun hazards.

## Discovery Loop

The scheduled elastic benchmark now feeds the Cloudflare analyzer workflow
`mlip-discovery-loop`. Each GitHub run annotates records with provenance,
ingests them into the D1 ledger, opens a workflow campaign, and asks
`/maintain` to materialize follow-up agenda tasks. See
`docs/runbooks/mlip-discovery-loop.md`.

## Policy

- Every publication result must point back to a source packet.
- Every source must have a URL, citation key, license note, and stewardship
  instruction.
- Every local evidence path marked `ready_local_evidence` must exist.
- Hard-lane classical baselines must be marked `not_applicable` when the
  chemistry makes EAM/MEAM invalid.
- Negative rows and failed runs are evidence for the next ribbon version, not
  data to hide.
