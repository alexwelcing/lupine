//! Fetch paper content from CrossRef and arXiv APIs.
//!
//! Hardened with:
//! - Configurable timeouts (10s connect, 30s read)
//! - Exponential backoff retry (3 attempts)
//! - Disk-based caching (avoids re-fetching)
//! - Graceful degradation (partial results on failure)

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;

/// Fetched paper content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperContent {
    pub paper_id: String,
    pub title: String,
    pub abstract_text: String,
    pub authors: Vec<String>,
    pub journal: String,
    pub year: u16,
    pub cited_by: Option<u32>,
    pub source: String,
}

/// Configuration for the fetch system.
pub struct FetchConfig {
    /// Directory for caching fetched papers
    pub cache_dir: PathBuf,
    /// HTTP connect timeout
    pub connect_timeout: Duration,
    /// HTTP read timeout
    pub read_timeout: Duration,
    /// Max retry attempts per request
    pub max_retries: u32,
    /// Delay between requests (rate limiting)
    pub rate_limit_ms: u64,
}

impl Default for FetchConfig {
    fn default() -> Self {
        Self {
            cache_dir: PathBuf::from(".atlas-cache"),
            connect_timeout: Duration::from_secs(10),
            read_timeout: Duration::from_secs(30),
            max_retries: 3,
            rate_limit_ms: 1000, // 1 request per second
        }
    }
}

impl FetchConfig {
    /// Create a configured ureq agent with timeouts.
    fn agent(&self) -> ureq::Agent {
        ureq::AgentBuilder::new()
            .timeout_connect(self.connect_timeout)
            .timeout_read(self.read_timeout)
            .timeout_write(Duration::from_secs(10))
            .user_agent("atlas-distill/0.2 (mailto:research@atlas.dev)")
            .build()
    }

    /// Ensure cache directory exists.
    fn ensure_cache(&self) -> Result<()> {
        if !self.cache_dir.exists() {
            std::fs::create_dir_all(&self.cache_dir)?;
        }
        Ok(())
    }

    /// Get cached content for a paper ID.
    fn get_cached(&self, paper_id: &str) -> Option<PaperContent> {
        let path = self.cache_dir.join(format!("{}.json", paper_id));
        if path.exists() {
            let data = std::fs::read_to_string(&path).ok()?;
            serde_json::from_str(&data).ok()
        } else {
            None
        }
    }

    /// Cache a paper's content to disk.
    fn save_cache(&self, content: &PaperContent) -> Result<()> {
        self.ensure_cache()?;
        let path = self.cache_dir.join(format!("{}.json", content.paper_id));
        let json = serde_json::to_string_pretty(content)?;
        std::fs::write(&path, json)?;
        Ok(())
    }
}

/// Fetch result with diagnostics.
#[derive(Debug)]
pub struct FetchResult {
    pub successes: Vec<PaperContent>,
    pub failures: Vec<(String, String)>, // (paper_id, error)
    pub cached: usize,
    pub fetched: usize,
}

/// HTTP request with retry and exponential backoff.
fn request_with_retry(agent: &ureq::Agent, url: &str, max_retries: u32) -> Result<String> {
    let mut last_err = String::new();

    for attempt in 0..max_retries {
        if attempt > 0 {
            let delay = Duration::from_millis(500 * 2u64.pow(attempt));
            eprintln!(
                "      ↻ Retry {}/{} in {}ms...",
                attempt + 1,
                max_retries,
                delay.as_millis()
            );
            std::thread::sleep(delay);
        }

        match agent.get(url).call() {
            Ok(resp) => {
                let body = resp
                    .into_string()
                    .map_err(|e| anyhow::anyhow!("Failed to read response body: {}", e))?;
                return Ok(body);
            }
            Err(ureq::Error::Status(code, resp)) => {
                let status_text = resp.into_string().unwrap_or_default();
                last_err = format!(
                    "HTTP {}: {}",
                    code,
                    &status_text[..status_text.len().min(200)]
                );

                // Don't retry on 4xx client errors (except 429 Too Many Requests)
                if (400..500).contains(&code) && code != 429 {
                    return Err(anyhow::anyhow!("{}", last_err));
                }

                // 429: respect rate limit
                if code == 429 {
                    eprintln!("      ⏳ Rate limited (429), waiting 5s...");
                    std::thread::sleep(Duration::from_secs(5));
                }
            }
            Err(ureq::Error::Transport(e)) => {
                last_err = format!("Transport error: {}", e);
                eprintln!("      ⚠ {}", last_err);
            }
        }
    }

    Err(anyhow::anyhow!(
        "Failed after {} attempts: {}",
        max_retries,
        last_err
    ))
}

