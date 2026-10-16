# Prospective public MPEA publication audit

This is a source-bound review procedure, not an executed study, publication
approval or scientific approval. No actual attempt directory, source CSV,
private feature file, target value or allocation was opened to prepare it.
Review only the terminal paths root explicitly supplies after registered execution.

## Candidate publication allowlist

| Candidate | Permitted public content and condition |
| --- | --- |
| `reports/mpea-t25-archival-v1/original-public.json` | Exact bytes of the authenticated original worker's `public-report.json`; full frozen public schema, never a hand-edited summary. |
| `reports/mpea-t25-archival-v1/reproduction-public.json` | Exact bytes of the authenticated reproduction worker's public report, if one exists. Keep its `registered_reproduction` identity and any negative/unavailable result. |
| `src/lupine_discovery/resources/mpea-t25-v1.json` | Exact copy of the reviewed original public report. This is one frozen report object, not a wrapper containing original/reproduction reports or added provenance keys. It feeds `/api/benchmarks` → `mpea_archived`. |
| Optional `original-rank-summary.json`, `reproduction-rank-summary.json` | Only each existing authenticated `rank-summary.json`: exact closed public aggregate payload and envelope. No threshold, row/group IDs, neighbor records, orders or individual predictions. |
| Optional `original-completeness.json`, `reproduction-completeness.json` | Only each existing authenticated public `completeness.json`: original counts, endpoint-status aggregates, and declared whole-artifact identity slots. Never copy secondary-membership or vault contents. |
| `publication-review.json` and a short execution/reproduction note | New closed allowlisted review receipt: public registration/tag/commit/specification/implementation/engineering/CI identities; exact published-file hashes; original/reproduction terminal status and closed reason; authenticated stage/artifact identity comparisons; actual observation fields with their measurement scope; audit checks/results. Bind retained private operational records by whole-file hashes. No arbitrary passthrough, command, local path, raw stdout/stderr, exception text, provider transcript, or row/group assignment. |
| Existing public registration evidence | The exact previously published `lupine.mpea.public-registration.v1` tag annotation and public tag/CI/engineering identity evidence may be referenced or copied after checking its closed schema. Do not substitute a newly generated registration or tag. |

There is no recursive attempt-directory publication. Keep raw private stage
envelopes, label routes, input freeze, development rows, both target vaults,
secondary membership, full calibration/plans/replays, source/features, allocation
request/response journals and parent authorization captures private. The raw
supervisor and launch receipts are retained operational evidence; their selected
public summary and whole-file identities belong in the review receipt. The raw
launch receipt contains commands and local paths and is not the public report.

## Checks, in order

1. **Authentication and terminal.** Verify the registered original commit and
   immutable tag binding, exact approved source/specification closure and all
   four successful CI jobs. Join each terminal report to the authenticated
   launch/supervisor result, attempt-result identity, exact source triple and
   reached stage/companion graph. Require a valid terminal and actual byte
   identities; an existing stage file, clean process exit or matching hash alone
   does not establish completion. Use the registered parent audit as evidence of
   private aggregation; a public-only review cannot reconstruct that computation.
2. **Closed public schema.** Require the exact top-level, nested and dynamic-key
   shapes emitted by the frozen projector. Reject duplicate keys, nonfinite
   numbers, extra fields, bool-as-count substitutions, arbitrary text, malformed
   rationals and undeclared digest slots. Observe the 8 MiB/depth/node/string
   limits. Recompute canonical content/scientific seals with the frozen preimage
   rules. The browser/server and package equality check are presentation and
   transport checks, not this schema or provenance authority.
3. **No private disclosure.** Inspect every key and value against those shapes.
   No row/record/panel/source-group identifiers, ordinals, source-token strings,
   role-membership or allocation arrays/maps, feature vectors/formulas,
   neighbors, per-record predictions, rankings, raw endpoints, per-label/token
   hashes or local paths. Role names with counts, declared policy names,
   aggregate score histograms, labeled derived threshold/statistics and declared
   whole-source/artifact/aggregate-object digests remain allowed. A derived
   threshold can equal an observed endpoint; it is published only as the
   declared aggregate, without its row identity. This is not differential privacy.
4. **Complete arithmetic/report.** `evaluation_public.v1`, stage `evaluation`,
   status `COMPLETE`, top-level reasons `[]`; preserve the exact computed
   `GO_DESIGN_INDEPENDENT_STUDY` or `NO_GO_ARCHIVAL_USEFULNESS`. Require original
   funnel 1545/314/75 and role-group counts 35/20/20; retain all parser status and
   reason counts, unknowns and 40-panel completeness. Check both populations,
   all 24 policies, 20 completed schedules per policy, total 960, caps
   0/1/2/4/8/16/32, same-actual-K and final metrics. Keep original assigned and
   feasible-subset denominators, unavailable reasons, all failed gates and
   signed margins. No favorable control/cap selection or missing-run denominator
   shrinkage. Empty F/D components stay unavailable, with false proceed checks.
5. **Insufficient development.** An authenticated
   `unavailable_public.v1`/`NO_GO_INSUFFICIENT_DEVELOPMENT` is publishable as an
   early stop. Require development as last sealed stage, complete development
   aggregates actually below 50 complete rows or 15 complete source groups and
   exact matching adequacy reasons; no model/reserved/calibrator/policy/auditor
   consumption. Reserved summaries remain null. Calibration/performance/gates/
   component verdicts and overall verdict must all be null. Do not label this
   an archival usefulness failure or erase available development status counts.
6. **Resource/other failure.** The frozen launcher authenticates worker public
   transport only for COMPLETE and insufficient-development terminals. A
   supervisor-only timeout/RSS/interruption may have no authenticated final
   worker projection. Preserve the operational evidence and closed outer status/
   reason with null scientific verdict; leave the optional bundled resource
   absent unless an authenticated final worker projection exists. Never
   synthesize an unavailable public resource from supervisor-only failure,
   infer zero counters from absent output, copy a stale partial report or infer
   a later stage from a successful prefix. Any existing BLOCKED/INCOMPLETE
   worker projection needs its own independently established final identity and
   stage/access consistency before publication; raw existence is insufficient.
7. **Reproduction.** Authenticate the same original allocation/route bytes and
   unchanged registration; no redraw, no new independent sample. Compare the
   complete reached artifact universe, all scientific stage/companion/public
   identities and separately report every complete-file byte difference.
   Timing/content differences can coexist with scientific equality. Preserve
   MISMATCH/failure/unavailability explicitly. Reproduction of an insufficient
   development stop is reproduction of that stop, not completed usefulness.
   Failed reproduction does not license editing the original verdict; it blocks
   a claim of verified reproduction and any release tier requiring it.
8. **Packaged interface and final claim.** Hash the resource against the reviewed
   original, then check an installed wheel's resource, HTTP object and downloaded
   object match it (JSON object equality for browser export, whose formatting
   differs). Check actual desktop/mobile rendering: registered archival label,
   exact verdict/reasons, counts and all comparisons; unavailable report has no
   gates/performance tables and says no overall performance verdict. Absence has
   no measured outcome. No synthetic fixture becomes the actual resource.
   Browser success establishes display fidelity only. Retain the existing source
   attribution/license and conditional-premise caveats; GO supports designing an
   independent study, not physical qualification, deployment or unconditional
   universality. Root makes the separate documented claim-tier release decision.

The review receipt must record what was actually authenticated and executed,
which files were copied and their byte hashes, failures/limitations and the
remaining release gates. Retain original and reproduction evidence separately;
do not recalculate, retune or reinterpret already exposed targets to improve a
published result.
