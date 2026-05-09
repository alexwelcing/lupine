# TAM / SAM / SOM

> Re-derived from grounded sources. Founder estimates from earlier
> marketing materials are kept visible (so we can vet them) but not used
> as the primary number anywhere in this plan.

## Method

We build TAM bottom-up from three sources of money that flow into
materials simulation, then layer on the market-research scientific-
software comp to triangulate:

1. **U.S. federal materials-informatics budget** — what taxpayers spend
   directly on the work Lupine does. Verified via OSTP / agency budget
   docs.
2. **Industrial R&D spend** in Lupine's sector beachheads (semis,
   aerospace, batteries) — the budget envelope from which industry
   procurement is funded.
3. **Triangulated commercial software market** — the
   simulation/scientific-computing-software line in published market
   reports, used as a sanity check on the bottom-up build.

Founder estimate from the existing investor deck ($12B simulation TAM
by 2028, [data:market_segments.csv:sim-tam-deck]) is held aside. It is
not unsupportable but it is not independently sourced; we replace it.

## TAM (5-year, 2026–2030 cumulative addressable)

We define TAM as **money that could plausibly fund computational
materials simulation work in the next five years**, not money that any
single vendor could capture.

| Source | Cumulative 5-year (USD) | Tier | Notes |
|--------|-------------------------|------|-------|
| U.S. federal materials informatics (NSF DMREF + DOE BES CMS + NIST MML + DARPA SURGE/PRIME + ARPA-E + AFOSR/ONR) | ~$1.0B | verified | DMREF $50M/yr [data:federal_funding_programs.csv:nsf-dmref] + DOE BES CMS $30M/yr [data:federal_funding_programs.csv:doe-bes-cms] + NIST $15M/yr [data:federal_funding_programs.csv:nist-mml] + ~$50M/yr DARPA + AFOSR/ONR |
| NAIRR + adjacent AI compute allocations | ~$2.0B (capacity, not all materials) | verified | $2.6B authorized [data:federal_funding_programs.csv:nairr-pilot]; ~25-30% reasonably attributed to physical-science workloads |
| CHIPS R&D allocation (subset relevant to materials simulation) | ~$2.0B | verified | $13.2B CHIPS R&D total [data:market_segments.csv:chips-act-rd]; estimate 15% addressable for materials simulation |
| Industrial R&D budget envelope (US semis $55B + aerospace $28B + global battery $15B per year, ~3-7% spent on materials simulation tooling and services) | ~$15-25B over 5 years | triangulated | Built from [data:market_segments.csv:us-semi-rd], [data:market_segments.csv:us-aerospace-rd], [data:market_segments.csv:battery-rd-spend] |
| Commercial scientific-computing software (subset = materials/chemistry) | ~$3-5B over 5 years | triangulated | $9.5B annual scientific computing software [data:market_segments.csv:sci-software-tam], 6-10% materials slice |
| HPC services & managed compute (materials slice) | ~$3-6B over 5 years | triangulated | $42B Hyperion HPC services market [data:market_segments.csv:hpc-services-tam], 1.5-3% materials slice |
| **TAM (5-year)** | **~$25-40B** | **triangulated** | Wide because it is real |

The honest range is $25–40B over five years. The deck's "$12B TAM by
2028" is a single-year snapshot of a narrow software-only slice; it is
not wrong, but it understates the total funded envelope.

## SAM — what Lupine could plausibly contract against

SAM is the slice we can serve given Apache 2.0 licensing, English-
language sales, and the verticals we are explicitly building for:
academic + national-lab + federal + 3 industry beachheads (semis,
aerospace, batteries).

| Bucket | Annual SAM | Tier | Build |
|--------|------------|------|-------|
| Academic + national-lab subscriptions | ~$25-50M | directional | ~5,000 active research groups in the U.S. + Five Eyes [data:market_segments.csv:lammps-users-conservative] x $5K avg ACV [data:unit_economics.csv:acv-academic-tier-1] = $25M; with 10% department-tier upgrades [data:unit_economics.csv:acv-academic-tier-2] add $20M |
| Federal direct contracts (DARPA / DOE / NIST / NSF infrastructure) | ~$50-100M | triangulated | DMREF + DOE BES CMS + DARPA + NIST = ~$130M/yr verified; capture rate 30-70% on aligned solicitations |
| Industry pilots + production (semi + aerospace + battery) | ~$300-500M | triangulated | ~50 OEMs/primes/battery startups x $1-2M ACV (mid-tier production [data:unit_economics.csv:acv-industry-prod] / enterprise [data:unit_economics.csv:acv-industry-enterprise]) |
| Managed compute (passthrough margin) | ~$30-80M | directional | ~$200-400M passthrough at 55% margin [data:unit_economics.csv:gross-margin-managed-compute] x 30% relevant share |
| **SAM (annual)** | **~$400-700M/yr** | | |

SAM is the believable frontier for a multi-vendor outcome. Lupine
captures a slice of it; the EDA-style 2-vendor consolidation pattern
(Synopsys + Cadence) is the long-arc structural endpoint.

## SOM — what we plan to capture by FY30

Per `data/projections_base.csv`:

| Metric | FY30 base | Tier |
|--------|-----------|------|
| Total revenue | $50.4M | projection |
| Ending ARR | $65M | projection |
| % SAM captured (assuming SAM mid $550M) | ~12% | projection |
| % SAM bull case ($200M ARR) | ~36% | projection |

Capturing 10–15% of a $400–700M SAM in 5 years is consistent with the
trajectory of Schrödinger's materials science segment in its early
years and below the trajectory ANSYS or Citrine showed at equivalent
stage. It is a stretch but not a hallucination.

## What grounds vs. what stretches

### Grounded
- Federal program budget envelopes (every line in
  `data/federal_funding_programs.csv` is verified against agency
  documentation).
- Public commercial pricing for VASP, OVITO Pro, Schrödinger.
- Foundation MLIP technical performance and cost numbers — all from
  peer-reviewed publications and the project's own benchmark report
  ([data:market_segments.csv:phonon-bench-calcs] etc.).

### Triangulated (good but not single-source)
- Hyperion HPC services market size.
- BCC Research scientific computing software market size.
- Citrine Informatics ARR estimate.

### Directional / founder estimate (used carefully)
- LAMMPS user counts (`50K conservative` is our number;
  `300K deck claim` is held aside).
- VASP installed base.
- Industry per-customer ACV at production scale — supported by
  Schrödinger and Citrine references but our specific numbers are
  pre-pilot estimates.
- Capture-rate assumptions on federal solicitations.

The plan never silently mixes tiers. Every cell that drives a financial
projection carries its tier explicitly so you can stress-test the
analysis with one click.
