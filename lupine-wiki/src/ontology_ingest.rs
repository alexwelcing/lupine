use crate::WikiDb;
use crate::config::ScannerConfig;
use crate::graph::{Edge, EdgeKind, Node, NodeKind, Provenance, Sphere, Status};
use anyhow::{Context, Result, bail};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::path::{Component, Path};

pub const ONTOLOGY_SPHERE_ID: &str = "lupine-research";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OntologyIngestReport {
    pub source_sha256: String,
    pub nodes_upserted: usize,
    pub edges_upserted: usize,
}

pub fn ingest_ontology(
    db: &mut WikiDb,
    ontology_path: impl AsRef<Path>,
    provenance_path: impl AsRef<Path>,
) -> Result<OntologyIngestReport> {
    let ontology_path = ontology_path.as_ref();
    let provenance_path = provenance_path.as_ref();
    let source = std::fs::read(ontology_path)
        .with_context(|| format!("read ontology source: {}", ontology_path.display()))?;
    let source_sha256 = hex::encode(Sha256::digest(&source));
    verify_provenance(ontology_path, provenance_path, &source_sha256)?;
    let ontology: Value = serde_json::from_slice(&source).context("parse ontology JSON")?;
    let (sphere, nodes, edges) = build_graph(&ontology, &source_sha256)?;
    let retained_node_ids: Vec<String> = nodes.iter().map(|node| node.id.clone()).collect();
    let retained_edge_ids: Vec<String> = edges.iter().map(|edge| edge.id.clone()).collect();

    db.begin_transaction()?;
    let result = (|| -> Result<()> {
        db.upsert_sphere(&sphere)?;
        for node in &nodes {
            db.upsert_node(node)?;
        }
        for edge in &edges {
            db.upsert_edge(edge)?;
        }
        db.delete_edges_not_in(ONTOLOGY_SPHERE_ID, &retained_edge_ids)?;
        db.delete_nodes_not_in(ONTOLOGY_SPHERE_ID, &retained_node_ids)?;
        Ok(())
    })();
    if let Err(error) = result {
        db.rollback_transaction()?;
        return Err(error);
    }
    db.commit_transaction()?;

    Ok(OntologyIngestReport {
        source_sha256,
        nodes_upserted: nodes.len(),
        edges_upserted: edges.len(),
    })
}

fn verify_provenance(ontology_path: &Path, provenance_path: &Path, actual: &str) -> Result<()> {
    let provenance = std::fs::read_to_string(provenance_path)
        .with_context(|| format!("read provenance: {}", provenance_path.display()))?;
    let canonical_ontology = ontology_path
        .canonicalize()
        .with_context(|| format!("canonicalize ontology path: {}", ontology_path.display()))?;
    let provenance_dir = provenance_path
        .parent()
        .context("provenance path has no parent directory")?;
    let expected = provenance
        .lines()
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            Some((fields.next()?, fields.next()?))
        })
        .find_map(|(digest, manifest_path)| {
            let manifest_path = Path::new(manifest_path);
            let is_safe_relative = !manifest_path.is_absolute()
                && manifest_path
                    .components()
                    .all(|component| !matches!(component, Component::ParentDir));
            if !is_safe_relative {
                return None;
            }
            provenance_dir.ancestors().find_map(|base| {
                base.join(manifest_path)
                    .canonicalize()
                    .ok()
                    .filter(|candidate| candidate == &canonical_ontology)
                    .map(|_| digest)
            })
        })
        .with_context(|| {
            format!(
                "no provenance entry resolves to {}",
                canonical_ontology.display()
            )
        })?;
    if actual != expected {
        bail!("ontology provenance mismatch: expected {expected}, got {actual}");
    }
    Ok(())
}

