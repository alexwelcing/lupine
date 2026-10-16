# Fixed stored-label descriptive census candidate

The [amended frozen contract](contract.json) declares all144 positions,16 original
model/property/unit strata of9 materials, and36 material/property reference
equality groups before implementation. The [output amendment](public-aggregate-amendment.json)
preserves the original scope and root's prospective public-aggregate decision.
Only generated fixtures have been used in this candidate lane; no actual
numerical projection, original bound object or source operation is authorized
by this implementation.

`inspect_synthetic(projection_raw, frame_raw, readiness_raw)` takes caller-supplied
**generated** projection bytes and the exact already-public frame/readiness
bytes. It returns `(public, private_or_none)`. The function has no file access.
Success is `DESCRIPTIVE_CENSUS_COMPLETE`; failure is `BLOCKED` with a closed reason,
no public numeric groups/equality output and no private result. Scientific status
is always NOT_ADMITTED and actual reference choice UNKNOWN.

Public `groups` contains16 rows in stable `(model_id,property,unit)` order, with
original model/property/unit and explicit `squared_unit`, count9, unit_ids,
fixed_position_weight1, and six rational fields: `sum_signed_discrepancy`,
`sum_absolute_discrepancy`, `sum_squared_discrepancy`, and the corresponding
`mean_` fields. Each reduced rational is a canonical signed decimal-string
`numerator` and positive decimal-string `denominator`. Public aggregation is
labeled stored-label discrepancy, not physical error estimation. No ranking,
model winner or pooled score is produced.

Public `reference_equality` contains36 rows in stable material/structure/property/
unit order. It retains all four model IDs and separately reports exact rational
`stored_reference_equality` (`ALL_STORED_REFERENCES_EQUAL` or
`STORED_REFERENCES_DIFFER`), `token_spellings_equal` and `citation_literals_equal`.
Neither equality nor inequality identifies a correct reference or historical
binder choice. Private `positions` retains every original unit/material/model,
path, declared input hash, ordinal, original prediction/reference token and
citation, plus the three individual discrepancy rationals. Those per-record
values are never put in the public aggregate.

Tokens preserve the recorded-label reader's strict finite JSON-decimal semantics
and prospective128-digit mantissa / absolute1024 exponent-and-scale bounds.
Arithmetic uses exact rational integers without binary float conversion or
coercion. Original signed-zero spelling remains private; arithmetic zero is0/1.
A bounded9-digit chunk serializer handles accepted squared numerators above
Python's default4300-digit string limit without changing process-global limits.
Parser class bodies are copied exactly from the held public reader; [heritage](parser-heritage.json)
records the source. The projection has a4MiB byte cap, depth32,50000nodes including
keys and16384decoded-character string cap. Output rational numerator/denominator
caps are5000/2500decimal digits, private output8MiB and public output1MiB.

The complete frame must match exactly; absent, duplicate, extra, incomplete,
coerced, malformed or out-of-bound records fail closed. Original position order
may vary but output order is fixed. Literal units, nonempty citations, ordinal
integer/range/distinctness and declared input-hash format are checked. Tolerance
must match the pinned readiness state (allNULL), and is not a success threshold,
uncertainty model or physical bound.

Exposure records whole projection supply, read/parse start and completion,
partial numeric materialization, validation/arithmetic/group progress and possible
writes. Oversize supplied bytes retain supply exposure with parse not started.
A global failure clears numerical outputs but preserves completed/started work.
The generated fixture-file API `run_synthetic_file(path, expected, frame_raw,
readiness_raw, output_slot)` verifies `{bytes,sha256}`, reserves an exclusive slot
before one bounded read, and refuses the known actual/custody paths. It writes
`census-private.json` and `public.json` only in generated test slots. Partial
private or public write exposure remains explicit; completed private output is
not erased from the returned failure receipt.

`run_retained(root, manifest_path, manifest_sha256)` is an uninvoked prospective
wrapper. Only root may supply a fixed reviewed manifest and choose the later
one-use operation. It binds this script, contract and exact public metadata,
then reads only the existing private recorded-label projection once after
reservation. It does not read original bound/run/reference objects or execute
upstream code. There is no CLI, import-time read, fallback or automatic retry.
Actual manifest/output slots remain absent during generated development.
