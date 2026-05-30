# Lupine Science Start Page

The TanStack Start app is the public research-program entry point for Lupine
Science. Its front door should read as a serious orientation for materials
labs, MLIP builders, university groups, national-lab teams, and research
software collaborators.

The page should make the science easy to understand before it asks for any
commercial interpretation:

- where interatomic potentials fail
- why those failures have structure
- how LUPI makes evidence inspectable
- how the Lupine Library preserves the claim lifecycle
- how observers can watch the evidence trail without a pitch-first surface

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | TanStack Start, React 19, TypeScript | SSR, file-based routing, server functions |
| Styling | Tailwind CSS v4, custom tokens | Theme-aware tokens, dark + light modes |
| Animation | Framer Motion | Reduced-motion-aware transitions and visual polish |
| Data | TanStack Query, Cloudflare Workers | Public manifest ledger, live-lab telemetry |
| Inspection | WebGPU (LUPI) | Browser-native exploration of atomistic evidence |
| Engine | Rust + WASM (`atlas-distill`) | Single static binary, deterministic build, air-gap-compatible |

## Routes

| Route | Description |
|-------|-------------|
| `/` | Lab-facing orientation: science question, science spine, evidence routes, observer signals |
| `/research` | IMMI preprint and cross-potential geometric error analysis |
| `/lineage` | Sloppy-models lineage, materials-science context, and learning-mechanics links |
| `/pilots` | MLIP failure-geometry audit examples and bounded workflow scopes |
| `/lupi` | LUPI route for browser-native evidence inspection |
| `/investor-relations` | Secondary observer notes and diligence context |
| `/about` | Mission, stack, and milestones |
| `/proof` | Response to preprint critique |
| `/process` | Operating report on the harden stage behind the evidence trail |
| `/evolution` | Round-by-round research loop history |
| `/console` | Tabular browser for the manifest ledger |
| `/live` | Live lab telemetry and broadcasts |
| `/ops` | Deployment telemetry |

## Copy Guardrails

- Prefer lab-facing scientific orientation over generic pitch language.
- Keep LUPI framed as an evidence inspection surface, not the whole product.
- Keep the Lupine Library framed as the durable human knowledge surface.
- Keep investor/observer context secondary to public evidence.
- Use `Lupine Science`, `LUPI`, `Lupine Library`, and `https://lupi.live`.
- Avoid retired organization names, legacy viewer labels, and retired domains.

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
