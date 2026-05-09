# Partnership Economics

A simple model for thinking about which partnerships are worth what.
The ratios drive the GTM sequencing in `marketing/gtm-plan.md`.

## What each partner type costs and yields

| Partner type | Year-1 cost (Lupine, USD k) | Year-1 cash inflow (USD k) | Strategic asset created |
|--------------|------------------------------|-----------------------------|--------------------------|
| Academic Tier A (anchor) | 50 (engineering + travel) | 150-500 (paid pilot or co-PI subaward) | Validated paper; reference user; federal proposal eligibility |
| National lab | 80 (CRADA prep, integration, travel) | 250-750 (cooperative agreement, mostly in-kind) | Federal validation; user-facility deployment; CRADA history |
| Federal agency proposal (cycle) | 60 (proposal + admin) | 0-2,000 (probabilistic; ~25% hit rate at our stage) | Direct revenue, federal credibility, program-officer relationship |
| Industry pilot | 90 (engineering + sales) | 150 (Phase 1 paid POC) | Reference; data; renewal probability ~50% |
| Industry production | 120 (delivery + ongoing) | 750-1,500 | Recurring revenue; expansion runway; case study |
| Industry enterprise | 200 (delivery + dedicated support) | 1,500+ | Anchor reference; multi-year platform commitment |

Sources: [data:unit_economics.csv] for all loaded costs.

## Ratio analysis

| Partner type | Year-1 cash margin | Strategic ROI |
|--------------|---------------------|---------------|
| Academic Tier A | +100 to +450 | very high (validation + funding pipeline) |
| National lab | +170 to +670 (mostly in-kind) | very high (federal credibility) |
| Federal proposal cycle | -60 (sunk) to +2,000 (hit) | high (long-tail program revenue) |
| Industry pilot | +60 | medium (reference, conversion option) |
| Industry production | +630 to +1,380 | high (recurring revenue) |
| Industry enterprise | +1,300 | very high (anchor reference) |

The asymmetry: federal and academic partnerships have much higher
strategic ROI per dollar of Lupine engineering time, but they require
patience. Industry production deals have much higher cash margin but
require existing references — which the academic and federal
partnerships create.

This is the economic reason for the **ladder** in
`marketing/gtm-plan.md`: spend year 1 building the academic + federal
references that make industry production deals fundable in years 2-3.

## Co-development IP terms (common framework)

We use one IP framework across all partnership types, adapted only on
data-rights terms:

| Asset | Owned by Lupine | Owned by partner | Notes |
|-------|------------------|-------------------|-------|
| Lupine engine source code | yes | — | Apache 2.0 core; enterprise add-ons separately licensed |
| Pre-existing methodology IP | yes | — | IMMI paper methodology; sloppy-model + UQ stack |
| Customer data and inputs | — | yes | Always |
| Customer-derived parameters | — | yes | Customer's potential parameters, fitting choices |
| Customer-funded extensions to Apache 2.0 core | yes (after embargo) | partner (during embargo) | Default 6-12 month embargo |
| Joint publications | shared author list | shared author list | Pre-publication review for both parties |
| ITAR / ECCN-restricted deployments | enterprise build, on-prem only | partner | No telemetry; air-gapped option |

## Federal cost-share terms

For SBIR/STTR and direct-contract partners, standard federal cost-share
applies:

- Phase I SBIR: typically 0% cost-share required
- Phase II SBIR: typically 0-50% cost-share depending on agency
- DMREF / DOE BES CMS: full cost on subaward; PI institution carries
  indirect cost overhead
- DARPA SURGE/PRIME-class: cost-share is program-specific; often 20-50%
  for industry-led teams

The cash impact of cost-share is bounded. Our use-of-funds plan in
`financials/use-of-funds.md` reserves 10-15% of FY26 spend for
cost-match obligations, which is sufficient for two SBIR Phase II
awards in parallel.

## Partnership-driven revenue mix in projections

| FY | Academic + national-lab | Federal direct | Industry pilot | Industry production | Industry enterprise | Total |
|----|--------------------------|-----------------|------------------|------------------------|------------------------|-------|
| 26 | 50 | 0 | 300 | 0 | 0 | 350 |
| 27 | 300 | 1,000 | 1,500 | 750 | 0 | 3,700 |
| 28 | 800 | 4,000 | 3,000 | 3,750 | 1,500 | 13,650 |
| 29 | 1,500 | 8,000 | 4,500 | 9,000 | 4,500 | 29,000 |
| 30 | 2,400 | 12,000 | 6,000 | 18,000 | 9,000 | 50,400 |

(All figures USD k. Source:
[data:projections_base.csv:rev-academic],
[data:projections_base.csv:rev-defense],
[data:projections_base.csv:rev-industry-pilot],
[data:projections_base.csv:rev-industry-prod],
[data:projections_base.csv:rev-industry-ent].)

The mix is intentional. Academic + national-lab + federal contributes
~30% of revenue at scale (FY30) but is most of the *credibility* —
without that base, the industry production and enterprise lines do not
exist. Industry production contributes ~36% at scale and is the
recurring-revenue engine. Federal direct contracts contribute ~24%
with high gross margin and program-tied multi-year structure.

This is the inverse of the typical SaaS-only company; it is the same
revenue mix structure as Schrödinger's early years
[data:comparable_exits.csv:schrodinger-ipo].
