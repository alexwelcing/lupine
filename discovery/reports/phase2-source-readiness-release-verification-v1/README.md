# Source-readiness release verification

Local engineering reproduction and the independent retained-artifact audit
passed for commit `eaed2e7a00c8bb5c68d9dafb62c03ceb01ca218f`. Exact-source CI
remains pending in the frozen observation retained here. These results do not
admit scientific sources or establish physical accuracy or recommendation
superiority.

The clean isolated package covers 28 cases, six problem schemas, 13 known-answer
checks and 18 package/installed-interface checks. The final check binds the
public source-readiness resource across the installed CLI, HTTP response and
web asset. Both the package and strict-verifier commands exited zero; root also
observed the recorder's exit zero. All 351 runtime paths were held before and
after those local commands.

The independent auditor passed 22,005 checks in one invocation after inspecting
280 execution-evidence conditions. It verified 6,794 committed source files,
351 runtime identities, 113 wheel payloads, and complete RECORD coverage for
120 members, including 119 content digests. The exact tested wheel is retained
locally; no bit-identical rebuild, independent scientific reproduction or
compilation result follows from these byte checks.

- [Package report](independent/completed-command-evidence/package-report.json),
  [strict verifier output](independent/completed-command-evidence/strict.stdout),
  [recorded local review](independent/completed-command-evidence/review.json)
  and [root's outer exit observation](independent/completed-command-evidence/root-observed-exit.json)
  retain the actual local completion evidence.
- [Independent result](independent/RESULT.md),
  [complete first audit](independent/first-actual-artifact-audit/review.json)
  and [audit execution receipt](independent/audit-execution/execution.json)
  bind the single audit and its finite scope. The
  [reversible Git evidence packet](independent/completed-command-evidence/git-command-evidence.json)
  retains all ten before/after command records and streams without copying them
  again as individual files.
- [Publisher receipt](publication/published.json) binds the exact remote branch
  commit, clean worktree and [298-file copyset](publication/publication-copyset.json).
  The [first publication-scope check](publication/publication-scope-first-check.json)
  preserves a failed metadata count: two explicitly allowlisted ignored log
  files were absent from the nonignored listing. The explicit publisher then
  staged and verified all 298 files. This was not a runtime or scientific test.
- [Claims/recorder peer review](claims-review/review.json) and
  [initial findings](claims-review/initial-findings.json) preserve three corrected
  documentation issues. [Recorder preparation](recorder/README.md) and
  [auditor source review](independent/peer-review/source-review-v1.json) retain
  their prospective limits. Their earlier pending fields remain historical;
  the actual completion records above are separate evidence.
- [Frozen CI observations](ci/observations.json) identify original push run
  [38939736040](https://github.com/alexwelcing/lupine/actions/runs/38939736040).
  Browser and Lean jobs had succeeded; both Python jobs and the overall run were
  still pending. Root must observe the final result separately. Neither this
  report nor a later report-only commit inherits an unobserved CI pass.

Li's one layout operation remains blocked at `XML_PROFILE_UNSUPPORTED`, with no
second layout or dependent inventory/frame operation. Dryad's README request
returned HTTP 403; no PDF, parser or dataset was acquired through that route.
The published resource continues to report `NOT_ADMITTED` for both sources.
QM9's separate collection request also remained blocked at HTTP 403, without
manifest/data acquisition or retry. No source acquisition, production parser,
model fit, split or scientific admission occurred in this release verification.

Previously published evidence is linked rather than duplicated:
[source-readiness implementation/browser verification](../phase2-source-readiness-verification-v1/README.md),
[conditional finite-planning mathematics](../phase2-finite-planning-monotone-verification-v1/README.md),
and [claim-tier release policy](../../docs/release-validation.md).
The implementation report distinguishes 142 Python methods at a 350-path hold
from the later full 86-check browser run at 351 paths.

[The copy map](copy-map.json) identifies every retained original. This packet
contains public text only: archive/wheel bytes, private captures and raw
scientific inputs are excluded. Where trailing whitespace requires a JSON
wrapper, decoding its `text` as UTF-8 recovers the exact original bytes and hash.
Publication integrity checks only copied and checked these records; they did
not rerun the package, tests, audit or scientific operations.
