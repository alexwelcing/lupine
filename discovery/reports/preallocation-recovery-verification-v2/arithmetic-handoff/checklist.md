# V2 registration handoff to the independent arithmetic audit

**Source review only; actual audit not executed.** Reviewed prospective source
commit `a0624cac9abb20320629cce41f10270b9b8e2136`. The source-bound full suite and
exact CI run were still pending when this review was requested. Nothing here
asserts their eventual result, registration publication, a completed attempt,
allocation, or scientific result. The auditor and its original RUNBOOK remain
unchanged.

No registration-generation or hash-preimage mismatch was found. The distinct tag
is `mpea-t25-registration-v2`; the protocol is still `mpea-t25-archival-v1`.
The launch, supervisor, stage, public-report and audit-manifest schemas do not
become v2 merely because the registration generation changes. A possible packaged
original report still has the designated name `resources/mpea-t25-v1.json`.

## Required parent handoff, in order

1. Finish the separately reviewed prospective ceremony. Authenticate the exact
   full-suite source closure and successful four-job CI, approve the exact new
   engineering receipt, publish/authenticate the new annotated v2 tag once, and
   preserve the v1 failure. This checklist does not perform those steps or grant
   another draw. The existing protocol/source allocation registry is unchanged.
2. Supply the original **v2** terminal launch receipt, its externally verified
   full-file SHA-256 and its exact corresponding attempt directory. Separately
   authenticate the launch's parent capture, v2 tag/registration binding, process,
   supervisor markers and persisted evidence graph. Do not substitute the v1
   preallocation stop, a process recorder, a supervisor-only receipt, or a partial
   stage prefix for a successful terminal launch receipt.
3. Supply the fresh-process reproduction's terminal launch receipt, externally
   verified full-file SHA-256 and distinct corresponding attempt directory. Root
   must authenticate that it uses the same original v2 registration and the
   completed original allocation/routes. Require the reproduction command's
   execution kind `REPRODUCTION_FIXED_ALLOCATION` and original-attempt argument
   to identify that original. The original command uses `PRODUCTION_ARCHIVE`
   and no original-attempt argument. No new entropy or second scientific sample
   is permitted.
4. Require both receipts' `operational_status` and `study_status` to agree, and
   require the same accepted terminal status on the pair: `COMPLETE` or
   `NO_GO_INSUFFICIENT_DEVELOPMENT`. Both have
   `post_terminal_private_receipts_decoded=true`, hash-bound supervisor exit code
   zero and the exact ordered complete eight-stage sequence or inadequate
   three-stage sequence. A `BLOCKED`, `INCOMPLETE`, missing, interrupted or
   mismatched reproduction is preserved operationally; it is **not** handed to
   this successful-pair arithmetic auditor.
5. Authenticate the full same-registration binding on both launches, including
   commit, scientific specifications, operational amendment, implementation
   manifest, engineering/CI receipts and original registration identity. In the
   reproduction receipt require `reproduction.status=REPRODUCED`,
   `new_allocation_draw=false`, `independent_scientific_sample=false`, matching
   stage/public scientific identities, and the `original_result_sha256` link to
   the authenticated original attempt-result bytes. Preserve the launcher's
   complete-file comparison, including differences. These registration/link
   checks are parent prerequisites, not claimed new arithmetic-auditor behavior.
6. Explicitly authorize this independent review lane to read the two already
   terminal attempts' fixed private audit allowlist. Supply exact paths rather
   than asking it to discover attempts or enumerate the registry. The launch
   directory and attempt directory are distinct: the producer writes
   `launch-result.json` and `supervisor.json` together under its launch sink,
   whereas scientific files live under the supplied attempt directory. Verify
   this correspondence from the authenticated command; do not infer it from a
   convenient directory name alone.
7. Supply a new ignored manifest in precisely the format below, using the
   verified **full launch-file hash**, not its `content_sha256`, supervisor hash,
   public scientific hash or tag-object SHA. Preserve a separate operational
   note binding the exact approved v2 registration and the parent checks above;
   do not add unchecked metadata fields to this closed manifest schema.

