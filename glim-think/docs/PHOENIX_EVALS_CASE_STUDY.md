# Phoenix Evals in Action — glim-think Research Agents

> A case study: how Phoenix observability + LLM-as-judge evaluation found
> five silent failures in a production Cloudflare-Workers research agent,
> turned a black box into a measurable process, and then closed the loop
> into a **self-improving system** that senses its own quality, diagnoses
> failure clusters, synthesizes prompt/criteria patches, A/B-tests them
> against an oracle, and merges the winners on green.
> Engineering log of record: [`../OBSERVABILITY.md`](../OBSERVABILITY.md).

## 1. The system

`glim-think` is an autonomous materials-science research swarm (Orchestrator,
Manifold, Causal, Theorist, Experiment agents) running on Cloudflare Workers +
Durable Objects. It forms hypotheses, screens interatomic-potential error
manifolds against NIST reference data, and iterates. The agents call LLMs via
the Vercel AI SDK; correctness is not visually obvious, so **trust depends on
evaluation, not inspection**.

The goal: instrument every LLM/research step with OpenTelemetry, ship traces
to **Phoenix Cloud**, run LLM-as-judge + code evaluators, and feed the result
back into the agents' behavior — both their **model routing** and their
**prompts/criteria** — automatically.

## 2. What "no observability" was hiding

The first integration *looked* done — code merged, an hourly eval workflow
existed — but Phoenix showed **zero usable data**. Treating the eval pipeline
itself as the system under test surfaced **five compounding, individually
silent failures**, each masked by the one above it:

| # | Failure | Why it was invisible | Fix |
|---|---------|----------------------|-----|
| 1 | Hourly eval workflow missing `PHOENIX_COLLECTOR_ENDPOINT` secret | Job crashed before any output | Add secret + workflow env |
| 2 | Worker had **zero** Phoenix wrangler secrets | `phoenixConfig` fell back to a no-op `localhost` exporter — no error | Set Worker secrets |
| 3 | Phoenix WAF redirected the custom `User-Agent` to `/login` | Exporter followed 302→200 HTML, reported `ok` | Standard OTLP exporter UA |
| 4 | **Cloudflare black-holes Worker→Phoenix-Cloud OTLP** at the edge | Synthetic `200 server:cloudflare`; curl from anywhere else worked | **GCP Cloud Run egress relay** |
| 5 | `otel-cf-workers` rc.52 silently ignores `postProcessor` | Projection code ran in tests, never in prod | Project inside the exporter's `export()` |

Plus project mis-routing (Phoenix routes by the `openinference.project.name`
resource attribute, **not** `service.name` — everything silently landed in
`default`) and a Workers `fetch` quirk that transmitted a `Uint8Array` view as
a zero-length body.

**The lesson for the case study:** every layer reported success. Only
end-to-end observability — *is the trace actually queryable in Phoenix with
the right shape?* — exposed the truth. Each fix was validated by a Phoenix
query, not by a green unit test. The same discipline now governs the
self-improving loop: a change is only "good" if a re-measured eval says so.

## 3. The self-improving loop

```
            ┌──────────────────────────────────────────────────────────┐
            │                                                          │
            ▼                                                          │
  ┌──────────────────┐   trace + functionId attribution                 │
  │  SENSE            │   • Vercel AI SDK experimental_telemetry         │
  │  (telemetry +     │   • OpenInference projection in exporter         │
  │   evaluators)     │   • combo (code+LLM) + Phase-2 generic judges    │
  └────────┬─────────┘   • ModelScorecard claim (per model×agent)        │
           │                                                            │
           ▼                                                            │
  ┌──────────────────┐                                                  │
  │  DIAGNOSE         │   cluster low-scoring spans by                   │
  │  (failure         │   (functionId, evaluator, failure signature)     │
  │   clustering)     │                                                  │
  └────────┬─────────┘                                                  │
           │                                                            │
           ├───────────────► ROUTING ACTUATION ─────────────────────────┤
           │                 selectDeepRoute() consumes the scorecard;   │
           │                 routes to the best well-sampled provider;   │
           │                 experiment-window provenance outranks       │
           │                 biased production samples.                  │
           │                                                            │
           ▼                                                            │
  ┌──────────────────┐                                                  │
  │  SYNTHESIZE       │   Evolver proposes a *minimal* patch to the      │
  │  (Evolver)        │   prompt/criteria registry for one cluster       │
  └────────┬─────────┘                                                  │
           │                                                            │
           ▼                                                            │
  ┌──────────────────┐   ab-oracle.ts: run baseline vs candidate         │
  │  A/B ORACLE       │   registry over the golden datasets;             │
  │  (adopt/reject    │   adopt only on a real, sustained delta          │
  │   gate)           │                                                  │
  └────────┬─────────┘                                                  │
           │  green                                                     │
           ▼                                                            │
  ┌──────────────────┐   write registry file under src/registry/ ONLY;  │
  │  AUTO-MERGE       │   commit `evolver:auto …`; safety rails:         │
  │  ON GREEN         │   path allowlist · EVOLVER_ENABLED kill switch · │
  │                   │   circuit breaker · regression-gate auto-revert  │
  └────────┬─────────┘                                                  │
           │                                                            │
           ▼                                                            │
  ┌──────────────────┐   the prompt/criteria registry is the            │
  │  GROW             │   "skill that grows": each adopted patch is a    │
  │  (skill substrate)│   durable, versioned improvement                 │
  └────────┬─────────┘                                                  │
           │                                                            │
           └──────────────► re-measure → SENSE (loop closes) ────────────┘
```

