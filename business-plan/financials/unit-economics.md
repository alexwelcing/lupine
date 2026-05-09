# Unit Economics

Source data: `data/unit_economics.csv`. Every per-customer or per-FTE
number cited here lives there with its provenance tier. CSV is the
truth; this document is the explanation.

## Per-customer LTV / CAC by segment

| Segment | ACV | Gross retention | LTV (5-yr) | CAC | LTV/CAC | Payback |
|---------|-----|------------------|------------|-----|---------|---------|
| Academic Tier 1 | $5K | 90% | $22.5K | $2K | 11.3x | 5 months |
| Academic Tier 2 | $40K | 92% | $180K | $4K | 45x | 1.2 months |
| Industry pilot (Phase 1) | $150K | n/a (one-time) | $150K | $40K | 3.8x | 3 months |
| Industry production | $750K | 85% (with expansion to $1.5M) | $4.5M | $40K + $20K closing | 75x | < 1 month |
| Industry enterprise | $1.5M | 90% | $8M | $80K | 100x | < 1 month |
| Federal program | $2M | 80% (renewal) | $9M | $150K | 60x | < 1 month |

Sources [data:unit_economics.csv]:
- ACV: acv-academic-tier-1, acv-academic-tier-2,
  acv-industry-pilot, acv-industry-prod, acv-industry-enterprise,
  acv-defense-program
- LTV: ltv-academic, ltv-industry, ltv-defense
- CAC: cac-academic, cac-industry-pilot, cac-defense

The standout: industry production at ~75x LTV/CAC. This is the deal
quality the GTM motion is built around. Academic Tier 1 is the funnel
top — low absolute payoff, dirt-cheap to acquire, and the source of
references that close the production deals.

## Why CAC is low for academic and high for federal

Three drivers:

1. **Academic** is content-led: a paper, a tutorial, a webinar. CAC
   ~$2K is "marketing event allocated across N attendees + a few
   hours of follow-up." The market is small enough and concentrated
   enough that an unpaid distribution channel — published methodology
   + open-source velocity — does most of the work.
2. **Industry pilot** CAC is ~$40K because we send a sales engineer
   onsite, do scoping, and burn engineering time on the proposal.
   $40K CAC against a $150K Phase 1 payment + 50% conversion to
   $750K production is the right shape.
3. **Federal** CAC is high because we allocate ~150 engineering hours
   per major proposal. Award rates at our stage are 25-35%; the
   $150K reflects 3 proposals submitted to land 1.

## Cost of revenue by surface

| Surface | Variable cost | Gross margin |
|---------|----------------|---------------|
| Software-only subscription | minimal | ~85% |
| Managed compute | cloud GPU passthrough | ~55% |
| Paid pilot | engineering time | ~67% |
| Federal contract | engineering + admin overhead | 50-65% depending on cost-share |

Cloud cost grounding:
- A100 spot ~$1.50/hr [data:unit_economics.csv:cost-cloud-a100-hour]
- H100 on-demand ~$4/hr [data:unit_economics.csv:cost-cloud-h100-hour]
- Phonon validation suite per material: ~$12 cost
  [data:unit_economics.csv:cost-validation-suite]
- MLIP fine-tune: ~$400 cost
  [data:unit_economics.csv:cost-finetune-mlip]

These costs are independently verifiable. The full 23 × 12,000 phonon
benchmark would cost Lupine ~$1.8M in raw cloud at our blended rate
[data:market_segments.csv:phonon-bench-gpuhrs-cont] — a number any
prospective customer can sanity-check against AWS / GCP price lists.

## Per-FTE economics

Loaded salary at 2026 pay bands ([data:unit_economics.csv:salary-research-engineer], [data:unit_economics.csv:salary-staff-scientist], [data:unit_economics.csv:salary-go-to-market], [data:unit_economics.csv:salary-founder]):

| Role | Loaded salary | Burdened margin needed for break-even |
|------|----------------|----------------------------------------|
| Rust + ML engineer | $250K | $295K revenue contribution |
| Staff scientist (PhD) | $275K | $325K revenue contribution |
| Technical GTM | $225K | $265K revenue contribution |
| Founder / CEO (below market at seed) | $225K | $265K revenue contribution |

Breakeven contribution scales linearly with engineering productivity.
A senior engineer who produces a paid-pilot deliverable in 1 month of
full effort is worth their burdened cost in 1 paid pilot per quarter.

## Revenue per FTE at scale

From [data:projections_base.csv]:

| FY | Total FTEs | Revenue (USD k) | Revenue/FTE |
|----|------------|------------------|--------------|
| 26 | 8 | 350 | $44K |
| 27 | 16 | 3,700 | $231K |
| 28 | 28 | 13,650 | $488K |
| 29 | 43 | 29,000 | $674K |
| 30 | 61 | 50,400 | $826K |

By FY30, Lupine is at ~$826K revenue/FTE. This is on-trend for a
deeptech vertical-software company — Schrödinger trades around $400-
600K rev/FTE blended; Citrine published lower; ANSYS at scale was
~$700-900K.

A bull case at FY30 would push this to ~$1.3M revenue/FTE
([data:projections_bear_bull.csv:rev-bull, hc-bull]) — that is the
ANSYS / Synopsys-tier efficiency level and is the upper bound of
plausibility for our model.

## Sensitivity table

If pilot conversion drops from 50% to 30%:

| Metric | Base case | 30% conversion | Delta |
|--------|-----------|-----------------|-------|
| FY30 industry production revenue | $18M | $11M | -39% |
| FY30 total revenue | $50.4M | ~$43M | -15% |
| FY30 EBITDA | $22.5M | ~$15M | -33% |

The plan is most sensitive to **pilot conversion**. CAC, ACV, and
salary bands move outcomes by 10-20%; pilot conversion moves them by
30-40%. The product investment in `financials/use-of-funds.md`
explicitly emphasizes the engineering work that improves pilot
conversion — bit-identical force verification against LAMMPS, validated
benchmark coverage, and methodology citations.

## Working-capital and cash-cycle assumptions

- Average DSO (days sales outstanding) on industry contracts: 60 days.
- Average DSO on federal contracts: 90 days.
- Annual subscriptions billed annually in advance, prorated.
- Cash conversion cycle approximately 30 days net by FY28 once
  recurring base outweighs project work.

These assumptions inform `financials/projections.md` and the
`projections_*` CSVs.
