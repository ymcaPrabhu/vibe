use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::Result;
use sqlx::{Pool, Row, PgPool, SqlitePool};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Artifact {
    pub id: String,
    pub job_id: String,
    pub section_key: String,
    pub title: String,
    pub artifact_type: String, // "dataset", "code", "figure", "table", "link", etc.
    pub content: String,      // URL or serialized content
    pub description: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewArtifact {
    pub id: String,
    pub job_id: String,
    pub section_key: String,
    pub title: String,
    pub artifact_type: String,
    pub content: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
}

pub struct ArtifactStore {
    pub sqlite_pool: Option<SqlitePool>,
    pub pg_pool: Option<PgPool>,
}

impl ArtifactStore {
    pub async fn new(database_url: &str) -> Result<Self> {
        if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
            let pg_pool = PgPool::connect(database_url).await?;
            Ok(ArtifactStore {
                sqlite_pool: None,
                pg_pool: Some(pg_pool),
            })
        } else {
            let sqlite_pool = SqlitePool::connect(database_url).await?;
            Ok(ArtifactStore {
                sqlite_pool: Some(sqlite_pool),
                pg_pool: None,
            })
        }
    }

    pub async fn create_artifact(&self, new_artifact: NewArtifact) -> Result<Artifact> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                INSERT INTO artifacts (id, job_id, section_key, title, artifact_type, content, description, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, job_id, section_key, title, artifact_type, content, description, created_at
                "#,
                new_artifact.id,
                new_artifact.job_id,
                new_artifact.section_key,
                new_artifact.title,
                new_artifact.artifact_type,
                new_artifact.content,
                new_artifact.description,
                new_artifact.created_at
            )
            .fetch_one(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                INSERT INTO artifacts (id, job_id, section_key, title, artifact_type, content, description, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                RETURNING id, job_id, section_key, title, artifact_type, content, description, created_at
                "#,
                new_artifact.id,
                new_artifact.job_id,
                new_artifact.section_key,
                new_artifact.title,
                new_artifact.artifact_type,
                new_artifact.content,
                new_artifact.description,
                new_artifact.created_at
            )
            .fetch_one(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn get_artifacts_by_job(&self, job_id: &str) -> Result<Vec<Artifact>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
                FROM artifacts
                WHERE job_id = $1
                ORDER BY created_at
                "#,
                job_id
            )
            .fetch_all(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
                FROM artifacts
                WHERE job_id = ?1
                ORDER BY created_at
                "#,
                job_id
            )
            .fetch_all(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn get_artifacts_by_section(&self, job_id: &str, section_key: &str) -> Result<Vec<Artifact>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
                FROM artifacts
                WHERE job_id = $1 AND section_key = $2
                ORDER BY created_at
                "#,
                job_id,
                section_key
            )
            .fetch_all(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
                FROM artifacts
                WHERE job_id = ?1 AND section_key = ?2
                ORDER BY created_at
                "#,
                job_id,
                section_key
            )
            .fetch_all(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn get_all_artifacts(&self) -> Result<Vec<Artifact>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
                FROM artifacts
                ORDER BY created_at DESC
                LIMIT 1000
                "#
            )
            .fetch_all(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Artifact,
                r#"
                SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
                FROM artifacts
                ORDER BY created_at DESC
                LIMIT 1000
                "#
            )
            .fetch_all(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }
}