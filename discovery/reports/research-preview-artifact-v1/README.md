# Actual-resource clean release package: PASS

All three actual commands passed at clean commit
`6585a605d5d325e84423c7e35c7286efe85cfb6f`: isolated package verification
(17.069 seconds), strict retained-artifact validation (0.543 seconds), and an
independent payload byte audit (0.390 seconds). Working tree, HEAD and recorded
sources stayed unchanged throughout. [Actual execution](execution/execution.json)
is separate from the [preparation](preparation/README.md) and its synthetic tests.

The installed package passed **28 cases, six schemas and 12 checks**, including
the 13-case independent known-answer suite. These counts describe software tests,
not 28 material predictions. The original MPEA report was present, and the
installed HTTP JSON object exactly agreed with the packaged resource. Packaged
and served JavaScript bytes also matched.

| Retained artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Wheel | 294,452 | `1b883929426c1b0502ff988d3a2d2d1bd77ed158c660058c319d5c39229c7189` |
| Committed source archive | 43,898,880 | `07edb5d7b5809e79029e6e4e863ddb13eca4d2ade76503d476a6db19ce3dac20` |

The [retention receipt](release-artifacts.json),
[strict verifier output](execution/retained-verifier.stdout.txt) and
[independent byte audit](audit/wheel-source-present-contract-6585a605d5d3.json)
bind 2,210 Git files, 293 runtime-manifest entries and 112 wheel RECORD members.
The payload audit compares 105 runtime files plus both licenses; five generated
packaging metadata files are separately accounted for. The 1,664,719-byte actual
original report has SHA-256
`d93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274`
in both wheel and source. HTTP agreement concerns exact JSON values, since
serialization need not preserve the original file bytes.

Exact local binaries remain in the retained artifact directory identified by the
receipt; these reports publish evidence and commands, not a binary distribution
or downloaded remote CI artifact. The source archive includes the checkpoint's
pending release documentation; later report-only closeout edits are a separate
Git descendant. The wheel's runtime payload does not include those reports.
Rebuilding from the pinned source is supported; bit-identical wheel rebuilds
were not established.

The [copy ledger](copy-ledger.json) preserves exact safe evidence. Patch files
are losslessly wrapped in base64 JSON to preserve original whitespace. This
package check neither reruns the scientific study nor qualifies physical
performance. [Final exact-runtime CI](../research-preview-verification-v1/README.md)
subsequently passed all four jobs. The [research-preview decision](../research-preview-decision.md)
retains the negative MPEA scientific verdict.

An additional [independent completed review](independent-review/REVIEW.md)
rechecked every archive file against Git, every wheel RECORD entry, all runtime
payload bytes, command/log/clean-state joins, and actual-browser source bindings.
It passed locally and explicitly leaves final CI and physical validity separate.
