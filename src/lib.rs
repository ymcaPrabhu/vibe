pub mod api;
pub mod artifacts;
pub mod db;
pub mod handlers;
pub mod manager;
pub mod models;
pub mod utils;
pub mod workers;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

use crate::db::Database;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Database>,
}

// Global SSE channels storage
lazy_static::lazy_static! {
    pub static ref SSE_CHANNELS: Arc<RwLock<HashMap<String, broadcast::Sender<crate::models::SseEvent>>>> =
        Arc::new(RwLock::new(HashMap::new()));
}