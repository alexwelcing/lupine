use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ScannerConfig {
    pub spheres: BTreeMap<String, SphereConfig>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SphereConfig {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default)]
    pub priority: i64,
    #[serde(default)]
    pub roots: Vec<RootConfig>,
    #[serde(default)]
    pub edges: Vec<EdgeRuleConfig>,
}

fn default_color() -> String {
    "#94a3b8".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RootConfig {
    pub path: String,
    #[serde(default = "default_root_kind")]
    pub kind: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub recursive: bool,
    #[serde(default = "default_true")]
    pub include_files: bool,
    #[serde(default = "default_true")]
    pub include_dirs: bool,
    #[serde(default)]
    pub max_depth: Option<usize>,
    #[serde(default)]
    pub ignore_patterns: Vec<String>,
}

fn default_root_kind() -> String {
    "file".to_string()
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeRuleConfig {
    pub kind: String,
    #[serde(rename = "from")]
    pub from_pattern: String,
    pub to: String,
    #[serde(default)]
    pub provenance: Option<String>,
}

impl ScannerConfig {
    pub fn from_file<P: AsRef<Path>>(path: P) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: ScannerConfig = serde_yaml::from_str(&content)?;
        Ok(config)
    }

    pub fn default_spheres() -> Vec<crate::graph::Sphere> {
        vec![
            crate::graph::Sphere::new(
                "hermes-core",
                "Hermes Core",
                "Hermes agent runtime: config, state, memory, bundled plugins and skills.",
                "#6366f1",
                100,
            ),
            crate::graph::Sphere::new(
                "hermes-local-extensions",
                "Hermes Local Extensions",
                "User-local Hermes additions: plugins, skills, MCP servers, cron jobs, kanban.",
                "#8b5cf6",
                90,
            ),
            crate::graph::Sphere::new(
                "lupine-science",
                "Lupine Science",
                "MLIP flywheel: glim-think, lean-spec, atlas, python, cocoindex, hermes-hive.",
                "#10b981",
                80,
            ),
            crate::graph::Sphere::new(
                "lupine-research",
                "Lupine Research",
                "Ontologies, research claims, acceptance tests, discovery chains, and time gates.",
                "#84cc16",
                75,
            ),
            crate::graph::Sphere::new(
                "lupine-ledger",
                "Lupine Ledger",
                "Evidence, claims, D1 tables, knowledge graph, bibliography.",
                "#f59e0b",
                70,
            ),
            crate::graph::Sphere::new(
                "lupine-media",
                "Lupine Media",
                "Movie-making seed: lupine-media, brand docs, sample projects.",
                "#ec4899",
                60,
            ),
            crate::graph::Sphere::new(
                "lupine-public",
                "Lupine Public",
                "Public-facing site, funding reports, publications.",
                "#06b6d4",
                50,
            ),
        ]
    }
}
