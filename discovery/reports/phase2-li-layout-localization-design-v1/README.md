# Li documentary-sheet layout localization — prospective contract

**Design only; not executable.** One new frozen stage can produce useful,
source-bound coordinate evidence without publishing documentary cell contents or
opening shared strings. It must privately process the two worksheets' XML.
This is a new, explicit worksheet-access scope; it is not permission inherited
from the envelope checker. No implementation, real receipt, workbook, private
capture, network request or scientific allocation was used to prepare this
design. The compatible-envelope success and role-presence prerequisites have
not been inspected by this designer. Their exact receipt/producer bindings in
`proposal.json` remain null.

The stage's complete public product is the coordinate/type/formula-element and
merge inventory for **both** exact roles, `References` and `Column Descriptions`.
Successful localization remains `BLOCKED_SCHEMA`. It does not label a header,
definition, unit, reference key, data record, eligible row or independent panel.
No additional metadata micro-stages are needed before producing this inventory.

## Prerequisites and fixed access sequence

Before any actual new worksheet access, freeze this stage's script, author and
independent tests, contract and exact prerequisite bindings; publish them and
verify the exact-source CI/package checks. The source identity, capture and
compatible profile remain unchanged. Existing research authorization suffices;
the unresolved items here are evidence and source-freeze gates, not a new user
permission request.

1. Verify all previously frozen source/test/contract pins and this stage's own
   committed source against worktree/index/HEAD before production cache access.
   Check an exclusive fixed output slot. No archive, member, role, range, mask,
   source, receipt, output-path or URL override is accepted.
2. Require the separately verified compatible-envelope receipt from its exact
   frozen producer, original capture/object and profile. It must be
   `status=BLOCKED_SCHEMA`, `engineering_status=ENVELOPE_VALID`, with both exact
   recognized roles present. Freeze its exact canonical bytes/digest only after
   root has observed and verified that actual result. Missing, different or
   failed prerequisite: stop. Do not fabricate a qualifying template from this
   design or silently accept a later compatible profile.
3. Validate the original capture; read the one bounded fixed object once and
   check its existing size/MD5/SHA-256 on the same immutable buffer. No network
   or recapture. A receipt alone does not substitute for source validation.
4. Re-run the entire unchanged compatible ZIP traversal and original four
   envelope validators on that buffer. Keep the validated workbook tree and
   workbook relationship map in memory. This repeats all existing checks; it
   does not copy/strip flags, change ZIP/XML profiles or trust earlier ordinals.
5. Find each exact role name among the already-validated workbook `sheet`
   elements, take its actual namespace-qualified `r:id`, and resolve that ID
   through the validated internal worksheet relationship map. Require exactly
   one of each role and two distinct existing worksheet members of the required
   content type. Never derive a member name from `sheetId`, workbook ordinal or
   a guessed `sheetN.xml`. Relative and package-absolute targets follow the
   original validated normalization only. Keep relationship IDs/member names
   private; the fixed role names suffice to scope public coordinates.
6. Decompress and parse only those two resolved worksheet members, in the fixed
   role order declared in `proposal.json`. No other member may be opened beyond
   the four envelope components. In particular, do not open `sharedStrings.xml`,
   styles, worksheet relationships, comments, images, external links or another
   worksheet. Resolve no relationship or formula reference from a worksheet.
7. Validate the complete supported layout of both worksheets, then publish one
   canonical atomic coordinate inventory. On either-sheet failure, publish only
   the constant failure reason, source bindings and honest exposure state; no
   partial coordinate inventory is labeled complete or used for semantic mapping.

“Authenticated relationship” here means validated package graph and identity
under controlled local custody. It does not mean cryptographic authentication of
the publisher, an authentic scientific claim, or a boundary against hostile code.

## Private exposure versus public disclosure

The original `custody._xml` is deliberately restricted to the four envelope
members and rejects non-whitespace element text. It **cannot** parse ordinary
documentary worksheets unchanged. A new bounded worksheet parser is required;
do not expand the original helper's allowlist or patch its globals.

UTF-8/XML processing of a worksheet can privately decode inline strings,
numeric-looking text, formula text and cached results. A role named
`References` or `Column Descriptions` does not prove that no measured outcome is
present there. The correct claim is **worksheet payload/XML processed privately;
cell contents withheld from the public projection**. “No values read”, “no
outcome exposure”, or “metadata only” would be false or unestablished.

