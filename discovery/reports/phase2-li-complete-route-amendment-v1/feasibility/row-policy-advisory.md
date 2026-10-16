# Original C row-policy advisory

Yes—the unchanged `5fd1…` contract requires advance knowledge of every explicit row coordinate.

`_frame_binding` accepts a finite `row_classes` map. After reading the worksheet, `_frame` requires `set(actual_rows) == set(declared_rows)` and uses `declared[number]`. `UNRESOLVED` is permitted only for coordinates already listed. Missing coordinates, extra guessed coordinates and an empty map against a nonempty sheet all block discovery.

A minimal prospective alternative is sound:

- Freeze `unbound_row_policy=UNRESOLVED` before actual access.
- Require every prebound coordinate to exist; reject absent declarations rather than silently dropping them.
- Enumerate all explicit XML rows, including empty rows, without expanding absent grid positions.
- Apply prebound classes unchanged. Give every other row `class=UNRESOLVED`, explicit fixed-default authority and `ROW_ROLE_UNKNOWN`.
- Retain those rows in totals and output. Do not interpret their values, extract semantic metadata, assert joins or infer DATA status.
- Enforce existing observed-row/cell/output caps before further processing; never truncate.
- Any unresolved row forces `NO_GO_UNRESOLVED_PREMISE`, while retaining the completed inventory.

Metadata extraction can continue only for already justified DATA rows under existing column, storage and provenance rules. Thus the result is complete row accounting with selectively supported metadata, not a complete semantic frame.

This does not solve unknown record-sheet identities, column meanings or unsupported exclusions: those still block before record access under the existing strict semantic-binding contract. Nor does absence of defaulted rows alone establish readiness; required identities, meanings and joins must satisfy the frozen claim-specific conditions.

The amendment fits within existing C and its two-run maximum. It needs a distinct explicit policy/interface; implementing it by silently relaxing the old exact-map comparison would misrepresent the preserved contract. No code or design was changed by this advisory.
