# Separate local-growth envelope profile: preimplementation scope

Root, October 16, 2026. Implementation and generated-fixture review only. No
actual private capture, workbook object, production reader or network request
is authorized by this preparation record. Public G29 receipt
`52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e`
from `d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3` establishes only one selected
field ID/length pair: A220/516. Its payload has not been interpreted.

Purpose: a separately frozen read-only envelope profile can be prepared without
assuming a future shape result. Production must validate the exact existing G29
receipt and original capture identity, run G30's predicate on the same immutable
buffer, and stop unless that selected field matches the retained APPNOTE shape.
It must then check every archive entry under its own complete profile. A separate
actual G30 result is useful diagnostic evidence but is not substituted for the
same-buffer check. No future receipt hash is guessed or patched into a frozen
implementation after source inspection.

The old compatible-envelope source remains byte-for-byte unchanged. The new
profile retains its central-extra prohibition and every original filename,
member kind, version, method/flag, size, CRC, timestamp, offset, contiguity,
directory, encryption, regular-file and required-member predicate. Only a
nonempty local extra area gains this explicit alternative:

- It is entirely one bounded TLV record, ID A220, with data length at least four.
- The first data word is little-endian A028; the next word is interpreted as an
  unsigned initial-padding value and withheld, with semantics UNBOUND.
- Every remaining data byte is zero. No PadVal/current-size equality or
  positivity constraint is invented. Empty current padding is allowed.
- Additional, duplicate, unknown or truncated records block the profile.

This rule is checked independently at every nonempty local area, within the
original 128-member/183878-byte source caps and 65535-byte local-extra limit.
Central extras remain unsupported. It neither strips nor rewrites source bytes.
Archive construction, header validation and cleanup require explicit started/
completed/failure exposure. On every path a successfully opened archive is
closed, with a closed cleanup-error category and no raw exception disclosure.

After all ZIP checks, only the original four envelope members may be decompressed
and parsed, using unchanged XML/type/relationship/workbook helpers and limits.
The existing documentary-role projection is retained; no worksheet or shared-
string member is decoded and no numeric outcome, formula or dictionary value
is published. XML partial exposure and cleanup failure remain visible.
Envelope acceptance is narrow read compatibility under this declared profile,
not ZIP/OPC completeness, producer authentication or scientific schema validity.
All results remain BLOCKED_SCHEMA; counts of rows/pairs/groups/overlap are null,
fits/splits zero, initial-padding semantics unbound.

Production will have fixed exclusive slots, committed own source/test/contract
bindings, inherited immutable predecessor guards and no arbitrary path, URL,
producer, receipt or cap override. Actual operations require independent review,
appropriate tests, exact source publication/CI, clean package retention and byte
audit. Earlier blocked profiles and scientific negatives are preserved.

Generated tests must challenge both this extension and retained rejection rules,
all-entry enforcement, bounds, unknown/duplicate fields, cleanup and partial XML
exposure. Review must compare the copied header predicate to its frozen original.
No test or hypothetical design is evidence of actual source acceptance.
