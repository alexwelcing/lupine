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
