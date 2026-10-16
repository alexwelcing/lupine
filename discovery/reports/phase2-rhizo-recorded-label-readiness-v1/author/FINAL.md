# Generated recorded-label candidate ready for root review

Held source SHA256:
`13f1f4ee41947eff4b47faaa0a3463af96363fbc8c09d6a9d398d76d78f9d647`.
The [contract](contract.json) was frozen before implementation; the
[README](README.md) defines the exact interfaces, number semantics and exposure
states. This candidate has opened **no retained source object**, created no
production manifest and made no actual invocation.

The first [author execution](first-author/execution.json) passed all **30
methods**, from 2026-10-16 12:08:04.430484 to 12:08:05.827727 UTC: 1.009 seconds
unittest / 1.397255 seconds process, exit 0. Candidate files and all 332 held
runtime files were unchanged. The audit hook recorded zero forbidden events.
Original tests, source, contract, stdout and stderr remain preserved.

The sole independent reviewer prepared its challenges before seeing candidate
results. Its first invocation stopped before tests because its guard rejected
Python's candidate bytecode-cache read. The second invocation failed because
the guard resolved `dir_fd`-relative temporary-file cleanup names against the
project working directory. Both failed harness runs are retained; neither is
reported as a pass. The reviewer loaded held source bytes directly and ran from
its own temporary work directory without changing candidate or test bytes or
weakening the guard.

The third independent invocation passed **19/19 methods**, 1.860 seconds
unittest / 2.333466 seconds process, with zero guard violations and unchanged
source/all 332 runtime files. The independent bundle is separate at
`.cache/phase2-rhizo-recorded-label-review-v1`. No candidate failure or subsequent
candidate repair occurred. The earlier source-only partial-materialization
finding was resolved before the first author run and remains recorded in
[pre-hold-review-finding.json](pre-hold-review-finding.json).

Generated tests challenge exact large integer/decimal tokens, signed zero,
engineering bounds, forbidden coercion, missing/invalid/duplicate labels,
literal contexts/units, separate citations/tolerances, full graph retention,
strict JSON bounds, partial interpretation/parse exposure, one bounded source
read, reservations, identity drift, symlinks and failed private/public writes.
They do not establish actual label completeness, historical reference choice,
physical truth or benchmark performance. Every result remains `NOT_ADMITTED`
with reference choice `UNKNOWN`; no reference-container access or comparison is
implemented.

For publication, follow [publication-layout.json](publication-layout.json):
preserve the ignored original stderr and copy its lossless UTF-8 JSON wrapper
when tracked whitespace checks require it. Root owns any later fixed manifest,
actual scope approval/invocation and tracked changes. No automatic continuation
into numerical evaluation is authorized by these generated passes.
