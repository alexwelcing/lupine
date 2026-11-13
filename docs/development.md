# Lupine Science: development

Moved from the root [README](../README.md) on 2026-11-13, when the README was cut
to one screen. The text is unchanged; only link paths are adjusted for this folder.

## Reproduce and build

```bash
# Rust engine (atlas-distill)
cargo test --manifest-path atlas-distill/Cargo.toml --bin atlas-distill

# Python Distill packages
cd python && python -m pytest -m unit -q

# Lean statements (run inside lean-spec/ so the pinned toolchain is used)
cd lean-spec && lake build
```

The replication kit's own instructions are in
[`replication/error-geometry/README.md`](../replication/error-geometry/README.md).
Contributor notes, focused gates and Windows guardrails are in
[`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`docs/ONBOARDING.md`](ONBOARDING.md);
naming and agent-readable files are described in
[`docs/brand/README.md`](brand/README.md).

## Citation

```bibtex
@unpublished{welcing2026projection,
  author  = {Welcing, Alexander},
  title   = {The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint},
  year    = {2026},
  note    = {Working paper, in preparation}
}
```

Replication kit: https://doi.org/10.5281/zenodo.20787874 · Round-2 draft
package: GitHub release
[`projection-law-round2-2026-06-29`](https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29)

## More

- [Overview](overview.md)
- [Results in detail](results-detail.md)
- [Repository map](repository-map.md)
