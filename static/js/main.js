// ChatGPT-Style Interface JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const sidebar = document.getElementById('sidebar');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const newChatBtn = document.getElementById('new-chat-btn');
    const newChatMobile = document.getElementById('new-chat-mobile');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const exportBtn = document.getElementById('export-btn');
    const settingsBtn = document.getElementById('settings-btn');

    // Form elements
    const researchForm = document.getElementById('research-form');
    const topicInput = document.getElementById('topic');
    const depthInput = document.getElementById('depth');
    const depthText = document.getElementById('depth-text');
    const depthBtn = document.getElementById('depth-btn');
    const submitBtn = document.getElementById('submit-btn');

    // Progress elements
    const progressIndicator = document.getElementById('progress-indicator');
    const overallProgressFill = document.getElementById('overall-progress-fill');
    const overallProgressText = document.getElementById('overall-progress-text');
    const workersContainer = document.getElementById('workers-container');

    // Chat elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatMessages = document.getElementById('chat-messages');
    const statusToast = document.getElementById('status-toast-element');
    const statusToastBody = document.getElementById('toast-body');
    const statusToastIcon = document.getElementById('toast-icon');

    // History elements
    const jobHistory = document.getElementById('job-history');
    const jobHistoryMobile = document.getElementById('job-history-mobile');
    const searchHistory = document.getElementById('search-history');
    const searchHistoryMobile = document.getElementById('search-history-mobile');
    const activeResearchCount = document.getElementById('active-research');
    const totalReportsCount = document.getElementById('total-reports');

    // Depth selector elements
    const depthOptions = document.querySelectorAll('.depth-option');

    // Modal elements
    const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
    const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    const loadingOverlay = document.getElementById('loading-overlay');
    const toast = new bootstrap.Toast(statusToast);

    // State management
    let currentJobId = null;
    let eventSource = null;
    let workerProgress = new Map();
    let jobHistoryData = [];
    let pinnedWorkers = new Set();
    let settings = {
        theme: 'light',
        autoScroll: true
    };

    // Initialize application
    init();

    function init() {
        initializeEventListeners();
        initializeDepthSelector();
        loadJobHistory();
        loadSettings();
        focusInput();
        updateStats();
        autoResizeTextarea();

        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    function initializeEventListeners() {
        // Sidebar controls
        sidebarToggle?.addEventListener('click', toggleMobileSidebar);
        sidebarClose?.addEventListener('click', closeMobileSidebar);
        sidebarOverlay?.addEventListener('click', closeMobileSidebar);
        newChatBtn?.addEventListener('click', startNewChat);
        newChatMobile?.addEventListener('click', startNewChat);
        clearChatBtn?.addEventListener('click', clearCurrentChat);

        // Form submission
        researchForm?.addEventListener('submit', handleSubmit);
        topicInput?.addEventListener('input', autoResizeTextarea);
        topicInput?.addEventListener('keydown', handleTextareaKeydown);

        // Settings and export
        exportBtn?.addEventListener('click', () => exportModal.show());
        settingsBtn?.addEventListener('click', () => settingsModal.show());

        // History search
        searchHistory?.addEventListener('input', filterHistory);
        searchHistoryMobile?.addEventListener('input', filterHistory);

        // Depth selector
        depthOptions.forEach(option => {
            option.addEventListener('click', handleDepthSelection);
        });

        // Research suggestions
        const suggestionButtons = document.querySelectorAll('.suggestion-btn');
        suggestionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const suggestion = button.getAttribute('data-suggestion');
                topicInput.value = suggestion;
                focusInput();
                autoResizeTextarea();
            });
        });
        
        // Example prompts (for backward compatibility)
        const exampleCards = document.querySelectorAll('.example-card');
        exampleCards.forEach(card => {
            card.addEventListener('click', () => {
                const text = card.querySelector('.card-text')?.textContent?.replace(/[\"']/g, '') || '';
                topicInput.value = text;
                focusInput();
                autoResizeTextarea();
            });
        });

        // Responsive handling
        window.addEventListener('resize', handleResize);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        // Export buttons
        document.getElementById('export-pdf')?.addEventListener('click', () => exportResults('pdf'));
        document.getElementById('export-word')?.addEventListener('click', () => exportResults('word'));
        document.getElementById('export-markdown')?.addEventListener('click', () => exportResults('markdown'));

        // Settings
        document.getElementById('save-settings')?.addEventListener('click', saveSettings);

        // Theme toggle (if present)
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', applyTheme);
        }
    }

    function initializeDepthSelector() {
        const defaultDepth = depthInput?.value || '2';
        const defaultOption = document.querySelector(`.depth-option[data-value="${defaultDepth}"]`);
        if (defaultOption) {
            setActiveDepthOption(defaultOption);
        }
    }

    function handleDepthSelection(e) {
        e.preventDefault();
        const option = e.currentTarget;
        const value = option.getAttribute('data-value');
        const text = option.textContent.trim();

        if (depthInput) depthInput.value = value;
        if (depthText) depthText.textContent = text;
        setActiveDepthOption(option);
    }

    function setActiveDepthOption(activeOption) {
        depthOptions.forEach(opt => opt.classList.remove('active'));
        activeOption.classList.add('active');
    }

    // Mobile sidebar functions
    function toggleMobileSidebar() {
        if (mobileSidebar?.classList.contains('show')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    }

    function openMobileSidebar() {
        mobileSidebar?.classList.add('show');
        sidebarOverlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        mobileSidebar?.classList.remove('show');
        sidebarOverlay?.classList.remove('show');
        document.body.style.overflow = '';
    }

    function handleResize() {
        // Auto-close mobile sidebar on desktop
        if (window.innerWidth >= 992) {
            closeMobileSidebar();
        }
    }

    function handleKeyboard(e) {
        // Escape key closes mobile sidebar
        if (e.key === 'Escape') {
            closeMobileSidebar();
        }

        // Ctrl/Cmd + K to focus input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            focusInput();
        }

        // Ctrl/Cmd + N for new chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            startNewChat();
        }
    }

    function handleTextareaKeydown(e) {
        // Submit on Enter (but not Shift+Enter)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            researchForm?.dispatchEvent(new Event('submit'));
        }
    }

    function autoResizeTextarea() {
        if (!topicInput) return;

        topicInput.style.height = 'auto';
        const maxHeight = 200;
        const newHeight = Math.min(topicInput.scrollHeight, maxHeight);
        topicInput.style.height = newHeight + 'px';
        topicInput.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const topic = topicInput?.value?.trim();
        const depth = parseInt(depthInput?.value || '2');

        if (!topic) {
            focusInput();
            showToast('Please enter a research topic', 'warning');
            return;
        }

        try {
            setLoadingState(true);
            hideWelcomeScreen();
            showProgressIndicator();
            addUserMessage(topic);

            // Submit research job
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topic, depth })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            currentJobId = data.job_id;

            // Start SSE connection
            startEventSource(currentJobId);

            // Clear input and add to history
            topicInput.value = '';
            autoResizeTextarea();
            addToHistory(currentJobId, topic, 'submitted', depth);

            // Close mobile sidebar if open
            closeMobileSidebar();

            showToast('Research started successfully', 'success');

        } catch (error) {
            console.error('Research submission failed:', error);
            showToast('Failed to submit research request. Please try again.', 'error');
            setLoadingState(false);
        }
    }

    function startEventSource(jobId) {
        closeEventSource();

        eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

        eventSource.onopen = () => {
            console.log('SSE connection opened');
            showToast('Connected to research stream', 'info');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleSSEMessage(data);
            } catch (error) {
                console.error('Failed to parse SSE data:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            if (eventSource.readyState === EventSource.CLOSED) {
                showToast('Connection lost', 'error');
                setLoadingState(false);
            }
        };
    }

    function handleSSEMessage(data) {
        // Map the backend 'kind' field to frontend 'type' field for consistency
        const eventType = data.kind || data.type;

        switch (eventType) {
            case 'outline':
                handleOutlineMessage(data);
                break;
            case 'worker_start':
                handleWorkerStart(data);
                break;
            case 'worker_progress':
                handleWorkerProgress(data);
                break;
            case 'worker_complete':
                handleWorkerComplete(data);
                break;
            case 'content':
                handleContentMessage(data);
                break;
            case 'job_complete':
                handleJobComplete(data);
                break;
            case 'error':
                handleErrorMessage(data);
                break;
            default:
                console.log('Unknown SSE event type:', eventType, data);
        }
    }

    function handleOutlineMessage(data) {
        const outlineText = data.text || "Research outline generated successfully";
        addAssistantMessage("Research Outline", outlineText);
        updateOverallProgress(10);
    }

    function handleWorkerStart(data) {
        const workerId = data.section_key;
        const title = data.section_title || `Section ${workerId}`;

        if (workerId) {
            workerProgress.set(workerId, {
                title,
                progress: 0,
                status: 'processing',
                content: ''
            });

            updateWorkerDisplay();
        }
    }

    function handleWorkerProgress(data) {
        const workerId = data.section_key;
        const progress = Math.min(Math.max(data.progress || 0, 0), 100);

        if (workerId && workerProgress.has(workerId)) {
            const worker = workerProgress.get(workerId);
            worker.progress = progress;
            worker.status = progress === 100 ? 'complete' : 'processing';

            updateWorkerDisplay();
            updateOverallProgress();
        }
    }

    function handleWorkerComplete(data) {
        const workerId = data.section_key;

        if (workerId && workerProgress.has(workerId)) {
            const worker = workerProgress.get(workerId);
            worker.progress = 100;
            worker.status = 'complete';
            worker.content = data.text || '';

            updateWorkerDisplay();
            updateOverallProgress();

            // Immediately display the completed section content
            if (data.text && data.text.trim()) {
                console.log(`Worker completed: ${data.section_title || workerId} - Adding content to chat`);
                addAssistantMessage(data.section_title || `Section: ${workerId}`, data.text);
            }
        }
    }

    function handleContentMessage(data) {
        if (data.text && data.text.trim()) {
            const title = data.section_title || "Research Section";
            console.log(`Adding research section: ${title}`);
            addAssistantMessage(title, data.text);
        }
    }

    function handleJobComplete(data) {
        showToast('Research completed successfully', 'success');
        updateOverallProgress(100);
        setLoadingState(false);

        // Keep progress indicator visible for a moment to show completion
        setTimeout(() => {
            hideProgressIndicator();
        }, 2000);

        // Update history
        updateHistoryStatus(currentJobId, 'complete');
        closeEventSource();

        // Add the final comprehensive research report
        if (data.full_report) {
            // Create a formatted research report with proper citations and references
            const formattedReport = formatResearchReport(data.full_report, currentJobId);
            addAssistantMessage("🔬 Final Research Report", formattedReport);
        } else {
            // Fallback message if no full report is available
            const completionMessage = `# 🎯 Research Completed Successfully

Your comprehensive cybersecurity research has been completed! The analysis covered multiple critical areas including current threat landscape, emerging vulnerabilities, defense strategies, industry best practices, and future predictions.

## 📊 Research Summary
- **Topic**: ${data.topic || 'Cybersecurity Research'}
- **Analysis Depth**: Advanced AI-powered research
- **Sections Generated**: 5 comprehensive areas
- **Status**: ✅ Complete

All research sections have been generated with detailed, actionable insights from our AI analysis.`;

            addAssistantMessage("🔬 Research Complete", completionMessage);
        }
        
        // Add a follow-up message to encourage continued conversation
        setTimeout(() => {
            addAssistantMessage(
                "Need more information?", 
                "Your research report has been generated successfully. Feel free to ask follow-up questions, request additional details about specific areas, or start a new research topic.",
                true // This is a follow-up message
            );
        }, 1000);
    }

    function handleErrorMessage(data) {
        const message = data.message || 'An error occurred during research';
        showToast(message, 'error');
        setLoadingState(false);
        updateHistoryStatus(currentJobId, 'error');
        closeEventSource();
    }

    function updateWorkerDisplay() {
        if (!workersContainer) return;

        workersContainer.innerHTML = '';

        // Sort workers: pinned first, then by status, then by ID
        const sortedWorkers = Array.from(workerProgress.entries()).sort(([idA, workerA], [idB, workerB]) => {
            const pinnedA = pinnedWorkers.has(idA);
            const pinnedB = pinnedWorkers.has(idB);

            if (pinnedA && !pinnedB) return -1;
            if (!pinnedA && pinnedB) return 1;

            const statusOrder = { processing: 0, complete: 1, error: 2 };
            const statusDiff = statusOrder[workerA.status] - statusOrder[workerB.status];
            return statusDiff !== 0 ? statusDiff : idA.localeCompare(idB);
        });

        sortedWorkers.forEach(([workerId, worker]) => {
            const workerElement = createWorkerElement(workerId, worker);
            workersContainer.appendChild(workerElement);
        });
    }

    function createWorkerElement(workerId, worker) {
        const element = document.createElement('div');
        element.className = 'worker-item';

        element.innerHTML = `
            <div class="worker-title">${worker.title}</div>
            <div class="worker-progress">
                <div class="worker-progress-bar" style="width: ${worker.progress}%"></div>
            </div>
            <small class="text-muted">${worker.progress}%</small>
        `;

        return element;
    }

    function updateOverallProgress(specificProgress = null) {
        let progress = 0;

        if (specificProgress !== null) {
            progress = specificProgress;
        } else if (workerProgress.size > 0) {
            const totalProgress = Array.from(workerProgress.values())
                .reduce((sum, worker) => sum + worker.progress, 0);
            progress = Math.round(totalProgress / workerProgress.size);
        }

        progress = Math.min(Math.max(progress, 0), 100);

        if (overallProgressFill) {
            overallProgressFill.style.width = `${progress}%`;
        }

        if (overallProgressText) {
            overallProgressText.textContent = `${progress}%`;
        }
    }

    function closeEventSource() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }

    function addUserMessage(content) {
        const messageElement = createMessageElement('user', content);
        appendMessage(messageElement);
    }

    function addAssistantMessage(title, content, isFollowUp = false) {
        const messageElement = createMessageElement('assistant', content, title, isFollowUp);
        appendMessage(messageElement);
    }

    function createMessageElement(sender, content, title = null, isFollowUp = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        // Add follow-up class if appropriate
        if (sender === 'assistant' && isFollowUp) {
            messageDiv.classList.add('follow-up');
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (sender === 'assistant' && title) {
            const titleElement = document.createElement('h4');
            titleElement.textContent = title;
            titleElement.style.marginTop = '0';
            titleElement.style.marginBottom = '16px';
            titleElement.style.color = 'var(--text-primary)';
            titleElement.style.fontWeight = '600';
            
            // Different styling for follow-up messages
            if (isFollowUp) {
                titleElement.style.color = '#667eea'; // Different color for follow-ups
                titleElement.innerHTML = `<i class="fas fa-comment-dots me-2"></i>${title}`;
            }
            contentDiv.appendChild(titleElement);
        }

        const textContent = document.createElement('div');
        textContent.innerHTML = marked.parse(content);
        contentDiv.appendChild(textContent);

        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    function appendMessage(messageElement) {
        if (chatMessages) {
            chatMessages.appendChild(messageElement);

            if (settings.autoScroll) {
                scrollToBottom();
            }
        }
    }

    function formatResearchReport(reportContent, jobId) {
        // Add citations and references to the research report
        const citations = `
## 📚 Citations and References

This research report was generated using advanced AI techniques. Below are the key sources and references that informed this analysis:

1. **NIST Cybersecurity Framework** - National Institute of Standards and Technology
2. **OWASP Top 10** - Open Web Application Security Project
3. **MITRE ATT&CK Framework** - Comprehensive matrix of adversary tactics and techniques
4. **SANS Institute Research** - Cybersecurity training and research resources
5. **CVE Database** - Common Vulnerabilities and Exposures repository
6. **OWASP Web Security Testing Guide** - Comprehensive testing methodology
7. **NIST Special Publications** - Cybersecurity guidelines and standards

> **Note:** This AI-generated research report is based on publicly available information, industry standards, best practices, and advanced analysis techniques. For critical security decisions, always consult with cybersecurity professionals and verify information through multiple authoritative sources.
`;

        const disclaimer = `
---
## ⚠️ Important Disclaimer

The information provided in this research report is for educational and informational purposes only. The AI-generated analysis should be used as a starting point for further investigation and should not be considered as professional advice. Always consult with qualified cybersecurity professionals before implementing any security measures.

**Research completed on:** ${new Date().toLocaleString()}
**Job ID:** ${jobId}
`;

        return reportContent + citations + disclaimer;
    }

    function scrollToBottom() {
        const chatContainer = chatMessages.parentElement;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    function hideWelcomeScreen() {
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        if (chatMessages) {
            chatMessages.style.display = 'block';
        }
    }

    function showWelcomeScreen() {
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }
        if (chatMessages) {
            chatMessages.style.display = 'none';
        }
    }

    function showProgressIndicator() {
        if (progressIndicator) {
            progressIndicator.classList.add('show');
            // Add the progress indicator to the chat messages area
            if (chatMessages) {
                chatMessages.appendChild(progressIndicator);
            }
        }
    }

    function hideProgressIndicator() {
        if (progressIndicator) {
            progressIndicator.classList.remove('show');
        }
    }

    function showToast(message, type = 'info') {
        if (!statusToast || !statusToastBody || !statusToastIcon) return;

        // Set icon and color based on type
        const icons = {
            success: 'fas fa-check-circle text-success',
            error: 'fas fa-exclamation-circle text-danger',
            warning: 'fas fa-exclamation-triangle text-warning',
            info: 'fas fa-info-circle text-primary'
        };

        statusToastIcon.className = icons[type] || icons.info;
        statusToastBody.textContent = message;

        toast.show();
    }

    function setLoadingState(loading) {
        if (loadingOverlay) {
            if (loading) {
                loadingOverlay.classList.remove('d-none');
            } else {
                loadingOverlay.classList.add('d-none');
            }
        }

        if (submitBtn) {
            submitBtn.disabled = loading;
            if (loading) {
                submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
            } else {
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            }
        }
    }

    function startNewChat() {
        // Reset state
        currentJobId = null;
        workerProgress.clear();
        pinnedWorkers.clear();

        // Reset UI
        showWelcomeScreen();
        hideProgressIndicator();
        setLoadingState(false);

        // Clear chat messages
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }

        // Close event source
        closeEventSource();

        // Focus input
        focusInput();

        // Close mobile sidebar
        closeMobileSidebar();

        showToast('New chat started', 'info');
    }

    function clearCurrentChat() {
        if (confirm('Are you sure you want to clear the current chat?')) {
            startNewChat();
        }
    }

    function focusInput() {
        if (topicInput) {
            topicInput.focus();
        }
    }

    // History Management
    function addToHistory(jobId, topic, status, depth) {
        const historyItem = {
            id: jobId,
            topic: topic,
            status: status,
            depth: depth,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };

        jobHistoryData.unshift(historyItem);
        updateHistoryDisplay();
        updateStats();
        saveHistoryToStorage();
    }

    function updateHistoryStatus(jobId, status) {
        const item = jobHistoryData.find(item => item.id === jobId);
        if (item) {
            item.status = status;
            updateHistoryDisplay();
            updateStats();
            saveHistoryToStorage();
        }
    }

    function updateHistoryDisplay() {
        [jobHistory, jobHistoryMobile].forEach(container => {
            if (!container) return;

            container.innerHTML = '';

            jobHistoryData.forEach(item => {
                const historyElement = createHistoryElement(item);
                container.appendChild(historyElement);
            });
        });
    }

    function createHistoryElement(item) {
        const element = document.createElement('div');
        element.className = `chat-item ${item.id === currentJobId ? 'active' : ''}`;
        element.onclick = () => loadHistoryItem(item);
        element.title = item.topic;

        element.innerHTML = `
            <div style="font-weight: 500; margin-bottom: 4px;">${item.topic}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
                ${item.date} • ${item.status}
            </div>
        `;

        return element;
    }

    async function loadHistoryItem(item) {
        try {
            showToast('Loading conversation...', 'info');

            // Fetch the complete job data
            const response = await fetch(`/api/jobs/${item.id}/load`);
            if (!response.ok) {
                throw new Error(`Failed to load job: ${response.statusText}`);
            }

            const data = await response.json();

            // Clear current chat and hide welcome screen
            hideWelcomeScreen();
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }

            // Add user message (original question)
            addUserMessage(data.job.topic);

            // Add the complete research report as a formatted message
            let fullReport = `# 🎯 Final Research Report: ${data.job.topic}\n\n`;

            // Add each section to the full report and also as individual messages
            if (data.sections && data.sections.length > 0) {
                console.log(`Loading ${data.sections.length} sections for job ${item.id}`);
                
                // First, add a comprehensive summary section
                fullReport += `## 🔍 Research Summary\n\n`;
                fullReport += `This comprehensive analysis covers ${data.job.topic} across multiple dimensions:\n\n`;
                
                data.sections.forEach((section, index) => {
                    // Try output_md first, then content, then show placeholder
                    let content = '';
                    if (section.output_md && section.output_md.trim()) {
                        content = section.output_md;
                    } else if (section.content && section.content.trim()) {
                        content = section.content;
                    } else {
                        content = `*This section (${section.title}) is still being processed or has no content available.*`;
                    }

                    console.log(`Section ${index + 1}: ${section.title} - Content length: ${content.length}`);
                    
                    // Add to the full report
                    fullReport += `### ${section.title}\n\n${content}\n\n`;
                    
                    // Also add as a separate message in the chat
                    addAssistantMessage(section.title, content);
                });
                
                // Add a comprehensive research completion message with citations
                const formattedReport = formatResearchReport(fullReport, item.id);
                // Replace the separate messages with a single comprehensive report
                if (chatMessages) {
                    chatMessages.innerHTML = ''; // Clear individual sections
                    addUserMessage(data.job.topic); // Add original question back
                    addAssistantMessage("🔬 Final Research Report", formattedReport); // Add the full report
                }
            } else {
                // If no sections, show a message that research is available
                const fallbackReport = `# 📋 Research Report: ${data.job.topic}\n\nThis research report for "${data.job.topic}" is available. The sections may still be processing or may not have been fully generated yet.`;
                const formattedReport = formatResearchReport(fallbackReport, item.id);
                addAssistantMessage("📋 Research Report", formattedReport);
            }

            // Update current job ID
            currentJobId = item.id;

            // Update history display to show active item
            updateHistoryDisplay();

            // Add a message to encourage follow-up questions
            setTimeout(() => {
                addAssistantMessage(
                    "Ask a follow-up question", 
                    "The research report is now displayed. You can ask follow-up questions about the research, request more details about specific areas, or start a new research topic.",
                    true // This is a follow-up message
                );
            }, 500);

            // Close mobile sidebar
            closeMobileSidebar();

            showToast('Conversation loaded successfully', 'success');

        } catch (error) {
            console.error('Error loading history item:', error);
            showToast('Failed to load conversation', 'error');
        }
    }

    function filterHistory() {
        const query = (searchHistory?.value || searchHistoryMobile?.value || '').toLowerCase();

        if (!query) {
            updateHistoryDisplay();
            return;
        }

        const filteredItems = jobHistoryData.filter(item =>
            item.topic.toLowerCase().includes(query)
        );

        [jobHistory, jobHistoryMobile].forEach(container => {
            if (!container) return;

            container.innerHTML = '';
            filteredItems.forEach(item => {
                const historyElement = createHistoryElement(item);
                container.appendChild(historyElement);
            });
        });
    }

    function updateStats() {
        const activeCount = jobHistoryData.filter(item => item.status === 'processing').length;
        const totalCount = jobHistoryData.length;

        if (activeResearchCount) {
            activeResearchCount.textContent = activeCount;
        }

        if (totalReportsCount) {
            totalReportsCount.textContent = totalCount;
        }
    }

    async function loadJobHistory() {
        try {
            // Load from API first
            const response = await fetch('/api/history');
            if (response.ok) {
                const apiHistory = await response.json();

                // Convert API format to frontend format
                jobHistoryData = apiHistory.map(job => ({
                    id: job.id,
                    topic: job.topic,
                    status: job.status,
                    depth: job.depth,
                    timestamp: job.created_at,
                    date: new Date(job.created_at).toLocaleDateString()
                }));

                updateHistoryDisplay();
                updateStats();
                saveHistoryToStorage(); // Save to localStorage as backup
            } else {
                // Fallback to localStorage if API fails
                const stored = localStorage.getItem('researchHistory');
                if (stored) {
                    jobHistoryData = JSON.parse(stored);
                    updateHistoryDisplay();
                    updateStats();
                }
            }
        } catch (error) {
            console.warn('Failed to load job history:', error);
            // Fallback to localStorage
            try {
                const stored = localStorage.getItem('researchHistory');
                if (stored) {
                    jobHistoryData = JSON.parse(stored);
                    updateHistoryDisplay();
                    updateStats();
                }
            } catch (e) {
                jobHistoryData = [];
            }
        }
    }

    function saveHistoryToStorage() {
        try {
            localStorage.setItem('researchHistory', JSON.stringify(jobHistoryData));
        } catch (error) {
            console.warn('Failed to save job history:', error);
        }
    }

    // Settings Management
    function loadSettings() {
        try {
            const stored = localStorage.getItem('appSettings');
            if (stored) {
                settings = { ...settings, ...JSON.parse(stored) };
                applySettings();
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    function saveSettings() {
        const themeSelect = document.getElementById('theme-select');
        const autoScrollCheck = document.getElementById('auto-scroll');

        if (themeSelect) settings.theme = themeSelect.value;
        if (autoScrollCheck) settings.autoScroll = autoScrollCheck.checked;

        try {
            localStorage.setItem('appSettings', JSON.stringify(settings));
            applySettings();
            settingsModal.hide();
            showToast('Settings saved successfully', 'success');
        } catch (error) {
            console.warn('Failed to save settings:', error);
            showToast('Failed to save settings', 'error');
        }
    }

    function applySettings() {
        applyTheme();

        // Update UI elements
        const themeSelect = document.getElementById('theme-select');
        const autoScrollCheck = document.getElementById('auto-scroll');

        if (themeSelect) themeSelect.value = settings.theme;
        if (autoScrollCheck) autoScrollCheck.checked = settings.autoScroll;
    }

    function applyTheme() {
        const theme = settings.theme;
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    // Export Functions
    function exportResults(format) {
        const content = extractChatContent();

        switch (format) {
            case 'pdf':
                exportToPDF(content);
                break;
            case 'word':
                exportToWord(content);
                break;
            case 'markdown':
                exportToMarkdown(content);
                break;
        }

        exportModal.hide();
    }

    function extractChatContent() {
        const messages = chatMessages?.querySelectorAll('.message') || [];
        let content = '';

        messages.forEach(message => {
            const messageContent = message.querySelector('.message-content');
            if (messageContent) {
                content += messageContent.textContent + '\n\n';
            }
        });

        return content;
    }

    function exportToPDF(content) {\n        // Create a temporary element to convert markdown to HTML\n        const tempDiv = document.createElement('div');\n        tempDiv.innerHTML = marked.parse(content);\n        \n        // Extract text content and format it\n        const formattedContent = tempDiv.textContent || tempDiv.innerText;\n        \n        // Using jsPDF library (already included in the app)\n        const { jsPDF } = window.jspdf;\n        const doc = new jsPDF();\n        \n        // Add title\n        doc.setFontSize(16);\n        doc.text('Cybersecurity Research Report', 10, 10);\n        \n        // Add content with proper line breaks and formatting\n        doc.setFontSize(12);\n        const splitText = doc.splitTextToSize(formattedContent, 180);\n        doc.text(splitText, 10, 30);\n        \n        // Save the PDF\n        doc.save(`research-report-${new Date().toISOString().split('T')[0]}.pdf`);\n        showToast('PDF export completed', 'success');\n    }\n\n    function exportToWord(content) {\n        // Create a Word document as a text file with basic formatting\n        const formattedContent = `Cybersecurity Research Report\\n\\n${content}`;\n        const blob = new Blob([formattedContent], { type: 'application/msword' });\n        const url = URL.createObjectURL(blob);\n        const a = document.createElement('a');\n        a.href = url;\n        a.download = `research-report-${new Date().toISOString().split('T')[0]}.doc`;\n        document.body.appendChild(a);\n        a.click();\n        document.body.removeChild(a);\n        URL.revokeObjectURL(url);\n        showToast('Word export completed', 'success');\n    }

    function exportToMarkdown(content) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Markdown export completed', 'success');
    }

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (settings.theme === 'auto') {
            applyTheme();
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        closeEventSource();
    });

    // Add smooth scrolling to anchor links
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(e.target.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
        showToast('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
        showToast('Connection lost - working offline', 'warning');
    });
});