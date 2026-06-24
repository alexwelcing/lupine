use crate::db::WikiDb;
use crate::graph::{Edge, Node, Sphere};
use crate::layout::layout_graph;
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Map each sphere to a real element symbol so LUPI colors clusters distinctly.
fn sphere_to_element(sphere_id: &str) -> &'static str {
    match sphere_id {
        "hermes-core" => "Co",
        "hermes-local-extensions" => "Cr",
        "lupine-science" => "Fe",
        "lupine-ledger" => "Cu",
        "lupine-media" => "Ni",
        "lupine-public" => "Zn",
        _ => "C",
    }
}

/// Map each sphere to its atomic number. LUPI interprets data-file type ids as
/// atomic numbers, so using real values gives correct colors and radii.
fn sphere_to_atomic_number(sphere_id: &str) -> i32 {
    match sphere_id {
        "hermes-core" => 27,              // Co
        "hermes-local-extensions" => 24,  // Cr
        "lupine-science" => 26,           // Fe
        "lupine-ledger" => 29,            // Cu
        "lupine-media" => 28,             // Ni
        "lupine-public" => 30,            // Zn
        _ => 6,                           // C
    }
}

/// Per-kind radius multiplier for the molecule view. Values are intentionally
/// large because knowledge-graph molecules are viewed at high camera distance;
/// without this the smaller kinds disappear.
fn kind_radius(kind: &crate::graph::NodeKind) -> f64 {
    match kind {
        crate::graph::NodeKind::Project => 3.0,
        crate::graph::NodeKind::Sphere => 2.8,
        crate::graph::NodeKind::Repo => 2.4,
        crate::graph::NodeKind::Claim => 2.2,
        crate::graph::NodeKind::Doc => 2.0,
        crate::graph::NodeKind::Skill => 1.8,
        crate::graph::NodeKind::Plugin => 1.7,
        crate::graph::NodeKind::McpServer => 1.7,
        crate::graph::NodeKind::ModelProvider => 1.7,
        crate::graph::NodeKind::Config => 1.5,
        crate::graph::NodeKind::CronJob => 1.4,
        crate::graph::NodeKind::ApiCredential => 1.4,
        crate::graph::NodeKind::KanbanTask => 1.3,
        crate::graph::NodeKind::Task => 1.3,
        crate::graph::NodeKind::Beat => 1.3,
        crate::graph::NodeKind::Binary => 1.2,
        crate::graph::NodeKind::Directory => 1.2,
        crate::graph::NodeKind::File => 1.1,
        crate::graph::NodeKind::D1Table => 1.1,
        crate::graph::NodeKind::Unknown => 1.2,
    }
}

/// For metadata only: map (sphere, kind) -> an arbitrary type id.
fn build_atom_type_map(nodes: &[Node]) -> HashMap<(String, String), usize> {
    let mut map: HashMap<(String, String), usize> = HashMap::new();
    let mut next = 1usize;
    for node in nodes {
        let key = (node.sphere_id.clone(), node.kind.as_str().to_string());
        if !map.contains_key(&key) {
            map.insert(key, next);
            next += 1;
        }
    }
    map
}

pub struct MoleculeExport {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub spheres: Vec<Sphere>,
    pub positions: Vec<[f64; 3]>,
    pub atom_type_map: HashMap<(String, String), usize>,
    pub edge_pairs: Vec<(usize, usize)>,
}

pub fn export_from_db(db: &WikiDb) -> Result<MoleculeExport> {
    let spheres = db.get_spheres()?;
    let nodes = db.get_nodes(None, None, None)?;
    let edges = db.get_edges(None, None, None)?;

    let atom_type_map = build_atom_type_map(&nodes);

    let node_index: HashMap<String, usize> = nodes
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id.clone(), i))
        .collect();

    let edge_pairs: Vec<(usize, usize)> = edges
        .iter()
        .filter_map(|e| {
            let a = node_index.get(&e.src_id)?;
            let b = node_index.get(&e.dst_id)?;
            Some((*a, *b))
        })
        .collect();

    let layout = layout_graph(&nodes, &edges, &spheres);

    Ok(MoleculeExport {
        nodes,
        edges,
        spheres,
        positions: layout.positions,
        atom_type_map,
        edge_pairs,
    })
}

pub fn write_xyz(export: &MoleculeExport, path: &Path) -> Result<()> {
    let mut lines = Vec::new();
    lines.push(format!("{}", export.nodes.len()));
    lines.push("Lupine sphere-grid knowledge graph".to_string());

    for (i, node) in export.nodes.iter().enumerate() {
        let el = sphere_to_element(&node.sphere_id);
        let [x, y, z] = export.positions[i];
        lines.push(format!("{:<3} {:>12.6} {:>12.6} {:>12.6}", el, x, y, z));
    }

    fs::write(path, lines.join("\n") + "\n").with_context(|| format!("write XYZ file: {}", path.display()))?;
    Ok(())
}

