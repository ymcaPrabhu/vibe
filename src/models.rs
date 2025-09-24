use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Job {
    pub id: String,
    pub topic: String,
    pub depth: i32,
    pub created_at: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewJob {
    pub id: String,
    pub topic: String,
    pub depth: i32,
    pub created_at: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Section {
    pub id: String,
    pub job_id: String,
    pub key: String,
    pub title: String,
    pub progress: i32,
    pub status: String,
    pub output_md: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewSection {
    pub id: String,
    pub job_id: String,
    pub key: String,
    pub title: String,
    pub progress: i32,
    pub status: String,
    pub output_md: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub job_id: String,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewMessage {
    pub id: String,
    pub job_id: String,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Citation {
    pub doi: Option<String>,
    pub url: String,
    pub title: String,
    pub publisher: String,
    pub year: i32,
    pub access_date: DateTime<Utc>,
    pub page_section: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SectionDraft {
    pub content: String,
    pub citations: Vec<Citation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JobSubmission {
    pub topic: String,
    pub depth: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SseEvent {
    pub kind: String,
    pub text: Option<String>,
    pub section_key: Option<String>,
    pub section_title: Option<String>,
    pub progress: Option<i32>,
}