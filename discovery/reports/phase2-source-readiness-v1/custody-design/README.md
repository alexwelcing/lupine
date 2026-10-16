# Li v3: bounded custody and schema extraction design

2026-10-16; owner `phase2_evidence`. **Design only. No workbook acquired,
opened or parsed; no code implemented or tests executed.** Root requested this
ignored candidate while the planner release checks run. It changes no tracked
file and grants no scientific study readiness.

The next implementable increment is **fixed-source capture plus an XLSX package
envelope inspection**, ending `BLOCKED_SCHEMA`. A small Li-specific stdlib
ZIP/XML reader is enough for this first step; no generic spreadsheet framework
is needed. The dictionary/reference layout is not established, and workbook-wide
shared strings can contain withheld data even when a caller selects a nominally
safe worksheet. Do not begin with a pandas or openpyxl workbook preview.

The boundary is between the machine custodian and the researcher/ranker. The
custodian may acquire sealed target-bearing bytes and, in a later reviewed
selected-coordinate stage, privately decode workbook strings when necessary.
It must accurately record that operation and emit only its approved projection.
This does not require metadata to contain no scientific information, nor does
it license raw worksheet or dictionary dumps.

## Fixed source and observed route

- Archive: Materials Cloud record `vywsz-wxn79`, version 3, published 2024-12-20.
- DOI: `10.24435/materialscloud:ws-8j`; concept DOI
  `10.24435/materialscloud:e1-tk`.
- License: dataset **CC BY 4.0**, declared independently by Materials Cloud and
  DataCite. Public files/no active embargo in the inspected metadata.
- Object: `Tensile_Properties_of_Sub-sized_Specimens.xlsx`, file ID
  `b7743ed4-0d28-4f55-ab74-6d85981537d7`.
- Publisher byte count: **183878**; supplied MD5:
  `041bbe095c54615e5a3c289facb18ce5`. No actual workbook SHA-256 exists yet.
- Fixed acquisition URL:
  `https://archive.materialscloud.org/api/records/vywsz-wxn79/files/Tensile_Properties_of_Sub-sized_Specimens.xlsx/content`.

One actual **HEAD**, with redirects disabled and no response body read, returned
302 on 2026-10-16. Its HTTPS destination host was `rgw.cscs.ch`, exact path
`/mc-archive/b7/74/3ed4-0d28-4f55-ab74-6d85981537d7/data`; an opaque query was
present and no fragment. The redirect was not followed. The sanitized observation
is `head-route-observation.json`. Future capture may allow **at most this one
redirect**, carrying its query without recording or displaying it. A changed
scheme, host, path, fragment or second redirect blocks; do not search mirrors.
This HEAD does not prove a later GET will succeed.

Preserve the unresolved publication discrepancy: archive/README advertise
**1070 records/54 parameters**, whereas the paper describes **1050 records/55
columns**. Neither pair supplies an expected row count, eligibility rule or
statistical-unit count for this custodian. Do not truncate, repair or switch
versions to reconcile them.

## Reuse the existing boundaries, not the CSV parser

The reviewed mechanisms are `scripts/mpea_custody.py` (fixed source, bounded
capture, source freeze, constant errors), `mpea_header_labels.py` (separate
disclosure amendment and same-buffer identity), and `mpea_feature_reader.py`
(regular-file/O_NOFOLLOW checks, ignored-output enforcement, non-overwriting
directory-descriptor writes). Their relevant docs are bound in
`source-bindings.json`. These were inspected as public source; no MPEA raw cache
or target artifact was opened.

Reuse those design patterns in one small Li-specific tool. Do not repurpose the
existing MPEA constants, mutate its receipts, or use its CSV framer on ZIP/XML.
Keep acquisition separate from cache-only extraction. Source/test/contract and
inventory files must equal a reviewed committed checkpoint before any real GET;
root verifies that checkpoint and CI externally. A local hash does not establish
that remote CI ran. Existing user authorization covers this ordinary work; no
new permission question is implied by the methodological gates.

## First implementation: capture and envelope only

Before network: validate a closed source inventory and output destinations;
require the reviewed files to match committed bytes; require production to run
from its tracked path. No source URL, input path or version override is accepted.
Synthetic fixtures use a separate API with no production cache access.

