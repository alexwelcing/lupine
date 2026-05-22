import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCURACY_ROWS,
  DEFAULT_CAMPAIGN_VARIANTS,
  DEFAULT_MLIP_COLUMNS,
  buildMlipCampaignCells,
  evaluateMlipTriplet,
  getMlipCampaign,
  groupMlipCampaignTriplets,
  nextMlipCampaignTriplets,
  renderFixtureUrl,
  summarizeMlipCampaign,
  type MlipCampaignCell,
} from "../mlipCampaign";
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
