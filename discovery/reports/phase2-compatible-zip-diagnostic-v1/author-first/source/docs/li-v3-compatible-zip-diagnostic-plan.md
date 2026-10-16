# Li v3 compatible ZIP diagnostic

This separate, outcome-free engineering diagnostic localizes the first rejection
of the frozen `li_v3.xlsx_envelope.deflate_options.v1` ZIP header profile. It does
not change that profile, make the archive acceptable, decompress any member, or
permit documentary interpretation. Every diagnostic result remains
`BLOCKED_SCHEMA`; row, paired, source-group and overlap counts remain null,
overlap is `NOT_ASSESSED`, and fits and splits remain zero.

The actual compatible-envelope runs from producer
`4492858d9e55ddfa3cca2e208063799517948b13` both stopped with
`BLOCKED_LAYOUT / ZIP_LAYOUT_UNSUPPORTED` before any decompression or XML
decoding. The fixed run-1 public receipt has SHA-256
`7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07`.
Source review found no accidental reentry to the original flags validator:
the compatible envelope calls its own compatible structure function directly.
The earlier `DEFLATE_OPTION_FLAGS_ONLY` result concerned the first rejected
entry under the old profile; it did not attest to every entry or later header
predicate. The reason for the actual new failure is unknown until this
separately frozen diagnostic is executed. The two-documentary-sheet layout
proposal remains blocked by its unmet envelope prerequisite.

## Inputs and boundaries

The synthetic API is `inspect_synthetic_headers(raw: bytes)`. It accepts exact
`bytes` only, bounded by the existing 183,878-byte source cap, and rejects the
known actual source identities. It exposes no file, URL, producer, receipt or
production-path override. Tests build only synthetic byte strings and forbid
network, member opening, member extraction and decompression. Python functions
and monkeypatchable globals are controlled-workflow interfaces, not a hostile
code security boundary.

The production command is:

```text
python scripts/li_v3_compatible_zip_diagnostic.py diagnose --run 1
python scripts/li_v3_compatible_zip_diagnostic.py diagnose --run 2
```

Each invocation requires the canonical committed script location, equality of
the script, author tests, independent tests and this contract to both index and
HEAD, and all 17 unchanged predecessor source/test/contract/inventory pins.
Only fixed, exclusive run-1/run-2 public output paths are available. The existing
descriptor-based no-follow/exclusive helpers remain unchanged. The exact
prerequisite receipt bytes are hash checked before the original capture receipt
and then the original pinned object are read. The original capture and object
size/MD5/SHA-256 checks still apply. Receipt identity binds the observed public
receipt; it does not independently prove the truth of that receipt or physical
truth. Source publication, actual CI and clean package verification remain root
workflow gates before any actual execution.

## Categorization contract

The primary verdict follows the frozen compatible function's ordering. It
examines the end record, bounded directory, names, then members in local-offset
order, and stops at the first rejected group or member. It maps **all true
predicates in that rejection group** to fixed categories. It never publishes
member names, ordinals, offsets, flag values, sizes, timestamps, CRCs, payload
text, cell coordinates or individual member hashes.

| Frozen rejection group | Closed categories in predicate order |
| --- | --- |
| Raw length | `HEADER_TOO_SHORT` |
| End record | `END_SIGNATURE`, `END_DISK`, `DIRECTORY_DISK`, `END_COMMENT`, `END_ENTRY_COUNT`, `DIRECTORY_END_ALIGNMENT` |
| Entry count bound | `MEMBER_LIMIT` |
| Parsed directory | `DIRECTORY_ENTRY_COUNT`, `DIRECTORY_COMMENT` |
| Canonical member helper | `MEMBER_PATH_PROFILE` |
| Name agreement/uniqueness | `MEMBER_NAME_TRANSFORMED`, `MEMBER_NAME_DUPLICATE` |
| Allowed component-kind helper | `MEMBER_KIND_PROFILE` |
| Central entry | `MEMBER_FLAGS`, `MEMBER_COMPRESSION`, `MEMBER_VERSION`, `CENTRAL_EXTRA_PRESENT`, `CENTRAL_COMMENT_PRESENT`, `MEMBER_FILE_TYPE`, `MEMBER_DIRECTORY_ATTRIBUTE`, `STORED_SIZE_MISMATCH`, `LOCAL_OFFSET_LAYOUT` |
| Available local header | `LOCAL_HEADER_BOUNDS` |
| Local entry | `LOCAL_SIGNATURE`, `LOCAL_VERSION_AGREEMENT`, `LOCAL_FLAGS_AGREEMENT`, `LOCAL_TIME_AGREEMENT`, `LOCAL_DATE_AGREEMENT`, `LOCAL_METHOD_AGREEMENT`, `LOCAL_CRC_AGREEMENT`, `LOCAL_COMPRESSED_SIZE_AGREEMENT`, `LOCAL_UNCOMPRESSED_SIZE_AGREEMENT`, `LOCAL_EXTRA_PRESENT`, `LOCAL_NAME_AGREEMENT`, `MEMBER_DATA_BOUNDS` |
| Final layout and required names | `LOCAL_DIRECTORY_ALIGNMENT`, `DIRECTORY_SIZE_TOTAL`, `REQUIRED_MEMBERS_ABSENT` |
| All header predicates accepted | `HEADER_PROFILE_ACCEPTED` |
| Parsing/internal header failure | `HEADER_PARSE_ERROR` |

