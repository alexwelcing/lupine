# Local-extra artifact adapter: independent source review

Reviewer: `/root/finite_inverse_check/artifact_adapter_review`.

**PASS, source review only; no concrete blocker found.** The adapter at SHA-256
`6b267cd11a73b0f73c63a7b9ae2ba75d30f9699edf14e41c5fd1f98f4932ce2a`
was read and statically compared with the prior extension at
`a9bbef30cd81cddccc3a089cf0c4109c61cb7497fc906f7fcab236aaf5b49643`.
Neither audit, package workflow, project module nor production reader was invoked
or imported. No private custody input, archive payload or network source was read.
Candidate implementation correctness and tests are outside this review.

The six helper function ASTs and complete final main guard remain identical.
The static comparison preserved 33 assertion occurrences. Exactly four prior
assertions changed: the old runtime totals and the two notebook/header-specific
published pin bindings. Twelve assertions were added, including final reviewed
pin status, baseline identity, exact path set, hexadecimal pin shape, fixed script
pin, cache path restrictions, new totals, and the three-runtime/four-pin count.
The preserved first findings are in `source-review.initial.json`; the full text
comparison is in `source-diff.txt`.

The future baseline is fixed at
`a6e87c198d8116d26c523e0e1b2eedce4aeb225b`. The adapter requires all 323 prior
runtime manifest values to match actual baseline Git bytes and remain identical
in a 326-entry current manifest. Exactly three script/test runtime paths may be
added. All four script/test/contract files must equal the supplied final reviewed
pin values in target Git, retained source archive and worktree. The script also
has a fixed, independently stated pin. The contract is outside the runtime count.

The unchanged generic auditor source is present at SHA-256
`b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119`.
The adapter requires its actual review input to report PASS for the same supplied
commit, that exact script identity and all 326 runtime files. It binds the exact
current release receipt bytes and artifact identities to that review, then
independently reads and checks artifact bytes against those identities. The
review input is required local evidence; this source review does not establish
that the generic auditor has run on the as-yet-unknown future artifacts.

All 108 `lupine_discovery/` wheel package names and content hashes must equal the
previous retained wheel and the complete a6e87c1 Git package subtree. Whole wheel
ZIP byte equality is not asserted. Nonpackage wheel content differences are
reported separately. Duplicate-key JSON rejection, exact clean HEAD before and
after, held-input rechecks, exclusive output creation and explicit assertion
enablement remain present. This is controlled local artifact auditing, not a
general adversarial archive security validator; decompressed member sizes are
not universally capped.

`reviewed-pins.pending.json`, SHA-256
`a30fadbd111588acd177c78766e5e78046349f6249ba43bedad8f79e452d2de3`,
has status `PENDING_FINAL_INDEPENDENT_REVIEW`. By inspected control flow, after
the initial exact-HEAD/clean checks it fails the required
`FINAL_REVIEWED_SOURCE_PINS` guard before any full-review or package artifact
read. This was not tested by invoking the adapter. Its three null pin values
would also fail the later digest-shape check. Root must provide final independently
reviewed pin bytes; the status string alone does not authenticate review authorship.

All adapter imports are standard-library modules. Its sole subprocess facility
is the preserved Git wrapper, used for local read-only status/object/archive
operations. No project import, acquisition, diagnostic or network command occurs.
Resolved external inputs must be beneath `.cache` and outside the Li custody
cache; the intended artifacts are public package/source evidence. A future run
still requires the reviewed concrete input paths, a committed clean checkout,
actual unchanged-auditor PASS evidence, and the final reviewed pin record.

The small companion `inspect_source.py` executed only static AST/text comparisons
and read the four public adapter/support files. Its first execution exited 0,
with empty stderr, reporting 33 preserved / 4 replaced / 12 added assertion
occurrences. That execution is source inspection evidence, not an artifact audit
or a candidate test result.
