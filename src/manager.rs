use crate::artifacts::ArtifactStore;
use crate::db::Database;
use crate::models::{Citation, Job, NewSection, Section, SseEvent};
use crate::workers::Worker;
use anyhow::Result;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::RwLock;
use uuid::Uuid;

pub struct Manager {
    db: Arc<Database>,
    artifact_store: Arc<ArtifactStore>,
    sse_tx: broadcast::Sender<SseEvent>,
    // Track active jobs for cancellation
    active_jobs: Arc<RwLock<HashMap<String, tokio::task::JoinHandle<()>>>>,
}

impl Manager {
    pub fn new(
        db: Arc<Database>,
        artifact_store: Arc<ArtifactStore>,
        sse_tx: broadcast::Sender<SseEvent>,
    ) -> Self {
        Manager {
            db,
            artifact_store,
            sse_tx,
            active_jobs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn process_job(&self, job: Job) -> Result<()> {
        // Generate comprehensive outline
        let outline = self.generate_outline(&job.topic, job.depth).await?;

        // Send outline event
        let outline_text = outline.iter()
            .map(|(_, title)| format!("• {}", title))
            .collect::<Vec<_>>()
            .join("\n");

        let outline_event = crate::models::SseEvent {
            kind: "outline".to_string(),
            text: Some(outline_text),
            section_key: None,
            section_title: None,
            progress: None,
        };
        let _ = self.sse_tx.send(outline_event);

        // Update job status to "processing"
        self.db.update_job_status(&job.id, "processing").await?;

        // Create sections for each outline item
        let mut sections = Vec::new();
        for (key, title) in outline.iter() {
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

        // Store the job handle in active jobs tracking
        let job_id = job.id.clone();
        let db_clone = self.db.clone();
        let artifact_store_clone = self.artifact_store.clone();
        let sse_tx_clone = self.sse_tx.clone();
        let job_clone = job.clone();

        let handle = tokio::spawn(async move {
            // Process all sections in parallel
            let mut handles = Vec::new();

            for section in sections {
                let db = db_clone.clone();
                let artifact_store = artifact_store_clone.clone();
                let sse_tx = sse_tx_clone.clone();
                let job = job_clone.clone();

                let handle = tokio::spawn(async move {
                    if let Err(e) = Self::process_section(
                        db,
                        artifact_store,
                        sse_tx,
                        job,
                        section,
                    ).await {
                        tracing::error!("Error processing section: {}", e);
                    }
                });
                handles.push(handle);
            }

            // Wait for all sections to complete
            for handle in handles {
                let _ = handle.await;
            }
        });

        {
            let mut active_jobs = self.active_jobs.write().await;
            active_jobs.insert(job_id, handle);
        }

        Ok(())
    }

    async fn generate_outline(&self, _topic: &str, depth: i32) -> Result<Vec<(String, String)>> {
        // Generate the standard outline structure
        let mut outline = Vec::new();

        // 1. Executive Summary
        outline.push((
            "executive_summary".to_string(),
            "Executive Summary".to_string(),
        ));

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
        artifact_store: Arc<ArtifactStore>,
        sse_tx: broadcast::Sender<SseEvent>,
        job: Job,
        section: Section,
    ) -> Result<()> {
        // Send worker start event
        let worker_start_event = crate::models::SseEvent {
            kind: "worker_start".to_string(),
            text: None,
            section_key: Some(section.key.clone()),
            section_title: Some(section.title.clone()),
            progress: Some(0),
        };
        let _ = sse_tx.send(worker_start_event);

        // Update section status to "in_progress"
        db.update_section_progress(&section.id, 0, "").await?;

        // Create a worker to handle this section
        let worker = Worker::new(db.clone(), artifact_store, sse_tx.clone(), job.clone());

        // Process the section with the worker - this will send progress updates internally
        let section_draft = worker
            .process_section(&section.key, &section.title, &job.topic, job.depth)
            .await?;

        // Update section with final content and mark as complete
        db.update_section_progress(&section.id, 100, &section_draft.content)
            .await?;

        // Send worker complete event
        let worker_complete_event = crate::models::SseEvent {
            kind: "worker_complete".to_string(),
            text: None,
            section_key: Some(section.key.clone()),
            section_title: Some(section.title.clone()),
            progress: Some(100),
        };
        let _ = sse_tx.send(worker_complete_event);

        // Send content event
        let content_event = crate::models::SseEvent {
            kind: "content".to_string(),
            text: Some(section_draft.content),
            section_key: Some(section.key),
            section_title: Some(section.title),
            progress: Some(100),
        };
        let _ = sse_tx.send(content_event);

        Ok(())
    }

    pub async fn finalize_job(&self, job_id: &str) -> Result<()> {
        // Collect all sections for the job
        let sections = self.db.get_sections_by_job(job_id).await?;
        let sections_count = sections.len(); // Store the count before iterating

        // Collect all artifacts for the job
        let artifacts = self.artifact_store.get_artifacts_by_job(job_id).await?;

        // Aggregate and deduplicate citations
        let _all_citations: Vec<Citation> = Vec::new();
        for _section in sections {
            // In a real implementation, we would parse the citations from section.output_md
            // For now, we'll just send a placeholder event
        }

        // Log artifact count for this job (in a real implementation, we'd use these in the final report)
        tracing::info!(
            "Job {} completed with {} sections and {} artifacts",
            job_id,
            sections_count,
            artifacts.len()
        );

        // Update job status to "complete"
        self.db.update_job_status(job_id, "complete").await?;

        // Remove from active jobs tracking
        {
            let mut active_jobs = self.active_jobs.write().await;
            active_jobs.remove(job_id);
        }

        Ok(())
    }

    // Cancel a running job
    pub async fn cancel_job(&self, job_id: &str) -> Result<()> {
        // Get the job's task handle and abort it
        {
            let active_jobs = self.active_jobs.read().await;
            if let Some(handle) = active_jobs.get(job_id) {
                handle.abort();
            }
        }

        // Update job status to cancelled
        self.db.update_job_status(job_id, "cancelled").await?;

        // Send cancellation event via SSE
        let cancel_event = crate::models::SseEvent {
            kind: "cancel".to_string(),
            text: Some("Job was cancelled by user".to_string()),
            section_key: None,
            section_title: None,
            progress: None,
        };
        let _ = self.sse_tx.send(cancel_event);

        Ok(())
    }

    // Resume a previously cancelled or failed job
    pub async fn resume_job(&self, job_id: &str) -> Result<()> {
        let job = self.db.get_job(job_id).await?;

        if let Some(job) = job {
            if job.status == "cancelled" || job.status.contains("failed") {
                // Update job status to processing
                self.db.update_job_status(job_id, "processing").await?;

                // Get sections and reset progress
                let sections = self.db.get_sections_by_job(job_id).await?;
                for section in sections {
                    self.db.update_section_progress(&section.id, 0, "").await?;
                }

                // Create a new manager instance for this specific job
                let db_clone = self.db.clone();
                let sse_tx = {
                    let channels = crate::SSE_CHANNELS.read().await;
                    channels.get(job_id).cloned()
                };

                if let Some(sse_tx) = sse_tx {
                    // Create artifact store
                    let database_url =
                        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
                    let artifact_store = Arc::new(
                        crate::artifacts::ArtifactStore::new(&database_url)
                            .await
                            .unwrap(),
                    );

                    let manager = Manager::new(db_clone, artifact_store, sse_tx);
                    let job_clone = job.clone();
                    let job_id = job_id.to_string(); // Convert to owned value
                    tokio::spawn(async move {
                        if let Err(e) = manager.process_job(job_clone).await {
                            tracing::error!("Error processing resumed job: {}", e);
                        }

                        if let Err(e) = manager.finalize_job(&job_id).await {
                            tracing::error!("Error finalizing resumed job: {}", e);
                        }
                    });
                } else {
                    return Err(anyhow::anyhow!("SSE channel not found for job {}", job_id));
                }

                Ok(())
            } else {
                Err(anyhow::anyhow!(
                    "Job cannot be resumed in its current state: {}",
                    job.status
                ))
            }
        } else {
            Err(anyhow::anyhow!("Job not found"))
        }
    }

    // Get status of a specific job
    pub async fn get_job_status(&self, job_id: &str) -> Result<Job> {
        if let Some(job) = self.db.get_job(job_id).await? {
            Ok(job)
        } else {
            Err(anyhow::anyhow!("Job not found"))
        }
    }

    // Get and remove a job handle (for waiting on completion)
    pub async fn take_job_handle(&self, job_id: &str) -> Option<tokio::task::JoinHandle<()>> {
        let mut active_jobs = self.active_jobs.write().await;
        active_jobs.remove(job_id)
    }
}
