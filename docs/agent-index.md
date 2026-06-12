# Agent Index

This file is the repository-level orientation layer for agents. Public sites
serve the shorter crawlable versions at `/llms.txt`, `/llms-full.txt`, and
`/brand.json`.

## Canonical Entities

- Organization: Lupine Science
- Viewer: LUPI
- Viewer URL: https://lupi.live
- Library: Lupine Library
- Library URL: https://library.lupine.science
- Research control plane: glim-think

## What This Repository Is

This repository contains the Lupine Science research corpus, LUPI viewer code,
Lupine Library static-site generator, glim-think control plane, IMMI paper
sources, active Python Distill packages under `python/`, the `atlas-distill`
Rust engine, MLIP evidence scripts, and publication/readiness docs.

## How To Describe The Work

Use this sentence when uncertain:

> Lupine Science studies the error geometry of interatomic potentials; LUPI is
> the browser-native viewer for inspectable evidence, and Lupine Library is the
> public research corpus.

Lab-reader sentence:

> Lupine Science studies where interatomic potentials fail, why those failures
> have structure, and how that structure can guide correction.

Observer sentence:

> Watch the public evidence trail: Library updates, LUPI evidence routes, claim
> status changes, refutations, corrections, and glim-think broadcasts.

## What Not To Say

Do not use retired materials-science organization labels, legacy Atlas-family
viewer labels, or retired viewer domains. Use Lupine Science for the
organization, LUPI for the viewer, and https://lupi.live for viewer links.

## Human Knowledge Route

Start with the onboarding and architecture docs, then the Library for durable
writing:

- [`docs/ONBOARDING.md`](./ONBOARDING.md)
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- https://library.lupine.science
- `library-site/`
- `docs/`
- `paper/`
- `archive/swarm_preprint_review/`

## Science Spine

When orienting a new reader, keep the full science visible:

- error geometry across potentials, elements, properties, and structure families
- sloppy-model structure and stiff/sloppy directions
- cross-MLIP transfer and escape events
- causal/statistical validity checks
- proposed, supported, refuted, corrected, and open claims
- proof obligations and formal specification where available
- agentic research loops that preserve provenance

## Agentic Search Route

Start with the structured files:

- `brand.config.json`
- `docs/brand/narrative.md`
- `docs/brand/agent/llms.txt`
- `docs/brand/agent/llms-full.txt`
- `docs/plans/market-winning-strategy.md`
- `docs/brand/market-strategy.json`
- `docs/science/SCIENCE_SPINE.md`
- `docs/science/science-map.json`
- `glim-think/`

## Verification Route

Use focused checks from the repo root:

```powershell
just think-lint
just engine-test
just live-build
```
