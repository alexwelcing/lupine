/**
 * Unit tests for `AIGatewayProvider`.
 *
 * `fetch` is stubbed globally — no network. `setTimeout` is stubbed to
 * fire immediately so the §3.5 single-retry backoff doesn't slow the run.
 * OTel has no registered provider in node, so `startActiveSpan` runs the
 * callback against a no-op span; we assert behaviour, not span plumbing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIGatewayProvider, type AIGatewayConfig } from "../ai-gateway";

const BASE_CFG: AIGatewayConfig = {
  token: "test-token",
  accountId: "acct123",
  gatewayName: "gw1",
  pathSegment: "workers-ai",
  model: "@cf/meta/llama-3.1-8b-instruct",
  name: "workers-ai",
};

interface MockOpts {
  status?: number;
  body?: unknown;
  cacheStatus?: "HIT" | "MISS";
  retryAfter?: string;
}

function mockResponse(o: MockOpts = {}): Response {
  const status = o.status ?? 200;
  const body =
    typeof o.body === "string"
      ? o.body
      : JSON.stringify(
          o.body ?? {
            choices: [{ message: { content: "hello world" } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }
        );
  const headers: Record<string, string> = {};
  if (o.cacheStatus) headers["cf-aig-cache-status"] = o.cacheStatus;
  if (o.retryAfter) headers["retry-after"] = o.retryAfter;
  return new Response(body, { status, headers });
}

/** Queue a sequence of responses; capture every request. */
function stubFetch(responses: Response[]): { calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const r = responses[Math.min(i, responses.length - 1)];
      i++;
      return r;
    })
  );
  return { calls };
}

beforeEach(() => {
  // Make the retry backoff instantaneous.
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) => {
    fn();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AIGatewayProvider — happy path", () => {
  it("returns a well-shaped ModelResponse and maps usage", async () => {
    stubFetch([mockResponse({ cacheStatus: "MISS" })]);
    const p = new AIGatewayProvider(BASE_CFG);
    const res = await p.complete("explain tunneling", { systemPrompt: "be terse" });

    expect(res.text).toBe("hello world");
    expect(res.provider).toBe("workers-ai");
    expect(res.model).toBe("@cf/meta/llama-3.1-8b-instruct");
    expect(res.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
    expect(res.cacheHit).toBe(false);
    expect(typeof res.latencyMs).toBe("number");
  });

  it("builds the workers-ai URL with the /v1 sub-path", async () => {
    const { calls } = stubFetch([mockResponse()]);
    await new AIGatewayProvider(BASE_CFG).complete("hi");
    expect(calls[0].url).toBe(
      "https://gateway.ai.cloudflare.com/v1/acct123/gw1/workers-ai/v1/chat/completions"
    );
  });

  it("builds the compat URL for OpenAI-compatible providers", async () => {
    const { calls } = stubFetch([mockResponse()]);
    await new AIGatewayProvider({
      ...BASE_CFG,
      pathSegment: "compat",
      model: "glm-5.1",
      name: "zai",
    }).complete("hi");
    expect(calls[0].url).toBe(
      "https://gateway.ai.cloudflare.com/v1/acct123/gw1/compat/chat/completions"
    );
  });

  it("forwards the cache TTL as the cf-aig-cache-ttl header", async () => {
    const { calls } = stubFetch([mockResponse()]);
    await new AIGatewayProvider(BASE_CFG).complete("hi", { cacheTtl: 300 });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["cf-aig-cache-ttl"]).toBe("300");
  });
});

describe("AIGatewayProvider — cache", () => {
  it("flags a cache HIT and does not retry", async () => {
    const { calls } = stubFetch([mockResponse({ cacheStatus: "HIT" })]);
    const res = await new AIGatewayProvider(BASE_CFG).complete("hi");
    expect(res.cacheHit).toBe(true);
    expect(calls).toHaveLength(1);
  });
});

describe("AIGatewayProvider — error mapping (§3.5)", () => {
  it("429 then 200: retries once and honours Retry-After", async () => {
    const { calls } = stubFetch([
      mockResponse({ status: 429, retryAfter: "1", body: "rate limited" }),
      mockResponse(),
    ]);
    const res = await new AIGatewayProvider(BASE_CFG).complete("hi");
    expect(res.text).toBe("hello world");
    expect(calls).toHaveLength(2);
  });

  it("429 twice: throws so the router can advance the chain", async () => {
    const { calls } = stubFetch([
      mockResponse({ status: 429, body: "rl" }),
      mockResponse({ status: 429, body: "rl" }),
    ]);
    await expect(new AIGatewayProvider(BASE_CFG).complete("hi")).rejects.toThrow(
      /AI Gateway 429/
    );
    expect(calls).toHaveLength(2);
  });

  it("503: throws immediately with no retry (fast fallback)", async () => {
    const { calls } = stubFetch([
      mockResponse({ status: 503, body: "down" }),
      mockResponse(),
    ]);
    await expect(new AIGatewayProvider(BASE_CFG).complete("hi")).rejects.toThrow(
      /AI Gateway 503/
    );
    expect(calls).toHaveLength(1);
  });

  it("400: throws with no retry (likely our bug)", async () => {
    const { calls } = stubFetch([
      mockResponse({ status: 400, body: "bad" }),
      mockResponse(),
    ]);
    await expect(new AIGatewayProvider(BASE_CFG).complete("hi")).rejects.toThrow(
      /AI Gateway 400/
    );
    expect(calls).toHaveLength(1);
  });

  it("500 then 200: retries once", async () => {
    const { calls } = stubFetch([
      mockResponse({ status: 500, body: "oops" }),
      mockResponse(),
    ]);
    const res = await new AIGatewayProvider(BASE_CFG).complete("hi");
    expect(res.text).toBe("hello world");
    expect(calls).toHaveLength(2);
  });
});

describe("AIGatewayProvider — MiniMax base_resp sanitisation (§8.2)", () => {
  it("throws when a non-zero base_resp leaks through compat", async () => {
    stubFetch([
      mockResponse({
        body: {
          base_resp: { status_code: 1004, status_msg: "auth failed" },
          choices: [{ message: { content: "" } }],
        },
      }),
    ]);
    await expect(
      new AIGatewayProvider({ ...BASE_CFG, pathSegment: "compat", name: "minimax" }).complete(
        "hi"
      )
    ).rejects.toThrow(/AI Gateway provider error/);
  });

  it("accepts a zero base_resp (success envelope)", async () => {
    stubFetch([
      mockResponse({
        body: {
          base_resp: { status_code: 0 },
          choices: [{ message: { content: "ok" } }],
        },
      }),
    ]);
    const res = await new AIGatewayProvider({
      ...BASE_CFG,
      pathSegment: "compat",
      name: "minimax",
    }).complete("hi");
    expect(res.text).toBe("ok");
  });
});
