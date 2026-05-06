# Grand Finale Infrastructure Plan — BigQuery + GCP for the Lupine Loop at Scale

**Date:** 2026-05-05
**Author:** A. Welcing
**Status:** Design — not yet implemented. Companion narrative in [`research_evolution_2026_05_05.md`](../research_evolution_2026_05_05.md).

---

## 1. Goal

Move the Lupine autonomous research loop from a Cloudflare-only stack (D1 + R2 + Workers) to a hybrid architecture that keeps Cloudflare as the **real-time ledger** and adds Google Cloud as the **analytical and large-scale-compute substrate**. The motivating constraints:

- **Storage:** Cloudflare D1 has a 10 GB / database soft limit and is row-oriented. Beyond ~10⁶ claim rows, analytical queries (group-bys across `claim_type`, `agent_id`, time windows) become expensive.
- **Compute:** Workers cap at 30 s CPU / 128 MB; bootstraps with 10⁵ iterations on 10⁵-row matrices already strain that envelope. Anything heavier (full-Materials-Project PCA, Vertex-trained surrogate models) needs a GPU/CPU pool.
- **Observability:** the system properties we want to track at scale — refutation rate, confounder catch-rate, gate failure rate — are SQL aggregations across millions of rows. They belong in a columnar warehouse with a dashboard layer on top.

The migration adds infrastructure; it does not move the source-of-truth or break the existing loop.

---

## 2. Architecture, mapped to the loop

| Stage | Today | Grand finale | Why GCP |
|---|---|---|---|
| **Organize** | D1 tables (`claims`, `hypotheses`, `insights`, `hits`, `critiques`); R2 for artifacts | D1 stays as real-time ledger. **BigQuery** is a partitioned analytical mirror, refreshed via Pub/Sub on every D1 write. **Cloud Storage** holds raw simulation outputs, preprint PDFs, intermediate JSONs (anything > 10 MB or binary) | BigQuery scales to PB; Cloud Storage replaces R2 for items where lifecycle policies or signed URLs matter |
| **Harden** | Causal Durable Object running deterministic stats inline; Python scripts run locally then ingest results | Causal DO unchanged for fast inline tests. **Cloud Run** containerized workers handle heavyweight bootstraps and full-corpus PCA, reading from BigQuery, writing closure claims back via the existing `/claims/ingest` endpoint. **Vertex AI** managed-model endpoints serve the M2.7 reasoner with a per-round token budget | Cloud Run gives us cgroups + GPU access without orchestrator overhead; Vertex caches model weights and bills per-token consistently |
| **Evaluate** | Manual `/admin/iterate` invocations; `/admin/lean-status` GET endpoint | **Cloud Scheduler** fires `/admin/iterate` on every proposed hypothesis weekly. **Cloud Tasks** queues iterate jobs for the worker fleet. **Looker** dashboards on BigQuery surface convergence rate, hypothesis half-life, refutation-per-round, and confounder-catch-rate as SQL queries | Looker turns the system's meta-properties into auditable KPIs without any Cloudflare-side change |

The Cloudflare worker remains the system of record. GCP is purely additive.

---

## 3. BigQuery schema

Design principles:
- One partitioned table per claim domain (`claims`, `hypotheses`, `insights`, `hits`, `critiques`, `synthesis_summaries`).
- Partition by `DATE(created_at)`; cluster by `agent_id, claim_type` for the typical filter pattern.
- Mirror Cloudflare D1 column-for-column. `claim_data` lives as a `JSON` column (BigQuery native) to enable `JSON_VALUE()` and `JSON_QUERY()` aggregations.
- Foreign-key-style joins via `claim_id` and `hypothesis_id`. No declared constraints — BigQuery doesn't enforce them — but the keys are stable.

### 3.1 `claims` table (canonical)

```sql
CREATE TABLE `lupine.research.claims` (
  claim_id        STRING NOT NULL,
  agent_id        STRING NOT NULL,
  claim_type      STRING NOT NULL,
  description     STRING,
  claim_data      JSON,
  evidence_ids    ARRAY<STRING>,
  confidence      FLOAT64,
  status          STRING,
  created_at      TIMESTAMP NOT NULL,
  ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY agent_id, claim_type;
```

### 3.2 `hypotheses` table

```sql
CREATE TABLE `lupine.research.hypotheses` (
  id              STRING NOT NULL,
  title           STRING NOT NULL,
  status          STRING NOT NULL,
  confidence      FLOAT64,
  evidence_ids    ARRAY<STRING>,
  agent_id        STRING,
  created_at      TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL
)
PARTITION BY DATE(updated_at)
CLUSTER BY status, agent_id;
```

### 3.3 Derived analytical views

