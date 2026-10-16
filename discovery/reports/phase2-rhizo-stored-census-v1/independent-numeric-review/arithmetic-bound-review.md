# Independent rational-size bound

This is a source/contract review of serialized-number arithmetic, not a theorem about material properties or measurement error. No candidate code was executed to derive it.

An accepted token has an integer mantissa with fewer than `10^128` in absolute value and decimal scale in `[-1024,1024]`. Thus an accepted number has magnitude below `10^1152`. Writing any pair with common denominator `10^1024` gives a discrepancy numerator of magnitude below `2 × 10^2176`. Squaring gives a numerator below `4 × 10^4352` over denominator `10^2048`; summing the nine fixed positions gives a squared-discrepancy numerator below `36 × 10^4352` (at most 4,354 decimal digits). Dividing by nine for the mean gives a denominator at most `9 × 10^2048` (2,049 digits). Reducing a rational can only reduce these sizes.

Signed and absolute discrepancies have smaller bounds. Therefore the declared 5,000 numerator-digit and 2,500 denominator-digit limits cover every accepted numeric token pair and nine-position exact summary. The separate serialized private/public byte caps may still reject an otherwise numerically valid whole result; they are not a license to truncate records or return partial numerical groups.

The adversarial generated fixture pairs a 128-digit mantissa at exponent `1024` with `1e-1024`. Its squared discrepancy crosses Python's default 4,300-digit integer-to-string limit. Independent verification uses `Decimal.as_integer_ratio`, exact `Fraction` arithmetic, and chunked parsing of returned integer strings, without changing the process-global digit limit or calling the candidate's arithmetic helpers.
