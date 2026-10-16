# Documentary checkpoint installed reproduction

Exact report commit `cb19c0a2788cc70dbe6e78f80d416ad8f11ece74` passed the
[clean package](package-report.json) and [strict retained verifier](strict.stdout).
The package covers 28 demonstrations, six schemas and 18 mandatory checks. Root
observed the actual recorder exit 0 ([receipt](root-observed-exit.json)); the
[execution review](review.json), [package command](package.execution.json) and
[strict command](strict.execution.json) preserve actual exits and timing.

The [before](source-before.json) and [after](source-after.json) snapshots hold
all 351 runtime files, the clean exact commit, remote branch and unchanged
recorder. This is another local installation, not a repeated independent artifact
audit or independent scientific reproduction. The separate 22,005-check audit
belongs to runtime source `eaed2e7`, recorded in the
[release evidence](../phase2-source-readiness-release-verification-v1/README.md).
CI remains a separate gate. The later header-documentation commit cannot inherit
an unobserved CI conclusion from either predecessor.
