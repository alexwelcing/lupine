# BAM high-temperature paired-endpoint readiness — metadata only

2026-10-16. **There is a concrete documentary basis for a paired-test schema audit, but no admitted scientific evaluation data yet.** The publisher describes individual-test worksheets and uncertainty assessments for three endpoints “for each test.” That establishes intended association, not actual complete pairs, independent panels or a usable discovery benchmark. No measurement file or schema body was opened.

## Source identity and access

[D1: BAM data v1.0](https://doi.org/10.5281/zenodo.17846617), issued 2025-12-18, is distinct from its concept DOI `10.5281/zenodo.17846616`. [S1: schema v1.0](https://doi.org/10.5281/zenodo.17846436), issued 2025-12-08, has concept DOI `10.5281/zenodo.17846435`. Retained DataCite metadata and new ordinary Zenodo record JSON agree on these identities and declare CC BY 4.0. This is the records' declared license; no linked body, embedded notice or third-party exception was inspected. Publisher metadata hashes identify the fetched responses, not their empirical correctness.

Two new metadata-only GETs returned HTTP 200 without retries or file-content requests. Exact responses, timestamps and hashes are retained in `zenodo-*-receipt.json` and bound in [source-bindings.json](source-bindings.json). The current listings identify ten data-record artifacts and three schema-record artifacts. Those are file counts, not tests, independent units or eligible panels.

| Prospective file | Publisher metadata identity; body not acquired |
| --- | --- |
| Data workbook `2025-12_HT-Tensile-reference-data-CMSX-6_v1.0.xlsx` | record 17846617; 54,960 bytes; MD5 `e85ef58139a68592f36452de195a0a10` |
| Schema CSV `2025-12_Data-Schema-Tensile-HT_v1.0.csv` | record 17846436; 41,000 bytes; MD5 `330a8405f6cb9c4fcfe221baea7ced27` |
| Schema XLSX `2025-12_Data-Schema-Tensile-HT_v1.0.xlsx` | record 17846436; 33,427 bytes; MD5 `be4cdcde938753c448e1bec239480c82` |

The file IDs and exact advertised content URLs are retained in the source bindings for a future scope decision. No content SHA-256 is claimed.

## What is established and what remains blocked

| Question | Documentary evidence | Required next evidence / present decision |
| --- | --- | --- |
| Same-test endpoints | D1 describes worksheets named by individual test ID, individual-test-piece results, and uncertainty assessment for tensile strength `Rm`, proof strength `Rp0.2`, and reduction of area `Z` for each test. | Intended same-test association only. Actual identity joins, complete endpoint pairs and duplicate/replicate handling remain uninspected. Paired record count is unknown. |
| Units and operational meaning | D1 uncertainty-table headings identify MPa for `Rm` and `Rp0.2`, percent for `Z`; it cites elevated-temperature tensile standard DIN EN ISO 6892-2:2018-09. | No full unit dictionary, conversion rules, strain conventions or operational proof-strength definition was read. A symbol or standard citation is not a checked adapter. |
| Conditions | D1 documents CMSX-6 at specified 980 °C; S1 describes temperature measurement, specified temperature, soaking time, manufacturing history, instruments and test results. | Strain-rate regime, orientation, geometry, heat/batch lineage, actual mandatory fields and per-test condition joins remain unbound. Standard names do not fill missing fields. |
| Measurement unit and grouping | D1 distinguishes campaign-wide `Common-to-all` content from individual-test-piece sheets. | The intended measurement unit is a test piece/test ID. Shared stock, heat, treatment, campaign, apparatus and historical reuse must be traced before defining evaluation units. Three listed LIS files do not prove three independent units. |
| Schema roles / missingness | S1 advertises hierarchical categories, entry, symbol, datatype, examples/options, requirements and comments; D1 claims the mandatory profile is met. | Field-level conformance, empty/censored/invalid values, applicability and empirical completeness are uninspected. The requirement profile is documentary intent, not a completeness check. |
| Dictionary completeness | S1 says eleven columns; the explicitly named roles account for ten (four category levels plus six named fields). Units are mentioned elsewhere in the prose. | The eleventh role is unbound. Do not invent a `Units` column or coordinates. Actual schema headers require a separately reviewed acquisition/projection. |
| Source independence and freshness | D1 identifies a reference campaign and one nominal alloy/temperature; the records have fixed version DOIs. | Full source lineage, citations, recycled measurements, sample/heat links and overlap with exposed MPEA/JARVIS or Li remain unknown. Date, title and alloy labels do not prove fresh independent panels. |
| Uncertainty interpretation | D1 reports expanded measurement uncertainty and accredited, traceable procedures. | These are publisher statements, not independently verified laboratory audits. Expanded uncertainty is not a deterministic hard enclosure, a prediction interval or a joint selected-pool guarantee; it supplies no IID/exchangeability premise. |

D1 is a plausible **small metrology/semantic reference route** after these checks. Its present description does not establish candidate diversity, a population sampling frame or enough independent panels for an equal-budget discovery comparison. No model, threshold, split, eligibility rule or allocation is selected here.

## Why content acquisition stopped

[pre-fetch-scope.json](pre-fetch-scope.json) was recorded before the two new record-metadata requests. S1 explicitly combines result-field descriptions with exemplary answers/options and free comments. Whether those examples are invented or empirical is unknown. Therefore even the separate schema CSV/XLSX is not admitted as target-free content. D1's `Common-to-all` sheet contains selected results; its `Information` column and LIS headers also mix metadata with test results. A first-row or header preview would not avoid that scope problem.

The smallest next increment is a separately frozen disclosure contract for the exact 41,000-byte schema CSV, followed by synthetic adversarial checks and independent source review **before any actual file request**. It should define opaque acquisition identity and truthful whole-file machine exposure; bound any parser; withhold examples/options, arbitrary literals and free comments; and expose only reviewed dictionary roles, unit/condition/provenance categories and requirement meanings. Unknown header roles, mixed meaning, unknown layout or unsupported encoding must leave the dictionary unbound rather than echoing unknown cells. No actual schema reader was implemented or run in this audit.

That projection would answer only whether an adapter can be specified. A later, separately scoped source-provenance audit would still need auditable public citations, specimen/heat/batch/campaign relationships, paired endpoint/condition linkage and missingness, with measurement values sealed. Withholding arbitrary strings in the narrow dictionary projection must not become a blanket ban on necessary scientific citations. A source with unresolved joins or grouping remains blocked for evaluation even if its schema parser succeeds.

## Exposure and failure record

This audit re-read public prose that already contains the specified temperature, maximum endpoint uncertainty percentages, temperature deviations and the stated confidence/coverage-factor interpretation. The original exact aggregate exposures are preserved in [the earlier lead report](../../reports/phase2-high-temperature-leads-v1/README.md). New record metadata added file names, IDs, sizes and checksums. This is a metadata-limited audit with incidental aggregate numerical exposure, not an untouched blind validation. No individual endpoint value, series, curve, measurement workbook, LIS body, image, PDF, schema body, notebook or model output was fetched.

The earlier NETL landing-page 403, OSTI page 502 and DataCite web-renderer failures remain recorded in that earlier report; none was retried or bypassed here. Both current Zenodo record GETs succeeded. No statistical independence follows from having an independent reviewer. No scientific, software-test, package or CI pass is claimed by this source-readiness audit.
