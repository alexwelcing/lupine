# Independent synthetic target-custody review

No blocking defect was found in parser source
`7f649dd50d7c5589fd9da0f9745b7936b7a3a2bf631a8418affae4a67be1ee9c`.
All **15 independent tests passed** with producer, author tests, README,
independent tests and the implementation contract unchanged before and after
the run. `independent-review-v1.json` and `tests-final.txt` bind that execution.

The tests directly instrument byte accumulation: only the expected header and
authorized target cells enter buffers. They perform 372 opaque-cell
substitutions across every non-target column and five unauthorized row routes,
including invalid UTF-8, NUL, quotes, embedded newlines and missing-looking
tokens. The authorized numeric calls and results remain identical. Whole-source
size/MD5/SHA mismatches stop before framing; late header/framing/count/cap
failures stop before the first numeric decoder. The exact field and record
boundaries and all 4,096 allowed rows are tested; an extra row produces no
decoded prefix.

An independent standard-library Decimal-to-Fraction oracle checks 378 cases
across signs, decimal forms, exponents, reduction and 512-bit boundaries.
Preflight controls block conversion/powers before oversized or unsupported
tokens are interpreted. Missing, unsupported lexical, nonfinite, resource-limit
and negative-conflict states remain distinct. Reserved roles use the same
parsing rules, and malformed authorized targets preserve their rows. Source
ordinal/group-role linkage, immutable results, constant errors and the absence
of file reads or logging are also checked.

The first 14-test run had one **test-fixture arithmetic error before producer
invocation**: a purported 65,536-byte record contained 65,534 bytes. Increasing
its fourth opaque field by two bytes corrected the fixture. The original
failure log, corrected 14-test log and final 15-test log are preserved; the
producer and declared scientific grammar were unchanged.

This is constructed-fixture engineering evidence, not actual target parsing,
physical endpoint validation, a formal runtime proof or production approval.
The pure parser deliberately has no persistent stage capability. A separately
reviewed driver must establish metadata/provenance linkage, stage ordering,
immutable freezes and production authorization. Whole-source capture and
framing observe bytes; the tested boundary limits which cells are accumulated
and interpreted, rather than claiming that the source's target bytes were never
read. No experimental cache or actual targets were opened, and no entropy was
drawn or actual allocation performed. Main repository files were unchanged.
