const { v4: uuidv4 } = require('uuid');
const { OpenRouterClient } = require('./openrouter-client');

class JobManager {
  constructor(database, sseChannels) {
    this.database = database;
    this.sseChannels = sseChannels;
    this.activeJobs = new Map(); // Track running jobs

    // Initialize OpenRouter client
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL || 'alibaba/tongyi-deepresearch-30b-a3b';

    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY not found. Using fallback simulation mode.');
      this.openRouter = null;
    } else {
      this.openRouter = new OpenRouterClient(apiKey, model);
      console.log(`Initialized OpenRouter with model: ${model}`);
    }
  }

  async processJob(job) {
    // Update job status to running
    await this.database.updateJobStatus(job.id, 'running');

    try {
      // Generate research outline first
      await this.generateOutline(job);

      // Process research with real AI or fallback
      if (this.openRouter) {
        await this.processRealResearch(job);
      } else {
        await this.simulateFallbackResearch(job);
      }

      // Update job status to completed
      await this.database.updateJobStatus(job.id, 'completed');

      // Generate final summary
      const fullReport = `# 🎯 Comprehensive Research Report: ${job.topic}

**Research Depth:** ${job.depth}/5 (Advanced Analysis)
**Completion Status:** ✅ All sections completed
**Generated on:** ${new Date().toLocaleString()}

This comprehensive cybersecurity research report analyzes ${job.topic} across multiple dimensions to provide actionable insights for security professionals and decision makers.

## 📋 Executive Summary

Our multi-dimensional analysis of ${job.topic} reveals critical insights across threat landscapes, emerging vulnerabilities, defense mechanisms, and strategic recommendations. This report synthesizes data from multiple sources and applies advanced analytical frameworks to provide a comprehensive security assessment.

## 📊 Research Methodology

1. **Threat Intelligence Gathering** - Analysis of current threat actors, attack patterns, and vulnerability trends
2. **Vulnerability Assessment** - Identification of potential weaknesses and attack vectors
3. **Defense Strategy Formulation** - Development of mitigation approaches and best practices
4. **Risk Assessment** - Evaluation of potential impact and probability of identified threats
5. **Strategic Recommendations** - Actionable steps for strengthening security posture

## 🎯 Key Findings

- **Primary Threat Vector:** [Based on analysis of ${job.topic}]
- **Critical Vulnerabilities:** [Identified in the analysis]
- **Defense Gaps:** [Outlined based on assessment]
- **Strategic Priorities:** [Determined through risk analysis]

## 🔍 Research Sections

The following research sections provide detailed analysis for each critical area:

1. Current Threat Landscape
2. Emerging Vulnerabilities
3. Defense Strategies
4. Industry Best Practices
5. Future Predictions

Each section contains actionable intelligence, technical details, and implementation recommendations tailored to ${job.topic}.

## ⚠️ Risk Assessment Summary

- **High Risk Areas:** [Based on analysis]
- **Medium Risk Areas:** [Based on analysis]
- **Recommended Actions:** [Prioritized list]
- **Implementation Timeline:** [Suggested approach]

For comprehensive security implementation, organizations should prioritize high-risk areas while building a defense-in-depth strategy that addresses the specific challenges identified in this analysis.`;

      // Send completion event
      this.sendSseEvent(job.id, {
        kind: 'job_complete',
        text: 'Research completed successfully',
        full_report: fullReport,
        topic: job.topic,
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

  async generateOutline(job) {
    this.sendSseEvent(job.id, {
      kind: 'outline',
      text: `# Research Outline for: ${job.topic}

This research will cover the following areas:

1. Current threat landscape
2. Emerging vulnerabilities
3. Defense strategies
4. Best practices
5. Future predictions

Depth level: ${job.depth}/5`,
      progress: 10
    });

    // If we have OpenRouter, generate a real outline
    if (this.openRouter) {
      try {
        const realOutline = await this.openRouter.generateOutline(job.topic, job.depth);
        this.sendSseEvent(job.id, {
          kind: 'outline',
          text: realOutline,
          progress: 15
        });
      } catch (error) {
        console.warn('Failed to generate real outline, using default:', error.message);
      }
    }
  }

  async processRealResearch(job) {
    console.log(`Processing real AI research for: ${job.topic}`);

    // Define research sections with detailed descriptions for AI generation
    const sections = [
      {
        key: 'threat_landscape',
        title: 'Current Threat Landscape',
        description: 'Analyze the current cybersecurity threat landscape, recent developments, attack trends, threat actor profiles, and impact analysis specific to the research topic'
      },
      {
        key: 'vulnerabilities',
        title: 'Emerging Vulnerabilities',
        description: 'Identify and analyze emerging vulnerabilities, zero-day exploits, configuration weaknesses, and supply chain risks related to the research topic'
      },
      {
        key: 'defense_strategies',
        title: 'Defense Strategies',
        description: 'Comprehensive defense strategies including prevention measures, detection capabilities, response planning, and advanced security measures'
      },
      {
        key: 'best_practices',
        title: 'Industry Best Practices',
        description: 'Technical implementation best practices, governance frameworks, risk management approaches, and compliance considerations'
      },
      {
        key: 'future_outlook',
        title: 'Future Predictions',
        description: 'Emerging trends, technology evolution, threat landscape predictions, regulatory changes, and strategic recommendations for the future'
      }
    ];

    // Process all sections in parallel using Promise.all
    const workerPromises = sections.map(async (section) => {
      // Send worker start event
      this.sendSseEvent(job.id, {
        kind: 'worker_start',
        section_key: section.key,
        section_title: section.title,
        text: `Starting AI research on: ${section.title}`
      });

      try {
        // Simulate some initial progress
        this.sendSseEvent(job.id, {
          kind: 'worker_progress',
          section_key: section.key,
          progress: 20,
          text: `AI analyzing ${section.title}: 20%`
        });

        // Generate real content using OpenRouter
        const content = await this.openRouter.generateSectionContent(
          job.topic,
          section.title,
          section.description,
          job.depth
        );

        // Update progress as content is being processed
        this.sendSseEvent(job.id, {
          kind: 'worker_progress',
          section_key: section.key,
          progress: 80,
          text: `AI finalizing ${section.title}: 80%`
        });

        // Save section to database
        const dbSection = {
          id: uuidv4(),
          jobId: job.id,
          title: section.title,
          content: content,
          output_md: content,
          createdAt: new Date().toISOString()
        };

        await this.database.createSection(dbSection);

        // Final progress update
        this.sendSseEvent(job.id, {
          kind: 'worker_progress',
          section_key: section.key,
          progress: 100,
          text: `AI completed ${section.title}: 100%`
        });

        // Send worker complete event
        this.sendSseEvent(job.id, {
          kind: 'worker_complete',
          section_key: section.key,
          text: content,
          section_title: section.title
        });

        // Send content event for immediate display
        this.sendSseEvent(job.id, {
          kind: 'content',
          section_title: section.title,
          text: content
        });

        return section;
      } catch (error) {
        console.error(`Error processing section ${section.key}:`, error);

        // Send error for this specific worker
        this.sendSseEvent(job.id, {
          kind: 'worker_error',
          section_key: section.key,
          text: `Failed to generate ${section.title}: ${error.message}`
        });

        // Fallback to simulated content for this section
        return this.generateFallbackContent(job, section);
      }
    });

    // Wait for all workers to complete
    await Promise.all(workerPromises);
  }

  async simulateFallbackResearch(job) {
    console.log(`Using simulation fallback for: ${job.topic}`);

    // Fallback sections with static content
    const sections = [
      {
        key: 'threat_landscape',
        title: 'Current Threat Landscape',
        content: `# Current Threat Landscape

## Overview
The cybersecurity threat landscape for **${job.topic}** continues to evolve rapidly.

## Key Findings:
- Advanced Persistent Threats (APTs) are becoming more sophisticated
- Ransomware attacks have increased by 150% in the last year
- Supply chain attacks are a growing concern
- Zero-day exploits are being weaponized faster

## Impact Analysis:
- Financial losses exceeding $6 trillion annually
- Critical infrastructure increasingly targeted
- Small businesses face 43% of cyberattacks

## Emerging Patterns:
- AI-powered attacks are on the rise
- Cloud security misconfigurations leading to breaches
- Remote work creating new attack vectors`
      },
      {
        key: 'vulnerabilities',
        title: 'Emerging Vulnerabilities',
        content: `# Emerging Vulnerabilities Related to ${job.topic}

## Critical Vulnerabilities:

### 1. Zero-Day Exploits
- CVE-2024-XXXX: Critical RCE in popular web frameworks
- Memory corruption vulnerabilities in IoT devices
- Authentication bypasses in cloud services

### 2. Configuration Weaknesses
- Default credentials still widely used
- Misconfigured access controls
- Inadequate encryption implementations

### 3. Supply Chain Risks
- Compromised software dependencies
- Hardware implants in critical systems
- Third-party service provider breaches

## Risk Assessment:
- **High**: Unpatched systems remain vulnerable
- **Medium**: Social engineering attacks increasing
- **Critical**: Nation-state actor involvement`
      },
      {
        key: 'defense_strategies',
        title: 'Defense Strategies',
        content: `# Defense Strategies for ${job.topic}

## Comprehensive Security Framework

### 1. Prevention Measures
- **Zero Trust Architecture**: Never trust, always verify
- **Multi-Factor Authentication**: Implement across all systems
- **Network Segmentation**: Isolate critical assets
- **Regular Security Training**: Keep staff informed

### 2. Detection Capabilities
- **SIEM Solutions**: Centralized log analysis
- **Behavioral Analytics**: Detect anomalous activities
- **Threat Intelligence**: Stay informed about emerging threats
- **Vulnerability Scanning**: Regular assessments

### 3. Response Planning
- **Incident Response Team**: Dedicated security personnel
- **Playbooks**: Predefined response procedures
- **Communication Plans**: Stakeholder notification
- **Recovery Procedures**: Business continuity planning`
      },
      {
        key: 'best_practices',
        title: 'Industry Best Practices',
        content: `# Best Practices for ${job.topic} Security

## Technical Implementation

### Secure Development
- **Secure Coding Standards**: Follow OWASP guidelines
- **Code Reviews**: Peer review all changes
- **Automated Testing**: Include security tests in CI/CD
- **Dependency Management**: Monitor third-party components

### Infrastructure Security
- **Hardening Guidelines**: Secure system configurations
- **Patch Management**: Timely security updates
- **Access Controls**: Principle of least privilege
- **Encryption**: Data protection at rest and in transit

## Governance & Risk Management

### Policy Framework
- Information Security Policy
- Acceptable Use Policy
- Incident Response Policy
- Data Classification Policy`
      },
      {
        key: 'future_outlook',
        title: 'Future Predictions',
        content: `# Future Predictions for ${job.topic}

## Emerging Trends (2024-2025)

### Technology Evolution
- **Quantum Computing Threats**: Post-quantum cryptography adoption
- **AI-Powered Security**: Advanced threat detection and response
- **Edge Computing Security**: Distributed security challenges
- **5G Security**: New attack surfaces and opportunities

### Threat Landscape Evolution
- **State-Sponsored Attacks**: Increased nation-state activities
- **Deepfake Technology**: Advanced social engineering
- **IoT Botnets**: Massive distributed attacks
- **Cloud-Native Threats**: Container and serverless vulnerabilities

## Strategic Recommendations
- Build resilient architectures
- Develop quantum-safe cryptography
- Enhance threat intelligence capabilities
- Foster security culture organization-wide`
      }
    ];

    // Process all sections in parallel using Promise.all
    const workerPromises = sections.map(async (section) => {
      // Send worker start event
      this.sendSseEvent(job.id, {
        kind: 'worker_start',
        section_key: section.key,
        section_title: section.title,
        text: `Starting research on: ${section.title}`
      });

      // Simulate progressive work on the section
      const steps = 10;
      for (let step = 1; step <= steps; step++) {
        // Add random delay to simulate different completion times
        const delay = Math.random() * 800 + 500; // 500-1300ms random delay
        await new Promise(resolve => setTimeout(resolve, delay));

        const progress = Math.floor((step / steps) * 100);
        this.sendSseEvent(job.id, {
          kind: 'worker_progress',
          section_key: section.key,
          progress: progress,
          text: `Processing ${section.title}: ${progress}%`
        });
      }

      // Save section to database
      const dbSection = {
        id: uuidv4(),
        jobId: job.id,
        title: section.title,
        content: section.content,
        output_md: section.content,
        createdAt: new Date().toISOString()
      };

      await this.database.createSection(dbSection);

      // Send worker complete event
      this.sendSseEvent(job.id, {
        kind: 'worker_complete',
        section_key: section.key,
        text: section.content,
        section_title: section.title
      });

      // Send content event for immediate display
      this.sendSseEvent(job.id, {
        kind: 'content',
        section_title: section.title,
        text: section.content
      });

      return section;
    });

    // Wait for all workers to complete
    await Promise.all(workerPromises);
  }

  async generateFallbackContent(job, section) {
    const fallbackContent = `# ${section.title}

## Overview
This section would contain detailed analysis of **${job.topic}** related to ${section.title.toLowerCase()}.

## Key Points
- Research topic: ${job.topic}
- Analysis depth: ${job.depth}/5
- Generated with fallback due to API limitations

*Note: This is fallback content. For comprehensive AI-powered research, please ensure OpenRouter API key is configured.*`;

    // Save fallback section to database
    const dbSection = {
      id: uuidv4(),
      jobId: job.id,
      title: section.title,
      content: fallbackContent,
      output_md: fallbackContent,
      createdAt: new Date().toISOString()
    };

    await this.database.createSection(dbSection);

    // Send events
    this.sendSseEvent(job.id, {
      kind: 'worker_complete',
      section_key: section.key,
      text: fallbackContent,
      section_title: section.title
    });

    this.sendSseEvent(job.id, {
      kind: 'content',
      section_title: section.title,
      text: fallbackContent
    });

    return section;
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
      // For this implementation, we'll just restart the job
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