# GCP grounding — verified live (2026-06-02)

The Cloud-Run sim matrix ([Part 4](../04-cloud-run-sim-tiers.md)) is grounded in
the real `shed-489901` project, not just the repo's assertions. Every resource the
driver/policy touches was confirmed live via `gcloud` (read-only) on 2026-06-02
(account `alexwelcing@gmail.com`; active config project is `endlesse`, so all
checks were run with explicit `--project=shed-489901`).

## Confirmed present

| Resource | Check | Result |
|---|---|---|
| Cloud Run **jobs** | `gcloud run jobs list` | `mlip-cell-{mace,chgnet,m3gnet,orb,sevennet,uma}` ✅ all exist (+ `atlas-distill`, `glim-compute`, `glim-eval`) |
| `mlip-cell-mace` shape | `gcloud run jobs describe` | **nvidia-l4**, cpu 4, memory 16Gi, taskCount 1, maxRetries 1, image in Artifact Registry ✅ |
| Cloud Run **services** | `gcloud run services list` | `tasks-consumer` ✅ (URL matches `wrangler.toml`), `glim-otlp-relay`, `library-site`, `mix-api`, `atlas-viewer` |
| Cloud **Tasks** queue | `gcloud tasks queues list` | `atlas-distill-jobs` **RUNNING** ✅ |
| Baseline **manifest** | `gcloud storage ls` | `…/canonical-structures-v2/manifest.json` ✅ |
| Support **manifest** | `gcloud storage ls` | `…/canonical-distill-support-mptrj-train-plus-elastic-v1/manifest.json` ✅ |
| Output bucket | `gcloud storage ls` | `gs://shed-489901-atlas-outputs/{mlip-5x5x3,mlip-baseline-grid,mlip-deep-accuracy,mlip-evidence}/` ✅ |

## Consequences for the config

- The driver's emitted `gcloud run jobs execute mlip-cell-{mace,sevennet} …` commands
  resolve against **real jobs** — the plan is executable as-is.
- The policy's `gpu_flavor: nvidia-l4` and the driver's `$0.65/GPU-hr` cost guard
  match the **deployed accelerator**, so the ~$0.13/12-cell estimate is realistic.
- Both manifest URLs in the policy/driver **exist**, so cells won't fail on missing input.
- Cloud runs must persist to GCS: use
  `--artifact-prefix gs://shed-489901-atlas-outputs/model-sim-matrix/<run-id>`
  (the driver now warns if `--target cloud` is given a local prefix; the policy
  records this as `run.output_prefix`).

## Notes / gotchas observed

- Local **`gsutil` is broken** here (`python3.12: command not found`); use
  **`gcloud storage`** instead (bundled interpreter) — reflected in all commands above.
- A `super-ag@shed-489901.iam.gserviceaccount.com` service account is credentialed
  locally; the jobs were last deployed by `github-actions-deployer@…` /
  `…-compute@developer` — CI owns deploys, so build/deploy go through
  `gcloud builds submit` (see `gcp/mlip-cell-runner/README.md`), not local pushes.
- Active gcloud project is `endlesse` (the Mix project) — **left unchanged**; all
  MLIP work must pass `--project=shed-489901` explicitly.
