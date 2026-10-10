# Exact calibration planner: execution record

Executed locally on 2026-10-10 with Python 3.12.14.

- `python -m unittest discover -s tests -p 'test_calibration.py'`: **5 tests
  passed**. Exact ranks, allocation over candidate/target events, finite sample
  thresholds, ties, empty calibration, and unbounded outcomes are exercised.
  Rational values immediately above/below a rank boundary expose float-rounding
  mistakes. Gap/steel pilot dimensions require an unbounded outcome under the
  documented 5% joint-risk construction.
- `python -m unittest discover -s tests -v`: **71 tests passed** after the
  independent review's input-container correction. Scalar text, bytes,
  bytearrays, mappings, and generators are rejected as residual collections;
  lists and tuples of exact rational strings are accepted. This prevents
  silently calibrating characters, byte values, or dictionary keys.
- Independent code review accepted the exact mathematics and premise labels;
  its concrete input-shape defect was corrected and regression-tested.

The current `runtime-manifest.json` pins the source and test bytes for this
checkpoint. The previous interface manifest is preserved as
`runtime-manifest-workbench.json`.

This implements only G1a in `../GOAL.md`: planning and one scalar target's
order statistic. The selector, input schema, CLI, and browser still require
finite intervals. Integrating explicit abstention is G1b. Finite rank arithmetic
does not establish exchangeability, interval soundness, or physical accuracy.
No probability theorem was added to Lean and no new archive labels were opened.
