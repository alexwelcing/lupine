# Lupine Repo Split Architecture Map

**Status:** planning map

**Date:** 2026-06-17

**Scope:** split the public Lupine surfaces from the science/control-plane repo
without losing the closed scientific loop.

This document is the migration map for separating the current `shed` monorepo
into four repos:

1. `lupine.science` - public program/start site.
2. `lupi.live` - browser-native molecular viewer and agent-drivable viewer API.
3. `library.lupine.site` - public research reader/library surface.
4. Science/control-plane repo - `glim-think`, Distill, Lean, Rust, Python,
   benchmarks, experiments, and evidence ledgers.

The split should make deployable surfaces cleaner without weakening the
research spine. The science/control-plane repo remains the source of truth for
claims, proofs, experiments, contracts, and generated evidence artifacts.

Detailed extraction packets live in [`docs/splits/`](./splits/):

- [`lupine.science`](./splits/lupine-science.md)
- [`library.lupine.site`](./splits/library-lupine-site.md)
- [`lupi.live`](./splits/lupi-live.md)
- [`science/control-plane repo`](./splits/science-control-plane.md)

## Target Repos

| Target repo | Product URL | Current source paths | Owns | Must not own |
| --- | --- | --- | --- | --- |
| `lupine.science` | `https://lupine.science` | `gcp/lupine-site-router/`, selected generated brand/agent files | Public start page, `robots.txt`, `sitemap.xml`, `llms.txt`, lightweight live status widget, canonical links to Library/LUPI/source | Full research corpus, viewer app, private deck, heavy experiment code |
| `lupi.live` | `https://lupi.live` | `atlas/atlas-view/`, `atlas/deploy_slim.py` viewer bundle path, viewer-specific Firebase files | WebGPU viewer, saved views, API-key auth, MCP/agent viewer control, federated molecule search, gallery/trajectory UX, viewer CI and deploy | Library reader, general science docs, Distill/Lean engines, unrelated Atlas research-site output |
| `library.lupine.site` | `https://library.lupine.site` | `library-site/`, generated library content export from the science repo | Mobile/PWA reader, shelves, search, offline cache, public library deploy, rendered research corpus | Source-of-truth claims, proofs, raw experiment runners, viewer runtime |
| science/control-plane repo | no single public site | current repo after public surfaces leave: `glim-think/`, `lean-spec/`, `atlas-distill/`, `python/`, `gcp/mlip-cell-runner/`, `gcp/tasks-consumer/`, `cloudflare/`, `tools/`, `mlip_immi/`, `data/`, `docs/`, `paper/` | Durable agenda, ledger, formal proofs, Rust/Python Distill runtime, MLIP benchmarks, Phoenix traces, cloud/local compute, source research docs, exported contracts/artifacts | Product-specific static sites after extraction |

Name note: existing docs and config still point the Library at
`library.lupine.science`. The target split above uses the requested
`library.lupine.site`. Treat that as an intentional domain migration, not a
typo to smooth over.

## Boundary Rule

After the split, public repos should consume versioned contracts and generated
artifacts. They should not import source files from the science repo by relative
path, and they should not duplicate scientific truth.

The science/control-plane repo publishes:

| Artifact | Producer | Consumers |
| --- | --- | --- |
| Brand and canonical-link metadata | `brand.config.json` plus sync scripts | all public repos |
| Agent guide files | `docs/brand/agent/*`, generated `llms.txt`/`llms-full.txt` | `lupine.science`, Library, LUPI |
| Library content bundle | docs corpus + `library-site/scripts/catalog.js` successor/export | `library.lupine.site` |
| Claim/status manifest | `glim-think`, docs/conjectures, changelog | Library, `lupine.science`, search/agent files |
| Viewer molecule/search contracts | LUPI schema docs and generated JSON schemas | `lupi.live`, science repo tools, agents |
| `glim-think` OpenAPI/routes | `glim-think/docs/routes.md` and Worker source | public sites, tests, operations |
| Evidence manifests | `data/`, `mlip_immi/`, GCS/R2 manifests, benchmark outputs | Library, LUPI, papers |
| Deploy telemetry endpoint | `glim-think` `/ops/report` | each public repo CI/deploy workflow |

If a public repo needs new scientific data, add an export or contract in the
science repo first, then consume that export from the public repo.

## Current Deploy Truth

