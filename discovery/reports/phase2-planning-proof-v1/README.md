# Exact prospective planning: a general proof note

2026-10-16. Original mathematical argument for the existing planner; no new
algorithm, data analysis, runtime change or Lean compilation.

Fix the scoring rule, population and all planning parameters independently of
the prospective observations. All probabilities below are conditional on that
frozen information. They are not conditional on the realized calibration scores,
observed feasibility or a later decision to retain only favorable studies.

## Rank and threshold event

Let \(n\in\mathbb N\), including zero, \(0<\alpha<1\), and let the complete
measurable scores \(R_1,\ldots,R_n\) take values in \([0,1]\). Define

\[
k=\lceil(n+1)(1-\alpha)\rceil,\qquad
\tau=\begin{cases}R_{(k)},&k\le n,\\1,&k>n,\end{cases}
\]

where \(R_{(k)}\) is the kth smallest calibration score, counting ties.
The fallback of one is the bounded-score pool rule, not an observed maximum.
For every real cutoff \(c<1\), the following statements hold.

First, \(1\le k\le n+1\). Since an integer \(n\) satisfies
\(\lceil x\rceil\le n\) exactly when \(x\le n\),

\[
k\le n
\iff(n+1)(1-\alpha)\le n
\iff\alpha\ge\frac1{n+1}
\iff n\ge\lceil1/\alpha\rceil-1.
\]

Thus the minimum finite-rank count is exact, including equality. For rational
\(\alpha\), the existing source theorem
`LupineRisk.finite_rank_iff_minimum_count` in
[LupineRisk.lean](../../formal/LupineRisk.lean), with positive rational risk and
arbitrary natural count, states this arithmetic equivalence. Its definition
uses `Nat.ceil`; on the accepted \(0<\alpha<1\) domain its rank is the ceiling
above. It is not a probability or Python-refinement theorem.

If \(k\le n\), sorting gives the deterministic equivalence

\[
\{\tau\le c\}
=\left\{\sum_{i=1}^n\mathbf1\{R_i\le c\}\ge k\right\}.
\]

Indeed, the kth score is at most \(c\) exactly when at least \(k\) scores are
at most \(c\). Ties therefore require no continuity assumption. Equivalently,
at most \(n-k=\lfloor(n+1)\alpha\rfloor-1\) scores may exceed the cutoff.
If \(k>n\), then \(\tau=1>c\), so the event is impossible, without any IID
or score-law premise. This includes \(n=0\).

## Hypothetical probability and its limitations

Now assume the indicators \(\mathbf1\{R_i\le c\}\) are conditionally IID
Bernoulli with common probability \(p\). IID complete scores with CDF value
\(p=\Pr(R_i\le c)\) suffice. For each specified set of \(j\) successful
indices, independence gives probability \(p^j(1-p)^{n-j}\). The
\({n\choose j}\) such events are disjoint. Summing them gives, for finite rank,

\[
\Pr(\tau\le c)=\sum_{j=k}^{n}{n\choose j}p^j(1-p)^{n-j}.
\]

This includes \(p=0,1\), with zero-length products equal to one. Exchangeability
alone does not supply the product law: for \(n=2,\alpha=1/2\), make both
success indicators the same Bernoulli variable with probability \(1/2\).
They are exchangeable, but the event probability is \(1/2\), whereas the IID
formula gives \(1/4\).

For the law \(R_i=1\) surely, every finite-rank threshold and every fallback
equals one. Thus every cutoff below one fails at every count. A finite rank
cannot establish useful screening. For any \(0\le c<1\) and finite rank,
the all-zero law instead makes the event certain: count and cutoff alone
cannot identify its probability. For \(c<0\), bounded scores themselves make
the event impossible; the implementation accepts only \(0\le c<1\).

There is a general transition identity under the same fixed IID score law.
Let \(k_n=\lceil(n+1)(1-\alpha)\rceil\),
\(S_n=\sum_{i=1}^n\mathbf1\{R_i\le c\}\), and \(P_n=\Pr(\tau_n\le c)\).
Since the ceiling's argument increases by \(1-\alpha\in(0,1)\),
\(k_{n+1}-k_n\) is zero or one. When both ranks are feasible,

\[
P_{n+1}-P_n=
\begin{cases}
p\Pr(S_n=k_n-1),&k_{n+1}=k_n,\\
-(1-p)\Pr(S_n=k_n),&k_{n+1}=k_n+1.
\end{cases}
\]

