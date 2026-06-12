//! Semantic Scholar paper search.
//!
//! API: <https://api.semanticscholar.org/graph/v1/paper/search>
//! No auth required at low rates (approx 100 requests / 5 min anonymous).
//! Returns JSON with title, abstract, authors, year, externalIds (DOI/arXiv).
//!
//! We stay deliberately minimal — no rate-limit handling, no retries, no
//! caching. Caching belongs at the database layer (`literature` table) and
//! the caller should de-dupe by DOI / arXiv id before calling.

use anyhow::{Context, Result};
use serde::Deserialize;
use std::time::Duration;

const SEARCH_ENDPOINT: &str = "https://api.semanticscholar.org/graph/v1/paper/search";
const REQUEST_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Clone, Deserialize)]
pub struct Paper {
    #[serde(rename = "paperId")]
    pub paper_id: String,
    pub title: Option<String>,
    pub abstract_: Option<String>,
    pub year: Option<i64>,
    pub authors: Option<Vec<Author>>,
    #[serde(rename = "externalIds")]
    pub external_ids: Option<ExternalIds>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Author {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct ExternalIds {
    #[serde(rename = "DOI")]
    pub doi: Option<String>,
    #[serde(rename = "ArXiv")]
    pub arxiv: Option<String>,
}

impl Paper {
    pub fn doi(&self) -> Option<&str> {
        self.external_ids.as_ref().and_then(|e| e.doi.as_deref())
    }
    pub fn arxiv_id(&self) -> Option<&str> {
        self.external_ids.as_ref().and_then(|e| e.arxiv.as_deref())
    }
    pub fn author_string(&self) -> String {
        self.authors
            .as_ref()
            .map(|list| {
                list.iter()
                    .filter_map(|a| a.name.as_deref())
                    .collect::<Vec<_>>()
                    .join(", ")
            })
            .unwrap_or_default()
    }
}

pub fn search(query: &str, limit: usize) -> Result<Vec<Paper>> {
    // S2 needs the abstract field renamed (`abstract` is a reserved word in
    // Rust, hence `abstract_` in our struct, mapped via Serde's
    // implicit-name rules). Their API field is literally `abstract`.
    let fields = "title,abstract,year,authors,externalIds";
    let limit = limit.clamp(1, 50);

    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .user_agent("lupine-distill/0.1 (https://github.com/alexwelcing/lupine)")
        .build();

    let resp = agent
        .get(SEARCH_ENDPOINT)
        .query("query", query)
        .query("limit", &limit.to_string())
        .query("fields", fields)
        .call()
        .with_context(|| format!("S2 search failed for query={:?}", query))?;

    // S2 returns JSON; the abstract field needs custom deserialization
    // because `abstract` is a Rust reserved word. Easiest: rename via
    // serde's `rename` attribute on the field, which is what we did with
    // `abstract_`. Doing the deserialize manually here so we can also
    // remap that single field name.
    let raw: serde_json::Value = resp.into_json()
        .context("decoding S2 JSON response")?;
    let data = raw.get("data").cloned().unwrap_or(serde_json::Value::Null);
    let papers: Vec<Paper> = match data {
        serde_json::Value::Array(arr) => arr
            .into_iter()
            .map(|mut v| {
                if let Some(obj) = v.as_object_mut() {
                    if let Some(a) = obj.remove("abstract") {
                        obj.insert("abstract_".into(), a);
                    }
                }
                serde_json::from_value(v).unwrap_or(Paper {
                    paper_id: String::new(),
                    title: None,
                    abstract_: None,
                    year: None,
                    authors: None,
                    external_ids: None,
                })
            })
            .filter(|p| !p.paper_id.is_empty())
            .collect(),
        _ => Vec::new(),
    };
    Ok(papers)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paper_helpers_handle_missing_fields() {
        let p = Paper {
            paper_id: "x".into(),
            title: None,
            abstract_: None,
            year: None,
            authors: None,
            external_ids: None,
        };
        assert_eq!(p.doi(), None);
        assert_eq!(p.arxiv_id(), None);
        assert_eq!(p.author_string(), "");
    }

    #[test]
    fn paper_author_string_joins() {
        let p = Paper {
            paper_id: "x".into(),
            title: None,
            abstract_: None,
            year: None,
            authors: Some(vec![
                Author { name: Some("Alice".into()) },
                Author { name: Some("Bob".into()) },
                Author { name: None },
            ]),
            external_ids: None,
        };
        assert_eq!(p.author_string(), "Alice, Bob");
    }
}
