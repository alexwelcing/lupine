# Phase 2: fresh experimental source reconnaissance

Date: **2026-10-16**. Owner: `phase2_evidence`, independent review agent.
Repository checkpoint reviewed: `df844ef37ad22d6352ca6b1b4a997904b0309785`.
Status: **metadata review only; no source is approved for a new study**.

**Current addendum:** the subsequent [Li metadata audit](li-metadata/README.md)
resolved the DOI version history and official **CC BY 4.0** dataset declaration.
Root reviewed and copied its four actual public API responses unchanged; the
[copy ledger](li-metadata/publication-copy.json) maps the original ignored
handoff to these published files. The initial audit below is preserved as an
earlier checkpoint, including failed retrievals and then-unresolved questions.
The next source is pinned for custody design to v3,
`10.24435/materialscloud:ws-8j`, record `vywsz-wxn79`. No workbook was acquired.
The paper's **1,050 rows/55 columns** conflicts with the catalog's **1,070
records/54 parameters**. Actual layout, endpoint pairing, source overlap and
independent-panel counts remain unknown. Next: review a target-redacted
header/dictionary/reference inspection before any outcome access or protocol.

The [custody design](custody-design/README.md) has now passed root and separate
read-only review as a **next implementation specification**, not an executed
acquisition. It starts with bounded fixed-source capture and ZIP/XML envelope
inspection, withholding worksheet/shared-string contents and returning
`BLOCKED_SCHEMA`. An actual HEAD observed the single archive redirect without
following it or reading its body. Later selected-coordinate metadata disclosure
requires its own reviewed mapping; no workbook layout or study readiness is
inferred from this design. No new user permission is required within the
authorized implementation/research scope.

The next scientific priority is the **Li et al. sub-sized nuclear structural
materials compilation**, beginning with its archival identity, observation
license and documented schema. NIST AM Bench offers a narrower measurement and
adapter reference. NIMS remains blocked under its current acquisition terms.
This review does not change the completed MPEA/JARVIS results, choose a ranker or
threshold, register a protocol, or launch an experiment. A general source-readiness
software framework is deferred until the next data route is chosen.

## Initial audit: three routes

