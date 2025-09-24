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