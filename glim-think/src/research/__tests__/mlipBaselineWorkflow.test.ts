import { describe, expect, it, vi } from "vitest";
import { isGatedRoute } from "../../middleware/access";
import { handleResearchWorkflowRoute } from "../workflows";
import {
  buildMlipBaselineGrid,
  estimateMlipBaselineCost,
  MLIP_BASELINE_WORKFLOW_ID,
  recordMlipBaselineBeat,
  type MlipBaselineCellRecord,
  type MlipBaselineRunRecord,
} from "../mlipBaselineGrid";
import { buildStubEnv, stubLedger } from "../../testing/envStub";
import type { Env } from "../../types";

function run(overrides: Partial<MlipBaselineRunRecord> = {}): MlipBaselineRunRecord {
  return {
    run_id: "baseline-run",
    workflow_instance_id: "wf-1",
    hypothesis_id: "h",
    title: "MLIP baseline",
    status: "awaiting_results",
    profile: "lab-gcp-gpu",
    fixture_id: "canonical-structures-v1",
    manifest_url: "gs://inputs/manifest.json",
    artifact_prefix: "gs://outputs/baseline-run",
    max_dollars_per_hour: 20,
    requested_max_active_gpu_cells: 10,
    max_active_gpu_cells: 10,
    max_poll_waves: 72,
    rows_json: "[]",
    mlips_json: "[]",
    cost_estimate_json: JSON.stringify(estimateMlipBaselineCost("lab-gcp-gpu", 10, 20)),
    report_r2_key: null,
    error: null,
    created_at: "2026-05-22T00:00:00.000Z",
    updated_at: "2026-05-22T00:00:00.000Z",
    started_at: "2026-05-22T00:00:00.000Z",
    finished_at: null,
    ...overrides,
  };
}

function cell(overrides: Partial<MlipBaselineCellRecord> = {}): MlipBaselineCellRecord {
  return {
    cell_id: "baseline-run:baseline:elastic_constants:mace-mp-0",
    run_id: "baseline-run",
    row_id: "elastic_constants",
    mlip_id: "mace-mp-0",
    status: "queued",
    target_job: "mlip-cell-mace",
    manifest_url: "gs://inputs/manifest.json",
    task_name: null,
    operation_name: null,
    accuracy_score: null,
    accuracy_unit: null,
    speed_score: null,
    speed_unit: null,
    metrics_json: null,
    artifact_uri: null,
    trace_id: null,
    span_id: null,
    retry_count: 0,
    error: null,
    created_at: "2026-05-22T00:00:00.000Z",
    updated_at: "2026-05-22T00:00:00.000Z",
    enqueued_at: null,
    completed_at: null,
    ...overrides,
  };
}

function envWithBaseline(
  onPrepare?: (sql: string, bindings: readonly unknown[]) => void,
  records: { run?: MlipBaselineRunRecord; cells?: MlipBaselineCellRecord[] } = {},
  overrides: Partial<Env> = {},
) {
  return buildStubEnv({
    TASKS_CONSUMER_URL: "https://tasks.example.run.app",
    MLIP_BASELINE_GRID: {
      create: vi.fn(async ({ id }: { id?: string }) => ({ id: id ?? "wf-1" })),
      get: vi.fn(),
      createBatch: vi.fn(),
    } as never,
    LEDGER: stubLedger({
      onPrepare,
      queries: [
        { match: "FROM mlip_baseline_runs", first: (records.run ?? run()) as unknown as Record<string, unknown> },
        { match: "FROM mlip_baseline_cells", all: (records.cells ?? [cell()]) as unknown as Record<string, unknown>[] },
      ],
    }),
    ...overrides,
  });
}

