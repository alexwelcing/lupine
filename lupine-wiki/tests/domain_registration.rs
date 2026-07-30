use lupine_wiki::{
    MoleculeExport, Node, NodeKind, Provenance, ScannerConfig, Sphere, Status, export_xyz,
};
use std::collections::HashMap;
use std::str::FromStr;

#[test]
fn ontology_node_kinds_round_trip_through_storage_names() {
    let cases = [
        (NodeKind::ErrorType, "error_type"),
        (NodeKind::MaterialClass, "material_class"),
        (NodeKind::DiscoveryChain, "discovery_chain"),
        (NodeKind::AcceptanceTest, "acceptance_test"),
        (NodeKind::Emblem, "emblem"),
        (NodeKind::Claim, "claim"),
        (NodeKind::TimeGate, "time_gate"),
    ];

    for (kind, storage_name) in cases {
        assert_eq!(kind.as_str(), storage_name);
        assert_eq!(NodeKind::from_str(storage_name).unwrap(), kind);
    }
}

#[test]
fn lupine_research_uses_scandium_in_molecule_exports() {
    let sphere = ScannerConfig::default_spheres()
        .into_iter()
        .find(|sphere| sphere.id == "lupine-research")
        .expect("lupine-research default sphere");
    let node = Node {
        id: Node::stable_id(&sphere.id, NodeKind::Claim, "test-claim"),
        sphere_id: sphere.id.clone(),
        kind: NodeKind::Claim,
        name: "Test claim".into(),
        uri: Some("test-claim".into()),
        config_hash: None,
        content: None,
        status: Status::Active,
        provenance: Provenance::Declared,
        owner_profile: None,
        updated_at: None,
    };
    let export = MoleculeExport {
        nodes: vec![node],
        edges: vec![],
        spheres: vec![Sphere::new(
            &sphere.id,
            &sphere.name,
            &sphere.description,
            &sphere.color,
            sphere.priority,
        )],
        positions: vec![[0.0, 0.0, 0.0]],
        atom_type_map: HashMap::new(),
        edge_pairs: vec![],
    };
    let output = tempfile::tempdir().unwrap();
    let xyz = output.path().join("research.xyz");
    let data = output.path().join("research.data");

    export_xyz::write_xyz(&export, &xyz).unwrap();
    export_xyz::write_data(&export, &data).unwrap();

    assert!(std::fs::read_to_string(xyz).unwrap().contains("Sc"));
    let data = std::fs::read_to_string(data).unwrap();
    assert!(data.contains("21 44.956"));
    assert!(data.contains("1 21 0.000000 0.000000 0.000000"));
}
