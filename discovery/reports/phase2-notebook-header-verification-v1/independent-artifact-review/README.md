# Published notebook/header package audit

The retained package for commit
`a6e87c198d8116d26c523e0e1b2eedce4aeb225b` passed the unchanged independent
artifact auditor. `audit.py` is byte-identical to the previously used auditor,
SHA-256 `b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119`.
Its execution took 3.289 seconds with exit 0 and empty stderr. The retained
`actual-a6e87c/review.json`, command receipt and raw logs record the result.

The audit matched all 3,172 source-archive files to the published Git blobs,
all 323 runtime files to the manifest and worktree, all 114 wheel RECORD content
digests, and all 108 package payload files to the exact committed source. The
wheel contains 115 members. The fixed installed probe and all 16 required
checks remain intact, including the IID planners, finite-population planner
and MPEA resources/interface. The 63 earlier probe assertions and nine finite
planner additions are preserved. Actual root package and strict-verifier
execution receipts, their log hashes, and the unchanged source/HEAD/clean-state
claims agree with the audited artifacts.

The separate `additive_audit.py` checks the new source scope explicitly. It
passed in 4.410 seconds with exit 0 and empty stderr, at SHA-256
`a9bbef30cd81cddccc3a089cf0c4109c61cb7497fc906f7fcab236aaf5b49643`.
All 317 previous runtime hashes were independently checked against the actual
Git bytes at baseline `4492858d9e55ddfa3cca2e208063799517948b13` and remain
unchanged. Exactly six runtime files are added: the notebook and compatible
ZIP diagnostic scripts, with each script's author and independent tests. Their
two contracts are also checked, making eight fixed new source/test/contract
files matched across published candidate receipts, Git, source archive and
worktree.

All 108 current wheel package payloads equal the complete baseline Git package
and the previous retained wheel package. Wheel archive bytes differ. The
observed nonpackage member-content delta is empty; this was measured, not
required by the checker. New notebook/header scripts and tests belong to the
source archive, not the installed package payload.

The first additive invocation failed before baseline Git-byte comparison: its
`git archive` pathspec was relative to `discovery/` and returned exit 128. Its
exact source, receipt and logs remain under `additive-first/`, along with a
bounded reproduction recording the actual Git error. The corrected invocation
runs Git archive from the repository root. An independent source reviewer also
requested explicit cross-binding of the addendum's release receipt bytes and
artifact identities to the already passed full audit; both checks are present
in the final source. This was an audit-script defect, not a package failure.

No project module, package contents, scientific notebook or workbook was
executed or semantically inspected by these auditors. No tests, production
acquisition or diagnostic commands were rerun. The addendum author implemented
the header diagnostic: this is a separate package/source custody audit, not
another independent claim about diagnostic correctness. The support reviewer
separately reviewed the unchanged auditor, final extension and recorded public
receipts. Remote CI remains outside this audit's scope. Scientific claims and
the archive's blocked status are unchanged.
