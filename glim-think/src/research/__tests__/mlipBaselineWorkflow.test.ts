import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAccess, isGatedRoute } from "../../middleware/access";
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

afterEach(() => {
  vi.unstubAllGlobals();
});

function run(overrides: Partial<MlipBaselineRunRecord> = {}): MlipBaselineRunRecord {
  return {
    run_id: "baseline-run",
    workflow_instance_id: "wf-1",
    hypothesis_id: "h",
    title: "MLIP baseline",
    status: "awaiting_results",
    profile: "lab-gcp-gpu",
    fixture_id: "canonical-structures-v2",
    manifest_url: "gs://inputs/canonical-structures-v2/manifest.json",
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
    manifest_url: "gs://inputs/canonical-structures-v2/manifest.json",
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

  it("marks V2 row-native cells as baseline release-ready", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithBaseline(undefined, {
        run: run({ status: "completed", finished_at: "2026-05-22T00:01:00.000Z" }),
        cells: [
          cell({
            cell_id: "baseline-run:baseline:forces:chgnet",
            row_id: "forces",
            mlip_id: "chgnet",
            status: "completed",
            accuracy_score: 0.91,
            accuracy_unit: "row_native_physical_score",
            speed_score: 4.2,
            speed_unit: "structures_per_second",
            artifact_uri: "gs://outputs/cell_result.json",
            metrics_json: JSON.stringify({
              profile: "lab-gcp-gpu",
              fixture_id: "canonical-structures-v2",
              manifest_url: "gs://inputs/canonical-structures-v2/manifest.json",
              n_structures: 5,
              fixture_contract: {
                schema: "lupine.mlip.fixture_manifest.v2",
                release_ready: true,
                manifest_hash: "sha256:test",
              },
              row_metrics: { primary_metric: "force_rmse_ev_per_angstrom" },
            }),
          }),
        ],
      }),
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/report?format=json`),
      "GET",
      "",
    );
    const body = await response?.json() as {
      release_gate: { ready: boolean };
      cells: Array<{ readiness: { score: number; label: string } }>;
    };

    expect(response?.status).toBe(200);
    expect(body.release_gate.ready).toBe(true);
    expect(body.cells[0].readiness).toMatchObject({ score: 1, label: "v2_ready" });
  });

  it("renders a Phoenix experiment packet for dataset and evaluator setup", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithBaseline(undefined, {
        cells: [
          cell({
            status: "completed",
            accuracy_score: 0.82,
            accuracy_unit: "reference_relative_error_score",
            speed_score: 12.5,
            speed_unit: "structures_per_second",
            artifact_uri: "gs://outputs/cell_result.json",
            trace_id: "trace-1",
            span_id: "span-1",
            metrics_json: JSON.stringify({
              n_structures: 1,
              speed: { duration_ms: 80 },
              versions: { torch: "2.4.0+cu121", cuda_available: true, cuda_device: "NVIDIA L4" },
            }),
          }),
        ],
      }),
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/report?format=phoenix`),
      "GET",
      "",
    );
    const body = await response?.json() as {
      schema: string;
      phoenix: { project: { name: string }; dataset: { name: string }; evaluator_specs: Array<{ name: string }> };
      examples: Array<{ example_id: string; metadata: { example_granularity?: string } }>;
      experiments: Array<{ experiment_name: string; runs: Array<{ evaluations: Array<{ evaluator_name: string }> }> }>;
      release_gate: { ready_for_research_release: boolean; blockers: string[] };
    };

    expect(response?.status).toBe(200);
    expect(body.schema).toBe("lupine.mlip.phoenix_experiment_packet.v1");
    expect(body.phoenix.project.name).toBe("glim-think");
    expect(body.phoenix.dataset.name).toBe("mlip-canonical-v2-heldout");
    expect(body.phoenix.evaluator_specs.some((spec) => spec.name === "mlip.gate.accelerate_accuracy_speed_win")).toBe(true);
    expect(body.examples).toHaveLength(25);
    expect(body.examples[0].example_id).toContain("canonical-structures-v2:");
    expect(body.examples[0].metadata.example_granularity).toBe("row_mlip_cell");
    expect(body.experiments[0].experiment_name).toBe("baseline/baseline-run");
    expect(body.experiments[0].runs[0].evaluations.some((evaluation) =>
      evaluation.evaluator_name === "mlip.contract.v2_fixture_readiness"
    )).toBe(true);
    expect(body.release_gate.ready_for_research_release).toBe(false);
    expect(body.release_gate.blockers[0]).toContain("missing V2 fixture");
  });

  it("syncs Phoenix dataset examples, experiment runs, and evaluator rows in the configured project", async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    let uploadBody: Record<string, unknown> | null = null;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const rawBody = typeof init?.body === "string" ? JSON.parse(init.body) as unknown : init?.body;
      requests.push({ url, method, body: rawBody });
      if (url.includes("/v1/datasets/upload")) {
        uploadBody = rawBody as Record<string, unknown>;
        return Response.json({ data: { dataset_id: "dataset-1", version_id: "version-1" } });
      }
      if (url.includes("/v1/datasets/dataset-1/examples")) {
        const exampleIds = (uploadBody?.metadata as Array<{ example_id: string }> | undefined)
          ?.map((metadata) => metadata.example_id) ?? [];
        return Response.json({
          data: exampleIds.map((exampleId) => ({
            id: exampleId,
            input: {},
            output: {},
            metadata: { example_id: exampleId },
          })),
          next_cursor: null,
        });
      }
      if (url.includes("/v1/datasets/dataset-1/experiments") && method === "GET") {
        return Response.json({ data: [] });
      }
      if (url.includes("/v1/datasets/dataset-1/experiments") && method === "POST") {
        return Response.json({
          data: {
            id: "experiment-1",
            dataset_id: "dataset-1",
            dataset_version_id: "version-1",
            name: "baseline/baseline-run",
            project_name: "glim-think",
          },
        });
      }
      if (url.includes("/v1/experiments/experiment-1/runs")) {
        return Response.json({ data: { id: `run-${requests.length}` } });
      }
      if (url.includes("/v1/experiment_evaluations")) {
        return Response.json({ data: { id: `eval-${requests.length}` } });
      }
      return Response.json({ data: [] });
    }));

    const response = await handleResearchWorkflowRoute(
      envWithBaseline(undefined, {
        cells: [
          cell({
            status: "completed",
            accuracy_score: 0.82,
            accuracy_unit: "row_native_physical_score",
            speed_score: 12.5,
            speed_unit: "structures_per_second",
            artifact_uri: "gs://outputs/cell_result.json",
            trace_id: "trace-1",
            span_id: "span-1",
            completed_at: "2026-05-22T00:01:00.000Z",
            metrics_json: JSON.stringify({
              profile: "lab-gcp-gpu",
              fixture_id: "canonical-structures-v2",
              manifest_url: "gs://inputs/canonical-structures-v2/manifest.json",
              n_structures: 5,
              fixture_contract: {
                schema: "lupine.mlip.fixture_manifest.v2",
                release_ready: true,
                manifest_hash: "sha256:test",
              },
            }),
          }),
        ],
      }, {
        PHOENIX_COLLECTOR_ENDPOINT: "https://app.phoenix.arize.com/s/alexwelcing/v1/traces",
        PHOENIX_API_KEY: "test-key",
        PHOENIX_PROJECT_NAME: "glim-think",
      }),
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/phoenix-sync`),
      "POST",
      JSON.stringify({ reuse_experiments: true }),
    );
    const body = await response?.json() as {
      project: { name: string; verified: boolean };
      dataset: { examples_submitted: number; examples_resolved: number };
      experiments: Array<{ evaluations_written: number }>;
    };

    expect(response?.status).toBe(200);
    expect(body.project).toMatchObject({ name: "glim-think", verified: true });
    expect(body.dataset.examples_submitted).toBe(25);
    expect(body.dataset.examples_resolved).toBe(25);
    expect(body.experiments[0].evaluations_written).toBeGreaterThan(0);
    expect(uploadBody).not.toBeNull();
    const uploaded = uploadBody as unknown as Record<string, unknown>;
    expect((uploaded.metadata as Array<{ example_id?: string }>).map((metadata) => metadata.example_id))
      .toContain("canonical-structures-v2:elastic_constants:mace-mp-0");
    expect((uploaded.outputs as Array<{ metric_contract?: unknown }>)[0].metric_contract).toBeTruthy();
    const createExperimentBody = requests.find((entry) =>
      entry.url.includes("/v1/datasets/dataset-1/experiments") && entry.method === "POST"
    )?.body as { metadata?: Record<string, unknown> } | undefined;
    expect(createExperimentBody?.metadata?.phoenix_project_name).toBe("glim-think");
  });

  it("renders a public HTML baseline summary with verdict and evidence sections", async () => {
    const response = await handleResearchWorkflowRoute(
      envWithBaseline(undefined, {
        cells: [
          cell({
            cell_id: "baseline-run:baseline:elastic_constants:chgnet",
            mlip_id: "chgnet",
            status: "completed",
            target_job: "mlip-cell-chgnet",
            accuracy_score: 0.82,
            accuracy_unit: "reference_relative_error_score",
            speed_score: 12.5,
            speed_unit: "structures_per_second",
            artifact_uri: "gs://outputs/cell_result.json",
            task_name: "projects/shed-489901/locations/us-central1/queues/atlas-distill-jobs/tasks/1",
            trace_id: "trace-1",
            span_id: "span-1",
            metrics_json: JSON.stringify({
              versions: {
                python: "3.10.12",
                torch: "2.4.0+cu121",
                chgnet: "0.4.2",
                cuda_available: true,
                cuda_device: "NVIDIA L4",
              },
              n_structures: 1,
              speed: { duration_ms: 80 },
            }),
            completed_at: "2026-05-22T00:01:00.000Z",
          }),
        ],
      }),
      new URL(`https://worker.test/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/baseline-run/report`),
      "GET",
      "",
    );
    const html = await response?.text();

    expect(response?.status).toBe(200);
    expect(html).toContain("Baseline Readout");
    expect(html).toContain("What This Baseline Proves");
    expect(html).toContain("Evidence Package");
    expect(html).toContain("NVIDIA L4");
    expect(html).toContain("Cloud Task");
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
    expect(isGatedRoute("/research/workflows/mlip-baseline-grid/campaigns/r/phoenix-sync", "POST")).toBe(true);
    expect(isGatedRoute("/research/workflows/mlip-baseline-grid/campaigns/r/report", "GET")).toBe(false);
  });

  it("allows the route-scoped Phoenix sync token without opening other workflow writes", async () => {
    const syncRequest = new Request(
      "https://worker.test/research/workflows/mlip-baseline-grid/campaigns/r/phoenix-sync",
      { method: "POST", headers: { "X-Phoenix-Sync-Token": "sync-secret" } },
    );
    const deniedRequest = new Request(
      "https://worker.test/research/workflows/mlip-baseline-grid/campaigns/r/enqueue",
      { method: "POST", headers: { "X-Phoenix-Sync-Token": "sync-secret" } },
    );

    await expect(checkAccess(syncRequest, buildStubEnv({ PHOENIX_SYNC_TOKEN: "sync-secret" }), [])).resolves.toBeNull();
    const denial = await checkAccess(deniedRequest, buildStubEnv({ PHOENIX_SYNC_TOKEN: "sync-secret" }), []);
    expect(denial?.status).toBe(403);
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
