mod api;
mod artifacts;
mod db;
mod handlers;
mod manager;
mod models;
mod utils;
mod workers;

use axum::{
    http::Method,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tokio::signal;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::db::Database;
use crate::models::SseEvent;

use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::broadcast;
use tokio::sync::RwLock;

// Global store for SSE channels (in production, this would be in Redis or similar)
static SSE_CHANNELS: LazyLock<RwLock<HashMap<String, broadcast::Sender<SseEvent>>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Database>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cybersecurity_research_app=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize database
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let db = Arc::new(Database::new(&database_url).await?);

    // Create application state
    let app_state = AppState { db };

    // Build CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    // Build our application with a route
    let app = Router::new()
        .nest_service("/static", ServeDir::new("static"))
        .route("/", get(handlers::index_handler))
        .route("/api/submit", post(handlers::submit_handler))
        .route("/api/history", get(handlers::history_handler))
        .route("/api/jobs/:job_id/stream", get(handlers::stream_handler))
        .route("/api/jobs/:job_id/cancel", post(handlers::cancel_handler))
        .route("/api/jobs/:job_id/resume", post(handlers::resume_handler))
        .route("/api/jobs/:job_id/status", get(handlers::status_handler))
        .route("/api/jobs/:job_id/sections", get(handlers::sections_handler))
        .route("/api/jobs/:job_id/load", get(handlers::load_job_handler))
        .layer(cors)
        .with_state(app_state);

    // Run server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::debug!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::debug!("shutdown signal received, starting graceful shutdown");
}
