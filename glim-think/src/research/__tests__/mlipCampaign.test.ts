import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCURACY_ROWS,
  DEFAULT_CAMPAIGN_VARIANTS,
  DEFAULT_MLIP_COLUMNS,
  buildMlipCampaignCells,
  createMlipCampaign,
  evaluateMlipTriplet,
  getMlipCampaign,
  groupMlipCampaignTriplets,
  nextMlipCampaignTriplets,
  recordMlipCampaignBeat,
  renderFixtureUrl,
  summarizeMlipCampaign,
  type MlipCampaignCell,
} from "../mlipCampaign";
import { buildMlipCellRunPayload, distillProfileForVariant } from "../queue";
import { buildMlip5x5x3PhoenixPacket, MLIP_PHOENIX_EVALUATOR_SPECS } from "../mlipPhoenix";
import { evaluateMlipStateHypotheses } from "../mlipStateHypotheses";
import { buildStubEnv, stubLedger } from "../../testing/envStub";

function campaignCell(
  variantId: string,
  opts: {
    rowId?: string;
    mlipId?: string;
    status?: MlipCampaignCell["status"];
    accuracy?: number | null;
    speed?: number | null;
  } = {},
): MlipCampaignCell {
  const rowId = opts.rowId ?? "elastic_constants";
  const mlipId = opts.mlipId ?? "mace-mp-0";
  return {
    cell_id: `c:${variantId}:${rowId}:${mlipId}`,
    campaign_id: "c",
    row_id: rowId,
    mlip_id: mlipId,
    variant_id: variantId,
    fixture_url: `r2://mlip/${variantId}/${rowId}/${mlipId}.csv`,
    status: opts.status ?? "queued",
    job_id: null,
    accuracy_score: opts.accuracy ?? null,
    accuracy_unit: opts.accuracy === undefined ? null : "score",
    speed_score: opts.speed ?? null,
    speed_unit: opts.speed === undefined ? null : "rows_s",
    metrics_json: null,
    created_at: "now",
    updated_at: "now",
  };
}