Capture at most **183879 bytes**, with a 30-second network timeout. Require exact
size and publisher MD5 before recording a successful capture; compute SHA-256 on
that same immutable byte buffer. Save only under an ignored fixed namespace,
for example `.cache/li-v3-custody/objects/`, with mode 0600, no symlinked ancestors,
no nonregular files and no overwrite. A conflict remains an explicit failure.
Retain whole-byte identities and a constant status, never response bodies in
logs, signed query strings or arbitrary exception text. Acquisition is an
exposure to target-bearing bytes even if no cell is decoded; report that honestly.

The cache-only envelope step must reread one bounded regular-file buffer and
verify size, MD5 and the captured SHA-256 before parsing. Its read allowlist is:

| Component | Allowed operation | Public output |
|---|---|---|
| ZIP central/local directory structure | Validate unique, canonical relative member paths, bounds, supported compression and matching metadata; no extraction to disk | Member count and constant layout status; no unknown filenames |
| `[Content_Types].xml` | Check the reviewed ordinary XLSX package profile | Known profile/status only |
| `_rels/.rels` | Resolve exactly the expected internal `xl/workbook.xml` relationship | Constant role/status, never arbitrary relation target |
| `xl/workbook.xml` | Read bounded sheet metadata | Sheet count; recognized `References`/`Column Descriptions` presence and ordinal; other names masked |
| `xl/_rels/workbook.xml.rels` | Resolve sheet IDs to canonical, internal worksheet members without opening them | Constant mapped/unresolved role status |

**No worksheet, shared-string, comment, drawing, external-link, formula/cache,
style, custom-property or notebook content may be decompressed in this first
step.** Reject encrypted/macro packages, duplicate paths/relationship IDs/sheet
names, traversal, absolute paths, external workbook targets and unsupported
namespace/layout combinations. Do not follow workbook relationships over the
network or use a browser/office preview. XML DTDs/entities and extension constructs
outside the reviewed envelope profile fail before interpretation.

Prospective engineering ceilings: 128 ZIP members, 128 sheets, 4096 relationships,
2 MiB per inspected envelope member, 8 MiB total inspected envelope bytes and
XML depth 64; unsupported compression or a ceiling breach blocks, never yields a
truncated success. Bound actual decompressed reads rather than trusting ZIP
directory lengths. These are resource limits selected without observation
access, not claims about the unseen workbook or scientific acceptance criteria.
An independent implementation review should tighten/check this exact profile
before it is frozen.

The first inspection result is always **`BLOCKED_SCHEMA`**, including when the
envelope is well formed. A recognized dictionary/reference sheet name does not
authenticate its contents or establish header locations. Publish no main-sheet
row/column counts, target completeness, cell strings, per-cell hashes or token
lengths. Do not treat OOXML `dimension`, cached formula values or a formatted
row range as an audited observation count.

## Later dictionary/header and reference stages

They require a separate reviewed mapping/disclosure specification after the
envelope receipt. The smallest follow-on is one frozen coordinate map and a
closed metadata projection, not a generic intake engine. The following are
constraints for that implementation, not actions executed in this design:

1. **Locate, then constrain.** Freeze which relationship/sheet and coordinate
   region is documentary, how header/label/unit cells are identified, and how
   merged or rich-text cells are handled. No positional guesses, best-effort
   worksheet choice, substring role matching or use of an assumed 54/55 width.
   Unknown layout remains blocked. A dictionary's free text may itself contain
   observations; do not dump it because its sheet is named `Column Descriptions`.
2. **Keep shared strings inside machine custody.** A small bounded stdlib
   parser may privately decode the shared-string table when needed to resolve
   the frozen selected cells. It must not print, serialize, return or log the
   complete table, or make the stronger claim that all target-bearing strings
   remained undecoded. Record the exact decompressed/decoded components.
   No custom opaque XML tokenizer is required to claim researcher blinding;
   finite adversarial tests should challenge the actual closed output boundary.
   Never execute formulas, macros, links or upstream notebooks.
