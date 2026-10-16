# Prospective risk contracts: keep the quantified claim fixed

2026-10-16 · root research note · **DESIGN_ONLY; no engine or study change**.

The next study must specify which random quantity its guarantee controls before
choosing an algorithm. A smaller pool under a different loss or quantifier is
not evidence that the existing all-optima-retention contract improved. This
note reads mathematical primary sources only; no materials workbook, new
allocation, model fit or scientific experiment was run. Search results and an
automatically opened paper viewport included unrelated computer-vision example
figures/results; none are used to select Lupine criteria or claim materials
performance. No untouched Lupine evaluation outcomes were accessed.

## Two primary results and their limits

[Conformal Risk Control, ICLR 2024](https://proceedings.iclr.cc/paper_files/paper/2024/file/f3549ef9b5ff520a7e41ff3cc306ab2b-Paper-Conference.pdf),
Theorem 1 and equation (4), uses exchangeable loss functions that are bounded,
non-increasing and right-continuous, with an attainable safe endpoint. Its
correction adds the worst-case loss contribution for one additional point to
the calibration sum. The resulting bound concerns expected future loss,
averaging over calibration and future randomness. The paper's nonmonotone
counterexample shows why boundedness alone does not justify that rule. This
source is relevant to a possible nested-pool loss adapter; it is not an
implemented Lupine guarantee or a claim of small pools.

[Learn then Test, arXiv 2110.01052v5](https://arxiv.org/html/2110.01052v5),
Definition 1 and Theorem 1, instead controls the probability that any accepted
policy exceeds its risk tolerance. The stated calibration setup uses IID
samples. Valid null p-values and family-wise error control support selection
among the accepted policies; the accepted set may be empty. Fixed-sequence
ordering must not be learned from the same testing observations without the
paper's separate split construction. Nonmonotone policy risks are permitted,
but valid tests and their sampling assumptions are still necessary. The cited
version is dated September 29, 2022 in arXiv submission metadata; the HTML's
rendered August 24, 2026 dateline is not treated as a new paper version.

## Implication for Lupine

Let D be calibration data, Z a future evaluation unit, and
R(D) = E[L(D,Z) | D]. These three statements have different meanings:

| Contract | Quantified statement | What still does not follow |
|---|---|---|
| Conditional exact engine | For every compatible truth assignment, every required optimum remains in the pool. | That real inputs satisfy their declared premises. |
| Marginal statistical loss | E[R(D)] <= alpha. | A specified small probability that the deployed fixed rule has risk above alpha. |
| High-confidence policy risk | Pr_D(R(D) <= rho) >= 1 - eta. | Zero losses, individual-material validity, useful pool size, or an observed power estimate. |

An elementary countermodel makes the second distinction concrete. Suppose a
random calibration result yields R(D)=1 with probability 1/10 and R(D)=0
otherwise. Then E[R(D)]=1/10, while Pr(R(D)>1/10)=1/10, which exceeds 1/20.
This is a logical counterexample to an implication between inequalities, not
an empirical result or a counterexample to a particular implemented algorithm.

For nested candidate pools, losing any required optimum and losing a fraction
of optima are different losses. A mean-fractional-loss objective may tolerate
rare complete misses or multiple missed ties. An apparent reduction from
changing to that loss would require a separate declared contract and benchmark;
it cannot upgrade the frozen MPEA or JARVIS verdicts. Likewise, a maximum risk
across fixed endpoints and a union probability of any endpoint failure are
not interchangeable without an argument.

The existing planner remains intentionally narrower: its optional score law is
hypothetical IID; its zero-failure calculation is best-case resolution, not
power or observed risk. No new method is selected here. Next research decision:
after source grouping and joint endpoint semantics are supported, freeze the
loss, evaluation unit, sampling premise, policy family and multiplicity rule
before opening new outcomes. If those premises cannot be supported, retain a
descriptive claim or abstain. Do not weaken existing acceptance gates.

## Read scope and verification

The primary theorem/definition locations above were read through the web
provider on October 16. The initial author-PDF and Stanford-page fetches failed;
an unverified v7 HTML guess returned 404. The actual arXiv metadata identified
v5, whose linked HTML then loaded. No failed read is counted as verification.
Provider responses remain in ignored local storage; no full paper is copied
into the repository. This is a source review and elementary written argument,
not a compiled theorem, runtime test, systematic literature review or claim
that these are the only available risk-control methods.