fn build_graph(ontology: &Value, source_sha256: &str) -> Result<(Sphere, Vec<Node>, Vec<Edge>)> {
    let sphere = ScannerConfig::default_spheres()
        .into_iter()
        .find(|sphere| sphere.id == ONTOLOGY_SPHERE_ID)
        .context("lupine-research is not a default sphere")?;
    let atlas_date = ontology
        .pointer("/freshnessLayer/atlasDate")
        .and_then(Value::as_str)
        .context("freshnessLayer.atlasDate is required")?;
    let metadata = json!({
        "asOf": atlas_date,
        "sourceSha256": source_sha256,
        "freshnessLayer": required(ontology, "freshnessLayer")?,
        "epistemicMarkers": required(ontology, "epistemicMarkers")?,
        "readinessGrades": required(ontology, "readinessGrades")?,
        "confidenceGrades": required(ontology, "confidenceGrades")?,
    });
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let sphere_node_id = Node::stable_id(ONTOLOGY_SPHERE_ID, NodeKind::Sphere, ONTOLOGY_SPHERE_ID);
    nodes.push(Node {
        id: sphere_node_id.clone(),
        sphere_id: ONTOLOGY_SPHERE_ID.into(),
        kind: NodeKind::Sphere,
        name: sphere.name.clone(),
        uri: None,
        config_hash: Some(source_sha256.into()),
        content: Some(serde_json::to_string(&sphere)?),
        status: Status::Active,
        provenance: Provenance::Declared,
        owner_profile: None,
        updated_at: None,
    });

    let title = ontology
        .pointer("/metadata/title")
        .and_then(Value::as_str)
        .unwrap_or("The Lupine Ontological Atlas");
    push_node(
        &mut nodes,
        NodeKind::Claim,
        "ontology",
        title,
        ontology.clone(),
        &metadata,
        source_sha256,
    )?;

    add_array_nodes(
        &mut nodes,
        ontology,
        "errorTypes",
        NodeKind::ErrorType,
        None,
        "name",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "emblems",
        NodeKind::Emblem,
        None,
        "name",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "materialClasses",
        NodeKind::MaterialClass,
        None,
        "name",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "acceptanceTests",
        NodeKind::AcceptanceTest,
        None,
        "test",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "discoveryChains",
        NodeKind::DiscoveryChain,
        None,
        "capability",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "timeGates",
        NodeKind::TimeGate,
        "TG",
        "event",
        &metadata,
        source_sha256,
    )?;

    add_indexed_nodes(
        &mut nodes,
        ontology,
        "excludedClasses",
        NodeKind::Claim,
        "X",
        "name",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "scoreboard",
        NodeKind::Claim,
        "SB",
        "failureMode",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "dataLevers",
        NodeKind::Claim,
        None,
        "name",
        &metadata,
        source_sha256,
    )?;
    add_single_node(
        &mut nodes,
        ontology,
        "lupineMethod",
        "LM1",
        "Lupine Method",
        &metadata,
        source_sha256,
    )?;
    add_single_node(
        &mut nodes,
        ontology,
        "formalProof",
        "FP1",
        "Formal proof library",
        &metadata,
        source_sha256,
    )?;
    add_scalar_array_nodes(
        &mut nodes,
        ontology,
        "stageGates",
        "SG",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "killCriteria",
        NodeKind::Claim,
        None,
        "name",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "roadmapPhases",
        NodeKind::Claim,
        "RP",
        "phase",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "epistemicMarkers",
        NodeKind::Claim,
        Some("EMK-"),
        "meaning",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "readinessGrades",
        NodeKind::Claim,
        Some("RG-"),
        "meaning",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "confidenceGrades",
        NodeKind::Claim,
        Some("CG-"),
        "meaning",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "falsifiers",
        NodeKind::Claim,
        "F",
        "claim",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "risks",
        NodeKind::Claim,
        "R",
        "name",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "skepticEpisodes",
        NodeKind::Claim,
        "S",
        "case",
        &metadata,
        source_sha256,
    )?;
    add_array_nodes(
        &mut nodes,
        ontology,
        "conflictRulings",
        NodeKind::Claim,
        None,
        "zone",
        &metadata,
        source_sha256,
    )?;
    add_indexed_nodes(
        &mut nodes,
        ontology,
        "climateTargets",
        NodeKind::Claim,
        "CT",
        "name",
        &metadata,
        source_sha256,
    )?;
    push_node(
        &mut nodes,
        NodeKind::Claim,
        "CA1",
        "Climate aggregate",
        required(ontology, "climateAggregate")?.clone(),
        &metadata,
        source_sha256,
    )?;
    add_superclasses(&mut nodes, &mut edges, ontology, &metadata, source_sha256)?;
    add_relations(&mut nodes, ontology, &metadata, source_sha256)?;

    add_foreign_key_edges(&mut edges, ontology)?;
    for node in nodes.iter().filter(|node| node.kind != NodeKind::Sphere) {
        push_edge(
            &mut edges,
            &node.id,
            &sphere_node_id,
            EdgeKind::BelongsTo,
            "sphere membership",
        )?;
    }
    Ok((sphere, nodes, edges))
}

