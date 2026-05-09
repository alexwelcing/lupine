# Customer Segments

We sell into four distinct buyers. They have different procurement
cycles, different price points, and different reasons to buy. The plan
is to ladder them: academic → national lab → industry pilot → industry
production → defense direct contract.

## Segment 1: Academic research groups (R1 + Five Eyes)

| Attribute | Value | Source |
|-----------|-------|--------|
| Population | ~5,000 active groups (conservative) | [data:market_segments.csv:lammps-users-conservative] |
| Annual ACV | $5K (Tier 1 individual) / $40K (Tier 2 department site) | [data:unit_economics.csv:acv-academic-tier-1] |
| Sales cycle | 2-8 weeks | directional |
| CAC | ~$2,000 | [data:unit_economics.csv:cac-academic] |
| LTV (5-year) | ~$22,500 | [data:unit_economics.csv:ltv-academic] |
| LTV/CAC | ~11x | derived |

**Why they buy.** VASP is $4,500/seat/yr and Vienna-held. OVITO Pro is
$1,200/seat/yr per user. Lupine View is free; Lupine Compute Tier 1 is
priced *below* the VASP seat to dislodge procurement. We ride on the
zero-friction funnel: a grad student loads a LAMMPS dump file in their
browser, Lupine View turns it into a publication figure in two seconds,
and the lab signs up.

**Why we win.** Apache 2.0 license, no install, faster than legacy
tools, and the IMMI paper gives the PI an academic-credibility reason
to cite us. Once a lab is integrated, switching cost is high — pymatgen
plus our analysis library plus the visualizer is one ecosystem.

**Risk.** Lab procurement sometimes prefers free open source. Mitigation
is a generous free tier and a thin paid layer that adds managed compute
+ priority support — not feature gating.

## Segment 2: National laboratories + federal infrastructure

| Attribute | Value | Source |
|-----------|-------|--------|
| Named targets | NIST MML, ORNL CNMS, ANL CNM, LBNL Materials Project, Sandia, LLNL | [data:partner_targets.csv] |
| Annual ACV | $250K–$750K (cooperative agreement scale) | [data:unit_economics.csv:acv-national-lab] |
| Sales cycle | 6-18 months (CRADA / cooperative agreement) | directional |
| Buying motion | Cost-share, in-kind, sponsored research | |
| Strategic value | Validation, IP signal, training data partnership |

**Why they buy.** National labs need permissively-licensed
infrastructure that they can build into open user facilities. They are
not allowed to depend operationally on commercial-licensed tools. They
also have an explicit MGI mandate to coordinate
([data:federal_funding_programs.csv:nist-mml]).

**Why we win.** Open core. Rust safety story for production-grade
infrastructure. UQ and meta-analysis methodology that maps directly to
ASCR Applied Mathematics priorities. The IMMI paper is a citation-
level handshake.

**Risk.** Federal procurement is slow. Mitigation: parallel pipeline
across NSF / DOE / NIST so any single program slip is absorbed.

## Segment 3: Industry — three beachheads

We deliberately scope to three sectors in years 1–3 because they share
the most-overlapping technical needs and have the most-validated buying
budgets.

### 3a. Semiconductors

| Targets | Buyer | Driver | ACV | Source |
|---------|-------|--------|-----|--------|
| TSMC, Intel Foundry, Samsung Semi | Process integration & materials | CHIPS Act + sovereignty | $800K–$1.5M | [data:partner_targets.csv:tsmc][data:partner_targets.csv:intel-foundry][data:partner_targets.csv:samsung-semi] |

CHIPS Act is the single largest tailwind. U.S./allied foundries now
have a procurement directive to source materials simulation from
sovereignty-friendly vendors.

### 3b. Aerospace + defense primes

