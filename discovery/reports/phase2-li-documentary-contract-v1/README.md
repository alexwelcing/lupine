# Li v3 dictionary/reference disclosure proposal

2026-10-16 · owner `phase2_evidence` · **UNBOUND_DOCUMENTARY_PROPOSAL; not executable**.

The retained paper schema describes a `Column Descriptions` sheet and a `References` sheet, but supplies no worksheet relationship IDs, cell coordinates, merged-cell ranges, header row or documentary-region boundary. Those bindings are **unbound**. The earlier production envelope stopped before XML decoding. No sheet ordinal, A1 range or assumed 54/55-column rectangle is justified. This proposal cannot authorize an actual reader until a source-specific layout binding has been independently reviewed and frozen. No workbook/private capture was read and no network request was made for this proposal.

Source identity remains the captured Materials Cloud v3 `vywsz-wxn79`, DOI `10.24435/materialscloud:ws-8j`, declared CC BY 4.0, observed whole-object SHA-256 `9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa`. The source must not be replaced to resolve a parser or documentary inconsistency.

## Proposed semantic allowlist

These are documentary meanings to bind, not claims that the corresponding source columns exist or contain complete observations. Export selected normalized labels/units and short reviewed definitions only; preserve the source's distinction between an asserted meaning and an unknown meaning.

| Documentary role | Allowed meaning/units from retained evidence | Specifically withheld or unresolved |
|---|---|---|
| Reference | Meaning of the source-reference key and its join to the reference sheet; whether a reference identifies a paper, table or test. | In this narrow dictionary pass, citation tokens stay in machine custody: no public DOI lists, titles, abstracts, URLs or token hashes and no online citation resolution. Exact key/join coordinates are unbound. A later provenance roster has a separate disclosure scope. |
| Material and composition | Material-type and composition field definitions; documented composition basis **weight percentage**. | Material-row identities, element concentrations and inferred atomic/weight conversions are outside this dictionary pass. |
| Manufacturing, treatment, irradiation and preparation | Definitions of processing/treatment/preparation fields and irradiation-condition roles; documented temperature **degrees Celsius**, time **hours**, grain size **micrometres** where their actual field scope is verified. | No treatment/irradiation values or assumptions that absence means untreated/unirradiated. Radiation-dose unit, condition inheritance and missing codes remain unbound rather than borrowed from another archive. |
| Geometry and tensile conditions | Definitions for specimen dimensions (**millimetres**), test temperature (**degrees Celsius**) and strain rate (**inverse seconds**). | No specimen dimensions, temperatures, rates or eligibility thresholds. Orientation, geometry conventions and field-to-test scope require documentary support. |
| Tensile endpoint definitions | Yield strength and ultimate tensile strength (**MPa**); uniform and total elongation (**percent**), kept distinct. | No measurements, statistics, ranges, example outcome values or cached formulas. Yield convention, engineering/true convention and reported-versus-derived semantics remain unknown unless explicitly documented. |
| Record, missingness and provenance | Documentary definition of a row/test; missing/not-applicable/censored-code meanings; any explicit statement about source selection, aggregation, revisions or outlier handling. | Paper's “single tensile test” is a claim, not verified pairing. Actual missingness masks, numerical validity, specimen/heat lineage and eligibility are later tasks. |

The official archive description says the compilers performed statistical analyses to identify and address outliers. This is a documentary curation claim, not evidence of what was removed, changed or retained. Any later study must preserve that provenance uncertainty; do not assume the compilation contains every original experiment or that its rows were sampled independently.

## Smallest disclosure boundary

Freeze one mapping containing source object/capture identity, exact worksheet relationship, selected documentary coordinates, permitted cell types, role and output-field bindings. Its present values are null in `proposal.json`. Known sheet names are discovery leads, not authentication. A later machine custodian may privately decode the bounded shared-string table if necessary, with explicit started/completed exposure records; the researcher receives only the reviewed projection. Do not execute formulas or follow links.

A selected region containing a header plus a definition is documentary only after its roles are verified. A field that mixes a definition with an observed result, example target, summary statistic or formula cache must produce `BLOCKED_MIXED_ROLE` for that disclosure; do not heuristically delete numbers or release the remainder. Ambiguous merges, rich text or reference cells that span unbound roles produce `BLOCKED_COORDINATES`. Unsupported meanings produce `UNRESOLVED_SEMANTICS`, not an inferred alias. These are proposed statuses, not an implemented parser or observed workbook findings. Short scientific definitions are permitted after review; documentary text need not be epistemically empty. Actual incidental exposure must be recorded.

Public output needs only: bound/unbound role status; selected semantic field, unit and definition provenance; explicit unresolved semantics; whether reference keys have a documented unique join; and count-reconciliation status. Citation identities and per-row lineage are withheld from this dictionary projection. A later source-provenance roster must support auditable scientific citations, source/test lineage and overlap evidence under its own frozen disclosure scope; this proposal does not prohibit public scientific citations. Neither exact lexical reference equality nor a reviewer agreement establishes statistical independence.

## Resolve the two count claims without outcomes

Keep two separate documentary claims: paper **1050 records / 55 columns**, archive **1070 records / 54 parameters**. Do not use either as a parser width, expected success count or truncation rule.

1. Dictionary/header mapping can establish what “column” and “parameter” mean, whether an index/reference/derived field is included, and which version each documentary statement identifies. It cannot establish the actual row denominator from prose alone.
2. A later separately frozen structural pass must frame all original record rows using the validated header/row-identity/reference roles; distinguish header, blank, note and summary rows without inspecting target values. Report physical framed rows and declared field categories separately, retaining unresolved rows. Worksheet dimension/max-row attributes alone are insufficient evidence.
3. If duplicate-record comparison is needed, its identity fields and equality rule require a metadata-roster amendment; do not compare endpoints or silently deduplicate. Structural counts are not complete-pair, eligible-record or independent-panel counts.
4. Declare the discrepancy resolved only with a documented mapping/version explanation supported by these outputs. Mere numerical agreement with either claim, or the arithmetic difference between them, is not an explanation. Otherwise preserve `UNRESOLVED_COUNT_DISCREPANCY`.

The immediate dependency is the separate published header-only diagnostic and, if justified, a reviewed structural-profile/layout amendment. This proposal neither relaxes the frozen envelope profile nor invents coordinates to bypass its block. It chooses no outcome threshold, model, allocation, split or new scientific claim.

## Provenance amendment after independent review

The original seven documentary bindings did not themselves support the observed object SHA-256 or the actual envelope failure stated above. `source-bindings.original.json` preserves that original record unchanged. The amended binding adds the three tracked public receipts at `reports/phase2-publication-custody-v1/custody/`: `capture-1.json` records verified capture and the object digest; `envelope-1.json` and `envelope-2.json` record the identical schema/layout block before decompression or XML decoding. Only these public receipts were read for the amendment; no new workbook, private capture or network access occurred.
