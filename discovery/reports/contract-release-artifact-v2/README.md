# Clean repaired-source release artifacts

Actual commit `9704ef46c1d0ab098dabb083199403a6296f7cf6` passed all three
commands: isolated installed-wheel probe (28 cases/six schemas/12 checks), strict
retained-artifact verifier, and independent exact wheel/source payload comparison.
Git and source snapshots stayed unchanged. The optional actual MPEA report was
absent; packaged JavaScript was served exactly. This is engineering evidence,
not a scientific result or full-suite/CI approval.

The source archive contains 2,008 files; the runtime manifest checks 290 entries.
The wheel has 111 members; all 104 runtime and two license payloads match source.
The wheel hash is `2509d5aa9b7f3ce68db625f23dbcb05a0ec42f5cb56910d769266944758af129`.
The archive hash is `a29974559b9cc613631042f4763e8886a66b9a6f0e3d7bf4b0365998d898e14b`.
Binaries remain in ignored retained storage, separately identified in the receipt.

[The exact safe-copy ledger](copy-ledger.json) preserves the 19 command/log/receipt
files, including actual execution and independently scoped byte audits. These
local bytes are not a download from GitHub Actions artifact storage. The earlier
478208f successful package and failed obsolete auditor remain in the
[repair record](../retained-auditor-repair-v1/README.md).

Exact original-branch CI now passes: [Discovery Verify 38095426716](https://github.com/alexwelcing/lupine/actions/runs/38095426716) completed all four jobs successfully at 9704ef4, and the observed remote branch still matches. [The official response](official-ci.json) retains individual job IDs/outcomes. The separate local full339-source run was still in progress when this CI evidence was collected; registration still awaits that actual completion and explicit root engineering approval.
