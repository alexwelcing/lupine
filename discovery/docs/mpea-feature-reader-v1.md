# MPEA feature custody: local vectors, public aggregates

Status: independently reviewed source and tests prepared for the first committed
feature-custody freeze; only constructed inputs have been executed.
No experimental CSV/formula/target cell has been read by this implementation.
Production execution requires the reviewed source, tests and specifications to
be committed, pushed, and successful in CI **before the first feature read**.
Root records that execution checkpoint. The local Git gate cannot establish
remote publication or CI success, and this document does not claim either.

This is a new formula-feature disclosure stage. G15C permitted only opaque
formula groups; its successful lexical result does not by itself authorize
unfrozen feature extraction or public per-row vectors. The already reviewed
arithmetic and synthetic adapter remain unchanged. This reader adds a separately
reviewed source binding and output boundary around their source-free operations.

## Frozen dependencies and permitted input

The original G15B report and reproduction remain byte-bound at
`36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55` and
`f01271d82a27fe114c443009d919ffa232e5fc32d8176dcd4c1b8c01870cd793`.
Its zero-of-1545 formula-recognition result remains unchanged.

G15C producer commit is `a1e47024898072111f80e3ff911026306a50df2b`.
Its formula receipt SHA256 is
`ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7`;
its reproduction receipt SHA256 is
`3453b69b906230a627b128e8af8c7ff2722740295981950f972ec581096017ec`.
Those two actual receipts were published in evidence commit
`28b929f6ac74edaeccef148c7a1aa29b3b4bfdb0`. Both commits must be ancestors
of the future feature execution commit; the two receipt bytes must equal their
historical committed versions as well as their literal pins and current files.

The reader checks all 29 implementation/reference files recorded by G15C through
its original frozen-source gate, and requires their hashes to match that actual
receipt. This includes the original mapping, B source/tests/reports, formula
format evidence and C source/tests/specification. Captured C/B/scanner code is
hash checked before the same captured bytes are executed. The reader never calls
either old extraction entry point or old metadata conversion/grouping routines.

New kernel dependencies are fixed to:

- `src/lupine_discovery/representation.py`,
  `c65c0eed659025a0e41eb325e75182ac2b980c35ac43dfddaa501f4f3ddf3b9e`.
- `scripts/mpea_features.py`,
  `b24c0f1bb62fc56794e1232f973a6020ee42a0d3765d33cb51246f3c7a3a47d9`.

They are captured and executed under explicit module names; the generic module
is supplied directly for the feature script's import. No filesystem package
import is needed to find or substitute another implementation. The loader
installs a captured module under `lupine_discovery.representation` in `sys.modules`;
previously imported vector classes retain their previous class identity. This
is a standalone-process custody tool, not an ordinary in-process library whose
vector objects are interchangeable across load contexts. Separate stage processes
and serialized artifacts preserve the intended boundary. Neither source
is rewritten, and no synthetic guard/source SHA is changed. The producer calls
only their parsing, exact arithmetic, representation and processing functions,
not `build_fixture_features`.

The future committed freeze additionally includes this reader, its author and
independent tests, the three reviewed generic/synthetic test modules, and both
feature specifications. `NEW_PATHS` in the source is the exact file inventory.
Every new path must equal its current Git blob before cache access. Missing,
dirty, symlinked or mismatched paths block execution. Receipt seals and hashes
are identity/custody checks, not signatures, physical evidence or a Python-to-Lean
refinement proof.

The only experimental source path is the unchanged cache:

```
.cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv
```

It has exactly 332126 bytes, MD5 `6d29eb6018157b863ca0033ccec936d5` and
SHA256 `c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d`.
There is no path override, network acquisition, or production/synthetic switch.
After the complete source gate, one bounded read captures at most 332127 bytes;
only the exact verified immutable bytes reach the scanner. Nonregular files and
symlinked paths/ancestors fail. The scanner receives only formula column 1; all
other observation cells remain `None` and are scanned solely for framing/caps.

## Transformation and all-row linkage

The frozen 23-token header, CSV byte dialect and field/record/row caps are retained.
Late malformed framing or width/cap errors block the whole invocation. There is
no partial prefix report or filtered successful subset.

Every framed ordinal must match the pinned B and C row ID. The reader recognizes
the original exact formula bytes under frozen C grammar, recomputes consecutive
first-seen exact-token groups privately, and requires every status/group to equal
the published C receipt. A mismatch blocks the whole invocation. Equality groups
are not substituted for coefficient values and do not establish physical identity.

The reviewed feature compiler applies the explicit 256-term, 128-digit,
64-decimal-place and 1024-bit profile. All term/digit/scale checks precede numeric
conversion. Positive decimal coefficients use a common integer decimal scale;
repeated symbols are added, then the declared coefficients are normalized exactly
over the 118 atomic-number axes. No float, rounding, repair or target-derived
feature occurs. Unsupported formulas or resource limits keep the row/group/ID
and produce a null whole vector with its explicit reason. Known absent axes are
zero only inside a completely parsed declared composition.

