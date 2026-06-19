# Extraction Packet: `lupi.live`

**Goal:** extract the LUPI viewer into a dedicated repo that owns the browser
viewer, auth, saved views, molecule search, and agent-control surface.

## Purpose

`lupi.live` owns the inspectable molecular viewer. It should be the natural
home for WebGPU/WebGL viewer code, molecule loading, visual controls, saved
views, Firebase auth, API-key exchange, Firestore rules, viewer Cloud Functions,
MCP/agent bridge behavior, screenshots/exports, and viewer-specific deploy
verification.

It should not own the research corpus, Distill runtime, Lean proofs, MLIP
benchmark execution, or the public Library reader.

## Maintenance Win

After extraction, viewer work gets faster and safer:

- one `pnpm` workspace focused on LUPI
- Firebase and Firestore rules live beside the app that uses them
- viewer smoke tests do not drag in unrelated science docs
- agent/API-key docs live with the agent surface
- old research-site deploy coupling is removed
- decoy apps are left behind or deleted after audit

## Current Source

| Current path | Role |
| --- | --- |
| `atlas/atlas-view/apps/web/` | canonical LUPI browser app |
| `atlas/atlas-view/packages/**` | viewer packages, UI, renderer, parsers, shared logic |
| `atlas/atlas-view/tools/**` | verification, gallery, trajectory, MCP, and asset tools |
| `atlas/atlas-view/functions/**` | Firebase/Cloud Functions for viewer operations |
| `atlas/atlas-view/firebase.json` | Firebase deploy config |
| `atlas/atlas-view/firestore.rules` | Firestore security rules |
| `atlas/atlas-view/firestore.indexes.json` | Firestore indexes |
| `atlas/atlas-view/package.json` | workspace scripts |
| `atlas/atlas-view/pnpm-lock.yaml` | dependency lock |
| `atlas/atlas-view/pnpm-workspace.yaml` | workspace layout |
| `atlas/atlas-view/docs/api-keys.md` | API-key auth flow |
| `atlas/atlas-view/docs/lupi-mcp-roadmap.md` | agent/MCP roadmap |
| `.github/workflows/atlas-view-ci.yml` | viewer CI |
| `.github/workflows/deploy-glim-viewer.yml` | current Cloud Run deploy |

## Destination Shape

```text
lupi.live/
  apps/
    web/
  packages/
    core/
    export/
    parsers/
    renderer/
    scene/
    ui/
  functions/
  tools/
  docs/
    api-keys.md
    mcp-roadmap.md
    operations.md
    release-checklist.md
  firebase.json
  firestore.rules
  firestore.indexes.json
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  README.md
  .github/
    workflows/
      ci.yml
      deploy-viewer.yml
      deploy-functions.yml
```

## Move

- Canonical viewer app: `apps/web/`.
- All active viewer packages under `packages/`.
- Viewer tools used by CI, local verification, gallery/search/index generation,
  trajectory checks, MCP bridge checks, and asset baking.
- Firebase functions/config/rules/indexes.
- Viewer docs that describe auth, API keys, MCP, saved views, and operations.
- Active viewer workflows, simplified for the new repo.

## Leave Behind Or Audit First

- `atlas/atlas-view/apps/lupi-studio/`: marked retired/duplicate in
  orientation docs; do not seed the new repo unless separately re-approved.
- `atlas/atlas-view/apps/lupine-site/`: old nested marketing/research output;
  do not move into the viewer repo.
- `atlas/deploy_slim.py` research-site build path: split out before extraction.
- generated `dist/`, `.turbo/`, `node_modules/`, logs, screenshots, scratch,
  and temporary output.
- science repo roots: `glim-think/`, `lean-spec/`, `atlas-distill/`, `python/`,
  `mlip_immi/`, `data/`, `paper/`.

## Public Contracts

Consume from the science/control-plane repo:

