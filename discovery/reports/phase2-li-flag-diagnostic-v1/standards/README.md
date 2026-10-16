# Next step after Li `MEMBER_FLAGS`

2026-10-16 · owner `phase2_evidence` · **PROPOSAL ONLY; no source execution or schema opening**.

Recommend a **separately frozen, finer categorical header diagnostic before any compatible reader amendment**. Preserve both original frozen profiles and their failed receipts. The current result identifies a broad flag incompatibility; it does not identify the flag or justify decoding even the envelope XML.

## What the actual result establishes

The two public diagnostic projections are byte-identical, SHA-256 `50931018f877a66ee56cf522e5d8a0be35cfc35f2c8b7f34884f5ba6caba6ca0`, and bind source commit `41d3e31a14bea040fb37b0aa6a650d6d5e704551` and the previously captured object SHA-256 `9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa`. They report `BLOCKED_SCHEMA`, `MEMBER_FLAGS`, legacy `ZIP_LAYOUT_UNSUPPORTED`, completed directory-name decoding, incomplete header checks, and no decompression/XML/worksheet/shared-string decoding. Root reports successful exact-source CI; this note does not independently fetch CI.

The exact predicate is `bool(info.flag_bits & ~0x800)`: at least one general-purpose flag other than bit 11 is set in the first member that reaches and fails this check, after sorting by local-header offset. It does not mean the first member in the archive necessarily fails. Earlier end-record/directory checks and that member's path/name/profile checks were passed; later compression/version/extra/comment/type/offset checks and local-header agreement were not established for that member. Still later members may have other failures.

In particular, the result does **not** identify encryption, a data descriptor, a harmless compression option, corruption, local/central flag agreement, or an otherwise valid XLSX file. It gives no member identity, row/schema information or scientific readiness. Repeating the same result is computational agreement, not independent evidence.

## Why the ZIP standard matters

The official [PKWARE APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), version **6.3.10 FINAL**, revised 2022-11-01, was retrieved normally and retained with an actual byte/hash receipt. Section **4.4.4** defines the general-purpose flags:

| Flag family | Standard meaning | Consequence for this source |
|---|---|---|
| Bits 1/2 with method 8 | Deflate compression-option indicators; method context is essential. Method 6 uses them differently, method 14 assigns bit 1 differently, and other-method combinations are not a general allowlist. | A future profile could justify accepting these indicators for method 8 while preserving every other validation. Their actual presence is unknown. |
| Bit 3 | On the proposed unencrypted route, CRC and sizes are deferred from local header to a data descriptor. | Cannot simply widen the flag mask: local-header agreement and member-boundary logic must account for descriptors. |
| Bits 0/6, bit 13 | Encryption/strong encryption, or masked local-header values with central-directory encryption. | No decryption or encryption support is proposed. Remain blocked if observed. |
| Bit 5, reserved/unused bits | Patched data or unsupported/reserved functions. | Remain blocked; do not clear them or guess intent. |
| Bit 11 | UTF-8 filename/comment encoding. | Already allowed by the frozen mask; this bit alone cannot explain `MEMBER_FLAGS`. |

Section **4.3.9.1–4** says bit-3 descriptors on the unencrypted route follow compressed data, can have an optional signature, and use different sizes for ZIP64. Section **4.3.9.6** has a central-directory-encryption exception; encryption is blocked before the proposed descriptor category. Sections **4.4.8–9** describe deferred local sizes. A descriptor-support amendment is therefore materially different from allowing method-8 option bits. This specification establishes format meanings, not what the Li file contains.

## Bounded next diagnostic

Freeze a new source/test/contract checkpoint with the unchanged legacy custody and diagnostic digests plus the original capture/object identity bridge. Its production path is cache-only and requires publication/exact-commit CI before use. Reuse the original ordered traversal to reach the same first `MEMBER_FLAGS` failure. Inspect only that already-parsed central entry's flags and compression-method fields; do not read local payloads, decode XML, list members, publish raw bit masks or modify either old profile.

Return one closed category, in this order:

1. `ENCRYPTION_OR_HEADER_MASKING_PRESENT` if bits 0, 6 or 13 are set. The word “present” makes no claim that other flags are absent or the encryption is valid.
2. `DEFLATE_OPTION_FLAGS_ONLY` if the method is exactly 8, at least one of bits 1/2 is set (including both), and all other bits except optional bit 11 are clear.
3. `DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD` if bit 3 is set, the method is 0 or 8, and no additional flags beyond bit 11 and method-8 option bits are set. The allowed masks are exactly `0x808` for method 0 and `0x80e` for method 8. This is only a central-header declaration; no descriptor existence or validity is asserted.
4. `OTHER_OR_MIXED_FLAGS` for every remaining combination. Do not promote method 9 merely because APPNOTE also defines Deflate option bits for it; the frozen profile supports only methods 0/8.

A failure before the expected flag checkpoint, or inability to bind the original object/receipts, remains a constant blocked result. Preserve honest raw-buffer/name-decoding exposure and all scientific counts as unknown. Even `DEFLATE_OPTION_FLAGS_ONLY` stays `BLOCKED_SCHEMA`: it says nothing about later members, local flags, XML or usable data. The category is a deliberately limited metadata disclosure, not zero information.

If the result is method-8 option bits only, the subsequent independently reviewed amendment may define a **new** compatible header/envelope profile accepting exactly those method-dependent bits while preserving local/central equality, bounds, source identity and all other checks. It must examine the remaining headers under that new profile before claiming structural acceptance; the first member's category cannot authorize blanket acceptance. If descriptors are declared, design and test their boundary/CRC/size handling separately. Encryption, unknown or mixed unsupported flags keep the route blocked. No flag is erased from the object and no old failed result is rewritten.

Synthetic review for the next diagnostic should distinguish every bit-family combination and method context, including UTF-8 coexistence, encryption plus descriptor flags, method-9/14 mismatches and reserved bits; preserve first-failure ordering and canary nondisclosure; forbid member-open/decompression/XML/network APIs; and challenge the exact source/capture bridge. These are proposed tests, not executed tests in this note. No source flags, archive payloads or new scientific outcomes were inspected here.
