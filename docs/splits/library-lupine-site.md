# Extraction Packet: `library.lupine.site`

**Goal:** extract the Lupine Library reader into its own repo while replacing
monorepo-relative content reads with an explicit content contract.

## Purpose

`library.lupine.site` owns the public reader experience: shelves, search,
offline/PWA behavior, article routes, reader settings, and public Library
deployment. It does not own the source-of-truth claims, proofs, papers, or
experiment code.

## Maintenance Win

The extraction should make the Library easier to develop by turning the content
input into a stable artifact:

- reader app can build without cloning the entire science repo
- content changes are versioned through a manifest
- local dev can run against fixture content or the latest exported bundle
- domain/canonical URL migration is handled in one repo
- deploy workflows only need Library secrets

## Current Source

| Current path | Role |
| --- | --- |
| `library-site/src/**` | SPA shell, reader UI, service worker, static assets |
| `library-site/scripts/build.js` | markdown-to-library build |
| `library-site/scripts/catalog.js` | curated source paths and shelves |
| `library-site/scripts/serve.js` | local dev server |
| `library-site/Dockerfile` | nginx image |
| `library-site/nginx.conf` | static serving and health check |
| `library-site/cloudbuild.yaml` | Cloud Build/Cloud Run deploy |
| `.github/workflows/deploy-library-site.yml` | deploy trigger wrapper |
| `.gcloudignore-library` | current upload allowlist for build inputs |

## Required New Contract

Before extraction, create a science-repo export that replaces direct relative
reads of `docs/**`, root markdown files, and paper artifacts.

Recommended artifact:

```text
exports/library-content/latest/
  manifest.json
  articles/
    changelog.md
    conjecture-ledger.md
    ...
  assets/
    ...
  provenance.json
```

Generate the current bundle from the science/control-plane repo with:

```powershell
cd library-site
npm run content:export
```

`manifest.json` should include:

- content bundle version
- source commit SHA
- generated timestamp
- canonical domain
- article IDs, routes, titles, subtitles, tags, status labels, source paths
- asset paths and hashes

The Library repo can then build from `library-content/` rather than from
monorepo paths.

## Destination Shape

```text
library.lupine.site/
  src/
  scripts/
    build.js
    serve.js
    fetch-content-bundle.js
  content/
    fixtures/
    latest/          # ignored or generated
  public/
  Dockerfile
  nginx.conf
  package.json
  package-lock.json
  README.md
  docs/
    content-contract.md
    operations.md
    release-checklist.md
  .github/
    workflows/
      build.yml
      deploy.yml
```

## Move

- `library-site/src/**`.
- `library-site/scripts/**`, after adapting them to read the content bundle.
- `library-site/Dockerfile`.
- `library-site/nginx.conf`.
- `library-site/package.json` and `package-lock.json`.
- Deployment workflow and Cloud Build logic, simplified for the new repo.

## Leave Behind

- `docs/**` source corpus.
- `paper/**` and generated paper pipelines.
- `lean-spec/**`.
- `glim-think/**`.
- `atlas-distill/**`, `python/**`, `mlip_immi/**`, `data/**`.
- Source claims and proof ledgers, except as exported content.
- Generated `dist/` and `node_modules/`.

## Public Contracts

Consume from the science/control-plane repo:

| Contract | Why |
| --- | --- |
| Library content bundle | article content, shelves, status labels, provenance |
| brand metadata | canonical links and organization metadata |
| agent guide files | `/llms.txt`, `/llms-full.txt`, `/brand.json` if served |
| claim/status manifest | status facets and badges |
| paper PDF/web artifacts | downloadable papers without moving source ownership |

## Secrets And Infra

Minimum repo secrets:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_SERVICE_NAME_LIBRARY` or equivalent

Optional:

- artifact download token if content bundles are private before publication
- deploy telemetry token if `glim-think` makes `/ops/report` gated later

Do not copy viewer Firebase secrets, MLIP runner secrets, or Cloudflare Worker
secrets.

## Local Dev Loop

Target commands:

```powershell
npm ci
npm run content:fetch
npm run build
npm run dev
```

During the transition, `content:fetch` can copy a local science-repo export.
After extraction, it should download a release artifact or package.

Expected local smoke:

- homepage renders shelves
- search returns known fixture articles
- article route loads from generated content
- reader settings persist locally
- service worker registers in a browser smoke test

## Deploy Loop

1. Fetch or receive content bundle.
2. Validate `manifest.json` schema and hashes.
3. Build static Library output.
4. Build nginx image.
5. Deploy to Cloud Run.
6. Smoke test `/health`, homepage, a representative article, search index, and
   service-worker assets.
7. POST deploy status to `glim-think` `/ops/report`.

## Extraction Steps

1. Add a content export command in the science repo.
2. Build the current Library from the exported bundle without direct repo-path
   reads.
3. Add fixture content for Library repo tests.
4. Create the new repo and move reader app files.
5. Replace `library.lupine.science` config with `library.lupine.site` only when
   DNS/deploy is ready.
6. Add build/deploy workflows.
7. Deploy a preview service from the new repo.
8. Compare preview against current live Library.
9. Cut over DNS/domain mapping.
10. Remove `library-site/`, `.gcloudignore-library`, and
    `deploy-library-site.yml` from the science repo after live proof.

## Verification Checklist

- `npm ci` succeeds.
- `npm run build` succeeds from a content bundle.
- Local preview loads shelves, search, and at least three article categories.
- Offline cache path works in a browser smoke test.
- Cloud Run `/health` returns `ok`.
- Live routes preserve or intentionally redirect old Library URLs.
- Canonical URLs use `library.lupine.site` after cutover.
- Deploy telemetry lands in `glim-think`.

## Hazards

- The current build reads source files by relative path through
  `scripts/catalog.js`; do not extract until that is replaced or intentionally
  wrapped.
- Domain migration can break SEO and agent references; update brand metadata,
  sitemaps, canonical tags, `llms.txt`, and cross-site links together.
- Do not move proof/source ownership into the Library repo just because the
  Library displays proof-related pages.
- Keep the PWA cache version tied to content bundle version so stale articles do
  not survive a cutover.

## Done State

`library.lupine.site` is done when the reader repo builds entirely from an
exported content contract, deploys independently, serves the live Library
domain, and the science/control-plane repo remains the only owner of the source
claims and evidence.
