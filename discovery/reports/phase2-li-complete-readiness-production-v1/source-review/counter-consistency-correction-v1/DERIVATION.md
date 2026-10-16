# Completed-prior counter consistency correction

Root accepted these necessary predicates after the preserved adapter `540088bc…`
had its 56 author and 50 independent behavior checks. The earlier source review
and all test records remain unchanged. This newly identified contradiction must
be closed before publication; the earlier “no remaining blocker” statement is
historical to that review, not the disposition of this correction.

This derivation reads only unchanged core `5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219`
and adapter `540088bce4341b1f4137e44ef75244ada5786d000c50af597083dadbfc02c9d8`.
No reader, guard, test, archive, target input or actual receipt was executed or
opened. The planner owns generated regression execution.

## Definitions and necessary predicates

For each **completed historical A or B** result, retain the existing exact
integer checks, range `0..4096`, and equality of started/completed counters.
Write their common values as:

- `M`: member opens;
- `D`: decompressions;
- `U`: UTF-8 decodes;
- `X`: XML parses.

For completed B, let `s` be 1 when any inventory field has declared storage
`s`, otherwise 0. The existing repaired validator already ties this condition
to the inventory shared-table flags.

| Scope | Necessary constraint |
| --- | --- |
| Completed A | `M = D = U = X` and `M >= 6` |
| Completed B | `M = D`, `U = X = M + 2`, and `M >= 6 + s` |
| Authenticated same-source A/B pair | `M_B = M_A + s` |

Together the pair constraint implies `D_B=D_A+s` and
`U_B=U_A+2+s`, `X_B=X_A+2+s`; redundant checks are not necessary.
Validate individual histories when validating their priors and the pair
relation where both already-validated prior results are available, before
opening the current source for C. No new cap or permitted input is introduced.

## Source derivation

Core `_report` initializes the four counter families to zero. Adapter `_replay`
uses a separate diagnostic report and changes only header-replay state in this
report; its private operations do not increment these four totals.

Core `_package` (lines 910–943) reads each metadata name once through its cached
`metadata` helper. The four distinct mandatory names are
`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, and
`xl/_rels/workbook.xml.rels`. Additional relationship parts can increase the
count, so do not hard-code the total to the minimum. Let this actual number of
metadata reads be `k >= 4`.

Each successful `_read_member` (893–907) adds exactly one member-open and one
decompression. Each successful `_xml_tree` (864–890) adds one UTF-8 decode and
one XML parse. `_layout` (1237–1256) reads exactly two documentary roles and
uses `_parse_worksheet` (453–483), accumulating one successful decode/parse per
role into the same global counters. The role members are distinct (486–501).
The A worksheet-name manifest adds no reads or decodes. Thus completed A has
`M=D=U=X=k+2 >= 6`.

Adapter `_inventory` (410–449) reparses both already captured worksheet buffers
with `_xml_tree`, even when a role contains no explicit cells. Those two calls
add two decodes/parses and no member/decompression operation. If any shared
cell exists, the initially empty shared-state cache calls `_shared` exactly
once; `_shared` (core 1273–1301) adds one read/decompression/decode/parse.
Consequently B has `M=D=k+2+s` and `U=X=k+4+s`. A and B authenticated to the same
immutable source use the same metadata registry and cache traversal, so the
same `k` gives `M_B=M_A+s`.

## Concrete forged complete-prior example

Start with any valid generated complete A outer receipt. Keep status COMPLETE,
all package/role/manifest payloads, and both per-role read/decode/parse completion
flags unchanged. Replace **all eight** global started/completed counts with
integer zero, as specified in `proposal.json`. Canonically reseal both identical
slot receipts and update the generated fixture's pins. Adapter `540088bc…`
checks integer type/range and started=completed, so its source-level predicate
accepts these zero totals even though both role ledgers claim completion.
Same-buffer replay compares payloads and does not compare these historical
totals. This is a source-derived counterexample, not a claimed executed exploit.
The new A lower bound rejects it.

The same mutation contradicts B. Additional generated challenges can isolate
the relations: A `(5,5,5,5)`; B without SST `(6,6,6,6)`; B with SST
`(6,6,8,8)`; or a locally consistent no-SST pair A `(7,7,7,7)` and B
`(8,8,10,10)`. Every tuple is ordered `(M,D,U,X)`.

## Limits

Apply these equalities only to completed historical A/B. A failed prefix can
have unequal started/completed counts and partial progress. Full C adds strict
documentary reparses, record-sheet processing and possibly later shared-table
decoding; its complete totals do not satisfy the B formula in general.

These constraints reject impossible histories. They do not recover the actual
`k`, replay every historical counter, authenticate a fabricated producer, or
prove physical/scientific validity. Even a fabricated but mutually consistent
larger counter pair can satisfy them. Original source/receipt pins, same-buffer
payload replay and external execution/cleanup acceptance remain mandatory.
