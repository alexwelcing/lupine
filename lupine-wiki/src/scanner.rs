use crate::config::{RootConfig, ScannerConfig, SphereConfig};
use crate::graph::{Edge, EdgeKind, Node, NodeKind, Provenance, Sphere, Status};
use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use std::str::FromStr;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct ScanResult {
    pub spheres: Vec<Sphere>,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

pub struct Scanner {
    config: ScannerConfig,
    project_root: PathBuf,
}

impl Scanner {
    pub fn new(config: ScannerConfig, project_root: impl AsRef<Path>) -> Self {
        Self {
            config,
            project_root: project_root.as_ref().to_path_buf(),
        }
    }

    pub fn scan(&self) -> Result<ScanResult> {
        let mut spheres = Vec::new();
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        // Always seed the default spheres first so the graph has a baseline.
        for sphere in ScannerConfig::default_spheres() {
            spheres.push(sphere.clone());
            nodes.push(Node {
                id: Node::stable_id(&sphere.id, NodeKind::Sphere, &sphere.id),
                sphere_id: sphere.id.clone(),
                kind: NodeKind::Sphere,
                name: sphere.name.clone(),
                uri: None,
                config_hash: None,
                content: Some(serde_json::to_string(&sphere)?),
                status: Status::Active,
                provenance: Provenance::Declared,
                owner_profile: None,
                updated_at: None,
            });
        }

        // Merge user-configured sphere metadata (name/description/color/priority)
        let mut sphere_meta: HashMap<String, SphereConfig> = HashMap::new();
        for (id, cfg) in &self.config.spheres {
            sphere_meta.insert(id.clone(), cfg.clone());
        }

        // Apply user overrides to default spheres
        for sphere in &mut spheres {
            if let Some(cfg) = sphere_meta.get(&sphere.id) {
                if !cfg.name.is_empty() {
                    sphere.name = cfg.name.clone();
                }
                if !cfg.description.is_empty() {
                    sphere.description = cfg.description.clone();
                }
                if !cfg.color.is_empty() {
                    sphere.color = cfg.color.clone();
                }
                sphere.priority = cfg.priority;
            }
        }

        // Rebuild sphere nodes with possibly overridden metadata
        nodes.retain(|n| n.kind != NodeKind::Sphere);
        for sphere in &spheres {
            nodes.push(Node {
                id: Node::stable_id(&sphere.id, NodeKind::Sphere, &sphere.id),
                sphere_id: sphere.id.clone(),
                kind: NodeKind::Sphere,
                name: sphere.name.clone(),
                uri: None,
                config_hash: None,
                content: Some(serde_json::to_string(&sphere)?),
                status: Status::Active,
                provenance: Provenance::Declared,
                owner_profile: None,
                updated_at: None,
            });
        }

        // Scan each configured sphere
        for (sphere_id, sphere_cfg) in &self.config.spheres {
            let mut seen_ids = HashSet::new();
            let mut sphere_nodes = Vec::new();
            let mut sphere_edges = Vec::new();

            for root in &sphere_cfg.roots {
                let (root_nodes, mut root_edges) = self.scan_root(sphere_id, root)?;
                for node in root_nodes {
                    seen_ids.insert(node.id.clone());
                    sphere_nodes.push(node);
                }
                sphere_edges.append(&mut root_edges);
            }

            // Add belongs_to edges from each non-sphere node to its sphere node
            let sphere_node_id = Node::stable_id(sphere_id, NodeKind::Sphere, sphere_id);
            for node in &sphere_nodes {
                if node.kind == NodeKind::Sphere {
                    continue;
                }
                let edge_id = Edge::stable_id(&node.id, &sphere_node_id, EdgeKind::BelongsTo);
                if !seen_ids.contains(&edge_id) {
                    sphere_edges.push(Edge {
                        id: edge_id.clone(),
                        src_id: node.id.clone(),
                        dst_id: sphere_node_id.clone(),
                        kind: EdgeKind::BelongsTo,
                        provenance: Provenance::Inferred,
                        metadata: None,
                        updated_at: None,
                    });
                    seen_ids.insert(edge_id);
                }
            }

            nodes.append(&mut sphere_nodes);
            edges.append(&mut sphere_edges);
        }

        // Declared edges from config
        for (_sphere_id, sphere_cfg) in &self.config.spheres {
            for rule in &sphere_cfg.edges {
                // For now, only support node:// refs in declared rules.
                if let (Some(src), Some(dst)) = (parse_node_ref(&rule.from_pattern), parse_node_ref(&rule.to)) {
                    let kind = EdgeKind::from_str(&rule.kind).unwrap_or(EdgeKind::DependsOn);
                    let provenance = rule
                        .provenance
                        .as_deref()
                        .and_then(|p| Provenance::from_str(p).ok())
                        .unwrap_or(Provenance::Declared);
                    edges.push(Edge {
                        id: Edge::stable_id(&src, &dst, kind),
                        src_id: src,
                        dst_id: dst,
                        kind,
                        provenance,
                        metadata: None,
                        updated_at: None,
                    });
                }
            }
        }

        Ok(ScanResult { spheres, nodes, edges })
    }

    fn scan_root(&self, sphere_id: &str, root: &RootConfig) -> Result<(Vec<Node>, Vec<Edge>)> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        let root_path = expand_tilde(&root.path);
        let root_path = if root_path.is_absolute() {
            root_path
        } else {
            self.project_root.join(&root_path)
        };

        if !root_path.exists() {
            tracing::warn!("scan root does not exist: {}", root_path.display());
            return Ok((nodes, edges));
        }

        let root_kind = NodeKind::from_str(&root.kind).unwrap_or(NodeKind::File);

        // Add the root itself as a node
        let root_uri = root_path.to_string_lossy().to_string();
        let root_id = Node::stable_id(sphere_id, root_kind, &root_uri);
        let root_name = root
            .name
            .clone()
            .unwrap_or_else(|| root_path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| root.path.clone()));
        let root_hash = if root_path.is_file() {
            Some(hash_file(&root_path)?)
        } else {
            None
        };
        nodes.push(Node {
            id: root_id.clone(),
            sphere_id: sphere_id.to_string(),
            kind: root_kind,
            name: root_name,
            uri: Some(root_uri),
            config_hash: root_hash,
            content: None,
            status: Status::Active,
            provenance: Provenance::Scanned,
            owner_profile: None,
            updated_at: None,
        });

        if !root.recursive && root_path.is_dir() {
            // Only list immediate children
            for entry in std::fs::read_dir(&root_path)? {
                let entry = entry?;
                let path = entry.path();
                if should_ignore(&path, &root.ignore_patterns) {
                    continue;
                }
                if path.is_file() && root.include_files {
                    nodes.push(self.path_to_node(sphere_id, &path, NodeKind::File, &root_id)?);
                } else if path.is_dir() && root.include_dirs {
                    nodes.push(self.path_to_node(sphere_id, &path, NodeKind::Directory, &root_id)?);
                }
            }
        } else if root.recursive && root_path.is_dir() {
            let mut walker = WalkDir::new(&root_path);
            if let Some(d) = root.max_depth {
                walker = walker.max_depth(d);
            }
            for entry in walker {
                let entry = entry?;
                let path = entry.path();
                if path == root_path {
                    continue;
                }
                if should_ignore(&path, &root.ignore_patterns) {
                    continue;
                }
                let _depth = entry.depth();
                let kind = if path.is_file() {
                    if !root.include_files {
                        continue;
                    }
                    NodeKind::File
                } else if path.is_dir() {
                    if !root.include_dirs {
                        continue;
                    }
                    NodeKind::Directory
                } else {
                    continue;
                };

                let node = self.path_to_node(sphere_id, path, kind, &root_id)?;
                // Add parent edge for directories/files to their parent directory.
                // If the parent is the scan root, link to the root node instead of a
                // non-existent directory node.
                if let Some(parent) = path.parent() {
                    let parent_id = if parent == root_path {
                        root_id.clone()
                    } else {
                        let parent_uri = parent.to_string_lossy().to_string();
                        Node::stable_id(sphere_id, NodeKind::Directory, &parent_uri)
                    };
                    if parent_id != node.id {
                        edges.push(Edge {
                            id: Edge::stable_id(&node.id, &parent_id, EdgeKind::BelongsTo),
                            src_id: node.id.clone(),
                            dst_id: parent_id,
                            kind: EdgeKind::BelongsTo,
                            provenance: Provenance::Inferred,
                            metadata: None,
                            updated_at: None,
                        });
                    }
                }
                nodes.push(node);
            }
        }

        Ok((nodes, edges))
    }

    fn path_to_node(&self, sphere_id: &str, path: &Path, kind: NodeKind, _root_id: &str) -> Result<Node> {
        let uri = path.to_string_lossy().to_string();
        let name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| uri.clone());
        let config_hash = if path.is_file() {
            Some(hash_file(path)?)
        } else {
            None
        };
        Ok(Node {
            id: Node::stable_id(sphere_id, kind, &uri),
            sphere_id: sphere_id.to_string(),
            kind,
            name,
            uri: Some(uri),
            config_hash,
            content: None,
            status: Status::Active,
            provenance: Provenance::Scanned,
            owner_profile: None,
            updated_at: None,
        })
    }
}

