# Positioning

## The single sentence

**Lupine is the unified open-core engine for computational materials
discovery — DFT, ML potentials, and molecular dynamics in one
Rust-implemented, peer-reviewed pipeline, with a WebGPU visualizer as
the on-ramp.**

## What we are

A scientific computing platform.

- **Unified.** One engine, one data model, one CLI for the
  DFT → ML → MD pipeline. No tool stitching.
- **Open-core.** Apache 2.0 engine; commercial managed compute,
  enterprise support, and ITAR-eligible deployments on top.
- **Peer-reviewed.** The methodology — sloppy-model geometry,
  multi-fidelity UQ, Simpson's-paradox detection — is published in
  *Integrating Materials and Manufacturing Innovation* (2026, in press).
- **Rust-implemented.** Memory-safe, GPU-accelerated, designed for
  production deployment alongside legacy LAMMPS / VASP infrastructure.

## What we are not

- We are not a foundation MLIP. We host any MLIP — MACE, NequIP,
  MatterSim, ORB, OMat24, eqV2 — on a unified inference layer.
- We are not a workflow orchestrator. Citrine / Mat3ra / Materials
  Project are the workflow layer. We are the engine they call.
- We are not a SaaS-only product. Open core + enterprise is the
  business; a hosted SaaS is one of four revenue surfaces (see
  `financials/revenue-model.md`).
- We are not a defense contractor. We sell to defense, but we are an
  open-core platform that defense primes can deploy on-premise; we
  are not in the prime-contract business.

## Three "we are X for Y" anchors

- **Lupine is to materials simulation what LLVM was to compilers**: a
  modular, permissively-licensed, modern-language-implemented engine
  that can be embedded by anyone, replacing 30-year-old monoliths.
- **Lupine is to materials what Synopsys is to chip design**: the
  engineering-simulation infrastructure that the entire industry
  consolidates onto over a decade. (Aspirational; this is the
  asymmetric tail in `thesis/moonshot-math.md`.)
- **Lupine is to ML potentials what Hugging Face is to language models**:
  the canonical hosting / inference / benchmarking layer for the
  ecosystem of foundation models, not a competitor to any specific
  model.

Use these anchors with care. Different audiences respond to different
ones; see `audience/` for which to deploy when.

## Brand pillars

| Pillar | Meaning | Proof |
|--------|---------|-------|
| **Sovereign** | Permissively licensed, US/allied developed, ITAR-eligible | Apache 2.0, Rust, no Vienna dependency |
| **Rigorous** | Peer-reviewed methodology, validated benchmarks | IMMI paper 2026, FCC manifold dim ~1.66/3, BCC Simpson's-paradox detection |
| **Modern** | Memory-safe, GPU-native, browser-deployable | Rust core, WebGPU viz, Apache 2.0 |
| **Unified** | One engine for DFT + ML + MD | Currently nobody else has this; see `market/competitive-landscape.md` |

These are the four words that should appear (woven, not chanted) in
every external piece we publish.

## Who we sound like

- Voice: precise, declarative, slightly austere. Like a peer-reviewed
  paper that respects your time.
- Diction: prefer the technical word over the marketing word.
  "Phonon validation" beats "advanced quality assurance." "Sloppy-model
  geometry" beats "AI-powered analytics."
- Receipts: every quantitative claim cites a source. We are the
  product *and* the evidence.

## Who we explicitly do not sound like

- We are not "AI for science" Twitter. The hype voice is the wrong
  voice for the buyer.
- We are not enterprise-SaaS marketing. No "transformation," no
  "synergies."
- We are not a defense PR firm. We are technical and open about
  methodology even when working with sensitive customers.

## Visual identity (handoff to design)

The deck (`lupine-site/deck.html`) and investors page already
encode brand: deep indigo / lupine violet / warm slate; Inter for
body, Playfair Display for serif moments. Keep it.

For technical materials (whitepapers, benchmark reports), default to
light-mode typeset with figures generated from the actual benchmark
output. The science *is* the marketing.

## Tagline test

Three taglines under consideration. We test in pitch decks, A/B in
landing pages.

1. *"The future of matter starts with software."* (current deck)
2. *"One engine for materials. Open. Modern. Sovereign."*
3. *"Materials simulation, peer-reviewed."*

Recommendation: lead with #2 for VC and federal audiences (concrete
brand pillars). Use #3 for academic and technical conference contexts.
Reserve #1 for closing slides where aspiration is the right register.
