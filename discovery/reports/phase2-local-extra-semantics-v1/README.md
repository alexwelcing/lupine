# ZIP local-extra semantics: retained-standard research

**Conditional source research only. No actual extra-field ID or payload was read.**
PKWARE APPNOTE already describes a recognizable `0xA220` growth-hint payload.
Its description supports a small structural/padding predicate, but does not
specify the full meaning of the initial-padding value or establish that arbitrary
unknown extras can be ignored without changing application semantics. No reader
profile is changed or admitted here.

The sole format source is the previously retained [PKWARE APPNOTE.TXT 6.3.10
FINAL, revised 2022-11-01](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT),
174,585 bytes, SHA-256
`0b993022a7d320a0bf704e6980bea36fafd17a6066ab994db0a0c16278a50cd6`.
Its original ordinary HTTP-200 receipt is retained with the source. This task
made no request and read no actual Li receipt, private capture, object or archive.
The source is paraphrased with section references rather than reproduced;
[source-bindings.json](source-bindings.json) binds the source and exact local
line spans used. Line numbers locate this specific retained version, not every
online revision.

## What generic extra-field structure permits

Sections 4.3.3 and 4.5.1 specify little-endian fields and successive records with
a two-byte identifier, a two-byte data length and that many data bytes. Section
4.4.1.1 specifies unsigned fields unless otherwise noted. A parser
can bound each record and advance by four plus its declared length without
interpreting that body's content. Section 4.6.2 expressly describes passing over
uninteresting data blocks by their lengths. This supports **structural skipping**.
It is not necessary to invent a blanket prohibition on all unknown blocks in
order to justify a header inventory.

The stronger inference does not follow. Section 4.4.28 discusses older programs
finding the next file/header; it does not certify that extracting a file while
discarding every extension preserves the intended meaning. Some extensions
carry sizes, offsets, names, encoding, encryption or application-specific
information. Section 4.1.10 permits extensions for application needs and requires
definitions not to conflict with documented records; sections 4.1.11 and 4.7
leave application manifest/profile semantics to the application. Thus:

- bounded skipping to inventory the next record is supported;
- treating a particular validated body's bytes as padding can be supported by
  that body's documented layout;
- treating arbitrary unknown/reserved data as semantically irrelevant for
  extraction, package identity or scientific interpretation is not established.

Raw zero bytes between TLV records are not a generic padding exception to
section 4.5.1. A remaining tail of one to three bytes is not a complete header.
Four zero bytes would instead encode a zero-length record with ID zero, which
is in the reserved range; that is not automatically an anonymous padding record.
Padding inside a recognized, length-bounded payload is a different case.

## Exact scope of the `0xA220` description

Section 4.6.10 gives the Microsoft Open Packaging Growth Hint layout:
the TLV data area begins with a two-byte verification signature whose numeric
value is `0xA028`, followed by a two-byte initial-padding value, followed by
padding filled with NUL characters. The declared data size covers these three
components. With section 4.3.3's byte order, the signature bytes are `28 a0`.

For an already bounded TLV with identifier `0xA220` and data length `L`, the
following is an original direct consequence of that layout, not a claim about
the actual archive:

1. Require `L >= 4` before reading the two fixed two-byte payload fields.
2. Verify the signature numerically equals `0xA028`.
3. Interpret the next two bytes only as an unsigned initial-padding value.
4. Require every remaining one of the `L - 4` bytes to equal zero.

The final condition is vacuously true when `L = 4`; the section states no
positive minimum padding. `L < 4`, a wrong signature, a nonzero trailing byte
or an out-of-bounds TLV does not match this described payload shape. A wrong
signature is not enough to declare the entire ZIP corrupt: section 4.6.3
explicitly warns about ID collisions. The correct conclusion is that this
profile cannot identify the block as the documented growth-hint form.

