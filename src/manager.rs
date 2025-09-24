use crate::models::{Job, Section, NewSection, SectionDraft, Citation};
use crate::workers::Worker;
use crate::db::Database;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;
use chrono::Utc;

pub struct Manager {
    db: Arc<Database>,
    sse_tx: broadcast::Sender<String>,
}

impl Manager {
    pub fn new(db: Arc<Database>, sse_tx: broadcast::Sender<String>) -> Self {
        Manager { db, sse_tx }
    }

    pub async fn process_job(&self, job: Job) -> Result<()> {
        // Generate comprehensive outline
        let outline = self.generate_outline(&job.topic, job.depth).await?;
        
        // Update job status to "processing"
        self.db.update_job_status(&job.id, "processing").await?;
        
        // Create sections for each outline item
        let mut sections = Vec::new();
        for (index, (key, title)) in outline.iter().enumerate() {
            let section = NewSection {
                id: Uuid::new_v4().to_string(),
                job_id: job.id.clone(),
                key: key.clone(),
                title: title.clone(),
                progress: 0,
                status: "pending".to_string(),
                output_md: "".to_string(),
            };
            let section = self.db.create_section(section).await?;
            sections.push(section);
        }
        
        // Spawn workers for each section
        for section in sections {
            let db_clone = self.db.clone();
            let sse_tx_clone = self.sse_tx.clone();
            let job_clone = job.clone();
            
            tokio::spawn(async move {
                if let Err(e) = Self::process_section(db_clone, sse_tx_clone, job_clone, section).await {
                    tracing::error!("Error processing section {}: {}", section.id, e);
                }
            });
        }
        
        Ok(())
    }

    async fn generate_outline(&self, topic: &str, depth: i32) -> Result<Vec<(String, String)>> {
        // Generate the standard outline structure
        let mut outline = Vec::new();
        
        // 1. Executive Summary
        outline.push(("executive_summary".to_string(), "Executive Summary".to_string()));
        
        // 2. Introduction (scope, assumptions, terminology)
        outline.push(("introduction".to_string(), "Introduction".to_string()));
        
        // 3. Topic-specific Chapters (derived from the topic, 6–12 logical chapters based on depth)
        let num_chapters = std::cmp::min(6 + (depth - 1) * 2, 12); // 6-12 chapters based on depth
        
        for i in 1..=num_chapters {
            outline.push((
                format!("topic_chapter_{}", i),
                format!("Topic-Specific Chapter {}", i),
            ));
        }
        
        // 4. Annexures (glossary, mappings, matrices)
        outline.push(("annexures".to_string(), "Annexures".to_string()));
        
        // 5. References
        outline.push(("references".to_string(), "References".to_string()));
        
        Ok(outline)
    }

    async fn process_section(
        db: Arc<Database>,
        sse_tx: broadcast::Sender<String>,
        job: Job,
        section: Section,
    ) -> Result<()> {
        // Update section status to "in_progress"
        db.update_section_progress(&section.id, 0, "").await?;
        
        // Send progress update
        let progress_event = serde_json::to_string(&crate::models::SseEvent {
            kind: "progress".to_string(),
            text: None,
            section_key: Some(section.key.clone()),
            section_title: Some(section.title.clone()),
            progress: Some(0),
        })?;
        let _ = sse_tx.send(progress_event);
        
        // Create a worker to handle this section
        let worker = Worker::new(db.clone(), sse_tx, job.clone());
        
        // Process the section with the worker
        let section_draft = worker.process_section(&section.key, &section.title, &job.topic, job.depth).await?;
        
        // Update section with final content and mark as complete
        db.update_section_progress(&section.id, 100, &section_draft.content).await?;
        
        // Send completion event
        let chunk_event = serde_json::to_string(&crate::models::SseEvent {
            kind: "chunk".to_string(),
            text: Some(section_draft.content),
            section_key: Some(section.key),
            section_title: Some(section.title),
            progress: Some(100),
        })?;
        let _ = sse_tx.send(chunk_event);
        
        Ok(())
    }

    pub async fn finalize_job(&self, job_id: &str) -> Result<()> {
        // Collect all sections for the job
        let sections = self.db.get_sections_by_job(job_id).await?;
        
        // Aggregate and deduplicate citations
        let mut all_citations = Vec::new();
        for section in sections {
            // In a real implementation, we would parse the citations from section.output_md
            // For now, we'll just send a placeholder event
        }
        
        // Update job status to "complete"
        self.db.update_job_status(job_id, "complete").await?;
        
        Ok(())
    }
}