# Limits of the hypothetical comparison

Both proposed codecs are single-byte interpretations that preserve ASCII. The same ASCII semicolon, quotation mark, CR and LF bytes therefore retain their parser roles in both. With `StringIO(newline="")` and the fixed CSV reader, agreement of record framing is expected; it is not independent confirmation of the author-intended encoding, whole-file format conformance or scientific semantics.

The useful documentary observation is narrower: a selected cell composed entirely of ASCII characters has the same literal text under both specified interpretations. This is conditional evidence about those bytes and hypotheses. It does not prove that all possible encodings, mixed encodings, application conventions or semantic dependencies would agree. Every non-ASCII cell stays unbound even when the two decoded strings coincide.

No interpolation, normalization, category fill-down, guessed unit alias or semantic replacement may convert unknown cells into a complete dictionary. Numeric technical definitions may be discussed as documentary conventions; arbitrary empirical examples must not enter the public report. Full-file and internal-cell exposure remains declared, and the raw CSV/internal projection remain ignored.
