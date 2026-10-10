# Engine architecture and extension boundaries

The recommendation engine consumes a finite candidate universe and scientifically scoped intervals. Candidate generation and property modeling are separate adapters. This makes the decision mathematics reusable across molecules, atomic structures, alloys, processing histories, and operating scenarios without pretending their physical models are interchangeable.

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
| `calibration.py` | Exact uniform joint-risk allocation and finite/unbounded order-statistic diagnostics | Sampling premises remain unverified; not yet integrated with selector/CLI/UI |
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

Pareto retention requires vector objectives and a different dominance predicate. Nonlinear transformations require domain-aware enclosure rules. Simultaneous probabilistic coverage requires explicit joint events and sampling assumptions. Distribution shift requires separate scrutiny. Each extension should bring a precise theorem, runtime contract, counterexample at its boundary, and outcome-independent evaluation protocol.
