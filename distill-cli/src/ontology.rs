use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use anyhow::{Context, Result};

/// The top-level configuration that defines what the engine should extract
#[derive(Debug, Serialize, Deserialize)]
pub struct Ontology {
    pub schema: SchemaMeta,
    #[serde(default)]
    pub categories: Vec<CategoryDef>,
    #[serde(default)]
    pub entities: Vec<EntityDef>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryDef {
    pub id: String,
    pub label: String,
    pub blurb: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaMeta {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EntityDef {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub fields: Vec<FieldDef>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FieldDef {
    pub name: String,
    /// Type of the field, e.g., "string", "string[]", "enum"
    #[serde(rename = "type")]
    pub field_type: String,
    pub description: String,
    /// Options if field_type is "enum"
    #[serde(default)]
    pub options: Vec<String>,
}

impl Ontology {
    /// Loads an ontology from a TOML file
    pub fn load(path: &Path) -> Result<Self> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read ontology file at {:?}", path))?;
        let ontology: Ontology = toml::from_str(&content)
            .with_context(|| format!("Failed to parse ontology TOML in {:?}", path))?;
        Ok(ontology)
    }

    /// Converts the ontology into a JSON schema string suitable for prompting LLMs
    pub fn to_json_schema(&self) -> Result<String> {
        // Here we will eventually map the Rust structs into a valid JSON Schema (Draft 7+)
        // For now, we return a serialized version of the definition itself as a placeholder.
        let json = serde_json::to_string_pretty(&self)?;
        Ok(json)
    }
}
