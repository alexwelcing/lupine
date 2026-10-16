# Li v3 source capture and envelope-only contract

This increment captures one fixed archived workbook and inspects only its XLSX
package envelope. It does not establish scientific schema, row pairing,
independent panels, a sampling design, or usefulness. An envelope inspection
always returns **`BLOCKED_SCHEMA`**. `engineering_status=ENVELOPE_VALID` means
only that the supported package envelope passed these checks.

The source is Materials Cloud record `vywsz-wxn79`, version 3, DOI
`10.24435/materialscloud:ws-8j`, published 2024-12-20 under declared dataset
**CC BY 4.0**. The fixed object is
`Tensile_Properties_of_Sub-sized_Specimens.xlsx`, file ID
`b7743ed4-0d28-4f55-ab74-6d85981537d7`, publisher size **183878 bytes**, MD5
`041bbe095c54615e5a3c289facb18ce5`. The source inventory preserves the unresolved
archive claim of 1070 records/54 parameters and paper claim of 1050 records/55
columns. Neither is an audited row count or an eligibility/independence rule.

The associated design is recorded in
`reports/phase2-source-readiness-v1/custody-design/`. Its one HEAD request
observed a redirect without following it or reading a response body. A HEAD
does not prove future GET behavior or identify workbook contents. No actual
workbook SHA-256 is assumed by this contract before verified capture.

## Production guard and fixed capture

`scripts/li_v3_custody.py` has only `capture` and `envelope` actions. Before
production cache or network access it requires its exact tracked path and
working/index/HEAD byte equality for this closed source set:

- `scripts/li_v3_custody.py`
- `tests/test_li_v3_custody.py`
- `tests/test_li_v3_custody_review.py`
- `docs/li-v3-custody-plan.md`
- `reports/li-v3-source-inventory.json`

The inventory has a single canonical hash derived from the script's pinned
inventory constants. It contains no hash of itself or recursive source hash.
The runtime identity records the five reviewed files and current commit; it
does not establish that remote CI ran. Root must independently review, publish,
and verify CI for the checkpoint before any real GET. These are methodological
gates within the existing research authorization, not a new permission request.

Capture accepts no URL, object path, file identity, version, or license override.
It requests only
`https://archive.materialscloud.org/api/records/vywsz-wxn79/files/Tensile_Properties_of_Sub-sized_Specimens.xlsx/content`.
The initial response must be 302. Exactly one redirect may point to HTTPS host
`rgw.cscs.ch`, exact path
`/mc-archive/b7/74/3ed4-0d28-4f55-ab74-6d85981537d7/data`, with an opaque nonempty
query and no fragment, user information, alternate port, or non-ASCII/control
characters. Both requests have a 30-second timeout. Automatic redirect following
is disabled; the second response must be 200. Changed routes, another redirect,
or nonidentity HTTP content encoding block. No mirrors are tried.

The response body is bounded at 183879 bytes. Successful capture requires exact
publisher size and MD5, then computes SHA-256 on that same immutable buffer.
Redirect URLs, their signed queries, response bodies, and arbitrary exception
strings never enter public output. Errors are constant codes.

The object and canonical private capture receipt are written exclusively under
`.cache/li-v3-custody/objects/`. Public projections must also be written under
the ignored `.cache/li-v3-custody/` namespace, outside its `objects/` directory.
Every existing ancestor is opened through directory descriptors with no-follow
checks. Final reads require bounded regular files; final writes use exclusive
creation, mode 0600, and no-follow. Conflicts are failures, with no overwrite,
repair, or cleanup that discards an earlier object. Destinations are checked
before the GET. An interruption or later write failure can leave a partial
custody transaction; the tool does not silently retry it as a fresh capture.

## Cache-only inspection

`envelope` has no network path. It first validates the closed canonical capture
receipt: exact fields/types, source identity, implementation file hashes,
exposure flags, null scientific counts, and whole-object digest format.
Additional claims, duplicate JSON keys, or altered flags fail. It then rereads
the fixed object once with a bounded regular-file reader, verifying its exact
size, MD5, and the recorded SHA-256 before ZIP parsing. Local receipt validation
protects this controlled workflow; it does not authenticate an external actor's
provenance claim or supply physical validity.

The ZIP reader checks central/local directory agreement, canonical member
names, unique paths, offsets and nonoverlap, sizes, compression flags/methods,
CRC declarations, version, and DOS timestamps. It accepts stored or deflated
members only. Stored members must declare equal compressed/uncompressed sizes.
Archive comments, member comments, extra fields, ZIP64, data descriptors,
encryption, directory entries, symlinks, prefixes/trailers, macros, external-link
parts, and unsupported package paths are outside this deliberately small
profile and block. Declared CRCs of excluded components are compared between
headers; their payload CRCs are not verified by decompressing those components.

Only these four members may be opened and decompressed:

