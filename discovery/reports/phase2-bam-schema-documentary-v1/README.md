# BAM schema documentary acquisition — encoding unresolved

The one authorized request acquired the pinned technical-documentation CSV and matched the publisher's size and MD5. **Documentary interpretation stopped because strict UTF-8 decoding failed.** No header, dictionary, example, unit, uncertainty or provenance cell was parsed or displayed. The actual text encoding and CSV dialect remain unbound; this report does not resolve the eleven-versus-ten role discrepancy.

This is a separate `DOCUMENTARY_ONLY` investigation. The [frozen scope](scope.json) explicitly allowed whole-document machine and researcher exposure, including potentially empirical examples/comments. It preserved the earlier partial-role parser proposal as deferred and unimplemented. Neither scope changes a frozen benchmark, existing reader, scientific protocol or release claim.

## Identity and actual operations

The source is schema version DOI [10.5281/zenodo.17846436](https://doi.org/10.5281/zenodo.17846436), version 1.0, distinct from concept 17846435. The exact advertised object is `2025-12_Data-Schema-Tensile-HT_v1.0.csv`, file ID `5fc320ce-9ba9-4eb6-8ce0-665d0f8ffed5`. The [receipt](receipt.json) records a single ordinary GET from the pinned Zenodo content URL, HTTP 200 with no redirect, retry, credentials or alternate route, at 2026-10-16T09:45:36.233548Z–09:45:37.804119Z.

Observed size is 41,000 bytes; MD5 `330a8405f6cb9c4fcfe221baea7ced27` matches publisher metadata. The newly observed whole-body SHA-256 is `e75c85d770598acf19a4bd1cb9c94b6adf7bb92cf46b153cbc904896a1160f1a`. Acquisition read at most 41,001 bytes to detect overrun and observed end-of-body. These checks identify retained bytes; they do not validate a schema or scientific result. The raw CSV remains ignored and is not included in the proposed public report.

The response declared `text/plain; charset=utf-8,text/plain; charset=utf-8`. A full-body strict UTF-8 decode raised `UnicodeDecodeError`: invalid start byte 0x85 at zero-based byte offset 2738. The [first failure record](decode-failure.json) preserves the actual attempt and failure. No replacement decoder, Windows-1252/Latin-1 assumption, delimiter inference or CSV parser was used. One non-UTF8 byte is insufficient evidence for a particular alternative encoding.

## Exposure and limits

The whole raw document was acquired and read by the machine. UTF-8 decoding started and may have internally decoded a prefix before failure; it did not complete. No schema cell text was printed to researcher context, and CSV parsing never started. This is not an untouched or target-blind source: the authorized scope and machine acquisition included all documentation bytes, potentially including empirical examples/comments. A failed decode does not undo acquisition or imply zero machine exposure. See the [pre-decode exposure declaration](exposure-before-decode.json).

The record declares CC BY 4.0. Embedded notices remain uninspected because text interpretation stopped; this report makes no license claim about linked measurement objects or cited works. No data workbook, LIS, image, figure, XLSX alternative, model, measurement series or linked standard was requested. There was no fitting, allocation, threshold selection, runtime feature change, scientific test or benchmark admission.

## Next documentary decision

The unknown-encoding stop rule remains effective. Preserve this result and the retained object before a separately written follow-up. Two bounded routes are possible: obtain authoritative encoding documentation without fetching another measurement source, or inspect only ASCII header/field-label bytes under an explicitly separate byte-level projection whose non-ASCII content remains uninterpreted. Any later alternative decoder must state its documentary basis and ambiguity; successful decoding alone would not prove author-intended character meaning. No route is performed by this report.

Even eventual dictionary success would still require actual same-test joins, operational endpoints and units, measurement-uncertainty interpretation, source lineage, missingness and an appropriate inferential frame before evaluation. BAM remains only a possible small metrology reference. G20 is unresolved and G21 is blocked; no claim of scientific superiority or independent evaluation units follows.
