use crate::models::{Job, Message, NewJob, NewMessage, NewSection, Section};
use anyhow::Result;
use sqlx::sqlite::SqlitePool;

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = SqlitePool::connect(database_url).await?;
        Ok(Database { pool })
    }

    pub async fn create_job(&self, new_job: NewJob) -> Result<Job> {
        sqlx::query!(
            r#"
            INSERT INTO jobs (id, topic, depth, created_at, status)
            VALUES (?, ?, ?, ?, ?)
            "#,
            new_job.id,
            new_job.topic,
            new_job.depth,
            new_job.created_at,
            new_job.status
        )
        .execute(&self.pool)
        .await?;

        Ok(Job {
            id: new_job.id,
            topic: new_job.topic,
            depth: new_job.depth,
            created_at: new_job.created_at,
            status: new_job.status,
        })
    }

    pub async fn get_job(&self, job_id: &str) -> Result<Option<Job>> {
        let job = sqlx::query!(
            r#"
            SELECT id, topic, depth, created_at, status
            FROM jobs
            WHERE id = ?
            "#,
            job_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(job.map(|row| Job {
            id: row.id.unwrap(),
            topic: row.topic,
            depth: row.depth as i32,
            created_at: chrono::DateTime::from_naive_utc_and_offset(row.created_at, chrono::Utc),
            status: row.status,
        }))
    }

    pub async fn update_job_status(&self, job_id: &str, status: &str) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE jobs
            SET status = ?
            WHERE id = ?
            "#,
            status,
            job_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_section(&self, new_section: NewSection) -> Result<Section> {
        sqlx::query!(
            r#"
            INSERT INTO sections (id, job_id, key, title, progress, status, output_md)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
            new_section.id,
            new_section.job_id,
            new_section.key,
            new_section.title,
            new_section.progress,
            new_section.status,
            new_section.output_md
        )
        .execute(&self.pool)
        .await?;

        Ok(Section {
            id: new_section.id,
            job_id: new_section.job_id,
            key: new_section.key,
            title: new_section.title,
            progress: new_section.progress,
            status: new_section.status,
            output_md: new_section.output_md,
        })
    }

    pub async fn update_section_progress(
        &self,
        section_id: &str,
        progress: i32,
        output_md: &str,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE sections
            SET progress = ?, output_md = ?
            WHERE id = ?
            "#,
            progress,
            output_md,
            section_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_sections_by_job(&self, job_id: &str) -> Result<Vec<Section>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, job_id, key, title, progress, status, output_md
            FROM sections
            WHERE job_id = ?
            ORDER BY key
            "#,
            job_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Section {
                id: row.id.unwrap(),
                job_id: row.job_id,
                key: row.key,
                title: row.title,
                progress: row.progress as i32,
                status: row.status,
                output_md: row.output_md,
            })
            .collect())
    }

    pub async fn create_message(&self, new_message: NewMessage) -> Result<Message> {
        sqlx::query!(
            r#"
            INSERT INTO messages (id, job_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            "#,
            new_message.id,
            new_message.job_id,
            new_message.role,
            new_message.content,
            new_message.created_at
        )
        .execute(&self.pool)
        .await?;

        Ok(Message {
            id: new_message.id,
            job_id: new_message.job_id,
            role: new_message.role,
            content: new_message.content,
            created_at: new_message.created_at,
        })
    }

    pub async fn get_messages_by_job(&self, job_id: &str) -> Result<Vec<Message>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, job_id, role, content, created_at
            FROM messages
            WHERE job_id = ?
            ORDER BY created_at
            "#,
            job_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Message {
                id: row.id.unwrap(),
                job_id: row.job_id,
                role: row.role,
                content: row.content,
                created_at: chrono::DateTime::from_naive_utc_and_offset(row.created_at, chrono::Utc),
            })
            .collect())
    }

    pub async fn get_job_history(&self) -> Result<Vec<Job>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, topic, depth, created_at, status
            FROM jobs
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Job {
                id: row.id.unwrap(),
                topic: row.topic,
                depth: row.depth as i32,
                created_at: chrono::DateTime::from_naive_utc_and_offset(row.created_at, chrono::Utc),
                status: row.status,
            })
            .collect())
    }
}
