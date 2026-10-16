# Operating-condition source audit

Audit date: **2026-10-10**. Status: **historical source reconnaissance; no benchmark registered**.
The later [custody run](../reports/mpea-custody-readiness-v1.md) acquired the pinned
MPEA archive and decoded its header only. The access statements below describe
this earlier reconnaissance checkpoint.

The strongest accessible next lead is the archived **MPEA mechanical-property
compilation**, because its documented fields include test temperature, loading
mode, strength and ductility, and its versioned data archive declares CC BY 4.0.
**NIMS creep data sheets** have stronger direct power-plant relevance and primary
experimental provenance, but the reviewed access route explicitly restricts bulk
acquisition. The **ORNL molten-salt corrosion compilation** is valuable evidence
about experimental confounding, but is not ready for a joint-performance
benchmark. None of these sources establishes a shared physical discrepancy field,
a hard error bound, predictive superiority, or eligibility for the projection
adapter. Lupine's mathematics and existing protocols/results are unchanged.

## Access and exposure boundary

Only public catalog/landing pages, DOI/API metadata, repository README/license
files and published papers were read. No observation-level CSV, XLS/XLSX, ZIP,
supplementary data file, NIMS data sheet, or original experiment dataset was
downloaded or opened. No repositories were cloned; no upstream notebooks or
loaders ran; no fitting, candidate selection, split assignment, accounts,
permission requests, paid services or contact with researchers occurred.

Published papers do contain numerical observations. Their bytes were accessed,
including embedded tables in full-text XML and the accepted corrosion manuscript
PDF. This is **not a claim that every target-bearing byte remained unread**.
Incidental scientific-result exposure is recorded below. The PDF was held in a
temporary directory for text extraction and removed; no copied paper or dataset
is added to this repository.

## Candidate comparison

| Source | Evidence of paired quantities and conditions | Documented scale, not an audited usable count | Disposition |
|---|---|---|---|
| Borg et al., MPEA compilation, Scientific Data 7, 430 (2020); Figshare v9 | Test temperature in °C, tension/compression flag, yield/ultimate strength in MPa, failure elongation or maximum compression strain in %, processing and observed phases; measured versus calculated density/modulus distinguished | Paper reports 1,545 records, 630 compositions, 265 source articles. Number with jointly observed high-temperature tensile strength and ductility is **unknown** | **Preferred metadata/custody follow-up**, conditional on paired-record and source validation |
| NIMS Creep Data Sheet Project; Sawada et al. catalog (2019) | Applied temperature/stress and rupture time; rupture elongation and reduction of area; heat, product form, processing and thermal history; separate short-term tensile properties | Catalog reports 63 types of steels/alloys and at least two heats per material. No observation-level or complete-pair count audited | **Scientifically strong; current bulk-access route blocked** |
| Raiman and Lee, ORNL molten chloride/fluoride corrosion compilation (2018), OSTI 1479786 | Mass change and exposure time, temperature, alloy, salt/purification category, container and loop/capsule/crucible method | Historical studies from 1960–2016; exact number of independently usable experiments and complete condition groups not established here | **Reserve as a source/provenance audit; reject as the first joint-performance benchmark** |

### 1. MPEA: accessible, but pair semantics must be checked