fn required<'a>(ontology: &'a Value, key: &str) -> Result<&'a Value> {
    ontology
        .get(key)
        .with_context(|| format!("missing ontology section {key}"))
}

fn records<'a>(ontology: &'a Value, section: &str) -> Result<&'a Vec<Value>> {
    required(ontology, section)?
        .as_array()
        .with_context(|| format!("ontology section {section} is not an array"))
}

#[allow(clippy::too_many_arguments)]
fn add_array_nodes(
    nodes: &mut Vec<Node>,
    ontology: &Value,
    section: &str,
    kind: NodeKind,
    id_prefix: Option<&str>,
    name_field: &str,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    for record in records(ontology, section)? {
        let raw_id = record
            .get("id")
            .and_then(Value::as_str)
            .with_context(|| format!("{section} record has no id"))?;
        let id = format!("{}{raw_id}", id_prefix.unwrap_or(""));
        let name = record
            .get(name_field)
            .and_then(Value::as_str)
            .unwrap_or(raw_id);
        push_node(
            nodes,
            kind,
            &id,
            name,
            record.clone(),
            metadata,
            source_sha256,
        )?;
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn add_indexed_nodes(
    nodes: &mut Vec<Node>,
    ontology: &Value,
    section: &str,
    kind: NodeKind,
    prefix: &str,
    name_field: &str,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    for (index, record) in records(ontology, section)?.iter().enumerate() {
        let id = format!("{prefix}{}", index + 1);
        let name = record
            .get(name_field)
            .and_then(Value::as_str)
            .unwrap_or(&id);
        push_node(
            nodes,
            kind,
            &id,
            name,
            record.clone(),
            metadata,
            source_sha256,
        )?;
    }
    Ok(())
}

fn add_single_node(
    nodes: &mut Vec<Node>,
    ontology: &Value,
    section: &str,
    id: &str,
    name: &str,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    push_node(
        nodes,
        NodeKind::Claim,
        id,
        name,
        required(ontology, section)?.clone(),
        metadata,
        source_sha256,
    )
}

fn add_scalar_array_nodes(
    nodes: &mut Vec<Node>,
    ontology: &Value,
    section: &str,
    prefix: &str,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    for (index, value) in records(ontology, section)?.iter().enumerate() {
        let name = value
            .as_str()
            .with_context(|| format!("{section} entry is not text"))?;
        let id = format!("{prefix}{}", index + 1);
        push_node(
            nodes,
            NodeKind::Claim,
            &id,
            name,
            value.clone(),
            metadata,
            source_sha256,
        )?;
    }
    Ok(())
}

fn add_superclasses(
    nodes: &mut Vec<Node>,
    edges: &mut Vec<Edge>,
    ontology: &Value,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    let groups = required(ontology, "superClasses")?
        .as_object()
        .context("superClasses is not an object")?;
    for (group, classes) in groups {
        let group_uri = format!("superclass-group:{}", slug(group));
        push_node(
            nodes,
            NodeKind::Claim,
            &group_uri,
            group,
            json!({"group": group}),
            metadata,
            source_sha256,
        )?;
        let group_id = Node::stable_id(ONTOLOGY_SPHERE_ID, NodeKind::Claim, &group_uri);
        for class in classes
            .as_array()
            .with_context(|| format!("superClasses.{group} is not an array"))?
        {
            let class = class
                .as_str()
                .with_context(|| format!("superClasses.{group} contains non-text"))?;
            let class_uri = format!("superclass:{}", slug(class));
            push_node(
                nodes,
                NodeKind::Claim,
                &class_uri,
                class,
                json!({"class": class, "superClass": group}),
                metadata,
                source_sha256,
            )?;
            let class_id = Node::stable_id(ONTOLOGY_SPHERE_ID, NodeKind::Claim, &class_uri);
            push_edge(
                edges,
                &class_id,
                &group_id,
                EdgeKind::BelongsTo,
                "superClasses",
            )?;
        }
    }
    Ok(())
}

fn add_relations(
    nodes: &mut Vec<Node>,
    ontology: &Value,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    for relation in records(ontology, "relations")? {
        let name = relation
            .get("name")
            .and_then(Value::as_str)
            .context("relation has no name")?;
        let domain = relation
            .get("domain")
            .and_then(Value::as_str)
            .unwrap_or("any");
        let range = relation
            .get("range")
            .and_then(Value::as_str)
            .unwrap_or("any");
        let uri = format!("relation:{}:{}:{}", slug(name), slug(domain), slug(range));
        push_node(
            nodes,
            NodeKind::Claim,
            &uri,
            name,
            relation.clone(),
            metadata,
            source_sha256,
        )?;
    }
    Ok(())
}

fn add_foreign_key_edges(edges: &mut Vec<Edge>, ontology: &Value) -> Result<()> {
    for emblem in records(ontology, "emblems")? {
        let emblem_id = record_id(emblem, "emblems")?;
        for error_type in string_values(emblem, "types")? {
            push_edge(
                edges,
                &stable(NodeKind::Emblem, emblem_id),
                &stable(NodeKind::ErrorType, error_type),
                EdgeKind::Evidences,
                "emblems.types",
            )?;
        }
    }
    for material in records(ontology, "materialClasses")? {
        let material_id = record_id(material, "materialClasses")?;
        for error_type in string_values(material, "dominantErrorTypes")? {
            push_edge(
                edges,
                &stable(NodeKind::MaterialClass, material_id),
                &stable(NodeKind::ErrorType, error_type),
                EdgeKind::Documents,
                "materialClasses.dominantErrorTypes",
            )?;
        }
        let chain = material
            .get("chain")
            .context("materialClasses record has no chain")?;
        let chains: Vec<&str> = if let Some(chain) = chain.as_str() {
            vec![chain]
        } else {
            chain
                .as_array()
                .context("materialClasses.chain is neither text nor array")?
                .iter()
                .map(|value| {
                    value
                        .as_str()
                        .context("materialClasses.chain contains non-text")
                })
                .collect::<Result<_>>()?
        };
        for chain in chains {
            push_edge(
                edges,
                &stable(NodeKind::MaterialClass, material_id),
                &stable(NodeKind::DiscoveryChain, chain),
                EdgeKind::Documents,
                "materialClasses.chain",
            )?;
        }
    }
    for test in records(ontology, "acceptanceTests")? {
        let test_id = record_id(test, "acceptanceTests")?;
        let chain = test
            .get("chain")
            .and_then(Value::as_str)
            .context("acceptanceTests record has no chain")?;
        push_edge(
            edges,
            &stable(NodeKind::DiscoveryChain, chain),
            &stable(NodeKind::AcceptanceTest, test_id),
            EdgeKind::DependsOn,
            "gatedBy:acceptanceTests.chain",
        )?;
    }
    for (index, row) in records(ontology, "scoreboard")?.iter().enumerate() {
        let claim_id = stable(NodeKind::Claim, &format!("SB{}", index + 1));
        for error_type in string_values(row, "types")? {
            push_edge(
                edges,
                &claim_id,
                &stable(NodeKind::ErrorType, error_type),
                EdgeKind::Evidences,
                "scoreboard.types",
            )?;
        }
        push_readiness_edge(edges, &claim_id, row, "scoreboard.readiness")?;
    }
    for chain in records(ontology, "discoveryChains")? {
        let chain_id = stable(
            NodeKind::DiscoveryChain,
            record_id(chain, "discoveryChains")?,
        );
        push_readiness_edge(edges, &chain_id, chain, "discoveryChains.readiness")?;
    }
    Ok(())
}

fn push_readiness_edge(
    edges: &mut Vec<Edge>,
    source_id: &str,
    record: &Value,
    relation_source: &str,
) -> Result<()> {
    let annotated_readiness = record
        .get("readiness")
        .and_then(Value::as_str)
        .context("record has no readiness")?;
    let grade = annotated_readiness
        .split_whitespace()
        .next()
        .context("record readiness is empty")?;
    push_edge(
        edges,
        source_id,
        &stable(NodeKind::Claim, &format!("RG-{grade}")),
        EdgeKind::Documents,
        &format!("readinessJudgedBy:{relation_source}"),
    )
}

fn record_id<'a>(record: &'a Value, section: &str) -> Result<&'a str> {
    record
        .get("id")
        .and_then(Value::as_str)
        .with_context(|| format!("{section} record has no id"))
}

