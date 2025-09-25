use axum::{
    extract::{Path, State},
    response::{Html, Sse},
    Json,
};
use futures::stream::Stream;

use crate::{
    api::{
        get_job_history as api_get_job_history, get_job_sections as api_get_job_sections,
        stream_job as api_stream_job, submit_job as api_submit_job,
    },
    models::JobSubmission,
    AppState,
};

pub async fn submit_handler(
    State(app_state): State<AppState>,
    Json(payload): Json<JobSubmission>,
) -> Result<Json<crate::models::Job>, (axum::http::StatusCode, String)> {
    api_submit_job(State(app_state), Json(payload))
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))
}

pub async fn history_handler(
    State(app_state): State<AppState>,
) -> Result<Json<Vec<crate::models::Job>>, (axum::http::StatusCode, String)> {
    api_get_job_history(State(app_state))
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))
}

pub async fn stream_handler(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Sse<impl Stream<Item = Result<axum::response::sse::Event, serde_json::Error>>> {
    api_stream_job(State(app_state), Path(job_id)).await
}

pub async fn cancel_handler(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<crate::models::Job>, (axum::http::StatusCode, String)> {
    crate::api::cancel_job(State(app_state), Path(job_id))
        .await
}

pub async fn resume_handler(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<crate::models::Job>, (axum::http::StatusCode, String)> {
    crate::api::resume_job(State(app_state), Path(job_id))
        .await
}

pub async fn status_handler(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<crate::models::Job>, (axum::http::StatusCode, String)> {
    crate::api::get_job_status(State(app_state), Path(job_id))
        .await
}

pub async fn sections_handler(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<Vec<crate::models::Section>>, (axum::http::StatusCode, String)> {
    api_get_job_sections(State(app_state), Path(job_id))
        .await
}

pub async fn load_job_handler(
    State(app_state): State<AppState>,
    Path(job_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    crate::api::load_job_content(State(app_state), Path(job_id))
        .await
}

pub async fn index_handler() -> Html<String> {
    Html(std::fs::read_to_string("static/index.html").unwrap_or_else(|_| {
        "<!DOCTYPE html><html><head><title>Server Error</title></head><body><h1>Unable to load application</h1></body></html>".to_string()
    }).into())
}
