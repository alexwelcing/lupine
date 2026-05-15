import type { Env } from "./types";

export type TaskStatus = "queued" | "claimed" | "running" | "blocked" | "done";

interface SeedOptions {
  targetTaskCount?: number;
  cycleKind?: string;
  summary?: string;
}

interface AgendaTaskTemplate {
  domain: string;
  specialty: string;
  title: (element: string, horizon: string) => string;
  payload: (element: string, horizon: string) => Record<string, unknown>;
  resources: string[];
}

const ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"];
const HORIZONS = [
  { key: "now", dueDays: 1, priority: 1 },
  { key: "next", dueDays: 7, priority: 2 },
  { key: "deep", dueDays: 30, priority: 3 },
  { key: "frontier", dueDays: 90, priority: 4 },
];

const TASK_TEMPLATES: AgendaTaskTemplate[] = [
  {
    domain: "ledger-ingestion",
    specialty: "ingestion",
    title: (element, horizon) => `Ingest fresh ${element} benchmark evidence for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, sourceFamilies: ["OpenKIM", "NIST IPR", "local MLIP runs"] }),
    resources: ["browser-data-scout", "d1-ledger-write"],
  },
  {
    domain: "manifold-map",
    specialty: "manifold",
    title: (element, horizon) => `Map ${element} error manifold geometry for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, outputs: ["eigen_spectrum", "participation_ratio", "principal_axes"] }),
    resources: ["workers-ai-screening", "artifact-storage"],
  },
  {
    domain: "causal-screen",
    specialty: "causal",
    title: (element, horizon) => `Screen ${element} confounders and paradoxes for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, groupings: ["pair_style", "potential_label", "structure"] }),
    resources: ["d1-ledger-read"],
  },
  {
    domain: "hypothesis-forge",
    specialty: "theorist",
    title: (element, horizon) => `Forge competing ${element} mechanisms for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, minimumHypotheses: 3, requiresFalsificationPath: true }),
    resources: ["capable-model-route", "artifact-storage"],
  },
  {
    domain: "experiment-queue",
    specialty: "experiment",
    title: (element, horizon) => `Queue discriminative ${element} experiments for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, preferredProperties: ["surface_energy", "vacancy_energy", "stacking_fault"] }),
    resources: ["tier-4-sandbox", "lammps-runner", "d1-ledger-write"],
  },
  {
    domain: "model-routing",
    specialty: "orchestrator",
    title: (element, horizon) => `Tune model/resource route for ${element} ${horizon} work`,
    payload: (element, horizon) => ({ element, horizon, policy: "cheapest_capable_with_escalation" }),
    resources: ["ai-gateway", "cost-ledger"],
  },
  {
    domain: "verification",
    specialty: "verification",
    title: (element, horizon) => `Verify ${element} claims against reproducible traces for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, gate: "proof_or_trace" }),
    resources: ["cargo-test", "artifact-storage"],
  },
  {
    domain: "causal-audit",
    specialty: "causal",
    title: (element, horizon) => `Audit ${element} causal/paradox claims for ${horizon} horizon`,
    payload: (element, horizon) => ({
      element,
      horizon,
      audit: ["dataset", "grouping", "x_y_definition", "pooled_r", "within_r", "reversal_magnitude"],
      rule: "quarantine_simpson_until_unified_audit",
    }),
    resources: ["d1-ledger-read", "artifact-storage"],
  },
  {
    domain: "rank-aware-manifold",
    specialty: "manifold",
    title: (element, horizon) => `Separate ${element} low-PR compression from strict ribbon law for ${horizon}`,
    payload: (element, horizon) => ({
      element,
      horizon,
      metrics: ["sample_count", "observable_count", "matrix_rank", "participation_ratio", "geometric_residual_cv"],
      rule: "low_pr_is_not_geometric_law",
    }),
    resources: ["cargo-test", "artifact-storage"],
  },
  {
    domain: "phonon-sentinel",
    specialty: "experiment",
    title: (element, horizon) => `Design ${element} phonon/curvature sentinel for ${horizon} horizon`,
    payload: (element, horizon) => ({
      element,
      horizon,
      observables: ["force_constants", "imaginary_modes", "pdos_distance", "small_displacement_sensitivity"],
      reason: "elastic compression must be tested against curvature errors",
    }),
    resources: ["local-gpu", "lammps-runner", "artifact-storage"],
  },
  {
    domain: "lean-formalization",
    specialty: "verification",
    title: (element, horizon) => `Prepare ${element} Lean gate for stable claims in ${horizon} horizon`,
    payload: (element, horizon) => ({
      element,
      horizon,
      gates: ["low_pr_compression", "insufficient_rank_guard", "trace_required", "causal_claim_status"],
    }),
    resources: ["lean-proof", "artifact-storage"],
  },
  {
    domain: "broadcast",
    specialty: "orchestrator",
    title: (element, horizon) => `Broadcast ${element} research state for ${horizon} horizon`,
    payload: (element, horizon) => ({ element, horizon, audience: "operators", includeTasks: true }),
    resources: ["r2-artifact-write"],
  },
];

