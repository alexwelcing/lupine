# Projections

This document is a *summary* of `data/projections_base.csv` and
`data/projections_bear_bull.csv`. The CSVs are the source of truth.
If you want to stress-test the model, edit those.

## Base case at a glance

| FY | Headcount | Revenue ($M) | Gross margin | EBITDA ($M) | Cash end ($M) | Ending ARR ($M) |
|----|-----------|---------------|----------------|---------------|------------------|-------------------|
| 2026 | 8 | 0.35 | 57% | (2.1) | 5.8 | 0.8 |
| 2027 | 16 | 3.7 | 75% | (1.8) | 3.9 | 5.2 |
| 2028 | 28 | 13.7 | 78% | 2.6 | 6.3 | 18.5 |
| 2029 | 43 | 29.0 | 79% | 10.2 | 16.1 | 38.5 |
| 2030 | 61 | 50.4 | 81% | 22.5 | 37.9 | 65.0 |

Source [data:projections_base.csv].

Two structural facts:

1. **Cross break-even FY28.** EBITDA goes positive when the recurring
   industry production revenue ($3.75M) and federal direct revenue
   ($4M) cross the opex line for the engineering team.
2. **Cash trough Q3 FY27.** Lowest projected cash ~$1.8M against a
   monthly burn of ~$300K. Bridge or non-dilutive funding is the
   contingency. SBIR Phase II ($1M) is the most reliable bridge
   instrument [data:federal_funding_programs.csv:doe-sbir-2].

## Three-scenario summary

| Metric | Bear (FY30) | Base (FY30) | Bull (FY30) |
|--------|--------------|--------------|--------------|
| Revenue | $15M | $50.4M | $160M |
| Ending ARR | $22M | $65M | $200M |
| EBITDA | $3.5M | $22.5M | $72M |
| Headcount | 30 | 61 | 100 |
| Implied valuation at 15x ARR | $330M | $975M | $3,000M |

Source [data:projections_bear_bull.csv].

15x ARR is consistent with public mature-simulation comps:
- Synopsys ~13x revenue [data:comparable_exits.csv:synopsys-revenue]
- Cadence ~17x revenue [data:comparable_exits.csv:cadence-revenue]
- ANSYS deal at ~16x [data:comparable_exits.csv:ansys-acquisition]
- Altair deal at ~15x [data:comparable_exits.csv:altair-acquisition]

We use 15x as a defensible mid-cycle multiple for a profitable
vertical-software company; high-growth pre-profitability rounds price
at 30-50x ARR (e.g. Schrödinger IPO at 37x
[data:comparable_exits.csv:schrodinger-ipo]).

## Bear case in detail

Triggers and assumptions:
- Pilot conversion 30% (instead of 50% base).
- No defense direct contract by FY28.
- Slower industry production ramp (1 deal in FY27 instead of 1, 3 in
  FY28 instead of 5).
- Hiring frozen at 30 by FY30.

Outcome: $15M revenue, $22M ARR, $3.5M EBITDA. Profitable but
sub-venture-scale. Path forward: bridge round at flat valuation in
FY28; eventual strategic acquisition at $200-400M
[data:comparable_exits.csv:citrine-c benchmark].

## Bull case in detail

Triggers and assumptions:
- Defense direct contract lands FY27 ($2M+ ACV).
- 2 enterprise industry deployments by FY28.
- Sovereignty mandate (CHIPS Act regulation tightening) accelerates
  semiconductor adoption.
- Pull-forward hiring to capture demand (HC 100 by FY30).
- Series A at $300M+ post in FY28 on revenue trajectory.

Outcome: $160M revenue, $200M ARR, $72M EBITDA. Synopsys / ANSYS
trajectory. Series B in 2031-2032 at $1.5-3B post-money on multiple
expansion + revenue growth.

## Stress tests

The validator script (`scripts/validate.py`) checks that bear < base <
bull on all metrics. Manual stress tests we run quarterly:

1. **+25% to all loaded salaries** (tight engineering market):
   FY28 EBITDA falls from $2.6M to ~$0.5M. Still cash-flow break-even
   but cash trough deepens by ~$1.5M. Mitigation: hire ahead of need
   in FY26 to lock pricing, slower ramp.
2. **-30% to all industry ACV** (price pressure from foundation MLIP
   companies productizing): FY30 revenue falls from $50.4M to ~$36M.
   EBITDA falls to ~$14M. Bull case unaffected (price pressure does
   not apply at enterprise tier where ITAR / sovereignty win).
3. **-50% to federal contract revenue** (single agency cycle slip):
   FY30 revenue falls from $50.4M to ~$44M. Most painful in FY27
   where the federal $1M is the difference between $3.7M total and
   $2.7M total. Mitigation: 3-4 federal proposals always in flight
   in parallel.

## What 36 months from now looks like

If base case lands:
- $13.7M revenue, $18.5M ARR.
- 28 FTEs.
- $6.3M cash on hand from this seed without a Series A.
- 1+ DARPA-class direct contract, 5+ industry production customers,
  1+ industry enterprise.
- Series A optional (price of optionality is high; we may take growth
  capital at $300M+ post anyway).

If bull case lands, we are pricing Series A at $500M-$1B post by FY28
and are a strategic acquisition target.

If bear case lands, we are profitable, sub-venture-scale, and a
sponsor-backed buyout candidate at $200-400M.

All three outcomes are credible. None of them sit on the founder's
$12B-TAM-by-2028 estimate
[data:market_segments.csv:sim-tam-deck] — they all land
inside the conservative triangulated SAM band.
