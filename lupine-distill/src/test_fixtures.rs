//! Synthetic benchmark data fixtures for deterministic hypothesis testing.
//!
//! Each fixture generates a controlled dataset with known statistical
//! properties so integration tests can verify hypothesis outputs without
//! depending on the real 7,484-record database.

use crate::db::query::ErrorVector;
use rusqlite::Connection;

/// Seed a database with multi-family benchmark data for fingerprint testing.
///
/// Creates 3 distinct pair_style families across 2 elements, each with well-
/// separated centroids in (C11, C12, C44) error space. The EAM family clusters
/// near (+5, +3, +2), MEAM near (−3, +1, +10), and Tersoff near (+20, −10, −5).
/// A correctly-implemented LOO classifier should achieve near-perfect accuracy.
pub fn seed_fingerprint_data(conn: &Connection) -> anyhow::Result<()> {
    let families = [
        // (pair_style, centroid offsets, n_potentials)
        ("eam/alloy", [5.0, 3.0, 2.0], 6),
        ("meam",      [-3.0, 1.0, 10.0], 5),
        ("tersoff",   [20.0, -10.0, -5.0], 4),
    ];

    let properties = ["C11", "C12", "C44"];
    let reference = [108.2, 61.3, 28.5]; // Al experimental values

    let mut record_idx = 0u32;
    for (ps, centroid, n) in &families {
        for pot_i in 0..*n {
            let pot_id = format!("{}_p{}", ps.replace('/', "_"), pot_i);
            let pot_label = format!("Fixture-{}-{}", ps, pot_i);
            for (j, prop) in properties.iter().enumerate() {
                // Small deterministic perturbation around centroid
                let noise = (pot_i as f64 - (*n as f64 / 2.0)) * 0.5;
                let err_pct = centroid[j] + noise;
                let predicted = reference[j] * (1.0 + err_pct / 100.0);

                conn.execute(
                    "INSERT INTO benchmarks
                     (record_id, potential_id, potential_label, pair_style,
                      element, property, reference_value, predicted_value, unit)
                     VALUES (?1, ?2, ?3, ?4, 'Al', ?5, ?6, ?7, 'GPa')",
                    rusqlite::params![
                        format!("fix_fp_{}", record_idx),
                        pot_id,
                        pot_label,
                        ps,
                        prop,
                        reference[j],
                        predicted,
                    ],
                )?;
                record_idx += 1;
            }
        }
    }

    Ok(())
}

/// Seed a database with data exhibiting known hyper-ribbon geometry.
///
/// Constructs error vectors where PC1 explains >95% of variance (PR ≈ 1.05),
/// producing a clear ribbon. Also includes a deliberately high-dimensional
/// "sphere" group for negative testing (PR ≈ D).
pub fn seed_manifold_data(conn: &Connection) -> anyhow::Result<()> {
    let properties = ["C11", "C12", "C44", "B"];
    let reference = [108.2, 61.3, 28.5, 76.9]; // Al

    // ── Ribbon group: variance dominated by one axis ──
    // Error vectors along direction [0.9, 0.3, 0.1, 0.05] with small noise
    let spine = [0.9, 0.3, 0.1, 0.05];
    for i in 0..12 {
        let scale = (i as f64 - 6.0) * 3.0; // range −18..+18
        let pot_id = format!("ribbon_p{}", i);
        let pot_label = format!("Ribbon-{}", i);

        for (j, prop) in properties.iter().enumerate() {
            let err_pct = spine[j] * scale + (j as f64 * 0.05); // tiny cross-dim noise
            let predicted = reference[j] * (1.0 + err_pct / 100.0);

            conn.execute(
                "INSERT INTO benchmarks
                 (record_id, potential_id, potential_label, pair_style,
                  element, property, reference_value, predicted_value, unit)
                 VALUES (?1, ?2, ?3, 'eam/alloy', 'Cu', ?4, ?5, ?6, 'GPa')",
                rusqlite::params![
                    format!("fix_ribbon_{}", i * 4 + j),
                    pot_id, pot_label, prop, reference[j], predicted,
                ],
            )?;
        }
    }

    // ── Sphere group: roughly equal variance in all directions ──
    // Each potential gets independent random-ish errors
    let sphere_data = [
        [5.0, -3.0, 8.0, -2.0],
        [-4.0, 6.0, -1.0, 7.0],
        [3.0, 3.0, -5.0, 4.0],
        [-2.0, -5.0, 6.0, -3.0],
        [6.0, 4.0, -4.0, 5.0],
        [-5.0, 7.0, 3.0, -6.0],
        [4.0, -6.0, 7.0, 2.0],
        [-3.0, 5.0, -6.0, 8.0],
    ];

    for (i, errs) in sphere_data.iter().enumerate() {
        let pot_id = format!("sphere_p{}", i);
        let pot_label = format!("Sphere-{}", i);

        for (j, prop) in properties.iter().enumerate() {
            let predicted = reference[j] * (1.0 + errs[j] / 100.0);

            conn.execute(
                "INSERT INTO benchmarks
                 (record_id, potential_id, potential_label, pair_style,
                  element, property, reference_value, predicted_value, unit)
                 VALUES (?1, ?2, ?3, 'morse', 'Fe', ?4, ?5, ?6, 'GPa')",
                rusqlite::params![
                    format!("fix_sphere_{}", i * 4 + j),
                    pot_id, pot_label, prop, reference[j], predicted,
                ],
            )?;
        }
    }

    Ok(())
}

