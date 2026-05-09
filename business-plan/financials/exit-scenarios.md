# Exit Scenarios

This document is for investors who need to model the return profile.
For the EV calculation that drives the seed thesis, see
`thesis/moonshot-math.md`. This expands on what each outcome looks
like mechanically.

## Five plausible outcomes

| Scenario | Probability (directional) | Trigger | Mechanism | Range (USD) |
|----------|---------------------------|---------|-----------|-------------|
| Zero | 50% | Failure to ship MD-engine alpha or first paid pilot conversion | Wind-down or acqui-hire below preference stack | $0 |
| Modest | 20% | Bear case + DARPA / DOE program transition | Acqui-hire by national-lab-aligned prime or strategic | $50-200M |
| Strategic | 20% | Base case ARR + product completeness | Acquisition by simulation incumbent (Synopsys, Cadence, Siemens, Schrödinger) | $300M-$1B |
| Moonshot | 7% | Bull case + sovereignty regulatory tailwind | Hyperscaler acquisition or growth-equity-led IPO | $2-5B |
| Asymmetric | 3% | Category leader + EDA-style consolidation | Public-market exit at SNPS / CDNS multiple, or strategic at premium | $10-30B+ |

## Anchors for each band

### Zero ($0)
- Cumulative materials startup seed losses are common; this is the
  dominant outcome statistically.
- Mitigation in our case: shipped product + peer-reviewed paper +
  active research base ([atlas-distill, IMMI submission](../README.md))
  reduces probability vs. the seed median.

### Modest ($50-200M)
- Comp: Materials Lab (Matlas) seed-equivalent valuations
  [data:comparable_exits.csv:matlas-seed], Citrine Series C reported
  ~$200M [data:comparable_exits.csv:citrine-c].
- Mechanism: National-lab-aligned prime (e.g. AlphaSTAR, Addiguru,
  TIBCO/Spotfire-class) acquires for talent and methodology.
- Investor return at $8M / 5.3% on $150M post: $8M-$11M, ~1-1.5x.
- Note: this is the *acceptable* downside, not the desired outcome.

### Strategic ($300M-$1B)
- Comps: Citrine ($200M C), Materialise listing ($400M)
  [data:comparable_exits.csv:materialise-listed], early-stage
  Schrödinger.
- Mechanism: Simulation incumbent (Synopsys post-ANSYS,
  Cadence, Siemens post-Altair, or Schrödinger expanding from drug to
  materials) acquires for product extension.
- Investor return at $8M / 5.3% on $150M post: $16M-$53M, 2-7x.
- This is the *expected* outcome conditional on hitting base case
  ARR.

### Moonshot ($2-5B)
- Comps: Schrödinger IPO at $3B, Recursion at $5B, ANSYS pre-Synopsys
  at ~$30B but on much larger ARR
  [data:comparable_exits.csv:schrodinger-ipo, recursion-ipo].
- Mechanism: Either (a) a hyperscaler (Microsoft, Google, IBM)
  acquires Lupine to anchor a materials-as-a-service strategy, or
  (b) growth-equity round at IPO-track valuation followed by direct
  listing.
- Investor return at $8M / 5.3% on $150M post: $106M-$265M, 13-33x.

### Asymmetric ($10-30B+)
- Comps: ANSYS at $35B [data:comparable_exits.csv:ansys-acquisition],
  Synopsys mid-cap [data:comparable_exits.csv:synopsys-revenue], Cadence
  [data:comparable_exits.csv:cadence-revenue].
- Mechanism: Lupine becomes the EDA-of-materials category leader.
  Trading multiple of 13-17x revenue against $1.5-2B ARR by 2032-2034.
  This requires a 5-7 year hold past seed.
- Investor return at $8M / 5.3% on $150M post: $530M-$1.6B, 66-200x.

## Strategic acquirer landscape (named)

| Class | Named acquirer | Why they buy |
|-------|----------------|--------------|
| Engineering simulation consolidator | Synopsys (post-ANSYS), Cadence, Siemens (post-Altair) | Materials extension to existing engineering simulation portfolio |
| Materials-pharma hybrid | Schrödinger | Direct competitive overlap; consolidates verticals |
| Hyperscaler with materials thesis | Microsoft (Azure Quantum Elements), Google (DeepMind GNoME lineage), IBM (Materials Research) | Anchor a materials-as-a-service offering on a productized engine |
| Defense prime | Lockheed (Skunk Works), Northrop Grumman, Raytheon (RTX) | ITAR-eligible materials capability |
| National-lab-aligned strategic | Sandia (LAMMPS lineage), Argonne, Oak Ridge | Cooperative agreement structure may extend to acquisition or directed transition |
| Industrial conglomerate | GE, Honeywell, BASF | Vertical materials capability for in-house use |

The named hyperscalers and engineering-simulation consolidators are
the most plausible acquirers in the Strategic and Moonshot bands.

## Public-market path

If we end up on the asymmetric trajectory, the IPO-comparable set is:

- **Synopsys (NASDAQ:SNPS)** — $90B market cap on $7B revenue
  [data:comparable_exits.csv:synopsys-revenue]; ~13x revenue.
- **Cadence (NASDAQ:CDNS)** — $75B on $4.5B revenue
  [data:comparable_exits.csv:cadence-revenue]; ~17x revenue.
- **Schrödinger (NASDAQ:SDGR)** — historical range $2-7B on growing
  software revenue [data:comparable_exits.csv:schrodinger-ipo].

These are all engineering / scientific-software public companies
trading at durable revenue multiples. Lupine reaching $1B+ ARR by
2032-2034 and trading at 13-17x revenue is the asymmetric tail.

## Investor IRR by scenario

Assuming $8M check at $150M post, 5-year hold horizon:

| Scenario | Outcome | Investor return (5.3% slice) | IRR (5-year hold) |
|----------|---------|------------------------------|--------------------|
| Zero | $0 | $0 | -100% |
| Modest | $100M (mid-band) | $5.3M | -8% |
| Strategic | $500M (mid-band) | $26.5M | 27% |
| Moonshot | $3B (mid-band) | $159M | 81% |
| Asymmetric | $15B (mid-band) | $795M | 152% |

Probability-weighted IRR: ~28% on a 5-year hold. This is in the right
range for a high-quality seed deeptech check.

## Liquidation preference and deal structure notes

Standard 1x non-participating preferred is assumed. If the round is
structured with 1x participating preferred, the modest-case investor
return improves slightly at the expense of founder dilution; we
anticipate a clean 1x non-participating deal at this valuation.

Anti-dilution: weighted-average broad-based is standard at this size.

ROFR / pro-rata: pro-rata rights through Series A and Series B is
typical and we are open to it.

Information rights: quarterly board pack with the projection-CSV
diff vs. base case. Annual audited financials by FY28 once revenue
crosses $10M.

## What kills each scenario specifically

- **Strategic / Moonshot fail** if base-case ARR slips below $10M by
  FY28. The trigger is failure to convert pilots — see the
  sensitivity table in `financials/unit-economics.md`.
- **Asymmetric fails** if a hyperscaler launches a productized
  unified-platform offering before our DFT engine ships in FY27. This
  is the most-watched risk on the technical roadmap.
- **All upside scenarios fail** if the open-core community does not
  accumulate. The wedge depends on us being the canonical engine, not
  one of many.