3. **Release the selected metadata deliberately.** The subsequent specification
   must freeze exact worksheet relationships, coordinates and permitted output
   roles (field labels, units, short documentary definitions), with explicit
   caps and escaping. Do not infer those roles from arbitrary cell text or dump
   whole sheets. Unknown layout/formulas or a value-bearing cell in an unapproved
   coordinate fail closed; arbitrary exceptions contain no source text. A
   reviewed label/dictionary disclosure can expose scientific statements and
   must record any incidental exposure honestly. It establishes documentary
   semantics, not that source headers are infallible or all row outcomes paired.
   After mapping, outcome cells stay outside the exported coordinate set.
4. **References are not harmless free text.** After exact reference-column and
   row-join mapping exists, a private scanner may normalize approved DOI tokens
   under a frozen grammar. Do not publish titles, abstracts, URLs, source-token
   hashes or raw DOI lists, and do not resolve DOIs online during extraction.
   Missing/ambiguous citations retain unknown identity; they are not merged into
   an invented shared study. Preserve source row ordinals.
5. **Source-overlap counts are conditional.** Compare against an explicitly
   supplied, separately authenticated metadata-only exposure manifest from the
   existing development sources. This design opens no such private manifest.
   Without it, overlap is `NOT_ASSESSED`. Distinct DOI/reference/heat counts are
   descriptive equality groups, not independent samples. Repeated experiments
   across papers/mirrors and several tests from one heat can remain dependent.
   Do not create train/calibration/evaluation groups or scientific eligibility.

After safe mapping exists, a future all-row metadata pass can count original
framed rows and source groups while withholding all target cells. That is a
different stage, with explicit allowed condition fields and missingness semantics.
It must not count usable paired targets, inspect outcomes to decide eligibility,
choose a threshold or claim that each source row has same-specimen pairing.

## Proposed commands and outputs

The following is a **future CLI contract**. `scripts/li_v3_custody.py` does not
exist yet; none of these commands has run. First implement/review/freeze the
source inventory, contract, Li tool and meaningful synthetic tests; only then
execute these exact bounded stages under root's checkpoint:

```sh
python scripts/li_v3_custody.py capture --receipt .cache/li-v3-custody/capture-1/public.json
python scripts/li_v3_custody.py envelope --receipt .cache/li-v3-custody/envelope-1/public.json
python scripts/li_v3_custody.py envelope --receipt .cache/li-v3-custody/envelope-2/public.json
```

Capture exits 0 only for verified bytes; envelope exits 2 because scientific
schema is unresolved. A second envelope process reuses the exact captured object
and checks deterministic scientific/content fields; it is computational replay,
not a fresh sample. No `dictionary`, `references`, `rows` or `study` action should
be shipped in this first tool. Synthetic APIs cannot activate production access.

Closed receipts should bind source/version/license and inventory hash; execution
commit and required source hashes; actual whole-object size/MD5/SHA-256; stage and
parser profile; all read/decompression flags; exact recognized role presence;
constant reason/status; command/start/finish/exit evidence captured separately.
Keep `row_count`, `paired_count`, `source_group_count` and `overlap_count` null.
Set `worksheet_cells_decoded=false`, `shared_strings_decoded=false`,
`target_numeric_validity_checked=false`, `scientific_eligibility_decisions=false`,
`fits=0`, `splits=0`. A failed guard cannot fabricate an inspected receipt.
All raw bytes and private maps remain ignored. Only a validated public projection
is copied into tracked reports after root review.

Required engineering challenges before real capture include wrong version/license/
size/MD5, redirect changes, source/cache replacement, symlinks and conflicting
sinks, ZIP path/duplicate/bomb cases, malicious XML/entities, external targets,
unusual/hidden sheet names, and target canaries in every unapproved component.
Verify that production guard failures/imports/synthetic tests make no network
request and that changing opaque worksheet/shared-string bytes cannot leak text
or alter approved envelope semantics within the permitted framing limits. Hashes
will change with bytes; invariance concerns semantic projection, not hashes.
These are requirements, not test passes.

## Precise blockers

The source and declared data license are identified. Real GET behavior and actual
workbook SHA-256 are unknown. OOXML layout, header/dictionary coordinates, exact
schema and safe reference joins are unknown. The reported count discrepancy,
paired completeness, physical identity, uncertainty, overlap and independent
panel counts remain unresolved. This design enables a small capture/envelope
increment while keeping those scientific gates closed.
