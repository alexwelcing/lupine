# Revenue Model

## The structure: open core + four revenue surfaces

Lupine ships an Apache 2.0 open-core engine. We monetize four
non-overlapping surfaces on top:

1. **Subscription seats and site licenses** (SaaS-tier pricing for
   academic, mid-market, enterprise).
2. **Managed compute** (passthrough margin on cloud-hosted execution).
3. **Sponsored research and paid pilots** (industry POCs).
4. **Federal direct contracts and cooperative agreements**.

Each surface has its own gross margin profile, sales cycle, and
buyer.

## Surface 1: Subscriptions

| Tier | Buyer | Annual ACV | Notes | Source |
|------|-------|------------|-------|--------|
| Free / community | Academic individual, hobbyist, evaluator | $0 | Lupine View + open-core CLI; no compute | — |
| Tier 1 (academic seat) | Academic individual researcher | $5,000 | Cloud-hosted Lupine View Pro + managed-compute credits + priority support | [data:unit_economics.csv:acv-academic-tier-1] |
| Tier 2 (academic site) | Academic department / lab | $40,000 | Site-wide license + on-prem option + training + named support | [data:unit_economics.csv:acv-academic-tier-2] |
| Tier 3 (industry pilot) | Industry mid-tier or startup | $150,000 | 3-month paid POC + 9-month follow-on access | [data:unit_economics.csv:acv-industry-pilot] |
| Tier 4 (industry production) | Industry mid-tier OEM | $750,000 | Full deployment + integration + dedicated support | [data:unit_economics.csv:acv-industry-prod] |
| Tier 5 (industry enterprise) | Industry top-tier (semis / aerospace primes) | $1,500,000 | Multi-team deployment + ITAR-eligible build + co-development hours | [data:unit_economics.csv:acv-industry-enterprise] |
| Tier 6 (federal program) | Federal R&D agency | $2,000,000 | Direct contract; program-specific deliverables | [data:unit_economics.csv:acv-defense-program] |

Gross margin: ~85% on pure-software portion of all tiers
[data:unit_economics.csv:gross-margin-software], blended ~75-80% with
managed compute.

Pricing principles:
- Tier 1 priced *below* the VASP per-seat license [$4,500;
  data:competitor_matrix.csv:vasp] to dislodge procurement.
- Tier 2 priced at ~10x Tier 1, consistent with software industry
  per-seat-to-site ratios.
- Industry tiers priced against the documented ACV ranges of
  Schrödinger ([data:competitor_matrix.csv:schrodinger]) and Citrine
  ([data:competitor_matrix.csv:citrine]) materials informatics
  contracts.

## Surface 2: Managed compute

Cloud-hosted execution of Lupine workflows. Customer pays metered
compute + a managed-services markup. We use spot+reserved A100/H100
[data:unit_economics.csv:cost-cloud-a100-hour, cost-cloud-h100-hour]
on AWS / GCP / Azure with a thin abstraction so we are not locked to
one hyperscaler.

| Workload | Customer price | Lupine cost | Lupine margin |
|----------|----------------|-------------|----------------|
| Phonon validation suite, per material | ~$25 | ~$12 | ~52% |
| MLIP fine-tune | ~$800 | ~$400 | ~50% |
| Active-learning DFT call | ~$5/call | ~$2.50/call | ~50% |

Gross margin ~55% blended
[data:unit_economics.csv:gross-margin-managed-compute].

Why we offer it: the unit economics are not amazing on managed compute
itself, but it (a) reduces friction for academic and small-industry
buyers, (b) creates a high-frequency engagement surface for upsell to
production tiers, and (c) keeps us in the loop on telemetry that
informs product direction.

## Surface 3: Sponsored research / paid pilots

A paid pilot is a *productized professional services* engagement, not a
SaaS contract. The customer funds engineering time to apply Lupine to
their materials and produce a contractable artifact.

Standard Phase 1 paid POC structure:

| Item | Value |
|------|-------|
| Duration | 3 months |
| Customer pays | $150,000 |
| Lupine deliverables | Custom benchmark of customer's 50-200 materials in Lupine framework; UQ-bounded results report; recommendations for production deployment |
| Lupine engineering time | ~2 FTE-months (1 senior eng + 0.5 scientist + 0.25 GTM) |
| Lupine cost | ~$50,000 loaded |
| Gross margin | ~67% |

The paid POC is profitable on its own. If it converts to production
(target 50%), the conversion is pure upside — the production ACV is
recurring. If it doesn't convert, the customer is now a publicly
referenceable evaluator.

## Surface 4: Federal direct contracts

DARPA / DOE / NSF / ARPA-E direct awards. Multi-year, milestone-driven,
with quarterly deliverables. Standard award structures
[data:federal_funding_programs.csv]:

| Mechanism | Typical award | Duration | Margin profile |
|-----------|----------------|----------|-----------------|
| NSF DMREF (subaward) | $1.5-2.0M total | 4 years | full-cost recovery; ~10-20% indirect |
| NSF SBIR/STTR Phase I | $305K | 6-18 mo | ~65% margin (low cost-share) |
| NSF SBIR/STTR Phase II | $1.25M | 24 mo | ~50% margin (matched cost-share possible) |
| DOE BES CMS | $2-3M/yr | 3-5 yr | full-cost; ~10-15% indirect |
| DOE SBIR Phase I | $200-300K | 12 mo | ~65% margin |
| DOE SBIR Phase II | $1M | 24 mo | ~55% margin |
| DARPA SURGE/PRIME-class | $5M+ over 4 yr | 3-4 yr | program-specific; cost-share 20-50% |

Federal contract revenue carries lower nominal gross margin than pure
SaaS but funds *engineering we would have done anyway*. It is
non-dilutive growth capital.

## Revenue mix at scale (FY30 base case)

| Source | FY30 revenue (USD k) | % of total |
|--------|----------------------|-------------|
| Academic subscriptions | 2,400 | 5% |
| Industry pilots | 6,000 | 12% |
| Industry production | 18,000 | 36% |
| Industry enterprise | 9,000 | 18% |
| Federal direct contracts | 12,000 | 24% |
| Managed compute (margin only) | 3,000 | 6% |
| **Total** | **50,400** | **100%** |

Source: [data:projections_base.csv].

This mix is intentional and structurally durable:
- Industry production + enterprise (54%) is the *recurring* SaaS-like
  base.
- Federal + national-lab (24%+) is non-dilutive and high-credibility.
- Academic (5%) is small-revenue but the *funnel* — it produces the
  references that convert to industry production.
- Managed compute (6%) is the high-frequency upsell surface.
- Industry pilot (12%) is the *option premium* paid for future
  production contracts.

## Why this is durable

Three reasons the revenue mix survives competitive pressure:

1. **Multiple non-substitutable buyers.** A hyperscaler can compete
   on managed compute, but cannot replace the federal-direct surface
   (open-core requirement, methodology citation requirement). A
   foundation-MLIP company can compete on inference but cannot replace
   the unified-pipeline subscription surface (single-engine
   requirement). Killing any one revenue surface does not kill the
   business.
2. **Cross-surface attribution.** The same customer often pays on two
   or three surfaces simultaneously. A defense prime might pay
   Tier 5 enterprise + paid pilots + federal program subaward. The
   relationship value is the sum.
3. **Open-core community moat.** Apache 2.0 core code is forkable in
   theory, but the methodology + benchmark + paper authority is not.
   The community we cultivate accrues to us specifically.