```json
{
  "schema": "lupine.review.mpea_terminal_audit_authorization.v1",
  "original": {
    "launch_path": "/ABSOLUTE/PARENT_VERIFIED_ORIGINAL/launch-result.json",
    "launch_sha256": "PARENT_VERIFIED_FULL_FILE_SHA256",
    "attempt_directory": "/ABSOLUTE/PARENT_VERIFIED_ORIGINAL_ATTEMPT"
  },
  "reproduction": {
    "launch_path": "/ABSOLUTE/PARENT_VERIFIED_REPRODUCTION/launch-result.json",
    "launch_sha256": "PARENT_VERIFIED_FULL_FILE_SHA256",
    "attempt_directory": "/ABSOLUTE/PARENT_VERIFIED_REPRODUCTION_ATTEMPT"
  }
}
```

This is a template only. No actual manifest, attempt path, new registry key or
scientific output was created by this review.

## Invocation after both authenticated handoffs

Confirm the unchanged auditor source SHA-256 is
`4c8bc724b35ae30197b741c566fa2ab9bc7202091eb1be94800b9863ec371fea`.
Confirm the original RUNBOOK SHA-256 is
`b9edd9307844b1977bc4e1c0e52dd41e27e36fe6082f9dcd5bebe9a4e7ba6776`.
Use an existing trusted ignored review directory and new, nonexisting output
and log files. The output location must be outside both scientific attempts.
Do not replace an earlier audit receipt or reuse this source-only review folder
as though it already contains actual authorization.

```sh
python -B /workspace/lupine-discovery-branch/discovery/.cache/mpea-actual-result-audit/audit_terminal_results.py \
  --terminal-manifest /ABSOLUTE/PARENT_SUPPLIED_TERMINAL_MANIFEST.json \
  --output /ABSOLUTE/NEW_IGNORED_AUDIT_DIRECTORY/arithmetic-audit.json
```

Record the exact command, source/manifest hashes, exit code, output checksum and
complete fixed-code stdout/stderr in fresh files. Both terminal gates run before
either private audit phase. Any failure is retained with its original evidence;
do not modify truth, ranking, calibration, populations, budgets, gates, source
inputs or allocation to obtain a pass. A stopped original has no fabricated
reproduction or arithmetic success result.

## Hash and result interpretation

| Artifact | Checked representation |
| --- | --- |
| Registration/parent capture internal content seal | Sorted compact ASCII JSON, no terminal LF; authenticated by the parent registration path |
| Upstream metadata content seal | Sorted compact ASCII JSON plus one LF; authenticated before execution, not reread by this arithmetic auditor |
| Launch/attempt-result/private stage content seal | Sorted compact UTF-8 JSON plus one LF; exact rational strings preserved |
| Private stage scientific seal | Same encoding; omit usage/content/scientific seals, retain reduced scientific registration and semantic input identities |
| Public projection content/scientific seal | Sorted compact ASCII JSON plus one LF; public scientific preimage normalizes original/reproduction to `registered_study` and excludes usage |
| Supervisor | Exact captured-file SHA-256; resource decimal tokens are uninterpreted strings and are not rehashed as scientific values |
| Handoff launch hash | Exact original file bytes, independently supplied by the parent |

The newly registered original and reproduction must agree on their scientific
identities and independently recomputed arithmetic. They are not compared to
v1 scientific identities: the v1 attempt stopped before any scientific result,
and a different registered commit/manifest legitimately changes scientific
preimages. Timing/resource measurements can change full-file hashes while
scientific identity remains equal. Artifacts without a scientific seal report
that comparison as null.

An audit `PASS` means its arithmetic and identity checks passed, not that the
archival usefulness verdict is GO. COMPLETE can retain the frozen negative
verdict. Inadequate development keeps every performance/calibration/gate field
unavailable and its scientific verdict null. Reproduction is computational
repetition, not independent evidence or a new exchangeable panel draw.

The audit trusts already authenticated source parsing and the frozen supplied
non-primary schedules. It independently checks arithmetic and revealed prefixes,
not source parsing, model fitting, feature generation, random/hash rank
generation, physical truth, registration ceremony, or exchangeability. This
separation is unchanged from the reviewed original RUNBOOK.