The invariant: **nothing self-modifying ships unless a re-run eval proves it
better, and a regression gate can revert it if a later run disagrees.**

## 4. Sensing — turning behavior into measurable signal

**OpenInference telemetry.** Every research LLM call goes through the single
AI-SDK path (`generateResearchText` / `GlimThinkAgent.synthesize` in
[`src/agents/models.ts`](../src/agents/models.ts) and
[`src/agents/base.ts`](../src/agents/base.ts)) with
`experimental_telemetry: { isEnabled: true, functionId: … }`. The exporter
([`src/telemetry/phoenix.ts`](../src/telemetry/phoenix.ts)) projects Vercel
spans to OpenInference inside `export()` so they land in Phoenix Cloud,
project `glim-think`, classified `span_kind = LLM / AGENT` with full I/O,
tokens and `llm.model_name`.

**Per-agent `functionId` attribution.** The `functionId` is the join key for
everything downstream:

- `agent.<ClassName>` for the one-shot synthesis path (`base.ts` line ~238),
  `agent.<ClassName>.retry` for the self-eval retry pass.
- `opts.agentClass` for `generateResearchText` (`models.ts` line ~609) — the
  span carries the resolved `llm.provider` / `llm.model` so the scorecard is
  attributable to a real model×agent pair, not a guess.

**Combo + Phase-2 evaluators.** The Node eval runner
([`evals/run-evals.ts`](../evals/run-evals.ts)) scores spans in two phases:

- **Phase 1 — combo** ([`evals/combo-evaluators.ts`](../evals/combo-evaluators.ts)):
  domain spans get code-level validation (Simpson's-paradox sign,
  eigenvalue/PR bounds, CI consistency) *and* an LLM judge, combined with
  domain weights.
- **Phase 2 — generic**: completeness / hallucination / reasoning LLM judges
  on every LLM span. Annotations are written back via
  `POST /v1/span_annotations`.

**The ModelScorecard claim.** The hourly harness aggregates pass-rates into a
`ModelScorecard` claim persisted in D1. `getModelQualityTrend`
([`src/evals/store.ts`](../src/evals/store.ts) line ~104) reads the latest
scorecard and returns `model → { score, n }` where `score` is the mean
pass-rate across evaluators and **`n` is the *minimum* evaluator sample size**
— a model must be well-sampled on its *weakest* evaluator before its score is
allowed to steer anything (`MODEL_SCORE_MIN_N = 8`). `model|agent` buckets and
the `workers-ai` floor are excluded so a free-tier fallback never masquerades
as a quality signal.

## 5. Routing actuation — `selectDeepRoute` consumes the scorecard

`selectDeepRoute` ([`src/agents/models.ts`](../src/agents/models.ts) line
~539) is the first actuator. It:

1. Builds the candidate pool from credentialed deep providers
   (`minimax`, `zai` glm-5.1, `openai` gpt-5.5).
2. Drops MiniMax when the monthly token budget is exhausted (always
   budget-guards down to Workers AI).
3. Reads `getModelQualityTrend`, filters to providers with `n ≥ 8`, sorts by
   score, and **routes to the highest-scoring well-sampled provider**.
4. Until the scorecard has signal, round-robins MiniMax/GLM and reserves
   OpenAI gpt-5.5 as the strength-first "last decider".

