# Actual verification record

## Finite permutation-invariant score-law extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace after checkpoint
`d169b1070eaec916ebf9af221aa4596dd4b2cb1d`, using the same pinned Lean `4.29.0`
and Mathlib revision documented below.

- The new module first compiled in ignored scratch with warnings treated as
  errors and all eight statements axiom-audited. An independent reviewer then
  reproduced the strict scratch compile, checked its source/object/output
  bindings, and found no blocking mathematical issue.
- `lake --wfail build`: passed all nine default modules, 1,013 jobs, no warnings.
- `python3 audit_axioms.py`: freshly re-elaborated all nine sources, checked
  complete declaration/output coverage, and passed all 125 theorem audits.
- `python3 -m unittest test_audit_axioms -v`: all eleven adversarial parser
  tests passed.

The current [theorem inventory](theorem-inventory.json) records **125 statements
in nine modules**. The fresh [combined axiom output](AXIOMS.txt) contains only
`propext`, `Classical.choice`, and `Quot.sound`. The new module imports only
`LupineDecisionPool`, reusing its existing dependency graph. No new project
axiom or admitted proof is present.

`LupineExchangeability.lean` was copied byte-for-byte from the independently
reviewed scratch module; there were no proof integration edits. Its SHA-256 is
`0e326c4b51e5ca00d1deb32be61ba7b80ca0c443059d0fbf13e22f05717610ce`.
The current inventory SHA-256 is
`bd6823b9340a1d8b8f4595f95b83677df5e19eae4ac2585f6ec7f304db2424e7`, and
the combined axiom-output SHA-256 is
`d99b1d075507166a731d2a7e2c35d20e58eeba3dfa50ad12f796c575d3ca3811`.
Every current module and the combined output were checked against those
generated bindings after the audit.

Before refreshing the inventory, the eight-module 117-statement receipt was
preserved as [history/g16-theorem-inventory.json](history/g16-theorem-inventory.json)
and [history/g16-AXIOMS.txt](history/g16-AXIOMS.txt). Those bytes were verified
against both the pre-integration checkpoint and their G14 origin
`522fb280bad7ef1794c97a0de1f64a0e90598efe`. All eight previous Lean source
files remain byte-identical. The audit parser, its tests, dependency manifest,
and toolchain pin were unchanged.

Local execution logs, relative to `discovery/`, are
`.cache/formal/g17-build.log`, `.cache/formal/g17-audit.log`, and
`.cache/formal/g17-audit-tests.log`. The local source-bound receipt
`.cache/formal/g17-verification.json` records command outcomes, log digests,
old/new module hashes, historical receipt hashes, the compiled object, and
configuration bindings. Its SHA-256 is
`2ecb87e8df75292148dfa671cce6247563128aa31377daa6c2b45f605cff8c7f`.
These ignored artifacts supplement the committed inventory and axiom output.

The eight new statements prove strict-lower count and exact leave-one-out
failure equivariance, finite event-mass invariance under a weight-preserving
bijection, and equality of indexed failure masses for a finite joint score
support closed under coordinate permutations with invariant atom weights.
Nonnegative normalized weights then yield the proved marginal `(N-k)/N` bound;
the exact rational ceiling finite branch yields the alpha bound. Equality of
indexed failure masses is derived, not separately assumed in the new final
statements. The independent review also executed 24,336 synthetic event/action
checks; these are separate executable evidence, not additional Lean statements.

The law must have finite support. The result does not establish arbitrary
measurable or infinite-support exchangeability, scientific sampling validity,
conditional-on-feasible or observed-calibration coverage, Python refinement,
or useful pool reduction. Exact quantiles are still explicit premises. The
insufficient-rank/full-universe runtime branch is not covered here. Applying
the existing all-minimizer retention equivalence also requires the actual
panel-score definition and a nonnegative threshold; no physical labels or
ranking protocol are validated by this new mathematical implication.

## Historical direct candidate-pool counting and finite probability extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace after G13
checkpoint `429751038af7be32b0e6bac583508a59d0aa23c1`, using the same pinned
Lean `4.29.0` and Mathlib revision documented below.

- The new module first compiled in an ignored scratch directory with
  `lake env lean -DwarningAsError=true`; all 17 statements passed a complete
  source-bound axiom audit before integration.
- `lake --wfail build`: passed all eight default modules, 1,011 jobs, no warnings.
- `python3 audit_axioms.py`: freshly re-elaborated all eight sources, checked
  complete declaration/output coverage and passed all 117 theorem audits.
- `python3 -m unittest test_audit_axioms -v`: all eleven adversarial parser tests
  passed.

