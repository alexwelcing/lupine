# Li v3 actual capture and blocked layout

2026-10-16 · owner `phase2_evidence`. Public-receipt review plus prospective diagnostic design; no raw archive read by this reviewer.

Capture at commit `5addf4f80e345afa50a4bcc26b9db24d220a3af5` completed at 05:45:45 UTC with `CAPTURED / CAPTURE_VERIFIED`, exit 0. The public receipt records 183878 bytes, publisher MD5 `041bbe095c54615e5a3c289facb18ce5`, and observed SHA-256 `9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa`. Execution records bind CI run 38854925885; parent reports all four jobs successful, but this review made no CI/network request.

Both subsequent envelope processes exited 2 with `BLOCKED_SCHEMA / ZIP_LAYOUT_UNSUPPORTED / BLOCKED_LAYOUT`. Their public bytes are identical (SHA-256 `fe74a4a7b5a411ddee79c852335e3e330cce4e923e959d8162a4d1480900433c`). Both report zero decompression and XML decoding, with member/sheet/row/pair/group/overlap counts unresolved. The three execution records report unchanged HEAD and identical before/after 300-file runtime manifests. Repeated failure is reproducible behavior, not an independent scientific sample or source rejection.

## What source inspection establishes

The unchanged `scripts/li_v3_custody.py` maps several checks to the same generic code. Because no XML decoding started, the following ZIP-stage branches remain possible; none is identified as the actual cause.

| Source lines at captured revision | Possible generic rejection |
|---|---|
| 185–191, 243–249 | Unsupported member path/name, duplicate member or unsupported member kind. |
| 230–232, 238–239 | End-record signature/geometry/disk/count/comment mismatch, or central-directory count/comment mismatch. A last-22-byte signature mismatch alone does not diagnose the presence of a comment. |
| 253–258 | Unsupported flags, compression, version, central extra/comment, file kind, stored size or local offset. |
| 267–273 | Local/central header disagreement, local extra, filename disagreement or payload boundary. |
| 275–277 | End offset/central-size mismatch or missing required envelope member. |

Malformed parsing and bounds can separately yield `ZIP_INVALID`; count bounds yield `ZIP_LIMIT`. The current result supplies no basis to blame a particular Excel extension, assume corruption, remove extras, change the profile, or acquire a replacement workbook.

## Small next diagnostic

Add a separate source-frozen `scripts/li_v3_zip_diagnostic.py`, author/independent synthetic tests and a dedicated contract. Leave all five old frozen files unchanged. Reuse the old no-follow regular-file reader, exclusive receipt writer and canonical validation helpers. Bind the original capture commit, five file digests, exact canonical capture SHA-256 `13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009`, fixed source inventory and observed object SHA-256. The new diagnostic implementation identity is separate from the historical capture identity; a later HEAD is acceptable only with all old bytes unchanged. Never rewrite or recapture the old object/receipt to make the bridge pass.

After its own published source and exact-commit CI are verified, the diagnostic may reread the sealed object once, verify its size/MD5/SHA-256, and classify the original ZIP predicates in their original order. It may parse central-directory entries and fixed local headers, internally decode names only for the existing path/profile tests, and skip payload regions by validated lengths. It must never decompress, open member payloads, parse XML or inspect worksheet/string contents. Public output contains one closed first-failure category and constant scope fields; no names, raw field values, offsets, per-member digests, exception text or lists of all failures. A header-only acceptance still returns `BLOCKED_SCHEMA` and does not attest envelope or scientific validity.

Expose honest stage flags for raw target-bearing buffer read and directory/header/name parsing. Metadata can itself carry scientific text; a categorical projection is a reviewed disclosure limit, not an assertion of zero information or hostile-code isolation. Keep all scientific counts null and all fits/splits zero. Fixed input paths and source identity only; no archive URL or object override. Outputs are exclusive under a fixed ignored diagnostic namespace.

Synthetic fixtures must cover original first-failure ordering; valid stored/deflated headers with deliberately opaque invalid payloads; extra/comment/flag/version/type/name/offset disagreements; malformed/truncated boundaries; required-member absence; changed capture/source identities; candidate/uncommitted production refusal; no-follow/output conflict; and canaries in names, comments and payloads. Patch all decompression/member-open and network paths to fail if reached. Compare each fixture's legacy ZIP result with the unchanged guard. No actual object is permitted during implementation or review. The user's existing research authorization covers this bounded work; source review/publication/CI are methodological gates, not a new permission request.