The two name helpers retain their existing aggregate categories; the diagnostic
does not expose private names or invent more granular semantic interpretations.
The exact method-8 allowed flag mask remains `0x806`; other methods use `0x800`
before the existing compression-method check. The existing 1–128 member bound,
metadata/profile checks, stored-size equality, every local/central agreement,
contiguous layout and required four envelope component names remain unchanged.
No new requirement is imposed on ignored producer metadata or opaque member
payloads. Header acceptance is not CRC validation, XML validity or envelope
acceptance.

`reason` is the first primary category. `primary_categories` records the
original first rejection group. `compatible_reason` preserves its existing
coarse reason (`ZIP_INVALID`, `ZIP_LAYOUT_UNSUPPORTED` or `ZIP_LIMIT`), or
`HEADER_PROFILE_ACCEPTED` if no header predicate rejects. `first_rejection_stage`
is one of the declared closed stages. A parser exception yields only the fixed
`HEADER_PARSE_ERROR / ZIP_INVALID` classification; exception text is never
published.

One bounded addition prevents another round of one-predicate diagnostics. When
a central entry fails, the diagnostic may also compare **that same entry's**
local header, only if its offset equals the already established contiguous
position and all 30 fixed header bytes precede the directory. These checks are
explicitly additional to the original short-circuit path:
`supplementary_local_categories` keeps their findings separate, while
`categories` concatenates primary and supplementary categories. No subsequent
entry is checked after rejection. `same_entry_local_checks` is `CHECKED`,
`NOT_SAFE_OFFSET`, `UNAVAILABLE_BOUNDS`, `PARSE_ERROR`, or `NOT_REACHED`.
If a supplementary parse fails, the primary classification is retained and the
local scope is `PARSE_ERROR`; the diagnostic does not guess a local cause.

## Exposure and failure reporting

Production necessarily reads the entire raw workbook byte buffer privately to
verify its identity. This includes target-bearing bytes. Header parsing also
privately decodes central-directory member names through `zipfile.ZipFile`.
Neither exposure is equivalent to numeric outcome interpretation. Started and
completed flags distinguish attempted raw reads and directory-name decoding;
an interrupted raw read retains `target_bearing_source_bytes_read: null`.
No `ZipFile.open`, `read`, extraction, CRC test, decompression, XML parsing,
worksheet decoding or shared-string decoding occurs in this stage.

The `archive_close_started`, `archive_close_completed` and
`archive_close_error` fields separately record cleanup. A close failure keeps
all actual exposure and the completed primary classification, and sets the
fixed `ARCHIVE_CLOSE_FAILED` cleanup error. It does not reset the report to an
unexposed guard state. Output descriptor cleanup failures similarly preserve
the current report and produce the fixed `BLOCKED_GUARD / INTERNAL_FAILURE`
return. As with other exclusive writes, the returned report may differ from a
receipt already written if a later cleanup fails; retained execution logs must
be reviewed along with the immutable receipt.

The CLI prints only closed reports and exits 2, including header acceptance.
Guard failures remain `BLOCKED_GUARD`; no raw exception, path or signed URL is
printed. A valid engineering diagnosis grants no scientific schema, numeric
validity, sampling independence, eligibility, model selection or discovery
claim. The next action is determined from the actual frozen diagnostic result,
not from synthetic fixtures. Any later parser-profile change requires its own
review and preservation of these negative results.
