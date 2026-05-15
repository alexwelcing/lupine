# Work Order: AI Gateway Model Router Refactor

**Assignee**: External agent team  
**Upstream dependency**: Telemetry team (Phoenix span instrumentation)  
**Integration checkpoint**: Must merge after upstream sets `model.gateway` span attribute contract  
**Deadline**: Self-scoped; target is a single PR that can be reviewed in one pass.

---

## 1. Context

`glim-think` is a Cloudflare Workers application with Durable Objects, D1, KV, R2, and Queues. It runs a multi-agent research pipeline (Orchestrator, Manifold, Causal, Theorist, Experiment, Literaturist, etc.).

All LLM calls route through `ModelRouter.complete(tier, prompt, opts)` in `src/gateway/router.ts`. Currently the router maintains 6+ provider SDK instances (Workers AI native, OpenAI, Anthropic, Gemini, Zhipu/ZAI, MiniMax, HuggingFace) with custom fallback chains, manual KV-based usage logging, and per-provider fetch logic.

We want to collapse this sprawl into **Cloudflare AI Gateway**, which provides a unified OpenAI-compatible endpoint, edge caching, rate limiting, and built-in analytics.

---

## 2. Current State (read-only reference)

### 2.1 Entry point

```ts
// src/gateway/router.ts
export class ModelRouter {
  async complete(
    tier: TaskTier,           // "ingestion" | "screening" | "hypothesis" | "experiment_design" | "code_review"
    prompt: string,
    opts?: ModelOpts & { agentClass?: string; qualityGate?: boolean }
  ): Promise<ModelResponse>;
}
```

`complete()` is called from ~15 locations across agents, server routes, and queue consumers. **You must preserve this signature exactly.**

### 2.2 Provider classes

All providers live in `src/gateway/providers.ts` and implement:

```ts
export interface Provider {
  name: string;
  complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse>;
}

export interface ModelResponse {
  text: string;
  provider: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
  latencyMs: number;
}

export interface ModelOpts {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

Current providers:
- `WorkersAIProvider` — uses `env.AI.run()` (Cloudflare native, zero egress)
- `OpenAIProvider` — fetch to `api.openai.com`
- `AnthropicProvider` — fetch to `api.anthropic.com`
- `GeminiProvider` — fetch to `generativelanguage.googleapis.com`
- `ZAIProvider` — fetch to `open.bigmodel.cn` (Zhipu, OpenAI-compatible)
- `MiniMaxProvider` — fetch to `api.minimax.chat` (OpenAI-compatible but with `base_resp` status wrapper)
- `HFProvider` — fetch to `api-inference.huggingface.co` (non-chat format, `inputs` field)

### 2.3 Fallback chains (current logic)

```ts
// Tier-optimized chains
ingestion/screening  → ["workers-ai"]
hypothesis           → ["zai", "minimax", "huggingface", "workers-ai"]
experiment_design    → ["minimax", "zai", "workers-ai"]
code_review          → ["zai", "minimax", "workers-ai"]

// Strength-first (escalation when agent quality is poor)
→ ["minimax", "zai", "huggingface", "workers-ai"]
```

Escalation is triggered when `getAgentQualityTrend(env, agentClass, 1)` returns `pass_rate < 0.6` and `count >= 3`.

### 2.4 Quality gate (intra-request fallback)

If `opts.qualityGate === true` and `agentClass` is provided, `runHeuristics(result.text)` runs after the first successful provider. Score `< 0.3` triggers fallback to the next provider in the chain.

### 2.5 Usage logging

`logUsage(provider, tier, result)` writes daily aggregate stats to KV (`env.CONFIG`) under key `usage:YYYY-MM-DD:{provider}:{tier}`.

### 2.6 OpenTelemetry spans

Every provider `complete()` wraps its work in a `gateway.{provider_name}` span with `gen_ai.system`, `gen_ai.request.model`, and `gen_ai.usage.*` attributes. **You must preserve this span emission.**

---

## 3. Target State

### 3.1 Unified endpoint

All model traffic routes through Cloudflare AI Gateway:

```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}
```

Gateway token: `<YOUR_GATEWAY_TOKEN>`

The Gateway supports:
- **Workers AI** via OpenAI-compatible API (`/v1/chat/completions` with `model: @cf/...`)
- **OpenAI** direct passthrough
- **Anthropic** via OpenAI-compatible translation
- **Google Gemini** via OpenAI-compatible translation
- **Zhipu, MiniMax, HuggingFace** — these are NOT natively supported by AI Gateway. You must either:
  - Keep direct provider fetches for them (hybrid mode), OR
  - Route them through Gateway's generic HTTP endpoint if available, OR
  - Drop them if Gateway coverage is sufficient (discuss with product owner before dropping)

**Recommendation**: Start with a hybrid — route OpenAI-compatible providers (OpenAI, ZAI, MiniMax, Workers AI) through Gateway, keep Anthropic/Gemini/HF direct if Gateway translation is flaky. Document which providers are Gateway-routed vs direct in a table.

### 3.2 Caching

Enable Gateway exact-match caching via headers:

```ts
// For deterministic / low-variance prompts (tier-1/screening)
headers: {
  "cf-aig-cache-ttl": "300",      // 5 minutes
}

