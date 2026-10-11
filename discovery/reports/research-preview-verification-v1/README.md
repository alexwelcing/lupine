# Final public-resource release verification

The authenticated original MPEA negative result is now bundled. The runtime
manifest binds 293 files; the preceding registered-source complete suite passed
1,359 tests with 343 mandatory registration files unchanged. The added resource
is exact original-public SHA `d93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274`.

[Focused actual tool observations](focused-tool-observations.json) record **55 passing focused tests**: 21 public-bridge checks, 16 package-interface
checks, 16 server checks and two runtime-manifest checks. These are actual tool
observations; no reconstructed stdout is presented as a raw captured log. The
[actual-resource browser check](../research-preview-interface-v1/README.md)
passed separately. The [clean package and two byte audits](../research-preview-artifact-v1/README.md)
passed at exact runtime source `6585a605d5d325e84423c7e35c7286efe85cfb6f`.
All four original push jobs in [Discovery Verify 38101296342](https://github.com/alexwelcing/lupine/actions/runs/38101296342)
completed successfully for that same source: Python 3.11, Python 3.12, Lean and
browser. Root observed the official response and matching remote branch at
2026-10-11T01:40:16.973611+00:00; [the response](ci/official-run-jobs-observation.json)
and [independent root check](ci/root-review.json) are retained. This reports
actual official job results, without a remote test-count, downloaded job-log or
remote binary-artifact claim.

The [runtime delta](runtime-delta.json) adds only the authenticated original
report to the preceding registered source. Later report-only closeout commits
are Git descendants; they do not change the tested runtime or the source commit
of the retained local wheel/archive. Their own remote/CI state is verified at
publication and linked from the draft pull request. The [release decision](../research-preview-decision.md)
separates these engineering results from the preserved negative scientific results.