| Surface | Current workflow | Current deploy unit | Notes for split |
| --- | --- | --- | --- |
| `lupine.science` | `.github/workflows/deploy-lupine-site-router.yml` | Cloud Run service from `gcp/lupine-site-router/` | Static nginx service. Good first extraction candidate. |
| Library | `.github/workflows/deploy-library-site.yml` | Cloud Build using `library-site/cloudbuild.yaml` and `.gcloudignore-library` | Build reads selected repo markdown directly. Needs a generated content bundle before extraction is clean. |
| LUPI viewer | `.github/workflows/deploy-glim-viewer.yml` | Cloud Run service from `atlas/deploy_bundle` | `atlas/deploy_slim.py` currently builds both a research-doc bundle and the web viewer. Split those before extraction. |
| Firebase viewer support | `.github/workflows/deploy-functions.yml`, `atlas/atlas-view/firebase.json`, `firestore.rules` | Cloud Functions + Firestore rules | Must move with `lupi.live` unless functions are promoted to a shared platform repo. |
| `glim-think` | `.github/workflows/deploy-glim-think.yml` | Cloudflare Worker | Stays in science/control-plane repo. |
| MLIP/evals/compute | `.github/workflows/deploy-glim-eval.yml`, `deploy-glim-compute.yml`, `mlip-benchmark.yml` | Cloud Run Jobs, GitHub Actions, Worker ingest | Stays in science/control-plane repo. |
| Lean/Rust/Python verification | `lean-spec.yml`, `build-atlas-distill.yml`, `verify.yml` | CI only | Stays in science/control-plane repo. |

## Repo Contents By Destination

### `lupine.science`

Move or recreate:

- `gcp/lupine-site-router/Dockerfile`
- `gcp/lupine-site-router/nginx.conf`
- `gcp/lupine-site-router/public/**`
- a small workflow equivalent to `deploy-lupine-site-router.yml`
- generated `llms.txt`, `llms-full.txt`, and `brand.json` if served at the
  apex domain

Keep as external dependencies:

- `glim-think` progress endpoint for live status.
- Library URL and LUPI URL from brand metadata.
- Generated claim/status summaries from the science repo, if needed.

### `lupi.live`

Move:

- `atlas/atlas-view/apps/web/`
- `atlas/atlas-view/packages/`
- `atlas/atlas-view/tools/`
- `atlas/atlas-view/functions/`
- `atlas/atlas-view/firebase.json`
- `atlas/atlas-view/firestore.rules`
- `atlas/atlas-view/firestore.indexes.json`
- `atlas/atlas-view/package.json`
- `atlas/atlas-view/pnpm-lock.yaml`
- `atlas/atlas-view/pnpm-workspace.yaml`
- viewer docs such as `docs/api-keys.md` and `docs/lupi-mcp-roadmap.md`

Review before moving:

- `atlas/deploy_slim.py` currently mixes old research-site output and viewer
  deploy output. The viewer repo should own only the viewer deploy bundle.
- `atlas/atlas-view/apps/lupi-studio/` and `apps/lupine-site/` are marked as
  retired/duplicate in orientation docs but still appear on disk. Treat them as
  extraction hazards until separately audited.
- Generated build outputs such as `dist/`, `.turbo/`, logs, screenshots, and
  temporary folders should not seed the new repo.

External dependencies:

- Firebase project/config/secrets.
- GCS buckets for NIST/OMol25/gallery assets.
- `glim-think` for deploy telemetry and science/control-plane APIs.
- Published molecule/search schemas from the science repo.

### `library.lupine.site`

Move:

- `library-site/src/**`
- `library-site/scripts/**`
- `library-site/Dockerfile`
- `library-site/nginx.conf`
- `library-site/cloudbuild.yaml` or replacement deploy workflow
- `library-site/package.json`
- `library-site/package-lock.json`

Do not move raw science ownership blindly:

- `docs/**`, root reports, `paper/**`, and `lean-spec/**` should remain
  source truth in the science repo.
- The Library repo should consume a generated content bundle, a git submodule,
  an artifact download, or a published package. Prefer a generated bundle first
  because it makes the public build reproducible and keeps repo ownership clear.

Before extracting, replace `library-site/scripts/catalog.js` relative paths with
an explicit content input contract. The current `.gcloudignore-library` is a
useful list of what the build actually reads today.

### Science/control-plane repo

Keep:

- `glim-think/`
- `lean-spec/`
- `atlas-distill/`
- `python/`
- `gcp/mlip-cell-runner/`
- `gcp/tasks-consumer/`
- `cloudflare/`
- `lupine-ops/`
- `mlip_immi/`
- `data/`
- `tools/`
- `docs/`
- `paper/`
- benchmark, proof, telemetry, and deploy workflows that serve the closed loop

