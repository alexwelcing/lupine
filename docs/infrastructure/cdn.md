# CDN — Cloudflare in front of GCS (Bandwidth Alliance)

> Companion to [`docs/decisions/0001-r2-over-bandwidth-alliance.md`](../decisions/0001-r2-over-bandwidth-alliance.md).
> Worker source lives at [`cloudflare/cdn-proxy/`](../../cloudflare/cdn-proxy).

This document is the operational runbook for cutting the atlas-view
artifact traffic over from direct GCS (`storage.googleapis.com/...`) to
`https://cdn.lupine.dev/...` via a Cloudflare Worker. The Worker code,
config, and consumer scaffolding are committed; the runbook below walks
through the production switch.

---

## 1. Why this exists

The `.glimbin` and `.lammpstrj` trajectories the atlas-view loader fetches
are served straight from `gs://shed-489901-atlas-artifacts`. Cloudflare's
Bandwidth Alliance with Google Cloud Storage (in supported regions) charges
zero or near-zero egress between Cloudflare's edge and GCS Standard, so
fronting the bucket with a Cloudflare Worker drops the egress bill that
would otherwise scale with `users × trajectories_loaded × average_streamed_bytes`.

The Worker is intentionally minimal: it forwards Range Requests, preserves
ETag/If-None-Match semantics, and re-asserts `Cache-Control: immutable` so
the Cloudflare edge cache stays warm.

## 2. Pre-flight checks (one-time)

- [ ] Confirm Bandwidth Alliance eligibility for the GCP project
      `shed-489901` ↔ the Cloudflare account on `lupine.dev`.
      Reference: <https://www.cloudflare.com/bandwidth-alliance/>.
      Eligibility depends on the bucket region and the Cloudflare plan;
      consult Cloudflare and GCP support if in doubt.
- [ ] DNS for `lupine.dev` is delegated to Cloudflare (`dig NS lupine.dev`
      returns Cloudflare nameservers).
- [ ] `wrangler` is installed locally and authenticated:
      `wrangler whoami` returns the expected account.
- [ ] The GCS bucket CORS policy
      ([`atlas/atlas-view/infra/gcs-cors.json`](../../atlas/atlas-view/infra/gcs-cors.json))
      already allows `https://glim.lupine.dev` and `https://atlas.lupine.dev`.
      No change needed for the CDN cutover.

## 3. Deploy

```bash
cd cloudflare/cdn-proxy
pnpm install
pnpm typecheck
pnpm deploy        # wrangler deploy
```

Then in the Cloudflare dashboard:

1. **DNS** → add `cdn` as an A record pointing to `192.0.2.1`
   (any address; Cloudflare overrides for Worker-bound records),
   proxied (orange-cloud).
2. **Workers & Pages** → `cdn-proxy` → Triggers → add custom domain
   `cdn.lupine.dev`. Cloudflare auto-issues the TLS cert.
3. Uncomment the `[[routes]]` block in
   [`cloudflare/cdn-proxy/wrangler.toml`](../../cloudflare/cdn-proxy/wrangler.toml)
   and `pnpm deploy` again so the route is captured in version control.

## 4. Verification

### 4.1 Worker smoke test

```bash
# Header only — should return 200 OK with immutable Cache-Control:
curl -I 'https://cdn.lupine.dev/atlas/open_data/rmd17_aspirin.lammpstrj'

# Range request — should return 206 Partial Content with Content-Range:
curl -I -H 'Range: bytes=0-255' \
  'https://cdn.lupine.dev/atlas/open_data/rmd17_aspirin.lammpstrj'

# Confirm Cloudflare edge cache:
#   cf-cache-status: HIT (on the second request)
curl -sI 'https://cdn.lupine.dev/atlas/open_data/rmd17_aspirin.lammpstrj' \
  | grep -i cf-cache-status
```

### 4.2 atlas-view cutover

1. Set the build-time env var on the production deploy
   (Cloud Run / Cloudflare Pages, wherever `apps/web` is hosted):
   ```
   VITE_ATLAS_CDN_BASE=https://cdn.lupine.dev
   ```
2. Trigger a rebuild. The `getAtlasCdnBase()` helper in
   [`atlas/atlas-view/packages/core/src/cdn.ts`](../../atlas/atlas-view/packages/core/src/cdn.ts)
   reads the var; everything wired through `cdnUrl()` now points at the Worker.
3. Migrate the 8 call sites enumerated in ADR-0001 §5 from hardcoded
   `storage.googleapis.com/...` strings to `cdnUrl(...)`. Keep this
   incremental — each migrated file is a small, reversible PR.

### 4.3 Egress validation

After 7 days of traffic, pull the GCS billing report for
`shed-489901-atlas-artifacts`:

```bash
# Requires gcloud auth + a billing-account viewer role.
gcloud billing accounts list
gcloud beta billing export sql ...   # exact command varies per project
```

The expected pattern post-cutover is a near-total drop in
`Network Internet Egress from Americas to Americas` rows tied to the
bucket, replaced by `Network Inter-Region Egress` to Cloudflare (which
is what the Bandwidth Alliance discounts to ~$0).

## 5. Rollback

If the Worker misbehaves:

1. Cloudflare dashboard → Workers & Pages → `cdn-proxy` → **Disable**.
   Browsers immediately get DNS-level 522 / 521 errors.
2. Set `VITE_ATLAS_CDN_BASE=` (unset) on the production deploy and
   redeploy atlas-view. The `cdn.ts` helper falls back to direct
   `storage.googleapis.com` and traffic is restored.

Rollback is non-destructive — the GCS bucket and its public ACL are
unchanged, so the fallback URLs always work.

## 6. Known gaps and follow-ups

- The Worker does not currently emit structured logs to a sink. If we
  need request-level analytics (cache hit rate, geo, per-trajectory load
  count), add a `tail` consumer or wire Logpush. Out of scope for the
  initial cutover.
- Signed URLs are unsupported. The bucket is public; if we ever publish
  private datasets, add HMAC verification in `worker.ts`.
- A second Worker route (e.g. `videos.lupine.dev`) could front a separate
  GCS bucket if the marketing/landing video traffic outgrows the artifact
  bucket. The `ORIGIN_BUCKET` var generalizes this.
