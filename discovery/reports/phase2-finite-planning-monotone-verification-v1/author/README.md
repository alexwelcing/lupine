# Evaluation-size monotonicity and the first qualifying count

This isolated module imports the unchanged published `LupineFinitePlanning`
source, SHA-256 `391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd`,
from checkpoint `88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d`. It addresses two
explicitly unproved mathematical properties behind the existing finite planner.
It does not change runtime behavior, protocol criteria, or scientific claims.

Write `q(e) = choose(M-K,e) / choose(M,e)` over exact rationals. Four statements
are proved:

| Statement | Exact scope |
| --- | --- |
| `evaluation_step` | If `e < M`, then `q(e+1) ≤ q(e)` |
| `evaluation_antitone` | If `a ≤ b ≤ M`, then `q(b) ≤ q(a)` |
| `capped_feasible_iff` | For `cap ≤ M` and any rational `η`, some `1 ≤ e ≤ cap` has `q(e) ≤ η` exactly when `1 ≤ cap` and `q(cap) ≤ η` |
| `unique_first_count` | Under that cap feasibility, there is exactly one `1 ≤ n ≤ cap` such that, for every `1 ≤ e ≤ M`, `q(e) ≤ η` if and only if `n ≤ e` |

The last statement characterizes a minimum across the entire admissible range,
not merely a chosen witness. It also entails strict failure `η < q(e)` for each
earlier positive count and qualification of every later count through `M`.
Threshold equality qualifies. A cap of zero is infeasible for a positive-count
request. The theorem allows arbitrary rational `η`; the runtime's strict
`0 < η < 1` contract remains unchanged. For `M=0` there is no admissible positive
count, so the feasibility premise for the minimum cannot hold.

The step proof multiplies the cross-product comparison by positive `e+1`, uses
`choose(n,e+1)*(e+1) = choose(n,e)*(n-e)`, and compares the natural remainders
`M-K-e ≤ M-e`. The positive binomial denominators justify division. Induction
gives the full comparison. The minimum proof uses well-ordering (`Nat.find`)
and the proved monotonicity, not execution of a search implementation.

The algebra quantifies over all natural `K` because the imported definition uses
natural subtraction. Its fixed-population interpretation is limited to
`0 ≤ K ≤ M`; no interpretation of `K > M` as a physical failure count is made.
The result is nonincrease, not universal strict decrease: `K=0` has constant
ratio one on the admissible domain, and zero ratios remain zero after the
previously proved zero boundary.

The first and only candidate compilation passed with warnings treated as errors
in **9.711 seconds**, using the installed pinned Lean 4.29.0 and existing
Mathlib/cache. No network, dependency build/update, or tracked edit occurred.
The exact source SHA-256 is
`fa1dedddf324fbd66a96de9eef1d775babccbc3668a81fd48726287dffe2268d`.
`attempts/first/` retains source, command, times, actual output and object hash.
There were no compilation failures. The current source and all bound published
inputs, including the imported compiled object, were unchanged during execution.
The existing axiom-audit functions checked complete output for all four
statements; only `propext`, `Classical.choice`, and `Quot.sound` appear.

This is authored proof plus actual compiler/audit evidence. Independent peer
review is not asserted by this bundle. It proves neither Python/Fraction
refinement nor correctness of the concrete minimum-count loop, input parsing,
resource limits, or exports. Uniform fixed-size sampling, fixed labels and
policy, complete frames, and restrictions on adaptive selection remain protocol
premises. No physical truth, statistical power, future-population transfer,
benchmark admission, or G20/G21 status change follows. The original thirteen
statements remain unmodified, and no tracked inventory or build target has been
updated.