pub fn write_data(export: &MoleculeExport, path: &Path) -> Result<()> {
    let n_atoms = export.nodes.len();
    let n_bonds = export.edge_pairs.len();

    // Use one atom type per sphere, mapped to a real atomic number so LUPI
    // renders with correct element colors and radii.
    let mut sphere_type_ids: HashMap<String, i32> = HashMap::new();
    for sphere in &export.spheres {
        sphere_type_ids.insert(sphere.id.clone(), sphere_to_atomic_number(&sphere.id));
    }
    let unique_type_ids: std::collections::HashSet<i32> = sphere_type_ids.values().copied().collect();

    // Compute bounding box with padding
    let (min, max) = bounds(export);
    let padding = 10.0;
    let xlo = min[0] - padding;
    let xhi = max[0] + padding;
    let ylo = min[1] - padding;
    let yhi = max[1] + padding;
    let zlo = min[2] - padding;
    let zhi = max[2] + padding;

    let mut lines = Vec::new();
    lines.push("Lupine sphere-grid knowledge graph".to_string());
    lines.push(format!("{} atoms", n_atoms));
    lines.push(format!("{} bonds", n_bonds));
    lines.push(format!("{} atom types", unique_type_ids.len()));
    lines.push("1 bond types".to_string());
    lines.push("".to_string());
    lines.push(format!("{:.6} {:.6} xlo xhi", xlo, xhi));
    lines.push(format!("{:.6} {:.6} ylo yhi", ylo, yhi));
    lines.push(format!("{:.6} {:.6} zlo zhi", zlo, zhi));
    lines.push("".to_string());

    // Masses: use the real atomic mass for each sphere element.
    lines.push("Masses".to_string());
    let mut sorted_type_ids: Vec<i32> = unique_type_ids.into_iter().collect();
    sorted_type_ids.sort();
    for t in &sorted_type_ids {
        let mass = atomic_mass_for_type(*t);
        lines.push(format!("{} {:.3}", t, mass));
    }
    lines.push("".to_string());

    lines.push("Atoms # atomic".to_string());
    for (i, node) in export.nodes.iter().enumerate() {
        let type_id = sphere_type_ids.get(&node.sphere_id).copied().unwrap_or(6);
        let [x, y, z] = export.positions[i];
        lines.push(format!("{} {} {:.6} {:.6} {:.6}", i + 1, type_id, x, y, z));
    }

    if n_bonds > 0 {
        lines.push("".to_string());
        lines.push("Bonds".to_string());
        for (i, (a, b)) in export.edge_pairs.iter().enumerate() {
            lines.push(format!("{} 1 {} {}", i + 1, a + 1, b + 1));
        }
    }

    fs::write(path, lines.join("\n") + "\n").with_context(|| format!("write LAMMPS data file: {}", path.display()))?;
    Ok(())
}

fn atomic_mass_for_type(atomic_number: i32) -> f64 {
    match atomic_number {
        6 => 12.011,   // C
        24 => 51.996,  // Cr
        26 => 55.845,  // Fe
        27 => 58.933,  // Co
        28 => 58.693,  // Ni
        29 => 63.546,  // Cu
        30 => 65.380,  // Zn
        _ => 12.011,
    }
}

