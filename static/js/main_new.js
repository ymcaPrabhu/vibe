document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const researchForm = document.getElementById('research-form');
    const topicInput = document.getElementById('topic');
    const depthInput = document.getElementById('depth');
    const submitBtn = document.getElementById('submit-btn');
    const progressContainer = document.getElementById('progress-container');
    const overallProgressFill = document.getElementById('overall-progress-fill');
    const overallProgressText = document.getElementById('overall-progress-text');
    const workersContainer = document.getElementById('workers-container');
    const resultsContent = document.getElementById('results-content');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const jobHistoryList = document.getElementById('job-history');
    const searchHistory = document.getElementById('search-history');
    const activeResearchCount = document.getElementById('active-research');
    const totalReportsCount = document.getElementById('total-reports');
    const downloadSection = document.getElementById('download-section');
    const toggleDownloadBtn = document.getElementById('toggle-download');
    const downloadOptions = document.getElementById('download-options');
    const retryDownloadBtn = document.getElementById('retry-download');
    const depthMenuBtn = document.getElementById('depth-menu-btn');
    
    // Export buttons
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportWordBtn = document.getElementById('export-word');
    const exportMdBtn = document.getElementById('export-markdown');
    
    // Depth menu options
    const depthOptions = document.querySelectorAll('.depth-option');
    
    // State
    let currentJobId = null;
    let eventSource = null;
    let workerProgress = {};
    let workerTitles = {};
    let jobHistory = [];
    let isSidebarOpen = true;
    let isDownloadSectionOpen = true;
    
    // Set focus on topic input
    topicInput.focus();
    
    // Initialize depth selector
    initializeDepthSelector();
    
    // Initialize sidebar toggle
    initializeSidebarToggle();
    
    // Initialize download section toggle
    initializeDownloadToggle();
    
    // Initialize history search
    initializeHistorySearch();
    
    // Function to initialize depth selector
    function initializeDepthSelector() {
        depthOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const value = parseInt(this.getAttribute('data-value'));
                depthInput.value = value;
                
                // Update active class
                depthOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Update button text
                depthMenuBtn.innerHTML = `<i class=\"fas fa-layer-group\"></i> ${this.textContent}`;
            });
        });
    }
    
    // Function to initialize sidebar toggle
    function initializeSidebarToggle() {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
        
        mobileSidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = mobileSidebarToggle.contains(event.target);
            
            if (!isClickInsideSidebar && !isClickOnToggle && window.innerWidth < 768) {
                if (!sidebar.classList.contains('collapsed')) {
                    toggleSidebar();
                }
            }
        });
    }
    
    // Function to toggle sidebar
    function toggleSidebar() {
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('full-width');
            isSidebarOpen = true;
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('full-width');
            isSidebarOpen = false;
        }
    }
    
    // Function to initialize download section toggle
    function initializeDownloadToggle() {
        toggleDownloadBtn.addEventListener('click', function() {
            isDownloadSectionOpen = !isDownloadSectionOpen;
            
            if (isDownloadSectionOpen) {
                downloadSection.classList.remove('collapsed');
                downloadOptions.classList.remove('hidden');
                this.innerHTML = '<i class=\"fas fa-chevron-up\"></i>';
            } else {
                downloadSection.classList.add('collapsed');
                downloadOptions.classList.add('hidden');
                this.innerHTML = '<i class=\"fas fa-chevron-down\"></i>';
            }
        });
    }
    
    // Function to initialize history search
    function initializeHistorySearch() {
        searchHistory.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterHistory(searchTerm);
        });
    }
    
    // Function to filter history based on search term
    function filterHistory(searchTerm) {
        const filteredJobs = jobHistory.filter(job => 
            job.topic.toLowerCase().includes(searchTerm) ||
            job.status.toLowerCase().includes(searchTerm)
        );
        
        renderJobHistory(filteredJobs);
    }
    
    // Export functionality
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
    
    retryDownloadBtn.addEventListener('click', function() {
        // Simulate retry functionality
        alert('Retrying download...');
        // This would typically trigger the download again or refresh the data
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
        
        // Add user message to chat
        addMessageToChat(topic, 'user');
        
        // Update active research counter
        activeResearchCount.textContent = '1 Active';
        
        // Show progress container
        progressContainer.style.display = 'block';
        progressContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Disable form and show progress
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin me-2\"></i>Researching...';
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
    
    // Add message to chat display
    function addMessageToChat(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        let icon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        let name = sender === 'user' ? 'You' : 'Research Assistant';
        
        messageDiv.innerHTML = `
            <div class=\"message-header\">
                <i class=\"${icon}\"></i>
                <strong>${name}</strong>
            </div>
            <div class=\"message-content\">${marked.parse(content)}</div>
        `;
        
        resultsContent.appendChild(messageDiv);
        
        // Scroll to bottom
        resultsContent.scrollTop = resultsContent.scrollHeight;
    }
    
    // Add content to results display
    function addContentToResults(data) {
        const content = data.text || '';
        
        // Add assistant response to chat
        addMessageToChat(content, 'assistant');
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
        let workerElement = document.querySelector(`[data-section-key=\"${sectionKey}\"]`);
        
        if (!workerElement) {
            workerElement = document.createElement('div');
            workerElement.className = 'worker-progress';
            workerElement.setAttribute('data-section-key', sectionKey);
            
            workerElement.innerHTML = `
                <div class=\"worker-header\">
                    <div class=\"worker-title\"><i class=\"fas fa-cogs me-2\"></i> ${sectionTitle}</div>
                </div>
                <div class=\"worker-progress-bar\">
                    <div class=\"worker-progress-fill\" style=\"width: ${progress}%\"></div>
                </div>
                <div class=\"worker-progress-text\">${progress}%</div>
            `;
            
            workersContainer.appendChild(workerElement);
        } else {
            // Update existing progress bar
            const progressFill = workerElement.querySelector('.worker-progress-fill');
            const progressText = workerElement.querySelector('.worker-progress-text');
            const titleElement = workerElement.querySelector('.worker-title');
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            // Keep icon in title but update text
            titleElement.innerHTML = `<i class=\"fas fa-cogs me-2\"></i> ${sectionTitle}`;
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
        submitBtn.innerHTML = '<i class=\"fas fa-paper-plane me-2\"></i>Research';
        topicInput.value = '';
        topicInput.focus();
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
            jobHistoryList.innerHTML = '<div class=\"text-center text-light\"><i class=\"fas fa-inbox fa-2x mb-2\"></i><p class=\"mb-0\">No research history</p></div>';
            return;
        }
        
        jobs.forEach(job => {
            const li = document.createElement('li');
            li.className = 'history-item';
            
            // Format status class
            const statusClass = `status-${job.status.toLowerCase().replace(' ', '-')}`;
            
            li.innerHTML = `
                <div class=\"history-topic\"><i class=\"fas fa-file-alt me-2\"></i> ${job.topic}</div>
                <div class=\"history-meta\">
                    <div>Depth: ${job.depth} • ${formatDate(job.created_at)}</div>
                    <div class=\"history-status ${statusClass}\">${job.status}</div>
                </div>
            `;
            
            li.addEventListener('click', async () => {
                // Add this topic to the chat
                addMessageToChat(job.topic, 'user');
                
                try {
                    // Fetch job sections
                    const response = await fetch(`/api/jobs/${job.id}/sections`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const sections = await response.json();

                    // Build content from sections
                    let content = '';
                    sections.forEach(section => {
                        if (section.output_md && section.output_md.trim()) {
                            content += section.output_md + '\n\n';
                        }
                    });

                    // Add to chat if there's content
                    if (content.trim()) {
                        addMessageToChat(content, 'assistant');
                    } else {
                        addMessageToChat('No content available for this research.', 'assistant');
                    }
                } catch (error) {
                    console.error('Error loading job sections:', error);
                    addMessageToChat('Error loading research content.', 'assistant');
                }
                
                // Close sidebar on mobile after selection
                if (window.innerWidth < 768) {
                    toggleSidebar();
                }
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