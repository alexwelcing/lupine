/**
 * GLIM-THINK v2: Cloudflare Workers entry point.
 *
 * Think-upgraded autoresearch swarm. Each specialist agent now runs
 * its own agentic reasoning loop via @cloudflare/think.
 *
 * Routes:
 *   /health             — Health check
 *   /run                — Trigger single-element research loop (Orchestrator chat)
 *   /fleet/run          — Trigger parallel fleet across all elements
 *   /fleet/status       — Get fleet status
 *   /fleet/schedule     — Schedule recurring fleet runs
 *   /dashboard          — HTML dashboard
 *   /dashboard/ws       — WebSocket stream
 *   /ingest/batch       — Bulk record ingestion
 *   /experiments/*      — Experiment queue management
 *   /diary/draft        — LLM diary narrative
 *   /ext/*              — Extension management
 *   /agents/*           — Think WebSocket/chat routing (automatic)
 *   /literature/search  — POST: arXiv + Semantic Scholar + OpenAlex search (cached)
 *   /literature/papers  — GET: list cached papers (filterable by source/year)
 *   /literature/papers/:doi — GET: fetch a single cached paper
 */

import { routeAgentRequest } from "agents";
import { Orchestrator } from "./agents/orchestrator";
import { Manifold } from "./agents/manifold";
import { Causal } from "./agents/causal";
import { Theorist } from "./agents/theorist";
import { Experiment } from "./agents/experiment";
import { Literaturist } from "./agents/literaturist";
import { FleetOrchestrator } from "./fleet/orchestrator";
import { DashboardAgent } from "./dashboard/stream";
import { ExtensionManager } from "./extensions/manager";
import { ModelRouter } from "./gateway/router";
import { createLabBroadcast, scheduled as scheduledHandler } from "./scheduled";
import { respondToCritique } from "./critiques/dispatcher";
import { openApiSpec } from "./openapi";
import { searchLiterature, isLiteratureSource, rowToPaper } from "./literature";
import { enqueueTask, consumeBatch, type ResearchTask } from "./research/queue";
import { runOrchestratorTick } from "./research/orchestrator";
import { handleFeedRoute } from "./feed/split";
import { getHealthSnapshot, runSmoketest } from "./ops/observability";
import { testMiniMaxCall, listMiniMaxModels, sweepMiniMaxEndpoints, exerciseDeepTier } from "./agents/models";
import { runDiag, probeDOSynthesize, probeDOKV } from "./admin/diag";
import { generateAndStoreImage } from "./agents/image";
import { generateAndStoreAudio } from "./agents/tts";
import { submitDailyVignette, pollPendingVignettes, submitCustomVignette } from "./research/vignette";
import { explainFigure } from "./agents/vlm";
import { comprehendPaper, reasonOnHypothesis, topInsightsForHypothesis, iterateOnHypothesis, promoteInsight, leanStatusOverview } from "./research/insights";
import { listHits, updateHitStatus, type HitKind, type HitStatus } from "./research/hits";
import { searchLiterature as searchLit } from "./literature";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
import type {
  BenchmarkRecord,
  ClaimRecord,
  Critique,
  CritiqueStatus,
  Env,
  HypothesisRecord,
  HypothesisStatus,
  LiteratureSource,
  ResearchQuestion,
  ResearchQuestionStatus,
} from "./types";

const HARDCODED_HYPOTHESES = [
  "Hyper-ribbon universality across 559 classical potentials",
  "BCC/FCC error correlation dichotomy (causal shield)",
  "MLIP manifold equivalence (MACE-MP, CHGNet, M3GNet)",
  "Ecological fallacy in one-number benchmarking",
] as const;

const VALID_HYPOTHESIS_STATUSES: ReadonlySet<HypothesisStatus> = new Set([
  "proposed", "testing", "confirmed", "refuted",
]);

const JSON_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const HYPOTHESIS_SELECT =
  `SELECT id, title, status, confidence, evidence_ids, agent_id, created_at, updated_at FROM hypotheses`;

function selectHypothesisById(env: Env, id: string): Promise<HypothesisRecord | null> {
  return env.LEDGER.prepare(`${HYPOTHESIS_SELECT} WHERE id = ?1`)
    .bind(id)
    .first<HypothesisRecord>();
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: JSON_CORS_HEADERS });
}

