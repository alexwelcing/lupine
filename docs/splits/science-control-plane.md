# Extraction Packet: Science/Control-Plane Repo

**Goal:** slim the current repo into the durable science/control-plane home once
the public surfaces have moved out.

## Purpose

The science/control-plane repo owns the closed loop:

```text
benchmarks -> hypotheses -> formal obligations -> tests -> simulation/evidence
```

It is the source of truth for `glim-think`, Lean specs, Rust and Python Distill,
MLIP benchmarks, Phoenix/OTLP telemetry, evidence manifests, papers, and the
exports consumed by public repos.

## Maintenance Win

After public surfaces move out, this repo gets sharper:

- fewer top-level deploy surfaces
- fewer unrelated Node app workflows
- clearer ownership for claims, proofs, experiments, and contracts
- public repos consume exports rather than source paths
- CI can focus on science/control-plane gates
- repo navigation becomes easier for agents and researchers

## Keep

| Root | Why it stays |
| --- | --- |
| `glim-think/` | durable agenda, ledger, feed, evals, routes, traces |
| `lean-spec/` | formal proofs and proof obligations |
| `atlas-distill/` | Rust Distill scoring, policy, benchmark, and fault-line engine |
| `python/` | Python Distill packages and runtime |
| `gcp/mlip-cell-runner/` | burst/reproducible MLIP cloud cells |
| `gcp/tasks-consumer/` | control-plane task consumption |
| `cloudflare/` | edge helpers around control-plane infrastructure |
| `lupine-ops/` | operational helpers used by active science code |
| `mlip_immi/` | local real-data MLIP/IMMI analysis lane |
| `data/` | small fixtures and manifests |
| `docs/` | source research corpus, runbooks, plans, decisions |
| `paper/` | manuscript source and publication build inputs |
| `tools/` | local CLIs, telemetry checks, promotion loops, research helpers |

## Add

Create a public-export area that becomes the contract boundary with the three
public repos.

Recommended shape:

```text
exports/
  brand/
    brand.json
    llms.txt
    llms-full.txt
  library-content/
    manifest.json
    articles/
    assets/
    provenance.json
  viewer-contracts/
    molecule-search.schema.json
    saved-view.schema.json
    mcp-tools.schema.json
  claims/
    claim-status.json
    conjecture-ledger.json
  glim-think/
    openapi.json
    routes.json
```

Add generation commands that can run locally and in CI:

```powershell
python scripts/sync_brand_agent_text.py
python scripts/export_public_contracts.py
```

The second command does not exist yet; this packet names the desired contract.

## Remove After Proof

Only remove these after the destination repos are live and verified:

- `gcp/lupine-site-router/`
- `library-site/`
- `atlas/atlas-view/` viewer-owned files
- `.github/workflows/deploy-lupine-site-router.yml`
- `.github/workflows/deploy-library-site.yml`
- `.github/workflows/deploy-glim-viewer.yml`
- `.github/workflows/deploy-functions.yml` if all viewer functions moved
- `.gcloudignore-library`
- public-site-only generated assets

Do not remove shared docs, evidence, papers, or generated exports that public
repos consume.

## Destination Shape

The repo should feel like this after extraction:

```text
science-control-plane/
  glim-think/
  lean-spec/
  atlas-distill/
  python/
  gcp/
    mlip-cell-runner/
    tasks-consumer/
  cloudflare/
  data/
  docs/
  exports/
  mlip_immi/
  paper/
  tools/
  .github/
    workflows/
      verify.yml
      glim-think.yml
      deploy-glim-think.yml
      lean-spec.yml
      build-atlas-distill.yml
      mlip-benchmark.yml
      deploy-glim-compute.yml
      deploy-glim-eval.yml
      deploy-otlp-relay.yml
```

## Public Contracts

This repo publishes, public repos consume.

| Export | Consumer |
| --- | --- |
| brand metadata and agent text | all public repos |
| Library content bundle | `library.lupine.site` |
| claim/status manifests | `library.lupine.site`, `lupine.science` |
| viewer search and MCP schemas | `lupi.live`, agents |
| `glim-think` OpenAPI/routes | all public repos and ops checks |
| evidence manifests and artifact URLs | Library, LUPI, papers |

## Local Dev Loop

Focused checks remain the first pass:

```powershell
just think-lint
just engine-test
just live-build
```

Routine validation:

```powershell
just verify-light
just verify
```

Release/cloud-burst validation:

```powershell
just verify-heavy
```

Lean-specific validation:

```powershell
cd lean-spec
lake build
```

Run Lean from `lean-spec/` so the pinned toolchain is selected.

## Deploy Loop

Keep deploys separated by surface:

- Cloudflare Worker: `glim-think`.
- Cloud Run Jobs: evals, compute, MLIP cells.
- Cloud Run relay: Phoenix OTLP relay.
- Public sites: no longer deployed here after extraction.

Each deploy should continue to report to `glim-think` `/ops/report`, including
public repos after they move.

## Extraction Steps

1. Create and verify export contracts.
2. Extract `lupine.science`; delete old start-router only after live proof.
3. Extract `library.lupine.site`; delete old Library only after live proof.
4. Extract `lupi.live`; delete viewer-owned files only after live proof.
5. Remove public-surface workflows and secrets from this repo.
6. Update `ROOTS.md`, `docs/working-path.md`, `docs/ARCHITECTURE.md`, and
   `README.md` to reflect the final repo shape.
7. Add CI that fails when generated exports are stale.
8. Confirm `just think-lint`, `just engine-test`, and `just live-build` still
   represent the focused path through the repo.

## Verification Checklist

- Focused checks pass or failures are bucketed by inherited vs current cause.
- `glim-think` deploy and live API are verified separately.
- Lean build is green when proof files or imports are touched.
- Rust/Python Distill checks pass when runtime code changes.
- Export generation is deterministic.
- Public repos can consume the latest export artifact without relative paths.
- Removed public-surface workflows no longer appear in this repo.
- `ROOTS.md` has no stale active roots for moved public sites.

## Hazards

- Do not delete public-surface paths before live replacement is proven.
- Do not collapse public-site truth into control-plane truth; keep local, CI,
  deploy, live API, and homepage truth separate.
- Keep large artifacts in GCS/R2 with manifests, not in git.
- Do not make public repos the source of truth for claims or proofs.
- Preserve archive/provenance paths until references are ported or removed.

## Done State

The science/control-plane repo is done when it owns only the durable research
loop and published contracts, while each public URL is maintained in its own
repo and consumes science outputs through explicit exports.
