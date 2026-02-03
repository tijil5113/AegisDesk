// AI Chat App with OpenAI Integration and Function Calling
class AIChatApp {
    constructor() {
        this.windowId = 'ai-chat';
        this.chatHistory = storage.get('aiChatHistory', []);
        this.chats = storage.get('aiChats', []); // Multiple chat sessions
        this.currentChatId = storage.get('currentChatId', null);
        this.isTyping = false;
        // Try to use API key from storage first, otherwise use server endpoint
        this.apiKey = storage.get('openai_api_key', '') || storage.get('openaiApiKey', '');
        // Use full origin for /api/chat so it works when served from the same server (avoids file:// issues)
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin && String(window.location.origin).startsWith('http')) ? window.location.origin : '';
        this.apiUrl = origin ? `${origin}/api/chat` : '/api/chat';
        this.useDirectAPI = !!this.apiKey;
        
        // Initialize with default chat if none exists
        if (this.chats.length === 0) {
            this.createNewChat();
        }
    }
    
    createNewChat() {
        const chatId = 'chat_' + Date.now();
        const chat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString()
        };
        this.chats.push(chat);
        this.currentChatId = chatId;
        this.saveChats();
        return chatId;
    }
    
    getCurrentChat() {
        if (!this.currentChatId) {
            this.currentChatId = this.chats[0]?.id || this.createNewChat();
        }
        return this.chats.find(c => c.id === this.currentChatId) || this.chats[0];
    }
    
    saveChats() {
        storage.set('aiChats', this.chats);
        storage.set('currentChatId', this.currentChatId);
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'AI Assistant',
            width: 600,
            height: 700,
            class: 'app-ai-chat',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        this.loadHistory(window);
    }

    render() {
        const currentChat = this.getCurrentChat();
        const hasHistory = currentChat && currentChat.messages.length > 0;
        return `
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <button class="chat-new-btn" id="chat-new-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Chat
                        </button>
                    </div>
                    <div class="chat-list" id="chat-list">
                        ${this.chats.map(chat => `
                            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                                <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
                                <div class="chat-item-actions">
                                    <button class="chat-item-rename" data-chat-id="${chat.id}" title="Rename">✏️</button>
                                    <button class="chat-item-delete" data-chat-id="${chat.id}" title="Delete">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="chat-main">
                    <div class="chat-messages" id="chat-messages">
                        ${hasHistory ? currentChat.messages.map(msg => this.renderMessage(msg)).join('') : ''}
                    </div>
                    ${!hasHistory ? this.renderWelcomeScreen() : ''}
                    <div class="chat-input-container">
                        <textarea class="chat-input" id="chat-input" placeholder="Message AegisDesk AI..." rows="1"></textarea>
                        <button class="chat-send" id="chat-send">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polyline points="22 2 15 22 11 13 2 9 22 2"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderWelcomeScreen() {
        return `
            <div class="chat-welcome-screen" id="chat-welcome-screen">
                <div class="welcome-content">
                    <div class="welcome-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <h1 class="welcome-title">Hi, this is your Aegis Desk</h1>
                    <p class="welcome-subtitle">What can I do for you?</p>
                    
                    <div class="welcome-suggestions">
                        <div class="suggestion-card" data-suggestion="Open the tasks app">
                            <div class="suggestion-icon">✅</div>
                            <div class="suggestion-text">
                                <div class="suggestion-title">Open Apps</div>
                                <div class="suggestion-desc">Launch any application</div>
                            </div>
                        </div>
                        <div class="suggestion-card" data-suggestion="Create a task to buy groceries">
                            <div class="suggestion-icon">📝</div>
                            <div class="suggestion-text">
                                <div class="suggestion-title">Create Tasks</div>
                                <div class="suggestion-desc">Manage your to-do list</div>
                            </div>
                        </div>
                        <div class="suggestion-card" data-suggestion="What can you help me with?">
                            <div class="suggestion-icon">💡</div>
                            <div class="suggestion-text">
                                <div class="suggestion-title">Get Answers</div>
                                <div class="suggestion-desc">Ask me anything</div>
                            </div>
                        </div>
                        <div class="suggestion-card" data-suggestion="Show me the weather">
                            <div class="suggestion-icon">🌤️</div>
                            <div class="suggestion-text">
                                <div class="suggestion-title">Check Weather</div>
                                <div class="suggestion-desc">View weather forecasts</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderWelcome() {
        // Legacy function kept for compatibility - not used anymore
        return '';
    }

    renderMessage(message) {
        return `
            <div class="chat-message ${message.role}">
                <div class="chat-avatar">
                    ${message.role === 'user' 
                        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>'
                    }
                </div>
                <div class="chat-content">
                    ${this.formatMessage(message.content)}
                </div>
            </div>
        `;
    }

    formatMessage(text) {
        // Simple markdown-like formatting
        return this.escapeHtml(text)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code style="background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #19c37d; text-decoration: underline;">$1</a>');
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        const messagesContainer = content.querySelector('#chat-messages');
        const input = content.querySelector('#chat-input');
        const sendBtn = content.querySelector('#chat-send');
        const newChatBtn = content.querySelector('#chat-new-btn');
        const chatList = content.querySelector('#chat-list');
        
        // New chat button
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.createNewChat();
                this.refresh(window);
            });
        }
        
        // Chat list interactions
        if (chatList) {
            chatList.addEventListener('click', (e) => {
                const chatItem = e.target.closest('.chat-item');
                const renameBtn = e.target.closest('.chat-item-rename');
                const deleteBtn = e.target.closest('.chat-item-delete');
                
                if (renameBtn) {
                    e.stopPropagation();
                    const chatId = renameBtn.dataset.chatId;
                    this.renameChat(chatId, window);
                } else if (deleteBtn) {
                    e.stopPropagation();
                    const chatId = deleteBtn.dataset.chatId;
                    this.deleteChat(chatId, window);
                } else if (chatItem) {
                    const chatId = chatItem.dataset.chatId;
                    this.switchChat(chatId, window);
                }
            });
        }

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        // Send message
        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text || this.isTyping) return;

            // Hide welcome screen if visible
            const welcomeScreen = content.querySelector('#chat-welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.style.opacity = '0';
                welcomeScreen.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    welcomeScreen.style.display = 'none';
                }, 300);
            }

            // Get current chat
            const currentChat = this.getCurrentChat();
            if (!currentChat) {
                this.createNewChat();
                return;
            }
            
            // Add user message
            const userMessage = { role: 'user', content: text, timestamp: Date.now() };
            currentChat.messages.push(userMessage);
            this.addMessage(userMessage, messagesContainer);
            input.value = '';
            input.style.height = 'auto';
            
            // Update chat title if it's the first message
            if (currentChat.messages.length === 1 && currentChat.title === 'New Chat') {
                currentChat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                this.saveChats();
                this.refresh(window);
            }
            
            // Show typing indicator
            this.showTyping(messagesContainer);
            sendBtn.disabled = true;

            // Check for function calls first
            const functionCall = this.detectFunctionCall(text);
            
            // Get AI response
            try {
                let aiResponse;
                if (functionCall) {
                    // Handle function call immediately
                    await this.handleFunctionCall(functionCall, messagesContainer);
                    // Get a response after executing the function
                    try {
                        aiResponse = await this.getAIResponse(text);
                    } catch (err) {
                        // If API fails after function call, provide a default response
                        if (functionCall.name === 'open_app') {
                            aiResponse = `I've opened the ${functionCall.appId} app for you!`;
                        } else if (functionCall.name === 'create_task') {
                            aiResponse = `I've created a task: "${functionCall.taskText}". Check your Tasks app!`;
                        } else {
                            aiResponse = 'Done!';
                        }
                    }
                } else {
                    // Normal response
                    aiResponse = await this.getAIResponse(text);
                }
                
                this.hideTyping(messagesContainer);
                
                // Add AI message
                const aiMessage = { 
                    role: 'assistant', 
                    content: aiResponse, 
                    timestamp: Date.now() 
                };
                currentChat.messages.push(aiMessage);
                this.addMessage(aiMessage, messagesContainer);
                this.saveChats();
            } catch (error) {
                this.hideTyping(messagesContainer);
                console.error('AI Error:', error);
                
                let errorContent = `Sorry, I encountered an error: ${error.message}`;
                
                // Failed to fetch = network / no server / CORS – guide user to set API key or run server
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network error')) {
                    errorContent = `⚠️ **Couldn't reach the AI**\n\n` +
                        `• **Option 1 (recommended):** Add your OpenAI API key in **Settings** so the app can talk to OpenAI directly.\n` +
                        `  Open **Settings** from the desktop, find **OpenAI API Key**, paste your key, and try again.\n\n` +
                        `• **Option 2:** If you run the app with \`npm start\`, create a \`.env\` file with:\n` +
                        `  \`OPENAI_API_KEY=sk-your-key\` and restart the server.`;
                } else if (error.message.includes('Server configuration') || error.message.includes('OPENAI_API_KEY')) {
                    errorContent = `⚠️ **Server Configuration Required**\n\nThis AI Assistant requires server-side configuration.\n\nThe administrator needs to:\n1. Set the OPENAI_API_KEY environment variable on the server\n2. Deploy the /api/chat.js serverless function\n\nIf you're the administrator, check your deployment platform's environment variables settings.`;
                }
                
                const errorMessage = { 
                    role: 'assistant', 
                    content: errorContent, 
                    timestamp: Date.now() 
                };
                const currentChat = this.getCurrentChat();
                if (currentChat) {
                    currentChat.messages.push(errorMessage);
                    this.addMessage(errorMessage, messagesContainer);
                    if (errorContent.includes("Couldn't reach the AI")) {
                        const lastAssistant = messagesContainer.querySelector('.chat-message.assistant:last-child .chat-content');
                        if (lastAssistant && typeof desktop !== 'undefined' && desktop.openApp) {
                            const btn = document.createElement('button');
                            btn.className = 'chat-settings-btn';
                            btn.textContent = 'Open Settings';
                            btn.style.cssText = 'margin-top: 10px; padding: 8px 14px; background: var(--primary, #6366f1); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;';
                            btn.addEventListener('click', () => desktop.openApp('settings'));
                            lastAssistant.appendChild(btn);
                        }
                    }
                    this.saveChats();
                }
            }

            sendBtn.disabled = false;
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Suggestion card clicks
        const suggestionCards = content.querySelectorAll('.suggestion-card');
        suggestionCards.forEach(card => {
            card.addEventListener('click', () => {
                const suggestion = card.dataset.suggestion;
                input.value = suggestion;
                
                // Hide welcome screen
                const welcomeScreen = content.querySelector('#chat-welcome-screen');
                if (welcomeScreen) {
                    welcomeScreen.style.opacity = '0';
                    welcomeScreen.style.transform = 'translateY(-20px)';
                    setTimeout(() => {
                        welcomeScreen.style.display = 'none';
                    }, 300);
                }
                
                // Send the message
                setTimeout(() => {
                    sendMessage();
                }, 100);
            });
        });
    }

    async getAIResponse(userMessage) {
        // Always re-read API key from storage (user may have just set it in Settings)
        this.apiKey = storage.get('openai_api_key', '') || storage.get('openaiApiKey', '');
        this.useDirectAPI = !!this.apiKey;
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin && String(window.location.origin).startsWith('http')) ? window.location.origin : '';
        this.apiUrl = origin ? `${origin}/api/chat` : '/api/chat';

        // Use system-level AI if available
        if (typeof aiSystem !== 'undefined' && aiSystem.apiKey) {
            try {
                // Detect system actions first
                const systemAction = aiSystem.detectSystemAction(userMessage);
                if (systemAction) {
                    const actionResult = await aiSystem.executeAction(systemAction);
                    if (actionResult) {
                        // Get AI response with context
                        return await aiSystem.getAIResponse(userMessage, true);
                    }
                }
                // Get AI response with full system context
                return await aiSystem.getAIResponse(userMessage, true);
            } catch (error) {
                console.error('AI System error, falling back to basic AI:', error);
            }
        }
        
        // Fallback to basic AI response
        // Build messages array
        const messages = [
            {
                role: 'system',
                content: `You are AegisDesk AI, the intelligent operating system assistant. You are embedded into the OS itself.

SYSTEM CONTEXT:
- You can access Tasks, Notes, Weather, and other apps
- You can create and modify tasks with priorities, categories, and due dates
- You can create and manage notes with markdown support
- You understand the user's workflow and context

When a user asks you to do something, acknowledge it and the system will handle the action automatically. Be proactive, helpful, and context-aware.`
            },
            ...(this.getCurrentChat()?.messages || []).slice(-20).filter(msg => msg.role && msg.content).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        try {
            let response;
            
            // Use direct API if API key is available
            if (this.useDirectAPI && this.apiKey) {
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: messages,
                        max_tokens: 2000,
                        temperature: 0.8,
                        top_p: 0.9,
                        frequency_penalty: 0.3,
                        presence_penalty: 0.3
                    })
                });
            } else {
                // Use serverless API endpoint
                response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ messages })
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = errorData.error?.message || errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                
                // Try fallback to gpt-3.5-turbo if using direct API
                if (this.useDirectAPI && this.apiKey && (errorData.error?.code === 'model_not_found' || errorMessage.includes('model'))) {
                    const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'gpt-3.5-turbo',
                            messages: messages,
                            max_tokens: 2000,
                            temperature: 0.8
                        })
                    });
                    
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        return fallbackData.choices[0].message.content;
                    }
                }
                
                // Handle server configuration errors
                if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('Missing') || errorMessage.includes('Server configuration')) {
                    throw new Error('API key required. Please set your OpenAI API key in Settings or use the standalone AI chat page.');
                }
                
                // Handle authentication errors
                if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                    throw new Error('Invalid API key. Please check your OpenAI API key in Settings.');
                }
                
                // Handle OpenAI API errors
                if (errorData.details && errorData.details.message) {
                    errorMessage = errorData.details.message;
                }
                
                throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
            }

            const data = await response.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response from API');
            }
            
            return data.choices[0].message.content || 'I apologize, but I could not generate a response.';
        } catch (error) {
            console.error('AI API error:', error);
            // Re-throw with a more user-friendly message
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                throw new Error('Authentication failed. Please check server configuration.');
            } else if (error.message.includes('429') || error.message.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again in a moment.');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    detectFunctionCall(userMessage) {
        const lowerMessage = userMessage.toLowerCase().trim();
        
        // Detect "open app" commands
        const openPatterns = {
            'tasks': ['open task', 'open tasks', 'show task', 'show tasks', 'launch task', 'tasks app'],
            'notes': ['open note', 'open notes', 'show note', 'show notes', 'launch note', 'notes app'],
            'weather': ['open weather', 'show weather', 'weather app', 'launch weather'],
            'browser': ['open browser', 'open web', 'show browser', 'launch browser'],
            'bookmarks': ['open bookmark', 'open bookmarks', 'show bookmark', 'show bookmarks'],
            'google': ['open google', 'go to google', 'show google', 'launch google'],
            'youtube': ['open youtube', 'go to youtube', 'show youtube', 'launch youtube', 'watch youtube'],
            'settings': ['open setting', 'open settings', 'show setting', 'show settings', 'launch setting'],
            'ai-chat': ['open ai', 'open assistant', 'open chat', 'show ai', 'show assistant']
        };

        for (const [appId, patterns] of Object.entries(openPatterns)) {
            for (const pattern of patterns) {
                if (lowerMessage === pattern || 
                    lowerMessage.startsWith(pattern + ' ') || 
                    lowerMessage.includes(' ' + pattern + ' ') ||
                    lowerMessage.endsWith(' ' + pattern)) {
                    return { name: 'open_app', appId: appId };
                }
            }
        }

        // Use AI system for task/note detection if available
        if (typeof aiSystem !== 'undefined') {
            const systemAction = aiSystem.detectSystemAction(userMessage);
            if (systemAction && (systemAction.type === 'create_task' || systemAction.type === 'create_note')) {
                return systemAction;
            }
        }

        // Fallback task detection
        const taskPatterns = [
            'create task', 'add task', 'new task', 'make a task', 'add a task',
            'create a task', 'task to', 'remind me to', 'i need to', 'i should', 'i must', 'i have to'
        ];

        for (const pattern of taskPatterns) {
            if (lowerMessage.includes(pattern)) {
                let taskText = userMessage.replace(new RegExp(pattern, 'gi'), '').trim();
                taskText = taskText.replace(/^(to|that|about|for)\s+/i, '').trim();
                taskText = taskText.replace(/^["']|["']$/g, '').trim();
                
                if (taskText && taskText.length > 0) {
                    return { name: 'create_task', text: taskText };
                }
            }
        }

        return null;
    }

    async handleFunctionCall(functionCall, messagesContainer) {
        if (functionCall.name === 'open_app') {
            setTimeout(() => {
                desktop.openApp(functionCall.appId);
                const appNames = {
                    'tasks': 'Tasks',
                    'notes': 'Notes',
                    'weather': 'Weather',
                    'browser': 'Browser',
                    'bookmarks': 'Bookmarks',
                    'google': 'Google',
                    'youtube': 'YouTube',
                    'settings': 'Settings',
                    'ai-chat': 'AI Assistant'
                };
                
                if (typeof bookmarksApp !== 'undefined') {
                    const bookmark = bookmarksApp.findBookmark(functionCall.appId);
                    if (bookmark) {
                        browserApp.open(bookmark.url, bookmark.name);
                        this.addSystemMessage(messagesContainer, `✓ Opening ${bookmark.name}...`);
                        return;
                    }
                }
                const appName = appNames[functionCall.appId] || functionCall.appId;
                this.addSystemMessage(messagesContainer, `✓ Opening ${appName}...`);
            }, 100);
        } else if (functionCall.name === 'create_task' || functionCall.type === 'create_task') {
            // Use AI system if available for better task creation
            if (typeof aiSystem !== 'undefined') {
                try {
                    const taskInfo = functionCall.text ? functionCall : aiSystem.extractTaskInfo(functionCall.text || functionCall.taskText || '');
                    const result = await aiSystem.executeAction(taskInfo);
                    this.addSystemMessage(messagesContainer, `✓ ${result}`);
                    
                    // Refresh tasks app
                    setTimeout(() => {
                        if (windowManager.windows.has('tasks')) {
                            const tasksWindow = windowManager.windows.get('tasks');
                            if (tasksWindow) {
                                const content = tasksWindow.querySelector('.window-content');
                                tasksApp.refresh(content);
                            }
                        }
                    }, 100);
                } catch (error) {
                    console.error('Error creating task:', error);
                    // Fallback to basic task creation
                    this.createBasicTask(functionCall.text || functionCall.taskText, messagesContainer);
                }
            } else {
                this.createBasicTask(functionCall.text || functionCall.taskText, messagesContainer);
            }
        } else if (functionCall.type === 'create_note') {
            if (typeof aiSystem !== 'undefined') {
                try {
                    const result = await aiSystem.executeAction(functionCall);
                    this.addSystemMessage(messagesContainer, `✓ ${result}`);
                } catch (error) {
                    console.error('Error creating note:', error);
                }
            }
        }
    }

    createBasicTask(taskText, messagesContainer) {
        try {
            const tasks = storage.get('tasks', []);
            tasks.push({
                id: 'task_' + Date.now(),
                text: taskText,
                completed: false,
                priority: 'normal',
                category: 'general',
                createdAt: Date.now()
            });
            storage.set('tasks', tasks);
            
            setTimeout(() => {
                if (!windowManager.windows.has('tasks')) {
                    tasksApp.open();
                } else {
                    const tasksWindow = windowManager.windows.get('tasks');
                    if (tasksWindow) {
                        const content = tasksWindow.querySelector('.window-content');
                        tasksApp.refresh(content);
                    }
                }
            }, 100);
            
            this.addSystemMessage(messagesContainer, `✓ Task created: "${taskText}"`);
        } catch (error) {
            console.error('Error creating task:', error);
        }
    }

    addSystemMessage(container, text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.style.opacity = '0.7';
        messageEl.innerHTML = `
            <div class="chat-avatar" style="background: rgba(34, 197, 94, 0.2);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="chat-content" style="background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3);">
                ${this.escapeHtml(text)}
            </div>
        `;
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    addMessage(message, container) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.role}`;
        messageEl.innerHTML = `
            <div class="chat-avatar">
                ${message.role === 'user' 
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>'
                }
            </div>
            <div class="chat-content">
                ${this.formatMessage(message.content)}
            </div>
        `;
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    showTyping(container) {
        this.isTyping = true;
        const typingEl = document.createElement('div');
        typingEl.className = 'chat-message';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = `
            <div class="chat-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <div class="chat-content">
                <div class="chat-typing">
                    <div class="chat-typing-dot"></div>
                    <div class="chat-typing-dot"></div>
                    <div class="chat-typing-dot"></div>
                </div>
            </div>
        `;
        container.appendChild(typingEl);
        container.scrollTop = container.scrollHeight;
    }

    hideTyping(container) {
        this.isTyping = false;
        const typingEl = container.querySelector('#typing-indicator');
        if (typingEl) typingEl.remove();
    }

    loadHistory(window) {
        const messagesContainer = window.querySelector('#chat-messages');
        const welcomeScreen = window.querySelector('#chat-welcome-screen');
        
        // Load current chat messages
        const currentChat = this.getCurrentChat();
        if (currentChat && currentChat.messages.length > 0) {
            // Hide welcome screen if there's history
            if (welcomeScreen) {
                welcomeScreen.style.display = 'none';
            }
            messagesContainer.innerHTML = currentChat.messages.map(msg => this.renderMessage(msg)).join('');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            // Ensure welcome screen is visible if no history
            if (welcomeScreen) {
                welcomeScreen.style.display = 'flex';
                welcomeScreen.style.opacity = '1';
            }
        }
    }

    saveHistory() {
        // Legacy method - now uses saveChats
        this.saveChats();
    }
    
    switchChat(chatId, window) {
        this.currentChatId = chatId;
        this.saveChats();
        this.refresh(window);
    }
    
    renameChat(chatId, window) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        
        const newTitle = prompt('Enter new chat title:', chat.title);
        if (!newTitle || !newTitle.trim() || newTitle === chat.title) return;
        
        chat.title = newTitle.trim();
        this.saveChats();
        this.refresh(window);
    }
    
    deleteChat(chatId, window) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        
        if (confirm(`Are you sure you want to delete "${chat.title}"?`)) {
            this.chats = this.chats.filter(c => c.id !== chatId);
            
            // Switch to another chat if current was deleted
            if (this.currentChatId === chatId) {
                this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
                if (!this.currentChatId) {
                    this.createNewChat();
                }
            }
            
            this.saveChats();
            this.refresh(window);
        }
    }
    
    refresh(window) {
        const content = window.querySelector('.window-content');
        content.innerHTML = this.render();
        this.attachEvents(window);
        this.loadHistory(window);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const aiChatApp = new AIChatApp();
