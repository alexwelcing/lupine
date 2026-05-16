/**
 * OpenInference projection verifier.
 *
 * Confirms the Worker's exporter is projecting Vercel AI SDK spans into
 * OpenInference conventions and they reach the right Phoenix project. Use
 * after a deploy / traffic burst:
 *
 *   PHOENIX_API_KEY=… PHOENIX_COLLECTOR_ENDPOINT=… npx tsx verify-openinference.ts
 *
 * Two Phoenix-Cloud-specific facts this encodes (learned the hard way):
 *  - `@arizeai/phoenix-client` getSpans 301s→HTML against space-scoped Cloud
 *    URLs (`/s/<space>`), so we hit the REST API directly.
 *  - Phoenix normalizes `openinference.span.kind` into the top-level
 *    `span_kind` field, not `attributes` — that is the projection signal.
 *
 * Exit 0 if ≥1 correctly-projected LLM span is found, else 1 (CI-gateable).
 */

import { config } from "dotenv";
config({ path: "../.env" });

const PROJECT = process.env.PHOENIX_PROJECT_NAME || "glim-think";

function restBase(): string {
  const e = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (!e) throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set");
  return e.replace(/\/$/, "").replace(/\/v1\/traces$/, "");
}

interface PhoenixSpan {
  name: string;
  span_kind: string;
  start_time: string;
  attributes?: Record<string, unknown>;
}

async function fetchSpans(limit = 200): Promise<PhoenixSpan[]> {
  const apiKey = process.env.PHOENIX_API_KEY?.trim();
  if (!apiKey) throw new Error("PHOENIX_API_KEY not set");
  const url = `${restBase()}/v1/projects/${encodeURIComponent(PROJECT)}/spans?limit=${limit}&sort=-start_time`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Phoenix REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { data?: PhoenixSpan[] };
  return j.data ?? [];
}

async function main() {
  const sinceArg = process.argv.find((a) => a.startsWith("--since="));
  const since = sinceArg ? sinceArg.slice("--since=".length) : null;

  const all = await fetchSpans(300);
  const spans = since ? all.filter((s) => s.start_time > since) : all;

  const kinds: Record<string, number> = {};
  let llm = 0;
  let llmWithIO = 0;
  const sample: string[] = [];

  for (const s of spans) {
    const k = s.span_kind || "(none)";
    kinds[k] = (kinds[k] ?? 0) + 1;
    const a = s.attributes ?? {};
    const hasIO = !!a["input.value"] && !!a["output.value"];
    if (s.span_kind === "LLM") {
      llm++;
      if (hasIO) llmWithIO++;
      if (sample.length < 6) {
        sample.push(
          `  ${s.name.slice(0, 38).padEnd(38)} model=${a["llm.model_name"] ?? "—"} ` +
            `tok=${a["llm.token_count.total"] ?? "—"} io=${hasIO ? "in+out" : "—"}`,
        );
      }
    }
  }

  console.log(`[oi-verify] project=${PROJECT} spans=${spans.length}${since ? ` (since ${since})` : ""}`);
  console.log(`[oi-verify] span_kind distribution:`);
  for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(14)} ${n}`);
  }
  console.log(`[oi-verify] LLM spans: ${llm} | with input+output: ${llmWithIO}`);
  if (sample.length) console.log(`[oi-verify] sample:\n${sample.join("\n")}`);

  if (llm === 0) {
    console.error(
      `[oi-verify] FAIL: no span_kind=LLM spans. Projection/export broken, or ` +
        `no AI-SDK traffic in window. Hit GET /ops/llm-selftest then retry.`,
    );
    process.exit(1);
  }
  console.log(`[oi-verify] PASS: OpenInference projection confirmed in Phoenix.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
