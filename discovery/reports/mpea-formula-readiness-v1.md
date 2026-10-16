# Actual supplemental formula result

The separately frozen G15C grammar recognizes all **1,545 rows**, forming **630
exact lexical groups**. This resolves the declared lexical-profile check only.
The original G15B result of **zero recognized formulas** remains unchanged.
Neither result establishes composition semantics, equivalent specimens,
independent studies, target completeness or predictive usefulness.

Source commit `a1e47024898072111f80e3ff911026306a50df2b` was pushed and verified,
and [all four CI jobs](https://github.com/alexwelcing/lupine/actions/runs/38081148087)
completed successfully before either actual invocation. The two fresh processes
both return exit 2, the documented unresolved-scientific-schema status. They
produce identical 231,945-byte receipts; this is expected metadata completion,
not a scientific-success exit. The [immutable execution record](mpea-formula-reproduction-v1.json)
includes actual commands, times, console results, CI completion times, and all
29 source/reference bindings.

| Artifact | SHA-256 |
|---|---|
| [Formula-token receipt](mpea-formula-tokens-v1.json) | `ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7` |
| [Execution/reproduction receipt](mpea-formula-reproduction-v1.json) | `3453b69b906230a627b128e8af8c7ff2722740295981950f972ec581096017ec` |

Only the permitted formula field was accumulated during this supplemental scan.
The scanner framed every original record, preserved its source-SHA/ordinal ID,
and kept all 22 other cells opaque. No coefficient was numerically converted;
no normalization, feature vector, target value, target presence/missingness,
eligibility decision, split or fit was computed. The receipts expose opaque
lexical groups, not raw formula strings.

## Public metadata joins

An independently expressed [public-receipt audit](mpea-formula-result-audit-v1/review.md)
checks both closed schemas and every original ID/order join. Five synthetic
checker tests pass with 33 unchanged source/reference/test hashes. Its
[aggregate result](mpea-formula-result-audit-v1/public-audit-v1.json) agrees with
the separately derived [root summary](mpea-formula-readiness-summary-v1.json):

| Declared metadata population | Rows | Formula groups | Known source groups | Formula groups spanning multiple known sources | Rows in those formula groups |
|---|---:|---:|---:|---:|---:|
| All records | 1,545 | 630 | 264 | 74 | 687 |
| Tensile mode | 358 | 107 | 80 | 14 | 161 |
| Tensile mode, exact declared 25 °C | 314 | 106 | 75 | 12 | 131 |

Of all 1,545 rows, 1,544 have recognized source tokens and one does not. The
687 whole-population overlap rows include that one unresolved-source row;
686 have known source tokens. All 314 exact-25 °C/tensile rows have recognized
formula and source tokens. These are declared metadata cohorts, not validated
paired-measurement populations. Source-token equality does not establish study
independence, and lexical formula equality does not establish chemical identity.
The overlap must remain visible in any later source-group evaluation.

The independent audit verifies consistency of the published execution/CI record;
it did not independently query GitHub or repeat the raw scan. Root performed
the actual GitHub query and two executions recorded above. The preserved audit
code is historical evidence; its command-line entry refuses to overwrite the
existing result. To recheck the published aggregate without writing:

```sh
python - <<'PY'
import importlib.util, json
from pathlib import Path
p = Path('reports/mpea-formula-result-audit-v1/check_public_formula.py')
s = importlib.util.spec_from_file_location('public_formula_audit', p)
m = importlib.util.module_from_spec(s)
s.loader.exec_module(m)
assert m.run() == json.loads(p.with_name('public-audit-v1.json').read_bytes())
print('Public formula audit reproduced')
PY
```

## Next gate

Build and independently review an exact declared-coefficient adapter, preserving
unknown vectors and all rows. Freeze its source and verify CI before any real
feature execution. Separately freeze the complete scientific protocol before
allocating source groups or interpreting performance cells. The reviewed draft
option is not a registration or an executed experiment. All existing scientific
NO-GO decisions remain unchanged.
