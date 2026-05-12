# cdn-proxy

A Cloudflare Worker that proxies `https://cdn.lupine.dev/*` to
`https://storage.googleapis.com/shed-489901-atlas-artifacts/*` so that
egress travels the Cloudflare/GCS Bandwidth Alliance path.

## Status

**Scaffolding only.** The Worker compiles and `wrangler dev` smoke-tests
locally, but the `cdn.lupine.dev` DNS record is not yet provisioned and
the route binding in `wrangler.toml` is commented out. See
[`docs/decisions/0001-r2-over-bandwidth-alliance.md`](../../docs/decisions/0001-r2-over-bandwidth-alliance.md)
for context and [`docs/infrastructure/cdn.md`](../../docs/infrastructure/cdn.md)
for the cutover runbook.

## Local development

```bash
cd cloudflare/cdn-proxy
pnpm install
pnpm dev
# In another terminal, hit a known artifact via Range request:
curl -i -H 'Range: bytes=0-255' \
  'http://127.0.0.1:8787/atlas/open_data/rmd17_aspirin.lammpstrj' | head
```

Expected: HTTP 206, `Content-Range: bytes 0-255/87...`, plus the rewritten
`Cache-Control: public, max-age=31536000, immutable` for `.lammpstrj`.

## Deploy

Pre-flight: confirm Cloudflare ↔ GCS Bandwidth Alliance is active for the
account pair (see <https://www.cloudflare.com/bandwidth-alliance/>) and
that DNS for `cdn.lupine.dev` is delegated to Cloudflare.

```bash
pnpm deploy
```

After deploy, uncomment the `[[routes]]` block in `wrangler.toml`, set the
DNS A/AAAA records to be proxied (orange-cloud), and run the smoke test
in `docs/infrastructure/cdn.md` §4.

## What this Worker does NOT do

- No signed URLs. The upstream GCS bucket is publicly readable; if that
  ever changes, add HMAC verification in `worker.ts`.
- No multipart-upload support. Uploads continue to go via `gsutil`.
- No path remapping beyond bucket prefixing. Object layout in GCS is the
  same as the CDN path.
