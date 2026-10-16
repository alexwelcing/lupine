# Li v3 capture and envelope checkpoint

2026-10-16. Root reviewed the separately implemented Li-specific custodian and
its [independent synthetic review](independent/review.json). The source at this
candidate checkpoint is SHA-256
`3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234`.
No actual workbook was acquired or inspected at this checkpoint.

The tool pins the documented v3 archive and validates whole-object size/MD5
before storing a sealed local copy. Cache-only inspection opens just the four
approved ZIP/XML envelope members. It masks unknown names, leaves scientific
counts unknown and always returns `BLOCKED_SCHEMA`; an ordinary workbook
outside the narrow profile can also return `BLOCKED_LAYOUT`. This is a
controlled workflow, not an isolation claim against hostile Python code.
Production uses POSIX directory-descriptor and no-follow guards in the supported
Linux execution environment; this is not a portable Office workbook reader.

Actual checks on the ignored candidate:

- Author suite: **13 PASS**, 0.153 unittest seconds; actual second command
  elapsed 0.486 seconds. The [first attempt](author/receipts/author-first/execution.json)
  had one instrumentation failure because a read spy also observed fixture ZIP
  writes. The correction constructs the fixture before spying, retaining the
  exact four-read assertion. Both attempts are preserved.
- Independent suite: **12 PASS**, first invocation, 0.138 unittest seconds;
  actual elapsed 0.518 seconds. Socket/DNS access was forbidden. Tests used
  synthetic ZIP/XML bytes and temporary filesystem fixtures only.
- Root source review identified a shallow-copy alias that could mutate nested
  trusted inventory through a public report, and insufficiently closed capture
  receipt validation. The corrected source uses detached copies and canonical,
  type-sensitive closed receipt validation. Independent tests challenge both.
- The independent review checks output restrictions, decompression boundaries,
  malformed ZIP/XML, redirect and filesystem guards. Real capture, acceptance
  of the production source guard, package inclusion and exact-commit CI are
  **not established by these synthetic passes**.

Root's next action is promote the five source/test/contract/inventory files,
run integrated checks and publish/verify their exact commit before any real GET.
The frozen MPEA/JARVIS negatives, source versions, allocations and thresholds
remain unchanged. No fits, splits, new DFT, scientific utility or physical
qualification are claimed.

## Promotion and integrated check

Root promoted the five reviewed source/test/contract/inventory files unchanged.
The [integrated command](integration/execution.json) passed **25 tests** in
0.221 unittest seconds (0.557 actual elapsed seconds), with all five file hashes
unchanged. The planner's held full suite had nine stale probe-pin failures;
those failures are preserved and the reviewed pin repair passed 48 focused
package tests. A complete final-source CI pass remains a prerequisite to real
capture. This checkpoint has no workbook GET, worksheet decoding or new study.
