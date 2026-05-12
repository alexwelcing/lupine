# ADR-0001: Hybrid GCS + R2 storage; defer Cloudflare-fronted GCS

**Status:** Accepted (interim) — supersedes a TBD by the migration plan in §4.
**Date:** 2026-05-11
**Author:** A. Welcing
**Handoff unit:** 12 — "GCS → Cloudflare CDN for `.glimbin` (Bandwidth Alliance)"

---

## 1. Context

The (unwritten) handoff blueprint `docs/handoff/03_gcp_heavy_workload_blueprint.md` §2 calls
for "a Cloudflare CDN layer directly in front of our GCS buckets, [utilizing] the Bandwidth
Alliance to drastically reduce or eliminate egress fees." That blueprint was never committed;
the actual implementation diverged. This ADR records what we actually built, why it diverged,
and what would close the gap.

### 1.1 What exists today

Two distinct object stores, each chosen for the workload it serves:

| Store | Bucket | Workload | Consumers |
|---|---|---|---|
| Google Cloud Storage | `shed-489901-atlas-artifacts` | Large `.lammpstrj` and `.glimbin` molecular-dynamics trajectories (~0.9 GB across 16 open-data files, plus future user uploads) | `atlas-view` (web), `lupine-site` (marketing video) |
| Cloudflare R2 | `glim-artifacts` (binding `ARTIFACTS`) | Diary entries, search caches, claim snapshots, agent state | `glim-think` Worker (Durable Objects + Workers AI) |

GCS objects are served from `https://storage.googleapis.com/shed-489901-atlas-artifacts/...`
directly to browsers, with `Cache-Control: public, max-age=31536000, immutable` and a CORS
policy locked to `glim.lupine.dev`, `atlas.lupine.dev`, and localhost dev ports.

The `.glimbin` streaming pipeline (`atlas/atlas-view/packages/parsers/src/StreamingLoader.ts`)
uses HTTP Range Requests to fetch only the header + observed-frame slices — a 2 GB file
typically transfers ~30 MB per session. This dramatically blunts egress cost even without
Bandwidth Alliance.

### 1.2 What is missing vs. the blueprint

The blueprint asked for a Cloudflare proxy in front of GCS so that egress would route through
the Bandwidth Alliance (zero or near-zero egress charges between Cloudflare and GCS Standard
in the same region). We have:

- a CORS policy that already permits the production domains,
- a comment in `setup-gcs-bucket.sh` that documents the *intended* Cloudflare host
  `https://datasets.glim.lupine.dev/datasets/file.glimbin`,
