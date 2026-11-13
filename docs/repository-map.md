# Lupine Science: repository map

Moved from the root [README](../README.md) on 2026-11-13, when the README was cut
to one screen. The text is unchanged; only link paths are adjusted for this folder.
Every tracked root directory, and where retired roots went, is listed in
[ROOTS.md](../ROOTS.md).

## What is here

This monorepo is the program record and historical evidence. Active research
happens in [`lupine-rhizo`](https://github.com/alexwelcing/lupine-rhizo); the
Library reader is [`lupine-ledger`](https://github.com/alexwelcing/lupine-ledger)
([library.lupine.science](https://library.lupine.science)); the LUPI viewer at
[lupi.live](https://lupi.live) deploys from
[`alexwelcing/Lupi`](https://github.com/alexwelcing/Lupi).

| Path | What it is |
| --- | --- |
| [`docs/`](./), [`CHANGELOG.md`](../CHANGELOG.md) | Program record: methodology, preregistrations, runbooks and monorepo history |
| [`paper/`](../paper/), [`paper2/`](../paper2/), [`mlip_immi/`](../mlip_immi/), [`data/`](../data/) | Historical evidence: working-draft manuscripts, benchmark data and analysis code |
| [`replication/error-geometry/`](../replication/error-geometry/) | Replication kit ([doi:10.5281/zenodo.20787874](https://doi.org/10.5281/zenodo.20787874)). Its functional-clustering result (p = 0.029, against experimental elastic constants) was not reproduced by a later preregistered Round-2 test against DFT targets (effect −0.14, p = 0.13). |
| [`atlas-distill/`](../atlas-distill/) | Rust engine, including standard fixed- and random-effects meta-analysis of correlation coefficients across independent groups ([known issues, fixed 2026-11-12](../atlas-distill/README.md#known-issues-fixed-2026-11-12)) |
| [`docs/conjectures/ledger.md`](conjectures/ledger.md) | Refutation ledger (snapshot; the maintained copy is in [`lupine-rhizo`](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md)) |
| [`lean-spec/`](../lean-spec/) | Lean 4 statements behind published arithmetic |
| [`atlas/`](../atlas/), [`library-site/`](../library-site/), [`glim-think/`](../glim-think/) | Historical copies of the viewer, Library and control plane |
| [`archive/`](../archive/) | Retired surfaces kept for provenance |

## More

- [Overview](overview.md)
- [Results in detail](results-detail.md)
- [Development](development.md)
