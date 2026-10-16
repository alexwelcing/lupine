# Archived correction-field data readiness

Current update, 2026-10-16: [the bounded stored-label inspection](../reports/phase2-rhizo-recorded-label-readiness-v1/README.md)
confirms all 144 fixed prediction/reference pairs are present and exact numeric
fields with matching literal units. All tolerances are NULL. This resolves stored
field completeness for that frame; it does not establish physical compatibility,
historical reference choice, discrepancy bounds, independent evaluation or a
screening result. The source is exposed historical evidence. The original
October 10 audit below remains a record of what was known at that time.

Audit date: 2026-10-10. **A concrete archived route exists, but it is not ready
for a physical screening claim.** The strongest match is the Rhizo Y-matrix
fcc surface/vacancy archive. Its source code specifies a finite observation
map and its tree contains paired run/reference-bound evidence paths. Target
completeness, exact model checkpoint identity, reference compatibility,
discrepancy bounds and evaluation independence remain unresolved.

This is a source-readiness audit, not a preregistration, new fit, benchmark run
or reproduction of the upstream paper. It changes none of the negative JARVIS
or training-only results. The machine-readable
[source inventory](../reports/projection-source-inventory.json) records the
paths, Git blob identities, retrieved source hashes and access boundary.

## Pinned sources and access boundary