| Member | Allowed interpretation |
| --- | --- |
| `[Content_Types].xml` | Closed ordinary XLSX MIME profile and exact internal part declarations. |
| `_rels/.rels` | Exactly one internal office-document relationship to `xl/workbook.xml`, with only supported optional document-property relationships. |
| `xl/workbook.xml` | Supported workbook metadata and sheets; only recognized documentary role names can be returned. |
| `xl/_rels/workbook.xml.rels` | Internal worksheet, style, shared-string, theme and calculation-chain relationship declarations, without following or opening those targets. |

Supported targets are canonical OOXML relative names or package-absolute names
beginning with `/`, normalized only within the package's fixed root or `xl/`
base. A package-absolute target is not resolved as a filesystem path. Traversal,
URL syntax, fragments/queries, percent-encoded paths, external targets, duplicate
IDs/targets, unknown relationship types, and unmapped worksheet relationships
block. Absolute filesystem-style ZIP member names remain forbidden.

XML is limited to UTF-8 and the reviewed ordinary namespaces. DTDs, entity
declarations, comments, processing instructions other than the XML declaration,
non-whitespace element text, unsupported extensions, and unsupported workbook
structures (including defined-name expressions) block. Workbook sheet IDs,
names and relationships must be unique; names are checked case-insensitively
for duplicates. Hidden and very-hidden sheets remain eligible for name-role
recognition; visibility never authenticates their contents.

In particular, native Excel markup-compatibility attributes such as
`mc:Ignorable`, `x15`/`xr` extensions, and unsupported optional workbook children
are not assumed safe or silently stripped. They can make the unseen real
workbook return `BLOCKED_LAYOUT`. Synthetic passes do not predict that the real
workbook will satisfy this intentionally restricted profile.

The profile permits ordinary worksheet, shared-string, style, theme,
calculation-chain, core/app/custom-property, comment, drawing, VML, worksheet or
drawing relationship, and PNG/JPEG/GIF image parts as opaque members. Their
contents are **never decompressed or decoded** by this stage. Their presence
and declared MIME types do not establish their semantic correctness. No
worksheet cell, shared string, formula/cache, style, drawing, property body,
or upstream notebook is interpreted or executed.

Engineering limits are 128 ZIP members, 128 sheets, 4096 relationships per
inspected relationship part, 2 MiB per inspected XML member, 8 MiB total
inspected XML bytes, depth 64, and 65536 XML nodes per inspected member. Bounds
apply to actual decompressed reads; directory sizes do not authorize unbounded
allocation. Ceiling breaches produce blocked results, never truncated success.
These are prospective implementation limits, not expected source dimensions
or scientific acceptance thresholds. An ordinary workbook outside this narrow
profile may therefore block without being corrupt.

## Closed public projection and exact exposure accounting

The synthetic and production inspection reports distinguish whole-buffer reads,
decompression started/completed, and XML decoding started/completed for the four
constant allowed components. A partial failure retains the started flags; a
failed guard cannot fabricate a completed inspection. Acquisition is honestly
recorded as exposure to target-bearing source bytes even though no cell is
decoded. A synthetic fixture is explicitly marked and cannot attest real source
identity. Metadata XML can contain scientific information, so its decoding is
not described as observation-free or a guarantee against every covert channel.

After complete envelope validation, public structural output consists of member
count, sheet count, a constant all-internal/mapped status, and exact recognized
`References`/`Column Descriptions` presence with one-based ordinal. Other sheet
names and all raw relationship targets are masked. There are no per-cell hashes,
token lengths, data-derived headers, row dimensions, cached formula results,
complete string tables, or scientific values in the projection.

`row_count`, `paired_count`, `source_group_count`, and `overlap_count` remain null;
overlap stays `NOT_ASSESSED`. Worksheet/shared-string decoding, numeric target
validity, scientific eligibility decisions, and sampling independence remain
false. Fits and splits remain zero. Known documentary names do not establish
safe coordinates, meanings, usable pairs, reference joins, or independent units.

`inspect_synthetic_envelope(raw)` is a pure bytes-only API with no paths or
production-mode parameter. It rejects the actual pinned source identity and
never opens cache files or network connections. Tests use fake transports,
temporary descriptor-owned directories and labeled synthetic ZIP components.
Private Python functions are accessible to trusted callers; these guards do not
claim isolation against hostile Python execution or a malicious operator.

## Run sequence after the committed checkpoint is verified

```sh
python scripts/li_v3_custody.py capture --receipt .cache/li-v3-custody/capture-1/public.json
python scripts/li_v3_custody.py envelope --receipt .cache/li-v3-custody/envelope-1/public.json
python scripts/li_v3_custody.py envelope --receipt .cache/li-v3-custody/envelope-2/public.json
```

Capture exits 0 only after verified bytes and both custody/public receipts are
written. Envelope exits 2 even when `ENVELOPE_VALID`, because the scientific
schema remains unresolved. A second envelope process reuses the same captured
object; agreement is computational replay, not independent evidence.

Root reviews a safe public projection before copying it into tracked reports.
Raw objects and private capture material stay ignored. Any later dictionary,
header, reference, condition, or row extraction requires a separate frozen
mapping and disclosure specification. No such action is shipped here. Existing
MPEA negatives, operational failures, exposed test sets and source version are
unchanged; no new scientific superiority or physical qualification is claimed.
