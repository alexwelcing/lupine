//! Parse the curated 60-paper research corpus from markdown tables.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// A published paper from the curated corpus.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paper {
    pub id: String,
    pub year: u16,
    pub title: String,
    pub doi: Option<String>,
    pub arxiv: Option<String>,
    pub tags: Vec<String>,
    pub scale: Option<String>,
    pub pain_points: String,
}

impl Paper {
    /// Check if this paper has a specific method tag.
    pub fn has_tag(&self, tag: &str) -> bool {
        let tag_lower = tag.to_lowercase();
        self.tags.iter().any(|t| t.to_lowercase() == tag_lower)
    }

    /// Get the best identifier for fetching (DOI preferred, then arXiv).
    pub fn best_id(&self) -> Option<&str> {
        self.doi.as_deref().or(self.arxiv.as_deref())
    }
}

/// Parse the markdown publications table from the corpus file.
///
/// Expected format: pipe-delimited table with columns:
/// | ID | Year | Title | DOI / arXiv | Tags | Scale | Pain points | Source |
pub fn parse_corpus(markdown: &str) -> Vec<Paper> {
    let mut papers = Vec::new();
    let mut in_table = false;
    let mut header_skipped = false;

    for line in markdown.lines() {
        let line = line.trim();

        // Detect table start: line starting with "| P" or "| ID"
        if !in_table {
            if line.starts_with("| ID ") || line.starts_with("| P0") {
                in_table = true;
                if line.starts_with("| ID ") {
                    continue; // skip header row
                }
            }
            if !in_table {
                continue;
            }
        }

        // Skip separator row (|---|---|...)
        if line.starts_with("|---") || line.starts_with("| ---") {
            header_skipped = true;
            continue;
        }

        if !header_skipped && line.starts_with("| ID") {
            header_skipped = true;
            continue;
        }

        // End of table
        if !line.starts_with('|') || line.is_empty() {
            if in_table && !papers.is_empty() {
                // Might be a break between tables, keep scanning
                in_table = false;
                header_skipped = false;
            }
            continue;
        }

        // Parse a data row
        let cells: Vec<&str> = line
            .split('|')
            .map(|c| c.trim())
            .filter(|c| !c.is_empty())
            .collect();

        if cells.len() < 6 {
            continue;
        }

        let id = cells[0].to_string();
        if !id.starts_with('P') {
            continue;
        }

        let year = cells[1].trim().parse::<u16>().unwrap_or(2025);

        let title = cells[2].to_string();

        // Parse DOI/arXiv from cell 3
        let id_field = cells[3];
        let doi = extract_doi(id_field);
        let arxiv = extract_arxiv(id_field);

        // Tags from cell 4
        let tags: Vec<String> = cells[4]
            .split(';')
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty())
            .collect();

        // Scale from cell 5
        let scale_str = cells[5].trim();
        let scale = if scale_str == "unspecified" || scale_str.is_empty() {
            None
        } else {
            Some(scale_str.to_string())
        };

        // Pain points from cell 6 (if present)
        let pain_points = cells.get(6).map(|s| s.to_string()).unwrap_or_default();

        papers.push(Paper {
            id,
            year,
            title,
            doi,
            arxiv,
            tags,
            scale,
            pain_points,
        });
    }

    papers
}

/// Parse a corpus from a file path.
pub fn parse_corpus_file(path: &Path) -> Result<Vec<Paper>> {
    let content = std::fs::read_to_string(path)?;
    let papers = parse_corpus(&content);
    if papers.is_empty() {
        anyhow::bail!("No papers found in {}", path.display());
    }
    Ok(papers)
}

/// Extract a DOI from a text field.
fn extract_doi(text: &str) -> Option<String> {
    // Match patterns like 10.xxxx/yyyy
    let re = regex::Regex::new(r"10\.\d{4,}/[^\s|,]+").ok()?;
    re.find(text).map(|m| m.as_str().to_string())
}

