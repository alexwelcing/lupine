# Constructed archival-report browser fixtures

These five public aggregate documents contain synthetic test results only.
They are never served as bundled scientific results. The fixed API field
`execution_kind=synthetic_fixture` and visible interface banner preserve that scope.

The original generator's source-bound manifest is `manifest.json`. A portable
main-layout generator reproduces all five documents byte-for-byte:

```bash
python scripts/mpea_ui_fixtures.py --output .cache/mpea-ui-new-attempt
```

The output directory must not already exist. Compare each generated JSON with
its namesake here; the new manifest binds current main-layout paths and therefore
has its own identity. The generator constructs cases from test code and performs
no actual archive, feature, allocation or target access. Declared context and
access counters are synthetic metadata, not actual source-access receipts.

`complete-positive` is a software positive control, not measured recommendation
superiority. `complete-negative` separates any-optimum success/zero regret from
losing a tied optimum. The other controls preserve unknown primary truth, empty
secondary panels, unavailable F/D components, inadequate development and missing
registration. Exact complete payloads retain all 24 policies and every budget.

See `reports/mpea-guarded-components-v1/` for original generation, the portable
regeneration comparison and browser evidence. Changes to the scientific study
require its own untouched evaluation protocol; these fixtures authorize none.