The preserved [theorem inventory](history/g16-theorem-inventory.json) records
117 statements in eight modules. Its [combined axiom output](history/g16-AXIOMS.txt) contains only
`propext`, `Classical.choice` and `Quot.sound`; there is no admitted proof or
project-specific axiom. Every source hash and the combined-output hash were
checked against the generated inventory after the audit. New-module source
SHA-256 is `10a5962eedf30819388a835b052df91f4fff130c79258d31eb345f51071cf00a`;
combined-output SHA-256 is
`47973449335d90538dc233321d7087265f2ad1dfd4e51f4990dfae671fc8c468`.

Before integration, the seven-module 100-statement receipt was preserved in
[history/](history/README.md), checked against its published source checkpoints
and verified against all seven source hashes. Those seven Lean sources remain
byte-identical after integration. The existing audit script discovers the new
root module automatically; its parser and tests were unchanged. Local execution
logs are `.cache/formal/g14-build.log`, `.cache/formal/g14-audit.log` and
`.cache/formal/g14-audit-tests.log`, relative to `discovery/`. These ignored logs
supplement the committed source-bound inventory and actual axiom output.

The new statements prove the strict-lower finite count with score ties, exact
order-statistic characterization and existence, leave-one-out failure count,
and retention of every tied feasible minimizer exactly when its panel score is
at most a nonnegative threshold. Empty and infeasible finite panels have score
zero, and the normalized-rank comparison has an exact cross-multiplied form.

The probability extension is explicitly a **finite weighted outcome model**:
nonnegative weights sum to one, and all indexed leave-one-out failure events
have the same mass as the designated test event. A proved weighted-count
identity and the actual deterministic count yield failure mass at most
`(N-k)/N`; rank arithmetic then gives the alpha bound, including an exact
rational-ceiling corollary in the finite calibration branch. No sum-of-risks
bound is assumed. Independent read-only reviews of the deterministic and
finite-law source found no contract defect; those reviews were separate from
compilation and the axiom audit.

This historical module is not a formal theorem for an arbitrary measurable
exchangeable law. It does not derive equal failure masses from exchangeability or validate a
scientific sampling premise. A finite candidate universe does not make the
outcome law finite. Rank permutation/upper bounds, the prefix-size formula,
the insufficient-rank full-universe runtime branch and Python refinement are
not proved. Neither scientific label completeness nor useful pool reduction,
physical accuracy, calibration-conditional or feasible-panel-conditional
coverage follows from these compiled results. The README lists the exact
statement map and distinctions from the existing subadditive `RiskLaw` module.

## Historical projection-field algebra extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace, after the
published G10 checkpoint `f55f0c4`, using the same pinned Lean `4.29.0` and
Mathlib revision documented below.

- `lake env lean LupineProjection.lean`: freshly elaborated all twelve new
  statements successfully and printed their actual axiom dependencies.
- `lake --wfail build`: passed all seven default modules, 985 jobs, no warnings.
- `python3 audit_axioms.py`: independently re-elaborated all seven sources,
  checked complete declaration/output coverage, and passed all 100 audits.
- `python3 -m unittest test_audit_axioms -v`: all eleven adversarial audit tests
  passed.

The preserved [100-statement inventory](history/g13-theorem-inventory.json)
records seven modules, including twelve projection algebra statements. The
checkpoint [axiom output](history/g13-AXIOMS.txt) contains only `propext`, `Classical.choice`,
and `Quot.sound`; no admitted proof or project-specific axiom occurs. Every
checkpoint module source hash and the combined-output hash were independently
checked against the generated inventory after the audit. Source SHA-256 for
`LupineProjection.lean` is
`600af2ee02e8f5ed7f84046d5abab253dc74be3d556414d67438e49a6f3c4f2d`;
the checkpoint combined-output SHA-256 is
`37cc47a7ba1e876fefd55dc9a5b327c6a46d341b1b6cd0d9331e21bd64484b19`.

Before replacing the current inventory, the six-module, 88-statement G10
receipt was copied to [history/](history/README.md). Its six source hashes and
axiom-output hash were checked before copying and again after the new audit.
Those six sources remain unchanged. Local command logs are in
`.cache/formal/g11-build.log`, `.cache/formal/g11-audit.log`, and
`.cache/formal/g11-audit-tests.log` relative to `discovery/`; these ignored
workspace logs are supplementary, not required committed verification inputs.

The new module imports only `LupineCoupled`, reusing its compiled dependency
graph. It proves the explicit real-valued substitution `theta = b + S z`,
projection coefficients and constants, truth transfer under both supplied
equalities, pairwise cancellation, signed whole-expression conversions,
discrepancy enclosures, and exact upper/lower anchor-row equivalence. An
independent source review found no sign or claim-scope defect; that review was
separate from actual compilation and the axiom audit.

