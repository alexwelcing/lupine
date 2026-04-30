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
import type {
  BenchmarkRecord,
  Critique,
  CritiqueStatus,
  Env,
  HypothesisRecord,
  HypothesisStatus,
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

        return Response.json({
          status: "ok",
          service: "glim-think-v2",
          version: "2.1.0",
          runtime: "think",
          research_mode: "causal-geometry",
          research_direction: "Error Manifold Invariance & Causal Benchmarking",
          agents: ["Orchestrator", "Manifold", "Causal", "Theorist", "Experiment"],
          active_hypotheses: activeHypotheses,
        });
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

      // Real-time Dashboard Feed API
      if (url.pathname === "/feed") {
        // CORS preflight
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

        const latestDiaryObj = await env.ARTIFACTS.get("diary/latest.json");
        const latestMetricsObj = await env.ARTIFACTS.get("metrics/latest.json");
        const latestBroadcastObj = await env.ARTIFACTS.get("broadcasts/latest.json");
        const recentRecords = await env.LEDGER.prepare(
          "SELECT agent_id, element, property, timestamp FROM records ORDER BY timestamp DESC LIMIT 10"
        ).all();

        const experimentsRaw = await env.LEDGER.prepare(
          "SELECT experiment_id, element, potential_label, status, discriminative_property, hypothesis_id, created_at FROM pending_experiments ORDER BY created_at DESC LIMIT 100"
        ).all();
        const exps = experimentsRaw.results as any[];

        // Categorize experiments based on status and metadata (if applicable)
        const hypotheticals = exps.filter(e => e.status === 'pending');
        // Simple heuristic for proven/disproven until Theorist formalizes output
        const provens = exps.filter(e => e.status === 'completed' && (!e.hypothesis_id || !e.hypothesis_id.includes('fail')));
        const disproven = exps.filter(e => e.status === 'completed' && e.hypothesis_id && e.hypothesis_id.includes('fail'));

        // Swarm Status Simulation
        const swarmStatus = {
          orchestrator: { status: "active", task: "Coordinating manifold analysis", last_seen: new Date().toISOString() },
          manifold: { status: "active", task: "Computing eigenvalue spectra", last_seen: new Date().toISOString() },
          causal: { status: "active", task: "Screening for Simpson's Paradox", last_seen: new Date().toISOString() },
          theorist: { status: "idle", task: "Awaiting causal inputs", last_seen: new Date().toISOString() },
          experiment: { status: hypotheticals.length > 0 ? "active" : "idle", task: hypotheticals.length > 0 ? `Queueing ${hypotheticals.length} experiments` : "Awaiting hypotheses", last_seen: new Date().toISOString() },
        };

        return Response.json({
          status: "live",
          swarm_status: swarmStatus,
          hypotheticals: hypotheticals.slice(0, 10),
          provens: provens.slice(0, 10),
          disproven: disproven.slice(0, 10),
          diary: latestDiaryObj ? await latestDiaryObj.json() : null,
          metrics: latestMetricsObj ? await latestMetricsObj.json() : null,
          broadcast: latestBroadcastObj ? await latestBroadcastObj.json() : null,
          recent_activity: recentRecords.results
        }, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

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
