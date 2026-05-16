# glim-think Observability & Evaluation — Architecture Decision + Weekend Log

> Owner: Claude (autonomous weekend effort, starting 2026-05-16).
> This supersedes the ad-hoc parts of `PHOENIX.md`. Read this first.

## Operations — repeatable runs (read this to operate it)

**The loop, hourly, hands-off:**
1. `*/...` research crons + `research-orchestrator` (cron `0 * * * *`) drive
   real agent traffic → spans → exporter (OpenInference projection) → GCP
   relay → Phoenix `glim-think`.
2. `Glim Think Phoenix Evals` workflow (cron `0 * * * *`): seeds a
   deterministic span via `GET /ops/llm-selftest` (so a quiet hour still has
   signal), runs `evals/run-evals.ts` (REST — combo + LLM evaluators, writes
   annotations back), then `verify-openinference.ts` as a health signal.

**Infrastructure as code (no hand-deployed artifacts):**
| Component | Workflow | Trigger |
|-----------|----------|---------|
| Worker | `deploy-glim-think.yml` | push `glim-think/**` |
| OTLP relay (Cloud Run) | `deploy-otlp-relay.yml` | push `glim-think/otlp-relay/**` or manual |
| Hourly evals | `glim-think-evals.yml` | cron `0 * * * *` |

**Secrets (GitHub repo secrets — all set 2026-05-16):**
`PHOENIX_API_KEY`, `PHOENIX_COLLECTOR_ENDPOINT`, `PHOENIX_OTLP_URL`,
`PHOENIX_RELAY_URL`, `PHOENIX_RELAY_TOKEN`, `INTERNAL_TASK_TOKEN`,
`OPENAI_API_KEY`, `GCP_*`.
**Worker wrangler secrets (persist across `wrangler deploy`; only lost if the
Worker is recreated — then re-run `wrangler secret put` for each):**
`PHOENIX_COLLECTOR_ENDPOINT`, `PHOENIX_API_KEY`, `PHOENIX_RELAY_URL`,
`PHOENIX_RELAY_TOKEN`, `INTERNAL_TASK_TOKEN`.

**Health checks (manual):**
- `GET /ops/phoenix-selftest` — secrets resolve? OTLP endpoint reachable?
- `GET /ops/llm-selftest` — emit one real LLM span on demand.
- `cd evals && npx tsx verify-openinference.ts [--since=ISO]` — is projection
  landing as `span_kind=LLM` in Phoenix? (exit 1 = broken / no LLM traffic).

**Recovery:**
- No spans in Phoenix → `/ops/phoenix-selftest`; if relay 5xx, re-run
  `deploy-otlp-relay.yml`.
- Spans in `default` not `glim-think` → projection (resource attr) regressed —
  see exporter in `src/telemetry/phoenix.ts`.
- `queueHandler` ERROR → agent stub naming / Access bypass regressed; see the
  queue-repair commit + `getAgentByName` / `INTERNAL_TASK_TOKEN`.

## TL;DR of the diagnosis

The first pass failed for **three independent reasons**, all now understood:

1. **Eval workflow crash** (the hourly error log): `glim-think-evals.yml` never forwarded
   `PHOENIX_COLLECTOR_ENDPOINT`; the repo secret didn't exist. — **FIXED** `c7cc4e3`.
2. **Worker exported nothing**: the deployed Worker `glim-think-v1` had zero Phoenix
   secrets, so `phoenixConfig` always fell back to the no-op `localhost` exporter and
   silently dropped every span. — **FIXED** (wrangler secrets set 2026-05-16).
3. **No OpenInference projection** (the real architectural gap): AI SDK
   `experimental_telemetry` emits Vercel's own OTel attributes (`ai.prompt`,
   `ai.response.text`, …). Phoenix's UI and eval libraries key off **OpenInference**
   semantic conventions (`openinference.span.kind`, `input.value`/`output.value`,
   `llm.model_name`, `llm.token_count.*`). `@arizeai/openinference-semantic-conventions`
   was a dependency but **imported nowhere**. So even with traces flowing, spans don't
   classify as LLM spans and the eval runner falls back to brittle string-matching.

