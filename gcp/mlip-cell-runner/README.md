# MLIP Cell Runner

`mlip-cell-runner` is the GCP execution instrument for the
`mlip-baseline-grid` workflow in `glim-think`.

Cloudflare owns the run ledger and dispatches signed Cloud Tasks to
`tasks-consumer`. The consumer starts one of the allowlisted Cloud Run Jobs:

- `mlip-cell-mace`
- `mlip-cell-chgnet`
- `mlip-cell-m3gnet`
- `mlip-cell-orb`
- `mlip-cell-sevennet`

Each job uses the same runner contract and a backend-specific image. The runner
loads a manifest, runs one `(row_id, mlip_id)` cell, writes a JSON artifact to
GCS, and posts a Google-OIDC-authenticated `lupine.mlip.cell_result.v1` beat to
`glim-think`.

## Local Smoke

```bash
python mlip_cell_runner.py run-cell \
  --run-id local \
  --cell-id local:baseline:forces:chgnet \
  --row-id forces \
  --mlip-id chgnet \
  --manifest-url fixtures/tiny_manifest.json \
  --artifact-prefix ./out \
  --beat-emit-url http://127.0.0.1:8787/feed/beats \
  --dev-mode-bypass
```

The smoke requires the selected MLIP package to be installed. Missing backend
packages intentionally produce a failure beat rather than silently falling back.

## GCP Build And Canary

Build and create/update all five Cloud Run Jobs:

```bash
gcloud builds submit . \
  --config gcp/mlip-cell-runner/cloudbuild.yaml \
  --substitutions _PROJECT_ID=shed-489901,_REGION=us-central1
```

Run one bounded canary before launching a 25-cell Lab run:

```bash
gcloud run jobs execute mlip-cell-chgnet \
  --project=shed-489901 \
  --region=us-central1 \
  --wait \
  --args=run-cell,--run-id,canary,--cell-id,canary:baseline:energy:chgnet,--row-id,energy,--mlip-id,chgnet,--manifest-url,gs://shed-489901-atlas-inputs/mlip-baseline/canonical-structures-v1/manifest.json,--artifact-prefix,gs://shed-489901-atlas-outputs/mlip-baseline-grid/canary/energy/chgnet,--beat-emit-url,https://glim-think-v1.aw-ab5.workers.dev/feed/beats
```

The Cloud Build config uses `gcloud run jobs deploy`, so first deployment and
subsequent image updates use the same command path.
