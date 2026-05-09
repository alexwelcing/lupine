# Lupine Materials Science — Executive Summary

> The unified open-core engine for computational materials discovery.
> A peer-reviewed, Rust-implemented, GPU-accelerated, sovereignty-
> friendly platform replacing a 30-year-old, fragmented, commercially-
> licensed simulation stack.

## What we are raising

| Term | Value |
|------|-------|
| Round | Seed |
| Size | $5M–$10M |
| Post-money | $100M–$200M |
| Use | Engineering through MD-engine + DFT-engine GA, 2-3 paid pilots, 1+ DARPA-class direct contract by FY27 |
| Runway | 24-36 months base case |

## The opportunity

Three forces converged in 24 months:

1. **ML interatomic potentials cleared the science bar.** Foundation
   MLIPs hit sub-2 meV/atom error
   ([data:market_segments.csv:mlip-finetune-error-mev]); production
   physics is now possible at 100x speed of DFT.
2. **WebGPU shipped browser-native scientific compute.** First
   publication-grade materials viewer in the browser; replaces
   $1,200/seat/yr OVITO Pro [data:competitor_matrix.csv:ovito] with a
   URL.
3. **Sovereignty became procurement policy.** $52.7B CHIPS Act
   [data:market_segments.csv:chips-act-rd], $369B IRA
   [data:market_segments.csv:ira-clean-energy], MGI 2025 Strategic
   Plan all push toward open, US/allied-developed materials
   infrastructure. The incumbent (VASP) is Vienna-held at $4,500/seat
   [data:competitor_matrix.csv:vasp].

## What we already shipped

- **`atlas-distill`** — Rust engine for the geometric and statistical
  analysis of interatomic potential prediction errors. FCC validation
  + BCC Simpson's-paradox detection live.
- **IMMI paper** — *The Causal Geometry of Prediction Errors in
  Interatomic Potentials*, *Integrating Materials and Manufacturing
  Innovation*, 2026, in press. Methodology IP signal.
- **Lupine View** — WebGPU molecular visualization. 10M+ atoms at
  60fps. Rust/WASM parsers. Browser-native.
- **Federal-aligned methodology** — Sloppy-model geometry,
  multi-fidelity UQ, Pearl causal inference, random-effects meta-
  analysis. Tracks ASCR, DARPA EQUiPS/SURGE/PRIME, NSF DMREF
  language directly.

## The market

Total addressable: ~$25-40B over 5 years, built bottom-up from
federal materials-informatics budget envelopes ($1-2B), CHIPS R&D
allocation ($2B), industrial R&D budget envelope ($15-25B), and the
commercial scientific-software comp ($3-5B). Detail in
`market/tam-sam-som.md`.

Serviceable annual: ~$400-700M across academic + national-lab +
industry beachheads (semis, aerospace, batteries) + federal direct
contracts.

Captured by FY30 base case: $50.4M revenue / $65M ending ARR
[data:projections_base.csv]. Bull case: $160M revenue / $200M ARR
[data:projections_bear_bull.csv:rev-bull, arr-end-bull].

## The competition

| Archetype | Closest player | How we differ |
|-----------|----------------|---------------|
| Commercial DFT incumbent | VASP | Apache 2.0 vs $4,500/seat Vienna license |
| Open-source DFT | Quantum ESPRESSO | Modern Rust + ML pipeline, not Fortran-era |
| Open-source MD | LAMMPS | Bit-compatible bridge, not competitor |
| Foundation MLIP | MACE / NequIP / ORB / OMat24 | Platform layer hosts any model |
| Materials informatics SaaS | Schrödinger / Citrine | Open-core engine vs closed workflow |
| Hyperscaler | Microsoft Azure Quantum Elements | Strategic acquirer, not yet head-on competitor |

The unified DFT + ML + MD pipeline + Apache 2.0 + UQ-as-first-class
combination is unoccupied. See `market/competitive-landscape.md`.

## The economics

| Metric | FY26 | FY27 | FY28 | FY29 | FY30 |
|--------|------|------|------|------|------|
| Headcount | 8 | 16 | 28 | 43 | 61 |
| Revenue ($M) | 0.35 | 3.7 | 13.7 | 29.0 | 50.4 |
| Gross margin | 57% | 75% | 78% | 79% | 81% |
| EBITDA ($M) | (2.1) | (1.8) | 2.6 | 10.2 | 22.5 |
| Cash end ($M) | 5.8 | 3.9 | 6.3 | 16.1 | 37.9 |
| Ending ARR ($M) | 0.8 | 5.2 | 18.5 | 38.5 | 65.0 |

Source: [data:projections_base.csv].

Cross break-even FY28. Cash trough $1.8M Q3 FY27 (manageable with
SBIR Phase II bridge if required).

## The asymmetric upside

| Outcome | Probability | Value | Investor return on $8M / 5.3% |
|---------|-------------|-------|--------------------------------|
| Zero | 50% | $0 | $0 |
| Modest | 20% | $100M | $5.3M |
| Strategic | 20% | $500M | $26.5M |
| Moonshot | 7% | $3B | $159M |
| Asymmetric | 3% | $15B | $795M |
| **EV** | | | **~$72M (~9x check)** |

Source: `thesis/moonshot-math.md`.

Comp set anchors: ANSYS-to-Synopsys $35B (2024), Schrödinger IPO $3B
(2020), Citrine ~$200M Series C, Orbital Materials $80M Series A.
[data:comparable_exits.csv]

## Three audiences, one plan

This plan is structured for three concurrent reads:

- **VC investors.** `audience/vc-investors.md` —
  return profile, valuation defense, exit landscape.
- **Federal program officers.** `audience/federal-program-officers.md` —
  MGI alignment, scientific merit, broader impact, sustainability.
- **Industry partners.** `audience/industry-partners.md` — cycle time,
  cost base, sovereignty, paid-pilot mechanics.

All three rest on the same source data. None contradict; they
emphasize different sub-systems of one company.

## Why now is the window

By 2028 a hyperscaler will have a productized materials suite. By
2028 a foundation MLIP company will have a productized inference
service. By 2028 the DARPA SURGE/PRIME methodology transition will
have picked vendors. The next 24 months decide whether Lupine is
the platform layer that hosts those moves or the company that missed
the window.

## What kills the thesis

Honesty up front:

1. Hyperscaler absorbs the unified-platform play before our DFT
   engine ships. Mitigation: speed + open-core moat + sovereignty
   narrative.
2. A foundation MLIP becomes the platform, not just a model.
   Mitigation: co-opetition; we host any MLIP.
3. Federal funding cycle slips materially. Mitigation: parallel
   pipeline across NSF / DOE / DARPA / ARPA-E.
4. Pilot conversion < 30%. Mitigation: engineering investment in
   bit-identical force verification, methodology citation moat.

Each is named, sized, and mitigated in the relevant subsection.

## What we want from a lead investor

- Deeptech infrastructure thesis, not pure SaaS or pure AI.
- Network into simulation incumbents, hyperscalers, defense primes.
- Comfort with non-dilutive funding mix (federal direct contracts).
- Pro-rata through Series A and Series B.
- 5-7 year hold horizon for the asymmetric tail.

## Contact

founders@lupine.science.

The plan, the source data, and the existing artifacts (engine, paper,
viewer, deck, sector case studies) are all in this repository. A data
room with reference calls and standard diligence is available on
request.
