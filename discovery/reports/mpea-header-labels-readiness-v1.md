# MPEA first-header disclosure and mapping checkpoint

The reviewed G15A tool ran from published `c9fb192ed15cf11874c59083b1fae72f7af3224f`
only after [all four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38076623056).
It used the verified ignored cache, made no network request and inspected only
the first logical record. Both fresh processes returned expected exit 2 /
`BLOCKED_SCHEMA` / `SCHEMA_UNCONFIRMED`, with identical receipt SHA-256
`70f50fa99db6b39b769be392ec1c64c655f8f32d7587f04f522e6a794c4accee`.

The [public receipt](mpea-header-labels-v1.json) and
[execution record](mpea-header-labels-reproduction-v1.json) disclose all 23 exact
labels. Original G15 source, its redacted receipt and its failure state remain
unchanged. The whole 332,126-byte target-bearing file was acquired and hashed
at the earlier checkpoint; no observation row has been text-decoded by either
header tool. This is source exposure, not prospective blinding or a scientific
benchmark.

The [separate mapping](../docs/mpea-column-mapping-v1.md) enumerates every
position using the actual header and cited paper semantics. It specifies five
prospective metadata positions while preserving four uninterpreted fields and
all performance/ROM fields as withheld. A structural check confirms all 23
labels/order, original header-receipt hash, evidence references and the exact
five-position allowlist. This is document/identity validation, not semantic
proof of observations.

**Next-step decision:** ready to build and independently test a narrow
row-metadata producer against the committed mapping; not ready to decode
scientific targets or run a new evaluation. The new producer must freeze its
source, resource limits, missing-token handling and disclosure rules before
it frames any actual observation record. Synthetic prototype work is isolated
in ignored scratch and cannot read the known real artifact through its fixture
path. No production row extraction has occurred.

Scientific prerequisites remain open: row widths/missing syntax, usable paired
measurements, specimen/source/composition identity, condition comparability,
measurement uncertainty, feature permissions and panel sampling law. No splits,
fits, thresholds or eligibility decisions were made. The
[evaluation design notes](../docs/mpea-evaluation-design-notes.md) describe a
possible archival-record recovery experiment; they are not a preregistration.
All earlier scientific failures and NO-GO conclusions stand.
