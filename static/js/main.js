document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const researchForm = document.getElementById('research-form');
    const topicInput = document.getElementById('topic');
    const depthInput = document.getElementById('depth');
    const depthSlider = document.getElementById('depth-slider');
    const submitBtn = document.getElementById('submit-btn');
    const progressContainer = document.getElementById('progress-container');
    const overallProgressFill = document.querySelector('#progress-container .progress-fill');
    const overallProgressText = document.querySelector('#progress-container .progress-text');
    const workersContainer = document.getElementById('workers-container');
    const resultsContent = document.getElementById('results-content');
    const toggleHistoryBtn = document.getElementById('toggle-history');
    const historyPanel = document.getElementById('history-panel');
    const jobHistoryList = document.getElementById('job-history');
    const depthLabels = document.querySelectorAll('.depth-label');
    const searchHistory = document.getElementById('search-history');
    const activeResearchCount = document.getElementById('active-research');
    const totalReportsCount = document.getElementById('total-reports');
    
    // Export buttons
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportWordBtn = document.getElementById('export-word');
    const exportMdBtn = document.getElementById('export-markdown');
    
    // State
    let currentJobId = null;
    let eventSource = null;
    let workerProgress = {};
    let workerTitles = {};
    let jobHistory = [];
    
    // Set focus on topic input
    topicInput.focus();
    
    // Initialize depth slider
    updateDepthSlider();
    
    // Set up depth slider event listeners
    depthSlider.addEventListener('input', updateDepthSlider);
    
    // Set up depth label event listeners
    depthLabels.forEach(label => {
        label.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            depthSlider.value = value;
            depthInput.value = value;
            updateDepthSlider();
        });
    });
    
    // Function to update the slider and associated labels
    function updateDepthSlider() {
        const value = depthSlider.value;
        depthInput.value = value;
        
        // Update active label
        depthLabels.forEach(label => {
            if (parseInt(label.getAttribute('data-value')) == value) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });
    }
    
    // Toggle history panel
    toggleHistoryBtn.addEventListener('click', function() {
        const spanText = this.querySelector('span');
        const icon = this.querySelector('i');
        
        if (historyPanel.style.display === 'none' || historyPanel.style.display === '') {
            historyPanel.style.display = 'flex';
            spanText.textContent = 'Hide';
            icon.className = 'fas fa-eye-slash';
        } else {
            historyPanel.style.display = 'none';
            spanText.textContent = 'Show';
            icon.className = 'fas fa-eye';
        }
    });
    
    // Search history functionality
    searchHistory.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterHistory(searchTerm);
    });
    
    // Function to filter history based on search term
    function filterHistory(searchTerm) {
        const filteredJobs = jobHistory.filter(job => 
            job.topic.toLowerCase().includes(searchTerm) ||
            job.status.toLowerCase().includes(searchTerm)
        );
        
        renderJobHistory(filteredJobs);
    }
    
    // Export functionality - placeholder for now
    exportPdfBtn.addEventListener('click', function() {
        alert('PDF export functionality would be implemented here');
    });
    
    exportWordBtn.addEventListener('click', function() {
        alert('Word export functionality would be implemented here');
    });
    
    exportMdBtn.addEventListener('click', function() {
        const markdownContent = resultsContent.innerText || resultsContent.textContent;
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'research-report.md';
        a.click();
        window.URL.revokeObjectURL(url);
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
        
        // Update active research counter
        activeResearchCount.textContent = '1 Active';
        
        // Disable form and show progress
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Researching...</span>';
        progressContainer.style.display = 'block';
        workersContainer.innerHTML = '';
        
        // Clear welcome message if present
        const welcomeMessage = resultsContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
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
                    
                    // Update counters
                    activeResearchCount.textContent = '0 Active';
                    // In a real app, we would increment the total reports counter
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
        const content = data.text || '';
        
        // Check if we need to replace the welcome message
        const welcomeMessage = resultsContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // Parse and add the markdown content
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
                    <div class="worker-title"><i class="fas fa-cogs"></i> ${sectionTitle}</div>
                    <button class="worker-pin" title="Pin worker"><i class="fas fa-thumbtack"></i></button>
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
                const icon = pinBtn.querySelector('i');
                icon.className = workerElement.classList.contains('pinned') ? 'fas fa-thumbtack' : 'fas fa-thumbtack';
                // In a real implementation, we would rotate the icon when pinned
            });
        } else {
            // Update existing progress bar
            const progressFill = workerElement.querySelector('.worker-progress-fill');
            const progressText = workerElement.querySelector('.worker-progress-text');
            const titleElement = workerElement.querySelector('.worker-title');
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            // Keep icon in title but update text
            titleElement.innerHTML = `<i class="fas fa-cogs"></i> ${sectionTitle}`;
        }
    }
    
    // Update overall progress
    function updateOverallProgress() {
        const progressValues = Object.values(workerProgress);
        if (progressValues.length === 0) {
            overallProgressFill.style.width = '0%';
            return;
        }
        
        const totalProgress = progressValues.reduce((sum, val) => sum + val, 0);
        const avgProgress = Math.round(totalProgress / progressValues.length);
        
        overallProgressFill.style.width = `${avgProgress}%`;
    }
    
    // Reset form after completion
    function resetForm() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Initiate Research</span>';
    }
    
    // Load job history
    async function loadJobHistory() {
        try {
            const response = await fetch('/api/history');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            jobHistory = await response.json();
            
            // Update total reports counter
            totalReportsCount.textContent = `${jobHistory.length} Reports`;
            
            renderJobHistory(jobHistory);
        } catch (error) {
            console.error('Error loading job history:', error);
        }
    }
    
    // Render job history
    function renderJobHistory(jobs) {
        jobHistoryList.innerHTML = '';
        
        if (jobs.length === 0) {
            jobHistoryList.innerHTML = '<div class="no-results"><i class="fas fa-inbox"></i> <p>No research history yet</p></div>';
            return;
        }
        
        jobs.forEach(job => {
            const li = document.createElement('li');
            li.className = 'job-item';
            
            // Format status class
            const statusClass = `status-${job.status.toLowerCase().replace(' ', '-')}`;
            
            li.innerHTML = `
                <div class="job-topic"><i class="fas fa-file-alt"></i> ${job.topic}</div>
                <div class="job-meta">
                    <div>Depth: ${job.depth} • ${formatDate(job.created_at)}</div>
                    <div class="job-status ${statusClass}">${job.status}</div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                // Load job results (in a real app, this would load the full results)
                resultsContent.innerHTML = `<div class="loading-results"><i class="fas fa-spinner fa-spin"></i> Loading results for: ${job.topic}</div>`;
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