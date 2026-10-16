# Complete-route C feasibility — final prospective advisory

This source-only review finds two concrete discoverability gaps in pure5fd1 and
the proposed inventory-v1 interface: full workbook sheet names are withheld,
and C requires nonempty metadata/endpoint column bindings even if all rows are
unresolved. No actual workbook or private receipt was read. The original row
advisory is preserved separately; root accepted its default-UNRESOLVED policy
in principle. The following final consolidation remains advisory for root.

## What the current interfaces actually expose

Pure `_package` reads and validates workbook names and one-to-one worksheet
relationships privately, but publishes only five package status/count fields.
A publishes layouts for the exact two documentary roles, not the other names.
The proposed `interface.inventory-v1.json` explicitly keeps A unchanged and
adds only cells from those two roles in B. Publisher evidence names these two
roles but does not supply a complete exact current-workbook sheet inventory.
Consequently, neither exact non-documentary names nor complete sheet coverage
is guaranteed available before C. Do not guess `Sheet1`, `Data`, an ordinal,
or the sole remaining worksheet's scientific meaning.

## Smallest sheet-identity amendment

Add one atomic, complete all-sheet manifest to A from workbook/relationship
metadata it already validates. Preserve order or canonical sorting explicitly.
For every validated worksheet, expose its exact bounded sheet name and its
validated one-to-one internal-worksheet binding status. The fixed two names can
be tagged documentary; every other semantic role stays UNASSIGNED. A bounded
relationship identifier may be exposed if the contract needs an explicit
association, but C already binds by exact name and can recompute the internal
mapping; arbitrary member-target disclosure is not necessary.

Retain the existing maximum128 sheets, name31 and existing relationship-ID
bound128 characters, package checks and2MiB output cap. Include hidden sheets
rather than selecting by visibility. No new member is opened. Names are new
researcher-visible literal text and may contain incidental empirical content;
record that disclosure and do not claim semantic safety. Never infer DATA role
or scientific independence from a name, ordinal or relationship. Authenticate
and compare the whole manifest during B/C replay, not merely a count.

## Remaining C prerequisites and their source

| C prerequisite | Available before C? | Required disposition |
| --- | --- | --- |
| Exact source and A/B identities/producers | Fixed custody plus authenticated successful receipts | Revalidate and recompute on the same immutable buffer. |
| Complete exact sheet names/associations | Not currently public | Add the bounded A manifest above before any actual call. |
| Scientific record role versus documentary/excluded role | B may explicitly document it; names alone do not | Keep UNASSIGNED or terminal NO_GO where unsupported. Never silently omit a sheet. |
| Every explicit row coordinate/class | Not available from A/B | Root's explicit default-UNRESOLVED policy retains every actual row; known declarations must exist. |
| Literal dictionary fields and storage | B inventory exposes them within the frozen policy | C can reconstruct strict documentary assertions internally; no forged historical B receipt. |
| Actual metadata and endpoint column coordinates | Conditional: B may document coordinates, but labels/order need not identify worksheet columns | Require explicit source-supported bindings; never equate dictionary row order with record column order or infer from54/55. |
| Row/test/condition/endpoint meanings | Paper gives broad documentary claims; B may refine them | Retain source/version and unresolved meanings; no unit conversion or manufactured test identity. |
| Reference keys, joins and missingness | Conditional: B can disclose plain text, while numeric/nontext values remain withheld | Unsupported keys/storage/joins remain unknown; no invented reference labels. |
| Required per-row metadata and endpoint presence | Can only be observed in C after justified bindings | Apply frozen selected metadata/storage rules; endpoint values remain uninterpreted. |
| Provenance overlap | Requires an authenticated separately permitted target-redacted manifest | Optional absence stays NOT_ASSESSED; no independence claim. |

## One coherent conservative C fallback, if root chooses it now

Sheet names plus default rows do not alone satisfy old `_frame_binding`: it
requires at least one metadata and one endpoint column per record role. Do not
invent columns merely to pass that validator. There are two honest dispositions:
retain terminal NO_GO before C when those semantic bindings are unavailable, or
prospectively specify a structural-inventory-only role within this same C.

For that explicit inventory-only role, enumerate all and only the A-manifest
non-documentary sheets whose role is unresolved; retain every explicit row and
use UNRESOLVED for otherwise-unbound classes. Permit empty metadata/endpoint
bindings only in this mode and emit no values, semantic metadata, joins or
pairing assertions for those rows. A valid zero-length semantic binding must
never mean successful metadata readiness. Any inventory-only/unassigned role,
unresolved row or missing required meaning forces a completed negative
`NO_GO_UNRESOLVED_PREMISE`. Preserve complete structural accounting as the useful
result. Documentary-supported roles can still use the existing selected-metadata
rules in the same invocation. Unjustified exclusions must not hide a sheet; it
is structurally included or the complete route blocks.

The future contract must explicitly distinguish structural completeness from
metadata readiness, including zero-row/all-header/all-note cases; absence of a
recorded row error alone is not sufficient for a claimed metadata frame. Strict
DATA classification remains a prebound premise, not an automatic result of
presence or numeric appearance. No record read occurs until source/prior replay,
all-sheet coverage and the frozen per-sheet mode are validated.

This is not an extra operation or a record preview followed by a second chosen
semantic run. The two C invocations use the same frozen binding/policy. Unknown
results remain negative; do not populate new class/column exceptions from their
contents and rerun. All original caps, supported cell grammar, no-value output,
whole-sheet machine-exposure accounting and cleanup rules remain. C may parse
character data privately; neither structural-only output nor absent numerical
interpretation means the workbook was not machine-exposed.

Root decides this final consolidation before source hold. Pure5fd1, the accepted
prior design and the already frozen documentary-inventory advisory are unchanged.
No implementation, tests, actual source operations or scientific admission are
supplied by this note.
