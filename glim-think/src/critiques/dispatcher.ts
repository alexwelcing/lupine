/**
 * Critique dispatcher: marks a critique as completed by writing the
 * response markdown to R2 and updating the D1 row in one helper.
 *
 * R2 key convention: `critiques/{id}.md`. Response is also persisted
 * inline in D1 so tiny clients can read it without a second R2 fetch.
 */

import type { Critique, Env } from "../types";

const R2_PREFIX = "critiques/";

export function artifactKeyFor(id: string): string {
  return `${R2_PREFIX}${id}.md`;
}

export interface RespondResult {
  critique: Critique | null;
  artifactKey: string;
}

/**
 * Write a response to R2 and mark the critique completed in D1.
 * Returns the updated row (or null if the id was not found).
 */
export async function respondToCritique(
  env: Env,
  id: string,
  response_md: string,
  agent_id?: string,
): Promise<RespondResult> {
  if (!id) throw new Error("respondToCritique: missing critique id");
  if (!response_md || !response_md.trim()) {
    throw new Error("respondToCritique: response_md is required");
  }

  const artifactKey = artifactKeyFor(id);
  const completedAt = new Date().toISOString();

  // 1. Write artifact to R2 first (so D1 always points at a real object).
  await env.ARTIFACTS.put(artifactKey, response_md, {
    httpMetadata: { contentType: "text/markdown" },
    customMetadata: {
      critique_id: id,
      agent_id: agent_id ?? "unknown",
      completed_at: completedAt,
    },
  });

  // 2. Update D1 row. Status -> completed, store inline copy + R2 pointer.
  const update = await env.LEDGER.prepare(
    `UPDATE critiques
       SET status = 'completed',
           response_md = ?1,
           response_artifact_key = ?2,
           completed_at = ?3
     WHERE id = ?4`,
  )
    .bind(response_md, artifactKey, completedAt, id)
    .run();

  // If no row was updated, the id didn't exist — caller should 404.
  const changes = (update.meta as { changes?: number } | undefined)?.changes ?? 0;
  if (changes === 0) {
    return { critique: null, artifactKey };
  }

  const row = await env.LEDGER.prepare(
    `SELECT id, source, question, target_hypothesis_id, status,
            response_md, response_artifact_key, created_at, completed_at
       FROM critiques
      WHERE id = ?1`,
  )
    .bind(id)
    .first<Critique>();

  return { critique: row ?? null, artifactKey };
}
