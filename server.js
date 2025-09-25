require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Database } = require('./database');
const { JobManager } = require('./job-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('static'));

// Global SSE channels store
const sseChannels = new Map();

// Initialize database and job manager
let database, jobManager;

// Initialize database and start the server
async function initializeApp() {
  try {
    database = new Database(process.env.DATABASE_URL || 'sqlite://dev.db');
    await database.connect();
    
    jobManager = new JobManager(database, sseChannels);
    
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

initializeApp();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Submit a new job
app.post('/api/submit', async (req, res) => {
  try {
    const { topic, depth } = req.body;
    
    const job = {
      id: uuidv4(),
      topic,
      depth,
      createdAt: new Date().toISOString(),
      status: 'submitted'
    };
    
    await database.createJob(job);
    
    // Create SSE channel for this job
    const sseChannel = {
      subscribers: new Set()
    };
    sseChannels.set(job.id, sseChannel);
    
    // Process the job in the background
    jobManager.processJob(job);
    
    res.json(job);
  } catch (error) {
    console.error('Error submitting job:', error);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

// Get job history
app.get('/api/history', async (req, res) => {
  try {
    const jobs = await database.getJobHistory();
    res.json(jobs);
  } catch (error) {
    console.error('Error getting job history:', error);
    res.status(500).json({ error: 'Failed to get job history' });
  }
});

// SSE stream for job updates\napp.get('/api/jobs/:jobId/stream', (req, res) => {\n  const jobId = req.params.jobId;\n  \n  // Check if job exists\n  if (!jobManager || !database) {\n    return res.status(500).json({ error: 'Database not initialized' });\n  }\n  \n  // Set SSE headers\n  res.writeHead(200, {\n    'Content-Type': 'text/event-stream',\n    'Connection': 'keep-alive',\n    'Cache-Control': 'no-cache',\n  });\n\n  // Create or get the SSE channel for this job\n  if (!sseChannels.has(jobId)) {\n    sseChannels.set(jobId, { subscribers: new Set() });\n  }\n  const sseChannel = sseChannels.get(jobId);\n  \n  // Add this client to the subscribers\n  sseChannel.subscribers.add(res);\n  \n  // Send initial connection event\n  res.write(`data: ${JSON.stringify({ kind: 'connected', text: 'Connected to job stream' })}\\n\\n`);\n  \n  // Remove client when connection closes\n  req.on('close', () => {\n    sseChannel.subscribers.delete(res);\n    if (sseChannel.subscribers.size === 0) {\n      sseChannels.delete(jobId); // Clean up if no more subscribers\n    }\n  });\n});

// Cancel a job
app.post('/api/jobs/:jobId/cancel', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await database.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    await jobManager.cancelJob(jobId);
    const updatedJob = await database.getJob(jobId);
    
    res.json(updatedJob);
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Resume a job
app.post('/api/jobs/:jobId/resume', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await database.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    await jobManager.resumeJob(jobId);
    const updatedJob = await database.getJob(jobId);
    
    res.json(updatedJob);
  } catch (error) {
    console.error('Error resuming job:', error);
    res.status(500).json({ error: 'Failed to resume job' });
  }
});

// Get job status
app.get('/api/jobs/:jobId/status', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await database.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get job sections
app.get('/api/jobs/:jobId/sections', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const sections = await database.getSectionsByJob(jobId);
    res.json(sections);
  } catch (error) {
    console.error('Error getting job sections:', error);
    res.status(500).json({ error: 'Failed to get job sections' });
  }
});

// Load job content
app.get('/api/jobs/:jobId/load', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await database.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const sections = await database.getSectionsByJob(jobId);
    
    res.json({
      job,
      sections
    });
  } catch (error) {
    console.error('Error loading job content:', error);
    res.status(500).json({ error: 'Failed to load job content' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});