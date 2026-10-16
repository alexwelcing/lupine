# Engine architecture and extension boundaries

The recommendation engine consumes a finite candidate universe and scientifically scoped evidence. Interval modes use declared enclosures; a separate statistical mode calibrates a ranking prefix from complete labeled panels. Candidate generation and property modeling are separate adapters. This makes the decision mathematics reusable across molecules, atomic structures, alloys, processing histories, and operating scenarios without pretending their physical models are interchangeable.

```text
published sources / measurements / archived calculations
          |
          v
scope + provenance + model assumptions
          |
          v
property adapter --> exact enclosing intervals --> finite selector
                                                    |
                           retained pool + incumbent + regret bound
                           exclusions + evidence gaps + heuristic queue
                                                    |
sealed held-out outcomes ------------------------> replay audit
```

## Modules

| Module | Responsibility | Boundary |
|---|---|---|
| `core.py` | Exact interval arithmetic and finite selection | Assumes semantic scope and physical enclosure |
| `envelope.py` | Intersect anchored residual cones | Supplied distances and global Lipschitz premise are not inferred |
| `calibration.py` | Exact uniform joint-risk allocation and finite/unbounded order-statistic diagnostics | Sampling premises remain unverified; calibrated IO integrates finite bounds or explicit abstention with CLI/replay/UI |
| `pareto.py`, `pareto_io.py` | Exact vector dominance and partial-outcome replay | No scalar winner; sound componentwise intervals remain premises |
| `coupled.py`, `coupled_io.py` | Exact affine witnesses over one shared domain | One physical common world must exist; consistency alone cannot establish it |
| `projection.py`, `projection_io.py` | Translate declared correction fields, anchors and discrepancy bounds | Missing bounds yield no model; original scope and provenance remain sealed |
| `decision_pool.py`, `decision_pool_io.py` | Calibrate an exact ranked pool and audit the actual retained set | Marginal all-optimum retention under explicit panel-score law; no feasibility or regret certificate |
| `coupled_worker.py`, `decision_pool_transport.py` | Bounded Linux subprocess and strict statistical receipt transport | Worker limits and identity checks are engineering guards, not physical attestation |
| `evidence.py` | Validate evidence identity and scope links | A reported source is not a verified physical premise |
| `serialization.py` | Strict JSON, rational decoding, outcome binding | No implicit unit conversion or floating-point rounding |
| `cli.py` | Certificates, explanations, recomputation, replay interface | Certificate verification proves runtime consistency only |
| `replay.py` | Audit coverage, retention, feasibility and regret | Missing truth stays unknown; finite success is not universal validation |
| `benchmarks.py`, `resources/` | Independent finite-truth oracle, sealed cases, frozen archive reports | Synthetic cases test software; archived reports preserve failed physical premises |
| `server.py`, `web/` | Local research interface through the CLI's certificate and replay functions | Loopback only; original exact input preserved; no model training or uploaded-data persistence |
| `formal/` | Conditional abstract implications over real-valued functions | Does not prove Python refinement or source measurements |

## Adapter contract

An adapter defines the candidate universe, fixed scenario, observable reference and units, objective direction, and signed constraints. It then supplies finite enclosing intervals and linked evidence. Decimal strings preserve the supplied decimal value; they do not convert an approximate model output into an enclosure. A floating-point calculation needs a justified error bound and outward rounding before certification.

An interval may combine experimental uncertainty, reference-calculation error, surrogate residual, and scenario variation only when the composition is justified. Independence is not assumed by the interval arithmetic. Missing regularity or provenance is an evidence gap, not a zero error term. The current finite interval representation cannot encode infinite bounds; an adapter unable to supply a defensible finite enclosure must report that limitation instead of fabricating a large constant.

`examples/anchored.py` exercises the existing residual-envelope adapter on a synthetic scope. The archived benchmark demonstrates a different adapter, empirical calibration, whose interval assumptions fail on observed outcomes. Both feed the same scalar selector.

## Candidate acquisition and expansion

The current queue orders retained candidates heuristically by constraint ambiguity and score width. It is a proposal for where to gather evidence, not a proved information-gain optimizer. Evaluating new measurements may tighten or invalidate intervals. Invalidated premises require reanalysis; silently retaining their certificate is unacceptable.

Adding new candidates changes the optimization universe. It may expand the pool, alter the incumbent and invalidate comparisons to an old finite-universe optimum. Refinement guarantees apply only when identities, scientific scope, and truth are fixed and all intervals narrow compatibly. Adapters and future APIs must preserve this distinction.

## Research extensions

Implemented Pareto retention uses vector objectives and strict feasible dominance. Implemented nonlinear maps enforce their enclosing-domain requirements. Calibrated interval and direct-pool modes expose distinct probabilistic events and sampling premises. None establishes scientific exchangeability from a declared identifier. Distribution shift requires separate scrutiny, and a new scientific evaluation must freeze its protocol before opening its evaluation targets.

## Statistical branch

The direct-pool path consumes a frozen protocol, complete ranked calibration panels with recorded labels, and one unlabeled future panel. It seals selection before loading separate future outcomes. Unknown calibration labels preserve every panel in the denominator and trigger whole-universe fallback; unsupported assumptions and insufficient calibration have separate states. A finite threshold can retain zero candidates, which is not a certificate of infeasibility. Replay reports lost tied optima and incomplete truth without changing the selected pool.

The [wire contract](decision-pool-workbench-contract.md) specifies exact identities, lexical and total-panel limits, original-input seals, guarded HTTP, and paired exports. A marginal claim averages over calibration and a future panel; it does not become a guarantee conditional on feasibility, the observed calibration set, an individual material, or repeated adaptive use.