Add:

- a `contracts/` or `exports/` area for generated public artifacts
- release manifests for Library and LUPI consumers
- CI that proves exported contracts are current
- a short "public surface consumers" table in `glim-think` docs

Remove after proof:

- `gcp/lupine-site-router/`
- `library-site/`
- viewer-specific `atlas/atlas-view/` files once `lupi.live` owns them
- public-surface deploy workflows that have moved to the new repos

## Migration Order

1. Freeze this map, the source/deploy inventory, and the
   [`docs/splits/`](./splits/) extraction packets.
2. Add export contracts in the science repo:
   - brand metadata
   - Library content bundle
   - claim/status manifest
   - viewer molecule/search schemas
   - `glim-think` OpenAPI/routes
3. Extract `lupine.science`.
   - Smallest surface.
   - No heavy build.
   - Prove `/health`, homepage content, canonical links, and live status widget.
4. Extract `library.lupine.site`.
   - First prove the content export path.
   - Then move the reader and deploy workflow.
   - Prove local build, Cloud Run health, offline/service-worker shell, and
     correct domain/canonical links.
5. Extract `lupi.live`.
   - First separate viewer deploy from the old research bundle in
     `atlas/deploy_slim.py`.
   - Move Firebase/functions/rules with the viewer unless a shared platform
     repo is explicitly created.
   - Prove local build, viewer smoke tests, saved views, API-key exchange,
     federated search, MCP/agent bridge, and live URL behavior.
6. Rename or slim the remaining repo as the science/control-plane repo.
   - Keep `glim-think`, Lean, Distill, MLIP runners, papers, data, and tools.
   - Remove moved public-surface deploy paths only after the new repos are live.
7. Update brand/canonical URLs and generated agent files.
   - Especially migrate Library references from `library.lupine.science` to
     `library.lupine.site` once DNS/deploy is real.

## Verification Gates

Do not consider a repo extracted until all relevant gates pass.

| Repo | Local gate | CI/deploy gate | Live gate |
| --- | --- | --- | --- |
| `lupine.science` | static asset build or nginx smoke | Cloud Run deploy succeeds | `/health`, homepage, `robots.txt`, `sitemap.xml`, `llms.txt`, live status widget |
| `library.lupine.site` | `npm ci`, `npm run build`, local serve smoke | Cloud Build/Run deploy succeeds | `/health`, reader shell, search index, article routes, service worker, canonical URLs |
| `lupi.live` | `pnpm install`, `pnpm build`, focused verifier scripts | Cloud Run + Firebase deploys succeed | viewer load, gallery/OMol25/NIST search, saved views, API key exchange, MCP bridge, mobile smoke |
| science/control-plane | `just think-lint`, `just engine-test`, `just live-build`, Lean build when touched | relevant GitHub Actions green | `glim-think` API, deploy telemetry, Phoenix relay where configured, benchmark ingest where touched |

Keep reporting these as separate truth surfaces: local, CI, deploy, live API,
and public homepage.

## Extraction Hazards

- Domain drift: current files still use `library.lupine.science`; target split
  says `library.lupine.site`.
- Viewer deploy coupling: `deploy-glim-viewer.yml` and `atlas/deploy_slim.py`
  currently package a research route along with the viewer.
- Catalog coupling: Library build reads repo markdown by relative paths.
- Firebase coupling: viewer auth, saved views, API keys, Firestore rules, and
  Cloud Functions need to move together or be promoted behind a stable service.
- Decoy/scratch surfaces: do not migrate retired `lupi-studio`, nested
  `lupine-site`, generated `dist/`, `.turbo`, logs, or scratch folders without
  a separate audit.
- Secret sprawl: each new repo needs only its own deploy secrets plus the
  shared deploy telemetry endpoint. Avoid copying all monorepo secrets.
- Reporting continuity: all public repos should keep posting deploy outcomes to
  `glim-think` `/ops/report` so the science/control-plane ledger still sees
  public-surface health.

## Done State

The split is done when:

- Each public URL has a dedicated repo, CI, deploy workflow, and live health
  proof.
- Public repos consume science artifacts through contracts/exports, not through
  hidden monorepo paths.
- The science/control-plane repo still closes the loop: benchmarks to
  hypotheses to Lean/proofs to tests to simulation/evidence.
- The old monorepo no longer owns public site deploys, but it still owns the
  claims, proofs, experiments, traces, and evidence artifacts behind them.
