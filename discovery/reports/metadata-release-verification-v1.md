# Metadata evidence and release integration checkpoint

This increment preserves the actual G15B metadata result, adds a public-receipt
summary, and prepares exact tested-artifact retention. It does not establish a
new scientific recommendation result. The original gap, steel, FreeSolv, JARVIS
and training-only failures remain unchanged.

## Executed checks

- **651 Python tests pass in 94.631 seconds**, with all **197** source/resource
  hashes unchanged during the run. The [source-bound receipt](metadata-release-checkpoint-tests-v1.json)
  and [full log](metadata-release-checkpoint-tests-v1.txt) record the command,
  environment and actual times. This includes 32 synthetic retention checks and
  18 public-metadata summary checks; the original 601 tests remain.
- Promoted retention tests also pass independently as a focused **32-test** run
  in 11.630 seconds. [Independent review](release-retention-independent-review-v1.json)
  and its [final log](release-retention-independent-tests-v1.txt) preserve the
  17 author and 15 independent scratch checks. Earlier archive/publication
  findings, including the executed cleanup regression failure, are preserved.
  The exact original installed-package `PROBE` is unchanged. Synthetic wheels
  are inert; these tests are not actual package installations or retained builds.
- The promoted metadata summarizer passes **18** focused tests; its actual CLI
  produces the published [summary](mpea-metadata-summary-v1.json) byte-for-byte
  from the public G15B JSON. It does not open the raw archive. The summary's
  184,252 bytes have SHA-256
  `ddb67b50771bd12292517acd05299adcb3066ab90e0c26936639b3c2be3c8a8a`.
- The actual fresh axiom audit passes **125 statements in nine modules**, using
  only standard logical axioms. The subsequent `git diff --exit-code --
  AXIOMS.txt theorem-inventory.json` exits zero. [Actual audit output](formal-receipt-ci-fresh-audit-v1.txt)
  is preserved, along with the first mistaken-working-directory attempt that
  failed before the auditor started. No proof source or formal receipt changed.
- The [proof-receipt CI checker](formal-receipt-ci-check-v1.json) reconstructs
  current inventory bytes and runs four isolated Git fixtures: matching output
  exits zero; stale axiom, stale inventory and both-stale cases each exit one.
  Its source/workflow hashes remain stable. This offline checker is separate
  from the actual Lean audit above.
- Reproduction guides pass static checks on **seven shell blocks** and **three
  Python blocks**, with independent source-contract review. These are syntax
  and documentation checks, not recipe execution, installation or science reruns.

The prior published source `ec32247f404d7d2b0a916ff7012bded2accb48c8` passed
[all four CI jobs](https://github.com/alexwelcing/lupine/actions/runs/38079064532).
The unchanged browser checks and original installed probe were exercised there:
46 browser checks and 28 cases across six schemas. No additional local browser
or real retained-wheel result is claimed in this pre-commit report. The next
published commit must pass its own complete CI, and actual retention must run
from the clean committed snapshot before claiming a retained artifact.

## Actual metadata evidence and scientific consequence

After the ec32247 remote SHA and all four CI jobs were verified, two separate
processes ran the frozen fixed-cache reader. Both preserved all **1,545** rows
and produced the same **603,510-byte** metadata receipt, SHA-256
`36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`.
Both exited two with `METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED`.
[The reproduction record](mpea-row-metadata-reproduction-v1.json) binds all
21 frozen source/reference files and actual command/CI timestamps.

The original formula grammar recognizes **zero** rows. This is a preserved
recognition failure, not evidence of absent compositions. There are 264 exact
DOI-token groups, not proven independent studies. Only prescribed metadata was
processed; targets, target presence/missingness, eligibility, features, splits
and fits remain unexamined. [Readiness](mpea-row-metadata-readiness-v1.md) states
all counts and remaining scientific limits.

Separately cited formatter/dependency source, independently refetched by root,
provides evidence for ASCII-space separated explicit element/count terms and
rounded ratios to the largest atomic fraction. It does not establish actual
v9 producer lineage or coefficients summing to 100. A separate prospective
formula-only amendment is under engineering review; it has not run on real cells.

## Release behavior and next action

The optional [retention path](../docs/release-artifact-retention.md) requires a
clean committed source with matching runtime manifest. It verifies Git blob
identities, builds from the scoped committed archive, tests the exact wheel,
rechecks source/wheel/archive identities and publishes a completion receipt last.
The committed copyset is `discovery/` plus its CI workflow; ignored/untracked
files and defined cache components are excluded. This is not a secret scanner,
Git history bundle, hermetic/bit-reproducible build or scientific replication.

CI runs this path in both Python versions and uploads distinct candidate
artifact bundles. An upload alone is insufficient: all four jobs must pass.
The Lean job now rejects generated receipts that differ from committed bytes.
[Reproduction guides](../docs/reproduction-environment.md) use fresh attempt
paths, preserve historical evidence and distinguish historical scientific digest
matching from merely agreeing between two new runs.

Owner: root integrates, publishes and verifies the exact remote commit and CI,
executes the real retained-wheel smoke, then independently checks downloaded CI
artifacts against their embedded commit/hash receipts. In parallel, the G15C
engineering reviewer owns synthetic amendment review; the protocol delegate
prepares a prospective archival-recovery design without opening targets. No
scientific release gate changes state at this checkpoint.
