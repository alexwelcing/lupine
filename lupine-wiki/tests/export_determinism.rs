use lupine_wiki::{WikiDb, ingest_ontology};
use std::path::PathBuf;
use std::process::Command;

fn ontology_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../lupine-ledger/content/ontology/lupine-ontology.json")
}

fn provenance_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../lupine-ledger/content/ontology/PROVENANCE.sha256")
}

#[test]
fn research_sphere_molecule_export_is_byte_deterministic() {
    let output = tempfile::tempdir().unwrap();
    let db_path = output.path().join("ontology.db");
    let first = output.path().join("first");
    let second = output.path().join("second");
    let mut db = WikiDb::open(&db_path).unwrap();
    ingest_ontology(&mut db, ontology_path(), provenance_path()).unwrap();
    drop(db);
    let binary = std::env::var("CARGO_BIN_EXE_lupine-wiki").unwrap();

    for destination in [&first, &second] {
        let result = Command::new(&binary)
            .args([
                "--db",
                db_path.to_str().unwrap(),
                "export-molecule",
                "--sphere",
                "lupine-research",
                "--seed",
                "42",
                "--output",
                destination.to_str().unwrap(),
                "--quiet",
            ])
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
    }

    for filename in [
        "sphere-grid.xyz",
        "sphere-grid.data",
        "sphere-grid.lammpstrj",
        "sphere-grid.molecule.json",
        "sphere-grid.labels.json",
    ] {
        assert_eq!(
            std::fs::read(first.join(filename)).unwrap(),
            std::fs::read(second.join(filename)).unwrap(),
            "non-deterministic export artifact: {filename}"
        );
    }
}
