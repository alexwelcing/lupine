# Li paper methods and provenance audit

2026-10-16. The published methods establish documentary row meaning and units,
but do not reconcile the captured archive's version/count difference or admit
it for a new scientific evaluation. This is source research, not a dataset run.

Li, Merickel, Tang, Song, Rittenhouse, Vakanski and Xu, *Dataset of tensile
properties for sub-sized specimens of nuclear structural materials*, Scientific
Data (2025), [DOI 10.1038/s41597-024-04329-2](https://doi.org/10.1038/s41597-024-04329-2),
is indexed as [PMC11724850](https://pmc.ncbi.nlm.nih.gov/articles/PMC11724850/)
and PMID 39799135. A DOI metadata request returned one matching record. The
ordinary Europe PMC full-text XML request returned HTTP 200 without retries.
The exact retained response is 143,727 bytes, SHA-256
`c7e527712991ce14fb233b57a7e1f5f2dc26e6728835df03510cd6c588146534`.
The local raw article is not included in this publication bundle.

## Documentary findings

| Question | Published evidence, XML section ID | Consequence |
| --- | --- | --- |
| Row meaning | Data Records, `Sec11`: one row represents one retrieved tensile test, with a reference category naming its source article. | Documentary test-level meaning is established. Actual workbook row framing, reference joins, repeated tests and specimen/heat/campaign identity are not checked. |
| Endpoints and units | Tensile properties, `Sec9`, and Data Records, `Sec11`: yield and ultimate tensile strengths use MPa; uniform and total elongation use percent. | This supports a prospective semantic mapping, not actual complete paired values, a shared operational strength definition or verified conversions. The inclusion-criteria paragraph in `Sec6` instead uses “ultimate elongation”; that wording is not silently equated to a separate endpoint. |
| Conditions | `Sec11`: test temperature in Celsius and strain rate in inverse seconds; specimen length dimensions in millimeters (aspect ratios remain separate); composition in weight percent; treatment and irradiation metadata are separate categories. | Actual per-row applicability, completeness and comparability remain unknown. Some manufacturing/treatment and irradiation information was unavailable in original papers, explicitly including examples such as microstructure and grain size. |
| Collection and provenance | Data acquisition, `Sec6`: 72 articles were considered and 24 selected using stated material, test-property and specimen-geometry criteria. Records came from manually extracted tables and manually digitized graphs, with expert checks. | The paper describes 24 contributing articles, not 24 proven independent units. Digitization is an additional measurement/extraction uncertainty. Its magnitude and row-level extraction modality are not bound here. |
| Transformations | Data post-processing, `Sec7`: temperature and strain-rate units were converted; some strain rates were derived from machine speed and specimen length; balance-element composition was calculated to sum to 100%. | These fields are not all directly measured primitive observations. Actual formulas, rounding, source precision and row-level transformation flags remain unverified. Composition closure does not establish chemical accuracy. |
| Curation and outliers | Technical Validation, `Sec12`, describes expert checks and statistical/visual outlier handling. It explicitly retains some specimens outside recommended geometric ranges for size-effect studies. | No executable outlier rule, removed/changed-row audit, duplicate policy or uncertainty propagation is supplied by these paragraphs. Geometric recommendations cannot be treated as automatic exclusion rules. |
| Version and counts | `Sec6` reports 1,050 records; `Sec11` reports 55 columns and names separate References and Column Descriptions worksheets. | The captured v3 archive's catalog/author README describes 1,070 records and 54 parameters. The article does not reconcile these identities. No workbook-to-paper equivalence follows. |

The published Table 2 adds two unresolved provenance issues. Its 24 displayed
record counts sum to **1,038**, while the prose reports 1,050 and the archive
catalog reports 1,070. This is arithmetic over the paper's table, not a recount
of the archive; none of these counts is selected as the correct one. Its
separate Data Source and Dataset columns also name reused source material for
some entries: the Gussev row points to Byun, the Igata row to Kestenbach, and the
Mishra row to a bibliography range. These documentary relationships require
checking against actual row/reference joins before defining independent groups.
They do not establish the number of duplicated measurements. The table also
lists material families beyond the narrower groups named in the inclusion prose.

The automated bibliography projection finds 27 distinct explicitly linked
reference IDs across both table columns, including endpoints of a citation
range; it does not expand that range. **27 is not a study, dataset or independent
unit count.** The original bibliographic strings include unresolved identities;
no DOI or citation was silently corrected and no cited article was fetched.

The code-availability statement links the author notebook, but does not establish
that a particular notebook version generated every published transformation.
Static notebook syntax, if later inspected, still cannot prove executed curation.
No feature, target, eligibility rule, grouping, train/calibration/test allocation,
model, uncertainty guarantee or scientific acceptance threshold is selected here.

## Exposure and source terms

The whole article XML was acquired and parsed, including tables, figure captions,
references and text that may contain numerical examples or reported results.
It is therefore not described as unread, target-free or prospectively blinded.
Root then read the prose of `Sec6` through `Sec12` and the code-availability
statement, and then Table 2's record counts, material labels and bibliographic
source/dataset links; this included aggregate counts and specimen-geometry
examples. The table inspection disclosed no tensile endpoint values. No linked image, supplementary dataset, notebook, measurement archive
or external cited article was requested by this audit. No individual workbook
performance cell was opened through this route. The article's published
aggregate descriptions are not used to tune an exposed evaluation.

The article declares **CC BY-NC-ND 4.0**, distinct from the archive's declared
CC BY 4.0 and repository software's MIT license. This publication uses original
research paraphrases, section citations and acquisition metadata; it does not
bundle the article, tables, figures or an adapted full-text rendition. The
author/source attribution and [article license](https://creativecommons.org/licenses/by-nc-nd/4.0/)
remain explicit. No license is transferred between these different objects.

## Next action

Preserve these documentary findings while completing the already frozen source
diagnostics. Before admitting observations, reconcile the exact archive layout
and version, bind per-row reference and specimen/condition joins, document
missingness and transformations, and audit source reuse against prior exposed
studies. Do not use article count as an independence premise. G20 remains
unresolved and G21 remains blocked; existing scientific NO-GO results stand.
