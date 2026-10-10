# G15B production-wrapper independent review

**18 independent tests passed**, including 270 opaque-cell substitutions across
all 18 withheld positions. The wrapper, scanner, two test files, final amendment
and 16 historical pinned artifacts were hashed before and after the final run:
all **21 files stayed unchanged**, and every historical literal pin matched.
The full identities, command and result-log digest are in
[`production-independent-review.json`](production-independent-review.json);
the captured output is [`production-independent-tests.txt`](production-independent-tests.txt).

The reviewed wrapper SHA-256 is
`d50ce1cf06761cd080ca0fcc6516c07ef71e0a4106bba73660642c846915e33b`;
the scanner is
`8aec58a1a48c173a0750137daf320d22abe04398108a74567c28ed7f2a093775`;
the final amendment is
`7111870342b9aa5f8e6b78f481b691de9d2ae1052f38cf095fe16f1e9fa3a06e`.

The review used constructed observation rows, temporary files and a temporary Git
repository. It read the already public header and committed mapping. It did not
open the experimental cache, extract real observations, fit a model or assign
splits. The reviewer did not author the wrapper, scanner or amendment.

## Executed controls

The real Git guard accepted the constructed clean commit and rejected dirty,
missing or symlinked new and historical files. A newly committed and re-pinned
replacement still failed the comparison with the historical mapping commit.
Separate tests kept commit, mapping and scanner failures ahead of cache access.

The regular-file reader made exactly one read with a 332,127-byte bound. It
rejected oversize files, direct/ancestor symlinks, a FIFO and a directory.
Replacing the synthetic cache after capture did not change the hashed or framed
buffer. Both declared and observed known-real-source SHA guards rejected fixture
use. Mapping and scanner bytes were hash-checked before interpretation.

Every opaque position was changed across 15 values: empty/whitespace, missingness
markers, numeric and exponent text, ranges, invalid UTF-8, NUL, quotes, commas
and embedded LF/CRLF. Public metadata stayed identical after normalizing only
whole-artifact identity fields and their source-bound record-ID prefixes. No
raw formula, DOI, opaque value, or individual MD5/SHA digest was exported.

The review file intended for tracked promotion directly covers the scanner's
4,096-row, 16,384-byte field and 65,536-byte record limits, exact acceptance and
over-limit failure, quote-escape accounting, trailing empty fields at EOF, the
whole-source cap, and late framing/width/resource failures without a successful
prefix. Its coverage does not rely on retaining the earlier scratch-only tests.

Lexical tests preserve reserved markers as unresolved, separate exact identity
spellings, retain rows despite unresolved conditions, and check exact decimal
temperatures and their limits. Resealed Boolean/count substitutions, forged
scope, extra raw-text channels, bad record IDs, nonconsecutive groups and
inconsistent temperature representations are rejected. Caller/returned-report
mutations do not change fixed policy or fresh results. Atomic writes preserve
existing output and leave no partial destination after a simulated late write
failure. CLI errors stay sanitized and provide no cache or production-bypass
option. Network entry points were guarded throughout the tests.

## Finding and release boundary

No new blocker was found in the reviewed wrapper. The earlier report-alias fix
was already present; an independent regression passes. The pinned scanner's
decimal-only and record-boundary fixes remain covered. The final amendment's
opening now describes a durable pre-execution specification; its disclosure and
scientific limits are unchanged.

This supports root's review and source-freeze checkpoint. It is not evidence of
successful real extraction, CI state, physical validity, target completeness,
specimen pairing or statistical independence. Source seals establish identity,
not a signature or an independent audit of row truth. Lexical groups do not
establish chemical equivalence or registered DOI identity. Target noninterference
is conditional on valid framing and the declared resource caps. Root retains
ownership of promotion, committed-source and CI checks, and any later fixed-cache
execution; successful metadata extraction must still leave the scientific schema
unresolved.
