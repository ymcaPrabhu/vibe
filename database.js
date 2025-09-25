const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(databaseUrl) {
    this.databaseUrl = databaseUrl;
    this.isPostgres = databaseUrl && databaseUrl.startsWith('postgres://');
    
    if (this.isPostgres) {
      this.client = new Client({
        connectionString: databaseUrl,
      });
    } else {
      // Use SQLite as fallback
      const dbPath = databaseUrl ? databaseUrl.replace('sqlite://', '') : path.join(__dirname, 'dev.db');
      this.client = new sqlite3.Database(dbPath);
    }
  }

  async connect() {
    if (this.isPostgres) {
      await this.client.connect();
    } else {
      // For SQLite, we just need to ensure the tables exist
      await this.initTables();
    }
  }

  async initTables() {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        // PostgreSQL queries
        const queries = [
          `CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            depth INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'submitted'
          )`,
          `CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            job_id TEXT REFERENCES jobs(id),
            title TEXT NOT NULL,
            content TEXT,
            output_md TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        ];

        let completed = 0;
        for (const query of queries) {
          this.client.query(query, (err) => {
            if (err) {
              console.error('Error creating table:', err);
              return reject(err);
            }
            completed++;
            if (completed === queries.length) resolve();
          });
        }
      } else {
        // SQLite queries
        const queries = [
          `CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            depth INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'submitted'
          )`,
          `CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            job_id TEXT,
            title TEXT NOT NULL,
            content TEXT,
            output_md TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs (id)
          )`
        ];

        let completed = 0;
        for (const query of queries) {
          this.client.run(query, (err) => {
            if (err) {
              console.error('Error creating table:', err);
              return reject(err);
            }
            completed++;
            if (completed === queries.length) resolve();
          });
        }
      }
    });
  }

  async createJob(job) {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        const query = `
          INSERT INTO jobs (id, topic, depth, created_at, status) 
          VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [job.id, job.topic, job.depth, job.createdAt, job.status];
        
        this.client.query(query, values, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      } else {
        const query = `
          INSERT INTO jobs (id, topic, depth, created_at, status) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const values = [job.id, job.topic, job.depth, job.createdAt, job.status];
        
        this.client.run(query, values, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      }
    });
  }

  async getJob(jobId) {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        const query = 'SELECT * FROM jobs WHERE id = $1';
        this.client.query(query, [jobId], (err, result) => {
          if (err) reject(err);
          else resolve(result.rows[0] || null);
        });
      } else {
        const query = 'SELECT * FROM jobs WHERE id = ?';
        this.client.get(query, [jobId], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      }
    });
  }

  async getJobHistory() {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        const query = 'SELECT * FROM jobs ORDER BY created_at DESC';
        this.client.query(query, (err, result) => {
          if (err) reject(err);
          else resolve(result.rows);
        });
      } else {
        const query = 'SELECT * FROM jobs ORDER BY created_at DESC';
        this.client.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }
    });
  }

  async updateJobStatus(jobId, status) {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        const query = 'UPDATE jobs SET status = $1 WHERE id = $2';
        this.client.query(query, [status, jobId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      } else {
        const query = 'UPDATE jobs SET status = ? WHERE id = ?';
        this.client.run(query, [status, jobId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      }
    });
  }

  async createSection(section) {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        const query = `
          INSERT INTO sections (id, job_id, title, content, output_md, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [section.id, section.jobId, section.title, section.content, section.output_md, section.createdAt];
        
        this.client.query(query, values, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      } else {
        const query = `
          INSERT INTO sections (id, job_id, title, content, output_md, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [section.id, section.jobId, section.title, section.content, section.output_md, section.createdAt];
        
        this.client.run(query, values, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      }
    });
  }

  async getSectionsByJob(jobId) {
    return new Promise((resolve, reject) => {
      if (this.isPostgres) {
        const query = 'SELECT * FROM sections WHERE job_id = $1 ORDER BY created_at ASC';
        this.client.query(query, [jobId], (err, result) => {
          if (err) reject(err);
          else resolve(result.rows);
        });
      } else {
        const query = 'SELECT * FROM sections WHERE job_id = ? ORDER BY created_at ASC';
        this.client.all(query, [jobId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }
    });
  }

  async close() {
    if (this.isPostgres) {
      await this.client.end();
    } else {
      this.client.close();
    }
  }
}

module.exports = { Database };