| Contract | Why |
| --- | --- |
| molecule/search schema manifests | stable agent and UI search contracts |
| evidence and molecule manifests | link viewer routes to science artifacts |
| brand metadata | canonical publisher/org metadata |
| `glim-think` APIs | live science status and deploy telemetry |
| generated docs snippets | public explanation without owning the corpus |

Viewer-owned contracts:

- saved view schema
- API-key exchange API behavior
- MCP/tool schemas for viewer control
- URL serialization contract
- screenshot/export artifact contract

## Secrets And Infra

Viewer repo secrets should include only viewer infra:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_SERVICE_NAME_VIEWER`
- Firebase project deploy credentials/config
- Cloud Functions deploy secrets
- optional deploy telemetry token if added later

Keep these out unless explicitly needed:

- Cloudflare Worker deploy token for `glim-think`
- MLIP/GCP runner secrets
- Phoenix API keys not used by viewer deploy
- deck access secrets

## Local Dev Loop

Use Git Bash or the repo-provided scripts for Node build tasks on Windows.
Target commands:

```powershell
pnpm install
pnpm build
pnpm verify:viewer
pnpm verify:controls
pnpm verify:study-lens
pnpm verify:mcp-bridge
```

For active development:

```powershell
pnpm dev
```

Expected local smoke:

- app loads with gallery/default molecule
- controls render and do not overlap on desktop/mobile profiles
- Study Lens works
- saved-view UI handles signed-out state
- MCP bridge exposes expected auth state and command shape

## Deploy Loop

1. Install pnpm deps.
2. Build viewer app.
3. Build only viewer deploy bundle, not the old research route.
4. Deploy Cloud Run viewer service.
5. Deploy Firebase functions/rules/indexes when relevant files change.
6. Smoke test live `https://lupi.live`.
7. Smoke test auth helper paths, saved views, search providers, and MCP bridge.
8. POST deploy status to `glim-think` `/ops/report`.

## Extraction Steps

1. Remove research-site generation from the viewer deploy path.
2. Confirm `apps/web` is the only public viewer app.
3. Audit and either delete or explicitly archive `lupi-studio` and nested
   `lupine-site`.
4. Create the new repo with active workspace files only.
5. Move Firebase functions/config/rules with the app.
6. Recreate viewer CI and deploy workflows with viewer-only secrets.
7. Prove local build and focused verifier scripts.
8. Deploy preview Cloud Run service.
9. Verify saved views, API-key exchange, search providers, and MCP bridge.
10. Cut over `lupi.live` only after live preview proof.
11. Remove viewer deploy workflow and moved viewer paths from the
    science/control-plane repo after cutover.

## Verification Checklist

- `pnpm install` succeeds from a clean clone.
- `pnpm build` succeeds.
- `pnpm verify:viewer` succeeds.
- `pnpm verify:controls` and mobile controls smoke succeed.
- `pnpm verify:study-lens` succeeds.
- `pnpm verify:mcp-bridge` succeeds or reports an expected gated-auth state.
- Cloud Run deploy succeeds.
- Firebase functions/rules deploy succeeds when touched.
- Live viewer loads at `https://lupi.live`.
- Federated search returns gallery, saved-view, NIST, OMol25, Library, and
  PubChem behavior as applicable.
- API-key exchange works with a test key or documented staging substitute.
- Deploy telemetry lands in `glim-think`.

## Hazards

- Viewer deploy currently builds old research output too. Split this before
  extraction or the new repo starts with confusing ownership.
- Firebase auth domain and helper paths are production-sensitive. Verify live
  sign-in behavior, not just build output.
- Firestore rules must move with saved views and API-key metadata.
- MCP/agent behavior should be verified with real auth failure/success states,
  not only source inspection.
- Do not move large generated assets unless the new repo truly owns them; prefer
  GCS/R2 with manifests.

## Done State

`lupi.live` is done when the new repo owns viewer code, viewer deploy, Firebase
viewer support, saved views, API-key auth, and MCP/agent viewer contracts, and a
fresh clone can build and verify LUPI without the science/control-plane repo.
