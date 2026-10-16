# Exact finite-frame and IID planning illustration

![Fixed hypothetical sampling calculations](second-generation/finite-versus-iid.png)

Standalone exports: [SVG](finite-versus-iid.svg), [CSV](exact-data.csv), and
[exact JSON](second-generation/exact-data.json). The root reviewed the second
PNG; the independent arithmetic/claim review passes all 101 exact rows. These
are different sampling experiments, not a performance or acquisition-cost result.

The exact original author README is preserved in `README.md.bytes.json`. The
current README revises only export navigation and identifies that change. Source
scripts, both generation receipts and independent review remain adjacent. Four original CSV/SVG artifacts contain
standard CRLF or generated path whitespace; their exact UTF-8 bytes are preserved
in `.bytes.json` wrappers. The original inventory hashes refer to those decoded
payloads. Encoding a wrapper's `text` as UTF-8 reconstructs its original path.
`publication-format.json` binds the mapping and clean export verification.

The directly downloadable CSV changes only line endings; parsed rows are equal.
The directly downloadable SVG removes line-end whitespace; its full parsed
structure, attributes and nonwhitespace text agree after normalizing only SVG
path-data whitespace. It is an equivalent vector representation, not a new
render or a changed mathematical result. The original generated SVG is also
reconstructible exactly from its wrapper. No check configuration was relaxed.
