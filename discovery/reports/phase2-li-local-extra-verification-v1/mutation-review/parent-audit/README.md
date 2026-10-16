# Parent mutation audit

The parent independently checked the frozen declaration, exact six replacement sets,
normalized unchanged test bytes, runner selection/isolation logic, all seven first
execution receipts and logs, and every held file identity across those invocations.
The 326 runtime files matched the published manifest before and after this audit;
HEAD remained `d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3`.

Baseline: 25 unchanged methods passed. All six predeclared mutants triggered
assertions, with no survivors, test errors or observed scope violations. The
six cases generated 14, 5, 6, 5, 6 and 23 failure/subtest events across 4, 2, 1, 2,
1 and 6 distinct failed methods respectively. This is sensitivity to six curated
synthetic defects, not exhaustive coverage, a proof, a defect-rate estimate or
physical validation. The five production/source-context methods were excluded.

[Receipt review](receipt-review.json) records the actual detector mechanisms,
including the partial-list mutant's incomplete-walk consistency failure. The
[declaration review](declaration-review.json) and [before binding](before.json)
retain the earlier independent checkpoints. No tests were rerun by this parent
audit; no product was imported and no scientific source, capture, prerequisite
receipt or network resource was read. The child's raw bundle and inventory
remain unchanged; this directory has its own noncircular inventory.
