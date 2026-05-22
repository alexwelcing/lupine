import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types";
import {
  completeSmokeMlipBaselineRun,
  dispatchQueuedMlipBaselineCells,
  finalizeMlipBaselineRun,
  getMlipBaselineRun,
  markMlipBaselineRunStatus,
  preflightMlipBaselineRun,
  type MlipBaselineGridWorkflowParams,
} from "./mlipBaselineGrid";

export class MlipBaselineGridWorkflow extends WorkflowEntrypoint<Env, MlipBaselineGridWorkflowParams> {
  async run(
    event: Readonly<WorkflowEvent<MlipBaselineGridWorkflowParams>>,
    step: WorkflowStep,
  ): Promise<unknown> {
    const runId = event.payload.run_id;
    const preflight = await step.do(
      `preflight ${runId}`,
      { retries: { limit: 1, delay: "5 seconds" }, timeout: "30 seconds" },
      async () => preflightMlipBaselineRun(this.env, runId),
    );

    if (preflight.profile === "smoke") {
      await step.do(
        `complete smoke ${runId}`,
        { retries: { limit: 1, delay: "5 seconds" }, timeout: "30 seconds" },
        async () => completeSmokeMlipBaselineRun(this.env, runId),
      );
      return step.do(`finalize smoke ${runId}`, async () => finalizeMlipBaselineRun(this.env, runId));
    }

    await step.do(`mark running ${runId}`, async () => {
      await markMlipBaselineRunStatus(this.env, runId, "running");
      return { ok: true };
    });

    const initialState = await getMlipBaselineRun(this.env, runId);
    const maxWaves = Math.max(1, Math.trunc(initialState?.run.max_poll_waves ?? 72));
    let lastSummary: unknown = null;

    for (let wave = 0; wave < maxWaves; wave += 1) {
      const dispatch = await step.do(
        `dispatch wave ${wave + 1} ${runId}`,
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" }, timeout: "60 seconds" },
        async () => dispatchQueuedMlipBaselineCells(this.env, runId),
      );

      const state = await step.do(`inspect wave ${wave + 1} ${runId}`, async () => {
        const current = await getMlipBaselineRun(this.env, runId);
        if (!current) throw new Error(`MLIP baseline run '${runId}' not found`);
        return current.summary;
      });
      lastSummary = { dispatch, state };
      if (state.cells_completed + state.cells_failed >= state.cells_total) break;
      await step.sleep(`await result beats ${wave + 1} ${runId}`, "5 minutes");
    }

    const finalState = await step.do(`finalize ${runId}`, async () => finalizeMlipBaselineRun(this.env, runId));
    return { run_id: runId, preflight, last_summary: lastSummary, final_state: finalState };
  }
}
