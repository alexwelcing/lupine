# BAM first-record ASCII documentary addendum

A separately scoped, single local projection identifies **eleven literal ASCII headers; column 7 is `UNIT`**. This resolves only which extra header was absent from the publisher prose's ten explicitly named roles. It does not resolve whole-file encoding or any actual unit, endpoint, requirement, uncertainty or provenance definition.

The original [full-document UTF-8 failure](../decode-failure.json) is preserved. Root then authorized this additional first-record-only byte projection, frozen in [scope.json](scope.json) before the [recorded invocation](execution.json). No extra network request was made. This is not a successful execution of the earlier deferred partial-role parser, and it does not amend that profile's case-sensitive labels or acceptance rules.

The same retained 41,000-byte object has SHA-256 `e75c85d770598acf19a4bd1cb9c94b6adf7bb92cf46b153cbc904896a1160f1a` and publisher-matching MD5 `330a8405f6cb9c4fcfe221baea7ced27`. The identity gate read/hash-checked the whole buffer. Only bytes 0 through 178, the 179-byte first physical record, were interpreted as header text; the following terminator is CRLF. All selected header bytes are ASCII. Among the three frozen candidates (comma, semicolon, tab), only semicolon satisfied the explicit quoting and multi-field rules. This supports that header's delimiter; it is not proof of the complete body's CSV dialect or multiline quoting.

The [literal result](result.json) contains these field labels, with no case folding, synonym substitution or semantic guessing:

| First-record column (1-based) | Literal label |
| --- | --- |
| 1 | `CATEGORY I` |
| 2 | `CATEGORY II` |
| 3 | `CATEGORY III` |
| 4 | `CATEGORY IV` |
| 5 | `ENTRY` |
| 6 | `SYMBOL` |
| 7 | `UNIT` |
| 8 | `DATA TYPE` |
| 9 | `EXEMPLARY ANSWER OR OPTIONS SEPARATED BY SLASH IN CASE OF DATA TYPE DROP-DOWN LIST` |
| 10 | `REQUIREMENT` |
| 11 | `COMMENTS` |

The header contains no duplicate labels or empty fields. Those are documentary header observations, not claims that body values are complete or conform to their labels. `UNIT` is an observed label; accepted unit strings, conversions and endpoint meanings remain uninspected. The four category labels suggest intended hierarchy but do not establish actual row inheritance, grouping or field association. The existence of `COMMENTS` and examples/options columns does not make their contents target-free.

The executed [projection script](project_header.py) performs no text decoding outside this first record and no body CSV parse. Whole raw-buffer machine access occurred again for identity verification; researcher-visible content was restricted to these ASCII labels and structural receipt fields. The original potential empirical-example exposure scope remains disclosed. The independent audit may verify this same header locally without a second GET; it is not an independent scientific observation.

Stop here. Documentary body encoding, hierarchy/definitions, unit/condition dictionaries, uncertainty/covariance and source provenance remain unbound. Any further body inspection requires a separately justified encoding plan that preserves the original failure and does not infer an encoding merely because a permissive codec accepts every byte. No physical material result, test count, independent unit, eligibility rule, model, allocation, threshold or benchmark admission is established.
