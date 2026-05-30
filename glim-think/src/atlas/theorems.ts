/**
 * ATLAS-Lean theorem inventory: shared-ledger access + bounded reference types.
 *
 * Per ATLAS_Lean_Integration_Review §8.4, each facet (specialist agent) depends
 * on a bounded set of formally-verified theorems from the ATLAS-Lean layer. The
 * full proofs live in the Lean project; glim-think only ever holds REFERENCES
 * (theorem name + module + revision + status) so Durable Object state stays
 * bounded — never proof bodies.
 *
 * The inventory lives in the shared D1 ledger (`env.LEDGER`) so the whole fleet
 * can query by facet. See migrations/0010_atlas_theorems.sql.
 */

import type { Env } from "../types";

/** Verification lifecycle of a theorem reference within a facet. */
export type AtlasTheoremStatus = "imported" | "verified" | "extended" | "failed";

/**
 * A single theorem reference as stored in the shared `atlas_theorems` table.
 * This is a reference only — the proof itself is never carried here.
 */
export interface AtlasTheoremRef {
  readonly id: number;
  readonly facet: string;
  readonly theorem_name: string;
  readonly module: string;
  readonly revision: string;
  readonly status: AtlasTheoremStatus;
  readonly used_in_hypotheses: number;
  readonly created_at: string;
}

/**
 * Compact reference carried in facet-to-facet RPC payloads and DO-local state.
 * Drops the surrogate id / counters so the payload stays small (§8.4: bounded).
 */
export interface FormalBasis {
  /** Theorem name as it appears in the Lean source (e.g. `Atlas.Manifold.prCongr`). */
  readonly theorem: string;
  /** Lean module path the theorem is defined in (e.g. `Atlas/Manifold/Core.lean`). */
  readonly module: string;
  /** ATLAS revision the reference is pinned to (git sha or tag). */
  readonly revision: string;
  /** Verification status of the reference at the time it was attached. */
  readonly status: AtlasTheoremStatus;
  /**
   * Optional natural-language helper describing how the theorem grounds the
   * payload (e.g. "PR is invariant under basis change → manifold dims comparable").
   */
  readonly helper?: string;
}

/** A bounded, JSON-serializable inventory summary for one facet's theorems. */
export interface TheoremInventory {
  readonly facet: string;
  readonly total: number;
  readonly by_status: Readonly<Record<AtlasTheoremStatus, number>>;
  /** References only — capped by the caller to keep the document small. */
  readonly theorems: ReadonlyArray<FormalBasis>;
}

const EMPTY_BY_STATUS: Record<AtlasTheoremStatus, number> = {
  imported: 0,
  verified: 0,
  extended: 0,
  failed: 0,
};

/**
 * Load every theorem reference for a facet from the shared ledger, newest first.
 *
 * Returns an empty array (never throws) when the table is absent or the query
 * fails, so an agent without ATLAS provisioning still boots cleanly.
 */
export async function loadFacetTheorems(env: Env, facet: string): Promise<AtlasTheoremRef[]> {
  try {
    const { results } = await env.LEDGER.prepare(
      `SELECT id, facet, theorem_name, module, revision, status, used_in_hypotheses, created_at
         FROM atlas_theorems
        WHERE facet = ?
        ORDER BY created_at DESC`,
    )
      .bind(facet)
      .all<AtlasTheoremRef>();
    return results ?? [];
  } catch {
    return [];
  }
}

/** Project a stored theorem reference into the compact RPC/state shape. */
export function toFormalBasis(ref: AtlasTheoremRef, helper?: string): FormalBasis {
  return {
    theorem: ref.theorem_name,
    module: ref.module,
    revision: ref.revision,
    status: ref.status,
    ...(helper ? { helper } : {}),
  };
}

/**
 * Summarize a facet's theorem references into a bounded inventory document.
 *
 * Pure + immutable: builds a fresh summary from the input rows. `maxRefs` caps
 * the embedded reference list so the JSON stored in `atlas_facet_state` and the
 * telemetry summary stays small regardless of how many theorems a facet imports.
 */
export function summarizeInventory(
  facet: string,
  refs: ReadonlyArray<AtlasTheoremRef>,
  maxRefs = 64,
): TheoremInventory {
  const by_status: Record<AtlasTheoremStatus, number> = { ...EMPTY_BY_STATUS };
  for (const r of refs) {
    if (r.status in by_status) by_status[r.status] += 1;
  }
  return {
    facet,
    total: refs.length,
    by_status,
    theorems: refs.slice(0, maxRefs).map((r) => toFormalBasis(r)),
  };
}

/** Per-facet ATLAS reference state row (§8.4). */
export interface AtlasFacetState {
  readonly facet: string;
  readonly atlas_revision: string | null;
  readonly mathlib_revision: string | null;
  /** Parsed `theorem_inventory` JSON, when present and well-formed. */
  readonly theorem_inventory: TheoremInventory | null;
  readonly updated_at: string;
}

/**
 * Load the per-facet ATLAS reference state, if any. Returns null (never throws)
 * when the table/row is absent or the inventory JSON is malformed.
 */
export async function loadFacetState(env: Env, facet: string): Promise<AtlasFacetState | null> {
  try {
    const row = await env.LEDGER.prepare(
      `SELECT facet, atlas_revision, mathlib_revision, theorem_inventory, updated_at
         FROM atlas_facet_state WHERE facet = ?`,
    )
      .bind(facet)
      .first<{
        facet: string;
        atlas_revision: string | null;
        mathlib_revision: string | null;
        theorem_inventory: string | null;
        updated_at: string;
      }>();
    if (!row) return null;
    let inventory: TheoremInventory | null = null;
    if (row.theorem_inventory) {
      try {
        inventory = JSON.parse(row.theorem_inventory) as TheoremInventory;
      } catch {
        inventory = null;
      }
    }
    return {
      facet: row.facet,
      atlas_revision: row.atlas_revision,
      mathlib_revision: row.mathlib_revision,
      theorem_inventory: inventory,
      updated_at: row.updated_at,
    };
  } catch {
    return null;
  }
}
