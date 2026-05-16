/**
 * Critical-path test: ModelRouter over Cloudflare AI Gateway.
 *
 * Routing was verified against the live `glimgate` gateway:
 *   - Workers AI  → Gateway `compat` (model `workers-ai/@cf/...`)
 *   - ZAI/MiniMax → DIRECT (Gateway `compat` rejects them, code 2008)
 *   - HuggingFace → DIRECT (non-chat `inputs` format)
 *
 * `fetch` is stubbed (no network) with a universal OpenAI-shaped reply so
 * both the Gateway path and the direct ZAI/MiniMax fetches resolve. We
 * assert the contract the work order pins: tier→model/route mapping,
 * tier→cache-TTL (Gateway only), opts.cacheTtl override, eval-aware
 * escalation (mocked D1), the quality gate, and cache-hit KV logging.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { ModelRouter } from "../router";
import { buildStubEnv, stubLedger, stubConfig } from "../../testing/envStub";
import type { Env } from "../../types";

const GW_ENV = {
  AI_GATEWAY_TOKEN: "tok",
  AI_GATEWAY_ACCOUNT_ID: "acct",
  AI_GATEWAY_NAME: "gw",
};
const KEYS = { ZAI_API_KEY: "zk", MINIMAX_API_KEY: "mk" };

interface Captured {
  url: string;
  body: { model: string; messages: unknown[] };
  headers: Record<string, string>;
}

/**
 * Universal stub: any URL (Gateway or direct provider) gets the same
 * OpenAI-shaped 200. `contents` supplies the assistant text per
 * successive call so chain-fallback tests are deterministic.
 */
function stubFetch(contents: string[]): Captured[] {
  const captured: Captured[] = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      captured.push({
        url,
        body: JSON.parse(init.body as string),
        headers: init.headers as Record<string, string>,
      });
      const content = contents[Math.min(i, contents.length - 1)];
      i++;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 3, completion_tokens: 7 },
        }),
        { status: 200, headers: { "cf-aig-cache-status": "MISS" } }
      );
    })
  );
  return captured;
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return buildStubEnv({ ...GW_ENV, ...overrides } as Partial<Env>);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ModelRouter — tier → route mapping", () => {
  it("ingestion → Workers AI via the Gateway compat endpoint", async () => {
    const cap = stubFetch(["a result"]);
    const res = await new ModelRouter(makeEnv()).complete("ingestion", "summarise");
    expect(res.provider).toBe("workers-ai");
    expect(cap[0].url).toContain("gateway.ai.cloudflare.com");
    expect(cap[0].url).toContain("/compat/chat/completions");
    expect(cap[0].body.model).toBe("workers-ai/@cf/meta/llama-3.1-8b-instruct");
  });

  it("science tiers lead with a balanced MiniMax/GLM workhorse, DIRECT (not Gateway)", async () => {
    for (const tier of ["hypothesis", "experiment_design", "code_review"] as const) {
      const cap = stubFetch(["x"]);
      const res = await new ModelRouter(makeEnv(KEYS)).complete(tier, "q");
      expect(["minimax", "zai"]).toContain(res.provider);
      expect(cap[0].url).not.toContain("gateway.ai.cloudflare.com");
      expect(cap[0].url).toMatch(/api\.minimax\.io|api\.z\.ai\/api\/coding\/paas\/v4/);
    }
  });

  it("MiniMax ↔ GLM alternate across requests (round-robin balance)", async () => {
    const env = makeEnv(KEYS); // both ZAI + MiniMax present
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      stubFetch(["x"]);
      seen.push((await new ModelRouter(env).complete("hypothesis", "q")).provider);
    }
    // Both workhorses must appear — load is shared, not pinned to one.
    expect(new Set(seen)).toEqual(new Set(["minimax", "zai"]));
  });

  it("OpenAI is the last decider (after the pair), not the lead", async () => {
    // Only OpenAI key + the free floor: OpenAI is reached only because the
    // science workhorses are absent — it never leads the normal chain.
    const cap = stubFetch(["decided"]);
    const res = await new ModelRouter(makeEnv({ OPENAI_API_KEY: "ok" })).complete(
      "hypothesis",
      "why?"
    );
    expect(res.provider).toBe("openai");
    expect(cap[0].url).toContain("api.openai.com");
    const body = cap[0].body as Record<string, unknown>;
    expect(body.model).toBe("gpt-5.5");
    expect(body.max_completion_tokens).toBeDefined(); // gpt-5.x shape
    expect(body.temperature).toBeUndefined(); // gpt-5.x: default only
  });
});

