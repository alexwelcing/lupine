# Li: one bounded package-to-frame admission design

**DESIGN_ONLY — root review required before implementation or any source operation.**
This is one complete route with dependent disclosure phases, not a sequence of
part-name exceptions. It preserves every existing script, profile and result.
No numerical endpoint values, model, split, allocation or threshold are selected.

## Evidence and precise proposed change

The two allowed public G34 receipts are byte-identical, SHA-256
`68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be`, produced by
`a064a2c0e4a7cce1fbcb0541f49aae132944e785`. They report a complete
`MEMBER_KIND_PROFILE / member_kind / ZIP_LAYOUT_UNSUPPORTED` diagnosis: that
family fails, the other 31 pass with no partial/dependency gaps. Aggregate
progress is 15 fixed local headers and five extra areas; primary progress is
three extra areas. These are parser counters, not scientific units. Member/XML
opens are zero. Root's operation-final receipt records two completed diagnoses;
reading these public receipts is not a new execution or independent byte audit.

The proposed new profile replaces only the finite name-to-kind rejection in the
G31 header traversal with a restricted general OPC part-name validator. It does
not infer which member failed or assign it a type. All other G31 header, local
extra, CRC/size agreement, member count, compression, flag, bounds and alignment
predicates remain identical. New package metadata checks add requirements.

ECMA-376 Part 2 (fifth edition, December 2021), §§6.2.2–6.2.3, 6.5 and 7.2.3,
supports general part naming, media-type declarations and relationship rules;
§7.3.7 distinguishes `[Content_Types].xml` from ordinary parts. This is a
restricted reader informed by OPC, not a full OPC/SpreadsheetML validator.
OPC is syntactic; a declared media type is not content verification. The retained
standard itself warns that content-specific payloads can contain relationships
not expressed in the package relationship graph.

## Exact prerequisite and source custody

Before target access, require the fixed G34 run-1 public receipt above, exact
canonical bytes, schema/profile and producer/source-chain pins; validate its
complete sole-family failure, all 31 pass states, `checked=true`, `partial=false`,
`dependencies=[CHECKED]`, both cleanup paths, selected-growth match, complete
source verification, no member/XML operations and unchanged source identity.
Run 2 is corroborating deterministic reproduction, not a statistically independent
sample. Bind the original capture SHA
`13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009` independently.
Source stays 183878 bytes, MD5 `041bbe095c54615e5a3c289facb18ce5`, SHA-256
`9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa`.

Use one immutable, bounded whole-source buffer per invocation. Verify identity,
then reproduce the complete selected-growth/G34 report from that same buffer
without production I/O or member opens. Compare the pinned diagnostic projection
including all families, progress and cleanup. Any mismatch stops **before XML**.
Only an independently published new entrypoint may then enter its declared phase.
A G34 receipt alone never calls or authorizes an XML opener.

Use the existing exact worktree/index/HEAD and ancestor-source guards, exclusive
durable reservation, consumed failed slots, context recheck before target access
and publication, fixed output slots and closed errors. Keep source/partial-read,
decompression/decode/parse, close and partial-output exposure honest. No network,
refetch, extraction to disk, formula execution or arbitrary input/output paths.
Root must freeze the new own-four identities, complete actual-operation budget,
phase-specific output slots and CI/package/artifact gates before any actual use.
This design supplies none of those future execution authorizations.

## Generic package rules, with the old known-role checks retained

1. **Names and physical association.** Call unchanged `_canonical_member` first.
   Exempt only the exact required `[Content_Types].xml` metadata item from ordinary
   part grammar. For other members, prefix `/` to form the abstract part name;
   require nonempty ASCII segments using only unreserved characters or the ASCII
   sub-delimiters plus `@` (the old rule already excludes colon and percent).
   Additionally reject space, `?`, `#`, brackets and every segment ending in `.`.
   Reject ASCII-case-insensitive collisions and prefix/derivability collisions
   using those same ASCII-case-insensitive keys (for example, `A` versus `a/b`). No normalization, rename, Unicode/percent
   decoding or repair. Retain the 256-character old member bound. This deliberately
   supports a subset of OPC grammar; unsupported does not mean nonconformant.

2. **Reserved relationship names.** Recognize the package `_rels/.rels` and the
   generic source-part construction `dir/_rels/leaf.rels`, case-insensitively for
   reserved-name classification. Invert that construction to an existing unique
   non-relationship source part; reject empty source leaves, dangling association,
   relationships from/to a Relationships part and the Media Types stream as a
   relationship source/target. Keep a canonical lookup to the original ZIP name;
   never pass a normalized spelling to an archive reader by guesswork.