Crucially, section 4.6.10 does **not** state that the initial-padding value equals
`L - 4`, bounds the current padding, must be positive, or must be zero. The word
"initial" is not a license to infer an unreported mutation history. It also
does not define duplicate handling, local/central correspondence, placement
constraints, producer versions, padding-growth update rules or full OPC
conformance. Do not add a `PadVal == L - 4` check and call it normative; do not
accept every value as evidence of a valid producer history either. Those are
different claims from checking the stated payload shape.

APPNOTE places this in its third-party section, which explicitly does not
guarantee the accuracy of all published third-party data. Section 4.6.3 recommends
checking a block-specific signature in addition to the identifier before
assuming a known type; the growth-hint signature makes that warning actionable.
Even ID plus signature is format evidence, not authentication of the producing
software or proof against a deliberate collision.

**Prospective narrow result:** if a separately frozen payload diagnostic later
has a justified exact same-source prerequisite selecting this ID, it could emit
only closed booleans/enums for length admissibility, signature agreement and
all-zero trailing padding, with an explicit `initial_padding_semantics_unbound`
status. No raw signature, initial-padding number, byte dump, filename or payload
hash is needed in its researcher-visible projection. Such a diagnostic would
interpret more payload bytes than the existing ID/length inventory and must
record that exposure. It is not already implemented or authorized by this note.

## Other previously catalogued families

| Family | What the retained source actually specifies | Remaining interpretation / conditional decision |
| --- | --- | --- |
| `0x0001` ZIP64 | Section 4.5.3 gives fixed ordering of 64-bit sizes/offset and a 32-bit disk field, appearing according to corresponding sentinel fields. It additionally requires both original and compressed sizes in a local-header ZIP64 entry. Sections 4.4.8–4.4.9/4.4.16 describe sentinel resolution. Section 4.3.9.2 allows ZIP64 even for small files. | Do not discard it on the basis of small archive size or blindly parse every block as the same length. Local/central context, sentinels, versions, sizes and offsets need a dedicated authority policy. The two local-size requirements must be reconciled in such a profile; no 32-bit fallback is established by this research. |
| `0x7075` Unicode path | Section 4.6.9 describes one version byte (currently one), four bytes of CRC for the original header filename bytes, then UTF-8 name bytes without a BOM. Unrecognized versions should not be used; CRC mismatch should cause the extra to be ignored in favor of the header filename. | The stated fallback is specific to this field, not blanket permission to ignore extras. A recognized version and matching CRC still require valid UTF-8 and an explicit local/directory/canonical-name authority rule. Decoding alternate paths is a new content exposure and must not silently redirect package/member identity. |
| `0x6375` Unicode comment | Section 4.6.8 gives the analogous version/CRC/UTF-8 representation for the directory comment, with corresponding unknown-version and CRC-mismatch treatment. | Length at least five is only a structural minimum derived from the listed fields. It does not prove a harmless comment or validate its UTF-8. Do not publish or render it as metadata without the appropriate disclosure scope. |
| `0x000a` NTFS | Section 4.5.5 lists a four-byte reserved prefix followed by tagged, length-delimited attribute data. Its currently described tag `0x0001` consists of three eight-byte modification/access/creation times, hence 24 attribute-data bytes. | The retained section does not say the reserved prefix must be zero, supply a general duplicate/unknown-tag policy, or fully define timestamp epoch/interpretation. Do not confuse the nested tag `0x0001` with outer ZIP64. Reading times would be additional provenance-content exposure; no times need be published by a structural diagnostic. |
| `0x5455` extended timestamp | Section 4.6.1 lists its name and ID. The retained APPNOTE supplies no payload layout for this mapping. | No flags/field order/epoch or local/central size rule can be asserted from this source alone. Keep semantics unsupported; obtain a pinned primary definition only if this family becomes relevant to a separate justified step. |
| `0x9901` AE-x encryption | Appendix E identifies general-purpose encryption bit zero and compression method 99; the actual compression method resides in this extra field. It points elsewhere for the full structure and distinguishes CRC behavior of versions one and two. | Not an ignorable padding extension. Existing encryption/method restrictions stay in force. The retained source alone is not a complete payload validator and does not authorize decryption or a profile expansion. |
| Other, duplicate, reserved or colliding IDs | Sections 4.5.1/4.5.2 reserve and map IDs; sections 4.6.1–4.6.3 say the third-party list is incomplete and IDs can collide. | Preserve order and multiplicity. There is no generic first-wins, last-wins, merge, deduplication or harmlessness rule here. Well-formed TLV is insufficient to decide the block's semantic relevance. |

