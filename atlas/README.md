# `atlas/` — LUPI viewer and atomistic evidence surfaces

This root holds a historical copy of the LUPI molecular viewer, atomistic
simulation helpers and gallery datasets. The production viewer at
<https://lupi.live> is built and deployed from the standalone
[`alexwelcing/Lupi`](https://github.com/alexwelcing/Lupi) repository
(its `.github/workflows/deploy-viewer.yml`); this monorepo no longer deploys
it (see `.github/workflows/deploy-glim-viewer.yml`).

## What lives inside

| Directory / File | Purpose |
| --- | --- |
| `atlas-view/` | Monorepo for the LUPI WebGPU molecular viewer (React + Rust→WASM). |
| `atlas-view/apps/web/` | Historical copy of the browser app (lupi.live now deploys from `alexwelcing/Lupi`). |
| `atlas-view/packages/parsers/wasm/` | Rust WASM parsers for LAMMPS dump/log files. |
| `atlas-view/packages/renderer/` | Custom WebGPU atom-rendering pipeline. |
| `atlas-view/functions/` | Firebase Cloud Functions (molecule search, library). These and the Firestore rules still deploy from this repo via `.github/workflows/deploy-functions.yml`. |
| `compute/` | Compute helpers and scripts for generating viewer datasets. |
| `gallery_datasets/` | Curated example structures shipped with the viewer. |
| `lammps_src/` | LAMMPS input snippets and helpers used for sample generation. |
| `nist_ipr/` | NIST interatomic-potentials catalog integration. |
| `deploy_*.py` | Legacy deployment orchestrators for the retired Cloud Run viewer path. They read the service URL from `CLOUD_URL` (no default). |

See [`atlas-view/README.md`](./atlas-view/README.md) for the developer guide to
this copy. Superseded roadmap prototypes and the design manifesto were moved
to [`archive/atlas-2026-roadmap-prototypes/`](../archive/atlas-2026-roadmap-prototypes/).

## Install

The viewer requires Node.js 20+, pnpm, Rust, and `wasm-pack`. Full setup is in
[`docs/ONBOARDING.md`](../docs/ONBOARDING.md) and
[`atlas-view/README.md`](./atlas-view/README.md).

## Build / test

```bash
cd atlas/atlas-view
pnpm install
pnpm build:wasm   # Rust → WASM
pnpm dev          # http://localhost:5173
pnpm test         # Rust + TypeScript tests
```

## How it connects to the rest of the repo

- The public LUPI viewer at `lupi.live` deploys from `alexwelcing/Lupi`; changes
  made here do not reach it.
- `library-site/` links to LUPI views for interactive structures.
- `data/mlip_benchmarks/` provides fixtures that can be inspected in LUPI.
- `gcp/mlip-cell-runner/` and `python/lupine_distill/` produce structures and
  trajectories that land here.
- The agent-drivable MCP surface is documented in
  `atlas/atlas-view/docs/api-keys.md` and `atlas/atlas-view/docs/lupi-mcp-roadmap.md`.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Windows notes

- Do **not** use PowerShell for `pnpm`, `tsc`, `vitest`, or `wasm-pack`; use
  Git Bash or the root `justfile` wrappers to avoid process-tree hangs.
- The `wasm-pack` build must use the Git Bash shell so Rust's target discovery
  works correctly on Windows.

## Related

- [`atlas-view/README.md`](./atlas-view/README.md) — full developer guide
- [`atlas-view/docs/api-keys.md`](./atlas-view/docs/api-keys.md) — agent API-key flow
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — system map
