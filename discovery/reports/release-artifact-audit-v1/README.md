# Independent retained-artifact audit

The completed local bundle for commit
`2a09d36491e092e851a529e58000444f3b6479e2` passed this independent audit.
`local-audit-v1.json` records the result; `validation-v1.json` binds the verifier,
eight passing synthetic tests, their complete log, and unchanged artifact bytes
before and after execution. `local-first-check.json` preserves the preliminary
successful check before the additional exact manifest-coverage check. No actual
artifact or synthetic-test failure occurred.

Verified locally:

- Receipt canonical ASCII JSON with its trailing newline and content seal.
- Wheel: 238,796 bytes, SHA256
  `2fd062dfeb02a9b2a7a3ffbb5fe91acc23c2bcffb3f0ce447195cc18d0441a62`.
- Source tar: 7,168,000 bytes, SHA256
  `989ffaff6d7404fb6b4e439e8b3fc57e91fc8d6a649711a6c7c56cc9c4262586`.
- Every one of 458 archived files matches its original Git blob at the expected
  commit. The source copyset is exactly `discovery/` and the verification
  workflow; no link or forbidden cache path appears.
- The committed runtime manifest binds exactly 183 source files under its
  declared inclusion rules.
- All 109 wheel members have correct ZIP CRCs and RECORD lengths/digests.
- Recorded smoke claims include 28 case identities, the six expected problem
  schemas, a passing isolated installation, zero known-answer failures and all
  ten named probe checks.

This reads archive bytes without extraction, imports or execution. It does not
rerun the installed probe, rebuild the package, authenticate the publisher,
establish deterministic builds, or validate scientific claims. The receipt's
smoke assertions remain recorded execution claims; checking their shape and
artifact bindings is distinct from independently repeating that execution.
RECORD verification also does not independently prove that the wheel was built
from the archived source; that relationship remains the original executed
build/smoke receipt's claim.

The verifier is reusable for downloaded copies of the same release profile:

```sh
python reports/release-artifact-audit-v1/verify_retained_artifacts.py \
  --directory /path/to/extracted-artifact-bundle \
  --commit 2a09d36491e092e851a529e58000444f3b6479e2 \
  --repository /path/to/lupine
```

Pass a directory containing only the source tar, wheel and
`release-artifacts.json`. The supplied Git repository must contain the bound
commit and its original objects; its current worktree may differ. The script
prints JSON and exits zero only on PASS. Missing artifacts produce NOT_READY;
other rejected inputs produce FAIL. The profile deliberately requires the
current monorepo layout, 28 cases, six schemas and Python 3.11/3.12 claims.

Remote CI bundles were not byte-audited: the parent recorded storage download
denials and no bypass was attempted. CI job success and upload metadata are
separate evidence from this local artifact audit.

This directory preserves the exact reviewed verifier/test source and original
execution receipts as historical audit evidence. Root reran this preserved
verifier on the retained local bundle and reproduced `local-audit-v1.json`
byte-for-byte. This is separate from the main runtime test manifest; its eight
synthetic checks are recorded in `validation-v1.json`.
