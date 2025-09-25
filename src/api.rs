use axum::{
    extract::{Path, State},
    response::Sse,
    Json,
};
use futures::stream::Stream;
use std::sync::Arc;
use tokio::sync::broadcast;

use crate::{
    manager::Manager,
    models::{Job, JobSubmission},
    AppState,
};

pub async fn submit_job(
    State(app_state): State<AppState>,
    Json(payload): Json<JobSubmission>,
) -> Result<Json<Job>, String> {
    let job_id = uuid::Uuid::new_v4().to_string();

    let new_job = crate::models::NewJob {
        id: job_id.clone(),
        topic: payload.topic,
        depth: payload.depth,
        created_at: chrono::Utc::now(),
        status: "submitted".to_string(),
    };

    let job = app_state
        .db
        .create_job(new_job)
        .await
        .map_err(|e| format!("Failed to create job: {}", e))?;

    // Create a broadcast channel for SSE events
    let (sse_tx, _) = broadcast::channel(100);

    // Store the channel for this job
    {
        let mut channels = crate::SSE_CHANNELS.write().await;
        channels.insert(job_id.clone(), sse_tx.clone());
    }

    // Create artifact store
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let artifact_store = Arc::new(
        crate::artifacts::ArtifactStore::new(&database_url)
            .await
            .unwrap(),
    );

    // Process the job in the background - create a new manager instance for this specific job
    let db_clone = app_state.db.clone();
    let sse_tx_clone = sse_tx.clone();
    let job_clone = job.clone();
    let job_id_clone = job_id.clone();
    tokio::spawn(async move {
        let manager = Manager::new(db_clone, artifact_store.clone(), sse_tx_clone.clone());

        // Process the job (this now waits for all sections to complete)
        if let Err(e) = manager.process_job(job_clone).await {
            tracing::error!("Error processing job: {}", e);

            // Send error event
            let error_event = crate::models::SseEvent {
                kind: "error".to_string(),
                text: Some(format!("Job processing failed: {}", e)),
                section_key: None,
                section_title: None,
                progress: None,
            };
            let _ = sse_tx_clone.send(error_event);
            return;
        }

        // Wait for the job handle to complete (all sections finished)
        let handle_option = manager.take_job_handle(&job_id_clone).await;

        if let Some(handle) = handle_option {
            if let Err(e) = handle.await {
                tracing::error!("Job handle error: {}", e);
            }
        }

        // Now finalize the job and send completion event
        if let Err(e) = manager.finalize_job(&job_id_clone).await {
            tracing::error!("Error finalizing job: {}", e);
        } else {
            // Send job complete event
            let complete_event = crate::models::SseEvent {
                kind: "job_complete".to_string(),
                text: Some("Research completed successfully".to_string()),
                section_key: None,
                section_title: None,
                progress: Some(100),
            };
            let _ = sse_tx_clone.send(complete_event);
        }
    });

    Ok(Json(job))
}

pub async fn get_job_history(State(app_state): State<AppState>) -> Result<Json<Vec<Job>>, String> {
    let jobs = app_state
        .db
        .get_job_history()
        .await
        .map_err(|e| format!("Failed to retrieve job history: {}", e))?;

    Ok(Json(jobs))
}

