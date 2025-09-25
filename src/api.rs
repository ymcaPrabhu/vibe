use axum::{
    extract::{State, Path},
    response::Sse,
    Json,
};
use futures::stream::Stream;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::{self as stream};

use crate::{
    db::Database,
    models::{JobSubmission, Job, SseEvent},
    manager::Manager,
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
    
    // Create manager instance
    let manager = match Manager::new(app_state.db.clone(), sse_tx).await {
        Ok(manager) => manager,
        Err(e) => {
            return Err(format!("Failed to create manager: {}", e));
        }
    };
    
    // Process the job in the background
    let job_clone = job.clone();
    tokio::spawn(async move {
        if let Err(e) = manager.process_job(job_clone).await {
            tracing::error!("Error processing job: {}", e);
        }
        
        // Mark job as complete
        if let Err(e) = manager.finalize_job(&job_id).await {
            tracing::error!("Error finalizing job: {}", e);
        }
    });
    
    Ok(Json(job))
}

pub async fn get_job_history(
    State(app_state): State<AppState>,
) -> Result<Json<Vec<Job>>, String> {
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
    
    if let Some(sse_tx) = sse_tx_option {
        // Create a broadcast receiver from the sender
        let rx = sse_tx.subscribe();
        let stream = BroadcastStream::new(rx)
            .filter_map(|result| match result {
                Ok(data) => Some(Ok(axum::response::sse::Event::default()
                    .json_data(data)
                    .unwrap_or_else(|e| {
                        tracing::error!("Failed to serialize SSE data: {}", e);
                        axum::response::sse::Event::default()
                    }))),
                Err(e) => {
                    tracing::error!("Broadcast error: {}", e);
                    None
                }
            });
        
        Sse::new(stream)
    } else {
        // If no channel exists, return an empty stream
        let stream = stream::empty();
        Sse::new(stream)
    }
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
        match Manager::new(app_state.db.clone(), sse_tx).await {
            Ok(manager) => {
                if let Err(e) = manager.cancel_job(&job_id).await {
                    return Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
                }
                
                match app_state.db.get_job(&job_id).await {
                    Ok(Some(job)) => Ok(Json(job)),
                    Ok(None) => Err((axum::http::StatusCode::NOT_FOUND, "Job not found".to_string())),
                    Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
                }
            }
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    } else {
        Err((axum::http::StatusCode::NOT_FOUND, "Job stream not found".to_string()))
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
        match Manager::new(app_state.db.clone(), sse_tx).await {
            Ok(manager) => {
                if let Err(e) = manager.resume_job(&job_id).await {
                    return Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
                }
                
                match app_state.db.get_job(&job_id).await {
                    Ok(Some(job)) => Ok(Json(job)),
                    Ok(None) => Err((axum::http::StatusCode::NOT_FOUND, "Job not found".to_string())),
                    Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
                }
            }
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    } else {
        Err((axum::http::StatusCode::NOT_FOUND, "Job stream not found".to_string()))
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
        match Manager::new(app_state.db.clone(), sse_tx).await {
            Ok(manager) => {
                match manager.get_job_status(&job_id).await {
                    Ok(job) => Ok(Json(job)),
                    Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
                }
            }
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    } else {
        // If we can't get the SSE channel, we can still get job status from DB
        match app_state.db.get_job(&job_id).await {
            Ok(Some(job)) => Ok(Json(job)),
            Ok(None) => Err((axum::http::StatusCode::NOT_FOUND, "Job not found".to_string())),
            Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        }
    }
}