## Why the first pass got stuck (the architecture question)

The documented OpenInference path is:

```
registerOTel({ spanProcessors: [ new OpenInferenceSimpleSpanProcessor({ exporter }) ] })
```

That requires a `NodeTracerProvider` / `@vercel/otel` with a `spanProcessors` array.
**`@microlabs/otel-cf-workers` (the Workers-native OTel SDK this project uses) does not
expose `spanProcessors`** — its `ResolveConfigFn`/`TraceConfig` exposes only an
`exporter`, a `sampler`, and a **`postProcessor`** hook. The first pass hit that wall,
hand-rolled a custom protobuf exporter (legitimately needed — Phoenix Cloud 400s without
a `User-Agent`), invented ad-hoc attribute names, and never closed the OpenInference gap.

## Decision: in-Worker projection via `postProcessor` (no new infra)

`@microlabs/otel-cf-workers` `TraceConfig.postProcessor` is documented as *"called just
before exporting the spans and allows you to make any changes to the spans before
sending."* That is the Workers-native equivalent of an OTel SpanProcessor's `onEnd`.

`@arizeai/openinference-vercel` exports the projection logic as reusable functions —
not locked inside the SpanProcessor class:

- `addOpenInferenceAttributesToSpan(span: ReadableSpan): void` — mutates a span,
  adding OpenInference attributes and stripping streaming events.
- `safelyGetOpenInferenceAttributes(attributes): Attributes | null` — pure mapping.
- `isOpenInferenceSpan(span): boolean` — classification predicate.

**Architecture:** keep `instrument(handler, phoenixConfig)`. Add a `postProcessor` that
runs `addOpenInferenceAttributesToSpan` over every span before the custom Phoenix
exporter serializes it. This is exactly what `OpenInferenceSimpleSpanProcessor` does,
adapted to the hook the Workers SDK actually gives us. No Node sidecar, no off-Worker
collector, no second canvas — fully in the existing Workers deploy.

Version alignment caveat from Arize docs (`@opentelemetry/api` must match the version
`ai` resolves) is **already satisfied**: `@opentelemetry/api@1.9.1` is fully deduped and
satisfies `ai`'s `^1.9.0`.

## Plan (full professional harness — user mandate: "spend what's needed")

- [x] T1 Settle architecture (this doc)
- [x] T2 Inventory current telemetry/eval code
- [ ] T3 OpenInference projection + hardened export
      - add `@arizeai/openinference-vercel`; `postProcessor` projection;
        keep ad-hoc domain attrs as supplementary, not primary;
        harden exporter (retry/size guard); preserve gen_ai.* gateway spans
- [ ] T4 Evaluator suite: offline golden dataset + online eval on correctly-classified
      spans + regression tracking + Phoenix dashboards/docs
- [ ] T5 End-to-end verification on real traffic; make Phoenix secrets reproducible in
      deploy; finalize docs

## ✅ RESOLVED (2026-05-16) — end-to-end working

Telemetry now flows end to end, verified in Phoenix Cloud:
`ai.generateText.doGenerate` → **`span_kind=LLM`** with `input.value`,
`output.value`, `llm.model_name`, `llm.token_count.*`, `llm.input_messages.*`;
`ai.generateText` → `span_kind=AGENT`. Spans land in the **glim-think**
project. Chain: Worker → OpenInference projection (inside the exporter) →
**GCP Cloud Run relay** → Phoenix Cloud.

Five distinct bugs, all fixed:
1. Eval workflow missing `PHOENIX_COLLECTOR_ENDPOINT` secret.
2. Worker had zero Phoenix wrangler secrets (no-op exporter).
3. Phoenix WAF 302→/login for custom `User-Agent`; fixed to the standard
   `OTel-OTLP-Exporter-JavaScript/0.200.0` (WAF-allowed, accurate).