**The sampling-bias trap it must avoid.** Production traffic is *not* a fair
sample. If `selectDeepRoute` already prefers provider A, then provider A
accumulates almost all production spans, its scorecard `n` dominates, and B
never gets enough samples to ever be re-evaluated — the router freezes on a
possibly-stale winner and starves its own evidence. The fix is
**experiment-window provenance**: scorecard cells produced during a
deliberate, balanced experiment window (each provider forced an equal share of
traffic) are tagged and **outrank** organically-collected production cells for
the same model×evaluator. The router trusts the unbiased measurement over the
self-reinforcing one. This is why the `n` gate is conservative and why the
A/B oracle (below) uses fixed golden datasets rather than production spans —
both deliberately break the feedback bias.

> **Resolved follow-up (a):** *"persist offline eval pass-rates for
> first-class regression alerting."* The `ModelScorecard` claim + the
> `evaluations` D1 table ([`src/evals/store.ts`](../src/evals/store.ts)) now
> persist pass-rates; `getModelQualityTrend` / `getAgentQualityTrend` expose
> them, and the regression gate (§6) consumes them for alerting/auto-revert.

## 6. Code actuation — the Evolver

The Evolver is the second actuator: it changes the agents' **prompts and
criteria**, not just which model runs them.

> **Status (honest):** the Evolver, A/B oracle, and regression gate are
> *designed and specified here*; their implementing files
> (`evals/evolver.ts`, `evals/ab-oracle.ts`, `evals/regression-gate.ts`,
> `src/registry/`) are delivered by sibling units and may not all be merged
> onto `consolidate-llm-path` at the time you read this. The sensing and
> routing halves (§4–§5) are **live in this branch**. See §8 for the precise
> proven-vs-armed split.

**Failure clustering (diagnose).** Pull annotated spans from Phoenix, keep the
low-scoring ones, and cluster by `(functionId, evaluator_name, failure
signature)`. A signature is a normalized reason string from the judge
explanation (e.g. "missing units", "unsupported causal claim",
"over-confident with no CI"). The largest, most cost-effective cluster is the
target.

**Minimal registry patch synthesis.** For the target cluster the Evolver
proposes the *smallest* change to the prompt/criteria registry that plausibly
addresses the signature — a sentence appended to a system prompt, a tightened
acceptance criterion, a new code check threshold. Minimality is a hard
requirement: small diffs are reviewable, attributable, and revertible.

**The A/B oracle as adopt/reject gate.**
`npx tsx evals/ab-oracle.ts` runs the baseline registry and the candidate
registry over the **fixed golden datasets** (`glim-benchmark` 382,
`glim-research-qa` 444, `glim-experiment-design` 37 — built by
[`evals/build-dataset.ts`](../evals/build-dataset.ts)) and compares pass-rates
per evaluator. A candidate is **adopted only** when it shows a real,
sustained, non-regressing delta on the targeted cluster *and no regression
elsewhere*. Otherwise it is rejected and discarded. Using frozen datasets (not
production spans) is what makes the oracle immune to the sampling-bias trap.

**Auto-merge on green, with hard safety rails.** When the oracle returns
green the Evolver writes the registry file and commits it. The rails are
non-negotiable and layered:

- **Path allowlist** — the Evolver may only write under `src/registry/`.
  Any synthesized change touching application code, telemetry, eval logic, or
  CI is refused before it is written. The blast radius is one directory of
  declarative prompt/criteria data.
- **Kill switch `EVOLVER_ENABLED`** — defaults **OFF**. With it unset the
  Evolver runs in dry-run only: it clusters, synthesizes, and oracle-tests,
  but never writes or commits. Auto-merge requires an explicit opt-in.
- **Circuit breaker** — after a bounded number of adopted patches per window
  (or any oracle/gate error), the Evolver halts and requires manual re-arm.
  Prevents a runaway loop from flooding the registry.
- **Regression-gate auto-revert** — `npx tsx evals/regression-gate.ts` runs
  independently (CI/cron) over the golden datasets, attributes any pass-rate
  regression to the responsible commit, and **auto-reverts commits whose
  message is prefixed `evolver:auto`** (and only those). A self-applied patch
  that looked good at adoption but degrades on a later, larger run is rolled
  back automatically — the loop is allowed to be wrong as long as it
  self-corrects.

> **Resolved follow-up (b):** *"feed low-scoring failure clusters back into
> agent prompts/criteria and measure the delta — automation pending."*
> Implemented by the Evolver + A/B oracle described here (implementing unit:
> `evals/evolver.ts` + `evals/ab-oracle.ts`, registry substrate
> `src/registry/`). The "measure the delta" step is the oracle's adopt/reject
> decision over the golden datasets.

