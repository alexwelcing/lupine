use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use lupine_wiki::{config, db, export_xyz, graph, layout::layout_graph, render, scanner};
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use tracing::{info, warn};

#[derive(Debug, Parser)]
#[command(name = "lupine-wiki")]
#[command(about = "Sphere-grid knowledge base for Lupine + Hermes")]
struct Cli {
    #[command(subcommand)]
    command: Command,

    /// Path to the SQLite database
    #[arg(long, global = true, env = "LUPINE_WIKI_DB")]
    db: Option<PathBuf>,

    /// Path to scanner.yaml
    #[arg(long, global = true, env = "LUPINE_WIKI_CONFIG")]
    config: Option<PathBuf>,

    /// Project root used to resolve relative paths
    #[arg(long, global = true, env = "LUPINE_WIKI_ROOT")]
    root: Option<PathBuf>,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Scan configured roots and update the wiki database
    Scan {
        /// Do not create a snapshot after scanning
        #[arg(long)]
        no_snapshot: bool,
        /// Only scan the named sphere
        #[arg(long)]
        sphere: Option<String>,
        /// Print verbose per-node output
        #[arg(short, long)]
        verbose: bool,
        /// Suppress summary output
        #[arg(short, long)]
        quiet: bool,
    },
    /// Query nodes and edges in the wiki
    Query {
        #[arg(long)]
        sphere: Option<String>,
        #[arg(long)]
        kind: Option<String>,
        #[arg(long)]
        status: Option<String>,
        #[arg(long)]
        limit: Option<usize>,
    },
    /// Render the static HTML/JS viewer
    Render {
        /// Output directory
        #[arg(short, long, default_value = "~/.hermes/lupine-wiki")]
        output: String,
        /// Suppress output
        #[arg(short, long)]
        quiet: bool,
    },
    /// Compare two snapshots
    Diff { from: i64, to: i64 },
    /// Tag a node with a sphere, status, or owner profile
    Tag {
        node_id: String,
        #[arg(long)]
        sphere: Option<String>,
        #[arg(long)]
        status: Option<String>,
        #[arg(long)]
        owner: Option<String>,
    },
    /// List recent snapshots
    Snapshots {
        #[arg(short, long, default_value = "10")]
        limit: usize,
    },
    /// Show the configured default spheres
    Spheres,
    /// Export the wiki as a 3D molecular structure for lupi
    ExportMolecule {
        /// Output directory
        #[arg(short, long, default_value = "~/.hermes/lupine-wiki")]
        output: String,
        /// Export only the named sphere
        #[arg(long)]
        sphere: Option<String>,
        /// Random seed for deterministic layout (default: 42)
        #[arg(long, default_value = "42")]
        seed: u64,
        /// Suppress non-error output
        #[arg(short, long)]
        quiet: bool,
    },
}

fn default_db_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".hermes").join("lupine-wiki.db"))
        .unwrap_or_else(|| PathBuf::from("lupine-wiki.db"))
}

fn default_config_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".hermes").join("lupine-wiki").join("scanner.yaml"))
        .unwrap_or_else(|| PathBuf::from("scanner.yaml"))
}

fn default_project_root() -> PathBuf {
    PathBuf::from("/home/alex/Dev/lupine/lupine")
}

fn resolve_path(raw: &str) -> PathBuf {
    if raw.starts_with("~/") {
        dirs::home_dir()
            .map(|h| h.join(&raw[2..]))
            .unwrap_or_else(|| PathBuf::from(raw))
    } else {
        PathBuf::from(raw)
    }
}

fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();

    let db_path = cli.db.unwrap_or_else(default_db_path);
    let config_path = cli.config.unwrap_or_else(default_config_path);
    let project_root = cli.root.unwrap_or_else(default_project_root);

    match cli.command {
        Command::Scan {
            no_snapshot,
            sphere: sphere_filter,
            verbose,
            quiet,
        } => {
            let mut db = db::WikiDb::open(&db_path)
                .with_context(|| format!("open wiki database at {}", db_path.display()))?;

            let config = if config_path.exists() {
                config::ScannerConfig::from_file(&config_path).with_context(|| {
                    format!("load scanner config from {}", config_path.display())
                })?
            } else {
                warn!(
                    "scanner config not found at {}; using default spheres only",
                    config_path.display()
                );
                config::ScannerConfig::default()
            };

            let scanner = scanner::Scanner::new(config, &project_root);
            let result = scanner.scan().context("scan project")?;

            // Apply optional sphere filter by keeping only matching nodes/edges/spheres
            let (spheres, nodes, edges) = if let Some(sid) = sphere_filter {
                let spheres: Vec<_> = result.spheres.into_iter().filter(|s| s.id == sid).collect();
                let nodes: Vec<_> = result
                    .nodes
                    .into_iter()
                    .filter(|n| n.sphere_id == sid)
                    .collect();
                let node_ids: std::collections::HashSet<_> = nodes.iter().map(|n| &n.id).collect();
                let edges: Vec<_> = result
                    .edges
                    .into_iter()
                    .filter(|e| node_ids.contains(&e.src_id) && node_ids.contains(&e.dst_id))
                    .collect();
                (spheres, nodes, edges)
            } else {
                (result.spheres, result.nodes, result.edges)
            };

            db.begin_transaction()?;

            for sphere in &spheres {
                db.upsert_sphere(sphere)?;
            }

            let mut retained_node_ids: Vec<String> = Vec::new();
            let mut retained_edge_ids: Vec<String> = Vec::new();

            let node_id_set: std::collections::HashSet<_> = nodes.iter().map(|n| &n.id).collect();

            for node in &nodes {
                db.upsert_node(node)?;
                retained_node_ids.push(node.id.clone());
                if verbose {
                    println!("{} {} {}", node.sphere_id, node.kind, node.name);
                }
            }
            for edge in &edges {
                if !node_id_set.contains(&edge.src_id) {
                    warn!("skipping edge with missing source: {}", edge.src_id);
                    continue;
                }
                if !node_id_set.contains(&edge.dst_id) {
                    warn!("skipping edge with missing target: {}", edge.dst_id);
                    continue;
                }
                db.upsert_edge(edge)?;
                retained_edge_ids.push(edge.id.clone());
            }

            // Remove stale nodes/edges that were not seen this scan, per sphere
            let sphere_ids: std::collections::HashSet<_> = spheres.iter().map(|s| &s.id).collect();
            for sid in sphere_ids {
                let sphere_node_ids: Vec<String> = retained_node_ids
                    .iter()
                    .filter(|id| {
                        nodes
                            .iter()
                            .find(|n| &n.id == *id)
                            .map(|n| &n.sphere_id == sid)
                            .unwrap_or(false)
                    })
                    .cloned()
                    .collect();
                let sphere_edge_ids: Vec<String> = retained_edge_ids
                    .iter()
                    .filter(|id| {
                        edges
                            .iter()
                            .find(|e| &e.id == *id)
                            .map(|e| {
                                nodes
                                    .iter()
                                    .find(|n| n.id == e.src_id)
                                    .map(|n| &n.sphere_id == sid)
                                    .unwrap_or(false)
                            })
                            .unwrap_or(false)
                    })
                    .cloned()
                    .collect();
                let removed_nodes = db.delete_nodes_not_in(sid, &sphere_node_ids)?;
                let removed_edges = db.delete_edges_not_in(sid, &sphere_edge_ids)?;
                if !quiet {
                    info!(
                        "sphere {}: removed {} stale nodes, {} stale edges",
                        sid, removed_nodes, removed_edges
                    );
                }
            }

            let snapshot_id = if !no_snapshot {
                let id = db.create_snapshot("scan")?;
                if !quiet {
                    info!("created snapshot {}", id);
                }
                Some(id)
            } else {
                None
            };

            db.commit_transaction()?;

            if !quiet {
                println!(
                    "Scanned {} spheres, {} nodes, {} edges. Snapshot: {:?}",
                    spheres.len(),
                    nodes.len(),
                    edges.len(),
                    snapshot_id
                );
            }
        }

        Command::Query {
            sphere,
            kind,
            status,
            limit,
        } => {
            let db = db::WikiDb::open(&db_path)?;
            let node_kind = kind
                .as_deref()
                .and_then(|k| graph::NodeKind::from_str(k).ok());
            let node_status = status
                .as_deref()
                .and_then(|s| graph::Status::from_str(s).ok());
            let nodes = db.get_nodes(sphere.as_deref(), node_kind, node_status)?;
            let edges = db.get_edges(None, None, None)?;
            let to_show: Vec<_> = nodes.iter().take(limit.unwrap_or(100)).collect();
            println!("{} nodes total (showing {})", nodes.len(), to_show.len());
            for node in to_show {
                println!(
                    "{}\t{}\t{}\t{}\t{}",
                    node.sphere_id,
                    node.kind,
                    node.status.as_str(),
                    node.id,
                    node.name
                );
            }
            if sphere.is_none() && kind.is_none() && status.is_none() {
                println!("{} edges total", edges.len());
            }
        }

        Command::Render { output, quiet } => {
            let output_dir = resolve_path(&output);
            let db = db::WikiDb::open(&db_path)?;
            render::Renderer::render_to_dir(&db, &output_dir)?;
            if !quiet {
                println!("Rendered wiki to {}", output_dir.display());
            }
        }

        Command::Diff { from, to } => {
            let db = db::WikiDb::open(&db_path)?;
            let from_snapshot = db
                .get_snapshot_by_id(from)?
                .with_context(|| format!("snapshot {} not found", from))?;
            let to_snapshot = db
                .get_snapshot_by_id(to)?
                .with_context(|| format!("snapshot {} not found", to))?;
            println!(
                "Diff from snapshot {} ({}) to snapshot {} ({})",
                from, from_snapshot.captured_at, to, to_snapshot.captured_at
            );
            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!({
                    "from": from_snapshot,
                    "to": to_snapshot,
                }))?
            );
        }

        Command::Tag {
            node_id,
            sphere,
            status,
            owner,
        } => {
            let mut db = db::WikiDb::open(&db_path)?;
            let mut nodes = db.get_nodes(None, None, None)?;
            let node = nodes
                .iter_mut()
                .find(|n| n.id == node_id)
                .with_context(|| format!("node {} not found", node_id))?;
            if let Some(s) = sphere {
                node.sphere_id = s;
            }
            if let Some(s) = status {
                node.status = graph::Status::from_str(&s)?;
            }
            if let Some(o) = owner {
                node.owner_profile = Some(o);
            }
            db.upsert_node(node)?;
            println!("Tagged node {}", node_id);
        }

        Command::Snapshots { limit } => {
            let db = db::WikiDb::open(&db_path)?;
            let snapshots = db.get_snapshots(limit)?;
            for s in snapshots {
                println!(
                    "{}\t{}\t{}\t{}",
                    s.id,
                    s.captured_at,
                    s.trigger,
                    serde_json::to_string(&s.sphere_hashes)?
                );
            }
        }

        Command::Spheres => {
            for sphere in config::ScannerConfig::default_spheres() {
                println!("{}\t{}\t{}", sphere.id, sphere.priority, sphere.name);
            }
        }

        Command::ExportMolecule {
            output,
            sphere,
            seed,
            quiet,
        } => {
            let output_dir = resolve_path(&output);
            fs::create_dir_all(&output_dir)?;

            let db = db::WikiDb::open(&db_path)?;
            let mut export = export_xyz::export_from_db(&db)?;

            // Recompute layout with the requested seed for deterministic output
            let layout = layout_graph(&export.nodes, &export.edges, &export.spheres, seed);
            export.positions = layout.positions;

            let export = if let Some(sid) = sphere {
                let filtered_nodes: Vec<_> = export
                    .nodes
                    .into_iter()
                    .filter(|n| n.sphere_id == sid)
                    .collect();
                let retained: std::collections::HashSet<String> =
                    filtered_nodes.iter().map(|n| n.id.clone()).collect();
                let filtered_edges: Vec<_> = export
                    .edges
                    .into_iter()
                    .filter(|e| retained.contains(&e.src_id) && retained.contains(&e.dst_id))
                    .collect();
                let filtered_spheres: Vec<_> =
                    export.spheres.into_iter().filter(|s| s.id == sid).collect();
                let layout =
                    layout_graph(&filtered_nodes, &filtered_edges, &filtered_spheres, seed);
                let mut type_map = export.atom_type_map;
                type_map.retain(|(s, _), _| s == &sid);

                let node_index: std::collections::HashMap<String, usize> = filtered_nodes
                    .iter()
                    .enumerate()
                    .map(|(i, n)| (n.id.clone(), i))
                    .collect();
                let edge_pairs: Vec<(usize, usize)> = filtered_edges
                    .iter()
                    .filter_map(|e| {
                        let a = node_index.get(&e.src_id)?;
                        let b = node_index.get(&e.dst_id)?;
                        Some((*a, *b))
                    })
                    .collect();

                export_xyz::MoleculeExport {
                    nodes: filtered_nodes,
                    edges: filtered_edges,
                    spheres: filtered_spheres,
                    positions: layout.positions,
                    atom_type_map: type_map,
                    edge_pairs,
                }
            } else {
                export
            };

            let xyz_path = output_dir.join("sphere-grid.xyz");
            let data_path = output_dir.join("sphere-grid.data");
            let dump_path = output_dir.join("sphere-grid.lammpstrj");
            let meta_path = output_dir.join("sphere-grid.molecule.json");
            let labels_path = output_dir.join("sphere-grid.labels.json");

            export_xyz::write_xyz(&export, &xyz_path)?;
            export_xyz::write_data(&export, &data_path)?;
            export_xyz::write_dump(&export, &dump_path)?;
            export_xyz::write_metadata(&export, &meta_path)?;
            export_xyz::write_labels(&export, &labels_path)?;

            if !quiet {
                println!(
                    "Exported molecule to:\n  {}\n  {}\n  {}\n  {}\n  {}",
                    xyz_path.display(),
                    data_path.display(),
                    dump_path.display(),
                    meta_path.display(),
                    labels_path.display()
                );
                println!(
                    "Atoms: {}  Bonds: {}",
                    export.nodes.len(),
                    export.edge_pairs.len()
                );
            }
        }
    }

    Ok(())
}
