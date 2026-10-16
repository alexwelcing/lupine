# MPEA v9 semantic mapping for a prospective metadata stage

Date: 2026-10-10. **Complete column enumeration; scientific schema still unresolved.**

The [frozen G15A tool](mpea-header-disclosure-amendment-v1.md) ran twice after
`c9fb192ed15cf11874c59083b1fae72f7af3224f` passed all four CI jobs. The
[identical first-record receipt](../reports/mpea-header-labels-v1.json) exposes
all 23 exact labels and preserves `BLOCKED_SCHEMA`. No observation record was
decoded. This document supplies a narrow semantic mapping before any separate
row-metadata implementation; it does not change the historical receipt.

The [machine mapping](mpea-column-mapping-v1.json) binds the verified archive
and header receipt. Meanings and units below use Borg et al.,
[Scientific Data 7, 430 (2020)](https://doi.org/10.1038/s41597-020-00768-9),
Data Records (`Sec5`), and the exact header. The paper XML was retrieved again
with identical SHA-256 `ef21ae6085f5444b534ee2ef7137542f63e3b80fc3940219a3960b642f5a1550`;
only direct Data Records prose/list was inspected for this mapping, excluding
table rows. The earlier public-paper exposure remains recorded in the
[source audit](operating-condition-source-audit.md). This is not prospective
blinded evidence.

## Every observed position

Positions are zero-based. Header spelling is preserved literally, including
LaTeX notation. Uninterpreted entries remain withheld; a documented concept
does not establish row completeness, pairing or numerical validity.

| Position | Exact label | Meaning/unit and limit | Prospective metadata treatment |
|---|---|---|---|
| 0 | `IDENTIFIER: Reference ID` | Local identifier syntax and relation to DOI are unverified. | `withhold` |
| 1 | `FORMULA` | Paper describes normalized alphabetized nominal composition; exact-token equality only, without parsing chemistry or proving specimen identity. Unit: atomic percent. | `opaque_formula_equality` |
| 2 | `PROPERTY: Microstructure` | Experimentally observed phases; not an automatically permitted predictive feature. | `withhold` |
| 3 | `PROPERTY: Processing method` | Only exact CAST/POWDER/WROUGHT/ANNEAL/OTHER tokens; compound or unknown descriptions remain unresolved. | `closed_processing_token` |
| 4 | `PROPERTY: BCC/FCC/other` | Header suggests a category; derivation from the microstructure column is not established for this file. | `withhold` |
| 5 | `PROPERTY: grain size ($\mu$m)` | Average grain size; measurement value and validity withheld. Unit: micrometre. | `withhold` |
| 6 | `PROPERTY: Exp. Density (g/cm$^3$)` | Experimentally reported density; keep distinct from ROM estimate. Unit: g/cm^3. | `withhold` |
| 7 | `PROPERTY: Calculated Density (g/cm$^3$)` | Rule-of-mixtures estimate from nominal composition and elemental properties; not experimental truth. Unit: g/cm^3. | `withhold` |
| 8 | `PROPERTY: HV` | Experimentally reported Vickers hardness; no numeric target interpretation in this stage. Unit: HV scale. | `withhold` |
| 9 | `PROPERTY: Type of test` | Only exact T and C codes, meaning tension and compression respectively; their physical meanings remain distinct. | `closed_test_mode` |
| 10 | `PROPERTY: Test temperature ($^\circ$C)` | Declared mechanical-test temperature only; bounded exact decimal or unresolved. It does not establish service temperature or a thermal history. Unit: degree Celsius. | `exact_temperature` |
| 11 | `PROPERTY: YS (MPa)` | Measured yield strength; no inferred offset convention or uncertainty. Unit: MPa. | `withhold` |
| 12 | `PROPERTY: UTS (MPa)` | Tension: ultimate tensile strength. Compression: maximum compression strength. They are distinct endpoints. Unit: MPa. | `withhold` |
| 13 | `PROPERTY: Elongation (%)` | Tension: measured failure elongation. Compression: maximum reported compression strain, not necessarily failure. Unit: percent. | `withhold` |
| 14 | `PROPERTY: Elongation plastic (%)` | Plastic elongation or plastic compression strain; remains distinct from total elongation. Unit: percent. | `withhold` |
| 15 | `PROPERTY: Exp. Young modulus (GPa)` | Experimentally reported Young modulus. Unit: GPa. | `withhold` |
| 16 | `PROPERTY: Calculated Young modulus (GPa)` | Rule-of-mixtures Young modulus for single-phase solid solutions; not experimental truth. Unit: GPa. | `withhold` |
| 17 | `PROPERTY: O content (wppm)` | Measured oxygen content; no feature or target disclosure. Unit: weight parts per million. | `withhold` |
| 18 | `PROPERTY: N content (wppm)` | Measured nitrogen content; no feature or target disclosure. Unit: weight parts per million. | `withhold` |
| 19 | `PROPERTY: C content (wppm)` | Measured carbon content; no feature or target disclosure. Unit: weight parts per million. | `withhold` |
| 20 | `REFERENCE: doi` | Exact declared DOI token grouping only; do not infer normalization, resolution, unique study, independence or specimen matching. | `opaque_source_equality` |
| 21 | `REFERENCE: year` | Bibliographic label alone does not establish publication-year parsing or temporal independence. | `withhold` |
| 22 | `REFERENCE: title` | Free text not interpreted or disclosed. | `withhold` |

## Boundary of the next stage

Only five positions are candidates for metadata use: declared formula 1,
processing 3, test mode 9, test temperature 10 and source DOI 20. Formula and
DOI bytes may supply private exact-equality groups with public opaque ordinal
identifiers. Exact equality is not chemical equivalence, specimen identity or
independent provenance. Missing/unknown identities must not form one shared
unknown group. No raw formula, DOI, title, notes, per-cell hashes or lengths may
be released. Temperature is the only prospective numeric metadata field.

The remaining fields stay opaque, including measured phases, grain size,
interstitials, every performance value, ROM estimate, reference year and local
reference ID. The row stage must not publish target presence, missingness,
ranges, finite-value validity or counts. This is narrower than the original
source-inventory proposal, which contemplated structural cell-presence metadata.

A byte CSV scanner must verify the fixed source and exact header, frame complete
logical records and enforce exact width without text-decoding target cells.
A late framing/resource error must not publish a successful prefix or silently
drop a row. Assign source-bound record ordinals before metadata completeness
checks; keep every structurally accepted record. Missing-token conventions,
closed-category treatment, exact temperature syntax and resource caps must be
frozen with the new producer before the first row scan. Original proposed caps
are not observations about the actual file.

## Scientific gates remain open

Co-recorded quantities are not automatically jointly measured on one specimen.
The paper defines records by composition, property, temperature and reference;
not every property is supplied for every record. Tensile failure elongation and
maximum compression strain cannot share a constraint interpretation. A rule-of-
mixtures density or modulus is not a measured target. Measured microstructure
and interstitial values cannot become free prediction features by default.

Row widths, missing-value syntax, paired usable counts, study identities,
measurement uncertainty and condition comparability remain unknown. A new
scientific protocol must separately freeze target semantics, eligibility,
features, grouping/splits, ranker, budgets, metrics and acceptance gates before
performance targets are decoded. The [evaluation design notes](mpea-evaluation-design-notes.md)
identify a narrower archival-recovery possibility without registering it.
