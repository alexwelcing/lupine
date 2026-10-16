# Rhizo bound labels: direct inspection is possible; exact source identity may remain unresolved

**No method-preference rerun is needed to recover the recorded numerical labels.**
Pinned `binding.py` writes a matched target's value into
`properties[*].reference_value`, its citation into `reference_source`, and
optional `tolerance`, while retaining the prediction `value`, property `name`
and `unit`. `schemas.py` permits those reference fields to be absent/null.
This is what the source is designed to serialize, not confirmation that all
retained records actually contain complete, finite numerical labels.

The bound `CalcEvidence` schema does **not** contain the selected target's file,
ordinal, method, family, binding status, DOI/URL or reference-object hash.
It also lacks crystal structure. `BindingResult.records` separately carries
method, target property, family, status, reference value/citation and detail;
those records are not fields of the returned evidence object. The inventoried
`bound/binding_report.json` was outside the original 110-object custody set.
Its storage layout and contents were not inspected here. Even the in-memory
record schema has no unique target file/ordinal key.

There is another limit: when a property is unmapped or no target is selected,
`bind_evidence` appends the original property unchanged. Thus pre-existing
reference annotations could survive. Non-null stored reference fields do not
by themselves prove `status="bound"` or that this binder selected them.

The [exact object pins](objects.json) and [field list](field-findings.json)
support three distinct possible next scopes. None has been executed here.

| Question | Minimum inputs | What can remain unresolved |
| --- | --- | --- |
| Are the four archived label pairs present and numerically usable for each fixed ID? | The **36 retained bound evidence objects**, 126,885 bytes. Inspect schema, material, model ID, input hash; require one property record per scoped name and inspect `unit`, `value`, `reference_value` and citation presence/content. Preserve optional `tolerance` separately. | Presence, finite non-boolean numeric types, citation adequacy and source choice are not established by current metadata or by Pydantic's `float` annotation. An absent label remains absent; never fill it by applying today's binder. |
| Which candidate citation is consistent with the recorded attribution? | Those 36 objects plus the verified **43-location private documentary projection**, if root accepts the completed projector's exact bindings and scope. Keep the original 172 edges and all competing candidates. | A unique literal citation/context match is a candidate attribution, not an explicit stored file/ordinal or numeric concordance check. Identical/shared citations, no matches and conflicting contexts remain unresolved. No additional raw reference read is needed for this limited comparison. |
| Do the recorded reference value and citation agree with a specific retained candidate? | The 36 bound objects plus the **two already retained reference JSON objects**: **38 objects / 188,804 bytes**. Within the two reference containers use all 43 frozen candidate locations, their literal context/method/citation and `value`. | Multiple or zero concordant candidates remain `UNKNOWN`; a unique concordant candidate is a reconstructed attribution, not a stored key or physical validation. The documentary projector deliberately omitted reference value fields, so it cannot supply this numerical check. |

The four properties are `gamma_100`, `gamma_111`, `vacancy_formation_energy`
and `gamma_110`: 144 fixed ID/property positions. Existing public custody
metadata reports one property record at every position, not numerical
completeness. There are 116 one-candidate positions and **28 two-candidate
vacancy positions**: Ag/Al/Au/Cu/Ni/Pd/Pt across four models retain both DFT-PBE
and experiment. Ca/Sr have one recognized vacancy candidate each. These
repeated links are not independent reference measurements. No preference is
applied and neither candidate is dropped.

The source's binding policy prefers DFT-PBE then experiment, but policy is not
evidence of what an archived record contains. Any future attribution check must
compare the actual stored fields against **every** fixed candidate, preserving
missing, conflicting and multiple matches. Upstream target/property values are
typed `float`, so original decimal text need not survive serialization. A
numeric representation/concordance rule must be frozen before access; no
nearest-value matching, adaptive tolerance or model-error-based choice is
justified. The optional acceptance tolerance is not metrological uncertainty.

The 36 unbound evidence objects are unnecessary merely to inspect the bound
labels. They would be additional inputs if the question becomes whether all
stored predictions/provenance were preserved during binding. Existing public
input-hash agreement does not establish numerical equality. The 36 run objects
are likewise unnecessary for this narrow label question; model geometry needed
by the historical figure map is a separate later scope. The figure map and
re-relaxed calculator remain distinct.

A future whole-file read exposes all fields and properties in those objects to
the machine, even if only the four scoped labels are projected. Reusing an
existing documentary projection avoids a new reference-byte read; it does not
erase its prior citation/notes exposure or create a fresh holdout.

This review read only pinned code/schema and existing public custody reports,
inventories and graph. It opened **no raw reference, evidence or run object**,
ran no binder/reader, made no network request and computed no residual, rank,
fit, split or allocation. Earlier machine exposure is not erased. Stored labels
are archival observations of software output, not certified physical truth;
source rights, conditions, checkpoint identity and physical uncertainty remain
separate gates. Root decides any subsequent scope after documentary review.

Source anchors: pinned `binding.py` lines 186/214 define the separate record
and result; lines 336/385/405 define binding and evidence updates.
Pinned `schemas.py` lines 95/180/193/209 define the property, calculator source,
provenance and evidence models. Exact file hashes are retained in
[source-bindings.json](source-bindings.json); [metadata-checks.json](metadata-checks.json)
records the public count reconciliation, with no scientific-source execution.
