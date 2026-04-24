use anyhow::Result;
use pulldown_cmark::{html, Parser};
use rayon::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{debug, info};

pub struct ParsedDocument {
    pub id: String,
    pub path: PathBuf,
    pub content: String,
    pub html: String,
    pub words: usize,
    pub read_minutes: usize,
}

/// Concurrently scans a directory for markdown/text files and reads them into memory.
pub fn parse_corpus(source_dir: &Path) -> Result<Vec<ParsedDocument>> {
    info!("Scanning corpus directory: {:?}", source_dir);

    let mut files = Vec::new();
    collect_files(source_dir, &mut files)?;

    info!("Found {} compatible files. Parsing concurrently...", files.len());

    let docs: Result<Vec<ParsedDocument>, _> = files
        .into_par_iter()
        .map(|path| -> anyhow::Result<ParsedDocument> {
            debug!("Parsing {:?}", path);
            let content = fs::read_to_string(&path)?;

            // Render Markdown to HTML via pulldown-cmark
            let parser = Parser::new(&content);
            let mut html_output = String::new();
            html::push_html(&mut html_output, parser);

            // Compute reading metrics
            let words = content.split_whitespace().count();
            let read_minutes = std::cmp::max(1, words / 220);

            // Generate an ID slug from the filename
            let file_stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            let id = file_stem
                .to_lowercase()
                .replace(|c: char| !c.is_alphanumeric(), "-");

            Ok(ParsedDocument {
                id,
                path,
                content,
                html: html_output,
                words,
                read_minutes,
            })
        })
        .collect();

    let docs = docs?;
    info!("Successfully parsed and compiled {} documents.", docs.len());

    Ok(docs)
}

fn collect_files(dir: &Path, files: &mut Vec<PathBuf>) -> Result<()> {
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            // Skip hidden directories (like .git)
            if let Some(file_name) = path.file_name() {
                if file_name.to_string_lossy().starts_with('.') {
                    continue;
                }
            }

            if path.is_dir() {
                collect_files(&path, files)?;
            } else if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if ext_str == "md" || ext_str == "markdown" || ext_str == "txt" || ext_str == "bib" {
                    files.push(path);
                }
            }
        }
    } else {
        files.push(dir.to_path_buf());
    }

    Ok(())
}
