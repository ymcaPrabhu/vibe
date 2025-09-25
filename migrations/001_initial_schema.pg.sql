-- PostgreSQL migration script for Cybersecurity Research App

-- Create jobs table
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL
);

-- Create sections table
CREATE TABLE sections (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    output_md TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_sections_job_id ON sections(job_id);
CREATE INDEX idx_messages_job_id ON messages(job_id);
CREATE INDEX idx_sections_key ON sections(key);

-- Create artifacts table for Stage 2
CREATE TABLE artifacts (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    artifact_type TEXT NOT NULL, -- 'dataset', 'code', 'figure', 'table', 'link', etc.
    content TEXT NOT NULL,      -- URL or serialized content
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create indexes for artifacts table
CREATE INDEX idx_artifacts_job_id ON artifacts(job_id);
CREATE INDEX idx_artifacts_section_key ON artifacts(section_key);
CREATE INDEX idx_artifacts_type ON artifacts(artifact_type);