The nearby alignment entries are not substitutes for growth-hint semantics.
Section 4.6.11 describes `0xA11E` with a two-byte alignment/indicator word and
padding, including separate compression-method-retention meaning. The list also
names `0xD935` Android ZIP alignment without defining its payload in this retained
version. A padding-sounding family name does not make these interchangeable.

The reserved extended-language field `0x0008` is another explicit counterexample
to equating a known ID with a known payload. Appendix D.3–D.5 says its storage
and formalized values remain undefined in this version and discusses possible
name/content encoding uses. An unknown encoding extension cannot be certified
irrelevant merely because ordinary header flags already look acceptable.

## Prospective conditional decision table

None of these rows asserts an observed ID. The historical profile/diagnostic
results remain preserved and no outcome automatically advances a reader stage.

| Future evidence, if obtained under its own held scope | Defensible next conclusion | Still not established |
| --- | --- | --- |
| Complete ID/length inventory only | Bounds and TLV structure of that selected extra area; identify which payload definition would be relevant | Payload validity, first-entry identity disclosure, remaining entries or archive compatibility |
| `0xA220` ID with insufficient body length, bad signature, nonzero declared padding or unhandled duplicates | Block that candidate growth-hint interpretation; retain exact closed reason and exposure | Whole-file corruption, producer identity or permission to try a different interpretation silently |
| Unique candidate `0xA220`, bounded body, matching signature, zero remaining padding | Consistency with APPNOTE's described growth-hint payload shape | Meaning/history of initial-padding value; complete OPC conformance; global archive acceptance |
| ZIP64, Unicode, encryption, unknown encoding or another potentially authoritative extension | Keep existing semantic/name/size/encryption gates; seek the specific definition and policy only when needed | Safe generic discard or preserved identity/content meaning |
| Unrecognized ID or unsupported nested attribute | Continue bounded structural inventory if its frozen contract permits; semantic state stays unknown | That its body is empty, optional, irrelevant or safe to admit |
| A later separately justified read-only profile validates every accepted extra plus every existing local/central/header/name/size condition | Potential narrow archive-reading compatibility evidence after its own tests and actual gated execution | XML schema validity, worksheet/measurement meaning, source independence or scientific usefulness |

One selected local span cannot establish which fields occur elsewhere. A later
compatibility profile would have to specify and check all extras encountered in
its own scope, not infer a global archive property from a first-failure sample.
It must not rewrite or strip bytes to make a file pass. Dropping a block while
rewriting an archive is a different operation from reading past its declared
span and raises additional preservation/authenticity questions.

## Is additional authority needed now?

No new retrieval is necessary for the present conclusions. The retained
APPNOTE suffices for the generic TLV rule, structural-skipping distinction and
the limited `0xA220` shape predicate. It does not support a complete OPC reader
claim or a blanket unknown-extra policy. If a future observation makes
initial-padding evolution, duplicate behavior, OPC-specific restrictions or a
not-defined-here family decisive, obtain the applicable original format
definition (for example the relevant Open Packaging Conventions specification
or publisher's field definition), with version, exact relevant clause and
bounded ordinary retrieval receipts. No such external clause was read or
assumed here, and no paid standard or alternate access route is requested.

This research provides no evidence about any actual Li field. It implements
nothing, executes no archive parser, uses no new network request, and changes
no tracked source or profile. No scientific benchmark, source readiness,
independent sampling or materials-validity claim follows from these format rules.
