# `tools/` — Local CLIs and research helpers

This root is the local command surface for the repo: small scripts that drive
the control plane, prepare evidence campaigns, run promotion loops, and emit
telemetry. Keep tools small, runnable, and connected to `glim-think` or the
evidence ledger.

## What lives inside

| Category | Files |
| --- | --- |
| **Control-plane CLI** | `glim.py`, `test_glim.py` — dispatch work to the `glim-think` worker. |
| **Campaign helpers** | `mlip_evidence_campaign.py`, `mlip_evidence_launch.py`, `mlip_evidence_collect.py`, `mlip_evidence_report.py`, `mlip_local_lab.py`, `mlip_benchmark_sources.py` |
| **Promotion / filtering** | `mlip_local_promotion.py`, `mlip_regime_filter.py`, `regime_gate_flywheel.py`, `evaluate_ni_fixture_reference.py`, `build_ni_publication_fixture.py` |
| **Telemetry / traces** | `mlip_phoenix_trace.py`, `mlip_subspace_diagnostics.py` |
| **Long-demo registry** | `mlip_long_demo_registry.py`, `mlip_long_demo_ribbon_prep.py` — ribbon prep and demo registry management. |
| **MLIP/model analysis** | `mlip_sim_matrix.py`, `mlip_deep_accuracy_campaign.py`, `mlip_distill_atlas.py`, `mlip_kimi_evidence.py` |
| **Build support** | `build_mlip_first_day_viewer.py`, `build_ni_distill_support.py` |
| **Tests** | `test_*.py` for most tool modules. |
| **Python deps** | `requirements.txt`, `requirements-telemetry.txt` |

See individual files for CLI usage; most support `--help`.

## Install

```bash
cd tools
python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash); use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

Some tools also need the repo Python packages:

```bash
cd ../python
pip install -e ".[torchsim]"
```

Telemetry tools additionally need:

```bash
pip install -r tools/requirements-telemetry.txt
```

## Usage highlights

```bash
# Lab notebook: ask a free-text research question
python glim.py ask "Why does Cu LJ overestimate C44?" --asked-by alex

# Critiques: queue a peer-review markdown file
python glim.py critique queue ../archive/swarm_preprint_review/critique11.md
python glim.py critique pending

# Validate MLIP benchmark sources
python mlip_benchmark_sources.py validate

# Regime-filter a campaign
python mlip_regime_filter.py --campaign ../data/mlip_benchmarks/evidence_campaigns/mptrj_lane_b_paired_accuracy_v1.json --scope promotion-canary

# Dry-run the promotion loop
python mlip_local_promotion.py --run-dir ../tmp/mlip-local/<run_id>

# Smoke-test Phoenix telemetry
python mlip_phoenix_trace.py --smoke-test
```

## Tests

```bash
cd tools
python -m pytest -q
```

All `test_glim.py` HTTP calls are mocked; no network access is required.

## How it connects to the rest of the repo

- `glim.py` talks to `glim-think/`.
- `mlip_*` helpers read fixtures from `data/mlip_benchmarks/` and write results
  back to campaigns or the ledger.
- `mlip_local_promotion.py` and `regime_gate_flywheel.py` import
  `python/lupine_distill/`.
- `mlip_phoenix_trace.py` emits spans through `glim-think/otlp-relay/`.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Retired tools

Unused or superseded scripts live in [`archive/tools-retired/`](../archive/tools-retired/).

## Windows notes

- Prefer Git Bash or the root `justfile` wrappers for any multi-step shell work.
- Some tools spawn `gcloud`, `cargo`, or `pnpm`; route those through Git Bash to
  avoid PowerShell process-tree hangs.

## Related

- [`docs/ONBOARDING.md`](../docs/ONBOARDING.md) — new-contributor tracks
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — system map
- [`AGENTS.md`](../AGENTS.md) — MLIP flywheel telemetry rules
