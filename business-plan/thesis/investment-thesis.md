# Investment Thesis

> Civilization runs on materials. Materials runs on simulation. Simulation
> still runs on 30-year-old, commercially licensed, fragmented software.
> Lupine replaces that stack with a memory-safe, GPU-native, ML-first
> engine — and it does so cheaply enough to justify on engineering grounds
> alone, while opening a path to civilization-scale upside.

## The single sentence

Lupine is the **unified open-core engine for computational materials
discovery** — DFT, ML potentials, and molecular dynamics in one Rust
codebase, with a WebGPU visualizer as the on-ramp and a peer-reviewed
uncertainty-quantification science layer as the moat.

## Why this is the right moment

Three independent forces have converged in the last 24 months. None are
controversial. Together they create a window that closes:

1. **ML interatomic potentials are scientifically settled.** MACE,
   NequIP, Allegro, MatterSim, ORB, SevenNet, OMat24, eqV2 — eight
   foundation MLIP families have been publicly released since 2022, and
   the best of them now hit sub-2 meV/atom error on broad benchmarks
   ([data:market_segments.csv:mlip-finetune-error-mev]). The science is
   done; the tooling that lets a working engineer use these models in a
   production pipeline is not.
2. **WebGPU shipped.** Browser-native GPU compute is a real platform as
   of 2024-2025. Lupine View is the first publication-quality molecular
   visualizer built on it. It replaces seat licenses for tools like
   OVITO Pro ($1,200/seat/yr
   [data:competitor_matrix.csv:ovito]) with a URL.
3. **Sovereignty is now strategic.** VASP — the canonical commercial DFT
   solver — is held in Vienna and licensed at $4,500/seat/yr academic
   [data:competitor_matrix.csv:vasp]. The CHIPS and Science Act
   ($52.7B), the Inflation Reduction Act ($369B clean-energy
   authorization), the UK National Materials Innovation Strategy, and the
   2025 MGI Strategic Plan all explicitly call for sovereign,
   permissively-licensed materials infrastructure.
   [data:market_segments.csv:chips-act-rd]
   [data:market_segments.csv:ira-clean-energy]

## What we already have

This is not vapor. The first round capitalizes a research base that
already exists.

- **`atlas-distill`** — a Rust engine for the geometric and statistical
  analysis of interatomic potential prediction errors. FCC validation
  (effective dimensionality ~1.66/3 across C11/C12/C44) and BCC
  Simpson's-paradox detection both ship today. (See `atlas-distill/`
  in this repo.)
- **Peer-reviewed science.** *The Causal Geometry of Prediction Errors
  in Interatomic Potentials* — *Integrating Materials and Manufacturing
  Innovation*, 2026, in press. The IP signal an investor or program
  officer needs.
- **Lupine View** — WebGPU molecular visualization. 10M+ atoms at 60fps,
  Rust/WASM parsers, browser-native, shipping.
- **Federal-aligned vocabulary.** Every method we use — sloppy-model
  geometry, multi-fidelity UQ, meta-analysis with random effects,
  causal inference — tracks directly to DARPA EQUiPS / SURGE / PRIME,
  DOE ASCR Applied Mathematics, and NSF DMREF / CSSI program language.
  ([data:federal_funding_programs.csv:darpa-equips],
  [data:federal_funding_programs.csv:darpa-prime],
  [data:federal_funding_programs.csv:nsf-dmref])

## The three-audience pitch

We engineer one source of truth, then frame for three audiences. None
of the framings contradict the others — they emphasize different
sub-systems of the same business.

| Audience | Primary pitch | Reads |
|----------|---------------|-------|
| Venture investors | Affordable seed unlocks a Schrodinger / ANSYS-class outcome on a sovereignty + AI tailwind | `audience/vc-investors.md` |
| Federal program officers | MGI-aligned open-core infrastructure that closes the sloppy-model + UQ gap that ASCR, DARPA, and DMREF have funded for a decade | `audience/federal-program-officers.md` |
| Industry partners (OEMs, primes) | A sponsored-research mechanism that derisks materials qualification with peer-reviewed UQ and ITAR-friendly deployment | `audience/industry-partners.md` |

## The ask

- **Round:** $5M–$10M seed at $100M–$200M post-money.
- **Use:** Engineering through MD-engine alpha + DFT engine + paid-pilot
  motion. Detail in `financials/use-of-funds.md`.
- **Milestones tied to next raise:** see `financials/projections.md` —
  base case crosses break-even FY28 with $18.5M ending ARR
  [data:projections_base.csv:arr-end].
- **Why this valuation is defensible at this stage:** see
  `thesis/moonshot-math.md` — the comp set is Schrodinger, ANSYS,
  Citrine, Orbital Materials, Recursion, plus the strategic-acquirer
  premium that hyperscalers have already shown for materials AI
  [data:comparable_exits.csv].

## What kills the thesis

Honesty up front. The plan fails if any of these:

1. A hyperscaler (Microsoft Azure Quantum Elements, IBM, Google) absorbs
   the unified-platform play before we ship our DFT engine. Mitigation:
   open-source moat + sovereignty narrative + speed to MD-alpha.
2. A foundation MLIP becomes a product, not a model. Orbital Materials
   is the closest case [data:competitor_matrix.csv:orb]; we co-opt rather
   than compete by being the platform layer that hosts any MLIP.
3. Federal funding pulls back on materials-informatics infrastructure.
   Concentration risk if a single agency cycle delays. Mitigation:
   diversify across NSF, DOE, DARPA, ARPA-E, and 3 industry pilots in
   year 1.
4. The unified platform is a science-team luxury, not a procurement
   priority. Mitigation: Lupine View as zero-friction wedge; every
   industry pilot starts with a paid POC, not a six-figure annual
   contract.

## How to read the rest of the plan

- `thesis/moonshot-math.md` — the asymmetric upside calculation that
  lets a $5–10M check survive a 5-15% probability of a $5B+ outcome.
- `thesis/why-now.md` — three-tailwind brief, scoped tightly.
- `market/` — TAM/SAM/SOM derived from federal program budgets and
  triangulated commercial market reports. Flagged founder estimates
  are isolated.
- `partners/` — the academic + industry + federal map that turns the
  pitch into a contractable pipeline.
- `financials/` — use of funds, unit economics, three-scenario
  projections, exit math.
- `marketing/` — positioning, messaging pillars, and the open-core GTM.
- `audience/` — three reader-specific overlays. They share the same
  source data but choose different narratives.
- `data/` — every cited number lives here. Narrative docs MUST
  reference cells; do not hard-code numbers.

The point of the system is that if anything moves — a new federal
budget, a new competitor round, a closed pilot — we update one CSV cell
and every document inherits the truth.
