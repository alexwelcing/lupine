# Generated-data candidate complete; actual operation remains pending

Final projector source is SHA256
`bab641881335f57d4571fe0d4f720696f57e5816fa36266647cdf86d0701b263`.
The [contract](README.md), [source hold](source-hold.json),
[field bindings](field-bindings.json) and [scope](scope.json) describe its fixed
two-object documentary boundary. Neither original reference object was opened.
No production invocation manifest exists in this candidate.

The first author run passed all 25 methods on source `a477032c…`, from
2026-10-16 11:38:10.179546 to 11:38:11.216093 UTC: 0.350 seconds unittest and
1.035833 seconds process, exit 0. All 332 held runtime files and candidate
source stayed unchanged; the runner recorded no forbidden events.
Its [original execution receipt](first-author/execution.json) and exact code,
tests, stdout and stderr remain preserved.

The independent reviewer then executed 13 methods on that held source: 12
passed and one failed. This was a real exposure-reporting defect. When both
JSON parses had completed but second-file context projection subsequently
failed, per-object parse flags were true while the global completion flag
remained false. The original reviewer fixture was correct and was not changed.
The first failing run remains in the independent review bundle.

The [narrow correction](source-diff.json) updates that global flag immediately
after each successful parse and requires both completed parsers. No source
identity, schema, parser bound or projection rule changed. The original source,
author test and contract are retained in `before-aggregate-parse-fix/`; a new
author regression covers the failure. The earlier moving-source synthetic
preflight exposure finding was resolved before the first test run and is
separately retained in [its finding record](pre-hold-review-finding.json).

The [final author run](final-author/execution.json) passed all 26 methods on
`bab64188…`, from 11:40:13.008357 to 11:40:14.079752 UTC: 0.406 seconds unittest
and 1.071393 seconds process, exit 0. All 332 runtime files and held source
again remained unchanged, with zero forbidden events. The unchanged independent
13-method suite also passed on this source: 0.317 seconds unittest and 0.674019
seconds process. Independent receipts and conclusions are authored separately
under `.cache/phase2-rhizo-reference-projector-review-v1`.

The checks cover exact graph joins, bounded strict JSON, decoded duplicate keys,
UTF-8/surrogates, syntax-only opaque numbers, context/field failures, private
canaries, omission of unselected/numeric fields, partial exposure, one bounded
read per generated file, slot replay refusal, symlinks and write/guard failures.
These are generated software checks; they establish no actual source-readiness,
reference choice, label completeness or scientific result. All actual claims
remain pending and actual bound reference choice stays `UNKNOWN`.

For publication, preserve the original ignored evidence and follow
[publication-layout.json](publication-layout.json). Its two lossless JSON
wrappers reconstruct the exact original unittest stderr bytes while avoiding
new blank lines at EOF in tracked text files. No execution or result is changed
by this publication representation.
