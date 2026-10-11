# Clean preallocation-recovery package: PASS

Actual source `a0624cac9abb20320629cce41f10270b9b8e2136` passed all three
commands: isolated installed wheel, strict retained-artifact verification and an
independent source/wheel payload audit. All commands exited zero in 16.83 seconds
total. Git and source stayed clean and unchanged; the complete test suite began
only after these commands finished.

The installed probe exercised 28 cases, six schemas and 12 checks. The actual
MPEA report remained absent; its JavaScript was packaged and served exactly.
The strict audit checks the 292-entry runtime manifest. All 104 runtime and two
license payloads in the 111-member wheel match committed source. The source
archive contains 2,096 files. These are actual local retained bytes, not downloads
from remote CI artifact storage.

- Wheel: 246,653 bytes; SHA-256 `e33340108718c4b6eec574cbbfdb951791f1ee4303b7909df319c31f3527fcc0`.
- Source: 32,174,080 bytes; SHA-256 `86eda2b9ba9e2b8777e9c351f8564aef4829c19090442e2ca680ff1b0b0dc94a`.

[The execution receipt](execution/execution.json), [artifact receipt](release-artifacts.json)
and [exact safe-copy ledger](copy-ledger.json) preserve command, source and output
identities. Binaries remain in ignored retained storage. Package success does
not imply a completed full suite, CI approval, registration, scientific result
or physical validity; those are separate gates.
