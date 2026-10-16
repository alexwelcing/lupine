# Li v3 envelope profile for Deflate option indicators

This is a separate, conditional format profile. It preserves the original custody,
header and flag diagnostic sources and all historical failures. Its only ZIP
predicate change permits bits 1/2 as compression-option indicators when the method
is exactly8, in addition to existing UTF-8 bit 11. Method0 permits only bit 11;
encryption, data descriptors, patched/reserved/unused bits and other compression
methods remain unsupported. No original flag is erased or header altered.

[PKWARE APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
section 4.4.4 specifies these method 8 indicators, including both bits set. This
format meaning does not identify the actual source flags or guarantee a usable
workbook. A first-member flag-family result says nothing about later members.

The new schema is `lupine.discovery.li_v3.compatible_envelope.v1`; profile is
`li_v3.xlsx_envelope.deflate_options.v1`. Every inspection stays `BLOCKED_SCHEMA`,
including `engineering_status=ENVELOPE_VALID`. This means supported envelope
structure only. Row pairing, field semantics, conditions, lineage, overlap,
missingness and sampling assumptions remain unknown.

## Exact delta and complete revalidation

`_compatible_zip_structure` duplicates the original `_zip_structure` body with
only its function name and this predicate changed:

```python
info.flag_bits & ~(0x806 if info.compress_type == 8 else 0x800)
```

The remaining predicates and order are identical: end record, limits, canonical
member/profile names, duplicates, compression/version, extras/comments, file
kind, stored sizes, offsets, local/central flags and CRC/size/name/time agreement,
boundaries, directory totals and required members. An AST comparison changes
exactly the named original expression and compares the complete remaining body;
separate checks bind the reused original helper objects/constants. There is no
monkeypatch of old reader globals. Every member must pass the new complete
traversal; the first qualifying flag receipt does not bypass later checks.

Original `_xml`, `_content_types`, `_relationships` and `_workbook` validators are
called unchanged. Only the original four `ENVELOPE_MEMBERS` may be decompressed:
content types, root relationships, workbook metadata, and workbook relationships.
All original XML byte/node/depth/namespace/type/relationship/workbook checks
remain in force. Unsupported native Excel markup can still block this profile.
No worksheet, shared-string, formula/cache, image, comment or other opaque-member
payload is opened. Those members' payload CRCs and semantics remain unvalidated.

## Conditional production path

The source is the fixed captured Li v3 object, original publisher size/MD5,
observed SHA-256 and canonical capture identity. This script pins all 13 preceding
source/test/contract/inventory files through the unchanged guarded diagnostics,
plus its own script, author test, independent test and this contract. All must
match worktree/index/HEAD before production cache access. There is no source,
archive path, URL, capture, profile or flag-mask override.

Before private capture or object access, the tool requires the fixed public
`flag-diagnostic-v1/1/public.json` receipt. It must exactly equal the canonical
`DEFLATE_OPTION_FLAGS_ONLY` report from producer commit
`f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f`, with all 13 expected producer/prior file
digests, original object/capture identities, closed exposure flags and unknown
scientific counts. Extra fields, duplicate keys, different producer/family,
incomplete flags or changed identities block. Canonical receipt validation
protects this controlled local workflow; it does not authenticate hostile actors
or replace the root's independent publication/CI verification.

If that prerequisite has not actually completed, this candidate remains blocked.
Before any actual compatible-envelope run, root must also publish this separate
profile and verify its own exact-commit CI and package checks. Existing user
research authorization covers the work; these are methodological gates.

Only `envelope --run 1` and `envelope --run 2` are accepted, with exclusive fixed
receipt slots under `.cache/li-v3-custody/compatible-envelope-v1/`. The unchanged
no-follow, bounded regular-file reader and mode 0600 exclusive writer are reused.
The original capture is validated before reading the fixed object; size, MD5 and
SHA-256 are checked on the same immutable buffer. There is no network, recapture,
overwrite, cleanup or replacement path.

## Exposure and result scope

Whole target-bearing archive bytes are read and hashed. ZIP metadata parsing
privately decodes member names; the original envelope instrumentation does not
separately expose each directory-name parsing stage, so no stronger claim of no
metadata decoding follows from its XML flags. Per-component
`decompression_started/completed` and `xml_decoding_started/completed` arrays are
retained from the original validators, including partial failures. An XML/profile
failure can follow actual machine decoding; an empty completed array alone does
not mean no decoding started. Before an object read, exposure is false; a failed
incomplete attempt leaves target-bearing read exposure null; completion sets true.

Public output preserves the original closed envelope projection: member/sheet
counts and exact recognized documentary roles, masking other sheet names. It adds
the exact flag-receipt digest and producer identity; it never exports cell values,
shared strings, arbitrary names or exception text. Metadata can itself contain
scientific text, so this is a reviewed projection rather than a claim of zero
information. Scientific counts stay null, fits/splits stay zero, and known
source-count discrepancies and negative scientific results remain unresolved.

`inspect_synthetic_envelope(raw)` accepts only bounded fixture bytes, refuses the
known real source identity, and has no production toggle or cache/network paths.
Tests cover each option combination, local/central disagreement, later malformed
headers, forbidden flags/methods, exact AST preservation, unchanged XML failures
and limits, opaque target members, receipt gates and committed-source identities.
Synthetic success does not predict the unseen real envelope result.

```sh
python scripts/li_v3_compatible_envelope.py envelope --run 1
python scripts/li_v3_compatible_envelope.py envelope --run 2
```

Both exit 2 because scientific schema is unresolved; guard failure is
`BLOCKED_GUARD` with a constant reason. Repeated output is computational replay,
not independent scientific evidence.
