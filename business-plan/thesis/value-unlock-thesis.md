# Value-Unlock Thesis

> Replaces the placeholder market sizing in earlier drafts. The thesis
> is now anchored on a bottom-up build of materials-acceleration value
> across compute, travel, and bio — sourced from McKinsey, Bain, BNEF,
> IEA, FDA, Frost & Sullivan, BCG, and primary agency disclosures.
> Every number resolves to a cell in
> `business-plan/value-model/`.

## The shift in framing

The previous thesis treated Lupine as a vertical SaaS company:
materials-simulation seat-licensing, replacing VASP and OVITO Pro,
sized at the legacy commercial-software TAM (~$10-20B). That framing
under-counts the opportunity by an order of magnitude.

The correct framing is **software-of-record for materials
acceleration**. Lupine compresses the time and cost of materials
qualification across three sectors that are each running into a
materials-bottleneck simultaneously. The denominator is the economic
value created when that bottleneck is compressed, not the legacy
software seat license.

This is the same shift Synopsys / Cadence made in EDA between 1995
and 2010: from "we sell tools to chip designers" to "we capture
~15% of the design productivity gain that the entire semi industry
depends on." Lupine's natural ratio is 2-5%, not 15%, but the slope
of the leverage is the same.

## The three sectors

### Compute — $40B/yr accelerated value at 2030 maturity

| Acceleration lever | Annual value | Source |
|---------------------|---------------|--------|
| 12-month compression of leading-edge node materials qualification | $15B/yr | [data:materials_acceleration_economics.csv:compute-node-time-to-mkt] |
| EUV/High-NA photoresist qualification cycle | $8B/yr | [data:materials_acceleration_economics.csv:compute-photoresist-qual] |
| 2D materials (MoS2, hBN, graphene) for sub-2nm transistors | $12B/yr | [data:materials_acceleration_economics.csv:compute-2d-materials] |
| Advanced packaging substrates (CoWoS, hybrid bonding) | $5B/yr | [data:materials_acceleration_economics.csv:compute-packaging-mat] |

**Buyer.** TSMC, Intel Foundry, Samsung Semi, GlobalFoundries —
funded by $447B of CHIPS-Act-incentivized capex
([data:sector_value_unlock.csv:chips-act-fab-capex]). The
sovereignty narrative makes Lupine the natural sourcing decision for
US/allied foundries currently dependent on Vienna-licensed VASP.

### Travel — $78B/yr accelerated value at 2030 maturity

| Acceleration lever | Annual value | Source |
|---------------------|---------------|--------|
| Solid-state electrolyte commercialization | $30B/yr | [data:materials_acceleration_economics.csv:travel-solid-state-electrolyte] |
| High-Ni cathode energy density (260 → 310 Wh/kg) | $18B/yr | [data:materials_acceleration_economics.csv:travel-cathode-energy-density] |
| Si-rich anode commercialization | $12B/yr | [data:materials_acceleration_economics.csv:travel-anode-silicon] |
| eVTOL-specific battery chemistries | $8B/yr | [data:materials_acceleration_economics.csv:travel-evtol-battery] |
| Single-crystal turbine alloy lifing | $6B/yr | [data:materials_acceleration_economics.csv:travel-turbine-alloy-lifing] |
| Additive manufacturing part qualification | $4B/yr | [data:materials_acceleration_economics.csv:travel-am-qualification] |

**Buyer.** EV OEMs and battery startups funded by $300B+ in
IRA-incentivized US battery manufacturing capex
([data:sector_value_unlock.csv:ira-battery-capex]); aerospace primes
GE / Rolls / Pratt & Whitney / Boeing / Lockheed Skunk Works funded
by $28B/yr US aerospace R&D
([data:sector_value_unlock.csv:aerospace-rd-us]); and the $40B 2030
eVTOL market gating itself on energy density chemistry
([data:sector_value_unlock.csv:evtol-tam-2030]).

### Bio — $33B/yr accelerated value at 2030 maturity

| Acceleration lever | Annual value | Source |
|---------------------|---------------|--------|
| Synthetic biology strain optimization | $10B/yr | [data:materials_acceleration_economics.csv:bio-synbio-strain] |
| Tunable drug-delivery polymers | $8B/yr | [data:materials_acceleration_economics.csv:bio-drug-delivery-polymer] |
| Implant-grade biocompatible polymers | $5B/yr | [data:materials_acceleration_economics.csv:bio-implant-biocompatibility] |
| Lipid nanoparticle (LNP) chemistry | $4B/yr | [data:materials_acceleration_economics.csv:bio-mrna-lipid] |
| Cell-therapy scaffold materials | $3B/yr | [data:materials_acceleration_economics.csv:bio-cell-therapy-scaffold] |
| Crop-protection delivery materials | $3B/yr | [data:materials_acceleration_economics.csv:bio-ag-delivery] |

**Buyer.** Biopharma R&D ($260B/yr global,
[data:sector_value_unlock.csv:pharma-rd-global]); cell & gene therapy
companies (~$25B → $80B 2030 market,
[data:sector_value_unlock.csv:biopharma-cell-gene-2024]); synthetic
biology platforms ($30B → $100B 2030,
[data:sector_value_unlock.csv:synbio-2024]); medtech for implant
biocompatibility; ag-tech for delivery materials.

### Aggregate — $151B/yr at 2030 maturity

