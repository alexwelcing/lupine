# Lupine Business Plan

This folder is the **single source of truth** for Lupine's investment
thesis, market analysis, partner strategy, financial model, and GTM
plan. It is structured so that every quantitative claim resolves to a
versioned cell in `data/` or `value-model/`.

## v2 update — value-unlock model + code-driven analysis + IC memo

The original `data/*.csv` layer used founder estimates and
triangulated TAM proxies. **It has been superseded** for value /
revenue / valuation claims by `value-model/`, which is built bottom-up
from materials-acceleration economics across compute, travel, and bio
(McKinsey, Bain, BNEF, IEA, FDA, BCG, Frost & Sullivan, agency primary
docs).

The financial analysis runs in pure Python — no Excel, no openpyxl,
no manual workbook. Edit a CSV cell, re-run `analyze.py`, the report
regenerates with new figures.

Canonical v2 artifacts:

- **`IC_MEMO.md`** — investment committee memo, the synthesis
  doc. Drafted following the IC-memo skill from
  `~/.claude/plugins/financial-services/`.
- **`thesis/value-unlock-thesis.md`** — the new framing: Lupine as
  software-of-record for materials acceleration; ~$151B/yr 2030
  sector unlock; ~2-5% capture economics akin to Synopsys/Cadence.
- **`financials/analysis_report.md`** — the computed report:
  scenario DCF, WACC × terminal-growth sensitivity grid, comp
  medians, implied valuation table, probability-weighted IRR.
  Regenerable.
- **`value-model/`** — source CSVs for the v2 model:
  `sector_value_unlock.csv`, `materials_acceleration_economics.csv`,
  `value_capture_mechanisms.csv`, `lupine_revenue_v2.csv`,
  `dcf_inputs.csv`, `comparable_companies_v2.csv`.
- **`scripts/lib_finance.py`** — pure-Python DCF / WACC / comps /
  sensitivity functions (stdlib only).
- **`scripts/analyze.py`** — loads value-model CSVs, runs the full
  analysis, writes `financials/analysis_report.md`. Run with
  `--check` in CI to verify the report is in sync with CSVs.

The original `data/*.csv` and the v1 narrative documents remain in
place for reference, but every forward-looking financial claim should
cite `value-model/` and read alongside `IC_MEMO.md` and
`financials/analysis_report.md`.

Regenerate the analysis:

```bash
python3 business-plan/scripts/analyze.py            # writes report
python3 business-plan/scripts/analyze.py --check    # CI: fails if stale
python3 business-plan/scripts/validate.py            # validates CSVs and refs
```

## Reading order

If you have ten minutes:
1. `IC_MEMO.md`
2. `thesis/value-unlock-thesis.md`
3. `EXECUTIVE_SUMMARY.md`

If you have an hour, add:
- `market/tam-sam-som.md`
- `market/competitive-landscape.md`
- `financials/use-of-funds.md`
- `financials/projections.md`

If you are a specific audience, jump to the overlay:
- `audience/vc-investors.md`
- `audience/federal-program-officers.md`
- `audience/industry-partners.md`

## Folder structure

