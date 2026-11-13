# Lupine Science

Lupine Science measures where machine-learned models of atoms go wrong, against published references and pass/fail gates set in advance, and publishes every verdict, failures included.

## What is here

This monorepo is the program record and historical evidence. Active research
happens in [`lupine-rhizo`](https://github.com/alexwelcing/lupine-rhizo).

- **Program record** (`docs/`, `CHANGELOG.md`): methodology, preregistrations and history.
- **Historical evidence** (`paper/`, `paper2/`, `mlip_immi/`, `data/`): working-draft papers, data and code.
- **Replication kit** (`replication/error-geometry/`). A later preregistered test
  did not reproduce its functional-clustering result.
- **Engine and checks:** the Rust engine (`atlas-distill/`) and Lean statements that check
  published arithmetic, not the physics, data or pipeline (`lean-spec/`).
- **Archive** (`archive/`) and historical copies of the viewer, Library and control plane.

## Status

Working drafts, not peer-reviewed. Failures and stopped studies are published beside what held.

## Start here

- [Results](https://lupine.science/results/): what held and what did not
- [Corrections](https://lupine.science/corrections/): what we retracted, and why
- [Refutation ledger](docs/conjectures/ledger.md) (snapshot of the copy kept in `lupine-rhizo`)
- [Lupine Library](https://library.lupine.science): read the research notes
- [LUPI viewer](https://lupi.live): opens structures in a WebGPU-capable browser

## More

- [Overview](docs/overview.md): aim, approach and acknowledgments
- [Results in detail](docs/results-detail.md): scope, certification boundary, failures, October stop
- [Repository map](docs/repository-map.md): the main paths and related repositories
- [Development](docs/development.md): build, test and citation

## Licence

You can reuse our code (MIT) and our first-party text and data (CC BY 4.0) with
attribution and no share-alike obligations. Third-party material keeps its own terms. See
[`LICENSE`](LICENSE), [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md), [`LICENSE-DATA.md`](LICENSE-DATA.md) and [`NOTICE.md`](NOTICE.md).

## Contact

Research partners, model builders, press and investors: alex@lupinesci.com.
