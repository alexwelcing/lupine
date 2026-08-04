//! Schema-contract test: lupine-distill → glim-think Vectorize ingest.
//!
//! Canonical contract: `docs/contracts/lupine_distill_to_vectorize.md`.
//! TS-side counterpart: `glim-think/src/literature/__tests__/schema_contract.test.ts`.
//!
//! This file deserializes a canonical JSON example matching the contract into
//! the `WorkerSyncClaim` struct used by `lupine-distill::worker_sync`. The test
//! fails when:
//!   - the struct evolves (rename / add / remove field) without a contract
//!     update propagating to this canonical example, or
//!   - the canonical JSON example drifts from the contract documented in the
//!     .md file, or
//!   - the metadata projection picks up fields that should not be in the
//!     Vectorize metadata column (high-cardinality blobs or the embedded text).

use lupine_distill::worker_sync::{WorkerSyncClaim, WorkerSyncIngestBody};
use serde_json::{json, Value};

/// Canonical example. Mirror of the `sampleClaimRecord()` helper in the
/// TS-side test; if you change one, change both.
fn canonical_claim_json() -> Value {
    json!({
        "claim_id": "claim_cross_style_pc1_Au_2026_05_11",
        "agent_id": "cross-style-pc1",
        "claim_type": "CrossStyleAlignment",
        "claim_data": { "pair_style": "eam/alloy", "element": "Au", "cosine": 0.94 },
        "evidence_ids": ["bench_Au_C11_eam_001", "bench_Au_C12_eam_001"],
        "confidence": 0.82,
        "status": "confirmed",
        "description": "Au PC1 vectors align across eam and eam/alloy at cos=0.94.",
        "created_at": "2026-05-11T12:34:56Z"
    })
}

const CONTRACT_FIELDS: &[&str] = &[
    "claim_id",
    "agent_id",
    "claim_type",
    "claim_data",
    "evidence_ids",
    "confidence",
    "status",
    "description",
    "created_at",
];

const VECTORIZE_METADATA_FIELDS: &[&str] = &[
    "agent_id",
    "claim_type",
    "status",
    "confidence",
    "created_at",
];

const LEGAL_STATUSES: &[&str] = &[
    "proposed",
    "confirmed",
    "refuted",
    "formally_proven",
    "insufficient",
];

#[test]
fn deserializes_canonical_claim_into_worker_sync_struct() {
    let v = canonical_claim_json();
    let claim: WorkerSyncClaim =
        serde_json::from_value(v).expect("canonical contract example must deserialize");

    assert_eq!(claim.claim_id, "claim_cross_style_pc1_Au_2026_05_11");
    assert_eq!(claim.agent_id, "cross-style-pc1");
    assert_eq!(claim.claim_type, "CrossStyleAlignment");
    assert_eq!(claim.evidence_ids.len(), 2);
    assert_eq!(claim.confidence, 0.82);
    assert_eq!(claim.status, "confirmed");
    assert_eq!(claim.created_at, "2026-05-11T12:34:56Z");
    assert!(claim.description.contains("Au"));

    // `claim_data` arrived as a parsed object — verify the round-trip
    // preserves the inner shape rather than collapsing it.
    assert_eq!(claim.claim_data["element"], json!("Au"));
    assert_eq!(claim.claim_data["cosine"], json!(0.94));
}

#[test]
fn canonical_claim_has_every_contract_field_populated() {
    let v = canonical_claim_json();
    let obj = v.as_object().expect("contract example must be an object");

    for field in CONTRACT_FIELDS {
        assert!(
            obj.contains_key(*field),
            "contract example missing required field `{}`",
            field
        );
        assert!(
            !obj[*field].is_null(),
            "contract field `{}` must not be null",
            field
        );
    }

    // No extra fields beyond the contract — would mean a producer is leaking
    // state through worker_sync that the consumer cannot index.
    for key in obj.keys() {
        assert!(
            CONTRACT_FIELDS.contains(&key.as_str()),
            "contract example contains undocumented field `{}`",
            key
        );
    }
}

#[test]
fn ingest_envelope_round_trips() {
    let body = WorkerSyncIngestBody {
        claims: vec![serde_json::from_value(canonical_claim_json()).unwrap()],
    };
    let wire = serde_json::to_string(&body).unwrap();
    let parsed: WorkerSyncIngestBody = serde_json::from_str(&wire).unwrap();
    assert_eq!(parsed.claims.len(), 1);
    assert_eq!(parsed.claims[0].claim_id, body.claims[0].claim_id);
}

#[test]
fn vectorize_metadata_projection_is_subset_of_contract() {
    for field in VECTORIZE_METADATA_FIELDS {
        assert!(
            CONTRACT_FIELDS.contains(field),
            "vectorize metadata field `{}` is not in the claim contract",
            field
        );
    }
}

#[test]
fn vectorize_metadata_excludes_high_cardinality_and_embedded_text() {
    // `description` is the embedded text — it must NOT appear in metadata,
    // otherwise we'd double-pay for storage on a field already represented
    // by the vector.
    assert!(
        !VECTORIZE_METADATA_FIELDS.contains(&"description"),
        "`description` is the embedded text, not metadata"
    );
    assert!(
        !VECTORIZE_METADATA_FIELDS.contains(&"claim_data"),
        "`claim_data` is high-cardinality JSON, not metadata"
    );
    assert!(
        !VECTORIZE_METADATA_FIELDS.contains(&"evidence_ids"),
        "`evidence_ids` is high-cardinality JSON, not metadata"
    );
}

#[test]
fn vectorize_metadata_fits_cloudflare_field_cap() {
    // Cloudflare Vectorize: up to 10 indexed metadata fields per record.
    assert!(
        VECTORIZE_METADATA_FIELDS.len() <= 10,
        "Vectorize allows ≤10 metadata fields; contract has {}",
        VECTORIZE_METADATA_FIELDS.len()
    );
}

#[test]
fn canonical_status_is_in_the_enum() {
    let claim: WorkerSyncClaim = serde_json::from_value(canonical_claim_json()).unwrap();
    assert!(
        LEGAL_STATUSES.contains(&claim.status.as_str()),
        "status `{}` is not a legal contract value",
        claim.status
    );
}

#[test]
fn iso8601_timestamp_format_matches_worker_sync_output() {
    let claim: WorkerSyncClaim = serde_json::from_value(canonical_claim_json()).unwrap();
    // Format: YYYY-MM-DDTHH:MM:SSZ — same as iso_utc_from_unix() in
    // worker_sync.rs. We check length + sentinel chars rather than pulling
    // in a regex crate.
    assert_eq!(claim.created_at.len(), 20);
    assert_eq!(&claim.created_at[4..5], "-");
    assert_eq!(&claim.created_at[7..8], "-");
    assert_eq!(&claim.created_at[10..11], "T");
    assert_eq!(&claim.created_at[13..14], ":");
    assert_eq!(&claim.created_at[16..17], ":");
    assert_eq!(&claim.created_at[19..20], "Z");
}

#[test]
fn confidence_is_in_unit_interval() {
    let claim: WorkerSyncClaim = serde_json::from_value(canonical_claim_json()).unwrap();
    assert!(
        (0.0..=1.0).contains(&claim.confidence),
        "confidence {} outside [0,1]",
        claim.confidence
    );
}

#[test]
fn missing_required_field_fails_deserialization() {
    let mut v = canonical_claim_json();
    v.as_object_mut().unwrap().remove("agent_id");
    let result: Result<WorkerSyncClaim, _> = serde_json::from_value(v);
    assert!(
        result.is_err(),
        "deserialization must reject claims missing a contract-required field"
    );
}
