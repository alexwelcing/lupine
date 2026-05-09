# Source Data Manifest

This directory is the **single source of truth** for every figure cited in
the business plan. Narrative documents in `../thesis/`, `../market/`,
`../partners/`, `../financials/`, `../marketing/`, and `../audience/` MUST
reference cells here rather than hard-coding numbers.

## Provenance tiers

Every cell carries a `tier` column. Definitions are strict — do not promote
between tiers without changing the citation.

| Tier | Meaning | Acceptable use |
|------|---------|----------------|
| `verified` | Federal budget docs, peer-reviewed papers, public agency tables, vendor public price lists | Anywhere, including federal proposals and investor decks |
| `disclosed` | Company press releases, SEC filings, audited annual reports | Anywhere, but date-stamp the disclosure |
| `triangulated` | Two or more independent published sources cross-checked, or a published source plus first-principles derivation | Investor decks, internal planning. Flag in footnotes for federal proposals |
| `directional` | Best-effort founder estimate informed by domain knowledge, with stated reasoning | Internal planning and investor narrative only. Never quote in proposals |
| `projection` | Forward-looking pro-forma from a stated model | Always pair with the assumption set and bear/base/bull bounds |

## Files

| File | Tiers used | Refresh trigger |
|------|------------|-----------------|
| `federal_funding_programs.csv` | verified | Annual federal budget release; new FOA or solicitation |
| `market_segments.csv` | triangulated, directional | Quarterly or when a major source releases an updated report |
| `competitor_matrix.csv` | verified, disclosed, triangulated | Vendor pricing changes, new competitive product launches |
| `partner_targets.csv` | verified, directional | New introductions, partner contracting milestones |
| `unit_economics.csv` | triangulated, directional | Pilot close, public-cloud price changes, hiring plan changes |
| `projections_base.csv` | projection | Quarterly board pack, every raise, every hiring plan revision |
| `projections_bear_bull.csv` | projection | Same cadence as base case |
| `comparable_exits.csv` | disclosed, triangulated | New comparable exit, new round disclosure |

## Citation conventions

- `source_url` should resolve to a stable URL. If only a PDF exists, store
  the title and the year so a reader can re-find it.
- `source_doc` references files inside this repo when the data was
  re-extracted from existing research notes (e.g.
  `docs/funding_landscape_report.md`). Treat those as `triangulated`
  unless they themselves cite a `verified` agency source.
- `notes` is for the assumption story — under what conditions the cell
  remains valid.

## Verification command

```bash
python3 business-plan/scripts/validate.py
```

The validator checks: every CSV parses, every `tier` is in the allowed
set, every narrative `[data:...]` reference resolves, and bear < base <
bull in projections.
