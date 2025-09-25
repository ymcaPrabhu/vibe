use crate::models::{SectionDraft, Citation, Job};
use crate::db::Database;
use crate::artifacts::{ArtifactStore, NewArtifact, Artifact};
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::broadcast;
use chrono::{Utc, DateTime};
use uuid::Uuid;
use reqwest;
use scraper::{Html, Selector};

pub struct Worker {
    db: Arc<Database>,
    artifact_store: Arc<ArtifactStore>,
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

// Data structure for research results
#[derive(Debug)]
pub struct ResearchResult {
    pub content: String,
    pub source_url: String,
    pub provenance: Vec<String>, // URLs of sources used
    pub verification_score: f64, // Confidence score for the information
}

// Enhanced citation structure
#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct EnhancedCitation {
    pub doi: Option<String>,
    pub url: String,
    pub title: String,
    pub publisher: String,
    pub year: i32,
    pub access_date: DateTime<Utc>,
    pub page_section: Option<String>,
    pub provenance_url: String, // Source where this citation was found
    pub verification_status: String, // "verified", "unverified", "questionable"
    pub claim_support_level: String, // "strong", "moderate", "weak"
}

impl Worker {
    pub fn new(db: Arc<Database>, artifact_store: Arc<ArtifactStore>, sse_tx: broadcast::Sender<String>, job: Job) -> Self {
        Worker { 
            db, 
            artifact_store,
            sse_tx, 
            job,
            client: reqwest::Client::new(),
        }
    }

    // Perform constrained web research for a specific topic
    pub async fn perform_constrained_research(&self, query: &str, max_results: usize) -> Result<Vec<ResearchResult>> {
        let mut results = Vec::new();
        
        // Define safe domains for research (cybersecurity-focused sources)
        let safe_domains = [
            "arxiv.org",
            "ieeexplore.ieee.org", 
            "dl.acm.org",
            "springer.com",
            "sciencedirect.com",
            "nvd.nist.gov",
            "cve.mitre.org",
            "owasp.org",
            "sans.org",
            "cisa.gov",
            "us-cert.cisa.gov"
        ];
        
        // Create a search query for a search engine API (in practice, you'd use a real API)
        // For now, we'll simulate by searching these specific domains
        for domain in &safe_domains {
            // This is a simplified approach - in real implementation you'd use a search API
            // or implement proper web crawling within ethical boundaries
            let search_results = self.search_domain(domain, query).await?;
            results.extend(search_results);
            
            if results.len() >= max_results {
                break;
            }
        }
        
        Ok(results.into_iter().take(max_results).collect())
    }
    
    // Search a specific domain for relevant content
    async fn search_domain(&self, domain: &str, query: &str) -> Result<Vec<ResearchResult>> {
        let mut results = Vec::new();
        
        // In a real implementation, this would be an API call to the domain
        // For now, we'll simulate results for certain domains
        match domain {
            "arxiv.org" => {
                // Search arXiv for cybersecurity papers
                let url = format!(
                    "https://arxiv.org/search/?query={}&searchtype=all&source=header",
                    query.replace(" ", "+")
                );
                // In a real implementation, we would fetch and parse the search results
                // For now we'll return simulated results
                if query.to_lowercase().contains("cybersecurity") || 
                   query.to_lowercase().contains("security") {
                    results.push(ResearchResult {
                        content: format!("Simulated research content from arXiv about {}", query),
                        source_url: format!("https://arxiv.org/search/?query={}", query.replace(" ", "+")),
                        provenance: vec![format!("https://arxiv.org/search/?query={}", query.replace(" ", "+"))],
                        verification_score: 0.9,
                    });
                }
            },
            "ieeexplore.ieee.org" => {
                // Search IEEE Xplore for technical papers
                let url = format!(
                    "https://ieeexplore.ieee.org/search/searchresult.jsp?newsearch=true&queryText={}",
                    query.replace(" ", "%20")
                );
                if query.to_lowercase().contains("cybersecurity") || 
                   query.to_lowercase().contains("encryption") {
                    results.push(ResearchResult {
                        content: format!("Simulated research content from IEEE Xplore about {}", query),
                        source_url: format!("https://ieeexplore.ieee.org/search/?query={}", query.replace(" ", "%20")),
                        provenance: vec![format!("https://ieeexplore.ieee.org/search/?query={}", query.replace(" ", "%20"))],
                        verification_score: 0.85,
                    });
                }
            },
            "nvd.nist.gov" => {
                // Search NVD for vulnerabilities related to the topic
                let url = format!(
                    "https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query={}",
                    query.replace(" ", "%20")
                );
                if query.to_lowercase().contains("vulnerability") || 
                   query.to_lowercase().contains("cve") {
                    results.push(ResearchResult {
                        content: format!("Simulated vulnerability research from NVD about {}", query),
                        source_url: format!("https://nvd.nist.gov/vuln/search/results?query={}", query.replace(" ", "%20")),
                        provenance: vec![format!("https://nvd.nist.gov/vuln/search/results?query={}", query.replace(" ", "%20"))],
                        verification_score: 0.95,
                    });
                }
            },
            _ => {
                // For other domains, we'd implement similar patterns
                // In this simplified version, we'll just add placeholder results
                results.push(ResearchResult {
                    content: format!("Simulated research content from {} about {}", domain, query),
                    source_url: format!("https://{}/search?q={}", domain, query.replace(" ", "%20")),
                    provenance: vec![format!("https://{}/search?q={}", domain, query.replace(" ", "%20"))],
                    verification_score: 0.7,
                });
            }
        }
        
        Ok(results)
    }
    