/// Extract an arXiv ID from a text field.
fn extract_arxiv(text: &str) -> Option<String> {
    // Match patterns like arXiv:XXXX.XXXXX or just XXXX.XXXXX
    let re = regex::Regex::new(r"(?:arXiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)").ok()?;
    re.captures(text).map(|c| c[1].to_string())
}

/// Group papers by tag.
pub fn group_by_tag(papers: &[Paper]) -> std::collections::HashMap<String, Vec<&Paper>> {
    let mut groups: std::collections::HashMap<String, Vec<&Paper>> =
        std::collections::HashMap::new();
    for paper in papers {
        for tag in &paper.tags {
            groups.entry(tag.clone()).or_default().push(paper);
        }
    }
    groups
}

/// Tag frequency count.
pub fn tag_frequency(papers: &[Paper]) -> Vec<(String, usize)> {
    let groups = group_by_tag(papers);
    let mut freq: Vec<(String, usize)> = groups.into_iter().map(|(k, v)| (k, v.len())).collect();
    freq.sort_by_key(|b| std::cmp::Reverse(b.1));
    freq
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_TABLE: &str = r#"
### Publications table

| ID | Year | Title | DOI / arXiv / ID | Tags (methods/stack) | Scale (atoms/timesteps) | Explicit pain points noted | Source |
|---|---:|---|---|---|---|---|---|
| P01 | 2025 | LAMMPS‑KOKKOS Performance | arXiv:2508.13523 | KOKKOS; GPU; HPC; SNAP | unspecified | Hardware heterogeneity | cite1 |
| P02 | 2025 | LAMMPS‑KOKKOS ACM | 10.1145/3731599.3767498 | KOKKOS; GPU; HPC | unspecified | Performance portability | cite2 |
| P03 | 2026 | fix pimd/langevin | arXiv:2602.13553 | PIMD; DeePMD; GPU; HPC | 128–1024 H₂O molecules | i‑PI comparison | cite3 |
"#;

    #[test]
    fn test_parse_corpus() {
        let papers = parse_corpus(SAMPLE_TABLE);
        assert_eq!(papers.len(), 3);
        assert_eq!(papers[0].id, "P01");
        assert_eq!(papers[0].year, 2025);
        assert!(papers[0].arxiv.is_some());
        assert_eq!(papers[0].arxiv.as_deref(), Some("2508.13523"));
        assert!(papers[0].has_tag("KOKKOS"));
        assert!(papers[0].has_tag("gpu"));
        assert!(papers[0].scale.is_none()); // "unspecified"
    }

    #[test]
    fn test_parse_doi() {
        let papers = parse_corpus(SAMPLE_TABLE);
        assert_eq!(papers[1].doi.as_deref(), Some("10.1145/3731599.3767498"));
    }

    #[test]
    fn test_parse_scale() {
        let papers = parse_corpus(SAMPLE_TABLE);
        assert!(papers[2].scale.is_some());
        assert!(papers[2].scale.as_deref().unwrap().contains("1024"));
    }

    #[test]
    fn test_tag_frequency() {
        let papers = parse_corpus(SAMPLE_TABLE);
        let freq = tag_frequency(&papers);
        // GPU and HPC should appear in all 3
        let gpu_count = freq.iter().find(|(t, _)| t == "GPU").map(|(_, c)| *c);
        assert_eq!(gpu_count, Some(3));
    }

    #[test]
    fn test_extract_doi() {
        assert_eq!(
            extract_doi("10.1038/s41524-026-01982-6"),
            Some("10.1038/s41524-026-01982-6".to_string())
        );
        assert_eq!(extract_doi("arXiv:2508.13523"), None);
    }

    #[test]
    fn test_extract_arxiv() {
        assert_eq!(
            extract_arxiv("arXiv:2508.13523"),
            Some("2508.13523".to_string())
        );
        assert_eq!(extract_arxiv("2602.13553"), Some("2602.13553".to_string()));
    }
}
