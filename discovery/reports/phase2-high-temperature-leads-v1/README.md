# Additional high-temperature source leads — documentary audit only

2026-10-16, root. This bounded search ran while the published implementation's
Python CI jobs were in progress. It selects no benchmark, model, threshold,
allocation or evidence adapter and changes none of the frozen scientific results.
No linked worksheet, test series, image, PDF or schema data file was downloaded.

## BAM reference tests and a separately published schema

[BAM's tensile reference record](https://zenodo.org/records/17846617), version
1.0, issued 2025-12-18, documents CMSX-6 testing at 980 °C in an accredited
laboratory, with equipment traceability and a declared uncertainty assessment.
It lists one workbook and three test-series files. This is a promising small
measurement/semantic reference; the listing does not establish independent
campaigns, population sampling, multiple alloys or a discovery benchmark.

The record distinguishes campaign-wide and individual-test worksheets. Its
last information column mixes metadata and selected results; test-series headers
also contain results. Neither a first-row preview nor a supposedly metadata-only
sheet can therefore be treated as target-free. Actual test pairing/lineage and
complete record count remain uninspected. DataCite declares CC BY 4.0 for version
DOI `10.5281/zenodo.17846617`; concept DOI is `10.5281/zenodo.17846616`.

The [separate schema](https://zenodo.org/records/17846436), version 1.0, issued
2025-12-08, describes a hierarchy for manufacturing history, instrumentation,
conditions and test results, plus requirement levels and example answers. It
contains eleven columns and is distributed as CSV/XLSX. DataCite declares CC BY
4.0 for version DOI `10.5281/zenodo.17846436` (concept `17846435`). No schema file
was fetched or field-level conformance tested. A later documentary schema review
could help distinguish mandatory provenance/conditions from measured responses;
it must not turn a requirement profile into empirical completeness.

Our mathematical implication: a stated 95% measurement-uncertainty interval is
not automatically a deterministic enclosure, a model-prediction interval or a
joint guarantee over a selected candidate pool. Instrument traceability also
does not establish IID panels. Those are different premises requiring explicit
contracts. No BAM measurement is used as a true-value oracle here.

## NETL power-plant lead remains access/rights unresolved

[DOI 10.18141/1856486](https://doi.org/10.18141/1856486) identifies a NETL Energy
Data eXchange record concerning long-service power-plant extreme-environment
materials. Direct EDX landing-page access returned 403; this route was not
retried or bypassed. Successful DataCite metadata identifies the 2022 record
and publisher but supplies an empty rights list. That is not a redistribution
license, a public-data-file availability check or a paired-outcome result.
No raw files or outcome tables were acquired. It remains a lead, not ready data.

An OSTI bibliography-page request for a high-temperature qualification-format
report returned 502. Its search excerpt is only a schema lead; the full report
was not read or counted as verified. No contact or access request was sent.

## Exposure, failures and evidence scope

The initial broad search automatically returned an eXtremeMAT presentation
excerpt with numeric compositions, heat labels and aging conditions, plus other
sources' material/condition ranges. The BAM landing page itself exposed reported
maximum uncertainty percentages (1.2, 1.2 and 0.5), observed temperature
variation (-0.4 and 0.5 °C) and the stated 95%/k=2 interpretation. These are
incidental documentary/aggregate exposures, not an untouched blind validation.
No individual strength, elongation, creep response or time series was opened.
None of these numbers selects a Lupine cutoff, fit, eligibility rule or split.

The web provider could not render the two DataCite API URLs. Ordinary public
API GETs then succeeded for all three DOI metadata records, with bounded reads,
HTTP status, timestamps and response hashes preserved in the receipt JSONs.
This follows a provider-format failure, not the denied EDX resource. Provider
search/page responses and raw API metadata remain ignored locally; the compact
report uses original paraphrases and links, not full papers or source archives.
Hashes establish response identity only. Scientific readiness remains unknown.