// Re-export all Durable Object classes for wrangler
export {
  Orchestrator, Manifold, Causal, Theorist, Experiment,
  FleetOrchestrator, DashboardAgent, ExtensionManager, Literaturist,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Pre-read POST/PATCH body so it can be reused after agent routing
      const bodyText = request.method === "POST" || request.method === "PATCH"
        ? await request.text()
        : "";

      // ─── Think agent routing (WebSocket / chat protocol) ───
      // This handles /agents/{class}/{name} paths automatically
      if (url.pathname.startsWith("/agents/")) {
        const agentResponse = await routeAgentRequest(
          new Request(request.url, { method: request.method, headers: request.headers, body: bodyText || undefined }),
          env
        );
        if (agentResponse) return agentResponse;
      }

      // ─── HTTP API routes ───

      if (url.pathname === "/health") {
        let activeHypotheses: string[] = [...HARDCODED_HYPOTHESES];
        try {
          const rows = await env.LEDGER.prepare(
            `SELECT title FROM hypotheses ORDER BY created_at`
          ).all<{ title: string }>();
          if (rows.results && rows.results.length > 0) {
            activeHypotheses = rows.results.map(r => r.title);
          }
        } catch (e) {
          // Migration may not yet be applied — fall back to hardcoded list.
          console.error("/health hypotheses query failed:", e);
        }

        const snapshot = await getHealthSnapshot(env);
        const status =
          snapshot.last_smoketest?.overall_outcome === "fail"
            ? "degraded"
            : "ok";

        return Response.json({
          status,
          service: "glim-think-v2",
          version: "2.2.0",
          runtime: "think",
          research_mode: "causal-geometry",
          research_direction: "Error Manifold Invariance & Causal Benchmarking",
          agents: ["Orchestrator", "Manifold", "Causal", "Theorist", "Experiment"],
          active_hypotheses: activeHypotheses,
          observability: {
            counts: {
              records: snapshot.records,
              hypotheses: snapshot.hypotheses,
              claims: snapshot.claims,
              pending_experiments: snapshot.pending_experiments,
              pending_critiques: snapshot.pending_critiques,
            },
            cron_runs: snapshot.cron_runs,
            last_smoketest: snapshot.last_smoketest,
            recent_errors: snapshot.recent_errors.slice(0, 5),
          },
        });
      }

      // === Phase A — observability endpoints ===
      if (url.pathname === "/ops/cron-runs" && request.method === "GET") {
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
          200,
        );
        const cronName = url.searchParams.get("cron");
        const sql = cronName
          ? `SELECT run_id, cron_name, cron_expression, started_at, finished_at,
                    outcome, duration_ms, error
               FROM cron_runs
              WHERE cron_name = ?1
              ORDER BY started_at DESC
              LIMIT ?2`
          : `SELECT run_id, cron_name, cron_expression, started_at, finished_at,
                    outcome, duration_ms, error
               FROM cron_runs
              ORDER BY started_at DESC
              LIMIT ?1`;
        const stmt = cronName
          ? env.LEDGER.prepare(sql).bind(cronName, limit)
          : env.LEDGER.prepare(sql).bind(limit);
        try {
          const rows = await stmt.all();
          return Response.json(
            { runs: rows.results ?? [], count: (rows.results ?? []).length },
            { headers: JSON_CORS_HEADERS },
          );
        } catch (e) {
          return Response.json(
            { runs: [], count: 0, error: String(e) },
            { headers: JSON_CORS_HEADERS },
          );
        }
      }

      if (url.pathname === "/ops/errors" && request.method === "GET") {
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
          200,
        );
        const source = url.searchParams.get("source");
        const sql = source
          ? `SELECT error_id, source, message, stack, context_json, occurred_at
               FROM ops_errors
              WHERE source = ?1
              ORDER BY occurred_at DESC
              LIMIT ?2`
          : `SELECT error_id, source, message, stack, context_json, occurred_at
               FROM ops_errors
              ORDER BY occurred_at DESC
              LIMIT ?1`;
        const stmt = source
          ? env.LEDGER.prepare(sql).bind(source, limit)
          : env.LEDGER.prepare(sql).bind(limit);
        try {
          const rows = await stmt.all();
          return Response.json(
            { errors: rows.results ?? [], count: (rows.results ?? []).length },
            { headers: JSON_CORS_HEADERS },
          );
        } catch (e) {
          return Response.json(
            { errors: [], count: 0, error: String(e) },
            { headers: JSON_CORS_HEADERS },
          );
        }
      }

      if (url.pathname === "/ops/smoketest" && request.method === "GET") {
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") ?? "20", 10) || 20,
          100,
        );
        try {
          const rows = await env.LEDGER.prepare(
            `SELECT run_id, started_at, finished_at, overall_outcome,
                    probes_json, duration_ms
               FROM smoketest_runs
              ORDER BY started_at DESC
              LIMIT ?1`,
          )
            .bind(limit)
            .all();
          const runs = (rows.results ?? []).map((row: Record<string, unknown>) => ({
            ...row,
            probes:
              typeof row.probes_json === "string"
                ? JSON.parse(row.probes_json)
                : row.probes_json,
          }));
          return Response.json(
            { runs, count: runs.length },
            { headers: JSON_CORS_HEADERS },
          );
        } catch (e) {
          return Response.json(
            { runs: [], count: 0, error: String(e) },
            { headers: JSON_CORS_HEADERS },
          );
        }
      }

      if (url.pathname === "/ops/smoketest/run" && request.method === "POST") {
        // Manual trigger — useful for testing without waiting for the cron.
        const result = await runSmoketest(env);
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      // Orchestrator: trigger a research analysis directly via D1
      // (Can't route through stub.fetch() because Think intercepts it)
      if (url.pathname === "/run" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const element = typeof body.element === "string" ? body.element : null;
        const analysisTypes = Array.isArray(body.analysis_types) ? body.analysis_types as string[] : ["manifold", "causal"];
        const excludeStyles = Array.isArray(body.exclude_styles) ? body.exclude_styles as string[] : [];
        const onlyStyles = Array.isArray(body.only_styles) ? body.only_styles as string[] : [];

        const results: Record<string, unknown> = { element, timestamp: new Date().toISOString() };

        // Get record counts
        const counts = await env.LEDGER.prepare(
          element
            ? `SELECT element, COUNT(*) as n FROM records WHERE element = ?1 GROUP BY element`
            : `SELECT element, COUNT(*) as n FROM records GROUP BY element ORDER BY n DESC`
        ).bind(...(element ? [element] : [])).all();
        results.recordCounts = counts.results;

        // Manifold analysis: compute error vectors and eigenvalue spectra
        if (analysisTypes.includes("manifold")) {
          const conditions: string[] = ["reference != 0", "property IN ('C11','C12','C44')"];
          if (element) conditions.push(`element = '${element}'`);
          if (excludeStyles.length > 0) conditions.push(`pair_style NOT IN (${excludeStyles.map(s => `'${s}'`).join(',')})`);
          if (onlyStyles.length > 0) conditions.push(`pair_style IN (${onlyStyles.map(s => `'${s}'`).join(',')})`);
          const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : "";
          const errorRows = await env.LEDGER.prepare(
            `SELECT potential_id, property,
                    (predicted - reference) / CASE WHEN reference != 0 THEN reference ELSE 1.0 END as rel_error
             FROM records ${whereClause}
             ORDER BY potential_id, property`
          ).all();

          // Group by potential into error vectors [C11_err, C12_err, C44_err, ...]
          const properties = ["C11", "C12", "C44"];
          const potentialVectors: Record<string, number[]> = {};
          for (const row of errorRows.results as Array<{ potential_id: string; property: string; rel_error: number }>) {
            const idx = properties.indexOf(row.property);
            if (idx < 0) continue;
            if (!potentialVectors[row.potential_id]) potentialVectors[row.potential_id] = new Array(properties.length).fill(NaN);
            potentialVectors[row.potential_id][idx] = row.rel_error;
          }

          // Filter to complete vectors only
          const vectors = Object.entries(potentialVectors)
            .filter(([, v]) => v.every(x => !isNaN(x)))
            .map(([id, v]) => ({ id, v }));

          if (vectors.length >= 3) {
            // Compute covariance matrix
            const n = vectors.length;
            const dim = properties.length;
            const means = new Array(dim).fill(0);
            for (const { v } of vectors) for (let j = 0; j < dim; j++) means[j] += v[j] / n;
            const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
            for (const { v } of vectors) {
              for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) {
                cov[i][j] += (v[i] - means[i]) * (v[j] - means[j]) / (n - 1);
              }
            }

            // Power iteration for top eigenvalue
            let ev = new Array(dim).fill(1);
            for (let iter = 0; iter < 100; iter++) {
              const next = new Array(dim).fill(0);
              for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) next[i] += cov[i][j] * ev[j];
              const norm = Math.sqrt(next.reduce((s, x) => s + x * x, 0));
              if (norm === 0) break;
              ev = next.map(x => x / norm);
            }
            const Av = new Array(dim).fill(0);
            for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) Av[i] += cov[i][j] * ev[j];
            const lambda1 = Av.reduce((s, x, i) => s + x * ev[i], 0);
            const traceC = cov.reduce((s, row, i) => s + row[i], 0);
            const PR = traceC > 0 ? (traceC * traceC) / cov.reduce((s, row, i) => s + row[i] * row[i], 0) : 0;

            results.manifold = {
              vectorCount: vectors.length,
              properties,
              means: means.map(m => +m.toFixed(6)),
              covarianceMatrix: cov.map(row => row.map(x => +x.toFixed(6))),
              topEigenvalue: +lambda1.toFixed(6),
              traceCovariance: +traceC.toFixed(6),
              participationRatio: +PR.toFixed(4),
              hyperRibbon: PR < 2.0,
              principalDirection: ev.map(x => +x.toFixed(4)),
            };
          } else {
            results.manifold = { error: "Insufficient complete vectors", vectorCount: vectors.length };
          }
        }

        // Causal analysis: screen for Simpson's Paradox
        if (analysisTypes.includes("causal")) {
          const causalConditions: string[] = ["property IN ('C11', 'C12', 'C44')", "reference != 0"];
          if (element) causalConditions.push(`element = '${element}'`);
          if (excludeStyles.length > 0) causalConditions.push(`pair_style NOT IN (${excludeStyles.map(s => `'${s}'`).join(',')})`);
          if (onlyStyles.length > 0) causalConditions.push(`pair_style IN (${onlyStyles.map(s => `'${s}'`).join(',')})`);
          const causalWhere = `WHERE ${causalConditions.join(' AND ')}`;

          const pooled = await env.LEDGER.prepare(
            `SELECT reference, predicted FROM records ${causalWhere}`
          ).all();
          const pooledRows = pooled.results as Array<{ reference: number; predicted: number }>;

          // Pearson correlation helper
          const pearson = (data: Array<{ reference: number; predicted: number }>) => {
            const n = data.length;
            if (n < 3) return NaN;
            const mx = data.reduce((s, r) => s + r.reference, 0) / n;
            const my = data.reduce((s, r) => s + r.predicted, 0) / n;
            let num = 0, dx = 0, dy = 0;
            for (const r of data) {
              num += (r.reference - mx) * (r.predicted - my);
              dx += (r.reference - mx) ** 2;
              dy += (r.predicted - my) ** 2;
            }
            return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : NaN;
          };

          const pooledR = pearson(pooledRows);

          // Within-element correlations
          const elements = [...new Set(pooledRows.map(() => ""))]; // need actual query
          const elementGroups = await env.LEDGER.prepare(
            `SELECT element, reference, predicted FROM records ${causalWhere}`
          ).all();
          const byElement: Record<string, Array<{ reference: number; predicted: number }>> = {};
          for (const row of elementGroups.results as Array<{ element: string; reference: number; predicted: number }>) {
            if (!byElement[row.element]) byElement[row.element] = [];
            byElement[row.element].push({ reference: row.reference, predicted: row.predicted });
          }
          const withinElement = Object.entries(byElement).map(([el, data]) => ({
            element: el, n: data.length, r: +pearson(data).toFixed(4),
          }));

          // Within-pair_style correlations
          const styleGroups = await env.LEDGER.prepare(
            `SELECT pair_style, reference, predicted FROM records ${causalWhere}`
          ).all();
          const byStyle: Record<string, Array<{ reference: number; predicted: number }>> = {};
          for (const row of styleGroups.results as Array<{ pair_style: string; reference: number; predicted: number }>) {
            if (!byStyle[row.pair_style]) byStyle[row.pair_style] = [];
            byStyle[row.pair_style].push({ reference: row.reference, predicted: row.predicted });
          }
          const withinStyle = Object.entries(byStyle).map(([style, data]) => ({
            pair_style: style, n: data.length, r: +pearson(data).toFixed(4),
          }));

          // Detect reversals (Simpson's Paradox)
          const paradoxes = withinElement
            .filter(w => !isNaN(w.r) && !isNaN(pooledR) && Math.sign(w.r) !== Math.sign(pooledR))
            .map(w => ({ element: w.element, withinR: w.r, pooledR: +pooledR.toFixed(4) }));

          results.causal = {
            pooledCorrelation: +pooledR.toFixed(4),
            pooledN: pooledRows.length,
            withinElement,
            withinPairStyle: withinStyle,
            simpsonsParadoxes: paradoxes,
            paradoxDetected: paradoxes.length > 0,
          };
        }

        // === AUTO-DIARY: Every analysis produces a research article ===
        if (analysisTypes.length > 0) {
          try {
            const router = new ModelRouter(env);
            const articlePrompt = buildAnalysisArticlePrompt(results);
            const aiResult = await router.complete("hypothesis", articlePrompt, {
              temperature: 0.6,
              maxTokens: 2048,
              systemPrompt: `You are a rigorous materials science research analyst writing entries for a running research diary. You are given statistical analysis results from a corpus of interatomic potential benchmarks (elastic constants C11, C12, C44 measured across many potentials and elements).

Your job:
1. State what was measured and how many datapoints were involved
2. Identify the most notable patterns in the numbers — but DO NOT claim causation or certainty. Use language like "appears to", "consistent with", "warrants investigation"
3. Flag anything surprising, anomalous, or that contradicts naive expectations
4. End with 1-3 specific follow-up questions the data raises
5. Be concise: 3-5 paragraphs max. Use markdown formatting.
6. Include actual numbers from the results — this is a data diary, not a summary

CRITICAL: Do not fabricate numbers. Only reference values present in the input data. If data is missing for a claim, say so explicitly.`,
            });

            const narrative = (aiResult.text ?? "").trim();
            if (narrative) {
              // Store in R2 with timestamp
              const articleId = `diary/${new Date().toISOString().replace(/[:.]/g, '-')}_${element || 'global'}.md`;
              const articleMeta = {
                timestamp: results.timestamp,
                element: element || "global",
                analysisTypes,
                excludeStyles: excludeStyles,
                onlyStyles: onlyStyles,
                provider: aiResult.provider,
                model: aiResult.model,
              };
              const fullArticle = `---
${Object.entries(articleMeta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}
---

${narrative}
`;
              await env.ARTIFACTS.put(articleId, fullArticle, {
                httpMetadata: { contentType: "text/markdown" },
                customMetadata: { element: element || "global", type: "diary" },
              });

              results.diary = {
                narrative,
                articleId,
                provider: aiResult.provider,
                model: aiResult.model,
              };

              // Cache latest for the real-time feed
              await env.ARTIFACTS.put('diary/latest.json', JSON.stringify(results.diary), {
                httpMetadata: { contentType: "application/json" }
              });
              await env.ARTIFACTS.put('metrics/latest.json', JSON.stringify({
                manifold: results.manifold,
                causal: results.causal,
                timestamp: results.timestamp
              }), { httpMetadata: { contentType: "application/json" } });
            }
          } catch (e) {
            console.error("Auto-diary error:", e);
            results.diary = { error: String(e), narrative: null };
          }
        }

        return Response.json(results);
      }

      // Fleet operations
      if (url.pathname === "/fleet/run" && request.method === "POST") {
        const id = env.FLEET_ORCHESTRATOR.idFromName("fleet-main-v2");
        const stub = env.FLEET_ORCHESTRATOR.get(id);
        return stub.fetch(new Request("http://internal/fleet/run", {
          method: "POST",
          body: bodyText,
        }));
      }

      if (url.pathname === "/fleet/status") {
        const id = env.FLEET_ORCHESTRATOR.idFromName("fleet-main-v2");
        const stub = env.FLEET_ORCHESTRATOR.get(id);
        return stub.fetch(new Request("http://internal/fleet/status"));
      }

      if (url.pathname === "/fleet/schedule" && request.method === "POST") {
        const id = env.FLEET_ORCHESTRATOR.idFromName("fleet-main-v2");
        const stub = env.FLEET_ORCHESTRATOR.get(id);
        return stub.fetch(new Request("http://internal/fleet/schedule", {
          method: "POST",
          body: bodyText,
        }));
      }

      // Dashboard
      if (url.pathname === "/dashboard" || url.pathname === "/dashboard/ws") {
        const id = env.DASHBOARD.idFromName("dash-main-v2");
        const stub = env.DASHBOARD.get(id);
        return stub.fetch(request);
      }

      // Experiment queue management
      if (url.pathname === "/experiments/pending") {
        const rows = await env.LEDGER.prepare(
          `SELECT * FROM pending_experiments WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`
        ).all();
        return Response.json({ experiments: rows.results });
      }

      if (url.pathname === "/experiments/complete" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const experimentId = typeof body.experiment_id === "string" ? body.experiment_id : null;
        if (!experimentId) {
          return Response.json({ error: "Missing experiment_id" }, { status: 400 });
        }
        await env.LEDGER.prepare(
          `UPDATE pending_experiments SET status = 'completed', completed_at = datetime('now') WHERE experiment_id = ?1`
        ).bind(experimentId).run();
        return Response.json({ completed: experimentId });
      }

      // Batch record ingestion
      if (url.pathname === "/ingest/batch" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const records = Array.isArray(body.records) ? body.records as BenchmarkRecord[] : [];
        if (records.length === 0) {
          return Response.json({ ingested: 0 }, { status: 400 });
        }

        let inserted = 0;
        for (const r of records) {
          try {
            await env.LEDGER.prepare(
              `INSERT INTO records (record_id, element, potential_id, potential_label, pair_style, property, reference, predicted, unit, provenance, agent_id, timestamp)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
               ON CONFLICT(record_id) DO NOTHING`
            ).bind(
              r.recordId, r.element, r.potentialId, r.potentialLabel,
              r.pairStyle, r.property, r.reference, r.predicted,
              r.unit, JSON.stringify(r.provenance), r.agentId, r.timestamp
            ).run();
            inserted++;
          } catch (e) {
            console.error("Ingest error for record", r.recordId, e);
          }
        }
        return Response.json({ ingested: inserted, total: records.length });
      }

      // Diary narrative generation
      if (url.pathname === "/diary/draft" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const element = typeof body.element === "string" ? body.element : "unknown";
        const potential = typeof body.potential === "string" ? body.potential : "unknown";
        const structure = typeof body.structure === "string" ? body.structure : "fcc";
        const records = Array.isArray(body.records) ? body.records as Array<{ property: string; reference: number; predicted: number; unit: string }> : [];

        const router = new ModelRouter(env);
        const prompt = buildDiaryPrompt(element, potential, structure, records);

        try {
          const result = await router.complete("hypothesis", prompt, {
            temperature: 0.7,
            maxTokens: 1024,
            systemPrompt: `You are a materials science research assistant writing a running lab diary. Interpret LAMMPS benchmark results concisely. Write 2-3 paragraphs of markdown. Focus on physical insight: what do the errors reveal about the potential's strengths and weaknesses? Mention specific properties. Keep it technical but readable.`,
          });
          const text = (result.text ?? "").trim();
          if (!text) {
            return Response.json({ narrative: "_No narrative generated by LLM._", provider: result.provider, model: result.model });
          }
          return Response.json({ narrative: text, provider: result.provider, model: result.model });
        } catch (e) {
          console.error("Diary draft error:", e);
          return Response.json({ narrative: "_LLM narrative unavailable — see Results table above._", error: String(e) });
        }
      }

      // Extension management
      if (url.pathname.startsWith("/ext")) {
        const id = env.EXTENSION_MANAGER.idFromName("ext-main-v2");
        const stub = env.EXTENSION_MANAGER.get(id);
        return stub.fetch(request);
      }

      // ─── Ops: Deployment observability ───
      if (url.pathname === "/ops/report" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const repo = typeof body.repo === "string" ? body.repo : "";
        const workflow = typeof body.workflow === "string" ? body.workflow : "";
        const runId = typeof body.run_id === "string" ? body.run_id : "";
        const status = typeof body.status === "string" ? body.status : "";
        const commitSha = typeof body.commit_sha === "string" ? body.commit_sha : null;
        const branch = typeof body.branch === "string" ? body.branch : null;
        const service = typeof body.service === "string" ? body.service : "";
        const runUrl = typeof body.run_url === "string" ? body.run_url : null;
        const startedAt = typeof body.started_at === "string" ? body.started_at : null;
        const logs = typeof body.logs === "string" ? body.logs : null;

        if (!repo || !workflow || !runId || !status || !service) {
          return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        await env.LEDGER.prepare(
          `INSERT INTO deployments (repo, workflow, run_id, status, commit_sha, branch, service, run_url, started_at, logs)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
        ).bind(repo, workflow, runId, status, commitSha, branch, service, runUrl, startedAt, logs).run();

        return Response.json({ reported: true }, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (url.pathname === "/ops/report" && request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      if (url.pathname === "/ops/deployments") {
        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Max-Age": "86400",
            },
          });
        }

        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
        const service = url.searchParams.get("service");

        let rows;
        if (service) {
          rows = await env.LEDGER.prepare(
            `SELECT * FROM deployments WHERE service = ?1 ORDER BY completed_at DESC LIMIT ?2`
          ).bind(service, limit).all();
        } else {
          rows = await env.LEDGER.prepare(
            `SELECT * FROM deployments ORDER BY completed_at DESC LIMIT ?1`
          ).bind(limit).all();
        }

        return Response.json({ deployments: rows.results }, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // ─── Research Status API ───
      if (url.pathname === "/research/causal-geometry") {
        const latestRecords = await env.LEDGER.prepare(
          "SELECT COUNT(*) as n FROM records"
        ).all();
        const pendingCount = await env.LEDGER.prepare(
          "SELECT COUNT(*) as n FROM pending_experiments WHERE status = 'pending'"
        ).all();
        const completedCount = await env.LEDGER.prepare(
          "SELECT COUNT(*) as n FROM pending_experiments WHERE status = 'completed'"
        ).all();

        return Response.json({
          status: "active",
          research_mode: "causal-geometry",
          hypotheses: {
            h1_hyperribbon: {
              claim: "Prediction errors universally occupy hyper-ribbon manifolds (PR/d < 0.9)",
              status: "confirmed_classical",
              evidence: "559 potentials, 15 elements, 100% pass geometric-sequence test",
              next_step: "Validate on MLIPs (MACE-MP-0, CHGNet, M3GNet)",
            },
            h2_bcc_fcc: {
              claim: "BCC metals show strong ref-pred correlations (r>0.7); FCC metals show weak correlations (r<0.4)",
              status: "confirmed",
              evidence: "I² = 98.6%, subgroup Q = 537.7 (p < 0.001)",
              causal_mechanism: "Directional d-orbital bonding in BCC creates constrained prediction landscape",
            },
            h3_ecological_fallacy: {
              claim: "Aggregating across elements obscures true accuracy",
              status: "confirmed",
              evidence: "Pooled r=0.82 vs within-group r=0.95; true Simpson's paradox with sign reversal demonstrated",
            },
            h4_mlip_invariance: {
              claim: "Modern MLIPs share the same error manifold as classical potentials",
              status: "pending",
              protocol: "mlip_benchmark_protocol.json",
              models: ["MACE-MP-0", "CHGNet", "M3GNet"],
            },
          },
          stats: {
            total_records: (latestRecords.results[0] as any)?.n || 0,
            pending_experiments: (pendingCount.results[0] as any)?.n || 0,
            completed_experiments: (completedCount.results[0] as any)?.n || 0,
          },
          critique_response: {
            strengthened_classifier: "FPR reduced 5x (90% → 17%) via geometric-sequence test",
            causal_identification: "Pearl back-door criterion satisfied; stratification by CS blocks confounding",
            simpsons_paradox: "True sign reversal demonstrated computationally",
            public_data: "Full pipeline integrated; benchmarks regenerate from OpenKIM on deploy",
          },
        }, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // Real-time Dashboard Feed API (split into edge-cached endpoints in Phase D).
      // /feed/* routes are handled by feed/split.ts. /feed (no suffix) is a
      // back-compat shim that returns the union for clients on the old protocol.
      const feedResponse = await handleFeedRoute(request, env);
      if (feedResponse) return feedResponse;

      if (url.pathname === "/broadcasts") {
        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Max-Age": "86400",
            },
          });
        }

        const limit = Math.min(parseInt(url.searchParams.get("limit") || "12", 10), 48);
        try {
          await env.LEDGER.prepare(
            `CREATE TABLE IF NOT EXISTS lab_broadcasts (
              broadcast_id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              summary TEXT NOT NULL,
              status TEXT NOT NULL,
              cadence TEXT NOT NULL DEFAULT 'hourly',
              metrics TEXT,
              artifact_key TEXT,
              created_at TEXT DEFAULT (datetime('now'))
            )`
          ).run();
          const rows = await env.LEDGER.prepare(
            `SELECT broadcast_id, title, summary, status, cadence, metrics, artifact_key, created_at
             FROM lab_broadcasts
             ORDER BY created_at DESC
             LIMIT ?1`
          ).bind(limit).all();
          return Response.json({
            broadcasts: (rows.results as Array<Record<string, unknown>>).map((row) => ({
              ...row,
              metrics: typeof row.metrics === "string" ? JSON.parse(row.metrics) : row.metrics,
            })),
          }, {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          });
        } catch (e) {
          console.error("Broadcast list error:", e);
          return Response.json({ broadcasts: [], error: String(e) }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }
      }

      if (url.pathname === "/broadcasts/trigger" && request.method === "POST") {
        const broadcast = await createLabBroadcast(env, "manual");
        return Response.json({ broadcast }, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      // === unit-1: hypotheses routes ===
      if (url.pathname === "/hypotheses" || url.pathname.startsWith("/hypotheses/")) {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: { ...JSON_CORS_HEADERS, "Access-Control-Max-Age": "86400" } });
        }

        if (url.pathname === "/hypotheses" && request.method === "GET") {
          const rows = await env.LEDGER.prepare(
            `${HYPOTHESIS_SELECT} ORDER BY created_at`
          ).all<HypothesisRecord>();
          return Response.json(rows.results ?? [], { headers: JSON_CORS_HEADERS });
        }

        if (url.pathname === "/hypotheses" && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const title = typeof body.title === "string" ? body.title.trim() : "";
          const status = typeof body.status === "string" ? body.status as HypothesisStatus : null;

          if (!title) {
            return jsonError("Missing required field: title", 400);
          }
          if (!status || !VALID_HYPOTHESIS_STATUSES.has(status)) {
            return jsonError(`Invalid status. Must be one of: ${[...VALID_HYPOTHESIS_STATUSES].join(", ")}`, 400);
          }

          const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : `h${Date.now()}`;
          const confidence = typeof body.confidence === "number" ? body.confidence : null;
          const evidenceIds = typeof body.evidence_ids === "string" ? body.evidence_ids : null;
          const agentId = typeof body.agent_id === "string" ? body.agent_id : null;
          const now = new Date().toISOString();

          try {
            await env.LEDGER.prepare(
              `INSERT INTO hypotheses (id, title, status, confidence, evidence_ids, agent_id, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
            ).bind(id, title, status, confidence, evidenceIds, agentId, now, now).run();
          } catch (e) {
            const msg = String(e);
            const isConflict = msg.includes("UNIQUE") || msg.includes("PRIMARY KEY");
            return jsonError(
              isConflict ? `Hypothesis with id '${id}' already exists` : msg,
              isConflict ? 409 : 500
            );
          }

          const created = await selectHypothesisById(env, id);
          return Response.json(created, { status: 201, headers: JSON_CORS_HEADERS });
        }

        const idMatch = url.pathname.match(/^\/hypotheses\/([^/]+)$/);
        if (idMatch) {
          const id = decodeURIComponent(idMatch[1]);

          if (request.method === "GET") {
            const row = await selectHypothesisById(env, id);
            if (!row) return jsonError(`Hypothesis '${id}' not found`, 404);
            return Response.json(row, { headers: JSON_CORS_HEADERS });
          }

          if (request.method === "PATCH") {
            const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
            const sets: string[] = [];
            const binds: unknown[] = [];

            if (body.status !== undefined) {
              const status = body.status as HypothesisStatus;
              if (!VALID_HYPOTHESIS_STATUSES.has(status)) {
                return jsonError(`Invalid status. Must be one of: ${[...VALID_HYPOTHESIS_STATUSES].join(", ")}`, 400);
              }
              sets.push(`status = ?${sets.length + 1}`);
              binds.push(status);
            }
            if (body.confidence !== undefined) {
              if (body.confidence !== null && typeof body.confidence !== "number") {
                return jsonError("confidence must be a number or null", 400);
              }
              sets.push(`confidence = ?${sets.length + 1}`);
              binds.push(body.confidence);
            }
            if (body.evidence_ids !== undefined) {
              if (body.evidence_ids !== null && typeof body.evidence_ids !== "string") {
                return jsonError("evidence_ids must be a string or null", 400);
              }
              sets.push(`evidence_ids = ?${sets.length + 1}`);
              binds.push(body.evidence_ids);
            }

            if (sets.length === 0) {
              return jsonError("No updatable fields supplied", 400);
            }

            sets.push(`updated_at = ?${sets.length + 1}`);
            binds.push(new Date().toISOString());
            binds.push(id);

            await env.LEDGER.prepare(
              `UPDATE hypotheses SET ${sets.join(", ")} WHERE id = ?${binds.length}`
            ).bind(...binds).run();

            const updated = await selectHypothesisById(env, id);
            if (!updated) return jsonError(`Hypothesis '${id}' not found`, 404);
            return Response.json(updated, { headers: JSON_CORS_HEADERS });
          }

          return new Response("Method Not Allowed", { status: 405, headers: { ...JSON_CORS_HEADERS, "Allow": "GET, PATCH, OPTIONS" } });
        }

        return new Response("Method Not Allowed", { status: 405, headers: { ...JSON_CORS_HEADERS, "Allow": "GET, POST, OPTIONS" } });
      }

      // === unit-2: critiques routes ===
      // Persistence + dispatch for peer-review critiques. Backed by
      // D1 table `critiques` (see migrations/0002_critiques.sql) and
      // R2 artifacts at `critiques/{id}.md`.
      const CRITIQUE_COLS = `id, source, question, target_hypothesis_id, status,
             response_md, response_artifact_key, created_at, completed_at`;
      const VALID_CRITIQUE_STATUSES: readonly CritiqueStatus[] = ["pending", "in_progress", "completed"];

      // GET /critiques/pending?limit=N — list status=pending (default 50)
      if (url.pathname === "/critiques/pending" && request.method === "GET") {
        const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0
          ? Math.min(rawLimit, 500)
          : 50;
        const rows = await env.LEDGER.prepare(
          `SELECT ${CRITIQUE_COLS}
             FROM critiques
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT ?1`,
        ).bind(limit).all<Critique>();
        return Response.json({ critiques: rows.results, count: rows.results.length });
      }

      // POST /critiques — create new critique
      if (url.pathname === "/critiques" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const source = typeof body.source === "string" ? body.source : "";
        const question = typeof body.question === "string" ? body.question : "";
        if (!source || !question) {
          return Response.json(
            { error: "Missing required fields: source, question" },
            { status: 400 },
          );
        }
        const target_hypothesis_id = typeof body.target_hypothesis_id === "string"
          ? body.target_hypothesis_id
          : null;
        const id = typeof body.id === "string" && body.id.trim().length > 0
          ? body.id
          : `c${Date.now()}`;
        const created_at = new Date().toISOString();

        try {
          await env.LEDGER.prepare(
            `INSERT INTO critiques
               (id, source, question, target_hypothesis_id, status, created_at)
             VALUES (?1, ?2, ?3, ?4, 'pending', ?5)`,
          )
            .bind(id, source, question, target_hypothesis_id, created_at)
            .run();
        } catch (insertErr) {
          // 409 instead of 500 because PRIMARY KEY collisions are a client problem.
          return Response.json(
            { error: "Insert failed (id may already exist)", detail: String(insertErr) },
            { status: 409 },
          );
        }

        const critique: Critique = {
          id,
          source,
          question,
          target_hypothesis_id,
          status: "pending",
          response_md: null,
          response_artifact_key: null,
          created_at,
          completed_at: null,
        };
        return Response.json({ critique }, { status: 201 });
      }

      // GET /critiques?status=&source=  — filterable list
      if (url.pathname === "/critiques" && request.method === "GET") {
        const status = url.searchParams.get("status");
        const source = url.searchParams.get("source");

        const where: string[] = [];
        const binds: string[] = [];
        if (status) {
          if (!VALID_CRITIQUE_STATUSES.includes(status as CritiqueStatus)) {
            return Response.json(
              { error: `Invalid status. Must be one of: ${VALID_CRITIQUE_STATUSES.join(", ")}` },
              { status: 400 },
            );
          }
          where.push(`status = ?${binds.length + 1}`);
          binds.push(status);
        }
        if (source) {
          where.push(`source = ?${binds.length + 1}`);
          binds.push(source);
        }
        const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
        const rows = await env.LEDGER.prepare(
          `SELECT ${CRITIQUE_COLS}
             FROM critiques
             ${whereSql}
             ORDER BY created_at ASC`,
        ).bind(...binds).all<Critique>();
        return Response.json({ critiques: rows.results, count: rows.results.length });
      }

      // POST /critiques/:id/respond — write response_md to R2 + complete in D1
      const respondMatch = url.pathname.match(/^\/critiques\/([^/]+)\/respond$/);
      if (respondMatch && request.method === "POST") {
        const id = decodeURIComponent(respondMatch[1]);
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const response_md = typeof body.response_md === "string" ? body.response_md : "";
        const agent_id = typeof body.agent_id === "string" ? body.agent_id : undefined;
        if (!response_md.trim()) {
          return Response.json(
            { error: "Missing required field: response_md" },
            { status: 400 },
          );
        }
        try {
          const result = await respondToCritique(env, id, response_md, agent_id);
          if (!result.critique) {
            return Response.json({ error: `Critique not found: ${id}` }, { status: 404 });
          }
          return Response.json({ critique: result.critique, artifactKey: result.artifactKey });
        } catch (respondErr) {
          console.error("respondToCritique error:", respondErr);
          return Response.json(
            { error: "Failed to record response", detail: String(respondErr) },
            { status: 500 },
          );
        }
      }

      // GET /critiques/:id — single (the /pending check above already consumed that path)
      const singleMatch = url.pathname.match(/^\/critiques\/([^/]+)$/);
      if (singleMatch && request.method === "GET") {
        const id = decodeURIComponent(singleMatch[1]);
        const row = await env.LEDGER.prepare(
          `SELECT ${CRITIQUE_COLS}
             FROM critiques
            WHERE id = ?1`,
        ).bind(id).first<Critique>();
        if (!row) {
          return Response.json({ error: `Critique not found: ${id}` }, { status: 404 });
        }
        return Response.json({ critique: row });
      }
      // === end unit-2 ===

      // === unit-3: research_questions routes ===
      // Lab-notebook style Q/A queue. Distinct from /research/causal-geometry
      // (read-only hypothesis status above) and from formal peer-review
      // critiques (unit-2). Persisted in D1 (research_questions table);
      // long-form answers optionally mirrored to R2 at research/{id}.md.
      const RQ_LIST_RE = /^\/research\/questions$/;
      const RQ_ANSWER_RE = /^\/research\/questions\/([^/]+)\/answer$/;
      const RQ_ITEM_RE = /^\/research\/questions\/([^/]+)$/;
      const isResearchQuestionsRoute =
        RQ_LIST_RE.test(url.pathname) ||
        RQ_ANSWER_RE.test(url.pathname) ||
        RQ_ITEM_RE.test(url.pathname);

      if (isResearchQuestionsRoute) {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        } as const;

        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        // POST /research/questions — create a new question
        if (RQ_LIST_RE.test(url.pathname) && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const question = typeof body.question === "string" ? body.question.trim() : "";
          if (!question) {
            return Response.json(
              { error: "Missing required field: question" },
              { status: 400, headers: corsHeaders }
            );
          }
          const id = typeof body.id === "string" && body.id.trim().length > 0
            ? body.id.trim()
            : `rq${Date.now()}`;
          const askedBy = typeof body.asked_by === "string" ? body.asked_by : null;
          const targetHypothesisId = typeof body.target_hypothesis_id === "string"
            ? body.target_hypothesis_id
            : null;
          const createdAt = new Date().toISOString();

          let created: ResearchQuestion | null;
          try {
            created = await env.LEDGER.prepare(
              `INSERT INTO research_questions
                 (id, question, asked_by, status, target_hypothesis_id, created_at)
               VALUES (?1, ?2, ?3, 'open', ?4, ?5)
               RETURNING *`
            ).bind(id, question, askedBy, targetHypothesisId, createdAt)
              .first<ResearchQuestion>();
          } catch (e) {
            console.error("research_questions insert error:", e);
            return Response.json(
              { error: "Failed to create question", detail: String(e) },
              { status: 500, headers: corsHeaders }
            );
          }
          return Response.json(created, { status: 201, headers: corsHeaders });
        }

        // GET /research/questions — list (optional ?status=&limit=N)
        if (RQ_LIST_RE.test(url.pathname) && request.method === "GET") {
          const statusParam = url.searchParams.get("status");
          const allowedStatuses: ResearchQuestionStatus[] = ["open", "in_progress", "answered"];
          const status = statusParam && (allowedStatuses as string[]).includes(statusParam)
            ? (statusParam as ResearchQuestionStatus)
            : null;
          const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
          const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500
            ? limitRaw
            : 50;

          const rows = status
            ? await env.LEDGER.prepare(
                `SELECT * FROM research_questions
                 WHERE status = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2`
              ).bind(status, limit).all<ResearchQuestion>()
            : await env.LEDGER.prepare(
                `SELECT * FROM research_questions
                 ORDER BY created_at DESC
                 LIMIT ?1`
              ).bind(limit).all<ResearchQuestion>();

          return Response.json(
            { questions: rows.results, count: rows.results.length, limit, status },
            { headers: corsHeaders }
          );
        }

        // POST /research/questions/:id/answer — record an answer
        const answerMatch = url.pathname.match(RQ_ANSWER_RE);
        if (answerMatch && request.method === "POST") {
          const id = answerMatch[1];
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const answerMd = typeof body.answer_md === "string" ? body.answer_md : "";
          if (!answerMd.trim()) {
            return Response.json(
              { error: "Missing required field: answer_md" },
              { status: 400, headers: corsHeaders }
            );
          }
          const agentId = typeof body.agent_id === "string" ? body.agent_id : null;
          const artifactKey = `research/${id}.md`;
          const answeredAt = new Date().toISOString();

          // Single UPDATE...RETURNING handles existence check + write + read.
          const updated = await env.LEDGER.prepare(
            `UPDATE research_questions
             SET answer_md = ?1,
                 answer_artifact_key = ?2,
                 status = 'answered',
                 answered_at = ?3
             WHERE id = ?4
             RETURNING *`
          ).bind(answerMd, artifactKey, answeredAt, id).first<ResearchQuestion>();

          if (!updated) {
            return Response.json(
              { error: `Question not found: ${id}` },
              { status: 404, headers: corsHeaders }
            );
          }

          // Mirror answer to R2 for long-form / linkable artifact (best-effort;
          // D1 row is the source of truth, so R2 failure must not abort).
          const artifactBody = [
            `# Research Question ${id}`,
            ...(agentId ? [`_Answered by: ${agentId}_`] : []),
            `_Answered at: ${answeredAt}_`,
            "",
            answerMd,
          ].join("\n");
          try {
            await env.ARTIFACTS.put(artifactKey, artifactBody, {
              httpMetadata: { contentType: "text/markdown; charset=utf-8" },
            });
          } catch (e) {
            console.error("research_questions R2 write error:", e);
          }

          return Response.json(updated, { headers: corsHeaders });
        }

        // GET /research/questions/:id — single (must come AFTER /answer match)
        const itemMatch = url.pathname.match(RQ_ITEM_RE);
        if (itemMatch && request.method === "GET") {
          const id = itemMatch[1];
          const row = await env.LEDGER.prepare(
            `SELECT * FROM research_questions WHERE id = ?1`
          ).bind(id).first<ResearchQuestion>();
          if (!row) {
            return Response.json(
              { error: `Question not found: ${id}` },
              { status: 404, headers: corsHeaders }
            );
          }
          return Response.json(row, { headers: corsHeaders });
        }

        return Response.json(
          { error: "Method not allowed for research_questions route" },
          { status: 405, headers: corsHeaders }
        );
      }

      // === claims routes (distill verdict bridge) ===
      // Mirrors lupine-distill's `claims` table; see migrations/0004_claims.sql.
      // Distill is the producer (cross-style-pc1, rank-correlation, theorize-cycle, ...);
      // the worker is the consumer for the Theorist agent and /lab dashboard.
      const CLAIM_COLS =
        `claim_id, agent_id, claim_type, claim_data, evidence_ids, confidence, status, description, created_at`;

      if (url.pathname === "/claims/ingest" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const claims = Array.isArray(body.claims) ? body.claims as Array<Record<string, unknown>> : [];
        if (claims.length === 0) {
          return Response.json({ ingested: 0, total: 0 }, { status: 400, headers: JSON_CORS_HEADERS });
        }

        let inserted = 0;
        const errors: Array<{ claim_id: string; error: string }> = [];
        for (const c of claims) {
          const claimId = typeof c.claim_id === "string" ? c.claim_id : "";
          const agentId = typeof c.agent_id === "string" ? c.agent_id : "";
          const claimType = typeof c.claim_type === "string" ? c.claim_type : "";
          const description = typeof c.description === "string" ? c.description : "";
          if (!claimId || !agentId || !claimType || !description) {
            errors.push({ claim_id: claimId || "<missing>", error: "missing required fields (claim_id, agent_id, claim_type, description)" });
            continue;
          }
          const claimData =
            typeof c.claim_data === "string" ? c.claim_data
            : c.claim_data !== undefined ? JSON.stringify(c.claim_data)
            : "{}";
          const evidenceIds =
            typeof c.evidence_ids === "string" ? c.evidence_ids
            : Array.isArray(c.evidence_ids) ? JSON.stringify(c.evidence_ids)
            : "[]";
          const confidence = typeof c.confidence === "number" ? c.confidence : 0;
          const status = typeof c.status === "string" ? c.status : "proposed";
          const createdAt = typeof c.created_at === "string" ? c.created_at : new Date().toISOString();

          try {
            await env.LEDGER.prepare(
              `INSERT INTO claims
                 (claim_id, agent_id, claim_type, claim_data, evidence_ids, confidence, status, description, created_at, timestamp)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
               ON CONFLICT(claim_id) DO NOTHING`
            ).bind(claimId, agentId, claimType, claimData, evidenceIds, confidence, status, description, createdAt).run();
            inserted++;
          } catch (e) {
            errors.push({ claim_id: claimId, error: String(e) });
          }
        }
        return Response.json(
          { ingested: inserted, total: claims.length, errors },
          { headers: JSON_CORS_HEADERS }
        );
      }

      if (url.pathname === "/claims" && request.method === "GET") {
        const status = url.searchParams.get("status");
        const claimType = url.searchParams.get("claim_type");
        const agentId = url.searchParams.get("agent_id");
        const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 50;

        const where: string[] = [];
        const binds: unknown[] = [];
        if (status) { where.push(`status = ?${binds.length + 1}`); binds.push(status); }
        if (claimType) { where.push(`claim_type = ?${binds.length + 1}`); binds.push(claimType); }
        if (agentId) { where.push(`agent_id = ?${binds.length + 1}`); binds.push(agentId); }

        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
        binds.push(limit);
        const rows = await env.LEDGER.prepare(
          `SELECT ${CLAIM_COLS} FROM claims ${whereClause}
           ORDER BY created_at DESC LIMIT ?${binds.length}`
        ).bind(...binds).all<ClaimRecord>();

        return Response.json(
          { claims: rows.results, count: rows.results.length, limit, status, claim_type: claimType, agent_id: agentId },
          { headers: JSON_CORS_HEADERS }
        );
      }

      const claimItemMatch = url.pathname.match(/^\/claims\/([^/]+)$/);
      if (claimItemMatch && claimItemMatch[1] !== "ingest" && request.method === "GET") {
        const id = decodeURIComponent(claimItemMatch[1]);
        const row = await env.LEDGER.prepare(
          `SELECT ${CLAIM_COLS} FROM claims WHERE claim_id = ?1`
        ).bind(id).first<ClaimRecord>();
        if (!row) return jsonError(`Claim '${id}' not found`, 404);
        return Response.json(row, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname.startsWith("/claims") && request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { ...JSON_CORS_HEADERS, "Access-Control-Max-Age": "86400" } });
      }

      // === unit-9: openapi route ===
      if (url.pathname === "/openapi.json") {
        return Response.json(openApiSpec, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // === phase-C: research work queue ===
      if (url.pathname.startsWith("/research/")) {
        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: { ...JSON_CORS_HEADERS, "Access-Control-Max-Age": "86400" },
          });
        }

        const enqueueResponse = async (
          task: ResearchTask,
        ): Promise<Response> => {
          const result = await enqueueTask(env, task);
          return Response.json(
            { ...result, kind: task.kind, dedup_key: task.dedup_key },
            { headers: JSON_CORS_HEADERS },
          );
        };

        const nowIso = () => new Date().toISOString();

        if (url.pathname === "/research/round" && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const element = typeof body.element === "string" ? body.element : "";
          if (!element) return jsonError("Missing 'element'", 400);
          const analysis = Array.isArray(body.analysis_types)
            ? (body.analysis_types as string[])
            : ["manifold", "causal"];
          const exclude = Array.isArray(body.exclude_styles)
            ? (body.exclude_styles as string[])
            : [];
          const only = Array.isArray(body.only_styles)
            ? (body.only_styles as string[])
            : [];
          const dedupKey =
            typeof body.dedup_key === "string"
              ? body.dedup_key
              : `round:${element}:${analysis.sort().join(",")}:${only.sort().join(",")}:${exclude.sort().join(",")}`;
          return enqueueResponse({
            kind: "round",
            dedup_key: dedupKey,
            enqueued_at: nowIso(),
            element,
            analysis_types: analysis,
            exclude_styles: exclude,
            only_styles: only,
          });
        }

        if (url.pathname === "/research/literature" && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const query = typeof body.query === "string" ? body.query.trim() : "";
          if (!query) return jsonError("Missing 'query'", 400);
          const max =
            typeof body.max === "number" && Number.isFinite(body.max)
              ? Math.trunc(body.max)
              : 10;
          const sources = Array.isArray(body.sources)
            ? (body.sources as string[])
            : undefined;
          const dedupKey =
            typeof body.dedup_key === "string"
              ? body.dedup_key
              : `literature:${query}:${max}:${(sources ?? []).sort().join(",")}`;
          return enqueueResponse({
            kind: "literature",
            dedup_key: dedupKey,
            enqueued_at: nowIso(),
            query,
            max,
            sources,
          });
        }

        if (url.pathname === "/research/evaluate" && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const hypothesisId =
            typeof body.hypothesis_id === "string" ? body.hypothesis_id : "";
          if (!hypothesisId) return jsonError("Missing 'hypothesis_id'", 400);
          const iterations =
            typeof body.iterations === "number" ? body.iterations : 1000;
          const alpha =
            typeof body.alpha === "number" ? body.alpha : 0.05;
          const dedupKey =
            typeof body.dedup_key === "string"
              ? body.dedup_key
              : `evaluate:${hypothesisId}:${iterations}:${alpha}`;
          return enqueueResponse({
            kind: "evaluate",
            dedup_key: dedupKey,
            enqueued_at: nowIso(),
            hypothesis_id: hypothesisId,
            iterations,
            alpha,
          });
        }

        if (url.pathname === "/research/broadcast" && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
          const source =
            typeof body.source === "string" ? body.source : "manual-async";
          // For broadcasts we dedupe per-minute so rapid double-clicks coalesce
          const minuteBucket = new Date().toISOString().slice(0, 16);
          const dedupKey =
            typeof body.dedup_key === "string"
              ? body.dedup_key
              : `broadcast:${source}:${minuteBucket}`;
          return enqueueResponse({
            kind: "broadcast",
            dedup_key: dedupKey,
            enqueued_at: nowIso(),
            source,
          });
        }

        if (url.pathname === "/research/auto" && request.method === "POST") {
          // Manual orchestrator tick — same code path as the hourly cron.
          // Useful to test the auto-research loop without waiting.
          const result = await runOrchestratorTick(env);
          return Response.json(result, { headers: JSON_CORS_HEADERS });
        }

        if (url.pathname === "/research/jobs" && request.method === "GET") {
          const limit = Math.min(
            parseInt(url.searchParams.get("limit") ?? "20", 10) || 20,
            100,
          );
          const kindFilter = url.searchParams.get("kind");
          const outcomeFilter = url.searchParams.get("outcome");
          const conds: string[] = [];
          const binds: unknown[] = [];
          if (kindFilter) {
            conds.push(`kind = ?${binds.length + 1}`);
            binds.push(kindFilter);
          }
          if (outcomeFilter) {
            conds.push(`outcome = ?${binds.length + 1}`);
            binds.push(outcomeFilter);
          }
          const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
          const sql = `
            SELECT job_id, dedup_key, kind, payload, enqueued_at, started_at,
                   finished_at, outcome, error, attempts
              FROM research_jobs
              ${where}
              ORDER BY enqueued_at DESC
              LIMIT ?${binds.length + 1}
          `;
          binds.push(limit);
          try {
            const rows = await env.LEDGER.prepare(sql).bind(...binds).all();
            return Response.json(
              { jobs: rows.results ?? [], count: (rows.results ?? []).length },
              { headers: JSON_CORS_HEADERS },
            );
          } catch (e) {
            return Response.json(
              { jobs: [], count: 0, error: String(e) },
              { headers: JSON_CORS_HEADERS },
            );
          }
        }

        // === One-off Hailuo video with a custom prompt ===
        // Bypasses the cron auto-aggregation so a research round can
        // submit a video tuned to its actual narrative findings.
        if (url.pathname === "/research/vignette/submit" && request.method === "POST") {
          const body = JSON.parse(bodyText || "{}") as {
            prompt?: string;
            round_label?: string;
            claim_ids?: string[];
            first_frame_image?: string;
            model?: string;
            duration?: number;
          };
          if (!body.prompt) return jsonError("Missing prompt", 400);
          if (!body.round_label) return jsonError("Missing round_label", 400);
          if (body.prompt.length > 2000) return jsonError("prompt > 2000 chars", 400);
          const result = await submitCustomVignette(env, {
            prompt: body.prompt,
            round_label: body.round_label,
            claim_ids: Array.isArray(body.claim_ids) ? body.claim_ids : [],
            first_frame_image: body.first_frame_image,
            model: body.model,
            duration: body.duration,
          });
          return Response.json(result, { headers: JSON_CORS_HEADERS });
        }

        // === Hitlist: actionable findings extracted from M2.7 narratives ===
        // Public read so the live research surface can render open findings;
        // PATCH is also public on this worker (same auth posture as the rest
        // of /research/*).
        if (url.pathname === "/research/hitlist" && request.method === "GET") {
          const kindParam = url.searchParams.get("kind") as HitKind | null;
          const statusParam = url.searchParams.get("status") as HitStatus | null;
          const hypId = url.searchParams.get("hypothesis_id");
          const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30", 10) || 30, 100);
          const validKinds = new Set(["missing_experiment", "contradiction", "reinforcement", "surprise"]);
          const validStatuses = new Set(["open", "pursuing", "resolved", "dismissed"]);
          if (kindParam && !validKinds.has(kindParam)) return jsonError(`invalid kind: ${kindParam}`, 400);
          if (statusParam && !validStatuses.has(statusParam)) return jsonError(`invalid status: ${statusParam}`, 400);
          const result = await listHits(env, {
            kind: kindParam ?? undefined,
            status: statusParam ?? undefined,
            hypothesis_id: hypId ?? undefined,
            limit,
          });
          return Response.json(result, { headers: JSON_CORS_HEADERS });
        }

        const hitsPatchMatch = url.pathname.match(/^\/research\/hits\/([^/]+)$/);
        if (hitsPatchMatch && request.method === "PATCH") {
          const id = decodeURIComponent(hitsPatchMatch[1]);
          const body = JSON.parse(bodyText || "{}") as { status?: string; note?: string };
          if (!body.status) return jsonError("Missing status", 400);
          const validStatuses = new Set(["open", "pursuing", "resolved", "dismissed"]);
          if (!validStatuses.has(body.status)) return jsonError(`invalid status: ${body.status}`, 400);
          const result = await updateHitStatus(env, {
            id,
            status: body.status as HitStatus,
            note: body.note,
          });
          if (!result.ok) return jsonError(result.error ?? "update failed", 404);
          return Response.json(result, { headers: JSON_CORS_HEADERS });
        }

        return jsonError("Unknown /research/* route", 404);
      }

      // === MiniMax connectivity probe — verify which model your plan supports
      if (url.pathname === "/admin/test-minimax" && (request.method === "POST" || request.method === "GET")) {
        const result = await testMiniMaxCall(env, {
          baseURL: url.searchParams.get("base_url") ?? undefined,
          model: url.searchParams.get("model") ?? undefined,
        });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/list-minimax-models" && request.method === "GET") {
        const result = await listMiniMaxModels(env, {
          baseURL: url.searchParams.get("base_url") ?? undefined,
        });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/sweep-minimax" && request.method === "GET") {
        const extra = url.searchParams.get("extra_urls");
        const extraUrls = extra ? extra.split(",").map((s) => s.trim()).filter(Boolean) : [];
        const results = await sweepMiniMaxEndpoints(env, extraUrls);
        return Response.json({ results, key_prefix: env.MINIMAX_API_KEY?.slice(0, 8) }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/exercise-deep-tier" && (request.method === "POST" || request.method === "GET")) {
        // Runs the full selectModel('deep') + spendMiddleware + generateText
        // pipeline. /budget should tick by the returned token count.
        const result = await exerciseDeepTier(env);
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/diag" && (request.method === "POST" || request.method === "GET")) {
        const result = await runDiag(env);
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/diag-do" && (request.method === "POST" || request.method === "GET")) {
        const result = await probeDOSynthesize(env);
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/diag-do-kv" && (request.method === "POST" || request.method === "GET")) {
        const result = await probeDOKV(env);
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/test-image" && (request.method === "POST" || request.method === "GET")) {
        const prompt =
          url.searchParams.get("prompt") ??
          "Abstract cyanotype data visualization, error manifold projection in 3D space, dark navy background, cyan accent points, scientific paper aesthetic, no text";
        const storageKey = `claim-images/probe-${Date.now()}.png`;
        const result = await generateAndStoreImage(env, { prompt, storageKey });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/test-tts" && (request.method === "POST" || request.method === "GET")) {
        const text =
          url.searchParams.get("text") ??
          "This is a probe of the MiniMax text to speech narration pipeline for glim think.";
        const voice = url.searchParams.get("voice") ?? undefined;
        const model = url.searchParams.get("model") ?? undefined;
        const storageKey = `claim-audio/probe-${Date.now()}.mp3`;
        const result = await generateAndStoreAudio(env, { text, storageKey, voice_id: voice, model });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/submit-vignette" && request.method === "POST") {
        const r = await submitDailyVignette(env);
        return Response.json(r, { headers: JSON_CORS_HEADERS });
      }

      // Public VLM endpoint — explain a figure. CORS-enabled so the
      // /research page can call it from the browser. Caches per-image
      // explanations in CONFIG (KV) so we don't re-run VLM every visit.
      if (url.pathname === "/api/explain-figure") {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: { ...JSON_CORS_HEADERS, "Access-Control-Max-Age": "86400" } });
        }
        if (request.method !== "POST" && request.method !== "GET") {
          return jsonError("Method not allowed", 405);
        }
        const params = request.method === "POST"
          ? JSON.parse(bodyText || "{}") as { image_url?: string; question?: string }
          : { image_url: url.searchParams.get("image_url") ?? undefined, question: url.searchParams.get("question") ?? undefined };
        if (!params.image_url) return jsonError("Missing image_url", 400);
        if (!/^https?:\/\//.test(params.image_url)) return jsonError("Bad image_url", 400);

        const cacheKey = `vlm-cache:${await sha256(params.image_url + ":" + (params.question ?? ""))}`;
        const cached = await env.CONFIG.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            headers: {
              ...JSON_CORS_HEADERS,
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
              "X-Cache": "kv-hit",
            },
          });
        }

        const result = await explainFigure(env, { imageUrl: params.image_url, question: params.question });
        const body = JSON.stringify(result);
        if (result.ok) {
          // 7-day KV cache; explanations of stable images don't change
          await env.CONFIG.put(cacheKey, body, { expirationTtl: 7 * 24 * 60 * 60 });
        }
        return new Response(body, {
          headers: { ...JSON_CORS_HEADERS, "Cache-Control": result.ok ? "public, max-age=86400" : "no-cache", "X-Cache": "miss" },
        });
      }

      if (url.pathname === "/admin/probe-vlm-file-upload" && request.method === "GET") {
        // Step 1: try uploading a file to /v1/files with several purpose values
        // Step 2: if upload succeeds, try chat completions with file_id reference
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const imageKey = url.searchParams.get("image_key") ?? "claim-images/auto_eval_hyp_meam_anomaly_1777770170424.png";
        const obj = await env.ARTIFACTS.get(imageKey);
        if (!obj) return jsonError(`R2 image not found: ${imageKey}`, 404);
        const imageBuf = await obj.arrayBuffer();

        const purposes = ["retrieval", "vision_input", "image", "vision", "file-extract", "fine-tune", "knowledge"];
        const uploadResults: unknown[] = [];
        for (const purpose of purposes) {
          const fd = new FormData();
          fd.append("purpose", purpose);
          fd.append("file", new Blob([imageBuf], { type: "image/png" }), "probe.png");
          try {
            const res = await fetch(`${baseURL}/files`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
              body: fd,
            });
            const text = await res.text();
            uploadResults.push({ purpose, status: res.status, body: text.slice(0, 250) });
          } catch (e) {
            uploadResults.push({ purpose, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, image_key: imageKey, upload_results: uploadResults }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-vlm-with-file" && request.method === "GET") {
        // Try chat/completions with a known file_id and various content shapes
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const fileId = url.searchParams.get("file_id");
        const model = url.searchParams.get("model") ?? "MiniMax-VL-01";
        if (!fileId) return jsonError("Missing file_id", 400);
        const shapes = [
          { name: "image_file ref", content: [{ type: "text", text: "Describe this image" }, { type: "image_file", image_file: { file_id: fileId } }] },
          { name: "image_url with file_id", content: [{ type: "text", text: "Describe this image" }, { type: "image_url", image_url: { url: `file://${fileId}` } }] },
          { name: "input_image with file_id", content: [{ type: "text", text: "Describe this image" }, { type: "input_image", file_id: fileId }] },
          { name: "image with file_id", content: [{ type: "text", text: "Describe this image" }, { type: "image", file_id: fileId }] },
        ];
        const results: unknown[] = [];
        for (const shape of shapes) {
          try {
            const res = await fetch(`${baseURL}/chat/completions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model, messages: [{ role: "user", content: shape.content }], max_tokens: 64 }),
            });
            const text = await res.text();
            results.push({ shape: shape.name, status: res.status, body: text.slice(0, 280) });
          } catch (e) {
            results.push({ shape: shape.name, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, model, file_id: fileId, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-m27-native-image" && request.method === "GET") {
        // Single call to /text/chatcompletion_pro with M2.7 + image media.
        // Use sparingly — 1 RPM limit on this endpoint.
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const imageKey = url.searchParams.get("image_key") ?? "claim-images/auto_eval_hyp_meam_anomaly_1777770170424.png";
        const obj = await env.ARTIFACTS.get(imageKey);
        if (!obj) return jsonError(`R2 image not found: ${imageKey}`, 404);
        const buf = await obj.arrayBuffer();
        const publicImageUrl = `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${imageKey}`;

        const start = Date.now();
        const res = await fetch(`${baseURL}/text/chatcompletion_pro`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "MiniMax-M2.7",
            messages: [{
              sender_type: "USER",
              sender_name: "user",
              text: "Describe this image in one sentence — what do you see?",
              media: [{ type: "image", url: publicImageUrl }],
            }],
            bot_setting: [{ bot_name: "Vision", content: "You analyze images concretely and concisely." }],
            reply_constraints: { sender_type: "BOT", sender_name: "Vision" },
            tokens_to_generate: 100,
          }),
        });
        const text = await res.text();
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch {}
        return Response.json({
          status: res.status,
          latency_ms: Date.now() - start,
          image_size: buf.byteLength,
          public_image_url: publicImageUrl,
          response: parsed ?? text.slice(0, 500),
        }, { headers: JSON_CORS_HEADERS });
      }

      // === Manual research loop — harvest, comprehend, reason, review ===
      if (url.pathname === "/admin/harvest" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as {
          query?: string;
          max?: number;
          sources?: string[];
        };
        if (!body.query?.trim()) return jsonError("Missing query", 400);
        const result = await searchLit(env, body.query, {
          max: body.max ?? 8,
          sources: body.sources?.filter(isLiteratureSource),
        });
        // Return a flat summary of papers found per source so the
        // human reviewer can pick which to comprehend next.
        const flat: Array<{ doi: string; title: string; year: number | null; source: string; arxiv_id: string | null }> = [];
        for (const [src, papers] of Object.entries(result.results) as Array<[string, Array<{ doi: string; title: string; year: number | null; arxivId: string | null }>]>) {
          for (const p of papers) {
            flat.push({ doi: p.doi, title: p.title, year: p.year, source: src, arxiv_id: p.arxivId });
          }
        }
        return Response.json(
          { query: body.query, papers: flat, errors: result.errors, cached: result.cached },
          { headers: JSON_CORS_HEADERS },
        );
      }

      if (url.pathname === "/admin/comprehend" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as {
          paper_doi?: string;
          hypothesis_id?: string;
        };
        if (!body.paper_doi || !body.hypothesis_id) {
          return jsonError("Missing paper_doi or hypothesis_id", 400);
        }
        const result = await comprehendPaper(env, {
          paper_doi: body.paper_doi,
          hypothesis_id: body.hypothesis_id,
        });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/reason" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as {
          hypothesis_id?: string;
          insight_limit?: number;
          max_tokens?: number;
        };
        if (!body.hypothesis_id) return jsonError("Missing hypothesis_id", 400);
        const result = await reasonOnHypothesis(env, {
          hypothesis_id: body.hypothesis_id,
          insight_limit: body.insight_limit,
          max_tokens: body.max_tokens,
        });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/insights/promote" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as {
          insight_id?: string;
          new_relevance?: number;
          new_verdict?: string;
          note?: string;
        };
        if (!body.insight_id) return jsonError("Missing insight_id", 400);
        const result = await promoteInsight(env, {
          insight_id: body.insight_id,
          new_relevance: body.new_relevance,
          new_verdict: body.new_verdict,
          note: body.note,
        });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/lean-status" && request.method === "GET") {
        const overview = await leanStatusOverview(env);
        return Response.json({ hypotheses: overview }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/iterate" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as {
          hypothesis_id?: string;
          max_rounds?: number;
          papers_per_query?: number;
          sources?: string[];
        };
        if (!body.hypothesis_id) return jsonError("Missing hypothesis_id", 400);
        const result = await iterateOnHypothesis(env, {
          hypothesis_id: body.hypothesis_id,
          max_rounds: body.max_rounds,
          papers_per_query: body.papers_per_query,
          sources: body.sources,
        });
        return Response.json(result, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/insights" && request.method === "GET") {
        const hypothesisId = url.searchParams.get("hypothesis_id");
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 50);
        if (hypothesisId) {
          const insights = await topInsightsForHypothesis(env, hypothesisId, limit);
          return Response.json({ hypothesis_id: hypothesisId, insights }, { headers: JSON_CORS_HEADERS });
        }
        // No filter — list recent insights across all hypotheses
        const rows = await env.LEDGER
          .prepare(
            `SELECT i.insight_id, i.paper_doi, i.hypothesis_id, i.key_finding,
                    i.relevance_score, i.agrees_or_refutes, i.extracted_at,
                    p.title AS paper_title, p.year AS paper_year, p.source AS paper_source,
                    h.title AS hypothesis_title
               FROM literature_insights i
               LEFT JOIN literature_papers p ON p.doi = i.paper_doi
               LEFT JOIN hypotheses h ON h.id = i.hypothesis_id
              ORDER BY i.extracted_at DESC
              LIMIT ?1`,
          )
          .bind(limit)
          .all()
          .catch(() => ({ results: [] as never[] }));
        return Response.json({ insights: rows.results ?? [] }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-vlm-native-pro" && request.method === "GET") {
        // Probe /text/chatcompletion_pro with a proper bot_setting + various
        // image-bearing message shapes. This is MiniMax's native multimodal
        // chat endpoint (the OpenAI-compat one strips images).
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const imageKey = url.searchParams.get("image_key") ?? "claim-images/auto_eval_hyp_meam_anomaly_1777770170424.png";
        const obj = await env.ARTIFACTS.get(imageKey);
        if (!obj) return jsonError(`R2 image not found: ${imageKey}`, 404);
        const buf = await obj.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + 8192)));
        }
        const dataUrl = `data:image/png;base64,${btoa(binary)}`;
        const publicImageUrl = `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${imageKey}`;

        const botSetting = [{ bot_name: "Vision", content: "You are a vision assistant. Describe images concretely." }];
        const replyConstraints = { sender_type: "BOT", sender_name: "Vision" };
        const baseMessage = { sender_type: "USER", sender_name: "user", text: "Describe this image in one sentence." };

        const probes = [
          {
            name: "media field in message (data url)",
            body: {
              model: "MiniMax-VL-01",
              messages: [{ ...baseMessage, media: [{ type: "image", url: dataUrl }] }],
              bot_setting: botSetting,
              reply_constraints: replyConstraints,
            },
          },
          {
            name: "media field in message (public url)",
            body: {
              model: "MiniMax-VL-01",
              messages: [{ ...baseMessage, media: [{ type: "image", url: publicImageUrl }] }],
              bot_setting: botSetting,
              reply_constraints: replyConstraints,
            },
          },
          {
            name: "image_url field on message",
            body: {
              model: "MiniMax-VL-01",
              messages: [{ ...baseMessage, image_url: publicImageUrl }],
              bot_setting: botSetting,
              reply_constraints: replyConstraints,
            },
          },
          {
            name: "M2.7 with media field",
            body: {
              model: "MiniMax-M2.7",
              messages: [{ ...baseMessage, media: [{ type: "image", url: publicImageUrl }] }],
              bot_setting: botSetting,
              reply_constraints: replyConstraints,
            },
          },
          {
            name: "M2.7 with image inline content",
            body: {
              model: "MiniMax-M2.7",
              messages: [{
                sender_type: "USER",
                sender_name: "user",
                text: "Describe this image",
                content: [
                  { type: "text", text: "Describe" },
                  { type: "image", image_url: publicImageUrl },
                ],
              }],
              bot_setting: botSetting,
              reply_constraints: replyConstraints,
            },
          },
          {
            name: "abab6.5s-chat (legacy multimodal)",
            body: {
              model: "abab6.5s-chat",
              messages: [{ ...baseMessage, media: [{ type: "image", url: publicImageUrl }] }],
              bot_setting: botSetting,
              reply_constraints: replyConstraints,
            },
          },
        ];

        const results: unknown[] = [];
        for (const probe of probes) {
          try {
            const res = await fetch(`${baseURL}/text/chatcompletion_pro`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify(probe.body),
            });
            const text = await res.text();
            results.push({
              name: probe.name,
              model: (probe.body as { model: string }).model,
              status: res.status,
              body: text.slice(0, 320),
            });
          } catch (e) {
            results.push({ name: probe.name, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, image_size: buf.byteLength, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-vlm-native-paths" && request.method === "GET") {
        // The OpenAI-compat /chat/completions path on this proxy
        // strips multimodal content. Try MiniMax's native paths that
        // a proxy is more likely to forward untouched: /text/chatcompletion_v2,
        // /multimodal/chat, /vision/chat, etc.
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const imageKey = url.searchParams.get("image_key") ?? "claim-images/auto_eval_hyp_meam_anomaly_1777770170424.png";
        const obj = await env.ARTIFACTS.get(imageKey);
        if (!obj) return jsonError(`R2 image not found: ${imageKey}`, 404);
        const buf = await obj.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + 8192)));
        }
        const dataUrl = `data:image/png;base64,${btoa(binary)}`;

        const probes = [
          {
            name: "text-chatcompletion_v2",
            path: "/text/chatcompletion_v2",
            body: {
              model: "MiniMax-M2.7",
              messages: [{
                sender_type: "USER",
                sender_name: "user",
                text: "Describe this image",
              }],
              tokens_to_generate: 64,
            },
          },
          {
            name: "text-chatcompletion_pro",
            path: "/text/chatcompletion_pro",
            body: {
              model: "MiniMax-M2.7",
              messages: [{
                sender_type: "USER",
                text: "Describe this image",
                image: dataUrl,
              }],
            },
          },
          {
            name: "multimodal-generation",
            path: "/multimodal/generation",
            body: {
              model: "MiniMax-VL-01",
              prompt: "Describe this image",
              image_url: dataUrl,
            },
          },
          {
            name: "vision-completion",
            path: "/vision/completion",
            body: { model: "MiniMax-VL-01", messages: [{ role: "user", content: "Describe", image: dataUrl }] },
          },
          {
            name: "vlm-completion",
            path: "/vlm/chat/completions",
            body: { model: "MiniMax-VL-01", messages: [{ role: "user", content: [{ type: "text", text: "Describe" }, { type: "image_url", image_url: { url: dataUrl } }] }] },
          },
          {
            name: "openai-vision-detail",
            path: "/chat/completions",
            body: {
              model: "MiniMax-M2.7",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: "Describe what you see in this image. The image is attached. If you cannot see it, say 'NO_IMAGE_RECEIVED'." },
                  { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                ],
              }],
              max_tokens: 100,
            },
          },
        ];
        const results: unknown[] = [];
        for (const probe of probes) {
          try {
            const res = await fetch(`${baseURL}${probe.path}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify(probe.body),
            });
            const text = await res.text();
            results.push({
              name: probe.name,
              path: probe.path,
              status: res.status,
              body_preview: text.slice(0, 280),
            });
          } catch (e) {
            results.push({ name: probe.name, path: probe.path, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, image_size: buf.byteLength, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-vlm-base64" && request.method === "GET") {
        // Try base64 inline data URLs across several models
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const imageKey = url.searchParams.get("image_key") ?? "claim-images/auto_eval_hyp_meam_anomaly_1777770170424.png";
        const obj = await env.ARTIFACTS.get(imageKey);
        if (!obj) return jsonError(`R2 image not found: ${imageKey}`, 404);
        const imageBuf = await obj.arrayBuffer();
        // Convert to base64 data URL
        const bytes = new Uint8Array(imageBuf);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + chunkSize)));
        }
        const dataUrl = `data:image/png;base64,${btoa(binary)}`;
        const models = (url.searchParams.get("models") ?? "MiniMax-VL-01,MiniMax-M2.7,MiniMax-M2.1,MiniMax-M2.5").split(",").map(s => s.trim());
        const results: unknown[] = [];
        for (const model of models) {
          try {
            const res = await fetch(`${baseURL}/chat/completions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: "Describe this image in one sentence." },
                    { type: "image_url", image_url: { url: dataUrl } },
                  ],
                }],
                max_tokens: 100,
              }),
            });
            const text = await res.text();
            results.push({ model, status: res.status, body: text.slice(0, 280) });
          } catch (e) {
            results.push({ model, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, image_key: imageKey, image_size: imageBuf.byteLength, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-vlm" && request.method === "GET") {
        // Try several VLM model IDs via /chat/completions with an image input
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const candidates = (url.searchParams.get("models") ?? "MiniMax-VL-01,MiniMax-VL-2.5,MiniMax-VL-2.7,MiniMax-Vision,MiniMax-VL-Pro,MiniMax-VL-M2,MiniMax-M2-VL,MiniMax-M2.7-VL,abab6.5-vision,MiniMax-VL")
          .split(",").map(s => s.trim()).filter(Boolean);
        const testImage = url.searchParams.get("image") ?? "https://glim-think-v1.aw-ab5.workers.dev/artifacts/claim-images/auto_eval_hyp_meam_anomaly_1777770170424.png";
        const results = [];
        for (const model of candidates) {
          try {
            const res = await fetch(`${baseURL}/chat/completions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                messages: [
                  { role: "user", content: [
                    { type: "text", text: "Describe this image in one sentence." },
                    { type: "image_url", image_url: { url: testImage } },
                  ]},
                ],
                max_tokens: 64,
              }),
            });
            const text = await res.text();
            results.push({ model, status: res.status, ok: res.ok, body: text.slice(0, 220) });
          } catch (e) {
            results.push({ model, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-search" && request.method === "GET") {
        // Try several search invocations: chat completion with web_search tool,
        // dedicated /search endpoint, etc.
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const query = url.searchParams.get("q") ?? "MEAM interatomic potential elastic constants benchmark";
        const probes = [
          {
            name: "chat-with-web_search-tool",
            path: "/chat/completions",
            body: {
              model: env.MINIMAX_MODEL?.trim() || "MiniMax-M2.7",
              messages: [{ role: "user", content: query }],
              tools: [{ type: "web_search" }],
            },
          },
          {
            name: "chat-with-search-tool",
            path: "/chat/completions",
            body: {
              model: env.MINIMAX_MODEL?.trim() || "MiniMax-M2.7",
              messages: [{ role: "user", content: query }],
              tools: [{ type: "search" }],
            },
          },
          {
            name: "dedicated-search",
            path: "/search",
            body: { query, limit: 5 },
          },
          {
            name: "chat-with-coding-plan-search",
            path: "/chat/completions",
            body: {
              model: "coding-plan-search",
              messages: [{ role: "user", content: query }],
            },
          },
          {
            name: "web-search",
            path: "/web_search",
            body: { query, limit: 5 },
          },
        ];
        const results = [];
        for (const probe of probes) {
          try {
            const res = await fetch(`${baseURL}${probe.path}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify(probe.body),
            });
            const text = await res.text();
            results.push({
              name: probe.name,
              path: probe.path,
              status: res.status,
              ok: res.ok,
              body: text.slice(0, 280),
            });
          } catch (e) {
            results.push({ name: probe.name, path: probe.path, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/seed-vignette" && request.method === "POST") {
        // Used to verify the polling/download path with an existing
        // task_id when the Hailuo daily budget is exhausted.
        const body = JSON.parse(bodyText || "{}") as { task_id?: string; date?: string };
        if (!body.task_id) return jsonError("Missing task_id", 400);
        const dateKey = body.date ?? new Date().toISOString().slice(0, 10);
        const vignetteId = `seed-${dateKey}-${Date.now().toString(36)}`;
        await env.LEDGER.prepare(
          `CREATE TABLE IF NOT EXISTS daily_vignettes (
             vignette_id TEXT PRIMARY KEY, date_key TEXT NOT NULL,
             task_id TEXT, file_id TEXT, r2_key TEXT,
             prompt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted',
             claim_ids TEXT, error TEXT,
             poll_attempts INTEGER NOT NULL DEFAULT 0,
             created_at TEXT NOT NULL, completed_at TEXT
           )`,
        ).run();
        await env.LEDGER.prepare(
          `INSERT INTO daily_vignettes
             (vignette_id, date_key, task_id, prompt, status, claim_ids, created_at)
           VALUES (?1, ?2, ?3, ?4, 'submitted', ?5, ?6)`,
        )
          .bind(vignetteId, dateKey, body.task_id, "(seeded)", "[]", new Date().toISOString())
          .run();
        return Response.json({ ok: true, vignette_id: vignetteId, task_id: body.task_id, date: dateKey }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/poll-vignettes" && request.method === "POST") {
        const r = await pollPendingVignettes(env);
        return Response.json(r, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-video-status" && request.method === "GET") {
        // Poll a video_generation task by id, and also try downloading
        // the file once status is "Success".
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const taskId = url.searchParams.get("task_id");
        if (!taskId) return jsonError("Missing task_id", 400);
        const res = await fetch(`${baseURL}/query/video_generation?task_id=${taskId}`, {
          headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
        });
        const text = await res.text();
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch {}
        // If file_id present, also try retrieving the file URL
        let fileResult: unknown = null;
        const p = parsed as { file_id?: string };
        if (p?.file_id) {
          const fres = await fetch(`${baseURL}/files/retrieve?file_id=${p.file_id}`, {
            headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
          });
          fileResult = await fres.json().catch(() => null);
        }
        return Response.json({ status_code: res.status, parsed, file: fileResult }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-video-models" && request.method === "GET") {
        // Test Hailuo / video_generation endpoint with several model IDs
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const candidates = (url.searchParams.get("models") ?? "MiniMax-Hailuo-02,Hailuo-2.3,Hailuo-2.3-Fast,Hailuo-2.3-768P,T2V-01,video-01,video-2.6")
          .split(",").map(s => s.trim()).filter(Boolean);
        const results = [];
        for (const model of candidates) {
          try {
            const res = await fetch(`${baseURL}/video_generation`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                prompt: "A serene cyanotype aurora drifts across a dark night sky.",
                duration: 6,
                resolution: "768P",
              }),
            });
            const text = await res.text();
            results.push({ model, status: res.status, ok: res.ok, body_preview: text.slice(0, 280) });
          } catch (e) {
            results.push({ model, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/probe-tts-paths" && request.method === "GET") {
        // Try alternate TTS endpoint paths in case the proxy key uses
        // OpenAI-style /v1/audio/speech instead of MiniMax /v1/t2a_v2
        const baseURL = env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
        const paths = [
          { path: "/audio/speech", body: { model: "tts-1", input: "ok", voice: "alloy" }, name: "openai-compat-tts-1" },
          { path: "/audio/speech", body: { model: "tts-1-hd", input: "ok", voice: "alloy" }, name: "openai-compat-tts-1-hd" },
          { path: "/audio/speech", body: { model: "speech-2.5-hd-preview", input: "ok", voice: "alloy" }, name: "openai-compat-2.5" },
          { path: "/audio/speech", body: { model: "MiniMax-Speech", input: "ok", voice: "alloy" }, name: "openai-compat-MiniMax-Speech" },
          { path: "/text/audio", body: { model: "speech-01", text: "ok", voice_id: "male-qn-qingse" }, name: "legacy-text-audio" },
        ];
        const results = [];
        for (const probe of paths) {
          try {
            const res = await fetch(`${baseURL}${probe.path}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify(probe.body),
            });
            const text = await res.text();
            results.push({
              ...probe,
              status: res.status,
              ok: res.ok,
              body_preview: text.slice(0, 250),
            });
          } catch (e) {
            results.push({ ...probe, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ base_url: baseURL, results }, { headers: JSON_CORS_HEADERS });
      }

      if (url.pathname === "/admin/sweep-tts-models" && request.method === "GET") {
        // Try a list of plausible TTS model IDs to find what the plan accepts
        const extraParam = url.searchParams.get("models");
        const candidates = extraParam
          ? extraParam.split(",").map(s => s.trim()).filter(Boolean)
          : [
              "speech-2.7-hd",
              "speech-2.7-turbo",
              "speech-02-hd",
              "speech-2.6-hd",
              "speech-2.5-hd-preview",
              "speech-2.5-hd",
              "speech-2.5-turbo-preview",
              "speech-01-hd",
              "speech-01-turbo-preview",
              "speech-01-240228",
              "speech-2.5-25-hd",
              "speech-02-turbo",
            ];
        const results = [];
        for (const model of candidates) {
          const r = await generateAndStoreAudio(env, {
            text: "ok",
            storageKey: `claim-audio/sweep-${Date.now()}-${model.replace(/[^a-z0-9]/gi, "_")}.mp3`,
            model,
          });
          results.push({ model, ok: r.ok, error: r.error?.slice(0, 200) });
        }
        return Response.json({ results }, { headers: JSON_CORS_HEADERS });
      }

      // === Public R2 artifact serving (claim images, diary attachments) ===
      if (url.pathname.startsWith("/artifacts/") && (request.method === "GET" || request.method === "HEAD")) {
        const key = decodeURIComponent(url.pathname.slice("/artifacts/".length));
        if (!key || key.includes("..")) {
          return new Response("Bad request", { status: 400 });
        }
        const obj = request.method === "HEAD"
          ? await env.ARTIFACTS.head(key)
          : await env.ARTIFACTS.get(key);
        if (!obj) {
          return new Response("Not found", { status: 404 });
        }
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set("etag", obj.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*");
        if (!headers.has("Cache-Control")) {
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        if (request.method === "HEAD") {
          return new Response(null, { headers });
        }
        // The .get() return has a body; HEAD branch returned above
        return new Response((obj as R2ObjectBody).body, { headers });
      }

      // === phase-B: provider spend telemetry ===
      if (url.pathname === "/budget" && request.method === "GET") {
        const month =
          url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
        const providers = ["minimax", "zai", "huggingface"];
        const usage: Record<string, unknown> = { month };
        for (const provider of providers) {
          const raw = await env.CONFIG.get(`budget:${month}:${provider}`);
          usage[provider] = raw ? JSON.parse(raw) : { tokens: 0, calls: 0 };
        }
        return Response.json(usage, { headers: JSON_CORS_HEADERS });
      }

      // === unit-4: literature routes ===
      if (url.pathname === "/literature/search" && request.method === "POST") {
        const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
        const query = typeof body.query === "string" ? body.query : "";
        if (!query.trim()) {
          return Response.json({ error: "Missing 'query'" }, { status: 400 });
        }
        const max = typeof body.max === "number" && Number.isFinite(body.max)
          ? Math.trunc(body.max)
          : 10;
        const forceRefresh = Boolean(body.force_refresh);

        const requested = Array.isArray(body.sources)
          ? (body.sources as unknown[]).filter(isLiteratureSource)
          : [];

        const result = await searchLiterature(env, query, {
          sources: requested.length > 0 ? requested : undefined,
          max,
          forceRefresh,
        });
        return Response.json(result);
      }

      const PAPER_COLS =
        "doi, arxiv_id, title, abstract, authors_json, year, venue, source, fetched_at, raw_artifact_key";

      if (url.pathname.startsWith("/literature/papers/") && request.method === "GET") {
        const doi = decodeURIComponent(url.pathname.slice("/literature/papers/".length));
        if (!doi) {
          return Response.json({ error: "Missing DOI" }, { status: 400 });
        }
        const row = await env.LEDGER.prepare(
          `SELECT ${PAPER_COLS} FROM literature_papers WHERE doi = ?1`,
        ).bind(doi).first();
        if (!row) {
          return Response.json({ error: "Not found", doi }, { status: 404 });
        }
        return Response.json(rowToPaper(row as Record<string, unknown>));
      }

      if (url.pathname === "/literature/papers" && request.method === "GET") {
        const sourceParam = url.searchParams.get("source");
        const yearParam = url.searchParams.get("year");
        const limit = Math.min(
          Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1),
          200,
        );

        const conditions: string[] = [];
        const binds: unknown[] = [];
        if (sourceParam && isLiteratureSource(sourceParam)) {
          conditions.push(`source = ?${binds.length + 1}`);
          binds.push(sourceParam as LiteratureSource);
        }
        if (yearParam) {
          const y = parseInt(yearParam, 10);
          if (Number.isFinite(y)) {
            conditions.push(`year = ?${binds.length + 1}`);
            binds.push(y);
          }
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const sql =
          `SELECT ${PAPER_COLS} FROM literature_papers ${where} ORDER BY fetched_at DESC LIMIT ?${binds.length + 1}`;
        binds.push(limit);

        const rows = await env.LEDGER.prepare(sql).bind(...binds).all();
        const papers = (rows.results as Array<Record<string, unknown>>).map(rowToPaper);
        return Response.json({ papers, count: papers.length });
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error("Worker error:", e);
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  scheduled: scheduledHandler,
  async queue(batch, env) {
    await consumeBatch(
      batch as MessageBatch<ResearchTask & { job_id: string }>,
      env,
    );
  },
} satisfies ExportedHandler<Env>;

function buildDiaryPrompt(element: string, potential: string, structure: string, records: Array<{ property: string; reference: number; predicted: number; unit: string }>): string {
  let lines = `Experiment: ${potential} on ${element} (${structure} structure)\n\nResults:\n`;
  for (const r of records) {
    const err = r.reference !== 0 ? ((r.predicted - r.reference) / r.reference * 100).toFixed(1) : "N/A";
    lines += `- ${r.property}: predicted ${r.predicted.toFixed(2)} ${r.unit} vs reference ${r.reference.toFixed(2)} ${r.unit} (${err}%)\n`;
  }
  lines += "\nWrite a brief lab diary interpretation of these results.";
  return lines;
}

function buildAnalysisArticlePrompt(results: Record<string, any>): string {
  let lines = `Research Analysis Run: ${new Date(results.timestamp as string).toUTCString()}\n`;
  lines += `Target Element: ${results.element || "Global (All Elements)"}\n\n`;

  if (results.recordCounts) {
    const counts = results.recordCounts as Array<{ element: string; n: number }>;
    lines += `Dataset Coverage:\n`;
    for (const c of counts.slice(0, 5)) {
      lines += `- ${c.element}: ${c.n} records\n`;
    }
    if (counts.length > 5) lines += `- ...and ${counts.length - 5} more elements\n`;
    lines += `\n`;
  }

  if (results.manifold && !results.manifold.error) {
    const m = results.manifold as any;
    lines += `=== Manifold Error Geometry ===\n`;
    lines += `- Vectors Analyzed: ${m.vectorCount}\n`;
    lines += `- Properties Space: ${m.properties.join(", ")}\n`;
    lines += `- Participation Ratio (PR): ${m.participationRatio}\n`;
    lines += `- Is Hyper-ribbon (PR < 2.0)? ${m.hyperRibbon ? "Yes" : "No"}\n`;
    lines += `- Principal Direction (1st EV): [${m.principalDirection.join(", ")}]\n`;
    lines += `- Mean Relative Errors: [${m.means.join(", ")}]\n\n`;
  }

  if (results.causal && !results.causal.error) {
    const c = results.causal as any;
    lines += `=== Causal Correlation & Paradox Screening ===\n`;
    lines += `- Global Pooled Correlation (r): ${c.pooledCorrelation} (n=${c.pooledN})\n`;
    lines += `- Simpson's Paradox Detected? ${c.paradoxDetected ? "Yes" : "No"}\n\n`;
    
    if (c.withinElement && c.withinElement.length > 0) {
      lines += `Top 3 Most Correlated Elements:\n`;
      const sortedEl = [...c.withinElement].sort((a: any, b: any) => b.r - a.r);
      for (const el of sortedEl.slice(0, 3)) lines += `- ${el.element}: r=${el.r} (n=${el.n})\n`;
      
      lines += `\nBottom 3 Least Correlated Elements:\n`;
      const bottomEl = sortedEl.slice().reverse();
      for (const el of bottomEl.slice(0, 3)) lines += `- ${el.element}: r=${el.r} (n=${el.n})\n`;
      lines += `\n`;
    }
  }

  lines += `Based on the quantitative data above, write the research diary entry noting interesting patterns, structure, or anomalies.`;
  return lines;
}
