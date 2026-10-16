# Li v3 first flag-family diagnostic

This separate cache-only diagnostic refines the previously observed
`MEMBER_FLAGS` result. It leaves both old profiles and all nine old frozen files
unchanged. Every completed inspection remains `BLOCKED_SCHEMA`; source/output
guard failure is `BLOCKED_GUARD`. No result is envelope or scientific approval.

The original capture commit, canonical receipt hash, source object SHA-256,
publisher size/MD5 and five custody file digests remain pinned by the unchanged
header diagnostic. This new script additionally pins the four original header
diagnostic file digests. Before production cache access, its exact tracked script,
author test, independent test and this contract must match worktree, index and
HEAD. A later commit may run only with all nine prior bytes unchanged. Root must
publish and verify exact-commit CI before the real diagnostic; this is a
methodological gate under existing user research authorization, not a new
permission request. Ignored candidate execution cannot reach production input.

Only `diagnose --run 1` and `diagnose --run 2` are accepted. They select exclusive
fixed receipt slots under `.cache/li-v3-custody/flag-diagnostic-v1/`. There are no
URL, source, object, capture or arbitrary output overrides. The unchanged custody
no-follow regular-file reader and exclusive mode-0600 writer are reused. Original
capture identity is validated before object access; the same bounded immutable
object buffer must satisfy original size, MD5 and observed SHA-256. No network
path, recapture, cleanup, replacement or mutation of historical receipts exists.

On that same buffer, the unchanged header diagnostic `_classify` must reproduce
`MEMBER_FLAGS`. If another result occurs, this diagnostic returns
`EXPECTED_FLAG_FAILURE_NOT_REPRODUCED` and the closed original reason; it does
not search for a later flag failure. Once reproduced, a second metadata-only ZIP
parse sorts central entries by local-header offset and selects the first entry
whose flags contain a bit outside `0x800`. This is the original failing entry:
any earlier such entry would already have stopped the unchanged traversal.
Neither parse opens a member payload, decompresses, parses XML or interprets
worksheet/shared-string values. A second metadata parse error is the constant
`FLAG_METADATA_PARSE_FAILED`, without exception text.

The selected central flags/method produce exactly one category in this order,
following [PKWARE APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
section 4.4.4:

| Category | Closed predicate and limited interpretation |
| --- | --- |
| `ENCRYPTION_OR_HEADER_MASKING_PRESENT` | Any of bits 0, 6 or 13 (`0x2041`) set. Other flags may coexist; no encryption validity or decryption is claimed. |
| `DEFLATE_OPTION_FLAGS_ONLY` | Method exactly 8, at least one of bits 1/2 set (including both), and no bits outside `0x806`. Optional bit 11 is UTF-8. This does not establish local-header agreement or later members. |
| `DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD` | Bit 3 set; method 0 permits only mask `0x808`, method 8 only `0x80e`. This reports a central declaration, not actual descriptor existence, boundary or validity. |
| `OTHER_OR_MIXED_FLAGS` | Every remaining unsupported combination, including method 9/14 option-bit contexts, patched/reserved/unused bits or unsupported mixtures. |

APPNOTE sections 4.3.9.1–4 and 4.4.8–9 explain descriptor placement, signature and
size differences. Section 4.3.9.6 has a central-directory encryption exception;
encryption/masking is categorized first and is not admitted to a reader here.
No option mask is widened in either old reader and no flag is erased. Even the
method-8 option-only category requires a separately reviewed profile amendment
and remaining-header checks before any envelope XML inspection can be justified.

Output contains one family plus the prior closed diagnostic/legacy reasons,
source/capture/implementation identity and exposure fields. It contains no member
names, raw flag/method values, offsets, comments or per-member digests. Names are
decoded privately for the reused header traversal; second-parse started/completed
and family-classified flags are explicit. A source read is false before attempt,
unknown/null if an attempted read fails before completion, and true on completion.
This bounded metadata disclosure does not claim zero information or protection
against hostile Python/operator code. Scientific counts remain null, overlap is
unassessed, and fits/splits are zero. No new material result is produced.

`inspect_synthetic_flags(raw)` accepts bounded bytes only, rejects known actual
source identity, and never uses cache/network/output paths. Guard tests may stub
production context and fixed readers with fabricated bytes; they must not open
real source custody. Tests must challenge flag families and precedence, method
context, same-first-failure selection, canary nondisclosure and identity guards.

```sh
python scripts/li_v3_flag_diagnostic.py diagnose --run 1
python scripts/li_v3_flag_diagnostic.py diagnose --run 2
```

Both exit 2 because schema remains blocked. Replaying the same object is not
independent evidence, and classification is not format or scientific validation.