export async function ensureAgendaSchema(env: Env) {
  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS intelligence_tasks (
      task_id TEXT PRIMARY KEY,
      parent_task_id TEXT,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      specialty TEXT NOT NULL,
      horizon TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'queued',
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      due_at TEXT,
      claimed_by TEXT,
      claimed_at TEXT,
      completed_at TEXT,
      result TEXT,
      artifact_key TEXT
    )
  `).run();

  await env.LEDGER.prepare(`
    CREATE INDEX IF NOT EXISTS idx_intelligence_tasks_queue
    ON intelligence_tasks(status, priority, due_at)
  `).run();

  await env.LEDGER.prepare(`
    CREATE INDEX IF NOT EXISTS idx_intelligence_tasks_specialty
    ON intelligence_tasks(specialty, status, priority)
  `).run();

  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS task_edges (
      from_task_id TEXT NOT NULL,
      to_task_id TEXT NOT NULL,
      edge_kind TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (from_task_id, to_task_id, edge_kind)
    )
  `).run();

  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS resource_requests (
      request_id TEXT PRIMARY KEY,
      task_id TEXT,
      resource_kind TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at TEXT DEFAULT (datetime('now')),
      fulfilled_at TEXT
    )
  `).run();

  await env.LEDGER.prepare(`
    CREATE INDEX IF NOT EXISTS idx_resource_requests_status
    ON resource_requests(status, resource_kind)
  `).run();

  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS operating_cycles (
      cycle_id TEXT PRIMARY KEY,
      cycle_kind TEXT NOT NULL,
      target_task_count INTEGER,
      inserted_tasks INTEGER,
      inserted_resources INTEGER,
      summary TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

export async function bootstrapAgenda(env: Env, opts: SeedOptions = {}) {
  await ensureAgendaSchema(env);
  const targetTaskCount = opts.targetTaskCount ?? 320;
  const cycleId = crypto.randomUUID();
  let insertedTasks = 0;
  let insertedResources = 0;

  for (const horizon of HORIZONS) {
    for (const element of ELEMENTS) {
      for (const template of TASK_TEMPLATES) {
        if (insertedTasks >= targetTaskCount) break;
        const taskId = [
          "agenda",
          template.domain,
          element.toLowerCase(),
          horizon.key,
        ].join(":");
        const result = await env.LEDGER.prepare(`
          INSERT OR IGNORE INTO intelligence_tasks
          (task_id, title, domain, specialty, horizon, priority, payload, due_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now', ?8))
        `).bind(
          taskId,
          template.title(element, horizon.key),
          template.domain,
          template.specialty,
          horizon.key,
          horizon.priority,
          JSON.stringify(template.payload(element, horizon.key)),
          `+${horizon.dueDays} days`,
        ).run();

        if (result.meta.changes > 0) {
          insertedTasks += result.meta.changes;
          for (const resource of template.resources) {
            const requestId = `${taskId}:resource:${resource}`;
            const resourceResult = await env.LEDGER.prepare(`
              INSERT OR IGNORE INTO resource_requests
              (request_id, task_id, resource_kind, reason)
              VALUES (?1, ?2, ?3, ?4)
            `).bind(
              requestId,
              taskId,
              resource,
              `Needed to execute ${template.domain} for ${element}`,
            ).run();
            insertedResources += resourceResult.meta.changes;
          }
        }
      }
    }
  }

  await env.LEDGER.prepare(`
    INSERT INTO operating_cycles
    (cycle_id, cycle_kind, target_task_count, inserted_tasks, inserted_resources, summary)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  `).bind(
    cycleId,
    opts.cycleKind ?? "manual",
    targetTaskCount,
    insertedTasks,
    insertedResources,
    opts.summary ?? "Seeded durable research agenda",
  ).run();

  return { cycleId, insertedTasks, insertedResources, targetTaskCount };
}

export async function agendaStatus(env: Env) {
  await ensureAgendaSchema(env);
  const [tasks, resources, cycles] = await Promise.all([
    env.LEDGER.prepare(`
      SELECT status, COUNT(*) as count
      FROM intelligence_tasks
      GROUP BY status
      ORDER BY status
    `).all(),
    env.LEDGER.prepare(`
      SELECT status, resource_kind, COUNT(*) as count
      FROM resource_requests
      GROUP BY status, resource_kind
      ORDER BY status, resource_kind
    `).all(),
    env.LEDGER.prepare(`
      SELECT *
      FROM operating_cycles
      ORDER BY created_at DESC
      LIMIT 5
    `).all(),
  ]);
  return { tasks: tasks.results, resources: resources.results, cycles: cycles.results };
}

export async function listAgendaTasks(env: Env, status: TaskStatus = "queued", limit = 50) {
  await ensureAgendaSchema(env);
  const rows = await env.LEDGER.prepare(`
    SELECT *
    FROM intelligence_tasks
    WHERE status = ?1
    ORDER BY priority ASC, due_at ASC, created_at ASC
    LIMIT ?2
  `).bind(status, Math.min(limit, 500)).all();
  return rows.results;
}

export async function claimAgendaTasks(env: Env, agentId: string, limit = 10, specialty?: string) {
  await ensureAgendaSchema(env);
  const cappedLimit = Math.min(Math.max(limit, 1), 100);
  const rows = specialty
    ? await env.LEDGER.prepare(`
        SELECT task_id
        FROM intelligence_tasks
        WHERE status = 'queued' AND specialty = ?1
        ORDER BY priority ASC, due_at ASC, created_at ASC
        LIMIT ?2
      `).bind(specialty, cappedLimit).all()
    : await env.LEDGER.prepare(`
        SELECT task_id
        FROM intelligence_tasks
        WHERE status = 'queued'
        ORDER BY priority ASC, due_at ASC, created_at ASC
        LIMIT ?1
      `).bind(cappedLimit).all();

  const ids = rows.results.map((row) => String((row as { task_id: string }).task_id));
  for (const taskId of ids) {
    await env.LEDGER.prepare(`
      UPDATE intelligence_tasks
      SET status = 'claimed', claimed_by = ?1, claimed_at = datetime('now'), updated_at = datetime('now')
      WHERE task_id = ?2 AND status = 'queued'
    `).bind(agentId, taskId).run();
  }

  const tasks = ids.length === 0
    ? { results: [] }
    : await env.LEDGER.prepare(`
        SELECT *
        FROM intelligence_tasks
        WHERE task_id IN (${ids.map((_, index) => `?${index + 1}`).join(",")})
      `).bind(...ids).all();
  return tasks.results;
}

export async function completeAgendaTask(env: Env, taskId: string, result: string, artifactKey?: string) {
  await ensureAgendaSchema(env);
  await env.LEDGER.prepare(`
    UPDATE intelligence_tasks
    SET status = 'done',
        result = ?2,
        artifact_key = ?3,
        completed_at = datetime('now'),
        updated_at = datetime('now')
    WHERE task_id = ?1
  `).bind(taskId, result, artifactKey ?? null).run();
  return { completed: taskId };
}

export async function updateAgendaTaskStatus(
  env: Env,
  taskId: string,
  status: TaskStatus,
  result?: string,
  artifactKey?: string,
) {
  await ensureAgendaSchema(env);
  await env.LEDGER.prepare(`
    UPDATE intelligence_tasks
    SET status = ?2,
        result = COALESCE(?3, result),
        artifact_key = COALESCE(?4, artifact_key),
        updated_at = datetime('now')
    WHERE task_id = ?1
  `).bind(taskId, status, result ?? null, artifactKey ?? null).run();
  return { taskId, status };
}
