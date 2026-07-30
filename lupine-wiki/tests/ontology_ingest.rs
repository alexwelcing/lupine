use lupine_wiki::{EdgeKind, NodeKind, WikiDb, ingest_ontology};
use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;

fn ontology_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/lupine-ontology.json")
}

fn provenance_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/PROVENANCE.sha256")
}

fn content(node: &lupine_wiki::Node) -> Value {
    serde_json::from_str(node.content.as_deref().expect("node content")).unwrap()
}

#[test]
fn canonical_ontology_ingest_preserves_records_metadata_and_foreign_keys() {
    let mut db = WikiDb::open_in_memory().unwrap();

    let report = ingest_ontology(&mut db, ontology_path(), provenance_path()).unwrap();

    assert_eq!(
        report.source_sha256,
        "27ba28a37749a1f7ca6495f1217dedaa2574db50dbaecc85b80cd68eda0a6ee2"
    );
    let nodes = db.get_nodes(Some("lupine-research"), None, None).unwrap();
    let edges = db.get_edges(None, None, None).unwrap();
    assert_eq!(
        nodes
            .iter()
            .filter(|n| n.kind == NodeKind::ErrorType)
            .count(),
        7
    );
    assert_eq!(
        nodes
            .iter()
            .filter(|n| n.kind == NodeKind::MaterialClass)
            .count(),
        9
    );
    assert_eq!(
        nodes
            .iter()
            .filter(|n| n.kind == NodeKind::DiscoveryChain)
            .count(),
        11
    );
    assert_eq!(
        nodes
            .iter()
            .filter(|n| n.kind == NodeKind::AcceptanceTest)
            .count(),
        11
    );
    assert_eq!(
        nodes.iter().filter(|n| n.kind == NodeKind::Emblem).count(),
        9
    );
    assert_eq!(
        nodes
            .iter()
            .filter(|n| n.kind == NodeKind::TimeGate)
            .count(),
        12
    );

    for id in [
        "X1", "X2", "X3", "F1", "F2", "F3", "R1", "R7", "S1", "S7", "CT1", "CT5",
    ] {
        let stable_id = format!("lupine-research://claim/{id}");
        assert!(
            nodes.iter().any(|node| node.id == stable_id),
            "missing {stable_id}"
        );
    }

    let atlas = nodes
        .iter()
        .find(|node| node.id == "lupine-research://claim/ontology")
        .map(content)
        .expect("atlas root claim");
    assert_eq!(
        atlas["metadata"]["freshnessLayer"]["atlasDate"],
        "2026-07-30"
    );
    assert_eq!(atlas["metadata"]["asOf"], "2026-07-30");
    assert_eq!(
        atlas["metadata"]["epistemicMarkers"]
            .as_array()
            .unwrap()
            .len(),
        5
    );
    assert_eq!(
        atlas["metadata"]["readinessGrades"]
            .as_array()
            .unwrap()
            .len(),
        3
    );
    assert_eq!(
        atlas["metadata"]["confidenceGrades"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        atlas["record"]["superClasses"]
            .as_object()
            .unwrap()
            .values()
            .map(|v| v.as_array().unwrap().len())
            .sum::<usize>(),
        37
    );

    let mc9 = nodes
        .iter()
        .find(|node| node.id == "lupine-research://material_class/MC9")
        .map(content)
        .unwrap();
    assert_eq!(mc9["record"]["chain"], serde_json::json!(["C6", "C11"]));
    let c4 = nodes
        .iter()
        .find(|node| node.id == "lupine-research://discovery_chain/C4")
        .map(content)
        .unwrap();
    let c11 = nodes
        .iter()
        .find(|node| node.id == "lupine-research://discovery_chain/C11")
        .map(content)
        .unwrap();
    assert_eq!(c4["record"]["readiness"], "M (L→M boundary)");
    assert_eq!(c11["record"]["readiness"], "M (upgraded from draft L)");

    let material_chain_edges: Vec<_> = edges
        .iter()
        .filter(|edge| {
            edge.metadata
                .as_deref()
                .is_some_and(|metadata| metadata.contains("materialClasses.chain"))
        })
        .collect();
    assert_eq!(material_chain_edges.len(), 10);
    assert!(
        !material_chain_edges
            .iter()
            .any(|edge| edge.dst_id.ends_with("/C10"))
    );

    let acceptance_edges: Vec<_> = edges
        .iter()
        .filter(|edge| {
            edge.kind == EdgeKind::DependsOn
                && edge
                    .metadata
                    .as_deref()
                    .is_some_and(|metadata| metadata.contains("gatedBy"))
        })
        .collect();
    assert_eq!(acceptance_edges.len(), 11);
    for n in 1..=11 {
        assert!(
            acceptance_edges.iter().any(|edge| {
                edge.src_id.ends_with(&format!("/C{n}")) && edge.dst_id.ends_with(&format!("/Z{n}"))
            }),
            "missing strict C{n} → Z{n} gate"
        );
    }

    let readiness_edges: Vec<_> = edges
        .iter()
        .filter(|edge| {
            edge.kind == EdgeKind::Documents
                && edge
                    .metadata
                    .as_deref()
                    .is_some_and(|metadata| metadata.contains("readinessJudgedBy"))
        })
        .collect();
    assert_eq!(readiness_edges.len(), 21);
    assert!(
        readiness_edges
            .iter()
            .any(|edge| { edge.src_id.ends_with("/C4") && edge.dst_id.ends_with("/RG-M") })
    );
    assert!(
        readiness_edges
            .iter()
            .any(|edge| { edge.src_id.ends_with("/C11") && edge.dst_id.ends_with("/RG-M") })
    );

    let relation_nodes: Vec<_> = nodes
        .iter()
        .filter(|node| {
            node.kind == NodeKind::Claim
                && node
                    .uri
                    .as_deref()
                    .is_some_and(|uri| uri.starts_with("relation:"))
        })
        .collect();
    assert_eq!(relation_nodes.len(), 32);
    let corrected_by = relation_nodes
        .iter()
        .find(|node| node.name == "correctedBy")
        .unwrap();
    let corrects = relation_nodes
        .iter()
        .find(|node| node.name == "corrects")
        .unwrap();
    let gated_by = relation_nodes
        .iter()
        .find(|node| node.name == "gatedBy")
        .unwrap();
    let gates_on = relation_nodes
        .iter()
        .find(|node| node.name == "gatesOn")
        .unwrap();
    assert_ne!(corrected_by.id, corrects.id);
    assert_ne!(gated_by.id, gates_on.id);
    assert!(
        corrected_by
            .uri
            .as_deref()
            .unwrap()
            .contains(":claim:conflictruling")
    );
    assert!(
        gated_by
            .uri
            .as_deref()
            .unwrap()
            .contains(":discoverychain:acceptancetest")
    );
}

#[test]
fn ingest_binary_populates_an_isolated_database() {
    let output = tempfile::tempdir().unwrap();
    let db_path = output.path().join("ontology.db");
    let ontology = ontology_path();
    let provenance = provenance_path();
    let binary = std::env::var("CARGO_BIN_EXE_ingest-ontology")
        .expect("cargo exposes the ingest-ontology binary");

    let result = Command::new(binary)
        .args([
            "--db",
            db_path.to_str().unwrap(),
            "--ontology",
            ontology.to_str().unwrap(),
            "--provenance",
            provenance.to_str().unwrap(),
        ])
        .output()
        .unwrap();

    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let stdout = String::from_utf8(result.stdout).unwrap();
    assert!(stdout.contains("lupine-research"));
    assert!(stdout.contains("27ba28a37749a1f7ca6495f1217dedaa2574db50dbaecc85b80cd68eda0a6ee2"));
    let db = WikiDb::open(db_path).unwrap();
    assert_eq!(
        db.get_nodes(Some("lupine-research"), None, None)
            .unwrap()
            .len(),
        205
    );
}

#[test]
fn provenance_entry_must_resolve_to_the_exact_ontology_path() {
    let output = tempfile::tempdir().unwrap();
    let provenance = output.path().join("PROVENANCE.sha256");
    std::fs::write(
        &provenance,
        "27ba28a37749a1f7ca6495f1217dedaa2574db50dbaecc85b80cd68eda0a6ee2  content/other/lupine-ontology.json\n",
    )
    .unwrap();
    let mut db = WikiDb::open_in_memory().unwrap();

    let error = ingest_ontology(&mut db, ontology_path(), &provenance).unwrap_err();

    assert!(error.to_string().contains("no provenance entry"));
    assert!(
        db.get_nodes(Some("lupine-research"), None, None)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn scanner_does_not_delete_library_ingested_research_nodes() {
    let output = tempfile::tempdir().unwrap();
    let db_path = output.path().join("ontology.db");
    let config_path = output.path().join("scanner.yaml");
    std::fs::write(&config_path, "spheres: {}\n").unwrap();
    let mut db = WikiDb::open(&db_path).unwrap();
    ingest_ontology(&mut db, ontology_path(), provenance_path()).unwrap();
    drop(db);

    let binary =
        std::env::var("CARGO_BIN_EXE_lupine-wiki").expect("cargo exposes the lupine-wiki binary");
    let result = Command::new(binary)
        .args([
            "--db",
            db_path.to_str().unwrap(),
            "--config",
            config_path.to_str().unwrap(),
            "scan",
            "--no-snapshot",
            "--quiet",
        ])
        .output()
        .unwrap();

    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let db = WikiDb::open(db_path).unwrap();
    assert_eq!(
        db.get_nodes(Some("lupine-research"), None, None)
            .unwrap()
            .len(),
        205
    );
}