Source group, processing, test mode and exact test-temperature states are copied
from the already public, pinned B report by original ordinal/ID. They are not
redecoded from their original observation cells. Processing uses the fixed five
known categories plus an explicit unresolved-state indicator. That indicator is
not a sixth manufacturing method. Temperature and T/C remain distinct metadata,
not a service-condition assertion or feature selected from outcomes.

The normalized vector represents rounded lexical coefficients. It is not a
measurement of true atomic fractions, a recovery of unrounded composition, or
evidence that the documented producer generated every actual v9 token. No
specimen matching, target presence/missingness, eligibility, fits, split, model
or candidate pruning is performed. The separate archival-study protocol must
freeze any subsequent allocation, target interpretation and predictor policy.

## Closed local and public records

`extract_cache()` returns `(local, public)` only after complete extraction and
validation. It does not write files. Local schema is
`lupine.discovery.mpea.local_features.v1`; each row has exactly:

```
ordinal, record_id,
metadata: {formula, source, processing, test_mode, temperature},
composition: {status, reason, values: [118 exact rational strings] | null},
processing_indicator: [six integer indicators]
```

Formula metadata is the exact C status/group; the other four states are exact B
states. The table preserves every source row in order. It contains no raw formula
token, per-token hash, unnormalized coefficient list or target value. It does
contain normalized per-row information and original IDs; it therefore remains
an ignored local artifact, not a public report.

Both records include original source identity, pinned inputs, execution source
files/commit, exact axis/category order and resource profile, explicit scope,
row count, and canonical content SHA256. Serialization is sorted compact ASCII
JSON with a trailing newline. No machine time or output path changes the bytes.

Public schema `lupine.discovery.mpea.feature_readiness.v1` contains only those
provenance/profile fields, original row denominator, aggregate composition
status/reason and processing-category counts, unknown-source count, and the
whole local artifact's byte count, SHA256 and content digest. It has no per-row
IDs, group lists, token lengths, per-cell hashes or vectors. Its status remains
`FEATURES_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED`. Original known/unresolved processing
counts and unknown-source count must agree exactly with B; unresolved formula
count must agree with C; resource failures add explicit limit states without
shrinking the denominator.

`validate_local_artifact` checks exact shape/types, pinned metadata/IDs, canonical
rationals, nonnegative unit sum, repeated-group feature consistency, scope and
seal. It does not reread raw formulas to rederive a supplied vector. Thus it is
an identity/structure validator, not independent proof that an arbitrary resealed
vector came from the source. `validate_public_report` checks closed shape, fixed
scope/provenance and internal aggregate consistency. `write_outputs` additionally
requires the public report to equal the deterministic projection of the supplied
valid local table. Actual source transformation is established by the controlled
producer and its separately recorded reproduction, not by a seal alone.

## Publication and execution plan

The local output must be strictly inside `.cache/mpea-features` and Git must
confirm that exact path is ignored. A force-tracked file is rejected. The writer
does not stash, reset, delete, stage or commit user data. Both destinations reject
symlinked ancestors, conflicting files and aliasing. Existing identical bytes are
idempotent. Atomic publication uses complete flushed temporary files and an
exclusive hardlink; creation/link/cleanup are anchored to a captured directory
descriptor. Local files are created with mode 0600. The local artifact is written
first, public projection last; if the latter fails, a complete local file may
remain but no partial public file is published. The pair is not claimed to be one
filesystem transaction.

There is no default CLI invocation. Both output paths are required and checked
before extraction. After the future reviewed/pushed/green-CI checkpoint, root's
planned two fresh-process commands are:

```
python scripts/mpea_feature_reader.py --local-output .cache/mpea-features/run1/local.json --public-output .cache/mpea-features/run1/readiness.json
python scripts/mpea_feature_reader.py --local-output .cache/mpea-features/run2/local.json --public-output .cache/mpea-features/run2/readiness.json
```

Then compare exact bytes and hashes of both local artifacts and both public
reports without printing vectors. Record commands, expected exit code 2,
source-freeze/remote/CI identity, whole-artifact digests, and whether reproduction
matched. Only the validated aggregate report and reproduction evidence may be
copied into tracked public reports. Never add either local table to Git. Do not
rerun a modified feature policy on real cells without another explicit amendment.

CLI success still exits 2 because the scientific schema remains unresolved.
Failures print only constant error codes and produce no successful prefix or
data-bearing error report. Logs must not print exception cell contents or vector
tables. The current tests use synthetic CSV bytes and temporary repositories;
public historical receipts are read as inputs, but the experimental cache is
never opened. No production command above has been executed for development.
