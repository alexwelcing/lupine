# Finite-population study planning interface candidate

This ignored overlay adds a third, prospective zero-failure planning form. It
sends only four declared parameters to `/api/plan-finite-zero-loss`; Python
supplies every rank, count threshold and exact probability. No outcome, fitted
model, dataset path or scientific archive is read by the new form.

The form distinguishes a complete fixed residual panel population, uniform
sampling of distinct panel IDs without replacement and a fixed binary endpoint
from the two existing IID models. It displays the rounded integer null failure
count and attainable failure fraction, preserves absent qualifying counts as
null, and describes a zero null bound as an impossible zero-failure sample under
the stated finite null. Future-population risk, power, observations and scientific
adequacy remain unestablished. This is not an execution of a scientific protocol.

The existing shared revision guard invalidates exports on edits and ignores
older success/error responses. The finite schema validates closed fields and
fixed scope/status strings before rendering or exporting a response. Exact
response JSON is exported without JavaScript probability arithmetic.

Candidate files under `promotion/`:

- `src/lupine_discovery/web/planner.js`
- `src/lupine_discovery/web/index.html`
- `scripts/browser_smoke.py`
- `scripts/finite_planning_browser_checks.py`

No CSS change was needed. Existing `scripts/planning_browser_checks.py` and all
167 existing `browser_smoke.py` assert ASTs are preserved. The new maintained
browser helper adds eight check groups: exact export/scoping; discrete rounding,
equality and nulls; insufficient cap/census/singleton; invalid inputs; stale
response races; forged evidence/scope fields; keyboard/mobile/exact rendering;
and navigation/no archive or outcome requests.

`base-bindings.json` identifies the unchanged tracked inputs. `candidate-inventory.json`
identifies the proposed files. `static-review.json` records actual JavaScript
syntax and Python AST checks. Actual browser execution is pending a combined
server/runtime overlay; this candidate does not claim those tests passed.
