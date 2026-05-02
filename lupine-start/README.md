# Lupine — Materials Science Platform

**Unified computational materials science infrastructure.** From electrons to engineering insights in a single codebase.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | TanStack Start, React 19, TypeScript | SSR, file-based routing, server functions |
| Styling | Tailwind CSS v4, custom tokens | "Living Manuscript" design system |
| Animation | Framer Motion | Page transitions, scroll reveals |
| Data | TanStack Query, Cloudflare Workers | Real-time telemetry, edge APIs |
| Rendering | WebGPU (Atlas Viewer) | 10M+ atom visualization at 60fps |
| Compute | Rust + WASM | Memory-safe parsers, potential evaluation |

## Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, pillars, stats, IP comparison |
| `/research` | Flagship paper — Hyper-Ribbon classifier results |
| `/live` | Live Lab — real-time swarm telemetry & research diary |
| `/atlas-viewer` | WebGPU molecular visualization product page |
| `/about` | Team, mission, stack, timeline |
| `/proof` | Research defense — rebuttal to preprint critique |
| `/investor-relations` | IR page with secure data room CTA |
| `/ops` | Deployment telemetry (GitHub Actions) |

## Design System

Two visual modes:
- **Dark (Obsidian)** — default. Slate-950 surfaces, Lupine Blue (#3b82f6) primary.
- **Light (Living Manuscript)** — warm paper (#fef8f5) surfaces, Texas Bluebonnet (#475b9c) primary.

Tokens defined in `src/styles/tokens.css`. Component styles in `src/styles/components.css`.

## Build

```bash
npm run build
```

## Deploy

Deploys to Google Cloud Run via `cloudbuild.yaml`. On push to `main`:

```bash
gcloud builds submit --config cloudbuild.yaml
```

## License

Apache 2.0