/// Write a single-frame LAMMPS dump file. This is lupi's native ingest format
/// and uses the streaming parser path, so it is the most reliable way to view
/// the sphere grid in the live viewer.
///
/// Per-atom columns include:
///   id      — 1-based atom index (shown in the HUD)
///   type    — atomic number encoding the sphere (drives default color)
///   x y z   — 3D layout position
///   sphere_id — numeric sphere index (can be colored by property)
///   kind    — numeric node-kind index (can be colored by property)
///   radius  — per-kind size multiplier (read by the LUPI renderer)
pub fn write_dump(export: &MoleculeExport, path: &Path) -> Result<()> {
    let n_atoms = export.nodes.len();
    let (min, max) = bounds(export);
    let padding = 10.0;

    // Stable numeric indices for spheres and kinds so properties are reproducible.
    let mut sphere_index: HashMap<String, i32> = HashMap::new();
    let mut kind_index: HashMap<String, i32> = HashMap::new();
    let mut next_sphere = 0i32;
    let mut next_kind = 0i32;
    for node in &export.nodes {
        if !sphere_index.contains_key(&node.sphere_id) {
            sphere_index.insert(node.sphere_id.clone(), next_sphere);
            next_sphere += 1;
        }
        let kind_str = node.kind.as_str().to_string();
        if !kind_index.contains_key(&kind_str) {
            kind_index.insert(kind_str, next_kind);
            next_kind += 1;
        }
    }

    let mut lines = Vec::new();
    lines.push("ITEM: TIMESTEP".to_string());
    lines.push("0".to_string());
    lines.push("ITEM: NUMBER OF ATOMS".to_string());
    lines.push(format!("{}", n_atoms));
    lines.push("ITEM: BOX BOUNDS pp pp pp".to_string());
    lines.push(format!("{:.6} {:.6}", min[0] - padding, max[0] + padding));
    lines.push(format!("{:.6} {:.6}", min[1] - padding, max[1] + padding));
    lines.push(format!("{:.6} {:.6}", min[2] - padding, max[2] + padding));
    lines.push("ITEM: ATOMS id type x y z sphere_id kind radius".to_string());

    for (i, node) in export.nodes.iter().enumerate() {
        let type_id = sphere_to_atomic_number(&node.sphere_id);
        let [x, y, z] = export.positions[i];
        let sph = sphere_index.get(&node.sphere_id).copied().unwrap_or(-1);
        let knd = kind_index.get(&node.kind.as_str().to_string()).copied().unwrap_or(-1);
        let radius = kind_radius(&node.kind);
        lines.push(format!(
            "{} {} {:.6} {:.6} {:.6} {} {} {:.3}",
            i + 1,
            type_id,
            x,
            y,
            z,
            sph,
            knd,
            radius
        ));
    }

    fs::write(path, lines.join("\n") + "\n")
        .with_context(|| format!("write LAMMPS dump file: {}", path.display()))?;
    Ok(())
}

pub fn write_metadata(export: &MoleculeExport, path: &Path) -> Result<()> {
    let mut sphere_kinds: HashMap<String, std::collections::HashSet<String>> = HashMap::new();
    let mut sphere_index: HashMap<String, i32> = HashMap::new();
    let mut kind_index: HashMap<String, i32> = HashMap::new();
    let mut next_sphere = 0i32;
    let mut next_kind = 0i32;
    for node in &export.nodes {
        if !sphere_index.contains_key(&node.sphere_id) {
            sphere_index.insert(node.sphere_id.clone(), next_sphere);
            next_sphere += 1;
        }
        let kind_str = node.kind.as_str().to_string();
        if !kind_index.contains_key(&kind_str) {
            kind_index.insert(kind_str.clone(), next_kind);
            next_kind += 1;
        }
        sphere_kinds
            .entry(node.sphere_id.clone())
            .or_default()
            .insert(kind_str);
    }

    let kind_mapping: serde_json::Map<String, serde_json::Value> = kind_index
        .iter()
        .map(|(kind, idx)| {
            let nk = kind.parse::<crate::graph::NodeKind>().unwrap_or(crate::graph::NodeKind::Unknown);
            (kind.clone(), serde_json::json!({
                "index": idx,
                "radius": kind_radius(&nk),
            }))
        })
        .collect();

    let mapping: serde_json::Value = serde_json::json!({
        "spheres": export.spheres.iter().map(|s| {
            let element = sphere_to_element(&s.id);
            let atomic_number = sphere_to_atomic_number(&s.id);
            let idx = sphere_index.get(&s.id).copied().unwrap_or(-1);
            let kinds: Vec<String> = sphere_kinds.get(&s.id).map(|k| k.iter().cloned().collect()).unwrap_or_default();
            serde_json::json!({
                "id": s.id,
                "name": s.name,
                "index": idx,
                "element": element,
                "atomic_number": atomic_number,
                "kinds": kinds,
            })
        }).collect::<Vec<_>>(),
        "kinds": kind_mapping,
        "columns": ["id", "type", "x", "y", "z", "sphere_id", "kind", "radius"],
        "node_count": export.nodes.len(),
        "edge_count": export.edge_pairs.len(),
    });
    fs::write(path, serde_json::to_string_pretty(&mapping)?)
        .with_context(|| format!("write metadata file: {}", path.display()))?;
    Ok(())
}

