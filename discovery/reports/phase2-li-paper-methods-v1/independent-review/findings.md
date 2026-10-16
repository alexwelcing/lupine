# Independent documentary review of the Li article summary

Reviewed README SHA-256:
`b168331d3198c97b6cdf45d67b505b4ddf88acf60ab6b556e4b35798b5a3eb10`.
Article XML SHA-256:
`c7e527712991ce14fb233b57a7e1f5f2dc26e6728835df03510cd6c588146534`.

**No blocking scientific-documentary wording issue was found in this version.**
The summary distinguishes paper-level documentation from actual archive
validation and does not promote a scientific claim. The article is Li and
coauthors, *Dataset of tensile properties for sub-sized specimens of nuclear
structural materials*, Scientific Data (2025), DOI
[10.1038/s41597-024-04329-2](https://doi.org/10.1038/s41597-024-04329-2),
PMCID PMC11724850, PMID 39799135. The earlier one-result metadata response and
the article acquisition receipt match their retained response bytes.

| Finding | Source and review conclusion |
| --- | --- |
| Test-level documentary rows | `Sec11` describes a row as one retrieved tensile test and identifies an article-reference category. This establishes the authors' intended documentary unit, not actual worksheet framing, unique specimens or independent observations. The README preserves that distinction. |
| Endpoints and units | `Sec9` and `Sec11` support MPa for yield/ultimate tensile strength and percent for uniform/total elongation. `Sec6` uses different elongation wording; the summary correctly leaves that ambiguity unresolved. Celsius, inverse seconds, weight percent and length dimensions in millimeters are supported. The initial broad dimension wording was narrowed so aspect ratios do not inherit millimeters. |
| Acquisition and derived fields | `Sec6` describes manual table extraction and manual graph digitization with expert review. `Sec7` describes unit conversions, strain-rate derivation from speed/length and replacement of balance-element notation by composition closure. These are transformation/measurement provenance facts, not verified row-level accuracy or uncertainty bounds. |
| Missingness | `Sec11` explicitly describes unavailable manufacturing/treatment and irradiation metadata, including microstructure and grain-size examples. Neither completeness nor comparability is established for the captured archive. |
| Curation | `Sec12` mentions statistical and visual outlier work but does not supply an executable rule or a row-by-row change log in the reviewed prose. The retained geometric exceptions do not reveal what happened to other outliers. The README does not infer that nothing was removed, corrected or otherwise changed. |
| Article count discrepancy | An independent computation of `Tab2` confirms 24 displayed data rows and a sum of 1,038 displayed record counts. `Sec6` separately states 1,050. Neither is an independent recount of the archived workbook, and neither is selected as correct. |
| Secondary provenance | `Tab2` has distinct Data Source and Dataset columns. The selected Gussev/Byun and Igata/Kestenbach relationships and the Mishra citation range are present. The table gives reasons to investigate source reuse; it does not identify the number of repeated measurements or an independence partition. |
| Citation counting | There are 27 distinct literal bibliography IDs linked from table cells. This includes both columns and only the endpoints of a bibliography range. The range was not expanded. Twenty-seven is not a count of studies, datasets or independent units. |
| Material scope | `Tab2` includes material labels outside the narrower groups in `Sec6`, including aluminum, titanium and other steels. This is another unresolved documentary scope issue, not a newly adopted eligibility rule. |
| Code availability | `notes2` provides a sample notebook link for loading/analysis. It does not establish a particular executed notebook version as the source of every curation step. No notebook or linked asset was opened in this review. |

The archive's previously reported 1,070 records, 54 parameters and CC BY 4.0
terms were not independently rechecked in this narrowly scoped article review.
They need their existing catalog/author-README/custody citations when the report
is published. The article side—1,050 prose records, 1,038 table sum and 55
columns—is verified here. Also, “55 columns” and “54 parameters” need not count
the same objects; their discrepancy is unresolved, not evidence of a specific
missing column or version migration.

The article license text declares CC BY-NC-ND 4.0. The README keeps that separate
from archive and software terms and proposes original factual paraphrases,
attribution and receipts rather than an article/table/figure or adapted full-text
republication. This review confirms the declared source label and the proposed
documentary scope; it does not transfer a license between objects or give a
general legal clearance for downstream uses.

The full public XML was machine parsed, including content outside the selected
prose, so neither this review nor the source is represented as prospectively
blinded. Human-facing review selected `Sec6`–`Sec12`, `notes2`, the license,
and `Tab2`'s aggregate counts, material labels and citation linkage. No other
endpoint table or figure data was selected, and no actual workbook performance
cell, private custody file, notebook or external cited article was read. No
network request occurred in this review. All 12 bound local inputs remained
unchanged during the recorded source/arithmetic check.

The retained `audit.py` and execution receipt reproduce byte bindings and the
aggregate arithmetic. They do not rerun a model or establish archival numerical
validity. The review bundle contains no raw article, full-text projection or
full table reproduction. Scientific NO-GO results and the need to reconcile
version/layout, reference lineage, transformations, missingness and overlap
remain unchanged.
