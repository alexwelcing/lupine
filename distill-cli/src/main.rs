mod extractor;
mod ontology;
mod parser;

use anyhow::Result;
use clap::{Parser, Subcommand};
use std::fs;
use std::path::PathBuf;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use extractor::Extractor;
use ontology::Ontology;

#[derive(Parser)]
#[command(name = "distill")]
#[command(about = "A high-performance, strictly-typed knowledge distillation engine", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Extract knowledge from a source corpus using a defined ontology
    Extract {
        /// Path to the ontology schema file (e.g., ontology.toml)
        #[arg(short, long)]
        ontology: PathBuf,

        /// Path to the source corpus directory or file
        #[arg(short, long)]
        source: PathBuf,

        /// Path to output the compiled library.json manifest
        #[arg(short, long, default_value = "./dist")]
        output: PathBuf,

        /// Max concurrent API connections
        #[arg(short, long, default_value_t = 10)]
        concurrency: usize,
    },
    /// Initialize a new distillation project with a default ontology
    Init {
        /// Path to initialize the project in
        #[arg(default_value = ".")]
        path: PathBuf,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing (logging)
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("setting default subscriber failed");

    let cli = Cli::parse();

    match &cli.command {
        Commands::Extract {
            ontology,
            source,
            output,
            concurrency,
        } => {
            info!("Starting extraction process...");

            // 1. Load the dynamic ontology
            let schema = Ontology::load(ontology)?;
            info!("Loaded ontology: '{}'", schema.schema.name);
            info!("Configured for {} entities", schema.entities.len());

            // 2. Parse the source directory into memory concurrently
            let docs = parser::parse_corpus(source)?;
            let total_bytes: usize = docs.iter().map(|d| d.content.len()).sum();
            info!(
                "Corpus loaded into memory: {} bytes across {} files",
                total_bytes,
                docs.len()
            );

            // 3. Ensure output directory exists
            if !output.exists() {
                fs::create_dir_all(output)?;
            }

            // 4. Initialize and run the concurrent LLM extraction pool
            let extractor = Extractor::new(&schema)?;
            let results = extractor.extract_corpus(docs, *concurrency).await?;

            // 5. Construct the final SKP library.json manifest
            let output_file = output.join("library.json");
            let final_payload = serde_json::json!({
                "version": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs().to_string(),
                "generatedAt": chrono::Utc::now().to_rfc3339(),
                "ontology": {
                    "name": schema.schema.name,
                    "description": schema.schema.description,
                },
                "categories": schema.categories,
                "articles": results
            });
            let final_json = serde_json::to_string_pretty(&final_payload)?;
            fs::write(&output_file, final_json)?;

            info!("Successfully wrote distilled graph to {:?}", output_file);
        }
        Commands::Init { path } => {
            info!("Initializing new distillation project at {:?}", path);
            if !path.exists() {
                fs::create_dir_all(path)?;
            }
            let default_ontology = r#"[schema]
name = "My Knowledge Base"
description = "A generic knowledge graph schema"

[[categories]]
id = "general"
label = "General Notes"
blurb = "Uncategorized but extracted knowledge notes."

[[categories]]
id = "research"
label = "Research Papers"
blurb = "Formal papers and technical reports."

[[entities]]
name = "Concept"
description = "A core idea or principle"
fields = [
    { name = "tags", type = "string[]", description = "Keywords associated with this concept" },
    { name = "confidence", type = "enum", options = ["high", "medium", "low"], description = "Confidence level" }
]
"#;
            let ontology_path = path.join("ontology.toml");
            fs::write(&ontology_path, default_ontology)?;
            info!("Created default ontology at {:?}", ontology_path);
        }
    }

    Ok(())
}
