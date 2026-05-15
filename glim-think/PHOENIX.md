# Phoenix Cloud Integration

## What changed

This branch adds [Phoenix Cloud](https://phoenix.arize.com) observability and evaluation support to glim-think without breaking the Cloudflare Workers runtime.

## Architecture

| Layer | Before | After |
|-------|--------|-------|
| Tracing | Custom D1/KV logs only | OpenTelemetry → Phoenix Cloud |
| AI SDK calls | No telemetry | `experimental_telemetry` on every `generateText`/`streamText` |
| Legacy gateway | Raw fetch | Wrapped in OTel spans with `gen_ai.*` attributes |
| Evaluations | None | Client-side eval runner (`evals/`) + server-side Phoenix evals |

## Why not the suggested npm packages?

The packages you listed assume a Node.js runtime:

- `@arizeai/phoenix-otel` → depends on `@opentelemetry/sdk-trace-node`
- `@arizeai/openinference-instrumentation-openai` → instruments the `openai` Node SDK (we use `@ai-sdk/openai-compatible` + raw fetch)
- `openai` → not used in glim-think

Instead we use `@microlabs/otel-cf-workers`, a Workers-compatible OpenTelemetry SDK that exports traces via `fetch()`.

## Environment variables

Set these as Wrangler secrets (or in `.dev.vars` for local dev):

```bash
wrangler secret put PHOENIX_COLLECTOR_ENDPOINT
# Value: https://app.phoenix.arize.com/s/<your-space>/v1/traces

wrangler secret put PHOENIX_API_KEY
# Value: your Phoenix API key
```

If the vars are unset, the Worker starts normally and traces go to a no-op endpoint.

## Files modified

- `src/telemetry/phoenix.ts` — new: Phoenix OTLP exporter config
- `src/types.ts` — added `PHOENIX_COLLECTOR_ENDPOINT` and `PHOENIX_API_KEY` to `Env`
- `src/server.ts` — wrapped default handler with `instrument()` from `@microlabs/otel-cf-workers`
- `src/agents/base.ts` — added `experimental_telemetry` to agent synthesis
- `src/agents/models.ts` — added `experimental_telemetry` to health-check probe
- `src/research/insights.ts` — added `experimental_telemetry` to paper comprehension & reasoning
- `src/admin/diag.ts` — added `experimental_telemetry` to diagnostic generateText/streamText calls
- `src/gateway/providers.ts` — wrapped every legacy provider (`complete()`) in manual OTel spans

## Evaluations

### Option 1: Phoenix server-side evals (recommended)

Once traces are flowing into Phoenix Cloud, you can create evaluators directly in the Phoenix UI:

1. Go to **Datasets & Experiments** → **Evaluators**
2. Create an LLM-as-a-judge evaluator (e.g., "completeness", "correctness")
3. Attach it to your project — it will automatically score incoming traces

### Option 2: Client-side eval runner

Run the Node.js eval script outside the Worker:

```bash
cd evals
npm install
PHOENIX_API_KEY=xxx PHOENIX_PROJECT_NAME=glim-think npx tsx run-evals.ts
```

This fetches recent LLM spans from Phoenix, runs an LLM-as-a-judge completeness eval, and pushes annotations back.

## Next steps

1. Create a Phoenix Cloud space and copy the endpoint + API key
2. `wrangler secret put` both values
3. Deploy (`wrangler deploy`)
4. Trigger a research run (e.g., `POST /research/round`) to generate traces
5. Open Phoenix Cloud → Traces to confirm data is flowing
6. Set up server-side evaluators for the metrics you care about