3. **Media Types stream.** Parse its exact existing namespace and empty root;
   allow only leaf `Default(Extension,ContentType)` and
   `Override(PartName,ContentType)` entries. Retain DTD/entity/processing-instruction
   rejection and all XML caps. Use ASCII-case-insensitive extension/part keys,
   reject duplicate keys including equal-valued duplicates, require every Override
   to identify an existing part, explicitly forbid an Override of the special
   `[Content_Types].xml` stream, and resolve Override before Default. An extension
   is a nonempty single-segment ASCII token; a media type is a nonempty ASCII
   `token/token` with no whitespace or parameters in this restricted profile.
   Reject extra attributes, children, empty type and missing coverage. Relationship
   naming and resolved Relationships media type must agree in both directions:
   reserved relationship names have exactly that type, and ordinary names must
   not declare it or become opaque by doing so. Require relationship declarations
   too as an explicitly stricter reader policy. Allow unused valid Defaults, as
   OPC permits. Every name recognized by unchanged `_member_type` must retain its
   exact old expected type; an unfamiliar name becomes only
   `DECLARED_OPAQUE_PART`, never a guessed known role. No inference from extension.

4. **Relationship graph.** Read all structurally identified Relationships parts,
   plus the original four envelope members, within one bounded metadata phase.
   Validate exact Relationships/Relationship namespaces, leaf shape, required
   Id/Type/Target and optional TargetMode, unique bounded old-profile IDs per
   source, and no `xml:base` or markup-compatibility extensions. Keep relationship
   Type as an exact, case-sensitive bounded absolute ASCII URI; support only
   syntactically well-formed absolute `http` or `https` forms, with valid percent
   triplets and no whitespace. This is a declared subset, never a dereference.
   Default TargetMode to Internal; reject External throughout this reader without
   claiming OPC prohibits it. Internal targets use the source part's directory
   (package source uses `/`), or a package-absolute path. Permit literal `.`/`..`
   path resolution only for these generic targets; reject escape above root,
   empty segments, scheme/authority/query/fragment, percent/backslash and invalid
   final names. Resolve to an existing unique non-relationship part. Preserve the
   old duplicate-target rejection within each relationship part as a stricter
   policy. Do not infer semantic independence from graph reachability.

5. **Known workbook roles stay strict.** Run the unchanged root and workbook
   relationship validators on those exact two members, and the unchanged workbook
   validator on `xl/workbook.xml`. Their old type-to-target allowlists, exact
   officeDocument target, unique mappings, worksheet-name patterns and workbook
   constraints remain mandatory, even where generic graph syntax permits more.
   Required old envelope members remain required. G32 resolves exact `References`
   and `Column Descriptions` through namespace-qualified `r:id`, not ordinals or
   sheetId; both must be present, distinct and correctly typed. Its current
   namespace-aware finite worksheet grammar and bounds remain unchanged.

Unknown part payloads stay unopened and undecompressed. Preserved local/central
CRC and size agreement does not verify the CRC or content of those unread
payloads. Relationship metadata is
not an opaque payload: it is explicitly read in rule 4. Public output need not
reveal arbitrary member names, media types, relationship identifiers/targets or
payload hashes. A closed count of opaque parts and
`opaque_semantics=UNINTERPRETED` records the limitation. That does **not** label
those parts harmless, prove that they cannot affect workbook interpretation, or
certify a rendering. If a selected role/text/frame meaning requires unsupported
content, styles, formulas, rich-text interpretation, external resources or an
opaque part, admission stops. A narrowly supported literal archival projection
may state exactly what it reads without claiming complete workbook semantics.

## Bounds and concrete implementation seam

Propose one new `scripts/li_v3_readiness.py`, author and independent test files,
and one contract. A private metadata reader and a copied, audited G31 header loop
may differ only at the described kind check plus new OPC checks; do not monkeypatch
old globals or make the old `_member_type` return a generic fallback. Differential
checks must hold all old accepted/rejected predicates except the explicitly new
kind decision. Pure generated-fixture entrypoints reject known real identities.
A production wrapper is a later separately pinned adaptation, not a test switch.

Keep source 183878, members 128, local-extra span 65535; metadata XML 2 MiB/member,
8 MiB total including the four old members and all relationship members, depth 64,
65536 nodes/member, 32 attributes including namespace declarations, attribute-name
256/value 1024. Add total relationship-edge and content-type-declaration caps of
4096 each. Deduplicate member reads so an envelope relationship member is read
once in that phase. Keep G32's 2 MiB/documentary sheet, 4 MiB combined, 8192 explicit
cells/role, 1024 nonoverlapping merges/role, 2 MiB layout output; no sparse-grid
expansion. Future semantic-phase caps are listed in `proposal.json`; they are
engineering maxima chosen before exposure, not expected scientific counts.
Any cap failure is a complete blocked result, never truncated success or a request
to enlarge the cap after seeing the source.

## Three dependent phases, then one readiness decision

**A — structural layout.** After the exact replay gate, run the complete package
rules and both G32 inventories atomically. Return only reviewed categorical
package/role states and the complete two-role coordinates/types/formula-presence/
merges, with truthful private XML exposure. Do not read shared strings, styles or
other worksheet payloads. Failure stops this route. Success is
`LAYOUT_READY_MAPPING_UNBOUND`, science still blocked. This output establishes no
column meaning, row denominator or pair count.

