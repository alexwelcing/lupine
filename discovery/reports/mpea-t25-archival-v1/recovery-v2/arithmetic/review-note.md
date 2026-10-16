# Actual v2 independent arithmetic audit

**Arithmetic audit PASS; frozen study verdict NO_GO_ARCHIVAL_USEFULNESS.**
The first authorized invocation exited 0 at 2026-10-11T01:01:10.745333+00:00.
It used the unchanged prepared auditor with source SHA-256
`4c8bc724b35ae30197b741c566fa2ab9bc7202091eb1be94800b9863ec371fea`.
The source, original RUNBOOK and two parent handoff files were unchanged across
execution. There was no failed audit invocation or repeat execution.

Both terminal attempts' independently recomputed arithmetic agrees exactly.
The audit receipt is SHA-256
`fd0686f269320a0b351d18b7c2fa825db37025d1622f5be0b8d806acb3fbcfa7`;
their common aggregate arithmetic identity is
`8319e8c050039534d85e658cb01af23a4d2e8ba9840c41638cb564813a11124d`.
All 960 fixed schedules per attempt, their observations, seven budget caps,
same-actual-pool-cost metrics, final metrics, calibration scores and exposed
aggregate/gate fields were checked without calling the production evaluator.

## Actual aggregate findings

The primary population retains all **82/82** evaluation candidates. Nine of its
20 assigned panels have incomplete truth; it has 11 truth-complete panels,
including eight feasible and three infeasible panels. Its calibration has five
unknown scores among the original 20 panels. The primary premise is unsupported,
there is no operational quantile, and all 20 nonempty primary pools are full.

The predefined complete-record secondary population contains **55** candidates;
all **55/55** are retained. Its 20 assigned evaluation panels comprise six empty,
five nonempty infeasible and nine feasible panels. Its 20 complete calibration
scores have six values equal to one, so the 19th order statistic is **1** at
alpha **1/10**. The secondary result remains conditional on an assumed, unverified
sampling premise. The reduction from 82 original rows to 55 secondary rows is
the predefined complete-record restriction, not successful engine screening.

On the nine feasible secondary panels, all-tied-optimum pool recall is **9/9**,
but mean retained fraction is **1**, above the frozen **3/4** limit. There are
only **9** discovery panels, below the required **10**. At the frozen ranking
comparison, primary hits are **7/9**, processing **8/9**, objective-only **7/9**,
and the 20 random controls total **147/180 = 49/60**. The primary-minus-random
rate is **-7/180**, not the required positive 1/10 margin. The primary ranker
neither strictly beats processing nor strictly beats objective-only ranking.

The signed gate margins are adequacy **-1**, pool recall **9**, pool size **-9**,
random advantage **-25**, processing advantage **-1**, objective-only advantage
**0**. Thus adequacy, pool size and all three ranking comparisons fail. Recall,
finite-secondary status and complete execution pass. The conjunction correctly
returns **NO_GO_ARCHIVAL_USEFULNESS**. No negative gate or unknown denominator
was removed to reach this conclusion.

Each attempt records 143 development, 89 calibration and 82 evaluation unique
bundles, totaling the original 314 cohort rows. Its 960 schedules charge **3,288**
policy bundle requests. These are logical access counts, not a claim of 3,288
independent measurements or distinct scientific records.

## Reproduction and limits

All eight referenced stage scientific identities and the public scientific
identity agree. For the ten artifacts independently opened by this audit, all
nine comparable scientific identities agree; attempt-result has no scientific
seal and is correctly reported as null. All ten full-file byte identities differ.
Resource and wrapper differences are preserved rather than mistaken for changed
scientific arithmetic. Reproduction is not an independent statistical sample.

The parent separately authenticated both successful terminals, their exact v2
registration and complete persisted evidence graphs. This audit independently
recomputed arithmetic from its fixed terminal allowlist. It did not open the raw
archive, private feature input, rank/input-freeze/allocation files or registry,
and did not fit, launch, redraw, retune, alter source, or modify attempt artifacts.
Source parsing and supplied non-primary order generation remain separately
authenticated inputs; there is no physical-validity or exchangeability claim.

The adjacent `publication-allowlist.json` distinguishes aggregate-only candidate
files from private command/handoff evidence. Nothing here installs a resource or
publishes the result. Root and the publication reviewer retain that boundary.
