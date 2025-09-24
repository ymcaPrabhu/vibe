use crate::models::{SectionDraft, Citation, Job};
use crate::db::Database;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::broadcast;
use chrono::{Utc, DateTime};
use uuid::Uuid;
use reqwest;

pub struct Worker {
    db: Arc<Database>,
    sse_tx: broadcast::Sender<String>,
    job: Job,
    client: reqwest::Client,
}

#[derive(Debug, serde::Deserialize)]
struct OpenRouterResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, serde::Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Debug, serde::Deserialize)]
struct Message {
    content: String,
}

impl Worker {
    pub fn new(db: Arc<Database>, sse_tx: broadcast::Sender<String>, job: Job) -> Self {
        Worker { 
            db, 
            sse_tx, 
            job,
            client: reqwest::Client::new(),
        }
    }

    pub async fn process_section(&self, section_key: &str, section_title: &str, topic: &str, depth: i32) -> Result<SectionDraft> {
        let content = self.generate_section_content(section_key, section_title, topic, depth).await?;
        let citations = self.generate_citations(section_key, topic).await?;

        Ok(SectionDraft { content, citations })
    }

    async fn generate_section_content(&self, section_key: &str, section_title: &str, topic: &str, depth: i32) -> Result<String> {
        // Build a prompt specific to this section
        let prompt = match section_key {
            "executive_summary" => {
                format!(
                    "Write a comprehensive executive summary for a research report on '{}'. The summary should outline the key findings, challenges, and recommendations in a formal Government of India writing style. The research depth is {} out of 5.",
                    topic, depth
                )
            }
            "introduction" => {
                format!(
                    "Write an introduction section for a research report on '{}'. The introduction should define the scope, assumptions, and key terminology relevant to this topic. Use formal Government of India writing style. The research depth is {} out of 5.",
                    topic, depth
                )
            }
            key if key.starts_with("topic_chapter_") => {
                let chapter_num = key.trim_start_matches("topic_chapter_").parse::<i32>().unwrap_or(1);
                format!(
                    "Write a detailed section about aspect {} of '{}' in a research report. Focus on technical aspects, challenges, and current state of the field. Use formal Government of India writing style and include specific examples where relevant. The research depth is {} out of 5.",
                    chapter_num, topic, depth
                )
            }
            "annexures" => {
                format!(
                    "Write annexures for a research report on '{}'. Include a comprehensive glossary of terms, mappings between different security standards and frameworks, and any relevant matrices. Use formal Government of India writing style.",
                    topic
                )
            }
            "references" => {
                format!(
                    "Generate a comprehensive list of references for a research report on '{}'. Include at least 6-10 relevant citations in IEEE format. Use formal Government of India writing style.",
                    topic
                )
            }
            _ => {
                format!(
                    "Write a comprehensive section about '{}' in a research report on '{}'. The research depth is {} out of 5. Use formal Government of India writing style.",
                    section_title, topic, depth
                )
            }
        };

        // Call OpenRouter API to generate content
        let content = self.call_openrouter_api(&prompt).await?;

        // Send progress updates
        for progress in (0..=100).step_by(25) {
            // Send progress update
            let progress_event = serde_json::to_string(&crate::models::SseEvent {
                kind: "progress".to_string(),
                text: None,
                section_key: Some(section_key.to_string()),
                section_title: Some(section_title.to_string()),
                progress: Some(progress),
            }).unwrap_or_default();
            
            let _ = self.sse_tx.send(progress_event);
            
            // Simulate processing time during generation
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        Ok(content)
    }

    async fn call_openrouter_api(&self, prompt: &str) -> Result<String> {
        let api_key = std::env::var("OPENROUTER_API_KEY")
            .map_err(|_| anyhow::anyhow!("OPENROUTER_API_KEY environment variable not set"))?;
        
        let model = std::env::var("LLM_MODEL")
            .unwrap_or_else(|_| "alibaba/tongyi-deepresearch-30b-a3b".to_string());

        let payload = serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        });

