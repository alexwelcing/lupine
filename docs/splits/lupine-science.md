# Extraction Packet: `lupine.science`

**Goal:** extract the public Lupine Science start page into a tiny repo that is
easy to run, deploy, and verify.

## Purpose

`lupine.science` owns the public front door for the research program. It should
explain where to go next, expose agent-readable files, and show a lightweight
live status signal from the science/control-plane repo. It is not the research
corpus, the viewer, or the experiment system.

## Maintenance Win

After extraction, the start site should be boring in the best way:

- small static/nginx service
- no Node, Rust, Lean, Python, Firebase, or viewer dependency unless introduced
  intentionally
- one deploy workflow
- one health endpoint
- no access to broad monorepo secrets
- clear canonical links to Library, LUPI, and source

## Current Source

| Current path | Role |
| --- | --- |
| `gcp/lupine-site-router/Dockerfile` | nginx image for the static site |
| `gcp/lupine-site-router/nginx.conf` | `/health` plus static fallback |
| `gcp/lupine-site-router/public/**` | static site assets and pages |
| `.github/workflows/deploy-lupine-site-router.yml` | Cloud Run deploy workflow |
| `brand.config.json` | upstream source for names and canonical URLs |
| `docs/brand/agent/*` | upstream source for generated agent text |

## Destination Shape

```text
lupine.science/
  public/
    index.html
    robots.txt
    sitemap.xml
    llms.txt
    llms-full.txt
    brand.json
    og-lupine-science.png
    hero-cyanotype.png
  Dockerfile
  nginx.conf
  README.md
  docs/
    operations.md
    release-checklist.md
  .github/
    workflows/
      deploy.yml
```

## Move

- Static public assets from `gcp/lupine-site-router/public/**`.
- `Dockerfile` and `nginx.conf`.
- A small deploy workflow derived from `deploy-lupine-site-router.yml`.
- Minimal docs for local preview, deploy, and live smoke testing.

## Leave Behind

- `docs/**` research corpus.
- `library-site/**`.
- `atlas/**` and all viewer code.
- `glim-think/**`, `lean-spec/**`, `atlas-distill/**`, `python/**`.
- `deck/**` and private/gated surfaces.
- generated build artifacts, logs, screenshots, and scratch folders.

## Public Contracts

Consume these from the science/control-plane repo:

| Contract | Why |
| --- | --- |
| `brand.config.json` or generated `brand.json` | canonical names, URLs, organization metadata |
| generated `llms.txt` and `llms-full.txt` | agent/search orientation |
| `glim-think` `/research/mlip-discovery/progress` | live status widget |
| claim/status summary export, if added | short public state without duplicating the Library |

The site should not hand-maintain scientific status that already lives in the
science repo.

## Secrets And Infra

Minimum repo secrets:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_SERVICE_NAME_SITE`

Do not copy viewer Firebase secrets, Cloudflare Worker secrets, MLIP secrets, or
deck access secrets.

## Local Dev Loop

The site should support one of these lightweight loops:

```powershell
docker build -t lupine-science .
docker run --rm -p 8080:8080 lupine-science
```

or, for static preview without Docker:

```powershell
python -m http.server 8080 -d public
```

Expected local smoke:

- `GET /` returns the homepage.
- `GET /health` returns `ok` when running the nginx image.
- `GET /robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/brand.json` return
  current public metadata.

## Deploy Loop

Keep the deploy workflow simple:

1. Checkout.
2. Authenticate to GCP with Workload Identity.
3. Build and push or source-deploy the small static service.
4. Deploy to Cloud Run with unauthenticated access.
5. Route traffic to latest.
6. Smoke test live content.
7. POST deploy status to `glim-think` `/ops/report`.

## Extraction Steps

1. Create the new repo with the destination shape.
2. Copy static site files and nginx config.
3. Add a README with local and deploy commands.
4. Add generated brand/agent files from the science repo.
5. Add the deploy workflow with only start-site secrets.
6. Deploy to a preview Cloud Run service.
7. Verify preview URL.
8. Point `lupine.science` traffic only after preview proof is captured.
9. Remove `gcp/lupine-site-router/` and its workflow from the science repo in a
   follow-up cleanup PR after the new repo is live.

## Verification Checklist

- Local static preview works.
- Container preview returns `/health`.
- Cloud Run deploy succeeds.
- Live homepage includes the expected "Evidence before claim" content.
- Live navigation links point to the canonical Library and LUPI URLs.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, and `brand.json`
  are present if the site serves them.
- Live status widget degrades gracefully when `glim-think` is unavailable.
- Deploy result appears in `glim-think` `/ops/deployments` or equivalent
  telemetry surface.

## Hazards

- Do not let this repo become a second Library.
- Do not copy broad monorepo secrets.
- Do not hard-code paper status except through generated metadata.
- Update `library.lupine.science` references only when the
  `library.lupine.site` migration is actually live.

## Done State

`lupine.science` is done when the new repo owns the live homepage deploy,
reports deploy telemetry, and the science/control-plane repo can delete the old
start-router path without changing public behavior.
