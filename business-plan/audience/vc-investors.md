# For: Venture Capital Investors

This is the same plan as in the rest of this folder, recut for the VC
reading flow. Numbers and references are unchanged; emphasis shifts
to return profile, market timing, and execution risk.

## The 30-second pitch

Lupine is the unified open-core engine for computational materials
discovery. The science (peer-reviewed in IMMI 2026) is done; the
engineering moat (Rust, WebGPU, full DFT → ML → MD pipeline) is in
flight; the market (CHIPS Act, IRA, MGI) just turned over. We are
raising $5–10M at $100–200M post to ship MD + DFT engines, sign 2-3
paid pilots, and land first DARPA-class direct contract by end of
FY27.

The asymmetric upside is a Synopsys / ANSYS-class category-leadership
outcome (~$10-30B exit comp) which the open-core moat + sovereignty
tailwind makes a 3-7% probability bet
(`thesis/moonshot-math.md`).

## Why the valuation works

We are asking 5–10x median deeptech seed valuations. Five legs support
the price:

1. **Shipped product.** Lupine View is in the wild. Most seed rounds
   are not.
2. **Peer-reviewed IP.** *Integrating Materials and Manufacturing
   Innovation* 2026 is real signal that the Welcing / Sethna /
   Transtrum methodology lineage is uncopyable in 12 months.
3. **Sovereignty wedge.** $4,500/seat/yr Vienna-held VASP is the
   incumbent. CHIPS-funded foundries cannot defensibly source
   from Vienna. ([data:competitor_matrix.csv:vasp],
   [data:market_segments.csv:chips-act-rd])
4. **Federal alignment.** $50M+/yr DMREF, $30M+/yr DOE BES CMS,
   $10M+/yr DARPA all speak this work's exact methodology language.
   ([data:federal_funding_programs.csv:nsf-dmref, doe-bes-cms,
   darpa-prime])
5. **Comp set premium.** Orbital Materials closed $20M Series A at
   ~$80M post-money in 2024 with one foundation MLIP and no shipped
   product. Lupine has more product than Orbital had then, plus
   peer-reviewed methodology, plus a unified pipeline.
   ([data:comparable_exits.csv:orbital-a])

## The 5-year return profile

| Outcome | Probability | Value | Investor return on $8M / 5.3% slice | IRR |
|---------|-------------|-------|--------------------------------------|------|
| Zero | 50% | $0 | $0 | -100% |
| Modest | 20% | $100M (mid) | $5.3M | -8% |
| Strategic | 20% | $500M (mid) | $26.5M | 27% |
| Moonshot | 7% | $3B (mid) | $159M | 81% |
| Asymmetric | 3% | $15B (mid) | $795M | 152% |

Probability-weighted IRR ~28% on a 5-year hold. Source:
`financials/exit-scenarios.md`.

## What you are funding

| Bucket | % of $8M | Outcome by month 24 |
|--------|---------|----------------------|
| Engineering (4 → 8 FTE) | 38% | MD engine alpha + DFT engine + ML pipeline shipped |
| Research scientist (2 → 3) | 17% | Next IMMI-class paper; named PI on 1+ federal award |
| Technical GTM (1 → 3) | 11% | First 2-3 paid industry pilots run; first production conversion |
| Federal proposal effort + cost-match | 6% | 3-4 federal proposals in flight; 1+ award |
| Cloud / dev / infra | 7% | Hyperscaler-redundant deployment; benchmark suite hosted |
| Reserve, ops, brand | 21% | Standard runway insurance |

Detail: `financials/use-of-funds.md`.

## Why we cross the chasm to Series A

By end of FY27 (24 months post-funding), base case projections
[data:projections_base.csv] show:

- Ending FY27 ARR: $5.2M
- 16 FTEs
- $3.9M cash on hand
- 1+ DARPA-class direct contract running ($1M+ ARR)
- 5 paid industry pilots, 1 production conversion, 1 enterprise pilot

Series A at $300M+ post on revenue trajectory is the base-case price.
The bull case ([data:projections_bear_bull.csv:rev-bull]) supports a
$500M+ post-money A.

## The structural moats

| Moat | What protects it |
|------|------------------|
| Methodology IP | IMMI paper + 2-3 follow-ons; the sloppy-model + Pearl-causal + meta-analytic stack is multi-discipline and slow to replicate |
| Open-core community | Apache 2.0 + LAMMPS-compatibility + WebGPU viz wedge; community accumulates to us specifically |
| Federal credibility | Cooperative agreements with national labs; named tooling in proposals; 24-month head start on competitors who would have to enter cold |
| Rust + Memory safety | Production-grade infrastructure story that Fortran-era incumbents cannot match without a multi-year rewrite |
| Sovereignty narrative | Geopolitical, durable, and well-funded; not subject to a competitor's product decision |

## Specific risks an investor should test

1. **Hyperscaler entry before our DFT engine ships.** Microsoft Azure
   Quantum Elements is the front-runner; the bet is that distribution
   without methodology depth is not enough by FY28. Mitigation: speed
   to MD-alpha; methodology citation moat.
2. **Foundation MLIP companies productize ahead of us.** Orbital
   Materials at Series A has resources; mitigation is co-opetition
   (we host any MLIP).
3. **Pilot conversion < 30%.** This is the most-sensitive variable.
   See `financials/unit-economics.md` sensitivity table.
4. **Federal funding cycle slip.** Mitigation: parallel pipeline of
   3-4 proposals at any time; SBIR Phase II ($1M) as bridge.
5. **Founder concentration.** This is a founder-led story; key-person
   dependency is real. Mitigation: peer-reviewed methodology is
   institutional, not personal; explicit COO hire by month 18.

## What's in the data room

- `data/` — all source CSVs with provenance tiers.
- `paper/` — IMMI paper source LaTeX.
- `atlas-distill/` — Rust engine source code, including FCC manifold
  validation and BCC Simpson's-paradox detection (live).
- `lupine-site/deck.html` — current investor deck.
- `lupine-site/case-study-batteries.html`, `case-study-superalloys.html`,
  `defense-aerospace.html` — sector deep-dives.
- `docs/funding_landscape_report.md`, `docs/KEY_FINDINGS_SUMMARY.md` —
  research grounding.
- `lit-review.md` — full methodology lineage.

## Reference calls we will provide

On request after term sheet:
- 2 academic PIs at MIT / Caltech who have evaluated the methodology.
- 1 federal program officer (NSF or DOE) familiar with the work.
- 1 industry technical buyer at a battery startup who has scoped a
  pilot.
- 1 simulation-incumbent corporate development contact who has had
  the early conversation.

## What we are looking for in a lead investor

- Deeptech infrastructure thesis (not pure SaaS; not pure AI).
- Comfort with non-dilutive funding mix (federal direct contracts).
- Network into: simulation incumbents (Synopsys, Cadence, Schrödinger),
  hyperscalers (Microsoft, Google, IBM corporate development),
  defense primes (Lockheed, Northrop, Raytheon).
- Patience: 5-7 year hold for the asymmetric tail.
- 15-25% target ownership at the round; pro-rata through Series A.