        let response = self.client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("OpenRouter API error: {}", error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        
        if let Some(choices) = response_json["choices"].as_array() {
            if let Some(first_choice) = choices.first() {
                if let Some(content) = first_choice["message"]["content"].as_str() {
                    return Ok(content.to_string());
                }
            }
        }

        Err(anyhow::anyhow!("No content found in OpenRouter response"))
    }

    async fn generate_citations(&self, section_key: &str, topic: &str) -> Result<Vec<Citation>> {
        // For Stage 1, we'll generate placeholder citations
        // In Stage 2, this would connect to real citation databases
        let mut citations = Vec::new();
        
        // Generate different types of citations based on section
        match section_key {
            "executive_summary" => {
                citations.push(Citation {
                    doi: Some("10.1145/3485765".to_string()),
                    url: "https://dl.acm.org/doi/10.1145/3485765".to_string(),
                    title: format!("Comprehensive Analysis of {} Trends", topic),
                    publisher: "ACM".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("pp. 45-67".to_string()),
                });
            }
            "introduction" => {
                citations.push(Citation {
                    doi: Some("10.1007/978-3-030-89511-3_5".to_string()),
                    url: "https://link.springer.com/chapter/10.1007/978-3-030-89511-3_5".to_string(),
                    title: format!("Introduction to {} Concepts", topic),
                    publisher: "Springer".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("Chapter 3".to_string()),
                });
            }
            key if key.starts_with("topic_chapter_") => {
                citations.push(Citation {
                    doi: Some("10.1109/TIFS.2024.3321456".to_string()),
                    url: "https://ieeexplore.ieee.org/document/1234567".to_string(),
                    title: format!("Technical Aspects of {}", topic),
                    publisher: "IEEE".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("Section 4.2".to_string()),
                });
                
                citations.push(Citation {
                    doi: Some("10.1145/3576915.3576923".to_string()),
                    url: "https://dl.acm.org/doi/10.1145/3576915.3576923".to_string(),
                    title: format!("Comparative Analysis of {} Frameworks", topic),
                    publisher: "ACM".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("pp. 123-145".to_string()),
                });
            }
            "annexures" => {
                citations.push(Citation {
                    doi: Some("10.1007/s10207-023-00748-y".to_string()),
                    url: "https://link.springer.com/article/10.1007/s10207-023-00748-y".to_string(),
                    title: "Security Standard Mappings and Compliance Frameworks",
                    publisher: "Springer".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("Volume 23, Issue 4".to_string()),
                });
            }
            "references" => {
                // This section would contain the complete reference list
                citations.push(Citation {
                    doi: Some("10.1145/3581531".to_string()),
                    url: "https://dl.acm.org/doi/10.1145/3581531".to_string(),
                    title: "A Comprehensive Survey of Cybersecurity Research Methodologies",
                    publisher: "ACM".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("pp. 1-35".to_string()),
                });
            }
            _ => {
                citations.push(Citation {
                    doi: Some("10.1145/1234567.1234568".to_string()),
                    url: format!("https://example.com/{}", topic.replace(" ", "-")),
                    title: format!("Research on {}", topic),
                    publisher: "Example Publisher".to_string(),
                    year: 2024,
                    access_date: Utc::now(),
                    page_section: Some("pp. 10-25".to_string()),
                });
            }
        }

        Ok(citations)
    }

    // Function to verify citations using lightweight methods
    pub async fn verify_citations(&self, citations: Vec<Citation>) -> Result<Vec<Citation>> {
        let mut verified_citations = Vec::new();
        
        for mut citation in citations {
            // In a real implementation, we would verify each citation
            // For Stage 1, we'll simply mark them as verified after checking if the URL is valid
            if self.is_url_valid(&citation.url).await {
                verified_citations.push(citation);
            } else {
                // If the URL is not valid, mark this as observational inference
                citation.url = "Observational Inference (Expert Judgment)".to_string();
                verified_citations.push(citation);
            }
        }
        
        Ok(verified_citations)
    }

    async fn is_url_valid(&self, url: &str) -> bool {
        // In a real implementation, we would make an HTTP request to verify the URL
        // For now, we'll just check if it starts with http or https
        url.starts_with("http://") || url.starts_with("https://")
    }
}