# Notebook and header checkpoint verification

This report retains completed engineering checks for commit
`a6e87c198d8116d26c523e0e1b2eedce4aeb225b`. It is a publication scaffold:
**CI is pending in this bundle, and no actual notebook or compatible-header
diagnostic execution receipt is included.** Root must append and verify those
records separately before reporting that those operations ran. The
[checkpoint](checkpoint.json) keeps completed and pending states explicit.
No scientific claim is promoted by this report.

The [retained-package execution](clean-package/0-execution.json) completed
successfully at 08:23:33.751179 UTC on 2026-10-16, taking 24.747 seconds. The
[strict retained-artifact verifier](clean-package/1-execution.json) completed at
08:23:35.021839 UTC, taking 1.237 seconds. Both returned exit 0 and held all
323 runtime files, HEAD and the clean worktree unchanged. Original stdout and
stderr are preserved next to each receipt. The
[artifact manifest](clean-package/release-artifacts.json) identifies the exact
wheel and source archive, including their hashes and the installed checks.
Those binaries remain in their original retained directory and are not copied
into this report.

The [independent byte audit](independent-artifact-review/actual-a6e87c/review.json)
matched all 3,172 source-archive files to the published Git blobs, all 323
runtime files to the manifest/worktree, all 114 wheel RECORD content digests,
and all 108 package payload files to source. The wheel has 115 members. All
16 required installed checks and the fixed probe remain intact, including the
IID and finite-population planners and the existing MPEA interface/resources.
These are checks of the recorded engineering evidence; the auditor did not
rerun installed behavior or verify remote CI.

The [additive-source audit](independent-artifact-review/additive-review.json)
verified all 317 baseline runtime pins against actual Git bytes at
`4492858d9e55ddfa3cca2e208063799517948b13`. Every baseline runtime file remains
unchanged, and exactly six scripts/tests are added: the notebook methods and
compatible ZIP diagnostic scripts with their author and independent tests.
The eight new script/test/contract files match published candidate receipts,
Git, source archive and worktree. All 108 wheel package payloads equal the
complete baseline Git package. Wheel archive bytes differ; the measured
nonpackage content delta is empty. The new scripts/tests are source-archive
contents, not additions to the installed wheel package.

The first additive audit encountered an auditor working-directory/pathspec
error, before baseline-byte comparison. Its
[failed receipt](independent-artifact-review/additive-first/additive-review.json),
source and logs are retained, as is the exact Git-error reproduction. The
corrected audit passed. An
[independent source reviewer](independent-artifact-review/independent-source-review/source-review.md)
checked the original auditor, extension, failure attribution and recorded
receipts. No product/package failure is inferred from the audit-script error.

The [compatible ZIP decision map](prospective-compatible-zip-decision/README.md)
is **prospective source-only guidance**, not an observed diagnostic result.
The actual failed category remains unknown here. In particular,
`HEADER_PROFILE_ACCEPTED` would conflict with the pinned earlier same-source
`ZIP_LAYOUT_UNSUPPORTED` result and would require discrepancy investigation;
it would not satisfy the documentary-layout gate by itself. All branches
retain the blocked scientific schema and unknown scientific counts.

[copy-map.json](copy-map.json) binds every copied input to its original path,
byte count and SHA-256. Copies retain their exact bytes, including historical
errors and original execution paths. [inventory.json](inventory.json) binds
the complete current scaffold and excludes itself. Root may extend the report
with new completed evidence and must preserve these original records. No
wheel, tar archive, private object, notebook or workbook is embedded here.
