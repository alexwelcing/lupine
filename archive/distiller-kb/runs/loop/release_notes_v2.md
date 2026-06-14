# Release Notes v0.2.0

## What Changed (v0.1.0 to v0.2.0)

### Corpus Pipeline
- Enhanced literature_scan with new metadata fields:
  - `per_metal_errors`: Per-element error tracking in elastic property predictions
  - `citation_count`: Number of references citing each source
  - `doi_verified`: DOI validation status for source verification

### Distill Pipeline
- Added `test_operators.py`: Comprehensive test suite for operator quality assessment
- Generated `operator_proposals_v2.json` with refined operator definitions

### Counterexample Pipeline (NEW)
- Introduced failure_analysis pipeline to identify systematic weaknesses
- Discovered 11 identified failures across tested material-property pairs

## Pipeline Performance

| Metric | Value |
|--------|-------|
| Profiles Completed | 3 |
| Total Pipeline Runs | 5 |

## Operator Quality (MAE Table)

| Operator | MAE (GPa) |
|----------|-----------|
| test_operators.py | 1.756 |

*Note: Lower MAE indicates better predictive accuracy. Target: < 1.0 GPa*

## Failure Analysis Summary

11 failures identified across counterexample testing:

1. Insufficient training data for rare earth alloys
2. Missing temperature-dependent parameters
3. Edge cases in hexagonal crystal structures
4. Bonding energy approximations in intermetallics
5. Phonon dispersion prediction gaps
6. Surface energy extrapolations
7. Stacking fault energy calculations
8. ... (see failure_analysis_v1.json for complete inventory)

## Known Limitations

- MAE of 1.756 GPa exceeds target threshold of 1.0 GPa
- DOI verification incomplete for older literature sources
- Temperature-dependent modeling not fully implemented
- Coverage gaps for rare earth and actinide systems

## Next Steps (v0.3.0)

1. **Reduce Operator MAE to < 1.0 GPa** through ensemble methods
2. **Expand DOI verification** to achieve > 95% coverage
3. **Implement temperature corrections** for thermal expansion effects
4. **Add rare earth training data** to improve f-electron system predictions
5. **Validate against ASR benchmark dataset**