describe("mlipCampaign", () => {
  it("builds the fixed 5x5x3 campaign cells", () => {
    const cells = buildMlipCampaignCells(
      "campaign-a",
      DEFAULT_ACCURACY_ROWS,
      DEFAULT_MLIP_COLUMNS,
      DEFAULT_CAMPAIGN_VARIANTS,
      "gs://bucket/{campaign_id}/{variant_id}/{row_id}/{mlip_id}.csv",
    );

    expect(cells).toHaveLength(75);
    expect(cells[0]).toMatchObject({
      campaign_id: "campaign-a",
      variant_id: "baseline",
      row_id: "elastic_constants",
      mlip_id: "mace-mp-0",
      fixture_url: "gs://bucket/campaign-a/baseline/elastic_constants/mace-mp-0.csv",
    });
  });

  it("preserves canonical underscore IDs when creating default campaigns", async () => {
    const insertedCells: unknown[][] = [];
    const env = buildStubEnv({
      LEDGER: stubLedger({
        onPrepare: (sql, bindings) => {
          if (sql.includes("INSERT OR IGNORE INTO mlip_campaign_cells")) {
            insertedCells.push([...bindings]);
          }
        },
      }),
    });

    await createMlipCampaign(env, {
      campaign_id: "campaign-a",
      hypothesis_id: "h",
    });

    expect(insertedCells).toHaveLength(75);
    expect(insertedCells.some((bindings) => bindings[0] === "campaign-a:distill_accuracy_accelerate:energy_volume:chgnet")).toBe(true);
    expect(insertedCells.some((bindings) => bindings[2] === "energy-volume")).toBe(false);
    expect(insertedCells.some((bindings) => bindings[4] === "distill-accuracy")).toBe(false);
  });

  it("can create an accuracy-only 25-pair campaign without acceleration cells", async () => {
    const insertedCells: unknown[][] = [];
    const env = buildStubEnv({
      LEDGER: stubLedger({
        onPrepare: (sql, bindings) => {
          if (sql.includes("INSERT OR IGNORE INTO mlip_campaign_cells")) {
            insertedCells.push([...bindings]);
          }
        },
      }),
    });

    await createMlipCampaign(env, {
      campaign_id: "campaign-accuracy",
      hypothesis_id: "h",
      variant_scope: "accuracy",
    });

    expect(insertedCells).toHaveLength(50);
    expect(insertedCells.some((bindings) => String(bindings[0]).includes(":distill_accuracy:"))).toBe(true);
    expect(insertedCells.some((bindings) => String(bindings[0]).includes(":distill_accuracy_accelerate:"))).toBe(false);
  });

  it("builds real MLIP runner dispatch payloads for Distill variants", () => {
    const payload = buildMlipCellRunPayload(
      buildStubEnv({
        GCP_PROJECT_ID: "shed-489901",
        MLIP_5X5X3_OUTPUT_PREFIX: "gs://outputs/mlip-5x5x3",
        MLIP_DISTILL_POLICY_URL: "gs://inputs/policies/hyperribbon-v2.json",
      }),
      {
        kind: "mlip_cell_run",
        dedup_key: "d",
        enqueued_at: "now",
        hypothesis_id: "h",
        run_id: "run-a",
        campaign_id: "run-a",
        cell_id: "run-a:distill_accuracy:forces:mace-mp-0",
        row_id: "forces",
        mlip_id: "mace-mp-0",
        variant_id: "distill_accuracy",
        manifest_url: "gs://inputs/eval.json",
        support_manifest_url: "gs://inputs/support.json",
      },
      "https://worker.test/feed/beats",
    );

    expect(payload.command).toBe("run-cell");
    expect(payload.target_job).toBe("mlip-cell-mace");
    expect(payload.args).toContain("--distill-profile");
    expect(payload.args).toContain("accuracy");
    expect(payload.args).toContain("--support-manifest-url");
    expect(payload.args).toContain("--distill-policy-engine");
    expect(payload.args).toContain("auto");
    expect(payload.args).toContain("--ribbon-version");
    expect(payload.args).toContain("hyperribbon-v1");
    expect(payload.args).toContain("--distill-policy-url");
    expect(payload.args).toContain("gs://inputs/policies/hyperribbon-v2.json");
    expect(payload.fixture_url).toBe("gs://inputs/eval.json");
  });

  it("normalizes legacy hyphenated campaign IDs before runner dispatch", () => {
    const payload = buildMlipCellRunPayload(
      buildStubEnv({
        GCP_PROJECT_ID: "shed-489901",
        MLIP_5X5X3_OUTPUT_PREFIX: "gs://outputs/mlip-5x5x3",
      }),
      {
        kind: "mlip_cell_run",
        dedup_key: "d",
        enqueued_at: "now",
        hypothesis_id: "h",
        run_id: "run-a",
        campaign_id: "run-a",
        cell_id: "run-a:distill-accuracy:energy-volume:chgnet",
        row_id: "energy-volume",
        mlip_id: "chgnet",
        variant_id: "distill-accuracy" as "distill_accuracy",
        manifest_url: "gs://inputs/eval.json",
        support_manifest_url: "gs://inputs/support.json",
      },
      "https://worker.test/feed/beats",
    );

    const args = payload.args ?? [];
    const rowIdArg = args[args.indexOf("--row-id") + 1];
    const variantIdArg = args[args.indexOf("--variant-id") + 1];
    const distillProfileArg = args[args.indexOf("--distill-profile") + 1];
    const artifactPrefixArg = args[args.indexOf("--artifact-prefix") + 1];

    expect(rowIdArg).toBe("energy_volume");
    expect(variantIdArg).toBe("distill_accuracy");
    expect(distillProfileArg).toBe("accuracy");
    expect(artifactPrefixArg).toContain("/distill_accuracy/energy_volume/");
    expect(distillProfileForVariant("distill-accuracy-accelerate")).toBe("accuracy_accelerate");
  });

  it("resolves per-cell Distill policy URLs from an accuracy registry", () => {
    const payload = buildMlipCellRunPayload(
      buildStubEnv({
        GCP_PROJECT_ID: "shed-489901",
        MLIP_DISTILL_POLICY_URLS_JSON: JSON.stringify({
          "stress:mace-mp-0": "gs://policies/mace-stress.json",
          default_accuracy: "gs://policies/default-accuracy.json",
        }),
      }),
      {
        kind: "mlip_cell_run",
        dedup_key: "d",
        enqueued_at: "now",
        hypothesis_id: "h",
        run_id: "run-a",
        campaign_id: "run-a",
        cell_id: "run-a:distill_accuracy:stress:mace-mp-0",
        row_id: "stress",
        mlip_id: "mace-mp-0",
        variant_id: "distill_accuracy",
        manifest_url: "gs://inputs/eval.json",
        support_manifest_url: "gs://inputs/support.json",
      },
      "https://worker.test/feed/beats",
    );

    const args = payload.args ?? [];
    expect(args[args.indexOf("--distill-policy-url") + 1]).toBe("gs://policies/mace-stress.json");
  });

  it("declares Phoenix evaluators for Distill runtime and theorem hooks", () => {
    const names = MLIP_PHOENIX_EVALUATOR_SPECS.map((spec) => spec.name);

    expect(names).toContain("distill.leakage_guard");
    expect(names).toContain("distill.intervention_trace");
    expect(names).toContain("distill.policy_limits_selected");
    expect(names).toContain("distill.support_correction_executable");
    expect(names).toContain("distill.state_surface_anchor");
    expect(names).toContain("distill.downstream_no_harm");
    expect(names).toContain("distill.state_coupled_lattice_lift");
    expect(names).toContain("distill.target.v2_promotion_gate");
    expect(names).toContain("theorem.speedup_bound_observed");
    expect(names).toContain("theorem.lean_bridge_ready");
    expect(distillProfileForVariant("distill_accuracy_accelerate")).toBe("accuracy_accelerate");
  });

  it("confirms the state-coupled hypothesis only when the energy anchor lifts downstream rows", () => {
    const cells = ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"].flatMap((rowId) => [
      campaignCell("baseline", { rowId, status: "completed", accuracy: 0.7, speed: 10 }),
      campaignCell("distill_accuracy", { rowId, status: "completed", accuracy: 0.82, speed: 9 }),
    ]);

    const [campaign, mlip] = evaluateMlipStateHypotheses(cells);

    expect(campaign.verdict).toBe("confirmed");
    expect(mlip.verdict).toBe("confirmed");
    expect(mlip.energy_anchor.row_id).toBe("energy_volume");
    expect(mlip.downstream.every((row) => row.label === "win")).toBe(true);
  });

  it("refutes the state-coupled hypothesis when a state anchor win causes a downstream regression", () => {
    const cells = [
      campaignCell("baseline", { rowId: "energy_volume", status: "completed", accuracy: 0.7 }),
      campaignCell("distill_accuracy", { rowId: "energy_volume", status: "completed", accuracy: 0.82 }),
      campaignCell("baseline", { rowId: "stress", status: "completed", accuracy: 0.9 }),
      campaignCell("distill_accuracy", { rowId: "stress", status: "completed", accuracy: 0.82 }),
    ];

    const [campaign, mlip] = evaluateMlipStateHypotheses(cells);

    expect(campaign.verdict).toBe("refuted");
    expect(mlip.verdict).toBe("refuted");
    expect(mlip.blockers).toContain("downstream_regression_stress");
  });

  it("builds a Phoenix packet with all three 5x5x3 experiments", () => {
    const cells = [
      campaignCell("baseline", { status: "completed", accuracy: 0.7, speed: 10 }),
      campaignCell("distill_accuracy", { status: "completed", accuracy: 0.82, speed: 9 }),
      {
        ...campaignCell("distill_accuracy_accelerate", { status: "completed", accuracy: 0.81, speed: 14 }),
        metrics_json: JSON.stringify({
          distill_runtime: {
            profile: "accuracy_accelerate",
            support_manifest_hash: "sha256:support",
            leakage_guard: { passed: true },
            support_model: {
              correction: { energy_bias_ev_per_atom: -0.1 },
              diagnostics: { applicability_gate: "passed" },
            },
            distill_policy_hash: "sha256:policy",
            intervention_count: 2,
            refusal_count: 0,
            events_uri: "gs://events/distill.jsonl",
          },
          theorem_hooks: { bridge: "outer_loop_proxy", kappa1_hat: 0.2, observed_speedup: 1.4 },
        }),
      },
    ];
    const packet = buildMlip5x5x3PhoenixPacket({
      campaign: {
        campaign_id: "c",
        hypothesis_id: "h",
        title: "MLIP 5x5x3",
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
      cells,
      triplets: [],
      evaluations: [],
      summary: { cells: 3 },
    });

    expect(packet.schema).toBe("lupine.mlip.phoenix_5x5x3_packet.v1");
    expect(packet.state_hypotheses[0]).toMatchObject({
      hypothesis_id: "distill.state_surface_lifts_downstream",
      scope: "campaign",
    });
    expect(packet.experiments.map((experiment) => experiment.variant_id)).toEqual([
      "baseline",
      "distill_accuracy",
      "distill_accuracy_accelerate",
    ]);
    expect(packet.examples).toHaveLength(1);
    expect(packet.experiments[2].runs[0].evaluations.map((evaluation) => evaluation.evaluator_name)).toContain(
      "theorem.speedup_bound_observed",
    );
    expect(packet.experiments[1].runs[0].evaluations.map((evaluation) => evaluation.evaluator_name)).toContain(
      "mlip.gate.distill_accuracy_win",
    );
    expect(packet.experiments[1].runs[0].evaluations.map((evaluation) => evaluation.evaluator_name)).toContain(
      "distill.downstream_no_harm",
    );
    expect(packet.experiments[2].runs[0].evaluations.map((evaluation) => evaluation.evaluator_name)).toContain(
      "distill.target.v2_promotion_gate",
    );
    expect(packet.experiments[2].runs[0].metadata).toMatchObject({
      baseline_accuracy_score: 0.7,
      distill_accuracy_score: 0.82,
      accelerate_speed_ratio: 1.4,
    });
  });

  it("projects Distill beats onto the correct campaign cell", async () => {
    const captured: unknown[][] = [];
    const env = buildStubEnv({
      LEDGER: stubLedger({
        queries: [{ match: "FROM mlip_campaigns", first: null }],
        onPrepare: (sql, bindings) => {
          if (sql.includes("UPDATE mlip_campaign_cells")) captured.push([...bindings]);
        },
      }),
    });

    await recordMlipCampaignBeat(env, {
      campaign_id: "c",
      cell_id: "c:distill_accuracy:forces:chgnet",
      status: "completed",
      accuracy: { score: 0.88, unit: "row_native_physical_score" },
      speed: { score: 12.5, unit: "structures_per_second" },
      distill_runtime: { profile: "accuracy", intervention_count: 3, refusal_count: 0 },
    });

    expect(captured).toHaveLength(1);
    expect(captured[0][0]).toBe("c");
    expect(captured[0][1]).toBe("c:distill_accuracy:forces:chgnet");
    expect(captured[0][2]).toBe("completed");
    expect(captured[0][3]).toBe(0.88);
    expect(captured[0][5]).toBe(12.5);
    expect(String(captured[0][7])).toContain("distill_runtime");
  });

  it("renders cell fixture templates with stable identifiers", () => {
    const fixture = renderFixtureUrl("r2://mlip/{cell_id}.json", {
      campaign_id: "c",
      variant_id: "v",
      row_id: "r",
      mlip_id: "m",
      cell_id: "c:v:r:m",
    });

    expect(fixture).toBe("r2://mlip/c:v:r:m.json");
  });

  it("summarizes completed accuracy and speed by variant", () => {
    const cells: MlipCampaignCell[] = [
      {
        cell_id: "c:baseline:r:m1",
        campaign_id: "c",
        row_id: "r",
        mlip_id: "m1",
        variant_id: "baseline",
        fixture_url: null,
        status: "completed",
        job_id: null,
        accuracy_score: 0.7,
        accuracy_unit: "score",
        speed_score: 10,
        speed_unit: "rows_s",
        metrics_json: null,
        created_at: "now",
        updated_at: "now",
      },
      {
        cell_id: "c:baseline:r:m2",
        campaign_id: "c",
        row_id: "r",
        mlip_id: "m2",
        variant_id: "baseline",
        fixture_url: null,
        status: "queued",
        job_id: null,
        accuracy_score: null,
        accuracy_unit: null,
        speed_score: null,
        speed_unit: null,
        metrics_json: null,
        created_at: "now",
        updated_at: "now",
      },
      {
        cell_id: "c:distill_accuracy:r:m1",
        campaign_id: "c",
        row_id: "r",
        mlip_id: "m1",
        variant_id: "distill_accuracy",
        fixture_url: null,
        status: "completed",
        job_id: null,
        accuracy_score: 0.9,
        accuracy_unit: "score",
        speed_score: 11,
        speed_unit: "rows_s",
        metrics_json: null,
        created_at: "now",
        updated_at: "now",
      },
    ];

    const summary = summarizeMlipCampaign(cells);

    expect(summary.cells).toBe(3);
    expect(summary.completed).toBe(2);
    expect(summary.by_variant.baseline.mean_accuracy).toBe(0.7);
    expect(summary.by_variant.distill_accuracy.mean_speed).toBe(11);
  });

  it("groups cells into row by MLIP triplets", () => {
    const triplets = groupMlipCampaignTriplets([
      campaignCell("baseline", { status: "completed", accuracy: 0.6, speed: 10 }),
      campaignCell("distill_accuracy", { status: "completed", accuracy: 0.8, speed: 9 }),
      campaignCell("distill_accuracy_accelerate", { status: "completed", accuracy: 0.78, speed: 20 }),
    ]);

    expect(triplets).toHaveLength(1);
    expect(triplets[0].triplet_id).toBe("c:elastic_constants:mace-mp-0");
    expect(triplets[0].status).toBe("completed");
    expect(triplets[0].baseline?.variant_id).toBe("baseline");
  });

  it("scores a Phoenix demo triplet as a win when accuracy and speed improve", () => {
    const [triplet] = groupMlipCampaignTriplets([
      campaignCell("baseline", { status: "completed", accuracy: 0.7, speed: 10 }),
      campaignCell("distill_accuracy", { status: "completed", accuracy: 0.86, speed: 9 }),
      campaignCell("distill_accuracy_accelerate", { status: "completed", accuracy: 0.84, speed: 24 }),
    ]);

    const evaluation = evaluateMlipTriplet(triplet);

    expect(evaluation.verdict).toBe("win");
    expect(evaluation.score).toBe(1);
    expect(evaluation.distill_accuracy_delta).toBeCloseTo(0.16);
    expect(evaluation.accelerate_speed_ratio).toBeCloseTo(2.4);
  });

  it("scores an accuracy-only pair without requiring acceleration", () => {
    const [triplet] = groupMlipCampaignTriplets(
      [
        campaignCell("baseline", { status: "completed", accuracy: 0.7, speed: 10 }),
        campaignCell("distill_accuracy", { status: "completed", accuracy: 0.76, speed: 9 }),
      ],
      ["baseline", "distill_accuracy"],
    );

    const evaluation = evaluateMlipTriplet(triplet, ["baseline", "distill_accuracy"]);

    expect(triplet.status).toBe("completed");
    expect(evaluation.verdict).toBe("win");
    expect(evaluation.distill_accuracy_delta).toBeCloseTo(0.06);
    expect(evaluation.accelerate_speed_ratio).toBeNull();
  });

  it("selects the next queued triplets instead of completed work", () => {
    const cells = [
      campaignCell("baseline", { rowId: "elastic_constants", status: "completed", accuracy: 0.7, speed: 10 }),
      campaignCell("distill_accuracy", { rowId: "elastic_constants", status: "completed", accuracy: 0.8, speed: 9 }),
      campaignCell("distill_accuracy_accelerate", { rowId: "elastic_constants", status: "completed", accuracy: 0.79, speed: 20 }),
      campaignCell("baseline", { rowId: "forces", status: "queued" }),
      campaignCell("distill_accuracy", { rowId: "forces", status: "queued" }),
      campaignCell("distill_accuracy_accelerate", { rowId: "forces", status: "queued" }),
    ];

    const next = nextMlipCampaignTriplets(cells, 1);

    expect(next).toHaveLength(1);
    expect(next[0].row_id).toBe("forces");
    expect(next[0].status).toBe("queued");
  });

  it("returns latest triplet evaluations as first-class campaign state", async () => {
    const cells = [
      campaignCell("baseline", { status: "completed", accuracy: 0.7, speed: 10 }),
      campaignCell("distill_accuracy", { status: "completed", accuracy: 0.86, speed: 9 }),
      campaignCell("distill_accuracy_accelerate", { status: "completed", accuracy: 0.84, speed: 24 }),
    ];
    const env = buildStubEnv({
      LEDGER: stubLedger({
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
            all: cells as unknown as Record<string, unknown>[],
          },
          {
            match: "FROM mlip_campaign_triplet_evals",
            all: [
              {
                triplet_id: "c:elastic_constants:mace-mp-0",
                campaign_id: "c",
                row_id: "elastic_constants",
                mlip_id: "mace-mp-0",
                verdict: "win",
                score: 1,
                accuracy_delta_distill: 0.16,
                accuracy_delta_accelerate: 0.14,
                speed_ratio_accelerate: 2.4,
                trace_id: "trace-1",
                span_id: "span-1",
                explanation: "accuracy and speed improved",
                metrics_json: "{}",
                updated_at: "now",
              },
            ],
          },
        ],
      }),
    });

    const campaign = await getMlipCampaign(env, "c");

    expect(campaign?.evaluations).toHaveLength(1);
    expect(campaign?.triplets[0].evaluation?.verdict).toBe("win");
    expect(campaign?.triplets[0].evaluation?.trace_id).toBe("trace-1");
  });
});