fn string_values<'a>(record: &'a Value, field: &str) -> Result<Vec<&'a str>> {
    record
        .get(field)
        .and_then(Value::as_array)
        .with_context(|| format!("record field {field} is not an array"))?
        .iter()
        .map(|value| {
            value
                .as_str()
                .with_context(|| format!("record field {field} contains non-text"))
        })
        .collect()
}

fn push_node(
    nodes: &mut Vec<Node>,
    kind: NodeKind,
    uri: &str,
    name: &str,
    record: Value,
    metadata: &Value,
    source_sha256: &str,
) -> Result<()> {
    let id = stable(kind, uri);
    if nodes.iter().any(|node| node.id == id) {
        bail!("duplicate ontology node id: {id}");
    }
    nodes.push(Node {
        id,
        sphere_id: ONTOLOGY_SPHERE_ID.into(),
        kind,
        name: name.into(),
        uri: Some(uri.into()),
        config_hash: Some(source_sha256.into()),
        content: Some(serde_json::to_string(&json!({
            "record": record,
            "metadata": metadata,
        }))?),
        status: Status::Active,
        provenance: Provenance::Declared,
        owner_profile: None,
        updated_at: None,
    });
    Ok(())
}

fn push_edge(
    edges: &mut Vec<Edge>,
    src_id: &str,
    dst_id: &str,
    kind: EdgeKind,
    relation: &str,
) -> Result<()> {
    let id = Edge::stable_id(src_id, dst_id, kind);
    if edges.iter().any(|edge| edge.id == id) {
        bail!("duplicate ontology edge id: {id}");
    }
    edges.push(Edge {
        id,
        src_id: src_id.into(),
        dst_id: dst_id.into(),
        kind,
        provenance: Provenance::Declared,
        metadata: Some(serde_json::to_string(&json!({"relation": relation}))?),
        updated_at: None,
    });
    Ok(())
}

fn stable(kind: NodeKind, uri: &str) -> String {
    Node::stable_id(ONTOLOGY_SPHERE_ID, kind, uri)
}

fn slug(value: &str) -> String {
    let mut output = String::new();
    let mut separator = false;
    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            output.push(character.to_ascii_lowercase());
            separator = false;
        } else if !separator && !output.is_empty() {
            output.push('-');
            separator = true;
        }
    }
    output.trim_end_matches('-').to_string()
}