```sql
-- Refutation rate per agent, per month
CREATE VIEW `lupine.research.refutation_rate_monthly` AS
SELECT
  DATE_TRUNC(DATE(updated_at), MONTH) AS month,
  agent_id,
  COUNTIF(status = 'refuted') / COUNT(*)            AS refutation_rate,
  COUNTIF(status = 'confirmed') / COUNT(*)          AS confirmation_rate,
  COUNT(*)                                          AS n_hypotheses
FROM `lupine.research.hypotheses`
GROUP BY month, agent_id;

-- Confounder catch-rate (how often a refutation cites a sample-size or matched-n test)
CREATE VIEW `lupine.research.confounder_catches` AS
SELECT
  h.id, h.title, h.status, h.confidence, h.updated_at,
  ARRAY(
    SELECT c.claim_id FROM UNNEST(h.evidence_ids) eid
    JOIN `lupine.research.claims` c ON c.claim_id = eid
    WHERE c.claim_type IN ('MEAMBootstrap', 'DBandClosure', 'StratifiedDBandAnalysis',
                            'SampleSizeAnalysis', 'CrossMLIPAlignment')
  ) AS hardening_claims
FROM `lupine.research.hypotheses` h
WHERE h.status = 'refuted';

-- Lean-readiness gate failure trend
CREATE VIEW `lupine.research.gate_failures` AS
SELECT
  DATE(updated_at)                                  AS day,
  COUNTIF(confidence < 0.85)                        AS below_confidence_floor,
  COUNTIF(status = 'testing' AND confidence > 0.85) AS testing_above_floor_unstable,
  COUNT(*)                                          AS total
FROM `lupine.research.hypotheses`
GROUP BY day;
```

These views are what Looker reads. They turn "is the system working well?" into a number.

---

## 4. Sync mechanism — D1 → BigQuery

Two options; pick option B for production.

### 4.1 Option A — periodic dump (smoke test only)

A Cloud Scheduler job hits a new endpoint `GET /admin/export?since={timestamp}` on the worker, which streams JSON-newline rows. A Cloud Run job consumes the stream and bulk-loads into BigQuery via the streaming insert API.

Pros: zero changes to the worker beyond the new GET endpoint.
Cons: not real-time; latency ~1 hour; doubles worker egress on every poll.

### 4.2 Option B — Pub/Sub event stream (production)

Add a single line to `worker_sync` and to the worker's `claims/ingest` and `hypotheses` PATCH handlers: emit a Pub/Sub message on every successful insert/update with the row payload.

```typescript
// in claims/ingest handler, after successful D1 insert:
await env.PUBSUB.publish('lupine-claims', JSON.stringify(claim));
```

A subscribed Cloud Run service consumes the topic and writes to the BigQuery streaming insert API in batches of 500. End-to-end latency: <30 s.

Pros: real-time mirror; no polling; the worker's role doesn't change.
Cons: requires a Cloudflare → Pub/Sub bridge (HTTP push from worker; manageable). Adds one external dependency.

The lupine-distill side (`worker_sync.rs`) does not need changes — it already pushes to the worker, and the worker handles the Pub/Sub fan-out.

---

## 5. Cost projection

Rough order-of-magnitude based on May 2026 GCP pricing (us-central1).

| Resource | Today's load | Grand-finale load | Monthly cost (grand finale) |
|---|---|---|---|
| BigQuery storage | ~25 MB equivalent | ~500 GB structured + 50 GB JSON columns | ~$10 |
| BigQuery query | ~100 MB scanned/month | ~5 TB scanned/month (Looker dashboards) | ~$25 |
| Cloud Storage | n/a | ~2 TB raw artifacts (simulation outputs + PDFs) | ~$40 |
| Cloud Run (workers) | n/a | 100 vCPU-hours/month | ~$50 |
| Vertex AI (M2.7) | $0 (Cloudflare AI gateway today) | 10M tokens/month at ~$1/1M | ~$10 |
| Pub/Sub | n/a | 10M messages/month | ~$5 |
| Cloud Scheduler + Tasks | n/a | minimal | <$1 |
| Looker (Looker Studio Pro) | n/a | seat-based | ~$30 / user |
| **Total** | **~$0/month** | | **~$200/month** |

This is well within research-grant scale. A NSF/DOE-funded materials-informatics project typically allocates $5–10k/year for cloud, leaving substantial headroom for compute spikes.

---

## 6. Rollout phases

### 6.1 Phase 0 — tracer bullet (week 1)

Goal: prove the organize-stage mirror works end-to-end before any production load.

1. Create `lupine` GCP project; enable BigQuery, Pub/Sub, Cloud Storage, Cloud Run.
2. Provision the schema in §3 (one-time `bq mk` + DDL script).
3. Add a single dev endpoint to glim-think: `POST /admin/dev-publish` that emits one canned claim to a Pub/Sub topic.
4. Wire a Cloud Run subscriber that streams that one claim into BigQuery `claims`.
5. Verify: `bq query 'SELECT COUNT(*) FROM lupine.research.claims'` returns 1.