Separate new exposure fields must record, by the two fixed roles, worksheet
read/decompression/UTF-8 decode/XML parse/structural traversal started and
completed, including partial failures. Keep UTF-8 decoding separate from XML
parsing: a malformed XML document may already have been fully decoded to private
text. Mark potential character-data exposure before the first UTF-8 decode or
decode-and-scan operation, and XML processing completed only after successful
XML parse. Set each operation's started flag before attempting it. Do not reuse the old global
`worksheet_cells_decoded=False` after cell structures have been processed. The
original envelope instrumentation remains unchanged privately, including its
`inspected_xml_bytes` counter. The new public report projects only the explicit
started/completed component arrays and fixed boolean scope fields listed in
`proposal.json`, nested as `envelope_exposure`. It omits that byte counter, so
the new projection does not publish content lengths. A failed read/decode is not
evidence that no text was processed. Public logs/errors must contain no raw parser exceptions or source
snippets.

The public report may emit only the following new source-derived layout fields:

- The two fixed role labels and exact-relationship binding status.
- Every explicitly represented cell's canonical coordinate, declared `t`
  attribute from a closed type enum (including an explicit **absent attribute**
  state), and `formula_element_present` boolean.
- Canonical start/end coordinates of explicit worksheet merge rectangles.

No literal/normalized/encoded text, value, shared-string index, formula body or
attributes, cached result, hyperlink, style value, arbitrary name, content
fingerprint/hash, or character/byte length is released. Existing public source,
capture, prerequisite and code identities remain permitted custody bindings;
they are not new per-cell/per-member fingerprints. Coordinate-list length and
occupancy are inherently disclosed by a structural inventory. This is not a
zero-information claim or protection against arbitrary covert channels in a
hostile workbook.

`declared_type` reports storage syntax, not a verified data type. In particular,
`t="s"` does not attest that a shared-string index is valid, and absent `t` must
remain `absent` rather than becoming an assertion of a numerical observation.
`formula_element_present=false` means only no `f` child at that coordinate;
shared/array/range formula representations prevent interpreting it as proof of
a formula-free or observation-only cell. No formula is executed or cache read
for meaning. Empty but explicitly represented `c` elements are included; cells
are never selected or excluded based on their text/value.

## Prospective worksheet profile and bounds

These are engineering bounds, fixed before opening either worksheet, not values
inferred from this archive. Proposed bounds: 2 MiB decompressed per worksheet,
4 MiB combined new worksheet bytes; depth 64 and 65,536 XML nodes per worksheet;
32 attributes per element with names at most 256 and values at most 1,024
characters; 8,192 explicit cells and 1,024 merge rectangles per role; 2 MiB
canonical public receipt. Enforce counters while parsing before unbounded list
materialization. Existing envelope limits remain unchanged and separately
accounted. Resource counter values need not be published; a cap breach yields
a constant reason with partial exposure. No truncated “success”, cap relaxation
or chosen subrectangle is allowed.

Use canonical uppercase A1 cell references, columns A–XFD and rows 1–1048576.
These are proposed OOXML coordinate-domain rules, not observed archive ranges.
No absolute `$` references, leading-zero rows, ranges in a cell coordinate or
inferred positional coordinates. Require explicit canonical row indices, exact
cell-row agreement and unique rows/cells. Accept different physical XML order
only when uniqueness is established; sort the public cells by numeric row then
column. Missing `row/@r` or `c/@r` blocks rather than invoking Excel's implicit
position conventions. Never expand sparse gaps into invented cells.

Require merge endpoints in canonical increasing rectangle order, at least two
cells, no duplicate/overlapping rectangles and bounded total merge count. Report
the ranges as declarations, without filling cells, assigning merged text or
choosing an anchor's meaning. Coordinates need not all have explicit cells.
`dimension` and maximum coordinate do not establish record count, completeness
or eligible rows and are not used as scan ranges.

The frozen implementation must embody this small explicit grammar rather than
delegating to a general spreadsheet loader:

| XML structure | Prospective treatment |
|---|---|
| `worksheet`, one direct `sheetData`, direct `row/c` | SpreadsheetML namespace only; validate required coordinates and supported attributes; no nested hidden row/cell records. A valid empty `sheetData` may produce an empty role inventory, still with no semantic readiness. |
| Cell `t` | Only absent, `b`, `d`, `e`, `inlineStr`, `n`, `s`, `str`. Preserve the declaration, perform no value conversion. Unknown type blocks. |
| Cell children `f`, `v`, `is` | At most one of each; conflicting `is` with `v` or an incompatible declared storage form blocks. `f` presence is structural only. No numeric parsing, shared-string index lookup, formula attribute publication or cached-value interpretation. Rich inline text may be traversed under the bounded fixed subtree allowlist in `proposal.json`; contents remain opaque to the projector. |
| One direct `mergeCells/mergeCell` | Validate canonical ranges, uniqueness, nonoverlap and the declared count if supplied; no content-based inference. |
| `sheetPr`, `dimension`, `sheetViews`, `sheetFormatPr`, `cols`, `printOptions`, `pageMargins`, `pageSetup`, `headerFooter` | Support only the explicitly listed bounded standard subtrees/attribute names in the frozen implementation. They are privately parsed but not projected or treated as data. Unknown children/attributes or any foreign namespace block; do not silently skip extensions. |
| DTD, entity declarations, processing instructions, non-UTF-8, foreign namespace, markup-compatibility alternate content, `extLst`, worksheet hyperlinks/drawings/tables/external relationship structures, other unsupported child | Constant unsupported-profile block. No external resolution, fallback reader or automatic widening. Native Excel markup may therefore block honestly. |