| Repository | Immutable commit | Role in this audit |
|---|---|---|
| [Lupine](https://github.com/alexwelcing/lupine/tree/701430be937b4ecf376c163b1de67793ed6fdaf7) | `701430be937b4ecf376c163b1de67793ed6fdaf7` | Historical upstream base, before Discovery; tree and license inspection |
| [Rhizo](https://github.com/alexwelcing/lupine-rhizo/tree/81079a8e1bac7ed332712cc92002bd3435e40776) | `81079a8e1bac7ed332712cc92002bd3435e40776` | Active scientific code, Y-matrix run paths, reference schema and licensing |
| [Library](https://github.com/alexwelcing/lupine-ledger/tree/9acdbaf9de337fccdfad419c23867378fce1aafd) | `9acdbaf9de337fccdfad419c23867378fce1aafd` | Research documents and scope; content/data license declarations |

The Rhizo and Library recursive Git trees were complete (`truncated=false`);
the Lupine tree was inspected with `git ls-tree`. A preliminary `ls-tree -l`
size query was cancelled; file-size reads are not needed for the local tree.
All selected retrieved Rhizo source/document bytes match their pinned Git
blob IDs. Artifact paths and blob IDs are metadata, not verification that the
artifact contents meet the intended scientific contract.

No target JSON, run result JSON, bound-evidence payload, generated data-valued
Lean instance, outcome table or figure was opened. No upstream loader was
executed and no fitting or simulation ran. **There was incidental reference
exposure in documentation:** the reference-target README embeds numeric
examples for other property/material lanes alongside its schema and coverage
description. Those examples were visible before that mixed-content boundary
was recognized. This is explicitly not a fully blinded review. The Library
paper's published aggregate results and limitations were also already read;
the historical facet test cannot be represented as newly untouched evidence.
This audit does not reproduce those reference values.

The inspected Library [environment-field draft][paper] supplies the scientific
hypothesis and its limitations; [Projection Law in Plain Language][plain]
emphasizes model-specific corrections and the separate licensing needed for
derived observables. The Library paper is a historical report, not proof of
the assumptions needed by [the Discovery adapter](projection-field-adapter.md).

## What the archive actually offers

| Requirement | Evidence found without opening target arrays | Readiness |
|---|---|---|
| Joint nominal/reference observables | Rhizo tree has 36 fcc statics paths and 36 matching reference-bound evidence paths: nine elements × four model IDs. Source schema supports predictions and optional references in one property record. | Candidate route; per-record completeness and matching not checked |
| Fixed environment map | `paper/figures/envfield/common.py` explicitly maps three anchors to a fourth facet; model-relaxed lattice geometry supplies areas. | Algebra specified; physical discrepancy not bounded |
| Model identity | Runner names CHGNet, MACE-MP small/medium and MACE-MPA-0 medium, writes package version and canonical-input hash. | Partial: checkpoint digest is not a required schema field |
| Reference identity | Reference schema requires material, structure, property, value, unit, method and citation; optional URL/notes. Binder checks units/structure and method preference. | Partial: exact DFT settings, uncertainty and condition equivalence not required |
| Structure/conditions | Statics code constructs named fcc facets, records slab geometry/settings, and computes relaxed slab energies against bulk at the same model lattice constant. | Code contract available; actual archived metadata not inspected |
| Separate anchor/evaluation units | Three property names define anchors and `gamma_110` defines a distinct output. | Property separation possible; no new frozen allocation or fresh holdout established |
| Finite hard field/discrepancy bounds | None established by the inspected docs/code/schema. | Unsupported; certified physical pruning must abstain |
| Multiple held-out candidates sharing a field | The proposed historical map yields one held-out facet per material/model block. | Insufficient alone for a shared-field candidate-screening advantage test |

The nine fcc material names in the code and filenames are Ag, Al, Au, Ca, Cu,
Ni, Pd, Pt and Sr. These are **path counts**, not 36 confirmed valid or
independent scientific observations. The principal unopened references are:

| Pinned Rhizo path | Git blob SHA-1 | Bytes from tree metadata |
|---|---|---:|
| `data/y_matrix_targets/surface_energies.json` | `241a220acd3420742443e26286a2c6f2e9e927f4` | 44,140 |
| `data/y_matrix_targets/vacancy_formation.json` | `8f98a67d89e32cecd9007b390d7629220515dd75` | 17,779 |
| `data/y_matrix_runs/bound/binding_report.json` | `b6822e5f4386a0ac84866dc188938d3347677cbc` | 336,724 |
| `data/y_matrix_runs/env_field_binding_report.json` | `639d7ec5c36355eada9c9c93804b32e3337ea160` | 59,395 |

These metadata seals identify bytes to acquire later; they do not establish
target validity, license inheritance or freedom from historical tuning.
The inventory also records all 36 filename pairs and their unbound evidence
companions, without opening their payloads.

The pinned historical Lupine tree contains the earlier
`replication/error-geometry/` elastic archive, but not the inspected Y-matrix
path family. The Library tree contains prose and some exported report assets;
it does not contain this full Y-matrix run/reference path family. Neither is
an independent replication of Rhizo merely because copies or summaries appear
in another repository. Their other numerical assets were not opened.

## The fixed map, its sign and its limits

In Rhizo [figure source][common], let `theta=(d8,d9,d11)` denote signed
model-minus-reference energy contributions in eV per affected atom. The fcc
bulk gauge is `d12=0`. With `a` the model's relaxed lattice constant in Å:

```
A100 = a²/2,  A111 = sqrt(3)*a²/4,  A110 = a²/sqrt(2)
k = 16.0218 J/m² per (eV/Å²)  [the figure code's literal]

error_gamma100 = (k/A100) * d8
error_gamma111 = (k/A111) * d9
error_vacancy  = 12 * d11
error_gamma110 ≈ (k/A110) * (2*d8 - d9 + d11)
```

Thus the intended observation rows are `(k/A100,0,0)`, `(0,k/A111,0)`,
`(0,0,12)` and `(2*k/A110,-k/A110,k/A110)`. True observables have the adapter
sign `nominal - weights @ theta + discrepancy`. The last row uses the
additional linear continuation `d7≈2*d8-d9`. It is a scientific assumption,
not a geometric identity established by the selector. The three distinct
anchor rows identify three coordinates only under their declared map,
reference uncertainty and discrepancy premises.

The statics [surface implementation][surfaces] independently documents the
two-surface convention `(E_slab-N*e_bulk)/(2*A)`. The atom-area formula must
not receive another factor of two. Areas come from nominal model geometry,
not from a held-out reference lattice constant; a future input contract must
retain that distinction and account for the cost of acquiring geometry.

Two nearby implementations are **not interchangeable** with this map:

- The [runtime calculator][calculator] constructs a cubic through coordination
  knots 8, 9, 11 and 12, uses smooth cutoff coordination, and applies forces
  during relaxation. Its cutoff depends on model lattice geometry. Re-relaxed
  observables need not remain affine in the field coordinates. This audit
  proposes no new calculator run or force claim.
- The [field-instance binder][fieldbinder] uses a conversion derived from the
  exact SI electron charge and rounds anchors to `1e-4` eV/atom for Lean
  literals. Its monotone-softening checks concern those scaled anchors.
  They do not establish a global discrepancy bound, predictive coverage, or
  equality to the older figure code's `16.0218` conversion. Later bcc/diamond
  binding layouts in that source do not extend this fcc facet validation.

A future exact adapter must choose and document the observation map, unit
constant, area representation, square-root enclosure and numerical conversion
error before opening outcomes. Fixed coefficients may be rationalized with
explicit error bounds. They cannot be silently replaced by exact rationals
and then treated as physically exact. Coordinate blocks remain separate per
model, material and justified observation family. Sharing coordinates across
materials requires additional evidence absent from this audit.

## Concrete blockers and leakage routes

The [reference README][targetreadme] identifies reconstructed reference
terminations for Ag/Au/Pt(110) and Sr(111). The ideal fcc count map and the
unreconstructed slab builder therefore cannot be assumed to describe every
reference. The general [binder][binding] checks material, structure, property,
unit and a `DFT-PBE`-then-`experiment` preference; it does not make a dedicated
reconstruction/temperature/uncertainty check in its selection logic. A generic
`bound` status is consequently insufficient for the new adapter's scope.

The [evidence schema][schema] has optional package versions and scalar
reference values/citations, but no required checkpoint content hash or
structured reference uncertainty. The optional `tolerance` is an acceptance
tolerance, not an independently justified hard physical uncertainty bound.
The [input hashing code][hashcode] stores a canonical-input hash rather than
the complete original inputs in each evidence record. Companion statics
records are needed to reconstruct identities; whether they contain all
necessary geometry/checkpoint/source information remains unknown here.

Further boundaries must stay visible:

- Anchor observations are spent evidence, not held-out wins. Three anchors
  already solve for the three free knot coordinates under an exact model.
  A fourth-facet recovery test differs from cross-material transfer.
- Four model predictions of one reference are not four independent reference
  experiments. Group shared material, facet, reference calculation/publication,
  structure and repeated runs for the intended claim; deduplicate repository
  copies by source identity rather than filenames alone.
- The upstream papers and code already used this facet test. A new local
  allocation cannot make those historical outcomes prospectively untouched.
  Reference selection, exclusions, model choice and error-bound selection must
  not be optimized against the proposed evaluation outcomes.
- Positive correlations, clustered intervals, fitted-anchor closure, observed
  maxima and arithmetic proofs over archived literals do not supply hard
  discrepancy bounds. Reference error, relaxation error, missing environmental
  coordinates and numeric approximation need separate justified treatment.
- First-shell fcc energetics do not validate alloys, corrosion, high-temperature
  plant service, bcc/hcp transfer, planar-fault correction or force improvement.
  The upstream draft explicitly retains a negative near-equilibrium force result.
- One `gamma_110` output in each separate declared field block is a useful map-recovery
  target, but not a family of competing held-out quantities coupled by that
  block. Claiming a screening advantage would require additional disjoint
  candidate observables under a common justified field, or a different,
  explicitly supported coupling model.

## Licensing and the next useful step

At the pinned Rhizo and Library commits, code uses the GNU AGPL v3 license
text, first-party content is declared CC BY-SA 4.0, and first-party structured
data are declared ODbL 1.0. Both data licenses explicitly preserve third-party
source rights. The pinned historical Lupine root license is MIT; that does not
relicense later Rhizo code or imported scientific data. The target README
points to Tran et al.'s Dryad surface dataset and published vacancy references;
the primary-source redistribution terms and individual provenance records have
not been verified in this audit. Do not package raw references under Discovery's
software license. Citation and repository availability are not license clearance.

The concrete next step is **a target-redacted custody manifest for the Rhizo
fcc archive**, followed by a decision about whether a scoped retrospective
map-recovery study is defensible. It is not another JARVIS model fit. Before
any such study is frozen or run, an independently reviewed extractor should:

1. Emit only allowed identities and conditions: material/model/checkpoint,
   structure/facet/termination, geometry source, units, calculator/reference
   method, citation/source ID, uncertainty availability, and input/blob hashes.
   Do not emit property values, residuals, fitted knots or pass/fail outcomes.
   A metadata-only completeness/compatibility count must distinguish absent
   evidence from a scientific failure. Mixed metadata/target JSON needs explicit
   custodian separation; the current figure loader reads all references at once
   and is unsuitable for that access boundary.
2. Resolve reconstructed-facet and method/condition mismatches from source
   metadata, without choosing exclusions by performance. Recover checkpoint
   identity where possible; leave unrecoverable identity unknown. Establish
   primary-source rights and whether uncertainty is measured or merely a
   tolerance. Preserve the documentation-exposure history.
3. Specify what kind of claim remains possible. Missing hard discrepancy bounds
   require abstention in a certified physical screening mode. A later conditional
   sensitivity exercise or empirical error study must be labeled as such; it
   cannot promote an observed residual maximum into a universal enclosure.
4. Only after that review, freeze a separate protocol with exact maps,
   normalization, grouping, anchor budgets, nominal and uncoupled comparators,
   outcomes and failure criteria. Use genuinely untouched additional outcomes
   for any new predictive-superiority claim. A historical reproduction can
   instead report only recovery of already studied answers and all failures.

No extractor, new allocation, discrepancy cap, performance threshold or
scientific experiment is registered or executed by this document.

[paper]: https://github.com/alexwelcing/lupine-ledger/blob/9acdbaf9de337fccdfad419c23867378fce1aafd/content/latest/articles/paper/environment-error-field-2026-07-02.md
[plain]: https://github.com/alexwelcing/lupine-ledger/blob/9acdbaf9de337fccdfad419c23867378fce1aafd/content/latest/articles/docs/projection-law-in-plain-language.md
[common]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/paper/figures/envfield/common.py
[surfaces]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/python/lupine_distill/statics/surfaces.py
[calculator]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/python/lupine_distill/statics/envfield.py
[fieldbinder]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/python/scripts/bind_env_field_instances.py
[targetreadme]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/data/y_matrix_targets/README.md
[binding]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/python/lupine_distill/binding.py
[schema]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/python/lupine_distill/schemas.py
[hashcode]: https://github.com/alexwelcing/lupine-rhizo/blob/81079a8e1bac7ed332712cc92002bd3435e40776/python/lupine_distill/calc_evidence.py
