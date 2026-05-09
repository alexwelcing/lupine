# Industry Partners

Source data: `data/partner_targets.csv` (industry rows).

## Why industry partners care

Three things have changed for materials-buying industries between 2022
and 2026:

1. **Cycle-time pressure.** Battery cell development, single-crystal
   turbine alloys, advanced node integration — all bottlenecked on
   materials qualification. Cycle-time reduction is now a board-level
   metric.
2. **Sovereignty mandate.** CHIPS Act, ITAR re-enforcement, and the
   Five Eyes export-control reset all push toward
   permissively-licensed, U.S./allied-developed simulation tooling.
3. **MLIP maturity.** Foundation MLIPs hit production-grade accuracy
   in 2024–2025. Industry now has the *option* to do simulation work
   that was previously DFT-bound at 10x cost.

Lupine arrives with a peer-reviewed UQ methodology, an open-core
license, a Rust safety story that production engineers care about, and
a single pipeline from DFT through ML to MD. That combination is
unoccupied.

## Beachhead 1: Semiconductors (CHIPS Act tailwind)

| Partner | Status | Driver | Year-1 ACV | Source |
|---------|--------|--------|------------|--------|
| TSMC | Target | Process material qualification, sovereignty | $1.5M | [data:partner_targets.csv:tsmc] |
| Intel Foundry Services | Target | US foundry build-out, CHIPS Act | $1.2M | [data:partner_targets.csv:intel-foundry] |
| Samsung Semiconductor R&D | Target | DRAM/NAND materials | $0.8M | [data:partner_targets.csv:samsung-semi] |

The compelling sale: **CHIPS Act money has procurement directives that
favor US/allied-licensed tooling for materials qualification.** A
foundry budgeting against $13.2B in CHIPS R&D
[data:market_segments.csv:chips-act-rd] cannot defensibly source its
materials simulation from a single Vienna-licensed vendor.

Path to first contract: targeted introduction through the Materials
Project / NIST relationship, IMMI paper as cited methodology, and a
$150K paid POC structured as a phonon-benchmark-on-your-materials
engagement using the published 23 × 12,000 framework
[data:market_segments.csv:phonon-bench-calcs].

## Beachhead 2: Aerospace + defense (PRIME tailwind)

| Partner | Status | Driver | Year-1 ACV | Source |
|---------|--------|--------|------------|--------|
| GE Aerospace | Target | Superalloy qualification, PRIME transition | $1.5M | [data:partner_targets.csv:ge-aerospace] |
| Rolls-Royce | Target | Single-crystal turbine alloys | $1.0M | [data:partner_targets.csv:rolls-royce] |
| Pratt & Whitney (RTX) | Target | High-temperature alloys | $1.0M | [data:partner_targets.csv:pratt-whitney] |
| Boeing BR&T | Target | Composite + alloy fatigue | $1.5M | [data:partner_targets.csv:boeing] |
| Lockheed Skunk Works | Target | Hypersonics, thermal protection | $1.5M | [data:partner_targets.csv:lockheed-skunkworks] |

The compelling sale: **the DARPA SURGE/PRIME methodology**
([data:federal_funding_programs.csv:darpa-prime]) is the methodology
Lupine ships. PRIME concludes in 2026; the question for every prime is
who runs the methodology in production. Lupine is the only
permissively-licensed answer.

Path to first contract: U Michigan PRIME consortium has named industry
partners (AlphaSTAR, Addiguru); we engage through that consortium for
methodology validation, then expand to direct procurement.
[data:partner_targets.csv:umich-prime]

## Beachhead 3: Battery + clean energy (IRA tailwind)

| Partner | Status | Driver | Year-1 ACV | Source |
|---------|--------|--------|------------|--------|
| QuantumScape / Solid Power / Sila | Target | Solid-state electrolyte simulation | $0.5M each | [data:partner_targets.csv:qsa-lithium] |
| Form Energy | Target | Iron-air cathode/electrolyte | $0.3M | [data:partner_targets.csv:form-energy] |
| Tesla Energy | Target | 4680 cell chemistry | $0.75M | [data:partner_targets.csv:tesla-energy] |
| Toyota Research Institute | Prospective (warm) | Materials informatics partnership | $0.5M | [data:partner_targets.csv:toyota-r-d] |
| ExxonMobil Low Carbon | Target | CCS catalyst discovery | $0.8M | [data:partner_targets.csv:exxon-low-c] |
| BASF R&D | Target | Heterogeneous catalysis, polymers | $1.0M | [data:partner_targets.csv:basf-rd] |

The compelling sale: **IRA-funded battery R&D is materials-cycle-
bound.** A 30-day reduction in solid-electrolyte qualification is worth
more than the Lupine annual contract. Toyota Research Institute's
public materials-informatics program
[data:partner_targets.csv:toyota-r-d] is a published reference
methodology; we have a citable peer-reviewed methodology of our own.

Path to first contract: Tesla / Toyota are the credibility names; the
five battery startups are where revenue starts. ARPA-E CATALCHEM-E
[data:federal_funding_programs.csv:arpa-e-catalchem] is a non-dilutive
funding mechanism for the catalyst sub-pipeline.

## How an industry partnership works mechanically

Standard industry pilot structure (year 1):

| Phase | Duration | Customer pays | Lupine delivers |
|-------|----------|---------------|-----------------|
| Phase 0 — Scoping call | 2-4 weeks | $0 | Joint statement of work, defined success metric |
| Phase 1 — Paid POC | 3 months | $150K [data:unit_economics.csv:acv-industry-pilot] | Benchmark of partner's materials in Lupine framework; UQ-bounded results report |
| Phase 2 — Production deployment | 9-12 months | $750K (mid-tier) [data:unit_economics.csv:acv-industry-prod] / $1.5M (enterprise) [data:unit_economics.csv:acv-industry-enterprise] | Full Lupine deployment, training, integration with partner's existing Materials Project / OpenKIM workflows |
| Phase 3 — Renewal + expansion | Annual | Renewal + expansion ACV | Ongoing methodology updates, joint publications where applicable, dedicated support |

The Phase 1 paid POC is non-negotiable. It filters tire-kickers, it
generates revenue from day 1, and it produces a contractable artifact
the customer can show its own management.

## Co-development and IP terms

Standard partnership template:

- Lupine retains all platform IP (engine, methods, models).
- Customer retains all data and customer-derived parameters.
- Customer-funded extensions to the open core are released after a
  mutually-agreed embargo (typically 6-12 months).
- ITAR / ECCN-eligible deployments are containerized and run
  on-premise with no telemetry; we have a separate enterprise build
  for these workloads.

This is the same structure the U Michigan PRIME program uses with
AlphaSTAR and Addiguru
[data:federal_funding_programs.csv:darpa-prime].

## Industry partner pipeline progression in projections

The base-case projections [data:projections_base.csv] assume:

- FY26: 2 industry pilots
- FY27: 10 pilots, 1 production
- FY28: 20 pilots, 5 production, 1 enterprise
- FY29: 30 pilots, 12 production, 3 enterprise
- FY30: 40 pilots, 24 production, 6 enterprise

Cumulative pilot-to-production conversion target: 50%. This is
demanding but supported by the structural fit: paid POCs that fail are
still profitable, and the open-core layer continues earning attention
even when a specific pilot does not convert.