- a comment header in `StreamingLoader.ts` ("Designed for GCS + Cloudflare CDN with
  Bandwidth Alliance"),

…but **no Worker, no DNS record, and no consumer configuration** wired to a CDN base URL.
Every consumer hardcodes `storage.googleapis.com/...` (eight files; see §5 below).

## 2. Decision

1. **Keep the hybrid: GCS for cold-immutable artifact blobs, R2 for hot Worker-bound state.**
   The two stores are not redundant. R2 is bound directly to glim-think's Worker via
   `wrangler.toml`, which gives in-network reads at zero latency and zero egress — there
   is no Cloudflare/GCS substitute for an R2 binding inside a Worker. GCS hosts the
   trajectories because the upload tooling (`gsutil`, `glimbin_convert.py`) and quota
   ceiling are friendlier than R2 for multi-GB scientific datasets.

2. **Land the Cloudflare-fronted-GCS scaffolding in code now; defer the deploy.** The
   migration is one DNS record and one Worker route away. The work that *can* be done
   in the worktree — a centralized `ATLAS_CDN_BASE` config, a deployable proxy Worker,
   a runbook — lands in this PR. The remaining work (cutover the consumers, prove
   egress savings) is scheduled in §4.

3. **Do not migrate `shed-489901-atlas-artifacts` to R2.** R2's free egress already
   covers the Worker side; the trajectories are served straight to browsers and would
   need a public R2 bucket or a Worker proxy regardless. The benefit of moving them
   is small relative to the upload-tooling churn.

## 3. Consequences

**Positive**

- Both stores remain canonical, no data migration risk.
- The CDN scaffolding (cdn.ts + Worker) is in the repo; turning it on is a config change.
- The ADR closes the spec gap on paper — future readers know why the blueprint diverged.

**Negative**

- We continue to pay GCS egress on the open-data trajectories until the CDN is live.
  Range-request streaming caps the bleed at ~30 MB/session, but it is not zero.
- The "Cloudflare CDN" comment in `StreamingLoader.ts` will remain aspirational until
  §4.2 lands.

**Neutral**

- glim-think and atlas-view continue to evolve independently. No new coupling.

## 4. Action items

### 4.1 In this PR (Path A scaffolding, no infra deploy)

- [x] `atlas/atlas-view/packages/core/src/cdn.ts` — `ATLAS_CDN_BASE` config helper,
      reads `import.meta.env.VITE_ATLAS_CDN_BASE` with a `storage.googleapis.com`
      default so prod traffic is unaffected.
- [x] `cloudflare/cdn-proxy/` — deployable Cloudflare Worker (TS) that proxies
      `https://cdn.lupine.dev/*` to `https://storage.googleapis.com/shed-489901-atlas-artifacts/*`
      with immutable cache headers. Bundled `wrangler.toml`, README, and a smoke test.
- [x] `docs/infrastructure/cdn.md` — runbook covering DNS, Worker deploy, and the
      `VITE_ATLAS_CDN_BASE` cutover.

### 4.2 Deferred (requires production access)

- [ ] Decide between (a) a Worker proxy or (b) Cloudflare Cache Reserve in front of a
      public GCS bucket. Worker is more flexible (auth, transforms, logging); Cache
      Reserve is one-line config but has its own pricing model.
- [ ] Pull the last 30 days of GCS egress for `shed-489901-atlas-artifacts` from Cloud
      Billing. If monthly egress > $50, prioritize 4.3; if < $10, this stays at "scaffolding
      ready, not deployed."
- [ ] Verify Bandwidth Alliance eligibility for the GCP project + Cloudflare account
      (rules: <https://www.cloudflare.com/bandwidth-alliance/>).
- [ ] Provision Cloudflare DNS `cdn.lupine.dev` proxied to the Worker.
- [ ] Deploy Worker via `wrangler deploy` from `cloudflare/cdn-proxy/`.
- [ ] Set `VITE_ATLAS_CDN_BASE=https://cdn.lupine.dev` in the atlas-view production
      build (Cloud Run / Pages env) and rebuild.
- [ ] Update the 8 files in §5 to consume the active base via `cdnUrl()` instead of
      hardcoded `storage.googleapis.com/...` strings.

### 4.3 Optional follow-up

- [ ] If egress remains high after Bandwidth Alliance, evaluate migrating *new*
      open-data trajectories to a public R2 bucket (`atlas-artifacts` R2) and
      double-writing during a deprecation window for the GCS objects.

## 5. Inventory of hardcoded GCS URLs (replace in §4.2)

```
atlas/atlas-view/tools/glimbin_convert.py
atlas/atlas-view/scripts/inject_open_md_entries.py
atlas/atlas-view/scripts/gcs/upload_open_data.sh
atlas/atlas-view/scripts/gcs/repoint_sourceurl_to_gcs.py
atlas/atlas-view/scripts/gcs/pull_open_data.sh
atlas/atlas-view/packages/ui/src/gallery-data.json
atlas/atlas-view/apps/web/public/gallery/open_data/README.md
atlas/atlas-view/apps/lupine-site/src/App.tsx
```

The Python and shell tooling rewrites are batched after Worker deploy because they
generate the URLs that get baked into `gallery-data.json`.

## 6. References

- `infra/setup-gcs-bucket.sh` — already references `datasets.glim.lupine.dev` in its
  closing banner. This ADR ratifies that intent without committing to the deploy yet.
- `atlas/atlas-view/packages/parsers/src/StreamingLoader.ts` — header comment names the
  Bandwidth Alliance pairing as the design target.
- `glim-think/wrangler.toml` lines 76–79 — R2 binding for the *other* workload.
- Cloudflare Bandwidth Alliance docs: <https://www.cloudflare.com/bandwidth-alliance/>