/// Parse CrossRef JSON response into PaperContent.
fn parse_crossref(paper_id: &str, doi: &str, body: &str) -> Result<PaperContent> {
    let json: serde_json::Value = serde_json::from_str(body)?;
    let message = &json["message"];

    let title = message["title"]
        .as_array()
        .and_then(|a| a.first())
        .and_then(|t| t.as_str())
        .unwrap_or("Unknown")
        .to_string();

    let abstract_text = message["abstract"].as_str().unwrap_or("").to_string();

    let authors: Vec<String> = message["author"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|a| {
                    let family = a["family"].as_str().unwrap_or("");
                    let given = a["given"].as_str().unwrap_or("");
                    if family.is_empty() {
                        None
                    } else {
                        Some(format!("{} {}", given, family))
                    }
                })
                .collect()
        })
        .unwrap_or_default();

    let journal = message["container-title"]
        .as_array()
        .and_then(|a| a.first())
        .and_then(|t| t.as_str())
        .unwrap_or("Unknown")
        .to_string();

    let year = message["published-print"]["date-parts"]
        .as_array()
        .or_else(|| message["published-online"]["date-parts"].as_array())
        .and_then(|a| a.first())
        .and_then(|d| d.as_array())
        .and_then(|d| d.first())
        .and_then(|y| y.as_u64())
        .unwrap_or(2025) as u16;

    let cited_by = message["is-referenced-by-count"].as_u64().map(|c| c as u32);

    Ok(PaperContent {
        paper_id: paper_id.to_string(),
        title,
        abstract_text,
        authors,
        journal,
        year,
        cited_by,
        source: format!("crossref:{}", doi),
    })
}

/// Parse arXiv XML response into PaperContent.
fn parse_arxiv(paper_id: &str, arxiv_id: &str, body: &str) -> Result<PaperContent> {
    // Check for arXiv error
    if body.contains("<title>Error</title>") {
        anyhow::bail!("arXiv returned error for {}", arxiv_id);
    }

    let title = extract_xml_tag(body, "title")
        .unwrap_or_else(|| "Unknown".to_string())
        .trim()
        .replace('\n', " ");

    // Skip the feed-level title (it's "ArXiv Query: ...")
    // The paper title is the second <title> tag
    let all_titles = extract_all_xml_tags(body, "title");
    let title = all_titles
        .iter()
        .find(|t| !t.starts_with("ArXiv"))
        .cloned()
        .unwrap_or(title)
        .trim()
        .replace('\n', " ");

    let abstract_text = extract_xml_tag(body, "summary")
        .unwrap_or_default()
        .trim()
        .replace('\n', " ");

    let authors = extract_all_xml_tags(body, "name");

    // Extract year from <published> tag: 2025-06-04T...
    let year = extract_xml_tag(body, "published")
        .and_then(|d| d[..4].parse::<u16>().ok())
        .unwrap_or(2025);

    Ok(PaperContent {
        paper_id: paper_id.to_string(),
        title,
        abstract_text,
        authors,
        journal: "arXiv preprint".to_string(),
        year,
        cited_by: None,
        source: format!("arxiv:{}", arxiv_id),
    })
}

