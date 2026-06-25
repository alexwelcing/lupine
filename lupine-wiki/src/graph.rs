use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Sphere {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub priority: i64,
}

impl Sphere {
    pub fn new(id: &str, name: &str, description: &str, color: &str, priority: i64) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            color: color.to_string(),
            priority,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Node {
    pub id: String,
    pub sphere_id: String,
    pub kind: NodeKind,
    pub name: String,
    pub uri: Option<String>,
    pub config_hash: Option<String>,
    pub content: Option<String>,
    pub status: Status,
    pub provenance: Provenance,
    pub owner_profile: Option<String>,
    pub updated_at: Option<String>,
}

impl Node {
    pub fn stable_id(sphere_id: &str, kind: NodeKind, uri: &str) -> String {
        format!("{}://{}/{}", sphere_id, kind.as_str(), uri)
    }

    /// Derive a short description from node content or uri when available.
    /// Used by the export pipeline to populate label descriptions.
    pub fn description(&self) -> Option<String> {
        self.content
            .as_ref()
            .and_then(|c| {
                if c.starts_with('{') {
                    let parsed = serde_json::from_str::<serde_json::Value>(c).ok();
                    parsed
                        .as_ref()
                        .and_then(|v| {
                            v.get("description")
                                .and_then(|d| d.as_str())
                                .map(String::from)
                        })
                        .or_else(|| {
                            parsed.as_ref().and_then(|v| {
                                v.get("name").and_then(|d| d.as_str()).map(String::from)
                            })
                        })
                } else if c.len() > 200 {
                    Some(format!("{}…", &c[..200]))
                } else {
                    Some(c.clone())
                }
            })
            .or_else(|| self.uri.clone())
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    Repo,
    Skill,
    Plugin,
    McpServer,
    Config,
    CronJob,
    KanbanTask,
    Claim,
    Task,
    Beat,
    Binary,
    Doc,
    Project,
    D1Table,
    ModelProvider,
    ApiCredential,
    Directory,
    File,
    Sphere,
    Unknown,
}

impl NodeKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            NodeKind::Repo => "repo",
            NodeKind::Skill => "skill",
            NodeKind::Plugin => "plugin",
            NodeKind::McpServer => "mcp_server",
            NodeKind::Config => "config",
            NodeKind::CronJob => "cron_job",
            NodeKind::KanbanTask => "kanban_task",
            NodeKind::Claim => "claim",
            NodeKind::Task => "task",
            NodeKind::Beat => "beat",
            NodeKind::Binary => "binary",
            NodeKind::Doc => "doc",
            NodeKind::Project => "project",
            NodeKind::D1Table => "d1_table",
            NodeKind::ModelProvider => "model_provider",
            NodeKind::ApiCredential => "api_credential",
            NodeKind::Directory => "directory",
            NodeKind::File => "file",
            NodeKind::Sphere => "sphere",
            NodeKind::Unknown => "unknown",
        }
    }
}

impl fmt::Display for NodeKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl FromStr for NodeKind {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "repo" => Ok(NodeKind::Repo),
            "skill" => Ok(NodeKind::Skill),
            "plugin" => Ok(NodeKind::Plugin),
            "mcp_server" => Ok(NodeKind::McpServer),
            "config" => Ok(NodeKind::Config),
            "cron_job" => Ok(NodeKind::CronJob),
            "kanban_task" => Ok(NodeKind::KanbanTask),
            "claim" => Ok(NodeKind::Claim),
            "task" => Ok(NodeKind::Task),
            "beat" => Ok(NodeKind::Beat),
            "binary" => Ok(NodeKind::Binary),
            "doc" => Ok(NodeKind::Doc),
            "project" => Ok(NodeKind::Project),
            "d1_table" => Ok(NodeKind::D1Table),
            "model_provider" => Ok(NodeKind::ModelProvider),
            "api_credential" => Ok(NodeKind::ApiCredential),
            "directory" => Ok(NodeKind::Directory),
            "file" => Ok(NodeKind::File),
            "sphere" => Ok(NodeKind::Sphere),
            "unknown" => Ok(NodeKind::Unknown),
            _ => Err(anyhow::anyhow!("unknown node kind: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Active,
    Stale,
    Blocked,
    Done,
    Seed,
    Draft,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Active => "active",
            Status::Stale => "stale",
            Status::Blocked => "blocked",
            Status::Done => "done",
            Status::Seed => "seed",
            Status::Draft => "draft",
        }
    }
}

impl FromStr for Status {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "active" => Ok(Status::Active),
            "stale" => Ok(Status::Stale),
            "blocked" => Ok(Status::Blocked),
            "done" => Ok(Status::Done),
            "seed" => Ok(Status::Seed),
            "draft" => Ok(Status::Draft),
            _ => Err(anyhow::anyhow!("unknown status: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Provenance {
    Declared,
    Scanned,
    Inferred,
}

impl Provenance {
    pub fn as_str(&self) -> &'static str {
        match self {
            Provenance::Declared => "declared",
            Provenance::Scanned => "scanned",
            Provenance::Inferred => "inferred",
        }
    }
}

impl FromStr for Provenance {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "declared" => Ok(Provenance::Declared),
            "scanned" => Ok(Provenance::Scanned),
            "inferred" => Ok(Provenance::Inferred),
            _ => Err(anyhow::anyhow!("unknown provenance: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Edge {
    pub id: String,
    pub src_id: String,
    pub dst_id: String,
    pub kind: EdgeKind,
    pub provenance: Provenance,
    pub metadata: Option<String>,
    pub updated_at: Option<String>,
}

impl Edge {
    pub fn stable_id(src_id: &str, dst_id: &str, kind: EdgeKind) -> String {
        format!("{}|{}|{}", src_id, kind.as_str(), dst_id)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EdgeKind {
    DependsOn,
    Configures,
    Invokes,
    Produces,
    Consumes,
    Schedules,
    BelongsTo,
    Evidences,
    Critiques,
    Documents,
}

impl EdgeKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            EdgeKind::DependsOn => "depends_on",
            EdgeKind::Configures => "configures",
            EdgeKind::Invokes => "invokes",
            EdgeKind::Produces => "produces",
            EdgeKind::Consumes => "consumes",
            EdgeKind::Schedules => "schedules",
            EdgeKind::BelongsTo => "belongs_to",
            EdgeKind::Evidences => "evidences",
            EdgeKind::Critiques => "critiques",
            EdgeKind::Documents => "documents",
        }
    }
}

impl FromStr for EdgeKind {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "depends_on" => Ok(EdgeKind::DependsOn),
            "configures" => Ok(EdgeKind::Configures),
            "invokes" => Ok(EdgeKind::Invokes),
            "produces" => Ok(EdgeKind::Produces),
            "consumes" => Ok(EdgeKind::Consumes),
            "schedules" => Ok(EdgeKind::Schedules),
            "belongs_to" => Ok(EdgeKind::BelongsTo),
            "evidences" => Ok(EdgeKind::Evidences),
            "critiques" => Ok(EdgeKind::Critiques),
            "documents" => Ok(EdgeKind::Documents),
            _ => Err(anyhow::anyhow!("unknown edge kind: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Snapshot {
    pub id: i64,
    pub captured_at: chrono::DateTime<chrono::Utc>,
    pub trigger: String,
    pub sphere_hashes: serde_json::Value,
}
