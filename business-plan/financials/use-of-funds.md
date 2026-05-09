# Use of Funds

## The ask

| Term | Value |
|------|-------|
| Round size | $5M–$10M (mid-point $8M) |
| Post-money | $100M–$200M (mid-point $150M) |
| Implied dilution | 5.0%–6.7% (mid 5.3%) |
| Runway | 24–36 months depending on scenario |

## The principle

Every dollar of seed capital should buy one of two things:

1. **Engineering progress** that takes us from `Lupine View shipped`
   to `MD engine alpha + DFT engine + ML pipeline` over 18-24 months
   (the FY26-FY27 milestones in `data/projections_base.csv`).
2. **Distribution proof** — at least 2 paid industry pilots, 1
   national-lab cooperative, 1 federal proposal in flight, by month 12.

Anything not directly funding either of those gets cut. We are not
hiring sales-ops, marketing-ops, or growth-marketing roles in year 1.
We are hiring engineers and one technical-GTM lead.

## Allocation: $8M base case (mid-point)

| Bucket | FY26 | FY27 | Cumulative | % of total |
|--------|------|------|------------|------------|
| Engineering FTEs (4 → 8) | $1.0M | $2.0M | $3.0M | 38% |
| Research scientist FTEs (2 → 3) | $0.55M | $0.83M | $1.38M | 17% |
| Technical GTM (1 → 3) | $0.23M | $0.68M | $0.91M | 11% |
| Operations & finance (1 → 2) | $0.20M | $0.40M | $0.60M | 8% |
| Cloud + dev infrastructure | $0.18M | $0.40M | $0.58M | 7% |
| Federal proposal effort + cost-match reserve | $0.20M | $0.30M | $0.50M | 6% |
| Travel + conference + brand | $0.10M | $0.15M | $0.25M | 3% |
| Legal + accounting + insurance + recruiting | $0.10M | $0.20M | $0.30M | 4% |
| Reserve / contingency | $0.20M | $0.28M | $0.48M | 6% |
| **Total** | **$2.76M** | **$5.24M** | **$8.0M** | **100%** |

Headcount sources [data:projections_base.csv:hc-eng],
[data:projections_base.csv:hc-science], [data:projections_base.csv:hc-gtm],
[data:projections_base.csv:hc-ops]. Loaded salary ranges
[data:unit_economics.csv:salary-research-engineer],
[data:unit_economics.csv:salary-staff-scientist],
[data:unit_economics.csv:salary-go-to-market],
[data:unit_economics.csv:salary-founder].

## Why this allocation

**Engineering is 55% of spend.** This is a deeptech infrastructure
play. The product moat is built by engineers shipping a Rust DFT
engine and an ML pipeline that is bit-for-bit reproducible against
LAMMPS and VASP. Cutting engineering shrinks the moat.

**Research scientists are not cosmetic.** They run the benchmark, write
the next IMMI paper, sit on federal proposals as named PIs, and answer
the methodology questions that close enterprise deals. At our stage
the line between R&D and customer-facing work is intentionally porous.

**Technical GTM is one person in year 1, three in year 2.** A sales
engineer who can run a paid POC end-to-end. We do not hire a VP of
Sales until we have $5M+ ARR.

**Federal proposal effort gets its own line.** A DMREF / DOE BES /
DARPA proposal each absorbs ~150 person-hours. We will run 3-4 in
year 1; that is real work and should be tracked as such, with a
cost-match reserve for any that are awarded with cost-share.

## What the funds will *not* be used for

- A growth-marketing team. The open-core community is the channel; we
  fund content authoring and conference presence inside the GTM line.
- A platform-engineering team. We are a deeptech engine, not a SaaS;
  observability and ops can ride on the founding engineering team
  through FY27.
- Custom hardware. We deploy on hyperscaler and on-prem customer
  hardware. No data center.
- Paid acquisition. CAC math
  [data:unit_economics.csv:cac-academic, cac-industry-pilot,
  cac-defense] supports content + technical-event channels exclusively.

## Milestones funded by this round

By end of FY27 (24 months), this round produces:

1. **Lupine View 1.0** — feature-complete, with 10K+ monthly active
   users, replacing OVITO Pro at zero acquisition cost.
2. **MD engine alpha** — LAMMPS-compatible LJ/EAM/Tersoff potentials,
   bit-identical force verification.
3. **ML pipeline beta** — MACE/NequIP inference + active-learning
   loop.
4. **DFT engine alpha** — PAW DFT with JTH datasets, validated against
   VASP on FCC + BCC test materials from `atlas-distill`.
5. **Federal contract revenue ≥ $1M ARR** — at least one DARPA-class
   direct contract or DOE/NSF cooperative; non-dilutive
   bridge to Series A.
6. **Industry production deals ≥ 1** — first $750K production
   conversion, ideally in semiconductors or aerospace.
7. **Recurring ARR ≥ $5M** — base case [data:projections_base.csv:arr-end]
   shows $5.2M ending FY27 ARR.

These are the milestones a Series A investor will price.

## Bear-case scenario for the same $8M

If revenue tracks bear case [data:projections_bear_bull.csv:rev-bear,
ebitda-bear], the round funds 18 months instead of 24. Triggers:

- Hold engineering hire pace at 6 FTEs through end of FY26 (instead of
  8).
- Defer technical-GTM #2 and #3 until pilot 1 closes.
- Pursue SBIR Phase II as non-dilutive bridge — typical award $1M
  [data:federal_funding_programs.csv:doe-sbir-2].
- Consider $3-5M bridge round at flat valuation or modest step-up if
  defense direct contract has not closed by month 18.

## Bull-case scenario

If revenue tracks bull case [data:projections_bear_bull.csv:rev-bull,
ebitda-bull]:

- Pull-forward engineering hires (10 FTEs by end of FY26).
- Series A on terms in early FY28 at $300M+ post-money on revenue
  trajectory.
- Lupine becomes self-funding by mid-FY28; subsequent rounds are
  optional growth capital.