/// Fetch a single paper with caching and retry.
pub fn fetch_paper_robust(
    config: &FetchConfig,
    paper_id: &str,
    doi: Option<&str>,
    arxiv: Option<&str>,
) -> Result<PaperContent> {
    // Check cache first
    if let Some(cached) = config.get_cached(paper_id) {
        eprintln!("  💾 {} — cached", paper_id);
        return Ok(cached);
    }

    let agent = config.agent();

    // Try CrossRef first (richer metadata)
    if let Some(doi) = doi {
        let url = format!("https://api.crossref.org/works/{}", doi);
        eprintln!("  🌐 {} — CrossRef: {}", paper_id, doi);

        match request_with_retry(&agent, &url, config.max_retries) {
            Ok(body) => match parse_crossref(paper_id, doi, &body) {
                Ok(content) => {
                    if let Err(e) = config.save_cache(&content) {
                        eprintln!("      ⚠ Cache write failed: {}", e);
                    }
                    return Ok(content);
                }
                Err(e) => eprintln!("      ⚠ CrossRef parse failed: {}", e),
            },
            Err(e) => eprintln!("      ⚠ CrossRef fetch failed: {}", e),
        }
    }

    // Fallback to arXiv
    if let Some(arxiv_id) = arxiv {
        let url = format!("http://export.arxiv.org/api/query?id_list={}", arxiv_id);
        eprintln!("  🌐 {} — arXiv: {}", paper_id, arxiv_id);

        match request_with_retry(&agent, &url, config.max_retries) {
            Ok(body) => match parse_arxiv(paper_id, arxiv_id, &body) {
                Ok(content) => {
                    if let Err(e) = config.save_cache(&content) {
                        eprintln!("      ⚠ Cache write failed: {}", e);
                    }
                    return Ok(content);
                }
                Err(e) => eprintln!("      ⚠ arXiv parse failed: {}", e),
            },
            Err(e) => eprintln!("      ⚠ arXiv fetch failed: {}", e),
        }
    }

    anyhow::bail!("All fetch attempts failed for {}", paper_id)
}

/// Batch fetch papers with progress reporting and graceful degradation.
pub fn fetch_batch(
    config: &FetchConfig,
    papers: &[(String, Option<String>, Option<String>)], // (id, doi, arxiv)
) -> FetchResult {
    let mut result = FetchResult {
        successes: Vec::new(),
        failures: Vec::new(),
        cached: 0,
        fetched: 0,
    };

    let total = papers.len();

    for (i, (id, doi, arxiv)) in papers.iter().enumerate() {
        eprintln!("\n  [{}/{}]", i + 1, total);

        match fetch_paper_robust(config, id, doi.as_deref(), arxiv.as_deref()) {
            Ok(content) => {
                let is_cached = content.source.contains("cached");
                let abstract_len = content.abstract_text.len();
                let title_preview = if content.title.len() > 55 {
                    format!("{}...", &content.title[..55])
                } else {
                    content.title.clone()
                };

                eprintln!("  ✅ {} — {} ({} chars)", id, title_preview, abstract_len);

                if is_cached {
                    result.cached += 1;
                } else {
                    result.fetched += 1;
                }
                result.successes.push(content);
            }
            Err(e) => {
                eprintln!("  ❌ {} — {}", id, e);
                result.failures.push((id.clone(), e.to_string()));
            }
        }

        // Rate limiting between requests (skip for cached results)
        if i + 1 < total && config.rate_limit_ms > 0 {
            std::thread::sleep(Duration::from_millis(config.rate_limit_ms));
        }
    }

    // Summary
    eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Fetch Summary                                            ║");
    eprintln!("  ╠════════════════════════════════════════════════════════════╣");
    eprintln!("  ║  Total:    {}", total);
    eprintln!(
        "  ║  Success:  {} ({} fetched, {} cached)",
        result.successes.len(),
        result.fetched,
        result.cached
    );
    eprintln!("  ║  Failed:   {}", result.failures.len());
    if !result.failures.is_empty() {
        eprintln!("  ║");
        eprintln!("  ║  Failed papers:");
        for (id, err) in &result.failures {
            eprintln!("  ║    {} — {}", id, &err[..err.len().min(60)]);
        }
    }
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");

    result
}

/// Save fetch results to disk.
pub fn save_results(results: &FetchResult, output: &Path) -> Result<()> {
    let json = serde_json::to_string_pretty(&results.successes)?;
    std::fs::write(output, &json)?;
    eprintln!(
        "\n  ✦ Results → {} ({} papers)",
        output.display(),
        results.successes.len()
    );
    Ok(())
}

/// Legacy API (kept for backward compatibility) — delegates to robust version.
pub fn fetch_paper(paper_id: &str, doi: Option<&str>, arxiv: Option<&str>) -> Result<PaperContent> {
    let config = FetchConfig::default();
    fetch_paper_robust(&config, paper_id, doi, arxiv)
}

// ───────────────────────────────────────────────────────────
// XML helpers (unchanged)
// ───────────────────────────────────────────────────────────