The associated prospective allowlists are in `proposal.json`; they require
implementation review and adversarial tests before freezing production source.
Supporting a benign subtree means bounded XML validation and no projection;
it does not mean validating Excel rendering, style semantics or workbook-wide
referential integrity. Only the accepted supported structural profile is
claimed. Inconsistent duplicate `f/v/is` structures and reserved cell/row/merge
nodes outside their permitted ancestry block. Cell value syntax and the shared
string table remain unvalidated. Character data is allowed only in the declared
opaque leaves (`f`, `v`, `t`, and the six header/footer text leaves). Every other
element text and every inter-element tail must contain XML whitespace only
(space, tab, CR, LF). Except for the explicit root/cell/row/merge constraints,
child order and multiplicity within the declared bounded metadata allowlist are
unconstrained: that is a scanner profile, not full OOXML validity. Used expanded
element/attribute names determine namespace acceptance; unused namespace
declarations do not authorize any extra node or trigger external resolution.

## Failure states and required challenges

The public scientific status is always `BLOCKED_SCHEMA`. Engineering progress is
separate: `LAYOUT_LOCALIZED`, `BLOCKED_GUARD`, `BLOCKED_ENVELOPE`,
`BLOCKED_ROLE_BINDING`, `BLOCKED_WORKSHEET_PROFILE`, `BLOCKED_COORDINATES`,
`BLOCKED_LAYOUT_LIMIT`, or `BLOCKED_OUTPUT`. Emit only a fixed reason enum.
Any new unsupported profile requires a separate reviewed amendment; preserve all
previous negative outputs and do not weaken this profile after source exposure.

Tests must independently challenge source/producer/receipt/index changes before
raw access; exact role and r:id binding despite reordered sheets and arbitrary
sheet IDs; missing/swapped/duplicate/aliased/external roles; full ZIP and envelope
revalidation; exactly six allowed component reads; forbidden sharedStrings and
other payload opens; changed inline/numeric/formula/shared-index canaries with
identical accepted layout yielding identical public layout; malformed type,
coordinate, row agreement, duplicate and merge cases; sparse/empty sheets;
formula presence versus formula-free nonclaim; XML entity/depth/node/byte limits;
output caps; partial read/decode failure exposure; atomic output/no partial-map
fallback; exclusive slots; no network/formula execution/numeric conversion; and
no content hashes, lengths, snippets or raw exceptions in the public schema.

Canary semantic invariance must condition on both inputs remaining within the
same accepted profile/bounds and storage declaration: changed malformed content
may legitimately change a constant block code. It is not a proof that arbitrary
hostile payloads have no information channels. Provenance/whole-object identities
are compared separately from the layout projection.

## What this enables — and what it cannot do

A complete role-bound sparse layout is useful evidence for selecting explicit
candidate coordinates and merge policies for a **separately reviewed semantic
mapping**. It can reveal where represented cells and declared string/formula
forms occur, and prevent guessing the first row or an advertised 54/55-column
rectangle. It cannot decide whether a coordinate contains a definition, header,
reference, unit, example measurement or mixed role. Such meaning is impossible
to establish from coordinates/types/merges alone: two files can have identical
layout and different cell meanings. Shared-string cells also cannot reveal their
text without a later explicitly scoped shared-string operation.

The next meaningful step would combine reviewed role/coordinate binding and
bounded selected documentary-text extraction/classification, with explicit
mixed-role blocking and exposure accounting; do not create separate stages for
every cell. Layout success itself grants no such extraction permission. Keep
paper 1050/55 and archive 1070/54 claims distinct and unresolved, preserve unknown
upstream outlier handling, and leave row framing, pairing, condition semantics,
source provenance, overlap and independent evaluation units for G20 evidence.
No thresholds, model, allocation, split, G21 approval or scientific superiority
claim follows from this stage.