Primary publication of the compilation: [Borg et al., DOI
10.1038/s41597-020-00768-9](https://doi.org/10.1038/s41597-020-00768-9).
This is a curated compilation of experiments from many papers, not one uniformly
controlled experimental campaign. The paper defines a record by a unique
composition/property/temperature/reference combination and says not every
property is reported for every record. Its listed fields establish a credible
route to joint strength/ductility constraints; they do **not** establish that
every row has both, or that measurements sharing a composition used the same
specimen, processing state or strain rate.

The concrete archival candidate is [Figshare
10.6084/m9.figshare.12642953.v9](https://doi.org/10.6084/m9.figshare.12642953.v9),
published 2020-12-16. The [version-specific metadata
endpoint](https://api.figshare.com/v2/articles/12642953/versions/9) lists one
`MPEA_dataset.csv`, file ID `25797305`, **332,126 bytes**, repository-computed MD5
`6d29eb6018157b863ca0033ccec936d5`. Those are **metadata declarations**; the file
was not fetched or independently hashed. A future custodian would bind actual
bytes with SHA-256 before parsing. The paper's separate
`10.6084/m9.figshare.12804137` is a machine-accessible metadata record, not the
experimental CSV archive; these identifiers must not be confused.

The [README at commit
`d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e`](https://github.com/CitrineInformatics/MPEA_dataset/blob/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/README.md)
identifies the master dataset, previous-review and 2019 extraction sources,
processing notebooks, reference mapping and Figshare publication. Only README
and LICENSE were opened. Commit metadata dates this head to 2022-08-03; equality
of GitHub's current master CSV and Figshare v9 is **not established**. A future
protocol must choose and freeze one route rather than silently combine versions.

The dataset's Figshare metadata explicitly declares **CC BY 4.0**. The paper is
also CC BY 4.0, with its usual third-party-material exception; article metadata
are CC0. The repository contains Apache-2.0 LICENSE text. For dataset
redistribution, the versioned Figshare declaration is the direct evidence; a
repository code license should not be used to erase attribution to the compiled
experimental sources or license third-party figures. No data are redistributed
by this audit.

A plausible future question is to rank strength subject to a ductility
requirement at a declared temperature and loading mode. This is an example of a
problem shape, **not** a frozen objective, threshold, eligibility rule or split.
Important limitations are:

- Tensile failure elongation and maximum recorded compression strain are
  different quantities. Compression tests cannot silently supply tensile
  ductility, and maximum compression strain need not denote fracture.
- Reported test temperature, processing, structure and specimen identity must
  travel with each quantity. Missing atmosphere, strain rate, microstructure or
  heat-treatment detail is unknown; temperature alone does not establish a
  power-plant service environment or corrosion resistance.
- Experimental density/modulus and rule-of-mixtures estimates are separate
  fields. A calculated estimate is not an independently measured constraint.
- The authors investigated extreme values and removed or corrected values that
  could not be verified. This published archive therefore has an upstream
  curation/selection history; its missingness and tails are not an unfiltered
  sample of all experiments.
- Suitable holdout *possibilities* include whole primary DOI/study groups,
  connected groups of repeated composition and processing provenance, alloy
  families, and publication-year blocks. Their feasibility and overlap are
  unknown until metadata custody. Row-random splitting risks placing the same
  alloy/test series or repeated source in both sides. No groups were assigned.
- Short tensile/compression tests do not demonstrate creep life, oxidation
  resistance, thermal cycling endurance, manufacturability or plant safety.

### 2. NIMS: primary long-term experiments, restricted acquisition route

The [official CDS landing page](https://cds.nims.go.jp/) and [Sawada et al.
catalog, DOI 10.1080/14686996.2019.1697616](https://doi.org/10.1080/14686996.2019.1697616)
describe the project begun in 1966 and its direct application to boiler/turbine
materials. The catalog explicitly lists rupture time, rupture elongation and
reduction of area, along with applied test conditions. It also describes
composition, grain size, processing/thermal history and separate elevated-
temperature tensile properties. Rupture life and rupture ductility are a much
stronger candidate pair than a join between unrelated public property tables.

The catalog identifies edition-specific sheet numbers and DOIs, for example
**No. 4B**, SUS 304H boiler/heat-exchanger tubes,
`10.11503/nims.1008`, and the general procedures sheet **No. 0**,
`10.11503/nims.1004`. These identifiers were read in the published catalog, not
resolved to or opened as sheets. Metadata lookups at Crossref/DataCite for these
older identifiers returned 404 during this audit; that does not establish that
the sheets themselves are unavailable. The catalog's A/B revisions extend test
duration, so versions are not disjoint experimental samples.

The current CDS page requires DICE account registration, email-domain
registration and service application. It expressly says bulk downloading and
web scraping are prohibited, including obtaining bulk data manually. Its
database-system reproduction/distribution notice is restrictive. No login or
data request was attempted. The open catalog paper's **CC BY-NC 4.0** license
does not grant unrestricted redistribution of the underlying database. An
independently licensed archival route or an authorized access arrangement would
be needed before planning bulk acquisition; no such route was verified here.

If access were resolved, heat-level groups and complete test campaigns would be
natural candidates for separating evidence. Revisions must be deduplicated by
physical test identity. Family transfer and longer-duration extrapolation are
different tasks from within-family interpolation. Publication date is not test
start time: long tests finish later, and the catalog explicitly mentions
interrupted tests. An interrupted or continuing test is censored, not a measured
rupture at its last observation time. A later protocol must preserve that
distinction and cannot declare temporal generalization from edition labels.
The exact common temperature/stress grids and number of paired eligible tests
remain unknown.

### 3. ORNL molten-salt compilation: relevant conditions, insufficient joint target

[Raiman and Lee, DOI 10.1016/j.jnucmat.2018.07.036](https://doi.org/10.1016/j.jnucmat.2018.07.036)
has an [OSTI archival record, 1479786](https://www.osti.gov/biblio/1479786) and
an [accepted manuscript](https://www.osti.gov/servlets/purl/1479786). The
government archive identifies ORNL and USDOE sponsorship. Its condition fields
are unusually relevant to molten-salt energy systems: salt type/purification,
temperature, material, container and experimental method. The manuscript
describes mass change over exposure time, not a standardized multi-property
mechanical/corrosion record.

Its limitations are explicit in the methods: only studies reporting mass change
enter the table; depth-of-attack and Tafel-only studies are not converted;
intermediate time measurements are omitted in favor of the longest exposure;
loop observations are selected from the hottest region; and some representative
results are selected while anomalous results are excluded. Purification is a
coarse category, with significant residual variation and usually unquantified
impurities. Mass loss cannot be converted into penetration rate without
additional geometry/density and corrosion-mode assumptions. Time-normalizing it
does not establish steady-state kinetics.

Consequently, this is a credible source map and a warning about scope transfer,
but **not currently a joint performance/constraint benchmark**: no paired
independent mechanical, ductility or thermophysical constraint is established.
A corrosion limit can be declared on a measured corrosion quantity; duplicating
that same quantity as a second target would not demonstrate multi-property
recommendation. Public manuscript access and a US-government retained license
are not a blanket redistribution grant for the curated underlying data or
third-party experimental publications. No separately licensed, versioned
machine-readable archive was verified.

If reconsidered, whole primary studies, apparatus/container/salt families and
publication-time blocks are plausible holdout dimensions. They also risk
confounding different test methods with different alloys. The 2018 manuscript's
source selection must remain visible; no claim of an untouched historical
population or prospective evaluation would be justified.

## A tempting alternative explicitly declined

[LLNL X-Yield, DOI 10.6075/J0B858B0](https://doi.org/10.6075/J0B858B0), archived
by UC San Diego, has a useful public landing page and CC BY 4.0 declaration.
Its metadata distinguish large **predicted** yield-strength grids from **334
experimental measurements extracted from the MPEA source**, paired with model
predictions. Its documented experimental table has alloy, temperature, measured
yield strength and predicted yield strength, without a second measured service
constraint. It is not an independent experimental holdout from the MPEA archive,
and a large grid of modeled compositions would not become experimental validation.
Only its landing page and DataCite metadata were read; neither its README nor
any XLSX/ZIP component was downloaded. Decline it as a replacement for a joint
experimental high-temperature benchmark.

## Evidence actually read and reconstruction identifiers

All accesses below occurred on the audit date. Hashes identify returned
documentation/metadata bytes, not experimental dataset bytes. Web/API responses
may later change; DOI versions and pinned Git commits are the durable selectors.

| Evidence | Read scope / returned SHA-256 where recorded |
|---|---|
| [Figshare v9 API](https://api.figshare.com/v2/articles/12642953/versions/9) | Dataset metadata and file identity only; 4,714 bytes; `ffe30394f616e654b0f09f237270f633687120d727812458cf9579f2bbadbf42` |
| [Figshare version list](https://api.figshare.com/v2/articles/12642953/versions) | Lists versions 1–9; no file bodies |
| [MPEA pinned README](https://raw.githubusercontent.com/CitrineInformatics/MPEA_dataset/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/README.md) | 2,368 bytes; `3fa8ac5a373381ad0ccae9d7e741d583103fab50793e0dd44de1b1571da3ed9a` |
| [MPEA pinned LICENSE](https://raw.githubusercontent.com/CitrineInformatics/MPEA_dataset/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/LICENSE) | 11,357 bytes; `c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4` |
| [MPEA paper](https://www.nature.com/articles/s41597-020-00768-9), [PMC XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7722748/fullTextXML) | Published methods/data-records/validation/license/references; XML 63,254 bytes; `ef21ae6085f5444b534ee2ef7137542f63e3b80fc3940219a3960b642f5a1550` |
| [NIMS CDS](https://cds.nims.go.jp/), [CoDS](https://cods.nims.go.jp/), [old URL redirect notice](https://smds.nims.go.jp/creep/index_en.html) | Public landing/access notices only; no service login or sheets |
| [NIMS catalog PMC XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7006710/fullTextXML) | Published catalog/procedures/narrative and embedded article tables; 178,720 bytes; `0ceb9afbbf438a6c5df4d10b559f19cd0ffaf290f20cd954f79c51bbc5a61e6f` |
| [ORNL OSTI 1479786](https://www.osti.gov/biblio/1479786), [accepted manuscript PDF](https://www.osti.gov/servlets/purl/1479786) | Archival record, abstract and manuscript methods/discussion; PDF 860,767 bytes; `a72ca01fa2743a0dda384311251d1a42507542e6e171f2068d35ad5b1ed7d401` |
| [X-Yield landing](https://library.ucsd.edu/dc/object/bb8474996f), [DataCite record](https://api.datacite.org/dois/10.6075/j0b858b0) | Description, component-field lists, dates, provenance, license; no component contents |

Crossref/DataCite bibliographic searches and OSTI search snippets were also read.
The search encountered [Pillai et al., DOI
10.1016/j.jnucmat.2020.152755](https://doi.org/10.1016/j.jnucmat.2020.152755),
whose abstract discusses Ni-alloy corrosion in purified KCl–MgCl2 at 600–800 °C;
no paper data or companion dataset was opened. Broad searches also surfaced
other unrelated abstract-level numerical results; these were not used to choose
thresholds, target values or model settings. An OSTI API route failed, and a
Google search returned a JavaScript challenge; neither was treated as evidence.

## Incidental numerical and qualitative result exposure

The open NIMS catalog text exposed example operating points (including 500 °C
and below 100 MPa, 550 °C, and 600 °C at 88/137 MPa), heat-to-heat rupture-life
variation of about an order of magnitude, a reported creep-stage transition
around 150 h, and a micrograph described after 47,219.1 h at 700 °C. Embedded
article text also exposed a SUS304HTB composition table and published qualitative
relationships with minor elements and grain size. None was extracted into a
training/validation table. Its examples cannot later be described as wholly
unseen evidence to this reviewer.

The MPEA article exposed counts, the description of a highest-room-temperature-
strength example table, plots' qualitative structure/temperature trends, and a
reference title quoting a 160–1,800 MPa strength range. The article HTML/XML was
accessed, so this reviewer is not blind to its published illustrated results.

The corrosion manuscript/abstract exposed its published conclusion that salt
purity correlated most strongly with corrosion, its comparison scores around
0.26/0.25 for one analysis, and examples discussed in its narrative. An OSTI
snippet for Pillai et al. exposed the qualitative claim of greater attack in
alloy 230 under the compared conditions. Search metadata for a separate
refractory-alloy oxidation archive exposed published mass-gain examples near
1 and 24 mg/cm² at 1 and 50 h, respectively, at 1,000 °C; that archive was not
chosen or opened. These exposures inform caution about scope, not a tuned
benchmark or new scientific result.

## What remains unresolved before any experiment

The next defensible action is a separately reviewed, target-redacted custody
design for the **single pinned MPEA version**, followed by inspection of allowed
identity/condition/completeness metadata. Before targets reach a researcher, a
future protocol would need to settle physical record identity, paired-property
semantics, duplicate/source grouping, missing/censored values, unit conversions,
operating-condition scope, and an attainable evaluation pool size. This audit
does not set those rules or authorize their empirical tuning. No numerical
bound or common-field assumption follows from public availability, a content
hash, or the presence of several property columns.
