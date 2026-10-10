# Target-redacted custody for the Rhizo fcc archive

This tool inventories source identity and metadata for the route in
[projection-data-readiness.md](projection-data-readiness.md). It does not fit
a field, choose references, set discrepancy bounds, assign evaluation splits,
exclude materials or evaluate scientific performance. A complete receipt means
the metadata extraction completed; it does not mean a material or model passed
a scientific gate.

The source and synthetic tests must be independently reviewed and committed
before the first real acquisition. At implementation handoff, **no real mixed
JSON acquisition has run**. That execution status belongs in a separate dated
receipt if an authorized run occurs later.

## Input identity and actual exposure

The public command accepts exactly 110 files at Rhizo commit
`81079a8e1bac7ed332712cc92002bd3435e40776`: the statics, unbound evidence and
bound evidence triple for each of nine fcc materials and four model IDs, plus
the surface-energy and vacancy reference files. The existing
[source inventory](../reports/projection-source-inventory.json), SHA-256
`4874aebfa7e6f8003b6b733750ddac6675770a7b815b9ac8e1de81f55d118f42`, supplies
expected Git blob hashes and sizes. The command verifies its exact bytes and
the fixed path set. Binding reports, experiment outputs, generated Lean
instances and figure tables are outside the acquisition allowlist.

Acquisition fetches only the fixed `raw.githubusercontent.com` URLs at that
commit; redirects are rejected. Each response is bounded by its expected size
plus one byte, and its captured bytes must match both size and Git blob hash.
Only verified bytes are cached. Identical blobs may be reused for multiple
allowed paths. Existing conflicting objects are not replaced or retried until
they happen to pass. Network errors produce constant status codes, with no
response snippets or exception details.

Raw bytes remain under `discovery/.cache/projection-custody/`; paths outside
that subtree and symlink escapes are rejected. Extraction captures each
allowed cache object once, verifies those bytes and decodes the same bytes.
Strict JSON rejects duplicate keys, nonstandard nonfinite tokens and malformed
syntax. Decimal JSON tokens are parsed without binary-float conversion. The
extractor deliberately does not validate, summarize or use numerical targets.
A syntax failure is an incomplete custody record, not a material exclusion.

**The custodian acquires target-bearing bytes and decodes mixed JSON containing
targets.** The receipt records that exposure. The researcher-facing artifact
is target-redacted; the process cannot be described as having left all target
bytes unread. Earlier documentation exposure and already-published historical
results remain disclosed in the readiness audit. No new blind or prospective
scientific result follows from this access separation.

## What can appear in the public receipt

The projection constructs new mappings from an explicit allowlist. It does
not serialize selected source subtrees or copy arbitrary extra fields.

| Allowed output | Boundary |
|---|---|
| Repository, commit, fixed file path, expected Git blob hash, captured whole-file SHA-256, byte counts and status | Whole-artifact custody identities only; no per-target or per-note hash |
| Registered material, structure, model, backend and device symbols | Unknown or malformed strings become `null`, never echoed |
| Calculator-version field presence | Package-version text is withheld; it does not verify a checkpoint |
| Supplied input-hash presence/format and agreement between companion records | Raw supplied hashes stay private; agreement is not recomputation or scientific validation |
| Declared property names, units, record counts and duplicate status | Presence depends on the record/name, not whether its value is present, null, finite, plausible or accurate |
| Reference source location as pinned file path plus array ordinal | Citation, URL, notes and individual text hashes are withheld |
| Known method labels, unit compatibility, citation/URL/notes field presence | All matching references remain listed; no PBE preference, fallback, averaging or selected reference |
| Geometry-source label and lattice/vacancy/facet record availability | No relaxed lattice constant, numerical area, coordinates, energies, forces or convergence statistics |
| Separate readiness flags and known reconstruction caveats | Flags do not select, replace or exclude units |

The output schema validates mapping keys recursively and gives every scalar
field a closed vocabulary or a precise type. Only complete-artifact seals use
an open hexadecimal grammar. Freeform notes, citation text, run labels,
unexpected IDs, package versions, parser messages and raw field names cannot
pass through. The `content_sha256` seals the redacted report itself; it is not
a hash of an individual target or target-bearing note.

## Failure and readiness semantics

All **36 expected unit rows** appear, even if no input file is available.
Missing files, size/blob conflicts, malformed JSON and unsupported schemas
remain explicit artifact statuses. They do not trigger replacement units,
different reference choices or a smaller reported universe. Syntactically
valid target changes affect whole-file seals but not redacted scientific
metadata; malformed syntax may also change the declared parse status.

`UNKNOWN` means the required declaration or evidence is absent/unrecognized.
`CONFLICT` requires a recognized contradiction, such as a different known
material/model, incompatible known units or unequal supplied input hashes.
Repeated property records are marked `DUPLICATE`; multiple reference matches
are `REVIEW_REQUIRED`. Neither ambiguity is resolved automatically.

Checkpoint identity is always `UNKNOWN` in this implementation: the reviewed
schema has no required checkpoint digest, no checkpoint bytes are among the
110 allowed files, and package versions cannot establish checkpoint identity.
Even a valid-looking extra checkpoint field is ignored. Actual checkpoint
verification would require a separately reviewed source route.

Primary-source rights, exact reference conditions and uncertainty remain
unresolved. The schema's optional numerical tolerance is not exported or
interpreted as physical uncertainty. The known README caveats for
Ag/Au/Pt(110) and Sr(111) become `REVIEW_REQUIRED` jurisdiction flags without
removing their units. Other facets remain `UNKNOWN` until condition equivalence
has been checked; absence of that caveat is not a compatibility certificate.

The existence of a fixed fcc map in inspected source is a code-provenance
fact. Hard physical discrepancy bounds are `UNSUPPORTED`, scientific
common-field support is `UNKNOWN`, and multiple held-out candidates sharing a
declared field are not established. No numerical target completeness check,
eligibility decision or anchor/evaluation allocation is made by this tool.
A later protocol must define any metadata-based eligibility criteria explicitly,
retain every excluded/unresolved unit with its reason, and never use observed
accuracy or residuals to decide membership.

## Synthetic checks and future commands

Before any real acquisition, run the producer and independent synthetic tests:

```sh
python -m unittest discover -s tests -p 'test_projection_custody*.py' -v
```

They construct their own 110-file archives. They test target-value
noninterference, missing/null and malformed values, hostile freeform fields,
geometry redaction, whole-blob verification before parsing, exact 36-unit
preservation, reference ambiguity, checkpoint non-promotion, output schema
closure, bounded cache access, symlink rejection and sanitized failures.
Reading the already-public source inventory is metadata-only. None of these
tests requires the original mixed JSON.

After review and a committed source checkpoint, an authorized custodian may
execute these commands from `discovery/`. They are instructions, not a record
that execution occurred:

```sh
python scripts/projection_custody.py acquire \
  --output .cache/projection-custody/acquisition-receipt.json
python scripts/projection_custody.py extract \
  --output .cache/projection-custody/metadata-receipt.json
```

The default raw-object directory includes the immutable source commit. An
optional `--cache` must remain below the ignored custody directory. A public
output already containing different bytes is not overwritten. Exit code 0
means acquisition/extraction completed as declared; 2 preserves an incomplete
or blocked receipt. Neither code is a scientific verdict. Commands log only a
safe status and the whole receipt digest. A second fresh process can reproduce
the redacted receipt from the same cache; that would be engineering
reproduction, not an independent scientific experiment.
