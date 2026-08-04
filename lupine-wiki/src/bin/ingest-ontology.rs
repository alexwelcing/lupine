use anyhow::{Context, Result};
use clap::Parser;
use lupine_wiki::{WikiDb, ingest_ontology};
use std::path::PathBuf;

#[derive(Debug, Parser)]
#[command(
    name = "ingest-ontology",
    about = "Ingest the canonical Lupine ontology into the lupine-research sphere"
)]
struct Cli {
    #[arg(long)]
    db: PathBuf,

    #[arg(long)]
    ontology: PathBuf,

    #[arg(long)]
    provenance: PathBuf,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let mut db = WikiDb::open(&cli.db)
        .with_context(|| format!("open isolated wiki database: {}", cli.db.display()))?;
    let report = ingest_ontology(&mut db, &cli.ontology, &cli.provenance)?;
    println!(
        "Ingested lupine-research: {} nodes, {} edges, source sha256 {}",
        report.nodes_upserted, report.edges_upserted, report.source_sha256
    );
    Ok(())
}
