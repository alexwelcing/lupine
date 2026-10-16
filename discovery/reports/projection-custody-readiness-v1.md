# Rhizo fcc custody readiness after metadata extraction

Review date: 2026-10-10. **Metadata custody completed; scientific eligibility
has not been decided.** All 110 pinned artifacts were acquired, matched their
expected sizes and Git blob identities, and passed the extractor's declared
schema/metadata checks. All 36 expected material/model units remain in the
receipt. This establishes a usable archive route for further provenance work.
It does not establish physical discrepancy bounds or a paired held-out
candidate-screening benchmark. Those scientific uses remain **not ready**.

No unit was excluded, replaced, ranked or assigned to an anchor/evaluation
split. No numerical reference choice, target-completeness check, fitting,
simulation, new benchmark protocol or predictive comparison was performed.
The earlier negative JARVIS and training-only findings are unchanged.

## Reviewed artifacts and access boundary

The extractor and tests were frozen before real acquisition at Discovery
commit `7c82058672e2f9ee24b9a774d530506a7e4526eb`. Its source SHA-256 is
`751bcec5123feef65bf4b459691b5ab89197dd28e599fa23a178e2f10ff36fcc`.
The source route remains Rhizo commit
`81079a8e1bac7ed332712cc92002bd3435e40776`, with the prior
[source inventory](projection-source-inventory.json) SHA-256
`4874aebfa7e6f8003b6b733750ddac6675770a7b815b9ac8e1de81f55d118f42`.

| Reviewed public artifact | SHA-256 |
|---|---|
| [Acquisition receipt](projection-custody-acquisition-v1.json) | `f0947cf030f0a5c8bcf67cd548d85237266f048f2b6659c6c13138cc0e06c25b` |
| [Target-redacted metadata receipt](projection-custody-metadata-v1.json) | `8f987cff79add822430d47bac9cdd9fda202bb4135c078f08241ea9682be0b04` |

The metadata content seal, excluding its own seal field, is
`1986fa95f0dc04487924a55fb2b81e17f120577529fe3d5238f9acb976239c69`.
This review independently checked the two receipt byte hashes, strict public
JSON structure and metadata content seal, then counted only redacted fields.
It read no raw source/cache objects or numerical targets. The same author
implemented the extractor; this report is a separate receipt review, not an
independent research-group replication. The extractor also received separate
source and synthetic-test review before acquisition.

**The custodian did acquire target-bearing bytes and decode mixed JSON.**
Target values were withheld from the researcher-facing receipt; this is not a
claim that target bytes remained unread. The documentation exposure and
already-published historical outcomes disclosed in the
[source-readiness audit](../docs/projection-data-readiness.md) still apply.
The frozen [custody contract](../docs/projection-custody.md) defines the
allowlist and failure semantics. Hashes bind bytes, not scientific truth.

## Exact preserved universe and structural findings

The fixed universe is nine fcc materials (Ag, Al, Au, Ca, Cu, Ni, Pd, Pt, Sr)
times four model IDs (`chgnet`, `mace-mp-small`, `mace-mp-medium`,
`mace-mpa-0-medium`). These are 36 declared material/model units, not 36
independent reference experiments.

| Structural check | Receipt finding | Meaning and limit |
|---|---:|---|
| Expected/acquired/verified artifacts | 110 / 110 / 110 | 36 statics runs, 36 unbound evidence records, 36 bound evidence records, 2 reference files |
| Unique whole-artifact Git blobs | 110 | 547,913 total source bytes; no target-value hashes |
| Expected/reported units | 36 / 36 | Exact original universe retained |
| Archive integrity and declared schema | 36 `PASS` | Each unit's three files passed custody and allowlisted metadata parsing |
| Symbolic triple identity | 36 `PASS` | Registered material/model identifiers agree; statics structure is `fcc` |
| Declared input-hash agreement | 36 `PASS` | Companion evidence declarations agree; inputs were not recomputed or scientifically validated |
| Statics structural availability | 36 each | Lattice and vacancy records are present; one named record for each of facets 100, 111 and 110 |
| Evidence property availability | 72 each | Each of the 72 evidence files has one declared record for each of four properties, with no duplicate among those names |
| Evidence units | 288 `PASS` declarations | Three surface properties use J/m²; vacancy formation uses eV |
| Numerical target completeness | Not checked in all 36 units | Record/name presence says nothing about values, finiteness, convergence or accuracy |

All 36 statics records declare `cuda`; all 72 evidence records declare backend
`ase` and device `cuda`. Calculator-version fields are present in all 108
run/evidence records, and input-hash fields have valid syntax in all 72 evidence
records. Version text and raw input-hash declarations are withheld. These
facts do not recover an exact checkpoint or reproduce a calculation.

## Reference multiplicity and facet context

The two reference files contain 85 structural entries: 57 surface-family and
28 vacancy-family entries. Citation, source-locator and notes fields are
present in all 85 entries; their text and scientific adequacy were not
reviewed here. The fixed universe matches 43 distinct source locations
(file path plus array ordinal): 27 surface entries and 16 vacancy entries.
Repeated links from four model units do not create additional reference
measurements or evidence of independence.

