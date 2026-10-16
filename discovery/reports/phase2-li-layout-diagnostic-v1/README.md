# Separate Li ZIP-header diagnostic: implementation checkpoint

The actual Li v3 envelope is blocked before decompression; its generic ZIP code
cannot identify the cause. This separate diagnostic keeps the original custody
script/profile, capture receipt, opaque object and five frozen files unchanged.
It reports only a closed first-failing-header category and the corresponding old
ZIP reason. Header acceptance also remains BLOCKED_SCHEMA. It never opens or
decompresses member payloads, decodes XML, or publishes member names/field values.
Raw-buffer and metadata/name parsing are declared; interrupted object reads
report unknown partial exposure. This is a workflow guard, not hostile-code
isolation, and limited metadata disclosure does not mean zero information.

The new production source requires worktree/index/HEAD identity for four new
files plus the exact five old file digests. The historical capture commit,
canonical receipt and object hashes are pinned independently of the new commit.
Only two exclusive fixed receipt slots are allowed; there is no network or
object/version/path override. The [contract](../../docs/li-v3-zip-diagnostic-plan.md)
requires publication and verified exact-commit CI before actual use.

**Executed synthetic verification:** 13 author tests pass after the explicit
partial-read exposure correction. The initial 12-test pass is retained. Eight
independent tests pass on each of two runs; the second changes only scratch
parent-directory creation for clean-checkout portability. The earlier file and
both executions remain retained. They challenge invalid opaque deflate bytes,
forbidden payload/XML/network calls, nondisclosure canaries, first-failure order,
header bounds, exact old-capture reconstruction/mutations, changed source/index,
symlink output conflicts, object verification and partial reads. No actual object
or private capture was accessed by implementation or review.

After exact promotion, **46 integrated tests PASS**: the existing 25 custody
checks plus the 13 author and eight independent diagnostic checks. Unittest time
is 0.369 seconds; the recorded subprocess took 0.907 seconds. All 306 runtime
files remain unchanged. These are uncommitted-source executions, not final CI
or a real-source diagnosis. The independent source/contract review found no
blocker. Exact files, commands, logs, timings and scopes are retained below.

Root next publishes this completed increment, verifies exact remote/CI and clean
package, then runs the frozen header diagnostic. No cause is inferred before
that execution. Pairing, conditions, counts, overlap and independent units remain
unknown; no fits, scientific allocations, DFT or old-test tuning occurred.
All prior scientific NO-GO results remain unchanged.
