# Moonshot Math: Why a $5–10M Check Survives the Asymmetry

## The asymmetric-upside argument in one paragraph

A seed-stage check into Lupine pays for the engineering required to
finish a peer-reviewed scientific platform in a market — computational
materials simulation — that has only ever produced one $30B+ outcome
(ANSYS / Synopsys, 2024) and one $35B+ EDA-style consolidation. The
universe of comparable outcomes is small *because the work is hard*, not
because the prize is small. If Lupine reaches the trading multiple of a
mature simulation public comp on even bear-case ARR, the investor's
return profile dominates the much larger universe of seed checks priced
at venture-typical $5M–$15M post-money.

## The expected-value table

Probabilities are founder estimates calibrated against the comparable
exits set ([data:comparable_exits.csv]). They are explicitly directional
— the point is not that we know the probabilities, the point is that the
distribution is asymmetric enough to absorb significant probability
errors and still produce a positive expected return.

Assume the seed round is $8M at $150M post (mid-point of stated range).
Investor takes ~5.3% of the company. We model 4 outcomes:

| Outcome | Description | Investor value at seed % | Probability (directional) | EV contribution |
|---------|-------------|--------------------------|---------------------------|-----------------|
| Zero | Failure / acqui-hire below preference | $0 | 50% | $0 |
| Modest | Acqui-hire at $50M (DOE / DARPA program transition) | $2.6M | 20% | $0.5M |
| Strategic | $500M strategic acquisition (Schrodinger-tier) | $26M | 20% | $5.2M |
| Moonshot | $5B+ outcome (ANSYS / Citrine-tier rollup) | $260M | 7% | $18.2M |
| Asymmetric | $30B+ Synopsys-class category leader | $1.6B | 3% | $48M |
| **Expected value** | | | **100%** | **~$72M** |
| Implied multiple on $8M raise (5.3% ownership of $8M check) | | | | **~170x on the slice; ~9x on the check** |

Two readings:

- A 9x EV on the check is *extremely* generous compared to most
  late-stage venture deals. The whole point of paying up is that the
  upper tail of the distribution dominates.
- The probabilities are deliberately conservative. Half-probability of
  zero is not standard for a company already shipping product with a
  peer-reviewed paper. We bias against the founder.

## Comparable exits ground the upper tail

The comp set is in `data/comparable_exits.csv`. Four anchors:

1. **ANSYS → Synopsys, $35B (2024).** $2.2B ARR at ~16x revenue.
   ([data:comparable_exits.csv:ansys-acquisition]) The structural
   acquirer for a unified materials platform is the same kind of
   acquirer that bought ANSYS — engineering software consolidators or
   hyperscalers with simulation strategy.
2. **Altair → Siemens, $10B (2024).** $640M ARR at ~15x revenue.
   ([data:comparable_exits.csv:altair-acquisition]) The mid-tier
   simulation outcome.
3. **Schrödinger IPO at $3B (2020).** $80M software ARR at ~37x
   revenue. ([data:comparable_exits.csv:schrodinger-ipo]) The closest
   pure-play comp — materials + drug-discovery software with a
   physics-based engine.
4. **Recursion IPO at $5B (2021).** $30M revenue at ~165x revenue.
   ([data:comparable_exits.csv:recursion-ipo]) AI-for-science premium
   in a public market. We are not comparable on biology, but we are
   comparable on the AI-for-science narrative.

## Why $150M post is defensible at the seed

The valuation is high for a typical seed. We defend it on five legs:

1. **Shipped product.** Lupine View is in the wild with WebGPU rendering
   and Rust/WASM parsers. Most seed rounds are pre-product.
2. **Peer-reviewed IP.** *Integrating Materials and Manufacturing
   Innovation*, 2026 (in press). The Brown / Sethna / Pearl / Transtrum
   methodology lineage is uncopyable on a 12-month horizon.
3. **Sovereignty wedge.** VASP at $4,500/seat/yr is Vienna-held
   ([data:competitor_matrix.csv:vasp]). Every U.S. lab and every
   CHIPS-funded foundry has a procurement reason to fund a Western
   alternative.
4. **Federal alignment.** NSF DMREF ($50M+/yr,
   [data:federal_funding_programs.csv:nsf-dmref]) and DOE BES CMS
   ($30M+/yr, [data:federal_funding_programs.csv:doe-bes-cms]) speak
   exactly the language of this work — UQ, multi-fidelity, validated
   benchmarks, open core. The first non-dilutive money is reachable
   within 12 months.
5. **Comp set premium.** Orbital Materials closed $20M Series A at a
   reported ~$80M post-money in 2024 with one foundation MLIP and no
   product ([data:comparable_exits.csv:orbital-a]). Lupine has *more
   product* than Orbital had at Series A; a $150M seed valuation is
   in-band.

## The discount the round has to absorb

Even with all five legs, $150M post is at the ceiling of seed
valuations. Fair to acknowledge:

- Most deeptech materials seeds close at $5M–$30M post-money. We are
  asking 5–10x the median.
- The path to defending the valuation in dilution math is **revenue
  trajectory + named federal contract by end of FY27**. Without one of
  the two, the next round prices flat or down.
- If the seed prices at $100M post instead of $150M, EV math changes by
  ~50% on the upside slice but the *shape* of the asymmetry holds.

## What "moonshot" looks like in numbers

| Year | Trigger | Outcome |
|------|---------|---------|
| FY27 | Defense direct contract (DARPA DSO / SURGE-class) lands | Series A at $300M+ post on revenue + program proof |
| FY28 | Cross break-even on base case ($18.5M ARR [data:projections_base.csv:arr-end]) | Strategic acquirer interest from Synopsys / Cadence / Microsoft |
| FY29-30 | $65M ARR base / $200M ARR bull [data:projections_bear_bull.csv:arr-end-bull] | Public-market or strategic exit at $1B–$5B; CDNS/SNPS multiple range |

The moonshot is not "we discover room-temperature superconductivity."
The moonshot is **the unified materials platform that hyperscalers and
defense primes both pay for**, on a compounding open-core flywheel that
is structurally hard to displace.

## Sensitivity to a 50% probability error

If the moonshot probability is half what we estimated (5% instead of
10% combined upper tail), EV drops from $72M to ~$39M, still 4.9x on the
$8M check. The asymmetry holds. If the probability is double, EV moves
to $145M, ~18x. Asymmetric tails forgive estimation error in *both*
directions.
