# Phoenix Evals in Action — glim-think Research Agents

> A case study: how Phoenix observability + LLM-as-judge evaluation found
> five silent failures in a production Cloudflare-Workers research agent and
> turned a black box into a measurable, self-correcting research process.
> Engineering log of record: [`../OBSERVABILITY.md`](../OBSERVABILITY.md).

## 1. The system

`glim-think` is an autonomous materials-science research swarm (Orchestrator,
Manifold, Causal, Theorist, Experiment agents) running on Cloudflare Workers +
Durable Objects. It forms hypotheses, screens interatomic-potential error
manifolds against NIST reference data, and iterates. The agents call LLMs via
the Vercel AI SDK; correctness is not visually obvious, so **trust depends on
evaluation, not inspection**.

The goal: instrument every LLM/research step with OpenTelemetry, ship traces
to **Phoenix Cloud**, and run LLM-as-judge + code evaluators that feed back
into the agents' behavior.

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
query, not by a green unit test.

## 3. The architecture that works

```
Vercel AI SDK span (experimental_telemetry)
   │  ai.prompt / ai.response.text  (Vercel conventions)
   ▼
PhoenixProtobufExporter.export()              [src/telemetry/phoenix.ts]
   │  • OpenInference projection (addOpenInferenceAttributesToSpan)
   │      → openinference.span.kind, input.value, output.value,
   │        llm.model_name, llm.token_count.*, llm.input_messages.*
   │  • inject openinference.project.name = "glim-think" (resource)
   │  • manual-redirect + loud 3xx/non-2xx failures + bounded retry
   ▼
GCP Cloud Run relay  [otlp-relay/]  (bypasses Cloudflare edge black-hole)
   ▼
Phoenix Cloud → project "glim-think"
   │  spans classified span_kind = LLM / AGENT, full I/O + tokens + model
   ▼
Eval runner  [evals/run-evals.ts]  (Phoenix REST, not phoenix-client)
   • Phase 1 combo: code validation + LLM judge on domain spans
   • Phase 2 generic: completeness / hallucination / reasoning on LLM spans
   • writes annotations back → POST /v1/span_annotations
```

Verified in Phoenix: `ai.generateText.doGenerate` → `span_kind=LLM`,
`input.value`, `output.value`, `llm.model_name=MiniMax-M2.7`,
`llm.token_count.total=119`, `llm.input_messages.0.message.role=user`;
`ai.generateText` → `span_kind=AGENT`.

Permanent verification surface (no secrets leaked):
`GET /ops/phoenix-selftest`, `GET /ops/llm-selftest`, and the CI-gateable
`evals/verify-openinference.ts`.

## 4. How this improves the researchers' process

| Capability | Mechanism | Effect on research quality |
|------------|-----------|----------------------------|
| Hallucination / reasoning / completeness scoring | Phase-2 LLM judges on every agent LLM span | Surfaces unsupported causal claims and over-confident hedging-free conclusions |
| Domain validity (combo) | Code checks (Simpson's-paradox sign, eigenvalue/PR bounds, CI consistency) + LLM judge | Catches statistically invalid manifold/causal verdicts before they enter the hypothesis ledger |
| Inline self-correction | `agents/base.ts` retries synthesis when its self-eval score is low; annotations pushed to Phoenix | Bad outputs are regenerated, not published |
| Golden datasets | `glim-benchmark` (382), `glim-research-qa` (444), `glim-experiment-design` (37) from NIST IPR | Offline regression baseline — detects quality drift across model/prompt changes |
| Low-score triage | `/admin/phoenix/low-scores`, `/admin/evals/trend` | Failure patterns become an actionable backlog, not anecdotes |

The loop: **trace → eval → annotation → (retry now / trend later) →
prompt & criteria tuning → re-measure against the golden datasets.**

### 4a. Worked example — the loop closing on a real defect

Once the agent Durable Objects were OTel-instrumented (`instrumentDO`; the
main `instrument()` wrapper does not reach DO isolates, so the richest
research spans were silently dropped), the eval harness ran against genuine
`Manifold.runAnalysis` output and immediately flagged a problem:

| Evaluator | Before | After fix |
|-----------|-------:|----------:|
| `manifold_quality` | **0.39** (code 0.60 / llm 0.07) | **0.62** (code 0.80 / llm 0.35) |
| `queue_health` | 0.92 | 1.00 |
| `json_schema_validity` | 0.71 | 0.83 |

Root cause the score exposed: `Manifold.runAnalysis` **cache hits returned a
stripped `{ok,cached,claim_id,pr}`** — the eigenvalue spectrum, dimensionality
and data-sufficiency were dropped. That silently degraded not just evaluation
but **downstream Causal/Theorist reasoning**, which consumes the manifold
result. Fix: rehydrate the full scientific payload from the persisted claim on
cache hit. Re-measuring showed an immediate, attributable jump (+59% on
`manifold_quality`, code checks 0.60→0.80). This is the entire thesis in one
artifact: a correctness regression invisible to builds and the UI, caught by
an eval score, root-caused from the trace, fixed, and re-measured.

## 5. Reproducing / operating

- Generate a trace on demand: `GET /ops/llm-selftest`
- Confirm projection reached Phoenix: `cd evals && npx tsx verify-openinference.ts --since=<ISO>`
- Run the full eval pass: `cd evals && npx tsx run-evals.ts`
- Rebuild golden datasets: `cd evals && npx tsx build-dataset.ts`
- Relay: Cloud Run `glim-otlp-relay` (project `shed-489901`); Worker reaches
  it via `PHOENIX_RELAY_URL` + `PHOENIX_RELAY_TOKEN` secrets.

## 6. Open follow-ups

- Persist offline eval pass-rates to D1 for first-class regression alerting
  (trend endpoints exist; wire run-evals → store).
- Feed low-scoring failure clusters back into agent prompts/criteria and
  measure the delta on the golden datasets (the explicit "close the loop"
  step — design in place, automation pending).
- Make the relay deploy reproducible via GitHub Actions (Workload Identity,
  consistent with `deploy-glim-think.yml`).
- Pre-existing, unrelated: `/research/round` jobs stall `pending attempts=4`
  — blocks domain spans from the research loop (selftest used meanwhile).