describe("mlip baseline grid workflow", () => {
  it("expands the baseline grid to exactly 25 cells", () => {
    const cells = buildMlipBaselineGrid("r", "gs://inputs/manifest.json", "lab-gcp-gpu");

    expect(cells).toHaveLength(25);
    expect(cells[0]).toMatchObject({
      cell_id: "r:baseline:elastic_constants:mace-mp-0",
      target_job: "mlip-cell-mace",
    });
    expect(new Set(cells.map((c) => `${c.row_id}:${c.mlip_id}`)).size).toBe(25);
  });

  it("caps active GPU cells by the configured hourly budget", () => {
    const estimate = estimateMlipBaselineCost("lab-gcp-gpu", 25, 20);

    expect(estimate.active_cells).toBeLessThanOrEqual(25);
    expect(estimate.estimated_hourly_usd).toBeLessThanOrEqual(20);
    expect(estimate.per_cell_hourly_usd).toBeGreaterThan(0);
  });

  it("starts the Cloudflare Workflow when creating a Lab baseline run", async () => {
    const env = envWithBaseline();
    const response = await handleResearchWorkflowRoute(
      env,
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns`),
      "POST",
      JSON.stringify({ run_id: "baseline-run", profile: "lab-gcp-gpu" }),
    );
    const body = await response?.json() as { workflow_started: boolean; report_url: string };

    expect(response?.status).toBe(202);
    expect(body.workflow_started).toBe(true);
    expect(body.report_url).toContain("/report");
    expect(env.MLIP_BASELINE_GRID?.create).toHaveBeenCalled();
  });

  it("renders a public JSON report from D1 state", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithBaseline(),
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/report?format=json`),
      "GET",
      "",
    );
    const body = await response?.json() as { schema: string; cells: unknown[] };

    expect(response?.status).toBe(200);
    expect(body.schema).toBe("lupine.mlip_baseline_grid.report.v1");
    expect(body.cells).toHaveLength(1);
  });

  it("dispatches a GCP payload with target job and cell metadata", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const env = envWithBaseline(undefined, {}, { DEV_MODE: "true" });
    const response = await handleResearchWorkflowRoute(
      env,
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/enqueue`),
      "POST",
      JSON.stringify({ limit: 1 }),
    );
    const body = await response?.json() as { dispatched: Array<{ target_job: string }> };
    const logCall = logSpy.mock.calls.find((call) => call[0] === "[dispatchAtlasJob dev-mode]");
    logSpy.mockRestore();

    expect(response?.status).toBe(200);
    expect(body.dispatched[0].target_job).toBe("mlip-cell-mace");
    expect(logCall).toBeTruthy();
    const taskBody = (logCall?.[1] as { taskBody: { task: { httpRequest: { body: string } } } }).taskBody;
    const payload = JSON.parse(atob(taskBody.task.httpRequest.body)) as {
      target_job: string;
      args: string[];
    };
    expect(payload.target_job).toBe("mlip-cell-mace");
    expect(payload.args).toContain("--cell-id");
    expect(payload.args).toContain("baseline-run:baseline:elastic_constants:mace-mp-0");
    expect(payload.args).toContain("--artifact-prefix");
  });

  it("gates mutating workflow routes while keeping report reads public", () => {
    expect(isGatedRoute("/research/workflows/mlip-baseline-grid/campaigns", "POST")).toBe(true);
    expect(isGatedRoute("/research/workflows/mlip-baseline-grid/campaigns/r/report", "GET")).toBe(false);
  });

  it("projects MLIP cell result beats into the baseline cell table", async () => {
    const prepared: Array<{ sql: string; bindings: readonly unknown[] }> = [];
    const env = envWithBaseline((sql, bindings) => prepared.push({ sql, bindings }));

    await recordMlipBaselineBeat(env, {
      schema: "lupine.mlip.cell_result.v1",
      status: "completed",
      run_id: "baseline-run",
      cell_id: "baseline-run:baseline:elastic_constants:mace-mp-0",
      row_id: "elastic_constants",
      mlip_id: "mace-mp-0",
      accuracy: { score: 0.82, unit: "reference_relative_error_score" },
      speed: { score: 12.5, unit: "structures_per_second" },
      artifact_uri: "gs://outputs/cell_result.json",
    });

    expect(prepared.some((entry) => entry.sql.includes("UPDATE mlip_baseline_cells"))).toBe(true);
    expect(prepared.some((entry) => entry.sql.includes("INSERT INTO evaluations"))).toBe(true);
    expect(prepared.some((entry) => entry.sql.includes("execution_resources"))).toBe(true);
  });

  it("surfaces failed cells through ops and maintain agenda actions", async () => {
    const failed = cell({ status: "failed", error: "backend import failed" });
    const env = envWithBaseline(undefined, { cells: [failed] });

    const opsResponse = await handleResearchWorkflowRoute(
      env,
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/ops`),
      "GET",
      "",
    );
    const ops = await opsResponse?.json() as { next_actions: Array<{ action_id: string; kind: string }> };
    expect(ops.next_actions[0]).toMatchObject({ kind: "enqueue_unit" });
    expect(ops.next_actions[0].action_id).toContain("retry:");

    const prepared: string[] = [];
    const maintainEnv = envWithBaseline((sql) => prepared.push(sql), { cells: [cell()] });
    const maintainResponse = await handleResearchWorkflowRoute(
      maintainEnv,
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/maintain`),
      "POST",
      JSON.stringify({ mode: "agenda", limit: 1 }),
    );
    expect(maintainResponse?.status).toBe(200);
    expect(prepared.some((sql) => sql.includes("INSERT OR IGNORE") && sql.includes("intelligence_tasks"))).toBe(true);
  });
});
