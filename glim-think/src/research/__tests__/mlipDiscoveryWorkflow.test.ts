import { describe, expect, it } from "vitest";
import { handleResearchWorkflowRoute } from "../workflows";
import { buildStubEnv, stubLedger } from "../../testing/envStub";

const records = [
  {
    record_id: "W_chgnet_C11_run",
    element: "W",
    potential_id: "chgnet",
    potential_label: "chgnet (HF Space)",
    pair_style: "mlip",
    property: "C11",
    reference: 522,
    predicted: 245.29,
    unit: "GPa",
    provenance: JSON.stringify({ github_run_id: "27206839783", discovery_campaign_id: "github:27206839783" }),
    agent_id: "glim-mlip-bench",
    timestamp: "2026-06-09T12:42:33Z",
  },
  {
    record_id: "W_chgnet_C12_run",
    element: "W",
    potential_id: "chgnet",
    potential_label: "chgnet (HF Space)",
    pair_style: "mlip",
    property: "C12",
    reference: 204,
    predicted: 166.64,
    unit: "GPa",
    provenance: JSON.stringify({ github_run_id: "27206839783", discovery_campaign_id: "github:27206839783" }),
    agent_id: "glim-mlip-bench",
    timestamp: "2026-06-09T12:42:33Z",
  },
  {
    record_id: "W_chgnet_C44_run",
    element: "W",
    potential_id: "chgnet",
    potential_label: "chgnet (HF Space)",
    pair_style: "mlip",
    property: "C44",
    reference: 161,
    predicted: 61.87,
    unit: "GPa",
    provenance: JSON.stringify({ github_run_id: "27206839783", discovery_campaign_id: "github:27206839783" }),
    agent_id: "glim-mlip-bench",
    timestamp: "2026-06-09T12:42:33Z",
  },
  {
    record_id: "Al_chgnet_a0_run",
    element: "Al",
    potential_id: "chgnet",
    potential_label: "chgnet (HF Space)",
    pair_style: "mlip",
    property: "a0",
    reference: 4.05,
    predicted: 4.07,
    unit: "angstrom",
    provenance: JSON.stringify({ github_run_id: "27206839783", discovery_campaign_id: "github:27206839783" }),
    agent_id: "glim-mlip-bench",
    timestamp: "2026-06-09T12:42:33Z",
  },
];

function envWithRecords(onPrepare?: (sql: string, bindings: readonly unknown[]) => void) {
  return buildStubEnv({
    LEDGER: stubLedger({
      onPrepare,
      queries: [
        {
          match: "GROUP BY discovery_campaign_id",
          first: {
            discovery_campaign_id: null,
            github_run_id: "27206839783",
            latest_timestamp: "2026-06-09T12:42:33Z",
          },
        },
        {
          match: "FROM records",
          all: records,
        },
      ],
    }),
  });
}

describe("MLIP discovery workflow", () => {
  it("is registered as a first-class workflow descriptor", async () => {
    const response = await handleResearchWorkflowRoute(
      buildStubEnv(),
      new URL("https://worker.test/research/workflows/mlip-discovery-loop"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      workflow: { workflow_id: string; phoenix: { evaluators: string[] } };
    };

    expect(response?.status).toBe(200);
    expect(body.workflow.workflow_id).toBe("mlip-discovery-loop");
    expect(body.workflow.phoenix.evaluators).toContain("mlip_discovery.high_error_sentinel");
  });

  it("creates an immediate analyzer snapshot from posted benchmark records", async () => {
    const response = await handleResearchWorkflowRoute(
      buildStubEnv(),
      new URL("https://worker.test/research/workflows/mlip-discovery-loop/campaigns"),
      "POST",
      JSON.stringify({
        github_run_id: "27206839783",
        records,
      }),
    );
    const body = await response?.json() as {
      campaign_id: string;
      counters: Record<string, number>;
      next_actions: Array<{ kind: string; reason: string }>;
    };

    expect(response?.status).toBe(202);
    expect(body.campaign_id).toBe("github:27206839783");
    expect(body.counters.records_total).toBe(4);
    expect(body.counters.units_high_error).toBeGreaterThan(0);
    expect(body.counters.units_cross_model_gap).toBeGreaterThan(0);
    expect(body.next_actions.some((action) => action.kind === "evaluate_hypothesis")).toBe(true);
  });

  it("serves next discovery units from records persisted in the D1 ledger", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithRecords(),
      new URL("https://worker.test/research/workflows/mlip-discovery-loop/campaigns/github%3A27206839783/units/next?limit=2"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      units: Array<{ unit_id: string; sentinel_kind: string; element: string }>;
    };

    expect(response?.status).toBe(200);
    expect(body.units).toHaveLength(2);
    expect(body.units[0]).toMatchObject({ sentinel_kind: "high_error", element: "W" });
  });

  it("maintains the discovery loop by inserting agenda tasks", async () => {
    const prepared: string[] = [];
    const response = await handleResearchWorkflowRoute(
      envWithRecords((sql) => prepared.push(sql)),
      new URL("https://worker.test/research/workflows/mlip-discovery-loop/campaigns/github%3A27206839783/maintain"),
      "POST",
      JSON.stringify({ mode: "agenda", limit: 2 }),
    );
    const body = await response?.json() as {
      agenda: { attempted: number; task_ids: string[] };
      counters: Record<string, number>;
    };

    expect(response?.status).toBe(200);
    expect(body.agenda.attempted).toBe(2);
    expect(body.agenda.task_ids[0]).toContain("workflow:mlip-discovery-loop:github:27206839783");
    expect(body.counters.records_total).toBe(4);
    expect(prepared.some((sql) => sql.includes("INSERT OR IGNORE INTO intelligence_tasks"))).toBe(true);
  });

  it("serves a compact public progress packet for the latest benchmark run", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithRecords(),
      new URL("https://worker.test/research/mlip-discovery/progress"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      campaign_id: string;
      headline: string;
      progress: { records: number; sentinels: number; agenda_actions: number };
      latest_run: { github_run_id: string | null };
      steps: Array<{ id: string; state: string }>;
      links: { ops: string | null };
    };

    expect(response?.status).toBe(200);
    expect(body.campaign_id).toBe("github:27206839783");
    expect(body.latest_run.github_run_id).toBe("27206839783");
    expect(body.progress.records).toBe(4);
    expect(body.progress.sentinels).toBeGreaterThan(0);
    expect(body.progress.agenda_actions).toBeGreaterThan(0);
    expect(body.headline).toContain("sentinels");
    expect(body.steps.map((step) => step.id)).toEqual(["evidence", "analyzer", "agenda"]);
    expect(body.links.ops).toContain("/research/workflows/mlip-discovery-loop/campaigns/");
  });
});
