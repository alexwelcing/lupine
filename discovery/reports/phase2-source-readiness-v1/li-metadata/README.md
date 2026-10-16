# Li source metadata follow-up

2026-10-16; owner `phase2_evidence`. Ignored candidate for root review. The earlier tracked source-readiness report was held unchanged.

**Archive identity and the declared observation-data license are now resolved.** The next step can be a reviewed target-redacted custody design for version 3. A paired-data benchmark is still not ready to run.

The [official Materials Cloud record API](https://archive.materialscloud.org/api/records/vywsz-wxn79) and its [version list](https://archive.materialscloud.org/api/records/vywsz-wxn79/versions) establish:

| Version | DOI | Date | Publisher workbook size / MD5 |
|---|---|---|---|
| v1 | `10.24435/materialscloud:ws-kw` | 2024-06-25 | 183076 bytes / `9153a80e8dc920b4eaee4de1b2534036` |
| v2 | `10.24435/materialscloud:yf-3j` | 2024-10-10 | 183878 bytes / `041bbe095c54615e5a3c289facb18ce5` |
| v3 | `10.24435/materialscloud:ws-8j` | 2024-12-20 | 183878 bytes / `041bbe095c54615e5a3c289facb18ce5` |

The two suffixes in the author README refer to different versions of the same concept DOI, `10.24435/materialscloud:e1-tk`; they are not interchangeable identifiers. Recommend the explicit v3 record `vywsz-wxn79` for custody design because it is the latest published version identified in the official metadata, without looking at outcomes. The equal supplied v2/v3 size/MD5 is not a locally verified byte-equality result. GitHub workbook equivalence remains unknown.

Both Materials Cloud and the [DataCite v3 record](https://api.datacite.org/dois/10.24435/materialscloud:ws-8j) declare **CC BY 4.0** for this dataset. The archive marks files public with no active embargo. This resolves the earlier software-license ambiguity from the repository MIT file. Preserve authors, DOI/version, license and transformation notices; do not claim original experiments are fresh merely because their archive is newly acquired. The workbook remains untouched, so its SHA-256 and actual content are unknown.

The [paper's Data Records section](https://www.nature.com/articles/s41597-024-04329-2), returned through narrow schema search queries, describes one tensile test per row, a source-reference field, a `References` sheet and a `Column Descriptions` sheet. It documents composition, treatment, irradiation, preparation, dimensions and test conditions alongside strength and elongation endpoints; units and missing treatment/irradiation metadata are described. However, it says **1,050 records/55 columns**, while archive/README metadata say **1,070 records/54 parameters**. This discrepancy is unresolved. Neither description proves actual paired completeness, specimen/heat identities, independent panels, or overlap exclusion. The actual header/dictionary needs controlled inspection before a protocol assumes exact layout or counts.

Next: root-review the pinned version and metadata evidence, then prepare a target-redacted custody procedure that checks the workbook's sheet/header/dictionary/reference structure without exposing target cells. Verify physical test pairing, source/duplicate grouping, endpoint and censoring semantics, uncertainty and condition matching before choosing a statistical population. Do not select thresholds, allocations or rankers from exposed results. No new study, framework, or scientific claim follows from this metadata pass.

Four successful metadata API responses were retained with actual byte counts and SHA-256 receipts in this ignored directory. They used the inherited proxy and CA settings under the executor's supported HTTP policy. Earlier web-tool failures remain recorded; these later normal HTTPS requests did not bypass an access denial.

Exposure limits: no workbook, CSV, curve, NIMS sheet or notebook was opened. A guessed paper Table 1 URL exposed published geometry-ratio critical values and endpoint labels, not specimen outcomes; these were not used for any eligibility or acceptance rule. A Table 2 request failed at the web tool's unsafe identity-cookie redirect and was not retried. Search results also exposed qualitative scientific descriptions and unrelated numerical snippets; this is not a claim that all published statements remain unseen. Full paper/PDF bodies and model metrics were not deliberately retrieved. Exact exposure and failure details are in `source-bindings.json`.
