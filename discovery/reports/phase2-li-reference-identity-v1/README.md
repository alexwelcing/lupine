# Li reference identity audit — documentary graph only

2026-10-16. **The article's references cannot be joined safely by their printed DOI alone.** CR49 and CR50 assert the same DOI but name different works. The exact Crossref record supports the Gussev chapter's author/title identity and conflicts with the Klueh citation. A bounded follow-up finds two Klueh metadata candidates; neither is silently substituted or merged. Actual archive-reference joins and measurement overlap remain unverified.

## Exact lookup and unresolved identities

The [Li article](https://doi.org/10.1038/s41597-024-04329-2) prints `10.1520/STP157620140013` in both CR49 and CR50. Its XML supplies no typed DOI `pub-id` for either reference. CR50 also has an `ext-link` whose `href` is the entire citation string, not a standalone DOI URL. A resolver must preserve that malformed bibliographic link as source evidence rather than blindly following it.

The first frozen request was an [exact Crossref DOI lookup](https://api.crossref.org/works/10.1520/STP157620140013). It returned HTTP 200, 12,819 bytes, SHA-256 `a3d83af7737c0ac38db0bf08b14a9dd81c140492001b022403b48633dabcee12`, with no retry or redirect. The response's lowercase DOI form is retained separately from the article's original string.

| Reference or registry record | Documentary comparison | Decision |
| --- | --- | --- |
| Article CR49 | Gussev, Busby, Field, Sokolov and Gray; *Role of scale factor during tensile testing of small specimens*; article lists 2015 and pages 31–49. | Keep the article-local reference intact. |
| Exact ASTM DOI record | Same title and author surnames/order; ASTM International book chapter in *Small Specimen Test Techniques: 6th Volume*. Crossref lists online/issued 2014-08-29, print 2014-10-30 and pages 1–19. | Core bibliographic agreement with CR49, but year/page discrepancies remain. Do not choose an edition or replace fields based on this response alone. |
| Article CR50 | R. L. Klueh; *Miniature tensile test specimens for fusion reactor irradiation studies*; *Nucl. Eng. Des. Fusion* 2(3), 407–416 (1985), with the same ASTM DOI. | The asserted DOI resolves in the registry to a different author/title/year. It is not an admissible unique identity key for this citation. |
| Candidate DOI `10.1016/0167-899x(85)90028-x` | Crossref returns the Klueh title, R.L. Klueh, 1985, volume 2, issue 3, pages 407–416 and *Nuclear Engineering and Design. Fusion*. | A strong documentary candidate for CR50, retained as a candidate edge. No automatic correction. |
| Candidate DOI `10.1016/s0920-3796(85)80060-0` | Crossref returns the same title, R Klueh, 1985, volume 2 and pages 407–416, but *Fusion Engineering and Design* and no issue in the selected returned fields. | Keep as a separate registry record. These metadata do not prove it is an alias, duplicate publication or distinct measurement source. |

The two candidates came from one separately justified, frozen title/author/1985 Crossref query capped at three results. It returned HTTP 200, 1,744 bytes, SHA-256 `1bb5ff13a349222477d42e7e2a2e1d27ad238d516ba03e56c07d253916cbf07c`. The third result names a different JOM article and is not treated as a candidate. Search rank is not identity proof. No third request, DOI landing-page request, cited full paper, paywall or measurement file was needed or attempted. Metadata absence is not proof that a record has no other identifiers, issue or licensing terms.

## Source articles and underlying datasets are different graph roles

Only Table 2's Data Source and Dataset citation cells were projected from the retained XML. The paper links Gussev CR5 to Byun CR60, and Igata CR69 to Kestenbach CR70, in those separate roles. Its Mishra CR74 row prints the Dataset range `75–86`; the XML contains only the explicit endpoint xrefs CR75 and CR86. This audit does not expand that range or turn two XML links into two datasets. Nor does a printed inclusive range establish a corresponding number of independent studies.

A cell labeled “Experimental data” supplies neither a unique specimen/test identifier nor proof that the underlying measurements are new or independent. The article's direct-source references, underlying-data citations, chapter/edition identities and actual archive rows are different objects. Repeated citations can indicate where provenance needs inspection, but they cannot count duplicated measurements.

[citation-map.json](citation-map.json) therefore uses article-local reference IDs as stable source nodes, keeps printed DOI assertions separate from registry records, and records only the explicit documentary edges above. It contains no endpoint values and does not normalize or union these nodes into groups. This projection is limited to bibliographic information; the source acquisition was not target-free.

## Consequence for G20

The paper supports a documentary reference graph, not completed normalized archive joins. The next source audit must preserve original citation tokens, distinguish cited source from underlying dataset, and reconcile a row's reference field against the correct version of the References worksheet. Specimen, heat, batch, campaign and test identifiers must then establish any actual measurement reuse. Citation identity alone cannot prove measurement overlap, absence of overlap with exposed benchmarks, or statistical independence. G20 remains unresolved; no scientific evaluation unit count, new protocol, endpoint, model, threshold, split or fit is selected.

For CR50, keep the printed ASTM DOI conflict and both candidate records visible until a separately scoped bibliographic/edition check or the exact archive reference record resolves the intended identity. For CR49, retain the registry/article date and pagination difference. Neither ambiguity justifies editing the frozen source or tuning an exposed evaluation.

## Requests, exposure and source terms

[scope.json](scope.json) predates the exact-DOI request; [candidate-query-scope.json](candidate-query-scope.json) separately justifies and bounds the only follow-up. Both actual receipts and selected citation projections are retained. There were two successful metadata requests and no access failures or retries in this task; earlier acquisition histories remain in the original paper audit.

The existing 143,727-byte full article XML was read and parsed again, including machine access to its complete text/tables. Researcher-visible output was restricted to CR49/CR50 bibliography, column labels and Data Source/Dataset citation cells; no record-count, material or performance table cells were projected. New Crossref response bodies were acquired and parsed as registry metadata; only selected citation fields were printed. The first author-array projection also printed public affiliation addresses and role metadata beyond the planned name fields; it is preserved in the original projection, and the current projection was narrowed with an explicit correction record. None of this is an untouched blind validation. No cited paper's substantive text or individual workbook endpoint was opened.

The Li article declares CC BY-NC-ND 4.0, as recorded in the earlier paper audit. This note uses original paraphrases and bibliographic facts with attribution; it does not reproduce the full article, endpoint tables or figures, and it transfers no archive/software license to the paper. Crossref metadata does not confer access or reuse rights to a cited full text. Hashes establish retained-response identity, not bibliographic infallibility, physical truth or scientific independence.
