# Handoff Runbook — Operating the Lupine Flywheel

Operational manual for the Lupine Materials Science autonomous research stack. The five handoff documents under `../handoff/` describe what the system **is**; this runbook describes how to **run** it.

Read time: 5 minutes.

---

## 1. Quick reference card

**Start the flywheel (normal day)**

The persistent subsystems are already deployed by CI. Nothing to start unless something is broken:

- `glim-think-v1` Worker — auto-deployed via Cloudflare on push to `main`.
- `lupine-start` Cloud Run service — auto-deployed via Cloud Build on push to `main`.
- `atlas-distill` Cloud Run Job — triggered on schedule + on demand.

To launch a research round manually:

```
curl -X POST https://glim-think-v1.<account>.workers.dev/admin/iterate
```

**Halt the flywheel**

- Graceful: set `DEV_MODE=on` Worker secret, drain Cloud Tasks queue, halt the `kimi --yolo` supervisor (see Section 4).
- Emergency: write the halt sentinel to GCS, take Cloud Run to zero traffic, revoke the Worker route (see Section 4).

**Where to look first when something is broken**

| Symptom | First place to check |
|---------|----------------------|
| `/live` is silent | `pnpm wrangler tail glim-think-v1` |
| Cloud Run Job stuck | `gcloud run jobs executions list --job atlas-distill --region us-central1` |
| Paradox alert in Slack | `cargo run -p atlas-distill --bin atlas-distill -- detect-paradox --bcc` |
| Worker 5xx | Cloudflare dashboard → Workers → `glim-think-v1` → Logs |
| Container build failed | Cloud Build history in the GCP console |

---

## 2. Architecture at a glance

Five subsystems form a research loop: `glim-think-v1` (Cloudflare Worker) orchestrates agents and writes literature hits; `atlas-distill` (Cloud Run Job, Rust) runs heavy benchmarks and paradox detection; `lupine-start` (Cloud Run service, React) serves the public site including `/live`; `kimi --yolo` (local supervisor) drives the autonomous outer loop; `tasks-consumer` (Cloud Run service) drains the Cloud Tasks queue back into `glim-think-v1` and `atlas-distill`. State of record: D1 + KV in Cloudflare for short-lived rounds; GCS for long-lived artifacts; Vectorize for retrieval.

Deep dives, in order of usefulness:

- `../handoff/01-architecture.md` — subsystem responsibilities and data flow.
- `../handoff/02-deployment.md` — what CI deploys where, secrets, IAM.
- `../handoff/03-research-loop.md` — round lifecycle, agent contracts.
- `../handoff/04-observability.md` — beats, dashboards, alerts.
- `../handoff/05-failure-modes.md` — known failure taxonomy and root causes.

---

## 3. Starting the system

CI handles all routine deploys. The commands below are for **manual** redeploys when CI is bypassed or broken.

### `glim-think-v1` — Cloudflare Worker

```
cd glim-think && pnpm wrangler deploy
```

Verify:

```
pnpm wrangler tail glim-think-v1
```

The Worker config lives in `glim-think/wrangler.toml`. Secrets are set with `pnpm wrangler secret put <NAME>`.

### `lupine-start` — Cloud Run service

```
gcloud builds submit --config=cloudbuild.yaml lupine-start/
```

The build config is `lupine-start/cloudbuild.yaml`. The service deploys to `us-central1` as `lupine-site` with `--allow-unauthenticated`.

Verify by hitting the live route in a browser: `https://<service-url>/live`. The route source is `lupine-start/src/routes/live.tsx`.

### `atlas-distill` — Cloud Run Job

Build and update the job image via Cloud Build:

```
gcloud builds submit --config=atlas-distill/cloudbuild.yaml .
```

Trigger an execution and wait for it:

```
gcloud run jobs execute atlas-distill --region us-central1 --wait
```

The job runs as service account `atlas-distill-runner@<project>.iam.gserviceaccount.com`.