describe("ModelRouter — cache TTL by tier (Gateway-routed Workers AI)", () => {
  // No ZAI/MiniMax keys → every tier's chain collapses to ["workers-ai"],
  // so each tier exercises the Gateway provider directly.
  it("ingestion sends cf-aig-cache-ttl: 300", async () => {
    const cap = stubFetch(["x"]);
    await new ModelRouter(makeEnv()).complete("ingestion", "p");
    expect(cap[0].headers["cf-aig-cache-ttl"]).toBe("300");
  });

  it("experiment_design (TTL 0) sends cf-aig-skip-cache, not cf-aig-cache-ttl", async () => {
    const cap = stubFetch(["x"]);
    await new ModelRouter(makeEnv()).complete("experiment_design", "p");
    expect(cap[0].headers["cf-aig-skip-cache"]).toBe("true");
    expect(cap[0].headers["cf-aig-cache-ttl"]).toBeUndefined();
  });

  it("opts.cacheTtl overrides the tier default", async () => {
    const cap = stubFetch(["x"]);
    await new ModelRouter(makeEnv()).complete("ingestion", "p", { cacheTtl: 600 });
    expect(cap[0].headers["cf-aig-cache-ttl"]).toBe("600");
  });
});

describe("ModelRouter — eval-aware escalation (mocked D1)", () => {
  it("poor pass rate switches to the strength-first chain (MiniMax first)", async () => {
    const cap = stubFetch(["escalated answer"]);
    const env = makeEnv({
      ...KEYS,
      LEDGER: stubLedger({
        queries: [
          { match: "avg_score", first: { avg_score: 0.2, count: 5, pass_rate: 0.2 } },
        ],
      }),
    });
    // Tier-optimised "hypothesis" leads with ZAI; escalation flips to
    // strength-first, which leads with MiniMax.
    const res = await new ModelRouter(env).complete("hypothesis", "why?", {
      agentClass: "Theorist",
    });
    expect(res.provider).toBe("minimax");
    expect(cap[0].url).toContain("api.minimax.io");
  });
});

describe("ModelRouter — quality gate (real heuristics)", () => {
  it("a sub-0.3 heuristic score falls back to the next provider", async () => {
    // "x" → completeness 0.15 + nonEmpty 0.3 → avg 0.225 < 0.30 → fall back.
    const cap = stubFetch([
      "x",
      "Because the lattice relaxes, the cohesive energy shifts by 0.42 eV;\n" +
        "1. measure, 2. compare. Therefore the prediction holds across the set.",
    ]);
    const res = await new ModelRouter(makeEnv(KEYS)).complete("hypothesis", "explain", {
      agentClass: "Theorist",
      qualityGate: true,
    });
    // Low score on the first workhorse falls back to the next rung — the
    // other balanced science provider (minimax↔zai), not pinned to one.
    expect(["minimax", "zai"]).toContain(res.provider);
    expect(cap).toHaveLength(2);
  });
});

describe("ModelRouter — usage logging", () => {
  it("increments daily KV aggregates and a cacheHits counter", async () => {
    stubFetch(["a result"]);
    const config = stubConfig();
    await new ModelRouter(makeEnv({ CONFIG: config })).complete("ingestion", "p");
    const day = new Date().toISOString().slice(0, 10);
    const raw = await config.get(`usage:${day}:workers-ai:ingestion`);
    expect(raw).toBeTruthy();
    const stats = JSON.parse(raw as string);
    expect(stats.calls).toBe(1);
    expect(stats.tokens).toBe(10); // 3 prompt + 7 completion
    expect(stats.cacheHits).toBe(0); // MISS in the stub
  });
});
