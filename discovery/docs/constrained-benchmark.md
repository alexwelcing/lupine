# Run the frozen constrained JARVIS benchmark

The scientific choices are fixed in
[constrained-benchmark-protocol.md](constrained-benchmark-protocol.md), committed
and pushed as `b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` before acquisition.
[The source audit](constrained-source-audit.md) records metadata-only inspection,
the NIST archive identity, methods, and licensing. This page describes the
implementation; it does not amend the protocol or report predictive success.
The original strict import was blocked by nonfinite tokens in an unused
`elastic_tensor` field. The separately committed
[format amendment](constrained-format-amendment.md),
`e04c5d6cca8e677cadc0cefa4208f2625d89e227`, permits a named compatibility path
while preserving that blocked attempt and every scientific choice.

From `discovery/`, using Python 3.11 or later:

```sh
python -m pip install -e .
python -m unittest discover -s tests -p 'test_constrained_benchmark.py'
python scripts/constrained_benchmark.py acquire --source-format nonfinite-sentinels
python scripts/constrained_benchmark.py freeze
python scripts/constrained_benchmark.py verify
```

No NumPy, external model, GPU, new DFT calculation or extra runtime dependency
is needed for these stages. The standard-library parser streams the JSON
archive one record at a time and converts decimals directly to exact numbers.
The 40.8 MB download is separate from computation. Raw data and receipts default
to ignored `.cache/constrained/jarvis-gap-formation-v1-format-compat/`; supply `--cache PATH`
to use another isolated directory. Do not put raw targets in Git.

The complete guarded workflow also runs the engineering tests, binds their
source and log identities, and supplies the required replay receipt. Use a
fresh work directory; the full replay contains revealed archive values and
must stay in the ignored cache:

```sh
python scripts/reproduce_constrained.py --workdir .cache/reproduce-jarvis-new --source-cache .cache/constrained/jarvis-gap-formation-v1-format-compat --project-dashboard --expected-scientific-digest cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900
```

See [the reproduction workflow](constrained-reproduce.md) for the stage order,
complete direct replay command, and failure handling. A target acquisition or
model freeze alone is not an evaluation. The compact published dashboard is a
projection of the full local report, not a replacement for the underlying audit.

## Stage boundaries and artifacts

| Artifact | Meaning / permitted access |
|---|---|
| ZIP and extracted JSON | Pinned public source; custodian only. Verified size/MD5 plus newly recorded SHA-256 identities. The original blocked attempt stays in its separate `jarvis-gap-formation-v1` cache. |
| `archive-receipt.json`, `source-receipt.json` | Source identities, protocol identity, attribution and transformations. Written before target parsing. |
| `representatives.json` | Metadata first pass; exact composition identities and representatives selected before target availability/value inspection. |
| `metadata.json` | Split, cap, panel and missingness manifest; no target values. |
| `train.json`, `calibration.json` | Only the labels authorized for fitting and calibration. |
| `evaluation-targets.json` | Custodian's sealed targets; excluded from freeze and verification reads. |
| `custody-receipt.json` | Binds all of the preceding identities, including the evaluation-file hash passed forward without rereading target bytes. |
| `predictions.json` | Exact five-neighbor and one-neighbor predictions with training-neighbor IDs. |
| `freeze.json` | Prediction/model/input/code digests, calibration, panel intervals, all baseline orders, conditional selections and explicit shift abstention. |
| `freeze-execution.json` | Local elapsed time, peak RSS and frozen-file identity, kept separate from deterministic scientific contents. |
| `predictions-incomplete.json` | Checkpoint if the computation deadline is exceeded; not a usable freeze or permission for replay. |

Generated scientific artifacts are immutable within a cache directory. A rerun
with identical contents is permitted; a different write fails. Existing
`freeze.json` is verified before reuse. Keep prior artifacts when correcting a
bug and use a separate cache directory; document outcomes already opened and
the correction instead of describing them as untouched data. A changed
implementation hash intentionally invalidates a previous freeze for the current
code, even if the edit appears mechanically harmless.

`verify` checks the frozen protocol and amendment bytes, freeze checksum, code dependencies,
custody/source/metadata/train/calibration/prediction identities and evaluation
seal identity. It deliberately does **not** open evaluation target bytes.
Only replay's `open_sealed_targets` checks and decodes them, after freeze
verification. Each parsed sealed JSON document is hashed and decoded from the
same captured bytes, preventing a replacement between verification and parsing.
Hashes detect identity changes; they do not attest physical truth, independent
blinding, or immunity to an actor who can rewrite every receipt and source.

