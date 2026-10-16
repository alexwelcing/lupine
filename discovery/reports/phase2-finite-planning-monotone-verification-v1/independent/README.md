# Independent finite planning monotonicity review

The four held statements compile independently with warnings treated as errors.
The first invocation exited zero in 9.173303604 seconds; stderr was empty, all
18 bound inputs were unchanged, and the object is byte-identical to the author's
compiled object. Complete axiom output names exactly the four statements and
only `propext`, `Classical.choice`, and `Quot.sound`. No failed invocation,
network, dependency build, tracked edit, runtime test or source-data access
occurred. See [execution](first/execution.json) and [actual output](first/stdout.txt).

The reviewed source is `fa1dedddf324fbd66a96de9eef1d775babccbc3668a81fd48726287dffe2268d`.
The original thirteen-statement source remains
`391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd`.
This candidate is additive and was not integrated by this reviewer.

The one-step argument cross-multiplies positive binomial denominators on
`e < M`, cancels the positive natural factor `e+1`, and uses the exact binomial
recurrence plus `M-K-e <= M-e`. Induction gives nonincrease through `M`.
Cap feasibility uses the weak threshold, so equality qualifies. The least-count
argument is nonvacuous when its explicit feasible positive cap exists:
`Nat.find` may search all naturals, but the cap witness forces the chosen count
at most `cap <= M`. Its qualifying-suffix statement is restricted to positive
counts through `M`; totalized rational division outside that domain supplies no
sampling claim.

Boundary review, by the displayed mathematics rather than additional runtime
or newly compiled boundary lemmas:

| Boundary | Consequence |
| --- | --- |
| `cap=0`, including `M=0` | No positive count is feasible; the minimum theorem's positive-cap premise cannot hold. |
| `K=0` | Every admissible ratio is one. A positive cap qualifies exactly for threshold at least one; the first count is one. |
| `K=M>0` | Every positive admissible ratio is zero. For threshold at least zero and positive cap the first count is one. |
| Negative threshold | Nonnegative admissible ratios cannot qualify; minimum existence is not asserted. |
| Threshold zero, `1 <= K <= M` | The first possible zero is `M-K+1`, and the cap must reach it. |
| Threshold one or larger | Every positive admissible count qualifies; a positive cap has minimum one. |
| `K>M` | Natural-subtraction algebra still applies; this is not a physical failure-count interpretation. |

There is no blocking mathematical or scope finding. These results close the
mathematical evaluation-size monotonicity and least-count characterization gap.
They do not prove the Python parser, Fraction/math.comb implementation, concrete
search loop, resource bounds, exports or sampling protocol. The finite fixed
population, failure set, fixed rule and uniform fixed-size subset interpretation
remain explicit premises. No physical accuracy, scientific admission, power,
future-risk guarantee or G20/G21 change follows.

The retained script uses the existing pinned Lean executable and installed
Mathlib plus the bound base-module object. The binary output is deliberately
excluded from the publication inventory; its digest is retained in execution.