For unchanged rank, the only newly successful outcome has \(S_n=k_n-1\)
and the new indicator equal to one. At a rank increase, the only lost success
has \(S_n=k_n\) and the new indicator equal to zero. Independence gives the
displayed products, including \(p=0,1\). If both ranks are infeasible, both
probabilities are zero. At the first feasible transition,
\(k_n=k_{n+1}=n+1\), so the probability rises from zero to \(p^{n+1}\).
The rank boundary shows that increasing the count cannot lose feasibility.
These statements hold with \(\alpha,c,p\) fixed; they do not compare retuned laws.

In particular, the probability is not monotone in the calibration count. Choose
\(\alpha=1/10\), \(0\le c<1\), and an IID law putting mass \(p=19/20\) at
zero and the remaining mass at one. Counts 19 and 20 require ranks 18 and 19,
so both tolerate at most one score above the cutoff. Writing \(P_n\) for the
threshold-event probability,

\[
P_{19}=p^{18}\bigl(p+19(1-p)\bigr),\qquad
P_{20}=p^{19}\bigl(p+20(1-p)\bigr),
\]
\[
\frac{P_{20}}{P_{19}}
=\frac{19}{20}\frac{39/20}{38/20}
=\frac{741}{760}=\frac{39}{40}<1.
\]

This constructed law proves the nonmonotonicity; it is not a materials result.
The event concerns a calibration threshold. It is not itself a bound on losing
future optima, an exact candidate-budget event, or conditional coverage after
selection. Those conclusions need their own definitions and premises.

## Zero-failure resolution

Separately fix a binary panel-failure endpoint and a decision rule. Let
\(0<\rho,\eta<1\), and assume conditionally IID failure indicators with common
probability \(q\). For a prospectively fixed integer \(e\ge0\), independence
gives

\[
\Pr_q(\text{zero failures in }e\text{ panels})=(1-q)^e,
\qquad
\sup_{q\ge\rho}(1-q)^e=(1-\rho)^e.
\]

The equality follows because the probability decreases with \(q\), and the
null includes \(q=\rho\). At \(e=0\), the empty sample has zero failures
with probability one, including when \(q=1\).

Consequently, the hypothetical fixed-sample rule that rejects this null exactly
on zero failures has size at most \(\eta\) exactly when
\((1-\rho)^e\le\eta\). The smallest qualifying positive count exists because
these powers strictly decrease to zero. In real arithmetic it is

\[
e_* = \left\lceil\frac{\log\eta}{\log(1-\rho)}\right\rceil,
\qquad
(1-\rho)^{e_*}\le\eta<(1-\rho)^{e_*-1}.
\]

Both logarithms are negative; dividing \(e\log(1-\rho)\le\log\eta\)
reverses the inequality. Equality qualifies: for example,
\(\rho=1/2,\eta=1/4\) gives \(e_*=2\). For a cap \(E\in\mathbb N\), the
answer is \(e_*\) if \(E\ge e_*\), otherwise no qualifying count within the
cap. The null bound at that cap is \((1-\rho)^E\); for \(E=0\) it is one.

This is resolution if a hypothetical zero-failure outcome occurs. It is not
observed evidence or power under an alternative. The planner selects no
alternative law or scientific testing protocol. Dependent indicators, omitted
failures, outcome-dependent sampling or an unfrozen endpoint do not inherit
this argument.

## Relation to the bounded implementation

[study_planning.py](../../src/lupine_discovery/study_planning.py) accepts counts
only from 0 through 256 and bounded exact rational inputs. If \(p=a/b\), its
integer sum divided by \(b^n\) is exactly the binomial expression above; the
zero-failure loop forms successive exact powers and records the first weak
inequality. It does not evaluate logarithms or binary-search a purported
monotone threshold probability. A missing \(p\) remains unknown for finite
rank; infeasible rank remains deterministic zero.

The arguments above quantify over arbitrary natural counts and real parameters
in their stated domains. The Python API implements a bounded rational subset.
Existing finite tests exercise implementations; they do not prove arbitrary
counts. This note is a written proof, not a new mechanically checked theorem,
a claim that Lean refines Python, or an attestation of sampling independence,
physical bounds, scientific adequacy or superiority. It does not alter the
documented [planner contract](../../docs/study-planning.md) or prior scientific
verdicts.
