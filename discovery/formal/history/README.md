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