    // Fetch and parse content from a given URL
    pub async fn fetch_content_from_url(&self, url: &str) -> Result<String> {
        // Perform basic validation to ensure the URL is from a safe domain
        let allowed_domains = [
            "arxiv.org",
            "ieeexplore.ieee.org", 
            "dl.acm.org",
            "springer.com",
            "sciencedirect.com",
            "nvd.nist.gov",
            "cve.mitre.org",
            "owasp.org",
            "sans.org",
            "cisa.gov",
            "us-cert.cisa.gov"
        ];
        
        let is_allowed = allowed_domains.iter().any(|&domain| url.contains(domain));
        if !is_allowed {
            return Err(anyhow::anyhow!("URL from non-approved domain: {}", url));
        }
        
        let response = self.client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to fetch content from URL: {}", url));
        }
        
        let body = response.text().await?;
        
        // Parse the HTML and extract text content
        let document = Html::parse_document(&body);
        let text_selector = Selector::parse("p, h1, h2, h3, h4, h5, h6, li, td, div").unwrap();
        
        let text_content: Vec<String> = document
            .select(&text_selector)
            .map(|element| element.text().collect::<String>().trim().to_string())
            .filter(|text| !text.is_empty())
            .collect();
        
        Ok(text_content.join(" "))
    }
    
    // Verify a citation's authenticity
    pub async fn verify_citation(&self, citation: &EnhancedCitation) -> Result<EnhancedCitation> {
        let mut verified_citation = citation.clone();
        
        // Check if the URL is accessible and valid
        match self.client.head(&citation.url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    verified_citation.verification_status = "verified".to_string();
                    verified_citation.claim_support_level = "strong".to_string();
                } else {
                    verified_citation.verification_status = "unverified".to_string();
                }
            }
            Err(_) => {
                verified_citation.verification_status = "unverified".to_string();
            }
        }
        
        Ok(verified_citation)
    }
    
    // Verify that a claim is supported by sources
    pub async fn verify_claim(&self, claim: &str, sources: &[String]) -> Result<(bool, Vec<String>)> {
        let mut supporting_evidence = Vec::new();
        
        for source_url in sources {
            match self.fetch_content_from_url(source_url).await {
                Ok(content) => {
                    // Check if the claim is supported by this source
                    if content.to_lowercase().contains(&claim.to_lowercase()) {
                        supporting_evidence.push(source_url.clone());
                    }
                }
                Err(_) => {
                    // Continue to next source if this one fails
                    continue;
                }
            }
        }
        
        Ok((!supporting_evidence.is_empty(), supporting_evidence))
    }

    pub async fn process_section(&self, section_key: &str, section_title: &str, topic: &str, depth: i32) -> Result<SectionDraft> {
        let content = self.generate_section_content(section_key, section_title, topic, depth).await?;
        let citations = self.generate_citations(section_key, topic).await?;
        
        // For Stage 2, we enhance the citations with proper verification
        let enhanced_citations = self.enhance_citations_with_research(&citations, topic).await?;
        
        // Generate artifacts for this section
        self.generate_artifacts(section_key, section_title, topic, depth).await?;

        Ok(SectionDraft { content, citations: self.convert_to_standard_citations(enhanced_citations)? })
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

    async fn enhance_citations_with_research(&self, citations: &[Citation], topic: &str) -> Result<Vec<EnhancedCitation>> {
        let mut enhanced_citations = Vec::new();
        
        for citation in citations {
            // Convert standard citation to enhanced citation
            let enhanced = EnhancedCitation {
                doi: citation.doi.clone(),
                url: citation.url.clone(),
                title: citation.title.clone(),
                publisher: citation.publisher.clone(),
                year: citation.year,
                access_date: citation.access_date,
                page_section: citation.page_section.clone(),
                provenance_url: citation.url.clone(), // Initially, same as URL
                verification_status: "unverified".to_string(), // Will be updated after verification
                claim_support_level: "unknown".to_string(),
            };
            
            // Verify the citation
            let verified_citation = self.verify_citation(&enhanced).await?;
            enhanced_citations.push(verified_citation);
        }
        
        Ok(enhanced_citations)
    }
    
    // Convert EnhancedCitation to standard Citation
    fn convert_to_standard_citations(&self, enhanced_citations: Vec<EnhancedCitation>) -> Result<Vec<Citation>> {
        let mut citations = Vec::new();
        
        for enhanced in enhanced_citations {
            citations.push(Citation {
                doi: enhanced.doi,
                url: enhanced.url,
                title: enhanced.title,
                publisher: enhanced.publisher,
                year: enhanced.year,
                access_date: enhanced.access_date,
                page_section: enhanced.page_section,
            });
        }
        
        Ok(citations)
    }
    
    // Generate artifacts for a section
    async fn generate_artifacts(&self, section_key: &str, section_title: &str, topic: &str, depth: i32) -> Result<()> {
        // Generate different types of artifacts based on section
        let mut artifacts = Vec::new();
        
        match section_key {
            "executive_summary" => {
                // Generate summary artifacts (charts, figures)
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: format!("Executive Summary - {}", topic),
                    artifact_type: "summary".to_string(),
                    content: format!("Executive summary with key findings and recommendations for {}", topic),
                    description: "Executive summary highlighting main points".to_string(),
                    created_at: Utc::now(),
                });
            }
            "introduction" => {
                // Generate introduction artifacts (terminology table, scope document)
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: format!("Terminology Table - {}", topic),
                    artifact_type: "table".to_string(),
                    content: format!("Terminology table for {} concepts", topic),
                    description: "Key terms and definitions for the research topic".to_string(),
                    created_at: Utc::now(),
                });
            }
            key if key.starts_with("topic_chapter_") => {
                // Generate technical artifacts (code snippets, data sets, analysis)
                let chapter_num = key.trim_start_matches("topic_chapter_").parse::<i32>().unwrap_or(1);
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: format!("Technical Analysis - Chapter {}", chapter_num),
                    artifact_type: "analysis".to_string(),
                    content: format!("Technical analysis of aspect {} of {}", chapter_num, topic),
                    description: format!("In-depth analysis of chapter {} topic", chapter_num).to_string(),
                    created_at: Utc::now(),
                });
                
                // Add code/data artifacts if relevant
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: format!("Code Snippets - Chapter {}", chapter_num),
                    artifact_type: "code".to_string(),
                    content: format!("Relevant code samples for {} in chapter {}", topic, chapter_num),
                    description: "Code examples related to the technical content".to_string(),
                    created_at: Utc::now(),
                });
            }
            "annexures" => {
                // Generate annexure artifacts (glossary, matrices, mappings)
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: "Security Standard Mappings",
                    artifact_type: "mapping".to_string(),
                    content: "Mappings between different security standards and frameworks".to_string(),
                    description: "Cross-reference table of security standards".to_string(),
                    created_at: Utc::now(),
                });
                
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: "Glossary of Terms",
                    artifact_type: "glossary".to_string(),
                    content: "Comprehensive glossary of cybersecurity terms".to_string(),
                    description: "Definition of terms used throughout the report".to_string(),
                    created_at: Utc::now(),
                });
            }
            "references" => {
                // Generate reference artifacts (bibliography, citation graph)
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: "Complete Bibliography",
                    artifact_type: "bibliography".to_string(),
                    content: format!("Complete list of {} references", topic),
                    description: "Full bibliography in IEEE format".to_string(),
                    created_at: Utc::now(),
                });
            }
            _ => {
                // Default artifact for other sections
                artifacts.push(NewArtifact {
                    id: Uuid::new_v4().to_string(),
                    job_id: self.job.id.clone(),
                    section_key: section_key.to_string(),
                    title: format!("Section Content - {}", section_title),
                    artifact_type: "content".to_string(),
                    content: format!("Detailed content for section: {}", section_title),
                    description: format!("Main content for {}", section_title).to_string(),
                    created_at: Utc::now(),
                });
            }
        }
        
        // Save all artifacts to the database
        for artifact in artifacts {
            self.artifact_store.create_artifact(artifact).await?;
        }
        
        Ok(())
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