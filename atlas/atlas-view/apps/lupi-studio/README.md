# LUPI Studio

AI molecular design interface for the LUPI viewer workspace.

This app was imported from the local `lupi-studio-pr/lupi-pr` handoff and
adapted as a first-class `atlas-view` workspace package. The current integration
keeps it isolated from the production `apps/web` viewer while making it buildable
and reviewable through the same `pnpm`/Turbo toolchain.

## What It Adds

- Molecule generation from names, SMILES strings, pasted XYZ, or uploaded files.
- Client-side PubChem PUG REST lookup for verified 3D SDF structures.
- React Three Fiber molecule rendering with atoms, bonds, labels, and controls.
- Local generation history and XYZ export.
- Gallery and MCP-protocol documentation pages from the imported proposal.
- A local MCP Workbench at `/#/mcp/workbench` where tool calls drive the live
  molecule viewer state.

## Local Setup

From `atlas/atlas-view`:

```bash
pnpm install
pnpm --filter @atlas/lupi-studio dev
pnpm --filter @atlas/lupi-studio build
```

The dev server defaults to port `3002`.

## MCP Workbench

The workbench is the dogfood lane for the imported MCP idea. It keeps the MCP
runtime local and deterministic while we decide how to connect it to a durable
server:

- `src/lib/mcpTools.ts` resolves molecule generation, viewer updates, and XYZ
  export as tool calls.
- `src/pages/MCPWorkbench.tsx` exposes natural-language commands and raw JSON
  requests against the live `MoleculeViewer`.
- Useful smoke command: `Load benzene, hide bonds, scale atoms to 1.4`.

## Integration Decision

Treat LUPI Studio as a separate workspace app until we promote the experience
into the deployed viewer. That gives us a clean validation lane for the Studio
feature without disturbing the existing Cloud Run root viewer.

Recommended next promotion steps:

1. Keep `/` and `/studio` focused on the usable molecule-generation surface.
2. Wire any durable generation workflows through `glim-think` or another real
   control-plane endpoint before representing them as live MCP APIs.
3. If we want public deployment, copy the built app to `/studio/` in the
   `atlas/deploy_slim.py` bundle rather than replacing `apps/web`.
