# GLIM Resource Fabric

The best rig is a three-lane system with one durable brain.

## Lane 1: Cloudflare as the Control Plane

Cloudflare should own the always-on parts:

- `glim-think` Worker routes the API and scheduled loops.
- Durable Objects keep specialist agent sessions alive.
- D1 is the ledger for tasks, resource requests, allocations, claims, and deployments.
- R2 stores artifacts: diaries, metrics, manifests, traces, generated reports, and result bundles.
- Workers AI and external model providers handle cheap reasoning, triage, summaries, and routing.

This lane should not run expensive GPU simulations. It decides, records, verifies, and broadcasts.

## Lane 2: Local RTX A4500 as the First Heavy Worker

The local 20 GB GPU is the default heavy lane while the workstation is awake:

- MLIP screening and batch scoring.
- LAMMPS experiment batches that fit in one-GPU memory.
- Private or messy data runs that should not leave the machine yet.
- Fast iteration before cloud spend.

The worker script is:

```powershell
scripts/local_gpu_worker.ps1 -ThinkUrl http://127.0.0.1:8787 -Once
scripts/local_gpu_worker.ps1 -ThinkUrl https://<glim-think-worker> -Claim
```

Without `-Claim`, it only registers and heartbeats the GPU. With `-Claim`, it claims
agenda tasks for a specialty lane and writes job envelopes into
`.glim-runtime/gpu-queue/`.

## Lane 3: GCP as Elastic Burst

GCP should stay mostly cold until the ledger proves pressure:

- Queue depth remains high after local GPU passes.
- A run needs longer wall time, bigger parallelism, or reproducible cloud artifacts.
- We need public deployment of a live surface such as `lupine-start`.
- We want formal release candidates built from clean containers.

Use project `shed-489901` as the default gcloud project. Keep GCP as a burst lane,
not the source of truth. Results still report back into `glim-think`.

## Routing Policy

1. Edge-first: all work becomes an agenda task or resource request in D1.
2. Local-first for GPU: claim to `local-rtx-a4500` when the task can run on one GPU.
3. GCP burst only when queue pressure, reproducibility, or scale justifies it.
4. Formalization lane is fed by stable claims with artifacts and traces.
5. No result counts as real until it has an artifact key, provenance, or proof obligation.

## API Surface

Resource endpoints:

- `POST /resources/bootstrap`
- `GET /resources/status`
- `POST /resources/register`
- `POST /resources/heartbeat`
- `POST /resources/allocate`

Agenda endpoints:

- `POST /agenda/seed`
- `GET /agenda/status`
- `GET /agenda/tasks?status=queued&limit=50`
- `POST /agenda/claim`
- `POST /agenda/update`
- `POST /agenda/complete`

## When Formalization Comes Back

The team should be ready to switch from broad execution to lean formalization by
promoting only claims that have:

- a completed task chain,
- a stable artifact,
- clear provenance,
- a falsification note,
- and a small Lean target in `lean-spec`.

That keeps formalization from becoming ceremonial. It becomes the release gate
for the strongest claims.
