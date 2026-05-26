import { describe, expect, it } from "vitest";
import { handleResearchWorkflowRoute } from "../workflows";
import { buildStubEnv, stubLedger } from "../../testing/envStub";
import type { MlipCampaignCell } from "../mlipCampaign";

function cell(variantId: string, status: MlipCampaignCell["status"] = "queued"): MlipCampaignCell {
  return {
    cell_id: `c:${variantId}:elastic_constants:mace-mp-0`,
    campaign_id: "c",
    row_id: "elastic_constants",
    mlip_id: "mace-mp-0",
    variant_id: variantId,
    fixture_url: `r2://mlip/${variantId}/elastic_constants/mace-mp-0.csv`,
    status,
    job_id: null,
    accuracy_score: null,
    accuracy_unit: null,
    speed_score: null,
    speed_unit: null,
    metrics_json: null,
    created_at: "now",
    updated_at: "now",
  };
}

function envWithCampaign(onPrepare?: (sql: string, bindings: readonly unknown[]) => void) {
  return buildStubEnv({
    LEDGER: stubLedger({
      onPrepare,
      queries: [
        {
          match: "FROM mlip_campaigns",
          first: {
            campaign_id: "c",
            hypothesis_id: "h",
            title: "MLIP system",
            status: "running",
            rows_json: "[]",
            mlips_json: "[]",
            variants_json: "[]",
            fixture_url_template: null,
            model_pairs_json: "[]",
            top_k: 5,
            quality_gate: "accuracy",
            created_at: "now",
            updated_at: "now",
          },
        },
        {
          match: "FROM mlip_campaign_cells",
          all: [
            cell("baseline"),
            cell("distill_accuracy"),
            cell("distill_accuracy_accelerate"),
          ] as unknown as Record<string, unknown>[],
        },
        {
          match: "FROM mlip_campaign_triplet_evals",
          all: [],
        },
      ],
    }),
  });
}

describe("research workflow routes", () => {
  it("lists registered first-class workflow families", async () => {
    const response = await handleResearchWorkflowRoute(
      buildStubEnv(),
      new URL("https://worker.test/research/workflows"),
      "GET",
      "",
    );
    const body = await response?.json() as { workflows: Array<{ workflow_id: string; cloudflare: unknown }> };

    expect(response?.status).toBe(200);
    expect(body.workflows.map((workflow) => workflow.workflow_id)).toContain("mlip-5x5x3");
    expect(body.workflows[0].cloudflare).toBeTruthy();
  });

  it("describes one workflow as a git, Cloudflare, and Phoenix contract", async () => {
    const response = await handleResearchWorkflowRoute(
      buildStubEnv(),
      new URL("https://worker.test/research/workflows/mlip-5x5x3"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      workflow: {
        git: { files: string[] };
        cloudflare: { routes: string[] };
        phoenix: { evaluators: string[] };
      };
    };

    expect(response?.status).toBe(200);
    expect(body.workflow.git.files).toContain("glim-think/src/research/mlipWorkflowOps.ts");
    expect(body.workflow.cloudflare.routes).toContain("GET /research/workflows/mlip-5x5x3/campaigns/:campaign_id/ops");
    expect(body.workflow.phoenix.evaluators).toContain("mlip_triplet.delta_verdict");
    expect(body.workflow.phoenix.evaluators).toContain("distill.leakage_guard");
    expect(body.workflow.phoenix.evaluators).toContain("distill.state_coupled_lattice_lift");
  });

  it("renders a 5x5x3 Phoenix packet with stable dataset examples", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithCampaign(),
      new URL("https://worker.test/research/workflows/mlip-5x5x3/campaigns/c/report?format=phoenix"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      phoenix: { project: { name: string }; dataset: { name: string } };
      examples: Array<{ example_id: string; metadata: { example_granularity?: string } }>;
      experiments: Array<{ variant_id: string; runs: Array<{ example_id: string }> }>;
      state_hypotheses: Array<{ hypothesis_id: string; verdict: string }>;
    };

    expect(response?.status).toBe(200);
    expect(body.phoenix.project.name).toBe("glim-think");
    expect(body.phoenix.dataset.name).toBe("mlip-canonical-v2-heldout");
    expect(body.examples).toHaveLength(1);
    expect(body.examples[0]).toMatchObject({
      example_id: "canonical-structures-v2:elastic_constants:mace-mp-0",
      metadata: { example_granularity: "row_mlip_cell" },
    });
    expect(body.experiments.map((experiment) => experiment.variant_id)).toEqual([
      "baseline",
      "distill_accuracy",
      "distill_accuracy_accelerate",
    ]);
    expect(body.experiments[0].runs[0].example_id).toBe(body.examples[0].example_id);
    expect(body.state_hypotheses[0]).toMatchObject({
      hypothesis_id: "distill.state_surface_lifts_downstream",
      verdict: "insufficient_data",
    });
  });

  it("serves MLIP units through the generic workflow surface", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithCampaign(),
      new URL("https://worker.test/research/workflows/mlip-5x5x3/campaigns/c/units/next?limit=1"),
      "GET",
      "",
    );
    const body = await response?.json() as { units: Array<{ unit_id: string; unit_kind: string }> };

    expect(response?.status).toBe(200);
    expect(body.units).toHaveLength(1);
    expect(body.units[0]).toMatchObject({
      unit_id: "elastic_constants:mace-mp-0",
      unit_kind: "mlip_triplet",
    });
  });

  it("keeps the legacy MLIP triplet URL as a compatibility alias", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithCampaign(),
      new URL("https://worker.test/research/mlip-campaign/c/triplets/next?limit=1"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      units: Array<{ unit_id: string }>;
      triplets: Array<{ unit_id: string }>;
    };

    expect(response?.status).toBe(200);
    expect(body.units[0].unit_id).toBe("elastic_constants:mace-mp-0");
    expect(body.triplets[0].unit_id).toBe("elastic_constants:mace-mp-0");
  });

  it("inspects campaign ops so agents can see the next executable action", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithCampaign(),
      new URL("https://worker.test/research/workflows/mlip-5x5x3/campaigns/c/ops"),
      "GET",
      "",
    );
    const body = await response?.json() as {
      state: string;
      counters: Record<string, number>;
      next_actions: Array<{ kind: string; route?: { path: string } }>;
      phoenix: { expected_evaluators: string[] };
    };

    expect(response?.status).toBe(200);
    expect(body.state).toBe("active");
    expect(body.counters.actions_enqueue_unit).toBe(1);
    expect(body.next_actions[0].kind).toBe("enqueue_unit");
    expect(body.next_actions[0].route?.path).toContain("/research/workflows/mlip-5x5x3/campaigns/c/units/");
    expect(body.phoenix.expected_evaluators).toContain("model_geometry.dispatch_contract");
  });

  it("maintains campaign ops by queuing agenda tasks for autonomous follow-up", async () => {
    const prepared: string[] = [];
    const response = await handleResearchWorkflowRoute(
      envWithCampaign((sql) => prepared.push(sql)),
      new URL("https://worker.test/research/workflows/mlip-5x5x3/campaigns/c/maintain"),
      "POST",
      JSON.stringify({ mode: "agenda", limit: 1 }),
    );
    const body = await response?.json() as { agenda: { attempted: number; task_ids: string[] } };

    expect(response?.status).toBe(200);
    expect(body.agenda.attempted).toBe(1);
    expect(body.agenda.task_ids[0]).toContain("workflow:mlip-5x5x3:c:enqueue");
    expect(prepared.some((sql) => sql.includes("INSERT OR IGNORE INTO intelligence_tasks"))).toBe(true);
  });
});
