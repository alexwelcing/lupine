# MLIP Cell Runner

`mlip-cell-runner` is the execution instrument for the `mlip-baseline-grid`
and real `mlip-5x5x3` workflows in `glim-think`.

Cloudflare owns the run ledger and dispatches signed Cloud Tasks to
`tasks-consumer`. The consumer starts one of the allowlisted Cloud Run Jobs:

- `mlip-cell-mace`
- `mlip-cell-chgnet`
- `mlip-cell-m3gnet`
- `mlip-cell-orb`
- `mlip-cell-sevennet`
- `mlip-cell-uma` (cloud-first canary, gated UMA checkpoint access)

Each job uses the same runner contract and a backend-specific image. The runner
loads a manifest, runs one `(row_id, mlip_id)` cell, writes a JSON artifact to
GCS, and posts a Google-OIDC-authenticated `lupine.mlip.cell_result.v1` beat to
`glim-think`.

For the broader local/GCP/Hugging Face operating loop, see
`docs/MLIP_EXECUTION_PLAYBOOK.md`.

Backend ids, target jobs, requirements files, canary rows, and preferred cloud
flavors are tracked in `backend_catalog.json`. The local harness reads this
catalog directly:

```bash
python tools/mlip_local_lab.py --list-backends
```

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

## Release Fixture Contract

The Lab baseline lane now fails closed on release input quality. A real baseline
manifest must use `lupine.mlip.fixture_manifest.v2`, include
`reference_provenance`, and provide row-native physical cases for all five rows:

- `energy_volume`: multiple volume/EOS points with `energy_ev_per_atom`
- `forces`: displaced structures with nonzero `forces_ev_per_angstrom`
- `stress`: strained structures with `stress_gpa`
- `elastic_constants`: at least six `strain_voigt` cases plus
  `elastic_constants_gpa`
- `relaxation_stability`: perturbed starts with relaxation thresholds and
  reference relaxed targets

The runner reports `fixture_contract`, `row_metrics`, cold load time, warm
inference time, model id, image digest, package versions, and CUDA facts in
every completed beat. Legacy `canonical-structures-v1` and tiny smoke manifests
are useful for wiring checks, but they are not accepted for release baselines.

## Distill Runtime Variants

Baseline remains the default:

```bash
--variant-id baseline --distill-profile off
```

The 5x5x3 workflow can run the same sealed evaluation manifest with active
runtime policies:

```bash
--variant-id distill_accuracy --distill-profile accuracy \
  --support-manifest-url fixtures/canonical_distill_support_v1.json

--variant-id distill_accuracy_accelerate --distill-profile accuracy_accelerate \
  --support-manifest-url fixtures/canonical_distill_support_v1.json
```

Distill variants write `distill_runtime`, `support_manifest_hash`,
`interventions`, `refusals`, `theorem_hooks`, and a `distill_events.jsonl`
artifact. For local iteration without a Worker, use `--local-jsonl beats.jsonl`
instead of `--beat-emit-url`.

The MLIP runner is intentionally generic: it loads an MLIP backend, computes
row-native predictions, and delegates Distill decisions to a policy engine.
Use the Rust canonical ribbon engine when available:

```bash
--distill-policy-engine rust \
  --ribbon-version hyperribbon-v1 \
  --atlas-distill-bin atlas-distill/target/debug/atlas-distill
```

`--distill-policy-engine auto` uses Rust when the binary is present and records
`python_fallback` otherwise. Baseline cells never invoke Distill.

For Distill variants, the runner batches all prediction decisions in the cell
through one `atlas-distill distill-policy --request-jsonl` call. That keeps the
MLIP adapter generic while avoiding one Rust process spawn per structure. GCP
runner images bake `/usr/local/bin/atlas-distill` into the image and set
`ATLAS_DISTILL_BIN`, so `auto` resolves to the canonical Rust ribbon path in
Lab runs.

The repo-level harness runs local baseline or full 5x5x3 campaigns without
Docker:

```bash
python tools/mlip_local_lab.py --mode baseline --mlip chgnet --row forces
python tools/mlip_local_lab.py --mode campaign --workers 1 --skip-install
```

After a local run, build a promotion packet before spending cloud GPU:

```bash
python tools/mlip_local_promotion.py \
  --run-dir tmp/mlip-local/<run_id> \
  --distill-policy-url gs://shed-489901-atlas-inputs/mlip-policies/hyperribbon-v2/policy_limits_accuracy.json
```

The packet either holds the work in local iteration or emits exact `gcloud run
jobs execute` canary commands. Cloud promotion should start from that packet,
not from handwritten local settings.

## Checkpoint And Resume

Every cell writes a raw-prediction checkpoint by default:

```text
<artifact-prefix>/cell_checkpoint.json
```

The checkpoint stores the run/cell/row/MLIP/variant context, a manifest hash,
case hashes, and completed raw predictions. On rerun, matching completed cases
are loaded before Distill policy is replayed. This lets a cloud timeout or local
interrupt resume expensive MLIP inference without treating Distill decisions as
stale.

Use `--checkpoint-mode off` to disable it, `--checkpoint-mode read-only` for
inspection/replay, or `--checkpoint-mode write-only` to force recomputation
while preserving the new checkpoint. A custom local or `gs://` path can be
provided with `--checkpoint-url`.

## GCP Build And Canary

Build and create/update the five default Cloud Run Jobs:

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
  --args=run-cell,--run-id,canary,--cell-id,canary:baseline:forces:chgnet,--row-id,forces,--mlip-id,chgnet,--manifest-url,gs://shed-489901-atlas-inputs/mlip-baseline/canonical-structures-v2/manifest.json,--artifact-prefix,gs://shed-489901-atlas-outputs/mlip-baseline-grid/canary/forces/chgnet,--beat-emit-url,https://glim-think-v1.aw-ab5.workers.dev/feed/beats
```

The Cloud Build config uses `gcloud run jobs deploy`, so first deployment and
subsequent image updates use the same command path.

UMA is wired as a separate cloud-first backend because `fairchem-core` uses its
own torch-generation dependency stack. The default catalog id is `uma-s-1p1`,
which is present in `fairchem-core==2.14.0`; override `UMA_MODEL_NAME` only when
the runner image exposes the requested checkpoint. The GCP runner image, L4 GPU
startup, FairChem import, and Secret Manager-backed `HF_TOKEN` path have been
validated; `facebook/UMA` still returns gated-repo 403 until the Hugging Face
account is authorized for the model. Build it with the single-job config:

```bash
gcloud builds submit . \
  --config gcp/mlip-cell-runner/cloudbuild.single.yaml \
  --substitutions _PROJECT_ID=shed-489901,_REGION=us-central1,_BACKEND=uma,_JOB_NAME=mlip-cell-uma,_IMAGE_TAG=uma-canary
```