pub async fn stream_job(
    State(_app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Sse<impl Stream<Item = Result<axum::response::sse::Event, serde_json::Error>>> {
    // Look up the SSE channel for this job
    let sse_tx_option = {
        let channels = crate::SSE_CHANNELS.read().await;
        channels.get(&job_id).cloned()
    };

    // Use a channel to handle both cases with the same type
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();

    if let Some(sse_tx) = sse_tx_option {
        // Forward events from the broadcast channel to the mpsc channel
        let mut broadcast_rx = sse_tx.subscribe();
        tokio::spawn(async move {
            while let Ok(data) = broadcast_rx.recv().await {
                let event = axum::response::sse::Event::default()
                    .json_data(data)
                    .unwrap_or_else(|e| {
                        tracing::error!("Failed to serialize SSE data: {}", e);
                        axum::response::sse::Event::default()
                    });
                if tx.send(Ok(event)).is_err() {
                    break; // Client disconnected
                }
            }
        });
    }

    let stream = tokio_stream::wrappers::UnboundedReceiverStream::new(rx);
    Sse::new(stream)
}

pub async fn cancel_job(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<Job>, (axum::http::StatusCode, String)> {
    // Create manager instance to handle cancellation
    let sse_tx = {
        let channels = crate::SSE_CHANNELS.read().await;
        channels.get(&job_id).cloned()
    };

    if let Some(sse_tx) = sse_tx {
        // Create artifact store
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let artifact_store = Arc::new(
            crate::artifacts::ArtifactStore::new(&database_url)
                .await
                .unwrap(),
        );

        let manager = Manager::new(app_state.db.clone(), artifact_store, sse_tx);

        if let Err(e) = manager.cancel_job(&job_id).await {
            return Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }

        match app_state.db.get_job(&job_id).await {
            Ok(Some(job)) => Ok(Json(job)),
            Ok(None) => Err((
                axum::http::StatusCode::NOT_FOUND,
                "Job not found".to_string(),
            )),
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    } else {
        Err((
            axum::http::StatusCode::NOT_FOUND,
            "Job stream not found".to_string(),
        ))
    }
}

pub async fn resume_job(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<Job>, (axum::http::StatusCode, String)> {
    // Create manager instance to handle resumption
    let sse_tx = {
        let channels = crate::SSE_CHANNELS.read().await;
        channels.get(&job_id).cloned()
    };

    if let Some(sse_tx) = sse_tx {
        // Create artifact store
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let artifact_store = Arc::new(
            crate::artifacts::ArtifactStore::new(&database_url)
                .await
                .unwrap(),
        );
        let manager = Manager::new(app_state.db.clone(), artifact_store, sse_tx);

        if let Err(e) = manager.resume_job(&job_id).await {
            return Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }

        match app_state.db.get_job(&job_id).await {
            Ok(Some(job)) => Ok(Json(job)),
            Ok(None) => Err((
                axum::http::StatusCode::NOT_FOUND,
                "Job not found".to_string(),
            )),
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    } else {
        Err((
            axum::http::StatusCode::NOT_FOUND,
            "Job stream not found".to_string(),
        ))
    }
}

pub async fn get_job_status(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<Job>, (axum::http::StatusCode, String)> {
    // Create manager instance to handle status request
    let sse_tx = {
        let channels = crate::SSE_CHANNELS.read().await;
        channels.get(&job_id).cloned()
    };

    if let Some(sse_tx) = sse_tx {
        // Create artifact store
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let artifact_store = Arc::new(
            crate::artifacts::ArtifactStore::new(&database_url)
                .await
                .unwrap(),
        );
        let manager = Manager::new(app_state.db.clone(), artifact_store, sse_tx);

        match manager.get_job_status(&job_id).await {
            Ok(job) => Ok(Json(job)),
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    } else {
        // If we can't get the SSE channel, we can still get job status from DB
        match app_state.db.get_job(&job_id).await {
            Ok(Some(job)) => Ok(Json(job)),
            Ok(None) => Err((
                axum::http::StatusCode::NOT_FOUND,
                "Job not found".to_string(),
            )),
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    }
}

pub async fn get_job_sections(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<Vec<crate::models::Section>>, (axum::http::StatusCode, String)> {
    match app_state.db.get_sections_by_job(&job_id).await {
        Ok(sections) => Ok(Json(sections)),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// New endpoint to load a complete job with its content for history
pub async fn load_job_content(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // Get the job
    let job = match app_state.db.get_job(&job_id).await {
        Ok(Some(job)) => job,
        Ok(None) => return Err((axum::http::StatusCode::NOT_FOUND, "Job not found".to_string())),
        Err(e) => return Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    };

    // Get all sections for this job
    let sections = match app_state.db.get_sections_by_job(&job_id).await {
        Ok(sections) => sections,
        Err(e) => return Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    };

    // Combine into a response
    let response = serde_json::json!({
        "job": job,
        "sections": sections
    });

    Ok(Json(response))
}
