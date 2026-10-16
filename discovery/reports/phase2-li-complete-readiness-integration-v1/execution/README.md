# Root integrated Li readiness validation

Root's exact integrated run passed **602 collected methods**: 418 existing and
184 in the four new test files. It ran on final adapter `77dece96…` and unchanged
pure core `5fd1b06c…`, from 2026-10-16 15:28:39.186503 to 15:29:39.987217 UTC.
The recorded times are 60.078 seconds unittest and 60.798815575 seconds process,
with exit 0 and 347 held files (345 runtime plus two contract documents).
No actual Li source operation ran.

The [execution receipt](focused-first/execution.json),
[start bindings](focused-first/start.json),
[collected count](focused-first/stdout.txt) and
[full unittest log](focused-first/stderr.txt) are exact or losslessly wrapped
originals. The [promotion record](promotion.json) binds all 339 unchanged baseline
files, six added Python runtime files, two separately guarded documents and the
final eight-file copyset `b3b065ad…`. The [actual recorder source](promote_and_test.py)
is retained for reconstruction; it was not invoked by this publication assembly.

This is the first joint run of the complete portable 51-method independent
production suite on the final adapter, alongside 60 author production methods,
38 pure author methods and 35 pure independent methods. It is separate from the
earlier six author/four independent rebind checks and 13 static checks; those
counts are not added to 602. Their [final source publication](../../phase2-li-complete-readiness-production-v1/FINAL-PUBLICATION.md)
preserves the behavior, counter correction and exact two-assignment baseline
rebind evidence. That published baseline has 339 files, with the earlier reviewed
transport-test repair and 338 unchanged from its parent. Neither previous
failures nor their original receipts are overwritten here.

The 311-file production report remains unchanged. This addition contains only
root's six completed public integration artifacts and publication metadata.
It does not claim final exact-commit CI or release/package completion, and it
does not authorize actual archive access. Scientific status remains BLOCKED_SCHEMA;
synthetic tests, structural counts and hashes do not establish numerical validity,
physical truth, independence, freshness or scientific admission.

[publication-copy-map.json](publication-copy-map.json) lists all six original
identities and destinations. Where a log has trailing whitespace or blank end
lines, its UTF-8 JSON wrapper retains every byte; encode `text` as UTF-8 and verify
the original SHA256 to reconstruct it. Embedded historical `.cache` paths are
original provenance, not portable links. [publication-checks.json](publication-checks.json)
records copy identity, log binding and link checks. These publication checks are
not additional executed test methods.
