# Bounded local-extra header candidate

The additive implementation is ready for root integration at source SHA-256
`54db58a567afc9211303f2edff13541ab2f97beb77ef2edaa518ad32bf6b1026`.
It reruns the unchanged predecessor on the same bytes, requires exactly the
sole local-extra rejection and successful cleanup, and walks only the selected
extra area's four-byte field headers. A complete ordered ID/length list is
published only after the bounded span validates. All completed inspections
remain `BLOCKED_SCHEMA`; no payload is interpreted or profile amended.

The [four-file promotion map](promotion-map.json) identifies the new script,
author tests, independent tests and contract. All 21 old guard files retain
their frozen bytes, checked by [source-only bindings](source-bindings.json)
and independent review. The prerequisite is the exact root-observed public
receipt from producer `a6e87c198d8116d26c523e0e1b2eedce4aeb225b`, SHA-256
`4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12`.
This candidate work did not read that actual receipt or the private capture
or target-bearing object. Production invocation, publication, CI, clean
packaging and actual-result validation remain separate root gates.

## Executed checks and preserved negatives

- The [first author invocation](author-first/execution.json) passed 19 tests,
  0.080 seconds reported by unittest and 0.536965282 seconds recorded process
  time, exit 0. Source and author test bytes remained unchanged. Original
  [stdout](author-first/stdout.txt) is empty; [stderr](author-first/stderr.txt)
  contains the unedited unittest output. These are exact process captures,
  copied from `.log` originals to publication-safe `.txt` names.
- The [first independent invocation](independent/first-run/execution.json)
  ran 30 tests with 29 passes and one reviewer expectation failure. It
  incorrectly expected a 65,535-character member name to pass the unchanged
  256-character predecessor limit. The original source/test snapshots and
  full process output are retained. This was not an implementation defect.
- The [final independent invocation](independent/final-run/execution.json)
  passed all 30 tests, 0.105 unittest seconds and 0.456155944 process seconds,
  exit 0. Only that reviewer expectation changed: 256 is accepted, while
  257 and 65,535 block before the locator. The implementation did not change.
  The [independent review](independent/review.json) binds its final test and
  contract. No author fixture was imported or read by that reviewer.
- [History](history.json) records a read-only source-search filename error
  before tests, and a formatting-only contract correction after the author
  pass. The earlier full contract is preserved in `author-first/`. The
  independent [preparation record](independent/preparation.json) retains a
  reviewer metadata-writer missing-import error before any test invocation.

The meaningful synthetic controls cover first/middle/128th entry selection,
the frozen path and method/flag constraints, all-or-null disclosure, unsigned
IDs, duplicates and unknown IDs, zero lengths, truncated headers/data,
65,535-byte spans, exact 256-record cap precedence, and direct locator bounds.
Opaque-body/name canaries do not affect the projection; instrumented TLV reads
touch only declared four-byte headers. Member access, decompression, XML and
network APIs are forbidden in the focused challenge. Synthetic production
stubs check source/index/commit and prerequisite ordering, partial-read state,
write faults, descriptor-close faults, and archive-close/GC stderr channels.

The separate [source review](source-review/review.json) found no blocker in
the locator induction, bounded-walk invariant, complete-or-null projection,
exposure preservation or guard ordering. Its retained AST/byte audit verified
all 21 old pins and checked the actual author/independent receipts and logs.
That reviewer did not import the candidate or rerun its tests. This is an
engineering argument and bounded audit, not a machine-checked whole-program
proof or evidence of scientific truth.

The complete-or-null list is separate from exposure. A write or close fault
retains machine exposure even when the returned list is null; a successful
write followed by descriptor-close failure may leave an earlier complete file
and a later returned guard report. Both must be retained by actual operations.
The unchanged predecessor still processes complete central-directory metadata;
the new locator stops at the first selected local span. Acquiring and hashing
the whole object is not absence of raw-byte exposure or payload interpretation.

These checks establish bounded engineering behavior only. No actual field
inventory, ZIP payload/CRC semantics, archive compatibility, cell schema,
eligibility rule, independent sample, measured performance or scientific
superiority was established. Row/pair/group/overlap counts remain null and
fits/splits remain zero. No benchmark, outcome, modeling choice, tracked source,
Git state, private source or production service was changed by this lane.

The copy map and inventory bind the exact retained bytes. Inventories exclude
themselves to avoid circular identity. Paths inside historical execution
receipts describe their actual invocation locations; the promoted tests locate
the repository dynamically. Root integration and broader validation receipts
are separate from this focused bundle. Exact-source publication and CI,
combined engineering checks, and a clean retained-package audit remain required
gates before any separate actual-source operation.
