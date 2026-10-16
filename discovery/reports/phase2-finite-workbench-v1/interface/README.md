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
syntax and Python AST checks. Actual full Chromium execution passed on the combined server/runtime overlay:
73 checks (the original 65 in their original order, plus eight new groups), zero
JavaScript errors, exit 0, and 144.080 seconds. All 310 runtime source hashes
were unchanged. `browser-attempt-1/` preserves the invocation, timestamps,
stdout/stderr, complete before/after source maps, and actual generated artifacts.
This is the first and only full browser attempt for this candidate.

The overlay is based on `ea69d01e144747c97bf288b37249f39af9e8f715` plus the
explicit candidate map held by the root agent. It was not a committed release;
these checks make no claim about later push/CI, package installation, or a
scientific study. Concurrent root edits in the main worktree were outside this
held overlay; no clean-main-worktree assertion is made.

Default-state captures in `default-captures/` were separately produced from
real Chromium against the same unchanged 310-file overlay. The first mobile
element screenshot included the offscreen fixed skip link in its tall capture.
`default-captures-second/` preserves a corrected capture method: scroll to page
top, record the skip link's live bounding rectangle and unfocused state, then
capture the full-page coordinate clip. Its live bottom was below zero; the
link was not overlaying the visible form. Both image generations and capture
scripts remain retained. The second mobile image and first desktop card image
were visually inspected: no cropped fields or horizontal overflow were visible.
No application source or CSS was changed for this capture correction.
