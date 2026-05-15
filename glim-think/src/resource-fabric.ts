import type { Env } from "./types";

export interface ResourceRegistration {
  resourceId?: string;
  provider: string;
  resourceKind: string;
  region?: string;
  status?: string;
  capacityUnits?: number;
  capabilities?: string[];
  endpoint?: string;
  costHint?: string;
  metadata?: Record<string, unknown>;
}

export interface ResourceAllocationRequest {
  requestId?: string;
  taskId?: string;
  resourceKind?: string;
  capability?: string;
  agentId?: string;
  reason?: string;
}

const DEFAULT_RESOURCES: ResourceRegistration[] = [
  {
    resourceId: "cloudflare-edge-control",
    provider: "cloudflare",
    resourceKind: "edge-control-plane",
    region: "global",
    status: "available",
    capacityUnits: 100,
    capabilities: ["agenda", "durable-objects", "d1-ledger", "r2-artifacts", "workers-ai", "cron"],
    costHint: "always-on, cheap coordination",
    metadata: { role: "brain" },
  },
  {
    resourceId: "local-rtx-a4500",
    provider: "local",
    resourceKind: "local-gpu",
    region: "workstation",
    status: "available",
    capacityUnits: 20,
    capabilities: [
      "cuda",
      "20gb-vram",
      "lammps",
      "lammps-runner",
      "mlip",
      "batch-scoring",
      "private-data",
      "tier-4-sandbox",
      "phonon-sentinel",
    ],
    costHint: "preferred heavy worker while workstation is awake",
    metadata: { gpu: "NVIDIA RTX A4500", vramMiB: 20470 },
  },
  {
    resourceId: "gcp-shed-burst",
    provider: "gcp",
    resourceKind: "gcp-burst",
    region: "us-central1",
    status: "standby",
    capacityUnits: 1000,
    capabilities: ["cloud-run-jobs", "artifact-registry", "gpu-burst", "long-batch"],
    costHint: "scale only after local queue proves demand",
    metadata: { project: "shed-489901" },
  },
  {
    resourceId: "formalization-lane",
    provider: "local",
    resourceKind: "formalization",
    region: "repo",
    status: "available",
    capacityUnits: 10,
    capabilities: ["lean", "proof-obligations", "audit-ledger", "trace-to-theorem"],
    costHint: "human-reviewed formalization queue",
    metadata: { root: "lean-spec" },
  },
];