| Declared property | Matches per material/model unit | Reference status |
|---|---|---|
| `gamma_100` | One in each of 36 units | One recognized `DFT-PBE` entry; declared unit passes |
| `gamma_111` | One in each of 36 units | One recognized `DFT-PBE` entry; declared unit passes |
| `gamma_110` | One in each of 36 units | One recognized `DFT-PBE` entry; declared unit passes |
| `vacancy_formation_energy` | Two in 28 units; one in 8 units | Ag/Al/Au/Cu/Ni/Pd/Pt retain both `DFT-PBE` and `experiment`; Ca/Sr each have one `DFT-PBE` entry; all matched unit declarations pass |

The 28 two-reference vacancy cases remain `REVIEW_REQUIRED`. All candidates
are preserved; the historical upstream binder's preference is not applied.
A single structural match (`PASS`) does not certify method/condition
equivalence, uncertainty, primary-source identity or rights. No binding status
was interpreted as permission to use a reference numerically.

The previously documented reconstructed-termination caveats remain visible:
Ag/Au/Pt `gamma_110` produces 12 model/property flags, and Sr `gamma_111`
produces four. These 16 flags concern four distinct material/facet contexts,
not 16 independent discoveries. They trigger review without exclusions.
The other 128 unit/property contexts remain `UNKNOWN`; absence of that
particular caveat is not a compatibility finding. The receipt exports the
geometry-source label and structural availability, not relaxed lattice
constants, areas, coordinates, termination details or convergence values.

## Scientific gates remain separate

| Gate | All 36 unit statuses | What remains to establish |
|---|---|---|
| Exact model checkpoint | `UNKNOWN` | No checkpoint bytes were acquired or verified; package-version presence is insufficient |
| Primary-source rights | `UNKNOWN` | Repository data licensing does not resolve each cited source's rights |
| Reference conditions and uncertainty | `UNKNOWN` | Exact calculation/publication identity, structure/termination, method settings and uncertainty require further source review |
| Fixed fcc map in inspected source | `PASS` | A source-provenance fact only; physical applicability is not established |
| Hard physical discrepancy bounds | `UNSUPPORTED` | No independently justified finite physical error bounds supplied |
| Scientific common-field support | `UNKNOWN` | Sharing one field across specified observables requires a defensible scope and error model |
| Multiple held-out candidates in the same field block | `UNKNOWN` | The historical three-anchor/fourth-facet construction does not establish a competing held-out candidate set |

The original source audit distinguishes the fixed figure map (model-minus-
reference sign, three fcc coordinates and a linear continuation for the fourth
facet) from the smooth, cubic, re-relaxed calculator implementation. This
receipt does not reconcile their different geometry, conversion and relaxation
assumptions. A source-level map `PASS` cannot supply finite discrepancy bounds,
assert a common physical world or justify transfer across materials or models.
Observed maxima, tolerances and numerical closure would not supply those
missing premises either.

The prior pinned license review found first-party structured data declared
ODbL 1.0, content CC BY-SA 4.0 and Rhizo code under AGPL v3, with third-party
rights retained. This metadata receipt adds no license clearance. It neither
redistributes raw reference values nor reclassifies them under Discovery's
software license.

## Decision and concrete next work

**Proceed with metadata reconciliation; do not yet preregister or execute a
physical-bound or paired held-out screening benchmark from this archive.**
`METADATA_COMPLETE` is the acquisition/extraction result. Scientific
eligibility remains `NOT_MADE` for all 36 units, every reference-choice flag
is false, and no split is assigned. Unknown gates are not failed materials,
and no unit is silently dropped.

The next useful work is bounded provenance work before any numerical choice:

1. Establish a target-redacted primary-source manifest for all 43 matching
   reference locations: source identity, rights, exact condition/method and
   reconstruction scope, with unresolved fields preserved. Any extraction of
   mixed citation notes needs an explicit reviewed redaction boundary.
2. Seek separately pinned model/checkpoint manifests or checkpoint bytes and
   distinguish declared identities from verified byte identities. Preserve
   `UNKNOWN` where that lineage cannot be recovered.
3. Reconcile the figure map's geometry, unit conversion, relaxation assumptions
   and reconstructed facets through source/condition metadata. Keep all
   competing vacancy references visible; select no method by observed error.
4. Identify whether additional disjoint observables actually share a justified
   field within each declared block. Keep a historical map-recovery study
   separate from a claim of shared-field screening advantage. Historical
   outcomes already studied cannot become fresh evidence by relabeling them.

Only after those questions are resolved can a separate protocol define a
defensible retrospective claim, metadata-based eligibility and any new
evidence requirements. Without justified hard discrepancy bounds, certified
physical pruning must abstain; a later explicitly conditional or empirical
study would need its own scope and cannot confer universal physical accuracy.