/// Seed data for cross-element transfer universality testing.
///
/// Creates aligned PC1 vectors across 3 elements within the same pair_style.
/// The error structure is dominated by the same direction [0.8, 0.5, 0.3, 0.1]
/// for all elements in 'eam/alloy', ensuring high cosine similarity.
pub fn seed_transfer_data(conn: &Connection) -> anyhow::Result<()> {
    let properties = ["C11", "C12", "C44", "B"];
    let elements = [
        ("Al", [108.2, 61.3, 28.5, 76.9]),
        ("Cu", [168.4, 121.4, 75.4, 137.0]),
        ("Ni", [246.5, 147.3, 124.7, 180.4]),
    ];
    let spine = [0.8, 0.5, 0.3, 0.1];

    let mut idx = 0u32;
    for (el, refs) in &elements {
        for pot_i in 0..5 {
            let scale = (pot_i as f64 - 2.0) * 4.0;
            let pot_id = format!("transfer_{}_p{}", el, pot_i);
            let pot_label = format!("Transfer-{}-{}", el, pot_i);

            for (j, prop) in properties.iter().enumerate() {
                // Element-specific tiny perturbation to avoid perfect alignment
                let el_noise = match *el {
                    "Al" => 0.0,
                    "Cu" => 0.1 * (j as f64),
                    "Ni" => -0.05 * (j as f64),
                    _ => 0.0,
                };
                let err_pct = spine[j] * scale + el_noise;
                let predicted = refs[j] * (1.0 + err_pct / 100.0);

                conn.execute(
                    "INSERT INTO benchmarks
                     (record_id, potential_id, potential_label, pair_style,
                      element, property, reference_value, predicted_value, unit)
                     VALUES (?1, ?2, ?3, 'eam/alloy', ?4, ?5, ?6, ?7, 'GPa')",
                    rusqlite::params![
                        format!("fix_transfer_{}", idx),
                        pot_id, pot_label, el, prop, refs[j], predicted,
                    ],
                )?;
                idx += 1;
            }
        }
    }

    Ok(())
}

/// Seed complete multi-purpose fixture combining all datasets.
/// Useful for full integration tests that exercise every hypothesis.
pub fn seed_full(conn: &Connection) -> anyhow::Result<()> {
    seed_fingerprint_data(conn)?;
    seed_manifold_data(conn)?;
    seed_transfer_data(conn)?;
    Ok(())
}