The common-image representation, coordinate and discrepancy bounds, validity
of all candidate/anchor relations at one actual world, and anchor containment
remain supplied scientific premises. General rectangular or singular matrices
do not imply image coverage or invertibility. The existing coupled retention
theorem applies only with its domain, certificate, and baseline hypotheses;
the new algebra does not prove the Python adapter refines this construction,
validate physical scope from metadata, or establish empirical calibration.

## Historical conservative coupled-evidence extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace using the same
pinned Lean `4.29.0` and Mathlib commit documented below.

- `lake env lean LupineCoupled.lean`: freshly elaborated the new source and
  printed all 19 theorem axiom sets successfully.
- `lake --wfail build`: passed all six default modules, 983 jobs, no warnings.
- `python3 audit_axioms.py`: independently re-elaborated all six sources,
  verified complete per-module output coverage, and passed all 88 theorem audits.
- `python3 -m unittest test_audit_axioms -v`: all eleven adversarial audit tests
  passed.

The preserved [G10 theorem inventory](history/g10-theorem-inventory.json) records
the source hashes and actual axiom dependencies of all 88 statements: 19 coupled certificates and
screening statements, plus the 69 historical statements listed below.
[G10 AXIOMS.txt](history/g10-AXIOMS.txt) contains their fresh combined Lean output. Every dependency
is among `propext`, `Classical.choice`, and `Quot.sound`; no admitted proof or
project-specific axiom occurs. Source hashes and the combined-output hash were
independently checked against the generated inventory after the audit.

The coupled module reuses the compiled finite-sum dependency graph and adds no
project axiom declarations. Its statements prove exact affine weighted-row
bounds, strict contradiction certificates, consistency-point soundness,
candidate-feasible domain construction, conditional feasible strict witnesses,
and preservation of every tied feasible minimizer under one common admissible
latent world. The final retention theorem requires baseline retention explicitly.
It permits any supplied subset of certified exclusions and does not assume a
complete search.

The inactive-gate theorem has an explicit full-candidate fallback instantiation.
The runtime must use that fallback when its diagnostic intervals themselves
depend on unsupported or inconsistent affine premises; those intervals cannot
justify operational exclusions while the coupling gate is inactive. A verified
model point proves mathematical consistency only. The actual common-world
premise, physically justified coupling, Python refinement, exhaustive branch
reasoning, and certificate-search completeness remain outside the result.

## Historical joint-risk and interval-box sharpness extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace. The commands
below were actually executed successfully against the sources at that checkpoint.

- `lake --wfail build`: passed all five default modules, 981 jobs, no warnings.
- `python3 audit_axioms.py`: independently re-elaborated all five proof modules,
  verified complete per-module output coverage, and passed all 69 theorem audits.
- `python3 -m unittest test_audit_axioms -v`: all eleven adversarial audit tests
  passed.
- `lake env lean --version`: Lean `4.29.0`, commit
  `98dc76e3c0a9b856c9b98726b713fb04fab16740`, Release.
- `git -C .lake/packages/mathlib rev-parse HEAD`: exact manifest/config pin
  `8a178386ffc0f5fef0b77738bb5449d50efeea95`.

The checkpoint's theorem inventory and axiom output were regenerated from that
fresh audit; the current artifacts extend them. Counts were 18 scalar-selector theorems,
15 Pareto theorems, 9 interval-enclosure/domain theorems, 15 joint-risk/rank
theorems, and 12 scalar interval-box sharpness theorems. Each module was bound to
its source SHA-256 and each theorem listed its actual logical dependencies.
All 69 depended only on `propext`, `Classical.choice`, and `Quot.sound`; none depended
on an admitted proof or project-specific axiom.

The local build reused the already compiled pinned dependencies through the
ignored `.lake/packages` symlink and compiled the additional finite-sum and
rational-floor dependencies from pinned Mathlib source. Both new project modules
were compiled with warnings treated as failures. No dependency cache or local
symlink is part of the committed proof package.

`LupineRisk` proves conditional finite joint-risk allocation without independence,
the transfer of a supplied deterministic correctness implication to an event-risk
bound, and exact rational finite-rank resolution. Its `RiskLaw` premises describe
a normalized monotone subadditive capacity, which need not be additive
probability. A concrete constructor proves the required properties for finite
nonnegative normalized outcome weights. No general Mathlib measure adapter,
exchangeability proof, conformal marginal-coverage proof, or derivation of valid
marginal bounds from the archived data is included. The arithmetic agrees with
the runtime rank on its accepted positive allocation below one; no general
Python refinement is established.

