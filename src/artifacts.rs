use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Artifact {
    pub id: String,
    pub job_id: String,
    pub section_key: String,
    pub title: String,
    pub artifact_type: String, // "dataset", "code", "figure", "table", "link", etc.
    pub content: String,       // URL or serialized content
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
    pub sqlite_pool: SqlitePool,
}

impl ArtifactStore {
    pub async fn new(database_url: &str) -> Result<Self> {
        let sqlite_pool = SqlitePool::connect(database_url).await?;
        Ok(ArtifactStore { sqlite_pool })
    }

    pub async fn create_artifact(&self, new_artifact: NewArtifact) -> Result<Artifact> {
        sqlx::query!(
            r#"
            INSERT INTO artifacts (id, job_id, section_key, title, artifact_type, content, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        .execute(&self.sqlite_pool)
        .await?;

        Ok(Artifact {
            id: new_artifact.id,
            job_id: new_artifact.job_id,
            section_key: new_artifact.section_key,
            title: new_artifact.title,
            artifact_type: new_artifact.artifact_type,
            content: new_artifact.content,
            description: new_artifact.description,
            created_at: new_artifact.created_at,
        })
    }

    pub async fn get_artifacts_by_job(&self, job_id: &str) -> Result<Vec<Artifact>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
            FROM artifacts
            WHERE job_id = ?
            ORDER BY created_at
            "#,
            job_id
        )
        .fetch_all(&self.sqlite_pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Artifact {
                id: row.id.unwrap(),
                job_id: row.job_id,
                section_key: row.section_key,
                title: row.title,
                artifact_type: row.artifact_type,
                content: row.content,
                description: row.description,
                created_at: chrono::DateTime::from_naive_utc_and_offset(row.created_at, chrono::Utc),
            })
            .collect())
    }

    #[allow(dead_code)]
    pub async fn get_artifacts_by_section(
        &self,
        job_id: &str,
        section_key: &str,
    ) -> Result<Vec<Artifact>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, job_id, section_key, title, artifact_type, content, description, created_at
            FROM artifacts
            WHERE job_id = ? AND section_key = ?
            ORDER BY created_at
            "#,
            job_id,
            section_key
        )
        .fetch_all(&self.sqlite_pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Artifact {
                id: row.id.unwrap(),
                job_id: row.job_id,
                section_key: row.section_key,
                title: row.title,
                artifact_type: row.artifact_type,
                content: row.content,
                description: row.description,
                created_at: chrono::DateTime::from_naive_utc_and_offset(row.created_at, chrono::Utc),
            })
            .collect())
    }
}
