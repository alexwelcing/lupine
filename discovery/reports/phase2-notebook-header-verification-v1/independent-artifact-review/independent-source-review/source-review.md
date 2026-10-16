# Retained artifact auditor: independent source and receipt review

Reviewer: `/root/phase2_planner/ui_review`. **No unresolved source or claim-scope
blocker found.** This reviewer inspected auditor source and authorized completed
receipts, not artifact payloads, and did not execute either audit, package tests,
project code, network requests, or private scientific/custody reads.

The reviewed target is `a6e87c198d8116d26c523e0e1b2eedce4aeb225b`; the immediate
baseline is `4492858d9e55ddfa3cca2e208063799517948b13`.

The unchanged full auditor's source SHA-256 is
`b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119`.
Its completed review, SHA-256
`25d384048d0fd862b1ccc1dac304599fe97fe6bb8b38ce4eb53393e821d61303`, records PASS:
3,172 source files compared to exact Git blobs, 323 current runtime pins,
115 wheel members, 114 RECORD hashes, and 108 package payload members matching
source. It checks exact HEAD/clean worktree, complete source-copyset membership,
canonical receipt/content identity, artifact hashes, current manifest/worktree
agreement, fixed probe identities and recorded execution consistency.

The current release receipt was separately read here: SHA-256
`c7676452659b6909c874eac655e2ae337e9f1fe117402ffff2c91fc8e4a631db` matches that
full review. Package and strict-verifier execution receipts also match its
recorded hashes, commands and exact commit: both exit 0, unchanged 323-entry
runtime maps, clean worktree, and no timeout. These are inspected records of
actual runs; this reviewer did not rerun their behavior.

The separate extension source is held at SHA-256
`a9bbef30cd81cddccc3a089cf0c4109c61cb7497fc906f7fcab236aaf5b49643`.
Two source-review gaps were corrected before the final run: explicit binding of
the current receipt bytes/artifact identities to the full-auditor result, and
verification of all historical runtime pin values against baseline Git bytes.
The final source now checks:

- All 317 baseline runtime entries against their actual baseline Git archive
  bytes, with identical values preserved in the 323-entry target manifest.
- Exactly six added script/test paths for `li_v3_notebook_methods` and
  `li_v3_compatible_zip_diagnostic`, with no removed prior entries.
- All eight explicit script/author-test/independent-test/contract files against
  target Git, source archive, worktree, frozen digests and published candidate
  bindings. The two contracts are separate from the six runtime additions.
- Exact equality of all 108 wheel package member names/hashes to both the
  previous retained wheel and the complete baseline Git package subtree.
- Duplicate-key JSON rejection, held-input/source rechecks and clean exact HEAD
  at completion. Nonpackage wheel content differences are recorded separately.

The final extension result, SHA-256
`705a8098391ed8f5eda42b6530e861f8a41767f4097ef5443a9336b41a4d8c1a`, records PASS
with all those counts and no nonpackage content delta. Its execution receipt,
SHA-256 `e760af1d431b73b689991d94b5e068457a61a05ad8768b30fa62f0141769b920`,
records exit 0 in 4.410 seconds, identical before/after source hashes, and empty
stderr. Whole wheel archive byte equality is explicitly **not** claimed.

The first extension attempt is retained under `additive-first/`: it failed with
Git exit 128 because `git archive ... discovery` ran from the `discovery/`
subdirectory. The final source uses the repository parent explicitly. The first
source, failure result and logs remain; this was an audit path error, not an
observed product defect or scientific result.

These checks establish byte identity and recorded-evidence consistency under
controlled local custody. They do not authenticate scientific truth, reproduce
the science, verify remote CI, or rerun installed behavior. The addendum author
also implemented the header diagnostic, a relationship disclosed in its result;
this source review supplies separate scrutiny of the artifact-audit logic, not
an extra diagnostic execution. The auditors are not general adversarial archive
security validators: input file caps are not universal expanded-member caps.

The initial prospective review is preserved as `source-review.initial.md`.