export async function ensureResourceFabricSchema(env: Env) {
  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS execution_resources (
      resource_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      resource_kind TEXT NOT NULL,
      region TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      capacity_units INTEGER NOT NULL DEFAULT 1,
      capabilities TEXT NOT NULL DEFAULT '[]',
      endpoint TEXT,
      cost_hint TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_heartbeat_at TEXT
    )
  `).run();

  await env.LEDGER.prepare(`
    CREATE INDEX IF NOT EXISTS idx_execution_resources_kind
    ON execution_resources(resource_kind, status)
  `).run();

  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS resource_allocations (
      allocation_id TEXT PRIMARY KEY,
      request_id TEXT,
      task_id TEXT,
      resource_id TEXT NOT NULL,
      agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'allocated',
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      released_at TEXT
    )
  `).run();

  await env.LEDGER.prepare(`
    CREATE INDEX IF NOT EXISTS idx_resource_allocations_task
    ON resource_allocations(task_id, status)
  `).run();

  await env.LEDGER.prepare(`
    CREATE TABLE IF NOT EXISTS resource_events (
      event_id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      event_kind TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

export async function registerResource(env: Env, input: ResourceRegistration) {
  await ensureResourceFabricSchema(env);
  const resourceId = input.resourceId ?? `${input.provider}:${input.resourceKind}:${crypto.randomUUID()}`;
  await env.LEDGER.prepare(`
    INSERT INTO execution_resources
    (resource_id, provider, resource_kind, region, status, capacity_units, capabilities, endpoint, cost_hint, metadata, last_heartbeat_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
    ON CONFLICT(resource_id) DO UPDATE SET
      provider = excluded.provider,
      resource_kind = excluded.resource_kind,
      region = excluded.region,
      status = excluded.status,
      capacity_units = excluded.capacity_units,
      capabilities = excluded.capabilities,
      endpoint = excluded.endpoint,
      cost_hint = excluded.cost_hint,
      metadata = excluded.metadata,
      updated_at = datetime('now'),
      last_heartbeat_at = datetime('now')
  `).bind(
    resourceId,
    input.provider,
    input.resourceKind,
    input.region ?? null,
    input.status ?? "available",
    input.capacityUnits ?? 1,
    JSON.stringify(input.capabilities ?? []),
    input.endpoint ?? null,
    input.costHint ?? null,
    JSON.stringify(input.metadata ?? {}),
  ).run();

  await env.LEDGER.prepare(`
    INSERT INTO resource_events (event_id, resource_id, event_kind, payload)
    VALUES (?1, ?2, 'registered', ?3)
  `).bind(crypto.randomUUID(), resourceId, JSON.stringify(input)).run();

  return { resourceId, registered: true };
}

export async function bootstrapResourceFabric(env: Env) {
  const registered = [];
  for (const resource of DEFAULT_RESOURCES) {
    registered.push(await registerResource(env, resource));
  }
  return { registered };
}

export async function heartbeatResource(
  env: Env,
  resourceId: string,
  status = "available",
  metadata: Record<string, unknown> = {},
) {
  await ensureResourceFabricSchema(env);
  await env.LEDGER.prepare(`
    UPDATE execution_resources
    SET status = ?2,
        metadata = CASE WHEN ?3 = '{}' THEN metadata ELSE ?3 END,
        last_heartbeat_at = datetime('now'),
        updated_at = datetime('now')
    WHERE resource_id = ?1
  `).bind(resourceId, status, JSON.stringify(metadata)).run();

  await env.LEDGER.prepare(`
    INSERT INTO resource_events (event_id, resource_id, event_kind, payload)
    VALUES (?1, ?2, 'heartbeat', ?3)
  `).bind(crypto.randomUUID(), resourceId, JSON.stringify({ status, metadata })).run();

  return { resourceId, heartbeat: true, status };
}

export async function resourceFabricStatus(env: Env) {
  await ensureResourceFabricSchema(env);
  const [resources, pendingRequests, allocations] = await Promise.all([
    env.LEDGER.prepare(`
      SELECT *
      FROM execution_resources
      ORDER BY provider, resource_kind, resource_id
    `).all(),
    env.LEDGER.prepare(`
      SELECT resource_kind, status, COUNT(*) as count
      FROM resource_requests
      GROUP BY resource_kind, status
      ORDER BY resource_kind, status
    `).all(),
    env.LEDGER.prepare(`
      SELECT resource_id, status, COUNT(*) as count
      FROM resource_allocations
      GROUP BY resource_id, status
      ORDER BY resource_id, status
    `).all(),
  ]);

  return {
    resources: resources.results,
    pendingRequests: pendingRequests.results,
    allocations: allocations.results,
  };
}

export async function allocateResource(env: Env, input: ResourceAllocationRequest) {
  await ensureResourceFabricSchema(env);
  const candidate = await findCandidateResource(env, input.resourceKind, input.capability);
  if (!candidate) {
    return {
      allocated: false,
      reason: "No matching available resource",
      requested: input,
    };
  }

  const resourceId = String((candidate as { resource_id: string }).resource_id);
  const allocationId = crypto.randomUUID();
  await env.LEDGER.prepare(`
    INSERT INTO resource_allocations
    (allocation_id, request_id, task_id, resource_id, agent_id, reason)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  `).bind(
    allocationId,
    input.requestId ?? null,
    input.taskId ?? null,
    resourceId,
    input.agentId ?? null,
    input.reason ?? null,
  ).run();

  if (input.requestId) {
    await env.LEDGER.prepare(`
      UPDATE resource_requests
      SET status = 'allocated', fulfilled_at = datetime('now')
      WHERE request_id = ?1
    `).bind(input.requestId).run();
  }

  return { allocated: true, allocationId, resourceId };
}

async function findCandidateResource(env: Env, resourceKind?: string, capability?: string) {
  const statusClause = "status IN ('available', 'online', 'standby')";
  if (resourceKind && capability) {
    const rows = await env.LEDGER.prepare(`
      SELECT *
      FROM execution_resources
      WHERE (resource_kind = ?1 OR capabilities LIKE ?2) AND capabilities LIKE ?3 AND ${statusClause}
      ORDER BY CASE status WHEN 'available' THEN 0 WHEN 'online' THEN 1 ELSE 2 END, capacity_units DESC
      LIMIT 1
    `).bind(resourceKind, `%${resourceKind}%`, `%${capability}%`).all();
    return rows.results[0];
  }

  if (resourceKind) {
    const rows = await env.LEDGER.prepare(`
      SELECT *
      FROM execution_resources
      WHERE (resource_kind = ?1 OR capabilities LIKE ?2) AND ${statusClause}
      ORDER BY CASE status WHEN 'available' THEN 0 WHEN 'online' THEN 1 ELSE 2 END, capacity_units DESC
      LIMIT 1
    `).bind(resourceKind, `%${resourceKind}%`).all();
    return rows.results[0];
  }

  if (capability) {
    const rows = await env.LEDGER.prepare(`
      SELECT *
      FROM execution_resources
      WHERE capabilities LIKE ?1 AND ${statusClause}
      ORDER BY CASE status WHEN 'available' THEN 0 WHEN 'online' THEN 1 ELSE 2 END, capacity_units DESC
      LIMIT 1
    `).bind(`%${capability}%`).all();
    return rows.results[0];
  }

  const rows = await env.LEDGER.prepare(`
    SELECT *
    FROM execution_resources
    WHERE ${statusClause}
    ORDER BY capacity_units DESC
    LIMIT 1
  `).all();
  return rows.results[0];
}