// For creative / high-variance prompts (tier-3/experiment_design)
headers: {
  "cf-aig-cache-ttl": "0",        // disable cache
}
```

Map `tier → cache TTL`:
| Tier | TTL | Rationale |
|------|-----|-----------|
| `ingestion` | 300 | Standard prompts, high repeat rate |
| `screening` | 300 | Structured checks, very repeatable |
| `hypothesis` | 60 | Moderate variability |
| `experiment_design` | 0 | Creative, never cache |
| `code_review` | 60 | Code patterns may repeat within a session |

Expose an override in `ModelOpts`: `cacheTtl?: number`.

### 3.3 Simplified router

The new `ModelRouter` should:

1. **Initialize one Gateway client** (OpenAI SDK or raw fetch) instead of 6+ provider instances.
2. **Preserve `complete()` signature** — drop-in replacement.
3. **Preserve tier → model mapping** — but now it's a model *string* passed to Gateway, not a provider class.
4. **Preserve eval-aware escalation** — still query D1 and switch chain, but chains are now model ID arrays, not provider names.
5. **Preserve quality gate** — still run `runHeuristics()` and fallback.
6. **Preserve usage logging** — but also push Gateway-specific metadata.
7. **Add Gateway telemetry bridge** — emit span attributes for cache hits, rate limits, fallback triggers.

### 3.4 Telemetry bridge

Inside the `gateway.ai-gateway` span, set these attributes when available:

```ts
span.setAttribute("gateway.cache.hit", true | false);
span.setAttribute("gateway.cache.ttl", cacheTtl);
span.setAttribute("gateway.provider_actual", "openai" | "workers-ai" | ...);  // who actually served it
span.setAttribute("model.gateway", "ai-gateway");
```

The upstream telemetry team will key off `model.gateway` to distinguish Gateway-routed vs direct calls in Phoenix dashboards.

### 3.5 Error handling

Gateway returns structured errors. Map them:

| Gateway response | Router behavior |
|------------------|-----------------|
| `429` rate limited | Retry once with exponential backoff (1s), then fallback to next model in chain |
| `503` provider down | Immediate fallback to next model |
| `400` bad request | Throw (don't retry — likely our bug) |
| `5xx` | Retry once, then fallback |
| Cache hit (`cf-aig-cache-status: HIT`) | Skip retry/fallback logic entirely |

---

## 4. Files to Modify

| File | Action |
|------|--------|
| `src/gateway/router.ts` | **Major refactor** — replace provider map with Gateway client; preserve `complete()` signature; update chain resolution |
| `src/gateway/providers.ts` | **Major refactor** — keep direct-provider classes only for non-Gateway providers; add `AIGatewayProvider` class; mark deprecated classes |
| `src/types.ts` | Add `AI_GATEWAY_TOKEN?: string` to `Env` (or repurpose existing token) |
| `src/agents/base.ts` | Verify no breaking changes from `complete()` signature |
| `src/gateway/__tests__/router.test.ts` | **Write new tests** — mock Gateway responses, test caching, fallback, rate-limit retry |
| `.dev.vars` | Add `AI_GATEWAY_TOKEN=<YOUR_GATEWAY_TOKEN>` |
| `wrangler.toml` / `wrangler.json` | Document new secret; no new bindings needed |

---

## 5. Files to Create

| File | Purpose |
|------|---------|
| `src/gateway/ai-gateway.ts` | `AIGatewayProvider` class — thin wrapper around Gateway OpenAI-compatible endpoint |
| `src/gateway/__tests__/ai-gateway.test.ts` | Unit tests for Gateway provider |

---

## 6. Acceptance Criteria

### 6.1 Functional

- [ ] `ModelRouter.complete("hypothesis", "Explain quantum tunneling", { systemPrompt: "..." })` returns a `ModelResponse` with correct shape
- [ ] All existing call sites compile without modification
- [ ] Tier `ingestion` calls use `model: "@cf/meta/llama-3.1-8b-instruct"` via Gateway
- [ ] Tier `hypothesis` calls use `model: "glm-5.1"` (Zhipu) via Gateway
- [ ] Cache TTL varies by tier as specified
- [ ] `opts.cacheTtl` overrides tier default
- [ ] Eval-aware escalation still works (test with mocked D1)
- [ ] Quality gate still works (test with mocked heuristics)

### 6.2 Operational

- [ ] Gateway cache hit/miss visible in span attributes
- [ ] KV usage logging still writes daily aggregates
- [ ] Rate-limit `429` triggers one retry + fallback
- [ ] `cf-aig-cache-status: HIT` skips retry/fallback

### 6.3 Telemetry

- [ ] Every Gateway call emits `gateway.ai-gateway` span
- [ ] Span includes `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.*`
- [ ] Span includes `model.gateway = "ai-gateway"`
- [ ] Span includes `gateway.cache.hit` boolean

---

## 7. Testing Strategy

### 7.1 Unit tests (Vitest)

Mock `fetch` globally. Provide a helper:

```ts
function mockGatewayResponse(opts: {
  status: number;
  text?: string;
  cacheStatus?: "HIT" | "MISS";
  providerActual?: string;
}) { ... }
```

Test cases:
1. Happy path — Gateway returns 200, parse usage, return `ModelResponse`
2. Cache hit — `cf-aig-cache-status: HIT`, no fallback on error
3. Rate limit — `429` with `Retry-After`, retry once, then fallback
4. Provider down — `503`, immediate fallback
5. Tier mapping — each tier maps to correct model string
6. Escalation — mocked D1 poor pass rate triggers strength-first chain
7. Quality gate — heuristic score `0.2` triggers fallback

### 7.2 Integration test (local)

Run `wrangler dev` with `.dev.vars` token. Hit a real Gateway endpoint for a cheap model (e.g., Workers AI `@cf/meta/llama-3.1-8b-instruct`). Verify:
- Response returns in < 2s
- Phoenix trace shows `gateway.ai-gateway` span
- KV `usage:YYYY-MM-DD:ai-gateway:{tier}` increments

### 7.3 Rollback plan

If Gateway is unstable, revert is one PR rollback. The old provider classes should be kept as deprecated (not deleted) for the first week, so a hotfix can switch back by changing one line in `router.ts`.

---

## 8. Known Gotchas

### 8.1 Workers AI via Gateway

Gateway exposes Workers AI models through an OpenAI-compatible API. The model ID format is the same: `@cf/meta/llama-3.1-8b-instruct`. You do NOT need `env.AI.run()` — you hit Gateway with a standard `chat.completions` request.

### 8.2 MiniMax `base_resp` wrapper

MiniMax's native API wraps responses in `base_resp.status_code`. Gateway's OpenAI-compatible translation may or may not strip this. Test with a real MiniMax call through Gateway. If `base_resp` leaks, add a sanitization layer in `AIGatewayProvider`.

### 8.3 HuggingFace non-chat format

HF Inference API uses `inputs: string` instead of `messages: [...]`. Gateway may not support this format. If not, keep `HFProvider` as a direct fetch and do NOT route HF through Gateway.

### 8.4 Anthropic/Gemini translation

Gateway translates Anthropic and Gemini to OpenAI format. Verify that `usage` fields (prompt/completion tokens) are preserved in translation. If Gateway strips usage, you must estimate tokens locally or drop usage tracking for those providers.

### 8.5 Span naming

The upstream telemetry team expects span names to follow the pattern `gateway.{provider}`. For Gateway calls, use `gateway.ai-gateway`. The `gateway.provider_actual` attribute reveals the backend provider.

### 8.6 Token security

The Gateway token `<YOUR_GATEWAY_TOKEN>` is **not** a high-sensitivity key (it's a gateway-scoped token), but still store it in `wrangler secret`, never commit it.

---

## 9. Interface Contract with Upstream

The upstream team (telemetry) guarantees:

- `ModelRouter.complete()` signature will not change
- `Env` interface will accept new optional fields you add
- All LLM call sites already pass `agentClass` where relevant

You guarantee:

- `ModelResponse` shape is preserved
- Span emission follows existing `gen_ai.*` conventions
- `model.gateway = "ai-gateway"` is set on Gateway spans
- No new required `Env` fields (everything is optional with sensible fallbacks)

---

## 10. Questions?

Ping the upstream team (telemetry) before making decisions on:
1. **Dropping providers** — if Gateway doesn't support a provider we currently use, should we drop it or keep direct?
2. **Cache TTL defaults** — the table in §3.2 is a proposal; validate against actual prompt patterns
3. **Span naming** — if you want to change `gateway.ai-gateway` to something else, coordinate first

---

## Appendix: Quick Reference — Gateway API

```bash
# Unified chat completions
curl https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway}/openai/chat/completions \
  -H "Authorization: Bearer <YOUR_GATEWAY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Workers AI via Gateway
curl https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway}/workers-ai/v1/chat/completions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "@cf/meta/llama-3.1-8b-instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

Cache control header: `cf-aig-cache-ttl: {seconds}`  
Cache status response header: `cf-aig-cache-status: HIT | MISS`
