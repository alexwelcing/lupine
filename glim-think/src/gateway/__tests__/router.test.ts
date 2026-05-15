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

  it("hypothesis → ZAI glm-5.1 first, DIRECT (not via Gateway)", async () => {
    const cap = stubFetch(["a hypothesis"]);
    const res = await new ModelRouter(makeEnv(KEYS)).complete("hypothesis", "why?");
    expect(res.provider).toBe("zai");
    expect(cap[0].url).toContain("open.bigmodel.cn");
    expect(cap[0].url).not.toContain("gateway.ai.cloudflare.com");
    expect(cap[0].body.model).toBe("glm-5.1");
  });

  it("experiment_design → MiniMax first, DIRECT", async () => {
    const cap = stubFetch(["a design"]);
    const res = await new ModelRouter(makeEnv(KEYS)).complete(
      "experiment_design",
      "design it"
    );
    expect(res.provider).toBe("minimax");
    expect(cap[0].url).toContain("api.minimax.chat");
    expect(cap[0].body.model).toBe("MiniMax-Text-2.7");
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

  it("experiment_design sends cf-aig-cache-ttl: 0 (never cache)", async () => {
    const cap = stubFetch(["x"]);
    await new ModelRouter(makeEnv()).complete("experiment_design", "p");
    expect(cap[0].headers["cf-aig-cache-ttl"]).toBe("0");
  });

  it("opts.cacheTtl overrides the tier default", async () => {
    const cap = stubFetch(["x"]);
    await new ModelRouter(makeEnv()).complete("ingestion", "p", { cacheTtl: 42 });
    expect(cap[0].headers["cf-aig-cache-ttl"]).toBe("42");
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
    expect(cap[0].url).toContain("api.minimax.chat");
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
    expect(res.provider).toBe("minimax"); // 2nd rung of the hypothesis chain
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
