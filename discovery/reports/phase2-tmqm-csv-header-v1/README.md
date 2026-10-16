# tmQM pinned CSV header: literal labels observed

The single authorized inspection returned **HTTP 200** and the first physical record: **115 bytes, 11 labels, semicolon delimiter, LF ending, no UTF-8 BOM**. The application made one `readline(4096)` call and no second body call; response close completed. The [actual public result](actual/public.json) and [process receipt](execution-first/receipt.json) record process exit 0 and 0.808642 s elapsed. This is header evidence, not scientific admission or a complete-file check.

The observed labels are:

```text
CSD_code;Electronic_E;Dispersion_E;Dipole_M;Metal_q;HL_Gap;HOMO_Energy;LUMO_Energy;Polarizability;CSD_years;SMILES
```

These establish literal names in the first record. No unit is explicit in those labels. `CSD_code` is an identifier-label lead; uniqueness and a valid coordinate/property join are unknown. `CSD_years` is newly observed, but its type, meaning, multiplicity and usefulness for grouping are unknown. No numerical rows, complete-pair count, missingness pattern, eligibility rule or scientific grouping were inspected. The [prior curator survey](../phase2-primary-github-source-survey-v1/README.md) records the README's method distinction—GFN2-xTB polarizability versus the listed DFT single-point properties—remains necessary. The header establishes no license or upstream CSD permission.

The request used the exact primary-GitHub URL already declared in metadata, pinned to commit `ece824419c9006fe66436daf233822b75533b82f` and declared CSV Git blob `3d5bbfa75f01a8d334d1e630b07f94dc7d36603f`. It did not revisit the denied curator webpage or request an alternate copy of that page. The response's Content-Length matched the declared 19,925,955 bytes; the remainder was not requested by the application and the full Git blob/size/content was **not verified**. The response ETag is retained as an opaque server declaration.

Exposure is explicit: the socket/network/Python buffering layers may have accepted numerical target-row bytes beyond the returned line. That amount was not measured and remains null. The 4096 limit bounds the requested application read, not all lower-layer buffering. No numeric target values were returned in the validated public labels or displayed to the researcher. The raw 115-byte prefix remains private and is excluded from publication. This is not an untouched-source or target-free claim.

Before this request, the [frozen scope](scope.json), exact reader and synthetic controls received [independent source review](peer-review/source-review.json). The first author run passed 13 synthetic methods; the reviewer then identified that blocked/failed-close operations should return nonzero. Original source, tests, hold and first receipt remain preserved. The corrected source returns 0 only for observed lexical labels plus successful close, otherwise 2; its final 15 synthetic methods passed in 0.010 s unittest / 0.269942 s process time. The [final hold](source-hold-final.json) binds the actual reader, scope, tests and fixture receipt. The reviewer did not independently execute tests or acquire the CSV.

The actual reader SHA256 is `fb52747391f2176591f7aa08d3aa207846b5a466e55a9e162646c8a1cc58c952`, unchanged before and after the one operation. The public result SHA256 is `3db7720778e66ba80918c2b70b2aca21d868ce5721490d1c0098a1913a5fa014`. These hashes establish artifact identity, not physical validity, verified complete pairing or fresh evaluation units. No parser relaxation, retry, further acquisition, model fit, threshold, allocation or benchmark admission followed this result.
