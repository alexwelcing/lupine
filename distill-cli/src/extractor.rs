use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tracing::{debug, error, info};

use crate::ontology::Ontology;
use crate::parser::ParsedDocument;

pub struct Extractor {
    client: Client,
    api_key: String,
    endpoint: String,
    model: String,
    ontology_schema: String,
}

impl Extractor {
    pub fn new(ontology: &Ontology) -> Result<Self> {
        // In a real application, these would be loaded via `dotenv` or command-line args.
        let api_key = std::env::var("LLM_API_KEY")
            .unwrap_or_else(|_| "dummy_key".to_string());
        
        let endpoint = std::env::var("LLM_ENDPOINT")
            .unwrap_or_else(|_| "https://api.openai.com/v1/chat/completions".to_string());
            
        let model = std::env::var("LLM_MODEL")
            .unwrap_or_else(|_| "gpt-4o-mini".to_string());

        let ontology_schema = ontology.to_json_schema()?;

        Ok(Self {
            client: Client::builder().timeout(Duration::from_secs(120)).build()?,
            api_key,
            endpoint,
            model,
            ontology_schema,
        })
    }

    /// Orchestrates the concurrent extraction across all parsed documents.
    pub async fn extract_corpus(
        &self,
        docs: Vec<ParsedDocument>,
        concurrency_limit: usize,
    ) -> Result<Vec<Value>> {
        info!("Initializing concurrent extraction pool (concurrency: {})", concurrency_limit);
        
        let semaphore = Arc::new(Semaphore::new(concurrency_limit));
        let mut join_set = JoinSet::new();

        // Wrap connection parameters in Arc for cheap cloning into tasks
        let client = self.client.clone();
        let api_key = Arc::new(self.api_key.clone());
        let endpoint = Arc::new(self.endpoint.clone());
        let model = Arc::new(self.model.clone());
        let schema = Arc::new(self.ontology_schema.clone());

        for doc in docs {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            
            let client = client.clone();
            let api_key = api_key.clone();
            let endpoint = endpoint.clone();
            let model = model.clone();
            let schema = schema.clone();

            join_set.spawn(async move {
                // Hold permit for the duration of the async task
                let _permit = permit;
                Self::extract_single(client, api_key, endpoint, model, schema, doc).await
            });
        }

        let mut results = Vec::new();
        let mut success = 0;
        let mut failed = 0;

        while let Some(res) = join_set.join_next().await {
            match res {
                Ok(Ok(extracted_value)) => {
                    results.push(extracted_value);
                    success += 1;
                }
                Ok(Err(e)) => {
                    error!("Extraction failed for a document: {:#}", e);
                    failed += 1;
                }
                Err(e) => {
                    error!("Task panicked or was cancelled: {}", e);
                    failed += 1;
                }
            }
        }

        info!("Extraction complete: {} succeeded, {} failed", success, failed);
        Ok(results)
    }

    /// Dispatches a single document against the LLM, honoring the schema constraints.
    async fn extract_single(
        client: Client,
        api_key: Arc<String>,
        endpoint: Arc<String>,
        model: Arc<String>,
        schema: Arc<String>,
        doc: ParsedDocument,
    ) -> Result<Value> {
        let system_prompt = format!(
            "You are a highly precise data extraction engine. Extract information from the user's document into JSON.\n\
            The output must strictly be a JSON object containing:\n\
            1. 'title': A short, clear title for the document.\n\
            2. 'subtitle': A brief one-sentence subtitle.\n\
            3. 'category': Must be a valid category ID matching the domain.\n\
            4. 'tags': An array of string tags.\n\
            5. 'extracted_knowledge': An object strictly adhering to the following ontology schema:\n{}",
            schema
        );
        
        let payload = json!({
            "model": *model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": format!("Extract from this document:\n{}", doc.content) }
            ],
            // Request guaranteed JSON output if the provider supports it
            "response_format": { "type": "json_object" }
        });

        debug!("Dispatching document {:?} to LLM...", doc.path);

        let res = client.post(&*endpoint)
            .header("Authorization", format!("Bearer {}", *api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        let status = res.status();
        let body_text = res.text().await?;

        if !status.is_success() {
            anyhow::bail!("API returned error: {} - {}", status, body_text);
        }

        let response_json: Value = serde_json::from_str(&body_text)
            .context("Failed to parse API response as JSON")?;
        
        let content_str = response_json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("{}");

        let extracted_payload: Value = serde_json::from_str(content_str)
            .context("Failed to parse LLM content payload into JSON")?;

        let title = extracted_payload.get("title").and_then(|v| v.as_str()).unwrap_or(&doc.id).to_string();
        let subtitle = extracted_payload.get("subtitle").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let category = extracted_payload.get("category").and_then(|v| v.as_str()).unwrap_or("general").to_string();
        let tags = extracted_payload.get("tags").cloned().unwrap_or_else(|| json!([]));
        let knowledge = extracted_payload.get("extracted_knowledge").cloned().unwrap_or_else(|| json!({}));
        
        // Wrap the payload with the exact SKP contract fields expected by the frontend
        let enriched = json!({
            "id": doc.id,
            "title": title,
            "subtitle": subtitle,
            "category": category,
            "tags": tags,
            "readMinutes": doc.read_minutes,
            "words": doc.words,
            "html": doc.html,
            "extracted_knowledge": knowledge
        });

        Ok(enriched)
    }
}