4. **Cloudflare black-holes Worker→Phoenix-Cloud OTLP** (fake `200
   server:cloudflare`); fixed with a **GCP Cloud Run egress relay**
   (`glim-otlp-relay`, `otlp-relay/`). curl/GCP origin ingests fine.
5. otel-cf-workers rc.52 **silently ignores `postProcessor`** (dropped in
   parseConfig). OpenInference projection + the `openinference.project.name`
   resource attribute (Phoenix routes by it, NOT `service.name` — else
   everything lands in `default`) now run **inside the exporter's
   `export()`**, which is always invoked.

Plus hardening: exporter uses `redirect:"manual"`, treats 3xx/non-2xx as loud
failures + bounded retry; fixed a refactor bug that dropped the request body;
copy serialized protobuf into a contiguous buffer (Workers drops Uint8Array
views). Permanent diagnostics: `GET /ops/phoenix-selftest`,
`GET /ops/llm-selftest`.

Known separate issue (pre-existing, not telemetry): `/research/round` jobs
stuck `pending attempts=4` — blocks domain/LLM spans from the research loop
(LLM verification used `/ops/llm-selftest` instead).

## ⚠ (HISTORICAL) BLOCKER — now resolved, kept for context

End-to-end is blocked on the OTLP **ingest endpoint/auth**, not on code. Proven:

- `PHOENIX_API_KEY` is valid: `GET …/s/alexwelcing/v1/projects` + `Authorization:
  Bearer <key>` → **200 JSON** (from curl AND from the Worker code path).
- The correct OTLP target is reachable+authed **from curl**:
  `POST https://app.phoenix.arize.com/s/alexwelcing/v1/traces` + `Authorization:
  Bearer <key>` + a real body → **422 "Request body is invalid
  ExportTraceServiceRequest"** (422 = authed; a valid protobuf would be 200).
- **But the same request from the Cloudflare Worker → `302 → /login`** for every
  auth variant (bearer / api_key / both), non-empty body included. curl's
  `api_key` gets a clean app-layer `401 "Invalid token"`; the Worker's gets an
  edge-layer `302 /login` — i.e. Worker traffic to `app.phoenix.arize.com` is
  intercepted *before* Phoenix's auth (Cloudflare Access / WAF / wrong host).
- Old exporter followed that 302 → 200 HTML login page → `response.ok` → spans
  silently dropped. **Fixed**: exporter now uses `redirect:"manual"` and treats
  3xx as a hard, logged failure (`src/telemetry/phoenix.ts`).

**What I need from Phoenix Cloud Settings (you):** the exact value of the
**"Collector Endpoint" / "Hostname"** field shown on your Phoenix space Settings
page (it may be a *dedicated* OTLP host distinct from the `app.` UI host), and
whether the space has **Cloudflare Access / SSO** protection enabled. Diagnostic
endpoint live: `GET /ops/phoenix-selftest` (public, no secrets leaked).

## Progress log

- 2026-05-16 — Fixed eval-workflow secret + Worker secrets. Full code inventory +
  architecture research; decision recorded. T3 implemented (OpenInference
  `postProcessor` projection + hardened/retrying exporter). Deployed. Discovered
  the deeper blocker: zero spans ever reached Phoenix because the OTLP endpoint
  302-redirects Worker traffic to /login and the old exporter swallowed it.
  Added `/ops/phoenix-selftest` (permanent ops diagnostic). Exporter hardened to
  fail loudly on redirects. Eval-runner span classification migrated to
  OpenInference conventions; `@arizeai/phoenix-client getSpans` found broken
  against space-scoped URLs (REST migration in progress, T4). Blocked on the
  ingest-endpoint question above; continuing all unblocked work meanwhile.