| Targets | Buyer | Driver | ACV | Source |
|---------|-------|--------|-----|--------|
| GE Aerospace, Rolls-Royce, Pratt & Whitney, Boeing BR&T, Lockheed Skunk Works | Single-crystal alloys, hypersonics, AM qualification | DARPA SURGE/PRIME transition + ITAR-eligible deployment | $1.0–$1.5M | [data:partner_targets.csv:ge-aerospace][data:partner_targets.csv:rolls-royce][data:partner_targets.csv:pratt-whitney][data:partner_targets.csv:boeing][data:partner_targets.csv:lockheed-skunkworks] |

The PRIME methodology ([data:federal_funding_programs.csv:darpa-prime])
is structurally in our wheelhouse — multi-fidelity UQ + microstructure
modeling + experimental validation. We are the natural transition
vendor when the program completes in 2026.

### 3c. Battery + clean energy

| Targets | Buyer | Driver | ACV | Source |
|---------|-------|--------|-----|--------|
| QuantumScape, Solid Power, Sila, Form Energy, Tesla Energy | Solid-state electrolytes, anodes, cathodes | IRA + cycle-time pressure | $300K–$750K | [data:partner_targets.csv:qsa-lithium][data:partner_targets.csv:form-energy][data:partner_targets.csv:tesla-energy] |

IRA-funded battery R&D is materials-simulation-bottlenecked. Toyota
Research Institute publishes about its materials informatics program
[data:partner_targets.csv:toyota-r-d]; we have a published reference
methodology.

### Industry segment economics

| Stage | ACV | Pilot cost | Conversion target | LTV (5yr) |
|-------|-----|------------|-------------------|-----------|
| Pilot | $150K | 3-month POC | 50% to production | — |
| Production | $750K | n/a | 80% gross retention | $4.5M |
| Enterprise | $1.5M | n/a | 90% gross retention + expansion | $8M+ |

Source: [data:unit_economics.csv:acv-industry-pilot],
[data:unit_economics.csv:acv-industry-prod],
[data:unit_economics.csv:acv-industry-enterprise],
[data:unit_economics.csv:ltv-industry].

## Segment 4: Federal direct contracts (defense / energy)

| Attribute | Value | Source |
|-----------|-------|--------|
| Named targets | DARPA DSO, ARPA-E, AFRL RXA, ONR | [data:partner_targets.csv] |
| Annual program scale | $0.5M–$10M+ per program | [data:federal_funding_programs.csv:darpa-prime] |
| ACV per active program | ~$2M | [data:unit_economics.csv:acv-defense-program] |
| Sales cycle | 12-18 months (BAA, SBIR, direct award) | directional |
| LTV (5-year) | $9M | [data:unit_economics.csv:ltv-defense] |

**Why they buy.** They already buy this. The question is whether they
buy it from us versus from incumbent simulation primes (Sandia +
Northrop + Lockheed in-house). Open core is the wedge — federal
programs require deliverables in a form their downstream contractors
can run.

**Why we win.** Three reasons: (1) IMMI paper is a methodology proof
they can cite in proposals, (2) Apache 2.0 license avoids the data-
rights friction that always stalls commercial-licensed toolchains in
DOD work, (3) we are explicitly aligned with the EQUiPS → SURGE →
PRIME methodology lineage that DARPA has been funding for a decade
([data:federal_funding_programs.csv:darpa-equips],
[data:federal_funding_programs.csv:darpa-prime]).

**Risk.** Single-program concentration. Mitigation: pursue 2 federal
programs in parallel from FY27 onward; use SBIR Phase II as
non-dilutive bridge if a primary program slips.

## Segment laddering

The order matters. Each segment de-risks the next:

```
Academic adoption (free tier + Lupine View)
   -> Lab integration (paid Tier 1/2)
      -> National lab cooperative (validation + IP signal)
         -> Industry pilot (paid POC, $150K)
            -> Industry production ($750K-$1.5M ACV)
               -> Federal direct contract ($2M+/year)
```

The path through is the GTM motion. See `marketing/gtm-plan.md` for the
sequencing.
