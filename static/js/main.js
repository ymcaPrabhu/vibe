document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const researchForm = document.getElementById('research-form');
    const topicInput = document.getElementById('topic');
    const depthInput = document.getElementById('depth');
    const submitBtn = document.getElementById('submit-btn');
    const progressContainer = document.getElementById('progress-container');
    const overallProgressFill = document.querySelector('#overall-progress .progress-fill');
    const overallProgressText = document.querySelector('#overall-progress .progress-text');
    const workersContainer = document.getElementById('workers-container');
    const resultsContent = document.getElementById('results-content');
    const toggleHistoryBtn = document.getElementById('toggle-history');
    const historyPanel = document.getElementById('history-panel');
    const jobHistoryList = document.getElementById('job-history');
    
    // State
    let currentJobId = null;
    let eventSource = null;
    let workerProgress = {};
    let workerTitles = {};
    
    // Set focus on topic input
    topicInput.focus();
    
    // Toggle history panel
    toggleHistoryBtn.addEventListener('click', function() {
        if (historyPanel.style.display === 'none' || historyPanel.style.display === '') {
            historyPanel.style.display = 'flex';
            toggleHistoryBtn.textContent = 'Hide';
        } else {
            historyPanel.style.display = 'none';
            toggleHistoryBtn.textContent = 'Show';
        }
    });
    
    // Submit research request
    researchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const topic = topicInput.value.trim();
        const depth = parseInt(depthInput.value);
        
        if (!topic) {
            alert('Please enter a research topic');
            return;
        }
        
        if (depth < 1 || depth > 5) {
            alert('Depth must be between 1 and 5');
            return;
        }
        
        // Disable form and show progress
        submitBtn.disabled = true;
        submitBtn.textContent = 'Researching...';
        progressContainer.style.display = 'block';
        workersContainer.innerHTML = '';
        resultsContent.innerHTML = '';
        
        try {
            // Submit the job
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topic, depth })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const job = await response.json();
            currentJobId = job.id;
            
            // Start listening for updates
            startEventSource(currentJobId);
        } catch (error) {
            console.error('Error submitting job:', error);
            alert('Error submitting research request: ' + error.message);
            resetForm();
        }
    });
    
    // Start SSE connection
    function startEventSource(jobId) {
        if (eventSource) {
            eventSource.close();
        }
        
        eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.kind === 'chunk') {
                    // Add content to the results
                    addContentToResults(data);
                } else if (data.kind === 'progress') {
                    // Update progress bar for the specific worker
                    updateWorkerProgress(data);
                } else if (data.kind === 'done') {
                    // Research is complete
                    eventSource.close();
                    eventSource = null;
                    resetForm();
                    loadJobHistory();
                }
            } catch (error) {
                console.error('Error processing event:', error);
            }
        };
        
        eventSource.onerror = function(error) {
            console.error('SSE error:', error);
            eventSource.close();
            eventSource = null;
            if (currentJobId) {
                // Try to get final results even if SSE fails
                setTimeout(() => {
                    resetForm();
                    loadJobHistory();
                }, 1000);
            }
        };
    }
    
    // Add content to results display
    function addContentToResults(data) {
        // Convert markdown to HTML (simplified version)
        const content = data.text || '';
        
        // For now, we'll just add the raw content
        // In a real app, we'd use a proper markdown parser
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = marked.parse(content);
        resultsContent.appendChild(contentDiv);
        
        // Scroll to bottom
        resultsContent.scrollTop = resultsContent.scrollHeight;
    }
    
    // Update worker progress
    function updateWorkerProgress(data) {
        const sectionKey = data.section_key || 'unknown';
        const sectionTitle = data.section_title || 'Unknown Section';
        const progress = data.progress || 0;
        
        workerProgress[sectionKey] = progress;
        workerTitles[sectionKey] = sectionTitle;
        
        // Update the specific worker progress bar
        updateSpecificWorkerBar(sectionKey, sectionTitle, progress);
        
        // Calculate and update overall progress
        updateOverallProgress();
    }
    
    // Create or update a specific worker progress bar
    function updateSpecificWorkerBar(sectionKey, sectionTitle, progress) {
        let workerElement = document.querySelector(`[data-section-key="${sectionKey}"]`);
        
        if (!workerElement) {
            workerElement = document.createElement('div');
            workerElement.className = 'worker-progress';
            workerElement.setAttribute('data-section-key', sectionKey);
            
            workerElement.innerHTML = `
                <div class="worker-header">
                    <div class="worker-title">${sectionTitle}</div>
                    <button class="worker-pin" title="Pin worker">📌</button>
                </div>
                <div class="worker-progress-bar">
                    <div class="worker-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="worker-progress-text">${progress}%</div>
            `;
            
            workersContainer.appendChild(workerElement);
            
            // Add pin functionality
            const pinBtn = workerElement.querySelector('.worker-pin');
            pinBtn.addEventListener('click', function() {
                // Toggle pinned state
                workerElement.classList.toggle('pinned');
                pinBtn.textContent = workerElement.classList.contains('pinned') ? '📍' : '📌';
            });
        } else {
            // Update existing progress bar
            const progressFill = workerElement.querySelector('.worker-progress-fill');
            const progressText = workerElement.querySelector('.worker-progress-text');
            const titleElement = workerElement.querySelector('.worker-title');
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            titleElement.textContent = sectionTitle;
        }
    }
    
    // Update overall progress
    function updateOverallProgress() {
        const progressValues = Object.values(workerProgress);
        if (progressValues.length === 0) {
            overallProgressFill.style.width = '0%';
            overallProgressText.textContent = '0%';
            return;
        }
        
        const totalProgress = progressValues.reduce((sum, val) => sum + val, 0);
        const avgProgress = Math.round(totalProgress / progressValues.length);
        
        overallProgressFill.style.width = `${avgProgress}%`;
        overallProgressText.textContent = `${avgProgress}%`;
    }
    
    // Reset form after completion
    function resetForm() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Research';
    }
    
    // Load job history
    async function loadJobHistory() {
        try {
            const response = await fetch('/api/history');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jobs = await response.json();
            renderJobHistory(jobs);
        } catch (error) {
            console.error('Error loading job history:', error);
        }
    }
    
    // Render job history
    function renderJobHistory(jobs) {
        jobHistoryList.innerHTML = '';
        
        if (jobs.length === 0) {
            jobHistoryList.innerHTML = '<li><em>No research history yet</em></li>';
            return;
        }
        
        jobs.forEach(job => {
            const li = document.createElement('li');
            li.className = 'job-item';
            li.innerHTML = `
                <div class="job-topic">${job.topic}</div>
                <div class="job-meta">Depth: ${job.depth} | ${formatDate(job.created_at)} | Status: ${job.status}</div>
            `;
            
            li.addEventListener('click', () => {
                // Load job results (in a real app, this would load the full results)
                resultsContent.innerHTML = `<p>Loading results for: ${job.topic}...</p>`;
            });
            
            jobHistoryList.appendChild(li);
        });
    }
    
    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    }
    
    // Load initial history
    loadJobHistory();
    
    // Initialize marked.js for markdown rendering
    marked.setOptions({
        breaks: true,
        gfm: true
    });
});