| Route | Verified documentation | Remaining gap and disposition |
|---|---|---|
| Li et al., sub-sized nuclear structural tensile compilation | The [versioned archive landing page](https://archive.materialscloud.org/records/vywsz-wxn79) and [pinned author README](https://github.com/avakanski/Subsized-Specimens-Tensile-Properties/blob/d19b15127c8ae1be49308c29eac718b609ad895c/README.md) describe yield strength, ultimate tensile strength, uniform and total elongation, composition, manufacturing, irradiation and specimen dimensions. They advertise 1,070 records and 54 parameters. | **First metadata follow-up.** The workbook was not opened. Pairing, condition completeness, source identities, overlap and independent-panel counts are unknown. The README links different Materials Cloud DOI suffixes, `ws-8j` and `ws-kw`; no equivalence or preferred version was established. Its MIT license text describes software/documentation, so observation-data licensing and compiled-source provenance still need resolution. |
| NIST AM Bench mechanical measurements | The [official access documentation](https://www.nist.gov/ambench/am-bench-data-management-systems), [direct-link catalog](https://www.nist.gov/ambench/direct-am-bench-data-links-and-referencing-guidance) and [mds2-2760 metadata](https://catalog.data.gov/dataset/am-bench-2022-astm-e8-macroscale-tension-at-different-strain-rates-on-as-built-in625) provide a concrete public route. This archive describes five room-temperature, as-built IN625 specimens across two strain rates, with separate time/engineering-strain/stress files. | **Small engineering/reference route.** No curves or summary PDF were opened. Endpoint derivation, uncertainty, usable paired outcomes and source overlap remain unverified. Five specimens across two conditions are not evidence of enough independent calibration/evaluation panels. This corrects the earlier failed guessed-URL reconnaissance without claiming those failures showed data were absent. |
| NIMS Creep Data Sheets | The [current official service](https://cds.nims.go.jp/en/) describes a primary, standards-based creep/rupture program directly relevant to heat-resistant materials. | **Blocked acquisition route.** DICE account, email-domain and service registration are required. The page prohibits scraping and bulk acquisition by manual or mechanical methods. No cleared observation redistribution route, login, application or sheet access was established. |

These counts are publisher descriptions, not locally audited record counts or
independent statistical units. A separate agent's review is not a fresh
statistical sample. A new repository or archive mirror does not make an existing
experimental study independent of exposed development data.

## Concrete schema and licensing findings

At AM Bench commit `77adb06c6de95b9b97e1dd26d46561f29db927af`, the
[measurement schema](https://github.com/usnistgov/ambench/blob/77adb06c6de95b9b97e1dd26d46561f29db927af/AMBench2022/MetadataModel/Model/XSD/AMMeasurement.xsd)
makes specimen ID/PID, specimen condition and the mechanical measurement's
specimen/results elements optional (`minOccurs="0"`). The
[build schema](https://github.com/usnistgov/ambench/blob/77adb06c6de95b9b97e1dd26d46561f29db927af/AMBench2022/MetadataModel/Model/XSD/AMBuild.xsd)
also permits absent specimen-parent identity. Valid upstream XML therefore does
not establish paired endpoints, known experimental conditions or independent
source groups. Documentation of available fields is not evidence that every
record supplies them.

The mds2-2760 catalog explicitly declares public access and points to the
[NIST license](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications).
That page distinguishes non-SRD, Standard Reference Data and extramural works;
preserve the applicable dataset attribution, disclaimer and modification notice.
The Li repository's [MIT text](https://github.com/avakanski/Subsized-Specimens-Tensile-Properties/blob/d19b15127c8ae1be49308c29eac718b609ad895c/License%20-%20MIT.txt)
does not by itself resolve a separate Materials Cloud observation license.
Government funding, an open paper or a public repository is not a substitute for
the relevant data terms.

## Initial next action (identity/license resolved in addendum)

Perform a bounded **Li metadata identity/license/schema audit** before observation
acquisition: resolve the two DOI references and select one immutable archive;
establish the observation license; locate a target-free field dictionary for
source citation, specimen/test identity, paired endpoints, units, loading mode,
temperature, strain rate, irradiation, processing and geometry. Record missing or
ambiguous fields explicitly. If public schema documentation is insufficient,
prepare a separately reviewed target-redacted custody procedure before opening
the workbook; do not casually inspect its first rows or run the example notebook.

Only after those checks should a prospective protocol settle source/study overlap,
condition-matched eligibility, missing/censored outcomes, independent sampling
units, calibration requirements and equal-budget utility comparisons. Freeze the
protocol before evaluation access. Retain the existing negatives and avoid
retuning any exposed MPEA/JARVIS population. No new DFT is needed. This note sets
no numerical acceptance criteria and makes no superiority or plant-suitability
claim.

## Initial exposure and access record

- Read public catalog descriptions, author README/license files, repository
  metadata, and AM Bench XML schemas. Source counts, specimen dimensions,
  room-temperature/as-built labels and strain-rate conditions were visible.
- Did not open the Li workbook/example notebook, NIST observation CSVs/summary
  PDF, or NIMS sheets; no new observation-level performance values, splits,
  private custody files or targets were inspected. Existing Lupine audit documents
  contain previously recorded historical result exposures; this is not a claim
  that all prior context was blinded.
- Broad metadata searches returned unrelated catalog/paper descriptions. They
  were not used to set targets, thresholds, model choices or acceptance rules.
- Web-tool reads of the NIST README, Materials Cloud API/file-description and
  DataCite DOI metadata failed. These failures are recorded in
  [source-bindings.json](source-bindings.json); no successful response or inferred
  dataset content is claimed for them.
- No full external HTTP response bodies were retained. Git blob IDs below were
  returned by GitHub, not invented SHA-256 response hashes. This report records
  documentary evidence, not a release/CI/test or acquisition receipt.

The [source bindings](source-bindings.json) identify the reviewed repository
documents, external sources, actual access failures and unperformed actions.