### `kimi --yolo` supervisor — local autonomous loop

Provided by Unit 5 (`docs/runbooks/kimi_supervisor.md`, pending). Until it lands, the loop is driven by manual `curl -X POST .../admin/iterate` calls.

### `tasks-consumer` — Cloud Run service

Provided by Unit 8 (`tasks-consumer/`, pending). Until it lands, Cloud Tasks targets `glim-think-v1` directly.

---

## 4. Halting the system

### Graceful halt

1. Set `DEV_MODE` on the Worker so new rounds short-circuit:

   ```
   echo "on" | pnpm --filter glim-think wrangler secret put DEV_MODE
   ```

2. Drain the Cloud Tasks queue (replace `<queue>` with the actual name from `../handoff/02-deployment.md`):

   ```
   gcloud tasks queues pause <queue> --location us-central1
   gcloud tasks queues purge <queue> --location us-central1 --quiet
   ```

3. Halt the local supervisor: `Ctrl-C` the `kimi --yolo` process, or kill its PID file (see Unit 5 once shipped).

### Emergency halt

1. Write the halt sentinel to GCS so all subsystems short-circuit on next poll:

   ```
   echo "halt" | gcloud storage cp - gs://<lupine-state-bucket>/control/halt
   ```

2. Take Cloud Run services off traffic:

   ```
   gcloud run services update lupine-site --region us-central1 --no-traffic
   gcloud run services update tasks-consumer --region us-central1 --no-traffic
   ```

3. Revoke the Worker route in the Cloudflare dashboard (Workers → `glim-think-v1` → Triggers → Routes), or:

   ```
   pnpm wrangler deployments list
   pnpm wrangler rollback <previous-deployment-id>
   ```

---

## 5. Daily health checks

Run all four before starting any new work:

1. Cloud Run monitor (one-shot mode):

   ```
   lupine-ops/target/release/monitor_cloud_run --once
   ```

   Provided by Unit 3 (`lupine-ops/src/bin/monitor_cloud_run.rs`, pending). Until it lands, use:

   ```
   gcloud run services list --region us-central1
   gcloud run jobs executions list --job atlas-distill --region us-central1 --limit 5
   ```

2. Open `/live` in a browser, confirm beats are arriving (timestamps within the last few minutes).

3. Worker log tail (look for errors and paradox alerts):

   ```
   pnpm wrangler tail glim-think-v1
   ```

4. Confirm no halt sentinel is lingering:

   ```
   gcloud storage ls gs://<lupine-state-bucket>/control/
   ```

---

## 6. Common failures and recovery

### Cloud Run cold start hangs (instance idle > 10 min)

Symptom: first request after a quiet period times out; subsequent requests succeed.

Recovery:

1. Check the monitor for flagged services:

   ```
   lupine-ops/target/release/monitor_cloud_run --once
   ```

2. Force a new revision to warm a container:

   ```
   gcloud run services update lupine-site --region us-central1 --update-env-vars WARM=$(date +%s)
   ```

3. If the hang persists, scale min-instances up:

   ```
   gcloud run services update lupine-site --region us-central1 --min-instances 1
   ```

### Paradox alert from `atlas-distill`

Symptom: a beat on `/live` flags Simpson's paradox in the latest BCC round.

Recovery:

1. Reproduce locally:

   ```
   cargo run -p atlas-distill --bin atlas-distill -- detect-paradox --bcc
   ```

   The output structure is documented in `atlas-distill/README.md`. A `flipped: true` group on any aggregate observable means the round-level conclusion contradicts the stratum-level conclusions.

2. If `flipped: true` is reported, halt the supervisor (Section 4, graceful) before the next iteration writes downstream artifacts.

3. File a research note (template in `../handoff/03-research-loop.md`) before resuming.

### Vectorize index out of sync with `lupine-distill`

Symptom: agents miss recent papers; `/admin/iterate` returns hits with stale `created_at`.

