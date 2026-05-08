# Lupine — applied learning mechanics for atomistic ML

**The audit layer for the MLIP ecosystem — and the low-rank retraining target that compounds out of it.** Cross-potential geometric error analysis across ≈900 published interatomic potentials. Built on the sloppy-models lineage of Frederiksen, Jacobsen, Brown & Sethna (2004), Transtrum, Machta & Sethna (2011), Wen et al. (2017), and Kurniawan et al. (2022); read alongside Simon, Kunin, Atanasov et al. (arXiv:2604.21691, 2026), it is one applied case of the emerging mechanics of learning.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | TanStack Start, React 19, TypeScript | SSR, file-based routing, server functions |
| Styling | Tailwind CSS v4, custom tokens | Theme-aware tokens, dark + light modes |
| Animation | Framer Motion | Bespoke SVG visuals for the audit/accelerator/compounding cards, reduced-motion-aware |
| Data | TanStack Query, Cloudflare Workers | Public manifest ledger, harden-stage telemetry |
| Inspection | WebGPU (Atlas Viewer) | Browser-native exploration of the cross-potential error manifold |
| Engine | Rust + WASM (`atlas-distill`) | Single static binary, deterministic build, air-gap-compatible |

## Routes

| Route | Description |
|-------|-------------|
| `/` | Hero + audit/accelerator/compounding cards with bespoke animated SVGs |
| `/research` | IMMI preprint — cross-potential geometric error analysis with the full citation chain |
| `/lineage` | Two parallel programs: sloppy-models materials science + learning mechanics |
| `/pilots` | Three named wedges: solid-state electrolytes, Ni-base superalloys, electrocatalysis |
| `/atlas-viewer` | WebGPU exploration of the manifold and customer trajectories |
| `/investor-relations` | Audit-compounds-into-shortcut thesis, manifest, diligence answers |
| `/about` | Mission, stack, milestones |
| `/proof` | Response to preprint critique |
| `/process` | Operating report on the harden stage that sits behind the audit |
| `/evolution` | Round-by-round trail of the harden stage |
| `/console` | Tabular browser for the manifest ledger |
| `/live` | Harden-stage telemetry feed |
| `/ops` | Deployment telemetry (GitHub Actions) |

## Design system

Two visual modes, both anchored on the same tokens:
- **Dark** — slate-950 surfaces, Lupine Blue (#3b82f6) primary.
- **Light** — warm paper (#fef8f5) surfaces, Texas Bluebonnet (#475b9c) primary.

Tokens in `src/styles/tokens.css`; component styles in `src/styles/components.css`. The bespoke visuals on `/` use theme-aware `var(--surface-container-low)` / `var(--on-surface-variant)` / `color-mix(...)` so they look right in both modes, and the flywheel respects `prefers-reduced-motion`.

## Build

```bash
pnpm build
```

## Deploy

Cloud Run via `cloudbuild.yaml`:

```bash
gcloud builds submit --config cloudbuild.yaml
```

## License

Apache 2.0