const MAX_HASH_BYTES: u64 = 5 * 1024 * 1024; // 5 MiB

fn hash_file(path: &Path) -> Result<String> {
    let metadata = std::fs::metadata(path).with_context(|| format!("read metadata for hashing: {}", path.display()))?;
    if metadata.len() > MAX_HASH_BYTES {
        // For large files, hash size + mtime so drift detection still works for changes
        // without reading the whole file.
        let mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let input = format!("{}:{}", metadata.len(), mtime);
        let digest = Sha256::digest(input.as_bytes());
        return Ok(format!("meta:{}", hex::encode(digest)));
    }
    let bytes = std::fs::read(path).with_context(|| format!("read file for hashing: {}", path.display()))?;
    let digest = Sha256::digest(&bytes);
    Ok(hex::encode(digest))
}

fn expand_tilde(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        dirs::home_dir()
            .map(|h| h.join(rest))
            .unwrap_or_else(|| PathBuf::from(path))
    } else {
        PathBuf::from(path)
    }
}

const SKIP_EXTENSIONS: &[&str] = &[
    "pyc", "pyo", "pyd", "so", "dylib", "dll", "exe", "bin", "o", "a",
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg",
    "mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "ogg", "flac",
    "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
    "ttf", "otf", "woff", "woff2", "eot",
    "db-shm", "db-wal",
];

fn should_ignore(path: &Path, patterns: &[String]) -> bool {
    let default_ignores = [".git", "node_modules", "target", "__pycache__", ".venv", "venv", ".idea", ".vscode"];
    let all_patterns: Vec<_> = default_ignores.iter().map(|s| s.to_string()).chain(patterns.iter().cloned()).collect();

    for component in path.components() {
        let name = component.as_os_str().to_string_lossy().to_string();
        for pattern in &all_patterns {
            if name.contains(pattern) {
                return true;
            }
        }
    }

    if path.is_file() {
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            let ext_lower = ext.to_lowercase();
            if SKIP_EXTENSIONS.contains(&ext_lower.as_str()) {
                return true;
            }
        }
    }

    false
}

fn parse_node_ref(s: &str) -> Option<String> {
    if let Some(stripped) = s.strip_prefix("node://") {
        Some(stripped.to_string())
    } else {
        None
    }
}