## Exact neighbor implementation

For positive normalized atomic fractions, L1 distance satisfies
`d(a,b) = 2 - 2 * sum_e min(a_e,b_e)`. Any overlapping element gives distance
strictly below 2; disjoint compositions all tie at 2. The implementation searches
every training row that shares an element, ranks exact rational distances, and
fills any remaining places with the first disjoint JIDs in lexical order.
This avoids many unnecessary full distances while preserving the protocol's
entire five-neighbor order, including all distance ties. Generated and
adversarial tests compare it to a separately expressed full-distance oracle.

Numeric strings in source target fields use the finite JSON-number grammar
`-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?` with no surrounding whitespace.
Integers and parsed `Decimal` values are accepted directly. Missing/nonnumeric
fields remain unresolved. Booleans are invalid; binary floats and duplicate keys
fail rather than changing scientific values through rounding or coercion.
`--source-format nonfinite-sentinels` represents exactly the three bare upstream
tokens `NaN`, `Infinity` and `-Infinity` as distinct typed invalid markers. A
selected target marker remains unresolved with reason `invalid_nonfinite`;
an unused-field marker cannot enter metadata or prediction. They are never
numeric bounds, zeros or features. `--source-format strict` preserves the
original rejection behavior. All generated/sealed JSON always remains strict;
no value-based outlier filter or physical clipping is used.

## What the tests establish

The custody/freeze suite checks chunk-boundary parsing and exact decimals,
nested duplicate rejection, representatives selected without target access,
missing chosen polymorphs without substitution, malformed IDs, exact neighbor
ordering including disjoint ties and cell multiples, fixed splits, objective
sign/interval transforms, unbounded calibration, unsupported-family abstention,
target-free freeze/verification, changed seals/code, same-byte hash/parse
behavior, and timeout checkpointing. Fixtures are synthetic and make no claim
about JARVIS predictive accuracy.

Real-data conclusions must come from the separately logged replay, including
every failed gate. A finite radius is conditional on unverified exchangeability;
oxygen-family abstention is a scope response, not successful oxygen-property
prediction. Archived calculations provide recorded answers for this finite
task, not experimental validation of materials in a power plant.

## Executed custody and freeze checkpoint

On 2026-10-10, all **10** focused custody/freeze tests passed. The compatible
source pass admitted 75,993 records, 51,889 composition representatives, and no
unresolved selected-property representatives. The fixed caps yielded 4,096
training and 2,048 calibration representatives, plus 50 complete panels in
each evaluation arm. These are source/partition counts, not accuracy results.

The real freeze computed all 4,048 calibration/evaluation predictions and
passed the target-free `verify` command. Its calibration rank is 2,044, with
gap radius `15197/2500` eV and formation-energy radius `1466399/500000` eV/atom.
These finite but broad bounds retain the `assumed_unverified` premise status;
their coverage and practical value require replay. The freeze process recorded
125.4842 seconds elapsed and 183,096 KiB peak RSS on Linux. This memory
measurement covers that process, not a separately measured acquisition peak.

| Artifact identity | SHA-256 |
|---|---|
| Pinned ZIP bytes | `d4c64660e9e1fa45c82bd8868a96ec10162195eed69636445972c05550d8d0d6` |
| JSON member bytes | `72da38713e509195220771b83b07cbd2d21f5d0d5cc203e1067dd597465b0b35` |
| Metadata manifest | `e4f623329be262c9057eb9a7e9d7ca96fb05c8e7877845e3da4fb450c8c90655` |
| Prediction manifest | `530b13400aa1b6b97b3362f76358cfd2bce5a8610221f3fc69da3ec39323c343` |
| Freeze file bytes | `7490a580796566bb972e52394816b680b472e46d83566a22f415168582ac49b6` |
| Freeze payload excluding its own checksum field | `6a6166486b5761d1138d3d31df03a2dc00ed900a28dfa1ee59780eae70637ff0` |

The strict import's blocked receipt remains separate, with SHA-256
`2c82f879eac770e64528fa679e181a05925c491f7ad46494dac7d016099600c9`.
Neither this checkpoint nor successful format compatibility is a scientific
recommendation success. Follow the executed replay report for that decision.