**B — one complete documentary mapping.** Bind all documentary roles/coordinates
in one reviewed manifest before selected text can leave custody. The structural inventory cannot itself classify cell meaning; if
available documentary evidence cannot bind the regions without guessing, return
`NO_GO_UNBOUND_DOCUMENTARY_SCOPE`. No automatic first-row preview, whole-sheet
sample or per-cell discovery loop. The manifest fixes permitted text fields,
cell storage types, merges and dictionary/reference semantics to resolve. The
second phase repeats complete replay/package/role validation and binds phase A's
exact receipt and this manifest before any new member read.

Map definitions, units, yield/UTS/uniform/total distinctions, row/test/aggregate
meaning, condition inheritance, reference-key rules and missing/censored codes.
Mapping success returns documentary support and explicit unresolved meanings,
not row-level admission. It supplies evidence for the final frame binding; the
record-sheet identity need not be guessed before this documentary phase.

A needed shared-string table has one exact validated workbook relationship and
known type; a bounded decoder can privately read it only in phase B. Permit
selected plain inline strings or plain shared-string entries; preserve exact
lexical text privately. Formula/cache-derived text, rich-text meaning requiring
unsupported interpretation, mixed documentary/numerical-example cells, undefined
index/storage or opaque dependencies stop the affected required mapping. Do not
filter digits or infer units from values. Machine XML traversal may expose
unselected text, cached values and numerical endpoints; record that exposure,
never call it target-free. No formula evaluation or numerical endpoint conversion.

**C — one complete frame/provenance projection.** Freeze one manifest using the
reviewed documentary output: exact record-sheet identity and coordinates,
header/row classification rules, metadata columns, condition scope and equality/
join rules. If these cannot be bound without guesses, stop; do not sample another
sheet. Revalidate the same source, package and exact A/B receipts before row reads.
Enumerate the complete original frame and allowed non-outcome identity/condition/
presence/provenance metadata. Never manufacture a stable physical-test ID from a
row number: keep archive-row identity and asserted test identity separate.
Retain headers/blanks/notes/summaries and ambiguous rows with their classifications;
no silent deduplication or count-targeted trimming. Bound lexical condition metadata
may be projected, but no numerical endpoint conversion, thresholding or eligibility
selection occurs. If required metadata uses shared strings, repeat the exact
phase-B decoder and exposure limits on this invocation's same immutable buffer.

Together B/C report semantic field/unit/definition provenance and unknowns,
complete framed-row accounting, supported versus unresolved same-test endpoint
joins, metadata missingness/presence distinct from numeric validity, source/test
lineage and count-claim reconciliation. Permit public scientific
citations only in the separately declared provenance fields; retain original
reference tokens and article-local IDs. Preserve the CR49/CR50 DOI conflict;
never union papers by DOI alone. Compare source/test lineage to an authenticated
target-redacted previously exposed-source manifest, separating composition reuse,
measurement/campaign reuse and computational provenance. Without that manifest,
overlap remains unknown. No numerical endpoint values, target hashes, ranges,
model scores or performance extraction are emitted.

End with `METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE`,
`NO_GO_SOURCE_LIMITATION`, or `NO_GO_UNRESOLVED_PREMISE`, naming the claim and all
unresolved rows/joins. This does not approve numerical completeness, new paired
screening or physical truth. A later fixed-label census need not assume physical
independence; fresh/IID/panel/unique-evidence-cost claims require their own premises.
Numeric-validity/missingness handling and any eventual loss must be frozen before
numerical label extraction, which is outside this design.

## Generated checks and stopping rule

One coherent test increment must challenge: arbitrary safe unfamiliar names
without revealing them; case/prefix/reserved-name collisions; type precedence,
duplicates, coverage and known-type conflicts; general relationship base resolution,
external/escape/dangling/relationships-to-relationships and unknown Type handling;
unchanged strict root/workbook role failures; opaque-payload opener prohibition;
G34 replay mismatch before all XML; G32's complete atomic inventory; mapping
unbound before text; mixed roles, shared-string bounds, unresolved test joins,
all-row retention and target-value withholding. Include independently packed ZIP
fixtures, malformed XML/namespace caps, partial I/O/cleanup/output failures and
source/producer/manifest drift. Record first failures. No actual bytes in tests.

The proposed operation budget is at most two fixed runs per phase (six total),
with complete identical projections required before advancing. Each phase remains
a separate root-gated operation after its exact manifest is frozen; none dispatches
the next phase automatically. This is a single predeclared dependency chain, not
a per-field discovery loop. Root may approve this bounded route or decline it.
After that one route,
unsupported format/role/meaning, exceeded limits, missing permitted use or
unresolvable complete frame/pairing means Li **NO_GO for the current named claim**.
Preserve the source and result; do not add a new name exception, grow caps, substitute
another sheet or start a new parser milestone to force admission. Implementation
defects may receive narrowly reviewed repairs with first failures retained; any
substantive scope change returns to root, not automatic actual execution.

## This note's exposure

Read only public project code/docs, the two explicitly allowed G34 public receipts,
allowed operation-final/bindings/root-review records and retained primary standards
text/metadata. No Li raw object/private capture, member name/type, new network,
production guard, test or actual-source operation was read or run. The full OPC
page/ZIP/PDF/text are excluded from publication; retain our paraphrase, clause
references and source identities only. Source identity is not scientific validity.
