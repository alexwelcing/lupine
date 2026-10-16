# Li v3 ZIP-header diagnostic contract

This separate diagnostic explains the first failing ZIP predicate of the original
strict custody profile. It does not amend that profile, decompress a member,
inspect XML, or establish a scientific schema. Every completed diagnostic returns
`BLOCKED_SCHEMA`, including `HEADER_PROFILE_ACCEPTED` (headers only).

The captured source is fixed to the original 5addf4f80e345afa50a4bcc26b9db24d220a3af5
receipt, SHA-256 `13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009`,
and object SHA-256 `9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa`.
Original publisher size, MD5, inventory and all five frozen custody file digests
remain exact. Capture implementation and new diagnostic implementation identities
are separate. A later commit may run only if the old files remain unchanged and
the new script, author test, independent test and this contract match worktree,
index and HEAD. No historical receipt/object is rewritten or recaptured.

Before any production cache read, the tool requires its exact tracked script
path and source guards. Root must publish and verify exact-commit CI before the
real diagnostic. This is a methodological gate within the user's authorization,
not a new approval request. The ignored candidate cannot run production.

Production accepts only `diagnose --run 1` or `diagnose --run 2`; these select two
exclusive fixed public receipt slots below
`.cache/li-v3-custody/zip-diagnostic-v1/`. There are no URL, object, capture, source
version or arbitrary output overrides. It reuses the unchanged custody no-follow,
bounded regular-file reader and exclusive mode-0600 writer. It validates the exact
canonical original capture receipt before reading the object, then verifies size,
MD5 and observed SHA-256 on the same buffer. No network path is called. Guard
failure writes no public receipt; stdout records a closed failure and reached
exposure flags. A guard failure is `BLOCKED_GUARD`; completed header diagnostics
remain `BLOCKED_SCHEMA`. Existing output conflicts fail without overwrite.

The header classifier mirrors the original predicate order: fixed terminal end
record, count bound, `ZipFile` central-directory parse, directory count/comment,
members sorted by local offset, name/profile checks, central-header checks, local
header agreement and boundaries, directory totals and required-member presence.
A central-directory parser exception maps to `HEADER_PARSE_ERROR / ZIP_INVALID`
before later predicates can run. First failures are not an exhaustive inventory.
The end-record category alone cannot distinguish comments from other placement
problems. Compression flags and header CRCs are compared, but payload CRCs are
not verified and decompression validity is not tested.

Public `reason` is one of the closed source-defined categories, with its matching
`legacy_zip_reason`; it discloses no member names, numbers, offsets, raw fields,
exception messages or per-member digests. Original source/implementation/capture
whole-object identifiers remain explicit. Names are decoded privately by the ZIP
metadata parser and checked against the original profile. The report records
started/completed header/name parsing and raw source-buffer reads. The target-bearing
read field is false before a source read, null while a read may have failed after
partial exposure, and true once that read completes. Metadata can
contain scientific information, so this limited categorical disclosure does not
claim zero information or isolation against hostile Python/operator behavior.

No member is opened, decompressed or XML-decoded. Worksheets, shared strings,
formulas, target validity and eligibility remain uninspected; all scientific counts
remain null and fits/splits remain zero. A header result cannot resolve pairing,
conditions, source overlap, independence, catalog-count discrepancies or usefulness.
The existing two `ZIP_LAYOUT_UNSUPPORTED` envelope receipts remain unchanged.

`inspect_synthetic_zip(raw)` is a bounded bytes-only fixture API, rejects the real
source identity, and never uses cache/network/output paths. Synthetic tests compare
legacy reasons and challenge ordering, malformed headers, opaque corrupt payloads,
canary nondisclosure and production guards. Test success does not diagnose the
real object. The actual diagnostic requires its separate published checkpoint.

```sh
python scripts/li_v3_zip_diagnostic.py diagnose --run 1
python scripts/li_v3_zip_diagnostic.py diagnose --run 2
```

Both commands exit 2: scientific schema remains blocked. A second execution is a
computational replay of the same object, not independent evidence.