`LupineSharpness` proves the scalar retained pool is the smallest pool preserving
every feasible global minimizer, including ties, in every world compatible with
the supplied ordered interval box. For each retained candidate it constructs
a compatible world in which that candidate is a feasible minimizer. Those worlds
need not be physically attainable or obey additional correlations; the theorem
does not rule out narrower safe pools supported by extra justified information.

## Historical Pareto and nonlinear extension

Completed on `2026-10-10` in the Linux x86_64 branch workspace. All commands
below were actually executed successfully against the sources at that checkpoint.

- `lake --wfail build`: passed all three default modules, 770 jobs, no warnings.
- `python3 audit_axioms.py`: independently re-elaborated all three proof modules,
  verified complete per-module output coverage, and passed all 42 theorem audits.
- `python3 -m unittest test_audit_axioms -v`: eleven adversarial audit tests passed,
  including namespace, omitted-theorem, unexpected-print, extra-axiom and
  admitted-source rejection in addition to the output parser checks.
- `lake env lean --version`: Lean `4.29.0`, commit
  `98dc76e3c0a9b856c9b98726b713fb04fab16740`, Release.
- `git -C .lake/packages/mathlib rev-parse HEAD`: exact manifest/config pin
  `8a178386ffc0f5fef0b77738bb5449d50efeea95`.

The checkpoint's theorem inventory was generated from actual
fresh Lean output, recorded every theorem's allowed logical dependencies, and
bound each module to its SHA-256. Counts were 18 scalar-selector theorems,
15 Pareto theorems, and 9 interval-enclosure/domain theorems. `AXIOMS.txt` held
the combined output, now extended by the latest audit. Every theorem depended
only on `propext`, `Classical.choice`, and `Quot.sound`; none depended on an
admitted proof or a project-specific axiom.

The local build reused the already compiled, pinned dependency graph via an
ignored `.lake/packages` symlink. Both new project modules were freshly compiled;
the audit independently elaborated all three sources. No dependency cache or
local symlink is part of the committed proof package.

Pareto retention is conditional on sound finite real endpoints. Feasible
optima whose interval feasibility is unknown survive, equal optimal vectors
survive, and exclusions require certified feasible strict dominance witnesses.
Refinement preserves those witnesses and shrinks the retained pool. Reciprocal
and division require the whole denominator interval to exclude zero; product
and square have no sign restriction. These results do not establish a Python
refinement, finite physical coverage, or empirical interval soundness.

## Initial scalar verification

Completed at `2026-10-10T06:08:44Z` in the Linux x86_64 project workspace.
The commands below were actually executed and exited successfully.

- `lake build`: completed the initial dependency and proof build, 771 jobs.
- `lake --wfail build`: completed strict current-source verification, 766 jobs;
  the root proof module was rebuilt successfully, with no warnings.
- `python3 audit_axioms.py`: independently re-elaborated the current source with
  `lake env lean LupineDiscovery.lean`; all 18 theorem outputs were present and
  passed the allowed-axiom gate.
- `python3 -m unittest test_audit_axioms -v`: six tests passed, including rejection
  of admitted proofs, custom axioms, missing output, duplicate output, and
  unexpected theorem output, plus acceptance of standard/empty axiom sets.

Lean reported version `4.29.0`, commit
`98dc76e3c0a9b856c9b98726b713fb04fab16740`, Release. The checked-out Mathlib HEAD
was `8a178386ffc0f5fef0b77738bb5449d50efeea95`, exactly the manifest/config pin.
The default Azure cache endpoint was unavailable through the session proxy;
Cloudflare mirror attempts found no usable pinned cache. The imported Mathlib
source graph was therefore compiled rather than assuming cached verification.

The initial `AXIOMS.txt` (now extended by the current audit) held the actual
fresh Lean axiom output. Every one of the 18 theorems
depends only on `propext`, `Classical.choice`, and `Quot.sound`, Lean/Mathlib's
standard logical foundations. No theorem depends on an admitted proof or a
project-specific axiom. Interval soundness, incumbent feasibility, minimizer
existence, and attained best-upper bounds appear as explicit hypotheses where
needed; this audit does not establish their physical validity.

SHA-256 of the verified source `LupineDiscovery.lean`:
`93adb82c8caceb6620285bea612b4c80e4cf11c7da6d1e04b8ba595f43c6c515`.
SHA-256 of the initial output `AXIOMS.txt`:
`39ef006d6d5d3e142b4bfc21706b9c72500a26a712296815ca968b9e18c2ee0a`.
These hashes identify artifacts; they add no mathematical or physical premise.

This record covers the abstract Lean kernel, including the deterministic
same-descriptor error lower bound. It does not claim that the Python runtime is
formally refined from Lean, that any empirical interval is sound, or that the
candidate universe exhausts physical possibilities. The README theorem map
states the precise scope of each guarantee.
