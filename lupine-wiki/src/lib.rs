//! Lupine Wiki — sphere-grid knowledge base for the Lupine + Hermes ecosystem.
//!
//! This crate provides the graph model, SQLite persistence, project scanner,
//! static HTML renderer, and molecular-export pipeline used by the
//! `lupine-wiki` CLI. It can also be embedded as a library for custom wiki
//! workflows, knowledge-graph analysis, or integration with other Lupine tools.

pub mod config;
pub mod db;
pub mod export_xyz;
pub mod graph;
pub mod layout;
pub mod render;
pub mod scanner;

pub use config::{ScannerConfig, SphereConfig};
pub use db::WikiDb;
pub use export_xyz::{MoleculeExport, export_from_db};
pub use graph::{Edge, EdgeKind, Node, NodeKind, Provenance, Snapshot, Sphere, Status};
pub use layout::{LayoutResult, layout_graph};
pub use render::Renderer;
pub use scanner::{ScanResult, Scanner};
