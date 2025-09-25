const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

class JobManager {
  constructor(database, sseChannels) {
    this.database = database;
    this.sseChannels = sseChannels;
    this.activeJobs = new Map(); // Track running jobs
  }

  async processJob(job) {
    // Update job status to running
    await this.database.updateJobStatus(job.id, 'running');
    
    // Send status update
    this.sendSseEvent(job.id, {
      kind: 'status_update',
      text: 'Job started processing',
      progress: 0
    });
    
    try {
      // In the original app, this would be where the research happens
      // For now, I'll simulate the research process
      await this.simulateResearchProcess(job);
      
      // Update job status to completed
      await this.database.updateJobStatus(job.id, 'completed');
      
      // Send completion event
      this.sendSseEvent(job.id, {
        kind: 'job_complete',
        text: 'Research completed successfully',
        progress: 100
      });
    } catch (error) {
      console.error('Error processing job:', error);
      
      // Update job status to error
      await this.database.updateJobStatus(job.id, 'error');
      
      // Send error event
      this.sendSseEvent(job.id, {
        kind: 'error',
        text: `Job processing failed: ${error.message}`
      });
    }
  }

  async simulateResearchProcess(job) {
    // This would be where the actual research happens
    // For now, we'll simulate the process with multiple phases
    const phases = [
      'Gathering initial sources',
      'Analyzing cybersecurity trends',
      'Compiling threat intelligence',
      'Generating summary',
      'Finalizing research'
    ];
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      
      // Simulate some work for each phase
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Send progress update
      const progress = Math.floor(((i + 1) / phases.length) * 100);
      this.sendSseEvent(job.id, {
        kind: 'progress',
        text: phase,
        progress: progress
      });
      
      // Simulate creating sections of content
      const section = {
        id: uuidv4(),
        jobId: job.id,
        title: `${phase} Results`,
        content: `Detailed research results for: ${phase}\nTopic: ${job.topic}\nThis is simulated content for the ${phase.toLowerCase()}.`,
        createdAt: new Date().toISOString()
      };
      
      await this.database.createSection(section);
    }
    
    // In a real implementation, we would actually fetch content from the web
    // and process it. This is just a placeholder structure.
  }

  sendSseEvent(jobId, event) {
    const sseChannel = this.sseChannels.get(jobId);
    if (sseChannel && sseChannel.subscribers) {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      const toRemove = [];

      for (const subscriber of sseChannel.subscribers) {
        try {
          subscriber.write(data);
        } catch (error) {
          // Mark for removal if there's an error
          toRemove.push(subscriber);
        }
      }

      // Remove any subscribers that had errors
      for (const subscriber of toRemove) {
        sseChannel.subscribers.delete(subscriber);
      }
    }
  }

  async cancelJob(jobId) {
    // In a real implementation, we would cancel any running operations
    // For now, just update the status
    await this.database.updateJobStatus(jobId, 'cancelled');
    
    this.sendSseEvent(jobId, {
      kind: 'cancelled',
      text: 'Job has been cancelled'
    });
  }

  async resumeJob(jobId) {
    const job = await this.database.getJob(jobId);
    if (job && (job.status === 'cancelled' || job.status === 'paused' || job.status === 'error')) {
      // For this simulation, we'll just restart the job
      await this.database.updateJobStatus(jobId, 'submitted');
      
      // Restart the job
      this.processJob(job);
      
      this.sendSseEvent(jobId, {
        kind: 'resumed',
        text: 'Job has been resumed'
      });
    }
  }

  async getJobStatus(jobId) {
    return await this.database.getJob(jobId);
  }
}

module.exports = { JobManager };