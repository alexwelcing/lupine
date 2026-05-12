/**
 * Schema-contract test: lupine-distill claim ingest ↔ glim-think Vectorize metadata.
 *
 * The canonical contract lives at:
 *   docs/contracts/lupine_distill_to_vectorize.md
 *
 * This file is the TS-side enforcement. The Rust-side counterpart is:
 *   lupine-distill/tests/vectorize_schema.rs
 *
 * If you add/remove a field in `ClaimRecord` or `VectorizeClaimMetadata`,
 * update the contract doc and the matching constant arrays here. The
 * compile-time assertions below will fail if the types drift from the
 * contract; the runtime assertions will fail if the contract doc enumeration
 * drifts from the actual TS type surface.
 */

import { describe, expect, it } from "vitest";
import type {
  ClaimRecord,
  ClaimStatus,
  VectorizeClaimMetadata,
} from "../../types";

// ─── Contract enumeration (single source of truth, mirrors the .md table) ─────

/** Required fields on the over-the-wire claim payload from lupine-distill. */
const CONTRACT_CLAIM_FIELDS = [
  "claim_id",
  "agent_id",
  "claim_type",
  "claim_data",
  "evidence_ids",
  "confidence",
  "status",
  "description",
  "created_at",
] as const satisfies readonly (keyof ClaimRecord)[];

/** Fields projected into the Vectorize metadata column. */
const CONTRACT_VECTORIZE_METADATA_FIELDS = [
  "agent_id",
  "claim_type",
  "status",
  "confidence",
  "created_at",
] as const satisfies readonly (keyof VectorizeClaimMetadata)[];

/** Enumerated values of the `status` discriminator. */
const CONTRACT_CLAIM_STATUSES: readonly ClaimStatus[] = [
  "proposed",
  "confirmed",
  "refuted",
  "formally_proven",
  "insufficient",
];

// ─── Compile-time assertions (fail at `tsc --noEmit` if the type drifts) ─────

/**
 * Force ClaimRecord to have exactly the contract field set. If a field is
 * added to or removed from `ClaimRecord` without updating
 * CONTRACT_CLAIM_FIELDS, this assignment fails to type-check.
 */
type _AssertClaimFieldsExact = AssertEqualKeys<
  ClaimRecord,
  Record<(typeof CONTRACT_CLAIM_FIELDS)[number], unknown>
>;
const _claimAssert: _AssertClaimFieldsExact = true;

type _AssertVectorizeFieldsExact = AssertEqualKeys<
  VectorizeClaimMetadata,
  Record<(typeof CONTRACT_VECTORIZE_METADATA_FIELDS)[number], unknown>
>;
const _vectorizeAssert: _AssertVectorizeFieldsExact = true;

/** Vectorize metadata must be a strict subset of the ingest payload. */
type _AssertVectorizeIsSubsetOfClaim =
  keyof VectorizeClaimMetadata extends keyof ClaimRecord ? true : never;
const _subsetAssert: _AssertVectorizeIsSubsetOfClaim = true;

// Defeat unused-variable lints for the compile-time witnesses.
void _claimAssert;
void _vectorizeAssert;
void _subsetAssert;

// ─── Runtime assertions ──────────────────────────────────────────────────────

describe("lupine-distill → Vectorize schema contract", () => {
  it("ClaimRecord has the canonical wire fields, no more, no less", () => {
    const sample = sampleClaimRecord();
    const actualKeys = Object.keys(sample).sort();
    const expectedKeys = [...CONTRACT_CLAIM_FIELDS].sort();
    expect(actualKeys).toEqual(expectedKeys);
  });

  it("VectorizeClaimMetadata has the canonical metadata fields, no more, no less", () => {
    const sample = sampleVectorizeMetadata();
    const actualKeys = Object.keys(sample).sort();
    const expectedKeys = [...CONTRACT_VECTORIZE_METADATA_FIELDS].sort();
    expect(actualKeys).toEqual(expectedKeys);
  });

  it("Vectorize metadata fields are all derivable from ClaimRecord", () => {
    const claim = sampleClaimRecord();
    for (const field of CONTRACT_VECTORIZE_METADATA_FIELDS) {
      expect(claim).toHaveProperty(field);
    }
  });

  it("Vectorize metadata size stays within Cloudflare's 10-field cap", () => {
    expect(CONTRACT_VECTORIZE_METADATA_FIELDS.length).toBeLessThanOrEqual(10);
  });

  it("ClaimStatus enum lists every legal status from the contract", () => {
    expect([...CONTRACT_CLAIM_STATUSES].sort()).toEqual(
      ["confirmed", "formally_proven", "insufficient", "proposed", "refuted"].sort(),
    );
  });

  it("description is NOT in the metadata (it's the embedded text)", () => {
    expect(CONTRACT_VECTORIZE_METADATA_FIELDS as readonly string[]).not.toContain(
      "description",
    );
  });

  it("high-cardinality fields are NOT in the metadata", () => {
    expect(CONTRACT_VECTORIZE_METADATA_FIELDS as readonly string[]).not.toContain(
      "claim_data",
    );
    expect(CONTRACT_VECTORIZE_METADATA_FIELDS as readonly string[]).not.toContain(
      "evidence_ids",
    );
  });

  it("ISO-8601 timestamp format matches lupine-distill's worker_sync output", () => {
    const claim = sampleClaimRecord();
    expect(claim.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("confidence is constrained to [0, 1] by the contract", () => {
    const claim = sampleClaimRecord();
    expect(claim.confidence).toBeGreaterThanOrEqual(0);
    expect(claim.confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a canonical example matching the contract. Kept in sync with the
 * Rust-side canonical example in lupine-distill/tests/vectorize_schema.rs so
 * both sides assert against identical bytes.
 */
function sampleClaimRecord(): ClaimRecord {
  return {
    claim_id: "claim_cross_style_pc1_Au_2026_05_11",
    agent_id: "cross-style-pc1",
    claim_type: "CrossStyleAlignment",
    claim_data: JSON.stringify({ pair_style: "eam/alloy", element: "Au", cosine: 0.94 }),
    evidence_ids: JSON.stringify(["bench_Au_C11_eam_001", "bench_Au_C12_eam_001"]),
    confidence: 0.82,
    status: "confirmed",
    description: "Au PC1 vectors align across eam and eam/alloy at cos=0.94.",
    created_at: "2026-05-11T12:34:56Z",
  };
}

function sampleVectorizeMetadata(): VectorizeClaimMetadata {
  const c = sampleClaimRecord();
  return {
    agent_id: c.agent_id,
    claim_type: c.claim_type,
    status: c.status,
    confidence: c.confidence,
    created_at: c.created_at,
  };
}

/**
 * Type-level helper: yields `true` when `A` and `B` have exactly the same set
 * of property keys, `never` otherwise. Used to pin the TS surface against the
 * contract enumeration above.
 */
type AssertEqualKeys<A, B> =
  [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] extends [never, never]
    ? true
    : never;
