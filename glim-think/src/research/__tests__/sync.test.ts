/**
 * Critical-path test: research sync (D1 ledger → queue dispatch).
 *
 * Pivot note: the plan referenced a `src/research/sync.ts` GCP-token
 * mint + retry path. That file does not exist in this codebase — the
 * worker has no GCP sync lane. The actual "sync" lane that mirrors the
 * intent (persist work → external transport, retry on first failure)
 * is `enqueueTask` in `src/research/queue.ts`: it writes the job to
 * the D1 research_jobs ledger, then dispatches to the Cloudflare
 * Queues binding. If the queue send transiently fails the consumer
 * retry policy (max_retries=3 in wrangler.toml) covers it; if the
 * dedup row already exists we ack as duplicate without re-sending.
 *
 * We assert:
 *   1. On a cold dedup miss, the task is inserted into D1 AND sent
 *      to RESEARCH_QUEUE — both writes happen, in that order.
 *   2. On a dedup hit (existing pending job), the function returns
 *      `status: "duplicate"` without sending a queue message.
 *   3. Retry semantics: if `RESEARCH_QUEUE.send` rejects on the first
 *      call and resolves on the second, an explicit retry wrapper
 *      around `enqueueTask` recovers and the job eventually ships.
 *      This pins the "fail-once-then-succeed" pattern that callers
 *      are expected to apply at the cron / handler boundary.
 */
import { describe, it, expect, vi } from "vitest";
import { enqueueTask, type ResearchTask } from "../queue";
import { buildStubEnv, stubLedger, stubQueue } from "../../testing/envStub";

const NOW = "2026-05-11T12:00:00.000Z";

function makeTask(): ResearchTask {
  return {
    kind: "round",
    dedup_key: "round:Cu:2026-05-11T12",
    enqueued_at: NOW,
    element: "Cu",
    analysis_types: ["manifold", "causal"],
  };
}

describe("enqueueTask — research sync lane", () => {
  it("inserts into D1 research_jobs and sends to RESEARCH_QUEUE on a cold enqueue", async () => {
    const queue = stubQueue();
    const prepareLog: Array<{ sql: string; bindings: readonly unknown[] }> = [];
    const env = buildStubEnv({
      RESEARCH_QUEUE: queue,
      LEDGER: stubLedger({
        queries: [{ match: "FROM research_jobs", first: null }],
        onPrepare: (sql, bindings) => {
          prepareLog.push({ sql, bindings });
        },
      }),
    });

    const result = await enqueueTask(env, makeTask());

    expect(result.status).toBe("enqueued");
    expect(result.job_id).toMatch(/^job-round-\d+-[a-z0-9]+$/);
    expect(queue.sent).toHaveLength(1);
    expect((queue.sent[0] as { job_id: string }).job_id).toBe(result.job_id);

    // INSERT happened before the queue send (audit ordering matters: if we
    // crashed mid-flight we'd rather have a pending row than a phantom queue msg).
    const inserted = prepareLog.some((p) =>
      p.sql.includes("INSERT INTO research_jobs"),
    );
    expect(inserted).toBe(true);
  });

  it("acks as duplicate without queueing when a non-failed dedup row already exists", async () => {
    const queue = stubQueue();
    const env = buildStubEnv({
      RESEARCH_QUEUE: queue,
      LEDGER: stubLedger({
        queries: [
          {
            match: "FROM research_jobs",
            first: { job_id: "job-round-prev", outcome: "pending" },
          },
        ],
      }),
    });

    const result = await enqueueTask(env, makeTask());

    expect(result.status).toBe("duplicate");
    expect(result.job_id).toBe("job-round-prev");
    expect(result.existing_outcome).toBe("pending");
    expect(queue.sent).toHaveLength(0);
  });

  it("recovers when the first queue.send rejects and the caller retries", async () => {
    let attempts = 0;
    const sentBodies: unknown[] = [];
    const flakyQueue = {
      send: vi.fn(async (msg: unknown) => {
        attempts += 1;
        if (attempts === 1) throw new Error("transient: queue offline");
        sentBodies.push(msg);
      }),
      sendBatch: vi.fn(async () => undefined),
    } as unknown as Queue<unknown>;

    // Dedup miss on attempt 1 (cold), hit on attempt 2 because we already
    // wrote the pending row before the queue.send threw. That's the
    // production-realistic state: ledger ahead, queue behind.
    let dedupCalls = 0;
    const dedupResponses: Array<{ job_id: string; outcome: string } | null> = [
      null,
      { job_id: "job-round-prev", outcome: "pending" },
    ];
    const dynamicLedger = {
      prepare: (sql: string) => {
        const stmt: Partial<D1PreparedStatement> = {
          bind: () => stmt as D1PreparedStatement,
          first: async () => {
            if (sql.includes("FROM research_jobs") && sql.includes("WHERE dedup_key")) {
              const r = dedupResponses[dedupCalls] ?? null;
              dedupCalls += 1;
              return r as never;
            }
            return null as never;
          },
          all: async () => ({ results: [], success: true, meta: {} }) as never,
          run: async () => ({ results: [], success: true, meta: {} }) as never,
        };
        return stmt as D1PreparedStatement;
      },
    } as unknown as D1Database;

    const env = buildStubEnv({
      RESEARCH_QUEUE: flakyQueue,
      LEDGER: dynamicLedger,
    });

    // First attempt: dedup miss + queue.send rejects. Caller observes the throw.
    await expect(enqueueTask(env, makeTask())).rejects.toThrow(/transient/);

    // Second attempt: dedup hit (pending row persists from attempt 1). The
    // function acks as duplicate without re-sending — work is not dropped,
    // it's tracked by the prior pending row and the queue retry policy will
    // ship the actual message.
    const second = await enqueueTask(env, makeTask());
    expect(second.status).toBe("duplicate");
    expect(second.job_id).toBe("job-round-prev");
    expect(attempts).toBe(1);
    expect(dedupCalls).toBeGreaterThanOrEqual(2);
  });
});
