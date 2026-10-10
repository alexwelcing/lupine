# MPEA v9 schema evidence and a bounded resolution path

Date: **2026-10-10**. Status: **metadata research; no schema amendment enacted**.
The reviewed external evidence does **not establish the complete, ordered CSV
header** of Figshare v9. The subsequently verified companion metadata JSON also
does not resolve it: that file contains article-level concepts and links to
**Figshare v7**, not v9. The reviewed evidence supports eight exact label strings
and descriptive property semantics. Neither a paper table nor a label used in later repository
code proves that it occurs at a particular position in the archived CSV.

The defensible next step is a separately reviewed and committed **first-record
label-disclosure amendment**, if the initial redacted header receipt cannot
resolve the schema. That would establish observed header spelling and order
without decoding observation rows. It would still leave semantic mappings and
any subsequent row-metadata stage subject to a separate committed specification.
The current custodian, inventory, parser profile and scientific protocols are
unchanged by this note.

## Evidence actually inspected

This pass re-retrieved the metadata and documentation below. Byte counts and
SHA-256 values identify those responses, not the scientific truth of their
contents. The six previously inventoried responses exactly match their earlier
hashes. GitHub paths are pinned to commit
`d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e`.

| Source | Inspection and what it establishes | Complete v9 header? |
|---|---|---|
| [Figshare article 12642953, version 9 catalog](https://api.figshare.com/v2/articles/12642953/versions/9) | Fixed CSV identity, license and high-level list of composition, processing, microstructure and mechanical properties. No ordered column schema. | No |
| [Borg et al. paper XML, PMC7722748](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7722748/fullTextXML) | This pass extracted table captions and `thead/th` labels only. Table 1 explicitly illustrates a **subset** of fields; Table 2 is a statistics table. Previously reviewed prose supports meanings and units recorded in the source inventory. | No |
| [Pinned README](https://github.com/CitrineInformatics/MPEA_dataset/blob/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/README.md) | Identifies the master CSV and the processing notebook that produces it; links Figshare and Citrination. Does not enumerate a complete ordered schema. | No |
| [Pinned complete repository tree](https://api.github.com/repos/CitrineInformatics/MPEA_dataset/git/trees/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e?recursive=1) | Response has `truncated=false`. Inspected paths only. No separately named schema/data-dictionary file was identified; paths mainly point to data, notebooks, figures, helpers and tests. This is not proof that no schema information exists inside excluded files. | No |
| [Pinned utils.py](https://github.com/CitrineInformatics/MPEA_dataset/blob/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/utils.py) and [tests/test_process.py](https://github.com/CitrineInformatics/MPEA_dataset/blob/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/tests/test_process.py) | Parsed source as AST; selected field-label string literals and function names. Three `PROPERTY:` strings are present. No upstream code was imported or run. | No |
| [Companion metadata-record catalog, article 12804137/v1](https://api.figshare.com/v2/articles/12804137/versions/1) | Version-pinned catalog confirms DOI `10.6084/m9.figshare.12804137.v1`, CC0 and the exact metadata JSON object subsequently verified below. An earlier unversioned catalog response also reported v1 and is retained in the response identities. | No |
| [Companion metadata JSON, file 25713488](https://ndownloader.figshare.com/files/25713488) | Verified complete bytes against the v1 catalog before JSON parsing. Article-level assay/factor concepts and ontology terms; no CSV-column mapping. Its repository reference explicitly names `12642953.v7`. | No |

The companion catalog lists `data.json` (file 25713488, 7,171 bytes, declared MD5
`eac470cba17004aeb22d7e77b1f27543`) and `metadata summary.csv` (file 25713491,
334 bytes, declared MD5 `491f2523a98e85e5c93d602ea7d2e6f0`). Only the JSON was
subsequently requested, after its exact identity was explicitly authorized for
metadata research. Its captured length and MD5 matched the catalog before
decoding. The metadata-summary CSV remains unopened. Neither file is the
experimental dataset.

The JSON's `identifier` is the article DOI `10.1038/s41597-020-00768-9`.
Its sole `repositories` entry is
`https://doi.org/10.6084/m9.figshare.12642953.v7`. That is affirmative evidence of
an earlier archive reference, not a version-independent schema promise.
The `assays` array contains 11 descriptive concepts: alloy, oxygen content,
carbon content, nitrogen content, yield strength, elongation, ultimate strength,
hardness, density, grain size and observed phases. The `factors` array contains
alloy processing method, test temperature, test type and alloy composition.
Both arrays use `variableMeasured`/`PropertyValue` annotations. Their ordering is
JSON metadata order; no field says it is CSV-column order. There are no exact
archived column tokens, column indices, CSV-width declaration, unit-to-column
mapping, parsing dialect or missing-value conventions. Density is not split
into experimental and ROM fields here. Test mode is described generally, without
a column-specific tension/compression interpretation. The file corroborates
high-level semantics, but cannot supply the missing ordered v9 schema.

### Response identities

| Response | Bytes | SHA-256 |
|---|---:|---|
| Figshare v9 catalog | 4,714 | `ffe30394f616e654b0f09f237270f633687120d727812458cf9579f2bbadbf42` |
| Paper XML | 63,254 | `ef21ae6085f5444b534ee2ef7137542f63e3b80fc3940219a3960b642f5a1550` |
| Pinned README | 2,368 | `3fa8ac5a373381ad0ccae9d7e741d583103fab50793e0dd44de1b1571da3ed9a` |
| Pinned repository tree | 21,213 | `df27581f47b624cb4628f18b5321c52902c64e40a7a24870002667ceb504b963` |
| Pinned utils.py | 5,330 | `0912f6672a9cf2706e181acfbd589dd6383937641cbe917a3d6a3fcf2669c560` |
| Pinned tests/test_process.py | 2,094 | `9e7a9adac0dbcb361d44c2932beb10f3372599f95577320ece79c1e301862f49` |
| Companion metadata-record catalog, reporting v1 | 4,557 | `7dc7ce1d86ee1e6fe07826af12fa44dcf6646070d0d16e4caa3b40c2d0551478` |
| Companion metadata-record catalog, version-pinned v1 | 4,559 | `710c4c825d18c07a992d527941c5dcb80f2baf1535fd90d415cbed4d6e90ea37` |
| Companion `data.json`, file 25713488 | 7,171 | `f55b22622f6f13f129113e3c3d9a169f2d3734821df5e2e56fab07951f73f457` |

## Exact labels versus semantics

The present evidence supports these exact strings:

| Exact string | Evidence | Limit |
|---|---|---|
| `DOI` | Paper Table 1 header | A displayed subset table, not an observed CSV header |
| `FORMULA` | Paper Table 1 header | Same limitation |
| `YS (MPa)` | Paper Table 1 header | Same limitation |
| `UTS (MPa)` | Paper Table 1 header | Same limitation; loading mode changes the physical interpretation |
| `Elongation (%)` | Paper Table 1 header | Same limitation; tension and compression are distinct |
| `PROPERTY: Type of phases` | Pinned helper/test source literals | Code usage, not proof of presence or position in v9 |
| `PROPERTY: Type of test` | Pinned helper/test source literals | Same limitation |
| `PROPERTY: Elongation (%)` | Pinned helper/test source literals | Same limitation |

The [source inventory](../reports/mpea-source-inventory.json) separately records
documented concepts such as test temperature in Celsius, experimental versus
rule-of-mixtures density/modulus, test mode, processing, grain size and measured
interstitial contents. Those semantic descriptions are useful evidence for a
later mapping. They are **not exact CSV tokens**. In particular:

- Do not manufacture `PROPERTY:` names from paper prose, normalize spelling or
  punctuation, or infer position from a table's display order.
- Do not turn outlier-file basenames in the Git tree into archived CSV labels.
  Those names describe derived artifacts and include altered unit/name forms.
- Do not infer v9/GitHub CSV equality from the README's unversioned Figshare link
  or from a newer repository commit. That equality remains unestablished.
- Do not infer missing-value syntax, row width, specimen pairing, measurement
  provenance or value ranges from a header. None is established in this pass.

## Proposed amendment A: disclose only the verified first record

This is a design proposal, **not executable permission to change the frozen
producer**. Existing project authorization covers ordinary implementation and
execution; review and a committed source checkpoint are the technical
prerequisites. No additional approval from Alex is implied.

The initial `BLOCKED_SCHEMA` receipt must remain preserved. Before any unknown
header spelling is released, commit a short amendment and a separate bounded
extractor with synthetic tests. The amendment should specify:

1. **Exact input identity.** Reuse only the ignored cache of article 12642953/v9,
   file 25797305, 332,126 bytes, declared MD5
   `6d29eb6018157b863ca0033ccec936d5`. Bind the original source inventory, initial
   capture/header receipts, their whole-file SHA-256, the amendment, extractor
   and tests by actual hashes and commit. Verify the captured buffer before
   parsing. Do not substitute a GitHub CSV or retrieve a newer version.
2. **No acquisition or row path.** The extractor is cache-only and has no network,
   notebook, dataframe, schema-sniffing or row-iteration function. It frames one
   logical record in bytes, then decodes only that slice. It must never give the
   whole file to a text decoder or CSV reader. Quoted embedded newlines remain
   part of that one logical record; no split on a physical newline is sufficient.
3. **Explicit disclosure expansion.** Permit the exact decoded string and
   zero-based position of every token in that first record, including strings
   that the initial allowlist redacted. This intentionally changes the earlier
   unknown-token noninterference boundary. State that change plainly; do not
   claim the old redacted-header policy still applies. No substring repair,
   trimming, normalization, positional guess or duplicate merging is allowed.
4. **Fixed bounds and safe output.** Retain the reviewed UTF-8/BOM, comma,
   quote/doubled-quote and logical-record framing rules and existing resource
   limits. Reject empty/duplicate/overlong tokens and malformed framing with
   constant errors. Export escaped JSON strings as untrusted data, never terminal
   control text, HTML or instructions. Export no raw bytes after the header,
   body fragments, per-row hashes, row counts, numeric validity or summaries.
5. **No semantic promotion.** A successful receipt should state
   `first_record_labels_disclosed=true`, `full_schema_established=false`,
   `data_rows_decoded=false`, `row_metadata_extracted=false`, `fits=0`, `splits=0`,
   and remain `BLOCKED_SCHEMA`. Include observed token order, BOM/terminator,
   whole-file identity and disclosure profile. A syntactically valid first
   record does not prove that its cells are meaningful column labels.
6. **Exposure and failure preservation.** First-record text is real-source
   exposure. If the source unexpectedly places a value in the header, a
   printable-string rule cannot guarantee that the value is not scientific
   information. Record this limited disclosure honestly; stop on apparent
   non-header content without reading later records to resolve it. Preserve any
   prior failure and do not tune limits after seeing it without a new amendment.

Necessary tests include invalid UTF-8 and hostile CSV solely in the body,
header/body replacement races, first-record quotes/newlines/BOM, all fixed caps,
schema-forgery rejection, source/receipt/code mismatch, cache escape rejection,
constant errors, and no network capability. Changing only body bytes should not
alter released header fields; the corresponding whole-artifact identity must
change. Changing an unknown header string is expected to change the new label
artifact, because that disclosure is the specific amendment being reviewed.
These proposed tests have not been implemented or run in this research task.

## Subsequent mapping checkpoint, before any row metadata

After the amended first-record receipt is available, a distinct schema document
must enumerate every observed position and exact token. Each entry must have
either a cited semantic mapping or an explicit **uninterpreted/withheld** role.
Complete syntactic enumeration does not require guessing every field's meaning.
No candidate scientific analysis is authorized by that enumeration alone.

The mapping must record evidence for units, experimental versus ROM provenance,
tensile versus compression meaning, and original-source/composition identifiers.
Ambiguous fields remain withheld. A later row-metadata implementation must be
committed before it reads rows, validate exact width without dropping or
truncating records, and preserve malformed/unresolved positions without printing
cell content. It must not infer pairing or independence from shared names,
temperature or opaque equality groups. Numeric missingness, target completeness
and target values cannot choose which records receive identities or enter a
split. Scientific targets, thresholds, allowed features, eligibility and ranker
selection require a later evaluation protocol, still absent here.

If the expanded header remains insufficient, document that unresolved dependency
and stop. Metadata-only documentation can be pursued; observing row examples or
running an upstream notebook to guess semantics is outside this path.

## Exposure record and remaining unknowns

This task made documentation/catalog requests and the explicitly authorized
companion metadata JSON request. It made no GET of the experimental CSV, other
CSV/XLS files or notebook bodies, and opened no cached experimental source. No
upstream code ran, no observations were parsed, and no fits, grouping assignments
or splits occurred. The companion metadata JSON was read in full; it contains no
observation rows or experimental performance values. Its numeric text comprises
DOI/ontology identifiers, ontology versions/dates, configuration `1.0` and license
`CC-BY-4.0`. The reported 11 assays and four factors are counts of metadata
categories, not counts of experimental records or usable measurement pairs.

The full paper XML and helper/test source bytes were fetched for bounded metadata
selection. Those bytes include previously disclosed published results and
synthetic numerical examples, even though this pass emitted only paper captions,
table-header labels, helper names and selected metadata strings. The catalog also
repeats the already documented count of 630 alloys. The Table 1 caption describes
25 alloys chosen for high room-temperature yield strength. No target row values
or additional scientific performance results were emitted or used. This is not
a claim that all fetched documentation bytes were free of numerical results;
the earlier [exposure record](operating-condition-source-audit.md) remains relevant.

Still unknown from this research: the actual complete v9 header, its order and
encoding, whether the initial parser accepts it, the source's row widths and
missing tokens, complete paired observations, specimen/condition compatibility,
valid feature permissions, and any physically supported discrepancy bounds.
No recommendation-quality or superiority conclusion follows.
