use sqlx::{Pool, Row, Sqlite, sqlite::SqlitePool, postgres::PgPool};
use crate::models::{Job, NewJob, Section, NewSection, Message, NewMessage};
use anyhow::Result;

pub struct Database {
    sqlite_pool: Option<SqlitePool>,
    pg_pool: Option<PgPool>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
            let pg_pool = PgPool::connect(database_url).await?;
            Ok(Database {
                sqlite_pool: None,
                pg_pool: Some(pg_pool),
            })
        } else {
            let sqlite_pool = SqlitePool::connect(database_url).await?;
            Ok(Database {
                sqlite_pool: Some(sqlite_pool),
                pg_pool: None,
            })
        }
    }

    pub fn get_pg_pool(&self) -> Option<&PgPool> {
        self.pg_pool.as_ref()
    }

    pub fn get_sqlite_pool(&self) -> Option<&SqlitePool> {
        self.sqlite_pool.as_ref()
    }

    pub async fn create_job(&self, new_job: NewJob) -> Result<Job> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Job,
                r#"
                INSERT INTO jobs (id, topic, depth, created_at, status)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, topic, depth, created_at, status
                "#,
                new_job.id,
                new_job.topic,
                new_job.depth,
                new_job.created_at,
                new_job.status
            )
            .fetch_one(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Job,
                r#"
                INSERT INTO jobs (id, topic, depth, created_at, status)
                VALUES (?1, ?2, ?3, ?4, ?5)
                RETURNING id, topic, depth, created_at, status
                "#,
                new_job.id,
                new_job.topic,
                new_job.depth,
                new_job.created_at,
                new_job.status
            )
            .fetch_one(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn get_job(&self, job_id: &str) -> Result<Option<Job>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Job,
                r#"
                SELECT id, topic, depth, created_at, status
                FROM jobs
                WHERE id = $1
                "#,
                job_id
            )
            .fetch_optional(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Job,
                r#"
                SELECT id, topic, depth, created_at, status
                FROM jobs
                WHERE id = ?1
                "#,
                job_id
            )
            .fetch_optional(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn update_job_status(&self, job_id: &str, status: &str) -> Result<()> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query!(
                r#"
                UPDATE jobs
                SET status = $1
                WHERE id = $2
                "#,
                status,
                job_id
            )
            .execute(pg_pool)
            .await?;
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query!(
                r#"
                UPDATE jobs
                SET status = ?1
                WHERE id = ?2
                "#,
                status,
                job_id
            )
            .execute(sqlite_pool)
            .await?;
        }
        Ok(())
    }

    pub async fn create_section(&self, new_section: NewSection) -> Result<Section> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Section,
                r#"
                INSERT INTO sections (id, job_id, key, title, progress, status, output_md)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, job_id, key, title, progress, status, output_md
                "#,
                new_section.id,
                new_section.job_id,
                new_section.key,
                new_section.title,
                new_section.progress,
                new_section.status,
                new_section.output_md
            )
            .fetch_one(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Section,
                r#"
                INSERT INTO sections (id, job_id, key, title, progress, status, output_md)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                RETURNING id, job_id, key, title, progress, status, output_md
                "#,
                new_section.id,
                new_section.job_id,
                new_section.key,
                new_section.title,
                new_section.progress,
                new_section.status,
                new_section.output_md
            )
            .fetch_one(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn update_section_progress(&self, section_id: &str, progress: i32, output_md: &str) -> Result<()> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query!(
                r#"
                UPDATE sections
                SET progress = $1, output_md = $2
                WHERE id = $3
                "#,
                progress,
                output_md,
                section_id
            )
            .execute(pg_pool)
            .await?;
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query!(
                r#"
                UPDATE sections
                SET progress = ?1, output_md = ?2
                WHERE id = ?3
                "#,
                progress,
                output_md,
                section_id
            )
            .execute(sqlite_pool)
            .await?;
        }
        Ok(())
    }

    pub async fn get_sections_by_job(&self, job_id: &str) -> Result<Vec<Section>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Section,
                r#"
                SELECT id, job_id, key, title, progress, status, output_md
                FROM sections
                WHERE job_id = $1
                ORDER BY key
                "#,
                job_id
            )
            .fetch_all(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Section,
                r#"
                SELECT id, job_id, key, title, progress, status, output_md
                FROM sections
                WHERE job_id = ?1
                ORDER BY key
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

    pub async fn create_message(&self, new_message: NewMessage) -> Result<Message> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Message,
                r#"
                INSERT INTO messages (id, job_id, role, content, created_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, job_id, role, content, created_at
                "#,
                new_message.id,
                new_message.job_id,
                new_message.role,
                new_message.content,
                new_message.created_at
            )
            .fetch_one(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Message,
                r#"
                INSERT INTO messages (id, job_id, role, content, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5)
                RETURNING id, job_id, role, content, created_at
                "#,
                new_message.id,
                new_message.job_id,
                new_message.role,
                new_message.content,
                new_message.created_at
            )
            .fetch_one(sqlite_pool)
            .await
            .map_err(|e| e.into())
        } else {
            Err(anyhow::anyhow!("No database pool available"))
        }
    }

    pub async fn get_messages_by_job(&self, job_id: &str) -> Result<Vec<Message>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Message,
                r#"
                SELECT id, job_id, role, content, created_at
                FROM messages
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
                Message,
                r#"
                SELECT id, job_id, role, content, created_at
                FROM messages
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

    pub async fn get_job_history(&self) -> Result<Vec<Job>> {
        if let Some(pg_pool) = &self.pg_pool {
            sqlx::query_as!(
                Job,
                r#"
                SELECT id, topic, depth, created_at, status
                FROM jobs
                ORDER BY created_at DESC
                LIMIT 50
                "#
            )
            .fetch_all(pg_pool)
            .await
            .map_err(|e| e.into())
        } else if let Some(sqlite_pool) = &self.sqlite_pool {
            sqlx::query_as!(
                Job,
                r#"
                SELECT id, topic, depth, created_at, status
                FROM jobs
                ORDER BY created_at DESC
                LIMIT 50
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