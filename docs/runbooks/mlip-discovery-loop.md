# MLIP Discovery Loop

The MLIP elastic benchmark is now wired as a closed evidence loop rather than a
standalone GitHub artifact.

## Loop Shape

1. GitHub Actions calls the HF Space and writes `mlip_records.jsonl`.
2. `tools/glim_mlip.py` attaches GitHub run provenance to every record.
3. `POST /ingest/batch` normalizes snake_case or camelCase benchmark records
   and writes valid rows to the D1 `records` ledger.
4. `POST /research/workflows/mlip-discovery-loop/campaigns` opens an analyzer
   campaign for that benchmark run.
5. `POST /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/maintain`
   converts analyzer actions into durable `intelligence_tasks`.
6. The existing per-element `/run` fanout performs the detailed manifold/causal
   analysis for the same benchmark evidence.

## Analyzer Contract

Workflow id:

```text
mlip-discovery-loop
```

Canonical campaign id for GitHub benchmark runs:

```text
github:<github_run_id>
```

Primary routes:

```text
GET  /research/workflows/mlip-discovery-loop
POST /research/workflows/mlip-discovery-loop/campaigns
GET  /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/ops
POST /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/maintain
GET  /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/units/next
POST /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/units/:unit_id/evaluate
```

The analyzer emits three practical sentinel kinds:

- `high_error`: property-level error is large enough to need interpretation.
- `stability_violation`: predicted cubic elastic constants violate basic
  guards such as `C11 > C12` or `C44 > 0`.
- `cross_model_gap`: a single-MLIP batch needs MACE/SevenNet comparison before
  transfer or shared-geometry claims are made.

## Verification

Focused checks:

```powershell
python -m pytest tools\test_glim_mlip.py
npm --prefix glim-think run test -- src/research/__tests__/mlipDiscoveryWorkflow.test.ts src/research/__tests__/workflowRoutes.test.ts
npm --prefix glim-think run lint
actionlint .github\workflows\mlip-benchmark.yml
```

Use `just think-lint` before merging broader control-plane changes.
