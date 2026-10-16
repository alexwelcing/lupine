# Historical formal receipts

`g10-theorem-inventory.json` and `g10-AXIOMS.txt` preserve the six-module,
88-statement receipt published at G10 checkpoint `f55f0c4`. Before copying them,
the inventory's axiom-output hash and all six source hashes were checked against
the actual files. The module paths in that inventory are relative to the parent
`formal/` directory, not to this history directory. Those six source modules
remain unchanged by the projection extension.

These files record a historical audit. The current audit continues to discover
and re-elaborate every root proof module, writing its result to the parent
`theorem-inventory.json` and `AXIOMS.txt`. No historical receipt substitutes for
that current-source verification.

`g13-theorem-inventory.json` and `g13-AXIOMS.txt` preserve the seven-module,
100-statement receipt at G13 checkpoint
`429751038af7be32b0e6bac583508a59d0aa23c1`, immediately before the direct
candidate-pool increment. Those receipt bytes originated with the projection
extension at `0a8b248943fa1a65400214eebbe54377d8c3ff5e` and remained unchanged
through G12 checkpoint `7c82058672e2f9ee24b9a774d530506a7e4526eb` and G13.
The copies were checked against committed G11/G13 bytes, the axiom-output digest
and all seven current source hashes before the new module was added. The seven
historical source modules remain unchanged by the decision-pool extension.
Their inventory paths are relative to the parent `formal/` directory.

`g16-theorem-inventory.json` and `g16-AXIOMS.txt` preserve the eight-module,
117-statement receipt at checkpoint
`d169b1070eaec916ebf9af221aa4596dd4b2cb1d`, immediately before the finite
exchangeability increment. These receipt bytes originated at G14 checkpoint
`522fb280bad7ef1794c97a0de1f64a0e90598efe` and remained unchanged through the
G16 release. The copies were checked against both committed checkpoints, the
axiom-output digest and all eight current source hashes before the ninth module
was added. The eight historical Lean sources remain byte-identical after this
increment. Their inventory paths are relative to the parent `formal/` directory.

`pre-normalization-theorem-inventory.json` and `pre-normalization-AXIOMS.txt`
preserve the nine-module, 125-statement receipt at checkpoint
`28b929f6ac74edaeccef148c7a1aa29b3b4bfdb0`, before normalization integration.
The copies were verified against committed bytes, all nine module source hashes,
and the combined axiom-output hash. Paths remain relative to parent `formal/`.

`pre-finite-planning-theorem-inventory.json` and
`pre-finite-planning-AXIOMS.txt` preserve the ten-module, 130-statement
receipt at checkpoint `9d1f21dae141a28db378ee2e16aa83340df57877`, before finite-population
planning integration. The copies were verified against committed bytes,
all ten module source hashes, and the combined axiom-output hash. Their
module paths remain relative to parent `formal/`. These historical bytes
do not replace the fresh audit required after adding the eleventh module.