/// Create `ErrorVector` instances directly (no database needed).
/// For unit tests of functions that take `&[ErrorVector]`.
pub fn make_error_vectors(
    pair_style: &str,
    element: &str,
    data: &[[f64; 3]],
) -> Vec<ErrorVector> {
    data.iter()
        .enumerate()
        .map(|(i, errs)| ErrorVector {
            potential_id: format!("synth_p{}", i),
            potential_label: format!("Synth-{}", i),
            pair_style: pair_style.to_string(),
            element: element.to_string(),
            errors: errs.to_vec(),
            properties: vec!["C11".into(), "C12".into(), "C44".into()],
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{query, schema};
    use crate::hypothesis::{fingerprint, manifold, transfer};
    use crate::null_model;

    // ─── Fixture round-trip tests ───────────────────────────

    #[test]
    fn fixture_fingerprint_data_roundtrips() {
        let conn = schema::open_memory().unwrap();
        seed_fingerprint_data(&conn).unwrap();

        let summary = query::summary(&conn).unwrap();
        assert_eq!(summary.unique_elements, 1); // All Al
        assert_eq!(summary.unique_pair_styles, 3); // eam/alloy, meam, tersoff
        assert_eq!(summary.unique_potentials, 15); // 6+5+4
        assert_eq!(summary.total_records, 45); // 15 * 3 properties
    }

    #[test]
    fn fixture_manifold_data_roundtrips() {
        let conn = schema::open_memory().unwrap();
        seed_manifold_data(&conn).unwrap();

        let summary = query::summary(&conn).unwrap();
        assert!(summary.total_records > 0);
        // Ribbon: 12 pots * 4 props = 48; Sphere: 8 pots * 4 props = 32 → 80
        assert_eq!(summary.total_records, 80);
    }

    #[test]
    fn fixture_transfer_data_roundtrips() {
        let conn = schema::open_memory().unwrap();
        seed_transfer_data(&conn).unwrap();

        let summary = query::summary(&conn).unwrap();
        assert_eq!(summary.unique_elements, 3);
        assert_eq!(summary.total_records, 60); // 3 elements * 5 pots * 4 props
    }

    #[test]
    fn make_error_vectors_produces_correct_shape() {
        let vecs = make_error_vectors("eam", "Al", &[
            [1.0, 2.0, 3.0],
            [4.0, 5.0, 6.0],
        ]);
        assert_eq!(vecs.len(), 2);
        assert_eq!(vecs[0].errors.len(), 3);
        assert_eq!(vecs[0].pair_style, "eam");
    }

    // ─── Integration tests: fingerprint hypothesis ──────────

    #[test]
    fn fingerprint_separates_distinct_families() {
        let conn = schema::open_memory().unwrap();
        seed_fingerprint_data(&conn).unwrap();

        let result = fingerprint::test_fingerprint(&conn, None).unwrap();

        // With well-separated centroids, LOO accuracy should be high
        assert!(result.n_potentials >= 15, "expected ≥15 potentials, got {}", result.n_potentials);
        assert_eq!(result.n_families, 3);
        assert!(result.loo_accuracy > result.chance_accuracy,
            "LOO accuracy ({:.3}) should beat chance ({:.3})",
            result.loo_accuracy, result.chance_accuracy);
        assert!(result.supported, "fingerprint should be supported with well-separated clusters");
    }

    #[test]
    fn fingerprint_null_model_is_significant() {
        let conn = schema::open_memory().unwrap();
        seed_fingerprint_data(&conn).unwrap();

        // With distinct families, the null model should confirm significance
        let null = null_model::fingerprint_null(&conn, None, 200).unwrap();
        assert!(null.observed > null.null_mean,
            "observed accuracy ({:.3}) should exceed null mean ({:.3})",
            null.observed, null.null_mean);
        // p-value should be low (well-separated families)
        assert!(null.p_value < 0.10,
            "p-value ({:.3}) should be < 0.10 for well-separated families",
            null.p_value);
    }

    // ─── Integration tests: manifold hypothesis ─────────────

    #[test]
    fn manifold_detects_ribbon_geometry() {
        let conn = schema::open_memory().unwrap();
        seed_manifold_data(&conn).unwrap();

        let result = manifold::test_manifold(&conn).unwrap();

        // Should find at least the Cu (ribbon) and Fe (sphere) groups
        assert!(result.n_groups_tested >= 2,
            "expected ≥2 groups, got {}", result.n_groups_tested);

        // The Cu/eam_alloy ribbon group should have low PR
        let ribbon_group = result.analyses.iter()
            .find(|a| a.element.as_deref() == Some("Cu"));
        assert!(ribbon_group.is_some(), "Cu group should exist");
        let rg = ribbon_group.unwrap();
        assert!(rg.is_ribbon, "Cu group should be classified as a ribbon");
        assert!(rg.participation_ratio < 1.5,
            "Cu ribbon PR ({:.3}) should be < 1.5", rg.participation_ratio);

        // The Fe/morse sphere group should have higher PR
        let sphere_group = result.analyses.iter()
            .find(|a| a.element.as_deref() == Some("Fe"));
        assert!(sphere_group.is_some(), "Fe group should exist");
        let sg = sphere_group.unwrap();
        // Sphere might still be classified as ribbon (PR < D) but should have
        // substantially higher PR than the true ribbon
        assert!(sg.participation_ratio > rg.participation_ratio,
            "Fe sphere PR ({:.3}) should exceed Cu ribbon PR ({:.3})",
            sg.participation_ratio, rg.participation_ratio);
    }

    // ─── Integration tests: transfer hypothesis ─────────────

    #[test]
    fn transfer_detects_aligned_pc1_across_elements() {
        let conn = schema::open_memory().unwrap();
        seed_transfer_data(&conn).unwrap();

        let result = transfer::test_transfer(&conn, None).unwrap();

        assert_eq!(result.n_elements, 3, "expected 3 elements in transfer test");
        assert!(!result.comparisons.is_empty(), "should have at least one comparison");

        // Aligned data should produce high cosine similarity
        assert!(result.mean_cosine_similarity > 0.7,
            "mean cosine similarity ({:.3}) should be > 0.7 for aligned data",
            result.mean_cosine_similarity);
        assert!(result.supported, "transfer universality should be supported for aligned data");
    }

    // ─── Integration tests: evaluate pipeline ───────────────

    #[test]
    fn evaluate_fingerprint_hypothesis_roundtrip() {
        let conn = schema::open_memory().unwrap();
        seed_fingerprint_data(&conn).unwrap();

        // Insert a hypothesis
        query::insert_hypothesis(
            &conn,
            "TEST-FP-001",
            "fingerprint",
            "Fingerprint Test",
            "Pair_style families have distinct error signatures in C11/C12/C44 space",
            "LOO classifier accuracy > chance",
            0.5,
        ).unwrap();

        // Verify it's in proposed status
        let hyps = query::list_hypotheses(&conn, 10).unwrap();
        assert_eq!(hyps.len(), 1);
        assert_eq!(hyps[0].status, "proposed");

        // Run evaluate (small iteration count for speed)
        let test = fingerprint::test_fingerprint(&conn, None).unwrap();
        let null = null_model::fingerprint_null(&conn, None, 100).unwrap();

        let verdict = if null.p_value < 0.05 && test.supported {
            "confirmed"
        } else if !test.supported {
            "refuted"
        } else {
            "needs_more_data"
        };

        query::update_hypothesis_status(
            &conn, "TEST-FP-001", verdict,
            if verdict == "confirmed" { 1 } else { 0 },
            if verdict == "refuted" { 1 } else { 0 },
            test.loo_accuracy,
        ).unwrap();

        // Check the hypothesis was updated
        let hyps_after = query::list_hypotheses(&conn, 10).unwrap();
        assert_eq!(hyps_after.len(), 1);
        assert_ne!(hyps_after[0].status, "proposed",
            "hypothesis should have been evaluated (not still 'proposed')");
    }

    #[test]
    fn evaluate_manifold_hypothesis_roundtrip() {
        let conn = schema::open_memory().unwrap();
        seed_manifold_data(&conn).unwrap();

        query::insert_hypothesis(
            &conn,
            "TEST-MF-001",
            "manifold",
            "Hyper-Ribbon Geometry",
            "Interatomic potential errors live on low-dimensional manifolds",
            "Participation ratio < dimension for element-grouped data",
            0.6,
        ).unwrap();

        let test = manifold::test_manifold(&conn).unwrap();
        let verdict = if test.hyper_ribbon_confirmed { "confirmed" } else { "refuted" };
        let confidence = if test.hyper_ribbon_confirmed { 0.95 } else { 0.1 };

        query::update_hypothesis_status(
            &conn, "TEST-MF-001", verdict, 1, 0, confidence,
        ).unwrap();

        let hyps = query::list_hypotheses(&conn, 10).unwrap();
        assert_eq!(hyps[0].hypothesis_id, "TEST-MF-001");
        // Ribbon data should confirm
        assert_eq!(hyps[0].status, "confirmed");
    }

    // ─── Bridge JSON roundtrip tests ────────────────────────

    #[test]
    fn bridge_request_serializes_deterministically() {
        use crate::bridge::BridgeRequest;
        let req = BridgeRequest::Theorize {
            element: "Al".to_string(),
            data_summary: serde_json::json!({"test": true}),
            existing_hypotheses: vec!["existing hyp".to_string()],
        };
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("\"Theorize\"") || json.contains("\"element\""),
            "serialized request should contain Theorize or element");
        // Verify it round-trips
        let _: serde_json::Value = serde_json::from_str(&json).unwrap();
    }

    // ─── Claim persistence tests ────────────────────────────

    #[test]
    fn claims_persist_and_list() {
        let conn = schema::open_memory().unwrap();
        seed_fingerprint_data(&conn).unwrap();

        // Run fingerprint test and persist claim
        let result = fingerprint::test_fingerprint(&conn, None).unwrap();
        let claim_id = "test_fp_claim_001";
        let data = serde_json::json!({
            "loo_accuracy": result.loo_accuracy,
            "n_potentials": result.n_potentials,
        });
        query::insert_claim(
            &conn, claim_id, "test-agent", "FingerprintTest",
            &data, "Test fingerprint claim", result.loo_accuracy, "proposed",
        ).unwrap();

        let claims = query::list_claims(&conn, 10).unwrap();
        assert_eq!(claims.len(), 1);
        assert_eq!(claims[0].claim_id, claim_id);
        assert_eq!(claims[0].status, "proposed");
        assert!(claims[0].confidence > 0.0);
    }

    // ─── Full pipeline: seed → test → null → claim → DB state ──

    #[test]
    fn full_research_cycle_integration() {
        let conn = schema::open_memory().unwrap();
        seed_full(&conn).unwrap();

        // 1. Summary should reflect all fixture data
        let summary = query::summary(&conn).unwrap();
        assert!(summary.total_records > 100, "full fixtures should produce >100 records");

        // 2. Run all three hypothesis tests
        let fp = fingerprint::test_fingerprint(&conn, Some("Al")).unwrap();
        assert!(fp.n_potentials > 0);

        let mf = manifold::test_manifold(&conn).unwrap();
        assert!(mf.n_groups_tested > 0);

        let tf = transfer::test_transfer(&conn, Some("eam/alloy")).unwrap();
        assert!(!tf.comparisons.is_empty());

        // 3. Insert hypotheses for each
        query::insert_hypothesis(
            &conn, "INT-FP", "fingerprint", "FP Test",
            "pair_style fingerprints exist", "LOO acc > chance", 0.5,
        ).unwrap();
        query::insert_hypothesis(
            &conn, "INT-MF", "manifold", "Manifold Test",
            "error manifolds are hyper-ribbons", "PR < D", 0.6,
        ).unwrap();
        query::insert_hypothesis(
            &conn, "INT-TF", "transfer", "Transfer Test",
            "PC1 conserved across elements", "cos(PC1_a, PC1_b) > 0.8", 0.5,
        ).unwrap();

        // 4. Verify hypotheses are all proposed
        let hyps = query::list_hypotheses(&conn, 10).unwrap();
        assert_eq!(hyps.len(), 3);
        for h in &hyps {
            assert_eq!(h.status, "proposed");
        }

        // 5. Evaluate each and update status
        for h in &hyps {
            let verdict = match h.class.as_str() {
                "fingerprint" => if fp.supported { "confirmed" } else { "refuted" },
                "manifold" => if mf.hyper_ribbon_confirmed { "confirmed" } else { "refuted" },
                "transfer" => if tf.supported { "confirmed" } else { "refuted" },
                _ => "needs_more_data",
            };
            query::update_hypothesis_status(
                &conn, &h.hypothesis_id, verdict, 1, 0, 0.9,
            ).unwrap();
        }

        // 6. Verify all hypotheses are no longer proposed
        let hyps_after = query::list_hypotheses(&conn, 10).unwrap();
        for h in &hyps_after {
            assert_ne!(h.status, "proposed",
                "hypothesis {} should be evaluated", h.hypothesis_id);
        }
    }

    // ─── Mock bridge: theorize → persist pipeline ───────────

    #[test]
    fn mock_bridge_theorize_roundtrip() {
        use crate::bridge;

        // Enable mock mode for this test
        std::env::set_var("DISTILL_BRIDGE_MOCK", "1");

        // Mock should report as available
        assert!(bridge::is_available(), "mock bridge should be available");

        // Create a Theorize request
        let request = bridge::BridgeRequest::Theorize {
            element: "Cu".to_string(),
            data_summary: serde_json::json!({
                "manifolds": [],
                "totals": { "records": 100, "potentials": 20 },
            }),
            existing_hypotheses: vec!["existing hyp".to_string()],
        };

        // Call should succeed with deterministic response
        let response = bridge::call(&request).unwrap();
        assert!(response.success, "mock call should succeed");
        assert_eq!(response.command, "theorize");

        // Response should contain the expected hypothesis fields
        let data = &response.data;
        assert_eq!(data["hypothesis_id"].as_str().unwrap(), "HYP-MOCK-CU");
        assert_eq!(data["type"].as_str().unwrap(), "manifold");
        assert!(data["title"].as_str().unwrap().contains("Cu"));
        assert!(data["description"].as_str().unwrap().contains("Cu"));
        assert!(data["testable_prediction"].as_str().unwrap().contains("Cu"));
        assert_eq!(data["confidence"].as_f64().unwrap(), 0.5);

        // Persist the mock hypothesis to an in-memory DB
        let conn = schema::open_memory().unwrap();
        let hyp_id = data["hypothesis_id"].as_str().unwrap();
        let class = data["type"].as_str().unwrap();
        let title = data["title"].as_str().unwrap();
        let desc = data["description"].as_str().unwrap();
        let prediction = data["testable_prediction"].as_str().unwrap();
        let confidence = data["confidence"].as_f64().unwrap();

        query::insert_hypothesis(&conn, hyp_id, class, title, desc, prediction, confidence).unwrap();

        let hyps = query::list_hypotheses(&conn, 10).unwrap();
        assert_eq!(hyps.len(), 1);
        assert_eq!(hyps[0].hypothesis_id, "HYP-MOCK-CU");
        assert_eq!(hyps[0].class, "manifold");
        assert_eq!(hyps[0].status, "proposed");

        // Disable mock mode to avoid contaminating other tests
        std::env::remove_var("DISTILL_BRIDGE_MOCK");
    }

    #[test]
    fn mock_bridge_mine_returns_empty_records() {
        use crate::bridge;

        std::env::set_var("DISTILL_BRIDGE_MOCK", "1");

        let request = bridge::BridgeRequest::Mine {
            title: "Test Paper Title".to_string(),
            abstract_text: "Abstract about aluminum potentials.".to_string(),
            doi: Some("10.1234/test".to_string()),
        };

        let response = bridge::call(&request).unwrap();
        assert!(response.success);
        assert_eq!(response.command, "mine");
        let records = response.data["records"].as_array().unwrap();
        assert!(records.is_empty(), "mock mine should return empty records");

        std::env::remove_var("DISTILL_BRIDGE_MOCK");
    }
}