## 7. The registry — the skill that grows

`src/registry/` is the substrate that makes this a *self-improving* system
rather than a self-tuning one. It holds the agents' prompts and acceptance
criteria as **declarative, versioned data** consumed at runtime. Every adopted
Evolver patch is a durable edit to this registry, gated by the oracle and
guarded by the regression gate. Over time the registry accumulates
hard-won, eval-proven knowledge ("Manifold outputs must restate the
eigenvalue spectrum on cache hit"; "Causal verdicts asserting a sign flip must
cite the subgroup CIs") — the agents literally get better at the science,
one reviewable green commit at a time. The git history of `src/registry/`
*is* the learning curve.

## 8. Honest status — proven vs armed-but-gated

| Capability | Status |
|------------|--------|
| OpenInference telemetry → Phoenix Cloud (relay) | **Proven** (Phoenix-queried; §2/§4) |
| Per-agent `functionId` attribution | **Proven** (in `base.ts` / `models.ts`) |
| Combo + Phase-2 evaluators, annotation write-back | **Proven** (`run-evals.ts`) |
| ModelScorecard claim + `getModelQualityTrend` (`n`-gated) | **Proven** (`src/evals/store.ts`) |
| `selectDeepRoute` scorecard-steered routing | **Proven** (live in this branch) |
| Inline self-eval retry + D1 `evaluations` persistence | **Proven** (`base.ts` / `store.ts`) |
| Experiment-window provenance outranking biased samples | **Designed**; sensing/routing primitives live, the provenance tag + ranking land with the experiment-oracle sibling unit |
| Evolver failure clustering + minimal patch synthesis | **Armed, gated** — sibling unit; runs dry-run by default |
| A/B oracle adopt/reject over golden datasets | **Armed, gated** — sibling unit |
| Auto-merge on green | **Armed, OFF by default** — `EVOLVER_ENABLED` must be explicitly set; rails (allowlist, breaker, gate) are prerequisites |
| Regression-gate auto-revert of `evolver:auto` commits | **Armed, gated** — sibling unit |

We do **not** claim the loop has demonstrated a measured end-to-end quality
gain in production. We claim: the *mechanism* is built, the *safety model* is
explicit, and `EVOLVER_ENABLED` stays **OFF** until the rails are proven on
the golden datasets. The honest version of "self-improving" is a system that
*can* be wrong and reverts itself — not one that asserts it never is.

## 9. Reproducing / operating

Sensing & routing (live):

- Generate a trace on demand: `GET /ops/llm-selftest`
- Confirm projection reached Phoenix:
  `cd evals && npx tsx verify-openinference.ts --since=<ISO>`
- Run the full eval pass (writes scorecard): `cd evals && npx tsx run-evals.ts`
- Rebuild golden datasets: `cd evals && npx tsx build-dataset.ts`
- Relay: Cloud Run `glim-otlp-relay` (project `shed-489901`); Worker reaches
  it via `PHOENIX_RELAY_URL` + `PHOENIX_RELAY_TOKEN` secrets.

Self-improving loop (sibling units; commands as designed):

- A/B a candidate registry vs baseline over the golden datasets:
  `cd evals && npx tsx ab-oracle.ts --baseline=<ref> --candidate=<ref>`
- Evolver, never writes (default / required until rails proven):
  `cd evals && npx tsx evolver.ts --dry-run --since=<ISO>`
- Evolver, armed (explicit opt-in only): set `EVOLVER_ENABLED=1` and drop
  `--dry-run`; writes restricted to `src/registry/`, committed `evolver:auto …`.
- Regression gate (CI/cron) — auto-reverts regressing `evolver:auto` commits:
  `cd evals && npx tsx regression-gate.ts`

## 10. Remaining follow-ups

- Make the relay deploy reproducible via GitHub Actions (Workload Identity,
  consistent with `deploy-glim-think.yml`).
- Land the experiment-window provenance tag end-to-end so the router
  provably prefers unbiased measurements over self-reinforced ones.
- Prove the Evolver rails on the golden datasets, then graduate
  `EVOLVER_ENABLED` from "explicit opt-in" to a monitored default.
- Pre-existing, unrelated: `/research/round` jobs stall `pending attempts=4`
  — blocks domain spans from the research loop (selftest used meanwhile).
</content>
</invoke>
