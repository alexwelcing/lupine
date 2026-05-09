# Messaging Pillars

Four pillars. Each pillar carries its own proof points and its own
audience emphasis.

## Pillar 1: Sovereign

**Claim.** Lupine is permissively licensed, US/allied developed, and
ITAR-eligible — the materials simulation infrastructure aligned with
the CHIPS Act and MGI procurement directives.

**Proof points.**
- Apache 2.0 license [data:competitor_matrix.csv].
- Rust implementation; no dependency on commercially-licensed
  Vienna-held VASP [data:competitor_matrix.csv:vasp].
- Containerized on-premise deployment for ITAR / ECCN customers.
- Aligns with $52.7B CHIPS Act and $369B IRA procurement frameworks
  [data:market_segments.csv:chips-act-rd, ira-clean-energy].

**Best for.** VC investors looking for tailwind narrative; federal
program officers reading FOA-aligned proposals; defense primes and
CHIPS-funded foundries.

**Counter-message.** "Open-source can't be trusted in defense
contexts." We respond with: containerized on-prem deployment, no
telemetry, full source-code review available, methodology peer-
reviewed in IMMI.

## Pillar 2: Rigorous

**Claim.** Lupine ships methodology that is peer-reviewed and
benchmarked — sloppy-model geometry, multi-fidelity UQ, and
Simpson's-paradox detection — not vibes.

**Proof points.**
- *Integrating Materials and Manufacturing Innovation* 2026, in press.
  The Welcing 2026 paper.
- FCC elastic constant errors occupy a ~1.66/3 effective dimensional
  manifold; published.
- BCC pooled correlation reverses under Simpson's-paradox structure;
  published with permutation-test framework.
- Benchmark scoped to 23 potentials × 12,000 materials (276,000
  phonon calculations) [data:market_segments.csv:phonon-bench-calcs].
- Methodology lineage: Brown & Sethna (2003), Transtrum / Machta
  (2010-2013), Pearl (2014), DerSimonian-Laird (1986), Frederiksen
  (2004), Kurniawan (2022). See `lit-review.md`.

**Best for.** Academic partners, federal program officers, technical
buyers at industry partners.

**Counter-message.** "Foundation MLIP companies have moved past
benchmarks." We respond: foundation MLIPs *generate* error structure;
they do not *characterize* it. Lupine is the layer that proves what
they get right and what they get wrong.

## Pillar 3: Modern

**Claim.** Lupine is built on Rust and WebGPU, designed from day one
for GPU-accelerated computation, browser-deployed visualization, and
memory-safe production deployment.

**Proof points.**
- Rust codebase across `atlas-distill`, `lupine-distill`, `distill-cli`,
  `lupine-ops`, `atlas-view-native`, `atlas-tui`, `axiom`. (See
  `AGENTS.md` repo topology.)
- WebGPU rendering of 10M+ atoms at 60fps in Lupine View.
- WASM parsers run 10x faster than JavaScript equivalents on standard
  LAMMPS dump files.
- Replaces commercial seat licenses (OVITO Pro at $1,200/seat/yr
  [data:competitor_matrix.csv:ovito]) with a URL.

**Best for.** Engineers and CTOs at industry partners; technical
champions at academic groups; younger PhDs evaluating tooling.

**Counter-message.** "Rust is hype." We respond with the reproducibility
story: bit-identical force verification against LAMMPS, validated
through the test suite included with `atlas-distill`.

## Pillar 4: Unified

**Claim.** Lupine is the single engine that runs the DFT → ML → MD
pipeline. No tool stitching. No conversion losses. No metadata loss.

**Proof points.**
- A typical materials workflow stitches 4-6 disconnected tools
  (DFT solver, parameter fitter, MD engine, viz tool, scripts).
  Lupine collapses this to one.
- Single CLI: `lupine flow train-mlip` produces a validated MLIP from
  a structure file.
- Active learning loop integrated as a first-class operation.
- The "pipeline" is the killer feature; competitive matrix in
  `market/competitive-landscape.md` shows no other player has this.

**Best for.** Industry buyers who care about cycle-time reduction;
engineering managers measuring tool count and integration cost.

**Counter-message.** "Pipelines we already have via Snakemake / Nextflow
/ pymatgen." We respond: those are *orchestrators* over the legacy
fragmented stack. Lupine replaces the stack, not the orchestrator.

## Pillar emphasis by audience

| Audience | Pillar emphasis |
|----------|------------------|
| VC investors | Sovereign + Modern + Unified (in that order); Rigorous as proof |
| Federal program officers | Rigorous + Sovereign (in that order); Unified as innovation case |
| Industry technical buyers | Unified + Modern (in that order); Rigorous as risk mitigation |
| Academic researchers | Rigorous + Modern; Unified as workflow benefit |

## Specific message-pair tests

Run these as A/B in deck and landing-page variants:

| Variant A | Variant B | Test target |
|-----------|-----------|-------------|
| "DFT → ML → MD in one engine" | "Replace VASP, LAMMPS, and OVITO with one Apache 2.0 platform" | Industry click-through |
| "Peer-reviewed UQ for foundation MLIPs" | "Sloppy-model geometry for production materials simulation" | Academic / federal click-through |
| "Sovereign materials infrastructure" | "Open-core, ITAR-eligible, US-developed" | Defense / CHIPS audience click-through |

## Banned phrases

- "AI-powered" (not specific enough; foundation-MLIP companies own
  this register)
- "Revolutionary" (every other deck uses it)
- "End-to-end" (vague; replace with the actual pipeline list)
- "Synergies"
- "Holistic"
- "Mission-critical" (overused in defense decks)
- "Game-changing"

## Allowed phrases (in all materials)

- "Peer-reviewed methodology"
- "Apache 2.0 open-core"
- "Rust-implemented"
- "Bit-identical force verification"
- "Sovereignty-friendly"
- "Sloppy-model geometry"
- "DFT → ML → MD pipeline"
- "ITAR-eligible deployment"
- "Foundation MLIP-agnostic"