Time: 2 days. Cost: <$1. Deliverable: smoke-test claim visible in BigQuery + a screenshot for the project narrative.

### 6.2 Phase 1 — production mirror (weeks 2–3)

1. Add Pub/Sub emission to `claims/ingest`, `hypotheses` POST/PATCH, and `synthesis` insert paths.
2. Backfill: write a one-shot script that reads every existing D1 row and publishes it.
3. Verify row counts match between D1 and BigQuery.
4. Set up Looker on the analytical views in §3.3.

Time: 1 week. Cost: ~$10 one-time. Deliverable: live Looker dashboard; the `/process` page on the public site adds a new section linking to it.

### 6.3 Phase 2 — heavyweight compute migration (weeks 4–6)

1. Containerize the bootstrap scripts (`meam_bootstrap.py`, `cross_mlip_alignment.py`) as Cloud Run jobs.
2. Add a `/admin/run-job?type=meam-bootstrap` endpoint that queues the job via Cloud Tasks.
3. The job reads matrices from BigQuery (or staged on Cloud Storage), runs, and POSTs the closure claim back via `/claims/ingest`.
4. Migrate the M2.7 reasoner from the current Cloudflare AI gateway to a Vertex AI managed-model endpoint with a per-round token budget.

Time: 2 weeks. Cost: ~$50/month thereafter. Deliverable: first round closure that ran entirely on GCP-hosted compute.

### 6.4 Phase 3 — automated iterate scheduler (weeks 6–8)

1. Cloud Scheduler fires `/admin/iterate` weekly on every hypothesis with status=`proposed` or `testing` and last-update older than 7 days.
2. Add a `freshness` column to the hypotheses table that the scheduler queries.
3. Looker tile: "Hypotheses overdue for iterate."
4. Set a soft cap on auto-iterate spend per week ($20) with a Pub/Sub alert.

Time: 2 weeks. Deliverable: the loop runs continuously without operator intervention.

### 6.5 Phase 4 — corpus expansion (weeks 8+)

This is where X scales. Ingest:
- Full Materials Project elastic + phonon + DOS data (~150k materials).
- All 600+ KIM/NIST classical potentials with their elastic predictions.
- The full LAM landscape (M3GNet, SevenNet, GNoME, DPA-3, EquiformerV2, Allegro, NequIP) with strain-energy elastic computation per element.

Time: open-ended. Cost: dominated by GPU hours for the LAM landscape (~$500 for the full sweep). Deliverable: ~10⁷ records in BigQuery; the matched-n bootstrap method now runs on a corpus that is genuinely large enough for the small-n artifacts to disappear into noise.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Pub/Sub bridge becomes a SPOF | Keep the synchronous D1 write authoritative. Pub/Sub failures degrade BigQuery freshness, not source-of-truth. |
| BigQuery costs balloon on Looker queries | Cluster + partition correctly (§3); set per-query bytes-billed alerts at $5 / query. |
| Vertex AI M2.7 latency spikes hurt iterate convergence | Keep the Cloudflare AI gateway as a hot fallback; the worker route can switch via env var. |
| GCP project compromised | Cloud Storage buckets default to private; service-account keys rotated quarterly; Cloudflare keys never leave Cloudflare. |
| Schema drift between D1 and BigQuery | The Pub/Sub message is the schema contract. Use protobuf with a version field; migrate via a versioned subscriber rather than an in-place DDL. |

---

## 8. Out of scope for this plan

- Migrating the **Cloudflare worker itself** to Cloud Run. The worker is a low-latency edge service; it stays on Cloudflare. Only the analytical mirror lives on GCP.
- Replacing **R2** with Cloud Storage. R2 stays the artifact store for items the worker needs to serve directly. Cloud Storage holds the larger / lifecycle-managed artifacts.
- Migrating **lupine-distill** away from local SQLite. The local engine is the producer; it stays exactly as is.
- Any change to **worker_sync.rs** beyond the existing best-effort POST.

The plan is additive. Ripping out anything is explicitly not part of it.

---

## 9. What "done" looks like

- A Looker dashboard, public, that shows: hypothesis count by status; refutation rate by month; confounder-catch rate; gate-failure rate; cost-per-round.
- An end-to-end round (organize → harden → evaluate) runs without operator intervention beyond hypothesis seeding.
- The `/evolution` page on the public site adds a "Live Metrics" section that pulls real numbers from the dashboard and updates daily.
- The matched-n bootstrap method (the loop's signature self-correction operator) runs as a Cloud Run job on a 10⁷-record corpus and reports its results back into the ledger.

When that exists, the X-scale, Y-iteration projection has been demonstrated, not just argued for.
