# OPC part names and a restricted workbook reader

**A finite application-specific part-name whitelist is a reader-profile choice,
not OPC's universal naming requirement.** This conclusion follows from the
primary ECMA-376 Part 2, fifth edition (December 2021), *Open Packaging
Conventions*, obtained from [Ecma's official entry](https://ecma-international.org/publications-and-standards/standards/ecma-376/)
and its directly linked Part 2 download. It does not establish anything about
an actual Li member or G34 outcome, and changes no existing acceptance rule.
The inquiry was scoped before any actual G34 result was supplied in this task;
it is not an outcome-selected acceptance amendment.

| Primary clause | What it establishes |
| --- | --- |
| §§1,5; pp.1,9 | OPC packages varied content and markup specifications. It is not a workbook-specific filename inventory. |
| §6.2.2; pp.10–12 | Part names obey a general grammar and reserved-name, equivalence and integrity rules. Relationships have specified reserved naming conventions. An arbitrary additional name is not automatically valid, but validity is not defined by one application's finite roster. |
| §6.2.3; §7.2.3.2.1 and .5; pp.12,28,31 | Each part has a MIME media type. Non-Relationships parts need applicable Default/Override declarations; an Override takes precedence, and duplicate declarations are constrained. Merely carrying a familiar extension does not settle the declared type. |
| §§6.5.1–6.5.3.4; pp.19–22 | Relationships describe a source-to-target graph. Internal targets are relative references resolved with the source-dependent base; Internal is the default mode. OPC also permits External targets. A restrictive reader may reject or decline to follow them without treating that policy as a universal OPC prohibition. |
| §7.3.7; p.35 | In the ordinary noninterleaved ZIP mapping, `[Content_Types].xml` stores the Media Types stream. That stream is not an ordinary abstract package part. |

A narrower reader may deliberately reject a package outside its supported profile.
Such a rejection should not be relabeled proof that the package violates OPC.
The existing published Lupine plans describe closed content-type, relationship
and envelope rules; this standards review neither relaxes them nor approves a
replacement reader.

**Opaque ancillary handling is an operational boundary, not a semantic safety
certificate.** A declared reader policy may leave unused payloads unopened,
undecompressed and unexecuted. Package-level name/type/relationship consistency
still matters. More importantly, §6.5.1 explains that references can also occur
inside content-specific payloads; a relationships graph alone is not a complete
semantic dependency proof. Calling an unknown payload ancillary, or not following
it, does not establish that it cannot affect the requested workbook interpretation.

Section 4, p.8 states: “OPC conformance is purely syntactic.” Package conformance
therefore does not verify workbook identities, cell types/units, formula versus
cached-value meaning, relationships needed by the requested interpretation, row
pairing, scientific provenance or label completeness. This Part 2 review also
does not certify the spreadsheet-specific requirements of other OOXML parts.
Any semantic dependency left uninterpreted remains outside the supported claim.

The two permitted ordinary requests both returned HTTP 200; no redirect, retry,
mirror or linked-standard fetch followed. The official ZIP and its single PDF
were retained; its two companion schema archives were not opened. Full standards
bytes and extracted text were machine-exposed. No Li archive, cache object,
member metadata, private projection or scientific outcome was read. No product implementation, test suite, new workflow or actual Li-source
operation was created or run.

The [source index](source-index.json) records exact identities; the
[standards receipt](standard-review.json) records clauses, exposure and limits.
`pdftotext` exited 0 but reported “Can't get Fields array”; its
[original warning](pdf-text-stderr.txt) is preserved. Selected clauses were readable;
complete PDF-conversion fidelity is not claimed. Official public availability
was established, but a broad redistribution license was not established from
the fetched material. Publication is limited to this paraphrase, one short
normative quotation and receipts; the full page, ZIP, PDF and text stay excluded.
