# Pinned author repository: documentary methods audit

**METADATA/DOCUMENTATION ONLY — no source-schema approval or scientific pass.**
The audit used author repository `avakanski/Subsized-Specimens-Tensile-Properties`
at commit `d19b15127c8ae1be49308c29eac718b609ad895c`, already pinned by Lupine.
Only the README and MIT license bodies were acquired. Git tree/commit metadata
were acquired separately; no source program was run and no observation file,
notebook body/output, figure, model, or private custody file was acquired.
This audit makes no claim about completion of the pending compatible-envelope
operation or its CI. User-authorized metadata research required no new approval.

## Exact source scope

The recursive tree response reports `truncated=false` and four flat entries.
Its `sha` field repeats the requested commit identifier. Rather than calling that
a tree object identity, `tree-identity.json` reconstructs the Git tree encoding
from its paths/modes/blob IDs and matches the commit metadata's actual tree
`3a16cf9d749f20514a2f7e8002ca12492b1bc505`. README and license bodies also reproduce
their exact expected Git blob IDs. These are identity checks, not validation of
scientific contents.

| File at pinned commit | Git blob SHA-1 | Scope |
|---|---|---|
| [README.md](https://github.com/avakanski/Subsized-Specimens-Tensile-Properties/blob/d19b15127c8ae1be49308c29eac718b609ad895c/README.md) | `778b8c93622c08d9fcdf9eba5d25727976cd3e90` | Full text read; retained at `sources/README.md`. |
| [License - MIT.txt](https://github.com/avakanski/Subsized-Specimens-Tensile-Properties/blob/d19b15127c8ae1be49308c29eac718b609ad895c/License%20-%20MIT.txt) | `4b89403c8299ddd7ddea4beb2952efeada00bc6b` | Full text read; retained with its notice. |
| `Sample_Code.ipynb` | `789b61339aa4c566b68794077fa7240a73677f9d` | File metadata only, 353,800 bytes; no notebook body, source cells, or outputs read. |
| `Tensile_Properties_of_Sub-sized_Specimens.xlsx` | `3173e175f25a2ee0cae74d8b290d7aef08c61e9f` | File metadata only, 187,208 bytes; no workbook body read. |

There is **no standalone ordinary source-code file in this pinned tree**. The
README advertises a notebook for loading and visualization (lines 11–16), but that
description does not establish its implementation or curation behavior. Because
its blob can mix code and outputs, it was not acquired in this bounded audit.
Absence of inspected notebook code is not evidence that the notebook lacks rules.

## What the permitted evidence establishes

Line references below refer to the exact retained README (69 lines), not a live
branch. The entire document was read, so each “not supplied” finding concerns
this README and license only, not the unread workbook, notebook, or the paper.

| Question | Documentary finding | Still needed for source admissibility |
|---|---|---|
| Row/test and joint unit | Line 7 calls the compilation “1,070 tensile testing records” extracted from literature and names four tensile endpoints. | It does not define one row as one physical test, specimen, aggregate, or replicate; no observed endpoint pairing/completeness or joint unit is established. |
| Endpoints and conventions | Lines 7 and 16 name yield strength, ultimate tensile strength, uniform elongation and total elongation. | No units, yield offset convention, elongation/gauge convention, conversion rules, or actual column coordinates are provided here. |
| Conditions and material context | Line 7 names composition, manufacturing, irradiation, specimen size/dimensions and testing conditions. | No dictionary, field encoding, mandatory conditions, missingness convention, or condition completeness is supplied. |
| Selection and curation | Line 7 describes a literature review targeting peer-reviewed sub-sized tensile studies and expert checks of material/process/treatment/composition/test information. | No operational inclusion log, duplicate policy, outlier rule, removed-row list, imputation rule, correction audit, or executed transformation is documented here. The older archive metadata separately says outliers were addressed; this README does not resolve how. |
| Reference joins and groups | Literature extraction is described in line 7; lines 25–57 cite the compilation paper/archive/preprint. | These citations are not a per-row primary-source roster. No reference join key, campaign/heat/batch/specimen lineage, repeat-test linkage, or independent panel definition appears. |
| Intended modeling use | Lines 15–22 propose prediction, correlation analysis and experiment design. | Proposed applications are not validation results, evidence of exchangeability/IID, or permission to reuse exposed outcomes for tuning. |
| Version identity and counts | Line 3 and dataset citation line 46 link DOI `ws-8j`; line 9 links `ws-kw`. Line 7 repeats 1070 records/54 parameters. | Preserve the already documented paper1050/55 versus archive1070/54 discrepancy. The README supplies no reconciliation or archive-to-Git content equivalence. |

The Git workbook's metadata size **187,208** differs from the pinned v3 archive's
publisher-declared **183,878** bytes in `reports/li-v3-source-inventory.json`.
That prevents assuming the Git blob is the exact pinned archive object. It does
not reveal which rows/columns differ, whether any scientific value differs, or
which version is preferable. No archive or Git workbook was opened to investigate.

## Licensing and exposure

The pinned license grants rights in “this software and associated documentation
files” (license lines 4–14), requires retention of its notice, and disclaims
warranties. The retained README and license copies keep that notice together.
The README links this MIT text; it is not used as the observation-data license.
The separate pinned archive inventory records **CC BY 4.0** for the v3 dataset,
from the earlier official archive/DataCite audit. Neither license proves original
study attribution, specimen lineage, eligibility, or independence.

All four current HTTP reads succeeded with status 200; there was no retry around
an access denial. Exact requests, times, hashes and bytes are retained. Incidental
numerical documentary exposure includes 1070/54, file sizes and Git identifiers,
publication/DOI/arXiv/citation numerals (including the README's literal citation
fields), copyright/funding identifiers, and previously retained source-audit
metadata. The initial bounded `rg` selection traversed retained DataCite metadata
JSON and produced a truncated large output; it exposed metadata/description and
encoded metadata XML, not observation rows. This is recorded rather than called
zero exposure. No target values, notebook outputs, source-program execution,
criteria changes, model choice, split/allocation, fit, or statistical test occurred.

## Bounded next action

This route does not resolve G20's row/units/lineage questions. Preserve the source
pin and gaps. Once a separately published and verified envelope profile actually
admits the original archive structure, use its recognized documentary roles to
bind a separate reviewed dictionary/reference inspection; do not infer coordinates
from this README or substitute the differently sized Git workbook. If that stage
blocks, retain its exact reason and follow the existing bounded structural path.
A future notebook-code-only review would need a deliberate code/output separation
scope; no content or claim is supplied for it here. No G21 admission, independent
sampling-unit count, criterion, model, threshold, or allocation is selected.

Independent-agent review checks this documentary report; it does not create an
independent scientific sample. Historical negative scientific results remain
unchanged.
