# MPEA v9: verified acquisition, unresolved schema

Date: 2026-10-10. The frozen header-only custodian ran after source commit
`75caf5fc56ed3c8bb4a8da4cc913fc3816c3bb63` was pushed and
[all four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38075147915).
Acquisition returned **CAPTURED**. Both fresh header processes returned the
expected **BLOCKED_SCHEMA**, with byte-identical public receipts.

The experimental CSV was acquired and hashed in full. **Only its bounded first
logical record was decoded. Observation rows were not decoded.** This is source
acquisition with a restricted disclosure boundary, not blinded scientific
validation or a completed benchmark.

## Observed metadata

- Fixed source: Figshare article 12642953, version 9, file 25797305;
  332,126 bytes. Declared MD5 `6d29eb6018157b863ca0033ccec936d5` matches.
- Whole-file SHA-256:
  `c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d`.
- The bounded parser accepted one **23-column** first record, LF terminated,
  without a UTF-8 BOM. Three tokens matched the predeclared public allowlist:
  zero-based position 1 `FORMULA`, position 9 `PROPERTY: Type of test`,
  position 13 `PROPERTY: Elongation (%)`.
- The other **20 labels remain redacted**. No spelling, per-label hash or length
  was emitted. Their presence/order positions alone do not establish semantics.
- Row count, missing-value syntax, numeric completeness, paired specimens,
  operating-condition compatibility, valid features and scientific eligibility
  remain unknown. No fits, splits, source exclusions, thresholds or reference
  preferences were selected.

[Acquisition receipt](mpea-custody-acquisition-v1.json),
[header receipt](mpea-custody-header-v1.json), and
[actual reproduction commands](mpea-custody-reproduction-v1.json) bind the source
and the committed implementation. The expected header exit code two is a schema
block, not a failed material experiment or a successful scientific evaluation.

## Documentation does not fill the missing schema

[The schema evidence audit](../docs/mpea-schema-evidence.md) inspected the paper,
pinned repository metadata/code strings and the companion machine-readable
metadata. The latter's size/MD5 verified, but it describes broad assay concepts
and points to Figshare **v7**, not v9. Neither source establishes the complete
ordered v9 columns. No guessed `PROPERTY:` labels or positional repairs are
accepted. The metadata JSON contained no observation rows; its identity/date/
configuration numbers are disclosed in that audit.

## Decision and next boundary

**GO for verified archival custody; not ready for row metadata or a scientific
recommendation benchmark.** Preserve these receipts. A separately reviewed,
committed cache-only amendment may disclose exact first-record labels as escaped
metadata, keeping BLOCKED_SCHEMA until semantic mapping is reviewed. That change
must explicitly expand the earlier unknown-label redaction boundary. If a malformed
header contains scientific text, label disclosure cannot promise that it reveals
no scientific information. No later record may be read to resolve the ambiguity.

Only after a further complete position/token mapping is committed may a separate
row-metadata parser be considered. A header alone does not justify paired tensile
strength/ductility, missing-token semantics, source independence or any physical
bound. No scientific performance criterion is selected from these metadata.
All previous negative scientific results remain unchanged.

Root executed acquisition/reproduction and reviewed the public metadata. The
custodian and its synthetic tests received separate producer/reviewer coverage;
this readiness note is root's interpretation, not independent laboratory replication.