```
business-plan/
├── README.md                       (this file)
├── EXECUTIVE_SUMMARY.md            (2-page summary; the always-read doc)
├── thesis/
│   ├── investment-thesis.md        (the core argument)
│   ├── moonshot-math.md            (asymmetric upside calc + comp set)
│   └── why-now.md                  (three converging tailwinds)
├── market/
│   ├── tam-sam-som.md              (sized from federal + industrial sources)
│   ├── customer-segments.md        (academic, lab, industry, federal)
│   └── competitive-landscape.md    (matrix + funding context)
├── partners/
│   ├── industry-partners.md        (semiconductors, aerospace, batteries)
│   ├── academic-partners.md        (MIT, Caltech, MGI labs, NIST)
│   └── partnership-economics.md    (cost / yield / IP framework)
├── financials/
│   ├── use-of-funds.md             ($8M base allocation)
│   ├── revenue-model.md            (open-core + 4 surfaces)
│   ├── unit-economics.md           (LTV/CAC, gross margins, sensitivity)
│   ├── projections.md              (3-scenario summary)
│   └── exit-scenarios.md           (5 outcomes; named acquirers)
├── marketing/
│   ├── positioning.md              (single sentence, brand pillars)
│   ├── messaging.md                (4 pillars + tested message pairs)
│   └── gtm-plan.md                 (24-month sequencing)
├── audience/
│   ├── vc-investors.md             (return profile + valuation defense)
│   ├── federal-program-officers.md (MGI alignment + scientific merit)
│   └── industry-partners.md        (cycle time + cost + sovereignty)
├── data/
│   ├── README.md                   (provenance manifest)
│   ├── federal_funding_programs.csv
│   ├── market_segments.csv
│   ├── competitor_matrix.csv
│   ├── partner_targets.csv
│   ├── unit_economics.csv
│   ├── projections_base.csv
│   ├── projections_bear_bull.csv
│   └── comparable_exits.csv
└── scripts/
    └── validate.py                 (lints CSVs + cross-doc references)
```

## Citation convention

In any narrative document, claims that depend on a specific quantity
should reference the source CSV cell with this syntax:

```
[data:<file_basename>:<id>]
```

For example, `[data:competitor_matrix.csv:vasp]` references the row in
`data/competitor_matrix.csv` with `id=vasp`. The validator
(`scripts/validate.py`) checks every reference resolves.

## Provenance tiers

Every data row carries a `tier`:

- **verified** — Federal budget docs, peer-reviewed papers, public
  agency tables, vendor public price lists.
- **disclosed** — Press releases, SEC filings, audited annual reports.
- **triangulated** — Multiple independent sources cross-checked.
- **directional** — Best-effort founder estimate with stated reasoning.
- **projection** — Forward-looking pro-forma from a stated model.

See `data/README.md` for the full manifest and refresh triggers.

## Updating the plan

If a number changes (a federal budget, a competitor round, a customer
contract, a hiring rate):

1. Edit the CSV cell in `data/`.
2. Update the `tier` if the source changed.
3. Run `python3 scripts/validate.py` to confirm cross-references.
4. Commit with a message that names which cell changed and why.

The narrative should rarely need rewriting; if it does, the
update process is to edit the CSV first and the prose second.

## Linked artifacts in the rest of the repo

This plan is grounded in work that already exists:

- `paper/` — IMMI 2026 paper source (in press).
- `atlas-distill/` — Rust scientific engine; FCC validation and BCC
  Simpson's-paradox detection live.
- `lit-review.md` — full literature foundation.
- `docs/funding_landscape_report.md` — federal funding deep dive used
  to populate `data/federal_funding_programs.csv`.
- `docs/KEY_FINDINGS_SUMMARY.md` — phonon benchmarking findings used
  to populate `data/market_segments.csv` MLIP rows.
- `lupine-site/investors.html`, `deck.html`, `one-pager.html` — current
  investor-facing materials. Numbers should be reconciled to this
  plan before any external use.

## Honesty notes

- The valuation ask ($100-200M post on $5-10M raise) is at the top of
  the seed valuation distribution. We defend it explicitly in
  `thesis/moonshot-math.md`. If the round prices below this, the
  EV math still works; the *shape* of asymmetry holds.
- The deck currently quotes $12B simulation TAM and 300K LAMMPS
  users; both are founder estimates, neither was sourced. We replace
  them in this plan with triangulated builds and conservative
  estimates. The deck numbers are flagged in
  `data/market_segments.csv` rows `sim-tam-deck` and
  `lammps-users-deck` so they can be updated post-review.
- Probabilities in `thesis/moonshot-math.md` are explicitly directional.
  The plan is robust to 50% errors in either direction; that is the
  design point of the asymmetry.