Recovery (verified canonical resync route — see `glim-think/src/server.ts` line 2049):

```
curl -X POST https://glim-think-v1.<account>.workers.dev/admin/iterate \
  -H "content-type: application/json" \
  -d '{"reindex": true}'
```

If `reindex: true` is not accepted by the current build, fall back to a full literature replay via the `literature` module (`glim-think/src/literature/index.ts`).

### Cloudflare rate limit hit

Symptom: 429s from arxiv/openalex/semantic-scholar inside Worker logs.

Recovery:

1. Inspect the active limits in `glim-think/src/literature/rate_limit.ts` and the KV-backed counters in `glim-think/src/literature/rate_limit_kv.ts`.
2. Back off: pause the supervisor for an hour and resume; the KV counters drain automatically.
3. If a specific source is the culprit, disable it temporarily by emptying its source list in `glim-think/src/literature/index.ts` and redeploying.

### GCP auth failure (Worker → GCP)

Symptom: Worker logs show `invalid_grant` or `401` from GCS/Cloud Run/Tasks.

Recovery:

1. Regenerate a service account key for `atlas-distill-runner@<project>.iam.gserviceaccount.com` in the GCP console.
2. Rotate the Wrangler secret:

   ```
   cat new-key.json | pnpm --filter glim-think wrangler secret put GCP_SA_KEY
   ```

3. Redeploy: `cd glim-think && pnpm wrangler deploy`.
4. Delete the local copy of the key. Confirm the old key is disabled in the GCP console.

---

## 7. Where logs live

| Subsystem | Log destination | Quick access |
|-----------|----------------|--------------|
| `glim-think-v1` Worker | Cloudflare dashboard | `pnpm wrangler tail glim-think-v1` |
| `lupine-start` Cloud Run service | GCP Cloud Logging | `gcloud run services logs read lupine-site --region us-central1 --limit 100` |
| `atlas-distill` Cloud Run Job | GCP Cloud Logging | `gcloud run jobs executions logs read <execution-id> --region us-central1` |
| `tasks-consumer` Cloud Run service | GCP Cloud Logging | (after Unit 8 lands) |
| `kimi --yolo` supervisor | Local stdout | tail the file specified in the supervisor config (Unit 5) |

Long-term retention: Worker logs are not persisted by default — the supervisor streams them into GCS via Logpush (configured in `../handoff/04-observability.md`).

---

## 8. Pre-flight checklist for commit 500 handoff

The list below is what must be verified **before the autonomous switch is flipped**. Items still red after Units 1–12 of the handoff plan land are called out explicitly.

- [ ] All five `../handoff/*.md` documents exist and were reviewed end-to-end.
- [ ] All `docs/runbooks/*.md` exist and were dry-run by a second operator.
- [ ] `lupine-ops/target/release/monitor_cloud_run --once` exits 0 against production (**RED until Unit 3 lands**).
- [ ] `cargo run -p atlas-distill --bin atlas-distill -- detect-paradox --bcc` reports no `flipped: true` on the latest manifold.
- [ ] `pnpm wrangler tail glim-think-v1` shows no `ERROR` lines in a 15-minute window.
- [ ] `/live` is reachable and beats arrive within 60 s of a manual `/admin/iterate` POST.
- [ ] Cloud Tasks queue depth is 0 and the queue is unpaused.
- [ ] Halt sentinel `gs://<lupine-state-bucket>/control/halt` is **absent**.
- [ ] `kimi --yolo` supervisor binary exists and a 10-minute dry run completed without escalations (**RED until Unit 5 lands**).
- [ ] `tasks-consumer` service is deployed and draining (**RED until Unit 8 lands**).
- [ ] All GCP service account keys created during this session have been rotated, and the local copies deleted.
- [ ] `DEV_MODE` Worker secret is **unset** (or empty) so production rounds are not short-circuited.

When every checkbox above is green, the system is ready for autonomous operation. Until then, drive `/admin/iterate` manually and read beats off `/live`.