/// Generate 3D knowledge labels for the sphere-grid view.
///
/// Returns one label per sphere at its centroid, plus a label for every node.
/// Each label carries a `salience` score (sphere=2, project/repo/skill=1,
/// other=0) so the viewer can render a readable default set while still having
/// full metadata available for hover/inspect interactions.
pub fn write_labels(export: &MoleculeExport, path: &Path) -> Result<()> {
    let mut sphere_index: HashMap<String, i32> = HashMap::new();
    let mut next_sphere = 0i32;
    for node in &export.nodes {
        if !sphere_index.contains_key(&node.sphere_id) {
            sphere_index.insert(node.sphere_id.clone(), next_sphere);
            next_sphere += 1;
        }
    }

    // Sphere centroids and kind counts.
    let mut sphere_positions: HashMap<String, [f64; 3]> = HashMap::new();
    let mut sphere_counts: HashMap<String, HashMap<String, usize>> = HashMap::new();
    for (i, node) in export.nodes.iter().enumerate() {
        let pos = export.positions[i];
        let entry = sphere_positions.entry(node.sphere_id.clone()).or_insert([0.0; 3]);
        entry[0] += pos[0];
        entry[1] += pos[1];
        entry[2] += pos[2];
        *sphere_counts
            .entry(node.sphere_id.clone())
            .or_default()
            .entry(node.kind.as_str().to_string())
            .or_insert(0) += 1;
    }

    // Degree (edge count) per node so the viewer can reveal how connected a node is.
    let mut node_degrees: HashMap<usize, usize> = HashMap::new();
    for (a, b) in &export.edge_pairs {
        *node_degrees.entry(*a).or_insert(0) += 1;
        *node_degrees.entry(*b).or_insert(0) += 1;
    }
    for (sphere_id, entry) in &mut sphere_positions {
        let count = export.nodes.iter().filter(|n| n.sphere_id == *sphere_id).count() as f64;
        entry[0] /= count;
        entry[1] /= count;
        entry[2] /= count;
    }

    let mut labels = Vec::new();

    // One label per sphere at its centroid.
    for sphere in &export.spheres {
        let idx = sphere_index.get(&sphere.id).copied().unwrap_or(-1);
        let centroid = sphere_positions.get(&sphere.id).copied().unwrap_or([0.0; 3]);
        let counts = sphere_counts.get(&sphere.id).cloned().unwrap_or_default();
        let count_summary: Vec<String> = counts
            .iter()
            .map(|(k, c)| format!("{} {}", c, k))
            .collect();
        labels.push(serde_json::json!({
            "id": format!("sphere-{}", sphere.id),
            "kind": "sphere",
            "text": sphere.name,
            "detail": format!("{} nodes · {}", export.nodes.iter().filter(|n| n.sphere_id == sphere.id).count(), count_summary.join(", ")),
            "sphere_id": sphere.id,
            "sphere_index": idx,
            "salience": 2,
            "position": centroid,
        }));
    }

    // Labels for every node, with a salience score the viewer can use to decide
    // which labels to render by default (avoiding 600+ overlapping cards).
    // The dedicated sphere-centroid labels above already cover sphere nodes.
    for (i, node) in export.nodes.iter().enumerate() {
        if matches!(node.kind, crate::graph::NodeKind::Sphere) {
            continue;
        }
        let salience: i32 = match node.kind {
            crate::graph::NodeKind::Sphere => 2,
            crate::graph::NodeKind::Project
            | crate::graph::NodeKind::Repo
            | crate::graph::NodeKind::Skill => 1,
            _ => 0,
        };
        let pos = export.positions[i];
        let degree = node_degrees.get(&i).copied().unwrap_or(0);
        labels.push(serde_json::json!({
            "id": format!("node-{}", node.id),
            "kind": "node",
            "node_kind": node.kind.as_str(),
            "node_id": node.id,
            "text": node.name,
            "detail": format!("{} · {} · {} connection{}", node.kind.as_str(), node.sphere_id, degree, if degree == 1 { "" } else { "s" }),
            "sphere_id": node.sphere_id,
            "sphere_index": sphere_index.get(&node.sphere_id).copied().unwrap_or(-1),
            "atom_index": i,
            "degree": degree,
            "salience": salience,
            "position": pos,
        }));
    }

    fs::write(path, serde_json::to_string_pretty(&serde_json::json!({ "labels": labels }))?)
        .with_context(|| format!("write labels file: {}", path.display()))?;
    Ok(())
}

fn bounds(export: &MoleculeExport) -> ([f64; 3], [f64; 3]) {
    let mut min = [f64::INFINITY; 3];
    let mut max = [f64::NEG_INFINITY; 3];
    for [x, y, z] in &export.positions {
        min[0] = min[0].min(*x);
        min[1] = min[1].min(*y);
        min[2] = min[2].min(*z);
        max[0] = max[0].max(*x);
        max[1] = max[1].max(*y);
        max[2] = max[2].max(*z);
    }
    (min, max)
}