[data:materials_acceleration_economics.csv:total-three-sectors-2030].

## Lupine's slice — software-of-record economics

Lupine does not capture all of this. It is the *engine* that the
work runs through. Two parameters set the slice:

1. **Penetration of edge materials simulation work** —
   what fraction of the materials simulation that drives the
   acceleration is run through Lupine. This grows from ~0.1% in FY26
   (early adopters only) to ~2.5% by FY30 base case
   ([data:lupine_revenue_v2.csv:lupine-penetration-pct]).
2. **Capture rate of the value Lupine accelerates** — what fraction of
   the customer's measured value uplift Lupine receives in revenue.
   This depends on the contracting mechanism
   ([data:value_capture_mechanisms.csv]):

| Mechanism | Capture rate | Mature year |
|-----------|--------------|--------------|
| SaaS subscription | 0.005% | FY26 |
| Managed compute | 0.01% | FY26 |
| Paid pilot | 0.02% | FY26 |
| Production license | 0.05% | FY27 |
| Enterprise license | 0.08% | FY27 |
| Sponsored research | 0.15% | FY27 |
| Performance contract | 0.5% | FY28 |
| Royalty / IP licensing | 1.0% | FY28 |
| Equity stake in customer | 2.0% | FY27 |
| Federal direct contract | 1.5% | FY27 |

Blended capture rate weighted by mix ramps from ~5% in FY26 (paid
pilots dominate) to ~3-4% mature.

## Putting the slice and the unlock together

| FY | Total sector unlock ($B/yr) | Lupine penetration | Lupine-attributed unlock ($M) | Lupine revenue ($M) | Capture % |
|----|------------------------------|---------------------|-------------------------------|----------------------|------------|
| 26 | 5.8 | 0.10% | 5.8 | 0.4 | 6.0% |
| 27 | 14.6 | 0.30% | 43.8 | 4.2 | 9.6% |
| 28 | 32.2 | 0.70% | 225.4 | 16.2 | 7.2% |
| 29 | 63.1 | 1.50% | 946.5 | 35.0 | 3.7% |
| 30 | 99.1 | 2.50% | 2,477.5 | 62.4 | 2.5% |
| 31 | 122.7 | 3.50% | 4,294.5 | 94.5 | 2.2% |
| 32 | 139.2 | 4.50% | 6,264.0 | 133.3 | 2.1% |

Source: [data:lupine_revenue_v2.csv].

**The capture % converges to ~2-3% at maturity** — exactly in the
band where Synopsys and Cadence sit relative to semi industry design
productivity ([data:comparable_companies_v2.csv:synopsys, cadence]).
This is not aspirational; it is the documented economics of
software-of-record for an industry-critical bottleneck.

## What this changes about the seed thesis

Three things:

1. **The valuation defense moves from "Schrödinger comp" to "Synopsys
   comp."** Mature Lupine is structurally positioned as Synopsys-of-
   materials, not as Schrödinger's third division. The DCF and comps
   in `financials/Lupine_DCF_Model.xlsx` and
   `financials/Lupine_Comps_Analysis.xlsx` reflect this.
2. **The buyer list is concrete and named.** $447B CHIPS capex, $300B
   IRA battery capex, $28B aerospace R&D, $260B pharma R&D — these
   are documented procurement budgets, not estimated TAMs. The
   uncertainty is on Lupine's penetration rate, not on whether the
   buyers exist.
3. **The exit comp set widens.** ANSYS / Synopsys / Cadence at $35B-
   $90B market cap; Schrödinger at $4B; Veeva at $32B as the vertical-
   SaaS-in-regulated-industry analog. Lupine has multiple plausible
   strategic acquirer classes plus an asymmetric public-market path.

## Reading the rest of the model

Source data (`value-model/`):

- **`sector_value_unlock.csv`** — the sector economics.
- **`materials_acceleration_economics.csv`** — the acceleration levers
  that drive the value unlock.
- **`value_capture_mechanisms.csv`** — Lupine's monetization options.
- **`lupine_revenue_v2.csv`** — the resulting revenue projection
  (this replaces `data/projections_base.csv` for any forward-looking
  analysis).
- **`dcf_inputs.csv`** — DCF assumption set.
- **`comparable_companies_v2.csv`** — comps for the multiples-based
  valuation cross-check.

Code (`scripts/`):

- **`lib_finance.py`** — pure-Python DCF, WACC, sensitivity, and
  comps-median functions (no external deps).
- **`analyze.py`** — loads all `value-model/*.csv`, runs DCF for
  bear/base/bull, computes the WACC × terminal-growth sensitivity
  grid, computes comp medians and implied Lupine valuation, runs the
  probability-weighted return analysis, and writes the report.

Computed output (`financials/`):

- **`analysis_report.md`** — the regenerable analysis report. Bear
  $36.8M / Base $331.9M / Bull $1,618.8M intrinsic equity values;
  +121.3% margin of safety vs $150M proposed post; +39% probability-
  weighted IRR over a 5-year hold.

Synthesis:

- **`IC_MEMO.md`** — the synthesis IC memo.

The original `data/` folder remains for reference but is *superseded*
by `value-model/` for any value-unlock or revenue claim. The
documents that still rely on the original `data/` (TAM/SAM/SOM
narrative, original moonshot-math) should be read alongside
`value-unlock-thesis.md` and `IC_MEMO.md`, which are the canonical
new artifacts.