/// Simple XML tag value extraction (for arXiv Atom XML).
fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{}", tag);
    let close = format!("</{}>", tag);

    if let Some(start_pos) = xml.find(&open) {
        let content_start = xml[start_pos..].find('>').map(|p| start_pos + p + 1)?;
        let content_end = xml[content_start..]
            .find(&close)
            .map(|p| content_start + p)?;
        Some(xml[content_start..content_end].to_string())
    } else {
        None
    }
}

/// Extract all occurrences of a tag.
fn extract_all_xml_tags(xml: &str, tag: &str) -> Vec<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    let mut results = Vec::new();
    let mut search_from = 0;

    while let Some(start) = xml[search_from..].find(&open) {
        let abs_start = search_from + start + open.len();
        if let Some(end) = xml[abs_start..].find(&close) {
            let abs_end = abs_start + end;
            results.push(xml[abs_start..abs_end].trim().to_string());
            search_from = abs_end + close.len();
        } else {
            break;
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_xml_tag() {
        let xml = r#"<entry><title>Test Paper Title</title><summary>This is the abstract.</summary></entry>"#;
        assert_eq!(
            extract_xml_tag(xml, "title"),
            Some("Test Paper Title".to_string())
        );
        assert_eq!(
            extract_xml_tag(xml, "summary"),
            Some("This is the abstract.".to_string())
        );
    }

    #[test]
    fn test_extract_all_xml_tags() {
        let xml = r#"<feed><entry><author><name>Alice</name></author><author><name>Bob</name></author></entry></feed>"#;
        let names = extract_all_xml_tags(xml, "name");
        assert_eq!(names, vec!["Alice", "Bob"]);
    }

    #[test]
    fn test_parse_crossref_json() {
        let json = r#"{
            "message": {
                "title": ["LAMMPS Performance Portability"],
                "abstract": "We present performance results.",
                "author": [{"given": "Stan", "family": "Moore"}],
                "container-title": ["Computer Physics Communications"],
                "published-print": {"date-parts": [[2025]]},
                "is-referenced-by-count": 42
            }
        }"#;
        let result = parse_crossref("P01", "10.1234/test", json).unwrap();
        assert_eq!(result.title, "LAMMPS Performance Portability");
        assert_eq!(result.abstract_text, "We present performance results.");
        assert_eq!(result.authors, vec!["Stan Moore"]);
        assert_eq!(result.year, 2025);
        assert_eq!(result.cited_by, Some(42));
    }

    #[test]
    fn test_parse_arxiv_xml() {
        let xml = r#"<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: search</title>
  <entry>
    <title>LAMMPS-KOKKOS: Performance Portable MD</title>
    <summary>We demonstrate performance portability of LAMMPS across exascale architectures.</summary>
    <author><name>Stan Moore</name></author>
    <author><name>Christian Trott</name></author>
    <published>2025-08-13T00:00:00Z</published>
  </entry>
</feed>"#;
        let result = parse_arxiv("P01", "2508.13523", xml).unwrap();
        assert_eq!(result.title, "LAMMPS-KOKKOS: Performance Portable MD");
        assert!(result.abstract_text.contains("performance portability"));
        assert_eq!(result.authors, vec!["Stan Moore", "Christian Trott"]);
        assert_eq!(result.year, 2025);
    }

    #[test]
    fn test_cache_roundtrip() {
        let config = FetchConfig {
            cache_dir: std::env::temp_dir().join("atlas-distill-test-cache"),
            ..Default::default()
        };

        let content = PaperContent {
            paper_id: "TEST01".to_string(),
            title: "Test Paper".to_string(),
            abstract_text: "Abstract text".to_string(),
            authors: vec!["Author One".to_string()],
            journal: "Test Journal".to_string(),
            year: 2025,
            cited_by: Some(10),
            source: "test".to_string(),
        };

        config.save_cache(&content).unwrap();
        let loaded = config.get_cached("TEST01").unwrap();
        assert_eq!(loaded.title, "Test Paper");
        assert_eq!(loaded.paper_id, "TEST01");

        // Cleanup
        let _ = std::fs::remove_dir_all(&config.cache_dir);
    }

    #[test]
    fn test_fetch_config_default() {
        let config = FetchConfig::default();
        assert_eq!(config.connect_timeout, Duration::from_secs(10));
        assert_eq!(config.read_timeout, Duration::from_secs(30));
        assert_eq!(config.max_retries, 3);
        assert_eq!(config.rate_limit_ms, 1000);
    }
}
