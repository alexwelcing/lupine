# `data/` — Shared fixtures and manifests

This root holds small, cited, auditable data assets that multiple compute roots
share. Large artifacts live in GCS/R2; this directory keeps the manifests and
fixtures that point to them.

## What lives inside

| Directory / File | Purpose |
| --- | --- |
| `mlip_benchmarks/` | MLIP benchmark source packets, fixtures, evidence campaigns, and ribbons. |
| `mlip_benchmarks/manifest_sources.json` | Canonical source ledger for `real-material-publication-v1`. |
| `mlip_benchmarks/fixtures/` | Sealed local fixtures (e.g. fcc Ni). |
| `mlip_benchmarks/evidence_campaigns/` | Paired baseline-vs-Distill campaign definitions. |
| `mlip_benchmarks/ribbons/` | Ribbon artifacts and ribbon-prep payloads. |
| `mlip_benchmarks/kimi_2026_06_07/` | Curated Kimi MLIP universality evidence import. |

See [`mlip_benchmarks/README.md`](./mlip_benchmarks/README.md) for the full
benchmark-data operating guide.

## Install

No install step. This root is read by `tools/`, `python/`, `gcp/`, and
`mlip_immi/` scripts.

## Validate

```bash
# Validate the canonical source packet
python tools/mlip_benchmark_sources.py validate

# Inspect Ni classical candidates
python tools/mlip_benchmark_sources.py ni-inventory

# Validate and materialize the paired evidence campaign
python tools/mlip_evidence_campaign.py validate
python tools/mlip_evidence_campaign.py write-batches
```

## Policy

- Every publication result must point back to a source packet.
- Every source must have a URL, citation key, license note, and stewardship
  instruction.
- `ready_local_evidence` paths must exist.
- Negative rows and failed runs are evidence, not data to hide.
- Large artifacts stay in GCS/R2; this directory keeps only manifests and small
  fixtures.

## How it connects to the rest of the repo

- `tools/` reads and writes campaign manifests and fixtures here.
- `python/lupine_distill/` consumes fixtures for benchmarks and uplift tests.
- `gcp/mlip-cell-runner/` uses manifests to run cloud cells.
- `mlip_immi/` uses local fixtures for real-data analysis.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Windows notes

- Paths in manifests are POSIX-style and resolved at runtime; use Git Bash or
  Python path handling rather than manual Windows backslash edits.
