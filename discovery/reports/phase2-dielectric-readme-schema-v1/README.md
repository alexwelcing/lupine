# Dryad README access stopped at HTTP 403

The one authorized GET to the literal [README PDF link](https://datadryad.org/downloads/file_stream/69472) returned **HTTP 403** on 2026-10-16. No redirect occurred. The response was 118 bytes with `Content-Type: text/html`, not a PDF. Its SHA256 is `58bf2215b395dcac74c009aa98701854e43cbe54a1cd3a95fee6a647ca9910d4`.

The first [access receipt](acquisition/receipt.json) is preserved unchanged. There was no retry, alternate API, mirror, credential use or bypass. The sibling JSON data link was not requested. This records denial for this exact README URL and request; it does not establish that every Dryad resource is inaccessible or identify the cause of denial.

The [scope](scope.json), acquisition script and offline parser were frozen before the request. They allowed a bounded PDF and at most two ordinary HTTPS redirects to specified public delivery hosts, with signed-query values withheld from receipts. The actual chain contained one response, no query and no signed delivery URL. The prospective four-MiB/PDF/page/text limits were never exercised against a PDF because acquisition stopped first.

**The offline parser was not invoked.** No PDF, raw extracted text, schema excerpt, field-unit definition, calculation pairing, missingness rule or advertised count was obtained in this task. The unexecuted parser is retained as preparation evidence, not a tested or successful document reader.

The only new machine-read source body was the 118-byte denial response. Its body was not displayed or interpreted as scientific content and remains ignored, outside the public copy set. Planned whole-PDF/numeric-example exposure did not occur. Earlier primary-paper qualitative exposure and earlier metadata observations remain unchanged; no freshness claim is made.

The prior primary-archive DOI, registry/landing version `1`, declared CC0-1.0 and literal file-name findings remain documentary evidence with their original limits. The README filename's `v3` suffix is still not reconciled with the dataset-version convention. Exact observation schema, processed-column units, calculation-level pairing, missingness/completeness, file identity and equivalence to the matminer/Figshare object remain unresolved.

Root reports a separate Li `A1` XML-profile block; this source task neither inspects that operation nor retries or modifies it. No data files, joins, fits, threshold choices, benchmark selection or admission occurred. The useful next disposition is to retain this exact access failure alongside the metadata findings; any alternative route would require a separate decision, not an automatic retry.

The [source bindings](source-bindings.json), [exposure ledger](exposure-ledger.json) and [disposition](disposition.json) preserve what actually ran and what remained unexecuted. The public inventory excludes the denial body and any cache files.
