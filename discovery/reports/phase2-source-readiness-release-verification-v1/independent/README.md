# Prospective source-readiness artifact review

This ignored lane prepares an independent byte and metadata audit for the
source-readiness increment after commit `88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d`.
It has not run against a retained release. Preparation reads only public source,
candidate copysets, and prior public audit metadata. The script is derived from
the retained `b00541dacc…` auditor; the complete source delta is retained.

The declared runtime delta is exactly 11 changed and 6 added files, with no
removals: 345 becomes 351, and 334 baseline runtime files remain unchanged. The
independent runtime predicate scans committed Git tree members under `scripts/`,
`tests/`, and `src/lupine_discovery/`, plus `pyproject.toml`, using the existing
runtime extension contract. It compares these bytes with both manifests and with
the frozen 18-path promotion set, which includes one additional document. Runtime
mode changes are rejected. Every source archive file, including formal sources
and reports outside the runtime set, must match its committed Git blob and mode.

The wheel must contain exactly the mapped 113 package payloads: five baseline
payloads changed, three added, and 105 unchanged. Every payload is matched to its
committed source. Every ZIP member is covered by a unique, exact RECORD digest
and size, except RECORD's empty self-entry. The seven expected distribution
metadata members are explicit. Both the prior public census and new public
source-readiness snapshot retain their fixed SHA256 identities. The retained
probe report must state all 18 mandatory checks in order, 28 demonstrations,
the exact six schema identifiers, and the fixed 13/13 known-answer summary.

Before the first audit, root must supply a published full commit, completed clean
package and strict-verifier evidence, the retained directory, and its manifest
hash. The reviewer will inspect those public receipts, stdout/stderr and observed
process completion, preserve their exact identities, and write a gate review and
actual binding. That separate gate review checks execution evidence; the artifact
auditor itself does not reexecute those commands. The binding is closed and must
be supplied with its exact SHA256 on the audit command. The audit checks current
HEAD and tracked/untracked cleanliness before and after its work. Each attempt
uses an exclusive output directory; a failed first audit cannot be overwritten.

Prospective command shape:

```text
python audit_retained.py --published-commit FULL_COMMIT \
  --retained-directory ABSOLUTE_RETAINED_DIRECTORY \
  --actual-binding ABSOLUTE_BINDING_JSON --binding-sha256 BINDING_SHA256 \
  --attempt first-actual-artifact-audit
```

Do not run the command until the actual gate is complete. Candidate changes after
this preparation require a preserved prospective pin amendment. The copied root
candidate file's pending-integration status is historical, not a completed test
claim. This lane does not infer formal compilation, a count of proved statements,
CI status, scientific admission, physical validity, statistical validity,
superiority, or deterministic rebuilding from artifact identity. It does not
extract or execute artifact contents, acquire scientific data, read private/raw
scientific inputs, rerun tests, use network access, or mutate Git/tracked files.
