# Contract: `lupine-distill` → `glim-think` Vectorize ingest

**Status:** Canonical. Both producer (`lupine-distill`, Rust) and consumer
(`glim-think`, TypeScript on Cloudflare Workers) assert against this document via
schema-contract tests. Bumping the contract requires updating:

- `docs/contracts/lupine_distill_to_vectorize.md` (this file)
- `glim-think/src/literature/__tests__/schema_contract.test.ts`
- `lupine-distill/tests/vectorize_schema.rs`
- `glim-think/src/types.ts` (`VectorizeClaimMetadata`, `ClaimRecord`)
- `lupine-distill/src/worker_sync.rs` (`WorkerSyncClaim`)

The contract is the **shape of a single adjudicated discovery claim** as it
travels from `lupine-distill`'s local SQLite `claims` table, over HTTP through
`POST /claims/ingest`, into `glim-think`'s D1 ledger, and finally into the
Vectorize index metadata column when claim embeddings are computed.

Traces to: `docs/handoff/02_cloudflare_edge_strategy.md` — "Vectorize index
schemas must be tightly coupled with the output schemas of `lupine-distill`".

## Fields

The fields below are the **stable on-the-wire payload**. Field order is not
significant; field names and types are. Required fields must be present and
non-null on every ingested claim. Optional fields may be omitted.

| Field          | Type                                                                              | Required | Semantic meaning                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim_id`     | `string`                                                                          | yes      | Stable globally-unique identifier. Doubles as the Vectorize record `id`. Used for idempotent upsert on the worker side.                           |
| `agent_id`     | `string`                                                                          | yes      | Producer agent (e.g. `cross-style-pc1`, `rank-correlation`, `theorize-cycle`). Vectorize metadata filter dimension.                               |
| `claim_type`   | `string`                                                                          | yes      | Discriminator string for the claim kind (`CrossStyleAlignment`, `DimensionalityRanking`, `ManifoldEvolution`, `HyperRibbonConfirmed`, …). Vectorize metadata filter dimension. |
| `claim_data`   | `string` (JSON-encoded object) on the wire; `object` accepted as syntactic sugar  | yes      | Typed payload for the claim. The worker stores this verbatim as a string. Not used as Vectorize filter (too high-cardinality); kept for retrieval round-trips. |
| `evidence_ids` | `string` (JSON-encoded array) on the wire; `string[]` accepted as syntactic sugar | yes      | List of supporting `BenchmarkRecord.record_id` values. The worker stores this verbatim as a string.                                               |
| `confidence`   | `number` in `[0.0, 1.0]`                                                          | yes      | Agent's self-assessed confidence. Used for Vectorize metadata ranking / tie-breaking.                                                             |
| `status`       | `string` ∈ `{proposed, confirmed, refuted, formally_proven, insufficient}`        | yes      | Adjudication state. Vectorize metadata filter dimension.                                                                                          |
| `description`  | `string`                                                                          | yes      | Human-readable summary. **This is the canonical text that gets embedded** into the Vectorize vector.                                              |
| `created_at`   | `string` (ISO-8601 UTC, `YYYY-MM-DDTHH:MM:SSZ`)                                   | yes      | Producer-side wall-clock timestamp. Vectorize metadata sort dimension.                                                                            |

### Notes on `claim_data` and `evidence_ids`

`lupine-distill`'s local SQLite stores both as `TEXT`. Over the wire the worker
accepts either form:

- raw JSON-encoded `string` (the canonical wire form, what
  `lupine-distill::worker_sync` historically sent for `evidence_ids`)
- parsed `object` / `string[]` (what `worker_sync` currently sends for
  `claim_data` after `serde_json::from_str`)

The consumer normalizes to the string form via `JSON.stringify` before insert.
This contract test asserts both shapes are accepted.

## Mapping to Vectorize record

When the embedding pipeline (Phase B, not yet wired) runs:

```ts
const vec = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: claim.description });
await env.CLAIM_INDEX.upsert([{
  id: claim.claim_id,
  values: vec.data[0],
  metadata: {
    agent_id:   claim.agent_id,
    claim_type: claim.claim_type,
    status:     claim.status,
    confidence: claim.confidence,
    created_at: claim.created_at,
  } satisfies VectorizeClaimMetadata,
}]);
```

The TS interface `VectorizeClaimMetadata` (in `glim-think/src/types.ts`) is the
projection of the contract that lives in the Vectorize metadata column.
`claim_data`, `evidence_ids`, and `description` are **not** in the metadata —
`description` is the embedded text; `claim_data` and `evidence_ids` are joined
back from D1 on read.

Vectorize metadata field cardinality (Cloudflare docs, 2024-Q4): up to 10
indexed metadata fields per record. We use 5; remaining 5 are reserved for
future extensions (e.g. `pair_style`, `element`).

## Versioning

Breaking changes (rename, type change, required→absent) require:

1. A new migration in `glim-think/migrations/` to extend the D1 schema.
2. A new Vectorize index (Cloudflare Vectorize indexes are immutable on the
   metadata-field-set; a rename requires a fresh index).
3. A coordinated bump of `lupine-distill`'s `worker_sync` payload.

Non-breaking changes (new optional field, new enum variant for `claim_type` /
`status`) require only updating this document and re-running the contract
tests.
